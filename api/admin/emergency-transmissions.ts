import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'node:crypto';
import {
  archiveEmergencyTransmissionEpisode,
  EMERGENCY_EPISODE_ID_PATTERN,
  extractYouTubeId,
  isMissingEmergencyTransmissionSchema,
  listEmergencyTransmissionEpisodes,
  saveEmergencyTransmissionEpisode,
} from '@nebulife/server';

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function authorized(req: VercelRequest): boolean {
  const expected = (process.env.ADMIN_PUSH_SECRET || process.env.CRON_SECRET || '').trim();
  const body = (req.body ?? {}) as Record<string, unknown>;
  const provided = str(body.secret) || str(req.headers['x-admin-secret']);
  if (!expected || !provided) return false;
  const encoder = new TextEncoder();
  const a = encoder.encode(provided);
  const b = encoder.encode(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function publicRow(row: Awaited<ReturnType<typeof listEmergencyTransmissionEpisodes>>[number]) {
  return {
    id: row.id,
    youtubeId: row.youtube_id,
    titleUk: row.title_uk,
    titleEn: row.title_en,
    summaryUk: row.summary_uk,
    summaryEn: row.summary_en,
    releaseAt: row.release_at,
    sortOrder: row.sort_order,
    enabled: row.enabled,
    published: row.published,
    archivedAt: row.archived_at,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(process.env.ADMIN_PUSH_SECRET || process.env.CRON_SECRET || '').trim()) {
    return res.status(503).json({ error: 'admin_secret_not_configured' });
  }
  if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const op = str(body.op) || 'list';
  try {
    if (op === 'list') {
      return res.status(200).json({ items: (await listEmergencyTransmissionEpisodes()).map(publicRow) });
    }
    if (op === 'archive') {
      const id = str(body.id);
      if (!EMERGENCY_EPISODE_ID_PATTERN.test(id)) return res.status(400).json({ error: 'invalid_id' });
      return res.status(200).json({ ok: true, archived: await archiveEmergencyTransmissionEpisode(id) });
    }
    if (op !== 'save') return res.status(400).json({ error: 'unknown_op' });

    const id = str(body.id);
    const youtubeId = extractYouTubeId(body.youtubeUrl || body.youtubeId);
    const titleUk = str(body.titleUk).slice(0, 200);
    const titleEn = str(body.titleEn).slice(0, 200);
    const summaryUk = str(body.summaryUk).slice(0, 1000);
    const summaryEn = str(body.summaryEn).slice(0, 1000);
    const releaseAt = str(body.releaseAt);
    const sortOrder = Number(body.sortOrder);
    if (!EMERGENCY_EPISODE_ID_PATTERN.test(id)) return res.status(400).json({ error: 'invalid_id' });
    if (!youtubeId) return res.status(400).json({ error: 'invalid_youtube_url' });
    if (!titleUk || !titleEn || !summaryUk || !summaryEn) {
      return res.status(400).json({ error: 'missing_localized_copy' });
    }
    if (!releaseAt || Number.isNaN(Date.parse(releaseAt))) return res.status(400).json({ error: 'invalid_release_at' });

    const item = await saveEmergencyTransmissionEpisode({
      id,
      youtubeId,
      titleUk,
      titleEn,
      summaryUk,
      summaryEn,
      releaseAt: new Date(releaseAt).toISOString(),
      sortOrder: Number.isFinite(sortOrder) ? Math.round(sortOrder) : 0,
      enabled: body.enabled === true,
      published: body.published === true,
    });
    return res.status(200).json({ ok: true, item: publicRow(item) });
  } catch (error) {
    if (isMissingEmergencyTransmissionSchema(error)) {
      return res.status(503).json({ error: 'emergency_transmissions_not_deployed' });
    }
    console.error('[admin/emergency-transmissions] failed:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}
