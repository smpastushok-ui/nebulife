/**
 * ResourceDescriptionModal — shows a brief description of a resource type
 * with its chemical/physical composition breakdown.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

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
}

export function ResourceDescriptionModal({ resource, onClose }: ResourceDescriptionModalProps) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const elements = (isEn ? ELEMENTS_EN : ELEMENTS)[resource];

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
      </div>
    </>
  );
}
