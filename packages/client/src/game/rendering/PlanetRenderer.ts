import { Graphics, Container, Text } from 'pixi.js';
import type { Planet, Star } from '@nebulife/core';
import { derivePlanetVisuals, lerpColor } from './PlanetVisuals.js';

/** Y-axis compression factor for isometric perspective */
export const Y_COMPRESS = 0.55;

/** Get planet visual size (screen pixels) — log-scale for proportional spread */
export function getPlanetSize(planet: Planet): number {
  const minSize = 6;
  const size = minSize + Math.log2(1 + planet.radiusEarth) * 12;
  return Math.max(minSize, Math.min(40, size));
}

/** Darken a color by a factor (0..1, lower = darker) */
function darkenColor(color: number, factor: number): number {
  const r = Math.round(((color >> 16) & 0xff) * factor);
  const g = Math.round(((color >> 8) & 0xff) * factor);
  const b = Math.round((color & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}

/** Get primary display color from planet visuals */
function getPlanetDisplayColor(planet: Planet, star: Star): number {
  const v = derivePlanetVisuals(planet, star);
  if (v.isGasGiant || v.isIceGiant) return v.bandColor1;
  if (v.hasOcean && v.waterCoverage > 0.3) {
    return lerpColor(v.oceanShallow, v.surfaceBaseColor, 0.4);
  }
  if (v.hasBiomes) return v.biomeColors.temperate;
  return v.surfaceBaseColor;
}

export interface PlanetRenderResult {
  container: Container;
  lightingGroup: Container;
}

/**
 * Render a planet as a mini-sphere with 3D-like lighting.
 * The lightingGroup rotates to track the star direction.
 * Colors derived from physical parameters via derivePlanetVisuals.
 */
export function renderPlanet(planet: Planet, star: Star): PlanetRenderResult {
  const container = new Container();
  const visuals = derivePlanetVisuals(planet, star);
  const color = getPlanetDisplayColor(planet, star);
  const size = getPlanetSize(planet);

  // Lighting group — rotated by SystemScene to face the star
  const lightingGroup = new Container();

  // === Atmosphere glow (outer rings) ===
  if (visuals.hasAtmosphere) {
    const atmoOuter = new Graphics();
    atmoOuter.circle(0, 0, size + 5);
    atmoOuter.fill({ color: visuals.atmosColor, alpha: 0.06 });
    container.addChild(atmoOuter);

    const atmoInner = new Graphics();
    atmoInner.circle(0, 0, size + 3);
    atmoInner.fill({ color: visuals.atmosColor, alpha: 0.12 });
    container.addChild(atmoInner);
  }

  // === Dark base (shadow side — full circle) ===
  const darkBase = new Graphics();
  darkBase.circle(0, 0, size);
  darkBase.fill({ color: darkenColor(color, 0.25), alpha: 0.95 });
  container.addChild(darkBase);

  // === Lit hemisphere (offset toward light source, inside lightingGroup) ===
  const litHemi = new Graphics();
  litHemi.circle(size * 0.15, 0, size * 0.92);
  litHemi.fill({ color, alpha: 0.9 });
  lightingGroup.addChild(litHemi);

  // === Gas giant / ice giant bands ===
  if (visuals.isGasGiant || visuals.isIceGiant) {
    const bandCount = visuals.isGasGiant ? 5 : 3;
    for (let i = 0; i < bandCount; i++) {
      const t = (i + 0.5) / bandCount;
      const bandY = (t - 0.5) * size * 1.6;
      const bandWidth = size * (0.2 + Math.random() * 0.15);
      const bandColor = i % 2 === 0 ? visuals.bandColor1 : visuals.bandColor2;
      const band = new Graphics();
      band.ellipse(size * 0.1, bandY, size * 0.85, bandWidth * 0.4);
      band.fill({ color: bandColor, alpha: 0.35 });
      lightingGroup.addChild(band);
    }
  }

  // === Specular highlight (bright spot near light direction) ===
  const specular = new Graphics();
  specular.circle(size * 0.35, -size * 0.15, size * 0.25);
  specular.fill({ color: 0xffffff, alpha: 0.35 });
  lightingGroup.addChild(specular);

  // === Secondary softer highlight ===
  const softHighlight = new Graphics();
  softHighlight.circle(size * 0.2, -size * 0.1, size * 0.55);
  softHighlight.fill({ color: 0xffffff, alpha: 0.1 });
  lightingGroup.addChild(softHighlight);

  // === Limb darkening (dark edge ring) ===
  const limb = new Graphics();
  limb.circle(0, 0, size);
  limb.stroke({ width: size * 0.2, color: 0x000000, alpha: 0.25 });
  container.addChild(limb);

  // Add lighting group to container
  container.addChild(lightingGroup);

  // === Ring for gas giants ===
  if (planet.type === 'gas-giant' && planet.massEarth > 50) {
    const ring = new Graphics();
    ring.ellipse(0, 0, size * 1.8, size * 0.35 * Y_COMPRESS);
    ring.stroke({ width: 2, color: 0xccbb99, alpha: 0.3 });
    // Second thinner ring
    ring.ellipse(0, 0, size * 1.5, size * 0.28 * Y_COMPRESS);
    ring.stroke({ width: 1, color: 0xaa9977, alpha: 0.2 });
    container.addChild(ring);
  }

  // === Life indicator ===
  if (planet.hasLife) {
    const lifeGlow = new Graphics();
    lifeGlow.circle(0, 0, size + 6);
    lifeGlow.stroke({ width: 1.2, color: 0x44ff88, alpha: 0.5 });
    container.addChild(lifeGlow);
  }

  // === Label ===
  const typeName = planet.type === 'gas-giant' ? 'Gas'
    : planet.type === 'ice-giant' ? 'Ice'
    : planet.type === 'rocky' ? 'Rocky' : 'Dwarf';
  const moonStr = planet.moons.length > 0 ? ` ${planet.moons.length}m` : '';
  const nameStr = planet.name.split(' ').pop() ?? '';

  const label = new Text({
    text: `${nameStr}\n${typeName} ${planet.surfaceTempK}K${moonStr}`,
    style: { fontSize: 9, fill: 0x889999, fontFamily: 'monospace', align: 'center', lineHeight: 11 },
  });
  label.anchor.set(0.5, 0);
  label.y = size + 6;
  container.addChild(label);

  return { container, lightingGroup };
}

/** Moon composition colors for system-view scale (small dots) */
const MOON_COLORS: Record<string, number> = {
  rocky: 0x888899,
  icy: 0xaabbcc,
  metallic: 0x998877,
  volcanic: 0x775544,
};

/**
 * Render a tiny moon dot for the system view.
 * Composition-driven color, with subtle highlight.
 */
export function renderSystemMoon(compositionType: string, radius: number): Graphics {
  const gfx = new Graphics();
  const color = MOON_COLORS[compositionType] ?? 0x888899;
  gfx.circle(0, 0, radius);
  gfx.fill({ color, alpha: 0.85 });
  gfx.circle(-radius * 0.25, -radius * 0.25, radius * 0.5);
  gfx.fill({ color: 0xffffff, alpha: 0.15 });
  return gfx;
}

/**
 * Render orbit path as a projected ellipse with dual-stroke glow.
 * @param semiMajorScreen — semi-major axis in screen pixels (already converted from AU)
 * @param eccentricity — orbital eccentricity
 * @param yCompress — Y-axis compression for isometric view
 */
export function renderOrbitProjected(semiMajorScreen: number, eccentricity: number, yCompress: number = Y_COMPRESS): Graphics {
  const a = semiMajorScreen;
  const b = a * Math.sqrt(1 - eccentricity ** 2) * yCompress;
  const c = a * eccentricity;

  const orbit = new Graphics();

  // Outer glow stroke
  orbit.ellipse(-c, 0, a, b);
  orbit.stroke({ width: 3, color: 0x334466, alpha: 0.06 });

  // Inner bright stroke
  orbit.ellipse(-c, 0, a, b);
  orbit.stroke({ width: 0.7, color: 0x445577, alpha: 0.25 });

  return orbit;
}

/**
 * Legacy orbit renderer (non-projected, for backwards compat if needed).
 */
export function renderOrbit(semiMajorScreen: number, eccentricity: number): Graphics {
  const a = semiMajorScreen;
  const b = a * Math.sqrt(1 - eccentricity ** 2);
  const c = a * eccentricity;

  const orbit = new Graphics();
  orbit.ellipse(-c, 0, a, b);
  orbit.stroke({ width: 0.7, color: 0x334466, alpha: 0.35 });

  return orbit;
}
