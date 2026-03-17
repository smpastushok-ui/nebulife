import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateImageWithGemini } from '../../packages/server/src/gemini-client.js';
import { deductQuarks, creditQuarks, saveSystemPhoto } from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { buildGeminiSystemPhotoPrompt, buildGeminiPlanetPhotoPrompt } from '../../packages/server/src/system-photo-prompt-builder.js';
import type { StarSystem } from '@nebulife/core';

const SYSTEM_PHOTO_COST = 30;
const PLANET_PHOTO_COST = 10;

// Allow up to 60s for Gemini image generation + blob upload
export const config = {
  maxDuration: 60,
};

/**
 * POST /api/system-photo/generate
 *
 * Auth: Bearer token (Firebase)
 * Body: { playerId, systemId, systemData, screenWidth?, screenHeight? }
 * Returns: { photoId, status, photoUrl, quarksRemaining }
 *
 * Uses Gemini AI for synchronous image generation.
 * Image is uploaded to Vercel Blob and returned as a public URL.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Firebase auth token
  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    const { playerId, systemId, systemData, screenWidth, screenHeight, planetId } = req.body;

    if (!playerId || !systemId || !systemData) {
      return res.status(400).json({ error: 'Missing required fields: playerId, systemId, systemData' });
    }

    // Verify player owns this playerId
    if (playerId !== auth.playerId) {
      return res.status(403).json({ error: 'Forbidden: player mismatch' });
    }

    // Determine cost: planet telescope photo = 10, system photo = 30
    const isPlanetPhoto = !!planetId;
    const cost = isPlanetPhoto ? PLANET_PHOTO_COST : SYSTEM_PHOTO_COST;

    // 1. Deduct quarks
    const player = await deductQuarks(playerId, cost);
    if (!player) {
      return res.status(402).json({ error: 'Insufficient quarks', required: cost });
    }

    // 2. Build cinematic prompt
    const sys = systemData as StarSystem;
    let prompt: string;
    if (isPlanetPhoto) {
      const planet = sys.planets.find(p => p.id === planetId);
      if (!planet) {
        // Refund and return error
        await creditQuarks(playerId, cost);
        return res.status(400).json({ error: 'Planet not found in system data' });
      }
      prompt = buildGeminiPlanetPhotoPrompt(sys, planet);
    } else {
      prompt = buildGeminiSystemPhotoPrompt(sys);
    }

    // 3. Generate image with Gemini (synchronous — returns base64, uploads to blob)
    const result = await generateImageWithGemini({
      prompt,
      screenWidth: screenWidth ? Number(screenWidth) : undefined,
      screenHeight: screenHeight ? Number(screenHeight) : undefined,
    });

    // 4. Save to DB with completed status
    const photoId = `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await saveSystemPhoto({
      id: photoId,
      playerId,
      systemId,
      promptUsed: prompt,
      status: 'succeed',
      photoUrl: result.imageUrl,
    });

    return res.status(200).json({
      photoId,
      status: 'succeed',
      photoUrl: result.imageUrl,
      quarksRemaining: player.quarks,
    });
  } catch (err) {
    console.error('System photo generate error:', err);

    // Refund quarks on generation failure (player already paid)
    try {
      const { playerId, planetId: pid } = req.body;
      const refundAmount = pid ? PLANET_PHOTO_COST : SYSTEM_PHOTO_COST;
      if (playerId) {
        const refunded = await creditQuarks(playerId, refundAmount);
        console.log(`[Refund] Credited ${refundAmount} quarks back to ${playerId}, new balance: ${refunded.quarks}`);
        return res.status(500).json({
          error: err instanceof Error ? err.message : 'Internal error',
          refunded: true,
          quarksRemaining: refunded.quarks,
        });
      }
    } catch (refundErr) {
      console.error('Quark refund failed:', refundErr);
    }

    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
