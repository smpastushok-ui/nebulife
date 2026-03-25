// ---------------------------------------------------------------------------
// Rewarded Ads Service (AdMob via Capacitor)
// ---------------------------------------------------------------------------

import { Capacitor } from '@capacitor/core';
import { AdMob, RewardAdPluginEvents, RewardAdOptions } from '@capacitor-community/admob';
import { authFetch } from '../auth/api-client.js';

// Test Ad Unit IDs (replace with real ones from AdMob dashboard)
const REWARDED_AD_UNIT_ID = Capacitor.getPlatform() === 'ios'
  ? 'ca-app-pub-3940256099942544/1712485313'  // iOS test
  : 'ca-app-pub-3940256099942544/5224354917';  // Android test

const DAILY_LIMIT = 10;
const STORAGE_KEY = 'nebulife_ad_views';

// localStorage progress TTL — 4 minutes (server token TTL is 5 min, leave 1 min margin)
const AD_PROGRESS_TTL_MS = 4 * 60 * 1000;

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

let initialized = false;

export async function initAds(): Promise<void> {
  if (!Capacitor.isNativePlatform() || initialized) return;

  await AdMob.initialize({
    initializeForTesting: true, // TODO: set to false for production
  });

  initialized = true;
}

// ---------------------------------------------------------------------------
// Show rewarded ad (internal — with reason)
// ---------------------------------------------------------------------------

type AdResult =
  | { rewarded: true }
  | { rewarded: false; reason: 'dismissed' | 'no_fill' | 'error' };

function showRewardedAdWithReason(): Promise<AdResult> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve({ rewarded: false, reason: 'error' });

  return new Promise<AdResult>((resolve) => {
    let rewarded = false;

    const cleanup = async () => {
      await Promise.all([
        rewardHandle.then(h => h.remove()),
        dismissHandle.then(h => h.remove()),
        failHandle.then(h => h.remove()),
      ]).catch(() => {});
    };

    const rewardHandle = AdMob.addListener(
      RewardAdPluginEvents.Rewarded,
      () => { rewarded = true; },
    );

    const dismissHandle = AdMob.addListener(
      RewardAdPluginEvents.Dismissed,
      async () => {
        await cleanup();
        if (rewarded) {
          incrementDailyCount();
          resolve({ rewarded: true });
        } else {
          resolve({ rewarded: false, reason: 'dismissed' });
        }
      },
    );

    const failHandle = AdMob.addListener(
      RewardAdPluginEvents.FailedToShow,
      async () => {
        await cleanup();
        resolve({ rewarded: false, reason: 'error' });
      },
    );

    (async () => {
      try {
        const options: RewardAdOptions = { adId: REWARDED_AD_UNIT_ID };
        await AdMob.prepareRewardVideoAd(options);
        await AdMob.showRewardVideoAd();
      } catch (err) {
        await cleanup();
        // AdMob error code 3 = ERROR_CODE_NO_FILL
        const errMsg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
        const isNoFill =
          errMsg.includes('no fill') ||
          errMsg.includes('nofill') ||
          errMsg.includes('error code: 3') ||
          errMsg.includes('code 3');
        resolve({ rewarded: false, reason: isNoFill ? 'no_fill' : 'error' });
      }
    })();
  });
}

// ---------------------------------------------------------------------------
// Show rewarded ad (public — legacy, returns boolean)
// ---------------------------------------------------------------------------

/** Show a single rewarded ad. Returns true if user watched to completion. */
export function showRewardedAd(): Promise<boolean> {
  return showRewardedAdWithReason().then(r => r.rewarded);
}

/**
 * Show multiple rewarded ads in sequence.
 * Returns true only if ALL ads were watched to completion.
 */
export async function showMultipleRewardedAds(count: number): Promise<boolean> {
  for (let i = 0; i < count; i++) {
    const watched = await showRewardedAd();
    if (!watched) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Availability check (no-fill detection)
// ---------------------------------------------------------------------------

/**
 * Check if a rewarded ad is available without showing it.
 * Returns false when AdMob has no fill (no ads to show).
 */
export async function checkAdAvailability(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const options: RewardAdOptions = { adId: REWARDED_AD_UNIT_ID };
    await AdMob.prepareRewardVideoAd(options);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Daily limit tracking (client-side, server also validates)
// ---------------------------------------------------------------------------

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDailyData(): { date: string; count: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.date === getTodayKey()) return data;
    }
  } catch { /* ignore */ }
  return { date: getTodayKey(), count: 0 };
}

function incrementDailyCount(): void {
  const data = getDailyData();
  data.count++;
  data.date = getTodayKey();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getDailyAdCount(): number {
  return getDailyData().count;
}

export function canShowAd(): boolean {
  if (!Capacitor.isNativePlatform()) return false;
  return getDailyData().count < DAILY_LIMIT;
}

export function remainingAdsToday(): number {
  return Math.max(0, DAILY_LIMIT - getDailyData().count);
}

// ---------------------------------------------------------------------------
// Server reward claim
// ---------------------------------------------------------------------------

export type RewardType =
  | 'quarks'
  | 'astra_charge'
  | 'premium_photo'
  | 'discovery_photo'
  | 'planet_photo'
  | 'panorama_photo';

/** Get a signed ad session token from the server before showing an ad. */
async function getAdSessionToken(): Promise<string | null> {
  try {
    const res = await authFetch('/api/ads/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { adSessionToken: string };
    return data.adSessionToken;
  } catch {
    return null;
  }
}

/**
 * Show N rewarded ads and collect server-signed tokens, then claim reward.
 * Returns true if reward was granted.
 */
export async function watchAdsAndClaim(
  rewardType: RewardType,
  adsRequired: number,
): Promise<{ rewarded: boolean; amount?: number }> {
  const tokens: string[] = [];

  for (let i = 0; i < adsRequired; i++) {
    // Get server token before each ad
    const token = await getAdSessionToken();
    if (!token) return { rewarded: false };

    // Show the ad
    const watched = await showRewardedAd();
    if (!watched) return { rewarded: false };

    tokens.push(token);
  }

  // Claim reward with all tokens
  const res = await authFetch('/api/ads/reward', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rewardType, adSessionTokens: tokens }),
  });

  if (!res.ok) return { rewarded: false };
  return (await res.json()) as { rewarded: boolean; amount?: number };
}

/** @deprecated Use watchAdsAndClaim instead */
export async function claimAdReward(
  rewardType: RewardType,
  adsWatched: number,
): Promise<{ rewarded: boolean; amount?: number }> {
  return watchAdsAndClaim(rewardType, adsWatched);
}

// ---------------------------------------------------------------------------
// Ad progress persistence (for photo reward types)
// ---------------------------------------------------------------------------

interface AdProgressData {
  tokens: string[];
  lastAt: number;
}

function getProgressKey(rewardType: RewardType): string {
  return `nebulife_ad_progress_${rewardType}`;
}

function loadProgress(rewardType: RewardType): AdProgressData | null {
  try {
    const raw = localStorage.getItem(getProgressKey(rewardType));
    if (!raw) return null;
    const data = JSON.parse(raw) as AdProgressData;
    // Discard stale progress — server tokens expire in 5 min, we use 4 min margin
    if (Date.now() - data.lastAt > AD_PROGRESS_TTL_MS) {
      localStorage.removeItem(getProgressKey(rewardType));
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function saveProgress(rewardType: RewardType, tokens: string[]): void {
  const data: AdProgressData = { tokens, lastAt: Date.now() };
  localStorage.setItem(getProgressKey(rewardType), JSON.stringify(data));
}

function clearProgress(rewardType: RewardType): void {
  localStorage.removeItem(getProgressKey(rewardType));
}

/**
 * Returns the number of completed ad views saved in localStorage for this reward type.
 * Used by AdProgressButton to initialize its visual state.
 */
export function getAdProgress(rewardType: RewardType): number {
  return loadProgress(rewardType)?.tokens.length ?? 0;
}

// ---------------------------------------------------------------------------
// watchAdsWithProgress — photo reward flow with persistence
// ---------------------------------------------------------------------------

export type WatchAdsResult =
  | { rewarded: true; photoToken: string }
  | { rewarded: false; reason: 'dismissed' | 'no_fill' | 'error' };

/**
 * Watch N rewarded ads with localStorage progress persistence.
 * Resumes from where the player left off (within 4 min TTL).
 * Returns photoToken on success — a server-signed token for ad-funded AI photo generation.
 * The token is HMAC-signed by the server and cannot be forged by the client.
 */
export async function watchAdsWithProgress(
  rewardType: RewardType,
  adsRequired: number,
  onProgress: (completed: number, total: number) => void,
): Promise<WatchAdsResult> {
  // Resume from previous session if tokens are still fresh
  const existing = loadProgress(rewardType);
  const tokens: string[] = existing?.tokens ?? [];

  // Report current progress to UI immediately
  if (tokens.length > 0) {
    onProgress(tokens.length, adsRequired);
  }

  // Watch remaining ads one by one
  while (tokens.length < adsRequired) {
    // Get server-signed session token before showing ad
    const sessionToken = await getAdSessionToken();
    if (!sessionToken) return { rewarded: false, reason: 'error' };

    // Show ad and get result with reason
    const result = await showRewardedAdWithReason();

    if (!result.rewarded) {
      // Save current progress on partial dismissal so player can resume
      if (tokens.length > 0) saveProgress(rewardType, tokens);
      return { rewarded: false, reason: result.reason };
    }

    // Ad completed — accumulate token and save progress
    tokens.push(sessionToken);
    saveProgress(rewardType, tokens);
    onProgress(tokens.length, adsRequired);
  }

  // All ads watched — claim reward from server
  try {
    const res = await authFetch('/api/ads/reward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewardType, adSessionTokens: tokens }),
    });

    if (!res.ok) {
      // Server error — keep progress in case of transient failure
      return { rewarded: false, reason: 'error' };
    }

    const data = (await res.json()) as { rewarded: boolean; photoToken?: string };

    if (!data.rewarded || !data.photoToken) {
      return { rewarded: false, reason: 'error' };
    }

    // Clear progress only on confirmed success
    clearProgress(rewardType);
    return { rewarded: true, photoToken: data.photoToken };
  } catch {
    return { rewarded: false, reason: 'error' };
  }
}

// ---------------------------------------------------------------------------
// Platform check helper
// ---------------------------------------------------------------------------

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}
