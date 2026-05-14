// ---------------------------------------------------------------------------
// FCM Push Subscription — client-side
// ---------------------------------------------------------------------------
// Requests notification permission, gets FCM token via Firebase Messaging,
// and sends it to the server.
// ---------------------------------------------------------------------------

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';

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

      return token ? { token } : { token: null, issue: 'native_registration_failed' };
    } catch (err) {
      console.warn('[push] native registration failed:', err);
      return { token: null, issue: 'native_registration_failed' };
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
 * Listen for foreground push messages (app open).
 * Fires a custom DOM event so App.tsx can handle it.
 */
export function startForegroundListener(): (() => void) | null {
  if (Capacitor.isNativePlatform()) {
    let removeReceived: (() => void) | null = null;
    let removeAction: (() => void) | null = null;
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
