// ---------------------------------------------------------------------------
// ArenaEngine — main Three.js engine for Space Arena
// Pattern: class-based imperative (same as UniverseEngine)
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { playSfx, playLoop, stopLoop, stopAllLoops, setLoopVolume } from '../../audio/SfxPlayer.js';
import type { ArenaCallbacks, InputState, ShipEntity, MatchPhase, BotShip, BotBullet, Team, TeamMatchResult } from './ArenaTypes.js';
import {
  ARENA_SIZE, ARENA_HALF, ARENA_HEIGHT_HALF, ARENA_GROUND_Y,
  CAMERA_FOV, CAMERA_HEIGHT, CAMERA_DISTANCE, CAMERA_LERP_SPEED,
  CAMERA_BEHIND, CAMERA_UP, CAMERA_LOOK_LEAD, CAMERA_LOOK_UP,
  CAMERA_LERP_POS, CAMERA_LERP_LOOK,
  MAX_PIXEL_RATIO, STARFIELD_COUNT,
  BOT_COUNT, MATCH_DURATION, COUNTDOWN_SECONDS,
  ASTEROID_COUNT, ASTEROID_MIN_RADIUS, ASTEROID_MAX_RADIUS,
  SHIP_MAX_SPEED, SHIP_ACCELERATION, SHIP_DRAG, SHIP_RADIUS, SHIP_SHOT_RADIUS,
  TEAM_BLUE_BOTS, TEAM_RED_BOTS, BOT_BULLET_POOL, BOT_RESPAWN_DELAY,
  BOT_NAMES, TEAM_SCORE_ENEMY_KILL, TEAM_SCORE_DEATH, TEAM_KILL_LIMIT,
  TRAINING_BOT_COUNT, TRAINING_BLUE_ALLIES, TRAINING_RED_ENEMIES, TRAINING_ASTEROID_COUNT,
} from './ArenaConstants.js';
import { createBotBrain, updateBot } from './ArenaAI.js';

// Pre-allocated temp vectors — ZERO allocations in hot path
const _tempVec3 = new THREE.Vector3();
const _tempColor = new THREE.Color();
const _camTarget = new THREE.Vector3();
const _tempDummy = new THREE.Object3D(); // shared matrix writer for InstancedMesh updates

const SHIP_FILES: Record<string, string> = {
  ship1: '/arena_ships/star_ship1.webp',
  ship2: '/arena_ships/star_ship2.webp',
  ship3: '/arena_ships/star_ship3.webp',
};

// GLB models — blue for player + blue team, red for enemies.
const SHIP_GLB_BLUE = '/arena_ships/blue_ship.glb';
const SHIP_GLB_RED  = '/arena_ships/red_ship.glb';

// Target bounding-box size of a loaded ship in world units. Models are
// auto-scaled so their longest axis matches this. Keeps gameplay radii
// consistent no matter what Tripo spat out.
const SHIP_VISUAL_SIZE = 40;

// Tripo ship GLB nose offset — π/2 rotates model +X nose to outer's -Z
// (the forward axis). Bots, which use the Euler rotation path, rely on
// this offset and the user confirmed bots look correct. Player uses
// lookAt and compensates for Three.js's +Z-toward-target convention by
// pointing lookAt at (ship − aim) instead of (ship + aim).
const SHIP_MODEL_NOSE_OFFSET = Math.PI / 2;

// Cached loaded scenes. Loaded once on ArenaEngine.init, cloned per ship.
let _cachedBlueShip: THREE.Group | null = null;
let _cachedRedShip: THREE.Group | null = null;

function _normalizeShipScene(scene: THREE.Group): THREE.Group {
  // Compute bounding box of loaded model and rescale so longest axis =
  // SHIP_VISUAL_SIZE. Recenter so pivot is at the origin. Guard factor
  // against pathological boxes so a broken model can't nuke the scene.
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const longestAxis = Math.max(size.x, size.y, size.z);
  let factor = 1;
  if (longestAxis > 0.0001) {
    factor = SHIP_VISUAL_SIZE / longestAxis;
    // Clamp so nothing too tiny/huge slips through.
    if (factor < 0.001 || factor > 10000) factor = 1;
  }
  scene.scale.setScalar(factor);
  scene.position.set(-center.x * factor, -center.y * factor, -center.z * factor);
  // One-time diagnostic so we can see the scale on each reload.
  // eslint-disable-next-line no-console
  console.log('[arena] ship GLB normalized:',
    { sizeX: +size.x.toFixed(2), sizeY: +size.y.toFixed(2), sizeZ: +size.z.toFixed(2), factor: +factor.toFixed(3) });
  return scene;
}

/**
 * Load + cache the two team ship GLBs. Returns when both are ready.
 * Falls back silently if a file is missing — caller should check for null.
 */
async function preloadShipModels(): Promise<void> {
  if (_cachedBlueShip && _cachedRedShip) return;
  const loader = new GLTFLoader();
  const load = (url: string) => new Promise<THREE.Group | null>((resolve) => {
    loader.load(
      url,
      (gltf) => resolve(_normalizeShipScene(gltf.scene)),
      undefined,
      () => resolve(null),
    );
  });
  const [blue, red] = await Promise.all([load(SHIP_GLB_BLUE), load(SHIP_GLB_RED)]);
  _cachedBlueShip = blue;
  _cachedRedShip = red;
}

/**
 * Clone a cached ship scene. Materials are cloned too so tint/opacity can be
 * mutated per-instance without bleeding into other ships.
 */
function cloneShipScene(source: THREE.Group): THREE.Group {
  const clone = source.clone(true);
  clone.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      if (Array.isArray(obj.material)) {
        obj.material = obj.material.map((m) => m.clone());
      } else if (obj.material) {
        obj.material = obj.material.clone();
      }
      // Keep the GLB's original look — emissive boost was removed because
      // it was bleaching the hull. Scene-level lights (setupLights) now
      // handle overall visibility.
      obj.castShadow = false;
      obj.receiveShadow = false;
      // Frustum culling is correct for GLB (has proper bounding sphere)
      obj.frustumCulled = true;
    }
  });
  // Wrap in a parent Group. The wrapper takes position/rotation from the
  // engine (ship.pos, aim-based rotation.y). An intermediate inner group
  // applies the one-time nose-orientation offset so the model's visible
  // nose matches the game's forward-axis convention.
  const inner = new THREE.Group();
  inner.rotation.y = SHIP_MODEL_NOSE_OFFSET;
  inner.add(clone);
  const wrapper = new THREE.Group();
  wrapper.add(inner);
  return wrapper;
}

// Power-up types (mirrors server arena-matchmaker for Phase 2 compat)
export type PowerUpType = 'WARP' | 'DAMAGE_UP' | 'SLOW_LASER' | 'SHIELD' | 'HEALTH';

export class ArenaEngine {
  private container: HTMLElement;
  private callbacks: ArenaCallbacks;

  // Three.js core
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private clock = new THREE.Clock();

  // rAF
  private rafId: number | null = null;
  private visible = false;

  // Arena objects
  private floorMesh!: THREE.Mesh;
  private boundaryMesh!: THREE.LineLoop;
  private starfield!: THREE.Points;
  // Point light that tracks the player — illuminates nearby ships that
  // the scene-wide directional lights might graze at a bad angle.
  private playerKeyLight!: THREE.PointLight;

  // Player ship
  private playerMesh!: THREE.Mesh;
  private playerGlowMesh!: THREE.Mesh; // additive disc under ship — orientation/status cue
  private crosshairMesh!: THREE.Mesh;  // ring marker at aim point (desktop only)
  private playerVelX = 0;
  private playerVelY = 0;  // vertical velocity (semi-sphere Y axis)
  private playerVelZ = 0;
  private playerPitch = 0; // visual nose tilt up/down (X-axis rotation, smoothed)
  private playerBankAngle = 0;
  // Barrel-roll evasive maneuver — 360° roll around the ship's forward axis.
  // Triggered by the "dodge" sector on the left stick or a desktop key.
  private barrelRollTimer = 0;         // seconds remaining in current roll
  private barrelRollCooldown = 0;      // seconds until next roll available
  private readonly BARREL_ROLL_DURATION = 0.6;
  private readonly BARREL_ROLL_COOLDOWN = 4;
  private playerNickSprite!: THREE.Sprite;
  private playerDead = false;
  private respawnTimer = 0;
  private readonly RESPAWN_TIME = 5;
  private shipId: string;
  private stats = {
    kills: 0,           // enemy ship kills (future PvP/PvE)
    asteroidKills: 0,   // asteroids destroyed
    deaths: 0,          // player deaths (not shield-saves)
    score: 0,           // +5 asteroid(laser), +10 asteroid(missile), +20 enemy, -10 death
  };

  // Black hole
  private blackHoleMesh: THREE.Group | null = null;
  private blackHolePos = { x: 0, z: 0 };
  private blackHoleActive = false;
  private blackHoleAge = 0;
  private blackHoleLifetime = 15;
  private blackHoleSpawnTimer = 60 + Math.random() * 60; // 60-120s first spawn
  private readonly BLACK_HOLE_PULL_RADIUS = 500;         // player field of effect (was 200)
  private readonly BLACK_HOLE_ASTEROID_RADIUS = 600;     // asteroid field (was 300)
  private readonly BLACK_HOLE_MAX_FORCE_PLAYER = 600;    // 1.5x SHIP_ACCELERATION
  private readonly BLACK_HOLE_MAX_FORCE_ASTEROID = 500;
  private readonly BLACK_HOLE_KILL_RADIUS = 30;          // player kill zone (was 15)
  private readonly BLACK_HOLE_KILL_RADIUS_ASTEROID = 35; // asteroid kill zone (was 20)

  // VFX pool (hit flashes, explosion flashes, debris)
  private vfxPool: {
    mesh: THREE.Mesh;
    age: number;
    life: number;
    type: 'hit' | 'flash' | 'debris';
    vel?: { x: number; z: number };
    rotSpeed?: { x: number; y: number; z: number };
    scaleSpeed?: number;
    shared?: boolean; // true = geo/mat are shared, skip dispose on cleanup
  }[] = [];

  // Shared resources for hit-effect (most frequent VFX — ~2-5/sec under fire).
  // Using shared geo+material removes 2 allocations per hit, which adds up on mobile.
  private hitGeoShared: THREE.PlaneGeometry | null = null;
  private hitMatShared: THREE.MeshBasicMaterial | null = null;

  // Engine exhaust particles (InstancedMesh pool)
  private exhaustMesh!: THREE.InstancedMesh;
  private exhaustParticles: { x: number; y: number; z: number; vx: number; vy: number; vz: number; age: number; active: boolean; scale: number }[] = [];
  private exhaustFreeList: number[] = []; // stack of free indices (O(1) spawn)
  private readonly EXHAUST_POOL = 60;
  private readonly EXHAUST_LIFETIME = 0.9; // longer trail for the blue streak behind the ship
  private exhaustSpawnTimer = 0;

  // Missiles (homing, limited turn rate, ammo-based)
  private missileMesh!: THREE.InstancedMesh;
  private missiles: { x: number; y: number; z: number; vx: number; vy: number; vz: number; age: number; active: boolean; angle: number; targetId: number | null }[] = [];
  // Missile trail — tiny additive spheres dropped behind each missile.
  // Single pooled InstancedMesh, sphere geo with 4 segments (cheap).
  private missileTrailMesh!: THREE.InstancedMesh;
  private missileTrails: { x: number; y: number; z: number; age: number; active: boolean }[] = [];
  private missileTrailFreeList: number[] = [];
  private readonly MISSILE_TRAIL_POOL = 80;
  private readonly MISSILE_TRAIL_LIFETIME = 0.5;
  private missileFreeList: number[] = [];
  private readonly MISSILE_POOL = 20;
  private readonly MISSILE_SPEED = 400;
  private readonly MISSILE_LIFETIME = 3;
  private readonly MISSILE_TURN_RATE = 2.5; // radians/sec
  private readonly MISSILE_RADIUS = 2;
  private readonly MISSILE_DAMAGE = 45;
  private readonly MISSILE_COOLDOWN = 0.5; // between individual shots
  private missileCooldownTimer = 0;
  private missileAmmo = 10;
  private readonly MISSILE_MAX_AMMO = 10;
  private readonly MISSILE_RELOAD_TIME = 60; // seconds to reload all 10
  private missileReloadTimer = 0;

  // Warp boost (1s forward burst, 2x speed, blur effect)
  private warpActive = false;
  private warpTimer = 0;
  private readonly WARP_DURATION = 1.0;
  private readonly WARP_SPEED_MULT = 2.0;
  private readonly WARP_COOLDOWN = 8;
  private warpCooldownTimer = 0;

  // Power-ups (collectable map orbs with 10s buffs)
  private powerUps: { id: number; type: PowerUpType; x: number; z: number; mesh: THREE.Mesh; pulsePhase: number }[] = [];
  private powerUpCounter = 0;
  private powerUpSpawnTimer = 5; // first spawn after 5s
  private readonly POWERUP_SPAWN_INTERVAL = 15;
  private readonly MAX_POWERUPS = 5;
  private readonly POWERUP_COLLECT_RADIUS = 30;
  private readonly POWERUP_BUFF_DURATION_MS = 10000; // 10s
  private readonly POWERUP_SHIELD_HP = 50;
  private readonly POWERUP_COLORS: Record<PowerUpType, number> = {
    WARP: 0x00eeff,
    DAMAGE_UP: 0xff4444,
    SLOW_LASER: 0x4488ff,
    SHIELD: 0xaaddff,
    HEALTH: 0x44ff44,
  };

  // Health pickups — green cross, +30 HP
  private healthPickups: { id: number; x: number; y: number; z: number; mesh: THREE.Group; respawnTimer: number; active: boolean }[] = [];
  private healthPickupCounter = 0;
  private readonly HEALTH_PICKUP_COUNT = 5;
  private readonly HEALTH_PICKUP_HEAL = 30;
  private readonly HEALTH_PICKUP_RESPAWN = 15; // seconds
  private readonly HEALTH_PICKUP_RADIUS = 25;

  // Active player buffs from collected power-ups
  private playerBuffs: { type: PowerUpType; expiresAt: number }[] = [];
  private playerSpeedMult = 1.0;
  private playerDamageMult = 1.0;
  private playerLaserColor: 'green' | 'red' | 'blue' = 'green';
  private playerExtraShield = 0; // absorbs one lethal hit while > 0
  private playerShieldMesh: THREE.Mesh | null = null;

  // Asteroids (3D position)
  private asteroidMesh!: THREE.InstancedMesh;
  private asteroidData: { x: number; y: number; z: number; vx: number; vy: number; vz: number; radius: number; rot: number; rotSpeed: number; hp: number; alive: boolean; respawnTimer: number }[] = [];

  // Bullets (asteroid fragments) — 3-pool InstancedMesh: small/medium/large
  private bulletMeshes: THREE.InstancedMesh[] = [];
  private bullets: { x: number; y: number; z: number; vx: number; vy: number; vz: number;
    age: number; active: boolean;
    meshIdx: number; instIdx: number; rotX: number; rotY: number; rotZ: number;
    rotSpX: number; rotSpY: number; rotSpZ: number }[] = [];
  private bulletFreeList: number[] = []; // O(1) free-index stack
  private readonly BULLET_POOL = 100;
  private readonly BULLET_SIZES = [2.5, 4.0, 6.0];
  private readonly BULLET_POOL_SIZES = [60, 30, 10]; // total = 100
  private readonly BULLET_SPEED = 800;
  private readonly BULLET_LIFETIME = 0.75;
  private readonly BULLET_RADIUS = 1.5;
  private readonly BULLET_DAMAGE = 15;
  private readonly FIRE_COOLDOWN = 0.25;
  private fireCooldownTimer = 0;
  private mouseDown = false;

  // Mouse aim — desktop 3D is pointer-lock-based (FPS-style yaw+pitch).
  // The old XZ-plane raycaster is kept as a fallback for when pointer lock
  // is unavailable or declined.
  private raycaster = new THREE.Raycaster();
  private aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private mouseNDC = new THREE.Vector2();
  private aimPoint = new THREE.Vector3(0, 0, 100);
  private _mouseHit = new THREE.Vector3();
  private playerAimAngle = 0;
  private pointerLocked = false;
  private mouseMoveX = 0; // pixels accumulated since last updateAim
  private mouseMoveY = 0;
  private readonly MOUSE_SENS = 0.0022; // radians per pixel
  private readonly MAX_PITCH = Math.PI / 2.2; // clamp so we don't flip upside down

  // Collision temp
  private readonly ASTEROID_HP_MAX = 5;

  // Mobile joystick input
  private mobileMove = { x: 0, z: 0 };
  private mobileAim = { x: 0, z: 0 };
  // Vertical thrust from mobile (set by ArenaLandscapeControls in Phase 5).
  // Range -1..+1; positive climbs.
  private mobileVerticalThrust = 0;
  // Pitch rate from mobile right-stick Y (Phase 5). Range -1..+1.
  private mobilePitchRate = 0;
  private mobileFiring = false;
  private isMobile = false;

  // Game state
  private phase: MatchPhase = 'waiting';
  private matchTimer = 0;
  private countdownTimer = 0;
  private prevCountdownCeil = 0;

  // Invulnerability after respawn (timestamp ms, performance.now())
  private invulnerableUntil = 0;

  // Player ship position for camera follow
  private playerPos = new THREE.Vector3(0, ARENA_GROUND_Y, 0);

  // Input (set by ArenaControls)
  private input: InputState = { moveDir: { x: 0, y: 0, z: 0 }, aimDir: { x: 0, y: 0, z: 1 }, firing: false, dash: false };

  // Zoom — multiplier on CAMERA_HEIGHT/DISTANCE. Smaller = closer camera.
  // Default 1.0 paired with lowered HEIGHT/DISTANCE constants for a close view.
  private zoomLevel = 1.0;
  private readonly ZOOM_MIN = 0.4;
  private readonly ZOOM_MAX = 2.0;
  private readonly ZOOM_SPEED = 0.1;
  private cameraBreath = 1.0; // smoothed 1.0..1.25 based on speed
  // Smoothed aim direction used only by the camera (lead/target).
  // aimDirX/Z snap instantly to joystick input — using them raw for camera lead
  // made the view jump sideways whenever aim changed. Smoothing keeps the
  // camera motion gentle without affecting gameplay aim.
  private camAimX = 0;
  private camAimZ = -1;
  // Smoothed lookAt (independent lerp from position — faster so aim stays centered)
  private camLookX = 0;
  private camLookY = 0;
  private camLookZ = 0;
  // Smoothed camera aim Y component (pitch) — separate from camAimX/Z
  private camAimY = 0;
  // Bank-roll state — camera tilts around its forward axis into yaw turns.
  private _lastCamYaw = 0;
  private cameraBankAngle = 0;
  // Ship roll (bank) around the aim direction — aircraft-style. Right stick
  // X sets a target; roll then induces a natural yaw rate (coordinated turn)
  // so banking right arcs the ship to the right.
  private shipRoll = 0;
  // Camera shake (screen kick on explosions)
  private shakeAmount = 0;   // current intensity (units)
  private shakeDecay = 6;    // per second exponential decay

  // Keyboard state
  private keys = new Set<string>();
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;

  // Bound handlers (for cleanup)
  private onResizeBound: () => void;
  private onWheelBound: (e: WheelEvent) => void;
  private onMouseMoveBound: (e: MouseEvent) => void;
  private onMouseDownBound: (e: MouseEvent) => void;
  private onMouseUpBound: (e: MouseEvent) => void;

  // Track all disposables for cleanup
  private disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];

  // ── Team mode ─────────────────────────────────────────────────────────
  private teamMode: boolean;
  private playerTeam: Team = 'blue';
  private teamKills = { blue: 0, red: 0 };
  private readonly TEAM_KILL_LIMIT = TEAM_KILL_LIMIT;

  // Bot ships
  private botShips: BotShip[] = [];

  // Bot bullets (separate pool)
  private botBulletMesh!: THREE.InstancedMesh;
  private botBullets: BotBullet[] = [];
  private botBulletFreeList: number[] = [];
  private readonly BOT_BULLET_POOL = BOT_BULLET_POOL;
  private readonly BOT_BULLET_SPEED = 700;
  private readonly BOT_BULLET_LIFETIME = 0.8;
  private readonly BOT_BULLET_RADIUS = 1.5;
  private readonly BOT_BULLET_DAMAGE = 12;

  // Player HP for team mode
  private playerHp = 100;
  private readonly PLAYER_MAX_HP = 100;

  // Kill feed (last 5 kills)
  private killFeed: { killer: string; victim: string; time: number }[] = [];

  // ── Lock-on targeting ──────────────────────────────────────────────────
  private lockTarget: number | null = null;  // bot id being locked
  private lockTimer = 0;
  private lockLocked = false;  // true when fully locked (3s elapsed)
  private readonly LOCK_TIME = 2.0;      // seconds to acquire lock
  private readonly LOCK_RANGE = 1000;    // units — matches missile flight range (speed×lifetime = 400×3 = 1200)
  private readonly LOCK_CONE = 25;       // degrees half-angle from aim direction

  constructor(container: HTMLElement, callbacks: ArenaCallbacks, shipId: string = 'ship1', teamMode: boolean = false) {
    this.container = container;
    this.callbacks = callbacks;
    this.shipId = shipId;
    this.teamMode = teamMode;
    this.onResizeBound = this.onResize.bind(this);
    this.onWheelBound = this.onWheel.bind(this);
    this.onKeyDownBound = (e: KeyboardEvent) => this.keys.add(e.key.toLowerCase());
    this.onKeyUpBound = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());
    this.onMouseMoveBound = this.onMouseMove.bind(this);
    this.onMouseDownBound = () => {
      this.mouseDown = true;
      // Lock pointer on first click so desktop 3D aim (yaw+pitch) works.
      // Already-locked clicks just fire. Mobile or fallback: ignore.
      if (!this.pointerLocked && !this.isMobile) {
        this.renderer.domElement.requestPointerLock?.();
      }
    };
    this.onMouseUpBound = () => { this.mouseDown = false; };
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  async init(): Promise<void> {
    // Preload GLB ship models before setting up any ship entity.
    // Failures fall back to the sprite path inside setupPlayerShip.
    await preloadShipModels();

    this.setupRenderer();
    this.setupScene();
    this.setupCamera();
    // Floor grid removed — incompatible with TPS chase-cam angle (user sees
    // the floor at an oblique angle and it reads as static "ice", hurting
    // speed perception). Starfield alone gives better motion cues.
    // this.setupFloor();
    this.setupBoundary();
    this.setupStarfield();
    this.setupLights();
    this.setupPlayerShip();
    this.setupAsteroids();
    this.setupBullets();
    this.setupExhaust();
    this.setupMissiles();
    this.setupMissileTrail();
    this.setupHoloShield();
    // Bots: team mode (4 blue + 5 red) or training FFA (6 neutral)
    this.setupBotBullets();
    this.setupBotShips();
    this.setupHealthPickups();

    window.addEventListener('resize', this.onResizeBound);
    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    this.renderer.domElement.addEventListener('wheel', this.onWheelBound, { passive: false });
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMoveBound);
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDownBound);
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUpBound);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);

    this.visible = true;
    this.clock.start();
    this.animate();
  }

  destroy(): void {
    this.visible = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    window.removeEventListener('resize', this.onResizeBound);
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    this.renderer?.domElement?.removeEventListener('wheel', this.onWheelBound);
    this.renderer?.domElement?.removeEventListener('mousemove', this.onMouseMoveBound);
    this.renderer?.domElement?.removeEventListener('mousedown', this.onMouseDownBound);
    this.renderer?.domElement?.removeEventListener('mouseup', this.onMouseUpBound);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    if (document.pointerLockElement === this.renderer?.domElement) {
      document.exitPointerLock?.();
    }

    // Dispose all tracked geometry/material/textures
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables.length = 0;

    // Dispose scene children recursively
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh || obj instanceof THREE.Points) {
        if (obj.geometry) obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else if (obj.material) {
          obj.material.dispose();
        }
      }
    });

    // Release WebGL context
    this.renderer.forceContextLoss();
    this.renderer.dispose();

    // Remove canvas from DOM
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }

    // Stop all audio loops
    stopAllLoops();
  }

  setVisible(vis: boolean): void {
    this.visible = vis;
    if (vis) {
      this.clock.start();
      this.animate();
    } else {
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }
  }

  // ── Input API ──────────────────────────────────────────────────────────

  setInput(input: InputState): void {
    this.input = input;
  }

  setMobileMove(x: number, y: number): void {
    this.mobileMove = { x, z: y };
  }

  setMobileAim(x: number, y: number, firing: boolean): void {
    // Right stick is now rate-based:
    //   X  → yaw rate  (left = turn left, right = turn right)
    //   Y  → pitch rate (up on screen = nose up; stick up usually maps to
    //         joystick y < 0, so we invert sign in updateAim).
    // Firing triggered while the stick is touched.
    this.mobileAim = { x, z: y };
    this.mobilePitchRate = y; // stored raw; updateAim decides sign
    this.mobileFiring = firing;
  }

  /** Reserved for future use (e.g. a separate climb/dive button). Not wired
   *  in the default HUD anymore — pitch comes from the right stick Y. */
  setMobileVertical(v: number): void {
    this.mobileVerticalThrust = Math.max(-1, Math.min(1, v));
  }

  /** Left-stick sector dispatch. Called every frame the stick is held.
   *  Triggers continuous (laser) and rate-limited (missile) weapons. */
  private _mobileSector: 'center' | 'laser' | 'missile' | 'warp' | 'dodge' = 'center';
  private _missileSectorTimer = 0;
  setMobileSector(sector: 'center' | 'laser' | 'missile' | 'warp' | 'dodge'): void {
    const prev = this._mobileSector;
    this._mobileSector = sector;
    // Laser fire: continuous while in the laser sector.
    this.mobileFiring = sector === 'laser';
    // Missile: edge-trigger on enter + repeat every 2s while held.
    if (sector === 'missile') {
      if (prev !== 'missile' || this._missileSectorTimer <= 0) {
        this.fireMissile();
        this._missileSectorTimer = 2;
      }
    } else if (prev === 'missile') {
      this._missileSectorTimer = 0;
    }
    // Warp: edge-trigger on enter only.
    if (sector === 'warp' && prev !== 'warp') this.triggerDash();
    // Dodge: edge-trigger on enter only.
    if (sector === 'dodge' && prev !== 'dodge') this.triggerBarrelRoll();
  }

  triggerDash(): void {
    if (this.playerDead) return;
    if (this.warpCooldownTimer > 0 || this.warpActive) return;
    this.warpActive = true;
    playSfx('arena-warp', 0.15);
    this.warpTimer = this.WARP_DURATION;
    this.warpCooldownTimer = this.WARP_COOLDOWN;
  }

  /**
   * Barrel roll — 360° roll around the ship's forward axis. Gives a brief
   * invulnerability window to dodge an incoming missile. Not a warp: the
   * ship keeps its current velocity, it just spins visually.
   */
  triggerBarrelRoll(): void {
    if (this.playerDead) return;
    if (this.barrelRollCooldown > 0 || this.barrelRollTimer > 0) return;
    this.barrelRollTimer = this.BARREL_ROLL_DURATION;
    this.barrelRollCooldown = this.BARREL_ROLL_COOLDOWN;
    // Brief invulnerability during the roll.
    this.invulnerableUntil = Math.max(
      this.invulnerableUntil,
      performance.now() + this.BARREL_ROLL_DURATION * 1000,
    );
    playSfx('arena-warp', 0.1);
  }

  /** Gravity push — shove nearest asteroid in front of ship at 2x ship speed */
  triggerGravPush(): void {
    if (this.playerDead) return;
    const pushRange = SHIP_RADIUS * 10; // doubled from 5 per player request
    let bestIdx = -1;
    let bestDist = pushRange;

    for (let i = 0; i < this.asteroidData.length; i++) {
      const a = this.asteroidData[i];
      if (!a.alive) continue;
      const dx = a.x - this.playerPos.x;
      const dz = a.z - this.playerPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist >= bestDist) continue;

      // Check if asteroid is in front of ship (dot product with aim direction)
      const dot = dx * this.aimDirX + dz * this.aimDirZ;
      if (dot > 0) { // in front
        bestDist = dist;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      const a = this.asteroidData[bestIdx];
      const speed = Math.sqrt(this.playerVelX ** 2 + this.playerVelZ ** 2);
      const pushSpeed = Math.max(speed * 2, SHIP_MAX_SPEED * 1.5);
      a.vx = this.aimDirX * pushSpeed;
      a.vz = this.aimDirZ * pushSpeed;
      playSfx('arena-grav', 0.35);
    }
  }

  setIsMobile(mobile: boolean): void {
    this.isMobile = mobile;
  }

  // ── Match control ──────────────────────────────────────────────────────

  startMatch(): void {
    this.phase = 'countdown';
    this.countdownTimer = COUNTDOWN_SECONDS;
    this.matchTimer = MATCH_DURATION;
  }

  // ── Setup ──────────────────────────────────────────────────────────────

  private setupRenderer(): void {
    const W = this.container.clientWidth;
    const H = this.container.clientHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.setSize(W, H);
    this.renderer.setClearColor(0x020510); // deep space
    this.container.appendChild(this.renderer.domElement);

    // Style canvas
    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.touchAction = 'none';
  }

  private setupScene(): void {
    this.scene = new THREE.Scene();
    // No fog — stars must be visible at far distances
  }

  private setupCamera(): void {
    const W = this.container.clientWidth;
    const H = this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, W / H, 1, 15000);
    this.camera.position.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
    this.camera.lookAt(0, 0, 0);
  }

  private setupFloor(): void {
    // Holographic grid — only lines, fully transparent background
    // Stars shine through from below
    const gridSize = 512;
    const canvas = document.createElement('canvas');
    canvas.width = gridSize;
    canvas.height = gridSize;
    const ctx = canvas.getContext('2d')!;

    // Fully transparent background — stars visible through floor
    ctx.clearRect(0, 0, gridSize, gridSize);

    // Neon grid lines only
    ctx.strokeStyle = 'rgba(68, 136, 170, 0.2)';
    ctx.lineWidth = 1;
    const cellSize = gridSize / 8;
    for (let i = 0; i <= 8; i++) {
      const p = i * cellSize;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, gridSize); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(gridSize, p); ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(20, 20);
    this.disposables.push(texture);

    const geo = new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false, // don't block stars behind
    });
    this.disposables.push(geo, mat);

    this.floorMesh = new THREE.Mesh(geo, mat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.y = 0;
    this.scene.add(this.floorMesh);
  }

  private setupBoundary(): void {
    // Wireframe cylinder cage around the arena. Thin lines so it reads as
    // "there is a wall here" without drawing the eye. 16 vertical ribs +
    // 7 horizontal rings spanning ±ARENA_HEIGHT_HALF.
    const segments = 32;
    const yRings = 7;
    const positions: number[] = [];

    // Horizontal rings at evenly spaced Y levels
    for (let r = 0; r < yRings; r++) {
      const y = -ARENA_HEIGHT_HALF + (r / (yRings - 1)) * ARENA_HEIGHT_HALF * 2;
      for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2;
        const a2 = ((i + 1) / segments) * Math.PI * 2;
        positions.push(
          Math.cos(a1) * ARENA_HALF, y, Math.sin(a1) * ARENA_HALF,
          Math.cos(a2) * ARENA_HALF, y, Math.sin(a2) * ARENA_HALF,
        );
      }
    }
    // Vertical ribs every 22.5°
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const x = Math.cos(a) * ARENA_HALF;
      const z = Math.sin(a) * ARENA_HALF;
      positions.push(
        x, -ARENA_HEIGHT_HALF, z,
        x,  ARENA_HEIGHT_HALF, z,
      );
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x446688,
      transparent: true,
      opacity: 0.18,
    });
    this.disposables.push(geo, mat);
    this.boundaryMesh = new THREE.LineSegments(geo, mat) as unknown as THREE.LineLoop;
    this.scene.add(this.boundaryMesh);
  }

  private setupStarfield(): void {
    const count = STARFIELD_COUNT * 3; // dense starfield
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 3000 + Math.random() * 8000;
      positions[i3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.cos(phi); // full sphere — stars above AND below floor
      positions[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      // Color variation: cool whites, warm yellows, blue tints
      const t = Math.random();
      if (t < 0.3) {
        // Blue-white
        colors[i3] = 0.7; colors[i3+1] = 0.8; colors[i3+2] = 1.0;
      } else if (t < 0.6) {
        // Warm yellow
        colors[i3] = 1.0; colors[i3+1] = 0.9; colors[i3+2] = 0.7;
      } else {
        // Pure white
        colors[i3] = 0.9; colors[i3+1] = 0.9; colors[i3+2] = 0.95;
      }

      // Random brightness via size
      sizes[i] = 1 + Math.random() * 4;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const mat = new THREE.PointsMaterial({
      size: 3,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });
    this.disposables.push(geo, mat);

    this.starfield = new THREE.Points(geo, mat);
    this.scene.add(this.starfield);
  }

  private setupLights(): void {
    // Lighting rig: one strong warm ambient + three directionals at high
    // intensity from multiple angles. No emissive boost on the ship hulls
    // — this rig alone has to make the GLBs readable against deep space.
    const ambient = new THREE.AmbientLight(0x99aabb, 3.2);
    this.scene.add(ambient);

    // Key light — warm, from above-front-right (the "sun").
    const key = new THREE.DirectionalLight(0xffffee, 3.2);
    key.position.set(200, 500, 300);
    key.castShadow = false;
    this.scene.add(key);

    // Cool fill from opposite side so the shadow face isn't pitch black.
    const fill = new THREE.DirectionalLight(0x88aadd, 1.6);
    fill.position.set(-200, 300, -200);
    fill.castShadow = false;
    this.scene.add(fill);

    // Low rim light from below — picks out the underside/wings of ships
    // flying above the horizon line.
    const rim = new THREE.DirectionalLight(0xffeecc, 1.0);
    rim.position.set(0, -300, 0);
    rim.castShadow = false;
    this.scene.add(rim);

    // Point light that follows the player so nearby ships read crisply
    // even when the directional key misses them. Cheap — one vertex
    // light only affects PBR materials, which GLB ships use.
    this.playerKeyLight = new THREE.PointLight(0xffffff, 1.6, 300, 1.4);
    this.playerKeyLight.castShadow = false;
    this.scene.add(this.playerKeyLight);
  }

  private setupPlayerShip(): void {
    // Player always gets the blue GLB in TPS mode. Falls back to the old
    // sprite path if the GLB failed to load (network / asset missing).
    if (_cachedBlueShip) {
      const group = cloneShipScene(_cachedBlueShip);
      // Add to scene as a Mesh-like object. ArenaEngine touches
      // playerMesh.position/rotation/visible/material — all work on Groups
      // except .material. We expose a small mesh-like shim below.
      this.playerMesh = group as unknown as THREE.Mesh;
      group.position.set(0, 5, 0);
      this.scene.add(group);
    } else {
      // Sprite fallback (legacy)
      const loader = new THREE.TextureLoader();
      const shipFile = SHIP_FILES[this.shipId] ?? SHIP_FILES.ship1;
      const texture = loader.load(shipFile);
      texture.colorSpace = THREE.SRGBColorSpace;
      this.disposables.push(texture);

      const size = SHIP_RADIUS * 5;
      const geo = new THREE.PlaneGeometry(size, size);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
      });
      this.disposables.push(geo, mat);

      this.playerMesh = new THREE.Mesh(geo, mat);
      this.playerMesh.position.set(0, 5, 0);
      this.scene.add(this.playerMesh);
    }

    // Glow disc removed — served the top-down view to highlight ship position
    // over the floor grid. In TPS with the grid gone, the disc looked like a
    // floating puddle under the ship. The HUD crosshair already tells the
    // player where the ship is.

    // Crosshair ring at aim point — desktop only (mobile uses auto-aim).
    const crossGeo = new THREE.RingGeometry(6, 8, 24);
    crossGeo.rotateX(-Math.PI / 2);
    const crossMat = new THREE.MeshBasicMaterial({
      color: 0x44ffaa,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.disposables.push(crossGeo, crossMat);
    this.crosshairMesh = new THREE.Mesh(crossGeo, crossMat);
    this.crosshairMesh.position.set(0, 3, 0);
    this.crosshairMesh.visible = false; // toggled in updateAim based on isMobile
    this.scene.add(this.crosshairMesh);

    // Player nickname removed — HP bar lives in the HUD (SpaceArena.tsx).
    // Kept the sprite reference as a hidden dummy so the rest of the engine
    // (visibility toggles on death/respawn) keeps compiling.
    const _dummyMat = new THREE.SpriteMaterial({ transparent: true, opacity: 0 });
    this.disposables.push(_dummyMat);
    this.playerNickSprite = new THREE.Sprite(_dummyMat);
    this.playerNickSprite.visible = false;
    this.scene.add(this.playerNickSprite);
  }

  private setupAsteroids(): void {
    // InstancedMesh — 1 draw call for all asteroids
    // Training mode uses fewer asteroids (ambiance only)
    const asteroidCount = this.teamMode ? ASTEROID_COUNT : TRAINING_ASTEROID_COUNT;
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.8, metalness: 0.2 });
    this.disposables.push(geo, mat);

    this.asteroidMesh = new THREE.InstancedMesh(geo, mat, asteroidCount);
    this.asteroidMesh.castShadow = false;
    this.asteroidMesh.receiveShadow = false;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < asteroidCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 100 + Math.random() * (ARENA_HALF - 150);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      // Scatter through the 3D semi-sphere, biased toward the middle so
      // there's always action at player eye level while the ceiling/floor
      // feel navigable but sparser.
      const yNorm = (Math.random() * 2 - 1); // -1..+1
      const y = yNorm * (ARENA_HEIGHT_HALF - 60) * 0.85;
      const radius = ASTEROID_MIN_RADIUS + Math.random() * (ASTEROID_MAX_RADIUS - ASTEROID_MIN_RADIUS);
      const vAngle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 10;

      this.asteroidData.push({
        x, y, z,
        vx: Math.cos(vAngle) * speed,
        vy: (Math.random() - 0.5) * 4, // gentle vertical drift
        vz: Math.sin(vAngle) * speed,
        radius,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 2,
        hp: this.ASTEROID_HP_MAX,
        alive: true,
        respawnTimer: 0,
      });

      dummy.position.set(x, y, z);
      dummy.scale.set(radius, radius, radius);
      dummy.rotation.set(Math.random(), Math.random(), Math.random());
      dummy.updateMatrix();
      this.asteroidMesh.setMatrixAt(i, dummy.matrix);
    }
    this.asteroidMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.asteroidMesh);
  }

  private setupBullets(): void {
    // Laser beams — thin cylinder 12 units long oriented along +Y (baked).
    // InstancedMesh carries a single geometry; per-bullet orientation is
    // written via setMatrixAt each frame (see updateBullets).
    // Bullets are additive-blended and emissive-bright (no lighting).
    const geo = new THREE.CylinderGeometry(0.5, 0.5, 12, 6);
    // Rotate so the cylinder extends along +Z (forward); then per-frame we
    // orient via rotation.y. After this bake, local +Z = beam length.
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x88ff88,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.disposables.push(geo, mat);

    const totalPool = this.BULLET_POOL; // 100
    const mesh = new THREE.InstancedMesh(geo, mat, totalPool);
    mesh.frustumCulled = false;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < totalPool; i++) {
      dummy.position.set(0, -1000, 0);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      this.bullets.push({
        x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, active: false,
        meshIdx: 0, instIdx: i,
        rotX: 0, rotY: 0, rotZ: 0,
        rotSpX: 0, rotSpY: 0, rotSpZ: 0,
      });
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.scene.add(mesh);
    // Single pool now; bulletMeshes[0] is the laser mesh.
    this.bulletMeshes.push(mesh);

    for (let i = this.bullets.length - 1; i >= 0; i--) this.bulletFreeList.push(i);
  }


  private onMouseMove(e: MouseEvent): void {
    if (this.pointerLocked) {
      // Pointer-lock mode: accumulate raw movement deltas for updateAim.
      this.mouseMoveX += e.movementX;
      this.mouseMoveY += e.movementY;
      return;
    }
    // Fallback: XZ-plane raycaster (used before the user clicks to lock).
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    if (this.raycaster.ray.intersectPlane(this.aimPlane, this._mouseHit)) {
      this.aimPoint.copy(this._mouseHit);
    }
  }

  private onPointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
  };

  // ── Resize handler ─────────────────────────────────────────────────────

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? this.ZOOM_SPEED : -this.ZOOM_SPEED;
    this.zoomLevel = Math.max(this.ZOOM_MIN, Math.min(this.ZOOM_MAX, this.zoomLevel + delta));
  }

  private onResize(): void {
    const W = this.container.clientWidth;
    const H = this.container.clientHeight;
    this.camera.aspect = W / H;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(W, H);
  }

  // ── Main loop ──────────────────────────────────────────────────────────

  private animate = (): void => {
    if (!this.visible) return;
    this.rafId = requestAnimationFrame(this.animate);

    // Delta time capped to prevent physics explosion after tab switch
    const dt = Math.min(this.clock.getDelta(), 0.1);

    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private update(dt: number): void {
    // Match state machine
    switch (this.phase) {
      case 'countdown':
        this.countdownTimer -= dt;
        if (this.countdownTimer <= 0) {
          this.phase = 'playing';
          playSfx('arena-start', 0.06);
          playLoop('fly', 0.0); // starts silent, volume tied to speed in updatePlayer
        } else {
          const ceil = Math.ceil(this.countdownTimer);
          if (ceil !== this.prevCountdownCeil) {
            this.prevCountdownCeil = ceil;
            playSfx('arena-countdown', 0.06);
          }
        }
        break;
      case 'playing':
        // Match timer counts down; HUD reads it via getMatchTimer().
        // When it hits 0 we also check the kill leader for end conditions.
        if (this.matchTimer > 0) {
          this.matchTimer = Math.max(0, this.matchTimer - dt);
        }
        this.updateDeathRespawn(dt);
        this.updateWarp(dt);
        if (!this.playerDead) {
          this.updatePlayer(dt);
          this.updateAim(dt);
          this.updateLockOn(dt);
          this.updateShooting(dt);
          this.updateExhaust(dt);
          this.checkPlayerAsteroidCollisions();
        }
        this.updateBullets(dt);
        this.updateMissiles(dt);
        this.updateMissileTrail(dt);
        this.updateAsteroids(dt);
        this.updateBlackHole(dt);
        this.updateVFX(dt);
        this.updatePowerUps(dt);
        this.updateHealthPickups(dt);
        this.checkBulletAsteroidCollisions();
        this.checkMissileAsteroidCollisions();
        this.checkMissileBotCollisions();
        // Bots (team mode AND training FFA)
        this.updateBotShips(dt);
        this.updateBotBullets(dt);
        this.checkBotBulletShipCollisions();
        this.checkPlayerBulletBotCollisions();
        this.checkPlayerBotPhysicalCollisions();
        this.checkBotBotPhysicalCollisions();
        // Training (3v3) also uses team kill-limit + timer win conditions.
        this.checkTeamMatchEnd();
        break;
      default:
        break;
    }

    // TPS chase camera.
    //
    //   camPos   = ship - aimDir * BEHIND + UP * UP_OFF
    //   lookAt   = ship + aimDir * LEAD   + UP * LOOK_UP
    //
    // Smoothing: position lerps slower than lookAt so the crosshair stays
    // centered even when the camera is still catching up behind the ship.
    // Warp widens FOV + pushes camera farther back for speed-sense.
    const speed = Math.sqrt(this.playerVelX * this.playerVelX + this.playerVelZ * this.playerVelZ);
    const maxSpd = SHIP_MAX_SPEED * this.playerSpeedMult * (this.warpActive ? this.WARP_SPEED_MULT : 1);
    const speedRatio = Math.min(1, speed / (maxSpd > 0 ? maxSpd : SHIP_MAX_SPEED));

    // RIGID chase cam — camera copies the aim vector exactly (no lerp) so
    // the view never lags behind the ship's nose. Bank roll is computed
    // from yaw change rate so the camera rolls into turns.
    this.camAimX = this.aimDirX;
    this.camAimY = this.aimDirY;
    this.camAimZ = this.aimDirZ;

    // Warp effect — slide back + widen FOV.
    // Plus a gentle "breathe": camera sits at rest distance when ship is
    // idle and pulls back proportional to speed so acceleration reads as
    // the world receding, not just the starfield streaking.
    const warpFactor = this.warpActive ? 1.0 : 0;
    const speedBreathe = Math.min(1, speedRatio * 1.2);
    const behindDist = CAMERA_BEHIND - 5 + speedBreathe * 15 + warpFactor * 10;
    const upDist = CAMERA_UP + speedBreathe * 2 + warpFactor * 2;
    const targetFov = CAMERA_FOV + speedBreathe * 4 + warpFactor * 10;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 4);
      this.camera.updateProjectionMatrix();
    }

    // ── Ship-local up (rolled with shipRoll) ────────────────────────────
    // The camera rides behind the ship along its FORWARD axis and above
    // along its LOCAL up, so diving (aim.y < 0) slides the camera BEHIND
    // the tail instead of over the top of the plane. Local up rotates with
    // shipRoll so the horizon banks into turns.
    const fwdX = this.camAimX, fwdY = this.camAimY, fwdZ = this.camAimZ;
    // Horizontal "right" (perpendicular to aim projected into XZ)
    const hx = -fwdZ, hz = fwdX;
    const hlen = Math.sqrt(hx * hx + hz * hz);
    let rightX: number, rightY: number, rightZ: number;
    if (hlen > 0.01) {
      rightX = hx / hlen; rightY = 0; rightZ = hz / hlen;
    } else {
      // Aim is (nearly) vertical — fall back to world +X as right
      rightX = 1; rightY = 0; rightZ = 0;
    }
    // up = right × forward  (gives conventional "above the plane" vector)
    let upX = rightY * fwdZ - rightZ * fwdY;
    let upY = rightZ * fwdX - rightX * fwdZ;
    let upZ = rightX * fwdY - rightY * fwdX;
    const ulen = Math.sqrt(upX * upX + upY * upY + upZ * upZ) || 1;
    upX /= ulen; upY /= ulen; upZ /= ulen;

    // Rodrigues rotation of `up` around `fwd` by shipRoll. Since up⊥fwd,
    // the formula collapses to: up' = up·cos(r) + (fwd × up)·sin(r).
    // fwd × up = -right (by basis orientation), so:
    //   up' = up·cos(r) − right·sin(r)
    const cr = Math.cos(this.shipRoll);
    const sr = Math.sin(this.shipRoll);
    const localUpX = upX * cr - rightX * sr;
    const localUpY = upY * cr - rightY * sr;
    const localUpZ = upZ * cr - rightZ * sr;

    // Position: ship + back*behind + localUp*upDist (both in ship frame)
    this.camera.position.set(
      this.playerPos.x - fwdX * behindDist + localUpX * upDist,
      this.playerPos.y - fwdY * behindDist + localUpY * upDist,
      this.playerPos.z - fwdZ * behindDist + localUpZ * upDist,
    );

    _camTarget.set(
      this.playerPos.x + fwdX * CAMERA_LOOK_LEAD + localUpX * CAMERA_LOOK_UP,
      this.playerPos.y + fwdY * CAMERA_LOOK_LEAD + localUpY * CAMERA_LOOK_UP,
      this.playerPos.z + fwdZ * CAMERA_LOOK_LEAD + localUpZ * CAMERA_LOOK_UP,
    );
    this.camLookX = _camTarget.x;
    this.camLookY = _camTarget.y;
    this.camLookZ = _camTarget.z;

    // Shake before lookAt so shake can't fight the rigid position.
    if (this.shakeAmount > 0.01) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeAmount;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeAmount * 0.5;
      this.camera.position.z += (Math.random() - 0.5) * this.shakeAmount;
      this.shakeAmount *= Math.max(0, 1 - this.shakeDecay * dt);
    }

    // Feed the ship's local up into the view matrix so the horizon rolls
    // with the ship. This replaces the old rotateZ bank hack.
    this.camera.up.set(localUpX, localUpY, localUpZ);
    this.camera.lookAt(this.camLookX, this.camLookY, this.camLookZ);
  }

  // ── Player movement (WASD) ──────────────────────────────────────────────

  private updatePlayer(dt: number): void {
    // Input: WASD (desktop) or mobile joystick
    let ax = 0, az = 0;
    if (this.isMobile) {
      // Two movement modes depending on right-joystick state:
      //
      // 1. Right joystick IDLE → nose-follow: left joystick moves the ship
      //    in WORLD space (push left → fly left), ship's nose turns to match.
      //    This is the natural twin-stick default.
      //
      //   Left stick = pure forward thrust along the ship's current aim.
      //   Y component of the stick (mobileMove.z < 0 when pushed forward) is
      //   the magnitude; the direction is always "ship nose forward". This
      //   replaces the old world-space strafe that sent the ship off-axis
      //   whenever aim was not (0, 0, -1) in world space.
      const jz = this.mobileMove.z;
      const thrust = -jz; // stick forward = jz<0 → thrust>0
      if (Math.abs(thrust) > 0.01) {
        ax = this.aimDirX * thrust;
        az = this.aimDirZ * thrust;
        // Vertical component too so diving ship accelerates down along aim.
      }
    } else {
      if (this.keys.has('w') || this.keys.has('arrowup'))    az -= 1;
      if (this.keys.has('s') || this.keys.has('arrowdown'))  az += 1;
      if (this.keys.has('a') || this.keys.has('arrowleft'))  ax -= 1;
      if (this.keys.has('d') || this.keys.has('arrowright')) ax += 1;
    }

    // Vertical thrust.
    //   Desktop: Space = climb, Ctrl/Shift = dive (world-Y).
    //   Mobile:  Y component of aim applied to the same thrust as XZ, so if
    //            the nose is pointed down the ship accelerates downward.
    let ay = 0;
    if (!this.isMobile) {
      if (this.keys.has(' ')) ay += 1;
      if (this.keys.has('control') || this.keys.has('shift')) ay -= 1;
    } else {
      const jz = this.mobileMove.z;
      const thrust = -jz;
      if (Math.abs(thrust) > 0.01) {
        ay = this.aimDirY * thrust;
      }
    }

    // Normalize diagonal only for desktop (WASD) — mobile ax/az are already
    // scaled by aim-direction × thrust, which is the intended magnitude.
    if (!this.isMobile) {
      const len = Math.sqrt(ax * ax + az * az);
      if (len > 0) { ax /= len; az /= len; }
    }

    // Sync-boost: when player pushes both joysticks in roughly the same
    // direction (dot > 0.8 ≈ within ~37°), grant +30% acceleration and top
    // speed — rewards committed forward runs while firing.
    let syncBoost = 1.0;
    if (this.isMobile) {
      const aimLen = Math.sqrt(this.mobileAim.x ** 2 + this.mobileAim.z ** 2);
      const movLen = Math.sqrt(this.mobileMove.x ** 2 + this.mobileMove.z ** 2);
      if (aimLen > 0.1 && movLen > 0.1) {
        const dot = (this.mobileAim.x * this.mobileMove.x + this.mobileAim.z * this.mobileMove.z) /
                    (aimLen * movLen);
        if (dot > 0.8) syncBoost = 1.3;
      }
    }

    // Accelerate (power-up speed multiplier applies to acceleration too)
    this.playerVelX += ax * SHIP_ACCELERATION * this.playerSpeedMult * syncBoost * dt;
    this.playerVelZ += az * SHIP_ACCELERATION * this.playerSpeedMult * syncBoost * dt;
    // Vertical — 60% of horizontal accel so climb/dive feel slower than strafe
    this.playerVelY += ay * SHIP_ACCELERATION * 0.6 * this.playerSpeedMult * syncBoost * dt;

    // Drag (applied to all three axes)
    this.playerVelX *= SHIP_DRAG;
    this.playerVelY *= SHIP_DRAG;
    this.playerVelZ *= SHIP_DRAG;

    // Warp: override velocity to full aim direction at 2x speed (3D now)
    if (this.warpActive) {
      const warpSpeed = SHIP_MAX_SPEED * this.WARP_SPEED_MULT * this.playerSpeedMult;
      this.playerVelX = this.aimDirX * warpSpeed;
      this.playerVelY = this.aimDirY * warpSpeed;
      this.playerVelZ = this.aimDirZ * warpSpeed;
    }

    // Clamp horizontal speed (XZ only — vertical clamped separately with a
    // lower cap so the ship can't instantly shoot up or down).
    const maxSpd = this.warpActive
      ? SHIP_MAX_SPEED * this.WARP_SPEED_MULT * this.playerSpeedMult
      : SHIP_MAX_SPEED * this.playerSpeedMult;
    const speed = Math.sqrt(this.playerVelX ** 2 + this.playerVelZ ** 2);
    if (speed > maxSpd) {
      this.playerVelX = (this.playerVelX / speed) * maxSpd;
      this.playerVelZ = (this.playerVelZ / speed) * maxSpd;
    }
    const maxVertSpd = maxSpd * 0.7;
    if (Math.abs(this.playerVelY) > maxVertSpd) {
      this.playerVelY = Math.sign(this.playerVelY) * maxVertSpd;
    }

    // Move (3D)
    this.playerPos.x += this.playerVelX * dt;
    this.playerPos.y += this.playerVelY * dt;
    this.playerPos.z += this.playerVelZ * dt;

    // XZ ring boundary
    const dist = Math.sqrt(this.playerPos.x ** 2 + this.playerPos.z ** 2);
    if (dist > ARENA_HALF - SHIP_RADIUS) {
      const nx = this.playerPos.x / dist;
      const nz = this.playerPos.z / dist;
      this.playerPos.x = nx * (ARENA_HALF - SHIP_RADIUS);
      this.playerPos.z = nz * (ARENA_HALF - SHIP_RADIUS);
      const dot = this.playerVelX * nx + this.playerVelZ * nz;
      this.playerVelX -= 2 * dot * nx;
      this.playerVelZ -= 2 * dot * nz;
      this.playerVelX *= 0.5;
      this.playerVelZ *= 0.5;
    }

    // Vertical caps (semi-sphere top/bottom). Clamp + reflect the Y velocity
    // like the XZ ring does so the ship can't phase through the ceiling.
    const yLimit = ARENA_HEIGHT_HALF - SHIP_RADIUS;
    if (this.playerPos.y > yLimit) {
      this.playerPos.y = yLimit;
      if (this.playerVelY > 0) this.playerVelY = -this.playerVelY * 0.3;
    } else if (this.playerPos.y < -yLimit) {
      this.playerPos.y = -yLimit;
      if (this.playerVelY < 0) this.playerVelY = -this.playerVelY * 0.3;
    }

    // Barrel-roll tick — decrement timers, the roll angle itself is applied
    // as an additional rotation.z on the mesh after updateAim has written
    // the baseline yaw/pitch.
    if (this.barrelRollTimer > 0) this.barrelRollTimer -= dt;
    if (this.barrelRollCooldown > 0) this.barrelRollCooldown -= dt;
    // Missile-sector rate-limit tick (2s repeat while held on missile sector)
    if (this._missileSectorTimer > 0) this._missileSectorTimer -= dt;

    // Micro-levitation — only when the ship is truly standing still AND
    // level (no pitch, no roll). Pure lateral sway on world X, no vertical
    // bob (that's what caused the "on a string" feel during diving).
    // Smoothly fades in/out via combined idle + level factors.
    const speedNorm2 = Math.min(1, Math.sqrt(
      this.playerVelX ** 2 + this.playerVelY ** 2 + this.playerVelZ ** 2,
    ) / SHIP_MAX_SPEED);
    const stillFactor = Math.max(0, 1 - speedNorm2 * 8); // strict "not moving"
    const levelFactor = Math.max(0, 1 - Math.abs(this.aimDirY) * 3);
    const rollFactor = Math.max(0, 1 - Math.abs(this.shipRoll) * 3);
    const idleWeight = stillFactor * levelFactor * rollFactor;
    const nowMs = performance.now();
    // Slow single-axis sway (world X) — amplitude ~0.4u at full idle.
    const sway = Math.sin(nowMs * 0.0011) * 0.4 * idleWeight;

    this.playerMesh.position.set(
      this.playerPos.x + sway,
      this.playerPos.y,
      this.playerPos.z,
    );
    this.playerNickSprite.position.set(this.playerPos.x, this.playerPos.y + 15, this.playerPos.z - 15);

    // Player-following point light — slightly above the ship so the top
    // surfaces light up; cheap compared to a shadow-casting directional.
    if (this.playerKeyLight) {
      this.playerKeyLight.position.set(
        this.playerPos.x,
        this.playerPos.y + 40,
        this.playerPos.z,
      );
    }

    // Glow disc follows ship; gentle pulse on opacity for "alive" feel.
    if (this.playerGlowMesh) {
      this.playerGlowMesh.position.set(this.playerPos.x, 2, this.playerPos.z);
      const glowMat = this.playerGlowMesh.material as THREE.MeshBasicMaterial;
      const pulse = 0.3 + Math.sin(performance.now() * 0.004) * 0.08;
      glowMat.opacity = pulse;
    }

    // Flicker effect during invulnerability window.
    // Works for both the GLB-group path and the old sprite Mesh path by
    // traversing children and applying opacity to all materials.
    const invulnerable = performance.now() < this.invulnerableUntil;
    const targetOpacity = invulnerable
      ? 0.4 + Math.sin(performance.now() * 0.01) * 0.3
      : 1;
    this.playerMesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material && !Array.isArray(obj.material)) {
        const m = obj.material as THREE.Material & { opacity?: number; transparent?: boolean };
        if (invulnerable) {
          m.transparent = true;
          m.opacity = targetOpacity;
        } else if (m.opacity !== undefined && m.opacity !== 1) {
          m.opacity = 1;
        }
      }
    });

    // Dynamic fly loop volume: silent when stopped, grows with speed
    const curSpeed = Math.sqrt(this.playerVelX ** 2 + this.playerVelZ ** 2);
    const speedRatio = Math.min(1, curSpeed / (SHIP_MAX_SPEED * this.playerSpeedMult));
    // Map 0..1 speed ratio to 0..0.3 volume (idle=silent, full speed=0.3)
    setLoopVolume('fly', speedRatio * 0.3);
  }

  // ── Aim (mouse) ────────────────────────────────────────────────────────

  // Aim direction vector (normalized 3D) — used by fireBullet & spawnExhaust.
  // Now includes Y component so the ship can aim up/down in the semi-sphere.
  private aimDirX = 0;
  private aimDirY = 0;
  private aimDirZ = -1; // default: facing forward (-Z), level pitch

  private updateAim(dt: number): void {
    const prevAngle = this.playerAimAngle;

    if (this.isMobile) {
      // Flight-sim right stick:
      //   X  → ROLL (bank) rate — stick right banks right wing down.
      //   Y  → PITCH rate — stick forward (up on screen, mobilePitchRate<0)
      //        pitches the nose DOWN; stick back pitches nose UP. Matches
      //        aircraft yoke convention.
      //
      // Banking induces a coordinated yaw turn (sin(roll) × turn rate), so
      // holding "bank right" arcs the ship to the right without the player
      // having to push yaw separately.
      const ROLL_RATE = Math.PI / 0.6;        // rad/sec at full stick
      const PITCH_RATE = Math.PI / 1.2;       // rad/sec at full stick
      const TURN_FROM_ROLL = Math.PI / 1.2;   // rad/sec per unit sin(roll)
      const MAX_ROLL = 1.0;                    // ~57°
      const rollStick = Math.abs(this.mobileAim.x) > 0.1 ? this.mobileAim.x : 0;
      const pitchStick = Math.abs(this.mobilePitchRate) > 0.1 ? this.mobilePitchRate : 0;

      // Target roll — proportional to stick deflection. When the stick is
      // centered the target is 0, so shipRoll naturally rolls back to level
      // (aircraft tend to self-level). When deflected, smooth toward the
      // target so banks feel weighty instead of snapping.
      const targetRoll = rollStick * MAX_ROLL;
      this.shipRoll += (targetRoll - this.shipRoll) * Math.min(1, dt * 4);
      if (Math.abs(rollStick) > 0.9) {
        this.shipRoll += Math.sign(rollStick) * ROLL_RATE * dt * 0.2;
      }
      this.shipRoll = Math.max(-MAX_ROLL, Math.min(MAX_ROLL, this.shipRoll));

      // Coordinated-turn yaw induced by bank.
      const inducedYaw = Math.sin(this.shipRoll) * TURN_FROM_ROLL * dt;

      const curPitchM = Math.asin(Math.max(-1, Math.min(1, this.aimDirY)));
      const curYawM = Math.atan2(this.aimDirX, -this.aimDirZ);

      const newYaw = curYawM + inducedYaw;
      // Pitch convention (flipped per user feedback):
      //   stick UP on screen (pitchStick<0) → nose UP
      //   stick DOWN on screen (pitchStick>0) → nose DOWN
      // i.e. "pull back to climb, push forward to dive" in reverse — the
      // player wants the stick to "look" where the nose goes.
      let newPitch = curPitchM - pitchStick * PITCH_RATE * dt;
      newPitch = Math.max(-this.MAX_PITCH, Math.min(this.MAX_PITCH, newPitch));
      const cp = Math.cos(newPitch);
      this.aimDirX =  Math.sin(newYaw) * cp;
      this.aimDirY =  Math.sin(newPitch);
      this.aimDirZ = -Math.cos(newYaw) * cp;
    } else if (this.pointerLocked) {
      // Desktop pointer-lock — same convention as mobile. Mouse right →
      // yaw right (positive). Mouse down → pitch down (negative).
      const curPitch = Math.asin(Math.max(-1, Math.min(1, this.aimDirY)));
      const curYaw = Math.atan2(this.aimDirX, -this.aimDirZ);

      const newYaw = curYaw + this.mouseMoveX * this.MOUSE_SENS;
      let newPitch = curPitch - this.mouseMoveY * this.MOUSE_SENS;
      newPitch = Math.max(-this.MAX_PITCH, Math.min(this.MAX_PITCH, newPitch));

      const cp = Math.cos(newPitch);
      this.aimDirX =  Math.sin(newYaw) * cp;
      this.aimDirY =  Math.sin(newPitch);
      this.aimDirZ = -Math.cos(newYaw) * cp;

      // Consume deltas
      this.mouseMoveX = 0;
      this.mouseMoveY = 0;
    } else {
      // Fallback pre-lock: XZ plane raycast (Y stays 0)
      const dx = this.aimPoint.x - this.playerPos.x;
      const dz = this.aimPoint.z - this.playerPos.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len > 1) {
        this.aimDirX = dx / len;
        this.aimDirZ = dz / len;
        this.aimDirY = 0;
      }
    }

    // Ship orientation — use lookAt + roll to avoid Euler-order conflicts.
    //
    // Three.js Object3D.lookAt aligns LOCAL +Z with direction-to-target
    // (Matrix4.lookAt is called with swapped args for generic objects). To
    // match the inner offset that maps Tripo's +X nose → outer's -Z, we
    // pass lookAt a target at (ship - aim). Local +Z then points toward
    // (ship - aim) = opposite of aim, which means local -Z points ALONG
    // aim — exactly where the ship's nose is.
    this.playerAimAngle = Math.atan2(this.aimDirX, this.aimDirZ);
    _tempVec3.set(
      this.playerPos.x - this.aimDirX,
      this.playerPos.y - this.aimDirY,
      this.playerPos.z - this.aimDirZ,
    );
    this.playerMesh.lookAt(_tempVec3);

    // Roll around the local forward axis (-Z after lookAt). Apply as an
    // additional rotation via rotateOnAxis so it composes with lookAt's
    // quaternion instead of fighting the Euler .rotation.z slot.
    let roll = this.shipRoll;
    if (this.barrelRollTimer > 0) {
      const progress = 1 - this.barrelRollTimer / this.BARREL_ROLL_DURATION;
      roll += progress * Math.PI * 2;
    }
    if (Math.abs(roll) > 0.0001) {
      _tempVec3.set(0, 0, -1); // local forward after lookAt
      this.playerMesh.rotateOnAxis(_tempVec3, roll);
    }
    this.playerPitch = Math.asin(Math.max(-1, Math.min(1, this.aimDirY)));

    // Bank angle — visual tilt when turning sharply (only on Z axis, no X)
    let angleDelta = this.playerAimAngle - prevAngle;
    while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
    while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
    const targetBank = Math.max(-0.3, Math.min(0.3, -angleDelta * 3));
    this.playerBankAngle += (targetBank - this.playerBankAngle) * Math.min(1, dt * 8);
    // Note: rotation.z doesn't work well with baked geo.rotateX — skip bank for now

    // Crosshair — desktop only, positioned at the raycast aim point (this.aimPoint
    // is updated by onMouseMove). Hidden on mobile where auto-aim handles it.
    if (this.crosshairMesh) {
      if (this.isMobile || this.playerDead) {
        this.crosshairMesh.visible = false;
      } else {
        this.crosshairMesh.visible = true;
        this.crosshairMesh.position.set(this.aimPoint.x, 3, this.aimPoint.z);
        this.crosshairMesh.rotation.y += dt * 1.5;
      }
    }
  }

  // ── Auto-aim: find nearest alive enemy bot ─────────────────────────────

  private findNearestEnemy(): BotShip | null {
    const AUTO_AIM_RANGE = 500;
    let best: BotShip | null = null;
    let bestDist = AUTO_AIM_RANGE;
    for (const bot of this.botShips) {
      if (!bot.alive) continue;
      // In team mode: skip allies. In training (neutral): all bots are enemies.
      if (this.teamMode && bot.team === this.playerTeam) continue;
      const dx = bot.pos.x - this.playerPos.x;
      const dz = bot.pos.z - this.playerPos.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < bestDist) { bestDist = d; best = bot; }
    }
    return best;
  }

  // ── Lock-on targeting ──────────────────────────────────────────────────

  private updateLockOn(dt: number): void {
    if (this.botShips.length === 0 || this.playerDead) {
      this.lockTarget = null;
      this.lockTimer = 0;
      this.lockLocked = false;
      return;
    }

    // Find best enemy in lock cone
    const coneRad = this.LOCK_CONE * Math.PI / 180;
    let bestBot: number | null = null;
    let bestDist = Infinity;

    for (const bot of this.botShips) {
      if (!bot.alive) continue;
      // Enemies only — same rule as missile homing (never lock on allies).
      if (bot.team === this.playerTeam) continue;
      const dx = bot.pos.x - this.playerPos.x;
      const dy = bot.pos.y - this.playerPos.y;
      const dz = bot.pos.z - this.playerPos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist > this.LOCK_RANGE || dist < 1) continue;

      // 3D cone check via dot product with aim. Works for any altitude —
      // XZ-only angle comparison used to miss targets above/below the ship.
      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;
      const dot = nx * this.aimDirX + ny * this.aimDirY + nz * this.aimDirZ;
      const coneCos = Math.cos(coneRad);
      if (dot > coneCos && dist < bestDist) {
        bestDist = dist;
        bestBot = bot.id;
      }
    }

    // Update lock state
    if (bestBot !== null && bestBot === this.lockTarget) {
      // Same target — accumulate timer
      this.lockTimer += dt;
      if (this.lockTimer >= this.LOCK_TIME) {
        this.lockLocked = true;
      }
    } else {
      // New target or no target
      this.lockTarget = bestBot;
      this.lockTimer = bestBot !== null ? 0 : 0;
      this.lockLocked = false;
    }
  }

  // ── Shooting ───────────────────────────────────────────────────────────

  private updateShooting(dt: number): void {
    this.fireCooldownTimer = Math.max(0, this.fireCooldownTimer - dt);
    const isFiring = this.isMobile ? this.mobileFiring : this.mouseDown;
    if (isFiring && this.fireCooldownTimer <= 0) {
      playSfx('arena-laser', 0.1);
      this.fireBullet();
      this.fireCooldownTimer = this.FIRE_COOLDOWN;
    }
  }

  private fireBullet(): void {
    const idx = this.bulletFreeList.pop();
    if (idx === undefined) return;

    // 3D aim vector already normalized (aimDirX/Y/Z). Fallback: ship facing.
    let dirX = this.aimDirX;
    let dirY = this.aimDirY;
    let dirZ = this.aimDirZ;
    const len2 = dirX * dirX + dirY * dirY + dirZ * dirZ;
    if (len2 < 0.01) {
      dirX = Math.cos(this.playerMesh.rotation.y);
      dirY = 0;
      dirZ = -Math.sin(this.playerMesh.rotation.y);
    }

    const b = this.bullets[idx];
    b.x = this.playerPos.x + dirX * (SHIP_RADIUS + 3);
    b.y = this.playerPos.y + dirY * (SHIP_RADIUS + 3);
    b.z = this.playerPos.z + dirZ * (SHIP_RADIUS + 3);
    b.vx = dirX * this.BULLET_SPEED;
    b.vy = dirY * this.BULLET_SPEED;
    b.vz = dirZ * this.BULLET_SPEED;
    b.age = 0;
    b.active = true;
  }

  private updateBullets(dt: number): void {
    const dummy = _tempDummy;
    let needsUpdate = false;

    for (let i = 0; i < this.bullets.length; i++) {
      const b = this.bullets[i];
      if (!b.active) continue;

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
      b.age += dt;

      const dist = Math.sqrt(b.x * b.x + b.z * b.z);
      if (
        b.age >= this.BULLET_LIFETIME ||
        dist > ARENA_HALF + 50 ||
        Math.abs(b.y) > ARENA_HEIGHT_HALF + 50
      ) {
        b.active = false;
        this.bulletFreeList.push(i);
        dummy.position.set(0, -1000, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        this.bulletMeshes[0].setMatrixAt(b.instIdx, dummy.matrix);
        needsUpdate = true;
        continue;
      }

      // Laser beam: cylinder local +Z axis aligned with velocity direction.
      // 3D: compute yaw from XZ projection + pitch from Y component so the
      // beam leans into the travel direction when firing up/down.
      const horizSpd = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
      const yaw = Math.atan2(b.vx, b.vz);
      const pitch = Math.atan2(b.vy, horizSpd || 0.0001);
      dummy.position.set(b.x, b.y, b.z);
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(-pitch, yaw, 0);
      dummy.updateMatrix();
      this.bulletMeshes[0].setMatrixAt(b.instIdx, dummy.matrix);
      needsUpdate = true;
    }

    if (needsUpdate) this.bulletMeshes[0].instanceMatrix.needsUpdate = true;
  }

  // ── Collisions ─────────────────────────────────────────────────────────

  private checkPlayerAsteroidCollisions(): void {
    for (const a of this.asteroidData) {
      if (!a.alive) continue;
      const dx = this.playerPos.x - a.x;
      const dy = this.playerPos.y - a.y;
      const dz = this.playerPos.z - a.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const minDist = SHIP_RADIUS + a.radius;
      if (dist < minDist && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;
        const overlap = minDist - dist;
        // Push ship out along the 3D contact normal
        this.playerPos.x += nx * overlap;
        this.playerPos.y += ny * overlap;
        this.playerPos.z += nz * overlap;
        // Cancel converging velocity
        const impactDot = this.playerVelX * nx + this.playerVelY * ny + this.playerVelZ * nz;
        if (impactDot < 0) {
          this.playerVelX -= impactDot * nx;
          this.playerVelY -= impactDot * ny;
          this.playerVelZ -= impactDot * nz;
        }
        // Damage from full 3D impact speed
        const speed = Math.sqrt(
          this.playerVelX * this.playerVelX +
          this.playerVelY * this.playerVelY +
          this.playerVelZ * this.playerVelZ,
        );
        if (speed > 30 && performance.now() >= this.invulnerableUntil) {
          const impact = Math.min(60, (speed - 30) * 0.6);
          this.playerHp -= impact;
          if (this.playerHp <= 0) {
            this.playerHp = 0;
            this.killPlayer();
            return;
          }
        }
      }
    }
  }

  private killPlayer(): void {
    // Invulnerability window after respawn
    if (performance.now() < this.invulnerableUntil) return;

    // Holographic SHIELD power-up absorbs one lethal hit
    if (this.playerExtraShield > 0) {
      this.playerExtraShield = 0;
      this.playerBuffs = this.playerBuffs.filter(b => b.type !== 'SHIELD');
      this.applyBuffEffects(); // hides shield mesh
      // Visible shield-break flash
      this.spawnHitEffect(this.playerPos.x, this.playerPos.z, this.playerPos.y);
      playSfx('arena-shield-break', 0.14);
      // Push back from impact
      this.playerVelX *= -0.4;
      this.playerVelZ *= -0.4;
      return; // survived the hit
    }

    // Player actually dies (shield did not absorb the hit)
    this.stats.deaths++;
    this.stats.score = Math.max(0, this.stats.score - 10);

    this.playerDead = true;
    this.callbacks.onPlayerDeath?.();
    stopLoop('fly');
    this.respawnTimer = this.RESPAWN_TIME;
    this.playerMesh.visible = false;
    this.playerNickSprite.visible = false;
    if (this.playerGlowMesh) this.playerGlowMesh.visible = false;
    // Clear all buffs on death
    this.playerBuffs = [];
    this.applyBuffEffects();
    // Spawn explosion VFX at death position
    this.spawnExplosion(this.playerPos.x, this.playerPos.z, this.playerPos.y);
    this.playerVelX = 0;
    this.playerVelZ = 0;
  }

  private updateDeathRespawn(dt: number): void {
    if (!this.playerDead) return;
    this.respawnTimer -= dt;
    if (this.respawnTimer <= 0) {
      this.playerDead = false;
      this.playerHp = this.PLAYER_MAX_HP; // restore full HP on respawn
      this.invulnerableUntil = performance.now() + 3000; // 3 seconds invulnerability
      this.callbacks.onPlayerRespawn?.();
      // Respawn at random safe position on arena edge, at ground altitude
      const angle = Math.random() * Math.PI * 2;
      this.playerPos.x = Math.cos(angle) * (ARENA_HALF * 0.7);
      this.playerPos.y = ARENA_GROUND_Y;
      this.playerPos.z = Math.sin(angle) * (ARENA_HALF * 0.7);
      this.playerVelX = 0;
      this.playerVelY = 0;
      this.playerVelZ = 0;
      playSfx('respawn', 0.06);
      playLoop('fly', 0.0); // starts silent, volume tied to speed
      this.playerMesh.visible = true;
      this.playerNickSprite.visible = true;
      if (this.playerGlowMesh) this.playerGlowMesh.visible = true;
    }
  }

  private checkBulletAsteroidCollisions(): void {
    const dummy = _tempDummy;
    for (let bi = 0; bi < this.bullets.length; bi++) {
      const b = this.bullets[bi];
      if (!b.active) continue;

      for (let ai = 0; ai < this.asteroidData.length; ai++) {
        const a = this.asteroidData[ai];
        if (!a.alive) continue;
        // 3D distance check — asteroids now have Y spread
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < a.radius + this.BULLET_RADIUS) {
          // Bullet hit asteroid — spawn hit VFX
          b.active = false;
          this.bulletFreeList.push(bi);
          this.spawnHitEffect(b.x, b.z, b.y);
          playSfx('asteroid-explosion', 0.3);
          dummy.position.set(0, -1000, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          this.bulletMeshes[b.meshIdx].setMatrixAt(b.instIdx, dummy.matrix);
          this.bulletMeshes[b.meshIdx].instanceMatrix.needsUpdate = true;

          a.hp -= this.playerDamageMult; // 1.0 normal, 1.5 with DAMAGE_UP buff
          if (a.hp <= 0) {
            // Destroy asteroid
            a.alive = false;
            a.respawnTimer = 10; // seconds
            this.stats.asteroidKills++;
            this.stats.score += 5;
            dummy.position.set(0, -1000, 0);
            dummy.scale.set(0, 0, 0);
            dummy.updateMatrix();
            this.asteroidMesh.setMatrixAt(ai, dummy.matrix);
            this.asteroidMesh.instanceMatrix.needsUpdate = true;
          }
          break; // bullet consumed
        }
      }
    }
  }

  // ── Asteroid drift ─────────────────────────────────────────────────────

  private updateAsteroids(dt: number): void {
    const dummy = _tempDummy;
    for (let i = 0; i < this.asteroidData.length; i++) {
      const a = this.asteroidData[i];

      // Respawn countdown
      if (!a.alive) {
        a.respawnTimer -= dt;
        if (a.respawnTimer <= 0) {
          // Respawn at random edge + random Y in the semi-sphere
          const angle = Math.random() * Math.PI * 2;
          a.x = Math.cos(angle) * (ARENA_HALF - 50);
          a.z = Math.sin(angle) * (ARENA_HALF - 50);
          a.y = (Math.random() * 2 - 1) * (ARENA_HEIGHT_HALF - 60) * 0.85;
          a.hp = this.ASTEROID_HP_MAX;
          a.alive = true;
          const vA = Math.random() * Math.PI * 2;
          a.vx = Math.cos(vA) * (5 + Math.random() * 10);
          a.vy = (Math.random() - 0.5) * 4;
          a.vz = Math.sin(vA) * (5 + Math.random() * 10);
        } else {
          continue; // skip hidden asteroid
        }
      }

      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.z += a.vz * dt;
      a.rot += a.rotSpeed * dt;

      // Bounce off Y caps so asteroids don't drift out of the playable band
      if (a.y > ARENA_HEIGHT_HALF - a.radius) {
        a.y = ARENA_HEIGHT_HALF - a.radius;
        if (a.vy > 0) a.vy = -a.vy * 0.5;
      } else if (a.y < -(ARENA_HEIGHT_HALF - a.radius)) {
        a.y = -(ARENA_HEIGHT_HALF - a.radius);
        if (a.vy < 0) a.vy = -a.vy * 0.5;
      }

      // Destroy asteroid that flies past XZ arena bounds
      const d = Math.sqrt(a.x * a.x + a.z * a.z);
      if (d > ARENA_HALF + a.radius) {
        a.alive = false;
        a.respawnTimer = 5;
        dummy.position.set(0, -1000, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        this.asteroidMesh.setMatrixAt(i, dummy.matrix);
        continue;
      }

      dummy.position.set(a.x, a.y, a.z);
      dummy.scale.set(a.radius, a.radius, a.radius);
      dummy.rotation.set(a.rot * 0.3, a.rot, a.rot * 0.7);
      dummy.updateMatrix();
      this.asteroidMesh.setMatrixAt(i, dummy.matrix);
    }

    // Asteroid-asteroid elastic pushback (O(N²), N≈25 — trivial cost)
    for (let i = 0; i < this.asteroidData.length - 1; i++) {
      const a = this.asteroidData[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < this.asteroidData.length; j++) {
        const b = this.asteroidData[j];
        if (!b.alive) continue;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = a.radius + b.radius;
        if (dist < minDist && dist > 0) {
          const nx = dx / dist;
          const nz = dz / dist;
          // Relative velocity along normal
          const relVn = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
          if (relVn > 0) { // moving toward each other
            const e = 0.7; // restitution
            const j = (1 + e) * relVn / 2;
            a.vx -= j * nx;
            a.vz -= j * nz;
            b.vx += j * nx;
            b.vz += j * nz;
          }
          // Separate to prevent overlap
          const overlap = (minDist - dist) * 0.5;
          a.x -= nx * overlap;
          a.z -= nz * overlap;
          b.x += nx * overlap;
          b.z += nz * overlap;
        }
      }
    }

    this.asteroidMesh.instanceMatrix.needsUpdate = true;
  }

  // ── Engine exhaust particles ─────────────────────────────────────────

  private setupExhaust(): void {
    // Exhaust — additive-blended sphere, per-instance color so the 4
    // nozzles on the ship can emit 2 blue + 2 red streams. Sphere is
    // scaled along Z (travel direction) in updateExhaust so full thrust
    // stretches each particle into a long thin streak.
    const geo = new THREE.SphereGeometry(1.8, 4, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, // white base; per-instance color tints
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.disposables.push(geo, mat);

    this.exhaustMesh = new THREE.InstancedMesh(geo, mat, this.EXHAUST_POOL);
    this.exhaustMesh.frustumCulled = false;
    this.exhaustMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(this.EXHAUST_POOL * 3),
      3,
    );

    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.EXHAUST_POOL; i++) {
      dummy.position.set(0, -1000, 0);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      this.exhaustMesh.setMatrixAt(i, dummy.matrix);
      this.exhaustParticles.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, active: false, scale: 1 });
      this.exhaustFreeList.push(i);
    }
    this.exhaustMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.exhaustMesh);
  }

  /**
   * Spawn a single small cyan exhaust particle.
   *   nozzle 0 = left-rear thruster
   *   nozzle 1 = right-rear thruster
   * Both emit from the REAR EDGE of the ship (behind the center by
   * SHIP_RADIUS units) slightly off-axis so you see two streams.
   * All particles are cyan-blue — no red nozzles per player request.
   */
  private spawnExhaust(nozzle: number = 0): void {
    const idx = this.exhaustFreeList.pop();
    if (idx === undefined) return;

    let backX = -this.aimDirX;
    let backY = -this.aimDirY;
    let backZ = -this.aimDirZ;
    const blen = Math.sqrt(backX * backX + backY * backY + backZ * backZ);
    if (blen < 0.01) { backX = 0; backY = 0; backZ = 1; }
    // Horizontal "right" (perpendicular to aim in XZ plane)
    const hx = -this.aimDirZ, hz = this.aimDirX;
    const hlen = Math.sqrt(hx * hx + hz * hz);
    const rightX = hlen > 0.01 ? hx / hlen : 1;
    const rightZ = hlen > 0.01 ? hz / hlen : 0;

    const sideSign = nozzle === 0 ? -1 : 1;
    const sideSpread = SHIP_RADIUS * 0.35; // close together, not wide wings
    const tailOffset = SHIP_RADIUS * 1.1;  // behind the ship's rear edge

    const p = this.exhaustParticles[idx];
    p.x = this.playerPos.x + backX * tailOffset + sideSign * sideSpread * rightX;
    p.y = this.playerPos.y + backY * tailOffset;
    p.z = this.playerPos.z + backZ * tailOffset + sideSign * sideSpread * rightZ;
    p.vx = this.playerVelX * 0.2 + backX * 22;
    p.vy = this.playerVelY * 0.2 + backY * 22;
    p.vz = this.playerVelZ * 0.2 + backZ * 22;
    p.age = 0;
    p.scale = 0.28 + Math.random() * 0.1; // SMALL particles (was 0.65+)
    p.active = true;

    // All cyan — matches hull accents; no red.
    _tempColor.setRGB(0.35, 0.7, 1.0);
    this.exhaustMesh.setColorAt(idx, _tempColor);
    if (this.exhaustMesh.instanceColor) {
      this.exhaustMesh.instanceColor.needsUpdate = true;
    }
  }

  private updateExhaust(dt: number): void {
    // Spawn when thrusting (XZ or vertical)
    const isThrusting = this.isMobile
      ? (Math.abs(this.mobileMove.x) > 0.1 ||
         Math.abs(this.mobileMove.z) > 0.1 ||
         Math.abs(this.mobileVerticalThrust) > 0.1)
      : (this.keys.has('w') || this.keys.has('a') || this.keys.has('s') || this.keys.has('d') ||
         this.keys.has(' ') || this.keys.has('control') || this.keys.has('shift'));

    if (isThrusting) {
      this.exhaustSpawnTimer -= dt;
      if (this.exhaustSpawnTimer <= 0) {
        // Two rear-edge cyan thrusters — small and frequent.
        this.spawnExhaust(0);
        this.spawnExhaust(1);
        this.exhaustSpawnTimer = 0.04;
      }
    }

    // Compute a thrust scalar 0..1 so each particle can be stretched along
    // its travel axis when the ship is accelerating hard.
    const shipSpeed = Math.sqrt(
      this.playerVelX * this.playerVelX +
      this.playerVelY * this.playerVelY +
      this.playerVelZ * this.playerVelZ,
    );
    const thrustNorm = Math.min(1, shipSpeed / SHIP_MAX_SPEED);

    const dummy = _tempDummy;
    let needsUpdate = false;

    for (let i = 0; i < this.exhaustParticles.length; i++) {
      const p = this.exhaustParticles[i];
      if (!p.active) continue;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.age += dt;

      if (p.age >= this.EXHAUST_LIFETIME) {
        p.active = false;
        this.exhaustFreeList.push(i);
        dummy.position.set(0, -1000, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        this.exhaustMesh.setMatrixAt(i, dummy.matrix);
        needsUpdate = true;
        continue;
      }

      // Shrink over lifetime. Very mild stretch along velocity — small
      // particles stay small, they just get slightly elongated with thrust
      // so you can tell it's a jet vs a puff.
      const t = p.age / this.EXHAUST_LIFETIME;
      const base = p.scale * (1 - t);
      const stretch = 1 + thrustNorm * 0.8;
      const pinch = 1 - thrustNorm * 0.15;
      const yaw = Math.atan2(p.vx, p.vz);
      const horiz = Math.sqrt(p.vx * p.vx + p.vz * p.vz);
      const pitch = Math.atan2(p.vy, horiz || 0.0001);
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(base * pinch, base * pinch, base * stretch);
      dummy.rotation.set(-pitch, yaw, 0);
      dummy.updateMatrix();
      this.exhaustMesh.setMatrixAt(i, dummy.matrix);
      needsUpdate = true;
    }

    if (needsUpdate) this.exhaustMesh.instanceMatrix.needsUpdate = true;
  }

  // ── Homing missiles ─────────────────────────────────────────────────────

  private setupMissiles(): void {
    // Missile body — tapered cylinder (thin nose, thicker tail) so the shape
    // reads as a rocket, not a flat triangle. Baked rotation so local +Z is
    // the nose direction; engine orients via rotation.y each frame.
    const geo = new THREE.CylinderGeometry(0.3, 0.9, 5, 8);
    geo.rotateX(Math.PI / 2); // cylinder axis +Y → +Z (nose forward)
    const mat = new THREE.MeshStandardMaterial({
      color: 0xcc3333,
      emissive: 0x441111,
      emissiveIntensity: 0.6,
      roughness: 0.4,
      metalness: 0.6,
    });
    this.disposables.push(geo, mat);

    this.missileMesh = new THREE.InstancedMesh(geo, mat, this.MISSILE_POOL);
    this.missileMesh.frustumCulled = false;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.MISSILE_POOL; i++) {
      dummy.position.set(0, -1000, 0);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      this.missileMesh.setMatrixAt(i, dummy.matrix);
      this.missiles.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, active: false, angle: 0, targetId: null });
      this.missileFreeList.push(i);
    }
    this.missileMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.missileMesh);
  }

  /**
   * Missile trail — tiny additive spheres dropped behind each missile one
   * per frame. Same pool pattern as exhaust: no allocation in the hot path,
   * free-list for O(1) spawn. Cheap: 4-segment sphere × up to 80 instances.
   */
  private setupMissileTrail(): void {
    const geo = new THREE.SphereGeometry(0.8, 4, 3);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffaa55,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.disposables.push(geo, mat);
    this.missileTrailMesh = new THREE.InstancedMesh(geo, mat, this.MISSILE_TRAIL_POOL);
    this.missileTrailMesh.frustumCulled = false;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.MISSILE_TRAIL_POOL; i++) {
      dummy.position.set(0, -1000, 0);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      this.missileTrailMesh.setMatrixAt(i, dummy.matrix);
      this.missileTrails.push({ x: 0, y: 0, z: 0, age: 0, active: false });
      this.missileTrailFreeList.push(i);
    }
    this.missileTrailMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.missileTrailMesh);
  }

  /** Spawn a single trail particle at (x, y, z). Silently no-op if the
   *  pool is saturated — oldest particles fade first. */
  private spawnMissileTrail(x: number, y: number, z: number): void {
    const idx = this.missileTrailFreeList.pop();
    if (idx === undefined) return;
    const p = this.missileTrails[idx];
    p.x = x; p.y = y; p.z = z; p.age = 0; p.active = true;
  }

  /** Advance all trail particles, fading + shrinking over their lifetime. */
  private updateMissileTrail(dt: number): void {
    const dummy = _tempDummy;
    let dirty = false;
    for (let i = 0; i < this.missileTrails.length; i++) {
      const p = this.missileTrails[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= this.MISSILE_TRAIL_LIFETIME) {
        p.active = false;
        this.missileTrailFreeList.push(i);
        dummy.position.set(0, -1000, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        this.missileTrailMesh.setMatrixAt(i, dummy.matrix);
        dirty = true;
        continue;
      }
      const t = p.age / this.MISSILE_TRAIL_LIFETIME;
      const s = 1 - t; // shrink from 1 to 0
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(s, s, s);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      this.missileTrailMesh.setMatrixAt(i, dummy.matrix);
      dirty = true;
    }
    if (dirty) this.missileTrailMesh.instanceMatrix.needsUpdate = true;
  }

  // ── Power-ups ──────────────────────────────────────────────────────────

  private setupHoloShield(): void {
    // Semi-transparent additive sphere around the player ship
    const geo = new THREE.SphereGeometry(SHIP_RADIUS * 1.7, 16, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xaaddff,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.disposables.push(geo, mat);
    this.playerShieldMesh = new THREE.Mesh(geo, mat);
    this.playerShieldMesh.visible = false;
    this.scene.add(this.playerShieldMesh);
  }

  // ── Health Pickups (green cross, +30 HP) ────────────────────────────────

  private setupHealthPickups(): void {
    for (let i = 0; i < this.HEALTH_PICKUP_COUNT; i++) {
      const group = new THREE.Group();
      // Horizontal bar
      const hGeo = new THREE.PlaneGeometry(10, 3);
      hGeo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
      group.add(new THREE.Mesh(hGeo, mat));
      // Vertical bar
      const vGeo = new THREE.PlaneGeometry(3, 10);
      vGeo.rotateX(-Math.PI / 2);
      group.add(new THREE.Mesh(vGeo, mat));
      // Glow halo
      const haloGeo = new THREE.CircleGeometry(8, 16);
      haloGeo.rotateX(-Math.PI / 2);
      const haloMat = new THREE.MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false });
      group.add(new THREE.Mesh(haloGeo, haloMat));

      const angle = Math.random() * Math.PI * 2;
      const r = 100 + Math.random() * (ARENA_HALF * 0.7);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      // Pickups scattered through the vertical band so the player has to
      // climb or dive to collect — not all clustered at ground altitude.
      const y = (Math.random() * 2 - 1) * (ARENA_HEIGHT_HALF * 0.6);
      group.position.set(x, y, z);
      this.scene.add(group);

      this.healthPickups.push({
        id: this.healthPickupCounter++,
        x, y, z, mesh: group, respawnTimer: 0, active: true,
      });
    }
  }

  private updateHealthPickups(dt: number): void {
    for (const hp of this.healthPickups) {
      if (!hp.active) {
        hp.respawnTimer -= dt;
        if (hp.respawnTimer <= 0) {
          const angle = Math.random() * Math.PI * 2;
          const r = 100 + Math.random() * (ARENA_HALF * 0.7);
          hp.x = Math.cos(angle) * r;
          hp.z = Math.sin(angle) * r;
          hp.y = (Math.random() * 2 - 1) * (ARENA_HEIGHT_HALF * 0.6);
          hp.mesh.position.set(hp.x, hp.y, hp.z);
          hp.mesh.visible = true;
          hp.active = true;
        }
        continue;
      }

      // Animate: gentle bob + rotate (bob around each pickup's persistent Y)
      hp.mesh.position.y = hp.y + Math.sin(performance.now() * 0.003 + hp.id) * 2;
      hp.mesh.rotation.y += dt * 1.2;

      // Player collection — 3D distance so high-altitude pickups actually
      // require climbing to grab.
      if (!this.playerDead) {
        const dx = this.playerPos.x - hp.x;
        const dy = this.playerPos.y - hp.y;
        const dz = this.playerPos.z - hp.z;
        if (dx * dx + dy * dy + dz * dz < this.HEALTH_PICKUP_RADIUS * this.HEALTH_PICKUP_RADIUS) {
          this.playerHp = Math.min(this.PLAYER_MAX_HP, this.playerHp + this.HEALTH_PICKUP_HEAL);
          playSfx('arena-powerup', 0.075);
          hp.active = false;
          hp.mesh.visible = false;
          hp.respawnTimer = this.HEALTH_PICKUP_RESPAWN;
        }
      }

      // Bot collection (both modes now since training is 3v3)
      for (const bot of this.botShips) {
        if (!bot.alive) continue;
        const dx = bot.pos.x - hp.x;
        const dy = bot.pos.y - hp.y;
        const dz = bot.pos.z - hp.z;
        if (dx * dx + dy * dy + dz * dz < this.HEALTH_PICKUP_RADIUS * this.HEALTH_PICKUP_RADIUS) {
          bot.hp = Math.min(100, bot.hp + this.HEALTH_PICKUP_HEAL);
          hp.active = false;
          hp.mesh.visible = false;
          hp.respawnTimer = this.HEALTH_PICKUP_RESPAWN;
          break;
        }
      }
    }
  }

  private spawnPowerUp(): void {
    if (this.powerUps.length >= this.MAX_POWERUPS) return;

    const types: PowerUpType[] = ['WARP', 'DAMAGE_UP', 'SLOW_LASER', 'SHIELD'];
    const type = types[Math.floor(Math.random() * types.length)];
    const color = this.POWERUP_COLORS[type];

    // Glowing core sphere
    const coreGeo = new THREE.SphereGeometry(6, 14, 10);
    const coreMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.disposables.push(coreGeo, coreMat);
    const mesh = new THREE.Mesh(coreGeo, coreMat);

    // Outer halo (additive, larger, dimmer)
    const haloGeo = new THREE.SphereGeometry(11, 14, 10);
    const haloMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.disposables.push(haloGeo, haloMat);
    const halo = new THREE.Mesh(haloGeo, haloMat);
    mesh.add(halo);

    // Random position within 80% of arena radius (avoid spawn at exact origin)
    const r = 80 + Math.random() * (ARENA_HALF * 0.8);
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    mesh.position.set(x, 10, z);
    this.scene.add(mesh);

    this.powerUps.push({
      id: this.powerUpCounter++,
      type,
      x,
      z,
      mesh,
      pulsePhase: Math.random() * Math.PI * 2,
    });
  }

  private updatePowerUps(dt: number): void {
    // Spawn timer
    this.powerUpSpawnTimer -= dt;
    if (this.powerUpSpawnTimer <= 0) {
      this.spawnPowerUp();
      this.powerUpSpawnTimer = this.POWERUP_SPAWN_INTERVAL;
    }

    // Animate orbs (pulse + bob + rotate)
    for (const pu of this.powerUps) {
      pu.pulsePhase += dt * 3;
      const pulse = 1 + Math.sin(pu.pulsePhase) * 0.18;
      pu.mesh.scale.set(pulse, pulse, pulse);
      pu.mesh.position.y = 10 + Math.sin(pu.pulsePhase * 0.7) * 3;
      pu.mesh.rotation.y += dt * 1.5;
    }

    // Proximity collection (only when alive)
    if (!this.playerDead) {
      for (let i = this.powerUps.length - 1; i >= 0; i--) {
        const pu = this.powerUps[i];
        const dx = this.playerPos.x - pu.x;
        const dz = this.playerPos.z - pu.z;
        if (dx * dx + dz * dz < this.POWERUP_COLLECT_RADIUS * this.POWERUP_COLLECT_RADIUS) {
          this.collectPowerUp(i);
        }
      }
    }

    // Bot power-up collection (team mode)
    if (this.teamMode) {
      for (const bot of this.botShips) {
        if (!bot.alive) continue;
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
          const pu = this.powerUps[i];
          const dx = bot.pos.x - pu.x;
          const dz = bot.pos.z - pu.z;
          if (dx * dx + dz * dz < this.POWERUP_COLLECT_RADIUS * this.POWERUP_COLLECT_RADIUS) {
            // Simplified bot buff: only apply HEALTH and SHIELD healing
            if (pu.type === 'HEALTH') {
              bot.hp = Math.min(bot.maxHp, bot.hp + 30);
            } else if (pu.type === 'SHIELD') {
              bot.hp = Math.min(bot.maxHp, bot.hp + 50);
            }
            // Remove power-up from scene
            this.scene.remove(pu.mesh);
            pu.mesh.geometry.dispose();
            pu.mesh.children.forEach(child => {
              if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
              }
            });
            if (Array.isArray(pu.mesh.material)) {
              pu.mesh.material.forEach(m => m.dispose());
            } else {
              (pu.mesh.material as THREE.Material).dispose();
            }
            this.powerUps.splice(i, 1);
            break;
          }
        }
      }
    }

    // Expire buffs
    const now = Date.now();
    const before = this.playerBuffs.length;
    this.playerBuffs = this.playerBuffs.filter(b => b.expiresAt > now);
    if (this.playerBuffs.length !== before) {
      this.applyBuffEffects();
    }

    // Sync holographic shield to player position
    if (this.playerShieldMesh && this.playerShieldMesh.visible) {
      this.playerShieldMesh.position.set(this.playerPos.x, this.playerPos.y, this.playerPos.z);
      this.playerShieldMesh.rotation.y += dt * 0.8;
    }
  }

  private collectPowerUp(index: number): void {
    const pu = this.powerUps[index];

    // Pickup VFX (reuses hit-effect ring)
    this.spawnHitEffect(pu.x, pu.z);
    playSfx('arena-powerup', 0.1);

    // Remove mesh from scene + dispose geometry/material
    this.scene.remove(pu.mesh);
    pu.mesh.geometry.dispose();
    if (Array.isArray(pu.mesh.material)) {
      pu.mesh.material.forEach(m => m.dispose());
    } else {
      pu.mesh.material.dispose();
    }
    // Dispose halo child too
    pu.mesh.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    });

    this.powerUps.splice(index, 1);

    // Apply buff
    const expiresAt = Date.now() + this.POWERUP_BUFF_DURATION_MS;

    // Extra sound for specific powerup types
    if (pu.type === 'DAMAGE_UP') playSfx('lazer-red', 0.25);

    // DAMAGE_UP and SLOW_LASER both change laser color → mutually exclusive
    if (pu.type === 'DAMAGE_UP' || pu.type === 'SLOW_LASER') {
      this.playerBuffs = this.playerBuffs.filter(b => b.type !== 'DAMAGE_UP' && b.type !== 'SLOW_LASER');
    }

    const existing = this.playerBuffs.findIndex(b => b.type === pu.type);
    if (existing >= 0) {
      this.playerBuffs[existing].expiresAt = expiresAt;
    } else {
      this.playerBuffs.push({ type: pu.type, expiresAt });
    }

    this.applyBuffEffects();
  }

  private applyBuffEffects(): void {
    // Reset to base
    this.playerSpeedMult = 1.0;
    this.playerDamageMult = 1.0;
    this.playerLaserColor = 'green';
    let hasShield = false;

    for (const buff of this.playerBuffs) {
      switch (buff.type) {
        case 'WARP':
          this.playerSpeedMult *= 1.5;
          break;
        case 'DAMAGE_UP':
          this.playerDamageMult = 1.5;
          this.playerLaserColor = 'red';
          break;
        case 'SLOW_LASER':
          this.playerLaserColor = 'blue';
          break;
        case 'SHIELD':
          hasShield = true;
          // Refresh shield buffer to full each tick the buff is active
          this.playerExtraShield = this.POWERUP_SHIELD_HP;
          break;
      }
    }
    if (!hasShield) this.playerExtraShield = 0;

    // Show / hide holographic shield
    if (this.playerShieldMesh) {
      this.playerShieldMesh.visible = hasShield;
    }

    // Glow disc color follows buff state (cheap visual feedback)
    if (this.playerGlowMesh) {
      const glowMat = this.playerGlowMesh.material as THREE.MeshBasicMaterial;
      const color =
        this.playerLaserColor === 'red'  ? 0xff5544 :
        this.playerLaserColor === 'blue' ? 0x44aaff :
        0x7bb8ff;
      glowMat.color.setHex(color);
    }
  }

  fireMissile(): void {
    if (this.playerDead) return;
    if (this.missileAmmo <= 0 || this.missileCooldownTimer > 0) return;
    this.missileAmmo--;
    this.missileCooldownTimer = this.MISSILE_COOLDOWN;
    // Start per-missile reload timer when dropping below max for the first time
    if (this.missileAmmo === this.MISSILE_MAX_AMMO - 1) {
      this.missileReloadTimer = this.MISSILE_RELOAD_TIME / this.MISSILE_MAX_AMMO;
    }
    const idx = this.missileFreeList.pop();
    if (idx === undefined) return;

    const m = this.missiles[idx];
    m.angle = Math.atan2(this.aimDirX, -this.aimDirZ);
    const dirX = this.aimDirX || -Math.sin(this.playerMesh.rotation.y);
    const dirY = this.aimDirY;
    const dirZ = this.aimDirZ || -Math.cos(this.playerMesh.rotation.y);
    m.x = this.playerPos.x + dirX * (SHIP_RADIUS + 5);
    m.y = this.playerPos.y + dirY * (SHIP_RADIUS + 5);
    m.z = this.playerPos.z + dirZ * (SHIP_RADIUS + 5);
    m.vx = dirX * this.MISSILE_SPEED;
    m.vy = dirY * this.MISSILE_SPEED;
    m.vz = dirZ * this.MISSILE_SPEED;
    m.age = 0;
    m.active = true;

    if (this.lockLocked && this.lockTarget !== null) {
      m.targetId = this.lockTarget;
      // Reset lock after firing
      this.lockLocked = false;
      this.lockTimer = 0;
      this.lockTarget = null;
    } else {
      m.targetId = null;
    }

    playSfx('arena-missile', 0.15);
  }

  private updateMissiles(dt: number): void {
    this.missileCooldownTimer = Math.max(0, this.missileCooldownTimer - dt);

    // Reload ammo over time — 1 missile per (MISSILE_RELOAD_TIME / MAX_AMMO) seconds
    if (this.missileAmmo < this.MISSILE_MAX_AMMO) {
      this.missileReloadTimer -= dt;
      if (this.missileReloadTimer <= 0) {
        this.missileAmmo++;
        if (this.missileAmmo < this.MISSILE_MAX_AMMO) {
          // Schedule next reload tick
          this.missileReloadTimer = this.MISSILE_RELOAD_TIME / this.MISSILE_MAX_AMMO;
        } else {
          // Ammo full — stop the timer
          this.missileReloadTimer = 0;
        }
      }
    }

    // Fire missile with E key or Space (blocked while dead)
    if (!this.playerDead && this.missileCooldownTimer <= 0 && this.missileAmmo > 0 && (this.keys.has('e') || this.keys.has(' '))) {
      this.fireMissile();
    }

    // Find homing target for a missile (3D — includes Y so missiles can
    // track a climbing enemy up/down).
    const findTarget = (mx: number, my: number, mz: number, targetId: number | null): { x: number; y: number; z: number } | null => {
      if (targetId !== null) {
        const bot = this.botShips.find(b => b.id === targetId);
        if (bot && bot.alive) return { x: bot.pos.x, y: bot.pos.y, z: bot.pos.z };
      }

      let best: { x: number; y: number; z: number } | null = null;
      // 1200u matches the missile's max flight range (speed × lifetime);
      // any enemy inside the missile's reachable sphere is a valid target.
      // The old 500u cap was too small after the arena was expanded 4×.
      let bestDist = 1200;

      // Enemy ships — priority over asteroids, checked in both training
      // (3v3) and team-battle. Allies excluded.
      for (const bot of this.botShips) {
        if (!bot.alive) continue;
        if (bot.team === this.playerTeam) continue; // don't home on allies
        const d = Math.sqrt((mx - bot.pos.x) ** 2 + (my - bot.pos.y) ** 2 + (mz - bot.pos.z) ** 2);
        if (d < bestDist) { bestDist = d; best = { x: bot.pos.x, y: bot.pos.y, z: bot.pos.z }; }
      }

      // Asteroids — secondary target when no ship is in range.
      for (const a of this.asteroidData) {
        if (!a.alive) continue;
        const d = Math.sqrt((mx - a.x) ** 2 + (my - a.y) ** 2 + (mz - a.z) ** 2);
        if (d < bestDist) { bestDist = d; best = { x: a.x, y: a.y, z: a.z }; }
      }

      return best;
    };

    const dummy = _tempDummy;
    let needsUpdate = false;

    for (let i = 0; i < this.missiles.length; i++) {
      const m = this.missiles[i];
      if (!m.active) continue;

      m.age += dt;
      if (m.age >= this.MISSILE_LIFETIME) {
        m.active = false;
        this.missileFreeList.push(i);
        dummy.position.set(0, -1000, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        this.missileMesh.setMatrixAt(i, dummy.matrix);
        needsUpdate = true;
        continue;
      }

      // Homing: limited turn rate toward nearest target (3D).
      // We rotate the velocity vector directly instead of tracking a scalar
      // angle so the Y component is honored.
      const target = findTarget(m.x, m.y, m.z, m.targetId);
      if (target) {
        const dvx = target.x - m.x;
        const dvy = target.y - m.y;
        const dvz = target.z - m.z;
        const dlen = Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz);
        if (dlen > 0.01) {
          const wantX = dvx / dlen;
          const wantY = dvy / dlen;
          const wantZ = dvz / dlen;
          const vlen = Math.sqrt(m.vx * m.vx + m.vy * m.vy + m.vz * m.vz) || 0.0001;
          const curX = m.vx / vlen;
          const curY = m.vy / vlen;
          const curZ = m.vz / vlen;
          // Locked missiles (m.targetId !== null at fire time) steer at the
          // full MISSILE_TURN_RATE and track a specific target.
          // Dumb missiles (no lock) use HALF the turn rate — they chase the
          // nearest object but a dodging pilot often escapes, matching the
          // "≈50% hit chance without lock" feel.
          const dumbFire = m.targetId === null;
          const effRate = dumbFire ? this.MISSILE_TURN_RATE * 0.5 : this.MISSILE_TURN_RATE;
          const t = Math.min(1, effRate * dt / Math.PI);
          let nx = curX + (wantX - curX) * t;
          let ny = curY + (wantY - curY) * t;
          let nz = curZ + (wantZ - curZ) * t;
          const nlen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 0.0001;
          nx /= nlen; ny /= nlen; nz /= nlen;
          m.vx = nx * this.MISSILE_SPEED;
          m.vy = ny * this.MISSILE_SPEED;
          m.vz = nz * this.MISSILE_SPEED;
          m.angle = Math.atan2(m.vx, -m.vz);
        }
      }

      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.z += m.vz * dt;

      // Drop a trail particle at the new position each frame.
      this.spawnMissileTrail(m.x, m.y, m.z);

      // Visual — orient to full 3D velocity (yaw + pitch)
      const horizSpd = Math.sqrt(m.vx * m.vx + m.vz * m.vz);
      const yaw = Math.atan2(m.vx, m.vz);
      const pitch = Math.atan2(m.vy, horizSpd || 0.0001);
      dummy.position.set(m.x, m.y, m.z);
      dummy.scale.set(1.5, 1.5, 1.5);
      dummy.rotation.set(-pitch, yaw, 0);
      dummy.updateMatrix();
      this.missileMesh.setMatrixAt(i, dummy.matrix);
      needsUpdate = true;
    }

    if (needsUpdate) this.missileMesh.instanceMatrix.needsUpdate = true;
  }

  private checkMissileAsteroidCollisions(): void {
    const dummy = _tempDummy;
    for (let mi = 0; mi < this.missiles.length; mi++) {
      const m = this.missiles[mi];
      if (!m.active) continue;

      for (let ai = 0; ai < this.asteroidData.length; ai++) {
        const a = this.asteroidData[ai];
        if (!a.alive) continue;
        const dx = m.x - a.x;
        const dy = m.y - a.y;
        const dz = m.z - a.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < a.radius + this.MISSILE_RADIUS) {
          // Missile hit asteroid — AoE: damage all nearby asteroids
          m.active = false;
          this.missileFreeList.push(mi);
          playSfx('missile-hit', 0.2);
          dummy.position.set(0, -1000, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          this.missileMesh.setMatrixAt(mi, dummy.matrix);
          this.missileMesh.instanceMatrix.needsUpdate = true;

          // Splash damage in radius 30 (3D)
          for (const a2 of this.asteroidData) {
            if (!a2.alive) continue;
            const d2 = Math.sqrt((m.x - a2.x) ** 2 + (m.y - a2.y) ** 2 + (m.z - a2.z) ** 2);
            if (d2 < 30) {
              a2.hp -= 3;
              if (a2.hp <= 0) {
                a2.alive = false;
                a2.respawnTimer = 10;
                this.stats.asteroidKills++;
                this.stats.score += 10;
                const idx2 = this.asteroidData.indexOf(a2);
                dummy.position.set(0, -1000, 0);
                dummy.scale.set(0, 0, 0);
                dummy.updateMatrix();
                this.asteroidMesh.setMatrixAt(idx2, dummy.matrix);
                this.asteroidMesh.instanceMatrix.needsUpdate = true;
              }
            }
          }
          break;
        }
      }
    }
  }

  private checkMissileBotCollisions(): void {
    if (this.botShips.length === 0) return;
    const dummy = _tempDummy;

    for (let mi = 0; mi < this.missiles.length; mi++) {
      const m = this.missiles[mi];
      if (!m.active) continue;

      for (const bot of this.botShips) {
        if (!bot.alive) continue;
        // In team mode: skip allies; in FFA: all bots are targets
        if (this.teamMode && bot.team === this.playerTeam) continue;
        if (performance.now() < bot.invulnerableUntil) continue;

        const dx = m.x - bot.pos.x;
        const dy = m.y - bot.pos.y;
        const dz = m.z - bot.pos.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        // Uses SHIP_SHOT_RADIUS (larger than physical) so projectiles that
        // visually strike the ship's wings/fuselage register as hits.
        const rSum = this.MISSILE_RADIUS + SHIP_SHOT_RADIUS;

        if (distSq < rSum * rSum) {
          // Hit — deactivate missile
          m.active = false;
          this.missileFreeList.push(mi);
          dummy.position.set(0, -1000, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          this.missileMesh.setMatrixAt(mi, dummy.matrix);
          this.missileMesh.instanceMatrix.needsUpdate = true;

          // Direct hit damage
          bot.hp -= this.MISSILE_DAMAGE;
          this.spawnHitEffect(m.x, m.z, m.y);
          playSfx('missile-hit', 0.2);

          if (bot.hp <= 0) {
            bot.hp = 0;
            this.killBot(bot, null);
            this.stats.kills++;
            this.stats.score += TEAM_SCORE_ENEMY_KILL;
            if (this.teamMode) {
              this.teamKills[this.playerTeam as 'blue' | 'red']++;
            }
            this.addKillFeed('PLAYER', bot.name);
          }

          // AoE splash to nearby enemy bots (radius 30 units)
          for (const b2 of this.botShips) {
            if (!b2.alive || b2.id === bot.id) continue;
            // In team mode skip allies; in FFA all are targets
            if (this.teamMode && b2.team === this.playerTeam) continue;
            if (performance.now() < b2.invulnerableUntil) continue;
            const d2 = Math.sqrt((m.x - b2.pos.x) ** 2 + (m.z - b2.pos.z) ** 2);
            if (d2 < 30) {
              b2.hp -= 3;
              if (b2.hp <= 0) {
                b2.hp = 0;
                this.killBot(b2, null);
                this.stats.kills++;
                this.stats.score += TEAM_SCORE_ENEMY_KILL;
                if (this.teamMode) {
                  this.teamKills[this.playerTeam as 'blue' | 'red']++;
                }
                this.addKillFeed('PLAYER', b2.name);
              }
            }
          }
          break; // missile consumed
        }
      }
    }
  }

  // ── Warp boost ──────────────────────────────────────────────────────────

  private updateWarp(dt: number): void {
    this.warpCooldownTimer = Math.max(0, this.warpCooldownTimer - dt);
    if (!this.warpActive) return;
    this.warpTimer -= dt;
    if (this.warpTimer <= 0) {
      this.warpActive = false;
    }
  }

  // ── VFX (hit flashes + explosions + debris) ─────────────────────────────

  private spawnHitEffect(x: number, z: number, y: number = ARENA_GROUND_Y): void {
    // Lazy-init shared resources on first use.
    if (!this.hitGeoShared) {
      this.hitGeoShared = new THREE.PlaneGeometry(8, 8);
      this.hitGeoShared.rotateX(-Math.PI / 2);
      this.disposables.push(this.hitGeoShared);
    }
    if (!this.hitMatShared) {
      this.hitMatShared = new THREE.MeshBasicMaterial({
        color: 0x44ffaa,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 1,
      });
      this.disposables.push(this.hitMatShared);
    }
    const mesh = new THREE.Mesh(this.hitGeoShared, this.hitMatShared);
    mesh.position.set(x, y, z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(mesh);
    this.vfxPool.push({ mesh, age: 0, life: 0.2, type: 'hit', shared: true });
  }

  private spawnExplosion(x: number, z: number, y: number = ARENA_GROUND_Y): void {
    // Volume + shake fall off with 3D distance from player.
    const dx = x - this.playerPos.x;
    const dy = y - this.playerPos.y;
    const dz = z - this.playerPos.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const vol = Math.max(0.1, 0.65 * (1 - dist / (ARENA_HALF * 2)));
    playSfx('arena-explosion', vol);

    const shakeFalloff = Math.max(0, 1 - dist / 400);
    if (shakeFalloff > 0) {
      this.shakeAmount = Math.max(this.shakeAmount, 6 * shakeFalloff);
    }
    // Central flash — circular
    const flashGeo = new THREE.CircleGeometry(18, 16);
    flashGeo.rotateX(-Math.PI / 2);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 1,
    });
    const flashMesh = new THREE.Mesh(flashGeo, flashMat);
    flashMesh.position.set(x, y, z);
    this.scene.add(flashMesh);
    this.vfxPool.push({ mesh: flashMesh, age: 0, life: 0.8, type: 'flash', scaleSpeed: 2.0 });

    // Secondary ring flash
    const ringGeo = new THREE.RingGeometry(12, 20, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff6622,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(x, y, z);
    this.scene.add(ringMesh);
    this.vfxPool.push({ mesh: ringMesh, age: 0, life: 1.0, type: 'flash', scaleSpeed: 3.0 });

    // Debris — triangular shards
    const debrisCount = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < debrisCount; i++) {
      const size = 1 + Math.random() * 2;
      const debGeo = new THREE.ConeGeometry(size, size * 2, 3);
      const shade = 0.2 + Math.random() * 0.3;
      const debMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(shade, shade * 0.8, shade * 0.6),
      });
      const debMesh = new THREE.Mesh(debGeo, debMat);
      debMesh.position.set(x, y, z);

      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 50;
      const vel = { x: Math.cos(angle) * speed, z: Math.sin(angle) * speed };
      const rotSpeed = {
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 10,
        z: (Math.random() - 0.5) * 10,
      };

      this.scene.add(debMesh);
      this.vfxPool.push({ mesh: debMesh, age: 0, life: 1.5, type: 'debris', vel, rotSpeed });
    }
  }

  private updateVFX(dt: number): void {
    for (let i = this.vfxPool.length - 1; i >= 0; i--) {
      const vfx = this.vfxPool[i];
      vfx.age += dt;

      if (vfx.age >= vfx.life) {
        this.scene.remove(vfx.mesh);
        // Shared geo/mat are lifetime-owned by the engine (tracked in
        // disposables). Only dispose for unique per-spawn resources.
        if (!vfx.shared) {
          vfx.mesh.geometry.dispose();
          (vfx.mesh.material as THREE.Material).dispose();
        }
        this.vfxPool.splice(i, 1);
        continue;
      }

      const t = vfx.age / vfx.life; // 0..1

      if (vfx.type === 'hit') {
        // Shrink only (material is shared — cannot mutate opacity per-instance).
        // The additive-blended plane still looks like a fading flash because
        // shrinking to 0 in 0.2s gives the same perceptual effect.
        const s = 1 - t;
        vfx.mesh.scale.set(s, s, s);
      } else if (vfx.type === 'flash') {
        // Grow + fade
        const s = 1 + t * (vfx.scaleSpeed ?? 2);
        vfx.mesh.scale.set(s, s, s);
        (vfx.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - t;
      } else if (vfx.type === 'debris') {
        // Move + rotate + shrink
        if (vfx.vel) {
          vfx.mesh.position.x += vfx.vel.x * dt;
          vfx.mesh.position.z += vfx.vel.z * dt;
          vfx.vel.x *= 0.98; // drag
          vfx.vel.z *= 0.98;
        }
        if (vfx.rotSpeed) {
          vfx.mesh.rotation.x += vfx.rotSpeed.x * dt;
          vfx.mesh.rotation.y += vfx.rotSpeed.y * dt;
          vfx.mesh.rotation.z += vfx.rotSpeed.z * dt;
        }
        const s = 1 - t * 0.8;
        vfx.mesh.scale.set(s, s, s);
      }
    }
  }

  // ── Black hole ──────────────────────────────────────────────────────────

  private updateBlackHole(dt: number): void {
    if (!this.blackHoleActive) {
      this.blackHoleSpawnTimer -= dt;
      if (this.blackHoleSpawnTimer <= 0) {
        this.spawnBlackHole();
      }
      return;
    }

    this.blackHoleAge += dt;
    if (this.blackHoleAge >= this.blackHoleLifetime) {
      this.despawnBlackHole();
      return;
    }

    // Rotate accretion disk + pulse AoE rings
    if (this.blackHoleMesh) {
      this.blackHoleMesh.rotation.y += dt * 0.5;
      // Pulse AoE ring opacities for "alive" feel
      const pulse = 0.7 + Math.sin(this.blackHoleAge * 2) * 0.3;
      const aoeMaterials = this.blackHoleMesh.userData.aoeMaterials as
        THREE.MeshBasicMaterial[] | undefined;
      if (aoeMaterials) {
        for (const mat of aoeMaterials) {
          const base = (mat.userData as { baseOpacity: number }).baseOpacity;
          mat.opacity = base * pulse;
        }
      }
    }

    // Gravity pull on player — quadratic falloff (strong near center, zero at edge)
    if (!this.playerDead) {
      const dx = this.blackHolePos.x - this.playerPos.x;
      const dz = this.blackHolePos.z - this.playerPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < this.BLACK_HOLE_PULL_RADIUS && dist > 0) {
        const t = 1 - dist / this.BLACK_HOLE_PULL_RADIUS;
        const force = this.BLACK_HOLE_MAX_FORCE_PLAYER * t * t;
        const nx = dx / dist;
        const nz = dz / dist;
        this.playerVelX += nx * force * dt;
        this.playerVelZ += nz * force * dt;
        // Kill if too close to the singularity
        if (dist < this.BLACK_HOLE_KILL_RADIUS) {
          this.killPlayer();
        }
      }
    }

    // Pull asteroids — same quadratic formula, slightly larger radius
    for (const a of this.asteroidData) {
      if (!a.alive) continue;
      const dx = this.blackHolePos.x - a.x;
      const dz = this.blackHolePos.z - a.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < this.BLACK_HOLE_ASTEROID_RADIUS && dist > 0) {
        const t = 1 - dist / this.BLACK_HOLE_ASTEROID_RADIUS;
        const force = this.BLACK_HOLE_MAX_FORCE_ASTEROID * t * t;
        a.vx += (dx / dist) * force * dt;
        a.vz += (dz / dist) * force * dt;
        if (dist < this.BLACK_HOLE_KILL_RADIUS_ASTEROID) {
          a.alive = false;
          a.respawnTimer = 10;
        }
      }
    }
  }

  private spawnBlackHole(): void {
    playSfx('arena-blackhole', 0.5);
    // Black hole always spawns at arena center (per player request) so it's
    // a landmark hazard everyone can navigate relative to.
    this.blackHolePos.x = 0;
    this.blackHolePos.z = 0;
    this.blackHoleActive = true;
    this.blackHoleAge = 0;

    const group = new THREE.Group();
    const aoeMaterials: THREE.MeshBasicMaterial[] = [];

    // Helper: flat floor ring with base opacity stored for pulse animation
    const addAoeDisk = (
      inner: number,
      outer: number,
      color: number,
      baseOpacity: number,
      yOffset: number,
    ): void => {
      const geo = new THREE.RingGeometry(inner, outer, 64);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: baseOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      (mat.userData as { baseOpacity: number }).baseOpacity = baseOpacity;
      this.disposables.push(geo, mat);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = yOffset;
      group.add(mesh);
      aoeMaterials.push(mat);
    };

    // 1. Outer field — full pull radius (dim purple)
    addAoeDisk(0, this.BLACK_HOLE_PULL_RADIUS, 0x6622aa, 0.06, 0.2);
    // 2. Mid zone — noticeable pull (300u)
    addAoeDisk(0, 300, 0x8833cc, 0.12, 0.4);
    // 3. Inner danger — strong pull (100u)
    addAoeDisk(0, 100, 0xaa44ff, 0.25, 0.6);
    // 4. Boundary outline — bright edge at pull radius
    addAoeDisk(this.BLACK_HOLE_PULL_RADIUS - 4, this.BLACK_HOLE_PULL_RADIUS,
              0xcc66ff, 0.5, 0.8);

    // 5. Core sphere (singularity)
    const coreGeo = new THREE.SphereGeometry(20, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x110022 });
    this.disposables.push(coreGeo, coreMat);
    group.add(new THREE.Mesh(coreGeo, coreMat));

    // 6. Accretion disk (rotating around core)
    const accGeo = new THREE.RingGeometry(25, 50, 32);
    const accMat = new THREE.MeshBasicMaterial({
      color: 0x441166,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    this.disposables.push(accGeo, accMat);
    const accretion = new THREE.Mesh(accGeo, accMat);
    accretion.rotation.x = -Math.PI / 2;
    accretion.rotation.z = 0.35;
    group.add(accretion);

    group.position.set(this.blackHolePos.x, 5, this.blackHolePos.z);
    group.userData.aoeMaterials = aoeMaterials;
    this.scene.add(group);
    this.blackHoleMesh = group;
  }

  private despawnBlackHole(): void {
    if (this.blackHoleMesh) {
      this.scene.remove(this.blackHoleMesh);
      this.blackHoleMesh = null;
    }
    this.blackHoleActive = false;
    this.blackHoleSpawnTimer = 60 + Math.random() * 60;
  }

  // ── Team Battle: setup ──────────────────────────────────────────────────

  private setupBotBullets(): void {
    // Same cylinder-beam geometry as the player laser so bot shots look
    // like lasers too, not spheres. Colour is set per-instance via
    // setColorAt so red team fires red beams and blue team fires blue.
    const geo = new THREE.CylinderGeometry(0.5, 0.5, 10, 6);
    geo.rotateX(Math.PI / 2); // cylinder axis +Y → +Z so rotation.y steers yaw
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, // white base; per-instance color tints
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.disposables.push(geo, mat);

    this.botBulletMesh = new THREE.InstancedMesh(geo, mat, this.BOT_BULLET_POOL);
    this.botBulletMesh.frustumCulled = false;
    this.botBulletMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(this.BOT_BULLET_POOL * 3),
      3,
    );

    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.BOT_BULLET_POOL; i++) {
      dummy.position.set(0, -1000, 0);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      this.botBulletMesh.setMatrixAt(i, dummy.matrix);
      this.botBullets.push({
        x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, active: false,
        ownerId: -1, ownerTeam: 'red',
        rotX: 0, rotY: 0, rotZ: 0,
        rotSpX: 0, rotSpY: 0, rotSpZ: 0,
      });
      this.botBulletFreeList.push(i);
    }
    this.botBulletMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.botBulletMesh);
  }

  private createNickSprite(name: string, color: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 64);
    ctx.font = '22px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(name, 128, 40);
    const tex = new THREE.CanvasTexture(canvas);
    this.disposables.push(tex);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    this.disposables.push(mat);
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(30, 8, 1);
    return sprite;
  }

  private setupBotShips(): void {
    // Preload all 3 ship textures (same pattern as setupPlayerShip — async but renders when ready)
    const loader = new THREE.TextureLoader();
    const shipTextureKeys = Object.keys(SHIP_FILES) as (keyof typeof SHIP_FILES)[];
    const shipTextures: THREE.Texture[] = shipTextureKeys.map(key => {
      const tex = loader.load(SHIP_FILES[key]);
      tex.colorSpace = THREE.SRGBColorSpace;
      this.disposables.push(tex);
      return tex;
    });

    // Shuffle bot names
    const shuffled = [...BOT_NAMES].sort(() => Math.random() - 0.5);
    let nameIdx = 0;

    // Neutral tint colors — varied warm greys/oranges for visual distinction
    const neutralTints = [
      new THREE.Color(0.9, 0.7, 0.5),
      new THREE.Color(0.7, 0.9, 0.6),
      new THREE.Color(0.8, 0.6, 0.9),
      new THREE.Color(0.9, 0.8, 0.4),
      new THREE.Color(0.6, 0.8, 0.9),
      new THREE.Color(0.9, 0.5, 0.6),
    ];

    const totalBots = this.teamMode
      ? TEAM_BLUE_BOTS + TEAM_RED_BOTS
      : TRAINING_BOT_COUNT;

    const spawnBot = (id: number, team: Team, index: number): BotShip => {
      const name = shuffled[nameIdx++ % shuffled.length];
      let tintColor: THREE.Color;
      let labelColor: string;
      if (team === 'blue') {
        tintColor = new THREE.Color(0.5, 0.7, 1.0);
        labelColor = '#4499ff';
      } else if (team === 'red') {
        tintColor = new THREE.Color(1.0, 0.5, 0.5);
        labelColor = '#ff5544';
      } else {
        // neutral — each bot gets a unique tint
        tintColor = neutralTints[index % neutralTints.length];
        labelColor = '#cc9944';
      }

      // GLB path: red for enemies/red team, blue for allies/blue team.
      // Neutral (FFA training) = red so they read as "enemy" to player.
      const source = (team === 'red' || team === 'neutral') ? _cachedRedShip : _cachedBlueShip;

      let mesh: THREE.Mesh;
      if (source) {
        const group = cloneShipScene(source);
        mesh = group as unknown as THREE.Mesh;
        group.position.set(0, 5, 0);
        this.scene.add(group);
      } else {
        // Fallback: sprite path (legacy)
        const tex = shipTextures[id % shipTextures.length];
        const size = SHIP_RADIUS * 5;
        const geo = new THREE.PlaneGeometry(size, size);
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({
          map: tex,
          color: tintColor,
          transparent: true,
          alphaTest: 0.1,
          opacity: 0.9,
          side: THREE.DoubleSide,
        });
        this.disposables.push(geo, mat);
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(0, 5, 0);
        this.scene.add(mesh);
      }

      const nickSprite = this.createNickSprite(name, labelColor);
      this.scene.add(nickSprite);

      // Spread spawn positions around the arena (not near center or player)
      const spawnAngle = (index / totalBots) * Math.PI * 2;
      const spawnDist = ARENA_HALF * 0.5 + Math.random() * ARENA_HALF * 0.25;
      const spawnX = Math.cos(spawnAngle) * spawnDist;
      const spawnZ = Math.sin(spawnAngle) * spawnDist;

      const difficulty = team === 'neutral' ? 'easy' as const : 'medium' as const;

      const bot: BotShip = {
        id,
        team,
        name,
        pos: { x: spawnX, y: ARENA_GROUND_Y, z: spawnZ },
        vel: { x: 0, y: 0, z: 0 },
        rotation: 0,
        pitch: 0,
        hp: 100,
        maxHp: 100,
        alive: true,
        respawnTimer: 0,
        mesh,
        nickSprite,
        brain: createBotBrain(difficulty),
        fireCooldown: Math.random() * 0.5, // stagger initial fires
        kills: 0,
        deaths: 0,
        damageDealt: 0,
        dashCooldown: 0,
        isDashing: false,
        dashTimer: 0,
        missileAmmo: 8,
        missileCooldown: Math.random() * 3,
        missileReloadTimer: 10,
        invulnerableUntil: 0,
        roamY: (Math.random() * 2 - 1) * (ARENA_HEIGHT_HALF * 0.6),
        roamYUntil: performance.now() + 3000 + Math.random() * 4000,
      };

      mesh.position.set(spawnX, 5, spawnZ);
      nickSprite.position.set(spawnX, 20, spawnZ - 15);

      return bot;
    };

    let botId = 1000;
    if (this.teamMode) {
      // Team mode: 4 blue allies + 5 red enemies
      for (let i = 0; i < TEAM_BLUE_BOTS; i++) {
        this.botShips.push(spawnBot(botId++, 'blue', i));
      }
      for (let i = 0; i < TEAM_RED_BOTS; i++) {
        this.botShips.push(spawnBot(botId++, 'red', TEAM_BLUE_BOTS + i));
      }
    } else {
      // Training TPS: 3v3 — 2 blue allies + 3 red enemies (player is blue).
      this.playerTeam = 'blue';
      for (let i = 0; i < TRAINING_BLUE_ALLIES; i++) {
        this.botShips.push(spawnBot(botId++, 'blue', i));
      }
      for (let i = 0; i < TRAINING_RED_ENEMIES; i++) {
        this.botShips.push(spawnBot(botId++, 'red', TRAINING_BLUE_ALLIES + i));
      }
    }
  }

  // ── Team Battle: update bots ─────────────────────────────────────────────

  // Reused enemy buffer — avoids per-frame .filter() allocations.
  private _enemyScratch: (ShipEntity & { id: number; alive: boolean })[] = [];

  private updateBotShips(dt: number): void {
    // Build ShipEntity array for AI (all alive bots + player as enemy of red)
    const allShipEntities = this.buildShipEntityList();

    for (const bot of this.botShips) {
      if (!bot.alive) {
        // Respawn countdown
        bot.respawnTimer -= dt;
        if (bot.respawnTimer <= 0) {
          this.respawnBot(bot);
        }
        continue;
      }

      // Tick cooldowns
      bot.fireCooldown = Math.max(0, bot.fireCooldown - dt);
      if (bot.dashCooldown > 0) bot.dashCooldown -= dt;
      bot.missileCooldown = Math.max(0, (bot.missileCooldown ?? 0) - dt);

      // Missile reload (1 per 10 seconds)
      if ((bot.missileAmmo ?? 8) < 8) {
        bot.missileReloadTimer = (bot.missileReloadTimer ?? 10) - dt;
        if (bot.missileReloadTimer <= 0) {
          bot.missileAmmo = (bot.missileAmmo ?? 0) + 1;
          bot.missileReloadTimer = 10;
        }
      }

      // Anti-edge-stuck: force a fresh center-ward waypoint when near boundary.
      // The actual move-vector override happens below (after AI runs) so a
      // stale FSM output can't leave the bot drifting outward for a full
      // decision interval.
      const distFromCenter = Math.sqrt(bot.pos.x * bot.pos.x + bot.pos.z * bot.pos.z);
      if (distFromCenter > ARENA_HALF * 0.70) {
        bot.brain.waypoint = { x: (Math.random() - 0.5) * (ARENA_HALF * 0.4), z: (Math.random() - 0.5) * (ARENA_HALF * 0.4) };
        bot.brain.state = 'patrol';
        bot.brain.targetId = null;
        bot.brain.decisionTimer = 0;
      }

      // Clear dead targets immediately (don't wait for AI decision tick)
      if (bot.brain.targetId !== null) {
        const targetAlive = allShipEntities.some(s => s.id === bot.brain.targetId && s.alive);
        if (!targetAlive) {
          bot.brain.targetId = null;
          bot.brain.decisionTimer = 0;
        }
      }

      // Build self as ShipEntity for AI
      const selfEntity = this.botToShipEntity(bot, allShipEntities);

      // Build enemy list into persistent buffer (no per-frame allocations).
      // In FFA (neutral) every other ship is an enemy; team-mode filters out
      // same-team mates. The previous target-clustering sort was removed —
      // AI's findNearestEnemy picks 360° by distance so the sort never
      // affected selection, only added unnecessary bot-to-bot contention
      // that caused visible target-switching jitter.
      const enemies = this._enemyScratch;
      enemies.length = 0;
      for (let i = 0; i < allShipEntities.length; i++) {
        const s = allShipEntities[i];
        if (!s.alive) continue;
        if (s.id === bot.id) continue;
        if (bot.team !== 'neutral') {
          const sTeam = this.getEntityTeam(s.id);
          if (sTeam === bot.team) continue;
        }
        enemies.push(s);
      }

      // Run AI FSM
      const input = updateBot(bot.brain, selfEntity, enemies, dt);

      // Hard edge-rescue override: if the bot is beyond 75% of the arena
      // radius, replace AI's movement with a direct center-ward vector for
      // THIS frame. This is the key fix for bots "parking" at the border
      // for a full decision interval on transitions where AI momentarily
      // outputs moveDir=0 (e.g. state changes). Aim follows move so the
      // turn-rate smoothing keeps visuals coherent.
      let ax = input.moveDir.x;
      let az = input.moveDir.z;
      if (distFromCenter > ARENA_HALF * 0.75) {
        const toCenterX = -bot.pos.x / distFromCenter;
        const toCenterZ = -bot.pos.z / distFromCenter;
        ax = toCenterX;
        az = toCenterZ;
        input.aimDir.x = toCenterX;
        input.aimDir.z = toCenterZ;
      }

      // Vertical steering — bot rises/dives toward its current target's Y,
      // or toward a personal "roam" altitude when no target exists. Roam
      // altitude is rerolled every 3–7 s so bots don't all pin to one plane.
      let ay = 0;
      const brainTarget = bot.brain.targetId !== null
        ? allShipEntities.find(s => s.id === bot.brain.targetId)
        : undefined;
      const now = performance.now();
      if (now > bot.roamYUntil) {
        bot.roamY = (Math.random() * 2 - 1) * (ARENA_HEIGHT_HALF * 0.7);
        bot.roamYUntil = now + 3000 + Math.random() * 4000;
      }
      // Even during chase/attack, add a small offset from roam so bots
      // don't perfectly stack on the target's altitude (3D spread).
      const roamOffset = brainTarget?.alive
        ? Math.sin(now * 0.0005 + bot.id) * 80 // gentle oscillation
        : 0;
      const targetY = brainTarget?.alive
        ? brainTarget.pos.y + roamOffset
        : bot.roamY;
      const dy = targetY - bot.pos.y;
      if (Math.abs(dy) > 20) ay = Math.sign(dy);

      bot.vel.x += ax * SHIP_ACCELERATION * dt;
      bot.vel.z += az * SHIP_ACCELERATION * dt;
      bot.vel.y += ay * SHIP_ACCELERATION * 0.5 * dt; // slower climb/dive
      // Frame-rate independent drag: normalised to 60fps equivalent
      const frameDrag = Math.pow(SHIP_DRAG, dt * 60);
      bot.vel.x *= frameDrag;
      bot.vel.y *= frameDrag;
      bot.vel.z *= frameDrag;

      // Clamp speed (XZ)
      const speed = Math.sqrt(bot.vel.x * bot.vel.x + bot.vel.z * bot.vel.z);
      if (speed > SHIP_MAX_SPEED) {
        bot.vel.x = (bot.vel.x / speed) * SHIP_MAX_SPEED;
        bot.vel.z = (bot.vel.z / speed) * SHIP_MAX_SPEED;
      }

      // Warp/dash — activate when AI requests and cooldown is ready
      if (input.dash && bot.dashCooldown <= 0 && !bot.isDashing) {
        bot.isDashing = true;
        bot.dashTimer = 0.2; // dash duration
        bot.dashCooldown = 8; // warp cooldown
      }
      if (bot.isDashing) {
        bot.dashTimer = (bot.dashTimer ?? 0) - dt;
        if (bot.dashTimer <= 0) {
          bot.isDashing = false;
          bot.dashTimer = 0;
        } else {
          // Override velocity to 2x max speed in aim direction
          const warpSpeed = SHIP_MAX_SPEED * 2;
          bot.vel.x = input.aimDir.x * warpSpeed;
          bot.vel.z = input.aimDir.z * warpSpeed;
        }
      }

      bot.pos.x += bot.vel.x * dt;
      bot.pos.y += bot.vel.y * dt;
      bot.pos.z += bot.vel.z * dt;

      // Y cap bounce (same as player) so bots can't escape the semi-sphere
      const yCap = ARENA_HEIGHT_HALF - SHIP_RADIUS;
      if (bot.pos.y > yCap) {
        bot.pos.y = yCap;
        if (bot.vel.y > 0) bot.vel.y = -bot.vel.y * 0.3;
      } else if (bot.pos.y < -yCap) {
        bot.pos.y = -yCap;
        if (bot.vel.y < 0) bot.vel.y = -bot.vel.y * 0.3;
      }

      // Soft center pull — gradual force toward center when far out
      const distFromCenterPost = Math.sqrt(bot.pos.x * bot.pos.x + bot.pos.z * bot.pos.z);
      if (distFromCenterPost > ARENA_HALF * 0.6) {
        const pushStrength = (distFromCenterPost - ARENA_HALF * 0.6) / (ARENA_HALF * 0.4);
        const centerX = -bot.pos.x / distFromCenterPost;
        const centerZ = -bot.pos.z / distFromCenterPost;
        bot.vel.x += centerX * pushStrength * 80 * dt;
        bot.vel.z += centerZ * pushStrength * 80 * dt;
      }

      // Arena boundary
      const dist = Math.sqrt(bot.pos.x * bot.pos.x + bot.pos.z * bot.pos.z);
      if (dist > ARENA_HALF - SHIP_RADIUS) {
        const nx = bot.pos.x / dist;
        const nz = bot.pos.z / dist;
        // Hard-push 24 units inward (prevents sticking)
        bot.pos.x = nx * (ARENA_HALF - SHIP_RADIUS - 24);
        bot.pos.z = nz * (ARENA_HALF - SHIP_RADIUS - 24);
        // Cancel outward velocity component, preserve tangential motion
        const outDot = bot.vel.x * nx + bot.vel.z * nz;
        if (outDot > 0) {
          bot.vel.x -= outDot * nx;
          bot.vel.z -= outDot * nz;
        }
        // Force AI immediately toward center
        bot.brain.waypoint = { x: 0, z: 0 };
        bot.brain.state = 'patrol';
        bot.brain.decisionTimer = 0;
      } else if (dist > ARENA_HALF * 0.85) {
        // Approaching boundary — steer toward center
        bot.brain.waypoint = { x: 0, z: 0 };
        bot.brain.state = 'patrol';
        bot.brain.decisionTimer = 0;
      }

      // Bot-asteroid collision (bounce)
      this.checkBotAsteroidCollision(bot);

      // Smoothly rotate toward the AI's desired aim direction.
      // Previously `bot.rotation` snapped to the new angle instantly which —
      // combined with AI decision ticks every 0.2–0.8s — made bots twitch
      // their nose around even while cruising straight. Cap the turn rate at
      // ~360°/sec; close-range rotation stays responsive, large flips take
      // ~0.5s.
      if (input.aimDir.x !== 0 || input.aimDir.z !== 0) {
        const desired = Math.atan2(-input.aimDir.x, -input.aimDir.z);
        const BOT_TURN_RATE = 2 * Math.PI; // rad/sec
        let diff = desired - bot.rotation;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const step = BOT_TURN_RATE * dt;
        bot.rotation += Math.abs(diff) < step ? diff : Math.sign(diff) * step;
      }

      // Update mesh
      bot.mesh.position.set(bot.pos.x, bot.pos.y, bot.pos.z);
      bot.mesh.rotation.y = bot.rotation;
      bot.mesh.rotation.x = bot.pitch;
      bot.nickSprite.position.set(bot.pos.x, bot.pos.y + 15, bot.pos.z - 15);

      // Flicker effect during invulnerability window.
      // Handles both GLB group and sprite mesh paths by traversing children.
      const isInvulnerable = performance.now() < bot.invulnerableUntil;
      const op = isInvulnerable
        ? 0.4 + Math.sin(performance.now() * 0.01) * 0.3
        : 0.9;
      bot.mesh.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material && !Array.isArray(obj.material)) {
          const m = obj.material as THREE.Material & { opacity?: number; transparent?: boolean };
          if (isInvulnerable) {
            m.transparent = true;
            m.opacity = op;
          } else if (m.opacity !== undefined && m.opacity !== op) {
            m.opacity = op;
          }
        }
      });

      // Compute 3D aim toward current target (so bots shoot UP at flying
      // players). AI aimDir is XZ-only; we add a vertical component from
      // the target's actual Y position and renormalize.
      let aimX = input.aimDir.x;
      let aimY = 0;
      let aimZ = input.aimDir.z;
      if (brainTarget?.alive) {
        const tdx = brainTarget.pos.x - bot.pos.x;
        const tdy = brainTarget.pos.y - bot.pos.y;
        const tdz = brainTarget.pos.z - bot.pos.z;
        const tlen = Math.sqrt(tdx * tdx + tdy * tdy + tdz * tdz);
        if (tlen > 0.1) {
          aimX = tdx / tlen;
          aimY = tdy / tlen;
          aimZ = tdz / tlen;
        }
      }

      // Fire bullets — blocked during invulnerability window (same rule as
      // damage receipt). Previously invulnerable respawned bots could still
      // pour shots while immune to return fire, which felt unfair.
      if (input.firing && bot.fireCooldown <= 0 && !isInvulnerable) {
        this.fireBotBullet(bot, aimX, aimY, aimZ);
        bot.fireCooldown = 0.3 + Math.random() * 0.15; // 0.3–0.45s between shots
      }

      // Fire missile occasionally — also blocked while invulnerable
      if (input.firing && !isInvulnerable && (bot.missileAmmo ?? 0) > 0 && bot.missileCooldown <= 0 && Math.random() < 0.02) {
        this.fireBotMissile(bot, aimX, aimZ);
        bot.missileAmmo = (bot.missileAmmo ?? 1) - 1;
        bot.missileCooldown = 5 + Math.random() * 3; // 5-8s between missiles
      }
    }
  }

  /**
   * Build ShipEntity[] from all bots + player for AI look-up.
   *
   * Hot path — called every frame. Previously created ~10 fresh objects (with
   * nested {x,z} pos/vel, plus empty weaponSlots arrays) per frame = ~600
   * allocs/sec under team mode. Now mutates a persistent buffer; only grows
   * when the bot roster changes.
   */
  private _shipEntityBuffer: (ShipEntity & { id: number; alive: boolean })[] = [];
  private _shipEntityLen = 0;
  private buildShipEntityList(): (ShipEntity & { id: number; alive: boolean })[] {
    const buf = this._shipEntityBuffer;
    const needed = 1 + this.botShips.length;

    // Grow buffer on demand (one-time allocations after warm-up).
    while (buf.length < needed) {
      buf.push({
        id: 0,
        isPlayer: false,
        name: '',
        pos: { x: 0, y: 0, z: 0 },
        vel: { x: 0, y: 0, z: 0 },
        rotation: 0,
        radius: SHIP_RADIUS,
        alive: false,
        hp: 0,
        maxHp: 0,
        shield: 0,
        maxShield: 0,
        shieldRegenTimer: 0,
        weaponSlots: [], // shared empty array — AI treats it read-only
        dashCooldown: 0,
        isDashing: false,
        dashTimer: 0,
        modelGroup: null,
        kills: 0,
        deaths: 0,
        damageDealt: 0,
      });
    }

    // Slot 0 = player
    const p = buf[0];
    p.id = 0;
    p.isPlayer = true;
    p.name = 'PLAYER';
    p.pos.x = this.playerPos.x;
    p.pos.z = this.playerPos.z;
    p.vel.x = this.playerVelX;
    p.vel.z = this.playerVelZ;
    p.rotation = this.playerAimAngle;
    p.alive = !this.playerDead;
    p.hp = this.playerHp;
    p.maxHp = this.PLAYER_MAX_HP;
    p.dashCooldown = this.warpCooldownTimer;
    p.isDashing = this.warpActive;
    p.kills = this.stats.kills;
    p.deaths = this.stats.deaths;

    // Slots 1..N = bots
    for (let i = 0; i < this.botShips.length; i++) {
      const bot = this.botShips[i];
      const e = buf[i + 1];
      e.id = bot.id;
      e.isPlayer = false;
      e.name = bot.name;
      e.pos.x = bot.pos.x;
      e.pos.z = bot.pos.z;
      e.vel.x = bot.vel.x;
      e.vel.z = bot.vel.z;
      e.rotation = bot.rotation;
      e.alive = bot.alive;
      e.hp = bot.hp;
      e.maxHp = bot.maxHp;
      e.dashCooldown = bot.dashCooldown;
      e.isDashing = bot.isDashing;
      e.kills = bot.kills;
      e.deaths = bot.deaths;
      e.damageDealt = bot.damageDealt;
    }

    // Trim length marker — callers use .length, so if we shrink, truncate
    if (buf.length > needed) buf.length = needed;
    this._shipEntityLen = needed;
    return buf;
  }

  /**
   * Convert a BotShip to ShipEntity for AI consumption.
   * Reuses a single persistent scratch object — AI must consume and discard
   * before the next call (which it does — used synchronously in updateBot()).
   */
  private _selfEntityScratch: ShipEntity = {
    id: 0, isPlayer: false, name: '',
    pos: { x: 0, y: 0, z: 0 }, vel: { x: 0, y: 0, z: 0 },
    rotation: 0, radius: SHIP_RADIUS, alive: false,
    hp: 0, maxHp: 0, shield: 0, maxShield: 0, shieldRegenTimer: 0,
    weaponSlots: [], dashCooldown: 0, isDashing: false, dashTimer: 0,
    modelGroup: null, kills: 0, deaths: 0, damageDealt: 0,
  };
  private botToShipEntity(
    bot: BotShip,
    _allEntities: (ShipEntity & { id: number; alive: boolean })[],
  ): ShipEntity {
    const e = this._selfEntityScratch;
    e.id = bot.id;
    e.name = bot.name;
    e.pos.x = bot.pos.x;
    e.pos.z = bot.pos.z;
    e.vel.x = bot.vel.x;
    e.vel.z = bot.vel.z;
    e.rotation = bot.rotation;
    e.alive = bot.alive;
    e.hp = bot.hp;
    e.maxHp = bot.maxHp;
    e.dashCooldown = bot.dashCooldown;
    e.isDashing = bot.isDashing;
    e.kills = bot.kills;
    e.deaths = bot.deaths;
    e.damageDealt = bot.damageDealt;
    return e;
  }

  /** Return the team for any ship id (0 = player, team from playerTeam) */
  private getEntityTeam(id: number): Team {
    // Player always has a team now (both training and team mode use 3v3 teams).
    if (id === 0) return this.playerTeam;
    const bot = this.botShips.find(b => b.id === id);
    return bot ? bot.team : 'red';
  }

  private checkBotAsteroidCollision(bot: BotShip): void {
    for (const a of this.asteroidData) {
      if (!a.alive) continue;
      const dx = bot.pos.x - a.x;
      const dy = bot.pos.y - a.y;
      const dz = bot.pos.z - a.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const minDist = SHIP_RADIUS + a.radius;
      if (distSq < minDist * minDist && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;
        const overlap = minDist - dist;
        bot.pos.x += nx * overlap;
        bot.pos.y += ny * overlap;
        bot.pos.z += nz * overlap;
        const impactDot = bot.vel.x * nx + bot.vel.y * ny + bot.vel.z * nz;
        if (impactDot < 0) {
          bot.vel.x -= impactDot * nx;
          bot.vel.y -= impactDot * ny;
          bot.vel.z -= impactDot * nz;
        }
        const botSpeed = Math.sqrt(
          bot.vel.x * bot.vel.x + bot.vel.y * bot.vel.y + bot.vel.z * bot.vel.z,
        );
        if (botSpeed > 30 && performance.now() >= bot.invulnerableUntil) {
          const impact = Math.min(60, (botSpeed - 30) * 0.6);
          bot.hp -= impact;
          if (bot.hp <= 0) {
            bot.hp = 0;
            this.killBot(bot, null);
          }
        }
      }
    }
  }

  private fireBotBullet(bot: BotShip, dirX: number, dirY: number, dirZ: number): void {
    const idx = this.botBulletFreeList.pop();
    if (idx === undefined) return;

    let dx = dirX;
    let dy = dirY;
    let dz = dirZ;
    const len2 = dx * dx + dy * dy + dz * dz;
    if (len2 < 0.01) { dx = 0; dy = 0; dz = -1; }

    const b = this.botBullets[idx];
    b.x = bot.pos.x + dx * (SHIP_RADIUS + 3);
    b.y = bot.pos.y + dy * (SHIP_RADIUS + 3);
    b.z = bot.pos.z + dz * (SHIP_RADIUS + 3);
    b.vx = dx * this.BOT_BULLET_SPEED;
    b.vy = dy * this.BOT_BULLET_SPEED;
    b.vz = dz * this.BOT_BULLET_SPEED;
    b.age = 0;
    b.active = true;
    b.ownerId = bot.id;
    b.ownerTeam = bot.team;

    // Tint the laser beam by team color via per-instance InstancedMesh color.
    const teamColor = bot.team === 'red'
      ? _tempColor.setRGB(1.0, 0.3, 0.3)
      : bot.team === 'blue'
        ? _tempColor.setRGB(0.3, 0.6, 1.0)
        : _tempColor.setRGB(1.0, 0.7, 0.4); // neutral = warm amber
    this.botBulletMesh.setColorAt(idx, teamColor);
    if (this.botBulletMesh.instanceColor) {
      this.botBulletMesh.instanceColor.needsUpdate = true;
    }
  }

  private fireBotMissile(bot: BotShip, dirX: number, dirZ: number): void {
    const idx = this.missileFreeList.pop();
    if (idx === undefined) return;

    let dx = dirX;
    let dz = dirZ;
    if (dx === 0 && dz === 0) { dx = 0; dz = -1; }

    const m = this.missiles[idx];
    m.angle = Math.atan2(dx, -dz);
    m.x = bot.pos.x + dx * (SHIP_RADIUS + 5);
    m.z = bot.pos.z + dz * (SHIP_RADIUS + 5);
    m.vx = dx * this.MISSILE_SPEED;
    m.vz = dz * this.MISSILE_SPEED;
    m.age = 0;
    m.active = true;
    // Bot missile inherits the bot's current target so the player can tell
    // when a red missile is locked on them (HUD edge blinks).
    m.targetId = bot.brain.targetId;
    playSfx('arena-missile', 0.08); // quieter for bots
  }

  private updateBotBullets(dt: number): void {
    const dummy = _tempDummy;
    let needsUpdate = false;

    for (let i = 0; i < this.botBullets.length; i++) {
      const b = this.botBullets[i];
      if (!b.active) continue;

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
      b.age += dt;

      const distSq = b.x * b.x + b.z * b.z;
      if (
        b.age >= this.BOT_BULLET_LIFETIME ||
        distSq > (ARENA_HALF + 50) * (ARENA_HALF + 50) ||
        Math.abs(b.y) > ARENA_HEIGHT_HALF + 50
      ) {
        b.active = false;
        this.botBulletFreeList.push(i);
        dummy.position.set(0, -1000, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        this.botBulletMesh.setMatrixAt(i, dummy.matrix);
        needsUpdate = true;
        continue;
      }

      // Laser beam — orient cylinder local +Z along velocity (yaw + pitch).
      const horizSpd = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
      const yaw = Math.atan2(b.vx, b.vz);
      const pitch = Math.atan2(b.vy, horizSpd || 0.0001);
      dummy.position.set(b.x, b.y, b.z);
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(-pitch, yaw, 0);
      dummy.updateMatrix();
      this.botBulletMesh.setMatrixAt(i, dummy.matrix);
      needsUpdate = true;
    }

    if (needsUpdate) this.botBulletMesh.instanceMatrix.needsUpdate = true;
  }

  // ── Team Battle: collision — bot bullets vs ships ──────────────────────

  private checkBotBulletShipCollisions(): void {
    const dummy = _tempDummy;

    for (let bi = 0; bi < this.botBullets.length; bi++) {
      const b = this.botBullets[bi];
      if (!b.active) continue;

      // Check against bots first
      for (const bot of this.botShips) {
        if (!bot.alive) continue;
        if (bot.id === b.ownerId) continue;                // skip own ship
        // In team mode: no friendly fire; in FFA (neutral): hit anyone else
        if (b.ownerTeam !== 'neutral' && bot.team === b.ownerTeam) continue;

        const dx = b.x - bot.pos.x;
        const dy = b.y - bot.pos.y;
        const dz = b.z - bot.pos.z;
        const minDist = SHIP_SHOT_RADIUS + this.BOT_BULLET_RADIUS;
        if (dx * dx + dy * dy + dz * dz < minDist * minDist) {
          b.active = false;
          this.botBulletFreeList.push(bi);
          dummy.position.set(0, -1000, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          this.botBulletMesh.setMatrixAt(bi, dummy.matrix);
          this.botBulletMesh.instanceMatrix.needsUpdate = true;

          this.spawnHitEffect(b.x, b.z, b.y);

          // Find shooter bot to credit damage
          const shooterBot = this.botShips.find(s => s.id === b.ownerId);

          if (performance.now() >= bot.invulnerableUntil) {
            bot.hp -= this.BOT_BULLET_DAMAGE;
            if (shooterBot) shooterBot.damageDealt += this.BOT_BULLET_DAMAGE;
            if (bot.hp <= 0) {
              this.killBot(bot, shooterBot ?? null);
            }
          }
          break;
        }
      }

      if (!b.active) continue;

      // Check against player (in team mode: only enemies; in FFA: all bots)
      if (!this.playerDead && (b.ownerTeam === 'neutral' || b.ownerTeam !== this.playerTeam)) {
        const dx = b.x - this.playerPos.x;
        const dy = b.y - this.playerPos.y;
        const dz = b.z - this.playerPos.z;
        const minDist = SHIP_SHOT_RADIUS + this.BOT_BULLET_RADIUS;
        if (dx * dx + dy * dy + dz * dz < minDist * minDist) {
          b.active = false;
          this.botBulletFreeList.push(bi);
          dummy.position.set(0, -1000, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          this.botBulletMesh.setMatrixAt(bi, dummy.matrix);
          this.botBulletMesh.instanceMatrix.needsUpdate = true;

          this.spawnHitEffect(b.x, b.z, b.y);
          // Laser on the hull — small camera shake so the player feels
          // the hit. No screen blink: blinking is reserved for missile
          // threat warnings (see isPlayerLocked).
          this.shakeAmount = Math.max(this.shakeAmount, 3);

          if (performance.now() >= this.invulnerableUntil) {
            this.playerHp -= this.BOT_BULLET_DAMAGE;

            // Find shooter
            const shooterBot = this.botShips.find(s => s.id === b.ownerId);
            if (shooterBot) shooterBot.damageDealt += this.BOT_BULLET_DAMAGE;

            if (this.playerHp <= 0) {
              this.playerHp = 0;
              // Credit shooter with kill
              if (shooterBot) {
                shooterBot.kills++;
                if (this.teamMode && (shooterBot.team === 'blue' || shooterBot.team === 'red')) {
                  this.teamKills[shooterBot.team]++;
                }
                this.addKillFeed(shooterBot.name, 'PLAYER');
              }
              this.killPlayer();
            }
          }
        }
      }
    }
  }

  /** Player bullets hitting bots */
  private checkPlayerBulletBotCollisions(): void {
    const dummy = _tempDummy;

    for (let bi = 0; bi < this.bullets.length; bi++) {
      const b = this.bullets[bi];
      if (!b.active) continue;

      for (const bot of this.botShips) {
        if (!bot.alive) continue;
        // In team mode: skip allies; in FFA (neutral): all bots are targets
        if (this.teamMode && bot.team === this.playerTeam) continue;

        const dx = b.x - bot.pos.x;
        const dy = b.y - bot.pos.y;
        const dz = b.z - bot.pos.z;
        const minDist = SHIP_SHOT_RADIUS + this.BULLET_RADIUS;
        if (dx * dx + dy * dy + dz * dz < minDist * minDist) {
          // Deactivate bullet
          b.active = false;
          this.bulletFreeList.push(bi);
          dummy.position.set(0, -1000, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          this.bulletMeshes[b.meshIdx].setMatrixAt(b.instIdx, dummy.matrix);
          this.bulletMeshes[b.meshIdx].instanceMatrix.needsUpdate = true;

          this.spawnHitEffect(b.x, b.z, b.y);

          if (performance.now() >= bot.invulnerableUntil) {
            const dmg = this.BULLET_DAMAGE * this.playerDamageMult;
            bot.hp -= dmg;

            if (bot.hp <= 0) {
              this.killBot(bot, null); // player killed bot
              this.stats.kills++;
              this.stats.score += TEAM_SCORE_ENEMY_KILL;
              if (this.teamMode) {
                this.teamKills[this.playerTeam as 'blue' | 'red']++;
              }
              this.addKillFeed('PLAYER', bot.name);
            }
          }
          break; // bullet consumed
        }
      }
    }
  }

  /**
   * Bot-vs-bot physical collision: bots pushed apart + velocity cancelled along
   * the contact normal, and each takes proportional ram damage from impact
   * speed (same formula as ship-asteroid). Prevents bots from stacking on top
   * of each other while all chasing the same target. O(N²) over ≤9 bots.
   */
  private checkBotBotPhysicalCollisions(): void {
    if (this.botShips.length < 2) return;
    const rSum = SHIP_RADIUS * 2;
    for (let i = 0; i < this.botShips.length - 1; i++) {
      const a = this.botShips[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < this.botShips.length; j++) {
        const b = this.botShips[j];
        if (!b.alive) continue;
        // Friendly fire OFF — same-team bots separate without damage.
        const sameTeam = a.team !== 'neutral' && a.team === b.team;

        const dx = b.pos.x - a.pos.x;
        const dy = b.pos.y - a.pos.y;
        const dz = b.pos.z - a.pos.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq >= rSum * rSum || distSq < 0.01) continue;

        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;
        const overlap = rSum - dist;

        // Separate
        a.pos.x -= nx * overlap * 0.5;
        a.pos.y -= ny * overlap * 0.5;
        a.pos.z -= nz * overlap * 0.5;
        b.pos.x += nx * overlap * 0.5;
        b.pos.y += ny * overlap * 0.5;
        b.pos.z += nz * overlap * 0.5;

        // Cancel converging velocity component (3D)
        const dvx = a.vel.x - b.vel.x;
        const dvy = a.vel.y - b.vel.y;
        const dvz = a.vel.z - b.vel.z;
        const relN = dvx * nx + dvy * ny + dvz * nz;
        if (relN > 0) {
          a.vel.x -= relN * nx;
          a.vel.y -= relN * ny;
          a.vel.z -= relN * nz;
          b.vel.x += relN * nx;
          b.vel.y += relN * ny;
          b.vel.z += relN * nz;
        }

        // Ram damage (only enemy bots)
        if (sameTeam) continue;
        const relSpeed = Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz);
        if (relSpeed > 50) {
          const dmg = Math.min(40, (relSpeed - 50) * 0.4);
          const now = performance.now();
          const aVulnerable = now >= a.invulnerableUntil;
          const bVulnerable = now >= b.invulnerableUntil;
          if (aVulnerable) a.hp = Math.max(0, a.hp - dmg);
          if (bVulnerable) b.hp = Math.max(0, b.hp - dmg);
          const aDies = aVulnerable && a.hp <= 0;
          const bDies = bVulnerable && b.hp <= 0;
          // Mutual kamikaze → both teams get +1 credit for each kill.
          if (bDies) {
            this.killBot(b, a);
            if (a.team === 'blue' || a.team === 'red') this.teamKills[a.team]++;
          }
          if (aDies) {
            this.killBot(a, b);
            if (b.team === 'blue' || b.team === 'red') this.teamKills[b.team]++;
          }
        }
      }
    }
  }

  private checkPlayerBotPhysicalCollisions(): void {
    if (this.botShips.length === 0 || this.playerDead) return;

    for (const bot of this.botShips) {
      if (!bot.alive) continue;

      const dx = this.playerPos.x - bot.pos.x;
      const dy = this.playerPos.y - bot.pos.y;
      const dz = this.playerPos.z - bot.pos.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const rSum = SHIP_RADIUS * 2;

      if (distSq < rSum * rSum) {
        const dist = Math.sqrt(distSq);
        if (dist < 0.01) continue;
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;
        const overlap = rSum - dist;

        // Separate both ships in 3D
        this.playerPos.x += nx * overlap * 0.5;
        this.playerPos.y += ny * overlap * 0.5;
        this.playerPos.z += nz * overlap * 0.5;
        bot.pos.x -= nx * overlap * 0.5;
        bot.pos.y -= ny * overlap * 0.5;
        bot.pos.z -= nz * overlap * 0.5;

        // Relative speed for damage (3D, no velocity exchange)
        const dvx = this.playerVelX - bot.vel.x;
        const dvy = this.playerVelY - bot.vel.y;
        const dvz = this.playerVelZ - bot.vel.z;
        const relSpeed = Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz);
        if (relSpeed > 50) {
          const dmg = Math.min(40, (relSpeed - 50) * 0.4);
          const now = performance.now();

          // Apply damage first — we may need both fatalities for the +1/+1
          // kamikaze rule.
          const playerVulnerable = now >= this.invulnerableUntil;
          const botVulnerable = now >= bot.invulnerableUntil;

          if (playerVulnerable) this.playerHp = Math.max(0, this.playerHp - dmg);
          if (botVulnerable) bot.hp = Math.max(0, bot.hp - dmg);

          const playerDies = playerVulnerable && this.playerHp <= 0;
          const botDies = botVulnerable && bot.hp <= 0;

          // Credit: player kills bot (always on bot death) + if player also
          // died in the ram, bot's team gets credit for the player kill too
          // (mutual kamikaze = +1 each).
          if (botDies) {
            this.killBot(bot, null);
            this.stats.kills++;
            this.stats.score += TEAM_SCORE_ENEMY_KILL;
            // Both modes — training is 3v3 now, not FFA
            if (bot.team === 'red' || bot.team === 'blue') {
              this.teamKills[this.playerTeam as 'blue' | 'red']++;
            }
            this.addKillFeed('PLAYER', bot.name);
          }
          if (playerDies) {
            // Credit the opposing team with the kill even though killPlayer
            // wasn't passed an attacker.
            const enemyTeam: 'blue' | 'red' =
              this.playerTeam === 'blue' ? 'red' : 'blue';
            if (bot.team === enemyTeam || bot.team === 'blue' || bot.team === 'red') {
              this.teamKills[enemyTeam]++;
            }
            this.addKillFeed(bot.name, 'PLAYER');
            this.killPlayer();
          }
        }
      }
    }
  }

  private killBot(bot: BotShip, killer: BotShip | null): void {
    if (performance.now() < bot.invulnerableUntil) return; // invulnerable after respawn
    bot.alive = false;
    bot.hp = 0;
    bot.deaths++;
    bot.respawnTimer = BOT_RESPAWN_DELAY;
    bot.mesh.visible = false;
    bot.nickSprite.visible = false;

    this.spawnExplosion(bot.pos.x, bot.pos.z, bot.pos.y);

    if (killer) {
      killer.kills++;
      // Only track team kills in team mode (neutral has no team score)
      if (this.teamMode && (killer.team === 'blue' || killer.team === 'red')) {
        this.teamKills[killer.team]++;
      }
      this.addKillFeed(killer.name, bot.name);
    }
  }

  private respawnBot(bot: BotShip): void {
    const angle = Math.random() * Math.PI * 2;
    bot.pos.x = Math.cos(angle) * (ARENA_HALF * 0.65);
    bot.pos.z = Math.sin(angle) * (ARENA_HALF * 0.65);
    bot.vel.x = 0;
    bot.vel.z = 0;
    bot.hp = bot.maxHp;
    bot.alive = true;
    bot.respawnTimer = 0;
    bot.fireCooldown = 0.5;
    bot.invulnerableUntil = performance.now() + 3000; // 3 seconds invulnerability
    bot.brain.state = 'patrol';
    bot.brain.targetId = null;
    bot.mesh.visible = true;
    bot.nickSprite.visible = true;
    bot.mesh.position.set(bot.pos.x, bot.pos.y, bot.pos.z);
    bot.nickSprite.position.set(bot.pos.x, bot.pos.y + 15, bot.pos.z - 15);
  }

  private addKillFeed(killer: string, victim: string): void {
    this.killFeed.push({ killer, victim, time: Date.now() });
    if (this.killFeed.length > 5) this.killFeed.shift();
  }

  private checkTeamMatchEnd(): void {
    if (this.teamKills.blue < this.TEAM_KILL_LIMIT && this.teamKills.red < this.TEAM_KILL_LIMIT) return;

    this.phase = 'ended' as MatchPhase;

    const winningTeam: Team | 'draw' =
      this.teamKills.blue > this.teamKills.red ? 'blue' :
      this.teamKills.red  > this.teamKills.blue ? 'red' : 'draw';

    // Build player row
    const allPlayers = [
      {
        id: 0,
        name: 'PLAYER',
        team: this.playerTeam,
        kills: this.stats.kills,
        deaths: this.stats.deaths,
        damageDealt: 0,
        kdRatio: this.stats.deaths > 0 ? this.stats.kills / this.stats.deaths : this.stats.kills,
      },
      ...this.botShips.map(b => ({
        id: b.id,
        name: b.name,
        team: b.team,
        kills: b.kills,
        deaths: b.deaths,
        damageDealt: b.damageDealt,
        kdRatio: b.deaths > 0 ? b.kills / b.deaths : b.kills,
      })),
    ].sort((a, b2) => b2.kills - a.kills);

    const result: TeamMatchResult = {
      teamMode: true,
      playerTeam: this.playerTeam,
      winningTeam,
      blueKills: this.teamKills.blue,
      redKills: this.teamKills.red,
      allPlayers,
      kills: this.stats.kills,
      deaths: this.stats.deaths,
      damageDealt: 0,
      damageTaken: 0,
      survivalTime: 0,
      kdRatio: this.stats.deaths > 0 ? this.stats.kills / this.stats.deaths : this.stats.kills,
    };

    this.callbacks.onMatchEnd(result);
  }

  // ── Public getters (team mode) ─────────────────────────────────────────

  getTeamKills(): { blue: number; red: number } { return { ...this.teamKills }; }
  isTeamMode(): boolean { return this.teamMode; }
  getPlayerTeam(): Team { return this.playerTeam; }
  getKillFeed(): { killer: string; victim: string; time: number }[] { return [...this.killFeed]; }
  getBotShips(): { id: number; name: string; team: Team; hp: number; maxHp: number; alive: boolean }[] {
    return this.botShips.map(b => ({
      id: b.id, name: b.name, team: b.team,
      hp: b.hp, maxHp: b.maxHp, alive: b.alive,
    }));
  }

  /**
   * Snapshot of positions + aim for a top-down radar HUD.
   * Player is placed at (0,0,0) in radar space; bots are offset by their
   * position minus the player's, with the player's yaw zeroed out so
   * "up on radar" always means "ahead of the ship".
   */
  /**
   * Per-bot edge marker for the HUD perimeter indicator.
   * Each entry carries an off-screen direction (normalized screen-space
   * vector) OR null if the bot is already within the camera frustum. The
   * React layer decides which viewport side to clamp to.
   */
  private _edgeProjVec = new THREE.Vector3();
  getEdgeMarkers(): {
    id: number;
    team: Team;
    nx: number; ny: number; // -1..1 screen-space direction
    onScreen: boolean;
    shooting: boolean;       // blink if currently targeting player
    lockedOnPlayer: boolean; // this bot has a 100% lock on the player
  }[] {
    const out: { id: number; team: Team; nx: number; ny: number; onScreen: boolean; shooting: boolean; lockedOnPlayer: boolean }[] = [];
    const now = performance.now();
    for (const bot of this.botShips) {
      if (!bot.alive) continue;
      this._edgeProjVec.set(bot.pos.x, bot.pos.y, bot.pos.z);
      this._edgeProjVec.project(this.camera);
      // Also classify "behind camera" — project() gives z > 1 in that case.
      const behind = this._edgeProjVec.z > 1;
      const nx = this._edgeProjVec.x;
      const ny = -this._edgeProjVec.y; // flip so up on screen = -y CSS
      const onScreen = !behind && Math.abs(nx) < 1 && Math.abs(ny) < 1;
      // Crude "is this bot shooting at the player?" — bot's recent target is
      // player (id 0) and recent fire cooldown < 0.2s means they just fired.
      const shooting = bot.brain.targetId === 0 && bot.fireCooldown > 0 && bot.fireCooldown < 0.2;
      // Locked on: any missile in flight with targetId=bot — no, that's us
      // targeting them. Not tracked yet for bots targeting us.
      void now;
      out.push({
        id: bot.id,
        team: bot.team,
        nx: behind ? -nx : nx,
        ny: behind ? 1 : ny, // behind → force to bottom edge
        onScreen,
        shooting,
        lockedOnPlayer: false,
      });
    }
    return out;
  }

  getRadarSnapshot(): {
    aimYaw: number; // radians (0 = facing -Z world)
    player: { x: number; y: number; z: number };
    bots: { id: number; team: Team; alive: boolean; dx: number; dy: number; dz: number }[];
  } {
    return {
      aimYaw: Math.atan2(this.camAimX, this.camAimZ),
      player: { x: this.playerPos.x, y: this.playerPos.y, z: this.playerPos.z },
      bots: this.botShips.map(b => ({
        id: b.id,
        team: b.team,
        alive: b.alive,
        dx: b.pos.x - this.playerPos.x,
        dy: b.pos.y - this.playerPos.y,
        dz: b.pos.z - this.playerPos.z,
      })),
    };
  }

  // ── Public getters ─────────────────────────────────────────────────────

  getPhase(): MatchPhase { return this.phase; }
  getMatchTimer(): number { return this.matchTimer; }
  getCountdownTimer(): number { return this.countdownTimer; }
  isPlayerDead(): boolean { return this.playerDead; }
  getRespawnTimer(): number { return this.respawnTimer; }
  getMissileAmmo(): number { return this.missileAmmo; }
  getMissileReloadTimer(): number { return this.missileReloadTimer; }
  getMissileReloadTotal(): number { return this.MISSILE_RELOAD_TIME; }
  getArenaStats(): { kills: number; asteroidKills: number; deaths: number; score: number } {
    return { ...this.stats };
  }
  isWarpActive(): boolean { return this.warpActive; }
  getWarpCooldown(): number { return this.warpCooldownTimer; }
  getWarpCooldownTotal(): number { return this.WARP_COOLDOWN; }

  /** Normalized 0..1 player speed (capped). HUD uses it for the edge
   *  motion blur overlay so fast flight reads as speed. */
  getPlayerSpeedRatio(): number {
    const s = Math.sqrt(
      this.playerVelX ** 2 + this.playerVelY ** 2 + this.playerVelZ ** 2,
    );
    return Math.min(1, s / SHIP_MAX_SPEED);
  }

  /** True if the player is under missile threat — either (a) an enemy
   *  missile is already in flight with targetId = 0, or (b) an enemy bot
   *  is currently chasing the player with its missile cooldown almost
   *  ready (so a strike is seconds away). HUD uses this to blink the
   *  screen border as a "you're being hunted" warning. */
  isPlayerLocked(): boolean {
    // (a) missile already airborne toward the player
    for (const m of this.missiles) {
      if (m.active && m.targetId === 0) return true;
    }
    // (b) enemy bot targeting the player and about to fire a missile
    for (const bot of this.botShips) {
      if (!bot.alive) continue;
      if (bot.team === this.playerTeam) continue;
      if (bot.brain.targetId !== 0) continue;
      const ammo = bot.missileAmmo ?? 0;
      const cd = bot.missileCooldown ?? 0;
      if (ammo > 0 && cd < 1.2) return true;
    }
    return false;
  }

  /** Returns active power-up buffs with remaining time in ms */
  getPlayerBuffs(): { type: PowerUpType; remainingMs: number }[] {
    const now = Date.now();
    return this.playerBuffs
      .filter(b => b.expiresAt > now)
      .map(b => ({ type: b.type, remainingMs: b.expiresAt - now }));
  }

  getPowerUpBuffDurationMs(): number { return this.POWERUP_BUFF_DURATION_MS; }

  getLockState(): { targetId: number | null; progress: number; locked: boolean } {
    return {
      targetId: this.lockTarget,
      progress: Math.min(1, this.lockTimer / this.LOCK_TIME),
      locked: this.lockLocked,
    };
  }

  getBotScreenPos(botId: number): { x: number; y: number } | null {
    const bot = this.botShips.find(b => b.id === botId);
    if (!bot || !bot.alive) return null;
    const vec = new THREE.Vector3(bot.pos.x, 10, bot.pos.z);
    vec.project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: (vec.x * 0.5 + 0.5) * rect.width,
      y: (-vec.y * 0.5 + 0.5) * rect.height,
    };
  }
}
