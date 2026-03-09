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
