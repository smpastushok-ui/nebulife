import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// =============================================================================
// Required client env vars. If any of these are missing during a PRODUCTION
// build (`vite build`) we fail loudly instead of shipping a half-working bundle.
//
// Why this exists: on several occasions an APK was built from a worktree that
// didn't have `.env.local` — the Firebase init silently fell through to
// `auth = null`, the app took the legacy "Explorer" fallback path in App.tsx,
// and testers were never shown the login screen. This guard makes that class
// of bug impossible to miss.
// =============================================================================
const REQUIRED_PROD_ENV = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

function requireProdEnv(): Plugin {
  return {
    name: 'nebulife-require-prod-env',
    apply: 'build',
    // Uses `enforce: 'pre'` so we fail before Rollup does any heavy work.
    enforce: 'pre',
    configResolved(config) {
      // `loadEnv` merges .env + .env.local + process.env (Vercel injects env
      // into process.env, not .env files), so this check covers all build
      // sources (local APK build, Vercel CI, etc.).
      const env = loadEnv(config.mode, config.envDir || process.cwd(), '');
      const missing = REQUIRED_PROD_ENV.filter((k) => !env[k]);
      if (missing.length > 0) {
        throw new Error(
          `\n\n[build] Missing required env vars: ${missing.join(', ')}\n` +
          `        Create packages/client/.env.local (copy from the main repo\n` +
          `        checkout) before running \`npm run build\` or \`cap sync\`.\n`,
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), requireProdEnv()],
  resolve: {
    alias: {
      '@nebulife/core': path.resolve(__dirname, '../core/src'),
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
