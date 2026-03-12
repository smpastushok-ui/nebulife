import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { checkCallsignAvailable, setCallsign } from '../../packages/server/src/db.js';

const CALLSIGN_RE = /^[a-zA-Z0-9_-]{3,20}$/;

/**
 * POST /api/auth/set-callsign
 *
 * Auth: Bearer <firebase-id-token>
 * Body: { callsign: string }
 *
 * Sets the player's unique callsign. Also updates `name` for backward compatibility.
 * Returns: PlayerRow
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const { callsign } = req.body;
    if (!callsign || typeof callsign !== 'string') {
      return res.status(400).json({ error: 'Missing callsign field' });
    }

    if (!CALLSIGN_RE.test(callsign)) {
      return res.status(400).json({
        error: 'Позивний має бути 3-20 символів (латиниця, цифри, _ або -)',
      });
    }

    // Check uniqueness
    const available = await checkCallsignAvailable(callsign);
    if (!available) {
      return res.status(409).json({ error: 'Позивний вже зайнятий' });
    }

    const updated = await setCallsign(auth.playerId, callsign);
    if (!updated) {
      return res.status(404).json({ error: 'Player not found' });
    }

    return res.status(200).json(updated);
  } catch (err) {
    console.error('Set callsign error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
