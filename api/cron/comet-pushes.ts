import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCometSchedule } from '@nebulife/core';
import { getCometPushCandidates } from '../../packages/server/src/db.js';
import { enqueueCometEventPush } from '../../packages/server/src/push-events.js';

const DAY_MS = 86_400_000;

/**
 * GET /api/cron/comet-pushes — daily 06:30 UTC
 *
 * The Comet Herald window is deterministic per player (getCometSchedule).
 * For every push-enabled, recently-active player:
 *  - window opens within the next 24h → "tomorrow" heads-up push;
 *  - window active right now        → "today" reminder push.
 * Dedupe keys make repeated cron runs harmless.
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
    const candidates = await getCometPushCandidates();
    const now = Date.now();
    let queuedToday = 0;
    let queuedTomorrow = 0;

    for (const player of candidates) {
      const schedule = getCometSchedule(player.id, now);
      if (schedule.active) {
        const ok = await enqueueCometEventPush({
          playerId: player.id,
          occurrenceDate: schedule.occurrenceDate,
          mode: 'today',
        });
        if (ok) queuedToday++;
      } else if (schedule.msUntilWindow <= DAY_MS) {
        const ok = await enqueueCometEventPush({
          playerId: player.id,
          occurrenceDate: schedule.occurrenceDate,
          mode: 'tomorrow',
        });
        if (ok) queuedTomorrow++;
      }
    }

    return res.status(200).json({
      candidates: candidates.length,
      queuedToday,
      queuedTomorrow,
    });
  } catch (err) {
    console.error('[comet-pushes] Fatal error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
