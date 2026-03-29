import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getSurfaceState,
  saveSurfaceState,
} from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

/**
 * /api/surface/state (auth required)
 *
 * GET   ?playerId=...&planetId=...  → load surface state (fog, harvests, bot, drones)
 * POST  { playerId, planetId, revealedCells?, harvestedCells?, bot?, harvesters? }
 *       → upsert surface state (partial update — only provided fields are overwritten)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    // --- GET: Load surface state ---
    if (req.method === 'GET') {
      const playerId = req.query.playerId as string;
      const planetId = req.query.planetId as string;

      if (!playerId || !planetId) {
        return res.status(400).json({ error: 'Missing playerId or planetId' });
      }
      if (playerId !== auth.playerId) {
        return res.status(403).json({ error: 'Forbidden: player mismatch' });
      }

      const row = await getSurfaceState(playerId, planetId);
      if (!row) {
        return res.status(200).json({
          revealedCells: [],
          harvestedCells: [],
          bot: null,
          harvesters: [],
        });
      }

      return res.status(200).json({
        revealedCells: row.revealed_cells,
        harvestedCells: row.harvested_cells,
        bot: row.bot,
        harvesters: row.harvesters,
      });
    }

    // --- POST: Save surface state (partial upsert) ---
    if (req.method === 'POST') {
      const { playerId, planetId, revealedCells, harvestedCells, bot, harvesters } = req.body ?? {};

      if (!playerId || !planetId) {
        return res.status(400).json({ error: 'Missing playerId or planetId' });
      }
      if (playerId !== auth.playerId) {
        return res.status(403).json({ error: 'Forbidden: player mismatch' });
      }

      await saveSurfaceState(playerId, planetId, {
        revealedCells,
        harvestedCells,
        bot,
        harvesters,
      });

      return res.status(200).json({ status: 'ok' });
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (err) {
    console.error('Surface state error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
