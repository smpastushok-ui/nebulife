import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticate,
  closeEmergencyTransmission,
  EMERGENCY_EPISODE_ID_PATTERN,
  isMissingEmergencyTransmissionSchema,
} from '@nebulife/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const auth = await authenticate(req, res);
  if (!auth) return;
  const episodeId = typeof req.body?.episodeId === 'string' ? req.body.episodeId.trim() : '';
  if (!EMERGENCY_EPISODE_ID_PATTERN.test(episodeId)) {
    return res.status(400).json({ error: 'invalid_episode_id' });
  }
  try {
    const closed = await closeEmergencyTransmission(auth.playerId, episodeId);
    return res.status(200).json({ ok: true, closed });
  } catch (error) {
    if (isMissingEmergencyTransmissionSchema(error)) {
      return res.status(503).json({ error: 'emergency_transmissions_not_deployed' });
    }
    console.error('[emergency-transmissions/close] failed:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}
