import type { VercelRequest, VercelResponse } from '@vercel/node';
import { saveMessage, getDailyContent, saveDailyContent } from '../../packages/server/src/db.js';
import { generateDailyQuiz } from '../../packages/server/src/gemini-client.js';

/**
 * GET /api/cron/daily-quiz
 * Runs daily at 09:00 UTC.
 * Generates a space quiz via Gemini and posts it to global chat.
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
    await saveMessage('system', 'A.S.T.R.A.', 'global', quizJson);

    return res.status(200).json({ processed: 1 });
  } catch (err) {
    console.error('[daily-quiz] Failed:', err);
    return res.status(200).json({ processed: 0, error: err instanceof Error ? err.message : 'Unknown' });
  }
}
