// ---------------------------------------------------------------------------
// FCM Push Subscription — client-side
// ---------------------------------------------------------------------------
// Requests notification permission, gets FCM token via Firebase Messaging,
// and sends it to the server.
// ---------------------------------------------------------------------------

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';

// NOTE: Firebase Web Messaging is not supported in Android/iOS WebView.
// TODO: migrate to @capacitor/push-notifications for native push on mobile.

/** VAPID public key — must match FIREBASE_SERVICE_ACCOUNT_JSON project */
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

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
export async function requestPushPermission(): Promise<string | null> {
  // Firebase Web Messaging does not work inside Capacitor WebView
  if (Capacitor.isNativePlatform()) return null;

  if (!('Notification' in window) || !('serviceWorker' in navigator)) return null;
  if (!(await isSupported().catch(() => false))) return null;

  const app = getFirebaseApp();
  if (!app || !VAPID_KEY) {
    console.warn('[push] Firebase not configured or VAPID key missing');
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  try {
    const messaging = getMessaging(app);
    const registration = await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    return token ?? null;
  } catch (err) {
    console.warn('[push] getToken failed:', err);
    return null;
  }
}

/**
 * Listen for foreground push messages (app open).
 * Fires a custom DOM event so App.tsx can handle it.
 */
export function startForegroundListener(): (() => void) | null {
  // Skip on native — FCM web SDK is not supported in WebView
  if (Capacitor.isNativePlatform()) return null;

  const app = getFirebaseApp();
  if (!app) return null;

  // Fire-and-forget: isSupported is async, attach listener only when supported
  isSupported().catch(() => false).then((supported) => {
    if (!supported) return;
    try {
      const messaging = getMessaging(app);
      onMessage(messaging, (payload) => {
        const weekDate = payload.data?.weekDate ?? '';
        window.dispatchEvent(new CustomEvent('nebulife:push-digest', { detail: { weekDate } }));
      });
    } catch {
      /* ignore */
    }
  });
  return null;
}

/**
 * Check current push permission status without requesting.
 */
export function getPushPermissionStatus(): NotificationPermission | 'unsupported' {
  if (Capacitor.isNativePlatform()) return 'unsupported';
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}
