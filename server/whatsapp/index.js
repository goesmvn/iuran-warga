import { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } from '@whiskeysockets/baileys';
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';
import db from '../db.js'; // Import SQLite DB
import { getUnpaidMonths, normalizePhone } from '../iuran.js';

const authDir = path.join(process.cwd(), 'data', 'whatsapp-auth');

let sock = null;
let currentQR = null;
let connectionState = 'Belum Terhubung';

export async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.macOS('Desktop'),
    syncFullHistory: false
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = await qrcode.toDataURL(qr);
      connectionState = 'Menunggu Scan QR';
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 401; // 401 is unauthorized/logged out
      
      console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
      connectionState = 'Belum Terhubung';
      currentQR = null;
      
      if (shouldReconnect) {
        setTimeout(connectToWhatsApp, 3000); // Reconnect with a slight delay
      } else {
        // Logged out
        sock = null;
        if (fs.existsSync(authDir)) {
          fs.rmSync(authDir, { recursive: true, force: true });
        }
      }
    } else if (connection === 'open') {
      console.log('opened connection');
      connectionState = 'Terhubung';
      currentQR = null;
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // ------------------------------------------------------------------
  // 2-WAY COMMUNICATION HANDLER (BOT INTERAKTIF)
  // ------------------------------------------------------------------
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return; // Hanya tangani notifikasi pesan baru (bukan history sync)
    
    const m = messages[0];
    if (!m.message || m.key.fromMe) return; // Abaikan jika pesan dari bot sendiri
    
    // Ambil isi pesan teks
    const text = m.message.conversation || m.message.extendedTextMessage?.text;
    if (!text) return; // Abaikan gambar, stiker, audio tanpa caption
    
    const senderJid = m.key.remoteJid;
    if (senderJid.includes('@g.us')) return; // Abaikan pesan dari Grup WhatsApp

    const command = text.toLowerCase().trim();
    
    // Ambil data pengaturan dinamis dari DB
    const settingsRows = db.prepare('SELECT key, value FROM settings').all();
    const settings = settingsRows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
    
    // ============================================
    // MENU 1: Sapaan / Menu Utama
    // ============================================
    if (['p', 'ping', 'halo', 'halo bot', 'info', 'bantuan', 'menu', 'help', '0'].includes(command)) {
      const menuMsg = `Om Swastyastu / Halo Bapak/Ibu. 🙏\nIni adalah Bot Otomatis JepunKas.\n\nSilakan balas dengan perintah berikut:\n\n*1. INFO IURAN* - Lihat kebijakan iuran kas saat ini\n*2. CEK TAGIHAN* - Lihat sisa tunggakan Anda\n*3. PENGURUS* - Kontak pengurus lingkungan\n\n_Catatan: Bot tidak membalas pertanyaan di luar perintah di atas._`;
      await sock.sendMessage(senderJid, { text: menuMsg });
    }
    
    // ============================================
    // MENU 2: Info Iuran (Pengganti Rekening Manual)
    // ============================================
    else if (['1', 'info iuran', 'iuran', 'cara bayar'].includes(command)) {
      const nominal = Number(settings.nominal_iuran_bulanan) || 0;
      const infoMsg = `💡 *INFORMASI KAS WARGA*\n\nIuran wajib bulanan saat ini adalah: *Rp ${nominal.toLocaleString('id-ID')}*\n\n*Cara Pembayaran:*\nSeluruh pembayaran kas warga kini dilakukan secara **Online & Otomatis** melalui portal sistem.\n\nSilakan ketik *CEK TAGIHAN* atau tunggu pesan tagihan rutin dari kami yang berisi *Link Pembayaran* (Bisa via QRIS, Virtual Account, M-Banking, dan E-Wallet).\n\nPembayaran melalui sistem online akan otomatis tercatat *LUNAS* di buku kas RT tanpa perlu lapor bukti transfer. ✅\n\n_Ketik *0* untuk kembali ke Menu Utama._`;
      await sock.sendMessage(senderJid, { text: infoMsg });
    }
    
    // ============================================
    // MENU 3: Kontak Pengurus
    // ============================================
    else if (['3', 'pengurus', 'ketua', 'bendahara', 'admin', 'kopdar'].includes(command)) {
      const ketua = settings.nama_ketua || 'Ketua RT';
      const bendahara = settings.nama_bendahara || 'Bendahara';
      const kontakMsg = `📞 *KONTAK PENGURUS*\n\nKetua: *${ketua}*\nBendahara: *${bendahara}*\n\n_Jika ada pertanyaan terkait laporan kas atau ingin mengubah data rumah, silakan chat langsung ke nomor pengurus._\n\n_Ketik *0* untuk kembali ke Menu Utama._`;
      await sock.sendMessage(senderJid, { text: kontakMsg });
    }
    
    // ============================================
    // MENU 4: CEK TAGIHAN PERSONAL
    // ============================================
    else if (['2', 'cek tagihan', 'tagihan saya', 'tunggakan', 'berapa tagihan', 'cek'].includes(command)) {
      // 1. Nomor HP pengirim. WhatsApp kini bisa memakai LID (ID anonim, bukan nomor HP);
      //    nomor asli ada di remoteJidAlt. Jangan pernah mencocokkan LID ke nomor warga.
      const pnJid = senderJid.endsWith('@s.whatsapp.net') ? senderJid : (m.key.remoteJidAlt || m.key.senderPn || '');
      const senderPhone = pnJid.endsWith('@s.whatsapp.net') ? normalizePhone(pnJid.split('@')[0]) : null;

      // 2. Cari warga dengan nomor yang SAMA PERSIS (bukan LIKE/sebagian, agar data warga lain tidak bocor)
      const warga = senderPhone
        ? db.prepare("SELECT id, namaKepalaKeluarga, nomorRumah, phone FROM warga WHERE status = 'Aktif' AND phone IS NOT NULL AND phone != ''")
            .all()
            .find(w => normalizePhone(w.phone) === senderPhone)
        : undefined;

      if (!warga) {
        await sock.sendMessage(senderJid, { text: `Mohon maaf, nomor HP Anda tidak ditemukan dalam data warga aktif JepunKas.\n\nJika Anda warga lingkungan ini, silakan hubungi Pengurus untuk mendaftarkan nomor ini.` });
        return;
      }

      // 3. Cek Tagihan Pending dari iPaymu (satu tagihan bisa berisi beberapa bulan dengan referenceId sama)
      const pendingTx = db.prepare(`
        SELECT referenceId, SUM(nominal) AS total, COUNT(*) AS months FROM transactions
        WHERE residentId = ? AND status = 'Pending' GROUP BY referenceId ORDER BY MAX(createdAt) DESC
      `).get(warga.id);

      if (pendingTx) {
        // Tidak membuat link baru untuk mencegah spam API iPaymu; arahkan ke link yang sudah dikirim.
        const tagihanMsg = `Halo Bapak/Ibu *${warga.namaKepalaKeluarga}* (${warga.nomorRumah}).\n\nAnda memiliki tagihan Kas yang belum dibayar sebesar:\n*Rp ${pendingTx.total.toLocaleString('id-ID')}* (${pendingTx.months} bulan)\n\n_(Belum termasuk biaya aplikasi pembayaran online)._\n\nSilakan gunakan Link Pembayaran pada pesan tagihan kami sebelumnya, atau hubungi Pengurus untuk bayar tunai. 🙏\n\n_Ketik *0* untuk kembali ke Menu Utama._`;
        await sock.sendMessage(senderJid, { text: tagihanMsg });
      } else {
        // Hitung tunggakan lengkap (semua bulan jatuh tempo sejak start_year), sama dengan broadcast & aplikasi
        const startYear = parseInt(settings.start_year, 10) || new Date().getFullYear();
        const unpaid = getUnpaidMonths(warga.id, startYear);
        const nominal = Number(settings.nominal_iuran_bulanan) || 0;

        if (unpaid.length === 0) {
           await sock.sendMessage(senderJid, { text: `Halo Bapak/Ibu *${warga.namaKepalaKeluarga}* (${warga.nomorRumah}).\n\nTerima kasih! Catatan kami menunjukkan Anda *TIDAK MEMILIKI TUNGGAKAN* dan iuran sampai bulan ini sudah *LUNAS*. 🙏\n\n_Ketik *0* untuk kembali ke Menu Utama._` });
        } else {
           const bulan = unpaid.map(u => `${new Date(2000, u.month - 1).toLocaleString('id-ID', { month: 'short' })} ${u.year}`).join(', ');
           await sock.sendMessage(senderJid, { text: `Halo Bapak/Ibu *${warga.namaKepalaKeluarga}* (${warga.nomorRumah}).\n\nAnda tercatat belum membayar iuran *${unpaid.length} bulan*:\n${bulan}\n\nTotal: *Rp ${(nominal * unpaid.length).toLocaleString('id-ID')}*\n\nMohon tunggu pesan Tagihan dari Admin yang berisi link pembayaran, atau hubungi Pengurus untuk bayar tunai. 🙏\n\n_Ketik *0* untuk kembali ke Menu Utama._` });
        }
      }
    }
  });
}

export function getStatus() {
  return { status: connectionState, qr: currentQR };
}

export async function logout() {
  if (sock) {
    await sock.logout();
    sock = null;
    connectionState = 'Belum Terhubung';
    currentQR = null;
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
    }
  }
}

export async function sendMessage(jid, text) {
  if (sock && connectionState === 'Terhubung') {
    return await sock.sendMessage(jid, { text });
  }
  throw new Error('Bot not connected');
}
