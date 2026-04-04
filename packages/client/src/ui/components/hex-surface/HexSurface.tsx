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
  isotopes?:              number;
  onConsumeIsotopes?:     (amount: number) => void;
  chemicalInventory?:     Record<string, number>;
  onElementChange?:       (delta: Record<string, number>) => void;
}

// ---------------------------------------------------------------------------
// ResourceType → SurfaceObjectType mapping
// water → vent (closest harvest category; SurfaceObjectType has no 'water')
// ---------------------------------------------------------------------------

const RESOURCE_TO_OBJECT: Record<string, SurfaceObjectType> = {
  tree:  'tree',
  ore:   'ore',
  vent:  'vent',
  water: 'vent',
};

// ---------------------------------------------------------------------------
// Zoom constants
// ---------------------------------------------------------------------------

const ZOOM_MIN  = 0.5;
const ZOOM_MAX  = 2.0;
const ZOOM_STEP = 0.2;

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
      isotopes: _isotopes,
      onConsumeIsotopes: _onConsumeIsotopes,
      chemicalInventory = {},
      onElementChange,
    },
    ref,
  ) {
    // ── Zoom / pan ──────────────────────────────────────────────────────────
    const [zoom, setZoom] = useState(1.0);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);

    // ── Build menu state ────────────────────────────────────────────────────
    const [buildMenu, setBuildMenu] = useState<{
      slotId: string;
      screenX: number;
      screenY: number;
    } | null>(null);

    // ── Drag / pan tracking ─────────────────────────────────────────────────
    const dragRef = useRef<{
      startX: number;
      startY: number;
      startPanX: number;
      startPanY: number;
      moved: boolean;
    } | null>(null);

    // ── Colony resources (driven by useHexState) ────────────────────────────
    const [colonyResources, setColonyResources] = useState({
      minerals: 0,
      volatiles: 0,
      isotopes: _isotopes ?? 100,
      water: 0,
    });

    // Keep isotopes in sync with prop
    useEffect(() => {
      if (_isotopes !== undefined) {
        setColonyResources((prev) => ({ ...prev, isotopes: _isotopes }));
      }
    }, [_isotopes]);

    const handleResourceChange = useCallback(
      (delta: Partial<{ minerals: number; volatiles: number; isotopes: number; water: number }>) => {
        setColonyResources((prev) => ({
          minerals:  prev.minerals  + (delta.minerals  ?? 0),
          volatiles: prev.volatiles + (delta.volatiles ?? 0),
          isotopes:  prev.isotopes  + (delta.isotopes  ?? 0),
          water:     prev.water     + (delta.water     ?? 0),
        }));
      },
      [],
    );

    // ── Hex state hook ──────────────────────────────────────────────────────
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

    // ── Imperative handle ───────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      zoomIn:  () => setZoom((z) => Math.min(ZOOM_MAX, parseFloat((z + ZOOM_STEP).toFixed(2)))),
      zoomOut: () => setZoom((z) => Math.max(ZOOM_MIN, parseFloat((z - ZOOM_STEP).toFixed(2)))),
      pause:   () => { /* animations are CSS — no-op */ },
      resume:  () => { /* no-op */ },
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

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
      // Only track primary (left) button or touch
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startPanX: panX,
        startPanY: panY,
        moved: false,
      };
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    }, [panX, panY]);

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      const dx = (e.clientX - dragRef.current.startX) / zoom;
      const dy = (e.clientY - dragRef.current.startY) / zoom;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragRef.current.moved = true;
      }
      if (dragRef.current.moved) {
        setPanX(dragRef.current.startPanX + dx);
        setPanY(dragRef.current.startPanY + dy);
      }
    }, [zoom]);

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
      dragRef.current = null;
    }, []);

    // ── Wheel zoom ──────────────────────────────────────────────────────────

    const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((z) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, parseFloat((z + delta).toFixed(2)))));
    }, []);

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

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9000,
          background: '#0a0f1e',
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
        {/* Hex grid */}
        <HexGrid
          slots={hexState.slots}
          onUnlock={handleUnlock}
          onHarvest={handleHarvest}
          onBuild={handleBuild}
          onInspect={handleInspect}
          canAffordUnlock={hexState.canAffordUnlock}
          zoom={zoom}
          panX={panX}
          panY={panY}
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
          onZoomIn={() => setZoom((z) => Math.min(ZOOM_MAX, parseFloat((z + ZOOM_STEP).toFixed(2))))}
          onZoomOut={() => setZoom((z) => Math.max(ZOOM_MIN, parseFloat((z - ZOOM_STEP).toFixed(2))))}
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
