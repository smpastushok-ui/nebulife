import { getApp } from 'firebase/app';
import { getAnalytics, isSupported, logEvent, type Analytics } from 'firebase/analytics';
import { isFirebaseConfigured } from '../auth/firebase-config.js';

type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

let analyticsPromise: Promise<Analytics | null> | null = null;

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

export function trackPaidFeatureOrder(feature: string, costQuarks: number, params: AnalyticsParams = {}): void {
  void trackEvent('paid_feature_order', {
    feature,
    cost_quarks: costQuarks,
    ...params,
  });
}
