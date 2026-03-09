import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPlayer, updatePlayer } from '../../packages/server/src/db.js';

/**
 * GET  /api/player/:playerId — Get player data
 * PUT  /api/player/:playerId — Update player data
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { playerId } = req.query;
  if (!playerId || typeof playerId !== 'string') {
    return res.status(400).json({ error: 'Missing playerId parameter' });
  }

  if (req.method === 'GET') {
    try {
      const player = await getPlayer(playerId);
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }
      return res.status(200).json(player);
    } catch (err) {
      console.error('Player get error:', err);
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const player = await updatePlayer(playerId, req.body);
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }
      return res.status(200).json(player);
    } catch (err) {
      console.error('Player update error:', err);
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
