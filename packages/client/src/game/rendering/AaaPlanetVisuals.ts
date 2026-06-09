import type { Planet, Star } from '@nebulife/core';
import * as THREE from 'three';
import { aaaPlanetFragmentShader, aaaPlanetVertexShader } from '../shaders/PlanetShaders.js';
import { getSystemPlanetTextureId, type SystemPlanetTextureId } from './planet-texture-catalog.js';
import type { PlanetVisualConfig } from './PlanetVisuals.js';
import { STAR_SPRITE_POSITION } from './PlanetVisuals.js';

export type AaaPlanetArchetype =
  | 'jupiter'
  | 'uranus'
  | 'neptune'
  | SystemPlanetTextureId;

interface AaaPalette {
  base: number;
  alt: number;
  accent: number;
  atmosphere: number;
}

export interface AaaPlanetVisualSpec {
  archetype: AaaPlanetArchetype;
  shaderType: number;
  palette: AaaPalette;
}

function numToColor(c: number): THREE.Color {
  return new THREE.Color(
    ((c >> 16) & 0xff) / 255,
    ((c >> 8) & 0xff) / 255,
    (c & 0xff) / 255,
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function seededUnit(seed: number, salt: number): number {
  let x = (seed ^ (salt * 0x9e3779b9)) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return ((x >>> 0) % 10000) / 10000;
}

function mixHex(a: number, b: number, t: number): number {
  const f = clamp(t, 0, 1);
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  return (
    (Math.round(ar + (br - ar) * f) << 16)
    | (Math.round(ag + (bg - ag) * f) << 8)
    | Math.round(ab + (bb - ab) * f)
  );
}

function paletteFor(archetype: AaaPlanetArchetype, planet: Planet, visuals: PlanetVisualConfig): AaaPalette {
  const variant = seededUnit(planet.seed, 811);
  const tempK = planet.surfaceTempK;
  
  const crust = planet.resources?.crustComposition ?? {};
  const fe = crust.Fe ?? 0;
  const c = crust.C ?? 0;
  const s = crust.S ?? 0;
  const ice = visuals.iceCapFraction ?? 0;
  const ch4 = planet.atmosphere?.composition?.CH4 ?? 0;

  switch (archetype) {
    case 'jupiter': {
      let base = visuals.bandColor1 || 0xc69a68;
      let alt = visuals.bandColor2 || 0x6b3b20;
      let accent = mixHex(base, 0xffddaa, 0.5 + variant * 0.25);
      
      // Dynamic gas giant colors based on temp and composition
      if (ch4 > 0.04) {
        base = mixHex(base, 0x183b8a, 0.85); // Methane blue
        alt = mixHex(alt, 0x0c1e55, 0.85);
      } else if (tempK < 160) {
        base = mixHex(base, 0xe0d8c8, 0.8); // Ammonia white/yellow
        alt = mixHex(alt, 0xcab89e, 0.8);
        accent = 0xffffff;
      } else if (tempK > 600) {
        base = mixHex(base, 0x661100, 0.85); // Hot Jupiter red/dark
        alt = mixHex(alt, 0x330800, 0.85);
        accent = 0xffaa00;
      }
      
      return {
        base,
        alt,
        accent,
        atmosphere: mixHex(base, 0xffffff, 0.35),
      };
    }
    case 'uranus':
    case 'neptune': {
      const base = archetype === 'uranus' ? 0x5b9fb5 : 0x2457b8;
      const alt = archetype === 'uranus' ? 0x336688 : 0x102a77;
      return {
        base: mixHex(base, 0xffffff, clamp(ice * 0.8, 0, 0.5)),
        alt: mixHex(alt, 0x000000, variant * 0.3),
        accent: mixHex(0xd6f2ff, 0xffffff, variant),
        atmosphere: mixHex(base, 0xffffff, 0.4),
      };
    }
    case 'acid_cloud_world_surface':
      return {
        base: mixHex(0x9ca85e, 0x829143, variant),
        alt: mixHex(0x566e2d, 0x475c24, variant),
        accent: 0xd9e38e,
        atmosphere: visuals.atmosColor || 0xa0b354,
      };
    case 'toxic_greenhouse':
      return {
        base: mixHex(0xd1a95e, 0xc28236, variant),
        alt: mixHex(0x8a541c, 0x5e3711, variant),
        accent: 0xffd17a,
        atmosphere: visuals.atmosColor || 0xcca654,
      };
    case 'volcanic_ash':
      return {
        base: mixHex(0x2a2a2a, 0x1a1a1a, variant),
        alt: mixHex(0x111111, 0x050505, variant),
        accent: mixHex(visuals.lavaColor || 0xff4400, 0x555555, 0.7),
        atmosphere: mixHex(visuals.atmosColor || 0x444444, 0x222222, 0.5),
      };
    case 'lava_volcanic':
      return {
        base: mixHex(0x1a0904, 0x221111, variant),
        alt: mixHex(visuals.surfaceHighColor, 0x5c1b0b, 0.65),
        accent: mixHex(visuals.lavaColor, 0xffaa22, 0.45),
        atmosphere: mixHex(visuals.atmosColor || 0xff5522, 0xff8844, 0.5),
      };
    case 'frozen_ice':
    case 'terran_ice_ocean':
      return {
        base: mixHex(0x8bb8db, 0xaed3e6, variant),
        alt: mixHex(0x45789e, 0x5e91b5, variant),
        accent: 0xffffff,
        atmosphere: visuals.atmosColor || 0x9fd8ff,
      };
    case 'methane_lakes':
      return {
        base: mixHex(0x173a5e, 0x245482, variant),
        alt: mixHex(0x0c1e33, 0x122a45, variant),
        accent: mixHex(0x4d9cd9, 0x7abff5, variant),
        atmosphere: visuals.atmosColor || 0x2c6b9e,
      };
    case 'ammonia_cold':
      return {
        base: mixHex(0xdcdcdc, 0xebdeb3, variant),
        alt: mixHex(0x9e9e9e, 0xb0a486, variant),
        accent: 0xffffff,
        atmosphere: visuals.atmosColor || 0xc4c4c4,
      };
    case 'carbon_world':
      return {
        base: mixHex(0x1b1b1f, 0x252529, variant),
        alt: mixHex(0x0e0e12, 0x121217, variant),
        accent: mixHex(0x4a4a52, 0x6e6e7a, variant),
        atmosphere: visuals.atmosColor || 0x3d3d45,
      };
    case 'rocky_dark_basalalt':
      return {
        base: mixHex(0x282a2e, 0x33363b, variant),
        alt: mixHex(0x16171a, 0x1c1e21, variant),
        accent: mixHex(0x575a61, 0x41444a, variant),
        atmosphere: visuals.atmosColor || 0x4a4e54,
      };
    case 'salt_flat':
      return {
        base: mixHex(0xc9b77e, 0xd9cba0, variant),
        alt: mixHex(0x8c7042, 0x9e8557, variant),
        accent: 0xe8dfc5,
        atmosphere: visuals.atmosColor || 0xb7a06b,
      };
    case 'desert_arid':
      return {
        base: mixHex(0xcca366, 0xdebd8a, variant),
        alt: mixHex(0x8f6a36, 0xa37e46, variant),
        accent: mixHex(0xe8d0a9, 0xf0dfc2, variant),
        atmosphere: visuals.atmosColor || 0xb89258,
      };
    case 'hot_desert':
      return {
        base: mixHex(0xc4693b, 0xd68054, variant),
        alt: mixHex(0x803a1a, 0x944a26, variant),
        accent: mixHex(0xe6a583, 0xf5bca1, variant),
        atmosphere: visuals.atmosColor || 0xba6034,
      };
    case 'temperate_desert':
      return {
        base: mixHex(0x9c8965, 0xb09f7f, variant),
        alt: mixHex(0x615236, 0x736446, variant),
        accent: mixHex(0xc2b397, 0xd1c5ab, variant),
        atmosphere: visuals.atmosColor || 0x8a7755,
      };
    case 'iron_rich':
      return {
        base: mixHex(0x6e3125, 0x823b2d, variant),
        alt: mixHex(0x3d170f, 0x4f2218, variant),
        accent: mixHex(0x9e5244, 0xb36556, variant),
        atmosphere: visuals.atmosColor || 0x5e261a,
      };
    case 'rocky_red_iron':
      return {
        base: mixHex(0xa6462b, 0xba593f, variant),
        alt: mixHex(0x612211, 0x732e1a, variant),
        accent: mixHex(0xd1755a, 0xe08b72, variant),
        atmosphere: visuals.atmosColor || 0x913b22,
      };
    case 'dwarf_icy_rocky':
      return {
        base: mixHex(0x6c7c85, 0x809099, variant),
        alt: mixHex(0x424e54, 0x515e66, variant),
        accent: mixHex(0xa6b8c2, 0xbad0db, variant),
        atmosphere: visuals.atmosColor || 0x5b6b75,
      };
    case 'rocky_airless_cratered':
      return {
        base: mixHex(0x73706e, 0x878481, variant),
        alt: mixHex(0x3b3836, 0x4a4744, variant),
        accent: mixHex(0xa6a3a1, 0xbfbbb8, variant),
        atmosphere: visuals.atmosColor || 0x605e5d,
      };
    case 'rocky_barren':
      return {
        base: mixHex(0x7a6d63, 0x8f8278, variant),
        alt: mixHex(0x453b34, 0x544941, variant),
        accent: mixHex(0xab9e95, 0xc2b5ac, variant),
        atmosphere: visuals.atmosColor || 0x665b53,
      };
    case 'silicate_cratered':
      return {
        base: mixHex(0xa3a09e, 0xb5b3b1, variant),
        alt: mixHex(0x666361, 0x757270, variant),
        accent: mixHex(0xcccad0, 0xe0dee3, variant),
        atmosphere: visuals.atmosColor || 0x8c8a88,
      };
    case 'terran_ocean':
    case 'terran_archipelago':
    case 'terran_continental':
    default: {
      // Dynamic rocky colors driven primarily by physical composition
      let base = 0x888888;
      let alt = 0x444444;
      
      // Apply crust composition modifiers
      if (fe > 0.05) {
        base = mixHex(base, 0x9b3f25, clamp(fe * 8, 0.2, 0.9)); // Red/Orange from Iron
        alt = mixHex(alt, 0x4a180b, clamp(fe * 8, 0.2, 0.9));
      }
      if (c > 0.04) {
        base = mixHex(base, 0x15171b, clamp(c * 10, 0.3, 0.9)); // Dark from Carbon
        alt = mixHex(alt, 0x0a0b0d, clamp(c * 10, 0.3, 0.9));
      }
      if (s > 0.05) {
        base = mixHex(base, 0xc9b77e, clamp(s * 8, 0.2, 0.8)); // Yellow/Brown from Sulfur
        alt = mixHex(alt, 0x8c7042, clamp(s * 8, 0.2, 0.8));
      }
      
      // Apply ice modifiers
      if (ice > 0.1) {
        base = mixHex(base, 0xd6edf7, clamp(ice * 2.5, 0.2, 0.9)); // White/Cyan from Ice
        alt = mixHex(alt, 0x8ab9d4, clamp(ice * 2.5, 0.2, 0.9));
      }

      // Mix in the base visual config for extra variety
      base = mixHex(base, visuals.surfaceBaseColor, 0.3);
      alt = mixHex(alt, visuals.surfaceHighColor, 0.3);

      return {
        base,
        alt,
        accent: mixHex(base, 0xffffff, 0.4),
        atmosphere: visuals.atmosColor || mixHex(base, 0x88bbff, 0.4),
      };
    }
  }
}

export function isEarthLikeExosphere(planet: Planet, visuals: PlanetVisualConfig): boolean {
  if (planet.hasLife || visuals.hasBiomes) return true;
  if (planet.type === 'terrestrial' && visuals.hasOcean && visuals.waterCoverage > 0.08) return true;
  return visuals.hasRivers || (visuals.hasOcean && visuals.hasSignificantClouds && !visuals.isVenusLike);
}

export function getAaaPlanetVisualSpec(planet: Planet, visuals: PlanetVisualConfig): AaaPlanetVisualSpec | null {
  let archetype: AaaPlanetArchetype = 'rocky_barren';
  
  if (isEarthLikeExosphere(planet, visuals)) {
    archetype = 'terran_ocean'; // Use a generic terran archetype for mapping
  } else if (planet.type === 'gas-giant') {
    archetype = 'jupiter';
  } else if (planet.type === 'ice-giant') {
    archetype = planet.surfaceTempK > 210 ? 'uranus' : 'neptune';
  } else if (visuals.isVenusLike) {
    archetype = 'toxic_greenhouse';
  } else if (visuals.hasLavaFlows || planet.surfaceTempK > 760) {
    archetype = 'lava_volcanic';
  } else {
    archetype = getSystemPlanetTextureId(planet);
  }

  let shaderType = 4;
  switch (archetype) {
    case 'jupiter': shaderType = 1; break;
    case 'uranus': shaderType = 3; break;
    case 'neptune': shaderType = 6; break;
    case 'rocky_red_iron':
    case 'iron_rich':
    case 'desert_arid':
    case 'hot_desert':
    case 'temperate_desert':
      shaderType = 2; // Mars shader
      break;
    case 'rocky_airless_cratered':
    case 'rocky_barren':
    case 'silicate_cratered':
    case 'dwarf_icy_rocky':
      shaderType = 4; // Mercury shader
      break;
    case 'toxic_greenhouse':
    case 'acid_cloud_world_surface':
      shaderType = 5; // Venus shader
      break;
    case 'lava_volcanic':
    case 'volcanic_ash':
      shaderType = 7; // Lava shader
      break;
    case 'frozen_ice':
    case 'methane_lakes':
    case 'ammonia_cold':
      shaderType = 8; // Frozen shader
      break;
    case 'salt_flat':
      shaderType = 9; // Salt shader
      break;
    case 'carbon_world':
    case 'rocky_dark_basalalt':
      shaderType = 10; // Carbon shader
      break;
    case 'terran_ice_ocean':
    case 'terran_ocean':
    case 'terran_archipelago':
    case 'terran_continental':
      shaderType = 11; // Terran shader
      break;
    default:
      shaderType = 4;
  }

  return {
    archetype,
    shaderType,
    palette: paletteFor(archetype, planet, visuals),
  };
}

export function createAaaPlanetUniforms(
  planet: Planet,
  star: Star,
  visuals: PlanetVisualConfig,
  quality: number,
): Record<string, THREE.IUniform> | null {
  const spec = getAaaPlanetVisualSpec(planet, visuals);
  if (!spec) return null;
  const crust = planet.resources?.crustComposition ?? {};
  const fe = clamp((crust.Fe ?? 0) / 0.1, 0, 1);
  const s = clamp((crust.S ?? 0) / 0.05, 0, 1);
  const c = clamp((crust.C ?? 0) / 0.05, 0, 1);
  const ice = clamp(visuals.iceCapFraction + (planet.surfaceTempK < 230 ? 0.35 : 0), 0, 1);
  const atmospherePressure = planet.atmosphere?.surfacePressureAtm ?? 0;
  const starDistanceScale = Math.max(0.65, Math.min(1.35, Math.pow(star.luminositySolar, 0.08)));

  // Star spectral tint for the incoming light: planets around M dwarfs bathe
  // in warm amber light, F/A-class worlds in cool white-blue. Mixed toward
  // white so albedo colors stay readable (pure star color over-saturates).
  const starTint = new THREE.Color(star.colorHex).lerp(new THREE.Color(1, 1, 1), 0.55);

  return {
    baseColor: { value: numToColor(spec.palette.base) },
    altColor: { value: numToColor(spec.palette.alt) },
    accentColor: { value: numToColor(spec.palette.accent) },
    atmosphereColor: { value: numToColor(spec.palette.atmosphere) },
    planetType: { value: spec.shaderType },
    sunPos: { value: STAR_SPRITE_POSITION.clone() },
    time: { value: 0.0 },
    seed: { value: planet.seed },
    quality: { value: quality },
    stormIntensity: { value: clamp(0.42 + visuals.windIntensity * 0.45 + quality * 0.2, 0, 1.25) },
    craterDensity: { value: clamp((visuals.hasCraters ? 0.7 : 0.2) + fe * 0.25 + seededUnit(planet.seed, 911) * 0.2, 0, 1.2) },
    cloudOpacity: { value: clamp(visuals.cloudDensity * (spec.shaderType === 5 ? 1.0 : 0.45) * quality, 0, 0.9) },
    atmosphereStrength: {
      value: clamp((visuals.hasAtmosphere ? 0.18 + Math.sqrt(Math.max(0, atmospherePressure)) * 0.07 : 0) * starDistanceScale, 0, (planet.type === 'gas-giant' || planet.type === 'ice-giant') ? 0.45 : 2.6),
    },
    metallic: { value: fe },
    sulfur: { value: s },
    carbon: { value: c },
    ice: { value: ice },
    lava: { value: clamp(visuals.volcanism + s * 0.2, 0, 1) },
    oceanShallow: { value: numToColor(visuals.oceanShallow) },
    oceanDeep: { value: numToColor(visuals.oceanDeep) },
    landThreshold: { value: visuals.hasOcean ? (visuals.waterCoverage - 0.5) * 0.6 : -2.0 },
    biomeTropical: { value: numToColor(visuals.biomeColors.tropical) },
    biomeTemperate: { value: numToColor(visuals.biomeColors.temperate) },
    biomeBoreal: { value: numToColor(visuals.biomeColors.boreal) },
    biomeTundra: { value: numToColor(visuals.biomeColors.tundra) },
    biomeDesert: { value: numToColor(visuals.biomeColors.desert) },

    // Living-world & climate uniforms (terran shader, type 11)
    cityLights: { value: visuals.cityLightIntensity },
    bioGlow: { value: visuals.bioGlowIntensity },
    climateShift: { value: visuals.climateShift },
    vegCoverage: { value: visuals.vegetationCoverage },
    starTint: { value: starTint },
    cloudTint: { value: numToColor(visuals.cloudColor) },
  };
}

export function createAaaPlanetMaterial(
  planet: Planet,
  star: Star,
  visuals: PlanetVisualConfig,
  quality: number,
): THREE.ShaderMaterial | null {
  const uniforms = createAaaPlanetUniforms(planet, star, visuals, quality);
  if (!uniforms) return null;
  return new THREE.ShaderMaterial({
    vertexShader: aaaPlanetVertexShader,
    fragmentShader: aaaPlanetFragmentShader,
    uniforms,
  });
}
