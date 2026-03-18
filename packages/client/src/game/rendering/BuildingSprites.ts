// ---------------------------------------------------------------------------
// BuildingSprites — procedural isometric building textures via Canvas API
// ---------------------------------------------------------------------------
// Each building type has a draw function producing a 128x128 sprite.
// Level 1-5 progressively adds detail, size, and glow intensity.
// When Blender PNGs become available, swap the texture source — the renderer
// interface stays the same (THREE.Texture per type+level).
// ---------------------------------------------------------------------------

import * as THREE from 'three';

const SPRITE_RES = 128;

/** Per-building-type accent color */
export const BUILDING_COLORS: Record<string, string> = {
  colony_hub: '#44ff88',
  mine: '#ff8844',
  solar_plant: '#ffcc44',
  research_lab: '#4488ff',
  water_extractor: '#44ccff',
  greenhouse: '#88ff44',
  observatory: '#cc88ff',
};

/** Hex string → {r,g,b} 0-255 */
function hexRGB(hex: string) {
  const v = parseInt(hex.slice(1), 16);
  return { r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff };
}

/** Darken a hex color by factor (0-1) */
function darken(hex: string, f: number): string {
  const { r, g, b } = hexRGB(hex);
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}

/** Lighten toward white */
function lighten(hex: string, f: number): string {
  const { r, g, b } = hexRGB(hex);
  return `rgb(${Math.round(r + (255 - r) * f)},${Math.round(g + (255 - g) * f)},${Math.round(b + (255 - b) * f)})`;
}

// ── Drawing helpers ──

function drawShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(cx + 4, cy + 3, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGlowDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(x, y, r * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  fill: string, stroke?: string,
) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x, y, w, h);
  }
}

// ── Building draw functions ──

type DrawFn = (ctx: CanvasRenderingContext2D, s: number, level: number, accent: string) => void;

const drawColonyHub: DrawFn = (ctx, s, level, accent) => {
  const cx = s / 2, cy = s / 2;
  const baseR = 16 + level * 3;

  // Shadow
  drawShadow(ctx, cx, cy + 4, baseR + 2, baseR * 0.4);

  // Main dome base (dark metallic)
  ctx.fillStyle = '#1a2838';
  ctx.beginPath();
  ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = darken(accent, 0.5);
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Inner dome ring
  ctx.fillStyle = '#0f1a28';
  ctx.beginPath();
  ctx.arc(cx, cy, baseR * 0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = darken(accent, 0.6);
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Accent ring
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(cx, cy, baseR * 0.82, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Central glow dot
  drawGlowDot(ctx, cx, cy, 3, accent);

  // Window lights around the dome
  const windowCount = 4 + level * 2;
  for (let i = 0; i < windowCount; i++) {
    const angle = (i / windowCount) * Math.PI * 2;
    const wr = baseR * 0.75;
    const wx = cx + Math.cos(angle) * wr;
    const wy = cy + Math.sin(angle) * wr;
    drawGlowDot(ctx, wx, wy, 1.2, accent);
  }

  // Landing pad (at level 2+)
  if (level >= 2) {
    const padX = cx + baseR + 8;
    const padY = cy;
    ctx.strokeStyle = darken(accent, 0.4);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(padX, padY, 6, 0, Math.PI * 2);
    ctx.stroke();
    // H marking
    ctx.strokeStyle = darken(accent, 0.5);
    ctx.beginPath();
    ctx.moveTo(padX - 3, padY - 3);
    ctx.lineTo(padX - 3, padY + 3);
    ctx.moveTo(padX + 3, padY - 3);
    ctx.lineTo(padX + 3, padY + 3);
    ctx.moveTo(padX - 3, padY);
    ctx.lineTo(padX + 3, padY);
    ctx.stroke();
  }

  // Antenna (level 3+)
  if (level >= 3) {
    ctx.strokeStyle = '#556677';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - baseR - 2);
    ctx.lineTo(cx, cy - baseR - 10);
    ctx.stroke();
    drawGlowDot(ctx, cx, cy - baseR - 10, 1.5, accent);
  }
};

const drawMine: DrawFn = (ctx, s, level, accent) => {
  const cx = s / 2, cy = s / 2;

  drawShadow(ctx, cx, cy + 3, 18, 8);

  // Main shaft entrance (dark rectangle)
  const shaftW = 14 + level * 2;
  const shaftH = 10 + level;
  drawRect(ctx, cx - shaftW / 2, cy - shaftH / 2, shaftW, shaftH, '#0c1018', darken(accent, 0.4));

  // Inner darkness
  drawRect(ctx, cx - shaftW / 2 + 3, cy - shaftH / 2 + 3, shaftW - 6, shaftH - 6, '#050810');

  // Support frame
  ctx.strokeStyle = '#3a4858';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - shaftW / 2 - 2, cy - shaftH / 2 - 2, shaftW + 4, shaftH + 4);

  // Rail tracks leading from entrance
  ctx.strokeStyle = '#4a5868';
  ctx.lineWidth = 0.8;
  for (let i = -1; i <= 1; i += 2) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 3, cy + shaftH / 2);
    ctx.lineTo(cx + i * 5, cy + shaftH / 2 + 14);
    ctx.stroke();
  }
  // Cross-ties
  for (let t = 0; t < 4; t++) {
    const ty = cy + shaftH / 2 + 3 + t * 3;
    const spread = 3 + t * 0.5;
    ctx.beginPath();
    ctx.moveTo(cx - spread - 1, ty);
    ctx.lineTo(cx + spread + 1, ty);
    ctx.stroke();
  }

  // Derrick/headframe tower
  const towerH = 16 + level * 3;
  ctx.strokeStyle = '#5a6878';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy - shaftH / 2);
  ctx.lineTo(cx, cy - shaftH / 2 - towerH);
  ctx.lineTo(cx + 6, cy - shaftH / 2);
  ctx.stroke();
  // Cross brace
  ctx.beginPath();
  ctx.moveTo(cx - 3, cy - shaftH / 2 - towerH * 0.5);
  ctx.lineTo(cx + 3, cy - shaftH / 2 - towerH * 0.5);
  ctx.stroke();

  // Warning light on tower top
  drawGlowDot(ctx, cx, cy - shaftH / 2 - towerH, 2, accent);

  // Ore pile (level 3+)
  if (level >= 3) {
    const pileX = cx + shaftW / 2 + 10;
    ctx.fillStyle = darken(accent, 0.35);
    ctx.beginPath();
    ctx.arc(pileX, cy + 2, 5 + level, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawSolarPlant: DrawFn = (ctx, s, level, accent) => {
  const cx = s / 2, cy = s / 2;

  drawShadow(ctx, cx, cy + 3, 22, 8);

  // Solar panel array (parallelograms from top-down perspective)
  const panelRows = 2 + Math.floor(level / 2);
  const panelCols = 2 + level;
  const panelW = 7;
  const panelH = 5;
  const gap = 2;

  const totalW = panelCols * (panelW + gap) - gap;
  const totalH = panelRows * (panelH + gap) - gap;
  const startX = cx - totalW / 2;
  const startY = cy - totalH / 2;

  for (let r = 0; r < panelRows; r++) {
    for (let c = 0; c < panelCols; c++) {
      const px = startX + c * (panelW + gap);
      const py = startY + r * (panelH + gap);
      // Panel (dark blue with bright reflection)
      drawRect(ctx, px, py, panelW, panelH, '#0a1a3a', darken(accent, 0.3));
      // Reflection line
      ctx.strokeStyle = lighten(accent, 0.3);
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(px + 1, py + 1);
      ctx.lineTo(px + panelW - 1, py + panelH - 1);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // Central junction box
  drawRect(ctx, cx - 3, cy - 3, 6, 6, '#1a2838', '#3a5868');
  drawGlowDot(ctx, cx, cy, 1.5, accent);

  // Power cable to edge
  ctx.strokeStyle = darken(accent, 0.4);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(cx + 3, cy);
  ctx.lineTo(cx + totalW / 2 + 8, cy);
  ctx.stroke();
};

const drawResearchLab: DrawFn = (ctx, s, level, accent) => {
  const cx = s / 2, cy = s / 2;

  drawShadow(ctx, cx, cy + 3, 18, 7);

  // Main rectangular building
  const bw = 20 + level * 3;
  const bh = 14 + level * 2;
  drawRect(ctx, cx - bw / 2, cy - bh / 2, bw, bh, '#141e2c', darken(accent, 0.35));

  // Inner module separators
  ctx.strokeStyle = '#2a3a4c';
  ctx.lineWidth = 0.5;
  for (let i = 1; i < 3; i++) {
    const lx = cx - bw / 2 + (bw / 3) * i;
    ctx.beginPath();
    ctx.moveTo(lx, cy - bh / 2);
    ctx.lineTo(lx, cy + bh / 2);
    ctx.stroke();
  }

  // Roof edge highlight
  ctx.strokeStyle = darken(accent, 0.5);
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - bw / 2, cy - bh / 2, bw, bh);

  // Satellite dish
  const dishX = cx + bw / 2 + 8;
  const dishY = cy - 6;
  const dishR = 5 + level;
  ctx.strokeStyle = '#6a7a8a';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(dishX, dishY, dishR, 0, Math.PI * 2);
  ctx.stroke();
  // Dish cross
  ctx.beginPath();
  ctx.moveTo(dishX - dishR, dishY);
  ctx.lineTo(dishX + dishR, dishY);
  ctx.moveTo(dishX, dishY - dishR);
  ctx.lineTo(dishX, dishY + dishR);
  ctx.stroke();
  // Center feed
  drawGlowDot(ctx, dishX, dishY, 1.5, accent);

  // Window lights along building
  const windowCount = 3 + level;
  for (let i = 0; i < windowCount; i++) {
    const wx = cx - bw / 2 + 4 + i * ((bw - 8) / (windowCount - 1));
    drawGlowDot(ctx, wx, cy, 1, accent);
  }
};

const drawWaterExtractor: DrawFn = (ctx, s, level, accent) => {
  const cx = s / 2, cy = s / 2;

  drawShadow(ctx, cx, cy + 3, 16, 7);

  // Circular platform on water
  const platR = 14 + level * 2;
  ctx.fillStyle = '#1a2838';
  ctx.beginPath();
  ctx.arc(cx, cy, platR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = darken(accent, 0.4);
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Inner platform ring
  ctx.strokeStyle = '#2a3a50';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(cx, cy, platR * 0.65, 0, Math.PI * 2);
  ctx.stroke();

  // Pump mechanism (center)
  ctx.fillStyle = '#0f1a28';
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fill();
  drawGlowDot(ctx, cx, cy, 2, accent);

  // Pipes extending outward
  const pipeCount = 3 + level;
  ctx.strokeStyle = '#4a5a6a';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < pipeCount; i++) {
    const angle = (i / pipeCount) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * 5, cy + Math.sin(angle) * 5);
    ctx.lineTo(cx + Math.cos(angle) * (platR - 2), cy + Math.sin(angle) * (platR - 2));
    ctx.stroke();
    // Pipe end dot
    drawGlowDot(ctx, cx + Math.cos(angle) * (platR - 2), cy + Math.sin(angle) * (platR - 2), 1, accent);
  }

  // Storage tank (level 3+)
  if (level >= 3) {
    const tankX = cx + platR + 6;
    ctx.fillStyle = '#1a2a3a';
    ctx.beginPath();
    ctx.arc(tankX, cy, 4 + level, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = darken(accent, 0.4);
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
};

const drawGreenhouse: DrawFn = (ctx, s, level, accent) => {
  const cx = s / 2, cy = s / 2;

  drawShadow(ctx, cx, cy + 4, 18, 7);

  // Glass dome
  const domeR = 15 + level * 2;
  // Green interior (vegetation visible through glass)
  ctx.fillStyle = darken(accent, 0.25);
  ctx.beginPath();
  ctx.arc(cx, cy, domeR, 0, Math.PI * 2);
  ctx.fill();

  // Glass panels (radial lines)
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 0.5;
  const panelCount = 8 + level * 2;
  for (let i = 0; i < panelCount; i++) {
    const angle = (i / panelCount) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * domeR, cy + Math.sin(angle) * domeR);
    ctx.stroke();
  }

  // Concentric glass rings
  ctx.beginPath();
  ctx.arc(cx, cy, domeR * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, domeR * 0.75, 0, Math.PI * 2);
  ctx.stroke();

  // Outer frame
  ctx.strokeStyle = darken(accent, 0.45);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, domeR, 0, Math.PI * 2);
  ctx.stroke();

  // Vegetation dots (visible through glass)
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < 5 + level * 2; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * domeR * 0.7;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Center vent
  drawGlowDot(ctx, cx, cy, 2, lighten(accent, 0.2));
};

const drawObservatory: DrawFn = (ctx, s, level, accent) => {
  const cx = s / 2, cy = s / 2;

  drawShadow(ctx, cx, cy + 4, 16, 7);

  // Base platform (octagonal)
  const platR = 14 + level * 2;
  ctx.fillStyle = '#1a2838';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
    const px = cx + Math.cos(angle) * platR;
    const py = cy + Math.sin(angle) * platR;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = darken(accent, 0.4);
  ctx.lineWidth = 1;
  ctx.stroke();

  // Dome
  const domeR = 10 + level;
  ctx.fillStyle = '#0f1a2a';
  ctx.beginPath();
  ctx.arc(cx, cy, domeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = darken(accent, 0.5);
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Dome slit (opening for telescope)
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - domeR);
  ctx.lineTo(cx, cy + domeR * 0.3);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Telescope tube visible through slit
  ctx.strokeStyle = '#5a6a7a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 2);
  ctx.lineTo(cx, cy - domeR + 2);
  ctx.stroke();

  // Lens glow at telescope tip
  drawGlowDot(ctx, cx, cy - domeR + 3, 2, accent);

  // Equipment pods around base (level 3+)
  if (level >= 3) {
    for (let i = 0; i < level - 1; i++) {
      const angle = (i / (level - 1)) * Math.PI * 2 + Math.PI / 4;
      const ex = cx + Math.cos(angle) * (platR + 6);
      const ey = cy + Math.sin(angle) * (platR + 6);
      drawRect(ctx, ex - 3, ey - 2, 6, 4, '#1a2838', darken(accent, 0.35));
    }
  }
};

// ── Registry ──

const DRAW_REGISTRY: Record<string, DrawFn> = {
  colony_hub: drawColonyHub,
  mine: drawMine,
  solar_plant: drawSolarPlant,
  research_lab: drawResearchLab,
  water_extractor: drawWaterExtractor,
  greenhouse: drawGreenhouse,
  observatory: drawObservatory,
};

// ── Texture cache ──

const textureCache = new Map<string, THREE.CanvasTexture>();

function cacheKey(type: string, level: number): string {
  return `${type}_L${level}`;
}

/** Get or create a THREE.CanvasTexture for a building type+level */
export function getBuildingTexture(type: string, level: number): THREE.CanvasTexture {
  const key = cacheKey(type, level);
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_RES;
  canvas.height = SPRITE_RES;
  const ctx = canvas.getContext('2d')!;

  // Clear with transparent background
  ctx.clearRect(0, 0, SPRITE_RES, SPRITE_RES);

  const drawFn = DRAW_REGISTRY[type];
  const accent = BUILDING_COLORS[type] ?? '#aabbcc';

  if (drawFn) {
    drawFn(ctx, SPRITE_RES, level, accent);
  } else {
    // Fallback: simple rectangle
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(32, 32, 64, 64);
    ctx.globalAlpha = 1;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  textureCache.set(key, texture);
  return texture;
}

/** Dispose all cached textures (call on unmount) */
export function disposeBuildingTextures(): void {
  textureCache.forEach((tex) => tex.dispose());
  textureCache.clear();
}
