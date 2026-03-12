import { getIdToken } from './auth-service.js';

// ---------------------------------------------------------------------------
// Authenticated fetch wrapper — attaches Firebase ID token to every request
// ---------------------------------------------------------------------------

/**
 * Fetch wrapper that automatically includes Authorization: Bearer <token>.
 * Drop-in replacement for `fetch()` in API client files.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getIdToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
}
