import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, User as UserIcon } from 'lucide-react';
import { JepunIcon } from '../../components/JepunIcon';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        login({ ...data.user, token: data.token });
        navigate('/');
      } else {
        setError(data.error || 'Username atau password tidak sesuai.');
      }
    } catch (err) {
      setError('Gagal menghubungi server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f43f5e]/10 via-orange-50 to-[#e11d48]/5 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-endek-pattern opacity-5 mix-blend-multiply pointer-events-none"></div>
      
      <div className="bg-white/80 backdrop-blur-xl w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-white relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="px-8 pt-10 pb-8 text-center border-b border-gray-100 bg-white/50">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-50 to-orange-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-orange-200 overflow-hidden transform hover:-rotate-3 transition-transform">
            <JepunIcon className="w-24 h-24 transform scale-125" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 font-display tracking-tight">Jepun<span className="text-[#f43f5e]">Kas</span></h2>
          <p className="text-sm text-gray-500 mt-2 font-medium">Akses Portal Pengelola Keuangan RT/RW</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm font-medium p-4 rounded-xl border border-red-100 flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                required
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f43f5e]/20 focus:border-[#f43f5e] bg-gray-50/50 text-gray-900 font-medium transition-colors"
                placeholder="Masukkan username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                required
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f43f5e]/20 focus:border-[#f43f5e] bg-gray-50/50 text-gray-900 font-medium transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#f43f5e] hover:bg-[#e11d48] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#f43f5e]/30 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              'Masuk ke Sistem'
            )}
          </button>
        </form>

        <div className="py-4 text-center text-xs font-semibold text-gray-400 border-t border-gray-100 bg-gray-50/50">
          JepunKas - Sistem Iuran v1.0.0
        </div>
      </div>
    </div>
  );
}
