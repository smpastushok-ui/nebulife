import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resetPlayerData } from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

/**
 * POST /api/player/reset
 * Body: { playerId: string }
 *
 * Full game reset for the authenticated player:
 * - Deletes all discoveries, 3D models, aliases, buildings, maps, photos, missions
 * - Resets game_state to {} and game_phase to 'onboarding'
 * - Increments science_points (used as generation_index for new system set)
 * - Keeps quarks balance
 *
 * Returns the updated player record (with new science_points/generation_index).
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
    const player = await resetPlayerData(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    return res.status(200).json({ ok: true, generation_index: player.science_points });
  } catch (err) {
    console.error('Player reset error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
