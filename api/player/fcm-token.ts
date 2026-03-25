import type { VercelRequest, VercelResponse } from '@vercel/node';
import { updateFcmToken } from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

/**
 * PUT /api/player/:playerId/fcm-token
 * Store or clear the player's FCM registration token.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { playerId } = req.query;
  if (!playerId || typeof playerId !== 'string') {
    return res.status(400).json({ error: 'Missing playerId parameter' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  if (playerId !== auth.playerId) {
    return res.status(403).json({ error: 'Forbidden: cannot modify another player' });
  }

  try {
    const { fcm_token } = req.body ?? {};
    if (fcm_token !== undefined && fcm_token !== null && typeof fcm_token !== 'string') {
      return res.status(400).json({ error: 'fcm_token must be a string or null' });
    }
    await updateFcmToken(playerId, typeof fcm_token === 'string' ? fcm_token : null);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('FCM token update error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
