import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { deductQuarks } from '../../packages/server/src/db.js';

/**
 * POST /api/player/spend-quarks
 * Auth: Bearer Firebase token
 * Body: { amount: number; reason: string }
 *
 * Atomically deduct quarks for in-game purchases (e.g. surface hex unlock).
 * Returns: { ok: true, newBalance: number } or 402 if insufficient funds.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const { amount, reason } = req.body as { amount?: number; reason?: string };

    if (!amount || amount <= 0 || !Number.isFinite(amount)) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const updated = await deductQuarks(auth.playerId, amount);

    if (!updated) {
      return res.status(402).json({ error: 'Insufficient quarks' });
    }

    console.log(`[spend-quarks] ${auth.playerId} -${amount} quarks (${reason ?? 'unknown'}), balance: ${updated.quarks}`);

    return res.status(200).json({ ok: true, newBalance: updated.quarks });
  } catch (err) {
    console.error('[spend-quarks] Error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
