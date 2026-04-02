import React from 'react';
import { gridToSvg } from './surface-svg-utils';
import { IsoBlock } from './IsoBlock';

// ---------------------------------------------------------------------------
// DroneAnimState — animation state for a harvester drone
// ---------------------------------------------------------------------------

export interface DroneAnimState {
  col: number;
  row: number;
  state: 'idle' | 'flying' | 'harvesting';
}

// ---------------------------------------------------------------------------
// SvgDrone — isometric harvester drone rendered in SVG
// ---------------------------------------------------------------------------
// Blocky aesthetic using IsoBlock. Golden industrial color scheme.
// ---------------------------------------------------------------------------

export const SvgDrone = React.memo(function SvgDrone({
  state,
}: {
  state: DroneAnimState;
}) {
  const { x, y } = gridToSvg(state.col, state.row);
  // Levitate above tile surface (lower than bot — worker drone)
  const screenY = y - 10;

  return (
    <g
      style={{
        transform: `translate(${x}px, ${screenY}px)`,
        transition: state.state === 'flying' ? 'transform 0.5s linear' : 'none',
        fontFamily: 'monospace',
      }}
      className={state.state === 'idle' ? 'svg-drone-idle' : undefined}
    >
      {/* Ground shadow */}
      <ellipse
        cx={0} cy={10}
        rx={10} ry={4}
        fill="rgba(0,0,0,0.15)"
      />

      {/* Harvest laser beam — only during harvesting */}
      {state.state === 'harvesting' && (
        <line
          x1={0} y1={2}
          x2={0} y2={18}
          stroke="#ff4444"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity={0.8}
          className="svg-scan-pulse"
        />
      )}

      {/* Main Body (Golden Block) */}
      <IsoBlock
        x={0} y={0}
        w={8} h={4}
        depth={4}
        topColor="#ffcc44"
        leftColor="#cc9922"
        rightColor="#ddaa33"
      />

      {/* Top Node (Darker Accent) */}
      <IsoBlock
        x={0} y={-4}
        w={3} h={1.5}
        depth={1}
        topColor="#f59e0b"
        leftColor="#d97706"
        rightColor="#b45309"
      />

      {/* Blocky Rotors */}
      <g>
        <IsoBlock x={-7} y={1} w={1.5} h={0.75} depth={1} topColor="#cbd5e1" leftColor="#94a3b8" rightColor="#64748b" />
        <IsoBlock x={7} y={1} w={1.5} h={0.75} depth={1} topColor="#cbd5e1" leftColor="#94a3b8" rightColor="#64748b" />
        <IsoBlock x={-4} y={-2} w={1.5} h={0.75} depth={1} topColor="#cbd5e1" leftColor="#94a3b8" rightColor="#64748b" />
        <IsoBlock x={4} y={-2} w={1.5} h={0.75} depth={1} topColor="#cbd5e1" leftColor="#94a3b8" rightColor="#64748b" />
      </g>

      {/* Status indicator dot on top */}
      <circle
        cx={0} cy={-6}
        r={1.5}
        fill={state.state === 'harvesting' ? '#ff4444' : '#44ffaa'}
        opacity={0.9}
        className="svg-engine-glow"
      />
    </g>
  );
});
