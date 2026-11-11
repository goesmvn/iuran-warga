import db from './db.js';

// Hitung bulan iuran yang belum dibayar seorang warga, dari Januari start_year s/d bulan berjalan.
// Logika sama dengan halaman Pembayaran: kategori bulanan menandai 1 bulan, kategori tahunan menandai 12 bulan.
// Transaksi Pending/Failed tidak dihitung sebagai lunas.
export function getUnpaidMonths(residentId, startYear) {
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

// Normalisasi nomor HP Indonesia ke format 62xxxxxxxxxx (hanya angka)
export function normalizePhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  else if (digits.startsWith('8')) digits = '62' + digits;
  return digits;
}
