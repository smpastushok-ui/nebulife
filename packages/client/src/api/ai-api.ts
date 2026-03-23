// ---------------------------------------------------------------------------
// A.S.T.R.A. AI API — Client-side wrapper
// ---------------------------------------------------------------------------

import { authFetch } from '../auth/api-client.js';

export interface AstraMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AstraResponse {
  text: string;
  tokensUsed: number;
  tokensRemaining: number;
  limitReached: boolean;
}

/**
 * Send a message to A.S.T.R.A. and get a response.
 */
export async function askAstra(message: string): Promise<AstraResponse> {
  const res = await authFetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `A.S.T.R.A. error: ${res.status}`);
  }

  return (await res.json()) as AstraResponse;
}

/**
 * Create a payment to unlock 10000 A.S.T.R.A. tokens.
 * Returns the Monobank payment URL.
 */
export async function topupAstraTokens(): Promise<string> {
  const res = await authFetch('/api/ai/topup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Payment error: ${res.status}`);
  }

  const data = (await res.json()) as { payUrl: string };
  return data.payUrl;
}
