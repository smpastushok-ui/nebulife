#!/usr/bin/env node
// ---------------------------------------------------------------------------
// ElevenLabs Sound Effects generator for Nebulife.
//
// Reads scripts/sfx/prompts.json, calls the ElevenLabs Sound Effects API
// (POST /v1/sound-generation), then loudness-normalizes (~-16 LUFS) and writes
// each sound as BOTH .mp3 (Safari/iOS fallback) and .webm (Opus) into
// packages/client/public/sfx — the exact names the game expects.
//
// Usage:
//   node scripts/sfx/generate.mjs                 # all missing sounds
//   node scripts/sfx/generate.mjs --force         # regenerate everything
//   node scripts/sfx/generate.mjs --group signals # only one group
//   node scripts/sfx/generate.mjs --only signal-common-1,intro-bigbang
//   node scripts/sfx/generate.mjs --dry           # list what would run, no API calls
//   node scripts/sfx/generate.mjs --reprocess     # re-apply audio chain to existing files (no API)
//
// Requires: ELEVENLABS_API_KEY (read from env or root .env.local) and ffmpeg.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');

// ── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const FORCE = has('--force');
const DRY = has('--dry');
const REPROCESS = has('--reprocess');       // re-apply the audio chain to existing files (no API)
const GROUP = val('--group');               // signals | noises | intro
const ONLY = (val('--only') || '').split(',').map((s) => s.trim()).filter(Boolean);
const PROMPT_OVERRIDE = val('--prompt');     // override prompt for the selected task(s) (re-rolls)

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
const SFX_URL = 'https://api.elevenlabs.io/v1/sound-generation';

// ── Build the task list from the manifest ────────────────────────────────────
const manifest = JSON.parse(fs.readFileSync(path.join(HERE, 'prompts.json'), 'utf8'));
const OUT_DIR = path.join(REPO, manifest.outDir);
const D = manifest.defaults;

function buildTasks() {
  const tasks = [];
  // signals: <rarity> x N variants
  const sg = manifest.signals;
  for (const [rarity, prompt] of Object.entries(sg.rarities)) {
    if (rarity.startsWith('_')) continue;
    for (let v = 1; v <= sg.variants; v++) {
      tasks.push({
        group: 'signals',
        name: `signal-${rarity}-${v}`,
        prompt: `${prompt} (take ${v})`,
        duration: sg.duration,
        loop: sg.loop,
      });
    }
  }
  // noises
  for (const n of manifest.noises.list) {
    tasks.push({ group: 'noises', name: n.name, prompt: n.prompt, duration: manifest.noises.duration, loop: manifest.noises.loop });
  }
  // intro
  for (const s of manifest.intro.list) {
    tasks.push({ group: 'intro', name: s.name, prompt: s.prompt, duration: s.duration, loop: s.loop });
  }
  return tasks
    .filter((t) => !GROUP || t.group === GROUP)
    .filter((t) => ONLY.length === 0 || ONLY.includes(t.name))
    .map((t) => (PROMPT_OVERRIDE ? { ...t, prompt: PROMPT_OVERRIDE } : t));
}

// ── ElevenLabs call ───────────────────────────────────────────────────────────
async function generateRaw(task) {
  const url = `${SFX_URL}?output_format=${encodeURIComponent(D.outputFormat)}`;
  const body = {
    text: task.prompt,
    // loop is only supported on the v2 sound model — pin it explicitly.
    model_id: 'eleven_text_to_sound_v2',
    prompt_influence: D.promptInfluence,
    loop: !!task.loop,
  };
  if (task.duration) body.duration_seconds = Math.min(30, Math.max(0.5, task.duration));

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 400)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

// ── ffmpeg: de-digitize + spatialize, then loudness-normalize ─────────────────
//
// ElevenLabs output is dry, mono and harsh ("digital"). This chain warms it up
// and gives it room/depth so it sits in the cosmic mix:
//   highpass/lowpass  — trim subsonic mud + the brittle ultra-highs
//   equalizer -3dB    — tame the harsh upper-mids that read as "digital"
//   equalizer +warmth — add low-mid body
//   aecho             — small-room early reflections → sense of 3D space/volume
//   asoftclip tanh    — gentle analog-style saturation, rounds the digital edge
//   loudnorm          — consistent ~-16 LUFS, applied last
const SPATIAL = [
  'highpass=f=30',
  'lowpass=f=17000',
  'equalizer=f=3400:t=q:w=2.0:g=-3',
  'equalizer=f=140:t=q:w=1.0:g=2.5',
  'aecho=0.85:0.8:37|59|97|149:0.3|0.22|0.15|0.09',
  'asoftclip=type=tanh',
].join(',');
const LOUDNORM = `loudnorm=I=${D.loudnessLUFS}:TP=-1.5:LRA=11`;
const AF = `${SPATIAL},${LOUDNORM}`;
function ffmpeg(arglist) {
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...arglist], { stdio: 'inherit' });
}
function transcode(rawPath, name) {
  const mp3 = path.join(OUT_DIR, `${name}.mp3`);
  const webm = path.join(OUT_DIR, `${name}.webm`);
  ffmpeg(['-i', rawPath, '-af', AF, '-c:a', 'libmp3lame', '-q:a', '4', '-ar', '44100', mp3]);
  ffmpeg(['-i', rawPath, '-af', AF, '-c:a', 'libopus', '-b:a', '96k', webm]);
  return { mp3, webm };
}

function exists(name) {
  return fs.existsSync(path.join(OUT_DIR, `${name}.mp3`)) && fs.existsSync(path.join(OUT_DIR, `${name}.webm`));
}

// ── Reprocess existing files in place (apply the new audio chain, no API) ─────
function reprocessExisting() {
  const tasks = buildTasks().filter((t) => exists(t.name));
  console.log(`Reprocess: ${tasks.length} existing sound(s) → de-digitize + spatialize.`);
  if (DRY) { tasks.forEach((t) => console.log(`  [${t.group}] ${t.name}`)); return; }
  if (!tasks.length) { console.log('Nothing to reprocess.'); return; }
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neb-sfx-re-'));
  let ok = 0, fail = 0;
  for (const [i, t] of tasks.entries()) {
    process.stdout.write(`[${i + 1}/${tasks.length}] ${t.name} … `);
    try {
      // Use the current .mp3 as the source, copied aside so we don't read+write
      // the same path. Filtering is applied exactly once.
      const src = path.join(tmpDir, `${t.name}.mp3`);
      fs.copyFileSync(path.join(OUT_DIR, `${t.name}.mp3`), src);
      transcode(src, t.name);
      ok++; console.log('done');
    } catch (err) {
      fail++; console.log(`FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log(`\nReprocessed: ${ok} ok, ${fail} failed. Output: ${manifest.outDir}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (REPROCESS) { reprocessExisting(); return; }
  const tasks = buildTasks();
  const pending = FORCE ? tasks : tasks.filter((t) => !exists(t.name));
  console.log(`Manifest: ${tasks.length} sound(s) selected, ${pending.length} to generate${FORCE ? ' (--force)' : ''}.`);
  const byGroup = pending.reduce((a, t) => ((a[t.group] = (a[t.group] || 0) + 1), a), {});
  console.log('  by group:', JSON.stringify(byGroup));

  if (DRY) {
    pending.forEach((t) => console.log(`  [${t.group}] ${t.name}  (${t.duration}s${t.loop ? ', loop' : ''})`));
    return;
  }
  if (!pending.length) { console.log('Nothing to do.'); return; }
  if (!API_KEY) { console.error('\nELEVENLABS_API_KEY not found (env or .env.local). Add it and rerun.'); process.exit(1); }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neb-sfx-'));
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
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log(`\nFinished: ${ok} ok, ${fail} failed. Output: ${manifest.outDir}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
