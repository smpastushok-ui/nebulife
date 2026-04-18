import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@nebulife/core': path.resolve(__dirname, '../core/src'),
    },
  },
  build: {
    rollupOptions: {
      // Capacitor-only plugins — not available during Vercel web build
      external: ['@codetrix-studio/capacitor-google-auth'],
    },
  },
  server: {
    port: 3000,
  },
  // NOTE: Previously rollupOptions.external included the Capacitor Google
  // Auth plugin because it "is not available during Vercel web build". That
  // was wrong — it IS a plain JS module that calls registerPlugin() at
  // import time. Keeping it external made the dynamic import fail at
  // RUNTIME on Android WebView with:
  //   "Failed to resolve module specifier '@codetrix-studio/capacitor-google-auth'"
  // Letting it bundle normally works both on the web (plugin proxy throws
  // on method call, which we catch) and on native (real bridge).
});
