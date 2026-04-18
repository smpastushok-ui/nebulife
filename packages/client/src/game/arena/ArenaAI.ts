// ---------------------------------------------------------------------------
// Arena AI — Finite State Machine bot brain
// Pure functions, no THREE dependency
// ---------------------------------------------------------------------------

import type { ShipEntity, InputState, Vec2 } from './ArenaTypes.js';
import {
  ARENA_HALF,
  SHIP_MAX_SPEED,
} from './ArenaConstants.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BotState = 'patrol' | 'chase' | 'attack' | 'flee';
export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface BotBrain {
  state: BotState;
  targetId: number | null;
  waypoint: Vec2 | null;
  decisionTimer: number; // seconds until next decision tick
  difficulty: BotDifficulty;
  attackTimer: number;   // seconds spent attacking current target
  // Persistent aim-error offset so the bot doesn't visibly jitter each tick.
  // Rerolled every ~1.5s inside the FSM rather than applied fresh per-frame.
  aimErrorAngle: number;
  aimErrorTimer: number;
}

// ---------------------------------------------------------------------------
// Difficulty params
// ---------------------------------------------------------------------------

interface DifficultyParams {
  aimOffsetRad: number;   // max random aim error in radians
  decisionInterval: number; // seconds between FSM ticks
}

const DIFFICULTY_PARAMS: Record<BotDifficulty, DifficultyParams> = {
  easy:   { aimOffsetRad: 15 * (Math.PI / 180), decisionInterval: 0.8 },
  medium: { aimOffsetRad:  8 * (Math.PI / 180), decisionInterval: 0.4 },
  hard:   { aimOffsetRad:  2 * (Math.PI / 180), decisionInterval: 0.2 },
};

// FSM range thresholds (units)
const RANGE_DETECT = 300;  // patrol -> chase
const RANGE_ATTACK = 150;  // chase -> attack
const RANGE_DISENGAGE = 400; // chase -> patrol (lost target)

const HP_FLEE_THRESHOLD = 0.40;  // flee when HP < 40% (was 25%)
const HP_RALLY_THRESHOLD = 0.70; // flee -> patrol when HP > 70% (was 50%)

// How far from arena center waypoints can spawn
const WAYPOINT_SPREAD = ARENA_HALF * 0.55;

// Circle-strafe orbit radius around attack target
const STRAFE_ORBIT_RADIUS = 120;
const STRAFE_ANGULAR_SPEED = 1.4; // radians/s

// ---------------------------------------------------------------------------
// Vec2 helpers (internal, no import needed)
// ---------------------------------------------------------------------------

function vec2Sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, z: a.z - b.z };
}

function vec2Len(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.z * v.z);
}

function vec2Norm(v: Vec2): Vec2 {
  const len = vec2Len(v);
  if (len < 0.0001) return { x: 0, z: 0 };
  return { x: v.x / len, z: v.z / len };
}

function vec2Scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, z: v.z * s };
}

function vec2Add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, z: a.z + b.z };
}

function vec2Dist(a: Vec2, b: Vec2): number {
  return vec2Len(vec2Sub(a, b));
}

// Rotate a unit vector by angle radians (around Y axis on XZ plane)
function rotateVec2(v: Vec2, angle: number): Vec2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: v.x * cos - v.z * sin,
    z: v.x * sin + v.z * cos,
  };
}

// Seeded-ish pseudo-random offset so bots don't all look the same
let _noiseCounter = 0;
function pseudoRand(): number {
  _noiseCounter = (_noiseCounter * 1664525 + 1013904223) >>> 0;
  return (_noiseCounter >>> 0) / 0xffffffff;
}

function randomWaypoint(): Vec2 {
  const angle = pseudoRand() * Math.PI * 2;
  const dist  = pseudoRand() * WAYPOINT_SPREAD;
  return {
    x: Math.cos(angle) * dist,
    z: Math.sin(angle) * dist,
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createBotBrain(difficulty: BotDifficulty): BotBrain {
  return {
    state: 'patrol',
    targetId: null,
    waypoint: randomWaypoint(),
    decisionTimer: 0,
    difficulty,
    attackTimer: 0,
    aimErrorAngle: 0,
    aimErrorTimer: 0,
  };
}

// ---------------------------------------------------------------------------
// Target helpers
// ---------------------------------------------------------------------------

function findNearestEnemy(self: ShipEntity, allShips: ShipEntity[]): ShipEntity | null {
  let nearest: ShipEntity | null = null;
  let bestDist = Infinity;
  for (const ship of allShips) {
    if (ship.id === self.id || !ship.alive) continue;
    const d = vec2Dist(self.pos, ship.pos);
    if (d < bestDist) {
      bestDist = d;
      nearest = ship;
    }
  }
  return nearest;
}

function getShipById(id: number, allShips: ShipEntity[]): ShipEntity | null {
  return allShips.find(s => s.id === id && s.alive) ?? null;
}

// ---------------------------------------------------------------------------
// Aim with difficulty-based inaccuracy
// ---------------------------------------------------------------------------

/**
 * Apply persistent aim error. The offset angle is stored on `brain` and only
 * rerolled periodically (handled in updateBot). Calling this every frame no
 * longer randomizes the aim direction — that was the source of the visible
 * nose-jitter during cruising.
 */
/**
 * Separation steering — sum of unit-vectors pointing away from any other
 * live ship within `radius`, weighted linearly by proximity. Returned as a
 * world-space vector (NOT normalized — magnitude encodes crowding pressure).
 * Used to prevent bots stacking on each other while chasing the same target.
 */
function computeSeparation(self: ShipEntity, allShips: ShipEntity[], radius: number): Vec2 {
  let x = 0, z = 0;
  for (const other of allShips) {
    if (other.id === self.id || !other.alive) continue;
    const dx = self.pos.x - other.pos.x;
    const dz = self.pos.z - other.pos.z;
    const dSq = dx * dx + dz * dz;
    if (dSq > radius * radius || dSq < 0.01) continue;
    const d = Math.sqrt(dSq);
    const w = 1 - d / radius;
    x += (dx / d) * w;
    z += (dz / d) * w;
  }
  return { x, z };
}

function applyAimError(aimDir: Vec2, brain: BotBrain, offsetRad: number): Vec2 {
  if (offsetRad <= 0) return aimDir;
  // Clamp stored angle to current difficulty's max offset (safety if difficulty changed)
  const angle = Math.max(-offsetRad, Math.min(offsetRad, brain.aimErrorAngle));
  return rotateVec2(aimDir, angle);
}

// ---------------------------------------------------------------------------
// State handlers — each returns partial InputState data
// ---------------------------------------------------------------------------

interface PatrolResult {
  nextState: BotState;
  moveDir: Vec2;
  aimDir: Vec2;
  firing: boolean;
  dash: boolean;
  newWaypoint: Vec2 | null;
  newTargetId: number | null;
}

function handlePatrol(
  brain: BotBrain,
  self: ShipEntity,
  allShips: ShipEntity[],
  params: DifficultyParams,
): PatrolResult {
  // Check for nearby enemies first
  const nearest = findNearestEnemy(self, allShips);
  if (nearest && vec2Dist(self.pos, nearest.pos) < RANGE_DETECT) {
    return {
      nextState: 'chase',
      moveDir: { x: 0, z: 0 },
      aimDir: { x: 0, z: 1 },
      firing: false,
      dash: false,
      newWaypoint: brain.waypoint,
      newTargetId: nearest.id,
    };
  }

  // Move toward current waypoint
  let waypoint = brain.waypoint ?? randomWaypoint();
  const toWaypoint = vec2Sub(waypoint, self.pos);
  const distToWaypoint = vec2Len(toWaypoint);

  // Pick new waypoint when close enough — and immediately aim movement at it
  // so the bot never has a moment of "arrived → stopped".
  let newWaypoint = waypoint;
  if (distToWaypoint < 40) {
    newWaypoint = randomWaypoint();
    waypoint = newWaypoint;
  }

  // Always move toward the (possibly just-picked) waypoint.
  const moveDir = vec2Norm(vec2Sub(waypoint, self.pos));
  // Aim in direction of travel
  const rawAim = moveDir.x !== 0 || moveDir.z !== 0 ? moveDir : { x: 0, z: 1 };
  const aimDir = applyAimError(rawAim, brain, params.aimOffsetRad);

  return {
    nextState: 'patrol',
    moveDir,
    aimDir,
    firing: false,
    dash: false,
    newWaypoint,
    newTargetId: null,
  };
}

function handleChase(
  brain: BotBrain,
  self: ShipEntity,
  allShips: ShipEntity[],
  params: DifficultyParams,
): PatrolResult {
  // Boundary check — abort chase if too close to edge
  const distFromCenter = Math.sqrt(self.pos.x * self.pos.x + self.pos.z * self.pos.z);
  if (distFromCenter > ARENA_HALF * 0.75) {
    return {
      nextState: 'patrol',
      moveDir: vec2Norm({ x: -self.pos.x, z: -self.pos.z }),
      aimDir: vec2Norm({ x: -self.pos.x, z: -self.pos.z }),
      firing: false,
      dash: false,
      newWaypoint: randomWaypoint(),
      newTargetId: null,
    };
  }

  // Re-find target or nearest if lost
  let target = brain.targetId !== null ? getShipById(brain.targetId, allShips) : null;
  if (!target) {
    target = findNearestEnemy(self, allShips);
  }
  if (!target) {
    // No enemy — patrol toward a waypoint instead of standing still
    const wp = brain.waypoint ?? randomWaypoint();
    const toWp = vec2Sub(wp, self.pos);
    const wpDist = vec2Len(toWp);
    return {
      nextState: 'patrol',
      moveDir: wpDist > 1 ? vec2Norm(toWp) : vec2Norm({ x: Math.random() - 0.5, z: Math.random() - 0.5 }),
      aimDir: { x: 0, z: 1 },
      firing: false,
      dash: false,
      newWaypoint: wpDist < 40 ? randomWaypoint() : wp,
      newTargetId: null,
    };
  }

  const dist = vec2Dist(self.pos, target.pos);

  // Transition checks
  if (dist > RANGE_DISENGAGE) {
    const wp = randomWaypoint();
    const toWp = vec2Sub(wp, self.pos);
    return {
      nextState: 'patrol',
      moveDir: vec2Len(toWp) > 1 ? vec2Norm(toWp) : { x: 0, z: 1 },
      aimDir: { x: 0, z: 1 },
      firing: false,
      dash: false,
      newWaypoint: wp,
      newTargetId: null,
    };
  }
  if (dist < RANGE_ATTACK) {
    // Transition to attack — reset attack timer
    brain.attackTimer = 0;
    const toTarget = vec2Sub(target.pos, self.pos);
    const toTargetNorm = vec2Norm(toTarget);
    const tangent: Vec2 = { x: -toTargetNorm.z, z: toTargetNorm.x };
    return {
      nextState: 'attack',
      moveDir: tangent,
      aimDir: applyAimError(toTargetNorm, brain, params.aimOffsetRad),
      firing: true,
      dash: false,
      newWaypoint: brain.waypoint,
      newTargetId: target.id,
    };
  }

  const toTarget = vec2Sub(target.pos, self.pos);
  const pursueDir = vec2Norm(toTarget);
  // Blend separation in during chase so converging bots don't clump while
  // racing to the same target.
  const separation = computeSeparation(self, allShips, 70);
  const moveDir = vec2Norm(vec2Add(pursueDir, vec2Scale(separation, 1.5)));
  const rawAim = applyAimError(pursueDir, brain, params.aimOffsetRad);

  return {
    nextState: 'chase',
    moveDir,
    aimDir: rawAim,
    firing: false,
    dash: false,
    newWaypoint: brain.waypoint,
    newTargetId: target.id,
  };
}

function handleAttack(
  brain: BotBrain,
  self: ShipEntity,
  allShips: ShipEntity[],
  params: DifficultyParams,
): PatrolResult {
  // Attack timeout: disengage after 8-12s to prevent orbit-lock
  const params2 = DIFFICULTY_PARAMS[brain.difficulty];
  brain.attackTimer = (brain.attackTimer ?? 0) + params2.decisionInterval;
  if (brain.attackTimer > 8 + pseudoRand() * 4) {
    brain.attackTimer = 0;
    const newWp = randomWaypoint(); // uses reduced WAYPOINT_SPREAD (550 units max)
    return {
      nextState: 'patrol',
      moveDir: vec2Norm(vec2Sub(newWp, self.pos)),
      aimDir: { x: 0, z: 1 },
      firing: false,
      dash: self.dashCooldown <= 0,
      newWaypoint: newWp,
      newTargetId: null,
    };
  }

  // Flee if low HP
  if (self.hp / self.maxHp < HP_FLEE_THRESHOLD) {
    return {
      nextState: 'flee',
      moveDir: vec2Norm({ x: -self.pos.x, z: -self.pos.z }), // flee toward center
      aimDir: { x: 0, z: 1 },
      firing: false,
      dash: true, // dash away immediately
      newWaypoint: brain.waypoint,
      newTargetId: brain.targetId,
    };
  }

  let target = brain.targetId !== null ? getShipById(brain.targetId, allShips) : null;
  if (!target) {
    target = findNearestEnemy(self, allShips);
  }
  if (!target) {
    const wp = brain.waypoint ?? randomWaypoint();
    const toWp = vec2Sub(wp, self.pos);
    return {
      nextState: 'patrol',
      moveDir: vec2Len(toWp) > 1 ? vec2Norm(toWp) : vec2Norm({ x: Math.random() - 0.5, z: Math.random() - 0.5 }),
      aimDir: { x: 0, z: 1 },
      firing: false,
      dash: false,
      newWaypoint: randomWaypoint(),
      newTargetId: null,
    };
  }

  const dist = vec2Dist(self.pos, target.pos);
  if (dist > RANGE_DISENGAGE) {
    // Target ran too far — chase it instead of standing still.
    const pursueDir = vec2Norm(vec2Sub(target.pos, self.pos));
    return {
      nextState: 'chase',
      moveDir: pursueDir,
      aimDir: applyAimError(pursueDir, brain, params.aimOffsetRad),
      firing: false,
      dash: false,
      newWaypoint: brain.waypoint,
      newTargetId: target.id,
    };
  }

  // Circle-strafe around target with per-bot orbit radius to prevent stacking
  const myOrbitRadius = 80 + (self.id % 5) * 20; // 80, 100, 120, 140, 160

  const toTarget = vec2Sub(target.pos, self.pos);
  const toTargetNorm = vec2Norm(toTarget);

  // Tangent = rotate 90 degrees
  const tangent: Vec2 = { x: -toTargetNorm.z, z: toTargetNorm.x };

  // If too close, back off; if too far, close in
  let radialComponent = 0;
  if (dist < myOrbitRadius * 0.7) {
    radialComponent = -1; // back away
  } else if (dist > myOrbitRadius * 1.3) {
    radialComponent = 1; // close in
  }

  const radialDir = toTargetNorm;
  // Blend: tangent orbit + radial adjust + separation from other ships.
  // Separation radius 80u — bots won't push each other apart unless already
  // crowding the same slice of the target's orbit.
  const separation = computeSeparation(self, allShips, 80);
  const moveDir = vec2Norm(
    vec2Add(
      vec2Add(
        vec2Scale(tangent, STRAFE_ANGULAR_SPEED),
        vec2Scale(radialDir, radialComponent),
      ),
      vec2Scale(separation, 2.0),
    ),
  );

  // Aim directly at target (with error)
  const rawAim = toTargetNorm;
  const aimDir = applyAimError(rawAim, brain, params.aimOffsetRad);

  // Dodge: if enemy is very close (within 60 units) and dash is available, burst away
  const shouldDash = dist < 60 && self.dashCooldown <= 0;

  return {
    nextState: 'attack',
    moveDir,
    aimDir,
    firing: true,
    dash: shouldDash,
    newWaypoint: brain.waypoint,
    newTargetId: target.id,
  };
}

function handleFlee(
  brain: BotBrain,
  self: ShipEntity,
  allShips: ShipEntity[],
  params: DifficultyParams,
): PatrolResult {
  // Rally when HP recovers
  if (self.hp / self.maxHp > HP_RALLY_THRESHOLD) {
    return {
      nextState: 'patrol',
      moveDir: { x: 0, z: 0 },
      aimDir: { x: 0, z: 1 },
      firing: false,
      dash: false,
      newWaypoint: randomWaypoint(),
      newTargetId: null,
    };
  }

  // Move away from nearest enemy — toward center when near edge
  const nearest = findNearestEnemy(self, allShips);
  const distFromCenter = Math.sqrt(self.pos.x * self.pos.x + self.pos.z * self.pos.z);

  let fleeDir: Vec2;
  if (distFromCenter > ARENA_HALF * 0.7) {
    // Near edge — always flee toward center
    fleeDir = vec2Norm({ x: -self.pos.x, z: -self.pos.z });
  } else if (nearest) {
    // Flee perpendicular to enemy (strafe away, not straight back toward edge)
    const toEnemy = vec2Sub(nearest.pos, self.pos);
    const awayFromEnemy = vec2Norm(vec2Scale(toEnemy, -1));
    // Rotate 90 degrees for perpendicular escape
    fleeDir = { x: -awayFromEnemy.z, z: awayFromEnemy.x };
  } else {
    // No enemy — flee toward center
    fleeDir = vec2Norm({ x: -self.pos.x, z: -self.pos.z });
  }

  // Aim away from threat (no need to fire while fleeing)
  const aimDir = applyAimError(fleeDir, brain, params.aimOffsetRad * 2);

  return {
    nextState: 'flee',
    moveDir: fleeDir,
    aimDir,
    firing: false,
    dash: self.dashCooldown <= 0, // dash if available
    newWaypoint: brain.waypoint,
    newTargetId: brain.targetId,
  };
}

// ---------------------------------------------------------------------------
// Main update — mutates brain in place, returns InputState
// ---------------------------------------------------------------------------

/** Persistent output buffer reused by updateBot between FSM ticks. */
const _lastBotInput = new WeakMap<BotBrain, InputState>();

export function updateBot(
  brain: BotBrain,
  self: ShipEntity,
  allShips: ShipEntity[],
  dt: number,
): InputState {
  if (!self.alive) {
    return { moveDir: { x: 0, z: 0 }, aimDir: { x: 0, z: 1 }, firing: false, dash: false };
  }

  const params = DIFFICULTY_PARAMS[brain.difficulty];

  // Reroll the persistent aim-error offset every ~1.5s so bots don't hold a
  // constant miss forever but also don't jitter every frame.
  brain.aimErrorTimer -= dt;
  if (brain.aimErrorTimer <= 0) {
    brain.aimErrorAngle = (pseudoRand() * 2 - 1) * params.aimOffsetRad;
    brain.aimErrorTimer = 1.5;
  }

  // Tick decision timer
  brain.decisionTimer -= dt;
  const shouldDecide = brain.decisionTimer <= 0;
  if (shouldDecide) {
    brain.decisionTimer = params.decisionInterval;
  }

  // Between ticks — replay the last FSM output rather than running a
  // simplified parallel path (which previously caused noticeable course
  // changes at each decision tick). Move/aim targets recompute at the bot's
  // current position in the engine, so replaying is safe.
  if (!shouldDecide) {
    const prev = _lastBotInput.get(brain);
    if (prev) {
      // Refresh aim/move vectors against current target to avoid stale angles
      // when the target moves between ticks.
      return refreshInputAgainstTarget(prev, brain, self, allShips, params);
    }
  }

  let result: PatrolResult;

  switch (brain.state) {
    case 'patrol':
      result = handlePatrol(brain, self, allShips, params);
      break;
    case 'chase':
      result = handleChase(brain, self, allShips, params);
      break;
    case 'attack':
      result = handleAttack(brain, self, allShips, params);
      break;
    case 'flee':
      result = handleFlee(brain, self, allShips, params);
      break;
    default:
      result = handlePatrol(brain, self, allShips, params);
  }

  // Apply state mutation
  brain.state = result.nextState;
  brain.targetId = result.newTargetId;
  if (result.newWaypoint !== null) {
    brain.waypoint = result.newWaypoint;
  }

  const out: InputState = {
    moveDir: result.moveDir,
    aimDir:  result.aimDir,
    firing:  result.firing,
    dash:    result.dash,
  };
  _lastBotInput.set(brain, out);
  return out;
}

/**
 * Between FSM ticks, re-orient move/aim toward the current target position
 * so moving enemies don't appear to be "ignored" until the next decision.
 * When the bot has no live target, fall back to the last output unchanged.
 */
function refreshInputAgainstTarget(
  prev: InputState,
  brain: BotBrain,
  self: ShipEntity,
  allShips: ShipEntity[],
  params: DifficultyParams,
): InputState {
  if (brain.state === 'attack' || brain.state === 'chase') {
    const target = brain.targetId !== null ? getShipById(brain.targetId, allShips) : null;
    if (target) {
      const toTarget = vec2Norm(vec2Sub(target.pos, self.pos));
      return {
        moveDir: brain.state === 'attack'
          ? { x: -toTarget.z, z: toTarget.x } // keep orbiting tangentially
          : toTarget,
        aimDir: applyAimError(toTarget, brain, params.aimOffsetRad),
        firing: prev.firing,
        dash: false,
      };
    }
  }
  return prev;
}

// computeContinuationInput was replaced by refreshInputAgainstTarget —
// between-tick behavior is now a light refresh of the last FSM output
// instead of a parallel state machine.
