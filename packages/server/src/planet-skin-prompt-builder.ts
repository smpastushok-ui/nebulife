import type { Planet, StarSystem } from '@nebulife/core';

export type PlanetSkinKind = 'system' | 'exosphere';

export const PLANET_SKIN_EXOSPHERE_COST_QUARKS = 50;

function describeTemperature(tempK: number): string {
  if (tempK > 1000) return 'incandescent ultra-hot';
  if (tempK > 700) return 'scorched volcanic';
  if (tempK > 373) return 'hot arid';
  if (tempK >= 273) return 'temperate';
  if (tempK > 180) return 'frozen';
  return 'deep cryogenic';
}

function describePlanetSurface(planet: Planet): string {
  if (planet.type === 'gas-giant') {
    return planet.surfaceTempK > 700
      ? 'hot gas giant with turbulent orange-red cloud belts, metallic haze, oval storms'
      : 'gas giant with layered cream, ochre, blue-grey cloud bands and broad cyclonic storms';
  }
  if (planet.type === 'ice-giant') {
    return 'ice giant with blue-cyan methane atmosphere, subtle banding, pale high-altitude haze';
  }
  if (planet.hydrosphere && planet.hydrosphere.waterCoverageFraction > 0.55) {
    return 'rocky ocean world with deep blue oceans, continental landmasses, white cloud systems';
  }
  if (planet.hydrosphere && planet.hydrosphere.waterCoverageFraction > 0.15) {
    return 'rocky world with scattered seas, dry continents, ice caps, weather systems';
  }
  if (planet.surfaceTempK > 700) {
    return 'rocky volcanic world with basalt plains, lava fractures, ash fields, glowing rift lines';
  }
  if (planet.surfaceTempK < 170) {
    return 'icy cratered world with nitrogen frost, blue shadows, frozen ridges, impact basins';
  }
  return 'rocky desert world with crater fields, highlands, canyon networks, mineral color variation';
}

function describeAtmosphere(planet: Planet): string {
  if (!planet.atmosphere || planet.atmosphere.surfacePressureAtm < 0.01) return 'no visible atmosphere';
  if (planet.atmosphere.surfacePressureAtm > 3) return 'dense hazy atmosphere with global cloud veils';
  if (planet.atmosphere.surfacePressureAtm > 0.2) return 'visible thin atmospheric haze and scattered clouds';
  return 'very thin limb haze, minimal cloud cover';
}

/**
 * Builds a texture-map prompt, not a cinematic camera prompt.
 * Kling is asked for a seamless equirectangular map so the client can wrap it on a sphere.
 */
export function buildPlanetSkinPrompt(system: StarSystem, planet: Planet, kind: PlanetSkinKind): string {
  const star = system.star;
  const temp = describeTemperature(planet.surfaceTempK);
  const surface = describePlanetSurface(planet);
  const atmosphere = describeAtmosphere(planet);
  const waterPct = planet.hydrosphere
    ? `${Math.round(planet.hydrosphere.waterCoverageFraction * 100)}% water coverage`
    : '0% surface water';
  const moons = planet.moons.length > 0
    ? `${planet.moons.length} moons influence subtle tidal/geologic patterns`
    : 'no major moons';

  const useCase = kind === 'exosphere'
    ? 'premium close exosphere globe texture with atmospheric rim detail'
    : 'compact star-system orbit view texture, readable at small planet size';

  return [
    'Create a seamless equirectangular planetary texture map for wrapping onto a 3D sphere.',
    'FORMAT: 2:1 panorama texture, ideal target 2048x1024, no borders, no labels, no text, no UI, no starfield, no spacecraft.',
    'Projection must be longitude-latitude equirectangular, horizontally seamless at the left and right edges, minimal polar distortion.',
    `Use case: ${useCase}.`,
    `Planet: ${planet.name}, type ${planet.type}, ${temp}, radius ${planet.radiusEarth.toFixed(2)} Earth radii, mass ${planet.massEarth.toFixed(2)} Earth masses.`,
    `Visual identity: ${surface}.`,
    `Atmosphere: ${atmosphere}.`,
    `Hydrosphere: ${waterPct}. Biology: ${planet.hasLife ? `${planet.lifeComplexity} life signatures` : 'no visible life'}.`,
    `Orbital context: ${moons}, orbit ${planet.orbit.semiMajorAxisAU.toFixed(2)} AU around a ${star.spectralClass}${star.subType} star (${Math.round(star.temperatureK)}K).`,
    'Lighting baked softly from upper-left only; avoid strong terminator shadows because the game renderer adds its own lighting.',
    'Scientific realism, NASA planetary map style, high detail terrain/cloud pattern, natural muted colors, procedural uniqueness.',
  ].join(' ');
}

