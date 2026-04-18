import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getPlayer,
  getSystemPlanetClaims,
  getSystemPlanetDestructions,
} from '../../../packages/server/src/db.js';
import { authenticate } from '../../../packages/server/src/auth-middleware.js';

/**
 * GET /api/cluster/system/:systemId
 *
 * Returns the cluster-wide objective state of one system:
 *  - planetClaims:        which planets are colonized + by whom
 *  - planetDestructions:  which planets have been destroyed
 *
 * Requires auth so we can scope by the requesting player's cluster_id.
 * Per-player aliases / overrides are NOT returned here — those stay client-side.
 *
 * Response: {
 *   systemId: string,
 *   clusterId: string,
 *   claims: PlanetClaimRow[],
 *   destructions: PlanetDestructionRow[],
 * }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { systemId } = req.query;
  if (!systemId || typeof systemId !== 'string') {
    return res.status(400).json({ error: 'Missing systemId' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return; // 401 already sent

  try {
    const player = await getPlayer(auth.playerId);
    if (!player?.cluster_id) {
      // Player not yet assigned to a cluster — return empty state, not an error
      return res.status(200).json({
        systemId,
        clusterId: null,
        claims: [],
        destructions: [],
      });
    }

    const [claims, destructions] = await Promise.all([
      getSystemPlanetClaims(player.cluster_id, systemId),
      getSystemPlanetDestructions(player.cluster_id, systemId),
    ]);

    // Cache briefly: shared state changes infrequently
    res.setHeader('Cache-Control', 'private, s-maxage=10, stale-while-revalidate=30');
    return res.status(200).json({
      systemId,
      clusterId: player.cluster_id,
      claims,
      destructions,
    });
  } catch (err) {
    console.error('[cluster/system] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
