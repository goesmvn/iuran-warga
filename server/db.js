import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure a 'data' directory exists for the sqlite file
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'jepunkas.sqlite');
const db = new Database(dbPath, { verbose: console.log });

// Performance tuning for SQLite (WAL mode is drastically faster and safer for concurrent access)
db.pragma('journal_mode = WAL');

const initDB = () => {
  // CREATE TABLES
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS warga (
      id TEXT PRIMARY KEY,
      namaKepalaKeluarga TEXT NOT NULL,
      nomorRumah TEXT NOT NULL,
      status TEXT NOT NULL,
      blockNumber TEXT,
      phone TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS kas_locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      defaultNominal INTEGER,
      periode TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      categoryId TEXT NOT NULL,
      type TEXT NOT NULL,
      nominal INTEGER NOT NULL,
      description TEXT,
      residentId TEXT,
      periodeBulan INTEGER,
      periodeTahun INTEGER,
      kasLocationId TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(categoryId) REFERENCES categories(id),
      FOREIGN KEY(residentId) REFERENCES warga(id),
      FOREIGN KEY(kasLocationId) REFERENCES kas_locations(id)
    );
  `);

  // SEED DEFAULT DATA IF EMPTY
  const stmtSettings = db.prepare('SELECT COUNT(*) as count FROM settings');
  if (stmtSettings.get().count === 0) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('start_year', new Date().getFullYear().toString());
  }

  const stmtUsers = db.prepare('SELECT COUNT(*) as count FROM users');
  if (stmtUsers.get().count === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('password', salt);
    // id: usr-admin-01 is used by default seed
    db.prepare('INSERT INTO users (id, username, password_hash, name, role) VALUES (?, ?, ?, ?, ?)').run('usr-admin-01', 'admin', hash, 'Administrator', 'Admin');
  }

  const stmtKas = db.prepare('SELECT COUNT(*) as count FROM kas_locations');
  if (stmtKas.get().count === 0) {
    const insertKas = db.prepare('INSERT INTO kas_locations (id, name, type, description) VALUES (?, ?, ?, ?)');
    insertKas.run('loc-default', 'Laci Brankas Tunai RT', 'Tunai', 'Gembok fisik di rumah bapak bendahara');
  }

  const stmtCat = db.prepare('SELECT COUNT(*) as count FROM categories');
  if (stmtCat.get().count === 0) {
    const insertCat = db.prepare('INSERT INTO categories (id, name, type, defaultNominal, periode) VALUES (?, ?, ?, ?, ?)');
    const defaultCategories = [
      { id: 'cat-1', name: 'Iuran Wajib Bulanan', type: 'Pemasukan', defaultNominal: 10000, periode: 'Bulanan' },
      { id: 'cat-2', name: 'Uang Keamanan', type: 'Pemasukan', defaultNominal: 5000, periode: 'Bulanan' },
      { id: 'cat-3', name: 'Retribusi Sampah', type: 'Pemasukan', defaultNominal: 15000, periode: 'Bulanan' },
      { id: 'cat-4', name: 'Sumbangan Bebas', type: 'Pemasukan', defaultNominal: null, periode: 'Insidental' },
      { id: 'cat-5', name: 'Iuran Wajib Tahunan', type: 'Pemasukan', defaultNominal: 120000, periode: 'Tahunan' },
      { id: 'cat-out-1', name: 'Biaya Tukang Sampah', type: 'Pengeluaran', defaultNominal: 500000, periode: 'Bulanan' },
      { id: 'cat-out-2', name: 'Biaya Rapat/Konsumsi', type: 'Pengeluaran', defaultNominal: null, periode: 'Insidental' },
      { id: 'cat-out-3', name: 'Perawatan Infrastruktur', type: 'Pengeluaran', defaultNominal: null, periode: 'Insidental' }
    ];
    
    defaultCategories.forEach(c => insertCat.run(c.id, c.name, c.type, c.defaultNominal, c.periode));
  }

  // Ensure 'Saldo Awal' category always exists without overwriting existing data
  const insertSaldoAwal = db.prepare('INSERT OR IGNORE INTO categories (id, name, type, defaultNominal, periode) VALUES (?, ?, ?, ?, ?)');
  insertSaldoAwal.run('cat-saldo-awal', 'Saldo Awal / Sisa Kas Lama', 'Pemasukan', null, 'Insidental');
};

initDB();

export default db;
