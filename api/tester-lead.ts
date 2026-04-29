import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID ?? '1VXwgw9etwLIwZO4bwfM4fSzyobl3MFzcQ8mVBZoILj4';
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL ?? 'nebulife-leads-writer@nebulife-403f1.iam.gserviceaccount.com';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUEST_TIMEOUT_MS = 7000;
const MAX_USER_AGENT_LENGTH = 500;
const ALLOWED_ORIGIN_HOSTS = new Set([
  'nebulife.space',
  'www.nebulife.space',
  'nebulife.vercel.app',
  'localhost',
  '127.0.0.1',
]);

type RateBucket = { count: number; resetAt: number };

const rateBuckets = new Map<string, RateBucket>();

function toBase64Url(input: string | Buffer): string {
  return (Buffer.isBuffer(input) ? input : Buffer.from(input)).toString('base64url');
}

function getPrivateKey(): string {
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!key) throw new Error('GOOGLE_PRIVATE_KEY is not configured');
  return key.replace(/\\n/g, '\n');
}

function getClientIp(req: VercelRequest): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  const firstForwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  return (firstForwarded?.split(',')[0] || req.socket.remoteAddress || 'unknown').trim();
}

function isAllowedOrigin(req: VercelRequest): boolean {
  const origin = req.headers.origin;
  if (!origin) return process.env.VERCEL_ENV !== 'production';
  try {
    const hostname = new URL(origin).hostname;
    return ALLOWED_ORIGIN_HOSTS.has(hostname) || hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = rateBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= maxRequests) return false;
  existing.count += 1;
  return true;
}

function cleanupRateBuckets(): void {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) rateBuckets.delete(key);
  }
}

async function fetchWithTimeout(url: string | URL, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function getGoogleAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = toBase64Url(JSON.stringify({
    iss: GOOGLE_CLIENT_EMAIL,
    scope: GOOGLE_SHEETS_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsignedToken = `${header}.${payload}`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(unsignedToken)
    .sign(getPrivateKey())
    .toString('base64url');

  const tokenRes = await fetchWithTimeout(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsignedToken}.${signature}`,
    }),
  });

  const tokenJson = await tokenRes.json() as { access_token?: string; error?: string; error_description?: string };
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error_description || tokenJson.error || 'Google token request failed');
  }
  return tokenJson.access_token;
}

async function appendLeadToSheet(values: string[]): Promise<void> {
  const accessToken = await getGoogleAccessToken();
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/A:E:append`);
  url.searchParams.set('valueInputOption', 'USER_ENTERED');
  url.searchParams.set('insertDataOption', 'INSERT_ROWS');

  const sheetRes = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [values] }),
  });

  if (!sheetRes.ok) {
    const text = await sheetRes.text();
    throw new Error(`Google Sheets append failed: ${text}`);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAllowedOrigin(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!String(req.headers['content-type'] ?? '').toLowerCase().includes('application/json')) {
    return res.status(415).json({ error: 'Unsupported media type' });
  }

  try {
    cleanupRateBuckets();

    if (typeof req.body !== 'object' || req.body == null || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const { email, language, source, website } = req.body as Record<string, unknown>;
    if (typeof website === 'string' && website.trim().length > 0) {
      return res.status(200).json({ ok: true });
    }

    const clientIp = getClientIp(req);
    if (
      !checkRateLimit('global', 80, 60 * 1000) ||
      !checkRateLimit(`ip:${clientIp}`, 5, 60 * 60 * 1000)
    ) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!EMAIL_RE.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    if (!checkRateLimit(`email:${normalizedEmail}`, 2, 24 * 60 * 60 * 1000)) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    const safeLanguage = typeof language === 'string' ? language.slice(0, 12) : 'unknown';
    const safeSource = typeof source === 'string' ? source.slice(0, 80) : 'landing';
    const userAgentHeader = req.headers['user-agent'];
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader.join(' ') : (userAgentHeader ?? '');

    await appendLeadToSheet([
      new Date().toISOString(),
      normalizedEmail,
      safeLanguage,
      safeSource,
      userAgent.slice(0, MAX_USER_AGENT_LENGTH),
    ]);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Tester lead error:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Could not save tester lead' });
  }
}
