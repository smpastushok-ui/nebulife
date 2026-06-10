import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'node:crypto';
import {
  listDailyPushPool,
  saveDailyPushPoolItem,
  deleteDailyPushPoolItem,
  getDailyPushStats,
} from '../../packages/server/src/db.js';

// ---------------------------------------------------------------------------
// POST /api/admin/daily-pushes
//
// CRUD for the daily auto-push rotation pool (daily_push_pool table). Powers
// the "Щоденні автопуші" section of the admin console. The daily-reminders
// cron picks texts from this pool in rotation; editing here takes effect on
// the next cron run — no deploy needed.
//
// Ops (body.op): 'list' | 'save' | 'delete'
// Auth: same shared secret as broadcast-push (ADMIN_PUSH_SECRET / CRON_SECRET).
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

  const op = str(body.op) || 'list';

  try {
    if (op === 'list') {
      const [items, stats] = await Promise.all([listDailyPushPool(), getDailyPushStats()]);
      return res.status(200).json({ items, stats });
    }

    if (op === 'save') {
      const titleUk = str(body.titleUk);
      const bodyUk = str(body.bodyUk);
      const titleEn = str(body.titleEn);
      const bodyEn = str(body.bodyEn);
      if (!titleUk || !bodyUk || !titleEn || !bodyEn) {
        return res.status(400).json({
          error: 'missing_copy',
          message: 'Потрібні заголовок і текст обома мовами (UK + EN).',
        });
      }
      const sortOrderRaw = Number(body.sortOrder);
      const item = await saveDailyPushPoolItem({
        id: str(body.id) || null,
        titleUk,
        bodyUk,
        titleEn,
        bodyEn,
        enabled: body.enabled !== false,
        sortOrder: Number.isFinite(sortOrderRaw) ? Math.round(sortOrderRaw) : 0,
      });
      return res.status(200).json({ ok: true, item });
    }

    if (op === 'delete') {
      const id = str(body.id);
      if (!id) return res.status(400).json({ error: 'missing_id' });
      const deleted = await deleteDailyPushPoolItem(id);
      return res.status(200).json({ ok: true, deleted });
    }

    return res.status(400).json({ error: 'unknown_op', message: `Невідома операція: ${op}` });
  } catch (err) {
    console.error('[admin/daily-pushes] failed:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
