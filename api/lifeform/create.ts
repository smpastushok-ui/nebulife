import type { VercelRequest, VercelResponse } from '@vercel/node';
import { deductQuarks, creditQuarks, saveLifeform } from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { LIFEFORM_CREATE_RECIPE } from '@nebulife/core';
import type { DiscoveryRarity } from '@nebulife/core';

const VALID_RARITIES: DiscoveryRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

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
    const { playerId, rarity, systemId, planetId } = req.body;

    if (!playerId || !rarity) {
      return res.status(400).json({ error: 'Missing required fields: playerId, rarity' });
    }
    if (playerId !== auth.playerId) {
      return res.status(403).json({ error: 'Forbidden: player mismatch' });
    }
    if (!VALID_RARITIES.includes(rarity)) {
      return res.status(400).json({ error: 'Invalid rarity' });
    }

    const cost = LIFEFORM_CREATE_RECIPE[rarity as DiscoveryRarity].quarks;

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

    const id = `lf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const lifeform = await saveLifeform({
      id,
      playerId,
      systemId: typeof systemId === 'string' ? systemId : null,
      planetId: typeof planetId === 'string' ? planetId : null,
      source: 'created',
      rarity,
      isBundle: rarity === 'common',
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
