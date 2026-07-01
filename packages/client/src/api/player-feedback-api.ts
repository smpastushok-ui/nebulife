import { authFetch } from '../auth/api-client.js';

const API_BASE = '/api';

export interface PlayerFeedbackPayload {
  likesText: string;
  dislikesText: string;
  level: number;
  language: string;
}

/** Submit the level-12+ "what do you like / dislike" one-shot feedback prompt. */
export async function submitPlayerFeedback(payload: PlayerFeedbackPayload): Promise<void> {
  const res = await authFetch(`${API_BASE}/feedback/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Feedback submit failed: ${res.status}`);
  }
}
