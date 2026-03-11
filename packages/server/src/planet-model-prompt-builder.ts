import type { Planet, Star } from '@nebulife/core';

/**
 * Build a Kling prompt for generating a photorealistic planet sphere image
 * on a pure white background — optimal input for Tripo3D image-to-3D.
 *
 * The white background lets Tripo's automatic segmentation cleanly isolate
 * the planet sphere from the background when creating the 3D model.
 */
export function buildPlanetModelPrompt(planet: Planet, star: Star): string {
  const sphere = getPlanetSphereDescription(planet);
  const lighting = getStarLighting(star);

  return (
    `Single ${sphere}, perfect sphere, slight 3/4 angle view showing both the lit face and a thin shadow crescent, ` +
    `photorealistic, ultra-detailed NASA scientific visualization, ` +
    `isolated on pure white background, ` +
    `no stars, no nebula, no other planets, no space background, ` +
    `clean white studio backdrop, professional astrophotography, 4K. ` +
    lighting
  );
}

/**
 * Describe the visual appearance of the planet sphere based on physical parameters.
 */
function getPlanetSphereDescription(planet: Planet): string {
  const tempK = planet.surfaceTempK;
  const water = planet.hydrosphere?.waterCoverageFraction ?? 0;
  const ice = planet.hydrosphere?.iceCapFraction ?? 0;

  if (planet.type === 'gas-giant') {
    // Color depends on composition if available
    const hasAmmonia = planet.atmosphere?.composition?.['NH3'] ?? 0;
    if (hasAmmonia > 0.01) {
      return 'swirling blue-white gas giant with banded atmosphere and large storm system';
    }
    return 'swirling amber and cream banded gas giant with a large red storm vortex, Jupiter-like';
  }

  if (planet.type === 'ice-giant') {
    return 'pale blue-cyan ice giant with faint atmospheric bands, Uranus-like smooth appearance';
  }

  if (planet.type === 'dwarf') {
    if (tempK < 200) {
      return 'small icy dwarf planet with pale grey and white cratered surface, Pluto-like';
    }
    return 'small rocky dwarf planet with heavily cratered grey surface';
  }

  // Rocky planet — determine by temperature and water
  if (tempK > 700) {
    return 'scorched rocky planet, glowing orange-red lava flows across dark volcanic surface, molten magma ocean';
  }

  if (tempK > 450) {
    return 'hot volcanic rocky planet, dark basaltic surface with orange lava rivers, thick yellowish atmosphere haze';
  }

  if (tempK > 350) {
    if (water > 0.1) {
      return 'hot arid rocky planet with rust-red deserts, scattered evaporating seas, reddish-orange surface';
    }
    return 'hot desert rocky planet, orange-red cracked terrain, no visible water, thin dusty atmosphere';
  }

  if (tempK > 250) {
    if (water > 0.6 && planet.hasLife) {
      return 'lush terrestrial planet with vast blue oceans, green-brown continents, white cloud swirls, Earth-like';
    }
    if (water > 0.5) {
      return 'temperate rocky planet with blue oceans, tan and grey continents, thin white cloud layer';
    }
    if (water > 0.2) {
      return 'semi-arid rocky planet with scattered blue seas, large tan desert landmasses, some white clouds';
    }
    return 'dry rocky planet with tan and grey terrain, minimal surface water, thin atmosphere';
  }

  if (tempK > 200) {
    if (ice > 0.5 || water < 0.1) {
      return 'cold rocky planet with white polar ice caps covering most of the surface, pale grey terrain';
    }
    if (water > 0.3) {
      return 'cold rocky planet with grey-blue partially frozen oceans, prominent white polar caps';
    }
    return 'cold barren rocky planet, grey surface with frost-covered terrain';
  }

  // Very cold
  if (ice > 0.7) {
    return 'frozen ice world, entirely white and pale blue surface, thick polar ice sheets';
  }

  return 'frozen rocky planet, white and grey icy surface, heavily cratered, no atmosphere visible';
}

/**
 * Determine the lighting tint based on the host star's spectral class.
 */
function getStarLighting(star: Star): string {
  const sc = star.spectralClass ?? '';

  if (sc.startsWith('O') || sc.startsWith('B')) {
    return 'Lit by blue-white starlight from upper-left.';
  }
  if (sc.startsWith('A') || sc.startsWith('F')) {
    return 'Lit by white-yellow starlight from upper-left.';
  }
  if (sc.startsWith('G')) {
    return 'Lit by warm yellow sunlight from upper-left, Earth-like illumination.';
  }
  if (sc.startsWith('K')) {
    return 'Lit by warm orange starlight from upper-left.';
  }
  if (sc.startsWith('M')) {
    return 'Lit by dim reddish starlight from upper-left.';
  }
  return 'Lit by bright starlight from upper-left.';
}
