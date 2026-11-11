import type { Category, Transaction } from '../types';

// =====================================================================
// Aturan hitung iuran pokok — satu sumber untuk Dashboard, Laporan, Pembayaran.
// Sama dengan logika server (getUnpaidMonths) dan Kartu Iuran:
// - Sebuah bulan LUNAS jika ada iuran kategori bulanan untuk bulan tsb, atau iuran tahunan untuk tahun tsb.
// - Hanya transaksi Pemasukan berstatus Success (tagihan iPaymu Pending/Failed belum dibayar).
// - Tunggakan hanya menghitung bulan yang sudah jatuh tempo (s/d bulan berjalan).
// =====================================================================

export const isBulananCategory = (c?: Pick<Category, 'name' | 'periode'>) =>
  !!c && (c.periode === 'Bulanan' || c.name.toLowerCase().includes('bulanan'));

export const isTahunanCategory = (c?: Pick<Category, 'name' | 'periode'>) =>
  !!c && (c.periode === 'Tahunan' || c.name.toLowerCase().includes('tahunan'));

export const isSettledIncome = (t: Transaction) =>
  t.type === 'Pemasukan' && (!t.status || t.status === 'Success');

/** residentId -> set "tahun-bulan" yang sudah lunas (iuran pokok). */
export function buildPaidMonthIndex(transactions: Transaction[], categories: Category[]) {
  const bulanan = new Set(categories.filter(isBulananCategory).map(c => c.id));
  const tahunan = new Set(categories.filter(isTahunanCategory).map(c => c.id));
  const index = new Map<string, Set<string>>();

  for (const t of transactions) {
    if (!t.residentId || !t.periodeTahun || !isSettledIncome(t)) continue;
    let paid = index.get(t.residentId);
    if (!paid) index.set(t.residentId, (paid = new Set()));
    if (t.periodeBulan && bulanan.has(t.categoryId)) paid.add(`${t.periodeTahun}-${t.periodeBulan}`);
    if (tahunan.has(t.categoryId)) for (let m = 1; m <= 12; m++) paid.add(`${t.periodeTahun}-${m}`);
  }
  return index;
}

/** Bulan yang belum lunas untuk satu tahun, s/d `uptoMonth` (default: 12, atau bulan berjalan untuk tahun ini). */
export function unpaidMonthsInYear(paid: Set<string> | undefined, year: number, uptoMonth?: number, now = new Date()) {
  const lastDue = uptoMonth ?? (year === now.getFullYear() ? now.getMonth() + 1 : year > now.getFullYear() ? 0 : 12);
  const result: number[] = [];
  for (let m = 1; m <= lastDue; m++) if (!paid?.has(`${year}-${m}`)) result.push(m);
  return result;
}
