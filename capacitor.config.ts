import type { CapacitorConfig } from '@capacitor/cli';

// CAP_TEST_SERVER=1 hanya untuk uji di emulator terhadap server lokal (http://localhost via `adb reverse`).
// Build normal (produksi) selalu HTTPS ke server produksi dan tidak mengizinkan HTTP polos.
const testServer = process.env.CAP_TEST_SERVER === '1';

const config: CapacitorConfig = {
  appId: 'id.arcomteknologi.jepunkas',
  appName: 'JepunKas',
  webDir: 'dist',
  server: testServer ? { cleartext: true } : undefined,
  android: {
    allowMixedContent: testServer,
  },
};

export default config;
