/**
 * SurfaceSVGView.tsx
 * Main React component for the SVG-based isometric surface view.
 * Replaces SurfacePixiView.tsx — no PixiJS, no canvas.
 *
 * Differences from SurfacePixiView:
 *   - SVG element with viewBox for pan/zoom (no WebGL)
 *   - All game logic in useSurfaceState hook
 *   - Pointer events: drag = pan, click = build/harvest/inspect
 *   - Same public handle interface (zoomIn/zoomOut/panBy/pause/resume/...)
 */

import './surface-animations.css';

import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { useTranslation } from 'react-i18next';
import { playSfx } from '../../../audio/SfxPlayer.js';

import type {
  Planet,
  Star,
  PlacedBuilding,
  BuildingType,
  SurfaceObjectType,
  TechTreeState,
} from '@nebulife/core';
import { BUILDING_DEFS, HARVEST_DURATION_MS, HARVEST_YIELD, XP_REWARDS } from '@nebulife/core';

import { useSurfaceState } from './useSurfaceState';
import { SurfaceRenderer } from './SurfaceRenderer';
import { SurfacePanel } from '../SurfacePanel.js';
import BuildingInspectPopup from '../BuildingInspectPopup.js';
import { SurfaceDPad } from '../SurfaceDPad.js';
import { placeBuilding, removeBuilding } from '../../../api/surface-api.js';
import { gridToSvg, svgToGrid, CELL_W, CELL_H } from './surface-svg-utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SurfacePhase = 'ready' | 'error';

export interface SurfaceViewHandle {
  zoomIn:            () => void;
  zoomOut:           () => void;
  panBy:             (dx: number, dy: number) => void;
  pause:             () => void;
  resume:            () => void;
  startAIGeneration: () => void;
  toggleBuildPanel:  () => void;
  toggleMinimap:     () => void;
}

interface SurfaceSVGViewProps {
  planet:                   Planet;
  star:                     Star;
  playerId:                 string;
  onClose:                  () => void;
  onBuildingCountChange?:   (count: number) => void;
  onBuildingPlaced?:        (type: BuildingType) => void;
  onPhaseChange?:           (phase: SurfacePhase) => void;
  onBuildPanelChange?:      (open: boolean) => void;
  onHarvest?:               (objectType: SurfaceObjectType) => void;
  onHarvestFx?:             (objectType: SurfaceObjectType, sx: number, sy: number) => void;
  playerLevel?:             number;
  techTreeState?:           TechTreeState;
  isotopes?:                number;
  onConsumeIsotopes?:       (amount: number) => void;
}

// ─── ViewBox helpers ──────────────────────────────────────────────────────────

/** Compute the bounding box of all discovered tiles in SVG coordinates. */
function computeDiscoveredBounds(
  discoveredTiles: Set<string>,
  gridToSvgFn: (col: number, row: number) => { x: number; y: number },
  cellW: number,
  cellH: number,
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const key of discoveredTiles) {
    const [col, row] = key.split(',').map(Number);
    const { x, y } = gridToSvgFn(col, row);
    if (x - cellW < minX) minX = x - cellW;
    if (x + cellW > maxX) maxX = x + cellW;
    if (y - cellH < minY) minY = y - cellH;
    if (y + cellH > maxY) maxY = y + cellH;
  }
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 100; maxY = 100; }
  return { minX, minY, maxX, maxY };
}

function clampViewBox(
  vb: { x: number; y: number; w: number; h: number },
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
): { x: number; y: number; w: number; h: number } {
  // Allow 20% overshoot so edges of the discovered area stay reachable
  const padX = vb.w * 0.2;
  const padY = vb.h * 0.2;
  const minX = bounds.minX - padX;
  const maxX = bounds.maxX - vb.w + padX;
  const minY = bounds.minY - padY;
  const maxY = bounds.maxY - vb.h + padY;
  return {
    ...vb,
    x: Math.max(minX, Math.min(maxX, vb.x)),
    y: Math.max(minY, Math.min(maxY, vb.y)),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SurfaceSVGView = forwardRef<SurfaceViewHandle, SurfaceSVGViewProps>(
  function SurfaceSVGView(
    {
      planet,
      star,
      playerId,
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
    const svgRef = useRef<SVGSVGElement>(null);

    // ── Surface state ─────────────────────────────────────────────────────────
    const surface = useSurfaceState(planet, star, playerId);
    const {
      gridSize,
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
      syncIsotopes,
      getBuildingAt,
    } = surface;

    // ── ViewBox ────────────────────────────────────────────────────────────────
    const N = gridSize;
    // Total SVG coordinate span of the iso diamond grid (used for zoom limits)
    const totalW = useMemo(() => N * CELL_W * 2, [N]);
    const totalH = useMemo(() => N * CELL_H * 2, [N]);

    // Bounding box of discovered tiles — drives clampViewBox
    const discoveredBounds = useMemo(
      () => computeDiscoveredBounds(discoveredTiles, gridToSvg, CELL_W, CELL_H),
      // recompute whenever the discovered set size changes (tiles are added but never removed)
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [discoveredTiles.size],
    );

    const [viewBox, setViewBox] = useState(() => ({
      x: -totalW / 2,
      y: -CELL_H,
      w: totalW,
      h: totalH,
    }));

    // ── UI modes ───────────────────────────────────────────────────────────────
    const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
    const [harvestMode, setHarvestMode]           = useState(false);
    const [roverMode, setRoverMode]               = useState(false);
    const [showBuildPanel, setShowBuildPanel]     = useState(true);

    // ── Placement (2-step) ────────────────────────────────────────────────────
    const [pendingPlacement, setPendingPlacement] = useState<{
      type: BuildingType; col: number; row: number; moving: boolean;
    } | null>(null);

    // Ghost position & validity
    const [ghostPosition, setGhostPosition] = useState<{ col: number; row: number } | null>(null);
    const [ghostValid, setGhostValid]       = useState(false);

    // ── Inspect ───────────────────────────────────────────────────────────────
    const [inspectBuilding, setInspectBuilding] = useState<PlacedBuilding | null>(null);
    const [inspectPos, setInspectPos]           = useState({ x: 0, y: 0 });
    const [demolishConfirm, setDemolishConfirm] = useState<PlacedBuilding | null>(null);
    const demolishingIds = useRef<Set<string>>(new Set());

    // ── Drone popup ───────────────────────────────────────────────────────────
    type DronePopupData =
      | { type: 'bot'; screenX: number; screenY: number }
      | { type: 'harvester'; index: number; screenX: number; screenY: number };
    const [dronePopup, setDronePopup] = useState<DronePopupData | null>(null);

    // ── New building tracking (entrance animation) ────────────────────────────
    const [newBuildingId, setNewBuildingId] = useState<string | undefined>(undefined);
    const newBldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Isotopes ref ─────────────────────────────────────────────────────────
    const isotopesRef = useRef(isotopes ?? 0);
    isotopesRef.current = isotopes ?? 0;
    useEffect(() => {
      syncIsotopes(isotopes ?? 0);
    }, [isotopes, syncIsotopes]);

    // ── Hub position (used for emerge delay) ─────────────────────────────────
    const hub = useMemo(() => buildings.find((b) => b.type === 'colony_hub'), [buildings]);
    const hubDef = hub ? BUILDING_DEFS[hub.type] : null;
    const hubCol = hub ? hub.x + Math.floor((hubDef?.sizeW ?? 2) / 2) : Math.floor(N / 2);
    const hubRow = hub ? hub.y + Math.floor((hubDef?.sizeH ?? 2) / 2) : Math.floor(N / 2);

    // ── Center viewBox on discovered tiles when loading completes ────────────
    useEffect(() => {
      if (loading) return;
      const bounds = computeDiscoveredBounds(surface.discoveredTiles, gridToSvg, CELL_W, CELL_H);
      const PAD = 20;
      setViewBox({
        x: bounds.minX - PAD,
        y: bounds.minY - PAD,
        w: bounds.maxX - bounds.minX + PAD * 2,
        h: bounds.maxY - bounds.minY + PAD * 2,
      });
      onPhaseChange?.('ready');
    // only run once when loading finishes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);

    // ── Notify parent of building count changes ───────────────────────────────
    useEffect(() => {
      onBuildingCountChange?.(buildings.length);
    }, [buildings.length, onBuildingCountChange]);

    // ── Panel state → parent ──────────────────────────────────────────────────
    useEffect(() => {
      onBuildPanelChange?.(showBuildPanel);
    }, [showBuildPanel, onBuildPanelChange]);

    // ── Harvest ring progress animation ──────────────────────────────────────
    const [harvestRingProgress, setHarvestRingProgress] = useState(0);
    const harvestRafRef = useRef<number | null>(null);

    useEffect(() => {
      if (!harvestRing) {
        setHarvestRingProgress(0);
        if (harvestRafRef.current !== null) {
          cancelAnimationFrame(harvestRafRef.current);
          harvestRafRef.current = null;
        }
        return;
      }

      function tick() {
        if (!harvestRing) return;
        const elapsed = Date.now() - harvestRing.startTime;
        const progress = Math.min(1, elapsed / harvestRing.durationMs);
        setHarvestRingProgress(progress);
        if (progress >= 1) {
          harvestRing.onComplete();
          cancelHarvestRing();
          return;
        }
        harvestRafRef.current = requestAnimationFrame(tick);
      }

      harvestRafRef.current = requestAnimationFrame(tick);
      return () => {
        if (harvestRafRef.current !== null) {
          cancelAnimationFrame(harvestRafRef.current);
          harvestRafRef.current = null;
        }
      };
    }, [harvestRing, cancelHarvestRing]);

    // ── Zoom helpers ──────────────────────────────────────────────────────────

    const zoomIn = useCallback(() => {
      setViewBox((vb) => {
        const cx = vb.x + vb.w / 2;
        const cy = vb.y + vb.h / 2;
        const nw = vb.w * 0.82;
        const nh = vb.h * 0.82;
        return clampViewBox({ x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh }, discoveredBounds);
      });
    }, [discoveredBounds]);

    const zoomOut = useCallback(() => {
      setViewBox((vb) => {
        const cx = vb.x + vb.w / 2;
        const cy = vb.y + vb.h / 2;
        const boundsW = discoveredBounds.maxX - discoveredBounds.minX;
        const boundsH = discoveredBounds.maxY - discoveredBounds.minY;
        const nw = Math.min(vb.w / 0.82, boundsW * 1.5);
        const nh = Math.min(vb.h / 0.82, boundsH * 1.5);
        return clampViewBox({ x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh }, discoveredBounds);
      });
    }, [discoveredBounds]);

    const panBy = useCallback(
      (dx: number, dy: number) => {
        setViewBox((vb) => {
          const scale = svgRef.current ? vb.w / svgRef.current.clientWidth : 1;
          return clampViewBox(
            { ...vb, x: vb.x - dx * scale, y: vb.y - dy * scale },
            discoveredBounds,
          );
        });
      },
      [discoveredBounds],
    );

    // ── Pointer drag state ────────────────────────────────────────────────────
    const isDragging    = useRef(false);
    const dragMoved     = useRef(false);
    const dragStart     = useRef({ px: 0, py: 0, vx: 0, vy: 0 });

    const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
      isDragging.current  = true;
      dragMoved.current   = false;
      dragStart.current   = {
        px: e.clientX,
        py: e.clientY,
        vx: viewBox.x,
        vy: viewBox.y,
      };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      // Close popups on press
      setInspectBuilding(null);
      setDronePopup(null);
    }, [viewBox.x, viewBox.y]);

    const handlePointerMove = useCallback(
      (e: React.PointerEvent<SVGSVGElement>) => {
        // In placement mode: update ghost position from pointer
        const inPlacementMode =
          !!(selectedBuilding && !pendingPlacement) || !!(pendingPlacement?.moving);
        const buildingType = pendingPlacement?.moving ? pendingPlacement.type : selectedBuilding;

        if (inPlacementMode && buildingType && svgRef.current) {
          const svg = svgRef.current;
          const pt  = svg.createSVGPoint();
          pt.x = e.clientX;
          pt.y = e.clientY;
          const ctm = svg.getScreenCTM();
          if (ctm) {
            const sp    = pt.matrixTransform(ctm.inverse());
            const { col, row } = svgToGrid(sp.x, sp.y);
            const valid = canBuildAt(col, row, buildingType, buildings);
            setGhostPosition({ col, row });
            setGhostValid(valid);
          }
        }

        if (!isDragging.current || inPlacementMode) return;

        const dx = e.clientX - dragStart.current.px;
        const dy = e.clientY - dragStart.current.py;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved.current = true;

        if (dragMoved.current) {
          cancelHarvestRing();
          setViewBox((vb) => {
            const scale = svgRef.current ? vb.w / svgRef.current.clientWidth : 1;
            return clampViewBox(
              {
                ...vb,
                x: dragStart.current.vx - dx * scale,
                y: dragStart.current.vy - dy * scale,
              },
              discoveredBounds,
            );
          });
        }
      },
      [selectedBuilding, pendingPlacement, canBuildAt, buildings, cancelHarvestRing, discoveredBounds],
    );

    const handlePointerUp = useCallback(() => {
      isDragging.current = false;
    }, []);

    const handlePointerLeave = useCallback(() => {
      isDragging.current = false;
      if (!pendingPlacement && !selectedBuilding) {
        setGhostPosition(null);
      }
    }, [pendingPlacement, selectedBuilding]);

    // ── Wheel zoom ────────────────────────────────────────────────────────────
    const handleWheel = useCallback(
      (e: React.WheelEvent<SVGSVGElement>) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 1.1 : 0.91;
        setViewBox((vb) => {
          const cx = vb.x + vb.w / 2;
          const cy = vb.y + vb.h / 2;
          const boundsW = discoveredBounds.maxX - discoveredBounds.minX;
          const boundsH = discoveredBounds.maxY - discoveredBounds.minY;
          const nw = Math.min(vb.w * factor, boundsW * 1.5);
          const nh = Math.min(vb.h * factor, boundsH * 1.5);
          return clampViewBox({ x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh }, discoveredBounds);
        });
      },
      [discoveredBounds],
    );

    // ── Click → convert to SVG grid coords ────────────────────────────────────

    const getSvgGridFromClick = useCallback(
      (e: React.MouseEvent<SVGSVGElement>): { col: number; row: number } | null => {
        const svg = svgRef.current;
        if (!svg) return null;
        const pt  = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const ctm = svg.getScreenCTM();
        if (!ctm) return null;
        const sp = pt.matrixTransform(ctm.inverse());
        return svgToGrid(sp.x, sp.y);
      },
      [],
    );

    // ── Click handler ─────────────────────────────────────────────────────────

    const handleClick = useCallback(
      (e: React.MouseEvent<SVGSVGElement>) => {
        if (dragMoved.current) return;

        setDronePopup(null);

        const grid = getSvgGridFromClick(e);
        if (!grid) return;
        const { col, row } = grid;
        if (col < 0 || col >= N || row < 0 || row >= N) return;

        // Moving scaffold — re-position to new valid cell
        if (pendingPlacement?.moving) {
          if (canBuildAt(col, row, pendingPlacement.type, buildings)) {
            setPendingPlacement({ ...pendingPlacement, col, row, moving: false });
            setGhostPosition({ col, row });
            setGhostValid(true);
          }
          return;
        }

        // Placement mode — 2-step: first click → fix scaffold
        if (selectedBuilding) {
          if (!canBuildAt(col, row, selectedBuilding, buildings)) {
            setSelectedBuilding(null);
            setPendingPlacement(null);
            setGhostPosition(null);
            return;
          }
          setGhostPosition({ col, row });
          setGhostValid(true);
          setPendingPlacement({ type: selectedBuilding, col, row, moving: false });
          return;
        }

        // Rover mode — send bot to clicked cell
        if (roverMode) {
          setRoverTarget(col, row);
          setRoverMode(false);
          return;
        }

        // Harvest mode — start harvest ring
        if (harvestMode) {
          const objectType = isHarvestableAt(col, row);
          if (!objectType) return;

          startHarvestRing(col, row, HARVEST_DURATION_MS, () => {
            const ot = isHarvestableAt(col, row);
            if (!ot) return;

            const harvested = harvestAt(col, row);
            if (!harvested) return;

            // Fire FX callback (screen coords for fly-to-HUD animation)
            if (onHarvestFx && svgRef.current) {
              const svg = svgRef.current;
              const { x: wx, y: wy } = gridToSvg(col, row);
              const pt2 = svg.createSVGPoint();
              pt2.x = wx;
              pt2.y = wy;
              const ctm = svg.getScreenCTM();
              if (ctm) {
                const sp2 = pt2.matrixTransform(ctm);
                onHarvestFx(harvested, sp2.x, sp2.y);
              }
            }
            onHarvest?.(harvested);
          });
          return;
        }

        // Default: check bot click → enter rover send mode directly
        if (botState) {
          const { x: bx, y: by } = gridToSvg(botState.col, botState.row);
          const svg = svgRef.current;
          if (svg) {
            const pt3  = svg.createSVGPoint();
            pt3.x = e.clientX;
            pt3.y = e.clientY;
            const ctm  = svg.getScreenCTM();
            if (ctm) {
              const sp3 = pt3.matrixTransform(ctm.inverse());
              const distX = sp3.x - bx;
              const distY = sp3.y - (by - 6); // bot is levitated 6px above ground
              const botHitRadius = 18;
              if (distX * distX + distY * distY < botHitRadius * botHitRadius) {
                setRoverMode(true);
                setSelectedBuilding(null);
                setHarvestMode(false);
                setDronePopup(null);
                setInspectBuilding(null);
                return;
              }
            }
          }
        }

        // Inspect: check if click lands on a building
        const hit = getBuildingAt(col, row, buildings);
        if (hit) {
          const { x: bx, y: by } = gridToSvg(hit.x, hit.y);
          const svg = svgRef.current;
          if (svg) {
            const pt4 = svg.createSVGPoint();
            pt4.x = bx;
            pt4.y = by;
            const ctm = svg.getScreenCTM();
            if (ctm) {
              const sp4 = pt4.matrixTransform(ctm);
              setInspectPos({ x: sp4.x, y: sp4.y });
              setInspectBuilding(hit);
              setDronePopup(null);
            }
          }
        }
      },
      [
        dragMoved,
        getSvgGridFromClick,
        N,
        pendingPlacement,
        canBuildAt,
        buildings,
        selectedBuilding,
        roverMode,
        harvestMode,
        isHarvestableAt,
        startHarvestRing,
        harvestAt,
        onHarvestFx,
        onHarvest,
        botState,
        getBuildingAt,
        setRoverTarget,
      ],
    );

    // ── Placement confirm / cancel / move ─────────────────────────────────────

    const handleConfirmPlacement = useCallback(() => {
      if (!pendingPlacement) return;
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
      setGhostPosition(null);

      // Mark as new for entrance animation
      setNewBuildingId(newBuilding.id);
      if (newBldTimerRef.current) clearTimeout(newBldTimerRef.current);
      newBldTimerRef.current = setTimeout(() => setNewBuildingId(undefined), 600);

      playSfx('building-place', 0.4);
      onBuildingPlaced?.(newBuilding.type);
      placeBuilding(playerId, planet.id, newBuilding).catch(() => {
        setTimeout(() => placeBuilding(playerId, planet.id, newBuilding).catch(console.error), 2000);
      });
    }, [pendingPlacement, playerId, planet.id, onBuildingPlaced, setBuildings]);

    const handleCancelPlacement = useCallback(() => {
      setPendingPlacement(null);
      setSelectedBuilding(null);
      setGhostPosition(null);
    }, []);

    const handleMovePlacement = useCallback(() => {
      if (!pendingPlacement) return;
      setPendingPlacement({ ...pendingPlacement, moving: true });
    }, [pendingPlacement]);

    // ── Demolish ──────────────────────────────────────────────────────────────

    const handleDemolishConfirm = useCallback(() => {
      if (!demolishConfirm) return;
      const b = demolishConfirm;
      demolishingIds.current.add(b.id);
      setDemolishConfirm(null);
      playSfx('building-demolish', 0.4);
      setBuildings((prev) => prev.filter((x) => x.id !== b.id));
      demolishingIds.current.delete(b.id);
      removeBuilding(playerId, b.id).catch(console.error);
    }, [demolishConfirm, playerId, setBuildings]);

    // ── Harvest toggle ────────────────────────────────────────────────────────

    const toggleHarvest = useCallback(() => {
      setHarvestMode((p) => {
        if (!p) { setSelectedBuilding(null); setRoverMode(false); }
        return !p;
      });
    }, []);

    // ── Escape key ────────────────────────────────────────────────────────────

    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (pendingPlacement) {
            setPendingPlacement(null);
            setSelectedBuilding(null);
            setGhostPosition(null);
          } else if (selectedBuilding) {
            setSelectedBuilding(null);
            setGhostPosition(null);
          } else if (roverMode) {
            setRoverMode(false);
          } else if (harvestMode) {
            setHarvestMode(false);
          }
        }
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedBuilding, pendingPlacement, roverMode, harvestMode]);

    // ── Imperative handle ─────────────────────────────────────────────────────

    useImperativeHandle(ref, () => ({
      zoomIn,
      zoomOut,
      panBy,
      pause:             () => { /* SVG has no ticker — no-op */ },
      resume:            () => { /* SVG has no ticker — no-op */ },
      startAIGeneration: () => { /* future */ },
      toggleBuildPanel:  () => setShowBuildPanel((p) => !p),
      toggleMinimap:     () => { /* future */ },
    }), [zoomIn, zoomOut, panBy]);

    // ── Cleanup timers on unmount ─────────────────────────────────────────────

    useEffect(() => {
      return () => {
        if (newBldTimerRef.current) clearTimeout(newBldTimerRef.current);
        if (harvestRafRef.current !== null) cancelAnimationFrame(harvestRafRef.current);
      };
    }, []);

    // ── Screen position of placement buttons ─────────────────────────────────

    const placementButtonScreenPos = useMemo(() => {
      if (!pendingPlacement || pendingPlacement.moving || !svgRef.current) return null;
      const svg = svgRef.current;
      const { x: wx, y: wy } = gridToSvg(pendingPlacement.col, pendingPlacement.row);
      const pt = svg.createSVGPoint();
      pt.x = wx;
      pt.y = wy + CELL_H; // slightly below the cell
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const sp = pt.matrixTransform(ctm);
      return { x: sp.x, y: sp.y };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingPlacement, viewBox]); // recompute when viewBox changes (pan/zoom)

    // ── Cursor style ──────────────────────────────────────────────────────────

    const cursorStyle: string = (() => {
      if (selectedBuilding || roverMode || harvestMode) return 'crosshair';
      if (isDragging.current && dragMoved.current) return 'grabbing';
      return 'grab';
    })();

    // ── Harvest ring progress value ───────────────────────────────────────────

    const harvestRingForRenderer = harvestRing
      ? { col: harvestRing.col, row: harvestRing.row, progress: harvestRingProgress }
      : null;

    // ─── Render ───────────────────────────────────────────────────────────────

    const btnBase: React.CSSProperties = {
      padding: '8px 16px',
      borderRadius: 3,
      fontFamily: 'monospace',
      fontSize: 12,
      cursor: 'pointer',
      fontWeight: 'bold',
      border: 'none',
    };

    return (
      <div
        style={{
          position:   'fixed',
          inset:      0,
          zIndex:     9000,
          background: '#FFFFFF',
          overflow:   'hidden',
        }}
      >
        {/* ── SVG viewport ───────────────────────────────────────────────── */}
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          style={{
            display:     'block',
            cursor:      cursorStyle,
            touchAction: 'none',
            fontFamily:  'monospace',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onClick={handleClick}
          onWheel={handleWheel}
        >
          {!loading && (
            <SurfaceRenderer
              gridSize={gridSize}
              planet={planet}
              buildings={buildings}
              viewBox={viewBox}
              harvestedCells={harvestedCells}
              discoveredTiles={discoveredTiles}
              selectedBuilding={selectedBuilding}
              ghostPosition={ghostPosition}
              ghostValid={ghostValid}
              botState={botState}
              droneStates={droneStates}
              harvestRing={harvestRingForRenderer}
              hubCol={hubCol}
              hubRow={hubRow}
              canBuildAt={canBuildAt}
              newBuildingId={newBuildingId}
            />
          )}
        </svg>

        {/* ── Loading indicator ──────────────────────────────────────────── */}
        {loading && (
          <div style={{
            position:   'absolute',
            inset:      0,
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'monospace',
            color:      '#4488aa',
            fontSize:   13,
            letterSpacing: '0.5px',
          }}>
            {t('surface.loading', 'Завантаження поверхнi...')}
          </div>
        )}

        {/* ── 2-step placement: confirm / move / cancel buttons ─────────── */}
        {pendingPlacement && !pendingPlacement.moving && placementButtonScreenPos && (
          <div style={{
            position:  'fixed',
            left:      placementButtonScreenPos.x,
            top:       placementButtonScreenPos.y + 8,
            transform: 'translateX(-50%)',
            display:   'flex',
            gap:       6,
            zIndex:    11000,
            pointerEvents: 'auto',
          }}>
            <button
              onClick={handleMovePlacement}
              style={{
                ...btnBase,
                background: 'rgba(8,14,24,0.94)',
                border:     '1px solid #446688',
                color:      '#7bb8ff',
              }}
            >
              {t('surface.placement_move', 'Рухати')}
            </button>
            <button
              onClick={handleConfirmPlacement}
              style={{
                ...btnBase,
                background: 'rgba(20,60,30,0.9)',
                border:     '1px solid #44ff88',
                color:      '#88ffaa',
              }}
            >
              {t('surface.placement_confirm', 'Будувати')}
            </button>
            <button
              onClick={handleCancelPlacement}
              style={{
                ...btnBase,
                background: 'rgba(8,14,24,0.94)',
                border:     '1px solid #556677',
                color:      '#556677',
                padding:    '8px 10px',
              }}
            >
              x
            </button>
          </div>
        )}

        {/* ── Moving mode hint ───────────────────────────────────────────── */}
        {pendingPlacement?.moving && (
          <div style={{
            position:   'absolute',
            top:        14,
            left:       '50%',
            transform:  'translateX(-50%)',
            background: 'rgba(5,15,25,0.92)',
            border:     '1px solid rgba(68,136,170,0.4)',
            borderRadius: 4,
            padding:    '6px 14px',
            fontFamily: 'monospace',
            fontSize:   11,
            color:      '#7bb8ff',
            display:    'flex',
            alignItems: 'center',
            gap:        10,
            pointerEvents: 'auto',
            whiteSpace: 'nowrap',
            zIndex:     11000,
          }}>
            <span style={{ color: '#aabbcc' }}>
              {t('surface.placement_move_hint', 'Виберiть нову позицiю')}
            </span>
            <button
              onClick={handleCancelPlacement}
              style={{
                background: 'none',
                border:     'none',
                color:      '#556677',
                fontSize:   14,
                cursor:     'pointer',
                fontFamily: 'monospace',
                padding:    '0 2px',
                lineHeight: '1',
              }}
            >
              x
            </button>
          </div>
        )}

        {/* ── Rover mode hint ────────────────────────────────────────────── */}
        {/* ── Zoom controls ─────────────────────────────────────────────── */}
        <SurfaceDPad
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
        />

        {/* ── Building panel ─────────────────────────────────────────────── */}
        {showBuildPanel && (
          <div style={{
            position:      'absolute',
            inset:         0,
            pointerEvents: 'none',
            zIndex:        100,
          }}>
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
          </div>
        )}

        {/* ── Building inspect popup ────────────────────────────────────── */}
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

        {/* ── Drone control popup (harvester only) ─────────────────────── */}
        {dronePopup && dronePopup.type === 'harvester' && (() => {
          const idx = (dronePopup as { type: 'harvester'; index: number; screenX: number; screenY: number }).index;
          const drone = droneStates[idx];
          if (!drone) return null;
          const isActive = drone.active;
          const filter   = drone.resourceFilter;

          const toggleFilter = (key: string) => {
            // DroneAnimState in useSurfaceState doesn't expose setDroneResourceFilter yet —
            // popup forces re-render by recreating popup data
            const next = new Set(filter);
            if (next.has(key)) { if (next.size > 1) next.delete(key); } else next.add(key);
            setDronePopup({ ...dronePopup } as DronePopupData);
          };

          return (
            <div style={{
              position:   'fixed',
              left:       Math.max(8, dronePopup.screenX - 100),
              top:        Math.max(8, dronePopup.screenY - 180),
              width:      200,
              background: 'rgba(8,14,24,0.96)',
              border:     '1px solid #334455',
              borderRadius: 4,
              fontFamily: 'monospace',
              zIndex:     11500,
              boxShadow:  '0 4px 20px rgba(0,0,0,0.6)',
            }}>
              <div style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                padding:        '8px 10px 6px',
                borderBottom:   '1px solid #1e2d3d',
              }}>
                <div style={{ color: '#aabbcc', fontSize: 11, fontWeight: 'bold' }}>
                  {t('surface.harvester')}
                </div>
                <button
                  onClick={() => setDronePopup(null)}
                  style={{
                    background: 'none',
                    border:     'none',
                    color:      '#556677',
                    cursor:     'pointer',
                    fontSize:   14,
                    lineHeight: '1',
                    padding:    '0 0 0 6px',
                    fontFamily: 'monospace',
                  }}
                >x</button>
              </div>
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: isActive ? '#44ff88' : '#cc4444', marginBottom: 8 }}>
                  {isActive ? t('surface.drone_active') : t('surface.drone_stopped')}
                </div>
                {filter && (
                  <>
                    <div style={{
                      fontSize:    9,
                      color:       '#556677',
                      letterSpacing: '0.5px',
                      marginTop:   8,
                      marginBottom: 6,
                      borderTop:   '1px solid #1e2d3d',
                      paddingTop:  8,
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
                          display:        'flex',
                          alignItems:     'center',
                          gap:            8,
                          width:          '100%',
                          padding:        '4px 6px',
                          marginBottom:   2,
                          background:     filter.has(key) ? 'rgba(30,50,40,0.5)' : 'transparent',
                          border:         `1px solid ${filter.has(key) ? color + '66' : '#1e2d3d'}`,
                          borderRadius:   3,
                          cursor:         'pointer',
                          fontFamily:     'monospace',
                          color:          filter.has(key) ? color : '#334455',
                          fontSize:       11,
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

        {/* ── Demolish confirmation modal ───────────────────────────────── */}
        {demolishConfirm && (
          <div
            style={{
              position:       'fixed',
              inset:          0,
              background:     'rgba(0,0,0,0.72)',
              zIndex:         12000,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
            }}
            onClick={() => setDemolishConfirm(null)}
          >
            <div
              style={{
                background:   'rgba(8,14,24,0.97)',
                border:       '1px solid #cc2222',
                borderRadius: 6,
                padding:      '24px 28px',
                width:        340,
                fontFamily:   'monospace',
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
                    padding:      '7px 16px',
                    background:   'transparent',
                    border:       '1px solid #446688',
                    borderRadius: 3,
                    color:        '#7bb8ff',
                    fontFamily:   'monospace',
                    cursor:       'pointer',
                    fontSize:     11,
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDemolishConfirm}
                  style={{
                    padding:      '7px 16px',
                    background:   'rgba(180,20,20,0.9)',
                    border:       '1px solid #ff4444',
                    borderRadius: 3,
                    color:        '#fff',
                    fontFamily:   'monospace',
                    cursor:       'pointer',
                    fontSize:     11,
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

export default SurfaceSVGView;
