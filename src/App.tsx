import { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import React from 'react';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 m-8 bg-red-50 text-red-900 border border-red-200 rounded-xl">
          <h1 className="text-2xl font-bold mb-4">Aplikasi Mengalami Crash</h1>
          <p className="mb-4">Terdapat kesalahan teknis (Error) di dalam kode halaman ini:</p>
          <pre className="p-4 bg-white rounded overflow-x-auto text-sm">{this.state.error?.toString()}</pre>
          <pre className="p-4 bg-white rounded overflow-x-auto text-xs mt-2 text-red-500">{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// Pages — dimuat saat dibuka (code splitting) agar aplikasi cepat terbuka, terutama di HP
import Login from './pages/Auth/Login';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Warga = lazy(() => import('./pages/Warga'));
const Kas = lazy(() => import('./pages/Kas'));
const Pengeluaran = lazy(() => import('./pages/Pengeluaran'));
const Kategori = lazy(() => import('./pages/Kategori'));
const BuatIuranWizard = lazy(() => import('./pages/Kategori/BuatIuranWizard'));
const Laporan = lazy(() => import('./pages/Laporan'));
const Pengelola = lazy(() => import('./pages/Pengelola'));
const Pembayaran = lazy(() => import('./pages/Pembayaran'));
const LokasiKas = lazy(() => import('./pages/LokasiKas'));
const Transfer = lazy(() => import('./pages/Transfer'));

const PageLoading = () => (
  <div className="flex items-center justify-center py-24" role="status" aria-live="polite">
    <div className="w-8 h-8 rounded-full border-4 border-brand-100 border-t-brand-500 animate-spin" />
    <span className="sr-only">Memuat halaman...</span>
  </div>
);
import { ConfirmProvider } from './contexts/ConfirmContext';

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Layout Wrapper for Authenticated Pages
const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans text-gray-900 flex print:block print:bg-white print:min-h-0 overflow-hidden">
      <Sidebar 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen} 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed} 
      />
      {/* min-w-0: tanpa ini tabel lebar (mis. laporan) melebarkan seluruh halaman di HP */}
      <div className={`flex-1 min-w-0 flex flex-col min-h-screen transition-all duration-300 ease-in-out print:pl-0 print:block print:min-h-0 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        <Header setMobileOpen={setMobileOpen} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto print:p-0 print:m-0 print:overflow-visible h-[calc(100vh-4rem)]">
          {/* pb ekstra di HP agar konten tidak tertutup navigasi bawah */}
          <div className="max-w-7xl mx-auto print:max-w-none print:w-full print:m-0 pb-28 lg:pb-12">
            {children}
          </div>
        </main>
        <BottomNav onOpenMenu={() => setMobileOpen(true)} />
      </div>
    </div>
  );
};

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoading />}>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/warga" element={<Warga />} />
      <Route path="/pembayaran" element={<Pembayaran />} />
      <Route path="/kas" element={<Kas />} />
      <Route path="/pengeluaran" element={<Pengeluaran />} />
      <Route path="/kategori" element={<Kategori />} />
      <Route path="/kategori/baru" element={<BuatIuranWizard />} />
      <Route path="/laporan" element={<Laporan />} />
      <Route path="/pengelola" element={<Pengelola />} />
      <Route path="/lokasi-kas" element={<LokasiKas />} />
      <Route path="/transfer" element={<Transfer />} />
    </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Routes>
              {/* Public Route */}
              <Route path="/login" element={<Login />} />
              
              {/* Protected Routes defined via wildcard */}
              <Route path="/*" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <AppRoutes />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </ConfirmProvider>
    </AuthProvider>
  );
}

export default App;
