import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 15000,
    cache: false,
    fsModuleCache: false,
    setupFiles: ['tests/setup.ts'],
    coverage: { provider: 'v8' },
  },
});
