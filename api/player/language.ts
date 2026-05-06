import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { updatePlayer } from '../../packages/server/src/db.js';

/**
 * POST /api/player/language
 * Auth: Bearer Firebase token
 * Body: { language: 'uk' | 'en' }
 * Updates the player's preferred language in the database.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authResult = await authenticate(req, res);
    if (!authResult) return; // 401/404 already sent

    const { language } = req.body ?? {};

    if (language !== 'uk' && language !== 'en') {
      return res.status(400).json({ error: 'Invalid language. Must be "uk" or "en".' });
    }

    const updated = await updatePlayer(authResult.playerId, { preferred_language: language });
    if (!updated) {
      return res.status(404).json({ error: 'Player not found' });
    }

    return res.status(200).json({ ok: true, language: updated.preferred_language });
  } catch (err) {
    console.error('Player language update error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
