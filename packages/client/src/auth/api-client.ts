import { Capacitor } from '@capacitor/core';
import { getIdToken } from './auth-service.js';

// ---------------------------------------------------------------------------
// Authenticated fetch wrapper — attaches Firebase ID token to every request
// ---------------------------------------------------------------------------

/**
 * On web (browser / PWA) API requests go to the same origin with relative
 * paths ('/api/...'). On native Capacitor (Android / iOS) the bundle is
 * served from `https://localhost/` inside a WebView, so relative '/api/...'
 * would fail. Prefix with the production host in that case.
 *
 * Override with VITE_API_BASE_URL at build time if the backend lives
 * somewhere else (e.g. a staging deploy).
 */
const PROD_API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'https://www.nebulife.space';

export function resolveApiUrl(url: string): string {
  // Absolute URLs pass through unchanged
  if (/^https?:\/\//i.test(url)) return url;
  if (Capacitor.isNativePlatform()) {
    return `${PROD_API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return url;
}

/** Unauthenticated fetch wrapper that still prefixes the native host. */
export function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(resolveApiUrl(url), options);
}

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
  return fetch(resolveApiUrl(url), { ...options, headers });
}
