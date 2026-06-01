// ---------------------------------------------------------------------------
// FCM Push Subscription — client-side
// ---------------------------------------------------------------------------
// Requests notification permission, gets FCM token via Firebase Messaging,
// and sends it to the server.
// ---------------------------------------------------------------------------

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging, Importance, Visibility } from '@capacitor-firebase/messaging';

/** VAPID public key — must match FIREBASE_SERVICE_ACCOUNT_JSON project */
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

export type PushPermissionIssue =
  | 'native_registration_failed'
  | 'notifications_unsupported'
  | 'service_worker_unsupported'
  | 'firebase_messaging_unsupported'
  | 'firebase_config_missing'
  | 'vapid_key_missing'
  | 'permission_denied'
  | 'token_failed';

export interface PushPermissionResult {
  token: string | null;
  issue?: PushPermissionIssue;
  detail?: string;
}

function pushErrorDetail(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

// ---------------------------------------------------------------------------
// Firebase app (reuse if already initialized by firebase-config.ts)
// ---------------------------------------------------------------------------

function getFirebaseApp() {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
  if (!apiKey) return null;

  if (getApps().length > 0) return getApp();

  try {
    return initializeApp({
      apiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Request push notification permission and get the FCM token.
 * Returns the token string, or null if permission denied or Firebase not configured.
 */
export async function requestPushPermissionDetailed(): Promise<PushPermissionResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      let permission = await FirebaseMessaging.checkPermissions();
      if (permission.receive !== 'granted') {
        permission = await FirebaseMessaging.requestPermissions();
      }
      if (permission.receive !== 'granted') {
        return { token: null, issue: 'permission_denied' };
      }

      const { token } = await FirebaseMessaging.getToken();

      return token ? { token } : { token: null, issue: 'native_registration_failed', detail: 'empty native FCM token' };
    } catch (err) {
      console.warn('[push] native registration failed:', err);
      return { token: null, issue: 'native_registration_failed', detail: pushErrorDetail(err) };
    }
  }

  if (!('Notification' in window)) return { token: null, issue: 'notifications_unsupported' };
  if (!('serviceWorker' in navigator)) return { token: null, issue: 'service_worker_unsupported' };
  if (!(await isSupported().catch(() => false))) return { token: null, issue: 'firebase_messaging_unsupported' };

  const app = getFirebaseApp();
  if (!app) {
    console.warn('[push] Firebase not configured');
    return { token: null, issue: 'firebase_config_missing' };
  }
  if (!VAPID_KEY) {
    console.warn('[push] VAPID key missing');
    return { token: null, issue: 'vapid_key_missing' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { token: null, issue: 'permission_denied' };

  try {
    const messaging = getMessaging(app);
    const registration = await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    return token ? { token } : { token: null, issue: 'token_failed' };
  } catch (err) {
    console.warn('[push] getToken failed:', err);
    return { token: null, issue: 'token_failed' };
  }
}

export async function requestPushPermission(): Promise<string | null> {
  return (await requestPushPermissionDetailed()).token;
}

/**
 * Silently fetch the FCM token IFF permission was ALREADY granted — never
 * prompts the user. Use this on every launch (after auth) so players who once
 * granted permission always have a fresh token saved server-side, even though
 * the explicit opt-in toggle only ran once. This closes the #1 push gap: a
 * token that was never persisted (or rotated) → the server has nothing to send.
 * Returns the token, or null when permission is not granted / unsupported.
 */
export async function ensurePushTokenIfGranted(): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const permission = await FirebaseMessaging.checkPermissions();
      if (permission.receive !== 'granted') return null;
      const { token } = await FirebaseMessaging.getToken();
      return token || null;
    } catch (err) {
      console.warn('[push] silent native token fetch failed:', err);
      return null;
    }
  }

  if (!('Notification' in window) || Notification.permission !== 'granted') return null;
  if (!('serviceWorker' in navigator)) return null;
  if (!(await isSupported().catch(() => false))) return null;

  const app = getFirebaseApp();
  if (!app || !VAPID_KEY) return null;

  try {
    const messaging = getMessaging(app);
    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    return token || null;
  } catch (err) {
    console.warn('[push] silent getToken failed:', err);
    return null;
  }
}

/**
 * Native FCM token rotation listener. The OS/Firebase can mint a new token at
 * any time; without this the server keeps a stale token and silently fails to
 * deliver. Returns an unsubscribe fn (or null on web / when unsupported).
 */
export function startTokenRefreshListener(onToken: (token: string) => void): (() => void) | null {
  if (!Capacitor.isNativePlatform()) return null;
  let remove: (() => void) | null = null;
  FirebaseMessaging.addListener('tokenReceived', ({ token }) => {
    if (token) onToken(token);
  })
    .then((handle) => { remove = () => { void handle.remove(); }; })
    .catch(() => { /* ignore */ });
  return () => { remove?.(); };
}

/**
 * Listen for foreground push messages (app open).
 * Fires a custom DOM event so App.tsx can handle it.
 */
export function startForegroundListener(): (() => void) | null {
  if (Capacitor.isNativePlatform()) {
    let removeReceived: (() => void) | null = null;
    let removeAction: (() => void) | null = null;
    if (Capacitor.getPlatform() === 'android') {
      FirebaseMessaging.createChannel({
        id: 'nebulife_default',
        name: 'Nebulife',
        description: 'Nebulife game notifications',
        importance: Importance.High,
        visibility: Visibility.Public,
        lights: true,
        vibration: true,
      }).catch((err) => console.warn('[push] create channel failed:', err));
    }
    FirebaseMessaging.addListener('notificationReceived', ({ notification }) => {
      const data = normalizeNotificationData(notification.data);
      const weekDate = data.weekDate ?? '';
      const action = data.action ?? 'open-notification';
      window.dispatchEvent(new CustomEvent('nebulife:push-notification', { detail: { action, weekDate, data } }));
      if (action === 'open-digest' || weekDate) {
        window.dispatchEvent(new CustomEvent('nebulife:push-digest', { detail: { weekDate } }));
      }
    }).then((handle) => { removeReceived = () => { void handle.remove(); }; }).catch(() => {});
    FirebaseMessaging.addListener('notificationActionPerformed', ({ notification }) => {
      const data = normalizeNotificationData(notification.data);
      const weekDate = data.weekDate ?? '';
      const notificationAction = data.action ?? 'open-notification';
      window.dispatchEvent(new CustomEvent('nebulife:open-notification', { detail: { action: notificationAction, weekDate, data } }));
      if (notificationAction === 'open-digest' || weekDate) {
        window.dispatchEvent(new CustomEvent('nebulife:open-digest', { detail: { weekDate } }));
      }
    }).then((handle) => { removeAction = () => { void handle.remove(); }; }).catch(() => {});
    return () => {
      removeReceived?.();
      removeAction?.();
    };
  }

  const app = getFirebaseApp();
  if (!app) return null;

  // Fire-and-forget: isSupported is async, attach listener only when supported
  isSupported().catch(() => false).then((supported) => {
    if (!supported) return;
    try {
      const messaging = getMessaging(app);
      onMessage(messaging, (payload) => {
        const weekDate = payload.data?.weekDate ?? '';
        const action = payload.data?.action ?? 'open-notification';
        window.dispatchEvent(new CustomEvent('nebulife:push-notification', { detail: { action, weekDate, data: payload.data } }));
        if (action === 'open-digest' || weekDate) {
          window.dispatchEvent(new CustomEvent('nebulife:push-digest', { detail: { weekDate } }));
        }
      });
    } catch {
      /* ignore */
    }
  });
  return null;
}

function normalizeNotificationData(data: unknown): Record<string, string> {
  if (!data || typeof data !== 'object') return {};
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (typeof value === 'string') normalized[key] = value;
    else if (value != null) normalized[key] = String(value);
  }
  return normalized;
}

/**
 * Check current push permission status without requesting.
 */
export function getPushPermissionStatus(): NotificationPermission | 'unsupported' {
  if (Capacitor.isNativePlatform()) return 'default';
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}
