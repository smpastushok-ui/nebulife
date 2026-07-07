// ---------------------------------------------------------------------------
// RaidEngine — unified PixiJS v8 Carrier Raid combat engine.
//
// NEXT_GEN_PLAN.md section A: replaces the old dual-engine setup (Three.js
// RaidEngine + PixiRaidEngine fallback) with ONE 2D top-down engine. Ship
// silhouettes are baked once from the existing GLB assets into rotation
// sprite atlases (see ShipSpriteBaker.ts) so combat "looks like 3D, costs
// like 2D": every ship is a single Sprite draw, not a lit 3D mesh.
//
// Gameplay/balance (HP, damage, wave timings, rewards) is unchanged from the
// previous Pixi fallback — only rendering, feedback and device-adaptive
// budgets are new.
// ---------------------------------------------------------------------------

import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import {
  RAID_ACTIVE_ENEMIES_HIGH,
  RAID_ACTIVE_ENEMIES_MID,
  RAID_ALLY_DAMAGE,
  RAID_ALLY_HP,
  RAID_ALLY_SHIELD,
  RAID_DRONE_HP,
  RAID_DYNRES_BAD_FRAMES_TO_DROP,
  RAID_DYNRES_FRAME_MS_THRESHOLD,
  RAID_DYNRES_SCALE,
  RAID_DYNRES_STABLE_MS_TO_RESTORE,
  RAID_ENEMY_DAMAGE,
  RAID_HITSTOP_KILL_MS,
  RAID_HIT_FLASH_MS,
  RAID_PARTICLE_BUDGET_HIGH,
  RAID_PARTICLE_BUDGET_LOW,
  RAID_PARTICLE_BUDGET_MID,
  RAID_PLAYER_HP,
  RAID_PLAYER_SHIELD,
  RAID_PROJECTILE_DAMAGE,
  RAID_PROJECTILE_LIFETIME,
  RAID_PROJECTILE_SPEED,
  RAID_REWARD_BASE_XP,
  RAID_REWARD_XP_PER_KILL,
  RAID_REWARD_XP_PER_MODULE,
  RAID_SCREEN_SHAKE_DECAY_PER_SEC,
  RAID_SCREEN_SHAKE_HIT,
  RAID_SCREEN_SHAKE_KILL,
  RAID_SCREEN_SHAKE_MAX,
  RAID_SCREEN_SHAKE_MODULE_DESTROYED,
  RAID_SHIELD_REGEN_DELAY,
  RAID_SHIELD_REGEN_RATE,
  RAID_SHIP_BAKE_SIZE_HIGH,
  RAID_SHIP_BAKE_SIZE_LOW,
  RAID_SHIP_BAKE_SIZE_MID,
  RAID_SPEED,
  RAID_WAVES,
  RAID_WAVE_CLEAR_SLOWMO_FACTOR,
  RAID_WAVE_CLEAR_SLOWMO_MS,
  RAID_WINGMEN,
} from './RaidConstants.js';
import type { RaidCallbacks, RaidPhase, RaidResult, RaidSnapshot, RaidTeam } from './RaidTypes.js';
import { getDeviceTier } from '../../utils/device-tier.js';
import { playSfx } from '../../audio/SfxPlayer.js';
import { bakeShipAtlas, type ShipAtlas } from './ShipSpriteBaker.js';
import { RaidParticles } from './RaidParticles.js';
import { RaidExplosions } from './RaidExplosions.js';

type SectorAction = 'center' | 'missile' | 'warp' | 'dodge' | 'gravity';

const BLUE_SHIP = '/arena_ships/blue_ship.glb';
const RED_SHIP = '/arena_ships/red_ship.glb';
const CARRIER_BOSS = '/raid/carrier_boss.glb';
const ENEMY_SWARM_SHIP = '/raid/enemy_swarm_ship.glb';
const RAID_BACKGROUND_IMAGE = '/raid/raid_background_mobile.webp';
const ALLY_TINT = 0x7bb8ff;
const ENEMY_TINT = 0xcc4444;
const DAMAGED_HP_PCT = 0.45;
const WORLD_W = 2200;
const WORLD_H = 1400;

interface EntityView {
  /** Root node added to `world`; either wraps a baked Sprite or a procedural Graphics fallback. */
  root: Container;
  sprite: Sprite | null;
  atlas: ShipAtlas | null;
  angleIndex: number;
}

interface RaidShipEntity {
  id: number;
  team: RaidTeam;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  radius: number;
  fireCooldown: number;
  shieldDelay: number;
  alive: boolean;
  view: EntityView;
  facing: number; // radians, Pixi convention (0 = up, clockwise positive)
  trailTimer: number;
  aiOrbitDir?: number;
  aiOrbitRadius?: number;
}

interface RaidModuleEntity {
  id: string;
  type: 'hangar_bay' | 'shield_emitter' | 'turret_cluster' | 'reactor_core';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
  alive: boolean;
  fireCooldown: number;
  view: Container;
}

interface RaidProjectileEntity {
  active: boolean;
  team: RaidTeam;
  damage: number;
  age: number;
  lifetime: number;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  view: Sprite;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalize(x: number, y: number): { x: number; y: number } {
  const len = Math.hypot(x, y);
  return len > 0.0001 ? { x: x / len, y: y / len } : { x: 0, y: -1 };
}

function facingAngle(dx: number, dy: number): number {
  return Math.atan2(dx, -dy);
}

function angleToFrameIndex(angle: number, frameCount: number): number {
  const twoPi = Math.PI * 2;
  const normalized = ((angle % twoPi) + twoPi) % twoPi;
  return Math.round(normalized / twoPi * frameCount) % frameCount;
}

// ── Procedural fallback shapes (used when GLB bake fails/unavailable) ──────

function drawProceduralShip(color: number, scale = 1): Container {
  const root = new Container();
  const g = new Graphics();
  g.poly([0, -18 * scale, 12 * scale, 14 * scale, 0, 8 * scale, -12 * scale, 14 * scale]);
  g.fill(color);
  g.stroke({ color: 0xaabbcc, alpha: 0.45, width: 1 });
  g.moveTo(-7 * scale, 11 * scale);
  g.lineTo(7 * scale, 11 * scale);
  g.stroke({ color: 0x7bb8ff, alpha: 0.55, width: 2 });
  root.addChild(g);
  return root;
}

function drawProceduralDrone(): Container {
  const root = new Container();
  const g = new Graphics();
  g.poly([0, 14, 13, -10, 0, -4, -13, -10]);
  g.fill(0xcc4444);
  g.stroke({ color: 0xff8844, alpha: 0.55, width: 1 });
  root.addChild(g);
  return root;
}

function drawModule(type: RaidModuleEntity['type']): Container {
  const root = new Container();
  const color = type === 'reactor_core' ? 0xff8844 : type === 'shield_emitter' ? 0x4488aa : type === 'turret_cluster' ? 0xddaa44 : 0x667788;
  const g = new Graphics();
  if (type === 'reactor_core') {
    g.circle(0, 0, 38).fill({ color, alpha: 0.78 }).stroke({ color: 0xffcc88, alpha: 0.7, width: 2 });
    g.circle(0, 0, 16).stroke({ color: 0xffcc88, alpha: 0.6, width: 2 });
  } else {
    g.roundRect(-34, -18, 68, 36, 4).fill({ color, alpha: 0.72 }).stroke({ color: 0xaabbcc, alpha: 0.35, width: 1 });
  }
  root.addChild(g);
  return root;
}

export class RaidEngine {
  private readonly container: HTMLElement;
  private readonly callbacks: RaidCallbacks;
  private readonly shipId: string;
  private readonly customShipGlbUrl: string | null;
  private readonly tier = getDeviceTier();
  private readonly maxActiveEnemies = this.tier === 'high' ? RAID_ACTIVE_ENEMIES_HIGH : RAID_ACTIVE_ENEMIES_MID;
  private readonly bakeFrameSize = this.tier === 'low' ? RAID_SHIP_BAKE_SIZE_LOW : this.tier === 'high' ? RAID_SHIP_BAKE_SIZE_HIGH : RAID_SHIP_BAKE_SIZE_MID;
  private readonly particleBudget = this.tier === 'low' ? RAID_PARTICLE_BUDGET_LOW : this.tier === 'high' ? RAID_PARTICLE_BUDGET_HIGH : RAID_PARTICLE_BUDGET_MID;
  private readonly baseResolution = Math.min(window.devicePixelRatio || 1, this.tier === 'low' ? 1 : 1.4);

  private app: Application | null = null;
  private world = new Container();
  private hitFlash = new Graphics();
  private background = new Graphics();
  private backgroundImage: Sprite | null = null;
  private starLayerNear = new Graphics();
  private starLayerFar = new Graphics();
  private starLayerNearOffset = 0;
  private starLayerFarOffset = 0;
  private carrier = new Container();
  private particles: RaidParticles | null = null;
  private explosions: RaidExplosions | null = null;

  private allyAtlas: ShipAtlas | null = null;
  private enemyAtlas: ShipAtlas | null = null;
  private playerAtlas: ShipAtlas | null = null; // custom Tripo ship, if selected

  private player: RaidShipEntity | null = null;
  private wingmen: RaidShipEntity[] = [];
  private enemies: RaidShipEntity[] = [];
  private modules: RaidModuleEntity[] = [];
  private projectiles: RaidProjectileEntity[] = [];
  private allyProjectileTexture: Texture | null = null;
  private enemyProjectileTexture: Texture | null = null;

  private keys = new Set<string>();
  private moveInput = { x: 0, y: 0 };
  private aimInput = { x: 0, y: -1 };
  private sectorAction: SectorAction = 'center';
  private phase: RaidPhase = 'approach';
  private startedAt = 0;
  private kills = 0;
  private modulesDestroyed = 0;
  private nextWaveIndex = 0;
  private snapshotTimer = 0;
  private ended = false;

  // ── Cheap premium feedback state (section A.4/A.5) ──
  private shakeMagnitude = 0;
  private hitStopMsRemaining = 0;
  private hitFlashMsRemaining = 0;
  private slowMoMsRemaining = 0;

  // ── Dynamic resolution (section A.6) ──
  private currentResolutionScale = 1;
  private badFrameStreak = 0;
  private stableGoodMs = 0;

  constructor(container: HTMLElement, callbacks: RaidCallbacks, shipId: string, customShipGlbUrl?: string | null) {
    this.container = container;
    this.callbacks = callbacks;
    this.shipId = shipId;
    this.customShipGlbUrl = customShipGlbUrl ?? null;
  }

  async init(): Promise<void> {
    this.startedAt = performance.now();
    this.app = new Application();
    await this.app.init({
      background: 0x020510,
      resizeTo: this.container,
      antialias: this.tier !== 'low',
      resolution: this.baseResolution,
      autoDensity: true,
    });
    this.currentResolutionScale = 1;
    this.container.appendChild(this.app.canvas);
    this.app.stage.addChild(this.background, this.starLayerFar, this.starLayerNear, this.world, this.hitFlash);
    this.createBackdrop();

    this.particles = new RaidParticles(this.app.renderer, this.particleBudget);
    this.world.addChild(this.particles.container);
    this.explosions = new RaidExplosions(this.world);

    await Promise.all([
      this.bakeAtlases(),
      this.explosions.load(),
      this.loadBackgroundImage(),
    ]);

    this.createCarrier();
    this.createPlayer();
    this.createWingmen();
    this.createProjectilePool();
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.layout);
    this.layout();
    this.app.ticker.add(this.update);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.layout);
    // init() may not have finished (component unmounted mid-await, e.g. fast
    // navigation away or an asset/WebGL failure) — guard every step so a
    // partially-constructed Application can never throw during teardown.
    this.app?.ticker?.remove(this.update);
    this.particles?.destroy();
    this.explosions?.destroy();
    try {
      this.app?.destroy(true);
    } catch {
      // best-effort — a half-initialized renderer can throw on teardown
    }
    this.app = null;
  }

  setMobileMove(x: number, y: number): void {
    this.moveInput = { x, y };
  }

  setMobileAim(x: number, y: number, firing: boolean): void {
    this.aimInput = normalize(x, -Math.max(0.25, 1 - Math.abs(y) * 0.2));
    if (firing) this.firePlayerBurst();
  }

  setMobileSector(sector: SectorAction): void {
    this.sectorAction = sector;
    if (sector === 'missile') this.firePlayerBurst(true);
  }

  triggerDash(): void {
    if (!this.player?.alive) return;
    this.player.vx += this.aimInput.x * 420;
    this.player.vy += this.aimInput.y * 420;
    playSfx('arena-warp', 0.12);
  }

  fireMissile(): void {
    this.firePlayerBurst(true);
  }

  getSnapshot(): RaidSnapshot {
    const reactor = this.modules.find((module) => module.type === 'reactor_core');
    const wavesRemaining = this.nextWaveIndex < RAID_WAVES.length || this.enemies.some((enemy) => enemy.alive);
    const objective = this.phase === 'reactor'
      ? 'raid.objective_reactor'
      : wavesRemaining
        ? 'raid.objective_waves'
        : 'raid.objective_shields';
    return {
      phase: this.phase,
      elapsedSec: Math.floor((performance.now() - this.startedAt) / 1000),
      playerHp: Math.max(0, Math.ceil(this.player?.hp ?? 0)),
      playerMaxHp: this.player?.maxHp ?? RAID_PLAYER_HP,
      playerShield: Math.max(0, Math.ceil(this.player?.shield ?? 0)),
      playerMaxShield: this.player?.maxShield ?? RAID_PLAYER_SHIELD,
      alliedAlive: this.wingmen.filter((ship) => ship.alive).length + (this.player?.alive ? 1 : 0),
      enemiesActive: this.enemies.filter((ship) => ship.alive).length,
      kills: this.kills,
      modulesDestroyed: this.modulesDestroyed,
      modulesTotal: this.modules.length,
      reactorHp: Math.max(0, Math.ceil(reactor?.hp ?? 0)),
      reactorMaxHp: reactor?.maxHp ?? 1,
      objective,
    };
  }

  // ── Input ──────────────────────────────────────────────────────────────

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const key = this.controlKeyFromEvent(event);
    this.keys.add(key);
    if (key === ' ' || key === 'shift') this.triggerDash();
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(this.controlKeyFromEvent(event));
  };

  private controlKeyFromEvent(event: KeyboardEvent): string {
    switch (event.code) {
      case 'KeyW': return 'w';
      case 'KeyA': return 'a';
      case 'KeyS': return 's';
      case 'KeyD': return 'd';
      case 'KeyF': return 'f';
      default: return event.key.toLowerCase();
    }
  }

  private readonly layout = (): void => {
    if (!this.app) return;
    const scale = Math.min(this.app.renderer.width / WORLD_W, this.app.renderer.height / WORLD_H);
    this.world.scale.set(scale);
    const cx = this.app.renderer.width / 2;
    const cy = this.app.renderer.height / 2;
    this.world.position.set(cx, cy);
    if (this.backgroundImage) {
      const w = this.app.renderer.width;
      const h = this.app.renderer.height;
      const cover = Math.max(w / this.backgroundImage.texture.width, h / this.backgroundImage.texture.height);
      this.backgroundImage.scale.set(cover);
      this.backgroundImage.position.set(cx, cy);
    }
    this.hitFlash.clear();
    this.hitFlash.rect(0, 0, this.app.renderer.width, this.app.renderer.height).fill({ color: 0xffffff, alpha: 1 });
    this.hitFlash.alpha = 0;
  };

  // ── Ship sprite baking (section A.1) ────────────────────────────────────

  private async bakeAtlases(): Promise<void> {
    const size = this.bakeFrameSize;
    const bakes: Array<Promise<void>> = [];

    bakes.push((async () => {
      const atlas = await bakeShipAtlas({
        glbUrl: BLUE_SHIP,
        tint: ALLY_TINT,
        tintStrength: 0.5,
        frameSize: size,
        cacheKey: `ally:${size}`,
      }) ?? await bakeShipAtlas({
        glbUrl: ENEMY_SWARM_SHIP,
        tint: ALLY_TINT,
        tintStrength: 0.5,
        frameSize: size,
        cacheKey: `ally-fallback:${size}`,
      });
      this.allyAtlas = atlas;
    })());

    bakes.push((async () => {
      const atlas = await bakeShipAtlas({
        glbUrl: ENEMY_SWARM_SHIP,
        tint: ENEMY_TINT,
        tintStrength: 0.5,
        frameSize: size,
        cacheKey: `enemy:${size}`,
      }) ?? await bakeShipAtlas({
        glbUrl: RED_SHIP,
        tint: ENEMY_TINT,
        tintStrength: 0.5,
        frameSize: size,
        cacheKey: `enemy-fallback:${size}`,
      });
      this.enemyAtlas = atlas;
    })());

    if (this.shipId === 'custom' && this.customShipGlbUrl) {
      bakes.push((async () => {
        this.playerAtlas = await bakeShipAtlas({
          glbUrl: this.customShipGlbUrl!,
          tint: 0,
          tintStrength: 0,
          frameSize: size,
          cacheKey: `custom:${this.customShipGlbUrl}:${size}`,
        });
      })());
    } else if (this.shipId === 'red') {
      bakes.push((async () => {
        this.playerAtlas = await bakeShipAtlas({
          glbUrl: RED_SHIP,
          tint: 0xff8844,
          tintStrength: 0.4,
          frameSize: size,
          cacheKey: `player-red:${size}`,
        });
      })());
    }

    await Promise.all(bakes);
  }

  // ── World construction ──────────────────────────────────────────────────

  /**
   * One static pre-rendered nebula backdrop (`raid_background_mobile.webp`,
   * ~19KB, art-authored) — a single full-screen Sprite, not stretched/panned
   * per frame. Loaded in parallel with atlas baking; if it fails, the dark
   * app clear color + procedural dot layers already cover the background.
   */
  private async loadBackgroundImage(): Promise<void> {
    try {
      const texture = await Assets.load<Texture>(RAID_BACKGROUND_IMAGE);
      if (!this.app) return;
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      this.backgroundImage = sprite;
      this.app.stage.addChildAt(sprite, 0);
      this.layout();
    } catch {
      // Fallback stays the flat clear color + procedural dots below.
    }
  }

  private createBackdrop(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.background.clear();
    for (let i = 0; i < 90; i++) {
      const x = ((i * 137) % 1000) / 1000 * w;
      const y = ((i * 277) % 1000) / 1000 * h;
      const a = 0.14 + ((i * 17) % 40) / 100;
      this.background.circle(x, y, i % 7 === 0 ? 1.4 : 0.7).fill({ color: 0x66778a, alpha: a });
    }
    // Two star layers that drift slowly downward, confined entirely to this
    // self-contained combat overlay (no CameraController involved — GAME_BIBLE's
    // parallax prohibition is about conflicts with the shared pan/zoom camera).
    // Geometry drawn once; per-frame we only shift .y and wrap, never redraw.
    this.drawStarLayer(this.starLayerFar, w, h, 46, 0.9, 401);
    this.drawStarLayer(this.starLayerNear, w, h, 26, 1.6, 733);
  }

  private drawStarLayer(layer: Graphics, w: number, h: number, count: number, dotScale: number, seedMul: number): void {
    layer.clear();
    const wrapH = h * 2;
    for (let i = 0; i < count; i++) {
      const x = ((i * seedMul) % 1000) / 1000 * w;
      const y = ((i * seedMul * 1.7) % 1000) / 1000 * wrapH;
      const a = 0.12 + ((i * 31) % 50) / 100;
      layer.circle(x, y, dotScale).fill({ color: 0x88aacc, alpha: a });
    }
    layer.position.set(0, -h * 0.5);
  }

  private createCarrier(): void {
    const size = this.bakeFrameSize;
    const bakePromise = bakeShipAtlas({
      glbUrl: CARRIER_BOSS,
      tint: 0x334455,
      tintStrength: 0.12,
      frameSize: size,
      cacheKey: `carrier:${size}`,
    });

    const hull = new Graphics();
    hull.poly([-360, -70, -230, -145, 260, -120, 390, 0, 260, 120, -230, 145, -360, 70]);
    hull.fill({ color: 0x172334, alpha: 0.95 });
    hull.stroke({ color: 0x446688, alpha: 0.65, width: 3 });
    hull.moveTo(-260, 0).lineTo(280, 0).stroke({ color: 0x334455, alpha: 0.65, width: 2 });
    this.carrier.addChild(hull);
    this.carrier.position.set(0, -410);
    this.world.addChild(this.carrier);

    void bakePromise.then((atlas) => {
      if (!atlas || !this.carrier) return;
      const sprite = new Sprite(atlas.normal[0]);
      sprite.anchor.set(0.5);
      sprite.scale.set(11);
      hull.visible = false;
      this.carrier.addChildAt(sprite, 0);
    });

    const moduleData: Array<[RaidModuleEntity['id'], RaidModuleEntity['type'], number, number, number]> = [
      ['bay-l', 'hangar_bay', -250, -55, 85],
      ['bay-r', 'hangar_bay', -250, 55, 85],
      ['shield-l', 'shield_emitter', -70, -95, 110],
      ['shield-r', 'shield_emitter', -70, 95, 110],
      ['turret-l', 'turret_cluster', 130, -88, 95],
      ['turret-r', 'turret_cluster', 130, 88, 95],
      ['reactor', 'reactor_core', 255, 0, 240],
    ];
    for (const [id, type, x, y, hp] of moduleData) {
      const view = drawModule(type);
      view.position.set(x, y - 410);
      this.modules.push({ id, type, x, y: y - 410, hp, maxHp: hp, radius: type === 'reactor_core' ? 46 : 38, alive: true, fireCooldown: 1 + Math.abs(x) / 300, view });
      this.world.addChild(view);
    }
  }

  private buildShipView(atlas: ShipAtlas | null, fallbackColor: number, fallbackScale: number, isDrone: boolean): EntityView {
    const root = new Container();
    if (atlas) {
      const sprite = new Sprite(atlas.normal[0]);
      sprite.anchor.set(0.5);
      const desiredHeight = isDrone ? 34 : 40;
      const spriteScale = desiredHeight / atlas.frameSize;
      sprite.scale.set(spriteScale);
      root.addChild(sprite);
      return { root, sprite, atlas, angleIndex: 0 };
    }
    const fallback = isDrone ? drawProceduralDrone() : drawProceduralShip(fallbackColor, fallbackScale);
    root.addChild(fallback);
    return { root, sprite: null, atlas: null, angleIndex: 0 };
  }

  private createPlayer(): void {
    const atlas = this.playerAtlas ?? this.allyAtlas;
    const view = this.buildShipView(atlas, 0x7bb8ff, 1.1, false);
    this.player = {
      id: 1, team: 'allied', x: 0, y: 460, vx: 0, vy: 0,
      hp: RAID_PLAYER_HP, maxHp: RAID_PLAYER_HP, shield: RAID_PLAYER_SHIELD, maxShield: RAID_PLAYER_SHIELD,
      radius: 20, fireCooldown: 0, shieldDelay: 0, alive: true, view, facing: 0, trailTimer: 0,
    };
    this.world.addChild(view.root);
  }

  private createWingmen(): void {
    for (let i = 0; i < RAID_WINGMEN; i++) {
      const view = this.buildShipView(this.allyAtlas, 0x7bb8ff, 0.82, false);
      const ship: RaidShipEntity = {
        id: 10 + i, team: 'allied', x: (i - 1.5) * 110, y: 540 + (i % 2) * 50, vx: 0, vy: 0,
        hp: RAID_ALLY_HP, maxHp: RAID_ALLY_HP, shield: RAID_ALLY_SHIELD, maxShield: RAID_ALLY_SHIELD,
        radius: 16, fireCooldown: i * 0.25, shieldDelay: 0, alive: true, view, facing: 0, trailTimer: Math.random(),
      };
      this.wingmen.push(ship);
      this.world.addChild(view.root);
    }
  }

  private createProjectilePool(): void {
    this.allyProjectileTexture = this.buildProjectileTexture(0x7bb8ff);
    this.enemyProjectileTexture = this.buildProjectileTexture(0xff8844);
    const count = this.tier === 'low' ? 90 : 140;
    for (let i = 0; i < count; i++) {
      const view = new Sprite(this.allyProjectileTexture);
      view.anchor.set(0.5);
      view.visible = false;
      this.projectiles.push({ active: false, team: 'allied', damage: RAID_PROJECTILE_DAMAGE, age: 0, lifetime: RAID_PROJECTILE_LIFETIME, radius: 5, x: 0, y: 0, vx: 0, vy: 0, view });
      this.world.addChild(view);
    }
  }

  /** Two shared bolt textures (allied/enemy) baked once — replaces the old per-shot Graphics.clear()+redraw. */
  private buildProjectileTexture(color: number): Texture {
    if (!this.app) return Texture.EMPTY;
    const g = new Graphics();
    g.circle(0, 0, 6).fill({ color, alpha: 0.25 });
    g.circle(0, 0, 3.6).fill({ color, alpha: 0.9 });
    g.circle(0, 0, 1.6).fill({ color: 0xffffff, alpha: 0.9 });
    const texture = this.app.renderer.generateTexture({ target: g, resolution: 2 });
    g.destroy();
    return texture;
  }

  private spawnWave(count: number): void {
    const active = this.enemies.filter((enemy) => enemy.alive).length;
    const spawnCount = Math.max(0, Math.min(count, this.maxActiveEnemies - active));
    for (let i = 0; i < spawnCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const view = this.buildShipView(this.enemyAtlas, 0xcc4444, 1, true);
      const ship: RaidShipEntity = {
        id: 1000 + this.enemies.length,
        team: 'enemy',
        x: side * (520 + (i % 4) * 60),
        y: -190 - Math.floor(i / 2) * 70,
        vx: -side * 60,
        vy: 70,
        hp: RAID_DRONE_HP,
        maxHp: RAID_DRONE_HP,
        shield: 0,
        maxShield: 0,
        radius: 17,
        fireCooldown: 0.8 + (i % 5) * 0.18,
        shieldDelay: 0,
        alive: true,
        view,
        facing: Math.PI,
        trailTimer: Math.random(),
        aiOrbitDir: i % 2 === 0 ? -1 : 1,
        aiOrbitRadius: 150 + (i % 5) * 28,
      };
      this.enemies.push(ship);
      this.world.addChild(view.root);
    }
  }

  // ── Main loop ────────────────────────────────────────────────────────────

  private readonly update = (): void => {
    if (!this.app || this.ended) return;
    const realDeltaMs = this.app.ticker.deltaMS;
    this.updateDynamicResolution(realDeltaMs);

    if (this.hitStopMsRemaining > 0) {
      this.hitStopMsRemaining -= realDeltaMs;
      this.updateFeedback(realDeltaMs);
      this.updateViews();
      return;
    }

    let dt = Math.min(0.05, realDeltaMs / 1000);
    if (this.slowMoMsRemaining > 0) {
      this.slowMoMsRemaining -= realDeltaMs;
      dt *= RAID_WAVE_CLEAR_SLOWMO_FACTOR;
    }

    const elapsed = (performance.now() - this.startedAt) / 1000;
    while (this.nextWaveIndex < RAID_WAVES.length && elapsed >= RAID_WAVES[this.nextWaveIndex].at) {
      this.spawnWave(RAID_WAVES[this.nextWaveIndex].count);
      this.nextWaveIndex++;
      if (this.phase === 'approach') this.phase = 'waves';
    }

    this.updatePlayer(dt);
    this.updateWingmen(dt);
    this.updateEnemies(dt);
    this.updateModules(dt);
    this.updateProjectiles(dt);
    this.particles?.update(dt);
    this.updateFeedback(realDeltaMs);
    this.updateViews();

    const shieldAlive = this.modules.some((module) => module.type === 'shield_emitter' && module.alive);
    const reactor = this.modules.find((module) => module.type === 'reactor_core');
    if (!shieldAlive && this.phase !== 'victory' && this.phase !== 'defeat') this.phase = 'reactor';
    if (reactor && !reactor.alive) this.endRaid(true);
    if (this.player && !this.player.alive) this.endRaid(false);

    this.snapshotTimer += dt;
    if (this.snapshotTimer >= 0.15) {
      this.snapshotTimer = 0;
      this.callbacks.onStatsUpdate?.(this.getSnapshot());
    }
  };

  private updatePlayer(dt: number): void {
    const player = this.player;
    if (!player?.alive) return;
    const keyX = (this.keys.has('a') || this.keys.has('arrowleft') ? -1 : 0) + (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0);
    const keyY = (this.keys.has('w') || this.keys.has('arrowup') ? -1 : 0) + (this.keys.has('s') || this.keys.has('arrowdown') ? 1 : 0);
    const input = normalize(keyX + this.moveInput.x, keyY + this.moveInput.y);
    player.vx += input.x * RAID_SPEED * 3.2 * dt;
    player.vy += input.y * RAID_SPEED * 3.2 * dt;
    player.vx *= 0.91;
    player.vy *= 0.91;
    player.x = clamp(player.x + player.vx * dt, -760, 760);
    player.y = clamp(player.y + player.vy * dt, -120, 590);
    player.facing = facingAngle(this.aimInput.x, this.aimInput.y);
    this.emitTrail(player, dt);
    this.checkPlayerCarrierCollision();
    player.fireCooldown -= dt;
    if (this.keys.has('f') || this.keys.has('enter')) this.firePlayerBurst();
    this.regenShield(player, dt);
  }

  private checkPlayerCarrierCollision(): void {
    const player = this.player;
    if (!player?.alive) return;
    const inside =
      player.x > -390 - player.radius &&
      player.x < 390 + player.radius &&
      player.y > -555 - player.radius &&
      player.y < -265 + player.radius;
    if (!inside) return;
    player.hp = 0;
    player.shield = 0;
    player.alive = false;
    player.view.root.visible = false;
    this.endRaid(false);
  }

  private updateWingmen(dt: number): void {
    const targets = this.enemies.filter((enemy) => enemy.alive);
    for (let i = 0; i < this.wingmen.length; i++) {
      const ship = this.wingmen[i];
      if (!ship.alive) continue;
      const anchorX = (i - 1.5) * 120 + (this.player?.x ?? 0) * 0.25;
      const anchorY = 500 + (i % 2) * 55;
      ship.vx += (anchorX - ship.x) * dt * 1.5;
      ship.vy += (anchorY - ship.y) * dt * 1.5;
      ship.vx *= 0.9;
      ship.vy *= 0.9;
      ship.x += ship.vx * dt;
      ship.y += ship.vy * dt;
      ship.fireCooldown -= dt;
      const target = targets[i % Math.max(1, targets.length)] ?? this.modules.find((module) => module.alive && module.type !== 'reactor_core');
      if (target) {
        ship.facing = facingAngle(target.x - ship.x, target.y - ship.y);
      }
      this.emitTrail(ship, dt);
      if (target && ship.fireCooldown <= 0) {
        this.fireProjectile(ship.x, ship.y - 12, target.x - ship.x, target.y - ship.y, 'allied', RAID_ALLY_DAMAGE);
        ship.fireCooldown = 0.55 + i * 0.05;
      }
      this.regenShield(ship, dt);
    }
  }

  private updateEnemies(dt: number): void {
    const player = this.player;
    const allies = [player, ...this.wingmen].filter((ship): ship is RaidShipEntity => !!ship && ship.alive);
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const target = this.nearestShip(enemy, allies);
      if (!target) continue;
      const dx = target.x - enemy.x;
      const dy = target.y - enemy.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const dir = { x: dx / dist, y: dy / dist };
      const tangent = { x: -dir.y * (enemy.aiOrbitDir ?? 1), y: dir.x * (enemy.aiOrbitDir ?? 1) };
      const orbitRadius = enemy.aiOrbitRadius ?? 190;
      const radial = dist < orbitRadius * 0.75 ? -1 : dist > orbitRadius * 1.35 ? 1 : 0;
      const separation = this.computeEnemySeparation(enemy, 95);
      const dodgeWave = Math.sin(performance.now() * 0.003 + enemy.id) * 0.35;
      const move = normalize(
        tangent.x * 1.25 + dir.x * radial + separation.x * 1.6,
        tangent.y * 1.25 + dir.y * radial + separation.y * 1.6 + dodgeWave,
      );
      enemy.vx += move.x * 310 * dt;
      enemy.vy += move.y * 310 * dt;
      enemy.vx *= 0.965;
      enemy.vy *= 0.965;
      const speed = Math.hypot(enemy.vx, enemy.vy);
      if (speed > 240) {
        enemy.vx = enemy.vx / speed * 240;
        enemy.vy = enemy.vy / speed * 240;
      }
      enemy.x = clamp(enemy.x + enemy.vx * dt, -880, 880);
      enemy.y = clamp(enemy.y + enemy.vy * dt, -520, 620);
      enemy.facing = facingAngle(enemy.vx, enemy.vy) || enemy.facing;
      this.emitTrail(enemy, dt);
      enemy.fireCooldown -= dt;
      if (enemy.fireCooldown <= 0 && dist < 760) {
        const lead = Math.min(0.36, dist / (RAID_PROJECTILE_SPEED * 0.55));
        this.fireProjectile(
          enemy.x,
          enemy.y + 10,
          target.x + target.vx * lead - enemy.x + (Math.random() - 0.5) * 70,
          target.y + target.vy * lead - enemy.y + (Math.random() - 0.5) * 50,
          'enemy',
          RAID_ENEMY_DAMAGE,
        );
        enemy.fireCooldown = 0.72 + Math.random() * 0.45;
      }
    }
  }

  private nearestShip(from: RaidShipEntity, ships: RaidShipEntity[]): RaidShipEntity | null {
    let best: RaidShipEntity | null = null;
    let bestD = Infinity;
    for (const ship of ships) {
      const d = (ship.x - from.x) ** 2 + (ship.y - from.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = ship;
      }
    }
    return best;
  }

  private computeEnemySeparation(self: RaidShipEntity, radius: number): { x: number; y: number } {
    let x = 0;
    let y = 0;
    for (const other of this.enemies) {
      if (other === self || !other.alive) continue;
      const dx = self.x - other.x;
      const dy = self.y - other.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.01 || d > radius) continue;
      const w = 1 - d / radius;
      x += (dx / d) * w;
      y += (dy / d) * w;
    }
    return { x, y };
  }

  private updateModules(dt: number): void {
    const target = this.player?.alive ? this.player : this.wingmen.find((ship) => ship.alive);
    if (!target) return;
    for (const module of this.modules) {
      if (!module.alive || module.type === 'reactor_core') continue;
      module.fireCooldown -= dt;
      if (module.fireCooldown <= 0) {
        this.fireProjectile(module.x, module.y + 15, target.x - module.x, target.y - module.y, 'enemy', RAID_ENEMY_DAMAGE + 2);
        module.fireCooldown = module.type === 'turret_cluster' ? 0.85 : 1.7;
      }
    }
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.age > p.lifetime || Math.abs(p.x) > 1100 || Math.abs(p.y) > 800) {
        this.releaseProjectile(p);
        continue;
      }
      if (p.team === 'allied') this.hitEnemyTargets(p);
      else this.hitAlliedTargets(p);
    }
  }

  private hitEnemyTargets(p: RaidProjectileEntity): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive || Math.hypot(enemy.x - p.x, enemy.y - p.y) > enemy.radius + p.radius) continue;
      this.damageShip(enemy, p.damage, 'player');
      this.releaseProjectile(p);
      return;
    }
    const shieldsAlive = this.modules.some((module) => module.type === 'shield_emitter' && module.alive);
    for (const module of this.modules) {
      if (!module.alive) continue;
      if (module.type === 'reactor_core' && shieldsAlive) continue;
      if (Math.hypot(module.x - p.x, module.y - p.y) > module.radius + p.radius) continue;
      module.hp -= p.damage;
      this.particles?.spawnSparks(p.x, p.y, this.tier === 'low' ? 3 : 5, 0xff8844, 160);
      if (module.hp <= 0) {
        module.alive = false;
        module.view.alpha = 0.18;
        this.modulesDestroyed++;
        this.explosions?.play('large', module.x, module.y, 1.1);
        this.particles?.spawnDebris(module.x, module.y, this.tier === 'low' ? 6 : 12, 0xffaa66);
        this.addShake(RAID_SCREEN_SHAKE_MODULE_DESTROYED);
        playSfx('arena-explosion', 0.18);
      }
      this.releaseProjectile(p);
      return;
    }
  }

  private hitAlliedTargets(p: RaidProjectileEntity): void {
    const allied = [this.player, ...this.wingmen].filter(Boolean) as RaidShipEntity[];
    for (const ship of allied) {
      if (!ship.alive || Math.hypot(ship.x - p.x, ship.y - p.y) > ship.radius + p.radius) continue;
      this.damageShip(ship, p.damage, 'wingman');
      this.releaseProjectile(p);
      return;
    }
  }

  private damageShip(ship: RaidShipEntity, damage: number, source: 'player' | 'wingman'): void {
    const shieldHit = Math.min(ship.shield, damage);
    ship.shield -= shieldHit;
    ship.hp -= damage - shieldHit;
    ship.shieldDelay = RAID_SHIELD_REGEN_DELAY;
    this.particles?.spawnSparks(ship.x, ship.y, this.tier === 'low' ? 2 : 4, shieldHit > 0 ? 0x7bb8ff : 0xffbb66, 150);
    if (ship === this.player) {
      this.triggerHitFlash();
      this.addShake(RAID_SCREEN_SHAKE_HIT);
    }
    if (ship.hp <= 0) {
      ship.alive = false;
      ship.view.root.visible = false;
      this.explosions?.play(ship.team === 'enemy' ? 'small' : 'large', ship.x, ship.y, ship.team === 'enemy' ? 0.9 : 1.2);
      this.particles?.spawnDebris(ship.x, ship.y, this.tier === 'low' ? 4 : 8, ship.team === 'enemy' ? 0xff8844 : 0x7bb8ff);
      if (ship.team === 'enemy') {
        this.kills++;
        this.callbacks.onKill?.({ kills: this.kills, source });
        this.addShake(RAID_SCREEN_SHAKE_KILL);
        this.hitStopMsRemaining = RAID_HITSTOP_KILL_MS;
        playSfx('arena-explosion', 0.12);
        this.maybeTriggerWaveClearSlowMo();
      }
    }
  }

  private maybeTriggerWaveClearSlowMo(): void {
    const stillAlive = this.enemies.some((enemy) => enemy.alive);
    const morewavesQueued = this.nextWaveIndex < RAID_WAVES.length;
    if (!stillAlive && (this.phase === 'waves' || morewavesQueued)) {
      this.slowMoMsRemaining = RAID_WAVE_CLEAR_SLOWMO_MS;
    }
  }

  private regenShield(ship: RaidShipEntity, dt: number): void {
    if (ship.shieldDelay > 0) {
      ship.shieldDelay -= dt;
      return;
    }
    ship.shield = Math.min(ship.maxShield, ship.shield + RAID_SHIELD_REGEN_RATE * dt);
  }

  private firePlayerBurst(heavy = false): void {
    const player = this.player;
    if (!player?.alive || player.fireCooldown > 0) return;
    this.fireProjectile(player.x - 7, player.y - 18, this.aimInput.x - 0.04, this.aimInput.y, 'allied', heavy ? RAID_PROJECTILE_DAMAGE * 2.1 : RAID_PROJECTILE_DAMAGE);
    this.fireProjectile(player.x + 7, player.y - 18, this.aimInput.x + 0.04, this.aimInput.y, 'allied', heavy ? RAID_PROJECTILE_DAMAGE * 2.1 : RAID_PROJECTILE_DAMAGE);
    player.fireCooldown = heavy || this.sectorAction === 'missile' ? 0.38 : 0.18;
    if (Math.random() < 0.5) playSfx('arena-laser', 0.05);
  }

  private fireProjectile(x: number, y: number, dx: number, dy: number, team: RaidTeam, damage: number): void {
    const p = this.projectiles.find((projectile) => !projectile.active);
    if (!p) return;
    const dir = normalize(dx, dy);
    p.active = true;
    p.team = team;
    p.damage = damage;
    p.age = 0;
    p.x = x;
    p.y = y;
    p.vx = dir.x * RAID_PROJECTILE_SPEED * 0.55;
    p.vy = dir.y * RAID_PROJECTILE_SPEED * 0.55;
    p.view.texture = team === 'allied' ? this.allyProjectileTexture! : this.enemyProjectileTexture!;
    p.view.rotation = Math.atan2(dir.x, -dir.y);
    p.view.visible = true;
  }

  private releaseProjectile(p: RaidProjectileEntity): void {
    p.active = false;
    p.view.visible = false;
  }

  private emitTrail(ship: RaidShipEntity, dt: number): void {
    ship.trailTimer -= dt;
    if (ship.trailTimer > 0) return;
    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed < 40) {
      ship.trailTimer = 0.12;
      return;
    }
    ship.trailTimer = 0.045;
    const back = normalize(-ship.vx, -ship.vy);
    const tint = ship.team === 'enemy' ? 0xff8844 : 0x7bb8ff;
    this.particles?.spawnTrail(ship.x + back.x * 12, ship.y + back.y * 12, tint, ship.radius / 20);
  }

  // ── Feedback: shake / hit-stop / flash / dynamic resolution ─────────────

  private addShake(amount: number): void {
    this.shakeMagnitude = Math.min(RAID_SCREEN_SHAKE_MAX, this.shakeMagnitude + amount);
  }

  private triggerHitFlash(): void {
    this.hitFlashMsRemaining = RAID_HIT_FLASH_MS;
  }

  private updateFeedback(realDeltaMs: number): void {
    if (this.shakeMagnitude > 0) {
      this.shakeMagnitude = Math.max(0, this.shakeMagnitude - RAID_SCREEN_SHAKE_DECAY_PER_SEC * (realDeltaMs / 1000) * 4);
    }
    if (this.hitFlashMsRemaining > 0) {
      this.hitFlashMsRemaining = Math.max(0, this.hitFlashMsRemaining - realDeltaMs);
      this.hitFlash.alpha = (this.hitFlashMsRemaining / RAID_HIT_FLASH_MS) * 0.32;
    } else {
      this.hitFlash.alpha = 0;
    }
    // Star layers drift slowly downward within this self-contained scene only.
    this.starLayerFarOffset = (this.starLayerFarOffset + realDeltaMs * 0.006) % 300;
    this.starLayerNearOffset = (this.starLayerNearOffset + realDeltaMs * 0.014) % 300;
    this.starLayerFar.position.y = -this.container.clientHeight * 0.5 + this.starLayerFarOffset;
    this.starLayerNear.position.y = -this.container.clientHeight * 0.5 + this.starLayerNearOffset;
  }

  private updateDynamicResolution(realDeltaMs: number): void {
    if (!this.app) return;
    if (realDeltaMs > RAID_DYNRES_FRAME_MS_THRESHOLD) {
      this.badFrameStreak++;
      this.stableGoodMs = 0;
      if (this.badFrameStreak >= RAID_DYNRES_BAD_FRAMES_TO_DROP && this.currentResolutionScale !== RAID_DYNRES_SCALE) {
        this.currentResolutionScale = RAID_DYNRES_SCALE;
        this.applyResolution();
      }
    } else {
      this.badFrameStreak = 0;
      if (this.currentResolutionScale !== 1) {
        this.stableGoodMs += realDeltaMs;
        if (this.stableGoodMs >= RAID_DYNRES_STABLE_MS_TO_RESTORE) {
          this.currentResolutionScale = 1;
          this.applyResolution();
        }
      }
    }
  }

  private applyResolution(): void {
    if (!this.app) return;
    const target = this.baseResolution * this.currentResolutionScale;
    this.app.renderer.resize(this.app.renderer.screen.width, this.app.renderer.screen.height, target);
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  private applyShipFrame(ship: RaidShipEntity): void {
    const view = ship.view;
    if (!view.sprite || !view.atlas) {
      view.root.rotation = ship.facing;
      return;
    }
    const damaged = ship.hp / ship.maxHp < DAMAGED_HP_PCT;
    const frameIndex = angleToFrameIndex(ship.facing, view.atlas.normal.length);
    if (frameIndex !== view.angleIndex || view.sprite.texture !== (damaged ? view.atlas.damaged[frameIndex] : view.atlas.normal[frameIndex])) {
      view.sprite.texture = damaged ? view.atlas.damaged[frameIndex] : view.atlas.normal[frameIndex];
      view.angleIndex = frameIndex;
    }
  }

  private updateViews(): void {
    if (this.player) {
      this.player.view.root.position.set(this.player.x, this.player.y);
      this.applyShipFrame(this.player);
    }
    for (const ship of this.wingmen) {
      ship.view.root.position.set(ship.x, ship.y);
      this.applyShipFrame(ship);
    }
    for (const enemy of this.enemies) {
      enemy.view.root.position.set(enemy.x, enemy.y);
      this.applyShipFrame(enemy);
    }
    for (const p of this.projectiles) {
      if (p.active) p.view.position.set(p.x, p.y);
    }
    for (const module of this.modules) {
      if (!module.alive) continue;
      const pct = clamp(module.hp / module.maxHp, 0, 1);
      module.view.scale.set(0.82 + pct * 0.18);
    }

    // Screen shake — offset applied on top of the fit-to-screen layout each
    // frame; layout() itself is only re-run on resize (static transform rule).
    if (this.app) {
      const mag = this.shakeMagnitude;
      const shakeX = mag > 0.05 ? (Math.random() - 0.5) * mag : 0;
      const shakeY = mag > 0.05 ? (Math.random() - 0.5) * mag : 0;
      const cx = this.app.renderer.width / 2;
      const cy = this.app.renderer.height / 2;
      this.world.position.set(cx + shakeX, cy + shakeY);
    }
  }

  private endRaid(victory: boolean): void {
    if (this.ended) return;
    this.ended = true;
    this.phase = victory ? 'victory' : 'defeat';
    const result: RaidResult = {
      victory,
      kills: this.kills,
      modulesDestroyed: this.modulesDestroyed,
      elapsedSec: Math.floor((performance.now() - this.startedAt) / 1000),
      xp: victory ? RAID_REWARD_BASE_XP + this.kills * RAID_REWARD_XP_PER_KILL + this.modulesDestroyed * RAID_REWARD_XP_PER_MODULE : Math.floor(this.kills * RAID_REWARD_XP_PER_KILL * 0.5),
      minerals: victory ? 240 + this.modulesDestroyed * 40 : Math.floor(this.kills * 3),
      isotopes: victory ? 30 + this.modulesDestroyed * 5 : 0,
      techFragments: victory ? 1 : 0,
    };
    this.callbacks.onStatsUpdate?.(this.getSnapshot());
    this.callbacks.onRaidEnd?.(result);
  }
}
