import { getApp } from 'firebase/app';
import { getAnalytics, isSupported, logEvent, type Analytics } from 'firebase/analytics';
import { isFirebaseConfigured } from '../auth/firebase-config.js';

type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

let analyticsPromise: Promise<Analytics | null> | null = null;
const onceKeys = new Set<string>();
let reportedAnalyticsUnavailable = false;

const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined;

function getGtag(): ((command: 'event', name: string, params?: Record<string, string | number | boolean>) => void) | null {
  if (typeof window === 'undefined') return null;
  const gtag = (window as Window & {
    gtag?: (command: 'event', name: string, params?: Record<string, string | number | boolean>) => void;
  }).gtag;
  return typeof gtag === 'function' ? gtag : null;
}

async function getWebAnalytics(): Promise<Analytics | null> {
  if (!isFirebaseConfigured || !measurementId) return null;
  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => supported ? getAnalytics(getApp()) : null)
      .catch(() => null);
  }
  return analyticsPromise;
}

export async function trackEvent(name: string, params: AnalyticsParams = {}): Promise<void> {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null),
  ) as Record<string, string | number | boolean>;

  try {
    const analytics = await getWebAnalytics();
    if (analytics) {
      logEvent(analytics, name, cleaned);
      return;
    }
  } catch {
    // Firebase analytics must never block gameplay.
  }

  const gtag = getGtag();
  if (gtag) {
    gtag('event', name, cleaned);
    return;
  }

  if (!reportedAnalyticsUnavailable) {
    reportedAnalyticsUnavailable = true;
    console.warn('[analytics] unavailable', {
      firebaseConfigured: isFirebaseConfigured,
      hasMeasurementId: Boolean(measurementId),
      hasGtag: Boolean(gtag),
    });
  }

  if (import.meta.env.DEV) {
    console.debug('[analytics]', name, cleaned);
  }
}

export function trackEventOnce(key: string, name: string, params: AnalyticsParams = {}): void {
  if (onceKeys.has(key)) return;
  onceKeys.add(key);
  void trackEvent(name, params);
}

export function trackPaidFeatureOrder(feature: string, costQuarks: number, params: AnalyticsParams = {}): void {
  void trackEvent('paid_feature_order', {
    feature,
    cost_quarks: costQuarks,
    ...params,
  });
}

export function trackLogin(method: string, isNewUser: boolean): void {
  void trackEvent(isNewUser ? 'sign_up' : 'login', {
    method,
    auth_method: method,
  });
}

export function trackTutorialComplete(params: AnalyticsParams = {}): void {
  trackEventOnce('tutorial_complete', 'tutorial_complete', params);
}

export function trackFirstValuableAction(action: string, params: AnalyticsParams = {}): void {
  trackEventOnce(`first_${action}`, `first_${action}`, params);
}
