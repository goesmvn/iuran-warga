import { useState } from 'react';
import { useKasLocation, DEFAULT_KAS_LOCATION_ID } from '../../hooks/useKasLocation';
import { useAuth } from '../../contexts/AuthContext';
import { Building, Banknote, Wallet, Trash2, Plus, X, Landmark, Database, Edit2 } from 'lucide-react';
import type { KasLocation } from '../../types';

export default function LokasiKas() {
  const { locations, addLocation, deleteLocation, updateLocation } = useKasLocation();
  const { user: currentUser } = useAuth();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [type, setType] = useState<'Tunai' | 'Bank' | 'E-Wallet'>('Tunai');
  const [description, setDescription] = useState('');

  if (currentUser?.role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Landmark className="w-16 h-16 text-red-200 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h2>
        <p className="text-gray-500">Hanya Pengelola dengan role Admin yang dapat mengatur Lokasi Kas (Rekening).</p>
      </div>
    );
  }

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLocationId) {
      updateLocation(editingLocationId, { name, type, description });
    } else {
      addLocation({ name, type, description });
    }
    setIsModalOpen(false);
    setEditingLocationId(null);
    setName(''); setType('Tunai'); setDescription('');
  };

  const openAddModal = () => {
    setEditingLocationId(null);
    setName('');
    setType('Tunai');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (loc: KasLocation) => {
    setEditingLocationId(loc.id);
    setName(loc.name);
    setType(loc.type);
    setDescription(loc.description || '');
    setIsModalOpen(true);
  };

  const getTypeIcon = (t: string) => {
    switch (t) {
      case 'Tunai': return <Banknote className="w-5 h-5 text-green-500" />;
      case 'Bank': return <Building className="w-5 h-5 text-blue-500" />;
      case 'E-Wallet': return <Wallet className="w-5 h-5 text-purple-500" />;
      default: return <Database className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-gray-100 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-display flex items-center gap-2">
            <Landmark className="w-6 h-6 text-[#f43f5e]" /> Pengaturan Lokasi Kas
          </h2>
          <p className="text-gray-500 mt-1">Kelola rekening bank, brankas tunai, atau dompet digital RT/RW.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#f43f5e] hover:bg-[#e11d48] text-white rounded-lg text-sm font-bold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Tambah Rekening/Kas
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map((loc) => (
          <div key={loc.id} className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${loc.type === 'Tunai' ? 'from-green-100 to-green-50' : loc.type === 'Bank' ? 'from-blue-100 to-blue-50' : 'from-purple-100 to-purple-50'} rounded-bl-full -mr-4 -mt-4 opacity-50`}></div>
            
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${loc.type === 'Tunai' ? 'bg-green-100 text-green-600' : loc.type === 'Bank' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                {getTypeIcon(loc.type)}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(loc);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit Lokasi"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {loc.id !== DEFAULT_KAS_LOCATION_ID && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if(confirm(`Yakin menghapus Lokasi Kas: ${loc.name}? Transaksi lama mungkin akan kehilangan referensi nama letaknya.`)) deleteLocation(loc.id);
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Hapus Lokasi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="relative z-10">
              <span className="text-[10px] font-bold tracking-wider uppercase text-gray-400 mb-1 block">{loc.type}</span>
              <h3 className="font-bold text-gray-900 text-lg mb-1">{loc.name}</h3>
              <p className="text-sm text-gray-500 line-clamp-2">{loc.description || 'Tidak ada deskripsi.'}</p>
              
              {loc.id === DEFAULT_KAS_LOCATION_ID && (
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs font-semibold text-green-600">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div> Lokasi Utama Utama (Default)
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative z-10">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-lg text-gray-900">{editingLocationId ? "Edit Akun/Lokasi Kas" : "Tambah Akun/Lokasi Kas"}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSaveLocation} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nama Lokasi/Rekening</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Misal: Bank BCA RT 01" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f43f5e]/20 focus:border-[#f43f5e] bg-gray-50 text-gray-900" />
              </div>
              <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Tipe Penyimpanan</label>
                  <select value={type} onChange={e => setType(e.target.value as any)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f43f5e]/20 focus:border-[#f43f5e] bg-gray-50 font-medium text-gray-900">
                    <option value="Tunai">Uang Tunai Fisik</option>
                    <option value="Bank">Rekening Bank</option>
                    <option value="E-Wallet">Dompet Digital (GoPay, DANA, dll)</option>
                  </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Deskripsi Tambahan</label>
                <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Nomor rekening atau keterangan lainnya..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f43f5e]/20 focus:border-[#f43f5e] bg-gray-50 text-gray-900 resize-none" />
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Batal</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-[#f43f5e] hover:bg-[#e11d48] rounded-xl transition-colors shadow-sm">Simpan Rekening</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
