import { describe, expect, it } from 'vitest';
import { LatestPlanetRequest, reducePlanetTransition } from './planet-transition.js';

describe('planet transition request isolation', () => {
  it('keeps only the latest request current during rapid A to B to C switching', () => {
    const requests = new LatestPlanetRequest();
    const a = requests.begin();
    const b = requests.begin();
    const c = requests.begin();

    expect(a.signal.aborted).toBe(true);
    expect(b.signal.aborted).toBe(true);
    expect(c.signal.aborted).toBe(false);
    expect(requests.isCurrent(a.sequence)).toBe(false);
    expect(requests.isCurrent(b.sequence)).toBe(false);
    expect(requests.isCurrent(c.sequence)).toBe(true);
  });

  it('keeps the loader lifecycle active through texture and scene readiness', () => {
    let phase = reducePlanetTransition('ready', 'switch');
    expect(phase).toBe('resolving-texture');
    phase = reducePlanetTransition(phase, 'texture-ready');
    expect(phase).toBe('building-scene');
    phase = reducePlanetTransition(phase, 'scene-ready');
    expect(phase).toBe('ready');
  });

  it('allows a failed texture to build a procedural fallback instead of hanging', () => {
    let phase = reducePlanetTransition('resolving-texture', 'texture-failed');
    expect(phase).toBe('building-scene');
    phase = reducePlanetTransition(phase, 'scene-ready');
    expect(phase).toBe('ready');
  });
});
