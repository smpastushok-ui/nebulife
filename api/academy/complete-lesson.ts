import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { getAcademyProgress, updateAcademyProgress, creditQuarks, updatePlayer, getPlayer } from '../../packages/server/src/db.js';

/**
 * POST /api/academy/complete-lesson
 * Body: { lessonId: string }
 * Marks a lesson as read and awards 1 quark + 10 XP.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    const { lessonId } = req.body ?? {};
    if (!lessonId || typeof lessonId !== 'string') {
      return res.status(400).json({ error: 'lessonId required' });
    }

    const progress = await getAcademyProgress(auth.playerId);
    if (!progress) return res.status(404).json({ error: 'No academy progress' });

    const completed = (progress.completed_lessons ?? {}) as Record<string, string>;
    if (completed[lessonId]) {
      return res.status(200).json({ ok: true, alreadyCompleted: true });
    }

    // Mark lesson complete
    const today = new Date().toISOString().slice(0, 10);
    completed[lessonId] = today;
    await updateAcademyProgress(auth.playerId, { completed_lessons: completed });

    // Award 1 quark + 10 XP
    await creditQuarks(auth.playerId, 1);
    const player = await getPlayer(auth.playerId);
    if (player) {
      await updatePlayer(auth.playerId, { science_points: (player.science_points ?? 0) + 10 });
    }

    return res.status(200).json({ ok: true, quarksAwarded: 1, xpAwarded: 10 });
  } catch (err) {
    console.error('[academy/complete-lesson]', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
