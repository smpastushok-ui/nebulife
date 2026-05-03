// Google Cloud Text-to-Speech client.
//
// Authenticates via service account JWT (reuses GOOGLE_PRIVATE_KEY +
// GOOGLE_CLIENT_EMAIL set up for the leads-writer service account; that
// account needs `roles/cloudtts.client` granted in GCP IAM and the
// `texttospeech.googleapis.com` scope below).
//
// Returns MP3 bytes which the caller can upload to Vercel Blob.

import crypto from 'node:crypto';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const GOOGLE_TTS_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const REQUEST_TIMEOUT_MS = 60_000; // TTS can be slow for long inputs

export type TtsLanguage = 'uk-UA' | 'en-US';
export type TtsGender = 'female' | 'male';

/** Default voice names — Chirp3 HD (highest quality, GA since 2024). */
const DEFAULT_VOICES: Record<TtsLanguage, Record<TtsGender, string>> = {
  'uk-UA': {
    female: 'uk-UA-Chirp3-HD-Leda',
    male: 'uk-UA-Chirp3-HD-Charon',
  },
  'en-US': {
    female: 'en-US-Chirp3-HD-Leda',
    male: 'en-US-Chirp3-HD-Charon',
  },
};

/** Fallback voices if Chirp3 HD isn't available in the project's region. */
const FALLBACK_VOICES: Record<TtsLanguage, Record<TtsGender, string>> = {
  'uk-UA': {
    female: 'uk-UA-Wavenet-A',
    male: 'uk-UA-Wavenet-A', // No standard male Ukrainian voice; uses female
  },
  'en-US': {
    female: 'en-US-Wavenet-F',
    male: 'en-US-Wavenet-D',
  },
};

export interface SynthesizeRequest {
  /** Plain text or SSML (auto-detected by leading `<speak>`). Max ~5000 chars per request. */
  text: string;
  language: TtsLanguage;
  gender: TtsGender;
  /** Override default voice if needed. */
  voiceName?: string;
  /** Speaking rate 0.25–4.0. Default 1.0. */
  speakingRate?: number;
  /** Pitch -20.0 to 20.0 semitones. Default 0. */
  pitch?: number;
}

export interface SynthesizeResult {
  /** Raw MP3 bytes. */
  audio: Buffer;
  /** Voice that was actually used (after fallback). */
  voiceName: string;
  /** Estimated duration in seconds based on byte count + bitrate. */
  durationSec: number;
}

function toBase64Url(input: string | Buffer): string {
  return (Buffer.isBuffer(input) ? input : Buffer.from(input)).toString('base64url');
}

function getPrivateKey(): string {
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!key) throw new Error('GOOGLE_PRIVATE_KEY is not configured');
  return key.replace(/\\n/g, '\n');
}

function getClientEmail(): string {
  return (
    process.env.GOOGLE_CLIENT_EMAIL ??
    'nebulife-leads-writer@nebulife-403f1.iam.gserviceaccount.com'
  );
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/** Generate a short-lived OAuth token from the service account JWT. */
async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = toBase64Url(
    JSON.stringify({
      iss: getClientEmail(),
      scope: GOOGLE_TTS_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsignedToken = `${header}.${payload}`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(unsignedToken)
    .sign(getPrivateKey())
    .toString('base64url');

  const tokenRes = await fetchWithTimeout(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsignedToken}.${signature}`,
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new Error(`Google OAuth token request failed: ${tokenRes.status} ${body}`);
  }
  const data = (await tokenRes.json()) as { access_token: string };
  if (!data.access_token) throw new Error('Google OAuth response missing access_token');
  return data.access_token;
}

interface TtsApiResponse {
  audioContent: string; // base64-encoded MP3
}

interface TtsApiError {
  error?: { code: number; message: string; status: string };
}

/** Synthesize speech once with a given voice (no fallback handling here). */
async function synthesizeOnce(
  req: SynthesizeRequest,
  voiceName: string,
  accessToken: string,
): Promise<Buffer> {
  const isSSML = req.text.trim().startsWith('<speak');
  const body = {
    input: isSSML ? { ssml: req.text } : { text: req.text },
    voice: {
      languageCode: req.language,
      name: voiceName,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: req.speakingRate ?? 1.0,
      pitch: req.pitch ?? 0,
      sampleRateHertz: 24000,
    },
  };

  const res = await fetchWithTimeout(GOOGLE_TTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as TtsApiResponse & TtsApiError;
  if (!res.ok || !json.audioContent) {
    const errMsg =
      json.error?.message ?? `Google TTS request failed: ${res.status} ${JSON.stringify(json)}`;
    throw new Error(errMsg);
  }
  return Buffer.from(json.audioContent, 'base64');
}

/**
 * Synthesize speech with automatic voice fallback.
 * Tries the requested (or default) voice first; on "voice not found" or 400
 * errors, falls back to the corresponding Wavenet/Standard voice.
 */
export async function synthesizeSpeech(req: SynthesizeRequest): Promise<SynthesizeResult> {
  const accessToken = await getAccessToken();
  const primary = req.voiceName ?? DEFAULT_VOICES[req.language][req.gender];
  const fallback = FALLBACK_VOICES[req.language][req.gender];

  let audio: Buffer;
  let voiceUsed = primary;
  try {
    audio = await synthesizeOnce(req, primary, accessToken);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Common failures: "Voice ... does not exist" or "INVALID_ARGUMENT"
    if (
      msg.includes('does not exist') ||
      msg.includes('INVALID_ARGUMENT') ||
      msg.includes('NOT_FOUND') ||
      msg.includes('400')
    ) {
      console.log(`[TTS] Primary voice ${primary} failed; trying fallback ${fallback}`);
      audio = await synthesizeOnce(req, fallback, accessToken);
      voiceUsed = fallback;
    } else {
      throw err;
    }
  }

  // Estimate MP3 duration: at 24kHz mono ~32 kbps, ~4 KB/s.
  const durationSec = Math.round(audio.length / 4000);

  return { audio, voiceName: voiceUsed, durationSec };
}

/**
 * Split long text into chunks that fit Google TTS's 5000-char limit per request,
 * synthesize each chunk, and concatenate the MP3 bytes.
 *
 * Splits on sentence boundaries (. ! ? \n) to avoid mid-word cuts. The MP3
 * concatenation works because MP3 is a stream of independent frames.
 */
export async function synthesizeLongText(
  req: SynthesizeRequest,
  maxCharsPerChunk = 4500,
): Promise<SynthesizeResult> {
  if (req.text.length <= maxCharsPerChunk) {
    return synthesizeSpeech(req);
  }

  const chunks: string[] = [];
  let buf = '';
  // Sentence-aware splitting
  const sentences = req.text.split(/(?<=[.!?])\s+|(?<=\n)\s*/);
  for (const sentence of sentences) {
    if ((buf + sentence).length > maxCharsPerChunk) {
      if (buf) chunks.push(buf);
      buf = sentence;
    } else {
      buf += (buf ? ' ' : '') + sentence;
    }
  }
  if (buf) chunks.push(buf);

  console.log(`[TTS] Splitting ${req.text.length} chars into ${chunks.length} chunks`);

  // Use Uint8Array view to avoid TS strictness around `Buffer<ArrayBufferLike>`
  // vs `Uint8Array<ArrayBuffer>` mismatch in newer @types/node.
  const parts: Uint8Array[] = [];
  let voiceUsed = '';
  let totalDur = 0;
  for (const [i, chunk] of chunks.entries()) {
    console.log(`[TTS] Synthesizing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
    const result = await synthesizeSpeech({ ...req, text: chunk });
    parts.push(new Uint8Array(result.audio.buffer, result.audio.byteOffset, result.audio.byteLength));
    voiceUsed = result.voiceName;
    totalDur += result.durationSec;
  }
  const combined = Buffer.concat(parts);

  return { audio: combined, voiceName: voiceUsed, durationSec: totalDur };
}
