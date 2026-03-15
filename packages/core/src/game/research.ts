import type {
  ResearchState,
  ResearchSlot,
  SystemResearchState,
  SystemObservation,
  ObservedRange,
} from '../types/research.js';
import type { StarSystem } from '../types/universe.js';
import type { Planet } from '../types/planet.js';
import { SeededRNG } from '../math/rng.js';
import {
  RESEARCH_MIN_PROGRESS,
  RESEARCH_MAX_PROGRESS,
  HOME_RESEARCH_MAX_RING,
  RESEARCH_DATA_COST,
} from '../constants/balance.js';
import type { Discovery } from './discovery.js';
import { rollForDiscovery, shouldForceDiscovery } from './discovery.js';
import { COSMIC_CATALOG } from './cosmic-catalog.js';

// ─── Helpers ───────────────────────────────────────────────────────────

/** Spectral class ordering for "nearby class" fuzzing. */
const SPECTRAL_ORDER = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Pick the "best" (most habitable) rocky planet, or first planet. */
function bestPlanet(system: StarSystem) {
  const rocky = system.planets.filter((p) => p.type === 'rocky');
  if (rocky.length === 0) return system.planets[0] ?? null;
  return rocky.reduce((a, b) =>
    b.habitability.overall > a.habitability.overall ? b : a,
  );
}

/** Get the real values we progressively reveal for a star system. */
function realValues(system: StarSystem) {
  const planet = bestPlanet(system);
  return {
    starClass: system.star.spectralClass,
    planetCount: system.planets.length,
    habitability: planet ? planet.habitability.overall : 0,
    waterCoverage: planet?.hydrosphere?.waterCoverageFraction ?? 0,
    temperature: planet?.surfaceTempK ?? 0,
    distanceAU: planet?.orbit.semiMajorAxisAU ?? 0,
  };
}

// ─── Range calculation ─────────────────────────────────────────────────

/**
 * Build an ObservedRange that narrows as progress → 100%.
 *
 * @param real  The true value.
 * @param progress  0–100.
 * @param spread  Base spread at 0 % (e.g. 0.6 means ± 60 % of value).
 * @param noise  Small deterministic noise ∈ [-1, 1] to shift the range.
 * @param lo  Hard lower bound.
 * @param hi  Hard upper bound.
 */
function buildRange(
  real: number,
  progress: number,
  spread: number,
  noise: number,
  lo: number,
  hi: number,
): ObservedRange {
  if (progress >= 100) return { min: real, max: real, exact: real };

  const t = progress / 100; // 0 → 1
  const halfWidth = real * spread * (1 - t) * 0.5;
  // noise shifts center slightly so ranges feel less "centered"
  const shift = halfWidth * noise * 0.4;

  const min = clamp(Math.round((real - halfWidth + shift) * 100) / 100, lo, hi);
  const max = clamp(Math.round((real + halfWidth + shift) * 100) / 100, lo, hi);

  return { min: Math.min(min, real), max: Math.max(max, real) };
}

function buildIntRange(
  real: number,
  progress: number,
  spread: number,
  noise: number,
  lo: number,
  hi: number,
): ObservedRange {
  if (progress >= 100) return { min: real, max: real, exact: real };

  const t = progress / 100;
  const halfWidth = Math.max(1, Math.round(real * spread * (1 - t) * 0.5));
  const shift = Math.round(halfWidth * noise * 0.3);

  const min = clamp(Math.floor(real - halfWidth + shift), lo, hi);
  const max = clamp(Math.ceil(real + halfWidth + shift), lo, hi);

  return { min: Math.min(min, real), max: Math.max(max, real) };
}

// ─── Observation calculation ───────────────────────────────────────────

/**
 * Calculate what the player can "see" about a star system at a given progress.
 * Uses the system seed + progress for deterministic noise.
 */
export function calculateObservation(
  system: StarSystem,
  progress: number,
): SystemObservation {
  const vals = realValues(system);
  const rng = new SeededRNG(system.seed * 31 + Math.floor(progress));

  // Noise values for each parameter
  const n1 = rng.next() * 2 - 1;
  const n2 = rng.next() * 2 - 1;
  const n3 = rng.next() * 2 - 1;
  const n4 = rng.next() * 2 - 1;
  const n5 = rng.next() * 2 - 1;

  if (progress <= 0) {
    return {
      starClass: null,
      planetCount: null,
      habitability: null,
      waterCoverage: null,
      temperature: null,
      distanceAU: null,
    };
  }

  // Star class: fuzzy until ~25 %, then exact
  let starClass: string | null = null;
  if (progress >= 25) {
    starClass = vals.starClass;
  } else {
    // Show ± 1 class
    const idx = SPECTRAL_ORDER.indexOf(vals.starClass);
    if (idx >= 0) {
      const offset = n1 > 0.3 ? 1 : n1 < -0.3 ? -1 : 0;
      const fuzzyIdx = clamp(idx + offset, 0, SPECTRAL_ORDER.length - 1);
      starClass = `${SPECTRAL_ORDER[fuzzyIdx]}-${vals.starClass}`;
      if (fuzzyIdx === idx) starClass = vals.starClass;
    } else {
      starClass = vals.starClass;
    }
  }

  // Planet count: wide range at low %, exact at ~25 %
  const planetCount =
    progress >= 25
      ? { min: vals.planetCount, max: vals.planetCount, exact: progress >= 100 ? vals.planetCount : undefined }
      : buildIntRange(vals.planetCount, progress * 4, 1.2, n2, 0, 20);

  // Water coverage (fraction 0-1): visible from 1 %, narrows over time
  const waterCoverage = buildRange(vals.waterCoverage, progress, 1.2, n3, 0, 1);

  // Temperature (K): visible from ~50 %, narrows
  const temperature =
    progress >= 50
      ? buildRange(vals.temperature, progress, 0.3, n4, 0, 5000)
      : progress >= 25
        ? buildRange(vals.temperature, progress, 0.6, n4, 0, 5000)
        : null;

  // Distance AU: visible from 1 %, narrows
  const distanceAU = buildRange(vals.distanceAU, progress, 1.0, n5, 0, 100);

  // Habitability (0-1): appears at 25 %, narrows
  const habitability =
    progress >= 25
      ? buildRange(vals.habitability, progress, 0.8, n1, 0, 1)
      : null;

  return {
    starClass,
    planetCount,
    habitability,
    waterCoverage,
    temperature,
    distanceAU,
  };
}

// ─── State management ──────────────────────────────────────────────────

/** Create initial research state with the given number of observatory slots. */
export function createResearchState(observatoryCount: number): ResearchState {
  const slots: ResearchSlot[] = [];
  for (let i = 0; i < observatoryCount; i++) {
    slots.push({ slotIndex: i, systemId: null, startedAt: null });
  }
  return { slots, systems: {} };
}

/** Check if a research slot is available and the system is researchable. */
export function canStartResearch(
  state: ResearchState,
  systemId: string,
  ringIndex: number,
): boolean {
  // Only Ring 1 (or configured max) from home
  if (ringIndex > HOME_RESEARCH_MAX_RING) return false;
  // No observatories at all?
  if (state.slots.length === 0) return false;
  // Already fully researched?
  const sys = state.systems[systemId];
  if (sys?.isComplete) return false;
  // Already being researched in a slot?
  if (state.slots.some((s) => s.systemId === systemId)) return false;
  // Any free slot?
  return state.slots.some((s) => s.systemId === null);
}

/** Find the first free slot index, or -1. */
export function findFreeSlot(state: ResearchState): number {
  const slot = state.slots.find((s) => s.systemId === null);
  return slot ? slot.slotIndex : -1;
}

/** Start researching a system in a given slot. Returns a new state (immutable). */
export function startResearch(
  state: ResearchState,
  slotIndex: number,
  systemId: string,
  now: number = Date.now(),
): ResearchState {
  const slots = state.slots.map((s) =>
    s.slotIndex === slotIndex ? { ...s, systemId, startedAt: now } : s,
  );

  // Ensure system entry exists
  const systems = { ...state.systems };
  if (!systems[systemId]) {
    systems[systemId] = {
      systemId,
      progress: 0,
      isComplete: false,
      observation: {
        starClass: null,
        planetCount: null,
        habitability: null,
        waterCoverage: null,
        temperature: null,
        distanceAU: null,
      },
    };
  }

  return { slots, systems };
}

/**
 * Complete a research session: add random progress, recalculate observed ranges,
 * and roll for a potential cosmic discovery.
 *
 * @param totalCompletedSessions  Player's total completed research sessions (for hook mechanic).
 * @param totalDiscoveries        Player's total discoveries made so far (for early-game boost).
 * Returns { state, progressGained, isNowComplete, discovery }.
 */
export function completeResearchSession(
  state: ResearchState,
  slotIndex: number,
  system: StarSystem,
  totalCompletedSessions: number = 0,
  totalDiscoveries: number = 0,
): { state: ResearchState; progressGained: number; isNowComplete: boolean; discovery: Discovery | null } {
  const slot = state.slots[slotIndex];
  if (!slot || !slot.systemId) {
    return { state, progressGained: 0, isNowComplete: false, discovery: null };
  }

  const systemId = slot.systemId;
  const prev = state.systems[systemId];
  if (!prev || prev.isComplete) {
    // Clear slot and return
    const slots = state.slots.map((s) =>
      s.slotIndex === slotIndex ? { ...s, systemId: null, startedAt: null } : s,
    );
    return { state: { ...state, slots }, progressGained: 0, isNowComplete: false, discovery: null };
  }

  // Random progress using system seed + current progress for determinism
  const rng = new SeededRNG(system.seed * 97 + prev.progress * 13 + slotIndex);
  const gained = rng.nextInt(RESEARCH_MIN_PROGRESS, RESEARCH_MAX_PROGRESS);
  const newProgress = Math.min(100, prev.progress + gained);
  const isNowComplete = newProgress >= 100;

  // Recalculate observation
  const observation = calculateObservation(system, newProgress);

  // Hook mechanic: force a common discovery on the 2nd session
  const forceCommon = shouldForceDiscovery(totalCompletedSessions + 1);

  // Roll for a cosmic discovery
  const discovery = rollForDiscovery(
    system.seed,
    newProgress,
    gained,
    COSMIC_CATALOG,
    forceCommon,
    system.ringIndex,
    totalCompletedSessions + 1,
    totalDiscoveries,
  );

  // Patch discovery with the real system ID
  if (discovery) {
    discovery.systemId = systemId;
  }

  // Update system state
  const systems = {
    ...state.systems,
    [systemId]: {
      ...prev,
      progress: newProgress,
      isComplete: isNowComplete,
      observation,
    },
  };

  // Clear slot
  const slots = state.slots.map((s) =>
    s.slotIndex === slotIndex ? { ...s, systemId: null, startedAt: null } : s,
  );

  return {
    state: { slots, systems },
    progressGained: gained,
    isNowComplete,
    discovery,
  };
}

/** Cancel research in a slot. */
export function cancelResearch(
  state: ResearchState,
  slotIndex: number,
): ResearchState {
  const slots = state.slots.map((s) =>
    s.slotIndex === slotIndex ? { ...s, systemId: null, startedAt: null } : s,
  );
  return { ...state, slots };
}

/** Get current research progress for a system, or 0 if not started. */
export function getResearchProgress(
  state: ResearchState,
  systemId: string,
): number {
  return state.systems[systemId]?.progress ?? 0;
}

/** Check if ALL systems in a given ring are fully researched. */
export function isRingFullyResearched(
  state: ResearchState,
  systems: StarSystem[],
  ringIndex: number,
): boolean {
  const ringSystems = systems.filter(
    (s) => s.ringIndex === ringIndex && s.ownerPlayerId === null,
  );
  if (ringSystems.length === 0) return true;
  return ringSystems.every((s) => state.systems[s.id]?.isComplete === true);
}

/** Check if a system is fully researched (100 %). */
export function isSystemFullyResearched(
  state: ResearchState,
  systemId: string,
): boolean {
  return state.systems[systemId]?.isComplete === true;
}

/** Get the system research state, or null if never started. */
export function getSystemResearch(
  state: ResearchState,
  systemId: string,
): SystemResearchState | null {
  return state.systems[systemId] ?? null;
}

// ─── Research Data (resource cost) ─────────────────────────────────────

/** Check if player has enough research data to start a scan. */
export function hasResearchData(researchData: number): boolean {
  return researchData >= RESEARCH_DATA_COST;
}

// ─── Colonization helpers ──────────────────────────────────────────────

/** Find first planet with habitability above threshold. */
export function findColonizablePlanet(
  system: StarSystem,
  threshold: number = 0.3,
): Planet | null {
  return system.planets.find((p) => p.habitability.overall > threshold) ?? null;
}
