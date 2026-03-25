// Education / Academy types

export type TopicCategoryId =
  | 'astro'
  | 'astrophys'
  | 'plansci'
  | 'astrobio'
  | 'spacetech'
  | 'cosmo'
  | 'physfund';

export type DifficultyTier = 'explorer' | 'scientist';

export type QuestType =
  | 'knowledge'
  | 'observation'
  | 'exploration'
  | 'calculation'
  | 'photo';

export interface TopicCategory {
  id: TopicCategoryId;
  nameUk: string;
  nameEn: string;
  subcategories: TopicSubcategory[];
}

export interface TopicSubcategory {
  id: string;
  nameUk: string;
  nameEn: string;
  lessons: TopicLesson[];
}

export interface TopicLesson {
  id: string;
  nameUk: string;
  nameEn: string;
  gameTags: string[];
  prerequisites: string[];
}

export interface QuestCriteria {
  type: QuestType;
  spectralClass?: string;
  minHabitability?: number;
  planetType?: string;
  hasAtmosphere?: boolean;
  hasWater?: boolean;
  expectedAnswer?: { min: number; max: number; unit: string };
  starType?: string;
  readComplete?: boolean;
}

export interface EducationQuest {
  type: QuestType;
  titleUk: string;
  descriptionUk: string;
  criteria: QuestCriteria;
  quarkReward: number;
  xpReward: number;
}

export interface EducationQuiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  xpReward: number;
}

export interface DailyEducationPackage {
  date: string;
  lessonId: string;
  categoryId: TopicCategoryId;
  categoryNameUk: string;
  lessonNameUk: string;
  difficulty: DifficultyTier;
  lessonContent: string;
  lessonImageUrl?: string;
  quest: EducationQuest;
  quiz: EducationQuiz;
}

export interface ActiveQuest {
  lessonId: string;
  quest: EducationQuest;
  startedAt: string;
  completedAt?: string;
}

export interface CategoryProgressEntry {
  lessonsCompleted: number;
  quizzesCorrect: number;
  questsCompleted: number;
}

export interface AcademyProgress {
  playerId: string;
  difficulty: DifficultyTier;
  selectedTopics: TopicCategoryId[];
  completedLessons: Record<string, string>;
  activeQuest: ActiveQuest | null;
  questStreak: number;
  longestStreak: number;
  lastQuestDate: string | null;
  totalQuestsCompleted: number;
  totalQuizzesCorrect: number;
  totalQuizzesAnswered: number;
  categoryProgress: Record<TopicCategoryId, CategoryProgressEntry>;
  onboarded: boolean;
}
