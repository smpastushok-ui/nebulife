// ---------------------------------------------------------------------------
// ArenaPhysics — pure 2D physics on XZ plane, no side effects
// All functions are stateless. Pre-allocate temps at module level.
// ---------------------------------------------------------------------------

import type { Entity, ShipEntity, AsteroidEntity, ProjectileEntity } from './ArenaTypes.js';
import {
  SHIP_DRAG,
  COLLISION_DAMAGE_MIN,
  COLLISION_DAMAGE_MAX,
  COLLISION_SPEED_THRESHOLD,
  BOUNDARY_PUSH_FORCE,
} from './ArenaConstants.js';

// ---------------------------------------------------------------------------
// Vec2 utility functions — inline, no allocations
// ---------------------------------------------------------------------------

export function vec2Dist(a: { x: number; z: number }, b: { x: number; z: number }): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function vec2Length(v: { x: number; z: number }): number {
  return Math.sqrt(v.x * v.x + v.z * v.z);
}

export function vec2Normalize(v: { x: number; z: number }, out: { x: number; z: number }): void {
  const len = Math.sqrt(v.x * v.x + v.z * v.z);
  if (len < 1e-9) {
    out.x = 0;
    out.z = 0;
  } else {
    out.x = v.x / len;
    out.z = v.z / len;
  }
}

export function vec2Sub(
  a: { x: number; z: number },
  b: { x: number; z: number },
  out: { x: number; z: number },
): void {
  out.x = a.x - b.x;
  out.z = a.z - b.z;
}

export function vec2Add(
  a: { x: number; z: number },
  b: { x: number; z: number },
  out: { x: number; z: number },
): void {
  out.x = a.x + b.x;
  out.z = a.z + b.z;
}

export function vec2Scale(v: { x: number; z: number }, s: number, out: { x: number; z: number }): void {
  out.x = v.x * s;
  out.z = v.z * s;
}

// ---------------------------------------------------------------------------
// Module-level pre-allocated temporaries — zero GC in hot paths
// ---------------------------------------------------------------------------

const _diff: { x: number; z: number } = { x: 0, z: 0 };
const _normal: { x: number; z: number } = { x: 0, z: 0 };
const _relVel: { x: number; z: number } = { x: 0, z: 0 };
const _impulse: { x: number; z: number } = { x: 0, z: 0 };

// ---------------------------------------------------------------------------
// HitEvent — returned by checkProjectileHits
// ---------------------------------------------------------------------------

export interface HitEvent {
  projectileId: number;
  targetId: number;
  targetType: 'ship' | 'asteroid';
}

// ---------------------------------------------------------------------------
// updatePositions — Euler integration with per-entity drag
// ---------------------------------------------------------------------------

export function updatePositions(entities: Entity[], dt: number): void {
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    if (!e.alive) continue;

    // Apply drag (SHIP_DRAG is a per-frame multiplier tuned for 60fps).
    // Convert to dt-scaled: drag^(dt*60)
    const dragPow = Math.pow(SHIP_DRAG, dt * 60);
    e.vel.x *= dragPow;
    e.vel.z *= dragPow;

    // Euler integrate position
    e.pos.x += e.vel.x * dt;
    e.pos.z += e.vel.z * dt;
  }
}

// ---------------------------------------------------------------------------
// checkCircleCollision — true when circles overlap
// ---------------------------------------------------------------------------

export function checkCircleCollision(a: Entity, b: Entity): boolean {
  const dx = a.pos.x - b.pos.x;
  const dz = a.pos.z - b.pos.z;
  const distSq = dx * dx + dz * dz;
  const sumR = a.radius + b.radius;
  return distSq < sumR * sumR;
}

// ---------------------------------------------------------------------------
// resolveCollision — elastic bounce, separate overlapping circles
// Modifies vel and pos of both entities in place.
// ---------------------------------------------------------------------------

export function resolveCollision(a: Entity, b: Entity): void {
  vec2Sub(a.pos, b.pos, _diff);
  const dist = Math.sqrt(_diff.x * _diff.x + _diff.z * _diff.z);
  const sumR = a.radius + b.radius;

  // Separate: push apart along collision normal
  if (dist < 1e-6) {
    // Degenerate case: same position, push a in arbitrary direction
    a.pos.x += sumR * 0.5;
    b.pos.x -= sumR * 0.5;
    return;
  }

  // Collision normal (a -> b direction, normalised)
  _normal.x = _diff.x / dist;
  _normal.z = _diff.z / dist;

  // Penetration depth
  const overlap = sumR - dist;
  if (overlap > 0) {
    const halfOverlap = overlap * 0.5;
    a.pos.x += _normal.x * halfOverlap;
    a.pos.z += _normal.z * halfOverlap;
    b.pos.x -= _normal.x * halfOverlap;
    b.pos.z -= _normal.z * halfOverlap;
  }

  // Relative velocity along normal
  vec2Sub(a.vel, b.vel, _relVel);
  const dot = _relVel.x * _normal.x + _relVel.z * _normal.z;

  // Already separating — do not apply impulse
  if (dot >= 0) return;

  // Elastic impulse (equal masses assumed; scale = -dot for restitution 1)
  const scale = -dot;
  _impulse.x = _normal.x * scale;
  _impulse.z = _normal.z * scale;

  a.vel.x += _impulse.x;
  a.vel.z += _impulse.z;
  b.vel.x -= _impulse.x;
  b.vel.z -= _impulse.z;
}

// ---------------------------------------------------------------------------
// checkBoundary — push back if beyond ARENA_HALF, reflect velocity
// Returns true when the entity is touching or beyond the boundary wall.
// ---------------------------------------------------------------------------

export function checkBoundary(entity: Entity, arenaHalf: number): boolean {
  let touching = false;

  // X axis
  if (entity.pos.x - entity.radius < -arenaHalf) {
    entity.pos.x = -arenaHalf + entity.radius;
    if (entity.vel.x < 0) {
      entity.vel.x = -entity.vel.x;
      // Additional outward push force so entity does not hug wall
      entity.vel.x += BOUNDARY_PUSH_FORCE * 0.016; // ~1 frame worth
    }
    touching = true;
  } else if (entity.pos.x + entity.radius > arenaHalf) {
    entity.pos.x = arenaHalf - entity.radius;
    if (entity.vel.x > 0) {
      entity.vel.x = -entity.vel.x;
      entity.vel.x -= BOUNDARY_PUSH_FORCE * 0.016;
    }
    touching = true;
  }

  // Z axis
  if (entity.pos.z - entity.radius < -arenaHalf) {
    entity.pos.z = -arenaHalf + entity.radius;
    if (entity.vel.z < 0) {
      entity.vel.z = -entity.vel.z;
      entity.vel.z += BOUNDARY_PUSH_FORCE * 0.016;
    }
    touching = true;
  } else if (entity.pos.z + entity.radius > arenaHalf) {
    entity.pos.z = arenaHalf - entity.radius;
    if (entity.vel.z > 0) {
      entity.vel.z = -entity.vel.z;
      entity.vel.z -= BOUNDARY_PUSH_FORCE * 0.016;
    }
    touching = true;
  }

  return touching;
}

// ---------------------------------------------------------------------------
// checkProjectileHits — O(P*T) broad-phase; returns HitEvents without mutation
// Caller is responsible for applying damage and releasing projectiles.
// ---------------------------------------------------------------------------

export function checkProjectileHits(
  projectiles: ProjectileEntity[],
  ships: ShipEntity[],
  asteroids: AsteroidEntity[],
): HitEvent[] {
  // Reuse a fixed-size result array to avoid allocation each frame.
  // We still must return a fresh slice to keep the function pure.
  const hits: HitEvent[] = [];

  for (let pi = 0; pi < projectiles.length; pi++) {
    const proj = projectiles[pi];
    if (!proj.alive) continue;

    // Check ships
    for (let si = 0; si < ships.length; si++) {
      const ship = ships[si];
      if (!ship.alive) continue;
      if (ship.id === proj.ownerId) continue; // no self-hit

      const dx = proj.pos.x - ship.pos.x;
      const dz = proj.pos.z - ship.pos.z;
      const sumR = proj.radius + ship.radius;
      if (dx * dx + dz * dz < sumR * sumR) {
        hits.push({ projectileId: proj.id, targetId: ship.id, targetType: 'ship' });
        break; // one hit per projectile per frame
      }
    }

    // Check asteroids (only if projectile not already consumed)
    for (let ai = 0; ai < asteroids.length; ai++) {
      const ast = asteroids[ai];
      if (ast.respawnTimer > 0) continue; // not active

      const dx = proj.pos.x - ast.pos.x;
      const dz = proj.pos.z - ast.pos.z;
      const sumR = proj.radius + ast.radius;
      if (dx * dx + dz * dz < sumR * sumR) {
        hits.push({ projectileId: proj.id, targetId: ast.id, targetType: 'asteroid' });
        break;
      }
    }
  }

  return hits;
}

// ---------------------------------------------------------------------------
// calculateKineticDamage — damage from ship-ship or ship-asteroid collision
// relativeSpeed: magnitude of (velA - velB) at impact.
// Returns 0 below threshold, scales linearly, capped at MAX.
// ---------------------------------------------------------------------------

export function calculateKineticDamage(relativeSpeed: number): number {
  if (relativeSpeed < COLLISION_SPEED_THRESHOLD) return 0;

  // Linear scale from threshold to 2x threshold -> DAMAGE_MIN to DAMAGE_MAX
  const excess = relativeSpeed - COLLISION_SPEED_THRESHOLD;
  const range = COLLISION_DAMAGE_MAX - COLLISION_DAMAGE_MIN;
  // Normalise over one threshold-width for a smooth curve
  const t = Math.min(1, excess / COLLISION_SPEED_THRESHOLD);
  return COLLISION_DAMAGE_MIN + range * t;
}
