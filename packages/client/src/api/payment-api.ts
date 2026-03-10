// ---------------------------------------------------------------------------
// Payment — Client-side wrapper for MonoPay (Monobank Acquiring)
// ---------------------------------------------------------------------------
// Supports both direct quark purchases and MonoPay fallback.
// ---------------------------------------------------------------------------

const API_BASE = '/api';

export interface CreatePaymentRequest {
  playerId: string;
  planetId: string;
  systemId: string;
}

export interface CreatePaymentResponse {
  modelId: string;
  paid: boolean;
  quarksRemaining: number;
  // Only present when paid=false (needs MonoPay):
  deficit?: number;
  invoiceId?: string;
  payUrl?: string;
}

/**
 * Create a payment for 3D planet model generation.
 * If player has enough quarks, deducts instantly (paid=true).
 * If not, returns MonoPay URL for the deficit (paid=false).
 */
export async function createPayment(req: CreatePaymentRequest): Promise<CreatePaymentResponse> {
  const res = await fetch(`${API_BASE}/payment/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Payment creation failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Open Monobank payment page in a new window/tab.
 */
export function openMonoPayCheckout(payUrl: string): void {
  window.open(payUrl, '_blank');
}

/**
 * Full payment flow: check quarks → pay or redirect to MonoPay.
 * Returns { modelId, paidWithQuarks }.
 */
export async function startPaymentFlow(req: CreatePaymentRequest): Promise<{
  modelId: string;
  paidWithQuarks: boolean;
  quarksRemaining: number;
}> {
  const resp = await createPayment(req);

  if (resp.paid) {
    // Paid entirely from quarks, no MonoPay needed
    return { modelId: resp.modelId, paidWithQuarks: true, quarksRemaining: resp.quarksRemaining };
  }

  // Need MonoPay for deficit
  if (resp.payUrl) {
    openMonoPayCheckout(resp.payUrl);
  }

  return { modelId: resp.modelId, paidWithQuarks: false, quarksRemaining: resp.quarksRemaining };
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

/**
 * Create a top-up invoice to buy quarks.
 * Opens MonoPay page for the specified amount.
 */
export async function startTopUpFlow(req: TopUpRequest): Promise<void> {
  const res = await fetch(`${API_BASE}/payment/topup`, {
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
