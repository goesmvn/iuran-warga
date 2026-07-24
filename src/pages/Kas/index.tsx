import { useState, useMemo, useRef } from "react";
import { useTransaksi } from "../../hooks/useTransaksi";
import { useWarga } from "../../hooks/useWarga";
import { useCategory } from "../../hooks/useCategory";
import { useKasLocation, DEFAULT_KAS_LOCATION_ID } from "../../hooks/useKasLocation";
import { useSettings } from "../../hooks/useSettings";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Landmark,
  Plus,
  Search,
  ArrowUpDown,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import type { Transaction } from "../../types";
import { useConfirm } from "../../contexts/ConfirmContext";

type SortField = 'date' | 'category' | 'description' | 'kas' | 'nominal';
type SortOrder = 'asc' | 'desc';

export default function Kas() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useTransaksi();
  const { warga } = useWarga();
  const { categories } = useCategory();
  const { locations } = useKasLocation();
  const { settings } = useSettings();
  const { confirm } = useConfirm();

  const [isModalSaldoOpen, setIsModalSaldoOpen] = useState(false);
  
  const startYear = settings?.start_year || new Date().getFullYear().toString();

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<"Semua" | "Pemasukan" | "Pengeluaran">("Semua");
  const [selectedKas, setSelectedKas] = useState("Semua");

  // Sorting State
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Column Widths State (for resizable columns)
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    date: 140,
    category: 160,
    description: 250,
    kas: 150,
    nominal: 150,
    action: 100
  });

  const resizingCol = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const startResize = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    resizingCol.current = colKey;
    startX.current = e.clientX;
    startWidth.current = colWidths[colKey] || 150;
    
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
  };

  const handleResize = (e: MouseEvent) => {
    if (!resizingCol.current) return;
    const diff = e.clientX - startX.current;
    const newWidth = Math.max(80, startWidth.current + diff);
    setColWidths(prev => ({
      ...prev,
      [resizingCol.current!]: newWidth
    }));
  };

  const stopResize = () => {
    resizingCol.current = null;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
  };

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [kasLocationId, setKasLocationId] = useState(DEFAULT_KAS_LOCATION_ID);
  const [nominal, setNominal] = useState("");
  const [description, setDescription] = useState("");

  const [existingSaldoAwalId, setExistingSaldoAwalId] = useState<string | null>(null);

  const openModalSaldo = () => {
    // Check if default location has existing saldo awal
    const locId = DEFAULT_KAS_LOCATION_ID;
    const existing = transactions.find(t => t.categoryId === "cat-saldo-awal" && t.kasLocationId === locId);
    
    setKasLocationId(locId);
    if (existing) {
       setDate(existing.date.split("T")[0]);
       setNominal(existing.nominal.toString());
       setDescription(existing.description || "Saldo Awal Kas");
       setExistingSaldoAwalId(existing.id);
    } else {
       setDate(`${startYear}-01-01`);
       setNominal("");
       setDescription("");
       setExistingSaldoAwalId(null);
    }
    
    setIsModalSaldoOpen(true);
  };

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setNominal(raw);
  };

  const handleKasLocationChangeSaldo = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const locId = e.target.value;
    setKasLocationId(locId);
    
    const existing = transactions.find(t => t.categoryId === "cat-saldo-awal" && t.kasLocationId === locId);
    if (existing) {
       setDate(existing.date.split("T")[0]);
       setNominal(existing.nominal.toString());
       setDescription(existing.description || "Saldo Awal Kas");
       setExistingSaldoAwalId(existing.id);
    } else {
       setDate(`${startYear}-01-01`);
       setNominal("");
       setDescription("");
       setExistingSaldoAwalId(null);
    }
  };

  const submitSaldoAwal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kasLocationId) return;

    if (existingSaldoAwalId) {
      updateTransaction(existingSaldoAwalId, {
        date: new Date(date).toISOString(),
        nominal: Number(nominal),
        description: description || "Saldo Awal Kas",
        kasLocationId
      });
    } else {
      const payload: Omit<Transaction, "id"> = {
        date: new Date(date).toISOString(),
        categoryId: "cat-saldo-awal",
        type: "Pemasukan",
        nominal: Number(nominal),
        description: description || "Saldo Awal Kas",
        kasLocationId
      };
      addTransaction(payload);
    }
    setIsModalSaldoOpen(false);
  };

  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name || "Unknown";
  const getResidentName = (id?: string) =>
    warga.find((w) => w.id === id)?.namaKepalaKeluarga || "-";
  const getLocationName = (id?: string) =>
    locations.find((l) => l.id === id)?.name || "Tunai";

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filtered & Sorted Transactions
  const processedTransactions = useMemo(() => {
    let result = [...transactions];

    // Filter Type
    if (selectedType !== "Semua") {
      result = result.filter(t => t.type === selectedType);
    }

    // Filter Kas Location
    if (selectedKas !== "Semua") {
      result = result.filter(t => t.kasLocationId === selectedKas);
    }

    // Search term
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter(t => {
        const catName = getCategoryName(t.categoryId).toLowerCase();
        const residentName = getResidentName(t.residentId).toLowerCase();
        const desc = (t.description || "").toLowerCase();
        const locName = getLocationName(t.kasLocationId).toLowerCase();
        const tanggalStr = new Date(t.date).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).toLowerCase();

        return catName.includes(term) ||
               residentName.includes(term) ||
               desc.includes(term) ||
               locName.includes(term) ||
               tanggalStr.includes(term);
      });
    }

    // Sort logic
    result.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      switch (sortField) {
        case 'date':
          valA = new Date(a.date).getTime();
          valB = new Date(b.date).getTime();
          break;
        case 'category':
          valA = getCategoryName(a.categoryId).toLowerCase();
          valB = getCategoryName(b.categoryId).toLowerCase();
          break;
        case 'description':
          const descA = a.type === "Pemasukan"
            ? `${getResidentName(a.residentId)} ${a.periodeBulan ? `(${new Date(2000, a.periodeBulan - 1).toLocaleString("id-ID", { month: "short" })} ${a.periodeTahun})` : ''}`
            : a.description;
          const descB = b.type === "Pemasukan"
            ? `${getResidentName(b.residentId)} ${b.periodeBulan ? `(${new Date(2000, b.periodeBulan - 1).toLocaleString("id-ID", { month: "short" })} ${b.periodeTahun})` : ''}`
            : b.description;
          valA = descA.toLowerCase();
          valB = descB.toLowerCase();
          break;
        case 'kas':
          valA = getLocationName(a.kasLocationId).toLowerCase();
          valB = getLocationName(b.kasLocationId).toLowerCase();
          break;
        case 'nominal':
          valA = a.nominal;
          valB = b.nominal;
          break;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;

      // Fallback to secondary sort by date/time (always desc to prioritize latest)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return result;
  }, [transactions, searchTerm, selectedType, selectedKas, sortField, sortOrder, categories, warga, locations]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-gray-400 inline" />;
    return sortOrder === 'asc' 
      ? <ChevronUp className="w-3.5 h-3.5 ml-1 text-gray-800 inline" /> 
      : <ChevronDown className="w-3.5 h-3.5 ml-1 text-gray-800 inline" />;
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-gray-100 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-display">
            Arus Kas & Buku Besar
          </h2>
          <p className="text-gray-500 mt-1">
            Riwayat seluruh arus kas keluar dan masuk RT/RW.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={openModalSaldo}
            className="flex items-center gap-2 bg-white text-green-600 border border-green-200 hover:bg-green-50 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Set Saldo Awal
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div className="relative col-span-1 md:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari transaksi (keterangan, warga, tanggal)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium text-gray-900"
          />
        </div>

        <div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-bold text-gray-800 bg-white"
          >
            <option value="Semua">Semua Tipe</option>
            <option value="Pemasukan">Pemasukan</option>
            <option value="Pengeluaran">Pengeluaran</option>
          </select>
        </div>

        <div>
          <select
            value={selectedKas}
            onChange={(e) => setSelectedKas(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-bold text-gray-800 bg-white"
          >
            <option value="Semua">Semua Lokasi Kas</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-semibold text-gray-800">
            Riwayat Transaksi Terakhir (Buku Besar)
          </h3>
        </div>
        <div className="overflow-x-auto relative">
          <table className="w-full text-left text-sm whitespace-nowrap table-fixed">
            <thead className="text-gray-500 font-medium bg-gray-50 border-b border-gray-100 select-none">
              <tr>
                <th style={{ width: colWidths.date }} className="px-6 py-4 relative group">
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('date')}>
                    Tanggal <SortIcon field="date" />
                  </div>
                  <div onMouseDown={(e) => startResize('date', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-gray-300 active:bg-gray-400 transition-colors" />
                </th>
                <th style={{ width: colWidths.category }} className="px-6 py-4 relative group">
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('category')}>
                    Kategori <SortIcon field="category" />
                  </div>
                  <div onMouseDown={(e) => startResize('category', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-gray-300 active:bg-gray-400 transition-colors" />
                </th>
                <th style={{ width: colWidths.description }} className="px-6 py-4 relative group">
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('description')}>
                    Keterangan / Warga <SortIcon field="description" />
                  </div>
                  <div onMouseDown={(e) => startResize('description', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-gray-300 active:bg-gray-400 transition-colors" />
                </th>
                <th style={{ width: colWidths.kas }} className="px-6 py-4 relative group">
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('kas')}>
                    Lokasi Kas <SortIcon field="kas" />
                  </div>
                  <div onMouseDown={(e) => startResize('kas', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-gray-300 active:bg-gray-400 transition-colors" />
                </th>
                <th style={{ width: colWidths.nominal }} className="px-6 py-4 text-right relative group">
                  <div className="flex items-center justify-end cursor-pointer" onClick={() => handleSort('nominal')}>
                    Nominal <SortIcon field="nominal" />
                  </div>
                  <div onMouseDown={(e) => startResize('nominal', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-gray-300 active:bg-gray-400 transition-colors" />
                </th>
                <th style={{ width: colWidths.action }} className="px-6 py-4 text-center">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {processedTransactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-6 py-4 text-gray-600 font-medium truncate" style={{ width: colWidths.date }}>
                    {new Date(tx.date).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4 truncate" style={{ width: colWidths.category }}>
                    {tx.categoryId === "cat-transfer" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700">
                        <ArrowRightLeft className="w-3 h-3" />
                        Transfer
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                          tx.type === "Pemasukan"
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {tx.type === "Pemasukan" ? (
                          <ArrowDownRight className="w-3 h-3" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3" />
                        )}
                        {getCategoryName(tx.categoryId)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-800 font-semibold truncate" style={{ width: colWidths.description }}>
                    {tx.type === "Pemasukan"
                      ? `${getResidentName(tx.residentId)} ${tx.periodeBulan ? `(${new Date(2000, tx.periodeBulan - 1).toLocaleString("id-ID", { month: "short" })} ${tx.periodeTahun})` : ''}`
                      : tx.description}
                  </td>
                  <td className="px-6 py-4 text-gray-500 truncate" style={{ width: colWidths.kas }}>
                    <span className="flex items-center gap-1.5 text-xs font-medium bg-gray-100 px-2.5 py-1 rounded-md">
                      <Landmark className="w-3 h-3" /> {getLocationName(tx.kasLocationId ?? DEFAULT_KAS_LOCATION_ID)}
                    </span>
                  </td>
                  <td
                    className={`px-6 py-4 text-right font-bold truncate ${tx.type === "Pemasukan" ? "text-green-600" : "text-red-600"}`}
                    style={{ width: colWidths.nominal }}
                  >
                    {tx.type === "Pemasukan" ? "+" : "-"} Rp{" "}
                    {tx.nominal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-center truncate" style={{ width: colWidths.action }}>
                    <div className="flex justify-center gap-2">
                        <button
                          onClick={async () => {
                            const confirmed = await confirm(
                              'Hapus Catatan Transaksi',
                              'Yakin menghapus catatan transaksi ini? Aksi ini akan seketika mengubah laporan arus kas seluruh keuangan.',
                              'danger'
                            );
                            if (confirmed) {
                              deleteTransaction(tx.id);
                            }
                          }}
                          className="text-red-500 hover:bg-red-50 hover:text-red-700 p-1.5 rounded-lg transition-colors border border-transparent"
                          title="Hapus Transaksi"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {processedTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <p className="text-gray-500 font-medium text-lg">
                      Tidak ada transaksi yang cocok dengan pencarian.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>



      {/* Modal Saldo Awal */}
      {isModalSaldoOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => setIsModalSaldoOpen(false)}
          ></div>
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 flex justify-between items-center bg-green-50/80 border-b border-green-100 flex-shrink-0">
              <h3 className="font-bold text-lg text-green-900">
                Set Saldo Awal Kas Tahun {startYear}
              </h3>
              <button type="button" onClick={() => setIsModalSaldoOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={submitSaldoAwal} className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Tanggal Saldo Awal</label>
                  <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-gray-50/50" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Disimpan di Kas / Rekening</label>
                  <div className="relative">
                    <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select required value={kasLocationId} onChange={handleKasLocationChangeSaldo} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-gray-50/50 font-medium text-gray-900">
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name} {loc.type !== 'Tunai' ? `(${loc.type})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Nominal Saldo Awal Tersedia (Rp)</label>
                <input required type="text" value={nominal ? Number(nominal).toLocaleString('id-ID') : ""} onChange={handleNominalChange} className="w-full px-4 py-3 rounded-xl border-2 border-green-300 focus:outline-none focus:ring-4 focus:ring-green-500/20 focus:border-green-500 text-green-900 bg-green-50/30 shadow-sm text-xl font-bold" placeholder="Misal: 5.000.000" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Keterangan Tambahan</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Contoh: Sisa kas uang kas RT akhir tahun lalu" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-gray-50/50" />
              </div>

              <div className="pt-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white z-10">
                <button type="button" onClick={() => setIsModalSaldoOpen(false)} className="px-6 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 border border-transparent rounded-xl transition-colors">Batal</button>
                <button type="submit" className="px-8 py-3 text-sm font-bold text-white rounded-xl transition-colors shadow-lg bg-green-600 hover:bg-green-700">Simpan Saldo Awal</button>
              </div>
            </form>
          </div>
        </div>
      )}



    </div>
  );
}
