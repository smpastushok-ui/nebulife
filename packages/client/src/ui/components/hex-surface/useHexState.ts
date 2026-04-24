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
  HexPlanetSize,
} from './hex-utils.js';
import {
  getUnlockCost,
  rollRarity,
  rollResourceType,
  rarityYield,
  isResourceReady,
  respawnTimeRemaining,
  PLANET_LAYOUTS,
  computeZone,
  getAdjacentIds,
  getHexPositions,
} from './hex-utils.js';
import { getPlanetSize } from '@nebulife/core';

// ---------------------------------------------------------------------------
// Module-level player data cache — avoids repeated network calls on re-mount
// ---------------------------------------------------------------------------
let _lastFetchTime = 0;
let _lastFetchData: any = null;
const CACHE_TTL_MS = 30_000; // 30 seconds

/** Quarks cost to instantly unlock any locked hex slot (premium shortcut). */
export const SLOT_UNLOCK_QUARKS_COST = 10;

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface HexStateResult {
  slots: HexSlotData[];
  loading: boolean;

  // Actions
  unlockSlot: (slotId: string) => boolean;
  /** Premium-pay path: 10 quarks instantly unlocks any locked slot regardless
   *  of colony-resource cost. Caller must ensure `onConsumeQuarks` is wired. */
  unlockSlotWithQuarks: (slotId: string) => boolean;
  harvestResource: (slotId: string) => number | null;
  placeBuilding: (slotId: string, type: BuildingType) => boolean;
  removeBuilding: (slotId: string) => void;
  destroyResource: (slotId: string) => void;

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
// Layout descriptors — size-aware
// ---------------------------------------------------------------------------

/** Hub hex = zone 0 for a given planet size */
function getHubId(size: HexPlanetSize): string {
  const positions = getHexPositions(size);
  const hub = positions.find(p => p.ring === 0);
  return hub?.id ?? 'd4-2'; // fallback: medium hub
}

/**
 * Enumerate all hexes for a given planet size in row-major order,
 * returning (row, col, zone, index-within-zone).
 */
function buildDiamondDescriptors(size: HexPlanetSize = 'medium'): Array<{
  row: number;
  col: number;
  id: string;
  zone: number;
  zoneIndex: number;
}> {
  const widths = PLANET_LAYOUTS[size];
  const raw: Array<{ row: number; col: number; id: string; zone: number }> = [];
  for (let row = 0; row < widths.length; row++) {
    const cols = widths[row];
    for (let col = 0; col < cols; col++) {
      raw.push({ row, col, id: `d${row}-${col}`, zone: computeZone(row, col, size) });
    }
  }
  const zoneCounters: Record<number, number> = {};
  return raw.map((h) => {
    const zi = zoneCounters[h.zone] ?? 0;
    zoneCounters[h.zone] = zi + 1;
    return { ...h, zoneIndex: zi };
  });
}

// ---------------------------------------------------------------------------
// Recalculate unlock costs for all locked slots
// ---------------------------------------------------------------------------

function recalculateLockedCosts(slots: HexSlotData[]): HexSlotData[] {
  // Compute per-zone unlock counts for progressive cost (if needed in future)
  const zoneUnlocked: Record<number, number> = {};
  for (const s of slots) {
    if (s.state !== 'locked' && s.state !== 'hidden') {
      zoneUnlocked[s.ring] = (zoneUnlocked[s.ring] ?? 0) + 1;
    }
  }
  return slots.map(s => {
    if (s.state !== 'locked') return s;
    return { ...s, unlockCost: getUnlockCost(s.ring, zoneUnlocked[s.ring] ?? 0) };
  });
}

// ---------------------------------------------------------------------------
// Reveal logic — unlocking a hex makes its hidden zone-N+1 neighbours 'locked'
// ---------------------------------------------------------------------------

function revealAdjacentHidden(slots: HexSlotData[], unlockedId: string, size: HexPlanetSize = 'medium'): HexSlotData[] {
  const m = unlockedId.match(/^d(\d+)-(\d+)$/);
  if (!m) return slots; // old-format id — skip adjacency reveal

  const row = parseInt(m[1], 10);
  const col = parseInt(m[2], 10);
  const adjIds = new Set(getAdjacentIds(row, col, size));

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

function buildInitialSlots(size: HexPlanetSize = 'medium'): HexSlotData[] {
  const descriptors = buildDiamondDescriptors(size);
  const slots: HexSlotData[] = descriptors.map(({ id, zone, zoneIndex }) => {
    if (zone === 0) {
      // Hub — auto-unlocked with colony building
      return {
        id,
        ring: 0,
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
        ring: 1,
        index: zoneIndex,
        state: 'locked' as HexState,
      };
    }
    // Zone 2+ — hidden until neighbours are unlocked
    return {
      id,
      ring: zone,
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

function migrateRingToDiamond(oldSlots: HexSlotData[], size: HexPlanetSize = 'medium'): HexSlotData[] {
  if (!oldSlots.length || !oldSlots[0].id.startsWith('ring')) {
    // Already diamond format or empty — run adjacency + cost fix only
    return fixDiamondSlots(oldSlots, size);
  }

  console.info('[useHexState] Migrating ring-based saves to diamond layout');

  // Build fresh diamond slots
  const descriptors = buildDiamondDescriptors(size);

  // Index old slots by id for quick lookup
  const oldById = new Map<string, HexSlotData>();
  for (const s of oldSlots) oldById.set(s.id, s);

  // Map old ring slots to new diamond slots by zone order
  // ring0-0 -> d4-2 (zone 0, index 0)
  // ring1-0..5 -> zone1 slots in order
  // ring2-0..11 -> zone2 slots in order
  const zoneDescriptors: Record<number, Array<{ row: number; col: number; id: string; zone: number; zoneIndex: number }>> = { 0: [], 1: [], 2: [], 3: [] };
  for (const d of descriptors) zoneDescriptors[d.zone].push(d);

  const newSlots: HexSlotData[] = descriptors.map(({ row, col, id, zone, zoneIndex }) => {
    if (zone === 0) {
      // Try to restore hub state from old ring0-0
      const oldHub = oldById.get('ring0-0');
      return {
        id,
        ring: 0,
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
          ring: 1,
          index: zoneIndex,
        };
      }
      return {
        id,
        ring: 1,
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
          ring: 2,
          index: zoneIndex,
        };
      }
      return {
        id,
        ring: 2,
        index: zoneIndex,
        state: 'hidden' as HexState,
      };
    }

    // Zone 3+ — new, always hidden
    return {
      id,
      ring: zone,
      index: zoneIndex,
      state: 'hidden' as HexState,
    };
  });

  return fixDiamondSlots(newSlots, size);
}

/**
 * Fix diamond-format slots: ensure all zone N+1 neighbours of unlocked hexes
 * are at least 'locked' (not 'hidden'), then recalculate costs.
 */
function fixDiamondSlots(slots: HexSlotData[], size: HexPlanetSize = 'medium'): HexSlotData[] {
  let result = [...slots];
  for (const s of slots) {
    if (s.state !== 'hidden' && s.state !== 'locked') {
      result = revealAdjacentHidden(result, s.id, size);
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
  size: HexPlanetSize = 'medium',
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
    return computeZone(parseInt(m[1], 10), parseInt(m[2], 10), size) === 1;
  })();

  const h = Math.abs(Math.sin(seed * 0.17 + stringHash(slotId) * 0.031)) * 100;

  if (isZone1 || h < 70) {
    const resourceType = rollResourceType(seed, slotId, undefined, undefined, size);
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
  // Drone auto-harvest callbacks (FX/XP)
  onDroneHarvest?: (objectType: string) => void,
  onDroneHarvestAmount?: (amount: number) => void,
  // Research data for hex unlock costs
  researchData?: number,
  onConsumeResearchData?: (amount: number) => void,
  // Quarks for premium slot unlock (SLOT_UNLOCK_QUARKS_COST per slot).
  quarks?: number,
  onConsumeQuarks?: (amount: number) => void,
): HexStateResult {
  // Pass full planet so gas-giants → 'orbital' and dwarf → 'small'
  const planetSize = getPlanetSize(planet);

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
      // Always persist to localStorage immediately (survives app close / reload)
      try { localStorage.setItem('nebulife_hex_slots', JSON.stringify(newSlots)); } catch { /* ignore */ }
      // Debounce server save
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

    const expectedHubId = getHubId(planetSize);

    /** Validate and migrate saved slots for current planet size */
    const validateAndMigrate = (raw: HexSlotData[]): HexSlotData[] => {
      const migrated = migrateRingToDiamond(raw, planetSize);
      // If hub ID doesn't match expected layout → rebuild (planet size changed)
      const hubSlot = migrated.find(s => s.ring === 0);
      if (!hubSlot || hubSlot.id !== expectedHubId) {
        console.info('[useHexState] Hub ID mismatch — rebuilding for', planetSize);
        return buildInitialSlots(planetSize);
      }
      return migrated;
    };

    // 1) Load from localStorage FIRST (instant, survives app restart)
    // If data exists, show it immediately WITHOUT loading screen
    let localLoaded = false;
    try {
      const local = localStorage.getItem('nebulife_hex_slots');
      if (local) {
        const parsed = JSON.parse(local) as HexSlotData[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSlots(validateAndMigrate(parsed));
          setLoading(false); // Hide loading screen immediately
          localLoaded = true;
        }
      }
    } catch { /* ignore */ }

    // 2) Then load from server in background (authoritative — may have cross-device changes)
    (async () => {
      try {
        // Use module-level cache to avoid repeated network calls on re-mount
        let playerData: any;
        const now = Date.now();
        if (_lastFetchData && now - _lastFetchTime < CACHE_TTL_MS) {
          playerData = _lastFetchData;
        } else {
          playerData = await getPlayer(playerId);
          _lastFetchTime = Date.now();
          _lastFetchData = playerData;
        }

        if (cancelled) return;

        const saved = playerData?.game_state?.hex_slots;

        if (Array.isArray(saved) && saved.length > 0) {
          const serverSlots = validateAndMigrate(saved as HexSlotData[]);
          // Fix 5: Only update if different from current (skip identical server data)
          if (JSON.stringify(serverSlots) !== JSON.stringify(slotsRef.current)) {
            setSlots(serverSlots);
            // Sync localStorage with server truth
            try { localStorage.setItem('nebulife_hex_slots', JSON.stringify(serverSlots)); } catch { /* ignore */ }
          }
        } else {
          // No server data — check if localStorage already loaded slots
          const hasLocal = slotsRef.current.length > 0;
          if (!hasLocal) {
            const initial = buildInitialSlots(planetSize);
            setSlots(initial);
            scheduleSave(initial);
          } else {
            // Persist localStorage data to server
            scheduleSave(slotsRef.current);
          }
        }
      } catch (err) {
        console.error('[useHexState] load failed:', err);
        // If localStorage didn't load anything either, create initial
        if (!cancelled && slotsRef.current.length === 0) setSlots(buildInitialSlots(planetSize));
      } finally {
        if (!cancelled && !localLoaded) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flush pending save on unmount (don't lose data!)
  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        // Flush immediately — send current slots to server
        updatePlayer(playerId, {
          game_state: { hex_slots: slotsRef.current },
        }).catch(() => {});
      }
    };
  }, [playerId]);

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
  // canAffordUnlock — exported as a stable ref-based function (not reactive)
  // Called only on click, NOT in the render loop, to avoid cascade re-renders
  // ---------------------------------------------------------------------------

  const canAffordUnlock = useCallback(
    (slotId: string): boolean => {
      const slot = slotsRef.current.find((s) => s.id === slotId);
      if (!slot || slot.state !== 'locked' || !slot.unlockCost) return false;
      if (!canAffordCost(colonyResources, slot.unlockCost)) return false;
      // Check research data requirement
      const rdCost = slot.unlockCost.researchData ?? 0;
      if (rdCost > 0 && (researchData ?? 0) < rdCost) return false;
      return true;
    },
    [colonyResources, researchData],
  );

  // ---------------------------------------------------------------------------
  // unlockSlot
  // ---------------------------------------------------------------------------

  const unlockSlot = useCallback(
    (slotId: string): boolean => {
      const slot = slotsRef.current.find((s) => s.id === slotId);
      if (!slot || slot.state !== 'locked' || !slot.unlockCost) return false;
      if (!canAffordCost(colonyResources, slot.unlockCost)) return false;
      // Check research data
      const rdCost = slot.unlockCost.researchData ?? 0;
      if (rdCost > 0 && (researchData ?? 0) < rdCost) return false;

      // Deduct resources
      onResourceChange?.({
        minerals:  -(slot.unlockCost.minerals  ?? 0),
        volatiles: -(slot.unlockCost.volatiles ?? 0),
        isotopes:  -(slot.unlockCost.isotopes  ?? 0),
        water:     -(slot.unlockCost.water     ?? 0),
      });
      // Deduct research data
      if (rdCost > 0) onConsumeResearchData?.(rdCost);

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
      const rolled = rollSlotContents(planet.seed, slotId, forceResource, planetSize);

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
        next = revealAdjacentHidden(next, slotId, planetSize);

        // Recalculate costs for remaining locked hexes
        return recalculateLockedCosts(next);
      });

      return true;
    },
    [colonyResources, onResourceChange, planet.seed, updateSlots],
  );

  // ---------------------------------------------------------------------------
  // unlockSlotWithQuarks — premium-pay shortcut for locked hexes. Fixed cost
  // in quarks (SLOT_UNLOCK_QUARKS_COST) and bypasses colony-resource checks.
  // Used from the locked-hex UI when the player can't / doesn't want to pay
  // the regular minerals/volatiles/isotopes/water bill.
  // ---------------------------------------------------------------------------

  const unlockSlotWithQuarks = useCallback(
    (slotId: string): boolean => {
      const slot = slotsRef.current.find((s) => s.id === slotId);
      if (!slot || slot.state !== 'locked') return false;
      if ((quarks ?? 0) < SLOT_UNLOCK_QUARKS_COST) return false;
      if (!onConsumeQuarks) return false;

      onConsumeQuarks(SLOT_UNLOCK_QUARKS_COST);

      // Mirror the same Zone-1 home-planet forced-resource logic so the
      // first 4 unlocks still guarantee all 4 resource types regardless of
      // whether the player paid with resources or quarks.
      let forceResource: ResourceType | undefined;
      const homePlanetId = typeof window !== 'undefined'
        ? localStorage.getItem('nebulife_home_planet_id') : null;
      const isHome = homePlanetId === planet.id;
      if (isHome && slot.ring === 1) {
        const zone1Unlocked = slotsRef.current.filter(
          (s) => s.ring === 1 && s.state !== 'locked' && s.state !== 'hidden',
        ).length;
        if (zone1Unlocked === 0) forceResource = 'ore';
        if (zone1Unlocked === 1) forceResource = 'vent';
        if (zone1Unlocked === 2) forceResource = 'water';
        if (zone1Unlocked === 3) forceResource = 'tree';
      }

      const rolled = rollSlotContents(planet.seed, slotId, forceResource, planetSize);

      updateSlots((prev) => {
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
        next = revealAdjacentHidden(next, slotId, planetSize);
        return recalculateLockedCosts(next);
      });

      return true;
    },
    [quarks, onConsumeQuarks, planet.id, planet.seed, planetSize, updateSlots],
  );

  // ---------------------------------------------------------------------------
  // harvestResource
  // ---------------------------------------------------------------------------

  const harvestResource = useCallback(
    (slotId: string): number | null => {
      const slot = slotsRef.current.find((s) => s.id === slotId);
      if (!slot || slot.state !== 'resource') return null;
      if (!isResourceReady(slot.lastHarvestedAt, slot.yieldPerHour, slot.ring)) return null;
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
  // destroyResource — clear resource tile → 'empty' (free for building)
  // ---------------------------------------------------------------------------

  const destroyResource = useCallback(
    (slotId: string): void => {
      const slot = slotsRef.current.find((s) => s.id === slotId);
      if (!slot || slot.state !== 'resource') return;
      updateSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? {
                ...s,
                state: 'empty' as HexState,
                resourceType: undefined,
                rarity: undefined,
                yieldPerHour: undefined,
                maxCapacity: undefined,
                lastHarvestedAt: undefined,
              }
            : s,
        ),
      );
    },
    [updateSlots],
  );

  // ---------------------------------------------------------------------------
  // Drone auto-harvester (alpha_harvester)
  // Three modes: active scan (10s), wait for respawn, safety check (60s)
  // ---------------------------------------------------------------------------

  const droneHarvestRef = useRef(onDroneHarvest);
  droneHarvestRef.current = onDroneHarvest;
  const droneHarvestAmountRef = useRef(onDroneHarvestAmount);
  droneHarvestAmountRef.current = onDroneHarvestAmount;
  const harvestResourceRef = useRef(harvestResource);
  harvestResourceRef.current = harvestResource;

  // Derive a stable boolean — only re-run the drone effect when harvester is added/removed
  const hasHarvester = slots.some(s => s.buildingType === 'alpha_harvester');

  useEffect(() => {
    if (!hasHarvester) return;

    const DRONE_INTERVAL = 10_000;  // 10s between harvests
    const SAFETY_INTERVAL = 60_000; // 60s safety check

    let harvestTimer: ReturnType<typeof setTimeout> | null = null;
    let respawnTimers: ReturnType<typeof setTimeout>[] = [];
    let safetyTimer: ReturnType<typeof setInterval> | null = null;
    let stopped = false;

    const getReadySlots = (): HexSlotData[] => {
      return slotsRef.current.filter(s =>
        s.state === 'resource' &&
        s.resourceType &&
        s.yieldPerHour &&
        isResourceReady(s.lastHarvestedAt, s.yieldPerHour, s.ring)
      );
    };

    const clearRespawnTimers = () => {
      for (const t of respawnTimers) clearTimeout(t);
      respawnTimers = [];
    };

    const scheduleRespawnWatchers = () => {
      clearRespawnTimers();
      const pending = slotsRef.current.filter(s =>
        s.state === 'resource' && s.lastHarvestedAt && s.resourceType &&
        !isResourceReady(s.lastHarvestedAt, s.yieldPerHour, s.ring)
      );
      for (const slot of pending) {
        const remaining = respawnTimeRemaining(slot.lastHarvestedAt!, slot.yieldPerHour, slot.ring);
        if (remaining > 0) {
          const t = setTimeout(() => {
            if (!stopped) droneHarvestCycle();
          }, remaining + 200); // +200ms margin
          respawnTimers.push(t);
        }
      }
    };

    const droneHarvestCycle = () => {
      if (stopped) return;
      if (harvestTimer) { clearTimeout(harvestTimer); harvestTimer = null; }

      const ready = getReadySlots();
      if (ready.length === 0) {
        scheduleRespawnWatchers();
        return;
      }

      // Harvest first ready resource
      const target = ready[0];
      const amount = harvestResourceRef.current(target.id);
      if (amount !== null && target.resourceType) {
        const objType = RESOURCE_TO_COLONY[target.resourceType];
        droneHarvestRef.current?.(objType);
        droneHarvestAmountRef.current?.(amount);
      }

      // Schedule next harvest in 10s (if more ready)
      harvestTimer = setTimeout(droneHarvestCycle, DRONE_INTERVAL);
    };

    // Start drone cycle
    droneHarvestCycle();

    // Safety check every 60s
    safetyTimer = setInterval(() => {
      if (!stopped && !harvestTimer) droneHarvestCycle();
    }, SAFETY_INTERVAL);

    return () => {
      stopped = true;
      if (harvestTimer) clearTimeout(harvestTimer);
      clearRespawnTimers();
      if (safetyTimer) clearInterval(safetyTimer);
    };
  }, [hasHarvester]); // Only re-run when harvester is added/removed (not on every slots change)

  // ---------------------------------------------------------------------------
  // Result
  // ---------------------------------------------------------------------------

  return useMemo(
    () => ({
      slots,
      loading,
      unlockSlot,
      unlockSlotWithQuarks,
      harvestResource,
      placeBuilding,
      removeBuilding,
      destroyResource,
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
      unlockSlotWithQuarks,
      harvestResource,
      placeBuilding,
      removeBuilding,
      destroyResource,
      canAffordUnlock,
      getSlot,
    ],
  );
}
