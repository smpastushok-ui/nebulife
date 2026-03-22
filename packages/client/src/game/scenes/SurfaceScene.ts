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
  isMountainFootprint,
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
  private hubLayer:      Container;   // hub orbit rings — above buildingLayer
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
  /** Per-frame animation state for colony_hub effects (rendered on hubLayer). */
  private hubEffects: {
    /** 5 iso-diamond outlines, one per ring level (pulsing, low alpha). */
    diamonds: Graphics[];
    /** 5 rotating orbit arcs — one per ring level with resource colours. */
    orbits: Array<{
      g:     Graphics;
      angle: number;   // current head angle (radians)
      speed: number;   // rad/ms (positive = CW, negative = CCW)
      color: number;   // hex colour (blue / yellow / green)
      cx:    number;   // ring screen-X centre
      cy:    number;   // ring screen-Y centre
      rW:    number;   // ellipse horizontal radius (px)
      rH:    number;   // ellipse vertical radius  (px)
    }>;
    /** 4 tiny sparks orbiting the top ring. */
    sparks: Array<{ g: Graphics; angle: number; speed: number; dist: number; phase: number }>;
    timeMs:    number;
    hubFootX:  number;   // footprint bottom-vertex X
    hubFootY:  number;   // footprint bottom-vertex Y
    sizeW:     number;
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
  private posDroneTex:     Texture | null = null;

  // ─── Mountain PNG sprite ──────────────────────────────────────────────────
  private mountTex: Texture | null = null;

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

  // ─── Per-building idle animations ─────────────────────────────────────────
  private bldgEffects = new Map<string, {
    gs:      Graphics[];
    sprites: Sprite[];
    timeMs:  number;
    extra:   Record<string, number>;
    cx:      number;
    cy:      number;
    sW:      number;
    type:    string;
  }>();

  // ─── Ghost preview layer ─────────────────────────────────────────────────
  private ghostLayer: Container;

  constructor() {
    this.worldContainer = new Container();

    this.groundLayer   = new Container();
    this.featureLayer  = new Container();
    this.corridorLayer = new Container();
    this.overlayLayer  = new Container();
    this.effectLayer   = new Container();
    this.hubLayer      = new Container();
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
      this.hubLayer,      // hub orbit rings — above building sprite, below rover
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

    // Load pos drone texture (landing pad launch animation)
    try {
      this.posDroneTex = await Assets.load<Texture>('/tiles/machines/pos_drone.png');
    } catch { /* no pos_drone texture — cube fallback used */ }

    // Load mountain PNG sprite — variant chosen by planet surface type
    const mountUrl =
      atlasType === 'ice'      ? '/tiles/habitable/mount_ice.png'      :
      atlasType === 'volcanic' ? '/tiles/habitable/mount_volcanic.png' :
                                 '/tiles/habitable/mount_rugged.png';   // temperate / ocean / barren
    try {
      this.mountTex = await Assets.load<Texture>(mountUrl);
    } catch { /* no mountain texture — voxel fallback will be used */ }

    this.drawGroundLayer();
    this._buildNoiseOverlay();
    this._buildShorelineCells();
    this.placeMountOverlay();   // PNG-sprite stacking (or procedural voxel fallback)

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
        const defaultFrame = terrainToAtlasIndex(terrain, col, row, seed, N);
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

  // ─── Mountain overlay ────────────────────────────────────────────────────────

  /**
   * Render mountain on featureLayer.
   * Prefers PNG-sprite stacking when mountTex is loaded; falls back to procedural voxels.
   */
  private placeMountOverlay(): void {
    this.featureLayer.removeChildren();

    const pos = findMountainCell(this.planet.seed, this.gridSize);
    if (!pos) return;

    if (this.mountTex) {
      this._buildMountSprites(pos.col, pos.row);
    } else {
      this._buildMountVoxels(pos.col, pos.row);
    }
  }

  /**
   * PNG-sprite mountain: 5 stacked layers of mount_rugged.png at decreasing scale,
   * with deterministic X jitter and Y squash for isometric perspective.
   * Every other layer is flipped horizontally for silhouette variety.
   * A two-ring Graphics snow cap finishes the summit.
   */
  private _buildMountSprites(col: number, row: number): void {
    const tex  = this.mountTex!;
    const seed = this.planet.seed;
    const TW2  = TILE_W / 2;   // 64
    const TH2  = TILE_H / 2;   // 40

    // Deterministic jitter — abs(sin(…)) in [0, 1)
    const rnd = (n: number): number => Math.abs(Math.sin(seed * 0.0137 + n * 97.317)) % 1;

    // Horizontal centre of the 7×7 isometric footprint.
    // Footprint origin = (col, row); centre = (col+3.5, row+3.5).
    // gridToScreen(col+3.5, row+3.5) → x = (col-row)*TW2, y = (col+row+7)*TH2
    const cx = (col - row) * TW2;
    const cy = (col + row + 7) * TH2;

    // Scale the base sprite so the mountain fills ~85 % of the 7-cell diamond width.
    // Diamond width = 7 * TILE_W = 896 px.
    const BASE_S = (7 * TW2 * 2 * 0.85) / tex.width;   // ≈ 1.49
    const SY     = BASE_S * 0.78;                        // Y squash for iso perspective

    // 5 layers — each progressively smaller and higher up the mountain.
    // Column: [scaleX (negative = flip), scaleY, dx, dy, alpha]
    const layers: [number, number, number, number, number][] = [
      [ BASE_S,           SY,           (rnd(0) - 0.5) * 10,  0,              1.00 ],  // base
      [-BASE_S * 0.72,    SY * 0.72,    (rnd(1) - 0.5) * 28, -BASE_S * 78,   0.93 ],  // mid (flipped)
      [ BASE_S * 0.50,    SY * 0.50,    (rnd(2) - 0.5) * 38, -BASE_S * 143,  0.87 ],  // upper-mid
      [-BASE_S * 0.32,    SY * 0.32,    (rnd(3) - 0.5) * 42, -BASE_S * 194,  0.82 ],  // near-peak (flipped)
      [ BASE_S * 0.20,    SY * 0.20,    (rnd(4) - 0.5) * 28, -BASE_S * 232,  0.78 ],  // summit tip
    ];

    for (const [sx, sy, dx, dy, alpha] of layers) {
      const sp = new Sprite(tex);
      sp.anchor.set(0.5, 0.87);   // anchor at mountain base (≈87 % down from sprite top)
      sp.scale.set(sx, sy);
      sp.x = cx + dx;
      sp.y = cy + dy;
      sp.alpha = alpha;
      this.featureLayer.addChild(sp);
    }
  }

  /**
   * Fallback: procedural voxel mountain used when mount_rugged.png is unavailable.
   * 4 pyramid layers (7×7 → 5×5 → 3×3 → 1×1); painter's-sorted back→front.
   */
  private _buildMountVoxels(col: number, row: number): void {
    const seed = this.planet.seed;
    const TW2  = TILE_W / 2;
    const TH2  = TILE_H / 2;

    const gts = (c: number, r: number) => ({ x: (c - r) * TW2, y: (c + r) * TH2 });
    const noise = (gc: number, gr: number) =>
      Math.abs(Math.sin(gc * 73.1 + gr * 127.3 + seed * 0.0137));

    interface LayerDef {
      sW: number; sH: number; c0: number; r0: number;
      hBase: number; hMin: number; hVar: number;
      top: number; sw: number; se: number;
    }

    const LAYERS: LayerDef[] = [
      { sW:7, sH:7, c0:0, r0:0, hBase:  0, hMin:55, hVar:25, top:0x6b5040, sw:0x9a7860, se:0x362418 },
      { sW:5, sH:5, c0:1, r0:1, hBase: 75, hMin:60, hVar:22, top:0x8a7560, sw:0xbaa080, se:0x544030 },
      { sW:3, sH:3, c0:2, r0:2, hBase:148, hMin:60, hVar:18, top:0xa09488, sw:0xc8bcb0, se:0x686460 },
      { sW:1, sH:1, c0:3, r0:3, hBase:218, hMin:62, hVar:14, top:0xcec8c4, sw:0xeeeae6, se:0x9a9490 },
    ];

    interface Block { zKey: number; layerIdx: number; g: Graphics; }
    const blocks: Block[] = [];

    for (let li = 0; li < LAYERS.length; li++) {
      const layer = LAYERS[li];
      for (let dc = 0; dc < layer.sW; dc++) {
        for (let dr = 0; dr < layer.sH; dr++) {
          const gc = col + layer.c0 + dc;
          const gr = row + layer.r0 + dr;

          const cellH = layer.hMin + noise(gc, gr) * layer.hVar;
          const hBot  = layer.hBase;
          const hTop  = layer.hBase + cellH;

          const T  = gts(gc,     gr    );
          const R  = gts(gc + 1, gr    );
          const B  = gts(gc + 1, gr + 1);
          const Lv = gts(gc,     gr + 1);

          const g = new Graphics();
          g.poly([R.x,  R.y  - hTop,  B.x, B.y - hTop,  B.x, B.y - hBot,  R.x,  R.y  - hBot]);
          g.fill({ color: layer.se });
          g.poly([Lv.x, Lv.y - hTop,  B.x, B.y - hTop,  B.x, B.y - hBot,  Lv.x, Lv.y - hBot]);
          g.fill({ color: layer.sw });
          g.poly([T.x, T.y - hTop,  R.x, R.y - hTop,  B.x, B.y - hTop,  Lv.x, Lv.y - hTop]);
          g.fill({ color: layer.top });

          blocks.push({ zKey: gc + gr, layerIdx: li, g });
        }
      }
    }

    blocks.sort((a, b) => a.zKey !== b.zKey ? a.zKey - b.zKey : a.layerIdx - b.layerIdx);
    this.featureLayer.sortableChildren = false;
    for (const blk of blocks) this.featureLayer.addChild(blk.g);
  }

  // ─── Buildings (dynamic) ──────────────────────────────────────────────────

  public rebuildBuildings(buildings: PlacedBuilding[]): void {
    // Snapshot animation state before clearing so existing buildings continue mid-cycle
    const savedAnim = new Map<string, { timeMs: number; extra: Record<string, number> }>();
    for (const [key, eff] of this.bldgEffects.entries()) {
      savedAnim.set(key, { timeMs: eff.timeMs, extra: { ...eff.extra } });
    }

    this.buildingLayer.removeChildren();
    this.effectLayer.removeChildren();
    this.hubLayer.removeChildren();
    this.hubEffects = null;
    // Destroy all per-building idle effect graphics + sprites before clearing
    for (const eff of this.bldgEffects.values()) {
      for (const g  of eff.gs)      g.destroy();
      for (const sp of eff.sprites) sp.destroy();
    }
    this.bldgEffects.clear();
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
      // Create idle animation for supported building types
      if (b.type === 'resource_storage' || b.type === 'landing_pad' || b.type === 'spaceport') {
        this._createBldgEffect(b);
        // Restore previous animation state so existing buildings don't restart from zero
        const key    = `${b.x},${b.y}`;
        const saved  = savedAnim.get(key);
        const newEff = this.bldgEffects.get(key);
        if (saved && newEff) {
          newEff.timeMs = saved.timeMs;
          newEff.extra  = { ...saved.extra };
        }
      }
    }
  }

  /** Create animated effect Graphics for a colony_hub building (all on hubLayer). */
  private createHubEffects(b: PlacedBuilding): void {
    const def = BUILDING_DEFS[b.type];
    const sW  = def?.sizeW ?? 4;
    const sH  = def?.sizeH ?? 4;
    const TW2 = TILE_W / 2;  // 64
    const TH2 = TILE_H / 2;  // 40

    // Footprint bottom vertex = front / lowest visible point of building sprite.
    const footBotX = (b.x + sW - b.y - sH) * TW2;
    const footBotY = (b.x + sW + b.y + sH) * TH2;

    // Single shared center for all rings — raised to upper portion of the building sprite.
    const cx = footBotX;
    const cy = footBotY - sW * TH2 * 2.5;   // ~upper third of the building

    // 5 rings sharing the same center, alternating CW/CCW, increasing radii.
    // [rW multiplier (×TW2), hex colour, speed rad/ms (+CW, -CCW)]
    const RINGS: [number, number, number][] = [
      [1.0, 0xffcc44,  0.00105],   // 0: yellow, innermost,   CW  (fastest)
      [1.7, 0x4499ff, -0.00082],   // 1: blue,                CCW
      [2.5, 0x44ff88,  0.00063],   // 2: green,  mid,         CW
      [3.3, 0x4499ff, -0.00047],   // 3: blue,                CCW
      [4.1, 0xffcc44,  0.00034],   // 4: yellow, outermost,   CW  (slowest)
    ];

    const diamonds: Graphics[] = [];
    const orbits: Array<{ g: Graphics; angle: number; speed: number; color: number; cx: number; cy: number; rW: number; rH: number }> = [];

    for (let i = 0; i < RINGS.length; i++) {
      const [rMult, color, speed] = RINGS[i];
      const rW = rMult * TW2;
      const rH = rW * (TILE_H / TILE_W);  // iso-correct vertical compression

      const dg = new Graphics();
      this.hubLayer.addChild(dg);
      diamonds.push(dg);

      const og = new Graphics();
      og.blendMode = 'add';
      this.hubLayer.addChild(og);
      orbits.push({
        g: og,
        angle: (i / RINGS.length) * Math.PI * 2,
        speed,
        color,
        cx,
        cy,
        rW,
        rH,
      });
    }

    // 4 sparks orbiting around the outermost ring — tiny 2×2 dots
    const sparks = Array.from({ length: 4 }, (_, i) => {
      const g = new Graphics();
      this.hubLayer.addChild(g);
      return {
        g,
        angle: (i / 4) * Math.PI * 2,
        speed: 0.0008 + 0.0003 * i,
        dist:  RINGS[4][0] * TW2 * 0.65,   // 65% of outermost ring rW
        phase: i * 1.5,
      };
    });

    this.hubEffects = {
      diamonds, orbits, sparks,
      timeMs: 0,
      hubFootX: footBotX,
      hubFootY: footBotY,
      sizeW:    sW,
    };
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

    // Per-building idle animations (resource_storage, landing_pad, spaceport)
    this._tickBldgEffects(deltaMs);

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
    const t   = eff.timeMs;
    const TH2 = TILE_H / 2;

    // ── Pulsing iso-diamond outlines (very low alpha, resource colour) ───
    for (let i = 0; i < eff.diamonds.length; i++) {
      const orb   = eff.orbits[i];
      const g     = eff.diamonds[i];
      const phase = (i / eff.diamonds.length) * Math.PI * 2;
      const a     = 0.10 + 0.07 * Math.sin((t / 2500) * Math.PI * 2 + phase);
      g.clear();
      g.poly([orb.cx, orb.cy - orb.rH,
              orb.cx + orb.rW, orb.cy,
              orb.cx, orb.cy + orb.rH,
              orb.cx - orb.rW, orb.cy]);
      g.stroke({ width: 1.0, color: orb.color, alpha: a });
    }

    // ── Rotating orbit arcs (blendMode='add', bright head dot) ───────────
    const ARC_SPAN = 0.55;   // radians (~31°) — arc length
    const N_PTS    = 14;     // polyline segments per arc
    for (const orb of eff.orbits) {
      orb.angle += orb.speed * deltaMs;
      const g     = orb.g;
      const a0    = orb.angle;
      g.clear();
      // Tail → head as open polyline
      g.moveTo(orb.cx + orb.rW * Math.cos(a0), orb.cy + orb.rH * Math.sin(a0));
      for (let j = 1; j <= N_PTS; j++) {
        const a = a0 + (j / N_PTS) * ARC_SPAN;
        g.lineTo(orb.cx + orb.rW * Math.cos(a), orb.cy + orb.rH * Math.sin(a));
      }
      g.stroke({ width: 2.5, color: orb.color, alpha: 0.88 });
      // Bright dot at arc head
      const headA = a0 + ARC_SPAN;
      g.circle(orb.cx + orb.rW * Math.cos(headA), orb.cy + orb.rH * Math.sin(headA), 3.0);
      g.fill({ color: 0xffffff, alpha: 0.95 });
    }

    // ── Sparks: 4 tiny 2×2 pixels orbiting top ring ───────────────────────
    {
      const topOrb = eff.orbits[4];
      for (const sp of eff.sparks) {
        sp.angle += sp.speed * deltaMs;
        const sx = topOrb.cx + sp.dist * Math.cos(sp.angle);
        const sy = topOrb.cy + sp.dist * Math.sin(sp.angle) * (TILE_H / TILE_W);
        const a  = 0.5 + 0.5 * Math.sin(t / 1200 + sp.phase);
        sp.g.clear();
        sp.g.rect(sx - 1, sy - 1, 2, 2);
        sp.g.fill({ color: 0x88ccff, alpha: a });
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

    // alpha_harvester has no physical structure — the drone IS the visual.
    if (b.type === 'alpha_harvester') {
      const g = new Graphics();
      g.zIndex = (b.x + sizeW + b.y + sizeH) * (TILE_H / 2);
      return g;
    }

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
        // All cells in footprint must be buildable terrain, no resources, and revealed
        let ok = true;
        for (let dc = 0; dc < sW && ok; dc++) {
          for (let dr = 0; dr < sH && ok; dr++) {
            const c = col + dc; const r = row + dr;
            if (!isCellBuildable(c, r, seed, wl, selectedType)) { ok = false; break; }
            if (this._isCellResourceBlocked(c, r))              { ok = false; break; }
            if (this.fogLayer && !this.fogLayer.isRevealed(c, r)) { ok = false; break; }
          }
        }
        // 1-cell buffer: border of footprint must not touch water / mountain / resource
        outerBuf: for (let dc = -1; dc <= sW && ok; dc++) {
          for (let dr = -1; dr <= sH && ok; dr++) {
            if (dc >= 0 && dc < sW && dr >= 0 && dr < sH) continue;
            const bc = col + dc; const br = row + dr;
            if (bc < 0 || bc >= N || br < 0 || br >= N) continue;
            if (isMountainFootprint(bc, br, seed, N)) { ok = false; break outerBuf; }
            const bt = classifyCellTerrain(bc, br, seed, wl, N);
            if (isWaterTerrain(bt))                   { ok = false; break outerBuf; }
            if (this._isCellResourceBlocked(bc, br))  { ok = false; break outerBuf; }
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

        // Footprint must not cover any active transport unit
        let hasTransport = false;
        outer: for (let dc = 0; dc < sW; dc++) {
          for (let dr = 0; dr < sH; dr++) {
            if (this._isOccupiedByTransport(col + dc, row + dr)) { hasTransport = true; break outer; }
          }
        }
        if (hasTransport) continue;



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

  /**
   * True if the cell currently displays any harvestable resource (live or partially depleted).
   * Uses the effective atlas frame so it catches all states: full tree/ore/vent, stump,
   * tree-small, ore-small, vent-small — regardless of harvestedCells state machine.
   * Allows ore-depleted (24) and vent-dry (26) — resources fully consumed.
   */
  private _isCellResourceBlocked(col: number, row: number): boolean {
    const seed    = this.planet.seed;
    const wl      = this.waterLevel;
    const N       = this.gridSize;
    const terrain = classifyCellTerrain(col, row, seed, wl, N);
    const defFrm  = terrainToAtlasIndex(terrain, col, row, seed, N);
    if (defFrm === null) return false;
    const frm = this.getEffectiveFrame(col, row, defFrm);
    // frames 13-23: trees + vents (full), 25: ore-small, 27: vent-small, 16-17: stump/tree-small
    return (frm >= 13 && frm <= 23) || frm === 25 || frm === 27;
  }

  /** Returns true if any active transport unit (bot or harvester drone) occupies grid cell (c, r). */
  private _isOccupiedByTransport(c: number, r: number): boolean {
    if (this.bot && Math.round(this.bot.col) === c && Math.round(this.bot.row) === r) return true;
    return this.harvesterDrones.some(d => Math.round(d.col) === c && Math.round(d.row) === r);
  }

  /** Check if a building footprint fits at (col,row): terrain + no overlap + adjacency + no transport. */
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

    // All footprint cells must have correct terrain, no resources, no transport, and be revealed
    for (let dc = 0; dc < sW; dc++) {
      for (let dr = 0; dr < sH; dr++) {
        const c = col + dc; const r = row + dr;
        if (isMountainFootprint(c, r, seed, N)) return false;
        if (!isCellBuildable(c, r, seed, wl, buildingType)) return false;
        if (this._isCellResourceBlocked(c, r)) return false;
        if (this.fogLayer && !this.fogLayer.isRevealed(c, r)) return false;
        if (this._isOccupiedByTransport(c, r)) return false;
      }
    }

    // 1-cell buffer: every cell bordering the footprint must not be water / mountain / resource
    for (let dc = -1; dc <= sW; dc++) {
      for (let dr = -1; dr <= sH; dr++) {
        if (dc >= 0 && dc < sW && dr >= 0 && dr < sH) continue; // skip interior
        const bc = col + dc; const br = row + dr;
        if (bc < 0 || bc >= N || br < 0 || br >= N) continue;
        if (isMountainFootprint(bc, br, seed, N)) return false;
        const bt = classifyCellTerrain(bc, br, seed, wl, N);
        if (isWaterTerrain(bt)) return false;
        if (this._isCellResourceBlocked(bc, br)) return false;
      }
    }

    // Footprint must not overlap or touch any existing building (enforces 1-cell gap).
    // Uses inclusive bounds: col <= bx+bSW catches both overlap and 0-cell touching.
    for (const b of buildings) {
      const bSW = BUILDING_DEFS[b.type]?.sizeW ?? 1;
      const bSH = BUILDING_DEFS[b.type]?.sizeH ?? 1;
      if (col <= b.x + bSW && col + sW >= b.x && row <= b.y + bSH && row + sH >= b.y) return false;
    }

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
      classifyCellTerrain(col, row, seed, wl, N), col, row, seed, N,
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
      classifyCellTerrain(col, row, seed, wl, N), col, row, seed, N,
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
      classifyCellTerrain(col, row, seed, wl, N), col, row, seed, N,
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

    // ── 1. Laser impulse (first 350ms): bright vertical beam from above ──
    if (ring.startMs < 350) {
      const la = (1 - ring.startMs / 350) * 0.85;
      g.moveTo(x, cy - 250); g.lineTo(x, cy);
      g.stroke({ width: 6, color: 0x44aaff, alpha: la * 0.3 });
      g.moveTo(x, cy - 250); g.lineTo(x, cy);
      g.stroke({ width: 2, color: 0x88ffff, alpha: la });
    }

    // ── 2. Progress arc (thin, cyan) ─────────────────────────────────────
    if (progress > 0) {
      g.arc(x, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      g.stroke({ width: 1.5, color: 0x44ffff, alpha: 0.55 });
    }

    // ── 3. Cyberpunk holographic sight — 4 L-bracket corners ─────────────
    const contract = 1 - progress;
    const d   = radius * 0.8 * contract + radius * 0.2;
    const arm = 8;
    for (const [sx2, sy2] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as Array<[number, number]>) {
      const px = x  + d * sx2;
      const py = cy + d * sy2 * 0.5;
      g.moveTo(px, py); g.lineTo(px + sx2 * arm, py);
      g.moveTo(px, py); g.lineTo(px, py + sy2 * arm * 0.5);
    }
    g.stroke({ width: 1.5, color: 0x44ffff, alpha: 0.9 });

    // ── 4. Central pulsing diamond ────────────────────────────────────────
    const ds = 2.5 + 1.5 * Math.sin(ring.startMs / 200);
    g.poly([x, cy - ds, x + ds, cy, x, cy + ds, x - ds, cy]);
    g.fill({ color: 0x44ffff, alpha: 0.85 });

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

    // Only tree and vent use an animated sprite overlay.
    // Ore only uses particles (triggerOre takes no sprite) — creating a sprite here would
    // leave a ghost ore sprite on the effectLayer permanently covering the depleted pit.
    if (type === 'tree') {
      const tex = this._getCellTexture(col, row);
      const sp  = tex ? this._makeAnimSprite(tex, wx, wy) : null;
      this.harvestFx?.triggerTree(sp, wx, wy);
    } else if (type === 'ore') {
      this.harvestFx?.triggerOre(wx, wy);
    } else if (type === 'vent') {
      const tex = this._getCellTexture(col, row);
      const sp  = tex ? this._makeAnimSprite(tex, wx, wy) : null;
      this.harvestFx?.triggerVent(sp, wx, wy);
    }
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
    const defFrm  = terrainToAtlasIndex(terrain, col, row, seed, N);
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

    // ── Building image ghost (PNG sprite when available) ─────────────────
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
      sp.alpha = 0.60;
      sp.tint  = color;
      this.ghostLayer.addChild(sp);
    }
    // No procedural 3D box fallback — footprint diamond outline is sufficient
    // when no PNG is available yet for this building type.
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

  // ─── Per-building idle animations ─────────────────────────────────────────

  private _createBldgEffect(b: PlacedBuilding): void {
    const def  = BUILDING_DEFS[b.type];
    const sW   = def?.sizeW ?? 1;
    const sH   = def?.sizeH ?? 1;
    // Centre of footprint in world-local screen coords
    const topLeft  = gridToScreen(b.x, b.y);
    const botRight = gridToScreen(b.x + sW, b.y + sH);
    const cx = (topLeft.x + botRight.x) / 2;
    const cy = (topLeft.y + botRight.y) / 2;
    const key = `${b.x},${b.y}`;
    const gs: Graphics[] = [];
    const sprites: Sprite[] = [];
    const extra: Record<string, number> = {};

    // All bldg-effect Graphics go on hubLayer (above buildingLayer sprites).
    const L = this.hubLayer;

    if (b.type === 'resource_storage') {
      // 5 indicator dots + 1 steam graphics
      for (let i = 0; i < 6; i++) {
        const g = new Graphics(); L.addChild(g); gs.push(g);
      }
      extra['nextSteam'] = 5000 + Math.random() * 3000;
      extra['steamT'] = -1;

    } else if (b.type === 'landing_pad') {
      // gs[0..3]=stripe glows (orange+blue), gs[4]=motion-blur Graphics, gs[5]=exhaust steam
      // sprites[0]=drone sprite (pos_drone_on / pos_drone_off)
      for (let i = 0; i < 6; i++) {
        const g = new Graphics(); L.addChild(g); gs.push(g);
      }
      // Drone sprite — single pos_drone texture
      if (this.posDroneTex) {
        const sp = new Sprite(this.posDroneTex);
        sp.anchor.set(0.5, 1.0);
        sp.scale.set(TILE_W / this.posDroneTex.width);
        L.addChild(sp);
        sprites.push(sp);
      }
      extra['launchT']       = -1;
      extra['nextLaunch']    = 2000;   // first appearance: 2s after build
      extra['firstAppearance'] = 1;    // descend from sky on first cycle

    } else if (b.type === 'spaceport') {
      // gs[0]=red signal lights, gs[1]=gas vents, gs[2]=small drones, gs[3]=cyan platform light
      const lights = new Graphics(); L.addChild(lights); gs.push(lights);
      const gas    = new Graphics(); L.addChild(gas);    gs.push(gas);
      const drones = new Graphics(); L.addChild(drones); gs.push(drones);
      const cyan   = new Graphics(); L.addChild(cyan);   gs.push(cyan);
      for (let i = 0; i < 3; i++) {
        extra[`d${i}_t`]     = Math.random();
        extra[`d${i}_speed`] = 0.0003 + Math.random() * 0.0002;
      }
      extra['nextSteam']  = 1200 + Math.random() * 1500;
      extra['steamT']     = -1;
      extra['nextSteam2'] = 2200 + Math.random() * 1500;
      extra['steamT2']    = -1;
      // Random phase offset per signal light so they blink independently
      for (let i = 0; i < 6; i++) extra[`sigPh${i}`] = Math.random() * 3000;
    }

    this.bldgEffects.set(key, { gs, sprites, timeMs: 0, extra, cx, cy, sW, type: b.type });
  }

  private _tickBldgEffects(deltaMs: number): void {
    for (const eff of this.bldgEffects.values()) {
      eff.timeMs += deltaMs;
      const t  = eff.timeMs;
      const cx = eff.cx;
      const cy = eff.cy;
      const sW = eff.sW;

      if (eff.type === 'resource_storage') {
        // ── Blinking indicator lights (bottom→top, 1.5s cycle) ──────────
        const CYCLE = 1500;
        const phase = (t % CYCLE) / CYCLE;
        for (let i = 0; i < 5; i++) {
          const lit = phase > i / 5 && phase < (i + 1) / 5;
          eff.gs[i].clear();
          if (lit) {
            eff.gs[i].circle(cx + (i - 2) * 9, cy - 6 - i * 5, 2.5);
            eff.gs[i].fill({ color: 0xffcc44, alpha: 0.92 });
          }
        }
        // ── Steam puff every 5–8 s ───────────────────────────────────────
        eff.extra['nextSteam'] -= deltaMs;
        if (eff.extra['nextSteam'] <= 0) {
          eff.extra['nextSteam'] = 5000 + Math.random() * 3000;
          eff.extra['steamT'] = 0;
        }
        if (eff.extra['steamT'] >= 0) {
          eff.extra['steamT'] += deltaMs;
          const st    = eff.extra['steamT'];
          const DUR   = 900;
          if (st < DUR) {
            const steam = eff.gs[5]; steam.clear();
            // 4 puff particles launched in sequence, each drifting left-down
            for (let i = 0; i < 4; i++) {
              const launch = i * 0.18;                       // staggered start 0..0.54
              const p = Math.max(0, (st / DUR - launch) / (1 - launch));
              if (p <= 0) continue;
              // Vent origin: slightly left of center, near top of building
              const ox = cx - 6 + i * 2;
              const oy = cy - 14 - i * 2;
              // Drift: left (−X) and slightly down (+Y) in screen space
              const dx = -p * (22 + i * 5);
              const dy =  p * (6  + i * 2);
              const r  = 3.5 + p * (5 + i * 1.5);
              steam.circle(ox + dx, oy + dy, r);
              steam.fill({ color: 0xddeeff, alpha: (1 - p) * 0.48 });
            }
          } else { eff.extra['steamT'] = -1; eff.gs[5].clear(); }
        }

      } else if (eff.type === 'landing_pad') {
        const TW2_lp = TILE_W / 2;
        const TH2_lp = TILE_H / 2;
        const LP_Y   = cy - TILE_H * 1.25; // platform surface Y
        const hw = 20, thC = 13, fh = 26;  // blur-ghost cube dims

        // ── Phase boundaries ─────────────────────────────────────────────
        const RISE_DUR   = 2_500;
        const HOVER_DUR  = 2_000;
        const LAUNCH_DUR = 550;
        const AWAY_DUR   = 20_000;
        const RETURN_DUR = 550;
        const SETTLE_DUR = 2_500;
        const IDLE_DUR   = 60_000;
        const P_HOVER   = RISE_DUR;
        const P_LAUNCH  = P_HOVER  + HOVER_DUR;
        const P_AWAY    = P_LAUNCH + LAUNCH_DUR;
        const P_RETURN  = P_AWAY   + AWAY_DUR;
        const P_SETTLE  = P_RETURN + RETURN_DUR;
        const P_IDLE    = P_SETTLE + SETTLE_DUR;
        const TOTAL     = P_IDLE   + IDLE_DUR;

        // ── Timing ──────────────────────────────────────────────────────
        eff.extra['nextLaunch'] -= deltaMs;
        if (eff.extra['launchT'] < 0 && eff.extra['nextLaunch'] <= 0) {
          if (eff.extra['firstAppearance']) {
            // First time: enter cycle at RETURN so drone descends from sky
            eff.extra['launchT']       = P_RETURN;
            eff.extra['firstAppearance'] = 0;
          } else {
            eff.extra['launchT'] = 0;   // normal: rise from platform
          }
        }
        if (eff.extra['launchT'] >= 0) {
          eff.extra['launchT'] += deltaMs;
          if (eff.extra['launchT'] >= TOTAL) {
            eff.extra['launchT']    = 0;                            // loop normally
            eff.extra['nextLaunch'] = 2000 + Math.random() * 3000; // reset inter-cycle delay
          }
        }
        const lt = eff.extra['launchT'];

        // ── Drone position + state ───────────────────────────────────────
        let bY        = LP_Y;    // drone base Y (bottom of sprite)
        let droneVis  = true;
        let lp        = 0;       // launch phase 0→1
        let rp        = 0;       // return phase 0→1

        if (lt < 0) {
          // Waiting for first appearance — drone not yet visible
          droneVis = false;
        } else if (lt < P_HOVER) {
          // RISE: from hover height LP_Y-12 up to LP_Y-38, ease-in-out
          const p    = lt / RISE_DUR;
          const ease = p < 0.5 ? 2*p*p : 1 - 2*(1-p)*(1-p);
          bY = LP_Y - 12 - 26 * ease;  // LP_Y-12 → LP_Y-38, no jump from IDLE
        } else if (lt < P_LAUNCH) {
          // HOVER: bob + stripe acceleration
          bY = LP_Y - 38 + Math.sin((lt - P_HOVER) / 260) * 2.5;
        } else if (lt < P_AWAY) {
          // LAUNCH: shoot up
          lp = (lt - P_LAUNCH) / LAUNCH_DUR;
          bY = LP_Y - 38 - lp * lp * 420;
        } else if (lt < P_RETURN) {
          // AWAY: drone hidden
          droneVis = false;
        } else if (lt < P_SETTLE) {
          // RETURN: fall back (reverse launch, decelerate)
          rp = (lt - P_RETURN) / RETURN_DUR;
          bY = LP_Y - 38 - (1 - rp) * (1 - rp) * 420;
        } else if (lt < P_IDLE) {
          // SETTLE: slow descent, quadratic ease-out → ends at hover height LP_Y-12
          const p = (lt - P_SETTLE) / SETTLE_DUR;
          bY = LP_Y - 12 - 26 * (1 - p) * (1 - p);
        } else {
          // IDLE HOVER: sine from LP_Y-12 using local time → no jump at transition
          bY = LP_Y - 12 + Math.sin((lt - P_IDLE) / 700) * 2;
        }

        // ── Stripe blink period ──────────────────────────────────────────
        let period = 1400;
        if (lt >= P_HOVER && lt < P_LAUNCH) {
          period = 1400 - (lt - P_HOVER) / HOVER_DUR * 1250;  // 1400 → 150ms
        } else if ((lt >= P_LAUNCH && lt < P_AWAY) || (lt >= P_RETURN && lt < P_IDLE)) {
          period = 150;
        }

        // ── 4 iso-grid stripe glows ──────────────────────────────────────
        const STRIPES: Array<[number,number,number,number,number]> = [
          [cx - TW2_lp,   LP_Y - 2*TH2_lp, cx + 2*TW2_lp, LP_Y + TH2_lp,   0xff6622],
          [cx - 2*TW2_lp, LP_Y - TH2_lp,   cx + TW2_lp,   LP_Y + 2*TH2_lp, 0xff6622],
          [cx + TW2_lp,   LP_Y - 2*TH2_lp, cx - 2*TW2_lp, LP_Y + TH2_lp,   0x44aaff],
          [cx + 2*TW2_lp, LP_Y - TH2_lp,   cx - TW2_lp,   LP_Y + 2*TH2_lp, 0x44aaff],
        ];
        const PHASES = [0, 600, 300, 900];
        for (let i = 0; i < 4; i++) {
          const [x1, y1, x2, y2, col] = STRIPES[i];
          const a = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin((t + PHASES[i]) / period * Math.PI * 2));
          const g = eff.gs[i]; g.clear();
          g.moveTo(x1, y1); g.lineTo(x2, y2);
          g.stroke({ width: 5, color: col, alpha: a * 0.3 });
          g.moveTo(x1, y1); g.lineTo(x2, y2);
          g.stroke({ width: 1.5, color: col, alpha: a });
        }

        // ── Motion-blur Graphics (gs[4]) — LAUNCH + RETURN ──────────────
        const blurG = eff.gs[4]; blurG.clear();
        if (lp > 0 || rp > 0) {
          const phase    = lp > 0 ? lp : rp;
          const dist     = (lp > 0 ? lp*lp : (1-rp)*(1-rp)) * 420;
          const streakTop = bY - fh - dist * 0.85;
          const streakH   = Math.max(0, (LP_Y - 38 - fh) - streakTop);
          if (streakH > 2) {
            blurG.rect(cx - hw * 0.6, streakTop, hw * 1.2, streakH);
            blurG.fill({ color: 0x88aaff, alpha: 0.18 * (1 - phase) });
            blurG.rect(cx - 2.5, streakTop, 5, streakH);
            blurG.fill({ color: 0xaaddff, alpha: 0.65 * (1 - phase) });
          }
          for (let j = 1; j <= 4; j++) {
            const ghostBY = bY - j * dist * 0.22;
            const ga      = (1 - phase) * (1 - j * 0.22);
            if (ga <= 0.02) continue;
            blurG.poly([cx, ghostBY-fh-thC, cx+hw, ghostBY-fh, cx, ghostBY-fh+thC, cx-hw, ghostBY-fh]);
            blurG.fill({ color: 0x88ccff, alpha: ga * 0.35 });
          }
        }

        // ── Drone sprite ─────────────────────────────────────────────────
        const droneSp = eff.sprites[0];
        if (droneSp) {
          droneSp.visible = droneVis;
          if (droneVis) {
            if (this.posDroneTex && droneSp.texture !== this.posDroneTex) {
              droneSp.texture = this.posDroneTex;
              droneSp.scale.set(TILE_W / this.posDroneTex.width);
            }
            // Shake during launch (first 70% of ascent) and return start
            const shaking = (lp > 0 && lp < 0.7) || (rp > 0 && rp < 0.3);
            const sx = shaking ? (Math.random() - 0.5) * 5 : 0;
            const sy = shaking ? (Math.random() - 0.5) * 2 : 0;
            droneSp.position.set(cx + sx, bY + sy);
          }
        } else if (droneVis) {
          // Fallback iso-cube when no texture loaded
          const fa = lp > 0 ? Math.max(0, 1-lp*1.5) : rp > 0 ? Math.max(0, 1-(1-rp)*1.5) : 1;
          if (fa > 0.02) {
            blurG.poly([cx, bY-fh-thC, cx+hw, bY-fh, cx, bY-fh+thC, cx-hw, bY-fh]);
            blurG.fill({ color: 0x99bbcc, alpha: fa });
            blurG.poly([cx-hw, bY-fh, cx, bY-fh+thC, cx, bY+thC, cx-hw, bY]);
            blurG.fill({ color: 0x445566, alpha: fa });
            blurG.poly([cx+hw, bY-fh, cx, bY-fh+thC, cx, bY+thC, cx+hw, bY]);
            blurG.fill({ color: 0x556677, alpha: fa });
          }
        }

        // ── Exhaust / steam (gs[5]) — blue-orange palette ────────────────
        // Orange 0xff8833 = hot engine exhaust (near drone)
        // Blue   0x44aaff = cooled gas / ion plume (expanding outward)
        const steamG = eff.gs[5]; steamG.clear();
        // Post-launch: lingering smoke disperses for 2800ms after drone leaves
        if (lt >= P_AWAY && lt < P_AWAY + 2800) {
          const age = (lt - P_AWAY) / 2800;
          // 3 staggered expanding iso-rings: alternating orange / blue / orange
          const RING_COLS = [0xff8833, 0x44aaff, 0xff8833];
          for (let ring = 0; ring < 3; ring++) {
            const delay = ring * 0.16;
            if (age < delay) continue;
            const ra  = Math.min(1, (age - delay) / (1 - delay));
            const rr  = 55 + ra * 135;
            const pts: number[] = [];
            for (let i = 0; i <= 24; i++) {
              const a2 = (i / 24) * Math.PI * 2;
              pts.push(cx + Math.cos(a2) * rr, LP_Y + Math.sin(a2) * rr * 0.42);
            }
            steamG.poly(pts);
            steamG.stroke({ width: 3 - ring * 0.8, color: RING_COLS[ring],
              alpha: (1 - ra) * (1 - ra) * 0.58 });
          }
          // 8 radial drift particles — orange and blue alternating
          const ISO_D_DRIFT: Array<[number,number]> = [
            [1,0],[-1,0],[0.7,0.45],[-0.7,0.45],[0.7,-0.45],[-0.7,-0.45],[0,0.9],[0,-0.9],
          ];
          for (let i = 0; i < 8; i++) {
            const [dx2, dy2] = ISO_D_DRIFT[i];
            const pOff  = (i / 8) * 0.1;
            const phase = Math.min(1, Math.max(0, (age - pOff) / (1 - pOff)));
            if (phase <= 0) continue;
            const dist = phase * 115;
            const r    = 3.5 + phase * 9;
            const a    = (1 - phase) * (1 - phase) * 0.42;
            if (a < 0.01) continue;
            steamG.circle(cx + dx2 * dist, LP_Y + dy2 * dist, r);
            steamG.fill({ color: i % 2 === 0 ? 0xff8833 : 0x44aaff, alpha: a });
          }
        }
        if (lt >= 0 && droneVis) {
          const steamOriginY = bY;

          // RISE or SETTLE: gentle particles — alternating orange / blue
          if ((lt < P_HOVER) || (lt >= P_SETTLE && lt < P_IDLE)) {
            const SCYCLE = 650;
            for (let i = 0; i < 4; i++) {
              const phase = ((t + i * (SCYCLE/4)) % SCYCLE) / SCYCLE;
              const ey    = steamOriginY + phase * (LP_Y - steamOriginY);
              steamG.circle(cx + (i%2===0?1:-1)*phase*5, ey, 2 + phase * 4.5);
              steamG.fill({ color: i % 2 === 0 ? 0xff8833 : 0x44aaff, alpha: (1-phase)*0.35 });
            }
          }

          // LAUNCH: dense column (orange near engine, blue near platform) + radial splash
          else if (lp > 0) {
            const colH = LP_Y - steamOriginY;
            if (colH > 0) {
              const PCYCLE = Math.max(75, 210 - lp * 135);
              for (let i = 0; i < 8; i++) {
                const phase = ((t*1.6 + i*PCYCLE/8) % PCYCLE) / PCYCLE;
                const ey    = steamOriginY + phase * colH;
                if (ey < steamOriginY || ey > LP_Y) continue;
                // near engine = orange, near platform = blue
                const col = phase < 0.45 ? 0xff8833 : 0x44aaff;
                steamG.circle(cx, ey, 2.5 + phase*(7 + lp*9));
                steamG.fill({ color: col, alpha: (1-phase*0.5)*0.6 });
              }
            }
            const elapsed = lt - P_LAUNCH;
            // ring 0 = orange, ring 1 = blue
            for (let ring = 0; ring < 2; ring++) {
              const delay   = ring * 120;
              if (elapsed < delay) continue;
              const ringAge = Math.min(1, (elapsed-delay)/(LAUNCH_DUR*0.85));
              const rr = ringAge * 82;
              const pts: number[] = [];
              for (let i = 0; i <= 20; i++) {
                const a2 = (i/20)*Math.PI*2;
                pts.push(cx + Math.cos(a2)*rr, LP_Y + Math.sin(a2)*rr*0.45);
              }
              steamG.poly(pts);
              steamG.stroke({ width: 2-ring*0.5, color: ring === 0 ? 0xff8833 : 0x44aaff,
                alpha: (1-ringAge)*0.72 });
            }
            const ISO_D: Array<[number,number]> = [
              [1,0],[-1,0],[0.7,0.45],[-0.7,0.45],[0.7,-0.45],[-0.7,-0.45],[0,0.9],[0,-0.9],
            ];
            for (let i = 0; i < 8; i++) {
              const [dx2, dy2] = ISO_D[i];
              const phase = ((t + i*38) % 300) / 300;
              steamG.circle(cx + dx2*phase*78, LP_Y + dy2*phase*78, 1.5 + phase*4);
              steamG.fill({ color: i % 2 === 0 ? 0xff8833 : 0x44aaff, alpha: (1-phase)*0.58 });
            }
          }

          // RETURN: same heavy exhaust, radial splash at end (rp > 0.7)
          else if (rp > 0) {
            const colH = LP_Y - steamOriginY;
            if (colH > 0) {
              const PCYCLE = Math.max(75, 210 - (1-rp)*135);
              for (let i = 0; i < 8; i++) {
                const phase = ((t*1.6 + i*PCYCLE/8) % PCYCLE) / PCYCLE;
                const ey    = steamOriginY + phase * colH;
                if (ey < steamOriginY || ey > LP_Y) continue;
                const col = phase < 0.45 ? 0xff8833 : 0x44aaff;
                steamG.circle(cx, ey, 2.5 + phase*(7 + (1-rp)*9));
                steamG.fill({ color: col, alpha: (1-phase*0.5)*0.6 });
              }
            }
            if (rp > 0.7) {
              const splashAge = (rp - 0.7) / 0.3;
              for (let ring = 0; ring < 2; ring++) {
                const delay   = ring * 0.15;
                if (splashAge < delay) continue;
                const ringAge = Math.min(1, (splashAge-delay)/0.85);
                const rr = ringAge * 82;
                const pts: number[] = [];
                for (let i = 0; i <= 20; i++) {
                  const a2 = (i/20)*Math.PI*2;
                  pts.push(cx + Math.cos(a2)*rr, LP_Y + Math.sin(a2)*rr*0.45);
                }
                steamG.poly(pts);
                steamG.stroke({ width: 2-ring*0.5, color: ring === 0 ? 0xff8833 : 0x44aaff,
                  alpha: (1-ringAge)*0.72 });
              }
            }
          }
        }

      } else if (eff.type === 'spaceport') {
        // ── 6 independent signal lights on left tower face ──────────────
        // Positions recalculated for sizeW=3 sprite (scale≈0.753 from 510px PNG).
        // Left column  (x=-62): indices 0 and 4 — vertical line.
        // Right column (x=-47): indices 2, 3, 5 — vertical line.
        // Index 1 sits between the two columns.
        const SIG: Array<[number, number]> = [
          [ -62, -151],   // 0: upper-left  (aligned with lower-left #4)
          [ -73, -115],   // 1: left-mid
          [ -47, -125],   // 2: upper-right (reference)
          [ -47,  -92],   // 3: right-mid   (aligned right +6 → same column as #2)
          [ -62,  -75],   // 4: lower-left  (reference)
          [ -47,  -48],   // 5: lower-right (aligned right +4 → same column as #2)
        ];
        // Each light: on 180ms / off every 1800–2800ms, independent phase
        const PERIODS = [1900, 2300, 2100, 2600, 1800, 2500];
        eff.gs[0].clear();
        for (let i = 0; i < SIG.length; i++) {
          const [dx, dy] = SIG[i];
          const phase    = eff.extra[`sigPh${i}`];
          const lit      = (t + phase) % PERIODS[i] < 180;
          const lx = cx + dx, ly = cy + dy;
          if (lit) {
            // Outer glow ring
            eff.gs[0].circle(lx, ly, 5.5);
            eff.gs[0].fill({ color: 0xff2200, alpha: 0.25 });
            // Bright core
            eff.gs[0].circle(lx, ly, 2.5);
            eff.gs[0].fill({ color: 0xff3311, alpha: 0.97 });
          } else {
            eff.gs[0].circle(lx, ly, 2.0);
            eff.gs[0].fill({ color: 0x661100, alpha: 0.12 });
          }
        }

        // ── 2 gas vents on left wall — drift left + down ────────────────
        // Raised another 8px (total +16px); burst + 2s continuous hold
        const VENTS = [
          { tKey: 'steamT',  nKey: 'nextSteam',
            ox: cx - 86, oy: cy - 77 },   // upper vent (same X as lower)
          { tKey: 'steamT2', nKey: 'nextSteam2',
            ox: cx - 86, oy: cy - 44 },   // lower vent
        ];
        const GAS_BURST = 600;    // initial sharp burst, ms
        const GAS_HOLD  = 2000;   // continuous stream after burst, ms
        const GAS_TOTAL = GAS_BURST + GAS_HOLD;
        const gasG = eff.gs[1]; gasG.clear();
        for (const v of VENTS) {
          eff.extra[v.nKey] -= deltaMs;
          if (eff.extra[v.nKey] <= 0) {
            eff.extra[v.nKey] = 1500 + Math.random() * 1500;  // 1.5–3s pause
            eff.extra[v.tKey] = 0;
          }
          if (eff.extra[v.tKey] >= 0) {
            eff.extra[v.tKey] += deltaMs;
            const st = eff.extra[v.tKey];
            if (st < GAS_TOTAL) {
              if (st < GAS_BURST) {
                // ── Phase 1: sharp initial burst ──────────────────────
                for (let i = 0; i < 5; i++) {
                  const launch = i * 0.15;
                  const p = Math.max(0, (st / GAS_BURST - launch) / (1 - launch));
                  if (p <= 0) continue;
                  const dx = -p * (40 + i * 12);
                  const dy =  p * (10 + i * 4);
                  gasG.circle(v.ox + dx, v.oy + dy, 3 + p * (5 + i * 1.5));
                  gasG.fill({ color: 0xddeeff, alpha: (1 - p) * (1 - p) * 0.7 });
                }
              } else {
                // ── Phase 2: continuous steady stream ─────────────────
                // 6 particles cycling through drift path → looks like non-stop flow
                const holdT  = st - GAS_BURST;
                const PERIOD = 380;   // each particle cycles every 380ms
                for (let i = 0; i < 6; i++) {
                  const p = ((holdT + i * (PERIOD / 6)) % PERIOD) / PERIOD; // 0→1
                  const dx = -p * 52;        // left
                  const dy =  p * 14;        // down
                  const r  = 2.8 + p * 6;
                  gasG.circle(v.ox + dx, v.oy + dy, r);
                  gasG.fill({ color: 0xddeeff, alpha: (1 - p) * 0.55 });
                }
              }
            } else { eff.extra[v.tKey] = -1; }
          }
        }

        // ── Small cargo drones (Lissajous orbit) ───────────────────────
        eff.gs[2].clear();
        for (let i = 0; i < 3; i++) {
          eff.extra[`d${i}_t`] = (eff.extra[`d${i}_t`] + deltaMs * eff.extra[`d${i}_speed`]) % 1;
          const t2 = eff.extra[`d${i}_t`];
          const dx = cx + Math.cos(t2 * Math.PI * 2 + i * 2.1) * TILE_W * 0.65;
          const dy = cy - TILE_H * 0.5 + Math.sin(t2 * Math.PI * 4 + i * 1.3) * TILE_H * 0.3;
          eff.gs[2].rect(dx - 1, dy - 1, 2, 2);
          eff.gs[2].fill({ color: 0xaaddff, alpha: 0.75 });
        }

        // ── Cyan neon platform signal light — V-path, 2s cycle ─────────
        // Sweeps: left-edge → front-vertex → right-edge along the platform face
        const VLX = cx - 56, VLY = cy + 28;   // left end
        const VFX = cx,      VFY = cy + 56;   // front/bottom vertex
        const VRX = cx + 56, VRY = cy + 28;   // right end
        const frac = (t % 2000) / 2000;
        let plx: number, ply: number;
        if (frac < 0.5) {
          const f2 = frac / 0.5;
          plx = VLX + (VFX - VLX) * f2;
          ply = VLY + (VFY - VLY) * f2;
        } else {
          const f2 = (frac - 0.5) / 0.5;
          plx = VFX + (VRX - VFX) * f2;
          ply = VFY + (VRY - VFY) * f2;
        }
        const cyanG = eff.gs[3]; cyanG.clear();
        // Outer glow
        cyanG.circle(plx, ply, 7);
        cyanG.fill({ color: 0x44eeff, alpha: 0.18 });
        // Core dot
        cyanG.circle(plx, ply, 2.5);
        cyanG.fill({ color: 0x44eeff, alpha: 0.95 });
      }
    }
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
