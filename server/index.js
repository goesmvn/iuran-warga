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

app.use(cors());
app.use(express.json());
app.use(helmet({
  contentSecurityPolicy: false, // Since this serves React directly sometimes
  crossOriginEmbedderPolicy: false
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, 
  message: { error: 'Terlalu banyak permintaan, coba lagi nanti.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts
  message: { error: 'Terlalu banyak percobaan login, coba lagi dalam 15 menit.' }
});

app.use('/api', apiLimiter);

// --- AUTH ---
app.post('/api/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Username atau password salah!' });
  }
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET || 'fallback_secret_for_local_dev', { expiresIn: '12h' });
  res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
});

// Middleware for JWT verification
app.use('/api', (req, res, next) => {
  if (req.path === '/login' || req.path === '/ping') return next();
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
     return res.status(401).json({ error: 'Akses Ditolak. Token Authentikasi hilang.' });
  }
  
  const token = authHeader.split(' ')[1];
  try {
     const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_local_dev');
     req.user = decoded;
     next();
  } catch (err) {
     return res.status(401).json({ error: 'Akses Ditolak. Sesi telah kadaluarsa atau tidak valid.' });
  }
});

// --- USERS (Pengelola) ---
app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT id, username, name, role FROM users').all();
  res.json(users);
});

app.post('/api/users', (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({error: 'Hanya Admin yang dapat menambah pengguna'});
  const { username, password, name, role } = req.body;
  const hash = bcrypt.hashSync(password, 10);
  const id = `usr-${Date.now()}`;
  try {
    db.prepare('INSERT INTO users (id, username, password_hash, name, role) VALUES (?, ?, ?, ?, ?)').run(id, username, hash, name, role);
    res.json({ success: true, user: { id, username, name, role } });
  } catch(e) {
    res.status(400).json({error: 'Username sudah digunakan'});
  }
});

app.delete('/api/users/:id', (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({error: 'Hanya Admin yang dapat menghapus'});
  if (req.params.id === req.user.id) return res.status(400).json({error: 'Tidak bisa menghapus akun Anda sendiri'});
  db.prepare('DELETE FROM users WHERE id = ? AND username != "admin"').run(req.params.id);
  res.json({ success: true });
});

// --- SETTINGS ---
app.get('/api/settings', (req, res) => {
  const settingsArray = db.prepare('SELECT * FROM settings').all();
  // Convert array to object { start_year: '2025', ... }
  const settingsObj = settingsArray.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
  res.json(settingsObj);
});

app.put('/api/settings/:key', (req, res) => {
  const { value } = req.body;
  const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  stmt.run(req.params.key, String(value));
  res.json({ success: true });
});

// --- WARGA ---
app.get('/api/warga', (req, res) => {
  const warga = db.prepare('SELECT * FROM warga').all();
  const mappedWarga = warga.map(w => ({
    id: w.id,
    namaKepalaKeluarga: w.namaKepalaKeluarga,
    nomorRumah: w.nomorRumah,
    status: w.status,
    noHp: w.phone || '',
    tanggalMasuk: w.createdAt
  }));
  res.json(mappedWarga);
});

app.post('/api/warga', (req, res) => {
  const { id, namaKepalaKeluarga, nomorRumah, status, noHp, tanggalMasuk } = req.body;
  const stmt = db.prepare('INSERT INTO warga (id, namaKepalaKeluarga, nomorRumah, status, phone, createdAt) VALUES (?, ?, ?, ?, ?, ?)');
  stmt.run(id, namaKepalaKeluarga, nomorRumah, status, noHp || null, tanggalMasuk || new Date().toISOString());
  res.json({ success: true, id });
});

app.put('/api/warga/:id', (req, res) => {
  const { namaKepalaKeluarga, nomorRumah, status, noHp, tanggalMasuk } = req.body;
  const stmt = db.prepare('UPDATE warga SET namaKepalaKeluarga = ?, nomorRumah = ?, status = ?, phone = ?, createdAt = ? WHERE id = ?');
  stmt.run(namaKepalaKeluarga, nomorRumah, status, noHp || null, tanggalMasuk || new Date().toISOString(), req.params.id);
  res.json({ success: true });
});

app.delete('/api/warga/:id', (req, res) => {
  db.prepare('DELETE FROM warga WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- TRANSACTIONS ---
app.get('/api/transactions', (req, res) => {
  const tx = db.prepare('SELECT * FROM transactions').all();
  res.json(tx);
});

app.post('/api/transactions', (req, res) => {
  const { id, date, categoryId, type, nominal, description, residentId, periodeBulan, periodeTahun, kasLocationId } = req.body;
  const stmt = db.prepare('INSERT INTO transactions (id, date, categoryId, type, nominal, description, residentId, periodeBulan, periodeTahun, kasLocationId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  stmt.run(id, date, categoryId, type, nominal, description, residentId, periodeBulan, periodeTahun, kasLocationId);
  res.json({ success: true, id });
});

app.delete('/api/transactions/:id', (req, res) => {
  db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- KAS LOCATIONS ---
app.get('/api/kas-locations', (req, res) => {
  const locs = db.prepare('SELECT * FROM kas_locations').all();
  res.json(locs);
});

app.post('/api/kas-locations', (req, res) => {
  const { id, name, type, description } = req.body;
  db.prepare('INSERT INTO kas_locations (id, name, type, description) VALUES (?, ?, ?, ?)').run(id, name, type, description);
  res.json({ success: true, id });
});

app.put('/api/kas-locations/:id', (req, res) => {
  const { name, type, description } = req.body;
  db.prepare('UPDATE kas_locations SET name = ?, type = ?, description = ? WHERE id = ?').run(name, type, description, req.params.id);
  res.json({ success: true });
});

app.delete('/api/kas-locations/:id', (req, res) => {
  db.prepare('DELETE FROM kas_locations WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- CATEGORIES ---
app.get('/api/categories', (req, res) => {
  const cats = db.prepare('SELECT * FROM categories').all();
  res.json(cats);
});

app.post('/api/categories', (req, res) => {
  const { id, name, type, defaultNominal, periode } = req.body;
  db.prepare('INSERT INTO categories (id, name, type, defaultNominal, periode) VALUES (?, ?, ?, ?, ?)').run(id, name, type, defaultNominal, periode);
  res.json({ success: true, id });
});

app.put('/api/categories/:id', (req, res) => {
  const { name, defaultNominal, periode } = req.body;
  db.prepare('UPDATE categories SET name = ?, defaultNominal = ?, periode = ? WHERE id = ?').run(name, defaultNominal, periode, req.params.id);
  res.json({ success: true });
});

app.delete('/api/categories/:id', (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- SYSTEM MAINTENACE (BACKUP & RESTORE) ---
app.get('/api/backup', async (req, res) => {
  try {
    const dataDir = path.join(__dirname, '..', 'data');
    const backupPath = path.join(dataDir, `backup-${Date.now()}.sqlite`);
    await db.backup(backupPath);
    res.download(backupPath, 'jepunkas-backup.sqlite', (err) => {
      if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal membuat backup manual.' });
  }
});

app.post('/api/restore', express.raw({ type: '*/*', limit: '100mb' }), async (req, res) => {
  try {
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
        console.log('Restoring completed. Exiting to allow process restart...');
        process.exit(0);
    }, 1000);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal restore data: ' + e.message });
  }
});

// Ping endpoint for healthcheck
app.get('/api/ping', (req, res) => res.send('pong'));

// --- STATIC FRONTEND SERVING (For Docker Production) ---
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`JepunKas Backend API is listening on port ${port}`);
});
