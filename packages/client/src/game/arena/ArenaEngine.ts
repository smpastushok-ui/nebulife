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

  // Game state
  private phase: MatchPhase = 'waiting';
  private matchTimer = 0;
  private countdownTimer = 0;

  // Player ship position for camera follow
  private playerPos = new THREE.Vector3(0, 0, 0);

  // Input (set by ArenaControls)
  private input: InputState = { moveDir: { x: 0, z: 0 }, aimDir: { x: 0, z: 1 }, firing: false, dash: false };

  // Bound handlers (for cleanup)
  private onResizeBound: () => void;

  // Track all disposables for cleanup
  private disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];

  constructor(container: HTMLElement, callbacks: ArenaCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.onResizeBound = this.onResize.bind(this);
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

    window.addEventListener('resize', this.onResizeBound);

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
    this.scene.fog = new THREE.FogExp2(0x020510, 0.0003);
  }

  private setupCamera(): void {
    const W = this.container.clientWidth;
    const H = this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, W / H, 1, 5000);
    this.camera.position.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
    this.camera.lookAt(0, 0, 0);
  }

  private setupFloor(): void {
    // Generate grid texture via Canvas2D
    const gridSize = 512;
    const canvas = document.createElement('canvas');
    canvas.width = gridSize;
    canvas.height = gridSize;
    const ctx = canvas.getContext('2d')!;

    // Dark background
    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, gridSize, gridSize);

    // Grid lines
    ctx.strokeStyle = 'rgba(51, 68, 85, 0.3)';
    ctx.lineWidth = 1;
    const cellSize = gridSize / 16;
    for (let i = 0; i <= 16; i++) {
      const p = i * cellSize;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, gridSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(gridSize, p);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(16, 16);
    this.disposables.push(texture);

    const geo = new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE);
    const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    this.disposables.push(geo, mat);

    this.floorMesh = new THREE.Mesh(geo, mat);
    this.floorMesh.rotation.x = -Math.PI / 2; // XZ plane
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
    const positions = new Float32Array(STARFIELD_COUNT * 3);
    for (let i = 0; i < STARFIELD_COUNT; i++) {
      const i3 = i * 3;
      // Hemisphere above the arena
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.4; // upper hemisphere
      const r = 2000 + Math.random() * 1000;
      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.cos(phi);
      positions[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0x556677, size: 3, sizeAttenuation: true });
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

  // ── Resize handler ─────────────────────────────────────────────────────

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
          // TODO: collect match results and call this.callbacks.onMatchEnd()
        }
        // TODO: update ships, projectiles, asteroids, black holes, VFX
        break;
      case 'ended':
        // Freeze — waiting for React to show end screen
        break;
    }

    // Camera follows player with smooth damping
    _camTarget.set(this.playerPos.x, 0, this.playerPos.z);
    _tempVec3.set(
      this.playerPos.x,
      CAMERA_HEIGHT,
      this.playerPos.z + CAMERA_DISTANCE,
    );
    this.camera.position.lerp(_tempVec3, CAMERA_LERP_SPEED);
    this.camera.lookAt(_camTarget);
  }

  // ── Public getters ─────────────────────────────────────────────────────

  getPhase(): MatchPhase { return this.phase; }
  getMatchTimer(): number { return this.matchTimer; }
  getCountdownTimer(): number { return this.countdownTimer; }
}
