import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { getActivePoll, getPlayerVoteForPoll, getPollResultsPublic } from '../../packages/server/src/db.js';
import { RATE_LIMITS } from '../../packages/server/src/rate-limiter.js';

// ---------------------------------------------------------------------------
// GET /api/polls/active
//
// Returns the current active poll (question + options only) for the global
// chat poll card. If the requesting player has already voted, also returns
// their chosen option and the results as PERCENTAGES ONLY — the response
// never includes absolute vote counts (see getPollResultsPublic in db.ts,
// which aggregates and discards raw counts server-side before returning).
// Auth: Bearer token (same convention as api/feedback/submit.ts).
// ---------------------------------------------------------------------------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    if (!await RATE_LIMITS.poll(auth.playerId)) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    const poll = await getActivePoll();
    if (!poll) {
      return res.status(200).json({ poll: null });
    }

    const vote = await getPlayerVoteForPoll(poll.id, auth.playerId);

    const base = {
      id: poll.id,
      questionUk: poll.question_uk,
      questionEn: poll.question_en,
      options: poll.options.map((o) => ({ id: o.id, labelUk: o.label_uk, labelEn: o.label_en })),
      status: poll.status,
      createdAt: poll.created_at,
      closesAt: poll.closes_at,
    };

    if (!vote) {
      return res.status(200).json({ poll: { ...base, hasVoted: false } });
    }

    // Deliberately drop `totalVotes` from the response here — only the
    // per-option percentages are sent to players, never any raw count.
    const results = await getPollResultsPublic(poll.id);
    return res.status(200).json({
      poll: {
        ...base,
        hasVoted: true,
        votedOptionId: vote.option_id,
        percentages: results.options,
      },
    });
  } catch (err) {
    console.error('[polls/active] failed:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
