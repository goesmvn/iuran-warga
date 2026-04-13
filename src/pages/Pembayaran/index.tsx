import { useState, useMemo, useEffect } from "react";
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
  Check
} from "lucide-react";
import type { Transaction } from "../../types";
import { ReceiptModal, type ReceiptData } from "../../components/ReceiptModal";

export default function Pembayaran() {
  const { transactions, addTransaction } = useTransaksi();
  const { warga } = useWarga();
  const { categories } = useCategory();
  const { locations } = useKasLocation();

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [kasLocationId, setKasLocationId] = useState(DEFAULT_KAS_LOCATION_ID);

  const [searchWarga, setSearchWarga] = useState("");
  const [residentId, setResidentId] = useState("");
  const [selectedMonths, setSelectedMonths] = useState<
    { bulan: number; tahun: number }[]
  >([]);
  const [paymentYear, setPaymentYear] = useState<number>(new Date().getFullYear());
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
         return cat?.name.toLowerCase().includes("bulanan") || cat?.periode === "Bulanan" || 
                cat?.name.toLowerCase().includes("tahunan") || cat?.periode === "Tahunan";
     });
  }, [selectedCategories, categories]);

  const hasPeriodic = periodicCategories.length > 0;

  const paidSet = useMemo(() => {
    if (!residentId) return new Set<string>();
    
    const bulananCids = categories.filter(c => c.name.toLowerCase().includes("bulanan") || c.periode === "Bulanan").map(c => c.id);
    const tahunanCids = categories.filter(c => c.name.toLowerCase().includes("tahunan") || c.periode === "Tahunan").map(c => c.id);

    const paidTransactions = transactions.filter(
      (t) => t.type === "Pemasukan" && t.residentId === residentId
    );

    const set = new Set<string>();
    paidTransactions.forEach(t => {
        if (t.periodeTahun) {
            // Bayar bulanan
            if (t.periodeBulan && (bulananCids.includes(t.categoryId) || periodicCategories.includes(t.categoryId))) {
                set.add(`${t.periodeTahun}-${t.periodeBulan}`);
            }
            // Jika bayar tahunan, otomatis cetang/anggap lunas 12 bulan
            if (tahunanCids.includes(t.categoryId)) {
                for (let i = 1; i <= 12; i++) {
                    set.add(`${t.periodeTahun}-${i}`);
                }
            }
        }
    });
    return set;
  }, [residentId, categories, transactions, periodicCategories]);

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
        let paidCount = 0;
        for (let i = 1; i <= 12; i++) {
            if (paidSet.has(`${y}-${i}`)) paidCount++;
        }
        const unpaid = 12 - paidCount;
        if (unpaid > 0) {
            const nominal = unpaid * totalBulananNominal;
            arrearsList.push({ year: y, unpaid, nominal });
            totalNominal += nominal;
            totalUnpaid += unpaid;
        }
    }
    
    return { arrearsList, totalNominal, totalUnpaid, isLunas: totalUnpaid === 0 };
  }, [residentId, paidSet, startYear, currentYear, totalBulananNominal]);

  const toggleCategory = (cid: string, defaultNominal: number = 0) => {
      setSelectedCategories(prev => {
          const next = { ...prev };
          if (next[cid] !== undefined) {
              delete next[cid];
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

  const toggleMonthSelection = (m: number, y: number) => {
    setSelectedMonths((prev) => {
      const exists = prev.find((p) => p.bulan === m && p.tahun === y);
      if (exists) return prev.filter((p) => !(p.bulan === m && p.tahun === y));
      return [...prev, { bulan: m, tahun: y }];
    });
  };

  // Auto-check 12 months if Tahunan is selected
  useEffect(() => {
      const hasTahunan = Object.keys(selectedCategories).some(cid => {
          const cat = categories.find(c => c.id === cid);
          return cat?.name.toLowerCase().includes("tahunan") || cat?.periode === "Tahunan";
      });
      if (hasTahunan) {
          setSelectedMonths(prev => {
              const newSet = [...prev];
              let changed = false;
              for (let i = 1; i <= 12; i++) {
                  if (!paidSet.has(`${paymentYear}-${i}`) && !newSet.some(s => s.bulan === i && s.tahun === paymentYear)) {
                      newSet.push({ bulan: i, tahun: paymentYear });
                      changed = true;
                  }
              }
              return changed ? newSet : prev;
          });
      }
  }, [paymentYear, selectedCategories, paidSet, categories]);

  let grandTotal = 0;
  const summaryDetails: { title: string; subTotal: number; id: string }[] = [];

  Object.keys(selectedCategories).forEach(cid => {
      const cat = categories.find(c => c.id === cid);
      const isTahunan = cat?.name.toLowerCase().includes("tahunan") || cat?.periode === "Tahunan";
      const isPeriodic = periodicCategories.includes(cid) && !isTahunan;
      const nom = selectedCategories[cid] || 0;

      if (isTahunan) {
          summaryDetails.push({ id: cid, title: `${cat?.name} (Lunas Setahun)`, subTotal: nom });
          grandTotal += nom;
      } else if (isPeriodic) {
          const count = selectedMonths.length;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const catIds = Object.keys(selectedCategories);

    if (!residentId || catIds.length === 0 || !kasLocationId) {
      alert("Mohon lengkapi data Warga dan minimal pilih 1 kategori pemasukan.");
      return;
    }

    if (hasPeriodic && selectedMonths.length === 0) {
      alert("Pilih minimal 1 bulan pada tahun yang dituju untuk iuran bulanan.");
      return;
    }
    
    if (grandTotal <= 0 && catIds.length > 0) {
      alert("Total pembayaran tidak valid.");
      return;
    }

    const refId = "TRX-" + Date.now().toString().slice(-6);

    catIds.forEach(cid => {
       const cat = categories.find(c => c.id === cid);
       const isTahunan = cat?.name.toLowerCase().includes("tahunan") || cat?.periode === "Tahunan";
       const isPeriodic = periodicCategories.includes(cid) && !isTahunan;
       const nom = selectedCategories[cid];

       if (isTahunan) {
            const payload: Omit<Transaction, "id"> = {
              date: new Date(date).toISOString(),
              categoryId: cid,
              type: "Pemasukan",
              nominal: Number(nom),
              description: `Pembayaran ${cat?.name || 'Iuran Tahunan'} Tahun ${paymentYear}`,
              residentId,
              periodeTahun: paymentYear,
              kasLocationId
            };
            addTransaction(payload);
       } else if (isPeriodic && selectedMonths.length > 0) {
          selectedMonths.forEach((sm) => {
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
            addTransaction(payload);
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
          addTransaction(payload);
       }
    });

    const kasLocName = locations.find(l => l.id === kasLocationId)?.name || 'Pusat';
    const activeWarga = warga.find(w => w.id === residentId);

    setReceiptData({
      date: new Date(date).toISOString(),
      residentName: activeWarga?.namaKepalaKeluarga || 'Warga',
      residentBlock: activeWarga?.nomorRumah || 'Blok',
      items: summaryDetails,
      total: grandTotal,
      kasName: kasLocName,
      transactionId: refId
    });

    // Reset Form
    setSearchWarga("");
    setResidentId("");
    setSelectedMonths([]);
    setSelectedCategories({});
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
                  <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f43f5e]/20 focus:border-[#f43f5e] bg-gray-50 text-gray-900 font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Masuk Ke Lokasi Kas</label>
                  <div className="relative">
                    <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select required value={kasLocationId} onChange={e => setKasLocationId(e.target.value)} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f43f5e]/20 focus:border-[#f43f5e] bg-gray-50 font-medium text-gray-900">
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name} {loc.type !== 'Tunai' ? `(${loc.type})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100"></div>

              {/* Section 2: Warga */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Identitas Pendana / Warga</label>
                {!residentId ? (
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Ketik nama atau no rumah..." value={searchWarga} onChange={(e) => setSearchWarga(e.target.value)} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#f43f5e]/30 focus:ring-2 focus:ring-[#f43f5e]/20 focus:border-[#f43f5e] shadow-sm text-gray-900" />
                    
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
                                     Total Tunggakan: <span className="text-[#e11d48]">Rp {tunggakanStats.totalNominal.toLocaleString('id-ID')}</span>
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
                                            <span className="font-bold text-[#e11d48]">Rp {a.nominal.toLocaleString('id-ID')}</span>
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
                       return (
                           <div key={c.id} className={`flex flex-col gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer ${isSelected ? 'border-[#f43f5e] bg-orange-50/50 shadow-sm' : 'border-gray-100 hover:border-orange-200 bg-white'}`}>
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
                           </div>
                       )
                    })}
                 </div>
              </div>

              {/* Section 4: Pembayaran Bulanan (Tampil jika ada kategori bulanan) */}
              {residentId && hasPeriodic && (
                <div className="bg-orange-50/50 border border-orange-200 rounded-xl p-5 relative overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-orange-800">
                      <CheckSquare className="w-5 h-5" />
                      <h4 className="font-bold">Periode Bulan <span className="text-xs font-medium bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full ml-2">Wajib</span></h4>
                    </div>
                    <select value={paymentYear} onChange={(e) => setPaymentYear(Number(e.target.value))} className="px-3 py-1.5 rounded-lg border border-orange-300 font-bold text-orange-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20">
                      {yearOptions.map((y) => <option key={y} value={y}>Tahun {y}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                      const isPaid = paidSet.has(`${paymentYear}-${m}`);
                      const isSelected = selectedMonths.some((s) => s.bulan === m && s.tahun === paymentYear);

                      return (
                        <button
                            type="button" key={m} disabled={isPaid} onClick={() => toggleMonthSelection(m, paymentYear)}
                            className={`px-1 py-3 rounded-xl text-sm font-bold border-2 transition-all flex flex-col items-center justify-center gap-1.5 ${
                              isPaid ? "bg-green-100/30 text-green-700 border-green-100 cursor-not-allowed opacity-70" : isSelected ? "bg-[#f43f5e] text-white border-[#e11d48] shadow-md transform scale-105" : "bg-white text-orange-800 border-orange-200 hover:bg-orange-100 hover:border-orange-300 hover:-translate-y-0.5"
                            }`}
                        >
                            {isPaid ? <Check className="w-4 h-4 text-green-500" /> : <span className="w-4 h-4" />} 
                            <span className="uppercase text-[11px] tracking-wider">{new Date(2000, m - 1).toLocaleString("id-ID", { month: "short" })}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
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
                            <span className="font-bold whitespace-nowrap">Rp {item.subTotal.toLocaleString('id-ID')}</span>
                        </div>
                    )) : (
                        <div className="text-gray-500 text-center py-4 border border-dashed border-gray-700 rounded-lg">Belum ada rincian iuran terpilih.</div>
                    )}
                </div>

                <div className="pt-4 border-t border-gray-700 mb-8">
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-gray-400 font-bold uppercase tracking-widest textxs">Total Tagihan</span>
                        <span className="text-[#f43f5e] text-2xl font-bold font-display tracking-tight leading-none">Rp {grandTotal.toLocaleString('id-ID')}</span>
                    </div>
                </div>

                <button type="submit" disabled={!residentId || Object.keys(selectedCategories).length === 0 || !kasLocationId || (hasPeriodic && selectedMonths.length === 0)} className="w-full py-4 text-sm font-bold text-white bg-[#f43f5e] hover:bg-[#e11d48] disabled:opacity-50 disabled:hover:bg-[#f43f5e] disabled:cursor-not-allowed rounded-xl transition-all shadow-lg shadow-[#f43f5e]/20 flex justify-center items-center gap-2 group">
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
        onClose={() => setReceiptData(null)} 
        data={receiptData} 
      />
    </div>
  );
}
