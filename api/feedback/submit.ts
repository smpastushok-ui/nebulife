import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  acquireIdempotencyKey,
  completeIdempotencyKey,
  getFeedbackEligibility,
  getPlayer,
  normalizeFeedbackIdempotencyKey,
  RATE_LIMITS,
  releaseIdempotencyKey,
  savePlayerFeedback,
  validateFeedbackPayload,
} from '@nebulife/server';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

// ---------------------------------------------------------------------------
// POST /api/feedback/submit
//
// Player-facing endpoint backing both the level-12 survey and the opt-in
// "Message the Weaver" support channel. The latter is deliberately available
// at every level, including Firebase anonymous accounts.
// Auth: Bearer token (same convention as api/messages/list.ts).
//
// Level 12 is a client-side gate (the popup itself only fires past that
// threshold). Server-side we only guard against obviously-fresh accounts —
// players.player_level is authoritative (GREATEST-merged on every sync in
// updatePlayer), so a stale/low value here means the client gate was bypassed
// rather than that the account genuinely just leveled up.
// ---------------------------------------------------------------------------

const ENDPOINT = '/api/feedback/submit';

function sendError(
  res: VercelResponse,
  status: number,
  code: string,
): VercelResponse {
  return res.status(status).json({ error: { code } });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'method_not_allowed');
  }

  let acquiredKey: string | null = null;
  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const parsed = validateFeedbackPayload(req.body);
    if (!parsed.ok) {
      return sendError(res, parsed.status, parsed.code);
    }

    if (!await RATE_LIMITS.feedback(auth.playerId)) {
      return sendError(res, 429, 'rate_limited');
    }

    const player = await getPlayer(auth.playerId);
    if (!player) {
      return sendError(res, 404, 'player_not_found');
    }

    const eligibility = getFeedbackEligibility(parsed.source, player.player_level, parsed.clientLevel);
    if (!eligibility.allowed) {
      return sendError(res, 403, eligibility.code);
    }

    const rawIdempotencyKey = req.headers['x-idempotency-key'];
    const clientKey = normalizeFeedbackIdempotencyKey(rawIdempotencyKey);
    if (parsed.source === 'weaver' && !clientKey) {
      return sendError(res, 400, 'idempotency_key_required');
    }
    if (clientKey) {
      acquiredKey = `feedback:${auth.playerId}:${clientKey}`;
      const acquired = await acquireIdempotencyKey(acquiredKey, auth.playerId, ENDPOINT);
      if (!acquired.acquired) {
        if ('record' in acquired && acquired.record.response_body) {
          return res
            .status(acquired.record.response_status ?? 200)
            .json(acquired.record.response_body);
        }
        return sendError(res, 409, 'duplicate_in_progress');
      }
    }

    const row = await savePlayerFeedback({
      playerId: auth.playerId,
      callsign: player.callsign ?? null,
      level: eligibility.effectiveLevel,
      likesText: parsed.likesText || null,
      dislikesText: parsed.dislikesText || null,
      language: parsed.language,
    });

    const responseBody = { ok: true, id: row.id };
    if (acquiredKey) {
      await completeIdempotencyKey(acquiredKey, 200, responseBody);
    }
    return res.status(200).json(responseBody);
  } catch (err) {
    if (acquiredKey) {
      await releaseIdempotencyKey(acquiredKey).catch(() => {});
    }
    console.error('[feedback/submit] failed:', err);
    return sendError(res, 500, 'server_error');
  }
}
