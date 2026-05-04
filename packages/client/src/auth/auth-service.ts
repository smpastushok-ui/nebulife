import {
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signInWithCustomToken,
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
const PROD_API_BASE = 'https://www.nebulife.space';
const APPLE_AUTHORIZE_TIMEOUT_MS = 30_000;
const APPLE_EXCHANGE_TIMEOUT_MS = 20_000;
const FIREBASE_CUSTOM_LOGIN_TIMEOUT_MS = 20_000;

const googleProvider = new GoogleAuthProvider();

const NONCE_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';

function generateNonce(length = 32): string {
  const random = new Uint8Array(length);
  crypto.getRandomValues(random);
  return Array.from(random, (byte) => NONCE_CHARSET[byte % NONCE_CHARSET.length]).join('');
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function logAppleTokenAudience(idToken: string): void {
  try {
    const payload = idToken.split('.')[1];
    if (!payload) return;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(normalized)) as { aud?: string; iss?: string };
    console.info('[auth][apple] identity token audience:', decoded.aud, 'issuer:', decoded.iss);
  } catch {
    // Debug-only helper; never block login on token introspection.
  }
}

function resolvePublicApiUrl(path: string): string {
  if (!Capacitor.isNativePlatform()) return path;
  return `${PROD_API_BASE}${path}`;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function exchangeNativeAppleToken(identityToken: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APPLE_EXCHANGE_TIMEOUT_MS);
  const res = await fetch(resolvePublicApiUrl('/api/auth/apple/native'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identityToken }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    let message = raw || 'Apple token exchange failed';
    try {
      const parsed = JSON.parse(raw) as { error?: unknown };
      if (typeof parsed.error === 'string') message = parsed.error;
    } catch { /* non-JSON Vercel/proxy error */ }
    throw new Error(`Apple token exchange failed (${res.status}): ${message}`);
  }
  const data = await res.json() as { customToken?: string };
  if (!data.customToken) throw new Error('Apple token exchange did not return a Firebase token');
  return data.customToken;
}

// Lazy-initialized native Google Auth (dynamic import to avoid Vercel build failure)
let _googleAuthInitialized = false;

/**
 * True if Google Sign-in is usable on this platform.
 * - Web: always available (Firebase popup).
 * - iOS native: show it even if the plugin is missing. iPad apps running on
 *   macOS can report native iOS while the GoogleAuth bridge is unavailable;
 *   in that case signInWithGoogle falls back to Firebase popup.
 * - Android native: requires `@codetrix-studio/capacitor-google-auth` to be
 *   registered in MainActivity and configured in Firebase.
 */
export function isGoogleSignInAvailable(): boolean {
  if (!Capacitor.isNativePlatform()) return true;
  if (Capacitor.getPlatform() === 'ios') return true;
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
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('GoogleAuth')) {
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
  // Web and iPad-on-macOS fallback path. Keeps the Google button visible when
  // Capacitor runs as an iOS app but the native GoogleAuth plugin is absent.
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
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('GoogleAuth')) {
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

interface NativeAppleAuthorizeResponse {
  response: {
    identityToken: string;
  };
}

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
  const rawNonce = generateNonce();
  const hashedNonce = await sha256Hex(rawNonce);
  const state = crypto.randomUUID();
  console.info('[auth][apple] native authorize start');
  const res = await withTimeout<NativeAppleAuthorizeResponse>(
    SignInWithApple.authorize({
      clientId: APPLE_SERVICE_ID,
      redirectURI: APPLE_REDIRECT_URI,
      scopes: 'email name',
      state,
      nonce: hashedNonce,
    }),
    APPLE_AUTHORIZE_TIMEOUT_MS,
    'Apple authorization',
  );
  logAppleTokenAudience(res.response.identityToken);
  console.info('[auth][apple] exchanging Apple token for Firebase custom token');
  const customToken = await exchangeNativeAppleToken(res.response.identityToken);
  console.info('[auth][apple] Firebase custom token received');
  const result = await withTimeout(
    signInWithCustomToken(a, customToken),
    FIREBASE_CUSTOM_LOGIN_TIMEOUT_MS,
    'Firebase Apple login',
  );
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
  const rawNonce = generateNonce();
  const hashedNonce = await sha256Hex(rawNonce);
  const res = await SignInWithApple.authorize({
    clientId: APPLE_SERVICE_ID,
    redirectURI: APPLE_REDIRECT_URI,
    scopes: 'email name',
    state: crypto.randomUUID(),
    nonce: hashedNonce,
  });
  logAppleTokenAudience(res.response.identityToken);
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
