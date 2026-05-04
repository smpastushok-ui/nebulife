import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateToken } from '../../packages/server/src/auth-middleware.js';
import {
  getPlayerByFirebaseUid,
  linkFirebaseToPlayer,
  createPlayerWithAuth,
} from '../../packages/server/src/db.js';
import { assignPlayerToCluster } from '@nebulife/server';

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
    console.log('[register] Starting registration...');
    const auth = await authenticateToken(req, res);
    if (!auth) return; // 401 already sent
    console.log(`[register] Token verified: uid=${auth.uid}, provider=${auth.provider}`);

    const { legacyPlayerId } = req.body ?? {};

    // 1. Check if player already exists for this Firebase UID
    const existing = await getPlayerByFirebaseUid(auth.uid);
    if (existing) {
      console.log(`[register] Found existing player: id=${existing.id}`);
      return res.status(200).json(existing);
    }
    console.log('[register] No existing player found, creating new...');

    // 2. Migration: link Firebase UID to existing legacy player
    if (legacyPlayerId && typeof legacyPlayerId === 'string') {
      console.log(`[register] Attempting legacy link: legacyId=${legacyPlayerId}`);
      const linked = await linkFirebaseToPlayer(
        legacyPlayerId,
        auth.uid,
        auth.provider,
        auth.email,
      );
      if (linked) {
        console.log(`[register] Linked to legacy player: id=${linked.id}`);
        // Assign cluster if not already assigned
        if (linked.global_index != null && !linked.cluster_id) {
          try {
            await assignPlayerToCluster(linked.id, linked.global_index);
            console.log(`[register] Cluster assigned for linked player: id=${linked.id}`);
          } catch (clusterErr) {
            console.warn('[register] Failed to assign cluster for linked player:', clusterErr);
          }
        }
        return res.status(200).json(linked);
      }
      console.log('[register] Legacy link failed, creating fresh player');
    }

    // 3. Create a new player with Firebase auth
    const normalizedProvider = auth.provider === 'google.com' ? 'google'
      : auth.provider === 'password' ? 'email'
      : auth.provider === 'apple.com' ? 'apple'
      : 'anonymous';

    console.log(`[register] Creating player: uid=${auth.uid}, provider=${normalizedProvider}`);
    const player = await createPlayerWithAuth({
      id: auth.uid,
      firebaseUid: auth.uid,
      authProvider: normalizedProvider,
      email: auth.email,
      name: 'Explorer',
      homeSystemId: 'home',
      homePlanetId: 'home',
    });

    console.log(`[register] Player created: id=${player?.id}, phase=${player?.game_phase}`);

    // Assign the new player to their cluster
    if (player?.global_index != null) {
      try {
        await assignPlayerToCluster(player.id, player.global_index);
        console.log(`[register] Cluster assigned for new player: id=${player.id}, globalIndex=${player.global_index}`);
      } catch (clusterErr) {
        console.warn('[register] Failed to assign cluster for new player:', clusterErr);
      }
    }

    return res.status(201).json(player);
  } catch (err) {
    console.error('[register] FATAL ERROR:', err instanceof Error ? err.stack : err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal error',
      details: err instanceof Error ? err.stack : undefined,
    });
  }
}
