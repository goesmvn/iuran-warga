import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.arcomteknologi.jepunkas',
  appName: 'JepunKas',
  webDir: 'dist',
  android: {
    // API produksi memakai HTTPS; jangan izinkan HTTP polos
    allowMixedContent: false,
  },
};

export default config;
