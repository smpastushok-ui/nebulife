import { getApp } from 'firebase/app';
import { getAnalytics, isSupported, logEvent, type Analytics } from 'firebase/analytics';
import { isFirebaseConfigured } from '../auth/firebase-config.js';

type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

let analyticsPromise: Promise<Analytics | null> | null = null;
const onceKeys = new Set<string>();

async function getWebAnalytics(): Promise<Analytics | null> {
  if (!isFirebaseConfigured) return null;
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
