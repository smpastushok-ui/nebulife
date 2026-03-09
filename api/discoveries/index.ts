import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDiscoveries } from '../../packages/server/src/db.js';

/**
 * GET /api/discoveries?playerId=...&category=...
 *
 * Returns: DiscoveryRow[]
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const playerId = req.query.playerId as string | undefined;
    const category = req.query.category as string | undefined;

    if (!playerId) {
      return res.status(400).json({ error: 'Missing playerId query parameter' });
    }

    const discoveries = await getDiscoveries(playerId, category);
    return res.status(200).json(discoveries);
  } catch (err) {
    console.error('Discoveries list error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
