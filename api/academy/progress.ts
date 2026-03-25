import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { getAcademyProgress } from '../../packages/server/src/db.js';

/**
 * GET /api/academy/progress
 * Returns the player's academy progress.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    const progress = await getAcademyProgress(auth.playerId);
    return res.status(200).json({ progress });
  } catch (err) {
    console.error('[academy/progress]', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
