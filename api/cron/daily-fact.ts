import type { VercelRequest, VercelResponse } from '@vercel/node';
import { saveMessage, getDailyContent, saveDailyContent, getAllPlayerIds } from '../../packages/server/src/db.js';
import { generateDailyFunFact } from '../../packages/server/src/gemini-client.js';

const BATCH_SIZE = 200;

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
    // Get or generate today's fun fact
    let factText: string;
    const existing = await getDailyContent('fun_fact');
    if (existing) {
      factText = existing.content_json;
    } else {
      factText = await generateDailyFunFact();
      await saveDailyContent('fun_fact', factText);
    }

    // Deliver to each player
    const allPlayerIds = await getAllPlayerIds();
    let delivered = 0;

    for (let i = 0; i < allPlayerIds.length; i += BATCH_SIZE) {
      const batch = allPlayerIds.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (pid) => {
          try {
            await saveMessage('system', 'A.S.T.R.A.', `system:${pid}`, factText);
            delivered++;
          } catch (err) {
            console.warn(`[daily-fact] Failed for ${pid}:`, err);
          }
        }),
      );
    }

    return res.status(200).json({ processed: delivered, total: allPlayerIds.length });
  } catch (err) {
    console.error('[daily-fact] Failed:', err);
    return res.status(200).json({ processed: 0, error: err instanceof Error ? err.message : 'Unknown' });
  }
}
