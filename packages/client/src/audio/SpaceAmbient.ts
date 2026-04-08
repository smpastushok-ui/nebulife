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
  private readonly targetVolume = 0.10; // slightly lower for headroom before compressor
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

    // Signal chain: [sources] -> masterGain -> dcBlock (highpass 30 Hz) ->
    //                compressor (brickwall limiter) -> destination.
    // The compressor prevents any peaks from causing speaker distortion
    // (the "tearing" a user hears when oscillators align phases).
    // The highpass removes subsonic garbage that small speakers cannot
    // reproduce and would rattle their cones trying to.
    this.gainNode = this.ctx.createGain();

    const dcBlock = this.ctx.createBiquadFilter();
    dcBlock.type = 'highpass';
    dcBlock.frequency.value = 30;
    dcBlock.Q.value = 0.7;

    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;   // dB — soft-knee starts here
    limiter.knee.value = 10;
    limiter.ratio.value = 12;       // 12:1 = effectively a limiter
    limiter.attack.value = 0.003;   // 3ms attack
    limiter.release.value = 0.25;

    this.gainNode.connect(dcBlock);
    dcBlock.connect(limiter);
    limiter.connect(this.ctx.destination);

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
    const prev = this.gainNode.gain.value;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(prev, now);
    this.gainNode.gain.linearRampToValueAtTime(0, now + this.fadeShortSec);
    console.log(`[SpaceAmbient] pause: gain ${prev.toFixed(3)} -> 0 (ctx=${this.ctx.state})`);
  }

  /** Resume paused audio output with a gain ramp back to target volume.
   *  Forces a clean ramp even after long pauses: ctx.resume() first to
   *  guarantee currentTime is flowing, then set value, then ramp. */
  public resume(): void {
    if (!this.ctx || !this.gainNode || this.ctx.state === 'closed') {
      console.warn('[SpaceAmbient] resume: aborted (no ctx / gain / closed)');
      return;
    }
    // If context was suspended (by tab visibility or browser policy),
    // resume it synchronously via promise. Ramp still schedules in
    // ctx.currentTime which will advance once resume() resolves.
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    const now = this.ctx.currentTime;
    const prev = this.gainNode.gain.value;
    this.gainNode.gain.cancelScheduledValues(now);
    // Force-set the starting value in case automation left it in a stale
    // state. Using `prev` keeps the transition smooth if resume is called
    // mid-fade (prev will be somewhere between 0 and target).
    this.gainNode.gain.setValueAtTime(prev, now);
    this.gainNode.gain.linearRampToValueAtTime(this.targetVolume, now + this.fadeShortSec);
    console.log(`[SpaceAmbient] resume: gain ${prev.toFixed(3)} -> ${this.targetVolume} (ctx=${this.ctx.state})`);
  }

  private createLowRumble(): void {
    if (!this.ctx || !this.gainNode) return;

    // Three deep sine tones (reactor / vacuum hum). Raised from 45/55/65
    // to 60/75/90 Hz so small laptop speakers can actually reproduce the
    // frequencies instead of rattling their port trying to.
    const freqs = [60, 75, 90];

    for (const freq of freqs) {
      const osc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator(); // pulse modulator
      const oscGain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      lfo.type = 'sine';
      lfo.frequency.value = 0.1 + Math.random() * 0.2; // slow pulse

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.35;  // reduced from 0.5 - less peak modulation

      // Per-oscillator gain ramp from 0 to base value to avoid any
      // transient when the oscillator's sine starts. Base value is
      // reduced from 1.0 to 0.6 so the three oscillators (peak ~1.8 sum)
      // leave enough headroom before the limiter kicks in.
      const oscNow = this.ctx.currentTime;
      oscGain.gain.setValueAtTime(0, oscNow);
      oscGain.gain.linearRampToValueAtTime(0.6, oscNow + this.fadeInSec);

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
    // Ramp noise gain in smoothly - starting at a non-zero value abruptly
    // can cause a pop when combined with the filter's initial IIR state.
    const noiseNow = this.ctx.currentTime;
    noiseGain.gain.setValueAtTime(0, noiseNow);
    noiseGain.gain.linearRampToValueAtTime(0.05, noiseNow + this.fadeInSec);
    filter.connect(noiseGain);
    noiseGain.connect(this.gainNode);

    this.noiseSource.start();
  }
}
