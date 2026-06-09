import type { VercelRequest, VercelResponse } from '@vercel/node';
import { saveLifeform } from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

const VALID_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

/**
 * POST /api/lifeform/found
 *
 * Auth: Bearer token (Firebase)
 * Body: { playerId, rarity, systemId?, planetId?, speciesName? }
 * Returns: { lifeform: LifeformRow }
 *
 * Persists a newly found lifeform. Common lifeforms are marked is_bundle
 * (bundled assets, free). Uncommon+ will later request paid Alpha media.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    const { playerId, rarity, systemId, planetId, speciesName, photoUrl, videoUrl } = req.body;

    if (!playerId || !rarity) {
      return res.status(400).json({ error: 'Missing required fields: playerId, rarity' });
    }
    if (playerId !== auth.playerId) {
      return res.status(403).json({ error: 'Forbidden: player mismatch' });
    }
    if (!VALID_RARITIES.includes(rarity)) {
      return res.status(400).json({ error: 'Invalid rarity' });
    }

    const id = `lf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const isBundle = rarity === 'common';

    // Only persist bundled (relative) media URLs for common lifeforms; paid
    // tiers fetch their unique Alpha media separately.
    const isBundledUrl = (u: unknown): u is string =>
      typeof u === 'string' && u.startsWith('/lifeforms/common/');

    const lifeform = await saveLifeform({
      id,
      playerId,
      systemId: typeof systemId === 'string' ? systemId : null,
      planetId: typeof planetId === 'string' ? planetId : null,
      source: 'found',
      rarity,
      speciesName: typeof speciesName === 'string' ? speciesName : null,
      isBundle,
      photoUrl: isBundle && isBundledUrl(photoUrl) ? photoUrl : null,
      videoUrl: isBundle && isBundledUrl(videoUrl) ? videoUrl : null,
    });

    return res.status(200).json({ lifeform });
  } catch (err) {
    console.error('Lifeform found error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
