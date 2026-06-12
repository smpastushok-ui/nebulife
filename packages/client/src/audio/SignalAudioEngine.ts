// ---------------------------------------------------------------------------
// SignalAudioEngine — live audio for the Signal Decoder minigame.
//
// The "true" signal is a 5s looping sound (rarity-based: cosmic background,
// pulsar, magnetospheric chorus, supernova, voices). On top of it each of the
// 4 secret code slots adds a noise layer determined by its symbol — every
// symbol is a distinct interference type (hiss, crackle, rumble, beeps,
// warble, buzz). When the player locks a slot (exact guess) that slot's noise
// layer fades out and the base signal gets 25% louder, so the transmission
// audibly "decodes" as the puzzle is solved.
//
// Real recordings can replace the procedural base: drop
// /public/sfx/signal-<rarity>-1.(webm|mp3) and they are picked up
// automatically; until then everything is synthesized deterministically from
// the round seed (one seed -> identical sound).
// ---------------------------------------------------------------------------

export type SignalRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const SIGNAL_RARITIES: SignalRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

/** Weighted rarity roll from a 0..99 hash value: 50/25/15/7/3. */
export function rollSignalRarity(hash100: number): SignalRarity {
  const v = ((hash100 % 100) + 100) % 100;
  if (v < 50) return 'common';
  if (v < 75) return 'uncommon';
  if (v < 90) return 'rare';
  if (v < 97) return 'epic';
  return 'legendary';
}

const BASE_LOOP_SEC = 5;
const NOISE_LOOP_SEC = 4;
// Volume ramp (fraction of the melody, 0..1):
//   0 solved -> 0   (silent base, only interference is audible)
//   each solved symbol -> +0.10 and that symbol's interference is removed
//   3 solved -> 0.30
//   4 solved (win) -> 1.0 + reveal animation
const BASE_START_GAIN = 0;
const BASE_GAIN_PER_SOLVE = 0.1;
const BASE_WIN_GAIN = 1.0;
const NOISE_LAYER_GAIN = 0.55;
const MASTER_GAIN = 0.55;

function lcg(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Short fade at buffer edges so the loop seam doesn't click. */
function deClick(d: Float32Array, sr: number): void {
  const n = Math.floor(sr * 0.04);
  for (let i = 0; i < n && i < d.length; i++) {
    const k = i / n;
    d[i] *= k;
    d[d.length - 1 - i] *= k;
  }
}

// ── Procedural base signal per rarity ───────────────────────────────────────

function genBase(rarity: SignalRarity, sr: number, rng: () => number): Float32Array {
  const len = Math.floor(sr * BASE_LOOP_SEC);
  const d = new Float32Array(len);

  if (rarity === 'common') {
    // Cosmic background: low drone + slow breathing pad
    let lp = 0;
    const f0 = 52 + rng() * 14;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      lp += 0.018 * ((rng() - 0.5) * 2 - lp);
      const breathe = 0.6 + 0.4 * Math.sin(2 * Math.PI * 0.11 * t);
      d[i] = (0.3 * Math.sin(2 * Math.PI * f0 * t + 0.6 * Math.sin(2 * Math.PI * 0.13 * t)) + lp * 2.2) * breathe;
    }
  } else if (rarity === 'uncommon') {
    // Pulsar: strictly periodic pings over a faint floor
    const period = 0.55 + rng() * 0.25;
    const pingF = 540 + rng() * 260;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const tp = t % period;
      let v = 0.03 * (rng() - 0.5);
      if (tp < 0.09) {
        v += Math.sin(2 * Math.PI * pingF * tp) * Math.exp(-tp * 55) * 0.85;
      }
      d[i] = v + 0.12 * Math.sin(2 * Math.PI * 60 * t);
    }
  } else if (rarity === 'rare') {
    // Magnetospheric chorus: descending "whistler" sweeps
    const sweeps: Array<{ start: number; dur: number; f1: number; f2: number }> = [];
    let cursor = 0.1;
    while (cursor < BASE_LOOP_SEC - 0.8) {
      sweeps.push({ start: cursor, dur: 0.6 + rng() * 0.5, f1: 2200 + rng() * 1200, f2: 180 + rng() * 220 });
      cursor += 0.5 + rng() * 0.9;
    }
    const phases = new Float32Array(sweeps.length);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      let v = 0.04 * (rng() - 0.5) + 0.1 * Math.sin(2 * Math.PI * 48 * t);
      for (let s = 0; s < sweeps.length; s++) {
        const sw = sweeps[s];
        const k = (t - sw.start) / sw.dur;
        if (k >= 0 && k <= 1) {
          const f = sw.f1 * Math.pow(sw.f2 / sw.f1, k);
          phases[s] += (2 * Math.PI * f) / sr;
          v += Math.sin(phases[s]) * Math.sin(Math.PI * k) * 0.42;
        }
      }
      d[i] = v;
    }
  } else if (rarity === 'epic') {
    // Supernova: brown-noise rumble swelling into a mid-loop shock
    let brown = 0;
    const peak = 1.6 + rng() * 1.6;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      brown = (brown + 0.045 * (rng() - 0.5) * 2) * 0.997;
      const dist = Math.abs(t - peak);
      const swell = 0.45 + 0.55 * Math.exp(-dist * dist * 1.4);
      let v = brown * 6 * swell;
      if (dist < 0.5 && rng() < 0.004) v += (rng() - 0.5) * 1.2; // sparks
      d[i] = Math.tanh(v);
    }
  } else {
    // Legendary "voices": wandering formant-like harmonics + whisper
    let f0 = 140 + rng() * 60;
    let target = f0;
    let phase = 0;
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      if (i % Math.floor(sr * 0.45) === 0) target = 110 + rng() * 130;
      f0 += (target - f0) * (3 / sr) * 60;
      phase += (2 * Math.PI * f0) / sr;
      const vowel = 0.55 + 0.45 * Math.sin(2 * Math.PI * (0.35 + 0.2 * Math.sin(2 * Math.PI * 0.07 * t)) * t);
      lp += 0.06 * ((rng() - 0.5) * 2 - lp);
      d[i] = (Math.sin(phase) * 0.4 + Math.sin(phase * 2) * 0.22 + Math.sin(phase * 3.02) * 0.12) * vowel
        + lp * 0.9;
    }
  }

  deClick(d, sr);
  return d;
}

// ── Procedural interference per symbol (α β γ δ ε ζ) ────────────────────────

function genNoise(symbol: number, sr: number, rng: () => number): Float32Array {
  const len = Math.floor(sr * NOISE_LOOP_SEC);
  const d = new Float32Array(len);

  switch (symbol % 6) {
    case 0: { // α — static hiss (high-passed white noise)
      let prev = 0;
      for (let i = 0; i < len; i++) {
        const w = (rng() - 0.5) * 2;
        d[i] = (w - prev) * 0.5;
        prev = w;
      }
      break;
    }
    case 1: { // β — crackle (sparse decaying impulses)
      let env = 0;
      for (let i = 0; i < len; i++) {
        if (rng() < 0.0035) env = 0.6 + rng() * 0.5;
        env *= 0.994;
        d[i] = (rng() - 0.5) * 2 * env;
      }
      break;
    }
    case 2: { // γ — deep rumble (low-passed noise, soft-clipped)
      let lp = 0;
      for (let i = 0; i < len; i++) {
        lp += 0.012 * ((rng() - 0.5) * 2 - lp);
        d[i] = Math.tanh(lp * 9) * 0.8;
      }
      break;
    }
    case 3: { // δ — beeping interference (gated tone bursts)
      const f = 980 + rng() * 240;
      const seg = Math.floor(sr * 0.16);
      let on = false;
      for (let i = 0; i < len; i++) {
        if (i % seg === 0) on = rng() < 0.42;
        d[i] = on ? Math.sin((2 * Math.PI * f * i) / sr) * 0.42 : 0;
      }
      break;
    }
    case 4: { // ε — warbling whine (vibrato tone)
      let phase = 0;
      const fc = 420 + rng() * 160;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const f = fc + Math.sin(2 * Math.PI * (4 + rng() * 0.01) * t) * 130;
        phase += (2 * Math.PI * f) / sr;
        d[i] = (Math.sin(phase) * 0.35 + Math.sin(phase * 2) * 0.12);
      }
      break;
    }
    default: { // ζ — harsh buzz (tremolo square)
      const f = 84 + rng() * 30;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const sq = Math.sign(Math.sin(2 * Math.PI * f * t));
        d[i] = sq * 0.3 * (0.55 + 0.45 * Math.sin(2 * Math.PI * 7 * t));
      }
      break;
    }
  }

  deClick(d, sr);
  return d;
}

// ── Optional real recordings ────────────────────────────────────────────────

async function tryLoadRealBase(ctx: AudioContext, rarity: SignalRarity): Promise<AudioBuffer | null> {
  for (const ext of ['webm', 'mp3']) {
    try {
      const res = await fetch(`/sfx/signal-${rarity}-1.${ext}`);
      const type = (res.headers.get('content-type') || '').toLowerCase();
      // dev server returns the SPA index.html (200) for missing files
      if (!res.ok || type.includes('text/html')) continue;
      const raw = await res.arrayBuffer();
      return await ctx.decodeAudioData(raw);
    } catch { /* try next ext / fall back to procedural */ }
  }
  return null;
}

// ── Engine ──────────────────────────────────────────────────────────────────

interface NoiseLayer {
  source: AudioBufferSourceNode;
  gain: GainNode;
  active: boolean;
}

export class SignalAudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private baseGain: GainNode | null = null;
  private layers: NoiseLayer[] = [];
  private stopped = false;
  private mutedFlag = false;
  private solvedCount = 0;
  private onVisibility = () => {
    if (!this.ctx) return;
    if (document.visibilityState === 'hidden') void this.ctx.suspend().catch(() => {});
    else if (!this.stopped) void this.ctx.resume().catch(() => {});
  };

  /** Build the audio graph and start playback. `code` are the 4 secret
   *  symbols (each adds its interference layer). */
  async start(code: number[], rarity: SignalRarity, seedNum: number): Promise<void> {
    try {
      const ctx = new AudioContext();
      this.ctx = ctx;
      void ctx.resume().catch(() => {});
      // Autoplay policy: if still suspended, retry on the next user gesture
      if (ctx.state === 'suspended') {
        const unlock = () => {
          if (!this.stopped) void ctx.resume().catch(() => {});
          document.removeEventListener('pointerdown', unlock, true);
        };
        document.addEventListener('pointerdown', unlock, true);
      }

      const master = ctx.createGain();
      master.gain.value = this.mutedFlag ? 0 : MASTER_GAIN;
      master.connect(ctx.destination);
      this.master = master;

      // Base signal: real file if present, procedural otherwise
      const sr = ctx.sampleRate;
      let baseBuffer = await tryLoadRealBase(ctx, rarity);
      if (this.stopped) { this.teardown(); return; }
      if (!baseBuffer) {
        const data = genBase(rarity, sr, lcg(seedNum));
        baseBuffer = ctx.createBuffer(1, data.length, sr);
        baseBuffer.getChannelData(0).set(data);
      }
      const baseGain = ctx.createGain();
      baseGain.gain.value = BASE_START_GAIN;
      baseGain.connect(master);
      this.baseGain = baseGain;
      const baseSrc = ctx.createBufferSource();
      baseSrc.buffer = baseBuffer;
      baseSrc.loop = true;
      baseSrc.connect(baseGain);
      baseSrc.start();

      // One interference layer per code slot
      for (let i = 0; i < code.length; i++) {
        const data = genNoise(code[i], sr, lcg(seedNum * 31 + i * 7919 + code[i]));
        const buf = ctx.createBuffer(1, data.length, sr);
        buf.getChannelData(0).set(data);
        const gain = ctx.createGain();
        gain.gain.value = NOISE_LAYER_GAIN;
        gain.connect(master);
        const source = ctx.createBufferSource();
        source.buffer = buf;
        source.loop = true;
        source.connect(gain);
        // tiny offset so identical symbols don't phase-lock
        source.start(0, (i * 0.97) % NOISE_LOOP_SEC);
        this.layers.push({ source, gain, active: true });
      }

      document.addEventListener('visibilitychange', this.onVisibility);
    } catch { /* no audio available — game stays fully playable silently */ }
  }

  /** Reflect decoded slots: fade out their noise, raise base +10% per solve. */
  setSolved(solved: boolean[]): void {
    const ctx = this.ctx;
    if (!ctx || !this.baseGain) return;
    const now = ctx.currentTime;
    let count = 0;
    for (let i = 0; i < solved.length; i++) {
      if (!solved[i]) continue;
      count++;
      const layer = this.layers[i];
      if (layer && layer.active) {
        layer.active = false;
        layer.gain.gain.setTargetAtTime(0, now, 0.18);
        try { layer.source.stop(now + 1.2); } catch { /* already stopped */ }
      }
    }
    if (count !== this.solvedCount) {
      this.solvedCount = count;
      // 0 -> 0%, 1 -> 10%, 2 -> 20%, 3 -> 30% of the melody. The final symbol
      // is owned by win() (clean 30% -> 100% reveal), so don't ramp the base
      // here when everything is solved — that avoids a stray 40% mid-step.
      if (count < solved.length) {
        const target = BASE_START_GAIN + count * BASE_GAIN_PER_SOLVE;
        this.baseGain.gain.setTargetAtTime(target, now, 0.25);
      }
    }
  }

  /** Victory: every layer silent, clean signal swells to full volume. */
  win(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const layer of this.layers) {
      if (!layer.active) continue;
      layer.active = false;
      layer.gain.gain.setTargetAtTime(0, now, 0.12);
      try { layer.source.stop(now + 0.8); } catch { /* already stopped */ }
    }
    // Jump from ~30% to a full, slightly punched-up reveal of the clean signal.
    this.baseGain?.gain.setTargetAtTime(BASE_WIN_GAIN, now, 0.3);
  }

  setMuted(muted: boolean): void {
    this.mutedFlag = muted;
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    this.master.gain.setTargetAtTime(muted ? 0 : MASTER_GAIN, ctx.currentTime, 0.05);
  }

  /** Fade out and release the audio graph. */
  stop(): void {
    this.stopped = true;
    const ctx = this.ctx;
    if (!ctx) return;
    document.removeEventListener('visibilitychange', this.onVisibility);
    try { this.master?.gain.setTargetAtTime(0, ctx.currentTime, 0.1); } catch { /* ignore */ }
    window.setTimeout(() => this.teardown(), 450);
  }

  private teardown(): void {
    document.removeEventListener('visibilitychange', this.onVisibility);
    try { void this.ctx?.close().catch(() => {}); } catch { /* ignore */ }
    this.ctx = null;
    this.master = null;
    this.baseGain = null;
    this.layers = [];
  }
}
