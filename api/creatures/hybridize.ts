import type { VercelRequest, VercelResponse } from '@vercel/node';
// Pure game logic (costs + deterministic trait mix) comes straight from
// @nebulife/core — the server package does not re-export it.
import {
  HYBRID_PHOTO_COST_QUARKS,
  HYBRID_FULL_COST_QUARKS,
  pickHybridTraits,
  seedFromString,
  type TraitMutation,
} from '@nebulife/core';
import {
  authenticate,
  createHybridCreature,
  MAX_CREATURES_PER_PLANET,
  creditQuarks,
  deductQuarks,
  getCreatureModel,
  listCreaturesByPlanet,
  updateCreatureModel,
  generateImageWithGeminiFromImages,
  generateCreatureLore,
  createCreatureModelTask,
  buildHybridDescription,
  buildHybridImagePrompt,
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
  same_creature: 'Pick two different creatures',
  different_planets: 'Both parents must live on the same planet',
  parent_not_ready: 'Both parents must be fully settled creatures',
  legacy_parent: 'Legacy creatures cannot be hybridized',
  no_parent_photo: 'Both parents need a reference portrait',
  planet_full: `Planet already has the maximum of ${MAX_CREATURES_PER_PLANET} creatures`,
};

/**
 * POST /api/creatures/hybridize
 *
 * Auth: Bearer token (Firebase)
 * Body: { parentAId: string, parentBId: string, tier: 'photo' | 'full' }
 *
 * "Дослід схрещування" — fuses two same-planet non-legacy creatures. Both
 * parents' portraits are sent as image inputs to the Gemini image model
 * (multi-image editing) with a fusion prompt built from the deterministic
 * trait mix (seed = both creature ids, sorted — A×B === B×A).
 *
 * Tiers (server-enforced, refund-on-failure like generate.ts):
 * - 'photo' (15⚛): hybrid portrait only — row lands on status 'photo_ready',
 *   takes no planet slot, upgradeable later via /api/creatures/hybrid-upgrade.
 * - 'full' (60⚛): portrait + Tripo image-to-model; counts toward the
 *   3-per-planet active limit; client polls /api/creatures/status as usual.
 *
 * Returns: { creatureId, status, photoUrl?, traits, quarksPaid, newBalance? }
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
  let createdHybridId: string | null = null;

  try {
    const parentAId = typeof req.body?.parentAId === 'string' ? req.body.parentAId : '';
    const parentBId = typeof req.body?.parentBId === 'string' ? req.body.parentBId : '';
    const tier = req.body?.tier === 'full' ? 'full' : req.body?.tier === 'photo' ? 'photo' : null;
    if (!parentAId || !parentBId || !tier) {
      return res.status(400).json({ error: 'Missing required fields: parentAId, parentBId, tier (photo|full)' });
    }
    if (parentAId === parentBId) {
      return res.status(400).json({ error: REASON_MESSAGES.same_creature, reason: 'same_creature' });
    }

    // Pre-checks (createHybridCreature revalidates atomically before insert).
    const [parentA, parentB] = await Promise.all([
      getCreatureModel(parentAId),
      getCreatureModel(parentBId),
    ]);
    if (!parentA || !parentB) {
      return res.status(404).json({ error: REASON_MESSAGES.not_found, reason: 'not_found' });
    }
    if (parentA.player_id !== auth.playerId || parentB.player_id !== auth.playerId) {
      return res.status(403).json({ error: REASON_MESSAGES.forbidden, reason: 'forbidden' });
    }
    if (parentA.planet_id !== parentB.planet_id) {
      return res.status(400).json({ error: REASON_MESSAGES.different_planets, reason: 'different_planets' });
    }
    if (parentA.status !== 'ready' || parentB.status !== 'ready') {
      return res.status(400).json({ error: REASON_MESSAGES.parent_not_ready, reason: 'parent_not_ready' });
    }
    if (parentA.stage === 'legacy' || parentB.stage === 'legacy') {
      return res.status(400).json({ error: REASON_MESSAGES.legacy_parent, reason: 'legacy_parent' });
    }
    if (!parentA.image_url || !parentB.image_url) {
      return res.status(400).json({ error: REASON_MESSAGES.no_parent_photo, reason: 'no_parent_photo' });
    }

    // Only the full (settled) tier occupies a planet slot — photo-only
    // hybrids ('photo_ready') and legacy elders never count.
    if (tier === 'full') {
      const existingOnPlanet = await listCreaturesByPlanet(parentA.planet_id, auth.playerId);
      const activeOnPlanet = existingOnPlanet.filter(
        (c) => c.status !== 'failed' && c.status !== 'photo_ready' && c.stage !== 'legacy',
      );
      if (activeOnPlanet.length >= MAX_CREATURES_PER_PLANET) {
        return res.status(400).json({ error: REASON_MESSAGES.planet_full, reason: 'planet_full' });
      }
    }

    const traits: TraitMutation[] = pickHybridTraits(
      parentA.id,
      parentB.id,
      parentA.traits as TraitMutation[] | null,
      parentB.traits as TraitMutation[] | null,
    );
    const description = buildHybridDescription(parentA.description, parentB.description, traits);

    const cost = tier === 'photo' ? HYBRID_PHOTO_COST_QUARKS : HYBRID_FULL_COST_QUARKS;
    const paid = await deductQuarks(auth.playerId, cost);
    if (!paid) {
      return res.status(402).json({ error: 'Insufficient quarks', required: cost });
    }
    chargedPlayerId = auth.playerId;
    chargedAmount = cost;
    const newBalance = paid.quarks;

    const hybridId = `creature_${auth.playerId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const created = await createHybridCreature({
      hybridId,
      playerId: auth.playerId,
      parentAId: parentA.id,
      parentBId: parentB.id,
      description,
      quarksPaid: cost,
    });
    if (!created.ok) {
      // Parent state changed between our checks and the insert (race) — refund and bail.
      await creditQuarks(chargedPlayerId, chargedAmount);
      chargedPlayerId = null;
      chargedAmount = 0;
      const status = created.reason === 'not_found' ? 404 : created.reason === 'forbidden' ? 403 : 400;
      return res.status(status).json({ error: REASON_MESSAGES[created.reason] ?? created.reason, reason: created.reason });
    }
    createdHybridId = created.hybrid.id;

    // Multi-image fusion and bilingual profile generation run concurrently.
    // The player-facing profile is persisted once on this row and survives
    // all later Tripo status polling / photo-to-3D upgrade transitions.
    const elementSymbols = [parentA, parentB].flatMap((parent) =>
      Array.isArray(parent.traits)
        ? parent.traits
          .filter((trait): trait is { category: string; trait: string } =>
            Boolean(trait) && typeof trait === 'object'
            && typeof (trait as { category?: unknown }).category === 'string'
            && typeof (trait as { trait?: unknown }).trait === 'string')
          .filter((trait) => trait.category === 'element')
          .map((trait) => trait.trait)
        : []);
    const [image, lore] = await Promise.all([
      generateImageWithGeminiFromImages({
        prompt: buildHybridImagePrompt(traits),
        imageUrls: [parentA.image_url, parentB.image_url],
        aspectRatio: '1:1',
        imageSize: '1K',
        uploadPrefix: 'creatures',
      }),
      generateCreatureLore({
        designBrief: description,
        fallbackSymbols: [...new Set(elementSymbols)].slice(0, 4),
        fallbackBiome: null,
        seed: seedFromString(created.hybrid.id),
        kindLabel: 'a coherent hybrid descendant of two established Biosphere organisms',
      }),
    ]);
    await updateCreatureModel(created.hybrid.id, {
      image_url: image.imageUrl,
      hybrid_photo_url: image.imageUrl,
      lore,
    });

    if (tier === 'photo') {
      await updateCreatureModel(created.hybrid.id, {
        status: 'photo_ready',
        completed_at: new Date().toISOString(),
      });
      chargedPlayerId = null;
      chargedAmount = 0;
      return res.status(200).json({
        creatureId: created.hybrid.id,
        status: 'photo_ready',
        photoUrl: image.imageUrl,
        lore,
        traits,
        quarksPaid: cost,
        newBalance,
      });
    }

    const tripo = await createCreatureModelTask(image.imageUrl);
    await updateCreatureModel(created.hybrid.id, { tripo_task_id: tripo.taskId });

    chargedPlayerId = null;
    chargedAmount = 0;

    return res.status(200).json({
      creatureId: created.hybrid.id,
      status: 'generating',
      photoUrl: image.imageUrl,
      lore,
      traits,
      quarksPaid: cost,
      newBalance,
    });
  } catch (err) {
    console.error('[creatures/hybridize] Error:', err);
    if (createdHybridId) {
      try {
        await updateCreatureModel(createdHybridId, { status: 'failed' });
      } catch (updateErr) {
        console.error('[creatures/hybridize] Failed to mark hybrid as failed:', updateErr);
      }
    }
    if (chargedPlayerId && chargedAmount > 0) {
      try {
        await creditQuarks(chargedPlayerId, chargedAmount);
      } catch (refundErr) {
        console.error('[creatures/hybridize] Refund failed:', refundErr);
      }
    }
    if (isMissingCreatureModelsTable(err)) {
      return res.status(503).json({ error: 'Creature hybridization database migration is not installed', refunded: Boolean(chargedPlayerId && chargedAmount > 0) });
    }
    const message = err instanceof Error ? err.message : 'Hybridization failed';
    const isConfigError = message.includes('TRIPO_API_KEY') || message.includes('GEMINI_API_KEY');
    return res.status(isConfigError ? 503 : 500).json({
      error: isConfigError ? 'Creature generation is not configured on the server' : 'Hybridization failed. Quarks were refunded.',
      refunded: Boolean(chargedPlayerId && chargedAmount > 0),
    });
  }
}
