import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getPlayer,
  recordPlanetDestruction,
} from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

/**
 * POST /api/cluster/destroy
 * Body: { systemId, planetId, orbitAU?, reason? }
 *
 * Records a planet destruction event in the cluster. Idempotent — replaying
 * the same (cluster, system, planet) triple is a no-op.
 *
 * Visible to all cluster members via /api/cluster/system/:systemId.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  const player = await getPlayer(auth.playerId);
  if (!player?.cluster_id) {
    return res.status(409).json({ error: 'Player not assigned to a cluster' });
  }

  const body = (req.body ?? {}) as {
    systemId?: string;
    planetId?: string;
    orbitAU?: number;
    reason?: string;
  };

  if (typeof body.systemId !== 'string' || typeof body.planetId !== 'string') {
    return res.status(400).json({ error: 'Missing systemId or planetId' });
  }

  // Reason whitelist — prevent arbitrary strings
  const ALLOWED_REASONS = new Set(['doomsday', 'impactor', 'collision', 'unknown']);
  const reason = body.reason && ALLOWED_REASONS.has(body.reason) ? body.reason : 'unknown';

  try {
    await recordPlanetDestruction({
      clusterId: player.cluster_id,
      systemId: body.systemId,
      planetId: body.planetId,
      destroyedByPlayerId: auth.playerId,
      orbitAU: body.orbitAU,
      reason,
    });
    return res.status(200).json({ recorded: true });
  } catch (err) {
    console.error('[cluster/destroy] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
