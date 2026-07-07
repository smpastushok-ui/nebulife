/**
 * Observation Seasons Determinism Validation
 *
 * Run manually after `game/observation-seasons.ts` changes:
 *
 *   npx tsx packages/client/src/__validate__/check-season-determinism.ts
 *
 * Verifies "Сезони спостережень" is a pure function of calendar time: same
 * `now` -> identical season on every call (client and server alike, no
 * server cron / stored schedule needed), the rotation and finale window are
 * internally consistent, and every seasonal anomaly `type` referenced by a
 * season definition actually resolves in the cosmic catalog.
 */

import {
  getCurrentSeason,
  SEASON_DEFINITIONS,
  SEASON_LENGTH_MS,
  SEASON_EPOCH_UTC_MS,
  SEASON_FINALE_WINDOW_MS,
  SEASON_ANOMALY_COUNT,
  isSeasonalAnomalyType,
  getSeasonalAnomalyAssetType,
  createSeasonalProgressState,
  advanceSeasonalProgress,
  applySeasonalObservatoryResult,
  isSeasonCollectionComplete,
  seasonOccurrenceId,
  getCatalogEntry,
} from '@nebulife/core';

let passed = 0;
let failed = 0;

function check(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  PASS  ${message}`);
    passed++;
  } else {
    console.error(`  FAIL  ${message}`);
    failed++;
  }
}

console.log('\n=== Observation Seasons Determinism Validation ===\n');

// ── 1. Pure function of time: repeated calls at the same instant agree ──

const SAMPLE_TIMES = [
  SEASON_EPOCH_UTC_MS,
  SEASON_EPOCH_UTC_MS - 1,
  SEASON_EPOCH_UTC_MS + 1,
  SEASON_EPOCH_UTC_MS + SEASON_LENGTH_MS,
  SEASON_EPOCH_UTC_MS + SEASON_LENGTH_MS * 4 + 12345,
  Date.UTC(2026, 6, 7),
  Date.UTC(2027, 0, 1),
  Date.UTC(2030, 11, 31, 23, 59, 59),
];

let mismatches = 0;
for (const t of SAMPLE_TIMES) {
  const a = getCurrentSeason(t);
  const b = getCurrentSeason(t);
  if (a.seasonIndex !== b.seasonIndex || a.def.id !== b.def.id || a.isFinale !== b.isFinale) mismatches++;
}
check(mismatches === 0, `same "now" -> identical season across ${SAMPLE_TIMES.length} sampled instants`);

// ── 2. Rotation is contiguous and wraps through all 4 MVP definitions ──

{
  let rotationOk = true;
  for (let i = 0; i < 12; i++) {
    const t = SEASON_EPOCH_UTC_MS + i * SEASON_LENGTH_MS + 1;
    const info = getCurrentSeason(t);
    if (info.seasonIndex !== i) rotationOk = false;
    if (info.def.id !== SEASON_DEFINITIONS[i % SEASON_DEFINITIONS.length].id) rotationOk = false;
    if (info.endMs - info.startMs !== SEASON_LENGTH_MS) rotationOk = false;
  }
  check(rotationOk, `12 consecutive seasons rotate through the ${SEASON_DEFINITIONS.length} MVP definitions in order`);
}

// ── 3. Finale window flag matches the documented 72h cutoff ──

{
  const info = getCurrentSeason(SEASON_EPOCH_UTC_MS);
  const justBeforeFinale = getCurrentSeason(info.endMs - SEASON_FINALE_WINDOW_MS - 1000);
  const justAfterFinaleStart = getCurrentSeason(info.endMs - SEASON_FINALE_WINDOW_MS + 1000);
  check(!justBeforeFinale.isFinale, 'isFinale is false just before the 72h finale window starts');
  check(justAfterFinaleStart.isFinale, 'isFinale is true just after the 72h finale window starts');
}

// ── 4. Every season ships exactly 5 anomalies, each resolving in the catalog ──

{
  let countOk = true;
  let catalogOk = true;
  let assetOk = true;
  for (const def of SEASON_DEFINITIONS) {
    if (def.anomalies.length !== SEASON_ANOMALY_COUNT) countOk = false;
    for (const anomaly of def.anomalies) {
      const entry = getCatalogEntry(anomaly.type);
      if (!entry) catalogOk = false;
      if (!entry?.eventOnly) catalogOk = false;
      if (!isSeasonalAnomalyType(anomaly.type)) catalogOk = false;
      if (!getSeasonalAnomalyAssetType(anomaly.type)) assetOk = false;
    }
  }
  check(countOk, `every season definition ships exactly ${SEASON_ANOMALY_COUNT} anomalies`);
  check(catalogOk, 'every seasonal anomaly type resolves to an eventOnly cosmic-catalog entry');
  check(assetOk, 'every seasonal anomaly maps to an existing bundled common-event asset (no new AI generation)');
}

// ── 5. Player progress transitions are pure functions of (state, now, discoveredType) ──

{
  const now = SEASON_EPOCH_UTC_MS + 1000;
  const state = createSeasonalProgressState(now);
  check(state.seasonIndex === getCurrentSeason(now).seasonIndex, 'freshly created progress starts at the current season index');

  const def = SEASON_DEFINITIONS[state.seasonIndex % SEASON_DEFINITIONS.length];
  let progress = state;
  for (const anomaly of def.anomalies) {
    progress = applySeasonalObservatoryResult(progress, now, anomaly.type);
  }
  check(isSeasonCollectionComplete(progress, now), 'collecting all 5 seasonal anomaly types completes the season');
  check(progress.researchedTypes.length === SEASON_ANOMALY_COUNT, 'researchedTypes has no duplicates after collecting the full set');

  // Applying the same discovery again is idempotent (no duplicate entries, no
  // false "still incomplete" from double-counting).
  const again = applySeasonalObservatoryResult(progress, now, def.anomalies[0].type);
  check(again.researchedTypes.length === SEASON_ANOMALY_COUNT, 're-researching an already-owned type is idempotent');

  // A no-signal search bumps the pity counter without touching researchedTypes.
  const afterMiss = applySeasonalObservatoryResult(createSeasonalProgressState(now), now, null);
  check(afterMiss.searchesSinceDrop === 1 && afterMiss.researchedTypes.length === 0, 'a no-signal search increments the pity counter only');

  // A hit resets the pity counter.
  const afterHit = applySeasonalObservatoryResult(afterMiss, now, def.anomalies[0].type);
  check(afterHit.searchesSinceDrop === 0, 'a seasonal hit resets the pity counter to 0');
}

// ── 6. Advancing across a season boundary archives a completed season and resets working slots ──

{
  const seasonStart = SEASON_EPOCH_UTC_MS + 1000;
  const def = getCurrentSeason(seasonStart).def;
  let progress = createSeasonalProgressState(seasonStart);
  for (const anomaly of def.anomalies) {
    progress = applySeasonalObservatoryResult(progress, seasonStart, anomaly.type);
  }
  const nextSeasonNow = seasonStart + SEASON_LENGTH_MS + 1000;
  const advanced = advanceSeasonalProgress(progress, nextSeasonNow);
  check(advanced.seasonIndex === getCurrentSeason(nextSeasonNow).seasonIndex, 'advancing rolls seasonIndex forward to the current occurrence');
  check(advanced.researchedTypes.length === 0, 'advancing resets researchedTypes for the new season');
  check(advanced.completedSeasons.includes(seasonOccurrenceId(getCurrentSeason(seasonStart).seasonIndex)), 'a fully-collected season is archived into completedSeasons on rollover');

  // An incomplete season is NOT archived.
  const incomplete = applySeasonalObservatoryResult(createSeasonalProgressState(seasonStart), seasonStart, def.anomalies[0].type);
  const advancedIncomplete = advanceSeasonalProgress(incomplete, nextSeasonNow);
  check(advancedIncomplete.completedSeasons.length === 0, 'an incomplete season is not archived into completedSeasons');
}

console.log(`\nResult: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exitCode = 1;
}
