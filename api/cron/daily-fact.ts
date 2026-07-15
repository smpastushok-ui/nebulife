import type { VercelRequest, VercelResponse } from '@vercel/node';
import { saveMessageOnce, getDailyContent, getRecentDailyContent, saveDailyContent, getAllPlayerIds } from '../../packages/server/src/db.js';
import { generateDailyFunFact } from '../../packages/server/src/gemini-client.js';
import { buildDailyContentHistory, dailyDeliveryKey } from '../../packages/server/src/daily-content-generator.js';

const BATCH_SIZE = 200;
// Cooldown window for the fingerprint dedup check (separate from the
// smaller "recent facts" text hint sent to the prompt — see gemini-client).
const FACT_HISTORY_WINDOW_DAYS = 120;

/**
 * GET /api/cron/daily-fact
 * Runs daily at 10:00 UTC.
 * Generates one fun fact via Gemini and delivers to each player's system channel.
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
    // Get or generate today's fun fact
    let factText: string;
    let source: 'gemini' | 'fallback' | 'cached' = 'cached';
    const existing = await getDailyContent('fun_fact');
    if (existing) {
      factText = existing.content_json;
    } else {
      const recentRows = await getRecentDailyContent('fun_fact', FACT_HISTORY_WINDOW_DAYS);
      const history = buildDailyContentHistory('fun_fact', recentRows);
      const generated = await generateDailyFunFact({
        date: today,
        recentFacts: recentRows,
        history,
      });
      const canonical = await saveDailyContent('fun_fact', generated.contentJson, generated.fingerprint, generated.keyTerms);
      factText = canonical.content_json;
      source = generated.source;
    }

    // Deliver to each player
    const allPlayerIds = await getAllPlayerIds();
    let delivered = 0;

    for (let i = 0; i < allPlayerIds.length; i += BATCH_SIZE) {
      const batch = allPlayerIds.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (pid) => {
          try {
            const row = await saveMessageOnce(
              'system',
              'A.S.T.R.A.',
              `astra:${pid}`,
              factText,
              dailyDeliveryKey('fun_fact', today, pid),
            );
            if (row) delivered++;
          } catch (err) {
            console.warn(`[daily-fact] Failed for ${pid}:`, err);
          }
        }),
      );
    }

    return res.status(200).json({ processed: delivered, total: allPlayerIds.length, source });
  } catch (err) {
    // Genuine generation/delivery failure (e.g. Gemini quota/model error) —
    // return 500 so Vercel's cron monitoring can actually flag it. Returning
    // 200 here previously meant this could fail silently every single day.
    console.error('[daily-fact] Failed:', err);
    return res.status(500).json({ processed: 0, error: err instanceof Error ? err.message : 'Unknown' });
  }
}
