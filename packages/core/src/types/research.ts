/** A numeric range representing partial knowledge (narrows as research progresses). */
export interface ObservedRange {
  min: number;
  max: number;
  /** Set when progress reaches 100%. */
  exact?: number;
}

/** Observed data about a star system at current research level. */
export interface SystemObservation {
  starClass: string | null;
  planetCount: ObservedRange | null;
  habitability: ObservedRange | null;
  waterCoverage: ObservedRange | null;
  temperature: ObservedRange | null;
  distanceAU: ObservedRange | null;
}

/** Research state for a single star system. */
export interface SystemResearchState {
  systemId: string;
  /** Research progress 0–100. */
  progress: number;
  isComplete: boolean;
  /** Progressively revealed data. */
  observation: SystemObservation;
}

/** A single observatory research slot. */
export interface ResearchSlot {
  slotIndex: number;
  /** System being researched, or null if slot is free. */
  systemId: string | null;
  /** Timestamp (Date.now()) when current session started. */
  startedAt: number | null;
  /** Ring index of the planet whose observatory provides this slot (0 = home planet). */
  sourcePlanetRing: number;
}

/** Full research state managed by the client. */
export interface ResearchState {
  slots: ResearchSlot[];
  systems: Record<string, SystemResearchState>;
}
