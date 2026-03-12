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

// ---------------------------------------------------------------------------
// Gemini-specific prompt builder (cinematic English, JWST-style)
// ---------------------------------------------------------------------------

/**
 * Build a Gemini-optimized prompt for generating a cinematic star system photo.
 * English only, rich visual description, JWST/Hubble aesthetic.
 * Includes structured scientific catalog of all objects in the system.
 */
export function buildGeminiSystemPhotoPrompt(system: StarSystem): string {
  const { star, planets } = system;

  const starColor = getStarColorWord(star.spectralClass);
  const starDesc = describeStarForPrompt(
    star.spectralClass, star.subType, star.temperatureK, star.colorHex,
  );

  // ── Structured system catalog (scientific data for Gemini) ──────────
  const starCatalog = [
    `SYSTEM CATALOG:`,
    `Star: ${star.name}, spectral class ${star.spectralClass}${star.subType}V,`,
    `temperature ${Math.round(star.temperatureK)}K, mass ${star.massSolar.toFixed(2)} M☉,`,
    `radius ${star.radiusSolar.toFixed(2)} R☉, luminosity class ${starColor}.`,
  ].join(' ');

  const sortedPlanets = [...planets].sort(
    (a, b) => a.orbit.semiMajorAxisAU - b.orbit.semiMajorAxisAU,
  );

  const planetCatalog = sortedPlanets.map((p, i) => {
    // Composition descriptor
    let composition: string;
    if (p.type === 'gas-giant') composition = 'hydrogen-helium gas giant';
    else if (p.type === 'ice-giant') composition = 'water-methane-ammonia ice giant';
    else if (p.type === 'dwarf') composition = 'rocky-icy dwarf body';
    else if (p.surfaceTempK > 900) composition = 'molten silicate-iron rocky world';
    else if (p.hydrosphere && p.hydrosphere.waterCoverageFraction > 0.4) composition = 'silicate-iron rocky world with global ocean';
    else if (p.surfaceTempK < 180) composition = 'rocky-ice world with frozen surface';
    else composition = 'silicate-iron rocky world';

    // Moon list
    const moonList = p.moons.length > 0
      ? p.moons.map(m =>
          `${m.name} (${m.compositionType}, radius ${Math.round(m.radiusKm)}km, orbit ${Math.round(m.orbitalRadiusKm)}km)`,
        ).join('; ')
      : 'none';

    const atmoDesc = p.atmosphere
      ? `atm pressure ${p.atmosphere.surfacePressureAtm.toFixed(2)}atm`
      : 'no atmosphere';

    return [
      `Planet ${i + 1}: ${p.name},`,
      `type=${p.type}, composition=${composition},`,
      `radius=${p.radiusEarth.toFixed(2)} Earth radii, mass=${p.massEarth.toFixed(3)} Earth masses,`,
      `orbit=${p.orbit.semiMajorAxisAU.toFixed(3)}AU,`,
      `surface temp=${Math.round(p.surfaceTempK)}K, ${atmoDesc}.`,
      `Moons: ${moonList}.`,
    ].join(' ');
  }).join(' ');

  // ── Cinematic planet visuals (for image composition) ──────────────
  const planetDetails = sortedPlanets.map((p, i) => {
    const parts: string[] = [];

    if (p.radiusEarth < 0.5) parts.push('a small rocky body');
    else if (p.radiusEarth < 1.5) parts.push('an Earth-sized world');
    else if (p.radiusEarth < 4) parts.push('a super-Earth');
    else if (p.radiusEarth < 10) parts.push('a Neptune-class ice giant');
    else parts.push('a massive gas giant');

    if (p.type === 'gas-giant') {
      const bandColors = p.surfaceTempK > 700
        ? 'with incandescent orange-red cloud bands'
        : p.surfaceTempK > 373
          ? 'with amber and ochre atmospheric bands'
          : 'with pale cream and blue-grey cloud bands';
      parts.push(bandColors);
    } else if (p.type === 'ice-giant') {
      parts.push('with a deep blue-cyan atmosphere and faint ring system');
    } else if (p.hydrosphere && p.hydrosphere.waterCoverageFraction > 0.5) {
      parts.push('with vast blue oceans and white cloud patterns');
    } else if (p.hydrosphere && p.hydrosphere.waterCoverageFraction > 0.1) {
      parts.push('with scattered seas and continental landmasses');
    } else if (p.surfaceTempK > 700) {
      parts.push('with a scorched volcanic surface glowing at the terminator');
    } else if (p.surfaceTempK < 150) {
      parts.push('with an icy cratered surface reflecting starlight');
    } else {
      parts.push('with a barren rocky surface and impact craters');
    }

    if (p.atmosphere && p.atmosphere.surfacePressureAtm > 2) {
      parts.push('shrouded in thick hazy atmosphere');
    } else if (p.atmosphere && p.atmosphere.surfacePressureAtm > 0.1) {
      parts.push('with a thin atmospheric halo visible at the limb');
    }

    const moons = p.moons?.length ?? 0;
    if (moons > 2) parts.push(`accompanied by ${moons} moons`);
    else if (moons === 1) parts.push('with a single moon nearby');

    return `Planet ${i + 1} is ${parts.join(', ')}`;
  }).join('. ');

  // Cinematic direction per spectral class
  const cinematicDir = getCinematicDirection(star.spectralClass);

  // Compose the full prompt
  return [
    starCatalog,
    planetCatalog,
    `---`,
    `A breathtaking deep space photograph captured by a next-generation space telescope.`,
    `The scene shows a ${starDesc} at the center of the frame,`,
    `radiating intense ${starColor} light with subtle lens diffraction spikes.`,
    `${sortedPlanets.length} planets orbit at various distances in the system.`,
    planetDetails + '.',
    cinematicDir,
    `Ultra high resolution astrophotography, NASA JWST quality,`,
    `scientifically accurate planetary illumination from the central star,`,
    `volumetric light scattering, subtle nebula wisps in the background,`,
    `deep black space with thousands of pinpoint background stars,`,
    `cinematic composition with dramatic depth of field.`,
    `No text, no labels, no UI elements, no watermarks.`,
  ].join(' ');
}

/**
 * Cinematic direction tuned per spectral class for Gemini.
 */
function getCinematicDirection(spectralClass: SpectralClass): string {
  switch (spectralClass) {
    case 'O':
    case 'B':
      return 'The scene is bathed in intense blue-violet stellar radiation, with electric blue god rays piercing through planetary atmospheres. High-energy ultraviolet glow creates vivid fluorescent halos around gas giants.';
    case 'A':
    case 'F':
      return 'Crisp white-blue starlight floods the scene with pristine clarity. Sharp shadows define planetary surfaces. The overall tone is clean and luminous, like a diamond in the void.';
    case 'G':
      return 'Warm golden sunlight paints the scene in familiar, inviting tones. The star casts a comfortable yellow glow reminiscent of our own Sun, with gentle gradients across planetary terminator lines.';
    case 'K':
      return 'Rich amber-orange starlight drenches the system in warm sunset tones. Planetary surfaces glow with copper and bronze hues. The atmosphere feels intimate and ancient.';
    case 'M':
      return 'Deep crimson starlight creates a dramatic, moody atmosphere. Blood-red illumination casts long shadows across planetary surfaces. The scene feels alien and primordial, with a haunting beauty.';
  }
}
