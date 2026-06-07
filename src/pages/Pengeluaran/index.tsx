import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTransaksi } from "../../hooks/useTransaksi";
import { useCategory } from "../../hooks/useCategory";
import { useKasLocation, DEFAULT_KAS_LOCATION_ID } from "../../hooks/useKasLocation";

import { Minus, Plus, Landmark, ArrowLeft } from "lucide-react";
import type { Transaction } from "../../types";

export default function Pengeluaran() {
  const navigate = useNavigate();
  const { addTransaction } = useTransaksi();
  const { categories } = useCategory();
  const { locations } = useKasLocation();

  const [activeSubTab, setActiveSubTab] = useState<"Pengeluaran" | "PemasukanLain">("Pengeluaran");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Form States
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [categoryId, setCategoryId] = useState("");
  const [kasLocationId, setKasLocationId] = useState(DEFAULT_KAS_LOCATION_ID);
  const [nominal, setNominal] = useState("");
  const [description, setDescription] = useState("");

  const expenses = categories.filter((c) => c.type === "Pengeluaran" && c.id !== "cat-transfer");
  const incomes = categories.filter((c) => c.type === "Pemasukan" && c.id !== "cat-saldo-awal" && c.id !== "cat-transfer");

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

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const handleSave = (keepOpen: boolean) => {
    if (!categoryId || !kasLocationId || !nominal) return;

    const payload: Omit<Transaction, "id"> = {
      date: new Date(date).toISOString(),
      categoryId,
      type: activeSubTab === "Pengeluaran" ? "Pengeluaran" : "Pemasukan",
      nominal: Number(nominal),
      description,
      kasLocationId
    };

    addTransaction(payload);
    triggerToast(activeSubTab === "Pengeluaran" ? "Catatan pengeluaran berhasil disimpan!" : "Catatan pemasukan lain berhasil disimpan!");

    if (keepOpen) {
      // Clear inputs for next record
      setCategoryId("");
      setNominal("");
      setDescription("");
    } else {
      setTimeout(() => {
        navigate("/kas");
      }, 500);
    }
  };

  const handleSubTabChange = (tab: "Pengeluaran" | "PemasukanLain") => {
    setActiveSubTab(tab);
    setCategoryId("");
    setNominal("");
    setDescription("");
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-3xl mx-auto relative">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-top-4 duration-300">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/kas")}
          className="p-2 bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-xl transition-colors shadow-sm"
          title="Kembali ke Buku Kas"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pencatatan Keuangan Lain</h2>
          <p className="text-gray-500 text-sm mt-0.5">Catat pengeluaran dan pemasukan non-iuran warga.</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm flex mb-6">
        <button
          onClick={() => handleSubTabChange("Pengeluaran")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
            activeSubTab === "Pengeluaran"
              ? "bg-red-50 border border-red-200 text-red-700 shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <Minus className="w-4 h-4" /> Catat Pengeluaran
        </button>
        <button
          onClick={() => handleSubTabChange("PemasukanLain")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
            activeSubTab === "PemasukanLain"
              ? "bg-green-50 border border-green-200 text-green-700 shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <Plus className="w-4 h-4" /> Catat Pemasukan Lain
        </button>
      </div>

      {/* Form Container */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 md:p-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(false);
          }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                Tanggal Transaksi
              </label>
              <input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500/20 outline-none bg-gray-50/50"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                {activeSubTab === "Pengeluaran" ? "Kategori Pengeluaran" : "Kategori Pemasukan"}
              </label>
              <select
                required
                value={categoryId}
                onChange={handleCategoryChange}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500/20 outline-none bg-gray-50/50"
              >
                <option value="" disabled>Pilih Kategori...</option>
                {(activeSubTab === "Pengeluaran" ? expenses : incomes).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              {activeSubTab === "Pengeluaran" ? "Diambil Dari Kas" : "Masuk Ke Kas"}
            </label>
            <div className="relative">
              <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                required
                value={kasLocationId}
                onChange={(e) => setKasLocationId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500/20 outline-none bg-gray-50/50 font-medium"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.type !== "Tunai" ? `(${loc.type})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Nominal Transaksi (Rp)
            </label>
            <input
              required
              type="text"
              value={nominal ? Number(nominal).toLocaleString("id-ID") : ""}
              onChange={handleNominalChange}
              className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-4 text-xl font-bold shadow-sm ${
                activeSubTab === "Pengeluaran"
                  ? "border-red-300 focus:ring-red-500/20 focus:border-red-500 text-red-900 bg-red-50/30"
                  : "border-green-300 focus:ring-green-500/20 focus:border-green-500 text-green-900 bg-green-50/30"
              }`}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              {activeSubTab === "Pengeluaran" ? "Keperluan / Detail Pengeluaran" : "Sumber / Detail Pemasukan"}
            </label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500/20 outline-none resize-none bg-gray-50/50"
              rows={3}
              placeholder={activeSubTab === "Pengeluaran" ? "Penjelasan rincian pengeluaran..." : "Penjelasan rincian/sumber dana masuk..."}
            />
          </div>

          <div className="pt-6 border-t border-gray-100 flex flex-wrap gap-3 justify-end">
            <button
              type="button"
              onClick={() => navigate("/kas")}
              className="px-6 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 border border-transparent rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!categoryId || !kasLocationId || !nominal}
              onClick={() => handleSave(true)}
              className={`px-5 py-3 text-sm font-bold rounded-xl transition-colors border shadow-sm disabled:opacity-50 ${
                activeSubTab === "Pengeluaran"
                  ? "text-red-600 bg-red-50 hover:bg-red-100 border-red-200"
                  : "text-green-600 bg-green-50 hover:bg-green-100 border-green-200"
              }`}
            >
              Simpan & Tambah Lagi
            </button>
            <button
              type="button"
              disabled={!categoryId || !kasLocationId || !nominal}
              onClick={() => handleSave(false)}
              className={`px-8 py-3 text-sm font-bold text-white rounded-xl transition-colors shadow-lg disabled:opacity-50 ${
                activeSubTab === "Pengeluaran"
                  ? "bg-red-600 hover:bg-red-700 shadow-red-500/30"
                  : "bg-green-600 hover:bg-green-700 shadow-green-500/30"
              }`}
            >
              Simpan Saja
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
