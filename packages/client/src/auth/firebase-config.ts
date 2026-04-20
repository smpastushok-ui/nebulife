import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
  type Auth,
} from 'firebase/auth';

// ---------------------------------------------------------------------------
// Firebase Client SDK — initialized from Vite env vars (VITE_ prefix)
// Gracefully handles missing config (app still works, auth features disabled)
//
// Auth persistence chain (Android WebView default is browserSession which DOES
// NOT survive app restarts — players got dropped to AuthScreen every launch).
// We explicitly try indexedDB → localStorage → memory so credentials persist
// across cold starts on Capacitor native too.
// ---------------------------------------------------------------------------

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;

if (apiKey) {
  try {
    app = initializeApp({
      apiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    });
    auth = getAuth(app);

    // Set persistence to survive app restarts. setPersistence accepts an
    // ordered fallback array — Firebase picks the first one available.
    void setPersistence(auth, indexedDBLocalPersistence)
      .catch(() => setPersistence(auth!, browserLocalPersistence))
      .catch(() => setPersistence(auth!, inMemoryPersistence))
      .catch((err) => console.warn('[firebase] all persistence options failed:', err));
  } catch (err) {
    console.warn('Firebase initialization failed:', err);
  }
} else {
  // LOUD warning — missing Firebase config means App.tsx will silently fall
  // into the legacy "Explorer" path (skips AuthScreen entirely). That's a
  // real bug for testers, so make it obvious in the console.
  const banner =
    '\n============================================================\n' +
    '  FIREBASE NOT CONFIGURED — VITE_FIREBASE_API_KEY is missing.\n' +
    '  Copy packages/client/.env.example → .env.local and fill in\n' +
    '  the values from Firebase Console. Without this, login screen\n' +
    '  will NOT appear and everyone signs in as "Explorer".\n' +
    '============================================================\n';
  // eslint-disable-next-line no-console
  console.error(banner);
}

export { auth };
export const isFirebaseConfigured = !!auth;
