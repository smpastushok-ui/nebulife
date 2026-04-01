import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getTotalPlayerCount } from '../../packages/server/src/db.js';
import { PLAYERS_PER_GROUP } from '@nebulife/core';

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
    const totalPlayers = await getTotalPlayerCount();
    // Calculate cluster count from player count (clusters table may have fewer rows
    // because clusters are created on-demand during player registration)
    const groupCount = Math.max(1, Math.ceil(totalPlayers / PLAYERS_PER_GROUP));

    // Cache for 60 seconds — player count changes infrequently
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({ totalPlayers, groupCount });
  } catch (err) {
    console.error('[universe/info] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
