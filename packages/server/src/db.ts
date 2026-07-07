import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import {
  getCareBlockReason,
  applyDailyCare,
  pickMutations,
  pickHybridTraits,
  type CreatureCareState,
  type CreatureStage,
  type CareBlockReason,
  type TraitMutation,
  emptyResourceBundle,
  resourceTotal,
  getMegastructureRequirements,
  clampContribution,
  isMegastructureComplete,
  computeMegastructureBuilders,
  type MegastructureResourceBundle,
  type MegastructureBuilderRecord,
} from '@nebulife/core';

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
  avatar_url: string | null;
  premium_active: boolean;
  premium_expires_at: string | null;
  premium_product_id: string | null;
  premium_source: string | null;
  premium_updated_at: string | null;
  premium_daily_quarks_claimed_on: string | null;
  premium_web_access_email: string | null;
  premium_web_invite_sent_at: string | null;
  player_xp: number;
  player_level: number;
  last_seen_at: string | null;
  /** Capacitor Device.getId() — secondary recovery key for guest accounts. */
  device_id: string | null;
}

/** Starter wallet for new players. 30⚛ — first photo is FREE (handled in
 *  handleQuantumFocus) so 30 covers ~1 paid photo (25⚛) with a small buffer
 *  instead of leaving a fresh player short by 5⚛ on their second action. */
export const STARTER_QUARKS = 50;

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

export interface PremiumStatus {
  active: boolean;
  expiresAt: string | null;
  productId: string | null;
  source: string | null;
  updatedAt: string | null;
}

function rowToPremiumStatus(row: PlayerRow | null): PremiumStatus {
  if (!row) {
    return { active: false, expiresAt: null, productId: null, source: null, updatedAt: null };
  }
  const active = row.premium_active === true
    && (!row.premium_expires_at || new Date(row.premium_expires_at).getTime() > Date.now());
  return {
    active,
    expiresAt: row.premium_expires_at,
    productId: row.premium_product_id,
    source: row.premium_source,
    updatedAt: row.premium_updated_at,
  };
}

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

const CANONICAL_GAME_STATE_STORAGE_KEYS = new Set([
  'nebulife_player_xp',
  'nebulife_player_level',
  'nebulife_research_state',
  'nebulife_player_stats',
  'nebulife_research_data',
  'nebulife_colony_resources',
  'nebulife_colony_resources_by_planet',
  'nebulife_colony_resources_updated_at',
  'nebulife_colony_state',
  'nebulife_chemical_inventory',
  'nebulife_chemical_inventory_by_planet',
  'nebulife_life_ingredients',
  'nebulife_life_sparks',
  'nebulife_dna_spark_synthesis',
  'nebulife_exodus_phase',
  'nebulife_destroyed_planets',
  'nebulife_tutorial_step',
  'nebulife_tech_tree',
  'nebulife_game_started_at',
  'nebulife_time_multiplier',
  'nebulife_accel_at',
  'nebulife_game_time_at_accel',
  'nebulife_clock_revealed',
  'nebulife_scene',
  'nebulife_nav_system',
  'nebulife_nav_planet',
  'nebulife_log_entries',
  'nebulife_system_notifs',
  'nebulife_favorite_planets',
  'nebulife_favorite_planets_updated_at',
  'nebulife_pinned_systems',
  'nebulife_evac_system_id',
  'nebulife_evac_planet_id',
  'nebulife_evac_forced',
  'nebulife_home_system_id',
  'nebulife_home_planet_id',
  'nebulife_terraform_states',
  'nebulife_fleet',
  'nebulife_fleet_state',
  'nebulife_colonized_planets',
  'nebulife_planet_reveal_levels',
  'nebulife_planet_missions',
  'nebulife_planet_reports',
  'nebulife_exploration_payloads',
  'nebulife_exploration_production_queue',
  'nebulife_separation_jobs',
  'nebulife_arena_stats',
  'nebulife_observatory_state',
  'nebulife_astra_quiz_answers',
  'nebulife_daily_directives',
  'nebulife_comet_claims',
  'nebulife_planet_overrides',
  'nebulife_planet_resource_stocks',
]);

function sanitizeLocalStorageSnapshot(snapshot: unknown): unknown {
  if (!isJsonRecord(snapshot)) return snapshot;
  const sanitized: JsonRecord = {};
  for (const [key, value] of Object.entries(snapshot)) {
    if (CANONICAL_GAME_STATE_STORAGE_KEYS.has(key)) continue;
    sanitized[key] = value;
  }
  return sanitized;
}

function sanitizeGameStateForPersistence(value: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = { ...value };
  if ('local_storage_snapshot' in sanitized) {
    sanitized.local_storage_snapshot = sanitizeLocalStorageSnapshot(sanitized.local_storage_snapshot);
  }
  return sanitized;
}

function mergeNumberField(
  current: unknown,
  incoming: unknown,
  mode: 'min' | 'max',
): unknown {
  if (typeof current !== 'number') return incoming;
  if (typeof incoming !== 'number') return current;
  return mode === 'min' ? Math.min(current, incoming) : Math.max(current, incoming);
}

function mergePlanetResourceStock(current: unknown, incoming: unknown): unknown {
  if (!isJsonRecord(current) || !isJsonRecord(incoming)) return deepMergeGameStateValue(current, incoming);
  const merged = deepMergeGameStateValue(current, incoming);
  if (!isJsonRecord(merged)) return merged;

  const currentRemaining = current.remaining;
  const incomingRemaining = incoming.remaining;
  if (isJsonRecord(currentRemaining) && isJsonRecord(incomingRemaining)) {
    const remaining: JsonRecord = { ...currentRemaining, ...incomingRemaining };
    for (const key of new Set([...Object.keys(currentRemaining), ...Object.keys(incomingRemaining)])) {
      remaining[key] = mergeNumberField(currentRemaining[key], incomingRemaining[key], 'min');
    }
    merged.remaining = remaining;
  }

  const currentInitial = current.initial;
  const incomingInitial = incoming.initial;
  if (isJsonRecord(currentInitial) && isJsonRecord(incomingInitial)) {
    const initial: JsonRecord = { ...currentInitial, ...incomingInitial };
    for (const key of new Set([...Object.keys(currentInitial), ...Object.keys(incomingInitial)])) {
      initial[key] = mergeNumberField(currentInitial[key], incomingInitial[key], 'max');
    }
    merged.initial = initial;
  }

  return merged;
}

function mergePlanetResourceStocks(current: unknown, incoming: unknown): unknown {
  if (!isJsonRecord(current) || !isJsonRecord(incoming)) return deepMergeGameStateValue(current, incoming);
  const merged: JsonRecord = { ...current };
  for (const [planetKey, incomingStock] of Object.entries(incoming)) {
    merged[planetKey] = planetKey in current
      ? mergePlanetResourceStock(current[planetKey], incomingStock)
      : incomingStock;
  }
  return merged;
}

function deepMergeGameStateValue(current: unknown, incoming: unknown): unknown {
  if (incoming === undefined) return current;
  if (!isJsonRecord(current) || !isJsonRecord(incoming)) return incoming;

  const merged: JsonRecord = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    if (key === 'planet_resource_stocks') {
      merged[key] = mergePlanetResourceStocks(current[key], value);
      continue;
    }
    merged[key] = key in current ? deepMergeGameStateValue(current[key], value) : value;
  }
  return merged;
}

export function mergeGameStateForPersistence(
  current: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown> | null | undefined,
): Record<string, unknown> | undefined {
  if (!incoming) return undefined;
  const sanitizedCurrent = sanitizeGameStateForPersistence(current ?? {});
  const sanitizedIncoming = sanitizeGameStateForPersistence(incoming);
  const merged = deepMergeGameStateValue(sanitizedCurrent, sanitizedIncoming) as Record<string, unknown>;
  return sanitizeGameStateForPersistence(merged);
}

export async function getPremiumStatus(playerId: string): Promise<PremiumStatus> {
  return rowToPremiumStatus(await getPlayer(playerId));
}

export async function updatePlayerPremium(
  playerId: string,
  status: {
    active: boolean;
    expiresAt?: string | null;
    productId?: string | null;
    source: string;
  },
): Promise<PremiumStatus> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE players
    SET premium_active = ${status.active},
        premium_expires_at = ${status.expiresAt ?? null},
        premium_product_id = ${status.productId ?? null},
        premium_source = ${status.source},
        premium_updated_at = NOW()
    WHERE id = ${playerId}
    RETURNING *
  `;
  return rowToPremiumStatus((rows[0] as PlayerRow) ?? null);
}

export async function updatePlayerPremiumWebAccessEmail(
  playerId: string,
  email: string | null,
): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE players
    SET premium_web_access_email = ${email ? email.trim().toLowerCase() : null}
    WHERE id = ${playerId}
  `;
}

export async function markPremiumWebInviteSent(playerId: string): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE players
    SET premium_web_invite_sent_at = COALESCE(premium_web_invite_sent_at, NOW())
    WHERE id = ${playerId}
  `;
}

export async function savePremiumEntitlementEvent(event: {
  id?: string;
  playerId: string;
  eventType: string;
  source: string;
  productId?: string | null;
  expiresAt?: string | null;
  reference?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const sql = getSQL();
  await sql`
    INSERT INTO premium_entitlement_events (
      id, player_id, event_type, source, product_id, expires_at, reference, meta
    )
    VALUES (
      ${event.id ?? randomUUID()},
      ${event.playerId},
      ${event.eventType},
      ${event.source},
      ${event.productId ?? null},
      ${event.expiresAt ?? null},
      ${event.reference ?? null},
      ${JSON.stringify(event.meta ?? {})}::jsonb
    )
    ON CONFLICT DO NOTHING
  `;
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
    player_xp: number;
    player_level: number;
    last_seen_at: string;
  }>,
): Promise<PlayerRow | null> {
  const sql = getSQL();

  if (Object.keys(updates).length === 0) return getPlayer(playerId);

  let mergedGameState: Record<string, unknown> | undefined;
  if (updates.game_state) {
    const currentRows = await sql`SELECT game_state FROM players WHERE id = ${playerId}`;
    if (!currentRows[0]) return null;
    mergedGameState = mergeGameStateForPersistence(
      (currentRows[0] as { game_state?: Record<string, unknown> }).game_state ?? {},
      updates.game_state,
    );
  }

  const gameState = mergedGameState ?? updates.game_state;
  const snapshotXP = typeof gameState?.xp === 'number' && Number.isFinite(gameState.xp)
    ? Math.max(0, Math.floor(gameState.xp))
    : updates.player_xp;
  const snapshotLevel = typeof gameState?.level === 'number' && Number.isFinite(gameState.level)
    ? Math.max(1, Math.floor(gameState.level))
    : updates.player_level;
  const currentWeek = weekMondayString();

  const rows = await sql`
    UPDATE players
    SET game_phase = COALESCE(${updates.game_phase ?? null}, game_phase),
        science_points = COALESCE(${updates.science_points ?? null}, science_points),
        login_streak = COALESCE(${updates.login_streak ?? null}, login_streak),
        last_login = COALESCE(${updates.last_login ?? null}, last_login),
        game_state = CASE
          WHEN ${mergedGameState ? JSON.stringify(mergedGameState) : null}::jsonb IS NOT NULL
          THEN ${JSON.stringify(mergedGameState ?? {})}::jsonb
          ELSE game_state
        END,
        quarks = COALESCE(${updates.quarks ?? null}, quarks),
        home_system_id = COALESCE(${updates.home_system_id ?? null}, home_system_id),
        home_planet_id = COALESCE(${updates.home_planet_id ?? null}, home_planet_id),
        preferred_language = COALESCE(${updates.preferred_language ?? null}, preferred_language),
        email_notifications = COALESCE(${updates.email_notifications !== undefined ? updates.email_notifications : null}, email_notifications),
        push_notifications = COALESCE(${updates.push_notifications !== undefined ? updates.push_notifications : null}, push_notifications),
        last_digest_seen = COALESCE(${updates.last_digest_seen ?? null}, last_digest_seen),
        week_xp_base = CASE
          WHEN ${snapshotXP ?? null}::integer IS NOT NULL
            AND ${snapshotXP ?? null}::integer > player_xp
            AND week_xp_base_week IS DISTINCT FROM ${currentWeek}
          THEN player_xp
          ELSE week_xp_base
        END,
        week_xp_base_week = CASE
          WHEN ${snapshotXP ?? null}::integer IS NOT NULL
            AND ${snapshotXP ?? null}::integer > player_xp
            AND week_xp_base_week IS DISTINCT FROM ${currentWeek}
          THEN ${currentWeek}
          ELSE week_xp_base_week
        END,
        player_xp = GREATEST(player_xp, COALESCE(${snapshotXP ?? null}, player_xp)),
        player_level = GREATEST(player_level, COALESCE(${snapshotLevel ?? null}, player_level)),
        last_seen_at = COALESCE(${updates.last_seen_at ?? null}, NOW())
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
    sql`DELETE FROM ship_models WHERE player_id = ${playerId}`,
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
// Ship Model helpers (player-owned custom GLB ships via Kling + Tripo3D)
// ---------------------------------------------------------------------------

export interface ShipModelRow {
  id: string;
  player_id: string;
  status: string;
  prompt: string;
  prompt_used: string | null;
  moderation_status: string;
  moderation_reason: string | null;
  kling_task_id: string | null;
  concept_url: string | null;
  tripo_task_id: string | null;
  glb_url: string | null;
  quarks_paid: number;
  created_at: string;
  completed_at: string | null;
}

export async function saveShipModel(m: {
  id: string;
  playerId: string;
  prompt: string;
  promptUsed?: string;
  moderationStatus?: string;
  moderationReason?: string;
  status?: string;
  quarksPaid?: number;
}): Promise<ShipModelRow> {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO ship_models (
      id, player_id, prompt, prompt_used, moderation_status,
      moderation_reason, status, quarks_paid
    )
    VALUES (
      ${m.id}, ${m.playerId}, ${m.prompt}, ${m.promptUsed ?? null},
      ${m.moderationStatus ?? 'pending'}, ${m.moderationReason ?? null},
      ${m.status ?? 'pending'}, ${m.quarksPaid ?? 0}
    )
    RETURNING *
  `;
  return rows[0] as ShipModelRow;
}

export async function getShipModel(id: string): Promise<ShipModelRow | null> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM ship_models WHERE id = ${id}`;
  return (rows[0] as ShipModelRow) ?? null;
}

export async function getShipModels(playerId: string): Promise<ShipModelRow[]> {
  const sql = getSQL();
  return (await sql`
    SELECT * FROM ship_models
    WHERE player_id = ${playerId}
    ORDER BY created_at DESC
  `) as ShipModelRow[];
}

export async function updateShipModel(
  id: string,
  updates: Partial<{
    status: string;
    prompt_used: string;
    moderation_status: string;
    moderation_reason: string;
    kling_task_id: string;
    concept_url: string;
    tripo_task_id: string;
    glb_url: string;
    quarks_paid: number;
    completed_at: string;
  }>,
): Promise<ShipModelRow | null> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE ship_models
    SET status = COALESCE(${updates.status ?? null}, status),
        prompt_used = COALESCE(${updates.prompt_used ?? null}, prompt_used),
        moderation_status = COALESCE(${updates.moderation_status ?? null}, moderation_status),
        moderation_reason = COALESCE(${updates.moderation_reason ?? null}, moderation_reason),
        kling_task_id = COALESCE(${updates.kling_task_id ?? null}, kling_task_id),
        concept_url = COALESCE(${updates.concept_url ?? null}, concept_url),
        tripo_task_id = COALESCE(${updates.tripo_task_id ?? null}, tripo_task_id),
        glb_url = COALESCE(${updates.glb_url ?? null}, glb_url),
        quarks_paid = COALESCE(${updates.quarks_paid ?? null}, quarks_paid),
        completed_at = COALESCE(${updates.completed_at ?? null}::timestamptz, completed_at)
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as ShipModelRow) ?? null;
}

// ---------------------------------------------------------------------------
// Creature Model helpers (Biosphere — player creatures via image + Tripo3D)
// ---------------------------------------------------------------------------
// See NEXT_GEN_PLAN.md Section C. Mirrors the ship_models pattern: a text
// brief is moderated, turned into a reference image, then into a GLB via
// Tripo image_to_model. GLB is re-hosted on Vercel Blob (glb-storage.ts)
// before being marked ready, so creatures never depend on Tripo's CDN.

export interface CreatureModelRow {
  id: string;
  player_id: string;
  planet_id: string;
  name: string | null;
  description: string;
  prompt_used: string | null;
  image_url: string | null;
  glb_url: string | null;
  tripo_task_id: string | null;
  status: string; // queued | generating | ready | failed
  quarks_paid: number;
  created_at: string;
  completed_at: string | null;
  // Evolution (Еволюція біосфери — migration 041)
  vitality: number;
  stage: string; // juvenile | adult | elder | legacy
  care_days: number;
  last_care_at: string | null;
  generation: number;
  parent_id: string | null;
  traits: unknown; // JSONB — TraitMutation[] from @nebulife/core
  // Hybridization ("дослід схрещування" — migration 042)
  parent_b_id: string | null;
  is_hybrid: boolean;
  hybrid_photo_url: string | null;
}

export async function createCreatureModel(m: {
  id: string;
  playerId: string;
  planetId: string;
  description: string;
  promptUsed?: string;
  status?: string;
  quarksPaid?: number;
  name?: string;
  /** Set when this creature is an offspring (Еволюція біосфери — migration 041). */
  generation?: number;
  parentId?: string;
  traits?: unknown;
}): Promise<CreatureModelRow> {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO creature_models (
      id, player_id, planet_id, name, description, prompt_used, status, quarks_paid,
      generation, parent_id, traits
    )
    VALUES (
      ${m.id}, ${m.playerId}, ${m.planetId}, ${m.name ?? null}, ${m.description},
      ${m.promptUsed ?? null}, ${m.status ?? 'queued'}, ${m.quarksPaid ?? 0},
      ${m.generation ?? 1}, ${m.parentId ?? null}, ${m.traits ? JSON.stringify(m.traits) : null}
    )
    RETURNING *
  `;
  return rows[0] as CreatureModelRow;
}

export async function getCreatureModel(id: string): Promise<CreatureModelRow | null> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM creature_models WHERE id = ${id}`;
  return (rows[0] as CreatureModelRow) ?? null;
}

export async function listCreaturesByPlanet(planetId: string, playerId: string): Promise<CreatureModelRow[]> {
  const sql = getSQL();
  return (await sql`
    SELECT * FROM creature_models
    WHERE planet_id = ${planetId} AND player_id = ${playerId}
    ORDER BY created_at ASC
  `) as CreatureModelRow[];
}

export async function countPlayerCreatures(playerId: string): Promise<number> {
  const sql = getSQL();
  const rows = await sql`SELECT COUNT(*)::int AS count FROM creature_models WHERE player_id = ${playerId}`;
  return (rows[0] as { count: number } | undefined)?.count ?? 0;
}

/** Offspring already spawned by this account — used to gate the "first
 *  generation offspring is free" discount (Еволюція біосфери). */
export async function countPlayerOffspring(playerId: string): Promise<number> {
  const sql = getSQL();
  const rows = await sql`
    SELECT COUNT(*)::int AS count FROM creature_models
    WHERE player_id = ${playerId} AND parent_id IS NOT NULL
  `;
  return (rows[0] as { count: number } | undefined)?.count ?? 0;
}

export async function updateCreatureModel(
  id: string,
  updates: Partial<{
    status: string;
    prompt_used: string;
    image_url: string;
    glb_url: string;
    tripo_task_id: string;
    name: string;
    quarks_paid: number;
    completed_at: string;
    hybrid_photo_url: string;
  }>,
): Promise<CreatureModelRow | null> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE creature_models
    SET status = COALESCE(${updates.status ?? null}, status),
        prompt_used = COALESCE(${updates.prompt_used ?? null}, prompt_used),
        image_url = COALESCE(${updates.image_url ?? null}, image_url),
        glb_url = COALESCE(${updates.glb_url ?? null}, glb_url),
        tripo_task_id = COALESCE(${updates.tripo_task_id ?? null}, tripo_task_id),
        name = COALESCE(${updates.name ?? null}, name),
        quarks_paid = COALESCE(${updates.quarks_paid ?? null}, quarks_paid),
        completed_at = COALESCE(${updates.completed_at ?? null}::timestamptz, completed_at),
        hybrid_photo_url = COALESCE(${updates.hybrid_photo_url ?? null}, hybrid_photo_url)
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as CreatureModelRow) ?? null;
}

// ---------------------------------------------------------------------------
// Creature Evolution — daily care loop, growth stages, generations (041)
// ---------------------------------------------------------------------------
// Pure vitality/stage math lives in packages/core/src/game/creature-evolution.ts
// so the server (source of truth) and the client (decay preview) agree. These
// helpers apply that logic against the DB row and persist the result.

export type CareOutcome =
  | { ok: true; creature: CreatureModelRow }
  | { ok: false; reason: 'not_found' | 'forbidden' | CareBlockReason };

/** Validates once-per-UTC-day server-side, then updates vitality/care_days/stage. */
export async function careForCreature(id: string, playerId: string, nowMs = Date.now()): Promise<CareOutcome> {
  const creature = await getCreatureModel(id);
  if (!creature) return { ok: false, reason: 'not_found' };
  if (creature.player_id !== playerId) return { ok: false, reason: 'forbidden' };

  const state: CreatureCareState = {
    vitality: creature.vitality,
    careDays: creature.care_days,
    stage: creature.stage as CreatureStage,
    lastCareAtMs: creature.last_care_at ? new Date(creature.last_care_at).getTime() : null,
    createdAtMs: new Date(creature.created_at).getTime(),
  };
  const blockReason = getCareBlockReason(state, nowMs);
  if (blockReason) return { ok: false, reason: blockReason };

  const result = applyDailyCare(state, nowMs);
  if (!result) return { ok: false, reason: 'already_cared_today' };

  const sql = getSQL();
  const nowIso = new Date(nowMs).toISOString();
  const rows = await sql`
    UPDATE creature_models
    SET vitality = ${result.vitality},
        care_days = ${result.careDays},
        stage = ${result.stage},
        last_care_at = ${nowIso}::timestamptz
    WHERE id = ${id}
    RETURNING *
  `;
  return { ok: true, creature: rows[0] as CreatureModelRow };
}

export interface SpawnOffspringInput {
  parentId: string;
  playerId: string;
  offspringId: string;
  /** Offspring description text (parent brief + mutation phrases) — built by
   *  the caller via creature-prompt.ts so db.ts stays free of prompt copy. */
  description: string;
  quarksPaid: number;
}

export type SpawnOffspringOutcome =
  | { ok: true; parent: CreatureModelRow; offspring: CreatureModelRow }
  | { ok: false; reason: 'not_found' | 'forbidden' | 'not_elder' };

/** Marks the elder parent as `legacy` (frees its planet slot, no longer needs
 *  care) and inserts the mutated offspring row. Mutations are recomputed here
 *  deterministically from (parentId, generation) — see pickMutations — so the
 *  stored `traits` always match what the caller used to build the prompt. */
export async function spawnOffspring(input: SpawnOffspringInput): Promise<SpawnOffspringOutcome> {
  const parent = await getCreatureModel(input.parentId);
  if (!parent) return { ok: false, reason: 'not_found' };
  if (parent.player_id !== input.playerId) return { ok: false, reason: 'forbidden' };
  if (parent.stage !== 'elder') return { ok: false, reason: 'not_elder' };

  const generation = parent.generation + 1;
  const mutations = pickMutations(parent.id, generation);

  const sql = getSQL();
  const parentRows = await sql`
    UPDATE creature_models SET stage = 'legacy' WHERE id = ${parent.id} RETURNING *
  `;
  const offspringRows = await sql`
    INSERT INTO creature_models (
      id, player_id, planet_id, description, status, quarks_paid, generation, parent_id, traits
    )
    VALUES (
      ${input.offspringId}, ${input.playerId}, ${parent.planet_id}, ${input.description},
      'generating', ${input.quarksPaid}, ${generation}, ${parent.id}, ${JSON.stringify(mutations)}
    )
    RETURNING *
  `;
  return {
    ok: true,
    parent: parentRows[0] as CreatureModelRow,
    offspring: offspringRows[0] as CreatureModelRow,
  };
}

// ---------------------------------------------------------------------------
// Creature Hybridization — "дослід схрещування" (migration 042)
// ---------------------------------------------------------------------------
// Two same-planet non-legacy creatures fuse into a hybrid via the multi-image
// Gemini path (both parents' portraits as inputs). A hybrid row starts as
// 'generating'; the photo-only tier lands on 'photo_ready' (no GLB, no planet
// slot), the full tier continues through the usual Tripo poll to 'ready'.
// Trait mix is recomputed here from both parents via pickHybridTraits (same
// determinism pattern as spawnOffspring) so stored traits always match the
// prompt the caller built.

export interface CreateHybridInput {
  hybridId: string;
  playerId: string;
  parentAId: string;
  parentBId: string;
  /** Fused description text — built by the caller via creature-prompt.ts. */
  description: string;
  quarksPaid: number;
}

export type CreateHybridOutcome =
  | { ok: true; parentA: CreatureModelRow; parentB: CreatureModelRow; hybrid: CreatureModelRow }
  | { ok: false; reason: 'not_found' | 'forbidden' | 'same_creature' | 'different_planets' | 'parent_not_ready' | 'legacy_parent' };

/** Validates the parent pair and inserts the hybrid row (status 'generating').
 *  Parents keep their stage — hybridization never archives them. */
export async function createHybridCreature(input: CreateHybridInput): Promise<CreateHybridOutcome> {
  if (input.parentAId === input.parentBId) return { ok: false, reason: 'same_creature' };

  const [parentA, parentB] = await Promise.all([
    getCreatureModel(input.parentAId),
    getCreatureModel(input.parentBId),
  ]);
  if (!parentA || !parentB) return { ok: false, reason: 'not_found' };
  if (parentA.player_id !== input.playerId || parentB.player_id !== input.playerId) {
    return { ok: false, reason: 'forbidden' };
  }
  if (parentA.planet_id !== parentB.planet_id) return { ok: false, reason: 'different_planets' };
  if (parentA.status !== 'ready' || parentB.status !== 'ready') return { ok: false, reason: 'parent_not_ready' };
  if (parentA.stage === 'legacy' || parentB.stage === 'legacy') return { ok: false, reason: 'legacy_parent' };

  const generation = Math.max(parentA.generation ?? 1, parentB.generation ?? 1) + 1;
  const traits = pickHybridTraits(
    parentA.id,
    parentB.id,
    parentA.traits as TraitMutation[] | null,
    parentB.traits as TraitMutation[] | null,
  );

  const sql = getSQL();
  const rows = await sql`
    INSERT INTO creature_models (
      id, player_id, planet_id, description, status, quarks_paid,
      generation, parent_id, parent_b_id, is_hybrid, traits
    )
    VALUES (
      ${input.hybridId}, ${input.playerId}, ${parentA.planet_id}, ${input.description},
      'generating', ${input.quarksPaid}, ${generation}, ${parentA.id}, ${parentB.id},
      TRUE, ${JSON.stringify(traits)}
    )
    RETURNING *
  `;
  return { ok: true, parentA, parentB, hybrid: rows[0] as CreatureModelRow };
}

// ---------------------------------------------------------------------------
// Planet Skin helpers (shared Kling texture maps for planet spheres)
// ---------------------------------------------------------------------------

export interface PlanetSkinRow {
  id: string;
  planet_id: string;
  system_id: string;
  kind: string;
  status: string;
  texture_url: string | null;
  kling_task_id: string | null;
  prompt_used: string | null;
  generated_by: string | null;
  quarks_paid: number;
  created_at: string;
  completed_at: string | null;
}

export async function savePlanetSkin(data: {
  id: string;
  planetId: string;
  systemId: string;
  kind: 'system' | 'exosphere';
  playerId: string;
  klingTaskId?: string | null;
  promptUsed: string;
  status?: string;
  textureUrl?: string | null;
  quarksPaid?: number;
}): Promise<PlanetSkinRow> {
  const sql = getSQL();
  const status = data.status ?? 'generating';
  const rows = await sql`
    INSERT INTO planet_skins (
      id, planet_id, system_id, kind, generated_by, kling_task_id,
      prompt_used, status, texture_url, quarks_paid, completed_at
    )
    VALUES (
      ${data.id}, ${data.planetId}, ${data.systemId}, ${data.kind}, ${data.playerId},
      ${data.klingTaskId ?? null}, ${data.promptUsed}, ${status}, ${data.textureUrl ?? null},
      ${data.quarksPaid ?? 0}, ${status === 'succeed' ? new Date().toISOString() : null}
    )
    ON CONFLICT (system_id, planet_id, kind) DO UPDATE SET
      generated_by = COALESCE(planet_skins.generated_by, EXCLUDED.generated_by),
      kling_task_id = EXCLUDED.kling_task_id,
      prompt_used = EXCLUDED.prompt_used,
      status = EXCLUDED.status,
      texture_url = EXCLUDED.texture_url,
      quarks_paid = EXCLUDED.quarks_paid,
      completed_at = EXCLUDED.completed_at
    RETURNING *
  `;
  return rows[0] as PlanetSkinRow;
}

export async function getPlanetSkin(
  systemId: string,
  planetId: string,
  kind: 'system' | 'exosphere',
): Promise<PlanetSkinRow | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT * FROM planet_skins
    WHERE system_id = ${systemId} AND planet_id = ${planetId} AND kind = ${kind}
  `;
  return (rows[0] as PlanetSkinRow) ?? null;
}

export async function getPlanetSkinById(id: string): Promise<PlanetSkinRow | null> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM planet_skins WHERE id = ${id}`;
  return (rows[0] as PlanetSkinRow) ?? null;
}

export async function getPlanetSkinsForSystem(systemId: string): Promise<PlanetSkinRow[]> {
  const sql = getSQL();
  return (await sql`
    SELECT * FROM planet_skins
    WHERE system_id = ${systemId}
    ORDER BY created_at DESC
  `) as PlanetSkinRow[];
}

export async function updatePlanetSkin(
  id: string,
  updates: Partial<{
    status: string;
    texture_url: string;
    kling_task_id: string;
    prompt_used: string;
    quarks_paid: number;
  }>,
): Promise<PlanetSkinRow | null> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE planet_skins
    SET status = COALESCE(${updates.status ?? null}, status),
        texture_url = COALESCE(${updates.texture_url ?? null}, texture_url),
        kling_task_id = COALESCE(${updates.kling_task_id ?? null}, kling_task_id),
        prompt_used = COALESCE(${updates.prompt_used ?? null}, prompt_used),
        quarks_paid = COALESCE(${updates.quarks_paid ?? null}, quarks_paid),
        completed_at = CASE WHEN ${updates.status ?? null} IN ('succeed', 'failed') THEN NOW() ELSE completed_at END
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as PlanetSkinRow) ?? null;
}

// ---------------------------------------------------------------------------
// Surface Building helpers
// ---------------------------------------------------------------------------

export interface SurfaceBuildingRow {
  id: string;
  player_id: string;
  planet_id: string;
  system_id: string | null;
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
  systemId: string;
  type: string;
  x: number;
  y: number;
}): Promise<SurfaceBuildingRow> {
  const sql = getSQL();
  // UPSERT: the building id is deterministic (playerId-slot-type), so re-placing
  // the same building type on the same slot (e.g. demolish + rebuild, or a
  // client retry) must not 500 with a duplicate-PK error. Re-bind ownership/
  // coords and refresh built_at instead.
  const rows = await sql`
    INSERT INTO surface_buildings (id, player_id, planet_id, system_id, type, x, y)
    VALUES (${b.id}, ${b.playerId}, ${b.planetId}, ${b.systemId}, ${b.type}, ${b.x}, ${b.y})
    ON CONFLICT (id) DO UPDATE SET
      player_id = EXCLUDED.player_id,
      planet_id = EXCLUDED.planet_id,
      system_id = EXCLUDED.system_id,
      type = EXCLUDED.type,
      x = EXCLUDED.x,
      y = EXCLUDED.y,
      built_at = NOW()
    RETURNING *
  `;
  return rows[0] as SurfaceBuildingRow;
}

export async function getSurfaceBuildings(
  playerId: string,
  systemId: string,
  planetId: string,
): Promise<SurfaceBuildingRow[]> {
  const sql = getSQL();
  const scoped = (await sql`
    SELECT * FROM surface_buildings
    WHERE player_id = ${playerId} AND system_id = ${systemId} AND planet_id = ${planetId}
    ORDER BY built_at ASC
  `) as SurfaceBuildingRow[];
  if (scoped.length > 0) return scoped;
  return (await sql`
    SELECT * FROM surface_buildings
    WHERE player_id = ${playerId} AND planet_id = ${planetId} AND system_id IS NULL
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

export async function claimPremiumDailyQuarks(
  playerId: string,
  amount: number,
): Promise<PlayerRow | null> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE players
    SET quarks = quarks + ${amount},
        premium_daily_quarks_claimed_on = CURRENT_DATE
    WHERE id = ${playerId}
      AND premium_active = TRUE
      AND (premium_expires_at IS NULL OR premium_expires_at > NOW())
      AND (premium_daily_quarks_claimed_on IS NULL OR premium_daily_quarks_claimed_on < CURRENT_DATE)
    RETURNING *
  `;
  return (rows[0] as PlayerRow) ?? null;
}

export async function countMessagesSince(
  channel: string,
  since: string,
  senderId?: string,
): Promise<number> {
  const sql = getSQL();
  const rows = senderId
    ? await sql`
        SELECT COUNT(*)::int AS count
        FROM messages
        WHERE channel = ${channel}
          AND sender_id = ${senderId}
          AND created_at >= ${since}
      `
    : await sql`
        SELECT COUNT(*)::int AS count
        FROM messages
        WHERE channel = ${channel}
          AND created_at >= ${since}
      `;
  return Number((rows[0] as { count?: number | string } | undefined)?.count ?? 0);
}

/** Atomic increment of game_state.researchData (stored inside the JSONB blob).
 *  Used by ad rewards that grant research data so the value persists even if
 *  the client crashes between reward grant and the next state sync. */
export async function creditResearchData(
  playerId: string,
  amount: number,
): Promise<void> {
  const sql = getSQL();
  // Field is `research_data` (snake_case) in the JSONB payload — matches the
  // key used by the client in App.tsx (state load/save + updatePlayer body).
  await sql`
    UPDATE players
    SET game_state = jsonb_set(
      game_state,
      '{research_data}',
      to_jsonb(COALESCE((game_state->>'research_data')::float, 0) + ${amount})
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

/** Mark a player as active without changing gameplay state. */
export async function touchPlayerPresence(playerId: string): Promise<PlayerRow | null> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE players
    SET last_login = NOW(),
        last_seen_at = NOW()
    WHERE id = ${playerId}
    RETURNING *
  `;
  if (rows[0]) {
    try { await recordPlayerActivityHour(playerId); } catch { /* non-critical analytics */ }
  }
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

/**
 * A "fresh" player row carries no real progress yet — still in onboarding,
 * level <= 1, onboarding not completed. Used so guest recovery only OVERRIDES a
 * brand-new empty account (the churned-into row) and never a session the player
 * has already invested in.
 */
function isFreshPlayerRow(row: PlayerRow): boolean {
  const gs = (row.game_state ?? {}) as Record<string, unknown>;
  const onboardingDone = gs.onboarding_done === true;
  const level = row.player_level ?? Number(gs.level ?? 0) ?? 0;
  return !onboardingDone && row.game_phase === 'onboarding' && level <= 1;
}

/**
 * Find a guest's ORPHANED progress row by a recovery key, after their Firebase
 * anonymous UID changed (lost WebView session on an app update).
 *
 * Keys, in priority: FCM token (the only key already collected on pre-device_id
 * builds → rescues already-affected players) and device_id (forward-looking).
 * Both survive in-place updates while the Firebase UID may not.
 *
 * SAFETY:
 *  - ONLY anonymous (unlinked) rows — never Google/Apple/email, so a shared
 *    device can't hijack a real account.
 *  - ONLY rows with REAL progress (not fresh) — we never resurrect empty stubs.
 *  - Excludes the caller's current UID.
 *  - Returns the most-progressed match; caller decides whether to re-link.
 */
export async function findRecoverableGuest(opts: {
  fcmToken?: string | null;
  deviceId?: string | null;
  excludeUid: string;
}): Promise<PlayerRow | null> {
  const fcmToken = opts.fcmToken ?? null;
  const deviceId = opts.deviceId ?? null;
  if (!fcmToken && !deviceId) return null;
  const sql = getSQL();
  const rows = await sql`
    SELECT * FROM players
    WHERE auth_provider = 'anonymous'
      AND firebase_uid IS DISTINCT FROM ${opts.excludeUid}
      AND (
        (${fcmToken}::text IS NOT NULL AND fcm_token = ${fcmToken})
        OR (${deviceId}::text IS NOT NULL AND device_id = ${deviceId})
      )
      -- real progress only (mirror of isFreshPlayerRow)
      AND NOT (
        game_phase = 'onboarding'
        AND COALESCE(player_level, (game_state->>'level')::int, 0) <= 1
        AND COALESCE((game_state->>'onboarding_done')::boolean, false) = false
      )
    ORDER BY
      COALESCE(player_level, (game_state->>'level')::int, 0) DESC,
      COALESCE(player_xp, (game_state->>'xp')::int, 0) DESC,
      last_login DESC NULLS LAST
    LIMIT 1
  `;
  return (rows[0] as PlayerRow) ?? null;
}

/**
 * Find the strongest linked account seen on this device/recovery key. This is
 * only a login hint: callers must NOT authenticate as that row without the
 * linked provider token. It prevents native guest auto-login from showing an old
 * low-XP anonymous row when the same phone already has a higher Google/Apple
 * account.
 */
export async function findRecoverableLinkedAccountHint(opts: {
  fcmToken?: string | null;
  deviceId?: string | null;
  excludeUid: string;
}): Promise<PlayerRow | null> {
  const fcmToken = opts.fcmToken ?? null;
  const deviceId = opts.deviceId ?? null;
  if (!fcmToken && !deviceId) return null;
  const sql = getSQL();
  const rows = await sql`
    SELECT * FROM players
    WHERE auth_provider <> 'anonymous'
      AND firebase_uid IS DISTINCT FROM ${opts.excludeUid}
      AND (
        (${fcmToken}::text IS NOT NULL AND fcm_token = ${fcmToken})
        OR (${deviceId}::text IS NOT NULL AND device_id = ${deviceId})
      )
      AND NOT (
        game_phase = 'onboarding'
        AND COALESCE(player_level, (game_state->>'level')::int, 0) <= 1
        AND COALESCE((game_state->>'onboarding_done')::boolean, false) = false
      )
    ORDER BY
      COALESCE(player_xp, (game_state->>'xp')::int, 0) DESC,
      COALESCE(player_level, (game_state->>'level')::int, 0) DESC,
      last_login DESC NULLS LAST
    LIMIT 1
  `;
  return (rows[0] as PlayerRow) ?? null;
}

export { isFreshPlayerRow };

/**
 * Re-point a recovered guest row to the player's current Firebase UID. The
 * primary key (old UID) is preserved; only firebase_uid moves, so subsequent
 * token auth resolves to this row. Caller must first free the new UID (see
 * detachFirebaseUid) when an empty stub already holds it.
 */
export async function relinkGuestToUid(
  playerId: string,
  newFirebaseUid: string,
  deviceId?: string | null,
): Promise<PlayerRow | null> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE players
    SET firebase_uid = ${newFirebaseUid},
        device_id = COALESCE(${deviceId ?? null}, device_id),
        last_login = NOW()
    WHERE id = ${playerId}
    RETURNING *
  `;
  return (rows[0] as PlayerRow) ?? null;
}

/** Free a UID from an empty stub row so a recovered row can take it (unique idx). */
export async function detachFirebaseUid(playerId: string): Promise<void> {
  const sql = getSQL();
  await sql`UPDATE players SET firebase_uid = NULL WHERE id = ${playerId}`;
}

/** Stamp/refresh a player's device_id (recovery key) on register. Best-effort. */
export async function setPlayerDeviceId(playerId: string, deviceId: string): Promise<void> {
  const sql = getSQL();
  await sql`UPDATE players SET device_id = ${deviceId} WHERE id = ${playerId}`;
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
  deviceId?: string | null;
}): Promise<PlayerRow> {
  const sql = getSQL();
  console.log(`[db] createPlayerWithAuth: id=${player.id}, provider=${player.authProvider}`);
  try {
    const rows = await sql`
      INSERT INTO players (id, firebase_uid, auth_provider, email, name, home_system_id, home_planet_id, game_phase, last_login, quarks, device_id)
      VALUES (${player.id}, ${player.firebaseUid}, ${player.authProvider}, ${player.email ?? null},
              ${player.name}, ${player.homeSystemId}, ${player.homePlanetId}, 'onboarding', NOW(), ${STARTER_QUARKS},
              ${player.deviceId ?? null})
      ON CONFLICT (id) DO UPDATE SET
        last_login = NOW(),
        firebase_uid = COALESCE(players.firebase_uid, EXCLUDED.firebase_uid),
        auth_provider = EXCLUDED.auth_provider,
        device_id = COALESCE(EXCLUDED.device_id, players.device_id)
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
  /**
   * Legacy Kling task id. Omitted for the current Gemini pipeline, which
   * generates the photo synchronously and calls updateSurfaceMap() with the
   * final status right after — no async task to track.
   */
  klingTaskId?: string | null;
}): Promise<SurfaceMapRow> {
  const sql = getSQL();
  const klingTaskId = data.klingTaskId ?? null;
  const rows = await sql`
    INSERT INTO surface_maps (id, player_id, planet_id, system_id, kling_task_id, status)
    VALUES (${data.id}, ${data.playerId}, ${data.planetId}, ${data.systemId}, ${klingTaskId}, 'generating')
    ON CONFLICT (system_id, planet_id) DO UPDATE SET
      kling_task_id = EXCLUDED.kling_task_id,
      status = 'generating',
      photo_url = NULL
    RETURNING *
  `;
  return rows[0] as SurfaceMapRow;
}

export async function getSurfaceMap(
  systemId: string,
  planetId: string,
): Promise<SurfaceMapRow | null> {
  const sql = getSQL();
  const scoped = await sql`
    SELECT * FROM surface_maps
    WHERE system_id = ${systemId} AND planet_id = ${planetId}
    LIMIT 1
  `;
  if (scoped[0]) return scoped[0] as SurfaceMapRow;
  const legacy = await sql`
    SELECT * FROM surface_maps
    WHERE planet_id = ${planetId} AND system_id IS NULL
    LIMIT 1
  `;
  return (legacy[0] as SurfaceMapRow) ?? null;
}

export async function getSurfaceMapById(id: string): Promise<SurfaceMapRow | null> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM surface_maps WHERE id = ${id}`;
  return (rows[0] as SurfaceMapRow) ?? null;
}

/**
 * True once the player has at least one generated surface photo on ANY planet.
 * Used by /api/surface/generate for the "first surface photo is free" rule
 * (per player, not per planet).
 */
export async function playerHasSurfacePhoto(playerId: string): Promise<boolean> {
  const sql = getSQL();
  const rows = await sql`
    SELECT 1 FROM surface_maps
    WHERE player_id = ${playerId} AND photo_url IS NOT NULL
    LIMIT 1
  `;
  return rows.length > 0;
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

export async function getSystemPhotoBySystemId(systemId: string): Promise<SystemPhotoRow | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT * FROM system_photos
    WHERE system_id = ${systemId} AND status = 'succeed' AND photo_url IS NOT NULL
    ORDER BY completed_at DESC NULLS LAST, created_at DESC
    LIMIT 1
  `;
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
// Lifeforms (Genesis module — found/created alien lifeforms)
// ---------------------------------------------------------------------------

export interface LifeformRow {
  id: string;
  player_id: string;
  system_id: string | null;
  planet_id: string | null;
  source: string;          // 'found' | 'created'
  rarity: string;          // common | uncommon | rare | epic | legendary
  species_name: string | null;
  is_bundle: boolean;
  photo_url: string | null;
  photo_status: string | null;
  photo_task_id: string | null;
  video_url: string | null;
  video_status: string | null;
  video_task_id: string | null;
  prompt_used: string | null;
  quarks_paid: number;
  created_at: string;
  completed_at: string | null;
}

export async function saveLifeform(data: {
  id: string;
  playerId: string;
  systemId?: string | null;
  planetId?: string | null;
  source?: 'found' | 'created';
  rarity: string;
  speciesName?: string | null;
  promptUsed?: string | null;
  isBundle?: boolean;
  /** Bundled asset URL for common lifeforms (per-species photo). */
  photoUrl?: string | null;
  /** Bundled asset URL for common lifeforms (per-species video). */
  videoUrl?: string | null;
}): Promise<LifeformRow> {
  const sql = getSQL();
  // Dedup bundled species: a player must never hold two of the same simple
  // lifeform. The bundled photo_url uniquely identifies the species, so if a
  // row already exists for this player+photo we return it instead of inserting
  // a duplicate (authoritative guard against any client double-fire / replay).
  if (data.isBundle && data.photoUrl) {
    const existing = await sql`
      SELECT * FROM lifeforms
      WHERE player_id = ${data.playerId} AND photo_url = ${data.photoUrl}
      ORDER BY created_at ASC
      LIMIT 1
    `;
    if (existing[0]) return existing[0] as LifeformRow;
  }
  // Bundled common media is ready immediately, so mark status 'succeed'.
  const photoStatus = data.photoUrl ? 'succeed' : null;
  const videoStatus = data.videoUrl ? 'succeed' : null;
  const rows = await sql`
    INSERT INTO lifeforms (
      id, player_id, system_id, planet_id, source, rarity, species_name, is_bundle,
      photo_url, photo_status, video_url, video_status, prompt_used
    ) VALUES (
      ${data.id}, ${data.playerId}, ${data.systemId ?? null}, ${data.planetId ?? null},
      ${data.source ?? 'found'}, ${data.rarity}, ${data.speciesName ?? null}, ${data.isBundle ?? false},
      ${data.photoUrl ?? null}, ${photoStatus}, ${data.videoUrl ?? null}, ${videoStatus}, ${data.promptUsed ?? null}
    )
    RETURNING *
  `;
  return rows[0] as LifeformRow;
}

export async function getLifeformById(id: string): Promise<LifeformRow | null> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM lifeforms WHERE id = ${id}`;
  return (rows[0] as LifeformRow) ?? null;
}

export async function getPlayerLifeforms(playerId: string): Promise<LifeformRow[]> {
  const sql = getSQL();
  return (await sql`
    SELECT * FROM lifeforms
    WHERE player_id = ${playerId}
    ORDER BY created_at DESC
  `) as LifeformRow[];
}

/** Rename a lifeform species (player-chosen name). */
export async function updateLifeformName(
  id: string,
  speciesName: string,
): Promise<LifeformRow | null> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE lifeforms SET species_name = ${speciesName} WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as LifeformRow) ?? null;
}

/** Update Alpha-photo generation state (task start / completion). */
export async function updateLifeformPhoto(
  id: string,
  updates: Partial<{
    photo_status: string;
    photo_url: string;
    photo_task_id: string;
    prompt_used: string;
    quarks_paid: number;
  }>,
): Promise<LifeformRow | null> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE lifeforms
    SET photo_status   = COALESCE(${updates.photo_status ?? null}, photo_status),
        photo_url      = COALESCE(${updates.photo_url ?? null}, photo_url),
        photo_task_id  = COALESCE(${updates.photo_task_id ?? null}, photo_task_id),
        prompt_used    = COALESCE(${updates.prompt_used ?? null}, prompt_used),
        quarks_paid    = quarks_paid + COALESCE(${updates.quarks_paid ?? null}, 0),
        completed_at   = CASE WHEN ${updates.photo_status ?? null} = 'succeed' THEN NOW() ELSE completed_at END
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as LifeformRow) ?? null;
}

/** Update Alpha-video generation state (task start / completion). */
export async function updateLifeformVideo(
  id: string,
  updates: Partial<{
    video_status: string;
    video_url: string;
    video_task_id: string;
    quarks_paid: number;
  }>,
): Promise<LifeformRow | null> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE lifeforms
    SET video_status   = COALESCE(${updates.video_status ?? null}, video_status),
        video_url      = COALESCE(${updates.video_url ?? null}, video_url),
        video_task_id  = COALESCE(${updates.video_task_id ?? null}, video_task_id),
        quarks_paid    = quarks_paid + COALESCE(${updates.quarks_paid ?? null}, 0)
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as LifeformRow) ?? null;
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

export interface MessageReadRow {
  player_id: string;
  channel: string;
  last_read_at: string;
  updated_at: string;
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

/** Resolve a player id by exact callsign (case-insensitive). Used by the
 *  admin "voice of the universe" broadcaster to target a single player. */
export async function getPlayerIdByCallsign(
  callsign: string,
): Promise<{ id: string; callsign: string | null } | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT id, callsign FROM players
    WHERE LOWER(callsign) = LOWER(${callsign})
    LIMIT 1
  `;
  return rows.length ? (rows[0] as { id: string; callsign: string | null }) : null;
}

/** Fan-out a single message into every player's per-player channel
 *  (system:{id} or astra:{id}). Returns the number of rows inserted.
 *  One bulk INSERT … SELECT keeps it to a single round-trip. */
export async function broadcastPerPlayerMessage(
  senderId: string,
  senderName: string,
  channelPrefix: 'system' | 'astra',
  content: string,
): Promise<number> {
  const sql = getSQL();
  const prefix = `${channelPrefix}:`;
  const rows = await sql`
    INSERT INTO messages (sender_id, sender_name, channel, content)
    SELECT ${senderId}, ${senderName}, ${prefix} || id, ${content}
    FROM players
    RETURNING id
  `;
  return rows.length;
}

/** Get messages for a channel, optionally after a timestamp. Newest last. */
export async function getMessages(
  channel: string,
  limit: number = 50,
  after?: string,
  notBefore?: string,
): Promise<MessageRow[]> {
  const sql = getSQL();
  const lowerBound = after && notBefore
    ? (after > notBefore ? after : notBefore)
    : after ?? notBefore;
  if (after) {
    return (await sql`
      SELECT * FROM messages
      WHERE channel = ${channel} AND created_at > ${lowerBound}
      ORDER BY created_at ASC
      LIMIT ${limit}
    `) as MessageRow[];
  }
  if (notBefore) {
    return (await sql`
      SELECT * FROM (
        SELECT * FROM messages
        WHERE channel = ${channel} AND created_at >= ${notBefore}
        ORDER BY created_at DESC
        LIMIT ${limit}
      ) sub ORDER BY created_at ASC
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
  const mapped = (rows as Array<Record<string, string>>).map((row) => {
    const parts = row.channel.split(':');
    const peerId = parts[1] === playerId ? parts[2] : parts[1];
    return { row, peerId };
  });

  // Resolve peer display names from the players table. Relying on the last
  // message's sender_name breaks right after YOU message someone: the last
  // sender is you, so peer_name came back empty and the client fell back to
  // a truncated player id ("набір символів").
  const peerIds = [...new Set(mapped.map((m) => m.peerId).filter(Boolean))];
  const nameById = new Map<string, string>();
  if (peerIds.length > 0) {
    const players = await sql`
      SELECT id, callsign, name FROM players WHERE id = ANY(${peerIds})
    `;
    for (const p of players as Array<{ id: string; callsign: string | null; name: string | null }>) {
      nameById.set(p.id, p.callsign || p.name || '');
    }
  }

  return mapped.map(({ row, peerId }) => {
    const fallback = row.sender_id === playerId ? '' : row.sender_name;
    return {
      channel: row.channel,
      peer_id: peerId,
      peer_name: nameById.get(peerId) || fallback || '',
      last_message: row.last_message,
      last_at: row.last_at,
    } as DMChannelInfo;
  });
}

/** Get per-channel read timestamps for a player. */
export async function getMessageReadStates(
  playerId: string,
  channels?: string[],
): Promise<MessageReadRow[]> {
  const sql = getSQL();
  if (channels && channels.length > 0) {
    return (await sql`
      SELECT * FROM message_reads
      WHERE player_id = ${playerId}
        AND channel = ANY(${channels})
    `) as MessageReadRow[];
  }
  return (await sql`
    SELECT * FROM message_reads
    WHERE player_id = ${playerId}
  `) as MessageReadRow[];
}

/**
 * Aggregate unread message counts for every channel the player participates in,
 * in a SINGLE query. Replaces the per-channel polling the client used to do
 * (read-state + list ×N + channels), collapsing ~6+ HTTP round-trips into one.
 *
 * Semantics (mirrors the old ChatWidget client logic):
 *   - global / system / astra: counted only AFTER a read state exists for the
 *     channel (a brand-new device shows 0 until it opens chat once). global is
 *     additionally floored at the player's join date.
 *   - dm: counted even with no read state, so a fresh incoming DM thread still
 *     surfaces as unread.
 *   - Own messages never count.
 */
export interface UnreadSummary {
  global: number;
  system: number;
  astra: number;
  dm: number;
}

export async function getUnreadSummary(playerId: string): Promise<UnreadSummary> {
  const sql = getSQL();
  const systemCh = `system:${playerId}`;
  const astraCh = `astra:${playerId}`;
  const dmStart = `dm:${playerId}:%`;
  const dmEnd = `%:${playerId}`;

  const rows = (await sql`
    WITH reads AS (
      SELECT channel, last_read_at
      FROM message_reads
      WHERE player_id = ${playerId}
    ),
    player AS (
      SELECT created_at FROM players WHERE id = ${playerId}
    ),
    classified AS (
      SELECT
        m.channel,
        m.created_at,
        CASE
          WHEN m.channel = 'global'      THEN 'global'
          WHEN m.channel = ${systemCh}   THEN 'system'
          WHEN m.channel = ${astraCh}    THEN 'astra'
          WHEN m.channel LIKE ${dmStart} OR m.channel LIKE ${dmEnd} THEN 'dm'
          ELSE 'other'
        END AS grp
      FROM messages m
      WHERE m.sender_id <> ${playerId}
        AND (
          m.channel = 'global'
          OR m.channel = ${systemCh}
          OR m.channel = ${astraCh}
          OR m.channel LIKE ${dmStart}
          OR m.channel LIKE ${dmEnd}
        )
    )
    SELECT c.grp, COUNT(*)::int AS cnt
    FROM classified c
    LEFT JOIN reads rd ON rd.channel = c.channel
    LEFT JOIN player p ON TRUE
    WHERE c.grp <> 'other'
      AND (
        (
          c.grp IN ('global', 'system', 'astra')
          AND rd.last_read_at IS NOT NULL
          AND c.created_at > rd.last_read_at
          AND (c.grp <> 'global' OR p.created_at IS NULL OR c.created_at >= p.created_at)
        )
        OR (
          c.grp = 'dm'
          AND (rd.last_read_at IS NULL OR c.created_at > rd.last_read_at)
        )
      )
    GROUP BY c.grp
  `) as Array<{ grp: string; cnt: number }>;

  const summary: UnreadSummary = { global: 0, system: 0, astra: 0, dm: 0 };
  for (const row of rows) {
    const n = typeof row.cnt === 'number' ? row.cnt : parseInt(String(row.cnt), 10);
    if (row.grp === 'global') summary.global = n;
    else if (row.grp === 'system') summary.system = n;
    else if (row.grp === 'astra') summary.astra = n;
    else if (row.grp === 'dm') summary.dm += n;
  }
  return summary;
}

/** Persist a channel read timestamp, never moving it backwards. */
export async function markMessageChannelRead(
  playerId: string,
  channel: string,
  lastReadAt: string,
): Promise<MessageReadRow> {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO message_reads (player_id, channel, last_read_at)
    VALUES (${playerId}, ${channel}, ${lastReadAt})
    ON CONFLICT (player_id, channel) DO UPDATE
      SET last_read_at = GREATEST(message_reads.last_read_at, EXCLUDED.last_read_at),
          updated_at = NOW()
    RETURNING *
  `;
  return rows[0] as MessageReadRow;
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
  status: string; // pending|pending_admin|warned|blocked|severe|dismissed
  gemini_verdict: string | null;
  retry_count: number;
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

/** Atomically increment retry_count and return the new value. Used by cron
 *  when a Gemini moderation call fails so we can escalate after N attempts
 *  instead of dismissing silently. */
export async function incrementReportRetry(id: number): Promise<number> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE reports
    SET retry_count = retry_count + 1
    WHERE id = ${id}
    RETURNING retry_count
  `;
  return (rows[0]?.retry_count as number | undefined) ?? 0;
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
// Player Feedback (open "what do you like / dislike" prompt, level 12+)
// ---------------------------------------------------------------------------

export interface PlayerFeedbackRow {
  id: number;
  player_id: string;
  callsign: string | null;
  level: number;
  likes_text: string | null;
  dislikes_text: string | null;
  language: string;
  created_at: string;
}

export async function savePlayerFeedback(input: {
  playerId: string;
  callsign: string | null;
  level: number;
  likesText: string | null;
  dislikesText: string | null;
  language: string;
}): Promise<PlayerFeedbackRow> {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO player_feedback (player_id, callsign, level, likes_text, dislikes_text, language)
    VALUES (${input.playerId}, ${input.callsign}, ${input.level}, ${input.likesText}, ${input.dislikesText}, ${input.language})
    RETURNING *
  `;
  return rows[0] as PlayerFeedbackRow;
}

/** Newest-first page of feedback rows for the admin console, plus total count for pagination. */
export async function listPlayerFeedback(
  limit: number = 50,
  offset: number = 0,
): Promise<{ rows: PlayerFeedbackRow[]; total: number }> {
  const sql = getSQL();
  const [rows, countRows] = await Promise.all([
    sql`
      SELECT * FROM player_feedback
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    sql`SELECT COUNT(*)::int AS count FROM player_feedback`,
  ]);
  return { rows: rows as PlayerFeedbackRow[], total: (countRows[0] as { count: number }).count };
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

export async function getRecentDailyContent(
  contentType: string,
  limit: number = 14,
): Promise<Array<{ content_date: string; content_json: string }>> {
  const sql = getSQL();
  return (await sql`
    SELECT content_date::text, content_json
    FROM daily_content
    WHERE content_type = ${contentType}
    ORDER BY content_date DESC
    LIMIT ${Math.max(1, Math.min(60, Math.floor(limit)))}
  `) as Array<{ content_date: string; content_json: string }>;
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

export interface CosmicEventRow {
  id: number | string;
  title_uk: string;
  title_en: string;
  description_uk: string | null;
  description_en: string | null;
  event_time: string;
  photo_url: string | null;
  video_url: string | null;
}

/**
 * Upcoming cosmic events (event_time in the future), soonest first.
 * Read-only; events are authored directly in the `cosmic_events` table.
 * Returns [] gracefully if the table does not exist yet (pre-migration).
 */
export async function getUpcomingCosmicEvents(limit = 10): Promise<CosmicEventRow[]> {
  const sql = getSQL();
  try {
    const rows = await sql`
      SELECT id, title_uk, title_en, description_uk, description_en,
             event_time, photo_url, video_url
      FROM cosmic_events
      WHERE event_time > NOW()
      ORDER BY event_time ASC
      LIMIT ${limit}
    `;
    return rows as CosmicEventRow[];
  } catch (err) {
    console.error('getUpcomingCosmicEvents error (table missing?):', err);
    return [];
  }
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
export type DigestPushRecipient = PlayerRow & { favorite_hour_utc: number | null };

export async function getDigestPushRecipients(lang: string): Promise<DigestPushRecipient[]> {
  const sql = getSQL();
  // Join each player's most-active UTC hour (proxy for their timezone, derived
  // from the last 30 days of activity). Used to schedule the digest push at a
  // sensible local time instead of blasting everyone at the same UTC instant.
  const rows = await sql`
    WITH hour_preference AS (
      SELECT player_id, hour_utc
      FROM (
        SELECT
          player_id,
          hour_utc,
          ROW_NUMBER() OVER (
            PARTITION BY player_id
            ORDER BY SUM(hits) DESC, MAX(last_seen) DESC
          ) AS rank
        FROM player_activity_hours
        WHERE activity_date >= (CURRENT_DATE - INTERVAL '30 days')
        GROUP BY player_id, hour_utc
      ) ranked
      WHERE rank = 1
    )
    SELECT p.*, hp.hour_utc AS favorite_hour_utc
    FROM players p
    LEFT JOIN hour_preference hp ON hp.player_id = p.id
    WHERE p.preferred_language = ${lang}
      AND p.fcm_token IS NOT NULL
      AND p.push_notifications = TRUE
  `;
  return rows as DigestPushRecipient[];
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

export async function updatePlayerAvatar(playerId: string, avatarUrl: string | null): Promise<PlayerRow | null> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE players
    SET avatar_url = ${avatarUrl}
    WHERE id = ${playerId}
    RETURNING *
  `;
  return (rows[0] as PlayerRow) ?? null;
}

// ---------------------------------------------------------------------------
// Push Queue
// ---------------------------------------------------------------------------

export type PushQueueStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled';

export interface PushQueueRow {
  id: string;
  player_id: string;
  type: string;
  title_uk: string;
  body_uk: string;
  title_en: string;
  body_en: string;
  data_json: Record<string, unknown>;
  status: PushQueueStatus;
  priority: number;
  scheduled_at: string;
  attempts: number;
  max_attempts: number;
  dedupe_key: string | null;
  last_error: string | null;
  locked_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClaimedPushNotification extends PushQueueRow {
  player_name: string;
  preferred_language: string;
  push_notifications: boolean;
  fcm_token: string | null;
}

export interface EnqueuePushInput {
  playerId: string;
  type: string;
  titleUk: string;
  bodyUk: string;
  titleEn: string;
  bodyEn: string;
  data?: Record<string, unknown>;
  priority?: number;
  scheduledAt?: string;
  maxAttempts?: number;
  dedupeKey?: string;
}

export interface DailyReminderCandidate {
  player_id: string;
  reminder_day: number;
  message_index: number;
  scheduled_at: string;
}

export async function enqueuePushNotification(input: EnqueuePushInput): Promise<PushQueueRow> {
  const sql = getSQL();
  const id = `push_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const dataJson = JSON.stringify(input.data ?? {});
  const scheduledAt = input.scheduledAt ?? new Date().toISOString();

  if (input.dedupeKey) {
    const rows = await sql`
      INSERT INTO push_queue (
        id, player_id, type, title_uk, body_uk, title_en, body_en,
        data_json, priority, scheduled_at, max_attempts, dedupe_key
      )
      VALUES (
        ${id}, ${input.playerId}, ${input.type}, ${input.titleUk}, ${input.bodyUk},
        ${input.titleEn}, ${input.bodyEn}, ${dataJson}::jsonb,
        ${input.priority ?? 0}, ${scheduledAt}, ${input.maxAttempts ?? 3}, ${input.dedupeKey}
      )
      ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL
      DO UPDATE SET updated_at = push_queue.updated_at
      RETURNING *
    `;
    return rows[0] as PushQueueRow;
  }

  const rows = await sql`
    INSERT INTO push_queue (
      id, player_id, type, title_uk, body_uk, title_en, body_en,
      data_json, priority, scheduled_at, max_attempts
    )
    VALUES (
      ${id}, ${input.playerId}, ${input.type}, ${input.titleUk}, ${input.bodyUk},
      ${input.titleEn}, ${input.bodyEn}, ${dataJson}::jsonb,
      ${input.priority ?? 0}, ${scheduledAt}, ${input.maxAttempts ?? 3}
    )
    RETURNING *
  `;
  return rows[0] as PushQueueRow;
}

// ---------------------------------------------------------------------------
// Admin broadcast (custom push campaigns)
// ---------------------------------------------------------------------------

export interface BroadcastPushInput {
  /** Stable campaign id — used in dedupe_key so a re-run can't double-send. */
  campaignId: string;
  titleUk: string;
  bodyUk: string;
  titleEn: string;
  bodyEn: string;
  /** Deep-link action (e.g. 'open-game', 'open-digest'). */
  action: string;
  /** Full link opened on tap (e.g. '/?action=open-game'). */
  link: string;
  /** 'all' = each player gets their own language copy; else only that language. */
  language: 'all' | 'uk' | 'en';
  /** 'all' | 'active' (seen within idleDays) | 'inactive' (idle ≥ idleDays). */
  audience: 'all' | 'active' | 'inactive';
  idleDays: number;
  /** Deliver at each player's most-active UTC hour instead of immediately. */
  scheduleAtFavoriteHour: boolean;
  /** When set, only this player receives the push (preview / smoke test). */
  testPlayerId: string | null;
  priority?: number;
}

/**
 * Count how many push-enabled players match the broadcast filters, without
 * enqueuing anything. Powers the "preview audience" button in the admin page.
 */
export async function countBroadcastAudience(input: BroadcastPushInput): Promise<number> {
  const sql = getSQL();
  const rows = await sql`
    SELECT COUNT(*)::int AS n
    FROM players p
    WHERE p.fcm_token IS NOT NULL
      AND p.push_notifications = TRUE
      AND (${input.language} = 'all' OR p.preferred_language = ${input.language})
      AND (
        ${input.audience} = 'all'
        OR (${input.audience} = 'inactive' AND p.last_seen_at IS NOT NULL
            AND p.last_seen_at <  NOW() - (${input.idleDays} * INTERVAL '1 day'))
        OR (${input.audience} = 'active'   AND p.last_seen_at IS NOT NULL
            AND p.last_seen_at >= NOW() - (${input.idleDays} * INTERVAL '1 day'))
      )
      AND (${input.testPlayerId}::text IS NULL OR p.id = ${input.testPlayerId})
  `;
  return (rows[0] as { n: number }).n;
}

/**
 * Enqueue one push_queue row per matching player. Delivery (batching, retries,
 * dead-token cleanup, per-player language) is handled by /api/cron/push-queue,
 * exactly like every other notification type. Returns the number of rows
 * actually inserted (ON CONFLICT DO NOTHING skips re-runs of the same campaign).
 */
export async function enqueueBroadcastPush(input: BroadcastPushInput): Promise<number> {
  const sql = getSQL();
  const rows = await sql`
    WITH hour_preference AS (
      SELECT player_id, hour_utc
      FROM (
        SELECT
          player_id,
          hour_utc,
          ROW_NUMBER() OVER (
            PARTITION BY player_id
            ORDER BY SUM(hits) DESC, MAX(last_seen) DESC
          ) AS rank
        FROM player_activity_hours
        WHERE activity_date >= (CURRENT_DATE - INTERVAL '30 days')
        GROUP BY player_id, hour_utc
      ) ranked
      WHERE rank = 1
    ),
    targets AS (
      SELECT p.id AS player_id, hp.hour_utc
      FROM players p
      LEFT JOIN hour_preference hp ON hp.player_id = p.id
      WHERE p.fcm_token IS NOT NULL
        AND p.push_notifications = TRUE
        AND (${input.language} = 'all' OR p.preferred_language = ${input.language})
        AND (
          ${input.audience} = 'all'
          OR (${input.audience} = 'inactive' AND p.last_seen_at IS NOT NULL
              AND p.last_seen_at <  NOW() - (${input.idleDays} * INTERVAL '1 day'))
          OR (${input.audience} = 'active'   AND p.last_seen_at IS NOT NULL
              AND p.last_seen_at >= NOW() - (${input.idleDays} * INTERVAL '1 day'))
        )
        AND (${input.testPlayerId}::text IS NULL OR p.id = ${input.testPlayerId})
    )
    INSERT INTO push_queue (
      id, player_id, type, title_uk, body_uk, title_en, body_en,
      data_json, priority, scheduled_at, max_attempts, dedupe_key
    )
    SELECT
      'pushb_' || replace(gen_random_uuid()::text, '-', ''),
      t.player_id,
      'broadcast',
      ${input.titleUk}, ${input.bodyUk}, ${input.titleEn}, ${input.bodyEn},
      jsonb_build_object(
        'action', ${input.action}::text,
        'link', ${input.link}::text,
        'source', 'broadcast',
        'campaign', ${input.campaignId}::text
      ),
      ${input.priority ?? 8},
      CASE
        WHEN NOT ${input.scheduleAtFavoriteHour} OR t.hour_utc IS NULL THEN NOW()
        ELSE
          date_trunc('day', NOW()) + (t.hour_utc * INTERVAL '1 hour') + INTERVAL '10 minutes'
          + CASE
              WHEN date_trunc('day', NOW()) + (t.hour_utc * INTERVAL '1 hour') + INTERVAL '10 minutes' <= NOW()
              THEN INTERVAL '1 day' ELSE INTERVAL '0 day'
            END
      END,
      2,
      'broadcast:' || ${input.campaignId} || ':' || t.player_id
    FROM targets t
    ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
    RETURNING id
  `;
  return rows.length;
}

// ---------------------------------------------------------------------------
// Daily push pool (admin-editable texts for the daily auto-push rotation)
// ---------------------------------------------------------------------------

export interface DailyPushPoolItem {
  id: string;
  title_uk: string;
  body_uk: string;
  title_en: string;
  body_en: string;
  enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** All pool rows for the admin page (including disabled), ordered. */
export async function listDailyPushPool(): Promise<DailyPushPoolItem[]> {
  const sql = getSQL();
  const rows = await sql`
    SELECT * FROM daily_push_pool ORDER BY sort_order ASC, created_at ASC
  `;
  return rows as DailyPushPoolItem[];
}

/** Only enabled rows — the rotation the cron actually sends from. */
export async function getEnabledDailyPushPool(): Promise<DailyPushPoolItem[]> {
  const sql = getSQL();
  const rows = await sql`
    SELECT * FROM daily_push_pool WHERE enabled = TRUE ORDER BY sort_order ASC, created_at ASC
  `;
  return rows as DailyPushPoolItem[];
}

export async function saveDailyPushPoolItem(input: {
  id?: string | null;
  titleUk: string;
  bodyUk: string;
  titleEn: string;
  bodyEn: string;
  enabled: boolean;
  sortOrder: number;
}): Promise<DailyPushPoolItem> {
  const sql = getSQL();
  const id = input.id || `dp_${Date.now()}_${randomUUID().slice(0, 6)}`;
  const rows = await sql`
    INSERT INTO daily_push_pool (id, title_uk, body_uk, title_en, body_en, enabled, sort_order)
    VALUES (${id}, ${input.titleUk}, ${input.bodyUk}, ${input.titleEn}, ${input.bodyEn},
            ${input.enabled}, ${input.sortOrder})
    ON CONFLICT (id) DO UPDATE SET
      title_uk = EXCLUDED.title_uk,
      body_uk = EXCLUDED.body_uk,
      title_en = EXCLUDED.title_en,
      body_en = EXCLUDED.body_en,
      enabled = EXCLUDED.enabled,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW()
    RETURNING *
  `;
  return rows[0] as DailyPushPoolItem;
}

export async function deleteDailyPushPoolItem(id: string): Promise<boolean> {
  const sql = getSQL();
  const rows = await sql`DELETE FROM daily_push_pool WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

/** Aggregate delivery stats for the admin page. */
export async function getDailyPushStats(): Promise<{ sent24h: number; sent7d: number; queued: number }> {
  const sql = getSQL();
  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'sent' AND sent_at > NOW() - INTERVAL '24 hours')::int AS sent24h,
      COUNT(*) FILTER (WHERE status = 'sent' AND sent_at > NOW() - INTERVAL '7 days')::int  AS sent7d,
      COUNT(*) FILTER (WHERE status IN ('pending','sending'))::int                          AS queued
    FROM push_queue
    WHERE type = 'daily_space_reminder'
  `;
  const r = rows[0] as { sent24h: number; sent7d: number; queued: number };
  return { sent24h: r.sent24h, sent7d: r.sent7d, queued: r.queued };
}

/**
 * Players due a daily auto-push right now.
 *
 * Selection rules:
 *  - push-enabled with a valid FCM token;
 *  - NOT active today (no point nudging someone already playing);
 *  - active within the last `activeWindowDays` (long-idle players are handled
 *    by the escalating inactivity-pushes cron instead — no double pestering);
 *  - delivery time = player's most-active hour (fallback: signup hour) +10 min;
 *  - one per day per player (dedupe daily_space_reminder:<id>:<day>);
 *  - FREQUENCY CAP: if ANY other push (digest excluded) was sent to the player
 *    within the last 24 h — or is queued — the daily push is skipped.
 *
 * `reminder_day` = days since signup; the cron uses it as a stable rotation
 * index into the daily_push_pool list (index % pool size).
 */
export async function getDueDailyReminderCandidates(options: {
  lookbackMinutes?: number;
  limit?: number;
  activeWindowDays?: number;
} = {}): Promise<DailyReminderCandidate[]> {
  const sql = getSQL();
  const lookbackMinutes = options.lookbackMinutes ?? 30;
  const limit = options.limit ?? 100;
  const activeWindowDays = options.activeWindowDays ?? 14;

  const rows = await sql`
    WITH hour_preference AS (
      SELECT player_id, hour_utc
      FROM (
        SELECT
          player_id,
          hour_utc,
          ROW_NUMBER() OVER (
            PARTITION BY player_id
            ORDER BY SUM(hits) DESC, MAX(last_seen) DESC
          ) AS rank
        FROM player_activity_hours
        WHERE activity_date >= (CURRENT_DATE - INTERVAL '30 days')
        GROUP BY player_id, hour_utc
      ) ranked
      WHERE rank = 1
    ),
    due AS (
      SELECT
        p.id AS player_id,
        (CURRENT_DATE - p.created_at::date)::int AS reminder_day,
        GREATEST((CURRENT_DATE - p.created_at::date)::int - 1, 0) AS message_index,
        date_trunc('day', NOW())
          + (COALESCE(hp.hour_utc, EXTRACT(HOUR FROM p.created_at)::int) * INTERVAL '1 hour')
          + INTERVAL '10 minutes' AS scheduled_at
      FROM players p
      LEFT JOIN hour_preference hp ON hp.player_id = p.id
      WHERE p.fcm_token IS NOT NULL
        AND p.push_notifications = TRUE
        AND (CURRENT_DATE - p.created_at::date) >= 1
    )
    SELECT due.*
    FROM due
    JOIN players p ON p.id = due.player_id
    WHERE due.scheduled_at <= NOW()
      AND due.scheduled_at > NOW() - (${lookbackMinutes}::int * INTERVAL '1 minute')
      -- not active today
      AND COALESCE(p.last_seen_at, p.last_login, p.created_at) < date_trunc('day', NOW())
      -- active recently (long-idle handled by inactivity-pushes cron)
      AND COALESCE(p.last_seen_at, p.last_login, p.created_at) > NOW() - (${activeWindowDays}::int * INTERVAL '1 day')
      -- once per day
      AND NOT EXISTS (
        SELECT 1 FROM push_queue q
        WHERE q.dedupe_key = 'daily_space_reminder:' || due.player_id || ':' || due.reminder_day
      )
      -- 24h frequency cap: any other push (except digest) sent or queued recently
      AND NOT EXISTS (
        SELECT 1 FROM push_queue q2
        WHERE q2.player_id = due.player_id
          AND q2.type <> 'digest_ready'
          AND (
            (q2.status = 'sent' AND q2.sent_at > NOW() - INTERVAL '24 hours')
            OR (q2.status IN ('pending', 'sending') AND q2.created_at > NOW() - INTERVAL '24 hours')
          )
      )
    ORDER BY due.scheduled_at ASC
    LIMIT ${limit}
  `;
  return rows as DailyReminderCandidate[];
}

export interface InactiveReminderCandidate {
  player_id: string;
  threshold_days: number;
  /** YYYYMMDD of the player's last activity — identifies the idle "episode". */
  episode: string;
  favorite_hour_utc: number | null;
}

/**
 * Players who have gone idle for a re-engagement threshold (default 2/7/30
 * days) since their last activity, opted into push, and have a token. Picks
 * the LARGEST threshold each player currently exceeds and dedupes per
 * (player, threshold, idle-episode) so each new idle episode re-triggers and
 * a returning player resets the cycle. This is true inactivity detection based
 * on last_seen_at — distinct from the signup-day `daily-reminders` cron.
 */
export async function getInactiveReminderCandidates(options: {
  limit?: number;
} = {}): Promise<InactiveReminderCandidate[]> {
  const sql = getSQL();
  const limit = options.limit ?? 200;

  const rows = await sql`
    WITH hour_preference AS (
      SELECT player_id, hour_utc
      FROM (
        SELECT
          player_id,
          hour_utc,
          ROW_NUMBER() OVER (
            PARTITION BY player_id
            ORDER BY SUM(hits) DESC, MAX(last_seen) DESC
          ) AS rank
        FROM player_activity_hours
        WHERE activity_date >= (CURRENT_DATE - INTERVAL '30 days')
        GROUP BY player_id, hour_utc
      ) ranked
      WHERE rank = 1
    ),
    base AS (
      SELECT
        p.id AS player_id,
        COALESCE(p.last_seen_at, p.last_login, p.created_at) AS last_active,
        FLOOR(EXTRACT(EPOCH FROM (NOW() - COALESCE(p.last_seen_at, p.last_login, p.created_at))) / 86400)::int AS idle_days,
        hp.hour_utc AS favorite_hour_utc
      FROM players p
      LEFT JOIN hour_preference hp ON hp.player_id = p.id
      WHERE p.fcm_token IS NOT NULL
        AND p.push_notifications = TRUE
    ),
    chosen AS (
      SELECT
        player_id,
        last_active,
        favorite_hour_utc,
        CASE
          WHEN idle_days >= 30 THEN 30
          WHEN idle_days >= 7 THEN 7
          WHEN idle_days >= 2 THEN 2
          ELSE 0
        END AS threshold_days
      FROM base
    )
    SELECT
      player_id,
      threshold_days,
      to_char(last_active, 'YYYYMMDD') AS episode,
      favorite_hour_utc
    FROM chosen
    WHERE threshold_days > 0
      AND NOT EXISTS (
        SELECT 1 FROM push_queue q
        WHERE q.dedupe_key =
          'inactivity:' || player_id || ':' || threshold_days || ':' || to_char(last_active, 'YYYYMMDD')
      )
    ORDER BY threshold_days DESC
    LIMIT ${limit}
  `;
  return rows as InactiveReminderCandidate[];
}

async function recordPlayerActivityHour(playerId: string): Promise<void> {
  const sql = getSQL();
  await sql`
    INSERT INTO player_activity_hours (
      player_id, activity_date, hour_utc, hits, first_seen, last_seen
    )
    VALUES (
      ${playerId},
      DATE(NOW() AT TIME ZONE 'UTC'),
      EXTRACT(HOUR FROM NOW() AT TIME ZONE 'UTC')::int,
      1,
      NOW(),
      NOW()
    )
    ON CONFLICT (player_id, activity_date, hour_utc) DO UPDATE
      SET hits = player_activity_hours.hits + 1,
          last_seen = NOW()
  `;
}

export async function claimPendingPushNotifications(limit = 50): Promise<ClaimedPushNotification[]> {
  const sql = getSQL();
  const rows = await sql`
    WITH picked AS (
      SELECT id
      FROM push_queue
      WHERE status = 'pending'
        AND scheduled_at <= NOW()
        AND attempts < max_attempts
      ORDER BY priority DESC, scheduled_at ASC, created_at ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    ),
    updated AS (
      UPDATE push_queue q
      SET status = 'sending',
          attempts = q.attempts + 1,
          locked_at = NOW(),
          updated_at = NOW()
      FROM picked
      WHERE q.id = picked.id
      RETURNING q.*
    )
    SELECT updated.*,
           players.name AS player_name,
           players.preferred_language,
           players.push_notifications,
           players.fcm_token
    FROM updated
    JOIN players ON players.id = updated.player_id
  `;
  return rows as ClaimedPushNotification[];
}

export async function markPushNotificationSent(id: string): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE push_queue
    SET status = 'sent',
        sent_at = NOW(),
        locked_at = NULL,
        last_error = NULL,
        updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function markPushNotificationFailed(id: string, error: string, retryAt?: string): Promise<void> {
  const sql = getSQL();
  const retryTime = retryAt ?? new Date(Date.now() + 5 * 60 * 1000).toISOString();
  await sql`
    UPDATE push_queue
    SET status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'pending' END,
        scheduled_at = CASE WHEN attempts >= max_attempts THEN scheduled_at ELSE ${retryTime} END,
        locked_at = NULL,
        last_error = ${error.slice(0, 1000)},
        updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function markPushNotificationCancelled(id: string, reason: string): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE push_queue
    SET status = 'cancelled',
        locked_at = NULL,
        last_error = ${reason.slice(0, 1000)},
        updated_at = NOW()
    WHERE id = ${id}
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

/**
 * Release an idempotency key that was acquired but never completed (e.g. the
 * handler threw before crediting). Deletes only un-completed rows so a genuine
 * client retry can re-acquire and re-attempt the operation. No-op on completed
 * keys (those must keep replaying their cached response).
 */
export async function releaseIdempotencyKey(key: string): Promise<void> {
  const sql = getSQL();
  await sql`DELETE FROM idempotency_keys WHERE key = ${key} AND completed_at IS NULL`;
}

// ---------------------------------------------------------------------------
// IAP grant failures (durable record of store-charged-but-not-credited cases)
// ---------------------------------------------------------------------------

export type IapGrantFailureReason =
  | 'credit_failed'
  | 'unknown_product'
  | 'player_not_found'
  | 'amount_mismatch'
  | 'player_mismatch'
  | 'missing_fields';

export async function logIapGrantFailure(failure: {
  playerId?: string | null;
  productId?: string | null;
  quarks?: number | null;
  purchaseToken?: string | null;
  reason: IapGrantFailureReason;
  status: number;
  detail?: string | null;
}): Promise<void> {
  const sql = getSQL();
  // Best-effort: never let logging a failure throw and mask the real error.
  try {
    await sql`
      INSERT INTO iap_grant_failures (
        id, player_id, product_id, quarks, purchase_token, reason, status, detail
      )
      VALUES (
        ${randomUUID()},
        ${failure.playerId ?? null},
        ${failure.productId ?? null},
        ${failure.quarks ?? null},
        ${failure.purchaseToken ?? null},
        ${failure.reason},
        ${failure.status},
        ${failure.detail ?? null}
      )
    `;
  } catch (err) {
    console.error('[IAP] Failed to record grant failure:', err);
  }
}

// ---------------------------------------------------------------------------
// Premium promo codes (one-time tester/partner codes) — see migration 031
// ---------------------------------------------------------------------------

export interface PremiumPromoCodeRow {
  code: string;
  duration_days: number;
  note: string | null;
  expires_at: string | null;
  redeemed_by: string | null;
  redeemed_at: string | null;
}

export type PromoCodeClaimResult =
  | { ok: true; row: PremiumPromoCodeRow }
  | { ok: false; reason: 'not_found' | 'already_redeemed' | 'expired' };

/**
 * Atomically claim a one-time premium promo code for a player.
 * The UPDATE ... WHERE redeemed_by IS NULL guard makes double-redeem impossible
 * even under concurrent requests.
 */
export async function claimPremiumPromoCode(code: string, playerId: string): Promise<PromoCodeClaimResult> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE premium_promo_codes
    SET redeemed_by = ${playerId}, redeemed_at = NOW()
    WHERE code = ${code}
      AND redeemed_by IS NULL
      AND (expires_at IS NULL OR expires_at > NOW())
    RETURNING *
  `;
  if (rows.length > 0) {
    return { ok: true, row: rows[0] as PremiumPromoCodeRow };
  }

  // Claim failed — figure out why for a friendly error message.
  const existing = await sql`
    SELECT redeemed_by, expires_at FROM premium_promo_codes WHERE code = ${code}
  `;
  if (existing.length === 0) return { ok: false, reason: 'not_found' };
  const row = existing[0] as { redeemed_by: string | null; expires_at: string | null };
  if (row.redeemed_by) return { ok: false, reason: 'already_redeemed' };
  return { ok: false, reason: 'expired' };
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
  await sql`DELETE FROM ship_models WHERE player_id = ${playerId}`;
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
  // Academy progress — quest streak, selected topics, difficulty, completed
  // lessons history. Previously leaked: when a player re-registered with the
  // same Firebase UID (delete-account + log back in), the stale row was
  // reused and progress "resurrected". Deleting ensures a clean slate.
  await sql`DELETE FROM academy_progress WHERE player_id = ${playerId}`;
  // Reports filed BY this player — their reporter-side trail. Reports where
  // this player was the REPORTED party stay intact (moderation audit value).
  await sql`DELETE FROM reports WHERE reporter_id = ${playerId}`;

  // Messages: anonymize sender (keep for chat history integrity)
  await sql`UPDATE messages SET sender_id = 'deleted', sender_name = 'Видалений' WHERE sender_id = ${playerId}`;

  // Finally delete the player record. ON DELETE CASCADE on planet_claims,
  // planet_destructions, and player_presence auto-cleans those rows.
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
  language: 'uk' | 'en' = 'uk',
): Promise<AcademyLessonRow | null> {
  const sql = getSQL();
  // Scope lookup by language so UK players never receive a cached EN
  // lesson or vice versa. Column exists from 012-language.sql; earlier
  // this filter was missing, so first-to-generate wins and wrong-lang
  // players got content in the other language.
  const rows = await sql`
    SELECT * FROM academy_lessons
    WHERE lesson_date = ${date}
      AND topic_id = ${topicId}
      AND difficulty = ${difficulty}
      AND language = ${language}
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
  language: 'uk' | 'en' = 'uk',
): Promise<void> {
  const sql = getSQL();
  await sql`
    INSERT INTO academy_lessons (lesson_date, topic_id, difficulty, language, lesson_content, lesson_image_url, quest_data, quiz_data)
    VALUES (${date}, ${topicId}, ${difficulty}, ${language}, ${lessonContent}, ${lessonImageUrl}, ${JSON.stringify(questData)}::jsonb, ${JSON.stringify(quizData)}::jsonb)
    ON CONFLICT (lesson_date, topic_id, difficulty, language) DO NOTHING
  `;
}

export async function updateCachedLessonQuiz(
  date: string,
  topicId: string,
  difficulty: string,
  language: 'uk' | 'en',
  quizData: unknown,
): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE academy_lessons
    SET quiz_data = ${JSON.stringify(quizData)}::jsonb
    WHERE lesson_date = ${date}
      AND topic_id = ${topicId}
      AND difficulty = ${difficulty}
      AND language = ${language}
  `;
}

export async function getOnboardedPlayerIds(): Promise<string[]> {
  const sql = getSQL();
  const rows = await sql`SELECT player_id FROM academy_progress WHERE onboarded = true`;
  return rows.map((r) => (r as { player_id: string }).player_id);
}

/** Onboarded players with their preferred_language — for lang-aware daily notifications. */
export async function getOnboardedPlayersWithLang(): Promise<
  Array<{ id: string; language: 'uk' | 'en' }>
> {
  const sql = getSQL();
  const rows = await sql`
    SELECT ap.player_id, p.preferred_language
    FROM academy_progress ap
    JOIN players p ON p.id = ap.player_id
    WHERE ap.onboarded = true
  `;
  return rows.map((r) => {
    const row = r as { player_id: string; preferred_language: string };
    const lang: 'uk' | 'en' = row.preferred_language === 'en' ? 'en' : 'uk';
    return { id: row.player_id, language: lang };
  });
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

/**
 * Atomically assign a player to a cluster inside a single transaction.
 *
 * 1. Acquires an advisory lock scoped to groupIndex so concurrent registrations
 *    for the same cluster are serialised.
 * 2. Sets the player's cluster_id (only if not already set).
 * 3. Recounts the actual number of players in the cluster (SELECT COUNT)
 *    and writes that back into clusters.player_count / is_full.
 *
 * Returns the updated ClusterRow.
 */
export async function assignPlayerToClusterTx(
  playerId: string,
  clusterId: string,
  groupIndex: number,
): Promise<ClusterRow> {
  const sql = getSQL();
  const results = await sql.transaction(
    [
      // 1. Advisory lock — serialise per groupIndex within this transaction
      sql`SELECT pg_advisory_xact_lock(${groupIndex})`,
      // 2. Link player to cluster (no-op if already linked)
      sql`UPDATE players SET cluster_id = ${clusterId} WHERE id = ${playerId} AND cluster_id IS NULL`,
      // 3. Recount real players and update cluster
      sql`
        UPDATE clusters
        SET player_count = (SELECT COUNT(*)::int FROM players WHERE cluster_id = ${clusterId}),
            is_full = ((SELECT COUNT(*)::int FROM players WHERE cluster_id = ${clusterId}) >= 50)
        WHERE id = ${clusterId}
        RETURNING *
      `,
    ],
    { isolationLevel: 'ReadCommitted' },
  );
  // results[2] is the RETURNING * from the UPDATE
  const rows = results[2] as unknown as ClusterRow[];
  if (rows[0]) return rows[0];
  // Fallback: cluster wasn't updated (shouldn't happen), re-fetch
  const fallback = await sql`SELECT * FROM clusters WHERE id = ${clusterId}`;
  return fallback[0] as ClusterRow;
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
  system_id: string | null;
  revealed_cells: unknown;  // JSONB — string[] of "col,row"
  harvested_cells: unknown; // JSONB — [string, HarvestedCell][]
  bot: unknown;             // JSONB — { col, row, active } | null
  harvesters: unknown;      // JSONB — { col, row }[]
  updated_at: string;
}

export async function getSurfaceState(
  playerId: string,
  systemId: string,
  planetId: string,
): Promise<SurfaceStateRow | null> {
  const sql = getSQL();
  const scoped = await sql`
    SELECT * FROM surface_state
    WHERE player_id = ${playerId} AND system_id = ${systemId} AND planet_id = ${planetId}
    LIMIT 1
  `;
  if (scoped[0]) return scoped[0] as SurfaceStateRow;
  const legacy = await sql`
    SELECT * FROM surface_state
    WHERE player_id = ${playerId} AND planet_id = ${planetId} AND system_id IS NULL
    LIMIT 1
  `;
  return (legacy[0] as SurfaceStateRow) ?? null;
}

export async function saveSurfaceState(
  playerId: string,
  systemId: string,
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
    INSERT INTO surface_state (player_id, system_id, planet_id, revealed_cells, harvested_cells, bot, harvesters, updated_at)
    VALUES (
      ${playerId}, ${systemId}, ${planetId},
      COALESCE(${rc}::jsonb, '[]'::jsonb),
      COALESCE(${hc}::jsonb, '[]'::jsonb),
      ${bt}::jsonb,
      COALESCE(${hr}::jsonb, '[]'::jsonb),
      NOW()
    )
    ON CONFLICT (player_id, system_id, planet_id) DO UPDATE SET
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
  await recordPlayerActivityHour(args.playerId);
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

export interface GalaxyStats {
  /** Players in this cluster online right now (heartbeat < 5 min). */
  playersOnline: number;
  /** All players registered in this cluster (player_count). */
  totalPlayers: number;
  /** Colonized planets in this cluster (planet_claims rows). */
  colonies: number;
  /** Star systems in this cluster: 19 per registered player + 500 core mesh. */
  starSystems: number;
  /** Approximate planet total (MEAN_PLANETS per system). */
  planets: number;
}

/**
 * Aggregate "galaxy" (= cluster) stats for the top HUD stats bar. One round-trip:
 * online count + colony count + cluster player_count, then derive the system /
 * planet totals from the macro-architecture model (see CLAUDE.md):
 *   • 19 personal systems per player (rings 0-2: 1+6+12)
 *   • +500 shared core-zone systems
 *   • ~6 planets per system (MEAN_PLANETS)
 */
export async function getGalaxyStats(clusterId: string): Promise<GalaxyStats> {
  const sql = getSQL();
  const rows = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM v_cluster_online_members WHERE cluster_id = ${clusterId}) AS online,
      (SELECT COUNT(*)::int FROM planet_claims         WHERE cluster_id = ${clusterId}) AS colonies,
      (SELECT COALESCE(player_count, 0)::int FROM clusters WHERE id = ${clusterId})     AS players
  ` as { online: number; colonies: number; players: number }[];
  const r = rows[0] ?? { online: 0, colonies: 0, players: 0 };
  const players = Math.max(1, r.players);
  const SYSTEMS_PER_PLAYER = 19;   // rings 0-2: 1 + 6 + 12
  const CORE_SYSTEMS = 500;        // galactic core mesh shared by the cluster
  const MEAN_PLANETS = 6;
  const starSystems = players * SYSTEMS_PER_PLAYER + CORE_SYSTEMS;
  return {
    playersOnline: r.online,
    totalPlayers: r.players,
    colonies: r.colonies,
    starSystems,
    planets: starSystems * MEAN_PLANETS,
  };
}

/** Daily login bonus amount (per Game Bible §0.4-bis: tighter free-AI control) */
export const DAILY_LOGIN_BONUS = 2;

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
          last_login   = NOW(),
          last_seen_at = NOW()
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
  await recordPlayerActivityHour(playerId);
  return {
    credited: row.credited,
    newBalance: row.quarks,
    streak: row.login_streak,
  };
}

// ---------------------------------------------------------------------------
// Retention: daily directives, cluster rating, comet event (migration 035)
// ---------------------------------------------------------------------------

export const DIRECTIVE_QUARKS = 1;
export const DIRECTIVE_STREAK_QUARKS = 5;
export const DIRECTIVE_STREAK_LEN = 7;

/**
 * Claim today's daily-directives reward. Idempotent per UTC day.
 * Streak: consecutive UTC days with a claim. Every 7th day pays 3 quarks
 * instead of 1.
 *
 * NOTE: task completion itself is client-tracked (XP only); the quark grant
 * is capped at one claim/day server-side, so the worst a tampered client can
 * earn is the same 1 quark/day an honest player gets.
 */
export async function claimDailyDirectives(playerId: string): Promise<{
  credited: number;
  newBalance: number;
  streak: number;
}> {
  const sql = getSQL();
  const rows = await sql`
    WITH cur AS (
      SELECT quarks, directive_streak, last_directive_date,
             DATE(NOW() AT TIME ZONE 'UTC') AS today
      FROM players WHERE id = ${playerId}
    ),
    calc AS (
      SELECT *,
        CASE
          WHEN last_directive_date = today THEN directive_streak
          WHEN last_directive_date = today - INTERVAL '1 day' THEN directive_streak + 1
          ELSE 1
        END AS new_streak,
        (last_directive_date IS DISTINCT FROM today) AS can_claim
      FROM cur
    ),
    upd AS (
      UPDATE players p
      SET quarks = p.quarks + CASE
            WHEN calc.can_claim AND calc.new_streak % ${DIRECTIVE_STREAK_LEN} = 0 THEN ${DIRECTIVE_STREAK_QUARKS}
            WHEN calc.can_claim THEN ${DIRECTIVE_QUARKS}
            ELSE 0
          END,
          directive_streak = CASE WHEN calc.can_claim THEN calc.new_streak ELSE p.directive_streak END,
          last_directive_date = CASE WHEN calc.can_claim THEN calc.today ELSE p.last_directive_date END
      FROM calc
      WHERE p.id = ${playerId}
      RETURNING p.quarks, p.directive_streak,
        CASE
          WHEN calc.can_claim AND calc.new_streak % ${DIRECTIVE_STREAK_LEN} = 0 THEN ${DIRECTIVE_STREAK_QUARKS}
          WHEN calc.can_claim THEN ${DIRECTIVE_QUARKS}
          ELSE 0
        END AS credited
    )
    SELECT quarks, directive_streak, credited FROM upd
  ` as Array<{ quarks: number; directive_streak: number; credited: number }>;

  const row = rows[0];
  if (!row) return { credited: 0, newBalance: 0, streak: 0 };
  return { credited: row.credited, newBalance: row.quarks, streak: row.directive_streak };
}

/** Read-only directive streak info (for the panel header). */
export async function getDirectiveStreak(playerId: string): Promise<{
  streak: number;
  claimedToday: boolean;
}> {
  const sql = getSQL();
  const rows = await sql`
    SELECT directive_streak,
           (last_directive_date = DATE(NOW() AT TIME ZONE 'UTC')) AS claimed_today
    FROM players WHERE id = ${playerId}
  ` as Array<{ directive_streak: number; claimed_today: boolean | null }>;
  const row = rows[0];
  return { streak: row?.directive_streak ?? 0, claimedToday: row?.claimed_today === true };
}

// ── Cluster rating ─────────────────────────────────────────────────────────

/** Monday (UTC) of the week containing `now`, as YYYY-MM-DD. */
export function weekMondayString(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = d.getUTCDay(); // 0=Sun
  const delta = dow === 0 ? 6 : dow - 1;
  d.setUTCDate(d.getUTCDate() - delta);
  return d.toISOString().slice(0, 10);
}

export interface ClusterLeaderboardRow {
  player_id: string;
  name: string;
  callsign: string | null;
  player_level: number;
  weekly_xp: number;
  champion_weeks: number;
  is_online: boolean;
}

/**
 * Weekly leaderboard of the player's cluster.
 * Lazily resets stale week_xp_base rows for the whole cluster first, so
 * weekly XP is always measured within the current Monday-anchored week.
 */
export async function getClusterLeaderboard(playerId: string): Promise<{
  week: string;
  clusterId: string | null;
  rows: ClusterLeaderboardRow[];
  myRank: number | null;
}> {
  const sql = getSQL();
  const week = weekMondayString();

  const me = await sql`SELECT cluster_id FROM players WHERE id = ${playerId}` as Array<{ cluster_id: string | null }>;
  const clusterId = me[0]?.cluster_id ?? null;
  if (!clusterId) return { week, clusterId: null, rows: [], myRank: null };

  const rows = await sql`
    SELECT id AS player_id, name, callsign, player_level,
           CASE
             WHEN week_xp_base_week = ${week} THEN GREATEST(0, player_xp - week_xp_base)
             ELSE 0
           END AS weekly_xp,
           champion_weeks,
           (COALESCE(last_seen_at, last_login, created_at) > NOW() - INTERVAL '10 minutes') AS is_online
    FROM players
    WHERE cluster_id = ${clusterId}
    ORDER BY
      CASE
        WHEN week_xp_base_week = ${week} THEN GREATEST(0, player_xp - week_xp_base)
        ELSE 0
      END DESC,
      player_level DESC,
      created_at ASC
    LIMIT 50
  ` as unknown as ClusterLeaderboardRow[];

  const myRank = rows.findIndex((r) => r.player_id === playerId);
  return { week, clusterId, rows, myRank: myRank >= 0 ? myRank + 1 : null };
}

export interface GalaxyLeaderRow {
  player_id: string;
  name: string;
  callsign: string | null;
  player_level: number;
  weekly_xp: number;
  champion_weeks: number;
  is_online: boolean;
  global_rank: number; // 1..10
}

/**
 * Live galaxy leaderboard for the current week: the #1 player of every cluster
 * (by weekly XP) competes against the #1s of all other clusters, and the global
 * top-10 of those leaders is returned. This is the in-progress preview of what
 * the Monday cron later freezes into `cluster_champions`. We surface this
 * instead of the raw cluster board because per-cluster numbers are mostly zero
 * while clusters fill up — the cross-cluster aggregate always has signal.
 *
 * Also returns the caller's own standing (weekly XP, rank inside their cluster,
 * whether they're their cluster's leader and, if so, their galaxy rank).
 */
export async function getGalaxyLeaderboard(playerId: string): Promise<{
  week: string;
  top: GalaxyLeaderRow[];
  me: {
    weeklyXp: number;
    clusterRank: number | null;
    isClusterLeader: boolean;
    globalRank: number | null;
  } | null;
}> {
  const sql = getSQL();
  const week = weekMondayString();

  // Rank players within each cluster, keep the leaders, rank leaders globally.
  const leaders = await sql`
    WITH ranked AS (
      SELECT id, name, callsign, player_level, cluster_id,
             CASE
               WHEN week_xp_base_week = ${week} THEN GREATEST(0, player_xp - week_xp_base)
               ELSE 0
             END AS weekly_xp,
             champion_weeks,
             (COALESCE(last_seen_at, last_login, created_at) > NOW() - INTERVAL '10 minutes') AS is_online,
             ROW_NUMBER() OVER (
               PARTITION BY cluster_id
               ORDER BY
                 CASE
                   WHEN week_xp_base_week = ${week} THEN GREATEST(0, player_xp - week_xp_base)
                   ELSE 0
                 END DESC,
                 player_level DESC,
                 created_at ASC
             ) AS cluster_rn
      FROM players
      WHERE cluster_id IS NOT NULL
    )
    SELECT id AS player_id, name, callsign, player_level, weekly_xp, champion_weeks, is_online,
           ROW_NUMBER() OVER (ORDER BY weekly_xp DESC, player_level DESC) AS global_rank
    FROM ranked
    WHERE cluster_rn = 1 AND weekly_xp > 0
    ORDER BY global_rank ASC
    LIMIT 10
  ` as unknown as GalaxyLeaderRow[];

  // Caller's own standing within their cluster.
  const meRows = await sql`
    WITH ranked AS (
      SELECT id, cluster_id,
             CASE
               WHEN week_xp_base_week = ${week} THEN GREATEST(0, player_xp - week_xp_base)
               ELSE 0
             END AS weekly_xp,
             ROW_NUMBER() OVER (
               PARTITION BY cluster_id
               ORDER BY
                 CASE
                   WHEN week_xp_base_week = ${week} THEN GREATEST(0, player_xp - week_xp_base)
                   ELSE 0
                 END DESC,
                 player_level DESC,
                 created_at ASC
             ) AS cluster_rn
      FROM players
      WHERE cluster_id IS NOT NULL
        AND cluster_id = (SELECT cluster_id FROM players WHERE id = ${playerId})
    )
    SELECT weekly_xp, cluster_rn FROM ranked WHERE id = ${playerId}
  ` as Array<{ weekly_xp: number; cluster_rn: number }>;

  let me: { weeklyXp: number; clusterRank: number | null; isClusterLeader: boolean; globalRank: number | null } | null = null;
  if (meRows[0]) {
    const isLeader = meRows[0].cluster_rn === 1;
    const globalRank = isLeader
      ? (leaders.find((l) => l.player_id === playerId)?.global_rank ?? null)
      : null;
    me = {
      weeklyXp: Number(meRows[0].weekly_xp ?? 0),
      clusterRank: Number(meRows[0].cluster_rn ?? 0) || null,
      isClusterLeader: isLeader,
      globalRank,
    };
  }

  return { week, top: leaders.map((r) => ({ ...r, global_rank: Number(r.global_rank) })), me };
}

export interface ChampionRow {
  week_date: string;
  cluster_id: string;
  player_id: string;
  player_name: string;
  weekly_xp: number;
  global_rank: number | null;
  reward_quarks: number;
}

/** Hall of fame: top-10 champions of the latest finalized week + my cluster's champion. */
export async function getHallOfFame(clusterId: string | null): Promise<{
  week: string | null;
  top: ChampionRow[];
  myClusterChampion: ChampionRow | null;
}> {
  const sql = getSQL();
  const latest = await sql`
    SELECT week_date FROM cluster_champions ORDER BY week_date DESC LIMIT 1
  ` as Array<{ week_date: string }>;
  const week = latest[0]?.week_date ?? null;
  if (!week) return { week: null, top: [], myClusterChampion: null };

  const top = await sql`
    SELECT week_date, cluster_id, player_id, player_name, weekly_xp, global_rank, reward_quarks
    FROM cluster_champions
    WHERE week_date = ${week} AND global_rank IS NOT NULL
    ORDER BY global_rank ASC
    LIMIT 10
  ` as unknown as ChampionRow[];

  let myClusterChampion: ChampionRow | null = null;
  if (clusterId) {
    const mine = await sql`
      SELECT week_date, cluster_id, player_id, player_name, weekly_xp, global_rank, reward_quarks
      FROM cluster_champions
      WHERE week_date = ${week} AND cluster_id = ${clusterId}
      LIMIT 1
    ` as unknown as ChampionRow[];
    myClusterChampion = mine[0] ?? null;
  }
  return { week, top, myClusterChampion };
}

/** My permanent rating achievements. */
export async function getRatingAchievements(playerId: string): Promise<{
  championWeeks: number;
  bestGlobalRank: number | null;
  top10Weeks: number;
}> {
  const sql = getSQL();
  const rows = await sql`
    SELECT
      (SELECT champion_weeks FROM players WHERE id = ${playerId}) AS champion_weeks,
      (SELECT MIN(global_rank) FROM cluster_champions WHERE player_id = ${playerId} AND global_rank IS NOT NULL) AS best_rank,
      (SELECT COUNT(*) FROM cluster_champions WHERE player_id = ${playerId} AND global_rank IS NOT NULL) AS top10_weeks
  ` as Array<{ champion_weeks: number | null; best_rank: number | null; top10_weeks: number }>;
  const row = rows[0];
  return {
    championWeeks: row?.champion_weeks ?? 0,
    bestGlobalRank: row?.best_rank ?? null,
    top10Weeks: Number(row?.top10_weeks ?? 0),
  };
}

/**
 * Finalize the week that just ended: pick each cluster's champion, rank the
 * top-10 globally, pay quarks (rank 1 → 100, rank 2 → 50, rank 3 → 30,
 * ranks 4-10 → 1), bump champion_weeks and reset every player's weekly window.
 *
 * Idempotent: skips if champions for `finishedWeek` already exist.
 * Returns the champion rows (with ranks) for downstream notifications.
 */
export async function finalizeWeeklyChampions(): Promise<{
  finishedWeek: string;
  champions: ChampionRow[];
  alreadyDone: boolean;
}> {
  const sql = getSQL();
  const currentWeek = weekMondayString();
  const finished = new Date(`${currentWeek}T00:00:00Z`);
  finished.setUTCDate(finished.getUTCDate() - 7);
  const finishedWeek = finished.toISOString().slice(0, 10);

  const existing = await sql`
    SELECT COUNT(*)::int AS n FROM cluster_champions WHERE week_date = ${finishedWeek}
  ` as Array<{ n: number }>;
  if ((existing[0]?.n ?? 0) > 0) {
    const rows = await sql`
      SELECT week_date, cluster_id, player_id, player_name, weekly_xp, global_rank, reward_quarks
      FROM cluster_champions WHERE week_date = ${finishedWeek}
      ORDER BY weekly_xp DESC
    ` as unknown as ChampionRow[];
    return { finishedWeek, champions: rows, alreadyDone: true };
  }

  // Champions: best weekly XP per cluster within the finished week window.
  // Only players whose base was anchored to the finished week count.
  const champions = await sql`
    INSERT INTO cluster_champions (week_date, cluster_id, player_id, player_name, weekly_xp)
    SELECT ${finishedWeek}, cluster_id, id, COALESCE(callsign, name),
           GREATEST(0, player_xp - week_xp_base)
    FROM (
      SELECT *, ROW_NUMBER() OVER (
        PARTITION BY cluster_id
        ORDER BY (player_xp - week_xp_base) DESC, player_level DESC, created_at ASC
      ) AS rn
      FROM players
      WHERE cluster_id IS NOT NULL
        AND week_xp_base_week = ${finishedWeek}
        AND player_xp - week_xp_base > 0
    ) ranked
    WHERE rn = 1
    ON CONFLICT (week_date, cluster_id) DO NOTHING
    RETURNING week_date, cluster_id, player_id, player_name, weekly_xp, global_rank, reward_quarks
  ` as unknown as ChampionRow[];

  // Global top-10 among champions.
  await sql`
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY weekly_xp DESC, created_at ASC) AS rnk
      FROM cluster_champions WHERE week_date = ${finishedWeek}
    )
    UPDATE cluster_champions c
    SET global_rank = ranked.rnk,
        reward_quarks = CASE WHEN ranked.rnk = 1 THEN 100 WHEN ranked.rnk = 2 THEN 50 WHEN ranked.rnk = 3 THEN 30 WHEN ranked.rnk <= 10 THEN 1 ELSE 0 END
    FROM ranked
    WHERE c.id = ranked.id AND ranked.rnk <= 10
  `;

  // Pay rewards + bump permanent champion counters.
  await sql`
    UPDATE players p
    SET quarks = p.quarks + c.reward_quarks,
        champion_weeks = p.champion_weeks + 1
    FROM cluster_champions c
    WHERE c.week_date = ${finishedWeek} AND c.player_id = p.id
  `;

  // Open the new week for everyone still anchored to the finished one.
  await sql`
    UPDATE players
    SET week_xp_base = player_xp, week_xp_base_week = ${currentWeek}
    WHERE week_xp_base_week IS DISTINCT FROM ${currentWeek}
  `;

  const finalRows = await sql`
    SELECT week_date, cluster_id, player_id, player_name, weekly_xp, global_rank, reward_quarks
    FROM cluster_champions WHERE week_date = ${finishedWeek}
    ORDER BY weekly_xp DESC
  ` as unknown as ChampionRow[];

  return { finishedWeek, champions: finalRows, alreadyDone: false };
}

// ── Cluster seat recycling ─────────────────────────────────────────────────

/**
 * Free a stale cluster seat for a new registration.
 *
 * A seat is stale when its player is still level ≤1 AND has been absent for
 * 3+ days. The newcomer takes the stale player's global_index (and thus their
 * cluster seat); the stale player is moved to the newcomer's fresh index with
 * cluster_id cleared (re-assigned deterministically if they ever return).
 * Home ids of the stale player are reset because the galaxy layout is
 * derived from global_index.
 *
 * Returns the recycled global_index, or null when no stale seat exists.
 */
export async function recycleStaleClusterSeat(
  newPlayerId: string,
  newGlobalIndex: number,
): Promise<{ recycledIndex: number; recycledClusterId: string | null } | null> {
  void newPlayerId;
  void newGlobalIndex;
  // Disabled after the Explorer-943 incident. A player's global_index is part of
  // their deterministic galaxy identity and must never be recycled or swapped.
  return null;
}

/** Players eligible for comet pushes (active in last 14d, push-enabled). */
export async function getCometPushCandidates(): Promise<Array<{
  id: string;
  preferred_language: string;
}>> {
  const sql = getSQL();
  return await sql`
    SELECT id, preferred_language
    FROM players
    WHERE fcm_token IS NOT NULL
      AND push_notifications = TRUE
      AND COALESCE(last_seen_at, last_login, created_at) > NOW() - INTERVAL '14 days'
  ` as unknown as Array<{ id: string; preferred_language: string }>;
}

// ---------------------------------------------------------------------------
// Polls (community "голосування" — admin-created, shown in global chat)
// ---------------------------------------------------------------------------
//
// Players vote once per poll (server-enforced via UNIQUE(poll_id, player_id)).
// getPollResultsPublic computes percentages here, server-side, so raw vote
// counts never need to be sent to the client — only getPollResultsAdmin
// (gated by ADMIN_PUSH_SECRET at the API layer) exposes absolute counts and
// the per-voter breakdown.
// ---------------------------------------------------------------------------

export interface PollOption {
  id: string;
  label_uk: string;
  label_en: string;
}

export interface PollRow {
  id: string;
  question_uk: string;
  question_en: string;
  options: PollOption[];
  status: 'active' | 'closed';
  created_at: string;
  closes_at: string | null;
}

export interface PollVoteRow {
  id: number;
  poll_id: string;
  player_id: string;
  option_id: string;
  created_at: string;
}

export async function createPoll(input: {
  questionUk: string;
  questionEn: string;
  options: PollOption[];
  closesAt?: string | null;
}): Promise<PollRow> {
  const sql = getSQL();
  const id = `poll_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const rows = await sql`
    INSERT INTO polls (id, question_uk, question_en, options, status, closes_at)
    VALUES (
      ${id}, ${input.questionUk}, ${input.questionEn},
      ${JSON.stringify(input.options)}::jsonb, 'active', ${input.closesAt ?? null}
    )
    RETURNING *
  `;
  return rows[0] as unknown as PollRow;
}

/** Most recently created active poll, or null when none is active. */
export async function getActivePoll(): Promise<PollRow | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT * FROM polls WHERE status = 'active' ORDER BY created_at DESC LIMIT 1
  `;
  return rows.length ? (rows[0] as unknown as PollRow) : null;
}

export async function getPollById(pollId: string): Promise<PollRow | null> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM polls WHERE id = ${pollId}`;
  return rows.length ? (rows[0] as unknown as PollRow) : null;
}

/** Newest-first page of polls for the admin console, plus total count. */
export async function listPolls(limit: number = 50, offset: number = 0): Promise<{ rows: PollRow[]; total: number }> {
  const sql = getSQL();
  const [rows, countRows] = await Promise.all([
    sql`SELECT * FROM polls ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    sql`SELECT COUNT(*)::int AS count FROM polls`,
  ]);
  return { rows: rows as unknown as PollRow[], total: (countRows[0] as { count: number }).count };
}

export async function closePoll(pollId: string): Promise<PollRow | null> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE polls SET status = 'closed' WHERE id = ${pollId} RETURNING *
  `;
  return rows.length ? (rows[0] as unknown as PollRow) : null;
}

export type CastVoteResult =
  | { ok: true; vote: PollVoteRow }
  | { ok: false; reason: 'already_voted' | 'poll_not_found' | 'poll_closed' | 'invalid_option' };

/** Casts a single vote. Server-enforced one-vote-per-player via the unique
 *  index — a second attempt for the same poll/player is rejected, never
 *  silently overwritten. */
export async function castVote(input: {
  pollId: string;
  playerId: string;
  optionId: string;
}): Promise<CastVoteResult> {
  const sql = getSQL();

  const pollRows = await sql`SELECT * FROM polls WHERE id = ${input.pollId}`;
  if (!pollRows.length) return { ok: false, reason: 'poll_not_found' };
  const poll = pollRows[0] as unknown as PollRow;
  if (poll.status !== 'active') return { ok: false, reason: 'poll_closed' };
  const validOption = poll.options.some((o) => o.id === input.optionId);
  if (!validOption) return { ok: false, reason: 'invalid_option' };

  const rows = await sql`
    INSERT INTO poll_votes (poll_id, player_id, option_id)
    VALUES (${input.pollId}, ${input.playerId}, ${input.optionId})
    ON CONFLICT (poll_id, player_id) DO NOTHING
    RETURNING *
  `;
  if (!rows.length) return { ok: false, reason: 'already_voted' };
  return { ok: true, vote: rows[0] as unknown as PollVoteRow };
}

export async function getPlayerVoteForPoll(pollId: string, playerId: string): Promise<PollVoteRow | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT * FROM poll_votes WHERE poll_id = ${pollId} AND player_id = ${playerId}
  `;
  return rows.length ? (rows[0] as unknown as PollVoteRow) : null;
}

export interface PollResultOption {
  optionId: string;
  percentage: number;
}

/** Player-facing results: percentages only, rounded to 1 decimal. Counts are
 *  aggregated and discarded here — they never leave this function for the
 *  public path (see getPollResultsAdmin for the counted admin view). */
export async function getPollResultsPublic(pollId: string): Promise<{
  totalVotes: number;
  options: PollResultOption[];
}> {
  const sql = getSQL();
  const rows = await sql`
    SELECT option_id, COUNT(*)::int AS count
    FROM poll_votes
    WHERE poll_id = ${pollId}
    GROUP BY option_id
  `;
  const counts = rows as unknown as Array<{ option_id: string; count: number }>;
  const total = counts.reduce((sum, r) => sum + r.count, 0);
  const options = counts.map((r) => ({
    optionId: r.option_id,
    percentage: total > 0 ? Math.round((r.count / total) * 1000) / 10 : 0,
  }));
  return { totalVotes: total, options };
}

export interface PollVoterRow {
  playerId: string;
  callsign: string | null;
  level: number;
  optionId: string;
  createdAt: string;
}

/** Admin-only view: absolute per-option counts + percentages, plus the full
 *  voter list (callsign/level/option/timestamp) joined against players. */
export async function getPollResultsAdmin(pollId: string): Promise<{
  totalVotes: number;
  options: Array<{ optionId: string; count: number; percentage: number }>;
  voters: PollVoterRow[];
}> {
  const sql = getSQL();
  const [countRows, voterRows] = await Promise.all([
    sql`
      SELECT option_id, COUNT(*)::int AS count
      FROM poll_votes
      WHERE poll_id = ${pollId}
      GROUP BY option_id
    `,
    sql`
      SELECT
        v.player_id AS player_id,
        p.callsign AS callsign,
        COALESCE(p.player_level, 0) AS level,
        v.option_id AS option_id,
        v.created_at AS created_at
      FROM poll_votes v
      LEFT JOIN players p ON p.id = v.player_id
      WHERE v.poll_id = ${pollId}
      ORDER BY v.created_at DESC
    `,
  ]);
  const counts = countRows as unknown as Array<{ option_id: string; count: number }>;
  const total = counts.reduce((sum, r) => sum + r.count, 0);
  const options = counts.map((r) => ({
    optionId: r.option_id,
    count: r.count,
    percentage: total > 0 ? Math.round((r.count / total) * 1000) / 10 : 0,
  }));
  const voters = (voterRows as unknown as Array<{
    player_id: string; callsign: string | null; level: number; option_id: string; created_at: string;
  }>).map((r) => ({
    playerId: r.player_id,
    callsign: r.callsign,
    level: r.level,
    optionId: r.option_id,
    createdAt: r.created_at,
  }));
  return { totalVotes: total, options, voters };
}

// ---------------------------------------------------------------------------
// Megastructures — "Мегаструктури кластера" (migration 043)
// ---------------------------------------------------------------------------
// Pure sizing/clamp/payout math lives in packages/core/src/game/megastructure.ts
// so client previews and the server (source of truth) agree. One active
// megastructure per cluster; MVP only ever provisions a 'beacon' tier 1 —
// see getMegastructureRequirements for the sizing derivation.

export interface MegastructureRow {
  id: string;
  cluster_id: string;
  type: string;
  tier: number;
  status: 'building' | 'completed';
  requirements: MegastructureResourceBundle;
  progress: MegastructureResourceBundle;
  research_bonus_active: boolean;
  builders: MegastructureBuilderRecord[] | null;
  started_at: string;
  completed_at: string | null;
}

/** Auto-provisions the cluster's beacon on first view; otherwise returns the
 *  most recently started structure for the cluster (building or completed —
 *  no new tier is auto-started yet, only 'beacon' tier 1 exists). */
export async function getOrCreateClusterMegastructure(clusterId: string): Promise<MegastructureRow> {
  const sql = getSQL();
  const existing = await sql`
    SELECT * FROM megastructures WHERE cluster_id = ${clusterId}
    ORDER BY started_at DESC LIMIT 1
  `;
  if (existing[0]) return existing[0] as unknown as MegastructureRow;

  const requirements = getMegastructureRequirements('beacon', 1);
  const id = `${clusterId}-beacon-1`;
  const rows = await sql`
    INSERT INTO megastructures (id, cluster_id, type, tier, status, requirements)
    VALUES (${id}, ${clusterId}, 'beacon', 1, 'building', ${JSON.stringify(requirements)})
    ON CONFLICT (id) DO NOTHING
    RETURNING *
  `;
  if (rows[0]) return rows[0] as unknown as MegastructureRow;
  // ON CONFLICT fired (race with a concurrent request) — fetch the row it created.
  const fallback = await sql`SELECT * FROM megastructures WHERE id = ${id}`;
  return fallback[0] as unknown as MegastructureRow;
}

/** Today's cumulative contribution (units per resource) for a player on a
 *  given structure — used both for the server-side cap check and the "X
 *  remaining today" UI hint. */
export async function getMegastructureContributionToday(
  megastructureId: string,
  playerId: string,
): Promise<MegastructureResourceBundle> {
  const sql = getSQL();
  const rows = await sql`
    SELECT resources FROM megastructure_contributions
    WHERE megastructure_id = ${megastructureId} AND player_id = ${playerId} AND day = CURRENT_DATE
  `;
  return (rows[0]?.resources as MegastructureResourceBundle | undefined) ?? emptyResourceBundle();
}

export type ContributeOutcome =
  | {
      ok: true;
      megastructure: MegastructureRow;
      applied: MegastructureResourceBundle;
      /** Player's cumulative contributed units today, AFTER this call. */
      todayTotalAfter: number;
      isFirstContributionToday: boolean;
      justCompleted: boolean;
    }
  | { ok: false; reason: 'not_found' | 'already_completed' | 'no_capacity' };

/**
 * Validates the daily cap server-side (against the fresh row read here — see
 * the module comment above the `progress`/`resources` UPDATE statements for
 * why the actual increments are still race-safe even though this pre-check
 * uses a moment-in-time read), clamps the request against remaining
 * structure need, applies it atomically, and detects completion.
 */
export async function contributeToMegastructure(input: {
  megastructureId: string;
  playerId: string;
  playerName: string;
  requested: Partial<MegastructureResourceBundle>;
}): Promise<ContributeOutcome> {
  const sql = getSQL();

  const structRows = await sql`SELECT * FROM megastructures WHERE id = ${input.megastructureId}`;
  const structure = structRows[0] as unknown as MegastructureRow | undefined;
  if (!structure) return { ok: false, reason: 'not_found' };
  if (structure.status === 'completed') return { ok: false, reason: 'already_completed' };

  const todayBundle = await getMegastructureContributionToday(input.megastructureId, input.playerId);
  const todayTotal = resourceTotal(todayBundle);
  const applied = clampContribution(input.requested, structure.progress, structure.requirements, todayTotal);
  const appliedTotal = resourceTotal(applied);
  if (appliedTotal <= 0) return { ok: false, reason: 'no_capacity' };

  const isFirstContributionToday = todayTotal <= 0;

  // The UPDATE statements below always add `applied` to the table's live
  // (fresh, lock-protected) column value — not to the JS-side snapshot read
  // above — so concurrent contributions never lose an update or corrupt
  // progress/resources totals. Only the *decision* of how much to allow was
  // based on a moment-in-time read; a very tight race between two calls from
  // the same player could in theory let them exceed the daily cap by a small
  // bounded amount. Acceptable for a non-monetary, cooperative game economy.
  const results = await sql.transaction(
    [
      sql`SELECT pg_advisory_xact_lock(hashtext(${input.megastructureId}))`,
      sql`
        INSERT INTO megastructure_contributions (megastructure_id, player_id, player_name, resources, day)
        VALUES (
          ${input.megastructureId}, ${input.playerId}, ${input.playerName},
          ${JSON.stringify(applied)}, CURRENT_DATE
        )
        ON CONFLICT (megastructure_id, player_id, day) DO UPDATE SET
          resources = jsonb_build_object(
            'minerals',  COALESCE((megastructure_contributions.resources->>'minerals')::numeric, 0)  + ${applied.minerals},
            'volatiles', COALESCE((megastructure_contributions.resources->>'volatiles')::numeric, 0) + ${applied.volatiles},
            'isotopes',  COALESCE((megastructure_contributions.resources->>'isotopes')::numeric, 0)  + ${applied.isotopes},
            'water',     COALESCE((megastructure_contributions.resources->>'water')::numeric, 0)     + ${applied.water}
          ),
          player_name = ${input.playerName}
      `,
      sql`
        UPDATE megastructures SET
          progress = jsonb_build_object(
            'minerals',  LEAST((requirements->>'minerals')::numeric,  COALESCE((progress->>'minerals')::numeric, 0)  + ${applied.minerals}),
            'volatiles', LEAST((requirements->>'volatiles')::numeric, COALESCE((progress->>'volatiles')::numeric, 0) + ${applied.volatiles}),
            'isotopes',  LEAST((requirements->>'isotopes')::numeric,  COALESCE((progress->>'isotopes')::numeric, 0)  + ${applied.isotopes}),
            'water',     LEAST((requirements->>'water')::numeric,     COALESCE((progress->>'water')::numeric, 0)     + ${applied.water})
          )
        WHERE id = ${input.megastructureId}
        RETURNING *
      `,
    ],
    { isolationLevel: 'ReadCommitted' },
  );

  const updatedRows = results[2] as unknown as MegastructureRow[];
  let updated = updatedRows[0];

  const justCompleted = updated.status === 'building' && isMegastructureComplete(updated.progress, updated.requirements);
  if (justCompleted) {
    updated = await completeMegastructure(input.megastructureId);
  }

  return {
    ok: true,
    megastructure: updated,
    applied,
    todayTotalAfter: todayTotal + appliedTotal,
    isFirstContributionToday,
    justCompleted,
  };
}

/** Sums all-time contributions per player, computes the share-based payout
 *  (see computeMegastructureBuilders in @nebulife/core), credits every
 *  contributor's quarks + XP directly (server-authoritative — most
 *  contributors won't be online at the exact completing moment), and stores
 *  the final "Будівничі" record + flips status/research_bonus_active. */
async function completeMegastructure(megastructureId: string): Promise<MegastructureRow> {
  const sql = getSQL();

  const contribRows = await sql`
    SELECT
      player_id,
      (array_agg(player_name ORDER BY day DESC))[1] AS player_name,
      SUM(
        COALESCE((resources->>'minerals')::numeric, 0) + COALESCE((resources->>'volatiles')::numeric, 0)
        + COALESCE((resources->>'isotopes')::numeric, 0) + COALESCE((resources->>'water')::numeric, 0)
      ) AS total_units,
      COUNT(DISTINCT day)::int AS days
    FROM megastructure_contributions
    WHERE megastructure_id = ${megastructureId}
    GROUP BY player_id
  `;
  const contributors = (contribRows as unknown as Array<{
    player_id: string; player_name: string; total_units: string | number; days: number;
  }>).map((r) => ({
    playerId: r.player_id,
    playerName: r.player_name,
    totalUnits: Number(r.total_units),
    days: r.days,
  }));

  const builders = computeMegastructureBuilders(contributors);

  // Reward crediting is best-effort per contributor — one bad row must not
  // block the others or leave the structure stuck in 'building'.
  for (const builder of builders) {
    try {
      await sql`
        UPDATE players
        SET quarks = quarks + ${builder.quarksAwarded},
            player_xp = player_xp + ${builder.xpAwarded}
        WHERE id = ${builder.playerId}
      `;
    } catch (err) {
      console.error('[megastructure] reward credit failed for', builder.playerId, err);
    }
  }

  const rows = await sql`
    UPDATE megastructures
    SET status = 'completed',
        completed_at = NOW(),
        research_bonus_active = TRUE,
        builders = ${JSON.stringify(builders)}
    WHERE id = ${megastructureId}
    RETURNING *
  `;
  return rows[0] as unknown as MegastructureRow;
}

export type MegastructureBuilderView = MegastructureBuilderRecord;

/** Top contributors for a structure. Once completed, returns the frozen
 *  "Будівничі" record (`builders` column); while building, computes a live
 *  leaderboard (share relative to ALL contributors, not just the returned
 *  top N) so the UI can show an accurate percentage at any time. */
export async function getMegastructureBuilders(
  megastructureId: string,
  limit = 15,
): Promise<MegastructureBuilderView[]> {
  const sql = getSQL();
  const structRows = await sql`SELECT status, builders FROM megastructures WHERE id = ${megastructureId}`;
  const structure = structRows[0] as { status?: string; builders?: MegastructureBuilderRecord[] | null } | undefined;
  if (structure?.status === 'completed' && structure.builders) {
    return structure.builders.slice(0, limit);
  }

  const rows = await sql`
    WITH totals AS (
      SELECT
        player_id,
        (array_agg(player_name ORDER BY day DESC))[1] AS player_name,
        SUM(
          COALESCE((resources->>'minerals')::numeric, 0) + COALESCE((resources->>'volatiles')::numeric, 0)
          + COALESCE((resources->>'isotopes')::numeric, 0) + COALESCE((resources->>'water')::numeric, 0)
        ) AS total_units,
        COUNT(DISTINCT day)::int AS days
      FROM megastructure_contributions
      WHERE megastructure_id = ${megastructureId}
      GROUP BY player_id
    )
    SELECT *, CASE WHEN SUM(total_units) OVER () > 0 THEN total_units / SUM(total_units) OVER () ELSE 0 END AS share
    FROM totals
    ORDER BY total_units DESC
    LIMIT ${limit}
  `;
  return (rows as unknown as Array<{
    player_id: string; player_name: string; total_units: string | number; days: number; share: string | number;
  }>).map((r) => ({
    playerId: r.player_id,
    playerName: r.player_name,
    totalUnits: Number(r.total_units),
    days: r.days,
    share: Number(r.share),
    quarksAwarded: 0,
    xpAwarded: 0,
  }));
}

// ---------------------------------------------------------------------------
// Saga Chapters ("Сага Ткача" — migration 044)
// ---------------------------------------------------------------------------
// One row per (player, milestone_type). Written once by
// api/saga/generate-chapter.ts; read by api/saga/list.ts for the reader UI.

export interface SagaChapterRow {
  id: string;
  player_id: string;
  milestone_type: string;
  title: string;
  body_text: string;
  image_url: string | null;
  language: string;
  created_at: string;
}

export async function createSagaChapter(m: {
  id: string;
  playerId: string;
  milestoneType: string;
  title: string;
  bodyText: string;
  imageUrl: string | null;
  language: string;
}): Promise<SagaChapterRow> {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO saga_chapters (id, player_id, milestone_type, title, body_text, image_url, language)
    VALUES (${m.id}, ${m.playerId}, ${m.milestoneType}, ${m.title}, ${m.bodyText}, ${m.imageUrl}, ${m.language})
    ON CONFLICT (player_id, milestone_type) DO NOTHING
    RETURNING *
  `;
  if (rows[0]) return rows[0] as SagaChapterRow;
  // Lost the race to a concurrent request for the same milestone — return
  // the row that won instead of throwing, so the client still gets a chapter.
  const existing = await sql`
    SELECT * FROM saga_chapters WHERE player_id = ${m.playerId} AND milestone_type = ${m.milestoneType}
  `;
  return existing[0] as SagaChapterRow;
}

export async function listSagaChapters(playerId: string): Promise<SagaChapterRow[]> {
  const sql = getSQL();
  return (await sql`
    SELECT * FROM saga_chapters WHERE player_id = ${playerId} ORDER BY created_at ASC
  `) as SagaChapterRow[];
}

export async function hasSagaChapter(playerId: string, milestoneType: string): Promise<boolean> {
  const sql = getSQL();
  const rows = await sql`
    SELECT 1 FROM saga_chapters WHERE player_id = ${playerId} AND milestone_type = ${milestoneType} LIMIT 1
  `;
  return rows.length > 0;
}

/** Server-side daily generation cap (SAGA_DAILY_CHAPTER_CAP) — any chapter
 *  written by this player in the last 24h blocks a new one, independent of
 *  milestone type. */
export async function hasRecentSagaChapter(playerId: string, withinMs = 24 * 60 * 60 * 1000): Promise<boolean> {
  const sql = getSQL();
  const rows = await sql`
    SELECT 1 FROM saga_chapters
    WHERE player_id = ${playerId} AND created_at > NOW() - make_interval(secs => ${withinMs / 1000.0})
    LIMIT 1
  `;
  return rows.length > 0;
}
