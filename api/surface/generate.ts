import { randomUUID } from 'node:crypto';
import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getSurfaceMap,
  saveSurfaceMap,
  updateSurfaceMap,
  deductQuarks,
  creditQuarks,
  getPlayer,
  generateImageWithGemini,
  analyzePhotoForZones,
  buildSurfacePrompt,
  authenticate,
  RATE_LIMITS,
} from '@nebulife/server';

const SURFACE_GENERATION_COST = 10; // quarks

// Allow up to 60s for Gemini image generation + zone analysis.
export const config = {
  maxDuration: 60,
};

/**
 * POST /api/surface/generate
 *
 * Auth: Bearer token (Firebase)
 * Body: {
 *   playerId: string,
 *   planetId: string,
 *   systemId: string,
 *   planetData: { Planet object with all properties },
 *   starData: { Star object with all properties }
 * }
 *
 * Returns: { surfaceMapId: string, status: string, photoUrl: string, zoneMap: object[] }
 *
 * Generates synchronously via Gemini (Nano Banana 2 Lite) — no async task
 * to poll. The satellite photo is analyzed for terrain zones immediately
 * and the surface map is saved already 'ready'.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Firebase auth token
  const auth = await authenticate(req, res);
  if (!auth) return;

  if (!await RATE_LIMITS.generation(auth.playerId)) {
    return res.status(429).json({ error: 'Зачекайте перед наступною генерацією.' });
  }

  let quarksDeducted = false;
  let isFree = false;

  try {
    const { playerId, planetId, systemId, planetData, starData } = req.body;

    // Validate required fields
    if (!playerId || !planetId || !systemId || !planetData || !starData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify player owns this playerId
    if (playerId !== auth.playerId) {
      return res.status(403).json({ error: 'Forbidden: player mismatch' });
    }

    // Check if surface map already exists for this planet
    const existingMap = await getSurfaceMap(systemId, planetId);

    // Determine pricing
    // First generation of home planet is free; all others cost 10⚛
    if (!existingMap && planetData.isHomePlanet) {
      isFree = true;
    }

    // Deduct quarks if not free
    if (!isFree) {
      const player = await getPlayer(playerId);
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }

      const result = await deductQuarks(playerId, SURFACE_GENERATION_COST);
      if (!result) {
        return res.status(402).json({
          error: 'Insufficient quarks',
          balance: player.quarks,
          required: SURFACE_GENERATION_COST,
          deficit: SURFACE_GENERATION_COST - player.quarks,
        });
      }
      quarksDeducted = true;
    }

    // Build prompt from planet and star data
    const prompt = buildSurfacePrompt(planetData, starData);

    // Generate the satellite image synchronously via Gemini (Nano Banana 2
    // Lite, max 1K — the previous Kling pipeline requested 2K).
    const generated = await generateImageWithGemini({
      prompt,
      aspectRatio: '16:9',
      imageSize: '1K',
      uploadPrefix: 'surface-maps',
    });

    // Analyze the photo for terrain zones right away — no polling needed.
    const zones = await analyzePhotoForZones(generated.imageUrl);

    // Save surface map, already complete.
    const surfaceMapId = existingMap?.id ?? randomUUID();
    await saveSurfaceMap({
      id: surfaceMapId,
      playerId,
      planetId,
      systemId,
    });
    const surfaceMap = await updateSurfaceMap(surfaceMapId, {
      status: 'ready',
      photo_url: generated.imageUrl,
      zone_map: {
        zones,
        gridWidth: 64,
        gridHeight: 36,
      },
    });

    return res.status(200).json({
      surfaceMapId,
      status: 'ready',
      photoUrl: surfaceMap?.photo_url ?? generated.imageUrl,
      zoneMap: surfaceMap?.zone_map,
      generationCount: surfaceMap?.generation_count,
    });
  } catch (error) {
    console.error('Surface generation error:', error);

    // Refund quarks if they were deducted but generation failed
    if (quarksDeducted && req.body?.playerId) {
      try {
        await creditQuarks(req.body.playerId, SURFACE_GENERATION_COST);
      } catch (refundError) {
        console.error('Failed to refund quarks:', refundError);
      }
    }

    return res.status(500).json({
      error: 'Failed to generate surface',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
