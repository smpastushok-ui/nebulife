import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticate,
  getPlayer,
  createSagaChapter,
  listSagaChapters,
  hasSagaChapter,
  hasRecentSagaChapter,
  generateImageWithGemini,
  generateSagaChapterText,
  buildSagaChapterPrompt,
  parseSagaChapterResponse,
  RATE_LIMITS,
} from '@nebulife/server';
import { SAGA_MILESTONE_ORDER, type SagaMilestoneContext, type SagaMilestoneType } from '@nebulife/core';

export const config = {
  maxDuration: 60,
};

function isValidMilestoneType(value: unknown): value is SagaMilestoneType {
  return typeof value === 'string' && (SAGA_MILESTONE_ORDER as string[]).includes(value);
}

function sanitizeContext(input: unknown): SagaMilestoneContext {
  if (!input || typeof input !== 'object') return {};
  const out: SagaMilestoneContext = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value === 'string') out[key] = value.slice(0, 120);
    else if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
  }
  return out;
}

/**
 * POST /api/saga/generate-chapter
 *
 * Auth: Bearer token (Firebase)
 * Body: { milestoneType: SagaMilestoneType, context: SagaMilestoneContext }
 *
 * Writes are free (retention feature, not a paywall — see GAME_BIBLE.md
 * §0.4-bis) but capped server-side at one chapter per player per 24h
 * (SAGA_DAILY_CHAPTER_CAP) to control Gemini text+image cost, and each
 * milestone type can only ever be written once (`UNIQUE(player_id,
 * milestone_type)`, enforced by createSagaChapter's ON CONFLICT DO NOTHING).
 *
 * Returns: { status: 'ready', chapter } | { status: 'throttled' } | { status: 'already_written', chapter }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  if (!await RATE_LIMITS.sagaGenerate(auth.playerId)) {
    return res.status(429).json({ error: 'Зачекайте перед наступною спробою.' });
  }

  const milestoneType = req.body?.milestoneType;
  if (!isValidMilestoneType(milestoneType)) {
    return res.status(400).json({ error: 'Invalid or missing milestoneType' });
  }
  const context = sanitizeContext(req.body?.context);

  try {
    // Idempotent: this milestone was already written (e.g. client retried
    // after a timeout) — hand back the existing chapter instead of erroring.
    const alreadyWritten = await hasSagaChapter(auth.playerId, milestoneType);
    if (alreadyWritten) {
      const chapters = await listSagaChapters(auth.playerId);
      const existing = chapters.find((c) => c.milestone_type === milestoneType);
      if (existing) {
        return res.status(200).json({
          status: 'already_written',
          chapter: {
            id: existing.id,
            milestoneType: existing.milestone_type,
            title: existing.title,
            bodyText: existing.body_text,
            imageUrl: existing.image_url,
            language: existing.language,
            createdAt: existing.created_at,
          },
        });
      }
    }

    // Daily cost-control cap — independent of which milestone this is.
    if (await hasRecentSagaChapter(auth.playerId)) {
      return res.status(200).json({ status: 'throttled' });
    }

    const player = await getPlayer(auth.playerId);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const lang: 'uk' | 'en' = player.preferred_language === 'en' ? 'en' : 'uk';
    const callsign = player.callsign ?? player.name ?? 'Commander';

    const { textPrompt, illustrationPrompt } = buildSagaChapterPrompt(milestoneType, context, callsign, lang);

    const [rawText, image] = await Promise.all([
      generateSagaChapterText(textPrompt),
      generateImageWithGemini({
        prompt: illustrationPrompt,
        aspectRatio: '3:4',
        imageSize: '1K',
        uploadPrefix: 'saga-chapters',
      }).catch((err) => {
        console.error('[saga/generate-chapter] illustration failed:', err);
        return null;
      }),
    ]);

    const { title, body } = parseSagaChapterResponse(rawText, lang);

    const chapterId = `saga_${auth.playerId}_${milestoneType}_${Date.now()}`;
    const chapter = await createSagaChapter({
      id: chapterId,
      playerId: auth.playerId,
      milestoneType,
      title,
      bodyText: body,
      imageUrl: image?.imageUrl ?? null,
      language: lang,
    });

    return res.status(200).json({
      status: 'ready',
      chapter: {
        id: chapter.id,
        milestoneType: chapter.milestone_type,
        title: chapter.title,
        bodyText: chapter.body_text,
        imageUrl: chapter.image_url,
        language: chapter.language,
        createdAt: chapter.created_at,
      },
    });
  } catch (err) {
    console.error('[saga/generate-chapter] Error:', err);
    const message = err instanceof Error ? err.message : 'Saga chapter generation failed';
    const isConfigError = message.includes('GEMINI_API_KEY');
    const isDbMigrationError = message.includes('saga_chapters') || message.includes('relation') || message.includes('does not exist');
    return res.status(isConfigError || isDbMigrationError ? 503 : 500).json({
      error: isConfigError
        ? 'Saga generation is not configured on the server'
        : isDbMigrationError
          ? 'Saga chapters database migration is not installed'
          : 'Saga chapter generation failed',
    });
  }
}
