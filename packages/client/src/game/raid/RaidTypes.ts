export type RaidPhase = 'approach' | 'waves' | 'reactor' | 'victory' | 'defeat';
export type RaidTeam = 'allied' | 'enemy';
export type RaidModuleType = 'hangar_bay' | 'shield_emitter' | 'turret_cluster' | 'reactor_core';

export interface RaidKillFeedback {
  kills: number;
  source: 'player' | 'wingman';
}

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
