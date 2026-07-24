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
  Landmark,
  Search
} from "lucide-react";
import Papa from "papaparse";
import { useConfirm } from "../../contexts/ConfirmContext";

export default function Laporan() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useTransaksi();
  const { warga } = useWarga();
  const { categories } = useCategory();
  const { settings } = useSettings();
  const { locations: kasLocations } = useKasLocation();
  const { confirm, alert: customAlert } = useConfirm();

  const namaKetua = settings['nama_ketua'] || '.........................';
  const namaBendahara = settings['nama_bendahara'] || '.........................';
  const namaOrganisasi = settings['nama_organisasi'] || 'Suka Duka';
  const namaDesa = settings['nama_desa'] || '';
  const alamatOrg = settings['alamat'] || '';

  const [activeTab, setActiveTab] = useState<"Bulanan" | "Tunggakan" | "Rekapitulasi" | "Tahunan" | "ArusKas" | "Pertanggal">("Tahunan");

  // Filter States
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterYearTahunan, setFilterYearTahunan] = useState(new Date().getFullYear());
  const [filterStartDate, setFilterStartDate] = useState(() => {
    // Default to today
    return new Date().toISOString().split("T")[0];
  });
  const [filterEndDate, setFilterEndDate] = useState(() => {
    // Default to today
    return new Date().toISOString().split("T")[0];
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Correction Modal States
  const [correctionResident, setCorrectionResident] = useState<any | null>(null);
  const [editingTx, setEditingTx] = useState<any | null>(null);
  
  // Correction Form States
  const [corrDate, setCorrDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [corrMonth, setCorrMonth] = useState(1);
  const [corrCategoryId, setCorrCategoryId] = useState("");
  const [corrNominal, setCorrNominal] = useState("");
  const [corrLocationId, setCorrLocationId] = useState("");
  const [corrDescription, setCorrDescription] = useState("");
  const [corrSaveToKas, setCorrSaveToKas] = useState(true); // default true

  const yearOptions = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 2 + i);

  // === LAPORAN PERTANGGAL LOGIC ===
  const pertanggalTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        const tDateOnly = t.date.split("T")[0];
        const inDateRange = tDateOnly >= filterStartDate && tDateOnly <= filterEndDate;
        if (!inDateRange) return false;

        if (searchQuery.trim() !== "") {
          const query = searchQuery.toLowerCase();
          const categoryName = categories.find((c) => c.id === t.categoryId)?.name || "";
          const locationName = kasLocations.find((l) => l.id === t.kasLocationId)?.name || "";
          const w = t.type === "Pemasukan" ? warga.find((w) => w.id === t.residentId) : null;
          const residentName = w ? w.namaKepalaKeluarga : "";
          const residentHouse = w ? w.nomorRumah : "";
          const desc = t.description || "";

          return (
            residentName.toLowerCase().includes(query) ||
            residentHouse.toLowerCase().includes(query) ||
            categoryName.toLowerCase().includes(query) ||
            locationName.toLowerCase().includes(query) ||
            desc.toLowerCase().includes(query)
          );
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, filterStartDate, filterEndDate, searchQuery, warga, categories, kasLocations]);

  const totalPemasukanPertanggal = useMemo(() => {
    return pertanggalTransactions
      .filter((t) => t.type === "Pemasukan" && t.categoryId !== "cat-transfer")
      .reduce((sum, t) => sum + t.nominal, 0);
  }, [pertanggalTransactions]);

  const totalPengeluaranPertanggal = useMemo(() => {
    return pertanggalTransactions
      .filter((t) => t.type === "Pengeluaran" && t.categoryId !== "cat-transfer")
      .reduce((sum, t) => sum + t.nominal, 0);
  }, [pertanggalTransactions]);

  const selisihPertanggal = totalPemasukanPertanggal - totalPengeluaranPertanggal;

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
    const earlierTxs = transactions.filter(t => new Date(t.date) < beforeDate && t.categoryId !== 'cat-transfer');
    const earlierIn = earlierTxs.filter(t => t.type === 'Pemasukan').reduce((a, b) => a + b.nominal, 0);
    const earlierOut = earlierTxs.filter(t => t.type === 'Pengeluaran').reduce((a, b) => a + b.nominal, 0);

    const saldoAwalInMonth = transactions
      .filter(t => t.categoryId === 'cat-saldo-awal' && new Date(t.date).getMonth() + 1 === month && new Date(t.date).getFullYear() === year)
      .reduce((a, b) => a + b.nominal, 0);

    return (earlierIn - earlierOut) + saldoAwalInMonth;
  };

  const saldoAwalBulanan = getSaldoAwalBulan(filterMonth, filterYear);

  const monthlyIn = monthlyTransactions
    .filter((t) => t.type === "Pemasukan" && t.categoryId !== "cat-saldo-awal" && t.categoryId !== "cat-transfer")
    .reduce((sum, t) => sum + t.nominal, 0);
  const monthlyOut = monthlyTransactions
    .filter((t) => t.type === "Pengeluaran" && t.categoryId !== "cat-transfer")
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

    let list = warga
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
      });

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      list = list.filter((w) =>
        w.namaKepalaKeluarga.toLowerCase().includes(query) ||
        w.nomorRumah.toLowerCase().includes(query)
      );
    }

    return list.sort((a, b) => b.missedMonthsCount - a.missedMonthsCount);
  }, [transactions, warga, filterMonth, filterYear, searchQuery]);

  // === REKAPITULASI MATRIKS LOGIC ===
  const bulananCids = useMemo(() => categories.filter(c => c.name.toLowerCase().includes("bulanan") || c.periode === "Bulanan").map(c => c.id), [categories]);
  const tahunanCids = useMemo(() => categories.filter(c => c.name.toLowerCase().includes("tahunan") || c.periode === "Tahunan").map(c => c.id), [categories]);

  const rekapitulasiList = useMemo(() => {
    let filteredWarga = warga;
    if (activeTab === "Rekapitulasi" && searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filteredWarga = warga.filter(w => 
        w.namaKepalaKeluarga.toLowerCase().includes(query) ||
        w.nomorRumah.toLowerCase().includes(query)
      );
    }

    return filteredWarga
      .sort((a, b) => {
        const numA = parseInt(a.nomorRumah.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.nomorRumah.replace(/\D/g, '')) || 0;
        return numA - numB;
      })
      .map(w => {
        const wTx = transactions.filter(t => t.residentId === w.id && t.type === "Pemasukan" && t.periodeTahun === filterYear);
        const paidMonthsMap = new Map<number, { date: string; nominal: number; categoryName: string }>();
        wTx.forEach(t => {
          const categoryName = categories.find(c => c.id === t.categoryId)?.name || "Iuran";
          if (t.periodeBulan && bulananCids.includes(t.categoryId)) {
            paidMonthsMap.set(t.periodeBulan, {
              date: t.date,
              nominal: t.nominal,
              categoryName
            });
          }
          if (tahunanCids.includes(t.categoryId)) {
            for (let i = 1; i <= 12; i++) {
              paidMonthsMap.set(i, {
                date: t.date,
                nominal: t.nominal,
                categoryName
              });
            }
          }
        });
        return {
          ...w,
          paidMonthsMap
        };
      });
  }, [warga, transactions, filterYear, bulananCids, tahunanCids, searchQuery, activeTab]);

  // === KOREKSI PEMBAYARAN DI REKAP WARGA ===
  // Menggunakan matching ID dari rekapitulasiList secara dinamis agar UI modal
  // tidak tertutup atau kehilangan state ketika transaksi diupdate / di-delete.
  const activeCorrectionResident = useMemo(() => {
    if (!correctionResident) return null;
    return rekapitulasiList.find(w => w.id === correctionResident.id) || correctionResident;
  }, [rekapitulasiList, correctionResident]);

  const residentTransactions = useMemo(() => {
    if (!activeCorrectionResident) return [];
    return transactions.filter(
      (t) =>
        t.residentId === activeCorrectionResident.id &&
        t.type === "Pemasukan" &&
        t.periodeTahun === filterYear
    );
  }, [transactions, activeCorrectionResident, filterYear]);

  const handleOpenCorrection = (w: any) => {
    // Gunakan find untuk mengambil data fresh warga dari state hook utama
    // agar objek warga memiliki map transaksi terbaru (rekapitulasiList meng-generate paidMonthsMap)
    const freshWarga = rekapitulasiList.find(x => x.id === w.id) || w;
    setCorrectionResident(freshWarga);
    setEditingTx(null);
    
    // Set defaults
    setCorrDate(new Date().toISOString().split("T")[0]);
    setCorrMonth(1);
    const defaultCat = categories.find(c => c.type === 'Pemasukan' && c.id !== 'cat-saldo-awal' && c.id !== 'cat-transfer');
    setCorrCategoryId(defaultCat?.id || "");
    setCorrNominal(defaultCat?.defaultNominal?.toString() || "");
    setCorrLocationId(kasLocations[0]?.id || "default");
    setCorrDescription("");
    setCorrSaveToKas(true);
  };

  const resetCorrForm = () => {
    setEditingTx(null);
    setCorrDate(new Date().toISOString().split("T")[0]);
    setCorrMonth(1);
    const defaultCat = categories.find(c => c.type === 'Pemasukan' && c.id !== 'cat-saldo-awal' && c.id !== 'cat-transfer');
    setCorrCategoryId(defaultCat?.id || "");
    setCorrNominal(defaultCat?.defaultNominal?.toString() || "");
    setCorrLocationId(kasLocations[0]?.id || "default");
    setCorrDescription("");
    setCorrSaveToKas(true);
  };

  const handleSelectEditTx = (tx: any) => {
    setEditingTx(tx);
    setCorrDate(tx.date.split("T")[0]);
    setCorrMonth(tx.periodeBulan || 1);
    setCorrCategoryId(tx.categoryId);
    setCorrNominal(tx.nominal.toString());
    setCorrLocationId(tx.kasLocationId || kasLocations[0]?.id || "default");
    setCorrDescription(tx.description || "");
    setCorrSaveToKas(tx.nominal > 0);
  };

  const handleSaveCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCorrectionResident || !corrCategoryId) return;

    const finalNominal = corrSaveToKas ? Number(corrNominal) : 0;

    if (editingTx) {
      updateTransaction(editingTx.id, {
        date: new Date(corrDate).toISOString(),
        categoryId: corrCategoryId,
        nominal: finalNominal,
        description: corrDescription,
        kasLocationId: corrLocationId,
        periodeBulan: corrMonth,
        periodeTahun: filterYear,
      });
    } else {
      addTransaction({
        date: new Date(corrDate).toISOString(),
        categoryId: corrCategoryId,
        type: "Pemasukan",
        nominal: finalNominal,
        description: corrDescription,
        kasLocationId: corrLocationId,
        residentId: activeCorrectionResident.id,
        periodeBulan: corrMonth,
        periodeTahun: filterYear,
      });
    }
    resetCorrForm();
  };

  const handleCategoryChangeCorr = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cid = e.target.value;
    setCorrCategoryId(cid);
    const cat = categories.find((c) => c.id === cid);
    if (cat?.defaultNominal) {
      setCorrNominal(cat.defaultNominal.toString());
    } else {
      setCorrNominal("");
    }
  };

  // === LAPORAN TAHUNAN LOGIC ===
  const yearCurrent = filterYearTahunan;
  const yearPrev = filterYearTahunan - 1;

  const incomeCategories = categories.filter(c => c.type === 'Pemasukan' && c.id !== 'cat-saldo-awal' && c.id !== 'cat-transfer');
  const expenseCategories = categories.filter(c => c.type === 'Pengeluaran' && c.id !== 'cat-transfer');

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

      const masuk = monthTxs.filter(t => t.type === 'Pemasukan' && t.categoryId !== 'cat-saldo-awal' && t.categoryId !== 'cat-transfer').reduce((s, t) => s + t.nominal, 0);
      const keluar = monthTxs.filter(t => t.type === 'Pengeluaran' && t.categoryId !== 'cat-transfer').reduce((s, t) => s + t.nominal, 0);

      const saldoAwalBulan = saldoBerjalan;
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
    } else if (activeTab === "Pertanggal") {
      const data = pertanggalTransactions.map((t) => {
        const isPemasukan = t.type === "Pemasukan";
        const w = isPemasukan ? warga.find((w) => w.id === t.residentId) : null;
        return {
          Tanggal: new Date(t.date).toLocaleDateString("id-ID"),
          Tipe: t.type,
          Kategori: categories.find((c) => c.id === t.categoryId)?.name || "-",
          Nama: w ? w.namaKepalaKeluarga : (t.description || "-"),
          "No Rumah": w ? w.nomorRumah : "-",
          Periode: t.periodeBulan && t.periodeTahun 
            ? `${new Date(2000, t.periodeBulan - 1).toLocaleString("id-ID", { month: "long" })} ${t.periodeTahun}`
            : (t.periodeTahun ? `Tahun ${t.periodeTahun}` : "-"),
          "Lokasi Kas": kasLocations.find((l) => l.id === t.kasLocationId)?.name || "-",
          Nominal: t.nominal,
        };
      });
      const csv = Papa.unparse(data);
      downloadBlob(csv, `Laporan_Pertanggal_${filterStartDate}_sd_${filterEndDate}.csv`);
    } else {
      customAlert("Cetak Laporan", "Gunakan tombol 'Print Laporan' atau Cetak (Ctrl+P) untuk laporan ini.", "info");
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

  const canPrint = activeTab === "Tahunan" || activeTab === "ArusKas" || activeTab === "Bulanan" || activeTab === "Rekapitulasi" || activeTab === "Tunggakan" || activeTab === "Pertanggal";

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
            { id: "Pertanggal", label: "Pertanggal", active: "bg-white text-emerald-700 shadow border border-emerald-200" },
            { id: "ArusKas", label: "Arus Kas", active: "bg-white text-gray-900 shadow border border-gray-200" },
            { id: "Rekapitulasi", label: "Rekap Warga", active: "bg-white text-blue-700 shadow border border-blue-200" },
            { id: "Tunggakan", label: "Tunggakan", active: "bg-white text-brand-700 shadow border border-brand-200" },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery("");
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab.id ? tab.active : "text-gray-500 hover:text-gray-700"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="print:hidden bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center justify-between gap-4">
        {activeTab === "Pertanggal" ? (
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">Mulai:</span>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-brand-500/20 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">Sampai:</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-brand-500/20 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama warga, blok, atau ket..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-brand-500/20 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ) : activeTab === "Rekapitulasi" ? (
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">Tahun Rekap:</span>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(Number(e.target.value))}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-brand-500/20 outline-none font-semibold text-gray-700"
              >
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama warga atau blok..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-brand-500/20 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ) : activeTab === "Bulanan" ? (
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
        ) : activeTab === "Tunggakan" ? (
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="flex items-center gap-2">
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
            <div className="flex items-center gap-2 relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama warga atau blok..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-brand-500/20 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
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
          {(activeTab === "Bulanan" || activeTab === "Tunggakan" || activeTab === "Pertanggal") && (
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
                  <td className="py-2.5 px-4 border border-gray-400 border-b-2 text-right font-extrabold text-blue-900 bg-blue-50/30">Rp {getSaldoAwal(yearPrev).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-2.5 px-4 border border-gray-400 border-b-2 text-right font-extrabold text-blue-900 bg-blue-100/50">Rp {getSaldoAwal(yearCurrent).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>

                {/* PENERIMAAN */}
                <tr className="print:bg-transparent">
                  <td colSpan={3} className="py-3 px-4 font-extrabold text-green-900 bg-green-50/40 border-x border-gray-400 uppercase tracking-widest text-xs">Penerimaan Kas</td>
                </tr>
                {incomeCategories.map(cat => (
                  <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2 px-4 border border-gray-300 pl-8 text-gray-700">{cat.name}</td>
                    <td className="py-2 px-4 border border-gray-300 border-r-4 border-r-gray-100 text-right text-gray-700 font-medium">Rp {getCategorySum(cat.id, yearPrev).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-4 border border-gray-300 text-right text-gray-800 font-semibold bg-gray-50/30">Rp {getCategorySum(cat.id, yearCurrent).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100/80 print:bg-gray-100 print:!bg-gray-100">
                  <td className="py-2.5 px-4 border border-gray-400 font-bold text-gray-900 italic">Total Penerimaan</td>
                  <td className="py-2.5 px-4 border border-gray-400 text-right font-bold text-gray-900 border-r-4 border-r-gray-200">Rp {getTotalPenerimaan(yearPrev).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-2.5 px-4 border border-gray-400 text-right font-bold text-gray-900 bg-gray-200/50">Rp {getTotalPenerimaan(yearCurrent).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>

                {/* PENGELUARAN */}
                <tr className="print:bg-transparent">
                  <td colSpan={3} className="py-3 px-4 font-extrabold text-red-900 bg-red-50/40 border-x border-gray-400 uppercase tracking-widest text-xs mt-4">Pengeluaran Kas</td>
                </tr>
                {expenseCategories.map(cat => (
                  <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2 px-4 border border-gray-300 pl-8 text-gray-700">{cat.name}</td>
                    <td className="py-2 px-4 border border-gray-300 border-r-4 border-r-gray-100 text-right text-gray-700 font-medium">Rp {getCategorySum(cat.id, yearPrev).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-4 border border-gray-300 text-right text-gray-800 font-semibold bg-gray-50/30">Rp {getCategorySum(cat.id, yearCurrent).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100/80 print:bg-gray-100 print:!bg-gray-100">
                  <td className="py-2.5 px-4 border border-gray-400 font-bold text-gray-900 italic">Total Pengeluaran</td>
                  <td className="py-2.5 px-4 border border-gray-400 border-r-4 border-r-gray-200 text-right font-bold text-gray-900">Rp {getTotalPengeluaran(yearPrev).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-2.5 px-4 border border-gray-400 text-right font-bold text-gray-900 bg-gray-200/50">Rp {getTotalPengeluaran(yearCurrent).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>

                {/* SURPLUS / DEFISIT MURNI */}
                <tr className="bg-orange-50/50 print:bg-transparent">
                  <td className="py-3 px-4 border border-gray-400 font-bold text-orange-900">Kenaikan / (Penurunan) Kas Bersih<br /><span className="text-xs font-normal text-gray-500">Total Penerimaan - Total Pengeluaran</span></td>
                  <td className="py-3 px-4 border border-gray-400 border-r-4 border-r-gray-200 text-right font-bold text-orange-900">Rp {(getTotalPenerimaan(yearPrev) - getTotalPengeluaran(yearPrev)).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-3 px-4 border border-gray-400 text-right font-bold text-orange-900 bg-orange-100/50">Rp {(getTotalPenerimaan(yearCurrent) - getTotalPengeluaran(yearCurrent)).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>

                {/* TOTAL AKHIR */}
                <tr className="bg-brand-50 print:bg-transparent">
                  <td className="py-4 px-4 border-2 border-gray-400 font-extrabold text-brand-950 uppercase tracking-wider text-sm">TOTAL KAS {namaOrganisasi.toUpperCase()}</td>
                  <td className="py-4 px-4 border-2 border-gray-400 text-right font-extrabold text-brand-900 text-sm">Rp {getTotalKasAkhir(yearPrev).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-4 px-4 border-2 border-gray-400 text-right font-extrabold text-brand-900 text-sm bg-brand-100/50">Rp {getTotalKasAkhir(yearCurrent).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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

      {/* PERTANGGAL VIEW */}
      {activeTab === "Pertanggal" && (
        <div className="space-y-6 print:space-y-4">
          <PrintHeader
            title="Laporan Keuangan Pertanggal"
            subtitle={`Periode: ${new Date(filterStartDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} s.d. ${new Date(filterEndDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`}
          />

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
            <div className="bg-green-50 border border-green-200 p-6 rounded-2xl shadow-sm print:p-4 print:rounded-lg">
              <p className="text-green-800 text-sm font-medium mb-1">Total Pemasukan</p>
              <h4 className="text-2xl font-bold text-green-700 print:text-lg">
                Rp {totalPemasukanPertanggal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h4>
            </div>
            <div className="bg-red-50 border border-red-200 p-6 rounded-2xl shadow-sm print:p-4 print:rounded-lg">
              <p className="text-gray-500 text-sm font-medium mb-1">Total Pengeluaran</p>
              <h4 className="text-2xl font-bold text-red-600 print:text-lg">
                Rp {totalPengeluaranPertanggal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h4>
            </div>
            <div className={`p-6 rounded-2xl border shadow-sm print:p-4 print:rounded-lg ${selisihPertanggal >= 0 ? "bg-blue-50 border-blue-100" : "bg-orange-50 border-orange-100"}`}>
              <p className={`text-sm font-medium mb-1 ${selisihPertanggal >= 0 ? "text-blue-800" : "text-orange-800"}`}>
                Surplus / Defisit Bersih
              </p>
              <h4 className={`text-2xl font-bold print:text-lg ${selisihPertanggal >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                {selisihPertanggal >= 0 ? "+" : "-"} Rp{" "}
                {Math.abs(selisihPertanggal).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h4>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-2xl print:rounded-none shadow-sm print:shadow-none border border-gray-200 print:border-none overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 print:hidden flex items-center justify-between">
              <h3 className="font-bold text-gray-800">
                Detail Transaksi Keuangan ({pertanggalTransactions.length} Transaksi)
              </h3>
            </div>
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left text-sm whitespace-nowrap border-collapse animate-fade-in">
                <thead className="text-gray-750 font-bold bg-[#f3f4f6] print:bg-gray-200">
                  <tr>
                    <th className="px-4 py-3 print:py-2 border border-gray-200 print:border-gray-300">Tanggal</th>
                    <th className="px-4 py-3 print:py-2 border border-gray-200 print:border-gray-300">Nama / Keterangan</th>
                    <th className="px-4 py-3 print:py-2 border border-gray-200 print:border-gray-300">No. Rumah</th>
                    <th className="px-4 py-3 print:py-2 border border-gray-200 print:border-gray-300">Kategori</th>
                    <th className="px-4 py-3 print:py-2 border border-gray-200 print:border-gray-300">Periode</th>
                    <th className="px-4 py-3 print:py-2 border border-gray-200 print:border-gray-300">Lokasi Kas</th>
                    <th className="px-4 py-3 print:py-2 border border-gray-200 print:border-gray-300 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 print:divide-gray-300">
                  {pertanggalTransactions.map((t) => {
                    const isPemasukan = t.type === "Pemasukan";
                    const w = isPemasukan ? warga.find((w) => w.id === t.residentId) : null;
                    const categoryName = categories.find((c) => c.id === t.categoryId)?.name || "-";
                    const locationName = kasLocations.find((l) => l.id === t.kasLocationId)?.name || "-";
                    
                    // Format period
                    let periodText = "-";
                    if (t.periodeBulan && t.periodeTahun) {
                      const monthName = new Date(2000, t.periodeBulan - 1).toLocaleString("id-ID", { month: "long" });
                      periodText = `${monthName} ${t.periodeTahun}`;
                    } else if (t.periodeTahun) {
                      periodText = `Tahun ${t.periodeTahun}`;
                    }

                    return (
                      <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 print:py-2 border border-gray-100 print:border-gray-200 text-gray-600">
                          {new Date(t.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3 print:py-2 border border-gray-100 print:border-gray-200 font-medium text-gray-800">
                          {w ? w.namaKepalaKeluarga : (t.description || "-")}
                        </td>
                        <td className="px-4 py-3 print:py-2 border border-gray-100 print:border-gray-200 text-gray-600">
                          {w ? w.nomorRumah : "-"}
                        </td>
                        <td className="px-4 py-3 print:py-2 border border-gray-100 print:border-gray-200 text-gray-600">
                          {categoryName}
                        </td>
                        <td className="px-4 py-3 print:py-2 border border-gray-100 print:border-gray-200 text-gray-600">
                          {periodText}
                        </td>
                        <td className="px-4 py-3 print:py-2 border border-gray-100 print:border-gray-200 text-gray-600">
                          {locationName}
                        </td>
                        <td className={`px-4 py-3 print:py-2 border border-gray-100 print:border-gray-200 text-right font-bold ${isPemasukan ? "text-green-600" : "text-red-600"}`}>
                          {isPemasukan ? "+" : "-"} Rp {t.nominal.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    );
                  })}
                  {pertanggalTransactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        Tidak ada transaksi dalam rentang tanggal ini.
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

      {/* ARUS KAS VIEW */}
      {activeTab === "ArusKas" && (
        <div className="print:m-0">
          <PrintHeader title="Laporan Arus Kas" subtitle={`Periode Januari - Desember ${filterYearTahunan}`} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 print:hidden">
            <div className="bg-green-50 border border-green-200 p-5 rounded-2xl">
              <p className="text-green-700 text-xs font-bold uppercase tracking-wider mb-1">Total Pemasukan</p>
              <h4 className="text-xl font-bold text-green-800">Rp {totalArusKas.masuk.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
            </div>
            <div className="bg-red-50 border border-red-200 p-5 rounded-2xl">
              <p className="text-red-700 text-xs font-bold uppercase tracking-wider mb-1">Total Pengeluaran</p>
              <h4 className="text-xl font-bold text-red-800">Rp {totalArusKas.keluar.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
            </div>
            <div className={`p-5 rounded-2xl border ${totalArusKas.netto >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${totalArusKas.netto >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Arus Kas Bersih</p>
              <h4 className={`text-xl font-bold ${totalArusKas.netto >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                {totalArusKas.netto >= 0 ? '+' : ''} Rp {totalArusKas.netto.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h4>
            </div>
          </div>

          <div className="bg-white rounded-2xl print:rounded-none shadow-sm print:shadow-none border border-gray-200 print:border-none overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 print:bg-transparent flex items-center gap-2">
              <Landmark className="w-5 h-5 text-gray-400 print:hidden" />
              <h3 className="font-bold text-gray-800">Posisi Saldo Kas per Lokasi</h3>
            </div>

            {/* Tampilan Layar (Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6 print:hidden">
              {kasBalances.map(loc => (
                <div key={loc.id} className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
                  <div className="flex justify-between items-center w-full border-b border-gray-100 pb-2 mb-2">
                    <p className="font-semibold text-gray-800 flex items-center gap-1.5"><Landmark className="w-3.5 h-3.5 text-gray-400" /> {loc.name}</p>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold tracking-wider uppercase">{loc.type}</span>
                  </div>
                  <div className="space-y-1.5 mb-3">
                    <div className="flex justify-between w-full text-xs">
                      <span className="text-gray-500">Pemasukan</span>
                      <span className="font-semibold text-green-700">Rp {loc.masuk.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between w-full text-xs">
                      <span className="text-gray-500">Pengeluaran</span>
                      <span className="font-semibold text-red-600">Rp {loc.keluar.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <div className="flex justify-between w-full mt-auto items-center pt-2 border-t border-gray-100">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Saldo Akhir</span>
                    <span className="font-bold text-lg text-brand-700">Rp {loc.saldo.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                      <td className="py-2 px-4 border border-gray-400 text-right font-medium">Rp {loc.masuk.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-2 px-4 border border-gray-400 text-right font-medium">Rp {loc.keluar.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-2 px-4 border border-gray-400 text-right font-bold text-gray-900 bg-gray-50/50">Rp {loc.saldo.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  {/* Row Total */}
                  <tr className="bg-gray-100/80 print:bg-gray-100 print:!bg-gray-100">
                    <td colSpan={2} className="py-2.5 px-4 border border-gray-400 font-extrabold uppercase tracking-wider text-xs text-right">Total Keseluruhan</td>
                    <td className="py-2.5 px-4 border border-gray-400 text-right font-bold text-gray-900 text-sm">Rp {kasBalances.reduce((s, loc) => s + loc.masuk, 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-2.5 px-4 border border-gray-400 text-right font-bold text-gray-900 text-sm">Rp {kasBalances.reduce((s, loc) => s + loc.keluar, 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-2.5 px-4 border border-gray-400 text-right font-extrabold text-blue-900 bg-blue-100/50">Rp {kasBalances.reduce((s, loc) => s + loc.saldo, 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
                      <td className="px-4 py-2.5 border border-gray-200 text-right text-gray-600 font-medium">Rp {d.saldoAwal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2.5 border border-gray-200 text-right text-green-700 font-semibold">{d.masuk > 0 ? `Rp ${d.masuk.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</td>
                      <td className="px-4 py-2.5 border border-gray-200 text-right text-red-600 font-semibold">{d.keluar > 0 ? `Rp ${d.keluar.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</td>
                      <td className={`px-4 py-2.5 border border-gray-200 text-right font-bold ${d.netto >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {d.netto >= 0 ? '+' : ''}{d.netto !== 0 ? `Rp ${d.netto.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="px-4 py-2.5 border border-gray-200 text-right font-bold text-gray-900">Rp {d.saldoAkhir.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  {/* TOTAL ROW */}
                  <tr className="bg-gray-800 text-white print:bg-gray-200 print:text-gray-900">
                    <td className="px-4 py-3 border border-gray-600 print:border-gray-400 font-extrabold uppercase tracking-wider text-xs">Total</td>
                    <td className="px-4 py-3 border border-gray-600 print:border-gray-400 text-right font-bold">Rp {getSaldoAwal(filterYearTahunan).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 border border-gray-600 print:border-gray-400 text-right font-bold text-green-300 print:text-green-800">Rp {totalArusKas.masuk.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 border border-gray-600 print:border-gray-400 text-right font-bold text-red-300 print:text-red-800">Rp {totalArusKas.keluar.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className={`px-4 py-3 border border-gray-600 print:border-gray-400 text-right font-bold ${totalArusKas.netto >= 0 ? 'text-green-300 print:text-green-800' : 'text-red-300 print:text-red-800'}`}>
                      {totalArusKas.netto >= 0 ? '+' : ''}Rp {totalArusKas.netto.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 border border-gray-600 print:border-gray-400 text-right font-extrabold">Rp {getTotalKasAkhir(filterYearTahunan).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
              <h4 className="text-2xl font-bold text-blue-900 print:text-lg">Rp {saldoAwalBulanan.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
            </div>
            <div className="bg-brand-600 outline outline-4 outline-brand-600/20 text-white p-6 rounded-2xl shadow-sm print:bg-gray-800 print:rounded-lg print:p-4 print:outline-none">
              <p className="text-brand-100 text-sm font-medium mb-1 print:text-gray-300">Saldo Kas Akhir Bulan</p>
              <h4 className="text-2xl font-bold print:text-lg">Rp {saldoAkhirBulanan.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm print:p-4 print:rounded-lg">
              <p className="text-gray-500 text-sm font-medium mb-1">
                Penerimaan Bulan Ini
              </p>
              <h4 className="text-2xl font-bold text-green-600 print:text-lg">
                Rp {monthlyIn.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                Rp {monthlyOut.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                {Math.abs(monthlyIn - monthlyOut).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                      Rp {item.amount.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              <div className="text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                Tahun Rekap: {filterYear}
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
                    <th className="px-4 py-3 border-r border-gray-200 text-center uppercase tracking-widest text-gray-500 font-bold print:hidden">
                      Aksi
                    </th>
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
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                        const txInfo = w.paidMonthsMap?.get(m);
                        const isHadir = !!txInfo;
                        const isZeroNominal = isHadir && txInfo.nominal === 0;
                        const formattedDate = isHadir ? new Date(txInfo.date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) : "";
                        const tooltipText = isHadir 
                          ? `Lunas: ${formattedDate}\nNominal: Rp ${txInfo.nominal.toLocaleString("id-ID")}${isZeroNominal ? ' (Tanpa Kas)' : ''}\nKategori: ${txInfo.categoryName}` 
                          : "Belum Bayar";
                        
                        return (
                          <td key={m} className="px-2 py-2 border-r border-gray-100/50 text-center">
                            {isHadir ? (
                              <span 
                                title={tooltipText}
                                onClick={() => handleOpenCorrection(w)}
                                className={`cursor-pointer inline-flex w-5 h-5 items-center justify-center rounded-sm font-bold text-xs ring-1 transition-colors ${isZeroNominal ? 'bg-blue-50 text-blue-700 ring-blue-200/50 hover:bg-blue-150' : 'bg-green-100 text-green-700 ring-green-200/50 hover:bg-green-200'}`}
                              >
                                {isZeroNominal ? 'K' : '✓'}
                              </span>
                            ) : (
                              <span 
                                title="Belum Bayar - Klik untuk Koreksi" 
                                onClick={() => handleOpenCorrection(w)}
                                className="text-gray-350 hover:text-[#f43f5e] cursor-pointer inline-block w-5 h-5 font-bold transition-all"
                              >
                                -
                              </span>
                            )}
                          </td>
                        )
                      })}
                      <td className="px-2 py-2 border-r border-gray-100/50 text-center print:hidden">
                        <button
                          type="button"
                          onClick={() => handleOpenCorrection(w)}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded border border-blue-200 font-semibold text-[10px] uppercase transition-colors"
                        >
                          Koreksi
                        </button>
                      </td>
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
                        {(() => {
                          const templateSetting = settings['wa_template_tunggakan'] || `Om Swastyastu / Halo Bapak/Ibu {{nama}} (Blok {{blok}}),\n\nKami dari pengurus lingkungan ingin menginformasikan bahwa berdasarkan catatan pembukuan, terdapat tagihan iuran kas warga yang belum terselesaikan sebanyak *{{bulan}} bulan* di tahun berjalan.\n\nMohon konfirmasinya jika sudah melakukan pembayaran agar dapat kami perbarui di sistem. Jika belum, mohon kesediaannya untuk menyelesaikan tagihan tersebut.\n\nTerima kasih banyak atas partisipasi dan dukungannya. 🙏`;

                          const parsedMessage = templateSetting
                            .replace(/\{\{nama\}\}/g, w.namaKepalaKeluarga)
                            .replace(/\{\{blok\}\}/g, w.nomorRumah)
                            .replace(/\{\{bulan\}\}/g, String(w.missedMonthsCount));

                          const message = encodeURIComponent(parsedMessage);

                          const waLink = w.noHp
                            ? `https://wa.me/${w.noHp.replace(/^0/, "62")}?text=${message}`
                            : `https://wa.me/?text=${message}`;

                          return (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border text-green-700 bg-green-50 hover:bg-green-100 border-green-200 transition-colors shadow-sm"
                              title={w.noHp ? "Kirim WA ke warga" : "Pilih kontak di WA untuk mengirim pesan"}
                            >
                              Tagih via WA
                            </a>
                          );
                        })()}
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

      {/* Modal Koreksi Pembayaran Warga */}
      {correctionResident && activeCorrectionResident && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => setCorrectionResident(null)}
          ></div>
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center bg-blue-50 border-blue-100 flex-shrink-0">
              <div>
                <h3 className="font-bold text-lg text-blue-900">
                  Koreksi Pembayaran Iuran Warga
                </h3>
                <p className="text-sm text-blue-700">
                  {activeCorrectionResident.namaKepalaKeluarga} (Blok {activeCorrectionResident.nomorRumah}) • Tahun {filterYear}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCorrectionResident(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content Body (Split screen) */}
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
              {/* Kolom Kiri: Riwayat Pembayaran & Cepat Centang */}
              <div className="flex flex-col h-full min-h-0 space-y-4">
                {/* Mode Cepat Centang Matriks */}
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex-shrink-0">
                  <h4 className="font-bold text-blue-900 text-xs uppercase tracking-wider mb-2">Cepat Centang / Lunasi Periode</h4>
                  <p className="text-[10px] text-blue-700 mb-3 leading-relaxed">Centang bulan untuk melunasi instan tanpa dana masuk kas (Nominal Rp 0). Hapus centang untuk menghapus catatan transaksi bulan tersebut.</p>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                      // cari apakah ada transaksi untuk kategori iuran utama (bulanan) di bulan ini
                      const matchedTx = residentTransactions.find(t => t.periodeBulan === m);
                      const isLunas = !!matchedTx;
                      const defaultCat = categories.find(c => c.type === 'Pemasukan' && c.id !== 'cat-saldo-awal' && c.id !== 'cat-transfer');
                      
                      return (
                        <button
                          key={m}
                          type="button"
                          disabled={!defaultCat}
                          onClick={async () => {
                            if (isLunas) {
                              // Konfirmasi hapus transaksi
                              const confirmed = await confirm(
                                'Batalkan Pembayaran',
                                `Yakin membatalkan status lunas Bulan ${new Date(2000, m - 1).toLocaleString("id-ID", { month: "long" })}? Catatan transaksi akan dihapus.`,
                                'danger'
                              );
                              if (confirmed) {
                                deleteTransaction(matchedTx.id);
                              }
                            } else {
                              // Tambah instan Rp 0
                              if (!defaultCat) return;
                              addTransaction({
                                date: new Date().toISOString(),
                                categoryId: defaultCat.id,
                                type: "Pemasukan",
                                nominal: 0,
                                description: `Koreksi Rekap (Matriks)`,
                                kasLocationId: kasLocations[0]?.id || "default",
                                residentId: activeCorrectionResident.id,
                                periodeBulan: m,
                                periodeTahun: filterYear,
                              });
                            }
                          }}
                          className={`py-2 rounded-lg text-xs font-bold border transition-all ${isLunas ? 'bg-blue-600 text-white border-blue-700 shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                        >
                          {new Date(2000, m - 1).toLocaleString("id-ID", { month: "short" })}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col flex-1 min-h-0">
                  <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2 flex-shrink-0">
                    Riwayat Pembayaran Terdaftar ({residentTransactions.length} Transaksi)
                  </h4>
                  <div className="overflow-y-auto flex-1 space-y-3 pr-2">
                    {residentTransactions.map((tx) => {
                      const monthName = tx.periodeBulan
                        ? new Date(2000, tx.periodeBulan - 1).toLocaleString("id-ID", { month: "long" })
                        : "-";
                      return (
                        <div
                          key={tx.id}
                          className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-50 flex items-center justify-between shadow-sm transition-all"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                {monthName}
                              </span>
                              <span className="text-xs text-gray-500 font-medium">
                                {new Date(tx.date).toLocaleDateString("id-ID")}
                              </span>
                              {tx.nominal === 0 && (
                                <span className="font-semibold text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-250">
                                  Hanya Rekap
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              {categories.find((c) => c.id === tx.categoryId)?.name || "-"} •{" "}
                              {kasLocations.find((l) => l.id === tx.kasLocationId)?.name || "-"}
                            </p>
                            <p className="text-sm font-bold text-gray-900">
                              Rp {tx.nominal.toLocaleString("id-ID")}
                            </p>
                            {tx.description && (
                              <p className="text-[11px] text-gray-500 italic mt-0.5">
                                "{tx.description}"
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleSelectEditTx(tx)}
                              className="p-2 bg-white hover:bg-blue-50 border border-gray-200 text-blue-600 rounded-lg transition-colors shadow-sm"
                              title="Edit Pembayaran"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const confirmed = await confirm(
                                  'Hapus Catatan Pembayaran',
                                  'Hapus catatan pembayaran ini? Aksi ini akan seketika merubah data laporan rekap warga.',
                                  'danger'
                                );
                                if (confirmed) {
                                  deleteTransaction(tx.id);
                                  if (editingTx?.id === tx.id) {
                                    resetCorrForm();
                                  }
                                }
                              }}
                              className="p-2 bg-white hover:bg-red-50 border border-gray-200 text-red-600 rounded-lg transition-colors shadow-sm"
                              title="Hapus Pembayaran"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {residentTransactions.length === 0 && (
                      <p className="text-gray-500 text-center py-8 text-sm italic">
                        Belum ada transaksi pembayaran di tahun {filterYear}.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Form input (Tambah / Edit) */}
              <div className="flex flex-col h-full border-t md:border-t-0 md:border-l md:pl-6 pt-6 md:pt-0">
                <h4 className="font-bold text-gray-800 mb-4 text-sm border-b pb-2">
                  {editingTx ? "Form Edit Pembayaran" : "Form Tambah Pembayaran Baru"}
                </h4>
                <form onSubmit={handleSaveCorrection} className="space-y-4 flex-1">
                  <div>
                    <label className="block text-xs font-bold text-gray-650 mb-1">
                      Tanggal Pembayaran
                    </label>
                    <input
                      required
                      type="date"
                      value={corrDate}
                      onChange={(e) => setCorrDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-650 mb-1">
                        Periode Bulan
                      </label>
                      <select
                        required
                        value={corrMonth}
                        onChange={(e) => setCorrMonth(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <option key={m} value={m}>
                            {new Date(2000, m - 1).toLocaleString("id-ID", { month: "long" })}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-650 mb-1">
                        Kategori Iuran
                      </label>
                      <select
                        required
                        value={corrCategoryId}
                        onChange={handleCategoryChangeCorr}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="" disabled>Pilih Kategori...</option>
                        {incomeCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-650 mb-1">
                        Nominal Pembayaran (Rp)
                      </label>
                      <input
                        required={corrSaveToKas}
                        disabled={!corrSaveToKas}
                        type="text"
                        value={corrSaveToKas ? (Number(corrNominal || 0).toLocaleString('id-ID')) : "0"}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          setCorrNominal(raw);
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold disabled:bg-gray-100 disabled:text-gray-400"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-650 mb-1">
                        Simpan ke Kas / Rekening
                      </label>
                      <select
                        required
                        disabled={!corrSaveToKas}
                        value={corrLocationId}
                        onChange={(e) => setCorrLocationId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 font-medium disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        {kasLocations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} {loc.type !== "Tunai" ? `(${loc.type})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={corrSaveToKas}
                        onChange={(e) => setCorrSaveToKas(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-gray-700">Simpan sebagai Dana Masuk Kas (Buku Besar)</span>
                    </label>
                    <p className="text-[10px] text-gray-500 mt-1 pl-6">
                      Jika dinonaktifkan, pembayaran akan tercatat lunas di rekap matriks, namun nominal transaksi diset Rp 0 agar tidak mempengaruhi neraca kas/buku besar.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-650 mb-1">
                      Keterangan Tambahan (Opsional)
                    </label>
                    <input
                      type="text"
                      value={corrDescription}
                      onChange={(e) => setCorrDescription(e.target.value)}
                      placeholder="Contoh: Pembayaran iuran tunai via pengurus"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="pt-4 border-t flex justify-end gap-2">
                    {editingTx && (
                      <button
                        type="button"
                        onClick={resetCorrForm}
                        className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-150 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Batal Edit
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!corrCategoryId || (corrSaveToKas && !corrNominal)}
                      className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-md disabled:opacity-50"
                    >
                      {editingTx ? "Update Pembayaran" : "Simpan Pembayaran"}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setCorrectionResident(null)}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors"
              >
                Selesai / Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
