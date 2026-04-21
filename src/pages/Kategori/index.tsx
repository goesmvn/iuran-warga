import { useState } from "react";
import { Link } from "react-router-dom";
import { useCategory } from "../../hooks/useCategory";
import { useTransaksi } from "../../hooks/useTransaksi";
import { Plus, Edit2, X, Trash2, CheckCircle2 } from "lucide-react";
import type { Category } from "../../types";

export default function DaftarIuran() {
  const { categories, deleteCategory, updateCategory } = useCategory();
  const { transactions } = useTransaksi();
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

      {/* List / Table Container */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-[#e2e8f0] text-gray-800">
              <tr>
                <th className="px-4 py-3 border border-gray-300 text-left font-bold uppercase tracking-wider text-xs">Informasi Iuran</th>
                <th className="px-4 py-3 border border-gray-300 text-left font-bold uppercase tracking-wider text-xs">Arus Dana & Periode</th>
                <th className="px-4 py-3 border border-gray-300 text-right font-bold uppercase tracking-wider text-xs">Nominal Default</th>
                <th className="px-4 py-3 border border-gray-300 text-center font-bold uppercase tracking-wider text-xs w-32">Status Tampil</th>
                <th className="px-4 py-3 border border-gray-300 text-center font-bold uppercase tracking-wider text-xs w-32">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, idx) => {
                const isUsed = transactions.some(t => t.categoryId === cat.id);
                return (
                  <tr key={cat.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-gray-50 transition-colors`}>
                    <td className="px-4 py-3 border border-gray-200">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 relative mt-0.5">
                          <div className={`absolute inset-0 bg-gradient-to-br ${cat.type === "Pemasukan" ? "from-orange-400 to-orange-600" : "from-gray-400 to-gray-500"} opacity-70`}></div>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">{cat.name}</p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{cat.description || `Digunakan untuk pencatatan ${cat.type.toLowerCase()} warga.`}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 border border-gray-200">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {cat.type === "Pemasukan" ? (
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">Pemasukan</span>
                        ) : (
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">Pengeluaran</span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${cat.periode === "Tahunan" ? 'text-purple-700 bg-purple-50 border border-purple-100' : cat.periode === "Insidental" ? 'text-rose-700 bg-rose-50 border border-rose-100' : 'text-blue-700 bg-blue-50 border border-blue-100'}`}>
                          {cat.periode || "Bulanan"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 border border-gray-200 text-right">
                      {cat.defaultNominal ? (
                        <span className="font-bold text-gray-900 tracking-tight">Rp {cat.defaultNominal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      ) : (
                        <span className="text-gray-400 font-medium text-xs">Bebas/Sukarela</span>
                      )}
                    </td>
                    <td className="px-4 py-3 border border-gray-200 text-center">
                      {cat.showInPayment !== false ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200 px-2.5 py-1 rounded-full inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/>Tampil</span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 border border-gray-200 px-2.5 py-1 rounded-full inline-flex items-center gap-1"><X className="w-3 h-3"/>Sembunyi</span>
                      )}
                    </td>
                    <td className="px-4 py-3 border border-gray-200">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setEditingCategory(cat)}
                          className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Edit Iuran"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        
                        {isUsed ? (
                          <button
                            type="button"
                            className="p-1.5 text-gray-300 cursor-not-allowed"
                            title="Tidak bisa dihapus karena sudah dipakai"
                            onClick={() => alert("Kategori ini tidak dapat dihapus karena sudah digunakan dalam " + transactions.filter(t => t.categoryId === cat.id).length + " pencatatan transaksi.")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if(window.confirm('Yakin menghapus kategori iuran ini secara permanen?')) {
                                deleteCategory(cat.id);
                              }
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus Iuran"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    Belum ada Iuran atau Kategori yang dibuat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
