import type { VercelRequest, VercelResponse } from '@vercel/node';
import { saveMessage, getOnboardedPlayersWithLanguage } from '../../packages/server/src/db.js';

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
    const players = await getOnboardedPlayersWithLanguage();
    let delivered = 0;

    for (let i = 0; i < players.length; i += BATCH_SIZE) {
      const batch = players.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async ({ player_id, language }) => {
          try {
            const notifText = language === 'en'
              ? 'New Cosmic Academy lesson available. Open the Academy to learn.'
              : 'Новий урок Космічної Академії доступний. Відкрийте Академію для навчання.';
            await saveMessage('system', 'A.S.T.R.A.', `system:${player_id}`, notifText);
            delivered++;
          } catch (err) {
            console.warn(`[daily-lesson] Failed for ${player_id}:`, err);
          }
        }),
      );
    }

    return res.status(200).json({ processed: delivered, total: players.length });
  } catch (err) {
    console.error('[daily-lesson] Failed:', err);
    return res.status(200).json({ processed: 0, error: err instanceof Error ? err.message : 'Unknown' });
  }
}
