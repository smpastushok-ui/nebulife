import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import {
  creditQuarks,
  deductQuarks,
  saveShipModel,
  updateShipModel,
} from '../../packages/server/src/db.js';
import { moderateShipPrompt } from '../../packages/server/src/gemini-client.js';
import { generateImage } from '../../packages/server/src/kling-client.js';
import {
  SHIP_GENERATION_COST_QUARKS,
  buildShipConceptPrompt,
  normalizeShipDescription,
  validateShipDescription,
} from '../../packages/server/src/ship-prompt.js';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let chargedPlayerId: string | null = null;
  let chargedAmount = 0;
  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const description = normalizeShipDescription(req.body?.description);
    const validation = validateShipDescription(description);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    const moderation = await moderateShipPrompt(description);
    if (moderation.verdict !== 'approved') {
      return res.status(200).json({
        status: moderation.verdict,
        reason: moderation.reason,
        cleanedPrompt: moderation.cleanedPrompt,
      });
    }

    const paid = await deductQuarks(auth.playerId, SHIP_GENERATION_COST_QUARKS);
    if (!paid) {
      return res.status(402).json({ error: 'Insufficient quarks' });
    }
    chargedPlayerId = auth.playerId;
    chargedAmount = SHIP_GENERATION_COST_QUARKS;

    const shipId = `ship_${auth.playerId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const ship = await saveShipModel({
      id: shipId,
      playerId: auth.playerId,
      prompt: description,
      promptUsed: moderation.cleanedPrompt,
      moderationStatus: 'approved',
      moderationReason: moderation.reason,
      status: 'generating_concept',
      quarksPaid: SHIP_GENERATION_COST_QUARKS,
    });

    const conceptPrompt = buildShipConceptPrompt(moderation.cleanedPrompt);
    const kling = await generateImage({ prompt: conceptPrompt, aspectRatio: '1:1', resolution: '1K' });
    await updateShipModel(ship.id, {
      kling_task_id: kling.taskId,
      status: 'generating_concept',
    });
    chargedPlayerId = null;
    chargedAmount = 0;

    return res.status(200).json({
      shipId: ship.id,
      status: 'generating_concept',
      quarksPaid: SHIP_GENERATION_COST_QUARKS,
      newBalance: paid.quarks,
    });
  } catch (err) {
    console.error('[ship/generate] Error:', err);
    if (chargedPlayerId && chargedAmount > 0) {
      try {
        await creditQuarks(chargedPlayerId, chargedAmount);
      } catch (refundErr) {
        console.error('[ship/generate] Refund failed:', refundErr);
      }
    }
    const message = err instanceof Error ? err.message : 'Ship generation failed';
    const isConfigError = message.includes('KLING_ACCESS_KEY') || message.includes('KLING_SECRET_KEY');
    const isDbMigrationError = message.includes('ship_models') || message.includes('relation') || message.includes('column');
    return res.status(isConfigError || isDbMigrationError ? 503 : 500).json({
      error: isConfigError
        ? 'Ship generation is not configured on the server'
        : isDbMigrationError
          ? 'Ship generation database migration is not installed'
          : 'Ship generation failed',
    });
  }
}
