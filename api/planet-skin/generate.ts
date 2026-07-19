import type { VercelRequest, VercelResponse } from '@vercel/node';
import { planetSkinStorageKey, type StarSystem } from '@nebulife/core';
import { put } from '@vercel/blob';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import {
  creditQuarks,
  deductQuarks,
  getPlayer,
  getPlanetSkin,
  savePlanetSkin,
  updatePlanetSkin,
} from '../../packages/server/src/db.js';
import { generateImageWithGemini } from '../../packages/server/src/gemini-client.js';
import {
  buildPlanetSkinPrompt,
  PLANET_SKIN_EXOSPHERE_COST_QUARKS,
  type PlanetSkinKind,
} from '../../packages/server/src/planet-skin-prompt-builder.js';
import {
  normalizePlanetTexture,
  PLANET_TEXTURE_VERSION,
} from '../../packages/server/src/planet-texture-normalizer.js';
import { validatePlanetSkinTarget } from '../../packages/server/src/planet-skin-access.js';

export const config = {
  maxDuration: 60,
};

function parseKind(value: unknown): PlanetSkinKind {
  return value === 'exosphere' ? 'exosphere' : 'system';
}

function isTextureMapUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const { pathname } = new URL(url);
    return pathname.endsWith('.webp')
      && pathname.includes(`/planet-skins/textures/${PLANET_TEXTURE_VERSION}/`);
  } catch {
    return url.endsWith('.webp')
      && url.includes(`/planet-skins/textures/${PLANET_TEXTURE_VERSION}/`);
  }
}

async function convertGeneratedSkinToTextureMap(
  imageUrl: string,
  storageKey: string,
  skinId: string,
): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch generated planet skin: ${response.status}`);
  }
  const source = Buffer.from(await response.arrayBuffer());
  const normalized = await normalizePlanetTexture(source);

  const blob = await put(
    `planet-skins/textures/${PLANET_TEXTURE_VERSION}/${storageKey}/${skinId}.webp`,
    normalized.buffer,
    {
      access: 'public',
      contentType: 'image/webp',
    },
  );
  return blob.url;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vary', 'Authorization');
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

  const playerRecord = await getPlayer(auth.playerId);
  if (!playerRecord) {
    return res.status(404).json({ error: 'Player not found' });
  }
  const access = validatePlanetSkinTarget(
    playerRecord,
    systemId,
    planetId,
    systemData as StarSystem,
  );
  if (access.ok === false) {
    return res.status(access.status).json({ error: access.error });
  }
  const system = access.system;
  const planet = system.planets.find((p) => p.id === planetId)
    ?? (systemData as StarSystem).planets.find((p) => p.id === planetId)!;

  let charged = false;
  try {
    const existing = await getPlanetSkin(playerId, systemId, planetId, kind);
    if (existing && existing.status === 'succeed' && isTextureMapUrl(existing.texture_url)) {
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
    const repairingLegacySkin = Boolean(existing && !isTextureMapUrl(existing.texture_url));
    if (cost > 0 && !repairingLegacySkin) {
      player = await deductQuarks(playerId, cost);
      if (!player) {
        return res.status(402).json({ error: 'Insufficient quarks', required: cost });
      }
      charged = true;
    }

    const skinId = existing?.id ?? `ps_${kind}_${playerId}_${systemId}_${planetId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      .replace(/[^a-zA-Z0-9_-]+/g, '_');
    const prompt = buildPlanetSkinPrompt(system, planet, kind);
    // Nano Banana 2 Lite maxes out at 1K — convertGeneratedSkinToTextureMap()
    // below still resizes to a fixed 2048x1024 texture (upscaled from the
    // lower-res source), so this stays a quality tradeoff, not a bug.
    const generated = await generateImageWithGemini({
      prompt,
      aspectRatio: '21:9',
      imageSize: '1K',
      uploadPrefix: 'planet-skins/raw-21x9',
    });
    const storageKey = planetSkinStorageKey({ playerId, systemId, planetId, kind });
    const textureUrl = await convertGeneratedSkinToTextureMap(generated.imageUrl, storageKey, skinId);
    const skin = existing
      ? await updatePlanetSkin(existing.id, playerId, {
        status: 'succeed',
        texture_url: textureUrl,
        kling_task_id: null,
        prompt_used: prompt,
        quarks_paid: existing.quarks_paid ?? cost,
      })
      : await savePlanetSkin({
        id: skinId,
        planetId,
        systemId,
        kind,
        playerId,
        klingTaskId: null,
        promptUsed: prompt,
        status: 'succeed',
        textureUrl,
        quarksPaid: cost,
      });
    if (!skin) throw new Error('Failed to save planet skin');

    return res.status(200).json({
      skinId: skin.id,
      status: skin.status,
      kind: skin.kind,
      textureUrl: skin.texture_url,
      quarksPaid: cost,
      quarksRemaining: player?.quarks ?? null,
      prompt,
      existing: repairingLegacySkin || undefined,
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

