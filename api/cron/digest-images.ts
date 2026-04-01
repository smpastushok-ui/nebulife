import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPendingDigest, updateDigestImage, saveMessage, getPlayersRegisteredBefore } from '../../packages/server/src/db.js';
import { generateDigestImage, type DigestNewsItem } from '../../packages/server/src/digest-generator.js';
import { DIGEST_LANGUAGES, DIGEST_IMAGES_PER_LANG } from '@nebulife/core';

const ITEMS_PER_IMAGE = 3;
const TOTAL_IMAGES = DIGEST_LANGUAGES.length * DIGEST_IMAGES_PER_LANG;
const BATCH_SIZE = 200;

/**
 * GET /api/cron/digest-images
 * Runs every minute.
 * Picks one pending digest image, generates it, and updates the DB.
 * When all 10 images are done, posts a notification to global chat.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization ?? '';
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const digest = await getPendingDigest();
    if (!digest || !digest.news_json) {
      return res.status(200).json({ processed: 0, reason: 'no_pending' });
    }

    const news = JSON.parse(digest.news_json) as DigestNewsItem[];
    const count = digest.images_generated;

    // Determine which image to generate next
    const langIndex = Math.floor(count / DIGEST_IMAGES_PER_LANG);
    const pageIndex = count % DIGEST_IMAGES_PER_LANG;
    const lang = DIGEST_LANGUAGES[langIndex];

    if (!lang) {
      return res.status(200).json({ processed: 0, reason: 'all_done' });
    }

    // Get the 3 news items for this page
    const startIdx = pageIndex * ITEMS_PER_IMAGE;
    const newsGroup = news.slice(startIdx, startIdx + ITEMS_PER_IMAGE);

    if (newsGroup.length === 0) {
      return res.status(200).json({ processed: 0, reason: 'no_items' });
    }

    // Generate image
    const imageUrl = await generateDigestImage(newsGroup, lang, pageIndex);

    // Update images_json
    const currentImages = digest.images_json
      ? (JSON.parse(digest.images_json) as Record<string, string[]>)
      : { uk: [], en: [] };

    if (!currentImages[lang]) currentImages[lang] = [];
    currentImages[lang].push(imageUrl);

    const newCount = count + 1;
    await updateDigestImage(digest.week_date, JSON.stringify(currentImages), newCount, TOTAL_IMAGES);

    // If all done, notify each player registered before this digest via their astra channel
    if (newCount >= TOTAL_IMAGES) {
      const digestMsg = JSON.stringify({
        type: 'digest',
        weekDate: digest.week_date,
      });
      const playerIds = await getPlayersRegisteredBefore(digest.created_at);
      for (let i = 0; i < playerIds.length; i += BATCH_SIZE) {
        const batch = playerIds.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(
          batch.map(async (pid) => {
            try {
              await saveMessage('system', 'NEBULIFE', `astra:${pid}`, digestMsg);
            } catch (err) {
              console.warn(`[digest-images] Failed notify for ${pid}:`, err);
            }
          }),
        );
      }
      console.log(`[digest-images] Digest complete for ${digest.week_date}, notified ${playerIds.length} players`);
    }

    console.log(`[digest-images] Generated ${lang} page ${pageIndex} (${newCount}/${TOTAL_IMAGES})`);
    return res.status(200).json({ processed: 1, lang, pageIndex, total: newCount });
  } catch (err) {
    console.error('[digest-images] Failed:', err);
    return res.status(200).json({ processed: 0, error: err instanceof Error ? err.message : 'Unknown' });
  }
}
