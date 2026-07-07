#!/usr/bin/env node
// ---------------------------------------------------------------------------
// ASTRA onboarding voiceover generator for Nebulife.
//
// Reads scripts/onboarding-voice/texts.json (uk + en scripts with Eleven v3
// audio tags), calls the ElevenLabs Text-to-Speech API with the ASTRA voice,
// then loudness-normalizes and writes each clip as BOTH .mp3 (Safari/iOS)
// and .webm (Opus, Android) into packages/client/public/sfx/onboarding —
// the exact names AstraOnboardingModal expects: <key>_<uk|en>.(mp3|webm).
//
// Voice:  uIZsnBL0YK1S5j69bAih (Samantha — Emotional, Soft and Intimate)
// Model:  eleven_v3 (supports inline audio tags like [warm] / [excited])
// Output: mono, modest bitrate (mp3 64k / opus 48k) to keep assets small.
//
// Usage:
//   node scripts/onboarding-voice/generate.mjs                # all missing clips
//   node scripts/onboarding-voice/generate.mjs --force        # regenerate everything
//   node scripts/onboarding-voice/generate.mjs --lang uk      # one language only
//   node scripts/onboarding-voice/generate.mjs --only beacon,carriers
//   node scripts/onboarding-voice/generate.mjs --dry          # list what would run
//
// Requires: ELEVENLABS_API_KEY (env or root .env.local) and ffmpeg.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const OUT_DIR = path.join(REPO, 'packages/client/public/sfx/onboarding');

// A.S.T.R.A. voice — Samantha (Emotional, Soft and Intimate). Confirmed
// present in the ELEVENLABS_API_KEY workspace via GET /v1/voices (2026-07).
const DEFAULT_VOICE_ID = 'uIZsnBL0YK1S5j69bAih';
const MODEL_ID = 'eleven_v3';
const STABILITY = 0.5;

// ── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const FORCE = has('--force');
const DRY = has('--dry');
const LANG = val('--lang');                 // uk | en
const ONLY = (val('--only') || '').split(',').map((s) => s.trim()).filter(Boolean);
const VOICE_ID = val('--voice') || process.env.ELEVENLABS_VOICE_ASTRA || DEFAULT_VOICE_ID;

// ── Load .env.local for the API key (Node doesn't auto-load it) ──────────────
function loadEnvKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  for (const p of [path.join(REPO, '.env.local'), path.join(REPO, '.env'), path.join(REPO, 'packages/server/.env.local')]) {
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, '');
    }
  }
  return null;
}
const API_KEY = loadEnvKey();

// ── Build the task list from the manifest ────────────────────────────────────
const manifest = JSON.parse(fs.readFileSync(path.join(HERE, 'texts.json'), 'utf8'));

function buildTasks() {
  const tasks = [];
  for (const entry of manifest.entries) {
    for (const lang of ['uk', 'en']) {
      if (LANG && lang !== LANG) continue;
      if (ONLY.length > 0 && !ONLY.includes(entry.key)) continue;
      if (!entry[lang]) continue;
      tasks.push({ name: `${entry.key}_${lang}`, lang, text: entry[lang] });
    }
  }
  return tasks;
}

// ── ElevenLabs TTS call ───────────────────────────────────────────────────────
async function generateRaw(task) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(VOICE_ID)}?output_format=mp3_44100_64`;
  const body = {
    text: task.text,
    model_id: MODEL_ID,
    // Eleven v3 accepts a coarse stability setting (0 / 0.5 / 1).
    voice_settings: { stability: STABILITY },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 400)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

// ── ffmpeg: normalize loudness, force mono, keep bitrate modest ─────────────
const AF = 'highpass=f=60,loudnorm=I=-16:TP=-1.5:LRA=11';
function ffmpeg(arglist) {
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...arglist], { stdio: 'inherit' });
}
function transcode(rawPath, name) {
  const mp3 = path.join(OUT_DIR, `${name}.mp3`);
  const webm = path.join(OUT_DIR, `${name}.webm`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  ffmpeg(['-i', rawPath, '-af', AF, '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', '-ar', '44100', mp3]);
  ffmpeg(['-i', rawPath, '-af', AF, '-ac', '1', '-c:a', 'libopus', '-b:a', '48k', webm]);
  return { mp3, webm };
}

function exists(name) {
  return fs.existsSync(path.join(OUT_DIR, `${name}.mp3`)) && fs.existsSync(path.join(OUT_DIR, `${name}.webm`));
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const tasks = buildTasks();
  const pending = FORCE ? tasks : tasks.filter((t) => !exists(t.name));
  console.log(`Manifest: ${tasks.length} clip(s) selected, ${pending.length} to generate${FORCE ? ' (--force)' : ''}.`);

  if (DRY) {
    pending.forEach((t) => console.log(`  ${t.name}  (${t.text.length} chars)`));
    return;
  }
  if (!pending.length) { console.log('Nothing to do.'); return; }
  if (!API_KEY) { console.error('\nELEVENLABS_API_KEY not found (env or .env.local). Add it and rerun.'); process.exit(1); }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neb-onb-voice-'));
  let ok = 0, fail = 0;
  for (const [i, t] of pending.entries()) {
    const tag = `[${i + 1}/${pending.length}] ${t.name}`;
    try {
      process.stdout.write(`${tag} … `);
      const raw = await generateRaw(t);
      const rawPath = path.join(tmpDir, `${t.name}.mp3`);
      fs.writeFileSync(rawPath, raw);
      transcode(rawPath, t.name);
      ok++;
      console.log('done');
    } catch (err) {
      fail++;
      console.log(`FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
    // gentle pacing between API calls
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log(`\nFinished: ${ok} ok, ${fail} failed. Output: packages/client/public/sfx/onboarding`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
