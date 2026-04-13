import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { put } from '@vercel/blob';

// ---------------------------------------------------------------------------
// Gemini AI Image Generation Client
// ---------------------------------------------------------------------------
// Uses Google Gemini (gemini-2.0-flash-preview-image-generation) for synchronous image generation.
// Returns base64 image data, which is then uploaded to Vercel Blob for
// persistent URL storage.
// ---------------------------------------------------------------------------

const GEMINI_MODEL = 'gemini-3.1-flash-image-preview';

/**
 * Supported aspect ratios by Gemini.
 * Mapped from closest screen ratio.
 */
const SUPPORTED_RATIOS: Array<{ label: string; value: number }> = [
  { label: '9:16', value: 9 / 16 },
  { label: '3:4', value: 3 / 4 },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
];

export interface GeminiGenerateImageRequest {
  prompt: string;
  screenWidth?: number;
  screenHeight?: number;
  aspectRatio?: string; // Override: '16:9' | '9:16' | '4:3' | '3:4' | '1:1'
}

export interface GeminiGenerateImageResult {
  imageUrl: string;     // Public Vercel Blob URL
  mimeType: string;     // e.g. 'image/png'
  aspectRatio: string;  // Aspect ratio used
}

/**
 * Compute the closest Gemini-supported aspect ratio from screen dimensions.
 */
export function computeAspectRatio(screenWidth: number, screenHeight: number): string {
  const ratio = screenWidth / screenHeight;
  let closest = SUPPORTED_RATIOS[0];
  let minDiff = Math.abs(ratio - SUPPORTED_RATIOS[0].value);

  for (const opt of SUPPORTED_RATIOS) {
    const diff = Math.abs(ratio - opt.value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = opt;
    }
  }

  return closest.label;
}

/** Max retry attempts for transient Gemini errors (503, network). */
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 2000;

/**
 * Generate an image using Gemini AI and upload to Vercel Blob.
 *
 * Flow:
 * 1. Call Gemini with prompt + aspect ratio (retry once on transient errors)
 * 2. Extract base64 image from response
 * 3. Upload to Vercel Blob for persistent public URL
 * 4. Return the public URL
 */
export async function generateImageWithGemini(
  req: GeminiGenerateImageRequest,
): Promise<GeminiGenerateImageResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY must be set');
  }

  // Determine aspect ratio
  const aspectRatio = req.aspectRatio ??
    (req.screenWidth && req.screenHeight
      ? computeAspectRatio(req.screenWidth, req.screenHeight)
      : '16:9');

  const ai = new GoogleGenAI({ apiKey });

  // Retry loop for transient Gemini errors
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[Gemini] Retry attempt ${attempt} after ${RETRY_DELAY_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: req.prompt,
        config: {
          thinkingConfig: { thinkingBudget: 0 },
          responseModalities: ['IMAGE', 'TEXT'],
          imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: '2K',
          },
        },
      });

      // Extract image from response
      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts || parts.length === 0) {
        throw new Error('Gemini returned no content parts');
      }

      const imagePart = parts.find(p => p.inlineData?.data);
      if (!imagePart?.inlineData) {
        throw new Error('Gemini returned no image data');
      }

      const { data: base64Data, mimeType } = imagePart.inlineData;
      if (!base64Data || !mimeType) {
        throw new Error('Gemini image data is empty');
      }

      // Convert base64 to Buffer
      const buffer = Buffer.from(base64Data, 'base64');

      // Upload to Vercel Blob
      const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
      const filename = `system-photos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: mimeType,
      });

      return {
        imageUrl: blob.url,
        mimeType,
        aspectRatio,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message.toLowerCase();
      // Retry on 503 (overloaded), 429 (rate limit), or network errors
      const isTransient = msg.includes('503') || msg.includes('429')
        || msg.includes('overloaded') || msg.includes('unavailable')
        || msg.includes('econnreset') || msg.includes('timeout')
        || msg.includes('fetch failed');
      if (!isTransient || attempt >= MAX_RETRIES) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error('Gemini generation failed');
}

// ---------------------------------------------------------------------------
// A.S.T.R.A. Chat
// ---------------------------------------------------------------------------

import { ASTRA_SYSTEM_PROMPT } from './astra-prompt.js';

const ASTRA_MODEL = 'gemini-3.1-flash-lite-preview';

export interface AstraMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AstraChatResult {
  text: string;
  totalTokens: number;
}

/**
 * Send a message to A.S.T.R.A. and get a response.
 * Returns raw text (may be plain text or JSON quiz) + token count.
 * Never throws — returns an in-character error string on failure.
 */
export async function chatWithAstra(
  message: string,
  history: AstraMessage[] = [],
  lang: string = 'uk',
): Promise<AstraChatResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { text: 'A.S.T.R.A. offline. API key missing.', totalTokens: 0 };

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Build conversation history
    const contents = [
      ...history.map(m => ({
        role: m.role,
        parts: [{ text: m.text }],
      })),
      {
        role: 'user' as const,
        parts: [{ text: message }],
      },
    ];

    // Race the Gemini call against a 20-second timeout to avoid Vercel function hang
    const geminiPromise = ai.models.generateContent({
      model: ASTRA_MODEL,
      contents,
      config: {
        systemInstruction: lang === 'en'
          ? ASTRA_SYSTEM_PROMPT + '\n\nCRITICAL: The player uses ENGLISH interface. You MUST respond in English. Address the player as "Commander".'
          : ASTRA_SYSTEM_PROMPT + '\n\nКРИТИЧНО: Гравець використовує українську мову. Ти ЗАВЖДИ відповідаєш ТІЛЬКИ УКРАЇНСЬКОЮ мовою. Звертайся до гравця "Командоре".',
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
      },
    });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini timeout')), 20_000),
    );
    const response = await Promise.race([geminiPromise, timeoutPromise]);

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const usage = response.usageMetadata;
    const totalTokens = usage?.totalTokenCount ?? 0;

    return { text: text.trim(), totalTokens };
  } catch (err) {
    console.error('[ASTRA] Gemini error:', err instanceof Error ? err.message : err);
    return { text: 'A.S.T.R.A. offline. Спробуйте пізніше, Командоре.', totalTokens: 0 };
  }
}

// ---------------------------------------------------------------------------
// Gemini Text Moderation
// ---------------------------------------------------------------------------

const MODERATION_MODEL = 'gemini-2.0-flash';

export type ModerationVerdict = 'SAFE' | 'WARN' | 'BLOCK' | 'SEVERE';

export interface ModerationResult {
  verdict: ModerationVerdict;
  category: string;
  reason: string;
  confidence: number;
}

/**
 * Moderate a chat message using Gemini.
 * Returns SAFE on any parse/API failure — never false-bans.
 */
export async function moderateMessage(opts: {
  content: string;
  contextMessages: Array<{ senderName: string; content: string }>;
  senderName: string;
}): Promise<ModerationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY must be set');

  const contextText = opts.contextMessages.length > 0
    ? opts.contextMessages.map(m => `${m.senderName}: ${m.content}`).join('\n')
    : '(немає контексту)';

  const prompt = `Ти модератор гри Nebulife. Оціни повідомлення гравця в чаті.

Гравець "${opts.senderName}" написав:
"${opts.content}"

Контекст (останні повідомлення):
${contextText}

Категорії порушень: SPAM | HARASSMENT | OFFENSIVE_LANGUAGE | FLOOD | SAFE

Рівні покарання:
- SAFE — без порушень
- WARN — легке порушення (5 хвилин мовчанки)
- BLOCK — серйозне порушення (1-24 години)
- SEVERE — дуже грубе порушення (7-30 днів)

Відповідай ТІЛЬКИ JSON (без markdown, без пояснень):
{"verdict":"SAFE","category":"SAFE","reason":"...","confidence":0.0}

Будь поблажливим. SEVERE лише для найгрубіших випадків.`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODERATION_MODEL,
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 0 } },
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    // Strip markdown code fences if present
    const cleaned = text.replace(/```json?\n?/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned) as ModerationResult;

    const valid: ModerationVerdict[] = ['SAFE', 'WARN', 'BLOCK', 'SEVERE'];
    if (!valid.includes(parsed.verdict)) return { verdict: 'SAFE', category: 'SAFE', reason: 'parse error', confidence: 0 };

    return parsed;
  } catch {
    // Fail open — never false-ban
    return { verdict: 'SAFE', category: 'SAFE', reason: 'moderation unavailable', confidence: 0 };
  }
}

// ---------------------------------------------------------------------------
// Daily Quiz & Fun Fact Generation
// ---------------------------------------------------------------------------

const DAILY_MODEL = 'gemini-3.1-flash-lite-preview';

/**
 * Generate a daily quiz about space/astrophysics.
 * Returns validated quiz JSON string.
 */
export async function generateDailyQuiz(): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY must be set');

  const prompt = `Ти генератор щоденних вікторин для гри Nebulife — космічного симулятора.
Створи одне оригінальне запитання про космос, астрофізику, планетологію або зоряну навігацію.
Запитання мають бути різноманітними: від легких до складних, іноді жартівливі.
Мова: Українська.

Відповідай ТІЛЬКИ чистим JSON (без markdown, без пояснень):
{"type":"quiz","data":{"question":"...","options":["...","...","...","..."],"correctIndex":N,"explanation":"...","xpReward":50}}

Правила:
- 4 варіанти відповіді
- ОБОВ'ЯЗКОВО: перемішай варіанти так щоб правильна відповідь була на ВИПАДКОВІЙ позиції (0, 1, 2 або 3), НЕ ЗАВЖДИ ПЕРШОЮ
- correctIndex: індекс правильної відповіді (0-3), має бути різний кожного разу
- explanation: коротке (1-2 речення) пояснення правильної відповіді
- xpReward: завжди 50
- Одна правильна, одна правдоподібна помилка, одна смішна, одна абсурдна`;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: DAILY_MODEL,
    contents: prompt,
    config: { thinkingConfig: { thinkingBudget: 256 } },
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const cleaned = text.replace(/```json?\n?/gi, '').replace(/```/g, '').trim();

  // Validate JSON structure
  const parsed = JSON.parse(cleaned);
  if (parsed?.type !== 'quiz' || !parsed?.data?.question || !Array.isArray(parsed?.data?.options)) {
    throw new Error('Invalid quiz JSON structure');
  }

  return cleaned;
}

/**
 * Generate a daily fun fact about space.
 * Returns a short fact string in Ukrainian.
 */
export async function generateDailyFunFact(): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY must be set');

  const prompt = `Ти A.S.T.R.A. — бортовий ШІ космічної гри Nebulife.
Згенеруй один короткий цікавий факт про космос, астрофізику, зірки, планети або Всесвіт.
Формат: "Командоре, а ви знали, що [факт]?"
Мова: Українська. Максимум 2-3 речення. Без емодзі. Науково достовірно.
Кожен факт має бути унікальним і неочікуваним.
Відповідай ТІЛЬКИ текстом факту, без зайвих пояснень.`;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: DAILY_MODEL,
    contents: prompt,
    config: { thinkingConfig: { thinkingBudget: 128 } },
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return text.trim();
}
