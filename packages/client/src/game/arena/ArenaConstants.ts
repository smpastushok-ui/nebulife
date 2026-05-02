// ---------------------------------------------------------------------------
// Arena Constants — all tunable gameplay numbers
// ---------------------------------------------------------------------------

import type { WeaponDef, WeaponType } from './ArenaTypes.js';

// Arena dimensions
// 3D semi-sphere: XZ disc radius = ARENA_HALF, vertical extent = ±ARENA_HEIGHT_HALF.
// Players can climb/dive within that Y band. The top/bottom caps act like
// invisible boundaries (same bounce logic as the outer XZ ring).
// Expanded arena volume so TPS dogfights have more room to turn and climb.
export const ARENA_SIZE = 5200;
export const ARENA_HALF = ARENA_SIZE / 2;
export const ARENA_HEIGHT_HALF = 1000;
export const ARENA_GROUND_Y = 5; // ships start / respawn around this Y (was the flat "floor" height)

// Match
export const MAX_SHIPS = 10;
export const BOT_COUNT = 4;
export const MATCH_DURATION = 300; // 5 minutes (per player request)
export const COUNTDOWN_SECONDS = 3;
export const RESPAWN_DELAY = 5;    // seconds
export const INVULNERABILITY_TIME = 3; // seconds after respawn

// Ship stats
export const SHIP_HP = 100;
export const SHIP_SHIELD = 50;
export const SHIELD_REGEN_RATE = 5;    // per second
export const SHIELD_REGEN_DELAY = 4;   // seconds after last damage
export const SHIP_MAX_SPEED = 200;     // units/s
export const SHIP_ACCELERATION = 400;  // units/s^2
export const SHIP_DRAG = 0.97;         // velocity multiplier per frame (60fps)
export const SHIP_RADIUS = 8;          // physical collision radius (ship-ship, ship-asteroid)
// Visual sprite is SHIP_RADIUS * 5 = 40u. The physical radius stays small so
// ramming physics feel tight, but shots need a bigger hitbox so lasers that
// visually strike the wings/fuselage actually register. Half the sprite size.
export const SHIP_SHOT_RADIUS = 18;    // projectile collision radius

// Dash
export const DASH_SPEED = 600;        // units/s burst
export const DASH_DURATION = 0.2;     // seconds
export const DASH_COOLDOWN = 3;       // seconds

// Collision damage
export const COLLISION_DAMAGE_MIN = 2;
export const COLLISION_DAMAGE_MAX = 50;
export const COLLISION_SPEED_THRESHOLD = 50; // below this = no damage

// Asteroids
export const ASTEROID_COUNT = 70;
export const ASTEROID_HP = 5;
export const ASTEROID_MIN_RADIUS = 8;
export const ASTEROID_MAX_RADIUS = 25;
export const ASTEROID_DRIFT_MIN = 5;   // units/s
export const ASTEROID_DRIFT_MAX = 15;
export const ASTEROID_RESPAWN_DELAY = 10; // seconds

// Black hole
export const BLACK_HOLE_SPAWN_MIN = 60;  // seconds
export const BLACK_HOLE_SPAWN_MAX = 120;
export const BLACK_HOLE_LIFETIME = 15;
export const BLACK_HOLE_WARNING_TIME = 3;
export const BLACK_HOLE_PULL_RADIUS = 200;
export const BLACK_HOLE_KILL_RADIUS = 15;
export const BLACK_HOLE_COLLAPSE_TIME = 2;

// Arena boundary
export const BOUNDARY_DAMAGE = 10; // per second while touching
export const BOUNDARY_PUSH_FORCE = 300;

// VFX
export const DEBRIS_LIFETIME = 2;
export const EXPLOSION_POOL_SIZE = 20;
export const DEBRIS_POOL_SIZE = 100;

// Weapons
export const WEAPONS: Record<WeaponType, WeaponDef> = {
  pulse: {
    type: 'pulse',
    damage: 15,
    cooldown: 0.25,
    projectileSpeed: 800,
    projectileLifetime: 0.75,
    projectileRadius: 1.5,
  },
  beam: {
    type: 'beam',
    damage: 40, // per second
    cooldown: 0, // continuous
    projectileSpeed: 0,
    projectileLifetime: 3, // max fire duration
    projectileRadius: 2,
  },
  missile: {
    type: 'missile',
    damage: 45,
    cooldown: 3.5,
    projectileSpeed: 400,
    projectileLifetime: 3,
    projectileRadius: 3,
  },
  gravgun: {
    type: 'gravgun',
    damage: 0,
    cooldown: 6,
    projectileSpeed: 500,
    projectileLifetime: 1.5,
    projectileRadius: 10,
  },
};

// Scoring
export const SCORE_KILL = 100;
export const SCORE_DAMAGE = 1;       // per HP damage
export const SCORE_KINETIC_KILL = 150;

// Team Battle scoring
export const TEAM_SCORE_ENEMY_KILL = 20;   // score per enemy ship kill
export const TEAM_SCORE_DEATH = -10;        // score penalty per death
export const TEAM_KILL_LIMIT = 25;          // kills to win the match

// Team Battle bots
export const TEAM_BOT_COUNT = 9;           // 4 blue allies + 5 red enemies
export const TEAM_BLUE_BOTS = 4;           // allies (excluding player)
export const TEAM_RED_BOTS = 5;            // enemies
export const BOT_BULLET_POOL = 300;        // global bot bullet pool
export const BOT_RESPAWN_DELAY = 5;        // seconds

// Training bots — TPS mode uses 3v3 (player + 2 blue allies vs 3 red enemies).
// Kept the flat constant name for backwards compatibility with serialized
// match results and telemetry; see setupBotShips for the actual split.
export const TRAINING_BOT_COUNT = 5; // 2 blue allies + 3 red enemies, plus the player = 6 ships
export const TRAINING_BLUE_ALLIES = 2;
export const TRAINING_RED_ENEMIES = 3;
export const TRAINING_ASTEROID_COUNT = 30;

// Bot names pool
export const BOT_NAMES = [
  'NOVA', 'BLAZE', 'COMET', 'VORTEX', 'NEBULA',
  'PULSAR', 'QUASAR', 'ZENITH', 'ECLIPSE', 'PHOTON', 'STELLAR', 'COSMIC',
];

// Camera — TPS chase cam.
// Camera sits BEHIND the ship along -aimDir; ship appears at ~center-bottom
// of the screen with game-space stretching ahead. Wider FOV vs the old
// overhead view for a flight feel.
export const CAMERA_FOV = 65;
export const CAMERA_BEHIND = 35;      // units behind ship along -aimDir
export const CAMERA_UP = 12;          // units above ship
export const CAMERA_LOOK_LEAD = 50;   // lookAt shifts forward along +aimDir
export const CAMERA_LOOK_UP = 3;
// Camera is now rigid — attached to the ship's tail. Lerp values kept as
// constants for reference but the code uses .copy() instead so there is
// no detach/chase lag when the ship turns sharply.
export const CAMERA_LERP_POS = 1.0;
export const CAMERA_LERP_LOOK = 1.0;
// Legacy constants kept for code paths not yet migrated off.
export const CAMERA_HEIGHT = 380;
export const CAMERA_DISTANCE = 340;
export const CAMERA_LERP_SPEED = 0.05;

// Rendering
export const MAX_PIXEL_RATIO = 1.5;
export const PROJECTILE_POOL_SIZE = 100;
export const STARFIELD_COUNT = 500;
