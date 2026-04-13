import { Menu, Bell } from "lucide-react";

export function Header({ setMobileOpen }: { setMobileOpen: (open: boolean) => void }) {
    return (
        <header className="print:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => setMobileOpen(true)}
                    className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-semibold text-gray-800 hidden sm:block">Dashboard Kas Warga</h1>
            </div>

            <div className="flex items-center gap-4">
                <button className="relative p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full border-2 border-white"></span>
                </button>
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-brand-500 to-orange-400 border-2 border-white shadow-sm flex items-center justify-center text-white text-sm font-bold">
                    RT
                </div>
            </div>
        </header>
    );
}
