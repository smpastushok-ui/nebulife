/**
 * Immersive-mode wrapper.
 *
 * On Capacitor (Android APK) — calls the native `ImmersivePlugin` we added
 * in MainActivity to hide status bar + navigation bar for fullscreen
 * gameplay. On web (browser) — falls back to the standard Fullscreen API.
 *
 * Used ONLY by the Space Arena (TPS mode). The rest of the app runs in
 * normal (non-immersive) mode.
 *
 * NOTE on the plugin proxy pattern:
 *   `registerPlugin(...)` is synchronous — it returns a proxy object that
 *   routes method calls to the native bridge. We intentionally DO NOT
 *   return that proxy from an async function; per the Capacitor runtime,
 *   awaiting a function that returns the raw proxy triggers a `.then()`
 *   call on the proxy itself, which the native side rejects as "not
 *   implemented". We call methods on the proxy directly instead.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';

interface ImmersivePluginShape {
  enter(): Promise<void>;
  exit(): Promise<void>;
}

// Safe to register at module load — this is just a proxy factory and does
// not invoke any native code. Methods are only dispatched when we call them.
const ImmersiveNative = registerPlugin<ImmersivePluginShape>('Immersive');

/** Hide system bars (status + nav) for fullscreen gameplay. */
export async function enterImmersive(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await ImmersiveNative.enter();
    } catch (err) {
      // Logged but non-fatal — gameplay still works with bars visible.
      // eslint-disable-next-line no-console
      console.warn('[Immersive] enter() failed:', err);
    }
    return;
  }

  // Web fallback — Fullscreen API. Note this REQUIRES a user gesture on
  // most browsers; if called during an effect without prior click/touch,
  // it may silently reject. That's fine: the arena entry is always
  // preceded by a button press, so most invocations succeed.
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      await el.requestFullscreen();
    }
  } catch {
    // Ignore — fullscreen failures are cosmetic, not gameplay-breaking.
  }
}

/** Restore normal system bar visibility. */
export async function exitImmersive(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await ImmersiveNative.exit();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[Immersive] exit() failed:', err);
    }
    return;
  }

  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    }
  } catch {
    // Ignore.
  }
}
