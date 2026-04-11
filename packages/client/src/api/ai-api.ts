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

export interface AstraTopupResponse {
  success: boolean;
  tokensGranted: number;
  newQuarkBalance: number;
}

/**
 * Charge A.S.T.R.A. tokens by spending 50 quarks.
 * Deducts 50 quarks and grants 1,000,000 A.S.T.R.A. tokens.
 */
export async function topupAstraTokens(playerId: string): Promise<AstraTopupResponse> {
  const res = await authFetch('/api/ai/topup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Charge error: ${res.status}`);
  }

  return (await res.json()) as AstraTopupResponse;
}
