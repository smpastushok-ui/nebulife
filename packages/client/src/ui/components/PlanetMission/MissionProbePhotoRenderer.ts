import type { Planet, PlanetMissionType, PlanetReportSummary, Star } from '@nebulife/core';

type Rng = () => number;

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rngFromSeed(seed: number): Rng {
  let s = seed | 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function noise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 0.00001) * 43758.5453;
  return n - Math.floor(n);
}

function drawScanlines(ctx: CanvasRenderingContext2D, w: number, h: number, rng: Rng): void {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 2; y < h; y += 6) ctx.fillRect(0, y, w, 1);
  for (let i = 0; i < 1800; i++) {
    const a = 0.025 + rng() * 0.055;
    const v = 120 + Math.floor(rng() * 120);
    ctx.fillStyle = `rgba(${v},${v},${v},${a})`;
    ctx.fillRect(rng() * w, rng() * h, 1, 1);
  }
  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.15, w / 2, h / 2, w * 0.72);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.62)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawMetadata(
  ctx: CanvasRenderingContext2D,
  planet: Planet,
  star: Star,
  report: PlanetReportSummary,
  w: number,
  h: number,
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.fillRect(0, h - 42, w, 42);
  ctx.strokeStyle = 'rgba(180,210,230,0.42)';
  ctx.beginPath();
  ctx.moveTo(0, h - 42);
  ctx.lineTo(w, h - 42);
  ctx.stroke();
  ctx.font = '11px monospace';
  ctx.fillStyle = 'rgba(210,230,240,0.88)';
  const camera = report.missionType === 'surface_landing'
    ? 'ROVER SURFACE CAM'
    : report.missionType === 'deep_atmosphere_probe'
      ? 'ATMOSPHERE PROBE'
      : 'ORBITAL PROBE';
  ctx.fillText(`${camera} // ${planet.name} // ${star.name}`, 18, h - 24);
  ctx.fillStyle = 'rgba(150,170,185,0.72)';
  ctx.fillText(`T${report.revealLevel}  ${Math.round(planet.surfaceTempK)}K  ${planet.surfaceGravityG.toFixed(2)}g  ${new Date(report.generatedAt).toISOString().slice(0, 10)}`, 18, h - 10);
  ctx.restore();
}

function drawCrosshair(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(210,230,240,0.26)';
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(w / 2, 28);
  ctx.lineTo(w / 2, h - 56);
  ctx.moveTo(28, h / 2);
  ctx.lineTo(w - 28, h / 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeRect(18, 18, w - 36, h - 72);
  ctx.restore();
}

function drawPointCloud(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  count: number,
  bounds: { x: number; y: number; w: number; h: number },
  tone: number,
  alpha: number,
  minSize = 1,
  maxSize = 2.8,
): void {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = bounds.x + rng() * bounds.w;
    const y = bounds.y + rng() * bounds.h;
    const size = minSize + rng() * (maxSize - minSize);
    const v = Math.max(0, Math.min(255, tone + (rng() - 0.5) * 46));
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * (0.35 + rng() * 0.75)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, size * (0.7 + rng() * 0.9), size * (0.35 + rng() * 0.5), rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSoftSun(ctx: CanvasRenderingContext2D, rng: Rng, w: number, usableH: number): void {
  const x = w * (0.18 + rng() * 0.64);
  const y = usableH * (0.10 + rng() * 0.16);
  const r = usableH * (0.055 + rng() * 0.035);
  const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 7);
  glow.addColorStop(0, 'rgba(235,240,230,0.24)');
  glow.addColorStop(0.16, 'rgba(200,210,210,0.12)');
  glow.addColorStop(1, 'rgba(200,210,210,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, usableH);
  ctx.fillStyle = 'rgba(230,235,226,0.22)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawOrbitalMap(
  ctx: CanvasRenderingContext2D,
  planet: Planet,
  missionType: PlanetMissionType,
  seed: number,
  rng: Rng,
  w: number,
  h: number,
): void {
  const usableH = h - 42;
  const water = planet.hydrosphere?.waterCoverageFraction ?? 0;
  const ice = planet.hydrosphere?.iceCapFraction ?? 0;

  ctx.fillStyle = '#03060a';
  ctx.fillRect(0, 0, w, h);

  for (let band = 0; band < 12; band++) {
    const y = (band / 12) * usableH;
    const alpha = missionType === 'deep_atmosphere_probe' ? 0.06 + band * 0.006 : 0.025;
    ctx.fillStyle = `rgba(200,220,230,${alpha})`;
    ctx.fillRect(0, y + Math.sin(band * 1.7 + seed) * 4, w, 8 + rng() * 10);
  }

  const cell = 8;
  for (let y = 0; y < usableH; y += cell) {
    for (let x = 0; x < w; x += cell) {
      const nx = x / w;
      const ny = y / usableH;
      const n =
        noise(nx * 4.5, ny * 4.5, seed) * 0.55 +
        noise(nx * 13.0, ny * 13.0, seed + 19) * 0.30 +
        noise(nx * 31.0, ny * 31.0, seed + 97) * 0.15;
      const polar = Math.abs(ny - 0.5) * 2;
      const isIce = polar > 1 - ice * 1.5;
      const isWater = water > 0.08 && n < water * 0.72 && !isIce;
      const shade = isIce ? 210 : isWater ? 54 : 92 + Math.floor(n * 105);
      ctx.fillStyle = `rgba(${shade},${shade},${shade},${isWater ? 0.42 : 0.72})`;
      ctx.fillRect(x, y, cell + 1, cell + 1);
    }
  }

  ctx.strokeStyle = 'rgba(230,240,245,0.26)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 22; i++) {
    const level = i / 22;
    ctx.beginPath();
    for (let x = -10; x <= w + 10; x += 10) {
      const nx = x / w;
      const y = usableH * (0.1 + level * 0.78)
        + Math.sin(nx * 10 + seed * 0.01 + i) * (10 + 18 * noise(i, nx, seed));
      if (x === -10) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  if (planet.type === 'gas-giant' || planet.type === 'ice-giant' || missionType === 'deep_atmosphere_probe') {
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 16; i++) {
      const y = rng() * usableH;
      ctx.strokeStyle = `rgba(230,240,245,${0.08 + rng() * 0.18})`;
      ctx.lineWidth = 2 + rng() * 3;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 16) {
        const yy = y + Math.sin(x * 0.016 + i * 3.1) * (6 + rng() * 18);
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  for (let i = 0; i < 36; i++) {
    const x = rng() * w;
    const y = rng() * usableH;
    const r = 4 + rng() * 18;
    ctx.strokeStyle = `rgba(230,230,230,${0.08 + rng() * 0.12})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r * (0.8 + rng() * 0.5), r * (0.4 + rng() * 0.4), rng() * Math.PI, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawRoverView(
  ctx: CanvasRenderingContext2D,
  planet: Planet,
  seed: number,
  rng: Rng,
  w: number,
  h: number,
): void {
  const usableH = h - 42;
  const sky = ctx.createLinearGradient(0, 0, 0, usableH);
  const atmo = planet.atmosphere?.surfacePressureAtm ?? 0;
  const haze = Math.min(0.52, 0.08 + atmo * 0.11);
  sky.addColorStop(0, `rgba(100,118,128,${haze})`);
  sky.addColorStop(0.55, `rgba(58,68,72,${0.32 + haze * 0.4})`);
  sky.addColorStop(1, 'rgba(6,7,8,0.96)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, usableH);
  drawSoftSun(ctx, rng, w, usableH);

  const horizon = usableH * (0.38 + rng() * 0.10);
  for (let layer = 0; layer < 6; layer++) {
    ctx.beginPath();
    ctx.moveTo(0, usableH);
    const step = Math.max(8, 20 - layer * 2);
    for (let x = 0; x <= w; x += step) {
      const nx = x / w;
      const ridgeNoise =
        noise(nx * (5 + layer * 2), layer * 1.7, seed) * 0.55 +
        noise(nx * (14 + layer * 4), layer * 2.3, seed + 73) * 0.45;
      const y = horizon + layer * (usableH * 0.078)
        + Math.sin(nx * (5 + layer * 1.9) + seed * 0.002) * (24 - layer * 2)
        + (ridgeNoise - 0.5) * (54 - layer * 5);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, usableH);
    ctx.closePath();
    const shade = 24 + layer * 25;
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${0.74 - layer * 0.055})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(220,230,235,${0.05 + layer * 0.035})`;
    ctx.stroke();
    drawPointCloud(ctx, rng, 420 - layer * 38, { x: 0, y: Math.max(0, horizon + layer * 34 - 40), w, h: usableH - horizon }, shade + 34, 0.035 + layer * 0.006, 0.6, 2.4);
  }

  const ground = ctx.createLinearGradient(0, horizon, 0, usableH);
  ground.addColorStop(0, 'rgba(72,76,74,0.18)');
  ground.addColorStop(0.56, 'rgba(110,112,108,0.28)');
  ground.addColorStop(1, 'rgba(160,164,156,0.34)');
  ctx.fillStyle = ground;
  ctx.fillRect(0, horizon, w, usableH - horizon);

  drawPointCloud(ctx, rng, 6200, { x: 0, y: horizon, w, h: usableH - horizon }, 118, 0.045, 0.4, 2.1);

  for (let i = 0; i < 190; i++) {
    const x = rng() * w;
    const y = horizon + rng() * (usableH - horizon);
    const depth = y / usableH;
    const s = depth * (2 + rng() * 14);
    const tone = 150 + Math.floor(depth * 70 + rng() * 34);
    ctx.fillStyle = `rgba(${tone},${tone},${tone},${0.10 + depth * 0.20 + rng() * 0.16})`;
    ctx.beginPath();
    ctx.ellipse(x, y, s * (1.2 + rng()), s * (0.35 + rng() * 0.35), rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    if (depth > 0.72 && rng() > 0.62) {
      ctx.strokeStyle = `rgba(230,235,230,${0.04 + rng() * 0.08})`;
      ctx.beginPath();
      ctx.moveTo(x - s * 2.5, y + s * 0.25);
      ctx.lineTo(x + s * 2.5, y - s * 0.25);
      ctx.stroke();
    }
  }

  if (planet.hasLife) {
    for (let i = 0; i < 90; i++) {
      const x = rng() * w;
      const y = horizon + rng() * (usableH - horizon - 40);
      const depth = Math.max(0.35, y / usableH);
      const len = (8 + rng() * 38) * depth;
      ctx.strokeStyle = `rgba(210,232,210,${0.07 + rng() * 0.17})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + (rng() - 0.5) * 18, y - len * 0.5, x + (rng() - 0.5) * 10, y - len);
      ctx.stroke();
    }
  }

  const foreground = ctx.createLinearGradient(0, usableH * 0.76, 0, usableH);
  foreground.addColorStop(0, 'rgba(180,186,178,0)');
  foreground.addColorStop(1, 'rgba(215,220,210,0.16)');
  ctx.fillStyle = foreground;
  ctx.fillRect(0, usableH * 0.76, w, usableH * 0.24);

  ctx.fillStyle = 'rgba(210,220,225,0.16)';
  ctx.fillRect(w * 0.075, usableH - 74, w * 0.22, 24);
  ctx.fillRect(w * 0.12, usableH - 98, 13, 48);
  ctx.beginPath();
  ctx.arc(w * 0.26, usableH - 50, 18, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(210,220,225,0.13)';
  ctx.fill();

  const lens = ctx.createRadialGradient(w * 0.5, usableH * 0.52, usableH * 0.16, w * 0.5, usableH * 0.52, usableH * 0.78);
  lens.addColorStop(0, 'rgba(255,255,255,0.035)');
  lens.addColorStop(0.58, 'rgba(255,255,255,0)');
  lens.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = lens;
  ctx.fillRect(0, 0, w, usableH);
}

export function renderMissionProbePhoto(params: {
  planet: Planet;
  star: Star;
  report: PlanetReportSummary;
  width?: number;
  height?: number;
}): string {
  const { planet, star, report } = params;
  const w = params.width ?? 1280;
  const h = params.height ?? 720;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  const seed = hashSeed(`${planet.id}:${report.missionId}:${report.missionType}`);
  const rng = rngFromSeed(seed);

  if (report.missionType === 'surface_landing') {
    drawRoverView(ctx, planet, seed, rng, w, h);
  } else {
    drawOrbitalMap(ctx, planet, report.missionType, seed, rng, w, h);
  }
  drawCrosshair(ctx, w, h);
  drawScanlines(ctx, w, h, rng);
  drawMetadata(ctx, planet, star, report, w, h);

  return canvas.toDataURL('image/png');
}

export function getMissionPhotoKey(planetId: string, report: PlanetReportSummary): string {
  const prefix = report.missionType === 'surface_landing' ? 'planet-rover' : 'planet-probe';
  return `${prefix}-${planetId}__${report.missionId}`;
}
