import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getWeeklyDigest, saveWeeklyDigest } from '../../packages/server/src/db.js';
import { generateWeeklyNewsText, getCurrentWeekMonday } from '../../packages/server/src/digest-generator.js';

/**
 * GET /api/cron/weekly-digest
 * Runs Monday 08:00 UTC.
 * Generates 15 space news items via gemini-3-flash-preview and stores in DB.
 * Images are generated separately by digest-images cron.
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
    const weekDate = getCurrentWeekMonday();

    // Dedup check
    const existing = await getWeeklyDigest(weekDate);
    if (existing) {
      return res.status(200).json({ processed: 0, reason: 'already_exists' });
    }

    // Generate news text
    const news = await generateWeeklyNewsText();
    await saveWeeklyDigest(weekDate, JSON.stringify(news));

    console.log(`[weekly-digest] Generated ${news.length} news items for ${weekDate}`);
    return res.status(200).json({ processed: news.length, weekDate });
  } catch (err) {
    console.error('[weekly-digest] Failed:', err);
    return res.status(500).json({ processed: 0, error: err instanceof Error ? err.message : 'Unknown' });
  }
}
