import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getPlayer,
  updatePlayerPresence,
  getClusterOnlineMembers,
} from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

/**
 * POST /api/cluster/presence
 * Body: { currentScene?, currentSystemId? }
 * Heartbeat. Client should call this every ~30 seconds while playing.
 * Returns the current list of online cluster members (last_heartbeat < 5min).
 *
 * GET /api/cluster/presence
 * Just returns online cluster members without updating own heartbeat.
 *
 * Auth required.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await authenticate(req, res);
  if (!auth) return;

  const player = await getPlayer(auth.playerId);

  // POST: update heartbeat
  if (req.method === 'POST') {
    const body = (req.body ?? {}) as {
      currentScene?: string | null;
      currentSystemId?: string | null;
    };

    // Whitelist current_scene to prevent arbitrary strings
    const ALLOWED_SCENES = new Set([
      'home-intro', 'galaxy', 'system', 'planet-view', 'surface', 'arena', 'hangar',
    ]);
    const scene = body.currentScene && ALLOWED_SCENES.has(body.currentScene)
      ? body.currentScene : null;

    try {
      await updatePlayerPresence({
        playerId: auth.playerId,
        clusterId: player?.cluster_id ?? null,
        currentScene: scene,
        currentSystemId: typeof body.currentSystemId === 'string' ? body.currentSystemId : null,
      });
    } catch (err) {
      console.error('[cluster/presence POST] Error:', err instanceof Error ? err.message : err);
      // Soft-fail — presence is best-effort, never block client
    }
  } else if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Both POST and GET return online members of caller's cluster
  if (!player?.cluster_id) {
    return res.status(200).json({ online: [] });
  }

  try {
    const online = await getClusterOnlineMembers(player.cluster_id);
    return res.status(200).json({ online });
  } catch (err) {
    console.error('[cluster/presence GET] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
