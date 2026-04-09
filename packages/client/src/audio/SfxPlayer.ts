// ---------------------------------------------------------------------------
// SfxPlayer — lightweight one-shot sound effect player.
// Each call creates a new HTMLAudioElement, plays it, and lets the browser
// garbage-collect it after playback ends. Perfect for short SFX (<3s).
// ---------------------------------------------------------------------------

export function playSfx(name: string, volume = 0.5): void {
  try {
    const audio = new Audio(`/sfx/${name}.webm`);
    audio.volume = Math.max(0, Math.min(1, volume));
    void audio.play().catch(() => { /* autoplay blocked — ignore */ });
  } catch {
    // Audio constructor can throw in SSR or restricted environments
  }
}
