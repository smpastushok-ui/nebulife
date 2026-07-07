import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticate,
  countPlayerCreatures,
  createCreatureModel,
  creditQuarks,
  deductQuarks,
  listCreaturesByPlanet,
  updateCreatureModel,
  generateImageWithGemini,
  moderateCreaturePrompt,
  createCreatureModelTask,
  CREATURE_GENERATION_COST_QUARKS,
  MAX_CREATURES_PER_PLANET,
  normalizeCreatureDescription,
  validateCreatureDescription,
  buildCreatureImagePrompt,
  RATE_LIMITS,
} from '@nebulife/server';

export const config = {
  maxDuration: 60,
};

/**
 * POST /api/creatures/generate
 *
 * Auth: Bearer token (Firebase)
 * Body: { planetId: string, description: string }
 *
 * Pipeline: moderate brief -> quark gate (first creature per account free,
 * then CREATURE_GENERATION_COST_QUARKS) -> Gemini reference portrait ->
 * Tripo image_to_model task. Client polls /api/creatures/status for the
 * Tripo -> GLB -> Vercel Blob completion.
 *
 * Returns: { creatureId, status, imageUrl?, quarksPaid?, newBalance? }
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
  let createdCreatureId: string | null = null;

  try {
    const planetId = typeof req.body?.planetId === 'string' ? req.body.planetId : '';
    if (!planetId) {
      return res.status(400).json({ error: 'Missing required field: planetId' });
    }

    const description = normalizeCreatureDescription(req.body?.description);
    const validation = validateCreatureDescription(description);
    if (validation.ok === false) {
      return res.status(400).json({ error: validation.error });
    }

    const existingOnPlanet = await listCreaturesByPlanet(planetId, auth.playerId);
    // Legacy-stage creatures (elders that already spawned an offspring — see
    // Еволюція біосфери, migration 041) are archived to the lineage panel and
    // no longer occupy a planet slot. Photo-tier hybrids (migration 042,
    // status 'photo_ready') are portraits only — they occupy a slot only
    // after the 3D upgrade settles them.
    const activeOnPlanet = existingOnPlanet.filter(
      (c) => c.status !== 'failed' && c.status !== 'photo_ready' && c.stage !== 'legacy',
    );
    if (activeOnPlanet.length >= MAX_CREATURES_PER_PLANET) {
      return res.status(400).json({ error: `Planet already has the maximum of ${MAX_CREATURES_PER_PLANET} creatures` });
    }

    const moderation = await moderateCreaturePrompt(description);
    if (moderation.verdict !== 'approved') {
      return res.status(200).json({
        status: moderation.verdict,
        reason: moderation.reason,
        cleanedPrompt: moderation.cleanedPrompt,
      });
    }

    const priorCreatures = await countPlayerCreatures(auth.playerId);
    const cost = priorCreatures === 0 ? 0 : CREATURE_GENERATION_COST_QUARKS;

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

    const creatureId = `creature_${auth.playerId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const creature = await createCreatureModel({
      id: creatureId,
      playerId: auth.playerId,
      planetId,
      description,
      promptUsed: moderation.cleanedPrompt,
      status: 'generating',
      quarksPaid: cost,
    });
    createdCreatureId = creature.id;

    const imagePrompt = buildCreatureImagePrompt(moderation.cleanedPrompt);
    const image = await generateImageWithGemini({
      prompt: imagePrompt,
      aspectRatio: '1:1',
      imageSize: '1K',
      uploadPrefix: 'creatures',
    });
    await updateCreatureModel(creature.id, { image_url: image.imageUrl });

    const tripo = await createCreatureModelTask(image.imageUrl);
    await updateCreatureModel(creature.id, { tripo_task_id: tripo.taskId });

    chargedPlayerId = null;
    chargedAmount = 0;

    return res.status(200).json({
      creatureId: creature.id,
      status: 'generating',
      imageUrl: image.imageUrl,
      quarksPaid: cost,
      newBalance,
    });
  } catch (err) {
    console.error('[creatures/generate] Error:', err);
    if (createdCreatureId) {
      try {
        await updateCreatureModel(createdCreatureId, { status: 'failed' });
      } catch (updateErr) {
        console.error('[creatures/generate] Failed to mark creature as failed:', updateErr);
      }
    }
    if (chargedPlayerId && chargedAmount > 0) {
      try {
        await creditQuarks(chargedPlayerId, chargedAmount);
      } catch (refundErr) {
        console.error('[creatures/generate] Refund failed:', refundErr);
      }
    }
    const message = err instanceof Error ? err.message : 'Creature generation failed';
    const isConfigError = message.includes('TRIPO_API_KEY') || message.includes('GEMINI_API_KEY');
    const isDbMigrationError = message.includes('creature_models') || message.includes('relation') || message.includes('does not exist');
    return res.status(isConfigError || isDbMigrationError ? 503 : 500).json({
      error: isConfigError
        ? 'Creature generation is not configured on the server'
        : isDbMigrationError
          ? 'Creature generation database migration is not installed'
          : 'Creature generation failed. Quarks were refunded.',
      refunded: Boolean(chargedPlayerId && chargedAmount > 0),
    });
  }
}
