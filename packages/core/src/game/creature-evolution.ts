// ---------------------------------------------------------------------------
// Biosphere creature evolution — daily care, growth stages, generations
// ---------------------------------------------------------------------------
// Builds on the Biosphere creatures MVP (creature_models table, migration 040):
// each ready creature now has a real-time-decaying vitality stat, a growth
// stage driven by cumulative care days, and — once elder — the option to
// spawn a mutated offspring that reuses the existing image -> Tripo -> GLB
// pipeline. Pure/deterministic logic lives here so both the server (source of
// truth) and the client (optimistic UI / decay preview) compute identical
// results from the same creature_models row.
// ---------------------------------------------------------------------------

import { SeededRNG, seedFromString } from '../math/index.js';

// ── Vitality & stage constants ──────────────────────────────────────────────

export type CreatureStage = 'juvenile' | 'adult' | 'elder' | 'legacy';

export const CREATURE_VITALITY_MAX = 100;
/** Vitality never drops below this — this is a science game, not a punishment sim. */
export const CREATURE_VITALITY_FLOOR = 10;
/** Real-time decay rate. */
export const CREATURE_VITALITY_DECAY_PER_DAY = 15;
/** Gained per successful daily care action (capped at CREATURE_VITALITY_MAX). */
export const CREATURE_VITALITY_CARE_GAIN = 25;
/** Below this, the UI shows the "needs care" hint. */
export const CREATURE_VITALITY_LOW_THRESHOLD = 30;

/** Cumulative care days needed to advance juvenile -> adult. */
export const CARE_DAYS_TO_ADULT = 3;
/** Cumulative care days needed to advance adult -> elder. */
export const CARE_DAYS_TO_ELDER = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

export function utcDayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Effective vitality right now, decayed from the last snapshot (the last
 * care action, or the creature's ready/creation time if it was never cared
 * for). Never returns below the floor or above the max.
 */
export function computeEffectiveVitality(
  storedVitality: number,
  lastSnapshotAtMs: number,
  nowMs: number,
): number {
  const daysElapsed = Math.max(0, (nowMs - lastSnapshotAtMs) / DAY_MS);
  const decayed = storedVitality - daysElapsed * CREATURE_VITALITY_DECAY_PER_DAY;
  return Math.max(CREATURE_VITALITY_FLOOR, Math.min(CREATURE_VITALITY_MAX, decayed));
}

/** One real-world care action per creature per UTC calendar day. */
export function canCareToday(lastCareAtMs: number | null, nowMs: number): boolean {
  if (lastCareAtMs === null) return true;
  return utcDayKey(lastCareAtMs) !== utcDayKey(nowMs);
}

/** Growth stage derived from cumulative care days. `legacy` is a one-way
 *  transition only reachable via spawning an offspring — never derived here. */
export function computeStageFromCareDays(careDays: number, currentStage: CreatureStage): CreatureStage {
  if (currentStage === 'legacy') return 'legacy';
  if (careDays >= CARE_DAYS_TO_ELDER) return 'elder';
  if (careDays >= CARE_DAYS_TO_ADULT) return 'adult';
  return 'juvenile';
}

export interface CreatureCareState {
  vitality: number;
  careDays: number;
  stage: CreatureStage;
  lastCareAtMs: number | null;
  createdAtMs: number;
}

export interface CareApplication {
  vitality: number;
  careDays: number;
  stage: CreatureStage;
}

/** Reasons `applyDailyCare` can refuse — surfaced to the client for copy. */
export type CareBlockReason = 'already_cared_today' | 'no_longer_needs_care';

export function getCareBlockReason(state: CreatureCareState, nowMs: number): CareBlockReason | null {
  if (state.stage === 'elder' || state.stage === 'legacy') return 'no_longer_needs_care';
  if (!canCareToday(state.lastCareAtMs, nowMs)) return 'already_cared_today';
  return null;
}

/** Applies one daily care action. Returns null if the creature can't be
 *  cared for right now (already cared today, or elder/legacy). */
export function applyDailyCare(state: CreatureCareState, nowMs: number): CareApplication | null {
  if (getCareBlockReason(state, nowMs) !== null) return null;
  const snapshotAt = state.lastCareAtMs ?? state.createdAtMs;
  const effective = computeEffectiveVitality(state.vitality, snapshotAt, nowMs);
  // creature_models.vitality is an INTEGER. Real-time decay is fractional for
  // smooth client previews, but care persists a whole-number snapshot.
  const vitality = Math.round(Math.min(CREATURE_VITALITY_MAX, effective + CREATURE_VITALITY_CARE_GAIN));
  const careDays = state.careDays + 1;
  const stage = computeStageFromCareDays(careDays, state.stage);
  return { vitality, careDays, stage };
}

// ── Age display (derived, server-authoritative — never persisted) ─────────

export type CreatureAgeUnit = 'just_hatched' | 'hours' | 'days' | 'weeks';

export interface CreatureAgeBucket {
  unit: CreatureAgeUnit;
  /** 0 for 'just_hatched' (no count shown); otherwise the whole-number magnitude. */
  count: number;
}

const HOUR_MS = 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/**
 * Buckets a creature's age (now - createdAt) into a coarse display unit —
 * the detail card never shows exact durations, only "just hatched" / N
 * hours / N days / N weeks (i18n). `createdAtMs` must be the server
 * `created_at` timestamp; the client clock never determines age (anti-cheat,
 * matches computeEffectiveVitality's server-authoritative snapshot rule).
 */
export function formatCreatureAgeBucket(createdAtMs: number, nowMs: number): CreatureAgeBucket {
  const ageMs = Math.max(0, nowMs - createdAtMs);
  if (ageMs < HOUR_MS) return { unit: 'just_hatched', count: 0 };
  if (ageMs < DAY_MS) return { unit: 'hours', count: Math.floor(ageMs / HOUR_MS) };
  if (ageMs < WEEK_MS) return { unit: 'days', count: Math.floor(ageMs / DAY_MS) };
  return { unit: 'weeks', count: Math.floor(ageMs / WEEK_MS) };
}

// ── Care types (map to colony resources spent client-side) ─────────────────

export type CareResourceType = 'minerals' | 'water' | 'volatiles';

export interface CareTypeDef {
  id: string;
  resource: CareResourceType;
  /** Colony resource units spent per care action. */
  amount: number;
}

/** 3 curated care types, one per resource — the UI only offers the ones the
 *  planet's colony store can currently afford. */
export const CARE_TYPES: readonly CareTypeDef[] = [
  { id: 'mineral_feed', resource: 'minerals', amount: 20 },
  { id: 'water_feed', resource: 'water', amount: 20 },
  { id: 'volatile_feed', resource: 'volatiles', amount: 15 },
];

// ── Generations & mutations ─────────────────────────────────────────────────

/** Half of CREATURE_GENERATION_COST_QUARKS (60) — see creature-prompt.ts. */
export const OFFSPRING_COST_QUARKS = 30;

export const TRAIT_CATEGORIES = ['size', 'coloring', 'appendages', 'bioluminescence', 'texture'] as const;
export type TraitCategory = typeof TRAIT_CATEGORIES[number];

/** Curated trait table — 4 options per category, picked deterministically. */
export const TRAIT_OPTIONS: Readonly<Record<TraitCategory, readonly string[]>> = {
  size: ['dwarf', 'gigantic', 'elongated', 'compact'],
  coloring: ['iridescent', 'melanistic', 'translucent', 'banded'],
  appendages: ['extra_limbs', 'finned', 'long_tail', 'clawed'],
  bioluminescence: ['glowing_spots', 'pulsing_veins', 'luminous_eyes', 'faint_aura'],
  texture: ['crystalline_scales', 'feathered_ridges', 'chitin_plating', 'smooth_hide'],
};

export interface TraitMutation {
  category: TraitCategory;
  trait: string;
}

/**
 * Deterministic 1-2 trait mutations for a given (creatureId, generation)
 * pair — the same inputs always yield the same mutations, satisfying the
 * "one seed, one result" determinism rule for offspring generation.
 */
export function pickMutations(creatureId: string, generation: number): TraitMutation[] {
  const rng = new SeededRNG(seedFromString(`${creatureId}:gen${generation}`));
  const categories = rng.shuffle([...TRAIT_CATEGORIES]) as TraitCategory[];
  const count = rng.nextBool(0.5) ? 1 : 2;
  return categories.slice(0, count).map((category) => ({
    category,
    trait: rng.pick(TRAIT_OPTIONS[category]),
  }));
}

// ── Hybridization ("дослід схрещування" — migration 042) ───────────────────

/** Hybrid photo only (no 3D model, no biosphere settlement). */
export const HYBRID_PHOTO_COST_QUARKS = 15;
/** Hybrid photo + Tripo 3D model + settled in the biosphere. */
export const HYBRID_FULL_COST_QUARKS = 60;
/** Upgrade an already-purchased photo-only hybrid to 3D later. */
export const HYBRID_UPGRADE_COST_QUARKS = 50;

/** Max traits a hybrid inherits from its parents (before the optional new mutation). */
const HYBRID_MAX_INHERITED_TRAITS = 3;

/**
 * Deterministic hybrid trait mix for a pair of parent creatures.
 *
 * Seed is derived from BOTH creature ids (sorted, so A×B === B×A) — same
 * pair always yields the same hybrid, per the module's determinism rule.
 *
 * Mix rules:
 * - Union of both parents' traits, one per category (coin-flip when both
 *   parents express the same category), capped at 3 inherited traits.
 * - Possibly 1 brand-new mutation from an unused category (50% chance;
 *   guaranteed when neither parent has any traits, e.g. two gen-1 originals,
 *   so every hybrid expresses at least one visible trait).
 */
/** Stored creature_models.traits rows may also carry experiment recipe
 *  entries (category 'element', see creature-experiment.ts) — accepted here
 *  and filtered out, since only mutation categories participate in the mix. */
export type StoredCreatureTrait = { category: string; trait: string };

export function pickHybridTraits(
  parentAId: string,
  parentBId: string,
  parentATraits: readonly StoredCreatureTrait[] | null | undefined,
  parentBTraits: readonly StoredCreatureTrait[] | null | undefined,
): TraitMutation[] {
  const sortedIds = [parentAId, parentBId].sort();
  const rng = new SeededRNG(seedFromString(`${sortedIds[0]}+${sortedIds[1]}:hybrid`));

  // Order parent trait lists by sorted id so the mix is independent of which
  // parent the player picked first.
  const [firstTraits, secondTraits] = parentAId <= parentBId
    ? [parentATraits, parentBTraits]
    : [parentBTraits, parentATraits];

  const byCategory = new Map<TraitCategory, string[]>();
  for (const t of [...(firstTraits ?? []), ...(secondTraits ?? [])]) {
    if (!(TRAIT_CATEGORIES as readonly string[]).includes(t.category)) continue;
    const category = t.category as TraitCategory;
    const options = byCategory.get(category) ?? [];
    if (!options.includes(t.trait)) options.push(t.trait);
    byCategory.set(category, options);
  }

  let traits: TraitMutation[] = [];
  for (const category of TRAIT_CATEGORIES) {
    const options = byCategory.get(category);
    if (!options || options.length === 0) continue;
    traits.push({ category, trait: options.length === 1 ? options[0] : rng.pick(options) });
  }

  if (traits.length > HYBRID_MAX_INHERITED_TRAITS) {
    const kept = rng.shuffle([...traits]).slice(0, HYBRID_MAX_INHERITED_TRAITS);
    traits = kept.sort(
      (a, b) => TRAIT_CATEGORIES.indexOf(a.category) - TRAIT_CATEGORIES.indexOf(b.category),
    );
  }

  const unusedCategories = TRAIT_CATEGORIES.filter((c) => !traits.some((t) => t.category === c));
  const addNewMutation = unusedCategories.length > 0 && (traits.length === 0 || rng.nextBool(0.5));
  if (addNewMutation) {
    const category = rng.pick(unusedCategories);
    traits.push({ category, trait: rng.pick(TRAIT_OPTIONS[category]) });
  }

  return traits;
}
