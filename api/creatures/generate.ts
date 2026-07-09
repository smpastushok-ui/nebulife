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
  createCreatureModelTask,
  CREATURE_GENERATION_COST_QUARKS,
  MAX_CREATURES_PER_PLANET,
  buildCreatureImagePrompt,
  RATE_LIMITS,
} from '@nebulife/server';
import {
  buildExperimentCreatureDescription,
  buildExperimentTraits,
  isCreatureBiome,
  seedFromString,
  validateCreatureElementCombo,
  type CreatureBiome,
} from '@nebulife/core';

export const config = {
  maxDuration: 60,
};

/**
 * POST /api/creatures/generate
 *
 * Auth: Bearer token (Firebase)
 * Body: { planetId: string, elements: string[], biome?: string | null }
 *
 * Element-experiment synthesis: the player never submits free text. The
 * design brief is built deterministically server-side from the whitelisted
 * element combination (order matters — slot 1 body plan, slot 2 surface,
 * slots 3-4 accents), the optional planet biome and a per-creature seed
 * (see @nebulife/core creature-experiment.ts). No moderation step.
 *
 * Pipeline: validate combo -> quark gate (first creature per account free,
 * then CREATURE_GENERATION_COST_QUARKS) -> Gemini reference portrait ->
 * Tripo image_to_model task. Client polls /api/creatures/status for the
 * Tripo -> GLB -> Vercel Blob completion. If the Tripo step itself fails
 * (no credit, outage, bad key) the creature is NOT discarded/refunded — it
 * lands on status 'photo_ready' (2D portrait only, no planet slot), same
 * fallback tier hybridize.ts's 'photo' option produces, upgradeable later
 * via /api/creatures/hybrid-upgrade.
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

    const combo = validateCreatureElementCombo(req.body?.elements);
    if (combo.ok === false) {
      return res.status(400).json({ error: combo.error });
    }

    const rawBiome = req.body?.biome;
    let biome: CreatureBiome | null = null;
    if (rawBiome !== undefined && rawBiome !== null) {
      if (!isCreatureBiome(rawBiome)) {
        return res.status(400).json({ error: `Unknown biome: ${String(rawBiome)}` });
      }
      biome = rawBiome;
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
    // The creature id embeds timestamp + entropy, so seeding from it gives
    // each experiment a fresh (but reproducible from the stored row) result.
    const description = buildExperimentCreatureDescription(
      combo.symbols,
      biome,
      seedFromString(creatureId),
    );
    const creature = await createCreatureModel({
      id: creatureId,
      playerId: auth.playerId,
      planetId,
      description,
      promptUsed: description,
      status: 'generating',
      quarksPaid: cost,
      traits: buildExperimentTraits(combo.symbols),
    });
    createdCreatureId = creature.id;

    const imagePrompt = buildCreatureImagePrompt(description);
    const image = await generateImageWithGemini({
      prompt: imagePrompt,
      aspectRatio: '1:1',
      imageSize: '1K',
      uploadPrefix: 'creatures',
    });
    await updateCreatureModel(creature.id, { image_url: image.imageUrl });

    // The portrait is the valuable, already-paid-for deliverable. If Tripo is
    // unavailable (no credit, outage, invalid key) don't discard it: land the
    // creature on 'photo_ready' instead of failing the whole experiment, the
    // same fallback tier /api/creatures/hybridize already uses for its
    // 'photo' pricing option. The player keeps their creature (2D portrait,
    // no planet slot used) and can retry the 3D upgrade later via
    // /api/creatures/hybrid-upgrade once Tripo is available again.
    chargedPlayerId = null;
    chargedAmount = 0;
    try {
      const tripo = await createCreatureModelTask(image.imageUrl);
      await updateCreatureModel(creature.id, { tripo_task_id: tripo.taskId });
      return res.status(200).json({
        creatureId: creature.id,
        status: 'generating',
        imageUrl: image.imageUrl,
        quarksPaid: cost,
        newBalance,
      });
    } catch (tripoErr) {
      console.warn('[creatures/generate] Tripo task creation failed, falling back to photo_ready:', tripoErr);
      await updateCreatureModel(creature.id, { status: 'photo_ready', completed_at: new Date().toISOString() });
      return res.status(200).json({
        creatureId: creature.id,
        status: 'photo_ready',
        imageUrl: image.imageUrl,
        quarksPaid: cost,
        newBalance,
        reason: 'tripo_unavailable',
      });
    }
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
