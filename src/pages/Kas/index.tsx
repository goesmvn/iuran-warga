import { useState } from "react";
import { useTransaksi } from "../../hooks/useTransaksi";
import { useWarga } from "../../hooks/useWarga";
import { useCategory } from "../../hooks/useCategory";
import { useKasLocation, DEFAULT_KAS_LOCATION_ID } from "../../hooks/useKasLocation";
import { useSettings } from "../../hooks/useSettings";
import {
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  Plus,
} from "lucide-react";
import type { Transaction } from "../../types";

export default function Kas() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useTransaksi();
  const { warga } = useWarga();
  const { categories } = useCategory();
  const { locations } = useKasLocation();
  const { settings } = useSettings();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalSaldoOpen, setIsModalSaldoOpen] = useState(false);
  const [isModalPemasukanOpen, setIsModalPemasukanOpen] = useState(false);
  
  const startYear = settings?.start_year || new Date().getFullYear().toString();

  // Form State (Pengeluaran Only)
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [categoryId, setCategoryId] = useState("");
  const [kasLocationId, setKasLocationId] = useState(DEFAULT_KAS_LOCATION_ID);
  const [nominal, setNominal] = useState("");
  const [description, setDescription] = useState("");

  const expenses = categories.filter((c) => c.type === "Pengeluaran");
  const incomes = categories.filter((c) => c.type === "Pemasukan" && c.id !== "cat-saldo-awal");

  const openModal = () => {
    setDate(new Date().toISOString().split("T")[0]);
    setCategoryId("");
    setKasLocationId(DEFAULT_KAS_LOCATION_ID);
    setNominal("");
    setDescription("");
    setIsModalOpen(true);
  };

  const [existingSaldoAwalId, setExistingSaldoAwalId] = useState<string | null>(null);

  const openModalSaldo = () => {
    setCategoryId("cat-saldo-awal");
    
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

  const openModalPemasukan = () => {
    setDate(new Date().toISOString().split("T")[0]);
    setCategoryId("");
    setKasLocationId(DEFAULT_KAS_LOCATION_ID);
    setNominal("");
    setDescription("");
    setIsModalPemasukanOpen(true);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cid = e.target.value;
    setCategoryId(cid);
    const cat = categories.find((c) => c.id === cid);
    if (cat?.defaultNominal) {
      setNominal(cat.defaultNominal.toString());
    } else {
      setNominal("");
    }
  };

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setNominal(raw);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !kasLocationId) return;

    const payload: Omit<Transaction, "id"> = {
      date: new Date(date).toISOString(),
      categoryId,
      type: "Pengeluaran",
      nominal: Number(nominal),
      description,
      kasLocationId
    };
    addTransaction(payload);
    setIsModalOpen(false);
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

  const handlePemasukanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !kasLocationId) return;

    const payload: Omit<Transaction, "id"> = {
      date: new Date(date).toISOString(),
      categoryId,
      type: "Pemasukan",
      nominal: Number(nominal),
      description,
      kasLocationId
    };
    addTransaction(payload);
    setIsModalPemasukanOpen(false);
  };

  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name || "Unknown";
  const getResidentName = (id?: string) =>
    warga.find((w) => w.id === id)?.namaKepalaKeluarga || "-";
  const getLocationName = (id?: string) =>
    locations.find((l) => l.id === id)?.name || "Tunai";

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-gray-100 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-display">
            Pengeluaran & Buku Besar
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
          <button
            onClick={openModalPemasukan}
            className="flex items-center gap-2 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <ArrowDownRight className="w-4 h-4" /> Catat Pemasukan Lain
          </button>
          <button
            onClick={openModal}
            className="flex items-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Minus className="w-4 h-4" /> Catat Pengeluaran
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-semibold text-gray-800">
            Riwayat Transaksi Terakhir (Buku Besar)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="text-gray-500 font-medium bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Keterangan / Warga</th>
                <th className="px-6 py-4">Lokasi Kas</th>
                <th className="px-6 py-4 text-right">Nominal</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime(),
                )
                .map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-gray-600 font-medium">
                      {new Date(tx.date).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4">
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
                    </td>
                    <td className="px-6 py-4 text-gray-800 font-semibold max-w-[200px] truncate">
                      {tx.type === "Pemasukan"
                        ? `${getResidentName(tx.residentId)} ${tx.periodeBulan ? `(${new Date(2000, tx.periodeBulan - 1).toLocaleString("id-ID", { month: "short" })} ${tx.periodeTahun})` : ''}`
                        : tx.description}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      <span className="flex items-center gap-1.5 text-xs font-medium bg-gray-100 px-2.5 py-1 rounded-md">
                        <Landmark className="w-3 h-3" /> {getLocationName(tx.kasLocationId ?? DEFAULT_KAS_LOCATION_ID)}
                      </span>
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-bold ${tx.type === "Pemasukan" ? "text-green-600" : "text-red-600"}`}
                    >
                      {tx.type === "Pemasukan" ? "+" : "-"} Rp{" "}
                      {tx.nominal.toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                         <button
                           onClick={() => {
                             if(window.confirm('Yakin menghapus catatan transaksi ini? Aksi ini akan seketika mengubah laporan arus kas seluruh keuangan.')) {
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
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <p className="text-gray-500 font-medium text-lg">
                      Belum ada transaksi terekam.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form Pengeluaran */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center flex-shrink-0 bg-red-50/80 border-red-100">
              <h3 className="font-bold text-lg text-red-900">
                Form Catat Pengeluaran
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 overflow-y-auto flex-1 space-y-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Tanggal Transaksi
                  </label>
                  <input
                    required
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-gray-50/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Kategori Pengeluaran
                  </label>
                  <select
                    required
                    value={categoryId}
                    onChange={handleCategoryChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-gray-50/50"
                  >
                    <option value="" disabled>Pilih Kategori...</option>
                    {expenses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Diambil Dari Kas
                </label>
                <div className="relative">
                  <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select required value={kasLocationId} onChange={e => setKasLocationId(e.target.value)} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-gray-50/50 font-medium">
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name} {loc.type !== 'Tunai' ? `(${loc.type})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Nominal Anggaran Keluar (Rp)
                </label>
                <input
                  required
                  type="text"
                  value={nominal ? Number(nominal).toLocaleString('id-ID') : ""}
                  onChange={handleNominalChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-red-300 focus:outline-none focus:ring-4 focus:ring-red-500/20 focus:border-red-500 text-red-900 bg-red-50/30 shadow-sm text-xl font-bold"
                  placeholder="0"
                />
              </div>

              <div className="animate-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Keperluan / Detail Pengeluaran
                </label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none bg-gray-50/50"
                  rows={3}
                  placeholder="Penjelasan rincian pengeluaran..."
                />
              </div>

              <div className="pt-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white z-10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 border border-transparent rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 text-sm font-bold text-white rounded-xl transition-colors shadow-lg shadow-red-500/30 bg-red-600 hover:bg-red-700"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Saldo Awal */}
      {isModalSaldoOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => setIsModalSaldoOpen(false)}
          ></div>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
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
                    <select required value={kasLocationId} onChange={handleKasLocationChangeSaldo} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-gray-50/50 font-medium text-gray-900">
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

      {/* Modal Form Pemasukan Lainnya */}
      {isModalPemasukanOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => setIsModalPemasukanOpen(false)}
          ></div>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center flex-shrink-0 bg-blue-50/80 border-blue-100">
              <h3 className="font-bold text-lg text-blue-900">
                Form Catat Pemasukan Lain
              </h3>
              <button
                type="button"
                onClick={() => setIsModalPemasukanOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form
              onSubmit={handlePemasukanSubmit}
              className="p-6 overflow-y-auto flex-1 space-y-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Tanggal Transaksi
                  </label>
                  <input
                    required
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Kategori Pemasukan
                  </label>
                  <select
                    required
                    value={categoryId}
                    onChange={handleCategoryChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50/50"
                  >
                    <option value="" disabled>Pilih Kategori...</option>
                    {incomes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Masuk Ke Kas
                </label>
                <div className="relative">
                  <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select required value={kasLocationId} onChange={e => setKasLocationId(e.target.value)} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50/50 font-medium">
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name} {loc.type !== 'Tunai' ? `(${loc.type})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Nominal Dana Masuk (Rp)
                </label>
                <input
                  required
                  type="text"
                  value={nominal ? Number(nominal).toLocaleString('id-ID') : ""}
                  onChange={handleNominalChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-blue-300 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-blue-900 bg-blue-50/30 shadow-sm text-xl font-bold"
                  placeholder="0"
                />
              </div>

              <div className="animate-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Keperluan / Sumber Pemasukan
                </label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none bg-gray-50/50"
                  rows={3}
                  placeholder="Penjelasan rincian/sumber dana masuk..."
                />
              </div>

              <div className="pt-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white z-10">
                <button
                  type="button"
                  onClick={() => setIsModalPemasukanOpen(false)}
                  className="px-6 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 border border-transparent rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 text-sm font-bold text-white rounded-xl transition-colors shadow-lg shadow-blue-500/30 bg-blue-600 hover:bg-blue-700"
                >
                  Simpan Pemasukan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
