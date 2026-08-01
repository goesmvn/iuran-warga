import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper token caching
let cachedToken = null;
let tokenExpiry = 0;

/**
 * Mendapatkan Access Token dari Google OAuth2 menggunakan Service Account Credentials
 */
async function getAccessToken(credentials) {
  try {
    const now = Math.floor(Date.now() / 1000);
    
    // Gunakan cached token jika masih valid (exp > 5 menit ke depan)
    if (cachedToken && tokenExpiry > now + 300) {
      return cachedToken;
    }

    const payload = {
      iss: credentials.client_email,
      sub: credentials.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
      scope: 'https://www.googleapis.com/auth/drive.file'
    };

    const token = jwt.sign(payload, credentials.private_key, { algorithm: 'RS256' });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: token
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Auth API error: ${errText}`);
    }

    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiry = now + data.expires_in;
    return cachedToken;
  } catch (error) {
    console.error('[Backup GDrive Token Error]', error.message);
    throw error;
  }
}

/**
 * Upload file database sqlite ke Google Drive
 */
export async function uploadToGDrive(dbPath, credentials, folderId = '') {
  try {
    const accessToken = await getAccessToken(credentials);
    const fileName = `jepunkas-backup-${new Date().toISOString().split('T')[0]}-${Date.now()}.sqlite`;
    const metadata = {
      name: fileName,
      mimeType: 'application/x-sqlite3'
    };

    if (folderId && folderId.trim() !== '') {
      metadata.parents = [folderId.trim()];
    }

    // Buat multipart payload upload body
    const boundary = 'foo_bar_baz';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const fileContent = fs.readFileSync(dbPath);
    
    const requestBody = Buffer.concat([
      Buffer.from(delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata)),
      Buffer.from(delimiter + 'Content-Type: application/x-sqlite3\r\n\r\n'),
      fileContent,
      Buffer.from(closeDelimiter)
    ]);

    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': requestBody.length.toString()
      },
      body: requestBody
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Drive Upload API error: ${errText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[Backup GDrive Upload Error]', error.message);
    throw error;
  }
}

/**
 * Menjalankan backup otomatis berdasarkan interval
 */
export async function runAutoBackup(force = false) {
  try {
    // Ambil settings dari database
    const settings = {};
    const rows = db.prepare('SELECT * FROM settings').all();
    rows.forEach(r => settings[r.key] = r.value);

    const interval = settings['backup_interval'] || 'Nonaktif';
    const gdriveEnabled = settings['gdrive_backup_enabled'] === 'true';
    const credsStr = settings['gdrive_credentials'];
    const folderId = settings['gdrive_folder_id'] || '';
    const lastBackupStr = settings['last_backup_time'] || '0';

    if (interval === 'Nonaktif' && !force) return;

    // Cek durasi interval sejak backup terakhir
    const now = Date.now();
    const lastBackup = Number(lastBackupStr);
    let intervalMs = 0;
    if (interval === 'Harian') intervalMs = 24 * 60 * 60 * 1000;
    else if (interval === 'Mingguan') intervalMs = 7 * 24 * 60 * 60 * 1000;
    else if (interval === 'Bulanan') intervalMs = 30 * 24 * 60 * 60 * 1000;

    if (!force && now - lastBackup < intervalMs) {
      return; // Belum waktunya backup
    }

    console.log('[Auto Backup] Menjalankan backup...');
    const dataDir = path.join(__dirname, '..', 'data');
    const dbPath = path.join(dataDir, 'jepunkas.sqlite');
    const tempBackupPath = path.join(dataDir, 'backup-temp.sqlite');

    // Buat database backup secara online (better-sqlite3 safe)
    await db.backup(tempBackupPath);

    if (gdriveEnabled && credsStr) {
      const credentials = JSON.parse(credsStr);
      await uploadToGDrive(tempBackupPath, credentials, folderId);
      console.log('[Auto Backup] Upload ke Google Drive Sukses!');
    }

    // Hapus file backup lokal temporary
    if (fs.existsSync(tempBackupPath)) {
      fs.unlinkSync(tempBackupPath);
    }

    // Simpan timestamp backup terakhir
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run('last_backup_time', now.toString());

    console.log('[Auto Backup] Selesai.');
  } catch (error) {
    console.error('[Auto Backup Error]', error.message);
  }
}

// Inisialisasi scheduler (setiap 1 jam)
let autoBackupIntervalId = null;
export function startBackupScheduler() {
  if (autoBackupIntervalId) clearInterval(autoBackupIntervalId);
  // Jalankan auto-backup scheduler setiap jam
  autoBackupIntervalId = setInterval(() => {
    runAutoBackup(false);
  }, 60 * 60 * 1000);
  
  // Trigger backup pertama kali saat server start
  setTimeout(() => {
    runAutoBackup(false);
  }, 5000);
}
