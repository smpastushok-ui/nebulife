import type { VercelRequest, VercelResponse } from '@vercel/node';
import { computeAspectRatio } from '../../../packages/server/src/gemini-client.js';
import { generateImage as generateKlingImage } from '../../../packages/server/src/kling-client.js';
import {
  deductQuarks,
  creditQuarks,
  getLifeformById,
  updateLifeformPhoto,
} from '../../../packages/server/src/db.js';
import { authenticate } from '../../../packages/server/src/auth-middleware.js';
import { RATE_LIMITS } from '../../../packages/server/src/rate-limiter.js';
import { buildLifeformPhotoPrompt } from '../../../packages/server/src/lifeform-prompt-builder.js';
import type { LifeformRarity } from '../../../packages/server/src/lifeform-prompt-builder.js';
import { LIFEFORM_PHOTO_COST } from '@nebulife/core';

// Allow up to 60s for Kling task submission.
export const config = {
  maxDuration: 60,
};

/**
 * POST /api/lifeform/photo/generate
 *
 * Auth: Bearer token (Firebase)
 * Body: { playerId, lifeformId, screenWidth?, screenHeight?, planetHint? }
 * Returns: { lifeformId, status, quarksRemaining }
 *
 * Generates a unique Alpha-photo (Kling v3 omni, 4K) for a NON-common lifeform.
 * Common lifeforms use bundled assets and must not call this endpoint.
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
    const { playerId, lifeformId, screenWidth, screenHeight, planetHint } = req.body;

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
    if (lifeform.photo_status === 'succeed' && lifeform.photo_url) {
      return res.status(200).json({ lifeformId, status: 'succeed', photoUrl: lifeform.photo_url });
    }

    const cost = LIFEFORM_PHOTO_COST[lifeform.rarity as LifeformRarity] ?? 0;

    // 1. Deduct quarks up front (refund on failure).
    const player = await deductQuarks(playerId, cost);
    if (!player) {
      return res.status(402).json({ error: 'Insufficient quarks', required: cost });
    }
    deductedCost = cost;
    deductedPlayerId = playerId;

    // 2. Build prompt.
    const prompt = buildLifeformPhotoPrompt({
      rarity: lifeform.rarity as LifeformRarity,
      speciesName: lifeform.species_name ?? undefined,
      planetHint: typeof planetHint === 'string' ? planetHint : undefined,
    });

    // 3. Submit Kling v3 omni 4K task.
    const aspectRatio = screenWidth && screenHeight
      ? computeAspectRatio(Number(screenWidth), Number(screenHeight))
      : '9:16';
    const { taskId } = await generateKlingImage({
      prompt,
      aspectRatio,
      resolution: '4K',
      model: 'kling-v3-omni',
    });

    // 4. Persist generating state.
    await updateLifeformPhoto(lifeformId, {
      photo_status: 'generating',
      photo_task_id: taskId,
      prompt_used: prompt,
      quarks_paid: cost,
    });

    return res.status(200).json({
      lifeformId,
      status: 'generating',
      quarksRemaining: player.quarks,
    });
  } catch (err) {
    console.error('Lifeform photo generate error:', err);
    if (deductedPlayerId && deductedCost > 0) {
      try {
        const refunded = await creditQuarks(deductedPlayerId, deductedCost);
        return res.status(500).json({
          error: err instanceof Error ? err.message : 'Internal error',
          refunded: true,
          quarksRemaining: refunded.quarks,
        });
      } catch (refundErr) {
        console.error('Lifeform photo refund failed:', refundErr);
      }
    }
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
