import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'node:crypto';
import {
  countBroadcastAudience,
  enqueueBroadcastPush,
  type BroadcastPushInput,
} from '../../packages/server/src/db.js';

// ---------------------------------------------------------------------------
// POST /api/admin/broadcast-push
//
// Admin-only endpoint that powers the custom push broadcast page. It does NOT
// send pushes directly — it enqueues one push_queue row per matching player,
// and the existing /api/cron/push-queue worker delivers them (batching,
// retries, dead-token cleanup, per-player language, favorite-hour timing).
//
// Auth: shared secret in the `ADMIN_PUSH_SECRET` env var (falls back to
// CRON_SECRET so it works without extra config). Send it as the `secret` body
// field or the `x-admin-secret` header.
// ---------------------------------------------------------------------------

function getAdminSecret(): string | null {
  return process.env.ADMIN_PUSH_SECRET || process.env.CRON_SECRET || null;
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

function clampLanguage(v: unknown): 'all' | 'uk' | 'en' {
  return v === 'uk' || v === 'en' ? v : 'all';
}

function clampAudience(v: unknown): 'all' | 'active' | 'inactive' {
  return v === 'active' || v === 'inactive' ? v : 'all';
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

  const language = clampLanguage(body.language);
  const audience = clampAudience(body.audience);
  const dryRun = body.dryRun === true;

  // Title/body per language. For a single-language campaign we mirror the copy
  // into both columns so the cron's `lang === 'en' ? ... : ...` pick is always
  // safe regardless of each recipient's preferred_language.
  let titleUk = str(body.titleUk);
  let bodyUk = str(body.bodyUk);
  let titleEn = str(body.titleEn);
  let bodyEn = str(body.bodyEn);

  if (language === 'uk') {
    titleEn = titleEn || titleUk;
    bodyEn = bodyEn || bodyUk;
  } else if (language === 'en') {
    titleUk = titleUk || titleEn;
    bodyUk = bodyUk || bodyEn;
  }

  const needUk = language === 'all' || language === 'uk';
  const needEn = language === 'all' || language === 'en';
  if (!dryRun) {
    if (needUk && (!titleUk || !bodyUk)) {
      return res.status(400).json({ error: 'missing_uk_copy', message: 'Потрібні заголовок і текст українською.' });
    }
    if (needEn && (!titleEn || !bodyEn)) {
      return res.status(400).json({ error: 'missing_en_copy', message: 'Потрібні заголовок і текст англійською.' });
    }
  }

  const idleDaysRaw = Number(body.idleDays);
  const idleDays = Number.isFinite(idleDaysRaw) ? Math.min(365, Math.max(1, Math.round(idleDaysRaw))) : 7;

  const action = str(body.action) || 'open-game';
  const testPlayerId = str(body.testPlayerId) || null;

  // External-link campaigns (e.g. Telegram community) require an absolute URL.
  // These are only honored by the Android app on tap; iOS ignores them.
  let link: string;
  if (action === 'open-url') {
    link = str(body.link);
    if (!/^https?:\/\//i.test(link)) {
      return res.status(400).json({
        error: 'invalid_external_link',
        message: 'Для зовнішнього посилання потрібен повний URL (http/https).',
      });
    }
  } else {
    link = str(body.link) || `/?action=${encodeURIComponent(action)}`;
  }

  const input: BroadcastPushInput = {
    campaignId: str(body.campaignId) || `bc_${Date.now()}`,
    titleUk,
    bodyUk,
    titleEn,
    bodyEn,
    action,
    link,
    language,
    audience,
    idleDays,
    scheduleAtFavoriteHour: body.scheduleAtFavoriteHour === true,
    testPlayerId,
  };

  try {
    if (dryRun) {
      const matched = await countBroadcastAudience(input);
      return res.status(200).json({ dryRun: true, matched });
    }

    const enqueued = await enqueueBroadcastPush(input);
    return res.status(200).json({
      ok: true,
      campaignId: input.campaignId,
      enqueued,
      note: 'У черзі. Доставка йде через push-queue cron (приблизно раз на хвилину).',
    });
  } catch (err) {
    console.error('[admin/broadcast-push] failed:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
