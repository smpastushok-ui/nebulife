import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { StarSystem } from '@nebulife/core';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import {
  creditQuarks,
  deductQuarks,
  getPlanetSkin,
  savePlanetSkin,
} from '../../packages/server/src/db.js';
import { generateImage } from '../../packages/server/src/kling-client.js';
import {
  buildPlanetSkinPrompt,
  PLANET_SKIN_EXOSPHERE_COST_QUARKS,
  type PlanetSkinKind,
} from '../../packages/server/src/planet-skin-prompt-builder.js';

export const config = {
  maxDuration: 60,
};

function parseKind(value: unknown): PlanetSkinKind {
  return value === 'exosphere' ? 'exosphere' : 'system';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  const { playerId, systemId, planetId, systemData } = req.body;
  const kind = parseKind(req.body?.kind);

  if (!playerId || !systemId || !planetId || !systemData) {
    return res.status(400).json({ error: 'Missing required fields: playerId, systemId, planetId, systemData' });
  }
  if (playerId !== auth.playerId) {
    return res.status(403).json({ error: 'Forbidden: player mismatch' });
  }

  const system = systemData as StarSystem;
  const planet = system.planets.find((p) => p.id === planetId);
  if (!planet) {
    return res.status(400).json({ error: 'Planet not found in system data' });
  }

  let charged = false;
  try {
    const existing = await getPlanetSkin(planetId, kind);
    if (existing) {
      return res.status(200).json({
        skinId: existing.id,
        status: existing.status,
        textureUrl: existing.texture_url,
        kind: existing.kind,
        quarksRemaining: null,
        existing: true,
      });
    }

    const cost = kind === 'exosphere' ? PLANET_SKIN_EXOSPHERE_COST_QUARKS : 0;
    let player: { quarks: number } | null = null;
    if (cost > 0) {
      player = await deductQuarks(playerId, cost);
      if (!player) {
        return res.status(402).json({ error: 'Insufficient quarks', required: cost });
      }
      charged = true;
    }

    const prompt = buildPlanetSkinPrompt(system, planet, kind);
    const { taskId } = await generateImage({
      prompt,
      aspectRatio: '16:9',
      resolution: '2K',
    });

    const skinId = `ps_${kind}_${planetId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const skin = await savePlanetSkin({
      id: skinId,
      planetId,
      systemId,
      kind,
      playerId,
      klingTaskId: taskId,
      promptUsed: prompt,
      status: 'generating',
      quarksPaid: cost,
    });

    return res.status(200).json({
      skinId: skin.id,
      status: skin.status,
      kind: skin.kind,
      quarksPaid: cost,
      quarksRemaining: player?.quarks ?? null,
      prompt,
    });
  } catch (err) {
    console.error('[planet-skin/generate] Error:', err);
    const message = err instanceof Error ? err.message : 'Planet skin generation failed';
    const missingStorage = message.includes('planet_skins') && message.includes('does not exist');
    const clientError = missingStorage
      ? 'Planet skin storage is missing. Run packages/server/src/migrations/019-planet-skins.sql in Neon SQL Editor.'
      : message;
    if (kind === 'exosphere' && charged) {
      try {
        const refunded = await creditQuarks(playerId, PLANET_SKIN_EXOSPHERE_COST_QUARKS);
        return res.status(500).json({
          error: clientError,
          refunded: true,
          quarksRemaining: refunded.quarks,
        });
      } catch (refundErr) {
        console.error('[planet-skin/generate] Refund failed:', refundErr);
      }
    }
    return res.status(500).json({ error: clientError });
  }
}

