// ---------------------------------------------------------------------------
// Surface Map Renderer — raw Canvas 2D (no PixiJS)
// ---------------------------------------------------------------------------
// Renders the equirectangular surface map onto an HTML canvas.
// Uses the same color palette as HomePlanetRenderer / PlanetVisuals.
// Supports pan, zoom, tile hover, building/resource overlays.
// ---------------------------------------------------------------------------

import type {
  SurfaceMap, SurfaceTile, SurfaceResourceDeposit,
  PlacedBuilding, BuildingType,
} from '@nebulife/core';
import type { PlanetVisualConfig } from './PlanetVisuals.js';
import { lerpColor, clamp } from './PlanetVisuals.js';

const TILE_SIZE = 4; // pixels per tile at zoom=1

// Resource element → color mapping
const RESOURCE_COLORS: Record<string, number> = {
  Fe: 0xcc4444,  // red (iron)
  Cu: 0xdd8844,  // orange (copper)
  Ni: 0xaabb44,  // yellow-green (nickel)
  Ti: 0x8888cc,  // purple-blue (titanium)
  U:  0x44dd44,  // green (uranium)
  Al: 0xbbbbbb,  // silver (aluminum)
  Si: 0x88bbdd,  // light blue (silicon)
};

// Building type → emoji/symbol for overlay
const BUILDING_SYMBOLS: Record<BuildingType, string> = {
  colony_hub: '🏠',
  mine: '⛏',
  solar_plant: '☀',
  research_lab: '🔬',
  water_extractor: '💧',
  greenhouse: '🌱',
  observatory: '🔭',
};

/** Convert a hex number (0xRRGGBB) to {r, g, b} */
function hexToRGB(hex: number): { r: number; g: number; b: number } {
  return {
    r: (hex >> 16) & 0xff,
    g: (hex >> 8) & 0xff,
    b: hex & 0xff,
  };
}

export class SurfaceMapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private map: SurfaceMap;
  private visuals: PlanetVisualConfig;

  // Viewport state
  private offsetX = 0; // tile offset (fractional)
  private offsetY = 0;
  private zoom = 1;

  // Pre-rendered terrain image
  private terrainImageData: ImageData | null = null;

  // Overlay data
  private resources: SurfaceResourceDeposit[] = [];
  private buildings: PlacedBuilding[] = [];
  private highlightedTile: { x: number; y: number } | null = null;
  private selectedBuilding: BuildingType | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    map: SurfaceMap,
    visuals: PlanetVisualConfig,
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.map = map;
    this.visuals = visuals;

    // Pre-render the terrain to ImageData
    this.renderTerrainImage();
  }

  /** Get the current zoom level */
  getZoom(): number {
    return this.zoom;
  }

  /** Set resource deposits to render as markers */
  setResources(resources: SurfaceResourceDeposit[]): void {
    this.resources = resources;
  }

  /** Set placed buildings to render */
  setBuildings(buildings: PlacedBuilding[]): void {
    this.buildings = buildings;
  }

  /** Set highlighted tile (hover) */
  setHighlightedTile(tile: { x: number; y: number } | null): void {
    this.highlightedTile = tile;
  }

  /** Set the currently selected building type for placement mode */
  setSelectedBuilding(type: BuildingType | null): void {
    this.selectedBuilding = type;
  }

  /** Pan the viewport by pixel delta */
  pan(dx: number, dy: number): void {
    const tileSize = TILE_SIZE * this.zoom;
    this.offsetX -= dx / tileSize;
    this.offsetY -= dy / tileSize;

    // Wrap X (horizontal wrapping)
    this.offsetX = ((this.offsetX % this.map.width) + this.map.width) % this.map.width;

    // Clamp Y
    const maxY = this.map.height - this.canvas.height / tileSize;
    this.offsetY = clamp(this.offsetY, 0, Math.max(0, maxY));
  }

  /** Set zoom level (centered on canvas center) */
  setZoom(newZoom: number): void {
    const oldZoom = this.zoom;
    this.zoom = clamp(newZoom, 0.5, 8);

    // Adjust offset to keep center stable
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const oldTileSize = TILE_SIZE * oldZoom;
    const newTileSize = TILE_SIZE * this.zoom;

    this.offsetX += cx / oldTileSize - cx / newTileSize;
    this.offsetY += cy / oldTileSize - cy / newTileSize;

    // Wrap & clamp
    this.offsetX = ((this.offsetX % this.map.width) + this.map.width) % this.map.width;
    const maxY = this.map.height - this.canvas.height / newTileSize;
    this.offsetY = clamp(this.offsetY, 0, Math.max(0, maxY));
  }

  /** Convert screen pixel to tile coordinates */
  screenToTile(screenX: number, screenY: number): { x: number; y: number } | null {
    const tileSize = TILE_SIZE * this.zoom;
    let tx = Math.floor(screenX / tileSize + this.offsetX);
    const ty = Math.floor(screenY / tileSize + this.offsetY);

    // Wrap X
    tx = ((tx % this.map.width) + this.map.width) % this.map.width;

    if (ty < 0 || ty >= this.map.height) return null;
    return { x: tx, y: ty };
  }

  /** Get tile at given tile coordinates */
  getTile(tx: number, ty: number): SurfaceTile | null {
    if (ty < 0 || ty >= this.map.height) return null;
    const wx = ((tx % this.map.width) + this.map.width) % this.map.width;
    return this.map.tiles[ty * this.map.width + wx];
  }

  /** Pre-render the terrain to an ImageData for fast blitting */
  private renderTerrainImage(): void {
    const w = this.map.width;
    const h = this.map.height;
    const imageData = new ImageData(w * TILE_SIZE, h * TILE_SIZE);
    const data = imageData.data;

    for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) {
        const tile = this.map.tiles[ty * w + tx];
        const color = this.getTileColor(tile);
        const { r, g, b } = hexToRGB(color);

        // Fill TILE_SIZE × TILE_SIZE pixel block
        for (let py = 0; py < TILE_SIZE; py++) {
          for (let px = 0; px < TILE_SIZE; px++) {
            const idx = ((ty * TILE_SIZE + py) * w * TILE_SIZE + (tx * TILE_SIZE + px)) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = 255;
          }
        }
      }
    }

    this.terrainImageData = imageData;
  }

  /** Get the color for a terrain tile, matching HomePlanetRenderer visuals */
  private getTileColor(tile: SurfaceTile): number {
    const v = this.visuals;

    // --- Ice ---
    if (tile.biome === 'ice') {
      return lerpColor(0x99aabc, 0xf0f4ff, clamp(tile.elevation + 0.5, 0, 1));
    }

    // --- Volcano ---
    if (tile.terrain === 'volcano') {
      return lerpColor(0x661100, v.lavaColor, 0.7);
    }

    // --- Water ---
    if (tile.terrain === 'deep_ocean') {
      return v.hasOcean ? v.oceanDeep : v.surfaceBaseColor;
    }
    if (tile.terrain === 'ocean') {
      return v.hasOcean ? lerpColor(v.oceanShallow, v.oceanDeep, 0.5) : v.surfaceBaseColor;
    }
    if (tile.terrain === 'coast') {
      return v.hasOcean ? v.oceanShallow : v.surfaceBaseColor;
    }

    // --- Land ---
    const h = clamp(tile.elevation + 0.5, 0, 1); // normalize

    // Mountains / peaks → high color
    if (tile.terrain === 'peaks') {
      return lerpColor(v.surfaceHighColor, 0xccdde8, 0.5);
    }
    if (tile.terrain === 'mountains') {
      return lerpColor(v.surfaceBaseColor, v.surfaceHighColor, 0.7);
    }

    // Biome-based coloring (if planet has biomes)
    if (v.hasBiomes) {
      return this.getBiomeColor(tile);
    }

    // No biomes: elevation gradient
    return lerpColor(v.surfaceBaseColor, v.surfaceHighColor, clamp(h * 1.2, 0, 1));
  }

  /** Get biome-specific color (mirrors sampleBiomeColor) */
  private getBiomeColor(tile: SurfaceTile): number {
    const bc = this.visuals.biomeColors;

    switch (tile.biome) {
      case 'tropical_forest': return bc.tropical;
      case 'savanna': return lerpColor(bc.desert, bc.tropical, 0.4);
      case 'desert': return bc.desert;
      case 'temperate_forest': return bc.temperate;
      case 'grassland': return lerpColor(bc.desert, bc.temperate, 0.6);
      case 'boreal_forest': return bc.boreal;
      case 'tundra': return bc.tundra;
      case 'wetland': return lerpColor(bc.temperate, 0x2a5a4a, 0.5);
      case 'volcanic': return lerpColor(0x661100, this.visuals.lavaColor, 0.7);
      case 'ice': return 0xd8e4f4;
      default: return this.visuals.surfaceBaseColor;
    }
  }

  /** Full render pass: terrain + overlays */
  render(): void {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const tileSize = TILE_SIZE * this.zoom;

    // Clear
    ctx.fillStyle = '#000510';
    ctx.fillRect(0, 0, cw, ch);

    // Draw terrain using pre-rendered image
    if (this.terrainImageData) {
      // Create offscreen canvas with terrain
      const offscreen = new OffscreenCanvas(
        this.map.width * TILE_SIZE,
        this.map.height * TILE_SIZE,
      );
      const offCtx = offscreen.getContext('2d')!;
      offCtx.putImageData(this.terrainImageData, 0, 0);

      // Calculate visible region
      const startTileX = Math.floor(this.offsetX);
      const startTileY = Math.floor(this.offsetY);
      const fracX = (this.offsetX - startTileX) * tileSize;
      const fracY = (this.offsetY - startTileY) * tileSize;

      const tilesVisibleX = Math.ceil(cw / tileSize) + 2;
      const tilesVisibleY = Math.ceil(ch / tileSize) + 2;

      // Draw with wrapping
      for (let drawY = -1; drawY < tilesVisibleY; drawY++) {
        const tileY = startTileY + drawY;
        if (tileY < 0 || tileY >= this.map.height) continue;

        for (let drawX = -1; drawX < tilesVisibleX; drawX++) {
          let tileX = (startTileX + drawX) % this.map.width;
          if (tileX < 0) tileX += this.map.width;

          const sx = tileX * TILE_SIZE;
          const sy = tileY * TILE_SIZE;
          const dx = drawX * tileSize - fracX;
          const dy = drawY * tileSize - fracY;

          ctx.drawImage(
            offscreen,
            sx, sy, TILE_SIZE, TILE_SIZE,
            dx, dy, tileSize, tileSize,
          );
        }
      }
    }

    // Draw resource markers
    this.renderResources(ctx, tileSize);

    // Draw buildings
    this.renderBuildings(ctx, tileSize);

    // Draw tile highlight
    this.renderHighlight(ctx, tileSize);

    // Draw grid lines at high zoom
    if (this.zoom >= 3) {
      this.renderGrid(ctx, tileSize);
    }
  }

  private renderResources(ctx: CanvasRenderingContext2D, tileSize: number): void {
    const startTileX = Math.floor(this.offsetX);
    const startTileY = Math.floor(this.offsetY);
    const fracX = (this.offsetX - startTileX) * tileSize;
    const fracY = (this.offsetY - startTileY) * tileSize;

    for (const dep of this.resources) {
      let drawTileX = dep.x - startTileX;
      // Wrap
      while (drawTileX < -1) drawTileX += this.map.width;
      while (drawTileX > this.map.width) drawTileX -= this.map.width;

      const drawTileY = dep.y - startTileY;
      const sx = drawTileX * tileSize - fracX + tileSize / 2;
      const sy = drawTileY * tileSize - fracY + tileSize / 2;

      if (sx < -tileSize || sx > this.canvas.width + tileSize) continue;
      if (sy < -tileSize || sy > this.canvas.height + tileSize) continue;

      const color = RESOURCE_COLORS[dep.element] ?? 0xffffff;
      const { r, g, b } = hexToRGB(color);
      const radius = Math.max(2, tileSize * 0.3);

      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},0.7)`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${r},${g},${b},1)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Show element label at higher zoom
      if (this.zoom >= 2) {
        ctx.fillStyle = '#fff';
        ctx.font = `${Math.max(8, tileSize * 0.4)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(dep.element, sx, sy + radius + 1);
      }
    }
  }

  private renderBuildings(ctx: CanvasRenderingContext2D, tileSize: number): void {
    const startTileX = Math.floor(this.offsetX);
    const startTileY = Math.floor(this.offsetY);
    const fracX = (this.offsetX - startTileX) * tileSize;
    const fracY = (this.offsetY - startTileY) * tileSize;

    for (const building of this.buildings) {
      let drawTileX = building.x - startTileX;
      while (drawTileX < -1) drawTileX += this.map.width;
      while (drawTileX > this.map.width) drawTileX -= this.map.width;

      const drawTileY = building.y - startTileY;
      const sx = drawTileX * tileSize - fracX;
      const sy = drawTileY * tileSize - fracY;

      if (sx < -tileSize * 2 || sx > this.canvas.width + tileSize) continue;
      if (sy < -tileSize * 2 || sy > this.canvas.height + tileSize) continue;

      // Building background
      ctx.fillStyle = 'rgba(10, 20, 40, 0.6)';
      ctx.fillRect(sx, sy, tileSize, tileSize);
      ctx.strokeStyle = 'rgba(100, 160, 220, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, tileSize, tileSize);

      // Building symbol
      const symbol = BUILDING_SYMBOLS[building.type] ?? '?';
      const fontSize = Math.max(10, tileSize * 0.7);
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol, sx + tileSize / 2, sy + tileSize / 2);
    }
  }

  private renderHighlight(ctx: CanvasRenderingContext2D, tileSize: number): void {
    if (!this.highlightedTile) return;

    const startTileX = Math.floor(this.offsetX);
    const startTileY = Math.floor(this.offsetY);
    const fracX = (this.offsetX - startTileX) * tileSize;
    const fracY = (this.offsetY - startTileY) * tileSize;

    let drawTileX = this.highlightedTile.x - startTileX;
    while (drawTileX < -1) drawTileX += this.map.width;
    while (drawTileX > this.map.width) drawTileX -= this.map.width;

    const drawTileY = this.highlightedTile.y - startTileY;
    const sx = drawTileX * tileSize - fracX;
    const sy = drawTileY * tileSize - fracY;

    const tile = this.getTile(this.highlightedTile.x, this.highlightedTile.y);
    if (!tile) return;

    // Color based on buildability
    if (this.selectedBuilding) {
      if (tile.buildable) {
        ctx.strokeStyle = 'rgba(80, 220, 80, 0.8)'; // green: can build
      } else if (tile.waterBuildable) {
        ctx.strokeStyle = 'rgba(80, 160, 220, 0.8)'; // blue: water building
      } else {
        ctx.strokeStyle = 'rgba(220, 80, 80, 0.8)'; // red: can't build
      }
    } else {
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.6)'; // white: info hover
    }

    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, tileSize, tileSize);

    // Semi-transparent fill
    ctx.fillStyle = ctx.strokeStyle.replace('0.8)', '0.15)').replace('0.6)', '0.1)');
    ctx.fillRect(sx, sy, tileSize, tileSize);
  }

  private renderGrid(ctx: CanvasRenderingContext2D, tileSize: number): void {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const fracX = (this.offsetX - Math.floor(this.offsetX)) * tileSize;
    const fracY = (this.offsetY - Math.floor(this.offsetY)) * tileSize;

    ctx.strokeStyle = 'rgba(100, 140, 180, 0.15)';
    ctx.lineWidth = 0.5;

    // Vertical lines
    for (let x = -fracX; x <= cw; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ch);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = -fracY; y <= ch; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cw, y);
      ctx.stroke();
    }
  }
}
