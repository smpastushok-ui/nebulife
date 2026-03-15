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
  // Auth fields
  firebase_uid: string | null;
  auth_provider: string;
  email: string | null;
  callsign: string | null;
  callsign_set_at: string | null;
  linked_at: string | null;
}

export async function createPlayer(player: {
  id: string;
  name: string;
  homeSystemId: string;
  homePlanetId: string;
}): Promise<PlayerRow> {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO players (id, name, home_system_id, home_planet_id, game_phase, last_login, quarks)
    VALUES (${player.id}, ${player.name}, ${player.homeSystemId}, ${player.homePlanetId}, 'onboarding', NOW(), 0)
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
    home_system_id: string;
    home_planet_id: string;
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
        quarks = COALESCE(${updates.quarks ?? null}, quarks),
        home_system_id = COALESCE(${updates.home_system_id ?? null}, home_system_id),
        home_planet_id = COALESCE(${updates.home_planet_id ?? null}, home_planet_id)
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
    ON CONFLICT (id) DO UPDATE SET id = EXCLUDED.id
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

/** Delete ALL discoveries for a player (used by "Start over" reset). */
export async function deletePlayerDiscoveries(playerId: string): Promise<void> {
  const sql = getSQL();
  await sql`DELETE FROM discoveries WHERE player_id = ${playerId}`;
}

/** Full player data reset (used by "Start over").
 *  Deletes all player-owned data EXCEPT payments and the player record itself.
 *  Increments science_points as generation_index (for new system generation).
 *  Keeps quarks balance.
 */
export async function resetPlayerData(playerId: string): Promise<PlayerRow | null> {
  const sql = getSQL();

  // Delete all player-owned data in parallel
  await Promise.all([
    sql`DELETE FROM discoveries WHERE player_id = ${playerId}`,
    sql`DELETE FROM planet_models WHERE player_id = ${playerId}`,
    sql`DELETE FROM player_aliases WHERE player_id = ${playerId}`,
    sql`DELETE FROM surface_buildings WHERE player_id = ${playerId}`,
    sql`DELETE FROM surface_maps WHERE player_id = ${playerId}`,
    sql`DELETE FROM system_photos WHERE player_id = ${playerId}`,
    sql`DELETE FROM system_missions WHERE player_id = ${playerId}`,
    sql`DELETE FROM expeditions WHERE player_id = ${playerId}`,
    sql`DELETE FROM kling_tasks WHERE player_id = ${playerId}`,
  ]);

  // Reset player: increment generation_index (science_points), clear game state, keep quarks
  const rows = await sql`
    UPDATE players
    SET game_phase = 'onboarding',
        game_state = '{}'::jsonb,
        science_points = science_points + 1,
        home_system_id = 'home',
        home_planet_id = 'home'
    WHERE id = ${playerId}
    RETURNING *
  `;
  return (rows[0] as PlayerRow) ?? null;
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
// Auth helpers
// ---------------------------------------------------------------------------

/** Find a player by their Firebase UID. */
export async function getPlayerByFirebaseUid(firebaseUid: string): Promise<PlayerRow | null> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM players WHERE firebase_uid = ${firebaseUid}`;
  return (rows[0] as PlayerRow) ?? null;
}

/** Link a Firebase UID to an existing legacy player (migration). */
export async function linkFirebaseToPlayer(
  legacyPlayerId: string,
  firebaseUid: string,
  authProvider: string,
  email?: string,
): Promise<PlayerRow | null> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE players
    SET firebase_uid = ${firebaseUid},
        auth_provider = ${authProvider},
        email = ${email ?? null},
        linked_at = NOW()
    WHERE id = ${legacyPlayerId} AND firebase_uid IS NULL
    RETURNING *
  `;
  return (rows[0] as PlayerRow) ?? null;
}

/** Check if a callsign is available (case-insensitive). */
export async function checkCallsignAvailable(callsign: string): Promise<boolean> {
  const sql = getSQL();
  const rows = await sql`
    SELECT 1 FROM players WHERE LOWER(callsign) = LOWER(${callsign}) LIMIT 1
  `;
  return rows.length === 0;
}

/** Set a player's callsign (also updates name for backward compat). */
export async function setCallsign(
  playerId: string,
  callsign: string,
): Promise<PlayerRow | null> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE players
    SET callsign = ${callsign},
        callsign_set_at = NOW(),
        name = ${callsign}
    WHERE id = ${playerId}
    RETURNING *
  `;
  return (rows[0] as PlayerRow) ?? null;
}

/** Create a player with Firebase auth data. */
export async function createPlayerWithAuth(player: {
  id: string;
  firebaseUid: string;
  authProvider: string;
  email?: string;
  name: string;
  homeSystemId: string;
  homePlanetId: string;
}): Promise<PlayerRow> {
  const sql = getSQL();
  console.log(`[db] createPlayerWithAuth: id=${player.id}, provider=${player.authProvider}`);
  try {
    const rows = await sql`
      INSERT INTO players (id, firebase_uid, auth_provider, email, name, home_system_id, home_planet_id, game_phase, last_login, quarks)
      VALUES (${player.id}, ${player.firebaseUid}, ${player.authProvider}, ${player.email ?? null},
              ${player.name}, ${player.homeSystemId}, ${player.homePlanetId}, 'onboarding', NOW(), 0)
      ON CONFLICT (id) DO UPDATE SET
        last_login = NOW(),
        firebase_uid = COALESCE(players.firebase_uid, EXCLUDED.firebase_uid),
        auth_provider = EXCLUDED.auth_provider
      RETURNING *
    `;
    console.log(`[db] createPlayerWithAuth: inserted/updated, rows=${rows.length}`);
    if (rows[0]) return rows[0] as PlayerRow;
    // Fallback: fetch existing
    const existing = await sql`SELECT * FROM players WHERE id = ${player.id}`;
    console.log(`[db] createPlayerWithAuth: fallback fetch, rows=${existing.length}`);
    return existing[0] as PlayerRow;
  } catch (err) {
    console.error(`[db] createPlayerWithAuth FAILED:`, err instanceof Error ? err.message : err);
    throw err;
  }
}

/** Update a player's auth provider and email (after account linking). */
export async function updatePlayerAuth(
  playerId: string,
  authProvider: string,
  email?: string,
): Promise<PlayerRow | null> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE players
    SET auth_provider = ${authProvider},
        email = ${email ?? null},
        linked_at = NOW()
    WHERE id = ${playerId}
    RETURNING *
  `;
  return (rows[0] as PlayerRow) ?? null;
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
    ON CONFLICT (planet_id) DO UPDATE SET
      kling_task_id = EXCLUDED.kling_task_id,
      status = 'generating',
      photo_url = NULL
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

// ---------------------------------------------------------------------------
// Player Aliases (custom names for systems/planets)
// ---------------------------------------------------------------------------

export interface PlayerAliasRow {
  player_id: string;
  entity_type: string;
  entity_id: string;
  custom_name: string;
  created_at: string;
}

/**
 * Get all aliases for a player as a map: entityId → customName
 */
export async function getPlayerAliases(playerId: string): Promise<Record<string, string>> {
  const sql = getSQL();
  const rows = await sql`
    SELECT entity_id, custom_name FROM player_aliases
    WHERE player_id = ${playerId}
  `;
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[(row as PlayerAliasRow).entity_id] = (row as PlayerAliasRow).custom_name;
  }
  return map;
}

/**
 * Set or update a custom name alias for a system or planet.
 * Uses upsert to handle both insert and update.
 */
export async function setPlayerAlias(
  playerId: string,
  entityType: 'system' | 'planet',
  entityId: string,
  customName: string,
): Promise<void> {
  const sql = getSQL();
  await sql`
    INSERT INTO player_aliases (player_id, entity_type, entity_id, custom_name)
    VALUES (${playerId}, ${entityType}, ${entityId}, ${customName})
    ON CONFLICT (player_id, entity_type, entity_id)
    DO UPDATE SET custom_name = ${customName}
  `;
}

/**
 * Remove a custom alias (revert to original name).
 */
export async function removePlayerAlias(
  playerId: string,
  entityType: 'system' | 'planet',
  entityId: string,
): Promise<void> {
  const sql = getSQL();
  await sql`
    DELETE FROM player_aliases
    WHERE player_id = ${playerId}
      AND entity_type = ${entityType}
      AND entity_id = ${entityId}
  `;
}

// ---------------------------------------------------------------------------
// System Photo helpers (telescope photos of star systems)
// ---------------------------------------------------------------------------

export interface SystemPhotoRow {
  id: string;
  player_id: string;
  system_id: string;
  photo_url: string | null;
  kling_task_id: string | null;
  prompt_used: string | null;
  status: string; // 'generating' | 'succeed' | 'failed'
  created_at: string;
  completed_at: string | null;
}

export async function saveSystemPhoto(data: {
  id: string;
  playerId: string;
  systemId: string;
  klingTaskId?: string | null;
  promptUsed: string;
  status?: string;
  photoUrl?: string | null;
}): Promise<SystemPhotoRow> {
  const sql = getSQL();
  const status = data.status ?? 'generating';
  const photoUrl = data.photoUrl ?? null;
  const klingTaskId = data.klingTaskId ?? null;
  const completedAt = status === 'succeed' ? new Date().toISOString() : null;
  const rows = await sql`
    INSERT INTO system_photos (id, player_id, system_id, kling_task_id, prompt_used, status, photo_url, completed_at)
    VALUES (${data.id}, ${data.playerId}, ${data.systemId}, ${klingTaskId}, ${data.promptUsed}, ${status}, ${photoUrl}, ${completedAt})
    ON CONFLICT (player_id, system_id) DO UPDATE SET
      kling_task_id = EXCLUDED.kling_task_id,
      prompt_used = EXCLUDED.prompt_used,
      status = EXCLUDED.status,
      photo_url = EXCLUDED.photo_url,
      completed_at = EXCLUDED.completed_at
    RETURNING *
  `;
  return rows[0] as SystemPhotoRow;
}

export async function getSystemPhoto(
  playerId: string,
  systemId: string,
): Promise<SystemPhotoRow | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT * FROM system_photos
    WHERE player_id = ${playerId} AND system_id = ${systemId}
  `;
  return (rows[0] as SystemPhotoRow) ?? null;
}

export async function getSystemPhotoById(id: string): Promise<SystemPhotoRow | null> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM system_photos WHERE id = ${id}`;
  return (rows[0] as SystemPhotoRow) ?? null;
}

export async function updateSystemPhoto(
  id: string,
  updates: Partial<{
    status: string;
    photo_url: string;
  }>,
): Promise<SystemPhotoRow | null> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE system_photos
    SET status = COALESCE(${updates.status ?? null}, status),
        photo_url = COALESCE(${updates.photo_url ?? null}, photo_url),
        completed_at = CASE WHEN ${updates.status ?? null} IN ('succeed', 'failed') THEN NOW() ELSE completed_at END
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as SystemPhotoRow) ?? null;
}

export async function getPlayerSystemPhotos(playerId: string): Promise<SystemPhotoRow[]> {
  const sql = getSQL();
  return (await sql`
    SELECT * FROM system_photos
    WHERE player_id = ${playerId}
    ORDER BY created_at DESC
  `) as SystemPhotoRow[];
}

// ---------------------------------------------------------------------------
// System Mission helpers (video missions from system photos)
// ---------------------------------------------------------------------------

export interface SystemMissionRow {
  id: string;
  player_id: string;
  system_id: string;
  photo_id: string;
  duration_type: string; // 'short' | 'long'
  duration_sec: number;
  cost_quarks: number;
  status: string; // 'generating' | 'succeed' | 'failed'
  kling_task_id: string | null;
  video_url: string | null;
  prompt_used: string | null;
  created_at: string;
  completed_at: string | null;
}

export async function saveSystemMission(data: {
  id: string;
  playerId: string;
  systemId: string;
  photoId: string;
  durationType: 'short' | 'long';
  durationSec: number;
  costQuarks: number;
  klingTaskId: string;
  promptUsed: string;
}): Promise<SystemMissionRow> {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO system_missions (
      id, player_id, system_id, photo_id,
      duration_type, duration_sec, cost_quarks,
      kling_task_id, prompt_used, status
    ) VALUES (
      ${data.id}, ${data.playerId}, ${data.systemId}, ${data.photoId},
      ${data.durationType}, ${data.durationSec}, ${data.costQuarks},
      ${data.klingTaskId}, ${data.promptUsed}, 'generating'
    )
    RETURNING *
  `;
  return rows[0] as SystemMissionRow;
}

export async function getSystemMission(id: string): Promise<SystemMissionRow | null> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM system_missions WHERE id = ${id}`;
  return (rows[0] as SystemMissionRow) ?? null;
}

export async function getActiveSystemMission(
  playerId: string,
  systemId: string,
): Promise<SystemMissionRow | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT * FROM system_missions
    WHERE player_id = ${playerId} AND system_id = ${systemId}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return (rows[0] as SystemMissionRow) ?? null;
}

export async function updateSystemMission(
  id: string,
  updates: Partial<{
    status: string;
    video_url: string;
  }>,
): Promise<SystemMissionRow | null> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE system_missions
    SET status = COALESCE(${updates.status ?? null}, status),
        video_url = COALESCE(${updates.video_url ?? null}, video_url),
        completed_at = CASE WHEN ${updates.status ?? null} IN ('succeed', 'failed') THEN NOW() ELSE completed_at END
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as SystemMissionRow) ?? null;
}

export async function getPlayerSystemMissions(playerId: string): Promise<SystemMissionRow[]> {
  const sql = getSQL();
  return (await sql`
    SELECT * FROM system_missions
    WHERE player_id = ${playerId}
    ORDER BY created_at DESC
  `) as SystemMissionRow[];
}

// ---------------------------------------------------------------------------
// Messages (chat)
// ---------------------------------------------------------------------------

export interface MessageRow {
  id: string;
  channel: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

export interface DMChannelInfo {
  channel: string;
  peer_id: string;
  peer_name: string;
  last_message: string;
  last_at: string;
}

/** Save a chat message. */
export async function saveMessage(
  senderId: string,
  senderName: string,
  channel: string,
  content: string,
): Promise<MessageRow> {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO messages (sender_id, sender_name, channel, content)
    VALUES (${senderId}, ${senderName}, ${channel}, ${content})
    RETURNING *
  `;
  return rows[0] as MessageRow;
}

/** Get messages for a channel, optionally after a timestamp. Newest last. */
export async function getMessages(
  channel: string,
  limit: number = 50,
  after?: string,
): Promise<MessageRow[]> {
  const sql = getSQL();
  if (after) {
    return (await sql`
      SELECT * FROM messages
      WHERE channel = ${channel} AND created_at > ${after}
      ORDER BY created_at ASC
      LIMIT ${limit}
    `) as MessageRow[];
  }
  // Without after: get last N messages (sub-select to reverse order)
  return (await sql`
    SELECT * FROM (
      SELECT * FROM messages
      WHERE channel = ${channel}
      ORDER BY created_at DESC
      LIMIT ${limit}
    ) sub ORDER BY created_at ASC
  `) as MessageRow[];
}

/** Get DM channels for a player with last message info. */
export async function getPlayerDMChannels(playerId: string): Promise<DMChannelInfo[]> {
  const sql = getSQL();
  // Find channels where playerId is a participant (dm:{id1}:{id2} format)
  const pattern = `dm:%${playerId}%`;
  const rows = await sql`
    SELECT DISTINCT ON (m.channel)
      m.channel,
      m.content AS last_message,
      m.created_at AS last_at,
      m.sender_id,
      m.sender_name
    FROM messages m
    WHERE m.channel LIKE ${pattern}
      AND (m.channel LIKE ${'dm:' + playerId + ':%'} OR m.channel LIKE ${'%:' + playerId})
    ORDER BY m.channel, m.created_at DESC
  `;

  // Resolve peer info from channel ID
  return (rows as Array<Record<string, string>>).map((row) => {
    const parts = row.channel.split(':');
    const peerId = parts[1] === playerId ? parts[2] : parts[1];
    const peerName = row.sender_id === playerId ? '' : row.sender_name;
    return {
      channel: row.channel,
      peer_id: peerId,
      peer_name: peerName,
      last_message: row.last_message,
      last_at: row.last_at,
    } as DMChannelInfo;
  });
}

/** Search players by callsign prefix (for DM search). */
export async function searchPlayers(
  query: string,
  limit: number = 10,
  excludeId?: string,
): Promise<Array<{ id: string; callsign: string }>> {
  const sql = getSQL();
  const pattern = query + '%';
  if (excludeId) {
    return (await sql`
      SELECT id, callsign FROM players
      WHERE callsign ILIKE ${pattern} AND id != ${excludeId} AND callsign IS NOT NULL
      LIMIT ${limit}
    `) as Array<{ id: string; callsign: string }>;
  }
  return (await sql`
    SELECT id, callsign FROM players
    WHERE callsign ILIKE ${pattern} AND callsign IS NOT NULL
    LIMIT ${limit}
  `) as Array<{ id: string; callsign: string }>;
}
