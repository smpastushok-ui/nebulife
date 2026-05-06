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
  /** Always -1 for Premium A.S.T.R.A. access. */
  tokensRemaining: number;
  limitReached: boolean;
  isPro?: boolean;
  hourlyMessagesUsed?: number;
  hourlyMessagesLimit?: number;
}

/**
 * Send a message to A.S.T.R.A. and get a response.
 * Premium-only A.S.T.R.A. chat. Premium and hourly quota are enforced server-side.
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
