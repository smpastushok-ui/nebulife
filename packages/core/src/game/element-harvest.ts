// ---------------------------------------------------------------------------
// Element harvest — compute proportional element deltas from resource harvests
// ---------------------------------------------------------------------------
// When a player harvests ore/vent/tree on the hex surface, they gain colony
// resources (minerals/volatiles/isotopes). This module distributes those gains
// into proportional chemical elements based on the planet's actual composition.
// ---------------------------------------------------------------------------

import { ELEMENT_GROUP } from '../chemistry/resource-groups.js';
import type { ResourceGroup } from '../chemistry/resource-groups.js';
import type { PlanetResources } from '../chemistry/minerals.js';

/** Resource type → resource group mapping */
const HARVEST_TO_GROUP: Record<string, ResourceGroup> = {
  ore:   'mineral',
  tree:  'isotope',
  vent:  'volatile',
  water: 'volatile',
};

/**
 * Given a harvest of N units of a resource type, split it into
 * proportional element amounts based on planet composition.
 *
 * @param harvestType - 'ore', 'vent', 'tree', 'water'
 * @param amount - colony resource units harvested
 * @param planetResources - planet.resources (contains totalResources.elements)
 * @returns Record<string, number> — element deltas (2 decimal precision)
 */
export function computeHarvestElements(
  harvestType: string,
  amount: number,
  planetResources: PlanetResources,
): Record<string, number> {
  const group = HARVEST_TO_GROUP[harvestType];
  if (!group) return {};

  const planetElements = planetResources.totalResources.elements;

  // Collect elements belonging to this group and their total mass
  const groupElements: [string, number][] = [];
  let groupTotal = 0;
  for (const [sym, mass] of Object.entries(planetElements)) {
    if (ELEMENT_GROUP[sym] === group && mass > 0) {
      groupElements.push([sym, mass]);
      groupTotal += mass;
    }
  }

  if (groupTotal === 0 || groupElements.length === 0) return {};

  // Sort descending by mass for rounding stability
  groupElements.sort((a, b) => b[1] - a[1]);

  // Distribute proportionally (2 decimal precision, floor)
  const result: Record<string, number> = {};
  for (const [sym, mass] of groupElements) {
    const fraction = mass / groupTotal;
    const elementAmount = Math.floor(amount * fraction * 100) / 100;
    if (elementAmount >= 0.01) {
      result[sym] = elementAmount;
    }
  }

  return result;
}
