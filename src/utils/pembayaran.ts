import type { Category, Transaction } from '../types';
import { isBulananCategory, isSettledIncome, isTahunanCategory } from './iuran';

// =====================================================================
// Rencana pembayaran (halaman Terima Pembayaran) sebagai fungsi murni:
// ringkasan, total, transaksi yang disimpan, dan kwitansi berasal dari SATU perhitungan ini,
// sehingga total yang tampil selalu sama dengan yang tersimpan.
// =====================================================================

export type MonthRef = { bulan: number; tahun: number };

export interface PaidState {
  /** kategori bulanan -> "tahun-bulan" yang sudah lunas untuk kategori itu */
  byCategory: Map<string, Set<string>>;
  /** "tahun-bulan" yang tercakup iuran tahunan */
  tahunan: Set<string>;
  /** "tahun-bulan" yang lunas oleh iuran pokok apa pun */
  any: Set<string>;
}

/** Status lunas seorang warga (hanya transaksi Pemasukan berstatus Success). */
export function buildPaidState(transactions: Transaction[], categories: Category[], residentId: string): PaidState {
  const bulanan = new Set(categories.filter(isBulananCategory).map(c => c.id));
  const tahunanIds = new Set(categories.filter(isTahunanCategory).map(c => c.id));
  const state: PaidState = { byCategory: new Map(), tahunan: new Set(), any: new Set() };
  if (!residentId) return state;

  for (const t of transactions) {
    if (t.residentId !== residentId || !t.periodeTahun || !isSettledIncome(t)) continue;
    if (t.periodeBulan && bulanan.has(t.categoryId)) {
      const key = `${t.periodeTahun}-${t.periodeBulan}`;
      if (!state.byCategory.has(t.categoryId)) state.byCategory.set(t.categoryId, new Set());
      state.byCategory.get(t.categoryId)!.add(key);
      state.any.add(key);
    }
    if (tahunanIds.has(t.categoryId)) {
      for (let m = 1; m <= 12; m++) {
        state.tahunan.add(`${t.periodeTahun}-${m}`);
        state.any.add(`${t.periodeTahun}-${m}`);
      }
    }
  }
  return state;
}

export const isPaidFor = (paid: PaidState, cid: string, key: string) =>
  paid.tahunan.has(key) || !!paid.byCategory.get(cid)?.has(key);

export type PlanKind = 'tahunan' | 'bulanan' | 'lainnya';

export interface PlanItem {
  id: string;
  kind: PlanKind;
  name: string;
  nominal: number;      // nominal per bulan (bulanan) / per transaksi (lainnya, tahunan)
  months: MonthRef[];   // bulan yang ditagih (bulanan)
  year?: number;        // tahun yang dilunasi (tahunan)
  subTotal: number;
}

export interface PlannedTransaction {
  categoryId: string;
  nominal: number;
  description: string;
  periodeBulan?: number;
  periodeTahun?: number;
}

export interface PaymentPlan {
  items: PlanItem[];
  grandTotal: number;
  transactions: PlannedTransaction[];
  /** Pesan kesalahan; jika tidak kosong, pembayaran tidak boleh disimpan. */
  errors: string[];
}

export interface PlanInput {
  categories: Category[];
  /** kategori terpilih -> nominal yang diisi */
  selected: Record<string, number>;
  monthsByCat: Record<string, MonthRef[]>;
  yearByCat: Record<string, number>;
  defaultYear: number;
  paid: PaidState;
}

const kindOf = (c?: Category): PlanKind =>
  isTahunanCategory(c) ? 'tahunan' : isBulananCategory(c) ? 'bulanan' : 'lainnya';

export function buildPaymentPlan({ categories, selected, monthsByCat, yearByCat, defaultYear, paid }: PlanInput): PaymentPlan {
  const ids = Object.keys(selected);
  const catOf = (id: string) => categories.find(c => c.id === id);
  const yearOf = (id: string) => yearByCat[id] ?? defaultYear;
  // Tahun yang sedang dilunasi lewat iuran tahunan di transaksi ini (bulan di tahun tsb sudah tercakup)
  const tahunanYears = new Set(ids.filter(id => kindOf(catOf(id)) === 'tahunan').map(yearOf));
  const errors: string[] = [];
  const items: PlanItem[] = [];
  const transactions: PlannedTransaction[] = [];

  for (const id of ids) {
    const cat = catOf(id);
    const kind = kindOf(cat);
    const name = cat?.name || 'Lainnya';
    // Nominal harus bilangan bulat >= 0 (input sudah dibersihkan, ini lapisan pengaman)
    const nominal = Math.max(0, Math.floor(Number(selected[id]) || 0));

    if (kind === 'tahunan') {
      const year = yearOf(id);
      if (Array.from({ length: 12 }, (_, i) => i + 1).some(m => paid.any.has(`${year}-${m}`))) {
        errors.push(`Beberapa bulan pada Tahun ${year} sudah memiliki transaksi pembayaran. Batalkan transaksi lama terlebih dahulu.`);
      }
      items.push({ id, kind, name, nominal, months: [], year, subTotal: nominal });
      if (nominal > 0) {
        transactions.push({ categoryId: id, nominal, periodeTahun: year, description: `Pembayaran ${name} Tahun ${year}` });
      }
    } else if (kind === 'bulanan') {
      // Hanya bulan yang belum lunas untuk kategori ini, tanpa duplikat, terurut
      const seen = new Set<string>();
      const months = (monthsByCat[id] || [])
        .filter(sm => sm.bulan >= 1 && sm.bulan <= 12)
        .filter(sm => {
          const key = `${sm.tahun}-${sm.bulan}`;
          if (seen.has(key) || isPaidFor(paid, id, key) || tahunanYears.has(sm.tahun)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => a.tahun - b.tahun || a.bulan - b.bulan);
      if (months.length === 0) errors.push(`Pilih minimal 1 bulan untuk: ${name}.`);
      items.push({ id, kind, name, nominal, months, subTotal: nominal * months.length });
      if (nominal > 0) {
        for (const sm of months) {
          transactions.push({ categoryId: id, nominal, periodeBulan: sm.bulan, periodeTahun: sm.tahun, description: `Pembayaran ${name} ${sm.bulan}/${sm.tahun}` });
        }
      }
    } else {
      items.push({ id, kind, name, nominal, months: [], subTotal: nominal });
      if (nominal > 0) transactions.push({ categoryId: id, nominal, description: `Pemasukan Kas (${name})` });
    }
  }

  const grandTotal = items.reduce((sum, item) => sum + item.subTotal, 0);
  if (ids.length === 0) errors.push('Pilih minimal 1 iuran / kontribusi.');
  else if (grandTotal <= 0) errors.push('Total pembayaran tidak valid.');
  return { items, grandTotal, transactions, errors };
}

const monthShort = (m: number) => new Date(2000, m - 1).toLocaleString('id-ID', { month: 'short' });

/** Judul baris untuk ringkasan & kwitansi. */
export function planItemTitle(item: PlanItem, withMonths = false) {
  if (item.kind === 'tahunan') return `${item.name} (Lunas Tahun ${item.year})`;
  if (item.kind === 'bulanan') {
    if (item.months.length === 0) return `${item.name} (Harap pilih bulan)`;
    const base = `${item.name} (${item.months.length} bulan)`;
    return withMonths ? `${base} [${item.months.map(sm => `${monthShort(sm.bulan)} ${sm.tahun}`).join(', ')}]` : base;
  }
  return item.name;
}
