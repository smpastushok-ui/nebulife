import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPlayerLifeforms } from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

/**
 * GET /api/lifeform/list?playerId=xxx (auth required)
 *
 * Returns: { lifeforms: LifeformRow[] }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    const { playerId } = req.query;
    if (!playerId || typeof playerId !== 'string') {
      return res.status(400).json({ error: 'Missing playerId' });
    }
    if (playerId !== auth.playerId) {
      return res.status(403).json({ error: 'Forbidden: player mismatch' });
    }

    const lifeforms = await getPlayerLifeforms(playerId);
    return res.status(200).json({ lifeforms });
  } catch (err) {
    console.error('Lifeform list error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
