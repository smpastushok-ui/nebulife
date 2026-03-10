import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  saveSurfaceBuilding,
  getSurfaceBuildings,
  removeSurfaceBuilding,
} from '../../packages/server/src/db.js';

/**
 * /api/surface/buildings
 *
 * GET  ?playerId=...&planetId=... → list buildings
 * POST { playerId, planetId, id, type, x, y } → place building
 * DELETE ?id=...&playerId=... → remove building
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // --- GET: List buildings ---
    if (req.method === 'GET') {
      const playerId = req.query.playerId as string;
      const planetId = req.query.planetId as string;

      if (!playerId || !planetId) {
        return res.status(400).json({ error: 'Missing playerId or planetId' });
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

    // --- DELETE: Remove building ---
    if (req.method === 'DELETE') {
      const id = req.query.id as string;
      const playerId = req.query.playerId as string;

      if (!id || !playerId) {
        return res.status(400).json({ error: 'Missing id or playerId' });
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
