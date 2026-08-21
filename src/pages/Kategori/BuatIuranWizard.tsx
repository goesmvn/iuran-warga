import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCategory } from "../../hooks/useCategory";
import { ArrowLeft } from "lucide-react";

export default function BuatIuranWizard() {
  const navigate = useNavigate();
  const { addCategory } = useCategory();

  // Form State
  const [name, setName] = useState("");
  const [tipe, setTipe] = useState<"Pemasukan" | "Pengeluaran">("Pemasukan");
  const [periode, setPeriode] = useState<"Bulanan" | "Tahunan" | "Insidental">("Bulanan");
  const [nominal, setNominal] = useState("");
  const [description, setDescription] = useState("");
  const [showInPayment, setShowInPayment] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addCategory({
      name: name.trim(),
      type: tipe,
      periode,
      waktuPenagihan: "Di Awal Periode",
      tanggalMulaiPenagihan: new Date().toISOString(),
      mataUang: "IDR",
      defaultNominal: nominal ? Number(nominal.replace(/\D/g, "")) : undefined,
      description: description.trim(),
      showInPayment,
    });
    navigate("/kategori");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-in fade-in duration-500">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-display">
            Buat Iuran Baru
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Isi formulir ringkas di bawah ini untuk membuat kategori iuran baru.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/kategori")}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Batal
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            Nama Iuran / Kategori <span className="text-red-500">*</span>
          </label>
          <input
            required
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
            placeholder="Misal: Iuran Sampah, Kas Kebersihan"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Tipe Transaksi
            </label>
            <select
              value={tipe}
              onChange={(e) => setTipe(e.target.value as "Pemasukan" | "Pengeluaran")}
              className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
            >
              <option value="Pemasukan">Pemasukan (Dari Warga)</option>
              <option value="Pengeluaran">Pengeluaran (Operasional)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Periode Pembayaran
            </label>
            <select
              value={periode}
              onChange={(e) => setPeriode(e.target.value as "Bulanan" | "Tahunan" | "Insidental")}
              className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
            >
              <option value="Bulanan">Bulanan</option>
              <option value="Tahunan">Tahunan</option>
              <option value="Insidental">Insidental / Sekali Bayar</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            Nominal Standar (Rp) <span className="text-gray-400 font-normal">(Opsional)</span>
          </label>
          <input
            type="text"
            value={nominal ? Number(nominal.replace(/\D/g, "")).toLocaleString("id-ID") : ""}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              setNominal(raw);
            }}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-bold text-brand-900 bg-brand-50/20 text-lg"
            placeholder="Misal: 50.000"
          />
        </div>

        {tipe === "Pemasukan" && (
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
            <input
              type="checkbox"
              id="showInPayment"
              checked={showInPayment}
              onChange={(e) => setShowInPayment(e.target.checked)}
              className="w-5 h-5 text-brand-600 rounded border-gray-300 focus:ring-brand-500 mt-0.5"
            />
            <label htmlFor="showInPayment" className="text-sm font-bold text-blue-900 cursor-pointer">
              Tampilkan di Form Terima Pembayaran
              <p className="text-xs text-blue-700 font-normal mt-0.5">
                Kategori ini akan otomatis muncul sebagai pilihan opsi saat pencatatan iuran warga.
              </p>
            </label>
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            Keterangan / Catatan <span className="text-gray-400 font-normal">(Opsional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            placeholder="Contoh: Digunakan untuk biaya pemeliharaan pos dan taman"
          />
        </div>

        <div className="pt-4 border-t flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/kategori")}
            className="px-6 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-8 py-3 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors shadow-lg shadow-brand-500/20"
          >
            Simpan Iuran Baru
          </button>
        </div>
      </form>
    </div>
  );
}