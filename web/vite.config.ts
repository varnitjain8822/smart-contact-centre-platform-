/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

declare const process: { env: Record<string, string | undefined> };

// Same-origin /api (cookie + SSE). changeOrigin stays false so the browser Origin reaches the API's Origin guard.
const target = process.env.API_URL ?? 'http://localhost:4000';
const proxy = { '/api': { target, xfwd: true } };

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy },
  preview: { port: 5173, host: '0.0.0.0', proxy },
  test: { environment: 'jsdom', setupFiles: ['./test/setup.ts'] },
});
