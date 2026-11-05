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
  plugins: {
    // Edge-to-edge (targetSdk 36): Capacitor injects --safe-area-inset-* CSS variables,
    // because env(safe-area-inset-*) is 0 in Android WebView < 140. See src/styles/index.css.
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      style: 'DEFAULT',
    },
    // Reminders (docs/NOTIFICATIONS.md): monochrome status-bar icon, brand colour
    LocalNotifications: {
      smallIcon: 'ic_stat_przystan',
      iconColor: '#4f6f5c',
    },
  },
};

export default config;
