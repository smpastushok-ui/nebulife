// ---------------------------------------------------------------------------
// ArenaShip — ship entity management for Space Arena
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { ShipEntity, Vec2 } from './ArenaTypes.js';
import {
  SHIP_HP, SHIP_SHIELD, SHIP_RADIUS,
  SHIP_MAX_SPEED, SHIP_ACCELERATION, SHIP_DRAG,
  SHIELD_REGEN_RATE, SHIELD_REGEN_DELAY,
  DASH_SPEED, DASH_DURATION, DASH_COOLDOWN,
  ARENA_HALF,
} from './ArenaConstants.js';

// Pre-allocated temp vectors — ZERO allocations in hot path
const _move = new THREE.Vector2();
const _vel = new THREE.Vector2();

// Monotonically increasing entity ID counter
let _nextId = 1;

// ---------------------------------------------------------------------------
// Model loading
// ---------------------------------------------------------------------------

const _gltfLoader = new GLTFLoader();

/** Load default ship GLB; returns procedural fallback Group on failure. */
async function loadShipGLB(url: string): Promise<THREE.Group> {
  return new Promise((resolve) => {
    _gltfLoader.load(
      url,
      (gltf) => {
        resolve(gltf.scene);
      },
      undefined,
      () => {
        // GLB failed — fall back to procedural geometry
        resolve(createShipModel());
      },
    );
  });
}

/**
 * Build a procedural ship from ConeGeometry + BoxGeometry.
 * Used both as the live fallback and as a helper in tests.
 */
export function createShipModel(): THREE.Group {
  const group = new THREE.Group();

  // Hull — cone pointing forward (+Z)
  const hullGeo = new THREE.ConeGeometry(6, 20, 6);
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x4488aa, roughness: 0.4, metalness: 0.7 });
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.rotation.x = Math.PI / 2; // tip along +Z
  hull.position.set(0, 0, 4);
  group.add(hull);

  // Wing struts — two flat boxes on either side
  const wingGeo = new THREE.BoxGeometry(18, 1.5, 8);
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x336677, roughness: 0.5, metalness: 0.6 });
  const wingL = new THREE.Mesh(wingGeo, wingMat);
  const wingR = wingL.clone();
  wingL.position.set(0, 0, -4);
  wingR.position.set(0, 0, -4);
  group.add(wingL, wingR);

  // Engine glow — small emissive sphere at the rear
  const thrusterGeo = new THREE.SphereGeometry(3, 8, 8);
  const thrusterMat = new THREE.MeshStandardMaterial({
    color: 0x7bb8ff,
    emissive: 0x4488cc,
    emissiveIntensity: 1.2,
    roughness: 0.2,
    metalness: 0.5,
  });
  const thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
  thruster.position.set(0, 0, -12);
  group.add(thruster);

  return group;
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

/** Base ship defaults shared by player and bots. */
function _baseShip(overrides: Partial<ShipEntity>): ShipEntity {
  return {
    id: _nextId++,
    pos: { x: 0, y: 0, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
    rotation: 0,
    radius: SHIP_RADIUS,
    alive: true,
    hp: SHIP_HP,
    maxHp: SHIP_HP,
    shield: SHIP_SHIELD,
    maxShield: SHIP_SHIELD,
    shieldRegenTimer: 0,
    isPlayer: false,
    name: 'Ship',
    weaponSlots: [{ type: 'pulse', cooldownRemaining: 0 }],
    dashCooldown: 0,
    isDashing: false,
    dashTimer: 0,
    modelGroup: null,
    kills: 0,
    deaths: 0,
    damageDealt: 0,
    ...overrides,
  };
}

/**
 * Create the player ship entity.
 * Optionally loads the GLB model; falls back to procedural on error.
 */
export async function createPlayerShip(glbUrl?: string): Promise<ShipEntity> {
  const ship = _baseShip({ isPlayer: true, name: 'Player' });

  if (glbUrl) {
    ship.modelGroup = await loadShipGLB(glbUrl);
  } else {
    ship.modelGroup = createShipModel();
  }

  return ship;
}

export type BotDifficulty = 'easy' | 'normal' | 'hard';

/**
 * Create a bot ship entity.
 * Bots are purely logic-driven; difficulty is stored for AI use.
 */
export function createBotShip(name: string, difficulty: BotDifficulty = 'normal'): ShipEntity {
  // Scale HP/shield slightly with difficulty so hard bots are tankier
  const tankFactor = difficulty === 'easy' ? 0.8 : difficulty === 'hard' ? 1.3 : 1.0;
  const hp = Math.round(SHIP_HP * tankFactor);
  const shield = Math.round(SHIP_SHIELD * tankFactor);

  const ship = _baseShip({
    isPlayer: false,
    name,
    hp,
    maxHp: hp,
    shield,
    maxShield: shield,
    modelGroup: createShipModel(),
  });

  return ship;
}

// ---------------------------------------------------------------------------
// Per-frame ship update
// ---------------------------------------------------------------------------

/**
 * Apply player/bot input to the ship for one physics step.
 *
 * Responsibilities:
 *  1. Accumulate acceleration from moveDir
 *  2. Apply drag
 *  3. Clamp speed to SHIP_MAX_SPEED (or DASH_SPEED during dash)
 *  4. Advance position and clamp to arena circle boundary
 *  5. Rotate ship to face aimDir
 *  6. Tick dash timer
 *  7. Sync THREE.Group transform
 */
export function updateShip(ship: ShipEntity, input: { moveDir: Vec2; aimDir: Vec2 }, dt: number): void {
  if (!ship.alive) return;

  // ── 1. Accumulate acceleration from moveDir ───────────────────────────
  _move.set(input.moveDir.x, input.moveDir.z); // z maps to Three Z axis
  const moveLenSq = _move.lengthSq();
  if (moveLenSq > 0) {
    if (moveLenSq > 1) _move.normalize();
    ship.vel.x += _move.x * SHIP_ACCELERATION * dt;
    ship.vel.z += _move.y * SHIP_ACCELERATION * dt; // _move.y holds the z-component
  }

  // ── 2. Drag ──────────────────────────────────────────────────────────
  // SHIP_DRAG is tuned for 60fps; compensate for variable dt
  const drag = Math.pow(SHIP_DRAG, dt * 60);
  ship.vel.x *= drag;
  ship.vel.z *= drag;

  // ── 3. Speed clamp ───────────────────────────────────────────────────
  _vel.set(ship.vel.x, ship.vel.z);
  const maxSpeed = ship.isDashing ? DASH_SPEED : SHIP_MAX_SPEED;
  const velLenSq = _vel.lengthSq();
  if (velLenSq > maxSpeed * maxSpeed) {
    _vel.setLength(maxSpeed);
    ship.vel.x = _vel.x;
    ship.vel.z = _vel.y;
  }

  // ── 4. Advance position + arena boundary clamp ───────────────────────
  ship.pos.x += ship.vel.x * dt;
  ship.pos.z += ship.vel.z * dt;

  const distSq = ship.pos.x * ship.pos.x + ship.pos.z * ship.pos.z;
  const limit = ARENA_HALF - ship.radius;
  if (distSq > limit * limit) {
    // Push back inside the circle; reflect velocity component toward center
    const dist = Math.sqrt(distSq);
    const nx = ship.pos.x / dist;
    const nz = ship.pos.z / dist;
    ship.pos.x = nx * limit;
    ship.pos.z = nz * limit;

    // Cancel outward velocity component
    const dot = ship.vel.x * nx + ship.vel.z * nz;
    if (dot > 0) {
      ship.vel.x -= dot * nx;
      ship.vel.z -= dot * nz;
    }
  }

  // ── 5. Rotate to face aimDir ─────────────────────────────────────────
  const ax = input.aimDir.x;
  const az = input.aimDir.z;
  if (ax !== 0 || az !== 0) {
    ship.rotation = Math.atan2(ax, az);
  }

  // ── 6. Tick dash ─────────────────────────────────────────────────────
  if (ship.isDashing) {
    ship.dashTimer -= dt;
    if (ship.dashTimer <= 0) {
      ship.isDashing = false;
      ship.dashTimer = 0;
    }
  }
  if (ship.dashCooldown > 0) {
    ship.dashCooldown = Math.max(0, ship.dashCooldown - dt);
  }

  // ── 7. Sync THREE.Group ──────────────────────────────────────────────
  if (ship.modelGroup) {
    ship.modelGroup.position.set(ship.pos.x, 0, ship.pos.z);
    ship.modelGroup.rotation.y = ship.rotation;
  }
}

// ---------------------------------------------------------------------------
// Dash
// ---------------------------------------------------------------------------

/**
 * Apply a dash burst in the current move direction (or forward if idle).
 * Does nothing if the cooldown has not expired.
 */
export function applyDash(ship: ShipEntity, moveDir: Vec2): void {
  if (!ship.alive) return;
  if (ship.dashCooldown > 0) return;

  // Determine dash direction: moveDir if non-zero, else ship facing
  let dx = moveDir.x;
  let dz = moveDir.z;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 0.01) {
    // Fall back to the ship's current facing direction
    dx = Math.sin(ship.rotation);
    dz = Math.cos(ship.rotation);
  } else {
    const inv = 1 / Math.sqrt(lenSq);
    dx *= inv;
    dz *= inv;
  }

  ship.vel.x = dx * DASH_SPEED;
  ship.vel.z = dz * DASH_SPEED;
  ship.isDashing = true;
  ship.dashTimer = DASH_DURATION;
  ship.dashCooldown = DASH_COOLDOWN;
}

// ---------------------------------------------------------------------------
// Damage & shield regeneration
// ---------------------------------------------------------------------------

/**
 * Apply damage to the ship.
 * Shield absorbs damage first; any remainder reduces HP.
 * Resets the shield regeneration timer.
 */
export function takeDamage(ship: ShipEntity, amount: number): void {
  if (!ship.alive) return;

  // Reset shield regen delay regardless of where damage lands
  ship.shieldRegenTimer = 0;

  if (ship.shield > 0) {
    const absorbed = Math.min(ship.shield, amount);
    ship.shield -= absorbed;
    amount -= absorbed;
  }

  if (amount > 0) {
    ship.hp -= amount;
    if (ship.hp <= 0) {
      ship.hp = 0;
      ship.alive = false;
    }
  }
}

/**
 * Tick shield regeneration each frame.
 * Regen only starts after SHIELD_REGEN_DELAY seconds of no damage.
 */
export function regenShield(ship: ShipEntity, dt: number): void {
  if (!ship.alive) return;
  if (ship.shield >= ship.maxShield) return;

  ship.shieldRegenTimer += dt;
  if (ship.shieldRegenTimer >= SHIELD_REGEN_DELAY) {
    ship.shield = Math.min(ship.maxShield, ship.shield + SHIELD_REGEN_RATE * dt);
  }
}
