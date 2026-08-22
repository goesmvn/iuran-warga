import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, CreditCard, PieChart, Settings, X, Shield, LogOut, Landmark, Receipt, ArrowRightLeft, Minus, ChevronLeft, ChevronRight } from "lucide-react";
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
            { icon: Receipt, label: 'Terima Pembayaran', path: '/pembayaran' },
        ]
    },
    {
        title: 'Keuangan',
        items: [
            { icon: CreditCard, label: 'Arus Kas & Buku Besar', path: '/kas' },
            { icon: Minus, label: 'Catat Pengeluaran/Lain', path: '/pengeluaran' },
            { icon: ArrowRightLeft, label: 'Transfer Antar Kas', path: '/transfer' },
            { icon: PieChart, label: 'Laporan Keuangan', path: '/laporan' },
        ]
    },
    {
        title: 'Data',
        items: [
            { icon: Users, label: 'Data Warga', path: '/warga' },
            { icon: Settings, label: 'Kategori Iuran', path: '/kategori' },
        ]
    }
];

const adminItems = [
    { icon: Landmark, label: 'Pengaturan Kas', path: '/lokasi-kas' },
    { icon: Shield, label: 'Pengelola Sistem', path: '/pengelola' },
];

const NavLinks = ({ setMobileOpen, collapsed }: { setMobileOpen: (open: boolean) => void, collapsed: boolean }) => {
    const { user } = useAuth();
    
    return (
        <div className="mt-4 px-3 space-y-4">
            {menuGroups.map((group, idx) => (
                <div key={idx}>
                    {!collapsed && <h3 className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-brand-400 opacity-80">{group.title}</h3>}
                    <ul className="space-y-0.5">
                        {group.items.map((item) => (
                            <li key={item.path}>
                                <NavLink
                                    to={item.path}
                                    onClick={() => setMobileOpen(false)}
                                    title={collapsed ? item.label : undefined}
                                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-colors ${isActive
                                        ? 'bg-brand-50 text-brand-700'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                        } ${collapsed ? 'justify-center' : ''}`}
                                >
                                    <item.icon className="w-5 h-5 flex-shrink-0" />
                                    {!collapsed && <span className="text-sm">{item.label}</span>}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}

            {user?.role === 'Admin' && (
                <div>
                    {!collapsed && <h3 className="px-3 mb-1 mt-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 opacity-80">Pengaturan</h3>}
                    <ul className="space-y-0.5">
                        {adminItems.map((item) => (
                            <li key={item.path}>
                                <NavLink
                                    to={item.path}
                                    onClick={() => setMobileOpen(false)}
                                    title={collapsed ? item.label : undefined}
                                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-colors ${isActive
                                        ? 'bg-gray-100 text-gray-900'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                        } ${collapsed ? 'justify-center' : ''}`}
                                >
                                    <item.icon className="w-5 h-5 flex-shrink-0" />
                                    {!collapsed && <span className="text-sm">{item.label}</span>}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export function Sidebar({ mobileOpen, setMobileOpen, collapsed, setCollapsed }: { mobileOpen: boolean, setMobileOpen: (open: boolean) => void, collapsed: boolean, setCollapsed: (c: boolean) => void }) {
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
            <aside className={`print:hidden fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'w-20' : 'w-72'}`}>

                <div className={`flex items-center h-16 border-b border-gray-100 px-4 shrink-0 relative ${collapsed ? 'justify-center' : 'justify-between'}`}>
                    <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-orange-100 bg-gradient-to-br from-orange-50 to-orange-100">
                            <JepunIcon className="w-full h-full transform scale-110" />
                        </div>
                        {!collapsed && (
                            <div>
                                <span className="font-display font-bold text-xl text-gray-900 tracking-tight leading-none block">Jepun<span className="text-[#f43f5e]">Kas</span></span>
                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mt-0.5">Sistem Iuran</span>
                            </div>
                        )}
                    </div>
                    
                    {!collapsed && (
                        <button onClick={() => setMobileOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                    
                    {/* Desktop Collapse Toggle */}
                    <button 
                        onClick={() => setCollapsed(!collapsed)} 
                        className="hidden lg:flex absolute -right-3 top-5 bg-white border border-gray-200 rounded-full p-1 text-gray-400 hover:text-brand-600 shadow-sm transition-colors z-50"
                    >
                        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
                    <NavLinks setMobileOpen={setMobileOpen} collapsed={collapsed} />
                </nav>

                <div className="p-4 border-t border-gray-100 shrink-0">
                    {!collapsed ? (
                        <div className="flex flex-col gap-2">
                            <div className="bg-brand-50 rounded-xl p-3 relative overflow-hidden">
                                <div className="absolute top-0 right-0 -mt-2 -mr-2 w-12 h-12 bg-brand-100 rounded-full blur-xl opacity-50"></div>
                                <h4 className="font-semibold text-brand-900 text-xs mb-0.5 truncate">{user?.name || 'Administrator'}</h4>
                                <p className="text-[10px] text-brand-600 font-bold">{user?.role || 'Akses Sistem'}</p>
                            </div>
                            <button 
                                onClick={handleLogout}
                                className="flex items-center gap-2 justify-center w-full px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                            >
                                <LogOut className="w-4 h-4" /> Keluar
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={handleLogout}
                            title="Keluar"
                            className="flex items-center justify-center w-full p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors mx-auto"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    )}
                </div>

            </aside>
        </>
    );
}
