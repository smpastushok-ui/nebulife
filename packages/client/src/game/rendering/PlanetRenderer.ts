import { Graphics, Container, Sprite, Text, Texture } from 'pixi.js';
import type { Planet, Star } from '@nebulife/core';
import { derivePlanetVisuals, lerpColor } from './PlanetVisuals.js';

/** Y-axis compression factor for isometric perspective */
export const Y_COMPRESS = 0.55;

/** Get planet visual size (screen pixels) — log-scale for proportional spread */
export function getPlanetSize(planet: Planet): number {
  const radius = Math.max(0.08, planet.radiusEarth);

  if (planet.type === 'gas-giant') {
    const t = Math.min(1, Math.log2(1 + radius) / Math.log2(1 + 12));
    return 30 + t * 12;
  }

  if (planet.type === 'ice-giant') {
    const t = Math.min(1, Math.log2(1 + radius) / Math.log2(1 + 5));
    return 24 + t * 8;
  }

  if (planet.type === 'dwarf') {
    const t = Math.min(1, Math.log2(1 + radius) / Math.log2(1 + 0.7));
    return 6 + t * 5;
  }

  const t = Math.min(1, Math.log2(1 + radius) / Math.log2(1 + 2.5));
  return 10 + t * 14;
}

/** Darken a color by a factor (0..1, lower = darker) */
function darkenColor(color: number, factor: number): number {
  const r = Math.round(((color >> 16) & 0xff) * factor);
  const g = Math.round(((color >> 8) & 0xff) * factor);
  const b = Math.round((color & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}

/** Get primary display color from already-derived planet visuals (no double-compute) */
function getPlanetDisplayColorFromVisuals(v: ReturnType<typeof derivePlanetVisuals>): number {
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

export interface PlanetTexturePreviewOptions {
  /** Horizontal texture speed in full map rotations per millisecond. */
  spinRevolutionsPerMs?: number;
  /** Deterministic starting longitude offset, 0..1 of the equirectangular map. */
  initialLongitude?: number;
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

function seededUnit(seed: number, salt: number): number {
  let x = (seed ^ (salt * 0x9e3779b9)) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return ((x >>> 0) % 10000) / 10000;
}

function seededRange(seed: number, salt: number, min: number, max: number): number {
  return min + seededUnit(seed, salt) * (max - min);
}

/**
 * Render a planet as a volumetric mini-sphere with multi-layer 3D lighting.
 * The lightingGroup rotates to track the star direction.
 * Colors derived from physical parameters via derivePlanetVisuals.
 */
export function renderPlanet(planet: Planet, star: Star): PlanetRenderResult {
  const container = new Container();
  const visuals = derivePlanetVisuals(planet, star);
  const baseColor = getPlanetDisplayColorFromVisuals(visuals);
  // Star tint modulation: lit hemisphere takes on star's color (M-dwarf=warm, O/B=cool blue).
  // Subtle 18% blend keeps planet identity but makes each system feel unique.
  const color = lerpColor(baseColor, visuals.starTint, 0.18);
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

  // === Procedural surface detail ===
  // System-view scale still needs texture language: storms, continents, craters,
  // ice caps, and clouds make planets read as worlds instead of flat icons.
  const detailGfx = new Graphics();
  if (isGiant) {
    const bandCount = visuals.isGasGiant ? 11 : 7;
    for (let i = 0; i < bandCount; i++) {
      const t = (i + 0.5) / bandCount;
      const bandY = (t - 0.5) * size * 1.72;
      const wobble = Math.sin(seededRange(planet.seed, i + 10, 0, Math.PI * 2)) * size * 0.05;
      const bandWidth = size * seededRange(planet.seed, i + 40, 0.05, 0.12);
      const bandColor = i % 2 === 0 ? visuals.bandColor1 : visuals.bandColor2;
      detailGfx.ellipse(size * 0.08 + wobble, bandY, size * 0.95, bandWidth);
      detailGfx.fill({ color: bandColor, alpha: i % 2 === 0 ? 0.34 : 0.24 });
    }

    const stormCount = visuals.isGasGiant ? 2 + (Math.abs(planet.seed) % 3) : 1;
    for (let i = 0; i < stormCount; i++) {
      const sx = seededRange(planet.seed, i + 90, -0.35, 0.42) * size;
      const sy = seededRange(planet.seed, i + 120, -0.45, 0.45) * size;
      const stormR = seededRange(planet.seed, i + 150, 0.13, 0.28) * size;
      detailGfx.ellipse(sx, sy, stormR * 1.7, stormR * 0.72);
      detailGfx.fill({ color: lightenColor(visuals.bandColor2, 0.18), alpha: 0.18 });
      detailGfx.ellipse(sx + stormR * 0.18, sy, stormR * 0.85, stormR * 0.34);
      detailGfx.stroke({ color: darkenColor(visuals.bandColor1, 0.62), width: Math.max(0.5, size * 0.035), alpha: 0.28 });
    }
  } else {
    const landColor = visuals.hasBiomes
      ? lerpColor(visuals.biomeColors.temperate, visuals.surfaceHighColor, 0.35)
      : visuals.surfaceHighColor;
    const landCount = visuals.hasOcean ? 6 : 9;
    for (let i = 0; i < landCount; i++) {
      const angle = seededRange(planet.seed, i + 200, 0, Math.PI * 2);
      const dist = seededRange(planet.seed, i + 240, 0.05, 0.72) * size;
      const px = Math.cos(angle) * dist + size * 0.08;
      const py = Math.sin(angle) * dist;
      const patchR = seededRange(planet.seed, i + 280, 0.12, 0.33) * size;
      detailGfx.ellipse(px, py, patchR * 1.35, patchR * seededRange(planet.seed, i + 320, 0.45, 0.78));
      detailGfx.fill({ color: landColor, alpha: visuals.hasOcean ? 0.34 : 0.22 });
    }

    if (visuals.hasCraters || (planet.atmosphere?.surfacePressureAtm ?? 0) < 0.02) {
      const craterCount = 5 + (Math.abs(planet.seed) % 6);
      for (let i = 0; i < craterCount; i++) {
        const angle = seededRange(planet.seed, i + 360, 0, Math.PI * 2);
        const dist = seededRange(planet.seed, i + 390, 0.12, 0.78) * size;
        const cr = seededRange(planet.seed, i + 420, 0.045, 0.105) * size;
        const cx = Math.cos(angle) * dist + size * 0.05;
        const cy = Math.sin(angle) * dist;
        detailGfx.circle(cx, cy, cr);
        detailGfx.stroke({ color: visuals.craterRimColor, width: Math.max(0.4, cr * 0.35), alpha: 0.24 });
        detailGfx.circle(cx + cr * 0.18, cy + cr * 0.12, cr * 0.7);
        detailGfx.fill({ color: visuals.craterColor, alpha: 0.18 });
      }
    }

    if (visuals.iceCapFraction > 0.08) {
      const capAlpha = Math.min(0.34, 0.12 + visuals.iceCapFraction * 0.28);
      detailGfx.ellipse(size * 0.08, -size * 0.72, size * 0.72, size * 0.18);
      detailGfx.fill({ color: 0xddeeff, alpha: capAlpha });
      detailGfx.ellipse(size * 0.08, size * 0.72, size * 0.72, size * 0.18);
      detailGfx.fill({ color: 0xddeeff, alpha: capAlpha * 0.85 });
    }

    if (visuals.hasSignificantClouds) {
      const cloudCount = 4 + Math.floor(visuals.cloudDensity * 5);
      for (let i = 0; i < cloudCount; i++) {
        const cy = seededRange(planet.seed, i + 480, -0.62, 0.62) * size;
        const cx = seededRange(planet.seed, i + 520, -0.18, 0.38) * size;
        detailGfx.ellipse(cx, cy, size * seededRange(planet.seed, i + 560, 0.22, 0.46), size * 0.045);
        detailGfx.fill({ color: visuals.cloudColor, alpha: 0.12 + visuals.cloudDensity * 0.12 });
      }
    }
  }
  lightingGroup.addChild(detailGfx);

  // === Gas giant / ice giant broad equatorial glow ===
  if (isGiant) {
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

  // === Ring system for massive gas giants + occasional ice giants ===
  // Thin seeded ringlets read better than a few thick strokes at system scale:
  // 1-3px gaps, subtle off-white tones, deterministic per planet seed.
  const wantsRings = planet.type === 'gas-giant' && planet.massEarth > 50
    || (planet.type === 'ice-giant' && (planet.seed % 5 === 0)); // ~20% of ice giants
  if (wantsRings) {
    const seed = planet.seed;
    const ringGfx = new Graphics();
    const ringletCount = 10 + Math.floor(seededUnit(seed, 610) * 7);
    const inner = size * seededRange(seed, 620, 1.42, 1.55);
    const outer = size * seededRange(seed, 630, 1.86, 2.05);
    let ringRadius = inner;

    for (let i = 0; i < ringletCount && ringRadius < outer; i++) {
      const t = i / Math.max(1, ringletCount - 1);
      const tone = Math.round(seededRange(seed, 640 + i, 188, 246));
      const warm = Math.round(seededRange(seed, 700 + i, -8, 10));
      const cool = Math.round(seededRange(seed, 760 + i, -4, 14));
      const r = Math.max(150, Math.min(255, tone + warm));
      const g = Math.max(150, Math.min(255, tone + Math.floor(warm * 0.5)));
      const b = Math.max(150, Math.min(255, tone + cool));
      const color = (r << 16) | (g << 8) | b;
      const alpha = seededRange(seed, 820 + i, 0.12, 0.34) * (0.8 + (1 - Math.abs(t - 0.5) * 2) * 0.4);
      const width = seededRange(seed, 880 + i, 0.7, 1.6);
      const yRadius = ringRadius * seededRange(seed, 940 + i, 0.16, 0.22) * Y_COMPRESS;

      ringGfx.ellipse(0, 0, ringRadius, yRadius);
      ringGfx.stroke({ width, color, alpha });
      ringRadius += width + seededRange(seed, 1000 + i, 1.0, 3.0);
    }

    // Cassini-style gap — ~70% of ringed planets get one. Position varies a bit per seed.
    if (seed % 10 < 7) {
      const gapRadius = size * seededRange(seed, 1060, 1.58, 1.76);
      ringGfx.ellipse(0, 0, gapRadius, gapRadius * 0.19 * Y_COMPRESS);
      ringGfx.stroke({ width: 1.8, color: 0x020510, alpha: 0.72 });
    }
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
    : planet.type === 'terrestrial' ? 'Terra'
    : planet.type === 'rocky' ? 'Rocky' : 'Dwarf';
  const moonStr = planet.moons.length > 0 ? ` ${planet.moons.length}m` : '';
  const nameStr = planet.name.split(' ').pop() ?? '';

  const label = new Text({
    text: `${nameStr}\n${typeName} ${planet.surfaceTempK}K${moonStr}`,
    style: { fontSize: 9, fill: 0x889999, fontFamily: 'monospace', align: 'center', lineHeight: 11 },
    resolution: 3,
  });
  label.name = 'planet-name-label';
  label.anchor.set(0.5, 0);
  label.y = size + 8;
  container.addChild(label);

  return { container, lightingGroup };
}

/**
 * Adds a shared/generated equirectangular texture preview on top of the procedural mini-sphere.
 * This stays intentionally lightweight for SystemScene: a circular crop with the
 * existing Pixi lighting/shadow layers still providing the spherical read.
 */
export function applyPlanetTexturePreview(
  container: Container,
  textureUrl: string,
  size: number,
  options: PlanetTexturePreviewOptions = {},
): void {
  const existing = container.getChildByName('planet-skin-preview');
  if (existing) existing.destroy();
  const existingMask = container.getChildByName('planet-skin-preview-mask');
  if (existingMask) existingMask.destroy();

  const texture = Texture.from(textureUrl);
  const preview = new Container();
  preview.name = 'planet-skin-preview';
  preview.eventMode = 'none';
  preview.zIndex = 2;

  const map = new Container();
  map.name = 'planet-skin-preview-map';
  map.eventMode = 'none';
  const displaySize = size * 2;
  for (let i = -1; i <= 1; i++) {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.width = displaySize;
    sprite.height = displaySize;
    sprite.x = i * displaySize;
    sprite.eventMode = 'none';
    map.addChild(sprite);
  }
  map.x = -((options.initialLongitude ?? 0) % 1) * displaySize;
  (preview as any).__spinRevolutionsPerMs = options.spinRevolutionsPerMs ?? 0;
  (preview as any).__textureCycleWidth = displaySize;

  const mask = new Graphics();
  mask.name = 'planet-skin-preview-mask';
  mask.circle(0, 0, size * 0.98);
  mask.fill({ color: 0xffffff, alpha: 1 });
  mask.eventMode = 'none';
  preview.mask = mask;

  container.sortableChildren = true;
  preview.addChild(map);
  container.addChild(mask);
  container.addChild(preview);
}

export function tickPlanetTexturePreview(container: Container, deltaMs: number): void {
  const preview = container.getChildByName('planet-skin-preview') as Container | null;
  if (!preview) return;

  const spinRevolutionsPerMs = (preview as any).__spinRevolutionsPerMs as number | undefined;
  if (!spinRevolutionsPerMs) return;

  const map = preview.getChildByName('planet-skin-preview-map') as Container | null;
  if (!map) return;
  const cycleWidth = Math.max(1, ((preview as any).__textureCycleWidth as number | undefined) ?? map.width);
  map.x = (map.x + cycleWidth * spinRevolutionsPerMs * deltaMs) % cycleWidth;
  if (map.x > 0) map.x -= cycleWidth;
  if (map.x < -cycleWidth) map.x += cycleWidth;
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
 * Composition-driven color with volumetric shading + crater hint for solid bodies.
 * Optional seed enables deterministic crater placement & color variation per moon.
 */
export function renderSystemMoon(compositionType: string, radius: number, seed: number = 0): Graphics {
  const gfx = new Graphics();
  const baseColor = MOON_COLORS[compositionType] ?? 0x888899;
  // Per-seed color variation: ±10% brightness shift for diversity
  const variation = ((seed % 100) / 100 - 0.5) * 0.2; // -0.1..+0.1
  const color = variation > 0
    ? lightenColor(baseColor, variation)
    : darkenColor(baseColor, 1 + variation);

  // Dark base
  gfx.circle(0, 0, radius);
  gfx.fill({ color: darkenColor(color, 0.4), alpha: 0.9 });
  // Lit side
  gfx.circle(radius * 0.15, 0, radius * 0.85);
  gfx.fill({ color, alpha: 0.85 });

  // Crater hints for rocky/icy moons (3-5 small dark circles, deterministic positions)
  if ((compositionType === 'rocky' || compositionType === 'icy') && radius > 1.5) {
    const craterColor = darkenColor(color, 0.55);
    const craterCount = 3 + (seed % 3); // 3-5 craters
    let s = (seed * 9301 + 49297) | 0;
    for (let i = 0; i < craterCount; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const angle = (s / 0x7fffffff) * Math.PI * 2;
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const dist = (s / 0x7fffffff) * radius * 0.75;
      const cx = Math.cos(angle) * dist + radius * 0.1; // slight offset toward lit side
      const cy = Math.sin(angle) * dist;
      const cr = radius * (0.10 + (s % 100) / 100 * 0.10); // 10-20% of radius
      gfx.circle(cx, cy, cr);
      gfx.fill({ color: craterColor, alpha: 0.5 });
    }
  }

  // Specular highlight (smaller for icy/metallic, larger for rocky)
  const specSize = compositionType === 'metallic' ? 0.45 : compositionType === 'icy' ? 0.30 : 0.35;
  const specAlpha = compositionType === 'metallic' ? 0.35 : compositionType === 'icy' ? 0.30 : 0.20;
  gfx.circle(radius * 0.3, -radius * 0.2, radius * specSize);
  gfx.fill({ color: 0xffffff, alpha: specAlpha });
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
