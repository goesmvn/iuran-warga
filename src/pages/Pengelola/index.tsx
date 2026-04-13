import { useState, useEffect, useRef } from 'react';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../hooks/useSettings';
import { Shield, Trash2, Plus, X, Settings, Download, Upload, Database } from 'lucide-react';
import { apiFetch } from '../../utils/apiFetch';

export default function Pengelola() {
  const { users, addUser, deleteUser } = useUsers();
  const { user: currentUser } = useAuth();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Admin' | 'Staff'>('Staff');

  const { settings, updateSetting, loading: settingsLoading } = useSettings();
  const startYear = settings['start_year'] || new Date().getFullYear().toString();
  const namaKetua = settings['nama_ketua'] || 'Bapak Ketua';
  const namaBendahara = settings['nama_bendahara'] || 'Bapak Bendahara';
  
  const [isUpdatingSetting, setIsUpdatingSetting] = useState(false);
  const [localStartYear, setLocalStartYear] = useState('');
  const [localNamaKetua, setLocalNamaKetua] = useState('');
  const [localNamaBendahara, setLocalNamaBendahara] = useState('');

  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = async () => {
    try {
        const res = await apiFetch('/api/backup');
        if (!res.ok) {
            const data = await res.json();
            alert(data.error || 'Gagal mengunduh backup');
            return;
        }
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'jepunkas-backup.sqlite';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (e) {
        console.error(e);
        alert('Terjadi kesalahan saat mengunduh backup');
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.sqlite')) {
      alert('Hanya file berformat .sqlite yang diizinkan!');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!confirm('Peringatan: Me-restore database akan menimpa seluruh data yang ada saat ini. Yakin ingin melanjutkan?')) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

    setIsRestoring(true);
    try {
      const buffer = await file.arrayBuffer();
      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: buffer
      });
      const data = await res.json();
      
      if (res.ok) {
        alert('Restore berhasil! Sistem akan dimuat ulang...');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        alert(data.error || 'Terjadi kesalahan saat restore.');
      }
    } catch (err) {
      console.error(err);
      alert('Gagal me-restore data karena kesalahan sistem.');
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!settingsLoading) {
       setLocalStartYear(startYear);
       setLocalNamaKetua(namaKetua);
       setLocalNamaBendahara(namaBendahara);
    }
  }, [startYear, namaKetua, namaBendahara, settingsLoading]);

  const handleUpdateSettings = async () => {
    setIsUpdatingSetting(true);
    let changed = false;
    if (localStartYear && localStartYear !== startYear) { await updateSetting('start_year', localStartYear); changed = true; }
    if (localNamaKetua && localNamaKetua !== namaKetua) { await updateSetting('nama_ketua', localNamaKetua); changed = true; }
    if (localNamaBendahara && localNamaBendahara !== namaBendahara) { await updateSetting('nama_bendahara', localNamaBendahara); changed = true; }
    
    setIsUpdatingSetting(false);
    if (changed) alert("Pengaturan berhasil disimpan.");
  };

  if (currentUser?.role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Shield className="w-16 h-16 text-red-200 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h2>
        <p className="text-gray-500">Hanya Pengelola sistem dengan role Admin yang dapat mengakses halaman ini.</p>
      </div>
    );
  }

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    addUser({ username, password, name, role });
    setIsModalOpen(false);
    setUsername(''); setPassword(''); setName(''); setRole('Staff');
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-gray-100 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-display">Manajemen Pengelola</h2>
          <p className="text-gray-500 mt-1">Kelola akun akses aplikasi (Admin & Staff).</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#f43f5e] hover:bg-[#e11d48] text-white rounded-lg text-sm font-bold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Tambah Pengguna Terdaftar
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50/50 text-gray-500 font-medium border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">Nama Lengkap</th>
              <th className="px-6 py-4">Username (Akses)</th>
              <th className="px-6 py-4">Hak Akses</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-gray-900">
                  {u.name}
                  {currentUser.id === u.id && <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Anda</span>}
                </td>
                <td className="px-6 py-4 text-gray-600">@{u.username}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${u.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {currentUser.id !== u.id && u.username !== 'admin' && (
                    <button
                      onClick={() => {
                        if(confirm('Yakin menghapus hak akses pengguna ini?')) deleteUser(u.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus Izin"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 border-t border-gray-100 pt-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 font-display flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-400" /> Pengaturan Aplikasi
          </h2>
          <p className="text-gray-500 mt-1 text-sm">Konfigurasi parameter utama sistem pembukuan.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-xl">
          <div className="flex flex-col gap-2">
             <label className="text-sm font-bold text-gray-700">Tahun Mulai Pembukuan (Data Awal)</label>
             <p className="text-xs text-gray-500 mb-2">Semua perhitungan tunggakan / tagihan warga akan ditagih secara akumulatif mulai dari tahun yang ditentukan di bawah ini hingga tahun saat ini.</p>
             <div className="flex items-center gap-3">
                {settingsLoading ? (
                  <div className="h-11 w-48 bg-gray-100 rounded-xl animate-pulse"></div>
                ) : (
                  <input 
                    type="number" 
                    value={localStartYear}
                    onChange={(e) => setLocalStartYear(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f43f5e]/20 focus:border-[#f43f5e] bg-gray-50 text-gray-900 font-bold max-w-[200px]" 
                  />
                )}
                
                 <button 
                  type="button" 
                  onClick={handleUpdateSettings}
                  disabled={isUpdatingSetting}
                  className="px-5 py-2.5 bg-[#f43f5e] hover:bg-[#e11d48] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm flex items-center shadow-sm"
                >
                  {isUpdatingSetting ? 'Menyimpan...' : 'Simpan'}
                </button>
             </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-6 border-t border-gray-100 pt-6">
             <div className="flex-1 flex flex-col gap-2">
                 <label className="text-sm font-bold text-gray-700">Nama Pengurus (Ketua)</label>
                 <input 
                    type="text" 
                    value={localNamaKetua}
                    onChange={(e) => setLocalNamaKetua(e.target.value)}
                    placeholder="Contoh: Bapak Ketua..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f43f5e]/20 focus:border-[#f43f5e] bg-gray-50 text-gray-900 font-medium" 
                 />
             </div>
             <div className="flex-1 flex flex-col gap-2">
                 <label className="text-sm font-bold text-gray-700">Nama Pengurus (Bendahara)</label>
                 <input 
                    type="text" 
                    value={localNamaBendahara}
                    onChange={(e) => setLocalNamaBendahara(e.target.value)}
                    placeholder="Contoh: Bapak Bendahara..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f43f5e]/20 focus:border-[#f43f5e] bg-gray-50 text-gray-900 font-medium" 
                 />
             </div>
          </div>
        </div>

        <div className="mt-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 font-display flex items-center gap-2">
            <Database className="w-5 h-5 text-gray-400" /> Backup & Restore Database
          </h2>
          <p className="text-gray-500 mt-1 text-sm">Unduh salinan data (Backup) atau unggah data lama (Restore).</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-xl">
          <div className="flex flex-col sm:flex-row gap-4">
             <div className="flex-1 border border-gray-100 rounded-xl p-5 bg-gray-50/50">
               <h3 className="font-bold text-gray-800 text-sm mb-2">Backup Data (Unduh)</h3>
               <p className="text-xs text-gray-500 mb-4">Simpan seluruh data kas, warga, dan transaksi ke perangkat Anda (format file .sqlite).</p>
               <button onClick={handleBackup} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-lg text-sm transition-colors shadow-sm">
                 <Download className="w-4 h-4" /> Download Backup
               </button>
             </div>
             <div className="flex-1 border border-red-100 rounded-xl p-5 bg-red-50/30">
               <h3 className="font-bold text-red-800 text-sm mb-2">Restore Data (Unggah)</h3>
               <p className="text-xs text-gray-500 mb-4 text-red-600/80">Perhatian: Restore akan menimpa database saat ini dengan file yang Anda upload!</p>
               <input type="file" accept=".sqlite" ref={fileInputRef} onChange={handleRestore} className="hidden" />
               <button 
                 onClick={() => fileInputRef.current?.click()} 
                 disabled={isRestoring}
                 className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#f43f5e] hover:bg-[#e11d48] disabled:bg-gray-300 text-white font-bold rounded-lg text-sm transition-colors shadow-sm"
               >
                 {isRestoring ? 'Memproses...' : <><Upload className="w-4 h-4" /> Upload Restore</>}
               </button>
             </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative z-10">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-lg text-gray-900">Tambah Akses Pengelola</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nama Lengkap Pengelola</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f43f5e]/20 focus:border-[#f43f5e] bg-gray-50 text-gray-900" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Username</label>
                  <input required type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f43f5e]/20 focus:border-[#f43f5e] bg-gray-50 text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Hak Akses Role</label>
                  <select value={role} onChange={e => setRole(e.target.value as 'Admin' | 'Staff')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f43f5e]/20 focus:border-[#f43f5e] bg-gray-50 font-medium">
                    <option value="Staff">Pencatat (Staff)</option>
                    <option value="Admin">Ketua/Admin Utama</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Passkey Default</label>
                <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f43f5e]/20 focus:border-[#f43f5e] bg-gray-50 text-gray-900" />
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Batal</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-[#f43f5e] hover:bg-[#e11d48] rounded-xl transition-colors shadow-sm">Simpan Kredensial</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
