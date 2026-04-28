// ---------------------------------------------------------------------------
// Resource Group Classification — maps each element to mineral/volatile/isotope
// ---------------------------------------------------------------------------
//
// Ontology rationale (v169 fix):
//   minerals  — solid, rock-forming compounds. O is classified here because
//               in rocky planets virtually all O is bound in silicates/oxides
//               (SiO₂, MgO, FeO, Al₂O₃, etc.) and counts toward the solid
//               extractable mineral budget, NOT free atmospheric O₂.
//   volatiles — atmospheric gases, ices, organic light elements.
//               Free O₂ in atmospheres is tracked separately via Atmosphere
//               composition; the bulk-planet O fraction belongs to minerals.
//   isotopes  — radioactive / fissile elements used as energy budget.
//               Raw crustal abundances are extremely small (~ppb), so
//               STOCK_SCALE applies a large gameplay multiplier to make the
//               isotope pool playable (see planet-stocks.ts).
// ---------------------------------------------------------------------------

export type ResourceGroup = 'mineral' | 'volatile' | 'isotope';

/** Every element maps to exactly one resource group */
export const ELEMENT_GROUP: Record<string, ResourceGroup> = {
  // Minerals — solid extractable metals, metalloids, rock-forming elements.
  // O is included here: in rocky planets it is almost entirely bound oxygen
  // in silicates/oxides (SiO₂, MgO, FeO…), not free atmospheric O₂.
  Fe: 'mineral', Al: 'mineral', Si: 'mineral', Ti: 'mineral',
  Cu: 'mineral', Ni: 'mineral', Zn: 'mineral', Mg: 'mineral',
  Ca: 'mineral', Na: 'mineral', K: 'mineral',  Cr: 'mineral',
  Mn: 'mineral', Co: 'mineral', W: 'mineral',  Au: 'mineral',
  Ag: 'mineral', Pt: 'mineral', Li: 'mineral', Be: 'mineral',
  V: 'mineral',  Ba: 'mineral', Sr: 'mineral', Sn: 'mineral',
  O: 'mineral',  // bound oxygen in silicates/oxides (NOT free atmospheric O₂)

  // Volatiles — atmospheric gases, ices, light organic compounds.
  // S is included as volcanic/atmospheric volatile gas.
  H: 'volatile',  He: 'volatile', C: 'volatile',  N: 'volatile',
  S: 'volatile',  P: 'volatile',  Ar: 'volatile',
  Ne: 'volatile', Kr: 'volatile', Xe: 'volatile', Cl: 'volatile',
  F: 'volatile',  Se: 'volatile',

  // Isotopes — radioactive/energy elements (gameplay category).
  // Crustal abundances are in ppb range; STOCK_SCALE provides a large
  // gameplay multiplier so the pool is meaningful for colony progression.
  U: 'isotope', Th: 'isotope', Pu: 'isotope', Ra: 'isotope',
};

/** English display names for resource groups (i18n-translated in UI components) */
export const GROUP_NAMES: Record<ResourceGroup, string> = {
  mineral: 'Minerals',
  volatile: 'Volatiles',
  isotope:  'Isotopes',
};

/** Group accent colors — consistent with ResourceDisplay HUD */
export const GROUP_COLORS: Record<ResourceGroup, string> = {
  mineral: '#aa8855',
  volatile: '#55aaaa',
  isotope: '#88aa44',
};

/** Resource groups in display order */
export const RESOURCE_GROUPS: ResourceGroup[] = ['mineral', 'volatile', 'isotope'];

/** Compute group totals from an element inventory (kg) */
export function computeGroupTotals(
  elements: Record<string, number>,
): Record<ResourceGroup, number> {
  const totals: Record<ResourceGroup, number> = { mineral: 0, volatile: 0, isotope: 0 };
  for (const [sym, mass] of Object.entries(elements)) {
    const group = ELEMENT_GROUP[sym];
    if (group) totals[group] += mass;
  }
  return totals;
}

/** Get sorted elements for a group from an inventory, descending by mass */
export function getGroupElements(
  elements: Record<string, number>,
  group: ResourceGroup,
): [string, number][] {
  return Object.entries(elements)
    .filter(([sym, mass]) => ELEMENT_GROUP[sym] === group && mass > 0)
    .sort((a, b) => b[1] - a[1]);
}
