/**
 * api/migrate.ts
 * One-shot database migration runner.
 * Usage: GET /api/migrate?secret=<ADMIN_SECRET>
 * Applies only new migrations (tracked via _schema_migrations table).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

// Inline migrations in order — file I/O is unreliable in Vercel serverless
const MIGRATIONS: { name: string; sql: string }[] = [
  {
    name: '010-academy',
    sql: `
      CREATE TABLE IF NOT EXISTS academy_progress (
        id                     SERIAL PRIMARY KEY,
        player_id              TEXT NOT NULL,
        difficulty             TEXT NOT NULL DEFAULT 'explorer',
        selected_topics        TEXT[] NOT NULL DEFAULT '{}',
        completed_lessons      JSONB NOT NULL DEFAULT '{}',
        active_quest           JSONB,
        quest_streak           INTEGER NOT NULL DEFAULT 0,
        longest_streak         INTEGER NOT NULL DEFAULT 0,
        last_quest_date        DATE,
        total_quests_completed INTEGER NOT NULL DEFAULT 0,
        total_quizzes_correct  INTEGER NOT NULL DEFAULT 0,
        total_quizzes_answered INTEGER NOT NULL DEFAULT 0,
        category_progress      JSONB NOT NULL DEFAULT '{}',
        onboarded              BOOLEAN NOT NULL DEFAULT false,
        created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(player_id)
      );

      CREATE TABLE IF NOT EXISTS academy_lessons (
        id               SERIAL PRIMARY KEY,
        lesson_date      DATE NOT NULL,
        topic_id         TEXT NOT NULL,
        difficulty       TEXT NOT NULL,
        lesson_content   TEXT NOT NULL,
        lesson_image_url TEXT,
        quest_data       JSONB NOT NULL,
        quiz_data        JSONB NOT NULL,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(lesson_date, topic_id, difficulty)
      );

      CREATE INDEX IF NOT EXISTS idx_academy_lessons_lookup
        ON academy_lessons(lesson_date, topic_id, difficulty);

      CREATE INDEX IF NOT EXISTS idx_academy_progress_player
        ON academy_progress(player_id);
    `,
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Admin secret guard
  const secret = req.query.secret as string | undefined;
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || secret !== adminSecret) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ error: 'DATABASE_URL not set' });

  const sql = neon(dbUrl);

  try {
    // Ensure tracking table exists
    await sql`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        name       TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const applied: string[] = [];
    const skipped: string[] = [];

    for (const { name, sql: migrationSql } of MIGRATIONS) {
      const rows = await sql`SELECT 1 FROM _schema_migrations WHERE name = ${name}`;
      if (rows.length > 0) {
        skipped.push(name);
        continue;
      }

      // Execute migration (split by semicolon for multiple statements)
      const statements = migrationSql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const stmt of statements) {
        await sql.unsafe(stmt);
      }

      await sql`INSERT INTO _schema_migrations (name) VALUES (${name})`;
      applied.push(name);
    }

    return res.status(200).json({ ok: true, applied, skipped });
  } catch (err) {
    console.error('[migrate]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
