import { Assets, Graphics, Container, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import type { Planet, Star } from '@nebulife/core';

/** Y-axis compression factor for isometric perspective */
export const Y_COMPRESS = 0.55;

/** Get planet visual size (screen pixels) — log-scale for proportional spread */
export function getPlanetSize(planet: Planet): number {
  const radius = Math.max(0.08, planet.radiusEarth);

  if (planet.type === 'gas-giant') {
    const t = Math.min(1, Math.log2(1 + radius) / Math.log2(1 + 12));
    return 17 + t * 4;
  }

  if (planet.type === 'ice-giant') {
    const t = Math.min(1, Math.log2(1 + radius) / Math.log2(1 + 5));
    return 15 + t * 4;
  }

  if (planet.type === 'dwarf') {
    const t = Math.min(1, Math.log2(1 + radius) / Math.log2(1 + 0.7));
    return 5 + t * 4;
  }

  const t = Math.min(1, Math.log2(1 + radius) / Math.log2(1 + 2.5));
  return 8 + t * 9;
}

/** Darken a color by a factor (0..1, lower = darker) */
function darkenColor(color: number, factor: number): number {
  const r = Math.round(((color >> 16) & 0xff) * factor);
  const g = Math.round(((color >> 8) & 0xff) * factor);
  const b = Math.round((color & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}

export interface PlanetRenderResult {
  container: Container;
  lightingGroup: Container;
}

export interface SystemMoonRenderResult {
  container: Container;
  body: Graphics;
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

const textureLoadCache = new Map<string, Promise<Texture>>();

function loadTexture(url: string): Promise<Texture> {
  let promise = textureLoadCache.get(url);
  if (!promise) {
    promise = Assets.load<Texture>(url);
    textureLoadCache.set(url, promise);
  }
  return promise;
}

function wrapUnit(value: number): number {
  const wrapped = value % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

function getWrappedFrameTexture(texture: Texture, u: number, widthU: number): Texture {
  const sourceWidth = Math.max(1, texture.width);
  const sourceHeight = Math.max(1, texture.height);
  const x = Math.floor(wrapUnit(u) * sourceWidth);
  const width = Math.max(1, Math.ceil(widthU * sourceWidth));
  return new Texture({
    source: texture.source,
    frame: new Rectangle(Math.min(x, sourceWidth - width), 0, Math.min(width, sourceWidth), sourceHeight),
  });
}

function buildSphericalTextureMap(texture: Texture, size: number, initialLongitude: number): Container {
  const map = new Container();
  map.label = 'planet-skin-preview-map';
  map.eventMode = 'none';

  const strips = 56;
  const diameter = size * 2;
  const longitudeStep = 0.62 / strips;

  for (let i = 0; i < strips; i++) {
    const t0 = i / strips;
    const t1 = (i + 1) / strips;
    const x0 = -size + diameter * t0;
    const x1 = -size + diameter * t1;
    const midT = (t0 + t1) * 0.5;
    const sphereX = midT * 2 - 1;
    const latitudeScale = Math.sqrt(Math.max(0, 1 - sphereX * sphereX));
    const longitudeOffset = Math.asin(Math.max(-1, Math.min(1, sphereX))) / (Math.PI * 2);
    const frameTexture = getWrappedFrameTexture(texture, initialLongitude + 0.5 + longitudeOffset, longitudeStep);
    const strip = new Sprite(frameTexture);
    strip.anchor.set(0.5);
    strip.x = (x0 + x1) * 0.5;
    strip.width = Math.max(1, x1 - x0 + 0.8);
    strip.height = Math.max(1, diameter * latitudeScale);
    strip.eventMode = 'none';
    map.addChild(strip);
  }

  return map;
}

function createMiniGlobeOptics(size: number): Container {
  const optics = new Container();
  optics.label = 'planet-mini-globe-optics';
  optics.eventMode = 'none';
  optics.zIndex = 22;

  const limbShade = new Graphics();
  limbShade.label = 'planet-mini-limb-shade';
  limbShade.circle(0, 0, size * 0.99);
  limbShade.stroke({ width: Math.max(2, size * 0.14), color: 0x020510, alpha: 0.22 });
  limbShade.circle(-size * 0.2, size * 0.1, size * 0.92);
  limbShade.stroke({ width: Math.max(1.5, size * 0.09), color: 0x020510, alpha: 0.10 });
  optics.addChild(limbShade);

  return optics;
}

function replaceSphericalTextureMap(preview: Container, texture: Texture, size: number, initialLongitude: number): void {
  const oldMap = preview.getChildByLabel('planet-skin-preview-map');
  if (oldMap) oldMap.destroy({ children: true });
  preview.addChild(buildSphericalTextureMap(texture, size, initialLongitude));
}

/**
 * Render only the structural shell for a system-view planet.
 * The actual visible planet body is the equirectangular photo applied later
 * by applyPlanetTexturePreview(); keep this free of procedural paint layers.
 */
export function renderPlanet(planet: Planet, _star: Star): PlanetRenderResult {
  const container = new Container();
  container.sortableChildren = true;
  const size = getPlanetSize(planet);

  const base = new Graphics();
  base.label = 'planet-photo-base';
  base.zIndex = 0;
  base.circle(0, 0, size);
  base.fill({ color: 0x0b1320, alpha: 1 });
  container.addChild(base);

  // SystemScene rotates this container so the mini-globe highlight faces the star.
  const lightingGroup = new Container();
  lightingGroup.label = 'planet-mini-lighting';
  lightingGroup.zIndex = 30;
  lightingGroup.addChild(createMiniGlobeOptics(size));
  container.addChild(lightingGroup);

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
  label.label = 'planet-name-label';
  label.zIndex = 100;
  label.anchor.set(0.5, 0);
  label.y = size + 8;
  container.addChild(label);

  return { container, lightingGroup };
}

/** Adds an equirectangular photo as the only visible system-view planet body. */
export function applyPlanetTexturePreview(
  container: Container,
  textureUrl: string,
  size: number,
  options: PlanetTexturePreviewOptions = {},
): void {
  const existing = container.getChildByLabel('planet-skin-preview');
  if (existing) existing.destroy();
  const existingMask = container.getChildByLabel('planet-skin-preview-mask');
  if (existingMask) existingMask.destroy();
  const preview = new Container();
  preview.label = 'planet-skin-preview';
  preview.eventMode = 'none';
  preview.zIndex = 12;

  (preview as any).__spinRevolutionsPerMs = options.spinRevolutionsPerMs ?? 0;
  (preview as any).__longitude = wrapUnit(options.initialLongitude ?? 0);
  (preview as any).__renderedLongitude = null;
  (preview as any).__planetRadius = size;
  (preview as any).__sourceTexture = null;

  const mask = new Graphics();
  mask.label = 'planet-skin-preview-mask';
  mask.circle(0, 0, size * 0.98);
  mask.fill({ color: 0xffffff, alpha: 1 });
  mask.eventMode = 'none';
  preview.mask = mask;

  container.sortableChildren = true;
  container.addChild(mask);
  container.addChild(preview);

  void loadTexture(textureUrl).then((loadedTexture) => {
    if (preview.destroyed || !loadedTexture) return;
    (preview as any).__sourceTexture = loadedTexture;
    const longitude = (preview as any).__longitude ?? 0;
    (preview as any).__renderedLongitude = longitude;
    replaceSphericalTextureMap(preview, loadedTexture, size, longitude);
  }).catch((err) => {
    console.warn('[PlanetRenderer] Failed to load system planet texture:', textureUrl, err);
  });
}

export function tickPlanetTexturePreview(container: Container, deltaMs: number): void {
  const preview = container.getChildByLabel('planet-skin-preview') as Container | null;
  if (!preview) return;

  const spinRevolutionsPerMs = (preview as any).__spinRevolutionsPerMs as number | undefined;
  if (!spinRevolutionsPerMs) return;

  const sourceTexture = (preview as any).__sourceTexture as Texture | null | undefined;
  const radius = (preview as any).__planetRadius as number | undefined;
  if (!sourceTexture || !radius) return;

  const longitude = wrapUnit(((preview as any).__longitude as number | undefined ?? 0) + spinRevolutionsPerMs * deltaMs);
  (preview as any).__longitude = longitude;
  const renderedLongitude = (preview as any).__renderedLongitude as number | null | undefined;
  const deltaLongitude = renderedLongitude == null
    ? 1
    : Math.abs(longitude - renderedLongitude);
  if (Math.min(deltaLongitude, 1 - deltaLongitude) < 0.003) return;
  (preview as any).__renderedLongitude = longitude;
  replaceSphericalTextureMap(preview, sourceTexture, radius, longitude);
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
export function renderSystemMoon(compositionType: string, radius: number, seed: number = 0): SystemMoonRenderResult {
  const container = new Container();
  container.sortableChildren = true;
  const gfx = new Graphics();
  gfx.label = 'moon-matte-body';
  container.addChild(gfx);
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

  // Keep small moons matte; only larger moons get a faint icy/metallic glint.
  if (radius >= 2.4) {
    const specSize = compositionType === 'metallic' ? 0.34 : compositionType === 'icy' ? 0.24 : 0.26;
    const specAlpha = compositionType === 'metallic' ? 0.16 : compositionType === 'icy' ? 0.12 : 0.08;
    gfx.circle(radius * 0.3, -radius * 0.2, radius * specSize);
    gfx.fill({ color: 0xffffff, alpha: specAlpha });
  }
  // Limb darkening
  if (radius > 2) {
    gfx.circle(0, 0, radius);
    gfx.stroke({ width: radius * 0.3, color: 0x000000, alpha: 0.2 });
  }
  return { container, body: gfx };
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
