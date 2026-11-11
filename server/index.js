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
import { startBackupScheduler, runAutoBackup } from './backup.js';

import { connectToWhatsApp, getStatus, logout, sendMessage } from './whatsapp/index.js';
import { createPayment, checkTransaction } from './ipaymu.js';

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
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // iPaymu sends Webhook as application/x-www-form-urlencoded

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
const sanitize = (val, allowNewlines = false) => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  // If allowNewlines is true, we keep \n and \r but strip other controls
  const regex = allowNewlines ? /[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g : /[\x00-\x1F\x7F]/g;
  return String(val).replace(regex, '').trim().substring(0, 1500);
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
  if (req.path === '/login' || req.path === '/ping' || req.path === '/ipaymu/callback') return next();

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

app.put('/api/users/:id', requireAdmin, (req, res) => {
  const username = sanitize(req.body?.username);
  const password = req.body?.password;
  const name = sanitize(req.body?.name);
  const role = req.body?.role;

  if (!username || !name) {
    return res.status(400).json({ error: 'Data pengguna tidak lengkap.' });
  }
  if (!['Admin', 'Staff'].includes(role)) {
    return res.status(400).json({ error: 'Role tidak valid.' });
  }

  try {
    if (password && password.trim() !== '') {
      if (typeof password !== 'string' || password.length < 6 || password.length > 200) {
        return res.status(400).json({ error: 'Password minimal 6 karakter.' });
      }
      const hash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET username = ?, password_hash = ?, name = ?, role = ? WHERE id = ?').run(username, hash, name, role, req.params.id);
    } else {
      db.prepare('UPDATE users SET username = ?, name = ?, role = ? WHERE id = ?').run(username, name, role, req.params.id);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'Username sudah digunakan.' });
  }
});

// =====================================================================
// SETTINGS - [SEC-06] Admin Only
// =====================================================================
const ALLOWED_SETTING_KEYS = ['start_year', 'nama_ketua', 'nama_bendahara', 'nama_organisasi', 'nama_desa', 'alamat', 'maps_url', 'wa_template_tunggakan', 'nominal_iuran_bulanan', 'rekening_tujuan', 'auto_broadcast_date'];

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
  const isTemplate = key === 'wa_template_tunggakan';
  const value = sanitize(req.body?.value, isTemplate);
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
    tanggalMasuk: w.createdAt,
    roleWarga: w.roleWarga || 'Warga'
  })));
});

app.post('/api/warga', (req, res) => {
  const nama = sanitize(req.body?.namaKepalaKeluarga);
  const nomorRumah = sanitize(req.body?.nomorRumah);
  const status = req.body?.status;
  const noHp = sanitize(req.body?.noHp);
  const tanggalMasuk = req.body?.tanggalMasuk;
  const roleWarga = sanitize(req.body?.roleWarga) || 'Warga';
  const id = sanitize(req.body?.id) || `warga-${Date.now()}`;

  if (!nama || !nomorRumah) return res.status(400).json({ error: 'Nama dan nomor rumah wajib diisi.' });
  if (!['Aktif', 'Pindah'].includes(status)) return res.status(400).json({ error: 'Status tidak valid.' });

  db.prepare('INSERT INTO warga (id, namaKepalaKeluarga, nomorRumah, status, phone, roleWarga, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, nama, nomorRumah, status, noHp, roleWarga, tanggalMasuk || new Date().toISOString());
  res.json({ success: true, id });
});

app.put('/api/warga/:id', (req, res) => {
  const nama = sanitize(req.body?.namaKepalaKeluarga);
  const nomorRumah = sanitize(req.body?.nomorRumah);
  const status = req.body?.status;
  const noHp = sanitize(req.body?.noHp);
  const tanggalMasuk = req.body?.tanggalMasuk;
  const roleWarga = sanitize(req.body?.roleWarga) || 'Warga';

  if (!nama || !nomorRumah) return res.status(400).json({ error: 'Data tidak lengkap.' });
  if (!['Aktif', 'Pindah'].includes(status)) return res.status(400).json({ error: 'Status tidak valid.' });

  db.prepare('UPDATE warga SET namaKepalaKeluarga = ?, nomorRumah = ?, status = ?, phone = ?, roleWarga = ?, createdAt = ? WHERE id = ?').run(nama, nomorRumah, status, noHp, roleWarga, tanggalMasuk || new Date().toISOString(), req.params.id);
  res.json({ success: true });
});

app.delete('/api/warga/:id', requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM warga WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    if (e.message.includes('FOREIGN KEY constraint failed')) {
      return res.status(409).json({ error: 'Tidak bisa menghapus warga ini karena masih memiliki transaksi. Hapus transaksi terkait terlebih dahulu.' });
    }
    throw e;
  }
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
  const transferId = sanitize(req.body?.transferId);
  const transferToKasLocationId = sanitize(req.body?.transferToKasLocationId);
  const status = sanitize(req.body?.status) || 'Success'; // Default to success for manual input

  if (!date || !categoryId) return res.status(400).json({ error: 'Tanggal dan kategori wajib diisi.' });
  if (!['Pemasukan', 'Pengeluaran'].includes(type)) return res.status(400).json({ error: 'Tipe transaksi tidak valid.' });
  if (nominal < 0) return res.status(400).json({ error: 'Nominal tidak boleh negatif.' });

  try {
    db.prepare('INSERT INTO transactions (id, date, categoryId, type, nominal, description, residentId, periodeBulan, periodeTahun, kasLocationId, transferId, transferToKasLocationId, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, date, categoryId, type, nominal, description, residentId, periodeBulan, periodeTahun, kasLocationId, transferId, transferToKasLocationId, status);
    res.json({ success: true, id });
  } catch (e) {
    if (e.message.includes('FOREIGN KEY constraint failed')) {
      return res.status(400).json({ error: 'Data referensi tidak valid. Pastikan kategori, warga, dan lokasi kas yang dipilih masih ada.' });
    }
    throw e;
  }
});

app.put('/api/transactions/:id/status', requireAdmin, (req, res) => {
  const status = req.body?.status;
  if (!['Success', 'Pending', 'Failed'].includes(status)) return res.status(400).json({ error: 'Status tidak valid.' });

  db.prepare('UPDATE transactions SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
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
  try {
    db.prepare('DELETE FROM kas_locations WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    if (e.message.includes('FOREIGN KEY constraint failed')) {
      return res.status(409).json({ error: 'Tidak bisa menghapus lokasi kas ini karena masih digunakan oleh transaksi. Hapus atau pindahkan transaksi terkait terlebih dahulu.' });
    }
    throw e;
  }
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
  try {
    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    if (e.message.includes('FOREIGN KEY constraint failed')) {
      return res.status(409).json({ error: 'Tidak bisa menghapus kategori ini karena masih digunakan oleh transaksi. Hapus transaksi terkait terlebih dahulu.' });
    }
    throw e;
  }
});

// =====================================================================
// WHATSAPP
// =====================================================================
app.get('/api/whatsapp/status', requireAdmin, (req, res) => {
  res.json(getStatus());
});

app.post('/api/whatsapp/logout', requireAdmin, async (req, res) => {
  await logout();
  res.json({ success: true });
});

// Hitung bulan iuran yang belum dibayar seorang warga, dari Januari start_year s/d bulan berjalan.
// Logika sama dengan halaman Pembayaran: kategori bulanan menandai 1 bulan, kategori tahunan menandai 12 bulan.
// Transaksi Pending/Failed tidak dihitung sebagai lunas.
function getUnpaidMonths(residentId, startYear) {
  const categories = db.prepare('SELECT id, name, periode FROM categories').all();
  const bulananIds = new Set(categories.filter(c => c.periode === 'Bulanan' || c.name.toLowerCase().includes('bulanan')).map(c => c.id));
  const tahunanIds = new Set(categories.filter(c => c.periode === 'Tahunan' || c.name.toLowerCase().includes('tahunan')).map(c => c.id));

  const paidTx = db.prepare(`
    SELECT categoryId, periodeBulan, periodeTahun FROM transactions
    WHERE residentId = ? AND type = 'Pemasukan' AND (status IS NULL OR status = 'Success') AND periodeTahun IS NOT NULL
  `).all(residentId);

  const paid = new Set();
  for (const t of paidTx) {
    if (tahunanIds.has(t.categoryId)) {
      for (let m = 1; m <= 12; m++) paid.add(`${t.periodeTahun}-${m}`);
    } else if (t.periodeBulan && bulananIds.has(t.categoryId)) {
      paid.add(`${t.periodeTahun}-${t.periodeBulan}`);
    }
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const unpaid = [];
  for (let y = startYear; y <= currentYear; y++) {
    const lastMonth = y === currentYear ? currentMonth : 12;
    for (let m = 1; m <= lastMonth; m++) {
      if (!paid.has(`${y}-${m}`)) unpaid.push({ year: y, month: m });
    }
  }
  return unpaid;
}

// Fungsi eksekutor broadcast, dipisahkan agar bisa dipanggil dari API maupun Scheduler/CronJob
export async function executeBroadcast(templateStr) {
  const status = getStatus();
  if (status.status !== 'Terhubung') {
    throw new Error('WhatsApp belum terhubung.');
  }

  // Get active residents and current settings
  const wargaList = db.prepare('SELECT id, namaKepalaKeluarga, nomorRumah, phone FROM warga WHERE status = "Aktif"').all();
  const settings = db.prepare('SELECT key, value FROM settings').all().reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
  const nominal = Number(settings.nominal_iuran_bulanan) || 0;
  const startYear = parseInt(settings.start_year, 10) || new Date().getFullYear();

  // Gunakan template dari param, atau fallback ke DB
  const template = templateStr || settings['wa_template_tunggakan'];
  if (!template) throw new Error('Template pesan kosong.');

  let successCount = 0;
  let failCount = 0;

  for (const warga of wargaList) {
    if (!warga.phone) {
      failCount++;
      continue;
    }

    const unpaidMonths = getUnpaidMonths(warga.id, startYear);
    const monthsDue = unpaidMonths.length;
    const now = new Date();
    const currentMonthUnpaid = unpaidMonths.some(u => u.year === now.getFullYear() && u.month === now.getMonth() + 1);
    const totalDue = nominal * monthsDue;
    const tunggakan = totalDue - (currentMonthUnpaid ? nominal : 0); // di luar bulan berjalan

    if (totalDue > 0) {
      let paymentLink = '#';
      const referenceId = `TX-${warga.id}-${Date.now()}`;
      const webhookUrl = process.env.WEBHOOK_DOMAIN ? `${process.env.WEBHOOK_DOMAIN}/api/ipaymu/callback` : 'https://google.com/api/ipaymu/callback';

      // Biaya admin withdrawal 2%
      const withdrawalFee = Math.ceil(totalDue * 0.02);
      const totalBilledToIPaymu = totalDue + withdrawalFee;

      // Mencegah Tagihan Ganda / Kedaluwarsa:
      const cancelled = db.prepare(`UPDATE transactions SET status = 'Failed', description = description || ' (Dibatalkan sistem - Diganti tagihan baru)' WHERE residentId = ? AND status = 'Pending'`).run(warga.id);

      if (cancelled.changes > 0) {
         console.log(`[Broadcast] Membatalkan tagihan lama milik ${warga.namaKepalaKeluarga} dan membuat ulang.`);
      }

      try {
        if (process.env.IPAYMU_VA) {
           const payment = await createPayment({
             product: `Tagihan Iuran - ${warga.namaKepalaKeluarga} (+Biaya Aplikasi 2%)`,
             amount: totalBilledToIPaymu,
             referenceId: referenceId,
             buyerName: warga.namaKepalaKeluarga,
             buyerPhone: warga.phone,
             notifyUrl: webhookUrl
           });
           paymentLink = payment.Url;

           // Simpan DRAFT transaksi "Pending", 1 baris per bulan tertunggak dengan referenceId yang sama,
           // agar saat lunas setiap bulan tercatat terbayar di laporan.
           const insertPending = db.prepare(`
             INSERT INTO transactions (id, date, categoryId, type, nominal, description, residentId, periodeBulan, periodeTahun, kasLocationId, status, referenceId)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           `);
           const txDate = new Date().toISOString().split('T')[0];
           db.transaction(() => {
             for (const u of unpaidMonths) {
               insertPending.run(
                 `tx-${Date.now()}-${warga.id}-${u.year}-${u.month}`,
                 txDate,
                 'cat-1',
                 'Pemasukan',
                 nominal,
                 `Pembayaran Broadcast Tunggakan (${monthsDue} bln)`,
                 warga.id,
                 u.month,
                 u.year,
                 'loc-default',
                 'Pending',
                 referenceId
               );
             }
           })();
        }
      } catch (err) {
        console.error('iPaymu error:', err.message);
      }

      let message = template
        .replace(/\{\{nama\}\}/g, warga.namaKepalaKeluarga)
        .replace(/\{\{nomor_rumah\}\}/g, warga.nomorRumah)
        .replace(/\{\{nominal_bulan_ini\}\}/g, nominal.toLocaleString('id-ID'))
        .replace(/\{\{nominal_tunggakan\}\}/g, tunggakan.toLocaleString('id-ID'))
        .replace(/\{\{total_tagihan\}\}/g, totalDue.toLocaleString('id-ID'))
        .replace(/\{\{jumlah_bulan\}\}/g, monthsDue)
        .replace(/\{\{payment_link\}\}/g, paymentLink)
        .replace(/\{\{rekening\}\}/g, settings.rekening_tujuan || '');

      try {
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));

        const jid = `${warga.phone.replace(/^0/, '62').replace(/\D/g, '')}@s.whatsapp.net`;
        await sendMessage(jid, message);
        successCount++;
      } catch (err) {
        console.error('WA send error:', err.message);
        failCount++;
      }
    }
  }

  return { successCount, failCount };
}

// =====================================================================
// BROADCAST (with iPaymu)
// =====================================================================
app.post('/api/broadcast', requireAdmin, async (req, res) => {
  const { template } = req.body;
  if (!template) return res.status(400).json({ error: 'Template pesan wajib diisi.' });

  try {
    const result = await executeBroadcast(template);
    res.json({ success: true, successCount: result.successCount, failCount: result.failCount });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/broadcast/test', requireAdmin, async (req, res) => {
  const { template, phone } = req.body;
  if (!template) return res.status(400).json({ error: 'Template pesan wajib diisi.' });
  if (!phone) return res.status(400).json({ error: 'Nomor telepon tujuan wajib diisi.' });

  const status = getStatus();
  if (status.status !== 'Terhubung') {
    return res.status(400).json({ error: 'WhatsApp belum terhubung.' });
  }

  const settings = db.prepare('SELECT key, value FROM settings').all().reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
  const nominal = Number(settings.nominal_iuran_bulanan) || 0;

  // Dummy data for testing
  const monthsDue = 3;
  const tunggakan = nominal * (monthsDue - 1);
  const totalDue = nominal * monthsDue;

  // Biaya admin withdrawal 2%
  const withdrawalFee = Math.ceil(totalDue * 0.02);
  const totalBilledToIPaymu = totalDue + withdrawalFee;

  let paymentLink = '#';
  const referenceId = `TEST-TX-${Date.now()}`;
  const webhookUrl = process.env.WEBHOOK_DOMAIN ? `${process.env.WEBHOOK_DOMAIN}/api/ipaymu/callback` : 'https://google.com/api/ipaymu/callback';

  try {
    if (process.env.IPAYMU_VA) {
       const payment = await createPayment({
         product: `Tagihan Iuran - Test Broadcast (+Biaya Aplikasi 2%)`,
         amount: totalBilledToIPaymu,
         referenceId: referenceId,
         buyerName: 'Warga Tester',
         buyerPhone: phone,
         notifyUrl: webhookUrl
       });
       paymentLink = payment.Url;

       // Simpan DRAFT transaksi test sebagai "Pending"
       db.prepare(`
         INSERT INTO transactions (id, date, categoryId, type, nominal, description, residentId, periodeBulan, periodeTahun, kasLocationId, status, referenceId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       `).run(
         `tx-test-${Date.now()}`,
         new Date().toISOString().split('T')[0],
         'cat-1',
         'Pemasukan',
         totalDue,
         `Pembayaran Test Broadcast (${monthsDue} bln)`,
         null, // Tidak diasosiasikan dengan warga asli
         new Date().getMonth() + 1,
         new Date().getFullYear(),
         'loc-default',
         'Pending',
         referenceId
       );
    }
  } catch (err) {
    console.error('iPaymu error:', err.message);
  }

  let message = template
    .replace(/\{\{nama\}\}/g, 'Bapak/Ibu Tester')
    .replace(/\{\{nomor_rumah\}\}/g, 'Blok X No. 99')
    .replace(/\{\{nominal_bulan_ini\}\}/g, nominal.toLocaleString('id-ID'))
    .replace(/\{\{nominal_tunggakan\}\}/g, tunggakan.toLocaleString('id-ID'))
    .replace(/\{\{total_tagihan\}\}/g, totalDue.toLocaleString('id-ID'))
    .replace(/\{\{jumlah_bulan\}\}/g, monthsDue)
    .replace(/\{\{payment_link\}\}/g, paymentLink)
    .replace(/\{\{rekening\}\}/g, settings.rekening_tujuan || '');

  try {
    const jid = `${phone.replace(/^0/, '62').replace(/\D/g, '')}@s.whatsapp.net`;
    await sendMessage(jid, message);
    res.json({ success: true });
  } catch (err) {
    console.error('WA send test error:', err.message);
    res.status(500).json({ error: 'Gagal mengirim pesan uji coba. Pastikan bot terhubung.' });
  }
});

// =====================================================================
// IPAYMU WEBHOOK (Callback)
// Ditembak secara asinkron (dari belakang) oleh iPaymu saat warga selesai bayar.
// =====================================================================
app.post('/api/ipaymu/callback', async (req, res) => {
  try {
    // iPaymu mengirim data dalam format body urlencoded atau json
    const { trx_id, reference_id, status_code, status } = req.body;

    // Abaikan jika bukan notif transaksi sukses (Status code iPaymu untuk berhasil biasanya 1 atau 2, tergantung docs)
    // status "berhasil" atau "sukses" (huruf kecil) biasanya dikirim.
    if (!trx_id || !reference_id) {
       return res.status(400).send('Bad Request');
    }

    // [SEC] JANGAN PERCAYA PAYLOAD BEGITU SAJA!
    // Lakukan verifikasi balik (GET) ke iPaymu menggunakan trx_id.
    const validData = await checkTransaction(trx_id);

    // [SEC] Pastikan trx_id yang diverifikasi memang milik reference_id ini.
    // Tanpa cek ini, trx_id sah milik transaksi lain bisa dipakai untuk melunasi tagihan siapa pun.
    if (String(validData.ReferenceId) !== String(reference_id)) {
      console.warn(`[Webhook] ReferenceId mismatch: trx ${trx_id} milik ${validData.ReferenceId}, bukan ${reference_id}`);
      return res.status(400).send('Bad Request');
    }

    const tx = db.prepare('SELECT id, status, residentId FROM transactions WHERE referenceId = ?').get(reference_id);
    if (!tx) return res.status(404).send('Not Found');
    // Satu tagihan bisa terdiri dari beberapa baris (1 per bulan tertunggak)
    const billedTotal = db.prepare('SELECT SUM(nominal) AS total FROM transactions WHERE referenceId = ?').get(reference_id).total;

    const statusDesc = String(validData.StatusDesc || '').toLowerCase();
    const paidAmount = Number(validData.Amount ?? validData.Total);

    // Status 1 = Pending, 2 = Sukses/Berhasil, 3 = Gagal, 6 = Escrow (Dana tertahan sementara, biasanya dianggap sukses di sisi buyer)
    // Sesuai dokumentasi iPaymu v2, "escrow" berarti buyer sudah bayar tapi dana masuk ke rekening penampungan iPaymu sementara. Kita anggap ini LUNAS untuk warga.
    if (validData.Status === 2 || validData.Status === 6 || statusDesc === 'berhasil' || statusDesc === 'escrow') {
      // [SEC] Nominal yang dibayar minimal harus sebesar tagihan
      if (!(paidAmount >= billedTotal)) {
        console.warn(`[Webhook] Nominal kurang untuk ${reference_id}: dibayar ${paidAmount}, tagihan ${billedTotal}`);
        return res.status(400).send('Amount Mismatch');
      }

      if (tx.status === 'Pending') {
        // Tandai sebagai lunas (Success)
        db.prepare("UPDATE transactions SET status = 'Success' WHERE referenceId = ?").run(reference_id);
        
        // (Opsional) Kirim notifikasi WA ucapan terima kasih karena pembayaran berhasil terverifikasi otomatis.
        try {
          // Hanya kirim WA jika ini transaksi warga asli (residentId valid)
          if (tx.residentId) {
            const w = db.prepare('SELECT phone, namaKepalaKeluarga FROM warga WHERE id = ?').get(tx.residentId);
            if (w && w.phone) {
               const msg = `Terima kasih Bapak/Ibu ${w.namaKepalaKeluarga}, pembayaran iuran sebesar Rp ${paidAmount.toLocaleString('id-ID')} telah berhasil diverifikasi otomatis oleh sistem. 🙏\n\n_Ketik *0* untuk kembali ke Menu Utama._`;
               const jid = `${w.phone.replace(/^0/, '62').replace(/\D/g, '')}@s.whatsapp.net`;
               await sendMessage(jid, msg);
            }
          } else {
             // Simulasi notifikasi untuk Test Broadcast
             console.log(`[Testing] Sending real WA receipt to tester...`);
             const msg = `Terima kasih Bapak/Ibu Tester, pembayaran iuran sebesar Rp ${paidAmount.toLocaleString('id-ID')} telah berhasil diverifikasi otomatis oleh sistem. (Ini adalah simulasi Webhook JepunKas) 🙏\n\n_Ketik *0* untuk kembali ke Menu Utama._`;
             const jid = `6285190321727@s.whatsapp.net`; // Hardcoded nomor tester
             await sendMessage(jid, msg);
          }
        } catch (e) {
          console.error('[Webhook WA Notify Error]', e.message);
        }

        console.log(`[Webhook] Payment Success for ${reference_id}`);
        return res.status(200).send('OK');
      } else if (tx.status === 'Success') {
        // [EDGE-CASE] Transaksi sudah sukses (Mencegah double trigger / spam WhatsApp)
        console.log(`[Webhook] Ignored duplicate success trigger for ${reference_id}`);
        return res.status(200).send('Already Success');
      }
    } else if (validData.Status === 3 || validData.Status === 4) {
      // Gagal / Expired
      db.prepare("UPDATE transactions SET status = 'Failed' WHERE referenceId = ? AND status = 'Pending'").run(reference_id);
    }

    res.status(200).send('Ignored/Pending');
  } catch (error) {
    console.error('[Webhook Error]', error.message);
    res.status(500).send('Internal Server Error');
  }
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

// GET /api/backup-settings
app.get('/api/backup-settings', requireAdmin, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);

    res.json({
      backup_interval: settings['backup_interval'] || 'Nonaktif',
      gdrive_backup_enabled: settings['gdrive_backup_enabled'] === 'true',
      gdrive_folder_id: settings['gdrive_folder_id'] || '',
      has_credentials: !!settings['gdrive_credentials'],
      last_backup_time: settings['last_backup_time'] ? Number(settings['last_backup_time']) : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil setelan backup.' });
  }
});

// POST /api/backup-settings
app.post('/api/backup-settings', requireAdmin, (req, res) => {
  try {
    const { backup_interval, gdrive_backup_enabled, gdrive_folder_id, gdrive_credentials } = req.body;

    const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');

    if (backup_interval) {
      stmt.run('backup_interval', sanitize(backup_interval));
    }
    if (gdrive_backup_enabled !== undefined) {
      stmt.run('gdrive_backup_enabled', gdrive_backup_enabled ? 'true' : 'false');
    }
    if (gdrive_folder_id !== undefined) {
      stmt.run('gdrive_folder_id', sanitize(gdrive_folder_id));
    }
    if (gdrive_credentials) {
      // Validasi format JSON key Google Drive
      try {
        const parsed = JSON.parse(gdrive_credentials);
        if (!parsed.client_email || !parsed.private_key) {
          throw new Error('Format Service Account tidak valid.');
        }
        stmt.run('gdrive_credentials', JSON.stringify(parsed));
      } catch (e) {
        return res.status(400).json({ error: 'JSON Service Account Key tidak valid.' });
      }
    }

    res.json({ success: true, message: 'Setelan backup berhasil disimpan.' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menyimpan setelan backup.' });
  }
});

// POST /api/backup-test (Trigger test backup ke GDrive secara instan)
app.post('/api/backup-test', requireAdmin, async (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);

    const gdriveEnabled = settings['gdrive_backup_enabled'] === 'true';
    const credsStr = settings['gdrive_credentials'];
    const folderId = settings['gdrive_folder_id'] || '';

    if (!gdriveEnabled || !credsStr) {
      return res.status(400).json({ error: 'Google Drive Backup belum diaktifkan atau kredensial kosong!' });
    }

    const dataDir = path.join(__dirname, '..', 'data');
    const tempBackupPath = path.join(dataDir, 'backup-test-temp.sqlite');

    // Backup DB
    await db.backup(tempBackupPath);

    // Upload
    const credentials = JSON.parse(credsStr);
    const { uploadToGDrive } = await import('./backup.js');
    await uploadToGDrive(tempBackupPath, credentials, folderId);

    // Unlink
    if (fs.existsSync(tempBackupPath)) {
      fs.unlinkSync(tempBackupPath);
    }

    // Save last backup time
    const now = Date.now();
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run('last_backup_time', now.toString());

    res.json({ success: true, message: 'Test backup ke Google Drive berhasil diunggah!', last_backup_time: now });
  } catch (error) {
    res.status(500).json({ error: `Gagal test backup: ${error.message}` });
  }
});

// Ping endpoint
app.get('/api/ping', (req, res) => res.send('pong'));

// Payment Success Page (Redirect dari iPaymu)
app.get('/payment-success', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Pembayaran Berhasil</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f3f4f6; text-align: center; }
        .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); max-width: 90%; width: 400px; }
        .icon { color: #10b981; width: 64px; height: 64px; margin: 0 auto 1rem; }
        h1 { color: #111827; margin: 0 0 0.5rem; font-size: 1.5rem; }
        p { color: #6b7280; margin: 0 0 1.5rem; font-size: 0.95rem; line-height: 1.5; }
        a { display: inline-block; background-color: #f43f5e; color: white; text-decoration: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; transition: background-color 0.2s; }
        a:hover { background-color: #e11d48; }
      </style>
    </head>
    <body>
      <div class="card">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <h1>Pembayaran Diproses!</h1>
        <p>Terima kasih, instruksi pembayaran Anda telah kami terima. Jika Anda sudah melakukan transfer, sistem akan otomatis memverifikasi dan mengirimkan bukti lunas (struk) ke WhatsApp Anda beberapa saat lagi.</p>
        <a href="/">Tutup Halaman Ini</a>
      </div>
    </body>
    </html>
  `);
});

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

const host = process.env.HOST || '127.0.0.1';
app.listen(port, host, () => {
  console.log(`JepunKas API running on ${host}:${port}`);
  startBackupScheduler(executeBroadcast);
  connectToWhatsApp().catch(err => console.error('WhatsApp Init Error:', err));
});
