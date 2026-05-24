// ---------------------------------------------------------------------------
// Payment — Client-side wrapper for MonoPay (Monobank Acquiring)
// ---------------------------------------------------------------------------
// Supports quark top-up via MonoPay (web only).
// ---------------------------------------------------------------------------

import { authFetch } from '../auth/api-client.js';

const API_BASE = '/api';

/**
 * Open Monobank payment page in a new window/tab.
 */
export function openMonoPayCheckout(payUrl: string): void {
  window.open(payUrl, '_blank');
}

// ---------------------------------------------------------------------------
// Top-up — Buy quarks directly
// ---------------------------------------------------------------------------

export interface TopUpRequest {
  playerId: string;
  amount: number;
}

export interface TopUpResponse {
  reference: string;
  invoiceId: string;
  payUrl: string;
}

export type WebPremiumPlanId = 'monthly' | 'yearly' | 'lifetime';

export interface WebPremiumPlan {
  id: WebPremiumPlanId;
  productId: string;
  amountUah: number;
}

export interface WebAccessResponse {
  allowed: boolean;
  reason: 'allowed' | 'premium_required' | 'email_mismatch' | string;
  premiumSource?: string | null;
  expiresAt?: string | null;
  plans: WebPremiumPlan[];
}

export interface PremiumPaymentResponse {
  reference: string;
  invoiceId: string;
  payUrl: string;
}

/**
 * Create a top-up invoice to buy quarks.
 * Opens MonoPay page for the specified amount.
 */
export async function startTopUpFlow(req: TopUpRequest): Promise<void> {
  const res = await authFetch(`${API_BASE}/payment/topup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Top-up failed: ${res.status}`);
  }

  const data: TopUpResponse = await res.json();
  openMonoPayCheckout(data.payUrl);
}

export async function fetchWebAccess(): Promise<WebAccessResponse> {
  const res = await authFetch(`${API_BASE}/player/web-access`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Web access failed: ${res.status}`);
  }
  return (await res.json()) as WebAccessResponse;
}

export async function startWebPremiumFlow(planId: WebPremiumPlanId): Promise<PremiumPaymentResponse> {
  const res = await authFetch(`${API_BASE}/payment/premium`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Premium payment failed: ${res.status}`);
  }

  const data = (await res.json()) as PremiumPaymentResponse;
  openMonoPayCheckout(data.payUrl);
  return data;
}
