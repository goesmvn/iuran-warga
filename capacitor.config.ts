import type { CapacitorConfig } from '@capacitor/cli';

// CAP_TEST_SERVER=1 hanya untuk uji di emulator terhadap server lokal (http://localhost via `adb reverse`).
// Build normal (produksi) selalu HTTPS ke server produksi dan tidak mengizinkan HTTP polos.
const testServer = process.env.CAP_TEST_SERVER === '1';

const config: CapacitorConfig = {
  appId: 'id.arcomteknologi.jepunkas',
  appName: 'JepunKas',
  webDir: 'dist',
  server: testServer ? { cleartext: true } : undefined,
  plugins: {
    // Android 15+ edge-to-edge: suntik --safe-area-inset-* (dipakai index.css) agar konten tidak tertutup jam/status bar
    SystemBars: { insetsHandling: 'css', initialViewportFitValueHint: 'cover' },
  },
  android: {
    allowMixedContent: testServer,
  },
};

export default config;
