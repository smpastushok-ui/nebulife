import {
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  linkWithPopup,
  linkWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { auth } from './firebase-config.js';

// ---------------------------------------------------------------------------
// Auth Service — wraps all Firebase Auth operations
// Gracefully handles auth being null (Firebase not configured)
// ---------------------------------------------------------------------------

const GOOGLE_WEB_CLIENT_ID = '702900049376-e7k1574lfpjri29a9j3kde7pmio68h0a.apps.googleusercontent.com';

const googleProvider = new GoogleAuthProvider();

// Lazy-initialized native Google Auth (dynamic import to avoid Vercel build failure)
let _googleAuthInitialized = false;

/**
 * True if Google Sign-in is usable on this platform.
 * - Web: always available (Firebase popup).
 * - Native: requires `@codetrix-studio/capacitor-google-auth` to be registered
 *   in MainActivity AND a matching SHA-1 fingerprint in google-services.json
 *   (Firebase Console) for the keystore that signed this APK.
 */
export function isGoogleSignInAvailable(): boolean {
  if (!Capacitor.isNativePlatform()) return true;
  return Capacitor.isPluginAvailable('GoogleAuth');
}

/**
 * Load the native GoogleAuth plugin. Returns a plain wrapper object (NOT the
 * raw plugin proxy) because Capacitor plugin proxies are "thenable" (they
 * respond to any method including `.then`). If you return the proxy from an
 * async function, the runtime tries to .then() it to resolve, which triggers
 * `"GoogleAuth.then() is not implemented on android"`.
 */
async function getNativeGoogleAuth(): Promise<{
  signIn: () => Promise<{ authentication: { idToken: string } }>;
}> {
  if (!isGoogleSignInAvailable()) {
    throw new Error('Google Sign-in is not available on this device yet');
  }
  // @ts-ignore — module only available in native Capacitor builds, not on Vercel
  const mod = await import('@codetrix-studio/capacitor-google-auth');
  const plugin = mod.GoogleAuth;
  if (!_googleAuthInitialized) {
    plugin.initialize({
      clientId: GOOGLE_WEB_CLIENT_ID,
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });
    _googleAuthInitialized = true;
  }
  // Wrap methods instead of returning the thenable plugin proxy directly.
  return { signIn: () => plugin.signIn() };
}

function requireAuth() {
  if (!auth) throw new Error('Firebase not configured');
  return auth;
}

/** Listen to auth state changes (login/logout). Returns unsubscribe function. */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  if (!auth) {
    // Firebase not configured — immediately report no user
    setTimeout(() => callback(null), 0);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

/** Sign in as a guest (Firebase Anonymous Auth). */
export async function signInAsGuest(): Promise<User> {
  const cred = await signInAnonymously(requireAuth());
  return cred.user;
}

/** Sign in with Google popup (web) or native Capacitor plugin. */
export async function signInWithGoogle(): Promise<User | null> {
  const a = requireAuth();
  if (Capacitor.isNativePlatform()) {
    const GoogleAuth = await getNativeGoogleAuth();
    const googleUser = await GoogleAuth.signIn();
    const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
    const result = await signInWithCredential(a, credential);
    return result.user;
  }
  const result = await signInWithPopup(a, googleProvider);
  return result.user;
}

/** Sign in with email and password. */
export async function signInWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(requireAuth(), email, password);
  return cred.user;
}

/** Register a new account with email and password. */
export async function registerWithEmail(email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(requireAuth(), email, password);
  return cred.user;
}

/** Link an anonymous account to Google (preserves UID). */
export async function linkGoogleToAnonymous(): Promise<User | null> {
  const a = requireAuth();
  const user = a.currentUser;
  if (!user) throw new Error('No current user');
  if (Capacitor.isNativePlatform()) {
    const GoogleAuth = await getNativeGoogleAuth();
    const googleUser = await GoogleAuth.signIn();
    const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
    const result = await linkWithCredential(user, credential);
    return result.user;
  }
  const result = await linkWithPopup(user, googleProvider);
  return result.user;
}

/** Link an anonymous account to email/password (preserves UID). */
export async function linkEmailToAnonymous(email: string, password: string): Promise<User> {
  const a = requireAuth();
  const user = a.currentUser;
  if (!user) throw new Error('No current user');
  const credential = EmailAuthProvider.credential(email, password);
  const result = await linkWithCredential(user, credential);
  return result.user;
}

/** Get the current user's ID token for API calls. Auto-refreshes if expired. */
export async function getIdToken(): Promise<string | null> {
  if (!auth) return null;
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

/** Get the currently signed-in user, or null. */
export function getCurrentUser(): User | null {
  if (!auth) return null;
  return auth.currentUser;
}

/** Sign out the current user. */
export async function signOut(): Promise<void> {
  if (!auth) return;
  await auth.signOut();
}
