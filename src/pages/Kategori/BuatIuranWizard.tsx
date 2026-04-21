import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCategory } from "../../hooks/useCategory";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function BuatIuranWizard() {
  const navigate = useNavigate();
  const { addCategory } = useCategory();

  const [step, setStep] = useState(1);

  // Form State
  const [name, setName] = useState("");
  const [periode, setPeriode] = useState<"Bulanan" | "Tahunan" | "Insidental">("Bulanan");
  const [waktuPenagihan, setWaktuPenagihan] = useState<
    "Di Awal Periode" | "Di Akhir Periode"
  >("Di Awal Periode");
  const [tanggalMulai, setTanggalMulai] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [tipe, setTipe] = useState<"Pemasukan" | "Pengeluaran">("Pemasukan");
  const [description, setDescription] = useState("");
  const [mataUang, setMataUang] = useState("IDR");
  const [nominal, setNominal] = useState("");
  const [showInPayment, setShowInPayment] = useState(true);

  const handleNext = () => setStep((prev) => Math.min(prev + 1, 3));
  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleFinish = () => {
    addCategory({
      name,
      type: tipe,
      periode,
      waktuPenagihan,
      tanggalMulaiPenagihan: new Date(tanggalMulai).toISOString(),
      mataUang,
      defaultNominal: nominal ? Number(nominal) : undefined,
      description,
      showInPayment,
    });
    navigate("/kategori");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-gray-900 font-display">
          Buat Iuran baru
        </h2>
      </div>

      {/* Stepper Indicator */}
      <div className="flex items-center justify-center mb-12 relative max-w-2xl mx-auto">
        <div className="absolute left-0 right-0 top-4 h-0.5 bg-gray-200 -z-10"></div>
        {/* Step 1 */}
        <div className="flex flex-col items-center flex-1 relative bg-gray-50/50">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors bg-white ${step >= 1 ? "border-brand-500 text-brand-600" : "border-gray-300 text-gray-400"}`}
          >
            1
          </div>
          <span
            className={`text-sm font-bold mt-2 ${step >= 1 ? "text-brand-600" : "text-gray-400"}`}
          >
            Step 1
          </span>
          <span className="text-xs text-gray-500">Informasi Dasar</span>
        </div>

        {/* Step 2 */}
        <div className="flex flex-col items-center flex-1 relative bg-gray-50/50">
          <div
            className={`absolute top-4 right-1/2 w-full h-0.5 -z-10 transition-colors ${step >= 2 ? "bg-brand-500" : "bg-gray-200"}`}
          ></div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors bg-white ${step >= 2 ? "border-brand-500 text-brand-600" : "border-gray-300 text-gray-400"}`}
          >
            2
          </div>
          <span
            className={`text-sm font-bold mt-2 ${step >= 2 ? "text-gray-900" : "text-gray-400"}`}
          >
            Step 2
          </span>
          <span className="text-xs text-gray-500">Detail Pembayaran</span>
        </div>

        {/* Step 3 */}
        <div className="flex flex-col items-center flex-1 relative bg-gray-50/50">
          <div
            className={`absolute top-4 right-1/2 w-full h-0.5 -z-10 transition-colors ${step === 3 ? "bg-brand-500" : "bg-gray-200"}`}
          ></div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors bg-white ${step === 3 ? "border-brand-500 text-brand-600" : "border-gray-300 text-gray-400"}`}
          >
            3
          </div>
          <span
            className={`text-sm font-bold mt-2 ${step === 3 ? "text-gray-900" : "text-gray-400"}`}
          >
            Step 3
          </span>
          <span className="text-xs text-gray-500">Konfirmasi & Simpan</span>
        </div>
      </div>

      <div className="bg-white border flex flex-col items-center border-gray-100 rounded-2xl shadow-sm p-6 sm:p-10 min-h-[400px]">
        {step === 1 && (
          <div className="w-full max-w-2xl space-y-6 animate-in slide-in-from-left-4 fade-in">
            <div className="grid grid-cols-[160px_1fr] items-center gap-4">
              <label className="text-sm font-medium text-gray-600 flex justify-end gap-1">
                <span className="text-brand-500">*</span> Nama Iuran
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 pr-16"
                  placeholder="Mis. Iuran Sampah"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  {name.length} / 50
                </span>
              </div>
            </div>

            <div className="grid grid-cols-[160px_1fr] items-start gap-4">
              <label className="text-sm font-medium text-gray-600 flex justify-end mt-2.5">
                Arus Transaksi
              </label>
              <div>
                <select
                  value={tipe}
                  onChange={(e) =>
                    setTipe(e.target.value as "Pemasukan" | "Pengeluaran")
                  }
                  className="w-full px-4 py-2.5 bg-white rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  <option value="Pemasukan">
                    Pemasukan (Ditagihkan ke Warga)
                  </option>
                  <option value="Pengeluaran">
                    Pengeluaran (Operasional RT)
                  </option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-[160px_1fr] items-start gap-4">
              <label className="text-sm font-medium text-gray-600 flex justify-end mt-2.5">
                Periode
              </label>
              <div>
                <select
                  value={periode}
                  onChange={(e) =>
                    setPeriode(e.target.value as "Bulanan" | "Tahunan" | "Insidental")
                  }
                  className="w-full px-4 py-2.5 bg-white rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  <option value="Bulanan">Bulanan</option>
                  <option value="Tahunan">Tahunan</option>
                  <option value="Insidental">Insidental</option>
                </select>
                <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                  ⓘ Siklus periode per{" "}
                  {periode === "Bulanan" ? "30 hari" : periode === "Tahunan" ? "365 hari" : "kegiatan/acara (tidak rutin)"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[160px_1fr] items-center gap-4">
              <label className="text-sm font-medium text-gray-600 flex justify-end">
                Waktu Penagihan
              </label>
              <select
                value={waktuPenagihan}
                onChange={(e) =>
                  setWaktuPenagihan(
                    e.target.value as "Di Awal Periode" | "Di Akhir Periode",
                  )
                }
                className="w-full px-4 py-2.5 bg-white rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="Di Awal Periode">
                  Mengikuti Periode Platform (Di Awal)
                </option>
                <option value="Di Akhir Periode">Di Akhir Periode</option>
              </select>
            </div>

            <div className="grid grid-cols-[160px_1fr] items-start gap-4">
              <label className="text-sm font-medium text-gray-600 flex justify-end gap-1 mt-2.5">
                <span className="text-brand-500">*</span> Tanggal Penagihan
              </label>
              <div>
                <input
                  type="date"
                  value={tanggalMulai}
                  onChange={(e) => setTanggalMulai(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                  ⓘ Tanggal kapan tagihan pertama iuran secara resmi
                  diberlakukan pada platform ini mulai dihitung
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[160px_1fr] items-start gap-4">
              <label className="text-sm font-medium text-gray-600 flex justify-end gap-1 mt-2.5">
                <span className="text-brand-500">*</span> Deskripsi
              </label>
              <div className="relative">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none min-h-[100px]"
                  placeholder="Penjelasan iuran..."
                ></textarea>
                <span className="absolute right-3 bottom-4 text-xs text-gray-400">
                  {description.length} / 100
                </span>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="w-full max-w-2xl space-y-6 animate-in slide-in-from-right-4 fade-in">
            <div className="grid grid-cols-[160px_1fr] items-center gap-4">
              <label className="text-sm font-medium text-gray-600 flex justify-end">
                Mata Uang
              </label>
              <select
                value={mataUang}
                onChange={(e) => setMataUang(e.target.value)}
                className="w-full px-4 py-2.5 bg-white rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="IDR">Indonesian Rupiah (Rp)</option>
              </select>
            </div>

            <div className="grid grid-cols-[160px_1fr] items-start gap-4">
              <label className="text-sm font-medium text-gray-600 flex justify-end gap-1 mt-2.5">
                <span className="text-brand-500">*</span> Nominal Dasar
              </label>
              <div>
                <input
                  type="number"
                  value={nominal}
                  onChange={(e) => setNominal(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-gray-900 shadow-sm shadow-brand-100 placeholder:text-gray-300"
                  placeholder="Cth: 50000"
                />
                <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                  Biarkan kosong bila donasi sukarela/tidak dipatok
                </p>
              </div>
            </div>

            {tipe === "Pemasukan" && (
              <div className="grid grid-cols-[160px_1fr] items-start gap-4">
                <label className="text-sm font-medium text-gray-600 flex justify-end mt-2.5">
                  Terima Pembayaran
                </label>
                <div className="flex items-start gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                  <input
                    type="checkbox"
                    id="showInPayment"
                    checked={showInPayment}
                    onChange={(e) => setShowInPayment(e.target.checked)}
                    className="w-5 h-5 text-brand-600 rounded border-gray-300 focus:ring-brand-500 mt-0.5"
                  />
                  <label htmlFor="showInPayment" className="text-sm font-medium text-blue-900 cursor-pointer">
                    Tampilkan di form Terima Pembayaran
                    <p className="text-xs text-blue-600 font-normal mt-0.5">Jika dicentang, kategori ini akan muncul sebagai opsi saat menerima pembayaran dari Iuran Warga.</p>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="w-full max-w-2xl pt-6 animate-in slide-in-from-right-4 fade-in">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Konfirmasi Iuran
              </h3>
              <p className="text-gray-500 mt-1">
                Periksa kembali rincian di bawah sebelum menyimpan ke direktori.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 space-y-4">
              <div className="flex justify-between border-b pb-3">
                <span className="text-gray-500 text-sm">Nama Iuran</span>
                <span className="font-semibold text-gray-900">
                  {name || "-"}
                </span>
              </div>
              <div className="flex justify-between border-b pb-3">
                <span className="text-gray-500 text-sm">Arus Dana</span>
                <span
                  className={`font-semibold ${tipe === "Pemasukan" ? "text-green-600" : "text-red-600"}`}
                >
                  {tipe}
                </span>
              </div>
              <div className="flex justify-between border-b pb-3">
                <span className="text-gray-500 text-sm">Periode & Tagihan</span>
                <span className="text-gray-900">
                  {periode} ({waktuPenagihan})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Besaran Nominal</span>
                <span className="font-bold text-gray-900">
                  {nominal
                    ? `Rp ${Number(nominal).toLocaleString('id-ID')}`
                    : "Flekibel (Manual)"}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-2xl mt-12 flex justify-between items-center border-t border-gray-100 pt-6">
          {step === 1 ? (
            <button
              onClick={() => navigate("/kategori")}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali Ke Daftar Iuran
            </button>
          ) : (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Kembali
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={!name && step === 1}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#f43f5e] hover:bg-[#e11d48] text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Selanjutnya &rarr;
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-2 px-8 py-2.5 bg-[#f43f5e] hover:bg-[#e11d48] text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
            >
              Simpan Data
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
