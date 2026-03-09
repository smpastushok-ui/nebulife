import { SeededRNG } from '../math/rng.js';
import { STELLAR_CLASSES, SPECTRAL_CLASS_WEIGHTS, type SpectralClass, type StellarClassData } from '../constants/stellar.js';
import { luminositySolar, habitableZoneAU } from '../physics/index.js';
import { lerp } from '../math/distributions.js';
import type { Star } from '../types/star.js';

// Pre-compute arrays for weighted selection
const SPECTRAL_CLASSES_ORDERED: SpectralClass[] = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];
const SPECTRAL_WEIGHTS = SPECTRAL_CLASSES_ORDERED.map(c => SPECTRAL_CLASS_WEIGHTS[c]);

/** Get all entries for a given spectral class */
function getClassEntries(spectralClass: SpectralClass): StellarClassData[] {
  return STELLAR_CLASSES.filter(s => s.spectralClass === spectralClass);
}

/** Interpolate between two stellar class entries */
function interpolateStellarData(a: StellarClassData, b: StellarClassData, t: number): Omit<StellarClassData, 'spectralClass'> {
  return {
    subType: Math.round(lerp(a.subType, b.subType, t)),
    tempK: Math.round(lerp(a.tempK, b.tempK, t)),
    massSolar: lerp(a.massSolar, b.massSolar, t),
    radiusSolar: lerp(a.radiusSolar, b.radiusSolar, t),
    luminositySolar: lerp(a.luminositySolar, b.luminositySolar, t),
    colorHex: t < 0.5 ? a.colorHex : b.colorHex,
    lifetimeGyr: lerp(a.lifetimeGyr, b.lifetimeGyr, t),
  };
}

/** Generate a star name from seed */
function generateStarName(rng: SeededRNG): string {
  const prefixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega'];
  const suffixes = ['Centauri', 'Eridani', 'Cygni', 'Draconis', 'Orionis', 'Lyrae', 'Aquilae', 'Tauri', 'Pegasi', 'Andromedae', 'Cassiopeiae', 'Leonis', 'Virginis', 'Scorpii', 'Sagittarii', 'Capricorni', 'Piscium', 'Arietis'];

  return `${rng.pick(prefixes)} ${rng.pick(suffixes)}`;
}

/**
 * Generate a star from a seed.
 *
 * Process:
 * 1. Weighted random spectral class selection (M stars most common)
 * 2. Random sub-type within class
 * 3. Interpolate physical properties from classification table
 * 4. Calculate habitable zone
 */
export function generateStar(seed: number): Star {
  const rng = new SeededRNG(seed);

  // 1. Select spectral class (weighted by galactic abundance)
  const spectralClass = rng.weightedChoice(SPECTRAL_CLASSES_ORDERED, SPECTRAL_WEIGHTS);

  // 2. Get class entries and interpolate
  const entries = getClassEntries(spectralClass);
  let data: Omit<StellarClassData, 'spectralClass'>;

  if (entries.length === 1) {
    data = { ...entries[0] };
    // Add small random variation
    data.tempK = Math.round(data.tempK * rng.nextFloat(0.95, 1.05));
    data.massSolar *= rng.nextFloat(0.95, 1.05);
    data.radiusSolar *= rng.nextFloat(0.95, 1.05);
  } else {
    // Pick random position along the sub-type range
    const t = rng.next();
    const idx = Math.floor(t * (entries.length - 1));
    const localT = (t * (entries.length - 1)) - idx;
    const entryA = entries[Math.min(idx, entries.length - 1)];
    const entryB = entries[Math.min(idx + 1, entries.length - 1)];
    data = interpolateStellarData(entryA, entryB, localT);

    // Small random variation
    data.tempK = Math.round(data.tempK * rng.nextFloat(0.97, 1.03));
    data.massSolar *= rng.nextFloat(0.97, 1.03);
    data.radiusSolar *= rng.nextFloat(0.97, 1.03);
  }

  // Recalculate luminosity from mass and temperature (for consistency)
  const lum = luminositySolar(data.radiusSolar, data.tempK);

  // Star age: fraction of its lifetime
  const maxAge = data.lifetimeGyr;
  const ageGyr = rng.nextFloat(0.5, Math.min(maxAge * 0.9, 13.8)); // Max universe age ~13.8 Gyr

  // Calculate habitable zone
  const hz = habitableZoneAU(lum, data.tempK);

  return {
    id: `star-${seed}`,
    seed,
    name: generateStarName(rng),
    spectralClass,
    subType: data.subType,
    temperatureK: data.tempK,
    massSolar: Math.round(data.massSolar * 1000) / 1000,
    radiusSolar: Math.round(data.radiusSolar * 1000) / 1000,
    luminositySolar: Math.round(lum * 10000) / 10000,
    ageGyr: Math.round(ageGyr * 100) / 100,
    colorHex: data.colorHex,
    habitableZone: hz,
  };
}
