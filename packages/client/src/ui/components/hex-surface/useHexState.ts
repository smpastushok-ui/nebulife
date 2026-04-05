// ---------------------------------------------------------------------------
// useHexState — State management for diamond hex surface (30-hex layout)
// Replaces the old 19-hex ring system.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Planet, Star, BuildingType, PlacedBuilding } from '@nebulife/core';
import { BUILDING_DEFS, computeHarvestElements } from '@nebulife/core';
import {
  placeBuilding as apiPlaceBuilding,
  removeBuilding as apiRemoveBuilding,
} from '../../../api/surface-api.js';
import { getPlayer, updatePlayer } from '../../../api/player-api.js';
import type {
  HexSlotData,
  HexState,
  ResourceType,
  Rarity,
} from './hex-utils.js';
import {
  getUnlockCost,
  rollRarity,
  rollResourceType,
  rarityYield,
  isResourceReady,
  DIAMOND_ROWS,
  CENTER_ROW,
  CENTER_COL,
  computeZone,
  getAdjacentIds,
} from './hex-utils.js';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface HexStateResult {
  slots: HexSlotData[];
  loading: boolean;

  // Actions
  unlockSlot: (slotId: string) => boolean;
  harvestResource: (slotId: string) => number | null;
  placeBuilding: (slotId: string, type: BuildingType) => boolean;
  removeBuilding: (slotId: string) => void;

  // Queries
  canAffordUnlock: (slotId: string) => boolean;
  getSlot: (slotId: string) => HexSlotData | undefined;

  // Colony resources (passed down from App.tsx)
  minerals: number;
  volatiles: number;
  isotopes: number;
  water: number;

  // Chemical element inventory (for endgame building costs)
  chemicalInventory: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Resource group mapping
// ResourceType -> which colony resource bucket it fills
// ---------------------------------------------------------------------------

const RESOURCE_TO_COLONY: Record<ResourceType, keyof { minerals: number; volatiles: number; isotopes: number; water: number }> = {
  ore:   'minerals',
  tree:  'isotopes',  // trees produce isotopes (biomass fuel)
  vent:  'volatiles',
  water: 'water',
};

// ---------------------------------------------------------------------------
// Diamond layout — 30 hexes
// Hub at (CENTER_ROW=4, CENTER_COL=2) = id "d4-2"
// ---------------------------------------------------------------------------

const HUB_ID = `d${CENTER_ROW}-${CENTER_COL}`;

/**
 * Enumerate all 30 diamond hexes in row-major order, returning their
 * (row, col, zone, index-within-zone).
 */
function buildDiamondDescriptors(): Array<{
  row: number;
  col: number;
  id: string;
  zone: 0 | 1 | 2 | 3;
  zoneIndex: number;
}> {
  // First pass: assign zone
  const raw: Array<{ row: number; col: number; id: string; zone: 0 | 1 | 2 | 3 }> = [];
  for (let row = 0; row < DIAMOND_ROWS.length; row++) {
    const width = DIAMOND_ROWS[row];
    for (let col = 0; col < width; col++) {
      raw.push({ row, col, id: `d${row}-${col}`, zone: computeZone(row, col) });
    }
  }
  // Second pass: index within zone
  const zoneCounters: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  return raw.map((h) => ({ ...h, zoneIndex: zoneCounters[h.zone]++ }));
}

// ---------------------------------------------------------------------------
// Recalculate unlock costs for all locked slots
// ---------------------------------------------------------------------------

function recalculateLockedCosts(slots: HexSlotData[]): HexSlotData[] {
  const zone1Unlocked = slots.filter(s => s.ring === 1 && s.state !== 'locked' && s.state !== 'hidden').length;
  const zone2Unlocked = slots.filter(s => s.ring === 2 && s.state !== 'locked' && s.state !== 'hidden').length;
  const zone3Unlocked = slots.filter(s => s.ring === 3 && s.state !== 'locked' && s.state !== 'hidden').length;

  const zone1Cost = getUnlockCost(1, zone1Unlocked);
  const zone2Cost = getUnlockCost(2, zone2Unlocked);
  const zone3Cost = getUnlockCost(3, zone3Unlocked);

  return slots.map(s => {
    if (s.state !== 'locked') return s;
    if (s.ring === 1) return { ...s, unlockCost: zone1Cost };
    if (s.ring === 2) return { ...s, unlockCost: zone2Cost };
    if (s.ring === 3) return { ...s, unlockCost: zone3Cost };
    return s;
  });
}

// ---------------------------------------------------------------------------
// Reveal logic — unlocking a hex makes its hidden zone-N+1 neighbours 'locked'
// ---------------------------------------------------------------------------

function revealAdjacentHidden(slots: HexSlotData[], unlockedId: string): HexSlotData[] {
  // Parse row/col from id
  const m = unlockedId.match(/^d(\d+)-(\d+)$/);
  if (!m) return slots; // old-format id — skip adjacency reveal

  const row = parseInt(m[1], 10);
  const col = parseInt(m[2], 10);
  const adjIds = new Set(getAdjacentIds(row, col));

  return slots.map(s => {
    if (adjIds.has(s.id) && s.state === 'hidden') {
      return { ...s, state: 'locked' as HexState };
    }
    return s;
  });
}

// ---------------------------------------------------------------------------
// Initial slot builder (fresh start, 30 diamond hexes)
// ---------------------------------------------------------------------------

function buildInitialSlots(): HexSlotData[] {
  const descriptors = buildDiamondDescriptors();
  const slots: HexSlotData[] = descriptors.map(({ row, col, id, zone, zoneIndex }) => {
    if (zone === 0) {
      // Hub — auto-unlocked with colony building
      return {
        id,
        ring: 0 as const,
        index: zoneIndex,
        state: 'building' as HexState,
        buildingType: 'colony_hub',
        buildingLevel: 1,
      };
    }
    if (zone === 1) {
      // Zone 1 — immediately visible as locked (adjacent to hub)
      return {
        id,
        ring: 1 as const,
        index: zoneIndex,
        state: 'locked' as HexState,
      };
    }
    // Zone 2 & 3 — hidden until neighbours are unlocked
    return {
      id,
      ring: zone as 2 | 3,
      index: zoneIndex,
      state: 'hidden' as HexState,
    };
  });

  return recalculateLockedCosts(slots);
}

// ---------------------------------------------------------------------------
// Migration: old ring-based saves → diamond layout
// Detects by checking if the first saved slot id starts with "ring"
// ---------------------------------------------------------------------------

function migrateRingToDiamond(oldSlots: HexSlotData[]): HexSlotData[] {
  if (!oldSlots.length || !oldSlots[0].id.startsWith('ring')) {
    // Already diamond format or empty — run adjacency + cost fix only
    return fixDiamondSlots(oldSlots);
  }

  console.info('[useHexState] Migrating ring-based saves to diamond layout');

  // Build fresh diamond slots
  const descriptors = buildDiamondDescriptors();

  // Index old slots by id for quick lookup
  const oldById = new Map<string, HexSlotData>();
  for (const s of oldSlots) oldById.set(s.id, s);

  // Map old ring slots to new diamond slots by zone order
  // ring0-0 -> d4-2 (zone 0, index 0)
  // ring1-0..5 -> zone1 slots in order
  // ring2-0..11 -> zone2 slots in order
  const zoneDescriptors: Record<number, Array<{ row: number; col: number; id: string; zone: 0 | 1 | 2 | 3; zoneIndex: number }>> = { 0: [], 1: [], 2: [], 3: [] };
  for (const d of descriptors) zoneDescriptors[d.zone].push(d);

  const newSlots: HexSlotData[] = descriptors.map(({ row, col, id, zone, zoneIndex }) => {
    if (zone === 0) {
      // Try to restore hub state from old ring0-0
      const oldHub = oldById.get('ring0-0');
      return {
        id,
        ring: 0 as const,
        index: zoneIndex,
        state: oldHub?.state ?? ('building' as HexState),
        buildingType: oldHub?.buildingType ?? 'colony_hub',
        buildingLevel: oldHub?.buildingLevel ?? 1,
      };
    }

    if (zone === 1) {
      // Restore from ring1-{zoneIndex} if available
      const oldKey = `ring1-${zoneIndex}`;
      const oldSlot = oldById.get(oldKey);
      if (oldSlot && oldSlot.state !== 'hidden') {
        return {
          ...oldSlot,
          id,
          ring: 1 as const,
          index: zoneIndex,
        };
      }
      return {
        id,
        ring: 1 as const,
        index: zoneIndex,
        state: 'locked' as HexState,
      };
    }

    if (zone === 2) {
      // Restore from ring2-{zoneIndex} if available (only 12 zone-2 slots, same count)
      const oldKey = `ring2-${zoneIndex}`;
      const oldSlot = oldById.get(oldKey);
      if (oldSlot && oldSlot.state !== 'hidden') {
        return {
          ...oldSlot,
          id,
          ring: 2 as const,
          index: zoneIndex,
        };
      }
      return {
        id,
        ring: 2 as const,
        index: zoneIndex,
        state: 'hidden' as HexState,
      };
    }

    // Zone 3 — new, always hidden
    return {
      id,
      ring: 3 as const,
      index: zoneIndex,
      state: 'hidden' as HexState,
    };
  });

  return fixDiamondSlots(newSlots);
}

/**
 * Fix diamond-format slots: ensure all zone N+1 neighbours of unlocked hexes
 * are at least 'locked' (not 'hidden'), then recalculate costs.
 */
function fixDiamondSlots(slots: HexSlotData[]): HexSlotData[] {
  // For every unlocked hex, reveal adjacent hidden neighbours
  let result = [...slots];
  for (const s of slots) {
    if (s.state !== 'hidden' && s.state !== 'locked') {
      result = revealAdjacentHidden(result, s.id);
    }
  }
  return recalculateLockedCosts(result);
}

// ---------------------------------------------------------------------------
// Deterministic resource roll helpers
// ---------------------------------------------------------------------------

function rollSlotContents(
  seed: number,
  slotId: string,
  forceResource?: ResourceType,
): { state: 'resource' | 'empty'; resourceType?: ResourceType; rarity?: Rarity; yieldPerHour?: number; maxCapacity?: number } {
  if (forceResource) {
    const rarity = rollRarity(seed, slotId);
    const yieldPerHour = rarityYield(rarity);
    return { state: 'resource', resourceType: forceResource, rarity, yieldPerHour, maxCapacity: yieldPerHour * 12 };
  }

  // Zone 1 always has resources (0% empty) to prevent dead-end start
  // Zone 2+ has 70% resource / 30% empty
  const isZone1 = slotId.startsWith('d') && (() => {
    const m = slotId.match(/^d(\d+)-(\d+)$/);
    if (!m) return false;
    return computeZone(parseInt(m[1], 10), parseInt(m[2], 10)) === 1;
  })();

  const h = Math.abs(Math.sin(seed * 0.17 + stringHash(slotId) * 0.031)) * 100;

  if (isZone1 || h < 70) {
    const resourceType = rollResourceType(seed, slotId);
    const rarity = rollRarity(seed, slotId);
    const yieldPerHour = rarityYield(rarity);
    return { state: 'resource', resourceType, rarity, yieldPerHour, maxCapacity: yieldPerHour * 12 };
  }
  return { state: 'empty' };
}

function stringHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

// ---------------------------------------------------------------------------
// Building cost helpers
// ---------------------------------------------------------------------------

type ColonyResources = { minerals: number; volatiles: number; isotopes: number; water: number };

interface BuildingCostResult {
  colony: Partial<ColonyResources>;
  elements: Record<string, number>;
}

function buildingCost(type: BuildingType): BuildingCostResult {
  const def = BUILDING_DEFS[type];
  if (!def) return { colony: {}, elements: {} };
  const colony: Partial<ColonyResources> = {};
  const elements: Record<string, number> = {};
  for (const c of def.cost) {
    const key = c.resource as keyof ColonyResources;
    if (key === 'minerals' || key === 'volatiles' || key === 'isotopes' || key === 'water') {
      colony[key] = (colony[key] ?? 0) + c.amount;
    } else {
      elements[c.resource] = (elements[c.resource] ?? 0) + c.amount;
    }
  }
  return { colony, elements };
}

function canAffordCost(
  resources: ColonyResources,
  cost: Partial<ColonyResources & { water?: number }>,
  chemInv?: Record<string, number>,
  elementCosts?: Record<string, number>,
): boolean {
  if (resources.minerals < (cost.minerals ?? 0)) return false;
  if (resources.volatiles < (cost.volatiles ?? 0)) return false;
  if (resources.isotopes < (cost.isotopes ?? 0)) return false;
  if (resources.water < (cost.water ?? 0)) return false;
  if (elementCosts && chemInv) {
    for (const [el, amount] of Object.entries(elementCosts)) {
      if ((chemInv[el] ?? 0) < amount) return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useHexState(
  planet: Planet,
  star: Star,
  playerId: string,
  colonyResources: ColonyResources,
  onResourceChange?: (delta: Partial<ColonyResources>) => void,
  onBuildingPlaced?: (type: BuildingType) => void,
  chemicalInventory: Record<string, number> = {},
  onElementChange?: (delta: Record<string, number>) => void,
): HexStateResult {
  const [slots, setSlots] = useState<HexSlotData[]>([]);
  const [loading, setLoading] = useState(true);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slotsRef = useRef<HexSlotData[]>([]);
  slotsRef.current = slots;

  // ---------------------------------------------------------------------------
  // Persist to DB (debounced 2s)
  // ---------------------------------------------------------------------------

  const scheduleSave = useCallback(
    (newSlots: HexSlotData[]) => {
      if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        updatePlayer(playerId, {
          game_state: { hex_slots: newSlots },
        }).catch((err) => {
          console.error('[useHexState] save failed:', err);
        });
        saveTimerRef.current = null;
      }, 2000);
    },
    [playerId],
  );

  // ---------------------------------------------------------------------------
  // Load from DB on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const playerData = await getPlayer(playerId);
        if (cancelled) return;

        const saved = playerData?.game_state?.hex_slots;

        if (Array.isArray(saved) && saved.length > 0) {
          // Migrate ring-based OR fix diamond saves
          const migrated = migrateRingToDiamond(saved as HexSlotData[]);
          setSlots(migrated);
          // Persist migrated state immediately so next load skips migration
          scheduleSave(migrated);
        } else {
          const initial = buildInitialSlots();
          setSlots(initial);
          scheduleSave(initial);
        }
      } catch (err) {
        console.error('[useHexState] load failed:', err);
        if (!cancelled) setSlots(buildInitialSlots());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // NOTE: Respawn timer removed — HexSlot handles its own timer via RAF + direct DOM.
  // The old 60s setInterval was creating [...prev] which broke React.memo on HexGrid.

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const updateSlots = useCallback(
    (updater: (prev: HexSlotData[]) => HexSlotData[]) => {
      setSlots((prev) => {
        const next = updater(prev);
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  const getSlot = useCallback(
    (slotId: string): HexSlotData | undefined => slotsRef.current.find((s) => s.id === slotId),
    [],
  );

  // ---------------------------------------------------------------------------
  // canAffordUnlock
  // ---------------------------------------------------------------------------

  const canAffordUnlock = useCallback(
    (slotId: string): boolean => {
      const slot = slotsRef.current.find((s) => s.id === slotId);
      if (!slot || slot.state !== 'locked' || !slot.unlockCost) return false;
      return canAffordCost(colonyResources, slot.unlockCost);
    },
    [colonyResources],
  );

  // ---------------------------------------------------------------------------
  // unlockSlot
  // ---------------------------------------------------------------------------

  const unlockSlot = useCallback(
    (slotId: string): boolean => {
      const slot = slotsRef.current.find((s) => s.id === slotId);
      if (!slot || slot.state !== 'locked' || !slot.unlockCost) return false;
      if (!canAffordCost(colonyResources, slot.unlockCost)) return false;

      // Deduct resources
      onResourceChange?.({
        minerals:  -(slot.unlockCost.minerals  ?? 0),
        volatiles: -(slot.unlockCost.volatiles ?? 0),
        isotopes:  -(slot.unlockCost.isotopes  ?? 0),
        water:     -(slot.unlockCost.water     ?? 0),
      });

      // RNG softlock prevention: HOME planet Zone 1 guarantees all 4 resource types.
      // Other planets use pure random (player already has cross-planet resources).
      let forceResource: ResourceType | undefined;
      const homePlanetId = typeof window !== 'undefined'
        ? localStorage.getItem('nebulife_home_planet_id') : null;
      const isHome = homePlanetId === planet.id;
      if (isHome && slot.ring === 1) {
        const zone1Unlocked = slotsRef.current.filter(
          (s) => s.ring === 1 && s.state !== 'locked' && s.state !== 'hidden',
        ).length;
        if (zone1Unlocked === 0) forceResource = 'ore';    // 1st = minerals
        if (zone1Unlocked === 1) forceResource = 'vent';   // 2nd = volatiles
        if (zone1Unlocked === 2) forceResource = 'water';  // 3rd = water
        if (zone1Unlocked === 3) forceResource = 'tree';   // 4th = isotopes
        // 5th-6th = random
      }

      // Roll slot contents
      const rolled = rollSlotContents(planet.seed, slotId, forceResource);

      updateSlots((prev) => {
        // Apply unlock
        let next = prev.map((s) => {
          if (s.id !== slotId) return s;
          return {
            ...s,
            state:           rolled.state,
            resourceType:    rolled.resourceType,
            rarity:          rolled.rarity,
            yieldPerHour:    rolled.yieldPerHour,
            maxCapacity:     rolled.yieldPerHour ? rolled.yieldPerHour * 12 : undefined,
            unlockCost:      undefined,
            lastHarvestedAt: undefined,
          } as HexSlotData;
        });

        // Reveal adjacent hidden neighbours of the newly unlocked hex
        next = revealAdjacentHidden(next, slotId);

        // Recalculate costs for remaining locked hexes
        return recalculateLockedCosts(next);
      });

      return true;
    },
    [colonyResources, onResourceChange, planet.seed, updateSlots],
  );

  // ---------------------------------------------------------------------------
  // harvestResource
  // ---------------------------------------------------------------------------

  const harvestResource = useCallback(
    (slotId: string): number | null => {
      const slot = slotsRef.current.find((s) => s.id === slotId);
      if (!slot || slot.state !== 'resource') return null;
      if (!isResourceReady(slot.lastHarvestedAt)) return null;
      if (!slot.yieldPerHour || !slot.resourceType) return null;

      const yieldAmount = slot.yieldPerHour;
      const now = Date.now();

      updateSlots((prev) =>
        prev.map((s) => s.id === slotId ? { ...s, lastHarvestedAt: now } : s),
      );

      const colonyKey = RESOURCE_TO_COLONY[slot.resourceType];
      onResourceChange?.({ [colonyKey]: yieldAmount });

      if (onElementChange && planet.resources) {
        const elements = computeHarvestElements(slot.resourceType, yieldAmount, planet.resources);
        if (Object.keys(elements).length > 0) onElementChange(elements);
      }

      return yieldAmount;
    },
    [onResourceChange, onElementChange, planet.resources, updateSlots],
  );

  // ---------------------------------------------------------------------------
  // placeBuilding
  // ---------------------------------------------------------------------------

  const placeBuilding = useCallback(
    (slotId: string, type: BuildingType): boolean => {
      const slot = slotsRef.current.find((s) => s.id === slotId);
      if (!slot || slot.state !== 'empty') return false;

      const { colony: colonyCost, elements: elementCost } = buildingCost(type);
      if (!canAffordCost(colonyResources, colonyCost, chemicalInventory, elementCost)) return false;

      const delta: Partial<ColonyResources> = {};
      if (colonyCost.minerals)  delta.minerals  = -(colonyCost.minerals);
      if (colonyCost.volatiles) delta.volatiles = -(colonyCost.volatiles);
      if (colonyCost.isotopes)  delta.isotopes  = -(colonyCost.isotopes);
      if (colonyCost.water)     delta.water     = -(colonyCost.water);
      if (Object.keys(delta).length > 0) onResourceChange?.(delta);

      if (Object.keys(elementCost).length > 0 && onElementChange) {
        const elDelta: Record<string, number> = {};
        for (const [el, amount] of Object.entries(elementCost)) elDelta[el] = -amount;
        onElementChange(elDelta);
      }

      updateSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? { ...s, state: 'building' as HexState, buildingType: type, buildingLevel: 1 }
            : s,
        ),
      );

      onBuildingPlaced?.(type);

      const building: PlacedBuilding = {
        id:      `${playerId}-${slotId}-${type}`,
        type,
        x:       slot.index,
        y:       slot.ring,
        level:   1,
        builtAt: new Date().toISOString(),
      };
      apiPlaceBuilding(playerId, planet.id, building).catch((err) => {
        console.error('[useHexState] apiPlaceBuilding failed:', err);
      });

      return true;
    },
    [colonyResources, chemicalInventory, onBuildingPlaced, onResourceChange, onElementChange, planet.id, playerId, updateSlots],
  );

  // ---------------------------------------------------------------------------
  // removeBuilding
  // ---------------------------------------------------------------------------

  const removeBuilding = useCallback(
    (slotId: string): void => {
      const slot = slotsRef.current.find((s) => s.id === slotId);
      if (!slot || slot.state !== 'building') return;

      const buildingId = `${playerId}-${slotId}-${slot.buildingType}`;

      updateSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? { ...s, state: 'empty' as HexState, buildingType: undefined, buildingLevel: undefined }
            : s,
        ),
      );

      apiRemoveBuilding(playerId, buildingId).catch((err) => {
        console.error('[useHexState] apiRemoveBuilding failed:', err);
      });
    },
    [playerId, updateSlots],
  );

  // ---------------------------------------------------------------------------
  // Result
  // ---------------------------------------------------------------------------

  return useMemo(
    () => ({
      slots,
      loading,
      unlockSlot,
      harvestResource,
      placeBuilding,
      removeBuilding,
      canAffordUnlock,
      getSlot,
      minerals:  colonyResources.minerals,
      volatiles: colonyResources.volatiles,
      isotopes:  colonyResources.isotopes,
      water:     colonyResources.water,
      chemicalInventory,
    }),
    // PERF: Only slots and loading trigger re-memo. Colony resources are refs (stable).
    // chemicalInventory excluded — it's read on-demand for building cost checks, not display.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      slots,
      loading,
      unlockSlot,
      harvestResource,
      placeBuilding,
      removeBuilding,
      canAffordUnlock,
      getSlot,
    ],
  );
}
