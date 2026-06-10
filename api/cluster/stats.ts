import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getPlayer,
  getGalaxyStats,
} from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { RATE_LIMITS } from '../../packages/server/src/rate-limiter.js';

/**
 * GET /api/cluster/stats
 * Aggregate galaxy (cluster) stats for the top HUD stats bar:
 * { playersOnline, colonies, starSystems, planets }.
 *
 * Auth required. Resolves the caller's cluster_id, then one DB round-trip.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  if (!await RATE_LIMITS.poll(auth.playerId)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const player = await getPlayer(auth.playerId);
  if (!player?.cluster_id) {
    // Not yet assigned to a cluster — return a sensible empty-galaxy shape.
    return res.status(200).json({ playersOnline: 0, colonies: 0, starSystems: 500, planets: 3000 });
  }

  try {
    const stats = await getGalaxyStats(player.cluster_id);
    return res.status(200).json(stats);
  } catch (err) {
    console.error('[cluster/stats GET] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
