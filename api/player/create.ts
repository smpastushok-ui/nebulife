import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateToken } from '../../packages/server/src/auth-middleware.js';
import { createPlayer } from '../../packages/server/src/db.js';

/**
 * POST /api/player/create
 * Auth: Bearer Firebase token
 * Body: { id: string, name: string, homeSystemId: string, homePlanetId: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify Firebase token
    const token = (req.headers.authorization ?? '').replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Missing auth token' });
    }

    const authResult = await authenticateToken(token);
    if (!authResult) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { id, name, homeSystemId, homePlanetId } = req.body;

    if (!id || !name || !homeSystemId || !homePlanetId) {
      return res.status(400).json({ error: 'Missing required fields: id, name, homeSystemId, homePlanetId' });
    }

    // Verify player ID matches authenticated user
    if (id !== authResult.playerId && id !== authResult.uid) {
      return res.status(403).json({ error: 'Player ID mismatch' });
    }

    const player = await createPlayer({ id, name, homeSystemId, homePlanetId });
    return res.status(201).json(player);
  } catch (err) {
    console.error('Player create error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
