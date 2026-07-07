import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, listSagaChapters, RATE_LIMITS } from '@nebulife/server';

/**
 * GET /api/saga/list
 *
 * Auth: Bearer token (Firebase)
 * Returns every chapter written so far for this player, oldest first (the
 * reader assigns roman numerals in this order).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await authenticate(req, res);
  if (!auth) return;

  if (!await RATE_LIMITS.poll(auth.playerId)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  try {
    const chapters = await listSagaChapters(auth.playerId);
    return res.status(200).json({
      chapters: chapters.map((c) => ({
        id: c.id,
        milestoneType: c.milestone_type,
        title: c.title,
        bodyText: c.body_text,
        imageUrl: c.image_url,
        language: c.language,
        createdAt: c.created_at,
      })),
    });
  } catch (err) {
    console.error('[saga/list] Error:', err);
    const message = err instanceof Error ? err.message : 'Failed to load saga chapters';
    const isDbMigrationError = message.includes('saga_chapters') || message.includes('relation') || message.includes('does not exist');
    if (isDbMigrationError) return res.status(200).json({ chapters: [] });
    return res.status(500).json({ error: 'Failed to load saga chapters' });
  }
}
