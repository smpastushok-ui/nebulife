import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getTotalPlayerCount, getClusterCount } from '../../packages/server/src/db.js';

/**
 * GET /api/universe/info
 *
 * Public endpoint returning universe statistics for galaxy rendering.
 * No auth required — data is non-sensitive.
 *
 * Returns: { totalPlayers: number, groupCount: number }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [totalPlayers, groupCount] = await Promise.all([
      getTotalPlayerCount(),
      getClusterCount(),
    ]);

    // Cache for 60 seconds — player count changes infrequently
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({ totalPlayers, groupCount });
  } catch (err) {
    console.error('[universe/info] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
