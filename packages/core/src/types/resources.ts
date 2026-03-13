// ---------------------------------------------------------------------------
// Resource System Types
// ---------------------------------------------------------------------------

/** Global resources available across all game phases */
export interface GlobalResources {
  quarks: number;          // premium currency (1 quark = 1 UAH), persisted in DB
  researchData: number;    // consumable charges for research scans
}

/** Colony-specific physical resources (available after colonization, Phase 2) */
export interface ColonyResources {
  minerals: number;   // solid materials
  volatiles: number;  // gases and liquids
  isotopes: number;   // energy
}

/** Inventory of chemical elements, e.g. { Fe: 100, U: 5 } (Phase 3) */
export type ChemicalInventory = Record<string, number>;

/** Extended player profile with full resource system */
export interface PlayerProfile {
  id: string;
  name: string;
  level: number;            // 1-99
  xp: number;
  globalResources: GlobalResources;
  colonyResources?: ColonyResources;       // undefined until colony established
  chemicalInventory?: ChemicalInventory;   // unlocked at level 50
  isExodusPhase: boolean;                  // true while on doomed planet, false after colony
}
