import type { VercelRequest, VercelResponse } from '@vercel/node';
import { saveMessage, getDailyContent, saveDailyContent, getAllPlayerIds } from '../../packages/server/src/db.js';
import { generateDailyQuiz } from '../../packages/server/src/gemini-client.js';

const BATCH_SIZE = 200;

/**
 * GET /api/cron/daily-quiz
 * Runs daily at 09:00 UTC.
 * Generates a space quiz via Gemini and delivers it to each player's astra channel.
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
    // Dedup: skip if today's quiz already exists
    const existing = await getDailyContent('quiz');
    if (existing) {
      return res.status(200).json({ processed: 0, reason: 'already_delivered' });
    }

    const quizJson = await generateDailyQuiz();
    await saveDailyContent('quiz', quizJson);

    // Deliver to each player's astra channel
    const allPlayerIds = await getAllPlayerIds();
    let delivered = 0;

    for (let i = 0; i < allPlayerIds.length; i += BATCH_SIZE) {
      const batch = allPlayerIds.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (pid) => {
          try {
            await saveMessage('system', 'A.S.T.R.A.', `astra:${pid}`, quizJson);
            delivered++;
          } catch (err) {
            console.warn(`[daily-quiz] Failed for ${pid}:`, err);
          }
        }),
      );
    }

    return res.status(200).json({ processed: delivered, total: allPlayerIds.length });
  } catch (err) {
    console.error('[daily-quiz] Failed:', err);
    return res.status(200).json({ processed: 0, error: err instanceof Error ? err.message : 'Unknown' });
  }
}
