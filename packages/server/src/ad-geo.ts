// ---------------------------------------------------------------------------
// Ad geo policy — rewarded ads are only worthwhile in high-eCPM ("Tier 1")
// countries. Elsewhere the ad revenue is far below the value of the reward
// (free quarks → Kling generation cost), so rewarded ads are disabled.
//
// This list is the single source of truth, enforced server-side in
// /api/ads/start and /api/ads/reward, and surfaced to the client via
// /api/auth/register (`ads_geo_allowed`) so the ad UI can be hidden.
//
// Trim or extend this set as ad performance data comes in.
// ---------------------------------------------------------------------------

// The reliable high-value Anglo + Western / Northern Europe block plus the two
// strongest high-income Asia markets (JP, SG). The cheaper markets (KR, HK, TW,
// the Gulf, IL, and the tiny LU/IS markets) were removed.
export const TIER1_AD_COUNTRIES: ReadonlySet<string> = new Set([
  // North America
  'US', 'CA',
  // UK / Ireland / Oceania
  'GB', 'IE', 'AU', 'NZ',
  // Western / Northern Europe
  'DE', 'FR', 'NL', 'BE', 'AT', 'CH',
  'SE', 'NO', 'DK', 'FI',
  // High-income Asia
  'JP', 'SG',
]);

/** Read the requester's ISO country from Vercel's geo header. */
export function getRequestCountry(
  headers: Record<string, string | string[] | undefined>,
): string | null {
  const raw = headers['x-vercel-ip-country'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || typeof value !== 'string') return null;
  return value.toUpperCase();
}

/** True if the given ISO country is a Tier-1 (high-eCPM) ad market. */
export function isTier1AdCountry(country: string | null | undefined): boolean {
  return !!country && TIER1_AD_COUNTRIES.has(country.toUpperCase());
}

/** Convenience: read country from headers and decide if rewarded ads are allowed. */
export function areAdsAllowedForRequest(
  headers: Record<string, string | string[] | undefined>,
): boolean {
  return isTier1AdCountry(getRequestCountry(headers));
}
