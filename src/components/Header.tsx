import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { SyncStatus } from "./SyncStatus";
import { useAuth } from "../contexts/AuthContext";

// Judul header mengikuti halaman yang sedang dibuka
const TITLES: Record<string, string> = {
    "/": "Beranda",
    "/pembayaran": "Terima Pembayaran",
    "/pengeluaran": "Catat Pengeluaran",
    "/kas": "Buku Kas",
    "/transfer": "Transfer Antar Kas",
    "/laporan": "Laporan Keuangan",
    "/warga": "Data Warga",
    "/kategori": "Kategori Iuran",
    "/kategori/baru": "Kategori Iuran Baru",
    "/lokasi-kas": "Pengaturan Kas",
    "/pengelola": "Pengelola Sistem",
};

const initials = (name?: string) =>
    (name || "Pengurus").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join("");

export function Header({ setMobileOpen }: { setMobileOpen: (open: boolean) => void }) {
    const { pathname } = useLocation();
    const { user } = useAuth();

    return (
        <header className="print:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 min-w-0">
                <button
                    onClick={() => setMobileOpen(true)}
                    aria-label="Buka menu"
                    className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-800 truncate">{TITLES[pathname] ?? "JepunKas"}</h1>
            </div>

            <div className="flex items-center gap-3 shrink-0">
                <SyncStatus />
                <div
                    title={user?.name}
                    className="h-9 w-9 rounded-full bg-gradient-to-tr from-brand-500 to-orange-400 border-2 border-white shadow-sm flex items-center justify-center text-white text-xs font-bold"
                >
                    {initials(user?.name)}
                </div>
            </div>
        </header>
    );
}
