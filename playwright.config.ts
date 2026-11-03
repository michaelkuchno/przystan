import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173/',
    locale: 'pl-PL',
    timezoneId: 'Europe/Warsaw',
    trace: 'retain-on-failure',
    serviceWorkers: 'allow',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grepInvert: /@desktop|@android/ },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 860 } }, grep: /@desktop/ },
    // Android phones (Samsung Galaxy class), edge-to-edge with injected system-bar insets
    {
      name: 'android-360',
      use: { ...devices['Pixel 7'], viewport: { width: 360, height: 780 } },
      grep: /@android/,
      metadata: { fontScale: 1, insetTop: 32, insetBottom: 48 },
    },
    {
      name: 'android-412',
      use: { ...devices['Pixel 7'], viewport: { width: 412, height: 915 } },
      grep: /@android/,
      metadata: { fontScale: 1, insetTop: 32, insetBottom: 24 },
    },
    {
      // largest system font (One UI max ≈ 2.0 at body size) on the narrowest common phone
      name: 'android-large-font',
      use: { ...devices['Pixel 7'], viewport: { width: 360, height: 780 } },
      grep: /@android/,
      metadata: { fontScale: 2, insetTop: 32, insetBottom: 48 },
    },
  ],
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
