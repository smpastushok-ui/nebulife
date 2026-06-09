import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getPlayer,
  creditQuarks,
  acquireIdempotencyKey,
  completeIdempotencyKey,
  releaseIdempotencyKey,
  logIapGrantFailure,
} from '../../packages/server/src/db.js';
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
 * Safety:
 *  - Idempotent: keyed on the store transaction id (purchaseToken) so the SAME
 *    purchase can never double-credit, even across client retries. A duplicate
 *    that already completed replays the original response.
 *  - Durable failure log: if the store charged the player but we fail to credit
 *    (the dangerous case), the attempt is recorded in `iap_grant_failures` so it
 *    can be found and manually compensated. The idempotency key is released so a
 *    legitimate retry re-attempts the credit.
 *
 * Returns: { quarksGranted: number, newBalance: number }
 */

// Valid quark amounts that can be purchased (must match product IDs in stores)
const VALID_QUARKS: Record<string, number> = {
  'nebulife_quarks_100':  100,
  'nebulife_quarks_500':  500,
  'nebulife_quarks_2000': 2000,
};

const ENDPOINT = '/api/iap/grant';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  if (!await RATE_LIMITS.payment(auth.playerId)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { playerId, quarks, productId, purchaseToken } = req.body as {
    playerId?: string;
    quarks?: number;
    productId?: string;
    purchaseToken?: string;
  };

  // Validate required fields
  if (!playerId || !quarks || !productId) {
    await logIapGrantFailure({
      playerId: playerId ?? auth.playerId,
      productId,
      quarks,
      purchaseToken,
      reason: 'missing_fields',
      status: 400,
      detail: 'Missing required fields: playerId, quarks, productId',
    });
    return res.status(400).json({ error: 'Missing required fields: playerId, quarks, productId' });
  }

  // Verify the requester owns the player account
  if (playerId !== auth.playerId) {
    await logIapGrantFailure({
      playerId: auth.playerId,
      productId,
      quarks,
      purchaseToken,
      reason: 'player_mismatch',
      status: 403,
      detail: `body playerId=${playerId} != auth playerId=${auth.playerId}`,
    });
    return res.status(403).json({ error: 'Forbidden: player mismatch' });
  }

  // Verify the quark amount matches the product
  const expectedQuarks = VALID_QUARKS[productId];
  if (!expectedQuarks) {
    await logIapGrantFailure({
      playerId,
      productId,
      quarks,
      purchaseToken,
      reason: 'unknown_product',
      status: 400,
      detail: `Unknown product: ${productId}`,
    });
    return res.status(400).json({ error: `Unknown product: ${productId}` });
  }
  if (Number(quarks) !== expectedQuarks) {
    await logIapGrantFailure({
      playerId,
      productId,
      quarks,
      purchaseToken,
      reason: 'amount_mismatch',
      status: 400,
      detail: `Expected ${expectedQuarks}, got ${quarks}`,
    });
    return res.status(400).json({ error: 'Quarks amount mismatch for product' });
  }

  // Idempotency key — prefer the store transaction id so the same store purchase
  // can never double-credit, even if the client retries with a fresh
  // X-Idempotency-Key header. Fall back to the header, then a per-request key.
  const headerKey = typeof req.headers['x-idempotency-key'] === 'string'
    ? req.headers['x-idempotency-key']
    : '';
  const idemKey = purchaseToken
    ? `iap_grant:${productId}:${purchaseToken}`
    : (headerKey || `iap_grant:${auth.playerId}:${Date.now()}`);

  const acquired = await acquireIdempotencyKey(idemKey, auth.playerId, ENDPOINT);
  if (!acquired.acquired) {
    // Already processed — replay the original response without re-crediting.
    if ('record' in acquired && acquired.record?.response_body) {
      return res
        .status(acquired.record.response_status ?? 200)
        .json(acquired.record.response_body);
    }
    // In-flight duplicate (or a colliding key from another player) — tell the
    // client to retry; the original request will produce the credit.
    return res.status(409).json({ error: 'duplicate_in_progress' });
  }

  try {
    // Verify player exists
    const player = await getPlayer(playerId);
    if (!player) {
      const body = { error: 'Player not found' };
      await logIapGrantFailure({
        playerId,
        productId,
        quarks: expectedQuarks,
        purchaseToken,
        reason: 'player_not_found',
        status: 404,
      });
      await completeIdempotencyKey(idemKey, 404, body);
      return res.status(404).json(body);
    }

    // Credit quarks
    const updated = await creditQuarks(playerId, expectedQuarks);
    const body = { quarksGranted: expectedQuarks, newBalance: updated.quarks };
    await completeIdempotencyKey(idemKey, 200, body);

    console.log(`[IAP] Granted ${expectedQuarks} quarks to ${playerId} for ${productId} (token: ${purchaseToken ?? 'n/a'})`);

    return res.status(200).json(body);
  } catch (err) {
    // The store already charged the player but we failed to credit. Record it
    // durably for manual compensation and release the idempotency key so a
    // genuine retry can re-attempt the credit.
    await logIapGrantFailure({
      playerId,
      productId,
      quarks: expectedQuarks,
      purchaseToken,
      reason: 'credit_failed',
      status: 500,
      detail: err instanceof Error ? err.message : String(err),
    });
    await releaseIdempotencyKey(idemKey);
    console.error('[IAP] Grant error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
