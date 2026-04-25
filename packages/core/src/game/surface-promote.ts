// ---------------------------------------------------------------------------
// Surface biome regeneration after planet type promotion (Phase 7C)
// ---------------------------------------------------------------------------
//
// The surface map generator lives entirely in packages/client (SurfaceScene /
// hex-surface layer) and cannot be imported from @nebulife/core without
// creating a circular / cross-package dependency.
//
// This helper is therefore intentionally a stub: it returns null, signalling
// to the caller that regeneration should be handled client-side (App.tsx or
// SurfaceShaderView) using the existing surface generator with the same
// planet seed but the updated `planet.type`.

import type { Planet } from '../types/planet.js';
import type { SurfaceMap } from '../types/surface.js';

/**
 * Regenerate surface biomes for a planet whose `type` has just changed via
 * a successful terraform completion.  Keeps the deterministic seed-driven
 * elevation layout intact but reassigns biome classifications according to
 * the new planet type's biome rules.
 *
 * @returns `null` — surface generator is client-side only; the caller is
 *   responsible for triggering a re-render / regeneration using the
 *   updated `planet.type`.  The returned null acts as a no-op signal.
 */
export function regenerateSurfaceForType(
  _planet: Planet,
  _oldMap?: SurfaceMap,
): SurfaceMap | null {
  // Delegate to client-side generator.  Phase 7C: stub only.
  return null;
}
