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
  isTripoTaskCreationError,
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
  not_found: 'Creature not found',
  forbidden: 'Forbidden',
  not_photo_hybrid: 'Only a photo-tier creature can be upgraded to 3D',
  planet_full: `Planet already has the maximum of ${MAX_CREATURES_PER_PLANET} creatures`,
};

/**
 * POST /api/creatures/hybrid-upgrade
 *
 * Auth: Bearer token (Firebase)
 * Body: { creatureId: string } — any photo-tier creature (status
 * 'photo_ready'): a hybridize.ts 'photo' result, OR a plain element
 * experiment (generate.ts) that fell back to photo_ready because Tripo
 * failed at creation time. Both store the portrait differently
 * (hybrid_photo_url vs plain image_url), so the source URL picks whichever
 * is set.
 *
 * Upgrades an already-purchased photo to a full 3D biosphere creature.
 * Cost depends on how the photo was obtained:
 * - Hybridize 'photo' tier (is_hybrid): the player deliberately bought the
 *   cheaper photo-only option (HYBRID_PHOTO_COST_QUARKS), so completing it
 *   to 3D costs the full HYBRID_UPGRADE_COST_QUARKS on top.
 * - Plain generate.ts experiment that fell back to photo_ready because Tripo
 *   itself failed at creation time (!is_hybrid): the player already paid the
 *   FULL creature price expecting a 3D model, so the retry is free — Tripo
 *   being unavailable is not the player's fault.
 * Reuses the existing Tripo image-to-model pipeline from the stored photo;
 * the client then polls /api/creatures/status like any other generation. On
 * Tripo failure the status endpoint reverts the row to 'photo_ready' and
 * refunds the upgrade (the photo itself is never lost).
 *
 * Returns: { creatureId, status: 'generating', quarksPaid, newBalance? }
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
    // Non-hybrid experiment creatures that fell back to photo_ready store
    // their portrait in image_url (hybrid_photo_url is only set by
    // hybridize.ts's fusion flow).
    const photoUrl = hybrid.hybrid_photo_url ?? hybrid.image_url;
    if (hybrid.status !== 'photo_ready' || !photoUrl) {
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

    // A Tripo-outage fallback (plain experiment, never a deliberate photo
    // purchase) retries for free — the player already paid full price once.
    const cost = hybrid.is_hybrid ? HYBRID_UPGRADE_COST_QUARKS : 0;

    let newBalance: number | undefined;
    if (cost > 0) {
      const paid = await deductQuarks(auth.playerId, cost);
      if (!paid) {
        return res.status(402).json({ error: 'Insufficient quarks', required: cost });
      }
      chargedPlayerId = auth.playerId;
      chargedAmount = cost;
      newBalance = paid.quarks;
    }

    // Create the Tripo task first. If Tripo rejects task creation (credits,
    // model tier, temporary provider outage), keep the row untouched in
    // 'photo_ready'. The portrait is already owned; only a paid upgrade charge
    // is refunded immediately.
    let tripo: { taskId: string };
    try {
      tripo = await createCreatureModelTask(photoUrl);
    } catch (tripoErr) {
      if (!isTripoTaskCreationError(tripoErr)) {
        throw tripoErr;
      }

      let refunded = false;
      if (chargedPlayerId && chargedAmount > 0) {
        try {
          const refundedPlayer = await creditQuarks(chargedPlayerId, chargedAmount);
          newBalance = refundedPlayer.quarks;
          refunded = true;
        } catch (refundErr) {
          console.error('[creatures/hybrid-upgrade] Refund failed:', refundErr);
          throw refundErr;
        } finally {
          chargedPlayerId = null;
          chargedAmount = 0;
        }
      }

      console.warn('[creatures/hybrid-upgrade] Tripo task creation unavailable, keeping photo_ready:', {
        creatureId: hybrid.id,
        tripoStatus: tripoErr.status,
        tripoCode: tripoErr.code,
        tripoSuggestion: tripoErr.suggestion,
        ...tripoErr.diagnostics,
        refunded,
      });

      return res.status(200).json({
        creatureId: hybrid.id,
        status: 'photo_ready',
        reason: 'tripo_unavailable',
        error: '3D model is temporarily unavailable. Portrait saved; try again later.',
        refunded,
        quarksPaid: 0,
        newBalance,
      });
    }
    await updateCreatureModel(hybrid.id, {
      status: 'generating',
      tripo_task_id: tripo.taskId,
      // Refund bookkeeping: quarks_paid now holds the refundable amount for
      // the in-flight Tripo attempt (see /api/creatures/status failure path).
      quarks_paid: cost,
    });

    chargedPlayerId = null;
    chargedAmount = 0;

    return res.status(200).json({
      creatureId: hybrid.id,
      status: 'generating',
      quarksPaid: cost,
      newBalance,
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
