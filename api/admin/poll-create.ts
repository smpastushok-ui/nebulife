import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual, randomUUID } from 'node:crypto';
import { createPoll, type PollOption } from '../../packages/server/src/db.js';

// ---------------------------------------------------------------------------
// POST /api/admin/poll-create
//
// Admin-only endpoint that creates a new poll (question uk/en + options
// uk/en) for the "Голосування" section of the admin console. Auth: shared
// secret in ADMIN_PUSH_SECRET (falls back to CRON_SECRET), sent as the
// `secret` body field or `x-admin-secret` header — same convention as
// api/admin/broadcast-message.ts.
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

const MAX_QUESTION_LENGTH = 300;
const MAX_OPTION_LENGTH = 120;
const MAX_OPTIONS = 8;

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

  try {
    const questionUk = str(body.questionUk).slice(0, MAX_QUESTION_LENGTH);
    const questionEn = str(body.questionEn).slice(0, MAX_QUESTION_LENGTH);
    if (!questionUk || !questionEn) {
      return res.status(400).json({ error: 'missing_question', message: 'Потрібне питання обома мовами (UK + EN).' });
    }

    const rawOptions = Array.isArray(body.options) ? body.options : [];
    const options: PollOption[] = rawOptions
      .map((raw): PollOption | null => {
        const o = (raw ?? {}) as Record<string, unknown>;
        const labelUk = str(o.labelUk).slice(0, MAX_OPTION_LENGTH);
        const labelEn = str(o.labelEn).slice(0, MAX_OPTION_LENGTH);
        if (!labelUk || !labelEn) return null;
        return { id: str(o.id) || randomUUID().slice(0, 8), label_uk: labelUk, label_en: labelEn };
      })
      .filter((o): o is PollOption => o !== null)
      .slice(0, MAX_OPTIONS);

    if (options.length < 2) {
      return res.status(400).json({
        error: 'not_enough_options',
        message: 'Потрібно щонайменше 2 варіанти відповіді, кожен обома мовами.',
      });
    }

    const closesAtRaw = str(body.closesAt);
    const closesAt = closesAtRaw && !Number.isNaN(Date.parse(closesAtRaw)) ? closesAtRaw : null;

    const poll = await createPoll({ questionUk, questionEn, options, closesAt });
    return res.status(200).json({ ok: true, poll });
  } catch (err) {
    console.error('[admin/poll-create] failed:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
