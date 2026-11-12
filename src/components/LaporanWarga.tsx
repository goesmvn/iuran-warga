import { useRef, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Printer, Share2, Wallet, PiggyBank } from "lucide-react";
import { safeFileName, shareElementAsImage } from "../utils/shareImage";
import { isNativeApp } from "../utils/apiFetch";

export interface LaporanWargaProps {
  year: number;
  namaOrganisasi: string;
  namaDesa?: string;
  namaBendahara?: string;
  saldoAwal: number;
  pemasukan: { name: string; amount: number }[];
  pengeluaran: { name: string; amount: number }[];
  bulanan: { namabulan: string; masuk: number; keluar: number; saldoAkhir: number }[];
  kepatuhan: { persen: number; kkLunas: number; kkAktif: number; bulanJatuhTempo: number };
}

const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

function Bars({ rows, tone }: { rows: { name: string; amount: number }[]; tone: "green" | "red" }) {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const sorted = rows.filter(r => r.amount > 0).sort((a, b) => b.amount - a.amount);
  if (sorted.length === 0) return <p className="text-sm text-gray-500">Tidak ada.</p>;
  return (
    <ul className="space-y-3">
      {sorted.map(r => {
        const pct = total > 0 ? (r.amount / total) * 100 : 0;
        return (
          <li key={r.name}>
            <div className="flex justify-between gap-3 text-sm">
              <span className="font-medium text-gray-800">{r.name}</span>
              <span className="font-bold text-gray-900 whitespace-nowrap">{rupiah(r.amount)}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full rounded-full ${tone === "green" ? "bg-green-500" : "bg-red-400"}`} style={{ width: `${Math.max(pct, 1)}%` }} />
              </div>
              <span className="text-xs text-gray-500 w-10 text-right">{pct < 1 ? "<1" : Math.round(pct)}%</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Laporan tahunan dalam bahasa sehari-hari untuk dibagikan ke warga.
 * Semua angka berasal dari perhitungan Laporan yang sama (sudah dicocokkan dengan database).
 */
export function LaporanWarga(props: LaporanWargaProps) {
  const { year, namaOrganisasi, namaDesa, namaBendahara, saldoAwal, pemasukan, pengeluaran, bulanan, kepatuhan } = props;
  const ref = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalMasuk = pemasukan.reduce((s, r) => s + r.amount, 0);
  const totalKeluar = pengeluaran.reduce((s, r) => s + r.amount, 0);
  const saldoAkhir = saldoAwal + totalMasuk - totalKeluar;
  const selisih = saldoAkhir - saldoAwal;

  const share = async () => {
    if (!ref.current) return;
    setSharing(true);
    setError(null);
    try {
      await shareElementAsImage(ref.current, safeFileName("Laporan-Kas", namaOrganisasi, String(year)), `Laporan keuangan ${namaOrganisasi} tahun ${year}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membagikan laporan.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <section className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 print:hidden">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">Laporan untuk Warga</h3>
          <p className="text-sm text-gray-500">Ringkasan sederhana, siap dibagikan ke grup warga.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={share} disabled={sharing} className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 flex items-center gap-2">
            <Share2 className="w-4 h-4" /> {sharing ? "Menyiapkan..." : "Bagikan"}
          </button>
          {!isNativeApp && (
            <button type="button" onClick={() => window.print()} className="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 flex items-center gap-2">
              <Printer className="w-4 h-4" /> Cetak
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      <div ref={ref} className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-8 max-w-3xl mx-auto text-gray-900">
        <header className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Laporan Keuangan Tahun {year}</p>
          <h2 className="text-xl sm:text-2xl font-bold mt-1">{namaOrganisasi}</h2>
          {namaDesa && <p className="text-sm text-gray-500">{namaDesa}</p>}
          <p className="text-sm text-gray-600 mt-3">1 Januari – 31 Desember {year}</p>
        </header>

        {/* Empat angka utama */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5"><Wallet className="w-4 h-4" /> Uang kas awal tahun</p>
            <p className="text-base min-[400px]:text-lg sm:text-xl font-bold whitespace-nowrap mt-1">{rupiah(saldoAwal)}</p>
          </div>
          <div className="rounded-xl bg-green-50 p-4">
            <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5"><ArrowDownCircle className="w-4 h-4" /> Uang masuk</p>
            <p className="text-base min-[400px]:text-lg sm:text-xl font-bold whitespace-nowrap text-green-700 mt-1">+ {rupiah(totalMasuk)}</p>
          </div>
          <div className="rounded-xl bg-red-50 p-4">
            <p className="text-xs font-semibold text-red-600 flex items-center gap-1.5"><ArrowUpCircle className="w-4 h-4" /> Uang keluar</p>
            <p className="text-base min-[400px]:text-lg sm:text-xl font-bold whitespace-nowrap text-red-600 mt-1">− {rupiah(totalKeluar)}</p>
          </div>
          <div className="rounded-xl bg-brand-600 text-white p-4">
            <p className="text-xs font-semibold text-brand-100 flex items-center gap-1.5"><PiggyBank className="w-4 h-4" /> Sisa uang kas akhir tahun</p>
            <p className="text-base min-[400px]:text-lg sm:text-xl font-bold whitespace-nowrap mt-1">{rupiah(saldoAkhir)}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-center text-gray-700">
          {selisih >= 0
            ? <>Selama {year}, uang kas <b className="text-green-700">bertambah {rupiah(selisih)}</b>.</>
            : <>Selama {year}, uang kas <b className="text-red-600">berkurang {rupiah(-selisih)}</b> karena pengeluaran lebih besar dari pemasukan.</>}
        </p>

        {/* Rincian */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h4 className="font-bold mb-3">Dari mana uang masuk?</h4>
            <Bars rows={pemasukan} tone="green" />
          </div>
          <div>
            <h4 className="font-bold mb-3">Untuk apa uang dipakai?</h4>
            <Bars rows={pengeluaran} tone="red" />
          </div>
        </div>

        {/* Kepatuhan iuran */}
        <div className="mt-8 rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap justify-between items-end gap-2">
            <div>
              <h4 className="font-bold">Kepatuhan bayar iuran</h4>
              <p className="text-sm text-gray-600 mt-0.5">
                {kepatuhan.kkLunas} dari {kepatuhan.kkAktif} KK sudah lunas {kepatuhan.bulanJatuhTempo === 12 ? "12 bulan" : `${kepatuhan.bulanJatuhTempo} bulan berjalan`}
              </p>
            </div>
            <span className="text-2xl font-bold text-brand-600">{kepatuhan.persen}%</span>
          </div>
          <div className="mt-2 h-3 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600" style={{ width: `${kepatuhan.persen}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">Persentase bulan iuran yang sudah dibayar dari seluruh bulan yang jatuh tempo.</p>
        </div>

        {/* Per bulan */}
        <div className="mt-8">
          <h4 className="font-bold mb-3">Uang kas per bulan</h4>
          <ul className="divide-y divide-gray-100 border-y border-gray-100">
            {bulanan.map(b => (
              <li key={b.namabulan} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{b.namabulan}</p>
                  {(b.masuk > 0 || b.keluar > 0) && (
                    <p className="text-xs mt-0.5">
                      {b.masuk > 0 && <span className="text-green-700">+{rupiah(b.masuk)}</span>}
                      {b.masuk > 0 && b.keluar > 0 && <span className="text-gray-400"> · </span>}
                      {b.keluar > 0 && <span className="text-red-600">−{rupiah(b.keluar)}</span>}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">Sisa kas</p>
                  <p className="font-bold text-sm">{rupiah(b.saldoAkhir)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <footer className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500 space-y-1">
          <p>Catatan: pemindahan uang antar tempat penyimpanan (mis. dari kas tunai ke bank) tidak dihitung sebagai uang masuk/keluar. Tagihan online yang belum dibayar juga tidak dihitung.</p>
          <p>Disusun oleh Bendahara{namaBendahara ? ` ${namaBendahara}` : ""} · {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
        </footer>
      </div>
    </section>
  );
}
