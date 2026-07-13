import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, careForCreature, RATE_LIMITS } from '@nebulife/server';

function isCreatureEvolutionStorageMissing(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const code = typeof err === 'object' && err !== null && 'code' in err
    ? String((err as { code?: unknown }).code ?? '')
    : '';
  return (message.includes('creature_models') && message.includes('does not exist'))
    || code === '42703'
    || (message.includes('column') && message.includes('does not exist'));
}

const REASON_MESSAGES: Record<string, string> = {
  not_found: 'Creature not found',
  forbidden: 'Forbidden',
  already_cared_today: 'This creature has already been cared for today',
  no_longer_needs_care: 'This creature no longer needs daily care',
  creature_unavailable: 'This creature is not ready for care yet',
};

/**
 * POST /api/creatures/care
 *
 * Auth: Bearer token (Firebase)
 * Body: { creatureId: string }
 *
 * Daily care action ("Еволюція біосфери" — see GAME_MODULES.md AI-контент).
 * Once-per-UTC-day validated server-side against creature_models.last_care_at;
 * vitality/care_days/stage are recomputed via the shared pure logic in
 * @nebulife/core so client-side decay previews always agree with the server.
 *
 * Colony resources (minerals/water/volatiles) spent on the chosen care type
 * are NOT server-tracked — like all other colony spending, they live in the
 * client's per-planet resource state and are deducted client-side after this
 * call succeeds (see spendResourcesAcrossPlanets in App.tsx).
 *
 * Returns: { creature } on success, or { error, reason } on failure.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  if (!await RATE_LIMITS.creatureCare(auth.playerId)) {
    return res.status(429).json({ error: 'Зачекайте перед наступною дією.' });
  }

  const creatureId = typeof req.body?.creatureId === 'string' ? req.body.creatureId : '';
  if (!creatureId) {
    return res.status(400).json({ error: 'Missing required field: creatureId' });
  }

  try {
    const outcome = await careForCreature(creatureId, auth.playerId);
    if (!outcome.ok) {
      const status = outcome.reason === 'not_found' ? 404 : outcome.reason === 'forbidden' ? 403 : 400;
      return res.status(status).json({ error: REASON_MESSAGES[outcome.reason] ?? outcome.reason, reason: outcome.reason });
    }
    return res.status(200).json({ creature: outcome.creature });
  } catch (err) {
    if (isCreatureEvolutionStorageMissing(err)) {
      return res.status(503).json({
        error: 'Creature evolution storage is temporarily unavailable',
        reason: 'storage_unavailable',
      });
    }
    console.error('[creatures/care] Error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
