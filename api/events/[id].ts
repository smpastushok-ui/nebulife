import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCosmicEventById } from '@nebulife/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const id = typeof req.query.id === 'string' ? req.query.id : '';
  if (!/^\d{1,20}$/.test(id)) return res.status(400).json({ error: 'invalid_event_id' });

  const row = await getCosmicEventById(id);
  if (!row) return res.status(404).json({ error: 'event_not_found' });
  return res.status(200).json({
    event: {
      id: String(row.id),
      titleUk: row.title_uk,
      titleEn: row.title_en,
      descriptionUk: row.description_uk,
      descriptionEn: row.description_en,
      eventTime: new Date(row.event_time).getTime(),
      photoUrl: row.photo_url,
      videoUrl: row.video_url,
    },
  });
}
