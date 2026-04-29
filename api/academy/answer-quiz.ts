import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { getAcademyProgress, updateAcademyProgress, getCachedLesson, updatePlayer, getPlayer } from '../../packages/server/src/db.js';

interface QuizAnswerRecord {
  answerIndex: number;
  correct: boolean;
  correctIndex: number;
  explanation: string;
  answeredAt: string;
}

interface AcademyCategoryProgress {
  __quiz_answers?: Record<string, QuizAnswerRecord>;
  [key: string]: unknown;
}

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

    const categoryProgress = (progress.category_progress ?? {}) as AcademyCategoryProgress;
    const quizAnswers = categoryProgress.__quiz_answers ?? {};
    const existingAnswer = quizAnswers[lessonId];
    if (existingAnswer) {
      return res.status(200).json({
        correct: existingAnswer.correct,
        correctIndex: existingAnswer.correctIndex,
        explanation: existingAnswer.explanation,
        xpAwarded: 0,
        quarksAwarded: 0,
        answerIndex: existingAnswer.answerIndex,
        answeredAt: existingAnswer.answeredAt,
        alreadyAnswered: true,
      });
    }

    const player = await getPlayer(auth.playerId);
    const lang: 'uk' | 'en' = player?.preferred_language === 'en' ? 'en' : 'uk';

    // Get cached lesson to check correct answer
    const today = new Date().toISOString().slice(0, 10);
    const lesson = await getCachedLesson(today, lessonId, progress.difficulty, lang);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found in cache' });
    }

    const quizData = lesson.quiz_data as { correctIndex: number; explanation: string };
    const isCorrect = answerIndex === quizData.correctIndex;

    // Update stats
    const totalAnswered = (progress.total_quizzes_answered ?? 0) + 1;
    const totalCorrect = (progress.total_quizzes_correct ?? 0) + (isCorrect ? 1 : 0);
    const answerRecord: QuizAnswerRecord = {
      answerIndex,
      correct: isCorrect,
      correctIndex: quizData.correctIndex,
      explanation: quizData.explanation,
      answeredAt: new Date().toISOString(),
    };

    await updateAcademyProgress(auth.playerId, {
      total_quizzes_answered: totalAnswered,
      total_quizzes_correct: totalCorrect,
      category_progress: {
        ...categoryProgress,
        __quiz_answers: {
          ...quizAnswers,
          [lessonId]: answerRecord,
        },
      },
    });

    // Award XP for correct answer
    let xpAwarded = 0;
    let quarksAwarded = 0;
    if (isCorrect) {
      xpAwarded = 50;
      quarksAwarded = 2;
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
      answerIndex,
      answeredAt: answerRecord.answeredAt,
      alreadyAnswered: false,
    });
  } catch (err) {
    console.error('[academy/answer-quiz]', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
