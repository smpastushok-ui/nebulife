import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateToken } from '../../packages/server/src/auth-middleware.js';
import {
  getPlayerByFirebaseUid,
  linkFirebaseToPlayer,
  createPlayerWithAuth,
  findRecoverableGuest,
  findRecoverableLinkedAccountHint,
  relinkGuestToUid,
  detachFirebaseUid,
  setPlayerDeviceId,
  isFreshPlayerRow,
  touchPlayerPresence,
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

function playerProgressXp(player: { player_xp?: number | null; game_state?: Record<string, unknown> | null } | null): number {
  if (!player) return 0;
  const columnXp = typeof player.player_xp === 'number' && Number.isFinite(player.player_xp) ? player.player_xp : 0;
  const stateXp = typeof player.game_state?.xp === 'number' && Number.isFinite(player.game_state.xp) ? player.game_state.xp : 0;
  return Math.max(columnXp, stateXp);
}

/**
 * POST /api/auth/register
 *
 * Called after Firebase authentication to create or link a player.
 *
 * Auth: Bearer <firebase-id-token>
 * Body: { legacyPlayerId?: string, deviceId?: string }
 *
 * `deviceId` (Capacitor Device.getId()) is a recovery key for guests: if the
 * Firebase anonymous UID changed (lost WebView session after an app update), we
 * re-link the old anonymous row on this device instead of orphaning its progress.
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

    const { legacyPlayerId, deviceId: rawDeviceId, fcmToken: rawFcmToken } = req.body ?? {};
    const deviceId = typeof rawDeviceId === 'string' && rawDeviceId.trim()
      ? rawDeviceId.trim().slice(0, 128)
      : null;
    const fcmToken = typeof rawFcmToken === 'string' && rawFcmToken.trim()
      ? rawFcmToken.trim().slice(0, 4096)
      : null;

    const normalizedProvider = auth.provider === 'google.com' ? 'google'
      : auth.provider === 'password' ? 'email'
      : auth.provider === 'apple.com' ? 'apple'
      : 'anonymous';

    // Rewarded ads are only enabled in Tier-1 (high-eCPM) countries. Surface
    // this to the client so it can hide the ad UI outside those regions.
    const adsGeoAllowed = areAdsAllowedForRequest(req.headers);

    // 1. Player already exists for this Firebase UID AND has real progress →
    //    normal path. (A FRESH/empty stub is NOT returned here: it may be the
    //    row a guest churned INTO after losing their session — we let recovery
    //    below override it with their original progress.)
    const existing = await getPlayerByFirebaseUid(auth.uid);
    if (existing && !isFreshPlayerRow(existing)) {
      console.log(`[register] Found existing player: id=${existing.id}`);
      // Keep the recovery key fresh so a future UID change on this device can
      // still find this row (best-effort; never blocks the response).
      if (deviceId && existing.device_id !== deviceId) {
        try { await setPlayerDeviceId(existing.id, deviceId); } catch { /* non-critical */ }
      }
      const touched = await touchPlayerPresence(existing.id);
      return res.status(200).json({ ...(touched ?? existing), ads_geo_allowed: adsGeoAllowed });
    }

    // 2. Guest recovery: re-link an orphaned guest row (matched by FCM token or
    //    device_id) whose Firebase UID changed after an app update. Only for
    //    anonymous logins so a shared device can never steal a linked account.
    if (normalizedProvider === 'anonymous') {
      const linkedHint = await findRecoverableLinkedAccountHint({ fcmToken, deviceId, excludeUid: auth.uid });
      const candidate = await findRecoverableGuest({ fcmToken, deviceId, excludeUid: auth.uid });
      if (linkedHint && (!candidate || playerProgressXp(linkedHint) >= playerProgressXp(candidate))) {
        return res.status(200).json({
          requires_linked_login: true,
          linked_provider_hint: linkedHint.auth_provider,
          linked_progress_xp: playerProgressXp(linkedHint),
          guest_progress_xp: playerProgressXp(candidate),
          ads_geo_allowed: adsGeoAllowed,
        });
      }
      if (candidate) {
        // Free the new UID if an empty stub already holds it (unique index).
        if (existing) {
          try { await detachFirebaseUid(existing.id); } catch { /* non-critical */ }
        }
        const recovered = await relinkGuestToUid(candidate.id, auth.uid, deviceId);
        if (recovered) {
          console.log(`[register] Recovered guest: id=${recovered.id} (key=${fcmToken ? 'fcm' : 'device'})`);
          if (recovered.global_index != null && !recovered.cluster_id) {
            try { await assignPlayerToCluster(recovered.id, recovered.global_index); }
            catch (clusterErr) { console.warn('[register] Cluster assign (recovered) failed:', clusterErr); }
          }
          const touched = await touchPlayerPresence(recovered.id);
          return res.status(200).json({ ...(touched ?? recovered), ads_geo_allowed: adsGeoAllowed });
        }
      }
    }

    // No recovery candidate. If a fresh stub already exists for this UID, just
    // return it (don't create a duplicate); otherwise fall through to create.
    if (existing) {
      if (deviceId) { try { await setPlayerDeviceId(existing.id, deviceId); } catch { /* non-critical */ } }
      const touched = await touchPlayerPresence(existing.id);
      return res.status(200).json({ ...(touched ?? existing), ads_geo_allowed: adsGeoAllowed });
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
        const touched = await touchPlayerPresence(linked.id);
        return res.status(200).json({ ...(touched ?? linked), ads_geo_allowed: adsGeoAllowed });
      }
      console.log('[register] Legacy link failed, creating fresh player');
    }

    // 4. Create a new player with Firebase auth
    console.log(`[register] Creating player: uid=${auth.uid}, provider=${normalizedProvider}`);
    const player = await createPlayerWithAuth({
      id: auth.uid,
      firebaseUid: auth.uid,
      authProvider: normalizedProvider,
      email: auth.email,
      name: 'Explorer',
      homeSystemId: 'home',
      homePlanetId: 'home',
      deviceId,
    });

    console.log(`[register] Player created: id=${player?.id}, phase=${player?.game_phase}`);

    // Assign the new player to their own cluster seat. Player identifiers are
    // immutable: never recycle or swap global_index values after they are
    // issued, because the index is part of the player's galaxy identity.
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
