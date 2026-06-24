import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCatalogEntry } from '@nebulife/core';
import { generateImage } from '../../packages/server/src/kling-client.js';
import { saveKlingTask, saveDiscovery, deductQuarks, creditQuarks } from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { verifyPhotoToken } from '../../packages/server/src/photo-token.js';

function isKlingInsufficientBalance(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('Kling API error 429') && message.includes('Account balance not enough');
}

/**
 * POST /api/kling/generate
 *
 * Auth: Bearer token (Firebase)
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
 *   cost?: number,          // quark cost (0 = free, default 0)
 * }
 *
 * Returns: { taskId: string, discoveryId: string, quarksRemaining?: number }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Firebase auth token
  const auth = await authenticate(req, res);
  if (!auth) return;

  let debitedQuarks = 0;
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
      cost,
      adPhotoToken,
    } = req.body;

    if (!playerId || !discoveryId || !objectType) {
      return res.status(400).json({ error: 'Missing required fields: playerId, discoveryId, objectType' });
    }

    // Verify player owns this playerId
    if (playerId !== auth.playerId) {
      return res.status(403).json({ error: 'Forbidden: player mismatch' });
    }

    // Common cosmic events ship with bundled images and must not invoke Kling
    // or persist generated prompts. The client saves their bundled URL directly.
    const catalogEntry = getCatalogEntry(objectType);
    if (rarity === 'common' || catalogEntry?.rarity === 'common') {
      return res.status(400).json({ error: 'Common cosmic events use bundled assets — no generation needed' });
    }

    if (!prompt) {
      return res.status(400).json({ error: 'Missing required field: prompt' });
    }

    // Check if funded by a valid ad-reward photo token (HMAC-signed by server after watching ads).
    // The client cannot forge this token — it must be obtained from POST /api/ads/reward.
    const paidWithAds = typeof adPhotoToken === 'string' &&
      verifyPhotoToken(adPhotoToken, playerId, 'discovery_photo');

    // Deduct quarks if cost > 0 and not funded by ads
    let quarksRemaining: number | undefined;
    const quarkCost = typeof cost === 'number' && cost > 0 ? cost : 0;
    if (quarkCost > 0 && !paidWithAds) {
      const player = await deductQuarks(playerId, quarkCost);
      if (!player) {
        return res.status(402).json({ error: 'Insufficient quarks' });
      }
      quarksRemaining = player.quarks;
      debitedQuarks = quarkCost;
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
      model: 'kling-v3',
      resolution: '2K',
    });

    // 3. Save kling task to DB for tracking
    await saveKlingTask({
      taskId,
      playerId,
      discoveryId,
    });

    return res.status(200).json({ taskId, discoveryId, quarksRemaining });
  } catch (err) {
    if (debitedQuarks > 0) {
      await creditQuarks(auth.playerId, debitedQuarks).catch((refundErr) => {
        console.error('[kling/generate] Failed to refund quarks after generation error:', refundErr);
      });
    }
    if (isKlingInsufficientBalance(err)) {
      console.warn('[kling/generate] Kling account balance is not enough; generation skipped.');
      return res.status(503).json({
        error: 'Image generation is temporarily unavailable',
        code: 'KLING_INSUFFICIENT_BALANCE',
      });
    }
    console.error('Kling generate error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
