import { useState, useMemo } from "react";
import { useTransaksi } from "../../hooks/useTransaksi";
import { useWarga } from "../../hooks/useWarga";
import { useCategory } from "../../hooks/useCategory";
import { useSettings } from "../../hooks/useSettings";
import { useKasLocation } from "../../hooks/useKasLocation";
import {
  Filter,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Printer,
  ArrowDownUp,
  Landmark
} from "lucide-react";
import Papa from "papaparse";

export default function Laporan() {
  const { transactions } = useTransaksi();
  const { warga } = useWarga();
  const { categories } = useCategory();
  const { settings } = useSettings();
  const { locations: kasLocations } = useKasLocation();
  
  const namaKetua = settings['nama_ketua'] || '.........................';
  const namaBendahara = settings['nama_bendahara'] || '.........................';
  const namaOrganisasi = settings['nama_organisasi'] || 'Suka Duka';
  const namaDesa = settings['nama_desa'] || '';
  const alamatOrg = settings['alamat'] || '';

  const [activeTab, setActiveTab] = useState<"Bulanan" | "Tunggakan" | "Rekapitulasi" | "Tahunan" | "ArusKas">("Tahunan");

  // Filter States
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterYearTahunan, setFilterYearTahunan] = useState(new Date().getFullYear());
  
  const yearOptions = Array.from({length: 7}, (_, i) => new Date().getFullYear() - 2 + i);

  // === LAPORAN BULANAN LOGIC ===
  const monthlyTransactions = useMemo(() => {
    return transactions.filter(
      (t) =>
        new Date(t.date).getMonth() + 1 === filterMonth &&
        new Date(t.date).getFullYear() === filterYear,
    );
  }, [transactions, filterMonth, filterYear]);

  const getSaldoAwalBulan = (month: number, year: number) => {
    const beforeDate = new Date(year, month - 1, 1);
    const earlierTxs = transactions.filter(t => new Date(t.date) < beforeDate);
    const earlierIn = earlierTxs.filter(t => t.type === 'Pemasukan').reduce((a, b) => a + b.nominal, 0);
    const earlierOut = earlierTxs.filter(t => t.type === 'Pengeluaran').reduce((a, b) => a + b.nominal, 0);
    
    const saldoAwalInMonth = transactions
        .filter(t => t.categoryId === 'cat-saldo-awal' && new Date(t.date).getMonth() + 1 === month && new Date(t.date).getFullYear() === year)
        .reduce((a, b) => a + b.nominal, 0);

    return (earlierIn - earlierOut) + saldoAwalInMonth;
  };

  const saldoAwalBulanan = getSaldoAwalBulan(filterMonth, filterYear);

  const monthlyIn = monthlyTransactions
    .filter((t) => t.type === "Pemasukan" && t.categoryId !== "cat-saldo-awal")
    .reduce((sum, t) => sum + t.nominal, 0);
  const monthlyOut = monthlyTransactions
    .filter((t) => t.type === "Pengeluaran")
    .reduce((sum, t) => sum + t.nominal, 0);

  const saldoAkhirBulanan = saldoAwalBulanan + monthlyIn - monthlyOut;

  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    monthlyTransactions.filter(t => t.categoryId !== 'cat-saldo-awal').forEach((t) => {
      breakdown[t.categoryId] = (breakdown[t.categoryId] || 0) + t.nominal;
    });
    return Object.entries(breakdown)
      .map(([id, amount]) => ({
        category: categories.find((c) => c.id === id) || {
          name: "Unknown",
          type: "Pengeluaran",
        },
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthlyTransactions, categories]);

  // === TUNGGAKAN LOGIC ===
  const arrearsList = useMemo(() => {
    const paidResidentsForPeriod = new Set(
      transactions
        .filter(
          (t) =>
            t.type === "Pemasukan" &&
            t.periodeBulan === filterMonth &&
            t.periodeTahun === filterYear,
        )
        .map((t) => t.residentId),
    );

    return warga
      .filter((w) => w.status === "Aktif")
      .filter((w) => !paidResidentsForPeriod.has(w.id))
      .map((w) => {
        const paidMonthsThisYear = new Set(
          transactions
            .filter(
              (t) =>
                t.type === "Pemasukan" &&
                t.residentId === w.id &&
                t.periodeTahun === filterYear,
            )
            .map((t) => t.periodeBulan),
        );
        const missedMonthsCount = filterMonth - paidMonthsThisYear.size;
        return {
          ...w,
          missedMonthsCount: Math.max(0, missedMonthsCount),
        };
      })
      .sort((a, b) => b.missedMonthsCount - a.missedMonthsCount);
  }, [transactions, warga, filterMonth, filterYear]);

  // === REKAPITULASI MATRIKS LOGIC ===
  const bulananCids = useMemo(() => categories.filter(c => c.name.toLowerCase().includes("bulanan") || c.periode === "Bulanan").map(c => c.id), [categories]);
  const tahunanCids = useMemo(() => categories.filter(c => c.name.toLowerCase().includes("tahunan") || c.periode === "Tahunan").map(c => c.id), [categories]);

  const rekapitulasiList = useMemo(() => {
    return warga
      .sort((a, b) => {
         const numA = parseInt(a.nomorRumah.replace(/\D/g, '')) || 0;
         const numB = parseInt(b.nomorRumah.replace(/\D/g, '')) || 0;
         return numA - numB;
      })
      .map(w => {
         const wTx = transactions.filter(t => t.residentId === w.id && t.type === "Pemasukan" && t.periodeTahun === filterYear);
         const paidSet = new Set<number>();
         wTx.forEach(t => {
            if (t.periodeBulan && bulananCids.includes(t.categoryId)) paidSet.add(t.periodeBulan);
            if (tahunanCids.includes(t.categoryId)) {
                for (let i = 1; i <= 12; i++) paidSet.add(i);
            }
         });
         return {
            ...w,
            paidMonths: paidSet
         };
      });
  }, [warga, transactions, filterYear, bulananCids, tahunanCids]);

  // === LAPORAN TAHUNAN LOGIC ===
  const yearCurrent = filterYearTahunan;
  const yearPrev = filterYearTahunan - 1;

  const incomeCategories = categories.filter(c => c.type === 'Pemasukan' && c.id !== 'cat-saldo-awal');
  const expenseCategories = categories.filter(c => c.type === 'Pengeluaran');

  const getCategorySum = (categoryId: string, year: number) => {
    return transactions
      .filter(t => t.categoryId === categoryId && new Date(t.date).getFullYear() === year)
      .reduce((sum, t) => sum + t.nominal, 0);
  };

  const getSaldoAwal = (year: number) => {
    const beforeYearY = transactions.filter(t => new Date(t.date).getFullYear() < year);
    const sumBeforePemasukan = beforeYearY.filter(t => t.type === 'Pemasukan').reduce((a, b) => a + b.nominal, 0);
    const sumBeforePengeluaran = beforeYearY.filter(t => t.type === 'Pengeluaran').reduce((a, b) => a + b.nominal, 0);
    
    const saldoAwalInYear = transactions
        .filter(t => t.categoryId === 'cat-saldo-awal' && new Date(t.date).getFullYear() === year)
        .reduce((a, b) => a + b.nominal, 0);
    
    return (sumBeforePemasukan - sumBeforePengeluaran) + saldoAwalInYear;
  };

  const getTotalPenerimaan = (year: number) => {
    return incomeCategories.reduce((sum, cat) => sum + getCategorySum(cat.id, year), 0);
  };

  const getTotalPengeluaran = (year: number) => {
    return expenseCategories.reduce((sum, cat) => sum + getCategorySum(cat.id, year), 0);
  };

  const getTotalKasAkhir = (year: number) => {
    return getSaldoAwal(year) + getTotalPenerimaan(year) - getTotalPengeluaran(year);
  };

  // === ARUS KAS LOGIC ===
  const arusKasData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    let saldoBerjalan = getSaldoAwal(filterYearTahunan);
    
    return months.map(m => {
      const monthTxs = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() + 1 === m && d.getFullYear() === filterYearTahunan;
      });
      
      const masuk = monthTxs.filter(t => t.type === 'Pemasukan' && t.categoryId !== 'cat-saldo-awal').reduce((s, t) => s + t.nominal, 0);
      const keluar = monthTxs.filter(t => t.type === 'Pengeluaran').reduce((s, t) => s + t.nominal, 0);
      const saldoAwalInMonth = monthTxs.filter(t => t.categoryId === 'cat-saldo-awal').reduce((s, t) => s + t.nominal, 0);
      
      const saldoAwalBulan = saldoBerjalan + saldoAwalInMonth;
      const saldoAkhirBulan = saldoAwalBulan + masuk - keluar;
      saldoBerjalan = saldoAkhirBulan;
      
      return {
        bulan: m,
        namabulan: new Date(2000, m - 1).toLocaleString('id-ID', { month: 'long' }),
        masuk,
        keluar,
        saldoAwal: saldoAwalBulan,
        saldoAkhir: saldoAkhirBulan,
        netto: masuk - keluar,
      };
    });
  }, [transactions, filterYearTahunan]);

  const totalArusKas = useMemo(() => {
    return {
      masuk: arusKasData.reduce((s, d) => s + d.masuk, 0),
      keluar: arusKasData.reduce((s, d) => s + d.keluar, 0),
      netto: arusKasData.reduce((s, d) => s + d.netto, 0),
    };
  }, [arusKasData]);

  const kasBalances = useMemo(() => {
    // We calculate balances per kas location covering ALL transactions up to the end of the selected year
    const endDate = new Date(filterYearTahunan, 11, 31, 23, 59, 59); // end of selected year
    const validTxs = transactions.filter(t => new Date(t.date) <= endDate);

    return kasLocations.map(loc => {
      const txsForKas = validTxs.filter(t => t.kasLocationId === loc.id);
      const masuk = txsForKas.filter(t => t.type === 'Pemasukan').reduce((sum, t) => sum + t.nominal, 0);
      const keluar = txsForKas.filter(t => t.type === 'Pengeluaran').reduce((sum, t) => sum + t.nominal, 0);
      return {
        ...loc,
        masuk,
        keluar,
        saldo: masuk - keluar
      };
    });
  }, [kasLocations, transactions, filterYearTahunan]);

  // === EXPORTS === //
  const exportCSV = () => {
    if (activeTab === "Bulanan") {
      const data = monthlyTransactions.map((t) => ({
        Tanggal: new Date(t.date).toLocaleDateString("id-ID"),
        Tipe: t.type,
        Kategori: categories.find((c) => c.id === t.categoryId)?.name || "-",
        Keterangan:
          t.type === "Pemasukan"
            ? warga.find((w) => w.id === t.residentId)?.namaKepalaKeluarga || t.description
            : t.description,
        Nominal: t.nominal,
      }));
      const csv = Papa.unparse(data);
      downloadBlob(csv, `Laporan_Bulanan_${filterMonth}_${filterYear}.csv`);
    } else if (activeTab === "Tunggakan") {
      const data = arrearsList.map((w) => ({
        "Nomor Rumah": w.nomorRumah,
        "Kepala Keluarga": w.namaKepalaKeluarga,
        "No HP": w.noHp || "-",
        "Estimasi Bulan Nunggak": w.missedMonthsCount,
      }));
      const csv = Papa.unparse(data);
      downloadBlob(csv, `Daftar_Tunggakan_${filterMonth}_${filterYear}.csv`);
    } else {
        alert("Gunakan tombol 'Print Laporan' atau Cetak (Ctrl+P) untuk laporan ini.");
    }
  };

  const downloadBlob = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print header for all printable tabs
  const PrintHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="hidden print:block text-center py-6 border-b-2 border-gray-300 mb-4">
      <h2 className="font-extrabold text-xl uppercase tracking-wider text-gray-900">{title}</h2>
      <h3 className="font-bold text-lg text-gray-800 tracking-wide mt-1">{namaOrganisasi}</h3>
      {namaDesa && <p className="text-sm text-gray-600 mt-0.5">{namaDesa}</p>}
      {alamatOrg && <p className="text-xs text-gray-500 mt-0.5">{alamatOrg}</p>}
      {subtitle && <p className="font-semibold text-gray-600 mt-2 text-sm uppercase tracking-widest">{subtitle}</p>}
    </div>
  );

  const PrintFooter = () => (
    <div className="hidden print:grid grid-cols-2 mt-12 mb-8 text-center items-end text-sm text-gray-800">
      <div className="leading-relaxed">
        <p>Dibuat Oleh,</p>
        <div className="h-24"></div>
        <p className="font-bold underline decoration-1 underline-offset-4 uppercase">{namaBendahara}</p>
        <p className="font-bold">Bendahara</p>
      </div>
      <div className="leading-relaxed">
        <p>Disetujui Oleh,</p>
        <div className="h-24"></div>
        <p className="font-bold underline decoration-1 underline-offset-4 uppercase">{namaKetua}</p>
        <p className="font-bold">Ketua</p>
      </div>
    </div>
  );

  const canPrint = activeTab === "Tahunan" || activeTab === "ArusKas" || activeTab === "Bulanan" || activeTab === "Rekapitulasi" || activeTab === "Tunggakan";

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto print:max-w-none print:w-full print:m-0">
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Laporan Keuangan
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Analisa dan Rekapitulasi Pembukuan Kas Warga.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 bg-gray-100 p-1.5 rounded-xl border border-gray-200">
          {([
            { id: "Tahunan", label: "Tahunan", active: "bg-brand-600 text-white shadow border border-brand-700" },
            { id: "Bulanan", label: "Bulanan", active: "bg-white text-gray-900 shadow border border-gray-200" },
            { id: "ArusKas", label: "Arus Kas", active: "bg-white text-gray-900 shadow border border-gray-200" },
            { id: "Rekapitulasi", label: "Rekap Warga", active: "bg-white text-blue-700 shadow border border-blue-200" },
            { id: "Tunggakan", label: "Tunggakan", active: "bg-white text-brand-700 shadow border border-brand-200" },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.id ? tab.active : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="print:hidden bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center justify-between gap-4">
        {activeTab === "Bulanan" || activeTab === "Tunggakan" ? (
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(Number(e.target.value))}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-brand-500/20 outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString("id-ID", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="2000"
              max="2100"
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="w-24 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-brand-500/20 outline-none"
            />
          </div>
        ) : (
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-gray-400" />
              <label className="text-sm font-medium text-gray-600">Pilih Tahun Laporan:</label>
              <input
                type="number"
                min="2000"
                max="2100"
                value={filterYearTahunan}
                onChange={(e) => setFilterYearTahunan(Number(e.target.value))}
                className="w-24 px-3 py-2 bg-brand-50 border border-brand-200 text-brand-900 rounded-lg font-bold focus:ring-2 focus:ring-brand-500/20 outline-none shadow-inner"
              />
            </div>
        )}
        
        <div className="flex items-center gap-2">
          {(activeTab === "Bulanan" || activeTab === "Tunggakan") && (
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 text-green-700 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg text-sm font-semibold transition-colors border border-green-200"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export CSV
            </button>
          )}
          {canPrint && (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 text-brand-700 bg-brand-50 hover:bg-brand-100 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors border border-brand-200 shadow-sm"
            >
              <Printer className="w-4 h-4" /> Cetak / Print
            </button>
          )}
        </div>
      </div>

      {/* TAHUNAN VIEW */}
      {activeTab === "Tahunan" && (
        <div className="bg-white mx-auto border-2 border-gray-300 print:border-none print:shadow-none shadow-sm pb-8 mb-12">
            <div className="text-center py-6 border-b-2 border-gray-300 bg-gray-50/50 print:bg-transparent">
                <h2 className="font-extrabold text-xl uppercase tracking-wider text-gray-900">Laporan Keuangan</h2>
                <h3 className="font-bold text-lg text-gray-800 tracking-wide mt-1">{namaOrganisasi}</h3>
                {namaDesa && <p className="text-sm text-gray-600 mt-0.5">{namaDesa}</p>}
                {alamatOrg && <p className="text-xs text-gray-500 mt-0.5">{alamatOrg}</p>}
                <p className="font-semibold text-gray-600 mt-2 text-sm uppercase tracking-widest">Periode 1 Januari - 31 Desember {filterYearTahunan}</p>
            </div>
            
            <div className="overflow-x-auto print:overflow-visible p-6">
                <table className="w-full text-[13px] md:text-sm border-collapse">
                <thead className="bg-[#e2e8f0] text-gray-800 print:bg-[#e2e8f0]">
                    <tr>
                    <th className="py-2.5 px-4 border border-gray-400 text-left w-1/2 uppercase font-bold tracking-wider">Nama Kegiatan</th>
                    <th className="py-2.5 px-4 border border-gray-400 text-right uppercase font-bold tracking-wider bg-[#cbd5e1]/50 print:bg-transparent">Tahun {yearPrev}</th>
                    <th className="py-2.5 px-4 border border-gray-400 text-right uppercase font-bold tracking-wider bg-[#94a3b8]/30 print:bg-transparent">Tahun {yearCurrent}</th>
                    </tr>
                </thead>
                <tbody>
                    {/* SALDO AWAL */}
                    <tr className="bg-white pointer-events-none">
                    <td className="py-2.5 px-4 border border-gray-400 font-extrabold text-blue-900 border-b-2 relative overflow-hidden">
                        Saldo Awal
                        <div className="absolute inset-0 bg-blue-50/30"></div>
                    </td>
                    <td className="py-2.5 px-4 border border-gray-400 border-b-2 text-right font-extrabold text-blue-900 bg-blue-50/30">Rp {getSaldoAwal(yearPrev).toLocaleString('id-ID')}</td>
                    <td className="py-2.5 px-4 border border-gray-400 border-b-2 text-right font-extrabold text-blue-900 bg-blue-100/50">Rp {getSaldoAwal(yearCurrent).toLocaleString('id-ID')}</td>
                    </tr>
                    
                    {/* PENERIMAAN */}
                    <tr className="print:bg-transparent">
                    <td colSpan={3} className="py-3 px-4 font-extrabold text-green-900 bg-green-50/40 border-x border-gray-400 uppercase tracking-widest text-xs">Penerimaan Kas</td>
                    </tr>
                    {incomeCategories.map(cat => (
                    <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2 px-4 border border-gray-300 pl-8 text-gray-700">{cat.name}</td>
                        <td className="py-2 px-4 border border-gray-300 border-r-4 border-r-gray-100 text-right text-gray-700 font-medium">Rp {getCategorySum(cat.id, yearPrev).toLocaleString('id-ID')}</td>
                        <td className="py-2 px-4 border border-gray-300 text-right text-gray-800 font-semibold bg-gray-50/30">Rp {getCategorySum(cat.id, yearCurrent).toLocaleString('id-ID')}</td>
                    </tr>
                    ))}
                    <tr className="bg-gray-100/80 print:bg-gray-100 print:!bg-gray-100">
                    <td className="py-2.5 px-4 border border-gray-400 font-bold text-gray-900 italic">Total Penerimaan</td>
                    <td className="py-2.5 px-4 border border-gray-400 text-right font-bold text-gray-900 border-r-4 border-r-gray-200">Rp {getTotalPenerimaan(yearPrev).toLocaleString('id-ID')}</td>
                    <td className="py-2.5 px-4 border border-gray-400 text-right font-bold text-gray-900 bg-gray-200/50">Rp {getTotalPenerimaan(yearCurrent).toLocaleString('id-ID')}</td>
                    </tr>
                    
                    {/* PENGELUARAN */}
                    <tr className="print:bg-transparent">
                    <td colSpan={3} className="py-3 px-4 font-extrabold text-red-900 bg-red-50/40 border-x border-gray-400 uppercase tracking-widest text-xs mt-4">Pengeluaran Kas</td>
                    </tr>
                    {expenseCategories.map(cat => (
                    <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2 px-4 border border-gray-300 pl-8 text-gray-700">{cat.name}</td>
                        <td className="py-2 px-4 border border-gray-300 border-r-4 border-r-gray-100 text-right text-gray-700 font-medium">Rp {getCategorySum(cat.id, yearPrev).toLocaleString('id-ID')}</td>
                        <td className="py-2 px-4 border border-gray-300 text-right text-gray-800 font-semibold bg-gray-50/30">Rp {getCategorySum(cat.id, yearCurrent).toLocaleString('id-ID')}</td>
                    </tr>
                    ))}
                    <tr className="bg-gray-100/80 print:bg-gray-100 print:!bg-gray-100">
                    <td className="py-2.5 px-4 border border-gray-400 font-bold text-gray-900 italic">Total Pengeluaran</td>
                    <td className="py-2.5 px-4 border border-gray-400 border-r-4 border-r-gray-200 text-right font-bold text-gray-900">Rp {getTotalPengeluaran(yearPrev).toLocaleString('id-ID')}</td>
                    <td className="py-2.5 px-4 border border-gray-400 text-right font-bold text-gray-900 bg-gray-200/50">Rp {getTotalPengeluaran(yearCurrent).toLocaleString('id-ID')}</td>
                    </tr>
                    
                    {/* SURPLUS / DEFISIT MURNI */}
                    <tr className="bg-orange-50/50 print:bg-transparent">
                    <td className="py-3 px-4 border border-gray-400 font-bold text-orange-900">Kenaikan / (Penurunan) Kas Bersih<br/><span className="text-xs font-normal text-gray-500">Total Penerimaan - Total Pengeluaran</span></td>
                    <td className="py-3 px-4 border border-gray-400 border-r-4 border-r-gray-200 text-right font-bold text-orange-900">Rp {(getTotalPenerimaan(yearPrev) - getTotalPengeluaran(yearPrev)).toLocaleString('id-ID')}</td>
                    <td className="py-3 px-4 border border-gray-400 text-right font-bold text-orange-900 bg-orange-100/50">Rp {(getTotalPenerimaan(yearCurrent) - getTotalPengeluaran(yearCurrent)).toLocaleString('id-ID')}</td>
                    </tr>
                    
                    {/* TOTAL AKHIR */}
                    <tr className="bg-brand-50 print:bg-transparent">
                    <td className="py-4 px-4 border-2 border-gray-400 font-extrabold text-brand-950 uppercase tracking-wider text-sm">TOTAL KAS {namaOrganisasi.toUpperCase()}</td>
                    <td className="py-4 px-4 border-2 border-gray-400 text-right font-extrabold text-brand-900 text-sm">Rp {getTotalKasAkhir(yearPrev).toLocaleString('id-ID')}</td>
                    <td className="py-4 px-4 border-2 border-gray-400 text-right font-extrabold text-brand-900 text-sm bg-brand-100/50">Rp {getTotalKasAkhir(yearCurrent).toLocaleString('id-ID')}</td>
                    </tr>
                </tbody>
                </table>
            </div>
            
            {/* Tanda Tangan */}
            <div className="grid grid-cols-2 mt-12 mb-8 text-center items-end text-sm text-gray-800">
                <div className="leading-relaxed">
                <p>Dibuat Oleh,</p>
                <div className="h-24"></div>
                <p className="font-bold underline decoration-1 underline-offset-4 uppercase">{namaBendahara}</p>
                <p className="font-bold">Bendahara</p>
                </div>
                <div className="leading-relaxed">
                <p>Disetujui Oleh,</p>
                <div className="h-24"></div>
                <p className="font-bold underline decoration-1 underline-offset-4 uppercase">{namaKetua}</p>
                <p className="font-bold">Ketua</p>
                </div>
            </div>
        </div>
      )}

      {/* ARUS KAS VIEW */}
      {activeTab === "ArusKas" && (
        <div className="print:m-0">
          <PrintHeader title="Laporan Arus Kas" subtitle={`Periode Januari - Desember ${filterYearTahunan}`} />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 print:hidden">
            <div className="bg-green-50 border border-green-200 p-5 rounded-2xl">
              <p className="text-green-700 text-xs font-bold uppercase tracking-wider mb-1">Total Pemasukan</p>
              <h4 className="text-xl font-bold text-green-800">Rp {totalArusKas.masuk.toLocaleString('id-ID')}</h4>
            </div>
            <div className="bg-red-50 border border-red-200 p-5 rounded-2xl">
              <p className="text-red-700 text-xs font-bold uppercase tracking-wider mb-1">Total Pengeluaran</p>
              <h4 className="text-xl font-bold text-red-800">Rp {totalArusKas.keluar.toLocaleString('id-ID')}</h4>
            </div>
            <div className={`p-5 rounded-2xl border ${totalArusKas.netto >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${totalArusKas.netto >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Arus Kas Bersih</p>
              <h4 className={`text-xl font-bold ${totalArusKas.netto >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                {totalArusKas.netto >= 0 ? '+' : ''} Rp {totalArusKas.netto.toLocaleString('id-ID')}
              </h4>
            </div>
          </div>

          <div className="bg-white rounded-2xl print:rounded-none shadow-sm print:shadow-none border border-gray-200 print:border-none overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 print:bg-transparent flex items-center gap-2">
              <Landmark className="w-5 h-5 text-gray-400 print:hidden"/>
              <h3 className="font-bold text-gray-800">Posisi Saldo Kas per Lokasi</h3>
            </div>
            
            {/* Tampilan Layar (Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6 print:hidden">
              {kasBalances.map(loc => (
                  <div key={loc.id} className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
                     <div className="flex justify-between items-center w-full border-b border-gray-100 pb-2 mb-2">
                        <p className="font-semibold text-gray-800 flex items-center gap-1.5"><Landmark className="w-3.5 h-3.5 text-gray-400"/> {loc.name}</p>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold tracking-wider uppercase">{loc.type}</span>
                     </div>
                     <div className="space-y-1.5 mb-3">
                        <div className="flex justify-between w-full text-xs">
                          <span className="text-gray-500">Pemasukan</span>
                          <span className="font-semibold text-green-700">Rp {loc.masuk.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between w-full text-xs">
                          <span className="text-gray-500">Pengeluaran</span>
                          <span className="font-semibold text-red-600">Rp {loc.keluar.toLocaleString('id-ID')}</span>
                        </div>
                     </div>
                     <div className="flex justify-between w-full mt-auto items-center pt-2 border-t border-gray-100">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Saldo Akhir</span>
                        <span className="font-bold text-lg text-brand-700">Rp {loc.saldo.toLocaleString('id-ID')}</span>
                     </div>
                  </div>
              ))}
            </div>

            {/* Tampilan Cetak (Table) */}
            <div className="hidden print:block print:w-full print:px-0">
               <table className="w-full text-sm border-collapse">
                  <thead className="bg-[#e2e8f0] text-gray-800 print:bg-[#e2e8f0]">
                     <tr>
                        <th className="py-2.5 px-4 border border-gray-400 text-left font-bold uppercase tracking-wider text-xs">Nama Lokasi Kas</th>
                        <th className="py-2.5 px-4 border border-gray-400 text-left font-bold uppercase tracking-wider text-xs">Tipe Kas</th>
                        <th className="py-2.5 px-4 border border-gray-400 text-right font-bold uppercase tracking-wider text-xs">Total Pemasukan</th>
                        <th className="py-2.5 px-4 border border-gray-400 text-right font-bold uppercase tracking-wider text-xs">Total Pengeluaran</th>
                        <th className="py-2.5 px-4 border border-gray-400 text-right font-bold uppercase tracking-wider text-xs">Saldo Akhir</th>
                     </tr>
                  </thead>
                  <tbody>
                     {kasBalances.map(loc => (
                       <tr key={`print-${loc.id}`}>
                         <td className="py-2 px-4 border border-gray-400 font-semibold text-gray-900">{loc.name}</td>
                         <td className="py-2 px-4 border border-gray-400 text-gray-700 text-xs">{loc.type}</td>
                         <td className="py-2 px-4 border border-gray-400 text-right font-medium">Rp {loc.masuk.toLocaleString('id-ID')}</td>
                         <td className="py-2 px-4 border border-gray-400 text-right font-medium">Rp {loc.keluar.toLocaleString('id-ID')}</td>
                         <td className="py-2 px-4 border border-gray-400 text-right font-bold text-gray-900 bg-gray-50/50">Rp {loc.saldo.toLocaleString('id-ID')}</td>
                       </tr>
                     ))}
                     {/* Row Total */}
                     <tr className="bg-gray-100/80 print:bg-gray-100 print:!bg-gray-100">
                         <td colSpan={2} className="py-2.5 px-4 border border-gray-400 font-extrabold uppercase tracking-wider text-xs text-right">Total Keseluruhan</td>
                         <td className="py-2.5 px-4 border border-gray-400 text-right font-bold text-gray-900 text-sm">Rp {kasBalances.reduce((s, loc) => s + loc.masuk, 0).toLocaleString('id-ID')}</td>
                         <td className="py-2.5 px-4 border border-gray-400 text-right font-bold text-gray-900 text-sm">Rp {kasBalances.reduce((s, loc) => s + loc.keluar, 0).toLocaleString('id-ID')}</td>
                         <td className="py-2.5 px-4 border border-gray-400 text-right font-extrabold text-blue-900 bg-blue-100/50">Rp {kasBalances.reduce((s, loc) => s + loc.saldo, 0).toLocaleString('id-ID')}</td>
                     </tr>
                  </tbody>
               </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl print:rounded-none shadow-sm print:shadow-none border border-gray-200 print:border-none overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 print:bg-transparent flex items-center gap-2">
              <ArrowDownUp className="w-5 h-5 text-gray-400 print:hidden" />
              <h3 className="font-bold text-gray-800">Arus Kas Per Bulan — Tahun {filterYearTahunan}</h3>
            </div>
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 print:bg-gray-200 text-gray-700">
                  <tr>
                    <th className="px-4 py-3 border border-gray-300 text-left font-bold uppercase tracking-wider text-xs">Bulan</th>
                    <th className="px-4 py-3 border border-gray-300 text-right font-bold uppercase tracking-wider text-xs">Saldo Awal</th>
                    <th className="px-4 py-3 border border-gray-300 text-right font-bold uppercase tracking-wider text-xs text-green-800">Masuk</th>
                    <th className="px-4 py-3 border border-gray-300 text-right font-bold uppercase tracking-wider text-xs text-red-800">Keluar</th>
                    <th className="px-4 py-3 border border-gray-300 text-right font-bold uppercase tracking-wider text-xs">Arus Bersih</th>
                    <th className="px-4 py-3 border border-gray-300 text-right font-bold uppercase tracking-wider text-xs">Saldo Akhir</th>
                  </tr>
                </thead>
                <tbody>
                  {arusKasData.map((d, idx) => (
                    <tr key={d.bulan} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-gray-50 transition-colors print:bg-transparent`}>
                      <td className="px-4 py-2.5 border border-gray-200 font-semibold text-gray-800 capitalize">{d.namabulan}</td>
                      <td className="px-4 py-2.5 border border-gray-200 text-right text-gray-600 font-medium">Rp {d.saldoAwal.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-2.5 border border-gray-200 text-right text-green-700 font-semibold">{d.masuk > 0 ? `Rp ${d.masuk.toLocaleString('id-ID')}` : '-'}</td>
                      <td className="px-4 py-2.5 border border-gray-200 text-right text-red-600 font-semibold">{d.keluar > 0 ? `Rp ${d.keluar.toLocaleString('id-ID')}` : '-'}</td>
                      <td className={`px-4 py-2.5 border border-gray-200 text-right font-bold ${d.netto >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {d.netto >= 0 ? '+' : ''}{d.netto !== 0 ? `Rp ${d.netto.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="px-4 py-2.5 border border-gray-200 text-right font-bold text-gray-900">Rp {d.saldoAkhir.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                  {/* TOTAL ROW */}
                  <tr className="bg-gray-800 text-white print:bg-gray-200 print:text-gray-900">
                    <td className="px-4 py-3 border border-gray-600 print:border-gray-400 font-extrabold uppercase tracking-wider text-xs">Total</td>
                    <td className="px-4 py-3 border border-gray-600 print:border-gray-400 text-right font-bold">Rp {getSaldoAwal(filterYearTahunan).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 border border-gray-600 print:border-gray-400 text-right font-bold text-green-300 print:text-green-800">Rp {totalArusKas.masuk.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 border border-gray-600 print:border-gray-400 text-right font-bold text-red-300 print:text-red-800">Rp {totalArusKas.keluar.toLocaleString('id-ID')}</td>
                    <td className={`px-4 py-3 border border-gray-600 print:border-gray-400 text-right font-bold ${totalArusKas.netto >= 0 ? 'text-green-300 print:text-green-800' : 'text-red-300 print:text-red-800'}`}>
                      {totalArusKas.netto >= 0 ? '+' : ''}Rp {totalArusKas.netto.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 border border-gray-600 print:border-gray-400 text-right font-extrabold">Rp {getTotalKasAkhir(filterYearTahunan).toLocaleString('id-ID')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <PrintFooter />
        </div>
      )}


      {activeTab === "Bulanan" && (
        <div className="space-y-6 print:space-y-4">
          <PrintHeader 
            title="Laporan Bulanan" 
            subtitle={`${new Date(2000, filterMonth - 1).toLocaleString('id-ID', { month: 'long' })} ${filterYear}`} 
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
             <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl shadow-sm print:rounded-lg print:p-4">
                <p className="text-blue-800 text-sm font-medium mb-1">Saldo Kas Awal Bulan</p>
                <h4 className="text-2xl font-bold text-blue-900 print:text-lg">Rp {saldoAwalBulanan.toLocaleString("id-ID")}</h4>
             </div>
             <div className="bg-brand-600 outline outline-4 outline-brand-600/20 text-white p-6 rounded-2xl shadow-sm print:bg-gray-800 print:rounded-lg print:p-4 print:outline-none">
                <p className="text-brand-100 text-sm font-medium mb-1 print:text-gray-300">Saldo Kas Akhir Bulan</p>
                <h4 className="text-2xl font-bold print:text-lg">Rp {saldoAkhirBulanan.toLocaleString("id-ID")}</h4>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm print:p-4 print:rounded-lg">
              <p className="text-gray-500 text-sm font-medium mb-1">
                Penerimaan Bulan Ini
              </p>
              <h4 className="text-2xl font-bold text-green-600 print:text-lg">
                Rp {monthlyIn.toLocaleString("id-ID")}
              </h4>
              <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden print:hidden">
                <div className="h-full bg-green-500 w-full"></div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm print:p-4 print:rounded-lg">
              <p className="text-gray-500 text-sm font-medium mb-1">
                Pengeluaran Bulan Ini
              </p>
              <h4 className="text-2xl font-bold text-red-600 print:text-lg">
                Rp {monthlyOut.toLocaleString("id-ID")}
              </h4>
              <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden print:hidden">
                {monthlyOut > 0 ? (
                  <div
                    className="h-full bg-red-500"
                    style={{
                      width: `${Math.min(100, (monthlyOut / monthlyIn) * 100 || 0)}%`,
                    }}
                  ></div>
                ) : null}
              </div>
            </div>
            <div
              className={`p-6 rounded-2xl border shadow-sm print:p-4 print:rounded-lg ${monthlyIn >= monthlyOut ? "bg-green-50 border-green-100" : "bg-orange-50 border-orange-100"}`}
            >
              <p
                className={`text-sm font-medium mb-1 ${monthlyIn >= monthlyOut ? "text-green-800" : "text-orange-800"}`}
              >
                Surplus / Defisit Bersih
              </p>
              <h4
                className={`text-2xl font-bold print:text-lg ${monthlyIn >= monthlyOut ? "text-green-700" : "text-orange-700"}`}
              >
                {monthlyIn >= monthlyOut ? "+" : "-"} Rp{" "}
                {Math.abs(monthlyIn - monthlyOut).toLocaleString("id-ID")}
              </h4>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 print:p-4 print:rounded-lg">
            <h3 className="font-bold text-gray-800 mb-4">
              Rincian per Kategori (Bulan Ini)
            </h3>
            {categoryBreakdown.length > 0 ? (
              <div className="space-y-4 print:space-y-2">
                {categoryBreakdown.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 rounded-xl border border-gray-50 hover:bg-gray-50 transition-colors print:p-2 print:border-b print:border-gray-200 print:rounded-none"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${item.category.type === "Pemasukan" ? "bg-green-500" : "bg-red-500"}`}
                      ></div>
                      <span className="font-medium text-gray-700">
                        {item.category.name}
                      </span>
                    </div>
                    <span
                      className={`font-semibold ${item.category.type === "Pemasukan" ? "text-green-600" : "text-red-600"}`}
                    >
                      Rp {item.amount.toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                Tidak ada data di periode ini.
              </div>
            )}
          </div>
          <PrintFooter />
        </div>
      )}

      {activeTab === "Rekapitulasi" && (
          <div className="print:m-0">
            <PrintHeader title="Rekapitulasi Iuran Warga" subtitle={`Tahun ${filterYear}`} />
            <div className="bg-white rounded-2xl print:rounded-none shadow-sm print:shadow-none border border-gray-200 print:border-none overflow-hidden">
             <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 print:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
               <div className="flex items-center gap-2 text-gray-800">
                 <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                 <h3 className="font-bold">
                   Rekapitulasi Matriks Iuran Warga Tahun {filterYear}
                 </h3>
               </div>
               <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-500">Pilih Tahun:</label>
                  <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))} className="px-3 py-1.5 rounded-lg border border-gray-200 font-bold focus:ring-1 focus:ring-blue-500 shadow-sm outline-none">
                     {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
               </div>
             </div>
             
             <div className="overflow-x-auto print:overflow-visible">
               <table className="w-full text-left font-mono text-xs whitespace-nowrap border-collapse">
                 <thead className="bg-gray-100 border-b-2 border-gray-200 print:bg-gray-200">
                    <tr>
                       <th className="px-4 py-3 sticky left-0 z-10 bg-gray-100 print:bg-gray-200 border-r border-gray-200 w-12 text-center uppercase tracking-widest text-gray-500 font-bold">Blok</th>
                       <th className="px-4 py-3 sticky left-12 z-10 bg-gray-100 print:bg-gray-200 border-r border-gray-200 uppercase tracking-widest text-gray-500 font-bold">Nama Warga</th>
                       {["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"].map(m => (
                           <th key={m} className="px-3 py-3 border-r border-gray-200 text-center uppercase tracking-widest text-gray-500 font-bold">
                               {m}
                           </th>
                       ))}
                    </tr>
                 </thead>
                 <tbody>
                    {rekapitulasiList.map(w => (
                        <tr key={w.id} className={`border-b border-gray-100 hover:bg-gray-50 ${w.status === 'Pindah' ? 'opacity-50' : ''}`}>
                            <td className="px-4 py-2 sticky left-0 z-10 bg-white border-r border-gray-100/50 text-center font-bold text-gray-900 group-hover:bg-gray-50">
                                {w.nomorRumah}
                            </td>
                            <td className="px-4 py-2 sticky left-12 z-10 bg-white border-r border-gray-100/50 font-bold text-gray-700 truncate max-w-[150px] group-hover:bg-gray-50">
                                {w.namaKepalaKeluarga}
                                {w.status === 'Pindah' && <span className="ml-2 text-[9px] font-normal italic text-red-500">(Pindah)</span>}
                            </td>
                            {Array.from({length: 12}, (_, i) => i + 1).map(m => {
                                const isHadir = w.paidMonths.has(m);
                                return (
                                    <td key={m} className="px-2 py-2 border-r border-gray-100/50 text-center">
                                       {isHadir ? (
                                           <span className="inline-flex w-5 h-5 items-center justify-center bg-green-100 text-green-700 rounded-sm font-bold text-xs ring-1 ring-green-200/50">✓</span>
                                       ) : (
                                           <span className="text-gray-300">-</span>
                                       )}
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                 </tbody>
               </table>
               {rekapitulasiList.length === 0 && (
                   <div className="p-8 text-center text-gray-500 font-medium">Buku belum memiliki data Warga. Silakan tambahkan pada direktori warga.</div>
               )}
             </div>
          </div>
          <PrintFooter />
        </div>
      )}

      {activeTab === "Tunggakan" && (
        <div className="print:m-0">
          <PrintHeader 
            title="Daftar Tunggakan Iuran" 
            subtitle={`${new Date(2000, filterMonth - 1).toLocaleString('id-ID', { month: 'long' })} ${filterYear}`} 
          />
          <div className="bg-white rounded-2xl print:rounded-none shadow-sm print:shadow-none border border-orange-200 print:border-gray-300 overflow-hidden">
          <div className="px-6 py-4 border-b border-orange-100 bg-orange-50/50 print:bg-transparent flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-800 print:text-gray-800">
              <AlertTriangle className="w-5 h-5 text-orange-500 print:hidden" />
              <h3 className="font-semibold">
                Daftar Warga Belum Bayar ({arrearsList.length} KK)
              </h3>
            </div>
            <p className="text-sm font-medium text-orange-600 print:text-gray-600">
              Periode:{" "}
              {new Date(2000, filterMonth - 1).toLocaleString("id-ID", {
                month: "long",
              })}{" "}
              {filterYear}
            </p>
          </div>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="text-gray-500 font-medium bg-gray-50 border-b border-gray-100 print:bg-gray-200">
                <tr>
                  <th className="px-6 py-4 print:py-2 print:border print:border-gray-300">Nomor Rumah</th>
                  <th className="px-6 py-4 print:py-2 print:border print:border-gray-300">Kepala Keluarga</th>
                  <th className="px-6 py-4 print:py-2 print:border print:border-gray-300 text-center">
                    Estimasi Nunggak (Tahun Ini)
                  </th>
                  <th className="px-6 py-4 print:py-2 print:border print:border-gray-300 text-right print:hidden">Aksi Tindak Lanjut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 print:divide-gray-200">
                {arrearsList.map((w) => (
                  <tr
                    key={w.id}
                    className="hover:bg-orange-50/30 transition-colors"
                  >
                    <td className="px-6 py-4 print:py-2 print:border print:border-gray-200 font-semibold text-gray-800">
                      {w.nomorRumah}
                    </td>
                    <td className="px-6 py-4 print:py-2 print:border print:border-gray-200 text-gray-700 font-medium">
                      {w.namaKepalaKeluarga}
                    </td>
                    <td className="px-6 py-4 print:py-2 print:border print:border-gray-200 text-center">
                      {w.missedMonthsCount > 0 ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 print:bg-transparent print:border-none">
                          {w.missedMonthsCount} Bulan
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right print:hidden">
                      <a
                        href={`https://wa.me/${w.noHp?.replace(/^0/, "62")}?text=Halo%20Bapak/Ibu%20Terkait%20Iuran%20Warga...`}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                          w.noHp
                            ? "text-green-700 bg-green-50 hover:bg-green-100 border-green-200"
                            : "text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed"
                        }`}
                        onClick={(e) => !w.noHp && e.preventDefault()}
                      >
                        Tagih via WA
                      </a>
                    </td>
                  </tr>
                ))}
                {arrearsList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <div className="inline-flex justify-center items-center w-12 h-12 rounded-full bg-green-100 mb-3">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      </div>
                      <p className="text-gray-600 font-medium text-lg">
                        Lunas Semua!
                      </p>
                      <p className="text-gray-500 mt-1">
                        Tidak ada warga yang menunggak di periode ini.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <PrintFooter />
        </div>
      )}
    </div>
  );
}
