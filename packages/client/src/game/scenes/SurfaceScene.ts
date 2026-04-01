/**
 * SurfaceScene.ts
 * PixiJS 2.5D isometric tile scene for planetary surface.
 *
 * Layers (bottom to top):
 *   bakeResult.sprite — baked terrain RenderTexture (1 draw call)
 *   featureLayer      — trees/rocks/craters, Y-sorted (static)
 *   corridorLayer     — lines between adjacent buildings (rebuilt on change)
 *   overlayLayer      — zone highlights (rebuilt on selection change)
 *   effectLayer       — pulsing rings, scanner, harvest VFX
 *   buildingLayer     — PNG sprite / procedural iso-box buildings, Y-sorted
 *   demolishLayer     — demolish VFX
 *   roverLayer        — researcher bot + harvester drones
 *   ghostLayer        — building placement ghost
 *   fogLayer          — fog of war (topmost)
 */

import {
  Application,
  Container,
  Graphics,
  Polygon,
  Sprite,
  Assets,
  Texture,
} from 'pixi.js';
import { bakeTerrain, patchBakedCell, type BakeResult } from './SurfaceBaker.js';
// In PixiJS v8, DisplayObject was removed; Sprite/Graphics both extend Container.
type DisplayObject = Container | Sprite | Graphics;
import type { Planet, Star, PlacedBuilding, BuildingType, HarvestedCell, SurfaceObjectType } from '@nebulife/core';
import { BUILDING_DEFS, REGROWTH_STAGE_MS } from '@nebulife/core';
import { FogLayer } from './FogLayer.js';
import { ResearcherBot, BOT_REVEAL_RADIUS } from './ResearcherBot.js';
import { HarvestEffects } from './HarvestEffects.js';
import { HarvesterDroneVisual } from './HarvesterDroneVisual.js';
import {
  TILE_W, TILE_H, FRAME_H,
  SPRITE_ANCHOR_Y, TILE_SCALE,
  STUMP_FRAME, TREE_SMALL_FRAME,
  ORE_DEPLETED_FRAME, ORE_SMALL_FRAME,
  VENT_DRY_FRAME, VENT_SMALL_FRAME,
  computeIsoGridSize,
  gridToScreen,
  classifyCellTerrain,
  terrainToAtlasIndex,
  isWaterTerrain,
  isCellBuildable,
  cellHash,
  isTreeCell,
  isOreCell,
  isVentCell,
  isMobileDevice,
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
  private featureLayer:  Container;
  private corridorLayer: Container;
  private overlayLayer:  Container;
  private effectLayer:   Container;
  private buildingLayer: Container;
  private roverLayer:    Container;

  // Fog of war
  private fogLayer: FogLayer | null = null;

  // Researcher bot
  private bot:        ResearcherBot | null = null;
  private botFlyTex:  Texture | null = null;
  private botIdleTex: Texture | null = null;
  /** Impassable cells: water + trees + building footprints. */
  private obstacleSet: Set<string> = new Set();

  // State cached for dynamic redraws
  private planet!: Planet;
  private waterLevel: number = 0.5;

  /** Performance monitor (set by SurfacePixiView, active only when ?perf=1). */
  public perf: { markStart(l: string): void; markEnd(l: string): number; markSkip(l: string): void;
    frameStart(): void; frameEnd(): void; sectionStart(l: string): void; sectionEnd(l: string): void; sectionSkip(l: string): void } | null = null;

  /** Harvest state overrides: key=`${col},${row}` → HarvestedCell */
  private harvestedCells: Map<string, HarvestedCell> = new Map();
  private planetId:        string  = '';
  private playerId:        string  = '';
  private regrowthCheckMs: number  = 0;

  /** Callback to save surface state to DB (set by SurfacePixiView). */
  private _saveToDB: ((data: Record<string, unknown>) => void) | null = null;
  private _saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  public setPlayerId(id: string): void { this.playerId = id; }
  public setSaveSurfaceState(fn: (data: Record<string, unknown>) => void): void { this._saveToDB = fn; }

  /** Debounced save to DB — coalesces rapid updates into one API call. */
  private _scheduleSave(field: string, value: unknown): void {
    if (!this._saveToDB) return;
    // Store pending fields
    if (!this._pendingSave) this._pendingSave = {};
    this._pendingSave[field] = value;
    if (this._saveDebounceTimer) clearTimeout(this._saveDebounceTimer);
    this._saveDebounceTimer = setTimeout(() => {
      if (this._pendingSave && this._saveToDB) {
        this._saveToDB(this._pendingSave);
        this._pendingSave = null;
      }
    }, 2000); // 2 second debounce (same as fog)
  }
  private _pendingSave: Record<string, unknown> | null = null;

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

  // ─── Baked terrain (1 RenderTexture replaces all ground+feature sprites) ────
  /** Bake result: sprite + metadata. Set after bakeTerrain() in init(). */
  private _bakeResult: BakeResult | null = null;
  /** PixiJS Application reference — needed for patchBakedCell(). */
  private _app: Application | null = null;

  private readonly _isMobile = isMobileDevice();

  // ─── Performance: floating text driven by update() — no per-anim RAF ─────
  private _floatAnims: Array<{
    g: Graphics; x: number; cy: number; color: number; elapsedMs: number;
  }> = [];

  // ─── Harvest visual effects ───────────────────────────────────────────────
  private harvestFx: HarvestEffects | null = null;

  // ─── Building placement animations ───────────────────────────────────────
  private buildingAnims:  BuildingAnim[] = [];
  private animatedKeys:   Set<string>    = new Set();
  private screenShakeMs:  number         = 0;

  // ─── Demolish VFX ─────────────────────────────────────────────────────────
  private demolishLayer: Container = new Container();
  private demolishEffects = new Map<string, DemolishEffect>();
  private buildingDisplayObjects = new Map<string, DisplayObject>();

  // ─── Ghost preview layer ─────────────────────────────────────────────────
  private ghostLayer: Container;

  constructor() {
    this.worldContainer = new Container();

    this.featureLayer  = new Container();
    this.corridorLayer = new Container();
    this.overlayLayer  = new Container();
    this.effectLayer   = new Container();
    this.buildingLayer = new Container();
    this.roverLayer    = new Container();
    this.ghostLayer    = new Container();

    this.harvestFx = new HarvestEffects(this.effectLayer, this.worldContainer);

    // sortableChildren needed for Y-sorting in feature/building layers
    this.featureLayer.sortableChildren  = true;
    this.buildingLayer.sortableChildren = true;

    this.worldContainer.addChild(
      this.featureLayer,
      this.corridorLayer,
      this.overlayLayer,
      this.effectLayer,
      this.buildingLayer,
      this.demolishLayer,    // demolish VFX — above buildings, below rover
      this.roverLayer,       // rover — above demolish VFX
      this.ghostLayer,       // building placement ghost — above rover
      // fogLayer is added last (topmost) after init
    );
  }

  private static readonly BUILDING_PNGS: [string, string][] = [
    ['colony_hub',        '/buildings/colony_hub.webp'],
    ['solar_plant',       '/buildings/solar_plant.webp'],
    ['battery_station',   '/buildings/battery_station.webp'],
    ['wind_generator',    '/buildings/wind_generator.webp'],
    ['resource_storage',  '/tiles/machines/resource_storage.webp'],
    ['landing_pad',       '/tiles/machines/landing_pad.webp'],
    ['spaceport',         '/tiles/machines/spaceport.webp'],
    ['thermal_generator', '/buildings/thermal_generator.webp'],
    ['mine',              '/buildings/mine.webp'],
    ['fusion_reactor',    '/buildings/fusion_reactor.webp'],
    ['water_extractor',   '/buildings/water_extractor.webp'],
    ['atmo_extractor',    '/buildings/atmo_extractor.webp'],
    ['deep_drill',        '/buildings/deep_drill.webp'],
  ];

  // ─── Init ─────────────────────────────────────────────────────────────────

  /**
   * @param app PixiJS Application — needed for RenderTexture baking.
   * @param surfaceState — fog, harvested cells, bot/drone positions loaded from DB.
   */
  async init(
    app: Application,
    planet: Planet, star: Star, buildings: PlacedBuilding[],
    surfaceState?: { revealedCells?: string[]; harvestedCells?: [string, unknown][]; bot?: { col: number; row: number; active: boolean } | null; harvesters?: { col: number; row: number }[] },
  ): Promise<void> {
    this._app       = app;
    this.planet      = planet;
    this.planetId    = planet.id;
    this.gridSize    = computeIsoGridSize(planet.radiusEarth * 6371);
    this.waterLevel  = planet.hydrosphere?.waterCoverageFraction ?? 0;

    // Restore harvested cells — prefer DB data, fallback to localStorage
    if (surfaceState?.harvestedCells && surfaceState.harvestedCells.length > 0) {
      this.harvestedCells = new Map(surfaceState.harvestedCells as [string, HarvestedCell][]);
    } else {
      try {
        const saved = localStorage.getItem(`harvest_${planet.id}`);
        if (saved) this.harvestedCells = new Map(JSON.parse(saved) as [string, HarvestedCell][]);
      } catch { /* ignore parse errors */ }
    }
    this.advanceRegrowth();

    // ── Bake terrain into RenderTexture (1 draw call) ────────────────────
    this.perf?.markStart('ground-layer');
    // Load building textures in parallel with bake
    const texturePromise = this._loadBuildingTextures(planet, star);
    this._bakeResult = await bakeTerrain(app, planet, star, this.harvestedCells);
    this.worldContainer.addChildAt(this._bakeResult.sprite, 0);
    this.perf?.markEnd('ground-layer');

    // Wait for building textures
    this.perf?.markStart('texture-load');
    await texturePromise;
    this.perf?.markEnd('texture-load');

    // Mountain overlay — DISABLED (too large visually, buildings clip through it)

    // Pre-mark existing buildings so they don't animate on scene load
    for (const b of buildings) this.animatedKeys.add(`${b.x},${b.y}`);
    this.perf?.markStart('bldg-rebuild');
    this.rebuildBuildings(buildings);
    this.perf?.markEnd('bldg-rebuild');

    // Fog of war — init with DB data if available, fallback to localStorage
    this.perf?.markStart('fog-init');
    this.fogLayer = new FogLayer(this.gridSize, planet.id);
    this.fogLayer.setSaveCallback((cells) => this._scheduleSave('revealedCells', cells));
    this.worldContainer.addChild(this.fogLayer.container);  // topmost
    if (surfaceState?.revealedCells && surfaceState.revealedCells.length > 0) {
      this.fogLayer.restoreFromArray(surfaceState.revealedCells);
    }
    this.fogLayer.initFromBuildings(buildings);
    this.perf?.markEnd('fog-init');

    // Drone explorer — only spawn if colony hub already exists
    this.perf?.markStart('bot-spawn');
    const hub = buildings.find((b) => b.type === 'colony_hub');
    if (hub) {
      this._spawnBotNearHub(hub);
      // Restore saved bot position — prefer DB, fallback to localStorage
      if (surfaceState?.bot) {
        this.bot!.col = surfaceState.bot.col;
        this.bot!.row = surfaceState.bot.row;
        this.bot!.active = surfaceState.bot.active;
      } else {
        this._restoreBotPosition(); // localStorage fallback
      }
    }

    // Premium harvester drones — spawn for each alpha_harvester building
    for (const b of buildings) {
      if (b.type === 'alpha_harvester') this._spawnHarvesterDrone(b);
    }
    // Restore drone positions — prefer DB, fallback to localStorage
    if (surfaceState?.harvesters && surfaceState.harvesters.length > 0) {
      for (let i = 0; i < Math.min(surfaceState.harvesters.length, this.harvesterDrones.length); i++) {
        this.harvesterDrones[i].col = surfaceState.harvesters[i].col;
        this.harvesterDrones[i].row = surfaceState.harvesters[i].row;
      }
    } else {
      this._restoreDronePositions(); // localStorage fallback
    }
    this.perf?.markEnd('bot-spawn');
  }

  /** Load building PNG textures + bot/drone textures in parallel. */
  private async _loadBuildingTextures(_planet: Planet, _star: Star): Promise<void> {
    const safeLoad = (url: string) => Assets.load<Texture>(url).catch(() => null);
    const [
      botFly, botIdle, harvester, posDrone,
      ...bldgTexArr
    ] = await Promise.all([
      safeLoad('/tiles/machines/bot_resercher.webp'),
      safeLoad('/tiles/machines/bot_resercher_off.webp'),
      safeLoad('/tiles/machines/premium_harvester_drone.webp'),
      safeLoad('/tiles/machines/pos_drone.webp'),
      ...SurfaceScene.BUILDING_PNGS.map(([, url]) => safeLoad(url)),
    ]);
    this.botFlyTex      = botFly;
    this.botIdleTex     = botIdle;
    this.harvesterTex   = harvester;
    this.posDroneTex    = posDrone;
    for (let i = 0; i < SurfaceScene.BUILDING_PNGS.length; i++) {
      const tex = bldgTexArr[i];
      if (tex) this.bldgTextures[SurfaceScene.BUILDING_PNGS[i][0]] = tex;
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
      this.fogLayer.revealAround(cx, cy, hubRadius);
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

  // ─── Bot/Drone position persistence (localStorage) ─────────────────────────

  /** Save bot position to localStorage + DB (called when bot crosses a cell). */
  private _saveBotPosition(): void {
    if (!this.bot) return;
    const botData = { col: this.bot.col, row: this.bot.row, active: this.bot.active };
    try { localStorage.setItem(`explorer_${this.planetId}`, JSON.stringify(botData)); } catch { /* */ }
    this._scheduleSave('bot', botData);
  }

  /** Restore bot position from localStorage (called after spawn). */
  private _restoreBotPosition(): void {
    if (!this.bot) return;
    try {
      const saved = localStorage.getItem(`explorer_${this.planetId}`);
      if (!saved) return;
      const data = JSON.parse(saved) as { col: number; row: number; active: boolean };
      this.bot.col = data.col;
      this.bot.row = data.row;
      this.bot.active = data.active;
    } catch { /* ignore parse errors */ }
  }

  /** Save all harvester drone positions to localStorage + DB. */
  private _saveDronePositions(): void {
    if (this.harvesterDrones.length === 0) return;
    const data = this.harvesterDrones.map((d) => ({ col: d.col, row: d.row }));
    try { localStorage.setItem(`harvesters_${this.planetId}`, JSON.stringify(data)); } catch { /* */ }
    this._scheduleSave('harvesters', data);
  }

  /** Restore harvester drone positions from localStorage (called after spawn). */
  private _restoreDronePositions(): void {
    try {
      const saved = localStorage.getItem(`harvesters_${this.planetId}`);
      if (!saved) return;
      const data = JSON.parse(saved) as { col: number; row: number }[];
      // Match saved positions to spawned drones by index
      for (let i = 0; i < Math.min(data.length, this.harvesterDrones.length); i++) {
        this.harvesterDrones[i].col = data[i].col;
        this.harvesterDrones[i].row = data[i].row;
      }
    } catch { /* ignore parse errors */ }
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

  /**
   * Patch a single cell in the baked RenderTexture (after harvest).
   */
  private _replaceGroundCell(col: number, row: number): void {
    if (!this._app || !this._bakeResult?.atlasTexture || !this._bakeResult?.sprite) return;
    const terrain = classifyCellTerrain(col, row, this.planet.seed, this.waterLevel, this.gridSize);
    if (isWaterTerrain(terrain) || terrain === 'beach') return;
    const defFrame = terrainToAtlasIndex(terrain, col, row, this.planet.seed, this.gridSize);
    if (defFrame === null) return;
    const frameIdx = this.getEffectiveFrame(col, row, defFrame);
    patchBakedCell(
      this._app, this._bakeResult.sprite, this._bakeResult.atlasTexture,
      col, row, frameIdx, this.planet.seed, this.gridSize,
    );
    this._bakeResult.tileFrames.set(`${col},${row}`, frameIdx);
  }

  // ─── Buildings (dynamic) ──────────────────────────────────────────────────

  public rebuildBuildings(buildings: PlacedBuilding[]): void {
    // Clear buildingDisplayObjects but keep entries for actively demolishing buildings
    for (const key of [...this.buildingDisplayObjects.keys()]) {
      if (!this.demolishEffects.has(key)) this.buildingDisplayObjects.delete(key);
    }

    this.buildingLayer.removeChildren();
    this.effectLayer.removeChildren();
    this.drawCorridors(buildings);
    this._buildObstacleSet(buildings);

    // Y-sort: farther (smaller y) drawn first
    const sorted = [...buildings].sort((a, b) => {
      return gridToScreen(a.x, a.y).y - gridToScreen(b.x, b.y).y;
    });

    for (const b of sorted) {
      const key = `${b.x},${b.y}`;
      // Skip buildings that are currently being demolished (sprite lives in demolishLayer)
      if (this.demolishEffects.has(key)) continue;

      const bldg = this.makeIsoBuilding(b);
      this.buildingLayer.addChild(bldg);
      // Track display object reference for potential future demolish
      this.buildingDisplayObjects.set(key, bldg);

      if (!this.animatedKeys.has(key)) {
        this.animatedKeys.add(key);
        this._startBuildingAnim(b, bldg);
      }
    }
  }

  /** Per-frame animation tick — called by PixiJS app.ticker in SurfacePixiView. */
  public update(deltaMs: number): void {
    this.perf?.frameStart();

    // Check regrowth every minute (not every frame)
    this.regrowthCheckMs += deltaMs;
    if (this.regrowthCheckMs > 60_000) {
      this.regrowthCheckMs = 0;
      this.advanceRegrowth();
    }

    // Animate harvest visual effects (particles)
    this.harvestFx?.update(deltaMs);

    // Tick floating-text animations
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

    // Building placement animations
    this._tickBuildingAnims(deltaMs);

    // Building idle effects — REMOVED (was 20+ Graphics.clear() per tick)
    this.perf?.sectionSkip('bldg-fx');

    // Demolish VFX animations
    this._tickDemolishEffects(deltaMs);

    // Animate researcher bot + reveal fog only when crossing into a new cell
    this.perf?.sectionStart('bot');
    if (this.bot) {
      const crossed = this.bot.update(deltaMs, this.currentIsotopes);
      if (crossed) {
        this._saveBotPosition();
        if (this.fogLayer) {
          const newCells = this.fogLayer.revealAround(Math.round(this.bot.col), Math.round(this.bot.row), BOT_REVEAL_RADIUS);
          this.fogLayer.redraw();
        }
      }
    }

    // Animate premium harvester drones + trigger screen shake on absorption
    let droneMoved = false;
    for (const drone of this.harvesterDrones) {
      drone.hasSolarPlant = this.hasSolarPlant;
      const prevCol = Math.round(drone.col);
      const prevRow = Math.round(drone.row);
      drone.update(deltaMs, this.currentIsotopes);
      if (Math.round(drone.col) !== prevCol || Math.round(drone.row) !== prevRow) droneMoved = true;
      if (drone.screenShakeRequested) {
        this.harvestFx?.screenShake(2, 280);
      }
    }
    if (droneMoved) this._saveDronePositions();
    this.perf?.sectionEnd('bot');

    // Hub effects — REMOVED (was 7 Graphics.clear() per tick)
    this.perf?.sectionSkip('hub-fx');
    this.perf?.frameEnd();
  }

  /**
   * Render a building.
   * - If a PNG texture exists for this type: draw it as a sprite scaled to its tile footprint.
   * - Otherwise: procedural isometric box (colored polygons).
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
    }
  }

  private saveHarvested(): void {
    const data = [...this.harvestedCells];
    try { localStorage.setItem(`harvest_${this.planetId}`, JSON.stringify(data)); } catch { /* */ }
    this._scheduleSave('harvestedCells', data);
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
   */
  public triggerDestructionEffect(col: number, row: number, type: SurfaceObjectType): void {
    const { x, y } = gridToScreen(col, row);
    const wx = x;
    const wy = y + TILE_H / 2;   // sprite base (ground-level anchor)

    if (type === 'tree') {
      this.harvestFx?.triggerTree(null, wx, wy);
    } else if (type === 'ore') {
      this.harvestFx?.triggerOre(wx, wy);
    } else if (type === 'vent') {
      this.harvestFx?.triggerVent(null, wx, wy);
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

  // ─── Per-building idle animations ─────────────────────────────────────────

  /** No-op stub — idle animations were removed for performance. */
  private _removeBldgEffect(_key: string): void { /* no-op */ }

  // ─── Destroy ─────────────────────────────────────────────────────────────

  destroy(): void {
    this.harvestFx?.destroy();
    this.harvestFx = null;
    this.cancelHarvestRing();
    this.bot?.destroy();
    this.bot = null;
    this.fogLayer?.destroy();
    this.fogLayer = null;
    for (const a of this.buildingAnims) {
      a.maskGfx?.destroy();
      a.laserGfx?.destroy();
      a.shadowGfx?.destroy();
      a.dustGfx?.destroy();
    }
    this.buildingAnims = [];
    // Free GPU memory from baked terrain RenderTexture
    if (this._bakeResult?.sprite?.texture) {
      this._bakeResult.sprite.texture.destroy(true);
    }
    this._bakeResult = null;
    this.worldContainer.destroy({ children: true });
  }
}

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
