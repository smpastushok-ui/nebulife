import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateToken } from '../../packages/server/src/auth-middleware.js';
import {
  getPlayerByFirebaseUid,
  linkFirebaseToPlayer,
  createPlayerWithAuth,
} from '../../packages/server/src/db.js';
import { assignPlayerToCluster } from '@nebulife/server';
import { sendWelcomeEmail } from '../../packages/server/src/email-client.js';
import { areAdsAllowedForRequest } from '../../packages/server/src/ad-geo.js';

function maybeSendWelcomeEmail(player: {
  id: string;
  name: string;
  email: string | null;
  preferred_language?: string;
  email_notifications?: boolean;
} | null): void {
  if (!player?.email || player.email_notifications === false || !process.env.RESEND_API_KEY) return;
  const lang = player.preferred_language === 'en' ? 'en' : 'uk';
  sendWelcomeEmail({
    to: player.email,
    playerName: player.name,
    playerId: player.id,
    lang,
  }).catch((err) => {
    console.warn('[register] Welcome email failed:', err);
  });
}

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

    // Rewarded ads are only enabled in Tier-1 (high-eCPM) countries. Surface
    // this to the client so it can hide the ad UI outside those regions.
    const adsGeoAllowed = areAdsAllowedForRequest(req.headers);

    // 1. Check if player already exists for this Firebase UID
    const existing = await getPlayerByFirebaseUid(auth.uid);
    if (existing) {
      console.log(`[register] Found existing player: id=${existing.id}`);
      return res.status(200).json({ ...existing, ads_geo_allowed: adsGeoAllowed });
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
        maybeSendWelcomeEmail(linked);
        return res.status(200).json({ ...linked, ads_geo_allowed: adsGeoAllowed });
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

    maybeSendWelcomeEmail(player);
    return res.status(201).json({ ...player, ads_geo_allowed: adsGeoAllowed });
  } catch (err) {
    console.error('[register] FATAL ERROR:', err instanceof Error ? err.stack : err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal error',
      details: err instanceof Error ? err.stack : undefined,
    });
  }
}
