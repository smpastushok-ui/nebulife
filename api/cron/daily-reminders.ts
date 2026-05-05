import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDueDailyReminderCandidates } from '../../packages/server/src/db.js';
import { enqueueDailySpaceReminderPush } from '../../packages/server/src/push-events.js';

const BATCH_SIZE = 120;
const LOOKBACK_MINUTES = 30;
const MAX_REMINDER_DAYS = 14;

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
    const candidates = await getDueDailyReminderCandidates({
      lookbackMinutes: LOOKBACK_MINUTES,
      limit: BATCH_SIZE,
      maxReminderDays: MAX_REMINDER_DAYS,
    });

    let queued = 0;
    const errors: string[] = [];

    for (const candidate of candidates) {
      const ok = await enqueueDailySpaceReminderPush({
        playerId: candidate.player_id,
        reminderDay: candidate.reminder_day,
        messageIndex: candidate.message_index,
        scheduledAt: candidate.scheduled_at,
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
    console.error('[daily-reminders] Fatal error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
