import { useMemo, useState } from "react";
import { useTransaksi } from "../../hooks/useTransaksi";
import { useWarga } from "../../hooks/useWarga";
import { useKasLocation, DEFAULT_KAS_LOCATION_ID } from "../../hooks/useKasLocation";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Landmark,
  MessageCircle,
  Receipt,
  Minus,
  ArrowRightLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useConfirm } from "../../contexts/ConfirmContext";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../utils/apiFetch";
import { buildPaidMonthIndex, isBulananCategory, unpaidMonthsInYear } from "../../utils/iuran";
import { useCategory } from "../../hooks/useCategory";
import { useSettings } from "../../hooks/useSettings";

const rupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

export default function Dashboard() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { transactions } = useTransaksi();
  const { categories } = useCategory();
  const { warga } = useWarga();
  const { locations } = useKasLocation();

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // --- Summary Metrics (memoized for performance) ---
  const { currentBalance } = useMemo(() => {
    const totalIn = transactions
      .filter((t) => t.type === "Pemasukan" && (!t.status || t.status === "Success"))
      .reduce((sum, t) => sum + t.nominal, 0);
    const totalOut = transactions
      .filter((t) => t.type === "Pengeluaran" && (!t.status || t.status === "Success"))
      .reduce((sum, t) => sum + t.nominal, 0);
    return { totalIn, totalOut, currentBalance: totalIn - totalOut };
  }, [transactions]);

  const locationBalances = useMemo(() => {
    return locations.map(loc => {
      const locIn = transactions
        .filter(t => t.type === 'Pemasukan' && (!t.status || t.status === "Success") && (t.kasLocationId === loc.id || (!t.kasLocationId && loc.id === DEFAULT_KAS_LOCATION_ID)))
        .reduce((sum, t) => sum + t.nominal, 0);
      const locOut = transactions
        .filter(t => t.type === 'Pengeluaran' && (!t.status || t.status === "Success") && (t.kasLocationId === loc.id || (!t.kasLocationId && loc.id === DEFAULT_KAS_LOCATION_ID)))
        .reduce((sum, t) => sum + t.nominal, 0);
      return { ...loc, balance: locIn - locOut };
    });
  }, [locations, transactions]);

  const { thisMonthIn, thisMonthOut } = useMemo(() => {
    const thisMonthIn = transactions
      .filter(
        (t) =>
          t.type === "Pemasukan" &&
          (!t.status || t.status === "Success") &&
          t.categoryId !== "cat-saldo-awal" &&
          t.categoryId !== "cat-transfer" &&
          new Date(t.date).getMonth() + 1 === currentMonth &&
          new Date(t.date).getFullYear() === currentYear,
      )
      .reduce((sum, t) => sum + t.nominal, 0);
    const thisMonthOut = transactions
      .filter(
        (t) =>
          t.type === "Pengeluaran" &&
          (!t.status || t.status === "Success") &&
          t.categoryId !== "cat-transfer" &&
          new Date(t.date).getMonth() + 1 === currentMonth &&
          new Date(t.date).getFullYear() === currentYear,
      )
      .reduce((sum, t) => sum + t.nominal, 0);
    return { thisMonthIn, thisMonthOut };
  }, [transactions, currentMonth, currentYear]);

  const monthlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const inThisMonth = transactions
        .filter(t => t.type === "Pemasukan" && (!t.status || t.status === "Success") && t.categoryId !== "cat-saldo-awal" && t.categoryId !== "cat-transfer" && new Date(t.date).getMonth() + 1 === month && new Date(t.date).getFullYear() === currentYear)
        .reduce((sum, t) => sum + t.nominal, 0);
      const outThisMonth = transactions
        .filter(t => t.type === "Pengeluaran" && (!t.status || t.status === "Success") && t.categoryId !== "cat-transfer" && new Date(t.date).getMonth() + 1 === month && new Date(t.date).getFullYear() === currentYear)
        .reduce((sum, t) => sum + t.nominal, 0);
      return { month, in: inThisMonth, out: outThisMonth };
    });
  }, [transactions, currentYear]);

  const maxAmount = Math.max(...monthlyData.flatMap(d => [d.in, d.out]), 1);

  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const { alert: customAlert, confirm } = useConfirm();

  const handleBroadcast = async () => {
    const isConfirmed = await confirm(
      'Broadcast Tagihan',
      `Fitur ini akan mengirimkan pesan WhatsApp ke *${arrearsCount} warga* yang memiliki tunggakan. Bot secara otomatis menghitung tunggakan dan menyisipkan link pembayaran. Lanjutkan?`,
      'info'
    );
    if (!isConfirmed) return;

    setIsBroadcasting(true);
    try {
      const settingsRes = await apiFetch('/api/settings');
      const settings = await settingsRes.json();
      
      const res = await apiFetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: settings['wa_template_tunggakan'] || '' })
      });
      const data = await res.json();
      if (res.ok) {
        await customAlert('Broadcast Selesai', `Berhasil mengirim ke ${data.successCount} warga. Gagal: ${data.failCount}`, 'success');
      } else {
        await customAlert('Broadcast Gagal', data.error || 'Terjadi kesalahan.', 'error');
      }
    } catch (e) {
      await customAlert('Error', 'Gagal menghubungi server.', 'error');
    } finally {
      setIsBroadcasting(false);
    }
  };
  // Tunggakan: Warga aktif yang belum lunas bulan ini (rapelan tahunan dihitung lunas)
  const startYear = parseInt(settings['start_year'] || String(currentYear), 10);
  const iuranPerBulan = useMemo(
    () => categories.filter(c => c.type === "Pemasukan" && isBulananCategory(c)).reduce((sum, c) => sum + (c.defaultNominal || 0), 0),
    [categories],
  );

  const { arrearsCount, activeCount, topArrears } = useMemo(() => {
    const paidIndex = buildPaidMonthIndex(transactions, categories);
    const active = warga.filter((w) => w.status === "Aktif");
    const arrearsCount = active.filter((w) => !paidIndex.get(w.id)?.has(`${currentYear}-${currentMonth}`)).length;
    // Warga dengan bulan tertunggak terbanyak (aturan sama dengan Laporan & broadcast WA)
    const topArrears = active
      .map((w) => {
        let months = 0;
        for (let y = startYear; y <= currentYear; y++) months += unpaidMonthsInYear(paidIndex.get(w.id), y).length;
        return { ...w, months };
      })
      .filter((w) => w.months > 0)
      .sort((a, b) => b.months - a.months || a.namaKepalaKeluarga.localeCompare(b.namaKepalaKeluarga))
      .slice(0, 5);
    return { arrearsCount, activeCount: active.length, topArrears };
  }, [transactions, categories, warga, currentMonth, currentYear, startYear]);

  const paidCount = activeCount - arrearsCount;
  const paidPercent = activeCount > 0 ? Math.round((paidCount / activeCount) * 100) : 0;
  const monthName = new Date().toLocaleDateString("id-ID", { month: "long" });

  const recentTransactions = useMemo(
    () => transactions
      .filter((t) => (!t.status || t.status === "Success") && t.categoryId !== "cat-transfer")
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
      .slice(0, 5),
    [transactions],
  );
  // Transfer yang hanya tercatat sisi keluar membuat saldo tidak cocok dengan Laporan
  const brokenTransferCount = useMemo(() => {
    const legs = new Map<string, number>();
    const outOnly = new Set<string>();
    for (const t of transactions) {
      if (t.categoryId !== "cat-transfer" || !t.transferId || (t.status && t.status !== "Success")) continue;
      legs.set(t.transferId, (legs.get(t.transferId) || 0) + 1);
      if (t.type === "Pengeluaran") outOnly.add(t.transferId);
    }
    return [...outOnly].filter(id => legs.get(id) === 1).length;
  }, [transactions]);

  const wargaName = (id?: string) => warga.find((w) => w.id === id)?.namaKepalaKeluarga;
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name || "Lainnya";

  const hour = new Date().getHours();
  const greeting = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 19 ? "Selamat sore" : "Selamat malam";

  return (
    <div className="animate-in fade-in duration-500 space-y-5 lg:space-y-6">
      {/* Sapaan */}
      <div className="flex flex-wrap justify-between items-end gap-2">
        <div>
          <p className="text-sm text-gray-500">{greeting},</p>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{user?.name || "Pengurus"}</h2>
        </div>
        <span className="text-sm font-semibold text-brand-700 bg-brand-50 px-3 py-1.5 rounded-full">
          {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>

      {brokenTransferCount > 0 && (
        <Link to="/transfer" className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-bold">{brokenTransferCount} transfer antar kas belum lengkap</span>
          <span className="hidden sm:inline text-amber-800">— saldo kas tujuan terlalu kecil.</span>
          <span className="ml-auto font-bold whitespace-nowrap">Periksa →</span>
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
        {/* Saldo kas + pos penyimpanan */}
        {/* Dekorasi pakai gradien biasa (bukan blur): filter blur di kartu ber-overflow-hidden bisa glitch di WebView Android */}
        <section className="lg:col-span-2 bg-[radial-gradient(circle_at_top_right,var(--color-brand-500),transparent_45%),linear-gradient(to_bottom_right,var(--color-brand-600),var(--color-brand-800))] rounded-2xl shadow-lg p-5 sm:p-6 text-white">
          <div>
            <p className="text-brand-100 text-sm font-medium flex items-center gap-2"><Wallet className="w-4 h-4" /> Saldo Kas Saat Ini</p>
            <h3 className="text-3xl sm:text-4xl font-bold font-display tracking-tight mt-1">{rupiah(currentBalance)}</h3>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {locationBalances.map((loc) => (
                <div key={loc.id} className="bg-white/10 rounded-xl px-3 py-2.5 flex sm:block items-center justify-between gap-2">
                  <p className="text-brand-100 text-xs font-medium truncate flex items-center gap-1.5">
                    {loc.type === "Tunai" ? <Wallet className="w-3.5 h-3.5" /> : <Landmark className="w-3.5 h-3.5" />} {loc.name}
                  </p>
                  <p className={`font-bold text-sm sm:text-base ${loc.balance < 0 ? "text-red-200" : "text-white"}`}>{rupiah(loc.balance)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Aksi cepat */}
        <section className="grid grid-cols-3 lg:grid-cols-1 gap-3">
          {[
            { to: "/pembayaran", icon: Receipt, label: "Terima Pembayaran", tone: "bg-brand-50 text-brand-700" },
            { to: "/pengeluaran", icon: Minus, label: "Catat Pengeluaran", tone: "bg-red-50 text-red-600" },
            { to: "/transfer", icon: ArrowRightLeft, label: "Transfer Kas", tone: "bg-amber-50 text-amber-700" },
          ].map(({ to, icon: Icon, label, tone }) => (
            <Link key={to} to={to} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 lg:p-4 flex flex-col lg:flex-row items-center gap-2 lg:gap-3 text-center lg:text-left active:scale-[0.98] hover:border-brand-200 transition">
              <span className={`p-2.5 rounded-xl ${tone}`}><Icon className="w-5 h-5" /></span>
              <span className="text-xs lg:text-sm font-bold text-gray-800 leading-tight">{label}</span>
              <ChevronRight className="hidden lg:block w-4 h-4 text-gray-300 ml-auto" />
            </Link>
          ))}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
        {/* Progres iuran bulan ini */}
        <section className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-gray-900">Iuran Bulan {monthName}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{paidCount} dari {activeCount} KK aktif sudah bayar</p>
            </div>
            <span className={`text-2xl font-bold ${paidPercent >= 80 ? "text-green-600" : paidPercent >= 50 ? "text-amber-600" : "text-brand-600"}`}>{paidPercent}%</span>
          </div>
          <div className="mt-3 h-3 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuenow={paidPercent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all" style={{ width: `${paidPercent}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-green-50 p-2.5">
              <p className="text-[11px] font-semibold text-green-700 flex items-center justify-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Masuk</p>
              <p className="font-bold text-sm text-gray-900 mt-0.5">{rupiah(thisMonthIn)}</p>
            </div>
            <div className="rounded-xl bg-red-50 p-2.5">
              <p className="text-[11px] font-semibold text-red-600 flex items-center justify-center gap-1"><TrendingDown className="w-3.5 h-3.5" /> Keluar</p>
              <p className="font-bold text-sm text-gray-900 mt-0.5">{rupiah(thisMonthOut)}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-2.5">
              <p className="text-[11px] font-semibold text-gray-600">Selisih</p>
              <p className={`font-bold text-sm mt-0.5 ${thisMonthIn - thisMonthOut < 0 ? "text-red-600" : "text-gray-900"}`}>{rupiah(thisMonthIn - thisMonthOut)}</p>
            </div>
          </div>
          {arrearsCount > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Link to="/laporan" className="flex-1 text-center px-4 py-2.5 rounded-xl text-sm font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 transition">
                Lihat {arrearsCount} KK belum bayar
              </Link>
              <button
                onClick={handleBroadcast}
                disabled={isBroadcasting}
                className="flex-1 px-4 py-2.5 bg-[#25D366] hover:bg-[#128C7E] disabled:bg-gray-300 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                {isBroadcasting ? "Mengirim..." : "Kirim Tagihan WA"}
              </button>
            </div>
          )}
        </section>

        {/* Perlu ditagih */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <h3 className="font-bold text-gray-900">Tunggakan Terbanyak</h3>
          <p className="text-xs text-gray-500 mt-0.5">Ketuk nama untuk langsung terima pembayaran</p>
          {topArrears.length === 0 ? (
            <p className="mt-6 text-sm text-green-700 font-semibold flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Semua warga lunas.</p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100">
              {topArrears.map((w) => (
                <li key={w.id}>
                  <Link to={`/pembayaran?warga=${encodeURIComponent(w.id)}`} className="flex items-center gap-3 py-2.5 active:bg-gray-50 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-gray-900 truncate">{w.namaKepalaKeluarga}</p>
                      <p className="text-xs text-gray-500 truncate">{w.nomorRumah}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-brand-600">{w.months} bln</p>
                      {iuranPerBulan > 0 && <p className="text-[11px] text-gray-500">± {rupiah(w.months * iuranPerBulan)}</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
        {/* Grafik 12 bulan */}
        <section className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 flex flex-col">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
            <h3 className="font-bold text-gray-900">Arus Kas {currentYear}</h3>
            <div className="flex gap-4 text-xs font-medium text-gray-600">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-500 rounded-sm" />Pemasukan</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-400 rounded-sm" />Pengeluaran</div>
            </div>
          </div>
          <div className="flex-1 flex items-end gap-1.5 sm:gap-4 min-h-[180px] pt-4 border-b border-gray-100 pb-2">
            {monthlyData.map((d, i) => (
              <div key={i} className="flex-1 flex justify-center gap-0.5 sm:gap-1 h-full group relative">
                <div className="w-1/2 max-w-[12px] bg-green-500 rounded-t-md self-end" style={{ height: `${(d.in / maxAmount) * 100}%`, minHeight: d.in > 0 ? '4px' : '0' }} />
                <div className="w-1/2 max-w-[12px] bg-red-400 rounded-t-md self-end" style={{ height: `${(d.out / maxAmount) * 100}%`, minHeight: d.out > 0 ? '4px' : '0' }} />
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity flex flex-col items-center z-20 whitespace-nowrap">
                  <span className="font-bold mb-1">{new Date(2000, d.month - 1).toLocaleString("id-ID", { month: "short" })}</span>
                  <span className="text-green-300">+{rupiah(d.in)}</span>
                  <span className="text-red-300">-{rupiah(d.out)}</span>
                </div>
                <div className="absolute top-full mt-2 text-[10px] sm:text-xs text-gray-400 font-medium">{new Date(2000, d.month - 1).toLocaleString("id-ID", { month: "narrow" })}</div>
              </div>
            ))}
          </div>
          <div className="h-5" />
        </section>

        {/* Transaksi terakhir */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Transaksi Terakhir</h3>
            <Link to="/kas" className="text-xs font-bold text-brand-600">Lihat semua</Link>
          </div>
          {recentTransactions.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">Belum ada transaksi.</p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100">
              {recentTransactions.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <span className={`p-2 rounded-lg shrink-0 ${t.type === "Pemasukan" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                    {t.type === "Pemasukan" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{(t.type === "Pemasukan" && wargaName(t.residentId)) || t.description || categoryName(t.categoryId)}</p>
                    <p className="text-[11px] text-gray-500 truncate">{categoryName(t.categoryId)} · {new Date(t.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</p>
                  </div>
                  <p className={`text-sm font-bold shrink-0 ${t.type === "Pemasukan" ? "text-green-600" : "text-red-600"}`}>{t.type === "Pemasukan" ? "+" : "-"}{rupiah(t.nominal)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
