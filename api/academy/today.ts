import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { getAcademyProgress, getCachedLesson, saveCachedLesson, getPlayer, updateCachedLessonQuiz } from '../../packages/server/src/db.js';
import { generateEducationPackage, generateLessonImage } from '../../packages/server/src/education-generator.js';
import { selectEncyclopediaQuiz } from '../../packages/server/src/encyclopedia-quiz-bank.js';

// Use topic-catalog functions directly since @nebulife/core dist may not be up to date in worktree
import { selectNextLesson, getLastCompletedLessonId } from '../../packages/core/src/education/topic-selector.js';
import { findLesson } from '../../packages/core/src/education/topic-catalog.js';
import type { TopicCategoryId } from '../../packages/core/src/types/education.js';

type QuizAnswerRecord = {
  answerIndex: number;
  correct: boolean;
  correctIndex: number;
  explanation: string;
  answeredAt: string;
  quizId?: string;
};

type AcademyCategoryProgress = {
  __quiz_answers?: Record<string, QuizAnswerRecord>;
  [key: string]: unknown;
};

function getAnsweredQuizIds(categoryProgress: AcademyCategoryProgress): Set<string> {
  const answers = categoryProgress.__quiz_answers ?? {};
  const ids = Object.entries(answers).map(([lessonId, answer]) => answer.quizId ?? lessonId);
  return new Set(ids);
}

/**
 * GET /api/academy/today
 * Returns today's lesson package with lazy caching.
 * First request for a (topicId, difficulty) pair generates via Gemini.
 * Subsequent requests for the same pair return from DB cache.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    const progress = await getAcademyProgress(auth.playerId);
    if (!progress || !progress.onboarded) {
      return res.status(200).json({ lesson: null, needsOnboarding: true });
    }

    const player = await getPlayer(auth.playerId);
    const lang: 'uk' | 'en' = player?.preferred_language === 'en' ? 'en' : 'uk';

    const today = new Date().toISOString().slice(0, 10);
    const selectedTopics = (progress.selected_topics ?? []) as TopicCategoryId[];
    const completedLessons = (progress.completed_lessons ?? {}) as Record<string, string>;
    const categoryProgress = (progress.category_progress ?? {}) as AcademyCategoryProgress;
    const answeredQuizIds = getAnsweredQuizIds(categoryProgress);
    const lastLessonId = getLastCompletedLessonId(completedLessons);

    // Select next lesson for this player
    const nextLesson = selectNextLesson(selectedTopics, completedLessons, lastLessonId);
    if (!nextLesson) {
      return res.status(200).json({ lesson: null, allComplete: true });
    }

    const lessonInfo = findLesson(nextLesson.id);
    if (!lessonInfo) {
      return res.status(200).json({ lesson: null, error: 'Lesson not found in catalog' });
    }

    const topicName = lang === 'en' ? (nextLesson.nameEn ?? nextLesson.nameUk) : nextLesson.nameUk;
    const categoryName = lang === 'en'
      ? (lessonInfo.category.nameEn ?? lessonInfo.category.nameUk)
      : lessonInfo.category.nameUk;

    // Try to get from cache first (lazy caching, language-scoped)
    const cached = await getCachedLesson(today, nextLesson.id, progress.difficulty, lang);
    if (cached) {
      const cachedQuiz = cached.quiz_data as { id?: string };
      const quiz = await selectEncyclopediaQuiz({
        lang,
        topicId: nextLesson.id,
        seed: today,
        answeredQuizIds,
        preferredQuizId: cachedQuiz.id,
      });
      if (cachedQuiz.id !== quiz.id) {
        await updateCachedLessonQuiz(today, nextLesson.id, progress.difficulty, lang, quiz);
      }
      return res.status(200).json({
        lesson: {
          date: today,
          lessonId: cached.topic_id,
          categoryId: lessonInfo.category.id,
          categoryNameUk: lessonInfo.category.nameUk,
          categoryNameEn: lessonInfo.category.nameEn,
          lessonNameUk: nextLesson.nameUk,
          lessonNameEn: nextLesson.nameEn,
          difficulty: cached.difficulty,
          lessonContent: cached.lesson_content,
          lessonImageUrl: cached.lesson_image_url,
          quest: cached.quest_data,
          quiz,
          language: lang,
        },
      });
    }

    // Generate via Gemini (first request for this topicId + difficulty + lang today)
    const generated = await generateEducationPackage(
      nextLesson.id,
      topicName,
      categoryName,
      progress.difficulty as 'explorer' | 'scientist',
      lang,
    );
    const quiz = await selectEncyclopediaQuiz({
      lang,
      topicId: nextLesson.id,
      seed: today,
      answeredQuizIds,
    });

    // Generate lesson image via Gemini image model (non-blocking — null on failure)
    const lessonImageUrl = generated.imagePrompt
      ? await generateLessonImage(generated.imagePrompt)
      : null;

    // Cache in DB (including image URL if generated, language-scoped)
    await saveCachedLesson(
      today,
      nextLesson.id,
      progress.difficulty,
      generated.lessonContent,
      lessonImageUrl,
      generated.quest,
      quiz,
      lang,
    );

    return res.status(200).json({
      lesson: {
        date: today,
        lessonId: nextLesson.id,
        categoryId: lessonInfo.category.id,
        categoryNameUk: lessonInfo.category.nameUk,
        categoryNameEn: lessonInfo.category.nameEn,
        lessonNameUk: nextLesson.nameUk,
        lessonNameEn: nextLesson.nameEn,
        difficulty: progress.difficulty,
        lessonContent: generated.lessonContent,
        lessonImageUrl,
        quest: generated.quest,
        quiz,
        language: lang,
      },
    });
  } catch (err) {
    console.error('[academy/today]', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
