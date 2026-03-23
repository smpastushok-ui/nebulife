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
// Show rewarded ad
// ---------------------------------------------------------------------------

/** Show a single rewarded ad. Returns true if user watched to completion. */
export function showRewardedAd(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve(false);

  return new Promise<boolean>((resolve) => {
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
        if (rewarded) incrementDailyCount();
        resolve(rewarded);
      },
    );

    const failHandle = AdMob.addListener(
      RewardAdPluginEvents.FailedToShow,
      async () => {
        await cleanup();
        resolve(false);
      },
    );

    (async () => {
      try {
        const options: RewardAdOptions = { adId: REWARDED_AD_UNIT_ID };
        await AdMob.prepareRewardVideoAd(options);
        await AdMob.showRewardVideoAd();
      } catch {
        await cleanup();
        resolve(false);
      }
    })();
  });
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

export type RewardType = 'quarks' | 'astra_charge' | 'premium_photo';

export async function claimAdReward(
  rewardType: RewardType,
  adsWatched: number,
): Promise<{ rewarded: boolean; amount?: number }> {
  const res = await authFetch('/api/ads/reward', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rewardType, adsWatched }),
  });

  if (!res.ok) return { rewarded: false };
  return (await res.json()) as { rewarded: boolean; amount?: number };
}

// ---------------------------------------------------------------------------
// Platform check helper
// ---------------------------------------------------------------------------

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}
