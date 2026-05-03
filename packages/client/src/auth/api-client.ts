import { getIdToken } from './auth-service.js';
import { Capacitor } from '@capacitor/core';

// ---------------------------------------------------------------------------
// Authenticated fetch wrapper — attaches Firebase ID token to every request.
// On native (Capacitor Android/iOS), prepends production API base because the
// WebView origin is "https://localhost" which does NOT serve our API.
// ---------------------------------------------------------------------------

/** Production API base — used when running inside Capacitor native WebView. */
const PROD_API_BASE = 'https://www.nebulife.space';

/** Endpoints that need idempotency protection (payment/generation). */
const IDEMPOTENT_ENDPOINTS = ['/api/payment/', '/api/iap/', '/api/surface/', '/api/system-photo/', '/api/system-mission/', '/api/ship/'];

/**
 * Resolve a /api/... path to a full URL when running on native.
 * On web (or already-absolute URLs), returns the input unchanged.
 */
export function resolveApiUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url; // already absolute
  if (!url.startsWith('/api/') && !url.startsWith('api/')) return url; // not an API call
  if (!Capacitor.isNativePlatform()) return url; // web → relative is fine
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${PROD_API_BASE}${path}`;
}

/**
 * Plain fetch with native-aware URL resolution. Use for endpoints that
 * don't require auth (e.g. /api/auth/check-callsign).
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(resolveApiUrl(url), options);
}

/**
 * Fetch wrapper that automatically includes Authorization: Bearer <token>.
 * Drop-in replacement for `fetch()` in API client files. Native-aware.
 */
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
