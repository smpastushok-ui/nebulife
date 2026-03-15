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

/** Lighten a color by blending toward white */
function lightenColor(color: number, factor: number): number {
  const r = ((color >> 16) & 0xff);
  const g = ((color >> 8) & 0xff);
  const b = (color & 0xff);
  const lr = Math.round(r + (255 - r) * factor);
  const lg = Math.round(g + (255 - g) * factor);
  const lb = Math.round(b + (255 - b) * factor);
  return (lr << 16) | (lg << 8) | lb;
}

/**
 * Render a planet as a volumetric mini-sphere with multi-layer 3D lighting.
 * The lightingGroup rotates to track the star direction.
 * Colors derived from physical parameters via derivePlanetVisuals.
 */
export function renderPlanet(planet: Planet, star: Star): PlanetRenderResult {
  const container = new Container();
  const visuals = derivePlanetVisuals(planet, star);
  const color = getPlanetDisplayColor(planet, star);
  const size = getPlanetSize(planet);
  const isGiant = visuals.isGasGiant || visuals.isIceGiant;

  // Lighting group — rotated by SystemScene to face the star
  const lightingGroup = new Container();

  // === Multi-layer atmosphere glow ===
  if (visuals.hasAtmosphere) {
    const atmoGfx = new Graphics();
    const layers = isGiant ? 5 : 4;
    const maxRadius = isGiant ? size + 10 : size + 7;
    for (let i = 0; i < layers; i++) {
      const t = i / (layers - 1); // 0..1
      const r = maxRadius - t * (maxRadius - size - 1);
      const a = 0.03 + t * 0.12;
      atmoGfx.circle(0, 0, r);
      atmoGfx.fill({ color: visuals.atmosColor, alpha: a });
    }
    container.addChild(atmoGfx);
  }

  // === Dark base (shadow side — full circle, deeper shadow) ===
  const darkBase = new Graphics();
  darkBase.circle(0, 0, size);
  darkBase.fill({ color: darkenColor(color, 0.15), alpha: 1 });
  container.addChild(darkBase);

  // === Multi-layer gradient lighting (4 concentric offset circles) ===
  // Creates smooth terminator transition from dark to lit side
  const litLayers = new Graphics();
  const layerData = [
    { offset: 0.05, radius: 0.98, brightness: 0.35, alpha: 0.6 },
    { offset: 0.10, radius: 0.94, brightness: 0.55, alpha: 0.7 },
    { offset: 0.18, radius: 0.88, brightness: 0.80, alpha: 0.8 },
    { offset: 0.25, radius: 0.80, brightness: 1.00, alpha: 0.9 },
  ];
  for (const layer of layerData) {
    const layerColor = lerpColor(darkenColor(color, 0.3), color, layer.brightness);
    litLayers.circle(size * layer.offset, 0, size * layer.radius);
    litLayers.fill({ color: layerColor, alpha: layer.alpha });
  }
  lightingGroup.addChild(litLayers);

  // === Gas giant / ice giant bands ===
  if (isGiant) {
    const bandCount = visuals.isGasGiant ? 7 : 4;
    const bandGfx = new Graphics();
    for (let i = 0; i < bandCount; i++) {
      const t = (i + 0.5) / bandCount;
      const bandY = (t - 0.5) * size * 1.7;
      const bandWidth = size * (0.12 + (i % 3) * 0.05);
      const bandColor = i % 2 === 0 ? visuals.bandColor1 : visuals.bandColor2;
      bandGfx.ellipse(size * 0.08, bandY, size * 0.82, bandWidth * 0.4);
      bandGfx.fill({ color: bandColor, alpha: 0.3 });
    }
    lightingGroup.addChild(bandGfx);

    // Subtle equatorial brightening
    const eqGlow = new Graphics();
    eqGlow.ellipse(size * 0.15, 0, size * 0.6, size * 0.12);
    eqGlow.fill({ color: lightenColor(visuals.bandColor1, 0.3), alpha: 0.1 });
    lightingGroup.addChild(eqGlow);
  }

  // === Terminator line (day/night boundary) ===
  const terminator = new Graphics();
  terminator.ellipse(0, 0, size * 0.15, size * 0.95);
  terminator.fill({ color: 0x000000, alpha: 0.18 });
  lightingGroup.addChild(terminator);

  // === Fresnel rim (bright edge on lit side) ===
  const rim = new Graphics();
  rim.circle(size * 0.3, 0, size);
  rim.stroke({ width: size * 0.08, color: lightenColor(color, 0.5), alpha: 0.2 });
  lightingGroup.addChild(rim);

  // === Specular highlight (bright spot near light direction) ===
  const specGfx = new Graphics();
  // Wide soft glow
  specGfx.circle(size * 0.25, -size * 0.08, size * 0.5);
  specGfx.fill({ color: 0xffffff, alpha: 0.08 });
  // Medium highlight
  specGfx.circle(size * 0.32, -size * 0.12, size * 0.3);
  specGfx.fill({ color: 0xffffff, alpha: 0.18 });
  // Sharp specular
  specGfx.circle(size * 0.38, -size * 0.15, size * 0.15);
  specGfx.fill({ color: 0xffffff, alpha: 0.4 });
  lightingGroup.addChild(specGfx);

  // === Limb darkening (dark edge ring — thicker for more volume) ===
  const limb = new Graphics();
  limb.circle(0, 0, size);
  limb.stroke({ width: size * 0.25, color: 0x000000, alpha: 0.3 });
  container.addChild(limb);

  // === Inner limb (softer, wider) ===
  const innerLimb = new Graphics();
  innerLimb.circle(0, 0, size * 0.92);
  innerLimb.stroke({ width: size * 0.15, color: 0x000000, alpha: 0.1 });
  container.addChild(innerLimb);

  // Add lighting group to container
  container.addChild(lightingGroup);

  // === Ring system for massive gas giants ===
  if (planet.type === 'gas-giant' && planet.massEarth > 50) {
    const ringGfx = new Graphics();
    // Outer ring
    ringGfx.ellipse(0, 0, size * 1.9, size * 0.35 * Y_COMPRESS);
    ringGfx.stroke({ width: 3, color: 0xccbb99, alpha: 0.15 });
    // Main ring
    ringGfx.ellipse(0, 0, size * 1.7, size * 0.32 * Y_COMPRESS);
    ringGfx.stroke({ width: 2.5, color: 0xddccaa, alpha: 0.25 });
    // Inner ring
    ringGfx.ellipse(0, 0, size * 1.45, size * 0.27 * Y_COMPRESS);
    ringGfx.stroke({ width: 1.5, color: 0xaa9977, alpha: 0.2 });
    // Gap ring
    ringGfx.ellipse(0, 0, size * 1.55, size * 0.29 * Y_COMPRESS);
    ringGfx.stroke({ width: 0.5, color: 0x020510, alpha: 0.3 });
    container.addChild(ringGfx);
  }

  // === Life indicator (pulsing green glow) ===
  if (planet.hasLife) {
    const lifeGfx = new Graphics();
    lifeGfx.circle(0, 0, size + 7);
    lifeGfx.stroke({ width: 1, color: 0x44ff88, alpha: 0.25 });
    lifeGfx.circle(0, 0, size + 5);
    lifeGfx.stroke({ width: 1.5, color: 0x44ff88, alpha: 0.45 });
    container.addChild(lifeGfx);
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
    resolution: 3,
  });
  label.anchor.set(0.5, 0);
  label.y = size + 8;
  container.addChild(label);

  return { container, lightingGroup };
}

/** Moon composition colors for system-view scale (small dots) */
const MOON_COLORS: Record<string, number> = {
  rocky: 0x997755,
  icy: 0x99ccee,
  metallic: 0xaabbbb,
  volcanic: 0xcc6633,
};

/**
 * Render a tiny moon dot for the system view.
 * Composition-driven color with volumetric shading.
 */
export function renderSystemMoon(compositionType: string, radius: number): Graphics {
  const gfx = new Graphics();
  const color = MOON_COLORS[compositionType] ?? 0x888899;
  // Dark base
  gfx.circle(0, 0, radius);
  gfx.fill({ color: darkenColor(color, 0.4), alpha: 0.9 });
  // Lit side
  gfx.circle(radius * 0.15, 0, radius * 0.85);
  gfx.fill({ color, alpha: 0.85 });
  // Specular highlight
  gfx.circle(radius * 0.3, -radius * 0.2, radius * 0.35);
  gfx.fill({ color: 0xffffff, alpha: 0.2 });
  // Limb darkening
  if (radius > 2) {
    gfx.circle(0, 0, radius);
    gfx.stroke({ width: radius * 0.3, color: 0x000000, alpha: 0.2 });
  }
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
