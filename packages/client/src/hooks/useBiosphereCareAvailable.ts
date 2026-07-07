// useBiosphereCareAvailable — lightweight poll for the Biosphere CommandBar
// button's "something needs you" glow (Еволюція біосфери). Fetches the
// current planet's creature list on a slow interval and checks whether any
// active creature can be cared for today, without duplicating BiosphereView's
// own (richer) fetch/poll logic.

import { useEffect, useState } from 'react';
import { canCareToday } from '@nebulife/core';
import { listPlanetCreatures, type BiosphereCreature, type CreatureStage } from '../api/creature-api.js';

const POLL_INTERVAL_MS = 60_000;

function isCareableForBadge(creature: BiosphereCreature, nowMs: number): boolean {
  if (creature.status !== 'ready') return false;
  const stage = (creature.stage as CreatureStage | undefined) ?? 'juvenile';
  if (stage === 'elder' || stage === 'legacy') return false;
  const lastCareAtMs = creature.last_care_at ? Date.parse(creature.last_care_at) : null;
  return canCareToday(lastCareAtMs, nowMs);
}

/**
 * Returns true when the given planet has at least one creature that can be
 * cared for today. `planetId` may be null/undefined to disable polling
 * (e.g. when the player isn't on a scene where the Biosphere tool appears).
 */
export function useBiosphereCareAvailable(planetId: string | null | undefined): boolean {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!planetId) {
      setAvailable(false);
      return;
    }
    let cancelled = false;

    const poll = () => {
      listPlanetCreatures(planetId)
        .then((list) => {
          if (cancelled) return;
          setAvailable(list.some((c) => isCareableForBadge(c, Date.now())));
        })
        .catch(() => { /* best-effort badge — silent on failure */ });
    };

    poll();
    const id = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [planetId]);

  return available;
}

export default useBiosphereCareAvailable;
