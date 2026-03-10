import type { Planet, Star } from '@nebulife/core';

/**
 * Build a detailed Kling prompt for generating satellite imagery of an alien planet.
 * The prompt creates a satellite photograph looking straight down at the planet surface,
 * suitable for a flat equirectangular map projection.
 */
export function buildSurfacePrompt(planet: Planet, star: Star): string {
  // Determine planet type description
  const planetTypeDesc = getPlanetTypeDescription(planet);

  // Determine climate/temperature description
  const climateDesc = getClimateDescription(planet.surfaceTempK);

  // Determine water coverage description
  const waterCoverageFraction = planet.hydrosphere?.waterCoverageFraction ?? 0;
  const waterDesc = getWaterDescription(waterCoverageFraction);

  // Determine terrain features based on planet data
  const terrainFeatures = getTerrainFeatures(planet);

  // Determine soil/surface color based on minerals
  const soilDesc = getSoilDescription(planet.resources);

  // Determine star lighting color based on spectral class
  const lightingDesc = getLightingDescription(star.spectralClass, star.colorHex);

  // Determine biome description if available
  const biomeDesc = getBiomeDescription(planet);

  // Build the final prompt
  const prompt = `
Satellite photograph looking straight down at alien planet surface,
flat equirectangular map projection filling the entire frame edge to edge.
Planet type: ${planetTypeDesc}.
Climate: ${climateDesc}.
${waterDesc}
${terrainFeatures}
${soilDesc}
${biomeDesc}
${lightingDesc}
NO clouds, NO atmosphere haze, NO shadows, uniform daylight illumination.
Photorealistic, NASA-style Earth observation satellite imagery, 8K detail.
Show terrain features: oceans, continents, mountains, forests, deserts, ice caps, valleys.
`.trim();

  return prompt;
}

/**
 * Get planet type description based on planet properties
 */
function getPlanetTypeDescription(planet: Planet): string {
  if (planet.type === 'gas-giant') {
    return 'gas giant with visible bands and storms';
  }
  if (planet.type === 'ice-giant') {
    return 'ice giant with frozen surface';
  }
  if (planet.type === 'dwarf') {
    return 'dwarf planet with cratered surface';
  }

  // Rocky planet — determine subtype based on habitability
  if (planet.hasLife && (planet.lifeComplexity === 'multicellular' || planet.lifeComplexity === 'intelligent')) {
    return 'habitable rocky planet with abundant life';
  }
  if (planet.terraformDifficulty < 0.3) {
    return 'earthlike rocky planet with stable climate';
  }
  if (planet.surfaceTempK > 400) {
    return 'scorched rocky planet with volcanic activity';
  }
  if (planet.surfaceTempK < 150) {
    return 'frozen rocky planet with ice-covered surface';
  }
  return 'barren rocky planet';
}

/**
 * Get climate description based on surface temperature
 */
function getClimateDescription(tempK: number): string {
  if (tempK < 150) {
    return 'frozen tundra, extreme cold, glaciated, ice age climate';
  }
  if (tempK < 200) {
    return 'polar ice climate, permanent frozen landscapes';
  }
  if (tempK < 250) {
    return 'frozen climate, extensive ice caps, frost-covered terrain';
  }
  if (tempK < 273) {
    return 'subarctic, boreal forests, ice-covered regions';
  }
  if (tempK < 288) {
    return 'cool temperate, mixed forests, some snow';
  }
  if (tempK < 300) {
    return 'mild temperate, warm summers, moderate rainfall';
  }
  if (tempK < 320) {
    return 'warm temperate, tropical transitions, seasonal variation';
  }
  if (tempK < 350) {
    return 'hot arid, scorching deserts, minimal vegetation';
  }
  return 'extremely hot, volcanic, molten rock, lava fields';
}

/**
 * Get water coverage description
 */
function getWaterDescription(fraction: number): string {
  const percent = Math.round(fraction * 100);
  if (percent > 90) {
    return `Ocean planet, ${percent}% water coverage, small island continents, scattered archipelagos.`;
  }
  if (percent > 70) {
    return `Water-rich world, ${percent}% ocean coverage, large continents and island chains.`;
  }
  if (percent > 50) {
    return `Balanced hydrosphere, ${percent}% ocean coverage, diverse continents and seas.`;
  }
  if (percent > 30) {
    return `Mostly dry, ${percent}% water coverage, sparse oceans, large landmasses.`;
  }
  if (percent > 10) {
    return `Arid world, ${percent}% water coverage, scattered lakes and small seas.`;
  }
  return `Desert planet, ${percent}% water coverage, dry riverbeds, minimal water features.`;
}

/**
 * Get terrain features description
 */
function getTerrainFeatures(planet: Planet): string {
  const features: string[] = [];

  // Add water features
  if (planet.hydrosphere) {
    if (planet.hydrosphere.waterCoverageFraction > 0.3) {
      features.push('expansive oceans and seas');
    }
    if (planet.hydrosphere.iceCapFraction > 0.1) {
      features.push('prominent ice caps at poles');
    }
  }

  // Add terrain based on gravity and tectonics (inferred from density)
  if (planet.densityGCm3 > 6) {
    features.push('high mountain ranges, deep canyons');
  } else {
    features.push('rolling highlands, gentle slopes');
  }

  // Add volcanic features if hot
  if (planet.surfaceTempK > 350) {
    features.push('volcanic terrain, lava plains, calderas');
  }

  // Add life/vegetation features if habitable
  if (planet.hasLife && planet.lifeComplexity !== 'none' && planet.lifeComplexity !== 'microbial') {
    features.push('dense vegetation coverage, forests, grasslands');
  }

  if (features.length === 0) {
    features.push('cratered and eroded surface');
  }

  return `Surface features: ${features.join(', ')}.`;
}

/**
 * Get soil/surface color description based on mineral composition
 */
function getSoilDescription(resources: any): string {
  const descriptions: string[] = [];

  // Simplified mineral-based color inference
  if (resources && resources.composition) {
    const comp = resources.composition;

    // High iron = reddish/rusty
    if (comp.fe > 10) {
      descriptions.push('rust-red iron-oxide soil');
    }
    // High silica = pale/tan
    if (comp.si > 25) {
      descriptions.push('pale silicon-rich terrain');
    }
    // High carbon = dark/black
    if (comp.c > 5) {
      descriptions.push('dark carbonaceous surface');
    }
    // High sulfur = yellow/orange
    if (comp.s > 3) {
      descriptions.push('sulfur-yellow deposits');
    }
  }

  // Default if no specific minerals
  if (descriptions.length === 0) {
    descriptions.push('varied colored terrain');
  }

  return `Soil composition: ${descriptions.join(', ')}.`;
}

/**
 * Get biome description
 */
function getBiomeDescription(planet: Planet): string {
  // Check if planet has habitable conditions for biomes
  if (!planet.hydrosphere || planet.surfaceTempK < 200 || planet.surfaceTempK > 400) {
    return '';
  }

  const biomes: string[] = [];
  const temp = planet.surfaceTempK;
  const waterCov = planet.hydrosphere.waterCoverageFraction;

  // Polar biomes
  if (planet.hydrosphere.iceCapFraction > 0.2) {
    biomes.push('polar ice caps');
  }

  // Temperate biomes
  if (temp >= 273 && temp < 300) {
    biomes.push('temperate forests, grasslands');
    if (waterCov > 0.3) {
      biomes.push('wetlands, tidal zones');
    }
  }

  // Tropical biomes
  if (temp >= 300 && temp < 320) {
    biomes.push('tropical rainforests, savannas');
    if (waterCov > 0.2) {
      biomes.push('coral reef systems, mangrove swamps');
    }
  }

  // Desert/arid biomes
  if (temp > 320 || waterCov < 0.1) {
    biomes.push('deserts, dune seas');
  }

  if (biomes.length === 0) {
    return '';
  }

  return `Biomes: ${biomes.join(', ')}.`;
}

/**
 * Get lighting description based on star spectral class
 */
function getLightingDescription(spectralClass: string, colorHex: string): string {
  let lightDesc = 'Illumination:';

  // Use spectral class to determine star type and light color
  if (spectralClass.startsWith('O') || spectralClass.startsWith('B')) {
    lightDesc += ' blue-white star light, cool shadeless illumination';
  } else if (spectralClass.startsWith('A') || spectralClass.startsWith('F')) {
    lightDesc += ' white-yellow star light, neutral daylight illumination';
  } else if (spectralClass.startsWith('G')) {
    lightDesc += ' yellow star light, warm earth-like illumination';
  } else if (spectralClass.startsWith('K')) {
    lightDesc += ' orange star light, warm amber-tinged illumination';
  } else if (spectralClass.startsWith('M')) {
    lightDesc += ' red star light, warm reddish-tinted illumination';
  } else {
    lightDesc += ' bright clear daylight illumination';
  }

  return lightDesc + '.';
}
