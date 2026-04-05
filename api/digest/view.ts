import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getWeeklyDigest, getLatestCompleteDigest } from '../../packages/server/src/db.js';

/**
 * GET /api/digest/view?week=2026-04-07
 * Returns digest images for a specific week date.
 * If no week param — returns latest complete digest.
 * No auth required — public endpoint for sharing.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const weekDate = req.query.week as string | undefined;

    let digest;
    if (weekDate) {
      digest = await getWeeklyDigest(weekDate);
    } else {
      digest = await getLatestCompleteDigest();
    }

    if (!digest || digest.status !== 'complete' || !digest.images_json) {
      return res.status(200).json({ digest: null });
    }

    const images = JSON.parse(digest.images_json) as Record<string, string[]>;

    return res.status(200).json({
      digest: {
        weekDate: digest.week_date,
        status: digest.status,
        images,
        createdAt: digest.created_at,
      },
    });
  } catch (err) {
    console.error('[digest/view] Error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
