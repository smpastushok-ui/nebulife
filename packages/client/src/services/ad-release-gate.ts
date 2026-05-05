const ADS_UNLOCKED_KEY = 'nebulife_ads_unlocked_after_settlement';

export function areAdsUnlockedAfterSettlement(): boolean {
  try {
    return localStorage.getItem(ADS_UNLOCKED_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAdsUnlockedAfterSettlement(unlocked: boolean): void {
  try {
    if (unlocked) localStorage.setItem(ADS_UNLOCKED_KEY, '1');
    else localStorage.removeItem(ADS_UNLOCKED_KEY);
  } catch {
    // localStorage can be unavailable in private/locked-down contexts.
  }
}
