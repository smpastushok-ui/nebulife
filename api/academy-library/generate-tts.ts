// Server-side TTS generator for Encyclopedia lessons.
//
// Called by `scripts/encyclopedia-build-remote.ts` (the local script can't
// authenticate to Google Cloud TTS because GOOGLE_PRIVATE_KEY is marked as
// `Sensitive` in Vercel and isn't exported by `vercel env pull`). This
// endpoint runs inside Vercel Functions where the env var is resolvable.
//
// Auth: requires header `x-academy-build-key` matching env BUILD_API_KEY
// (one-off bearer for content build operations).
//
// Body: { slug, language, gender, text }
// Response: { url, voiceName, durationSec }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { synthesizeLongText } from '@nebulife/server';

const MAX_TEXT_CHARS = 50_000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // Auth — simple shared secret, set BUILD_API_KEY in Vercel env
  const expectedKey = process.env.BUILD_API_KEY;
  const providedKey = req.headers['x-academy-build-key'];
  if (!expectedKey) {
    return res.status(500).json({ error: 'BUILD_API_KEY not configured on server' });
  }
  if (providedKey !== expectedKey) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const body = req.body as {
    slug?: string;
    language?: 'uk' | 'en';
    gender?: 'female' | 'male';
    text?: string;
  };

  const slug = body.slug?.trim();
  const language = body.language;
  const gender = body.gender;
  const text = body.text?.trim();

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ error: 'invalid slug' });
  }
  if (language !== 'uk' && language !== 'en') {
    return res.status(400).json({ error: 'invalid language' });
  }
  if (gender !== 'female' && gender !== 'male') {
    return res.status(400).json({ error: 'invalid gender' });
  }
  if (!text || text.length > MAX_TEXT_CHARS) {
    return res.status(400).json({ error: `text required, max ${MAX_TEXT_CHARS} chars` });
  }

  try {
    const langCode = language === 'uk' ? 'uk-UA' : 'en-US';
    const result = await synthesizeLongText({
      text,
      language: langCode,
      gender,
    });

    const blob = await put(
      `academy/audio/${slug}.${language}.${gender}.mp3`,
      result.audio,
      {
        access: 'public',
        contentType: 'audio/mpeg',
        addRandomSuffix: false,
        allowOverwrite: true,
      },
    );

    return res.status(200).json({
      url: blob.url,
      voiceName: result.voiceName,
      durationSec: result.durationSec,
      bytes: result.audio.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[academy-library/generate-tts] failed:', msg);
    return res.status(500).json({ error: msg });
  }
}
