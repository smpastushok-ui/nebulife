import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUpcomingCosmicEvents } from '../../packages/server/src/db.js';

/**
 * GET /api/events/upcoming
 * Returns upcoming cosmic events (soonest first) for the orbital telescope /
 * observatory. No auth required — event imagery is public Vercel Blob.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rows = await getUpcomingCosmicEvents(10);
    const events = rows.map((r) => ({
      id: String(r.id),
      titleUk: r.title_uk,
      titleEn: r.title_en,
      descriptionUk: r.description_uk,
      descriptionEn: r.description_en,
      eventTime: new Date(r.event_time).getTime(),
      photoUrl: r.photo_url,
      videoUrl: r.video_url,
    }));
    return res.status(200).json({ events });
  } catch (err) {
    console.error('Upcoming events error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
