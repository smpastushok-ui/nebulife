// ---------------------------------------------------------------------------
// SpaceAmbient - global background music player (HTML5 Audio).
// Plays a looped pre-mastered track (default: /music/StellarDrift.webm).
//
// Why HTML5 Audio instead of procedural Web Audio:
//   - The previous procedural implementation (3 sine oscillators + filtered
//     noise) produced audible crackling on some hardware. Impossible to
//     fully eliminate without aggressive limiting that killed the vibe.
//   - A pre-mastered file has zero clicks and sounds exactly as the composer
//     intended.
//   - Opus VBR 96k = ~6 MB for 8 minutes, loaded once and cached.
//
// Public API is IDENTICAL to the previous procedural class so App.tsx does
// not need to change: start / stop / pause / resume / setVolume.
// Volume ramps are done on the JS side via requestAnimationFrame so there
// are no clicks when the scene-reactive effect pauses/resumes.
// ---------------------------------------------------------------------------

export class SpaceAmbient {
  private audio: HTMLAudioElement | null = null;
  private isPlaying = false;
  private fadeRaf: number | null = null;
  private targetVolume = 0.30; // last known target (0..1), matches slider default
  private onVisibilityChange: (() => void) | null = null;
  private onFirstInteraction: (() => void) | null = null;
  private readonly src: string;
  private readonly fadeInSec = 2;
  private readonly fadeOutSec = 1;
  private readonly fadeShortSec = 0.3;
  // Cinematic-friendly smooth fade (default for resume). Overlaps naturally
  // with the 1s CSS fade-to-black at the end of intro videos, so the music
  // gently swells back in as the scene transitions.
  private readonly fadeCinematicSec = 1.5;

  constructor(src: string = '/music/space.webm') {
    this.src = src;
  }

  public start(): void {
    if (this.isPlaying) return;

    try {
      this.audio = new Audio(this.src);
      this.audio.loop = true;
      this.audio.volume = 0; // silent start, fade-in below
      this.audio.preload = 'auto';
      // Do NOT set crossOrigin - not needed for same-origin playback,
      // and can cause failures if the server does not send CORS headers.
    } catch (err) {
      console.warn('[SpaceAmbient] Audio creation failed:', err);
      return;
    }

    console.log(`[SpaceAmbient] created audio element src=${this.src}`);

    // Diagnostic event listeners
    this.audio.addEventListener('loadeddata', () => {
      console.log(`[SpaceAmbient] loadeddata (readyState=${this.audio?.readyState}, duration=${this.audio?.duration?.toFixed(1)}s)`);
    });
    this.audio.addEventListener('canplay', () => {
      console.log('[SpaceAmbient] canplay');
    });
    this.audio.addEventListener('playing', () => {
      console.log(`[SpaceAmbient] event:playing (paused=${this.audio?.paused}, volume=${this.audio?.volume.toFixed(3)})`);
    });
    this.audio.addEventListener('error', () => {
      const err = this.audio?.error;
      console.error(`[SpaceAmbient] error code=${err?.code} message=${err?.message}`);
    });
    this.audio.addEventListener('stalled', () => {
      console.warn('[SpaceAmbient] stalled');
    });

    // Try to start playback. Browsers usually block without a user gesture
    // (autoplay policy). If blocked, fall back to the first pointer/key event.
    void this.audio.play().then(() => {
      console.log(`[SpaceAmbient] play() resolved (paused=${this.audio?.paused}, volume=${this.audio?.volume.toFixed(3)})`);
      this.fadeTo(this.targetVolume, this.fadeInSec * 1000);
    }).catch((err) => {
      console.warn('[SpaceAmbient] play() rejected:', err?.message ?? err);
      this.attachInteractionFallback();
    });

    // Pause / resume on tab visibility change to save battery.
    this.onVisibilityChange = () => {
      if (!this.audio) return;
      if (document.visibilityState === 'hidden') {
        this.audio.pause();
      } else {
        void this.audio.play().catch(() => { /* ignore */ });
      }
    };
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    this.isPlaying = true;
  }

  /** Bulletproof fallback: start playback on next user interaction. */
  private attachInteractionFallback(): void {
    if (this.onFirstInteraction) return;

    this.onFirstInteraction = () => {
      if (!this.audio) return;
      void this.audio.play().then(() => {
        console.log('[SpaceAmbient] started via interaction fallback');
        this.fadeTo(this.targetVolume, this.fadeInSec * 1000);
      }).catch(() => { /* ignore */ });

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
    // Detach interaction fallback listeners
    if (this.onFirstInteraction) {
      document.removeEventListener('pointerdown', this.onFirstInteraction);
      document.removeEventListener('keydown', this.onFirstInteraction);
      document.removeEventListener('touchstart', this.onFirstInteraction);
      this.onFirstInteraction = null;
    }
    if (this.onVisibilityChange) {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
      this.onVisibilityChange = null;
    }

    if (!this.isPlaying || !this.audio) {
      this.isPlaying = false;
      return;
    }

    const audio = this.audio;
    this.audio = null;
    this.isPlaying = false;

    // Fade out then fully stop + release the file
    this.fadeTo(0, this.fadeOutSec * 1000, audio, () => {
      audio.pause();
      audio.src = '';
      audio.load();
    });
  }

  /**
   * Scene transition: fade volume to 0 but keep the audio element alive.
   * Does NOT call audio.pause() - we only ramp volume so the decode
   * pipeline stays warm and iOS audio-focus quirks are minimized.
   * Optional fadeMs override for per-context tuning (default 300ms).
   */
  public pause(fadeMs: number = this.fadeShortSec * 1000): void {
    if (!this.audio) {
      console.warn('[SpaceAmbient] pause: no audio element');
      return;
    }
    this.fadeTo(0, fadeMs);
    console.log(`[SpaceAmbient] pause -> 0 over ${fadeMs}ms`);
  }

  /**
   * Scene transition: fade volume back to the last target.
   *
   * ALWAYS calls audio.play() unconditionally (not just when paused).
   * Reason: on iOS/Chrome a sibling <video> with audio can steal the
   * audio session and leave our HTMLAudioElement silent-but-not-paused.
   * A redundant play() on an already-playing element is a documented no-op.
   *
   * If play() rejects (autoplay policy after a cinematic dismissal without
   * a fresh gesture), we log the error, schedule the fade anyway so volume
   * is at target when playback finally resumes, and attach the same
   * pointerdown/keydown/touchstart fallback that start() uses.
   *
   * Default fade is 1.5s (fadeCinematicSec) - smooth enough for exiting
   * intro videos, snappy enough for surface/archive returns.
   */
  public resume(fadeMs: number = this.fadeCinematicSec * 1000): void {
    if (!this.audio) {
      console.warn('[SpaceAmbient] resume: no audio element');
      return;
    }
    const audio = this.audio;
    console.log(
      `[SpaceAmbient] resume requested (paused=${audio.paused}, ` +
      `volume=${audio.volume.toFixed(3)}, target=${this.targetVolume.toFixed(3)}, ` +
      `fadeMs=${fadeMs})`,
    );

    // Always attempt play(). No-op for an already-playing element,
    // restores audio-session ownership on iOS/mobile where a sibling
    // <video> with audio may have silently evicted us.
    void audio.play().then(() => {
      console.log('[SpaceAmbient] resume: play() resolved');
      this.fadeTo(this.targetVolume, fadeMs);
    }).catch((err) => {
      console.warn('[SpaceAmbient] resume: play() rejected:', err?.message ?? err);
      // Schedule the fade anyway - audio.volume mutates regardless of
      // playback state, so when the interaction fallback eventually fires
      // play(), the element is already at target volume. No second call
      // or click needed from our side.
      this.fadeTo(this.targetVolume, fadeMs);
      this.attachInteractionFallback();
    });
  }

  /** Slider drag: set volume immediately. No fade — the slider itself
   *  generates smooth intermediate values, and fadeTo's 300ms ramp gets
   *  cancelled every 16ms during drag, causing the volume to barely move. */
  public setVolume(v: number): void {
    const clamped = Math.max(0, Math.min(1, v));
    this.targetVolume = clamped;
    if (this.audio) {
      this.audio.volume = clamped;
    }
  }

  /** Animate audio.volume from its current value to target over durationMs. */
  private fadeTo(
    target: number,
    durationMs: number,
    audioArg?: HTMLAudioElement,
    onComplete?: () => void,
  ): void {
    const audio = audioArg ?? this.audio;
    if (!audio) return;

    if (this.fadeRaf !== null) {
      cancelAnimationFrame(this.fadeRaf);
      this.fadeRaf = null;
    }

    const startVolume = audio.volume;
    const startTime = performance.now();
    const clampedTarget = Math.max(0, Math.min(1, target));

    console.log(`[SpaceAmbient] fadeTo ${startVolume.toFixed(3)} -> ${clampedTarget.toFixed(3)} over ${durationMs}ms`);

    const tick = (now: number) => {
      const t = durationMs > 0 ? Math.min(1, (now - startTime) / durationMs) : 1;
      audio.volume = startVolume + (clampedTarget - startVolume) * t;
      if (t < 1) {
        this.fadeRaf = requestAnimationFrame(tick);
      } else {
        this.fadeRaf = null;
        audio.volume = clampedTarget;
        console.log(`[SpaceAmbient] fade done (volume=${audio.volume.toFixed(3)}, paused=${audio.paused})`);
        onComplete?.();
      }
    };
    this.fadeRaf = requestAnimationFrame(tick);
  }
}
