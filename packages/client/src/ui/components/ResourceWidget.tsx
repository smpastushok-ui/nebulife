/**
 * ResourceWidget — fixed top-right HUD showing current colony resource counts.
 * Shown only on the Surface view (rendered from SurfacePanel).
 *
 * Values pulse (scale pop) when they change.
 * Each icon element has a forwarded ref so the parent can compute fly-to targets.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ResourceIcon, RESOURCE_COLORS } from './ResourceIcon.js';

interface ResourceWidgetProps {
  minerals:  number;
  volatiles: number;
  isotopes:  number;
  water:     number;
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

export const ResourceWidget: React.FC<ResourceWidgetProps> = ({
  minerals,
  volatiles,
  isotopes,
  water,
  onRefsReady,
}) => {
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
    flexDirection:   'row',
    gap:             0,
    zIndex:          200,
    userSelect:      'none',
    pointerEvents:   'none',
    overflow:        'hidden',
  };

  const dividerStyle: React.CSSProperties = {
    width:           1,
    background:      '#2a3a4a',
    alignSelf:       'stretch',
  };

  return (
    <div style={containerStyle}>
      {/* Minerals */}
      <div
        ref={minRef}
        style={{ ...ITEM_BASE, transform: popMin ? 'scale(1.22)' : 'scale(1)' }}
      >
        <ResourceIcon type="minerals" size={11} />
        <span style={{ color: RESOURCE_COLORS.minerals, minWidth: 22, textAlign: 'right' }}>{minerals}</span>
      </div>

      <div style={dividerStyle} />

      {/* Volatiles */}
      <div
        ref={volRef}
        style={{ ...ITEM_BASE, transform: popVol ? 'scale(1.22)' : 'scale(1)' }}
      >
        <ResourceIcon type="volatiles" size={11} />
        <span style={{ color: RESOURCE_COLORS.volatiles, minWidth: 22, textAlign: 'right' }}>{volatiles}</span>
      </div>

      <div style={dividerStyle} />

      {/* Isotopes */}
      <div
        ref={isoRef}
        style={{ ...ITEM_BASE, transform: popIso ? 'scale(1.22)' : 'scale(1)' }}
      >
        <ResourceIcon type="isotopes" size={11} />
        <span style={{ color: RESOURCE_COLORS.isotopes, minWidth: 22, textAlign: 'right' }}>{isotopes}</span>
      </div>

      <div style={dividerStyle} />

      {/* Water */}
      <div
        ref={watRef}
        style={{ ...ITEM_BASE, transform: popWat ? 'scale(1.22)' : 'scale(1)' }}
      >
        <ResourceIcon type="water" size={11} />
        <span style={{ color: RESOURCE_COLORS.water, minWidth: 22, textAlign: 'right' }}>{water}</span>
      </div>
    </div>
  );
};
