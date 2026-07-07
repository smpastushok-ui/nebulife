import type { VercelRequest, VercelResponse } from '@vercel/node';
// Pure game logic (costs) comes straight from @nebulife/core — the server
// package does not re-export it.
import { HYBRID_UPGRADE_COST_QUARKS } from '@nebulife/core';
import {
  authenticate,
  MAX_CREATURES_PER_PLANET,
  creditQuarks,
  deductQuarks,
  getCreatureModel,
  listCreaturesByPlanet,
  updateCreatureModel,
  createCreatureModelTask,
  RATE_LIMITS,
} from '@nebulife/server';

export const config = {
  maxDuration: 60,
};

function isMissingCreatureModelsTable(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('creature_models') && message.includes('does not exist');
}

const REASON_MESSAGES: Record<string, string> = {
  not_found: 'Hybrid not found',
  forbidden: 'Forbidden',
  not_photo_hybrid: 'Only a photo-tier hybrid can be upgraded to 3D',
  planet_full: `Planet already has the maximum of ${MAX_CREATURES_PER_PLANET} creatures`,
};

/**
 * POST /api/creatures/hybrid-upgrade
 *
 * Auth: Bearer token (Firebase)
 * Body: { creatureId: string } — a photo-tier hybrid (status 'photo_ready')
 *
 * Upgrades an already-purchased hybrid photo to a full 3D biosphere creature
 * for HYBRID_UPGRADE_COST_QUARKS: reuses the existing Tripo image-to-model
 * pipeline from the stored hybrid photo; the client then polls
 * /api/creatures/status like any other generation. On Tripo failure the
 * status endpoint reverts the row to 'photo_ready' and refunds the upgrade
 * (the photo itself is never lost).
 *
 * Returns: { creatureId, status: 'generating', quarksPaid, newBalance }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  if (!await RATE_LIMITS.generation(auth.playerId)) {
    return res.status(429).json({ error: 'Зачекайте перед наступною генерацією.' });
  }

  let chargedPlayerId: string | null = null;
  let chargedAmount = 0;

  try {
    const creatureId = typeof req.body?.creatureId === 'string' ? req.body.creatureId : '';
    if (!creatureId) {
      return res.status(400).json({ error: 'Missing required field: creatureId' });
    }

    const hybrid = await getCreatureModel(creatureId);
    if (!hybrid) return res.status(404).json({ error: REASON_MESSAGES.not_found, reason: 'not_found' });
    if (hybrid.player_id !== auth.playerId) return res.status(403).json({ error: REASON_MESSAGES.forbidden, reason: 'forbidden' });
    if (!hybrid.is_hybrid || hybrid.status !== 'photo_ready' || !hybrid.hybrid_photo_url) {
      return res.status(400).json({ error: REASON_MESSAGES.not_photo_hybrid, reason: 'not_photo_hybrid' });
    }

    // The upgraded hybrid becomes an active (settled) creature — same
    // 3-per-planet rule as generate/evolve/full-tier hybridize.
    const existingOnPlanet = await listCreaturesByPlanet(hybrid.planet_id, auth.playerId);
    const activeOnPlanet = existingOnPlanet.filter(
      (c) => c.id !== hybrid.id && c.status !== 'failed' && c.status !== 'photo_ready' && c.stage !== 'legacy',
    );
    if (activeOnPlanet.length >= MAX_CREATURES_PER_PLANET) {
      return res.status(400).json({ error: REASON_MESSAGES.planet_full, reason: 'planet_full' });
    }

    const paid = await deductQuarks(auth.playerId, HYBRID_UPGRADE_COST_QUARKS);
    if (!paid) {
      return res.status(402).json({ error: 'Insufficient quarks', required: HYBRID_UPGRADE_COST_QUARKS });
    }
    chargedPlayerId = auth.playerId;
    chargedAmount = HYBRID_UPGRADE_COST_QUARKS;

    // Create the Tripo task first — if it throws, the row is untouched
    // (still 'photo_ready') and the catch block refunds the charge.
    const tripo = await createCreatureModelTask(hybrid.hybrid_photo_url);
    await updateCreatureModel(hybrid.id, {
      status: 'generating',
      tripo_task_id: tripo.taskId,
      // Refund bookkeeping: quarks_paid now holds the refundable amount for
      // the in-flight Tripo attempt (see /api/creatures/status failure path).
      quarks_paid: HYBRID_UPGRADE_COST_QUARKS,
    });

    chargedPlayerId = null;
    chargedAmount = 0;

    return res.status(200).json({
      creatureId: hybrid.id,
      status: 'generating',
      quarksPaid: HYBRID_UPGRADE_COST_QUARKS,
      newBalance: paid.quarks,
    });
  } catch (err) {
    console.error('[creatures/hybrid-upgrade] Error:', err);
    if (chargedPlayerId && chargedAmount > 0) {
      try {
        await creditQuarks(chargedPlayerId, chargedAmount);
      } catch (refundErr) {
        console.error('[creatures/hybrid-upgrade] Refund failed:', refundErr);
      }
    }
    if (isMissingCreatureModelsTable(err)) {
      return res.status(503).json({ error: 'Creature hybridization database migration is not installed', refunded: Boolean(chargedPlayerId && chargedAmount > 0) });
    }
    const message = err instanceof Error ? err.message : 'Hybrid upgrade failed';
    const isConfigError = message.includes('TRIPO_API_KEY') || message.includes('GEMINI_API_KEY');
    return res.status(isConfigError ? 503 : 500).json({
      error: isConfigError ? 'Creature generation is not configured on the server' : 'Hybrid upgrade failed. Quarks were refunded.',
      refunded: Boolean(chargedPlayerId && chargedAmount > 0),
    });
  }
}
