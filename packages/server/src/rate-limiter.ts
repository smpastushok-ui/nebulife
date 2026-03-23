// ---------------------------------------------------------------------------
// In-memory rate limiter for Vercel Functions
// ---------------------------------------------------------------------------
// Note: In-memory state resets on cold start. This provides soft protection
// against abuse within a single function instance. For hard limits, use
// a distributed store (Redis/Neon).
// ---------------------------------------------------------------------------

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Clean old buckets every 5 minutes to prevent memory leaks
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 300_000;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

/**
 * Check if a request is within rate limits.
 * Returns true if allowed, false if rate limited.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  cleanup();
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= maxRequests) return false;
  bucket.count++;
  return true;
}

/**
 * Rate limit presets for common use cases.
 */
export const RATE_LIMITS = {
  /** Chat: 10 messages per minute per player */
  chat: (playerId: string) => checkRateLimit(`chat:${playerId}`, 10, 60_000),
  /** AI chat: 5 requests per minute per player */
  aiChat: (playerId: string) => checkRateLimit(`ai:${playerId}`, 5, 60_000),
  /** Generation: 1 per 60 seconds per player */
  generation: (playerId: string) => checkRateLimit(`gen:${playerId}`, 1, 60_000),
  /** Payment: 5 per hour per player */
  payment: (playerId: string) => checkRateLimit(`pay:${playerId}`, 5, 3600_000),
  /** Search: 10 per minute per IP */
  search: (ip: string) => checkRateLimit(`search:${ip}`, 10, 60_000),
  /** Global: 60 requests per minute per IP */
  global: (ip: string) => checkRateLimit(`global:${ip}`, 60, 60_000),
} as const;

/** Extract client IP from Vercel request headers. */
export function getClientIP(headers: Record<string, string | string[] | undefined>): string {
  const forwarded = headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return 'unknown';
}
