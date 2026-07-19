import { authFetch } from '../auth/api-client.js';

const API_BASE = '/api';

export interface PlayerFeedbackPayload {
  likesText: string;
  dislikesText: string;
  level: number;
  language: string;
  source?: 'survey' | 'weaver';
}

export type FeedbackApiErrorCode =
  | 'auth_required'
  | 'player_not_found'
  | 'level_too_low'
  | 'empty_feedback'
  | 'rate_limited'
  | 'duplicate_in_progress'
  | 'server_error'
  | 'network_error';

export class FeedbackApiError extends Error {
  constructor(
    public readonly code: FeedbackApiErrorCode,
    public readonly status: number,
  ) {
    super(code);
    this.name = 'FeedbackApiError';
  }
}

export function mapFeedbackError(status: number, body: unknown): FeedbackApiErrorCode {
  const value = body && typeof body === 'object'
    ? body as { error?: unknown }
    : {};
  const rawCode = typeof value.error === 'object' && value.error !== null && 'code' in value.error
    ? String((value.error as { code?: unknown }).code)
    : typeof value.error === 'string'
      ? value.error
      : '';

  if (status === 401) return 'auth_required';
  if (status === 404 || rawCode === 'player_not_found') return 'player_not_found';
  if (status === 429 || rawCode === 'rate_limited') return 'rate_limited';
  if (status === 409 || rawCode === 'duplicate_in_progress') return 'duplicate_in_progress';
  if (rawCode === 'level_too_low') return 'level_too_low';
  if (rawCode === 'empty_feedback') return 'empty_feedback';
  return 'server_error';
}

/** Submit either the level survey or the all-level Weaver support message. */
export async function submitPlayerFeedback(
  payload: PlayerFeedbackPayload,
  idempotencyKey?: string,
): Promise<void> {
  let res: Response;
  try {
    res = await authFetch(`${API_BASE}/feedback/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new FeedbackApiError('network_error', 0);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new FeedbackApiError(mapFeedbackError(res.status, body), res.status);
  }
}
