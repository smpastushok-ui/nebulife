import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getPlayer,
  claimPlanet,
  getPlayerPlanetClaims,
  saveMessage,
} from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

/**
 * POST /api/colony/settle-second-home
 *
 * Settles the authenticated player's second home on a colonizable planet
 * outside their destroyed native system. Writes to `planet_claims`, then
 * broadcasts a cluster-wide announcement in the chat channel with
 * type='colony_settled' so other players see a small marker on their star
 * map and a themed chat row. Enforces "one colony per player" via the
 * unique constraint from migration 014.
 *
 * Body: { systemId, planetId, planetName }
 *   - planetName is the human-readable name shown in chat/markers
 *
 * Errors:
 *   401 — not authenticated
 *   400 — missing payload fields
 *   409 — player already has a colony OR planet claimed by another
 *   500 — internal error
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  const body = (req.body ?? {}) as {
    systemId?: string;
    planetId?: string;
    planetName?: string;
  };

  if (typeof body.systemId !== 'string' ||
      typeof body.planetId !== 'string' ||
      typeof body.planetName !== 'string') {
    return res.status(400).json({ error: 'Missing systemId, planetId, or planetName' });
  }

  const player = await getPlayer(auth.playerId);
  if (!player) return res.status(401).json({ error: 'Player not found' });
  if (!player.cluster_id) {
    return res.status(409).json({ error: 'Player not assigned to a cluster' });
  }

  // Enforce: one colony per player (UNIQUE(cluster_id, owner_player_id)
  // would reject this at the DB level, but we want a clean 409 without
  // hitting the unique_violation code path).
  const existing = await getPlayerPlanetClaims(auth.playerId);
  if (existing.length > 0) {
    return res.status(409).json({
      error: 'Already colonized',
      code: 'ALREADY_COLONIZED',
      existing: existing[0],
    });
  }

  try {
    const claim = await claimPlanet({
      clusterId: player.cluster_id,
      systemId: body.systemId,
      planetId: body.planetId,
      ownerPlayerId: auth.playerId,
      ownerNameSnapshot: player.name ?? null,
      colonyLevel: 1,
      terraformPct: 0,
    });

    if (!claim) {
      return res.status(409).json({
        error: 'Planet already claimed by another player',
        code: 'PLANET_TAKEN',
      });
    }

    // Broadcast announcement in cluster chat. Channel convention:
    // cluster-wide chat uses channel=`cluster:${cluster_id}`.
    // Content is a JSON payload so the client can render structured row
    // (icon + planet link + nick) and translate via i18n.
    const payload = JSON.stringify({
      planetName: body.planetName,
      systemId: body.systemId,
      planetId: body.planetId,
    });

    let broadcast: unknown = null;
    try {
      broadcast = await saveMessage(
        auth.playerId,
        player.name ?? 'Player',
        `cluster:${player.cluster_id}`,
        payload,
        'colony_settled',
      );
    } catch (err) {
      // Colony is settled — if chat broadcast fails we still return success
      // (the marker is the source of truth, chat is UX sugar).
      console.error('[colony/settle] Chat broadcast failed (non-fatal):',
        err instanceof Error ? err.message : err);
    }

    return res.status(200).json({ claim, broadcast });
  } catch (err) {
    // Catches unique_violation from concurrent double-submit + any DB errors
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('planet_claims_unique_player_per_cluster')) {
      return res.status(409).json({ error: 'Already colonized', code: 'ALREADY_COLONIZED' });
    }
    console.error('[colony/settle] Error:', msg);
    return res.status(500).json({ error: 'Internal error' });
  }
}
