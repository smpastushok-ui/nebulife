import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getDigestPendingPushes,
  getDigestPushRecipients,
  markDigestPushesSent,
} from '../../packages/server/src/db.js';
import { enqueueDigestReadyPush } from '../../packages/server/src/push-events.js';
import { DIGEST_LANGUAGES } from '@nebulife/core';

/**
 * GET /api/cron/digest-pushes
 * Runs every 5 minutes.
 * Finds the latest complete digest that hasn't had pushes sent,
 * enqueues push notifications for all eligible players, then marks pushes_sent = TRUE.
 * Actual FCM delivery is handled by /api/cron/push-queue.
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
    const digest = await getDigestPendingPushes();
    if (!digest) {
      return res.status(200).json({ processed: 0, reason: 'no_pending' });
    }

    let totalQueued = 0;
    const errors: string[] = [];

    for (const lang of DIGEST_LANGUAGES) {
      const recipients = await getDigestPushRecipients(lang);
      for (const player of recipients) {
        try {
          const queued = await enqueueDigestReadyPush({
            playerId: player.id,
            weekDate: digest.week_date,
          });
          if (queued) {
            totalQueued++;
          } else {
            errors.push(`${player.id}: enqueue_failed`);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${player.id}: ${msg}`);
          console.error(`[digest-pushes] Failed enqueue for ${player.id}:`, err);
        }
      }
    }

    if (errors.length === 0) {
      await markDigestPushesSent(digest.week_date);
    }
    console.log(`[digest-pushes] Queued ${totalQueued} pushes for ${digest.week_date}`);

    return res.status(200).json({
      processed: totalQueued,
      weekDate: digest.week_date,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('[digest-pushes] Fatal error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown' });
  }
}
