import type { MoonComposition, Planet } from '@nebulife/core';

export type SystemPlanetTextureId =
  | 'acid_cloud_world_surface'
  | 'ammonia_cold'
  | 'carbon_world'
  | 'desert_arid'
  | 'dwarf_icy_rocky'
  | 'frozen_ice'
  | 'hot_desert'
  | 'iron_rich'
  | 'lava_volcanic'
  | 'methane_lakes'
  | 'rocky_airless_cratered'
  | 'rocky_barren'
  | 'rocky_dark_basalalt'
  | 'rocky_red_iron'
  | 'salt_flat'
  | 'silicate_cratered'
  | 'temperate_desert'
  | 'terran_archipelago'
  | 'terran_continental'
  | 'terran_ice_ocean'
  | 'terran_ocean'
  | 'toxic_greenhouse'
  | 'volcanic_ash';

const BASE_PATH = '/planet-textures/system';

export const SYSTEM_PLANET_TEXTURES: Record<SystemPlanetTextureId, string> = {
  acid_cloud_world_surface: `${BASE_PATH}/acid_cloud_world_surface.webp`,
  ammonia_cold: `${BASE_PATH}/ammonia_cold.webp`,
  carbon_world: `${BASE_PATH}/carbon_world.webp`,
  desert_arid: `${BASE_PATH}/desert_arid.webp`,
  dwarf_icy_rocky: `${BASE_PATH}/dwarf_icy_rocky.webp`,
  frozen_ice: `${BASE_PATH}/frozen_ice.webp`,
  hot_desert: `${BASE_PATH}/hot_desert.webp`,
  iron_rich: `${BASE_PATH}/iron_rich.webp`,
  lava_volcanic: `${BASE_PATH}/lava_volcanic.webp`,
  methane_lakes: `${BASE_PATH}/methane_lakes.webp`,
  rocky_airless_cratered: `${BASE_PATH}/rocky_airless_cratered.webp`,
  rocky_barren: `${BASE_PATH}/rocky_barren.webp`,
  rocky_dark_basalalt: `${BASE_PATH}/rocky_dark_basalalt.webp`,
  rocky_red_iron: `${BASE_PATH}/rocky_red_iron.webp`,
  salt_flat: `${BASE_PATH}/salt_flat.webp`,
  silicate_cratered: `${BASE_PATH}/silicate_cratered.webp`,
  temperate_desert: `${BASE_PATH}/temperate_desert.webp`,
  terran_archipelago: `${BASE_PATH}/terran_archipelago.webp`,
  terran_continental: `${BASE_PATH}/terran_continental.webp`,
  terran_ice_ocean: `${BASE_PATH}/terran_ice_ocean.webp`,
  terran_ocean: `${BASE_PATH}/terran_ocean.webp`,
  toxic_greenhouse: `${BASE_PATH}/toxic_greenhouse.webp`,
  volcanic_ash: `${BASE_PATH}/volcanic_ash.webp`,
};

function pickBySeed<T>(seed: number, options: readonly T[]): T {
  return options[Math.abs(seed) % options.length];
}

function crustFraction(planet: Planet, symbol: string): number {
  return planet.resources?.crustComposition?.[symbol] ?? 0;
}

export function getSystemPlanetTextureId(planet: Planet): SystemPlanetTextureId | null {
  // Gas/ice giants keep the procedural band shader in system view until we add
  // dedicated banded 2:1 catalog textures for them.
  if (planet.type === 'gas-giant' || planet.type === 'ice-giant') return null;

  const tempK = planet.surfaceTempK;
  const water = planet.hydrosphere?.waterCoverageFraction ?? 0;
  const ice = planet.hydrosphere?.iceCapFraction ?? 0;
  const pressure = planet.atmosphere?.surfacePressureAtm ?? 0;
  const co2 = planet.atmosphere?.composition?.CO2 ?? 0;
  const ch4 = planet.atmosphere?.composition?.CH4 ?? 0;
  const fe = crustFraction(planet, 'Fe');
  const si = crustFraction(planet, 'Si');
  const c = crustFraction(planet, 'C');
  const s = crustFraction(planet, 'S');

  if (tempK > 1150) return 'lava_volcanic';
  if (tempK > 760 || s > 0.055) return pickBySeed(planet.seed, ['lava_volcanic', 'volcanic_ash'] as const);
  if (co2 > 0.45 && pressure > 2) return tempK > 360 ? 'toxic_greenhouse' : 'acid_cloud_world_surface';
  if (ch4 > 0.08 && tempK < 230) return 'methane_lakes';

  if (water > 0.65) {
    if (tempK < 255 || ice > 0.28) return 'terran_ice_ocean';
    return water > 0.82 ? 'terran_ocean' : 'terran_archipelago';
  }
  if (water > 0.25) {
    if (tempK < 255 || ice > 0.22) return 'terran_ice_ocean';
    return planet.hasLife ? 'terran_continental' : 'terran_archipelago';
  }

  if (tempK < 170) return 'ammonia_cold';
  if (tempK < 235 || ice > 0.18) return planet.type === 'dwarf' ? 'dwarf_icy_rocky' : 'frozen_ice';
  if (planet.type === 'dwarf') return 'dwarf_icy_rocky';
  if (c > 0.035) return 'carbon_world';
  if (fe > 0.075) return pickBySeed(planet.seed, ['rocky_red_iron', 'iron_rich'] as const);
  if (si > 0.42) return 'silicate_cratered';
  if (pressure < 0.03) return 'rocky_airless_cratered';
  if (tempK > 420) return pickBySeed(planet.seed, ['desert_arid', 'hot_desert', 'salt_flat'] as const);
  if (tempK > 320) return pickBySeed(planet.seed, ['temperate_desert', 'desert_arid', 'salt_flat'] as const);

  return pickBySeed(planet.seed, ['rocky_barren', 'rocky_dark_basalalt', 'silicate_cratered'] as const);
}

export function getSystemPlanetTextureUrl(planet: Planet): string | null {
  const id = getSystemPlanetTextureId(planet);
  return id ? SYSTEM_PLANET_TEXTURES[id] : null;
}

export function getSystemMoonTextureUrl(composition: MoonComposition, seed: number): string {
  switch (composition) {
    case 'icy':
      return SYSTEM_PLANET_TEXTURES[pickBySeed(seed, ['frozen_ice', 'dwarf_icy_rocky'] as const)];
    case 'metallic':
      return SYSTEM_PLANET_TEXTURES[pickBySeed(seed, ['iron_rich', 'rocky_red_iron'] as const)];
    case 'volcanic':
      return SYSTEM_PLANET_TEXTURES[pickBySeed(seed, ['lava_volcanic', 'volcanic_ash'] as const)];
    case 'rocky':
    default:
      return SYSTEM_PLANET_TEXTURES[pickBySeed(seed, ['rocky_airless_cratered', 'silicate_cratered', 'rocky_barren'] as const)];
  }
}
