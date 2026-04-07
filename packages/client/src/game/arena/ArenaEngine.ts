// ---------------------------------------------------------------------------
// ArenaEngine — main Three.js engine for Space Arena
// Pattern: class-based imperative (same as UniverseEngine)
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import type { ArenaCallbacks, InputState, ShipEntity, MatchPhase } from './ArenaTypes.js';
import {
  ARENA_SIZE, ARENA_HALF,
  CAMERA_FOV, CAMERA_HEIGHT, CAMERA_DISTANCE, CAMERA_LERP_SPEED,
  MAX_PIXEL_RATIO, STARFIELD_COUNT,
  BOT_COUNT, MATCH_DURATION, COUNTDOWN_SECONDS,
  ASTEROID_COUNT, ASTEROID_MIN_RADIUS, ASTEROID_MAX_RADIUS,
  SHIP_MAX_SPEED, SHIP_ACCELERATION, SHIP_DRAG, SHIP_RADIUS,
} from './ArenaConstants.js';

// Pre-allocated temp vectors — ZERO allocations in hot path
const _tempVec3 = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _tempDummy = new THREE.Object3D(); // shared matrix writer for InstancedMesh updates

const SHIP_FILES: Record<string, string> = {
  ship1: '/arena_ships/star_ship1.webp',
  ship2: '/arena_ships/star_ship2.webp',
  ship3: '/arena_ships/star_ship3.webp',
};

// Power-up types (mirrors server arena-matchmaker for Phase 2 compat)
export type PowerUpType = 'WARP' | 'DAMAGE_UP' | 'SLOW_LASER' | 'SHIELD';

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

  // Player ship
  private playerMesh!: THREE.Mesh;
  private playerVelX = 0;
  private playerVelZ = 0;
  private playerBankAngle = 0;
  private playerNickSprite!: THREE.Sprite;
  private playerDead = false;
  private respawnTimer = 0;
  private readonly RESPAWN_TIME = 5;
  private shipId: string;
  private stats = {
    kills: 0,         // total asteroids destroyed (bullets + missiles)
    missileKills: 0,  // subset: destroyed by missiles
    deaths: 0,        // player deaths (not shield-saves)
    score: 0,         // +10 per bullet kill, +30 per missile kill, -5 per death
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
  }[] = [];

  // Engine exhaust particles (InstancedMesh pool)
  private exhaustMesh!: THREE.InstancedMesh;
  private exhaustParticles: { x: number; z: number; vx: number; vz: number; age: number; active: boolean; scale: number }[] = [];
  private readonly EXHAUST_POOL = 60;
  private readonly EXHAUST_LIFETIME = 0.4;
  private exhaustSpawnTimer = 0;

  // Missiles (homing, limited turn rate, ammo-based)
  private missileMesh!: THREE.InstancedMesh;
  private missiles: { x: number; z: number; vx: number; vz: number; age: number; active: boolean; angle: number }[] = [];
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
  };

  // Active player buffs from collected power-ups
  private playerBuffs: { type: PowerUpType; expiresAt: number }[] = [];
  private playerSpeedMult = 1.0;
  private playerDamageMult = 1.0;
  private playerLaserColor: 'green' | 'red' | 'blue' = 'green';
  private playerExtraShield = 0; // absorbs one lethal hit while > 0
  private playerShieldMesh: THREE.Mesh | null = null;

  // Asteroids
  private asteroidMesh!: THREE.InstancedMesh;
  private asteroidData: { x: number; z: number; vx: number; vz: number; radius: number; rot: number; rotSpeed: number; hp: number; alive: boolean; respawnTimer: number }[] = [];

  // Bullets (pulse blaster) — InstancedMesh pool
  private bulletMesh!: THREE.InstancedMesh;
  private bullets: { x: number; z: number; vx: number; vz: number; age: number; active: boolean }[] = [];
  private readonly BULLET_POOL = 100;
  private readonly BULLET_SPEED = 800;
  private readonly BULLET_LIFETIME = 0.75;
  private readonly BULLET_RADIUS = 1.5;
  private readonly BULLET_DAMAGE = 15;
  private readonly FIRE_COOLDOWN = 0.25;
  private fireCooldownTimer = 0;
  private mouseDown = false;

  // Mouse aim
  private raycaster = new THREE.Raycaster();
  private aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private mouseNDC = new THREE.Vector2();
  private aimPoint = new THREE.Vector3(0, 0, 100);
  private _mouseHit = new THREE.Vector3(); // reused in onMouseMove (no GC)
  private playerAimAngle = 0;

  // Collision temp
  private readonly ASTEROID_HP_MAX = 5;

  // Mobile joystick input
  private mobileMove = { x: 0, z: 0 };
  private mobileAim = { x: 0, z: 0 };
  private mobileFiring = false;
  private isMobile = false;

  // Game state
  private phase: MatchPhase = 'waiting';
  private matchTimer = 0;
  private countdownTimer = 0;

  // Player ship position for camera follow
  private playerPos = new THREE.Vector3(0, 0, 0);

  // Input (set by ArenaControls)
  private input: InputState = { moveDir: { x: 0, z: 0 }, aimDir: { x: 0, z: 1 }, firing: false, dash: false };

  // Zoom
  private zoomLevel = 1.0;
  private readonly ZOOM_MIN = 0.4;
  private readonly ZOOM_MAX = 2.0;
  private readonly ZOOM_SPEED = 0.1;

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

  constructor(container: HTMLElement, callbacks: ArenaCallbacks, shipId: string = 'ship1') {
    this.container = container;
    this.callbacks = callbacks;
    this.shipId = shipId;
    this.onResizeBound = this.onResize.bind(this);
    this.onWheelBound = this.onWheel.bind(this);
    this.onKeyDownBound = (e: KeyboardEvent) => this.keys.add(e.key.toLowerCase());
    this.onKeyUpBound = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());
    this.onMouseMoveBound = this.onMouseMove.bind(this);
    this.onMouseDownBound = () => { this.mouseDown = true; };
    this.onMouseUpBound = () => { this.mouseDown = false; };
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  async init(): Promise<void> {
    this.setupRenderer();
    this.setupScene();
    this.setupCamera();
    this.setupFloor();
    this.setupBoundary();
    this.setupStarfield();
    this.setupLights();
    this.setupPlayerShip();
    this.setupAsteroids();
    this.setupBullets();
    this.setupExhaust();
    this.setupMissiles();
    this.setupHoloShield();

    window.addEventListener('resize', this.onResizeBound);
    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    this.renderer.domElement.addEventListener('wheel', this.onWheelBound, { passive: false });
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMoveBound);
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDownBound);
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUpBound);

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
    this.mobileAim = { x, z: y };
    this.mobileFiring = firing;
  }

  triggerDash(): void {
    if (this.playerDead) return;
    if (this.warpCooldownTimer > 0 || this.warpActive) return;
    this.warpActive = true;
    this.warpTimer = this.WARP_DURATION;
    this.warpCooldownTimer = this.WARP_COOLDOWN;
  }

  /** Gravity push — shove nearest asteroid in front of ship at 2x ship speed */
  triggerGravPush(): void {
    if (this.playerDead) return;
    const pushRange = SHIP_RADIUS * 5;
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
    // Circular arena boundary ring
    const segments = 64;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * ARENA_HALF,
        2,
        Math.sin(angle) * ARENA_HALF,
      ));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.5 });
    this.disposables.push(geo, mat);

    this.boundaryMesh = new THREE.LineLoop(geo, mat);
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
    const ambient = new THREE.AmbientLight(0x445566, 1.2);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xaabbcc, 1.0);
    dir.position.set(200, 500, 300);
    dir.castShadow = false; // NO shadows for mobile perf
    this.scene.add(dir);
  }

  private setupPlayerShip(): void {
    // 2D sprite ship — nose = top of image, ship selected via constructor shipId
    const loader = new THREE.TextureLoader();
    const shipFile = SHIP_FILES[this.shipId] ?? SHIP_FILES.ship1;
    const texture = loader.load(shipFile);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.disposables.push(texture);

    const size = SHIP_RADIUS * 3;
    const geo = new THREE.PlaneGeometry(size, size);
    geo.rotateX(-Math.PI / 2); // Bake rotation into geometry once — no per-frame rotation.x
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.5, // Fix Z-fighting with overlapping transparent sprites
      side: THREE.DoubleSide,
    });
    this.disposables.push(geo, mat);

    this.playerMesh = new THREE.Mesh(geo, mat);
    this.playerMesh.position.set(0, 5, 0);
    this.scene.add(this.playerMesh);

    // Nickname label above ship
    const nickCanvas = document.createElement('canvas');
    nickCanvas.width = 256;
    nickCanvas.height = 64;
    const nCtx = nickCanvas.getContext('2d')!;
    nCtx.fillStyle = 'transparent';
    nCtx.clearRect(0, 0, 256, 64);
    nCtx.font = '24px monospace';
    nCtx.fillStyle = '#aaddff';
    nCtx.textAlign = 'center';
    nCtx.fillText('PLAYER', 128, 40);
    const nickTex = new THREE.CanvasTexture(nickCanvas);
    this.disposables.push(nickTex);
    const nickMat = new THREE.SpriteMaterial({ map: nickTex, transparent: true, depthTest: false });
    this.disposables.push(nickMat);
    this.playerNickSprite = new THREE.Sprite(nickMat);
    this.playerNickSprite.scale.set(30, 8, 1);
    this.playerNickSprite.position.set(0, 20, 0);
    this.scene.add(this.playerNickSprite);
  }

  private setupAsteroids(): void {
    // InstancedMesh — 1 draw call for all asteroids
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.8, metalness: 0.2 });
    this.disposables.push(geo, mat);

    this.asteroidMesh = new THREE.InstancedMesh(geo, mat, ASTEROID_COUNT);
    this.asteroidMesh.castShadow = false;
    this.asteroidMesh.receiveShadow = false;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < ASTEROID_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 100 + Math.random() * (ARENA_HALF - 150);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const radius = ASTEROID_MIN_RADIUS + Math.random() * (ASTEROID_MAX_RADIUS - ASTEROID_MIN_RADIUS);
      const vAngle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 10;

      this.asteroidData.push({
        x, z,
        vx: Math.cos(vAngle) * speed,
        vz: Math.sin(vAngle) * speed,
        radius,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 2,
        hp: this.ASTEROID_HP_MAX,
        alive: true,
        respawnTimer: 0,
      });

      dummy.position.set(x, radius * 0.3, z);
      dummy.scale.set(radius, radius, radius);
      dummy.rotation.set(Math.random(), Math.random(), Math.random());
      dummy.updateMatrix();
      this.asteroidMesh.setMatrixAt(i, dummy.matrix);
    }
    this.asteroidMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.asteroidMesh);
  }

  private setupBullets(): void {
    const geo = new THREE.PlaneGeometry(1, 4);
    geo.rotateX(-Math.PI / 2); // lay flat on XZ plane (like ship)
    const mat = new THREE.MeshBasicMaterial({
      color: 0x44ff88,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.disposables.push(geo, mat);

    this.bulletMesh = new THREE.InstancedMesh(geo, mat, this.BULLET_POOL);
    this.bulletMesh.frustumCulled = false;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.BULLET_POOL; i++) {
      // Hide all bullets initially
      dummy.position.set(0, -1000, 0);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      this.bulletMesh.setMatrixAt(i, dummy.matrix);
      this.bullets.push({ x: 0, z: 0, vx: 0, vz: 0, age: 0, active: false });
    }
    this.bulletMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.bulletMesh);
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast to Y=0 plane (reuses this._mouseHit — zero GC)
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    if (this.raycaster.ray.intersectPlane(this.aimPlane, this._mouseHit)) {
      this.aimPoint.copy(this._mouseHit);
    }
  }

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
        }
        break;
      case 'playing':
        // Arena is a sandbox — no match end. matchTimer no longer ticks
        // down and phase never transitions to 'ended' (which would freeze
        // updatePlayer / updateShooting / updateWarp).
        this.updateDeathRespawn(dt);
        this.updateWarp(dt);
        if (!this.playerDead) {
          this.updatePlayer(dt);
          this.updateAim(dt);
          this.updateShooting(dt);
          this.updateExhaust(dt);
          this.checkPlayerAsteroidCollisions();
        }
        this.updateBullets(dt);
        this.updateMissiles(dt);
        this.updateAsteroids(dt);
        this.updateBlackHole(dt);
        this.updateVFX(dt);
        this.updatePowerUps(dt);
        this.checkBulletAsteroidCollisions();
        this.checkMissileAsteroidCollisions();
        break;
      default:
        break;
    }

    // Camera follows player with smooth damping + zoom
    _camTarget.set(this.playerPos.x, 0, this.playerPos.z);
    _tempVec3.set(
      this.playerPos.x,
      CAMERA_HEIGHT * this.zoomLevel,
      this.playerPos.z + CAMERA_DISTANCE * this.zoomLevel,
    );
    this.camera.position.lerp(_tempVec3, CAMERA_LERP_SPEED);
    this.camera.lookAt(_camTarget);
  }

  // ── Player movement (WASD) ──────────────────────────────────────────────

  private updatePlayer(dt: number): void {
    // Input: WASD (desktop) or mobile joystick
    let ax = 0, az = 0;
    if (this.isMobile) {
      ax = this.mobileMove.x;
      az = this.mobileMove.z;
    } else {
      if (this.keys.has('w') || this.keys.has('arrowup'))    az -= 1;
      if (this.keys.has('s') || this.keys.has('arrowdown'))  az += 1;
      if (this.keys.has('a') || this.keys.has('arrowleft'))  ax -= 1;
      if (this.keys.has('d') || this.keys.has('arrowright')) ax += 1;
    }

    // Normalize diagonal
    const len = Math.sqrt(ax * ax + az * az);
    if (len > 0) { ax /= len; az /= len; }

    // Accelerate (power-up speed multiplier applies to acceleration too)
    this.playerVelX += ax * SHIP_ACCELERATION * this.playerSpeedMult * dt;
    this.playerVelZ += az * SHIP_ACCELERATION * this.playerSpeedMult * dt;

    // Drag
    this.playerVelX *= SHIP_DRAG;
    this.playerVelZ *= SHIP_DRAG;

    // Warp: override velocity to forward direction at 2x speed (stacks with power-up)
    if (this.warpActive) {
      const warpSpeed = SHIP_MAX_SPEED * this.WARP_SPEED_MULT * this.playerSpeedMult;
      this.playerVelX = this.aimDirX * warpSpeed;
      this.playerVelZ = this.aimDirZ * warpSpeed;
    }

    // Clamp speed
    const maxSpd = this.warpActive
      ? SHIP_MAX_SPEED * this.WARP_SPEED_MULT * this.playerSpeedMult
      : SHIP_MAX_SPEED * this.playerSpeedMult;
    const speed = Math.sqrt(this.playerVelX ** 2 + this.playerVelZ ** 2);
    if (speed > maxSpd) {
      this.playerVelX = (this.playerVelX / speed) * maxSpd;
      this.playerVelZ = (this.playerVelZ / speed) * maxSpd;
    }

    // Move
    this.playerPos.x += this.playerVelX * dt;
    this.playerPos.z += this.playerVelZ * dt;

    // Arena boundary
    const dist = Math.sqrt(this.playerPos.x ** 2 + this.playerPos.z ** 2);
    if (dist > ARENA_HALF - SHIP_RADIUS) {
      const nx = this.playerPos.x / dist;
      const nz = this.playerPos.z / dist;
      this.playerPos.x = nx * (ARENA_HALF - SHIP_RADIUS);
      this.playerPos.z = nz * (ARENA_HALF - SHIP_RADIUS);
      // Reflect velocity
      const dot = this.playerVelX * nx + this.playerVelZ * nz;
      this.playerVelX -= 2 * dot * nx;
      this.playerVelZ -= 2 * dot * nz;
      this.playerVelX *= 0.5;
      this.playerVelZ *= 0.5;
    }

    // Update mesh + nickname position
    this.playerMesh.position.set(this.playerPos.x, 5, this.playerPos.z);
    this.playerNickSprite.position.set(this.playerPos.x, 20, this.playerPos.z - 15);
  }

  // ── Aim (mouse) ────────────────────────────────────────────────────────

  // Aim direction vector (normalized) — used by fireBullet & spawnExhaust
  private aimDirX = 0;
  private aimDirZ = -1; // default: facing forward (-Z)

  private updateAim(dt: number): void {
    const prevAngle = this.playerAimAngle;

    if (this.isMobile) {
      // Right joystick active → aim where it points
      const aimLen = Math.sqrt(this.mobileAim.x ** 2 + this.mobileAim.z ** 2);
      if (aimLen > 0.1) {
        this.aimDirX = this.mobileAim.x / aimLen;
        this.aimDirZ = this.mobileAim.z / aimLen;
      } else {
        // Right joystick idle → face movement direction (left joystick)
        const moveLen = Math.sqrt(this.mobileMove.x ** 2 + this.mobileMove.z ** 2);
        if (moveLen > 0.1) {
          this.aimDirX = this.mobileMove.x / moveLen;
          this.aimDirZ = this.mobileMove.z / moveLen;
        }
      }
    } else {
      const dx = this.aimPoint.x - this.playerPos.x;
      const dz = this.aimPoint.z - this.playerPos.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len > 1) {
        this.aimDirX = dx / len;
        this.aimDirZ = dz / len;
      }
    }

    // Rotation: after geo.rotateX(-PI/2), nose faces local -Z
    // To point nose toward (aimDirX, aimDirZ): rotation.y = atan2(-dirX, -dirZ)
    this.playerAimAngle = Math.atan2(this.aimDirX, this.aimDirZ);
    this.playerMesh.rotation.y = Math.atan2(-this.aimDirX, -this.aimDirZ);

    // Bank angle — visual tilt when turning sharply (only on Z axis, no X)
    let angleDelta = this.playerAimAngle - prevAngle;
    while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
    while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
    const targetBank = Math.max(-0.3, Math.min(0.3, -angleDelta * 3));
    this.playerBankAngle += (targetBank - this.playerBankAngle) * Math.min(1, dt * 8);
    // Note: rotation.z doesn't work well with baked geo.rotateX — skip bank for now
  }

  // ── Shooting ───────────────────────────────────────────────────────────

  private updateShooting(dt: number): void {
    this.fireCooldownTimer = Math.max(0, this.fireCooldownTimer - dt);
    const isFiring = this.isMobile ? this.mobileFiring : this.mouseDown;
    if (isFiring && this.fireCooldownTimer <= 0) {
      this.fireBullet();
      this.fireCooldownTimer = this.FIRE_COOLDOWN;
    }
  }

  private fireBullet(): void {
    const idx = this.bullets.findIndex(b => !b.active);
    if (idx === -1) return;

    // Use aim direction vector (already normalized)
    let dirX = this.aimDirX;
    let dirZ = this.aimDirZ;
    // Fallback if aim is zero: shoot forward based on ship rotation
    if (dirX === 0 && dirZ === 0) {
      dirX = Math.cos(this.playerMesh.rotation.y);
      dirZ = -Math.sin(this.playerMesh.rotation.y);
    }

    const b = this.bullets[idx];
    b.x = this.playerPos.x + dirX * (SHIP_RADIUS + 3);
    b.z = this.playerPos.z + dirZ * (SHIP_RADIUS + 3);
    b.vx = dirX * this.BULLET_SPEED;
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
      b.z += b.vz * dt;
      b.age += dt;

      // Deactivate if lifetime exceeded or out of arena
      const dist = Math.sqrt(b.x * b.x + b.z * b.z);
      if (b.age >= this.BULLET_LIFETIME || dist > ARENA_HALF + 50) {
        b.active = false;
        // Hide: scale 0, y=-1000
        dummy.position.set(0, -1000, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        this.bulletMesh.setMatrixAt(i, dummy.matrix);
        needsUpdate = true;
        continue;
      }

      // Update visible position
      dummy.position.set(b.x, 3, b.z);
      dummy.scale.set(1, 1, 1);
      // Orient beam along velocity direction using (x, -z) convention
      const beamAngle = Math.atan2(-b.vx, -b.vz);
      dummy.rotation.set(0, beamAngle, 0);
      dummy.updateMatrix();
      this.bulletMesh.setMatrixAt(i, dummy.matrix);
      needsUpdate = true;
    }

    if (needsUpdate) this.bulletMesh.instanceMatrix.needsUpdate = true;
  }

  // ── Collisions ─────────────────────────────────────────────────────────

  private checkPlayerAsteroidCollisions(): void {
    for (const a of this.asteroidData) {
      if (!a.alive) continue;
      const dx = this.playerPos.x - a.x;
      const dz = this.playerPos.z - a.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = SHIP_RADIUS + a.radius;
      if (dist < minDist && dist > 0) {
        const speed = Math.sqrt(this.playerVelX ** 2 + this.playerVelZ ** 2);
        if (speed > 80) {
          // High speed collision → death
          this.killPlayer();
          return;
        }
        // Low speed → bounce
        const nx = dx / dist;
        const nz = dz / dist;
        const overlap = minDist - dist;
        this.playerPos.x += nx * overlap;
        this.playerPos.z += nz * overlap;
        const dot = this.playerVelX * nx + this.playerVelZ * nz;
        if (dot < 0) {
          this.playerVelX -= 1.5 * dot * nx;
          this.playerVelZ -= 1.5 * dot * nz;
        }
        a.vx -= nx * 20;
        a.vz -= nz * 20;
      }
    }
  }

  private killPlayer(): void {
    // Holographic SHIELD power-up absorbs one lethal hit
    if (this.playerExtraShield > 0) {
      this.playerExtraShield = 0;
      this.playerBuffs = this.playerBuffs.filter(b => b.type !== 'SHIELD');
      this.applyBuffEffects(); // hides shield mesh
      // Visible shield-break flash
      this.spawnHitEffect(this.playerPos.x, this.playerPos.z);
      // Push back from impact
      this.playerVelX *= -0.4;
      this.playerVelZ *= -0.4;
      return; // survived the hit
    }

    // Player actually dies (shield did not absorb the hit)
    this.stats.deaths++;
    this.stats.score = Math.max(0, this.stats.score - 5);

    this.playerDead = true;
    this.respawnTimer = this.RESPAWN_TIME;
    this.playerMesh.visible = false;
    this.playerNickSprite.visible = false;
    // Clear all buffs on death
    this.playerBuffs = [];
    this.applyBuffEffects();
    // Spawn explosion VFX at death position
    this.spawnExplosion(this.playerPos.x, this.playerPos.z);
    this.playerVelX = 0;
    this.playerVelZ = 0;
  }

  private updateDeathRespawn(dt: number): void {
    if (!this.playerDead) return;
    this.respawnTimer -= dt;
    if (this.respawnTimer <= 0) {
      this.playerDead = false;
      // Respawn at random safe position on arena edge
      const angle = Math.random() * Math.PI * 2;
      this.playerPos.x = Math.cos(angle) * (ARENA_HALF * 0.7);
      this.playerPos.z = Math.sin(angle) * (ARENA_HALF * 0.7);
      this.playerVelX = 0;
      this.playerVelZ = 0;
      this.playerMesh.visible = true;
      this.playerNickSprite.visible = true;
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
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < a.radius + this.BULLET_RADIUS) {
          // Bullet hit asteroid — spawn hit VFX
          b.active = false;
          this.spawnHitEffect(b.x, b.z);
          dummy.position.set(0, -1000, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          this.bulletMesh.setMatrixAt(bi, dummy.matrix);
          this.bulletMesh.instanceMatrix.needsUpdate = true;

          a.hp -= this.playerDamageMult; // 1.0 normal, 1.5 with DAMAGE_UP buff
          if (a.hp <= 0) {
            // Destroy asteroid
            a.alive = false;
            a.respawnTimer = 10; // seconds
            this.stats.kills++;
            this.stats.score += 10;
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
          // Respawn at random edge
          const angle = Math.random() * Math.PI * 2;
          a.x = Math.cos(angle) * (ARENA_HALF - 50);
          a.z = Math.sin(angle) * (ARENA_HALF - 50);
          a.hp = this.ASTEROID_HP_MAX;
          a.alive = true;
          const vA = Math.random() * Math.PI * 2;
          a.vx = Math.cos(vA) * (5 + Math.random() * 10);
          a.vz = Math.sin(vA) * (5 + Math.random() * 10);
        } else {
          continue; // skip hidden asteroid
        }
      }

      a.x += a.vx * dt;
      a.z += a.vz * dt;
      a.rot += a.rotSpeed * dt;

      // Destroy asteroid that flies past arena bounds (pushed out by grav push,
      // black hole explosion, or drifted over the edge). Respawn on a fresh
      // random edge position after a short delay.
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

      dummy.position.set(a.x, a.radius * 0.3, a.z);
      dummy.scale.set(a.radius, a.radius, a.radius);
      dummy.rotation.set(a.rot * 0.3, a.rot, a.rot * 0.7);
      dummy.updateMatrix();
      this.asteroidMesh.setMatrixAt(i, dummy.matrix);
    }
    this.asteroidMesh.instanceMatrix.needsUpdate = true;
  }

  // ── Engine exhaust particles ─────────────────────────────────────────

  private setupExhaust(): void {
    const geo = new THREE.SphereGeometry(1.2, 3, 3);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.8 });
    this.disposables.push(geo, mat);

    this.exhaustMesh = new THREE.InstancedMesh(geo, mat, this.EXHAUST_POOL);
    this.exhaustMesh.frustumCulled = false;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.EXHAUST_POOL; i++) {
      dummy.position.set(0, -1000, 0);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      this.exhaustMesh.setMatrixAt(i, dummy.matrix);
      this.exhaustParticles.push({ x: 0, z: 0, vx: 0, vz: 0, age: 0, active: false, scale: 1 });
    }
    this.exhaustMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.exhaustMesh);
  }

  private spawnExhaust(): void {
    const idx = this.exhaustParticles.findIndex(p => !p.active);
    if (idx === -1) return;

    // Backward direction = inverted aim direction
    let backX = -this.aimDirX;
    let backZ = -this.aimDirZ;
    // Fallback
    if (backX === 0 && backZ === 0) {
      backX = -Math.cos(this.playerMesh.rotation.y);
      backZ = Math.sin(this.playerMesh.rotation.y);
    }

    const spread = (Math.random() - 0.5) * 0.4;
    const offsetDist = SHIP_RADIUS * 0.7;

    const p = this.exhaustParticles[idx];
    p.x = this.playerPos.x + backX * offsetDist + spread * backZ * 3;
    p.z = this.playerPos.z + backZ * offsetDist + spread * backX * 3;
    p.vx = backX * 60 + this.playerVelX * 0.3;
    p.vz = backZ * 60 + this.playerVelZ * 0.3;
    p.age = 0;
    p.scale = 0.8 + Math.random() * 0.4;
    p.active = true;
  }

  private updateExhaust(dt: number): void {
    // Spawn when thrusting
    const isThrusting = this.isMobile
      ? (Math.abs(this.mobileMove.x) > 0.1 || Math.abs(this.mobileMove.z) > 0.1)
      : (this.keys.has('w') || this.keys.has('a') || this.keys.has('s') || this.keys.has('d'));

    if (isThrusting) {
      this.exhaustSpawnTimer -= dt;
      if (this.exhaustSpawnTimer <= 0) {
        this.spawnExhaust();
        this.spawnExhaust(); // 2 per tick
        this.exhaustSpawnTimer = 0.03; // ~33 per second
      }
    }

    const dummy = _tempDummy;
    let needsUpdate = false;

    for (let i = 0; i < this.exhaustParticles.length; i++) {
      const p = this.exhaustParticles[i];
      if (!p.active) continue;

      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.age += dt;

      if (p.age >= this.EXHAUST_LIFETIME) {
        p.active = false;
        dummy.position.set(0, -1000, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        this.exhaustMesh.setMatrixAt(i, dummy.matrix);
        needsUpdate = true;
        continue;
      }

      // Shrink + fade over lifetime
      const t = p.age / this.EXHAUST_LIFETIME;
      const s = p.scale * (1 - t);
      dummy.position.set(p.x, 2, p.z);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      this.exhaustMesh.setMatrixAt(i, dummy.matrix);
      needsUpdate = true;
    }

    if (needsUpdate) this.exhaustMesh.instanceMatrix.needsUpdate = true;
  }

  // ── Homing missiles ─────────────────────────────────────────────────────

  private setupMissiles(): void {
    const geo = new THREE.ConeGeometry(1, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
    this.disposables.push(geo, mat);

    this.missileMesh = new THREE.InstancedMesh(geo, mat, this.MISSILE_POOL);
    this.missileMesh.frustumCulled = false;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.MISSILE_POOL; i++) {
      dummy.position.set(0, -1000, 0);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      this.missileMesh.setMatrixAt(i, dummy.matrix);
      this.missiles.push({ x: 0, z: 0, vx: 0, vz: 0, age: 0, active: false, angle: 0 });
    }
    this.missileMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.missileMesh);
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

    // Expire buffs
    const now = Date.now();
    const before = this.playerBuffs.length;
    this.playerBuffs = this.playerBuffs.filter(b => b.expiresAt > now);
    if (this.playerBuffs.length !== before) {
      this.applyBuffEffects();
    }

    // Sync holographic shield to player position
    if (this.playerShieldMesh && this.playerShieldMesh.visible) {
      this.playerShieldMesh.position.set(this.playerPos.x, 5, this.playerPos.z);
      this.playerShieldMesh.rotation.y += dt * 0.8;
    }
  }

  private collectPowerUp(index: number): void {
    const pu = this.powerUps[index];

    // Pickup VFX (reuses hit-effect ring)
    this.spawnHitEffect(pu.x, pu.z);

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

    // Update bullet color via shared material
    const bulletMat = this.bulletMesh.material as THREE.MeshBasicMaterial;
    const colorMap = { green: 0x44ff88, red: 0xff4444, blue: 0x4488ff };
    bulletMat.color.setHex(colorMap[this.playerLaserColor]);

    // Show / hide holographic shield
    if (this.playerShieldMesh) {
      this.playerShieldMesh.visible = hasShield;
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
    const idx = this.missiles.findIndex(m => !m.active);
    if (idx === -1) return;

    const m = this.missiles[idx];
    // Use (x, -z) convention to match velocity recalc + homing in updateMissiles
    m.angle = Math.atan2(this.aimDirX, -this.aimDirZ);
    // Use aim direction vector. Fallback decomposes ship rotation
    // (rotation.y = atan2(-dirX, -dirZ) → dirX = -sin, dirZ = -cos)
    const dirX = this.aimDirX || -Math.sin(this.playerMesh.rotation.y);
    const dirZ = this.aimDirZ || -Math.cos(this.playerMesh.rotation.y);
    m.x = this.playerPos.x + dirX * (SHIP_RADIUS + 5);
    m.z = this.playerPos.z + dirZ * (SHIP_RADIUS + 5);
    m.vx = dirX * this.MISSILE_SPEED;
    m.vz = dirZ * this.MISSILE_SPEED;
    m.age = 0;
    m.active = true;
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

    // Find nearest asteroid as homing target
    const findTarget = (mx: number, mz: number): { x: number; z: number } | null => {
      let best: { x: number; z: number } | null = null;
      let bestDist = 500; // max homing range
      for (const a of this.asteroidData) {
        if (!a.alive) continue;
        const d = Math.sqrt((mx - a.x) ** 2 + (mz - a.z) ** 2);
        if (d < bestDist) { bestDist = d; best = { x: a.x, z: a.z }; }
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
        dummy.position.set(0, -1000, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        this.missileMesh.setMatrixAt(i, dummy.matrix);
        needsUpdate = true;
        continue;
      }

      // Homing: limited turn rate toward nearest target
      const target = findTarget(m.x, m.z);
      if (target) {
        const desiredAngle = Math.atan2(target.x - m.x, -(target.z - m.z));
        let angleDiff = desiredAngle - m.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        const maxTurn = this.MISSILE_TURN_RATE * dt;
        if (Math.abs(angleDiff) > maxTurn) {
          m.angle += Math.sign(angleDiff) * maxTurn;
        } else {
          m.angle = desiredAngle;
        }
      }

      // Update velocity from angle
      m.vx = Math.sin(m.angle) * this.MISSILE_SPEED;
      m.vz = -Math.cos(m.angle) * this.MISSILE_SPEED;
      m.x += m.vx * dt;
      m.z += m.vz * dt;

      // Visual
      dummy.position.set(m.x, 4, m.z);
      dummy.scale.set(1.5, 1.5, 1.5);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.rotateY(m.angle);
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
        const dz = m.z - a.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < a.radius + this.MISSILE_RADIUS) {
          // Missile hit asteroid — AoE: damage all nearby asteroids
          m.active = false;
          dummy.position.set(0, -1000, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          this.missileMesh.setMatrixAt(mi, dummy.matrix);
          this.missileMesh.instanceMatrix.needsUpdate = true;

          // Splash damage in radius 30
          for (const a2 of this.asteroidData) {
            if (!a2.alive) continue;
            const d2 = Math.sqrt((m.x - a2.x) ** 2 + (m.z - a2.z) ** 2);
            if (d2 < 30) {
              a2.hp -= 3;
              if (a2.hp <= 0) {
                a2.alive = false;
                a2.respawnTimer = 10;
                this.stats.kills++;
                this.stats.missileKills++;
                this.stats.score += 30;
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

  private spawnHitEffect(x: number, z: number): void {
    const geo = new THREE.PlaneGeometry(8, 8);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x44ffaa,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 3, z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(mesh);
    this.vfxPool.push({ mesh, age: 0, life: 0.2, type: 'hit' });
  }

  private spawnExplosion(x: number, z: number): void {
    // Central flash
    const flashGeo = new THREE.PlaneGeometry(35, 35);
    flashGeo.rotateX(-Math.PI / 2);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 1,
    });
    const flashMesh = new THREE.Mesh(flashGeo, flashMat);
    flashMesh.position.set(x, 4, z);
    this.scene.add(flashMesh);
    this.vfxPool.push({ mesh: flashMesh, age: 0, life: 0.8, type: 'flash', scaleSpeed: 2.0 });

    // Debris cubes
    const debrisCount = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < debrisCount; i++) {
      const debGeo = new THREE.BoxGeometry(2, 2, 2);
      const debMat = new THREE.MeshBasicMaterial({ color: 0x444455 });
      const debMesh = new THREE.Mesh(debGeo, debMat);
      debMesh.position.set(x, 3, z);

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
        vfx.mesh.geometry.dispose();
        (vfx.mesh.material as THREE.Material).dispose();
        this.vfxPool.splice(i, 1);
        continue;
      }

      const t = vfx.age / vfx.life; // 0..1

      if (vfx.type === 'hit') {
        // Shrink + fade
        const s = 1 - t;
        vfx.mesh.scale.set(s, s, s);
        (vfx.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - t;
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
    const angle = Math.random() * Math.PI * 2;
    const dist = 200 + Math.random() * (ARENA_HALF - 400);
    this.blackHolePos.x = Math.cos(angle) * dist;
    this.blackHolePos.z = Math.sin(angle) * dist;
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

  // ── Public getters ─────────────────────────────────────────────────────

  getPhase(): MatchPhase { return this.phase; }
  getMatchTimer(): number { return this.matchTimer; }
  getCountdownTimer(): number { return this.countdownTimer; }
  isPlayerDead(): boolean { return this.playerDead; }
  getRespawnTimer(): number { return this.respawnTimer; }
  getMissileAmmo(): number { return this.missileAmmo; }
  getMissileReloadTimer(): number { return this.missileReloadTimer; }
  getMissileReloadTotal(): number { return this.MISSILE_RELOAD_TIME; }
  getArenaStats(): { kills: number; missileKills: number; deaths: number; score: number } {
    return { ...this.stats };
  }
  isWarpActive(): boolean { return this.warpActive; }
  getWarpCooldown(): number { return this.warpCooldownTimer; }
  getWarpCooldownTotal(): number { return this.WARP_COOLDOWN; }

  /** Returns active power-up buffs with remaining time in ms */
  getPlayerBuffs(): { type: PowerUpType; remainingMs: number }[] {
    const now = Date.now();
    return this.playerBuffs
      .filter(b => b.expiresAt > now)
      .map(b => ({ type: b.type, remainingMs: b.expiresAt - now }));
  }

  getPowerUpBuffDurationMs(): number { return this.POWERUP_BUFF_DURATION_MS; }
}
