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

// ---------------------------------------------------------------------------
// Geo gate — rewarded ads only run in Tier-1 (high-eCPM) countries. The exact
// value is decided server-side (see packages/server/src/ad-geo.ts) and pushed
// to the client in the /api/auth/register response (`ads_geo_allowed`). It is
// cached so ad-UI checks stay synchronous.
// ---------------------------------------------------------------------------

const ADS_GEO_KEY = 'nebulife_ads_geo_allowed';

export function areAdsGeoAllowed(): boolean {
  try {
    // Unknown (before the first register response) → allow; the server still
    // enforces the region check on /api/ads/start, so nothing leaks.
    const v = localStorage.getItem(ADS_GEO_KEY);
    return v === null ? true : v === '1';
  } catch {
    return true;
  }
}

export function setAdsGeoAllowed(allowed: boolean): void {
  try {
    localStorage.setItem(ADS_GEO_KEY, allowed ? '1' : '0');
  } catch {
    // localStorage can be unavailable in private/locked-down contexts.
  }
}
