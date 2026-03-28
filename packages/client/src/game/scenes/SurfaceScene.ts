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
 *   - No textures (buildings are Graphics)
 *   - Deterministic from planet.seed
 *   - 60fps: static layers drawn once, dynamic layers rebuilt only on state change
 */

import {
  Container,
  Graphics,
  Polygon,
  Sprite,
  TilingSprite,
  Assets,
  Texture,
  Rectangle,
} from 'pixi.js';
// In PixiJS v8, DisplayObject was removed; Sprite/Graphics both extend Container.
type DisplayObject = Container | Sprite | Graphics;
import type { Planet, Star, PlacedBuilding, BuildingType, HarvestedCell, SurfaceObjectType, TerrainType } from '@nebulife/core';
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
  isMobileDevice,
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

// ─── Demolish VFX types ───────────────────────────────────────────────────────

interface DemolishParticle {
  x: number; y: number; vx: number; vy: number;
  alpha: number; color: number; size: number; life: number; maxLife: number;
}

interface DemolishEffect {
  building:    PlacedBuilding;
  sprite:      DisplayObject;   // reparented: buildingLayer → demolishLayer
  overlayGfx:  Graphics;        // crack lines + flash
  particleGfx: Graphics;        // smoke / fire dots
  progressGfx: Graphics;        // red progress arc
  burnGfx:     Graphics;        // burn mark after collapse
  particles:   DemolishParticle[];
  timeMs:      number;
  cx:          number;
  cy:          number;
  sW:          number;
  sH:          number;
  onComplete:  () => void;
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
  observatory:       { top: 0x9988cc, right: 0x7766aa, left: 0x443366 },
  alpha_harvester:   { top: 0xddcc44, right: 0xaa9922, left: 0x776600 },  // gold landing pad
  thermal_generator: { top: 0x993322, right: 0x6e2010, left: 0x400d06 },  // hot red-charcoal
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
    /** Single batched Graphics for all 5 diamond outlines (1 clear/frame). */
    diamondGfx: Graphics;
    /** Per-ring data for diamond drawing. */
    diamondData: Array<{ cx: number; cy: number; rW: number; rH: number; color: number }>;
    /** 5 rotating orbit arcs — kept separate (blendMode='add' breaks batching). */
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
    /** Single batched Graphics for all 4 sparks (1 clear/frame). */
    sparkGfx: Graphics;
    /** Per-spark positional data (no individual Graphics). */
    sparks: Array<{ angle: number; speed: number; dist: number; phase: number }>;
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

  // ─── Isotope fuel for drones ────────────────────────────────────────────
  private currentIsotopes: number = 0;
  private hasSolarPlant:   boolean = false;
  private onConsumeIsotopes: ((amount: number) => boolean) | null = null;

  // ─── Solar plant glow overlay texture ────────────────────────────────────
  private solarLightTex: Texture | null = null;

  // ─── Battery station glow overlay texture ────────────────────────────────
  private batteryGlowTex: Texture | null = null;

  // ─── Wind generator rotor texture ────────────────────────────────────────
  private windRotorTex: Texture | null = null;

  // ─── Mine drill overlay texture ───────────────────────────────────────────
  private mineDrillTex: Texture | null = null;

  // ─── Water extractor frost overlay texture ────────────────────────────────
  private waterFrostTex: Texture | null = null;

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

  // ─── Clouds (TilingSprite, static semi-transparent overlay) ─────────────
  private cloudShadowSprite: TilingSprite | null = null;
  private cloudBodySprite: TilingSprite | null = null;

  // ─── Performance: frame throttles ───────────────────────────────────────
  /** Counts frames; foam redraws every N frames to save GPU uploads. */
  private _foamFrameCount = 0;
  /** Mobile: throttle hub effects (every 3rd frame) and building effects (every 2nd frame). */
  private _hubFrameCount = 0;
  private _bldgEffectFrame = 0;
  private readonly _isMobile = isMobileDevice();

  // ─── Performance: floating text driven by update() — no per-anim RAF ─────
  private _floatAnims: Array<{
    g: Graphics; x: number; cy: number; color: number; elapsedMs: number;
  }> = [];

  // ─── Harvest visual effects ───────────────────────────────────────────────
  private harvestFx:       HarvestEffects | null = null;
  /** Temp sprites on effectLayer being driven by HarvestEffects animations. */
  private animatedSprites: Sprite[]              = [];

  // ─── Building placement animations ───────────────────────────────────────
  private buildingAnims:  BuildingAnim[] = [];
  private animatedKeys:   Set<string>    = new Set();
  private screenShakeMs:  number         = 0;

  // ─── Demolish VFX ─────────────────────────────────────────────────────────
  private demolishLayer: Container = new Container();
  private demolishEffects = new Map<string, DemolishEffect>();
  private buildingDisplayObjects = new Map<string, DisplayObject>();

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
      this.foamGfx,         // shoreline foam — on top of terrain
      this.featureLayer,
      this.corridorLayer,
      this.overlayLayer,
      this.effectLayer,        // pulsing rings + scanner — above zone overlay, below buildings
      this.buildingShadowGfx!, // contact shadows — below building sprites
      this.buildingLayer,
      this.hubLayer,         // hub orbit rings — above building sprite
      this.demolishLayer,    // demolish VFX — above hub, below rover
      this.roverLayer,       // rover — above demolish VFX
      this.ghostLayer,    // building placement ghost — above rover, below cloud overlay
      // cloudBodySprite (static overlay) inserted above ghostLayer after texture load in init()
      // fogLayer is added last (topmost) after init
    );
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  // ─── Texture preloading (can run in parallel with API calls) ───────────────

  private static readonly BUILDING_PNGS: [string, string][] = [
    ['colony_hub',        '/buildings/colony_hub.png'],
    ['solar_plant',       '/buildings/solar_plant.png'],
    ['battery_station',   '/buildings/battery_station.png'],
    ['wind_generator',    '/buildings/wind_generator.png'],
    ['resource_storage',  '/tiles/machines/resource_storage.png'],
    ['landing_pad',       '/tiles/machines/landing_pad.png'],
    ['spaceport',         '/tiles/machines/spaceport.png'],
    ['thermal_generator', '/buildings/thermal_generator.png'],
    ['mine',              '/buildings/mine.png'],
    ['fusion_reactor',    '/buildings/fusion_reactor.png'],
    ['water_extractor',   '/buildings/water_extractor.png'],
    ['atmo_extractor',    '/buildings/atmo_extractor.png'],
    ['deep_drill',        '/buildings/deep_drill.png'],
  ];

  /**
   * Start loading ALL textures in parallel. Call this BEFORE awaiting API calls
   * so network requests overlap. Pass the returned promise to init().
   * If not called, init() will load textures itself (but sequentially with API).
   */
  preloadTextures(planet: Planet, star: Star): Promise<(Texture | null)[]> {
    const atlasType = derivePlanetAtlasType(planet, star);
    const atlasUrl  = `/tiles/tiles_${atlasType}.png`;
    const mountUrl  =
      atlasType === 'ice'      ? '/tiles/habitable/mount_ice.png'      :
      atlasType === 'volcanic' ? '/tiles/habitable/mount_volcanic.png' :
                                 '/tiles/habitable/mount_rugged.png';

    const safeLoad = (url: string) => Assets.load<Texture>(url).catch(() => null);

    return Promise.all([
      safeLoad(atlasUrl),
      safeLoad('/buildings/solar_plant_light.png'),
      safeLoad('/buildings/battery_station_on.png'),
      safeLoad('/buildings/wind_generator_on.png'),
      safeLoad('/buildings/mine_on.png'),
      safeLoad('/buildings/water_extractor_on.png'),
      safeLoad('/tiles/machines/bot_resercher.png'),
      safeLoad('/tiles/machines/bot_resercher_off.png'),
      safeLoad('/tiles/machines/premium_harvester_drone.png'),
      safeLoad('/tiles/machines/pos_drone.png'),
      safeLoad(mountUrl),
      ...SurfaceScene.BUILDING_PNGS.map(([, url]) => safeLoad(url)),
    ]);
  }

  private _applyPreloadedTextures(textures: (Texture | null)[]): void {
    const [
      atlasTex, solarLight, batteryGlow, windRotor, mineDrill, waterFrost,
      botFly, botIdle, harvester, posDrone, mountTex,
      ...bldgTexArr
    ] = textures;

    this.baseTexture    = atlasTex;
    this.solarLightTex  = solarLight;
    this.batteryGlowTex = batteryGlow;
    this.windRotorTex   = windRotor;
    this.mineDrillTex   = mineDrill;
    this.waterFrostTex  = waterFrost;
    this.botFlyTex      = botFly;
    this.botIdleTex     = botIdle;
    this.harvesterTex   = harvester;
    this.posDroneTex    = posDrone;
    this.mountTex       = mountTex;

    for (let i = 0; i < SurfaceScene.BUILDING_PNGS.length; i++) {
      const tex = bldgTexArr[i];
      if (tex) this.bldgTextures[SurfaceScene.BUILDING_PNGS[i][0]] = tex;
    }
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  /**
   * @param preloadedTextures — optional promise from preloadTextures() started
   *        earlier (runs in parallel with API calls). If omitted, textures load inline.
   */
  async init(
    planet: Planet, star: Star, buildings: PlacedBuilding[],
    preloadedTextures?: Promise<(Texture | null)[]>,
  ): Promise<void> {
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

    // ── TEMPORARY: skip all texture loading for performance test ──────────
    // TODO: restore after confirming textures are the bottleneck
    // const textures = await (preloadedTextures ?? this.preloadTextures(planet, star));
    // this._applyPreloadedTextures(textures);

    this.drawGroundLayer();
    // this._buildNoiseOverlay();   // TEMP SKIP — perf test
    // this._buildShorelineCells(); // TEMP SKIP — perf test
    // this.placeMountOverlay();    // TEMP SKIP — perf test

    // Pre-mark existing buildings so they don't animate on scene load
    for (const b of buildings) this.animatedKeys.add(`${b.x},${b.y}`);
    this.rebuildBuildings(buildings);

    // Fog of war — init after buildings so hub position is known
    this.fogLayer = new FogLayer(this.gridSize, planet.id);
    this.worldContainer.addChild(this.fogLayer.container);  // topmost
    this.fogLayer.initFromBuildings(buildings);

    // Atmospheric clouds (TilingSprite) — TEMP SKIP for perf test
    // await this._initCloudSprites();

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

  /** Reveal fog around a starting cell (first visit, no hub yet). */
  public revealStartingArea(col: number, row: number, radius: number): void {
    if (this.fogLayer) {
      this.fogLayer.revealAround(col, row, radius);
      this.fogLayer.redraw();
    }
  }

  /** Spawn a drone explorer next to a colony hub building. */
  private _spawnBotNearHub(hub: PlacedBuilding): void {
    if (this.bot || !this.botFlyTex || !this.botIdleTex) return;
    const hubDef = BUILDING_DEFS[hub.type];
    const col = hub.x + (hubDef?.sizeW ?? 2) + 1;
    const row = hub.y + Math.floor((hubDef?.sizeH ?? 2) / 2);
    this.bot = new ResearcherBot(col, row, this.botFlyTex, this.botIdleTex);
    this.bot.isMobile = this._isMobile;
    // Wire isotope consumption callback
    this.bot.onConsumeIsotopes = (amount) => this.onConsumeIsotopes ? this.onConsumeIsotopes(amount) : false;
    this.roverLayer.addChild(this.bot.container);
  }

  /** Public API: spawn drone when colony hub is built during gameplay. */
  public spawnBotAtHub(hub: PlacedBuilding): void {
    this._spawnBotNearHub(hub);
    // Also reveal fog around the hub — scaled to grid size
    if (this.fogLayer) {
      const def = BUILDING_DEFS[hub.type];
      const cx = hub.x + (def?.sizeW ?? 2) / 2 - 0.5;
      const cy = hub.y + (def?.sizeH ?? 2) / 2 - 0.5;
      const rawRadius = def?.fogRevealRadius ?? 30;
      const hubRadius = Math.min(rawRadius, Math.floor(this.gridSize * 0.25));
      const newCells = this.fogLayer.revealAround(cx, cy, hubRadius);
      this.fogLayer.redraw();
      // Incrementally add newly revealed tiles (instead of full ground rebuild)
      this.revealGroundCells(newCells);
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
      (filter) => this._findNearbyHarvestable(homeCol, homeRow, 10, filter),
      (col, row) => { this.harvestAt(col, row); },
    );
    // Wire isotope consumption callback
    drone.onConsumeIsotopes = (amount) => this.onConsumeIsotopes ? this.onConsumeIsotopes(amount) : false;
    drone.hasSolarPlant = this.hasSolarPlant;
    drone.isMobile = this._isMobile;

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
    filter?: Set<string>,
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
        if (isTreeCell(c, r, seed, N, wl) && (!filter || filter.has('tree')))       label = 'Деревина';
        else if (isOreCell(c, r, seed, N, wl) && (!filter || filter.has('ore')))     label = 'Руда';
        else if (isVentCell(c, r, seed, N, wl) && (!filter || filter.has('vent')))   label = 'Газ';

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

  /** Map of "col,row" → DisplayObject for incremental cell updates. */
  private groundCellMap = new Map<string, Container>();

  private drawGroundLayer(): void {
    this.groundLayer.removeChildren();
    this.groundCellMap.clear();
    this.groundLayer.sortableChildren = true;
    const N    = this.gridSize;
    const seed = this.planet.seed;
    const wl   = this.waterLevel;
    const hW   = TILE_W / 2;
    const hH   = TILE_H / 2;

    for (let d = 0; d < 2 * N - 1; d++) {
      const colMin = Math.max(0, d - N + 1);
      const colMax = Math.min(d, N - 1);

      // One batched Graphics per diagonal band for all water/beach cells — reduces
      // Container children from ~1 228 Graphics to ~127, cutting addChild overhead.
      let bandWaterGfx: Graphics | null = null;

      for (let col = colMin; col <= colMax; col++) {
        const row = d - col;

        // Skip tiles hidden under fog — reduces sprite count dramatically on first visit
        if (this.fogLayer && !this.fogLayer.isRevealed(col, row)) continue;

        const terrain = classifyCellTerrain(col, row, seed, wl, N);

        // Water/beach → batch into a single Graphics per diagonal band
        if (isWaterTerrain(terrain) || terrain === 'beach') {
          const { x, y } = gridToScreen(col, row);
          const baseY = y + hH;
          if (!bandWaterGfx) {
            bandWaterGfx = new Graphics();
            bandWaterGfx.zIndex = d;
            this.groundLayer.addChild(bandWaterGfx);
          }
          const color = WATER_COLORS[terrain] ?? 0x0d1f35;
          bandWaterGfx.poly([x, baseY - hH, x + hW, baseY, x, baseY + hH, x - hW, baseY]);
          bandWaterGfx.fill({ color });
          continue;
        }

        // TEMP: simple colored diamond instead of texture sprites (perf test)
        const { x, y } = gridToScreen(col, row);
        const baseY = y + hH;
        const landColor = terrain === 'mountains' || terrain === 'peaks' ? 0x445544
          : terrain === 'hills' ? 0x336633 : 0x225533;
        if (!bandWaterGfx) {
          bandWaterGfx = new Graphics();
          bandWaterGfx.zIndex = d;
          this.groundLayer.addChild(bandWaterGfx);
        }
        bandWaterGfx.poly([x, baseY - hH, x + hW, baseY, x, baseY + hH, x - hW, baseY]);
        bandWaterGfx.fill({ color: landColor });
      }
    }
  }

  /**
   * Create a single ground tile (sprite or fallback diamond) for a LAND cell.
   * Terrain must be pre-classified (not water/beach).
   * Sets zIndex = col+row for painter's algorithm sorting.
   */
  private _createGroundCellFromTerrain(
    col: number, row: number, terrain: TerrainType, d?: number,
  ): Container | null {
    const seed = this.planet.seed;
    const N    = this.gridSize;
    const hH   = TILE_H / 2;
    const { x, y } = gridToScreen(col, row);
    const baseY    = y + hH;
    const zIdx     = d ?? (col + row);

    const defaultFrame = terrainToAtlasIndex(terrain, col, row, seed, N);
    const frameIdx = defaultFrame !== null ? this.getEffectiveFrame(col, row, defaultFrame) : null;
    const tex      = frameIdx !== null ? this.getFrame(frameIdx) : null;

    if (tex) {
      const sp = new Sprite(tex);
      sp.anchor.set(0.5, SPRITE_ANCHOR_Y);
      sp.scale.set(TILE_SCALE, TILE_SCALE);
      sp.position.set(x, baseY);
      sp.zIndex = zIdx;
      return sp;
    }
    const fb = this.makeFallbackDiamond(x, baseY, terrain);
    fb.zIndex = zIdx;
    return fb;
  }

  /**
   * Incrementally reveal ground cells (used by fog reveal instead of full redraw).
   * Only adds tiles for cells that aren't already in the ground layer.
   */
  revealGroundCells(cells: { col: number; row: number }[]): void {
    const hH = TILE_H / 2;
    for (const { col, row } of cells) {
      const key = `${col},${row}`;
      if (this.groundCellMap.has(key)) continue;

      const terrain = classifyCellTerrain(col, row, this.planet.seed, this.waterLevel, this.gridSize);

      // Water/beach — add individual small Graphics (z-sorted)
      if (isWaterTerrain(terrain) || terrain === 'beach') {
        const { x, y } = gridToScreen(col, row);
        const baseY = y + hH;
        const hW = TILE_W / 2;
        const g = new Graphics();
        g.zIndex = col + row;
        const color = WATER_COLORS[terrain] ?? 0x0d1f35;
        g.poly([x, baseY - hH, x + hW, baseY, x, baseY + hH, x - hW, baseY]);
        g.fill({ color });
        this.groundLayer.addChild(g);
        this.groundCellMap.set(key, g);
        continue;
      }

      const child = this._createGroundCellFromTerrain(col, row, terrain);
      if (child) {
        this.groundLayer.addChild(child);
        this.groundCellMap.set(key, child);
      }
    }
  }

  /**
   * Replace a single ground cell (used after harvest — update one tile instead of full redraw).
   */
  private _replaceGroundCell(col: number, row: number): void {
    const key = `${col},${row}`;
    const old = this.groundCellMap.get(key);
    if (old) {
      this.groundLayer.removeChild(old);
      old.destroy();
    }
    const terrain = classifyCellTerrain(col, row, this.planet.seed, this.waterLevel, this.gridSize);
    if (isWaterTerrain(terrain) || terrain === 'beach') return; // water cells not tracked individually
    const child = this._createGroundCellFromTerrain(col, row, terrain);
    if (child) {
      this.groundLayer.addChild(child);
      this.groundCellMap.set(key, child);
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

    // Clear buildingDisplayObjects but keep entries for actively demolishing buildings
    for (const key of [...this.buildingDisplayObjects.keys()]) {
      if (!this.demolishEffects.has(key)) this.buildingDisplayObjects.delete(key);
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
      const key = `${b.x},${b.y}`;
      // Skip buildings that are currently being demolished (sprite lives in demolishLayer)
      if (this.demolishEffects.has(key)) continue;

      if (b.type === 'colony_hub') this.createHubEffects(b);
      const bldg = this.makeIsoBuilding(b);
      this.buildingLayer.addChild(bldg);
      // Track display object reference for potential future demolish
      this.buildingDisplayObjects.set(key, bldg);

      if (!this.animatedKeys.has(key)) {
        this.animatedKeys.add(key);
        this._startBuildingAnim(b, bldg);
      }
      // Create idle animation for supported building types
      if (b.type === 'resource_storage' || b.type === 'landing_pad' || b.type === 'spaceport' || b.type === 'solar_plant' || b.type === 'battery_station' || b.type === 'wind_generator' || b.type === 'thermal_generator' || b.type === 'mine' || b.type === 'fusion_reactor' || b.type === 'water_extractor' || b.type === 'atmo_extractor' || b.type === 'deep_drill') {
        this._createBldgEffect(b);
        // Restore previous animation state so existing buildings don't restart from zero
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

    // Single Graphics for all 5 diamond outlines (1 clear/frame instead of 5)
    const diamondGfx = new Graphics();
    this.hubLayer.addChild(diamondGfx);

    const diamondData: Array<{ cx: number; cy: number; rW: number; rH: number; color: number }> = [];
    const orbits: Array<{ g: Graphics; angle: number; speed: number; color: number; cx: number; cy: number; rW: number; rH: number }> = [];

    for (let i = 0; i < RINGS.length; i++) {
      const [rMult, color, speed] = RINGS[i];
      const rW = rMult * TW2;
      const rH = rW * (TILE_H / TILE_W);  // iso-correct vertical compression

      diamondData.push({ cx, cy, rW, rH, color });

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

    // Single Graphics for all 4 sparks (1 clear/frame instead of 4)
    const sparkGfx = new Graphics();
    this.hubLayer.addChild(sparkGfx);

    // Spark positional data (no individual Graphics per spark)
    const sparks = Array.from({ length: 4 }, (_, i) => ({
      angle: (i / 4) * Math.PI * 2,
      speed: 0.0008 + 0.0003 * i,
      dist:  RINGS[4][0] * TW2 * 0.65,   // 65% of outermost ring rW
      phase: i * 1.5,
    }));

    this.hubEffects = {
      diamondGfx, diamondData, orbits, sparkGfx, sparks,
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

    // Tick floating-text animations (driven here — no separate requestAnimationFrame loop)
    const FLOAT_DURATION = 1200;
    for (let i = this._floatAnims.length - 1; i >= 0; i--) {
      const fa = this._floatAnims[i];
      fa.elapsedMs += deltaMs;
      const t     = Math.min(1, fa.elapsedMs / FLOAT_DURATION);
      const alpha = 1 - t;
      if (alpha <= 0) {
        fa.g.destroy();
        this._floatAnims.splice(i, 1);
        continue;
      }
      const offsetY = -30 * t;
      fa.g.clear();
      fa.g.circle(fa.x, fa.cy + offsetY, 4 * (1 - t));
      fa.g.fill({ color: fa.color, alpha });
    }

    // Animate harvest progress ring
    this.drawHarvestRing(deltaMs);

    // Animate shoreline foam — skip entirely on mobile (expensive GPU work).
    // Desktop: throttled to every 4 frames (~15 fps redraw on 60 fps).
    if (!this._isMobile) {
      this._foamFrameCount++;
      if (this._foamFrameCount % 4 === 0) {
        this._updateFoam(deltaMs * 4);
      }
    }

    // Cloud overlay is static — no per-frame update needed

    // Building placement animations
    this._tickBuildingAnims(deltaMs);

    // Per-building idle animations — skip entirely on mobile (20+ Graphics.clear() per tick)
    if (!this._isMobile) {
      this._bldgEffectFrame++;
      this._tickBldgEffects(deltaMs);
    }

    // Demolish VFX animations
    this._tickDemolishEffects(deltaMs);

    // Animate researcher bot + reveal fog only when crossing into a new cell
    if (this.bot) {
      const crossed = this.bot.update(deltaMs, this.currentIsotopes);
      if (crossed && this.fogLayer) {
        const newCells = this.fogLayer.revealAround(Math.round(this.bot.col), Math.round(this.bot.row), BOT_REVEAL_RADIUS);
        this.fogLayer.redraw();
        // Incrementally add only newly-revealed tiles (instead of full N^2 ground rebuild)
        this.revealGroundCells(newCells);
      }
    }

    // Animate premium harvester drones + trigger screen shake on absorption
    for (const drone of this.harvesterDrones) {
      drone.hasSolarPlant = this.hasSolarPlant;
      drone.update(deltaMs, this.currentIsotopes);
      if (drone.screenShakeRequested) {
        this.harvestFx?.screenShake(2, 280);
      }
    }

    if (!this.hubEffects) return;
    // Skip hub effects entirely on mobile — 7 Graphics.clear() per tick is too heavy for mobile GPU
    if (this._isMobile) return;
    this._hubFrameCount++;
    const eff = this.hubEffects;
    eff.timeMs += deltaMs;
    const t   = eff.timeMs;
    const TH2 = TILE_H / 2;

    // ── Pulsing diamond outlines — all 5 in ONE Graphics.clear() ────────
    eff.diamondGfx.clear();
    for (let i = 0; i < eff.diamondData.length; i++) {
      const d     = eff.diamondData[i];
      const phase = (i / eff.diamondData.length) * Math.PI * 2;
      const a     = 0.10 + 0.07 * Math.sin((t / 2500) * Math.PI * 2 + phase);
      eff.diamondGfx.poly([d.cx, d.cy - d.rH, d.cx + d.rW, d.cy, d.cx, d.cy + d.rH, d.cx - d.rW, d.cy]);
      eff.diamondGfx.stroke({ width: 1.0, color: d.color, alpha: a });
    }

    // ── Rotating orbit arcs (blendMode='add' — must stay separate) ───────
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

    // ── Sparks — all 4 in ONE Graphics.clear() ────────────────────────────
    {
      const topOrb = eff.orbits[4];
      eff.sparkGfx.clear();
      for (const sp of eff.sparks) {
        sp.angle += sp.speed * deltaMs;
        const sx = topOrb.cx + sp.dist * Math.cos(sp.angle);
        const sy = topOrb.cy + sp.dist * Math.sin(sp.angle) * (TILE_H / TILE_W);
        const a  = 0.5 + 0.5 * Math.sin(t / 1200 + sp.phase);
        eff.sparkGfx.rect(sx - 1, sy - 1, 2, 2);
        eff.sparkGfx.fill({ color: 0x88ccff, alpha: a });
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
    const isWaterBldg = BUILDING_DEFS[selectedType]?.requiresTerrain.some(t => isWaterTerrain(t)) ?? false;

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
        // 1-cell buffer: border of footprint must not touch mountain / resource.
        // Water-terrain buildings are allowed to have water neighbours.
        outerBuf: for (let dc = -1; dc <= sW && ok; dc++) {
          for (let dr = -1; dr <= sH && ok; dr++) {
            if (dc >= 0 && dc < sW && dr >= 0 && dr < sH) continue;
            const bc = col + dc; const br = row + dr;
            if (bc < 0 || bc >= N || br < 0 || br >= N) continue;
            if (isMountainFootprint(bc, br, seed, N)) { ok = false; break outerBuf; }
            const bt = classifyCellTerrain(bc, br, seed, wl, N);
            if (!isWaterBldg && isWaterTerrain(bt))   { ok = false; break outerBuf; }
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
    const isWaterBldg = def?.requiresTerrain.some(t => isWaterTerrain(t)) ?? false;

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

    // 1-cell buffer: every cell bordering the footprint must not be mountain / resource.
    // Water-terrain buildings are allowed to have water neighbours.
    for (let dc = -1; dc <= sW; dc++) {
      for (let dr = -1; dr <= sH; dr++) {
        if (dc >= 0 && dc < sW && dr >= 0 && dr < sH) continue; // skip interior
        const bc = col + dc; const br = row + dr;
        if (bc < 0 || bc >= N || br < 0 || br >= N) continue;
        if (isMountainFootprint(bc, br, seed, N)) return false;
        const bt = classifyCellTerrain(bc, br, seed, wl, N);
        if (!isWaterBldg && isWaterTerrain(bt)) return false;
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

    // Demolishing buildings still block their footprint cells
    for (const [, deff] of this.demolishEffects) {
      const eb  = deff.building;
      const eSW = BUILDING_DEFS[eb.type]?.sizeW ?? 1;
      const eSH = BUILDING_DEFS[eb.type]?.sizeH ?? 1;
      if (col <= eb.x + eSW && col + sW >= eb.x && row <= eb.y + eSH && row + sH >= eb.y) return false;
    }

    return true;
  }

  // ─── Building click detection ─────────────────────────────────────────────

  /**
   * Returns the PlacedBuilding whose footprint contains the given world-space point,
   * or null if no building is there. Also checks demolishing buildings.
   */
  public getBuildingAt(worldX: number, worldY: number, buildings: PlacedBuilding[]): PlacedBuilding | null {
    const TW2 = TILE_W / 2;
    const TH2 = TILE_H / 2;
    const col = (worldX / TW2 + worldY / TH2) / 2;
    const row = (worldY / TH2 - worldX / TW2) / 2;

    // Check active buildings first
    for (const b of buildings) {
      const sW = BUILDING_DEFS[b.type]?.sizeW ?? 1;
      const sH = BUILDING_DEFS[b.type]?.sizeH ?? 1;
      if (col >= b.x && col < b.x + sW && row >= b.y && row < b.y + sH) return b;
    }
    // Also check demolishing buildings (they still exist visually)
    for (const [, deff] of this.demolishEffects) {
      const b  = deff.building;
      const sW = BUILDING_DEFS[b.type]?.sizeW ?? 1;
      const sH = BUILDING_DEFS[b.type]?.sizeH ?? 1;
      if (col >= b.x && col < b.x + sW && row >= b.y && row < b.y + sH) return b;
    }
    return null;
  }

  // ─── Drone click detection & control ──────────────────────────────────────

  /** Check if a world-space click lands on a drone or bot. */
  public getClickedDrone(worldX: number, worldY: number):
    { type: 'bot' } | { type: 'harvester'; index: number } | null {
    const TW2 = TILE_W / 2;
    const TH2 = TILE_H / 2;
    const col = (worldX / TW2 + worldY / TH2) / 2;
    const row = (worldY / TH2 - worldX / TW2) / 2;

    // Check researcher bot (within ~1.5 tile radius)
    if (this.bot) {
      const dc = col - this.bot.col;
      const dr = row - this.bot.row;
      if (dc * dc + dr * dr < 2.25) return { type: 'bot' };
    }

    // Check harvester drones
    for (let i = 0; i < this.harvesterDrones.length; i++) {
      const d = this.harvesterDrones[i];
      const dc = col - d.col;
      const dr = row - d.row;
      if (dc * dc + dr * dr < 2.25) return { type: 'harvester', index: i };
    }
    return null;
  }

  public setBotActive(active: boolean): void {
    if (this.bot) this.bot.active = active;
  }

  public getBotActive(): boolean {
    return this.bot?.active ?? false;
  }

  public setDroneActive(index: number, active: boolean): void {
    if (this.harvesterDrones[index]) this.harvesterDrones[index].active = active;
  }

  public getDroneActive(index: number): boolean {
    return this.harvesterDrones[index]?.active ?? false;
  }

  public setDroneResourceFilter(index: number, filter: Set<string>): void {
    if (this.harvesterDrones[index]) this.harvesterDrones[index].resourceFilter = filter;
  }

  public getDroneResourceFilter(index: number): Set<string> {
    return this.harvesterDrones[index]?.resourceFilter ?? new Set(['tree', 'ore', 'vent']);
  }

  // ─── Demolish ─────────────────────────────────────────────────────────────

  /**
   * Begin a 10-second demolish animation for the given building.
   * The building sprite is reparented to demolishLayer and animated.
   * `onComplete` is called after 10 s to trigger state cleanup.
   */
  public startDemolish(building: PlacedBuilding, onComplete: () => void): void {
    const key  = `${building.x},${building.y}`;
    const def  = BUILDING_DEFS[building.type];
    const sW   = def?.sizeW ?? 1;
    const sH   = def?.sizeH ?? 1;
    const TW2  = TILE_W / 2;
    const TH2  = TILE_H / 2;
    // Isometric centre of the building footprint
    const cx   = (building.x + sW / 2 - building.y - sH / 2) * TW2;
    const cy   = (building.x + sW / 2 + building.y + sH / 2) * TH2;

    // Reparent building sprite from buildingLayer → demolishLayer
    const sprite = this.buildingDisplayObjects.get(key) ?? new Graphics();
    if (sprite.parent) {
      sprite.parent.removeChild(sprite);
      this.demolishLayer.addChild(sprite);
    }

    const overlayGfx  = new Graphics(); this.demolishLayer.addChild(overlayGfx);
    const particleGfx = new Graphics(); this.demolishLayer.addChild(particleGfx);
    const progressGfx = new Graphics(); this.demolishLayer.addChild(progressGfx);
    const burnGfx     = new Graphics(); this.demolishLayer.addChild(burnGfx);

    // Stop idle animations for this building
    this._removeBldgEffect(key);

    this.demolishEffects.set(key, {
      building,
      sprite,
      overlayGfx,
      particleGfx,
      progressGfx,
      burnGfx,
      particles: [],
      timeMs: 0,
      cx, cy, sW, sH,
      onComplete,
    });

    // Short screen shake at start
    this.screenShakeMs = 500;
  }

  /**
   * Clean up demolish VFX for a building (call after onComplete fires).
   */
  public stopDemolish(buildingId: string): void {
    for (const [key, deff] of this.demolishEffects) {
      if (deff.building.id === buildingId) {
        if (!deff.sprite.destroyed) deff.sprite.destroy();
        deff.overlayGfx.destroy();
        deff.particleGfx.destroy();
        deff.progressGfx.destroy();
        deff.burnGfx.destroy();
        this.demolishEffects.delete(key);
        this.buildingDisplayObjects.delete(key);
        break;
      }
    }
  }

  /** Per-frame demolish VFX tick — called from update(). */
  private _tickDemolishEffects(deltaMs: number): void {
    const TOTAL = 10_000;
    for (const [, eff] of this.demolishEffects) {
      eff.timeMs += deltaMs;
      const t = eff.timeMs;
      const { cx, cy, sW } = eff;
      const R = sW * (TILE_W / 2) * 0.6;

      // ── Red progress arc (always visible) ─────────────────────────────────
      const progress = Math.min(t / TOTAL, 1);
      eff.progressGfx.clear();
      if (progress < 1) {
        eff.progressGfx.arc(cx, cy - sW * (TILE_H / 2) * 0.8, R * 0.45,
          -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        eff.progressGfx.stroke({ width: 3, color: 0xff2222, alpha: 0.9 });
      }

      // ── Phase 0–2 s: tint sprite darker ───────────────────────────────────
      if (t < 2000) {
        const d = t / 2000;
        if ('tint' in eff.sprite) (eff.sprite as Sprite).tint = _demolishLerpColor(0xffffff, 0x777777, d);
      }

      // ── Emit smoke / fire particles ────────────────────────────────────────
      if (t < 8500) {
        const emitRate = t < 2000 ? 0.12 : t < 5000 ? 0.25 : 0.45;
        if (Math.random() < emitRate) {
          const isFire = t > 2000 && Math.random() < 0.35;
          eff.particles.push({
            x: cx + (Math.random() - 0.5) * R,
            y: cy - sW * (TILE_H / 2) * 0.2,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -0.35 - Math.random() * 0.4,
            alpha: 0.65,
            color: isFire ? 0xff6622 : 0x999aaa,
            size: 3 + Math.random() * 6,
            life: 900 + Math.random() * 800,
            maxLife: 1700,
          });
        }
      }

      // ── Phase 2–8 s: crack overlay ────────────────────────────────────────
      if (t >= 2000 && t < 8000) {
        const crackAlpha = Math.min((t - 2000) / 3000, 1) * 0.75;
        eff.overlayGfx.clear();
        for (let i = 0; i < 8; i++) {
          let px = cx + (_demolishPR(i * 7 + 1) * 2 - 1) * R * 0.8;
          let py = cy - sW * (TILE_H / 2) * 0.6 + _demolishPR(i * 3) * sW * (TILE_H / 2) * 0.7;
          eff.overlayGfx.moveTo(px, py);
          for (let s = 0; s < 4; s++) {
            px += (_demolishPR(i * 11 + s) * 2 - 1) * 14;
            py += (_demolishPR(i * 5 + s) * 2 - 1) * 9;
            eff.overlayGfx.lineTo(px, py);
          }
          eff.overlayGfx.stroke({ width: 1.2, color: 0x111111, alpha: crackAlpha });
        }
      }

      // ── Phase 5–8 s: scale.y compress + white sparks ──────────────────────
      if (t >= 5000 && t < 8000) {
        const p = (t - 5000) / 3000;
        eff.sprite.scale.y = 1.0 - 0.2 * p;
        if (Math.random() < 0.07) {
          eff.particles.push({
            x: cx + (Math.random() - 0.5) * R * 0.7,
            y: cy - sW * (TILE_H / 2) * 0.4 + (Math.random() - 0.5) * sW * (TILE_H / 2) * 0.5,
            vx: (Math.random() - 0.5) * 1.8,
            vy: -1.2 - Math.random() * 0.8,
            alpha: 1,
            color: 0xffffff,
            size: 2,
            life: 140,
            maxLife: 140,
          });
        }
      }

      // ── Phase 8–9.5 s: big burst + building fades out ─────────────────────
      if (t >= 8000 && t < 9500) {
        const p = (t - 8000) / 1500;
        eff.sprite.alpha = 1 - p;
        if (t < 8200) {
          for (let i = 0; i < 22; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 0.5 + Math.random() * 1.3;
            eff.particles.push({
              x: cx, y: cy - sW * (TILE_H / 2) * 0.3,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd * 0.45 - 1.6,
              alpha: 0.9,
              color: Math.random() < 0.5 ? 0x999aaa : 0x554433,
              size: 5 + Math.random() * 9,
              life: 1300 + Math.random() * 700,
              maxLife: 2000,
            });
          }
        }
      }

      // ── Phase 9.5–10 s: burn mark on ground ───────────────────────────────
      if (t >= 9500) {
        eff.sprite.alpha = 0;
        eff.overlayGfx.clear();
        const ba = Math.min((t - 9500) / 300, 1) * Math.max(0, 1 - (t - 9700) / 300);
        eff.burnGfx.clear();
        eff.burnGfx.ellipse(cx, cy, R * 0.85, R * 0.42);
        eff.burnGfx.fill({ color: 0x0a0804, alpha: ba * 0.8 });
        eff.burnGfx.ellipse(cx, cy, R * 0.85, R * 0.42);
        eff.burnGfx.stroke({ width: 2.5, color: 0x332211, alpha: ba * 0.5 });
      }

      // ── Tick particles ────────────────────────────────────────────────────
      eff.particleGfx.clear();
      for (let i = eff.particles.length - 1; i >= 0; i--) {
        const p = eff.particles[i];
        p.x  += p.vx * deltaMs;
        p.y  += p.vy * deltaMs;
        p.vy += 0.00028 * deltaMs;   // gravity
        p.life -= deltaMs;
        if (p.life <= 0) { eff.particles.splice(i, 1); continue; }
        const a = p.alpha * (p.life / p.maxLife) * 0.8;
        eff.particleGfx.circle(p.x, p.y, p.size * (p.life / p.maxLife));
        eff.particleGfx.fill({ color: p.color, alpha: a });
      }

      // ── Complete ──────────────────────────────────────────────────────────
      if (t >= 10_000) {
        eff.burnGfx.clear();
        eff.onComplete();
      }
    }
  }

  /** Deterministic terrain for a cell. */
  public terrainAt(col: number, row: number): string {
    return classifyCellTerrain(col, row, this.planet.seed, this.waterLevel, this.gridSize);
  }

  // ─── Isotope fuel for drones (public API) ────────────────────────────────

  /** Update the current isotope count and solar plant availability. */
  public setIsotopeState(isotopes: number, hasSolar: boolean): void {
    this.currentIsotopes = isotopes;
    this.hasSolarPlant   = hasSolar;
  }

  /** Register a callback that attempts to consume isotopes. Returns true if enough. */
  public setConsumeIsotopesCallback(cb: (amount: number) => boolean): void {
    this.onConsumeIsotopes = cb;
    // Wire it into existing drones
    if (this.bot) {
      this.bot.onConsumeIsotopes = (amount) => this.onConsumeIsotopes ? this.onConsumeIsotopes(amount) : false;
    }
    for (const drone of this.harvesterDrones) {
      drone.onConsumeIsotopes = (amount) => this.onConsumeIsotopes ? this.onConsumeIsotopes(amount) : false;
    }
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
    this._replaceGroundCell(col, row);
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
    this._replaceGroundCell(col, row);
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
    this._replaceGroundCell(col, row);
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
      // Regrowth changes many scattered cells — full redraw is fine here
      // (happens once on init, not per-frame)
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
   * The dot drifts upward and fades out over ~1.2 s.
   * Driven by update() to avoid spawning a separate requestAnimationFrame loop.
   */
  public showFloatingText(
    col: number,
    row: number,
    text: string,
    color: number = 0x44ff88,
  ): void {
    const { x, y } = gridToScreen(col, row);
    const cy = y + TILE_H / 2 - 20;  // start above tile
    const g  = new Graphics();
    this.effectLayer.addChild(g);
    this._floatAnims.push({ g, x, cy, color, elapsedMs: 0 });
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

  /** Destroy and remove idle animation for a single building key. */
  private _removeBldgEffect(key: string): void {
    const eff = this.bldgEffects.get(key);
    if (!eff) return;
    for (const g  of eff.gs)      g.destroy();
    for (const sp of eff.sprites) sp.destroy();
    this.bldgEffects.delete(key);
  }

  private _createBldgEffect(b: PlacedBuilding): void {
    // Skip idle effects entirely on mobile — saves 3-6 Graphics objects per building
    if (this._isMobile) return;
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

    } else if (b.type === 'solar_plant') {
      // Glow overlay sprite — pulsing energy-pulse animation (blendMode: 'add')
      if (this.solarLightTex && this.bldgTextures['solar_plant']) {
        const botRight = gridToScreen(b.x + sW, b.y + sH);
        const baseTex  = this.bldgTextures['solar_plant'];
        const sp = new Sprite(this.solarLightTex);
        sp.anchor.set(0.5, 1.0);
        sp.scale.set((sW * TILE_W) / baseTex.width);
        sp.position.set(botRight.x, botRight.y);
        sp.blendMode = 'add';
        sp.alpha = 0.3;
        L.addChild(sp);
        sprites.push(sp);
      }
      // Random phase so multiple solar plants don't pulse in sync
      extra['phase'] = Math.random() * 3000;

    } else if (b.type === 'wind_generator') {
      // gs[0] = blue energy streams (rising from below to base center, additive blend)
      const energyGfx = new Graphics(); energyGfx.blendMode = 'add'; L.addChild(energyGfx); gs.push(energyGfx);

      // Single rotor sprite — sway + levitation bob only, NO rotation
      if (this.windRotorTex && this.bldgTextures['wind_generator']) {
        const baseTex   = this.bldgTextures['wind_generator'];
        const baseScale = (sW * TILE_W) / baseTex.width;
        const HUB_X = 124, HUB_Y = 48;
        const rx = botRight.x + (HUB_X - baseTex.width  * 0.5) * baseScale;
        const ry = botRight.y + (HUB_Y - baseTex.height * 1.0) * baseScale;
        const sp = new Sprite(this.windRotorTex);
        sp.pivot.set(HUB_X, HUB_Y);
        sp.scale.set(baseScale, baseScale * 0.5); // isometric squash
        sp.position.set(rx, ry);
        sp.alpha = 1.0;
        L.addChild(sp);
        sprites.push(sp);
        extra['hubX'] = rx;
        extra['hubY'] = ry;
      }
      extra['swayPhase']  = Math.random() * Math.PI * 2; // desync multiple generators
      extra['bobPhase']   = Math.random() * Math.PI * 2;
      extra['streamSeed'] = Math.random() * 100;         // unique speed chaos per building

    } else if (b.type === 'battery_station') {
      // Glow overlay sprite — green charge indicators breathing animation (blendMode: 'add')
      if (this.batteryGlowTex && this.bldgTextures['battery_station']) {
        const botRight = gridToScreen(b.x + sW, b.y + sH);
        const baseTex  = this.bldgTextures['battery_station'];
        const sp = new Sprite(this.batteryGlowTex);
        sp.anchor.set(0.5, 1.0);
        sp.scale.set((sW * TILE_W) / baseTex.width);
        sp.position.set(botRight.x, botRight.y);
        sp.blendMode = 'add';
        sp.alpha = 0.4;
        L.addChild(sp);
        sprites.push(sp);
      }
      // Random phase so multiple battery stations breathe independently
      extra['phase'] = Math.random() * 4000;

    } else if (b.type === 'thermal_generator') {
      // gs[0] = spinning lava vortex inside a 10px oval (additive blend)
      const g = new Graphics(); g.blendMode = 'add'; L.addChild(g); gs.push(g);
      // Pre-seed 10 chaotic particles with independent speeds / phases / sizes
      const N = 10;
      for (let i = 0; i < N; i++) {
        // ~30% counter-rotation for chaos
        extra[`p${i}_spd`] = (0.0018 + Math.random() * 0.0028) * (Math.random() < 0.3 ? -1 : 1);
        extra[`p${i}_ph`]  = Math.random() * Math.PI * 2;  // initial angle offset
        extra[`p${i}_r`]   = 0.22 + Math.random() * 0.76; // normalized orbit radius (0.22–0.98)
        extra[`p${i}_sf`]  = 0.0022 + Math.random() * 0.0048; // size oscillation frequency
        extra[`p${i}_sp`]  = Math.random() * Math.PI * 2;  // size phase
      }

    } else if (b.type === 'mine') {
      // gs[0] = vortex streaks (continuous upward air-displacement spirals)
      const vortexGfx = new Graphics(); L.addChild(vortexGfx); gs.push(vortexGfx);
      // gs[1] = laser flash (red beam, blendMode ADD, brief apex strike)
      const laserGfx = new Graphics(); laserGfx.blendMode = 'add'; L.addChild(laserGfx); gs.push(laserGfx);
      // gs[2] = impact sparks (one-shot burst on landing)
      const sparksGfx = new Graphics(); L.addChild(sparksGfx); gs.push(sparksGfx);

      if (this.mineDrillTex && this.bldgTextures['mine']) {
        const baseTex   = this.bldgTextures['mine'];
        const baseScale = (sW * TILE_W) / baseTex.width;
        const sp = new Sprite(this.mineDrillTex);
        sp.anchor.set(0.5, 1.0);
        sp.scale.set(baseScale);
        sp.position.set(botRight.x, botRight.y);
        sp.alpha = 0.4;
        L.addChild(sp);
        sprites.push(sp);
      }

      // Phase: 0=rise 1=laser 2=drop 3=impact 4=wait
      extra['drillPhase'] = 0;
      extra['phaseMs']    = 0;
      extra['drillBaseY'] = botRight.y; // sprite anchor Y at rest position
      extra['shakeMs']    = 0;

    } else if (b.type === 'fusion_reactor') {
      // gs[0] = steam puffs from side vents
      const steamGfx    = new Graphics(); L.addChild(steamGfx);    gs.push(steamGfx);
      // gs[1] = purple orbital streams at reactor core (additive blend)
      const purpleGfx   = new Graphics(); purpleGfx.blendMode   = 'add'; L.addChild(purpleGfx);   gs.push(purpleGfx);
      // gs[2] = purple lightning bolts shooting from core (additive blend)
      const lightningGfx = new Graphics(); lightningGfx.blendMode = 'add'; L.addChild(lightningGfx); gs.push(lightningGfx);

      const baseTex = this.bldgTextures['fusion_reactor'];
      const scale   = baseTex ? (sW * TILE_W) / baseTex.width : 0.9375;
      const bx = botRight.x, by = botRight.y;

      // Steam vent positions (image 256×256, sprite anchor=bottom-center at botRight)
      extra['sv0x'] = bx + (65  - 128) * scale;  extra['sv0y'] = by - (256 - 155) * scale;
      extra['sv1x'] = bx + (192 - 128) * scale;  extra['sv1y'] = by - (256 - 155) * scale;
      extra['sv2x'] = bx + (95  - 128) * scale;  extra['sv2y'] = by - (256 - 205) * scale;
      extra['sv3x'] = bx + (160 - 128) * scale;  extra['sv3y'] = by - (256 - 205) * scale;
      // Exit directions per vent (screen dx/dy per ms) — diagonally outward from each face
      extra['sv0dx'] = -0.035;  extra['sv0dy'] =  0.018;  // left side → exit left-forward
      extra['sv1dx'] = +0.035;  extra['sv1dy'] =  0.018;  // right side → exit right-forward
      extra['sv2dx'] = -0.018;  extra['sv2dy'] =  0.033;  // front-left → exit forward-left
      extra['sv3dx'] = +0.018;  extra['sv3dy'] =  0.033;  // front-right → exit forward-right

      // Purple reactor core center ~(128,65) in the image
      extra['pcx'] = bx;
      extra['pcy'] = by - (256 - 65) * scale;
      extra['pcr'] = 25 * scale;

      // Steam vent timers — 4 vents with independent random intervals
      for (let v = 0; v < 4; v++) {
        extra[`sv${v}_next`]   = 800 + Math.random() * 3500;
        extra[`sv${v}_active`] = 0;
      }
      // Steam particle pool: 6 particles per vent
      for (let v = 0; v < 4; v++) {
        for (let p = 0; p < 6; p++) {
          extra[`sv${v}_p${p}_life`] = 0;
          extra[`sv${v}_p${p}_x`]   = 0;
          extra[`sv${v}_p${p}_y`]   = 0;
        }
      }
      // Purple streams are time-based (no stored state needed)
      // Lightning slots: 3 independent bolts firing randomly
      for (let i = 0; i < 3; i++) {
        extra[`lt${i}_next`]   = 300 + Math.random() * 1000;
        extra[`lt${i}_active`] = 0;
        extra[`lt${i}_age`]    = 0;
      }

    } else if (b.type === 'water_extractor') {
      // gs[0] = frost crystals / steam particles / glints
      const fxGfx = new Graphics(); L.addChild(fxGfx); gs.push(fxGfx);

      // sprites[0] = frost overlay (water_extractor_on.png), alpha animated
      if (this.waterFrostTex && this.bldgTextures['water_extractor']) {
        const baseTex  = this.bldgTextures['water_extractor'];
        const baseScale = (sW * TILE_W) / baseTex.width;
        const sp = new Sprite(this.waterFrostTex);
        sp.anchor.set(0.5, 1.0);
        sp.scale.set(baseScale);
        sp.position.set(botRight.x, botRight.y);
        sp.alpha = 0;
        L.addChild(sp);
        sprites.push(sp);
      }

      // Phase 0=WATER 1=FREEZING 2=FROZEN 3=THAWING
      extra['wxPhase'] = 0;
      extra['wxPhMs']  = Math.random() * 2500; // stagger start

      // Cylinder top emit positions (image ~256×256, anchor=bottom-center at botRight)
      const baseTex = this.bldgTextures['water_extractor'];
      const sc = baseTex ? (sW * TILE_W) / baseTex.width : 0.9375;
      extra['cyl0x'] = botRight.x + (80  - 128) * sc;  extra['cyl0y'] = botRight.y - (256 - 55) * sc;
      extra['cyl1x'] = botRight.x;                      extra['cyl1y'] = botRight.y - (256 - 40) * sc;
      extra['cyl2x'] = botRight.x + (178 - 128) * sc;  extra['cyl2y'] = botRight.y - (256 - 55) * sc;
      // Side vent positions — left and right faces of the building
      extra['sx0x'] = botRight.x + (22  - 128) * sc;   extra['sx0y'] = botRight.y - (256 - 115) * sc;
      extra['sx1x'] = botRight.x + (234 - 128) * sc;   extra['sx1y'] = botRight.y - (256 - 115) * sc;

      // Particle pools — reused for bubbles (phase 0), frost (phase 1), steam (phase 3)
      for (let p = 0; p < 10; p++) {
        extra[`fp${p}_x`] = 0; extra[`fp${p}_y`] = 0;
        extra[`fp${p}_vx`] = 0; extra[`fp${p}_vy`] = 0;
        extra[`fp${p}_life`] = 0;
      }
      // Glint pool for frozen phase
      for (let p = 0; p < 5; p++) {
        extra[`gl${p}_x`] = 0; extra[`gl${p}_y`] = 0;
        extra[`gl${p}_age`]  = 9999;
        extra[`gl${p}_next`] = 200 + Math.random() * 800;
      }

    } else if (b.type === 'atmo_extractor') {
      // gs[0] = smoke puffs from 3 top pipes
      const smokeGfx = new Graphics(); L.addChild(smokeGfx); gs.push(smokeGfx);

      // Pipe emit positions — based on 256×256 image, anchor bottom-center at botRight
      const tex = this.bldgTextures['atmo_extractor'];
      const sc  = tex ? (sW * TILE_W) / tex.width : 1.0;
      extra['p0x'] = botRight.x + (100 - 128) * sc;  extra['p0y'] = botRight.y - (256 - 68) * sc - 20;
      extra['p1x'] = botRight.x + (128 - 128) * sc;  extra['p1y'] = botRight.y - (256 - 52) * sc - 20;
      extra['p2x'] = botRight.x + (194 - 128) * sc;  extra['p2y'] = botRight.y - (256 - 68) * sc - 20;

      // 15 smoke particles (5 per pipe), pooled
      for (let p = 0; p < 15; p++) {
        extra[`sm${p}_x`] = 0; extra[`sm${p}_y`] = 0;
        extra[`sm${p}_vx`] = 0; extra[`sm${p}_vy`] = 0;
        extra[`sm${p}_ox`] = 0; extra[`sm${p}_oy`] = 0;
        extra[`sm${p}_life`] = 0;
      }

    } else if (b.type === 'deep_drill') {
      // gs[0] = glow pulse, gs[1] = sparks (additive), gs[2] = pebbles
      const glowGfx   = new Graphics(); L.addChild(glowGfx);   gs.push(glowGfx);
      const sparkGfx  = new Graphics(); L.addChild(sparkGfx);  gs.push(sparkGfx);
      sparkGfx.blendMode = 'add';
      const pebbleGfx = new Graphics(); L.addChild(pebbleGfx); gs.push(pebbleGfx);

      // Red core position: center x, ~56px from bottom in 256px image
      const tex = this.bldgTextures['deep_drill'];
      const sc  = tex ? (sW * TILE_W) / tex.width : 1.0;
      extra['corex'] = botRight.x + (128 - 128) * sc;
      extra['corey'] = botRight.y - 56 * sc;

      // 20 sparks, 8 pebbles — pooled
      for (let p = 0; p < 20; p++) {
        extra[`sp${p}_x`] = 0; extra[`sp${p}_y`] = 0;
        extra[`sp${p}_vx`] = 0; extra[`sp${p}_vy`] = 0;
        extra[`sp${p}_life`] = 0;
      }
      for (let p = 0; p < 8; p++) {
        extra[`pb${p}_x`] = 0; extra[`pb${p}_y`] = 0;
        extra[`pb${p}_vx`] = 0; extra[`pb${p}_vy`] = 0;
        extra[`pb${p}_life`] = 0;
      }
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

      } else if (eff.type === 'solar_plant') {
        // ── Pulsing glow overlay — alpha 0.3→1.0→0.3, 3s sine cycle ─────
        if (eff.sprites.length > 0) {
          const PERIOD = 3000;
          const phase  = eff.extra['phase'] ?? 0;
          const alpha  = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(((t + phase) / PERIOD) * Math.PI * 2));
          eff.sprites[0].alpha = alpha;
        }

      } else if (eff.type === 'wind_generator') {
        // ── Sway + levitation bob ─────────────────────────────────────────
        const swayX = Math.sin((t / 4500) * Math.PI * 2 + (eff.extra['swayPhase'] ?? 0)) * 4;
        const bobY  = Math.sin((t / 3200) * Math.PI * 2 + (eff.extra['bobPhase']  ?? 0)) * 3;

        // Current fan position (moves with sway + bob)
        const fanX = (eff.extra['hubX'] ?? cx) + swayX;
        const fanY = (eff.extra['hubY'] ?? cy) + bobY;

        // Building base center (footprint center, minimal sway follow)
        const baseX = cx + swayX * 0.15;
        const baseY = cy + sW * TILE_H * 0.35;

        // Apply to rotor sprite (NO rotation)
        if (eff.sprites.length >= 1) {
          eff.sprites[0].x = fanX;
          eff.sprites[0].y = fanY;
        }

        if (eff.gs.length >= 1) {
          const eg = eff.gs[0];
          eg.clear();

          // ── 16 streams rising from below → converge at CONV (fan + 3px down) ──
          const convX = fanX;
          const convY = fanY + 8; // collector center lowered 8px (3+5)

          const NUM_STREAMS = 16;
          const SPREAD_X    = sW * TILE_W * 0.38;
          const BELOW_Y     = sW * TILE_H * 0.15;
          const BASE_PERIOD = 1600;
          const TRAIL_LEN   = 0.32;
          const N_SEGS      = 10;

          // Per-stream speed: deterministic chaos, period varies ±100% (800–3200ms)
          const sSeed = eff.extra['streamSeed'] ?? 0;

          for (let i = 0; i < NUM_STREAMS; i++) {
            // Unique speed for each stream: hash → 800–3200ms range
            const h      = Math.abs(Math.sin(i * 127.1 + sSeed * 3.7));
            const period = BASE_PERIOD * (0.5 + h * 1.5); // 800 … 3200 ms

            const frac = i / (NUM_STREAMS - 1) - 0.5;
            const ox   = convX + frac * SPREAD_X * 2;
            const oy   = convY + BELOW_Y + Math.abs(frac) * BELOW_Y * 0.5;

            const progress   = ((t / period + i / NUM_STREAMS) % 1);
            const trailEnd   = progress;
            const trailStart = Math.max(0, trailEnd - TRAIL_LEN);

            for (let s = 0; s < N_SEGS; s++) {
              const p1 = trailStart + (s       / N_SEGS) * (trailEnd - trailStart);
              const p2 = trailStart + ((s + 1) / N_SEGS) * (trailEnd - trailStart);
              const x1 = ox + (convX - ox) * p1;  const y1 = oy + (convY - oy) * p1;
              const x2 = ox + (convX - ox) * p2;  const y2 = oy + (convY - oy) * p2;
              const segFrac = (s + 1) / N_SEGS;
              const arrival = Math.max(0, (trailEnd - 0.88) / 0.12);
              eg.moveTo(x1, y1); eg.lineTo(x2, y2);
              eg.stroke({ width: 1.2 + segFrac * 0.8, color: 0x3399ff,
                alpha: Math.max(segFrac * 0.45 * (1 - arrival), 0) });
            }
            const arrDot = Math.max(0, (trailEnd - 0.85) / 0.15);
            if (trailEnd > 0.03 && arrDot < 1) {
              eg.circle(ox + (convX - ox) * trailEnd, oy + (convY - oy) * trailEnd, 1.8);
              eg.fill({ color: 0x88ddff, alpha: (1 - arrDot) * 0.75 });
            }
          }

          // Glow at collector center (convX/convY)
          const gp = 0.5 + 0.5 * Math.sin((t / 650) * Math.PI * 2);
          eg.circle(convX, convY, 2.5 + gp * 2.5);
          eg.fill({ color: 0xaaddff, alpha: 0.45 + gp * 0.35 });

          // ── Electric column: FAN → MID only (half length) ───────────────
          // Column starts at convY (collector center), ends halfway to base
          const midX = convX + (baseX - convX) * 0.5;
          const midY = convY + (baseY - convY) * 0.5;

          // Dim continuous base line (conv → mid only)
          eg.moveTo(convX, convY);
          eg.lineTo(midX, midY);
          eg.stroke({ width: 1.2, color: 0x55aaff, alpha: 0.18 });

          // 3 overlapping energy pulses flowing down the half-column
          const COL_PERIOD  = 420;
          const PULSE_LEN   = 0.30;
          const PULSE_SEGS  = 8;
          for (let p = 0; p < 3; p++) {
            const head = ((t / COL_PERIOD + p / 3) % 1);
            const tail = Math.max(0, head - PULSE_LEN);
            for (let s = 0; s < PULSE_SEGS; s++) {
              const p1 = tail + (s       / PULSE_SEGS) * (head - tail);
              const p2 = tail + ((s + 1) / PULSE_SEGS) * (head - tail);
              const x1 = convX + (midX - convX) * p1;
              const y1 = convY + (midY - convY) * p1;
              const x2 = convX + (midX - convX) * p2;
              const y2 = convY + (midY - convY) * p2;
              const sf = (s + 1) / PULSE_SEGS;
              eg.moveTo(x1, y1); eg.lineTo(x2, y2);
              eg.stroke({ width: 1.0 + sf * 1.0, color: 0x88ccff, alpha: sf * 0.60 });
            }
          }

          // ── Spread at column tip: energy fans out a few px to each side ──
          // 3 short diverging rays from midY: left, centre, right
          const SPREAD = 4; // px each side
          const RAY_LEN = 3;
          const spreadAlpha = 0.28 + 0.18 * Math.sin((t / COL_PERIOD) * Math.PI * 2);
          for (let r = -1; r <= 1; r++) {
            const ex = midX + r * SPREAD;
            const ey = midY + RAY_LEN;
            eg.moveTo(midX, midY);
            eg.lineTo(ex, ey);
            // fade to 0 at the tip — centre ray slightly brighter
            eg.stroke({ width: 1.0, color: 0x88ccff,
              alpha: spreadAlpha * (1 - Math.abs(r) * 0.35) });
          }
        }

      } else if (eff.type === 'battery_station') {
        // ── Breathing glow — green charge indicators, alpha 0.4→1.0, 2000ms half-cycle ─────
        if (eff.sprites.length > 0) {
          const PERIOD = 4000; // full cycle = 4000ms → half-cycle = 2000ms
          const phase  = eff.extra['phase'] ?? 0;
          const alpha  = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(((t + phase) / PERIOD) * Math.PI * 2));
          eff.sprites[0].alpha = alpha;
        }

      } else if (eff.type === 'thermal_generator') {
        // ── Spinning lava vortex — 15×6 px oval, +10 px higher, 7 px glow ─────────────────
        const glowCY = cy - TILE_H * 0.82 - 10; // 10 px higher
        const OVAL_A = 15; // semi-major
        const OVAL_B = 6;  // semi-minor

        if (eff.gs.length > 0) {
          eff.gs[0].clear();

          // ── Radial glow rim: 4 layers fading within 7 px from oval edge ────────────────
          const GLOW_N = 20;
          const rimLayers: [number, number, number][] = [
            [1.5, 1.5, 0.16],
            [3.0, 3.0, 0.10],
            [5.0, 5.0, 0.05],
            [7.0, 7.0, 0.020],
          ];
          for (const [eA, eB, rimA] of rimLayers) {
            for (let si = 0; si < GLOW_N; si++) {
              const a = (si / GLOW_N) * Math.PI * 2;
              eff.gs[0].circle(cx + Math.cos(a) * (OVAL_A + eA), glowCY + Math.sin(a) * (OVAL_B + eB), 1.4);
              eff.gs[0].fill({ color: 0xff2200, alpha: rimA });
            }
          }

          // Faint dashed oval outline
          const ODOTS = 16;
          for (let si = 0; si < ODOTS; si++) {
            if (si % 2 !== 0) continue;
            const a = (si / ODOTS) * Math.PI * 2;
            eff.gs[0].circle(cx + Math.cos(a) * OVAL_A, glowCY + Math.sin(a) * OVAL_B, 0.5);
            eff.gs[0].fill({ color: 0xff2200, alpha: 0.22 });
          }

          // 10 chaotic particles orbiting inside the oval
          for (let i = 0; i < 10; i++) {
            const spd = eff.extra[`p${i}_spd`] as number;
            const ph  = eff.extra[`p${i}_ph`]  as number;
            const rN  = eff.extra[`p${i}_r`]   as number;
            const sf  = eff.extra[`p${i}_sf`]  as number;
            const sp  = eff.extra[`p${i}_sp`]  as number;

            const angle = t * spd + ph;
            const rr    = rN * (0.58 + 0.42 * Math.sin(t * 0.0021 + sp));
            const ex    = Math.cos(angle) * OVAL_A * rr;
            const ey    = Math.sin(angle) * OVAL_B * rr;
            const dotR  = 0.5 + 2.0 * (0.5 + 0.5 * Math.sin(t * sf + sp));
            const heat  = 1 - rr;
            const color = heat > 0.45 ? 0xff7733 : heat > 0.22 ? 0xff4411 : 0xff1100;
            const alpha = 0.42 + 0.52 * (1 - rr * 0.35);

            eff.gs[0].circle(cx + ex, glowCY + ey, dotR * 2.2);
            eff.gs[0].fill({ color, alpha: alpha * 0.22 });
            eff.gs[0].circle(cx + ex, glowCY + ey, dotR);
            eff.gs[0].fill({ color: 0xff9955, alpha: alpha * 0.92 });
          }
        }

      } else if (eff.type === 'mine') {
        // ── Mine drill: Rise → Laser → Drop → Impact → Wait → loop ───────
        const drillSprite = eff.sprites[0];
        const vortexGfx   = eff.gs[0];
        const laserGfx    = eff.gs[1];
        const sparksGfx   = eff.gs[2];
        if (!drillSprite || !vortexGfx || !laserGfx || !sparksGfx) return;

        const baseY  = eff.extra['drillBaseY'];
        const riseH  = TILE_H;  // 80px drill travel distance
        let   phase  = eff.extra['drillPhase'];
        let   phMs   = (eff.extra['phaseMs'] ?? 0) + deltaMs;

        // Fixed anchor: bottom point of the laser never moves (raised 120px above baseY)
        const laserBottomY = baseY - 120;
        const laserBottomX = drillSprite.x;

        // ── State machine ─────────────────────────────────────────────────
        if (phase === 0) {
          // Rise: 3000ms linear ascent — drill fully opaque, continuous beam
          const p = Math.min(1, phMs / 3000);
          drillSprite.y     = baseY - p * riseH;
          drillSprite.alpha = 1;

          // Continuous beam: bottom fixed at laserBottomY, top follows drill (raised 130px above sprite)
          laserGfx.clear();
          if (p > 0.05) {
            const beamTopY = drillSprite.y - 130;
            const beamAlpha = Math.min(1, p * 2);
            // Only draw if drill is above beam bottom
            if (beamTopY < laserBottomY) {
              laserGfx.moveTo(laserBottomX, beamTopY); laserGfx.lineTo(laserBottomX, laserBottomY);
              laserGfx.stroke({ color: 0xff1100, width: 8, alpha: beamAlpha * 0.15 });
              laserGfx.moveTo(laserBottomX, beamTopY); laserGfx.lineTo(laserBottomX, laserBottomY);
              laserGfx.stroke({ color: 0xff5533, width: 2, alpha: beamAlpha * 0.7 });
            }
          }
          if (p >= 1) { phase = 1; phMs = 0; }

        } else if (phase === 1) {
          // Laser flash: 120ms bright flash before drop
          const p     = Math.min(1, phMs / 120);
          const alpha = 1.0 - p;
          const dY    = drillSprite.y - 130;
          laserGfx.clear();
          if (dY < laserBottomY) {
            laserGfx.moveTo(laserBottomX, dY); laserGfx.lineTo(laserBottomX, laserBottomY);
            laserGfx.stroke({ color: 0xff1100, width: 10, alpha: alpha * 0.35 });
            laserGfx.moveTo(laserBottomX, dY); laserGfx.lineTo(laserBottomX, laserBottomY);
            laserGfx.stroke({ color: 0xff5533, width: 3, alpha });
          }
          if (p >= 1) { laserGfx.clear(); phase = 2; phMs = 0; }

        } else if (phase === 2) {
          // Drop: 130ms cubic ease-in — abrupt downward strike
          const p    = Math.min(1, phMs / 130);
          const ease = p * p * p; // power3.in
          drillSprite.y     = (baseY - riseH) + ease * riseH;
          drillSprite.alpha = 1;
          if (p >= 1) {
            drillSprite.y     = baseY;
            // Spawn 12 spark particles at laser bottom point
            for (let i = 0; i < 12; i++) {
              const angle = (i / 12) * Math.PI * 2;
              const speed = 0.05 + Math.random() * 0.08;
              eff.extra[`spk${i}_x`]    = laserBottomX;
              eff.extra[`spk${i}_y`]    = laserBottomY;
              eff.extra[`spk${i}_vx`]   = Math.cos(angle) * speed;
              eff.extra[`spk${i}_vy`]   = Math.sin(angle) * speed - 0.07;
              eff.extra[`spk${i}_life`] = 1;
            }
            // Spawn 8 diagonal sparks — fly up-left and up-right
            for (let i = 0; i < 8; i++) {
              const side = (i % 2 === 0) ? -1 : 1;
              const spreadAngle = -Math.PI / 2 + side * (0.4 + Math.random() * 0.6);
              const spd = 0.12 + Math.random() * 0.16;
              eff.extra[`dspk${i}_x`]    = laserBottomX;
              eff.extra[`dspk${i}_y`]    = laserBottomY;
              eff.extra[`dspk${i}_vx`]   = Math.cos(spreadAngle) * spd;
              eff.extra[`dspk${i}_vy`]   = Math.sin(spreadAngle) * spd;
              eff.extra[`dspk${i}_life`] = 1;
            }
            eff.extra['shakeMs'] = 0;
            phase = 3; phMs = 0;
          }

        } else if (phase === 3) {
          // Impact: 500ms — red flash + sparks + shake mine sprite
          sparksGfx.clear();
          const shake = eff.extra['shakeMs'] + deltaMs;
          eff.extra['shakeMs'] = shake;
          if (shake < 100) {
            const amp = 1.5 * (1 - shake / 100);
            drillSprite.x = laserBottomX + (Math.random() * 2 - 1) * amp;
            drillSprite.y = baseY + (Math.random() * 2 - 1) * amp;
          } else {
            drillSprite.x = laserBottomX;
            drillSprite.y = baseY;
          }
          // Red impact flash — bright glow at laser bottom, fades over 200ms
          const flashP = Math.min(1, phMs / 200);
          const flashAlpha = (1 - flashP) * 0.8;
          if (flashAlpha > 0.01) {
            sparksGfx.circle(laserBottomX, laserBottomY, 18 * (1 - flashP * 0.5));
            sparksGfx.fill({ color: 0xff2200, alpha: flashAlpha * 0.4 });
            sparksGfx.circle(laserBottomX, laserBottomY, 8);
            sparksGfx.fill({ color: 0xff4422, alpha: flashAlpha });
          }
          // Tick + draw center sparks
          for (let i = 0; i < 12; i++) {
            const life = eff.extra[`spk${i}_life`];
            if (life <= 0) continue;
            eff.extra[`spk${i}_x`]    += eff.extra[`spk${i}_vx`] * deltaMs;
            eff.extra[`spk${i}_y`]    += eff.extra[`spk${i}_vy`] * deltaMs;
            eff.extra[`spk${i}_vy`]   += 0.00009 * deltaMs; // gravity
            eff.extra[`spk${i}_life`] -= 0.0022 * deltaMs;
            const newLife = eff.extra[`spk${i}_life`];
            if (newLife <= 0) continue;
            const color = (i % 3 === 0) ? 0xff8844 : (i % 3 === 1) ? 0xff4422 : 0xffaa66;
            sparksGfx.circle(eff.extra[`spk${i}_x`], eff.extra[`spk${i}_y`], 1.2 + newLife * 1.8);
            sparksGfx.fill({ color, alpha: Math.max(0, newLife * 0.9) });
          }
          // Diagonal sparks — fly up-left and up-right
          for (let i = 0; i < 8; i++) {
            const life = eff.extra[`dspk${i}_life`] ?? 0;
            if (life <= 0) continue;
            eff.extra[`dspk${i}_x`]    += eff.extra[`dspk${i}_vx`] * deltaMs;
            eff.extra[`dspk${i}_y`]    += eff.extra[`dspk${i}_vy`] * deltaMs;
            eff.extra[`dspk${i}_vy`]   += 0.00003 * deltaMs;
            eff.extra[`dspk${i}_life`] -= 0.0012 * deltaMs;
            const dl = eff.extra[`dspk${i}_life`];
            if (dl <= 0) continue;
            const dc = (i % 2 === 0) ? 0xff6633 : 0xff3311;
            sparksGfx.circle(eff.extra[`dspk${i}_x`], eff.extra[`dspk${i}_y`], 0.8 + dl * 1.2);
            sparksGfx.fill({ color: dc, alpha: Math.max(0, dl * 0.85) });
          }
          if (phMs >= 500) { sparksGfx.clear(); phase = 4; phMs = 0; }

        } else {
          // Wait: 500ms pause before next cycle
          drillSprite.alpha = 1;
          if (phMs >= 500) { phase = 0; phMs = 0; }
        }

        eff.extra['drillPhase'] = phase;
        eff.extra['phaseMs']    = phMs;

        // ── Vortex: thin white/gray spiraling streaks always around drill ─
        vortexGfx.clear();
        const N_VTX = 8;
        for (let i = 0; i < N_VTX; i++) {
          const baseAngle = ((t / 2200) * Math.PI * 2 + (i / N_VTX) * Math.PI * 2) % (Math.PI * 2);
          const dist = 5 + 3 * Math.sin(baseAngle * 1.5 + t / 600);
          const sx   = drillSprite.x + Math.cos(baseAngle) * dist;
          const sy   = drillSprite.y + Math.sin(baseAngle) * dist * 0.45;
          const ex_v = drillSprite.x + Math.cos(baseAngle + 0.55) * dist * 0.5;
          const ey_v = drillSprite.y - 9 + Math.sin(baseAngle + 0.55) * dist * 0.22;
          const va   = 0.07 + 0.09 * (0.5 + 0.5 * Math.sin((t / 700 + i) * Math.PI));
          vortexGfx.moveTo(sx, sy);
          vortexGfx.lineTo(ex_v, ey_v);
          vortexGfx.stroke({ color: 0xccddee, width: 1.0, alpha: va });
        }

      } else if (eff.type === 'fusion_reactor') {
        // ── Fusion reactor: steam vents + purple core microparticles ──────
        const steamGfx  = eff.gs[0];
        const purpleGfx = eff.gs[1];
        if (!steamGfx || !purpleGfx) return;

        steamGfx.clear();
        purpleGfx.clear();

        // ── Steam: 4 vents, exit diagonally outward ───────────────────────
        for (let v = 0; v < 4; v++) {
          eff.extra[`sv${v}_next`] -= deltaMs;
          if (!eff.extra[`sv${v}_active`] && eff.extra[`sv${v}_next`] <= 0) {
            eff.extra[`sv${v}_active`] = 1;
            eff.extra[`sv${v}_next`]   = 1200 + Math.random() * 3000;
            const ox = eff.extra[`sv${v}x`];
            const oy = eff.extra[`sv${v}y`];
            // Perpendicular spread direction: horizontal for left/right vents, vertical for front vents
            for (let p = 0; p < 6; p++) {
              const spread = (Math.random() - 0.5) * 4;
              eff.extra[`sv${v}_p${p}_life`] = 1;
              eff.extra[`sv${v}_p${p}_x`]   = ox + (v < 2 ? 0 : spread);
              eff.extra[`sv${v}_p${p}_y`]   = oy + (v < 2 ? spread : 0);
            }
          }
          if (eff.extra[`sv${v}_active`]) {
            const ddx = eff.extra[`sv${v}dx`];
            const ddy = eff.extra[`sv${v}dy`];
            let anyAlive = false;
            for (let p = 0; p < 6; p++) {
              let life = eff.extra[`sv${v}_p${p}_life`];
              if (life <= 0) continue;
              anyAlive = true;
              eff.extra[`sv${v}_p${p}_x`] += (ddx + (Math.random() - 0.5) * 0.007) * deltaMs;
              eff.extra[`sv${v}_p${p}_y`] += (ddy + (Math.random() - 0.5) * 0.007) * deltaMs;
              life -= 0.00085 * deltaMs;
              eff.extra[`sv${v}_p${p}_life`] = life;
              if (life <= 0) continue;
              const r     = 2.5 + (1 - life) * 8;
              const alpha = life * 0.40;
              steamGfx.circle(eff.extra[`sv${v}_p${p}_x`], eff.extra[`sv${v}_p${p}_y`], r);
              steamGfx.fill({ color: 0xddeeff, alpha });
            }
            if (!anyAlive) eff.extra[`sv${v}_active`] = 0;
          }
        }

        // ── Purple orbital streams: 3 rings rotating at core ─────────────
        const pcx = eff.extra['pcx'];
        const pcy = eff.extra['pcy'];
        const pcr = eff.extra['pcr'];
        // [radius, angularSpeed, dotCount, color] — radii ×3, counts sparse
        const STREAMS: [number, number, number, number][] = [
          [pcr * 1.05,  0.0025, 3, 0xee44ff],
          [pcr * 1.86, -0.0018, 4, 0xaa33ff],
          [pcr * 2.70,  0.0012, 3, 0x7722cc],
        ];
        for (const [r, speed, count, color] of STREAMS) {
          const headAngle = (t * speed) % (Math.PI * 2);
          for (let i = 0; i < count; i++) {
            const angle = headAngle + (i / count) * Math.PI * 2;
            const fade  = 1 - i / count;
            const px    = pcx + Math.cos(angle) * r;
            const py    = pcy + Math.sin(angle) * r * 0.45;
            const dotR  = 1.0 + fade * 1.4;
            purpleGfx.circle(px, py, dotR);
            purpleGfx.fill({ color, alpha: fade * 0.65 });
          }
        }

        // ── Purple lightning bolts: random bursts from core outward ───────
        const lightningGfx = eff.gs[2];
        if (lightningGfx) {
          lightningGfx.clear();
          const LT_DUR = 150; // ms per bolt
          for (let i = 0; i < 3; i++) {
            eff.extra[`lt${i}_next`] -= deltaMs;
            // Fire new bolt
            if (!eff.extra[`lt${i}_active`] && eff.extra[`lt${i}_next`] <= 0) {
              eff.extra[`lt${i}_active`] = 1;
              eff.extra[`lt${i}_age`]    = 0;
              eff.extra[`lt${i}_next`]   = 400 + Math.random() * 1100;
              const angle = Math.random() * Math.PI * 2;
              // Varied lengths: short to very long (1.8×–5.5× radius)
              const len   = pcr * (1.8 + Math.random() * 3.7);
              const cosA  = Math.cos(angle), sinA = Math.sin(angle);
              const cosP  = Math.cos(angle + Math.PI / 2), sinP = Math.sin(angle + Math.PI / 2);
              // 4 jagged control points; Y squash 0.65 so downward bolts are visible
              for (let s = 0; s < 4; s++) {
                const frac   = (s + 1) / 5;
                const jitter = (Math.random() - 0.5) * len * 0.5;
                eff.extra[`lt${i}_p${s}x`] = pcx + cosA * len * frac + cosP * jitter;
                eff.extra[`lt${i}_p${s}y`] = pcy + (sinA * len * frac + sinP * jitter) * 0.65;
              }
              eff.extra[`lt${i}_ex`] = pcx + cosA * len;
              eff.extra[`lt${i}_ey`] = pcy + sinA * len * 0.65;
            }
            if (eff.extra[`lt${i}_active`]) {
              eff.extra[`lt${i}_age`] += deltaMs;
              const age = eff.extra[`lt${i}_age`];
              if (age >= LT_DUR) {
                eff.extra[`lt${i}_active`] = 0;
              } else {
                const alpha = (1 - age / LT_DUR) * 0.9;
                // Helper: draw the jagged path
                const drawPath = () => {
                  lightningGfx.moveTo(pcx, pcy);
                  for (let s = 0; s < 4; s++) {
                    lightningGfx.lineTo(eff.extra[`lt${i}_p${s}x`], eff.extra[`lt${i}_p${s}y`]);
                  }
                  lightningGfx.lineTo(eff.extra[`lt${i}_ex`], eff.extra[`lt${i}_ey`]);
                };
                // Outer glow
                drawPath();
                lightningGfx.stroke({ width: 4, color: 0x9900ff, alpha: alpha * 0.30 });
                // Core beam
                drawPath();
                lightningGfx.stroke({ width: 1.2, color: 0xee55ff, alpha });
              }
            }
          }
        }

      } else if (eff.type === 'water_extractor') {
        // ── Water extractor: freeze-thaw cycle ────────────────────────────
        const fxGfx   = eff.gs[0];
        const frostSp = eff.sprites[0];
        if (!fxGfx) return;
        fxGfx.clear();

        const DUR_WATER  = 2500;
        const DUR_FREEZE = 1500;
        const DUR_FROZEN = 2500;
        const DUR_THAW   = 1500;

        let wxPhase = eff.extra['wxPhase'];
        let wxPhMs  = (eff.extra['wxPhMs'] ?? 0) + deltaMs;
        const wxDur = wxPhase === 0 ? DUR_WATER : wxPhase === 1 ? DUR_FREEZE : wxPhase === 2 ? DUR_FROZEN : DUR_THAW;

        const c0x = eff.extra['cyl0x'], c0y = eff.extra['cyl0y'];
        const c1x = eff.extra['cyl1x'], c1y = eff.extra['cyl1y'];
        const c2x = eff.extra['cyl2x'], c2y = eff.extra['cyl2y'];

        // ── Frost overlay alpha ─────────────────────────────────────────
        if (frostSp) {
          if      (wxPhase === 0) frostSp.alpha = 0;
          else if (wxPhase === 1) frostSp.alpha = Math.min(1, wxPhMs / DUR_FREEZE);
          else if (wxPhase === 2) frostSp.alpha = 1;
          else                    frostSp.alpha = Math.max(0, 1 - wxPhMs / DUR_THAW);
        }

        const cylX = (i: number) => i === 0 ? c0x : i === 1 ? c1x : c2x;
        const cylY = (i: number) => i === 0 ? c0y : i === 1 ? c1y : c2y;

        if (wxPhase === 0) {
          // ── WATER: blue bubbles rise from cylinder tops ─────────────
          for (let p = 0; p < 10; p++) {
            if (eff.extra[`fp${p}_life`] > 0) {
              eff.extra[`fp${p}_y`]    -= 0.015 * deltaMs;
              eff.extra[`fp${p}_life`] -= 0.001 * deltaMs;
              const life = eff.extra[`fp${p}_life`];
              if (life > 0) {
                fxGfx.circle(eff.extra[`fp${p}_x`], eff.extra[`fp${p}_y`], 1.2 + (1 - life) * 1.5);
                fxGfx.fill({ color: 0x44bbff, alpha: life * 0.55 });
              }
            } else if (Math.random() < 0.003 * deltaMs) {
              const c = Math.floor(Math.random() * 3);
              eff.extra[`fp${p}_x`]    = cylX(c) + (Math.random() - 0.5) * 8;
              eff.extra[`fp${p}_y`]    = cylY(c);
              eff.extra[`fp${p}_life`] = 0.6 + Math.random() * 0.4;
            }
          }

        } else if (wxPhase === 1) {
          // ── FREEZING: ice crystal shards drift down ─────────────────
          for (let p = 0; p < 10; p++) {
            if (eff.extra[`fp${p}_life`] > 0) {
              eff.extra[`fp${p}_x`]  += eff.extra[`fp${p}_vx`] * deltaMs;
              eff.extra[`fp${p}_y`]  += eff.extra[`fp${p}_vy`] * deltaMs;
              eff.extra[`fp${p}_vy`] += 0.00003 * deltaMs;
              eff.extra[`fp${p}_life`] -= 0.0007 * deltaMs;
              const life = eff.extra[`fp${p}_life`];
              if (life > 0) {
                const x = eff.extra[`fp${p}_x`], y = eff.extra[`fp${p}_y`];
                const sz = 1.2 + life * 2.0;
                // Diamond shard shape
                fxGfx.poly([x, y - sz, x + sz * 0.55, y, x, y + sz * 0.5, x - sz * 0.55, y]);
                fxGfx.fill({ color: 0xaaddff, alpha: life * 0.80 });
              }
            } else if (Math.random() < 0.009 * deltaMs) {
              const c = Math.floor(Math.random() * 3);
              eff.extra[`fp${p}_x`]    = cylX(c) + (Math.random() - 0.5) * 14;
              eff.extra[`fp${p}_y`]    = cylY(c) + Math.random() * 10;
              eff.extra[`fp${p}_vx`]   = (Math.random() - 0.5) * 0.014;
              eff.extra[`fp${p}_vy`]   = 0.008 + Math.random() * 0.018;
              eff.extra[`fp${p}_life`] = 0.7 + Math.random() * 0.3;
            }
          }

        } else if (wxPhase === 2) {
          // ── FROZEN: ice crystal glints flash on the frost overlay ───
          for (let p = 0; p < 5; p++) {
            eff.extra[`gl${p}_next`] -= deltaMs;
            if (eff.extra[`gl${p}_age`] > 180 && eff.extra[`gl${p}_next`] <= 0) {
              eff.extra[`gl${p}_age`]  = 0;
              eff.extra[`gl${p}_next`] = 500 + Math.random() * 1200;
              const c = Math.floor(Math.random() * 3);
              eff.extra[`gl${p}_x`] = cylX(c) + (Math.random() - 0.5) * 30;
              eff.extra[`gl${p}_y`] = cylY(c) + (Math.random() - 0.5) * 25;
            }
            if (eff.extra[`gl${p}_age`] < 180) {
              eff.extra[`gl${p}_age`] += deltaMs;
              const glA = Math.sin((eff.extra[`gl${p}_age`] / 180) * Math.PI) * 0.95;
              const glR = 1.5 + Math.sin((eff.extra[`gl${p}_age`] / 180) * Math.PI) * 3.0;
              fxGfx.circle(eff.extra[`gl${p}_x`], eff.extra[`gl${p}_y`], glR);
              fxGfx.fill({ color: 0xeef8ff, alpha: glA });
            }
          }

        } else {
          // ── THAWING: soft diffuse steam from tops + sides ────────────
          const sx0x = eff.extra['sx0x'], sx0y = eff.extra['sx0y'];
          const sx1x = eff.extra['sx1x'], sx1y = eff.extra['sx1y'];
          for (let p = 0; p < 10; p++) {
            if (eff.extra[`fp${p}_life`] > 0.02) {
              eff.extra[`fp${p}_x`]    += (eff.extra[`fp${p}_vx`] + (Math.random() - 0.5) * 0.005) * deltaMs;
              eff.extra[`fp${p}_y`]    += (eff.extra[`fp${p}_vy`] + (Math.random() - 0.5) * 0.005) * deltaMs;
              eff.extra[`fp${p}_life`] -= 0.00040 * deltaMs;
              const life = eff.extra[`fp${p}_life`];
              if (life > 0.02) {
                const age    = 1 - life;               // 0=fresh → 1=old
                const grow   = 5 + age * 24;           // expands 5→29px
                const fadeIn = Math.min(1, age * 7);   // fully opaque after ~14% life
                const fadeOut = Math.pow(life, 0.6);   // smooth power-curve tail
                const px = eff.extra[`fp${p}_x`], py = eff.extra[`fp${p}_y`];
                const ox = eff.extra[`fp${p}_ox`], oy = eff.extra[`fp${p}_oy`];
                const dist = Math.sqrt((px - ox) * (px - ox) + (py - oy) * (py - oy));
                const distFade = 1 / (1 + dist * 0.045);
                const a = fadeIn * fadeOut * distFade;
                // Outer diffuse halo (very faint)
                fxGfx.circle(px, py, grow * 1.6);
                fxGfx.fill({ color: 0xddeeff, alpha: a * 0.048 });
                // Mid cloud
                fxGfx.circle(px, py, grow);
                fxGfx.fill({ color: 0xe8f4ff, alpha: a * 0.085 });
                // Bright soft core
                fxGfx.circle(px, py, grow * 0.42);
                fxGfx.fill({ color: 0xffffff, alpha: a * 0.10 });
              }
            } else if (Math.random() < 0.022 * deltaMs) {
              if (Math.random() < 0.40) {
                // Side vent — exits sideways
                const left = Math.random() < 0.5;
                eff.extra[`fp${p}_x`]  = (left ? sx0x : sx1x);
                eff.extra[`fp${p}_y`]  = (left ? sx0y : sx1y) + (Math.random() - 0.5) * 12;
                eff.extra[`fp${p}_vx`] = (left ? -0.028 : 0.028) + (Math.random() - 0.5) * 0.007;
                eff.extra[`fp${p}_vy`] = -0.003 + (Math.random() - 0.5) * 0.004;
              } else {
                // Top cylinder — exits upward
                const c = Math.floor(Math.random() * 3);
                eff.extra[`fp${p}_x`]  = cylX(c) + (Math.random() - 0.5) * 8;
                eff.extra[`fp${p}_y`]  = cylY(c);
                eff.extra[`fp${p}_vx`] = (Math.random() - 0.5) * 0.008;
                eff.extra[`fp${p}_vy`] = -0.016 - Math.random() * 0.007;
              }
              eff.extra[`fp${p}_ox`]   = eff.extra[`fp${p}_x`];
              eff.extra[`fp${p}_oy`]   = eff.extra[`fp${p}_y`];
              eff.extra[`fp${p}_life`] = 0.60 + Math.random() * 0.40;
            }
          }
        }

        if (wxPhMs >= wxDur) {
          // Reset particles when phase changes
          for (let p = 0; p < 10; p++) eff.extra[`fp${p}_life`] = 0;
          wxPhase = (wxPhase + 1) % 4;
          wxPhMs  = 0;
        }
        eff.extra['wxPhase'] = wxPhase;
        eff.extra['wxPhMs']  = wxPhMs;

      } else if (eff.type === 'deep_drill') {
        // ── Deep drill: pulsing red core + sparks + flying pebbles ────────
        const glowGfx   = eff.gs[0];
        const sparkGfx  = eff.gs[1];
        const pebbleGfx = eff.gs[2];
        glowGfx.clear(); sparkGfx.clear(); pebbleGfx.clear();

        const corex = eff.extra['corex'];
        const corey = eff.extra['corey'];

        // ── Pulsing glow ──────────────────────────────────────────────────
        const pulse = 0.72 + Math.sin(t * 0.0055) * 0.28;
        glowGfx.circle(corex, corey, 18 * pulse);
        glowGfx.fill({ color: 0xff2200, alpha: 0.18 * pulse });
        glowGfx.circle(corex, corey, 10 * pulse);
        glowGfx.fill({ color: 0xff6600, alpha: 0.30 * pulse });
        glowGfx.circle(corex, corey, 5);
        glowGfx.fill({ color: 0xffcc44, alpha: 0.70 });

        // ── Sparks ────────────────────────────────────────────────────────
        for (let p = 0; p < 20; p++) {
          if (eff.extra[`sp${p}_life`] > 0) {
            eff.extra[`sp${p}_x`]    += eff.extra[`sp${p}_vx`] * deltaMs;
            eff.extra[`sp${p}_y`]    += eff.extra[`sp${p}_vy`] * deltaMs;
            eff.extra[`sp${p}_vy`]   += 0.00012 * deltaMs; // gravity
            eff.extra[`sp${p}_life`] -= 0.0028 * deltaMs;
            const sl = eff.extra[`sp${p}_life`];
            if (sl > 0) {
              const sa = sl * sl;
              const col = Math.random() < 0.5 ? 0xff6600 : 0xffcc22;
              sparkGfx.circle(eff.extra[`sp${p}_x`], eff.extra[`sp${p}_y`], 1.2 + sl * 1.5);
              sparkGfx.fill({ color: col, alpha: sa * 0.95 });
            }
          } else if (Math.random() < 0.055 * deltaMs) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.045 + Math.random() * 0.085;
            eff.extra[`sp${p}_x`]    = corex + (Math.random() - 0.5) * 4;
            eff.extra[`sp${p}_y`]    = corey + (Math.random() - 0.5) * 4;
            eff.extra[`sp${p}_vx`]   = Math.cos(angle) * speed;
            eff.extra[`sp${p}_vy`]   = Math.sin(angle) * speed - 0.055;
            eff.extra[`sp${p}_life`] = 0.30 + Math.random() * 0.50;
          }
        }

        // ── Pebbles ───────────────────────────────────────────────────────
        for (let p = 0; p < 8; p++) {
          if (eff.extra[`pb${p}_life`] > 0) {
            eff.extra[`pb${p}_x`]    += eff.extra[`pb${p}_vx`] * deltaMs;
            eff.extra[`pb${p}_y`]    += eff.extra[`pb${p}_vy`] * deltaMs;
            eff.extra[`pb${p}_vy`]   += 0.00022 * deltaMs; // heavier gravity
            eff.extra[`pb${p}_life`] -= 0.0014 * deltaMs;
            const pl = eff.extra[`pb${p}_life`];
            if (pl > 0) {
              pebbleGfx.circle(eff.extra[`pb${p}_x`], eff.extra[`pb${p}_y`], 1.8 + (1 - pl) * 0.5);
              pebbleGfx.fill({ color: 0x778899, alpha: Math.min(1, pl * 2) * 0.85 });
            }
          } else if (Math.random() < 0.008 * deltaMs) {
            const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 1.4;
            const speed = 0.025 + Math.random() * 0.045;
            eff.extra[`pb${p}_x`]    = corex + (Math.random() - 0.5) * 8;
            eff.extra[`pb${p}_y`]    = corey;
            eff.extra[`pb${p}_vx`]   = Math.cos(angle) * speed;
            eff.extra[`pb${p}_vy`]   = Math.sin(angle) * speed - 0.030;
            eff.extra[`pb${p}_life`] = 0.50 + Math.random() * 0.50;
          }
        }

      } else if (eff.type === 'atmo_extractor') {
        // ── Atmo extractor: slow grey smoke from 3 top pipes ───────────
        const smokeGfx = eff.gs[0];
        smokeGfx.clear();

        const pipeX = [eff.extra['p0x'], eff.extra['p1x'], eff.extra['p2x']];
        const pipeY = [eff.extra['p0y'], eff.extra['p1y'], eff.extra['p2y']];

        for (let p = 0; p < 15; p++) {
          if (eff.extra[`sm${p}_life`] > 0.02) {
            eff.extra[`sm${p}_x`]    += (eff.extra[`sm${p}_vx`] + (Math.random() - 0.5) * 0.004) * deltaMs;
            eff.extra[`sm${p}_y`]    += (eff.extra[`sm${p}_vy`] + (Math.random() - 0.5) * 0.002) * deltaMs;
            eff.extra[`sm${p}_life`] -= 0.00022 * deltaMs;
            const life = eff.extra[`sm${p}_life`];
            if (life > 0.02) {
              const age     = 1 - life;
              const grow    = 6 + age * 32;
              const fadeIn  = Math.min(1, age * 5);
              const fadeOut = Math.pow(life, 0.55);
              const px = eff.extra[`sm${p}_x`];
              const py = eff.extra[`sm${p}_y`];
              const ox = eff.extra[`sm${p}_ox`];
              const oy = eff.extra[`sm${p}_oy`];
              const dist = Math.sqrt((px - ox) * (px - ox) + (py - oy) * (py - oy));
              const distFade = 1 / (1 + dist * 0.035);
              const a = fadeIn * fadeOut * distFade;
              // Outer wispy halo
              smokeGfx.circle(px, py, grow * 1.7);
              smokeGfx.fill({ color: 0x8899aa, alpha: a * 0.038 });
              // Mid smoke body
              smokeGfx.circle(px, py, grow);
              smokeGfx.fill({ color: 0x99aabb, alpha: a * 0.070 });
              // Bright soft core
              smokeGfx.circle(px, py, grow * 0.45);
              smokeGfx.fill({ color: 0xbbccdd, alpha: a * 0.085 });
            }
          } else if (Math.random() < 0.010 * deltaMs) {
            // Spawn from one of the 3 pipes, cycling
            const pipe = p % 3;
            eff.extra[`sm${p}_x`]    = pipeX[pipe] + (Math.random() - 0.5) * 6;
            eff.extra[`sm${p}_y`]    = pipeY[pipe];
            eff.extra[`sm${p}_ox`]   = eff.extra[`sm${p}_x`];
            eff.extra[`sm${p}_oy`]   = eff.extra[`sm${p}_y`];
            eff.extra[`sm${p}_vx`]   = (Math.random() - 0.5) * 0.006;
            eff.extra[`sm${p}_vy`]   = -0.009 - Math.random() * 0.005;
            eff.extra[`sm${p}_life`] = 0.55 + Math.random() * 0.45;
          }
        }
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

  // ─── Clouds (static semi-transparent PNG overlay) ────────────────────────

  private async _initCloudSprites(): Promise<void> {
    let cloudTex: Texture;
    try {
      cloudTex = await Assets.load<Texture>('/tiles/clouds.jpg');
    } catch {
      return; // No texture — skip clouds
    }

    const N = this.gridSize;
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
    shadowSprite.position.set(posX, posY);
    this.cloudShadowSprite = shadowSprite;
    // Index 4: after groundLayer[0], concreteLayer[1], noiseOverlay[2], foamGfx[3]
    this.worldContainer.addChildAt(shadowSprite, 4);

    // ── Cloud body (static overlay, above roverLayer) ─────────────────────
    const bodySprite = new TilingSprite({ texture: cloudTex, width: mapW, height: mapH });
    bodySprite.tileScale.set(2);
    bodySprite.alpha = 0.06;
    bodySprite.position.set(posX, posY);
    this.cloudBodySprite = bodySprite;
    this.worldContainer.addChild(bodySprite);
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
    this.cloudShadowSprite = null;
    this.cloudBodySprite?.destroy();
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

// ─── Demolish VFX helpers (module-level, pure) ────────────────────────────────

/** Deterministic pseudo-random in [0,1) from a seed integer. */
function _demolishPR(n: number): number {
  return (((n * 1_664_525 + 1_013_904_223) >>> 0) / 0xFFFF_FFFF);
}

/** Linear interpolate between two 0xRRGGBB colors. */
function _demolishLerpColor(a: number, b: number, t: number): number {
  const r  = ((a >> 16) & 0xff) * (1 - t) + ((b >> 16) & 0xff) * t;
  const g  = ((a >>  8) & 0xff) * (1 - t) + ((b >>  8) & 0xff) * t;
  const bl = ( a        & 0xff) * (1 - t) + ( b        & 0xff) * t;
  return (((r & 0xff) << 16) | ((g & 0xff) << 8) | (bl & 0xff));
}
