import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'node:crypto';
import { listPlayerFeedback } from '../../packages/server/src/db.js';

// ---------------------------------------------------------------------------
// POST /api/admin/feedback-list
//
// Admin-only, read-only endpoint listing player feedback ("what do you like /
// dislike") rows for the admin console, newest first.
//
// Auth: shared secret in ADMIN_PUSH_SECRET (falls back to CRON_SECRET), sent
// as the `secret` body field or `x-admin-secret` header — same convention as
// api/admin/broadcast-message.ts.
// ---------------------------------------------------------------------------

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

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

  const limit = Math.min(Math.max(1, Number(body.limit) || DEFAULT_LIMIT), MAX_LIMIT);
  const offset = Math.max(0, Number(body.offset) || 0);

  try {
    const { rows, total } = await listPlayerFeedback(limit, offset);
    return res.status(200).json({
      ok: true,
      total,
      limit,
      offset,
      items: rows.map((row) => ({
        id: row.id,
        playerId: row.player_id,
        callsign: row.callsign,
        level: row.level,
        likesText: row.likes_text,
        dislikesText: row.dislikes_text,
        language: row.language,
        createdAt: row.created_at,
      })),
    });
  } catch (err) {
    console.error('[admin/feedback-list] failed:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
