import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateImage } from '../../packages/server/src/kling-client.js';
import { deductQuarks, saveSystemPhoto } from '../../packages/server/src/db.js';
import { buildSystemPhotoPrompt } from '../../packages/server/src/system-photo-prompt-builder.js';
import type { StarSystem } from '@nebulife/core';

const PHOTO_COST = 15;

/**
 * POST /api/system-photo/generate
 *
 * Body: { playerId: string, systemId: string, systemData: StarSystem }
 * Returns: { photoId: string, klingTaskId: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { playerId, systemId, systemData } = req.body;

    if (!playerId || !systemId || !systemData) {
      return res.status(400).json({ error: 'Missing required fields: playerId, systemId, systemData' });
    }

    // 1. Deduct quarks
    const player = await deductQuarks(playerId, PHOTO_COST);
    if (!player) {
      return res.status(402).json({ error: 'Insufficient quarks', required: PHOTO_COST });
    }

    // 2. Build prompt from system data
    const prompt = buildSystemPhotoPrompt(systemData as StarSystem);

    // 3. Submit to Kling AI
    const { taskId } = await generateImage({
      prompt,
      aspectRatio: '16:9',
    });

    // 4. Save to DB
    const photoId = `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await saveSystemPhoto({
      id: photoId,
      playerId,
      systemId,
      klingTaskId: taskId,
      promptUsed: prompt,
    });

    return res.status(200).json({
      photoId,
      klingTaskId: taskId,
      quarksRemaining: player.quarks,
    });
  } catch (err) {
    console.error('System photo generate error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
