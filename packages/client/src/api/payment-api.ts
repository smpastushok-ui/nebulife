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
