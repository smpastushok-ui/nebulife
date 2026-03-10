import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPlanetModels } from '../../packages/server/src/db.js';

/**
 * GET /api/models?playerId=...
 *
 * Returns all planet 3D models for a player.
 * Returns: { models: PlanetModelRow[] }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { playerId } = req.query;
  if (!playerId || typeof playerId !== 'string') {
    return res.status(400).json({ error: 'Missing playerId query parameter' });
  }

  try {
    const models = await getPlanetModels(playerId);
    return res.status(200).json({ models });
  } catch (err) {
    console.error('Get models error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
