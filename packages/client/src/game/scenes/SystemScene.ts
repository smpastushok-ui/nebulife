import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { StarSystem, Planet, PlanetMissionPhase, PlanetMissionType } from '@nebulife/core';
import { SeededRNG } from '@nebulife/core';
import { renderStar } from '../rendering/StarRenderer.js';
import { applyPlanetTexturePreview, renderPlanet, renderOrbitProjected, renderSystemMoon, getPlanetSize, Y_COMPRESS } from '../rendering/PlanetRenderer.js';
import { getShipSpriteCanvas, peekShipSpriteCanvas } from '../rendering/ShipSpriteCache.js';
import { tStatic } from '../../i18n/index.js';
import { playSfx } from '../../audio/SfxPlayer.js';

/** Twinkling star data (inline to avoid dependency on HomePlanetBackdrop) */
interface TwinkleStar {
  graphic: Graphics;
  baseAlpha: number;
  speed: number;
  phase: number;
}

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
  yCompress: number;
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

function makeVisualOnly(root: Container): void {
  root.eventMode = 'none';
  root.cursor = 'default';
  for (const child of root.children) {
    child.eventMode = 'none';
    if (child instanceof Container) makeVisualOnly(child);
  }
}

export interface PlanetMissionVisual {
  planetId: string;
  originPlanetId?: string;
  type: PlanetMissionType;
  phase: PlanetMissionPhase;
  overallProgress: number;
  phaseProgress: number;
}

interface MissionVisualNode {
  container: Container;
  ring: Graphics;
  marker: Graphics;
  data: PlanetMissionVisual;
}

export interface PlanetStatusVisual {
  planetId: string;
  orbit?: boolean;
  atmosphere?: boolean;
  surface?: boolean;
  terraformed?: boolean;
  colony?: boolean;
  life?: boolean;
  settled?: boolean;
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
  private asteroidBeltContainers: Array<{ container: Container; speed: number }> = [];
  private missionVisuals: Map<string, MissionVisualNode> = new Map();
  private planetStatusVisuals: Map<string, PlanetStatusVisual> = new Map();
  private planetStatusIconsVisible = false;
  private planetLabelsVisible = false;

  /** True while camera is zooming — orbit animations pause to prevent jitter */
  private _freezeOrbits = false;
  set freezeOrbits(v: boolean) { this._freezeOrbits = v; }

  // ── Ship flight ──────────────────────────────────────────────────────
  private shipContainer: Container | null = null;
  private shipGfx: Graphics | null = null;
  private shipSprite: Sprite | null = null; // GLB-rendered sprite (preferred)
  private shipTrailGfx: Graphics | null = null;
  private shipProgress = 0; // 0→1
  private shipActive = false;
  private shipBezier: { p0: { x: number; y: number }; p1: { x: number; y: number }; p2: { x: number; y: number }; p3: { x: number; y: number } } | null = null;
  private shipTrailPoints: { x: number; y: number }[] = [];
  private shipSpeed = 0.00015; // progress units per ms (~6.7s flight)

  /** Set of destroyed planet IDs — render debris belt instead of planet */
  private destroyedPlanetIds: Set<string>;

  constructor(
    private system: StarSystem,
    private onPlanetSelect: (planet: Planet, screenPos: { x: number; y: number }) => void,
    private clickGuard?: () => boolean,
    destroyedPlanetIds?: Set<string>,
  ) {
    this.destroyedPlanetIds = destroyedPlanetIds ?? new Set();
    this.container = new Container();
    this.container.eventMode = 'static';
    this.container.sortableChildren = true;

    // Kick off GLB → canvas rasterization so the ship sprite is ready by
    // the time startShipFlight() runs (typically seconds after scene mount).
    void getShipSpriteCanvas();

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
    makeVisualOnly(starResult.container);
    starResult.container.zIndex = 100;
    this.container.addChild(starResult.container);
    this.starCorona = starResult.corona;

    // Star label
    const starLabel = new Text({
      text: `${system.star.name}\n${system.star.spectralClass}${system.star.subType}V  ${system.star.temperatureK}K`,
      style: { fontSize: 10, fill: 0x889999, fontFamily: 'monospace', align: 'center' },
      resolution: 2,
    });
    starLabel.anchor.set(0.5, 0);
    starLabel.y = starSize + 8;
    starLabel.eventMode = 'none';
    starLabel.zIndex = 101;
    this.container.addChild(starLabel);

    // System name
    const sysLabel = new Text({
      text: system.name,
      style: { fontSize: 14, fill: 0x556677, fontFamily: 'monospace', letterSpacing: 3 },
      resolution: 2,
    });
    sysLabel.anchor.set(0.5, 1);
    sysLabel.y = -Math.max(200, system.planets.length * 30) - 20;
    sysLabel.zIndex = 10002;
    this.container.addChild(sysLabel);

    // Orbits and planets (skip destroyed planets, render debris belt)
    for (const planet of system.planets) {
      if (this.destroyedPlanetIds.has(planet.id)) {
        this.addDebrisBelt(planet);
      } else {
        this.addPlanetNode(planet);
      }
    }

    // Asteroid belts — deterministic, layered, and slightly animated.
    system.asteroidBelts.forEach((belt, index) => {
      this.addAsteroidBelt(
        auToScreen(belt.innerRadiusAU),
        auToScreen(belt.outerRadiusAU),
        system.seed * 4099 + index * 137,
        160,
        0.000008 + index * 0.000002,
      );
    });

    // Procedural outer asteroid belt (beyond outermost planet)
    if (system.planets.length > 0) {
      const outerPlanetAU = Math.max(...system.planets.map(p => p.orbit.semiMajorAxisAU));
      const outerR = auToScreen(outerPlanetAU);
      const beltInner = outerR * 1.3;
      const beltOuter = outerR * 1.8;
      this.addAsteroidBelt(beltInner, beltOuter, system.seed * 997 + 43, 100, 0.00002);
    }
  }

  private addAsteroidBelt(innerR: number, outerR: number, seed: number, baseCount: number, speed: number) {
    const rng = new SeededRNG(seed);
    const group = new Container();
    group.zIndex = 1;

    const dust = new Graphics();
    const rocks = new Graphics();
    const highlights = new Graphics();
    const count = baseCount + rng.nextInt(0, Math.floor(baseCount * 0.45));
    const gapAngle = rng.next() * Math.PI * 2;
    const gapWidth = rng.nextFloat(0.25, 0.55);

    for (let i = 0; i < count; i++) {
      let angle = rng.next() * Math.PI * 2;
      const distanceFromGap = Math.abs(Math.atan2(Math.sin(angle - gapAngle), Math.cos(angle - gapAngle)));
      if (distanceFromGap < gapWidth && rng.next() < 0.82) {
        angle += gapWidth * (rng.next() < 0.5 ? -1 : 1);
      }
      const band = rng.next();
      const r = innerR + (outerR - innerR) * Math.pow(band, 0.78);
      const clump = 1 + Math.sin(angle * 7 + seed) * 0.08 + Math.sin(angle * 17) * 0.035;
      const jitterR = rng.nextGaussian(0, (outerR - innerR) * 0.035);
      const x = Math.cos(angle) * (r * clump + jitterR);
      const y = Math.sin(angle) * (r + jitterR) * Y_COMPRESS;
      const size = rng.next() < 0.08
        ? rng.nextFloat(1.4, 2.8)
        : rng.nextFloat(0.35, 1.25);
      const roll = rng.next();

      if (roll < 0.58) {
        dust.circle(x, y, size * 0.65);
      } else if (roll < 0.9) {
        rocks.circle(x, y, size);
      } else {
        highlights.circle(x, y, size * 0.9);
      }
    }

    dust.fill({ color: 0x4a463c, alpha: 0.18 });
    rocks.fill({ color: 0x7a6a55, alpha: 0.34 });
    highlights.fill({ color: 0xb49a72, alpha: 0.42 });

    const innerEdge = new Graphics();
    innerEdge.ellipse(0, 0, innerR, innerR * Y_COMPRESS);
    innerEdge.stroke({ color: 0x8a7655, width: 0.6, alpha: 0.08 });
    const outerEdge = new Graphics();
    outerEdge.ellipse(0, 0, outerR, outerR * Y_COMPRESS);
    outerEdge.stroke({ color: 0x8a7655, width: 0.6, alpha: 0.06 });

    group.addChild(innerEdge, outerEdge, dust, rocks, highlights);
    this.container.addChild(group);
    this.asteroidBeltContainers.push({ container: group, speed });
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
      resolution: 2,
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
    this.applyPlanetLabelVisibility(planetSprite);
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
      if (this.clickGuard?.()) return;
      playSfx('planet-select', 0.2);
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
      const moonRng = new SeededRNG(planet.seed * 13 + 7);
      for (let i = 0; i < planet.moons.length; i++) {
        const moon = planet.moons[i];
        const moonRadius = Math.max(2, Math.min(5, moon.radiusKm / 500));
        const moonOrbitR = planetSize + 6 + i * 8;
        const moonGfx = renderSystemMoon(moon.compositionType, moonRadius, moon.seed);
        const moonStartAngle = (moon.seed % 360) * Math.PI / 180;
        // Per-moon orbital inclination for visual diversity
        const inclination = (moonRng.next() - 0.5) * 0.4;
        const moonYCompress = Y_COMPRESS + inclination;
        moonGfx.x = Math.cos(moonStartAngle) * moonOrbitR;
        moonGfx.y = Math.sin(moonStartAngle) * moonOrbitR * moonYCompress;
        planetSprite.addChild(moonGfx);
        // Cap: no moon orbits faster than 1 revolution per 8 seconds (at 60fps)
        const maxMoonSpeed = (2 * Math.PI) / (8 * 60);
        const rawSpeed = (2 * Math.PI) / (moon.orbitalPeriodDays * 400);
        moonNodes.push({
          gfx: moonGfx,
          angle: moonStartAngle,
          orbitRadius: moonOrbitR,
          angularSpeed: Math.min(rawSpeed, maxMoonSpeed),
          yCompress: moonYCompress,
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

  /** Render debris belt on a destroyed planet's orbit */
  private addDebrisBelt(planet: Planet) {
    const distance = auToScreen(planet.orbit.semiMajorAxisAU);
    const e = planet.orbit.eccentricity;
    const b = distance * Math.sqrt(1 - e * e);
    const cFocal = distance * e;

    // Orbit path (dimmer, reddish)
    const orbitPath = renderOrbitProjected(distance, e, Y_COMPRESS);
    orbitPath.alpha = 0.5;
    this.orbitContainer.addChild(orbitPath);

    // Debris particles along the orbit
    const debrisGfx = new Graphics();
    const rng = new SeededRNG(planet.seed * 1337 + 99);
    const debrisCount = 120;

    for (let i = 0; i < debrisCount; i++) {
      const angle = rng.next() * Math.PI * 2;
      const jitter = rng.nextFloat(-8, 8); // spread around orbit
      const x = -cFocal + Math.cos(angle) * (distance + jitter);
      const y = Math.sin(angle) * (b + jitter) * Y_COMPRESS;
      const size = 0.5 + rng.next() * 2;
      debrisGfx.circle(x, y, size);
      debrisGfx.fill({ color: 0x886644, alpha: 0.2 + rng.next() * 0.15 });
    }

    // Reddish glow particles (fewer, larger)
    for (let i = 0; i < 30; i++) {
      const angle = rng.next() * Math.PI * 2;
      const jitter = rng.nextFloat(-5, 5);
      const x = -cFocal + Math.cos(angle) * (distance + jitter);
      const y = Math.sin(angle) * (b + jitter) * Y_COMPRESS;
      debrisGfx.circle(x, y, 2 + rng.next() * 3);
      debrisGfx.fill({ color: 0xcc4422, alpha: 0.06 + rng.next() * 0.06 });
    }

    debrisGfx.zIndex = 5;
    this.container.addChild(debrisGfx);

    // Destroyed label
    const label = new Text({
      text: `${planet.name} ${tStatic('system.destroyed')}`,
      style: { fontSize: 8, fill: 0x884422, fontFamily: 'monospace' },
      resolution: 2,
    });
    label.anchor.set(0.5, 0);
    label.x = -cFocal + distance;
    label.y = 12;
    label.alpha = 0.5;
    label.zIndex = 6;
    this.container.addChild(label);
  }

  update(deltaMs: number) {
    this.time += deltaMs;

    // Rotate asteroid belts slowly in opposite layers; planets remain readable.
    for (const belt of this.asteroidBeltContainers) {
      belt.container.rotation += deltaMs * belt.speed;
    }

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

    // Animate planet orbits (freeze during pinch/zoom to prevent jitter)
    for (const [, node] of this.planetNodes) {
      if (!this._freezeOrbits) {
        // Angular speed inversely proportional to orbital period
        const angularSpeed = (2 * Math.PI) / (node.planet.orbit.periodDays * 200);
        node.angle += angularSpeed * (deltaMs / 16.67);
      }

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

      // Moon sub-orbits (per-moon Y-compression for orbital diversity)
      for (const moon of node.moonNodes) {
        if (!this._freezeOrbits) moon.angle += moon.angularSpeed * (deltaMs / 16.67);
        moon.gfx.x = Math.cos(moon.angle) * moon.orbitRadius;
        moon.gfx.y = Math.sin(moon.angle) * moon.orbitRadius * moon.yCompress;
      }
    }

    // Ship flight animation
    this.updateShip(deltaMs);
    this.updateMissionVisuals();
  }

  setPlanetMissionVisuals(missions: PlanetMissionVisual[]) {
    const incoming = new Set(missions.map((mission) => mission.planetId));

    for (const [planetId, visual] of this.missionVisuals) {
      if (incoming.has(planetId)) continue;
      visual.container.parent?.removeChild(visual.container);
      visual.container.destroy({ children: true });
      this.missionVisuals.delete(planetId);
    }

    for (const mission of missions) {
      const planetNode = this.planetNodes.get(mission.planetId);
      if (!planetNode) continue;

      let visual = this.missionVisuals.get(mission.planetId);
      if (!visual) {
        const container = new Container();
        container.zIndex = 5000;
        const ring = new Graphics();
        const marker = new Graphics();
        container.addChild(ring);
        container.addChild(marker);
        planetNode.container.addChild(container);
        visual = { container, ring, marker, data: mission };
        this.missionVisuals.set(mission.planetId, visual);
      }

      visual.data = mission;
      this.drawMissionVisual(planetNode, visual);
    }
  }

  setPlanetStatusVisuals(statuses: PlanetStatusVisual[], visible: boolean) {
    this.planetStatusVisuals = new Map(statuses.map((status) => [status.planetId, status]));
    this.planetStatusIconsVisible = visible;
    this.redrawPlanetStatusIcons();
  }

  setPlanetLabelsVisible(visible: boolean) {
    this.planetLabelsVisible = visible;
    for (const [, node] of this.planetNodes) {
      this.applyPlanetLabelVisibility(node.container);
    }
  }

  setPlanetSkinTextures(textures: Record<string, string | null | undefined>): void {
    for (const [planetId, textureUrl] of Object.entries(textures)) {
      if (!textureUrl) continue;
      const node = this.planetNodes.get(planetId);
      if (!node) continue;
      applyPlanetTexturePreview(node.container, textureUrl, getPlanetSize(node.planet));
    }
  }

  private redrawPlanetStatusIcons() {
    for (const [, node] of this.planetNodes) {
      const existing = node.container.getChildByName('planet-status-icons');
      if (existing) node.container.removeChild(existing);
      if (!this.planetStatusIconsVisible) continue;

      const status = this.planetStatusVisuals.get(node.planet.id);
      if (!status) continue;
      const items = [
        status.orbit && { key: 'O', color: 0x7bb8ff },
        status.atmosphere && { key: 'A', color: 0xffcc66 },
        status.surface && { key: 'S', color: 0xd7b36a },
        status.terraformed && { key: 'T', color: 0x44ff88 },
        status.colony && { key: 'C', color: 0x9fd0ff },
        status.life && { key: 'L', color: 0x66dd99 },
        status.settled && { key: 'P', color: 0xd7e8f4 },
      ].filter(Boolean) as Array<{ key: string; color: number }>;
      if (items.length === 0) continue;

      const group = new Container();
      group.name = 'planet-status-icons';
      group.zIndex = 10050;
      const orbitR = getPlanetSize(node.planet) + 13;
      items.forEach((item, index) => {
        const angle = (-Math.PI / 2) + (index / items.length) * Math.PI * 2;
        const g = new Graphics();
        g.circle(0, 0, 4.5);
        g.fill({ color: 0x020510, alpha: 0.88 });
        g.circle(0, 0, 4.5);
        g.stroke({ color: item.color, width: 1, alpha: 0.9 });
        const label = new Text({
          text: item.key,
          style: { fontSize: 6, fill: item.color, fontFamily: 'monospace', fontWeight: '700' },
          resolution: 2,
        });
        label.anchor.set(0.5);
        g.addChild(label);
        g.x = Math.cos(angle) * orbitR;
        g.y = Math.sin(angle) * orbitR;
        group.addChild(g);
      });
      node.container.addChild(group);
    }
  }

  private applyPlanetLabelVisibility(container: Container) {
    const label = container.getChildByName('planet-name-label');
    if (label) label.visible = this.planetLabelsVisible;
  }

  private drawMissionVisual(planetNode: PlanetNode, visual: MissionVisualNode) {
    const size = getPlanetSize(planetNode.planet);
    const radius = size + 10;
    const progress = Math.max(0.02, Math.min(1, visual.data.overallProgress));
    const isReady = visual.data.phase === 'report_ready';
    const color = visual.data.type === 'orbital_probe'
      ? 0x7bb8ff
      : visual.data.type === 'deep_atmosphere_probe'
        ? 0xff8844
        : visual.data.type === 'drone_recon'
          ? 0xddaa44
        : 0x44ff88;

    visual.ring.clear();
    visual.ring.circle(0, 0, radius);
    visual.ring.stroke({ width: 1, color: 0x334455, alpha: 0.55 });

    const steps = Math.max(5, Math.ceil(progress * 36));
    for (let i = 0; i < steps; i++) {
      const a0 = -Math.PI / 2 + (i / 36) * Math.PI * 2;
      const a1 = -Math.PI / 2 + ((i + 0.65) / 36) * Math.PI * 2;
      if (i / 36 > progress) break;
      visual.ring.moveTo(Math.cos(a0) * radius, Math.sin(a0) * radius);
      visual.ring.lineTo(Math.cos(a1) * radius, Math.sin(a1) * radius);
      visual.ring.stroke({ width: isReady ? 2 : 1.5, color, alpha: isReady ? 0.95 : 0.75 });
    }

    visual.marker.clear();
  }

  private updateMissionVisuals() {
    for (const [planetId, visual] of this.missionVisuals) {
      const planetNode = this.planetNodes.get(planetId);
      if (!planetNode) continue;
      if (visual.data.phase === 'report_ready') {
        visual.container.alpha = 0.7 + Math.sin(this.time * 0.006) * 0.3;
        visual.container.scale.set(1 + Math.sin(this.time * 0.004) * 0.05);
      } else {
        visual.container.alpha = 1;
        visual.container.scale.set(1);
      }
      this.drawMissionVisual(planetNode, visual);
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

  // ── Ship flight methods ───────────────────────────────────────────────

  /** Start ship flight from off-screen to the target planet via cubic Bezier */
  startShipFlight(targetPlanetId: string) {
    const targetNode = this.planetNodes.get(targetPlanetId);
    if (!targetNode) return;

    // Target position (current planet position)
    const tx = targetNode.container.x;
    const ty = targetNode.container.y;

    // Start from off-screen (left side, above scene)
    const startX = -this.maxExtent * 1.5;
    const startY = -this.maxExtent * 0.8;

    // Bezier control points — sweeping curve through the system
    const cp1x = startX * 0.3;
    const cp1y = startY * 0.5;
    const cp2x = tx * 0.6;
    const cp2y = ty - this.maxExtent * 0.3;

    this.shipBezier = {
      p0: { x: startX, y: startY },
      p1: { x: cp1x, y: cp1y },
      p2: { x: cp2x, y: cp2y },
      p3: { x: tx, y: ty },
    };

    this.shipProgress = 0;
    this.shipActive = true;
    this.shipTrailPoints = [];

    // Create ship container
    this.shipContainer = new Container();
    this.shipContainer.zIndex = 20000;
    this.container.addChild(this.shipContainer);

    // Trail graphics (rendered below ship body)
    this.shipTrailGfx = new Graphics();
    this.shipContainer.addChild(this.shipTrailGfx);

    // Ship body — Sprite from the GLB rasterization if available, otherwise
    // fall back to a procedural Graphics rectangle drawn in updateShip.
    const canvas = peekShipSpriteCanvas();
    if (canvas) {
      this.shipSprite = new Sprite(Texture.from(canvas));
      this.shipSprite.anchor.set(0.5);
      // The GLB sprite is 128px; scale down so the ship reads as small
      // against the system-view planet disks (~40-100px).
      this.shipSprite.scale.set(0.35);
      this.shipContainer.addChild(this.shipSprite);
    } else {
      this.shipGfx = new Graphics();
      this.shipContainer.addChild(this.shipGfx);
    }
  }

  /** Get ship flight progress 0→1 */
  getShipProgress(): number {
    return this.shipProgress;
  }

  /** Stop and cleanup ship flight */
  stopShipFlight() {
    this.shipActive = false;
    if (this.shipContainer) {
      this.container.removeChild(this.shipContainer);
      this.shipContainer.destroy({ children: true });
      this.shipContainer = null;
      this.shipGfx = null;
      this.shipSprite = null;
      this.shipTrailGfx = null;
    }
    this.shipTrailPoints = [];
    this.shipBezier = null;
  }

  /** Evaluate cubic Bezier at t ∈ [0,1] */
  private evalBezier(t: number): { x: number; y: number } {
    if (!this.shipBezier) return { x: 0, y: 0 };
    const { p0, p1, p2, p3 } = this.shipBezier;
    const u = 1 - t;
    const uu = u * u;
    const uuu = uu * u;
    const tt = t * t;
    const ttt = tt * t;
    return {
      x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
      y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
    };
  }

  /** Update ship position and trail (called from update loop) */
  private updateShip(deltaMs: number) {
    if (!this.shipActive || !this.shipBezier || !this.shipTrailGfx) return;
    if (!this.shipGfx && !this.shipSprite) return;

    // Advance progress
    this.shipProgress = Math.min(1, this.shipProgress + this.shipSpeed * deltaMs);
    const pos = this.evalBezier(this.shipProgress);

    // Store trail point
    this.shipTrailPoints.push({ x: pos.x, y: pos.y });
    if (this.shipTrailPoints.length > 60) this.shipTrailPoints.shift();

    // Get direction for ship rotation
    const nextT = Math.min(1, this.shipProgress + 0.01);
    const nextPos = this.evalBezier(nextT);
    const dx = nextPos.x - pos.x;
    const dy = nextPos.y - pos.y;
    const angle = Math.atan2(dy, dx);

    // Render ship body — sprite path preferred, graphics fallback.
    if (this.shipSprite) {
      this.shipSprite.position.set(pos.x, pos.y);
      this.shipSprite.rotation = angle;
    } else if (this.shipGfx) {
      this.shipGfx.clear();
      this.shipGfx.position.set(pos.x, pos.y);
      this.shipGfx.rotation = angle;
      this.shipGfx.roundRect(-8, -3, 16, 6, 2);
      this.shipGfx.fill({ color: 0xaabbcc, alpha: 0.9 });
      this.shipGfx.roundRect(4, -2, 5, 4, 1);
      this.shipGfx.fill({ color: 0x4488ff, alpha: 0.7 });
      this.shipGfx.circle(-8, 0, 3);
      this.shipGfx.fill({ color: 0x4488ff, alpha: 0.6 });
      this.shipGfx.circle(-8, 0, 5);
      this.shipGfx.fill({ color: 0x4488ff, alpha: 0.2 });
    }

    // Draw engine trail
    this.shipTrailGfx.clear();
    const trailLen = this.shipTrailPoints.length;
    if (trailLen > 1) {
      for (let i = 1; i < trailLen; i++) {
        const alpha = (i / trailLen) * 0.5;
        const width = (i / trailLen) * 2;
        const prev = this.shipTrailPoints[i - 1];
        const cur = this.shipTrailPoints[i];
        this.shipTrailGfx.moveTo(prev.x, prev.y);
        this.shipTrailGfx.lineTo(cur.x, cur.y);
        this.shipTrailGfx.stroke({ width, color: 0x4488ff, alpha });
      }
    }
  }

  destroy() {
    this.stopShipFlight();
    for (const ss of this.sysShootingStars) { ss.gfx.destroy(); }
    this.sysShootingStars.length = 0;
    for (const visual of this.missionVisuals.values()) {
      visual.container.destroy({ children: true });
    }
    this.missionVisuals.clear();
    this.container.destroy({ children: true });
    this.planetNodes.clear();
    this.twinkleStars.length = 0;
  }
}
