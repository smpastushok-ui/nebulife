import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getWeeklyDigest, getLatestCompleteDigest, saveMessage, getPlayersRegisteredBefore } from '../../packages/server/src/db.js';

const BATCH_SIZE = 200;

/**
 * POST /api/digest/send
 * Body: { weekDate?: string }
 * Manually sends a digest notification to ALL players.
 * If weekDate is provided, sends that specific digest.
 * Otherwise sends the latest complete digest.
 * Protected by CRON_SECRET.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization ?? '';
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { weekDate } = req.body ?? {};

    let digest;
    if (weekDate) {
      digest = await getWeeklyDigest(weekDate);
    } else {
      digest = await getLatestCompleteDigest();
    }

    if (!digest) {
      return res.status(200).json({ sent: 0, reason: 'no_digest_found' });
    }

    if (digest.status !== 'complete' || !digest.images_json) {
      return res.status(200).json({ sent: 0, reason: 'digest_not_complete', status: digest.status });
    }

    // Send notification to all players
    const digestMsg = JSON.stringify({
      type: 'digest',
      weekDate: digest.week_date,
    });

    const playerIds = await getPlayersRegisteredBefore(digest.created_at);
    let sent = 0;

    for (let i = 0; i < playerIds.length; i += BATCH_SIZE) {
      const batch = playerIds.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (pid) => {
          try {
            await saveMessage('system', 'NEBULIFE', `astra:${pid}`, digestMsg);
            sent++;
          } catch (err) {
            console.warn(`[digest/send] Failed notify ${pid}:`, err);
          }
        }),
      );
    }

    console.log(`[digest/send] Sent digest ${digest.week_date} to ${sent}/${playerIds.length} players`);
    return res.status(200).json({ sent, total: playerIds.length, weekDate: digest.week_date });
  } catch (err) {
    console.error('[digest/send] Failed:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
