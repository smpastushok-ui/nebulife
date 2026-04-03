import React, { useEffect, useRef } from 'react';
import type { BuildingType } from '@nebulife/core';
import { BUILDING_DEFS } from '@nebulife/core';

interface HexBuildMenuProps {
  slotId: string;
  screenX: number;
  screenY: number;
  playerLevel: number;
  techTreeState?: any;
  colonyResources: { minerals: number; volatiles: number; isotopes: number };
  onSelect: (type: BuildingType) => void;
  onClose: () => void;
}

// Colony resource cost estimate: raw element costs → approximate mineral/volatile/isotope cost
// We show raw element cost directly since BUILDING_DEFS uses elements
function formatCost(def: { cost: { resource: string; amount: number }[] }): string {
  return def.cost.map((c) => `${c.amount} ${c.resource}`).join(' / ');
}

// Check if tech is researched using techTreeState (flat map of techId -> boolean)
function isTechResearched(techTreeState: any, techId: string | null): boolean {
  if (techId === null) return true;
  if (!techTreeState) return false;
  // techTreeState may be { researched: Record<string,boolean> } or a flat Record
  if (techTreeState.researched) return !!techTreeState.researched[techId];
  return !!techTreeState[techId];
}

// Visible buildings: filter by level and tech
function getAvailableBuildings(
  playerLevel: number,
  techTreeState: any,
): BuildingType[] {
  return (Object.keys(BUILDING_DEFS) as BuildingType[]).filter((type) => {
    const def = BUILDING_DEFS[type];
    if (def.levelRequired > playerLevel) return false;
    if (!isTechResearched(techTreeState, def.techRequired)) return false;
    // Skip colony_hub — it's already placed in center slot
    if (type === 'colony_hub') return false;
    return true;
  });
}

const CATEGORY_ORDER = [
  'infrastructure',
  'energy',
  'extraction',
  'science',
  'biosphere',
  'chemistry',
] as const;

const CATEGORY_LABEL: Record<string, string> = {
  infrastructure: 'INFRASTRUCTURE',
  energy:         'ENERGY',
  extraction:     'EXTRACTION',
  science:        'SCIENCE',
  biosphere:      'BIOSPHERE',
  chemistry:      'CHEMISTRY',
};

export function HexBuildMenu({
  slotId,
  screenX,
  screenY,
  playerLevel,
  techTreeState,
  colonyResources,
  onSelect,
  onClose,
}: HexBuildMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const available = getAvailableBuildings(playerLevel, techTreeState);

  // Group by category
  const grouped = CATEGORY_ORDER.reduce<Partial<Record<string, BuildingType[]>>>((acc, cat) => {
    const items = available.filter((t) => BUILDING_DEFS[t].category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Clamp position so menu stays within viewport
  const menuW = 260;
  const menuH = 300;
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;
  const left = Math.min(screenX, vpW - menuW - 12);
  const top  = Math.min(screenY, vpH - menuH - 12);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left,
        top,
        width: menuW,
        maxHeight: menuH,
        background: 'rgba(8,14,24,0.96)',
        border: '1px solid #334455',
        borderRadius: 4,
        boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
        overflowY: 'auto',
        zIndex: 1000,
        fontFamily: 'monospace',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: '1px solid #1e2d3d',
      }}>
        <span style={{ color: '#7bb8ff', fontSize: 11, letterSpacing: 1 }}>
          BUILD
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#556677',
            cursor: 'pointer',
            fontSize: 14,
            padding: '0 2px',
            fontFamily: 'monospace',
          }}
        >
          x
        </button>
      </div>

      {/* Building list */}
      <div style={{ padding: '4px 0' }}>
        {Object.entries(grouped).map(([cat, types]) => (
          <div key={cat}>
            {/* Category separator */}
            <div style={{
              padding: '4px 12px 2px',
              fontSize: 8,
              color: '#445566',
              letterSpacing: 2,
            }}>
              {CATEGORY_LABEL[cat] ?? cat.toUpperCase()}
            </div>

            {types!.map((type) => {
              const def = BUILDING_DEFS[type];
              const costStr = formatCost(def);
              const canAfford = true; // Raw cost in elements — always show, purchase handled in hook

              return (
                <div
                  key={type}
                  onClick={() => { onSelect(type); onClose(); }}
                  style={{
                    padding: '6px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(30,45,60,0.5)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(68,136,170,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  }}
                >
                  {/* Building name */}
                  <div style={{
                    fontSize: 11,
                    color: '#aabbcc',
                    marginBottom: 2,
                  }}>
                    {def.name}
                  </div>

                  {/* Description */}
                  <div style={{
                    fontSize: 9,
                    color: '#667788',
                    marginBottom: 3,
                    lineHeight: 1.4,
                  }}>
                    {def.description}
                  </div>

                  {/* Cost + level */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{
                      fontSize: 9,
                      color: '#4488aa',
                    }}>
                      {costStr}
                    </span>
                    <span style={{
                      fontSize: 8,
                      color: '#334455',
                    }}>
                      L{def.levelRequired}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {available.length === 0 && (
          <div style={{
            padding: '16px 12px',
            fontSize: 10,
            color: '#445566',
            textAlign: 'center',
          }}>
            No buildings available at your current level.
          </div>
        )}
      </div>
    </div>
  );
}
