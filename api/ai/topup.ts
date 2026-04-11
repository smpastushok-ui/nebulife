import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { getPlayer, deductQuarks, addAstraPurchasedTokens } from '../../packages/server/src/db.js';

const ASTRA_CHARGE_COST_QUARKS = 50;
const ASTRA_CHARGE_TOKENS = 1_000_000;

/**
 * POST /api/ai/topup
 *
 * Charge A.S.T.R.A. tokens by spending quarks.
 * Body: { playerId }
 *
 * Deducts 50 quarks and grants 1,000,000 A.S.T.R.A. tokens.
 * Returns: { success: true, tokensGranted, newQuarkBalance }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    const { playerId } = req.body as { playerId?: string };

    if (!playerId) {
      return res.status(400).json({ error: 'Missing playerId' });
    }

    // Verify player owns this playerId
    if (playerId !== auth.playerId) {
      return res.status(403).json({ error: 'Forbidden: player mismatch' });
    }

    const player = await getPlayer(auth.playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const currentQuarks = player.quarks ?? 0;
    if (currentQuarks < ASTRA_CHARGE_COST_QUARKS) {
      return res.status(402).json({
        error: 'insufficient_quarks',
        required: ASTRA_CHARGE_COST_QUARKS,
        current: currentQuarks,
      });
    }

    // Atomically deduct quarks
    const updated = await deductQuarks(auth.playerId, ASTRA_CHARGE_COST_QUARKS);
    if (!updated) {
      return res.status(409).json({ error: 'insufficient_quarks' });
    }

    // Grant A.S.T.R.A. tokens
    await addAstraPurchasedTokens(auth.playerId, ASTRA_CHARGE_TOKENS);

    console.log(`ASTRA topup: ${auth.playerId} -${ASTRA_CHARGE_COST_QUARKS}Q +${ASTRA_CHARGE_TOKENS} tokens`);

    return res.status(200).json({
      success: true,
      tokensGranted: ASTRA_CHARGE_TOKENS,
      newQuarkBalance: updated.quarks,
    });
  } catch (err) {
    console.error('ASTRA topup error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
