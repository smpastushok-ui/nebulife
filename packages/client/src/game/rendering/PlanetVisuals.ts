import type { Planet, PlanetType } from '@nebulife/core';
import type { Star } from '@nebulife/core';
import * as THREE from 'three';

/**
 * Star sprite position in the 3D globe scene.
 * Shared between PlanetGlobeView and PlanetDetailWindow so that
 * the star visual position matches the lighting direction (uStarDir).
 */
export const STAR_SPRITE_POSITION = new THREE.Vector3(-8, 6, -15);

export interface BiomeColors {
  tropical: number;
  temperate: number;
  boreal: number;
  desert: number;
  tundra: number;
}

export interface PlanetVisualConfig {
  // Surface
  surfaceBaseColor: number;
  surfaceHighColor: number;
  hasBiomes: boolean;
  biomeColors: BiomeColors;
  landThreshold: number;        // noise threshold: below = water, above = land

  // Ocean
  hasOcean: boolean;
  oceanShallow: number;
  oceanDeep: number;
  waterCoverage: number;        // 0..1

  // Ice
  iceCapFraction: number;       // 0..1

  // Atmosphere
  hasAtmosphere: boolean;
  atmosColor: number;
  atmosOpacity: number;         // 0..0.3
  atmosRingCount: number;
  limbColor: number;

  // Clouds
  hasSignificantClouds: boolean;
  cloudDensity: number;         // 0..1
  cloudColor: number;           // tint based on atmosphere composition

  // Lighting
  starTint: number;

  // Special
  hasLavaFlows: boolean;
  lavaColor: number;
  hasRivers: boolean;
  isGasGiant: boolean;
  isIceGiant: boolean;

  // Surface-level rendering (top-down view)
  volcanism: number;       // 0..1 continuous volcanism intensity
  windIntensity: number;   // 0..1 atmospheric wind strength
  surfaceType: number;     // 0=temperate, 1=gas, 2=ice, 3=lava, 4=barren

  // Gas giant specifics
  bandColor1: number;
  bandColor2: number;
}

/** Linearly interpolate between two colors */
export function lerpColor(c1: number, c2: number, t: number): number {
  const t1 = Math.max(0, Math.min(1, t));
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
  const r = Math.round(r1 + (r2 - r1) * t1);
  const g = Math.round(g1 + (g2 - g1) * t1);
  const b = Math.round(b1 + (b2 - b1) * t1);
  return (r << 16) | (g << 8) | b;
}

/** Clamp value to [min, max] */
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Convert hex color string to number */
function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/** Find dominant gas in atmosphere composition */
function getDominantGas(composition: Record<string, number>): string {
  let maxGas = '';
  let maxFraction = 0;
  for (const [gas, fraction] of Object.entries(composition)) {
    if (fraction > maxFraction) {
      maxFraction = fraction;
      maxGas = gas;
    }
  }
  return maxGas;
}

/** Derive atmosphere color from composition */
function deriveAtmosColor(composition: Record<string, number>): number {
  const o2 = composition['O2'] ?? 0;
  const co2 = composition['CO2'] ?? 0;
  const ch4 = composition['CH4'] ?? 0;
  const h2 = composition['H2'] ?? 0;

  // N2 + O2 → Rayleigh scattering blue (Earth-like)
  if (o2 > 0.1) return 0x4488ff;
  // CO2-dominant → orange-yellow (Venus-like)
  if (co2 > 0.5) return 0xddaa44;
  // CH4 present → brown-orange (Titan-like)
  if (ch4 > 0.1) return 0x886644;
  // H2-dominant → pale blue (gas giant)
  if (h2 > 0.5) return 0x8899cc;
  // N2 alone or other → gray-blue
  return 0x667788;
}

/** Derive atmosphere opacity from surface pressure */
function deriveAtmosOpacity(pressureAtm: number): number {
  if (pressureAtm > 50) return 0.25;
  if (pressureAtm >= 1) return 0.04 + (pressureAtm - 1) / 49 * 0.11;
  if (pressureAtm >= 0.1) return 0.01 + (pressureAtm - 0.1) / 0.9 * 0.03;
  return 0.005;
}

/** Derive surface base color from temperature (for rocky/dwarf planets without life) */
function deriveSurfaceBaseColor(tempK: number): number {
  if (tempK > 1200) return 0x1a0a00;    // lava world
  if (tempK > 600) return 0xaa5533;      // hot Venus-like
  if (tempK > 373) return 0xbb9966;      // warm desert
  if (tempK > 273) return 0x887766;      // temperate rock
  if (tempK > 200) return 0x6699bb;      // cold frosted — blue-gray
  if (tempK > 120) return 0x6699cc;      // frozen — clear blue
  return 0x7aaddd;                        // deeply frozen — icy blue
}

/** Derive surface high elevation color */
function deriveSurfaceHighColor(tempK: number): number {
  if (tempK > 1200) return 0x331500;
  if (tempK > 600) return 0x664433;
  if (tempK > 373) return 0x8a7755;
  if (tempK > 273) return 0x6a5a4a;
  if (tempK > 200) return 0x5588aa;      // cold frosted peaks — blue
  if (tempK > 120) return 0x5588bb;      // frozen blue peaks
  return 0x6699cc;                        // deeply frozen blue peaks
}

/** Derive ocean colors from depth */
function deriveOceanColors(depthKm: number, tempK: number): { shallow: number; deep: number } {
  if (tempK > 373) {
    // Super-hot water → murky / boiling
    return { shallow: 0x4a3a2a, deep: 0x2a1a0a };
  }
  if (tempK < 200) {
    // Frozen — subsurface ocean is dark
    return { shallow: 0x3a4a6a, deep: 0x1a2a4a };
  }
  // Normal liquid water
  const depthFactor = clamp(depthKm / 10, 0, 1);
  const shallow = lerpColor(0x2a6a8a, 0x1a4a7a, depthFactor);
  const deep = lerpColor(0x1a3a5a, 0x0a1a3a, depthFactor);
  return { shallow, deep };
}

/** Derive biome colors based on temperature and life complexity */
function deriveBiomeColors(tempK: number, lifeComplexity: string): BiomeColors {
  if (lifeComplexity === 'intelligent' || lifeComplexity === 'multicellular') {
    // Full biomes
    return {
      tropical: 0x1a6a2a,    // deep green
      temperate: 0x2a6a2a,   // forest green
      boreal: 0x3a5a2a,      // dark green
      desert: 0xc4a55a,      // sandy
      tundra: 0x5a6a4a,      // muted green-brown
    };
  }
  if (lifeComplexity === 'unicellular') {
    // Subtle green tint
    return {
      tropical: 0x4a7a4a,
      temperate: 0x5a7a5a,
      boreal: 0x5a6a4a,
      desert: 0xaa9a6a,
      tundra: 0x6a6a5a,
    };
  }
  // microbial / moss — very subtle
  return {
    tropical: 0x6a7a5a,
    temperate: 0x6a7a5a,
    boreal: 0x6a6a5a,
    desert: 0x9a8a6a,
    tundra: 0x6a6a5a,
  };
}

/** Derive land threshold from water coverage fraction.
 *  Higher water coverage → higher threshold (more land submerged) */
function deriveLandThreshold(waterCoverage: number): number {
  // Earth: waterCoverage=0.71, noise threshold ~0.05
  // Maps 0..1 water coverage to -0.4..0.35 threshold
  // At 0 water, threshold is very low (almost everything is land)
  // At 1 water, threshold is very high (everything submerged)
  return -0.4 + waterCoverage * 0.75;
}

/** Derive cloud color from atmosphere composition */
function deriveCloudColor(composition: Record<string, number>): number {
  const o2 = composition['O2'] ?? 0;
  const co2 = composition['CO2'] ?? 0;
  const ch4 = composition['CH4'] ?? 0;
  const h2 = composition['H2'] ?? 0;

  // Earth-like (O2 present) → white with slight blue tint
  if (o2 > 0.1) return 0xeef4ff;
  // Venus-like (CO2 dominant) → yellowish
  if (co2 > 0.5) return 0xeeddaa;
  // Titan-like (CH4 present) → brownish-orange haze
  if (ch4 > 0.1) return 0xccaa88;
  // H2 dominant → gray-blue
  if (h2 > 0.5) return 0xccddee;
  // Default → grayish-white
  return 0xdde0e4;
}

/** Derive gas giant band colors from temperature */
function deriveGasGiantColors(tempK: number): { c1: number; c2: number } {
  if (tempK > 1000) {
    // Hot Jupiter — deep reds / oranges
    return { c1: 0xcc5522, c2: 0x883311 };
  }
  if (tempK > 400) {
    // Warm — orange / tan
    return { c1: 0xcc9955, c2: 0x886633 };
  }
  // Cold — brown / tan (Saturn-like)
  return { c1: 0xaa8855, c2: 0x665533 };
}

/** Derive ice giant visual config */
function deriveIceGiantColors(tempK: number): { c1: number; c2: number } {
  if (tempK > 200) {
    return { c1: 0x5588aa, c2: 0x336688 };
  }
  // Very cold — deep blue (Neptune-like)
  return { c1: 0x3366aa, c2: 0x224488 };
}

/**
 * Derive all visual parameters for a planet from its physical properties.
 * This is the core data-driven mapping: Planet params → visual config.
 */
export function derivePlanetVisuals(planet: Planet, star: Star): PlanetVisualConfig {
  const tempK = planet.surfaceTempK;
  const atmo = planet.atmosphere;
  const hydro = planet.hydrosphere;
  const isGas = planet.type === 'gas-giant';
  const isIce = planet.type === 'ice-giant';

  // Star tint
  const starTint = hexToNum(star.colorHex);

  // --- Atmosphere ---
  const hasAtmosphere = atmo !== null;
  const atmosColor = hasAtmosphere ? deriveAtmosColor(atmo.composition) : 0x667788;
  const atmosOpacity = hasAtmosphere ? deriveAtmosOpacity(atmo.surfacePressureAtm) : 0;
  const atmosRingCount = hasAtmosphere ? (atmo.surfacePressureAtm > 1 ? 10 : atmo.surfacePressureAtm > 0.1 ? 6 : 3) : 0;
  const limbColor = hasAtmosphere ? lerpColor(atmosColor, 0xffffff, 0.3) : 0x667788;

  // --- Ocean ---
  const waterCoverage = hydro?.waterCoverageFraction ?? 0;
  const hasOcean = waterCoverage > 0.01 && !isGas && !isIce;
  const oceanDepth = hydro?.oceanDepthKm ?? 0;
  const oceanColors = deriveOceanColors(oceanDepth, tempK);

  // --- Ice ---
  const iceCapFraction = hydro?.iceCapFraction ?? (tempK < 250 ? clamp((250 - tempK) / 200, 0.1, 0.8) : 0);

  // --- Surface ---
  const surfaceBaseColor = deriveSurfaceBaseColor(tempK);
  const surfaceHighColor = deriveSurfaceHighColor(tempK);

  // --- Biomes (only for planets with life) ---
  const hasBiomes = planet.hasLife && (planet.type === 'rocky' || planet.type === 'dwarf');
  const biomeColors = hasBiomes
    ? deriveBiomeColors(tempK, planet.lifeComplexity)
    : { tropical: surfaceBaseColor, temperate: surfaceBaseColor, boreal: surfaceBaseColor, desert: surfaceBaseColor, tundra: surfaceBaseColor };

  // --- Land threshold ---
  const landThreshold = hasOcean ? deriveLandThreshold(waterCoverage) : -1; // -1 = no ocean, all land

  // --- Clouds ---
  const hasSignificantClouds = hasAtmosphere && atmo.surfacePressureAtm > 0.1
    && (waterCoverage > 0 || isGas || isIce);
  const cloudDensity = hasSignificantClouds
    ? (isGas || isIce)
      ? 0.6  // Gas/ice giants have thick cloud bands
      : clamp(Math.sqrt(atmo.surfacePressureAtm) * waterCoverage * 1.2, 0, 1)
    : 0;
  const cloudColor = hasAtmosphere ? deriveCloudColor(atmo.composition) : 0xdde0e4;

  // --- Special ---
  const hasLavaFlows = tempK > 1200 && (planet.type === 'rocky' || planet.type === 'dwarf');

  // Rivers: liquid water planets with both land and ocean
  const hasRivers = hasOcean && waterCoverage > 0.1 && waterCoverage < 0.95
    && tempK > 273 && tempK < 373;

  // --- Volcanism (continuous 0-1) ---
  const crust = planet.resources?.crustComposition ?? {};
  const sAbund = clamp((crust['S'] ?? 0) / 0.05, 0, 1);
  let volcanism = tempK > 600 ? clamp((tempK - 600) / 1000, 0.05, 1.0) : 0;
  volcanism = Math.min(volcanism + sAbund * 0.15, 1.0);

  // --- Wind intensity ---
  const windIntensity = hasAtmosphere ? clamp(atmo.surfacePressureAtm / 2.0, 0, 1) : 0;

  // --- Surface type classification (for top-down surface shader) ---
  let surfaceType = 0; // 0=temperate (default)
  if (isGas) surfaceType = 1;
  else if (isIce) surfaceType = 2;
  else if (tempK > 800) surfaceType = 3;                                 // lava world
  else if (tempK < 180) surfaceType = 2;                                 // ice world (cold rocky)
  else if (!planet.hasLife && waterCoverage < 0.05) surfaceType = 4;     // barren

  // --- Gas/Ice giant ---
  const gasColors = isGas ? deriveGasGiantColors(tempK) : { c1: 0, c2: 0 };
  const iceColors = isIce ? deriveIceGiantColors(tempK) : { c1: 0, c2: 0 };

  return {
    surfaceBaseColor,
    surfaceHighColor,
    hasBiomes,
    biomeColors,
    landThreshold,

    hasOcean,
    oceanShallow: oceanColors.shallow,
    oceanDeep: oceanColors.deep,
    waterCoverage,

    iceCapFraction,

    hasAtmosphere,
    atmosColor,
    atmosOpacity,
    atmosRingCount,
    limbColor,

    hasSignificantClouds,
    cloudDensity,
    cloudColor,

    starTint,

    hasLavaFlows,
    lavaColor: 0xff4400,
    hasRivers,
    isGasGiant: isGas,
    isIceGiant: isIce,

    volcanism,
    windIntensity,
    surfaceType,

    bandColor1: isGas ? gasColors.c1 : iceColors.c1,
    bandColor2: isGas ? gasColors.c2 : iceColors.c2,
  };
}

// ---------------------------------------------------------------------------
// Three.js uniform helpers
// ---------------------------------------------------------------------------

/** Convert 0xRRGGBB integer color to THREE.Color */
function numToColor(c: number): THREE.Color {
  return new THREE.Color(
    ((c >> 16) & 0xff) / 255,
    ((c >> 8) & 0xff) / 255,
    (c & 0xff) / 255,
  );
}

/** Atmosphere parameters for Three.js rendering */
export interface AtmosphereParams {
  color: THREE.Color;
  intensity: number;
  power: number;
  scale: number;
}

/** Get atmosphere shader parameters from planet data (ported from Planet3DViewer) */
export function getAtmosphereParams(
  atmo: { composition: Record<string, number>; surfacePressureAtm: number },
  planetType: string,
): AtmosphereParams | null {
  if (atmo.surfacePressureAtm < 0.01) return null;
  const comp = atmo.composition;
  const pressure = atmo.surfacePressureAtm;

  if (planetType === 'gas-giant') {
    return { color: new THREE.Color(0.85, 0.75, 0.55), intensity: 0.5, power: 2.5, scale: 1.08 };
  }
  if (planetType === 'ice-giant') {
    return { color: new THREE.Color(0.4, 0.75, 0.9), intensity: 0.5, power: 2.5, scale: 1.07 };
  }
  if ((comp['CO2'] ?? 0) > 0.4) {
    return {
      color: new THREE.Color(0.9, 0.6, 0.3),
      intensity: Math.min(0.55, 0.25 + pressure * 0.06),
      power: 2.5,
      scale: 1.07 + Math.min(pressure * 0.008, 0.06),
    };
  }
  if ((comp['N2'] ?? 0) > 0.5 || (comp['O2'] ?? 0) > 0.1) {
    return {
      color: new THREE.Color(0.4, 0.65, 1.0),
      intensity: Math.min(0.5, 0.20 + pressure * 0.12),
      power: 4.0,
      scale: 1.06 + Math.min(pressure * 0.012, 0.06),
    };
  }
  if ((comp['H2'] ?? 0) > 0.3 || (comp['He'] ?? 0) > 0.2) {
    return { color: new THREE.Color(0.8, 0.85, 1.0), intensity: 0.45, power: 2.5, scale: 1.07 };
  }
  return {
    color: new THREE.Color(0.5, 0.6, 0.8),
    intensity: Math.min(0.4, 0.20 + pressure * 0.12),
    power: 3.5,
    scale: 1.06,
  };
}

/** Cloud parameters for Three.js rendering */
export interface CloudParams {
  color: THREE.Color;
  coverage: number;
  scale: number;
}

/** Get cloud shader parameters from planet data (ported from Planet3DViewer) */
export function getCloudParams(
  atmo: { surfacePressureAtm: number; composition: Record<string, number> },
  planetType: string,
): CloudParams | null {
  if (planetType === 'gas-giant') {
    return { color: new THREE.Color(0.95, 0.9, 0.8), coverage: 0.7, scale: 1.02 };
  }
  if (planetType === 'ice-giant') {
    return { color: new THREE.Color(0.85, 0.9, 0.95), coverage: 0.6, scale: 1.02 };
  }
  const pressure = atmo.surfacePressureAtm;
  if (pressure < 0.1) return null;

  if ((atmo.composition['CO2'] ?? 0) > 0.4 && pressure > 1) {
    return {
      color: new THREE.Color(0.95, 0.85, 0.65),
      coverage: Math.min(0.8, pressure * 0.1),
      scale: 1.015,
    };
  }
  if ((atmo.composition['N2'] ?? 0) > 0.5 || (atmo.composition['O2'] ?? 0) > 0.1) {
    return {
      color: new THREE.Color(1.0, 1.0, 1.0),
      coverage: Math.min(0.35, 0.12 + pressure * 0.1),
      scale: 1.008,
    };
  }
  return {
    color: new THREE.Color(0.9, 0.9, 0.95),
    coverage: Math.min(0.3, pressure * 0.1),
    scale: 1.01,
  };
}

/** Moon color palette by composition type */
export function getMoonColors(compositionType: string, surfaceTempK: number): { base: THREE.Color; high: THREE.Color } {
  switch (compositionType) {
    case 'icy':
      return { base: new THREE.Color(0.65, 0.72, 0.80), high: new THREE.Color(0.85, 0.90, 0.95) };
    case 'metallic':
      return { base: new THREE.Color(0.45, 0.42, 0.38), high: new THREE.Color(0.60, 0.58, 0.55) };
    case 'volcanic':
      return { base: new THREE.Color(0.35, 0.20, 0.12), high: new THREE.Color(0.65, 0.35, 0.15) };
    case 'rocky':
    default:
      if (surfaceTempK > 400) {
        return { base: new THREE.Color(0.50, 0.38, 0.28), high: new THREE.Color(0.65, 0.50, 0.35) };
      }
      return { base: new THREE.Color(0.45, 0.42, 0.40), high: new THREE.Color(0.60, 0.58, 0.55) };
  }
}

/**
 * Convert PlanetVisualConfig + Planet physics → Three.js shader uniforms.
 * This is the bridge between planet generation and GPU rendering.
 */
export function planetVisualsToUniforms(
  visuals: PlanetVisualConfig,
  planet: Planet,
  star: Star,
): Record<string, THREE.IUniform> {
  // Compute star direction (normalized, pointing from planet toward star)
  // Matches the star sprite position used in PlanetGlobeView/PlanetDetailWindow
  const starDir = STAR_SPRITE_POSITION.clone().normalize();

  // Resource abundances (crust composition fractions, normalized to [0..1] importance)
  const crust = planet.resources?.crustComposition ?? {};
  const feAbundance = clamp((crust['Fe'] ?? 0.056) / 0.1, 0, 1);  // Earth ~0.056
  const siAbundance = clamp((crust['Si'] ?? 0.28) / 0.5, 0, 1);   // Earth ~0.28
  const cAbundance = clamp((crust['C'] ?? 0) / 0.05, 0, 1);       // Usually trace in crust
  const sAbundance = clamp((crust['S'] ?? 0) / 0.05, 0, 1);       // Usually trace in crust

  // Star light intensity from luminosity
  const distAU = planet.orbit?.semiMajorAxisAU ?? 1;
  const starIntensity = clamp(Math.pow(star.luminositySolar, 0.25) / Math.sqrt(distAU), 0.3, 2.0);

  const base: Record<string, THREE.IUniform> = {
    uSeed: { value: planet.seed },
    uSurfaceBase: { value: numToColor(visuals.surfaceBaseColor) },
    uSurfaceHigh: { value: numToColor(visuals.surfaceHighColor) },
    uLandThreshold: { value: visuals.landThreshold },
    uHasOcean: { value: visuals.hasOcean ? 1.0 : 0.0 },
    uOceanShallow: { value: numToColor(visuals.oceanShallow) },
    uOceanDeep: { value: numToColor(visuals.oceanDeep) },
    uWaterCoverage: { value: visuals.waterCoverage },
    uIceCapFraction: { value: visuals.iceCapFraction },
    uHasBiomes: { value: visuals.hasBiomes ? 1.0 : 0.0 },
    uBiomeTropical: { value: numToColor(visuals.biomeColors.tropical) },
    uBiomeTemperate: { value: numToColor(visuals.biomeColors.temperate) },
    uBiomeBoreal: { value: numToColor(visuals.biomeColors.boreal) },
    uBiomeDesert: { value: numToColor(visuals.biomeColors.desert) },
    uBiomeTundra: { value: numToColor(visuals.biomeColors.tundra) },
    uHasLava: { value: visuals.hasLavaFlows ? 1.0 : 0.0 },
    uHasCityLights: { value: planet.lifeComplexity === 'intelligent' && planet.hasLife ? 1.0 : 0.0 },
    uStarDir: { value: starDir },
    uStarColor: { value: numToColor(visuals.starTint) },
    uStarIntensity: { value: starIntensity },
    uTime: { value: 0.0 },
    uAlbedo: { value: planet.albedo ?? 0.3 },
    uSurfaceTempK: { value: planet.surfaceTempK },
    uHasRivers: { value: visuals.hasRivers ? 1.0 : 0.0 },
    uVolc: { value: visuals.volcanism },
    uWind: { value: visuals.windIntensity },
    uType: { value: visuals.surfaceType },

    // Resource/geology uniforms
    uFeAbundance: { value: feAbundance },
    uSiAbundance: { value: siAbundance },
    uCAbundance: { value: cAbundance },
    uSAbundance: { value: sAbundance },
    uDensity: { value: planet.densityGCm3 ?? 5.5 },
    uGravity: { value: planet.surfaceGravityG ?? 1.0 },
    uMagneticStrength: { value: clamp((planet.magneticField?.strengthT ?? 0) / 5e-5, 0, 2) }, // Normalize to Earth ~5e-5 T

    // Gas giant specifics
    uBandColor1: { value: numToColor(visuals.bandColor1) },
    uBandColor2: { value: numToColor(visuals.bandColor2) },
    uIsGasGiant: { value: visuals.isGasGiant ? 1.0 : 0.0 },
    uBandCount: { value: visuals.isGasGiant ? 14.0 : 10.0 },
  };

  return base;
}
