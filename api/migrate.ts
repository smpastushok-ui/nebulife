/**
 * GET /api/migrate
 * One-shot migration runner. Fixes:
 * 1. Drop FK constraint on messages.sender_id (blocks 'astra' system messages)
 * 2. Add missing columns from migration 011
 * Delete this file after running once.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ error: 'DATABASE_URL not set' });

  const sql = neon(dbUrl);
  const results: string[] = [];

  try {
    // 1. Find and drop FK constraints on messages.sender_id
    const fks = await sql`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'messages'::regclass
        AND contype = 'f'
    `;
    for (const fk of fks) {
      const name = (fk as { conname: string }).conname;
      await sql.unsafe(`ALTER TABLE messages DROP CONSTRAINT IF EXISTS "${name}"`);
      results.push(`Dropped FK: ${name}`);
    }

    // 2. Add missing columns from migration 011
    await sql.unsafe(`ALTER TABLE players ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'uk'`);
    results.push('Added: players.preferred_language');

    await sql.unsafe(`ALTER TABLE players ADD COLUMN IF NOT EXISTS fcm_token TEXT`);
    results.push('Added: players.fcm_token');

    await sql.unsafe(`ALTER TABLE players ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN NOT NULL DEFAULT TRUE`);
    results.push('Added: players.push_notifications');

    await sql.unsafe(`ALTER TABLE weekly_digest ADD COLUMN IF NOT EXISTS pushes_sent BOOLEAN NOT NULL DEFAULT FALSE`);
    results.push('Added: weekly_digest.pushes_sent');

    // 3. Create index for push targeting
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_players_push_target ON players(preferred_language) WHERE fcm_token IS NOT NULL AND push_notifications = TRUE`);
    results.push('Added: idx_players_push_target');

    return res.status(200).json({ ok: true, results });
  } catch (err) {
    console.error('[migrate]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      results,
    });
  }
}
