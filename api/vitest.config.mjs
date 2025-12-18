import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['__tests__/**/*.test.{js,mjs}'],
    setupFiles: ['__tests__/setup.pactum.mjs'],
    testTimeout: 20000,
    watchExclude: ['**/node_modules/**', '**/dist/**'],
    fileParallelism: false  // Run test files sequentially to avoid port conflicts
  },
  esbuild: {
    target: 'node22'
  }
});
