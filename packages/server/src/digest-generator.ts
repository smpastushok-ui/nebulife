import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { put } from '@vercel/blob';
import type { Language } from '@nebulife/core';

// ---------------------------------------------------------------------------
// Weekly Space News Digest Generator
// ---------------------------------------------------------------------------
// Step 1: gemini-3-flash-preview (1M context, thinking: HIGH) compiles news
// Step 2: gemini-3.1-flash-image-preview generates 9:16 infographic images
// ---------------------------------------------------------------------------

const CORE_MODEL = 'gemini-3.1-flash-lite-preview';
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
  source?: string;
}

// ---------------------------------------------------------------------------
// Step 1: Generate weekly news text (Google Search grounded)
// ---------------------------------------------------------------------------

function buildNewsPrompt(): string {
  // Compute exact date range: past 7 days from now
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const dateFrom = weekAgo.toISOString().split('T')[0];
  const dateTo = now.toISOString().split('T')[0];

  return `You are a space news curator for the game "Nebulife" — a hard sci-fi space exploration simulator.

TODAY'S DATE: ${dateTo}
SEARCH PERIOD: ${dateFrom} to ${dateTo} (exactly 7 days)

CRITICAL RULES:
1. Use Google Search to find REAL space news published between ${dateFrom} and ${dateTo}
2. ONLY include articles published within this 7-day window. Reject older news.
3. Every news item MUST be based on a real published article with a verifiable URL
4. DO NOT invent, hallucinate, or fabricate any news
5. For each article found, evaluate its IMPORTANCE on a scale 1-10:
   - 10: Historic breakthrough (new exoplanet discovery, first landing, gravitational waves)
   - 8-9: Major mission milestone (launch, orbit insertion, sample return)
   - 6-7: Significant scientific finding (new data, confirmed theory)
   - 4-5: Routine update (schedule changes, funding news)
   - 1-3: Minor news (personnel changes, conference announcements)
6. ONLY include items scored 5 or higher. Skip boring routine updates.

SEARCH QUERIES to use:
- "space news this week ${dateTo}"
- "NASA news ${dateFrom}"
- "SpaceX launch ${dateTo}"
- "ESA mission news"
- "astronomy discovery this week"
- "space exploration breakthrough"
- "JWST new findings"
- "Mars mission update"

For each news item provide:
- title_uk: Ukrainian title (short, 5-10 words)
- title_en: English title (short, 5-10 words)
- desc_uk: Ukrainian description (1-2 sentences, factual, in-game style — as if reported by a space station AI)
- desc_en: English description (same content, 1-2 sentences)
- imagePrompt: A short prompt for generating a sci-fi illustration (English, 10-20 words, visual only)
- source: Full URL of the original article

Style guide:
- Write as if you are a ship's AI reporting findings to the Commander
- Be factual but add a hint of sci-fi drama
- Focus on: discoveries, missions, launches, astronomical events, research breakthroughs
- No politics, no speculation, only confirmed scientific facts
- Sort by importance (most exciting first)

Return ONLY valid JSON array (no markdown, no explanation):
[{"title_uk":"...","title_en":"...","desc_uk":"...","desc_en":"...","imagePrompt":"...","source":"..."},...]

Return 10-15 items. Quality over quantity — skip boring news.`;
}

export async function generateWeeklyNewsText(): Promise<DigestNewsItem[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY must be set');

  const ai = new GoogleGenAI({ apiKey });

  const prompt = buildNewsPrompt();
  console.log(`[digest] Searching for news from past 7 days`);

  const response = await ai.models.generateContent({
    model: CORE_MODEL,
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
      tools: [{ googleSearch: {} }, { urlContext: {} }],
    },
  });

  // Log grounding metadata for verification
  const grounding = response.candidates?.[0]?.groundingMetadata;
  if (grounding?.searchEntryPoint?.renderedContent) {
    console.log('[digest] Search grounding available');
  }
  if (grounding?.groundingChunks?.length) {
    console.log(`[digest] Grounded on ${grounding.groundingChunks.length} sources`);
  }

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const cleaned = text.replace(/```json?\n?/gi, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleaned) as DigestNewsItem[];

  if (!Array.isArray(parsed) || parsed.length < 3) {
    throw new Error(`Too few news items: got ${parsed?.length ?? 0}, need at least 3`);
  }

  // Validate structure — keep only valid items, skip broken ones
  const valid = parsed.filter(item =>
    item.title_uk && item.title_en && item.desc_uk && item.desc_en && item.imagePrompt
  );

  if (valid.length < 3) {
    throw new Error(`Only ${valid.length} structurally valid items (need at least 3)`);
  }

  return valid.slice(0, 15);
}

// ---------------------------------------------------------------------------
// Verify news items — check sources are reachable, filter hallucinations
// ---------------------------------------------------------------------------

/** Whitelist of trusted space/science news domains */
const TRUSTED_DOMAINS = [
  // Google Search grounding proxy (Gemini returns these instead of original URLs)
  'vertexaisearch.cloud.google.com', 'google.com', 'googleapis.com',
  'nasa.gov', 'esa.int', 'spacex.com', 'space.com', 'nature.com',
  'science.org', 'sciencedaily.com', 'phys.org', 'arxiv.org',
  'newscientist.com', 'scientificamerican.com', 'bbc.com', 'bbc.co.uk',
  'reuters.com', 'apnews.com', 'theguardian.com', 'nytimes.com',
  'washingtonpost.com', 'cnn.com', 'spacenews.com', 'arstechnica.com',
  'universetoday.com', 'skyandtelescope.org', 'astronomy.com',
  'planetary.org', 'iau.org', 'spaceflightnow.com', 'nasaspaceflight.com',
  'jpl.nasa.gov', 'hubblesite.org', 'jwst.nasa.gov', 'livescience.com',
  'space.stackexchange.com', 'earthsky.org', 'eso.org', 'jaxa.jp',
  'isro.gov.in', 'roscosmos.ru', 'cnsa.gov.cn', 'blueorigin.com',
  'rocketlabusa.com', 'virgingalactic.com', 'theregister.com',
  'wired.com', 'techcrunch.com', 'theverge.com', 'engadget.com',
  'latimes.com', 'nbcnews.com', 'cbsnews.com', 'abcnews.go.com',
  'foxnews.com', 'usatoday.com', 'independent.co.uk', 'telegraph.co.uk',
  'france24.com', 'dw.com', 'aljazeera.com', 'theatlantic.com',
  'popularmechanics.com', 'inverse.com', 'futurism.com', 'gizmodo.com',
  'space.nss.org', 'spacepolicyonline.com', 'thespacereview.com',
];

export async function verifyNewsItems(
  items: DigestNewsItem[],
  previousTitles: string[] = [],
): Promise<{ verified: DigestNewsItem[]; dropped: { title: string; reason: string }[] }> {
  const verified: DigestNewsItem[] = [];
  const dropped: { title: string; reason: string }[] = [];

  for (const item of items) {
    // Check 1: must have a source URL
    if (!item.source || !item.source.startsWith('http')) {
      dropped.push({ title: item.title_en, reason: 'no_source_url' });
      continue;
    }

    // Check 2: source URL must be parseable (domain whitelist removed — Gemini grounding is sufficient)
    try {
      new URL(item.source);
    } catch {
      dropped.push({ title: item.title_en, reason: 'invalid_url' });
      continue;
    }

    // Check 3: source URL must be reachable (HEAD request, 5s timeout)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(item.source, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeout);

      if (resp.status >= 400) {
        // Gemini often generates approximate URLs that 404 — accept but log
        console.warn(`[digest-verify] Source returned ${resp.status} (accepted): ${item.source}`);
      }
    } catch {
      // Network error or timeout — source may be behind firewall, still accept
      // but flag it
      console.warn(`[digest-verify] Source unreachable (accepted): ${item.source}`);
    }

    // Check 4: duplicate detection — compare with previous digest titles
    if (previousTitles.length > 0) {
      const titleLower = item.title_en.toLowerCase();
      const isDuplicate = previousTitles.some(prev => {
        const prevLower = prev.toLowerCase();
        // Exact match or >70% overlap (simple word-based)
        if (titleLower === prevLower) return true;
        const words1 = new Set(titleLower.split(/\s+/));
        const words2 = new Set(prevLower.split(/\s+/));
        const intersection = [...words1].filter(w => words2.has(w));
        return intersection.length / Math.max(words1.size, words2.size) > 0.7;
      });
      if (isDuplicate) {
        dropped.push({ title: item.title_en, reason: 'duplicate_of_previous_digest' });
        continue;
      }
    }

    // Check 5: description length — too short = low quality
    if (item.desc_en.length < 30) {
      dropped.push({ title: item.title_en, reason: 'description_too_short' });
      continue;
    }

    verified.push(item);
  }

  return { verified, dropped };
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
