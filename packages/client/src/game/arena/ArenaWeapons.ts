// ---------------------------------------------------------------------------
// ArenaWeapons — InstancedMesh projectile pools + weapon firing logic
// No `new` in hot paths; all geometry/material created once in constructor.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import type { ProjectileEntity, ShipEntity, WeaponType } from './ArenaTypes.js';
import { WEAPONS, PROJECTILE_POOL_SIZE } from './ArenaConstants.js';

// ---------------------------------------------------------------------------
// Pre-allocated module-level temporaries — zero GC during update loops
// ---------------------------------------------------------------------------

const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _zeroScale = new THREE.Vector3(0, 0, 0);
const _activeScale = new THREE.Vector3(1, 1, 1);

// Incrementing global projectile id counter
let _nextProjectileId = 1;

// ---------------------------------------------------------------------------
// ProjectilePool — manages a fixed-size InstancedMesh pool for one weapon type
// ---------------------------------------------------------------------------

export class ProjectilePool {
  private readonly mesh: THREE.InstancedMesh;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly scene: THREE.Scene;
  private readonly weaponType: WeaponType;
  private readonly poolSize: number;

  // Active projectile entities (sparse — slots may be null when free)
  private readonly slots: Array<ProjectileEntity | null>;
  // Stack of free slot indices for O(1) alloc / release
  private readonly freeList: number[];

  constructor(scene: THREE.Scene, weaponType: WeaponType, poolSize: number = PROJECTILE_POOL_SIZE) {
    this.scene = scene;
    this.weaponType = weaponType;
    this.poolSize = poolSize;

    // Create geometry + material based on weapon type
    if (weaponType === 'missile') {
      this.geometry = new THREE.ConeGeometry(0.3, 1, 4);
      this.material = new THREE.MeshBasicMaterial({ color: 0xff8844 });
    } else {
      // pulse / beam / gravgun all use sphere
      this.geometry = new THREE.SphereGeometry(0.5, 4, 4);
      this.material = new THREE.MeshBasicMaterial({ color: 0x44ff88 });
    }

    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, poolSize);
    this.mesh.frustumCulled = false; // arena is always in view
    this.mesh.name = `projectile_pool_${weaponType}`;

    // Hide all instances by setting scale to zero
    for (let i = 0; i < poolSize; i++) {
      _matrix.compose(_position.set(0, 0, 0), _quaternion.identity(), _zeroScale);
      this.mesh.setMatrixAt(i, _matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;

    scene.add(this.mesh);

    // Initialise data structures
    this.slots = new Array<ProjectileEntity | null>(poolSize).fill(null);
    this.freeList = [];
    for (let i = poolSize - 1; i >= 0; i--) {
      this.freeList.push(i);
    }
  }

  // --------------------------------------------------------------------------
  // spawn — pull a free slot from the pool, populate a ProjectileEntity.
  // Returns null when the pool is exhausted (silent drop).
  // --------------------------------------------------------------------------

  spawn(
    pos: { x: number; z: number },
    vel: { x: number; z: number },
    ownerId: number,
  ): ProjectileEntity | null {
    if (this.freeList.length === 0) return null;

    const slotIndex = this.freeList.pop()!;
    const def = WEAPONS[this.weaponType];

    const entity: ProjectileEntity = {
      id: _nextProjectileId++,
      pos: { x: pos.x, y: 0, z: pos.z },
      vel: { x: vel.x, y: 0, z: vel.z },
      rotation: 0,
      radius: def.projectileRadius,
      alive: true,
      damage: def.damage,
      lifetime: def.projectileLifetime,
      age: 0,
      weaponType: this.weaponType,
      ownerId,
      instanceIndex: slotIndex,
    };

    this.slots[slotIndex] = entity;

    // Make instance visible at spawn position
    _position.set(pos.x, 0, pos.z);
    _matrix.compose(_position, _quaternion.identity(), _activeScale);
    this.mesh.setMatrixAt(slotIndex, _matrix);
    this.mesh.instanceMatrix.needsUpdate = true;

    return entity;
  }

  // --------------------------------------------------------------------------
  // release — return a slot to the free list, hide the instance
  // --------------------------------------------------------------------------

  release(projectile: ProjectileEntity): void {
    const slotIndex = projectile.instanceIndex;
    if (slotIndex < 0 || slotIndex >= this.poolSize) return;
    if (this.slots[slotIndex] !== projectile) return; // stale reference guard

    projectile.alive = false;
    this.slots[slotIndex] = null;
    this.freeList.push(slotIndex);

    // Scale to zero to hide instance without removing from GPU draw call
    _matrix.compose(_position.set(0, 0, 0), _quaternion.identity(), _zeroScale);
    this.mesh.setMatrixAt(slotIndex, _matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  // --------------------------------------------------------------------------
  // updateAll — advance age, integrate positions, release expired projectiles.
  // Does NOT apply physics drag to projectiles (they travel at constant speed).
  // --------------------------------------------------------------------------

  updateAll(dt: number): void {
    let needsUpdate = false;

    for (let i = 0; i < this.poolSize; i++) {
      const proj = this.slots[i];
      if (proj === null) continue;

      proj.age += dt;

      if (proj.age >= proj.lifetime) {
        // Expired — release back to pool
        proj.alive = false;
        this.slots[i] = null;
        this.freeList.push(i);
        _matrix.compose(_position.set(0, 0, 0), _quaternion.identity(), _zeroScale);
        this.mesh.setMatrixAt(i, _matrix);
        needsUpdate = true;
        continue;
      }

      // Translate along velocity (projectiles have no drag)
      proj.pos.x += proj.vel.x * dt;
      proj.pos.z += proj.vel.z * dt;

      // Orient missile along travel direction
      if (this.weaponType === 'missile') {
        proj.rotation = Math.atan2(proj.vel.x, proj.vel.z);
        _quaternion.setFromAxisAngle(_yAxis, proj.rotation);
      }

      _position.set(proj.pos.x, 0, proj.pos.z);
      _matrix.compose(_position, _quaternion, _activeScale);
      this.mesh.setMatrixAt(i, _matrix);
      needsUpdate = true;
    }

    if (needsUpdate) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  // --------------------------------------------------------------------------
  // activeProjectiles — iterate current active entities (caller must not store refs)
  // --------------------------------------------------------------------------

  getActive(): ReadonlyArray<ProjectileEntity | null> {
    return this.slots;
  }

  // --------------------------------------------------------------------------
  // dispose — GPU cleanup (call when leaving arena scene)
  // --------------------------------------------------------------------------

  dispose(): void {
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}

// Pre-allocated Y-axis vector used for missile orientation
const _yAxis = new THREE.Vector3(0, 1, 0);

// ---------------------------------------------------------------------------
// fireWeapon — check cooldown, spawn projectile from ship's weapon slot
// Returns the spawned ProjectileEntity, or null when on cooldown / pool full.
// ---------------------------------------------------------------------------

export function fireWeapon(
  ship: ShipEntity,
  weaponSlotIndex: number,
  aimDir: { x: number; z: number },
  pool: ProjectilePool,
): ProjectileEntity | null {
  const slot = ship.weaponSlots[weaponSlotIndex];
  if (!slot) return null;
  if (slot.cooldownRemaining > 0) return null;

  const def = WEAPONS[slot.type];

  // Spawn position: slightly in front of ship centre along aim direction
  const spawnOffset = ship.radius + def.projectileRadius + 1;
  const spawnPos = {
    x: ship.pos.x + aimDir.x * spawnOffset,
    z: ship.pos.z + aimDir.z * spawnOffset,
  };

  // Velocity: aimDir * projectileSpeed (+ inherit ship velocity for feel)
  const vel = {
    x: aimDir.x * def.projectileSpeed + ship.vel.x * 0.25,
    z: aimDir.z * def.projectileSpeed + ship.vel.z * 0.25,
  };

  const projectile = pool.spawn(spawnPos, vel, ship.id);
  if (projectile !== null) {
    slot.cooldownRemaining = def.cooldown;
  }

  return projectile;
}

// ---------------------------------------------------------------------------
// tickCooldowns — advance all weapon slot cooldowns; call once per frame
// ---------------------------------------------------------------------------

export function tickCooldowns(ship: ShipEntity, dt: number): void {
  for (let i = 0; i < ship.weaponSlots.length; i++) {
    const slot = ship.weaponSlots[i];
    if (slot.cooldownRemaining > 0) {
      slot.cooldownRemaining -= dt;
      if (slot.cooldownRemaining < 0) slot.cooldownRemaining = 0;
    }
  }
}
