import React from 'react';
import { HEX_RADIUS, hexPoints } from './hex-utils';

interface HexLockedProps {
  x: number;
  y: number;
  cost: { minerals: number; volatiles: number; isotopes: number };
  canAfford: boolean;
  onClick: () => void;
}

export const HexLocked = React.memo(function HexLocked({
  x, y, cost, canAfford, onClick,
}: HexLockedProps) {
  const pts = hexPoints(x, y, HEX_RADIUS);

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Hex outline only */}
      <polygon
        points={pts}
        fill="rgba(10,15,25,0.4)"
        stroke={canAfford ? '#446688' : '#223344'}
        strokeWidth="1.5"
        strokeDasharray="6 4"
        className="hex-locked-pulse"
      />

      {/* Lock icon */}
      <g transform={`translate(${x}, ${y - 8})`}>
        <rect x={-6} y={-2} width={12} height={10} rx={2} fill="#334455" stroke="#556677" strokeWidth="1" />
        <path d="M-4,-2 L-4,-6 A4,4 0 0,1 4,-6 L4,-2" fill="none" stroke="#556677" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx={0} cy={4} r={1.5} fill="#667788" />
      </g>

      {/* Cost label */}
      <text
        x={x} y={y + 18}
        textAnchor="middle"
        fill={canAfford ? '#aabbcc' : '#556677'}
        fontFamily="monospace"
        fontSize="8"
        opacity="0.8"
      >
        {cost.minerals > 0 ? `${cost.minerals}M ` : ''}
        {cost.volatiles > 0 ? `${cost.volatiles}V ` : ''}
        {cost.isotopes > 0 ? `${cost.isotopes}I` : ''}
      </text>
    </g>
  );
});
