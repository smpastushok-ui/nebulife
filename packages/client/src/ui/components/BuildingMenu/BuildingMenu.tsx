import React, { useState, useCallback, useEffect } from 'react';
import type { PlacedBuilding, ProducibleType, ProductionQueueItem } from '@nebulife/core';
import BuildingMenuHeader from './BuildingMenuHeader.js';
import StatsTab from './tabs/StatsTab.js';
import UpgradeTab from './tabs/UpgradeTab.js';
import ProductionTab from './tabs/ProductionTab.js';
import RefineryTab from './tabs/RefineryTab.js';
import StorageTab from './tabs/StorageTab.js';
import DemolishSection from './DemolishSection.js';
import { C, panelStyle, tabBtnBase, scrollBody } from './building-menu-styles.js';

// ── Tab definitions ──────────────────────────────────────────────────────────

type TabId = 'stats' | 'upgrade' | 'production' | 'refinery' | 'storage';

interface TabDef {
  id: TabId;
  label: string;
}

const TABS_BASE: TabDef[] = [
  { id: 'stats',   label: 'Стат.' },
  { id: 'upgrade', label: 'Покращ.' },
];

const PRODUCTION_TYPES = new Set(['spaceport', 'landing_pad']);
const REFINERY_TYPES = new Set(['quantum_separator', 'gas_fractionator', 'isotope_centrifuge']);
const STORAGE_TYPES = new Set(['resource_storage']);
const NO_UPGRADE_TYPES = new Set(['alpha_harvester']);

function getTabsForBuilding(buildingType: string): TabDef[] {
  const tabs: TabDef[] = [{ id: 'stats', label: 'Стат.' }];
  if (!NO_UPGRADE_TYPES.has(buildingType)) tabs.push({ id: 'upgrade', label: 'Покращ.' });
  if (PRODUCTION_TYPES.has(buildingType)) tabs.push({ id: 'production', label: 'Виробн.' });
  if (REFINERY_TYPES.has(buildingType))   tabs.push({ id: 'refinery',   label: 'Переробка' });
  if (STORAGE_TYPES.has(buildingType))    tabs.push({ id: 'storage',    label: 'Сховище' });
  return tabs;
}

// ── CSS keyframes (injected once) ────────────────────────────────────────────

let injected = false;
function injectKeyframes() {
  if (injected) return;
  injected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes bm-slide-in {
      from { transform: translateX(100%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
    @keyframes bm-pulse {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.4; }
    }
  `;
  document.head.appendChild(style);
}

// ── Component ────────────────────────────────────────────────────────────────

interface BuildingMenuProps {
  building: PlacedBuilding;
  allBuildings: PlacedBuilding[];
  isDemolishing: boolean;
  onClose: () => void;
  onDemolish: () => void;
  /** Callback when building is upgraded — receives updated building */
  onBuildingUpdated: (updated: PlacedBuilding) => void;
  /** Production queue for this planet */
  productionQueue?: ProductionQueueItem[];
  /** Start producing a unit */
  onStartProduction?: (type: ProducibleType) => void;
  /** Change storage slot type */
  onStorageTypeChange?: (buildingId: string, slotType: 'minerals' | 'volatiles' | 'isotopes') => void;
}

export default function BuildingMenu({
  building,
  allBuildings,
  isDemolishing,
  onClose,
  onDemolish,
  onBuildingUpdated,
  productionQueue = [],
  onStartProduction,
  onStorageTypeChange,
}: BuildingMenuProps) {
  injectKeyframes();

  const tabs = getTabsForBuilding(building.type);
  const [activeTab, setActiveTab] = useState<TabId>('stats');

  // Reset tab when building changes
  useEffect(() => {
    setActiveTab('stats');
  }, [building.id]);

  // Ensure active tab is valid for this building
  const validTab = tabs.some(t => t.id === activeTab) ? activeTab : 'stats';

  const handleUpgraded = useCallback((updated: PlacedBuilding) => {
    onBuildingUpdated(updated);
  }, [onBuildingUpdated]);

  const handleStorageChange = useCallback((id: string, slotType: 'minerals' | 'volatiles' | 'isotopes') => {
    onStorageTypeChange?.(id, slotType);
  }, [onStorageTypeChange]);

  const isHQ = building.type === 'colony_hub';

  return (
    <div style={{
      ...panelStyle,
      animation: 'bm-slide-in 0.2s ease-out',
    }}>
      {/* Header */}
      <BuildingMenuHeader building={building} onClose={onClose} />

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${C.border}`,
        background: C.tabBarBg,
        overflowX: 'auto',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...tabBtnBase,
              color: validTab === tab.id ? C.accentBlueBright : C.textMuted,
              borderBottom: validTab === tab.id
                ? `2px solid ${C.accentBlue}`
                : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={scrollBody}>
        {validTab === 'stats' && (
          <StatsTab building={building} allBuildings={allBuildings} />
        )}
        {validTab === 'upgrade' && (
          <UpgradeTab building={building} onUpgraded={handleUpgraded} />
        )}
        {validTab === 'production' && onStartProduction && (
          <ProductionTab
            building={building}
            productionQueue={productionQueue}
            onStartProduction={onStartProduction}
          />
        )}
        {validTab === 'refinery' && (
          <RefineryTab building={building} />
        )}
        {validTab === 'storage' && (
          <StorageTab building={building} onStorageTypeChange={handleStorageChange} />
        )}
      </div>

      {/* Demolish */}
      <DemolishSection
        isHQ={isHQ}
        isDemolishing={isDemolishing}
        onDemolish={onDemolish}
      />
    </div>
  );
}
