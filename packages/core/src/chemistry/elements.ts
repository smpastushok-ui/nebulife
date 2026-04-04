export type ElementCategory = 'metal' | 'nonmetal' | 'metalloid' | 'noble-gas';

export interface Element {
  symbol: string;
  name: string;
  nameUk: string;
  atomicNumber: number;
  atomicMass: number;
  category: ElementCategory;
}

/** All elements relevant for planetary generation (~40 elements) */
export const ELEMENTS: Record<string, Element> = {
  // Light nonmetals & noble gases
  H:  { symbol: 'H',  name: 'Hydrogen',   nameUk: 'Водень',     atomicNumber: 1,  atomicMass: 1.008,   category: 'nonmetal' },
  He: { symbol: 'He', name: 'Helium',     nameUk: 'Гелій',      atomicNumber: 2,  atomicMass: 4.003,   category: 'noble-gas' },
  Li: { symbol: 'Li', name: 'Lithium',    nameUk: 'Літій',      atomicNumber: 3,  atomicMass: 6.941,   category: 'metal' },
  Be: { symbol: 'Be', name: 'Beryllium',  nameUk: 'Берилій',    atomicNumber: 4,  atomicMass: 9.012,   category: 'metal' },
  C:  { symbol: 'C',  name: 'Carbon',     nameUk: 'Вуглець',    atomicNumber: 6,  atomicMass: 12.011,  category: 'nonmetal' },
  N:  { symbol: 'N',  name: 'Nitrogen',   nameUk: 'Азот',       atomicNumber: 7,  atomicMass: 14.007,  category: 'nonmetal' },
  O:  { symbol: 'O',  name: 'Oxygen',     nameUk: 'Кисень',     atomicNumber: 8,  atomicMass: 15.999,  category: 'nonmetal' },
  F:  { symbol: 'F',  name: 'Fluorine',   nameUk: 'Фтор',       atomicNumber: 9,  atomicMass: 18.998,  category: 'nonmetal' },
  Ne: { symbol: 'Ne', name: 'Neon',       nameUk: 'Неон',       atomicNumber: 10, atomicMass: 20.180,  category: 'noble-gas' },
  Na: { symbol: 'Na', name: 'Sodium',     nameUk: 'Натрій',     atomicNumber: 11, atomicMass: 22.990,  category: 'metal' },
  Mg: { symbol: 'Mg', name: 'Magnesium',  nameUk: 'Магній',     atomicNumber: 12, atomicMass: 24.305,  category: 'metal' },
  Al: { symbol: 'Al', name: 'Aluminum',   nameUk: 'Алюміній',   atomicNumber: 13, atomicMass: 26.982,  category: 'metal' },
  Si: { symbol: 'Si', name: 'Silicon',    nameUk: 'Кремній',    atomicNumber: 14, atomicMass: 28.086,  category: 'metalloid' },
  P:  { symbol: 'P',  name: 'Phosphorus', nameUk: 'Фосфор',     atomicNumber: 15, atomicMass: 30.974,  category: 'nonmetal' },
  S:  { symbol: 'S',  name: 'Sulfur',     nameUk: 'Сірка',      atomicNumber: 16, atomicMass: 32.060,  category: 'nonmetal' },
  Cl: { symbol: 'Cl', name: 'Chlorine',   nameUk: 'Хлор',       atomicNumber: 17, atomicMass: 35.450,  category: 'nonmetal' },
  Ar: { symbol: 'Ar', name: 'Argon',      nameUk: 'Аргон',      atomicNumber: 18, atomicMass: 39.948,  category: 'noble-gas' },
  K:  { symbol: 'K',  name: 'Potassium',  nameUk: 'Калій',      atomicNumber: 19, atomicMass: 39.098,  category: 'metal' },
  Ca: { symbol: 'Ca', name: 'Calcium',    nameUk: 'Кальцій',    atomicNumber: 20, atomicMass: 40.078,  category: 'metal' },
  Ti: { symbol: 'Ti', name: 'Titanium',   nameUk: 'Титан',      atomicNumber: 22, atomicMass: 47.867,  category: 'metal' },
  V:  { symbol: 'V',  name: 'Vanadium',   nameUk: 'Ванадій',    atomicNumber: 23, atomicMass: 50.942,  category: 'metal' },
  Cr: { symbol: 'Cr', name: 'Chromium',   nameUk: 'Хром',       atomicNumber: 24, atomicMass: 51.996,  category: 'metal' },
  Mn: { symbol: 'Mn', name: 'Manganese',  nameUk: 'Марганець',  atomicNumber: 25, atomicMass: 54.938,  category: 'metal' },
  Fe: { symbol: 'Fe', name: 'Iron',       nameUk: 'Залізо',     atomicNumber: 26, atomicMass: 55.845,  category: 'metal' },
  Co: { symbol: 'Co', name: 'Cobalt',     nameUk: 'Кобальт',    atomicNumber: 27, atomicMass: 58.933,  category: 'metal' },
  Ni: { symbol: 'Ni', name: 'Nickel',     nameUk: 'Нікель',     atomicNumber: 28, atomicMass: 58.693,  category: 'metal' },
  Cu: { symbol: 'Cu', name: 'Copper',     nameUk: 'Мідь',       atomicNumber: 29, atomicMass: 63.546,  category: 'metal' },
  Zn: { symbol: 'Zn', name: 'Zinc',       nameUk: 'Цинк',       atomicNumber: 30, atomicMass: 65.380,  category: 'metal' },
  Se: { symbol: 'Se', name: 'Selenium',   nameUk: 'Селен',      atomicNumber: 34, atomicMass: 78.971,  category: 'nonmetal' },
  Kr: { symbol: 'Kr', name: 'Krypton',    nameUk: 'Криптон',    atomicNumber: 36, atomicMass: 83.798,  category: 'noble-gas' },
  Sr: { symbol: 'Sr', name: 'Strontium',  nameUk: 'Стронцій',   atomicNumber: 38, atomicMass: 87.620,  category: 'metal' },
  Ag: { symbol: 'Ag', name: 'Silver',     nameUk: 'Срібло',     atomicNumber: 47, atomicMass: 107.87,  category: 'metal' },
  Sn: { symbol: 'Sn', name: 'Tin',        nameUk: 'Олово',      atomicNumber: 50, atomicMass: 118.71,  category: 'metal' },
  Xe: { symbol: 'Xe', name: 'Xenon',      nameUk: 'Ксенон',     atomicNumber: 54, atomicMass: 131.29,  category: 'noble-gas' },
  Ba: { symbol: 'Ba', name: 'Barium',     nameUk: 'Барій',      atomicNumber: 56, atomicMass: 137.33,  category: 'metal' },
  W:  { symbol: 'W',  name: 'Tungsten',   nameUk: 'Вольфрам',   atomicNumber: 74, atomicMass: 183.84,  category: 'metal' },
  Pt: { symbol: 'Pt', name: 'Platinum',   nameUk: 'Платина',    atomicNumber: 78, atomicMass: 195.08,  category: 'metal' },
  Au: { symbol: 'Au', name: 'Gold',       nameUk: 'Золото',     atomicNumber: 79, atomicMass: 196.97,  category: 'metal' },
  Ra: { symbol: 'Ra', name: 'Radium',     nameUk: 'Радій',      atomicNumber: 88, atomicMass: 226.03,  category: 'metal' },
  Th: { symbol: 'Th', name: 'Thorium',    nameUk: 'Торій',      atomicNumber: 90, atomicMass: 232.04,  category: 'metal' },
  U:  { symbol: 'U',  name: 'Uranium',    nameUk: 'Уран',       atomicNumber: 92, atomicMass: 238.029, category: 'metal' },
  Pu: { symbol: 'Pu', name: 'Plutonium',  nameUk: 'Плутоній',   atomicNumber: 94, atomicMass: 244.06,  category: 'metal' },
};

/** Earth crust composition by mass fraction */
export const EARTH_CRUST_COMPOSITION: Record<string, number> = {
  O: 0.460, Si: 0.280, Al: 0.083, Fe: 0.056,
  Ca: 0.042, Na: 0.025, Mg: 0.024, K: 0.020,
  Ti: 0.006, H: 0.001, P: 0.001, Ni: 0.001, Cu: 0.0001,
};

/** Earth bulk composition by mass fraction */
export const EARTH_BULK_COMPOSITION: Record<string, number> = {
  Fe: 0.321, O: 0.301, Si: 0.151, Mg: 0.139,
  S: 0.029, Ni: 0.018, Ca: 0.015, Al: 0.014,
};

/** Earth atmosphere composition by volume fraction */
export const EARTH_ATMOSPHERE: Record<string, number> = {
  N2: 0.7808, O2: 0.2095, Ar: 0.0093, CO2: 0.0004,
};

/** Venus-like atmosphere */
export const VENUS_ATMOSPHERE: Record<string, number> = {
  CO2: 0.965, N2: 0.035,
};

/** Mars-like atmosphere */
export const MARS_ATMOSPHERE: Record<string, number> = {
  CO2: 0.951, N2: 0.027, Ar: 0.016, O2: 0.002,
};

/** Titan-like atmosphere */
export const TITAN_ATMOSPHERE: Record<string, number> = {
  N2: 0.97, CH4: 0.027, H2: 0.001,
};

/**
 * Solar (cosmic) elemental abundance by mass fraction.
 * Used as baseline for gas/ice giant composition.
 * Source: Lodders (2003), Asplund et al. (2009)
 */
export const SOLAR_ABUNDANCE: Record<string, number> = {
  H: 0.7346, He: 0.2485,
  O: 0.0077, C: 0.0029, Ne: 0.0012, Fe: 0.0011,
  N: 0.00069, Si: 0.00065, Mg: 0.00058, S: 0.00044,
  Ar: 0.00015, Ca: 0.00006, Na: 0.00003, Ni: 0.00006,
  Al: 0.00005, Cr: 0.000015, Mn: 0.00001, P: 0.000007,
  Cl: 0.000005, K: 0.000004, Ti: 0.000003, Co: 0.0000025,
  Zn: 0.000002, Cu: 0.0000007, V: 0.0000003, Sr: 0.0000001,
  Ba: 0.00000008, Li: 0.000000006, Se: 0.0000001,
  F: 0.0000004, Kr: 0.00000005, Xe: 0.000000005,
  Sn: 0.0000001, W: 0.000000005, Pt: 0.000000002,
  Au: 0.0000000006, Ag: 0.000000001, Be: 0.000000001,
  Th: 0.0000000004, U: 0.00000000009, Ra: 1e-15, Pu: 1e-18,
};

/**
 * Rocky planet bulk composition — extended from Earth.
 * Includes trace elements. Used as baseline for rocky planet generation.
 * Sum of major elements ≈ 1.0 (trace elements are additional).
 */
export const ROCKY_PLANET_COMPOSITION: Record<string, number> = {
  // Major (from EARTH_BULK_COMPOSITION)
  Fe: 0.321, O: 0.301, Si: 0.151, Mg: 0.139,
  S: 0.029, Ni: 0.018, Ca: 0.015, Al: 0.014,
  // Minor
  Na: 0.002, Cr: 0.005, Mn: 0.003, P: 0.001,
  K: 0.0002, Ti: 0.0008, Co: 0.0009, H: 0.0006,
  C: 0.0007, N: 0.00002, Cl: 0.0002,
  // Trace
  Zn: 0.00004, Cu: 0.00006, V: 0.00009, Li: 0.000002,
  Sr: 0.00001, Ba: 0.000005, F: 0.00002, Se: 0.000003,
  Sn: 0.0000005, W: 0.0000001, Ag: 0.00000005,
  Au: 0.000000005, Pt: 0.00000001, Be: 0.000000003,
  // Radioactive
  U: 0.000000013, Th: 0.00000004, Ra: 1e-13, Pu: 1e-16,
};

/**
 * Ice-rich composition for outer-zone bodies (icy moons, ice giants core).
 * High volatile/ice fraction.
 */
export const ICE_RICH_COMPOSITION: Record<string, number> = {
  O: 0.35, H: 0.10, C: 0.05, N: 0.02,
  Si: 0.10, Fe: 0.12, Mg: 0.09, S: 0.04,
  Ni: 0.008, Ca: 0.008, Al: 0.007, Na: 0.001,
  Cr: 0.002, Mn: 0.001, P: 0.001, K: 0.0001,
  Ti: 0.0003, Co: 0.0003, Cl: 0.001, F: 0.0001,
  Zn: 0.00002, Cu: 0.00003, V: 0.00004,
  U: 0.000000008, Th: 0.00000003,
};
