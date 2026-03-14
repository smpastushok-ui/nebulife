import { randomUUID } from 'node:crypto';
import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getSurfaceMap,
  saveSurfaceMap,
  deductQuarks,
  getPlayer,
  generateImage,
  buildSurfacePrompt,
  authenticate,
} from '@nebulife/server';

const SURFACE_GENERATION_COST = 10; // quarks

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
 * Returns: { surfaceMapId: string, klingTaskId: string, status: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Firebase auth token
  const auth = await authenticate(req, res);
  if (!auth) return;

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
    const existingMap = await getSurfaceMap(planetId);
    const isRegenerating = !!existingMap && existingMap.status === 'ready';

    // Determine pricing
    // First generation of home planet is free; all others cost 10⚛
    let isFree = false;
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
    }

    // Build prompt from planet and star data
    const prompt = buildSurfacePrompt(planetData, starData);

    // Call Kling to generate satellite image
    const klingResponse = await generateImage({
      prompt,
      aspectRatio: '16:9',
      resolution: '2K',
    });

    const klingTaskId = klingResponse.taskId;

    // Save surface map to database
    const surfaceMapId = randomUUID();
    const surfaceMap = await saveSurfaceMap({
      id: surfaceMapId,
      playerId,
      planetId,
      systemId,
      klingTaskId,
    });

    return res.status(200).json({
      surfaceMapId: surfaceMap.id,
      klingTaskId,
      status: 'generating',
      message: 'Surface generation started',
    });
  } catch (error) {
    console.error('Surface generation error:', error);
    return res.status(500).json({
      error: 'Failed to generate surface',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
