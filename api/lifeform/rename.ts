import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getLifeformById, updateLifeformName } from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

/**
 * POST /api/lifeform/rename
 *
 * Auth: Bearer token (Firebase)
 * Body: { playerId, lifeformId, speciesName }
 * Returns: { lifeform: LifeformRow }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    const { playerId, lifeformId, speciesName } = req.body;

    if (!playerId || !lifeformId || typeof speciesName !== 'string') {
      return res.status(400).json({ error: 'Missing required fields: playerId, lifeformId, speciesName' });
    }
    if (playerId !== auth.playerId) {
      return res.status(403).json({ error: 'Forbidden: player mismatch' });
    }

    const lifeform = await getLifeformById(lifeformId);
    if (!lifeform) {
      return res.status(404).json({ error: 'Lifeform not found' });
    }
    if (lifeform.player_id !== playerId) {
      return res.status(403).json({ error: 'Forbidden: lifeform owner mismatch' });
    }

    const trimmed = speciesName.trim().slice(0, 60);
    const updated = await updateLifeformName(lifeformId, trimmed);
    return res.status(200).json({ lifeform: updated });
  } catch (err) {
    console.error('Lifeform rename error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
