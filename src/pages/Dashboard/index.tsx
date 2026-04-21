import { useMemo } from "react";
import { useTransaksi } from "../../hooks/useTransaksi";
import { useWarga } from "../../hooks/useWarga";
import { useKasLocation, DEFAULT_KAS_LOCATION_ID } from "../../hooks/useKasLocation";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  Landmark
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { transactions } = useTransaksi();
  const { warga } = useWarga();
  const { locations } = useKasLocation();

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // --- Summary Metrics (memoized for performance) ---
  const { currentBalance } = useMemo(() => {
    const totalIn = transactions
      .filter((t) => t.type === "Pemasukan")
      .reduce((sum, t) => sum + t.nominal, 0);
    const totalOut = transactions
      .filter((t) => t.type === "Pengeluaran")
      .reduce((sum, t) => sum + t.nominal, 0);
    return { totalIn, totalOut, currentBalance: totalIn - totalOut };
  }, [transactions]);

  const locationBalances = useMemo(() => {
    return locations.map(loc => {
      const locIn = transactions
        .filter(t => t.type === 'Pemasukan' && (t.kasLocationId === loc.id || (!t.kasLocationId && loc.id === DEFAULT_KAS_LOCATION_ID)))
        .reduce((sum, t) => sum + t.nominal, 0);
      const locOut = transactions
        .filter(t => t.type === 'Pengeluaran' && (t.kasLocationId === loc.id || (!t.kasLocationId && loc.id === DEFAULT_KAS_LOCATION_ID)))
        .reduce((sum, t) => sum + t.nominal, 0);
      return { ...loc, balance: locIn - locOut };
    });
  }, [locations, transactions]);

  const { thisMonthIn, thisMonthOut } = useMemo(() => {
    const thisMonthIn = transactions
      .filter(
        (t) =>
          t.type === "Pemasukan" &&
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
        .filter(t => t.type === "Pemasukan" && t.categoryId !== "cat-saldo-awal" && t.categoryId !== "cat-transfer" && new Date(t.date).getMonth() + 1 === month && new Date(t.date).getFullYear() === currentYear)
        .reduce((sum, t) => sum + t.nominal, 0);
      const outThisMonth = transactions
        .filter(t => t.type === "Pengeluaran" && t.categoryId !== "cat-transfer" && new Date(t.date).getMonth() + 1 === month && new Date(t.date).getFullYear() === currentYear)
        .reduce((sum, t) => sum + t.nominal, 0);
      return { month, in: inThisMonth, out: outThisMonth };
    });
  }, [transactions, currentYear]);

  const maxAmount = Math.max(...monthlyData.flatMap(d => [d.in, d.out]), 1);

  // Tunggakan: Warga aktif yang belum bayar bulan ini
  const { paidThisMonthIds, arrearsCount } = useMemo(() => {
    const paidThisMonthIds = new Set(
      transactions
        .filter(
          (t) =>
            t.type === "Pemasukan" &&
            t.categoryId !== "cat-saldo-awal" &&
            t.periodeBulan === currentMonth &&
            t.periodeTahun === currentYear,
        )
        .map((t) => t.residentId),
    );
    const arrearsCount = warga.filter(
      (w) => w.status === "Aktif" && !paidThisMonthIds.has(w.id),
    ).length;
    return { paidThisMonthIds, arrearsCount };
  }, [transactions, warga, currentMonth, currentYear]);

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Dashboard Kas RT/RW
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Ringkasan kondisi keuangan lingkungan saat ini.
          </p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-2">
          <span className="text-sm text-gray-500 font-medium">Periode:</span>
          <span className="font-semibold text-brand-700">
            {new Date().toLocaleDateString("id-ID", {
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Main Balance Card */}
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl shadow-lg border border-brand-500 p-6 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-brand-500 rounded-full blur-2xl opacity-50"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-brand-100 text-sm font-medium mb-1">
                Saldo Kas Saat Ini
              </p>
              <h3 className="text-3xl font-bold font-display tracking-tight">
                Rp {currentBalance.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-3 bg-brand-500/30 rounded-xl backdrop-blur-sm">
              <Wallet className="w-6 h-6 text-brand-50" />
            </div>
          </div>
          <p className="text-brand-200 text-xs mt-4 relative z-10 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400"></span>{" "}
            Transparan & Terpercaya
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">
                Pemasukan Bulan Ini
              </p>
              <h3 className="text-2xl font-bold text-gray-900">
                Rp {thisMonthIn.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">
                Pengeluaran Bulan Ini
              </p>
              <h3 className="text-2xl font-bold text-gray-900">
                Rp {thisMonthOut.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-3 bg-red-50 rounded-xl">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-orange-200 p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-orange-800 text-sm font-medium mb-1">
                Total Warga Menunggak
              </p>
              <h3 className="text-3xl font-bold text-orange-600">
                {arrearsCount}{" "}
                <span className="text-lg font-medium text-orange-400">KK</span>
              </h3>
            </div>
            <div className="p-3 bg-orange-50 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
            </div>
          </div>
          <Link
            to="/laporan"
            className="text-orange-600 text-xs font-semibold mt-4 flex items-center gap-1 hover:text-orange-700 relative z-10"
          >
            Lihat Daftar Tunggakan &rarr;
          </Link>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-orange-300 to-orange-500"></div>
        </div>
      </div>

      <h3 className="font-bold text-gray-800 flex items-center gap-2 pt-2">
        <Landmark className="w-5 h-5 text-brand-600" /> Pos Penyimpanan Kas
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {locationBalances.map(loc => (
          <div key={loc.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
             <div className={`p-4 rounded-xl flex-shrink-0 ${loc.type === 'Tunai' ? 'bg-green-50 text-green-600' : loc.type === 'Bank' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                {loc.type === 'Tunai' ? <Wallet className="w-6 h-6"/> : <Landmark className="w-6 h-6"/>}
             </div>
             <div className="min-w-0">
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">{loc.type}</p>
                <h4 className="font-bold text-gray-900 text-sm md:text-base truncate">{loc.name}</h4>
                <p className={`font-bold text-base md:text-lg leading-none mt-1 ${loc.balance < 0 ? 'text-red-500' : 'text-green-600'}`}>Rp {loc.balance.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[300px] flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 bg-endek-pattern opacity-10 pointer-events-none"></div>
          <div className="flex justify-between items-center mb-6 relative z-10">
            <h3 className="font-bold text-gray-800">Grafik Keuangan {currentYear}</h3>
            <div className="flex gap-4 text-sm font-medium">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-sm"></div>Pemasukan</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-400 rounded-sm"></div>Pengeluaran</div>
            </div>
          </div>
          <div className="flex-1 flex items-end gap-2 sm:gap-4 relative z-10 min-h-[200px] pt-4 border-b border-gray-100 pb-2">
            {monthlyData.map((d, i) => (
              <div key={i} className="flex-1 flex justify-center gap-1 h-full group relative">
                {/* Pemasukan Bar */}
                <div className="w-1/2 max-w-[12px] bg-green-500 rounded-t-md hover:opacity-80 transition-all self-end" style={{ height: `${(d.in / maxAmount) * 100}%`, minHeight: d.in > 0 ? '4px' : '0' }}></div>
                {/* Pengeluaran Bar */}
                <div className="w-1/2 max-w-[12px] bg-red-400 rounded-t-md hover:opacity-80 transition-all self-end" style={{ height: `${(d.out / maxAmount) * 100}%`, minHeight: d.out > 0 ? '4px' : '0' }}></div>
                
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity flex flex-col items-center z-20 whitespace-nowrap">
                  <span className="font-bold mb-1">{new Date(2000, d.month - 1).toLocaleString("id-ID", { month: "short" })}</span>
                  <span className="text-green-300">+Rp {d.in.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-red-300">-Rp {d.out.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                
                {/* X-axis label */}
                <div className="absolute top-full mt-2 text-xs text-gray-400 font-medium">{new Date(2000, d.month - 1).toLocaleString("id-ID", { month: "short" })}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gray-400" />
            <h3 className="font-bold text-gray-800">Statistik Lingkungan</h3>
          </div>
          <ul className="space-y-4">
            <li className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
              <span className="text-sm font-medium text-gray-600">
                Total KK Aktif
              </span>
              <span className="font-bold text-gray-900 border-b-2 border-brand-500">
                {warga.filter((w) => w.status === "Aktif").length}
              </span>
            </li>
            <li className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
              <span className="text-sm font-medium text-gray-600">
                Total KK Pindah
              </span>
              <span className="font-bold text-gray-900">
                {warga.filter((w) => w.status === "Pindah").length}
              </span>
            </li>
            <li className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
              <span className="text-sm font-medium text-gray-600">
                Riwayat Transaksi Masuk (Bulan Ini)
              </span>
              <span className="font-bold text-green-600">
                {transactions.filter(t => t.type === 'Pemasukan' && t.categoryId !== 'cat-saldo-awal' && new Date(t.date).getMonth() + 1 === currentMonth && new Date(t.date).getFullYear() === currentYear).length}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
