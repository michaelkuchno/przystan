import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pl.przystan.app',
  appName: 'Przystań',
  webDir: 'dist',
  android: {
    // no remote content, no cleartext traffic
    allowMixedContent: false,
    backgroundColor: '#f6f1ea',
  },
};

export default config;
