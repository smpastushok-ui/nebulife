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

function computeAuto(): DeviceTier {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const cores = nav?.hardwareConcurrency ?? 4;
  // `deviceMemory` is non-standard, available on Chrome-family browsers.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reportedMem = (nav as any)?.deviceMemory as number | undefined;
  const native = isCapacitorNative();
  // Safari/Firefox on desktop often omit deviceMemory. Treat strong non-native
  // web machines as high-capability so the exosphere does not fall back to the
  // simplified mid-tier renderer on Mac/desktop browsers.
  const mem = reportedMem ?? (!native && cores >= 8 ? 8 : 4);

  if (cores <= 4 || mem <= 3) return 'low';
  if (cores <= 6 || mem <= 6) return 'mid';
  // Desktop web with lots of cores + RAM → ultra. Capacitor native stays 'high'.
  if (!native && cores >= 8 && mem >= 8) return 'ultra';
  return 'high';
}

// ---------------------------------------------------------------------------
// User override — via first-run PerfTierSelectScreen or later in Settings
// ---------------------------------------------------------------------------
// The auto-detection heuristic is unreliable on modern midrange phones
// because (a) Chrome caps deviceMemory at 8 GB for privacy, and (b) most
// phones now ship with 8 cores regardless of SoC tier. Vivo V21e with a
// Helio G96 gets auto-classified as `high` — wrong.
//
// The override lets the player explicitly pick Simple/Standard/Full at
// first launch. It's stored in localStorage and takes precedence over
// the auto-detected value. Changing the override requires a page reload
// so the cache + <html data-perf-tier> + injected kill-switch CSS all
// resync; mid-session flipping would leave half the scene at the old
// tier's settings.

const OVERRIDE_KEY = 'nebulife_perf_tier';

/** Human-friendly choice that maps onto DeviceTier. */
export type PerfTierChoice = 'simple' | 'standard' | 'full';

function choiceToTier(choice: PerfTierChoice): DeviceTier {
  switch (choice) {
    case 'simple':   return 'low';
    case 'standard': return 'mid';
    case 'full':     return 'high';
  }
}

function readOverride(): DeviceTier | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    if (raw === 'simple' || raw === 'standard' || raw === 'full') {
      return choiceToTier(raw);
    }
  } catch { /* storage unavailable — fall through to auto */ }
  return null;
}

/** Set the user's graphics choice. Caller is responsible for reload. */
export function setPerfTierChoice(choice: PerfTierChoice): void {
  try { localStorage.setItem(OVERRIDE_KEY, choice); }
  catch { /* ignore */ }
}

/** Remove user override (back to auto-detect on next load). */
export function clearPerfTierChoice(): void {
  try { localStorage.removeItem(OVERRIDE_KEY); }
  catch { /* ignore */ }
}

/** What did auto-detect pick? Useful for pre-selecting a card in the
 *  first-run chooser. Ignores any saved override. */
export function getAutoDetectedTier(): DeviceTier {
  return computeAuto();
}

function compute(): DeviceTier {
  return readOverride() ?? computeAuto();
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
  /**
   * Multiplier applied to the starfield particle counts (bg dust, medium,
   * bright, clusters, milky-way). 1.0 = full count; 0.5 = half. Fewer
   * points → smaller BufferGeometry, less vertex-shader work per frame.
   */
  starfieldDensity: number;
  /**
   * Renderer `toneMappingExposure`. Default 1.0. On low/mid we bump it
   * slightly higher so the planet + atmosphere read brighter when we've
   * dropped the bloom pass and cloud/back-atmosphere rim-glow layers.
   */
  toneMappingExposure: number;
  /**
   * Cheap in-surface cloud/haze suggestion used only when the full cloud
   * sphere is disabled. This is a few shader ops inside the planet pass,
   * not an extra transparent mesh, so low/mid get atmosphere depth without
   * the overdraw cost of the full cloud layer.
   */
  inlineCloudVeil: number;
  /** Multiplier for atmosphere shader intensity; no extra geometry. */
  atmosphereIntensityScale: number;
  /** Cheap latitude-stratified atmosphere detail inside the atmosphere pass. */
  atmosphereLayerStrength: number;
  /** Contrast/detail multiplier inside planet shaders; keeps one pass. */
  surfaceDetailBoost: number;
  /**
   * Desktop/high-end shader richness. Kept near zero on low/mid so extra
   * storm/ring/terrain detail branches stay effectively disabled there.
   */
  exosphereQuality: number;
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
        starfieldDensity: 0.4, // 40 % of full → ~280 stars instead of ~700
        // Strong exposure bump — without bloom + clouds + back-atmosphere
        // the custom planet shader's night side read as nearly black on
        // tester tablets. 2.2× is high for desktop but looks correct on
        // low-tier mobile screens (OLED phones gamma-shift everything
        // darker anyway). Bumped 1.8 → 2.2 after tester report "знову
        // планета дуже темна" on the exosphere view.
        toneMappingExposure: 2.2,
        inlineCloudVeil: 0.18,
        atmosphereIntensityScale: 1.35,
        atmosphereLayerStrength: 0.08,
        surfaceDetailBoost: 0.92,
        exosphereQuality: 0.0,
      };
    case 'mid':
      return {
        planetSegments: 96,
        // Clouds dropped on mid too — tester reported mid tablets still
        // heated up. Loses animated cloud band but planet surface + front
        // atmosphere still read as "living world".
        renderClouds: false,
        cloudSegments: 32,
        renderAtmosphereBack: true,
        atmosphereSegments: 24,
        renderRing: true,
        ringSegments: 48,
        moonSegments: 24,
        moonsFlatShaded: false,
        starfieldTwinkle: true,
        starfieldDensity: 0.6, // 60 % of full
        toneMappingExposure: 1.9, // mid tablets still dim, bumped 1.5 → 1.9
        inlineCloudVeil: 0.26,
        atmosphereIntensityScale: 1.18,
        atmosphereLayerStrength: 0.12,
        surfaceDetailBoost: 1.0,
        exosphereQuality: 0.15,
      };
    case 'high':
      // Flagship mobiles (S22 Ultra, iPhone 14 Pro) still run this scene
      // on battery + thermal budget. One notch below ultra is a free win:
      // 128² sphere (17K triangles) is visually indistinguishable from
      // 192² (74K) at typical camera distance, but saves ~55K triangles
      // per frame and a chunk of vertex-shader time.
      return {
        planetSegments: 160,
        renderClouds: true,
        cloudSegments: 56,
        renderAtmosphereBack: true,
        atmosphereSegments: 32,
        renderRing: true,
        ringSegments: 128,
        moonSegments: 24,
        moonsFlatShaded: false,
        starfieldTwinkle: true,
        starfieldDensity: 0.85,
        toneMappingExposure: 1.0,
        inlineCloudVeil: 0.0,
        atmosphereIntensityScale: 1.12,
        atmosphereLayerStrength: 0.22,
        surfaceDetailBoost: 1.12,
        exosphereQuality: 0.85,
      };
    case 'ultra':
    default:
      // Desktop web — full procedural richness. Reserved headroom for
      // future desktop-only FX (volumetric clouds, SSR, higher bloom).
      return {
        planetSegments: 224,
        renderClouds: true,
        cloudSegments: 72,
        renderAtmosphereBack: true,
        atmosphereSegments: 56,
        renderRing: true,
        ringSegments: 160,
        moonSegments: 32,
        moonsFlatShaded: false,
        starfieldTwinkle: true,
        starfieldDensity: 1.0,
        toneMappingExposure: 1.0,
        inlineCloudVeil: 0.0,
        atmosphereIntensityScale: 1.18,
        atmosphereLayerStrength: 0.3,
        surfaceDetailBoost: 1.18,
        exosphereQuality: 1.15,
      };
  }
}
