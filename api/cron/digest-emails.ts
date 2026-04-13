import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getDigestPendingEmails,
  getDigestEmailRecipients,
  markDigestEmailsSent,
} from '../../packages/server/src/db.js';
import { sendDigestEmail } from '../../packages/server/src/email-client.js';
import { DIGEST_LANGUAGES } from '@nebulife/core';

/**
 * GET /api/cron/digest-emails
 * Runs every 5 minutes.
 * Finds the latest complete digest that hasn't had emails sent,
 * sends email to all eligible players, then marks emails_sent = TRUE.
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
    const digest = await getDigestPendingEmails();
    if (!digest || !digest.images_json) {
      return res.status(200).json({ processed: 0, reason: 'no_pending' });
    }

    const images = JSON.parse(digest.images_json) as Record<string, string[]>;
    let totalSent = 0;
    const errors: string[] = [];

    for (const lang of DIGEST_LANGUAGES) {
      const imageUrls = images[lang] ?? [];
      if (imageUrls.length === 0) continue;

      const recipients = await getDigestEmailRecipients(lang);
      for (const player of recipients) {
        if (!player.email) continue;
        try {
          await sendDigestEmail({
            to: player.email,
            playerName: player.name,
            playerId: player.id,
            lang,
            weekDate: digest.week_date,
            imageUrls,
          });
          totalSent++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${player.id}: ${msg}`);
          console.error(`[digest-emails] Failed for ${player.id}:`, err);
        }
      }
    }

    if (totalSent > 0) {
      await markDigestEmailsSent(digest.week_date);
    }
    console.log(`[digest-emails] Sent ${totalSent} emails for ${digest.week_date}`);

    return res.status(200).json({
      processed: totalSent,
      weekDate: digest.week_date,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('[digest-emails] Fatal error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown' });
  }
}
