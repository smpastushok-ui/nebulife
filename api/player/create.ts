import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createPlayer } from '../../packages/server/src/db.js';

/**
 * POST /api/player/create
 *
 * Body: { id: string, name: string, homeSystemId: string, homePlanetId: string }
 *
 * Returns: PlayerRow
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, name, homeSystemId, homePlanetId } = req.body;

    if (!id || !name || !homeSystemId || !homePlanetId) {
      return res.status(400).json({ error: 'Missing required fields: id, name, homeSystemId, homePlanetId' });
    }

    const player = await createPlayer({ id, name, homeSystemId, homePlanetId });
    return res.status(201).json(player);
  } catch (err) {
    console.error('Player create error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
