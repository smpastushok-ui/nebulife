/**
 * useSurfaceState.ts
 * Central state machine hook for the SVG surface rewrite.
 *
 * Replaces all game logic from SurfaceScene.ts:
 *   - Building placement validation (canBuildAt)
 *   - Harvest logic (isHarvestableAt, harvestAt)
 *   - Discovered tiles management (discoveredTiles set) — replaces Fog of War
 *   - Bot A* pathfinding (setRoverTarget, botState)
 *   - Drone state (droneStates)
 *   - Initial load: getBuildings + getSurfaceState, auto-place colony_hub
 *
 * Design:
 *   - Pure React state — no PixiJS / Three.js dependencies
 *   - All geometry helpers imported from surface-utils.ts (deterministic, seed-based)
 *   - DB persistence fire-and-forget with debounce
 *   - Bot movement driven by requestAnimationFrame, exposed as BotAnimState for SVG rendering
 *   - NO Fog of War — only discovered tiles are rendered
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

import type {
  Planet,
  Star,
  BuildingType,
  PlacedBuilding,
  SurfaceObjectType,
  HarvestedCell,
} from '@nebulife/core';
import { BUILDING_DEFS } from '@nebulife/core';

import {
  classifyCellTerrain,
  isWaterTerrain,
  isTreeCell,
  isOreCell,
  isVentCell,
  isMountainFootprint,
  computeIsoGridSize,
  isCellBuildable,
  cellHash,
  findStartingLandCell,
} from '../../../game/scenes/surface-utils.js';
import {
  getBuildings,
  placeBuilding,
  getSurfaceState,
  saveSurfaceState,
} from '../../../api/surface-api.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Bot movement speed in grid cells per second (matches ResearcherBot.BOT_SPEED). */
const BOT_SPEED = 1.5;

/** Discovery radius when the bot crosses into a new cell. */
const BOT_DISCOVER_RADIUS = 3;

/** Debounce delay (ms) before persisting surface state to DB. */
const SAVE_DEBOUNCE_MS = 3000;

// ─── Public types ─────────────────────────────────────────────────────────────

export interface BotAnimState {
  col: number;
  row: number;
  targetCol: number;
  targetRow: number;
  active: boolean;
  /** 'idle' = engines off, 'startup' = spinning up, 'flying' = moving along path. */
  state: 'idle' | 'startup' | 'flying';
  path: { col: number; row: number }[];
  pathIndex: number;
  /** 0–1 interpolation progress between current and next cell in path. */
  progress: number;
}

export interface DroneAnimState {
  col: number;
  row: number;
  active: boolean;
  state: 'idle' | 'flying' | 'harvesting';
  resourceFilter: Set<string>;
}

export interface HarvestRingState {
  col: number;
  row: number;
  startTime: number;
  durationMs: number;
  onComplete: () => void;
}

export interface SurfaceStateResult {
  gridSize: number;
  waterLevel: number;
  buildings: PlacedBuilding[];
  setBuildings: React.Dispatch<React.SetStateAction<PlacedBuilding[]>>;
  harvestedCells: Map<string, HarvestedCell>;
  /** Set of "col,row" keys for tiles that have been discovered and should be rendered. */
  discoveredTiles: Set<string>;
  botState: BotAnimState | null;
  droneStates: DroneAnimState[];
  harvestRing: HarvestRingState | null;
  loading: boolean;

  // Validation
  canBuildAt: (col: number, row: number, type: BuildingType, buildings: PlacedBuilding[]) => boolean;
  isHarvestableAt: (col: number, row: number) => SurfaceObjectType | null;

  // Actions
  harvestAt: (col: number, row: number) => SurfaceObjectType | null;
  startHarvestRing: (col: number, row: number, durationMs: number, onComplete: () => void) => void;
  cancelHarvestRing: () => void;
  setRoverTarget: (col: number, row: number) => void;
  setBotActive: (active: boolean) => void;
  getBuildingAt: (col: number, row: number, buildings: PlacedBuilding[]) => PlacedBuilding | null;

  // Isotopes
  syncIsotopes: (amount: number) => void;
}

// ─── A* types (internal) ──────────────────────────────────────────────────────

interface ANode {
  c: number;
  r: number;
  g: number;
  f: number;
  parent: ANode | null;
}

// ─── A* pathfinding (mirrors ResearcherBot._findPath exactly) ─────────────────

function findPath(
  sc: number, sr: number,
  ec: number, er: number,
  obstacles: Set<string>,
  N: number,
): Array<{ col: number; row: number }> {
  if (sc === ec && sr === er) return [];

  const key = (c: number, r: number) => `${c},${r}`;
  const h   = (c: number, r: number) => Math.abs(c - ec) + Math.abs(r - er);

  const open:    ANode[] = [];
  const closed   = new Set<string>();
  const gScore   = new Map<string, number>();

  const startNode: ANode = { c: sc, r: sr, g: 0, f: h(sc, sr), parent: null };
  open.push(startNode);
  gScore.set(key(sc, sr), 0);

  const DIRS = [
    [1,  0], [0,  1], [-1,  0], [0, -1],
    [1,  1], [-1,  1], [ 1, -1], [-1, -1],
  ] as const;

  while (open.length > 0) {
    // Pop node with lowest f score
    let best = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[best].f) best = i;
    }
    const cur = open[best];
    open.splice(best, 1);

    if (cur.c === ec && cur.r === er) {
      // Reconstruct path (exclude start node)
      const path: Array<{ col: number; row: number }> = [];
      let node: ANode | null = cur;
      while (node) {
        path.unshift({ col: node.c, row: node.r });
        node = node.parent;
      }
      path.shift(); // remove start cell
      return path;
    }

    const ck = key(cur.c, cur.r);
    closed.add(ck);

    for (const [dc, dr] of DIRS) {
      const nc = cur.c + dc;
      const nr = cur.r + dr;
      if (nc < 0 || nc >= N || nr < 0 || nr >= N) continue;

      const nk = key(nc, nr);
      if (closed.has(nk)) continue;
      if (obstacles.has(nk)) continue;

      const diag = dc !== 0 && dr !== 0;
      const ng   = cur.g + (diag ? 1.414 : 1.0);

      const existing = gScore.get(nk);
      if (existing !== undefined && ng >= existing) continue;

      gScore.set(nk, ng);
      open.push({ c: nc, r: nr, g: ng, f: ng + h(nc, nr), parent: cur });
    }

    // Safety: limit search space to avoid freezing on large open grids
    if (closed.size > 400) break;
  }

  return []; // no path found
}

// ─── Obstacle set builder (mirrors SurfaceScene._buildObstacleSet) ────────────

function buildObstacleSet(
  buildings: PlacedBuilding[],
  harvestedCells: Map<string, HarvestedCell>,
  seed: number,
  waterLevel: number,
  N: number,
): Set<string> {
  const set = new Set<string>();

  for (let c = 0; c < N; c++) {
    for (let r = 0; r < N; r++) {
      const terrain = classifyCellTerrain(c, r, seed, waterLevel, N);
      if (isWaterTerrain(terrain)) {
        set.add(`${c},${r}`);
        continue;
      }
      // Only fully uncut trees block — stumps and regrowth stages are passable
      if (isTreeCell(c, r, seed, N, waterLevel) && !harvestedCells.has(`${c},${r}`)) {
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

  return set;
}

// ─── _isCellResourceBlocked ───────────────────────────────────────────────────

function isCellResourceBlocked(
  col: number,
  row: number,
  harvestedCells: Map<string, HarvestedCell>,
  seed: number,
  waterLevel: number,
  N: number,
): boolean {
  if (isTreeCell(col, row, seed, N, waterLevel)) {
    const hc = harvestedCells.get(`${col},${row}`);
    if (!hc) return true;
    if (hc.objectType === 'tree' && (hc.state === 'stump' || hc.state === 'tree-small')) return true;
    return false;
  }

  if (isOreCell(col, row, seed, N, waterLevel)) {
    const hc = harvestedCells.get(`${col},${row}`);
    if (!hc) return true;
    if (hc.objectType === 'ore' && hc.state === 'ore-small') return true;
    return false;
  }

  if (isVentCell(col, row, seed, N, waterLevel)) {
    const hc = harvestedCells.get(`${col},${row}`);
    if (!hc) return true;
    if (hc.objectType === 'vent' && hc.state === 'vent-small') return true;
    return false;
  }

  return false;
}

// ─── Discovery helpers ────────────────────────────────────────────────────────

/**
 * Add all cells within radius of center to the discovered set.
 * Returns a new Set (immutable update pattern).
 */
function discoverCellsInRadius(
  prev: Set<string>,
  centerCol: number,
  centerRow: number,
  radius: number,
  N: number,
): Set<string> {
  const next = new Set(prev);
  const r = Math.round(radius);
  for (let dc = -r; dc <= r; dc++) {
    for (let dr = -r; dr <= r; dr++) {
      if (dc * dc + dr * dr > radius * radius) continue;
      const c = Math.round(centerCol) + dc;
      const row = Math.round(centerRow) + dr;
      if (c >= 0 && c < N && row >= 0 && row < N) {
        next.add(`${c},${row}`);
      }
    }
  }
  return next;
}

/**
 * Compute initial discovered tiles from all buildings using their fogRevealRadius.
 */
function discoverAroundBuildings(
  buildings: PlacedBuilding[],
  N: number,
): Set<string> {
  const set = new Set<string>();
  for (const b of buildings) {
    const def = BUILDING_DEFS[b.type];
    const sW  = def?.sizeW ?? 1;
    const sH  = def?.sizeH ?? 1;
    const rawRadius = def?.fogRevealRadius ?? 0;
    if (rawRadius <= 0) continue;
    const radius = Math.min(rawRadius, Math.floor(N * 0.25));
    const cx = b.x + sW / 2 - 0.5;
    const cy = b.y + sH / 2 - 0.5;
    const r = Math.round(radius);
    for (let dc = -r; dc <= r; dc++) {
      for (let dr = -r; dr <= r; dr++) {
        if (dc * dc + dr * dr > radius * radius) continue;
        const c  = Math.round(cx) + dc;
        const ro = Math.round(cy) + dr;
        if (c >= 0 && c < N && ro >= 0 && ro < N) {
          set.add(`${c},${ro}`);
        }
      }
    }
  }
  return set;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSurfaceState(
  planet: Planet,
  _star: Star,
  playerId: string,
): SurfaceStateResult {
  // ── Derived static values ──────────────────────────────────────────────────
  const gridSize    = useMemo(() => computeIsoGridSize(planet.radiusEarth * 6371), [planet.radiusEarth]);
  const waterLevel  = useMemo(() => planet.hydrosphere?.waterCoverageFraction ?? 0, [planet.hydrosphere]);
  const planetSeed  = planet.seed;
  const planetId    = planet.id;

  // ── Core state ────────────────────────────────────────────────────────────
  const [buildings,       setBuildings]       = useState<PlacedBuilding[]>([]);
  const [harvestedCells,  setHarvestedCells]  = useState<Map<string, HarvestedCell>>(new Map());
  const [discoveredTiles, setDiscoveredTiles] = useState<Set<string>>(new Set());
  const [loading,         setLoading]         = useState(true);

  // ── Bot state ─────────────────────────────────────────────────────────────
  const [botState, setBotState] = useState<BotAnimState | null>(null);

  // ── Drone state ───────────────────────────────────────────────────────────
  const [droneStates, setDroneStates] = useState<DroneAnimState[]>([]);

  // ── Harvest ring ──────────────────────────────────────────────────────────
  const [harvestRing, setHarvestRing] = useState<HarvestRingState | null>(null);

  // ── Isotope fuel ref (synced from parent via syncIsotopes) ────────────────
  const isotopesRef = useRef<number>(Infinity);

  // ── Save debounce timers ──────────────────────────────────────────────────
  const saveTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const harvestTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Bot RAF ref ───────────────────────────────────────────────────────────
  const botRafRef       = useRef<number | null>(null);
  const botStateRef     = useRef<BotAnimState | null>(null);
  const lastBotTsRef    = useRef<number>(0);

  // Keep ref in sync with state for RAF closure
  useEffect(() => {
    botStateRef.current = botState;
  }, [botState]);

  // ── Obstacle set ref (rebuilt when buildings or harvestedCells change) ────
  const obstacleSetRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    obstacleSetRef.current = buildObstacleSet(
      buildings, harvestedCells, planetSeed, waterLevel, gridSize,
    );
  }, [buildings, harvestedCells, planetSeed, waterLevel, gridSize]);

  // ── Persist surface state (discovered tiles + harvests) to DB ─────────────
  const scheduleSave = useCallback((
    discovered: Set<string>,
    harvested: Map<string, HarvestedCell>,
    bot: BotAnimState | null,
  ) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveSurfaceState(playerId, planetId, {
        revealedCells:  [...discovered],
        harvestedCells: [...harvested],
        bot: bot ? { col: bot.col, row: bot.row, active: bot.active } : null,
        harvesters: [],
      });
    }, SAVE_DEBOUNCE_MS);
  }, [playerId, planetId]);

  // ── Persist harvested cells to localStorage + schedule DB save ────────────
  const saveHarvested = useCallback((
    harvested: Map<string, HarvestedCell>,
    discovered: Set<string>,
    bot: BotAnimState | null,
  ) => {
    try {
      localStorage.setItem(`harvest_${planetId}`, JSON.stringify([...harvested]));
    } catch { /* ignore */ }
    if (harvestTimerRef.current) clearTimeout(harvestTimerRef.current);
    harvestTimerRef.current = setTimeout(() => {
      scheduleSave(discovered, harvested, bot);
    }, 500);
  }, [planetId, scheduleSave]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [loadedBuildings, surfaceState] = await Promise.all([
        getBuildings(playerId, planetId).catch(() => [] as PlacedBuilding[]),
        getSurfaceState(playerId, planetId),
      ]);

      if (cancelled) return;

      // Restore harvested cells — prefer DB, fallback to localStorage
      let harvested = new Map<string, HarvestedCell>();
      if (surfaceState.harvestedCells && surfaceState.harvestedCells.length > 0) {
        harvested = new Map(surfaceState.harvestedCells as [string, HarvestedCell][]);
      } else {
        try {
          const saved = localStorage.getItem(`harvest_${planetId}`);
          if (saved) harvested = new Map(JSON.parse(saved) as [string, HarvestedCell][]);
        } catch { /* ignore */ }
      }

      // Advance regrowth (inline — mirrors SurfaceScene.advanceRegrowth)
      const now = Date.now();
      let regrowthChanged = false;
      const REGROWTH_STAGE_MS: Record<string, number> = {
        tree: 3_600_000,
        ore:  3_600_000,
        vent: 7_200_000,
      };
      for (const [key, cell] of harvested) {
        const objType  = cell.objectType ?? 'tree';
        const stageMs  = REGROWTH_STAGE_MS[objType] ?? 3_600_000;
        if (now - cell.changedAt < stageMs) continue;

        if (objType === 'tree') {
          if (cell.state === 'stump') {
            cell.state = 'grass'; cell.changedAt = now; regrowthChanged = true;
          } else if (cell.state === 'grass') {
            cell.state = 'tree-small'; cell.changedAt = now; regrowthChanged = true;
          } else if (cell.state === 'tree-small') {
            harvested.delete(key); regrowthChanged = true;
          }
        } else if (objType === 'ore') {
          if (cell.state === 'depleted') {
            cell.state = 'ore-small'; cell.changedAt = now; regrowthChanged = true;
          } else if (cell.state === 'ore-small') {
            harvested.delete(key); regrowthChanged = true;
          }
        } else if (objType === 'vent') {
          if (cell.state === 'dry') {
            cell.state = 'vent-small'; cell.changedAt = now; regrowthChanged = true;
          } else if (cell.state === 'vent-small') {
            harvested.delete(key); regrowthChanged = true;
          }
        }
      }
      if (regrowthChanged) {
        try {
          localStorage.setItem(`harvest_${planetId}`, JSON.stringify([...harvested]));
        } catch { /* ignore */ }
      }

      // Auto-place colony hub if this is the first visit
      let finalBuildings = loadedBuildings;
      if (finalBuildings.length === 0) {
        const start = findStartingLandCell(planetSeed, waterLevel, gridSize);
        const autoHub: PlacedBuilding = {
          id:      `bld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type:    'colony_hub',
          x:       start.col,
          y:       start.row,
          level:   1,
          builtAt: new Date().toISOString(),
        };
        finalBuildings = [autoHub];
        placeBuilding(playerId, planetId, autoHub).catch(() => {
          setTimeout(() => placeBuilding(playerId, planetId, autoHub).catch(console.error), 2000);
        });
      }

      // Restore discovered tiles — prefer DB data (stored in revealedCells field), then init from buildings
      let discovered = new Set<string>();
      if (surfaceState.revealedCells && surfaceState.revealedCells.length > 0) {
        for (const k of surfaceState.revealedCells) discovered.add(k);
      }
      // Always include tiles discovered by buildings (additive)
      const fromBuildings = discoverAroundBuildings(finalBuildings, gridSize);
      for (const k of fromBuildings) discovered.add(k);

      // Bot state — restore position + active from DB
      const hub = finalBuildings.find((b) => b.type === 'colony_hub');
      let initialBot: BotAnimState | null = null;
      if (hub) {
        const hubDef = BUILDING_DEFS[hub.type];
        const startCol = hub.x + (hubDef?.sizeW ?? 2) + 1;
        const startRow = hub.y + Math.floor((hubDef?.sizeH ?? 2) / 2);
        const col = surfaceState.bot?.col ?? startCol;
        const row = surfaceState.bot?.row ?? startRow;
        initialBot = {
          col,
          row,
          targetCol: col,
          targetRow: row,
          active: surfaceState.bot?.active ?? true,
          state: 'idle',
          path: [],
          pathIndex: 0,
          progress: 0,
        };
      }

      if (cancelled) return;
      setHarvestedCells(new Map(harvested));
      setDiscoveredTiles(new Set(discovered));
      setBuildings(finalBuildings);
      setBotState(initialBot);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [playerId, planetId, planetSeed, waterLevel, gridSize]);

  // ── Bot RAF animation loop ────────────────────────────────────────────────
  useEffect(() => {
    if (!botState) return;

    function tick(ts: number) {
      const prev = botStateRef.current;
      if (!prev) return;

      const deltaMs = lastBotTsRef.current > 0 ? ts - lastBotTsRef.current : 16;
      lastBotTsRef.current = ts;

      if (!prev.active || prev.path.length === 0) {
        botRafRef.current = requestAnimationFrame(tick);
        return;
      }

      // Step along path
      const path = [...prev.path];
      let col = prev.col;
      let row = prev.row;
      let pathIndex = prev.pathIndex;
      let progress = prev.progress;
      let crossedCell = false;

      if (path.length > 0) {
        const next  = path[0];
        const dc    = next.col - col;
        const dr    = next.row - row;
        const dist  = Math.sqrt(dc * dc + dr * dr);
        const step  = BOT_SPEED * (deltaMs / 1000);

        const prevIntCol = Math.round(col);
        const prevIntRow = Math.round(row);

        if (step >= dist) {
          col = next.col;
          row = next.row;
          path.shift();
          pathIndex = Math.max(0, pathIndex - 1);
          progress = 0;
        } else {
          col = col + (dc / dist) * step;
          row = row + (dr / dist) * step;
          progress = dist > 0 ? (step / dist) : 0;
        }

        crossedCell = Math.round(col) !== prevIntCol || Math.round(row) !== prevIntRow;

        // Deduct isotopes when crossing into a new cell
        if (crossedCell) {
          const cost = 4; // BOT_ISOTOPE_COST_PER_CELL
          if (isotopesRef.current < cost) {
            path.length = 0;
          } else {
            isotopesRef.current = Math.max(0, isotopesRef.current - cost);
          }
        }
      }

      const newState: BotAnimState = {
        ...prev,
        col,
        row,
        path,
        pathIndex,
        progress,
        state: path.length > 0 ? 'flying' : 'idle',
        targetCol: path.length > 0 ? path[path.length - 1].col : col,
        targetRow: path.length > 0 ? path[path.length - 1].row : row,
      };
      botStateRef.current = newState;
      setBotState(newState);

      // Discover new tiles when bot crosses a new cell
      if (crossedCell) {
        setDiscoveredTiles((prev) =>
          discoverCellsInRadius(prev, col, row, BOT_DISCOVER_RADIUS, gridSize),
        );
      }

      botRafRef.current = requestAnimationFrame(tick);
    }

    botRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (botRafRef.current !== null) cancelAnimationFrame(botRafRef.current);
      botRafRef.current = null;
      lastBotTsRef.current = 0;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botState !== null, gridSize]);

  // ── canBuildAt — exact port of SurfaceScene.canBuildAt ───────────────────
  const canBuildAt = useCallback((
    col: number,
    row: number,
    buildingType: BuildingType,
    blds: PlacedBuilding[],
  ): boolean => {
    const def  = BUILDING_DEFS[buildingType];
    const sW   = def?.sizeW ?? 1;
    const sH   = def?.sizeH ?? 1;
    const N    = gridSize;
    const seed = planetSeed;
    const wl   = waterLevel;

    if (col + sW > N || row + sH > N) return false;
    if (col < 0 || row < 0) return false;

    // All footprint cells must pass terrain check, no resources, must be discovered
    for (let dc = 0; dc < sW; dc++) {
      for (let dr = 0; dr < sH; dr++) {
        const c = col + dc;
        const r = row + dr;
        if (isMountainFootprint(c, r, seed, N)) return false;
        if (!isCellBuildable(c, r, seed, wl, buildingType)) return false;
        if (isCellResourceBlocked(c, r, harvestedCells, seed, wl, N)) return false;
        if (!discoveredTiles.has(`${c},${r}`)) return false;
        // Bot position check (transport occupancy)
        if (botState && Math.round(botState.col) === c && Math.round(botState.row) === r) return false;
      }
    }

    // 1-cell buffer: bordering cells must not be mountain or resource.
    for (let dc = -1; dc <= sW; dc++) {
      for (let dr = -1; dr <= sH; dr++) {
        if (dc >= 0 && dc < sW && dr >= 0 && dr < sH) continue;
        const bc = col + dc;
        const br = row + dr;
        if (bc < 0 || bc >= N || br < 0 || br >= N) continue;
        if (isMountainFootprint(bc, br, seed, N)) return false;
        if (isCellResourceBlocked(bc, br, harvestedCells, seed, wl, N)) return false;
      }
    }

    // Footprint must not overlap or touch any existing building (enforces 1-cell gap).
    for (const b of blds) {
      const bSW = BUILDING_DEFS[b.type]?.sizeW ?? 1;
      const bSH = BUILDING_DEFS[b.type]?.sizeH ?? 1;
      if (col <= b.x + bSW && col + sW >= b.x && row <= b.y + bSH && row + sH >= b.y) return false;
    }

    return true;
  }, [gridSize, planetSeed, waterLevel, harvestedCells, discoveredTiles, botState]);

  // ── isHarvestableAt ───────────────────────────────────────────────────────
  const isHarvestableAt = useCallback((col: number, row: number): SurfaceObjectType | null => {
    const key = `${col},${row}`;
    if (harvestedCells.has(key)) return null;
    // Only discovered tiles are harvestable
    if (!discoveredTiles.has(key)) return null;

    const N    = gridSize;
    const seed = planetSeed;
    const wl   = waterLevel;

    if (isTreeCell(col, row, seed, N, wl)) return 'tree';
    if (isOreCell(col, row, seed, N, wl))  return 'ore';
    if (isVentCell(col, row, seed, N, wl)) return 'vent';
    return null;
  }, [harvestedCells, discoveredTiles, gridSize, planetSeed, waterLevel]);

  // ── harvestAt — execute harvest and persist ───────────────────────────────
  const harvestAt = useCallback((col: number, row: number): SurfaceObjectType | null => {
    const key = `${col},${row}`;
    if (harvestedCells.has(key)) return null;

    const N    = gridSize;
    const seed = planetSeed;
    const wl   = waterLevel;

    let result: SurfaceObjectType | null = null;
    let newCell: HarvestedCell | null = null;

    if (isTreeCell(col, row, seed, N, wl)) {
      result = 'tree';
      const variant = Math.round(cellHash(col, row, seed + 9999) * 3) % 3;
      newCell = {
        objectType:   'tree',
        state:        'stump',
        grassVariant: Math.floor(cellHash(col, row, seed + 5555) * 3),
        treeVariant:  variant,
        changedAt:    Date.now(),
      };
    } else if (isOreCell(col, row, seed, N, wl)) {
      result = 'ore';
      const variant = Math.floor(cellHash(col, row, seed + 5555) * 3);
      newCell = {
        objectType:   'ore',
        state:        'depleted',
        grassVariant: variant,
        treeVariant:  Math.floor(cellHash(col, row, seed + 7777) * 3),
        changedAt:    Date.now(),
      };
    } else if (isVentCell(col, row, seed, N, wl)) {
      result = 'vent';
      const variant = Math.floor(cellHash(col, row, seed + 5555) * 3);
      newCell = {
        objectType:   'vent',
        state:        'dry',
        grassVariant: variant,
        treeVariant:  Math.floor(cellHash(col, row, seed + 8888) * 3),
        changedAt:    Date.now(),
      };
    }

    if (!result || !newCell) return null;

    const cell = newCell;
    setHarvestedCells((prev) => {
      const next = new Map(prev);
      next.set(key, cell);
      return next;
    });

    setTimeout(() => {
      setHarvestedCells((current) => {
        saveHarvested(current, discoveredTiles, botStateRef.current);
        return current;
      });
    }, 0);

    return result;
  }, [harvestedCells, gridSize, planetSeed, waterLevel, saveHarvested, discoveredTiles]);

  // ── startHarvestRing ──────────────────────────────────────────────────────
  const startHarvestRing = useCallback((
    col: number,
    row: number,
    durationMs: number,
    onComplete: () => void,
  ) => {
    setHarvestRing({ col, row, startTime: Date.now(), durationMs, onComplete });
  }, []);

  // ── cancelHarvestRing ─────────────────────────────────────────────────────
  const cancelHarvestRing = useCallback(() => {
    setHarvestRing(null);
  }, []);

  // ── setRoverTarget ────────────────────────────────────────────────────────
  const setRoverTarget = useCallback((col: number, row: number) => {
    setBotState((prev) => {
      if (!prev || !prev.active) return prev;
      const sc = Math.round(prev.col);
      const sr = Math.round(prev.row);
      const ec = Math.max(0, Math.min(gridSize - 1, col));
      const er = Math.max(0, Math.min(gridSize - 1, row));
      const path = findPath(sc, sr, ec, er, obstacleSetRef.current, gridSize);
      if (path.length === 0) return prev;
      return {
        ...prev,
        path,
        pathIndex: 0,
        progress: 0,
        targetCol: ec,
        targetRow: er,
        state: 'startup',
      };
    });
  }, [gridSize]);

  // ── setBotActive ──────────────────────────────────────────────────────────
  const setBotActive = useCallback((active: boolean) => {
    setBotState((prev) => {
      if (!prev) return prev;
      return { ...prev, active, path: active ? prev.path : [], state: active ? prev.state : 'idle' };
    });
  }, []);

  // ── getBuildingAt — by grid cell ──────────────────────────────────────────
  const getBuildingAt = useCallback((
    col: number,
    row: number,
    blds: PlacedBuilding[],
  ): PlacedBuilding | null => {
    for (const b of blds) {
      const sW = BUILDING_DEFS[b.type]?.sizeW ?? 1;
      const sH = BUILDING_DEFS[b.type]?.sizeH ?? 1;
      if (col >= b.x && col < b.x + sW && row >= b.y && row < b.y + sH) return b;
    }
    return null;
  }, []);

  // ── syncIsotopes ──────────────────────────────────────────────────────────
  const syncIsotopes = useCallback((amount: number) => {
    isotopesRef.current = amount;
  }, []);

  // ── Persist discovered tiles when they change (after initial load) ─────────
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (loading) return;
    scheduleSave(discoveredTiles, harvestedCells, botStateRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discoveredTiles]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (saveTimerRef.current)    clearTimeout(saveTimerRef.current);
      if (harvestTimerRef.current) clearTimeout(harvestTimerRef.current);
      if (botRafRef.current !== null) cancelAnimationFrame(botRafRef.current);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────

  return {
    gridSize,
    waterLevel,
    buildings,
    setBuildings,
    harvestedCells,
    discoveredTiles,
    botState,
    droneStates,
    harvestRing,
    loading,

    canBuildAt,
    isHarvestableAt,

    harvestAt,
    startHarvestRing,
    cancelHarvestRing,
    setRoverTarget,
    setBotActive,
    getBuildingAt,

    syncIsotopes,
  };
}
