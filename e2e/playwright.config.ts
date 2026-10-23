import { defineConfig, devices } from '@playwright/test';

// root .env supplies WEB_PORT, CW_PORT, CW_AGENT_*, CHATWOOT_ACCOUNT_ID (shell env wins)
try { process.loadEnvFile(new URL('../.env', import.meta.url).pathname); } catch { /* no .env: defaults */ }
const port = process.env.WEB_PORT ?? '5173';
export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [['list']],
  use: { baseURL: process.env.BASE_URL ?? `http://localhost:${port}`, trace: 'retain-on-failure', ...devices['Desktop Chrome'] },
});
