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

export type DeviceTier = 'low' | 'mid' | 'high' | 'ultra';

/**
 * Tier rules (in order of escalation):
 *   low   — ≤ 4 cores OR ≤ 3 GB RAM. Skip all optional effects.
 *   mid   — ≤ 6 cores OR ≤ 6 GB RAM. Skip nebula + bloom, keep starfield.
 *   high  — flagship mobiles (S22 Ultra, iPhone 14 Pro). Full native FX.
 *   ultra — ONLY desktop web builds (non-Capacitor, ≥ 8 cores, ≥ 8 GB).
 *           Reserved for additional desktop-only effects; behaves like
 *           'high' until those are layered in.
 *
 * Capacitor detection: we check for `window.Capacitor` so that a powerful
 * phone never gets promoted to 'ultra' — mobile browsers/WebViews don't
 * have the same thermal headroom as a desktop GPU.
 */
function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor;
  return !!cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform();
}

function compute(): DeviceTier {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const cores = nav?.hardwareConcurrency ?? 4;
  // `deviceMemory` is non-standard, available on Chrome-family browsers.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mem = (nav as any)?.deviceMemory ?? 4;

  if (cores <= 4 || mem <= 3) return 'low';
  if (cores <= 6 || mem <= 6) return 'mid';
  // Desktop web with lots of cores + RAM → ultra. Capacitor native stays 'high'.
  if (!isCapacitorNative() && cores >= 8 && mem >= 8) return 'ultra';
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

/** Sugar for "high-end, go wild with effects" (covers 'high' AND 'ultra'). */
export function isHighEndDevice(): boolean {
  const t = getDeviceTier();
  return t === 'high' || t === 'ultra';
}

/** Sugar for "desktop web with generous budget" — experimental features go here. */
export function isUltraTier(): boolean {
  return getDeviceTier() === 'ultra';
}

/**
 * Should heavy environmental FX (nebula sphere, fullscreen bloom, etc.)
 * render on this device? Returns false for low/mid — those devices get
 * the starfield only.
 */
export function shouldRenderNebula(): boolean {
  const t = getDeviceTier();
  return t === 'high' || t === 'ultra';
}

// ---------------------------------------------------------------------------
// Exosphere level-of-detail
// ---------------------------------------------------------------------------
// All tier-scaled parameters for the 3D planet view (PlanetGlobeView) in
// a single place so balance-changes touch one file. Returned values are
// consumed by createPlanetSphere, createAtmosphereShell, createCloudLayer,
// createRing, createMoons, createStarfield.
//
// The cuts target the per-frame GPU bottleneck on mobile: shader overdraw
// (planet + clouds + atm-front + atm-back all hit the same pixels). On low
// we drop clouds and the back-atmosphere entirely — losing the rim-haze
// silhouette but keeping the procedural surface + front atmosphere.

export interface ExosphereLOD {
  /** SphereGeometry width/height segments for the main planet. */
  planetSegments: number;
  /** Skip entire cloud shader sphere (biggest single-layer win on low). */
  renderClouds: boolean;
  /** If clouds are rendered, their sphere segments. */
  cloudSegments: number;
  /** Skip the secondary BackSide atmosphere mesh (halves rim overdraw). */
  renderAtmosphereBack: boolean;
  /** Atmosphere shell sphere segments (applied to front; back if enabled). */
  atmosphereSegments: number;
  /** Render Saturn-like ring around massive gas/ice giants. */
  renderRing: boolean;
  /** Ring tessellation (radial segments). */
  ringSegments: number;
  /** Moon sphere segments. */
  moonSegments: number;
  /**
   * Use cheap MeshBasicMaterial (flat shaded) for moons instead of the
   * per-moon terrain shader. Saves a shader program + uniform updates.
   */
  moonsFlatShaded: boolean;
  /**
   * Update the starfield twinkle uTime uniform every frame. When false
   * the stars are still drawn (shader runs once per pixel) but don't
   * animate — GPU cache stays warm, CPU skips a uniform upload.
   */
  starfieldTwinkle: boolean;
}

export function getExosphereLOD(): ExosphereLOD {
  const t = getDeviceTier();
  switch (t) {
    case 'low':
      return {
        planetSegments: 48,
        renderClouds: false,
        cloudSegments: 32,
        renderAtmosphereBack: false,
        atmosphereSegments: 24,
        renderRing: false,
        ringSegments: 48,
        moonSegments: 16,
        moonsFlatShaded: true,
        starfieldTwinkle: false,
      };
    case 'mid':
      return {
        planetSegments: 96,
        renderClouds: true,
        cloudSegments: 32,
        renderAtmosphereBack: true,
        atmosphereSegments: 24,
        renderRing: true,
        ringSegments: 48,
        moonSegments: 24,
        moonsFlatShaded: false,
        starfieldTwinkle: true,
      };
    case 'high':
      // Flagship mobiles (S22 Ultra, iPhone 14 Pro) still run this scene
      // on battery + thermal budget. One notch below ultra is a free win:
      // 128² sphere (17K triangles) is visually indistinguishable from
      // 192² (74K) at typical camera distance, but saves ~55K triangles
      // per frame and a chunk of vertex-shader time.
      return {
        planetSegments: 128,
        renderClouds: true,
        cloudSegments: 48,
        renderAtmosphereBack: true,
        atmosphereSegments: 32,
        renderRing: true,
        ringSegments: 96,
        moonSegments: 24,
        moonsFlatShaded: false,
        starfieldTwinkle: true,
      };
    case 'ultra':
    default:
      // Desktop web — full procedural richness. Reserved headroom for
      // future desktop-only FX (volumetric clouds, SSR, higher bloom).
      return {
        planetSegments: 192,
        renderClouds: true,
        cloudSegments: 64,
        renderAtmosphereBack: true,
        atmosphereSegments: 48,
        renderRing: true,
        ringSegments: 128,
        moonSegments: 32,
        moonsFlatShaded: false,
        starfieldTwinkle: true,
      };
  }
}
