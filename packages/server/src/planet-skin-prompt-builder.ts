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
    return 'Earth-like rocky ocean world with deep blue oceans, realistic plate-tectonic continents shaped like natural Earth continents, island arcs, mountain chains, deserts, green lowlands, polar caps, white cloud systems';
  }
  if (planet.hydrosphere && planet.hydrosphere.waterCoverageFraction > 0.15) {
    return 'Earth-like rocky world with scattered seas, realistic plate-tectonic continents shaped like natural Earth continents, coastlines, inland basins, deserts, highlands, ice caps, weather systems';
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
 * Nano Banana 2 is asked for its supported 21:9 panoramic canvas. The backend
 * center-crops without stretching, repairs the longitude join, and encodes an
 * exact 2:1 map before the client wraps it on a sphere.
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
    'FORMAT: one continuous 21:9 longitude-latitude panorama canvas; the backend will center-crop it without stretching and encode an exact 2:1 map.',
    'CRITICAL SAFE CROP: keep important terrain and cloud detail inside the central 85% width; the outer strips are longitude overlap allowance.',
    'CRITICAL: fill the entire image with surface/atmosphere texture data only. No black space, no planet silhouette, no circular planet in frame, no camera view, no background, no starfield, no spacecraft.',
    'This is not a photograph of a planet in space. It is a flat diffuse albedo texture map that will be wrapped onto a 3D sphere by game code.',
    'Projection must be longitude-latitude equirectangular, horizontally seamless at the left and right edges, minimal polar distortion.',
    'SEAMLESS WRAP: the far left and far right edges must match in color, terrain and cloud continuation; avoid a visible vertical seam after wrapping.',
    'The panorama must be a single coherent map: no collage, no tiled/repeated panels, no vertical slices, no stitching boundaries, no duplicated continents.',
    `Use case: ${useCase}.`,
    `Planet: ${planet.name}, type ${planet.type}, ${temp}, radius ${planet.radiusEarth.toFixed(2)} Earth radii, mass ${planet.massEarth.toFixed(2)} Earth masses.`,
    `Visual identity: ${surface}.`,
    `Atmosphere: ${atmosphere}.`,
    `Hydrosphere: ${waterPct}. Biology: ${planet.hasLife ? `${planet.lifeComplexity} life signatures` : 'no visible life'}.`,
    `Orbital context: ${moons}, orbit ${planet.orbit.semiMajorAxisAU.toFixed(2)} AU around a ${star.spectralClass}${star.subType} star (${Math.round(star.temperatureK)}K).`,
    'Flat matte diffuse albedo texture, uniform exposure, no baked directional lighting, no terminator shadow, no black night side, no glossy highlights; the game renderer adds all lighting.',
    'Do not add labels, borders, UI, text, black bars, vignettes, lens flares, or empty margins.',
    'Scientific realism, NASA planetary map style, high detail terrain/cloud pattern, natural muted colors, procedural uniqueness.',
  ].join(' ');
}

