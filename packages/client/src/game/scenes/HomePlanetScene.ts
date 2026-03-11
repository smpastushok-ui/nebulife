import { Container, Graphics } from 'pixi.js';
import type { StarSystem, Planet, Star } from '@nebulife/core';
import { createHomePlanetBackdrop, createVignette, type TwinkleStar } from '../rendering/HomePlanetBackdrop.js';
import { renderPlanetCloseup, renderMoon, renderDistantStar, type PlanetCloseupOptions, type MoonRenderResult } from '../rendering/HomePlanetRenderer.js';

interface LODLevel {
  maxScale: number;
  options: PlanetCloseupOptions;
}

interface ShootingStar {
  gfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifetime: number;
  maxLife: number;
}

interface SupernovaFlash {
  gfx: Graphics;
  lifetime: number;
  maxLife: number;
  maxRadius: number;
}

const LOD_LEVELS: LODLevel[] = [
  { maxScale: 1.2, options: { lodMultiplier: 1, terrainOctaves: 5, cloudOctaves: 4, terminatorSteps: 20, cloudStep: 1.5 } },
  { maxScale: 1.8, options: { lodMultiplier: 2, terrainOctaves: 6, cloudOctaves: 5, terminatorSteps: 28, cloudStep: 1.2 } },
];

export class HomePlanetScene {
  container: Container;
  /** Vignette overlay — must be added to stage separately (screen-fixed) */
  vignetteOverlay: Container;
  private time = 0;

  private terminatorGroup: Container;
  private cloudGroup: Container;
  private moonContainer: Container;
  private moonLightingContainer: Container;
  private twinkleStars: TwinkleStar[];
  private lodMultiplier = 1;

  // Moon orbit params
  private moonOrbitRadius: number;
  private moonAngle = Math.PI * 0.3;
  private planetX: number;
  private planetY: number;
  private planetRadius: number;

  private planetContainer: Container;
  private backdropContainer: Container;
  private starContainer: Container;

  // Base positions (before orbital rotation)
  private starBaseX: number;
  private starBaseY: number;

  // Orbital camera — rotates around planet core
  private viewAngle = 0;
  private viewScale = 1;
  private screenW: number;
  private screenH: number;

  // LOD state
  private currentLOD = 0;
  private homePlanet: Planet;
  private homeStar: Star;
  private baseRadius: number;

  // Cosmic events
  private shootingStars: ShootingStar[] = [];
  private supernovae: SupernovaFlash[] = [];
  private shootingStarTimer = 5000 + Math.random() * 10000;   // first: 5-15s
  private supernovaTimer = 20000 + Math.random() * 40000;     // first: 20-60s

  constructor(
    system: StarSystem,
    homePlanet: Planet,
    screenW: number,
    screenH: number,
  ) {
    this.container = new Container();
    this.screenW = screenW;
    this.screenH = screenH;
    this.homePlanet = homePlanet;
    this.homeStar = system.star;

    const seed = system.seed;
    const planetRadius = Math.min(screenW, screenH) * 0.22;
    this.planetRadius = planetRadius;
    this.baseRadius = planetRadius;

    // Planet centered
    this.planetX = screenW / 2;
    this.planetY = screenH / 2;
    this.starBaseX = screenW * 0.12;
    this.starBaseY = screenH * 0.12;
    this.moonOrbitRadius = planetRadius * 1.8;

    // --- Backdrop (2x screen for full coverage at min zoom + rotation) ---
    const backdrop = createHomePlanetBackdrop(seed, screenW * 2, screenH * 2);
    backdrop.container.x = screenW / 2;
    backdrop.container.y = screenH / 2;
    this.container.addChild(backdrop.container);
    this.backdropContainer = backdrop.container;
    this.twinkleStars = backdrop.twinkleStars;

    // --- Vignette (lens distortion effect, screen-fixed) ---
    this.vignetteOverlay = createVignette(screenW, screenH);

    // --- Distant star (size from angular size + luminosity) ---
    const distAU = homePlanet.orbit.semiMajorAxisAU;
    const angularSize = system.star.radiusSolar / distAU;
    const brightness = Math.pow(system.star.luminositySolar, 0.25) / Math.sqrt(distAU);
    const starCoreSize = Math.max(6, Math.min(50, 12 * (angularSize * 0.5 + brightness * 0.5)));
    this.starContainer = renderDistantStar(system.star, starCoreSize);
    this.starContainer.x = this.starBaseX;
    this.starContainer.y = this.starBaseY;
    this.container.addChild(this.starContainer);

    // --- Moon ---
    const moonRadius = Math.max(18, planetRadius * 0.2);
    const moonResult = renderMoon(seed + 500, moonRadius);
    this.moonContainer = moonResult.container;
    this.moonLightingContainer = moonResult.lightingContainer;
    this.container.addChild(this.moonContainer);

    // --- Planet ---
    const planet = renderPlanetCloseup(homePlanet, system.star, planetRadius);
    planet.container.x = this.planetX;
    planet.container.y = this.planetY;
    this.container.addChild(planet.container);
    this.planetContainer = planet.container;
    this.terminatorGroup = planet.terminatorGroup;
    this.cloudGroup = planet.cloudGroup;

    // Orient terminator toward star
    this.updateTerminatorAngle();
    this.updateMoonPosition();
  }

  /** Point terminator shadow away from star */
  private updateTerminatorAngle() {
    const dx = this.starContainer.x - this.planetX;
    const dy = this.starContainer.y - this.planetY;
    this.terminatorGroup.rotation = Math.atan2(dy, dx) + Math.PI;
  }

  private updateMoonPosition() {
    const mx = this.planetX + Math.cos(this.moonAngle) * this.moonOrbitRadius;
    const my = this.planetY + Math.sin(this.moonAngle) * this.moonOrbitRadius * 0.35;
    this.moonContainer.x = mx;
    this.moonContainer.y = my;

    // Dynamic shadow: rotate lighting so shadow faces away from star
    const starAngle = Math.atan2(
      this.starContainer.y - my,
      this.starContainer.x - mx,
    );
    this.moonLightingContainer.rotation = starAngle + Math.PI;

    const sinA = Math.sin(this.moonAngle);
    const depthScale = 0.85 + sinA * 0.15;
    this.moonContainer.scale.set(depthScale);

    const moonIdx = this.container.getChildIndex(this.moonContainer);
    const planetIdx = this.container.getChildIndex(this.planetContainer);
    if (sinA > 0 && moonIdx < planetIdx) {
      this.container.setChildIndex(this.moonContainer, planetIdx);
    } else if (sinA <= 0 && moonIdx > planetIdx) {
      this.container.setChildIndex(this.moonContainer, planetIdx);
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

  /** Check if LOD level needs to change based on current viewScale */
  private checkLOD() {
    let targetLOD = LOD_LEVELS.length - 1;
    for (let i = 0; i < LOD_LEVELS.length; i++) {
      if (this.viewScale <= LOD_LEVELS[i].maxScale) {
        targetLOD = i;
        break;
      }
    }
    if (targetLOD !== this.currentLOD) {
      this.rebuildPlanet(targetLOD);
    }
  }

  /** Rebuild planet at new LOD level */
  private rebuildPlanet(newLOD: number) {
    const config = LOD_LEVELS[newLOD];

    // Save current state
    const termRotation = this.terminatorGroup.rotation;
    const planetIdx = this.container.getChildIndex(this.planetContainer);

    // Destroy old planet
    this.container.removeChild(this.planetContainer);
    this.planetContainer.destroy({ children: true });

    // Re-render at new LOD
    const planet = renderPlanetCloseup(
      this.homePlanet, this.homeStar, this.baseRadius, config.options,
    );

    // Scale down to compensate for larger render radius
    planet.container.x = this.planetX;
    planet.container.y = this.planetY;
    planet.container.scale.set(1 / config.options.lodMultiplier);

    // Re-insert at same display list position
    this.container.addChildAt(planet.container, planetIdx);

    this.planetContainer = planet.container;
    this.terminatorGroup = planet.terminatorGroup;
    this.cloudGroup = planet.cloudGroup;
    this.currentLOD = newLOD;
    this.lodMultiplier = config.options.lodMultiplier;

    // Restore state
    this.terminatorGroup.rotation = termRotation;
  }

  setPlanetVisible(visible: boolean) {
    this.planetContainer.visible = visible;
  }

  zoomIn() {
    this.viewScale = Math.min(1.8, this.viewScale * 1.2);
    this.applyView();
    this.checkLOD();
  }

  zoomOut() {
    this.viewScale = Math.max(0.5, this.viewScale / 1.2);
    this.applyView();
    this.checkLOD();
  }

  /** Rotate the orbital view by a delta angle (used for mouse/touch panning) */
  rotate(deltaAngle: number) {
    this.viewAngle += deltaAngle;
    this.applyView();
  }

  update(deltaMs: number) {
    this.time += deltaMs;

    // 1. Slow cosmos rotation (star + backdrop orbit around planet)
    this.viewAngle += deltaMs * 0.000015;
    this.applyView();

    // 2. Subtle cloud drift (atmospheric wind)
    this.cloudGroup.x -= deltaMs * 0.0008 * this.lodMultiplier;

    // 3. Moon orbit
    this.moonAngle += deltaMs * 0.00008;
    this.updateMoonPosition();

    // 4. Twinkle stars
    for (const star of this.twinkleStars) {
      star.graphic.alpha = star.baseAlpha + Math.sin(this.time * star.speed + star.phase) * star.baseAlpha * 0.4;
    }

    // 5. Cosmic events: shooting stars & micro supernovae
    this.shootingStarTimer -= deltaMs;
    if (this.shootingStarTimer <= 0) {
      this.spawnShootingStar();
      this.shootingStarTimer = 15000 + Math.random() * 45000; // 15-60s
    }
    this.supernovaTimer -= deltaMs;
    if (this.supernovaTimer <= 0) {
      this.spawnSupernova();
      this.supernovaTimer = 60000 + Math.random() * 120000; // 1-3 min
    }
    this.updateShootingStars(deltaMs);
    this.updateSupernovae(deltaMs);
  }

  // --- Shooting stars ---
  private spawnShootingStar() {
    const gfx = new Graphics();

    // Random start position in visible area (not on planet)
    const angle = Math.random() * Math.PI * 2;
    const dist = this.screenW * 0.25 + Math.random() * this.screenW * 0.35;
    const x = this.planetX + Math.cos(angle) * dist;
    const y = this.planetY + Math.sin(angle) * dist;

    // Direction: mostly across the sky
    const dirAngle = angle + Math.PI * 0.6 + (Math.random() - 0.5) * 1.0;
    const speed = 0.3 + Math.random() * 0.4; // px/ms
    const vx = Math.cos(dirAngle) * speed;
    const vy = Math.sin(dirAngle) * speed;

    const maxLife = 300 + Math.random() * 500; // 0.3-0.8s
    const streakLen = speed * 70;

    // Streak
    gfx.moveTo(0, 0);
    gfx.lineTo(-Math.cos(dirAngle) * streakLen, -Math.sin(dirAngle) * streakLen);
    gfx.stroke({ width: 1.2, color: 0xffffff, alpha: 0.7 });
    // Soft glow tail
    gfx.moveTo(0, 0);
    gfx.lineTo(-Math.cos(dirAngle) * streakLen * 0.4, -Math.sin(dirAngle) * streakLen * 0.4);
    gfx.stroke({ width: 3, color: 0xaaccff, alpha: 0.12 });

    gfx.x = x;
    gfx.y = y;

    // Insert behind the distant star
    const starIdx = this.container.getChildIndex(this.starContainer);
    this.container.addChildAt(gfx, starIdx);

    this.shootingStars.push({ gfx, x, y, vx, vy, lifetime: 0, maxLife });
  }

  private updateShootingStars(deltaMs: number) {
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const s = this.shootingStars[i];
      s.lifetime += deltaMs;
      s.x += s.vx * deltaMs;
      s.y += s.vy * deltaMs;
      s.gfx.x = s.x;
      s.gfx.y = s.y;

      // Fade in quickly, fade out
      const t = s.lifetime / s.maxLife;
      if (t < 0.08) {
        s.gfx.alpha = t / 0.08;
      } else if (t > 0.6) {
        s.gfx.alpha = (1 - t) / 0.4;
      } else {
        s.gfx.alpha = 1;
      }

      if (s.lifetime >= s.maxLife) {
        this.container.removeChild(s.gfx);
        s.gfx.destroy();
        this.shootingStars.splice(i, 1);
      }
    }
  }

  // --- Micro supernovae ---
  private spawnSupernova() {
    const gfx = new Graphics();

    // Random position — avoid planet area
    let x: number, y: number;
    let attempts = 0;
    do {
      x = this.planetX + (Math.random() - 0.5) * this.screenW * 0.9;
      y = this.planetY + (Math.random() - 0.5) * this.screenH * 0.9;
      attempts++;
    } while (
      Math.sqrt((x - this.planetX) ** 2 + (y - this.planetY) ** 2) < this.planetRadius * 1.5
      && attempts < 10
    );

    const maxLife = 2000 + Math.random() * 2000; // 2-4s
    const maxRadius = 2 + Math.random() * 4;

    gfx.x = x;
    gfx.y = y;

    const starIdx = this.container.getChildIndex(this.starContainer);
    this.container.addChildAt(gfx, starIdx);

    this.supernovae.push({ gfx, lifetime: 0, maxLife, maxRadius });
  }

  private updateSupernovae(deltaMs: number) {
    for (let i = this.supernovae.length - 1; i >= 0; i--) {
      const s = this.supernovae[i];
      s.lifetime += deltaMs;
      const t = s.lifetime / s.maxLife;

      s.gfx.clear();

      // Quick brightening (15%), slow fade (85%)
      const intensity = t < 0.15
        ? t / 0.15
        : Math.pow(1 - (t - 0.15) / 0.85, 2);
      const currentR = s.maxRadius * Math.min(1, t * 5);

      // Outer glow
      s.gfx.circle(0, 0, currentR * 4);
      s.gfx.fill({ color: 0x8899cc, alpha: intensity * 0.04 });
      s.gfx.circle(0, 0, currentR * 2);
      s.gfx.fill({ color: 0xaabbdd, alpha: intensity * 0.1 });
      // Core flash
      s.gfx.circle(0, 0, currentR);
      s.gfx.fill({ color: 0xffffff, alpha: intensity * 0.85 });

      if (t >= 1) {
        this.container.removeChild(s.gfx);
        s.gfx.destroy();
        this.supernovae.splice(i, 1);
      }
    }
  }

  destroy() {
    this.shootingStars.length = 0;
    this.supernovae.length = 0;
    this.container.destroy({ children: true });
    this.vignetteOverlay.destroy({ children: true });
  }
}
