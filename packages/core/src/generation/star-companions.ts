import { SPECTRAL_CLASS_WEIGHTS, STELLAR_CLASSES, type SpectralClass } from '../constants/stellar.js';
import { SeededRNG } from '../math/rng.js';
import { luminositySolar } from '../physics/index.js';
import type { Star, StarCompanion, StellarMultiplicity } from '../types/star.js';

const SPECTRAL_CLASSES_ORDERED: SpectralClass[] = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];
const SPECTRAL_WEIGHTS = SPECTRAL_CLASSES_ORDERED.map(c => SPECTRAL_CLASS_WEIGHTS[c]);

const MULTIPLICITY_CHANCE: Record<SpectralClass, number> = {
  O: 0.85,
  B: 0.75,
  A: 0.55,
  F: 0.45,
  G: 0.38,
  K: 0.30,
  M: 0.22,
};

function pickCompanionClass(primaryClass: SpectralClass, rng: SeededRNG): SpectralClass {
  const primaryIndex = SPECTRAL_CLASSES_ORDERED.indexOf(primaryClass);
  const roll = rng.next();
  if (roll < 0.62) {
    return SPECTRAL_CLASSES_ORDERED[Math.min(SPECTRAL_CLASSES_ORDERED.length - 1, primaryIndex + rng.nextInt(0, 2))];
  }
  if (roll < 0.88) {
    return SPECTRAL_CLASSES_ORDERED[Math.min(SPECTRAL_CLASSES_ORDERED.length - 1, primaryIndex + rng.nextInt(2, 4))];
  }
  return rng.weightedChoice(SPECTRAL_CLASSES_ORDERED, SPECTRAL_WEIGHTS);
}

function companionOrbit(rng: SeededRNG, primary: Star): Pick<StarCompanion, 'orbitType' | 'separationAU' | 'periodYears'> {
  const roll = rng.next();
  const orbitType: StarCompanion['orbitType'] = roll < 0.18 ? 'close' : roll < 0.42 ? 'circumbinary' : 'wide';
  const separationAU = orbitType === 'close'
    ? rng.nextFloat(0.04, 0.7)
    : orbitType === 'circumbinary'
      ? rng.nextFloat(0.7, 8)
      : rng.nextFloat(25, 350);
  const totalMass = Math.max(0.1, primary.massSolar);
  const periodYears = Math.sqrt(Math.pow(separationAU, 3) / totalMass);
  return {
    orbitType,
    separationAU: Math.round(separationAU * 100) / 100,
    periodYears: Math.round(periodYears * 100) / 100,
  };
}

export function generateStarCompanions(seed: number, primary: Star): StarCompanion[] {
  const rng = new SeededRNG(seed);
  if (!rng.nextBool(MULTIPLICITY_CHANCE[primary.spectralClass] ?? 0.3)) return [];

  const count = rng.nextBool(primary.spectralClass === 'O' || primary.spectralClass === 'B' ? 0.22 : 0.06) ? 2 : 1;
  const companions: StarCompanion[] = [];

  for (let i = 0; i < count; i++) {
    const companionRng = rng.child(100 + i);
    const spectralClass = pickCompanionClass(primary.spectralClass, companionRng);
    const entries = STELLAR_CLASSES.filter((entry) => entry.spectralClass === spectralClass);
    const entry = companionRng.pick(entries);
    const tempK = Math.round(entry.tempK * companionRng.nextFloat(0.96, 1.04));
    const massSolar = Math.min(primary.massSolar * companionRng.nextFloat(0.12, 0.95), entry.massSolar * companionRng.nextFloat(0.9, 1.05));
    const radiusSolar = Math.max(0.08, entry.radiusSolar * companionRng.nextFloat(0.88, 1.08));
    const lum = luminositySolar(radiusSolar, tempK);
    const orbit = companionOrbit(companionRng, primary);
    companions.push({
      id: `${primary.id}-companion-${i + 1}`,
      role: i === 0 ? 'secondary' : 'tertiary',
      spectralClass,
      subType: entry.subType,
      temperatureK: tempK,
      massSolar: Math.round(massSolar * 1000) / 1000,
      radiusSolar: Math.round(radiusSolar * 1000) / 1000,
      luminositySolar: Math.round(lum * 10000) / 10000,
      colorHex: entry.colorHex,
      ...orbit,
    });
  }

  return companions;
}

export function getStellarMultiplicity(companions?: StarCompanion[]): StellarMultiplicity {
  const count = companions?.length ?? 0;
  if (count === 0) return 'single';
  if (count === 1) return 'binary';
  return 'triple';
}
