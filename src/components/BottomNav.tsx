import { NavLink } from "react-router-dom";
import { LayoutDashboard, Receipt, Users, CreditCard, PieChart } from "lucide-react";

// Menu yang paling sering dipakai pengurus, bisa dijangkau satu ketukan jempol di HP
const items = [
    { icon: LayoutDashboard, label: "Beranda", path: "/" },
    { icon: Receipt, label: "Bayar", path: "/pembayaran" },
    { icon: Users, label: "Warga", path: "/warga" },
    { icon: CreditCard, label: "Kas", path: "/kas" },
    { icon: PieChart, label: "Laporan", path: "/laporan" },
];

export function BottomNav() {
    return (
        <nav
            aria-label="Navigasi utama"
            className="lg:hidden print:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
            <ul className="grid grid-cols-5">
                {items.map(({ icon: Icon, label, path }) => (
                    <li key={path}>
                        <NavLink
                            to={path}
                            end={path === "/"}
                            className={({ isActive }) =>
                                `flex flex-col items-center justify-center gap-0.5 h-16 text-[11px] font-semibold transition-colors ${
                                    isActive ? "text-brand-600" : "text-gray-500 active:text-gray-800"
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <span className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors ${isActive ? "bg-brand-50" : ""}`}>
                                        <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                                    </span>
                                    {label}
                                </>
                            )}
                        </NavLink>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
