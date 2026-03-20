/**
 * ResourceWidget — fixed top-right HUD showing current colony resource counts.
 * Shown only on the Surface view (rendered from SurfacePanel).
 *
 * Values pulse (scale pop) when they change.
 * Each icon element has a forwarded ref so the parent can compute fly-to targets.
 */

import React, { useEffect, useRef, useState } from 'react';

interface ResourceWidgetProps {
  minerals:  number;
  volatiles: number;
  isotopes:  number;
  /** Optional: callback to expose icon DOM rects for fly animations. */
  onRefsReady?: (rects: {
    minerals:  DOMRect;
    volatiles: DOMRect;
    isotopes:  DOMRect;
  }) => void;
}

const ICON_STYLE: React.CSSProperties = {
  display:        'inline-block',
  width:          8,
  height:         8,
  borderRadius:   1,
  marginRight:    5,
  verticalAlign:  'middle',
};

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
  onRefsReady,
}) => {
  const minRef = useRef<HTMLDivElement>(null);
  const volRef = useRef<HTMLDivElement>(null);
  const isoRef = useRef<HTMLDivElement>(null);

  const [popMin, setPopMin] = useState(false);
  const [popVol, setPopVol] = useState(false);
  const [popIso, setPopIso] = useState(false);

  const prevMin = useRef(minerals);
  const prevVol = useRef(volatiles);
  const prevIso = useRef(isotopes);

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

  // Expose icon rects to parent after mount
  useEffect(() => {
    if (!onRefsReady) return;
    const frame = requestAnimationFrame(() => {
      const mr = minRef.current?.getBoundingClientRect();
      const vr = volRef.current?.getBoundingClientRect();
      const ir = isoRef.current?.getBoundingClientRect();
      if (mr && vr && ir) onRefsReady({ minerals: mr, volatiles: vr, isotopes: ir });
    });
    return () => cancelAnimationFrame(frame);
  }, [onRefsReady]);

  const containerStyle: React.CSSProperties = {
    position:        'fixed',
    top:             14,
    right:           14,
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
        <span style={{ ...ICON_STYLE, background: '#998877' }} />
        <span style={{ color: '#bbaa99', minWidth: 22, textAlign: 'right' }}>{minerals}</span>
      </div>

      <div style={dividerStyle} />

      {/* Volatiles */}
      <div
        ref={volRef}
        style={{ ...ITEM_BASE, transform: popVol ? 'scale(1.22)' : 'scale(1)' }}
      >
        <span style={{ ...ICON_STYLE, background: '#44aaff', borderRadius: '50%' }} />
        <span style={{ color: '#99ccee', minWidth: 22, textAlign: 'right' }}>{volatiles}</span>
      </div>

      <div style={dividerStyle} />

      {/* Isotopes */}
      <div
        ref={isoRef}
        style={{ ...ITEM_BASE, transform: popIso ? 'scale(1.22)' : 'scale(1)' }}
      >
        <span style={{ ...ICON_STYLE, background: '#ffdd44', transform: 'rotate(45deg)', display: 'inline-block' }} />
        <span style={{ color: '#eedd88', minWidth: 22, textAlign: 'right' }}>{isotopes}</span>
      </div>
    </div>
  );
};
