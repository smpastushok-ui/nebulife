import { Container, Graphics, Text } from 'pixi.js';
import type { StarSystem, Planet } from '@nebulife/core';
import { SeededRNG } from '@nebulife/core';
import { renderStar } from '../rendering/StarRenderer.js';
import { renderPlanet, renderOrbitProjected, renderSystemMoon, getPlanetSize, Y_COMPRESS } from '../rendering/PlanetRenderer.js';
import type { TwinkleStar } from '../rendering/HomePlanetBackdrop.js';

/**
 * Non-linear AU → screen-pixel mapping.
 * Logarithmic compression handles extreme distance ranges.
 */
function auToScreen(au: number): number {
  return Math.log2(1 + au * 4) * 100;
}

// --- Background color palettes ---
const WHITE_COLORS = [0xffffff, 0xeeeeff, 0xffeeff, 0xeeffff];
const WARM_COLORS = [0xffeedd, 0xffddbb, 0xffcc99];
const COOL_COLORS = [0xaaccff, 0x88bbff, 0x99ccff];
const NEBULA_COLORS = [0x2244aa, 0x443388, 0x224466, 0x553366];

interface MoonNode {
  gfx: Graphics;
  angle: number;
  orbitRadius: number;
  angularSpeed: number;
}

interface PlanetNode {
  container: Container;
  lightingGroup: Container;
  planet: Planet;
  angle: number;
  distance: number;
  eccentricity: number;
  moonNodes: MoonNode[];
}

interface SysShootingStar {
  gfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifetime: number;
  maxLife: number;
}

export class SystemScene {
  container: Container;
  /** Max orbital distance in pixels — used to fit all planets on screen */
  maxExtent = 0;
  /** Background star field size in pixels — used to set camera minScale */
  fieldSize = 0;
  private planetNodes: Map<string, PlanetNode> = new Map();
  private time = 0;
  private starCorona: Container | null = null;
  private twinkleStars: TwinkleStar[] = [];
  private orbitContainer: Container;

  // Shooting stars in system background
  private sysShootingStars: SysShootingStar[] = [];
  private sysShootingStarTimer = 5000 + Math.random() * 5000; // first: 5-10s

  constructor(
    private system: StarSystem,
    private onPlanetSelect: (planet: Planet, screenPos: { x: number; y: number }) => void,
  ) {
    this.container = new Container();
    this.container.eventMode = 'static';
    this.container.sortableChildren = true;

    // Pre-compute max extent for background sizing
    for (const planet of system.planets) {
      const d = auToScreen(planet.orbit.semiMajorAxisAU);
      if (d > this.maxExtent) this.maxExtent = d;
    }

    // Background (z-index: always behind everything)
    this.drawBackground();

    // Orbit container (z-index: 0, always behind planets)
    this.orbitContainer = new Container();
    this.orbitContainer.zIndex = 0;
    this.container.addChild(this.orbitContainer);

    // Habitable zone overlay
    this.drawHabitableZone();

    // Star at center — size from radiusSolar (log-scale)
    const starSize = Math.max(12, Math.min(50, 10 + Math.log2(1 + system.star.radiusSolar) * 12));
    const starResult = renderStar(system.star, starSize);
    starResult.container.zIndex = 10000;
    this.container.addChild(starResult.container);
    this.starCorona = starResult.corona;

    // Star label
    const starLabel = new Text({
      text: `${system.star.name}\n${system.star.spectralClass}${system.star.subType}V  ${system.star.temperatureK}K`,
      style: { fontSize: 10, fill: 0x889999, fontFamily: 'monospace', align: 'center' },
    });
    starLabel.anchor.set(0.5, 0);
    starLabel.y = starSize + 8;
    starLabel.zIndex = 10001;
    this.container.addChild(starLabel);

    // System name
    const sysLabel = new Text({
      text: system.name,
      style: { fontSize: 14, fill: 0x556677, fontFamily: 'monospace', letterSpacing: 3 },
    });
    sysLabel.anchor.set(0.5, 1);
    sysLabel.y = -Math.max(200, system.planets.length * 30) - 20;
    sysLabel.zIndex = 10002;
    this.container.addChild(sysLabel);

    // Orbits and planets
    for (const planet of system.planets) {
      this.addPlanetNode(planet);
    }

    // Asteroid belts
    for (const belt of system.asteroidBelts) {
      const innerR = auToScreen(belt.innerRadiusAU);
      const outerR = auToScreen(belt.outerRadiusAU);
      const beltGfx = new Graphics();
      for (let i = 0; i < 80; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = innerR + Math.random() * (outerR - innerR);
        beltGfx.circle(Math.cos(angle) * r, Math.sin(angle) * r * Y_COMPRESS, 1);
      }
      beltGfx.fill({ color: 0x665544, alpha: 0.3 });
      beltGfx.zIndex = 1;
      this.container.addChild(beltGfx);
    }
  }

  private drawBackground() {
    const rng = new SeededRNG(this.system.seed * 7919 + 31);
    this.fieldSize = Math.max(2000, this.maxExtent * 3);
    const fieldSize = this.fieldSize;
    const halfField = fieldSize / 2;

    function pick(arr: number[]): number {
      return arr[Math.floor(rng.next() * arr.length)];
    }

    // Layer 1: Deep background stars (many, tiny, dim)
    const deepStars = new Graphics();
    const deepCount = Math.max(2000, Math.floor(fieldSize / 2));
    for (let i = 0; i < deepCount; i++) {
      const x = (rng.next() - 0.5) * fieldSize;
      const y = (rng.next() - 0.5) * fieldSize;
      const size = rng.next() * 0.8 + 0.2;
      const alpha = rng.next() * 0.2 + 0.03;
      deepStars.circle(x, y, size);
      deepStars.fill({ color: pick(WHITE_COLORS), alpha });
    }
    deepStars.zIndex = -3;
    this.container.addChild(deepStars);

    // Layer 2: Medium colored stars (fewer, brighter)
    const medStars = new Graphics();
    const medCount = Math.max(150, Math.floor(fieldSize / 10));
    for (let i = 0; i < medCount; i++) {
      const x = (rng.next() - 0.5) * fieldSize;
      const y = (rng.next() - 0.5) * fieldSize;
      const size = rng.next() * 1.0 + 0.8;
      const alpha = rng.next() * 0.3 + 0.1;
      const color = rng.next() < 0.5 ? pick(WARM_COLORS) : pick(COOL_COLORS);
      medStars.circle(x, y, size);
      medStars.fill({ color, alpha });
    }
    medStars.zIndex = -2;
    this.container.addChild(medStars);

    // Layer 3: Nebula wisps (2-3 large diffuse patches)
    const nebulaCount = rng.nextInt(2, 3);
    for (let i = 0; i < nebulaCount; i++) {
      const nebula = new Graphics();
      const nx = rng.nextFloat(-halfField * 0.6, halfField * 0.6);
      const ny = rng.nextFloat(-halfField * 0.6, halfField * 0.6);
      const color = NEBULA_COLORS[i % NEBULA_COLORS.length];

      for (let j = 0; j < 5; j++) {
        const ox = rng.nextGaussian(0, fieldSize * 0.04);
        const oy = rng.nextGaussian(0, fieldSize * 0.03);
        const rx = rng.nextFloat(fieldSize * 0.06, fieldSize * 0.15);
        const ry = rng.nextFloat(fieldSize * 0.04, fieldSize * 0.1);
        const alpha = rng.nextFloat(0.006, 0.02);
        nebula.ellipse(nx + ox, ny + oy, rx, ry);
        nebula.fill({ color, alpha });
      }
      nebula.zIndex = -1;
      this.container.addChild(nebula);
    }

    // Layer 4: Twinkle stars (individual Graphics for animation)
    const twinkleCount = Math.max(40, Math.floor(fieldSize / 40));
    for (let i = 0; i < twinkleCount; i++) {
      const x = (rng.next() - 0.5) * fieldSize;
      const y = (rng.next() - 0.5) * fieldSize;
      const size = rng.nextFloat(0.8, 2.0);
      const baseAlpha = rng.nextFloat(0.15, 0.5);
      const color = pick(WHITE_COLORS);

      const g = new Graphics();
      g.circle(0, 0, size);
      g.fill({ color, alpha: 1.0 });
      g.circle(0, 0, size * 2.5);
      g.fill({ color, alpha: 0.15 });

      g.x = x;
      g.y = y;
      g.alpha = baseAlpha;
      g.zIndex = -1;
      this.container.addChild(g);

      this.twinkleStars.push({
        graphic: g,
        baseAlpha,
        speed: rng.nextFloat(0.001, 0.004),
        phase: rng.next() * Math.PI * 2,
      });
    }
  }

  private drawHabitableZone() {
    const hz = this.system.star.habitableZone;
    const inner = auToScreen(hz.innerConservativeAU);
    const outer = auToScreen(hz.outerConservativeAU);

    // Filled zone (projected ellipse)
    const hzGfx = new Graphics();
    hzGfx.ellipse(0, 0, outer, outer * Y_COMPRESS);
    hzGfx.fill({ color: 0x22aa44, alpha: 0.04 });
    // Cut inner (approximate)
    hzGfx.ellipse(0, 0, inner, inner * Y_COMPRESS);
    hzGfx.fill({ color: 0x020510, alpha: 0.8 });

    // Ring outlines
    const hzRing = new Graphics();
    hzRing.ellipse(0, 0, outer, outer * Y_COMPRESS);
    hzRing.stroke({ width: 0.5, color: 0x22aa44, alpha: 0.15 });
    hzRing.ellipse(0, 0, inner, inner * Y_COMPRESS);
    hzRing.stroke({ width: 0.5, color: 0x22aa44, alpha: 0.15 });

    // Label
    const hzLabel = new Text({
      text: 'HABITABLE ZONE',
      style: { fontSize: 8, fill: 0x22aa44, fontFamily: 'monospace' },
    });
    hzLabel.anchor.set(0, 0.5);
    hzLabel.x = outer + 4;
    hzLabel.alpha = 0.4;

    hzGfx.zIndex = 0;
    hzRing.zIndex = 0;
    hzLabel.zIndex = 0;
    this.orbitContainer.addChild(hzGfx);
    this.orbitContainer.addChild(hzRing);
    this.orbitContainer.addChild(hzLabel);
  }

  private addPlanetNode(planet: Planet) {
    const distance = auToScreen(planet.orbit.semiMajorAxisAU);
    if (distance > this.maxExtent) this.maxExtent = distance;

    // Orbit path (projected ellipse with glow)
    const orbitPath = renderOrbitProjected(distance, planet.orbit.eccentricity, Y_COMPRESS);
    this.orbitContainer.addChild(orbitPath);

    // Planet sprite (mini-sphere with lighting)
    const planetResult = renderPlanet(planet, this.system.star);
    const planetSprite = planetResult.container;
    const startAngle = (planet.orbit.meanAnomalyDeg * Math.PI) / 180;
    const e = planet.orbit.eccentricity;
    const b = distance * Math.sqrt(1 - e * e);
    const cFocal = distance * e;
    planetSprite.x = -cFocal + Math.cos(startAngle) * distance;
    planetSprite.y = Math.sin(startAngle) * b * Y_COMPRESS;
    this.container.addChild(planetSprite);

    // Interactivity
    planetSprite.eventMode = 'static';
    planetSprite.cursor = 'pointer';
    const hitSize = Math.max(22, planet.radiusEarth * 10);
    planetSprite.hitArea = { contains: (px: number, py: number) => px * px + py * py < hitSize * hitSize };

    planetSprite.on('pointerdown', (ev) => {
      this.onPlanetSelect(planet, { x: ev.global.x, y: ev.global.y });
    });
    planetSprite.on('pointerover', () => {
      planetSprite.scale.set(1.3);
    });
    planetSprite.on('pointerout', () => {
      planetSprite.scale.set(1.0);
    });

    // Moon dots — children of planet container so they orbit with it
    const moonNodes: MoonNode[] = [];
    if (planet.moons.length > 0) {
      const planetSize = getPlanetSize(planet);
      for (let i = 0; i < planet.moons.length; i++) {
        const moon = planet.moons[i];
        const moonRadius = Math.max(2, Math.min(5, moon.radiusKm / 500));
        const moonOrbitR = planetSize + 6 + i * 8;
        const moonGfx = renderSystemMoon(moon.compositionType, moonRadius);
        const moonStartAngle = (moon.seed % 360) * Math.PI / 180;
        moonGfx.x = Math.cos(moonStartAngle) * moonOrbitR;
        moonGfx.y = Math.sin(moonStartAngle) * moonOrbitR * Y_COMPRESS;
        planetSprite.addChild(moonGfx);
        // Cap: no moon orbits faster than 1 revolution per 8 seconds (at 60fps)
        const maxMoonSpeed = (2 * Math.PI) / (8 * 60);
        const rawSpeed = (2 * Math.PI) / (moon.orbitalPeriodDays * 400);
        moonNodes.push({
          gfx: moonGfx,
          angle: moonStartAngle,
          orbitRadius: moonOrbitR,
          angularSpeed: Math.min(rawSpeed, maxMoonSpeed),
        });
      }
    }

    this.planetNodes.set(planet.id, {
      container: planetSprite,
      lightingGroup: planetResult.lightingGroup,
      planet,
      angle: startAngle,
      distance,
      eccentricity: e,
      moonNodes,
    });
  }

  update(deltaMs: number) {
    this.time += deltaMs;

    // Star corona animation: gentle pulsing + slow rotation
    if (this.starCorona) {
      this.starCorona.scale.set(1 + Math.sin(this.time * 0.001) * 0.08);
      this.starCorona.rotation += 0.0002 * (deltaMs / 16.67);
    }

    // Twinkling background stars
    for (const ts of this.twinkleStars) {
      ts.graphic.alpha = ts.baseAlpha * (0.5 + 0.5 * Math.sin(this.time * ts.speed + ts.phase));
    }

    // Shooting stars (subtle background events every 5-10s)
    this.sysShootingStarTimer -= deltaMs;
    if (this.sysShootingStarTimer <= 0) {
      this.spawnSystemShootingStar();
      this.sysShootingStarTimer = 5000 + Math.random() * 5000;
    }
    this.updateSystemShootingStars(deltaMs);

    // Animate planet orbits
    for (const [, node] of this.planetNodes) {
      // Angular speed inversely proportional to orbital period
      const angularSpeed = (2 * Math.PI) / (node.planet.orbit.periodDays * 200);
      node.angle += angularSpeed * (deltaMs / 16.67);

      // Position on ellipse with star at focus (Y-compressed)
      const a = node.distance;
      const e = node.eccentricity;
      const b = a * Math.sqrt(1 - e * e);
      const cFocal = a * e;
      node.container.x = -cFocal + Math.cos(node.angle) * a;
      node.container.y = Math.sin(node.angle) * b * Y_COMPRESS;

      // Z-ordering: planets in front when below center, behind when above
      node.container.zIndex = Math.round(node.container.y + 10000);

      // Subtle depth scale: slightly larger when "closer" (lower y)
      const depthScale = 1 + (node.container.y / (this.maxExtent + 1)) * 0.06;
      node.container.scale.set(depthScale);

      // Dynamic lighting: rotate lightingGroup so highlight faces the star
      node.lightingGroup.rotation = Math.atan2(-node.container.y, -node.container.x);

      // Moon sub-orbits (Y-compressed)
      for (const moon of node.moonNodes) {
        moon.angle += moon.angularSpeed * (deltaMs / 16.67);
        moon.gfx.x = Math.cos(moon.angle) * moon.orbitRadius;
        moon.gfx.y = Math.sin(moon.angle) * moon.orbitRadius * Y_COMPRESS;
      }
    }
  }

  // --- System shooting stars ---
  private spawnSystemShootingStar() {
    if (this.fieldSize === 0) return;
    const gfx = new Graphics();

    // Random start position across the background field
    const halfField = this.fieldSize * 0.42;
    const x = (Math.random() - 0.5) * halfField * 2;
    const y = (Math.random() - 0.5) * halfField * 2;

    const dirAngle = Math.random() * Math.PI * 2;
    // Subtle speed in world-space pixels per ms
    const speed = 0.12 + Math.random() * 0.18;
    const vx = Math.cos(dirAngle) * speed;
    const vy = Math.sin(dirAngle) * speed;

    const maxLife = 400 + Math.random() * 600;
    const streakLen = speed * 65;

    // Streak line (subtle)
    gfx.moveTo(0, 0);
    gfx.lineTo(-Math.cos(dirAngle) * streakLen, -Math.sin(dirAngle) * streakLen);
    gfx.stroke({ width: 1.0, color: 0xffffff, alpha: 0.65 });
    // Soft glow tail
    gfx.moveTo(0, 0);
    gfx.lineTo(-Math.cos(dirAngle) * streakLen * 0.4, -Math.sin(dirAngle) * streakLen * 0.4);
    gfx.stroke({ width: 2.5, color: 0xaaccff, alpha: 0.1 });

    gfx.x = x;
    gfx.y = y;
    gfx.zIndex = -1;
    gfx.alpha = 0;
    this.container.addChild(gfx);

    this.sysShootingStars.push({ gfx, x, y, vx, vy, lifetime: 0, maxLife });
  }

  private updateSystemShootingStars(deltaMs: number) {
    for (let i = this.sysShootingStars.length - 1; i >= 0; i--) {
      const s = this.sysShootingStars[i];
      s.lifetime += deltaMs;
      s.x += s.vx * deltaMs;
      s.y += s.vy * deltaMs;
      s.gfx.x = s.x;
      s.gfx.y = s.y;

      const t = s.lifetime / s.maxLife;
      if (t < 0.1) {
        s.gfx.alpha = t / 0.1;
      } else if (t > 0.6) {
        s.gfx.alpha = (1 - t) / 0.4;
      } else {
        s.gfx.alpha = 1;
      }

      if (s.lifetime >= s.maxLife) {
        this.container.removeChild(s.gfx);
        s.gfx.destroy();
        this.sysShootingStars.splice(i, 1);
      }
    }
  }

  destroy() {
    for (const ss of this.sysShootingStars) { ss.gfx.destroy(); }
    this.sysShootingStars.length = 0;
    this.container.destroy({ children: true });
    this.planetNodes.clear();
    this.twinkleStars.length = 0;
  }
}
