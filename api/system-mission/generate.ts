import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateVideo } from '../../packages/server/src/kling-client.js';
import { deductQuarks, getSystemPhotoById, saveSystemMission } from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { buildMissionVideoPrompt } from '../../packages/server/src/system-photo-prompt-builder.js';
import type { StarSystem } from '@nebulife/core';

const MISSION_COSTS = { short: 30, long: 60 };
const MISSION_DURATIONS = { short: 5, long: 10 };

/**
 * POST /api/system-mission/generate
 *
 * Auth: Bearer token (Firebase)
 * Body: { playerId, systemId, photoId, durationType: 'short' | 'long', systemData: StarSystem }
 * Returns: { missionId, klingTaskId, quarksRemaining }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Firebase auth token
  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    const { playerId, systemId, photoId, durationType, systemData } = req.body;

    if (!playerId || !systemId || !photoId || !durationType || !systemData) {
      return res.status(400).json({
        error: 'Missing required fields: playerId, systemId, photoId, durationType, systemData',
      });
    }

    // Verify player owns this playerId
    if (playerId !== auth.playerId) {
      return res.status(403).json({ error: 'Forbidden: player mismatch' });
    }

    if (durationType !== 'short' && durationType !== 'long') {
      return res.status(400).json({ error: 'durationType must be "short" or "long"' });
    }

    const cost = MISSION_COSTS[durationType];
    const durationSec = MISSION_DURATIONS[durationType];

    // 1. Verify photo exists and is complete
    const photo = await getSystemPhotoById(photoId);
    if (!photo || photo.status !== 'succeed' || !photo.photo_url) {
      return res.status(400).json({ error: 'System photo not found or not ready' });
    }

    // 2. Deduct quarks
    const player = await deductQuarks(playerId, cost);
    if (!player) {
      return res.status(402).json({ error: 'Insufficient quarks', required: cost });
    }

    // 3. Build video prompt
    const prompt = buildMissionVideoPrompt(systemData as StarSystem, durationType);

    // 4. Submit to Kling Video API
    const { taskId } = await generateVideo({
      imageUrl: photo.photo_url,
      prompt,
      duration: String(durationSec) as '5' | '10',
    });

    // 5. Save mission to DB
    const missionId = `sm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await saveSystemMission({
      id: missionId,
      playerId,
      systemId,
      photoId,
      durationType,
      durationSec,
      costQuarks: cost,
      klingTaskId: taskId,
      promptUsed: prompt,
    });

    return res.status(200).json({
      missionId,
      klingTaskId: taskId,
      quarksRemaining: player.quarks,
    });
  } catch (err) {
    console.error('System mission generate error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
