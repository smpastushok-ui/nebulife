/**
 * SurfaceBaker.ts
 * Bakes the entire isometric terrain (ground + features) into a single
 * PixiJS RenderTexture via `app.renderer.generateTexture()`.
 *
 * The baked sprite replaces ~3 400 individual Sprites/Graphics with 1 draw call.
 * Water cells are procedural diamonds; land/feature cells use the atlas spritesheet.
 *
 * Usage:
 *   const { sprite, tileFrames } = await bakeTerrain(app, planet, star, harvestedCells);
 *   worldContainer.addChildAt(sprite, 0);
 *
 * `tileFrames` is a Map<"col,row", frameIdx> — needed by SurfaceScene for
 * harvest logic and to patch individual cells after harvest.
 */

import {
  Application,
  Container,
  Graphics,
  Sprite,
  Texture,
  Rectangle,
  RenderTexture,
  Assets,
} from 'pixi.js';

import type { Planet, Star, HarvestedCell } from '@nebulife/core';

import {
  TILE_W, TILE_H, FRAME_W, FRAME_H, ATLAS_COLS,
  SPRITE_ANCHOR_Y, TILE_SCALE,
  computeIsoGridSize,
  gridToScreen,
  classifyCellTerrain,
  terrainToAtlasIndex,
  isWaterTerrain,
  derivePlanetAtlasType,
  cellMirrorVariant,
  isMountainFootprint,
  findMountainCell,
  STUMP_FRAME, TREE_SMALL_FRAME,
  ORE_DEPLETED_FRAME, ORE_SMALL_FRAME,
  VENT_DRY_FRAME, VENT_SMALL_FRAME,
} from './surface-utils.js';

// ── Water color palette (matches SurfaceScene) ──────────────────────────────

const WATER_COLORS: Record<string, number> = {
  deep_ocean: 0x0a1428,
  ocean:      0x0d1f35,
  coast:      0x163050,
  beach:      0x3a5533,
};

// ── Types ────────────────────────────────────────────────────────────────────

export interface BakeResult {
  /** Single sprite containing the entire baked terrain. Position = (0,0) in world space. */
  sprite: Sprite;
  /** Per-cell atlas frame index (key = "col,row"). Null for water. */
  tileFrames: Map<string, number | null>;
  /** Atlas texture for patching individual cells after harvest. */
  atlasTexture: Texture | null;
  /** Mountain overlay texture (rendered separately above baked terrain). */
  mountTex: Texture | null;
  /** Mountain grid position or null. */
  mountPos: { col: number; row: number } | null;
  /** Grid size used for baking. */
  gridSize: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Apply harvest state override to a default atlas frame. */
function getEffectiveFrame(
  col: number, row: number,
  defaultFrame: number,
  harvestedCells: Map<string, HarvestedCell>,
): number {
  const cell = harvestedCells.get(`${col},${row}`);
  if (!cell) return defaultFrame;
  const s = cell.state;
  if (s === 'stump')      return STUMP_FRAME;
  if (s === 'grass')      return 10 + ((cell as any).grassVariant ?? 0);
  if (s === 'tree-small') return TREE_SMALL_FRAME;
  if (s === 'depleted')   return ORE_DEPLETED_FRAME;
  if (s === 'ore-small')  return ORE_SMALL_FRAME;
  if (s === 'dry')        return VENT_DRY_FRAME;
  if (s === 'vent-small') return VENT_SMALL_FRAME;
  return defaultFrame;
}

/** Extract a texture frame from atlas by index. */
function getAtlasFrame(atlas: Texture, index: number): Texture {
  return new Texture({
    source: atlas.source,
    frame: new Rectangle(
      (index % ATLAS_COLS) * FRAME_W,
      Math.floor(index / ATLAS_COLS) * FRAME_H,
      FRAME_W,
      FRAME_H,
    ),
  });
}

// ── Main bake function ───────────────────────────────────────────────────────

/**
 * Bake the entire isometric terrain into a single RenderTexture.
 *
 * @param app PixiJS application (needed for renderer.generateTexture)
 * @param planet planet data (seed, radius, hydrosphere)
 * @param star star data (for atlas type)
 * @param harvestedCells current harvest state overrides
 * @returns BakeResult with the baked sprite and metadata
 */
export async function bakeTerrain(
  app: Application,
  planet: Planet,
  star: Star,
  harvestedCells: Map<string, HarvestedCell>,
): Promise<BakeResult> {
  const N         = computeIsoGridSize(planet.radiusEarth * 6371);
  const seed      = planet.seed;
  const wl        = planet.hydrosphere?.waterCoverageFraction ?? 0;
  const hW        = TILE_W / 2;  // 64
  const hH        = TILE_H / 2;  // 40

  // ── Load atlas texture ─────────────────────────────────────────────────
  const atlasType = derivePlanetAtlasType(planet, star);
  const atlasUrl  = `/tiles/tiles_${atlasType}.webp`;
  const mountUrl  =
    atlasType === 'ice'      ? '/tiles/habitable/mount_ice.webp'      :
    atlasType === 'volcanic' ? '/tiles/habitable/mount_volcanic.webp' :
                               '/tiles/habitable/mount_rugged.webp';

  const safeLoad = (url: string) => Assets.load<Texture>(url).catch(() => null);
  const [atlas, mountTex] = await Promise.all([safeLoad(atlasUrl), safeLoad(mountUrl)]);

  // ── Compute bake canvas offset ─────────────────────────────────────────
  // The iso diamond for an N×N grid spans:
  //   X: [-(N-1)*hW, +(N-1)*hW]   centered at 0
  //   Y: [0, 2*(N-1)*hH]          top vertex at y=0
  // We add FRAME_H padding top (tall sprites extend above diamond) and hH bottom.
  const diamondW = 2 * (N - 1) * hW;
  const diamondH = 2 * (N - 1) * hH;
  const padTop   = FRAME_H;  // sprite top can extend 256px above tile anchor
  const padBot   = hH;
  const canvasW  = diamondW + TILE_W;     // +1 tile width for edge sprites
  const canvasH  = diamondH + padTop + padBot;

  // Offset: world origin (0,0) maps to canvas position (canvasW/2, padTop)
  const offsetX = canvasW / 2;
  const offsetY = padTop;

  // ── Create temporary container ─────────────────────────────────────────
  const bakeContainer = new Container();
  const waterGfx = new Graphics();  // all water diamonds batched into one Graphics
  bakeContainer.addChild(waterGfx);

  const tileFrames = new Map<string, number | null>();

  // ── Render all cells in Painter's order (diagonal bands) ───────────────
  for (let d = 0; d < 2 * N - 1; d++) {
    const colMin = Math.max(0, d - N + 1);
    const colMax = Math.min(d, N - 1);

    for (let col = colMin; col <= colMax; col++) {
      const row = d - col;
      const { x, y } = gridToScreen(col, row);
      const cx = x + offsetX;
      const baseY = y + hH + offsetY;

      const terrain = classifyCellTerrain(col, row, seed, wl, N);

      // Water / beach → flat color diamond
      if (isWaterTerrain(terrain) || terrain === 'beach') {
        const color = WATER_COLORS[terrain] ?? 0x0d1f35;
        waterGfx.poly([cx, baseY - hH, cx + hW, baseY, cx, baseY + hH, cx - hW, baseY]);
        waterGfx.fill({ color });
        tileFrames.set(`${col},${row}`, null);
        continue;
      }

      // Land cell → atlas sprite
      const defFrame = terrainToAtlasIndex(terrain, col, row, seed, N);
      if (defFrame === null) {
        // Shouldn't happen for land, but fallback to colored diamond
        waterGfx.poly([cx, baseY - hH, cx + hW, baseY, cx, baseY + hH, cx - hW, baseY]);
        waterGfx.fill({ color: 0x225533 });
        tileFrames.set(`${col},${row}`, null);
        continue;
      }

      const frameIdx = getEffectiveFrame(col, row, defFrame, harvestedCells);
      tileFrames.set(`${col},${row}`, frameIdx);

      if (atlas) {
        const tex = getAtlasFrame(atlas, frameIdx);
        const sp  = new Sprite(tex);
        sp.anchor.set(0.5, SPRITE_ANCHOR_Y);
        sp.scale.set(TILE_SCALE);
        sp.position.set(Math.round(cx), Math.round(baseY));
        // Mirror variant for visual variety
        if (cellMirrorVariant(col, row, seed)) sp.scale.x = -TILE_SCALE;
        sp.zIndex = d;
        bakeContainer.addChild(sp);
      } else {
        // No atlas loaded — fallback green diamond
        const landColor = terrain === 'mountains' || terrain === 'peaks' ? 0x445544
          : terrain === 'hills' ? 0x336633 : 0x225533;
        waterGfx.poly([cx, baseY - hH, cx + hW, baseY, cx, baseY + hH, cx - hW, baseY]);
        waterGfx.fill({ color: landColor });
      }
    }
  }

  // sortableChildren for correct z-order (sprites above water)
  bakeContainer.sortableChildren = true;

  // ── Bake into RenderTexture ────────────────────────────────────────────
  const renderTexture = RenderTexture.create({
    width:  canvasW,
    height: canvasH,
    resolution: 1,
  });

  app.renderer.render({
    container: bakeContainer,
    target: renderTexture,
  });

  // ── Destroy temporary container (frees all child sprites) ──────────────
  bakeContainer.destroy({ children: true });

  // ── Create final sprite positioned in world space ──────────────────────
  const bakedSprite = new Sprite(renderTexture);
  // Position so that world origin (0,0) = gridToScreen(0,0) maps correctly
  bakedSprite.position.set(-offsetX, -offsetY);

  // ── Mountain position ──────────────────────────────────────────────────
  const mountPos = findMountainCell(seed, N);

  return {
    sprite: bakedSprite,
    tileFrames,
    atlasTexture: atlas,
    mountTex,
    mountPos,
    gridSize: N,
  };
}

/**
 * Patch a single cell in the baked sprite after harvest.
 * Clears the old sprite area with a grass tile, then draws the new frame
 * (stump/depleted/dry) on top.
 *
 * @param app PixiJS application
 * @param bakedSprite the baked terrain sprite
 * @param atlas atlas texture
 * @param col grid column
 * @param row grid row
 * @param newFrameIdx new atlas frame index to draw
 * @param seed planet seed (for mirror variant)
 * @param N grid size
 */
export function patchBakedCell(
  app: Application,
  bakedSprite: Sprite,
  atlas: Texture | null,
  col: number, row: number,
  newFrameIdx: number,
  seed: number,
  N: number,
): void {
  if (!atlas || !bakedSprite.texture) return;

  const hW = TILE_W / 2;
  const hH = TILE_H / 2;
  const diamondW = 2 * (N - 1) * hW;
  const canvasW  = diamondW + TILE_W;
  const offsetX  = canvasW / 2;
  const offsetY  = FRAME_H;

  const { x, y } = gridToScreen(col, row);
  const cx    = x + offsetX;
  const baseY = y + hH + offsetY;

  const patchContainer = new Container();

  // Step 1: Draw a grass base sprite to cover the old tree/ore/vent sprite.
  // Grass frames are 10-12; pick a deterministic variant for this cell.
  const grassFrameIdx = 10 + Math.floor(
    ((Math.sin(col * 127.1 + row * 311.7 + (seed + 1111) * 0.1) * 43758.5453) % 1 + 1) % 1 * 3,
  );
  const grassTex = getAtlasFrame(atlas, grassFrameIdx);
  const grassSp  = new Sprite(grassTex);
  grassSp.anchor.set(0.5, SPRITE_ANCHOR_Y);
  grassSp.scale.set(TILE_SCALE);
  grassSp.position.set(Math.round(cx), Math.round(baseY));
  if (cellMirrorVariant(col, row, seed)) grassSp.scale.x = -TILE_SCALE;
  patchContainer.addChild(grassSp);

  // Step 2: Draw the new harvest-state sprite on top (stump, depleted, dry, etc.)
  const tex = getAtlasFrame(atlas, newFrameIdx);
  const sp  = new Sprite(tex);
  sp.anchor.set(0.5, SPRITE_ANCHOR_Y);
  sp.scale.set(TILE_SCALE);
  sp.position.set(Math.round(cx), Math.round(baseY));
  if (cellMirrorVariant(col, row, seed)) sp.scale.x = -TILE_SCALE;
  patchContainer.addChild(sp);

  // Render patch onto the existing RenderTexture (overlay mode)
  const rt = bakedSprite.texture as RenderTexture;
  app.renderer.render({
    container: patchContainer,
    target: rt,
    clear: false,
  });

  patchContainer.destroy({ children: true });
}
