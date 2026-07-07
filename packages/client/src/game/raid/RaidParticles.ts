// ---------------------------------------------------------------------------
// RaidParticles — pooled ParticleContainer FX (engine trails, hit sparks,
// debris). NEXT_GEN_PLAN.md section A.2: hard per-tier budgets, object pool,
// zero per-frame allocations.
//
// A single ParticleContainer with one shared soft-circle texture backs every
// particle kind (trail/spark/debris) — tint + scale distinguish them. All
// particles live in a fixed-size pool; spawn just recycles the oldest free
// slot instead of allocating.
// ---------------------------------------------------------------------------

import { Container, Graphics, Particle, ParticleContainer, Texture, type Renderer } from 'pixi.js';

export type RaidParticleKind = 'trail' | 'spark' | 'debris';

interface Slot {
  particle: Particle;
  active: boolean;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  drag: number;
  spin: number;
  fadeOut: boolean;
  baseScale: number;
  growth: number;
}

function buildSoftCircleTexture(renderer: Renderer): Texture {
  const g = new Graphics();
  // Three concentric passes approximate a radial falloff without a shader —
  // consistent with the GAME_BIBLE "no blur filters" rule.
  g.circle(0, 0, 16).fill({ color: 0xffffff, alpha: 0.16 });
  g.circle(0, 0, 10).fill({ color: 0xffffff, alpha: 0.32 });
  g.circle(0, 0, 5).fill({ color: 0xffffff, alpha: 0.65 });
  g.circle(0, 0, 2.2).fill({ color: 0xffffff, alpha: 1 });
  const texture = renderer.generateTexture({ target: g, resolution: 2 });
  g.destroy();
  return texture;
}

export class RaidParticles {
  readonly container: ParticleContainer;
  private readonly slots: Slot[];
  private readonly free: number[] = [];
  private texture: Texture | null = null;

  constructor(renderer: Renderer, budget: number) {
    this.texture = buildSoftCircleTexture(renderer);
    this.container = new ParticleContainer({
      texture: this.texture,
      dynamicProperties: { position: true, rotation: false, vertex: true, uvs: false, color: true },
    });
    this.slots = new Array(budget);
    for (let i = 0; i < budget; i++) {
      const particle = new Particle({ texture: this.texture, anchorX: 0.5, anchorY: 0.5, alpha: 0 });
      this.slots[i] = {
        particle,
        active: false,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        drag: 1,
        spin: 0,
        fadeOut: true,
        baseScale: 1,
        growth: 0,
      };
      this.container.addParticle(particle);
      this.free.push(i);
    }
  }

  private acquire(): Slot | null {
    const idx = this.free.pop();
    if (idx === undefined) return null;
    return this.slots[idx];
  }

  /** Engine trail dot — spawned every few frames behind a moving ship. */
  spawnTrail(x: number, y: number, tint: number, scale = 1): void {
    const slot = this.acquire();
    if (!slot) return;
    slot.active = true;
    slot.vx = 0;
    slot.vy = 0;
    slot.drag = 1;
    slot.spin = 0;
    slot.fadeOut = true;
    slot.baseScale = 0.42 * scale;
    slot.growth = -0.55 * scale;
    slot.life = slot.maxLife = 0.34;
    const p = slot.particle;
    p.x = x;
    p.y = y;
    p.scaleX = p.scaleY = slot.baseScale;
    p.alpha = 0.55;
    p.tint = tint;
  }

  /** Hit spark burst — a handful of fast, short-lived particles at an impact point. */
  spawnSparks(x: number, y: number, count: number, tint: number, speedBase = 220): void {
    for (let i = 0; i < count; i++) {
      const slot = this.acquire();
      if (!slot) return;
      const angle = Math.random() * Math.PI * 2;
      const speed = speedBase * (0.5 + Math.random() * 0.8);
      slot.active = true;
      slot.vx = Math.cos(angle) * speed;
      slot.vy = Math.sin(angle) * speed;
      slot.drag = 0.88;
      slot.spin = 0;
      slot.fadeOut = true;
      slot.baseScale = 0.5 + Math.random() * 0.35;
      slot.growth = -0.9;
      slot.life = slot.maxLife = 0.22 + Math.random() * 0.16;
      const p = slot.particle;
      p.x = x;
      p.y = y;
      p.scaleX = p.scaleY = slot.baseScale;
      p.alpha = 1;
      p.tint = tint;
    }
  }

  /** Debris — slower tumbling fragments from a kill / module destruction. */
  spawnDebris(x: number, y: number, count: number, tint: number): void {
    for (let i = 0; i < count; i++) {
      const slot = this.acquire();
      if (!slot) return;
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 160;
      slot.active = true;
      slot.vx = Math.cos(angle) * speed;
      slot.vy = Math.sin(angle) * speed;
      slot.drag = 0.94;
      slot.spin = (Math.random() - 0.5) * 6;
      slot.fadeOut = true;
      slot.baseScale = 0.7 + Math.random() * 0.6;
      slot.growth = -0.35;
      slot.life = slot.maxLife = 0.55 + Math.random() * 0.5;
      const p = slot.particle;
      p.x = x;
      p.y = y;
      p.scaleX = p.scaleY = slot.baseScale;
      p.alpha = 0.9;
      p.tint = tint;
    }
  }

  update(dt: number): void {
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (!slot.active) continue;
      slot.life -= dt;
      if (slot.life <= 0) {
        slot.active = false;
        slot.particle.alpha = 0;
        this.free.push(i);
        continue;
      }
      const p = slot.particle;
      p.x += slot.vx * dt;
      p.y += slot.vy * dt;
      slot.vx *= Math.pow(slot.drag, dt * 60);
      slot.vy *= Math.pow(slot.drag, dt * 60);
      if (slot.spin !== 0) p.rotation += slot.spin * dt;
      const lifePct = slot.life / slot.maxLife;
      const scale = Math.max(0.05, slot.baseScale + slot.growth * (1 - lifePct));
      p.scaleX = p.scaleY = scale;
      if (slot.fadeOut) p.alpha = Math.max(0, lifePct);
    }
  }

  /** How many particles are currently alive (for perf diagnostics only). */
  get activeCount(): number {
    return this.slots.length - this.free.length;
  }

  destroy(): void {
    this.container.destroy({ children: true });
    this.texture?.destroy(true);
    this.texture = null;
  }
}

/** Convenience — mounts the particle container above `world` but below HUD/explosions layer. */
export function attachRaidParticles(parent: Container, particles: RaidParticles): void {
  parent.addChild(particles.container);
}
