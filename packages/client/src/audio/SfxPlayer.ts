// ---------------------------------------------------------------------------
// SfxPlayer — lightweight sound effect system.
//
// playSfx(name, volume, rate)  — one-shot fire-and-forget (short SFX)
// playLoop(name, volume)       — looping ambient (engine hum, surface, terminal)
// stopLoop(name)               — stop a running loop
// stopAllLoops()               — stop everything (scene exit, cleanup)
// setLoopVolume(name, volume)  — dynamic volume (e.g. engine tied to speed)
//
// Autoplay policy handling:
//   Browsers block audio.play() before a user gesture. We register a global
//   "first interaction" listener that retries all pending loops and unlocks
//   future playSfx calls. One-shot sounds keep a strong reference to prevent
//   GC from killing them mid-playback.
// ---------------------------------------------------------------------------

// ── Global audio unlock ──────────────────────────────────────────────────────

let unlocked = false;
const pendingLoops: HTMLAudioElement[] = [];

function onFirstInteraction(): void {
  if (unlocked) return;
  unlocked = true;
  // Retry all loops that were blocked by autoplay policy
  for (const audio of pendingLoops) {
    void audio.play().catch(() => {});
  }
  pendingLoops.length = 0;
  // Remove all listeners
  for (const evt of ['pointerdown', 'keydown', 'touchstart'] as const) {
    document.removeEventListener(evt, onFirstInteraction, true);
  }
}

// Auto-register on module import (browser only)
if (typeof document !== 'undefined') {
  for (const evt of ['pointerdown', 'keydown', 'touchstart'] as const) {
    document.addEventListener(evt, onFirstInteraction, { once: false, capture: true });
  }
}

// ── One-shot SFX ─────────────────────────────────────────────────────────────

// Strong reference set prevents GC from killing Audio elements mid-playback.
// This fixes the bug where onStartResearch unmounts ResearchPanel before the
// sound finishes, and the orphaned Audio element gets garbage-collected.
const activeOneShots = new Set<HTMLAudioElement>();

/** Play a one-shot sound effect. Creates a new Audio element each time.
 *  Optional `rate` param shifts pitch (0.5 = octave down, 2.0 = octave up).
 *  `name` may include an explicit extension (e.g. "quantum-focus.mp3");
 *  otherwise .webm is assumed to match the existing sound library. */
export function playSfx(name: string, volume = 0.5, rate = 1): void {
  try {
    const src = name.includes('.') ? `/sfx/${name}` : `/sfx/${name}.webm`;
    const audio = new Audio(src);
    audio.volume = Math.max(0, Math.min(1, volume));
    if (rate !== 1) audio.playbackRate = Math.max(0.25, Math.min(4, rate));
    activeOneShots.add(audio);
    audio.addEventListener('ended', () => activeOneShots.delete(audio), { once: true });
    void audio.play().catch(() => {
      if (!unlocked) {
        // Autoplay blocked before first interaction — retry on first gesture
        pendingLoops.push(audio);
      } else {
        activeOneShots.delete(audio);
      }
    });
  } catch { /* SSR / restricted */ }
}

// ── Looping ambient sounds ──────────────────────────────────────────────────

const loops = new Map<string, HTMLAudioElement>();

/** Start a looping sound. No-op if already playing. `name` may include an
 *  explicit extension (e.g. "quantum-focus.mp3"); otherwise .webm is used. */
export function playLoop(name: string, volume = 0.3): void {
  if (loops.has(name)) return;
  try {
    const src = name.includes('.') ? `/sfx/${name}` : `/sfx/${name}.webm`;
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = Math.max(0, Math.min(1, volume));
    loops.set(name, audio);
    void audio.play().catch(() => {
      // Autoplay blocked — queue for retry on first user interaction
      if (!unlocked) pendingLoops.push(audio);
    });
  } catch { /* SSR / restricted */ }
}

/** Adjust volume of a running loop (e.g. engine hum tied to ship speed). */
export function setLoopVolume(name: string, volume: number): void {
  const audio = loops.get(name);
  if (audio) audio.volume = Math.max(0, Math.min(1, volume));
}

/** Stop a specific loop. */
export function stopLoop(name: string): void {
  const audio = loops.get(name);
  if (!audio) return;
  audio.pause();
  audio.src = '';
  loops.delete(name);
}

/** Stop all active loops (e.g. on scene exit). */
export function stopAllLoops(): void {
  for (const [, audio] of loops) {
    audio.pause();
    audio.src = '';
  }
  loops.clear();
}
