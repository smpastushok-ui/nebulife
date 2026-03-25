// ---------------------------------------------------------------------------
// Academy API — Client-side wrapper
// ---------------------------------------------------------------------------

import { authFetch } from '../auth/api-client.js';

export interface AcademyProgress {
  player_id: string;
  difficulty: string;
  selected_topics: string[];
  completed_lessons: Record<string, string>;
  active_quest: unknown;
  quest_streak: number;
  longest_streak: number;
  last_quest_date: string | null;
  total_quests_completed: number;
  total_quizzes_correct: number;
  total_quizzes_answered: number;
  category_progress: Record<string, unknown>;
  onboarded: boolean;
}

export interface DailyLesson {
  date: string;
  lessonId: string;
  categoryId: string;
  categoryNameUk: string;
  lessonNameUk: string;
  difficulty: string;
  lessonContent: string;
  lessonImageUrl: string | null;
  quest: {
    type: string;
    titleUk: string;
    descriptionUk: string;
    criteria: Record<string, unknown>;
    quarkReward: number;
    xpReward: number;
  };
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    xpReward: number;
  };
}

export async function getAcademyProgress(): Promise<AcademyProgress | null> {
  const res = await authFetch('/api/academy/progress');
  if (!res.ok) return null;
  const data = await res.json();
  return data.progress ?? null;
}

export async function academyOnboard(
  difficulty: 'explorer' | 'scientist',
  selectedTopics: string[],
): Promise<boolean> {
  const res = await authFetch('/api/academy/onboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ difficulty, selectedTopics }),
  });
  return res.ok;
}

export async function updatePreferences(
  difficulty?: 'explorer' | 'scientist',
  selectedTopics?: string[],
): Promise<boolean> {
  const res = await authFetch('/api/academy/preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ difficulty, selectedTopics }),
  });
  return res.ok;
}

export async function getTodayLesson(): Promise<{
  lesson: DailyLesson | null;
  needsOnboarding?: boolean;
  allComplete?: boolean;
}> {
  const res = await authFetch('/api/academy/today');
  if (!res.ok) return { lesson: null };
  return await res.json();
}

export async function completeLesson(lessonId: string): Promise<{
  ok: boolean;
  quarksAwarded?: number;
  xpAwarded?: number;
}> {
  const res = await authFetch('/api/academy/complete-lesson', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lessonId }),
  });
  return await res.json();
}

export async function completeQuest(
  lessonId: string,
  calculationAnswer?: number,
): Promise<{
  ok?: boolean;
  correct: boolean;
  quarksAwarded?: number;
  xpAwarded?: number;
  streak?: number;
  streakBonus?: number;
  message?: string;
}> {
  const res = await authFetch('/api/academy/complete-quest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lessonId, calculationAnswer }),
  });
  return await res.json();
}

export async function answerQuiz(
  lessonId: string,
  answerIndex: number,
): Promise<{
  correct: boolean;
  correctIndex: number;
  explanation: string;
  xpAwarded: number;
  quarksAwarded: number;
}> {
  const res = await authFetch('/api/academy/answer-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lessonId, answerIndex }),
  });
  return await res.json();
}

export async function shareNotify(fromPlayerName: string, lessonTitle: string): Promise<void> {
  try {
    await authFetch('/api/academy/share-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromPlayerName, lessonTitle }),
    });
  } catch {
    // Silent fail — notification is best-effort
  }
}

export async function getAcademyHistory(): Promise<{
  history: Array<{ lessonId: string; date: string }>;
  stats: {
    totalQuests: number;
    totalQuizzesCorrect: number;
    totalQuizzesAnswered: number;
    questStreak: number;
    longestStreak: number;
  };
}> {
  const res = await authFetch('/api/academy/history');
  if (!res.ok) return { history: [], stats: { totalQuests: 0, totalQuizzesCorrect: 0, totalQuizzesAnswered: 0, questStreak: 0, longestStreak: 0 } };
  return await res.json();
}
