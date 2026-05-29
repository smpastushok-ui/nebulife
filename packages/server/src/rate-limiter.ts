// ---------------------------------------------------------------------------
// Hybrid rate limiter: in-memory fast path + Neon DB authoritative check
// ---------------------------------------------------------------------------
// In-memory provides instant rejection within a warm Vercel instance.
// Neon DB provides distributed persistence across cold starts and instances.
// ---------------------------------------------------------------------------

import { neon } from '@neondatabase/serverless';

// ── In-memory fast path ────────────────────────────────────────────────────

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastCleanup = Date.now();

function memoryCheck(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (now - lastCleanup > 300_000) {
    lastCleanup = now;
    for (const [k, b] of buckets) { if (b.resetAt < now) buckets.delete(k); }
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count++;
  return true;
}

// ── Neon DB authoritative check ────────────────────────────────────────────

function getSQL() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

async function dbCheck(key: string, max: number, windowMs: number): Promise<boolean> {
  const sql = getSQL();
  if (!sql) return true; // No DB — fallback to memory-only

  try {
    const rows = await sql`
      INSERT INTO rate_limits (key, window_start, count, window_ms)
      VALUES (${key}, NOW(), 1, ${windowMs})
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limits.window_start + make_interval(secs => rate_limits.window_ms / 1000.0) < NOW()
          THEN 1
          ELSE rate_limits.count + 1
        END,
        window_start = CASE
          WHEN rate_limits.window_start + make_interval(secs => rate_limits.window_ms / 1000.0) < NOW()
          THEN NOW()
          ELSE rate_limits.window_start
        END,
        window_ms = ${windowMs}
      RETURNING count
    `;
    const count = (rows[0] as { count: number }).count;
    return count <= max;
  } catch {
    // DB error — allow request (fail-open)
    return true;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Hybrid rate limit check.
 * Fast reject from memory, authoritative check from Neon.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  // Fast reject: if in-memory already over limit, reject immediately
  if (!memoryCheck(key, maxRequests, windowMs)) return false;
  // Authoritative: check distributed DB state
  return dbCheck(key, maxRequests, windowMs);
}

/**
 * Rate limit presets.
 */
export const RATE_LIMITS = {
  /** Chat: 10 messages per minute per player */
  chat: (playerId: string) => checkRateLimit(`chat:${playerId}`, 10, 60_000),
  /** AI chat: 5 requests per minute per player */
  aiChat: (playerId: string) => checkRateLimit(`ai:${playerId}`, 5, 60_000),
  /** Generation: 3 per minute per player */
  generation: (playerId: string) => checkRateLimit(`gen:${playerId}`, 3, 60_000),
  /** Payment: 5 per hour per player */
  payment: (playerId: string) => checkRateLimit(`pay:${playerId}`, 5, 3_600_000),
  /** Ad session starts: allows multi-ad rewards without blocking the final claim. */
  adStart: (playerId: string) => checkRateLimit(`ad:start:${playerId}`, 30, 300_000),
  /** Ad reward claims: final server-side grant after enough signed ad tokens. */
  adReward: (playerId: string) => checkRateLimit(`ad:reward:${playerId}`, 10, 300_000),
  /** Search: 10 per minute per IP */
  search: (ip: string) => checkRateLimit(`search:${ip}`, 10, 60_000),
  /** Global: 60 requests per minute per IP */
  global: (ip: string) => checkRateLimit(`global:${ip}`, 60, 60_000),
  /**
   * Polling/read endpoints: 150 requests per minute per player, SHARED across
   * messages list/channels/read-state/unread-summary, cluster presence and
   * player GET. Legit play stays well under ~30/min; this throttles runaway
   * client loops / scrapers (the 2026-05 anomaly hit ~330/min from one IP).
   */
  poll: (playerId: string) => checkRateLimit(`poll:${playerId}`, 150, 60_000),
} as const;

/** Extract client IP from Vercel request headers. */
export function getClientIP(headers: Record<string, string | string[] | undefined>): string {
  const forwarded = headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return 'unknown';
}
