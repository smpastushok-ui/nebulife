import type { PlayerRow, PremiumStatus } from './db.js';
import {
  getPlayer,
  getPremiumStatus,
  markPremiumWebInviteSent,
  updatePlayerPremium,
  updatePlayerPremiumWebAccessEmail,
  savePremiumEntitlementEvent,
} from './db.js';
import { sendWebAccessEmail } from './email-client.js';

export type PremiumPlanId = 'monthly' | 'yearly' | 'lifetime';

export interface WebPremiumPlan {
  id: PremiumPlanId;
  productId: string;
  purpose: string;
  amountUah: number;
  duration: 'monthly' | 'yearly' | 'lifetime';
}

const PREMIUM_ENTITLEMENT_ID = 'premium';

export const PREMIUM_PRODUCT_IDS = {
  monthly: 'nebulife_pro_monthly',
  yearly: 'nebulife_pro_yearly',
  lifetime: 'nebulife_pro_lifetime',
} as const;

export const WEB_PREMIUM_PLANS: Record<PremiumPlanId, WebPremiumPlan> = {
  monthly: {
    id: 'monthly',
    productId: PREMIUM_PRODUCT_IDS.monthly,
    purpose: 'premium_web_monthly',
    amountUah: Number(process.env.WEB_PREMIUM_MONTHLY_UAH ?? 199),
    duration: 'monthly',
  },
  yearly: {
    id: 'yearly',
    productId: PREMIUM_PRODUCT_IDS.yearly,
    purpose: 'premium_web_yearly',
    amountUah: Number(process.env.WEB_PREMIUM_YEARLY_UAH ?? 1499),
    duration: 'yearly',
  },
  lifetime: {
    id: 'lifetime',
    productId: PREMIUM_PRODUCT_IDS.lifetime,
    purpose: 'premium_web_lifetime',
    amountUah: Number(process.env.WEB_PREMIUM_LIFETIME_UAH ?? 3999),
    duration: 'lifetime',
  },
};

export function getWebPremiumPlans(): WebPremiumPlan[] {
  return Object.values(WEB_PREMIUM_PLANS);
}

export function getWebPremiumPlan(planId: unknown): WebPremiumPlan | null {
  if (planId !== 'monthly' && planId !== 'yearly' && planId !== 'lifetime') return null;
  return WEB_PREMIUM_PLANS[planId];
}

export function getWebPremiumPlanByPurpose(purpose: string): WebPremiumPlan | null {
  return getWebPremiumPlans().find((plan) => plan.purpose === purpose) ?? null;
}

export function isPremiumActive(status: PremiumStatus): boolean {
  return status.active && (!status.expiresAt || new Date(status.expiresAt).getTime() > Date.now());
}

/** Temporary bypass for web demo / video capture. Set WEB_ACCESS_OPEN=1 on Vercel. */
export function isWebAccessTemporarilyOpen(): boolean {
  const flag = process.env.WEB_ACCESS_OPEN;
  return flag === '1' || flag === 'true';
}

export function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

export function hasMatchingWebAccessEmail(player: PlayerRow, authEmail: string | undefined): boolean {
  const loginEmail = normalizeEmail(authEmail);
  if (!loginEmail) return false;
  const playerEmail = normalizeEmail(player.email);
  const webAccessEmail = normalizeEmail(player.premium_web_access_email);
  return loginEmail === playerEmail || loginEmail === webAccessEmail;
}

export async function grantWebPremium(opts: {
  playerId: string;
  email?: string | null;
  plan: WebPremiumPlan;
  reference: string;
  invoiceId?: string | null;
}): Promise<PremiumStatus> {
  const expiresAt = getPlanExpiresAt(opts.plan);
  const status = await updatePlayerPremium(opts.playerId, {
    active: true,
    expiresAt,
    productId: opts.plan.productId,
    source: 'web_monobank',
  });
  await updatePlayerPremiumWebAccessEmail(opts.playerId, normalizeEmail(opts.email));
  await savePremiumEntitlementEvent({
    playerId: opts.playerId,
    eventType: 'grant',
    source: 'web_monobank',
    productId: opts.plan.productId,
    expiresAt,
    reference: opts.reference,
    meta: {
      invoiceId: opts.invoiceId ?? null,
      plan: opts.plan.id,
      duration: opts.plan.duration,
      amountUah: opts.plan.amountUah,
    },
  });
  await grantRevenueCatPromotionalEntitlement(opts.playerId, opts.plan.duration, opts.reference);
  return status;
}

export async function syncRevenueCatPremium(playerId: string): Promise<PremiumStatus> {
  const rc = await fetchRevenueCatPremium(playerId);
  const source = rc.store === 'app_store' ? 'revenuecat_app_store'
    : rc.store === 'play_store' ? 'revenuecat_play_store'
      : rc.store === 'promotional' ? 'revenuecat_promotional_web'
        : 'revenuecat';

  const status = await updatePlayerPremium(playerId, {
    active: rc.active,
    expiresAt: rc.expiresAt,
    productId: rc.productId,
    source,
  });

  await savePremiumEntitlementEvent({
    playerId,
    eventType: rc.active ? 'sync_active' : 'sync_inactive',
    source,
    productId: rc.productId,
    expiresAt: rc.expiresAt,
    meta: { store: rc.store },
  });

  if (status.active && (source === 'revenuecat_app_store' || source === 'revenuecat_play_store')) {
    await maybeSendWebAccessInvite(playerId, source);
  }

  return status;
}

export async function getServerPremiumStatus(playerId: string): Promise<PremiumStatus> {
  return getPremiumStatus(playerId);
}

async function maybeSendWebAccessInvite(playerId: string, source: string): Promise<void> {
  const player = await getPlayer(playerId);
  if (!player?.email || player.email_notifications === false || player.premium_web_invite_sent_at) return;
  if (!process.env.RESEND_API_KEY) return;

  const lang = player.preferred_language === 'en' ? 'en' : 'uk';
  await sendWebAccessEmail({
    to: player.email,
    playerName: player.callsign || player.name,
    playerId,
    lang,
  }).then(async () => {
    await updatePlayerPremiumWebAccessEmail(playerId, normalizeEmail(player.email));
    await markPremiumWebInviteSent(playerId);
    await savePremiumEntitlementEvent({
      playerId,
      eventType: 'web_invite_sent',
      source,
      meta: { email: normalizeEmail(player.email) },
    });
  }).catch(async (err) => {
    console.warn('[premium] Web access invite failed:', err);
    await savePremiumEntitlementEvent({
      playerId,
      eventType: 'web_invite_failed',
      source,
      meta: { error: err instanceof Error ? err.message : String(err) },
    });
  });
}

interface RevenueCatEntitlement {
  expires_date?: string | null;
  product_identifier?: string | null;
  store?: string | null;
}

interface RevenueCatSubscriberResponse {
  subscriber?: {
    entitlements?: Record<string, RevenueCatEntitlement | undefined>;
  };
}

async function fetchRevenueCatPremium(playerId: string): Promise<{
  active: boolean;
  expiresAt: string | null;
  productId: string | null;
  store: string | null;
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
  const entitlement = findPremiumEntitlement(data.subscriber?.entitlements);
  return {
    active: isRevenueCatEntitlementActive(entitlement),
    expiresAt: entitlement?.expires_date ?? null,
    productId: entitlement?.product_identifier ?? null,
    store: entitlement?.store ?? null,
  };
}

async function grantRevenueCatPromotionalEntitlement(
  playerId: string,
  duration: WebPremiumPlan['duration'],
  reference: string,
): Promise<void> {
  const secret = process.env.REVENUECAT_SECRET_KEY || process.env.REVENUECAT_API_KEY;
  if (!secret) {
    console.warn('[premium] RevenueCat secret missing; web premium granted on server only');
    return;
  }

  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(playerId)}/entitlements/${PREMIUM_ENTITLEMENT_ID}/promotional`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ duration }),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.warn('[premium] RevenueCat promotional grant failed:', response.status, body);
    await savePremiumEntitlementEvent({
      playerId,
      eventType: 'revenuecat_grant_failed',
      source: 'web_monobank',
      reference,
      meta: { duration, status: response.status, body: body.slice(0, 1000) },
    });
    return;
  }

  await savePremiumEntitlementEvent({
    playerId,
    eventType: 'revenuecat_grant',
    source: 'revenuecat_promotional_web',
    reference,
    meta: { duration },
  });
}

function isPremiumProductId(productId: string | null | undefined): boolean {
  return !!productId && Object.values(PREMIUM_PRODUCT_IDS).includes(productId as typeof PREMIUM_PRODUCT_IDS[keyof typeof PREMIUM_PRODUCT_IDS]);
}

function isRevenueCatEntitlementActive(entitlement: RevenueCatEntitlement | undefined): boolean {
  if (!entitlement) return false;
  if (entitlement.product_identifier && !isPremiumProductId(entitlement.product_identifier)) {
    return false;
  }
  if (!entitlement.expires_date) return true;
  return new Date(entitlement.expires_date).getTime() > Date.now();
}

function findPremiumEntitlement(
  entitlements: Record<string, RevenueCatEntitlement | undefined> | undefined,
): RevenueCatEntitlement | undefined {
  if (!entitlements) return undefined;
  const direct = entitlements[PREMIUM_ENTITLEMENT_ID];
  if (isRevenueCatEntitlementActive(direct)) return direct;
  return Object.values(entitlements).find((entitlement) => isRevenueCatEntitlementActive(entitlement));
}

function getPlanExpiresAt(plan: WebPremiumPlan): string | null {
  if (plan.duration === 'lifetime') return null;
  if (plan.duration === 'yearly') return addYearsIso(1);
  return addMonthsIso(1);
}

function addMonthsIso(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
}

function addYearsIso(years: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString();
}
