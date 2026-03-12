import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { searchPlayers } from '../../packages/server/src/db.js';

/**
 * GET /api/players/search?q=callsign_prefix&limit=10
 * Auth: Bearer token
 * Returns players matching callsign prefix (for DM search).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const query = (req.query.q as string) || '';
    if (query.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const limit = Math.min(parseInt((req.query.limit as string) || '10', 10), 20);
    const results = await searchPlayers(query, limit, auth.playerId);
    return res.status(200).json(results);
  } catch (err) {
    console.error('Search players error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
