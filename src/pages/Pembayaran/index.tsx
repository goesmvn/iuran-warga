import { useState, useMemo, useCallback } from "react";
import { useTransaksi } from "../../hooks/useTransaksi";
import { useWarga } from "../../hooks/useWarga";
import { useCategory } from "../../hooks/useCategory";
import { useSettings } from "../../hooks/useSettings";
import { useKasLocation, DEFAULT_KAS_LOCATION_ID } from "../../hooks/useKasLocation";
import {
  Search,
  CheckSquare,
  Landmark,
  Wallet,
  Receipt as ReceiptIcon,
  Check,
  CalendarDays,
  X
} from "lucide-react";
import type { Transaction } from "../../types";
import { ReceiptModal, type ReceiptData } from "../../components/ReceiptModal";
import { useConfirm } from "../../contexts/ConfirmContext";
import { unpaidMonthsInYear } from "../../utils/iuran";

export default function Pembayaran() {
  const { transactions, addTransaction } = useTransaksi();
  const { warga, addWarga } = useWarga();
  const { categories } = useCategory();
  const { locations } = useKasLocation();
  const { alert: customAlert } = useConfirm();

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Form State Warga Baru Modal
  const [isWargaModalOpen, setIsWargaModalOpen] = useState(false);
  const [newNamaKepalaKeluarga, setNewNamaKepalaKeluarga] = useState("");
  const [newNomorRumah, setNewNomorRumah] = useState("");
  const [newNoHp, setNewNoHp] = useState("");
  const [newStatus, setNewStatus] = useState<"Aktif" | "Pindah">("Aktif");
  const [newTanggalMasuk, setNewTanggalMasuk] = useState(new Date().toISOString().split("T")[0]);

  const handleAddWargaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNamaKepalaKeluarga || !newNomorRumah || !newTanggalMasuk) {
      customAlert("Lengkapi Data", "Nama, Blok/No. Rumah, dan Tanggal Masuk wajib diisi.", "warning");
      return;
    }
    const payload = {
      namaKepalaKeluarga: newNamaKepalaKeluarga,
      nomorRumah: newNomorRumah,
      noHp: newNoHp,
      status: newStatus,
      tanggalMasuk: new Date(newTanggalMasuk).toISOString(),
    };
    try {
      const generatedId = `warga-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      // Override ID logic inside useWarga by sending payload with local ID
      await addWarga({ ...payload, id: generatedId } as any);
      setIsWargaModalOpen(false);
      
      // Auto select new warga after creation
      setResidentId(generatedId);
      
      // Reset form
      setNewNamaKepalaKeluarga("");
      setNewNomorRumah("");
      setNewNoHp("");
      setNewStatus("Aktif");
      setNewTanggalMasuk(new Date().toISOString().split("T")[0]);
      setSearchWarga("");
      customAlert("Sukses", "Warga baru berhasil ditambahkan.", "success");
    } catch (err) {
      console.error(err);
      customAlert("Gagal", `Gagal menambahkan warga baru. ${err instanceof Error ? err.message : ''}`, "error");
    }
  };
  const [kasLocationId, setKasLocationId] = useState(DEFAULT_KAS_LOCATION_ID);

  const [searchWarga, setSearchWarga] = useState("");
  const [residentId, setResidentId] = useState("");
  // Pilihan periode per iuran: bulan untuk iuran bulanan, tahun untuk iuran tahunan
  const [monthsByCat, setMonthsByCat] = useState<Record<string, { bulan: number; tahun: number }[]>>({});
  const [yearByCat, setYearByCat] = useState<Record<string, number>>({});
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  
  const yearOptions = Array.from({length: 7}, (_, i) => new Date().getFullYear() - 2 + i);

  // Categories Selection State: { categoryId: nominal }
  const [selectedCategories, setSelectedCategories] = useState<Record<string, number>>({});

  const incomes = categories.filter((c) => c.type === "Pemasukan" && c.showInPayment !== false);

  const filteredWarga = useMemo(() => {
    if (!searchWarga.trim()) return warga.slice(0, 5);
    const lower = searchWarga.toLowerCase();
    return warga
      .filter(
        (w) =>
          w.namaKepalaKeluarga.toLowerCase().includes(lower) ||
          w.nomorRumah.toLowerCase().includes(lower),
      )
      .slice(0, 5);
  }, [searchWarga, warga]);

  const periodicCategories = useMemo(() => {
     return Object.keys(selectedCategories).filter(cid => {
         const cat = categories.find(c => c.id === cid);
         return cat?.name.toLowerCase().includes("bulanan") || cat?.periode === "Bulanan";
     });
  }, [selectedCategories, categories]);

  const tahunanCategories = useMemo(() => {
     return Object.keys(selectedCategories).filter(cid => {
         const cat = categories.find(c => c.id === cid);
         return cat?.name.toLowerCase().includes("tahunan") || cat?.periode === "Tahunan";
     });
  }, [selectedCategories, categories]);

  // Status lunas dihitung per kategori, agar beberapa iuran bulanan bisa dibayar sekaligus tanpa saling
  // memblokir (mis. Iuran Wajib Nov sudah lunas tapi Uang Keamanan Nov belum).
  const { paidByCategory, tahunanPaidSet, anyPaidSet } = useMemo(() => {
    const byCategory = new Map<string, Set<string>>();
    const tahunan = new Set<string>();
    const any = new Set<string>();
    if (!residentId) return { paidByCategory: byCategory, tahunanPaidSet: tahunan, anyPaidSet: any };

    const bulananCids = categories.filter(c => c.name.toLowerCase().includes("bulanan") || c.periode === "Bulanan").map(c => c.id);
    const tahunanCids = categories.filter(c => c.name.toLowerCase().includes("tahunan") || c.periode === "Tahunan").map(c => c.id);

    const paidTransactions = transactions.filter(
      (t) => t.type === "Pemasukan" && t.residentId === residentId && (!t.status || t.status === "Success")
    );

    paidTransactions.forEach(t => {
        if (!t.periodeTahun) return;
        // Bayar bulanan
        if (t.periodeBulan && bulananCids.includes(t.categoryId)) {
            const key = `${t.periodeTahun}-${t.periodeBulan}`;
            if (!byCategory.has(t.categoryId)) byCategory.set(t.categoryId, new Set());
            byCategory.get(t.categoryId)!.add(key);
            any.add(key);
        }
        // Jika bayar tahunan, otomatis cetang/anggap lunas 12 bulan
        if (tahunanCids.includes(t.categoryId)) {
            for (let i = 1; i <= 12; i++) {
                tahunan.add(`${t.periodeTahun}-${i}`);
                any.add(`${t.periodeTahun}-${i}`);
            }
        }
    });
    return { paidByCategory: byCategory, tahunanPaidSet: tahunan, anyPaidSet: any };
  }, [residentId, categories, transactions]);

  const isPaidFor = useCallback(
    (cid: string, key: string) => tahunanPaidSet.has(key) || !!paidByCategory.get(cid)?.has(key),
    [paidByCategory, tahunanPaidSet]
  );


  const totalBulananNominal = useMemo(() => {
    return categories.filter(c => (c.periode === 'Bulanan' || c.name.toLowerCase().includes('bulanan')) && c.type === 'Pemasukan').reduce((acc, c) => acc + (c.defaultNominal || 0), 0);
  }, [categories]);

  const { settings } = useSettings();
  const startYear = parseInt(settings['start_year'] || new Date().getFullYear().toString(), 10);
  const currentYear = new Date().getFullYear();

  const tunggakanStats = useMemo(() => {
    if (!residentId) return null;
    
    const arrearsList: { year: number; unpaid: number; nominal: number }[] = [];
    let totalNominal = 0;
    let totalUnpaid = 0;

    for (let y = currentYear; y >= startYear; y--) {
        // Hanya bulan yang sudah jatuh tempo (tahun ini: s/d bulan berjalan)
        const unpaid = unpaidMonthsInYear(anyPaidSet, y).length;
        if (unpaid > 0) {
            const nominal = unpaid * totalBulananNominal;
            arrearsList.push({ year: y, unpaid, nominal });
            totalNominal += nominal;
            totalUnpaid += unpaid;
        }
    }
    
    return { arrearsList, totalNominal, totalUnpaid, isLunas: totalUnpaid === 0 };
  }, [residentId, anyPaidSet, startYear, currentYear, totalBulananNominal]);

  const toggleCategory = (cid: string, defaultNominal: number = 0) => {
      setSelectedCategories(prev => {
          const next = { ...prev };
          if (next[cid] !== undefined) {
              delete next[cid];
              setMonthsByCat(m => { const rest = { ...m }; delete rest[cid]; return rest; });
          } else {
              next[cid] = defaultNominal;
          }
          return next;
      });
  };

  const updateCategoryNominal = (cid: string, value: string) => {
      const numericValue = parseInt(value.replace(/\D/g, ""), 10);
      setSelectedCategories(prev => ({ ...prev, [cid]: isNaN(numericValue) ? 0 : numericValue }));
  };

  const yearOf = (cid: string) => yearByCat[cid] ?? currentYear;

  // Tahun yang sedang dibayar lunas lewat iuran tahunan di transaksi ini (bulan di tahun tsb sudah tercakup)
  const tahunanYearsSelected = new Set(tahunanCategories.map(yearOf));

  const toggleMonthSelection = (cid: string, m: number, y: number) => {
    setMonthsByCat((prev) => {
      const current = prev[cid] || [];
      const exists = current.some((p) => p.bulan === m && p.tahun === y);
      return {
        ...prev,
        [cid]: exists ? current.filter((p) => !(p.bulan === m && p.tahun === y)) : [...current, { bulan: m, tahun: y }],
      };
    });
  };

  // Bulan terpilih yang belum lunas untuk kategori tertentu (bulan yang sudah lunas dilewati, tidak ditagih dobel)
  const monthsToPayFor = (cid: string) =>
    (monthsByCat[cid] || [])
      .filter(sm => !isPaidFor(cid, `${sm.tahun}-${sm.bulan}`) && !tahunanYearsSelected.has(sm.tahun))
      .sort((a, b) => a.tahun - b.tahun || a.bulan - b.bulan);

  let grandTotal = 0;
  const summaryDetails: { title: string; subTotal: number; id: string }[] = [];

  Object.keys(selectedCategories).forEach(cid => {
      const cat = categories.find(c => c.id === cid);
      const isTahunan = cat?.name.toLowerCase().includes("tahunan") || cat?.periode === "Tahunan";
      const isPeriodic = periodicCategories.includes(cid) && !isTahunan;
      const nom = selectedCategories[cid] || 0;

      if (isTahunan) {
          summaryDetails.push({ id: cid, title: `${cat?.name} (Lunas Tahun ${yearOf(cid)})`, subTotal: nom });
          grandTotal += nom;
      } else if (isPeriodic) {
          const count = monthsToPayFor(cid).length;
          const subTotal = nom * count;
          if (count > 0) {
              summaryDetails.push({ id: cid, title: `${cat?.name} (${count} bulan)`, subTotal });
              grandTotal += subTotal;
          } else {
              summaryDetails.push({ id: cid, title: `${cat?.name} (Harap pilih bulan)`, subTotal: 0 });
          }
      } else {
          summaryDetails.push({ id: cid, title: cat?.name || 'Lainnya', subTotal: nom });
          grandTotal += nom;
      }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const catIds = Object.keys(selectedCategories);

    if (!residentId || catIds.length === 0 || !kasLocationId) {
      customAlert("Lengkapi Data", "Mohon lengkapi data Warga dan minimal pilih 1 kategori pemasukan.", "warning");
      return;
    }

    const withoutMonths = periodicCategories.filter(cid => monthsToPayFor(cid).length === 0);
    if (withoutMonths.length > 0) {
      const names = withoutMonths.map(cid => categories.find(c => c.id === cid)?.name).join(", ");
      customAlert("Pilih Bulan", `Pilih minimal 1 bulan untuk: ${names}.`, "warning");
      return;
    }
    
    if (grandTotal <= 0 && catIds.length > 0) {
      customAlert("Total Salah", "Total pembayaran tidak valid.", "error");
      return;
    }

    // Validasi semua kategori DULU, agar tidak ada yang tersimpan sebagian
    for (const cid of tahunanCategories) {
      const y = yearOf(cid);
      // Jika ada bulan di tahun ini yang sudah lunas, iuran tahunan tidak bisa disubmit (karena akan double)
      if (Array.from({ length: 12 }, (_, i) => i + 1).some(m => anyPaidSet.has(`${y}-${m}`))) {
        customAlert("Gagal", `Beberapa bulan pada Tahun ${y} sudah memiliki transaksi pembayaran. Batalkan transaksi lama terlebih dahulu.`, "error");
        return;
      }
    }
    // Simpan daftar bulan per kategori sebelum state transaksi berubah (dipakai juga untuk kwitansi)
    const monthsByCategory: Record<string, { bulan: number; tahun: number }[]> = {};
    periodicCategories.forEach(cid => { monthsByCategory[cid] = monthsToPayFor(cid); });

    const refId = "TRX-" + Date.now().toString().slice(-6);

    const txPromises: Promise<any>[] = [];

    catIds.forEach(cid => {
       const cat = categories.find(c => c.id === cid);
       const isTahunan = cat?.name.toLowerCase().includes("tahunan") || cat?.periode === "Tahunan";
       const isPeriodic = periodicCategories.includes(cid) && !isTahunan;
       const nom = Number(selectedCategories[cid] || 0);

       if (nom <= 0) return;

       if (isTahunan) {
            const payload: Omit<Transaction, "id"> = {
              date: new Date(date).toISOString(),
              categoryId: cid,
              type: "Pemasukan",
              nominal: Number(nom),
              description: `Pembayaran ${cat?.name || 'Iuran Tahunan'} Tahun ${yearOf(cid)}`,
              residentId,
              periodeTahun: yearOf(cid),
              kasLocationId
            };
            txPromises.push(addTransaction(payload));
       } else if (isPeriodic) {
          // Hanya bulan yang belum lunas untuk kategori ini (cegah double input)
          (monthsByCategory[cid] || []).forEach((sm) => {
            const payload: Omit<Transaction, "id"> = {
              date: new Date(date).toISOString(),
              categoryId: cid,
              type: "Pemasukan",
              nominal: Number(nom),
              description: `Pembayaran ${cat?.name || 'Iuran'} ${sm.bulan}/${sm.tahun}`,
              residentId,
              periodeBulan: sm.bulan,
              periodeTahun: sm.tahun,
              kasLocationId
            };
            txPromises.push(addTransaction(payload));
          });
       } else if (!isPeriodic && !isTahunan) {
          const payload: Omit<Transaction, "id"> = {
              date: new Date(date).toISOString(),
              categoryId: cid,
              type: "Pemasukan",
              nominal: Number(nom),
              description: `Pemasukan Kas (${cat?.name})`,
              residentId,
              kasLocationId
          };
          txPromises.push(addTransaction(payload));
       }
    });

    // Tunggu semua transaksi tersimpan dulu; kwitansi hanya tampil jika server benar-benar menyimpan
    if (txPromises.length === 0) return;
    try {
      await Promise.all(txPromises);
    } catch (err) {
      console.error("Gagal menyimpan beberapa transaksi:", err);
      customAlert("Gagal Menyimpan", `Pembayaran tidak tersimpan ke database. ${err instanceof Error ? err.message : ''}`, "error");
      return;
    }

    const kasLocName = locations.find(l => l.id === kasLocationId)?.name || 'Pusat';
    const activeWarga = warga.find(w => w.id === residentId);

    setReceiptData({
      date: new Date(date).toISOString(),
      residentName: activeWarga?.namaKepalaKeluarga || 'Warga',
      residentBlock: activeWarga?.nomorRumah || 'Blok',
      items: summaryDetails.map(item => {
        const cat = categories.find(c => c.id === item.id);
        const isTahunan = cat?.name.toLowerCase().includes("tahunan") || cat?.periode === "Tahunan";
        const isPeriodic = periodicCategories.includes(item.id) && !isTahunan;
        if (isPeriodic && monthsByCategory[item.id]?.length) {
          const monthsStr = monthsByCategory[item.id]
            .map(sm => `${new Date(2000, sm.bulan - 1).toLocaleString("id-ID", { month: "short" })} ${sm.tahun}`)
            .join(", ");
          return { ...item, title: `${item.title} [${monthsStr}]` };
        }
        if (isTahunan) {
          return item;
        }
        return item;
      }),
      total: grandTotal,
      kasName: kasLocName,
      transactionId: refId
    });
    // Reset Form (handled on receipt modal close now to prevent UI flickering)
  };

  const monthLabel = (m: number) => new Date(2000, m - 1).toLocaleString("id-ID", { month: "short" });

  const renderPeriodPicker = (cid: string) => {
    const isTahunan = tahunanCategories.includes(cid);
    const year = yearOf(cid);
    const yearSelect = (
      <select value={year} onChange={(e) => setYearByCat(prev => ({ ...prev, [cid]: Number(e.target.value) }))} className="px-3 py-1.5 rounded-lg border border-orange-300 text-sm font-bold text-orange-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20">
        {yearOptions.map((y) => <option key={y} value={y}>Tahun {y}</option>)}
      </select>
    );

    if (isTahunan) {
      return (
        <div className="mt-2 pl-8 flex items-center gap-3 flex-wrap animate-in slide-in-from-top-2 duration-200">
          {yearSelect}
          <p className="text-xs text-orange-800">Melunasi seluruh iuran bulanan selama <b>Tahun {year}</b>.</p>
        </div>
      );
    }

    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const locked = (m: number) => isPaidFor(cid, `${year}-${m}`) || tahunanYearsSelected.has(year);
    const allLocked = months.every(locked);
    const chosen = monthsToPayFor(cid);

    return (
      <div className="mt-2 pl-8 space-y-3 animate-in slide-in-from-top-2 duration-200">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs font-bold text-orange-800">Pilih bulan yang dibayar:</span>
          {yearSelect}
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {months.map((m) => {
            const isPaid = isPaidFor(cid, `${year}-${m}`);
            const isCovered = !isPaid && tahunanYearsSelected.has(year);
            const isSelected = !isPaid && !isCovered && (monthsByCat[cid] || []).some((s) => s.bulan === m && s.tahun === year);
            return (
              <button
                  type="button" key={m} disabled={isPaid || isCovered} onClick={() => toggleMonthSelection(cid, m, year)}
                  title={isPaid ? "Sudah lunas" : isCovered ? "Tercakup iuran tahunan" : undefined}
                  className={`px-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                    isPaid || isCovered ? "bg-green-100/30 text-green-700 border-green-100 cursor-not-allowed opacity-70" : isSelected ? "bg-[#f43f5e] text-white border-[#e11d48] shadow-md transform scale-105" : "bg-white text-orange-800 border-orange-200 hover:bg-orange-100 hover:border-orange-300 hover:-translate-y-0.5"
                  }`}
              >
                  {isPaid || isCovered ? <Check className="w-4 h-4 text-green-500" /> : <span className="w-4 h-4" />}
                  <span className="uppercase text-[11px] tracking-wider">{monthLabel(m)}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-orange-700">
          {!residentId
            ? "Pilih warga dulu agar bulan yang sudah lunas ditandai ✓."
            : allLocked
              ? `Semua bulan Tahun ${year} sudah lunas (✓). Ganti tahun untuk bayar di muka.`
              : chosen.length > 0
                ? `Dipilih: ${chosen.map(sm => `${monthLabel(sm.bulan)}${sm.tahun !== year ? ` ${sm.tahun}` : ""}`).join(", ")} (${chosen.length} bulan) · ✓ = sudah lunas`
                : "Klik bulan yang mau dibayar · ✓ = sudah lunas"}
        </p>
      </div>
    );
  };

  const getResidentName = (id?: string) =>
    warga.find((w) => w.id === id)?.namaKepalaKeluarga || "-";

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="mb-8 border-b border-gray-100 pb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center print:hidden">
        <div>
           <h2 className="text-2xl font-bold text-gray-900 font-display flex items-center gap-2">
              <ReceiptIcon className="w-6 h-6 text-[#f43f5e]" /> Terima Pembayaran 
           </h2>
           <p className="text-gray-500 mt-1">
             Catat uang iuran dengan fitur pembayaran kategori ganda.
           </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6 relative print:hidden">
      
        {/* Left Column: Form Controls */}
        <div className="flex-1 space-y-6">
           <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 md:p-8 space-y-8">
              {/* Section 1: Tanggal & Akun */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Tanggal Diterima</label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full pl-10 pr-4 h-[44px] rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f43f5e]/20 focus:border-[#f43f5e] bg-gray-50 text-gray-900 font-medium" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Masuk Ke Lokasi Kas</label>
                  <div className="relative">
                    <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select required value={kasLocationId} onChange={e => setKasLocationId(e.target.value)} className="w-full pl-10 pr-4 h-[44px] rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f43f5e]/20 focus:border-[#f43f5e] bg-gray-50 font-medium text-gray-900 appearance-none">
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name} {loc.type !== 'Tunai' ? `(${loc.type})` : ''}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100"></div>

              {/* Section 2: Warga */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-bold text-gray-700">Identitas Pendana / Warga</label>
                  {!residentId && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewNamaKepalaKeluarga(searchWarga);
                        setIsWargaModalOpen(true);
                      }}
                      className="text-xs font-bold text-[#f43f5e] hover:text-[#e11d48] transition-colors flex items-center gap-1"
                    >
                      + Tambah Warga Baru
                    </button>
                  )}
                </div>
                {!residentId ? (
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Ketik nama atau no rumah..." value={searchWarga} onChange={(e) => setSearchWarga(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#f43f5e]/30 focus:ring-2 focus:ring-[#f43f5e]/20 focus:border-[#f43f5e] shadow-sm text-gray-900" />
                    
                    {searchWarga.length > 0 && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-100 shadow-xl rounded-xl overflow-hidden divide-y">
                        {filteredWarga.map((w) => (
                          <div key={w.id} onClick={() => setResidentId(w.id)} className="px-4 py-3 hover:bg-orange-50 cursor-pointer flex justify-between items-center text-sm transition-colors">
                            <div>
                              <span className="font-bold text-gray-900 text-base">{w.namaKepalaKeluarga}</span>
                              <p className="text-gray-500 font-medium mt-0.5">Blok {w.nomorRumah}</p>
                            </div>
                            <span className="text-orange-600 bg-orange-100 px-3 py-1 rounded-lg font-bold text-xs">Pilih</span>
                          </div>
                        ))}
                        {filteredWarga.length === 0 && (
                          <div
                            onClick={() => {
                              setNewNamaKepalaKeluarga(searchWarga);
                              setIsWargaModalOpen(true);
                            }}
                            className="px-4 py-4 hover:bg-orange-50 cursor-pointer text-center text-sm text-gray-500 font-medium transition-colors"
                          >
                            Warga tidak ditemukan. Klik untuk <span className="text-[#f43f5e] font-bold">Tambah Warga Baru "{searchWarga}"</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="bg-green-50/50 border border-green-200 py-3 px-4 rounded-xl flex justify-between items-center group">
                      <div className="pr-4">
                        <p className="text-[10px] uppercase font-bold text-green-600 tracking-wider mb-0.5">Warga Terpilih</p>
                        <div className="font-bold text-green-900 text-lg leading-tight">
                          {getResidentName(residentId)} <span className="text-green-700 font-medium text-sm">(Blok {warga.find(w => w.id === residentId)?.nomorRumah})</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => setResidentId("")} className="text-sm font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap opacity-0 group-hover:opacity-100">Ganti</button>
                    </div>

                    {tunggakanStats && (
                      <div className={`p-4 rounded-xl border flex flex-col gap-3 animate-in slide-in-from-bottom-2 duration-300 ${tunggakanStats.isLunas ? 'bg-green-50 border-green-200' : 'bg-[#f43f5e]/10 border-orange-200'}`}>
                         <div className="flex sm:items-center justify-between gap-3">
                             <div>
                                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${tunggakanStats.isLunas ? 'text-green-600' : 'text-orange-700'}`}>Status Keseluruhan Iuran Pokok</p>
                                {tunggakanStats.isLunas ? (
                                   <h4 className="text-lg font-bold text-green-700 flex items-center gap-1.5"><Check className="w-5 h-5"/> Lunas 100%</h4>
                                ) : (
                                   <h4 className="text-lg font-bold text-gray-900">
                                     Total Tunggakan: <span className="text-[#e11d48]">Rp {tunggakanStats.totalNominal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                   </h4>
                                )}
                             </div>
                             {!tunggakanStats.isLunas && (
                                <div className="text-left sm:text-right">
                                   <span className="bg-orange-100 text-orange-800 font-bold px-3 py-1.5 rounded-lg text-sm whitespace-nowrap">{tunggakanStats.totalUnpaid} Bulan Kosong</span>
                                </div>
                             )}
                         </div>
                         {!tunggakanStats.isLunas && (
                            <div className="border-t border-orange-200/50 pt-2 flex flex-col gap-1 mt-1">
                                <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wider mb-0.5">Rincian Per Tahun:</p>
                                {tunggakanStats.arrearsList.map(a => (
                                    <div key={a.year} className="flex justify-between items-center text-sm bg-white/50 px-2 py-1.5 rounded">
                                        <span className="font-bold text-gray-700">Tahun {a.year}</span>
                                        <div className="text-right flex items-center gap-2">
                                            <span className="text-gray-500 font-medium text-[11px]">{a.unpaid} bln</span>
                                            <span className="font-bold text-[#e11d48]">Rp {a.nominal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                         )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 3: Kategori (Multiselect) */}
              <div>
                 <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center justify-between">
                    <span>Pilih Iuran / Kontribusi (Bisa Lebih Dari 1)</span>
                 </label>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {incomes.map(c => {
                       const isSelected = selectedCategories[c.id] !== undefined;
                       const hasPeriodPicker = isSelected && (periodicCategories.includes(c.id) || tahunanCategories.includes(c.id));
                       return (
                           <div key={c.id} className={`flex flex-col gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer ${hasPeriodPicker ? 'sm:col-span-2' : ''} ${isSelected ? 'border-[#f43f5e] bg-orange-50/50 shadow-sm' : 'border-gray-100 hover:border-orange-200 bg-white'}`}>
                              <div className="flex items-center gap-3" onClick={() => toggleCategory(c.id, c.defaultNominal || 0)}>
                                  <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-[#f43f5e] border-[#f43f5e] text-white' : 'border-gray-300 bg-white'}`}>
                                     {isSelected && <Check className="w-3.5 h-3.5" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <h4 className={`font-bold text-sm truncate ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>{c.name}</h4>
                                      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mt-0.5">{c.periode}</p>
                                  </div>
                              </div>
                              {isSelected && (
                                  <div className="mt-1 pl-8 animate-in slide-in-from-top-2 duration-200">
                                      <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-gray-500">Rp</span>
                                          <input 
                                              type="text" 
                                              value={selectedCategories[c.id] !== undefined ? selectedCategories[c.id].toLocaleString('id-ID') : ''} 
                                              onChange={(e) => updateCategoryNominal(c.id, e.target.value)}
                                              className="w-full bg-white border border-orange-200 focus:border-[#f43f5e] focus:ring-1 focus:ring-[#f43f5e] rounded-lg px-2 py-1.5 text-sm font-bold text-gray-900"
                                              onClick={e => e.stopPropagation()}
                                          />
                                      </div>
                                  </div>
                              )}
                              {/* Periode langsung di bawah iuran yang dipilih */}
                              {hasPeriodPicker && renderPeriodPicker(c.id)}
                           </div>
                       )
                    })}
                 </div>
              </div>

           </div>
        </div>

        {/* Right Column: Floating Summary */}
        <div className="w-full lg:w-80 flex-shrink-0">
            <div className="sticky top-24 bg-gray-900 rounded-2xl shadow-xl overflow-hidden p-6 text-white text-sm">
                <div className="flex items-center gap-2 mb-6 text-gray-400">
                    <Wallet className="w-5 h-5 text-gray-300" />
                    <h3 className="font-bold text-gray-100 text-base uppercase tracking-widest">Ringkasan</h3>
                </div>

                <div className="space-y-4 mb-6 relative">
                    {summaryDetails.length > 0 ? summaryDetails.map((item) => (
                        <div key={item.id} className="flex justify-between items-start gap-4">
                            <span className="text-gray-300 leading-tight">{item.title}</span>
                            <span className="font-bold whitespace-nowrap">Rp {item.subTotal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    )) : (
                        <div className="text-gray-500 text-center py-4 border border-dashed border-gray-700 rounded-lg">Belum ada rincian iuran terpilih.</div>
                    )}
                </div>

                <div className="pt-4 border-t border-gray-700 mb-8">
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-gray-400 font-bold uppercase tracking-widest textxs">Total Tagihan</span>
                        <span className="text-[#f43f5e] text-2xl font-bold font-display tracking-tight leading-none">Rp {grandTotal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <button type="submit" disabled={!residentId || Object.keys(selectedCategories).length === 0 || !kasLocationId || periodicCategories.some(cid => monthsToPayFor(cid).length === 0)} className="w-full py-4 text-sm font-bold text-white bg-[#f43f5e] hover:bg-[#e11d48] disabled:opacity-50 disabled:hover:bg-[#f43f5e] disabled:cursor-not-allowed rounded-xl transition-all shadow-lg shadow-[#f43f5e]/20 flex justify-center items-center gap-2 group">
                   <CheckSquare className="w-5 h-5 group-disabled:opacity-50" />
                   Simpan & Cetak
                </button>
                <p className="text-center text-xs text-gray-500 mt-4 px-4 leading-relaxed">
                   Pastikan nominal donasi atau iuran sudah dititipkan/ditransfer sebelum direkam.
                </p>
            </div>
        </div>

      </form>
      
      <ReceiptModal 
        isOpen={!!receiptData} 
        onClose={() => {
          setReceiptData(null);
          // Reset form state ONLY after modal is closed
          setSearchWarga("");
          setResidentId("");
          setMonthsByCat({});
          setYearByCat({});
          setSelectedCategories({});
        }} 
        data={receiptData} 
      />

      {/* Simple Warga Modal */}
      {isWargaModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsWargaModalOpen(false)}></div>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-800">Tambah Warga Baru</h3>
              <button
                type="button"
                onClick={() => setIsWargaModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddWargaSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Nama Kepala Keluarga *</label>
                <input
                  required
                  type="text"
                  placeholder="I Wayan Darma"
                  value={newNamaKepalaKeluarga}
                  onChange={(e) => setNewNamaKepalaKeluarga(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#f43f5e] font-bold text-sm text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Blok / No. Rumah *</label>
                <input
                  required
                  type="text"
                  placeholder="Blok A/12"
                  value={newNomorRumah}
                  onChange={(e) => setNewNomorRumah(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#f43f5e] font-bold text-sm text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">No. Handphone</label>
                <input
                  type="text"
                  placeholder="08..."
                  value={newNoHp}
                  onChange={(e) => setNewNoHp(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#f43f5e] font-bold text-sm text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Status *</label>
                <select
                  required
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as "Aktif" | "Pindah")}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#f43f5e] font-bold text-sm text-gray-900"
                >
                  <option value="Aktif">Aktif Menetap</option>
                  <option value="Pindah">Pindah</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Tanggal Masuk *</label>
                <input
                  required
                  type="date"
                  value={newTanggalMasuk}
                  onChange={(e) => setNewTanggalMasuk(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#f43f5e] font-bold text-sm text-gray-900"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-[#f43f5e] hover:bg-[#e11d48] text-white font-bold py-2.5 rounded-lg transition-colors text-sm"
                >
                  Simpan Warga
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
