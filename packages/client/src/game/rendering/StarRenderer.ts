import { Graphics, Container, Text } from 'pixi.js';
import type { Star } from '@nebulife/core';

/** Convert hex color string (#rrggbb) to number */
function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

export interface StarRenderResult {
  container: Container;
  corona: Container;
}

/**
 * Render a star as a glowing circle with procedural corona rays.
 * Size based on radiusSolar, color from spectral class.
 */
export function renderStar(star: Star, size: number = 20): StarRenderResult {
  const container = new Container();
  const color = hexToNum(star.colorHex);
  const temp = star.temperatureK;
  const luminosity = Math.max(0.02, star.luminositySolar);
  const intensity = Math.min(2.2, Math.max(0.65, Math.pow(luminosity, 0.16)));
  const hotFactor = Math.max(0, Math.min(1, (temp - 4200) / 18000));
  const coolFactor = Math.max(0, Math.min(1, (4200 - temp) / 2200));

  // Outermost soft glow
  const farGlow = new Graphics();
  farGlow.circle(0, 0, size * (4.2 + intensity * 0.8));
  farGlow.fill({ color, alpha: 0.035 * intensity });
  container.addChild(farGlow);

  // Outer glow
  const glow = new Graphics();
  glow.circle(0, 0, size * (2.5 + intensity * 0.55));
  glow.fill({ color, alpha: 0.09 * intensity });
  container.addChild(glow);

  // Mid glow
  const midGlow = new Graphics();
  midGlow.circle(0, 0, size * (1.55 + intensity * 0.24));
  midGlow.fill({ color, alpha: 0.18 * intensity });
  container.addChild(midGlow);

  // Corona rays (animated separately)
  const corona = new Container();
  const rayCount = 10;
  const rayLength = size * (2.7 + intensity * 0.9);
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2;
    const ray = new Graphics();
    const length = rayLength * (0.68 + ((star.seed + i * 17) % 41) / 100);
    const tipX = Math.cos(angle) * length;
    const tipY = Math.sin(angle) * length;
    const halfWidth = size * (0.045 + (i % 3) * 0.018);
    const perpAngle = angle + Math.PI / 2;
    ray.moveTo(Math.cos(perpAngle) * halfWidth, Math.sin(perpAngle) * halfWidth);
    ray.lineTo(tipX, tipY);
    ray.lineTo(-Math.cos(perpAngle) * halfWidth, -Math.sin(perpAngle) * halfWidth);
    ray.closePath();
    ray.fill({ color, alpha: 0.045 * intensity });
    corona.addChild(ray);
  }
  container.addChild(corona);

  // Subtle hot/cool plasma shell gives the core a stellar temperature read.
  const plasma = new Graphics();
  plasma.circle(size * -0.18, size * -0.12, size * 0.82);
  plasma.fill({ color: hotFactor > coolFactor ? 0xddeeff : 0xffaa66, alpha: 0.16 + Math.max(hotFactor, coolFactor) * 0.08 });
  plasma.circle(size * 0.22, size * 0.2, size * 0.46);
  plasma.fill({ color: hotFactor > 0.35 ? 0x99bbff : 0xffcc88, alpha: 0.12 });
  container.addChild(plasma);

  // Inner glow
  const innerGlow = new Graphics();
  innerGlow.circle(0, 0, size * 1.2);
  innerGlow.fill({ color, alpha: 0.32 * intensity });
  container.addChild(innerGlow);

  // Core
  const core = new Graphics();
  core.circle(0, 0, size);
  core.fill({ color: 0xffffff, alpha: 0.9 });
  container.addChild(core);

  // Color overlay on core
  const colorOverlay = new Graphics();
  colorOverlay.circle(0, 0, size * 0.8);
  colorOverlay.fill({ color, alpha: 0.42 + Math.max(hotFactor, coolFactor) * 0.16 });
  container.addChild(colorOverlay);

  const photosphere = new Graphics();
  photosphere.circle(-size * 0.25, -size * 0.22, size * 0.22);
  photosphere.fill({ color: 0xffffff, alpha: 0.24 });
  photosphere.circle(size * 0.18, size * 0.1, size * 0.14);
  photosphere.fill({ color: 0xfff4dd, alpha: 0.18 });
  container.addChild(photosphere);

  return { container, corona };
}

/**
 * Render a star dot for the galaxy map — enhanced glow for visibility over backdrop.
 */
export function renderStarDot(star: Star, radius: number = 5, showLabel: boolean = true): Container {
  const container = new Container();
  const color = hexToNum(star.colorHex);

  // Soft outer glow
  const outerGlow = new Graphics();
  outerGlow.circle(0, 0, radius * 3.5);
  outerGlow.fill({ color, alpha: 0.06 });
  container.addChild(outerGlow);

  // Mid glow
  const midGlow = new Graphics();
  midGlow.circle(0, 0, radius * 2.2);
  midGlow.fill({ color, alpha: 0.15 });
  container.addChild(midGlow);

  // Inner glow
  const innerGlow = new Graphics();
  innerGlow.circle(0, 0, radius * 1.4);
  innerGlow.fill({ color, alpha: 0.3 });
  container.addChild(innerGlow);

  // Bright core
  const core = new Graphics();
  core.circle(0, 0, radius);
  core.fill({ color: 0xffffff, alpha: 0.9 });
  container.addChild(core);

  // Color tint on core
  const tint = new Graphics();
  tint.circle(0, 0, radius * 0.65);
  tint.fill({ color, alpha: 0.55 });
  container.addChild(tint);

  if (showLabel) {
    const label = new Text({
      text: star.spectralClass + star.subType,
      style: { fontSize: 9, fill: 0x888888, fontFamily: 'monospace' },
    });
    label.anchor.set(0.5, 0);
    label.y = radius + 4;
    container.addChild(label);
  }

  return container;
}
