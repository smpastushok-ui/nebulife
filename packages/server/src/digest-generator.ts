import { GoogleGenAI } from '@google/genai';
import { put } from '@vercel/blob';
import type { Language } from '@nebulife/core';

// ---------------------------------------------------------------------------
// Weekly Space News Digest Generator
// ---------------------------------------------------------------------------
// Step 1: gemini-3-flash-preview (1M context, thinking: HIGH) compiles news
// Step 2: gemini-3.1-flash-image-preview generates 9:16 infographic images
// ---------------------------------------------------------------------------

const CORE_MODEL = 'gemini-3-flash-preview';
const IMAGE_MODEL = 'gemini-3.1-flash-image-preview';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DigestNewsItem {
  title_uk: string;
  title_en: string;
  desc_uk: string;
  desc_en: string;
  imagePrompt: string;
}

// ---------------------------------------------------------------------------
// Step 1: Generate weekly news text
// ---------------------------------------------------------------------------

const NEWS_PROMPT = `You are a space news curator for the game "Nebulife" — a hard sci-fi space exploration simulator.

Your task: Find and compile the 15 most interesting REAL space/astronomy/astrophysics news from the past 7 days.

For each news item provide:
- title_uk: Ukrainian title (short, 5-10 words)
- title_en: English title (short, 5-10 words)
- desc_uk: Ukrainian description (1-2 sentences, factual, in-game style — as if reported by a space station AI)
- desc_en: English description (same content, 1-2 sentences)
- imagePrompt: A short prompt for generating a sci-fi illustration of this news (in English, 10-20 words, visual description only)

Style guide:
- Write as if you are a ship's AI reporting findings to the Commander
- Be factual but add a hint of sci-fi drama
- Focus on: discoveries, missions, launches, astronomical events, research breakthroughs
- No politics, no speculation, only confirmed scientific facts

Return ONLY valid JSON array (no markdown, no explanation):
[{"title_uk":"...","title_en":"...","desc_uk":"...","desc_en":"...","imagePrompt":"..."},...]

Return exactly 15 items. Search the web for the latest space news from the past week.`;

export async function generateWeeklyNewsText(): Promise<DigestNewsItem[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY must be set');

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: CORE_MODEL,
    contents: NEWS_PROMPT,
    config: {
      thinkingConfig: { thinkingBudget: 8192 },
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const cleaned = text.replace(/```json?\n?/gi, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleaned) as DigestNewsItem[];

  if (!Array.isArray(parsed) || parsed.length < 10) {
    throw new Error(`Expected 15 news items, got ${parsed?.length ?? 0}`);
  }

  // Validate structure
  for (const item of parsed) {
    if (!item.title_uk || !item.title_en || !item.desc_uk || !item.desc_en || !item.imagePrompt) {
      throw new Error('Invalid news item structure');
    }
  }

  return parsed.slice(0, 15);
}

// ---------------------------------------------------------------------------
// Step 2: Generate digest infographic image
// ---------------------------------------------------------------------------

function buildImagePrompt(items: DigestNewsItem[], lang: Language, pageIndex: number): string {
  const titles = items.map((item, i) => {
    const title = lang === 'uk' ? item.title_uk : item.title_en;
    const desc = lang === 'uk' ? item.desc_uk : item.desc_en;
    return `${i + 1}. "${title}" — ${desc}`;
  });

  const langLabel = lang === 'uk' ? 'Ukrainian' : 'English';

  return `Create a vertical 9:16 sci-fi infographic poster for a space game "Nebulife". Page ${pageIndex + 1} of 5.

STYLE: Dark space background (#020510), neon accent colors (#44ffaa green, #4488aa blue), monospace font aesthetic, clean modern layout.

HEADER: "NEBULIFE WEEKLY" in large stylized text at top. Page indicator "${pageIndex + 1}/5" in corner.

CONTENT: Show exactly 3 news items vertically stacked. For each item:
- A small sci-fi illustration (thumbnail) on the left (~30% width)
- Title and description text on the right (~70% width)
- Thin separator line between items

The 3 news items (write text in ${langLabel}):
${titles.join('\n')}

Mini-illustration ideas for each:
${items.map((item, i) => `${i + 1}. ${item.imagePrompt}`).join('\n')}

FOOTER: Subtle "A.S.T.R.A. Intelligence Report" text. Week date.

IMPORTANT: All text must be clearly readable. Use ${langLabel} language for all text content. Clean typographic layout, no clutter.`;
}

export async function generateDigestImage(
  items: DigestNewsItem[],
  lang: Language,
  pageIndex: number,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY must be set');

  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildImagePrompt(items, lang, pageIndex);

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 0 },
      responseModalities: ['IMAGE', 'TEXT'],
      imageConfig: {
        aspectRatio: '9:16',
        imageSize: '2K',
      },
    },
  });

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

  const buffer = Buffer.from(base64Data, 'base64');
  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const filename = `digest/${lang}-${pageIndex}-${Date.now()}.${ext}`;

  const blob = await put(filename, buffer, {
    access: 'public',
    contentType: mimeType,
  });

  return blob.url;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the Monday of the current week as YYYY-MM-DD. */
export function getCurrentWeekMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}
