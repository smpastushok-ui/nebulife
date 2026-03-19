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
import type { Planet, Star, PlacedBuilding, BuildingType } from '@nebulife/core';
import { SurfaceScene }  from '../../game/scenes/SurfaceScene.js';
import { SurfacePanel }  from './SurfacePanel.js';
import { getBuildings, placeBuilding } from '../../api/surface-api.js';
import { screenToGrid, TILE_H } from '../../game/scenes/surface-utils.js';

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

    const [buildings, setBuildings]             = useState<PlacedBuilding[]>([]);
    const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
    const [showBuildPanel, setShowBuildPanel]   = useState(true);

    // ─── Pan / clamp ──────────────────────────────────────────────────────────

    const clampPan = useCallback(() => {
      const scene = sceneRef.current;
      const app   = pixiAppRef.current;
      if (!scene || !app) return;

      const z     = zoomRef.current;
      const N     = scene.gridSize;
      const cW    = app.canvas.width;
      const cH    = app.canvas.height;

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

        // Scroll-to-zoom
        container.addEventListener('wheel', (e) => {
          e.preventDefault();
          const delta = e.deltaY > 0 ? 0.88 : 1.14;
          applyZoom(zoomRef.current * delta);
        }, { passive: false });

        // Load buildings from API
        let loaded: PlacedBuilding[] = [];
        try {
          loaded = await getBuildings(playerId, planet.id);
        } catch { /* ignore — start with empty */ }

        setBuildings(loaded);

        await scene.init(planet, star, loaded);

        // Initial zoom so the map is comfortable to see
        applyZoom(0.6);

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

    // ─── Sync selection → overlay ─────────────────────────────────────────────

    useEffect(() => {
      if (!sceneRef.current) return;
      sceneRef.current.updateZoneOverlay(selectedBuilding, buildings);
    }, [selectedBuilding, buildings]);

    // ─── Panel open state ─────────────────────────────────────────────────────

    useEffect(() => {
      onBuildPanelChange?.(showBuildPanel);
    }, [showBuildPanel, onBuildPanelChange]);

    // ─── Pointer events (pan + drag) ──────────────────────────────────────────

    const handlePointerDown = (e: React.PointerEvent) => {
      isDragging.current = true;
      dragStart.current  = {
        px: e.clientX,
        py: e.clientY,
        ox: panRef.current.x,
        oy: panRef.current.y,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      panRef.current.x = dragStart.current.ox + (e.clientX - dragStart.current.px);
      panRef.current.y = dragStart.current.oy + (e.clientY - dragStart.current.py);
      clampPan();
    };

    const handlePointerUp = () => {
      isDragging.current = false;
    };

    // ─── Click → build ────────────────────────────────────────────────────────

    const handleClick = useCallback((e: React.MouseEvent) => {
      if (!selectedBuilding) return;
      const scene = sceneRef.current;
      const app   = pixiAppRef.current;
      if (!scene || !app) return;

      // Convert screen coords to world-container local space
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const z    = zoomRef.current;
      const wx   = (e.clientX - rect.left - scene.worldContainer.x) / z;
      const wy   = (e.clientY - rect.top  - scene.worldContainer.y) / z;

      // World → grid (anchor is bottom-center so subtract TILE_H/2)
      const { col, row } = screenToGrid(wx, wy - TILE_H / 2);

      const N = scene.gridSize;
      if (col < 0 || col >= N || row < 0 || row >= N) return;
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
      onBuildingPlaced?.();

      placeBuilding(playerId, planet.id, newBuilding).catch(console.error);
    }, [selectedBuilding, buildings, playerId, planet.id, onBuildingPlaced]);

    // ─── Imperative handle (CommandBar buttons) ───────────────────────────────

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
            cursor:  selectedBuilding ? 'crosshair' : isDragging.current ? 'grabbing' : 'grab',
          }}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />

        {/* Building panel */}
        {showBuildPanel && (
          <SurfacePanel
            planet={planet}
            buildings={buildings}
            selectedBuilding={selectedBuilding}
            onSelectBuilding={setSelectedBuilding}
            onClose={onClose}
          />
        )}
      </div>
    );
  },
);

export default SurfacePixiView;
