import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ELEMENTS,
  ELEMENT_GROUP,
  GROUP_COLORS,
  RESOURCE_GROUPS,
} from '@nebulife/core';
import type { ResourceGroup } from '@nebulife/core';

/** i18n key for each resource group label */
const GROUP_T_KEY: Record<ResourceGroup, string> = {
  mineral:  'resource_display.desc.minerals_name',
  volatile: 'resource_display.desc.volatiles_name',
  isotope:  'resource_display.desc.isotopes_name',
};

// ---------------------------------------------------------------------------
// ResourcesView -- Colony resource inventory with periodic table breakdown
// ---------------------------------------------------------------------------

interface ResourcesViewProps {
  minerals:  number;
  volatiles: number;
  isotopes:  number;
  water:     number;
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

/** Water molecule breakdown entries */
const WATER_MOLECULES_UK = [
  { symbol: 'H\u2082O', name: '\u0412\u043e\u0434\u0430',              color: '#44aaff' },
  { symbol: 'OH\u207B', name: '\u0413\u0456\u0434\u0440\u043e\u043a\u0441\u0438\u0434-\u0456\u043e\u043d', color: '#66bbff' },
  { symbol: 'H\u207A',  name: '\u041f\u0440\u043e\u0442\u043e\u043d',   color: '#aaddff' },
  { symbol: 'D\u2082O', name: '\u0412\u0430\u0436\u043a\u0430 \u0432\u043e\u0434\u0430', color: '#7799cc' },
];

const WATER_MOLECULES_EN = [
  { symbol: 'H\u2082O', name: 'Water',         color: '#44aaff' },
  { symbol: 'OH\u207B', name: 'Hydroxide ion', color: '#66bbff' },
  { symbol: 'H\u207A',  name: 'Proton',        color: '#aaddff' },
  { symbol: 'D\u2082O', name: 'Heavy water',   color: '#7799cc' },
];

const WATER_COLOR = '#3b82f6';

export function ResourcesView({ minerals, volatiles, isotopes, water }: ResourcesViewProps) {
  const { t, i18n } = useTranslation();
  const totals = { minerals, volatiles, isotopes };
  const [collapsed, setCollapsed] = useState<Set<ResourceGroup | 'water'>>(new Set());

  const toggle = (g: ResourceGroup | 'water') => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g); else next.add(g);
      return next;
    });
  };

  const waterMolecules = i18n.language === 'en' ? WATER_MOLECULES_EN : WATER_MOLECULES_UK;
  const isWaterOpen = !collapsed.has('water');

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
        const label    = t(GROUP_T_KEY[group]);
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
                {t('gallery.elements_count', { count: elements.length })}
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
                  <span>{t('gallery.col_name')}</span>
                  <span style={{ textAlign: 'right' }}>Z</span>
                  <span style={{ textAlign: 'right' }}>{t('gallery.col_mass')}</span>
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

                    {/* Name (localized) */}
                    <span style={{ color: '#8899aa' }}>
                      {i18n.language === 'uk' ? el.nameUk : el.name}
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

      {/* Water — standalone section */}
      <div>
        <button
          onClick={() => toggle('water')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '8px 10px',
            background: 'rgba(15,25,40,0.5)',
            border: `1px solid ${WATER_COLOR}44`,
            borderRadius: 4,
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          {/* Expand/collapse indicator */}
          <span style={{ color: '#445566', fontSize: 10, width: 10, textAlign: 'center' }}>
            {isWaterOpen ? 'v' : '>'}
          </span>

          {/* Color dot — droplet shape */}
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 10,
              background: WATER_COLOR,
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
              clipPath: 'polygon(50% 0%, 100% 60%, 85% 100%, 15% 100%, 0% 60%)',
              flexShrink: 0,
            }}
          />

          {/* Label */}
          <span style={{ color: WATER_COLOR, fontSize: 12, fontWeight: 600, flex: 1, textAlign: 'left' }}>
            {t('resource_display.desc.water_name')}
          </span>

          {/* Molecule count */}
          <span style={{ color: '#556677', fontSize: 10 }}>
            {t('gallery.elements_count', { count: waterMolecules.length })}
          </span>

          {/* Total value */}
          <span style={{ color: '#aabbcc', fontSize: 12, fontWeight: 600, minWidth: 40, textAlign: 'right' }}>
            {water}
          </span>
        </button>

        {/* Molecule breakdown table */}
        {isWaterOpen && (
          <div style={{ marginTop: 4, paddingLeft: 4 }}>
            {/* Column headers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '48px 1fr',
                padding: '4px 8px',
                fontSize: 9,
                color: '#445566',
                letterSpacing: '0.5px',
                borderBottom: '1px solid rgba(51,68,85,0.2)',
                marginBottom: 2,
              }}
            >
              <span>SYM</span>
              <span>{t('gallery.col_name')}</span>
            </div>

            {/* Molecule rows */}
            {waterMolecules.map((mol) => (
              <div
                key={mol.symbol}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '48px 1fr',
                  padding: '3px 8px',
                  fontSize: 11,
                  borderBottom: '1px solid rgba(51,68,85,0.1)',
                }}
              >
                <span style={{ color: mol.color, fontWeight: 600 }}>{mol.symbol}</span>
                <span style={{ color: '#8899aa' }}>{mol.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom spacer */}
      <div style={{ height: 16 }} />
    </div>
  );
}
