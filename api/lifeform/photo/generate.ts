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
  acquireIdempotencyKey,
  releaseIdempotencyKey,
} from '../../../packages/server/src/db.js';
import { authenticate } from '../../../packages/server/src/auth-middleware.js';
import { RATE_LIMITS } from '../../../packages/server/src/rate-limiter.js';
import { verifyAdMediaToken } from '../../../packages/server/src/ad-media-token.js';
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
 * Body: { playerId, lifeformId, planetHint?, adToken? }
 * Returns: { lifeformId, status, photoUrl?, quarksRemaining }
 *
 * Payment: quarks by default. `adToken` (signed by /api/ads/reward after the
 * player watched the required rewarded ads — Tier-1 ad regions only) covers
 * the cost instead; each token is single-use.
 *
 * Pipeline:
 *   1. Gemini 3.5 Flash → unique creative brief (appearance/action/sound)
 *   2. Nano Banana 2 Lite (gemini-3.1-flash-lite-image, 1K) → still Alpha-photo (sync)
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
  let adNonceKey: string | null = null;

  try {
    const { playerId, lifeformId, planetHint, planetMedium, adToken } = req.body;

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
    if (lifeform.rarity === 'common' && lifeform.is_bundle) {
      return res.status(400).json({ error: 'Common lifeforms use bundled assets — no generation needed' });
    }
    if (lifeform.photo_status === 'succeed' && lifeform.photo_url) {
      return res.status(200).json({ lifeformId, status: 'succeed', photoUrl: lifeform.photo_url });
    }

    let cost = LIFEFORM_PHOTO_COST[lifeform.rarity as keyof typeof LIFEFORM_PHOTO_COST] ?? 0;

    // Ad-funded path: a valid (single-use) token from /api/ads/reward covers
    // the cost — no quark deduction.
    if (typeof adToken === 'string' && adToken) {
      const verified = verifyAdMediaToken(adToken, playerId, 'lifeform_photo');
      if (!verified) {
        return res.status(400).json({ error: 'Invalid or expired ad token' });
      }
      const lock = await acquireIdempotencyKey(`adlf:${verified.nonce}`, playerId, 'lifeform/photo/generate');
      if (!lock.acquired) {
        return res.status(400).json({ error: 'Ad token already used' });
      }
      adNonceKey = `adlf:${verified.nonce}`;
      cost = 0;
    }

    // 1. Deduct quarks up front (refund on failure). Skipped when ad-funded.
    let quarksRemaining: number | null = null;
    if (cost > 0) {
      const player = await deductQuarks(playerId, cost);
      if (!player) {
        return res.status(402).json({ error: 'Insufficient quarks', required: cost });
      }
      deductedCost = cost;
      deductedPlayerId = playerId;
      quarksRemaining = player.quarks;
    }

    let genomeHint: string | undefined;
    try {
      const metadata = lifeform.prompt_used ? JSON.parse(lifeform.prompt_used) as { source?: string; genome?: { promptHint?: string; traits?: string[]; complexity?: string } } : null;
      if (metadata?.source === 'genesis_ark' && metadata.genome) {
        genomeHint = [
          metadata.genome.promptHint,
          metadata.genome.complexity ? `complexity ${metadata.genome.complexity}` : '',
          Array.isArray(metadata.genome.traits) ? `traits ${metadata.genome.traits.join(', ')}` : '',
        ].filter(Boolean).join('; ');
      }
    } catch { /* ignore malformed legacy prompt metadata */ }

    // 2. Gemini 3.5 Flash creative brief (deterministic fallback on failure).
    const brief = await generateLifeformBrief({
      rarity: lifeform.rarity,
      planetHint: typeof planetHint === 'string' ? planetHint : undefined,
      mediumClause: typeof planetMedium === 'string' ? planetMedium : undefined,
      genomeHint,
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
      genomeHint,
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
      quarksRemaining,
    });
  } catch (err) {
    console.error('Lifeform photo generate error:', err);
    // Ad-funded run failed — release the nonce so the player's ad token can retry.
    if (adNonceKey) {
      try { await releaseIdempotencyKey(adNonceKey); } catch { /* best effort */ }
    }
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
