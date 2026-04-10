// ---------------------------------------------------------------------------
// SfxPlayer — lightweight sound effect system.
//
// playSfx(name, volume)  — one-shot fire-and-forget (short SFX)
// playLoop(name, volume) — looping ambient (engine hum, surface, terminal)
// stopLoop(name)         — stop a running loop
// stopAllLoops()         — stop everything (scene exit, cleanup)
// ---------------------------------------------------------------------------

/** Play a one-shot sound effect. Creates a new Audio element each time. */
export function playSfx(name: string, volume = 0.5): void {
  try {
    const audio = new Audio(`/sfx/${name}.webm`);
    audio.volume = Math.max(0, Math.min(1, volume));
    void audio.play().catch(() => { /* autoplay blocked */ });
  } catch { /* SSR / restricted */ }
}

// ── Looping ambient sounds ──────────────────────────────────────────────────

const loops = new Map<string, HTMLAudioElement>();

/** Start a looping sound. No-op if already playing. */
export function playLoop(name: string, volume = 0.3): void {
  if (loops.has(name)) return;
  try {
    const audio = new Audio(`/sfx/${name}.webm`);
    audio.loop = true;
    audio.volume = Math.max(0, Math.min(1, volume));
    void audio.play().catch(() => { /* autoplay blocked */ });
    loops.set(name, audio);
  } catch { /* SSR / restricted */ }
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
