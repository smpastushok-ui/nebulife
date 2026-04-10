// ---------------------------------------------------------------------------
// Arena Types — shared interfaces for the Space Arena module
// ---------------------------------------------------------------------------

export interface Vec2 {
  x: number;
  z: number;
}

// Base entity on XZ plane
export interface Entity {
  id: number;
  pos: Vec2;
  vel: Vec2;
  rotation: number; // radians, Y-axis rotation
  radius: number;   // collision circle radius
  alive: boolean;
}

// Weapon types
export type WeaponType = 'pulse' | 'beam' | 'missile' | 'gravgun';

export interface WeaponSlot {
  type: WeaponType;
  cooldownRemaining: number; // seconds until next fire
}

// Ship entity
export interface ShipEntity extends Entity {
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  shieldRegenTimer: number;  // seconds since last damage taken
  isPlayer: boolean;
  name: string;
  weaponSlots: WeaponSlot[];
  dashCooldown: number;      // seconds until next dash
  isDashing: boolean;
  dashTimer: number;
  modelGroup: THREE.Group | null;
  // Scoring
  kills: number;
  deaths: number;
  damageDealt: number;
}

// Projectile entity
export interface ProjectileEntity extends Entity {
  damage: number;
  lifetime: number;   // max seconds
  age: number;        // current age in seconds
  weaponType: WeaponType;
  ownerId: number;    // ship that fired it
  instanceIndex: number; // InstancedMesh pool index
}

// Asteroid entity
export interface AsteroidEntity extends Entity {
  hp: number;
  maxHp: number;
  rotSpeed: number;     // Y-axis rotation speed
  instanceIndex: number; // InstancedMesh pool index
  respawnTimer: number;  // 0 = active, >0 = waiting to respawn
}

// Black hole event
export interface BlackHoleEntity {
  pos: Vec2;
  pullRadius: number;
  killRadius: number;
  lifetime: number;  // max seconds
  age: number;       // current age
  phase: 'warning' | 'active' | 'collapsing';
}

// Weapon definition (static config)
export interface WeaponDef {
  type: WeaponType;
  damage: number;
  cooldown: number;           // seconds between shots
  projectileSpeed: number;    // units/s
  projectileLifetime: number; // seconds
  projectileRadius: number;   // collision radius
}

// Arena match state
export type MatchPhase = 'waiting' | 'countdown' | 'playing' | 'ended';

// Match results
export interface MatchResult {
  kills: number;
  deaths: number;
  damageDealt: number;
  damageTaken: number;
  survivalTime: number;
  kdRatio: number;
}

// Callbacks from arena engine to React layer
export interface ArenaCallbacks {
  onMatchEnd: (result: MatchResult) => void;
  onExit: () => void;
  onStatsUpdate: (hp: number, maxHp: number, shield: number, maxShield: number, kills: number, deaths: number) => void;
  onPlayerDeath?: () => void;
  onPlayerRespawn?: () => void;
}

// Input state (from controls)
export interface InputState {
  moveDir: Vec2;     // normalized movement direction (0,0 if idle)
  aimDir: Vec2;      // normalized aim direction
  firing: boolean;
  dash: boolean;
}

// Team types for team battle mode
export type Team = 'blue' | 'red';

// Bot brain import (forward reference resolved via ArenaAI.ts)
import type { BotBrain } from './ArenaAI.js';

// Bot ship entity (team battle mode)
export interface BotShip {
  id: number;
  team: Team;
  name: string;
  pos: { x: number; z: number };
  vel: { x: number; z: number };
  rotation: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  respawnTimer: number;
  mesh: THREE.Mesh;
  nickSprite: THREE.Sprite;
  brain: BotBrain;
  fireCooldown: number;
  kills: number;
  deaths: number;
  damageDealt: number;
  dashCooldown: number;
  isDashing: boolean;
  dashTimer: number;         // seconds remaining in current dash
  // Missiles
  missileAmmo: number;
  missileCooldown: number;
  missileReloadTimer: number;
  invulnerableUntil: number; // timestamp ms (performance.now()), 0 = not invulnerable
}

// Bot bullet — separate pool entry with owner tracking
export interface BotBullet {
  x: number;
  z: number;
  vx: number;
  vz: number;
  age: number;
  active: boolean;
  ownerId: number;       // bot id that fired
  ownerTeam: Team;       // blue | red
  rotX: number; rotY: number; rotZ: number;
  rotSpX: number; rotSpY: number; rotSpZ: number;
}

// Extended MatchResult for team mode
export interface TeamMatchResult extends MatchResult {
  teamMode: true;
  playerTeam: Team;
  winningTeam: Team | 'draw';
  blueKills: number;
  redKills: number;
  allPlayers: {
    id: number;
    name: string;
    team: Team;
    kills: number;
    deaths: number;
    damageDealt: number;
    kdRatio: number;
  }[];
}

// Import THREE namespace for model type
import type * as THREE from 'three';
