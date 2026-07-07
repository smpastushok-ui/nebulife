// Biosphere biome palette — maps a planet's physical properties to the
// muted Game Bible color palette (CLAUDE.md §Кольори) for the procedural
// terrain patch in BiosphereView. No textures — flat-shaded low-poly ground,
// tinted by biome only.

import type { Planet } from '@nebulife/core';

export interface BiomePalette {
  /** Base ground color (low points / valleys). */
  base: number;
  /** Highlight color (high points / ridges) — lerped with base by elevation. */
  highlight: number;
  /** Ambient/fog-adjacent tint used for the scene clear color. */
  ambient: number;
  /** Key light color (sun tint for this biome). */
  lightTint: number;
}

const PALETTES = {
  ocean: { base: 0x0a1a3a, highlight: 0x2a6a8a, ambient: 0x061020, lightTint: 0xbcd8ff },
  ice: { base: 0x8899aa, highlight: 0xdfeaf5, ambient: 0x0a1420, lightTint: 0xdfeeff },
  desert: { base: 0x6a4a2a, highlight: 0xaa7744, ambient: 0x140f08, lightTint: 0xffddaa },
  lava: { base: 0x2a0f08, highlight: 0x883322, ambient: 0x140505, lightTint: 0xff9966 },
  vegetation: { base: 0x2a4a2a, highlight: 0x4a7a44, ambient: 0x081408, lightTint: 0xccffdd },
  gasGiant: { base: 0x2a2440, highlight: 0x6655aa, ambient: 0x0a0818, lightTint: 0xbbaaff },
  rocky: { base: 0x443a33, highlight: 0x776655, ambient: 0x100d0a, lightTint: 0xddccbb },
} as const satisfies Record<string, BiomePalette>;

/**
 * Deterministic biome selection: planet type + water coverage + surface temp.
 * Mirrors the "planet type -> biome" mapping called out in NEXT_GEN_PLAN.md
 * Section C (e.g. ocean world -> deep blues, desert -> muted oranges).
 */
export function getBiospherePalette(planet: Planet): BiomePalette {
  if (planet.type === 'gas-giant' || planet.type === 'ice-giant') {
    return PALETTES.gasGiant;
  }

  const waterCoverage = planet.hydrosphere?.waterCoverageFraction ?? 0;
  const tempK = planet.surfaceTempK;

  if (tempK >= 500) return PALETTES.lava;
  if (tempK <= 240) return PALETTES.ice;
  if (waterCoverage >= 0.55) return PALETTES.ocean;
  if (planet.hasLife && waterCoverage >= 0.15) return PALETTES.vegetation;
  if (waterCoverage < 0.15) return PALETTES.desert;
  return PALETTES.rocky;
}
