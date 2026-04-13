import { useState } from "react";
import { Link } from "react-router-dom";
import { useCategory } from "../../hooks/useCategory";
import { Plus, Edit2, X } from "lucide-react";
import type { Category } from "../../types";

export default function DaftarIuran() {
  const { categories, deleteCategory, updateCategory } = useCategory();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      updateCategory(editingCategory.id, editingCategory);
      setEditingCategory(null);
    }
  };

  const totalIuranDikelola = categories.length;
  // Ini contoh statik untuk 'Total Tergabung Iuran' karena logika membership detail tiap warga bisa dikembangkan lebih jauh,
  // di simulasi ini kita anggap semua warga aktif adalah anggota (bisa di-fetch dari useWarga jika diperlukan).

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-gray-100 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-display">
            Daftar Iuran
          </h2>
          <p className="text-gray-500 mt-1">
            Kelola pembukuan pemasukan dan pengeluaran.
          </p>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-6 relative overflow-hidden">
          <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100 relative z-10 text-orange-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-8 h-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <div className="relative z-10">
            <p className="text-gray-500 font-medium">Total Iuran Dicatat</p>
            <h3 className="text-4xl font-bold text-gray-900 font-display">
              {totalIuranDikelola}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Peran anda sebagai pengelola
            </p>
          </div>
          <div className="absolute -right-4 -top-8 w-32 h-32 bg-orange-50 rounded-full blur-2xl opacity-50"></div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-6">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center border border-green-100 text-green-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-8 h-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
              />
            </svg>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Tipe Arus Dana Aktif</p>
            <h3 className="text-4xl font-bold text-gray-900 font-display">2</h3>
            <p className="text-sm text-gray-400 mt-1">
              Pemasukan & Pengeluaran
            </p>
          </div>
        </div>
      </div>

      {/* Toolbox */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Cari iuran..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
            Filter
          </button>
        </div>
        <Link
          to="/kategori/baru"
          className="flex items-center gap-2 px-6 py-2.5 bg-[#f43f5e] hover:bg-[#e11d48] text-white rounded-lg text-sm font-bold shadow-sm transition-colors w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" /> Buat Iuran Baru
        </Link>
      </div>

      {/* Grid Cards Container */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden relative group flex flex-col justify-between h-[280px]"
          >
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 relative">
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${cat.type === "Pemasukan" ? "from-orange-400 to-orange-600" : "from-gray-400 to-gray-500"} opacity-80`}
                    ></div>
                    {/* Abstract geometric decoration inside the icon space */}
                    <div className="absolute inset-0 bg-endek-pattern opacity-20 transform scale-150"></div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1 text-[10px] font-bold tracking-widest uppercase">
                      <span
                        className={
                          cat.periode === "Tahunan"
                            ? "text-purple-600"
                            : cat.periode === "Insidental"
                            ? "text-rose-600"
                            : "text-blue-600"
                        }
                      >
                        {cat.periode || "Bulanan"}
                      </span>
                      {cat.type === "Pemasukan" && (
                        <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                          Pemasukan
                        </span>
                      )}
                      {cat.type === "Pengeluaran" && (
                        <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                          Pengeluaran
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 leading-tight">
                      {cat.name}
                    </h3>
                  </div>
                </div>
                <div className="relative flex gap-2">
                  <button
                    onClick={() => setEditingCategory(cat)}
                    className="p-1 text-gray-400 hover:text-brand-500 rounded focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Edit Iuran"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                        if(window.confirm('Yakin menghapus Iuran/Kategori ini? Seluruh transaksi terkait mungkin akan gagal dirender dengan benar.')) {
                            deleteCategory(cat.id);
                        }
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 rounded focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Hapus Iuran"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-500 line-clamp-2 mt-2">
                {cat.description ||
                  `Digunakan untuk pencatatan ${cat.type.toLowerCase()} warga.`}
              </p>
            </div>

            <div className="px-5 pb-5">
              <div className="flex items-end justify-between border-t border-gray-100 pt-4">
                <div>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1">
                    Nominal Iuran
                  </p>
                  <p className="font-bold tracking-tight text-gray-900">
                    {cat.defaultNominal ? (
                      `Rp${cat.defaultNominal.toLocaleString("id-ID")}`
                    ) : (
                      <span className="text-gray-400 font-medium text-sm">
                        Nominal Bebas
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1">
                    Dibuat Sejak
                  </p>
                  <p className="text-xs font-semibold text-gray-800">
                    {cat.id.startsWith("cat-")
                      ? "Sistem Default"
                      : "Baru Ditambahkan"}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="border-t border-gray-50 bg-gray-50/50 p-3 flex justify-end items-center text-xs px-5">
              <button onClick={() => setEditingCategory(cat)} className="text-orange-600 font-semibold hover:text-orange-700 flex items-center gap-1">
                Edit Kategori{" "}
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
            <p>Belum ada Iuran atau Kategori yang dibuat.</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setEditingCategory(null)}></div>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden relative z-10">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-lg text-gray-900">Edit Kategori Iuran</h3>
              <button type="button" onClick={() => setEditingCategory(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Iuran</label>
                <input required type="text" value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Arus Dana</label>
                  <select value={editingCategory.type} onChange={e => setEditingCategory({...editingCategory, type: e.target.value as any})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                    <option value="Pemasukan">Pemasukan</option>
                    <option value="Pengeluaran">Pengeluaran</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Periode</label>
                  <select value={editingCategory.periode || "Bulanan"} onChange={e => setEditingCategory({...editingCategory, periode: e.target.value as any})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                    <option value="Bulanan">Bulanan</option>
                    <option value="Tahunan">Tahunan</option>
                    <option value="Insidental">Insidental</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nominal Default (Rp)</label>
                <input type="number" value={editingCategory.defaultNominal || ''} onChange={e => setEditingCategory({...editingCategory, defaultNominal: e.target.value ? Number(e.target.value) : undefined})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="Biarkan kosong jika bebas/sukarela" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea value={editingCategory.description || ''} onChange={e => setEditingCategory({...editingCategory, description: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" rows={3}></textarea>
              </div>
              
              <div className="flex items-center gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <input
                  type="checkbox"
                  id="showInPayment"
                  checked={editingCategory.showInPayment !== false}
                  onChange={(e) => setEditingCategory({ ...editingCategory, showInPayment: e.target.checked })}
                  className="w-5 h-5 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                />
                <label htmlFor="showInPayment" className="text-sm font-medium text-blue-900 cursor-pointer">
                  Tampilkan di form Terima Pembayaran
                  <p className="text-xs text-blue-600 font-normal mt-0.5">Jika dicentang, kategori ini akan muncul sebagai opsi saat menerima pembayaran dari Iuran Warga.</p>
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-4">
                <button type="button" onClick={() => setEditingCategory(null)} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Batal</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors shadow-brand-500/30 shadow-sm">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
