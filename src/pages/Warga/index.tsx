import { useState, useRef } from "react";
import { useWarga } from "../../hooks/useWarga";
import { Plus, Trash2, Edit2, Upload, Download, Users, Printer } from "lucide-react";
import Papa from "papaparse";

import type { Resident } from "../../types";
import { PrintKartuModal } from "../../components/PrintKartuModal";

export default function Warga() {
  const { warga, addWarga, updateWarga, deleteWarga, importWarga } = useWarga();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [printWarga, setPrintWarga] = useState<Resident | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [nomorRumah, setNomorRumah] = useState("");
  const [namaKepalaKeluarga, setNamaKepalaKeluarga] = useState("");
  const [noHp, setNoHp] = useState("");
  const [status, setStatus] = useState<"Aktif" | "Pindah">("Aktif");
  const [tanggalMasuk, setTanggalMasuk] = useState(
    new Date().toISOString().split("T")[0],
  );

  const openAddModal = () => {
    setEditingId(null);
    setNomorRumah("");
    setNamaKepalaKeluarga("");
    setNoHp("");
    setStatus("Aktif");
    setTanggalMasuk(new Date().toISOString().split("T")[0]);
    setIsModalOpen(true);
  };

  const openEditModal = (w: Resident) => {
    setEditingId(w.id);
    setNomorRumah(w.nomorRumah);
    setNamaKepalaKeluarga(w.namaKepalaKeluarga);
    setNoHp(w.noHp || "");
    setStatus(w.status);
    setTanggalMasuk(w.tanggalMasuk.split("T")[0].split(" ")[0]);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nomorRumah,
      namaKepalaKeluarga,
      noHp,
      status,
      tanggalMasuk: new Date(tanggalMasuk).toISOString(),
    };

    if (editingId) {
      updateWarga(editingId, payload);
    } else {
      addWarga(payload);
    }
    setIsModalOpen(false);
  };

  // Import CSV Logic
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedWarga = (results.data as Record<string, string>[]).map(
          (row) => ({
            nomorRumah: row["Nomor Rumah/Blok"] || "N/A",
            namaKepalaKeluarga: row["Nama Kepala Keluarga"] || "Tanpa Nama",
            noHp: row["No HP"] || "",
            status: (row["Status"] === "Pindah" ? "Pindah" : "Aktif") as
              | "Aktif"
              | "Pindah",
            tanggalMasuk:
              row["Tanggal Masuk (YYYY-MM-DD)"] || new Date().toISOString(),
          }),
        );
        importWarga(parsedWarga);
        if (fileInputRef.current) fileInputRef.current.value = "";
        alert(`Berhasil mengimpor ${parsedWarga.length} data warga!`);
      },
      error: (error) => {
        console.error("Error parsing CSV:", error);
        alert("Gagal membaca file CSV. Pastikan format sudah benar.");
      },
    });
  };

  const downloadTemplate = () => {
    const csvContent =
      "Nomor Rumah/Blok,Nama Kepala Keluarga,No HP,Status,Tanggal Masuk (YYYY-MM-DD)\nA1,Bapak Budi,08123456789,Aktif,2024-01-01\nB2,Ibu Siti,,Aktif,2024-02-15";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_import_warga.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Direktori Warga</h2>
          <p className="text-gray-500 text-sm mt-1">
            Data master penghuni lingkungan.
          </p>
        </div>
        <div className="flex gap-3">
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 p-2 rounded-lg transition-colors shadow-sm"
            title="Download Template CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <div className="h-9 w-px bg-gray-200 mx-1"></div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Tambah Warga
          </button>
        </div>
      </div>

      <div className="print:hidden bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Blok / Rumah</th>
                <th className="px-6 py-4">Kepala Keluarga</th>
                <th className="px-6 py-4">Kontak</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Bergabung</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {warga.map((w) => (
                <tr
                  key={w.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-6 py-4 font-semibold text-gray-800">
                    {w.nomorRumah}
                  </td>
                  <td className="px-6 py-4 text-gray-700 font-medium">
                    {w.namaKepalaKeluarga}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{w.noHp || "-"}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        w.status === "Aktif"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {w.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(w.tanggalMasuk).toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => setPrintWarga(w)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Cetak Kartu Iuran"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(w)}
                      className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      title="Edit Data Warga"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if(window.confirm('Yakin ingin menghapus warga ini? (Data transaksi yang terikat mungkin akan kehilangan referensi)')) {
                          deleteWarga(w.id);
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus Warga"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {warga.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 mb-3">
                      <Users className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">
                      Belum ada data warga terdaftar.
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Gunakan tombol Import CSV atau Tambah Manual.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden relative z-10">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-lg text-gray-900">
                {editingId ? "Edit Data Warga" : "Registrasi Warga Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Kepala Keluarga
                  </label>
                  <input
                    required
                    type="text"
                    value={namaKepalaKeluarga}
                    onChange={(e) => setNamaKepalaKeluarga(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-shadow"
                    placeholder="Cth: I Wayan Darma"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Blok / No. Rumah
                  </label>
                  <input
                    required
                    type="text"
                    value={nomorRumah}
                    onChange={(e) => setNomorRumah(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-shadow"
                    placeholder="Cth: Blok A/12"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    No. Handphone
                  </label>
                  <input
                    type="text"
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-shadow"
                    placeholder="08..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as "Aktif" | "Pindah")
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-shadow bg-white"
                  >
                    <option value="Aktif">Aktif Menetap</option>
                    <option value="Pindah">Pindah / Keluar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Masuk
                  </label>
                  <input
                    type="date"
                    value={tanggalMasuk}
                    onChange={(e) => setTanggalMasuk(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-shadow"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors shadow-brand-500/30 shadow-sm"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Print Kartu Modal */}
      <PrintKartuModal 
          isOpen={!!printWarga} 
          onClose={() => setPrintWarga(null)} 
          warga={printWarga} 
      />
      
    </div>
  );
}
