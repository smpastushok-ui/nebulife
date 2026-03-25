// ---------------------------------------------------------------------------
// Planet building rules — what can be built where, terrain bonuses
// ---------------------------------------------------------------------------

import type { Planet, PlanetType } from '../types/planet.js';
import type { BuildingType, BuildingDef, TerrainType } from '../types/surface.js';
import { BUILDING_DEFS } from '../types/surface.js';
import { MAX_BUILDINGS_PER_PLANET } from '../constants/balance.js';
import type { TechTreeState } from './tech-tree.js';
import { ALL_NODES } from './tech-tree.js';

// ---------------------------------------------------------------------------
// Planet type constraints
// ---------------------------------------------------------------------------

/** Buildings allowed per planet type (overrides BuildingDef.allowedPlanetTypes). */
const GAS_GIANT_ALLOWED: BuildingType[] = [
  'orbital_collector', 'orbital_telescope', 'landing_pad',
];

const ICE_GIANT_ALLOWED: BuildingType[] = [
  'orbital_collector', 'orbital_telescope', 'landing_pad', 'thermal_generator',
];

/** Check whether a planet has atmosphere (simplified heuristic). */
export function planetHasAtmosphere(planet: Planet): boolean {
  return planet.atmosphere !== null && planet.atmosphere.surfacePressureAtm > 0.01;
}

// ---------------------------------------------------------------------------
// Building availability checks
// ---------------------------------------------------------------------------

export interface BuildingAvailability {
  available: boolean;
  reason?: string;
}

/**
 * Can the player build `buildingType` on `planet`?
 * Checks planet type, atmosphere, tech, level, and max count.
 */
export function canBuildOnPlanet(
  buildingType: BuildingType,
  planet: Planet,
  playerLevel: number,
  techState: TechTreeState,
  existingBuildingCounts: Record<string, number>,
): BuildingAvailability {
  const def = BUILDING_DEFS[buildingType];

  // 1. Player level
  if (playerLevel < def.levelRequired) {
    return { available: false, reason: `Потрібен рівень ${def.levelRequired}` };
  }

  // 2. Tech requirement
  if (def.techRequired && !techState.researched[def.techRequired]) {
    const node = ALL_NODES.find(n => n.id === def.techRequired);
    const techName = node?.name ?? def.techRequired;
    return { available: false, reason: `Потрібна технологія: ${techName}` };
  }

  // 3. Planet type restriction
  if (!def.allowedPlanetTypes.includes(planet.type)) {
    return { available: false, reason: `Не доступна на ${getPlanetTypeLabel(planet.type)}` };
  }

  // 4. Gas giant / ice giant hard-list
  if (planet.type === 'gas-giant' && !GAS_GIANT_ALLOWED.includes(buildingType)) {
    return { available: false, reason: 'Газовий гігант: лише орбітальні будівлі' };
  }
  if (planet.type === 'ice-giant' && !ICE_GIANT_ALLOWED.includes(buildingType)) {
    return { available: false, reason: 'Крижаний гігант: обмежений набір будівель' };
  }

  // 5. Atmosphere requirement
  if (def.requiresAtmosphere && !planetHasAtmosphere(planet)) {
    return { available: false, reason: 'Потрібна атмосфера' };
  }

  // 6. Max per planet
  const currentCount = existingBuildingCounts[buildingType] ?? 0;
  if (def.maxPerPlanet > 0 && currentCount >= def.maxPerPlanet) {
    return { available: false, reason: `Ліміт: ${def.maxPerPlanet} на планету` };
  }

  // 7. Total building cap per planet type
  const totalBuildings = Object.values(existingBuildingCounts).reduce((s, n) => s + n, 0);
  const cap = MAX_BUILDINGS_PER_PLANET[planet.type as keyof typeof MAX_BUILDINGS_PER_PLANET] ?? 40;
  if (totalBuildings >= cap) {
    return { available: false, reason: `Ліміт будівель на планеті: ${cap}` };
  }

  // 8. Spaceport requires landing_pad
  if (buildingType === 'spaceport' && !(existingBuildingCounts['landing_pad'] ?? 0)) {
    return { available: false, reason: 'Потрібен посадковий майданчик' };
  }

  return { available: true };
}

/**
 * Returns the list of BuildingType values the player can currently build on this planet.
 */
export function getAvailableBuildings(
  planet: Planet,
  playerLevel: number,
  techState: TechTreeState,
  existingBuildingCounts: Record<string, number>,
): BuildingType[] {
  const allTypes = Object.keys(BUILDING_DEFS) as BuildingType[];
  return allTypes.filter(bt =>
    canBuildOnPlanet(bt, planet, playerLevel, techState, existingBuildingCounts).available,
  );
}

// ---------------------------------------------------------------------------
// Terrain bonuses
// ---------------------------------------------------------------------------

export interface TerrainBonus {
  label: string;
  multiplier: number;
}

/**
 * Returns terrain-based production bonus for a building placed on `terrain`.
 * Multiplier > 1 = bonus, < 1 = penalty, 1 = neutral.
 */
export function getTerrainBonus(buildingType: BuildingType, terrain: TerrainType): TerrainBonus {
  switch (buildingType) {
    case 'solar_plant':
      if (terrain === 'plains' || terrain === 'lowland') return { label: 'Рівнина +20%', multiplier: 1.20 };
      break;
    case 'thermal_generator':
      if (terrain === 'volcano') return { label: 'Вулкан +100%', multiplier: 2.0 };
      break;
    case 'observatory':
      if (terrain === 'mountains' || terrain === 'peaks') return { label: 'Гори +10%', multiplier: 1.10 };
      break;
    case 'water_extractor':
      if (terrain === 'coast') return { label: 'Узбережжя +50%', multiplier: 1.50 };
      break;
    case 'mine':
      if (terrain === 'hills' || terrain === 'mountains') return { label: 'Підвищення +15%', multiplier: 1.15 };
      break;
  }
  return { label: '', multiplier: 1.0 };
}

// ---------------------------------------------------------------------------
// Stellar distance energy scaling
// ---------------------------------------------------------------------------

/**
 * Solar energy multiplier based on star luminosity and orbital distance.
 * Base energy output is calibrated for 1 L_sun at 1 AU.
 */
export function getSolarEnergyMultiplier(starLuminosityLSun: number, orbitalDistanceAU: number): number {
  if (orbitalDistanceAU <= 0) return 0;
  return starLuminosityLSun / (orbitalDistanceAU * orbitalDistanceAU);
}

/**
 * Wind generator multiplier based on atmosphere pressure.
 */
export function getWindMultiplier(atmospherePressureAtm: number): number {
  // Linear scaling: 1 atm = 1.0, 2 atm = 1.5, 0.5 atm = 0.75
  return Math.max(0.25, 0.5 + 0.5 * atmospherePressureAtm);
}

/**
 * Atmo extractor multiplier based on atmosphere pressure.
 */
export function getAtmoMultiplier(atmospherePressureAtm: number): number {
  return Math.max(0.1, atmospherePressureAtm);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPlanetTypeLabel(type: PlanetType): string {
  switch (type) {
    case 'rocky': return 'скелястій планеті';
    case 'terrestrial': return 'планеті земного типу';
    case 'dwarf': return 'карликовій планеті';
    case 'gas-giant': return 'газовому гіганті';
    case 'ice-giant': return 'крижаному гіганті';
  }
}
