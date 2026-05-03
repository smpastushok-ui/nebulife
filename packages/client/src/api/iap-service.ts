/**
 * IAP Service — In-App Purchases.
 *
 * SETUP CHECKLIST (do these before going to production):
 * 1. Create a RevenueCat project at https://app.revenuecat.com
 * 2. Connect your iOS app (App Store Connect) and Android app (Google Play Console)
 * 3. Create consumable products in App Store Connect + Google Play:
 *    - nebulife_quarks_100   (100  quarks, ~$0.99)
 *    - nebulife_quarks_500   (500  quarks, ~$3.99)
 *    - nebulife_quarks_2000  (2000 quarks, ~$12.99)
 * 4. Create an Offering in RevenueCat named "default" with the above products as Packages.
 * 5. Set VITE_REVENUECAT_IOS_API_KEY and/or VITE_REVENUECAT_ANDROID_API_KEY.
 * 6. Run `npx cap sync` after building to push native changes.
 */

import { Capacitor } from '@capacitor/core';
import { authFetch } from '../auth/api-client.js';

/** True when running as a native iOS or Android app (not web/browser). */
export function isNativeIAP(): boolean {
  return Capacitor.isNativePlatform();
}

/** Static quark amounts for each product ID. Must match App Store / Play Store product IDs exactly. */
export const QUARKS_BY_PRODUCT_ID: Record<string, number> = {
  'nebulife_quarks_100':  100,
  'nebulife_quarks_500':  500,
  'nebulife_quarks_2000': 2000,
};

/** A quark pack as shown in the UI. */
export interface IAPPackage {
  /** Package identifier from RevenueCat (e.g. "$rc_monthly" or custom) */
  identifier: string;
  /** App Store / Play Store product ID */
  productIdentifier: string;
  /** Display title shown in modal (e.g. "100 Q") */
  title: string;
  /** Short description */
  description: string;
  /** Localized price string from the store (e.g. "$0.99") */
  priceString: string;
  /** How many quarks the player receives */
  quarks: number;
}

/** Fallback packages — used while loading or if RevenueCat is not configured.
 *  `description` stores an i18n key (e.g. "topup.pack_starter") that the UI
 *  passes through `t()` — avoids hard-coding Ukrainian copy into the English
 *  locale rendering. */
export const FALLBACK_IAP_PACKAGES: IAPPackage[] = [
  {
    identifier: 'quarks_100',
    productIdentifier: 'nebulife_quarks_100',
    title: '100',
    description: 'topup.pack_starter',
    priceString: '$0.99',
    quarks: 100,
  },
  {
    identifier: 'quarks_500',
    productIdentifier: 'nebulife_quarks_500',
    title: '500',
    description: 'topup.pack_optimal',
    priceString: '$3.99',
    quarks: 500,
  },
  {
    identifier: 'quarks_2000',
    productIdentifier: 'nebulife_quarks_2000',
    title: '2000',
    description: 'topup.pack_best_value',
    priceString: '$12.99',
    quarks: 2000,
  },
];

type RevenueCatPackage = import('@revenuecat/purchases-capacitor').PurchasesPackage;
type CustomerInfo = import('@revenuecat/purchases-capacitor').CustomerInfo;

const PREMIUM_ENTITLEMENT_ID = 'premium';
const DEFAULT_OFFERING_ID = 'default';

let configured = false;
let configuredUserId: string | null = null;
let packageCache = new Map<string, RevenueCatPackage>();

function getRevenueCatApiKey(): string | null {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return import.meta.env.VITE_REVENUECAT_IOS_API_KEY || null;
  if (platform === 'android') return import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY || null;
  return null;
}

function isPurchaseCancelled(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const record = err as { code?: string; userCancelled?: boolean | null };
  return record.userCancelled === true || record.code === '1';
}

function isNetworkError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const record = err as { code?: string };
  return record.code === '10' || record.code === '35';
}

function toIAPPackage(pkg: RevenueCatPackage): IAPPackage | null {
  const productId = pkg.product.identifier;
  const quarks = QUARKS_BY_PRODUCT_ID[productId];
  if (!quarks) return null;
  return {
    identifier: pkg.identifier,
    productIdentifier: productId,
    title: String(quarks),
    description: FALLBACK_IAP_PACKAGES.find((fallback) => fallback.productIdentifier === productId)?.description ?? pkg.product.description,
    priceString: pkg.product.priceString,
    quarks,
  };
}

async function ensureIAPConfigured(userId?: string): Promise<boolean> {
  if (!isNativeIAP()) return false;
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    console.warn('[IAP] RevenueCat API key is missing for this platform');
    return false;
  }

  const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');

  if (!configured) {
    await Purchases.setLogLevel({ level: import.meta.env.DEV ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN });
    await Purchases.configure({
      apiKey,
      appUserID: userId ?? null,
      shouldShowInAppMessagesAutomatically: true,
      automaticDeviceIdentifierCollectionEnabled: false,
    });
    configured = true;
    configuredUserId = userId ?? null;
    return true;
  }

  if (userId && configuredUserId !== userId) {
    await Purchases.logIn({ appUserID: userId });
    configuredUserId = userId;
  }
  return true;
}

/** Initialize RevenueCat SDK with the current user ID. Call this once after login. */
export async function initIAP(userId: string): Promise<void> {
  await ensureIAPConfigured(userId);
}

/** Fetch available quark packs from RevenueCat (or fall back to static list). */
export async function fetchIAPPackages(): Promise<IAPPackage[]> {
  if (!await ensureIAPConfigured()) return FALLBACK_IAP_PACKAGES;

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const offerings = await Purchases.getOfferings();
    const offering = offerings.current ?? offerings.all[DEFAULT_OFFERING_ID] ?? Object.values(offerings.all)[0];
    const nativePackages = offering?.availablePackages ?? [];
    packageCache = new Map(nativePackages.map((pkg) => [pkg.identifier, pkg]));

    const packages = nativePackages
      .map(toIAPPackage)
      .filter((pkg): pkg is IAPPackage => pkg !== null);

    return packages.length > 0 ? packages : FALLBACK_IAP_PACKAGES;
  } catch (err) {
    console.warn('[IAP] Failed to fetch RevenueCat offerings:', err);
    return FALLBACK_IAP_PACKAGES;
  }
}

export interface PremiumStatus {
  active: boolean;
  /** Localized price string for the premium subscription, if available */
  priceString?: string;
}

/**
 * Check whether the player has an active premium subscription.
 * First checks RevenueCat entitlements, falls back to localStorage flag
 * `nebulife_premium` for dev/testing purposes.
 */
export async function checkPremiumStatus(): Promise<PremiumStatus> {
  if (await ensureIAPConfigured()) {
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { customerInfo } = await Purchases.getCustomerInfo();
      const active = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID]?.isActive === true;
      if (active) localStorage.setItem('nebulife_premium', '1');
      return { active };
    } catch (err) {
      console.warn('[IAP] Failed to check premium status:', err);
    }
  }

  const flag = localStorage.getItem('nebulife_premium');
  return { active: flag === '1' };
}

/**
 * Premium subscriptions need a custom paywall.
 * RevenueCat's prebuilt native UI links SwiftUICore when built with recent
 * Xcode versions, which crashes before launch on older supported iPads running
 * iOS 16. Keep this disabled instead of shipping a launch-time native crash.
 *
 * TODO(iOS IAP): restore RevenueCat before release, either by pinning an
 * iOS-16-compatible SDK version or by shipping our own React paywall on top of
 * the base Purchases SDK. Test on iPad 5th gen / iOS 16.7 before re-enabling.
 */
export async function purchasePremium(): Promise<{ success: boolean; error?: string }> {
  if (!isNativeIAP()) {
    return { success: false, error: 'Not on native platform' };
  }
  return { success: false, error: 'Premium subscription product is not configured in this build' };
}

export interface PurchaseResult {
  success: boolean;
  quarksGranted: number;
  error?: 'cancelled' | 'network' | string;
}

/**
 * Purchase a quark pack by its identifier (from RevenueCat offering).
 * On success, calls the backend to verify and credit quarks.
 */
export async function purchaseQuarkPack(
  packageIdentifier: string,
  playerId: string,
): Promise<PurchaseResult> {
  if (!await ensureIAPConfigured(playerId)) {
    return { success: false, quarksGranted: 0, error: 'RevenueCat is not configured' };
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    if (packageCache.size === 0) await fetchIAPPackages();

    const nativePackage = packageCache.get(packageIdentifier);
    if (!nativePackage) {
      return { success: false, quarksGranted: 0, error: 'Package not found' };
    }

    const productId = nativePackage.product.identifier;
    const quarks = QUARKS_BY_PRODUCT_ID[productId];
    if (!quarks) {
      return { success: false, quarksGranted: 0, error: 'Unknown product' };
    }

    const purchase = await Purchases.purchasePackage({ aPackage: nativePackage });
    const transactionId = purchase.transaction?.transactionIdentifier ?? productId;

    const grantRes = await authFetch('/api/iap/grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId,
        quarks,
        productId,
        purchaseToken: transactionId,
      }),
    });

    if (!grantRes.ok) {
      const err = await grantRes.json().catch(() => ({ error: 'Grant failed' }));
      return { success: false, quarksGranted: 0, error: err.error ?? 'Grant failed' };
    }

    const grant = await grantRes.json() as { quarksGranted?: number };
    return { success: true, quarksGranted: grant.quarksGranted ?? quarks };
  } catch (err) {
    if (isPurchaseCancelled(err)) return { success: false, quarksGranted: 0, error: 'cancelled' };
    if (isNetworkError(err)) return { success: false, quarksGranted: 0, error: 'network' };
    console.warn('[IAP] Purchase failed:', err);
    return { success: false, quarksGranted: 0, error: 'Purchase failed' };
  }
}

export async function restoreIAPPurchases(): Promise<{ restored: boolean }> {
  if (!await ensureIAPConfigured()) return { restored: false };

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.restorePurchases();
    const activePremium = hasPremium(customerInfo);
    if (activePremium) localStorage.setItem('nebulife_premium', '1');
    return { restored: activePremium };
  } catch (err) {
    console.warn('[IAP] Restore failed:', err);
    return { restored: false };
  }
}

function hasPremium(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID]?.isActive === true;
}
