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

/** Play Store subscriptions use `subscriptionId:basePlanId`; App Store uses plain IDs. */
function normalizePremiumProductId(productId: string): string {
  if (PREMIUM_PLAN_BY_PRODUCT_ID[productId]) return productId;
  const subscriptionId = productId.split(':')[0];
  return PREMIUM_PLAN_BY_PRODUCT_ID[subscriptionId] ? subscriptionId : productId;
}

function resolvePremiumPlan(productId: string): PremiumPlan | null {
  return PREMIUM_PLAN_BY_PRODUCT_ID[normalizePremiumProductId(productId)] ?? null;
}

function isPremiumProductId(productId: string | null | undefined): boolean {
  return !!productId && resolvePremiumPlan(productId) !== null;
}

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

function isAlreadyPurchasedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const record = err as { code?: string | number; message?: string; underlyingErrorMessage?: string };
  const code = String(record.code ?? '').toLowerCase();
  const message = `${record.message ?? ''} ${record.underlyingErrorMessage ?? ''}`.toLowerCase();
  return (
    code === '6'
    || code.includes('alreadypurchased')
    || code.includes('already_purchased')
    || message.includes('already purchased')
    || message.includes('already subscribed')
    || message.includes('currently subscribed')
    || message.includes('already own')
    || message.includes('already active')
  );
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
  const plan = resolvePremiumPlan(productId);
  if (!plan) return null;

  return {
    identifier: pkg.identifier,
    productIdentifier: normalizePremiumProductId(productId),
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
export async function fetchIAPPackages(userId?: string): Promise<IAPPackage[]> {
  const result = await fetchIAPPackagesWithStatus(userId);
  return result.configured && result.packages.length > 0 ? result.packages : FALLBACK_IAP_PACKAGES;
}

export async function fetchIAPPackagesWithStatus(userId?: string): Promise<IAPPackagesResult> {
  if (!await ensureIAPConfigured(userId)) return { packages: [], configured: false };

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

export async function fetchPremiumPackagesWithStatus(userId?: string): Promise<PremiumPackagesResult> {
  if (!await ensureIAPConfigured(userId)) return { packages: [], configured: false };

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const offerings = await Purchases.getOfferings();
    const offering = offerings.current ?? offerings.all[DEFAULT_OFFERING_ID] ?? Object.values(offerings.all)[0];
    const nativePackages = offering?.availablePackages ?? [];
    premiumPackageCache = new Map(nativePackages
      .filter((pkg) => resolvePremiumPlan(pkg.product.identifier))
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

function entitlementProductId(entitlement: unknown): string | null {
  if (!entitlement || typeof entitlement !== 'object') return null;
  const record = entitlement as {
    productIdentifier?: string | null;
    product_identifier?: string | null;
  };
  return record.productIdentifier ?? record.product_identifier ?? null;
}

function entitlementExpirationDate(entitlement: unknown): string | null {
  if (!entitlement || typeof entitlement !== 'object') return null;
  const record = entitlement as {
    expirationDate?: string | null;
    expires_date?: string | null;
  };
  return record.expirationDate ?? record.expires_date ?? null;
}

function activeSubscriptionIds(customerInfo: CustomerInfo): string[] {
  const record = customerInfo as unknown as {
    activeSubscriptions?: string[] | null;
  };
  return Array.isArray(record.activeSubscriptions) ? record.activeSubscriptions : [];
}

function getLocalPremiumStatus(customerInfo: CustomerInfo): PremiumStatus {
  const activeEntitlements = customerInfo.entitlements.active;
  const direct = activeEntitlements[PREMIUM_ENTITLEMENT_ID];
  if (direct?.isActive === true) {
    return {
      active: true,
      expiresAt: entitlementExpirationDate(direct),
      productId: normalizePremiumProductId(entitlementProductId(direct) ?? ''),
      source: 'revenuecat_local',
    };
  }

  const premiumEntitlement = Object.values(activeEntitlements).find((entitlement) => {
    const isActive = entitlement?.isActive !== false;
    return isActive && isPremiumProductId(entitlementProductId(entitlement));
  });
  if (premiumEntitlement) {
    return {
      active: true,
      expiresAt: entitlementExpirationDate(premiumEntitlement),
      productId: normalizePremiumProductId(entitlementProductId(premiumEntitlement) ?? ''),
      source: 'revenuecat_local',
    };
  }

  const activeSubscriptionId = activeSubscriptionIds(customerInfo).find(isPremiumProductId);
  if (activeSubscriptionId) {
    return {
      active: true,
      expiresAt: null,
      productId: normalizePremiumProductId(activeSubscriptionId),
      source: 'revenuecat_local',
    };
  }

  return { active: false, expiresAt: null, productId: null, source: 'revenuecat_local' };
}

/**
 * Check whether the player has an active premium subscription.
 * First checks RevenueCat entitlements, falls back to localStorage flag
 * `nebulife_premium` for dev/testing purposes.
 */
export async function checkPremiumStatus(userId?: string): Promise<PremiumStatus> {
  if (await ensureIAPConfigured(userId)) {
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { customerInfo } = await Purchases.getCustomerInfo();
      const localStatus = getLocalPremiumStatus(customerInfo);
      if (localStatus.active) {
        const server = await syncServerPremiumStatus().catch(() => localStatus);
        const status = {
          ...server,
          active: server.active || localStatus.active,
          expiresAt: server.expiresAt ?? localStatus.expiresAt ?? null,
          productId: server.productId ?? localStatus.productId ?? null,
        };
        cachePremiumStatus(status.active);
        return status;
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
    if (premiumPackageCache.size === 0) await fetchPremiumPackagesWithStatus(playerId);

    const nativePackage = premiumPackageCache.get(packageIdentifier);
    if (!nativePackage) {
      return { success: false, error: 'Premium package not found' };
    }

    const purchase = await Purchases.purchasePackage({ aPackage: nativePackage });
    const activePremium = getLocalPremiumStatus(purchase.customerInfo).active || isPremiumProductId(nativePackage.product.identifier);
    if (!activePremium) {
      return { success: false, error: 'Premium entitlement was not activated' };
    }

    const server = await syncServerPremiumStatus().catch(() => ({ active: activePremium }) as PremiumStatus);
    const status = { ...server, active: server.active || activePremium };
    cachePremiumStatus(status.active);
    void trackEvent('purchase', {
      currency: 'USD',
      transaction_id: purchase.transaction?.transactionIdentifier ?? nativePackage.product.identifier,
      item_id: nativePackage.product.identifier,
      item_name: 'premium',
      premium_plan: resolvePremiumPlan(nativePackage.product.identifier) ?? 'unknown',
    });
    return { success: status.active, status };
  } catch (err) {
    if (isPurchaseCancelled(err)) return { success: false, error: 'cancelled' };
    if (isNetworkError(err)) return { success: false, error: 'network' };
    if (isAlreadyPurchasedError(err)) {
      const status = await checkPremiumStatus(playerId).catch(() => ({ active: false }) as PremiumStatus);
      return status.active
        ? { success: true, status }
        : { success: false, status, error: 'already-purchased' };
    }
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
    if (packageCache.size === 0) await fetchIAPPackages(playerId);

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

export async function restoreIAPPurchases(playerId?: string): Promise<{ restored: boolean }> {
  if (!await ensureIAPConfigured(playerId)) return { restored: false };

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.restorePurchases();
    const activePremium = getLocalPremiumStatus(customerInfo).active;
    const server = activePremium
      ? await syncServerPremiumStatus().catch(() => ({ active: activePremium }) as PremiumStatus)
      : await fetchServerPremiumStatus().catch(() => ({ active: false }) as PremiumStatus);
    const restored = server.active || activePremium;
    cachePremiumStatus(restored);
    return { restored };
  } catch (err) {
    console.warn('[IAP] Restore failed:', err);
    return { restored: false };
  }
}

