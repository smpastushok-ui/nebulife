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
  useMemo,
} from 'react';
import { useTranslation } from 'react-i18next';

import type { Planet, Star, BuildingType, SurfaceObjectType, TechTreeState, PlacedBuilding, PlanetResourceStocks, ProducibleType, FleetState, ObservatoryState, ObservatorySearchDuration, ObservatorySearchProgram } from '@nebulife/core';
import { getPlanetSize } from '@nebulife/core';

import { useHexState } from './useHexState.js';
import { HexGrid } from './HexGrid.js';
import { getHexPositions, HEX_RADIUS, type HexPlanetSize, type ResourceType } from './hex-utils.js';
import { HexBuildMenu, getAlphaHarvesterPrice } from './HexBuildMenu.js';
import { playSfx } from '../../../audio/SfxPlayer.js';
import { BuildingDetailPanel } from '../ColonyCenter/BuildingDetailPanel.js';

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
  /**
   * Authoritative harvest callback — fires with both objectType AND actual
   * rarity-based yield amount so that App.tsx can:
   *   1. Add exactly this amount to colony resources
   *   2. Deplete exactly this amount from planet stock
   *   3. Award proportional elements
   * This replaces the old onResourceChange path in useHexState which caused
   * double-counting (hook added resources AND App.tsx added them again).
   */
  onHarvestFull?:         (objectType: SurfaceObjectType, amount: number) => { actualAmount: number; depleted: boolean } | void;
  playerLevel?:           number;
  techTreeState?:         TechTreeState;
  minerals?:              number;
  volatiles?:             number;
  isotopes?:              number;
  water?:                 number;
  onConsumeIsotopes?:     (amount: number) => void;
  onResourceDeducted?:    (delta: Partial<{ minerals: number; volatiles: number; isotopes: number; water: number }>) => void;
  chemicalInventory?:     Record<string, number>;
  onElementChange?:       (delta: Record<string, number>) => void;
  researchData?:          number;
  onConsumeResearchData?: (amount: number) => void;
  quarks?:                number;
  onConsumeQuarks?:       (amount: number) => void;
  alphaHarvesterCount?:   number;
  shutdownBuildingTypes?: Set<string>;
  storageBlockedBuildingTypes?: Set<string>;
  planetStocks?:          PlanetResourceStocks;
  explorationPayloads?:    Partial<Record<ProducibleType, number>>;
  shipFleet?:              FleetState;
  explorationProductionQueue?: Array<{ id: string; type: ProducibleType; planetId: string; startedAt: number; durationMs: number }>;
  onStartPayloadProduction?: (type: ProducibleType) => void;
  observatoryState?: ObservatoryState;
  onStartObservatorySearch?: (duration: ObservatorySearchDuration, program: ObservatorySearchProgram) => void;
  /** Opens the Colony Center hub page — fired when the player inspects the
   *  `colony_hub` building. Parent wires this to setShowColonyCenter(true). */
  onOpenColonyCenter?:    (tab?: 'overview' | 'production') => void;
}

// ---------------------------------------------------------------------------
// ResourceType → SurfaceObjectType mapping
// ---------------------------------------------------------------------------

const RESOURCE_TO_OBJECT: Record<string, SurfaceObjectType> = {
  tree:       'tree',
  ore:        'ore',
  vent:       'vent',
  water:      'water',
  // New v169 types: map to nearest SurfaceObjectType for FX/PixiJS compat.
  // crystal and bio_fossil yield isotopes (same as tree) so they use 'tree' FX.
  crystal:    'tree',
  bio_fossil: 'tree',
};

const HARVEST_BUILDING_BONUS: Partial<Record<BuildingType, Partial<Record<ResourceType, number>>>> = {
  mine: { ore: 0.25 },
  water_extractor: { water: 0.25 },
  atmo_extractor: { vent: 0.25 },
  deep_drill: { ore: 0.35, crystal: 0.35, bio_fossil: 0.2 },
  alpha_harvester: { ore: 0.15, vent: 0.15, water: 0.15, tree: 0.15, crystal: 0.15, bio_fossil: 0.15 },
};

function resourceBonusFor(resourceType: string, buildings: Array<{ buildingType?: string }>): number {
  return buildings.reduce((bonus, building) => {
    const typed = building.buildingType as BuildingType | undefined;
    if (!typed) return bonus;
    return bonus + (HARVEST_BUILDING_BONUS[typed]?.[resourceType as ResourceType] ?? 0);
  }, 0);
}

// ---------------------------------------------------------------------------
// Zoom constants
// ---------------------------------------------------------------------------

const ZOOM_MIN  = 0.5;
const ZOOM_MAX  = 2.0;
const ZOOM_STEP = 0.1;
const DESKTOP_HEX_COLUMNS: Record<HexPlanetSize, number> = {
  orbital: 4,
  small: 5,
  medium: 6,
  large: 8,
};
const DESKTOP_HEX_STEP_X = 132;

// Planet type → background image mapping (module-level to avoid allocation per render)
const PLANET_BG: Partial<Record<string, string>> = {
  terrestrial: '/planet_2d/terrestrial.webp',
  rocky:       '/planet_2d/rocky.webp',
  dwarf:       '/planet_2d/dwarf.webp',
  'gas-giant': '/planet_2d/gas-giant.webp',
  'ice-giant': '/planet_2d/ice-giant.webp',
};

// Most common hex images to preload on surface mount
const PRELOAD_HEX_IMAGES = [
  '/buildings/hecs_locked.webp',
  '/buildings/build_hecs.webp',
  '/buildings/colony.webp',
];

// ---------------------------------------------------------------------------
// Tiny helper — plays planet name load sound once on mount
// ---------------------------------------------------------------------------
function PlanetNameSound() {
  useEffect(() => { playSfx('name-planet-load', 0.3); }, []);
  return null;
}

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
      onHarvestFull,
      playerLevel = 1,
      techTreeState,
      minerals: _minerals,
      volatiles: _volatiles,
      isotopes: _isotopes,
      water: _water,
      onConsumeIsotopes: _onConsumeIsotopes,
      onResourceDeducted,
      chemicalInventory = {},
      onElementChange,
      researchData,
      onConsumeResearchData,
      quarks,
      onConsumeQuarks,
      alphaHarvesterCount = 0,
      shutdownBuildingTypes,
      storageBlockedBuildingTypes,
      planetStocks,
      explorationPayloads,
      shipFleet,
      explorationProductionQueue,
      onStartPayloadProduction,
      observatoryState,
      onStartObservatorySearch,
      onOpenColonyCenter,
    },
    ref,
  ) {
    // ── Preload most common hex images on mount ──────────────────────────────
    useEffect(() => {
      PRELOAD_HEX_IMAGES.forEach(src => {
        const img = new Image();
        img.src = src;
      });
    }, []);

    // ── Zoom / pan ──────────────────────────────────────────────────────────
    // ALL movement uses refs + direct DOM — zero React re-renders during gestures.
    // React state is NEVER updated during drag or wheel. Only on mount.
    //
    // Initial zoom: computed once so the full grid fits the viewport width.
    // Prevents left/right hex tile clipping on narrow mobile screens.
    const zoomRef = useRef((() => {
      const pSize = getPlanetSize(planet.radiusEarth);
      const desktop = window.innerWidth >= 900;
      const positions = getHexPositions(pSize);
      const gridW = desktop
        ? (DESKTOP_HEX_COLUMNS[pSize] - 1) * DESKTOP_HEX_STEP_X + (DESKTOP_HEX_STEP_X * 0.5) + HEX_RADIUS * 2
        : Math.max(...positions.map(p => p.x)) - Math.min(...positions.map(p => p.x)) + HEX_RADIUS * 2;
      return Math.min(desktop ? 1.15 : 0.8, (window.innerWidth - (desktop ? 160 : 24)) / gridW);
    })());
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
    const [detailSlotId, setDetailSlotId] = useState<string | null>(null);

    // ── Drag / pan tracking ─────────────────────────────────────────────────
    const rAFRef = useRef<number | null>(null);
    const dragRef = useRef<{
      pointerId: number;
      startX: number;
      startY: number;
      startPanX: number;
      startPanY: number;
      moved: boolean;
    } | null>(null);
    const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
    const pinchRef = useRef<{
      startDist: number;
      startZoom: number;
      startPanX: number;
      startPanY: number;
      centerX: number;
      centerY: number;
      screenCenterX: number;
      screenCenterY: number;
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
        // Mutate ref directly — zero React re-renders for affordability checks
        const r = colonyResourcesRef.current;
        if (delta.minerals)  r.minerals  += delta.minerals;
        if (delta.volatiles) r.volatiles += delta.volatiles;
        if (delta.isotopes)  r.isotopes  += delta.isotopes;
        if (delta.water)     r.water     += delta.water;
        // Also notify App.tsx to update HUD + persist to server
        onResourceDeducted?.(delta);
      },
      [onResourceDeducted],
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

    /** Authoritative drone harvest — calls onHarvestFull for resource + depletion. */
    const handleDroneHarvestFull = useCallback((resourceType: string, amount: number) => {
      const objType = RESOURCE_TO_OBJECT[resourceType] as SurfaceObjectType | undefined;
      if (objType) {
        return onHarvestFull?.(objType, amount);
      }
      return undefined;
    }, [onHarvestFull]);

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
      quarks,
      onConsumeQuarks,
      handleDroneHarvestFull,
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

    // Premium unlock flow — when the player taps a locked hex they can't
    // afford in colony resources, we surface a confirmation modal offering
    // the quarks shortcut (see SLOT_UNLOCK_QUARKS_COST in useHexState).
    const [quarksUnlockSlotId, setQuarksUnlockSlotId] = useState<string | null>(null);

    const handleUnlock = useCallback(
      (slotId: string) => {
        const slot = hexState.getSlot(slotId);
        if (!slot) return false;
        const success = hexState.unlockSlot(slotId);
        if (success) onHexUnlocked?.(slot.ring);
        return success;
      },
      [hexState, onHexUnlocked],
    );

    /** Fired when the player taps a locked hex they can't afford with colony
     *  resources. If they have enough quarks, show the "Pay 10 💎" modal. */
    const handleInsufficient = useCallback((slotId: string) => {
      if ((quarks ?? 0) >= 10) {
        setQuarksUnlockSlotId(slotId);
      }
    }, [quarks]);

    const handleConfirmQuarksUnlock = useCallback(() => {
      if (!quarksUnlockSlotId) return;
      const slot = hexState.getSlot(quarksUnlockSlotId);
      const ok = hexState.unlockSlotWithQuarks(quarksUnlockSlotId);
      if (ok && slot) onHexUnlocked?.(slot.ring);
      setQuarksUnlockSlotId(null);
    }, [hexState, onHexUnlocked, quarksUnlockSlotId]);

    const handleHarvest = useCallback(
      (slotId: string, sx: number, sy: number) => {
        const slot = hexState.getSlot(slotId);
        if (!slot?.resourceType || !slot.yieldPerHour) return;

        const objType = RESOURCE_TO_OBJECT[slot.resourceType] as SurfaceObjectType | undefined;
        if (!objType) return;

        const bonus = resourceBonusFor(slot.resourceType, hexState.slots);
        const boostedAmount = slot.yieldPerHour * (1 + bonus);
        // Storage/stock preflight happens before the slot is marked harvested.
        // If storage is full, keep the resource ready and avoid XP/FX.
        const result = onHarvestFull?.(objType, boostedAmount);
        const actualAmount = result?.actualAmount ?? boostedAmount;
        if (actualAmount <= 0) return;

        const amount = hexState.harvestResource(slotId, actualAmount);
        if (amount !== null) {
          if (result?.depleted) hexState.destroyResource(slotId);
          // onHarvest: kept for visual FX / legacy compatibility; no resource logic
          onHarvest?.(objType);
          onHarvestFx?.(objType, sx, sy);
          // Award XP = amount collected (burst harvest reward)
          onHarvestAmount?.(actualAmount);
        }
      },
      [hexState, onHarvest, onHarvestFx, onHarvestAmount, onHarvestFull],
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

    const buildingsForDetail = useMemo<PlacedBuilding[]>(() => (
      hexState.slots
        .filter((s) => s.state === 'building' && s.buildingType)
        .map((s) => ({
          id: `${playerId}-${s.id}-${s.buildingType}`,
          type: s.buildingType as BuildingType,
          x: s.index,
          y: s.ring,
          level: s.buildingLevel ?? 1,
          builtAt: new Date().toISOString(),
          shutdown: shutdownBuildingTypes?.has(s.buildingType ?? ''),
        }))
    ), [hexState.slots, playerId, shutdownBuildingTypes]);

    const detailBuilding = useMemo(() => {
      if (!detailSlotId) return null;
      const slot = hexState.getSlot(detailSlotId);
      if (!slot?.buildingType) return null;
      return buildingsForDetail.find((b) => b.id === `${playerId}-${detailSlotId}-${slot.buildingType}`) ?? null;
    }, [buildingsForDetail, detailSlotId, hexState, playerId]);

    const handleInspect = useCallback((slotId: string) => {
      const slot = hexState.getSlot(slotId);
      if (!slot) return;
      // Colony hub → open the Colony Center management screen.
      if (slot.buildingType === 'colony_hub' && onOpenColonyCenter) {
        onOpenColonyCenter();
        return;
      }
      if (slot.state === 'building' && slot.buildingType) {
        setDetailSlotId(slotId);
      }
    }, [hexState, onOpenColonyCenter]);

    const handleDestroy = useCallback(
      (slotId: string) => {
        hexState.destroyResource(slotId);
      },
      [hexState],
    );

    const handleBuildSelect = useCallback(
      (type: BuildingType) => {
        if (!buildMenu) return;
        // Alpha harvester: deduct quarks instead of colony resources
        if (type === 'alpha_harvester') {
          const price = getAlphaHarvesterPrice(alphaHarvesterCount);
          if ((quarks ?? 0) < price) return;
          onConsumeQuarks?.(price);
        }
        hexState.placeBuilding(buildMenu.slotId, type);
        setBuildMenu(null);
        onBuildPanelChange?.(false);
      },
      [buildMenu, hexState, onBuildPanelChange, quarks, alphaHarvesterCount, onConsumeQuarks],
    );

    const handleBuildClose = useCallback(() => {
      setBuildMenu(null);
      onBuildPanelChange?.(false);
    }, [onBuildPanelChange]);

    // ── Pointer events (drag to pan) ────────────────────────────────────────
    // PERF: During drag, we mutate refs + direct DOM only (no React re-renders).

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activePointersRef.current.size >= 2) {
        const pointers = Array.from(activePointersRef.current.values()).slice(0, 2);
        const dx = pointers[0].x - pointers[1].x;
        const dy = pointers[0].y - pointers[1].y;
        const rect = e.currentTarget.getBoundingClientRect();
        pinchRef.current = {
          startDist: Math.max(1, Math.hypot(dx, dy)),
          startZoom: zoomRef.current,
          startPanX: panXRef.current,
          startPanY: panYRef.current,
          centerX: (pointers[0].x + pointers[1].x) / 2,
          centerY: (pointers[0].y + pointers[1].y) / 2,
          screenCenterX: rect.left + rect.width / 2,
          screenCenterY: rect.top + rect.height / 2,
        };
        dragRef.current = null;
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        return;
      }
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startPanX: panXRef.current,
        startPanY: panYRef.current,
        moved: false,
      };
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointersRef.current.has(e.pointerId)) {
        activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }
      if (pinchRef.current && activePointersRef.current.size >= 2) {
        const pointers = Array.from(activePointersRef.current.values()).slice(0, 2);
        const dx = pointers[0].x - pointers[1].x;
        const dy = pointers[0].y - pointers[1].y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const nextZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, pinchRef.current.startZoom * (dist / pinchRef.current.startDist)));
        const centerX = (pointers[0].x + pointers[1].x) / 2;
        const centerY = (pointers[0].y + pointers[1].y) / 2;
        const anchorX = pinchRef.current.centerX - pinchRef.current.screenCenterX;
        const anchorY = pinchRef.current.centerY - pinchRef.current.screenCenterY;
        const centerDriftX = (centerX - pinchRef.current.centerX) / nextZoom;
        const centerDriftY = (centerY - pinchRef.current.centerY) / nextZoom;

        zoomRef.current = parseFloat(nextZoom.toFixed(3));
        panXRef.current = pinchRef.current.startPanX
          + anchorX * (1 / nextZoom - 1 / pinchRef.current.startZoom)
          + centerDriftX;
        panYRef.current = pinchRef.current.startPanY
          + anchorY * (1 / nextZoom - 1 / pinchRef.current.startZoom)
          + centerDriftY;
        if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
        rAFRef.current = requestAnimationFrame(() => {
          applyTransformToDOM(panXRef.current, panYRef.current, zoomRef.current);
        });
        return;
      }
      if (!dragRef.current) return;
      if (dragRef.current.pointerId !== e.pointerId) return;
      const z = zoomRef.current;
      const dx = (e.clientX - dragRef.current.startX) / z;
      const dy = (e.clientY - dragRef.current.startY) / z;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragRef.current.moved = true;
        if (!(e.currentTarget as HTMLDivElement).hasPointerCapture(e.pointerId)) {
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        }
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

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
      activePointersRef.current.delete(e.pointerId);
      if (activePointersRef.current.size < 2) pinchRef.current = null;
      if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
      if ((e.currentTarget as HTMLDivElement).hasPointerCapture(e.pointerId)) {
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      }
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
    const isDesktopSurface = typeof window !== 'undefined' && window.innerWidth >= 900;
    const hexPlanetSize: HexPlanetSize = getPlanetSize(planet);

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
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            pointerEvents: 'none',
            transform: 'translateZ(0)',
            zIndex: 0,
            opacity: isDesktopSurface ? 0.42 : 0.5,
            filter: isDesktopSurface ? 'blur(2px) saturate(0.92) brightness(0.82)' : undefined,
          }} />
        )}

        {/* Hex grid */}
        <HexGrid
          slots={hexState.slots}
          planetSize={hexPlanetSize}
          horizontal={isDesktopSurface}
          onUnlock={handleUnlock}
          onInsufficient={handleInsufficient}
          onHarvest={handleHarvest}
          onBuild={handleBuild}
          onInspect={handleInspect}
          onDestroy={handleDestroy}
          canAffordUnlock={hexState.canAffordUnlock}
          zoom={zoomRef.current}
          panX={panX}
          panY={panY}
          onTransformRef={handleTransformRef}
          shutdownBuildingTypes={shutdownBuildingTypes}
          storageBlockedBuildingTypes={storageBlockedBuildingTypes}
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
            planetStocks={planetStocks}
            quarks={quarks}
            alphaHarvesterCount={alphaHarvesterCount}
            onSelect={handleBuildSelect}
            onClose={handleBuildClose}
          />
        )}

        {detailBuilding && (
          <BuildingDetailPanel
            planet={planet}
            building={detailBuilding}
            buildings={buildingsForDetail}
            colonyResources={colonyResourcesRef.current}
            researchData={researchData ?? 0}
            planetStocks={planetStocks}
            explorationPayloads={explorationPayloads}
            shipFleet={shipFleet}
            explorationProductionQueue={explorationProductionQueue}
            observatoryState={observatoryState}
            onStartObservatorySearch={onStartObservatorySearch}
            onClose={() => setDetailSlotId(null)}
            onOpenColonyCenter={onOpenColonyCenter}
            onStartPayloadProduction={onStartPayloadProduction}
            onResourceChange={handleResourceChange}
            onResearchDataChange={(delta) => {
              if (delta < 0) onConsumeResearchData?.(Math.abs(delta));
            }}
            onDemolish={() => {
              if (!detailSlotId) return;
              hexState.removeBuilding(detailSlotId);
              setDetailSlotId(null);
            }}
          />
        )}

        {/* Planet name load sound — plays once on surface mount */}
        <PlanetNameSound />

        {/* Planet name HUD — neon spin animation, below resource bar, right-aligned */}
        <div style={{
          position: 'fixed',
          top: 'calc(48px + env(safe-area-inset-top, 0px))',
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
              // Simple staggered fade-in. Previous nebuNeonSpin used rotateX(-1440°)
              // + filter: blur(10px) per letter — each letter got its own GPU layer
              // and the blur composite was running on every frame, burning GPU on
              // macOS for the whole 0.8-3s animation. Fade+translateY is compositor-
              // friendly and visually similar.
              const delay = 0.4 + (i / Math.max(arr.length - 1, 1)) * 0.35;
              return (
                <span key={i} style={{
                  display: 'inline-block',
                  color: '#aaccee',
                  fontSize: 13,
                  fontWeight: 'bold',
                  letterSpacing: '0.5px',
                  textShadow: '0 0 5px rgba(68,136,170,0.6)',
                  animation: `nebuFadeUp 0.6s ease-out ${delay}s forwards`,
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
            top: 'calc(14px + env(safe-area-inset-top, 0px))',
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

        {/* Quarks-pay confirmation modal — shown when the player can't afford
            a locked hex with colony resources but has >= 10 quarks. */}
        {quarksUnlockSlotId && (
          <QuarksUnlockModal
            onCancel={() => setQuarksUnlockSlotId(null)}
            onConfirm={handleConfirmQuarksUnlock}
          />
        )}

        {/* First-5-unlocks hint — fires once per player once they've cleared
            5 slots on their home planet. See useFirstFiveHint hook. */}
        <FirstFiveUnlocksHint
          homeMatch={typeof window !== 'undefined'
            && localStorage.getItem('nebulife_home_planet_id') === planet.id}
          unlockedCount={hexState.slots.filter(s => s.state !== 'locked' && s.state !== 'hidden').length}
        />
      </div>
    );
  },
);

// ---------------------------------------------------------------------------
// Sub-components: quarks-pay modal + first-5-unlocks onboarding hint
// ---------------------------------------------------------------------------

/** Centered confirmation for the premium slot unlock ("Pay 10 💎"). */
function QuarksUnlockModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9800,
        background: 'rgba(2,5,16,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'monospace',
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 320, maxWidth: '86vw',
          background: 'rgba(10,15,25,0.96)',
          border: '1px solid #4488aa',
          borderRadius: 6,
          padding: 20,
          textAlign: 'center',
          boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontSize: 10, color: '#4488aa', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
          {t('surface.quarks_unlock.title')}
        </div>
        <div style={{ fontSize: 13, color: '#aabbcc', marginBottom: 18, lineHeight: 1.5 }}>
          {t('surface.quarks_unlock.body')}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              background: 'transparent', border: '1px solid #334455',
              borderRadius: 4, color: '#8899aa',
              fontFamily: 'monospace', fontSize: 11,
              padding: '8px 14px', cursor: 'pointer', letterSpacing: 1,
            }}
          >
            {t('surface.quarks_unlock.cancel')}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              background: 'rgba(68,136,255,0.18)',
              border: '1px solid #7bb8ff',
              borderRadius: 4, color: '#7bb8ff',
              fontFamily: 'monospace', fontSize: 11, fontWeight: 600,
              padding: '8px 14px', cursor: 'pointer', letterSpacing: 1,
            }}
          >
            {t('surface.quarks_unlock.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** One-time onboarding hint — appears the moment the player unlocks their
 *  5th hex on the HOME planet. Persisted via nebulife_surface_5slots_hint_seen
 *  so it never fires twice for the same account. */
function FirstFiveUnlocksHint({ homeMatch, unlockedCount }: { homeMatch: boolean; unlockedCount: number }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!homeMatch) return;
    if (unlockedCount < 5) return;
    try {
      if (localStorage.getItem('nebulife_surface_5slots_hint_seen') === '1') return;
      localStorage.setItem('nebulife_surface_5slots_hint_seen', '1');
    } catch { /* ignore */ }
    setVisible(true);
  }, [homeMatch, unlockedCount]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9810,
        background: 'rgba(2,5,16,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'monospace',
      }}
      onClick={() => setVisible(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 360, maxWidth: '88vw',
          background: 'rgba(10,15,25,0.97)',
          border: '1px solid #446688',
          borderRadius: 6,
          padding: 22,
          textAlign: 'left',
          boxShadow: '0 6px 24px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ fontSize: 10, color: '#44ff88', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
          {t('surface.hint_5slots.badge')}
        </div>
        <div style={{ fontSize: 15, color: '#ccddee', marginBottom: 12, fontWeight: 600 }}>
          {t('surface.hint_5slots.title')}
        </div>
        <div style={{ fontSize: 12, color: '#8899aa', marginBottom: 18, lineHeight: 1.6 }}>
          {t('surface.hint_5slots.body')}
        </div>
        <button
          onClick={() => setVisible(false)}
          style={{
            width: '100%',
            background: 'rgba(68,255,136,0.12)',
            border: '1px solid #44ff88',
            borderRadius: 4, color: '#44ff88',
            fontFamily: 'monospace', fontSize: 12, fontWeight: 600,
            padding: '10px', cursor: 'pointer', letterSpacing: 1,
          }}
        >
          {t('surface.hint_5slots.ok')}
        </button>
      </div>
    </div>
  );
}
