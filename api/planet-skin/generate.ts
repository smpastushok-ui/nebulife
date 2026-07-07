import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { StarSystem } from '@nebulife/core';
import sharp from 'sharp';
import { put } from '@vercel/blob';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import {
  creditQuarks,
  deductQuarks,
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
    return pathname.endsWith('.webp') && pathname.includes('/planet-skins/textures/');
  } catch {
    return url.endsWith('.webp') && url.includes('/planet-skins/textures/');
  }
}

async function convertGeneratedSkinToTextureMap(imageUrl: string, skinId: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch generated planet skin: ${response.status}`);
  }
  const source = Buffer.from(await response.arrayBuffer());
  const image = sharp(source, { failOn: 'none' });
  const metadata = await image.metadata();
  const sourceWidth = metadata.width ?? 0;
  const sourceHeight = metadata.height ?? 0;
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error('Generated planet skin has invalid dimensions');
  }

  const targetWidth = Math.min(sourceWidth, sourceHeight * 2);
  const targetHeight = Math.floor(targetWidth / 2);
  const cropLeft = Math.max(0, Math.floor((sourceWidth - targetWidth) / 2));
  const cropTop = Math.max(0, Math.floor((sourceHeight - targetHeight) / 2));
  const cropped = await image
    .extract({
      left: cropLeft,
      top: cropTop,
      width: Math.floor(targetWidth),
      height: targetHeight,
    })
    .resize(2048, 1024, { fit: 'fill' })
    .toBuffer();
  const edgeBlend = 64;
  const leftEdge = await sharp(cropped)
    .extract({ left: 0, top: 0, width: edgeBlend, height: 1024 })
    .toBuffer();
  const rightEdge = await sharp(cropped)
    .extract({ left: 2048 - edgeBlend, top: 0, width: edgeBlend, height: 1024 })
    .toBuffer();
  const blendedLeft = await sharp(leftEdge)
    .composite([{ input: rightEdge, blend: 'lighten' }])
    .toBuffer();
  const blendedRight = await sharp(rightEdge)
    .composite([{ input: leftEdge, blend: 'lighten' }])
    .toBuffer();
  const texture = await sharp(cropped)
    .composite([
      { input: blendedLeft, left: 0, top: 0 },
      { input: blendedRight, left: 2048 - edgeBlend, top: 0 },
    ])
    .webp({ quality: 88, effort: 4 })
    .toBuffer();

  const blob = await put(`planet-skins/textures/${skinId}.webp`, texture, {
    access: 'public',
    contentType: 'image/webp',
  });
  return blob.url;
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
    const existing = await getPlanetSkin(systemId, planetId, kind);
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

    const skinId = existing?.id ?? `ps_${kind}_${systemId}_${planetId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
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
    const textureUrl = await convertGeneratedSkinToTextureMap(generated.imageUrl, skinId);
    const skin = existing
      ? await updatePlanetSkin(existing.id, {
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

