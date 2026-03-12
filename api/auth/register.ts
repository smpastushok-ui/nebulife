import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateToken } from '../../packages/server/src/auth-middleware.js';
import {
  getPlayerByFirebaseUid,
  linkFirebaseToPlayer,
  createPlayerWithAuth,
} from '../../packages/server/src/db.js';

/**
 * POST /api/auth/register
 *
 * Called after Firebase authentication to create or link a player.
 *
 * Auth: Bearer <firebase-id-token>
 * Body: { legacyPlayerId?: string }
 *
 * Returns: PlayerRow
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticateToken(req, res);
    if (!auth) return; // 401 already sent

    const { legacyPlayerId } = req.body ?? {};

    // 1. Check if player already exists for this Firebase UID
    const existing = await getPlayerByFirebaseUid(auth.uid);
    if (existing) {
      return res.status(200).json(existing);
    }

    // 2. Migration: link Firebase UID to existing legacy player
    if (legacyPlayerId && typeof legacyPlayerId === 'string') {
      const linked = await linkFirebaseToPlayer(
        legacyPlayerId,
        auth.uid,
        auth.provider,
        auth.email,
      );
      if (linked) {
        return res.status(200).json(linked);
      }
      // If linkage failed (player not found or already linked), fall through to create new
    }

    // 3. Create a new player with Firebase auth
    const normalizedProvider = auth.provider === 'google.com' ? 'google'
      : auth.provider === 'password' ? 'email'
      : 'anonymous';

    const player = await createPlayerWithAuth({
      id: auth.uid,
      firebaseUid: auth.uid,
      authProvider: normalizedProvider,
      email: auth.email,
      name: 'Explorer',
      homeSystemId: 'home',
      homePlanetId: 'home',
    });

    return res.status(201).json(player);
  } catch (err) {
    console.error('Auth register error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
