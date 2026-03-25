import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { createAcademyProgress } from '../../packages/server/src/db.js';

/**
 * POST /api/academy/onboard
 * Body: { difficulty: 'explorer'|'scientist', selectedTopics: string[] }
 * Creates academy_progress row for the player.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    const { difficulty = 'explorer', selectedTopics = [] } = req.body ?? {};
    if (difficulty !== 'explorer' && difficulty !== 'scientist') {
      return res.status(400).json({ error: 'Invalid difficulty' });
    }

    await createAcademyProgress(auth.playerId, difficulty, selectedTopics);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[academy/onboard]', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
