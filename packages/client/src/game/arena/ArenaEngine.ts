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

  // Player ship (triangle placeholder)
  private playerMesh!: THREE.Mesh;
  private playerVelX = 0;
  private playerVelZ = 0;

  // Asteroids
  private asteroidMesh!: THREE.InstancedMesh;
  private asteroidData: { x: number; z: number; vx: number; vz: number; radius: number; rot: number; rotSpeed: number }[] = [];

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

  // Track all disposables for cleanup
  private disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];

  constructor(container: HTMLElement, callbacks: ArenaCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.onResizeBound = this.onResize.bind(this);
    this.onWheelBound = this.onWheel.bind(this);
    this.onKeyDownBound = (e: KeyboardEvent) => this.keys.add(e.key.toLowerCase());
    this.onKeyUpBound = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());
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

    window.addEventListener('resize', this.onResizeBound);
    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    this.renderer.domElement.addEventListener('wheel', this.onWheelBound, { passive: false });

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

  // ── Input API (called by ArenaControls) ────────────────────────────────

  setInput(input: InputState): void {
    this.input = input;
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
    // Green triangle placeholder for player ship
    const shape = new THREE.Shape();
    shape.moveTo(0, SHIP_RADIUS);      // nose (forward = +Z)
    shape.lineTo(-SHIP_RADIUS * 0.7, -SHIP_RADIUS * 0.6);
    shape.lineTo(SHIP_RADIUS * 0.7, -SHIP_RADIUS * 0.6);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false });
    const mat = new THREE.MeshBasicMaterial({ color: 0x44ff88 });
    this.disposables.push(geo, mat);

    this.playerMesh = new THREE.Mesh(geo, mat);
    this.playerMesh.rotation.x = -Math.PI / 2; // lay flat on XZ
    this.playerMesh.position.set(0, 3, 0); // slightly above floor
    this.scene.add(this.playerMesh);
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
        this.matchTimer -= dt;
        if (this.matchTimer <= 0) {
          this.phase = 'ended';
        }
        this.updatePlayer(dt);
        this.updateAsteroids(dt);
        break;
      case 'ended':
        // Freeze — waiting for React to show end screen
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
    // WASD input
    let ax = 0, az = 0;
    if (this.keys.has('w') || this.keys.has('arrowup'))    az -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown'))  az += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft'))  ax -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) ax += 1;

    // Normalize diagonal
    const len = Math.sqrt(ax * ax + az * az);
    if (len > 0) { ax /= len; az /= len; }

    // Accelerate
    this.playerVelX += ax * SHIP_ACCELERATION * dt;
    this.playerVelZ += az * SHIP_ACCELERATION * dt;

    // Drag
    this.playerVelX *= SHIP_DRAG;
    this.playerVelZ *= SHIP_DRAG;

    // Clamp speed
    const speed = Math.sqrt(this.playerVelX ** 2 + this.playerVelZ ** 2);
    if (speed > SHIP_MAX_SPEED) {
      this.playerVelX = (this.playerVelX / speed) * SHIP_MAX_SPEED;
      this.playerVelZ = (this.playerVelZ / speed) * SHIP_MAX_SPEED;
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

    // Update mesh position
    this.playerMesh.position.set(this.playerPos.x, 3, this.playerPos.z);

    // Rotate triangle to face movement direction
    if (speed > 5) {
      const angle = Math.atan2(this.playerVelX, -this.playerVelZ);
      this.playerMesh.rotation.y = angle;
    }
  }

  // ── Asteroid drift ─────────────────────────────────────────────────────

  private updateAsteroids(dt: number): void {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.asteroidData.length; i++) {
      const a = this.asteroidData[i];
      a.x += a.vx * dt;
      a.z += a.vz * dt;
      a.rot += a.rotSpeed * dt;

      // Wrap around arena (torus topology)
      const d = Math.sqrt(a.x * a.x + a.z * a.z);
      if (d > ARENA_HALF + a.radius) {
        const angle = Math.atan2(a.z, a.x) + Math.PI; // opposite side
        a.x = Math.cos(angle) * (ARENA_HALF - a.radius);
        a.z = Math.sin(angle) * (ARENA_HALF - a.radius);
      }

      dummy.position.set(a.x, a.radius * 0.3, a.z);
      dummy.scale.set(a.radius, a.radius, a.radius);
      dummy.rotation.set(a.rot * 0.3, a.rot, a.rot * 0.7);
      dummy.updateMatrix();
      this.asteroidMesh.setMatrixAt(i, dummy.matrix);
    }
    this.asteroidMesh.instanceMatrix.needsUpdate = true;
  }

  // ── Public getters ─────────────────────────────────────────────────────

  getPhase(): MatchPhase { return this.phase; }
  getMatchTimer(): number { return this.matchTimer; }
  getCountdownTimer(): number { return this.countdownTimer; }
}
