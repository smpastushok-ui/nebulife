export type SpectralClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';

export interface StellarClassData {
  spectralClass: SpectralClass;
  subType: number;
  tempK: number;
  massSolar: number;
  radiusSolar: number;
  luminositySolar: number;
  colorHex: string;
  lifetimeGyr: number;  // Main-sequence lifetime in billions of years
}

/**
 * Main-sequence stellar classification data (OBAFGKM)
 * Sorted from hottest to coolest.
 * Source: UNLV Physics spectral type table, supplemented with standard astrophysics data.
 */
export const STELLAR_CLASSES: StellarClassData[] = [
  { spectralClass: 'O', subType: 5, tempK: 40000, massSolar: 40,    radiusSolar: 17.8,  luminositySolar: 501000,  colorHex: '#9bb0ff', lifetimeGyr: 0.001  },
  { spectralClass: 'B', subType: 0, tempK: 28000, massSolar: 18,    radiusSolar: 7.4,   luminositySolar: 20000,   colorHex: '#aabfff', lifetimeGyr: 0.01   },
  { spectralClass: 'B', subType: 5, tempK: 15000, massSolar: 6.4,   radiusSolar: 3.8,   luminositySolar: 790,     colorHex: '#cad7ff', lifetimeGyr: 0.1    },
  { spectralClass: 'A', subType: 0, tempK: 9900,  massSolar: 3.2,   radiusSolar: 2.5,   luminositySolar: 79,      colorHex: '#f8f7ff', lifetimeGyr: 0.4    },
  { spectralClass: 'A', subType: 5, tempK: 8500,  massSolar: 2.1,   radiusSolar: 1.7,   luminositySolar: 20,      colorHex: '#fff4ea', lifetimeGyr: 1.0    },
  { spectralClass: 'F', subType: 0, tempK: 7400,  massSolar: 1.7,   radiusSolar: 1.4,   luminositySolar: 6.3,     colorHex: '#fff2e0', lifetimeGyr: 2.0    },
  { spectralClass: 'F', subType: 5, tempK: 6600,  massSolar: 1.3,   radiusSolar: 1.2,   luminositySolar: 2.5,     colorHex: '#fff4e8', lifetimeGyr: 4.0    },
  { spectralClass: 'G', subType: 0, tempK: 6000,  massSolar: 1.1,   radiusSolar: 1.05,  luminositySolar: 1.3,     colorHex: '#fff9f0', lifetimeGyr: 8.0    },
  { spectralClass: 'G', subType: 2, tempK: 5778,  massSolar: 1.0,   radiusSolar: 1.0,   luminositySolar: 1.0,     colorHex: '#fff5e3', lifetimeGyr: 10.0   }, // Sun
  { spectralClass: 'G', subType: 5, tempK: 5500,  massSolar: 0.93,  radiusSolar: 0.92,  luminositySolar: 0.79,    colorHex: '#fff1d8', lifetimeGyr: 12.0   },
  { spectralClass: 'K', subType: 0, tempK: 4900,  massSolar: 0.82,  radiusSolar: 0.81,  luminositySolar: 0.40,    colorHex: '#ffd2a1', lifetimeGyr: 17.0   },
  { spectralClass: 'K', subType: 5, tempK: 4100,  massSolar: 0.68,  radiusSolar: 0.68,  luminositySolar: 0.16,    colorHex: '#ffcc8f', lifetimeGyr: 25.0   },
  { spectralClass: 'M', subType: 0, tempK: 3500,  massSolar: 0.47,  radiusSolar: 0.51,  luminositySolar: 0.063,   colorHex: '#ffbd80', lifetimeGyr: 60.0   },
  { spectralClass: 'M', subType: 2, tempK: 3200,  massSolar: 0.35,  radiusSolar: 0.37,  luminositySolar: 0.025,   colorHex: '#ffb575', lifetimeGyr: 80.0   },
  { spectralClass: 'M', subType: 5, tempK: 2800,  massSolar: 0.20,  radiusSolar: 0.25,  luminositySolar: 0.008,   colorHex: '#ffb070', lifetimeGyr: 100.0  },
  { spectralClass: 'M', subType: 8, tempK: 2400,  massSolar: 0.10,  radiusSolar: 0.12,  luminositySolar: 0.001,   colorHex: '#ffa060', lifetimeGyr: 200.0  },
];

/**
 * Relative abundance of spectral classes in the Milky Way (by number).
 * M stars dominate (~76%). Used for weighted random selection.
 */
export const SPECTRAL_CLASS_WEIGHTS: Record<SpectralClass, number> = {
  O: 0.00003,
  B: 0.13,
  A: 0.6,
  F: 3.0,
  G: 7.6,
  K: 12.1,
  M: 76.45,
};
