import type { StarSystem, SpectralClass } from '@nebulife/core';

/**
 * Build a Kling prompt for generating a telescope photo of a star system.
 * Describes the star, each planet with its characteristics, and artistic direction.
 */
export function buildSystemPhotoPrompt(system: StarSystem): string {
  const { star, planets } = system;

  // Star description
  const starDesc = describeStarForPrompt(star.spectralClass, star.subType, star.temperatureK, star.colorHex);

  // Planet descriptions
  const planetDescs = planets.map((p, i) => {
    const moons = p.moons?.length ?? 0;
    const sizeDesc = p.radiusEarth < 0.5 ? 'tiny'
      : p.radiusEarth < 1.5 ? 'Earth-sized'
      : p.radiusEarth < 4 ? 'super-Earth'
      : p.radiusEarth < 10 ? 'Neptune-sized'
      : 'gas giant';

    const tempDesc = p.surfaceTempK < 200 ? 'frozen'
      : p.surfaceTempK < 373 ? 'temperate'
      : p.surfaceTempK < 700 ? 'hot'
      : 'scorching';

    const typeDesc = p.type === 'gas-giant' ? 'gas giant with swirling clouds'
      : p.type === 'ice-giant' ? 'ice giant with blue-green atmosphere'
      : p.type === 'rocky' && p.hydrosphere && p.hydrosphere.waterCoverageFraction > 0.3 ? 'rocky planet with oceans'
      : p.type === 'rocky' ? 'barren rocky world'
      : 'terrestrial world';

    let desc = `Planet ${i + 1}: ${sizeDesc} ${typeDesc}, ${tempDesc} (${Math.round(p.surfaceTempK)}K)`;
    if (moons > 0) {
      desc += `, ${moons} ${moons === 1 ? 'moon' : 'moons'}`;
    }
    if (p.atmosphere && p.atmosphere.surfacePressureAtm > 0.01) {
      desc += ', with atmosphere';
    }
    return desc;
  }).join('. ');

  // Artistic direction based on spectral class
  const artDir = getArtisticDirection(star.spectralClass);

  return [
    `Deep space telescope photograph of a ${starDesc}`,
    `with ${planets.length} orbiting planets.`,
    planetDescs + '.',
    artDir,
    'Photorealistic, NASA Hubble/JWST quality, 8K resolution,',
    'deep space background with distant stars and nebulae,',
    'cinematic lighting, volumetric light rays from the star.',
  ].join(' ');
}

/**
 * Build a Kling video prompt for a system mission (image-to-video).
 */
export function buildMissionVideoPrompt(system: StarSystem, duration: 'short' | 'long'): string {
  const { star, planets } = system;

  const starColor = getStarColorWord(star.spectralClass);

  if (duration === 'short') {
    return [
      `Smooth cinematic camera flyby through a star system.`,
      `A ${starColor} star illuminates ${planets.length} planets.`,
      `Camera slowly drifts past the nearest planet, revealing its surface details.`,
      `Gentle parallax motion with distant planets in background.`,
      `NASA documentary style, photorealistic, volumetric lighting,`,
      `subtle lens flare from the star, slow graceful movement.`,
    ].join(' ');
  }

  return [
    `Epic cinematic exploration sequence of a star system.`,
    `Camera begins near a ${starColor} star, then sweeps outward`,
    `through the orbital plane, flying past ${planets.length} planets in sequence.`,
    `Each planet reveals unique surface features as camera passes by.`,
    `Majestic scale with visible moons and ring systems.`,
    `NASA documentary meets sci-fi cinema quality,`,
    `photorealistic, volumetric god rays, subtle motion blur,`,
    `orchestral pacing, slow elegant camera movement through deep space.`,
  ].join(' ');
}

function describeStarForPrompt(
  spectralClass: SpectralClass,
  subType: number,
  tempK: number,
  colorHex: string,
): string {
  const colorWord = getStarColorWord(spectralClass);
  const sizeWord = spectralClass === 'O' || spectralClass === 'B' ? 'massive' :
    spectralClass === 'A' || spectralClass === 'F' ? 'bright' :
    spectralClass === 'G' ? 'Sun-like' :
    spectralClass === 'K' ? 'orange dwarf' : 'red dwarf';

  return `${colorWord} ${sizeWord} star (class ${spectralClass}${subType}, ${Math.round(tempK)}K)`;
}

function getStarColorWord(spectralClass: SpectralClass): string {
  switch (spectralClass) {
    case 'O': return 'brilliant blue';
    case 'B': return 'blue-white';
    case 'A': return 'white';
    case 'F': return 'yellow-white';
    case 'G': return 'golden yellow';
    case 'K': return 'warm orange';
    case 'M': return 'deep red';
  }
}

function getArtisticDirection(spectralClass: SpectralClass): string {
  switch (spectralClass) {
    case 'O':
    case 'B':
      return 'Cool blue-violet illumination bathing the scene, intense stellar radiation, electric blue star glare.';
    case 'A':
    case 'F':
      return 'Clean bright white-blue illumination, sharp shadows, pristine deep space clarity.';
    case 'G':
      return 'Warm golden sunlight illumination, familiar Sol-like ambiance, comfortable tones.';
    case 'K':
      return 'Amber-orange starlight casting warm tones across planets, sunset-like atmospheric glow.';
    case 'M':
      return 'Deep crimson-red illumination, dramatic shadows, moody alien atmosphere, dark space backdrop.';
  }
}
