import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkCallsignAvailable } from '../../packages/server/src/db.js';

const CALLSIGN_RE = /^[a-zA-Z0-9_-]{3,20}$/;

/**
 * GET /api/auth/check-callsign?callsign=xxx
 *
 * Public endpoint — checks if a callsign is available.
 * Returns: { available: boolean, error?: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const callsign = req.query.callsign as string;
    if (!callsign) {
      return res.status(400).json({ error: 'Missing callsign parameter' });
    }

    if (!CALLSIGN_RE.test(callsign)) {
      return res.status(200).json({
        available: false,
        error: 'Позивний має бути 3-20 символів (латиниця, цифри, _ або -)',
      });
    }

    const available = await checkCallsignAvailable(callsign);
    return res.status(200).json({ available });
  } catch (err) {
    console.error('Check callsign error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
