import { Container, Graphics } from 'pixi.js';
import { SimplexNoise, SeededRNG, smoothstep } from '@nebulife/core';
import type { Star, Planet, MoonComposition } from '@nebulife/core';
import { derivePlanetVisuals, lerpColor, clamp, type PlanetVisualConfig } from './PlanetVisuals.js';

/** Convert hex color string (#rrggbb) to number */
function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/** Result from renderPlanetCloseup — layers that can be animated */
export interface PlanetCloseupResult {
  container: Container;
  surfaceGroup: Container;
  cloudGroup: Container;
  terminatorGroup: Container;
  radius: number;
}

/** LOD options for planet rendering quality */
export interface PlanetCloseupOptions {
  lodMultiplier: number;
  terrainOctaves: number;
  cloudOctaves: number;
  terminatorSteps: number;
  cloudStep: number;
}

const DEFAULT_OPTIONS: PlanetCloseupOptions = {
  lodMultiplier: 1,
  terrainOctaves: 5,
  cloudOctaves: 4,
  terminatorSteps: 20,
  cloudStep: 1.5,
};

/**
 * Render a planet close-up — data-driven from physical parameters.
 * Simple orthographic projection (one hemisphere visible).
 * Supports LOD via lodMultiplier (renders at larger radius, caller scales down).
 */
export function renderPlanetCloseup(
  planet: Planet,
  star: Star,
  baseRadius: number,
  options?: Partial<PlanetCloseupOptions>,
): PlanetCloseupResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const radius = baseRadius * opts.lodMultiplier;
  const container = new Container();
  const visuals = derivePlanetVisuals(planet, star);
  const seed = planet.seed;
  const noise = new SimplexNoise(seed);
  const moistureNoise = new SimplexNoise(seed + 333);

  // --- Layer 0: Opaque blocker disk ---
  const blocker = new Graphics();
  blocker.circle(0, 0, radius);
  blocker.fill({ color: 0x000510, alpha: 1.0 });
  container.addChild(blocker);

  // --- Layer 1: Atmosphere glow (smooth gradient rings) ---
  if (visuals.hasAtmosphere) {
    const atmoGlow = new Graphics();
    const ringCount = visuals.atmosRingCount * 3; // 3x more rings for smooth gradient
    for (let i = ringCount - 1; i >= 0; i--) {
      const t = i / Math.max(1, ringCount - 1);
      const r = radius + 3 + t * 50;
      const alpha = visuals.atmosOpacity * Math.pow(1 - t, 2.5) / 3; // divide by 3 for more rings
      const color = lerpColor(visuals.atmosColor, lerpColor(visuals.atmosColor, 0x000000, 0.4), t);
      atmoGlow.circle(0, 0, r);
      atmoGlow.fill({ color, alpha });
    }
    container.addChild(atmoGlow);

    // Bright limb — thin colored line at planet edge
    const limbGfx = new Graphics();
    limbGfx.circle(0, 0, radius);
    limbGfx.stroke({ width: 3, color: visuals.limbColor, alpha: visuals.atmosOpacity * 2.5 });
    limbGfx.circle(0, 0, radius - 2);
    limbGfx.stroke({ width: 1.5, color: lerpColor(visuals.limbColor, 0xffffff, 0.3), alpha: visuals.atmosOpacity * 1.5 });
    container.addChild(limbGfx);
  }

  // --- Layer 2: Ocean/surface base disk ---
  if (visuals.isGasGiant || visuals.isIceGiant) {
    const base = new Graphics();
    base.circle(0, 0, radius);
    base.fill({ color: visuals.bandColor2, alpha: 1.0 });
    container.addChild(base);
  } else if (visuals.hasOcean) {
    const ocean = new Graphics();
    ocean.circle(0, 0, radius);
    ocean.fill({ color: visuals.oceanDeep, alpha: 1.0 });
    container.addChild(ocean);
  } else {
    const surfaceBase = new Graphics();
    surfaceBase.circle(0, 0, radius);
    surfaceBase.fill({ color: visuals.surfaceBaseColor, alpha: 1.0 });
    container.addChild(surfaceBase);
  }

  // --- Layer 3: Surface ---
  const surfaceGroup = new Container();
  const noiseScale = 1.8;
  const pixelStep = 2;
  const dotSize = pixelStep * 1.05;

  if (visuals.isGasGiant || visuals.isIceGiant) {
    // === Gas/Ice giant: horizontal bands ===
    const surfaceGfx = renderGiantBands(visuals, radius, seed, opts, noise);
    surfaceGroup.addChild(surfaceGfx);
  } else {
    // === Rocky/Dwarf: terrain with biomes, ocean, ice, lava ===
    const surfaceGfx = new Graphics();
    // Base color used as darkening target for limb effect
    const darkBase = visuals.hasOcean ? visuals.oceanDeep : visuals.surfaceBaseColor;

    // Crater noise (separate seed, created once outside loop)
    const craterNoise = visuals.hasCraters ? new SimplexNoise(seed + 777) : null;

    // Ice cap: convert area fraction → latitude threshold using spherical geometry
    // On a sphere, area fraction f maps to latitude threshold asin(1-f)/(π/2)
    const iceLatThreshold = visuals.iceCapFraction > 0
      ? Math.asin(1 - visuals.iceCapFraction) / (Math.PI / 2)
      : 1;

    for (let py = -radius; py <= radius; py += pixelStep) {
      const yFrac = py / radius;
      const maxXAtY = Math.sqrt(Math.max(0, 1 - yFrac * yFrac)) * radius;
      if (maxXAtY < 1) continue;

      for (let px = -maxXAtY; px <= maxXAtY; px += pixelStep) {
        // Orthographic: map screen position directly to sphere point
        const sx = px / radius;
        const sy = py / radius;
        const sz = Math.sqrt(Math.max(0, 1 - sx * sx - sy * sy));

        // Limb darkening factor (1 at center, 0 at edge)
        const diskDist = Math.sqrt(px * px + py * py);
        const limbFactor = 1.0 - (diskDist / radius);

        // Terrain elevation
        const elevation = noise.fbm3D(sx * noiseScale, sy * noiseScale, sz * noiseScale, opts.terrainOctaves);
        const moisture = moistureNoise.fbm3D(sx * 2.5, sy * 2.5, sz * 2.5, Math.max(2, opts.terrainOctaves - 1));
        const latitude = Math.abs(yFrac);

        let dotColor: number;

        // --- Ice caps (smooth gradient with white/gray/blue tones) ---
        if (visuals.iceCapFraction > 0) {
          const iceEdgeNoise = noise.fbm3D(sx * 5, sy * 5, sz * 5, 3) * 0.10;
          const effectiveIceLat = iceLatThreshold + iceEdgeNoise;
          // Smooth transition zone from biome/water into ice
          const iceTransitionWidth = 0.08;
          const iceBlend = clamp((latitude - effectiveIceLat) / iceTransitionWidth, 0, 1);

          if (iceBlend > 0) {
            const iceDetail = noise.fbm3D(sx * 8, sy * 8, sz * 8, 3);
            const iceCoarse = noise.fbm3D(sx * 3, sy * 3, sz * 3, 2);

            // Pick ice color based on noise → variety of white/gray/blue
            let iceColor: number;
            if (iceDetail > 0.15) {
              // Fresh snow: bright white
              iceColor = 0xf0f4ff;
            } else if (iceDetail > -0.05) {
              // Packed ice: blue-white
              iceColor = lerpColor(0xd8e4f4, 0xc8d8ee, clamp(iceCoarse + 0.5, 0, 1));
            } else if (iceDetail > -0.2) {
              // Old ice: gray-blue
              iceColor = lerpColor(0xb0bcc8, 0x99aabb, clamp(iceCoarse + 0.5, 0, 1));
            } else {
              // Frozen rock / crevasse: dark blue-gray
              iceColor = lerpColor(0x667788, 0x778899, clamp(iceDetail + 0.5, 0, 1));
            }

            // Mountains in ice zone → snowy dark-gray peaks
            if (elevation > 0.3) {
              const snowyMtn = lerpColor(0x8090a0, 0xd0dae4, clamp((elevation - 0.3) / 0.3, 0, 1));
              iceColor = lerpColor(iceColor, snowyMtn, 0.6);
            }

            const brightness = (0.5 + limbFactor * 0.4) * (0.6 + iceBlend * 0.4);
            const fullIce = lerpColor(darkBase, iceColor, brightness);

            if (iceBlend >= 1) {
              dotColor = fullIce;
            } else {
              // Transition zone: blend ice over whatever biome/ocean is below
              let baseColor: number;
              if (visuals.hasOcean && elevation < visuals.landThreshold) {
                // Water → ice transition (frozen shore): neutral blue-gray
                baseColor = lerpColor(darkBase, 0x5a6a7a, 0.3 + limbFactor * 0.5);
              } else {
                // Land → ice: neutral gray-brown (avoid green/purple artifacts)
                baseColor = lerpColor(darkBase, 0x707068, 0.3 + limbFactor * 0.5);
              }
              dotColor = lerpColor(baseColor, fullIce, iceBlend);
            }

            surfaceGfx.circle(px, py, dotSize);
            surfaceGfx.fill({ color: dotColor, alpha: 1.0 });
            continue;
          }
        }

        // --- Lava flows ---
        if (visuals.hasLavaFlows) {
          const lavaNoise = noise.fbm3D(sx * 5, sy * 5, sz * 5, 4);
          if (lavaNoise > 0.2) {
            const lavaIntensity = clamp((lavaNoise - 0.2) / 0.5, 0, 1);
            const lavaColor = lerpColor(0x661100, visuals.lavaColor, lavaIntensity);
            const brightness = 0.5 + limbFactor * 0.5;
            dotColor = lerpColor(darkBase, lavaColor, brightness);
            surfaceGfx.circle(px, py, dotSize);
            surfaceGfx.fill({ color: dotColor, alpha: 1.0 });
            continue;
          }
        }

        // --- Ocean ---
        if (visuals.hasOcean && elevation < visuals.landThreshold) {
          const depth = clamp((visuals.landThreshold - elevation) / 0.6, 0, 1);
          const isShore = elevation > visuals.landThreshold - 0.03;
          const isCoastal = elevation > visuals.landThreshold - 0.08;
          let oceanColor: number;
          if (isShore) {
            // Rocky shoreline: blend of land and shallow water
            const shoreDetail = noise.fbm3D(sx * 12, sy * 12, sz * 12, 2);
            oceanColor = lerpColor(visuals.surfaceBaseColor, visuals.oceanShallow, 0.5 + shoreDetail * 0.3);
          } else if (isCoastal) {
            oceanColor = lerpColor(visuals.oceanShallow, visuals.oceanDeep, depth * 0.3);
          } else {
            // Deep ocean: add trench variation
            const trenchNoise = noise.fbm3D(sx * 3, sy * 3, sz * 3, 2);
            const trenchDepth = clamp(depth + trenchNoise * 0.2, 0, 1);
            oceanColor = lerpColor(visuals.oceanShallow, visuals.oceanDeep, trenchDepth);
          }
          const brightness = 0.3 + limbFactor * 0.6;
          dotColor = lerpColor(darkBase, oceanColor, brightness);
          surfaceGfx.circle(px, py, dotSize);
          surfaceGfx.fill({ color: dotColor, alpha: 1.0 });
          continue;
        }

        // --- Land ---
        if (elevation >= visuals.landThreshold || !visuals.hasOcean) {
          let h = visuals.hasOcean ? elevation - visuals.landThreshold : elevation + 0.5;

          // Mountain ridge enhancement: secondary noise amplifies high areas
          if (h > 0.2) {
            const ridge = noise.fbm3D(sx * 6, sy * 6, sz * 6, 3);
            const ridgeBoost = clamp(ridge * 0.18, -0.05, 0.18);
            h = h + ridgeBoost * clamp((h - 0.2) / 0.3, 0, 1);
          }

          let color: number;

          if (visuals.hasBiomes) {
            color = sampleBiomeColor(visuals, latitude, h, moisture);
          } else {
            const t = clamp(h / 0.8, 0, 1);
            color = lerpColor(visuals.surfaceBaseColor, visuals.surfaceHighColor, t);
          }

          if (h > 0.5 && planet.surfaceTempK < 350) {
            const snowFade = clamp((h - 0.5) / 0.3, 0, 1);
            color = lerpColor(color, 0xccdde8, snowFade * 0.6);
          }

          // Crater overlay for airless worlds
          if (craterNoise) {
            const cLarge = craterNoise.fbm3D(sx * 4, sy * 4, sz * 4, 3);
            const cMedium = craterNoise.fbm3D(sx * 8, sy * 8, sz * 8, 2);

            // Large craters: floor darkening + rim highlight
            if (cLarge > 0.45) {
              const craterT = clamp((cLarge - 0.45) / 0.25, 0, 1);
              color = lerpColor(color, visuals.craterColor, 0.5 + craterT * 0.25);
            } else if (cLarge > 0.38) {
              const rimT = (cLarge - 0.38) / 0.07;
              color = lerpColor(color, visuals.craterRimColor, rimT * 0.5);
            }

            // Medium craters (pockmarks)
            if (cMedium > 0.50) {
              const craterT = clamp((cMedium - 0.50) / 0.25, 0, 1);
              color = lerpColor(color, visuals.craterColor, 0.3 + craterT * 0.15);
            } else if (cMedium > 0.44) {
              const rimT = (cMedium - 0.44) / 0.06;
              color = lerpColor(color, visuals.craterRimColor, rimT * 0.3);
            }
          }

          const brightness = 0.3 + limbFactor * 0.7;
          dotColor = lerpColor(darkBase, color, brightness);
          surfaceGfx.circle(px, py, dotSize);
          surfaceGfx.fill({ color: dotColor, alpha: 1.0 });
        }
      }
    }

    surfaceGroup.addChild(surfaceGfx);
  }

  // Mask surface to perfect circle — eliminates edge "teeth" from square dots
  const surfaceMask = new Graphics();
  surfaceMask.circle(0, 0, radius);
  surfaceMask.fill({ color: 0xffffff });
  container.addChild(surfaceMask);
  surfaceGroup.mask = surfaceMask;
  container.addChild(surfaceGroup);

  // --- Layer 5: Terminator (day/night) — single smooth continuous gradient ---
  const terminatorGroup = new Container();
  const terminator = new Graphics();
  const terminatorNoise = new SimplexNoise(seed + 555);
  const tSteps = opts.terminatorSteps * 2; // double steps for smoother gradient

  for (let i = 0; i < tSteps; i++) {
    const t = (i + 1) / tSteps;

    // Single continuous color gradient: warm sunset → deep space
    let shadowColor: number;
    if (t < 0.08) {
      // Thin warm sunset strip
      shadowColor = lerpColor(0x884433, 0x663322, t / 0.08);
    } else if (t < 0.25) {
      // Sunset → twilight
      shadowColor = lerpColor(0x663322, 0x221825, (t - 0.08) / 0.17);
    } else if (t < 0.5) {
      // Twilight → deep shadow
      shadowColor = lerpColor(0x221825, 0x080510, (t - 0.25) / 0.25);
    } else {
      // Deep shadow → near black
      shadowColor = lerpColor(0x080510, 0x020308, (t - 0.5) / 0.5);
    }

    // Noise displacement — subtle irregularity
    const noiseDisp = terminatorNoise.fbm3D(t * 4, 0, seed * 0.01, 3)
      * radius * 0.04 * (1 - t * 0.7);
    // Shadow starts at 40% from center → most of the front face is lit
    const xOffset = radius * (0.4 + t * 0.5) + noiseDisp;
    const circR = radius * (0.92 + t * 0.3);
    // Gradual alpha ramp — very soft entry, lighter shadow
    const alpha = smoothstep(0, 0.5, t) * 0.045;

    terminator.circle(xOffset, 0, circR);
    terminator.fill({ color: shadowColor, alpha });
  }

  // Sunset glow arc — subtle warm edge at terminator line
  const sunsetGlow = new Graphics();
  sunsetGlow.arc(radius * 0.4, 0, radius * 0.85, -Math.PI * 0.3, Math.PI * 0.3);
  sunsetGlow.stroke({ width: 5, color: 0x884433, alpha: 0.03 });
  terminator.addChild(sunsetGlow);
  terminatorGroup.addChild(terminator);

  // Mask terminator to planet circle
  const terminatorMask = new Graphics();
  terminatorMask.circle(0, 0, radius);
  terminatorMask.fill({ color: 0xffffff });
  container.addChild(terminatorMask);
  terminatorGroup.mask = terminatorMask;
  container.addChild(terminatorGroup);

  // --- Layer 5b: City lights (surface-tied, additive blend reveals them on dark side) ---
  if (planet.lifeComplexity === 'intelligent' && planet.hasLife) {
    const cityLightsGroup = new Container();
    cityLightsGroup.blendMode = 'add'; // additive: glow on dark, invisible on bright
    const cityLights = new Graphics();
    const cityNoise = new SimplexNoise(seed + 1234);
    const cityStep = pixelStep * 2;

    for (let py = -radius; py <= radius; py += cityStep) {
      const yFrac = py / radius;
      const maxXAtY = Math.sqrt(Math.max(0, 1 - yFrac * yFrac)) * radius;
      if (maxXAtY < 1) continue;

      for (let px = -maxXAtY; px <= maxXAtY; px += cityStep) {
        const sx = px / radius;
        const sy = py / radius;
        const sz = Math.sqrt(Math.max(0, 1 - sx * sx - sy * sy));
        const lat = Math.abs(yFrac);

        // Only on land, not in deep ice zones
        const elev = noise.fbm3D(sx * noiseScale, sy * noiseScale, sz * noiseScale, opts.terrainOctaves);
        if (visuals.hasOcean && elev < visuals.landThreshold) continue;
        if (lat > 0.85) continue;

        // Cluster using noise — cities form in patches
        const cityVal = cityNoise.fbm3D(sx * 6, sy * 6, sz * 6, 3);
        const coastBonus = (visuals.hasOcean && elev < visuals.landThreshold + 0.15) ? 0.15 : 0;
        const tropicBonus = lat < 0.4 ? 0.08 : 0;

        if (cityVal + coastBonus + tropicBonus > 0.25) {
          const intensity = clamp((cityVal - 0.15) * 2.0, 0.3, 1.0);
          const dotR = 0.3 + intensity * 0.4;
          const lightColor = lerpColor(0xffcc55, 0xffeeaa, intensity);
          cityLights.circle(px, py, dotR);
          cityLights.fill({ color: lightColor, alpha: intensity * 0.35 });
        }
      }
    }

    cityLightsGroup.addChild(cityLights);
    // Mask city lights to planet circle
    const cityMask = new Graphics();
    cityMask.circle(0, 0, radius);
    cityMask.fill({ color: 0xffffff });
    container.addChild(cityMask);
    cityLightsGroup.mask = cityMask;
    container.addChild(cityLightsGroup);
  }

  // --- Layer 6: Clouds (orthographic, no strip) ---
  const cloudGroup = new Container();
  if (visuals.hasSignificantClouds) {
    const cloudGraphics = new Graphics();
    const cloudNoise = new SimplexNoise(seed + 777);
    const cloudStep = opts.cloudStep;
    const cloudDotSize = cloudStep * 1.0;

    for (let py = -radius; py <= radius; py += cloudStep) {
      const yFrac = py / radius;
      const maxXAtY = Math.sqrt(Math.max(0, 1 - yFrac * yFrac)) * radius;
      if (maxXAtY < 1) continue;

      for (let px = -maxXAtY; px <= maxXAtY; px += cloudStep) {
        const sx = px / radius;
        const sy = py / radius;
        const sz = Math.sqrt(Math.max(0, 1 - sx * sx - sy * sy));

        const diskDist = Math.sqrt(px * px + py * py);
        const limbFactor = 1.0 - (diskDist / radius);

        // Cyclone pattern: rotational displacement at mid-latitudes (Coriolis effect)
        const absLat = Math.abs(yFrac);
        const cycloneStrength = absLat > 0.15 && absLat < 0.65
          ? Math.sin((absLat - 0.15) * Math.PI / 0.5) * 0.4 : 0;
        const rotOffset = cycloneStrength * Math.sign(yFrac) * 0.3;
        const cx = sx + rotOffset * sz;
        const cz = sz - rotOffset * sx;

        const c1 = cloudNoise.fbm3D(cx * 3, sy * 3, cz * 3, opts.cloudOctaves);
        const c2 = cloudNoise.fbm3D(cx * 8, sy * 8, cz * 8, Math.max(2, opts.cloudOctaves - 1));
        const cloudVal = c1 * 0.7 + c2 * 0.3;

        const threshold = 0.3 - visuals.cloudDensity * 0.2;
        if (cloudVal > threshold) {
          const alpha = clamp((cloudVal - threshold) * 0.55 * limbFactor, 0, 0.45);
          cloudGraphics.circle(px, py, cloudDotSize);
          cloudGraphics.fill({ color: visuals.cloudColor, alpha });
        }
      }
    }
    cloudGroup.addChild(cloudGraphics);
  }

  // Mask clouds to planet circle (needed for drift animation)
  const cloudMask = new Graphics();
  cloudMask.circle(0, 0, radius);
  cloudMask.fill({ color: 0xffffff });
  container.addChild(cloudMask);
  cloudGroup.mask = cloudMask;
  container.addChild(cloudGroup);

  // --- Layer 7: Limb highlight (fixed overlay) ---
  if (visuals.hasAtmosphere) {
    const limbHighlight = new Graphics();
    const highlightAngle = Math.PI * 0.6;
    const startAngle = Math.PI * 0.7;
    limbHighlight.arc(0, 0, radius - 1, startAngle, startAngle + highlightAngle);
    limbHighlight.stroke({ width: 2, color: visuals.limbColor, alpha: 0.2 });
    limbHighlight.arc(0, 0, radius - 2.5, startAngle + 0.05, startAngle + highlightAngle - 0.05);
    limbHighlight.stroke({ width: 1, color: lerpColor(visuals.limbColor, 0xffffff, 0.3), alpha: 0.1 });
    container.addChild(limbHighlight);
  }

  return { container, surfaceGroup, cloudGroup, terminatorGroup, radius };
}

/**
 * Render horizontal band surface for gas/ice giants.
 * Produces Jupiter/Saturn/Neptune-like banded appearance.
 */
function renderGiantBands(
  visuals: PlanetVisualConfig,
  radius: number,
  seed: number,
  opts: PlanetCloseupOptions,
  noise: SimplexNoise,
): Graphics {
  const gfx = new Graphics();
  const stormNoise = new SimplexNoise(seed + 444);
  const pixelStep = 2;
  const dotSize = pixelStep * 1.05;

  const isGas = visuals.isGasGiant;
  const bandCount = isGas ? 14 : 10;

  // Darker base for limb darkening
  const darkBase = isGas ? 0x1a1008 : 0x0a1020;

  // Mid-color for detail variation
  const midColor = lerpColor(visuals.bandColor1, visuals.bandColor2, 0.5);

  for (let py = -radius; py <= radius; py += pixelStep) {
    const yFrac = py / radius;
    const maxXAtY = Math.sqrt(Math.max(0, 1 - yFrac * yFrac)) * radius;
    if (maxXAtY < 1) continue;

    for (let px = -maxXAtY; px <= maxXAtY; px += pixelStep) {
      const sx = px / radius;
      const sy = py / radius;
      const sz = Math.sqrt(Math.max(0, 1 - sx * sx - sy * sy));

      // Limb darkening
      const diskDist = Math.sqrt(px * px + py * py);
      const limbFactor = 1.0 - (diskDist / radius);

      // Band position with noise displacement (wavy band edges)
      const displacement = noise.fbm3D(sx * 2, sy * 0.5, sz * 2, 3) * 0.12;
      const bandPos = (yFrac * 0.5 + 0.5 + displacement) * bandCount;
      const bandIndex = Math.floor(bandPos);
      const bandFrac = bandPos - bandIndex;

      // Smooth transition between bands
      const t = smoothstep(0.3, 0.7, bandFrac);

      // Alternate between two band colors
      const evenBand = bandIndex % 2 === 0;
      let color = evenBand
        ? lerpColor(visuals.bandColor1, visuals.bandColor2, t)
        : lerpColor(visuals.bandColor2, visuals.bandColor1, t);

      // Fine detail noise within bands (texture)
      const detail = noise.fbm3D(sx * 12, sy * 20, sz * 12, Math.max(2, opts.terrainOctaves - 2));
      color = lerpColor(color, midColor, detail * 0.15);

      // Zonal flow distortion (wind patterns)
      const flow = noise.fbm3D(sx * 6 + sy * 2, sy * 3, sz * 6, 3) * 0.06;
      const shiftedColor = lerpColor(color, visuals.bandColor1, Math.abs(flow));
      color = lerpColor(color, shiftedColor, 0.3);

      // Storm spots (gas giants have prominent storms)
      if (isGas) {
        const stormVal = stormNoise.fbm3D(sx * 5, sy * 5, sz * 5, 3);
        if (stormVal > 0.3) {
          const stormIntensity = clamp((stormVal - 0.3) / 0.35, 0, 1);
          // Darker storm with reddish tint
          const stormColor = lerpColor(visuals.bandColor2, 0xaa5533, 0.4);
          color = lerpColor(color, stormColor, stormIntensity * 0.5);
        }
      } else {
        // Ice giants: subtle bright spots
        const spotVal = stormNoise.fbm3D(sx * 4, sy * 4, sz * 4, 3);
        if (spotVal > 0.35) {
          const spotIntensity = clamp((spotVal - 0.35) / 0.4, 0, 1);
          const spotColor = lerpColor(visuals.bandColor1, 0xaaccee, 0.3);
          color = lerpColor(color, spotColor, spotIntensity * 0.4);
        }
      }

      // Polar darkening (bands fade at poles)
      const absLat = Math.abs(yFrac);
      if (absLat > 0.7) {
        const polarDarken = clamp((absLat - 0.7) / 0.3, 0, 1);
        const polarColor = isGas ? 0x443322 : 0x223344;
        color = lerpColor(color, polarColor, polarDarken * 0.5);
      }

      // Apply limb darkening
      const brightness = 0.25 + limbFactor * 0.75;
      const finalColor = lerpColor(darkBase, color, brightness);

      gfx.circle(px, py, dotSize);
      gfx.fill({ color: finalColor, alpha: 1.0 });
    }
  }

  return gfx;
}

/**
 * Sample biome color based on latitude, elevation, and moisture.
 * Creates realistic latitude-dependent biomes like Earth.
 */
function sampleBiomeColor(
  visuals: PlanetVisualConfig,
  latitude: number,
  elevation: number,
  moisture: number,
): number {
  const { biomeColors } = visuals;
  const h = clamp(elevation, 0, 1);

  // Mountain colors override biomes at high elevation
  if (h > 0.35) {
    const t = clamp((h - 0.35) / 0.3, 0, 1);
    const baseColor = latitude < 0.25 ? biomeColors.tropical : biomeColors.temperate;
    return lerpColor(baseColor, visuals.surfaceHighColor, t);
  }

  // --- Tropical zone (0..0.25) ---
  if (latitude < 0.25) {
    // High moisture = jungle, low = desert/savanna
    if (moisture > 0.1) {
      return lerpColor(biomeColors.tropical, biomeColors.temperate, clamp(latitude / 0.25, 0, 1) * 0.3);
    }
    // Dry tropics: desert / savanna
    const savannaFade = clamp((moisture + 0.3) / 0.4, 0, 1);
    return lerpColor(biomeColors.desert, biomeColors.tropical, savannaFade * 0.4);
  }

  // --- Temperate zone (0.25..0.55) ---
  if (latitude < 0.55) {
    const zoneT = (latitude - 0.25) / 0.3; // 0..1 within temperate
    if (moisture > 0) {
      // Forest
      return lerpColor(biomeColors.temperate, biomeColors.boreal, zoneT * 0.5);
    }
    // Dry temperate: grassland/steppe
    return lerpColor(biomeColors.desert, biomeColors.temperate, 0.6);
  }

  // --- Boreal / sub-polar (0.55..0.78) ---
  if (latitude < 0.78) {
    const zoneT = (latitude - 0.55) / 0.23;
    return lerpColor(biomeColors.boreal, biomeColors.tundra, zoneT);
  }

  // --- Polar tundra (0.78+) ---
  return biomeColors.tundra;
}

/** Result from renderMoon — container + rotatable lighting group */
export interface MoonRenderResult {
  container: Container;
  lightingContainer: Container;  // rotate this to aim shadow away from star
}

/** Options for moon visual variety */
export interface MoonRenderOptions {
  compositionType?: MoonComposition;
  surfaceTempK?: number;
}

/**
 * Render a moon with composition-driven colors and rotatable shadow.
 * Shadow is drawn on the +X side (light from -X).
 * Caller rotates lightingContainer.rotation to point shadow away from star.
 */
export function renderMoon(
  seed: number,
  radius: number,
  options?: MoonRenderOptions,
): MoonRenderResult {
  const container = new Container();
  const noise = new SimplexNoise(seed + 999);
  const rng = new SeededRNG(seed * 773 + 31);

  const comp = options?.compositionType ?? 'rocky';
  const temp = options?.surfaceTempK ?? 150;

  // Derive colors from composition
  let baseColor: number;
  let darkColor: number;
  let highlightColor: number;
  let craterColor: number;
  switch (comp) {
    case 'icy':
      baseColor = 0xaabbcc;
      darkColor = 0x778899;
      highlightColor = 0xddeeff;
      craterColor = 0x8899aa;
      break;
    case 'metallic':
      baseColor = 0x998877;
      darkColor = 0x665544;
      highlightColor = 0xccbbaa;
      craterColor = 0x776655;
      break;
    case 'volcanic':
      baseColor = 0x775544;
      darkColor = 0x443322;
      highlightColor = 0xaa7744;
      craterColor = 0x554433;
      break;
    case 'rocky':
    default:
      baseColor = 0x888899;
      darkColor = 0x555566;
      highlightColor = 0xccccdd;
      craterColor = 0x666677;
      break;
  }

  // Opaque blocker disk (prevents stars from shining through)
  const blocker = new Graphics();
  blocker.circle(0, 0, radius);
  blocker.fill({ color: 0x000510, alpha: 1.0 });
  container.addChild(blocker);

  // Subtle glow — tinted by composition
  const glow = new Graphics();
  glow.circle(0, 0, radius + 5);
  glow.fill({ color: lerpColor(baseColor, 0xffffff, 0.3), alpha: 0.04 });
  container.addChild(glow);

  // Base body
  const body = new Graphics();
  body.circle(0, 0, radius);
  body.fill({ color: baseColor, alpha: 1.0 });
  container.addChild(body);

  // Surface texture via noise points
  const surfaceLayer = new Graphics();
  const step = 0.1;
  for (let phi = -Math.PI / 2; phi <= Math.PI / 2; phi += step) {
    for (let theta = -Math.PI / 2; theta <= Math.PI / 2; theta += step) {
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);
      const cosTheta = Math.cos(theta);

      const sx = cosTheta * cosPhi;
      const sy = sinPhi;
      const sz = Math.sin(theta) * cosPhi;

      const screenX = sx * radius;
      const screenY = sy * radius;
      const dist = Math.sqrt(screenX * screenX + screenY * screenY);
      if (dist > radius - 1) continue;

      const n = noise.fbm3D(sx * 3, sy * 3, sz * 3, 3);
      const limbFactor = 1.0 - (dist / radius);

      // Darker patches (maria)
      if (n < -0.15) {
        const dotSize = radius * step * 0.5;
        surfaceLayer.circle(screenX, screenY, dotSize);
        surfaceLayer.fill({ color: darkColor, alpha: 0.3 * limbFactor });
      }

      // Volcanic moons: lava glow spots
      if (comp === 'volcanic' && n > 0.25) {
        const lavaIntensity = clamp((n - 0.25) / 0.3, 0, 1);
        const dotSize = radius * step * 0.5;
        surfaceLayer.circle(screenX, screenY, dotSize);
        surfaceLayer.fill({ color: lerpColor(0x993311, 0xff6622, lavaIntensity), alpha: 0.5 * limbFactor });
      }

      // Icy moons: bright frost patches
      if (comp === 'icy' && n > 0.15) {
        const frostIntensity = clamp((n - 0.15) / 0.4, 0, 1);
        const dotSize = radius * step * 0.5;
        surfaceLayer.circle(screenX, screenY, dotSize);
        surfaceLayer.fill({ color: 0xddeeff, alpha: 0.15 * frostIntensity * limbFactor });
      }

      // Metallic moons: reflective bright streaks
      if (comp === 'metallic' && Math.abs(n) < 0.08) {
        const dotSize = radius * step * 0.4;
        surfaceLayer.circle(screenX, screenY, dotSize);
        surfaceLayer.fill({ color: 0xccbbaa, alpha: 0.15 * limbFactor });
      }
    }
  }
  container.addChild(surfaceLayer);

  // Craters — composition-tinted
  for (let i = 0; i < 8; i++) {
    const angle = rng.next() * Math.PI * 2;
    const dist = rng.next() * radius * 0.7;
    const cx = Math.cos(angle) * dist;
    const cy = Math.sin(angle) * dist;

    if (cx * cx + cy * cy > radius * radius * 0.8) continue;

    const cr = rng.nextFloat(2, radius * 0.15);
    const crater = new Graphics();
    crater.circle(cx, cy, cr);
    crater.stroke({ width: 0.8, color: darkColor, alpha: 0.4 });
    crater.circle(cx + cr * 0.15, cy + cr * 0.15, cr * 0.7);
    crater.fill({ color: craterColor, alpha: 0.2 });
    container.addChild(crater);
  }

  // === Lighting container (shadow + highlight) — rotatable by caller ===
  const lightingContainer = new Container();

  // Highlight — toward light source (drawn on -X side)
  const highlight = new Graphics();
  highlight.circle(-radius * 0.3, -radius * 0.3, radius * 0.2);
  highlight.fill({ color: highlightColor, alpha: 0.1 });
  lightingContainer.addChild(highlight);

  // Shadow — on +X side (away from light)
  const shadow = new Graphics();
  const shadowSteps = 14;
  for (let i = 0; i < shadowSteps; i++) {
    const t = (i + 1) / shadowSteps;
    const xOff = radius * (0.15 + t * 0.55);
    const circR = radius * (0.85 + t * 0.2);
    shadow.circle(xOff, 0, circR);
    shadow.fill({ color: 0x111122, alpha: t * t * 0.05 });
  }
  shadow.circle(radius * 0.8, 0, radius * 0.85);
  shadow.fill({ color: 0x111122, alpha: 0.3 });

  // Mask shadow to moon circle
  const shadowMask = new Graphics();
  shadowMask.circle(0, 0, radius);
  shadowMask.fill({ color: 0xffffff });
  shadow.mask = shadowMask;
  lightingContainer.addChild(shadowMask);
  lightingContainer.addChild(shadow);

  container.addChild(lightingContainer);

  return { container, lightingContainer };
}

/**
 * Render a distant star with lens flare effect.
 */
export function renderDistantStar(star: Star, coreSize: number): Container {
  const container = new Container();
  const color = hexToNum(star.colorHex);

  // Outer halos
  const haloSizes = [coreSize * 8, coreSize * 5, coreSize * 3];
  const haloAlphas = [0.015, 0.03, 0.06];
  for (let i = 0; i < haloSizes.length; i++) {
    const halo = new Graphics();
    halo.circle(0, 0, haloSizes[i]);
    halo.fill({ color, alpha: haloAlphas[i] });
    container.addChild(halo);
  }

  // Lens flare rays — 6 thin triangles
  const rayLayer = new Graphics();
  const rayCount = 6;
  const rayLength = coreSize * 6;
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2 + Math.PI / 12;
    const tipX = Math.cos(angle) * rayLength;
    const tipY = Math.sin(angle) * rayLength;
    const perpAngle = angle + Math.PI / 2;
    const halfWidth = coreSize * 0.12;
    const bx1 = Math.cos(perpAngle) * halfWidth;
    const by1 = Math.sin(perpAngle) * halfWidth;

    rayLayer.moveTo(bx1, by1);
    rayLayer.lineTo(tipX, tipY);
    rayLayer.lineTo(-bx1, -by1);
    rayLayer.fill({ color: 0xffffff, alpha: 0.04 });
  }
  container.addChild(rayLayer);

  // Horizontal streak (anamorphic lens effect)
  const streak = new Graphics();
  const streakLen = coreSize * 10;
  // Right streak
  streak.moveTo(0, -coreSize * 0.08);
  streak.lineTo(streakLen, 0);
  streak.lineTo(0, coreSize * 0.08);
  streak.fill({ color: 0xffffff, alpha: 0.03 });
  // Left streak
  streak.moveTo(0, -coreSize * 0.08);
  streak.lineTo(-streakLen, 0);
  streak.lineTo(0, coreSize * 0.08);
  streak.fill({ color: 0xffffff, alpha: 0.03 });
  container.addChild(streak);

  // Mid glow
  const midGlow = new Graphics();
  midGlow.circle(0, 0, coreSize * 1.8);
  midGlow.fill({ color, alpha: 0.15 });
  container.addChild(midGlow);

  // Core — bright white
  const core = new Graphics();
  core.circle(0, 0, coreSize);
  core.fill({ color: 0xffffff, alpha: 0.95 });
  container.addChild(core);

  // Color overlay on core
  const overlay = new Graphics();
  overlay.circle(0, 0, coreSize * 0.7);
  overlay.fill({ color, alpha: 0.4 });
  container.addChild(overlay);

  return container;
}
