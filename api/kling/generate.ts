import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateImage } from '../../packages/server/src/kling-client.js';
import { saveKlingTask, saveDiscovery } from '../../packages/server/src/db.js';

/**
 * POST /api/kling/generate
 *
 * Body: {
 *   playerId: string,
 *   discoveryId: string,
 *   objectType: string,
 *   rarity: string,
 *   galleryCategory: string,
 *   systemId: string,
 *   planetId?: string,
 *   prompt: string,
 *   aspectRatio?: string,
 *   scientificReport?: string,
 * }
 *
 * Returns: { taskId: string, discoveryId: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      playerId,
      discoveryId,
      objectType,
      rarity,
      galleryCategory,
      systemId,
      planetId,
      prompt,
      aspectRatio,
      scientificReport,
    } = req.body;

    if (!playerId || !discoveryId || !objectType || !prompt) {
      return res.status(400).json({ error: 'Missing required fields: playerId, discoveryId, objectType, prompt' });
    }

    // 1. Save discovery record to DB (without photo yet)
    await saveDiscovery({
      id: discoveryId,
      playerId,
      objectType,
      rarity: rarity ?? 'common',
      galleryCategory: galleryCategory ?? 'cosmos',
      systemId: systemId ?? 'unknown',
      planetId,
      promptUsed: prompt,
      scientificReport,
    });

    // 2. Submit generation to Kling AI
    const { taskId } = await generateImage({
      prompt,
      aspectRatio: aspectRatio ?? '16:9',
    });

    // 3. Save kling task to DB for tracking
    await saveKlingTask({
      taskId,
      playerId,
      discoveryId,
    });

    return res.status(200).json({ taskId, discoveryId });
  } catch (err) {
    console.error('Kling generate error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
