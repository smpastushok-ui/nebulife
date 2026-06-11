import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getCometSchedule,
  cometClaimKey,
  COMET_REWARD_QUARKS,
} from '@nebulife/core';
import {
  creditQuarks,
  acquireIdempotencyKey,
  completeIdempotencyKey,
  releaseIdempotencyKey,
} from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

const ENDPOINT = 'event/comet-claim';

/**
 * POST /api/event/comet-claim
 *
 * Claim the Comet Herald reward. Server-validated:
 *  - the deterministic per-player window (getCometSchedule) must be ACTIVE now;
 *  - one claim per occurrence (idempotency key comet:{playerId}:{date}).
 *
 * Response: { claimed: true, occurrenceDate, quarksGranted, newBalance }
 * XP / resources / the gallery entry are applied client-side; the quarks are
 * the only server-authoritative part of the reward.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    const schedule = getCometSchedule(auth.playerId, Date.now());
    if (!schedule.active) {
      return res.status(409).json({
        error: 'window_not_active',
        occurrenceDate: schedule.occurrenceDate,
        msUntilWindow: schedule.msUntilWindow,
      });
    }

    const idemKey = cometClaimKey(auth.playerId, schedule.occurrenceDate);
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
      const updated = await creditQuarks(auth.playerId, COMET_REWARD_QUARKS);
      const body = {
        claimed: true,
        occurrenceDate: schedule.occurrenceDate,
        quarksGranted: COMET_REWARD_QUARKS,
        newBalance: updated.quarks,
      };
      await completeIdempotencyKey(idemKey, 200, body);
      console.log(`[comet-claim] ${auth.playerId} claimed ${schedule.occurrenceDate} (+${COMET_REWARD_QUARKS})`);
      return res.status(200).json(body);
    } catch (creditErr) {
      await releaseIdempotencyKey(idemKey).catch(() => {});
      throw creditErr;
    }
  } catch (err) {
    console.error('[event/comet-claim] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
