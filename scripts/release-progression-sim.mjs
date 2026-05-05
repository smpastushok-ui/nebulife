#!/usr/bin/env node

const {
  xpForLevel,
  levelFromXP,
  SESSION_XP,
  RING_XP_REWARD,
  XP_REWARDS,
} = await import('../packages/core/dist/index.js').catch((err) => {
  console.error('Build @nebulife/core first: npm run build -w @nebulife/core');
  throw err;
});

const TARGET_LEVELS = [10, 20, 35, 50];

const scenarios = [
  {
    name: 'casual',
    daily: {
      researchSessions: 6,
      completions: { 'ring0-1': 0.35, ring2: 0.15, neighbor: 0.05, 'core-0': 0 },
      discoveries: { common: 0.35, uncommon: 0.08, rare: 0.02, epic: 0, legendary: 0 },
      gallerySaves: 0.4,
      missions: 0.5,
      colonyMilestones: 0.04,
      arenaRaid: 0.2,
    },
  },
  {
    name: 'normal',
    daily: {
      researchSessions: 14,
      completions: { 'ring0-1': 0.8, ring2: 0.45, neighbor: 0.15, 'core-0': 0.04 },
      discoveries: { common: 0.9, uncommon: 0.28, rare: 0.08, epic: 0.015, legendary: 0.002 },
      gallerySaves: 1.2,
      missions: 1.5,
      colonyMilestones: 0.12,
      arenaRaid: 0.75,
    },
  },
  {
    name: 'power-user',
    daily: {
      researchSessions: 34,
      completions: { 'ring0-1': 1.6, ring2: 1.1, neighbor: 0.55, 'core-0': 0.22 },
      discoveries: { common: 2.2, uncommon: 0.9, rare: 0.32, epic: 0.09, legendary: 0.015 },
      gallerySaves: 3.5,
      missions: 4,
      colonyMilestones: 0.35,
      arenaRaid: 2.2,
    },
  },
  {
    name: 'paid-photo-heavy',
    daily: {
      researchSessions: 24,
      completions: { 'ring0-1': 1.1, ring2: 0.85, neighbor: 0.45, 'core-0': 0.18 },
      discoveries: { common: 1.6, uncommon: 0.75, rare: 0.28, epic: 0.08, legendary: 0.015 },
      gallerySaves: 8,
      missions: 5,
      colonyMilestones: 0.28,
      arenaRaid: 1.2,
    },
  },
];

function dailyXp(scenario) {
  const d = scenario.daily;
  const completionXp = Object.entries(d.completions)
    .reduce((sum, [zone, count]) => sum + (RING_XP_REWARD[zone] ?? 0) * count, 0);
  const discoveryXp = Object.entries(d.discoveries).reduce((sum, [rarity, count]) => (
    sum + (XP_REWARDS.DISCOVERY_BASE + (XP_REWARDS.DISCOVERY_RARITY_BONUS[rarity] ?? 0)) * count
  ), 0);
  return Math.round(
    d.researchSessions * SESSION_XP +
    completionXp +
    discoveryXp +
    d.gallerySaves * XP_REWARDS.GALLERY_SAVE +
    d.missions * 55 +
    d.colonyMilestones * XP_REWARDS.COLONY_FOUNDED +
    d.arenaRaid * 115
  );
}

function bottlenecks(scenario, xpPerDay) {
  const items = [];
  if (scenario.daily.researchSessions < 8) items.push('low research cadence');
  if (scenario.daily.missions < 1) items.push('few planet missions');
  if (scenario.daily.completions.neighbor < 0.1) items.push('slow neighbor/core access');
  if (xpPerDay < 700) items.push('L35+ will feel long without colony/arena rewards');
  if (scenario.daily.gallerySaves > 5) items.push('paid photo path depends on quark conversion and AI cost control');
  return items.length ? items : ['none'];
}

const report = scenarios.map((scenario) => {
  const xpPerDay = dailyXp(scenario);
  const levels = Object.fromEntries(TARGET_LEVELS.map((level) => {
    const days = xpForLevel(level) / xpPerDay;
    return [`L${level}`, {
      xpRequired: xpForLevel(level),
      days: Number(days.toFixed(1)),
      hours: Number((days * 24).toFixed(1)),
    }];
  }));
  return {
    scenario: scenario.name,
    xpPerDay,
    projectedLevelAfter7Days: levelFromXP(xpPerDay * 7),
    milestones: levels,
    bottlenecks: bottlenecks(scenario, xpPerDay),
  };
});

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  targetLevels: TARGET_LEVELS,
  report,
}, null, 2));
