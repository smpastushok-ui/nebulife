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
  global_index: number | null;
  // Notification preferences
  preferred_language: string;
  email_notifications: boolean;
  push_notifications: boolean;
  fcm_token: string | null;
  last_digest_seen: string | null;
  cluster_id: string | null;
}

/** Starter wallet for new players. 30⚛ — first photo is FREE (handled in
 *  handleQuantumFocus) so 30 covers ~1 paid photo (25⚛) with a small buffer
 *  instead of leaving a fresh player short by 5⚛ on their second action. */
export const STARTER_QUARKS = 30;

export async function createPlayer(player: {
  id: string;
  name: string;
  homeSystemId: string;
  homePlanetId: string;
}): Promise<PlayerRow> {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO players (id, name, home_system_id, home_planet_id, game_phase, last_login, quarks)
    VALUES (${player.id}, ${player.name}, ${player.homeSystemId}, ${player.homePlanetId}, 'onboarding', NOW(), ${STARTER_QUARKS})
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
    preferred_language: string;
    email_notifications: boolean;
    push_notifications: boolean;
    last_digest_seen: string;
  }>,
): Promise<PlayerRow | null> {
  const sql = getSQL();

  if (Object.keys(updates).length === 0) return getPlayer(playerId);

  const rows = await sql`
    UPDATE players
    SET game_phase = COALESCE(${updates.game_phase ?? null}, game_phase),
        science_points = COALESCE(${updates.science_points ?? null}, science_points),
        login_streak = COALESCE(${updates.login_streak ?? null}, login_streak),
        last_login = COALESCE(${updates.last_login ?? null}, last_login),
        game_state = CASE
          WHEN ${updates.game_state ? JSON.stringify(updates.game_state) : null}::jsonb IS NOT NULL
          THEN game_state || ${JSON.stringify(updates.game_state ?? {})}::jsonb
          ELSE game_state
        END,
        quarks = COALESCE(${updates.quarks ?? null}, quarks),
        home_system_id = COALESCE(${updates.home_system_id ?? null}, home_system_id),
        home_planet_id = COALESCE(${updates.home_planet_id ?? null}, home_planet_id),
        preferred_language = COALESCE(${updates.preferred_language ?? null}, preferred_language),
        email_notifications = COALESCE(${updates.email_notifications !== undefined ? updates.email_notifications : null}, email_notifications),
        push_notifications = COALESCE(${updates.push_notifications !== undefined ? updates.push_notifications : null}, push_notifications),
        last_digest_seen = COALESCE(${updates.last_digest_seen ?? null}, last_digest_seen)
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

  // Delete all player-owned data in parallel (keep quarks)
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
    // Clear all chat channels owned by this player (A.S.T.R.A., system, DMs, sent messages)
    sql`DELETE FROM messages WHERE sender_id = ${playerId}
        OR channel = ${'astra:' + playerId}
        OR channel = ${'system:' + playerId}
        OR (channel LIKE 'dm:%' AND channel LIKE ${'%' + playerId + '%'})`,
    // Clear academy progress
    sql`DELETE FROM academy_progress WHERE player_id = ${playerId}`,
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

/** Atomic increment of game_state.researchData (stored inside the JSONB blob).
 *  Used by ad rewards that grant research data so the value persists even if
 *  the client crashes between reward grant and the next state sync. */
export async function creditResearchData(
  playerId: string,
  amount: number,
): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE players
    SET game_state = jsonb_set(
      game_state,
      '{researchData}',
      to_jsonb(COALESCE((game_state->>'researchData')::float, 0) + ${amount})
    )
    WHERE id = ${playerId}
  `;
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
              ${player.name}, ${player.homeSystemId}, ${player.homePlanetId}, 'onboarding', NOW(), ${STARTER_QUARKS})
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

// ---------------------------------------------------------------------------
// Universe helpers
// ---------------------------------------------------------------------------

/** Get total number of registered players (for galaxy group count). */
export async function getTotalPlayerCount(): Promise<number> {
  const sql = getSQL();
  const rows = await sql`SELECT COUNT(*)::int AS count FROM players`;
  return (rows[0] as { count: number }).count;
}

// ---------------------------------------------------------------------------
// Reports & Chat Bans
// ---------------------------------------------------------------------------

export interface ReportRow {
  id: number;
  reporter_id: string;
  reported_id: string;
  message_id: string | null;
  message_content: string;
  channel: string;
  context_json: string | null;
  status: string; // pending|warned|blocked|severe|dismissed
  gemini_verdict: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export async function saveReport(
  reporterId: string,
  reportedId: string,
  messageId: string | null,
  content: string,
  channel: string,
  contextJson: string,
): Promise<ReportRow> {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO reports (reporter_id, reported_id, message_id, message_content, channel, context_json)
    VALUES (${reporterId}, ${reportedId}, ${messageId}, ${content}, ${channel}, ${contextJson})
    ON CONFLICT (reporter_id, message_id) WHERE message_id IS NOT NULL DO NOTHING
    RETURNING *
  `;
  if (rows[0]) return rows[0] as ReportRow;
  // Duplicate — fetch existing
  const existing = await sql`
    SELECT * FROM reports WHERE reporter_id = ${reporterId} AND message_id = ${messageId} LIMIT 1
  `;
  return existing[0] as ReportRow;
}

export async function getPendingReports(limit: number = 10): Promise<ReportRow[]> {
  const sql = getSQL();
  return (await sql`
    SELECT * FROM reports WHERE status = 'pending' ORDER BY created_at ASC LIMIT ${limit}
  `) as ReportRow[];
}

export async function updateReport(
  id: number,
  status: string,
  verdict: string,
): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE reports
    SET status = ${status}, gemini_verdict = ${verdict}, reviewed_at = NOW()
    WHERE id = ${id}
  `;
}

export async function chatBanPlayer(
  playerId: string,
  channel: string,
  expiresAt: Date,
  reason: string,
  bannedBy: string = 'gemini',
): Promise<void> {
  const sql = getSQL();
  await sql`
    INSERT INTO chat_bans (player_id, channel, banned_by, reason, expires_at)
    VALUES (${playerId}, ${channel}, ${bannedBy}, ${reason}, ${expiresAt.toISOString()})
    ON CONFLICT (player_id, channel) DO UPDATE
      SET reason = ${reason}, banned_by = ${bannedBy}, expires_at = ${expiresAt.toISOString()}, created_at = NOW()
  `;
}

export async function isChatBanned(playerId: string, channel: string): Promise<boolean> {
  const sql = getSQL();
  const rows = await sql`
    SELECT 1 FROM chat_bans
    WHERE player_id = ${playerId}
      AND (channel = ${channel} OR channel = 'all')
      AND expires_at > NOW()
    LIMIT 1
  `;
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Daily Content (quiz & fun facts)
// ---------------------------------------------------------------------------

export async function getAllPlayerIds(): Promise<string[]> {
  const sql = getSQL();
  const rows = await sql`SELECT id FROM players ORDER BY created_at`;
  return rows.map((r) => (r as { id: string }).id);
}

export async function getPlayersRegisteredBefore(date: string): Promise<string[]> {
  const sql = getSQL();
  const rows = await sql`SELECT id FROM players WHERE created_at < ${date}::timestamptz ORDER BY created_at`;
  return rows.map((r) => (r as { id: string }).id);
}

export async function getDailyContent(
  contentType: string,
  date?: string,
): Promise<{ content_json: string } | null> {
  const sql = getSQL();
  const d = date ?? new Date().toISOString().slice(0, 10);
  const rows = await sql`
    SELECT content_json FROM daily_content
    WHERE content_type = ${contentType} AND content_date = ${d}
    LIMIT 1
  `;
  return (rows[0] as { content_json: string }) ?? null;
}

export async function saveDailyContent(
  contentType: string,
  contentJson: string,
): Promise<void> {
  const sql = getSQL();
  await sql`
    INSERT INTO daily_content (content_type, content_json)
    VALUES (${contentType}, ${contentJson})
    ON CONFLICT (content_type, content_date) DO NOTHING
  `;
}

// ---------------------------------------------------------------------------
// A.S.T.R.A. Token Tracking
// ---------------------------------------------------------------------------

export interface AstraUsageRow {
  tokens_used: number;
  tokens_purchased: number;
}

/** Get today's A.S.T.R.A. token usage for a player. */
export async function getAstraUsage(playerId: string): Promise<AstraUsageRow> {
  const sql = getSQL();
  const rows = await sql`
    SELECT tokens_used, tokens_purchased FROM astra_tokens
    WHERE player_id = ${playerId} AND usage_date = CURRENT_DATE
    LIMIT 1
  `;
  if (rows.length === 0) return { tokens_used: 0, tokens_purchased: 0 };
  const r = rows[0] as { tokens_used: number; tokens_purchased: number };
  return { tokens_used: r.tokens_used, tokens_purchased: r.tokens_purchased };
}

/** Add used tokens to today's counter. */
export async function addAstraUsage(playerId: string, tokens: number): Promise<void> {
  const sql = getSQL();
  await sql`
    INSERT INTO astra_tokens (player_id, tokens_used)
    VALUES (${playerId}, ${tokens})
    ON CONFLICT (player_id, usage_date)
    DO UPDATE SET tokens_used = astra_tokens.tokens_used + ${tokens}
  `;
}

/** Add purchased tokens to today's counter. */
export async function addAstraPurchasedTokens(playerId: string, tokens: number): Promise<void> {
  const sql = getSQL();
  await sql`
    INSERT INTO astra_tokens (player_id, tokens_purchased)
    VALUES (${playerId}, ${tokens})
    ON CONFLICT (player_id, usage_date)
    DO UPDATE SET tokens_purchased = astra_tokens.tokens_purchased + ${tokens}
  `;
}

// ---------------------------------------------------------------------------
// Weekly Digest
// ---------------------------------------------------------------------------

export interface WeeklyDigestRow {
  id: number;
  week_date: string;
  news_json: string | null;
  status: string;
  images_generated: number;
  images_json: string | null;
  created_at: string;
  emails_sent: boolean;
  pushes_sent: boolean;
}

export async function getWeeklyDigest(weekDate: string): Promise<WeeklyDigestRow | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT * FROM weekly_digest WHERE week_date = ${weekDate} LIMIT 1
  `;
  return (rows[0] as WeeklyDigestRow) ?? null;
}

export async function saveWeeklyDigest(weekDate: string, newsJson: string): Promise<void> {
  const sql = getSQL();
  await sql`
    INSERT INTO weekly_digest (week_date, news_json, status)
    VALUES (${weekDate}, ${newsJson}, 'generating_images')
    ON CONFLICT (week_date) DO NOTHING
  `;
}

export async function getPendingDigest(): Promise<WeeklyDigestRow | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT * FROM weekly_digest
    WHERE status = 'generating_images' AND images_generated < 10
    ORDER BY created_at DESC LIMIT 1
  `;
  return (rows[0] as WeeklyDigestRow) ?? null;
}

export async function updateDigestImage(
  weekDate: string,
  imagesJson: string,
  newCount: number,
  totalImages = 10,
): Promise<void> {
  const sql = getSQL();
  const status = newCount >= totalImages ? 'complete' : 'generating_images';
  await sql`
    UPDATE weekly_digest
    SET images_json = ${imagesJson}, images_generated = ${newCount}, status = ${status}
    WHERE week_date = ${weekDate}
  `;
}

export async function getLatestCompleteDigest(): Promise<WeeklyDigestRow | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT * FROM weekly_digest WHERE status = 'complete'
    ORDER BY week_date DESC LIMIT 1
  `;
  return (rows[0] as WeeklyDigestRow) ?? null;
}

/** Returns complete digest that has not yet had emails sent. */
export async function getDigestPendingEmails(): Promise<WeeklyDigestRow | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT * FROM weekly_digest
    WHERE status = 'complete' AND emails_sent = FALSE
    ORDER BY week_date DESC LIMIT 1
  `;
  return (rows[0] as WeeklyDigestRow) ?? null;
}

/** Returns complete digest that has not yet had pushes sent. */
export async function getDigestPendingPushes(): Promise<WeeklyDigestRow | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT * FROM weekly_digest
    WHERE status = 'complete' AND pushes_sent = FALSE
    ORDER BY week_date DESC LIMIT 1
  `;
  return (rows[0] as WeeklyDigestRow) ?? null;
}

/** Players with email + email notifications enabled for the given language. */
export async function getDigestEmailRecipients(lang: string): Promise<PlayerRow[]> {
  const sql = getSQL();
  const rows = await sql`
    SELECT * FROM players
    WHERE preferred_language = ${lang}
      AND email IS NOT NULL
      AND email_notifications = TRUE
  `;
  return rows as PlayerRow[];
}

/** Players with FCM token + push notifications enabled for the given language. */
export async function getDigestPushRecipients(lang: string): Promise<PlayerRow[]> {
  const sql = getSQL();
  const rows = await sql`
    SELECT * FROM players
    WHERE preferred_language = ${lang}
      AND fcm_token IS NOT NULL
      AND push_notifications = TRUE
  `;
  return rows as PlayerRow[];
}

/** Mark a digest as having had emails sent. */
export async function markDigestEmailsSent(weekDate: string): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE weekly_digest SET emails_sent = TRUE WHERE week_date = ${weekDate}
  `;
}

/** Mark a digest as having had pushes sent. */
export async function markDigestPushesSent(weekDate: string): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE weekly_digest SET pushes_sent = TRUE WHERE week_date = ${weekDate}
  `;
}

/** Store or clear the player's FCM registration token. */
export async function updateFcmToken(playerId: string, token: string | null): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE players SET fcm_token = ${token} WHERE id = ${playerId}
  `;
}

// ---------------------------------------------------------------------------
// Ad Rewards
// ---------------------------------------------------------------------------

const AD_DAILY_LIMIT = 10;

export async function getAdRewardCount(playerId: string): Promise<number> {
  const sql = getSQL();
  const rows = await sql`
    SELECT views_count FROM ad_rewards
    WHERE player_id = ${playerId} AND reward_date = CURRENT_DATE
    LIMIT 1
  `;
  if (rows.length === 0) return 0;
  return (rows[0] as { views_count: number }).views_count;
}

// ---------------------------------------------------------------------------
// Idempotency Keys
// ---------------------------------------------------------------------------

export interface IdempotencyRecord {
  key: string;
  player_id: string;
  endpoint: string;
  response_status: number | null;
  response_body: Record<string, unknown> | null;
  completed_at: string | null;
}

type AcquireResult =
  | { acquired: true }
  | { acquired: false; record: IdempotencyRecord }
  | { acquired: false; pending: true };

export async function acquireIdempotencyKey(
  key: string,
  playerId: string,
  endpoint: string,
): Promise<AcquireResult> {
  const sql = getSQL();

  // Atomic INSERT — if conflict, key already exists
  const rows = await sql`
    INSERT INTO idempotency_keys (key, player_id, endpoint)
    VALUES (${key}, ${playerId}, ${endpoint})
    ON CONFLICT (key) DO NOTHING
    RETURNING key
  `;

  if (rows.length > 0) return { acquired: true };

  // Key exists — fetch it
  const existing = await sql`
    SELECT * FROM idempotency_keys WHERE key = ${key} AND player_id = ${playerId}
  `;

  if (existing.length === 0) {
    return { acquired: false, pending: true }; // Different player's key
  }

  const record = existing[0] as IdempotencyRecord;
  if (record.completed_at) {
    return { acquired: false, record };
  }

  return { acquired: false, pending: true };
}

export async function completeIdempotencyKey(
  key: string,
  status: number,
  body: Record<string, unknown>,
): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE idempotency_keys
    SET response_status = ${status},
        response_body = ${JSON.stringify(body)}::jsonb,
        completed_at = NOW()
    WHERE key = ${key}
  `;
}

/** Atomic add — prevents TOCTOU race via WHERE clause. */
export async function addAdReward(playerId: string, adsWatched: number): Promise<boolean> {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO ad_rewards (player_id, views_count)
    VALUES (${playerId}, ${adsWatched})
    ON CONFLICT (player_id, reward_date)
    DO UPDATE SET views_count = ad_rewards.views_count + ${adsWatched}
    WHERE ad_rewards.views_count + ${adsWatched} <= ${AD_DAILY_LIMIT}
    RETURNING views_count
  `;
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Account Deletion (GDPR / Apple requirement)
// ---------------------------------------------------------------------------

/**
 * Permanently delete all player data from the database.
 * Order: dependent tables first, then the player record.
 */
export async function deletePlayerData(playerId: string): Promise<void> {
  const sql = getSQL();

  // Tables with CASCADE or manual FK — delete dependent data first
  await sql`DELETE FROM discoveries WHERE player_id = ${playerId}`;
  await sql`DELETE FROM planet_models WHERE player_id = ${playerId}`;
  await sql`DELETE FROM player_aliases WHERE player_id = ${playerId}`;
  await sql`DELETE FROM surface_buildings WHERE player_id = ${playerId}`;
  await sql`DELETE FROM surface_maps WHERE player_id = ${playerId}`;
  await sql`DELETE FROM system_photos WHERE player_id = ${playerId}`;
  await sql`DELETE FROM system_missions WHERE player_id = ${playerId}`;
  await sql`DELETE FROM expeditions WHERE player_id = ${playerId}`;
  await sql`DELETE FROM kling_tasks WHERE player_id = ${playerId}`;

  // Tables without FK — manual delete
  await sql`DELETE FROM chat_bans WHERE player_id = ${playerId}`;
  await sql`DELETE FROM astra_tokens WHERE player_id = ${playerId}`;
  await sql`DELETE FROM ad_rewards WHERE player_id = ${playerId}`;
  await sql`DELETE FROM payment_intents WHERE player_id = ${playerId}`;
  await sql`DELETE FROM idempotency_keys WHERE player_id = ${playerId}`;
  await sql`DELETE FROM used_ad_sessions WHERE player_id = ${playerId}`;

  // Messages: anonymize sender (keep for chat history integrity)
  await sql`UPDATE messages SET sender_id = 'deleted', sender_name = 'Видалений' WHERE sender_id = ${playerId}`;

  // Finally delete the player record
  await sql`DELETE FROM players WHERE id = ${playerId}`;
}

// ---------------------------------------------------------------------------
// Academy: Education Progress + Lesson Cache
// ---------------------------------------------------------------------------

export interface AcademyProgressRow {
  player_id: string;
  difficulty: string;
  selected_topics: string[];
  completed_lessons: Record<string, string>;
  active_quest: unknown;
  quest_streak: number;
  longest_streak: number;
  last_quest_date: string | null;
  total_quests_completed: number;
  total_quizzes_correct: number;
  total_quizzes_answered: number;
  category_progress: Record<string, unknown>;
  onboarded: boolean;
}

export interface AcademyLessonRow {
  id: number;
  lesson_date: string;
  topic_id: string;
  difficulty: string;
  lesson_content: string;
  lesson_image_url: string | null;
  quest_data: unknown;
  quiz_data: unknown;
}

export async function getAcademyProgress(playerId: string): Promise<AcademyProgressRow | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT * FROM academy_progress WHERE player_id = ${playerId} LIMIT 1
  `;
  return (rows[0] as AcademyProgressRow) ?? null;
}

export async function createAcademyProgress(
  playerId: string,
  difficulty: string,
  selectedTopics: string[],
): Promise<void> {
  const sql = getSQL();
  await sql`
    INSERT INTO academy_progress (player_id, difficulty, selected_topics, onboarded)
    VALUES (${playerId}, ${difficulty}, ${selectedTopics}, true)
    ON CONFLICT (player_id) DO UPDATE SET
      difficulty = ${difficulty},
      selected_topics = ${selectedTopics},
      onboarded = true,
      updated_at = NOW()
  `;
}

export async function updateAcademyProgress(
  playerId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const sql = getSQL();
  // Build update dynamically for each field
  for (const [key, value] of Object.entries(fields)) {
    if (key === 'completed_lessons' || key === 'active_quest' || key === 'category_progress') {
      const jsonVal = value !== null ? JSON.stringify(value) : null;
      await sql`
        UPDATE academy_progress
        SET ${sql(key)} = ${jsonVal}::jsonb, updated_at = NOW()
        WHERE player_id = ${playerId}
      `;
    } else {
      await sql`
        UPDATE academy_progress
        SET ${sql(key)} = ${value as string | number | boolean | null}, updated_at = NOW()
        WHERE player_id = ${playerId}
      `;
    }
  }
}

export async function getCachedLesson(
  date: string,
  topicId: string,
  difficulty: string,
): Promise<AcademyLessonRow | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT * FROM academy_lessons
    WHERE lesson_date = ${date} AND topic_id = ${topicId} AND difficulty = ${difficulty}
    LIMIT 1
  `;
  return (rows[0] as AcademyLessonRow) ?? null;
}

export async function saveCachedLesson(
  date: string,
  topicId: string,
  difficulty: string,
  lessonContent: string,
  lessonImageUrl: string | null,
  questData: unknown,
  quizData: unknown,
): Promise<void> {
  const sql = getSQL();
  await sql`
    INSERT INTO academy_lessons (lesson_date, topic_id, difficulty, lesson_content, lesson_image_url, quest_data, quiz_data)
    VALUES (${date}, ${topicId}, ${difficulty}, ${lessonContent}, ${lessonImageUrl}, ${JSON.stringify(questData)}::jsonb, ${JSON.stringify(quizData)}::jsonb)
    ON CONFLICT (lesson_date, topic_id, difficulty) DO NOTHING
  `;
}

export async function getOnboardedPlayerIds(): Promise<string[]> {
  const sql = getSQL();
  const rows = await sql`SELECT player_id FROM academy_progress WHERE onboarded = true`;
  return rows.map((r) => (r as { player_id: string }).player_id);
}

// ---------------------------------------------------------------------------
// Clusters: player groups of 50 sharing 500 core systems
// ---------------------------------------------------------------------------

export interface ClusterRow {
  id: string;
  group_index: number;
  center_x: number;
  center_y: number;
  center_z: number;
  player_count: number;
  is_full: boolean;
  group_seed: number;
  created_at: string;
}

/** Find a cluster that still has open player slots (<50). */
export async function findAvailableCluster(): Promise<ClusterRow | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT * FROM clusters
    WHERE is_full = false
    ORDER BY group_index ASC
    LIMIT 1
  `;
  return (rows[0] as ClusterRow) ?? null;
}

/** Create a new cluster row. */
export async function createCluster(
  groupIndex: number,
  centerX: number,
  centerY: number,
  centerZ: number,
  groupSeed: number,
): Promise<ClusterRow> {
  const sql = getSQL();
  const id = `cluster_${groupIndex}`;
  const rows = await sql`
    INSERT INTO clusters (id, group_index, center_x, center_y, center_z, group_seed)
    VALUES (${id}, ${groupIndex}, ${centerX}, ${centerY}, ${centerZ}, ${groupSeed})
    ON CONFLICT (id) DO NOTHING
    RETURNING *
  `;
  if (rows[0]) return rows[0] as ClusterRow;
  // Already exists — fetch it
  const existing = await sql`SELECT * FROM clusters WHERE id = ${id}`;
  return existing[0] as ClusterRow;
}

/** Atomically increment player_count and set is_full when reaching 50. */
export async function incrementClusterPlayerCount(clusterId: string): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE clusters
    SET player_count = player_count + 1,
        is_full = (player_count + 1 >= 50)
    WHERE id = ${clusterId}
  `;
}

/** Atomically decrement player_count (e.g. on account deletion). */
export async function decrementClusterPlayerCount(clusterId: string): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE clusters
    SET player_count = GREATEST(player_count - 1, 0),
        is_full = false
    WHERE id = ${clusterId}
  `;
}

/** Get a cluster by its ID. */
export async function getClusterById(clusterId: string): Promise<ClusterRow | null> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM clusters WHERE id = ${clusterId}`;
  return (rows[0] as ClusterRow) ?? null;
}

/** Get a cluster by group_index. */
export async function getClusterByGroupIndex(groupIndex: number): Promise<ClusterRow | null> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM clusters WHERE group_index = ${groupIndex}`;
  return (rows[0] as ClusterRow) ?? null;
}

/** Get all players in a cluster (basic info). */
export async function getClusterPlayers(clusterId: string): Promise<Pick<PlayerRow, 'id' | 'name' | 'callsign' | 'global_index'>[]> {
  const sql = getSQL();
  const rows = await sql`
    SELECT id, name, callsign, global_index
    FROM players
    WHERE cluster_id = ${clusterId}
    ORDER BY global_index ASC
  `;
  return rows as Pick<PlayerRow, 'id' | 'name' | 'callsign' | 'global_index'>[];
}

/** Set a player's cluster_id. */
export async function setPlayerCluster(playerId: string, clusterId: string): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE players SET cluster_id = ${clusterId} WHERE id = ${playerId}
  `;
}

/** Get the total number of clusters. */
export async function getClusterCount(): Promise<number> {
  const sql = getSQL();
  const rows = await sql`SELECT COUNT(*)::int AS count FROM clusters`;
  return (rows[0] as { count: number }).count;
}

// ---------------------------------------------------------------------------
// Surface State (fog, harvested cells, bot/drone positions)
// ---------------------------------------------------------------------------

export interface SurfaceStateRow {
  player_id: string;
  planet_id: string;
  revealed_cells: unknown;  // JSONB — string[] of "col,row"
  harvested_cells: unknown; // JSONB — [string, HarvestedCell][]
  bot: unknown;             // JSONB — { col, row, active } | null
  harvesters: unknown;      // JSONB — { col, row }[]
  updated_at: string;
}

export async function getSurfaceState(
  playerId: string,
  planetId: string,
): Promise<SurfaceStateRow | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT * FROM surface_state
    WHERE player_id = ${playerId} AND planet_id = ${planetId}
  `;
  return (rows[0] as SurfaceStateRow) ?? null;
}

export async function saveSurfaceState(
  playerId: string,
  planetId: string,
  data: {
    revealedCells?: unknown;
    harvestedCells?: unknown;
    bot?: unknown;
    harvesters?: unknown;
  },
): Promise<void> {
  const sql = getSQL();
  const rc = data.revealedCells !== undefined ? JSON.stringify(data.revealedCells) : null;
  const hc = data.harvestedCells !== undefined ? JSON.stringify(data.harvestedCells) : null;
  const bt = data.bot !== undefined ? JSON.stringify(data.bot) : null;
  const hr = data.harvesters !== undefined ? JSON.stringify(data.harvesters) : null;

  await sql`
    INSERT INTO surface_state (player_id, planet_id, revealed_cells, harvested_cells, bot, harvesters, updated_at)
    VALUES (
      ${playerId}, ${planetId},
      COALESCE(${rc}::jsonb, '[]'::jsonb),
      COALESCE(${hc}::jsonb, '[]'::jsonb),
      ${bt}::jsonb,
      COALESCE(${hr}::jsonb, '[]'::jsonb),
      NOW()
    )
    ON CONFLICT (player_id, planet_id) DO UPDATE SET
      revealed_cells  = COALESCE(${rc}::jsonb,  surface_state.revealed_cells),
      harvested_cells = COALESCE(${hc}::jsonb,  surface_state.harvested_cells),
      bot             = COALESCE(${bt}::jsonb,  surface_state.bot),
      harvesters      = COALESCE(${hr}::jsonb,  surface_state.harvesters),
      updated_at      = NOW()
  `;
}

/** Update cluster center coordinates and seed (for backfill fixup). */
export async function updateClusterPosition(
  clusterId: string,
  centerX: number,
  centerY: number,
  centerZ: number,
  groupSeed: number,
): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE clusters
    SET center_x = ${centerX}, center_y = ${centerY}, center_z = ${centerZ}, group_seed = ${groupSeed}
    WHERE id = ${clusterId}
  `;
}

// ─────────────────────────────────────────────────────────────────────────
// Cluster shared state — colonization, destruction, presence (migration 013)
// ─────────────────────────────────────────────────────────────────────────

export interface PlanetClaimRow {
  cluster_id: string;
  system_id: string;
  planet_id: string;
  owner_player_id: string;
  claimed_at: string;
  colony_level: number;
  terraform_pct: number;
  owner_name_snapshot: string | null;
}

export interface PlanetDestructionRow {
  cluster_id: string;
  system_id: string;
  planet_id: string;
  destroyed_by_player_id: string;
  destroyed_at: string;
  orbit_au: number | null;
  reason: string | null;
}

export interface PlayerPresenceRow {
  player_id: string;
  cluster_id: string | null;
  last_heartbeat: string;
  current_scene: string | null;
  current_system_id: string | null;
}

export interface ClusterOnlineMember {
  player_id: string;
  cluster_id: string;
  last_heartbeat: string;
  current_scene: string | null;
  current_system_id: string | null;
  player_name: string | null;
  global_index: number | null;
}

/** Get all planet claims for a single system within a cluster. */
export async function getSystemPlanetClaims(
  clusterId: string,
  systemId: string,
): Promise<PlanetClaimRow[]> {
  const sql = getSQL();
  const rows = await sql`
    SELECT cluster_id, system_id, planet_id, owner_player_id, claimed_at,
           colony_level, terraform_pct, owner_name_snapshot
    FROM planet_claims
    WHERE cluster_id = ${clusterId} AND system_id = ${systemId}
  ` as PlanetClaimRow[];
  return rows;
}

/** Get all planet claims owned by one player (across all systems in a cluster). */
export async function getPlayerPlanetClaims(
  playerId: string,
): Promise<PlanetClaimRow[]> {
  const sql = getSQL();
  const rows = await sql`
    SELECT cluster_id, system_id, planet_id, owner_player_id, claimed_at,
           colony_level, terraform_pct, owner_name_snapshot
    FROM planet_claims
    WHERE owner_player_id = ${playerId}
    ORDER BY claimed_at DESC
  ` as PlanetClaimRow[];
  return rows;
}

/**
 * Claim a planet for a player. Idempotent: if the planet is already claimed
 * by the same player, updates colony_level/terraform_pct. If claimed by
 * someone else, returns null (caller should show "already colonized").
 */
export async function claimPlanet(args: {
  clusterId: string;
  systemId: string;
  planetId: string;
  ownerPlayerId: string;
  ownerNameSnapshot?: string | null;
  colonyLevel?: number;
  terraformPct?: number;
}): Promise<PlanetClaimRow | null> {
  const sql = getSQL();
  const colonyLevel = args.colonyLevel ?? 1;
  const terraformPct = args.terraformPct ?? 0;
  const ownerName = args.ownerNameSnapshot ?? null;

  // Try insert; if conflict on PK, update only when owner matches.
  const rows = await sql`
    INSERT INTO planet_claims (
      cluster_id, system_id, planet_id, owner_player_id,
      colony_level, terraform_pct, owner_name_snapshot
    ) VALUES (
      ${args.clusterId}, ${args.systemId}, ${args.planetId}, ${args.ownerPlayerId},
      ${colonyLevel}, ${terraformPct}, ${ownerName}
    )
    ON CONFLICT (cluster_id, system_id, planet_id) DO UPDATE
      SET colony_level   = EXCLUDED.colony_level,
          terraform_pct  = EXCLUDED.terraform_pct,
          owner_name_snapshot = EXCLUDED.owner_name_snapshot
      WHERE planet_claims.owner_player_id = EXCLUDED.owner_player_id
    RETURNING cluster_id, system_id, planet_id, owner_player_id, claimed_at,
              colony_level, terraform_pct, owner_name_snapshot
  ` as PlanetClaimRow[];
  return rows[0] ?? null;
}

/** Release a planet claim (player abandons colony). */
export async function releasePlanetClaim(args: {
  clusterId: string;
  systemId: string;
  planetId: string;
  ownerPlayerId: string;
}): Promise<void> {
  const sql = getSQL();
  await sql`
    DELETE FROM planet_claims
    WHERE cluster_id = ${args.clusterId}
      AND system_id = ${args.systemId}
      AND planet_id = ${args.planetId}
      AND owner_player_id = ${args.ownerPlayerId}
  `;
}

/** Get all destruction events for a single system within a cluster. */
export async function getSystemPlanetDestructions(
  clusterId: string,
  systemId: string,
): Promise<PlanetDestructionRow[]> {
  const sql = getSQL();
  const rows = await sql`
    SELECT cluster_id, system_id, planet_id, destroyed_by_player_id, destroyed_at,
           orbit_au, reason
    FROM planet_destructions
    WHERE cluster_id = ${clusterId} AND system_id = ${systemId}
  ` as PlanetDestructionRow[];
  return rows;
}

/**
 * Record a planet destruction event. Idempotent on (cluster, system, planet).
 * Subsequent destructions for the same planet are no-ops.
 */
export async function recordPlanetDestruction(args: {
  clusterId: string;
  systemId: string;
  planetId: string;
  destroyedByPlayerId: string;
  orbitAU?: number;
  reason?: string;
}): Promise<void> {
  const sql = getSQL();
  await sql`
    INSERT INTO planet_destructions (
      cluster_id, system_id, planet_id, destroyed_by_player_id, orbit_au, reason
    ) VALUES (
      ${args.clusterId}, ${args.systemId}, ${args.planetId},
      ${args.destroyedByPlayerId}, ${args.orbitAU ?? null}, ${args.reason ?? null}
    )
    ON CONFLICT (cluster_id, system_id, planet_id) DO NOTHING
  `;
}

/**
 * Update player presence (heartbeat + current location).
 * Called by client every ~30 seconds.
 */
export async function updatePlayerPresence(args: {
  playerId: string;
  clusterId: string | null;
  currentScene: string | null;
  currentSystemId: string | null;
}): Promise<void> {
  const sql = getSQL();
  await sql`
    INSERT INTO player_presence (
      player_id, cluster_id, last_heartbeat, current_scene, current_system_id
    ) VALUES (
      ${args.playerId}, ${args.clusterId}, NOW(), ${args.currentScene}, ${args.currentSystemId}
    )
    ON CONFLICT (player_id) DO UPDATE
      SET cluster_id        = EXCLUDED.cluster_id,
          last_heartbeat    = NOW(),
          current_scene     = EXCLUDED.current_scene,
          current_system_id = EXCLUDED.current_system_id
  `;
}

/** List online cluster members (last_heartbeat within 5 minutes). */
export async function getClusterOnlineMembers(
  clusterId: string,
): Promise<ClusterOnlineMember[]> {
  const sql = getSQL();
  const rows = await sql`
    SELECT player_id, cluster_id, last_heartbeat, current_scene, current_system_id,
           player_name, global_index
    FROM v_cluster_online_members
    WHERE cluster_id = ${clusterId}
    ORDER BY last_heartbeat DESC
  ` as ClusterOnlineMember[];
  return rows;
}

/** Daily login bonus amount (per Game Bible §0.4-bis: tighter free-AI control) */
export const DAILY_LOGIN_BONUS = 1;

/**
 * Award daily login bonus if last_login was on a different calendar day (UTC).
 * Idempotent: calling twice on the same day is a no-op.
 *
 * Returns { credited: number, newBalance: number, streak: number }.
 * If credited=0, the player has already received today's bonus.
 */
export async function claimDailyLoginBonus(playerId: string): Promise<{
  credited: number;
  newBalance: number;
  streak: number;
}> {
  const sql = getSQL();

  // Atomic: check last_login day != today; if so, credit and update.
  // We compare UTC dates to avoid timezone games.
  const rows = await sql`
    WITH cur AS (
      SELECT quarks, login_streak, last_login,
             DATE(last_login AT TIME ZONE 'UTC') AS last_day,
             DATE(NOW()        AT TIME ZONE 'UTC') AS today
      FROM players WHERE id = ${playerId}
    ),
    upd AS (
      UPDATE players p
      SET quarks       = p.quarks + CASE WHEN cur.last_day < cur.today THEN ${DAILY_LOGIN_BONUS} ELSE 0 END,
          login_streak = CASE
                          WHEN cur.last_day = cur.today - INTERVAL '1 day' THEN p.login_streak + 1
                          WHEN cur.last_day < cur.today - INTERVAL '1 day' THEN 1
                          ELSE p.login_streak
                        END,
          last_login   = NOW()
      FROM cur
      WHERE p.id = ${playerId}
      RETURNING p.quarks, p.login_streak, cur.last_day, cur.today
    )
    SELECT quarks, login_streak,
           CASE WHEN last_day < today THEN ${DAILY_LOGIN_BONUS} ELSE 0 END AS credited
    FROM upd
  ` as Array<{ quarks: number; login_streak: number; credited: number }>;

  const row = rows[0];
  if (!row) return { credited: 0, newBalance: 0, streak: 0 };
  return {
    credited: row.credited,
    newBalance: row.quarks,
    streak: row.login_streak,
  };
}
