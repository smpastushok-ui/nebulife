/**
 * FogLayer.ts
 * Fog-of-war overlay for the isometric surface scene.
 *
 * Draws white fluffy cloud puffs over every unrevealed cell.
 * Edge cells (adjacent to revealed) get softer half-puffs for a gradual boundary.
 * Revealed cells are stored as "col,row" strings in a Set and
 * persisted to localStorage under key `fog_<planetId>`.
 *
 * Usage:
 *   const fog = new FogLayer(gridSize, planetId);
 *   worldContainer.addChild(fog.container);   // topmost layer
 *   fog.initFromBuildings(buildings);         // reveal hub area
 *   fog.revealAround(col, row, radius);       // rover moves
 *   fog.redraw();                             // after revealing
 */

import { Container, Graphics } from 'pixi.js';
import type { PlacedBuilding } from '@nebulife/core';
import { BUILDING_DEFS } from '@nebulife/core';
import { gridToScreen, TILE_W, TILE_H } from './surface-utils.js';

/** Radius (in tiles) revealed around the colony hub at game start.
 *  Matches colony_hub.fogRevealRadius=30 in BUILDING_DEFS. */
const HUB_REVEAL_RADIUS = 30;

export class FogLayer {
  public readonly container: Container;

  private readonly gfx: Graphics;
  private revealedCells: Set<string> = new Set();
  private readonly gridSize: number;
  private readonly storageKey: string;

  /** True when revealed set changed since last redraw. */
  private dirty = true;

  /** Debounce timer handle — persist() writes to localStorage at most once per 2 s. */
  private _persistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(gridSize: number, planetId: string) {
    this.gridSize   = gridSize;
    this.storageKey = `fog_${planetId}`;

    this.container = new Container();
    this.gfx       = new Graphics();
    this.container.addChild(this.gfx);

    this.restore();
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /** Reveal cells in a circular radius around (col, row). */
  revealAround(col: number, row: number, radius: number): void {
    const r   = Math.ceil(radius);
    const r2  = radius * radius;
    let changed = false;

    for (let dc = -r; dc <= r; dc++) {
      for (let dr = -r; dr <= r; dr++) {
        if (dc * dc + dr * dr > r2) continue;
        const c = Math.round(col) + dc;
        const rr = Math.round(row) + dr;
        if (c < 0 || c >= this.gridSize || rr < 0 || rr >= this.gridSize) continue;
        const key = `${c},${rr}`;
        if (!this.revealedCells.has(key)) {
          this.revealedCells.add(key);
          changed = true;
        }
      }
    }

    if (changed) {
      this.dirty = true;
      this.persist();
    }
  }

  /** Initialize fog by revealing area around the colony hub (called after init). */
  initFromBuildings(buildings: PlacedBuilding[]): void {
    const hub = buildings.find((b) => b.type === 'colony_hub');
    if (hub) {
      const def = BUILDING_DEFS[hub.type];
      const sw  = def?.sizeW ?? 1;
      const sh  = def?.sizeH ?? 1;
      const cx  = hub.x + sw / 2 - 0.5;
      const cy  = hub.y + sh / 2 - 0.5;
      this.revealAround(cx, cy, HUB_REVEAL_RADIUS);
    }
    // No hub yet — SurfacePixiView calls revealStartingArea() for first-visit fog reveal
    this.redraw();
  }

  /**
   * Rebuild the fog graphics from the current revealedCells set.
   * Only redraws when dirty to avoid per-frame GPU work.
   */
  redraw(): void {
    if (!this.dirty) return;
    this.dirty = false;

    const gfx = this.gfx;
    gfx.clear();

    const N = this.gridSize;

    // Draw in painter's order (diagonal bands) to avoid z-fighting
    for (let d = 0; d < 2 * N - 1; d++) {
      const colMin = Math.max(0, d - N + 1);
      const colMax = Math.min(d, N - 1);
      for (let col = colMin; col <= colMax; col++) {
        const row = d - col;
        if (this.revealedCells.has(`${col},${row}`)) continue;

        // Check if this cell is on the edge (adjacent to a revealed cell)
        const isEdge = this._hasRevealedNeighbour(col, row);
        this._drawCloudPuff(gfx, col, row, isEdge);
      }
    }

    // Draw permanent fog outside the map diamond
    this._drawBorderFog(N);
  }

  /** Whether a given cell is currently revealed. */
  isRevealed(col: number, row: number): boolean {
    return this.revealedCells.has(`${col},${row}`);
  }

  /** Force a redraw on next call to redraw(). */
  markDirty(): void {
    this.dirty = true;
  }

  destroy(): void {
    this.gfx.destroy();
    this.container.destroy();
  }

  // ─── Persistence ──────────────────────────────────────────────────────────

  private persist(): void {
    // Debounce: write to localStorage at most once every 2 seconds.
    // The rover moves cell-by-cell, triggering many rapid reveals — batching
    // prevents repeated JSON serialisation + localStorage writes each frame.
    if (this._persistTimer !== null) return;
    this._persistTimer = setTimeout(() => {
      this._persistTimer = null;
      try {
        localStorage.setItem(this.storageKey, JSON.stringify([...this.revealedCells]));
      } catch { /* quota exceeded — ignore */ }
    }, 2000);
  }

  private restore(): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const arr = JSON.parse(saved) as string[];
        this.revealedCells = new Set(arr);
        this.dirty = true;
      }
    } catch { /* corrupted — start fresh */ }
  }

  // ─── Cloud puff drawing ───────────────────────────────────────────────────

  /** Returns true if any of the 8 neighbours (or self) is revealed. */
  private _hasRevealedNeighbour(col: number, row: number): boolean {
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (dc === 0 && dr === 0) continue;
        if (this.revealedCells.has(`${col + dc},${row + dr}`)) return true;
      }
    }
    return false;
  }

  /**
   * Draw two semi-transparent white diamond layers for one unrevealed cell.
   * Edge cells (adjacent to revealed) get softer alpha for a gradual boundary.
   * No cloud puffs — lightweight for mobile devices.
   */
  private _drawCloudPuff(gfx: Graphics, col: number, row: number, isEdge: boolean): void {
    const { x, y } = gridToScreen(col, row);
    const cx = x;
    const cy = y + TILE_H / 2;

    const hw = TILE_W / 2;
    const hh = TILE_H / 2;

    // Layer 1 — solid base to occlude terrain
    const baseAlpha = isEdge ? 0.65 : 0.92;
    gfx.moveTo(cx,      cy - hh)
       .lineTo(cx + hw, cy)
       .lineTo(cx,      cy + hh)
       .lineTo(cx - hw, cy)
       .closePath()
       .fill({ color: 0xffffff, alpha: baseAlpha });

    // Layer 2 — lighter overlay for depth
    const topAlpha = isEdge ? 0.15 : 0.30;
    gfx.moveTo(cx,      cy - hh)
       .lineTo(cx + hw, cy)
       .lineTo(cx,      cy + hh)
       .lineTo(cx - hw, cy)
       .closePath()
       .fill({ color: 0xffffff, alpha: topAlpha });
  }

  // ─── Border fog ───────────────────────────────────────────────────────────

  /**
   * Draw large white polygons that permanently cover the 4 "outside-diamond"
   * corners and a generous margin beyond the map edges.
   *
   * The isometric diamond for an N×N grid has corners at:
   *   Top:    screen (0, 0)                            ← (col=0, row=0)
   *   Right:  screen ((N-1)*TILE_W/2, (N-1)*TILE_H/2) ← (col=N-1, row=0)
   *   Bottom: screen (0, (N-1)*TILE_H)                ← (col=N-1, row=N-1)
   *   Left:   screen (-(N-1)*TILE_W/2, (N-1)*TILE_H/2)← (col=0, row=N-1)
   */
  private _drawBorderFog(N: number): void {
    const gfx    = this.gfx;
    const pad    = 4096;  // large enough to cover any zoom/pan
    const hw     = (N - 1) * (TILE_W / 2);
    const hh     = (N - 1) * (TILE_H / 2);
    // Diamond corners (screen coords)
    const top    = { x: 0,    y: 0       };
    const right  = { x: hw,   y: hh      };
    const bottom = { x: 0,    y: hh * 2  };
    const left   = { x: -hw,  y: hh      };

    const fill = { color: 0xffffff as number, alpha: 0.92 };

    // Top-right corner (between top, right, and outside)
    gfx.moveTo(top.x,        top.y - pad)
       .lineTo(right.x + pad, top.y - pad)
       .lineTo(right.x + pad, right.y + pad)
       .lineTo(right.x,       right.y)
       .lineTo(top.x,         top.y)
       .closePath()
       .fill(fill);

    // Bottom-right corner
    gfx.moveTo(right.x,        right.y)
       .lineTo(right.x + pad,  right.y - pad)
       .lineTo(right.x + pad,  bottom.y + pad)
       .lineTo(bottom.x,       bottom.y + pad)
       .lineTo(bottom.x,       bottom.y)
       .closePath()
       .fill(fill);

    // Bottom-left corner
    gfx.moveTo(bottom.x,       bottom.y)
       .lineTo(bottom.x,       bottom.y + pad)
       .lineTo(left.x - pad,   bottom.y + pad)
       .lineTo(left.x - pad,   left.y - pad)
       .lineTo(left.x,         left.y)
       .closePath()
       .fill(fill);

    // Top-left corner
    gfx.moveTo(left.x,         left.y)
       .lineTo(left.x - pad,   left.y - pad)
       .lineTo(top.x,          top.y - pad)
       .lineTo(top.x,          top.y)
       .closePath()
       .fill(fill);
  }
}
