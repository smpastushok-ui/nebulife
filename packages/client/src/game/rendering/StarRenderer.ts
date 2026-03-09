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

  // Outermost soft glow
  const farGlow = new Graphics();
  farGlow.circle(0, 0, size * 4);
  farGlow.fill({ color, alpha: 0.03 });
  container.addChild(farGlow);

  // Outer glow
  const glow = new Graphics();
  glow.circle(0, 0, size * 2.5);
  glow.fill({ color, alpha: 0.08 });
  container.addChild(glow);

  // Mid glow
  const midGlow = new Graphics();
  midGlow.circle(0, 0, size * 1.6);
  midGlow.fill({ color, alpha: 0.15 });
  container.addChild(midGlow);

  // Corona rays (animated separately)
  const corona = new Container();
  const rayCount = 6;
  const rayLength = size * 3;
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2;
    const ray = new Graphics();
    const tipX = Math.cos(angle) * rayLength;
    const tipY = Math.sin(angle) * rayLength;
    const halfWidth = size * 0.08;
    const perpAngle = angle + Math.PI / 2;
    ray.moveTo(Math.cos(perpAngle) * halfWidth, Math.sin(perpAngle) * halfWidth);
    ray.lineTo(tipX, tipY);
    ray.lineTo(-Math.cos(perpAngle) * halfWidth, -Math.sin(perpAngle) * halfWidth);
    ray.closePath();
    ray.fill({ color, alpha: 0.06 });
    corona.addChild(ray);
  }
  container.addChild(corona);

  // Inner glow
  const innerGlow = new Graphics();
  innerGlow.circle(0, 0, size * 1.2);
  innerGlow.fill({ color, alpha: 0.3 });
  container.addChild(innerGlow);

  // Core
  const core = new Graphics();
  core.circle(0, 0, size);
  core.fill({ color: 0xffffff, alpha: 0.9 });
  container.addChild(core);

  // Color overlay on core
  const colorOverlay = new Graphics();
  colorOverlay.circle(0, 0, size * 0.8);
  colorOverlay.fill({ color, alpha: 0.5 });
  container.addChild(colorOverlay);

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
