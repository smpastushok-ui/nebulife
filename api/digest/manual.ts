import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getWeeklyDigest,
  saveWeeklyDigest,
  updateDigestImage,
  saveMessage,
  getPlayersRegisteredBefore,
} from '../../packages/server/src/db.js';
import {
  generateWeeklyNewsText,
  generateDigestImage,
  getCurrentWeekMonday,
  verifyNewsItems,
  type DigestNewsItem,
} from '../../packages/server/src/digest-generator.js';
import { DIGEST_LANGUAGES, DIGEST_IMAGES_PER_LANG } from '@nebulife/core';

const ITEMS_PER_IMAGE = 3;
const TOTAL_IMAGES = DIGEST_LANGUAGES.length * DIGEST_IMAGES_PER_LANG;
const BATCH_SIZE = 200;

/**
 * POST /api/digest/manual
 *
 * Full digest pipeline in one request:
 *   1. Generate news text (Gemini + Google Search)
 *   2. Generate all 10 images (Gemini image model)
 *   3. Save to DB
 *   4. Send to all players' ASTRA channels (in their language)
 *
 * Usage: curl -X POST https://nebulife.space/api/digest/manual \
 *          -H "Authorization: Bearer YOUR_CRON_SECRET"
 *
 * Optional body: { "weekDate": "2026-04-07" } to override week date.
 * Timeout: this will take 2-5 minutes due to image generation.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization ?? '';
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const weekDate = (req.body as { weekDate?: string })?.weekDate ?? new Date().toISOString().slice(0, 10);
  const log: string[] = [];
  const addLog = (msg: string) => { log.push(msg); console.log(`[digest/manual] ${msg}`); };

  try {
    // ── Step 1: Check if digest already exists ──────────────────────────
    const existing = await getWeeklyDigest(weekDate);
    let news: DigestNewsItem[];

    if (existing && existing.status === 'complete') {
      addLog(`Digest for ${weekDate} already complete — skipping to delivery`);
      news = JSON.parse(existing.news_json!) as DigestNewsItem[];
    } else if (existing && existing.status === 'generating_images') {
      addLog(`Digest for ${weekDate} exists with ${existing.images_generated} images — continuing`);
      news = JSON.parse(existing.news_json!) as DigestNewsItem[];
    } else {
      // ── Step 2: Generate news text ──────────────────────────────────
      addLog(`Generating news text for week ${weekDate}...`);
      const rawNews = await generateWeeklyNewsText();
      addLog(`Generated ${rawNews.length} raw news items`);

      // ── Step 2.5: Verify — trusted sources, dedup, quality ──────────
      // Get previous digest titles for duplicate detection
      let previousTitles: string[] = [];
      try {
        const prevMonday = new Date(weekDate);
        prevMonday.setDate(prevMonday.getDate() - 7);
        const prevWeek = prevMonday.toISOString().slice(0, 10);
        const prevDigest = await getWeeklyDigest(prevWeek);
        if (prevDigest?.news_json) {
          const prevItems = JSON.parse(prevDigest.news_json) as DigestNewsItem[];
          previousTitles = prevItems.map(i => i.title_en);
        }
      } catch { /* no previous digest — skip dedup */ }

      const { verified, dropped } = await verifyNewsItems(rawNews, previousTitles);
      addLog(`Verification: ${verified.length} passed, ${dropped.length} dropped`);
      for (const d of dropped) {
        addLog(`  DROPPED: "${d.title}" — ${d.reason}`);
      }

      if (verified.length < 3) {
        throw new Error(`Only ${verified.length} news items passed verification (need at least 3)`);
      }

      news = verified;
      await saveWeeklyDigest(weekDate, JSON.stringify(news));
      addLog(`Saved ${news.length} verified items to DB`);
    }

    // ── Step 3: Generate images (skip already generated ones) ─────────
    // Dynamic page count: 3 items per page, rounded up
    const pagesPerLang = Math.ceil(news.length / ITEMS_PER_IMAGE);
    const totalImages = DIGEST_LANGUAGES.length * pagesPerLang;

    let digest = await getWeeklyDigest(weekDate);
    if (!digest) throw new Error('Digest row not found after save');

    let imagesGenerated = digest.images_generated;
    const currentImages = digest.images_json
      ? (JSON.parse(digest.images_json) as Record<string, string[]>)
      : { uk: [], en: [] };

    addLog(`News: ${news.length} items -> ${pagesPerLang} pages/lang x ${DIGEST_LANGUAGES.length} langs = ${totalImages} images`);

    while (imagesGenerated < totalImages) {
      const langIndex = Math.floor(imagesGenerated / pagesPerLang);
      const pageIndex = imagesGenerated % pagesPerLang;
      const lang = DIGEST_LANGUAGES[langIndex];

      if (!lang) break;

      const startIdx = pageIndex * ITEMS_PER_IMAGE;
      const newsGroup = news.slice(startIdx, startIdx + ITEMS_PER_IMAGE);
      if (newsGroup.length === 0) break;

      addLog(`Generating image: ${lang} page ${pageIndex + 1}/${pagesPerLang} (${imagesGenerated + 1}/${totalImages})...`);

      try {
        const imageUrl = await generateDigestImage(newsGroup, lang, pageIndex);
        if (!currentImages[lang]) currentImages[lang] = [];
        currentImages[lang].push(imageUrl);
        imagesGenerated++;
        await updateDigestImage(weekDate, JSON.stringify(currentImages), imagesGenerated, totalImages);
        addLog(`  -> OK: ${imageUrl.slice(0, 60)}...`);
      } catch (imgErr) {
        addLog(`  -> FAILED: ${imgErr instanceof Error ? imgErr.message : 'Unknown'}`);
        // Continue with next image instead of aborting everything
      }
    }

    addLog(`Images done: ${imagesGenerated}/${totalImages}`);

    // ── Step 4: Send to all players ───────────────────────────────────
    const digestMsg = JSON.stringify({ type: 'digest', weekDate });
    const playerIds = await getPlayersRegisteredBefore(digest.created_at);
    addLog(`Sending to ${playerIds.length} players...`);

    let sent = 0;
    let failed = 0;
    for (let i = 0; i < playerIds.length; i += BATCH_SIZE) {
      const batch = playerIds.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (pid) => {
          await saveMessage('system', 'NEBULIFE', `astra:${pid}`, digestMsg);
        }),
      );
      sent += results.filter(r => r.status === 'fulfilled').length;
      failed += results.filter(r => r.status === 'rejected').length;
    }

    addLog(`Delivery complete: ${sent} sent, ${failed} failed`);

    return res.status(200).json({
      success: true,
      weekDate,
      newsCount: news.length,
      imagesGenerated,
      totalImages: TOTAL_IMAGES,
      playersSent: sent,
      playersFailed: failed,
      log,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    addLog(`FATAL: ${errMsg}`);
    return res.status(500).json({
      success: false,
      error: errMsg,
      log,
    });
  }
}
