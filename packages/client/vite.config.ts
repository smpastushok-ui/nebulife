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
});
