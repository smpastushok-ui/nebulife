import assert from 'node:assert/strict';
import { mergeGameStateForPersistence } from '../packages/server/src/db.ts';

const homeSlots = [{ id: 'h-1', buildingType: 'colony_hub' }];
const remoteSlots = [{ id: 'r-1', buildingType: 'greenhouse' }];

const firstMerge = mergeGameStateForPersistence(
  {
    hex_slots_by_planet: {
      nebulife_hex_slots_home_planet: homeSlots,
    },
    planet_reveal_levels: {
      'sys-a::planet-a': 2,
    },
    colony_state: {
      planetId: 'home',
      population: { current: 5000, capacity: 5500 },
      buildings: [{ id: 'hub', type: 'colony_hub', level: 1 }],
      lastTickAt: 10,
    },
    ui_flags: {
      nebulife_unlock_popups_baselined: '1',
    },
  },
  {
    hex_slots_by_planet: {
      nebulife_hex_slots_remote_planet: remoteSlots,
    },
    planet_reveal_levels: {
      'sys-b::planet-b': 1,
    },
    colony_state: {
      planetId: 'home',
      population: { current: 5020, capacity: 5500 },
      buildings: [{ id: 'greenhouse', type: 'greenhouse', level: 1 }],
      lastTickAt: 20,
    },
  },
);

assert.deepEqual(firstMerge?.hex_slots_by_planet, {
  nebulife_hex_slots_home_planet: homeSlots,
  nebulife_hex_slots_remote_planet: remoteSlots,
});
assert.deepEqual(firstMerge?.planet_reveal_levels, {
  'sys-a::planet-a': 2,
  'sys-b::planet-b': 1,
});
assert.equal((firstMerge?.ui_flags as Record<string, string>).nebulife_unlock_popups_baselined, '1');

const twoDeviceMerge = mergeGameStateForPersistence(firstMerge, {
  hex_slots_by_planet: {
    nebulife_hex_slots_third_planet: [{ id: 't-1', buildingType: 'residential' }],
  },
});

assert.deepEqual(Object.keys(twoDeviceMerge?.hex_slots_by_planet as Record<string, unknown>).sort(), [
  'nebulife_hex_slots_home_planet',
  'nebulife_hex_slots_remote_planet',
  'nebulife_hex_slots_third_planet',
]);

const depositMerge = mergeGameStateForPersistence(
  {
    planet_resource_stocks: {
      'sys-a::planet-a': {
        remaining: { minerals: 1200, water: 900 },
        initial: { minerals: 2000, water: 1000 },
      },
    },
  },
  {
    planet_resource_stocks: {
      'sys-a::planet-a': {
        remaining: { minerals: 1500, water: 500 },
        initial: { minerals: 1800, water: 1200 },
      },
    },
  },
);

assert.deepEqual(depositMerge?.planet_resource_stocks, {
  'sys-a::planet-a': {
    remaining: { minerals: 1200, water: 500 },
    initial: { minerals: 2000, water: 1200 },
  },
});

console.log('Persistence hardening verification passed.');
