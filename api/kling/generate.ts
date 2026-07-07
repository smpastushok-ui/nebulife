import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCatalogEntry } from '@nebulife/core';
import { generateImageWithGemini } from '../../packages/server/src/gemini-client.js';
import {
  saveKlingTask,
  updateKlingTask,
  saveDiscovery,
  updateDiscoveryPhoto,
  deductQuarks,
  creditQuarks,
} from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { verifyPhotoToken } from '../../packages/server/src/photo-token.js';

// Allow up to 60s for the (synchronous) Gemini image generation.
export const config = {
  maxDuration: 60,
};

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
 *
 * NOTE: despite the historical "kling" route/table naming, generation now
 * runs synchronously through Gemini (Nano Banana 2 Lite) — Kling is no
 * longer called here. A `kling_tasks` row is still written and immediately
 * marked 'succeed' so the existing client contract (POST here, then poll
 * GET /api/kling/status/:taskId) keeps working without any client changes.
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

    // Common cosmic events ship with bundled images and must not invoke
    // generation, or persist generated prompts. The client saves their
    // bundled URL directly.
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

    // 2. Generate synchronously via Gemini (Nano Banana 2 Lite, max 1K).
    const generated = await generateImageWithGemini({
      prompt,
      aspectRatio: aspectRatio ?? '16:9',
      imageSize: '1K',
      uploadPrefix: 'discoveries',
    });

    // 3. Persist the photo on the discovery immediately (no status-poll
    // round trip needed to do this like the old async Kling flow).
    await updateDiscoveryPhoto(discoveryId, generated.imageUrl);

    // 4. Record a completed "task" so GET /api/kling/status/:taskId — still
    // called by the client's existing poll loop — resolves on its very
    // first check.
    const taskId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await saveKlingTask({ taskId, playerId, discoveryId });
    await updateKlingTask(taskId, 'succeed', generated.imageUrl);

    return res.status(200).json({ taskId, discoveryId, quarksRemaining });
  } catch (err) {
    if (debitedQuarks > 0) {
      await creditQuarks(auth.playerId, debitedQuarks).catch((refundErr) => {
        console.error('[kling/generate] Failed to refund quarks after generation error:', refundErr);
      });
    }
    console.error('Kling generate error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
