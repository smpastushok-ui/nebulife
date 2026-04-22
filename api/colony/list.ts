import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getPlayer,
  getClusterPlanetClaims,
} from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

/**
 * GET /api/colony/list
 *
 * Returns every colony marker in the authenticated player's cluster so the
 * galaxy map can render a small "colonized" icon on other players' systems.
 *
 * Response includes only display-safe fields — no research progress, colony
 * level, or other private state leaks. Nick is returned directly (no need
 * for a separate lookup call; the client shows it only on marker tap).
 *
 * Errors:
 *   401 — not authenticated
 *   409 — player not yet assigned to a cluster
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  const player = await getPlayer(auth.playerId);
  if (!player) return res.status(401).json({ error: 'Player not found' });
  if (!player.cluster_id) {
    return res.status(409).json({ error: 'Player not assigned to a cluster' });
  }

  try {
    const claims = await getClusterPlanetClaims(player.cluster_id);

    // Project to display-safe shape — intentionally drop colony_level,
    // terraform_pct, claimed_at precision to avoid leaking strategy info.
    const markers = claims.map((c) => ({
      systemId: c.system_id,
      planetId: c.planet_id,
      nick: c.owner_name_snapshot ?? 'Unknown',
      isMe: c.owner_player_id === auth.playerId,
    }));

    // Cache lightly on CDN side — galaxy map polls this occasionally, not
    // every frame. 15s is short enough that new colonies feel "live".
    res.setHeader('Cache-Control', 'private, max-age=15');
    return res.status(200).json({ markers });
  } catch (err) {
    console.error('[colony/list] Error:',
      err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
