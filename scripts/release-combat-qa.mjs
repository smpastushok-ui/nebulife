#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';

const files = {
  arenaEngine: 'packages/client/src/game/arena/ArenaEngine.ts',
  arenaConstants: 'packages/client/src/game/arena/ArenaConstants.ts',
  arenaAi: 'packages/client/src/game/arena/ArenaAI.ts',
  raidEngine: 'packages/client/src/game/raid/RaidEngine.ts',
  raidConstants: 'packages/client/src/game/raid/RaidConstants.ts',
  carrierRaid: 'packages/client/src/ui/components/Raid/CarrierRaid.tsx',
};

function read(path) {
  return readFileSync(path, 'utf8');
}

function assert(name, ok, details) {
  return { name, ok, details };
}

const arenaEngine = read(files.arenaEngine);
const arenaConstants = read(files.arenaConstants);
const raidEngine = read(files.raidEngine);
const raidConstants = read(files.raidConstants);
const carrierRaid = read(files.carrierRaid);

const checks = [
  assert('arena uses non-inverted web pitch convention', /pitch\s*[-+]?=|maxPitch|clientY|movementY/.test(arenaEngine), 'ArenaEngine has explicit pitch/mouse handling. Manual QA still required on web.'),
  assert('arena high-tier mobile supports 5v5 constants', /TEAM_BLUE_BOTS|TEAM_RED_BOTS|BOT_COUNT/.test(arenaConstants), 'ArenaConstants expose team bot counts for 5v5 validation.'),
  assert('raid has carrier boss and waves', /RAID_WAVES/.test(raidConstants) && /carrier|Carrier|module|reactor/i.test(raidEngine), 'Carrier/modules/waves are present.'),
  assert('raid manual desktop fire is hold-to-fire', /desktopLaserHeld/.test(raidEngine) && !/autoFire\s*=\s*true/.test(raidEngine), 'RaidEngine uses desktopLaserHeld/mobile firing instead of forced auto-fire.'),
  assert('raid ally count remains 4 wingmen', /RAID_WINGMEN\s*=\s*4/.test(raidConstants), '1 player + 4 AI wingmen.'),
  assert('raid loads custom ship GLB from carrier wrapper', /nebulife_custom_ship_glb_url/.test(carrierRaid) && /customShipGlbUrl/.test(carrierRaid), 'CarrierRaid passes custom Tripo GLB into RaidEngine.'),
  assert('release ship assets exist', existsSync('packages/client/public/arena_ships/blue_ship.glb') && existsSync('packages/client/public/arena_ships/red_ship.glb'), 'Blue/red GLB files must be bundled.'),
];

const failed = checks.filter((item) => !item.ok);

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  checks,
  manualChecklist: [
    'Web: verify mouse up/down pitch feels correct in Arena and Raid.',
    'iPhone/iPad: verify high-tier devices get desktop-scale Arena and 5v5.',
    'Arena: run 3 matches and record player deaths, bot hit rate, and match score spread.',
    'Raid: verify player, allies, and enemies fly nose-forward, not sideways.',
    'Raid: verify allies use selected player model/color and no box fallback appears with release assets.',
    'Raid: verify enemies launch from carrier bay and scatter before attacking.',
    'Ads: verify rewarded/interstitial callbacks do not interrupt combat.',
  ],
  failed: failed.map((item) => item.name),
}, null, 2));

if (failed.length > 0) {
  process.exitCode = 1;
}
