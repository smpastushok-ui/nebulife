import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPlayer, creditQuarks } from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { RATE_LIMITS } from '../../packages/server/src/rate-limiter.js';

/**
 * POST /api/iap/grant
 *
 * Auth: Bearer token (Firebase)
 * Body: { playerId: string, quarks: number, productId: string, purchaseToken: string }
 *
 * Called by the client after a successful RevenueCat / App Store / Google Play purchase.
 * RevenueCat validates receipts with Apple and Google before the purchase succeeds on the client,
 * so we trust the client report here (for production consider adding RevenueCat server-to-server
 * webhook verification via REVENUECAT_WEBHOOK_SECRET env var).
 *
 * Returns: { quarksGranted: number, newBalance: number }
 */

// Valid quark amounts that can be purchased (must match product IDs in stores)
const VALID_QUARKS: Record<string, number> = {
  'nebulife_quarks_100':  100,
  'nebulife_quarks_500':  500,
  'nebulife_quarks_2000': 2000,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  if (!await RATE_LIMITS.payment(auth.playerId)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  try {
    const { playerId, quarks, productId, purchaseToken } = req.body as {
      playerId?: string;
      quarks?: number;
      productId?: string;
      purchaseToken?: string;
    };

    // Validate required fields
    if (!playerId || !quarks || !productId) {
      return res.status(400).json({ error: 'Missing required fields: playerId, quarks, productId' });
    }

    // Verify the requester owns the player account
    if (playerId !== auth.playerId) {
      return res.status(403).json({ error: 'Forbidden: player mismatch' });
    }

    // Verify the quark amount matches the product
    const expectedQuarks = VALID_QUARKS[productId];
    if (!expectedQuarks) {
      return res.status(400).json({ error: `Unknown product: ${productId}` });
    }
    if (Number(quarks) !== expectedQuarks) {
      return res.status(400).json({ error: 'Quarks amount mismatch for product' });
    }

    // Verify player exists
    const player = await getPlayer(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Credit quarks
    const updated = await creditQuarks(playerId, expectedQuarks);

    console.log(`[IAP] Granted ${expectedQuarks} quarks to ${playerId} for ${productId} (token: ${purchaseToken ?? 'n/a'})`);

    return res.status(200).json({ quarksGranted: expectedQuarks, newBalance: updated.quarks });
  } catch (err) {
    console.error('[IAP] Grant error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
