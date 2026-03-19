/**
 * SurfaceScene.ts
 * PixiJS 2.5D isometric tile scene for planetary surface.
 *
 * Layers (bottom to top):
 *   groundLayer    — terrain tiles, Painter's Algorithm order (static)
 *   featureLayer   — trees/rocks/craters, Y-sorted (static)
 *   corridorLayer  — lines between adjacent buildings (rebuilt on change)
 *   overlayLayer   — zone highlights (rebuilt on selection change)
 *   buildingLayer  — procedural iso-box buildings, Y-sorted (rebuilt on change)
 *
 * Rules:
 *   - No blur filters, no textures (buildings are Graphics)
 *   - Deterministic from planet.seed
 *   - 60fps: static layers drawn once, dynamic layers rebuilt only on state change
 */

import {
  Container,
  Graphics,
  Sprite,
  Assets,
  Texture,
  Rectangle,
} from 'pixi.js';
import type { Planet, Star, PlacedBuilding, BuildingType } from '@nebulife/core';
import { SeededRNG } from '@nebulife/core';
import {
  TILE_W, TILE_H, FRAME_W, FRAME_H, ATLAS_COLS,
  SPRITE_ANCHOR_Y, TILE_SCALE,
  TERRAIN_FRAME, FEATURE_FRAME,
  computeIsoGridSize,
  gridToScreen,
  classifyCellTerrain,
  terrainToAtlasKey,
  isLandTerrain,
  isWaterTerrain,
  isCellBuildable,
  isAdjacentToCity,
  derivePlanetAtlasType,
  pickFeatureKey,
} from './surface-utils.js';

// ─── Building colors ──────────────────────────────────────────────────────────

interface IsoColors { top: number; right: number; left: number }

const BUILDING_COLORS: Record<string, IsoColors> = {
  colony_hub:      { top: 0x6699bb, right: 0x446688, left: 0x2a4455 },
  mine:            { top: 0x996633, right: 0x7a4d22, left: 0x4a2d11 },
  solar_plant:     { top: 0xddcc44, right: 0xaa9922, left: 0x665511 },
  research_lab:    { top: 0x44aacc, right: 0x2288aa, left: 0x115566 },
  water_extractor: { top: 0x44bbdd, right: 0x2299bb, left: 0x115566 },
  greenhouse:      { top: 0x55bb66, right: 0x339944, left: 0x1a5522 },
  observatory:     { top: 0x9988cc, right: 0x7766aa, left: 0x443366 },
};

const DEFAULT_BUILDING_COLORS: IsoColors = { top: 0x778899, right: 0x556677, left: 0x334455 };

// ─── Scene class ──────────────────────────────────────────────────────────────

export class SurfaceScene {
  /** Root container — apply zoom/pan here. */
  public readonly worldContainer: Container;

  /** N × N grid size. */
  public gridSize: number = 64;

  // Layers
  private groundLayer:   Container;
  private featureLayer:  Container;
  private corridorLayer: Container;
  private overlayLayer:  Container;
  private buildingLayer: Container;

  // State cached for dynamic redraws
  private planet!: Planet;
  private waterLevel: number = 0.5;
  private baseTexture: Texture | null = null;

  constructor() {
    this.worldContainer = new Container();

    this.groundLayer   = new Container();
    this.featureLayer  = new Container();
    this.corridorLayer = new Container();
    this.overlayLayer  = new Container();
    this.buildingLayer = new Container();

    // sortableChildren needed for Y-sorting in feature/building layers
    this.featureLayer.sortableChildren  = true;
    this.buildingLayer.sortableChildren = true;

    this.worldContainer.addChild(
      this.groundLayer,
      this.featureLayer,
      this.corridorLayer,
      this.overlayLayer,
      this.buildingLayer,
    );
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  async init(planet: Planet, star: Star, buildings: PlacedBuilding[]): Promise<void> {
    this.planet    = planet;
    this.gridSize  = computeIsoGridSize(planet.radiusEarth * 6371);
    this.waterLevel = planet.hydrosphere?.waterCoverageFraction ?? 0;

    const atlasType = derivePlanetAtlasType(planet, star);
    const atlasUrl  = `/tiles/tiles_${atlasType}.png`;

    try {
      this.baseTexture = await Assets.load<Texture>(atlasUrl);
    } catch {
      // Atlas not available yet — render without sprites (fallback: colored diamonds)
      this.baseTexture = null;
    }

    this.drawGroundLayer();
    this.placeFeatures();
    this.rebuildBuildings(buildings);
  }

  // ─── Atlas helper ─────────────────────────────────────────────────────────

  private getFrame(index: number): Texture | null {
    if (!this.baseTexture) return null;
    return new Texture({
      source: this.baseTexture.source,
      frame: new Rectangle(
        (index % ATLAS_COLS) * FRAME_W,
        Math.floor(index / ATLAS_COLS) * FRAME_H,
        FRAME_W,
        FRAME_H,
      ),
    });
  }

  // ─── Ground layer (Painter's Algorithm) ───────────────────────────────────

  private drawGroundLayer(): void {
    this.groundLayer.removeChildren();
    const N    = this.gridSize;
    const seed = this.planet.seed;
    const wl   = this.waterLevel;

    for (let d = 0; d < 2 * N - 1; d++) {
      const colMin = Math.max(0, d - N + 1);
      const colMax = Math.min(d, N - 1);
      for (let col = colMin; col <= colMax; col++) {
        const row = d - col;
        const terrain   = classifyCellTerrain(col, row, seed, wl);
        const atlasKey  = terrainToAtlasKey(terrain, col, row);
        const frameIdx  = TERRAIN_FRAME[atlasKey] ?? TERRAIN_FRAME['ground_a'];
        const tex       = this.getFrame(frameIdx);
        const { x, y }  = gridToScreen(col, row);
        const baseY     = y + TILE_H / 2;

        if (tex) {
          // Sprite tile: anchor at diamond bottom-center, slight overdraw to fill seams
          const sp = new Sprite(tex);
          sp.anchor.set(0.5, SPRITE_ANCHOR_Y);
          sp.scale.set(TILE_SCALE);
          sp.position.set(Math.round(x), Math.round(baseY));
          this.groundLayer.addChild(sp);
        } else {
          // Fallback: colored diamond when atlas not available
          this.groundLayer.addChild(this.makeFallbackDiamond(x, baseY, terrain));
        }
      }
    }
  }

  /** Procedural diamond tile when no atlas is available. */
  private makeFallbackDiamond(cx: number, cy: number, terrain: string): Graphics {
    const hW = TILE_W / 2;
    const hH = TILE_H / 2;
    const g  = new Graphics();
    const color = FALLBACK_COLORS[terrain] ?? 0x445566;
    g.poly([cx, cy - hH, cx + hW, cy, cx, cy + hH, cx - hW, cy]);
    g.fill({ color, alpha: 0.85 });
    return g;
  }

  // ─── Feature layer (Y-sorted) ──────────────────────────────────────────────

  private placeFeatures(): void {
    this.featureLayer.removeChildren();
    const N    = this.gridSize;
    const seed = this.planet.seed;
    const wl   = this.waterLevel;
    const rng  = new SeededRNG(seed + 9001);
    const items: { sp: Sprite | Graphics; zIdx: number }[] = [];

    for (let col = 0; col < N; col++) {
      for (let row = 0; row < N; row++) {
        const terrain = classifyCellTerrain(col, row, seed, wl);
        if (!isLandTerrain(terrain)) continue;
        const rand = rng.next();
        if (rand > 0.12) continue;   // ~12% density
        const featKey = pickFeatureKey(terrain, rng.next());
        if (!featKey) continue;
        const frameIdx = FEATURE_FRAME[featKey];
        if (frameIdx === undefined) continue;
        const tex      = this.getFrame(frameIdx);
        const { x, y } = gridToScreen(col, row);
        const baseY    = y + TILE_H / 2;

        if (tex) {
          const sp = new Sprite(tex);
          sp.anchor.set(0.5, SPRITE_ANCHOR_Y);
          sp.scale.set(TILE_SCALE);
          sp.position.set(Math.round(x), Math.round(baseY));
          sp.zIndex = baseY;
          items.push({ sp, zIdx: baseY });
        }
      }
    }

    // Sort by Y (further = smaller Y = behind)
    items.sort((a, b) => a.zIdx - b.zIdx);
    items.forEach(({ sp }) => this.featureLayer.addChild(sp));
  }

  // ─── Buildings (dynamic) ──────────────────────────────────────────────────

  public rebuildBuildings(buildings: PlacedBuilding[]): void {
    this.buildingLayer.removeChildren();
    this.drawCorridors(buildings);

    // Y-sort: farther (smaller y) drawn first
    const sorted = [...buildings].sort((a, b) => {
      return gridToScreen(a.x, a.y).y - gridToScreen(b.x, b.y).y;
    });

    for (const b of sorted) {
      const bldg = this.makeIsoBuilding(b);
      this.buildingLayer.addChild(bldg);
    }
  }

  /** Procedural isometric box for a building. */
  private makeIsoBuilding(b: PlacedBuilding): Graphics {
    const { x, y } = gridToScreen(b.x, b.y);
    const baseY    = y + TILE_H / 2;
    const hW       = TILE_W  * 0.40;   // half-width of diamond footprint
    const hH       = TILE_H  * 0.40;   // half-height of diamond footprint
    const bH       = TILE_H  * 0.85;   // building height in px

    const colors = BUILDING_COLORS[b.type] ?? DEFAULT_BUILDING_COLORS;
    const g = new Graphics();

    // Top face (diamond)
    g.poly([
      x,      baseY - bH - hH,
      x + hW, baseY - bH,
      x,      baseY - bH + hH,
      x - hW, baseY - bH,
    ]);
    g.fill(colors.top);

    // Right face
    g.poly([
      x + hW, baseY - bH,
      x + hW, baseY,
      x,      baseY + hH,
      x,      baseY - bH + hH,
    ]);
    g.fill(colors.right);

    // Left face (darker)
    g.poly([
      x,      baseY - bH + hH,
      x,      baseY + hH,
      x - hW, baseY,
      x - hW, baseY - bH,
    ]);
    g.fill(colors.left);

    // Building type label (small monospace)
    // (omitted — label shown in SurfacePanel sidebar)

    g.zIndex = baseY;
    return g;
  }

  // ─── Corridors (dynamic) ─────────────────────────────────────────────────

  private drawCorridors(buildings: PlacedBuilding[]): void {
    this.corridorLayer.removeChildren();
    if (buildings.length < 2) return;

    const g    = new Graphics();
    const done = new Set<string>();

    for (const b of buildings) {
      for (const [dc, dr] of [[1, 0], [0, 1]] as [number, number][]) {
        const nc = b.x + dc;
        const nr = b.y + dr;
        if (!buildings.some((n) => n.x === nc && n.y === nr)) continue;
        const key = `${Math.min(b.x, nc)}_${Math.min(b.y, nr)}_${Math.max(b.x, nc)}_${Math.max(b.y, nr)}`;
        if (done.has(key)) continue;
        done.add(key);

        const p1 = gridToScreen(b.x, b.y);
        const p2 = gridToScreen(nc, nr);
        const y1 = p1.y + TILE_H / 2;
        const y2 = p2.y + TILE_H / 2;

        g.moveTo(p1.x, y1);
        g.lineTo(p2.x, y2);
      }
    }
    g.stroke({ width: 3, color: 0x4488aa, alpha: 0.75 });
    this.corridorLayer.addChild(g);
  }

  // ─── Zone overlay (dynamic) ───────────────────────────────────────────────

  public updateZoneOverlay(
    selectedType: BuildingType | null,
    buildings: PlacedBuilding[],
  ): void {
    this.overlayLayer.removeChildren();
    if (!selectedType) return;

    const N        = this.gridSize;
    const seed     = this.planet.seed;
    const wl       = this.waterLevel;
    const hasCity  = buildings.length > 0;
    const g        = new Graphics();

    for (let col = 0; col < N; col++) {
      for (let row = 0; row < N; row++) {
        if (!isCellBuildable(col, row, seed, wl, selectedType)) continue;
        if (hasCity && !isAdjacentToCity(col, row, buildings)) continue;

        const occupied   = buildings.some((b) => b.x === col && b.y === row);
        const { x, y }   = gridToScreen(col, row);
        const baseY      = y + TILE_H / 2;
        const hW         = TILE_W / 2;
        const hH         = TILE_H / 2;

        // Diamond highlight
        g.poly([x, baseY - hH, x + hW, baseY, x, baseY + hH, x - hW, baseY]);
        g.fill({ color: occupied ? 0xff4444 : 0x44ff88, alpha: 0.35 });
      }
    }
    this.overlayLayer.addChild(g);
  }

  // ─── Public accessors ─────────────────────────────────────────────────────

  /** Check if a cell can accept a building (terrain + adjacency). */
  public canBuildAt(
    col: number,
    row: number,
    buildingType: BuildingType,
    buildings: PlacedBuilding[],
  ): boolean {
    if (!isCellBuildable(col, row, this.planet.seed, this.waterLevel, buildingType)) return false;
    if (buildings.some((b) => b.x === col && b.y === row)) return false;
    if (buildings.length > 0 && !isAdjacentToCity(col, row, buildings)) return false;
    return true;
  }

  /** Deterministic terrain for a cell. */
  public terrainAt(col: number, row: number): string {
    return classifyCellTerrain(col, row, this.planet.seed, this.waterLevel);
  }

  // ─── Destroy ─────────────────────────────────────────────────────────────

  destroy(): void {
    this.worldContainer.destroy({ children: true });
  }
}

// ─── Fallback colors (no atlas) ───────────────────────────────────────────────

const FALLBACK_COLORS: Record<string, number> = {
  deep_ocean: 0x0a1a2a,
  ocean:      0x112233,
  coast:      0x1a3344,
  beach:      0x4a3c28,
  lowland:    0x2a3a1a,
  plains:     0x2e3e1e,
  hills:      0x3a3a2a,
  mountains:  0x4a4a3a,
  peaks:      0x5a5a4a,
};
