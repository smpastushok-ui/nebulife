import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { getPlayer } from '../../packages/server/src/db.js';
import {
  getServerPremiumStatus,
  getWebPremiumPlans,
  hasMatchingWebAccessEmail,
  isPremiumActive,
  isWebAccessTemporarilyOpen,
} from '../../packages/server/src/premium-service.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  const player = await getPlayer(auth.playerId);
  if (!player) {
    return res.status(404).json({ error: 'player_not_found' });
  }

  if (isWebAccessTemporarilyOpen()) {
    return res.status(200).json({
      allowed: true,
      reason: 'temporarily_open',
      premiumSource: null,
      expiresAt: null,
      plans: getWebPremiumPlans().map((plan) => ({
        id: plan.id,
        productId: plan.productId,
        amountUah: plan.amountUah,
      })),
    });
  }

  const premium = await getServerPremiumStatus(auth.playerId);
  const emailMatches = hasMatchingWebAccessEmail(player, auth.email);
  const allowed = isPremiumActive(premium) && emailMatches;

  return res.status(200).json({
    allowed,
    reason: allowed
      ? 'allowed'
      : !premium.active
        ? 'premium_required'
        : !emailMatches
          ? 'email_mismatch'
          : 'premium_required',
    premiumSource: premium.source,
    expiresAt: premium.expiresAt,
    plans: getWebPremiumPlans().map((plan) => ({
      id: plan.id,
      productId: plan.productId,
      amountUah: plan.amountUah,
    })),
  });
}
