/**
 * SurfacePixiView.tsx
 * React wrapper for the PixiJS 2.5D isometric surface scene.
 *
 * Public interface identical to SurfaceBabylonView so App.tsx can swap it with one import line.
 * Handles: PixiJS Application init, zoom/pan, click→build, buildings API, SurfacePanel mount.
 */

import React, {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Application } from 'pixi.js';
import type { Planet, Star, PlacedBuilding, BuildingType, SurfaceObjectType, TechTreeState } from '@nebulife/core';
import { HARVEST_DURATION_MS, BUILDING_DEFS, XP_REWARDS, HARVEST_YIELD } from '@nebulife/core';
import { SurfaceScene }  from '../../game/scenes/SurfaceScene.js';
import { SurfacePanel }          from './SurfacePanel.js';
import BuildingInspectPopup      from './BuildingInspectPopup.js';
import { getBuildings, placeBuilding, removeBuilding } from '../../api/surface-api.js';
import { screenToGrid, TILE_W, TILE_H, gridToScreen, findStartingLandCell, computeIsoGridSize, isMobileDevice } from '../../game/scenes/surface-utils.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SurfacePhase = 'ready' | 'error';

export interface SurfaceViewHandle {
  zoomIn:             () => void;
  zoomOut:            () => void;
  startAIGeneration:  () => void;
  toggleBuildPanel:   () => void;
  toggleMinimap:      () => void;
}

interface SurfacePixiViewProps {
  planet:                   Planet;
  star:                     Star;
  playerId:                 string;
  onClose:                  () => void;
  onBuildingCountChange?:   (count: number) => void;
  onBuildingPlaced?:        (type: BuildingType) => void;
  onPhaseChange?:           (phase: SurfacePhase) => void;
  onBuildPanelChange?:      (open: boolean) => void;
  onHarvest?:               (objectType: SurfaceObjectType) => void;
  /** Screen-space (page coords) origin + resource type after ring completes. */
  onHarvestFx?:             (objectType: SurfaceObjectType, sx: number, sy: number) => void;
  /** Player level for building availability gating. */
  playerLevel?:             number;
  /** Tech tree state for building availability gating. */
  techTreeState?:           TechTreeState;
  /** Current isotope count for drone fuel consumption. */
  isotopes?:                number;
  /** Callback to deduct isotopes (drone movement/harvest). */
  onConsumeIsotopes?:       (amount: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SurfacePixiView = forwardRef<SurfaceViewHandle, SurfacePixiViewProps>(
  function SurfacePixiView(
    {
      planet, star, playerId,
      onClose,
      onBuildingCountChange,
      onBuildingPlaced,
      onPhaseChange,
      onBuildPanelChange,
      onHarvest,
      onHarvestFx,
      playerLevel,
      techTreeState,
      isotopes,
      onConsumeIsotopes,
    },
    ref,
  ) {
    const { t } = useTranslation();
    const containerRef  = useRef<HTMLDivElement>(null);
    const pixiAppRef    = useRef<Application | null>(null);
    const sceneRef      = useRef<SurfaceScene | null>(null);

    const zoomRef       = useRef(0.15); // start at max zoom-out (full overview)
    const panRef        = useRef({ x: 0, y: 0 });
    const isDragging    = useRef(false);
    const dragStart     = useRef({ px: 0, py: 0, ox: 0, oy: 0 });
    const dragMoved     = useRef(false);

    const [buildings, setBuildings]             = useState<PlacedBuilding[]>([]);
    const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
    const [showBuildPanel, setShowBuildPanel]   = useState(true);
    const [harvestMode, setHarvestMode]         = useState(false);
    const [roverMode, setRoverMode]             = useState(false);

    // ─── 2-step building placement (mobile) ──────────────────────────────────
    const [pendingPlacement, setPendingPlacement] = useState<{
      type: BuildingType; col: number; row: number; moving: boolean;
    } | null>(null);

    // ─── Building inspect + demolish state ───────────────────────────────────
    const [inspectBuilding, setInspectBuilding]   = useState<PlacedBuilding | null>(null);
    const [inspectPos, setInspectPos]             = useState({ x: 0, y: 0 });
    const [demolishConfirm, setDemolishConfirm]   = useState<PlacedBuilding | null>(null);
    const demolishingIds = useRef<Set<string>>(new Set());

    // ─── Drone control popup state ────────────────────────────────────────────
    type DronePopupData =
      | { type: 'bot'; screenX: number; screenY: number }
      | { type: 'harvester'; index: number; screenX: number; screenY: number };
    const [dronePopup, setDronePopup] = useState<DronePopupData | null>(null);

    // ─── Isotope fuel for drones ────────────────────────────────────────────
    const isotopesRef      = useRef(isotopes ?? 0);
    const consumeIsoRef    = useRef(onConsumeIsotopes);
    isotopesRef.current    = isotopes ?? 0;
    consumeIsoRef.current  = onConsumeIsotopes;

    // ─── Pan / clamp ──────────────────────────────────────────────────────────

    const clampPan = useCallback(() => {
      const scene = sceneRef.current;
      const app   = pixiAppRef.current;
      if (!scene || !app) return;

      const z  = zoomRef.current;
      const N  = scene.gridSize;
      const cW = app.screen.width;
      const cH = app.screen.height;

      // ── Iso diamond extents in screen pixels ──────────────────────────────
      // X: diamond spans ±(N-1)*TW2 from origin (left/right vertices)
      // Y: diamond spans 0 … 2*(N-1)*TH2 from origin (top vertex → bottom vertex)
      const halfW = (N - 1) * (TILE_W / 2) * z;   // e.g. 63 * 64 * z
      const gridH = 2 * (N - 1) * (TILE_H / 2) * z; // e.g. 2 * 63 * 40 * z

      // X: 10% padding beyond map edge (tighter than 50% to prevent seeing white/dark void)
      const padX = cW * 0.1;
      panRef.current.x = Math.max(-(halfW + padX), Math.min(halfW + padX, panRef.current.x));

      // Y: worldContainer baseline is cH/4 (grid origin at screen y = cH/4 + panY).
      // Use 35% padding — guarantees panYMin ≤ panYMax (simplifies to -gridH ≤ 0).
      const padY = cH * 0.35;
      const panYMax = padY;
      const panYMin = -(gridH - cH * 0.35);
      panRef.current.y = Math.max(panYMin, Math.min(panYMax, panRef.current.y));

      scene.worldContainer.position.set(
        cW / 2 + panRef.current.x,
        cH / 4 + panRef.current.y,
      );
    }, []);

    const applyZoom = useCallback((z: number) => {
      // Limit zoom-in: desktop >= 25 tiles/row, mobile (<640px) >= 18 tiles/row; TW2=64px per tile
      const cW2 = pixiAppRef.current?.screen.width ?? 1280;
      const tileCount = cW2 < 640 ? 18 : 25;
      const maxZoom = cW2 / (tileCount * 64);
      zoomRef.current = Math.max(0.15, Math.min(maxZoom, z));
      if (sceneRef.current) {
        sceneRef.current.worldContainer.scale.set(zoomRef.current);
        clampPan();
      }
    }, [clampPan]);

    // ─── PixiJS init ──────────────────────────────────────────────────────────

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const app = new Application();
      pixiAppRef.current = app;

      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      app.init({
        resizeTo:        container,
        background:      0x020510,
        antialias:       false,
        autoDensity:     true,
        resolution:      Math.min(window.devicePixelRatio || 1, isTouchDevice ? 1.0 : 1.5),
        preference:      'webgl',
      }).then(async () => {
        container.appendChild(app.canvas);

        const scene = new SurfaceScene();
        sceneRef.current = scene;
        app.stage.addChild(scene.worldContainer);

        // Hide until zoom/pan are set to prevent close-up flash on entry
        scene.worldContainer.visible = false;

        // Scroll-to-zoom towards the cursor position.
        // Math.pow(0.999, deltaY): mouse wheel (deltaY≈100) → ~10% per click; trackpad (deltaY≈3) → ~0.3%.
        // Clamped to ±8% per event so it never jumps from min to max in one tick.
        container.addEventListener('wheel', (e) => {
          e.preventDefault();
          const app = pixiAppRef.current;
          if (!app) return;

          const rawFactor  = Math.pow(0.999, e.deltaY);
          const safeFactor = Math.max(0.92, Math.min(1.08, rawFactor));
          const oldZ  = zoomRef.current;
          const tileCount = app.screen.width < 640 ? 18 : 25;
          const newZ  = Math.max(0.15, Math.min(app.screen.width / (tileCount * 64), oldZ * safeFactor));
          if (newZ === oldZ) return;

          // Cursor position relative to container
          const rect  = container.getBoundingClientRect();
          const mx    = e.clientX - rect.left;
          const my    = e.clientY - rect.top;

          // World-space origin is rendered at (cW/2 + panX, cH/4 + panY).
          // The world point under the cursor must stay at (mx, my) after zoom.
          // mx = originX + worldPt.x * newZ  →  worldPt.x = (mx - originX) / oldZ
          // newOriginX = mx - worldPt.x * newZ
          // newPanX = newOriginX - cW/2
          const cW    = app.screen.width;
          const cH    = app.screen.height;
          const originX = cW / 2 + panRef.current.x;
          const originY = cH / 4 + panRef.current.y;
          panRef.current.x = mx - (mx - originX) / oldZ * newZ - cW / 2;
          panRef.current.y = my - (my - originY) / oldZ * newZ - cH / 4;

          zoomRef.current = newZ;
          if (sceneRef.current) {
            sceneRef.current.worldContainer.scale.set(newZ);
            clampPan();
          }
        }, { passive: false });

        // TEMP: skip texture preload for performance test (green background mode)
        // const texturePreload = scene.preloadTextures(planet, star);
        const texturePreload = Promise.resolve(new Array(24).fill(null) as (null)[]);

        // Load buildings from API (texture download happens concurrently)
        let loaded: PlacedBuilding[] = [];
        try {
          loaded = await getBuildings(playerId, planet.id);
        } catch { /* ignore — start with empty */ }

        // First visit: auto-place Colony Hub so the player starts with a base + drone
        if (loaded.length === 0) {
          const wl = planet.hydrosphere?.waterCoverageFraction ?? 0;
          const gridN = computeIsoGridSize(planet.radiusEarth * 6371);
          const start = findStartingLandCell(planet.seed, wl, gridN);
          const autoHub: PlacedBuilding = {
            id:      `bld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type:    'colony_hub',
            x:       start.col,
            y:       start.row,
            level:   1,
            builtAt: new Date().toISOString(),
          };
          loaded = [autoHub];
          // Save to DB with retry on failure
          placeBuilding(playerId, planet.id, autoHub).catch(() => {
            setTimeout(() => placeBuilding(playerId, planet.id, autoHub).catch(console.error), 2000);
          });
        }

        setBuildings(loaded);

        await scene.init(planet, star, loaded, texturePreload);

        // Wire isotope consumption callback for drone fuel
        scene.setConsumeIsotopesCallback((amount) => {
          if (isotopesRef.current < amount) return false;
          consumeIsoRef.current?.(amount);
          isotopesRef.current = Math.max(0, isotopesRef.current - amount);
          return true;
        });

        // Per-frame animation tick for building effects (rings, scanner, blink)
        app.ticker.add((ticker) => {
          if (sceneRef.current) sceneRef.current.update(ticker.deltaMS);
        });

        // Initial zoom centered on the colony hub (hub always exists — auto-placed above if first visit)
        const hubBuilding = loaded.find((b) => b.type === 'colony_hub');
        const hubDef      = hubBuilding ? BUILDING_DEFS[hubBuilding.type] : null;
        let hubCol: number, hubRow: number;
        if (hubBuilding) {
          hubCol = hubBuilding.x + Math.floor((hubDef?.sizeW ?? 2) / 2);
          hubRow = hubBuilding.y + Math.floor((hubDef?.sizeH ?? 2) / 2);
        } else {
          // Fallback (should not happen — hub is auto-placed above)
          const wl = planet.hydrosphere?.waterCoverageFraction ?? 0;
          const start = findStartingLandCell(planet.seed, wl, scene.gridSize);
          hubCol = start.col;
          hubRow = start.row;
          scene.revealStartingArea(start.col, start.row, 15);
        }
        const { x: hubWX, y: hubWY } = gridToScreen(hubCol, hubRow);
        const z0 = 0.15; // start at max zoom-out (full planet overview)
        const cW0 = app.screen.width;
        const cH0 = app.screen.height;
        panRef.current.x = -(hubWX * z0);
        panRef.current.y = cH0 / 4 - hubWY * z0;
        applyZoom(z0);

        // Show after zoom/pan are set — prevents close-up flash
        scene.worldContainer.visible = true;

        onPhaseChange?.('ready');
      }).catch(() => {
        onPhaseChange?.('error');
      });

      return () => {
        sceneRef.current?.destroy();
        sceneRef.current = null;
        app.destroy(true, { children: true });
        pixiAppRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planet.id]);

    // ─── Sync isotope state → scene ────────────────────────────────────────────

    useEffect(() => {
      if (!sceneRef.current) return;
      const hasSolar = buildings.some((b) => b.type === 'solar_plant' && !b.shutdown);
      sceneRef.current.setIsotopeState(isotopes ?? 0, hasSolar);
    }, [isotopes, buildings]);

    // ─── Sync buildings → scene ───────────────────────────────────────────────

    useEffect(() => {
      if (!sceneRef.current) return;
      sceneRef.current.rebuildBuildings(buildings);
      onBuildingCountChange?.(buildings.length);
    }, [buildings, onBuildingCountChange]);

    // ─── Sync selection → overlay + ghost ────────────────────────────────────

    useEffect(() => {
      if (!sceneRef.current) return;
      sceneRef.current.updateZoneOverlay(selectedBuilding, buildings);
      if (!selectedBuilding) sceneRef.current.clearGhost();
    }, [selectedBuilding, buildings]);

    // ─── Panel open state ─────────────────────────────────────────────────────

    useEffect(() => {
      onBuildPanelChange?.(showBuildPanel);
    }, [showBuildPanel, onBuildPanelChange]);

    // ─── Escape key → deselect building ──────────────────────────────────────

    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (pendingPlacement) {
            setPendingPlacement(null);
            setSelectedBuilding(null);
            sceneRef.current?.clearGhost();
          } else if (selectedBuilding) {
            setSelectedBuilding(null);
            sceneRef.current?.clearGhost();
          }
        }
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedBuilding, pendingPlacement]);

    // ─── Pointer events (pan + drag) ──────────────────────────────────────────

    const handlePointerDown = (e: React.PointerEvent) => {
      isDragging.current = true;
      dragMoved.current  = false;
      dragStart.current  = {
        px: e.clientX,
        py: e.clientY,
        ox: panRef.current.x,
        oy: panRef.current.y,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      // Close inspect/drone popup when user starts dragging
      setInspectBuilding(null);
      setDronePopup(null);
      // NOTE: harvest ring is cancelled only when the pointer actually drags (see handlePointerMove).
      // A simple tap/click does NOT cancel an active harvest.
    };

    const handlePointerMove = (e: React.PointerEvent) => {
      // Ghost preview on hover — skip when pending placement is fixed (not in move mode)
      if (selectedBuilding && sceneRef.current && !isDragging.current && !pendingPlacement) {
        const scene = sceneRef.current;
        const rect  = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const z     = zoomRef.current;
        const wx    = (e.clientX - rect.left - scene.worldContainer.x) / z;
        const wy    = (e.clientY - rect.top  - scene.worldContainer.y) / z;
        const { col, row } = screenToGrid(wx, wy);
        const valid = scene.canBuildAt(col, row, selectedBuilding, buildings);
        scene.updateGhost(col, row, selectedBuilding, valid);
      }
      // Move mode — ghost follows pointer across valid zones
      if (pendingPlacement?.moving && sceneRef.current && !isDragging.current) {
        const scene = sceneRef.current;
        const rect  = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const z     = zoomRef.current;
        const wx    = (e.clientX - rect.left - scene.worldContainer.x) / z;
        const wy    = (e.clientY - rect.top  - scene.worldContainer.y) / z;
        const { col, row } = screenToGrid(wx, wy);
        const valid = scene.canBuildAt(col, row, pendingPlacement.type, buildings);
        scene.updateGhost(col, row, pendingPlacement.type, valid);
      }

      if (!isDragging.current) return;
      const dx = e.clientX - dragStart.current.px;
      const dy = e.clientY - dragStart.current.py;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved.current = true;
      panRef.current.x = dragStart.current.ox + dx;
      panRef.current.y = dragStart.current.oy + dy;
      clampPan();

      if (dragMoved.current) {
        sceneRef.current?.cancelHarvestRing();
        sceneRef.current?.clearGhost();
      }
    };

    const handlePointerUp = () => {
      isDragging.current = false;
    };

    // ─── Click → build or harvest ─────────────────────────────────────────────

    const handleClick = useCallback((e: React.MouseEvent) => {
      const scene = sceneRef.current;
      if (!scene) return;

      // Ignore clicks that were drags
      if (dragMoved.current) return;

      // Close drone popup on any canvas click
      setDronePopup(null);

      // Convert screen coords to world-container local space
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const z    = zoomRef.current;
      const wx   = (e.clientX - rect.left - scene.worldContainer.x) / z;
      const wy   = (e.clientY - rect.top  - scene.worldContainer.y) / z;

      // World → grid: gridToScreen(col,row).y = (col+row)*TH/2 = diamond center.
      // No offset needed — screenToGrid correctly maps any point in the diamond to (col,row).
      const { col, row } = screenToGrid(wx, wy);
      const N = scene.gridSize;
      if (col < 0 || col >= N || row < 0 || row >= N) return;

      if (pendingPlacement?.moving) {
        // Moving scaffold — relocate to new valid position
        if (scene.canBuildAt(col, row, pendingPlacement.type, buildings)) {
          setPendingPlacement({ ...pendingPlacement, col, row, moving: false });
          scene.updateGhost(col, row, pendingPlacement.type, true);
        }
        return;
      }

      if (selectedBuilding) {
        // Place building mode — 2-step: first click → show scaffold + buttons
        if (!scene.canBuildAt(col, row, selectedBuilding, buildings)) {
          // Invalid zone — deselect building
          setSelectedBuilding(null);
          setPendingPlacement(null);
          sceneRef.current?.clearGhost();
          return;
        }
        // Fix ghost at this position and show confirm/move buttons
        scene.updateGhost(col, row, selectedBuilding, true);
        setPendingPlacement({ type: selectedBuilding, col, row, moving: false });
      } else if (roverMode) {
        // Drone explorer — send drone to clicked cell
        scene.setRoverTarget(col, row);
      } else if (harvestMode) {
        // Harvest mode — check if cell is harvestable, start progress ring
        const objectType = scene.isHarvestableAt(col, row);
        if (!objectType) return;

        scene.startHarvestRing(col, row, HARVEST_DURATION_MS, () => {
          // Determine type before harvest so texture is still original
          const objectType = scene.isHarvestableAt(col, row);
          if (!objectType) return;

          // Trigger particle + sprite-collapse effects (before ground layer rebuilds)
          scene.triggerDestructionEffect(col, row, objectType);

          // Harvest — updates game state, rebuilds ground layer with depleted sprite
          const harvested = scene.harvestAt(col, row);
          if (!harvested) return;

          scene.showFloatingText(col, row, `+${HARVEST_YIELD[harvested].base}`, 0x44ff88);
          const xpKey = harvested === 'tree' ? 'HARVEST_TREE' : harvested === 'ore' ? 'HARVEST_ORE' : 'HARVEST_VENT';
          scene.showXPText(col, row, XP_REWARDS[xpKey]);

          // Screen-space position of cell centre for fly-to-HUD animation
          if (onHarvestFx) {
            const { x: wx, y: wy } = scene.getWorldPos(col, row);
            const z    = zoomRef.current;
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
              const sx = scene.worldContainer.x + wx * z + rect.left;
              const sy = scene.worldContainer.y + wy * z + rect.top;
              onHarvestFx(harvested, sx, sy);
            }
          }

          onHarvest?.(harvested);
        });
      } else {
        // Check drone/bot click first
        const droneHit = scene.getClickedDrone(wx, wy);
        if (droneHit) {
          const rect2 = containerRef.current?.getBoundingClientRect();
          if (rect2) {
            const sx = scene.worldContainer.x + wx * z + rect2.left;
            const sy = scene.worldContainer.y + wy * z + rect2.top;
            if (droneHit.type === 'bot') {
              setDronePopup({ type: 'bot', screenX: sx, screenY: sy });
            } else {
              setDronePopup({ type: 'harvester', index: droneHit.index, screenX: sx, screenY: sy });
            }
            setInspectBuilding(null);
          }
          return;
        }

        // Inspect mode — check if click lands on a placed building
        const hit = scene.getBuildingAt(wx, wy, buildings);
        if (hit) {
          const rect2 = containerRef.current?.getBoundingClientRect();
          if (rect2) {
            const TW2 = TILE_W / 2; const TH2 = TILE_H / 2;
            const sW  = BUILDING_DEFS[hit.type]?.sizeW ?? 1;
            const sH  = BUILDING_DEFS[hit.type]?.sizeH ?? 1;
            const bWX = (hit.x + sW / 2 - hit.y - sH / 2) * TW2;
            const bWY = (hit.x + sW / 2 + hit.y + sH / 2) * TH2;
            const sx  = scene.worldContainer.x + bWX * z + rect2.left;
            const sy  = scene.worldContainer.y + bWY * z + rect2.top;
            setInspectPos({ x: sx, y: sy });
            setInspectBuilding(hit);
            setDronePopup(null);
          }
        }
      }
    }, [selectedBuilding, buildings, playerId, planet.id, onBuildingPlaced, roverMode, harvestMode, onHarvest, onHarvestFx, pendingPlacement]);

    // ─── Placement confirm / cancel / move ──────────────────────────────────

    const handleConfirmPlacement = useCallback(() => {
      if (!pendingPlacement || !sceneRef.current) return;
      const { type, col, row } = pendingPlacement;
      const newBuilding: PlacedBuilding = {
        id:      `bld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type,
        x:       col,
        y:       row,
        level:   1,
        builtAt: new Date().toISOString(),
      };
      setBuildings((prev) => [...prev, newBuilding]);
      setSelectedBuilding(null);
      setPendingPlacement(null);
      sceneRef.current?.clearGhost();
      onBuildingPlaced?.(newBuilding.type);
      placeBuilding(playerId, planet.id, newBuilding).catch(() => {
        setTimeout(() => placeBuilding(playerId, planet.id, newBuilding).catch(console.error), 2000);
      });
      if (newBuilding.type === 'colony_hub') sceneRef.current?.spawnBotAtHub(newBuilding);
      if (newBuilding.type === 'alpha_harvester') sceneRef.current?.spawnHarvesterDrone(newBuilding);
    }, [pendingPlacement, playerId, planet.id, onBuildingPlaced]);

    const handleCancelPlacement = useCallback(() => {
      setPendingPlacement(null);
      setSelectedBuilding(null);
      sceneRef.current?.clearGhost();
    }, []);

    const handleMovePlacement = useCallback(() => {
      if (!pendingPlacement) return;
      setPendingPlacement({ ...pendingPlacement, moving: true });
    }, [pendingPlacement]);

    // ─── Imperative handle (CommandBar buttons) ───────────────────────────────

    const toggleHarvest = useCallback(() => {
      setHarvestMode((p) => {
        if (!p) { setSelectedBuilding(null); setRoverMode(false); }
        return !p;
      });
    }, []);

    // ─── Demolish confirm ─────────────────────────────────────────────────────

    const handleDemolishConfirm = useCallback(() => {
      if (!demolishConfirm || !sceneRef.current) return;
      const b = demolishConfirm;
      demolishingIds.current.add(b.id);
      setDemolishConfirm(null);
      sceneRef.current.startDemolish(b, () => {
        demolishingIds.current.delete(b.id);
        sceneRef.current?.stopDemolish(b.id);
        setBuildings((prev) => prev.filter((x) => x.id !== b.id));
        removeBuilding(playerId, b.id).catch(console.error);
      });
    }, [demolishConfirm, playerId]);

    useImperativeHandle(ref, () => ({
      zoomIn:            () => applyZoom(zoomRef.current * 1.22),
      zoomOut:           () => applyZoom(zoomRef.current * 0.82),
      startAIGeneration: () => { /* future */ },
      toggleBuildPanel:  () => setShowBuildPanel((p) => !p),
      toggleMinimap:     () => { /* future */ },
    }), [applyZoom]);

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
      <div
        style={{
          position:   'fixed',
          inset:      0,
          zIndex:     9000,
          background: '#020510',
          overflow:   'hidden',
        }}
      >
        {/* PixiJS canvas mount point */}
        <div
          ref={containerRef}
          style={{
            width:   '100%',
            height:  '100%',
            cursor:  selectedBuilding ? 'crosshair' : harvestMode ? 'cell' : roverMode ? 'crosshair' : isDragging.current ? 'grabbing' : 'grab',
          }}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => { handlePointerUp(); sceneRef.current?.clearGhost(); }}
        />

        {/* 2-step placement: confirm / move / cancel buttons near scaffold */}
        {pendingPlacement && !pendingPlacement.moving && sceneRef.current && (() => {
          const scene = sceneRef.current!;
          const z = zoomRef.current;
          const { x: wx, y: wy } = gridToScreen(pendingPlacement.col, pendingPlacement.row);
          const sx = scene.worldContainer.x + wx * z;
          const sy = scene.worldContainer.y + (wy + TILE_H / 2) * z;
          const btnBase: React.CSSProperties = {
            padding: '8px 16px', borderRadius: 3, fontFamily: 'monospace',
            fontSize: 12, cursor: 'pointer', fontWeight: 'bold', border: 'none',
          };
          return (
            <div style={{
              position: 'absolute', left: sx, top: sy + 8,
              transform: 'translateX(-50%)',
              display: 'flex', gap: 6, zIndex: 11000, pointerEvents: 'auto',
            }}>
              <button
                onClick={handleMovePlacement}
                style={{
                  ...btnBase,
                  background: 'rgba(8,14,24,0.94)',
                  border: '1px solid #446688',
                  color: '#7bb8ff',
                }}
              >
                {t('surface.placement_move', 'Рухати')}
              </button>
              <button
                onClick={handleConfirmPlacement}
                style={{
                  ...btnBase,
                  background: 'rgba(20,60,30,0.9)',
                  border: '1px solid #44ff88',
                  color: '#88ffaa',
                }}
              >
                {t('surface.placement_confirm', 'Будувати')}
              </button>
              <button
                onClick={handleCancelPlacement}
                style={{
                  ...btnBase,
                  background: 'rgba(8,14,24,0.94)',
                  border: '1px solid #556677',
                  color: '#556677',
                  padding: '8px 10px',
                }}
              >
                x
              </button>
            </div>
          );
        })()}

        {/* Moving mode hint */}
        {pendingPlacement?.moving && (
          <div style={{
            position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(5,15,25,0.92)',
            border: '1px solid rgba(68,136,170,0.4)',
            borderRadius: 4, padding: '6px 14px',
            fontFamily: 'monospace', fontSize: 11, color: '#7bb8ff',
            display: 'flex', alignItems: 'center', gap: 10,
            pointerEvents: 'auto', whiteSpace: 'nowrap', zIndex: 11000,
          }}>
            <span style={{ color: '#aabbcc' }}>{t('surface.placement_move_hint', 'Виберiть нову позицiю')}</span>
            <button
              onClick={handleCancelPlacement}
              style={{
                background: 'none', border: 'none', color: '#556677',
                fontSize: 14, cursor: 'pointer', fontFamily: 'monospace',
                padding: '0 2px', lineHeight: 1,
              }}
            >
              x
            </button>
          </div>
        )}

        {/* Building panel */}
        {showBuildPanel && (
          <SurfacePanel
            planet={planet}
            buildings={buildings}
            selectedBuilding={selectedBuilding}
            onSelectBuilding={(type) => {
              setSelectedBuilding(type);
              setPendingPlacement(null);
              setDronePopup(null);
              if (type) { setHarvestMode(false); setRoverMode(false); }
            }}
            onClose={onClose}
            harvestMode={harvestMode}
            onToggleHarvest={toggleHarvest}
            playerLevel={playerLevel ?? 1}
            techTreeState={techTreeState}
          />
        )}

        {/* Building inspect popup */}
        {inspectBuilding && (
          <BuildingInspectPopup
            building={inspectBuilding}
            screenX={inspectPos.x}
            screenY={inspectPos.y}
            isDemolishing={demolishingIds.current.has(inspectBuilding.id)}
            onClose={() => setInspectBuilding(null)}
            onDemolish={() => {
              setDemolishConfirm(inspectBuilding);
              setInspectBuilding(null);
            }}
          />
        )}

        {/* Drone control popup */}
        {dronePopup && sceneRef.current && (() => {
          const scene = sceneRef.current!;
          const isBot = dronePopup.type === 'bot';
          const isActive = isBot
            ? scene.getBotActive()
            : scene.getDroneActive((dronePopup as { index: number }).index);
          const filter = !isBot
            ? scene.getDroneResourceFilter((dronePopup as { index: number }).index)
            : null;

          const btnStyle: React.CSSProperties = {
            width: '100%', padding: '6px 0',
            borderRadius: 3, fontFamily: 'monospace', fontSize: 11,
            cursor: 'pointer', textAlign: 'center',
          };
          const toggleFilter = (key: string) => {
            if (!filter) return;
            const idx = (dronePopup as { index: number }).index;
            const next = new Set(filter);
            if (next.has(key)) { if (next.size > 1) next.delete(key); } else next.add(key);
            scene.setDroneResourceFilter(idx, next);
            setDronePopup({ ...dronePopup } as DronePopupData);  // force re-render
          };

          return (
            <div style={{
              position: 'fixed',
              left: Math.max(8, dronePopup.screenX - 100),
              top: Math.max(8, dronePopup.screenY - 180),
              width: 200,
              background: 'rgba(8,14,24,0.96)',
              border: '1px solid #334455',
              borderRadius: 4,
              fontFamily: 'monospace',
              zIndex: 11500,
              boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            }}>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 10px 6px', borderBottom: '1px solid #1e2d3d',
              }}>
                <div style={{ color: '#aabbcc', fontSize: 11, fontWeight: 'bold' }}>
                  {isBot ? t('surface.drone_explorer') : t('surface.harvester')}
                </div>
                <button
                  onClick={() => setDronePopup(null)}
                  style={{
                    background: 'none', border: 'none', color: '#556677',
                    cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 0 0 6px', fontFamily: 'monospace',
                  }}
                >x</button>
              </div>

              {/* Body */}
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: isActive ? '#44ff88' : '#cc4444', marginBottom: 8 }}>
                  {isActive ? t('surface.drone_active') : t('surface.drone_stopped')}
                </div>

                {/* Toggle active */}
                <button
                  onClick={() => {
                    if (isBot) scene.setBotActive(!isActive);
                    else scene.setDroneActive((dronePopup as { index: number }).index, !isActive);
                    setDronePopup({ ...dronePopup } as DronePopupData);
                  }}
                  style={{
                    ...btnStyle, marginBottom: 6,
                    background: isActive ? 'rgba(160,100,20,0.5)' : 'rgba(20,100,60,0.5)',
                    border: `1px solid ${isActive ? '#ff8844' : '#44ff88'}`,
                    color: isActive ? '#ffcc88' : '#88ffaa',
                  }}
                >
                  {isActive ? t('surface.drone_stop') : t('surface.drone_start')}
                </button>

                {/* Bot: Send to location button */}
                {isBot && isActive && (
                  <button
                    onClick={() => {
                      setDronePopup(null);
                      setRoverMode(true);
                      setSelectedBuilding(null);
                      setHarvestMode(false);
                    }}
                    style={{
                      ...btnStyle,
                      background: 'rgba(40,80,140,0.3)',
                      border: '1px solid rgba(68,136,170,0.5)',
                      color: '#aaccee',
                    }}
                  >
                    {t('surface.drone_send_scout')}
                  </button>
                )}

                {/* Harvester: resource filter */}
                {!isBot && filter && (
                  <>
                    <div style={{
                      fontSize: 9, color: '#556677', letterSpacing: '0.5px',
                      marginTop: 8, marginBottom: 6, borderTop: '1px solid #1e2d3d', paddingTop: 8,
                    }}>
                      {t('surface.resources').toUpperCase()}
                    </div>
                    {[
                      { key: 'tree', label: t('surface.resource_tree'), color: '#88aa44' },
                      { key: 'ore',  label: t('surface.resource_ore'),  color: '#aa8855' },
                      { key: 'vent', label: t('surface.resource_vent'), color: '#55aaaa' },
                    ].map(({ key, label, color }) => (
                      <button
                        key={key}
                        onClick={() => toggleFilter(key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          width: '100%', padding: '4px 6px', marginBottom: 2,
                          background: filter.has(key) ? 'rgba(30,50,40,0.5)' : 'transparent',
                          border: `1px solid ${filter.has(key) ? color + '66' : '#1e2d3d'}`,
                          borderRadius: 3, cursor: 'pointer', fontFamily: 'monospace',
                          color: filter.has(key) ? color : '#334455', fontSize: 11,
                        }}
                      >
                        <span style={{ width: 14, textAlign: 'center' }}>
                          {filter.has(key) ? '+' : '-'}
                        </span>
                        {label}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* Rover mode HUD (activated from bot popup) */}
        {roverMode && !selectedBuilding && (
          <div style={{
            position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(5,15,25,0.92)',
            border: '1px solid rgba(68,170,255,0.3)',
            borderRadius: 4, padding: '6px 14px',
            fontFamily: 'monospace', fontSize: 11, color: '#4488aa',
            display: 'flex', alignItems: 'center', gap: 10,
            pointerEvents: 'auto', whiteSpace: 'nowrap', zIndex: 10,
          }}>
            <span style={{ color: '#44aaff', fontSize: 13, lineHeight: 1 }}>*</span>
            <span style={{ color: '#aabbcc' }}>{t('surface.drone_explorer')}</span>
            <span style={{ color: '#445566' }}>---</span>
            <span style={{ color: '#556677' }}>{t('surface.rover_mode_hint')}</span>
            <button
              onClick={() => setRoverMode(false)}
              style={{
                background: 'none', border: 'none', color: '#556677',
                fontSize: 14, cursor: 'pointer', fontFamily: 'monospace',
                padding: '0 2px', lineHeight: 1,
              }}
            >
              x
            </button>
          </div>
        )}

        {/* Demolish confirmation modal */}
        {demolishConfirm && (
          <div
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
              zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={() => setDemolishConfirm(null)}
          >
            <div
              style={{
                background: 'rgba(8,14,24,0.97)', border: '1px solid #cc2222',
                borderRadius: 6, padding: '24px 28px', width: 340, fontFamily: 'monospace',
              }}
              onClick={(ev) => ev.stopPropagation()}
            >
              <div style={{ color: '#cc4444', fontSize: 13, marginBottom: 10, fontWeight: 'bold' }}>
                {t('surface.demolish_warning_title')}
              </div>
              <div style={{ color: '#aabbcc', fontSize: 12, lineHeight: 1.65, marginBottom: 20 }}>
                {t('surface.demolish_warning_body')}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setDemolishConfirm(null)}
                  style={{
                    padding: '7px 16px', background: 'transparent',
                    border: '1px solid #446688', borderRadius: 3,
                    color: '#7bb8ff', fontFamily: 'monospace', cursor: 'pointer', fontSize: 11,
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDemolishConfirm}
                  style={{
                    padding: '7px 16px', background: 'rgba(180,20,20,0.9)',
                    border: '1px solid #ff4444', borderRadius: 3,
                    color: '#fff', fontFamily: 'monospace', cursor: 'pointer', fontSize: 11,
                  }}
                >
                  {t('surface.demolish_confirm_btn')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

export default SurfacePixiView;
