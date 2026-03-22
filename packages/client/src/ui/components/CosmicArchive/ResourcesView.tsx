import React, { useState } from 'react';
import {
  ELEMENTS,
  ELEMENT_GROUP,
  GROUP_NAMES,
  GROUP_COLORS,
  RESOURCE_GROUPS,
} from '@nebulife/core';
import type { ResourceGroup } from '@nebulife/core';

// ---------------------------------------------------------------------------
// ResourcesView -- Colony resource inventory with periodic table breakdown
// ---------------------------------------------------------------------------

interface ResourcesViewProps {
  minerals:  number;
  volatiles: number;
  isotopes:  number;
}

/** Map resource group to the corresponding ColonyResources key */
const GROUP_KEY: Record<ResourceGroup, 'minerals' | 'volatiles' | 'isotopes'> = {
  mineral:  'minerals',
  volatile: 'volatiles',
  isotope:  'isotopes',
};

/** Get all elements belonging to a group, sorted by atomic number */
function getGroupElementsSorted(group: ResourceGroup) {
  return Object.values(ELEMENTS)
    .filter((el) => ELEMENT_GROUP[el.symbol] === group)
    .sort((a, b) => a.atomicNumber - b.atomicNumber);
}

export function ResourcesView({ minerals, volatiles, isotopes }: ResourcesViewProps) {
  const totals = { minerals, volatiles, isotopes };
  const [collapsed, setCollapsed] = useState<Set<ResourceGroup>>(new Set());

  const toggle = (g: ResourceGroup) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g); else next.add(g);
      return next;
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        padding: '12px 8px',
        animation: 'tech-tree-fade-in 0.35s ease-out',
      }}
    >
      {RESOURCE_GROUPS.map((group) => {
        const color    = GROUP_COLORS[group];
        const label    = GROUP_NAMES[group];
        const total    = totals[GROUP_KEY[group]];
        const elements = getGroupElementsSorted(group);
        const isOpen   = !collapsed.has(group);

        return (
          <div key={group}>
            {/* Group header */}
            <button
              onClick={() => toggle(group)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '8px 10px',
                background: 'rgba(15,25,40,0.5)',
                border: `1px solid ${color}44`,
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >
              {/* Expand/collapse indicator */}
              <span style={{ color: '#445566', fontSize: 10, width: 10, textAlign: 'center' }}>
                {isOpen ? 'v' : '>'}
              </span>

              {/* Color dot */}
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: color,
                  flexShrink: 0,
                }}
              />

              {/* Group name */}
              <span style={{ color, fontSize: 12, fontWeight: 600, flex: 1, textAlign: 'left' }}>
                {label}
              </span>

              {/* Element count */}
              <span style={{ color: '#556677', fontSize: 10 }}>
                {elements.length} елементів
              </span>

              {/* Total value */}
              <span style={{ color: '#aabbcc', fontSize: 12, fontWeight: 600, minWidth: 40, textAlign: 'right' }}>
                {total}
              </span>
            </button>

            {/* Element table */}
            {isOpen && (
              <div style={{ marginTop: 4, paddingLeft: 4 }}>
                {/* Column headers */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '38px 1fr 36px 60px',
                    padding: '4px 8px',
                    fontSize: 9,
                    color: '#445566',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid rgba(51,68,85,0.2)',
                    marginBottom: 2,
                  }}
                >
                  <span>SYM</span>
                  <span>НАЗВА</span>
                  <span style={{ textAlign: 'right' }}>Z</span>
                  <span style={{ textAlign: 'right' }}>МАСА</span>
                </div>

                {/* Element rows */}
                {elements.map((el) => (
                  <div
                    key={el.symbol}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '38px 1fr 36px 60px',
                      padding: '3px 8px',
                      fontSize: 11,
                      borderBottom: '1px solid rgba(51,68,85,0.1)',
                    }}
                  >
                    {/* Symbol */}
                    <span style={{ color, fontWeight: 600 }}>
                      {el.symbol}
                    </span>

                    {/* Name */}
                    <span style={{ color: '#8899aa' }}>
                      {el.name}
                    </span>

                    {/* Atomic number */}
                    <span style={{ color: '#556677', textAlign: 'right' }}>
                      {el.atomicNumber}
                    </span>

                    {/* Atomic mass */}
                    <span style={{ color: '#667788', textAlign: 'right' }}>
                      {el.atomicMass.toFixed(el.atomicMass >= 100 ? 1 : 3)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Bottom spacer */}
      <div style={{ height: 16 }} />
    </div>
  );
}
