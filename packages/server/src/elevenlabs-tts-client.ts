// ElevenLabs Text-to-Speech client.
//
// Uses the ElevenLabs streaming TTS API to synthesize natural-sounding
// narration. Streaming avoids Vercel's serverless function timeout that
// blocked Gemini TTS for long texts (10K+ chars).
//
// Configuration via env:
//   ELEVENLABS_API_KEY     — API key from elevenlabs.io with Text-to-Speech +
//                            Voices(Read) scopes
//   ELEVENLABS_VOICE_ASTRA — voice id for the A.S.T.R.A. narrator (female).
//                            If unset, falls back to 'EXAVITQu4vr4xnSDxMaL'
//                            (Sarah — multilingual, calm narrator).
//   ELEVENLABS_MODEL       — model id. Default 'eleven_multilingual_v2'.
//
// Returns MP3 bytes (mp3_44100_128 — 44.1 kHz, 128 kbps stereo).

import { Buffer } from 'node:buffer';

const REQUEST_TIMEOUT_MS = 180_000; // ElevenLabs streams; long text can take ~1 min
const MAX_CHARS_PER_REQUEST = 4500; // Per-request character cap; chunks above are split

/** Default voice — Sarah, ElevenLabs library, multilingual female narrator. */
const DEFAULT_VOICE_ASTRA = 'EXAVITQu4vr4xnSDxMaL';
const DEFAULT_MODEL = 'eleven_multilingual_v2';

export interface ElevenLabsSynthesizeRequest {
  text: string;
  /** Override voice id. Falls back to env / default. */
  voiceId?: string;
  /** Override model. Falls back to env / default. */
  modelId?: string;
  /** Voice settings (stability/similarity/style/speaker boost). Optional. */
  voiceSettings?: {
    stability?: number;       // 0..1 — how consistent the voice is across reads
    similarity_boost?: number; // 0..1 — how closely to follow the original voice
    style?: number;            // 0..1 — only used by some models
    use_speaker_boost?: boolean;
  };
}

export interface ElevenLabsSynthesizeResult {
  /** MP3 bytes, ready to write to .mp3 / stream via HTML5 audio. */
  audio: Buffer;
  voiceId: string;
  modelId: string;
  /** Estimated duration in seconds (4 KB ≈ 1s for 128kbps mono speech). */
  durationSec: number;
  /** Always 'audio/mpeg'. */
  mimeType: string;
}

function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY is not configured');
  return key;
}

function defaultVoiceId(): string {
  return process.env.ELEVENLABS_VOICE_ASTRA ?? DEFAULT_VOICE_ASTRA;
}

function defaultModelId(): string {
  return process.env.ELEVENLABS_MODEL ?? DEFAULT_MODEL;
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

/** Synthesize a single chunk via ElevenLabs streaming endpoint. */
async function synthesizeOnce(
  text: string,
  voiceId: string,
  modelId: string,
  voiceSettings: ElevenLabsSynthesizeRequest['voiceSettings'],
): Promise<Buffer> {
  const apiKey = getApiKey();
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`;

  const body = {
    text,
    model_id: modelId,
    voice_settings: voiceSettings ?? {
      stability: 0.5,
      similarity_boost: 0.85,
      style: 0.15,
      use_speaker_boost: true,
    },
  };

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`ElevenLabs TTS failed: ${res.status} ${errText.slice(0, 500)}`);
  }

  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

/** Synthesize speech (single request — text must fit MAX_CHARS_PER_REQUEST). */
export async function synthesizeWithElevenLabs(
  req: ElevenLabsSynthesizeRequest,
): Promise<ElevenLabsSynthesizeResult> {
  const voiceId = req.voiceId ?? defaultVoiceId();
  const modelId = req.modelId ?? defaultModelId();
  const audio = await synthesizeOnce(req.text, voiceId, modelId, req.voiceSettings);
  // mp3 128 kbps mono = 16 KB/s ≈ 1 sec per ~16 KB.
  const durationSec = Math.round(audio.length / 16_000);
  return { audio, voiceId, modelId, durationSec, mimeType: 'audio/mpeg' };
}

/**
 * Split long text into chunks that fit MAX_CHARS_PER_REQUEST, synthesize each
 * via streaming, and concatenate the MP3 byte streams. MP3 frames are
 * independent so a simple Buffer.concat produces a single playable file.
 */
export async function synthesizeLongTextWithElevenLabs(
  req: ElevenLabsSynthesizeRequest,
  maxBytesPerChunk = MAX_CHARS_PER_REQUEST,
): Promise<ElevenLabsSynthesizeResult> {
  const voiceId = req.voiceId ?? defaultVoiceId();
  const modelId = req.modelId ?? defaultModelId();

  if (Buffer.byteLength(req.text, 'utf8') <= maxBytesPerChunk) {
    return synthesizeWithElevenLabs({ ...req, voiceId, modelId });
  }

  // Sentence-aware splitting (Cyrillic-safe via byte-length checks).
  const chunks: string[] = [];
  let buf = '';
  const sentences = req.text.split(/(?<=[.!?])\s+|(?<=\n)\s*/);
  for (const sentence of sentences) {
    const candidate = buf + (buf ? ' ' : '') + sentence;
    if (Buffer.byteLength(candidate, 'utf8') > maxBytesPerChunk) {
      if (buf) chunks.push(buf);
      buf = sentence;
      if (Buffer.byteLength(buf, 'utf8') > maxBytesPerChunk) {
        const words = buf.split(/\s+/);
        let wbuf = '';
        for (const w of words) {
          const c = wbuf + (wbuf ? ' ' : '') + w;
          if (Buffer.byteLength(c, 'utf8') > maxBytesPerChunk) {
            if (wbuf) chunks.push(wbuf);
            wbuf = w;
          } else {
            wbuf = c;
          }
        }
        buf = wbuf;
      }
    } else {
      buf = candidate;
    }
  }
  if (buf) chunks.push(buf);

  console.log(`[ElevenLabs] Splitting ${req.text.length} chars (${Buffer.byteLength(req.text, 'utf8')} bytes) into ${chunks.length} chunks; voice=${voiceId} model=${modelId}`);

  const parts: Uint8Array[] = [];
  let totalDur = 0;
  for (const [i, chunk] of chunks.entries()) {
    console.log(`[ElevenLabs] Chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
    const audio = await synthesizeOnce(chunk, voiceId, modelId, req.voiceSettings);
    parts.push(new Uint8Array(audio.buffer, audio.byteOffset, audio.byteLength));
    totalDur += Math.round(audio.length / 16_000);
  }

  const combined = Buffer.concat(parts);
  return { audio: combined, voiceId, modelId, durationSec: totalDur, mimeType: 'audio/mpeg' };
}
