import { getIdToken } from './auth-service.js';

// ---------------------------------------------------------------------------
// Authenticated fetch wrapper — attaches Firebase ID token to every request
// ---------------------------------------------------------------------------

/**
 * Fetch wrapper that automatically includes Authorization: Bearer <token>.
 * Drop-in replacement for `fetch()` in API client files.
 */
// Endpoints that need idempotency protection (payment/generation)
const IDEMPOTENT_ENDPOINTS = ['/api/payment/', '/api/surface/', '/api/system-photo/', '/api/system-mission/'];

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getIdToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  // Auto-attach idempotency key for POST to payment/generation endpoints
  const method = (options.method ?? 'GET').toUpperCase();
  if (method === 'POST' && IDEMPOTENT_ENDPOINTS.some(ep => url.startsWith(ep))) {
    if (!headers.has('X-Idempotency-Key')) {
      headers.set('X-Idempotency-Key', crypto.randomUUID());
    }
  }
  return fetch(url, { ...options, headers });
}
