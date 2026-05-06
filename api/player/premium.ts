import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { getPremiumStatus, updatePlayerPremium } from '../../packages/server/src/db.js';

const PREMIUM_ENTITLEMENT_ID = 'premium';

interface RevenueCatEntitlement {
  expires_date?: string | null;
  product_identifier?: string | null;
}

interface RevenueCatSubscriberResponse {
  subscriber?: {
    entitlements?: Record<string, RevenueCatEntitlement | undefined>;
  };
}

function isEntitlementActive(entitlement: RevenueCatEntitlement | undefined): boolean {
  if (!entitlement) return false;
  if (!entitlement.expires_date) return true;
  return new Date(entitlement.expires_date).getTime() > Date.now();
}

async function fetchRevenueCatPremium(playerId: string): Promise<{
  active: boolean;
  expiresAt: string | null;
  productId: string | null;
}> {
  const secret = process.env.REVENUECAT_SECRET_KEY || process.env.REVENUECAT_API_KEY;
  if (!secret) {
    throw new Error('REVENUECAT_SECRET_KEY is not configured');
  }

  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(playerId)}`, {
    headers: {
      Authorization: `Bearer ${secret}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`RevenueCat status ${response.status}`);
  }

  const data = await response.json() as RevenueCatSubscriberResponse;
  const entitlement = data.subscriber?.entitlements?.[PREMIUM_ENTITLEMENT_ID];
  return {
    active: isEntitlementActive(entitlement),
    expiresAt: entitlement?.expires_date ?? null,
    productId: entitlement?.product_identifier ?? null,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await authenticate(req, res);
  if (!auth) return;

  if (req.method === 'GET') {
    const status = await getPremiumStatus(auth.playerId);
    return res.status(200).json(status);
  }

  if (req.method === 'POST') {
    try {
      const rc = await fetchRevenueCatPremium(auth.playerId);
      const status = await updatePlayerPremium(auth.playerId, {
        active: rc.active,
        expiresAt: rc.expiresAt,
        productId: rc.productId,
        source: 'revenuecat',
      });
      return res.status(200).json(status);
    } catch (err) {
      console.error('[premium] RevenueCat sync failed:', err);
      return res.status(503).json({ error: 'premium_sync_failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
