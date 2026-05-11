import type { SpectralClass } from '../constants/stellar.js';
import type { HabitableZone } from '../physics/habitable-zone.js';

export interface Star {
  id: string;
  seed: number;
  name: string;
  spectralClass: SpectralClass;
  subType: number;               // 0-9
  temperatureK: number;
  massSolar: number;
  radiusSolar: number;
  luminositySolar: number;
  ageGyr: number;                // Age in billions of years
  colorHex: string;
  habitableZone: HabitableZone;
}

export type StellarMultiplicity = 'single' | 'binary' | 'triple';

export interface StarCompanion {
  id: string;
  role: 'secondary' | 'tertiary';
  spectralClass: SpectralClass;
  subType: number;
  temperatureK: number;
  massSolar: number;
  radiusSolar: number;
  luminositySolar: number;
  colorHex: string;
  /** close/circumbinary are metadata-only in the MVP; planets still orbit the primary. */
  orbitType: 'close' | 'wide' | 'circumbinary';
  separationAU: number;
  periodYears: number;
}
