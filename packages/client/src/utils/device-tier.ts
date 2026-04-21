/**
 * Device-tier heuristic — classifies the current device as low/mid/high
 * based on CPU cores + RAM. Used by rendering code to pick cheaper paths
 * on weak phones (disable bloom, lower DPR, skip antialias, etc.).
 *
 * Caveats:
 *   - `navigator.deviceMemory` is only 0.25–8 in increments of 0.25 and
 *     is capped at 8 for privacy on Chrome. A flagship phone and an
 *     entry-level phone can both report 8 — treat this as a floor, not
 *     a ceiling.
 *   - `navigator.hardwareConcurrency` is spoofable and some Android
 *     WebViews under-report. Fall back to 4 when unavailable.
 *   - Evaluated ONCE at module load and cached; re-computing per frame
 *     would be pointless.
 *
 * On Capacitor Android the values come straight from the system; on web
 * we get conservative Chrome defaults.
 */

export type DeviceTier = 'low' | 'mid' | 'high';

function compute(): DeviceTier {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const cores = nav?.hardwareConcurrency ?? 4;
  // `deviceMemory` is non-standard, available on Chrome-family browsers.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mem = (nav as any)?.deviceMemory ?? 4;

  if (cores <= 4 || mem <= 3) return 'low';
  if (cores <= 6 || mem <= 6) return 'mid';
  return 'high';
}

let cached: DeviceTier | null = null;

/** Memoized — safe to call freely. */
export function getDeviceTier(): DeviceTier {
  if (cached === null) cached = compute();
  return cached;
}

/** Sugar for "should I enable expensive effects?" */
export function isLowEndDevice(): boolean {
  return getDeviceTier() === 'low';
}

/** Sugar for "high-end, go wild with effects". */
export function isHighEndDevice(): boolean {
  return getDeviceTier() === 'high';
}
