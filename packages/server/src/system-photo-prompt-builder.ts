import type { StarSystem, SpectralClass, Planet, PlanetMissionType, PlanetReportSummary } from '@nebulife/core';

export type PlanetPhotoKind = 'exosphere' | 'biosphere' | 'aerial';

export interface PlanetPhotoPromptOptions {
  kind?: PlanetPhotoKind;
  missionType?: PlanetMissionType;
  reportSummary?: PlanetReportSummary;
  playerName?: string;
  observationDate?: string;
}

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
    `A breathtaking deep space photograph of a star system viewed at a 30-degree angle to the orbital plane.`,
    `The ${starDesc} blazes at the center, radiating intense ${starColor} light with subtle lens diffraction spikes.`,
    `${sortedPlanets.length} planets are positioned along a shared ecliptic plane,`,
    `each on its own orbital path at different distances from the star —`,
    `inner planets close to the star, outer planets progressively farther away.`,
    `The orbital plane extends into the distance creating natural perspective depth,`,
    `with some planets appearing closer and larger in the foreground,`,
    `while others recede into the background at varying angles along their orbits.`,
    `This is a cohesive star system, not a collage — planets share the same orbital disc.`,
    planetDetails + '.',
    cinematicDir,
    `Ultra high resolution astrophotography, NASA JWST quality,`,
    `scientifically accurate planetary illumination — lit sides face the central star, dark sides face away.`,
    `Faint orbital path traces visible as subtle dust lanes in the ecliptic plane.`,
    `Volumetric light scattering, subtle nebula wisps in the background,`,
    `deep black space with thousands of pinpoint background stars,`,
    `cinematic perspective composition with dramatic depth of field.`,
    `No text, no labels, no UI elements, no watermarks.`,
  ].join(' ');
}

// ---------------------------------------------------------------------------
// Planet telescope photo prompt (Gemini, close-up JWST-style)
// ---------------------------------------------------------------------------

/**
 * Build a prompt for a generated planet mission photo.
 * Exosphere shots are submitted to Kling; surface/aerial shots use Nano Banana 2.
 */
export function buildGeminiPlanetPhotoPrompt(
  system: StarSystem,
  planet: Planet,
  options: PlanetPhotoPromptOptions = {},
): string {
  const { star } = system;
  const kind = options.kind ?? 'exosphere';
  const missionType = options.missionType;
  const reportSummary = options.reportSummary;
  const starColor = getStarColorWord(star.spectralClass);
  const starDesc = describeStarForPrompt(
    star.spectralClass, star.subType, star.temperatureK, star.colorHex,
  );

  // Planet physical description
  const sizeWord = planet.radiusEarth < 0.5 ? 'small'
    : planet.radiusEarth < 1.5 ? 'Earth-sized'
    : planet.radiusEarth < 4 ? 'super-Earth'
    : planet.radiusEarth < 10 ? 'Neptune-class'
    : 'massive';

  let typeDesc: string;
  if (planet.type === 'gas-giant') typeDesc = 'gas giant with swirling atmospheric bands';
  else if (planet.type === 'ice-giant') typeDesc = 'ice giant with deep blue-cyan atmosphere';
  else if (planet.type === 'dwarf') typeDesc = 'small rocky-icy dwarf body';
  else if (planet.hydrosphere && planet.hydrosphere.waterCoverageFraction > 0.5)
    typeDesc = 'rocky world with vast blue oceans and white cloud patterns';
  else if (planet.hydrosphere && planet.hydrosphere.waterCoverageFraction > 0.1)
    typeDesc = 'rocky world with scattered seas and continental landmasses';
  else if (planet.surfaceTempK > 700)
    typeDesc = 'volcanic world with glowing lava flows on the surface';
  else if (planet.surfaceTempK < 150)
    typeDesc = 'frozen world with icy cratered surface';
  else typeDesc = 'barren rocky world with impact craters';

  // Atmosphere
  let atmoDesc = '';
  if (planet.atmosphere && planet.atmosphere.surfacePressureAtm > 5)
    atmoDesc = 'Thick dense atmosphere visible as a wide hazy limb.';
  else if (planet.atmosphere && planet.atmosphere.surfacePressureAtm > 0.5)
    atmoDesc = 'Visible atmospheric halo at the limb with subtle cloud formations.';
  else if (planet.atmosphere && planet.atmosphere.surfacePressureAtm > 0.01)
    atmoDesc = 'Thin atmospheric haze barely visible at the planet limb.';

  // Moons
  const moonCount = planet.moons?.length ?? 0;
  let moonDesc = '';
  if (moonCount > 3) {
    moonDesc = `${moonCount} moons visible at various distances — some small dots, some larger crescents illuminated by the star.`;
  } else if (moonCount > 0) {
    const moonDetails = planet.moons.map(m =>
      `${m.name} (${m.compositionType}, radius ${Math.round(m.radiusKm)}km)`,
    ).join(', ');
    moonDesc = `Visible ${moonCount === 1 ? 'moon' : 'moons'}: ${moonDetails}, orbiting nearby as illuminated crescents.`;
  }

  // Hydrosphere details
  let hydroDesc = '';
  if (planet.hydrosphere) {
    const wf = planet.hydrosphere.waterCoverageFraction;
    const icef = planet.hydrosphere.iceCapFraction;
    if (wf > 0.7) hydroDesc = 'The surface is dominated by a global ocean reflecting starlight, with scattered island chains.';
    else if (wf > 0.3) hydroDesc = 'Continents and oceans are clearly visible, with cloud systems swirling over the water.';
    if (icef > 0.3) hydroDesc += ' Bright polar ice caps extend towards the equator.';
    else if (icef > 0.05) hydroDesc += ' Small polar ice caps reflect white against the darker surface.';
  }

  const cinematicDir = getCinematicDirection(star.spectralClass);
  const captionDate = options.observationDate ?? new Date().toISOString().slice(0, 10);
  const caption = [
    `Observer: ${options.playerName || 'Explorer'}`,
    `Date: ${captionDate}`,
    `Planet: ${planet.name}`,
    `Star: ${star.name}`,
    `Type: ${planet.type}`,
  ].join(' | ');

  const missionContext = reportSummary && missionType
    ? [
        `MISSION REPORT CONTEXT:`,
        `This image must match a completed ${missionType} report for reveal tier ${reportSummary.revealLevel}.`,
        `Mission completed at ${new Date(reportSummary.generatedAt).toISOString()}.`,
        `Do not contradict the measured pressure, temperature, water coverage, ice coverage, life status, resources, or colonization suitability listed in the planet data.`,
      ].join(' ')
    : '';

  const sharedStyle = [
    `Photorealistic exploration mission photograph, not fantasy art, not concept art.`,
    `Scientific color grading, physically plausible lighting from the ${starColor} parent star,`,
    `realistic camera optics, natural lens flare only where justified, high dynamic range, 2K detail.`,
    `Add a narrow black metadata strip along the bottom edge with small crisp white monospaced text: "${caption}".`,
    `The metadata strip must not cover the main subject. Do not include any agency logo, agency name, watermark, UI frame, or decorative labels.`,
  ].join(' ');

  const exospherePrompt = [
    `EXOSPHERE ORBITAL PROBE PHOTO.`,
    `PLANET DATA:`,
    missionContext,
    `${planet.name}, a ${sizeWord} ${typeDesc},`,
    `radius ${planet.radiusEarth.toFixed(2)} Earth radii, mass ${planet.massEarth.toFixed(3)} Earth masses,`,
    `orbit ${planet.orbit.semiMajorAxisAU.toFixed(3)} AU from ${star.name}, a ${starDesc},`,
    `surface temperature ${Math.round(planet.surfaceTempK)}K, gravity ${planet.surfaceGravityG}g.`,
    `---`,
    `A realistic close orbital photograph from an autonomous probe in the exosphere of planet ${planet.name}.`,
    `The planet dominates the frame, filling about 60 percent of the image, with a clear terminator line and visible atmospheric limb when present.`,
    `Show only a small cropped sliver of the probe body or antenna at one side of the frame, subtle and non-intrusive, to make it feel captured by a spacecraft.`,
    `Place the parent star ${star.name} in the background as a distant bright ${starColor} point with realistic glare.`,
    moonDesc || `If no moons are present, keep the background clean with distant stars and no invented large moons.`,
    atmoDesc,
    hydroDesc,
    cinematicDir,
    sharedStyle,
  ];

  const isLivingBiosphere = planet.hasLife && planet.lifeComplexity !== 'none' && planet.lifeComplexity !== 'microbial';
  const biospherePrompt = [
    isLivingBiosphere ? `INHABITED PLANET BIOSPHERE PHOTO.` : `SURFACE ROVER BIOSPHERE PHOTO.`,
    `PLANET DATA:`,
    missionContext,
    `${planet.name}, type ${planet.type}, ${typeDesc}, surface temperature ${Math.round(planet.surfaceTempK)}K, gravity ${planet.surfaceGravityG}g.`,
    `Atmosphere: ${planet.atmosphere ? `${planet.atmosphere.surfacePressureAtm.toFixed(2)} atm` : 'none or trace'}.`,
    `Hydrosphere: ${planet.hydrosphere ? `${Math.round(planet.hydrosphere.waterCoverageFraction * 100)} percent water coverage, ${Math.round(planet.hydrosphere.iceCapFraction * 100)} percent ice caps` : 'no stable surface water detected'}.`,
    `---`,
    `A grounded rover camera photograph from the surface of ${planet.name}, focused on the local biosphere or plausible pre-biosphere environment.`,
    `If the planet can support visible life, show realistic alien vegetation, microbial mats, lichens, shallow water edges, or biofilm-like textures shaped by the atmosphere and temperature.`,
    `If visible life is unlikely, show a scientific surface ecology survey scene: mineral crusts, ice, evaporite patterns, dust, rocks, haze, and possible microscopic biosignature sampling markers without inventing animals.`,
    isLivingBiosphere
      ? `The camera platform must not be visible: no rover chassis, no wheel, no robotic arm, no camera mast, no drone, no spacecraft, only the inhabited biosphere landscape.`
      : `Show only a small part of the rover chassis, wheel, robotic arm, or camera mast at the lower edge or side of the frame, subtle and believable.`,
    `Use eye-level or low rover perspective, natural terrain scale, realistic shadows, no humans.`,
    cinematicDir,
    sharedStyle,
  ];

  const aerialPrompt = [
    `AERIAL COPTER BIRD'S-EYE PHOTO.`,
    `PLANET DATA:`,
    missionContext,
    `${planet.name}, type ${planet.type}, ${typeDesc}, surface temperature ${Math.round(planet.surfaceTempK)}K, gravity ${planet.surfaceGravityG}g.`,
    `Atmosphere: ${planet.atmosphere ? `${planet.atmosphere.surfacePressureAtm.toFixed(2)} atm` : 'trace'}.`,
    `Hydrosphere: ${planet.hydrosphere ? `${Math.round(planet.hydrosphere.waterCoverageFraction * 100)} percent water coverage, ${Math.round(planet.hydrosphere.iceCapFraction * 100)} percent ice caps` : 'dry surface'}.`,
    `---`,
    `A vertical bird's-eye photograph taken by a compact exploration copter looking downward at the terrain of ${planet.name}.`,
    `Composition is top-down but still photographic: terrain relief, craters, river-like channels, ice fields, dunes, lava plains, or coastlines according to the planet data.`,
    `The exploration craft must not be visible in the frame: no drone body, no landing skid, no rotor guard, no sensor boom, only the photographed surface below.`,
    `Make altitude feel like tens to hundreds of meters above ground, not orbital imagery.`,
    `No humans, no fantasy buildings, no impossible blue skies unless the atmosphere supports it.`,
    cinematicDir,
    sharedStyle,
  ];

  const atmosphereProbePrompt = [
    `DEEP ATMOSPHERE PROBE PHOTO.`,
    `PLANET DATA:`,
    missionContext,
    `${planet.name}, type ${planet.type}, ${typeDesc}, atmospheric temperature reference ${Math.round(planet.surfaceTempK)}K, gravity ${planet.surfaceGravityG}g.`,
    `Atmosphere: ${planet.atmosphere ? `${planet.atmosphere.surfacePressureAtm.toFixed(2)} atm` : 'extremely deep gas envelope'}.`,
    `---`,
    `A photorealistic image transmitted by a descending atmospheric probe inside the atmosphere of ${planet.name}.`,
    `This is a gas or ice giant atmosphere survey, not a surface landing: show turbulent cloud decks, colored bands, storm cells, haze layers, lightning glows, pressure fog, and depth fading into clouds.`,
    `There must be no solid ground, no rocky horizon, no clear surface, no oceans, no trees, and no landforms.`,
    `The probe itself must not be visible in the frame: no capsule edge, no antenna, no parachute, only the atmospheric view.`,
    `Make scale feel enormous and hostile, with layered clouds extending far below and above the camera.`,
    cinematicDir,
    sharedStyle,
  ];

  const prompt = missionType === 'deep_atmosphere_probe' && (planet.type === 'gas-giant' || planet.type === 'ice-giant')
    ? atmosphereProbePrompt
    : kind === 'biosphere'
    ? biospherePrompt
    : kind === 'aerial'
      ? aerialPrompt
      : exospherePrompt;

  return prompt.filter(Boolean).join(' ');
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
