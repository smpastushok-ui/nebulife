import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticate,
  getNextEmergencyTransmission,
  isMissingEmergencyTransmissionSchema,
  RATE_LIMITS,
} from '@nebulife/server';

function localizedEpisode(row: NonNullable<Awaited<ReturnType<typeof getNextEmergencyTransmission>>>, language: string) {
  const uk = language === 'uk';
  return {
    id: row.id,
    source: 'youtube' as const,
    youtubeId: row.youtube_id,
    title: uk ? row.title_uk : row.title_en,
    summary: uk ? row.summary_uk : row.summary_en,
    releasedAt: row.release_at,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const auth = await authenticate(req, res);
  if (!auth) return;
  if (!await RATE_LIMITS.poll(auth.playerId)) return res.status(429).json({ error: 'Too many requests' });

  try {
    const row = await getNextEmergencyTransmission(auth.playerId);
    const language = req.query.language === 'uk' ? 'uk' : 'en';
    return res.status(200).json({ episode: row ? localizedEpisode(row, language) : null });
  } catch (error) {
    if (isMissingEmergencyTransmissionSchema(error)) {
      return res.status(503).json({ error: 'emergency_transmissions_not_deployed' });
    }
    console.error('[emergency-transmissions/next] failed:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}
