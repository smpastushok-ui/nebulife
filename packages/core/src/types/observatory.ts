import type { Discovery, DiscoveryRarity } from '../game/discovery.js';

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

export interface ObservatoryReportRecord {
  id: string;
  sessionId: string;
  duration: ObservatorySearchDuration;
  program: ObservatorySearchProgram;
  completedAt: number;
  discoveryType: string | null;
  rarity: DiscoveryRarity | null;
  duplicate: boolean;
  xpGained: number;
  leveledUp: boolean;
  /**
   * Full discovery payload for the matching hit, attached client-side after
   * completion (systemId corrected to the home system). Lets the report card
   * and the system-chat notification re-open the discovery later. Null/absent
   * for no-signal reports.
   */
  discovery?: Discovery | null;
}

export interface ObservatoryState {
  xp: number;
  searchesCompleted: number;
  successfulSignals: number;
  duplicateSignals: number;
  duplicateStreak: number;
  sessions: ObservatorySearchSession[];
  events: Record<string, ObservatoryEventRecord>;
  reports: ObservatoryReportRecord[];
}
