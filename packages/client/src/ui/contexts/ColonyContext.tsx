import React, { createContext, useContext } from 'react';
import type { PlacedBuilding } from '@nebulife/core';

export interface ColonyResources {
  minerals: number;
  volatiles: number;
  isotopes: number;
}

export interface ColonyContextValue {
  resources: ColonyResources;
  setResources: React.Dispatch<React.SetStateAction<ColonyResources>>;
  upgradeBuilding: (buildingId: string) => Promise<PlacedBuilding | null>;
  /** Update storage slot type for resource_storage building */
  updateStorageType?: (buildingId: string, slotType: 'minerals' | 'volatiles' | 'isotopes') => void;
  /** Report current buildings list so App can track quantum_computer presence */
  reportBuildings?: (buildings: Array<{ type: string; shutdown?: boolean }>) => void;
}

const ColonyContext = createContext<ColonyContextValue | null>(null);

export function ColonyProvider({
  value,
  children,
}: {
  value: ColonyContextValue;
  children: React.ReactNode;
}) {
  return <ColonyContext.Provider value={value}>{children}</ColonyContext.Provider>;
}

export function useColony(): ColonyContextValue {
  const ctx = useContext(ColonyContext);
  if (!ctx) throw new Error('useColony must be used within ColonyProvider');
  return ctx;
}
