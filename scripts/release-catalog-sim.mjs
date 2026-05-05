#!/usr/bin/env node

const {
  COSMIC_CATALOG,
  createObservatoryState,
  startObservatorySearch,
  completeObservatorySearch,
  getAvailableObservatoryPrograms,
  getObservatoryLevel,
  getObservatoryMaxActiveSearches,
  OBSERVATORY_SEARCH_DURATION_MS,
} = await import('../packages/core/dist/index.js').catch((err) => {
  console.error('Build @nebulife/core first: npm run build -w @nebulife/core');
  throw err;
});

const TRIALS = Number(process.env.TRIALS ?? 160);
const TARGETS = [0.25, 0.5, 0.75, 1];

const strategies = {
  short: () => '1h',
  rare: () => '6h',
  deep: () => '24h',
  mixed: (slot) => (slot % 5 === 0 ? '24h' : slot % 2 === 0 ? '6h' : '1h'),
};

function percentile(values, pct) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * pct))];
}

function runTrial(strategyName, trial) {
  const chooseDuration = strategies[strategyName];
  let state = createObservatoryState();
  let now = 0;
  const firstHit = {};
  let slotCounter = 0;

  while (Object.keys(state.events).length < COSMIC_CATALOG.length && now < 900 * 24 * 60 * 60 * 1000) {
    state = { ...state, sessions: state.sessions.filter((session) => session.completesAt > now) };
    const maxSlots = getObservatoryMaxActiveSearches(state);
    while (state.sessions.length < maxSlots) {
      const level = getObservatoryLevel(state);
      const programs = getAvailableObservatoryPrograms(level);
      const program = programs[programs.length - 1];
      const duration = chooseDuration(slotCounter++);
      state = startObservatorySearch(state, duration, program, now, `release-${strategyName}-${trial}-${slotCounter}`);
      if (state.sessions.length === 0) break;
    }

    const nextComplete = Math.min(...state.sessions.map((session) => session.completesAt));
    now = Number.isFinite(nextComplete) ? nextComplete : now + OBSERVATORY_SEARCH_DURATION_MS['1h'];
    const due = [...state.sessions].filter((session) => session.completesAt <= now);
    for (const session of due) {
      const result = completeObservatorySearch(state, session.id, COSMIC_CATALOG, now);
      if (result) state = result.state;
    }

    const pct = Object.keys(state.events).length / COSMIC_CATALOG.length;
    for (const target of TARGETS) {
      if (pct >= target && firstHit[target] === undefined) {
        firstHit[target] = now / (24 * 60 * 60 * 1000);
      }
    }
  }

  return Object.fromEntries(TARGETS.map((target) => [target, firstHit[target] ?? null]));
}

const report = Object.keys(strategies).map((strategy) => {
  const trials = Array.from({ length: TRIALS }, (_, idx) => runTrial(strategy, idx));
  const targets = Object.fromEntries(TARGETS.map((target) => {
    const values = trials.map((trial) => trial[target]).filter((value) => typeof value === 'number');
    return [`${Math.round(target * 100)}%`, values.length === 0 ? null : {
      medianDays: Number(percentile(values, 0.5).toFixed(1)),
      p90Days: Number(percentile(values, 0.9).toFixed(1)),
    }];
  }));
  return { strategy, targets };
});

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  trials: TRIALS,
  catalogSize: COSMIC_CATALOG.length,
  report,
  recommendation: 'If 100% p90 is above the desired release horizon, increase unseen weighting or add guaranteed rare+ pity for 6h/24h searches.',
}, null, 2));
