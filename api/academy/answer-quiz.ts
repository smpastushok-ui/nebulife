import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { getAcademyProgress, updateAcademyProgress, getCachedLesson, updatePlayer, getPlayer } from '../../packages/server/src/db.js';

/**
 * POST /api/academy/answer-quiz
 * Body: { lessonId: string, answerIndex: number }
 * Validates quiz answer and awards XP.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    const { lessonId, answerIndex } = req.body ?? {};
    if (!lessonId || typeof answerIndex !== 'number') {
      return res.status(400).json({ error: 'lessonId and answerIndex required' });
    }

    const progress = await getAcademyProgress(auth.playerId);
    if (!progress) return res.status(404).json({ error: 'No academy progress' });

    // Get cached lesson to check correct answer
    const today = new Date().toISOString().slice(0, 10);
    const lesson = await getCachedLesson(today, lessonId, progress.difficulty);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found in cache' });
    }

    const quizData = lesson.quiz_data as { correctIndex: number; explanation: string };
    const isCorrect = answerIndex === quizData.correctIndex;

    // Update stats
    const totalAnswered = (progress.total_quizzes_answered ?? 0) + 1;
    const totalCorrect = (progress.total_quizzes_correct ?? 0) + (isCorrect ? 1 : 0);
    await updateAcademyProgress(auth.playerId, {
      total_quizzes_answered: totalAnswered,
      total_quizzes_correct: totalCorrect,
    });

    // Award XP for correct answer
    let xpAwarded = 0;
    let quarksAwarded = 0;
    if (isCorrect) {
      xpAwarded = 50;
      quarksAwarded = 2;
      const player = await getPlayer(auth.playerId);
      if (player) {
        await updatePlayer(auth.playerId, { science_points: (player.science_points ?? 0) + xpAwarded });
      }
      const { creditQuarks } = await import('../../packages/server/src/db.js');
      await creditQuarks(auth.playerId, quarksAwarded);
    }

    return res.status(200).json({
      correct: isCorrect,
      correctIndex: quizData.correctIndex,
      explanation: quizData.explanation,
      xpAwarded,
      quarksAwarded,
    });
  } catch (err) {
    console.error('[academy/answer-quiz]', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
