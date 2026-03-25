import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { updateAcademyProgress } from '../../packages/server/src/db.js';

/**
 * POST /api/academy/preferences
 * Body: { difficulty?: 'explorer'|'scientist', selectedTopics?: string[] }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    const { difficulty, selectedTopics } = req.body ?? {};
    const updates: Record<string, unknown> = {};

    if (difficulty === 'explorer' || difficulty === 'scientist') {
      updates.difficulty = difficulty;
    }
    if (Array.isArray(selectedTopics)) {
      updates.selected_topics = selectedTopics;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    await updateAcademyProgress(auth.playerId, updates);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[academy/preferences]', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
