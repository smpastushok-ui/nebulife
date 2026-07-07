import type { VercelRequest, VercelResponse } from '@vercel/node';
// Pure game logic (constants + deterministic mutations) comes straight from
// @nebulife/core — the server package does not re-export it.
import { OFFSPRING_COST_QUARKS, pickMutations } from '@nebulife/core';
import {
  authenticate,
  countPlayerOffspring,
  creditQuarks,
  deductQuarks,
  getCreatureModel,
  spawnOffspring,
  updateCreatureModel,
  generateImageWithGemini,
  createCreatureModelTask,
  buildCreatureImagePrompt,
  buildOffspringDescription,
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
  not_found: 'Parent creature not found',
  forbidden: 'Forbidden',
  not_elder: 'Only an elder creature can spawn a new generation',
};

/**
 * POST /api/creatures/evolve
 *
 * Auth: Bearer token (Firebase)
 * Body: { creatureId: string } — the elder parent
 *
 * "Нове покоління" (Еволюція біосфери — see GAME_MODULES.md AI-контент):
 * deterministic mutation of the parent's description (seed = creature id +
 * generation index, via @nebulife/core pickMutations), then reuses the
 * existing image -> Tripo -> GLB pipeline from api/creatures/generate.ts to
 * craft the offspring model. The parent is marked `legacy` (stays viewable,
 * frees its planet slot, archived to the lineage panel).
 *
 * Cost: half of CREATURE_GENERATION_COST_QUARKS, first offspring per account
 * free. Quark charge + refund-on-failure mirrors api/creatures/generate.ts.
 *
 * Returns: { creatureId, status, imageUrl?, quarksPaid?, newBalance?, mutations }
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
  let createdOffspringId: string | null = null;

  try {
    const parentId = typeof req.body?.creatureId === 'string' ? req.body.creatureId : '';
    if (!parentId) {
      return res.status(400).json({ error: 'Missing required field: creatureId' });
    }

    const parent = await getCreatureModel(parentId);
    if (!parent) return res.status(404).json({ error: REASON_MESSAGES.not_found, reason: 'not_found' });
    if (parent.player_id !== auth.playerId) return res.status(403).json({ error: REASON_MESSAGES.forbidden, reason: 'forbidden' });
    if (parent.stage !== 'elder') return res.status(400).json({ error: REASON_MESSAGES.not_elder, reason: 'not_elder' });

    const generation = parent.generation + 1;
    const mutations = pickMutations(parent.id, generation);
    const offspringDescription = buildOffspringDescription(parent.description, mutations);

    const priorOffspring = await countPlayerOffspring(auth.playerId);
    const cost = priorOffspring === 0 ? 0 : OFFSPRING_COST_QUARKS;

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

    const offspringId = `creature_${auth.playerId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const spawnResult = await spawnOffspring({
      parentId: parent.id,
      playerId: auth.playerId,
      offspringId,
      description: offspringDescription,
      quarksPaid: cost,
    });
    if (!spawnResult.ok) {
      // Parent state changed between our checks and the write (race) — refund and bail.
      if (chargedPlayerId && chargedAmount > 0) {
        await creditQuarks(chargedPlayerId, chargedAmount);
        chargedPlayerId = null;
        chargedAmount = 0;
      }
      const status = spawnResult.reason === 'not_found' ? 404 : spawnResult.reason === 'forbidden' ? 403 : 400;
      return res.status(status).json({ error: REASON_MESSAGES[spawnResult.reason] ?? spawnResult.reason, reason: spawnResult.reason });
    }
    createdOffspringId = spawnResult.offspring.id;

    const imagePrompt = buildCreatureImagePrompt(offspringDescription);
    const image = await generateImageWithGemini({
      prompt: imagePrompt,
      aspectRatio: '1:1',
      imageSize: '1K',
      uploadPrefix: 'creatures',
    });
    await updateCreatureModel(spawnResult.offspring.id, { image_url: image.imageUrl });

    const tripo = await createCreatureModelTask(image.imageUrl);
    await updateCreatureModel(spawnResult.offspring.id, { tripo_task_id: tripo.taskId });

    chargedPlayerId = null;
    chargedAmount = 0;

    return res.status(200).json({
      creatureId: spawnResult.offspring.id,
      status: 'generating',
      imageUrl: image.imageUrl,
      quarksPaid: cost,
      newBalance,
      mutations,
    });
  } catch (err) {
    console.error('[creatures/evolve] Error:', err);
    if (createdOffspringId) {
      try {
        await updateCreatureModel(createdOffspringId, { status: 'failed' });
      } catch (updateErr) {
        console.error('[creatures/evolve] Failed to mark offspring as failed:', updateErr);
      }
    }
    if (chargedPlayerId && chargedAmount > 0) {
      try {
        await creditQuarks(chargedPlayerId, chargedAmount);
      } catch (refundErr) {
        console.error('[creatures/evolve] Refund failed:', refundErr);
      }
    }
    if (isMissingCreatureModelsTable(err)) {
      return res.status(503).json({ error: 'Creature evolution database migration is not installed', refunded: Boolean(chargedPlayerId && chargedAmount > 0) });
    }
    const message = err instanceof Error ? err.message : 'Evolution failed';
    const isConfigError = message.includes('TRIPO_API_KEY') || message.includes('GEMINI_API_KEY');
    return res.status(isConfigError ? 503 : 500).json({
      error: isConfigError ? 'Creature generation is not configured on the server' : 'Evolution failed. Quarks were refunded.',
      refunded: Boolean(chargedPlayerId && chargedAmount > 0),
    });
  }
}
