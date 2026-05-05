// ---------------------------------------------------------------------------
// InterstitialManager — cooldown-based interstitial ad manager
// CRITICAL: After each showInterstitial(), the ad is consumed.
// Must call prepareInterstitial() to load the next one.
// ---------------------------------------------------------------------------

import { Capacitor } from '@capacitor/core';
import { areAdsUnlockedAfterSettlement } from './ad-release-gate.js';

// =============================================================================
// TEMP: ADS_DISABLED_FOR_TESTING — see the mirror flag in ads-service.ts.
// While this is true, canShow() always returns false so no interstitial ever
// interrupts testers. prepareNext() becomes a no-op, so the AdMob SDK is not
// initialized at all through this path.
//
// **TO RESTORE ADS:** set to `false` here AND in ads-service.ts.
// =============================================================================
const ADS_DISABLED_FOR_TESTING = false;
const ADS_DISABLED_ON_ANDROID_FOR_TESTERS = true;

// Interstitial ad unit IDs
// TEST mode: use Google test IDs during development/testing
// PRODUCTION: swap to real IDs before release
const USE_TEST_ADS = false;

const INTERSTITIAL_ID = USE_TEST_ADS
  ? (Capacitor.getPlatform() === 'ios'
      ? 'ca-app-pub-3940256099942544/4411468910'    // iOS test
      : 'ca-app-pub-3940256099942544/1033173712')   // Android test
  : (Capacitor.getPlatform() === 'ios'
      ? 'ca-app-pub-3504252081237345/9897294671'    // iOS production
      : 'ca-app-pub-3504252081237345/4806964536');   // Android production

class InterstitialManager {
  private lastAdTime = 0;
  private sessionAdCount = 0;
  private _isPremium = false;
  private isPrepared = false;

  private readonly MIN_COOLDOWN = 180_000;       // 3 min between ads
  private readonly FIRST_AD_DELAY = 120_000;     // first ad not before 2 min
  private readonly MAX_ADS_PER_SESSION = 6;
  public sessionStartTime = Date.now();

  canShow(): boolean {
    // TEMP: testers — never trigger an interstitial.
    if (ADS_DISABLED_FOR_TESTING) return false;

    if (ADS_DISABLED_ON_ANDROID_FOR_TESTERS && Capacitor.getPlatform() === 'android') return false;
    if (!areAdsUnlockedAfterSettlement()) return false;
    if (this._isPremium) return false;
    if (!Capacitor.isNativePlatform()) return false;
    if (this.sessionAdCount >= this.MAX_ADS_PER_SESSION) return false;
    if (Date.now() - this.sessionStartTime < this.FIRST_AD_DELAY) return false;
    if (Date.now() - this.lastAdTime < this.MIN_COOLDOWN) return false;
    if (!this.isPrepared) return false;
    return true;
  }

  async tryShow(): Promise<boolean> {
    if (!this.canShow()) return false;
    try {
      // Dynamic import to avoid issues in web builds
      const { AdMob } = await import('@capacitor-community/admob');
      // TODO: mute game audio here
      await AdMob.showInterstitial();
      this.lastAdTime = Date.now();
      this.sessionAdCount++;
      this.isPrepared = false;
      // TODO: unmute game audio here
      // CRITICAL: preload next ad
      this.prepareNext();
      return true;
    } catch {
      this.prepareNext();
      return false;
    }
  }

  async prepareNext(): Promise<void> {
    // TEMP: testers — skip AdMob preload entirely.
    if (ADS_DISABLED_FOR_TESTING) return;

    if (ADS_DISABLED_ON_ANDROID_FOR_TESTERS && Capacitor.getPlatform() === 'android') return;
    if (!areAdsUnlockedAfterSettlement()) return;
    if (this._isPremium || !Capacitor.isNativePlatform()) return;
    try {
      // Lazy init AdMob SDK if not yet initialized (avoids eager init at app startup)
      const { ensureAdMobInitialized } = await import('./ads-service.js');
      await ensureAdMobInitialized();
      const { AdMob } = await import('@capacitor-community/admob');
      await AdMob.prepareInterstitial({ adId: INTERSTITIAL_ID });
      this.isPrepared = true;
    } catch {
      this.isPrepared = false;
    }
  }

  setPremium(active: boolean): void {
    this._isPremium = active;
  }

  get isPremiumActive(): boolean {
    return this._isPremium;
  }
}

export const interstitialManager = new InterstitialManager();
