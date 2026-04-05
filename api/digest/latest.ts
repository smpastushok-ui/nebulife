import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getLatestCompleteDigest } from '../../packages/server/src/db.js';

/**
 * GET /api/digest/latest
 * Returns the latest complete weekly digest with image URLs.
 * No auth required — digest images are public Vercel Blob URLs.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const digest = await getLatestCompleteDigest();
    if (!digest || !digest.images_json) {
      return res.status(200).json({ digest: null });
    }

    const images = JSON.parse(digest.images_json) as Record<string, string[]>;

    return res.status(200).json({
      digest: {
        weekDate: digest.week_date,
        images,
      },
    });
  } catch (err) {
    console.error('Digest latest error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
