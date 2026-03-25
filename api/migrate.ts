/**
 * GET /api/migrate
 * One-shot migration runner. Delete this file after running once.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ error: 'DATABASE_URL not set' });

  const pool = new Pool({ connectionString: dbUrl });
  const results: string[] = [];

  try {
    // 1. Find and drop FK constraints on messages table
    const fkResult = await pool.query(`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'messages'::regclass AND contype = 'f'
    `);
    for (const row of fkResult.rows) {
      await pool.query(`ALTER TABLE messages DROP CONSTRAINT IF EXISTS "${row.conname}"`);
      results.push(`Dropped FK: ${row.conname}`);
    }
    if (fkResult.rows.length === 0) {
      results.push('No FK constraints on messages table');
    }

    // 2. Add missing columns (migration 011)
    await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'uk'`);
    results.push('Added: players.preferred_language');

    await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS fcm_token TEXT`);
    results.push('Added: players.fcm_token');

    await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN NOT NULL DEFAULT TRUE`);
    results.push('Added: players.push_notifications');

    await pool.query(`ALTER TABLE weekly_digest ADD COLUMN IF NOT EXISTS pushes_sent BOOLEAN NOT NULL DEFAULT FALSE`);
    results.push('Added: weekly_digest.pushes_sent');

    // 3. Index for push targeting
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_players_push_target ON players(preferred_language) WHERE fcm_token IS NOT NULL AND push_notifications = TRUE`);
    results.push('Added: idx_players_push_target');

    await pool.end();
    return res.status(200).json({ ok: true, results });
  } catch (err) {
    await pool.end().catch(() => {});
    console.error('[migrate]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      results,
    });
  }
}
