import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { castVote, getPollResultsPublic } from '../../packages/server/src/db.js';
import { RATE_LIMITS } from '../../packages/server/src/rate-limiter.js';

// ---------------------------------------------------------------------------
// POST /api/polls/vote
//
// Casts a player's vote for one option of a poll. One vote per player per
// poll — enforced server-side by the UNIQUE(poll_id, player_id) index (see
// castVote in db.ts), not just client-side state. Returns the resulting
// percentages (never absolute counts) so the client can render the results
// view immediately after voting.
// Auth: Bearer token (same convention as api/feedback/submit.ts). Voting is
// intentionally NOT level-gated (unlike sending global chat messages).
// ---------------------------------------------------------------------------

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    if (!await RATE_LIMITS.pollVote(auth.playerId)) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const pollId = str(body.pollId);
    const optionId = str(body.optionId);
    if (!pollId || !optionId) {
      return res.status(400).json({ error: 'missing_fields', message: 'pollId і optionId обовʼязкові.' });
    }

    const result = await castVote({ pollId, playerId: auth.playerId, optionId });
    if (!result.ok) {
      const statusByReason: Record<string, number> = {
        already_voted: 409,
        poll_not_found: 404,
        poll_closed: 409,
        invalid_option: 400,
      };
      return res.status(statusByReason[result.reason] ?? 400).json({ error: result.reason });
    }

    // Deliberately drop `totalVotes` from the response — players only ever
    // see per-option percentages, never a raw count.
    const results = await getPollResultsPublic(pollId);
    return res.status(200).json({
      ok: true,
      votedOptionId: optionId,
      percentages: results.options,
    });
  } catch (err) {
    console.error('[polls/vote] failed:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
