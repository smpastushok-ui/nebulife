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
 * NOTE: Native Capacitor plugin `@codetrix-studio/capacitor-google-auth` is not
 * yet fully wired up (needs MainActivity.registerPlugin + server_client_id in
 * strings.xml + SHA-1 in Firebase Console). Until then we disable Google on
 * native and only enable it on web (Firebase popup).
 */
export function isGoogleSignInAvailable(): boolean {
  if (!Capacitor.isNativePlatform()) return true;
  // Temporarily disabled on mobile — re-enable after native plugin is configured
  return false;
}

async function getNativeGoogleAuth() {
  if (!isGoogleSignInAvailable()) {
    throw new Error('Google Sign-in is not available on this device yet');
  }
  // @ts-ignore — module only available in native Capacitor builds, not on Vercel
  const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
  if (!_googleAuthInitialized) {
    GoogleAuth.initialize({
      clientId: GOOGLE_WEB_CLIENT_ID,
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });
    _googleAuthInitialized = true;
  }
  return GoogleAuth;
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
