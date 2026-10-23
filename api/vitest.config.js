import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { ...(process.env.EVAL && { include: ['test/eval/**/*.eval.js'] }), setupFiles: ['test/setup.js'], passWithNoTests: true, testTimeout: 30000, hookTimeout: 120000, fileParallelism: false },
});
