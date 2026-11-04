import { defineConfig, devices } from '@playwright/test';

/** Manual checks against real AI services – see e2e-real/ai-real.spec.ts. */
export default defineConfig({
  testDir: 'e2e-real',
  workers: 1,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4173/', locale: 'pl-PL', serviceWorkers: 'allow' },
  webServer: { command: 'npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173/', reuseExistingServer: true },
});
