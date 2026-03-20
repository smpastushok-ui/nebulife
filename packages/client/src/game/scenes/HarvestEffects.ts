/**
 * HarvestEffects — particle bursts and sprite destruction animations for resource harvesting.
 *
 * Three resource types:
 *   tree  → green leaf burst + scale.y collapse animation on the sprite
 *   ore   → screen shake + gray/brown fragment parabola
 *   vent  → white brightness flash + cyan/violet spark column
 *
 * All particles are PixiJS Graphics squares (no textures).
 * Screen shake is applied via worldContainer.pivot to avoid moving the camera offset.
 */

import { Container, Graphics, ColorMatrixFilter, Sprite } from 'pixi.js';

// ── Particle colour palettes ──────────────────────────────────────────────────
const PALETTE = {
  tree: [0x44ff88, 0x22cc55, 0x88ff44, 0xaaffbb],
  ore:  [0x998877, 0xbbaa88, 0x665544, 0xccbbaa],
  vent: [0x44aaff, 0x8844ff, 0x22ddff, 0xffffff],
} as const;

interface Particle {
  g: Graphics;
  vx: number;
  vy: number;
  gravity: number;   // vy increment per ms
  life: number;      // 0..1
  decay: number;     // life lost per ms
}

// ── Sprite animation descriptors (attached as properties) ────────────────────
type CollapseAnim = { __collapseElapsed: number; __collapseStart: number };
type FlashAnim    = { __flashElapsed: number;    __flashFilter: ColorMatrixFilter };
type FadeAnim     = { __fadeElapsed: number;     __fadeDuration: number };

export class HarvestEffects {
  private particles: Particle[] = [];
  private shakeMs   = 0;
  private shakeAmp  = 0;

  constructor(
    private readonly effectLayer:    Container,
    private readonly worldContainer: Container,
  ) {}

  // ── Public trigger methods ────────────────────────────────────────────────

  /** Tree: collapse scale.y + green leaf burst. Call BEFORE harvest removes the sprite. */
  triggerTree(sprite: Sprite | null, wx: number, wy: number): void {
    if (sprite) this._startCollapse(sprite, 350);
    this._burst(wx, wy, PALETTE.tree, 20, 'leaf');
  }

  /** Ore: screen shake + gray fragment parabola. */
  triggerOre(wx: number, wy: number): void {
    this._screenShake(3, 360);
    this._burst(wx, wy, PALETTE.ore, 18, 'fragment');
  }

  /** Vent: brightness flash + cyan/violet spark column. Call BEFORE harvest removes the sprite. */
  triggerVent(sprite: Sprite | null, wx: number, wy: number): void {
    if (sprite) {
      this._startFlash(sprite, 120);
      this._startFade(sprite, 180);
    }
    this._burst(wx, wy, PALETTE.vent, 22, 'spark');
  }

  /** Call every frame with the elapsed milliseconds. */
  update(deltaMs: number): void {
    // Screen shake ─────────────────────────────────────────────────────────
    if (this.shakeMs > 0) {
      this.shakeMs -= deltaMs;
      const envelope = Math.max(0, this.shakeMs) / 360;
      const amp = this.shakeAmp * envelope;
      this.worldContainer.pivot.set(
        (Math.random() * 2 - 1) * amp,
        (Math.random() * 2 - 1) * amp,
      );
      if (this.shakeMs <= 0) this.worldContainer.pivot.set(0, 0);
    }

    // Particles ────────────────────────────────────────────────────────────
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy   += p.gravity * deltaMs;
      p.g.x  += p.vx * deltaMs;
      p.g.y  += p.vy * deltaMs;
      p.life -= p.decay * deltaMs;
      p.g.alpha = Math.max(0, p.life);
      if (p.life <= 0) {
        p.g.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Tick per-sprite animations. Call from SurfaceScene.update() for each sprite
   * that has a pending animation (checks for __collapseElapsed etc.).
   */
  static tickSprite(sprite: Sprite, deltaMs: number): void {
    // Collapse (scale.y shrink)
    if ('__collapseElapsed' in sprite) {
      const s = sprite as unknown as CollapseAnim;
      s.__collapseElapsed += deltaMs;
      const t = Math.min(1, s.__collapseElapsed / s.__collapseStart);
      sprite.scale.y = s.__collapseStart === 0 ? 0 : (sprite.scale.y / (sprite.scale.y || 1)) * (1 - t);
      // Simpler: store original scaleY
      if (t >= 1) {
        sprite.visible = false;
        delete (sprite as any).__collapseElapsed;
        delete (sprite as any).__collapseStart;
        delete (sprite as any).__collapseScaleY;
      }
    }
    // Brightness flash
    if ('__flashElapsed' in sprite) {
      const s = sprite as unknown as FlashAnim;
      s.__flashElapsed += deltaMs;
      const t = Math.min(1, s.__flashElapsed / 120);
      try { s.__flashFilter.brightness(1 + (1 - t) * 5, false); } catch { /* noop */ }
      if (t >= 1) {
        sprite.filters = (sprite.filters as any[]).filter((f: any) => f !== s.__flashFilter);
        delete (sprite as any).__flashElapsed;
        delete (sprite as any).__flashFilter;
      }
    }
    // Fade out (alpha)
    if ('__fadeElapsed' in sprite) {
      const s = sprite as unknown as FadeAnim;
      s.__fadeElapsed += deltaMs;
      const t = Math.min(1, s.__fadeElapsed / s.__fadeDuration);
      sprite.alpha = 1 - t;
      if (t >= 1) {
        sprite.visible = false;
        delete (sprite as any).__fadeElapsed;
        delete (sprite as any).__fadeDuration;
      }
    }
  }

  /** Returns true if the sprite has any pending HarvestEffects animation. */
  static hasPendingAnim(sprite: Sprite): boolean {
    return '__collapseElapsed' in sprite
        || '__flashElapsed'    in sprite
        || '__fadeElapsed'     in sprite;
  }

  destroy(): void {
    for (const p of this.particles) p.g.destroy();
    this.particles = [];
    this.worldContainer.pivot.set(0, 0);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _screenShake(amp: number, durationMs: number): void {
    this.shakeAmp = amp;
    this.shakeMs  = durationMs;
  }

  private _startCollapse(sprite: Sprite, durationMs: number): void {
    const scaleY = sprite.scale.y;
    // Attach fields so tickSprite can drive the animation
    (sprite as any).__collapseElapsed = 0;
    (sprite as any).__collapseDuration = durationMs;
    (sprite as any).__collapseScaleY   = scaleY;

    // Override tickSprite for collapse with actual scaleY tracking
    // (We replace with a direct approach using __collapseScaleY)
    const self = sprite as any;
    const origTick = HarvestEffects.tickSprite;
    // Monkey-patch on the instance is messy; use simple closure stored on sprite instead:
    self.__collapseUpdate = (dt: number) => {
      self.__collapseElapsed += dt;
      const t = Math.min(1, self.__collapseElapsed / durationMs);
      sprite.scale.y = scaleY * (1 - t);
      if (t >= 1) {
        sprite.visible = false;
        delete self.__collapseUpdate;
        delete self.__collapseElapsed;
      }
    };
    // Remove the old marker so tickSprite doesn't double-update:
    delete (sprite as any).__collapseElapsed;
    void origTick; // keep lint happy
  }

  private _startFlash(sprite: Sprite, durationMs: number): void {
    const f = new ColorMatrixFilter();
    f.brightness(5, false);
    sprite.filters = [...(sprite.filters as any[] ?? []), f];
    const self = sprite as any;
    self.__flashUpdate = (dt: number) => {
      self.__flashElapsed = (self.__flashElapsed ?? 0) + dt;
      const t = Math.min(1, self.__flashElapsed / durationMs);
      try { f.brightness(1 + (1 - t) * 4, false); } catch { /* noop */ }
      if (t >= 1) {
        sprite.filters = (sprite.filters as any[] ?? []).filter((x: any) => x !== f);
        delete self.__flashUpdate;
        delete self.__flashElapsed;
      }
    };
  }

  private _startFade(sprite: Sprite, durationMs: number): void {
    const self = sprite as any;
    self.__fadeUpdate = (dt: number) => {
      self.__fadeElapsed = (self.__fadeElapsed ?? 0) + dt;
      const t = Math.min(1, self.__fadeElapsed / durationMs);
      sprite.alpha = 1 - t;
      if (t >= 1) {
        sprite.visible = false;
        delete self.__fadeUpdate;
        delete self.__fadeElapsed;
      }
    };
  }

  private _burst(
    wx: number,
    wy: number,
    palette: readonly number[],
    count: number,
    mode:   'leaf' | 'fragment' | 'spark',
  ): void {
    for (let i = 0; i < count; i++) {
      const color = palette[Math.floor(Math.random() * palette.length)];
      const size  = mode === 'spark' ? 2 + Math.random() * 2 : 3 + Math.random() * 4;
      const g = new Graphics();
      g.rect(-size / 2, -size / 2, size, size);
      g.fill({ color, alpha: 1 });
      g.position.set(wx, wy);
      this.effectLayer.addChild(g);

      let vx: number, vy: number, gravity: number;

      if (mode === 'leaf') {
        // Scatter in all directions, slight upward bias, slow fall
        const angle = Math.random() * Math.PI * 2;
        const spd   = 0.03 + Math.random() * 0.07;
        vx      = Math.cos(angle) * spd;
        vy      = Math.sin(angle) * spd - 0.025;
        gravity = 0.00007;
      } else if (mode === 'fragment') {
        // Upward parabola (explosion-like), wide spread
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
        const spd   = 0.05 + Math.random() * 0.09;
        vx      = Math.cos(angle) * spd;
        vy      = Math.sin(angle) * spd;
        gravity = 0.00013;
      } else {
        // Sparks: mostly straight up, tight column
        vx      = (Math.random() - 0.5) * 0.025;
        vy      = -(0.07 + Math.random() * 0.09);
        gravity = 0.00005;
      }

      this.particles.push({
        g, vx, vy, gravity,
        life:  1,
        decay: 0.00085 + Math.random() * 0.0007,
      });
    }
  }
}

/**
 * Convenience: tick all per-sprite closure animations stored by HarvestEffects.
 * Call from SurfaceScene.update() for each sprite in featureSprites.
 */
export function tickSpriteAnims(sprite: Sprite, deltaMs: number): void {
  const s = sprite as any;
  if (s.__collapseUpdate) s.__collapseUpdate(deltaMs);
  if (s.__flashUpdate)    s.__flashUpdate(deltaMs);
  if (s.__fadeUpdate)     s.__fadeUpdate(deltaMs);
}

/** True if sprite still has at least one pending HarvestEffects animation closure. */
export function hasSpriteAnim(sprite: Sprite): boolean {
  const s = sprite as any;
  return !!(s.__collapseUpdate || s.__flashUpdate || s.__fadeUpdate);
}
