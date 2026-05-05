import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  claimPendingPushNotifications,
  markPushNotificationCancelled,
  markPushNotificationFailed,
  markPushNotificationSent,
  updateFcmToken,
} from '../../packages/server/src/db.js';
import { sendPush } from '../../packages/server/src/push-client.js';

const BATCH_SIZE = 80;

function toStringData(data: Record<string, unknown>, id: string, type: string): Record<string, string> {
  const out: Record<string, string> = {
    notificationId: id,
    type,
  };
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    out[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  return out;
}

function retryTimeForAttempt(attempt: number): string {
  const minutes = Math.min(60, Math.max(1, attempt * attempt * 2));
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

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
    const jobs = await claimPendingPushNotifications(BATCH_SIZE);
    if (jobs.length === 0) {
      return res.status(200).json({ processed: 0, reason: 'no_pending' });
    }

    let sent = 0;
    let cancelled = 0;
    let retried = 0;
    let expired = 0;
    const errors: string[] = [];

    for (const job of jobs) {
      try {
        if (!job.push_notifications) {
          await markPushNotificationCancelled(job.id, 'push notifications disabled');
          cancelled++;
          continue;
        }

        if (!job.fcm_token) {
          await markPushNotificationCancelled(job.id, 'missing fcm token');
          cancelled++;
          continue;
        }

        const lang = job.preferred_language === 'en' ? 'en' : 'uk';
        const data = toStringData(job.data_json ?? {}, job.id, job.type);
        const link = typeof job.data_json?.link === 'string' ? job.data_json.link : `/?action=${encodeURIComponent(job.type)}`;
        const ok = await sendPush({
          fcmToken: job.fcm_token,
          title: lang === 'en' ? job.title_en : job.title_uk,
          body: lang === 'en' ? job.body_en : job.body_uk,
          data,
          link,
          tag: job.dedupe_key ?? `${job.type}-${job.id}`,
        });

        if (ok) {
          await markPushNotificationSent(job.id);
          sent++;
        } else {
          await updateFcmToken(job.player_id, null);
          await markPushNotificationCancelled(job.id, 'invalid fcm token');
          expired++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${job.id}: ${msg}`);
        await markPushNotificationFailed(job.id, msg, retryTimeForAttempt(job.attempts));
        retried++;
      }
    }

    return res.status(200).json({
      processed: jobs.length,
      sent,
      cancelled,
      retried,
      expired,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('[push-queue] Fatal error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
