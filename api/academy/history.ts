import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { getAcademyProgress } from '../../packages/server/src/db.js';

/**
 * GET /api/academy/history
 * Returns completed lessons history for the player.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    const progress = await getAcademyProgress(auth.playerId);
    if (!progress) return res.status(200).json({ history: [] });

    const completed = (progress.completed_lessons ?? {}) as Record<string, string>;

    // Convert to sorted array
    const history = Object.entries(completed)
      .map(([lessonId, date]) => ({ lessonId, date }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return res.status(200).json({
      history,
      stats: {
        totalQuests: progress.total_quests_completed,
        totalQuizzesCorrect: progress.total_quizzes_correct,
        totalQuizzesAnswered: progress.total_quizzes_answered,
        questStreak: progress.quest_streak,
        longestStreak: progress.longest_streak,
      },
    });
  } catch (err) {
    console.error('[academy/history]', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
