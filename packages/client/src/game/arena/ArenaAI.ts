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
const WAYPOINT_SPREAD = ARENA_HALF * 0.8;

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

function applyAimError(aimDir: Vec2, offsetRad: number): Vec2 {
  if (offsetRad <= 0) return aimDir;
  // Random angle in [-offsetRad, +offsetRad]
  const angle = (pseudoRand() * 2 - 1) * offsetRad;
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

  // Pick new waypoint when close enough
  let newWaypoint = waypoint;
  if (distToWaypoint < 40) {
    newWaypoint = randomWaypoint();
  }

  const moveDir = distToWaypoint > 1 ? vec2Norm(toWaypoint) : { x: 0, z: 0 };
  // Aim in direction of travel
  const rawAim = moveDir.x !== 0 || moveDir.z !== 0 ? moveDir : { x: 0, z: 1 };
  const aimDir = applyAimError(rawAim, params.aimOffsetRad);

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
    // Transition to attack — start circle-strafing immediately
    const toTarget = vec2Sub(target.pos, self.pos);
    const toTargetNorm = vec2Norm(toTarget);
    const tangent: Vec2 = { x: -toTargetNorm.z, z: toTargetNorm.x };
    return {
      nextState: 'attack',
      moveDir: tangent,
      aimDir: applyAimError(toTargetNorm, params.aimOffsetRad),
      firing: true,
      dash: false,
      newWaypoint: brain.waypoint,
      newTargetId: target.id,
    };
  }

  const toTarget = vec2Sub(target.pos, self.pos);
  const moveDir = vec2Norm(toTarget);
  const rawAim = applyAimError(moveDir, params.aimOffsetRad);

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
  // Flee if low HP
  if (self.hp / self.maxHp < HP_FLEE_THRESHOLD) {
    return {
      nextState: 'flee',
      moveDir: vec2Norm(vec2Scale(vec2Sub(self.pos, { x: 0, z: 0 }), 1)), // flee toward edge
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
    return {
      nextState: 'chase',
      moveDir: { x: 0, z: 0 },
      aimDir: { x: 0, z: 1 },
      firing: false,
      dash: false,
      newWaypoint: brain.waypoint,
      newTargetId: target.id,
    };
  }

  // Circle-strafe around target
  // Compute tangent direction (perpendicular to radius vector)
  const toTarget = vec2Sub(target.pos, self.pos);
  const toTargetNorm = vec2Norm(toTarget);

  // Tangent = rotate 90 degrees
  const tangent: Vec2 = { x: -toTargetNorm.z, z: toTargetNorm.x };

  // If too close, back off; if too far, close in
  let radialComponent = 0;
  if (dist < STRAFE_ORBIT_RADIUS * 0.7) {
    radialComponent = -1; // back away
  } else if (dist > STRAFE_ORBIT_RADIUS * 1.3) {
    radialComponent = 1; // close in
  }

  const radialDir = toTargetNorm;
  const moveDir = vec2Norm(
    vec2Add(
      vec2Scale(tangent, STRAFE_ANGULAR_SPEED),
      vec2Scale(radialDir, radialComponent),
    ),
  );

  // Aim directly at target (with error)
  const rawAim = toTargetNorm;
  const aimDir = applyAimError(rawAim, params.aimOffsetRad);

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

  // Move away from nearest enemy, toward arena edge
  const nearest = findNearestEnemy(self, allShips);

  let fleeDir: Vec2;
  if (nearest) {
    const toEnemy = vec2Sub(nearest.pos, self.pos);
    // Opposite of toward enemy
    fleeDir = vec2Norm(vec2Scale(toEnemy, -1));
  } else {
    // No enemy visible — move toward arena edge (away from center)
    const toCenter = vec2Sub({ x: 0, z: 0 }, self.pos);
    fleeDir = vec2Norm(vec2Scale(toCenter, -1));
  }

  // Aim away from threat (no need to fire while fleeing)
  const aimDir = applyAimError(fleeDir, params.aimOffsetRad * 2);

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

  // Tick decision timer
  brain.decisionTimer -= dt;
  const shouldDecide = brain.decisionTimer <= 0;
  if (shouldDecide) {
    brain.decisionTimer = params.decisionInterval;
  }

  // Only run FSM on decision ticks (between ticks keep last output)
  if (!shouldDecide) {
    // Between ticks: compute a simple movement continuation so the bot
    // doesn't freeze — use current state without re-evaluating transitions.
    return computeContinuationInput(brain, self, allShips, params);
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

  return {
    moveDir: result.moveDir,
    aimDir:  result.aimDir,
    firing:  result.firing,
    dash:    result.dash,
  };
}

// ---------------------------------------------------------------------------
// Between-tick continuation — keeps the bot moving without full re-evaluation
// ---------------------------------------------------------------------------

function computeContinuationInput(
  brain: BotBrain,
  self: ShipEntity,
  allShips: ShipEntity[],
  params: DifficultyParams,
): InputState {
  switch (brain.state) {
    case 'patrol': {
      const waypoint = brain.waypoint ?? { x: 0, z: 0 };
      const toWaypoint = vec2Sub(waypoint, self.pos);
      const moveDir = vec2Len(toWaypoint) > 1 ? vec2Norm(toWaypoint) : { x: 0, z: 0 };
      const aimDir = moveDir.x !== 0 || moveDir.z !== 0
        ? applyAimError(moveDir, params.aimOffsetRad)
        : { x: 0, z: 1 };
      return { moveDir, aimDir, firing: false, dash: false };
    }
    case 'chase': {
      const target = brain.targetId !== null ? getShipById(brain.targetId, allShips) : null;
      if (!target) {
        // No target — keep moving toward waypoint instead of freezing
        const wp = brain.waypoint ?? { x: 0, z: 0 };
        const toWp = vec2Sub(wp, self.pos);
        const md = vec2Len(toWp) > 1 ? vec2Norm(toWp) : { x: 0, z: 1 };
        return { moveDir: md, aimDir: md, firing: false, dash: false };
      }
      const moveDir = vec2Norm(vec2Sub(target.pos, self.pos));
      return { moveDir, aimDir: applyAimError(moveDir, params.aimOffsetRad), firing: false, dash: false };
    }
    case 'attack': {
      const target = brain.targetId !== null ? getShipById(brain.targetId, allShips) : null;
      if (!target) {
        const wp = brain.waypoint ?? { x: 0, z: 0 };
        const toWp = vec2Sub(wp, self.pos);
        const md = vec2Len(toWp) > 1 ? vec2Norm(toWp) : { x: 0, z: 1 };
        return { moveDir: md, aimDir: md, firing: false, dash: false };
      }
      const toTarget = vec2Norm(vec2Sub(target.pos, self.pos));
      const tangent: Vec2 = { x: -toTarget.z, z: toTarget.x };
      return {
        moveDir: tangent,
        aimDir: applyAimError(toTarget, params.aimOffsetRad),
        firing: true,
        dash: false,
      };
    }
    case 'flee': {
      const nearest = findNearestEnemy(self, allShips);
      if (!nearest) {
        // No enemy — move toward center to recover
        const toCenter = vec2Sub({ x: 0, z: 0 }, self.pos);
        const md = vec2Len(toCenter) > 1 ? vec2Norm(toCenter) : { x: 0, z: 1 };
        return { moveDir: md, aimDir: md, firing: false, dash: false };
      }
      const awayDir = vec2Norm(vec2Scale(vec2Sub(nearest.pos, self.pos), -1));
      return {
        moveDir: awayDir,
        aimDir: applyAimError(awayDir, params.aimOffsetRad * 2),
        firing: false,
        dash: self.dashCooldown <= 0,
      };
    }
    default:
      return { moveDir: { x: 0, z: 0 }, aimDir: { x: 0, z: 1 }, firing: false, dash: false };
  }
}
