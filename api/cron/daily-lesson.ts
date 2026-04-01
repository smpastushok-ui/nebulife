import type { VercelRequest, VercelResponse } from '@vercel/node';
import { saveMessage, getOnboardedPlayerIds } from '../../packages/server/src/db.js';

const BATCH_SIZE = 200;

/**
 * GET /api/cron/daily-lesson
 * Runs daily at 11:00 UTC.
 * Sends notification to each onboarded player about the new lesson.
 * Does NOT generate lesson content (lazy caching handles that in /api/academy/today).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization ?? '';
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const playerIds = await getOnboardedPlayerIds();
    let delivered = 0;

    const notifText = 'Новий урок Космічної Академії доступний. Відкрийте Академію для навчання.';

    for (let i = 0; i < playerIds.length; i += BATCH_SIZE) {
      const batch = playerIds.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (pid) => {
          try {
            await saveMessage('system', 'A.S.T.R.A.', `astra:${pid}`, notifText);
            delivered++;
          } catch (err) {
            console.warn(`[daily-lesson] Failed for ${pid}:`, err);
          }
        }),
      );
    }

    return res.status(200).json({ processed: delivered, total: playerIds.length });
  } catch (err) {
    console.error('[daily-lesson] Failed:', err);
    return res.status(200).json({ processed: 0, error: err instanceof Error ? err.message : 'Unknown' });
  }
}
