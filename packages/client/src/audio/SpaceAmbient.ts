// ---------------------------------------------------------------------------
// SpaceAmbient — procedural deep-space ambient using Web Audio API.
// Generates a low rumble (3 sine oscillators with LFO pulse) + filtered
// white noise (lowpass with slow frequency sweep). No assets, no network.
//
// Browser autoplay policy: AudioContext must be created from a user gesture.
// Call start() inside an event handler chain originating from a click/tap.
//
// Includes visibility-change suspend/resume to save battery on tab switch.
// ---------------------------------------------------------------------------

export class SpaceAmbient {
  private ctx: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private noiseSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private onVisibilityChange: (() => void) | null = null;
  private onFirstInteraction: (() => void) | null = null;
  private readonly targetVolume = 0.15; // audible but atmospheric
  private readonly fadeInSec = 2;       // fade-in on start
  private readonly fadeOutSec = 1;      // fade-out on stop
  private readonly fadeShortSec = 0.3;  // fade for scene pause / resume

  public start(): void {
    if (this.isPlaying) return;

    const AudioContextClass: typeof AudioContext | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('[SpaceAmbient] AudioContext not supported');
      return;
    }

    try {
      this.ctx = new AudioContextClass();
    } catch (err) {
      console.warn('[SpaceAmbient] AudioContext creation failed:', err);
      return;
    }

    this.gainNode = this.ctx.createGain();
    this.gainNode.connect(this.ctx.destination);

    // Smooth fade-in over 2 seconds - prevents click from sudden wave start
    const now = this.ctx.currentTime;
    this.gainNode.gain.setValueAtTime(0, now);
    this.gainNode.gain.linearRampToValueAtTime(this.targetVolume, now + this.fadeInSec);

    this.createLowRumble();
    this.createSolarWind();

    // Browsers often create AudioContext in 'suspended' state. Try to resume
    // immediately. If that fails (no user gesture trust), attach a one-time
    // listener that resumes on the next pointer/key event.
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().then(() => {
        if (this.ctx?.state === 'running') {
          console.log('[SpaceAmbient] resumed successfully');
        }
      }).catch(() => {
        console.warn('[SpaceAmbient] auto-resume blocked, waiting for user interaction');
        this.attachInteractionFallback();
      });
    } else {
      console.log('[SpaceAmbient] running');
    }

    // Pause / resume on tab visibility change to save battery
    this.onVisibilityChange = () => {
      if (!this.ctx || this.ctx.state === 'closed') return;
      if (document.visibilityState === 'hidden') {
        void this.ctx.suspend();
      } else {
        void this.ctx.resume();
      }
    };
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    this.isPlaying = true;
  }

  /** Bulletproof fallback: resume AudioContext on next user interaction */
  private attachInteractionFallback(): void {
    if (this.onFirstInteraction) return; // already attached

    this.onFirstInteraction = () => {
      if (!this.ctx || this.ctx.state === 'closed') return;
      void this.ctx.resume().then(() => {
        if (this.ctx?.state === 'running') {
          console.log('[SpaceAmbient] resumed via interaction fallback');
        }
      });
      // One-shot: detach after first try
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

  public stop(): void {
    // Detach interaction fallback listeners (may exist even if start() failed)
    if (this.onFirstInteraction) {
      document.removeEventListener('pointerdown', this.onFirstInteraction);
      document.removeEventListener('keydown', this.onFirstInteraction);
      document.removeEventListener('touchstart', this.onFirstInteraction);
      this.onFirstInteraction = null;
    }

    if (!this.isPlaying || !this.ctx || !this.gainNode) {
      // Still detach visibility listener even if start() failed midway
      if (this.onVisibilityChange) {
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
        this.onVisibilityChange = null;
      }
      this.isPlaying = false;
      return;
    }

    // Smooth fade-out over 1 second, THEN stop oscillators + close context.
    // Prevents the "click" that happens when a sine wave is cut mid-cycle.
    const now = this.ctx.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.linearRampToValueAtTime(0, now + this.fadeOutSec);

    // Capture references BEFORE nulling so the timeout can clean them up
    const ctxToClose = this.ctx;
    const oscsToStop = this.oscillators;
    const noiseToStop = this.noiseSource;

    this.oscillators = [];
    this.noiseSource = null;
    this.ctx = null;
    this.gainNode = null;
    this.isPlaying = false;

    if (this.onVisibilityChange) {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
      this.onVisibilityChange = null;
    }

    setTimeout(() => {
      for (const osc of oscsToStop) {
        try { osc.stop(); } catch { /* already stopped */ }
      }
      if (noiseToStop) {
        try { noiseToStop.stop(); } catch { /* already stopped */ }
      }
      if (ctxToClose.state !== 'closed') {
        void ctxToClose.close();
      }
    }, this.fadeOutSec * 1000 + 50);
  }

  /** Adjust master volume (clamped to 0..0.3). Ramps smoothly. */
  public setVolume(v: number): void {
    if (!this.ctx || !this.gainNode) return;
    const target = Math.max(0, Math.min(0.3, v));
    const now = this.ctx.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.linearRampToValueAtTime(target, now + this.fadeShortSec);
  }

  /** Pause audio output (gain ramp to 0, context stays alive for quick resume).
   *  Use for scene transitions: surface, terminal. */
  public pause(): void {
    if (!this.ctx || !this.gainNode || this.ctx.state === 'closed') return;
    const now = this.ctx.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.linearRampToValueAtTime(0, now + this.fadeShortSec);
  }

  /** Resume paused audio output with a gain ramp back to target volume. */
  public resume(): void {
    if (!this.ctx || !this.gainNode || this.ctx.state === 'closed') return;
    // If context was suspended (e.g. by visibility change), resume first
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    const now = this.ctx.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.linearRampToValueAtTime(this.targetVolume, now + this.fadeShortSec);
  }

  private createLowRumble(): void {
    if (!this.ctx || !this.gainNode) return;

    // Three deep sine tones (reactor / vacuum hum)
    const freqs = [45, 55, 65];

    for (const freq of freqs) {
      const osc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator(); // pulse modulator
      const oscGain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      lfo.type = 'sine';
      lfo.frequency.value = 0.1 + Math.random() * 0.2; // slow pulse

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.5;

      lfo.connect(lfoGain);
      lfoGain.connect(oscGain.gain);

      osc.connect(oscGain);
      oscGain.connect(this.gainNode);

      osc.start();
      lfo.start();

      this.oscillators.push(osc);
      this.oscillators.push(lfo);
    }
  }

  private createSolarWind(): void {
    if (!this.ctx || !this.gainNode) return;

    // 30-second buffer. Longer makes the boundary event rare.
    const bufferSize = this.ctx.sampleRate * 30;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Fill with pre-smoothed noise: each sample is the average of 4
    // random values. This removes high-frequency spikes that excite the
    // filter and cause spectral edge clicks.
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 0.5;
    }

    // Click-free loop: apply a Hann half-window at both ends so that both
    // data[0] and data[bufferSize-1] are exactly 0. The wrap from 0 to 0
    // produces no discontinuity and no click at all. The "dip" at the
    // boundary lasts only 400 ms total (200 ms fade-out + 200 ms fade-in)
    // and is imperceptible against the ambient rumble.
    const fadeLen = Math.floor(this.ctx.sampleRate * 0.2); // 200 ms per side
    for (let i = 0; i < fadeLen; i++) {
      // Cosine-based Hann window: smooth 0 -> 1 over fadeLen samples
      const w = 0.5 - 0.5 * Math.cos((Math.PI * i) / fadeLen);
      data[i] *= w;                        // fade-in from 0
      data[bufferSize - 1 - i] *= w;       // fade-out to 0
    }

    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = buffer;
    this.noiseSource.loop = true;

    // Lowpass filter to turn white noise into a deep "wind" / cosmic hiss
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    // High Q would ring at discontinuities; keep Q low for smooth roll-off
    filter.Q.value = 0.5;

    // Slow LFO sweeping the cutoff for organic motion
    const filterLfo = this.ctx.createOscillator();
    filterLfo.type = 'sine';
    filterLfo.frequency.value = 0.05;

    const filterLfoGain = this.ctx.createGain();
    filterLfoGain.gain.value = 200;

    filterLfo.connect(filterLfoGain);
    filterLfoGain.connect(filter.frequency);
    filterLfo.start();
    this.oscillators.push(filterLfo);

    this.noiseSource.connect(filter);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0.06; // was 0.02, bumped for audibility
    filter.connect(noiseGain);
    noiseGain.connect(this.gainNode);

    this.noiseSource.start();
  }
}
