import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  saveSurfaceBuilding,
  getSurfaceBuildings,
  removeSurfaceBuilding,
  upgradeSurfaceBuilding,
} from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

/**
 * /api/surface/buildings (auth required)
 *
 * GET    ?playerId=...&planetId=... → list buildings
 * POST   { playerId, planetId, id, type, x, y } → place building
 * PATCH  { id, playerId } → upgrade building (level +1)
 * DELETE ?id=...&playerId=... → remove building
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify Firebase auth token
  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    // --- GET: List buildings ---
    if (req.method === 'GET') {
      const playerId = req.query.playerId as string;
      const planetId = req.query.planetId as string;

      if (!playerId || !planetId) {
        return res.status(400).json({ error: 'Missing playerId or planetId' });
      }

      if (playerId !== auth.playerId) {
        return res.status(403).json({ error: 'Forbidden: player mismatch' });
      }

      const rows = await getSurfaceBuildings(playerId, planetId);

      // Map DB rows to PlacedBuilding format
      const buildings = rows.map((r) => ({
        id: r.id,
        type: r.type,
        x: r.x,
        y: r.y,
        level: r.level,
        builtAt: r.built_at,
      }));

      return res.status(200).json(buildings);
    }

    // --- POST: Place building ---
    if (req.method === 'POST') {
      const { playerId, planetId, id, type, x, y } = req.body;

      if (!playerId || !planetId || !id || !type || x === undefined || y === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (playerId !== auth.playerId) {
        return res.status(403).json({ error: 'Forbidden: player mismatch' });
      }

      const row = await saveSurfaceBuilding({
        id,
        playerId,
        planetId,
        type,
        x: Number(x),
        y: Number(y),
      });

      return res.status(200).json({
        id: row.id,
        type: row.type,
        x: row.x,
        y: row.y,
        level: row.level,
        builtAt: row.built_at,
      });
    }

    // --- PATCH: Upgrade building ---
    if (req.method === 'PATCH') {
      const { id, playerId } = req.body;

      if (!id || !playerId) {
        return res.status(400).json({ error: 'Missing id or playerId' });
      }

      if (playerId !== auth.playerId) {
        return res.status(403).json({ error: 'Forbidden: player mismatch' });
      }

      const row = await upgradeSurfaceBuilding(id, playerId);
      if (!row) {
        return res.status(404).json({ error: 'Building not found' });
      }

      // Server-side max level guard
      if (row.level > 5) {
        return res.status(400).json({ error: 'Max level reached (5)' });
      }

      return res.status(200).json({
        id: row.id,
        type: row.type,
        x: row.x,
        y: row.y,
        level: row.level,
        builtAt: row.built_at,
      });
    }

    // --- DELETE: Remove building ---
    if (req.method === 'DELETE') {
      const id = req.query.id as string;
      const playerId = req.query.playerId as string;

      if (!id || !playerId) {
        return res.status(400).json({ error: 'Missing id or playerId' });
      }

      if (playerId !== auth.playerId) {
        return res.status(403).json({ error: 'Forbidden: player mismatch' });
      }

      await removeSurfaceBuilding(id, playerId);
      return res.status(200).json({ status: 'ok' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Surface buildings error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
