import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticate,
  claimEmergencyTransmission,
  EMERGENCY_EPISODE_ID_PATTERN,
  isMissingEmergencyTransmissionSchema,
  sanitizeLegacyEpisodeIds,
  syncLegacyEmergencyTransmissionClaims,
} from '@nebulife/server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const auth = await authenticate(req, res);
  if (!auth) return;

  const body = (req.body ?? {}) as Record<string, unknown>;
  const legacyIds = sanitizeLegacyEpisodeIds(body.legacySeenEpisodeIds);
  const episodeId = str(body.episodeId);
  const claimToken = str(body.claimToken);

  try {
    const legacySynced = await syncLegacyEmergencyTransmissionClaims(auth.playerId, legacyIds);
    if (!episodeId) return res.status(200).json({ ok: true, legacySynced });
    if (!EMERGENCY_EPISODE_ID_PATTERN.test(episodeId) || !UUID_PATTERN.test(claimToken)) {
      return res.status(400).json({ error: 'invalid_claim' });
    }

    const result = await claimEmergencyTransmission({ playerId: auth.playerId, episodeId, claimToken });
    return res.status(result.claimed ? 200 : 409).json({
      ok: result.claimed,
      claimed: result.claimed,
      legacySynced,
    });
  } catch (error) {
    if (isMissingEmergencyTransmissionSchema(error)) {
      return res.status(503).json({ error: 'emergency_transmissions_not_deployed' });
    }
    console.error('[emergency-transmissions/claim] failed:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}
