// Small shared helpers bridging BiosphereCreature rows (server shape) with
// the pure vitality/stage math in @nebulife/core. Kept out of BiosphereView
// and CreatureCareList to avoid a circular import between the two.

import { computeEffectiveVitality, canCareToday } from '@nebulife/core';
import type { BiosphereCreature, CreatureStage } from '../../../api/creature-api.js';

/** Effective (decayed) vitality right now for a creature row. */
export function getCreatureEffectiveVitality(creature: BiosphereCreature, nowMs: number): number {
  const snapshotAt = creature.last_care_at ? Date.parse(creature.last_care_at) : Date.parse(creature.created_at);
  return computeEffectiveVitality(creature.vitality ?? 100, snapshotAt, nowMs);
}

/** Whether this creature can be cared for right now (not elder/legacy, not already cared today). */
export function isCreatureCareableNow(creature: BiosphereCreature, nowMs: number): boolean {
  const stage = (creature.stage as CreatureStage | undefined) ?? 'juvenile';
  if (stage === 'elder' || stage === 'legacy') return false;
  const lastCareAtMs = creature.last_care_at ? Date.parse(creature.last_care_at) : null;
  return canCareToday(lastCareAtMs, nowMs);
}
