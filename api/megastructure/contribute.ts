import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticate,
  getPlayer,
  getOrCreateClusterMegastructure,
  getMegastructureBuilders,
  contributeToMegastructure,
  RATE_LIMITS,
} from '@nebulife/server';
import { MEGASTRUCTURE_DAILY_CAP, XP_REWARDS, resourceTotal, progressPercent } from '@nebulife/core';

function isMissingMegastructuresTable(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('megastructure') && message.includes('does not exist');
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : 0;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

const REASON_STATUS: Record<string, number> = {
  not_found: 404,
  already_completed: 409,
  no_capacity: 400,
};

const REASON_MESSAGES: Record<string, string> = {
  not_found: 'Megastructure not found',
  already_completed: 'This megastructure is already complete',
  no_capacity: 'No remaining daily cap or structure need for the requested resources',
};

/**
 * POST /api/megastructure/contribute
 *
 * Auth: Bearer token (Firebase)
 * Body: { minerals?, volatiles?, isotopes?, water? } — colony resources
 * already deducted client-side (same convention as api/creatures/care.ts —
 * see spendResourcesAcrossPlanets in App.tsx). The server independently
 * clamps against the remaining structure need AND the per-player daily cap
 * (500 total units/day) — the client never dictates how much actually lands.
 *
 * Returns: { megastructure, applied, remainingCapToday, isFirstContributionToday,
 *            xpAwarded, justCompleted, builders }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  if (!await RATE_LIMITS.megastructureContribute(auth.playerId)) {
    return res.status(429).json({ error: 'Зачекайте перед наступним внеском.' });
  }

  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const requested = {
      minerals: num(body.minerals),
      volatiles: num(body.volatiles),
      isotopes: num(body.isotopes),
      water: num(body.water),
    };
    if (requested.minerals + requested.volatiles + requested.isotopes + requested.water <= 0) {
      return res.status(400).json({ error: 'Provide at least one positive resource amount', reason: 'invalid_amount' });
    }

    const player = await getPlayer(auth.playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    if (!player.cluster_id) {
      return res.status(400).json({ error: 'Player is not assigned to a cluster yet', reason: 'no_cluster' });
    }

    const structure = await getOrCreateClusterMegastructure(player.cluster_id);
    const playerName = player.callsign?.trim() || player.name;

    const outcome = await contributeToMegastructure({
      megastructureId: structure.id,
      playerId: auth.playerId,
      playerName,
      requested,
    });

    if (!outcome.ok) {
      return res.status(REASON_STATUS[outcome.reason] ?? 400).json({
        error: REASON_MESSAGES[outcome.reason] ?? outcome.reason,
        reason: outcome.reason,
      });
    }

    const xpAwarded = outcome.isFirstContributionToday ? XP_REWARDS.MEGASTRUCTURE_CONTRIBUTION : 0;
    const appliedTotal = resourceTotal(outcome.applied);
    const builders = await getMegastructureBuilders(structure.id);

    return res.status(200).json({
      megastructure: {
        id: outcome.megastructure.id,
        type: outcome.megastructure.type,
        tier: outcome.megastructure.tier,
        status: outcome.megastructure.status,
        requirements: outcome.megastructure.requirements,
        progress: outcome.megastructure.progress,
        researchBonusActive: outcome.megastructure.research_bonus_active,
        builders: outcome.megastructure.builders,
        startedAt: outcome.megastructure.started_at,
        completedAt: outcome.megastructure.completed_at,
      },
      progressPercent: progressPercent(outcome.megastructure.progress, outcome.megastructure.requirements),
      applied: outcome.applied,
      appliedTotal,
      remainingCapToday: Math.max(0, MEGASTRUCTURE_DAILY_CAP - outcome.todayTotalAfter),
      isFirstContributionToday: outcome.isFirstContributionToday,
      xpAwarded,
      justCompleted: outcome.justCompleted,
      builders,
    });
  } catch (err) {
    if (isMissingMegastructuresTable(err)) {
      return res.status(503).json({ error: 'Megastructures database migration is not installed' });
    }
    console.error('[megastructure/contribute] Error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
