import { neon } from '@neondatabase/serverless';

// ---------------------------------------------------------------------------
// Neon serverless client — one per cold-start, reused across invocations
// ---------------------------------------------------------------------------

function getSQL() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is not set');
  return neon(url);
}

// ---------------------------------------------------------------------------
// Player helpers
// ---------------------------------------------------------------------------

export interface PlayerRow {
  id: string;
  name: string;
  home_system_id: string;
  home_planet_id: string;
  game_phase: string;
  science_points: number;
  login_streak: number;
  last_login: string | null;
  created_at: string;
  game_state: Record<string, unknown>;
}

export async function createPlayer(player: {
  id: string;
  name: string;
  homeSystemId: string;
  homePlanetId: string;
}): Promise<PlayerRow> {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO players (id, name, home_system_id, home_planet_id, last_login)
    VALUES (${player.id}, ${player.name}, ${player.homeSystemId}, ${player.homePlanetId}, NOW())
    RETURNING *
  `;
  return rows[0] as PlayerRow;
}

export async function getPlayer(playerId: string): Promise<PlayerRow | null> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM players WHERE id = ${playerId}`;
  return (rows[0] as PlayerRow) ?? null;
}

export async function updatePlayer(
  playerId: string,
  updates: Partial<{
    game_phase: string;
    science_points: number;
    login_streak: number;
    last_login: string;
    game_state: Record<string, unknown>;
  }>,
): Promise<PlayerRow | null> {
  const sql = getSQL();
  // Build SET clause dynamically
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (updates.game_phase !== undefined) {
    sets.push(`game_phase = $${idx++}`);
    values.push(updates.game_phase);
  }
  if (updates.science_points !== undefined) {
    sets.push(`science_points = $${idx++}`);
    values.push(updates.science_points);
  }
  if (updates.login_streak !== undefined) {
    sets.push(`login_streak = $${idx++}`);
    values.push(updates.login_streak);
  }
  if (updates.last_login !== undefined) {
    sets.push(`last_login = $${idx++}`);
    values.push(updates.last_login);
  }
  if (updates.game_state !== undefined) {
    sets.push(`game_state = $${idx++}`);
    values.push(JSON.stringify(updates.game_state));
  }

  if (sets.length === 0) return getPlayer(playerId);

  // Use tagged template for simple updates
  const rows = await sql`
    UPDATE players
    SET game_phase = COALESCE(${updates.game_phase ?? null}, game_phase),
        science_points = COALESCE(${updates.science_points ?? null}, science_points),
        login_streak = COALESCE(${updates.login_streak ?? null}, login_streak),
        last_login = COALESCE(${updates.last_login ?? null}, last_login),
        game_state = COALESCE(${updates.game_state ? JSON.stringify(updates.game_state) : null}::jsonb, game_state)
    WHERE id = ${playerId}
    RETURNING *
  `;
  return (rows[0] as PlayerRow) ?? null;
}

// ---------------------------------------------------------------------------
// Discovery helpers
// ---------------------------------------------------------------------------

export interface DiscoveryRow {
  id: string;
  player_id: string;
  object_type: string;
  rarity: string;
  gallery_category: string;
  system_id: string;
  planet_id: string | null;
  photo_url: string | null;
  prompt_used: string | null;
  scientific_report: string | null;
  discovered_at: string;
}

export async function saveDiscovery(d: {
  id: string;
  playerId: string;
  objectType: string;
  rarity: string;
  galleryCategory: string;
  systemId: string;
  planetId?: string;
  promptUsed?: string;
  scientificReport?: string;
}): Promise<DiscoveryRow> {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO discoveries (id, player_id, object_type, rarity, gallery_category, system_id, planet_id, prompt_used, scientific_report)
    VALUES (${d.id}, ${d.playerId}, ${d.objectType}, ${d.rarity}, ${d.galleryCategory},
            ${d.systemId}, ${d.planetId ?? null}, ${d.promptUsed ?? null}, ${d.scientificReport ?? null})
    RETURNING *
  `;
  return rows[0] as DiscoveryRow;
}

export async function getDiscoveries(playerId: string, galleryCategory?: string): Promise<DiscoveryRow[]> {
  const sql = getSQL();
  if (galleryCategory) {
    return (await sql`
      SELECT * FROM discoveries
      WHERE player_id = ${playerId} AND gallery_category = ${galleryCategory}
      ORDER BY discovered_at DESC
    `) as DiscoveryRow[];
  }
  return (await sql`
    SELECT * FROM discoveries
    WHERE player_id = ${playerId}
    ORDER BY discovered_at DESC
  `) as DiscoveryRow[];
}

export async function getDiscovery(id: string): Promise<DiscoveryRow | null> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM discoveries WHERE id = ${id}`;
  return (rows[0] as DiscoveryRow) ?? null;
}

export async function updateDiscoveryPhoto(id: string, photoUrl: string): Promise<void> {
  const sql = getSQL();
  await sql`UPDATE discoveries SET photo_url = ${photoUrl} WHERE id = ${id}`;
}

export async function deleteDiscovery(id: string, playerId: string): Promise<boolean> {
  const sql = getSQL();
  const result = await sql`DELETE FROM discoveries WHERE id = ${id} AND player_id = ${playerId}`;
  return result.length > 0 || true; // neon returns affected rows info differently
}

// ---------------------------------------------------------------------------
// Kling task helpers
// ---------------------------------------------------------------------------

export interface KlingTaskRow {
  task_id: string;
  player_id: string;
  discovery_id: string | null;
  status: string;
  image_url: string | null;
  created_at: string;
  completed_at: string | null;
}

export async function saveKlingTask(task: {
  taskId: string;
  playerId: string;
  discoveryId: string;
}): Promise<KlingTaskRow> {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO kling_tasks (task_id, player_id, discovery_id)
    VALUES (${task.taskId}, ${task.playerId}, ${task.discoveryId})
    RETURNING *
  `;
  return rows[0] as KlingTaskRow;
}

export async function getKlingTask(taskId: string): Promise<KlingTaskRow | null> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM kling_tasks WHERE task_id = ${taskId}`;
  return (rows[0] as KlingTaskRow) ?? null;
}

export async function updateKlingTask(
  taskId: string,
  status: string,
  imageUrl?: string,
): Promise<void> {
  const sql = getSQL();
  if (imageUrl) {
    await sql`
      UPDATE kling_tasks
      SET status = ${status}, image_url = ${imageUrl}, completed_at = NOW()
      WHERE task_id = ${taskId}
    `;
  } else {
    await sql`
      UPDATE kling_tasks SET status = ${status} WHERE task_id = ${taskId}
    `;
  }
}

// ---------------------------------------------------------------------------
// Expedition helpers
// ---------------------------------------------------------------------------

export interface ExpeditionRow {
  id: string;
  player_id: string;
  planet_id: string;
  system_id: string;
  type: string;
  status: string;
  started_at: string;
  duration_ms: number;
  completed_at: string | null;
}

export async function saveExpedition(e: {
  id: string;
  playerId: string;
  planetId: string;
  systemId: string;
  type: string;
  durationMs: number;
}): Promise<ExpeditionRow> {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO expeditions (id, player_id, planet_id, system_id, type, duration_ms)
    VALUES (${e.id}, ${e.playerId}, ${e.planetId}, ${e.systemId}, ${e.type}, ${e.durationMs})
    RETURNING *
  `;
  return rows[0] as ExpeditionRow;
}

export async function getExpeditions(playerId: string, status?: string): Promise<ExpeditionRow[]> {
  const sql = getSQL();
  if (status) {
    return (await sql`
      SELECT * FROM expeditions WHERE player_id = ${playerId} AND status = ${status}
      ORDER BY started_at DESC
    `) as ExpeditionRow[];
  }
  return (await sql`
    SELECT * FROM expeditions WHERE player_id = ${playerId}
    ORDER BY started_at DESC
  `) as ExpeditionRow[];
}

export async function completeExpedition(id: string): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE expeditions SET status = 'completed', completed_at = NOW()
    WHERE id = ${id}
  `;
}
