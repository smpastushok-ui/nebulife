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
import { Application } from 'pixi.js';
import type { Planet, Star, PlacedBuilding, BuildingType, SurfaceObjectType } from '@nebulife/core';
import { HARVEST_DURATION_MS, BUILDING_DEFS, XP_REWARDS, HARVEST_YIELD } from '@nebulife/core';
import { SurfaceScene }  from '../../game/scenes/SurfaceScene.js';
import { SurfacePanel }  from './SurfacePanel.js';
import { getBuildings, placeBuilding } from '../../api/surface-api.js';
import { screenToGrid, TILE_H, gridToScreen, computeIsoGridSize, findMountainCell, findPlainGroundCellFarFrom } from '../../game/scenes/surface-utils.js';

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
  onBuildingPlaced?:        () => void;
  onPhaseChange?:           (phase: SurfacePhase) => void;
  onBuildPanelChange?:      (open: boolean) => void;
  onHarvest?:               (objectType: SurfaceObjectType) => void;
  /** Screen-space (page coords) origin + resource type after ring completes. */
  onHarvestFx?:             (objectType: SurfaceObjectType, sx: number, sy: number) => void;
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
    },
    ref,
  ) {
    const containerRef  = useRef<HTMLDivElement>(null);
    const pixiAppRef    = useRef<Application | null>(null);
    const sceneRef      = useRef<SurfaceScene | null>(null);

    const zoomRef       = useRef(0.6);
    const panRef        = useRef({ x: 0, y: 0 });
    const isDragging    = useRef(false);
    const dragStart     = useRef({ px: 0, py: 0, ox: 0, oy: 0 });
    const dragMoved     = useRef(false);

    const [buildings, setBuildings]             = useState<PlacedBuilding[]>([]);
    const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
    const [showBuildPanel, setShowBuildPanel]   = useState(true);
    const [harvestMode, setHarvestMode]         = useState(false);
    const [roverMode, setRoverMode]             = useState(false);

    // ─── Pan / clamp ──────────────────────────────────────────────────────────

    const clampPan = useCallback(() => {
      const scene = sceneRef.current;
      const app   = pixiAppRef.current;
      if (!scene || !app) return;

      const z     = zoomRef.current;
      const N     = scene.gridSize;
      const cW    = app.screen.width;
      const cH    = app.screen.height;

      // Iso world extents (approximate bounding box)
      const worldW = N * 128 * z;   // TILE_W * z
      const worldH = N * 64  * z;   // TILE_H * z

      panRef.current.x = Math.max(-(worldW * 0.6), Math.min(worldW * 0.6, panRef.current.x));
      panRef.current.y = Math.max(-(worldH * 0.6), Math.min(worldH * 0.6, panRef.current.y));

      scene.worldContainer.position.set(
        cW / 2 + panRef.current.x,
        cH / 4 + panRef.current.y,
      );
    }, []);

    const applyZoom = useCallback((z: number) => {
      zoomRef.current = Math.max(0.15, Math.min(3.0, z));
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

      app.init({
        resizeTo:        container,
        background:      0x020510,
        antialias:       false,
        autoDensity:     true,
        resolution:      window.devicePixelRatio || 1,
        preference:      'webgl',
      }).then(async () => {
        container.appendChild(app.canvas);

        const scene = new SurfaceScene();
        sceneRef.current = scene;
        app.stage.addChild(scene.worldContainer);

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
          const newZ  = Math.max(0.15, Math.min(3.0, oldZ * safeFactor));
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

        // Load buildings from API
        let loaded: PlacedBuilding[] = [];
        try {
          loaded = await getBuildings(playerId, planet.id);
        } catch { /* ignore — start with empty */ }

        // Test: place colony_hub at least 12 cells away from the mountain overlay
        if (loaded.length === 0) {
          const N   = computeIsoGridSize(planet.radiusEarth * 6371);
          const mtn = findMountainCell(planet.seed, N);
          const pos = mtn
            ? findPlainGroundCellFarFrom(planet.seed, N, mtn.col, mtn.row, 12)
            : findPlainGroundCellFarFrom(planet.seed, N, Math.floor(N / 2), Math.floor(N / 2), 0);
          loaded = [{
            id: 'test_hub',
            type: 'colony_hub',
            x: pos.col,
            y: pos.row,
            level: 1,
            builtAt: new Date().toISOString(),
          }];
        }

        setBuildings(loaded);

        await scene.init(planet, star, loaded);

        // Per-frame animation tick for building effects (rings, scanner, blink)
        app.ticker.add((ticker) => {
          if (sceneRef.current) sceneRef.current.update(ticker.deltaMS);
        });

        // Initial zoom centered on the colony hub (or map center if no hub)
        const hubBuilding = loaded.find((b) => b.type === 'colony_hub');
        const hubDef      = hubBuilding ? BUILDING_DEFS[hubBuilding.type] : null;
        const hubCol = hubBuilding ? hubBuilding.x + Math.floor((hubDef?.sizeW ?? 2) / 2) : Math.floor(scene.gridSize / 2);
        const hubRow = hubBuilding ? hubBuilding.y + Math.floor((hubDef?.sizeH ?? 2) / 2) : Math.floor(scene.gridSize / 2);
        const { x: hubWX, y: hubWY } = gridToScreen(hubCol, hubRow);
        const z0 = 0.6;
        const cW0 = app.screen.width;
        const cH0 = app.screen.height;
        panRef.current.x = -(hubWX * z0);
        panRef.current.y = cH0 / 4 - hubWY * z0;
        applyZoom(z0);

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

      // Cancel any in-progress harvest ring on new pointer down
      sceneRef.current?.cancelHarvestRing();
    };

    const handlePointerMove = (e: React.PointerEvent) => {
      // Ghost preview on hover (no drag required)
      if (selectedBuilding && sceneRef.current && !isDragging.current) {
        const scene = sceneRef.current;
        const rect  = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const z     = zoomRef.current;
        const wx    = (e.clientX - rect.left - scene.worldContainer.x) / z;
        const wy    = (e.clientY - rect.top  - scene.worldContainer.y) / z;
        const { col, row } = screenToGrid(wx, wy);
        const valid = scene.canBuildAt(col, row, selectedBuilding, buildings);
        scene.updateGhost(col, row, selectedBuilding, valid);
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

      if (selectedBuilding) {
        // Place building mode
        if (!scene.canBuildAt(col, row, selectedBuilding, buildings)) return;
        const newBuilding: PlacedBuilding = {
          id:      `bld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type:    selectedBuilding,
          x:       col,
          y:       row,
          level:   1,
          builtAt: new Date().toISOString(),
        };
        setBuildings((prev) => [...prev, newBuilding]);
        setSelectedBuilding(null);
        sceneRef.current?.clearGhost();
        onBuildingPlaced?.();
        placeBuilding(playerId, planet.id, newBuilding).catch(console.error);
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
      }
      // else: no building selected, no rover/harvest mode → just pan/zoom
    }, [selectedBuilding, buildings, playerId, planet.id, onBuildingPlaced, roverMode, harvestMode, onHarvest, onHarvestFx]);

    // ─── Imperative handle (CommandBar buttons) ───────────────────────────────

    const toggleHarvest = useCallback(() => {
      setHarvestMode((p) => {
        if (!p) { setSelectedBuilding(null); setRoverMode(false); }
        return !p;
      });
    }, []);

    const toggleRover = useCallback(() => {
      setRoverMode((p) => {
        if (!p) { setSelectedBuilding(null); setHarvestMode(false); }
        return !p;
      });
    }, []);

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

        {/* Building panel */}
        {showBuildPanel && (
          <SurfacePanel
            planet={planet}
            buildings={buildings}
            selectedBuilding={selectedBuilding}
            onSelectBuilding={(type) => {
              setSelectedBuilding(type);
              if (type) { setHarvestMode(false); setRoverMode(false); }
            }}
            onClose={onClose}
            harvestMode={harvestMode}
            onToggleHarvest={toggleHarvest}
            roverMode={roverMode}
            onToggleRover={toggleRover}
          />
        )}
      </div>
    );
  },
);

export default SurfacePixiView;
