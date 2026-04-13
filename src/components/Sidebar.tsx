import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, CreditCard, PieChart, Settings, X, Shield, LogOut, Landmark, Receipt } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";

const JepunIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <radialGradient id="jepun-center" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#f43f5e" /> 
        <stop offset="40%" stopColor="#facc15" /> 
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
      </radialGradient>
    </defs>
    <g transform="translate(50,50)">
      {[0, 72, 144, 216, 288].map(angle => (
        <path
          key={angle}
          transform={`rotate(${angle})`}
          d="M0,0 C-25,-15 -35,-42 0,-48 C20,-40 10,-15 0,0"
          fill="#ffffff"
          stroke="#fef08a"
          strokeWidth="1.5"
          className="drop-shadow-sm"
        />
      ))}
    </g>
    <circle cx="50" cy="50" r="22" fill="url(#jepun-center)" />
  </svg>
);

const menuGroups = [
    {
        title: 'Utama',
        items: [
            { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
            { icon: Users, label: 'Data Warga', path: '/warga' },
        ]
    },
    {
        title: 'Keuangan',
        items: [
            { icon: Receipt, label: 'Terima Pembayaran', path: '/pembayaran' },
            { icon: CreditCard, label: 'Arus Kas & Buku Besar', path: '/kas' },
            { icon: PieChart, label: 'Laporan Keuangan', path: '/laporan' },
        ]
    },
    {
        title: 'Master Data',
        items: [
            { icon: Settings, label: 'Kategori Iuran', path: '/kategori' },
        ]
    }
];

const NavLinks = ({ setMobileOpen }: { setMobileOpen: (open: boolean) => void }) => {
    const { user } = useAuth();
    
    return (
        <div className="mt-6 px-4 space-y-6">
            {menuGroups.map((group, idx) => (
                <div key={idx}>
                    <h3 className="px-3 mb-2 text-xs font-bold uppercase tracking-widest text-brand-400 opacity-80">{group.title}</h3>
                    <ul className="space-y-1">
                        {group.items.map((item) => (
                            <li key={item.path}>
                                <NavLink
                                    to={item.path}
                                    onClick={() => setMobileOpen(false)}
                                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${isActive
                                        ? 'bg-brand-50 text-brand-700'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <item.icon className="w-5 h-5 flex-shrink-0" />
                                    <span>{item.label}</span>
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}

            {user?.role === 'Admin' && (
                <div>
                    <h3 className="px-3 mb-2 mt-6 text-xs font-bold uppercase tracking-widest text-purple-400 opacity-80">Sistem Admin</h3>
                    <ul className="space-y-1">
                        <li>
                            <NavLink
                                to="/pengelola"
                                onClick={() => setMobileOpen(false)}
                                className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${isActive
                                    ? 'bg-purple-50 text-purple-700'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-purple-600'
                                    }`}
                            >
                                <Shield className="w-5 h-5 flex-shrink-0" />
                                <span>Pengelola Sistem</span>
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/lokasi-kas"
                                onClick={() => setMobileOpen(false)}
                                className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${isActive
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-blue-600'
                                    }`}
                            >
                                <Landmark className="w-5 h-5 flex-shrink-0" />
                                <span>Pengaturan Kas</span>
                            </NavLink>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export function Sidebar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean, setMobileOpen: (open: boolean) => void }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <>
            {/* Mobile Backdrop */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setMobileOpen(false)}
                        className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Panel */}
            <aside className={`print:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>

                <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-md border border-orange-100 bg-gradient-to-br from-orange-50 to-orange-100">
                            <JepunIcon className="w-full h-full transform scale-110" />
                        </div>
                        <div>
                            <span className="font-display font-bold text-2xl text-gray-900 tracking-tight leading-none block">Jepun<span className="text-[#f43f5e]">Kas</span></span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block -mt-0.5">Sistem Iuran</span>
                        </div>
                    </div>
                    <button onClick={() => setMobileOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto pb-4">
                    <NavLinks setMobileOpen={setMobileOpen} />
                </nav>

                <div className="p-6 border-t border-gray-100 flex flex-col gap-3">
                    <div className="bg-brand-50 rounded-xl p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-brand-100 rounded-full blur-xl opacity-50"></div>
                        <h4 className="font-semibold text-brand-900 text-sm mb-1">{user?.name || 'Administrator'}</h4>
                        <p className="text-xs text-brand-600 font-bold">{user?.role || 'Akses Sistem'}</p>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="flex items-center gap-2 justify-center w-full px-4 py-2.5 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors shadow-sm"
                    >
                        <LogOut className="w-4 h-4" /> Keluar Sistem
                    </button>
                </div>

            </aside>
        </>
    );
}
