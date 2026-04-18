// ---------------------------------------------------------------------------
// Arena Environment — Asteroids, Black Holes, Arena Boundary
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import type { AsteroidEntity, BlackHoleEntity, Entity, Vec2, Vec3 } from './ArenaTypes.js';
import {
  ARENA_HALF,
  ARENA_HEIGHT_HALF,
  ASTEROID_COUNT,
  ASTEROID_DRIFT_MAX,
  ASTEROID_DRIFT_MIN,
  ASTEROID_HP,
  ASTEROID_MAX_RADIUS,
  ASTEROID_MIN_RADIUS,
  ASTEROID_RESPAWN_DELAY,
  BLACK_HOLE_COLLAPSE_TIME,
  BLACK_HOLE_KILL_RADIUS,
  BLACK_HOLE_LIFETIME,
  BLACK_HOLE_PULL_RADIUS,
  BLACK_HOLE_SPAWN_MAX,
  BLACK_HOLE_SPAWN_MIN,
  BLACK_HOLE_WARNING_TIME,
} from './ArenaConstants.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Seeded-ish position within arena bounds (avoids center spawn for asteroids).
// 3D: y is randomized within the semi-sphere vertical extent.
function randomArenaPos(margin: number = 100): Vec3 {
  const x = randRange(-ARENA_HALF + margin, ARENA_HALF - margin);
  const z = randRange(-ARENA_HALF + margin, ARENA_HALF - margin);
  const y = randRange(-ARENA_HEIGHT_HALF + margin, ARENA_HEIGHT_HALF - margin);
  return { x, y, z };
}

function randomVel(minSpeed: number, maxSpeed: number): Vec3 {
  const angle = Math.random() * Math.PI * 2;
  const speed = randRange(minSpeed, maxSpeed);
  return { x: Math.cos(angle) * speed, y: 0, z: Math.sin(angle) * speed };
}

let _nextEntityId = 9000; // offset from ship IDs
function nextId(): number {
  return _nextEntityId++;
}

// ---------------------------------------------------------------------------
// AsteroidField
// ---------------------------------------------------------------------------

export class AsteroidField {
  private scene: THREE.Scene;
  private mesh: THREE.InstancedMesh;
  private asteroids: AsteroidEntity[] = [];
  private dummy: THREE.Object3D = new THREE.Object3D();
  private count: number;

  constructor(scene: THREE.Scene, count: number = ASTEROID_COUNT) {
    this.scene = scene;
    this.count = count;

    const geo = new THREE.IcosahedronGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0x556677 });
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);

    this.initAsteroids();
  }

  // -------------------------------------------------------------------------
  initAsteroids(): void {
    this.asteroids = [];

    for (let i = 0; i < this.count; i++) {
      const radius = randRange(ASTEROID_MIN_RADIUS, ASTEROID_MAX_RADIUS);
      const pos = randomArenaPos(radius + 20);
      const vel = randomVel(ASTEROID_DRIFT_MIN, ASTEROID_DRIFT_MAX);
      const rotSpeed = randRange(0.3, 1.5) * (Math.random() < 0.5 ? 1 : -1);

      const asteroid: AsteroidEntity = {
        id: nextId(),
        pos,
        vel,
        rotation: Math.random() * Math.PI * 2,
        radius,
        alive: true,
        hp: ASTEROID_HP,
        maxHp: ASTEROID_HP,
        rotSpeed,
        instanceIndex: i,
        respawnTimer: 0,
      };

      this.asteroids.push(asteroid);
      this._applyInstanceTransform(asteroid);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
  }

  // -------------------------------------------------------------------------
  update(dt: number): void {
    let dirty = false;

    for (const ast of this.asteroids) {
      if (ast.respawnTimer > 0) {
        // Waiting to respawn
        ast.respawnTimer -= dt;
        if (ast.respawnTimer <= 0) {
          ast.respawnTimer = 0;
          this._respawnAsteroid(ast);
          dirty = true;
        }
        continue;
      }

      if (!ast.alive) continue;

      // Drift
      ast.pos.x += ast.vel.x * dt;
      ast.pos.z += ast.vel.z * dt;

      // Wrap around arena boundary (torus topology)
      if (ast.pos.x >  ARENA_HALF) ast.pos.x -= ARENA_HALF * 2;
      if (ast.pos.x < -ARENA_HALF) ast.pos.x += ARENA_HALF * 2;
      if (ast.pos.z >  ARENA_HALF) ast.pos.z -= ARENA_HALF * 2;
      if (ast.pos.z < -ARENA_HALF) ast.pos.z += ARENA_HALF * 2;

      // Rotate
      ast.rotation += ast.rotSpeed * dt;

      this._applyInstanceTransform(ast);
      dirty = true;
    }

    if (dirty) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  // -------------------------------------------------------------------------
  getAsteroids(): AsteroidEntity[] {
    return this.asteroids;
  }

  // -------------------------------------------------------------------------
  destroyAsteroid(id: number): void {
    const ast = this.asteroids.find(a => a.id === id);
    if (!ast || !ast.alive) return;

    ast.alive = false;
    ast.respawnTimer = ASTEROID_RESPAWN_DELAY;

    // Hide by scaling to zero
    this.dummy.scale.set(0, 0, 0);
    this.dummy.position.set(0, -9999, 0);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(ast.instanceIndex, this.dummy.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  // -------------------------------------------------------------------------
  private _respawnAsteroid(ast: AsteroidEntity): void {
    ast.hp = ast.maxHp;
    ast.alive = true;
    ast.pos = randomArenaPos(ast.radius + 20);
    ast.vel = randomVel(ASTEROID_DRIFT_MIN, ASTEROID_DRIFT_MAX);
    ast.rotation = Math.random() * Math.PI * 2;
    this._applyInstanceTransform(ast);
  }

  // -------------------------------------------------------------------------
  private _applyInstanceTransform(ast: AsteroidEntity): void {
    this.dummy.position.set(ast.pos.x, 0, ast.pos.z);
    this.dummy.rotation.set(ast.rotation * 0.5, ast.rotation, ast.rotation * 0.7);
    this.dummy.scale.setScalar(ast.alive ? ast.radius : 0);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(ast.instanceIndex, this.dummy.matrix);
  }

  // -------------------------------------------------------------------------
  dispose(): void {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

// ---------------------------------------------------------------------------
// Black Hole visual objects (held per active black hole)
// ---------------------------------------------------------------------------

interface BlackHoleVisual {
  group: THREE.Group;
  core: THREE.Mesh;
  disk: THREE.Mesh;
  diskAngle: number;
}

// ---------------------------------------------------------------------------
// BlackHoleManager
// ---------------------------------------------------------------------------

const BLACK_HOLE_G = 60_000; // gravity constant (tunable)
const BLACK_HOLE_FORCE_CAP = 800; // max force per entity per second

export class BlackHoleManager {
  private scene: THREE.Scene;
  private spawnTimer: number;

  // At most one black hole active at a time
  private current: BlackHoleEntity | null = null;
  private visual: BlackHoleVisual | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.spawnTimer = this._nextSpawnDelay();
  }

  // -------------------------------------------------------------------------
  update(dt: number, entities: Entity[]): void {
    if (this.current === null) {
      // Count down to next spawn
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this._spawn();
      }
      return;
    }

    const bh = this.current;
    bh.age += dt;

    // Phase transitions
    if (bh.phase === 'warning' && bh.age >= BLACK_HOLE_WARNING_TIME) {
      bh.phase = 'active';
    } else if (
      bh.phase === 'active' &&
      bh.age >= BLACK_HOLE_WARNING_TIME + BLACK_HOLE_LIFETIME
    ) {
      bh.phase = 'collapsing';
    } else if (
      bh.phase === 'collapsing' &&
      bh.age >= BLACK_HOLE_WARNING_TIME + BLACK_HOLE_LIFETIME + BLACK_HOLE_COLLAPSE_TIME
    ) {
      this._despawn();
      return;
    }

    // Apply gravity during active phase
    if (bh.phase === 'active') {
      for (const entity of entities) {
        if (!entity.alive) continue;
        this._applyGravity(bh, entity, dt);
      }
    }

    // Update visuals
    this._updateVisual(bh, dt);
  }

  // -------------------------------------------------------------------------
  getCurrentBlackHole(): BlackHoleEntity | null {
    return this.current;
  }

  // -------------------------------------------------------------------------
  dispose(): void {
    this._destroyVisual();
  }

  // -------------------------------------------------------------------------
  private _nextSpawnDelay(): number {
    return randRange(BLACK_HOLE_SPAWN_MIN, BLACK_HOLE_SPAWN_MAX);
  }

  // -------------------------------------------------------------------------
  private _spawn(): void {
    const pos = randomArenaPos(BLACK_HOLE_PULL_RADIUS + 100);

    this.current = {
      pos,
      pullRadius: BLACK_HOLE_PULL_RADIUS,
      killRadius: BLACK_HOLE_KILL_RADIUS,
      lifetime: BLACK_HOLE_LIFETIME,
      age: 0,
      phase: 'warning',
    };

    this._createVisual(pos);
  }

  // -------------------------------------------------------------------------
  private _despawn(): void {
    this._destroyVisual();
    this.current = null;
    this.spawnTimer = this._nextSpawnDelay();
  }

  // -------------------------------------------------------------------------
  private _applyGravity(bh: BlackHoleEntity, entity: Entity, dt: number): void {
    const dx = bh.pos.x - entity.pos.x;
    const dz = bh.pos.z - entity.pos.z;
    const distSq = dx * dx + dz * dz;
    const dist = Math.sqrt(distSq);

    if (dist < 0.001) return;

    // Kill if within kill radius
    if (dist < bh.killRadius) {
      entity.alive = false;
      return;
    }

    // Only pull within pull radius
    if (dist > bh.pullRadius) return;

    // Gravitational force: F = G / dist^2, capped
    const rawForce = BLACK_HOLE_G / Math.max(distSq, bh.killRadius * bh.killRadius);
    const force = Math.min(rawForce, BLACK_HOLE_FORCE_CAP);

    // Direction toward black hole (normalized)
    const nx = dx / dist;
    const nz = dz / dist;

    entity.vel.x += nx * force * dt;
    entity.vel.z += nz * force * dt;
  }

  // -------------------------------------------------------------------------
  private _createVisual(pos: Vec2): void {
    const group = new THREE.Group();
    group.position.set(pos.x, 0, pos.z);

    // Core sphere — very dark, almost black
    const coreGeo = new THREE.SphereGeometry(BLACK_HOLE_KILL_RADIUS, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x080410 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // Accretion disk — flat ring tilted slightly
    const diskGeo = new THREE.RingGeometry(
      BLACK_HOLE_KILL_RADIUS * 1.5,
      BLACK_HOLE_KILL_RADIUS * 4.5,
      32,
    );
    const diskMat = new THREE.MeshBasicMaterial({
      color: 0x441166,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const disk = new THREE.Mesh(diskGeo, diskMat);
    // Tilt the disk slightly for a 3D look (ring is in XY plane by default)
    disk.rotation.x = Math.PI / 2;      // lay flat on XZ plane
    disk.rotation.z = 0.35;             // slight tilt
    group.add(disk);

    this.scene.add(group);

    this.visual = {
      group,
      core,
      disk,
      diskAngle: 0,
    };
  }

  // -------------------------------------------------------------------------
  private _updateVisual(bh: BlackHoleEntity, dt: number): void {
    if (!this.visual) return;
    const v = this.visual;

    // Spin the accretion disk
    v.diskAngle += dt * 1.2;
    v.disk.rotation.y = v.diskAngle;

    // Scale and opacity based on phase
    if (bh.phase === 'warning') {
      const t = bh.age / BLACK_HOLE_WARNING_TIME; // 0..1
      v.group.scale.setScalar(t * 0.8 + 0.2);    // grow from 20% to 100%
      (v.disk.material as THREE.MeshBasicMaterial).opacity = t * 0.75;
    } else if (bh.phase === 'active') {
      v.group.scale.setScalar(1);
      (v.disk.material as THREE.MeshBasicMaterial).opacity = 0.75;
    } else if (bh.phase === 'collapsing') {
      const collapseAge = bh.age - (BLACK_HOLE_WARNING_TIME + BLACK_HOLE_LIFETIME);
      const t = collapseAge / BLACK_HOLE_COLLAPSE_TIME; // 0..1
      const scale = 1 - t;
      v.group.scale.setScalar(Math.max(scale, 0));
      (v.disk.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.75;
    }
  }

  // -------------------------------------------------------------------------
  private _destroyVisual(): void {
    if (!this.visual) return;
    this.scene.remove(this.visual.group);
    this.visual.core.geometry.dispose();
    (this.visual.core.material as THREE.Material).dispose();
    this.visual.disk.geometry.dispose();
    (this.visual.disk.material as THREE.Material).dispose();
    this.visual = null;
  }
}

// ---------------------------------------------------------------------------
// Arena boundary helpers (stateless — used by physics loop)
// ---------------------------------------------------------------------------

/**
 * Returns true if the entity center is outside the arena boundary.
 * Boundary is a square [-ARENA_HALF, ARENA_HALF] on both axes.
 */
export function isOutsideBoundary(pos: Vec2, radius: number = 0): boolean {
  return (
    pos.x - radius < -ARENA_HALF ||
    pos.x + radius >  ARENA_HALF ||
    pos.z - radius < -ARENA_HALF ||
    pos.z + radius >  ARENA_HALF
  );
}

/**
 * Compute the push-back force vector for an entity touching the boundary.
 * Returns Vec2 push direction (toward center), magnitude = BOUNDARY_PUSH_FORCE when touching.
 */
export function boundaryPushForce(pos: Vec2): Vec2 {
  let fx = 0;
  let fz = 0;

  if (pos.x < -ARENA_HALF) fx =  1;
  else if (pos.x >  ARENA_HALF) fx = -1;

  if (pos.z < -ARENA_HALF) fz =  1;
  else if (pos.z >  ARENA_HALF) fz = -1;

  return { x: fx, z: fz };
}
