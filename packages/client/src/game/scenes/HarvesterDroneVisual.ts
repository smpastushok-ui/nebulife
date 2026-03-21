/**
 * HarvesterDroneVisual.ts
 * Animated premium harvester drone — levitating entity with auto-harvest behaviour.
 *
 * Visual stack (bottom → top):
 *   1. shadow     — isometric oval at ground level (semi-transparent)
 *   2. trailGfx   — golden/violet plasma rings emitted while flying
 *   3. laserGfx   — pulsing vertical beam fired downward during harvesting
 *   4. bodySprite — premium_harvester_drone.png
 *   5. textLayer  — "+1 [Resource]" floating gold labels
 *
 * Spark absorption effect: individual Graphics children added/removed to the
 * parent container (world-space) during the absorb phase.
 *
 * State machine:
 *   idle (hover in place) → flying (to target cell) →
 *   harvesting (laser fires ~3 s) → absorbing (sparks + shake, 0.6 s) → idle
 */

import { Container, Graphics, Sprite, Texture, Text, TextStyle } from 'pixi.js';
import { TILE_W, TILE_H, gridToScreen } from './surface-utils.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Drone sprite scale so body fits ~1.5× tile width. */
const DRONE_SCALE   = (TILE_W * 1.5) / 512;

/** Sprite anchor: horizontal centre, bottom of drone hull. */
const ANCHOR_X      = 0.5;
const ANCHOR_Y      = 0.78;

/** Float height above ground-diamond centre (px). */
const FLOAT_HEIGHT  = 24;

/** Levitation bob amplitude (px) and period (ms). */
const BOB_AMP    = 5;
const BOB_PERIOD = 1600;

/** Flight speed grid cells / second (drones fly over obstacles). */
const FLY_SPEED  = 1.4;

/** Duration of laser-firing phase (ms). */
const HARVEST_MS = 3200;

/** Duration of absorption spark phase (ms). */
const ABSORB_MS  = 700;

/** Idle hover time between harvests (ms). */
const IDLE_MS    = 2000;

/** How often the "+1 [Resource]" label appears while harvesting (ms). */
const TEXT_INTERVAL_MS = 2000;

// ─── Types ────────────────────────────────────────────────────────────────────

type DroneState = 'idle' | 'flying' | 'harvesting' | 'absorbing';

interface TrailRing {
  x: number; y: number;
  r: number;
  maxR: number;
  alpha: number;
  color: number;  // 0xffcc44 (gold) or 0xaa44ff (violet)
}

interface AbsorbSpark {
  g:     Graphics;
  x:     number;
  y:     number;
  vx:    number;  // px / ms
  vy:    number;  // px / ms (negative = upward)
  life:  number;  // 0..1
}

interface FloatLabel {
  text:  Text;
  vy:    number;  // px / ms
  life:  number;  // 0..1
}

// ─── Class ────────────────────────────────────────────────────────────────────

export class HarvesterDroneVisual {
  public readonly container: Container;

  /** Current fractional grid position. */
  public col: number;
  public row: number;

  /**
   * Set to true for exactly one frame when the absorption phase begins.
   * SurfaceScene reads this and calls harvestFx.screenShake() + triggers audio/haptic.
   */
  public screenShakeRequested = false;

  // ── Visual layers ──────────────────────────────────────────────────────────
  private shadow:      Graphics;
  private trailGfx:   Graphics;
  private laserGfx:   Graphics;
  private bodySprite:  Sprite;
  private textLayer:   Container;

  // ── Particle pools ────────────────────────────────────────────────────────
  private trailRings:  TrailRing[]    = [];
  private sparks:      AbsorbSpark[]  = [];
  private floatLabels: FloatLabel[]   = [];

  // ── Animation state ───────────────────────────────────────────────────────
  private state:      DroneState = 'idle';
  private timeMs:     number     = 0;
  private stateMs:    number     = 0;
  private bobY:       number     = 0;

  /** Target cell for the current fly/harvest cycle. */
  private targetCol: number = 0;
  private targetRow: number = 0;

  /** Human-readable resource name for the "+1" label (Ukrainian). */
  private resourceLabel = 'Ресурс';

  /** Tracks when the last "+1" label was emitted (avoids double-fire). */
  private lastLabelMs = -TEXT_INTERVAL_MS;

  /** Trail emission timer. */
  private trailEmitMs = 0;

  // ── External callbacks ────────────────────────────────────────────────────
  private readonly findTarget?:  () => { col: number; row: number; label: string } | null;
  private readonly onHarvest?:   (col: number, row: number) => void;

  // ─── Constructor ──────────────────────────────────────────────────────────

  constructor(
    startCol: number,
    startRow: number,
    texture: Texture,
    /** Optional: called every IDLE phase to discover the next resource cell. */
    findTarget?: () => { col: number; row: number; label: string } | null,
    /** Optional: called when the drone finishes absorbing a resource. */
    onHarvest?:  (col: number, row: number) => void,
  ) {
    this.col = startCol;
    this.row = startRow;
    this.targetCol = startCol;
    this.targetRow = startRow;
    this.findTarget = findTarget;
    this.onHarvest  = onHarvest;

    this.container = new Container();
    this.container.zIndex = 9998;

    // Build visual stack
    this.shadow     = new Graphics();
    this.trailGfx   = new Graphics();
    this.laserGfx   = new Graphics();
    this.bodySprite  = new Sprite(texture);
    this.textLayer  = new Container();

    this.bodySprite.anchor.set(ANCHOR_X, ANCHOR_Y);
    this.bodySprite.scale.set(DRONE_SCALE);

    this.container.addChild(this.shadow);
    this.container.addChild(this.trailGfx);
    this.container.addChild(this.laserGfx);
    this.container.addChild(this.bodySprite);
    this.container.addChild(this.textLayer);

    this._updatePosition();
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /** Force-assign a harvest target from outside (e.g. for testing / gameplay). */
  setTarget(col: number, row: number, label = 'Ресурс'): void {
    if (this.state === 'harvesting' || this.state === 'absorbing') return;
    this.targetCol    = col;
    this.targetRow    = row;
    this.resourceLabel = label;
    this.state        = 'flying';
    this.stateMs      = 0;
  }

  /** Main tick — call every frame from SurfaceScene.update(). */
  update(deltaMs: number): void {
    this.timeMs  += deltaMs;
    this.stateMs += deltaMs;
    this.screenShakeRequested = false;

    // ── Levitation bob (always active) ────────────────────────────────────
    const targetBob = Math.sin((this.timeMs / BOB_PERIOD) * Math.PI * 2) * BOB_AMP;
    this.bobY += (targetBob - this.bobY) * 0.10;

    // ── State machine ─────────────────────────────────────────────────────
    switch (this.state) {
      case 'idle':
        if (this.stateMs >= IDLE_MS) this._pickNextTarget();
        break;

      case 'flying':
        this._stepToward(deltaMs);
        // Emit trail particles while airborne
        this.trailEmitMs += deltaMs;
        if (this.trailEmitMs >= 55) {
          this.trailEmitMs = 0;
          this._emitTrail();
        }
        break;

      case 'harvesting':
        // Emit "+1" label periodically
        if (this.timeMs - this.lastLabelMs >= TEXT_INTERVAL_MS) {
          this.lastLabelMs = this.timeMs;
          this._spawnLabel(`+1 ${this.resourceLabel}`);
        }
        if (this.stateMs >= HARVEST_MS) {
          this.state  = 'absorbing';
          this.stateMs = 0;
          this._triggerAbsorption();   // sets screenShakeRequested = true
        }
        break;

      case 'absorbing':
        if (this.stateMs >= ABSORB_MS) {
          // Notify gameplay layer
          if (this.onHarvest) this.onHarvest(Math.round(this.targetCol), Math.round(this.targetRow));
          // Emit final "+1" label on absorption completion
          this._spawnLabel(`+1 ${this.resourceLabel}`);
          this.lastLabelMs = this.timeMs;
          // Return to idle
          this.state  = 'idle';
          this.stateMs = 0;
        }
        break;
    }

    // ── Tick particle pools ───────────────────────────────────────────────
    this._tickTrail(deltaMs);
    this._tickSparks(deltaMs);
    this._tickLabels(deltaMs);

    // ── Draw animated layers ──────────────────────────────────────────────
    this._drawShadow();
    this._drawTrail();
    this._drawLaser();
    this._updatePosition();
  }

  destroy(): void {
    for (const s of this.sparks)      s.g.destroy();
    for (const l of this.floatLabels) l.text.destroy();
    this.container.destroy({ children: true });
  }

  // ─── State transitions ────────────────────────────────────────────────────

  private _pickNextTarget(): void {
    if (this.findTarget) {
      const res = this.findTarget();
      if (res) {
        this.targetCol    = res.col;
        this.targetRow    = res.row;
        this.resourceLabel = res.label;
        this.state        = 'flying';
        this.stateMs      = 0;
        return;
      }
    }
    // No resource nearby — stay idle for another cycle
    this.stateMs = 0;
  }

  // ─── Movement ─────────────────────────────────────────────────────────────

  private _stepToward(deltaMs: number): void {
    const dc   = this.targetCol - this.col;
    const dr   = this.targetRow - this.row;
    const dist = Math.sqrt(dc * dc + dr * dr);

    if (dist < 0.06) {
      this.col     = this.targetCol;
      this.row     = this.targetRow;
      this.state   = 'harvesting';
      this.stateMs = 0;
      // Emit first "+1" immediately on arrival
      this.lastLabelMs = this.timeMs - TEXT_INTERVAL_MS;
      return;
    }

    const step = FLY_SPEED * (deltaMs / 1000);
    const s    = Math.min(step, dist);
    this.col  += (dc / dist) * s;
    this.row  += (dr / dist) * s;
  }

  // ─── Trail plasma rings ───────────────────────────────────────────────────

  private _emitTrail(): void {
    const { x, y } = gridToScreen(this.col, this.row);
    const bodyY = y - FLOAT_HEIGHT + this.bobY;

    // Alternate gold and violet
    const colors = [0xffcc44, 0xaa44ff];
    for (const color of colors) {
      this.trailRings.push({
        x: x + (Math.random() - 0.5) * 8,
        y: bodyY + FLOAT_HEIGHT * 0.4 + (Math.random() - 0.5) * 4,  // near undercarriage
        r: 2,
        maxR: 10 + Math.random() * 7,
        alpha: 0.55,
        color,
      });
    }
  }

  private _tickTrail(deltaMs: number): void {
    for (let i = this.trailRings.length - 1; i >= 0; i--) {
      const p = this.trailRings[i];
      // Expand toward maxR, fade out
      p.r     += (p.maxR - p.r) * 0.05;
      p.alpha -= 0.0014 * deltaMs;
      if (p.alpha <= 0) this.trailRings.splice(i, 1);
    }
  }

  // ─── Absorption effect ────────────────────────────────────────────────────

  private _triggerAbsorption(): void {
    this.screenShakeRequested = true;

    const { x, y } = gridToScreen(this.col, this.row);
    const groundY   = y + TILE_H / 2;
    const bodyY     = y - FLOAT_HEIGHT + this.bobY;

    const colors = [0xffcc44, 0xaa44ff, 0xff8800, 0xffffff, 0x44ffcc];
    const count  = 20;

    for (let i = 0; i < count; i++) {
      const color = colors[i % colors.length];
      const size  = 2 + Math.random() * 2.5;
      const g     = new Graphics();
      g.rect(-size / 2, -size / 2, size, size);
      g.fill({ color, alpha: 1 });

      // Spawn from ground level, spread horizontally around tile centre
      const spawnX = x + (Math.random() - 0.5) * TILE_W * 0.6;
      const spawnY = groundY - Math.random() * 6;
      g.position.set(spawnX, spawnY);

      // Anti-gravity: converge toward drone body above
      const dx     = x - spawnX;
      const totalY = Math.abs(bodyY - spawnY);
      // Travel ~ABSORB_MS ms — split into vx/vy over life
      const lifeMs = ABSORB_MS * (0.6 + Math.random() * 0.4);
      const vx = (dx + (Math.random() - 0.5) * 10) / lifeMs;
      const vy = -(totalY + 4 + Math.random() * 8) / lifeMs;

      // Add to worldContainer (roverLayer), not to textLayer, so they are in world space
      this.container.addChild(g);

      this.sparks.push({
        g,
        x: spawnX,
        y: spawnY,
        vx,
        vy,
        life: 1,
      });
    }
  }

  private _tickSparks(deltaMs: number): void {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x    += s.vx * deltaMs;
      s.y    += s.vy * deltaMs;
      s.life -= (1 / ABSORB_MS) * deltaMs * (0.7 + Math.random() * 0.3);
      s.g.position.set(s.x, s.y);
      s.g.alpha = Math.max(0, s.life);
      if (s.life <= 0) {
        s.g.destroy();
        this.sparks.splice(i, 1);
      }
    }
  }

  // ─── Floating "+1" labels ─────────────────────────────────────────────────

  private _spawnLabel(text: string): void {
    const { x, y } = gridToScreen(this.col, this.row);
    const labelY    = y - FLOAT_HEIGHT - 14 + this.bobY;

    const style = new TextStyle({
      fontFamily: 'monospace',
      fontSize:   11,
      fill:       '#ffcc44',
      stroke:     { color: '#000000', width: 2.5 },
    });
    const lbl = new Text({ text, style });
    lbl.anchor.set(0.5, 1);
    lbl.position.set(x, labelY);
    this.textLayer.addChild(lbl);

    this.floatLabels.push({
      text: lbl,
      vy:   -0.038,   // px / ms upward drift
      life:  1,
    });
  }

  private _tickLabels(deltaMs: number): void {
    for (let i = this.floatLabels.length - 1; i >= 0; i--) {
      const l = this.floatLabels[i];
      l.text.y += l.vy * deltaMs;
      l.life   -= 0.00095 * deltaMs;
      l.text.alpha = Math.max(0, l.life);
      if (l.life <= 0) {
        l.text.destroy();
        this.floatLabels.splice(i, 1);
      }
    }
  }

  // ─── Drawing ──────────────────────────────────────────────────────────────

  /** Isometric oval shadow at ground level — wider when the drone is higher. */
  private _drawShadow(): void {
    const { x, y } = gridToScreen(this.col, this.row);
    const groundY   = y + TILE_H / 2;
    const rw = 18;
    const rh = 6.5;
    this.shadow.clear();
    this.shadow.ellipse(x, groundY, rw, rh);
    this.shadow.fill({ color: 0x000000, alpha: 0.25 });
  }

  /** Draw the trail plasma rings (concentric, expanding, fading). */
  private _drawTrail(): void {
    this.trailGfx.clear();
    for (const p of this.trailRings) {
      if (p.alpha <= 0) continue;
      // 3 rings per particle for soft glow appearance
      for (let i = 0; i < 3; i++) {
        const r = p.r * (i + 1) / 3;
        const a = p.alpha * (0.55 - i * 0.15);
        if (a <= 0) continue;
        this.trailGfx.circle(p.x, p.y, r);
        this.trailGfx.fill({ color: p.color, alpha: a });
      }
    }
  }

  /**
   * Pulsing vertical laser beam from drone body core to ground.
   * Active only in 'harvesting' state.
   */
  private _drawLaser(): void {
    this.laserGfx.clear();
    if (this.state !== 'harvesting') return;

    const { x, y } = gridToScreen(this.col, this.row);
    const bodyY     = y - FLOAT_HEIGHT + this.bobY;
    const groundY   = y + TILE_H / 2;

    // Pulse: 0..1..0 cycle (600 ms period)
    const pulse      = 0.5 + 0.5 * Math.sin((this.timeMs / 600) * Math.PI * 2);
    const coreAlpha  = 0.45 + 0.50 * pulse;
    const glowAlpha  = 0.08 + 0.14 * pulse;

    // Outer soft glow (wide, low alpha) — 3 widths
    for (let w = 10; w >= 4; w -= 3) {
      this.laserGfx.moveTo(x, bodyY + 6);
      this.laserGfx.lineTo(x, groundY);
      this.laserGfx.stroke({ color: 0xffdd55, width: w, alpha: glowAlpha * (1 - w / 14) });
    }

    // Core beam (narrow, bright)
    this.laserGfx.moveTo(x, bodyY + 6);
    this.laserGfx.lineTo(x, groundY);
    this.laserGfx.stroke({ color: 0xfff0aa, width: 1.5, alpha: coreAlpha });

    // Impact splash at ground
    const splashR = 3.5 + 3 * pulse;
    this.laserGfx.circle(x, groundY, splashR);
    this.laserGfx.fill({ color: 0xffcc44, alpha: 0.35 + 0.40 * pulse });
    // Outer splash ring
    this.laserGfx.circle(x, groundY, splashR * 1.9);
    this.laserGfx.fill({ color: 0xffcc44, alpha: 0.10 + 0.12 * pulse });
  }

  /** Move the sprite to the current (col, row) + bob offset. */
  private _updatePosition(): void {
    const { x, y } = gridToScreen(this.col, this.row);
    this.bodySprite.position.set(x, y - FLOAT_HEIGHT + this.bobY);
  }
}
