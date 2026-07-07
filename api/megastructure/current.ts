import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticate,
  getPlayer,
  getOrCreateClusterMegastructure,
  getMegastructureContributionToday,
  getMegastructureBuilders,
  RATE_LIMITS,
} from '@nebulife/server';
import { MEGASTRUCTURE_DAILY_CAP, resourceTotal, progressPercent } from '@nebulife/core';

function isMissingMegastructuresTable(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('megastructure') && message.includes('does not exist');
}

/**
 * GET /api/megastructure/current
 *
 * Auth: Bearer token (Firebase). Cluster id comes from the player row
 * (players.cluster_id) — never trusted from the client.
 *
 * Auto-provisions the cluster's "Галактичний маяк" (beacon) on first view
 * (see GAME_MODULES.md, "Мегаструктури кластера").
 *
 * Returns: { megastructure, progressPercent, myContributionToday,
 *            remainingCapToday, hasContributedToday, builders }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    if (!await RATE_LIMITS.megastructureView(auth.playerId)) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    const player = await getPlayer(auth.playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    if (!player.cluster_id) {
      return res.status(200).json({ megastructure: null, reason: 'no_cluster' });
    }

    const structure = await getOrCreateClusterMegastructure(player.cluster_id);
    const [myContributionToday, builders] = await Promise.all([
      getMegastructureContributionToday(structure.id, auth.playerId),
      getMegastructureBuilders(structure.id),
    ]);
    const todayTotal = resourceTotal(myContributionToday);

    return res.status(200).json({
      megastructure: {
        id: structure.id,
        type: structure.type,
        tier: structure.tier,
        status: structure.status,
        requirements: structure.requirements,
        progress: structure.progress,
        researchBonusActive: structure.research_bonus_active,
        builders: structure.builders,
        startedAt: structure.started_at,
        completedAt: structure.completed_at,
      },
      progressPercent: progressPercent(structure.progress, structure.requirements),
      myContributionToday,
      remainingCapToday: Math.max(0, MEGASTRUCTURE_DAILY_CAP - todayTotal),
      hasContributedToday: todayTotal > 0,
      builders,
    });
  } catch (err) {
    if (isMissingMegastructuresTable(err)) {
      return res.status(503).json({ error: 'Megastructures database migration is not installed' });
    }
    console.error('[megastructure/current] Error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
