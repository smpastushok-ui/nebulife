// Gemini TTS client (gemini-3.1-flash-tts-preview).
//
// Uses the Gemini API (not Google Cloud TTS) with prebuilt voices that work
// across all supported languages. Voices are language-agnostic — Kore, Charon,
// Aoede, Puck, Zephyr, Leda, Orus, Fenrir all sound natural in uk, en, etc.
//
// Configuration via env (with safe defaults):
//   GEMINI_TTS_MODEL          default 'gemini-3.1-flash-tts-preview'
//   GEMINI_TTS_VOICE          default 'Kore'                (used when nothing else is set)
//   GEMINI_TTS_VOICE_FEMALE   default GEMINI_TTS_VOICE → 'Kore'
//   GEMINI_TTS_VOICE_MALE     default 'Charon'
//
// Returns WAV bytes (PCM 16-bit / 24 kHz / mono wrapped with a RIFF header).

import { Buffer } from 'node:buffer';

const REQUEST_TIMEOUT_MS = 90_000;
const SAMPLE_RATE = 24_000;
const NUM_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

export type TtsLanguage = 'uk-UA' | 'en-US';
export type TtsGender = 'female' | 'male';

export interface GeminiSynthesizeRequest {
  text: string;
  /** Override voice (e.g. 'Kore', 'Charon'). Falls back to env / gender default. */
  voiceName?: string;
  /** Used to pick female/male default if voiceName isn't provided. */
  gender?: TtsGender;
}

export interface GeminiSynthesizeResult {
  /** WAV bytes ready to write to .wav or stream via HTML5 audio. */
  audio: Buffer;
  /** Voice that was actually used. */
  voiceName: string;
  /** Estimated duration in seconds. */
  durationSec: number;
  /** Always 'audio/wav' for now. */
  mimeType: string;
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not configured');
  return key;
}

function getModel(): string {
  return process.env.GEMINI_TTS_MODEL ?? 'gemini-3.1-flash-tts-preview';
}

function defaultVoiceForGender(gender: TtsGender | undefined): string {
  if (gender === 'male') {
    return process.env.GEMINI_TTS_VOICE_MALE ?? 'Charon';
  }
  return process.env.GEMINI_TTS_VOICE_FEMALE ?? process.env.GEMINI_TTS_VOICE ?? 'Kore';
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

/** Wrap raw 16-bit signed little-endian mono PCM bytes with a WAV/RIFF header. */
function pcmToWav(pcm: Buffer, sampleRate = SAMPLE_RATE, numChannels = NUM_CHANNELS, bitsPerSample = BITS_PER_SAMPLE): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcm.length;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);             // Subchunk1Size for PCM
  header.writeUInt16LE(1, 20);              // AudioFormat = PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([
    new Uint8Array(header.buffer, header.byteOffset, header.byteLength),
    new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength),
  ]);
}

interface GeminiPart {
  inlineData?: { mimeType?: string; data: string };
  text?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  error?: { code: number; message: string; status?: string };
  promptFeedback?: { blockReason?: string };
}

/** Synthesize a single chunk of text via Gemini TTS. */
async function synthesizeOnce(text: string, voiceName: string): Promise<Buffer> {
  const apiKey = getApiKey();
  const model = getModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const body = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  };

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as GeminiResponse;
  if (!res.ok) {
    const msg = json.error?.message ?? `Gemini TTS request failed: ${res.status} ${JSON.stringify(json)}`;
    throw new Error(msg);
  }
  const blockReason = json.promptFeedback?.blockReason;
  if (blockReason) throw new Error(`Gemini TTS blocked: ${blockReason}`);

  const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part?.inlineData?.data) {
    throw new Error(`Gemini TTS returned no audio data. Response: ${JSON.stringify(json).slice(0, 500)}`);
  }
  return Buffer.from(part.inlineData.data, 'base64');
}

/** Synthesize speech (single request — text must fit in one model call). */
export async function synthesizeWithGemini(req: GeminiSynthesizeRequest): Promise<GeminiSynthesizeResult> {
  const voiceName = req.voiceName ?? defaultVoiceForGender(req.gender);
  const pcm = await synthesizeOnce(req.text, voiceName);
  const audio = pcmToWav(pcm);
  // PCM 16-bit / 24kHz / mono = 48000 bytes/sec
  const durationSec = Math.round(pcm.length / (SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8)));
  return { audio, voiceName, durationSec, mimeType: 'audio/wav' };
}

/**
 * Split long text into chunks the model can handle, synthesize each,
 * concatenate the PCM bytes, and wrap with a single WAV header at the end.
 * Default 4500 bytes per chunk (UTF-8) — well under typical TTS request limits
 * and Cyrillic-safe.
 */
export async function synthesizeLongTextWithGemini(
  req: GeminiSynthesizeRequest,
  maxBytesPerChunk = 4500,
): Promise<GeminiSynthesizeResult> {
  const voiceName = req.voiceName ?? defaultVoiceForGender(req.gender);

  if (Buffer.byteLength(req.text, 'utf8') <= maxBytesPerChunk) {
    return synthesizeWithGemini({ ...req, voiceName });
  }

  // Sentence-aware splitting; hard-split on words for over-long sentences.
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

  console.log(`[Gemini TTS] Splitting ${req.text.length} chars (${Buffer.byteLength(req.text, 'utf8')} bytes) into ${chunks.length} chunks; voice=${voiceName}`);

  const pcmParts: Uint8Array[] = [];
  for (const [i, chunk] of chunks.entries()) {
    console.log(`[Gemini TTS] Chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
    const pcm = await synthesizeOnce(chunk, voiceName);
    pcmParts.push(new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength));
  }

  const combinedPcm = Buffer.concat(pcmParts);
  const audio = pcmToWav(combinedPcm);
  const durationSec = Math.round(combinedPcm.length / (SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8)));
  return { audio, voiceName, durationSec, mimeType: 'audio/wav' };
}
