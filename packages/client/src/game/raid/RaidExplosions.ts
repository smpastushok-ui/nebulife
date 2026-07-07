// ---------------------------------------------------------------------------
// RaidExplosions — plays pre-baked explosion sprite-sheets (see
// scripts/bake-explosions.mjs) via a small pool of AnimatedSprites.
//
// NEXT_GEN_PLAN.md section A.4: explosions are generated once at
// content-authoring time into packages/client/public/fx/*.webp, not
// procedurally redrawn every frame — the game only ever plays frames back.
// A handful of concurrent explosions is normal (a kill here, a module there),
// so a small fixed AnimatedSprite pool is plenty; no ParticleContainer
// instancing needed for this layer.
// ---------------------------------------------------------------------------

import { AnimatedSprite, Assets, Container, Rectangle, Texture } from 'pixi.js';

export type ExplosionKind = 'small' | 'large' | 'shield';

interface SheetMeta {
  frameSize: number;
  frameCount: number;
  columns: number;
  rows: number;
}

const SHEET_FILES: Record<ExplosionKind, string> = {
  small: 'explosion-small',
  large: 'explosion-large',
  shield: 'shield-pop',
};

const FPS: Record<ExplosionKind, number> = {
  small: 22,
  large: 26,
  shield: 20,
};

const POOL_SIZE_PER_KIND = 4;

async function loadSheetFrames(kind: ExplosionKind): Promise<Texture[] | null> {
  const file = SHEET_FILES[kind];
  try {
    const [texture, meta] = await Promise.all([
      Assets.load<Texture>(`/fx/${file}.webp`),
      fetch(`/fx/${file}.json`).then((res) => res.json() as Promise<SheetMeta>),
    ]);
    const frames: Texture[] = [];
    for (let i = 0; i < meta.frameCount; i++) {
      const col = i % meta.columns;
      const row = Math.floor(i / meta.columns);
      frames.push(new Texture({
        source: texture.source,
        frame: new Rectangle(col * meta.frameSize, row * meta.frameSize, meta.frameSize, meta.frameSize),
      }));
    }
    return frames;
  } catch {
    return null;
  }
}

interface PoolEntry {
  sprite: AnimatedSprite;
  busy: boolean;
}

export class RaidExplosions {
  private readonly layer: Container;
  private readonly pools = new Map<ExplosionKind, PoolEntry[]>();
  private ready = false;

  constructor(layer: Container) {
    this.layer = layer;
  }

  /** Preload all sheets and build the sprite pools. Safe to call once at raid init. */
  async load(): Promise<void> {
    const kinds: ExplosionKind[] = ['small', 'large', 'shield'];
    await Promise.all(kinds.map(async (kind) => {
      const frames = await loadSheetFrames(kind);
      if (!frames) return; // missing/failed sheet — play() below becomes a silent no-op for this kind
      const entries: PoolEntry[] = [];
      for (let i = 0; i < POOL_SIZE_PER_KIND; i++) {
        const sprite = new AnimatedSprite(frames);
        sprite.anchor.set(0.5);
        sprite.animationSpeed = FPS[kind] / 60;
        sprite.loop = false;
        sprite.visible = false;
        sprite.blendMode = 'add';
        this.layer.addChild(sprite);
        entries.push({ sprite, busy: false });
      }
      this.pools.set(kind, entries);
    }));
    this.ready = true;
  }

  /** Fire-and-forget playback at world position (x, y). No-op if sheets failed to load. */
  play(kind: ExplosionKind, x: number, y: number, scale = 1): void {
    if (!this.ready) return;
    const pool = this.pools.get(kind);
    if (!pool) return;
    const entry = pool.find((e) => !e.busy) ?? pool[0];
    entry.busy = true;
    const sprite = entry.sprite;
    sprite.position.set(x, y);
    sprite.scale.set(scale);
    sprite.visible = true;
    sprite.alpha = 1;
    sprite.gotoAndPlay(0);
    const onComplete = () => {
      sprite.visible = false;
      entry.busy = false;
      sprite.off('complete', onComplete);
    };
    sprite.off('complete');
    sprite.on('complete', onComplete);
  }

  destroy(): void {
    for (const pool of this.pools.values()) {
      for (const entry of pool) entry.sprite.destroy();
    }
    this.pools.clear();
  }
}
