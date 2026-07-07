import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'node:crypto';
import { closePoll } from '../../packages/server/src/db.js';

// ---------------------------------------------------------------------------
// POST /api/admin/poll-close
//
// Admin-only endpoint that closes an active poll (status -> 'closed'), so it
// stops appearing in the global chat and stops accepting votes. Auth: shared
// secret in ADMIN_PUSH_SECRET (falls back to CRON_SECRET), same convention
// as api/admin/broadcast-message.ts.
// ---------------------------------------------------------------------------

function getAdminSecret(): string | null {
  const secret = (process.env.ADMIN_PUSH_SECRET || process.env.CRON_SECRET || '').trim();
  return secret || null;
}

function secretMatches(provided: string, expected: string): boolean {
  const enc = new TextEncoder();
  const a = enc.encode(provided);
  const b = enc.encode(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const expected = getAdminSecret();
  if (!expected) {
    return res.status(503).json({
      error: 'admin_secret_not_configured',
      message: 'Додай ADMIN_PUSH_SECRET (або CRON_SECRET) у змінні середовища проєкту.',
    });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const provided = str(body.secret) || str(req.headers['x-admin-secret']);
  if (!provided || !secretMatches(provided, expected)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const pollId = str(body.pollId);
  if (!pollId) {
    return res.status(400).json({ error: 'missing_poll_id' });
  }

  try {
    const poll = await closePoll(pollId);
    if (!poll) {
      return res.status(404).json({ error: 'poll_not_found' });
    }
    return res.status(200).json({ ok: true, poll });
  } catch (err) {
    console.error('[admin/poll-close] failed:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
