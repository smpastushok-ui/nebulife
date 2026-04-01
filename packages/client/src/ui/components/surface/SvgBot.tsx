import React from 'react';
import { gridToSvg } from './surface-svg-utils';

// ---------------------------------------------------------------------------
// BotAnimState — animation state for the researcher bot
// ---------------------------------------------------------------------------

export interface BotAnimState {
  /** Grid column (integer) */
  col: number;
  /** Grid row (integer) */
  row: number;
  /**
   * idle:    hovering in place above current cell
   * flying:  CSS-transitioning to the next cell in path
   * working: stationary, performing research/harvest action
   */
  state: 'idle' | 'flying' | 'working';
}

// ---------------------------------------------------------------------------
// SvgBot — isometric researcher bot rendered in SVG
// ---------------------------------------------------------------------------
// Shape: diamond body (top-down isometric view), engine dots, antenna.
// Movement uses CSS transform transition for smooth 0.65s path flight.
// ---------------------------------------------------------------------------

export const SvgBot = React.memo(function SvgBot({
  state,
}: {
  state: BotAnimState;
}) {
  const { x, y } = gridToSvg(state.col, state.row);
  // Levitate slightly above the tile surface
  const screenY = y - 6;

  return (
    <g
      style={{
        transform: `translate(${x}px, ${screenY}px)`,
        transition: state.state === 'flying' ? 'transform 0.65s linear' : 'none',
        fontFamily: 'monospace',
      }}
      className={state.state === 'idle' ? 'svg-bot-flying' : undefined}
    >
      {/* Shadow ellipse on ground */}
      <ellipse
        cx={0} cy={14}
        rx={14} ry={6}
        fill="rgba(0,0,0,0.2)"
      />

      {/* Work indicator — pulsing ring when working */}
      {state.state === 'working' && (
        <circle
          cx={0} cy={0}
          r={16}
          fill="none"
          stroke="#44ff88"
          strokeWidth="1"
          strokeOpacity="0.5"
          className="svg-engine-glow"
        />
      )}

      {/* Body — isometric diamond (top face) */}
      <polygon
        points="0,-10 12,0 0,4 -12,0"
        fill="#446688"
        stroke="#5599bb"
        strokeWidth="0.8"
      />
      {/* Body — upper highlight face */}
      <polygon
        points="0,-10 12,0 0,-4"
        fill="#5599bb"
      />
      {/* Body — lower shade face */}
      <polygon
        points="0,4 12,0 0,-4"
        fill="#2d4a66"
      />

      {/* Engine thruster — left */}
      <ellipse
        cx={-6} cy={3}
        rx={2} ry={1}
        fill="#223344"
        stroke="#334455"
        strokeWidth="0.5"
      />
      <circle
        cx={-6} cy={3}
        r={1.5}
        fill="#ffaa44"
        className="svg-engine-glow"
      />

      {/* Engine thruster — right */}
      <ellipse
        cx={6} cy={3}
        rx={2} ry={1}
        fill="#223344"
        stroke="#334455"
        strokeWidth="0.5"
      />
      <circle
        cx={6} cy={3}
        r={1.5}
        fill="#ffaa44"
        className="svg-engine-glow"
      />

      {/* Antenna mast */}
      <line
        x1={0} y1={-10}
        x2={0} y2={-15}
        stroke="#88bbdd"
        strokeWidth="0.8"
      />
      {/* Antenna beacon */}
      <circle
        cx={0} cy={-15}
        r={1.2}
        fill="#44ffaa"
        className="svg-engine-glow"
      />

      {/* Sensor strip — horizontal line on body top */}
      <line
        x1={-5} y1={-7}
        x2={5}  y2={-3}
        stroke="#22ccee"
        strokeWidth="0.6"
        strokeOpacity="0.6"
        strokeDasharray="1.5 1.5"
      />
    </g>
  );
});
