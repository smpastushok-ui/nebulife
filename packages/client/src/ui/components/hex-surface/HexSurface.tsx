/**
 * HexSurface.tsx
 * Main hex ring surface component.
 * Replaces SurfaceSVGView — uses DOM divs (no SVG, no canvas).
 * Implements the same SurfaceViewHandle interface so App.tsx requires no changes
 * beyond updating the import alias.
 */

import './hex-animations.css';

import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react';

import type { Planet, Star, BuildingType, SurfaceObjectType, TechTreeState } from '@nebulife/core';

import { useHexState } from './useHexState.js';
import { HexGrid } from './HexGrid.js';
import { HexBuildMenu } from './HexBuildMenu.js';
import { SurfaceDPad } from '../SurfaceDPad.js';

// ---------------------------------------------------------------------------
// Public types (re-exported so App.tsx imports work unchanged)
// ---------------------------------------------------------------------------

export type SurfacePhase = 'ready' | 'error';

export interface SurfaceViewHandle {
  zoomIn:  () => void;
  zoomOut: () => void;
  pause:   () => void;
  resume:  () => void;
}

// ---------------------------------------------------------------------------
// Props — mirrors SurfaceSVGViewProps for App.tsx compatibility
// ---------------------------------------------------------------------------

interface HexSurfaceProps {
  planet:                 Planet;
  star:                   Star;
  playerId:               string;
  onClose:                () => void;
  onBuildingCountChange?: (count: number) => void;
  onBuildingPlaced?:      (type?: BuildingType) => void;
  onPhaseChange?:         (phase: SurfacePhase) => void;
  onBuildPanelChange?:    (open: boolean) => void;
  onHarvest?:             (objectType: SurfaceObjectType) => void;
  onHarvestFx?:           (objectType: SurfaceObjectType, sx: number, sy: number) => void;
  onHexUnlocked?:         (ring: number) => void;
  onHarvestAmount?:       (amount: number) => void;
  playerLevel?:           number;
  techTreeState?:         TechTreeState;
  minerals?:              number;
  volatiles?:             number;
  isotopes?:              number;
  water?:                 number;
  onConsumeIsotopes?:     (amount: number) => void;
  chemicalInventory?:     Record<string, number>;
  onElementChange?:       (delta: Record<string, number>) => void;
  researchData?:          number;
  onConsumeResearchData?: (amount: number) => void;
}

// ---------------------------------------------------------------------------
// ResourceType → SurfaceObjectType mapping
// ---------------------------------------------------------------------------

const RESOURCE_TO_OBJECT: Record<string, SurfaceObjectType> = {
  tree:  'tree',
  ore:   'ore',
  vent:  'vent',
  water: 'water',
};

// ---------------------------------------------------------------------------
// Zoom constants
// ---------------------------------------------------------------------------

const ZOOM_MIN  = 0.5;
const ZOOM_MAX  = 2.0;
const ZOOM_STEP = 0.2;

// Planet type → background image mapping (module-level to avoid allocation per render)
const PLANET_BG: Partial<Record<string, string>> = {
  terrestrial: '/planet_2d/terrestrial.webp',
  rocky:       '/planet_2d/rocky.webp',
  dwarf:       '/planet_2d/dwarf.webp',
  'gas-giant': '/planet_2d/gas-giant.webp',
  'ice-giant': '/planet_2d/ice-giant.webp',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const HexSurface = forwardRef<SurfaceViewHandle, HexSurfaceProps>(
  function HexSurface(
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
      onHexUnlocked,
      onHarvestAmount,
      playerLevel = 1,
      techTreeState,
      minerals: _minerals,
      volatiles: _volatiles,
      isotopes: _isotopes,
      water: _water,
      onConsumeIsotopes: _onConsumeIsotopes,
      chemicalInventory = {},
      onElementChange,
      researchData,
      onConsumeResearchData,
    },
    ref,
  ) {
    // ── Zoom / pan ──────────────────────────────────────────────────────────
    // ALL movement uses refs + direct DOM — zero React re-renders during gestures.
    // React state is NEVER updated during drag or wheel. Only on mount.
    const zoomRef = useRef(1.0);
    const panXRef = useRef(0);
    const panYRef = useRef(0);
    // Initial values for HexGrid first render only
    const panX = panXRef.current;
    const panY = panYRef.current;

    // ── Build menu state ────────────────────────────────────────────────────
    const [buildMenu, setBuildMenu] = useState<{
      slotId: string;
      screenX: number;
      screenY: number;
    } | null>(null);

    // ── Drag / pan tracking ─────────────────────────────────────────────────
    const rAFRef = useRef<number | null>(null);
    const dragRef = useRef<{
      startX: number;
      startY: number;
      startPanX: number;
      startPanY: number;
      moved: boolean;
    } | null>(null);

    // ── Colony resources ─────────────────────────────────────────────────────
    // PERF: Use ref to avoid re-rendering ALL 30 hexes when a single resource changes.
    // useState version was causing full HexSurface → HexGrid → 30×HexSlot cascade.
    // The ref is read by useHexState for affordability checks (stable reference).
    const colonyResourcesRef = useRef({
      minerals: _minerals ?? 0,
      volatiles: _volatiles ?? 0,
      isotopes: _isotopes ?? 100,
      water: _water ?? 0,
    });
    // Snapshot for React render (only read on mount / explicit re-render)
    const colonyResources = colonyResourcesRef.current;

    // Keep all resources in sync with props from App.tsx
    useEffect(() => {
      if (_minerals !== undefined)  colonyResourcesRef.current.minerals  = _minerals;
      if (_volatiles !== undefined) colonyResourcesRef.current.volatiles = _volatiles;
      if (_isotopes !== undefined)  colonyResourcesRef.current.isotopes  = _isotopes;
      if (_water !== undefined)     colonyResourcesRef.current.water     = _water;
    }, [_minerals, _volatiles, _isotopes, _water]);

    const handleResourceChange = useCallback(
      (delta: Partial<{ minerals: number; volatiles: number; isotopes: number; water: number }>) => {
        // Mutate ref directly — zero React re-renders
        const r = colonyResourcesRef.current;
        if (delta.minerals)  r.minerals  += delta.minerals;
        if (delta.volatiles) r.volatiles += delta.volatiles;
        if (delta.isotopes)  r.isotopes  += delta.isotopes;
        if (delta.water)     r.water     += delta.water;
      },
      [],
    );

    // ── Hex state hook ──────────────────────────────────────────────────────
    const handleDroneHarvest = useCallback((resourceKey: string) => {
      // Map colony resource key back to SurfaceObjectType for FX
      const keyToObj: Record<string, string> = { minerals: 'ore', volatiles: 'vent', isotopes: 'tree', water: 'water' };
      const objType = keyToObj[resourceKey];
      if (objType) {
        onHarvest?.(objType as any);
        onHarvestFx?.(objType as any, window.innerWidth / 2, window.innerHeight / 2);
      }
    }, [onHarvest, onHarvestFx]);

    const handleDroneAmount = useCallback((amount: number) => {
      onHarvestAmount?.(amount);
    }, [onHarvestAmount]);

    const hexState = useHexState(
      planet,
      star,
      playerId,
      colonyResources,
      handleResourceChange,
      (type) => {
        onBuildingPlaced?.(type);
      },
      chemicalInventory,
      onElementChange,
      handleDroneHarvest,
      handleDroneAmount,
      researchData,
      onConsumeResearchData,
    );

    // ── Signal ready after initial load ────────────────────────────────────
    const phaseSignalledRef = useRef(false);
    useEffect(() => {
      if (!hexState.loading && !phaseSignalledRef.current) {
        phaseSignalledRef.current = true;
        onPhaseChange?.('ready');
      }
    }, [hexState.loading, onPhaseChange]);

    // ── Building count change ───────────────────────────────────────────────
    useEffect(() => {
      const count = hexState.slots.filter(
        (s) => s.state === 'building' || s.state === 'harvester',
      ).length;
      onBuildingCountChange?.(count);
    }, [hexState.slots, onBuildingCountChange]);

    // ── Direct DOM transform (shared by pan, zoom, wheel) ──────────────────
    const gridTransformRef = useRef<HTMLDivElement | null>(null);
    const handleTransformRef = useCallback((el: HTMLDivElement | null) => {
      gridTransformRef.current = el;
    }, []);

    const applyTransformToDOM = useCallback((x: number, y: number, z: number) => {
      if (gridTransformRef.current) {
        gridTransformRef.current.style.transform =
          `scale(${z}) translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0)`;
      }
    }, []);

    const applyZoom = useCallback((newZoom: number) => {
      zoomRef.current = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, parseFloat(newZoom.toFixed(2))));
      applyTransformToDOM(panXRef.current, panYRef.current, zoomRef.current);
    }, [applyTransformToDOM]);

    // ── Imperative handle ───────────────────────────────────────────────────
    const handleZoomIn = useCallback(() => applyZoom(zoomRef.current + ZOOM_STEP), [applyZoom]);
    const handleZoomOut = useCallback(() => applyZoom(zoomRef.current - ZOOM_STEP), [applyZoom]);

    useImperativeHandle(ref, () => ({
      zoomIn:  handleZoomIn,
      zoomOut: handleZoomOut,
      pause:   () => {},
      resume:  () => {},
    }));

    // ── Action handlers ─────────────────────────────────────────────────────

    const handleUnlock = useCallback(
      (slotId: string) => {
        const slot = hexState.getSlot(slotId);
        const success = hexState.unlockSlot(slotId);
        if (success && slot) {
          onHexUnlocked?.(slot.ring);
        }
      },
      [hexState, onHexUnlocked],
    );

    const handleHarvest = useCallback(
      (slotId: string) => {
        const slot = hexState.getSlot(slotId);
        const amount = hexState.harvestResource(slotId);
        if (amount !== null && slot?.resourceType) {
          const objType = RESOURCE_TO_OBJECT[slot.resourceType] as SurfaceObjectType | undefined;
          if (objType) {
            onHarvest?.(objType);
            onHarvestFx?.(objType, window.innerWidth / 2, window.innerHeight / 2);
          }
          // Award XP = amount collected (burst harvest reward)
          if (amount > 0) onHarvestAmount?.(amount);
        }
      },
      [hexState, onHarvest, onHarvestFx, onHarvestAmount],
    );

    const handleBuild = useCallback(
      (slotId: string) => {
        // Show build menu centered on screen (simpler than computing hex screen pos)
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        setBuildMenu({ slotId, screenX: cx, screenY: cy - 150 });
        onBuildPanelChange?.(true);
      },
      [onBuildPanelChange],
    );

    const handleInspect = useCallback((_slotId: string) => {
      // Future: show building info popup
    }, []);

    const handleBuildSelect = useCallback(
      (type: BuildingType) => {
        if (!buildMenu) return;
        hexState.placeBuilding(buildMenu.slotId, type);
        setBuildMenu(null);
        onBuildPanelChange?.(false);
      },
      [buildMenu, hexState, onBuildPanelChange],
    );

    const handleBuildClose = useCallback(() => {
      setBuildMenu(null);
      onBuildPanelChange?.(false);
    }, [onBuildPanelChange]);

    // ── Pointer events (drag to pan) ────────────────────────────────────────
    // PERF: During drag, we mutate refs + direct DOM only (no React re-renders).

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startPanX: panXRef.current,
        startPanY: panYRef.current,
        moved: false,
      };
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      const z = zoomRef.current;
      const dx = (e.clientX - dragRef.current.startX) / z;
      const dy = (e.clientY - dragRef.current.startY) / z;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragRef.current.moved = true;
      }
      if (dragRef.current.moved) {
        panXRef.current = dragRef.current.startPanX + dx;
        panYRef.current = dragRef.current.startPanY + dy;
        // Sync DOM mutation with display refresh — prevents 240Hz layout thrashing on S22
        if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
        rAFRef.current = requestAnimationFrame(() => {
          applyTransformToDOM(panXRef.current, panYRef.current, z);
        });
      }
    }, [applyTransformToDOM]);

    const handlePointerUp = useCallback((_e: React.PointerEvent<HTMLDivElement>) => {
      dragRef.current = null;
      if (rAFRef.current) { cancelAnimationFrame(rAFRef.current); rAFRef.current = null; }
    }, []);

    // ── Wheel zoom ──────────────────────────────────────────────────────────

    const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      applyZoom(zoomRef.current + delta);
    }, [applyZoom]);

    // ── Loading screen ──────────────────────────────────────────────────────

    if (hexState.loading) {
      return (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9000,
          background: '#020510',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          color: '#446688',
          fontSize: 13,
          letterSpacing: 2,
        }}>
          LOADING SURFACE...
        </div>
      );
    }

    // ── Render ──────────────────────────────────────────────────────────────

    const bgImage = PLANET_BG[planet.type];

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9000,
          background: '#080808',
          overflow: 'hidden',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        {/* Static planet background — fixed, no movement, GPU layer */}
        {bgImage && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            pointerEvents: 'none',
            transform: 'translateZ(0)',
            zIndex: 0,
            opacity: 0.5,
          }} />
        )}

        {/* Hex grid */}
        <HexGrid
          slots={hexState.slots}
          onUnlock={handleUnlock}
          onHarvest={handleHarvest}
          onBuild={handleBuild}
          onInspect={handleInspect}
          canAffordUnlock={hexState.canAffordUnlock}
          zoom={zoomRef.current}
          panX={panX}
          panY={panY}
          onTransformRef={handleTransformRef}
        />

        {/* Build menu popup */}
        {buildMenu && (
          <HexBuildMenu
            slotId={buildMenu.slotId}
            screenX={buildMenu.screenX}
            screenY={buildMenu.screenY}
            playerLevel={playerLevel}
            techTreeState={techTreeState}
            colonyResources={colonyResources}
            chemicalInventory={chemicalInventory}
            planetType={planet.type}
            onSelect={handleBuildSelect}
            onClose={handleBuildClose}
          />
        )}

        {/* Zoom controls (bottom-left) */}
        <SurfaceDPad
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
        />

        {/* Planet name HUD — neon spin animation, below resource bar, right-aligned */}
        <div style={{
          position: 'fixed',
          top: 48,
          right: 0,
          fontFamily: 'monospace',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          zIndex: 5,
        }}>
          <div style={{
            background: 'rgba(10,15,25,0.85)',
            border: '1px solid rgba(68,102,136,0.4)',
            borderRight: 'none',
            borderRadius: '4px 0 0 4px',
            padding: '6px 14px 6px 12px',
            display: 'flex',
            perspective: 800,
          }}>
            {(planet.name ?? 'PLANET').toUpperCase().split('').map((ch, i, arr) => {
              const dur = 0.8 + (i / Math.max(arr.length - 1, 1)) * 2.2;
              return (
                <span key={i} style={{
                  display: 'inline-block',
                  color: '#aaccee',
                  fontSize: 13,
                  fontWeight: 'bold',
                  letterSpacing: '0.5px',
                  textShadow: '0 0 5px rgba(68,136,170,0.7), 0 0 12px rgba(68,136,170,0.4)',
                  animation: `nebuNeonSpin ${dur}s cubic-bezier(0.1,0.9,0.2,1) 0.4s forwards`,
                  opacity: 0,
                  whiteSpace: 'pre',
                }}>{ch}</span>
              );
            })}
          </div>
        </div>

        {/* Resource HUD (top-left) */}
        <div style={{
          /* Resource HUD removed — App.tsx ResourceDisplay handles this */
          display: 'none',
        }}>
        </div>

        {/* Close button (top-center) */}
        <button
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(8,14,24,0.85)',
            border: '1px solid #334455',
            borderRadius: 3,
            color: '#556677',
            fontFamily: 'monospace',
            fontSize: 10,
            letterSpacing: 2,
            padding: '4px 14px',
            cursor: 'pointer',
            zIndex: 10,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#aabbcc'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#556677'; }}
        >
          BACK
        </button>
      </div>
    );
  },
);
