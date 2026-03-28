/**
 * ResearcherBot.ts
 * Sprite-based levitating research bot with A* pathfinding and animated engine effects.
 *
 * Visual stack (bottom → top):
 *   1. shadow       — ellipse at ground level, wider when airborne
 *   2. distortion   — expanding concentric rings below engines (heat haze simulation)
 *   3. engineGlow   — pulsing yellow/orange circles at engine pod positions
 *   4. bodySprite   — bot_resercher.png (flying) or bot_resercher_off.png (idle)
 *
 * State machine:
 *   startup (800ms) → flying → idle_countdown (3000ms) → idle (1500ms fade)
 *   setTarget() while idle/startup → restart
 */

import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { TILE_W, TILE_H, gridToScreen } from './surface-utils.js';

// ─── Public constants ─────────────────────────────────────────────────────────

/** Bot movement speed in grid cells per second. */
export const BOT_SPEED = 1.5;

/** Fog-of-war reveal radius around the bot. */
export const BOT_REVEAL_RADIUS = 3;

// ─── Private constants ────────────────────────────────────────────────────────

/** Sprite scale so the bot body fits within 1 tile width at zoom=1. */
const BOT_SCALE = TILE_W / 1024;   // 0.125

/** Sprite anchor: horizontal center, just below the undercarriage. */
const ANCHOR_X = 0.5;
const ANCHOR_Y = 0.86;

/** How high (px) the bot floats above the ground when fully airborne. */
const FLOAT_HEIGHT = 14;

/** Levitation bob amplitude (px). */
const BOB_AMP = 5;
const BOB_PERIOD = 1800;  // ms

/** Time to spin engines up/down (ms). */
const STARTUP_MS  = 800;
const SHUTDOWN_MS = 1500;

/** How long the bot hovers in place before shutting engines off (ms). */
const IDLE_COUNTDOWN_MS = 3000;

// ─── Fuel / isotope cost ─────────────────────────────────────────────────────

/** Isotope cost per grid cell crossed. */
export const BOT_ISOTOPE_COST_PER_CELL = 4;

/** Fuel bar visual dimensions (px). */
const FUEL_BAR_W = 24;
const FUEL_BAR_H = 3;

/**
 * Engine pod screen offsets relative to sprite.position (in screen px at zoom=1).
 * Derived from sprite texture: engine pods at ~x=200,350,670,820  y=800 of 1024px image.
 * Scaled by BOT_SCALE (0.25) and subtracted from anchor (512, 880).
 */
const ENGINE_OFFSETS = [
  { x: -36, y: -9 },   // left-outer
  { x: -19, y: -9 },   // left-inner
  { x:  19, y: -9 },   // right-inner
  { x:  36, y: -9 },   // right-outer
] as const;

// ─── State type ───────────────────────────────────────────────────────────────

type BotState = 'startup' | 'flying' | 'idle_countdown' | 'idle';

// ─── A* types ─────────────────────────────────────────────────────────────────

interface ANode {
  c: number; r: number;
  g: number; f: number;
  parent: ANode | null;
}

// ─── Class ────────────────────────────────────────────────────────────────────

export class ResearcherBot {
  public readonly container: Container;

  /** Current grid position (float for smooth movement). */
  public col: number;
  public row: number;

  // ── Visual layers ──────────────────────────────────────────────────────────
  private shadow:       Graphics;
  private distortion:   Graphics;   // heat-haze rings at ground level
  private smoke:        Graphics;   // turbine exhaust puffs drifting downward
  private engineGlow:   Graphics;   // pulsing yellow circles at engine level
  private bodySprite:   Sprite;

  private readonly flyTex:  Texture;
  private readonly idleTex: Texture;

  // ── Animation state ────────────────────────────────────────────────────────
  private state:         BotState = 'idle';
  private timeMs:        number = 0;
  private idleTimerMs:   number = 0;
  private engineAlpha:   number = 0;   // 0=off, 1=full
  private heightOffset:  number = 0;   // current px above ground
  private bobY:          number = 0;   // smooth bob interpolation
  private bankAngle:     number = 0;   // smooth left/right tilt in radians

  // ── Player control ────────────────────────────────────────────────────────
  /** Whether the bot is active (player can toggle via popup). */
  public active = true;

  // ── Isotope fuel ──────────────────────────────────────────────────────────
  /** Callback: attempts to consume `amount` isotopes. Returns true if sufficient. */
  public onConsumeIsotopes: ((amount: number) => boolean) | null = null;
  private fuelBarGfx: Graphics;

  /** Mobile mode — skip heavy visual effects (distortion, bloom, smoke). */
  public isMobile = false;

  // ── Pathfinding ────────────────────────────────────────────────────────────
  private path: Array<{ col: number; row: number }> = [];

  // ─── Constructor ────────────────────────────────────────────────────────────

  constructor(
    startCol: number,
    startRow: number,
    flyTexture: Texture,
    idleTexture: Texture,
  ) {
    this.col     = startCol;
    this.row     = startRow;
    this.flyTex  = flyTexture;
    this.idleTex = idleTexture;

    this.container = new Container();
    this.container.zIndex = 9999;

    // Build the visual stack
    this.shadow      = new Graphics();
    this.distortion  = new Graphics();
    this.smoke       = new Graphics();
    this.engineGlow  = new Graphics();
    this.bodySprite  = new Sprite(idleTexture);

    this.bodySprite.anchor.set(ANCHOR_X, ANCHOR_Y);
    this.bodySprite.scale.set(BOT_SCALE);

    this.fuelBarGfx = new Graphics();

    this.container.addChild(this.shadow);
    this.container.addChild(this.distortion);
    this.container.addChild(this.smoke);
    this.container.addChild(this.bodySprite);
    this.container.addChild(this.engineGlow);
    this.container.addChild(this.fuelBarGfx);

    this._drawShadow();
    this._updatePosition();
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Set a movement target.
   * Runs A* to compute a collision-free path around obstacles.
   */
  setTarget(
    col: number,
    row: number,
    obstacleSet: Set<string>,
    gridSize: number,
  ): void {
    if (!this.active) return;  // player paused bot — ignore commands

    const sc = Math.round(this.col);
    const sr = Math.round(this.row);
    const ec = Math.max(0, Math.min(gridSize - 1, col));
    const er = Math.max(0, Math.min(gridSize - 1, row));

    this.path = this._findPath(sc, sr, ec, er, obstacleSet, gridSize);

    if (this.path.length > 0 && this.state !== 'startup') {
      this.state = 'startup';
      // Keep engineAlpha where it is so fade-in is smooth if engines were already running
    }
  }

  /** Returns true if the bot is currently moving. */
  isMoving(): boolean {
    return this.path.length > 0;
  }

  /**
   * Advance all animations and movement.
   * Returns true when the bot crosses into a new grid cell (triggers fog reveal).
   */
  update(deltaMs: number, isotopes: number = Infinity): boolean {
    this.timeMs += deltaMs;
    let crossedCell = false;

    // ── Player deactivation ──────────────────────────────────────────────────
    if (!this.active && (this.state === 'flying' || this.state === 'startup')) {
      this.path = [];
      this.state = 'idle_countdown';
      this.idleTimerMs = 0;
    }

    // ── State machine ────────────────────────────────────────────────────────

    switch (this.state) {
      case 'startup':
        this.engineAlpha = Math.min(1, this.engineAlpha + deltaMs / STARTUP_MS);
        this.heightOffset = Math.min(FLOAT_HEIGHT, this.heightOffset + deltaMs * (FLOAT_HEIGHT / STARTUP_MS));
        if (this.engineAlpha >= 1) {
          this.state = 'flying';
        }
        break;

      case 'flying':
        this.heightOffset = FLOAT_HEIGHT;
        if (this.path.length > 0) {
          crossedCell = this._stepAlongPath(deltaMs);
        } else {
          this.state = 'idle_countdown';
          this.idleTimerMs = 0;
        }
        break;

      case 'idle_countdown':
        this.idleTimerMs += deltaMs;
        // If a new path arrives here, go back to flying immediately
        if (this.path.length > 0) {
          this.state = 'flying';
        } else if (this.idleTimerMs >= IDLE_COUNTDOWN_MS) {
          this.state = 'idle';
        }
        break;

      case 'idle':
        this.engineAlpha = Math.max(0, this.engineAlpha - deltaMs / SHUTDOWN_MS);
        this.heightOffset = Math.max(0, this.heightOffset - deltaMs * (FLOAT_HEIGHT / SHUTDOWN_MS));
        // New path restarts engines
        if (this.path.length > 0) {
          this.state = 'startup';
        }
        break;
    }

    // ── Bob animation (smooth sin wave) ─────────────────────────────────────

    const isAirborne = this.state === 'flying' || this.state === 'startup' || this.state === 'idle_countdown';
    const targetBob = isAirborne
      ? Math.sin((this.timeMs / BOB_PERIOD) * Math.PI * 2) * BOB_AMP
      : 0;
    this.bobY += (targetBob - this.bobY) * 0.08;

    // Smoothly level out when not moving
    if (this.path.length === 0) {
      this.bankAngle += (0 - this.bankAngle) * 0.06;
      this.bodySprite.rotation = this.bankAngle;
      this.engineGlow.rotation = this.bankAngle;
    }

    // ── Sprite texture switch ────────────────────────────────────────────────

    const useFlying = this.engineAlpha > 0.05;
    if (useFlying && this.bodySprite.texture !== this.flyTex) {
      this.bodySprite.texture = this.flyTex;
    } else if (!useFlying && this.bodySprite.texture !== this.idleTex) {
      this.bodySprite.texture = this.idleTex;
    }

    // ── Draw animated layers ─────────────────────────────────────────────────

    this._drawShadow();
    this._drawEngineEffects();
    this._drawSmoke();
    this._updatePosition();
    this._drawFuelBar(isotopes);

    return crossedCell;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  // ─── Movement ────────────────────────────────────────────────────────────────

  private _stepAlongPath(deltaMs: number): boolean {
    if (this.path.length === 0) return false;

    const next  = this.path[0];
    const dc    = next.col - this.col;
    const dr    = next.row - this.row;
    const dist  = Math.sqrt(dc * dc + dr * dr);
    const step  = BOT_SPEED * (deltaMs / 1000);

    // Bank angle: lean slightly into the screen-space horizontal direction of travel
    const finalTarget = this.path[this.path.length - 1];
    const odc = finalTarget.col - this.col;
    const odr = finalTarget.row - this.row;
    const odist = Math.sqrt(odc * odc + odr * odr);
    const targetBank = odist > 0.1 ? -(odc - odr) / odist * 0.20 : 0;
    this.bankAngle += (targetBank - this.bankAngle) * 0.06;
    this.bodySprite.rotation = this.bankAngle;
    this.engineGlow.rotation = this.bankAngle;

    const prevIntCol = Math.round(this.col);
    const prevIntRow = Math.round(this.row);

    if (step >= dist) {
      this.col = next.col;
      this.row = next.row;
      this.path.shift();
    } else {
      this.col += (dc / dist) * step;
      this.row += (dr / dist) * step;
    }

    const crossed = Math.round(this.col) !== prevIntCol || Math.round(this.row) !== prevIntRow;

    // Deduct isotopes when crossing into a new cell
    if (crossed && this.onConsumeIsotopes) {
      const ok = this.onConsumeIsotopes(BOT_ISOTOPE_COST_PER_CELL);
      if (!ok) {
        // Not enough isotopes — stop exploring
        this.path = [];
      }
    }

    return crossed;
  }

  // ─── Drawing ─────────────────────────────────────────────────────────────────

  private _drawShadow(): void {
    const h  = this.heightOffset / FLOAT_HEIGHT;  // 0=ground, 1=max height
    const rw = 22 + h * 18;   // half-width px: 22 → 40
    const rh = 8  + h * 6;    // half-height (isometric flatten): 8 → 14
    const alpha = 0.22 - h * 0.08;   // subtle: 0.22 → 0.14 when high
    this.shadow.clear();
    this.shadow.ellipse(0, 0, rw, rh);
    this.shadow.fill({ color: 0x000000, alpha });
  }

  private _drawSmoke(): void {
    this.smoke.clear();
    if (this.engineAlpha < 0.1) return;
    // Skip smoke entirely on mobile — 16 circle fills per frame
    if (this.isMobile) return;

    const a     = this.engineAlpha;
    const t     = this.timeMs;
    // Smoke only visible when airborne (engines are on and bot is rising/flying)
    const isAirborne = this.state === 'flying' || this.state === 'startup' || this.state === 'idle_countdown';
    if (!isAirborne) return;

    // 4 puffs per engine, each on a staggered cycle of 1200ms
    const CYCLE  = 1200;
    const NPUFFS = 4;
    // Smoke drifts downward from the engine (bodyY) toward ground level.
    // In _updatePosition smoke.position is set to bodyY (same as engineGlow).
    // Drift distance in screen px (downward = +y):
    const driftY = this.heightOffset + TILE_H / 2;

    // Size and opacity scale with current height — larger and more transparent when high up
    const heightFactor = this.heightOffset / FLOAT_HEIGHT;  // 0..1

    for (const off of ENGINE_OFFSETS) {
      for (let i = 0; i < NPUFFS; i++) {
        const phase   = ((t / CYCLE) + i / NPUFFS) % 1;
        const fadeIn  = Math.min(phase * 4, 1);
        const fadeOut = 1 - phase;
        const alpha   = fadeIn * fadeOut * (0.08 + 0.06 * heightFactor) * a;
        if (alpha < 0.003) continue;

        const py = off.y + phase * driftY;
        const r  = (4 + heightFactor * 8) + phase * (8 + heightFactor * 10);
        this.smoke.circle(off.x, py, r);
        this.smoke.fill({ color: 0xcccccc, alpha });
      }
    }
  }

  private _drawEngineEffects(): void {
    this.engineGlow.clear();
    this.distortion.clear();

    if (this.engineAlpha < 0.02) return;

    const a = this.engineAlpha;
    const t = this.timeMs;

    // ── Mobile: minimal glow only (skip distortion + bloom rings entirely) ──
    if (this.isMobile) {
      for (const off of ENGINE_OFFSETS) {
        this.engineGlow.circle(off.x, off.y, 5 * a);
        this.engineGlow.fill({ color: 0xff8800, alpha: 0.15 * a });
      }
      return;
    }

    // ── Desktop: full effects ───────────────────────────────────────────────
    // Slow heat shimmer: 3 s period — simulates thermal bloom around the sprite's own glow
    const shimmer = 0.7 + 0.3 * Math.sin((t / 3000) * Math.PI * 2);

    for (const off of ENGINE_OFFSETS) {
      // Heat bloom: 6 concentric translucent rings diffusing the engine glow outward.
      const maxR = 7 * a;
      for (let i = 0; i < 6; i++) {
        const r     = maxR * (i + 1) / 6;
        const alpha = (0.09 - i * 0.013) * a * shimmer;
        this.engineGlow.circle(off.x, off.y, r);
        this.engineGlow.fill({ color: 0xff8800, alpha });
      }

      // Per-engine small mirage rings expanding outward
      for (let i = 0; i < 2; i++) {
        const phase     = ((t / 2200) + i * 0.5) % 1;
        const ringR     = (4 + i * 5) * phase * a;
        const ringAlpha = (1 - phase) * 0.06 * a * shimmer;
        this.distortion.ellipse(off.x, 0, ringR * 2.2, ringR * 0.7);
        this.distortion.stroke({ color: 0xffffff, width: 1, alpha: ringAlpha });
      }
    }

    // Central mirage zone — translucent wavy rings simulating heat shimmer on the ground.
    const NRINGS = 10;
    for (let i = 0; i < NRINGS; i++) {
      const baseR  = 12 + i * 7;
      const wave   = Math.sin((t / 1200) * Math.PI * 2 + i * 0.6) * 2;
      const r      = (baseR + wave) * a;
      const alpha  = (0.10 - i * 0.008) * a * shimmer;
      this.distortion.ellipse(0, 0, r * 1.7, r * 0.5);
      this.distortion.stroke({ color: 0xffffff, width: 0.8, alpha });
    }
  }

  private _updatePosition(): void {
    const { x, y }  = gridToScreen(this.col, this.row);
    const groundY   = y + TILE_H / 2;
    const bodyY     = y - this.heightOffset + this.bobY;

    // Shadow and distortion rings stay at ground level
    this.shadow.position.set(x, groundY);
    this.distortion.position.set(x, groundY);

    // Smoke, engine glow, and body sprite rise with the bot
    this.smoke.position.set(x, bodyY);
    this.engineGlow.position.set(x, bodyY);
    this.bodySprite.position.set(x, bodyY);
  }

  /** Draw a small isotope fuel bar below the drone sprite. */
  private _drawFuelBar(isotopes: number): void {
    this.fuelBarGfx.clear();
    if (this.isMobile) return; // Skip fuel bar on mobile
    const cost = BOT_ISOTOPE_COST_PER_CELL;
    // Hide bar when isotopes are plentiful and bot is idle
    if (isotopes >= cost * 10 && this.state === 'idle') return;

    const { x, y } = gridToScreen(this.col, this.row);
    const barY = y + TILE_H / 2 + 4;   // just below ground shadow
    const barX = x - FUEL_BAR_W / 2;

    // Background
    this.fuelBarGfx.rect(barX, barY, FUEL_BAR_W, FUEL_BAR_H);
    this.fuelBarGfx.fill({ color: 0x111122, alpha: 0.6 });

    // Fill proportional to isotopes / (cost * 5)
    const ratio = Math.min(1, isotopes / (cost * 5));
    const fillW = ratio * FUEL_BAR_W;
    const color = isotopes >= cost * 3 ? 0x44ff88
                : isotopes >= cost     ? 0xff8844
                :                        0xcc4444;
    const pulseAlpha = isotopes < cost ? 0.5 + 0.4 * Math.sin(this.timeMs / 200) : 1;

    if (fillW > 0) {
      this.fuelBarGfx.rect(barX, barY, fillW, FUEL_BAR_H);
      this.fuelBarGfx.fill({ color, alpha: 0.85 * pulseAlpha });
    }
  }

  // ─── A* Pathfinding ───────────────────────────────────────────────────────────

  private _findPath(
    sc: number, sr: number,
    ec: number, er: number,
    obstacles: Set<string>,
    N: number,
  ): Array<{ col: number; row: number }> {
    if (sc === ec && sr === er) return [];

    const key   = (c: number, r: number) => `${c},${r}`;
    const h     = (c: number, r: number) => Math.abs(c - ec) + Math.abs(r - er);

    const open:    ANode[] = [];
    const closed   = new Set<string>();
    const gScore   = new Map<string, number>();

    const startNode: ANode = { c: sc, r: sr, g: 0, f: h(sc, sr), parent: null };
    open.push(startNode);
    gScore.set(key(sc, sr), 0);

    const DIRS = [
      [1, 0], [0, 1], [-1, 0], [0, -1],
      [1, 1], [-1, 1], [1, -1], [-1, -1],
    ] as const;

    while (open.length > 0) {
      // Pop node with lowest f score
      let best = 0;
      for (let i = 1; i < open.length; i++) {
        if (open[i].f < open[best].f) best = i;
      }
      const cur = open[best];
      open.splice(best, 1);

      if (cur.c === ec && cur.r === er) {
        // Reconstruct path (skip start node)
        const path: Array<{ col: number; row: number }> = [];
        let node: ANode | null = cur;
        while (node) {
          path.unshift({ col: node.c, row: node.r });
          node = node.parent;
        }
        path.shift();
        return path;
      }

      const ck = key(cur.c, cur.r);
      closed.add(ck);

      for (const [dc, dr] of DIRS) {
        const nc = cur.c + dc;
        const nr = cur.r + dr;
        if (nc < 0 || nc >= N || nr < 0 || nr >= N) continue;

        const nk = key(nc, nr);
        if (closed.has(nk)) continue;

        if (obstacles.has(nk)) continue;

        const diag = dc !== 0 && dr !== 0;
        const ng   = cur.g + (diag ? 1.414 : 1.0);

        const existing = gScore.get(nk);
        if (existing !== undefined && ng >= existing) continue;

        gScore.set(nk, ng);
        open.push({ c: nc, r: nr, g: ng, f: ng + h(nc, nr), parent: cur });
      }

      // Safety: limit search space to avoid freezing on large open grids
      if (closed.size > 400) break;
    }

    return [];  // no path found
  }
}
