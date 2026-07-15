import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Pure-logic unit tests only (e.g. input guards) — no PixiJS/canvas or
    // React rendering is exercised here, so no DOM environment is needed.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
