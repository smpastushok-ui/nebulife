import type * as THREE from 'three';

export type RaidPhase = 'approach' | 'waves' | 'reactor' | 'victory' | 'defeat';
export type RaidTeam = 'allied' | 'enemy';
export type RaidModuleType = 'hangar_bay' | 'shield_emitter' | 'turret_cluster' | 'reactor_core';

export interface RaidCallbacks {
  onExit: () => void;
  onStatsUpdate?: (snapshot: RaidSnapshot) => void;
  onKill?: (feedback: RaidKillFeedback) => void;
  onRaidEnd?: (result: RaidResult) => void;
}

export interface RaidSnapshot {
  phase: RaidPhase;
  elapsedSec: number;
  playerHp: number;
  playerMaxHp: number;
  playerShield: number;
  playerMaxShield: number;
  alliedAlive: number;
  enemiesActive: number;
  kills: number;
  modulesDestroyed: number;
  modulesTotal: number;
  reactorHp: number;
  reactorMaxHp: number;
  objective: string;
}

export interface RaidResult {
  victory: boolean;
  kills: number;
  modulesDestroyed: number;
  elapsedSec: number;
  xp: number;
  minerals: number;
  isotopes: number;
  techFragments: number;
}

interface RaidKillFeedback {
  kills: number;
  source: 'player' | 'wingman';
}

export interface RaidShip {
  id: number;
  team: RaidTeam;
  name: string;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  radius: number;
  fireCooldown: number;
  shieldDelay: number;
  alive: boolean;
  mesh: THREE.Object3D;
}

export interface RaidModule {
  id: string;
  type: RaidModuleType;
  label: string;
  hp: number;
  maxHp: number;
  radius: number;
  pos: THREE.Vector3;
  mesh: THREE.Object3D;
  alive: boolean;
  fireCooldown: number;
}

export interface RaidProjectile {
  active: boolean;
  team: RaidTeam;
  damage: number;
  age: number;
  lifetime: number;
  radius: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  mesh: THREE.Mesh;
}
