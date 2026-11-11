import { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } from '@whiskeysockets/baileys';
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';
import db from '../db.js'; // Import SQLite DB

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
      // 1. Ekstrak nomor HP pengirim dari JID (Contoh: 628123456789@s.whatsapp.net -> 08123456789)
      let phoneNum = senderJid.split('@')[0];
      // Format ke '08xxx' supaya cocok dengan database warga yang umum diisi warga Indonesia
      if (phoneNum.startsWith('62')) {
        phoneNum = '0' + phoneNum.substring(2); 
      }
      
      // 2. Cari warga berdasarkan nomor HP
      // Kita pakai operator LIKE agar 0812... dan +62812... bisa match
      const warga = db.prepare("SELECT id, namaKepalaKeluarga, nomorRumah FROM warga WHERE phone LIKE ? AND status = 'Aktif'").get(`%${phoneNum.substring(1)}%`);
      
      if (!warga) {
        await sock.sendMessage(senderJid, { text: `Mohon maaf, nomor HP Anda tidak ditemukan dalam data warga aktif JepunKas.\n\nJika Anda warga lingkungan ini, silakan hubungi Pengurus untuk mendaftarkan nomor ini.` });
        return;
      }

      // 3. Cek Tagihan Pending dari iPaymu
      const pendingTx = db.prepare(`SELECT nominal, referenceId FROM transactions WHERE residentId = ? AND status = 'Pending'`).get(warga.id);
      
      if (pendingTx) {
        // Ada tunggakan aktif yang menggantung (sudah ter-broadcast sebelumnya)
        // Kita tidak buat link baru untuk mencegah spam API iPaymu, cukup suruh klik link lama atau bayar manual.
        // Jika Anda ingin membuat link baru, logic createPayment bisa ditempelkan disini. Tapi lebih rapi kasih peringatan saja.
        const tagihanMsg = `Halo Bapak/Ibu *${warga.namaKepalaKeluarga}* (${warga.nomorRumah}).\n\nCatatan sistem kami menunjukkan Anda memiliki tunggakan/tagihan Kas yang belum dibayar sebesar:\n*Rp ${pendingTx.nominal.toLocaleString('id-ID')}*\n\n_(Nominal ini sudah disesuaikan dengan biaya admin sistem)._\n\nSilakan cek pesan kami sebelumnya yang berisi Link Pembayaran Otomatis, atau gunakan perintah *REKENING* untuk transfer manual. 🙏\n\n_Ketik *0* untuk kembali ke Menu Utama._`;
        await sock.sendMessage(senderJid, { text: tagihanMsg });
      } else {
        // Cek secara kasar apakah bulan ini sudah bayar?
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        const paidThisMonth = db.prepare(`
          SELECT id FROM transactions 
          WHERE residentId = ? AND type = 'Pemasukan' AND categoryId = 'cat-1' 
          AND (status = 'Success' OR status IS NULL)
          AND periodeBulan = ? AND periodeTahun = ?
        `).get(warga.id, currentMonth, currentYear);

        if (paidThisMonth) {
           await sock.sendMessage(senderJid, { text: `Halo Bapak/Ibu *${warga.namaKepalaKeluarga}* (${warga.nomorRumah}).\n\nTerima kasih! Catatan kami menunjukkan Anda *TIDAK MEMILIKI TUNGGAKAN* dan iuran bulan ini sudah *LUNAS*. 🙏\n\n_Ketik *0* untuk kembali ke Menu Utama._` });
        } else {
           // Belum lunas bulan ini, tapi belum ada link Pending (Belum di broadcast admin)
           const nominal = Number(settings.nominal_iuran_bulanan) || 0;
           await sock.sendMessage(senderJid, { text: `Halo Bapak/Ibu *${warga.namaKepalaKeluarga}* (${warga.nomorRumah}).\n\nAnda tercatat *belum* membayar iuran untuk bulan ini.\nTagihan bulan ini: *Rp ${nominal.toLocaleString('id-ID')}*.\n\nKarena belum ada link pembayaran yang diterbitkan untuk Anda, mohon tunggu pesan Broadcast Tagihan dari Admin atau hubungi Pengurus untuk men-generate tagihan. 🙏\n\n_Ketik *0* untuk kembali ke Menu Utama._` });
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
