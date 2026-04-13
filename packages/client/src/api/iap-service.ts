/**
 * IAP Service — In-App Purchases via RevenueCat for iOS/Android.
 *
 * SETUP CHECKLIST (do these before going to production):
 * 1. Create a RevenueCat project at https://app.revenuecat.com
 * 2. Connect your iOS app (App Store Connect) and Android app (Google Play Console)
 * 3. Create consumable products in App Store Connect + Google Play:
 *    - nebulife_quarks_100   (100  quarks, ~$0.99)
 *    - nebulife_quarks_500   (500  quarks, ~$3.99)
 *    - nebulife_quarks_2000  (2000 quarks, ~$12.99)
 * 4. Create an Offering in RevenueCat named "default" with the above products as Packages.
 * 5. Replace the API key placeholders below with your actual RevenueCat API keys.
 * 6. Run `npx cap sync` after building to push native changes.
 */

import { Capacitor } from '@capacitor/core';
import { authFetch } from '../auth/api-client.js';

// ---------------------------------------------------------------------------
// RevenueCat API keys (test keys — replace with production keys before release)
// ---------------------------------------------------------------------------
const REVENUECAT_IOS_KEY = 'test_bgUKWMvwmBdTVOlDtHqSUFHxZqR';
const REVENUECAT_ANDROID_KEY = 'test_bgUKWMvwmBdTVOlDtHqSUFHxZqR';

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

/** Fallback packages — used while loading or if RevenueCat is not configured. */
export const FALLBACK_IAP_PACKAGES: IAPPackage[] = [
  {
    identifier: 'quarks_100',
    productIdentifier: 'nebulife_quarks_100',
    title: '100',
    description: 'Стартовий набір',
    priceString: '$0.99',
    quarks: 100,
  },
  {
    identifier: 'quarks_500',
    productIdentifier: 'nebulife_quarks_500',
    title: '500',
    description: 'Оптимальний вибір',
    priceString: '$3.99',
    quarks: 500,
  },
  {
    identifier: 'quarks_2000',
    productIdentifier: 'nebulife_quarks_2000',
    title: '2000',
    description: 'Найкраще значення',
    priceString: '$12.99',
    quarks: 2000,
  },
];

/** Initialize RevenueCat SDK with the current user ID. Call this once after login. */
export async function initIAP(userId: string): Promise<void> {
  if (!isNativeIAP()) return;
  try {
    // Dynamic import so the module is not bundled into the web build
    const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') {
      await Purchases.configure({ apiKey: REVENUECAT_IOS_KEY, appUserID: userId });
    } else if (platform === 'android') {
      await Purchases.configure({ apiKey: REVENUECAT_ANDROID_KEY, appUserID: userId });
    }
  } catch (err) {
    console.warn('[IAP] Could not initialize RevenueCat:', err);
  }
  // Check and cache premium status after SDK init
  await checkPremiumStatus();
}

/** Fetch available quark packs from RevenueCat (or fall back to static list). */
export async function fetchIAPPackages(): Promise<IAPPackage[]> {
  if (!isNativeIAP()) return FALLBACK_IAP_PACKAGES;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    // getOfferings() returns PurchasesOfferings directly
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current || current.availablePackages.length === 0) {
      console.warn('[IAP] No offerings available, using fallback');
      return FALLBACK_IAP_PACKAGES;
    }
    return current.availablePackages.map(pkg => ({
      identifier: pkg.identifier,
      productIdentifier: pkg.product.identifier,
      title: `${QUARKS_BY_PRODUCT_ID[pkg.product.identifier] ?? '?'}`,
      description: pkg.product.description,
      priceString: pkg.product.priceString,
      quarks: QUARKS_BY_PRODUCT_ID[pkg.product.identifier] ?? 0,
    }));
  } catch (err) {
    console.warn('[IAP] fetchIAPPackages error, using fallback:', err);
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
  // localStorage fallback (dev / non-native)
  if (!isNativeIAP()) {
    const flag = localStorage.getItem('nebulife_premium');
    return { active: flag === '1' };
  }
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.getCustomerInfo();
    const active = typeof customerInfo.entitlements?.active?.['Nebulife Pro'] !== 'undefined';
    if (active) localStorage.setItem('nebulife_premium', '1');
    return { active };
  } catch (err) {
    console.warn('[IAP] checkPremiumStatus error:', err);
    const flag = localStorage.getItem('nebulife_premium');
    return { active: flag === '1' };
  }
}

/**
 * Present the RevenueCatUI paywall for premium subscription.
 * Returns true if the user completed a purchase or restored an existing one.
 */
export async function purchasePremium(): Promise<{ success: boolean; error?: string }> {
  if (!isNativeIAP()) {
    return { success: false, error: 'Not on native platform' };
  }
  try {
    const { RevenueCatUI, PAYWALL_RESULT } = await import('@revenuecat/purchases-capacitor-ui');
    const { result } = await RevenueCatUI.presentPaywall();
    switch (result) {
      case PAYWALL_RESULT.PURCHASED:
      case PAYWALL_RESULT.RESTORED:
        localStorage.setItem('nebulife_premium', '1');
        return { success: true };
      case PAYWALL_RESULT.CANCELLED:
        return { success: false, error: 'cancelled' };
      default:
        return { success: false };
    }
  } catch (err) {
    console.error('[IAP] purchasePremium error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
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
  if (!isNativeIAP()) {
    return { success: false, quarksGranted: 0, error: 'Not on native platform' };
  }
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');

    // Fetch current offering to get the actual package object
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) throw new Error('No offerings');

    const pkg = current.availablePackages.find(p => p.identifier === packageIdentifier);
    if (!pkg) throw new Error(`Package "${packageIdentifier}" not found`);

    // Trigger native purchase sheet (App Store / Google Play)
    const result = await Purchases.purchasePackage({ aPackage: pkg });

    const quarks = QUARKS_BY_PRODUCT_ID[pkg.product.identifier] ?? 0;

    // Tell our backend to verify the purchase via RevenueCat and credit quarks
    const res = await authFetch('/api/iap/grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId,
        quarks,
        productId: pkg.product.identifier,
        purchaseToken: result.customerInfo.originalAppUserId ?? playerId,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? 'Grant failed');
    }

    return { success: true, quarksGranted: quarks };
  } catch (err: unknown) {
    // Check if user cancelled by inspecting the error code string
    const errCode = (err as { code?: string })?.code;
    if (errCode === '1') { // PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR === "1"
      return { success: false, quarksGranted: 0, error: 'cancelled' };
    }
    // Check deprecated userCancelled flag as fallback
    if ((err as { userCancelled?: boolean })?.userCancelled === true) {
      return { success: false, quarksGranted: 0, error: 'cancelled' };
    }
    console.error('[IAP] purchaseQuarkPack error:', err);
    return {
      success: false,
      quarksGranted: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
