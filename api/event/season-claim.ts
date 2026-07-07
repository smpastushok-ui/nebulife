import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getCurrentSeason,
  seasonOccurrenceId,
  SEASON_COLLECTION_REWARD_QUARKS,
} from '@nebulife/core';
import {
  creditQuarks,
  acquireIdempotencyKey,
  completeIdempotencyKey,
  releaseIdempotencyKey,
} from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

const ENDPOINT = 'event/season-claim';

/**
 * POST /api/event/season-claim
 *
 * Claim the "Сезони спостережень" finale reward (+150⚛ for collecting all 5
 * seasonal anomalies in one season). Server-validated:
 *  - the season occurrence is derived purely from server time
 *    (`getCurrentSeason`), identical to the client's deterministic
 *    computation — no stored schedule needed (mirrors event/comet-claim.ts);
 *  - one claim per occurrence (idempotency key season:{playerId}:{occurrenceId}).
 *
 * Same trust model as `claimDailyDirectives` (db.ts): collecting the 5
 * anomalies is client-tracked via the observatory catalog roll + game_state
 * sync; the server only enforces "one reward per season occurrence" so a
 * tampered client can, at worst, claim the same reward an honest player gets
 * — never more than once per ~7-week season.
 *
 * Response: { claimed: true, occurrenceId, quarksGranted, newBalance }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    const season = getCurrentSeason(Date.now());
    const occurrenceId = seasonOccurrenceId(season.seasonIndex);

    const idemKey = `season:${auth.playerId}:${occurrenceId}`;
    const acquired = await acquireIdempotencyKey(idemKey, auth.playerId, ENDPOINT);
    if (!acquired.acquired) {
      if ('record' in acquired && acquired.record?.response_body) {
        return res
          .status(acquired.record.response_status ?? 200)
          .json(acquired.record.response_body);
      }
      return res.status(409).json({ error: 'duplicate_in_progress' });
    }

    try {
      const updated = await creditQuarks(auth.playerId, SEASON_COLLECTION_REWARD_QUARKS);
      const body = {
        claimed: true,
        occurrenceId,
        quarksGranted: SEASON_COLLECTION_REWARD_QUARKS,
        newBalance: updated.quarks,
      };
      await completeIdempotencyKey(idemKey, 200, body);
      console.log(`[season-claim] ${auth.playerId} claimed ${occurrenceId} (+${SEASON_COLLECTION_REWARD_QUARKS})`);
      return res.status(200).json(body);
    } catch (creditErr) {
      await releaseIdempotencyKey(idemKey).catch(() => {});
      throw creditErr;
    }
  } catch (err) {
    console.error('[event/season-claim] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
