export type PlanetTransitionPhase = 'resolving-texture' | 'building-scene' | 'ready' | 'fallback';

export class LatestPlanetRequest {
  private sequence = 0;
  private controller: AbortController | null = null;

  begin(): { sequence: number; signal: AbortSignal } {
    this.controller?.abort();
    this.controller = new AbortController();
    return { sequence: ++this.sequence, signal: this.controller.signal };
  }

  isCurrent(sequence: number): boolean {
    return sequence === this.sequence && this.controller?.signal.aborted === false;
  }

  abort(): void {
    this.controller?.abort();
  }
}

export function reducePlanetTransition(
  phase: PlanetTransitionPhase,
  event: 'switch' | 'texture-ready' | 'texture-failed' | 'scene-ready',
): PlanetTransitionPhase {
  if (event === 'switch') return 'resolving-texture';
  if (event === 'texture-ready' || event === 'texture-failed') return 'building-scene';
  if (event === 'scene-ready') return phase === 'building-scene' ? 'ready' : phase;
  return phase;
}
