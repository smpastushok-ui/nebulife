// ---------------------------------------------------------------------------
// useHexState — State management for hex ring surface
// Replaces useSurfaceState.ts (no terrain grid, no A*, no bots)
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Planet, Star, BuildingType, PlacedBuilding } from '@nebulife/core';
import { BUILDING_DEFS } from '@nebulife/core';
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
  RESOURCE_RESPAWN_MS,
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
}

// ---------------------------------------------------------------------------
// Resource group mapping
// ResourceType -> which colony resource bucket it fills
// ---------------------------------------------------------------------------

const RESOURCE_TO_COLONY: Record<ResourceType, keyof { minerals: number; volatiles: number; isotopes: number }> = {
  ore:   'minerals',
  tree:  'minerals',  // biomass counts as minerals
  vent:  'volatiles',
  water: 'volatiles', // water counts as volatiles
};

// ---------------------------------------------------------------------------
// Initial state builder
// ---------------------------------------------------------------------------

/**
 * Recalculate unlock costs for all locked slots based on current unlock progress.
 * All locked hexes in the same ring show the SAME cost (the "next" unlock cost).
 */
function recalculateLockedCosts(slots: HexSlotData[]): HexSlotData[] {
  const ring1Unlocked = slots.filter(s => s.ring === 1 && s.state !== 'locked').length;
  const ring2Unlocked = slots.filter(s => s.ring === 2 && s.state !== 'locked' && s.state !== 'hidden').length;

  const ring1NextCost = getUnlockCost(1, ring1Unlocked);
  const ring2NextCost = getUnlockCost(2, ring2Unlocked);

  return slots.map(s => {
    if (s.state === 'locked' && s.ring === 1) return { ...s, unlockCost: ring1NextCost };
    if (s.state === 'locked' && s.ring === 2) return { ...s, unlockCost: ring2NextCost };
    return s;
  });
}

function buildInitialSlots(): HexSlotData[] {
  const slots: HexSlotData[] = [];

  // Ring 0 — center: colony hub (free)
  slots.push({
    id: 'ring0-0',
    ring: 0,
    index: 0,
    state: 'building',
    buildingType: 'colony_hub',
    buildingLevel: 1,
  });

  // Ring 1 — 6 locked slots (isotopes only, progressive cost)
  for (let i = 0; i < 6; i++) {
    slots.push({
      id: `ring1-${i}`,
      ring: 1,
      index: i,
      state: 'locked',
    });
  }

  // Ring 2 — 12 hidden slots (invisible until ring1 neighbor unlocked)
  for (let i = 0; i < 12; i++) {
    slots.push({
      id: `ring2-${i}`,
      ring: 2,
      index: i,
      state: 'hidden',
    });
  }

  return recalculateLockedCosts(slots);
}

// ---------------------------------------------------------------------------
// Deterministic resource roll helpers
// ---------------------------------------------------------------------------

function rollSlotContents(
  seed: number,
  slotId: string,
): { state: 'resource' | 'empty'; resourceType?: ResourceType; rarity?: Rarity; yieldPerHour?: number } {
  // 70% resource, 30% empty — deterministic via sin hash
  const h = Math.abs(Math.sin(seed * 0.17 + stringHash(slotId) * 0.031)) * 100;

  if (h < 70) {
    const resourceType = rollResourceType(seed, slotId);
    const rarity = rollRarity(seed, slotId);
    const yieldPerHour = rarityYield(rarity);
    return { state: 'resource', resourceType, rarity, yieldPerHour };
  }
  return { state: 'empty' };
}

function stringHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

// ---------------------------------------------------------------------------
// ELEMENT_GROUP cost mapping
// Building cost resources use names like 'minerals', 'volatiles', 'isotopes'
// ---------------------------------------------------------------------------

type ColonyResources = { minerals: number; volatiles: number; isotopes: number };

function buildingCost(type: BuildingType): Partial<ColonyResources> {
  const def = BUILDING_DEFS[type];
  if (!def) return {};
  const cost: Partial<ColonyResources> = {};
  for (const c of def.cost) {
    const key = c.resource as keyof ColonyResources;
    if (key === 'minerals' || key === 'volatiles' || key === 'isotopes') {
      cost[key] = (cost[key] ?? 0) + c.amount;
    }
  }
  return cost;
}

function canAffordCost(resources: ColonyResources, cost: Partial<ColonyResources>): boolean {
  return (
    (resources.minerals >= (cost.minerals ?? 0)) &&
    (resources.volatiles >= (cost.volatiles ?? 0)) &&
    (resources.isotopes >= (cost.isotopes ?? 0))
  );
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
): HexStateResult {
  const [slots, setSlots] = useState<HexSlotData[]>([]);
  const [loading, setLoading] = useState(true);

  // Debounce save timer
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Latest slots ref for callbacks that close over stale state
  const slotsRef = useRef<HexSlotData[]>([]);
  slotsRef.current = slots;

  // ---------------------------------------------------------------------------
  // Persist to DB (debounced)
  // ---------------------------------------------------------------------------

  const scheduleSave = useCallback(
    (newSlots: HexSlotData[]) => {
      if (saveTimerRef.current !== null) {
        clearTimeout(saveTimerRef.current);
      }
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
          // Migrate: recalculate costs for saved data (handles old flat-cost format)
          setSlots(recalculateLockedCosts(saved as HexSlotData[]));
        } else {
          const initial = buildInitialSlots();
          setSlots(initial);
          scheduleSave(initial);
        }
      } catch (err) {
        console.error('[useHexState] load failed:', err);
        if (!cancelled) {
          setSlots(buildInitialSlots());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup save timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Respawn timer — check every 60s, trigger re-render when resource respawns
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const intervalId = setInterval(() => {
      const current = slotsRef.current;
      const hasExpired = current.some(
        (s) => s.state === 'resource' && s.lastHarvestedAt !== undefined && isResourceReady(s.lastHarvestedAt),
      );
      if (hasExpired) {
        // Force re-render by creating a new array reference (slots are unchanged,
        // isResourceReady() is recalculated in UI components)
        setSlots((prev) => [...prev]);
      }
    }, 60_000);

    return () => clearInterval(intervalId);
  }, []);

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
    (slotId: string): HexSlotData | undefined => {
      return slotsRef.current.find((s) => s.id === slotId);
    },
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
      });

      // Roll slot contents
      const rolled = rollSlotContents(planet.seed, slotId);

      updateSlots((prev) => {
        let next = prev.map((s) => {
          if (s.id !== slotId) return s;
          return {
            ...s,
            state: rolled.state,
            resourceType:  rolled.resourceType,
            rarity:        rolled.rarity,
            yieldPerHour:  rolled.yieldPerHour,
            maxCapacity:   rolled.yieldPerHour ? rolled.yieldPerHour * 12 : undefined,
            unlockCost:    undefined,
            lastHarvestedAt: undefined,
          } as HexSlotData;
        });

        // If ring 1 slot unlocked → reveal 2 adjacent ring 2 slots
        if (slot.ring === 1) {
          const i = slot.index;
          const adj = [i * 2, (i * 2 + 1) % 12];
          next = next.map((s) => {
            if (s.ring === 2 && adj.includes(s.index) && s.state === 'hidden') {
              return { ...s, state: 'locked' as HexState };
            }
            return s;
          });
        }

        // Recalculate costs for all remaining locked slots (progressive pricing)
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
        prev.map((s) =>
          s.id === slotId ? { ...s, lastHarvestedAt: now } : s,
        ),
      );

      const colonyKey = RESOURCE_TO_COLONY[slot.resourceType];
      onResourceChange?.({ [colonyKey]: yieldAmount });

      return yieldAmount;
    },
    [onResourceChange, updateSlots],
  );

  // ---------------------------------------------------------------------------
  // placeBuilding
  // ---------------------------------------------------------------------------

  const placeBuilding = useCallback(
    (slotId: string, type: BuildingType): boolean => {
      const slot = slotsRef.current.find((s) => s.id === slotId);
      if (!slot || slot.state !== 'empty') return false;

      const cost = buildingCost(type);
      if (!canAffordCost(colonyResources, cost)) return false;

      // Deduct cost
      const delta: Partial<ColonyResources> = {};
      if (cost.minerals)  delta.minerals  = -(cost.minerals);
      if (cost.volatiles) delta.volatiles = -(cost.volatiles);
      if (cost.isotopes)  delta.isotopes  = -(cost.isotopes);
      if (Object.keys(delta).length > 0) onResourceChange?.(delta);

      updateSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? { ...s, state: 'building' as HexState, buildingType: type, buildingLevel: 1 }
            : s,
        ),
      );

      onBuildingPlaced?.(type);

      // Persist to surface_buildings table (fire-and-forget)
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
    [colonyResources, onBuildingPlaced, onResourceChange, planet.id, playerId, updateSlots],
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
            ? {
                ...s,
                state:         'empty' as HexState,
                buildingType:  undefined,
                buildingLevel: undefined,
              }
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
    }),
    [
      slots,
      loading,
      unlockSlot,
      harvestResource,
      placeBuilding,
      removeBuilding,
      canAffordUnlock,
      getSlot,
      colonyResources.minerals,
      colonyResources.volatiles,
      colonyResources.isotopes,
    ],
  );
}
