import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateVideo } from '../../../packages/server/src/kling-client.js';
import {
  deductQuarks,
  creditQuarks,
  getLifeformById,
  updateLifeformVideo,
} from '../../../packages/server/src/db.js';
import { authenticate } from '../../../packages/server/src/auth-middleware.js';
import { RATE_LIMITS } from '../../../packages/server/src/rate-limiter.js';
import { buildLifeformVideoPrompt } from '../../../packages/server/src/lifeform-prompt-builder.js';
import type { LifeformRarity } from '../../../packages/server/src/lifeform-prompt-builder.js';
import { LIFEFORM_VIDEO_COST } from '@nebulife/core';

export const config = {
  maxDuration: 60,
};

/**
 * POST /api/lifeform/video/generate
 *
 * Auth: Bearer token (Firebase)
 * Body: { playerId, lifeformId }
 * Returns: { lifeformId, status, quarksRemaining }
 *
 * Animates the previously-generated Alpha-photo into a short Alpha-video.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  if (!await RATE_LIMITS.generation(auth.playerId)) {
    return res.status(429).json({ error: 'Зачекайте перед наступною генерацією.' });
  }

  let deductedCost = 0;
  let deductedPlayerId: string | null = null;

  try {
    const { playerId, lifeformId } = req.body;

    if (!playerId || !lifeformId) {
      return res.status(400).json({ error: 'Missing required fields: playerId, lifeformId' });
    }
    if (playerId !== auth.playerId) {
      return res.status(403).json({ error: 'Forbidden: player mismatch' });
    }

    const lifeform = await getLifeformById(lifeformId);
    if (!lifeform) {
      return res.status(404).json({ error: 'Lifeform not found' });
    }
    if (lifeform.player_id !== playerId) {
      return res.status(403).json({ error: 'Forbidden: lifeform owner mismatch' });
    }
    if (lifeform.rarity === 'common') {
      return res.status(400).json({ error: 'Common lifeforms use bundled assets — no generation needed' });
    }
    if (!lifeform.photo_url || lifeform.photo_status !== 'succeed') {
      return res.status(400).json({ error: 'Alpha-photo not ready — generate the photo first' });
    }
    if (lifeform.video_status === 'succeed' && lifeform.video_url) {
      return res.status(200).json({ lifeformId, status: 'succeed', videoUrl: lifeform.video_url });
    }

    const cost = LIFEFORM_VIDEO_COST[lifeform.rarity as LifeformRarity] ?? 0;

    const player = await deductQuarks(playerId, cost);
    if (!player) {
      return res.status(402).json({ error: 'Insufficient quarks', required: cost });
    }
    deductedCost = cost;
    deductedPlayerId = playerId;

    const prompt = buildLifeformVideoPrompt({ rarity: lifeform.rarity as LifeformRarity });

    const { taskId } = await generateVideo({
      imageUrl: lifeform.photo_url,
      prompt,
      duration: '5',
    });

    await updateLifeformVideo(lifeformId, {
      video_status: 'generating',
      video_task_id: taskId,
      quarks_paid: cost,
    });

    return res.status(200).json({
      lifeformId,
      status: 'generating',
      quarksRemaining: player.quarks,
    });
  } catch (err) {
    console.error('Lifeform video generate error:', err);
    if (deductedPlayerId && deductedCost > 0) {
      try {
        const refunded = await creditQuarks(deductedPlayerId, deductedCost);
        return res.status(500).json({
          error: err instanceof Error ? err.message : 'Internal error',
          refunded: true,
          quarksRemaining: refunded.quarks,
        });
      } catch (refundErr) {
        console.error('Lifeform video refund failed:', refundErr);
      }
    }
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
