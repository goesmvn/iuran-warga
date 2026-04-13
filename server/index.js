import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// =====================================================================
// STATIC FRONTEND — Served BEFORE any security middleware
// so that JS/CSS/HTML assets are never blocked by CORS or CSP.
// =====================================================================
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath, {
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// =====================================================================
// [SEC-01] ENSURE JWT_SECRET IS SET IN PRODUCTION
// =====================================================================
if (!JWT_SECRET) {
  console.warn('[SECURITY WARNING] JWT_SECRET is not set via environment variable. Using a weak fallback. SET THIS IN PRODUCTION!');
}
const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'fallback_secret_for_local_dev_only_CHANGE_ME';

// =====================================================================
// [SEC-02] CORS — Allow all origins (safe: same-origin deployment)
// Express serves both frontend and API from the same domain/port.
// =====================================================================
app.use(cors());

// =====================================================================
// [SEC-03] HELMET — Security headers (CSP disabled, handled by Caddy)
// =====================================================================
app.use(helmet({
  contentSecurityPolicy: false, // Caddy reverse proxy handles CSP
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

app.use(express.json({ limit: '1mb' })); // [SEC-04] Body size limit (prevent DoS via large payloads)

// =====================================================================
// RATE LIMITERS
// =====================================================================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // tightened from 1000
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan, coba lagi nanti.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan login, coba lagi dalam 15 menit.' }
});

app.use('/api', apiLimiter);

// =====================================================================
// HELPERS
// =====================================================================
// [SEC-05] Input sanitization helper - strip control chars & trim
const sanitize = (val) => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  return String(val).replace(/[\x00-\x1F\x7F]/g, '').trim().substring(0, 500);
};

const sanitizeNum = (val) => {
  const n = Number(val);
  return isNaN(n) || n < 0 ? 0 : Math.floor(n);
};

// =====================================================================
// AUTH
// =====================================================================
app.post('/api/login', loginLimiter, (req, res) => {
  const username = sanitize(req.body?.username);
  const password = req.body?.password;

  if (!username || !password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username dan password wajib diisi.' });
  }
  if (password.length > 200) {
    return res.status(400).json({ error: 'Input tidak valid.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  // [SEC] Timing-safe: always run compareSync even if user not found
  const passwordMatch = user ? bcrypt.compareSync(password, user.password_hash) : bcrypt.compareSync(password, '$2a$10$invalidhashforsafetiming000000000000000000000000000000');

  if (!user || !passwordMatch) {
    return res.status(401).json({ error: 'Username atau password salah!' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    EFFECTIVE_JWT_SECRET,
    { expiresIn: '12h' }
  );
  res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
});

// JWT Middleware
app.use('/api', (req, res, next) => {
  if (req.path === '/login' || req.path === '/ping') return next();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Akses Ditolak. Token authentikasi hilang.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Akses Ditolak. Sesi telah kadaluarsa.' });
  }
});

// Admin Authorization Middleware
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ error: 'Akses ditolak. Hanya Admin yang diizinkan.' });
  }
  next();
};

// =====================================================================
// USERS (Pengelola)
// =====================================================================
app.get('/api/users', requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, name, role FROM users').all();
  res.json(users);
});

app.post('/api/users', requireAdmin, (req, res) => {
  const username = sanitize(req.body?.username);
  const password = req.body?.password;
  const name = sanitize(req.body?.name);
  const role = req.body?.role;

  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Data pengguna tidak lengkap.' });
  }
  if (!['Admin', 'Staff'].includes(role)) {
    return res.status(400).json({ error: 'Role tidak valid.' });
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 200) {
    return res.status(400).json({ error: 'Password minimal 6 karakter.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const id = `usr-${Date.now()}`;
  try {
    db.prepare('INSERT INTO users (id, username, password_hash, name, role) VALUES (?, ?, ?, ?, ?)').run(id, username, hash, name, role);
    res.json({ success: true, user: { id, username, name, role } });
  } catch (e) {
    res.status(400).json({ error: 'Username sudah digunakan.' });
  }
});

app.delete('/api/users/:id', requireAdmin, (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Tidak bisa menghapus akun Anda sendiri.' });
  }
  db.prepare('DELETE FROM users WHERE id = ? AND username != "admin"').run(req.params.id);
  res.json({ success: true });
});

// =====================================================================
// SETTINGS - [SEC-06] Admin Only
// =====================================================================
const ALLOWED_SETTING_KEYS = ['start_year', 'nama_ketua', 'nama_bendahara'];

app.get('/api/settings', (req, res) => {
  const settingsArray = db.prepare('SELECT * FROM settings').all();
  const settingsObj = settingsArray.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
  res.json(settingsObj);
});

app.put('/api/settings/:key', requireAdmin, (req, res) => {
  const key = req.params.key;
  // Whitelist: only known keys can be set
  if (!ALLOWED_SETTING_KEYS.includes(key)) {
    return res.status(400).json({ error: 'Konfigurasi tidak valid.' });
  }
  const value = sanitize(req.body?.value);
  if (value === null) return res.status(400).json({ error: 'Nilai tidak boleh kosong.' });

  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
  res.json({ success: true });
});

// =====================================================================
// WARGA
// =====================================================================
app.get('/api/warga', (req, res) => {
  const warga = db.prepare('SELECT * FROM warga').all();
  res.json(warga.map(w => ({
    id: w.id,
    namaKepalaKeluarga: w.namaKepalaKeluarga,
    nomorRumah: w.nomorRumah,
    status: w.status,
    noHp: w.phone || '',
    tanggalMasuk: w.createdAt
  })));
});

app.post('/api/warga', (req, res) => {
  const nama = sanitize(req.body?.namaKepalaKeluarga);
  const nomorRumah = sanitize(req.body?.nomorRumah);
  const status = req.body?.status;
  const noHp = sanitize(req.body?.noHp);
  const tanggalMasuk = req.body?.tanggalMasuk;
  const id = sanitize(req.body?.id) || `warga-${Date.now()}`;

  if (!nama || !nomorRumah) return res.status(400).json({ error: 'Nama dan nomor rumah wajib diisi.' });
  if (!['Aktif', 'Pindah'].includes(status)) return res.status(400).json({ error: 'Status tidak valid.' });

  db.prepare('INSERT INTO warga (id, namaKepalaKeluarga, nomorRumah, status, phone, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run(id, nama, nomorRumah, status, noHp, tanggalMasuk || new Date().toISOString());
  res.json({ success: true, id });
});

app.put('/api/warga/:id', (req, res) => {
  const nama = sanitize(req.body?.namaKepalaKeluarga);
  const nomorRumah = sanitize(req.body?.nomorRumah);
  const status = req.body?.status;
  const noHp = sanitize(req.body?.noHp);
  const tanggalMasuk = req.body?.tanggalMasuk;

  if (!nama || !nomorRumah) return res.status(400).json({ error: 'Data tidak lengkap.' });
  if (!['Aktif', 'Pindah'].includes(status)) return res.status(400).json({ error: 'Status tidak valid.' });

  db.prepare('UPDATE warga SET namaKepalaKeluarga = ?, nomorRumah = ?, status = ?, phone = ?, createdAt = ? WHERE id = ?').run(nama, nomorRumah, status, noHp, tanggalMasuk || new Date().toISOString(), req.params.id);
  res.json({ success: true });
});

app.delete('/api/warga/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM warga WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// =====================================================================
// TRANSACTIONS
// =====================================================================
app.get('/api/transactions', (req, res) => {
  const tx = db.prepare('SELECT * FROM transactions').all();
  res.json(tx);
});

app.post('/api/transactions', (req, res) => {
  const id = sanitize(req.body?.id) || `tx-${Date.now()}`;
  const date = sanitize(req.body?.date);
  const categoryId = sanitize(req.body?.categoryId);
  const type = req.body?.type;
  const nominal = sanitizeNum(req.body?.nominal);
  const description = sanitize(req.body?.description);
  const residentId = sanitize(req.body?.residentId);
  const periodeBulan = req.body?.periodeBulan ? sanitizeNum(req.body.periodeBulan) : null;
  const periodeTahun = req.body?.periodeTahun ? sanitizeNum(req.body.periodeTahun) : null;
  const kasLocationId = sanitize(req.body?.kasLocationId);

  if (!date || !categoryId) return res.status(400).json({ error: 'Tanggal dan kategori wajib diisi.' });
  if (!['Pemasukan', 'Pengeluaran'].includes(type)) return res.status(400).json({ error: 'Tipe transaksi tidak valid.' });
  if (nominal <= 0) return res.status(400).json({ error: 'Nominal harus lebih dari 0.' });

  db.prepare('INSERT INTO transactions (id, date, categoryId, type, nominal, description, residentId, periodeBulan, periodeTahun, kasLocationId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, date, categoryId, type, nominal, description, residentId, periodeBulan, periodeTahun, kasLocationId);
  res.json({ success: true, id });
});

app.delete('/api/transactions/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// =====================================================================
// KAS LOCATIONS
// =====================================================================
app.get('/api/kas-locations', (req, res) => {
  res.json(db.prepare('SELECT * FROM kas_locations').all());
});

app.post('/api/kas-locations', requireAdmin, (req, res) => {
  const id = sanitize(req.body?.id) || `loc-${Date.now()}`;
  const name = sanitize(req.body?.name);
  const type = req.body?.type;
  const description = sanitize(req.body?.description);

  if (!name) return res.status(400).json({ error: 'Nama lokasi wajib diisi.' });
  if (!['Tunai', 'Bank', 'E-Wallet'].includes(type)) return res.status(400).json({ error: 'Tipe lokasi tidak valid.' });

  db.prepare('INSERT INTO kas_locations (id, name, type, description) VALUES (?, ?, ?, ?)').run(id, name, type, description);
  res.json({ success: true, id });
});

app.put('/api/kas-locations/:id', requireAdmin, (req, res) => {
  const name = sanitize(req.body?.name);
  const type = req.body?.type;
  const description = sanitize(req.body?.description);

  if (!name) return res.status(400).json({ error: 'Nama lokasi wajib diisi.' });
  if (!['Tunai', 'Bank', 'E-Wallet'].includes(type)) return res.status(400).json({ error: 'Tipe tidak valid.' });

  db.prepare('UPDATE kas_locations SET name = ?, type = ?, description = ? WHERE id = ?').run(name, type, description, req.params.id);
  res.json({ success: true });
});

app.delete('/api/kas-locations/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM kas_locations WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// =====================================================================
// CATEGORIES
// =====================================================================
app.get('/api/categories', (req, res) => {
  res.json(db.prepare('SELECT * FROM categories').all());
});

app.post('/api/categories', requireAdmin, (req, res) => {
  const id = sanitize(req.body?.id) || `cat-${Date.now()}`;
  const name = sanitize(req.body?.name);
  const type = req.body?.type;
  const defaultNominal = req.body?.defaultNominal ? sanitizeNum(req.body.defaultNominal) : null;
  const periode = req.body?.periode;

  if (!name) return res.status(400).json({ error: 'Nama kategori wajib diisi.' });
  if (!['Pemasukan', 'Pengeluaran'].includes(type)) return res.status(400).json({ error: 'Tipe tidak valid.' });
  if (!['Bulanan', 'Tahunan', 'Insidental'].includes(periode)) return res.status(400).json({ error: 'Periode tidak valid.' });

  db.prepare('INSERT INTO categories (id, name, type, defaultNominal, periode) VALUES (?, ?, ?, ?, ?)').run(id, name, type, defaultNominal, periode);
  res.json({ success: true, id });
});

app.put('/api/categories/:id', requireAdmin, (req, res) => {
  const name = sanitize(req.body?.name);
  const defaultNominal = req.body?.defaultNominal ? sanitizeNum(req.body.defaultNominal) : null;
  const periode = req.body?.periode;
  const showInPayment = req.body?.showInPayment !== undefined ? (req.body.showInPayment ? 1 : 0) : 1;

  if (!name) return res.status(400).json({ error: 'Nama kategori wajib diisi.' });

  db.prepare('UPDATE categories SET name = ?, defaultNominal = ?, periode = ?, showInPayment = ? WHERE id = ?').run(name, defaultNominal, periode, showInPayment, req.params.id);
  res.json({ success: true });
});

app.delete('/api/categories/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// =====================================================================
// BACKUP & RESTORE - [SEC-07] Admin only + file validation
// =====================================================================
app.get('/api/backup', requireAdmin, async (req, res) => {
  try {
    const dataDir = path.join(__dirname, '..', 'data');
    const backupPath = path.join(dataDir, `backup-${Date.now()}.sqlite`);
    await db.backup(backupPath);
    res.download(backupPath, 'jepunkas-backup.sqlite', () => {
      if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal membuat backup.' });
  }
});

app.post('/api/restore', requireAdmin, express.raw({ type: '*/*', limit: '50mb' }), async (req, res) => {
  try {
    // [SEC] Validate SQLite magic bytes: first 16 bytes must be "SQLite format 3\000"
    const SQLITE_MAGIC = Buffer.from('53514c69746520666f726d6174203300', 'hex');
    if (!req.body || req.body.length < 16 || !req.body.slice(0, 16).equals(SQLITE_MAGIC)) {
      return res.status(400).json({ error: 'File tidak valid. Hanya file SQLite yang diizinkan.' });
    }

    const dataDir = path.join(__dirname, '..', 'data');
    const tempPath = path.join(dataDir, 'restore-temp.sqlite');
    fs.writeFileSync(tempPath, req.body);

    db.close();

    const dbPath = path.join(dataDir, 'jepunkas.sqlite');
    if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
    if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');
    fs.copyFileSync(tempPath, dbPath);
    fs.unlinkSync(tempPath);

    res.json({ success: true, message: 'Restore berhasil. Memulai ulang sistem...' });
    setTimeout(() => {
      console.log('Restore complete. Restarting...');
      process.exit(0);
    }, 1000);
  } catch (e) {
    res.status(500).json({ error: 'Gagal restore data.' }); // [SEC] Don't leak e.message
  }
});

// Ping endpoint
app.get('/api/ping', (req, res) => res.send('pong'));

// SPA fallback — any non-API route serves index.html (must be after all API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// =====================================================================
// GLOBAL ERROR HANDLER - [SEC] Never leak stack traces
// =====================================================================
app.use((err, req, res, _next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});

app.listen(port, () => {
  console.log(`JepunKas API running on port ${port}`);
});
