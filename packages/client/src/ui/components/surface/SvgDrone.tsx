import React from 'react';
import { gridToSvg } from './surface-svg-utils';

// ---------------------------------------------------------------------------
// DroneAnimState — animation state for a harvester drone
// ---------------------------------------------------------------------------

export interface DroneAnimState {
  /** Grid column (integer) */
  col: number;
  /** Grid row (integer) */
  row: number;
  /**
   * idle:       hovering in place (slow bob animation)
   * flying:     CSS-transitioning toward target cell
   * harvesting: stationary, firing laser at resource below
   */
  state: 'idle' | 'flying' | 'harvesting';
}

// ---------------------------------------------------------------------------
// SvgDrone — isometric harvester drone rendered in SVG
// ---------------------------------------------------------------------------
// Smaller than the researcher bot. Golden color scheme.
// Laser beam fires downward during harvesting state.
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
          x1={0} y1={4}
          x2={0} y2={18}
          stroke="#ff4444"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity={0.7}
          className="svg-scan-pulse"
        />
      )}

      {/* Flight scanner cone — only when flying */}
      {state.state === 'flying' && (
        <path
          d="M0,3 L-6,12 L6,12 Z"
          fill="rgba(255,204,68,0.1)"
          className="svg-scan-pulse"
        />
      )}

      {/* Body — isometric diamond (top face) */}
      <polygon
        points="0,-6 8,0 0,3 -8,0"
        fill="#ffcc44"
        stroke="#ffdd88"
        strokeWidth="0.6"
      />
      {/* Body — upper highlight face */}
      <polygon
        points="0,-6 8,0 0,-2"
        fill="#ffdd66"
      />
      {/* Body — lower shade face */}
      <polygon
        points="0,3 8,0 0,-2"
        fill="#bb9922"
      />

      {/* Rotor mount — left */}
      <line
        x1={-3} y1={-1}
        x2={-8} y2={-4}
        stroke="#aa9966"
        strokeWidth="0.8"
        strokeOpacity="0.7"
      />
      {/* Rotor — left */}
      <circle
        cx={-8} cy={-4}
        r={1.2}
        fill="#aabbcc"
        className="svg-engine-glow"
      />

      {/* Rotor mount — right */}
      <line
        x1={3} y1={-1}
        x2={8} y2={-4}
        stroke="#aa9966"
        strokeWidth="0.8"
        strokeOpacity="0.7"
      />
      {/* Rotor — right */}
      <circle
        cx={8} cy={-4}
        r={1.2}
        fill="#aabbcc"
        className="svg-engine-glow"
      />

      {/* Rotor mount — front-left */}
      <line
        x1={-2} y1={2}
        x2={-6} y2={6}
        stroke="#aa9966"
        strokeWidth="0.8"
        strokeOpacity="0.7"
      />
      <circle
        cx={-6} cy={6}
        r={1}
        fill="#aabbcc"
        className="svg-engine-glow"
      />

      {/* Rotor mount — front-right */}
      <line
        x1={2} y1={2}
        x2={6} y2={6}
        stroke="#aa9966"
        strokeWidth="0.8"
        strokeOpacity="0.7"
      />
      <circle
        cx={6} cy={6}
        r={1}
        fill="#aabbcc"
        className="svg-engine-glow"
      />

      {/* Central cargo pod */}
      <ellipse
        cx={0} cy={1}
        rx={3} ry={1.5}
        fill="#cc9900"
        stroke="#ffcc44"
        strokeWidth="0.5"
        strokeOpacity="0.7"
      />

      {/* Status indicator dot */}
      <circle
        cx={0} cy={-5}
        r={1}
        fill={state.state === 'harvesting' ? '#ff4444' : '#44ffaa'}
        opacity={0.9}
        className="svg-engine-glow"
      />
    </g>
  );
});
