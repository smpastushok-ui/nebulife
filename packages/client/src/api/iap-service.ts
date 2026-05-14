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
 * 4. Create Pro products and attach all to RevenueCat entitlement "premium":
 *    - nebulife_pro_monthly  (auto-renewable subscription)
 *    - nebulife_pro_yearly   (auto-renewable subscription)
 *    - nebulife_pro_lifetime (non-consumable)
 * 5. Create an Offering in RevenueCat named "default" with quark and Premium packages.
 * 6. Set VITE_REVENUECAT_IOS_API_KEY and/or VITE_REVENUECAT_ANDROID_API_KEY.
 * 7. Run `npx cap sync` after building to push native changes.
 */

import { Capacitor } from '@capacitor/core';
import { authFetch } from '../auth/api-client.js';
import { trackEvent } from '../analytics/firebase-analytics.js';

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

export interface IAPPackagesResult {
  packages: IAPPackage[];
  configured: boolean;
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

export const PREMIUM_PRODUCT_IDS = {
  monthly: 'nebulife_pro_monthly',
  yearly: 'nebulife_pro_yearly',
  lifetime: 'nebulife_pro_lifetime',
} as const;

type PremiumPlan = keyof typeof PREMIUM_PRODUCT_IDS;

const PREMIUM_PLAN_BY_PRODUCT_ID: Record<string, PremiumPlan> = Object.fromEntries(
  Object.entries(PREMIUM_PRODUCT_IDS).map(([plan, productId]) => [productId, plan]),
) as Record<string, PremiumPlan>;

let configured = false;
let configuredUserId: string | null = null;
let packageCache = new Map<string, RevenueCatPackage>();
let premiumPackageCache = new Map<string, RevenueCatPackage>();

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

export interface PremiumPackage {
  /** Package identifier from RevenueCat (e.g. "$rc_monthly", "$rc_annual", or custom lifetime) */
  identifier: string;
  /** App Store / Play Store product ID */
  productIdentifier: string;
  plan: PremiumPlan;
  titleKey: string;
  descriptionKey: string;
  badgeKey?: string;
  /** Localized price string from the store */
  priceString: string;
}

export interface PremiumPackagesResult {
  packages: PremiumPackage[];
  configured: boolean;
}

function toPremiumPackage(pkg: RevenueCatPackage): PremiumPackage | null {
  const productId = pkg.product.identifier;
  const plan = PREMIUM_PLAN_BY_PRODUCT_ID[productId];
  if (!plan) return null;

  return {
    identifier: pkg.identifier,
    productIdentifier: productId,
    plan,
    titleKey: `premium.${plan}_label`,
    descriptionKey: `premium.${plan}_desc`,
    badgeKey: plan === 'yearly' ? 'premium.yearly_save' : plan === 'lifetime' ? 'premium.lifetime_save' : undefined,
    priceString: pkg.product.priceString,
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

/** Fetch available quark packs from RevenueCat. Native builds must not show
 * hardcoded fallback prices because App Review treats them as inaccurate
 * commerce metadata. */
export async function fetchIAPPackages(): Promise<IAPPackage[]> {
  const result = await fetchIAPPackagesWithStatus();
  return result.configured && result.packages.length > 0 ? result.packages : FALLBACK_IAP_PACKAGES;
}

export async function fetchIAPPackagesWithStatus(): Promise<IAPPackagesResult> {
  if (!await ensureIAPConfigured()) return { packages: [], configured: false };

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const offerings = await Purchases.getOfferings();
    const offering = offerings.current ?? offerings.all[DEFAULT_OFFERING_ID] ?? Object.values(offerings.all)[0];
    const nativePackages = offering?.availablePackages ?? [];
    packageCache = new Map(nativePackages
      .filter((pkg) => QUARKS_BY_PRODUCT_ID[pkg.product.identifier])
      .map((pkg) => [pkg.identifier, pkg]));

    const packages = nativePackages
      .map(toIAPPackage)
      .filter((pkg): pkg is IAPPackage => pkg !== null);

    return { packages, configured: true };
  } catch (err) {
    console.warn('[IAP] Failed to fetch RevenueCat offerings:', err);
    return { packages: [], configured: true };
  }
}

export async function fetchPremiumPackagesWithStatus(): Promise<PremiumPackagesResult> {
  if (!await ensureIAPConfigured()) return { packages: [], configured: false };

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const offerings = await Purchases.getOfferings();
    const offering = offerings.current ?? offerings.all[DEFAULT_OFFERING_ID] ?? Object.values(offerings.all)[0];
    const nativePackages = offering?.availablePackages ?? [];
    premiumPackageCache = new Map(nativePackages
      .filter((pkg) => PREMIUM_PLAN_BY_PRODUCT_ID[pkg.product.identifier])
      .map((pkg) => [pkg.identifier, pkg]));

    const packages = nativePackages
      .map(toPremiumPackage)
      .filter((pkg): pkg is PremiumPackage => pkg !== null)
      .sort((a, b) => {
        const order: Record<PremiumPlan, number> = { monthly: 0, yearly: 1, lifetime: 2 };
        return order[a.plan] - order[b.plan];
      });

    return { packages, configured: true };
  } catch (err) {
    console.warn('[IAP] Failed to fetch Premium offerings:', err);
    return { packages: [], configured: true };
  }
}

export interface PremiumStatus {
  active: boolean;
  /** Localized price string for the premium subscription, if available */
  priceString?: string;
  expiresAt?: string | null;
  productId?: string | null;
  source?: string | null;
}

async function fetchServerPremiumStatus(): Promise<PremiumStatus> {
  const res = await authFetch('/api/player/premium');
  if (!res.ok) return { active: false };
  return (await res.json()) as PremiumStatus;
}

async function syncServerPremiumStatus(): Promise<PremiumStatus> {
  const res = await authFetch('/api/player/premium', { method: 'POST' });
  if (!res.ok) throw new Error(`Premium sync failed: ${res.status}`);
  return (await res.json()) as PremiumStatus;
}

function cachePremiumStatus(active: boolean): void {
  if (active) localStorage.setItem('nebulife_premium', '1');
  else localStorage.removeItem('nebulife_premium');
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
      if (active) {
        const server = await syncServerPremiumStatus().catch(() => ({ active }) as PremiumStatus);
        cachePremiumStatus(server.active);
        return server;
      }
      const server = await syncServerPremiumStatus().catch(() => ({ active: false }) as PremiumStatus);
      cachePremiumStatus(server.active);
      return server;
    } catch (err) {
      console.warn('[IAP] Failed to check premium status:', err);
    }
  }

  const server = await fetchServerPremiumStatus().catch(() => ({ active: false }) as PremiumStatus);
  cachePremiumStatus(server.active);
  return server;
}

/** Purchase Premium through the custom React paywall backed by RevenueCat packages. */
export async function purchasePremium(
  packageIdentifier: string,
  playerId: string,
): Promise<{ success: boolean; status?: PremiumStatus; error?: string }> {
  if (!await ensureIAPConfigured(playerId)) {
    return { success: false, error: 'Not on native platform' };
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    if (premiumPackageCache.size === 0) await fetchPremiumPackagesWithStatus();

    const nativePackage = premiumPackageCache.get(packageIdentifier);
    if (!nativePackage) {
      return { success: false, error: 'Premium package not found' };
    }

    const purchase = await Purchases.purchasePackage({ aPackage: nativePackage });
    const activePremium = hasPremium(purchase.customerInfo);
    if (!activePremium) {
      return { success: false, error: 'Premium entitlement was not activated' };
    }

    const status = await syncServerPremiumStatus().catch(() => ({ active: activePremium }) as PremiumStatus);
    cachePremiumStatus(status.active);
    void trackEvent('purchase', {
      currency: 'USD',
      transaction_id: purchase.transaction?.transactionIdentifier ?? nativePackage.product.identifier,
      item_id: nativePackage.product.identifier,
      item_name: 'premium',
      premium_plan: PREMIUM_PLAN_BY_PRODUCT_ID[nativePackage.product.identifier] ?? 'unknown',
    });
    return { success: status.active, status };
  } catch (err) {
    if (isPurchaseCancelled(err)) return { success: false, error: 'cancelled' };
    if (isNetworkError(err)) return { success: false, error: 'network' };
    console.warn('[IAP] Premium purchase failed:', err);
    return { success: false, error: 'Premium purchase failed' };
  }
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
    void trackEvent('purchase', {
      currency: 'USD',
      transaction_id: transactionId,
      item_id: productId,
      item_name: 'quark_pack',
      quarks: grant.quarksGranted ?? quarks,
    });
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
    const server = activePremium
      ? await syncServerPremiumStatus().catch(() => ({ active: activePremium }) as PremiumStatus)
      : await fetchServerPremiumStatus().catch(() => ({ active: false }) as PremiumStatus);
    cachePremiumStatus(server.active);
    return { restored: server.active };
  } catch (err) {
    console.warn('[IAP] Restore failed:', err);
    return { restored: false };
  }
}

function hasPremium(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID]?.isActive === true;
}
