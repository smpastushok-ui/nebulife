import type { StarSystem, Planet } from '../types/index.js';
import { SeededRNG } from '../math/rng.js';
import { getCatalogEntry } from './cosmic-catalog.js';

// ---------------------------------------------------------------------------
// Prompt Builder — generates Kling AI prompts from game data
// ---------------------------------------------------------------------------

/** Viewing angles / perspectives for variety */
const PERSPECTIVES = [
  'wide-angle deep space view',
  'close-up detailed observation',
  'telescope eyepiece view with slight vignetting',
  'orbital photography from a research vessel',
  'long-exposure astronomical photograph',
  'space telescope ultra-deep field capture',
];

/** Quality suffixes added to every prompt */
const QUALITY_SUFFIX =
  'Photorealistic, NASA Hubble/JWST quality deep space photograph, extremely detailed, high dynamic range, scientifically accurate, professional astrophotography, 8K resolution';

/**
 * Build a complete Kling AI prompt from game state.
 * Includes a SYSTEM CATALOG section with star info, all planets, and moons
 * for maximum context to the AI model.
 *
 * @param objectType  The cosmic object type key from the catalog.
 * @param system      The star system where the discovery was made.
 * @param planet      Optional planet (for surface/orbit discoveries).
 * @param seed        Seed for deterministic variation.
 */
export function buildPrompt(
  objectType: string,
  system: StarSystem,
  planet?: Planet,
  seed: number = 0,
): string {
  const entry = getCatalogEntry(objectType);
  if (!entry) {
    return `A stunning cosmic object in deep space. ${QUALITY_SUFFIX}`;
  }

  const rng = new SeededRNG(seed * 31 + system.seed);
  const parts: string[] = [];

  // 1. Target object from catalog
  parts.push(entry.promptTemplate);

  // 2. System catalog context
  parts.push(buildSystemCatalog(system));

  // 3. Star lighting context
  parts.push(buildStarContext(system, rng));

  // 4. Planet context (if applicable)
  if (planet) {
    parts.push(buildPlanetContext(planet, rng));
  }

  // 5. Random perspective
  const perspective = PERSPECTIVES[rng.nextInt(0, PERSPECTIVES.length - 1)];
  parts.push(perspective);

  // 6. Quality suffix
  parts.push(QUALITY_SUFFIX);

  return parts.join(', ');
}

/**
 * Build a concise SYSTEM CATALOG section with star + planets + moons.
 */
function buildSystemCatalog(system: StarSystem): string {
  const star = system.star;
  const lines: string[] = [];

  // Star summary
  lines.push(`observed from star system ${system.name} with ${star.spectralClass}-class star (${Math.round(star.temperatureK)}K, ${star.luminositySolar.toFixed(2)} L_sun)`);

  // Planet summaries (max 5 for prompt brevity)
  const planets = system.planets.slice(0, 5);
  if (planets.length > 0) {
    const planetDescs = planets.map((p) => {
      const moonCount = p.moons.length;
      const moonStr = moonCount > 0 ? ` with ${moonCount} moon${moonCount > 1 ? 's' : ''}` : '';
      return `${p.name.split(' ').pop()} (${p.type}, ${Math.round(p.surfaceTempK)}K, ${p.orbit.semiMajorAxisAU.toFixed(2)} AU${moonStr})`;
    });
    lines.push(`system contains ${system.planets.length} planets: ${planetDescs.join('; ')}`);
  }

  return lines.join(', ');
}

/**
 * Build a prompt specifically for expedition discoveries (flora, fauna, landscapes).
 */
export function buildExpeditionPrompt(
  category: 'flora' | 'fauna' | 'microbes' | 'landscapes',
  planet: Planet,
  system: StarSystem,
  seed: number = 0,
): string {
  const rng = new SeededRNG(seed * 59 + system.seed * 7);
  const parts: string[] = [];

  const planetDesc = describePlanet(planet);
  const skyColor = deriveSkyColor(planet);
  const gravity = planet.massEarth > 1.5 ? 'high gravity' : planet.massEarth < 0.5 ? 'low gravity' : 'near-Earth gravity';

  switch (category) {
    case 'flora':
      parts.push(`Alien plant life growing on the surface of ${planetDesc}`);
      parts.push(`adapted to ${gravity} and ${describeAtmosphere(planet)}`);
      parts.push(`${skyColor} sky visible`);
      parts.push(rng.next() > 0.5 ? 'bioluminescent vegetation' : 'towering alien trees with exotic structures');
      parts.push('scientifically plausible xenobotany, photorealistic macro photography');
      break;

    case 'fauna':
      parts.push(`An alien creature on ${planetDesc}`);
      parts.push(`evolved for ${gravity} with ${describeAtmosphere(planet)}`);
      parts.push(`${skyColor} sky in the background`);
      parts.push(rng.next() > 0.5 ? 'large megafauna' : 'small agile creature');
      parts.push('scientifically plausible alien biology, wildlife photography style');
      break;

    case 'microbes':
      parts.push(`Microscopic alien life form found on ${planetDesc}`);
      parts.push(`thriving in ${describeAtmosphere(planet)} conditions`);
      parts.push('electron microscope visualization style');
      parts.push(rng.next() > 0.5 ? 'extremophile microorganism' : 'complex multicellular organism');
      parts.push('scientifically accurate microbiology, bioluminescent details');
      break;

    case 'landscapes':
      parts.push(`Alien landscape on the surface of ${planetDesc}`);
      parts.push(`${skyColor} sky`);
      parts.push(describeTerrain(planet, rng));
      parts.push('panoramic vista from an expedition rover, photorealistic');
      break;
  }

  parts.push(QUALITY_SUFFIX);
  return parts.join(', ');
}

// ---------------------------------------------------------------------------
// Context builders
// ---------------------------------------------------------------------------

function buildStarContext(system: StarSystem, rng: SeededRNG): string {
  const star = system.star;
  const parts: string[] = [];

  // Star spectral type influence on lighting
  const spectralClass = star.spectralClass;
  if (spectralClass === 'O' || spectralClass === 'B') {
    parts.push('illuminated by intense blue-white stellar radiation');
  } else if (spectralClass === 'A' || spectralClass === 'F') {
    parts.push('lit by bright white-yellow starlight');
  } else if (spectralClass === 'G') {
    parts.push('under warm Sun-like golden illumination');
  } else if (spectralClass === 'K') {
    parts.push('bathed in warm orange stellar light');
  } else if (spectralClass === 'M') {
    parts.push('under dim red dwarf starlight');
  }

  // Temperature hint
  if (star.temperatureK > 20000) {
    parts.push('extremely hot stellar environment');
  } else if (star.temperatureK < 3500) {
    parts.push('cool stellar environment with long wavelength dominance');
  }

  // Color variation from seed
  if (rng.next() > 0.7) {
    parts.push('subtle nebular background glow');
  }

  return parts.join(', ');
}

function buildPlanetContext(planet: Planet, rng: SeededRNG): string {
  const parts: string[] = [];

  // Surface temperature
  if (planet.surfaceTempK) {
    if (planet.surfaceTempK > 1000) parts.push('scorching hot environment');
    else if (planet.surfaceTempK > 373) parts.push('above boiling point temperatures');
    else if (planet.surfaceTempK > 273) parts.push('temperate conditions with possible liquid water');
    else if (planet.surfaceTempK > 200) parts.push('frigid icy conditions');
    else parts.push('extremely cold cryogenic surface');
  }

  // Atmosphere
  if (planet.atmosphere) {
    const atm = planet.atmosphere;
    if (atm.surfacePressureAtm > 10) parts.push('crushing thick atmosphere');
    else if (atm.surfacePressureAtm < 0.01) parts.push('near-vacuum thin atmosphere');

    const dominant = Object.entries(atm.composition).sort(([, a], [, b]) => b - a)[0];
    if (dominant) {
      const [gas] = dominant;
      if (gas === 'CO2') parts.push('carbon dioxide dominant atmosphere with greenhouse effect');
      else if (gas === 'N2') parts.push('nitrogen-rich atmosphere');
      else if (gas === 'H2') parts.push('hydrogen-rich primordial atmosphere');
    }
  }

  // Water
  if (planet.hydrosphere?.waterCoverageFraction) {
    const w = planet.hydrosphere.waterCoverageFraction;
    if (w > 0.8) parts.push('extensive ocean coverage');
    else if (w > 0.3) parts.push('visible oceans and continents');
    else if (w > 0) parts.push('sparse surface water');
  }

  // Seed variation
  if (rng.next() > 0.6) {
    parts.push('dramatic lighting conditions');
  }

  return parts.join(', ');
}

function describePlanet(planet: Planet): string {
  const parts: string[] = [];
  parts.push(`a ${planet.type} planet`);
  if (planet.radiusEarth > 5) parts.push('of enormous size');
  else if (planet.radiusEarth < 0.5) parts.push('small rocky world');

  if (planet.surfaceTempK) {
    if (planet.surfaceTempK > 500) parts.push(`with surface temperature ${Math.round(planet.surfaceTempK)}K`);
    else if (planet.surfaceTempK < 200) parts.push('with frozen icy surface');
  }

  return parts.join(' ');
}

function describeAtmosphere(planet: Planet): string {
  if (!planet.atmosphere || planet.atmosphere.surfacePressureAtm < 0.001) return 'near-vacuum conditions';

  const dominant = Object.entries(planet.atmosphere.composition).sort(([, a], [, b]) => b - a)[0];
  if (!dominant) return 'thin atmosphere';

  const [gas, fraction] = dominant;
  return `${gas}-dominant atmosphere (${Math.round(fraction * 100)}%) at ${planet.atmosphere.surfacePressureAtm.toFixed(2)} atm`;
}

function deriveSkyColor(planet: Planet): string {
  if (!planet.atmosphere || planet.atmosphere.surfacePressureAtm < 0.01) return 'Black starry';
  const pressure = planet.atmosphere.surfacePressureAtm;
  const dominant = Object.entries(planet.atmosphere.composition).sort(([, a], [, b]) => b - a)[0]?.[0];

  if (dominant === 'CO2' && pressure > 1) return 'Hazy orange-red';
  if (dominant === 'N2' && pressure > 0.5) return 'Blue';
  if (dominant === 'CH4') return 'Pale blue-green';
  if (dominant === 'H2') return 'Deep blue';
  if (pressure > 50) return 'Yellowish murky';
  return 'Pale gray';
}

function describeTerrain(planet: Planet, rng: SeededRNG): string {
  const terrains = [];

  if (planet.type === 'rocky') {
    terrains.push('rocky terrain with craters and canyons');
    terrains.push('vast desert plains with distant mountains');
    terrains.push('volcanic landscape with lava rivers');
    terrains.push('ice-covered surface with crevasses');
  } else if (planet.type === 'gas-giant' || planet.type === 'ice-giant') {
    terrains.push('cloud tops of a gas giant seen from above');
    terrains.push('violent storm system from orbital perspective');
  } else {
    terrains.push('alien terrain with exotic geological features');
  }

  return terrains[rng.nextInt(0, terrains.length - 1)];
}
