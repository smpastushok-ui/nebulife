import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ELEMENTS,
  ELEMENT_GROUP,
  GROUP_COLORS,
  RESOURCE_GROUPS,
} from '@nebulife/core';
import type { ResourceGroup } from '@nebulife/core';
import { ResourceIcon, RESOURCE_COLORS, type ResourceType } from '../ResourceIcon.js';

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
  playerLevel: number;
  chemicalInventory: Record<string, number>;
}

/** Map resource group to the corresponding ColonyResources key */
const GROUP_KEY: Record<ResourceGroup, 'minerals' | 'volatiles' | 'isotopes'> = {
  mineral:  'minerals',
  volatile: 'volatiles',
  isotope:  'isotopes',
};

const GROUP_ICON_TYPE: Record<ResourceGroup, ResourceType> = {
  mineral:  'minerals',
  volatile: 'volatiles',
  isotope:  'isotopes',
};

/** Get all owned elements belonging to a group, sorted by stored amount. */
function getOwnedGroupElements(
  group: ResourceGroup,
  chemicalInventory: Record<string, number>,
) {
  return Object.values(ELEMENTS)
    .filter((el) => ELEMENT_GROUP[el.symbol] === group)
    .map((el) => ({ ...el, amount: chemicalInventory[el.symbol] ?? 0 }))
    .filter((el) => el.amount > 0)
    .sort((a, b) => b.amount - a.amount || a.atomicNumber - b.atomicNumber);
}

/** Split stored water into its chemical element mass fractions. */
function getWaterElementBreakdown(water: number, lang: string) {
  // H2O molar mass: H2 = 2.016, O = 15.999, total = 18.015.
  // Deuterium is shown as a tiny trace isotope to make heavy-water chemistry visible.
  const hydrogen = water * (2.016 / 18.015);
  const deuterium = hydrogen * 0.000156;
  const lightHydrogen = hydrogen - deuterium;
  const oxygen = water * (15.999 / 18.015);
  return [
    { symbol: 'O', name: lang === 'uk' ? '\u041a\u0438\u0441\u0435\u043d\u044c' : 'Oxygen', atomicNumber: 8, amount: oxygen, color: '#66bbff' },
    { symbol: 'H', name: lang === 'uk' ? '\u0412\u043e\u0434\u0435\u043d\u044c' : 'Hydrogen', atomicNumber: 1, amount: lightHydrogen, color: '#aaddff' },
    { symbol: 'D', name: lang === 'uk' ? '\u0414\u0435\u0439\u0442\u0435\u0440\u0456\u0439' : 'Deuterium', atomicNumber: 1, amount: deuterium, color: '#7799cc' },
  ].filter((el) => el.amount >= 0.01);
}

const WATER_COLOR = RESOURCE_COLORS.water;
const PERIODIC_TABLE_LEVEL = 48;
const COLLAPSED_BY_DEFAULT = new Set<ResourceGroup | 'water'>([
  ...RESOURCE_GROUPS,
  'water',
]);

export function ResourcesView({ minerals, volatiles, isotopes, water, playerLevel, chemicalInventory }: ResourcesViewProps) {
  const { t, i18n } = useTranslation();
  const totals = { minerals, volatiles, isotopes };
  const [collapsed, setCollapsed] = useState<Set<ResourceGroup | 'water'>>(COLLAPSED_BY_DEFAULT);
  const canViewPeriodicTable = playerLevel >= PERIODIC_TABLE_LEVEL;

  const toggle = (g: ResourceGroup | 'water') => {
    if (!canViewPeriodicTable) return;
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g); else next.add(g);
      return next;
    });
  };

  const waterElements = getWaterElementBreakdown(water, i18n.language);
  const isWaterOpen = canViewPeriodicTable && !collapsed.has('water');

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
      {!canViewPeriodicTable && (
        <div
          style={{
            padding: '10px 12px',
            border: '1px solid rgba(68, 102, 136, 0.28)',
            borderRadius: 4,
            background: 'rgba(8, 14, 24, 0.48)',
            color: '#667788',
            fontSize: 11,
            lineHeight: 1.55,
          }}
        >
          {t('archive.resources_periodic_locked', { level: PERIODIC_TABLE_LEVEL })}
        </div>
      )}
      {RESOURCE_GROUPS.map((group) => {
        const color    = GROUP_COLORS[group];
        const iconType = GROUP_ICON_TYPE[group];
        const accent   = RESOURCE_COLORS[iconType];
        const label    = t(GROUP_T_KEY[group]);
        const total    = totals[GROUP_KEY[group]];
        const elements = getOwnedGroupElements(group, chemicalInventory);
        const isOpen   = canViewPeriodicTable && !collapsed.has(group);

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
                border: `1px solid ${accent}44`,
                borderRadius: 4,
                cursor: canViewPeriodicTable ? 'pointer' : 'default',
                fontFamily: 'monospace',
                opacity: canViewPeriodicTable ? 1 : 0.78,
              }}
            >
              {/* Expand/collapse indicator */}
              <span style={{ color: '#445566', fontSize: 10, width: 10, textAlign: 'center' }}>
                {canViewPeriodicTable ? (isOpen ? 'v' : '>') : '×'}
              </span>

              <ResourceIcon type={iconType} size={14} />

              {/* Group name */}
              <span style={{ color: accent, fontSize: 12, fontWeight: 600, flex: 1, textAlign: 'left' }}>
                {label}
              </span>

              {/* Element count */}
              <span style={{ color: '#556677', fontSize: 10 }}>
                {canViewPeriodicTable
                  ? t('gallery.elements_count', { count: elements.length })
                  : t('archive.locked_level_short', { level: PERIODIC_TABLE_LEVEL })}
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
                    gridTemplateColumns: '38px 1fr 36px 70px',
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
                  <span style={{ textAlign: 'right' }}>{t('gallery.col_amount')}</span>
                </div>

                {/* Element rows */}
                {elements.length > 0 ? elements.map((el) => (
                  <div
                    key={el.symbol}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '38px 1fr 36px 70px',
                      padding: '3px 8px',
                      fontSize: 11,
                      borderBottom: '1px solid rgba(51,68,85,0.1)',
                    }}
                  >
                    <span style={{ color, fontWeight: 600 }}>{el.symbol}</span>
                    <span style={{ color: '#8899aa' }}>{i18n.language === 'uk' ? el.nameUk : el.name}</span>
                    <span style={{ color: '#556677', textAlign: 'right' }}>{el.atomicNumber}</span>
                    <span style={{ color: '#aabbcc', textAlign: 'right', fontWeight: 600 }}>
                      {Number.isInteger(el.amount) ? el.amount.toLocaleString() : el.amount.toFixed(2)}
                    </span>
                  </div>
                )) : (
                  <div style={{ padding: '8px', fontSize: 10, color: '#445566' }}>
                    {t('archive.no_elements_owned')}
                  </div>
                )}
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
            cursor: canViewPeriodicTable ? 'pointer' : 'default',
            fontFamily: 'monospace',
            opacity: canViewPeriodicTable ? 1 : 0.78,
          }}
        >
          {/* Expand/collapse indicator */}
          <span style={{ color: '#445566', fontSize: 10, width: 10, textAlign: 'center' }}>
            {canViewPeriodicTable ? (isWaterOpen ? 'v' : '>') : '×'}
          </span>

          <ResourceIcon type="water" size={14} />

          {/* Label */}
          <span style={{ color: WATER_COLOR, fontSize: 12, fontWeight: 600, flex: 1, textAlign: 'left' }}>
            {t('resource_display.desc.water_name')}
          </span>

          {/* Molecule count */}
          <span style={{ color: '#556677', fontSize: 10 }}>
            {canViewPeriodicTable
              ? t('gallery.elements_count', { count: waterElements.length })
              : t('archive.locked_level_short', { level: PERIODIC_TABLE_LEVEL })}
          </span>

          {/* Total value */}
          <span style={{ color: '#aabbcc', fontSize: 12, fontWeight: 600, minWidth: 40, textAlign: 'right' }}>
            {water}
          </span>
        </button>

        {/* Water element breakdown table */}
        {isWaterOpen && (
          <div style={{ marginTop: 4, paddingLeft: 4 }}>
            {/* Column headers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '38px 1fr 36px 70px',
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
              <span style={{ textAlign: 'right' }}>{t('gallery.col_amount')}</span>
            </div>

            {/* Element rows */}
            {waterElements.length > 0 ? waterElements.map((el) => (
              <div
                key={el.symbol}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '38px 1fr 36px 70px',
                  padding: '3px 8px',
                  fontSize: 11,
                  borderBottom: '1px solid rgba(51,68,85,0.1)',
                }}
              >
                <span style={{ color: el.color, fontWeight: 600 }}>{el.symbol}</span>
                <span style={{ color: '#8899aa' }}>{el.name}</span>
                <span style={{ color: '#556677', textAlign: 'right' }}>{el.atomicNumber}</span>
                <span style={{ color: '#aabbcc', textAlign: 'right', fontWeight: 600 }}>
                  {Number.isInteger(el.amount) ? el.amount.toLocaleString() : el.amount.toFixed(2)}
                </span>
              </div>
            )) : (
              <div style={{ padding: '8px', fontSize: 10, color: '#445566' }}>
                {t('archive.no_elements_owned')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom spacer */}
      <div style={{ height: 16 }} />
    </div>
  );
}
