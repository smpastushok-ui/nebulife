import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const checks: Record<string, unknown> = {
    ok: true,
    timestamp: new Date().toISOString(),
  };

  // If ?db=1, also check database connection
  if (req.query.db === '1') {
    try {
      const url = process.env.DATABASE_URL;
      if (!url) {
        checks.db = { ok: false, error: 'DATABASE_URL not set' };
      } else {
        const sql = neon(url);
        const result = await sql`SELECT COUNT(*) as count FROM players`;
        checks.db = {
          ok: true,
          playerCount: Number(result[0]?.count ?? 0),
          urlPrefix: url.substring(0, 30) + '...',
        };
      }
    } catch (err) {
      checks.ok = false;
      checks.db = {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  res.status(checks.ok ? 200 : 503).json(checks);
}
