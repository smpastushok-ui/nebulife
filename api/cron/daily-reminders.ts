import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDueDailyReminderCandidates, getEnabledDailyPushPool } from '../../packages/server/src/db.js';
import { enqueueDailySpaceReminderPush, type DailyPushCopy } from '../../packages/server/src/push-events.js';

const BATCH_SIZE = 120;
const LOOKBACK_MINUTES = 30;
/** Daily pushes go only to players active within this window; long-idle players
 *  are covered by the escalating inactivity-pushes cron instead. */
const ACTIVE_WINDOW_DAYS = 14;

/**
 * GET /api/cron/daily-reminders (every 10 min)
 *
 * Daily auto-push: one push per player per day, text taken IN ROTATION from
 * the admin-editable `daily_push_pool` (admin console → "Щоденні автопуші").
 * Frequency cap: if the player already received any other push (digest
 * excluded) within 24 h, today's daily push is skipped — enforced inside
 * getDueDailyReminderCandidates.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization ?? '';
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Admin-editable rotation pool. Empty/missing table → built-in fallback
    // texts inside enqueueDailySpaceReminderPush.
    let pool: DailyPushCopy[] = [];
    try {
      pool = (await getEnabledDailyPushPool()).map((row) => ({
        titleUk: row.title_uk,
        bodyUk: row.body_uk,
        titleEn: row.title_en,
        bodyEn: row.body_en,
        poolId: row.id,
      }));
    } catch (err) {
      console.warn('[daily-reminders] pool unavailable, using built-in copy:', err);
    }

    const candidates = await getDueDailyReminderCandidates({
      lookbackMinutes: LOOKBACK_MINUTES,
      limit: BATCH_SIZE,
      activeWindowDays: ACTIVE_WINDOW_DAYS,
    });

    let queued = 0;
    const errors: string[] = [];

    for (const candidate of candidates) {
      const copy = pool.length > 0 ? pool[candidate.message_index % pool.length] : undefined;
      const ok = await enqueueDailySpaceReminderPush({
        playerId: candidate.player_id,
        reminderDay: candidate.reminder_day,
        messageIndex: candidate.message_index,
        scheduledAt: candidate.scheduled_at,
        copy,
      });
      if (ok) queued++;
      else errors.push(`${candidate.player_id}: enqueue_failed`);
    }

    return res.status(200).json({
      processed: candidates.length,
      queued,
      poolSize: pool.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('[daily-reminders] Fatal error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
