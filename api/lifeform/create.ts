import type { VercelRequest, VercelResponse } from '@vercel/node';
import { deductQuarks, creditQuarks, saveLifeform } from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { LIFEFORM_CREATE_RECIPE, GENESIS_COMPLEXITY_RECIPE, LIFE_SPARK_TYPES, synthesizeGenesisGenome } from '@nebulife/core';
import type { DiscoveryRarity, LifeComplexityTier, LifeSparkType } from '@nebulife/core';

const VALID_RARITIES: DiscoveryRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const VALID_COMPLEXITIES: LifeComplexityTier[] = ['microbial', 'flora', 'fauna', 'exotic'];

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function successRoll(seed: number, playerId: string): number {
  const mixed = (Math.floor(seed) ^ hashString(playerId) ^ 0x6a09e667) >>> 0;
  return ((mixed * 1664525 + 1013904223) >>> 0) / 0xffffffff;
}

function sanitizeElements(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!/^[A-Z][a-z]?$/.test(key)) continue;
    const amount = Math.floor(Number(raw));
    if (Number.isFinite(amount) && amount > 0 && amount <= 999) out[key] = amount;
  }
  return out;
}

function sanitizeSparks(value: unknown): Partial<Record<LifeSparkType, number>> {
  if (!value || typeof value !== 'object') return {};
  const out: Partial<Record<LifeSparkType, number>> = {};
  for (const spark of LIFE_SPARK_TYPES) {
    const amount = Math.floor(Number((value as Record<string, unknown>)[spark]));
    if (Number.isFinite(amount) && amount > 0 && amount <= 20) out[spark] = amount;
  }
  return out;
}

/**
 * POST /api/lifeform/create
 *
 * Auth: Bearer token (Firebase)
 * Body: { playerId, rarity, systemId?, planetId? }
 * Returns: { lifeform, quarksRemaining }
 *
 * Genesis Lab synthesis. Deducts the rarity's quark cost server-side and
 * creates a lifeform with source 'created'. Ingredient spend is tracked
 * client-side (game_state.life_ingredients) and must be validated there.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  let deductedCost = 0;
  let deductedPlayerId: string | null = null;

  try {
    const { playerId, rarity, systemId, planetId, complexity, planetSeed, elements, sparks } = req.body;

    if (!playerId || !rarity) {
      return res.status(400).json({ error: 'Missing required fields: playerId, rarity' });
    }
    if (playerId !== auth.playerId) {
      return res.status(403).json({ error: 'Forbidden: player mismatch' });
    }
    if (!VALID_RARITIES.includes(rarity)) {
      return res.status(400).json({ error: 'Invalid rarity' });
    }

    const hasGenesisPayload = typeof complexity === 'string' || elements || sparks;
    let finalRarity = rarity as DiscoveryRarity;
    let speciesName: string | null = null;
    let promptUsed: string | null = null;
    let genomeSeed = Date.now();

    if (hasGenesisPayload) {
      if (!VALID_COMPLEXITIES.includes(complexity)) {
        return res.status(400).json({ error: 'Invalid complexity' });
      }
      const cleanElements = sanitizeElements(elements);
      if (Object.keys(cleanElements).length < 2) {
        return res.status(400).json({ error: 'At least two elements are required' });
      }
      const cleanSparks = sanitizeSparks(sparks);
      const requiredSparks = GENESIS_COMPLEXITY_RECIPE[complexity as LifeComplexityTier].sparks;
      for (const [spark, needed] of Object.entries(requiredSparks)) {
        if ((cleanSparks[spark as LifeSparkType] ?? 0) < (needed ?? 0)) {
          return res.status(400).json({ error: 'Missing Spark of Life requirement' });
        }
      }
      const genome = synthesizeGenesisGenome({
        elements: cleanElements,
        sparks: cleanSparks,
        complexity: complexity as LifeComplexityTier,
        planetSeed: Number.isFinite(Number(planetSeed)) ? Number(planetSeed) : (typeof planetId === 'string' ? hashString(planetId) : hashString(playerId)),
        labLevel: 1,
        vaultLevel: 1,
      });
      finalRarity = genome.rarity;
      speciesName = genome.speciesName;
      genomeSeed = genome.seed;
      promptUsed = JSON.stringify({
        source: 'genesis_ark',
        genome,
        elements: cleanElements,
        sparks: cleanSparks,
      });
      if (successRoll(genome.seed, playerId) > genome.successChance) {
        return res.status(200).json({ lifeform: null, quarksRemaining: null, synthesisFailed: true });
      }
    }

    const cost = LIFEFORM_CREATE_RECIPE[finalRarity].quarks;

    let quarksRemaining: number | null = null;
    if (cost > 0) {
      const player = await deductQuarks(playerId, cost);
      if (!player) {
        return res.status(402).json({ error: 'Insufficient quarks', required: cost });
      }
      deductedCost = cost;
      deductedPlayerId = playerId;
      quarksRemaining = player.quarks;
    }

    const id = `lf_${Date.now()}_${(genomeSeed >>> 0).toString(36).slice(0, 8)}`;
    const lifeform = await saveLifeform({
      id,
      playerId,
      systemId: typeof systemId === 'string' ? systemId : null,
      planetId: typeof planetId === 'string' ? planetId : null,
      source: 'created',
      rarity: finalRarity,
      speciesName,
      promptUsed,
      isBundle: false,
    });

    return res.status(200).json({ lifeform, quarksRemaining });
  } catch (err) {
    console.error('Lifeform create error:', err);
    if (deductedPlayerId && deductedCost > 0) {
      try {
        const refunded = await creditQuarks(deductedPlayerId, deductedCost);
        return res.status(500).json({
          error: err instanceof Error ? err.message : 'Internal error',
          refunded: true,
          quarksRemaining: refunded.quarks,
        });
      } catch { /* ignore */ }
    }
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
