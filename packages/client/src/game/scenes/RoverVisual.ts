/**
 * RoverVisual.ts
 * Procedural PixiJS Graphics for the levitating surface rover.
 *
 * Visual composition (bottom to top):
 *   1. Shadow — semi-transparent ellipse on the ground plane
 *   2. Platform — isometric diamond shape (body of the rover)
 *   3. Glow rings — 2 pulsing rings (inner + outer)
 *   4. Antenna dot — small accent circle on top
 *
 * Levitation: platform + rings bob up/down via sin(t).
 * Colors: #aaddff platform, #4488aa/#44ffaa rings (matches hub effects palette).
 *
 * All drawn procedurally via PixiJS Graphics API — no textures.
 */

import { Container, Graphics } from 'pixi.js';
import { TILE_W, TILE_H, gridToScreen } from './surface-utils.js';

/** How fast the rover moves, in grid cells per second. */
export const ROVER_SPEED = 2.0;

/** Fog reveal radius around the rover (in grid cells). */
export const ROVER_REVEAL_RADIUS = 3;

/** Visual scale of the rover platform relative to a tile. */
const ROVER_SCALE = 0.55;

const PLATFORM_COLOR  = 0xaaddff;
const RING_INNER_COLOR = 0x4488aa;
const RING_OUTER_COLOR = 0x44ffaa;
const SHADOW_COLOR     = 0x000000;
const ANTENNA_COLOR    = 0xffffff;

/** Max vertical bob amplitude in pixels. */
const BOB_AMP = 5;
/** Bob period in ms. */
const BOB_PERIOD = 1800;

export class RoverVisual {
  public readonly container: Container;

  /** Current grid position (float for smooth movement). */
  public col: number;
  public row: number;

  /** Target grid position (null = stationary). */
  public targetCol: number | null = null;
  public targetRow: number | null = null;

  private shadow:   Graphics;
  private body:     Container;  // platform + rings + antenna
  private platform: Graphics;
  private ringInner: Graphics;
  private ringOuter: Graphics;
  private antenna:  Graphics;

  private timeMs = 0;

  constructor(startCol: number, startRow: number) {
    this.col = startCol;
    this.row = startRow;

    this.container = new Container();
    this.container.zIndex = 9999;  // above buildings

    // Shadow (stays at ground level)
    this.shadow = new Graphics();
    this.container.addChild(this.shadow);

    // Body group (levitates)
    this.body      = new Container();
    this.platform  = new Graphics();
    this.ringInner = new Graphics();
    this.ringOuter = new Graphics();
    this.antenna   = new Graphics();

    this.body.addChild(this.ringOuter, this.ringInner, this.platform, this.antenna);
    this.container.addChild(this.body);

    this._drawStatic();
    this._updatePosition();
  }

  // ─── Public API ─────────────────────────────────────────────────────────

  setTarget(col: number, row: number): void {
    this.targetCol = col;
    this.targetRow = row;
  }

  /** Returns true if rover is currently moving. */
  isMoving(): boolean {
    return this.targetCol !== null && this.targetRow !== null;
  }

  /**
   * Advance animation and movement.
   * Returns true if the rover moved to a new grid cell this frame.
   */
  update(deltaMs: number): boolean {
    this.timeMs += deltaMs;
    let moved = false;

    // Movement
    if (this.targetCol !== null && this.targetRow !== null) {
      const speed = ROVER_SPEED * (deltaMs / 1000);
      const dc    = this.targetCol - this.col;
      const dr    = this.targetRow - this.row;
      const dist  = Math.sqrt(dc * dc + dr * dr);

      if (dist <= speed) {
        // Arrived
        this.col = this.targetCol;
        this.row = this.targetRow;
        this.targetCol = null;
        this.targetRow = null;
        moved = true;
      } else {
        const prevCol = Math.round(this.col);
        const prevRow = Math.round(this.row);
        this.col += (dc / dist) * speed;
        this.row += (dr / dist) * speed;
        if (Math.round(this.col) !== prevCol || Math.round(this.row) !== prevRow) {
          moved = true;  // crossed into new cell
        }
      }

      this._updatePosition();
    }

    // Levitation bob
    const bob = Math.sin((this.timeMs / BOB_PERIOD) * Math.PI * 2) * BOB_AMP;
    this.body.y = bob;

    // Pulsing rings
    this._animateRings(this.timeMs);

    return moved;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  // ─── Private ────────────────────────────────────────────────────────────

  /** Draw all static geometry (called once). */
  private _drawStatic(): void {
    const hw = (TILE_W / 2) * ROVER_SCALE;
    const hh = (TILE_H / 2) * ROVER_SCALE;

    // Shadow — flat ellipse on ground
    this.shadow.ellipse(0, 2, hw * 0.8, hh * 0.5)
               .fill({ color: SHADOW_COLOR, alpha: 0.35 });

    // Platform — isometric diamond (3 faces like a tile)
    // Top face
    this.platform
      .moveTo(0,     -hh)        // top vertex
      .lineTo(hw,    0)          // right vertex
      .lineTo(0,     hh)         // bottom vertex
      .lineTo(-hw,   0)          // left vertex
      .closePath()
      .fill({ color: PLATFORM_COLOR, alpha: 0.92 });

    // Left face (darker)
    this.platform
      .moveTo(-hw,   0)
      .lineTo(0,     hh)
      .lineTo(0,     hh + 6)     // slight depth below
      .lineTo(-hw,   6)
      .closePath()
      .fill({ color: 0x6699aa, alpha: 0.85 });

    // Right face (medium)
    this.platform
      .moveTo(hw,    0)
      .lineTo(0,     hh)
      .lineTo(0,     hh + 6)
      .lineTo(hw,    6)
      .closePath()
      .fill({ color: 0x88bbdd, alpha: 0.85 });

    // Antenna dot on top
    this.antenna.circle(0, -hh - 6, 3)
                .fill({ color: ANTENNA_COLOR, alpha: 0.9 });
  }

  /** Animated ring redraw every frame. */
  private _animateRings(t: number): void {
    const hw = (TILE_W / 2) * ROVER_SCALE;
    const hh = (TILE_H / 2) * ROVER_SCALE;

    // Inner ring — 1.3× tile size, phase 0
    const alphaI = 0.25 + 0.35 * Math.sin((t / 900) * Math.PI * 2);
    this.ringInner.clear()
      .moveTo(0,          -(hh * 1.3))
      .lineTo(hw * 1.3,    0)
      .lineTo(0,           hh * 1.3)
      .lineTo(-(hw * 1.3), 0)
      .closePath()
      .stroke({ color: RING_INNER_COLOR, width: 1.5, alpha: alphaI });

    // Outer ring — 1.7× tile size, phase offset
    const alphaO = 0.15 + 0.25 * Math.sin((t / 900) * Math.PI * 2 + Math.PI);
    this.ringOuter.clear()
      .moveTo(0,          -(hh * 1.7))
      .lineTo(hw * 1.7,    0)
      .lineTo(0,           hh * 1.7)
      .lineTo(-(hw * 1.7), 0)
      .closePath()
      .stroke({ color: RING_OUTER_COLOR, width: 1, alpha: alphaO });
  }

  /** Sync container position to current grid coords. */
  private _updatePosition(): void {
    const { x, y } = gridToScreen(this.col, this.row);
    this.container.x = x;
    this.container.y = y + TILE_H / 2;  // center of diamond
  }
}
