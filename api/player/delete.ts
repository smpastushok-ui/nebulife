import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { deletePlayerData } from '../../packages/server/src/db.js';
import { deleteFirebaseUser } from '../../packages/server/src/firebase-admin.js';

/**
 * POST /api/player/delete
 * Auth: Bearer Firebase token
 * Body: { confirmDelete: true }
 *
 * Permanently deletes all player data (GDPR / Apple requirement).
 * Deletes from PostgreSQL + Firebase Auth.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const { confirmDelete } = req.body ?? {};
    if (confirmDelete !== true) {
      return res.status(400).json({ error: 'Must confirm deletion with { confirmDelete: true }' });
    }

    // 1. Delete all player data from PostgreSQL
    await deletePlayerData(auth.playerId);

    // 2. Delete Firebase account
    try {
      await deleteFirebaseUser(auth.uid);
    } catch (err) {
      // Log but don't fail — DB data is already deleted
      console.warn(`[delete] Firebase user deletion failed for ${auth.uid}:`, err);
    }

    console.log(`[delete] Player ${auth.playerId} (Firebase ${auth.uid}) permanently deleted`);
    return res.status(200).json({ deleted: true });
  } catch (err) {
    console.error('Player delete error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
