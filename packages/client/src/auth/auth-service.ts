import {
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
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

// Apple Sign-In Service ID (created in Apple Developer → Identifiers → Services IDs)
// and registered as OAuth redirect in App Store Connect. Do NOT confuse with App ID.
const APPLE_SERVICE_ID = 'app.nebulife.service';
const APPLE_REDIRECT_URI = 'https://www.nebulife.space/auth/apple/callback';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GoogleAuthAny = any;

// CRITICAL: must wrap in an object. Returning the Capacitor plugin proxy
// directly from an async function makes the runtime await `.then()` on it
// (thenable check), which hits the Capacitor bridge as a native method
// call and throws: `"GoogleAuth.then()" is not implemented on android`.
// The object wrapper hides the proxy from the thenable resolver.
async function getNativeGoogleAuth(): Promise<{ GoogleAuth: GoogleAuthAny }> {
  if (!isGoogleSignInAvailable()) {
    throw new Error('Google Sign-in is not available on this device yet');
  }
  // @ts-ignore — module only available in native Capacitor builds, not on Vercel
  const mod = await import('@codetrix-studio/capacitor-google-auth');
  const GoogleAuth: GoogleAuthAny = mod.GoogleAuth;
  if (!_googleAuthInitialized) {
    GoogleAuth.initialize({
      clientId: GOOGLE_WEB_CLIENT_ID,
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });
    _googleAuthInitialized = true;
  }
  return { GoogleAuth };
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

/** Sign in with Google popup (web) or native Capacitor plugin.
 *  Best-effort: clears the cached native Google account first so the OS
 *  account picker actually appears (wrapped in a 1.5s timeout — some
 *  device/OS combos never resolve GoogleAuth.signOut() and the whole
 *  login would hang forever on a spinner). */
export async function signInWithGoogle(): Promise<User | null> {
  const a = requireAuth();
  if (Capacitor.isNativePlatform()) {
    const { GoogleAuth } = await getNativeGoogleAuth();
    try {
      await Promise.race([
        GoogleAuth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    } catch { /* no session yet — fine */ }
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
    const { GoogleAuth } = await getNativeGoogleAuth();
    const googleUser = await GoogleAuth.signIn();
    const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
    const result = await linkWithCredential(user, credential);
    return result.user;
  }
  const result = await linkWithPopup(user, googleProvider);
  return result.user;
}

// ---------------------------------------------------------------------------
// Apple Sign-In — required by Apple Guideline 4.8 (any app offering 3rd-party
// social login must also offer Sign in with Apple). iOS native uses the
// capacitor-community plugin; web falls back to Firebase OAuth popup.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppleAuthAny = any;

// CRITICAL: wrap plugin proxy in an object (see getNativeGoogleAuth above for
// rationale — returning a proxy from an async function breaks at `.then()`).
async function getNativeAppleAuth(): Promise<{ SignInWithApple: AppleAuthAny }> {
  // @ts-ignore — module only available in native Capacitor builds, not on Vercel
  const mod = await import('@capacitor-community/apple-sign-in');
  const SignInWithApple: AppleAuthAny = mod.SignInWithApple;
  return { SignInWithApple };
}

/** True if Sign in with Apple should be offered on this platform.
 *  - iOS native: always (Apple requires it alongside any 3rd-party login).
 *  - Web: always (Firebase OAuthProvider('apple.com') popup).
 *  - Android native: hidden (Apple button on Google Play is a UX wart and
 *    Guideline 4.8 only applies to Apple platforms). */
export function isAppleSignInAvailable(): boolean {
  if (!Capacitor.isNativePlatform()) return true;
  return Capacitor.getPlatform() === 'ios';
}

/** Sign in with Apple — iOS native via capacitor-community plugin,
 *  web via Firebase popup. Returns the Firebase User once Apple credentials
 *  have been exchanged for a Firebase credential. */
export async function signInWithApple(): Promise<User | null> {
  const a = requireAuth();
  if (!Capacitor.isNativePlatform()) {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    const result = await signInWithPopup(a, provider);
    return result.user;
  }
  const { SignInWithApple } = await getNativeAppleAuth();
  const rawNonce = crypto.randomUUID();
  const state = crypto.randomUUID();
  const res = await SignInWithApple.authorize({
    clientId: APPLE_SERVICE_ID,
    redirectURI: APPLE_REDIRECT_URI,
    scopes: 'email name',
    state,
    nonce: rawNonce,
  });
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: res.response.identityToken,
    rawNonce,
  });
  const result = await signInWithCredential(a, credential);
  return result.user;
}

/** Link an anonymous account to Apple (preserves UID). Mirrors
 *  linkGoogleToAnonymous so guests can upgrade without losing progress. */
export async function linkAppleToAnonymous(): Promise<User | null> {
  const a = requireAuth();
  const user = a.currentUser;
  if (!user) throw new Error('No current user');
  if (!Capacitor.isNativePlatform()) {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    const result = await linkWithPopup(user, provider);
    return result.user;
  }
  const { SignInWithApple } = await getNativeAppleAuth();
  const rawNonce = crypto.randomUUID();
  const res = await SignInWithApple.authorize({
    clientId: APPLE_SERVICE_ID,
    redirectURI: APPLE_REDIRECT_URI,
    scopes: 'email name',
    state: crypto.randomUUID(),
    nonce: rawNonce,
  });
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: res.response.identityToken,
    rawNonce,
  });
  const result = await linkWithCredential(user, credential);
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

/** Sign out the current user. On native, ALSO clears the Google plugin's
 *  cached credential, otherwise signing in with Google right after sign-out
 *  silently returns the same account (no account-chooser dialog).
 *
 *  CRITICAL: `GoogleAuth.signOut()` can hang forever on some Android builds
 *  (the native bridge never posts the resolve). Without the 1.5s `Promise.race`
 *  timeout this whole function would never settle — and the logout button
 *  appeared to "do nothing" because `window.location.reload()` in the caller
 *  was queued after an await that never completed. */
export async function signOut(): Promise<void> {
  if (!auth) return;
  try {
    await auth.signOut();
  } catch (err) {
    // Don't block reload on Firebase hiccups — logging and continuing is safer.
    // eslint-disable-next-line no-console
    console.warn('[auth] Firebase signOut error:', err);
  }
  if (Capacitor.isNativePlatform() && isGoogleSignInAvailable()) {
    try {
      const { GoogleAuth } = await getNativeGoogleAuth();
      await Promise.race([
        GoogleAuth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    } catch { /* non-critical — may not be signed into Google */ }
  }
}
