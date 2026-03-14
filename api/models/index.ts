import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPlanetModels } from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

/**
 * GET /api/models?playerId=... (auth required)
 *
 * Returns all planet 3D models for a player.
 * Returns: { models: PlanetModelRow[] }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Firebase auth token
  const auth = await authenticate(req, res);
  if (!auth) return;

  const { playerId } = req.query;
  if (!playerId || typeof playerId !== 'string') {
    return res.status(400).json({ error: 'Missing playerId query parameter' });
  }

  if (playerId !== auth.playerId) {
    return res.status(403).json({ error: 'Forbidden: player mismatch' });
  }

  try {
    const models = await getPlanetModels(playerId);
    return res.status(200).json({ models });
  } catch (err) {
    console.error('Get models error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
