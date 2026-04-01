import { GoogleGenAI } from '@google/genai';
import { put } from '@vercel/blob';

const LESSON_MODEL = 'gemini-3.1-flash-lite-preview';
const IMAGE_MODEL = 'gemini-3.1-flash-image-preview';

export interface GeneratedLesson {
  lessonContent: string;
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
  imagePrompt?: string;
}

/**
 * Generate a daily education package (lesson + quest + quiz) via Gemini.
 */
export async function generateEducationPackage(
  topicId: string,
  topicNameUk: string,
  categoryNameUk: string,
  difficulty: 'explorer' | 'scientist',
  language: string = 'uk',
): Promise<GeneratedLesson> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY must be set');

  const langLabel = language === 'en' ? 'English' : 'Українська';

  const difficultyDesc = difficulty === 'explorer'
    ? 'Дослідник (простий, з аналогіями та порівняннями, зрозумілий підліткам 12+)'
    : 'Науковець (технічний, з формулами та точними числами, для дорослих)';

  const prompt = `Ти A.S.T.R.A. — бортовий ШІ космічної гри Nebulife.
Сьогоднішній урок: "${topicNameUk}" (категорія: ${categoryNameUk})
Рівень складності: ${difficultyDesc}
Мова: ${langLabel}

Згенеруй навчальний пакет у форматі JSON:
{
  "lesson": "3-5 абзаців тексту уроку. Починай з 'Командоре, сьогодні вивчаємо...' Текст має бути науково достовірним, цікавим та лаконічним. Без емодзі.",
  "quest": {
    "type": "observation",
    "titleUk": "Коротка назва квесту (5-8 слів)",
    "descriptionUk": "Детальний опис завдання для гравця (1-2 речення)",
    "criteria": {
      "type": "observation",
      "spectralClass": "G"
    },
    "quarkReward": 1,
    "xpReward": 30
  },
  "quiz": {
    "question": "Запитання по темі уроку (1 речення)",
    "options": ["Варіант A", "Варіант B", "Варіант C", "Варіант D"],
    "correctIndex": 0,
    "explanation": "Коротке пояснення правильної відповіді (1-2 речення)",
    "xpReward": 50
  },
  "imagePrompt": "English prompt for sci-fi educational illustration of this topic (10-20 words, realistic style)"
}

Правила для типу квесту (обери найдоречніший):
- "knowledge": прочитати урок. criteria: {"type":"knowledge","readComplete":true}
- "observation": знайти зірку певного класу. criteria: {"type":"observation","spectralClass":"O"|"B"|"A"|"F"|"G"|"K"|"M"}
- "exploration": знайти планету з умовами. criteria: {"type":"exploration","minHabitability":0.5} або {"type":"exploration","planetType":"rocky","hasWater":true}
- "calculation": обчислити фізичну величину. criteria: {"type":"calculation","expectedAnswer":{"min":280,"max":300,"unit":"K"}}
- "photo": зробити базову телеметрію системи з певною зіркою. criteria: {"type":"photo","starType":"B"}

Для вікторини: 1 правильна, 1 правдоподібна помилка, 1 смішна/неочікувана, 1 абсурдна.
Нагороди фіксовані: квест 1 кварк + 30 XP, вікторина 50 XP.
Відповідай ТІЛЬКИ чистим JSON без markdown.`;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: LESSON_MODEL,
    contents: prompt,
    config: { thinkingConfig: { thinkingBudget: 512 } },
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const cleaned = text.replace(/```json?\n?/gi, '').replace(/```/g, '').trim();

  const parsed = JSON.parse(cleaned);

  // Validate structure
  if (!parsed.lesson || !parsed.quest || !parsed.quiz) {
    throw new Error('Invalid lesson structure from Gemini');
  }
  if (!parsed.quiz.question || !Array.isArray(parsed.quiz.options) || parsed.quiz.options.length !== 4) {
    throw new Error('Invalid quiz structure from Gemini');
  }

  return {
    lessonContent: parsed.lesson,
    quest: {
      type: parsed.quest.type ?? 'knowledge',
      titleUk: parsed.quest.titleUk ?? topicNameUk,
      descriptionUk: parsed.quest.descriptionUk ?? '',
      criteria: parsed.quest.criteria ?? { type: 'knowledge', readComplete: true },
      quarkReward: 1,
      xpReward: 30,
    },
    quiz: {
      question: parsed.quiz.question,
      options: parsed.quiz.options,
      correctIndex: parsed.quiz.correctIndex ?? 0,
      explanation: parsed.quiz.explanation ?? '',
      xpReward: 50,
    },
    imagePrompt: parsed.imagePrompt,
  };
}

/**
 * Generate an educational illustration via Gemini image model.
 * Uploads result to Vercel Blob and returns the public URL.
 * Returns null on any failure (lesson should still be shown without image).
 */
export async function generateLessonImage(imagePrompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: `Educational space illustration: ${imagePrompt}. Dark cosmos background, scientific visualization style, no text labels.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        responseModalities: ['IMAGE', 'TEXT'],
        imageConfig: {
          aspectRatio: '16:9',
          imageSize: '1K',
        },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    const imagePart = parts?.find((p: { inlineData?: { data?: string; mimeType?: string } }) => p.inlineData?.data);
    if (!imagePart?.inlineData) return null;

    const { data: base64Data, mimeType } = imagePart.inlineData as { data: string; mimeType: string };
    if (!base64Data || !mimeType) return null;

    const buffer = Buffer.from(base64Data, 'base64');
    const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
    const filename = `academy/lessons/${Date.now()}.${ext}`;

    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: mimeType,
    });

    return blob.url;
  } catch (err) {
    console.error('[generateLessonImage] Failed:', err);
    return null;
  }
}
