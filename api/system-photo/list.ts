import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPlayerSystemPhotos } from '../../packages/server/src/db.js';

/**
 * GET /api/system-photo/list?playerId=xxx
 *
 * Returns: { photos: SystemPhotoRow[] }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { playerId } = req.query;
    if (!playerId || typeof playerId !== 'string') {
      return res.status(400).json({ error: 'Missing playerId' });
    }

    const photos = await getPlayerSystemPhotos(playerId);

    return res.status(200).json({ photos });
  } catch (err) {
    console.error('System photo list error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
