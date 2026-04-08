// ---------------------------------------------------------------------------
// PlanetAmbient - procedural surface biome ambients via Web Audio API.
// Four biomes: earth, desert, ice, volcanic. Each blends filtered noise
// (wind / rumble / hiss) with scheduled one-shot events (chirps, chimes,
// bubbles, cricket rasps).
//
// Click-prevention techniques from SpaceAmbient are applied to all noise
// buffers: long loop (20-30s), pre-smoothed random values, Hann window
// at both edges so boundary samples are exactly 0. Envelope fades on
// start / stop / pause / resume prevent transient pops.
// ---------------------------------------------------------------------------

export type PlanetBiome = 'earth' | 'desert' | 'ice' | 'volcanic';

export class PlanetAmbient {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private noiseSources: AudioBufferSourceNode[] = [];
  private timers: number[] = [];
  private isPlaying = false;
  private currentBiome: PlanetBiome | null = null;
  private onFirstInteraction: (() => void) | null = null;
  private onVisibilityChange: (() => void) | null = null;
  private readonly targetVolume = 0.1;
  private readonly fadeInSec = 2;
  private readonly fadeOutSec = 1;
  private readonly fadeShortSec = 0.3;

  public start(biome: PlanetBiome): void {
    if (this.isPlaying) return;

    const AudioContextClass: typeof AudioContext | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('[PlanetAmbient] AudioContext not supported');
      return;
    }

    try {
      this.ctx = new AudioContextClass();
    } catch (err) {
      console.warn('[PlanetAmbient] AudioContext creation failed:', err);
      return;
    }

    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);

    // Fade-in envelope (prevents wave-start click)
    const now = this.ctx.currentTime;
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(this.targetVolume, now + this.fadeInSec);

    this.currentBiome = biome;
    // Set isPlaying BEFORE biome composer so scheduleRandomBird() et al
    // don't early-return on the first (sync) call. Without this, all
    // scheduled one-shot events (birds, crickets, chimes, bubbles) would
    // never register their setTimeouts because isPlaying was still false.
    this.isPlaying = true;
    switch (biome) {
      case 'earth':    this.createEarthAmbient(); break;
      case 'desert':   this.createDesertAmbient(); break;
      case 'ice':      this.createIceAmbient(); break;
      case 'volcanic': this.createVolcanicAmbient(); break;
    }

    // Handle browser autoplay suspend state
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().then(() => {
        if (this.ctx?.state === 'running') {
          console.log(`[PlanetAmbient:${biome}] resumed successfully`);
        }
      }).catch(() => {
        console.warn(`[PlanetAmbient:${biome}] auto-resume blocked, waiting for user interaction`);
        this.attachInteractionFallback();
      });
    } else {
      console.log(`[PlanetAmbient:${biome}] running`);
    }

    // Suspend on tab hidden to save battery
    this.onVisibilityChange = () => {
      if (!this.ctx || this.ctx.state === 'closed') return;
      if (document.visibilityState === 'hidden') {
        void this.ctx.suspend();
      } else {
        void this.ctx.resume();
      }
    };
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  public stop(): void {
    console.log(`[PlanetAmbient:${this.currentBiome}] stop (isPlaying=${this.isPlaying})`);
    // Detach interaction fallback listeners
    if (this.onFirstInteraction) {
      document.removeEventListener('pointerdown', this.onFirstInteraction);
      document.removeEventListener('keydown', this.onFirstInteraction);
      document.removeEventListener('touchstart', this.onFirstInteraction);
      this.onFirstInteraction = null;
    }

    if (!this.isPlaying || !this.ctx || !this.masterGain) {
      if (this.onVisibilityChange) {
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
        this.onVisibilityChange = null;
      }
      this.isPlaying = false;
      return;
    }

    // Cancel pending scheduled events (bird chirps, chimes, bubbles)
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];

    // Fade-out envelope then actually stop nodes
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0, now + this.fadeOutSec);

    const ctxToClose = this.ctx;
    const oscsToStop = this.oscillators;
    const noiseToStop = this.noiseSources;

    this.oscillators = [];
    this.noiseSources = [];
    this.ctx = null;
    this.masterGain = null;
    this.isPlaying = false;
    this.currentBiome = null;

    if (this.onVisibilityChange) {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
      this.onVisibilityChange = null;
    }

    setTimeout(() => {
      for (const osc of oscsToStop) {
        try { osc.stop(); } catch { /* already stopped */ }
      }
      for (const n of noiseToStop) {
        try { n.stop(); } catch { /* already stopped */ }
      }
      if (ctxToClose.state !== 'closed') {
        void ctxToClose.close();
      }
    }, this.fadeOutSec * 1000 + 50);
  }

  public pause(): void {
    if (!this.ctx || !this.masterGain || this.ctx.state === 'closed') return;
    const prev = this.masterGain.gain.value;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(prev, now);
    this.masterGain.gain.linearRampToValueAtTime(0, now + this.fadeShortSec);
    console.log(`[PlanetAmbient:${this.currentBiome}] pause: gain ${prev.toFixed(3)} -> 0`);
  }

  public resume(): void {
    if (!this.ctx || !this.masterGain || this.ctx.state === 'closed') return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    const prev = this.masterGain.gain.value;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(prev, now);
    this.masterGain.gain.linearRampToValueAtTime(this.targetVolume, now + this.fadeShortSec);
    console.log(`[PlanetAmbient:${this.currentBiome}] resume: gain ${prev.toFixed(3)} -> ${this.targetVolume}`);
  }

  public setVolume(v: number): void {
    if (!this.ctx || !this.masterGain) return;
    const target = Math.max(0, Math.min(0.3, v));
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(target, now + this.fadeShortSec);
  }

  public getBiome(): PlanetBiome | null { return this.currentBiome; }

  // ─── Biome composers ─────────────────────────────────────────────────

  private createEarthAmbient(): void {
    // Warm low-frequency wind + occasional bird chirps.
    this.createWind({ cutoff: 400, lfoRate: 0.1, lfoDepth: 200, volume: 0.35 });
    this.scheduleRandomBird();
  }

  private createDesertAmbient(): void {
    // Stronger, drier, higher-cutoff wind + slow cricket rasps at night-feel.
    this.createWind({ cutoff: 650, lfoRate: 0.08, lfoDepth: 350, volume: 0.45 });
    this.scheduleRandomCricket();
  }

  private createIceAmbient(): void {
    // Cold stiff wind (highpass'd noise) + random crystal chimes.
    this.createWind({ cutoff: 900, lfoRate: 0.06, lfoDepth: 400, volume: 0.30, highpassHz: 200 });
    this.scheduleRandomChime();
  }

  private createVolcanicAmbient(): void {
    // Deep rumble + slow random bubble pops.
    this.createRumble();
    this.scheduleRandomBubble();
  }

  // ─── Generators ──────────────────────────────────────────────────────

  /** Click-free noise buffer: long duration, pre-smoothed, Hann window edges */
  private createNoiseBuffer(durationSec: number): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * durationSec;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Pre-smoothed noise: average 4 random samples to suppress high-freq spikes
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 0.5;
    }

    // Hann half-window at both edges (200 ms each) so data[0] and
    // data[bufferSize-1] are exactly 0 => loop seam is silent-to-silent.
    const fadeLen = Math.floor(this.ctx.sampleRate * 0.2);
    for (let i = 0; i < fadeLen; i++) {
      const w = 0.5 - 0.5 * Math.cos((Math.PI * i) / fadeLen);
      data[i] *= w;
      data[bufferSize - 1 - i] *= w;
    }

    return buffer;
  }

  private createWind(opts: {
    cutoff: number;
    lfoRate: number;
    lfoDepth: number;
    volume: number;
    highpassHz?: number;
  }): void {
    if (!this.ctx || !this.masterGain) return;

    const buffer = this.createNoiseBuffer(20); // 20 s click-free
    if (!buffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Optional highpass (ice biome): removes warmth, keeps frosty high wind
    let upstream: AudioNode = noise;
    if (opts.highpassHz) {
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = opts.highpassHz;
      hp.Q.value = 0.5;
      noise.connect(hp);
      upstream = hp;
    }

    // Main lowpass that defines the wind character
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = opts.cutoff;
    filter.Q.value = 0.5;

    // LFO sweeping cutoff for gusts
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = opts.lfoRate;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = opts.lfoDepth;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    this.oscillators.push(lfo);

    upstream.connect(filter);

    const volGain = this.ctx.createGain();
    volGain.gain.value = opts.volume;
    filter.connect(volGain);
    volGain.connect(this.masterGain);

    noise.start();
    this.noiseSources.push(noise);
  }

  private createRumble(): void {
    if (!this.ctx || !this.masterGain) return;

    // Deep low sine bed for volcanic biome
    const freqs = [35, 48, 62];
    for (const f of freqs) {
      const osc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      lfo.type = 'sine';
      lfo.frequency.value = 0.08 + Math.random() * 0.15;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.5;
      lfo.connect(lfoGain);
      lfoGain.connect(oscGain.gain);
      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start();
      lfo.start();
      this.oscillators.push(osc, lfo);
    }

    // Low-frequency filtered noise (magma hiss) over the rumble
    const buffer = this.createNoiseBuffer(20);
    if (buffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 250;
      filter.Q.value = 0.5;
      noise.connect(filter);
      const g = this.ctx.createGain();
      g.gain.value = 0.25;
      filter.connect(g);
      g.connect(this.masterGain);
      noise.start();
      this.noiseSources.push(noise);
    }
  }

  // ─── Scheduled one-shot events ───────────────────────────────────────

  private scheduleRandomBird(): void {
    if (!this.isPlaying) return;
    const nextMs = 2000 + Math.random() * 4000;
    const id = window.setTimeout(() => {
      this.playBirdChirp();
      this.scheduleRandomBird();
    }, nextMs);
    this.timers.push(id);
  }

  private playBirdChirp(): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const baseFreq = 2000 + Math.random() * 1000;
    osc.type = 'sine';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq + 500, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.2);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.05);
    gain.gain.linearRampToValueAtTime(0, now + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  private scheduleRandomCricket(): void {
    if (!this.isPlaying) return;
    const nextMs = 3500 + Math.random() * 5500;
    const id = window.setTimeout(() => {
      this.playCricketRasp();
      this.scheduleRandomCricket();
    }, nextMs);
    this.timers.push(id);
  }

  private playCricketRasp(): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;
    // Short burst of high-frequency trills
    const now = this.ctx.currentTime;
    const baseFreq = 4000 + Math.random() * 800;
    for (let i = 0; i < 4; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const startT = now + i * 0.07;
      osc.frequency.setValueAtTime(baseFreq, startT);
      osc.frequency.linearRampToValueAtTime(baseFreq + 150, startT + 0.03);
      gain.gain.setValueAtTime(0, startT);
      gain.gain.linearRampToValueAtTime(0.03, startT + 0.01);
      gain.gain.linearRampToValueAtTime(0, startT + 0.05);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(startT);
      osc.stop(startT + 0.06);
    }
  }

  private scheduleRandomChime(): void {
    if (!this.isPlaying) return;
    const nextMs = 4000 + Math.random() * 8000;
    const id = window.setTimeout(() => {
      this.playCrystalChime();
      this.scheduleRandomChime();
    }, nextMs);
    this.timers.push(id);
  }

  private playCrystalChime(): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;
    // Metallic crystal bell: high sine with slow exponential decay
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const freq = 1500 + Math.random() * 1500;
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 2.6);
  }

  private scheduleRandomBubble(): void {
    if (!this.isPlaying) return;
    const nextMs = 1500 + Math.random() * 3500;
    const id = window.setTimeout(() => {
      this.playMagmaBubble();
      this.scheduleRandomBubble();
    }, nextMs);
    this.timers.push(id);
  }

  private playMagmaBubble(): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;
    // Short descending pitch for magma bubble burst
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const startFreq = 180 + Math.random() * 120;
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.4);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.55);
  }

  // ─── Autoplay interaction fallback ───────────────────────────────────

  private attachInteractionFallback(): void {
    if (this.onFirstInteraction) return;
    this.onFirstInteraction = () => {
      if (!this.ctx || this.ctx.state === 'closed') return;
      void this.ctx.resume().then(() => {
        if (this.ctx?.state === 'running') {
          console.log(`[PlanetAmbient:${this.currentBiome}] resumed via interaction fallback`);
        }
      });
      if (this.onFirstInteraction) {
        document.removeEventListener('pointerdown', this.onFirstInteraction);
        document.removeEventListener('keydown', this.onFirstInteraction);
        document.removeEventListener('touchstart', this.onFirstInteraction);
        this.onFirstInteraction = null;
      }
    };
    document.addEventListener('pointerdown', this.onFirstInteraction, { once: true });
    document.addEventListener('keydown', this.onFirstInteraction, { once: true });
    document.addEventListener('touchstart', this.onFirstInteraction, { once: true });
  }
}

// ---------------------------------------------------------------------------
// Helper: map a Planet to a biome string usable by PlanetAmbient.start()
// ---------------------------------------------------------------------------

export function planetToAmbientBiome(planet: {
  surfaceTempK: number;
  hasLife?: boolean;
  hydrosphere?: unknown;
}): PlanetBiome {
  const t = planet.surfaceTempK;
  if (t > 420) return 'volcanic';    // hot enough for lava surface features
  if (t < 240) return 'ice';         // frozen world
  if (planet.hasLife || planet.hydrosphere) return 'earth'; // habitable with water
  return 'desert';                    // warm and dry
}
