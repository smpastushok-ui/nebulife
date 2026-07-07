export const RAID_SECTOR_HALF = 10400;
export const RAID_HEIGHT_HALF = 2000;
export const RAID_PLAYER_HP = 130;
export const RAID_PLAYER_SHIELD = 80;
export const RAID_ALLY_HP = 95;
export const RAID_ALLY_SHIELD = 55;
export const RAID_DRONE_HP = 18;
export const RAID_SPEED = 280;
export const RAID_ACCELERATION = 620;
export const RAID_DRAG = 0.97;
export const RAID_PROJECTILE_SPEED = 1050;
export const RAID_PROJECTILE_LIFETIME = 1.8;
export const RAID_PROJECTILE_DAMAGE = 16;
export const RAID_ALLY_DAMAGE = 12;
export const RAID_ENEMY_DAMAGE = 5;
export const RAID_SHIELD_REGEN_RATE = 8;
export const RAID_SHIELD_REGEN_DELAY = 4;
export const RAID_PROJECTILE_POOL_MID = 140;
export const RAID_PROJECTILE_POOL_HIGH = 220;
export const RAID_ACTIVE_ENEMIES_MID = 18;
export const RAID_ACTIVE_ENEMIES_HIGH = 30;
export const RAID_WINGMEN = 4;
export const RAID_WAVE_INTERVAL = 12;
export const RAID_BARREL_ROLL_DURATION = 0.6;
export const RAID_BARREL_ROLL_COOLDOWN = 4.0;
export const RAID_ENEMY_SPAWN_INTERVAL_DESKTOP = 1.9;
export const RAID_ENEMY_SPAWN_INTERVAL_MOBILE = 2.6;

export const RAID_WAVES = [
  { at: 4, count: 8 },
  { at: 20, count: 10 },
  { at: 44, count: 14 },
  { at: 76, count: 18 },
  { at: 112, count: 22 },
];

export const RAID_REWARD_BASE_XP = 80;
export const RAID_REWARD_XP_PER_KILL = 4;
export const RAID_REWARD_XP_PER_MODULE = 35;

// ── Unified Pixi engine tunables (NEXT_GEN_PLAN section A) ──────────────────
// None of the values above this line changed — rewards/HP/damage stay
// identical to the pre-consolidation engines so raid balance is unaffected.

/** ParticleContainer pool size per device tier (engine trails, hit sparks, debris). */
export const RAID_PARTICLE_BUDGET_LOW = 150;
export const RAID_PARTICLE_BUDGET_MID = 400;
export const RAID_PARTICLE_BUDGET_HIGH = 900;

/** 16 baked rotation angles per ship sprite atlas (GLB → offscreen bake). */
export const RAID_SHIP_BAKE_ANGLES = 16;
/** Baked cell resolution (px) per tier — atlas is ANGLES*size x 2*size (normal + damaged row). */
export const RAID_SHIP_BAKE_SIZE_LOW = 96;
export const RAID_SHIP_BAKE_SIZE_MID = 128;
export const RAID_SHIP_BAKE_SIZE_HIGH = 160;

/** Dynamic resolution scaling — drop to 0.8x after 3 consecutive slow frames, restore after 2s stable. */
export const RAID_DYNRES_FRAME_MS_THRESHOLD = 20;
export const RAID_DYNRES_BAD_FRAMES_TO_DROP = 3;
export const RAID_DYNRES_STABLE_MS_TO_RESTORE = 2000;
export const RAID_DYNRES_SCALE = 0.8;

/** Cheap premium feedback — hit-stop, screen shake, hit flash, wave-clear slow-mo. */
export const RAID_HITSTOP_KILL_MS = 50; // ~3 frames @60fps
export const RAID_SCREEN_SHAKE_HIT = 3;
export const RAID_SCREEN_SHAKE_KILL = 6;
export const RAID_SCREEN_SHAKE_MODULE_DESTROYED = 9;
export const RAID_SCREEN_SHAKE_MAX = 16;
export const RAID_SCREEN_SHAKE_DECAY_PER_SEC = 10;
export const RAID_HIT_FLASH_MS = 130;
export const RAID_WAVE_CLEAR_SLOWMO_MS = 300;
export const RAID_WAVE_CLEAR_SLOWMO_FACTOR = 0.3;
