import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  generateImageWithGemini,
  generateLifeformBrief,
} from '../../../packages/server/src/gemini-client.js';
import {
  deductQuarks,
  creditQuarks,
  getLifeformById,
  updateLifeformPhoto,
} from '../../../packages/server/src/db.js';
import { authenticate } from '../../../packages/server/src/auth-middleware.js';
import { RATE_LIMITS } from '../../../packages/server/src/rate-limiter.js';
import { LIFEFORM_PHOTO_COST } from '@nebulife/core';

// Allow up to 60s for the (synchronous) Gemini image generation.
export const config = {
  maxDuration: 60,
};

/** Deterministic numeric seed from the lifeform id string. */
function seedFromId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * POST /api/lifeform/photo/generate
 *
 * Auth: Bearer token (Firebase)
 * Body: { playerId, lifeformId, planetHint? }
 * Returns: { lifeformId, status, photoUrl?, quarksRemaining }
 *
 * Pipeline:
 *   1. Gemini 3.5 Flash → unique creative brief (appearance/action/sound)
 *   2. Nano Banana 2 (gemini-3.1-flash-image, 1K) → still Alpha-photo (sync)
 *   3. Persist photo + brief; the brief's video/sound prompts are reused by
 *      the Alpha-video step so the clip matches the same organism.
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
    const { playerId, lifeformId, planetHint, planetMedium } = req.body;

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

    const cost = LIFEFORM_PHOTO_COST[lifeform.rarity as keyof typeof LIFEFORM_PHOTO_COST] ?? 0;

    // 1. Deduct quarks up front (refund on failure).
    const player = await deductQuarks(playerId, cost);
    if (!player) {
      return res.status(402).json({ error: 'Insufficient quarks', required: cost });
    }
    deductedCost = cost;
    deductedPlayerId = playerId;

    // 2. Gemini 3.5 Flash creative brief (deterministic fallback on failure).
    const brief = await generateLifeformBrief({
      rarity: lifeform.rarity,
      planetHint: typeof planetHint === 'string' ? planetHint : undefined,
      mediumClause: typeof planetMedium === 'string' ? planetMedium : undefined,
      seed: seedFromId(lifeformId),
    });

    // 3. Nano Banana 2 still image (synchronous). 4:3 to match gallery cards.
    const image = await generateImageWithGemini({
      prompt: brief.photoPrompt,
      aspectRatio: '4:3',
      imageSize: '1K',
      uploadPrefix: 'lifeforms',
    });

    // 4. Persist: photo ready + brief (video/sound prompts reused by video step).
    const promptBundle = JSON.stringify({
      photo: brief.photoPrompt,
      video: brief.videoPrompt,
      sound: brief.soundPrompt,
      species: brief.speciesName,
    });
    await updateLifeformPhoto(lifeformId, {
      photo_status: 'succeed',
      photo_url: image.imageUrl,
      prompt_used: promptBundle,
      quarks_paid: cost,
    });

    return res.status(200).json({
      lifeformId,
      status: 'succeed',
      photoUrl: image.imageUrl,
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
