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
  type AuthError,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { auth } from './firebase-config.js';

// ---------------------------------------------------------------------------
// Auth Service — wraps all Firebase Auth operations
// Gracefully handles auth being null (Firebase not configured)
// ---------------------------------------------------------------------------

const GOOGLE_WEB_CLIENT_ID = '702900049376-e7k1574lfpjri29a9j3kde7pmio68h0a.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = '702900049376-hgk67iamhrretsuauhnjb0g356k626ja.apps.googleusercontent.com';

// Native iOS Sign in with Apple issues identity tokens for the app bundle id.
// Web Apple OAuth uses the Services ID + redirect URI.
const APPLE_NATIVE_BUNDLE_ID = 'app.nebulife.game';
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

function isIosNativeShell(): boolean {
  if (Capacitor.getPlatform() === 'ios') return true;
  if (!Capacitor.isNativePlatform()) return false;
  return /iPad|iPhone|iPod/i.test(navigator.userAgent);
}

/**
 * True if Google Sign-in is usable on this platform.
 * - Web: always available (Firebase popup).
 * - iOS native: disabled while the app uses Capacitor SPM. The current
 *   GoogleAuth plugin only ships CocoaPods native files, so it is not linked
 *   into the iOS binary and would fail with "plugin is not implemented".
 * - Android native: requires `@codetrix-studio/capacitor-google-auth` to be
 *   registered in MainActivity and configured in Firebase.
 */
export function isGoogleSignInAvailable(): boolean {
  if (!Capacitor.isNativePlatform()) return true;
  if (isIosNativeShell()) return false;
  return Capacitor.isPluginAvailable('GoogleAuth');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GoogleAuthAny = any;

function shouldUseNativeGoogleAuth(): boolean {
  if (!Capacitor.isNativePlatform()) return false;
  return !isIosNativeShell() && Capacitor.isPluginAvailable('GoogleAuth');
}

function getNativeGoogleIdToken(googleUser: unknown): string {
  const authData = (googleUser as { authentication?: { idToken?: unknown; accessToken?: unknown } } | null)?.authentication;
  const idToken = authData?.idToken;
  console.warn('[auth] Native Google response:', {
    hasAuthentication: !!authData,
    idTokenType: typeof idToken,
    idTokenParts: typeof idToken === 'string' ? idToken.split('.').length : 0,
    hasAccessToken: typeof authData?.accessToken === 'string' && authData.accessToken.length > 0,
  });
  if (typeof idToken !== 'string' || idToken.split('.').length !== 3) {
    throw new Error('Google Sign-In returned an invalid identity token. Check iOS Google client ID and URL scheme.');
  }
  return idToken;
}

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
    await GoogleAuth.initialize({
      clientId: Capacitor.getPlatform() === 'ios' ? GOOGLE_IOS_CLIENT_ID : GOOGLE_WEB_CLIENT_ID,
      serverClientId: GOOGLE_WEB_CLIENT_ID,
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
  console.warn('[auth] Google sign-in route:', {
    platform: Capacitor.getPlatform(),
    native: Capacitor.isNativePlatform(),
    pluginAvailable: Capacitor.isPluginAvailable('GoogleAuth'),
    useNative: shouldUseNativeGoogleAuth(),
  });
  if (shouldUseNativeGoogleAuth()) {
    const { GoogleAuth } = await getNativeGoogleAuth();
    try {
      await Promise.race([
        GoogleAuth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    } catch { /* no session yet — fine */ }
    const googleUser = await GoogleAuth.signIn();
    const idToken = getNativeGoogleIdToken(googleUser);
    const credential = GoogleAuthProvider.credential(idToken);
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
  if (shouldUseNativeGoogleAuth()) {
    const { GoogleAuth } = await getNativeGoogleAuth();
    const googleUser = await GoogleAuth.signIn();
    const idToken = getNativeGoogleIdToken(googleUser);
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await linkWithCredential(user, credential);
    return result.user;
  }
  const result = await linkWithPopup(user, googleProvider);
  return result.user;
}

// Firebase error codes that mean "this credential/email already belongs to a
// different account". When the player authorizes with a provider that already
// has an account, we must SIGN IN to that existing account instead of failing.
const ACCOUNT_EXISTS_CODES = [
  'auth/credential-already-in-use',
  'auth/email-already-in-use',
  'auth/account-exists-with-different-credential',
  'auth/provider-already-linked',
];

function firebaseErrorCode(err: unknown): string {
  return typeof err === 'object' && err !== null && 'code' in err
    ? String((err as { code?: unknown }).code)
    : '';
}

/**
 * Universal Google authorization.
 *
 * Behaviour:
 *  - If the current session is a guest (anonymous), first try to LINK Google to
 *    it so a BRAND-NEW account keeps the guest's progress.
 *  - If that Google account ALREADY exists, the link fails with
 *    `credential-already-in-use` — we then SIGN IN to the existing account,
 *    switching the Firebase session. The app's UID-change guard clears the
 *    guest's local progress and reloads into the existing player's history.
 *  - If there is no guest session, just sign in normally.
 */
export async function authorizeWithGoogle(): Promise<User | null> {
  const a = requireAuth();
  const current = a.currentUser;
  // No guest to preserve → plain sign-in (loads existing account if any).
  if (!current || !current.isAnonymous) {
    return signInWithGoogle();
  }
  if (shouldUseNativeGoogleAuth()) {
    const { GoogleAuth } = await getNativeGoogleAuth();
    try {
      await Promise.race([GoogleAuth.signOut(), new Promise((resolve) => setTimeout(resolve, 1500))]);
    } catch { /* no session yet — fine */ }
    const googleUser = await GoogleAuth.signIn();
    const idToken = getNativeGoogleIdToken(googleUser);
    const credential = GoogleAuthProvider.credential(idToken);
    try {
      const result = await linkWithCredential(current, credential);
      return result.user;
    } catch (err) {
      if (ACCOUNT_EXISTS_CODES.includes(firebaseErrorCode(err))) {
        const result = await signInWithCredential(a, credential);
        return result.user;
      }
      throw err;
    }
  }
  // Web popup path.
  try {
    const result = await linkWithPopup(current, googleProvider);
    return result.user;
  } catch (err) {
    if (ACCOUNT_EXISTS_CODES.includes(firebaseErrorCode(err))) {
      const credential = GoogleAuthProvider.credentialFromError(err as AuthError);
      if (credential) {
        const result = await signInWithCredential(a, credential);
        return result.user;
      }
    }
    throw err;
  }
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
      clientId: APPLE_NATIVE_BUNDLE_ID,
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
    clientId: APPLE_NATIVE_BUNDLE_ID,
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

/**
 * Universal Apple authorization — mirrors {@link authorizeWithGoogle}.
 * Links Apple to the current guest to preserve a new account's progress; if the
 * Apple account already exists, signs in to it (switching session).
 */
export async function authorizeWithApple(): Promise<User | null> {
  const a = requireAuth();
  const current = a.currentUser;
  if (!current || !current.isAnonymous) {
    return signInWithApple();
  }
  if (!Capacitor.isNativePlatform()) {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    try {
      const result = await linkWithPopup(current, provider);
      return result.user;
    } catch (err) {
      if (ACCOUNT_EXISTS_CODES.includes(firebaseErrorCode(err))) {
        const credential = OAuthProvider.credentialFromError(err as AuthError);
        if (credential) {
          const result = await signInWithCredential(a, credential);
          return result.user;
        }
      }
      throw err;
    }
  }
  const { SignInWithApple } = await getNativeAppleAuth();
  const rawNonce = generateNonce();
  const hashedNonce = await sha256Hex(rawNonce);
  const res = await SignInWithApple.authorize({
    clientId: APPLE_NATIVE_BUNDLE_ID,
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
  try {
    const result = await linkWithCredential(current, credential);
    return result.user;
  } catch (err) {
    if (ACCOUNT_EXISTS_CODES.includes(firebaseErrorCode(err))) {
      const result = await signInWithCredential(a, credential);
      return result.user;
    }
    throw err;
  }
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
