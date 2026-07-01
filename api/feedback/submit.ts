import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { getPlayer, savePlayerFeedback } from '../../packages/server/src/db.js';
import { RATE_LIMITS } from '../../packages/server/src/rate-limiter.js';

// ---------------------------------------------------------------------------
// POST /api/feedback/submit
//
// Player-facing endpoint backing the one-shot "what do you like / dislike"
// popup shown once an account reaches level 12+ (see PlayerFeedbackPrompt.tsx).
// Auth: Bearer token (same convention as api/messages/list.ts).
//
// Level 12 is a client-side gate (the popup itself only fires past that
// threshold). Server-side we only guard against obviously-fresh accounts —
// players.player_level is authoritative (GREATEST-merged on every sync in
// updatePlayer), so a stale/low value here means the client gate was bypassed
// rather than that the account genuinely just leveled up.
// ---------------------------------------------------------------------------

const MAX_FIELD_LENGTH = 2000;
const MIN_LEVEL_SERVER_GUARD = 8;

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    if (!await RATE_LIMITS.feedback(auth.playerId)) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const likesText = readString(body.likesText).slice(0, MAX_FIELD_LENGTH);
    const dislikesText = readString(body.dislikesText).slice(0, MAX_FIELD_LENGTH);
    const language = (readString(body.language) === 'en' ? 'en' : 'uk');
    const clientLevel = typeof body.level === 'number' && Number.isFinite(body.level)
      ? Math.max(0, Math.floor(body.level))
      : 0;

    if (!likesText && !dislikesText) {
      return res.status(400).json({ error: 'empty_feedback', message: 'Напиши хоча б щось одне — що подобається чи що ні.' });
    }

    const player = await getPlayer(auth.playerId);
    if (!player) {
      return res.status(404).json({ error: 'player_not_found' });
    }

    const effectiveLevel = Math.max(player.player_level ?? 0, clientLevel);
    if (effectiveLevel < MIN_LEVEL_SERVER_GUARD) {
      return res.status(403).json({
        error: 'level_too_low',
        message: 'Цей опитувальник доступний з 12 рівня.',
      });
    }

    const row = await savePlayerFeedback({
      playerId: auth.playerId,
      callsign: player.callsign ?? null,
      level: effectiveLevel,
      likesText: likesText || null,
      dislikesText: dislikesText || null,
      language,
    });

    return res.status(200).json({ ok: true, id: row.id });
  } catch (err) {
    console.error('[feedback/submit] failed:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
