import { Container, Graphics } from 'pixi.js';
import type { StarSystem, Planet } from '@nebulife/core';
import { SeededRNG } from '@nebulife/core';
import { createHomePlanetBackdrop, createVignette, type TwinkleStar } from '../rendering/HomePlanetBackdrop.js';
import { renderPlanetCloseup, renderMoon, renderDistantStar } from '../rendering/HomePlanetRenderer.js';
import { derivePlanetVisuals, lerpColor } from '../rendering/PlanetVisuals.js';

interface MoonOrbit {
  container: Container;
  lightingContainer: Container; // for dynamic shadow rotation
  angle: number;
  orbitRadius: number;
  orbitEccentricityY: number; // vertical compression for pseudo-3D
  angularSpeed: number;       // radians per ms
}

export class PlanetViewScene {
  container: Container;
  /** Vignette overlay — must be added to stage separately (screen-fixed) */
  vignetteOverlay: Container;
  private time = 0;

  private terminatorGroup: Container;
  private cloudGroup: Container;
  private twinkleStars: TwinkleStar[];

  // Moon orbits
  private moonOrbits: MoonOrbit[] = [];

  // Key containers for z-ordering
  private planetContainer: Container;
  private backdropContainer: Container;
  private starContainer: Container;

  // Base positions
  private starBaseX: number;
  private starBaseY: number;

  // Planet position
  private planetX: number;
  private planetY: number;
  private planetRadius: number;

  // Orbital camera
  private viewAngle = 0;
  private viewScale = 1;
  private screenW: number;
  private screenH: number;

  // Quantum scanning overlay
  private scanContainer: Container | null = null;
  private scanGfx: Graphics | null = null;
  private scanTime = 0;
  private scanActive = false;
  private scanProgress = 0;

  constructor(
    system: StarSystem,
    planet: Planet,
    screenW: number,
    screenH: number,
  ) {
    this.container = new Container();
    this.screenW = screenW;
    this.screenH = screenH;

    const seed = planet.seed;
    const planetRadius = Math.min(screenW, screenH) * 0.22;
    this.planetRadius = planetRadius;

    // Planet centered
    this.planetX = screenW / 2;
    this.planetY = screenH / 2;
    this.starBaseX = screenW * 0.12;
    this.starBaseY = screenH * 0.12;

    // --- Backdrop (2x screen for full coverage) ---
    const backdrop = createHomePlanetBackdrop(seed, screenW * 2, screenH * 2);
    backdrop.container.x = screenW / 2;
    backdrop.container.y = screenH / 2;
    this.container.addChild(backdrop.container);
    this.backdropContainer = backdrop.container;
    this.twinkleStars = backdrop.twinkleStars;

    // --- Nearby planets as bright dots in backdrop ---
    this.addNearbyPlanetDots(system, planet);

    // --- Vignette (screen-fixed) ---
    this.vignetteOverlay = createVignette(screenW, screenH);

    // --- Distant star (size from angular size + luminosity) ---
    const distAU = planet.orbit.semiMajorAxisAU;
    const angularSize = system.star.radiusSolar / distAU;
    const brightness = Math.pow(system.star.luminositySolar, 0.25) / Math.sqrt(distAU);
    const starCoreSize = Math.max(6, Math.min(50, 12 * (angularSize * 0.5 + brightness * 0.5)));
    this.starContainer = renderDistantStar(system.star, starCoreSize);
    this.starContainer.x = this.starBaseX;
    this.starContainer.y = this.starBaseY;
    this.container.addChild(this.starContainer);

    // --- Planet (must be added before moons for z-ordering) ---
    const planetResult = renderPlanetCloseup(planet, system.star, planetRadius);
    planetResult.container.x = this.planetX;
    planetResult.container.y = this.planetY;
    this.container.addChild(planetResult.container);
    this.planetContainer = planetResult.container;
    this.terminatorGroup = planetResult.terminatorGroup;
    this.cloudGroup = planetResult.cloudGroup;

    // --- Moons (after planet so getChildIndex works for z-ordering) ---
    this.setupMoons(planet, planetRadius, seed);

    // Orient terminator toward star
    this.updateTerminatorAngle();
  }

  /** Add other system planets as small bright dots in the sky */
  private addNearbyPlanetDots(system: StarSystem, currentPlanet: Planet) {
    const rng = new SeededRNG(currentPlanet.seed * 997 + 13);
    const dotsGfx = new Graphics();

    for (const p of system.planets) {
      if (p.id === currentPlanet.id) continue;

      // Random sky position (avoid planet center area)
      let x: number, y: number;
      let attempts = 0;
      do {
        x = (rng.next() - 0.5) * this.screenW * 1.6;
        y = (rng.next() - 0.5) * this.screenH * 1.6;
        attempts++;
      } while (
        Math.sqrt(x * x + y * y) < this.planetRadius * 2.5
        && attempts < 10
      );

      // Size & brightness from planet radius
      const size = Math.max(1.5, Math.min(4, p.radiusEarth * 1.2));
      const alpha = Math.max(0.15, Math.min(0.6, p.radiusEarth * 0.15));

      // Color from planet visuals
      const visuals = derivePlanetVisuals(p, system.star);
      const color = visuals.hasOcean
        ? lerpColor(visuals.oceanShallow, 0xffffff, 0.5)
        : lerpColor(visuals.surfaceBaseColor, 0xffffff, 0.4);

      // Glow
      dotsGfx.circle(x, y, size * 3);
      dotsGfx.fill({ color, alpha: alpha * 0.1 });
      // Core
      dotsGfx.circle(x, y, size);
      dotsGfx.fill({ color, alpha });
    }

    this.backdropContainer.addChild(dotsGfx);
  }

  /** Setup 0-N moons from planet data */
  private setupMoons(planet: Planet, planetRadius: number, systemSeed: number) {
    const moons = planet.moons;
    if (moons.length === 0) return;

    // Planet radius in km for scaling
    const planetRadiusKm = planet.radiusEarth * 6371;

    // Find max orbital radius for proportional spacing
    const maxOrbitalKm = Math.max(...moons.map(m => m.orbitalRadiusKm));

    for (let i = 0; i < moons.length; i++) {
      const moon = moons[i];

      // Visual radius: proportional to moon's real radius, clamped
      const rawVisualR = planetRadius * (moon.radiusKm / planetRadiusKm);
      const moonVisualRadius = Math.max(8, Math.min(planetRadius * 0.35, rawVisualR));

      // Orbit radius: spread moons evenly with some proportional scaling
      const normalizedDist = maxOrbitalKm > 0 ? moon.orbitalRadiusKm / maxOrbitalKm : 0.5;
      const orbitRadius = planetRadius * 1.4 + normalizedDist * planetRadius * 2.0;

      // Angular speed from orbital period
      const angularSpeed = (2 * Math.PI) / (moon.orbitalPeriodDays * 120000);

      // Starting angle from moon seed
      const rng = new SeededRNG(moon.seed);
      const startAngle = rng.next() * Math.PI * 2;

      // Vary eccentricity per moon for visual interest
      const orbitEccentricityY = 0.30 + rng.next() * 0.15;

      // Render moon with composition-driven visuals
      const moonResult = renderMoon(moon.seed, moonVisualRadius, {
        compositionType: moon.compositionType,
        surfaceTempK: moon.surfaceTempK,
      });
      this.container.addChild(moonResult.container);

      this.moonOrbits.push({
        container: moonResult.container,
        lightingContainer: moonResult.lightingContainer,
        angle: startAngle,
        orbitRadius,
        orbitEccentricityY,
        angularSpeed,
      });
    }

    this.updateMoonPositions();
  }

  /** Point terminator shadow away from star */
  private updateTerminatorAngle() {
    const dx = this.starContainer.x - this.planetX;
    const dy = this.starContainer.y - this.planetY;
    this.terminatorGroup.rotation = Math.atan2(dy, dx) + Math.PI;
  }

  private updateMoonPositions() {
    // Sort moons by sin(angle) for z-ordering
    const sorted = this.moonOrbits
      .map((m, i) => ({ m, i, depth: Math.sin(m.angle) }))
      .sort((a, b) => a.depth - b.depth);

    const planetIdx = this.container.getChildIndex(this.planetContainer);

    for (const { m, depth } of sorted) {
      const mx = this.planetX + Math.cos(m.angle) * m.orbitRadius;
      const my = this.planetY + Math.sin(m.angle) * m.orbitRadius * m.orbitEccentricityY;
      m.container.x = mx;
      m.container.y = my;

      // Dynamic shadow: rotate lighting so shadow faces away from star
      const starAngle = Math.atan2(
        this.starContainer.y - my,
        this.starContainer.x - mx,
      );
      m.lightingContainer.rotation = starAngle + Math.PI;

      // Depth-based scale
      const depthScale = 0.85 + depth * 0.15;
      m.container.scale.set(depthScale);

      // Z-order: if sin(angle) > 0, moon is in front of planet
      const moonIdx = this.container.getChildIndex(m.container);
      if (depth > 0 && moonIdx < planetIdx) {
        this.container.setChildIndex(m.container, planetIdx);
      } else if (depth <= 0 && moonIdx > planetIdx) {
        this.container.setChildIndex(m.container, Math.max(0, planetIdx));
      }
    }
  }

  private applyView() {
    this.container.scale.set(this.viewScale);
    this.container.x = this.screenW / 2 - this.planetX * this.viewScale;
    this.container.y = this.screenH / 2 - this.planetY * this.viewScale;

    const cos = Math.cos(this.viewAngle);
    const sin = Math.sin(this.viewAngle);

    const sdx = this.starBaseX - this.planetX;
    const sdy = this.starBaseY - this.planetY;
    this.starContainer.x = this.planetX + sdx * cos - sdy * sin;
    this.starContainer.y = this.planetY + sdx * sin + sdy * cos;

    // Counter-scale backdrop so stars always fill the screen at low zoom
    const backdropScale = Math.max(1, 1 / this.viewScale);
    this.backdropContainer.scale.set(backdropScale);

    this.backdropContainer.rotation = this.viewAngle;
    this.updateTerminatorAngle();
  }

  setPlanetVisible(visible: boolean) {
    this.planetContainer.visible = visible;
    // Also hide/show moons when planet is hidden (3D model takes over)
    for (const moon of this.moonOrbits) {
      moon.container.visible = visible;
    }
  }

  zoomIn() {
    this.viewScale = Math.min(1.8, this.viewScale * 1.2);
    this.applyView();
  }

  zoomOut() {
    this.viewScale = Math.max(0.5, this.viewScale / 1.2);
    this.applyView();
  }

  /** Rotate the cosmos view by delta radians (drag-to-rotate) */
  rotate(delta: number) {
    this.viewAngle += delta;
    this.applyView();
  }

  update(deltaMs: number) {
    this.time += deltaMs;

    // 1. Slow cosmos rotation
    this.viewAngle += deltaMs * 0.000015;
    this.applyView();

    // 2. Cloud drift
    this.cloudGroup.x -= deltaMs * 0.0008;

    // 3. Moon orbits
    for (const moon of this.moonOrbits) {
      moon.angle += moon.angularSpeed * deltaMs;
    }
    if (this.moonOrbits.length > 0) {
      this.updateMoonPositions();
    }

    // 4. Twinkle stars
    for (const star of this.twinkleStars) {
      star.graphic.alpha = star.baseAlpha + Math.sin(this.time * star.speed + star.phase) * star.baseAlpha * 0.4;
    }

    // 5. Scanning overlay
    if (this.scanActive && this.scanGfx) {
      this.scanTime += deltaMs;
      this.redrawScanOverlay();
    }
  }

  /** Activate scanning effects on the planet */
  startScanning() {
    if (this.scanActive) return;
    this.scanActive = true;
    this.scanTime = 0;
    this.scanProgress = 0;

    this.scanContainer = new Container();
    this.scanContainer.x = this.planetX;
    this.scanContainer.y = this.planetY;

    this.scanGfx = new Graphics();
    this.scanContainer.addChild(this.scanGfx);

    // Insert above planetContainer
    const planetIdx = this.container.getChildIndex(this.planetContainer);
    this.container.addChildAt(this.scanContainer, planetIdx + 1);
  }

  /** Deactivate scanning effects */
  stopScanning() {
    if (!this.scanActive) return;
    this.scanActive = false;
    if (this.scanContainer) {
      this.container.removeChild(this.scanContainer);
      this.scanContainer.destroy({ children: true });
      this.scanContainer = null;
      this.scanGfx = null;
    }
  }

  /** Update scanning progress (0-100) */
  updateScanProgress(progress: number) {
    this.scanProgress = Math.max(0, Math.min(100, progress));
  }

  private redrawScanOverlay() {
    const gfx = this.scanGfx;
    if (!gfx) return;
    gfx.clear();
    const R = this.planetRadius;
    const t = this.scanTime;
    this.drawWireframeGrid(gfx, R, t);
    this.drawLidarBeam(gfx, R, t);
    this.drawHudRings(gfx, R, t);
    this.drawProgressArc(gfx, R);
  }

  private drawWireframeGrid(gfx: Graphics, R: number, time: number) {
    const SCAN_GREEN = 0x44ffaa;
    const lonRotation = time * 0.0003;
    const scanCycle = (time * 0.0004) % Math.PI;
    const scanLat = Math.PI / 2 - scanCycle;

    for (let i = 0; i < 5; i++) {
      const lat = -Math.PI / 2 + (Math.PI / 6) * (i + 1);
      const yOff = R * Math.sin(lat);
      const rCircle = R * Math.cos(lat);
      if (rCircle < 2) continue;
      const dist = Math.abs(lat - scanLat);
      const alpha = dist < 0.3 ? 0.35 + (0.3 - dist) * 1.0 : 0.15;
      gfx.circle(0, -yOff, rCircle);
      gfx.stroke({ width: 0.8, color: SCAN_GREEN, alpha });
    }

    const steps = 30;
    for (let i = 0; i < 6; i++) {
      const lon = (Math.PI / 6) * i + lonRotation;
      const sinLon = Math.sin(lon);
      const alphaBase = Math.abs(sinLon) > 0.05 ? 0.2 * Math.abs(sinLon) : 0;
      if (alphaBase < 0.01) continue;
      gfx.moveTo(R * sinLon * Math.cos(-Math.PI / 2), R * Math.sin(Math.PI / 2));
      for (let j = 1; j <= steps; j++) {
        const phi = -Math.PI / 2 + (Math.PI / steps) * j;
        gfx.lineTo(R * Math.cos(phi) * sinLon, -R * Math.sin(phi));
      }
      gfx.stroke({ width: 0.8, color: SCAN_GREEN, alpha: alphaBase });
    }

    const scanY = -R * Math.sin(scanLat);
    const scanR = R * Math.cos(scanLat);
    if (scanR > 2) {
      gfx.circle(0, scanY, scanR);
      gfx.stroke({ width: 1.5, color: 0x88ffcc, alpha: 0.6 });
      gfx.circle(0, scanY, scanR);
      gfx.stroke({ width: 5, color: 0x44ffaa, alpha: 0.08 });
    }
  }

  private drawLidarBeam(gfx: Graphics, R: number, time: number) {
    const LIDAR_GREEN = 0x44ff88;
    const beamAngle = time * 0.0015;
    const bx = Math.cos(beamAngle) * R;
    const by = Math.sin(beamAngle) * R;

    gfx.moveTo(0, 0);
    gfx.lineTo(bx, by);
    gfx.stroke({ width: 1.5, color: LIDAR_GREEN, alpha: 0.5 });
    gfx.moveTo(0, 0);
    gfx.lineTo(bx, by);
    gfx.stroke({ width: 5, color: LIDAR_GREEN, alpha: 0.08 });

    const trailSegments = 12;
    const trailSpan = Math.PI / 3;
    for (let i = 0; i < trailSegments; i++) {
      const segAngle = beamAngle - (trailSpan / trailSegments) * (i + 1);
      const nextAngle = beamAngle - (trailSpan / trailSegments) * i;
      const alpha = 0.15 * (1 - i / trailSegments);
      gfx.moveTo(Math.cos(segAngle) * R, Math.sin(segAngle) * R);
      gfx.lineTo(Math.cos(nextAngle) * R, Math.sin(nextAngle) * R);
      gfx.stroke({ width: 2, color: LIDAR_GREEN, alpha });
    }

    gfx.circle(bx, by, 3);
    gfx.fill({ color: LIDAR_GREEN, alpha: 0.7 });
    gfx.circle(bx, by, 6);
    gfx.fill({ color: LIDAR_GREEN, alpha: 0.1 });
  }

  private drawHudRings(gfx: Graphics, R: number, time: number) {
    const HUD_BLUE = 0x4488aa;
    this.drawSegmentedRing(gfx, R * 1.15, 24, time * 0.0002, HUD_BLUE, 0.25);
    this.drawSegmentedRing(gfx, R * 1.35, 36, -time * 0.00015, HUD_BLUE, 0.18);
  }

  private drawSegmentedRing(
    gfx: Graphics,
    radius: number,
    segments: number,
    rotation: number,
    color: number,
    alpha: number,
  ) {
    const gap = 0.03;
    const segAngle = (Math.PI * 2) / segments;
    for (let i = 0; i < segments; i++) {
      const startAngle = segAngle * i + rotation;
      const endAngle = startAngle + segAngle - gap;
      const steps = 4;
      gfx.moveTo(Math.cos(startAngle) * radius, Math.sin(startAngle) * radius);
      for (let j = 1; j <= steps; j++) {
        const a = startAngle + ((endAngle - startAngle) / steps) * j;
        gfx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
      }
      gfx.stroke({ width: 0.8, color, alpha });
      if (i % 4 === 0) {
        const midAngle = (startAngle + endAngle) / 2;
        const mx = Math.cos(midAngle);
        const my = Math.sin(midAngle);
        gfx.moveTo(mx * (radius - 3), my * (radius - 3));
        gfx.lineTo(mx * (radius + 3), my * (radius + 3));
        gfx.stroke({ width: 1.2, color, alpha: alpha * 1.5 });
      }
    }
  }

  private drawProgressArc(gfx: Graphics, R: number) {
    if (this.scanProgress <= 0) return;
    const ARC_GREEN = 0x44ff88;
    const arcR = R * 1.5;
    const totalAngle = (this.scanProgress / 100) * Math.PI * 2;
    const startAngle = -Math.PI / 2;
    const steps = Math.max(8, Math.floor(totalAngle * 20));
    gfx.moveTo(Math.cos(startAngle) * arcR, Math.sin(startAngle) * arcR);
    for (let i = 1; i <= steps; i++) {
      const a = startAngle + (totalAngle / steps) * i;
      gfx.lineTo(Math.cos(a) * arcR, Math.sin(a) * arcR);
    }
    gfx.stroke({ width: 2, color: ARC_GREEN, alpha: 0.5 });
    gfx.moveTo(Math.cos(startAngle) * arcR, Math.sin(startAngle) * arcR);
    for (let i = 1; i <= steps; i++) {
      const a = startAngle + (totalAngle / steps) * i;
      gfx.lineTo(Math.cos(a) * arcR, Math.sin(a) * arcR);
    }
    gfx.stroke({ width: 6, color: ARC_GREEN, alpha: 0.08 });
    const tipAngle = startAngle + totalAngle;
    gfx.circle(Math.cos(tipAngle) * (arcR + 10), Math.sin(tipAngle) * (arcR + 10), 3);
    gfx.fill({ color: ARC_GREEN, alpha: 0.6 });
  }

  destroy() {
    this.stopScanning();
    this.container.destroy({ children: true });
    this.vignetteOverlay.destroy({ children: true });
  }
}
