export type ElementCategory = 'metal' | 'nonmetal' | 'metalloid' | 'noble-gas';

export interface Element {
  symbol: string;
  name: string;
  atomicNumber: number;
  atomicMass: number;
  category: ElementCategory;
}

/** Relevant elements for planetary generation */
export const ELEMENTS: Record<string, Element> = {
  H:  { symbol: 'H',  name: 'Hydrogen',   atomicNumber: 1,  atomicMass: 1.008,   category: 'nonmetal' },
  He: { symbol: 'He', name: 'Helium',     atomicNumber: 2,  atomicMass: 4.003,   category: 'noble-gas' },
  C:  { symbol: 'C',  name: 'Carbon',     atomicNumber: 6,  atomicMass: 12.011,  category: 'nonmetal' },
  N:  { symbol: 'N',  name: 'Nitrogen',   atomicNumber: 7,  atomicMass: 14.007,  category: 'nonmetal' },
  O:  { symbol: 'O',  name: 'Oxygen',     atomicNumber: 8,  atomicMass: 15.999,  category: 'nonmetal' },
  Na: { symbol: 'Na', name: 'Sodium',     atomicNumber: 11, atomicMass: 22.990,  category: 'metal' },
  Mg: { symbol: 'Mg', name: 'Magnesium',  atomicNumber: 12, atomicMass: 24.305,  category: 'metal' },
  Al: { symbol: 'Al', name: 'Aluminum',   atomicNumber: 13, atomicMass: 26.982,  category: 'metal' },
  Si: { symbol: 'Si', name: 'Silicon',    atomicNumber: 14, atomicMass: 28.086,  category: 'metalloid' },
  P:  { symbol: 'P',  name: 'Phosphorus', atomicNumber: 15, atomicMass: 30.974,  category: 'nonmetal' },
  S:  { symbol: 'S',  name: 'Sulfur',     atomicNumber: 16, atomicMass: 32.060,  category: 'nonmetal' },
  Ar: { symbol: 'Ar', name: 'Argon',      atomicNumber: 18, atomicMass: 39.948,  category: 'noble-gas' },
  K:  { symbol: 'K',  name: 'Potassium',  atomicNumber: 19, atomicMass: 39.098,  category: 'metal' },
  Ca: { symbol: 'Ca', name: 'Calcium',    atomicNumber: 20, atomicMass: 40.078,  category: 'metal' },
  Ti: { symbol: 'Ti', name: 'Titanium',   atomicNumber: 22, atomicMass: 47.867,  category: 'metal' },
  Fe: { symbol: 'Fe', name: 'Iron',       atomicNumber: 26, atomicMass: 55.845,  category: 'metal' },
  Ni: { symbol: 'Ni', name: 'Nickel',     atomicNumber: 28, atomicMass: 58.693,  category: 'metal' },
  Cu: { symbol: 'Cu', name: 'Copper',     atomicNumber: 29, atomicMass: 63.546,  category: 'metal' },
  Zn: { symbol: 'Zn', name: 'Zinc',       atomicNumber: 30, atomicMass: 65.380,  category: 'metal' },
  U:  { symbol: 'U',  name: 'Uranium',    atomicNumber: 92, atomicMass: 238.029, category: 'metal' },
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
