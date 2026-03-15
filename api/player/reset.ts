import type { VercelRequest, VercelResponse } from '@vercel/node';
import { updatePlayer, deletePlayerDiscoveries } from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

/**
 * POST /api/player/reset
 * Body: { playerId: string }
 *
 * Full game reset for the authenticated player:
 * - Deletes all discoveries
 * - Resets game_state to {} and game_phase to 'onboarding'
 *
 * Auth required. Player can only reset their own account.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  const { playerId } = req.body ?? {};
  if (!playerId || typeof playerId !== 'string') {
    return res.status(400).json({ error: 'Missing playerId' });
  }

  // Only allow resetting own account
  if (playerId !== auth.playerId) {
    return res.status(403).json({ error: 'Forbidden: cannot reset another player' });
  }

  try {
    // 1. Delete all discoveries
    await deletePlayerDiscoveries(playerId);

    // 2. Reset game_state and game_phase
    await updatePlayer(playerId, {
      game_phase: 'onboarding',
      game_state: {},
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Player reset error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
