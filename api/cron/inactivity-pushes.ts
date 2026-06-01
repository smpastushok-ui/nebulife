import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getInactiveReminderCandidates } from '../../packages/server/src/db.js';
import { enqueueInactivityReminderPush } from '../../packages/server/src/push-events.js';

const BATCH_SIZE = 200;

/**
 * GET /api/cron/inactivity-pushes
 *
 * True re-engagement push: finds players who have been idle past a threshold
 * (2 / 7 / 30 days since last_seen_at), opted into push, and have an FCM token,
 * then enqueues one escalating reminder per idle episode. Delivery is handled
 * by /api/cron/push-queue. Distinct from /api/cron/daily-reminders, which is
 * signup-day (D1–D14) onboarding, not inactivity.
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
    const candidates = await getInactiveReminderCandidates({ limit: BATCH_SIZE });

    let queued = 0;
    const errors: string[] = [];

    for (const candidate of candidates) {
      const ok = await enqueueInactivityReminderPush({
        playerId: candidate.player_id,
        thresholdDays: candidate.threshold_days,
        episode: candidate.episode,
        favoriteHourUtc: candidate.favorite_hour_utc,
      });
      if (ok) queued++;
      else errors.push(`${candidate.player_id}: enqueue_failed`);
    }

    return res.status(200).json({
      processed: candidates.length,
      queued,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('[inactivity-pushes] Fatal error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
