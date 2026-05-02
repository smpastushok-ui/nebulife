import type { DiscoveryRarity } from '../game/discovery.js';

export type ObservatorySearchDuration = '1h' | '6h' | '24h';

export type ObservatorySearchProgram =
  | 'routine_sky_watch'
  | 'anomaly_sweep'
  | 'phenomenon_survey'
  | 'deep_space_watch'
  | 'catalog_completion';

export interface ObservatorySearchSession {
  id: string;
  duration: ObservatorySearchDuration;
  program: ObservatorySearchProgram;
  startedAt: number;
  completesAt: number;
  seed: number;
}

export interface ObservatoryEventRecord {
  type: string;
  rarity: DiscoveryRarity;
  count: number;
  firstDiscoveredAt: number;
  lastDiscoveredAt: number;
}

export interface ObservatoryState {
  xp: number;
  searchesCompleted: number;
  successfulSignals: number;
  duplicateSignals: number;
  duplicateStreak: number;
  sessions: ObservatorySearchSession[];
  events: Record<string, ObservatoryEventRecord>;
}
