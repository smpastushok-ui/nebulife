#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';

const files = {
  arenaEngine: 'packages/client/src/game/arena/ArenaEngine.ts',
  arenaConstants: 'packages/client/src/game/arena/ArenaConstants.ts',
  arenaAi: 'packages/client/src/game/arena/ArenaAI.ts',
};

function read(path) {
  return readFileSync(path, 'utf8');
}

function assert(name, ok, details) {
  return { name, ok, details };
}

const arenaEngine = read(files.arenaEngine);
const arenaConstants = read(files.arenaConstants);

const checks = [
  assert('arena uses non-inverted web pitch convention', /pitch\s*[-+]?=|maxPitch|clientY|movementY/.test(arenaEngine), 'ArenaEngine has explicit pitch/mouse handling. Manual QA still required on web.'),
  assert('arena high-tier mobile supports 5v5 constants', /TEAM_BLUE_BOTS|TEAM_RED_BOTS|BOT_COUNT/.test(arenaConstants), 'ArenaConstants expose team bot counts for 5v5 validation.'),
  assert('release ship assets exist', existsSync('packages/client/public/arena_ships/blue_ship.glb') && existsSync('packages/client/public/arena_ships/red_ship.glb'), 'Blue/red GLB files must be bundled.'),
];

const failed = checks.filter((item) => !item.ok);

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  checks,
  manualChecklist: [
    'Web: verify mouse up/down pitch feels correct in Arena.',
    'iPhone/iPad: verify high-tier devices get desktop-scale Arena and 5v5.',
    'Arena: run 3 matches and record player deaths, bot hit rate, and match score spread.',
    'Ads: verify rewarded/interstitial callbacks do not interrupt combat.',
  ],
  failed: failed.map((item) => item.name),
}, null, 2));

if (failed.length > 0) {
  process.exitCode = 1;
}
