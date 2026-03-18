// ---------------------------------------------------------------------------
// Resource Group Classification — maps each element to mineral/volatile/isotope
// ---------------------------------------------------------------------------

export type ResourceGroup = 'mineral' | 'volatile' | 'isotope';

/** Every element maps to exactly one resource group */
export const ELEMENT_GROUP: Record<string, ResourceGroup> = {
  // Minerals — solid extractable metals, metalloids, rock-forming elements
  Fe: 'mineral', Al: 'mineral', Si: 'mineral', Ti: 'mineral',
  Cu: 'mineral', Ni: 'mineral', Zn: 'mineral', Mg: 'mineral',
  Ca: 'mineral', Na: 'mineral', K: 'mineral',  Cr: 'mineral',
  Mn: 'mineral', Co: 'mineral', W: 'mineral',  Au: 'mineral',
  Ag: 'mineral', Pt: 'mineral', Li: 'mineral', Be: 'mineral',
  V: 'mineral',  Ba: 'mineral', Sr: 'mineral', Sn: 'mineral',

  // Volatiles — gases, ices, light nonmetals
  H: 'volatile',  He: 'volatile', C: 'volatile',  N: 'volatile',
  O: 'volatile',  S: 'volatile',  P: 'volatile',  Ar: 'volatile',
  Ne: 'volatile', Kr: 'volatile', Xe: 'volatile', Cl: 'volatile',
  F: 'volatile',  Se: 'volatile',

  // Isotopes — radioactive/energy elements
  U: 'isotope', Th: 'isotope', Pu: 'isotope', Ra: 'isotope',
};

/** Ukrainian display names for resource groups */
export const GROUP_NAMES: Record<ResourceGroup, string> = {
  mineral: 'Мінерали',
  volatile: 'Леткі речовини',
  isotope: 'Ізотопи',
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
