// ---------------------------------------------------------------------------
// Surface Map Generator — equirectangular projection
// ---------------------------------------------------------------------------
// Generates a 2D tile map of a planet's surface using the SAME noise
// parameters as HomePlanetRenderer (noiseScale=1.8, 5 octaves FBM).
// Deterministic: same planet seed → same map every time.
// ---------------------------------------------------------------------------

import { SimplexNoise } from '../math/noise.js';
import { SeededRNG } from '../math/rng.js';
import type { Planet } from '../types/planet.js';
import type {
  SurfaceMap,
  SurfaceTile,
  TerrainType,
  BiomeType,
  SurfaceResourceDeposit,
} from '../types/surface.js';

// Constants matching HomePlanetRenderer / PlanetVisuals
const NOISE_SCALE = 1.8;
const TERRAIN_OCTAVES = 5;
const MOISTURE_SCALE = 2.5;
const MOISTURE_OCTAVES = 4;
const MAP_WIDTH = 256;
const MAP_HEIGHT = 128;

/** Derive land threshold from water coverage (PlanetVisuals.ts:187) */
function deriveLandThreshold(waterCoverage: number): number {
  return -0.4 + waterCoverage * 0.75;
}

/** Derive ice cap latitude threshold (HomePlanetRenderer.ts:121) */
function deriveIceLatThreshold(iceCapFraction: number): number {
  if (iceCapFraction <= 0) return 1;
  return Math.asin(1 - iceCapFraction) / (Math.PI / 2);
}

/**
 * Classify terrain type from elevation and land threshold.
 */
function classifyTerrain(
  elevation: number,
  landThreshold: number,
  hasOcean: boolean,
  lavaNoise: number,
  hasLava: boolean,
): TerrainType {
  if (hasLava && lavaNoise > 0.2) {
    return 'volcano';
  }

  if (hasOcean) {
    if (elevation < landThreshold - 0.3) return 'deep_ocean';
    if (elevation < landThreshold - 0.08) return 'ocean';
    if (elevation < landThreshold) return 'coast';
  }

  // Land
  const h = hasOcean ? elevation - landThreshold : elevation + 0.5;

  if (h < 0.02) return 'beach';
  if (h < 0.1) return 'lowland';
  if (h < 0.25) return 'plains';
  if (h < 0.35) return 'hills';
  if (h < 0.5) return 'mountains';
  return 'peaks';
}

/**
 * Classify biome from latitude, moisture, elevation.
 * Mirrors sampleBiomeColor() logic from HomePlanetRenderer.
 */
function classifyBiome(
  latitude: number,       // 0..1 (absolute)
  elevation: number,      // relative to land threshold
  moisture: number,       // noise value
  terrain: TerrainType,
  iceLatThreshold: number,
  hasLife: boolean,
): BiomeType {
  // Ice caps
  if (latitude > iceLatThreshold) return 'ice';

  // Volcanic terrain
  if (terrain === 'volcano') return 'volcanic';

  // Water tiles don't have a land biome per se
  if (terrain === 'deep_ocean' || terrain === 'ocean' || terrain === 'coast') {
    return latitude > 0.78 ? 'ice' : 'temperate_forest'; // placeholder for water
  }

  if (!hasLife) {
    // Barren planets: desert everywhere with some tundra at poles
    if (latitude > 0.7) return 'tundra';
    return 'desert';
  }

  // High elevation → mountains override biome
  if (elevation > 0.35) {
    return latitude > 0.55 ? 'tundra' : 'grassland';
  }

  // --- Tropical zone (0..0.25) ---
  if (latitude < 0.25) {
    if (moisture > 0.1) return 'tropical_forest';
    if (moisture > -0.15) return 'savanna';
    return 'desert';
  }

  // --- Temperate zone (0.25..0.55) ---
  if (latitude < 0.55) {
    if (moisture > 0.05) return 'temperate_forest';
    if (moisture > -0.1) return 'grassland';
    return 'desert';
  }

  // --- Boreal / sub-polar (0.55..0.78) ---
  if (latitude < 0.78) {
    if (moisture > 0) return 'boreal_forest';
    return 'tundra';
  }

  // --- Polar ---
  return 'tundra';
}

/**
 * Generate the full 256×128 surface map from planet parameters.
 * Uses the same noise sampling as HomePlanetRenderer for consistency.
 */
export function generateSurfaceMap(planet: Planet): SurfaceMap {
  const seed = planet.seed;
  const noise = new SimplexNoise(seed);
  const moistureNoise = new SimplexNoise(seed + 333);

  const waterCoverage = planet.hydrosphere?.waterCoverageFraction ?? 0;
  const hasOcean = waterCoverage > 0.01;
  const landThreshold = hasOcean ? deriveLandThreshold(waterCoverage) : -1;
  const iceCapFraction = planet.hydrosphere?.iceCapFraction ?? 0;
  const iceLatThreshold = deriveIceLatThreshold(iceCapFraction);
  const hasLava = planet.surfaceTempK > 1200 && (planet.type === 'rocky' || planet.type === 'dwarf');
  const hasLife = planet.hasLife;

  const tiles: SurfaceTile[] = new Array(MAP_WIDTH * MAP_HEIGHT);

  for (let y = 0; y < MAP_HEIGHT; y++) {
    // Latitude: y=0 → south pole, y=height-1 → north pole
    const latRad = ((y / (MAP_HEIGHT - 1)) * Math.PI) - (Math.PI / 2); // -PI/2 to PI/2
    const cosLat = Math.cos(latRad);
    const sinLat = Math.sin(latRad);
    const absLatitude = Math.abs(latRad) / (Math.PI / 2); // 0..1

    for (let x = 0; x < MAP_WIDTH; x++) {
      const lonRad = (x / MAP_WIDTH) * 2 * Math.PI; // 0 to 2*PI

      // Sphere coordinates (same as HomePlanetRenderer orthographic but unwrapped)
      const sx = cosLat * Math.cos(lonRad);
      const sy = sinLat;
      const sz = cosLat * Math.sin(lonRad);

      // Elevation (same params as HomePlanetRenderer line 141)
      const elevation = noise.fbm3D(
        sx * NOISE_SCALE,
        sy * NOISE_SCALE,
        sz * NOISE_SCALE,
        TERRAIN_OCTAVES,
      );

      // Moisture (same params as HomePlanetRenderer line 142)
      const moisture = moistureNoise.fbm3D(
        sx * MOISTURE_SCALE,
        sy * MOISTURE_SCALE,
        sz * MOISTURE_SCALE,
        MOISTURE_OCTAVES,
      );

      // Lava noise for volcanic terrain
      const lavaVal = hasLava
        ? noise.fbm3D(sx * 5, sy * 5, sz * 5, 4)
        : -1;

      // Terrain classification
      const terrain = classifyTerrain(elevation, landThreshold, hasOcean, lavaVal, hasLava);

      // Relative elevation for biome (land only)
      const relElevation = hasOcean ? elevation - landThreshold : elevation + 0.5;

      // Biome classification
      const biome = classifyBiome(
        absLatitude, relElevation, moisture,
        terrain, iceLatThreshold, hasLife,
      );

      // Buildable flags
      const isLand = terrain === 'beach' || terrain === 'lowland' ||
        terrain === 'plains' || terrain === 'hills';
      const isWaterEdge = terrain === 'coast' || terrain === 'ocean';
      const isIce = biome === 'ice';

      tiles[y * MAP_WIDTH + x] = {
        terrain,
        biome,
        elevation,
        moisture,
        latitude: absLatitude,
        buildable: isLand && !isIce,
        waterBuildable: isWaterEdge && !isIce,
      };
    }
  }

  return {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    tiles,
    planetId: planet.id,
    seed,
  };
}

/**
 * Generate resource deposits scattered across land tiles.
 * Uses planet's existing resources.deposits for what elements exist.
 */
export function generateResourceDeposits(
  map: SurfaceMap,
  planet: Planet,
): SurfaceResourceDeposit[] {
  const rng = new SeededRNG(map.seed + 9999);
  const deposits: SurfaceResourceDeposit[] = [];

  // Get existing deposits from planet generation
  const planetDeposits = planet.resources.deposits;
  if (planetDeposits.length === 0) return deposits;

  // Collect all buildable land tile indices
  const landTiles: { x: number; y: number }[] = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.tiles[y * map.width + x];
      if (tile.buildable) {
        landTiles.push({ x, y });
      }
    }
  }

  if (landTiles.length === 0) return deposits;

  // Place 3-8 deposits per mineral type that exists on this planet
  for (const pd of planetDeposits) {
    const count = rng.nextInt(3, 8);
    for (let i = 0; i < count; i++) {
      const pos = rng.pick(landTiles);
      deposits.push({
        id: `dep_${pd.element}_${i}_${pos.x}_${pos.y}`,
        x: pos.x,
        y: pos.y,
        element: pd.element,
        abundance: pd.abundanceRelative * rng.nextFloat(0.3, 1.0),
        depth: pd.depth,
      });
    }
  }

  return deposits;
}
