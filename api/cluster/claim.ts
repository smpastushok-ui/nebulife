import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getPlayer,
  claimPlanet,
  releasePlanetClaim,
} from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

/**
 * POST   /api/cluster/claim   — claim a planet for current player.
 *                                Body: { systemId, planetId, colonyLevel?, terraformPct? }
 *                                Returns the claim row, or 409 if already claimed by someone else.
 * DELETE /api/cluster/claim   — release a planet claim.
 *                                Body: { systemId, planetId }
 *
 * Auth required. Scoped to player's own cluster.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await authenticate(req, res);
  if (!auth) return;

  const player = await getPlayer(auth.playerId);
  if (!player?.cluster_id) {
    return res.status(409).json({ error: 'Player not assigned to a cluster' });
  }

  const body = (req.body ?? {}) as {
    systemId?: string;
    planetId?: string;
    colonyLevel?: number;
    terraformPct?: number;
  };

  if (typeof body.systemId !== 'string' || typeof body.planetId !== 'string') {
    return res.status(400).json({ error: 'Missing systemId or planetId' });
  }

  if (req.method === 'POST') {
    try {
      const claim = await claimPlanet({
        clusterId: player.cluster_id,
        systemId: body.systemId,
        planetId: body.planetId,
        ownerPlayerId: auth.playerId,
        ownerNameSnapshot: player.name ?? null,
        colonyLevel: body.colonyLevel,
        terraformPct: body.terraformPct,
      });
      if (!claim) {
        return res.status(409).json({ error: 'Planet already claimed by another player' });
      }
      return res.status(200).json({ claim });
    } catch (err) {
      console.error('[cluster/claim POST] Error:', err instanceof Error ? err.message : err);
      return res.status(500).json({ error: 'Internal error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await releasePlanetClaim({
        clusterId: player.cluster_id,
        systemId: body.systemId,
        planetId: body.planetId,
        ownerPlayerId: auth.playerId,
      });
      return res.status(200).json({ released: true });
    } catch (err) {
      console.error('[cluster/claim DELETE] Error:', err instanceof Error ? err.message : err);
      return res.status(500).json({ error: 'Internal error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
