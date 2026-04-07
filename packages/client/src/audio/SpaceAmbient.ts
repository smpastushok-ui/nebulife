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

  public start(): void {
    if (this.isPlaying) return;

    const AudioContextClass: typeof AudioContext | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      this.ctx = new AudioContextClass();
    } catch {
      return; // AudioContext blocked
    }

    this.gainNode = this.ctx.createGain();
    this.gainNode.connect(this.ctx.destination);
    this.gainNode.gain.value = 0.05; // very quiet

    this.createLowRumble();
    this.createSolarWind();

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

  public stop(): void {
    if (!this.isPlaying || !this.ctx) {
      // Still detach visibility listener even if start() failed midway
      if (this.onVisibilityChange) {
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
        this.onVisibilityChange = null;
      }
      this.isPlaying = false;
      return;
    }

    for (const osc of this.oscillators) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    this.oscillators = [];

    if (this.noiseSource) {
      try { this.noiseSource.stop(); } catch { /* already stopped */ }
      this.noiseSource = null;
    }

    if (this.onVisibilityChange) {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
      this.onVisibilityChange = null;
    }

    if (this.ctx.state !== 'closed') {
      void this.ctx.close();
    }
    this.ctx = null;
    this.gainNode = null;
    this.isPlaying = false;
  }

  /** Adjust master volume (clamped to 0..0.2 to keep things subtle) */
  public setVolume(v: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(0.2, v));
    }
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

    // White noise buffer (2 seconds, looped)
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = buffer;
    this.noiseSource.loop = true;

    // Lowpass filter to turn white noise into a deep "wind" / cosmic hiss
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

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
    noiseGain.gain.value = 0.02;
    filter.connect(noiseGain);
    noiseGain.connect(this.gainNode);

    this.noiseSource.start();
  }
}
