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
    : report.missionType === 'drone_recon'
      ? 'DRONE RECON CAM'
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

function colorToRgb(color: number): [number, number, number] {
  return [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function mixRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];
}

function rgba(rgb: [number, number, number], alpha: number): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

function planetPalette(planet: Planet): {
  land: [number, number, number];
  high: [number, number, number];
  water: [number, number, number];
  ice: [number, number, number];
  cloud: [number, number, number];
} {
  if (planet.type === 'gas-giant') {
    return { land: [176, 128, 78], high: [228, 186, 122], water: [112, 92, 86], ice: [238, 226, 204], cloud: [232, 210, 178] };
  }
  if (planet.type === 'ice-giant') {
    return { land: [86, 154, 174], high: [148, 220, 230], water: [45, 102, 150], ice: [222, 244, 250], cloud: [192, 235, 242] };
  }
  if (planet.type === 'dwarf') {
    return { land: [114, 108, 100], high: [174, 168, 154], water: [54, 78, 108], ice: [216, 222, 224], cloud: [190, 194, 190] };
  }
  if (planet.hasLife) {
    return { land: [86, 116, 72], high: [168, 146, 96], water: [42, 105, 138], ice: [220, 236, 238], cloud: [216, 226, 220] };
  }
  const temp = planet.surfaceTempK;
  if (temp > 420) return { land: [148, 80, 42], high: [226, 154, 82], water: [72, 58, 62], ice: [214, 198, 184], cloud: [218, 184, 142] };
  if (temp < 240) return { land: [98, 116, 124], high: [174, 194, 204], water: [50, 86, 128], ice: [225, 238, 244], cloud: [204, 220, 226] };
  return { land: [130, 108, 78], high: [192, 166, 114], water: [48, 96, 132], ice: [224, 232, 228], cloud: [214, 218, 210] };
}

function drawOrbitalGlobe(
  ctx: CanvasRenderingContext2D,
  planet: Planet,
  missionType: PlanetMissionType,
  seed: number,
  rng: Rng,
  w: number,
  usableH: number,
): void {
  const palette = planetPalette(planet);
  const cx = w * 0.5;
  const cy = usableH * 0.47;
  const radius = Math.min(w * 0.31, usableH * 0.42);
  const water = planet.hydrosphere?.waterCoverageFraction ?? 0;
  const ice = planet.hydrosphere?.iceCapFraction ?? 0;
  const atmosphere = planet.atmosphere?.surfacePressureAtm ?? 0;
  const isGiant = planet.type === 'gas-giant' || planet.type === 'ice-giant' || missionType === 'deep_atmosphere_probe';

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  const image = ctx.createImageData(Math.ceil(radius * 2), Math.ceil(radius * 2));
  const width = image.width;
  const height = image.height;
  const data = image.data;
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const dx = (px / (width - 1)) * 2 - 1;
      const dy = (py / (height - 1)) * 2 - 1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = (py * width + px) * 4;
      if (dist > 1) {
        data[idx + 3] = 0;
        continue;
      }
      const sphereX = dx * Math.sqrt(Math.max(0, 1 - dy * dy * 0.35));
      const sphereY = dy;
      const lat = Math.asin(Math.max(-1, Math.min(1, sphereY))) / (Math.PI / 2);
      const lon = Math.atan2(sphereX, Math.sqrt(Math.max(0.0001, 1 - sphereX * sphereX - sphereY * sphereY))) / Math.PI;
      const n =
        noise(lon * 3.2 + 2.1, lat * 2.6, seed) * 0.46 +
        noise(lon * 8.4, lat * 6.8 + 1.7, seed + 31) * 0.34 +
        noise(lon * 18.0, lat * 15.0, seed + 89) * 0.20;
      const polar = Math.abs(lat);
      let base: [number, number, number];
      if (isGiant) {
        const band = 0.5 + Math.sin((lat * 9.5 + n * 1.6 + seed * 0.0007)) * 0.5;
        base = mixRgb(palette.land, palette.high, band);
      } else if (polar > Math.max(0.72, 1 - ice * 1.9)) {
        base = palette.ice;
      } else if (water > 0.04 && n < water * 0.58) {
        base = mixRgb(palette.water, palette.ice, Math.max(0, polar - 0.72) * 1.8);
      } else {
        base = mixRgb(palette.land, palette.high, Math.max(0, n - 0.35) * 1.45);
      }
      const limb = Math.pow(1 - dist, 0.38);
      const light = 0.42 + limb * 0.78 + Math.max(0, -dx - dy * 0.22) * 0.16;
      data[idx] = Math.max(0, Math.min(255, base[0] * light));
      data[idx + 1] = Math.max(0, Math.min(255, base[1] * light));
      data[idx + 2] = Math.max(0, Math.min(255, base[2] * light));
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(image, cx - radius, cy - radius);

  ctx.globalCompositeOperation = 'screen';
  if (isGiant) {
    for (let i = 0; i < 16; i++) {
      const y = cy - radius * 0.76 + (i / 15) * radius * 1.52;
      const bandW = radius * (1.7 + rng() * 0.28);
      ctx.strokeStyle = rgba(mixRgb(palette.cloud, palette.high, rng()), 0.16 + rng() * 0.18);
      ctx.lineWidth = 3 + rng() * 8;
      ctx.beginPath();
      for (let x = cx - bandW; x <= cx + bandW; x += 18) {
        const dx = (x - cx) / radius;
        const edge = Math.sqrt(Math.max(0, 1 - dx * dx));
        const yy = y + Math.sin(x * 0.018 + i * 1.4 + seed * 0.01) * (3 + rng() * 8) * edge;
        if (x === cx - bandW) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  } else {
    const cloudCount = 12 + Math.floor(Math.min(1, atmosphere / 1.2) * 16);
    for (let i = 0; i < cloudCount; i++) {
      const x = cx + (rng() - 0.5) * radius * 1.5;
      const y = cy + (rng() - 0.5) * radius * 1.3;
      if ((x - cx) ** 2 + (y - cy) ** 2 > radius ** 2 * 0.82) continue;
      ctx.fillStyle = rgba(palette.cloud, 0.08 + rng() * 0.15);
      ctx.beginPath();
      ctx.ellipse(x, y, radius * (0.09 + rng() * 0.16), radius * (0.018 + rng() * 0.035), rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = 'source-over';

  ctx.restore();

  const atmoAlpha = Math.min(0.42, 0.09 + atmosphere * 0.05 + (isGiant ? 0.12 : 0));
  const glow = ctx.createRadialGradient(cx, cy, radius * 0.92, cx, cy, radius * 1.42);
  glow.addColorStop(0, rgba(palette.cloud, atmoAlpha));
  glow.addColorStop(1, rgba(palette.cloud, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(cx - radius * 1.45, cy - radius * 1.45, radius * 2.9, radius * 2.9);

  ctx.strokeStyle = 'rgba(220,235,245,0.32)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  if (missionType === 'orbital_probe' || missionType === 'orbital_scan') {
    ctx.save();
    ctx.strokeStyle = 'rgba(123,184,255,0.34)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius * 1.25, radius * 0.20, -0.38, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(123,184,255,0.85)';
    const satA = (seed % 360) * Math.PI / 180;
    const sx = cx + Math.cos(satA) * radius * 1.25;
    const sy = cy + Math.sin(satA) * radius * 0.20;
    ctx.fillRect(sx - 3, sy - 3, 6, 6);
    ctx.restore();
  }
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

  ctx.fillStyle = '#03060a';
  ctx.fillRect(0, 0, w, h);

  drawOrbitalGlobe(ctx, planet, missionType, seed, rng, w, usableH);

  const palette = planetPalette(planet);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 9; i++) {
    const y = usableH * (0.12 + i * 0.085);
    ctx.strokeStyle = rgba(palette.cloud, 0.04 + i * 0.006);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.08, y);
    ctx.lineTo(w * 0.92, y + Math.sin(i + seed) * 10);
    ctx.stroke();
  }
  ctx.restore();
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

  if (planet.hasLife) {
    const mist = ctx.createLinearGradient(0, horizon - 24, 0, usableH);
    mist.addColorStop(0, 'rgba(120,160,126,0.05)');
    mist.addColorStop(1, 'rgba(80,120,92,0.11)');
    ctx.fillStyle = mist;
    ctx.fillRect(0, horizon - 24, w, usableH - horizon + 24);
  } else {
    ctx.fillStyle = 'rgba(210,220,225,0.16)';
    ctx.fillRect(w * 0.075, usableH - 74, w * 0.22, 24);
    ctx.fillRect(w * 0.12, usableH - 98, 13, 48);
    ctx.beginPath();
    ctx.arc(w * 0.26, usableH - 50, 18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(210,220,225,0.13)';
    ctx.fill();
  }

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

  if (report.missionType === 'surface_landing' || report.missionType === 'drone_recon') {
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
  const prefix = report.missionType === 'surface_landing'
    ? 'planet-rover'
    : report.missionType === 'drone_recon'
      ? 'planet-drone'
      : 'planet-probe';
  return `${prefix}-${planetId}__${report.missionId}`;
}
