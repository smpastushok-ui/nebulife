import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

/**
 * GET /api/auth/me
 *
 * Returns the current player data based on the Firebase ID token.
 * Auth: Bearer <firebase-id-token>
 *
 * Returns: PlayerRow
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    // authenticate() already looked up the player — return it
    const { getPlayer } = await import('../../packages/server/src/db.js');
    const player = await getPlayer(auth.playerId);

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    return res.status(200).json(player);
  } catch (err) {
    console.error('Auth me error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
