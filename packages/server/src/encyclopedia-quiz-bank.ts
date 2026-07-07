import { readFile } from 'node:fs/promises';
import path from 'node:path';

type Language = 'uk' | 'en';

interface EncyclopediaIndexEntry {
  slug: string;
  language: Language;
  section: string;
  order: number;
  title: string;
  lessonUrl: string;
}

interface EncyclopediaIndex {
  lessons: EncyclopediaIndexEntry[];
}

interface EncyclopediaLesson {
  slug: string;
  language: Language;
  title: string;
  quiz: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
  }>;
}

export interface EncyclopediaQuiz {
  id: string;
  source: 'encyclopedia';
  section: string;
  lessonSlug: string;
  lessonTitle: string;
  questionIndex: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  xpReward: number;
}

const PUBLIC_ENCYCLOPEDIA_DIR = path.resolve(process.cwd(), 'packages/client/public/encyclopedia');
const quizBankCache = new Map<Language, Promise<EncyclopediaQuiz[]>>();

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function resolveLessonPath(lessonUrl: string): string | null {
  if (/^https?:\/\//i.test(lessonUrl)) return null;
  const relativePath = lessonUrl.replace(/^\/?encyclopedia\//, '').replace(/^\.\//, '');
  return path.join(PUBLIC_ENCYCLOPEDIA_DIR, relativePath);
}

async function loadQuizBankForLanguage(lang: Language): Promise<EncyclopediaQuiz[]> {
  const indexPath = path.join(PUBLIC_ENCYCLOPEDIA_DIR, 'index.json');
  const index = JSON.parse(await readFile(indexPath, 'utf8')) as EncyclopediaIndex;
  const entries = index.lessons
    .filter((entry) => entry.language === lang)
    .sort((a, b) => a.section.localeCompare(b.section) || a.order - b.order || a.slug.localeCompare(b.slug));

  const quizzes: EncyclopediaQuiz[] = [];
  for (const entry of entries) {
    const lessonPath = resolveLessonPath(entry.lessonUrl);
    if (!lessonPath) continue;

    try {
      const lesson = JSON.parse(await readFile(lessonPath, 'utf8')) as EncyclopediaLesson;
      for (const [questionIndex, quiz] of (lesson.quiz ?? []).entries()) {
        if (!quiz.question || !Array.isArray(quiz.options) || quiz.options.length !== 4) continue;
        if (!Number.isInteger(quiz.correctIndex) || quiz.correctIndex < 0 || quiz.correctIndex >= quiz.options.length) continue;

        quizzes.push({
          id: `encyclopedia:${lesson.slug}:${lang}:${questionIndex}`,
          source: 'encyclopedia',
          section: entry.section,
          lessonSlug: lesson.slug,
          lessonTitle: lesson.title || entry.title,
          questionIndex,
          question: quiz.question,
          options: quiz.options,
          correctIndex: quiz.correctIndex,
          explanation: quiz.explanation ?? '',
          xpReward: 50,
        });
      }
    } catch (err) {
      console.warn('[encyclopedia-quiz-bank] Failed to load lesson quiz', entry.lessonUrl, err);
    }
  }

  return quizzes;
}

export async function getEncyclopediaQuizBank(lang: Language): Promise<EncyclopediaQuiz[]> {
  const existing = quizBankCache.get(lang);
  if (existing) return existing;

  const promise = loadQuizBankForLanguage(lang);
  quizBankCache.set(lang, promise);
  return promise;
}

function topicIdToSection(topicId: string): string | null {
  if (topicId.startsWith('astro.')) return 'astronomy';
  if (topicId.startsWith('astrophys.')) return 'astrophysics';
  if (topicId.startsWith('cosmo.')) return 'cosmology';
  if (topicId.startsWith('plansci.')) return 'planetology';
  if (topicId.startsWith('astrobiology.') || topicId.startsWith('bio.')) return 'astrobiology';
  if (topicId.startsWith('space-tech.') || topicId.startsWith('tech.')) return 'space-tech';
  if (topicId.startsWith('crew.')) return 'crewed-missions';
  if (topicId.startsWith('robotic.')) return 'robotic-missions';
  if (topicId.startsWith('applied.')) return 'applied-space';
  return null;
}

function extractAnsweredSlugs(answeredQuizIds: Set<string>): Set<string> {
  const slugs = new Set<string>();
  for (const quizId of answeredQuizIds) {
    const match = /^encyclopedia:([^:]+):/.exec(quizId);
    if (match?.[1]) slugs.add(match[1]);
  }
  return slugs;
}

export async function selectEncyclopediaQuiz(params: {
  lang: Language;
  topicId: string;
  seed: string;
  answeredQuizIds: Set<string>;
  preferredQuizId?: string;
}): Promise<EncyclopediaQuiz> {
  const bank = await getEncyclopediaQuizBank(params.lang);
  if (bank.length === 0) throw new Error(`No encyclopedia quiz questions available for ${params.lang}`);

  // Honor the cached/preferred quiz only if THIS player hasn't answered it
  // yet. The lesson cache is shared across players, so the cached quiz may
  // already be in this player's answered set — returning it made the daily
  // quiz appear pre-answered and unplayable (player feedback bug).
  if (params.preferredQuizId && !params.answeredQuizIds.has(params.preferredQuizId)) {
    const preferred = bank.find((quiz) => quiz.id === params.preferredQuizId);
    if (preferred) return preferred;
  }

  const section = topicIdToSection(params.topicId);
  const sectionQuizzes = section ? bank.filter((quiz) => quiz.section === section) : [];

  const basePool = sectionQuizzes.length > 0 ? sectionQuizzes : bank;
  const answeredSlugs = extractAnsweredSlugs(params.answeredQuizIds);
  const freshLessonPool = basePool.filter((quiz) =>
    !params.answeredQuizIds.has(quiz.id) && !answeredSlugs.has(quiz.lessonSlug));
  const freshQuestionPool = basePool.filter((quiz) => !params.answeredQuizIds.has(quiz.id));
  const pool = freshLessonPool.length > 0 ? freshLessonPool : (freshQuestionPool.length > 0 ? freshQuestionPool : basePool);
  const index = stableHash(`${params.seed}:${params.topicId}:${params.lang}`) % pool.length;
  return pool[index];
}
