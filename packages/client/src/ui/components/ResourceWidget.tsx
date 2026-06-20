/**
 * ResourceWidget — fixed top-right HUD showing current colony resource counts.
 * Shown only on the Surface view (rendered from SurfacePanel).
 *
 * Values pulse (scale pop) when they change.
 * Each icon element has a forwarded ref so the parent can compute fly-to targets.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ELEMENTS } from '@nebulife/core';
import { ResourceIcon, RESOURCE_COLORS } from './ResourceIcon.js';

interface ResourceWidgetProps {
  minerals:  number;
  volatiles: number;
  isotopes:  number;
  water:     number;
  storageCapacity?: number;
  playerLevel?: number;
  chemicalInventory?: Record<string, number>;
  /** Optional: callback to expose icon DOM rects for fly animations. */
  onRefsReady?: (rects: {
    minerals:  DOMRect;
    volatiles: DOMRect;
    isotopes:  DOMRect;
    water:     DOMRect;
  }) => void;
}

const ITEM_BASE: React.CSSProperties = {
  display:        'flex',
  alignItems:     'center',
  gap:            4,
  padding:        '3px 7px',
  transition:     'transform 0.18s cubic-bezier(.34,1.8,.64,1)',
  transformOrigin:'left center',
};

const PERIODIC_TABLE_LEVEL = 48;
type ResourceKey = 'minerals' | 'volatiles' | 'isotopes' | 'water';
const RESOURCE_KEYS: ResourceKey[] = ['minerals', 'volatiles', 'isotopes', 'water'];

function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Math.round(value).toLocaleString();
}

export const ResourceWidget: React.FC<ResourceWidgetProps> = ({
  minerals,
  volatiles,
  isotopes,
  water,
  storageCapacity = 1000,
  playerLevel = 1,
  chemicalInventory = {},
  onRefsReady,
}) => {
  const { t, i18n } = useTranslation();
  const minRef = useRef<HTMLDivElement>(null);
  const volRef = useRef<HTMLDivElement>(null);
  const isoRef = useRef<HTMLDivElement>(null);
  const watRef = useRef<HTMLDivElement>(null);

  const [popMin, setPopMin] = useState(false);
  const [popVol, setPopVol] = useState(false);
  const [popIso, setPopIso] = useState(false);
  const [popWat, setPopWat] = useState(false);

  const prevMin = useRef(minerals);
  const prevVol = useRef(volatiles);
  const prevIso = useRef(isotopes);
  const prevWat = useRef(water);
  const [detailsOpen, setDetailsOpen] = useState(true);

  const resources: Record<ResourceKey, number> = { minerals, volatiles, isotopes, water };
  const canViewElements = playerLevel >= PERIODIC_TABLE_LEVEL;
  const ownedElements = useMemo(() => (
    Object.values(ELEMENTS)
      .map((element) => ({ ...element, amount: chemicalInventory[element.symbol] ?? 0 }))
      .filter((element) => element.amount > 0)
      .sort((a, b) => b.amount - a.amount || a.atomicNumber - b.atomicNumber)
      .slice(0, 8)
  ), [chemicalInventory]);

  // Trigger pop animation when value increases
  useEffect(() => {
    if (minerals !== prevMin.current) {
      prevMin.current = minerals;
      setPopMin(true);
      const t = setTimeout(() => setPopMin(false), 220);
      return () => clearTimeout(t);
    }
  }, [minerals]);

  useEffect(() => {
    if (volatiles !== prevVol.current) {
      prevVol.current = volatiles;
      setPopVol(true);
      const t = setTimeout(() => setPopVol(false), 220);
      return () => clearTimeout(t);
    }
  }, [volatiles]);

  useEffect(() => {
    if (isotopes !== prevIso.current) {
      prevIso.current = isotopes;
      setPopIso(true);
      const t = setTimeout(() => setPopIso(false), 220);
      return () => clearTimeout(t);
    }
  }, [isotopes]);

  useEffect(() => {
    if (water !== prevWat.current) {
      prevWat.current = water;
      setPopWat(true);
      const t = setTimeout(() => setPopWat(false), 220);
      return () => clearTimeout(t);
    }
  }, [water]);

  // Expose icon rects to parent after mount
  useEffect(() => {
    if (!onRefsReady) return;
    const frame = requestAnimationFrame(() => {
      const mr = minRef.current?.getBoundingClientRect();
      const vr = volRef.current?.getBoundingClientRect();
      const ir = isoRef.current?.getBoundingClientRect();
      const wr = watRef.current?.getBoundingClientRect();
      if (mr && vr && ir && wr) onRefsReady({ minerals: mr, volatiles: vr, isotopes: ir, water: wr });
    });
    return () => cancelAnimationFrame(frame);
  }, [onRefsReady]);

  const containerStyle: React.CSSProperties = {
    position:        'fixed',
    top:             'calc(14px + env(safe-area-inset-top, 0px))',
    right:           'calc(14px + env(safe-area-inset-right, 0px))',
    background:      'rgba(10,15,25,0.92)',
    border:          '1px solid #334455',
    borderRadius:    4,
    fontFamily:      'monospace',
    fontSize:        11,
    color:           '#aabbcc',
    display:         'flex',
    flexDirection:   'column',
    gap:             0,
    zIndex:          200,
    userSelect:      'none',
    pointerEvents:   'auto',
    overflow:        'hidden',
    minWidth:        276,
  };

  const dividerStyle: React.CSSProperties = {
    width:           1,
    background:      '#2a3a4a',
    alignSelf:       'stretch',
  };

  return (
    <div style={containerStyle}>
      <button
        type="button"
        onClick={() => setDetailsOpen((value) => !value)}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          padding: 0,
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          fontFamily: 'monospace',
          cursor: 'pointer',
        }}
      >
        <div ref={minRef} style={{ ...ITEM_BASE, transform: popMin ? 'scale(1.22)' : 'scale(1)' }}>
          <ResourceIcon type="minerals" size={11} />
          <span style={{ color: RESOURCE_COLORS.minerals, minWidth: 22, textAlign: 'right' }}>{formatAmount(minerals)}</span>
        </div>
        <div style={dividerStyle} />
        <div ref={volRef} style={{ ...ITEM_BASE, transform: popVol ? 'scale(1.22)' : 'scale(1)' }}>
          <ResourceIcon type="volatiles" size={11} />
          <span style={{ color: RESOURCE_COLORS.volatiles, minWidth: 22, textAlign: 'right' }}>{formatAmount(volatiles)}</span>
        </div>
        <div style={dividerStyle} />
        <div ref={isoRef} style={{ ...ITEM_BASE, transform: popIso ? 'scale(1.22)' : 'scale(1)' }}>
          <ResourceIcon type="isotopes" size={11} />
          <span style={{ color: RESOURCE_COLORS.isotopes, minWidth: 22, textAlign: 'right' }}>{formatAmount(isotopes)}</span>
        </div>
        <div style={dividerStyle} />
        <div ref={watRef} style={{ ...ITEM_BASE, transform: popWat ? 'scale(1.22)' : 'scale(1)' }}>
          <ResourceIcon type="water" size={11} />
          <span style={{ color: RESOURCE_COLORS.water, minWidth: 22, textAlign: 'right' }}>{formatAmount(water)}</span>
        </div>
        <span style={{ marginLeft: 'auto', padding: '0 8px', color: '#667788', fontSize: 10 }}>
          {detailsOpen ? 'v' : '>'}
        </span>
      </button>

      {detailsOpen && (
        <div style={{
          borderTop: '1px solid #223344',
          padding: '9px 10px 10px',
          background: 'rgba(5,10,20,0.58)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7, gap: 10 }}>
            <div style={{ color: '#aabbcc', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' }}>
              {t('resource_widget.storage_title')}
            </div>
            <div style={{ color: '#667788', fontSize: 9 }}>
              {t('resource_widget.limit_label')}: {formatAmount(storageCapacity)}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            {RESOURCE_KEYS.map((key) => {
              const value = resources[key];
              const ratio = storageCapacity > 0 ? Math.min(1, Math.max(0, value / storageCapacity)) : 0;
              return (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '92px 1fr 86px', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: RESOURCE_COLORS[key], fontSize: 10 }}>
                    <ResourceIcon type={key} size={10} />
                    <span>{t(`colony_center.resource.${key}`)}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 999, background: 'rgba(51,68,85,0.5)', overflow: 'hidden' }}>
                    <div style={{ width: `${ratio * 100}%`, height: '100%', background: RESOURCE_COLORS[key], opacity: ratio >= 0.98 ? 0.95 : 0.7 }} />
                  </div>
                  <div style={{ color: ratio >= 0.98 ? '#ff8844' : '#aabbcc', fontSize: 10, textAlign: 'right' }}>
                    {formatAmount(value)} / {formatAmount(storageCapacity)}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(51,68,85,0.45)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
              <span style={{ color: '#8899aa', fontSize: 10, letterSpacing: 1.1, textTransform: 'uppercase' }}>
                {t('resource_widget.elements_title')}
              </span>
              <span style={{ color: '#667788', fontSize: 9 }}>
                {canViewElements
                  ? t('resource_widget.elements_count', { count: ownedElements.length })
                  : t('archive.locked_level_short', { level: PERIODIC_TABLE_LEVEL })}
              </span>
            </div>
            {canViewElements ? (
              ownedElements.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 5 }}>
                  {ownedElements.map((element) => (
                    <div
                      key={element.symbol}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 6,
                        padding: '4px 6px',
                        border: '1px solid rgba(51,68,85,0.34)',
                        borderRadius: 3,
                        background: 'rgba(10,18,28,0.58)',
                        minWidth: 0,
                      }}
                    >
                      <span style={{ color: '#7bb8ff', fontWeight: 600 }}>{element.symbol}</span>
                      <span style={{ color: '#8899aa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {i18n.language === 'uk' ? element.nameUk : element.name}
                      </span>
                      <span style={{ color: '#aabbcc', marginLeft: 'auto' }}>{formatAmount(element.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#556677', fontSize: 10 }}>
                  {t('archive.no_elements_owned')}
                </div>
              )
            ) : (
              <div style={{ color: '#556677', fontSize: 10, lineHeight: 1.45 }}>
                {t('resource_widget.elements_locked', { level: PERIODIC_TABLE_LEVEL })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
