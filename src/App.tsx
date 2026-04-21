import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
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

// Pages
import Dashboard from './pages/Dashboard';
import Warga from './pages/Warga';
import Kas from './pages/Kas';
import Kategori from './pages/Kategori';
import BuatIuranWizard from './pages/Kategori/BuatIuranWizard';
import Laporan from './pages/Laporan';
import Login from './pages/Auth/Login';
import Pengelola from './pages/Pengelola';
import Pembayaran from './pages/Pembayaran';
import LokasiKas from './pages/LokasiKas';
import Transfer from './pages/Transfer';

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Layout Wrapper for Authenticated Pages
const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen bg-gray-50/50 font-sans text-gray-900 flex print:block print:bg-white print:min-h-0">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 flex flex-col lg:pl-72 min-h-screen transition-all duration-300 ease-in-out print:pl-0 print:block print:min-h-0">
        <Header setMobileOpen={setMobileOpen} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-visible print:p-0 print:m-0 print:overflow-visible">
          <div className="max-w-7xl mx-auto print:max-w-none print:w-full print:m-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/warga" element={<Warga />} />
      <Route path="/pembayaran" element={<Pembayaran />} />
      <Route path="/kas" element={<Kas />} />
      <Route path="/kategori" element={<Kategori />} />
      <Route path="/kategori/baru" element={<BuatIuranWizard />} />
      <Route path="/laporan" element={<Laporan />} />
      <Route path="/pengelola" element={<Pengelola />} />
      <Route path="/lokasi-kas" element={<LokasiKas />} />
      <Route path="/transfer" element={<Transfer />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}

export default App;
