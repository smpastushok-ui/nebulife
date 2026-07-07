import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getLiveEventDef,
  getLiveEventSchedule,
  liveEventClaimKey,
} from '@nebulife/core';
import {
  creditQuarks,
  acquireIdempotencyKey,
  completeIdempotencyKey,
  releaseIdempotencyKey,
} from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

const ENDPOINT = 'event/live-claim';

/**
 * POST /api/event/live-claim   body: { eventId }
 *
 * Claim a live cosmic event reward (rogue-flyby / supernova-echo /
 * interstellar-visitor / aurora-storm). Server-validated, mirroring
 * event/comet-claim.ts:
 *  - the deterministic per-player window (getLiveEventSchedule) must be
 *    ACTIVE now;
 *  - one claim per occurrence (idempotency key live:{eventId}:{playerId}:{date}).
 *
 * Response: { claimed: true, eventId, occurrenceDate, quarksGranted, newBalance }
 * XP / research data / the gallery entry are applied client-side; the quarks
 * are the only server-authoritative part of the reward.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  const eventId = typeof req.body?.eventId === 'string' ? req.body.eventId : '';
  const def = getLiveEventDef(eventId);
  if (!def) {
    return res.status(400).json({ error: 'unknown_event' });
  }

  try {
    const schedule = getLiveEventSchedule(def.id, auth.playerId, Date.now());
    if (!schedule.active) {
      return res.status(409).json({
        error: 'window_not_active',
        eventId: def.id,
        occurrenceDate: schedule.occurrenceDate,
        msUntilWindow: schedule.msUntilWindow,
      });
    }

    const idemKey = liveEventClaimKey(def.id, auth.playerId, schedule.occurrenceDate);
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
      const updated = await creditQuarks(auth.playerId, def.rewardQuarks);
      const body = {
        claimed: true,
        eventId: def.id,
        occurrenceDate: schedule.occurrenceDate,
        quarksGranted: def.rewardQuarks,
        newBalance: updated.quarks,
      };
      await completeIdempotencyKey(idemKey, 200, body);
      console.log(`[live-claim] ${auth.playerId} claimed ${def.id} ${schedule.occurrenceDate} (+${def.rewardQuarks})`);
      return res.status(200).json(body);
    } catch (creditErr) {
      await releaseIdempotencyKey(idemKey).catch(() => {});
      throw creditErr;
    }
  } catch (err) {
    console.error('[event/live-claim] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
