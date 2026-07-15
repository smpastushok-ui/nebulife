import type { VercelRequest, VercelResponse } from '@vercel/node';
import { saveMessageOnce, getDailyContent, getRecentDailyContent, saveDailyContent, getAllPlayerIds } from '../../packages/server/src/db.js';
import { generateDailyQuiz } from '../../packages/server/src/gemini-client.js';
import { buildDailyContentHistory, dailyDeliveryKey } from '../../packages/server/src/daily-content-generator.js';

const BATCH_SIZE = 200;
// Cooldown window: how many past days of quizzes are checked for exact/near
// duplicates before accepting a new one. 1 row/day, so 180 days is ~6
// months of history — generous anti-repeat coverage at negligible DB cost.
const QUIZ_HISTORY_WINDOW_DAYS = 180;

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
    const today = new Date().toISOString().slice(0, 10);
    let quizJson: string;
    let source: 'gemini' | 'fallback' | 'cached' = 'cached';

    // Reuse today's canonical row when present, but still run idempotent
    // per-player delivery. This lets a retry fill players missed by a partial
    // prior run without giving anyone a duplicate message.
    const existing = await getDailyContent('quiz');
    if (existing) {
      quizJson = existing.content_json;
    } else {
      const recentQuizzes = await getRecentDailyContent('quiz', QUIZ_HISTORY_WINDOW_DAYS);
      const history = buildDailyContentHistory('quiz', recentQuizzes);
      const generated = await generateDailyQuiz({ date: today, history });
      const canonical = await saveDailyContent('quiz', generated.contentJson, generated.fingerprint, generated.keyTerms);
      quizJson = canonical.content_json;
      source = generated.source;
    }

    // Deliver to each player's astra channel
    const allPlayerIds = await getAllPlayerIds();
    let delivered = 0;

    for (let i = 0; i < allPlayerIds.length; i += BATCH_SIZE) {
      const batch = allPlayerIds.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (pid) => {
          try {
            const row = await saveMessageOnce(
              'system',
              'A.S.T.R.A.',
              `astra:${pid}`,
              quizJson,
              dailyDeliveryKey('quiz', today, pid),
            );
            if (row) delivered++;
          } catch (err) {
            console.warn(`[daily-quiz] Failed for ${pid}:`, err);
          }
        }),
      );
    }

    return res.status(200).json({ processed: delivered, total: allPlayerIds.length, source });
  } catch (err) {
    // Genuine generation/delivery failure (e.g. Gemini quota/model error) —
    // return 500 so Vercel's cron monitoring can actually flag it. Returning
    // 200 here previously meant this could fail silently every single day.
    console.error('[daily-quiz] Failed:', err);
    return res.status(500).json({ processed: 0, error: err instanceof Error ? err.message : 'Unknown' });
  }
}
