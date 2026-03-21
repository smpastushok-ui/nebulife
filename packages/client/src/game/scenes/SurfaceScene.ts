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
  Polygon,
  Sprite,
  TilingSprite,
  ColorMatrixFilter,
  Assets,
  Texture,
  Rectangle,
} from 'pixi.js';
import type { Planet, Star, PlacedBuilding, BuildingType, HarvestedCell, SurfaceObjectType } from '@nebulife/core';
import { SeededRNG, BUILDING_DEFS, REGROWTH_STAGE_MS } from '@nebulife/core';
import { FogLayer } from './FogLayer.js';
import { RoverVisual, ROVER_REVEAL_RADIUS } from './RoverVisual.js';
import { ResearcherBot, BOT_REVEAL_RADIUS } from './ResearcherBot.js';
import { HarvestEffects, tickSpriteAnims, hasSpriteAnim } from './HarvestEffects.js';
import { HarvesterDroneVisual } from './HarvesterDroneVisual.js';
import {
  TILE_W, TILE_H, FRAME_W, FRAME_H, ATLAS_COLS,
  SPRITE_ANCHOR_Y, TILE_SCALE,
  STUMP_FRAME, TREE_SMALL_FRAME,
  ORE_DEPLETED_FRAME, ORE_SMALL_FRAME,
  VENT_DRY_FRAME, VENT_SMALL_FRAME,
  FEATURE_FRAME,
  computeIsoGridSize,
  gridToScreen,
  classifyCellTerrain,
  terrainToAtlasIndex,
  isLandTerrain,
  isWaterTerrain,
  isCellBuildable,
  isAdjacentToCity,
  derivePlanetAtlasType,
  pickFeatureKey,
  cellMirrorVariant,
  cellHash,
  isTreeCell,
  isOreCell,
  isVentCell,
  isTileHarvestable,
  getTileType,
  findMountainCell,
} from './surface-utils.js';

// ─── Building placement animation ────────────────────────────────────────────

interface BuildingAnim {
  key:    string;
  type:   'nano-print' | 'orbital-drop';
  sprite: Sprite | Graphics;
  timeMs: number;
  done:   boolean;
  // nano-print
  maskGfx?:     Graphics;
  laserGfx?:    Graphics;
  spriteLeft?:  number;
  spriteBottom?: number;
  spriteW?:     number;
  spriteH?:     number;
  // orbital-drop
  targetY?:      number;
  shadowGfx?:    Graphics;
  dustGfx?:      Graphics;
  dustParticles?: Array<{ x: number; y: number; vx: number; vy: number; alpha: number; r: number }>;
  shadowX?:      number;
  shadowBaseY?:  number;
  dustSpawned?:  boolean;
}

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
  alpha_harvester: { top: 0xddcc44, right: 0xaa9922, left: 0x776600 },  // gold landing pad
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
  private effectLayer:   Container;
  private buildingLayer: Container;
  private roverLayer:    Container;

  // Fog of war
  private fogLayer: FogLayer | null = null;

  // Rover (legacy — kept for reference)
  private rover: RoverVisual | null = null;

  // Researcher bot (replaces rover)
  private bot:        ResearcherBot | null = null;
  private botFlyTex:  Texture | null = null;
  private botIdleTex: Texture | null = null;
  /** Impassable cells: water + trees + building footprints. */
  private obstacleSet: Set<string> = new Set();

  // State cached for dynamic redraws
  private planet!: Planet;
  private waterLevel: number = 0.5;
  private baseTexture: Texture | null = null;
  /** Per-frame animation state for colony_hub effects. */
  private hubEffects: {
    rings:       Graphics[];
    scanner:     Graphics;
    blink:       Graphics;
    timeMs:      number;
    hubScreenX:  number;  // world-local X of hub footprint center
    hubScreenY:  number;  // world-local Y of hub footprint top-vertex
    sizeW:       number;
  } | null = null;

  /** Harvest state overrides: key=`${col},${row}` → HarvestedCell */
  private harvestedCells: Map<string, HarvestedCell> = new Map();
  private planetId:        string  = '';
  private regrowthCheckMs: number  = 0;

  /** Pre-loaded building PNG textures: buildingType → Texture */
  private bldgTextures: Partial<Record<string, Texture>> = {};

  // ─── Premium harvester drones ─────────────────────────────────────────────
  private harvesterDrones: HarvesterDroneVisual[] = [];
  private harvesterTex:    Texture | null = null;

  // ─── Building contact shadows (below buildingLayer) ──────────────────────
  private buildingShadowGfx: Graphics | null = null;

  // ─── Noise overlay ────────────────────────────────────────────────────────
  private noiseOverlayGfx: Graphics | null = null;

  // ─── Shoreline foam ───────────────────────────────────────────────────────
  private foamGfx:    Graphics | null = null;
  private foamTimeMs: number = 0;
  private shorelineCells: Array<{ col: number; row: number; phase: number }> = [];

  // ─── Concrete pads under buildings ───────────────────────────────────────
  private concreteLayer: Container;

  // ─── Clouds (TilingSprite) ────────────────────────────────────────────────
  private cloudShadowSprite: TilingSprite | null = null;
  private cloudBodySprite:   TilingSprite | null = null;

  // ─── Harvest visual effects ───────────────────────────────────────────────
  private harvestFx:       HarvestEffects | null = null;
  /** Temp sprites on effectLayer being driven by HarvestEffects animations. */
  private animatedSprites: Sprite[]              = [];

  // ─── Building placement animations ───────────────────────────────────────
  private buildingAnims:  BuildingAnim[] = [];
  private animatedKeys:   Set<string>    = new Set();
  private screenShakeMs:  number         = 0;

  // ─── Ghost preview layer ─────────────────────────────────────────────────
  private ghostLayer: Container;

  constructor() {
    this.worldContainer = new Container();

    this.groundLayer   = new Container();
    this.featureLayer  = new Container();
    this.corridorLayer = new Container();
    this.overlayLayer  = new Container();
    this.effectLayer   = new Container();
    this.buildingLayer = new Container();
    this.roverLayer    = new Container();
    this.ghostLayer    = new Container();
    this.concreteLayer = new Container();

    this.foamGfx           = new Graphics();
    this.noiseOverlayGfx   = new Graphics();
    this.buildingShadowGfx = new Graphics();
    this.harvestFx = new HarvestEffects(this.effectLayer, this.worldContainer);

    // sortableChildren needed for Y-sorting in feature/building layers
    this.featureLayer.sortableChildren  = true;
    this.buildingLayer.sortableChildren = true;

    this.worldContainer.addChild(
      this.groundLayer,
      this.concreteLayer,   // concrete pads under buildings — above terrain, below noise
      this.noiseOverlayGfx, // macro-relief tint — just above ground tiles
      this.foamGfx,         // shoreline foam — on top of terrain, under cloud shadows
      // cloudShadowSprite inserted here (index 4) after texture load in init()
      this.featureLayer,
      this.corridorLayer,
      this.overlayLayer,
      this.effectLayer,        // pulsing rings + scanner — above zone overlay, below buildings
      this.buildingShadowGfx!, // contact shadows — below building sprites
      this.buildingLayer,
      this.roverLayer,    // rover — above buildings
      this.ghostLayer,    // building placement ghost — above rover, below clouds
      // cloudBodySprite inserted above ghostLayer after texture load in init()
      // fogLayer is added last (topmost) after init
    );
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  async init(planet: Planet, star: Star, buildings: PlacedBuilding[]): Promise<void> {
    this.planet     = planet;
    this.planetId   = planet.id;
    this.gridSize   = computeIsoGridSize(planet.radiusEarth * 6371);
    this.waterLevel = planet.hydrosphere?.waterCoverageFraction ?? 0;

    // Restore harvested cells from localStorage and advance any pending regrowth
    try {
      const saved = localStorage.getItem(`harvest_${planet.id}`);
      if (saved) this.harvestedCells = new Map(JSON.parse(saved) as [string, HarvestedCell][]);
    } catch { /* ignore parse errors */ }
    this.advanceRegrowth();

    const atlasType = derivePlanetAtlasType(planet, star);
    const atlasUrl  = `/tiles/tiles_${atlasType}.png`;

    try {
      this.baseTexture = await Assets.load<Texture>(atlasUrl);
    } catch {
      // Atlas not available yet — render without sprites (fallback: colored diamonds)
      this.baseTexture = null;
    }

    // Pre-load building PNG textures (non-blocking — fail silently)
    const BUILDING_PNGS: Partial<Record<string, string>> = {
      colony_hub:       '/buildings/colony_hub.png',
      resource_storage: '/tiles/machines/resource_storage.png',
      landing_pad:      '/tiles/machines/landing_pad.png',
      spaceport:        '/tiles/machines/spaceport.png',
    };
    await Promise.all(
      Object.entries(BUILDING_PNGS).map(async ([type, url]) => {
        if (!url) return;
        try {
          this.bldgTextures[type] = await Assets.load<Texture>(url);
        } catch { /* no PNG for this building — use procedural */ }
      }),
    );

    // Load researcher bot textures
    try {
      [this.botFlyTex, this.botIdleTex] = await Promise.all([
        Assets.load<Texture>('/tiles/machines/bot_resercher.png'),
        Assets.load<Texture>('/tiles/machines/bot_resercher_off.png'),
      ]);
    } catch { /* no bot textures — bot will not spawn */ }

    // Load premium harvester drone texture
    try {
      this.harvesterTex = await Assets.load<Texture>('/tiles/machines/premium_harvester_drone.png');
    } catch { /* no harvester texture — drones will not spawn */ }

    this.drawGroundLayer();
    this._buildNoiseOverlay();
    this._buildShorelineCells();
    this.placeMountOverlay();   // 3×3 mountain sprite on featureLayer (test visual)

    // Pre-mark existing buildings so they don't animate on scene load
    for (const b of buildings) this.animatedKeys.add(`${b.x},${b.y}`);
    this.rebuildBuildings(buildings);

    // Fog of war — init after buildings so hub position is known
    this.fogLayer = new FogLayer(this.gridSize, planet.id);
    this.worldContainer.addChild(this.fogLayer.container);  // topmost
    this.fogLayer.initFromBuildings(buildings);

    // Atmospheric clouds (TilingSprite)
    await this._initCloudSprites();

    // Drone explorer — only spawn if colony hub already exists
    const hub = buildings.find((b) => b.type === 'colony_hub');
    if (hub) {
      this._spawnBotNearHub(hub);
    }

    // Premium harvester drones — spawn for each alpha_harvester building
    for (const b of buildings) {
      if (b.type === 'alpha_harvester') this._spawnHarvesterDrone(b);
    }
  }

  /** Spawn a drone explorer next to a colony hub building. */
  private _spawnBotNearHub(hub: PlacedBuilding): void {
    if (this.bot || !this.botFlyTex || !this.botIdleTex) return;
    const hubDef = BUILDING_DEFS[hub.type];
    const col = hub.x + (hubDef?.sizeW ?? 2) + 1;
    const row = hub.y + Math.floor((hubDef?.sizeH ?? 2) / 2);
    this.bot = new ResearcherBot(col, row, this.botFlyTex, this.botIdleTex);
    this.roverLayer.addChild(this.bot.container);
  }

  /** Public API: spawn drone when colony hub is built during gameplay. */
  public spawnBotAtHub(hub: PlacedBuilding): void {
    this._spawnBotNearHub(hub);
    // Also reveal fog around the hub (30-tile radius)
    if (this.fogLayer) {
      const def = BUILDING_DEFS[hub.type];
      const cx = hub.x + (def?.sizeW ?? 2) / 2 - 0.5;
      const cy = hub.y + (def?.sizeH ?? 2) / 2 - 0.5;
      this.fogLayer.revealAround(cx, cy, def?.fogRevealRadius ?? 30);
      this.fogLayer.redraw();
    }
  }

  // ─── Premium harvester drone ─────────────────────────────────────────────

  /** Spawn a HarvesterDroneVisual for an alpha_harvester building. */
  private _spawnHarvesterDrone(building: PlacedBuilding): void {
    if (!this.harvesterTex) return;
    // Drone hovers above centre of building footprint
    const homeCol = building.x + 0.5;
    const homeRow = building.y + 0.5;

    const drone = new HarvesterDroneVisual(
      homeCol,
      homeRow,
      this.harvesterTex,
      () => this._findNearbyHarvestable(homeCol, homeRow, 10),
      (col, row) => { this.harvestAt(col, row); },
    );
    this.roverLayer.addChild(drone.container);
    this.harvesterDrones.push(drone);
  }

  /** Public API: spawn harvester drone when alpha_harvester is placed during gameplay. */
  public spawnHarvesterDrone(building: PlacedBuilding): void {
    this._spawnHarvesterDrone(building);
  }

  /**
   * Find the nearest unharvestedresource cell within radius of (homeCol, homeRow).
   * Returns Ukrainian resource label for UI feedback.
   */
  private _findNearbyHarvestable(
    homeCol: number,
    homeRow: number,
    radius: number,
  ): { col: number; row: number; label: string } | null {
    const seed = this.planet?.seed ?? 0;
    const wl   = this.waterLevel;
    const N    = this.gridSize;

    // Spiral outward from home position
    let bestDist = Infinity;
    let best: { col: number; row: number; label: string } | null = null;

    for (let dc = -radius; dc <= radius; dc++) {
      for (let dr = -radius; dr <= radius; dr++) {
        const dist = Math.abs(dc) + Math.abs(dr);
        if (dist > radius) continue;
        const c = Math.round(homeCol) + dc;
        const r = Math.round(homeRow) + dr;
        if (c < 0 || c >= N || r < 0 || r >= N) continue;
        const k = `${c},${r}`;
        if (this.harvestedCells.has(k)) continue;   // already depleted

        let label: string | null = null;
        if (isTreeCell(c, r, seed, N, wl)) label = 'Деревина';
        else if (isOreCell(c, r, seed, N, wl))  label = 'Руда';
        else if (isVentCell(c, r, seed, N, wl)) label = 'Газ';

        if (label && dist < bestDist) {
          bestDist = dist;
          best = { col: c, row: r, label };
        }
      }
    }
    return best;
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
        const terrain   = classifyCellTerrain(col, row, seed, wl, N);
        const { x, y }  = gridToScreen(col, row);
        const baseY     = y + TILE_H / 2;

        // Water → always drawn programmatically (no sprite seam artefacts)
        if (isWaterTerrain(terrain) || terrain === 'beach') {
          this.groundLayer.addChild(this.makeWaterDiamond(x, baseY, terrain));
          continue;
        }

        // Lowland / plains / hills / mountains / peaks → sprite from atlas
        const defaultFrame = terrainToAtlasIndex(terrain, col, row, seed);
        const frameIdx = defaultFrame !== null ? this.getEffectiveFrame(col, row, defaultFrame) : null;
        const tex      = frameIdx !== null ? this.getFrame(frameIdx) : null;

        if (tex) {
          const sp = new Sprite(tex);
          sp.anchor.set(0.5, SPRITE_ANCHOR_Y);
          sp.scale.set(TILE_SCALE, TILE_SCALE);
          sp.position.set(x, baseY);  // integer TILE_H/2=41 → x,y already integers; no rounding needed
          this.groundLayer.addChild(sp);
        } else {
          // Fallback: colored diamond when atlas not available
          this.groundLayer.addChild(this.makeFallbackDiamond(x, baseY, terrain));
        }
      }
    }
  }

  /**
   * Programmatic water diamond — flat isometric shape, no box-tile artefacts.
   * Uses game-palette navy shades; subtle per-cell variation via a tiny shade offset.
   */
  private makeWaterDiamond(cx: number, cy: number, terrain: string): Graphics {
    const hW = TILE_W / 2;
    const hH = TILE_H / 2;
    const g  = new Graphics();
    const color = WATER_COLORS[terrain] ?? 0x0d1f35;
    g.poly([cx, cy - hH, cx + hW, cy, cx, cy + hH, cx - hW, cy]);
    g.fill({ color });
    return g;
  }

  /**
   * Procedural isometric box for elevated terrain (hills / mountains / peaks).
   * The box height scales with terrain elevation.  Sides use 3-face iso shading.
   * Safe with Painter's Algorithm: box height < TILE_H so front tiles always cover.
   */
  private makeMountainBox(cx: number, cy: number, terrain: string): Graphics {
    const hW = TILE_W / 2;
    const hH = TILE_H / 2;
    const g  = new Graphics();

    const cfg = MOUNTAIN_COLORS[terrain] ?? MOUNTAIN_COLORS.hills;
    const bH  = cfg.height;

    // Left side face (darker — faces top-left)
    g.poly([cx - hW, cy - bH, cx, cy - bH + hH, cx, cy + hH, cx - hW, cy]);
    g.fill({ color: cfg.left });

    // Right side face (medium — faces bottom-right)
    g.poly([cx + hW, cy - bH, cx, cy - bH + hH, cx, cy + hH, cx + hW, cy]);
    g.fill({ color: cfg.right });

    // Top face (lightest — faces up)
    g.poly([cx, cy - bH - hH, cx + hW, cy - bH, cx, cy - bH + hH, cx - hW, cy - bH]);
    g.fill({ color: cfg.top });

    return g;
  }

  /** Procedural diamond tile when atlas is unavailable (land fallback). */
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
        const terrain = classifyCellTerrain(col, row, seed, wl, this.gridSize);
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

  // ─── Mountain overlay (procedural layered slabs) ─────────────────────────

  /**
   * Render a procedural layered mountain on featureLayer.
   * 4 isometric slab layers (7×7 → 5×5 → 3×3 → 1×1), forming a centered pyramid.
   * Each slab draws 3 faces: SE wall (right), SW wall (left), top face.
   * Colors: dark warm earth base → warm stone → cool gray rock → near-snow peak.
   */
  private placeMountOverlay(): void {
    this.featureLayer.removeChildren();

    const pos = findMountainCell(this.planet.seed, this.gridSize);
    if (!pos) return;

    const { col, row } = pos;
    const TW2 = TILE_W / 2;
    const TH2 = TILE_H / 2;

    // Grid cell → local-space screen position
    const gts = (c: number, r: number) => ({ x: (c - r) * TW2, y: (c + r) * TH2 });

    interface SlabDef {
      sW: number; sH: number; c0: number; r0: number;
      h: number; top: number; se: number; sw: number;
    }

    // Layer colors: dark warm earth base → warm stone → cool gray rock → near-snow peak
    const LAYERS: SlabDef[] = [
      { sW:7, sH:7, c0:0, r0:0, h:68, top:0x4e3a28, se:0x362618, sw:0x221610 },
      { sW:5, sH:5, c0:1, r0:1, h:88, top:0x7c6450, se:0x5a4a3c, sw:0x3e3028 },
      { sW:3, sH:3, c0:2, r0:2, h:88, top:0xa09080, se:0x7e6e66, sw:0x5e5450 },
      { sW:1, sH:1, c0:3, r0:3, h:76, top:0xd8d4ce, se:0xb6b0aa, sw:0x92908c },
    ];

    const g = new Graphics();
    let hAccum = 0;

    for (const layer of LAYERS) {
      hAccum += layer.h;
      const hTop = hAccum;
      const hBot = hTop - layer.h;

      const T  = gts(col + layer.c0,            row + layer.r0           );
      const R  = gts(col + layer.c0 + layer.sW,  row + layer.r0           );
      const B  = gts(col + layer.c0 + layer.sW,  row + layer.r0 + layer.sH);
      const Lv = gts(col + layer.c0,             row + layer.r0 + layer.sH);

      // SE wall (right-front face)
      g.poly([R.x, R.y - hTop,  B.x, B.y - hTop,  B.x, B.y - hBot,  R.x, R.y - hBot]);
      g.fill({ color: layer.se });
      g.stroke({ width: 0.6, color: 0x000000, alpha: 0.18 });

      // SW wall (left-front face)
      g.poly([Lv.x, Lv.y - hTop,  B.x, B.y - hTop,  B.x, B.y - hBot,  Lv.x, Lv.y - hBot]);
      g.fill({ color: layer.sw });
      g.stroke({ width: 0.6, color: 0x000000, alpha: 0.18 });

      // Top face
      g.poly([T.x, T.y - hTop,  R.x, R.y - hTop,  B.x, B.y - hTop,  Lv.x, Lv.y - hTop]);
      g.fill({ color: layer.top });
      g.stroke({ width: 0.6, color: 0x000000, alpha: 0.12 });
    }

    // zIndex: front-bottom vertex of the base 7×7 layer
    const frontBot = gts(col + 7, row + 7);
    g.zIndex = frontBot.y;

    this.featureLayer.sortableChildren = true;
    this.featureLayer.addChild(g);
  }

  // ─── Buildings (dynamic) ──────────────────────────────────────────────────

  public rebuildBuildings(buildings: PlacedBuilding[]): void {
    this.buildingLayer.removeChildren();
    this.effectLayer.removeChildren();
    this.hubEffects = null;
    this.drawCorridors(buildings);
    this._buildObstacleSet(buildings);
    this._rebuildBuildingShadows(buildings);
    this._rebuildConcretePads(buildings);

    // Y-sort: farther (smaller y) drawn first
    const sorted = [...buildings].sort((a, b) => {
      return gridToScreen(a.x, a.y).y - gridToScreen(b.x, b.y).y;
    });

    for (const b of sorted) {
      if (b.type === 'colony_hub') this.createHubEffects(b);
      const bldg = this.makeIsoBuilding(b);
      this.buildingLayer.addChild(bldg);
      const key = `${b.x},${b.y}`;
      if (!this.animatedKeys.has(key)) {
        this.animatedKeys.add(key);
        this._startBuildingAnim(b, bldg);
      }
    }
  }

  /** Create animated effect Graphics for a colony_hub building. */
  private createHubEffects(b: PlacedBuilding): void {
    const def   = BUILDING_DEFS[b.type];
    const sizeW = def?.sizeW ?? 2;

    // Screen coords: horizontal center of footprint, Y of top-left cell's diamond top
    const cx = (b.x - b.y) * (TILE_W / 2);
    const cy = gridToScreen(b.x, b.y).y + TILE_H / 2;

    const rings: Graphics[] = [new Graphics(), new Graphics(), new Graphics()];
    const scanner = new Graphics();
    const blink   = new Graphics();

    for (const r of rings) this.effectLayer.addChild(r);
    this.effectLayer.addChild(scanner);
    this.effectLayer.addChild(blink);

    this.hubEffects = { rings, scanner, blink, timeMs: 0, hubScreenX: cx, hubScreenY: cy, sizeW };
  }

  /** Per-frame animation tick — called by PixiJS app.ticker in SurfacePixiView. */
  public update(deltaMs: number): void {
    // Check regrowth every minute (not every frame)
    this.regrowthCheckMs += deltaMs;
    if (this.regrowthCheckMs > 60_000) {
      this.regrowthCheckMs = 0;
      this.advanceRegrowth();
    }

    // Animate harvest visual effects (particles + sprite collapse/flash)
    this.harvestFx?.update(deltaMs);
    for (let i = this.animatedSprites.length - 1; i >= 0; i--) {
      const sp = this.animatedSprites[i];
      tickSpriteAnims(sp, deltaMs);
      if (!hasSpriteAnim(sp)) this.animatedSprites.splice(i, 1);
    }

    // Animate harvest progress ring
    this.drawHarvestRing(deltaMs);

    // Animate shoreline foam
    this._updateFoam(deltaMs);

    // Animate atmospheric clouds
    this._updateCloudSprites(deltaMs);

    // Building placement animations
    this._tickBuildingAnims(deltaMs);

    // Animate researcher bot + reveal fog only when crossing into a new cell
    if (this.bot) {
      const crossed = this.bot.update(deltaMs);
      if (crossed && this.fogLayer) {
        this.fogLayer.revealAround(Math.round(this.bot.col), Math.round(this.bot.row), BOT_REVEAL_RADIUS);
        this.fogLayer.redraw();
      }
    }

    // Animate premium harvester drones + trigger screen shake on absorption
    for (const drone of this.harvesterDrones) {
      drone.update(deltaMs);
      if (drone.screenShakeRequested) {
        this.harvestFx?.screenShake(2, 280);
      }
    }

    if (!this.hubEffects) return;
    const eff = this.hubEffects;
    eff.timeMs += deltaMs;
    const t  = eff.timeMs;
    const cx = eff.hubScreenX;
    const cy = eff.hubScreenY;
    const sW = eff.sizeW;

    // ── Pulsing iso-diamond rings (#4488aa) ────────────────────────────────
    const RING_PHASES = [0, Math.PI * 0.6, Math.PI * 1.2];
    for (let i = 0; i < eff.rings.length; i++) {
      const g  = eff.rings[i];
      const n  = i + 1;   // 1, 2, 3 cells spacing from footprint edge
      const hW = (sW / 2 + n) * (TILE_W / 2);
      const hH = (sW / 2 + n) * (TILE_H / 2);
      const a  = 0.1 + 0.5 * (0.5 + 0.5 * Math.sin((t / 2000) * Math.PI * 2 + RING_PHASES[i]));
      g.clear();
      g.poly([cx, cy - hH, cx + hW, cy, cx, cy + hH, cx - hW, cy]);
      g.stroke({ width: 1.5, color: 0x4488aa, alpha: a });
    }

    // ── Rotating scanner arc (#44ff88) ─────────────────────────────────────
    {
      const g       = eff.scanner;
      const hWa     = (sW / 2 + 3.5) * (TILE_W / 2);
      const hHa     = (sW / 2 + 3.5) * (TILE_H / 2);
      const angle   = (t / 3000) * Math.PI * 2;
      const arcSpan = Math.PI / 3;   // 60°
      const segs    = 8;
      g.clear();
      for (let i = 0; i <= segs; i++) {
        const th = angle + (i / segs) * arcSpan;
        const px = cx + hWa * Math.cos(th);
        const py = cy + hHa * Math.sin(th);
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.stroke({ width: 2, color: 0x44ff88, alpha: 0.7 });
    }

    // ── Blink dot at hub apex (#44ff88) ────────────────────────────────────
    {
      const g      = eff.blink;
      const hH_hub = (sW / 2) * (TILE_H / 2);
      const bW = 6, bH = 4;
      const bAlpha = Math.round(0.5 + 0.5 * Math.sin((t / 1500) * Math.PI * 2));
      g.clear();
      if (bAlpha > 0) {
        g.poly([cx, cy - hH_hub - bH, cx + bW, cy - hH_hub, cx, cy - hH_hub + bH, cx - bW, cy - hH_hub]);
        g.fill({ color: 0x44ff88, alpha: 0.9 });
      }
    }
  }

  /**
   * Render a building.
   * - If a PNG texture exists for this type: draw it as a sprite scaled to its tile footprint.
   * - Otherwise: procedural isometric box (colored polygons).
   * Contact shadows are drawn on buildingShadowGfx (separate layer below this one).
   */
  private makeIsoBuilding(b: PlacedBuilding): Graphics | Sprite {
    const def    = BUILDING_DEFS[b.type];
    const sizeW  = def?.sizeW ?? 1;
    const sizeH  = def?.sizeH ?? 1;
    const tex    = this.bldgTextures[b.type];

    if (tex) {
      // PNG sprite — anchor at the bottom center of the sprite (ground contact point).
      // Position at the bottom vertex of the isometric footprint diamond so the
      // concrete pad and the sprite share the same coordinate origin.
      const TW2     = TILE_W / 2;
      const TH2     = TILE_H / 2;
      const footBotX = (b.x + sizeW - b.y - sizeH) * TW2;
      const footBotY = (b.x + sizeW + b.y + sizeH) * TH2;

      const sp = new Sprite(tex);
      sp.anchor.set(0.5, 1.0);              // bottom center = ground contact
      const scale = (sizeW * TILE_W) / tex.width;
      sp.scale.set(scale);
      sp.position.set(footBotX, footBotY);
      sp.zIndex = footBotY;

      // Restrict interactive hit zone to the isometric footprint diamond.
      // Prevents the transparent upper area of the sprite from blocking clicks
      // on features (trees/ore) that sit behind the building in screen space.
      // Coords are sprite-local with anchor (0.5, 1.0) = bottom vertex = (0, 0).
      sp.hitArea = new Polygon([
        (sizeH - sizeW) * TW2, -(sizeW + sizeH) * TH2,  // top (back) vertex
         sizeH            * TW2, -sizeH          * TH2,  // right vertex
         0,                       0,                     // bottom (front) vertex = anchor
        -sizeW            * TW2, -sizeW          * TH2,  // left vertex
      ]);
      return sp;
    }

    // Procedural isometric box (fallback or non-PNG buildings)
    const { x, y } = gridToScreen(b.x, b.y);
    const baseY    = y + TILE_H / 2;
    const hW       = TILE_W  * 0.40 * sizeW;
    const hH       = TILE_H  * 0.40 * sizeH;
    const bH       = TILE_H  * 0.85;

    // Use the same front-vertex Y as the sprite path so mixed sprite/procedural
    // buildings at adjacent rows always sort correctly.
    const footBotY_z = (b.x + sizeW + b.y + sizeH) * (TILE_H / 2);

    const colors = BUILDING_COLORS[b.type] ?? DEFAULT_BUILDING_COLORS;
    const g = new Graphics();
    g.zIndex = footBotY_z;

    g.poly([x, baseY - bH - hH, x + hW, baseY - bH, x, baseY - bH + hH, x - hW, baseY - bH]);
    g.fill(colors.top);
    g.poly([x + hW, baseY - bH, x + hW, baseY, x, baseY + hH, x, baseY - bH + hH]);
    g.fill(colors.right);
    g.poly([x, baseY - bH + hH, x, baseY + hH, x - hW, baseY, x - hW, baseY - bH]);
    g.fill(colors.left);

    return g;
  }

  /**
   * Redraw all building contact shadows onto buildingShadowGfx.
   * Flat diamond at foundation level — shadow center is shifted toward the base slab
   * so it doesn't show through transparent side-pixels of tall building sprites.
   */
  private _rebuildBuildingShadows(buildings: PlacedBuilding[]): void {
    const g = this.buildingShadowGfx;
    if (!g) return;
    g.clear();

    for (const b of buildings) {
      const def   = BUILDING_DEFS[b.type];
      const sizeW = def?.sizeW ?? 1;
      const sizeH = def?.sizeH ?? 1;

      const cx = (b.x - b.y) * (TILE_W / 2);

      // Shadow removed — building sprite is shifted down 15px instead (see makeIsoBuilding).
      void b;  // suppress unused-variable warning inside the loop
    }
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

    const def    = BUILDING_DEFS[selectedType];
    const sW     = def?.sizeW ?? 1;
    const sH     = def?.sizeH ?? 1;
    const N      = this.gridSize;
    const seed   = this.planet.seed;
    const wl     = this.waterLevel;
    const hasCity = buildings.length > 0;
    const g      = new Graphics();

    for (let col = 0; col <= N - sW; col++) {
      for (let row = 0; row <= N - sH; row++) {
        // All cells in footprint must be buildable terrain, no live resources, and revealed
        let ok = true;
        for (let dc = 0; dc < sW && ok; dc++) {
          for (let dr = 0; dr < sH && ok; dr++) {
            const c = col + dc; const r = row + dr;
            if (!isCellBuildable(c, r, seed, wl, selectedType)) { ok = false; break; }
            const k = `${c},${r}`;
            if (isTreeCell(c, r, seed, N, wl) && !this.harvestedCells.has(k)) { ok = false; break; }
            if (isOreCell(c, r, seed, N, wl)  && !this.harvestedCells.has(k)) { ok = false; break; }
            if (isVentCell(c, r, seed, N, wl) && !this.harvestedCells.has(k)) { ok = false; break; }
            if (this.fogLayer && !this.fogLayer.isRevealed(c, r)) { ok = false; break; }
          }
        }
        if (!ok) continue;

        // Footprint must not overlap or touch any existing building (enforces 1-cell gap)
        let tooClose = false;
        for (const b of buildings) {
          const bSW = BUILDING_DEFS[b.type]?.sizeW ?? 1;
          const bSH = BUILDING_DEFS[b.type]?.sizeH ?? 1;
          if (col <= b.x + bSW && col + sW >= b.x && row <= b.y + bSH && row + sH >= b.y) {
            tooClose = true; break;
          }
        }
        if (tooClose) continue;

        // Must be reachable (1-cell gap away) from existing city
        if (hasCity && !isAdjacentToCity(col, row, sW, sH, buildings)) continue;

        // Draw footprint diamond (one per valid position)
        const TW2 = TILE_W / 2;
        const TH2 = TILE_H / 2;
        const topX    = (col - row) * TW2;
        const topY    = (col + row) * TH2;
        const rightX  = (col + sW - row) * TW2;
        const rightY  = (col + sW - 1 + row) * TH2 + TH2;
        const bottomX = (col + sW - row - sH) * TW2;
        const bottomY = (col + sW + row + sH) * TH2;
        const leftX   = (col - row - sH) * TW2;
        const leftY   = (col + row + sH) * TH2;

        g.poly([topX, topY, rightX, rightY, bottomX, bottomY, leftX, leftY]);
        g.fill({ color: 0x44ff88, alpha: 0.18 });
        g.stroke({ width: 1.5, color: 0x44ff88, alpha: 0.55 });
      }
    }
    this.overlayLayer.addChild(g);
  }

  // ─── Public accessors ─────────────────────────────────────────────────────

  /** Check if a building footprint fits at (col,row): terrain + no overlap + adjacency. */
  public canBuildAt(
    col: number,
    row: number,
    buildingType: BuildingType,
    buildings: PlacedBuilding[],
  ): boolean {
    const def  = BUILDING_DEFS[buildingType];
    const sW   = def?.sizeW ?? 1;
    const sH   = def?.sizeH ?? 1;
    const N    = this.gridSize;
    const seed = this.planet.seed;
    const wl   = this.waterLevel;

    if (col + sW > N || row + sH > N) return false;

    // All footprint cells must have correct terrain, no live resources, and be revealed
    for (let dc = 0; dc < sW; dc++) {
      for (let dr = 0; dr < sH; dr++) {
        const c = col + dc; const r = row + dr;
        if (!isCellBuildable(c, r, seed, wl, buildingType)) return false;
        const k = `${c},${r}`;
        if (isTreeCell(c, r, seed, N, wl) && !this.harvestedCells.has(k)) return false;
        if (isOreCell(c, r, seed, N, wl)  && !this.harvestedCells.has(k)) return false;
        if (isVentCell(c, r, seed, N, wl) && !this.harvestedCells.has(k)) return false;
        if (this.fogLayer && !this.fogLayer.isRevealed(c, r)) return false;
      }
    }

    // Footprint must not overlap or touch any existing building (enforces 1-cell gap).
    // Uses inclusive bounds: col <= bx+bSW catches both overlap and 0-cell touching.
    for (const b of buildings) {
      const bSW = BUILDING_DEFS[b.type]?.sizeW ?? 1;
      const bSH = BUILDING_DEFS[b.type]?.sizeH ?? 1;
      if (col <= b.x + bSW && col + sW >= b.x && row <= b.y + bSH && row + sH >= b.y) return false;
    }

    // Must be reachable (1-cell gap away) from existing city
    if (buildings.length > 0 && !isAdjacentToCity(col, row, sW, sH, buildings)) return false;
    return true;
  }

  /** Deterministic terrain for a cell. */
  public terrainAt(col: number, row: number): string {
    return classifyCellTerrain(col, row, this.planet.seed, this.waterLevel, this.gridSize);
  }

  // ─── Harvest / regrowth ───────────────────────────────────────────────────

  /**
   * Override frame for a cell if it has been harvested.
   * Returns the default frame if the cell is not in the harvest map.
   */
  private getEffectiveFrame(col: number, row: number, defaultFrame: number): number {
    const cell = this.harvestedCells.get(`${col},${row}`);
    if (!cell) return defaultFrame;
    // Tree harvest states
    if (cell.state === 'stump')      return STUMP_FRAME;
    if (cell.state === 'grass')      return 10 + cell.grassVariant;  // grass-1/2/3
    if (cell.state === 'tree-small') return TREE_SMALL_FRAME;
    // Ore harvest states
    if (cell.state === 'depleted')   return ORE_DEPLETED_FRAME;
    if (cell.state === 'ore-small')  return ORE_SMALL_FRAME;
    // Vent harvest states
    if (cell.state === 'dry')        return VENT_DRY_FRAME;
    if (cell.state === 'vent-small') return VENT_SMALL_FRAME;
    return defaultFrame;
  }

  /**
   * Harvest a tree at (col, row).
   * Only valid for blob-zone cells that haven't already been harvested.
   * Triggers an immediate ground-layer redraw.
   */
  public harvestTree(col: number, row: number): void {
    const key     = `${col},${row}`;
    const N       = this.gridSize;
    const seed    = this.planet.seed;
    const wl      = this.waterLevel;

    if (!isTreeCell(col, row, seed, N, wl)) return;
    if (this.harvestedCells.has(key)) return;  // already cut

    const defaultFrame = terrainToAtlasIndex(
      classifyCellTerrain(col, row, seed, wl, N), col, row, seed,
    ) ?? 13;

    this.harvestedCells.set(key, {
      objectType:   'tree',
      state:        'stump',
      grassVariant: Math.floor(cellHash(col, row, seed + 5555) * 3),  // 0–2 deterministic
      treeVariant:  defaultFrame - 13,  // 0–2
      changedAt:    Date.now(),
    });
    this.saveHarvested();
    this.drawGroundLayer();
  }

  /**
   * Harvest an ore deposit at (col, row).
   * Only valid for ore-zone cells that haven't already been harvested.
   */
  public harvestOre(col: number, row: number): void {
    const key  = `${col},${row}`;
    const N    = this.gridSize;
    const seed = this.planet.seed;
    const wl   = this.waterLevel;

    if (!isOreCell(col, row, seed, N, wl)) return;
    if (this.harvestedCells.has(key)) return;

    const defaultFrame = terrainToAtlasIndex(
      classifyCellTerrain(col, row, seed, wl, N), col, row, seed,
    ) ?? 18;

    this.harvestedCells.set(key, {
      objectType:   'ore',
      state:        'depleted',
      grassVariant: Math.floor(cellHash(col, row, seed + 5555) * 3),
      treeVariant:  defaultFrame - 18,  // 0–2 ore variant
      changedAt:    Date.now(),
    });
    this.saveHarvested();
    this.drawGroundLayer();
  }

  /**
   * Harvest a vent source at (col, row).
   * Only valid for vent-zone cells that haven't already been harvested.
   */
  public harvestVent(col: number, row: number): void {
    const key  = `${col},${row}`;
    const N    = this.gridSize;
    const seed = this.planet.seed;
    const wl   = this.waterLevel;

    if (!isVentCell(col, row, seed, N, wl)) return;
    if (this.harvestedCells.has(key)) return;

    const defaultFrame = terrainToAtlasIndex(
      classifyCellTerrain(col, row, seed, wl, N), col, row, seed,
    ) ?? 21;

    this.harvestedCells.set(key, {
      objectType:   'vent',
      state:        'dry',
      grassVariant: Math.floor(cellHash(col, row, seed + 5555) * 3),
      treeVariant:  defaultFrame - 21,  // 0–2 vent variant
      changedAt:    Date.now(),
    });
    this.saveHarvested();
    this.drawGroundLayer();
  }

  /**
   * Generic harvest: detect object type at (col, row) and harvest it.
   * Returns the object type harvested, or null if nothing harvestable.
   */
  public harvestAt(col: number, row: number): SurfaceObjectType | null {
    const key = `${col},${row}`;
    if (this.harvestedCells.has(key)) return null;

    const N    = this.gridSize;
    const seed = this.planet.seed;
    const wl   = this.waterLevel;

    if (isTreeCell(col, row, seed, N, wl)) {
      this.harvestTree(col, row);
      return 'tree';
    }
    if (isOreCell(col, row, seed, N, wl)) {
      this.harvestOre(col, row);
      return 'ore';
    }
    if (isVentCell(col, row, seed, N, wl)) {
      this.harvestVent(col, row);
      return 'vent';
    }
    return null;
  }

  /**
   * Check if cell has a harvestable object (tree, ore, or vent) in default state.
   */
  public isHarvestableAt(col: number, row: number): SurfaceObjectType | null {
    const key = `${col},${row}`;
    if (this.harvestedCells.has(key)) return null;

    const N    = this.gridSize;
    const seed = this.planet.seed;
    const wl   = this.waterLevel;

    if (isTreeCell(col, row, seed, N, wl)) return 'tree';
    if (isOreCell(col, row, seed, N, wl))  return 'ore';
    if (isVentCell(col, row, seed, N, wl)) return 'vent';
    return null;
  }

  /**
   * Advance regrowth for any harvested cells that have waited long enough.
   * Uses REGROWTH_STAGE_MS per object type:
   *   tree: stump → grass → tree-small → (removed) — 1h per stage
   *   ore:  depleted → ore-small → (removed)        — 1h per stage
   *   vent: dry → vent-small → (removed)            — 2h per stage
   */
  private advanceRegrowth(): void {
    const now     = Date.now();
    let   changed = false;

    for (const [key, cell] of this.harvestedCells) {
      const objType  = cell.objectType ?? 'tree';  // backward compat
      const stageMs  = REGROWTH_STAGE_MS[objType];
      if (now - cell.changedAt < stageMs) continue;

      if (objType === 'tree') {
        if (cell.state === 'stump') {
          cell.state = 'grass';      cell.changedAt = now; changed = true;
        } else if (cell.state === 'grass') {
          cell.state = 'tree-small'; cell.changedAt = now; changed = true;
        } else if (cell.state === 'tree-small') {
          this.harvestedCells.delete(key); changed = true;
        }
      } else if (objType === 'ore') {
        if (cell.state === 'depleted') {
          cell.state = 'ore-small'; cell.changedAt = now; changed = true;
        } else if (cell.state === 'ore-small') {
          this.harvestedCells.delete(key); changed = true;
        }
      } else if (objType === 'vent') {
        if (cell.state === 'dry') {
          cell.state = 'vent-small'; cell.changedAt = now; changed = true;
        } else if (cell.state === 'vent-small') {
          this.harvestedCells.delete(key); changed = true;
        }
      }
    }

    if (changed) {
      this.saveHarvested();
      this.drawGroundLayer();
    }
  }

  private saveHarvested(): void {
    try {
      localStorage.setItem(`harvest_${this.planetId}`, JSON.stringify([...this.harvestedCells]));
    } catch { /* quota exceeded — ignore */ }
  }

  // ─── Harvest progress ring animation ─────────────────────────────────────

  /** Active harvest progress animation state. */
  private harvestRing: {
    col: number;
    row: number;
    startMs: number;
    durationMs: number;
    graphics: Graphics;
    onComplete: () => void;
  } | null = null;

  /**
   * Start a circular progress ring over (col, row).
   * @param durationMs  Time to fill the ring (default: HARVEST_DURATION_MS)
   * @param onComplete  Called when ring reaches 100%
   */
  public startHarvestRing(
    col: number,
    row: number,
    durationMs: number,
    onComplete: () => void,
  ): void {
    this.cancelHarvestRing();
    const g = new Graphics();
    this.effectLayer.addChild(g);
    this.harvestRing = {
      col, row,
      startMs: 0,  // will accumulate via deltaMs
      durationMs,
      graphics: g,
      onComplete,
    };
  }

  /** Cancel any in-progress harvest ring animation. */
  public cancelHarvestRing(): void {
    if (this.harvestRing) {
      this.harvestRing.graphics.destroy();
      this.harvestRing = null;
    }
  }

  /** Draw the harvest progress ring (called from update()). */
  private drawHarvestRing(deltaMs: number): void {
    const ring = this.harvestRing;
    if (!ring) return;

    ring.startMs += deltaMs;
    const progress = Math.min(1, ring.startMs / ring.durationMs);

    const { x, y } = gridToScreen(ring.col, ring.row);
    // y = (col+row)*TILE_H/2 = visual centre of the tile sprite (diamond centre).
    // Trees:  60% up from sprite bottom  ≈ y - 14  (upper foliage zone)
    // Others: 10% of tile height above centre ≈ y - 8  (just above ore/vent body)
    const spriteH      = FRAME_H * TILE_SCALE;                        // ≈ 133 px
    const spriteBottom = y + TILE_H / 2 + (1 - SPRITE_ANCHOR_Y) * spriteH;  // ≈ y + 66
    const isTree       = isTreeCell(ring.col, ring.row, this.planet.seed, this.gridSize, this.waterLevel);
    const cy           = isTree
      ? spriteBottom - 0.6 * spriteH    // 60% up from bottom of tree sprite
      : y - TILE_H * 0.1;              // 10% above diamond centre
    const radius = TILE_W * 0.28;

    const g = ring.graphics;
    g.clear();

    // Background ring (dim)
    g.circle(x, cy, radius);
    g.stroke({ width: 3, color: 0x334455, alpha: 0.6 });

    // Progress arc (bright green)
    if (progress > 0) {
      const startAngle = -Math.PI / 2;
      const endAngle   = startAngle + Math.PI * 2 * progress;
      g.arc(x, cy, radius, startAngle, endAngle);
      g.stroke({ width: 3, color: 0x44ff88, alpha: 0.9 });
    }

    // Center dot (pulse)
    const dotAlpha = 0.4 + 0.3 * Math.sin(ring.startMs / 200);
    g.circle(x, cy, 3);
    g.fill({ color: 0x44ff88, alpha: dotAlpha });

    if (progress >= 1) {
      const cb = ring.onComplete;
      this.cancelHarvestRing();
      cb();
    }
  }

  // ─── Floating harvest text ──────────────────────────────────────────────

  /**
   * Show floating "+N resource" text at a grid cell.
   * The text drifts upward and fades out over ~1 second.
   */
  public showFloatingText(
    col: number,
    row: number,
    text: string,
    color: number = 0x44ff88,
  ): void {
    const { x, y } = gridToScreen(col, row);
    const cy = y + TILE_H / 2 - 20;  // start above tile

    const g = new Graphics();
    // Use a simple approach: draw text as a small container
    // Since we can't use pixi Text without font setup, use effect layer approach
    const startTime = Date.now();
    const duration  = 1200;

    const animate = (): void => {
      const elapsed = Date.now() - startTime;
      const t       = Math.min(1, elapsed / duration);
      const alpha   = 1 - t;
      const offsetY = -30 * t;  // drift upward 30px

      g.clear();
      if (alpha <= 0) {
        g.destroy();
        return;
      }

      // Draw a small diamond-shaped flash
      g.circle(x, cy + offsetY, 4 * (1 - t));
      g.fill({ color, alpha });

      requestAnimationFrame(animate);
    };

    this.effectLayer.addChild(g);
    animate();
  }

  // ─── Harvest destruction effects ──────────────────────────────────────────

  /**
   * Trigger particle + sprite-animation effects for the given resource cell.
   * Call this BEFORE harvestAt() so the texture is still the original one.
   */
  public triggerDestructionEffect(col: number, row: number, type: SurfaceObjectType): void {
    const { x, y } = gridToScreen(col, row);
    const wx = x;
    const wy = y + TILE_H / 2;   // sprite base (ground-level anchor)

    const tex = this._getCellTexture(col, row);
    const sp  = tex ? this._makeAnimSprite(tex, wx, wy) : null;

    if (type === 'tree')  this.harvestFx?.triggerTree(sp, wx, wy);
    else if (type === 'ore')  this.harvestFx?.triggerOre(wx, wy);
    else if (type === 'vent') this.harvestFx?.triggerVent(sp, wx, wy);
  }

  /** Show "+N XP" golden float text above the harvested cell. */
  public showXPText(col: number, row: number, xp: number): void {
    this.showFloatingText(col, row, `+${xp} XP`, 0xffdd44);
  }

  /** World-space position of a grid cell's visual centre (pre-zoom). */
  public getWorldPos(col: number, row: number): { x: number; y: number } {
    return gridToScreen(col, row);
  }

  // Get the current atlas texture for a cell (before harvest state changes it).
  private _getCellTexture(col: number, row: number): Texture | null {
    const seed    = this.planet.seed;
    const wl      = this.waterLevel;
    const N       = this.gridSize;
    const terrain = classifyCellTerrain(col, row, seed, wl, N);
    const defFrm  = terrainToAtlasIndex(terrain, col, row, seed);
    if (defFrm === null) return null;
    const frm = this.getEffectiveFrame(col, row, defFrm);
    return this.getFrame(frm);
  }

  // Create a temporary animated overlay sprite on effectLayer at the cell position.
  private _makeAnimSprite(tex: Texture, wx: number, wy: number): Sprite {
    const sp = new Sprite(tex);
    sp.anchor.set(0.5, SPRITE_ANCHOR_Y);
    sp.scale.set(TILE_SCALE);
    sp.position.set(wx, wy);
    this.effectLayer.addChild(sp);
    this.animatedSprites.push(sp);
    return sp;
  }

  // ─── Obstacle set for pathfinding ─────────────────────────────────────────

  /** Build/rebuild the set of impassable cells: water + trees + building footprints. */
  private _buildObstacleSet(buildings: PlacedBuilding[]): void {
    const N    = this.gridSize;
    const seed = this.planet?.seed ?? 0;
    const wl   = this.waterLevel;
    const set  = new Set<string>();

    for (let c = 0; c < N; c++) {
      for (let r = 0; r < N; r++) {
        const terrain = classifyCellTerrain(c, r, seed, wl, N);
        if (isWaterTerrain(terrain)) {
          set.add(`${c},${r}`);
          continue;
        }
        // Only full uncut trees block — stumps/regrowth are passable
        if (isTreeCell(c, r, seed, N, wl) && !this.harvestedCells.has(`${c},${r}`)) {
          set.add(`${c},${r}`);
        }
      }
    }

    for (const b of buildings) {
      const def   = BUILDING_DEFS[b.type];
      const sizeW = def?.sizeW ?? 1;
      const sizeH = def?.sizeH ?? 1;
      for (let dc = 0; dc < sizeW; dc++) {
        for (let dr = 0; dr < sizeH; dr++) {
          set.add(`${b.x + dc},${b.y + dr}`);
        }
      }
    }

    this.obstacleSet = set;
  }

  // ─── Rover public API ─────────────────────────────────────────────────────

  /** Send the researcher bot to a target grid cell (A* path around obstacles). */
  public setRoverTarget(col: number, row: number): void {
    this.bot?.setTarget(col, row, this.obstacleSet, this.gridSize);
  }

  /** Returns true if the given cell has been revealed by fog. */
  public isCellRevealed(col: number, row: number): boolean {
    return this.fogLayer?.isRevealed(col, row) ?? true;
  }

  /** Returns true if fog layer is active (planet has been initialized). */
  public hasFog(): boolean {
    return this.fogLayer !== null;
  }

  // ─── Noise overlay ────────────────────────────────────────────────────────

  /**
   * Draw a static low-frequency tint overlay on land tiles to break up visual repetition.
   * Uses 4×4-block cellHash to create gradual light/dark patches across the terrain.
   * Drawn once after ground layer, static for the lifetime of the scene.
   */
  private _buildNoiseOverlay(): void {
    if (!this.noiseOverlayGfx) return;
    const N    = this.gridSize;
    const seed = this.planet.seed;
    const wl   = this.waterLevel;
    const gfx  = this.noiseOverlayGfx;
    gfx.clear();

    const hw = TILE_W / 2;
    const hh = TILE_H / 2;

    for (let d = 0; d < 2 * N - 1; d++) {
      const colMin = Math.max(0, d - N + 1);
      const colMax = Math.min(d, N - 1);
      for (let col = colMin; col <= colMax; col++) {
        const row     = d - col;
        const terrain = classifyCellTerrain(col, row, seed, wl, N);
        if (isWaterTerrain(terrain) || terrain === 'beach') continue;

        // Low-frequency noise: sample at 4×4 block resolution
        const bc  = Math.floor(col / 4);
        const br  = Math.floor(row / 4);
        const n0  = cellHash(bc,     br,     seed + 5551);
        const n1  = cellHash(bc + 1, br,     seed + 5551);
        const n2  = cellHash(bc,     br + 1, seed + 5551);
        const n3  = cellHash(bc + 1, br + 1, seed + 5551);

        // Bilinear interpolate within block
        const tx  = (col % 4) / 4;
        const ty  = (row % 4) / 4;
        const n   = n0 * (1-tx)*(1-ty) + n1 * tx*(1-ty) + n2 * (1-tx)*ty + n3 * tx*ty;

        // Map noise to a subtle tint: darken low zones, lighten highs
        const tint  = (n - 0.5);  // -0.5 to +0.5
        const color = tint > 0 ? 0xffffff : 0x000000;
        const alpha = Math.abs(tint) * 0.18;   // max 0.09 (very subtle)

        const { x, y } = gridToScreen(col, row);
        const cx = x, cy = y + TILE_H / 2;
        gfx.moveTo(cx,      cy - hh)
           .lineTo(cx + hw, cy)
           .lineTo(cx,      cy + hh)
           .lineTo(cx - hw, cy)
           .closePath()
           .fill({ color, alpha });
      }
    }
  }

  // ─── Shoreline foam ───────────────────────────────────────────────────────

  /** Collect water cells that are adjacent to beach/coast — called once after drawGroundLayer.
   *  Foam is drawn on the water side so it never bleeds onto land. */
  private _buildShorelineCells(): void {
    const N    = this.gridSize;
    const seed = this.planet.seed;
    const wl   = this.waterLevel;
    this.shorelineCells = [];
    const added = new Set<string>();

    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (let col = 0; col < N; col++) {
      for (let row = 0; row < N; row++) {
        const terrain = classifyCellTerrain(col, row, seed, wl, N);
        // Only water cells adjacent to a beach/coast land cell get foam
        if (!isWaterTerrain(terrain)) continue;
        const adjShore = dirs.some(([dc, dr]) => {
          const nc = col + dc, nr = row + dr;
          if (nc < 0 || nr < 0 || nc >= N || nr >= N) return false;
          const t = classifyCellTerrain(nc, nr, seed, wl, N);
          return t === 'beach' || t === 'coast';
        });
        if (!adjShore) continue;
        const k = `${col},${row}`;
        if (added.has(k)) continue;
        added.add(k);
        const phase = ((col * 7919 + row * 1301) & 0xffff) / 0xffff * Math.PI * 2;
        this.shorelineCells.push({ col, row, phase });
      }
    }
  }

  /** Animate foam ellipses at shoreline cells. Redraws every frame (cheap: ~200-400 draw calls). */
  private _updateFoam(deltaMs: number): void {
    if (!this.foamGfx || this.shorelineCells.length === 0) return;
    this.foamTimeMs += deltaMs;
    const t = this.foamTimeMs;

    const gfx = this.foamGfx;
    gfx.clear();

    const hw = TILE_W / 2;
    const hh = TILE_H / 2;

    for (const { col, row, phase } of this.shorelineCells) {
      const { x, y } = gridToScreen(col, row);
      const cx = x;
      const cy = y + TILE_H / 2;

      // Two wave passes with different periods for natural-looking foam
      for (let wave = 0; wave < 2; wave++) {
        const period = wave === 0 ? 2400 : 3700;
        const wPhase = phase + wave * Math.PI * 0.7;
        const raw    = Math.sin(t / period * Math.PI * 2 + wPhase);
        // Only draw foam on the "incoming" half of the wave
        if (raw < 0) continue;
        const a  = raw * 0.55;
        // Scale ring outward as wave comes in
        const r  = 0.5 + raw * 0.5;  // 0.5→1.0
        gfx.ellipse(cx, cy, hw * r * 0.9, hh * r * 0.6);
        gfx.stroke({ color: 0xffffff, width: 1.2, alpha: a });
      }
    }
  }

  // ─── Ghost preview (nano-skeleton) ────────────────────────────────────────

  /**
   * Draw a translucent "nano-skeleton" of the building at (col,row).
   * Called on mouse-move when a building type is selected.
   * isValid: true → teal/green, false → red.
   */
  public updateGhost(
    col: number, row: number,
    buildingType: BuildingType,
    isValid: boolean,
  ): void {
    this.ghostLayer.removeChildren();

    const def  = BUILDING_DEFS[buildingType];
    const sW   = def?.sizeW ?? 1;
    const sH   = def?.sizeH ?? 1;
    const N    = this.gridSize;
    if (col < 0 || row < 0 || col + sW > N || row + sH > N) return;

    const color = isValid ? 0x44ff88 : 0xff4444;
    const TW2   = TILE_W / 2;
    const TH2   = TILE_H / 2;

    // ── Footprint diamond ─────────────────────────────────────────────────
    // gridToScreen(col,row).y = (col+row)*TH2 = diamond center.
    // Sprite diamond top = center - TH2 = (col+row-1)*TH2.
    // Shift all y values by -TH2 so the outline aligns with the tile face.
    const topX    = (col - row) * TW2;
    const topY    = (col + row - 1) * TH2;
    const rightX  = (col + sW - row) * TW2;
    const rightY  = (col + sW - 1 + row) * TH2;
    const bottomX = (col + sW - row - sH) * TW2;
    const bottomY = (col + sW + row + sH - 1) * TH2;
    const leftX   = (col - row - sH) * TW2;
    const leftY   = (col + row + sH - 1) * TH2;

    const g = new Graphics();
    g.poly([topX, topY, rightX, rightY, bottomX, bottomY, leftX, leftY]);
    g.fill({ color, alpha: 0.12 });
    g.stroke({ width: 2, color, alpha: 0.75 });
    this.ghostLayer.addChild(g);

    // ── Sprite ghost (if texture available) ──────────────────────────────
    // Use identical positioning to makeIsoBuilding so ghost and placed building
    // overlap exactly: anchor (0.5, 1.0) at the isometric footprint front vertex.
    const tex = this.bldgTextures[buildingType];
    if (tex) {
      const footBotX = (col + sW - row - sH) * TW2;
      const footBotY = (col + sW + row + sH) * TH2;
      const scale    = (sW * TILE_W) / tex.width;

      const sp = new Sprite(tex);
      sp.anchor.set(0.5, 1.0);
      sp.scale.set(scale);
      sp.position.set(footBotX, footBotY);
      sp.alpha = 0.55;
      sp.tint  = color;
      this.ghostLayer.addChild(sp);
    } else {
      // Procedural iso-box ghost
      const { x, y } = gridToScreen(col, row);
      const baseY = y + TH2;
      const hW    = TILE_W * 0.40 * sW;
      const hH    = TILE_H * 0.40 * sH;
      const bH    = TILE_H * 0.85;

      const gb = new Graphics();
      gb.poly([x, baseY - bH - hH, x + hW, baseY - bH, x, baseY - bH + hH, x - hW, baseY - bH]);
      gb.fill({ color, alpha: 0.20 });
      gb.stroke({ width: 1.5, color, alpha: 0.70 });
      gb.poly([x + hW, baseY - bH, x + hW, baseY, x, baseY + hH, x, baseY - bH + hH]);
      gb.fill({ color, alpha: 0.14 });
      gb.stroke({ width: 1, color, alpha: 0.45 });
      gb.poly([x, baseY - bH + hH, x, baseY + hH, x - hW, baseY, x - hW, baseY - bH]);
      gb.fill({ color, alpha: 0.14 });
      gb.stroke({ width: 1, color, alpha: 0.45 });
      this.ghostLayer.addChild(gb);
    }
  }

  public clearGhost(): void {
    this.ghostLayer.removeChildren();
  }

  // ─── Building placement animations ────────────────────────────────────────

  private _startBuildingAnim(b: PlacedBuilding, sprite: Sprite | Graphics): void {
    const def   = BUILDING_DEFS[b.type];
    const sizeW = def?.sizeW ?? 1;
    const key   = `${b.x},${b.y}`;

    // Footprint center in world coords (for shadow / dust origin)
    const footCX  = (b.x - b.y) * (TILE_W / 2);
    const { y: gy } = gridToScreen(b.x, b.y);
    const footBaseY = gy + TILE_H / 2;

    if (b.type === 'colony_hub' && sprite instanceof Sprite) {
      // ── Nano-Print (1 500 ms) ─────────────────────────────────────────────
      const scale     = sprite.scale.x;
      const spriteW   = sprite.texture.width  * scale;
      const spriteH   = sprite.texture.height * scale;
      const spriteBot = sprite.y + spriteH * (1 - SPRITE_ANCHOR_Y);
      const spriteLeft = sprite.x - spriteW / 2;

      sprite.tint  = 0x88aaff;
      sprite.alpha = 0.5;

      const maskGfx  = new Graphics();
      const laserGfx = new Graphics();
      this.buildingLayer.addChild(maskGfx);
      this.buildingLayer.addChild(laserGfx);
      sprite.mask = maskGfx;

      this.buildingAnims.push({
        key, type: 'nano-print', sprite, timeMs: 0, done: false,
        maskGfx, laserGfx,
        spriteLeft, spriteBottom: spriteBot, spriteW, spriteH,
      });

    } else {
      // ── Orbital-Drop (600 ms) ─────────────────────────────────────────────
      const targetY = sprite.y;   // final resting Y (0 for Graphics, spriteBaseY+15 for Sprite)
      sprite.y = targetY - 350;   // start high above

      const shadowGfx = new Graphics();
      const dustGfx   = new Graphics();
      // Shadow below buildings (effectLayer), dust above buildings (roverLayer)
      this.effectLayer.addChild(shadowGfx);
      this.roverLayer.addChild(dustGfx);

      this.buildingAnims.push({
        key, type: 'orbital-drop', sprite, timeMs: 0, done: false,
        targetY,
        shadowX: footCX, shadowBaseY: footBaseY,
        shadowGfx, dustGfx, dustParticles: [], dustSpawned: false,
      });
    }
  }

  private _tickBuildingAnims(deltaMs: number): void {
    if (this.buildingAnims.length === 0 && this.screenShakeMs <= 0) return;

    for (const anim of this.buildingAnims) {
      if (anim.done) continue;
      anim.timeMs += deltaMs;
      if (anim.type === 'nano-print')   this._tickNanoPrint(anim);
      else                              this._tickOrbitalDrop(anim, deltaMs);
    }
    this.buildingAnims = this.buildingAnims.filter(a => !a.done);

    // Screen shake
    if (this.screenShakeMs > 0) {
      this.screenShakeMs -= deltaMs;
      const amp = 3.5 * Math.max(0, this.screenShakeMs / 60);
      this.worldContainer.position.x += (Math.random() - 0.5) * amp;
      this.worldContainer.position.y += (Math.random() - 0.5) * amp;
    }
  }

  private _tickNanoPrint(anim: BuildingAnim): void {
    const PHASE1_END = 100;
    const PHASE2_END = 1400;
    const TOTAL      = 1500;
    const t = anim.timeMs;

    if (t < PHASE1_END) {
      // Projection phase — blue tint, semi-transparent
      if (anim.sprite instanceof Sprite) {
        anim.sprite.tint  = 0x88aaff;
        anim.sprite.alpha = 0.5;
      }
      return;
    }

    // Print phase — restore sprite, grow mask
    if (anim.sprite instanceof Sprite) {
      anim.sprite.tint  = 0xffffff;
      anim.sprite.alpha = 1;
    }

    const p        = Math.min(1, (t - PHASE1_END) / (PHASE2_END - PHASE1_END));
    const revealH  = (anim.spriteH ?? 0) * p;
    const maskTop  = (anim.spriteBottom ?? 0) - revealH;
    const left     = anim.spriteLeft ?? 0;
    const width    = anim.spriteW ?? 0;

    // Mask rectangle growing bottom → top
    anim.maskGfx!.clear();
    if (revealH > 0) {
      anim.maskGfx!.rect(left - 4, maskTop, width + 8, revealH + 2);
      anim.maskGfx!.fill(0xffffff);
    }

    // Laser line at the reveal frontier
    anim.laserGfx!.clear();
    if (t < PHASE2_END) {
      const lAlpha = t < 1350 ? 1 : 1 - (t - 1350) / 150;
      // Core beam
      anim.laserGfx!.moveTo(left - 10, maskTop);
      anim.laserGfx!.lineTo(left + width + 10, maskTop);
      anim.laserGfx!.stroke({ width: 2, color: 0x44ddff, alpha: lAlpha });
      // Soft glow halo
      anim.laserGfx!.moveTo(left - 10, maskTop);
      anim.laserGfx!.lineTo(left + width + 10, maskTop);
      anim.laserGfx!.stroke({ width: 7, color: 0x44ddff, alpha: lAlpha * 0.25 });
    }

    if (t >= TOTAL) {
      if (anim.sprite instanceof Sprite) anim.sprite.mask = null;
      anim.maskGfx!.destroy();
      anim.laserGfx!.destroy();
      anim.done = true;
    }
  }

  private _tickOrbitalDrop(anim: BuildingAnim, deltaMs: number): void {
    const DROP_END = 200;
    const TOTAL    = 600;
    const t        = anim.timeMs;
    const targetY  = anim.targetY ?? 0;

    if (t < DROP_END) {
      // Ease-in cubic: builds slow at top, fast on impact
      const frac = t / DROP_END;
      const ease = frac * frac * frac;
      anim.sprite.y = (targetY - 350) + 350 * ease;

      // Shadow grows with the fall
      const sx = anim.shadowX ?? 0;
      const sy = anim.shadowBaseY ?? 0;
      anim.shadowGfx!.clear();
      anim.shadowGfx!.ellipse(sx, sy, TILE_W * 0.5 * ease, TILE_H * 0.2 * ease);
      anim.shadowGfx!.fill({ color: 0x000000, alpha: 0.28 * ease });

    } else {
      anim.sprite.y = targetY;
      anim.shadowGfx!.clear();

      // Spawn dust on impact (once)
      if (!anim.dustSpawned) {
        anim.dustSpawned = true;
        this.screenShakeMs = 60;
        const sx = anim.shadowX ?? 0;
        const sy = anim.shadowBaseY ?? 0;
        for (let i = 0; i < 22; i++) {
          const angle = (i / 22) * Math.PI * 2;
          const speed = 0.9 + Math.random() * 1.4;
          anim.dustParticles!.push({
            x: sx, y: sy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed * 0.35 - 0.4,
            alpha: 0.5 + Math.random() * 0.25,
            r: 3 + Math.random() * 5,
          });
        }
      }

      // Tick dust
      anim.dustGfx!.clear();
      for (const p of anim.dustParticles!) {
        p.x      += p.vx * (deltaMs / 16);
        p.y      += p.vy * (deltaMs / 16);
        p.vy     += 0.025 * (deltaMs / 16);  // gravity
        p.alpha  -= 0.020 * (deltaMs / 16);
        p.r      += 0.05  * (deltaMs / 16);
        if (p.alpha <= 0) continue;
        anim.dustGfx!.circle(p.x, p.y, p.r);
        anim.dustGfx!.fill({ color: 0xaa8855, alpha: p.alpha });
      }
    }

    if (t >= TOTAL) {
      anim.shadowGfx!.destroy();
      anim.dustGfx!.destroy();
      anim.done = true;
    }
  }

  // ─── Concrete pads under buildings (disabled) ────────────────────────────

  /** No concrete pads or road tiles — buildings sit directly on terrain. */
  private _rebuildConcretePads(_buildings: PlacedBuilding[]): void {
    this.concreteLayer.removeChildren();
  }

  // ─── Legacy concrete-pad code kept below for reference (unreachable) ─────

  private _legacyConcretePads(buildings: PlacedBuilding[]): void {
    this.concreteLayer.removeChildren();
    const seed = this.planet?.seed ?? 0;
    const TW2  = TILE_W / 2;
    const TH2  = TILE_H / 2;

    for (const b of buildings) {
      const def = BUILDING_DEFS[b.type];
      const sW  = def?.sizeW ?? 1;
      const sH  = def?.sizeH ?? 1;

      // Outer footprint diamond — wider than exact tile footprint, top/bottom flush
      const PADX = 12;  // screen-px outset left/right
      const topX    = (b.x - b.y) * TW2;
      const topY    = (b.x + b.y) * TH2;
      const rightX  = (b.x + sW - b.y) * TW2       + PADX;
      const rightY  = (b.x + sW + b.y) * TH2;
      const bottomX = (b.x + sW - b.y - sH) * TW2;
      const bottomY = (b.x + sW + b.y + sH) * TH2;
      const leftX   = (b.x - b.y - sH) * TW2       - PADX;
      const leftY   = (b.x + b.y + sH) * TH2;

      // Diamond center (for speckle placement and highlight)
      const cx = (topX + bottomX) / 2;
      const cy = (topY + bottomY) / 2;
      // Half-extents
      const hw = rightX - cx;
      const hh = bottomY - cy;

      const g = new Graphics();
      const rng = new SeededRNG(cellHash(b.x, b.y, seed) ^ 0x7e3a1f);

      // ── Helper: clamp point inside diamond ──────────────────────────────
      const inDiamond = (px: number, py: number) =>
        Math.abs(px - cx) / hw + Math.abs(py - cy) / hh <= 0.92;

      // ── Base fill: dark concrete ──────────────────────────────────────────
      g.poly([topX, topY, rightX, rightY, bottomX, bottomY, leftX, leftY]);
      g.fill({ color: 0x424242 });

      // ── Isometric face shading: left half darker (shadow), right half lighter (lit)
      g.poly([topX, topY, leftX, leftY, bottomX, bottomY, cx, cy]);
      g.fill({ color: 0x101010, alpha: 0.38 });
      g.poly([topX, topY, rightX, rightY, bottomX, bottomY, cx, cy]);
      g.fill({ color: 0x909090, alpha: 0.28 });

      // ── Colour-variation patches (large, low-alpha) ──────────────────────
      for (let i = 0; i < 6 + sW * sH * 2; i++) {
        let u: number, v: number;
        do { u = (rng.next() - 0.5) * 1.8; v = (rng.next() - 0.5) * 1.8; }
        while (Math.abs(u) + Math.abs(v) > 0.88);
        const px = cx + u * hw;
        const py = cy + v * hh;
        const r  = hw * (0.12 + rng.next() * 0.22);
        const bright = rng.next();
        const col = bright > 0.6 ? 0x686868 : bright > 0.3 ? 0x303030 : 0x505050;
        g.ellipse(px, py, r, r * 0.55);
        g.fill({ color: col, alpha: 0.22 + rng.next() * 0.18 });
      }

      // ── Fine aggregate grain (tiny dots, high density) ───────────────────
      const grainCount = 40 + sW * sH * 22;
      for (let i = 0; i < grainCount; i++) {
        let px: number, py: number;
        do { px = cx + (rng.next() - 0.5) * hw * 2.1; py = cy + (rng.next() - 0.5) * hh * 2.1; }
        while (!inDiamond(px, py));
        const r   = 0.5 + rng.next() * 1.6;
        const lum = rng.next();
        const col = lum > 0.72 ? 0x888888 : lum > 0.45 ? 0x5e5e5e : lum > 0.22 ? 0x383838 : 0x1e1e1e;
        g.circle(px, py, r);
        g.fill({ color: col, alpha: 0.55 + rng.next() * 0.3 });
      }

      // ── Pores: small dark ellipses simulating concrete porosity ──────────
      const poreCount = 30 + sW * sH * 18;
      for (let i = 0; i < poreCount; i++) {
        let px: number, py: number;
        do { px = cx + (rng.next() - 0.5) * hw * 2.0; py = cy + (rng.next() - 0.5) * hh * 2.0; }
        while (!inDiamond(px, py));
        const r = 0.6 + rng.next() * 1.8;
        g.ellipse(px, py, r, r * (0.5 + rng.next() * 0.4));
        g.fill({ color: 0x1a1a1a, alpha: 0.5 + rng.next() * 0.35 });
      }

      // ── Hairline cracks ───────────────────────────────────────────────────
      const crackCount = 2 + sW * sH;
      for (let i = 0; i < crackCount; i++) {
        let sx: number, sy: number;
        do { sx = cx + (rng.next() - 0.5) * hw * 1.4; sy = cy + (rng.next() - 0.5) * hh * 1.4; }
        while (!inDiamond(sx, sy));
        const angle = rng.next() * Math.PI;
        const len   = hw * (0.15 + rng.next() * 0.25);
        const segs  = 4 + Math.floor(rng.next() * 4);
        let cx2 = sx, cy2 = sy;
        const da = Math.sin(angle), db = Math.cos(angle);
        for (let s = 0; s < segs; s++) {
          const ex = cx2 + (da + (rng.next() - 0.5) * 0.4) * (len / segs);
          const ey = cy2 + (db + (rng.next() - 0.5) * 0.4) * (len / segs);
          if (!inDiamond(ex, ey)) break;
          g.moveTo(cx2, cy2);
          g.lineTo(ex, ey);
          g.stroke({ color: 0x202020, width: 0.7, alpha: 0.45 + rng.next() * 0.25 });
          cx2 = ex; cy2 = ey;
        }
      }

      // ── Edge bevel: thin dark stroke around the diamond perimeter ─────────
      g.poly([topX, topY, rightX, rightY, bottomX, bottomY, leftX, leftY]);
      g.stroke({ color: 0x252525, width: 1.5, alpha: 0.6 });

      g.y = -Math.round(TILE_H * 0.07);  // raise pad slightly above terrain level
      this.concreteLayer.addChild(g);
    }
  }

  // ─── Clouds (TilingSprite) ────────────────────────────────────────────────

  private async _initCloudSprites(): Promise<void> {
    let cloudTex: Texture;
    try {
      cloudTex = await Assets.load<Texture>('/tiles/clouds.jpg');
    } catch {
      return; // No texture — skip clouds
    }

    const N = this.gridSize;
    // Full bounding rectangle of the NxN isometric grid:
    //   x range: -N*TILE_W/2 .. N*TILE_W/2   (diamond left/right vertices)
    //   y range: 0 .. N*TILE_H               (diamond top/bottom vertices)
    // Add 2× padding so scrolling never exposes an edge.
    const PAD  = 2;
    const mapW = (N + PAD * 2) * TILE_W;
    const mapH = (N + PAD * 2) * TILE_H;
    const posX = -(N / 2 + PAD) * TILE_W;
    const posY = -PAD * TILE_H;

    // ── Cloud shadow (MULTIPLY, inverted texture, below featureLayer) ──────
    const shadowSprite = new TilingSprite({ texture: cloudTex, width: mapW, height: mapH });
    shadowSprite.tileScale.set(2);
    shadowSprite.alpha = 0.18;
    shadowSprite.blendMode = 'multiply';
    const invertFilter = new ColorMatrixFilter();
    invertFilter.negative(false);
    shadowSprite.filters = [invertFilter];
    shadowSprite.position.set(posX, posY);
    this.cloudShadowSprite = shadowSprite;
    // Index 4: after groundLayer[0], concreteLayer[1], noiseOverlay[2], foamGfx[3]
    this.worldContainer.addChildAt(shadowSprite, 4);

    // ── Cloud body (SCREEN, above roverLayer) ─────────────────────────────
    const bodySprite = new TilingSprite({ texture: cloudTex, width: mapW, height: mapH });
    bodySprite.tileScale.set(2);
    bodySprite.alpha = 0.10;
    bodySprite.blendMode = 'screen';
    bodySprite.position.set(posX, posY);
    this.cloudBodySprite = bodySprite;
    this.worldContainer.addChild(bodySprite);
  }

  private _updateCloudSprites(deltaMs: number): void {
    if (this.cloudShadowSprite) {
      // Shadow drifts slower (parallax)
      this.cloudShadowSprite.tilePosition.x -= 0.15 * deltaMs / 16;
      this.cloudShadowSprite.tilePosition.y += 0.05 * deltaMs / 16;
    }
    if (this.cloudBodySprite) {
      // Body drifts faster
      this.cloudBodySprite.tilePosition.x -= 0.30 * deltaMs / 16;
      this.cloudBodySprite.tilePosition.y += 0.10 * deltaMs / 16;
    }
  }

  // ─── Destroy ─────────────────────────────────────────────────────────────

  destroy(): void {
    this.harvestFx?.destroy();
    this.harvestFx = null;
    this.animatedSprites = [];
    this.cancelHarvestRing();
    this.hubEffects = null;
    this.rover?.destroy();
    this.rover = null;
    this.bot?.destroy();
    this.bot = null;
    this.fogLayer?.destroy();
    this.fogLayer = null;
    this.cloudShadowSprite?.destroy();
    this.cloudBodySprite?.destroy();
    this.cloudShadowSprite = null;
    this.cloudBodySprite = null;
    for (const a of this.buildingAnims) {
      a.maskGfx?.destroy();
      a.laserGfx?.destroy();
      a.shadowGfx?.destroy();
      a.dustGfx?.destroy();
    }
    this.buildingAnims = [];
    this.foamGfx?.destroy();
    this.foamGfx = null;
    this.shorelineCells = [];
    this.noiseOverlayGfx?.destroy();
    this.noiseOverlayGfx = null;
    this.buildingShadowGfx?.destroy();
    this.buildingShadowGfx = null;
    this.worldContainer.destroy({ children: true });
  }
}

// ─── Mountain box colors (programmatic elevated terrain) ──────────────────────

interface MtnColors { top: number; right: number; left: number; height: number }

/**
 * Three-face isometric box colors for elevated terrain.
 *   top   — brightest (lit from above)
 *   right — medium    (facing viewer)
 *   left  — darkest   (in shadow)
 *   height — raised box height in px (< TILE_H so Painter's Algo stays valid)
 */
const MOUNTAIN_COLORS: Record<string, MtnColors> = {
  hills: {
    top:    0x5a6a3a,  // earthy olive-green
    right:  0x3a4a22,
    left:   0x2a3a18,
    height: 18,
  },
  mountains: {
    top:    0x6a6a5a,  // grey-brown rocky
    right:  0x444438,
    left:   0x2e2e28,
    height: 38,
  },
  peaks: {
    top:    0xc8d4dc,  // snow-white
    right:  0x7a8c9a,  // grey rock face
    left:   0x4a5a68,  // deep shadow
    height: 56,
  },
};

// ─── Water tile colors (programmatic) ────────────────────────────────────────

/**
 * Flat isometric diamond colors for water terrain.
 * Deeper water → darker navy, matching the game-palette dark-space aesthetic.
 * beach is included so shallow water blends naturally at the shoreline.
 */
const WATER_COLORS: Record<string, number> = {
  deep_ocean: 0x071318,  // darkest navy
  ocean:      0x0c1d2c,  // standard ocean
  coast:      0x112535,  // slightly lighter
  beach:      0x172e40,  // lightest — transitional
};

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
