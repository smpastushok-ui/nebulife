import React from 'react';
import { gridToSvg } from './surface-svg-utils';
import { IsoBlock } from './IsoBlock';

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
// Blocky aesthetic using IsoBlock. Looks like a scout ship with a cockpit.
// ---------------------------------------------------------------------------

export const SvgBot = React.memo(function SvgBot({
  state,
}: {
  state: BotAnimState;
}) {
  const { x, y } = gridToSvg(state.col, state.row);
  // Levitate above the tile surface
  const screenY = y - 14;

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

      {/* Scanner beam — visible only when flying */}
      {state.state === 'flying' && (
        <path
          d="M0,0 L-10,16 L10,16 Z"
          fill="rgba(34,211,238,0.12)"
          className="svg-scan-pulse"
        />
      )}

      {/* Work indicator — pulsing ring on the ground when working */}
      {state.state === 'working' && (
        <ellipse
          cx={0} cy={14}
          rx={16} ry={8}
          fill="none"
          stroke="#44ff88"
          strokeWidth="1.5"
          strokeOpacity="0.6"
          className="svg-engine-glow"
        />
      )}

      {/* Main Body (Block) */}
      <IsoBlock
        x={0} y={0}
        w={10} h={5}
        depth={4}
        topColor="#f1f5f9"
        leftColor="#cbd5e1"
        rightColor="#94a3b8"
      />

      {/* Cockpit / Cabin (Smaller block on top) */}
      <IsoBlock
        x={1.5} y={-4}
        w={5} h={2.5}
        depth={3}
        topColor="#1e293b"
        leftColor="#0f172a"
        rightColor="#020617"
        windowColor="#22d3ee"
      />

      {/* Engine glow dots */}
      <circle cx={-6} cy={0} r={1.5} fill="#38bdf8" className="svg-engine-glow" />
      <circle cx={6} cy={0} r={1.5} fill="#38bdf8" className="svg-engine-glow" />
      <circle cx={0} cy={2} r={1.5} fill="#38bdf8" className="svg-engine-glow" />
    </g>
  );
});
