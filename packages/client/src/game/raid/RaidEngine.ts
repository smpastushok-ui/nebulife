import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getDeviceTier } from '../../utils/device-tier.js';
import {
  RAID_ACCELERATION,
  RAID_ACTIVE_ENEMIES_HIGH,
  RAID_ACTIVE_ENEMIES_MID,
  RAID_ALLY_DAMAGE,
  RAID_ALLY_HP,
  RAID_ALLY_SHIELD,
  RAID_DRAG,
  RAID_DRONE_HP,
  RAID_ENEMY_DAMAGE,
  RAID_HEIGHT_HALF,
  RAID_PLAYER_HP,
  RAID_PLAYER_SHIELD,
  RAID_PROJECTILE_DAMAGE,
  RAID_PROJECTILE_LIFETIME,
  RAID_PROJECTILE_POOL_HIGH,
  RAID_PROJECTILE_POOL_MID,
  RAID_PROJECTILE_SPEED,
  RAID_REWARD_BASE_XP,
  RAID_REWARD_XP_PER_KILL,
  RAID_REWARD_XP_PER_MODULE,
  RAID_SECTOR_HALF,
  RAID_SHIELD_REGEN_DELAY,
  RAID_SHIELD_REGEN_RATE,
  RAID_SPEED,
  RAID_WAVES,
  RAID_WINGMEN,
} from './RaidConstants.js';
import type { RaidCallbacks, RaidModule, RaidPhase, RaidProjectile, RaidResult, RaidShip, RaidSnapshot, RaidTeam } from './RaidTypes.js';

const BLUE_SHIP = '/arena_ships/blue_ship.glb';
const RED_SHIP = '/arena_ships/red_ship.glb';
const CARRIER_BOSS = '/raid/carrier_boss.glb';
const ENEMY_SWARM_SHIP = '/raid/enemy_swarm_ship.glb';
const RAID_BACKGROUND = '/raid/raid_background.png';
const RAID_BACKGROUND_MOBILE = '/raid/raid_background_mobile.webp';

function shipUrlFromId(shipId: string): string {
  return shipId === 'red' || shipId === 'red_ship' ? RED_SHIP : BLUE_SHIP;
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) material.forEach(m => m.dispose());
    else material?.dispose();
  });
}

function clampLength(v: THREE.Vector3, max: number): void {
  const lenSq = v.lengthSq();
  if (lenSq > max * max) v.multiplyScalar(max / Math.sqrt(lenSq));
}

function normalizeModel(root: THREE.Object3D, targetSize: number): THREE.Group {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const longest = Math.max(size.x, size.y, size.z);
  const scale = longest > 0.001 ? targetSize / longest : 1;
  root.scale.setScalar(scale);
  root.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  const wrapper = new THREE.Group();
  wrapper.add(root);
  return wrapper;
}

export class RaidEngine {
  private readonly container: HTMLElement;
  private readonly callbacks: RaidCallbacks;
  private readonly shipId: string;
  private readonly tier = getDeviceTier();
  private readonly isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  private readonly maxProjectiles = this.isMobile
    ? 92
    : this.tier === 'high' || this.tier === 'ultra'
      ? RAID_PROJECTILE_POOL_HIGH
      : RAID_PROJECTILE_POOL_MID;
  private readonly maxActiveEnemies = this.isMobile
    ? (this.tier === 'high' || this.tier === 'ultra' ? 18 : 12)
    : this.tier === 'high' || this.tier === 'ultra'
      ? RAID_ACTIVE_ENEMIES_HIGH
      : RAID_ACTIVE_ENEMIES_MID;

  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private backgroundTexture: THREE.Texture | null = null;
  private clock = new THREE.Clock();
  private raf = 0;
  private destroyed = false;
  private ended = false;
  private startedAt = 0;
  private phase: RaidPhase = 'approach';

  private player: RaidShip | null = null;
  private wingmen: RaidShip[] = [];
  private enemies: RaidShip[] = [];
  private modules: RaidModule[] = [];
  private projectiles: RaidProjectile[] = [];
  private carrier: THREE.Object3D | null = null;
  private enemyTemplate: THREE.Object3D | null = null;
  private spawnBays: THREE.Vector3[] = [];
  private queuedEnemies = 0;
  private mouseMoveX = 0;
  private mouseMoveY = 0;
  private pointerLocked = false;
  private desktopLaserHeld = false;
  private mouseTargetYaw = 0;
  private mouseTargetPitch = 0;
  private mouseTargetReady = false;
  private aimDir = new THREE.Vector3(0, 0, -1);
  private shipRoll = 0;
  private barrelRollTimer = 0;
  private barrelRollCooldown = 0;
  private missileCooldown = 0;
  private keys = new Set<string>();
  private moveInput = new THREE.Vector3();
  private aimInput = new THREE.Vector3(0, 0, -1);
  private kills = 0;
  private modulesDestroyed = 0;
  private nextWaveIndex = 0;
  private sectorAction: 'center' | 'missile' | 'warp' | 'dodge' | 'gravity' = 'center';
  private snapshotTimer = 0;
  private readonly maxPitch = Math.PI * 0.42;
  private readonly mouseSens = 0.0023;
  private readonly turnFollow = 2.0;
  private readonly maxYawRate = 1.75;
  private readonly maxPitchRate = 1.05;
  private readonly maxRoll = Math.PI / 4;
  private readonly barrelRollDuration = 0.62;

  constructor(container: HTMLElement, callbacks: RaidCallbacks, shipId: string) {
    this.container = container;
    this.callbacks = callbacks;
    this.shipId = shipId;
  }

  async init(): Promise<void> {
    this.startedAt = performance.now();
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x020510, 5200, 16800);

    this.camera = new THREE.PerspectiveCamera(68, this.container.clientWidth / Math.max(1, this.container.clientHeight), 1, 24000);
    this.camera.position.set(0, 180, 820);

    this.renderer = new THREE.WebGLRenderer({ antialias: this.tier !== 'low', alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isMobile || this.tier === 'low' ? 1 : 1.4));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x020510, 1);
    this.container.appendChild(this.renderer.domElement);

    this.addLights();
    this.addBackground();
    this.addStarfield();
    await this.createCarrier();
    await this.preloadEnemyTemplate();
    this.createProjectiles();
    this.player = await this.createPlayerShip();
    if (this.destroyed || !this.scene) {
      disposeObject(this.player.mesh);
      return;
    }
    this.scene.add(this.player.mesh);
    this.createWingmen();

    if (this.destroyed || !this.scene) return;
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    this.renderer.domElement.addEventListener('mousedown', this.handleMouseDown);
    this.renderer.domElement.addEventListener('mouseup', this.handleMouseUp);
    this.renderer.domElement.addEventListener('contextmenu', this.preventContextMenu);
    this.clock.start();
    this.loop();
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    if (this.renderer) {
      this.renderer.domElement.removeEventListener('mousedown', this.handleMouseDown);
      this.renderer.domElement.removeEventListener('mouseup', this.handleMouseUp);
      this.renderer.domElement.removeEventListener('contextmenu', this.preventContextMenu);
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
    this.backgroundTexture?.dispose();
    if (this.scene) disposeObject(this.scene);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }

  setMobileMove(x: number, y: number): void {
    this.moveInput.set(x, 0, y);
  }

  setMobileAim(x: number, y: number, firing: boolean): void {
    this.aimInput.set(x, y * 0.35, -1).normalize();
    this.aimDir.copy(this.aimInput);
    if (firing) this.firePlayerBurst();
  }

  setMobileSector(sector: 'center' | 'missile' | 'warp' | 'dodge' | 'gravity'): void {
    this.sectorAction = sector;
    if (sector === 'missile') this.firePlayerBurst(true);
  }

  triggerDash(): void {
    if (!this.player || !this.player.alive) return;
    const forward = this.aimDir.clone().normalize();
    if (forward.lengthSq() === 0) forward.set(0, 0, -1);
    this.player.vel.addScaledVector(forward, 520);
  }

  fireMissile(): void {
    if (this.missileCooldown > 0) return;
    this.firePlayerBurst(true);
    this.missileCooldown = 0.55;
  }

  triggerBarrelRoll(): void {
    if (this.barrelRollCooldown > 0) return;
    this.barrelRollTimer = this.barrelRollDuration;
    this.barrelRollCooldown = 1.4;
  }

  getSnapshot(): RaidSnapshot {
    const reactor = this.modules.find(m => m.type === 'reactor_core');
    const objective = this.phase === 'reactor'
      ? 'raid.objective_reactor'
      : this.modules.some(m => m.type === 'shield_emitter' && m.alive)
        ? 'raid.objective_shields'
        : 'raid.objective_waves';
    return {
      phase: this.phase,
      elapsedSec: Math.floor((performance.now() - this.startedAt) / 1000),
      playerHp: Math.max(0, Math.ceil(this.player?.hp ?? 0)),
      playerMaxHp: this.player?.maxHp ?? RAID_PLAYER_HP,
      playerShield: Math.max(0, Math.ceil(this.player?.shield ?? 0)),
      playerMaxShield: this.player?.maxShield ?? RAID_PLAYER_SHIELD,
      alliedAlive: this.wingmen.filter(w => w.alive).length + (this.player?.alive ? 1 : 0),
      enemiesActive: this.enemies.filter(e => e.alive).length,
      kills: this.kills,
      modulesDestroyed: this.modulesDestroyed,
      modulesTotal: this.modules.length,
      reactorHp: Math.max(0, Math.ceil(reactor?.hp ?? 0)),
      reactorMaxHp: reactor?.maxHp ?? 1,
      objective,
    };
  }

  private readonly handleResize = (): void => {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = this.container.clientWidth / Math.max(1, this.container.clientHeight);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  };

  private readonly handleKeyDown = (e: KeyboardEvent): void => {
    const key = this.controlKeyFromEvent(e);
    this.keys.add(key);
    if (key === ' ' || key === 'shift') this.triggerDash();
    if (key === 'tab') {
      e.preventDefault();
      this.triggerBarrelRoll();
    }
  };

  private readonly handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(this.controlKeyFromEvent(e));
  };

  private controlKeyFromEvent(e: KeyboardEvent): string {
    switch (e.code) {
      case 'KeyW': return 'w';
      case 'KeyA': return 'a';
      case 'KeyS': return 's';
      case 'KeyD': return 'd';
      case 'KeyQ': return 'q';
      case 'KeyE': return 'e';
      default: return e.key.toLowerCase();
    }
  }

  private readonly handleMouseMove = (e: MouseEvent): void => {
    if (!this.pointerLocked) return;
    this.mouseMoveX += e.movementX || 0;
    this.mouseMoveY += e.movementY || 0;
  };

  private readonly handlePointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.renderer?.domElement;
    if (!this.pointerLocked) this.desktopLaserHeld = false;
  };

  private readonly preventContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private readonly handleMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
    this.renderer?.domElement.requestPointerLock?.();
    if (e.button === 0) this.desktopLaserHeld = true;
    if (e.button === 2) this.fireMissile();
  };

  private readonly handleMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) this.desktopLaserHeld = false;
  };

  private addLights(): void {
    if (!this.scene) return;
    this.scene.add(new THREE.AmbientLight(0x667788, this.isMobile ? 1.55 : 1.3));
    const key = new THREE.DirectionalLight(0xddeeff, 2.6);
    key.position.set(900, 1400, 700);
    this.scene.add(key);
    if (!this.isMobile) {
      const rim = new THREE.PointLight(0x4488aa, 6, 6000);
      rim.position.set(-1100, 500, -1800);
      this.scene.add(rim);
    }
  }

  private addBackground(): void {
    if (!this.scene) return;
    const loader = new THREE.TextureLoader();
    this.backgroundTexture = loader.load(this.isMobile ? RAID_BACKGROUND_MOBILE : RAID_BACKGROUND, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.mapping = THREE.EquirectangularReflectionMapping;
      if (this.scene) this.scene.background = texture;
    });
  }

  private addStarfield(): void {
    if (!this.scene) return;
    const count = this.isMobile ? 240 : this.tier === 'low' ? 420 : 820;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 26000;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 5200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 26000;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0x8899aa, size: 8, sizeAttenuation: true });
    this.scene.add(new THREE.Points(geo, mat));
  }

  private async createPlayerShip(): Promise<RaidShip> {
    const mesh = await this.loadPlayerMesh();
    mesh.position.set(0, 0, 1450);
    mesh.scale.setScalar(1.2);
    return {
      id: 1,
      team: 'allied',
      name: 'PLAYER',
      pos: mesh.position,
      vel: new THREE.Vector3(),
      hp: RAID_PLAYER_HP,
      maxHp: RAID_PLAYER_HP,
      shield: RAID_PLAYER_SHIELD,
      maxShield: RAID_PLAYER_SHIELD,
      radius: 28,
      fireCooldown: 0,
      shieldDelay: 0,
      alive: true,
      mesh,
    };
  }

  private async loadPlayerMesh(): Promise<THREE.Object3D> {
    try {
      const gltf = await new GLTFLoader().loadAsync(shipUrlFromId(this.shipId));
      const root = gltf.scene;
      root.traverse((obj) => {
        obj.frustumCulled = true;
      });
      root.rotation.y = Math.PI;
      root.scale.setScalar(36);
      return root;
    } catch {
      return this.createProceduralShip(0x4488aa, 36);
    }
  }

  private createProceduralShip(color: number, scale: number): THREE.Group {
    const group = new THREE.Group();
    const hull = new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.42 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x0a0f19, metalness: 0.65, roughness: 0.4 });
    const glow = new THREE.MeshBasicMaterial({ color: 0x7bb8ff });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.42, 2.2), hull);
    group.add(body);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.1, 4), hull);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = -1.48;
    group.add(nose);
    for (const side of [-1, 1]) {
      const nacelle = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 1.55), dark);
      nacelle.position.set(side * 0.95, 0, 0.12);
      group.add(nacelle);
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.14, 0.32), hull);
      strut.position.set(side * 0.55, -0.03, -0.24);
      group.add(strut);
    }
    const bridge = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 6), glow);
    bridge.scale.set(1.1, 0.38, 0.9);
    bridge.position.set(0, 0.28, -0.52);
    group.add(bridge);
    group.scale.setScalar(scale);
    return group;
  }

  private async preloadEnemyTemplate(): Promise<void> {
    try {
      const gltf = await new GLTFLoader().loadAsync(ENEMY_SWARM_SHIP);
      const root = normalizeModel(gltf.scene, 70);
      root.traverse((obj) => {
        obj.frustumCulled = true;
      });
      this.enemyTemplate = root;
    } catch {
      this.enemyTemplate = null;
    }
  }

  private cloneEnemyShip(): THREE.Object3D {
    if (this.enemyTemplate) {
      const clone = this.enemyTemplate.clone(true);
      clone.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.castShadow = false;
          obj.receiveShadow = false;
          obj.frustumCulled = true;
        }
      });
      clone.scale.multiplyScalar(this.isMobile ? 0.82 : 1);
      return clone;
    }
    return this.createDrone(0xaa5533);
  }

  private createDrone(color = 0xaa5533): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.5 });
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(18, 0), mat);
    group.add(core);
    const wingGeo = new THREE.BoxGeometry(42, 6, 14);
    const left = new THREE.Mesh(wingGeo, mat);
    left.position.x = -28;
    const right = new THREE.Mesh(wingGeo, mat);
    right.position.x = 28;
    group.add(left, right);
    return group;
  }

  private createWingmen(): void {
    if (!this.scene) return;
    for (let i = 0; i < RAID_WINGMEN; i++) {
      const mesh = this.createProceduralShip(i % 2 === 0 ? 0x334455 : 0x446688, 26);
      mesh.position.set((i - 1.5) * 150, i % 2 === 0 ? 55 : -35, 1230 - Math.abs(i - 1.5) * 55);
      this.scene.add(mesh);
      this.wingmen.push({
        id: 10 + i,
        team: 'allied',
        name: `WING-${i + 1}`,
        pos: mesh.position,
        vel: new THREE.Vector3(),
        hp: RAID_ALLY_HP,
        maxHp: RAID_ALLY_HP,
        shield: RAID_ALLY_SHIELD,
        maxShield: RAID_ALLY_SHIELD,
        radius: 22,
        fireCooldown: 0.2 + i * 0.1,
        shieldDelay: 0,
        alive: true,
        mesh,
      });
    }
  }

  private async createCarrier(): Promise<void> {
    if (!this.scene) return;
    try {
      const gltf = await new GLTFLoader().loadAsync(CARRIER_BOSS);
      const root = normalizeModel(gltf.scene, 2600);
      root.position.set(0, 0, 0);
      root.traverse((obj) => {
        obj.frustumCulled = true;
      });
      this.scene.add(root);
      this.carrier = root;
      this.createCarrierModules(root);
      return;
    } catch {
      // Missing generated model is expected while developing; procedural
      // carrier keeps the raid playable until the GLB is dropped into public.
    }
    const carrier = new THREE.Group();
    carrier.position.set(0, 0, 0);
    const hull = new THREE.MeshStandardMaterial({ color: 0x1b2532, metalness: 0.7, roughness: 0.38 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x070b12, metalness: 0.55, roughness: 0.5 });
    const glow = new THREE.MeshBasicMaterial({ color: 0x4488aa });
    const main = new THREE.Mesh(new THREE.BoxGeometry(1600, 260, 2600), hull);
    carrier.add(main);
    const spine = new THREE.Mesh(new THREE.BoxGeometry(620, 360, 1900), dark);
    spine.position.y = 180;
    carrier.add(spine);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(480, 680, 4), hull);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = -1640;
    carrier.add(nose);
    for (const side of [-1, 1]) {
      const bay = new THREE.Mesh(new THREE.BoxGeometry(420, 180, 460), dark);
      bay.position.set(side * 980, -120, -260);
      carrier.add(bay);
      this.modules.push(this.createModule(`hangar_${side}`, 'hangar_bay', 'Hangar Bay', 180, new THREE.Vector3(side * 980, -120, -260), bay));
      this.spawnBays.push(new THREE.Vector3(side * 980, -260, -260));
      const shield = new THREE.Mesh(new THREE.SphereGeometry(150, 14, 8), glow);
      shield.position.set(side * 560, 260, 420);
      carrier.add(shield);
      this.modules.push(this.createModule(`shield_${side}`, 'shield_emitter', 'Shield Emitter', 150, new THREE.Vector3(side * 560, 260, 420), shield));
      const turret = new THREE.Mesh(new THREE.CylinderGeometry(55, 75, 130, 10), hull);
      turret.position.set(side * 460, 260, -780);
      carrier.add(turret);
      this.modules.push(this.createModule(`turret_${side}`, 'turret_cluster', 'Turret Cluster', 120, new THREE.Vector3(side * 460, 260, -780), turret));
    }
    const reactor = new THREE.Mesh(new THREE.SphereGeometry(230, 18, 10), glow);
    reactor.position.set(0, 0, 980);
    carrier.add(reactor);
    this.modules.push(this.createModule('reactor', 'reactor_core', 'Reactor Core', 420, new THREE.Vector3(0, 0, 980), reactor));
    this.scene.add(carrier);
    this.carrier = carrier;
  }

  private createCarrierModules(root: THREE.Object3D): void {
    const specs: Array<[string, RaidModule['type'], string, number, THREE.Vector3, number]> = [
      ['hangar_-1', 'hangar_bay', 'Hangar Bay', 180, new THREE.Vector3(-980, -260, -280), 150],
      ['hangar_1', 'hangar_bay', 'Hangar Bay', 180, new THREE.Vector3(980, -260, -280), 150],
      ['shield_-1', 'shield_emitter', 'Shield Emitter', 150, new THREE.Vector3(-560, 280, 420), 160],
      ['shield_1', 'shield_emitter', 'Shield Emitter', 150, new THREE.Vector3(560, 280, 420), 160],
      ['turret_-1', 'turret_cluster', 'Turret Cluster', 120, new THREE.Vector3(-460, 260, -780), 120],
      ['turret_1', 'turret_cluster', 'Turret Cluster', 120, new THREE.Vector3(460, 260, -780), 120],
      ['reactor', 'reactor_core', 'Reactor Core', 420, new THREE.Vector3(0, 0, 980), 240],
    ];
    for (const [id, type, label, hp, pos, radius] of specs) {
      this.modules.push({ id, type, label, hp, maxHp: hp, radius, pos, mesh: root, alive: true, fireCooldown: 1.5 });
    }
    this.spawnBays.push(new THREE.Vector3(-980, -340, -280), new THREE.Vector3(980, -340, -280));
  }

  private createModule(id: string, type: RaidModule['type'], label: string, hp: number, worldPos: THREE.Vector3, mesh: THREE.Object3D): RaidModule {
    return { id, type, label, hp, maxHp: hp, radius: type === 'reactor_core' ? 240 : 130, pos: worldPos, mesh, alive: true, fireCooldown: 1.5 };
  }

  private createProjectiles(): void {
    if (!this.scene) return;
    const geo = new THREE.CylinderGeometry(2.5, 2.5, 34, 8);
    geo.rotateX(Math.PI / 2);
    for (let i = 0; i < this.maxProjectiles; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x7bb8ff });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.projectiles.push({
        active: false,
        team: 'allied',
        damage: RAID_PROJECTILE_DAMAGE,
        age: 0,
        lifetime: RAID_PROJECTILE_LIFETIME,
        radius: 8,
        pos: mesh.position,
        vel: new THREE.Vector3(),
        mesh,
      });
    }
  }

  private loop = (): void => {
    if (this.destroyed || !this.renderer || !this.scene || !this.camera) return;
    const dt = Math.min(0.033, this.clock.getDelta());
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    if (!this.player || this.ended) return;
    const elapsed = (performance.now() - this.startedAt) / 1000;
    if (elapsed > 3 && this.phase === 'approach') this.phase = 'waves';
    this.updateAim(dt);
    this.updatePlayer(dt);
    this.updateWingmen(dt);
    this.updateWaves(elapsed);
    this.updateEnemies(dt);
    this.updateModules(dt);
    this.updateProjectiles(dt);
    this.updateCamera(dt);
    this.snapshotTimer += dt;
    if (this.snapshotTimer > 0.2) {
      this.snapshotTimer = 0;
      this.callbacks.onStatsUpdate?.(this.getSnapshot());
    }
    if (!this.player.alive) this.finish(false);
    const reactor = this.modules.find(m => m.type === 'reactor_core');
    if (reactor && !reactor.alive) this.finish(true);
  }

  private updatePlayer(dt: number): void {
    if (!this.player || !this.player.alive) return;
    this.missileCooldown = Math.max(0, this.missileCooldown - dt);
    if (this.barrelRollTimer > 0) this.barrelRollTimer -= dt;
    if (this.barrelRollCooldown > 0) this.barrelRollCooldown -= dt;

    const forward = this.aimDir.clone().normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    if (right.lengthSq() < 0.01) right.set(1, 0, 0);
    const dir = new THREE.Vector3();
    if (this.keys.has('w') || this.keys.has('arrowup')) dir.add(forward);
    if (this.keys.has('s') || this.keys.has('arrowdown')) dir.addScaledVector(forward, -0.6);
    if (this.keys.has('a') || this.keys.has('arrowleft')) dir.addScaledVector(right, -0.75);
    if (this.keys.has('d') || this.keys.has('arrowright')) dir.addScaledVector(right, 0.75);
    dir.add(this.moveInput);
    if (dir.lengthSq() > 1) dir.normalize();
    this.player.vel.addScaledVector(dir, RAID_ACCELERATION * dt);
    clampLength(this.player.vel, RAID_SPEED);
    this.player.pos.addScaledVector(this.player.vel, dt);
    this.player.vel.multiplyScalar(Math.pow(RAID_DRAG, dt * 60));
    this.clampToSector(this.player.pos);
    this.updateShield(this.player, dt);
    this.orientObjectToDirection(this.player.mesh, this.aimDir, this.shipRoll + this.currentBarrelRoll());
    const target = this.findAimTarget(2100, 0.96);
    if (this.desktopLaserHeld || this.sectorAction === 'missile') {
      this.player.fireCooldown -= dt;
      if (this.player.fireCooldown <= 0) {
        if (target) this.fireProjectile('allied', this.player.pos, target.pos, RAID_PROJECTILE_DAMAGE);
        else this.fireProjectileDir('allied', this.player.pos, this.aimDir, RAID_PROJECTILE_DAMAGE);
        this.player.fireCooldown = this.sectorAction === 'missile' ? 0.12 : 0.18;
      }
    }
  }

  private updateAim(dt: number): void {
    if (!this.player) return;
    const curPitch = Math.asin(Math.max(-1, Math.min(1, this.aimDir.y)));
    const curYaw = Math.atan2(this.aimDir.x, -this.aimDir.z);
    if (this.pointerLocked) {
      if (!this.mouseTargetReady) {
        this.mouseTargetYaw = curYaw;
        this.mouseTargetPitch = curPitch;
        this.mouseTargetReady = true;
      }
      this.mouseTargetYaw += this.mouseMoveX * this.mouseSens;
      this.mouseTargetPitch += this.mouseMoveY * this.mouseSens;
      this.mouseTargetPitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.mouseTargetPitch));
      let yawDelta = this.mouseTargetYaw - curYaw;
      while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
      while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
      const pitchDelta = this.mouseTargetPitch - curPitch;
      const follow = Math.min(1, dt * this.turnFollow);
      const yawStep = Math.max(-this.maxYawRate * dt, Math.min(this.maxYawRate * dt, yawDelta * follow));
      const pitchStep = Math.max(-this.maxPitchRate * dt, Math.min(this.maxPitchRate * dt, pitchDelta * follow));
      const newYaw = curYaw + yawStep;
      const newPitch = curPitch + pitchStep;
      const targetRoll = Math.max(-this.maxRoll, Math.min(this.maxRoll, -yawDelta * 1.25));
      this.shipRoll += (targetRoll - this.shipRoll) * Math.min(1, dt * 2.2);
      const cp = Math.cos(newPitch);
      this.aimDir.set(Math.sin(newYaw) * cp, Math.sin(newPitch), -Math.cos(newYaw) * cp).normalize();
      this.mouseMoveX = 0;
      this.mouseMoveY = 0;
    } else {
      this.mouseTargetReady = false;
      const keyboardYaw = (this.keys.has('e') ? 1 : 0) - (this.keys.has('q') ? 1 : 0);
      if (keyboardYaw !== 0) {
        const newYaw = curYaw + keyboardYaw * this.maxYawRate * dt;
        const cp = Math.cos(curPitch);
        this.aimDir.set(Math.sin(newYaw) * cp, Math.sin(curPitch), -Math.cos(newYaw) * cp).normalize();
      }
      this.shipRoll += (0 - this.shipRoll) * Math.min(1, dt * 3);
    }
    this.aimInput.copy(this.aimDir);
  }

  private updateWingmen(dt: number): void {
    if (!this.player) return;
    for (let i = 0; i < this.wingmen.length; i++) {
      const wing = this.wingmen[i];
      if (!wing.alive) continue;
      const angle = performance.now() * 0.00025 + i * Math.PI * 0.5;
      const desired = this.player.pos.clone().add(new THREE.Vector3(
        (i - 1.5) * 160 + Math.cos(angle) * 45,
        (i - 1.5) * 36,
        -240 + Math.sin(angle) * 55,
      ));
      wing.vel.addScaledVector(desired.sub(wing.pos), dt * 1.2);
      clampLength(wing.vel, RAID_SPEED * 0.82);
      wing.pos.addScaledVector(wing.vel, dt);
      wing.vel.multiplyScalar(Math.pow(0.9, dt * 60));
      this.updateShield(wing, dt);
      const target = this.findNearestTarget(wing.pos, 1600);
      if (target) {
        this.lookAt(wing.mesh, target.pos);
        wing.fireCooldown -= dt;
        if (wing.fireCooldown <= 0) {
          this.fireProjectile('allied', wing.pos, target.pos, RAID_ALLY_DAMAGE);
          wing.fireCooldown = 0.45 + i * 0.05;
        }
      }
    }
  }

  private updateWaves(elapsed: number): void {
    while (this.nextWaveIndex < RAID_WAVES.length && elapsed >= RAID_WAVES[this.nextWaveIndex].at) {
      this.queuedEnemies += RAID_WAVES[this.nextWaveIndex].count;
      this.nextWaveIndex++;
    }
    this.spawnQueuedEnemies();
    const shieldsDown = !this.modules.some(m => m.type === 'shield_emitter' && m.alive);
    if (shieldsDown && this.phase === 'waves') this.phase = 'reactor';
  }

  private spawnQueuedEnemies(): void {
    if (!this.scene) return;
    const active = this.enemies.filter(e => e.alive).length;
    const room = Math.max(0, this.maxActiveEnemies - active);
    const count = Math.min(this.queuedEnemies, room, this.isMobile ? 2 : 4);
    for (let i = 0; i < count; i++) {
      const mesh = this.cloneEnemyShip();
      const bay = this.spawnBays[(this.enemies.length + i) % Math.max(1, this.spawnBays.length)] ?? new THREE.Vector3(0, -260, -300);
      mesh.position.copy(bay).add(new THREE.Vector3(
        (Math.random() - 0.5) * 220,
        (Math.random() - 0.5) * 120,
        (Math.random() - 0.5) * 220,
      ));
      this.scene.add(mesh);
      this.enemies.push({
        id: 100 + this.enemies.length,
        team: 'enemy',
        name: 'DRONE',
        pos: mesh.position,
        vel: new THREE.Vector3(),
        hp: RAID_DRONE_HP,
        maxHp: RAID_DRONE_HP,
        shield: 0,
        maxShield: 0,
        radius: 22,
        fireCooldown: 0.8 + Math.random() * 1.1,
        shieldDelay: 0,
        alive: true,
        mesh,
      });
      this.queuedEnemies--;
    }
  }

  private updateEnemies(dt: number): void {
    if (!this.player) return;
    const allies = [this.player, ...this.wingmen].filter(s => s.alive);
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const target = this.nearestShip(enemy.pos, allies);
      if (!target) continue;
      const desired = target.pos.clone().sub(enemy.pos);
      const dist = desired.length();
      const toTarget = desired.lengthSq() > 0.01 ? desired.normalize() : new THREE.Vector3(0, 0, 1);
      const orbit = new THREE.Vector3(-toTarget.z, Math.sin(performance.now() * 0.001 + enemy.id) * 0.18, toTarget.x).normalize();
      if (dist > 420) enemy.vel.addScaledVector(toTarget, 430 * dt);
      else if (dist < 230) enemy.vel.addScaledVector(toTarget, -280 * dt);
      enemy.vel.addScaledVector(orbit, 160 * dt);
      clampLength(enemy.vel, 300);
      enemy.pos.addScaledVector(enemy.vel, dt);
      enemy.vel.multiplyScalar(Math.pow(0.94, dt * 60));
      this.clampToSector(enemy.pos);
      this.orientObjectToDirection(enemy.mesh, target.pos.clone().sub(enemy.pos).normalize());
      enemy.fireCooldown -= dt;
      if (enemy.fireCooldown <= 0 && dist < (this.isMobile ? 1250 : 1700)) {
        const predicted = target.pos.clone().addScaledVector(target.vel, Math.min(0.45, dist / RAID_PROJECTILE_SPEED));
        this.fireProjectile('enemy', enemy.pos, predicted, RAID_ENEMY_DAMAGE);
        enemy.fireCooldown = (this.isMobile ? 0.9 : 0.55) + Math.random() * 0.65;
      }
    }
  }

  private updateModules(dt: number): void {
    if (!this.player) return;
    const targets = [this.player, ...this.wingmen].filter(s => s.alive);
    for (const module of this.modules) {
      if (!module.alive || module.type !== 'turret_cluster') continue;
      module.fireCooldown -= dt;
      const target = this.nearestShip(module.pos, targets);
      if (target && module.fireCooldown <= 0) {
        const dist = module.pos.distanceTo(target.pos);
        const predicted = target.pos.clone().addScaledVector(target.vel, Math.min(0.5, dist / RAID_PROJECTILE_SPEED));
        this.fireProjectile('enemy', module.pos, predicted, 14);
        module.fireCooldown = 1.2;
      }
    }
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.age += dt;
      p.pos.addScaledVector(p.vel, dt);
      if (p.age > p.lifetime) {
        this.deactivateProjectile(p);
        continue;
      }
      if (p.team === 'allied') this.hitEnemyTargets(p);
      else this.hitAlliedTargets(p);
      if (p.active) this.orientObjectToDirection(p.mesh, p.vel);
    }
  }

  private firePlayerBurst(strong = false): void {
    if (!this.player) return;
    const target = this.findAimTarget(strong ? 2600 : 1900, strong ? 0.9 : 0.94);
    if (target) this.fireProjectile('allied', this.player.pos, target.pos, strong ? 38 : RAID_PROJECTILE_DAMAGE);
    else this.fireProjectileDir('allied', this.player.pos, this.aimDir, strong ? 38 : RAID_PROJECTILE_DAMAGE);
  }

  private fireProjectile(team: RaidTeam, from: THREE.Vector3, to: THREE.Vector3, damage: number): void {
    const p = this.projectiles.find(item => !item.active);
    if (!p) return;
    p.active = true;
    p.team = team;
    p.damage = damage;
    p.age = 0;
    p.lifetime = RAID_PROJECTILE_LIFETIME;
    p.pos.copy(from);
    const dir = to.clone().sub(from).normalize();
    p.vel.copy(dir.multiplyScalar(RAID_PROJECTILE_SPEED));
    const material = p.mesh.material as THREE.MeshBasicMaterial;
    material.color.set(team === 'allied' ? 0x7bb8ff : 0xff8844);
    p.mesh.visible = true;
    this.orientObjectToDirection(p.mesh, dir);
  }

  private fireProjectileDir(team: RaidTeam, from: THREE.Vector3, dirIn: THREE.Vector3, damage: number): void {
    const p = this.projectiles.find(item => !item.active);
    if (!p) return;
    const dir = dirIn.clone().normalize();
    p.active = true;
    p.team = team;
    p.damage = damage;
    p.age = 0;
    p.lifetime = RAID_PROJECTILE_LIFETIME;
    p.pos.copy(from);
    p.vel.copy(dir.multiplyScalar(RAID_PROJECTILE_SPEED));
    const material = p.mesh.material as THREE.MeshBasicMaterial;
    material.color.set(team === 'allied' ? 0x7bb8ff : 0xff8844);
    p.mesh.visible = true;
    this.orientObjectToDirection(p.mesh, dir);
  }

  private deactivateProjectile(p: RaidProjectile): void {
    p.active = false;
    p.mesh.visible = false;
  }

  private hitEnemyTargets(p: RaidProjectile): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (enemy.pos.distanceToSquared(p.pos) <= (enemy.radius + p.radius) ** 2) {
        this.applyDamage(enemy, p.damage);
        if (!enemy.alive) {
          this.kills++;
          this.callbacks.onKill?.({ kills: this.kills, source: 'player' });
        }
        this.deactivateProjectile(p);
        return;
      }
    }
    for (const module of this.modules) {
      if (!module.alive) continue;
      if (module.type === 'reactor_core' && this.modules.some(m => m.type === 'shield_emitter' && m.alive)) continue;
      if (module.pos.distanceToSquared(p.pos) <= (module.radius + p.radius) ** 2) {
        module.hp -= p.damage;
        if (module.hp <= 0) {
          module.alive = false;
          if (module.mesh !== this.carrier) module.mesh.visible = false;
          this.modulesDestroyed++;
        }
        this.deactivateProjectile(p);
        return;
      }
    }
  }

  private hitAlliedTargets(p: RaidProjectile): void {
    const targets = [this.player, ...this.wingmen].filter((s): s is RaidShip => !!s && s.alive);
    for (const ship of targets) {
      if (ship.pos.distanceToSquared(p.pos) <= (ship.radius + p.radius) ** 2) {
        this.applyDamage(ship, p.damage);
        this.deactivateProjectile(p);
        return;
      }
    }
  }

  private applyDamage(ship: RaidShip, amount: number): void {
    ship.shieldDelay = RAID_SHIELD_REGEN_DELAY;
    const shieldHit = Math.min(ship.shield, amount);
    ship.shield -= shieldHit;
    ship.hp -= amount - shieldHit;
    if (ship.hp <= 0) {
      ship.alive = false;
      ship.mesh.visible = false;
    }
  }

  private updateShield(ship: RaidShip, dt: number): void {
    if (ship.maxShield <= 0 || !ship.alive) return;
    ship.shieldDelay = Math.max(0, ship.shieldDelay - dt);
    if (ship.shieldDelay === 0) ship.shield = Math.min(ship.maxShield, ship.shield + RAID_SHIELD_REGEN_RATE * dt);
  }

  private findNearestTarget(from: THREE.Vector3, maxDist: number): { pos: THREE.Vector3 } | null {
    let best: { pos: THREE.Vector3 } | null = null;
    let bestD = maxDist * maxDist;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const d = enemy.pos.distanceToSquared(from);
      if (d < bestD) { bestD = d; best = enemy; }
    }
    for (const module of this.modules) {
      if (!module.alive) continue;
      if (module.type === 'reactor_core' && this.modules.some(m => m.type === 'shield_emitter' && m.alive)) continue;
      const d = module.pos.distanceToSquared(from);
      if (d < bestD) { bestD = d; best = module; }
    }
    return best;
  }

  private nearestShip(from: THREE.Vector3, ships: RaidShip[]): RaidShip | null {
    let best: RaidShip | null = null;
    let bestD = Infinity;
    for (const ship of ships) {
      const d = ship.pos.distanceToSquared(from);
      if (d < bestD) { bestD = d; best = ship; }
    }
    return best;
  }

  private lookAt(obj: THREE.Object3D, target: THREE.Vector3): void {
    this.orientObjectToDirection(obj, target.clone().sub(obj.position));
  }

  private orientObjectToDirection(obj: THREE.Object3D, dirIn: THREE.Vector3, roll = 0): void {
    const dir = dirIn.clone();
    if (dir.lengthSq() < 0.001) return;
    dir.normalize();
    obj.lookAt(obj.position.clone().add(dir));
    if (Math.abs(roll) > 0.0001) obj.rotateZ(roll);
  }

  private currentBarrelRoll(): number {
    if (this.barrelRollTimer <= 0) return 0;
    const progress = 1 - this.barrelRollTimer / this.barrelRollDuration;
    return progress * Math.PI * 2;
  }

  private findAimTarget(maxDist: number, minDot: number): { pos: THREE.Vector3; vel: THREE.Vector3 } | null {
    if (!this.player) return null;
    let best: { pos: THREE.Vector3; vel: THREE.Vector3 } | null = null;
    let bestScore = Infinity;
    const check = (pos: THREE.Vector3, vel: THREE.Vector3, alive: boolean) => {
      if (!alive || !this.player) return;
      const to = pos.clone().sub(this.player.pos);
      const dist = to.length();
      if (dist < 1 || dist > maxDist) return;
      const dir = to.multiplyScalar(1 / dist);
      const dot = dir.dot(this.aimDir);
      if (dot < minDot) return;
      const score = dist * (1.08 - dot);
      if (score < bestScore) {
        bestScore = score;
        best = { pos, vel };
      }
    };
    for (const enemy of this.enemies) check(enemy.pos, enemy.vel, enemy.alive);
    const shieldsUp = this.modules.some(m => m.type === 'shield_emitter' && m.alive);
    for (const module of this.modules) {
      if (module.type === 'reactor_core' && shieldsUp) continue;
      check(module.pos, new THREE.Vector3(), module.alive);
    }
    return best;
  }

  private clampToSector(pos: THREE.Vector3): void {
    pos.x = Math.max(-RAID_SECTOR_HALF, Math.min(RAID_SECTOR_HALF, pos.x));
    pos.y = Math.max(-RAID_HEIGHT_HALF, Math.min(RAID_HEIGHT_HALF, pos.y));
    pos.z = Math.max(-RAID_SECTOR_HALF, Math.min(RAID_SECTOR_HALF, pos.z));
  }

  private updateCamera(dt: number): void {
    if (!this.camera || !this.player) return;
    const behind = this.aimDir.clone().multiplyScalar(-760);
    behind.y += 170;
    const desired = this.player.pos.clone().add(behind);
    this.camera.position.lerp(desired, Math.min(1, dt * 5));
    const lookAt = this.player.pos.clone().add(this.aimDir.clone().multiplyScalar(720)).add(new THREE.Vector3(0, 35, 0));
    this.camera.lookAt(lookAt);
  }

  private finish(victory: boolean): void {
    if (this.ended) return;
    this.ended = true;
    this.phase = victory ? 'victory' : 'defeat';
    const elapsedSec = Math.floor((performance.now() - this.startedAt) / 1000);
    const xp = victory
      ? RAID_REWARD_BASE_XP + this.kills * RAID_REWARD_XP_PER_KILL + this.modulesDestroyed * RAID_REWARD_XP_PER_MODULE
      : Math.floor(this.kills * RAID_REWARD_XP_PER_KILL * 0.5);
    const result: RaidResult = {
      victory,
      kills: this.kills,
      modulesDestroyed: this.modulesDestroyed,
      elapsedSec,
      xp,
      minerals: victory ? 160 + this.kills * 3 : Math.floor(this.kills * 2),
      isotopes: victory ? 40 + this.modulesDestroyed * 8 : Math.floor(this.modulesDestroyed * 4),
      techFragments: victory ? 2 : 0,
    };
    this.callbacks.onStatsUpdate?.(this.getSnapshot());
    this.callbacks.onRaidEnd?.(result);
  }
}
