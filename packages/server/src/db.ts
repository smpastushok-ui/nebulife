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
  quarks: number;
}

export async function createPlayer(player: {
  id: string;
  name: string;
  homeSystemId: string;
  homePlanetId: string;
}): Promise<PlayerRow> {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO players (id, name, home_system_id, home_planet_id, last_login, quarks)
    VALUES (${player.id}, ${player.name}, ${player.homeSystemId}, ${player.homePlanetId}, NOW(), 0)
    ON CONFLICT (id) DO NOTHING
    RETURNING *
  `;
  // If ON CONFLICT fired, row won't be returned — fetch existing
  if (!rows[0]) {
    const existing = await sql`SELECT * FROM players WHERE id = ${player.id}`;
    return existing[0] as PlayerRow;
  }
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
    quarks: number;
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
        game_state = COALESCE(${updates.game_state ? JSON.stringify(updates.game_state) : null}::jsonb, game_state),
        quarks = COALESCE(${updates.quarks ?? null}, quarks)
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

// ---------------------------------------------------------------------------
// Planet Model helpers (3D generation via Tripo3D)
// ---------------------------------------------------------------------------

export interface PlanetModelRow {
  id: string;
  player_id: string;
  planet_id: string;
  system_id: string;
  status: string;
  kling_task_id: string | null;
  kling_photo_url: string | null;
  glb_url: string | null;
  tripo_task_id: string | null;
  payment_id: string | null;
  payment_status: string;
  planet_data: Record<string, unknown> | null;
  star_data: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
}

export async function savePlanetModel(m: {
  id: string;
  playerId: string;
  planetId: string;
  systemId: string;
  paymentId?: string;
  planetData?: Record<string, unknown>;
  starData?: Record<string, unknown>;
}): Promise<PlanetModelRow> {
  const sql = getSQL();
  const planetDataJson = m.planetData ? JSON.stringify(m.planetData) : null;
  const starDataJson = m.starData ? JSON.stringify(m.starData) : null;
  const rows = await sql`
    INSERT INTO planet_models (id, player_id, planet_id, system_id, payment_id, planet_data, star_data)
    VALUES (${m.id}, ${m.playerId}, ${m.planetId}, ${m.systemId}, ${m.paymentId ?? null},
            ${planetDataJson}::jsonb, ${starDataJson}::jsonb)
    RETURNING *
  `;
  return rows[0] as PlanetModelRow;
}

export async function getPlanetModel(id: string): Promise<PlanetModelRow | null> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM planet_models WHERE id = ${id}`;
  return (rows[0] as PlanetModelRow) ?? null;
}

export async function getPlanetModelByPayment(paymentId: string): Promise<PlanetModelRow | null> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM planet_models WHERE payment_id = ${paymentId}`;
  return (rows[0] as PlanetModelRow) ?? null;
}

export async function getPlanetModels(playerId: string): Promise<PlanetModelRow[]> {
  const sql = getSQL();
  return (await sql`
    SELECT * FROM planet_models
    WHERE player_id = ${playerId}
    ORDER BY created_at DESC
  `) as PlanetModelRow[];
}

export async function updatePlanetModel(
  id: string,
  updates: Partial<{
    status: string;
    kling_task_id: string;
    kling_photo_url: string;
    glb_url: string;
    tripo_task_id: string;
    payment_status: string;
    completed_at: string;
  }>,
): Promise<PlanetModelRow | null> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE planet_models
    SET status = COALESCE(${updates.status ?? null}, status),
        kling_task_id = COALESCE(${updates.kling_task_id ?? null}, kling_task_id),
        kling_photo_url = COALESCE(${updates.kling_photo_url ?? null}, kling_photo_url),
        glb_url = COALESCE(${updates.glb_url ?? null}, glb_url),
        tripo_task_id = COALESCE(${updates.tripo_task_id ?? null}, tripo_task_id),
        payment_status = COALESCE(${updates.payment_status ?? null}, payment_status),
        completed_at = COALESCE(${updates.completed_at ?? null}::timestamptz, completed_at)
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as PlanetModelRow) ?? null;
}

// ---------------------------------------------------------------------------
// Surface Building helpers
// ---------------------------------------------------------------------------

export interface SurfaceBuildingRow {
  id: string;
  player_id: string;
  planet_id: string;
  type: string;
  x: number;
  y: number;
  level: number;
  built_at: string;
}

export async function saveSurfaceBuilding(b: {
  id: string;
  playerId: string;
  planetId: string;
  type: string;
  x: number;
  y: number;
}): Promise<SurfaceBuildingRow> {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO surface_buildings (id, player_id, planet_id, type, x, y)
    VALUES (${b.id}, ${b.playerId}, ${b.planetId}, ${b.type}, ${b.x}, ${b.y})
    RETURNING *
  `;
  return rows[0] as SurfaceBuildingRow;
}

export async function getSurfaceBuildings(
  playerId: string,
  planetId: string,
): Promise<SurfaceBuildingRow[]> {
  const sql = getSQL();
  return (await sql`
    SELECT * FROM surface_buildings
    WHERE player_id = ${playerId} AND planet_id = ${planetId}
    ORDER BY built_at ASC
  `) as SurfaceBuildingRow[];
}

export async function removeSurfaceBuilding(
  id: string,
  playerId: string,
): Promise<boolean> {
  const sql = getSQL();
  await sql`
    DELETE FROM surface_buildings WHERE id = ${id} AND player_id = ${playerId}
  `;
  return true;
}

export async function upgradeSurfaceBuilding(
  id: string,
  playerId: string,
): Promise<SurfaceBuildingRow | null> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE surface_buildings
    SET level = level + 1
    WHERE id = ${id} AND player_id = ${playerId}
    RETURNING *
  `;
  return (rows[0] as SurfaceBuildingRow) ?? null;
}

// ---------------------------------------------------------------------------
// Quark currency helpers
// ---------------------------------------------------------------------------

/**
 * Atomically deduct quarks from player balance.
 * Returns updated player row, or null if insufficient funds.
 */
export async function deductQuarks(
  playerId: string,
  amount: number,
): Promise<PlayerRow | null> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE players
    SET quarks = quarks - ${amount}
    WHERE id = ${playerId} AND quarks >= ${amount}
    RETURNING *
  `;
  return (rows[0] as PlayerRow) ?? null;
}

/**
 * Atomically credit quarks to player balance.
 */
export async function creditQuarks(
  playerId: string,
  amount: number,
): Promise<PlayerRow> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE players
    SET quarks = quarks + ${amount}
    WHERE id = ${playerId}
    RETURNING *
  `;
  return rows[0] as PlayerRow;
}

// ---------------------------------------------------------------------------
// Payment Intent helpers
// ---------------------------------------------------------------------------

export interface PaymentIntentRow {
  reference: string;
  player_id: string;
  amount_quarks: number;
  purpose: string;
  purchase_meta: Record<string, unknown> | null;
  status: string;
  created_at: string;
}

export async function savePaymentIntent(intent: {
  reference: string;
  playerId: string;
  amountQuarks: number;
  purpose: string;
  purchaseMeta?: Record<string, unknown>;
}): Promise<PaymentIntentRow> {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO payment_intents (reference, player_id, amount_quarks, purpose, purchase_meta)
    VALUES (
      ${intent.reference},
      ${intent.playerId},
      ${intent.amountQuarks},
      ${intent.purpose},
      ${intent.purchaseMeta ? JSON.stringify(intent.purchaseMeta) : null}::jsonb
    )
    RETURNING *
  `;
  return rows[0] as PaymentIntentRow;
}

export async function getPaymentIntent(reference: string): Promise<PaymentIntentRow | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT * FROM payment_intents WHERE reference = ${reference}
  `;
  return (rows[0] as PaymentIntentRow) ?? null;
}

export async function updatePaymentIntentStatus(
  reference: string,
  status: string,
): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE payment_intents SET status = ${status} WHERE reference = ${reference}
  `;
}

// ---------------------------------------------------------------------------
// Surface Map helpers
// ---------------------------------------------------------------------------

export interface SurfaceMapRow {
  id: string;
  player_id: string;
  planet_id: string;
  system_id: string;
  photo_url: string | null;
  kling_task_id: string | null;
  status: string;
  zone_map: Record<string, unknown> | null;
  generation_count: number;
  created_at: string;
  updated_at: string;
}

export async function saveSurfaceMap(data: {
  id: string;
  playerId: string;
  planetId: string;
  systemId: string;
  klingTaskId: string;
}): Promise<SurfaceMapRow> {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO surface_maps (id, player_id, planet_id, system_id, kling_task_id, status)
    VALUES (${data.id}, ${data.playerId}, ${data.planetId}, ${data.systemId}, ${data.klingTaskId}, 'generating')
    RETURNING *
  `;
  return rows[0] as SurfaceMapRow;
}

export async function getSurfaceMap(planetId: string): Promise<SurfaceMapRow | null> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM surface_maps WHERE planet_id = ${planetId}`;
  return (rows[0] as SurfaceMapRow) ?? null;
}

export async function getSurfaceMapById(id: string): Promise<SurfaceMapRow | null> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM surface_maps WHERE id = ${id}`;
  return (rows[0] as SurfaceMapRow) ?? null;
}

export async function updateSurfaceMap(
  id: string,
  updates: Partial<{
    status: string;
    photo_url: string;
    zone_map: Record<string, unknown>;
    generation_count: number;
  }>,
): Promise<SurfaceMapRow | null> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE surface_maps
    SET status = COALESCE(${updates.status ?? null}, status),
        photo_url = COALESCE(${updates.photo_url ?? null}, photo_url),
        zone_map = COALESCE(${updates.zone_map ? JSON.stringify(updates.zone_map) : null}::jsonb, zone_map),
        generation_count = COALESCE(${updates.generation_count ?? null}, generation_count),
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as SurfaceMapRow) ?? null;
}
