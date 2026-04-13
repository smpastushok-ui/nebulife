/**
 * ResourceDescriptionModal — shows a brief description of a resource type
 * with its chemical/physical composition breakdown.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PlanetColonyState } from '@nebulife/core';
import { BUILDING_DEFS } from '@nebulife/core';

export type ResourceType = 'observatories' | 'research_data' | 'minerals' | 'volatiles' | 'isotopes' | 'quarks' | 'water';

interface Element {
  symbol: string;
  name: string;
  color: string;
}

const ELEMENTS: Record<ResourceType, Element[]> = {
  observatories: [],
  research_data: [
    { symbol: 'EM', name: 'Електромагнітне випромінювання', color: '#4488aa' },
    { symbol: 'RF', name: 'Радіочастотний спектр', color: '#7bb8ff' },
    { symbol: 'GW', name: 'Гравітаційні хвилі', color: '#9966aa' },
    { symbol: 'Nu', name: 'Нейтрінний потік', color: '#44aacc' },
  ],
  minerals: [
    { symbol: 'Si', name: 'Кремній',    color: '#aa9966' },
    { symbol: 'Fe', name: 'Залізо',     color: '#cc6644' },
    { symbol: 'Al', name: 'Алюміній',   color: '#8899aa' },
    { symbol: 'Ca', name: 'Кальцій',    color: '#aabbcc' },
    { symbol: 'Mg', name: 'Магній',     color: '#88aa77' },
    { symbol: 'Ti', name: 'Титан',      color: '#7799bb' },
  ],
  volatiles: [
    { symbol: 'H₂O', name: 'Вода',                  color: '#44aaff' },
    { symbol: 'CO₂', name: 'Вуглекислий газ',        color: '#aabb88' },
    { symbol: 'CH₄', name: 'Метан',                  color: '#ffaa44' },
    { symbol: 'N₂',  name: 'Азот',                   color: '#7799cc' },
    { symbol: 'NH₃', name: 'Аміак',                  color: '#88ccaa' },
    { symbol: 'SO₂', name: 'Діоксид сірки',          color: '#ccaa55' },
  ],
  isotopes: [
    { symbol: '²³⁵U',  name: 'Уран-235',     color: '#88cc44' },
    { symbol: '²³²Th', name: 'Торій-232',    color: '#aacc66' },
    { symbol: '³He',   name: 'Гелій-3',      color: '#44ffcc' },
    { symbol: '²H',    name: 'Дейтерій',     color: '#66bbff' },
    { symbol: '²³⁹Pu', name: 'Плутоній-239', color: '#cc7744' },
  ],
  quarks: [],
  water: [
    { symbol: 'H₂O', name: 'Вода',              color: '#44aaff' },
    { symbol: 'OH⁻', name: 'Гідроксид-іон',     color: '#66bbff' },
    { symbol: 'H⁺',  name: 'Протон',             color: '#aaddff' },
    { symbol: 'D₂O', name: 'Важка вода',         color: '#7799cc' },
  ],
};

const ELEMENTS_EN: Record<ResourceType, Element[]> = {
  observatories: [],
  research_data: [
    { symbol: 'EM', name: 'Electromagnetic radiation',  color: '#4488aa' },
    { symbol: 'RF', name: 'Radio frequency spectrum',   color: '#7bb8ff' },
    { symbol: 'GW', name: 'Gravitational waves',        color: '#9966aa' },
    { symbol: 'Nu', name: 'Neutrino flux',              color: '#44aacc' },
  ],
  minerals: [
    { symbol: 'Si', name: 'Silicon',    color: '#aa9966' },
    { symbol: 'Fe', name: 'Iron',       color: '#cc6644' },
    { symbol: 'Al', name: 'Aluminium',  color: '#8899aa' },
    { symbol: 'Ca', name: 'Calcium',    color: '#aabbcc' },
    { symbol: 'Mg', name: 'Magnesium',  color: '#88aa77' },
    { symbol: 'Ti', name: 'Titanium',   color: '#7799bb' },
  ],
  volatiles: [
    { symbol: 'H₂O', name: 'Water',           color: '#44aaff' },
    { symbol: 'CO₂', name: 'Carbon dioxide',   color: '#aabb88' },
    { symbol: 'CH₄', name: 'Methane',          color: '#ffaa44' },
    { symbol: 'N₂',  name: 'Nitrogen',         color: '#7799cc' },
    { symbol: 'NH₃', name: 'Ammonia',          color: '#88ccaa' },
    { symbol: 'SO₂', name: 'Sulfur dioxide',   color: '#ccaa55' },
  ],
  isotopes: [
    { symbol: '²³⁵U',  name: 'Uranium-235',   color: '#88cc44' },
    { symbol: '²³²Th', name: 'Thorium-232',    color: '#aacc66' },
    { symbol: '³He',   name: 'Helium-3',       color: '#44ffcc' },
    { symbol: '²H',    name: 'Deuterium',      color: '#66bbff' },
    { symbol: '²³⁹Pu', name: 'Plutonium-239',  color: '#cc7744' },
  ],
  quarks: [],
  water: [
    { symbol: 'H₂O', name: 'Water',         color: '#44aaff' },
    { symbol: 'OH⁻', name: 'Hydroxide ion', color: '#66bbff' },
    { symbol: 'H⁺',  name: 'Proton',        color: '#aaddff' },
    { symbol: 'D₂O', name: 'Heavy water',   color: '#7799cc' },
  ],
};

interface ResourceDescriptionModalProps {
  resource: ResourceType;
  onClose: () => void;
  colonyState?: PlanetColonyState | null;
}

export function ResourceDescriptionModal({ resource, onClose, colonyState }: ResourceDescriptionModalProps) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const elements = (isEn ? ELEMENTS_EN : ELEMENTS)[resource];

  // Compute building RD production rates
  const buildingRates: { name: string; count: number; ratePerHour: number; shutdown: number }[] = [];
  if (resource === 'research_data' && colonyState?.buildings) {
    const groups: Record<string, { count: number; shutdown: number }> = {};
    for (const b of colonyState.buildings) {
      const def = BUILDING_DEFS[b.type as keyof typeof BUILDING_DEFS];
      if (!def) continue;
      const rdProd = def.production.find(p => p.resource === 'researchData');
      if (!rdProd) continue;
      if (!groups[b.type]) groups[b.type] = { count: 0, shutdown: 0 };
      groups[b.type].count++;
      if (b.shutdown) groups[b.type].shutdown++;
    }
    for (const [type, g] of Object.entries(groups)) {
      const def = BUILDING_DEFS[type as keyof typeof BUILDING_DEFS];
      const rdProd = def.production.find(p => p.resource === 'researchData');
      if (!rdProd) continue;
      // amount is per tick (60s), so per hour = amount * 60
      const ratePerHour = rdProd.amount * 60;
      const displayName = isEn
        ? type.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())
        : def.name;
      buildingRates.push({
        name: displayName,
        count: g.count,
        ratePerHour: ratePerHour * (g.count - g.shutdown),
        shutdown: g.shutdown,
      });
    }
  }
  const passiveRate = 1; // 1 RD/hour base for all players
  const totalPerHour = buildingRates.reduce((s, b) => s + b.ratePerHour, 0) + passiveRate;
  const totalPerMin = totalPerHour / 60;

  const name = t(`resource_display.desc.${resource}_name`);
  const desc = t(`resource_display.desc.${resource}_desc`);

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9800,
          background: 'rgba(2,5,16,0.72)',
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9801,
          width: 340,
          background: 'rgba(10,15,25,0.97)',
          border: '1px solid #334455',
          borderRadius: 4,
          padding: '22px 24px 20px',
          fontFamily: 'monospace',
          color: '#aabbcc',
          pointerEvents: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 10,
            right: 12,
            background: 'none',
            border: 'none',
            color: '#667788',
            fontFamily: 'monospace',
            fontSize: 16,
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1,
          }}
        >
          x
        </button>

        {/* Title */}
        <p style={{ margin: '0 0 8px', fontSize: 13, color: '#7bb8ff', letterSpacing: 1 }}>
          {name}
        </p>

        {/* Description */}
        <p style={{ margin: '0 0 16px', fontSize: 11, color: '#8899aa', lineHeight: 1.55 }}>
          {desc}
        </p>

        {/* Chemical / physical composition */}
        {elements.length > 0 && (
          <>
            <p style={{ margin: '0 0 10px', fontSize: 10, color: '#556677', letterSpacing: 2, textTransform: 'uppercase' }}>
              {isEn ? 'Composition' : 'Склад'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
              {elements.map(el => (
                <div
                  key={el.symbol}
                  style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}
                >
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 13,
                      fontWeight: 700,
                      color: el.color,
                      minWidth: 40,
                    }}
                  >
                    {el.symbol}
                  </span>
                  <span style={{ fontSize: 10, color: '#667788' }}>{el.name}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Production section — only for research_data */}
        {resource === 'research_data' && (
          <div style={{ borderTop: '1px solid #223344', marginTop: 14, paddingTop: 10 }}>
            <p style={{ margin: '0 0 8px', fontSize: 10, color: '#556677', letterSpacing: 2, textTransform: 'uppercase' }}>
              {isEn ? 'Production' : 'Виробництво'}
            </p>

            {/* Passive regen */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#667788', marginBottom: 3 }}>
              <span>{isEn ? 'Passive regen' : 'Пасивний реген'}</span>
              <span style={{ color: '#4488aa' }}>+{passiveRate}/{isEn ? 'hr' : 'год'}</span>
            </div>

            {/* Building rates */}
            {buildingRates.map((b, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#667788', marginBottom: 3 }}>
                <span>
                  {b.name} x{b.count}
                  {b.shutdown > 0 && <span style={{ color: '#cc4444', fontSize: 8 }}> ({b.shutdown} off)</span>}
                </span>
                <span style={{ color: b.shutdown === b.count ? '#cc4444' : '#4488aa' }}>
                  +{b.ratePerHour.toFixed(1)}/{isEn ? 'hr' : 'год'}
                </span>
              </div>
            ))}

            {/* Totals */}
            <div style={{ borderTop: '1px solid #223344', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aabbcc' }}>
              <span style={{ fontWeight: 'bold' }}>{isEn ? 'Total' : 'Всього'}</span>
              <span>
                <span style={{ color: '#44ff88' }}>+{totalPerMin.toFixed(2)}/{isEn ? 'min' : 'хв'}</span>
                <span style={{ color: '#556677', margin: '0 4px' }}>|</span>
                <span style={{ color: '#44ff88' }}>+{totalPerHour.toFixed(1)}/{isEn ? 'hr' : 'год'}</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
