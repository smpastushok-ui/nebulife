import React from 'react';
import type { ResourceType, Rarity } from './hex-utils';
import { RESOURCE_COLORS, RARITY_COLORS } from './hex-utils';

interface HexResourceProps {
  x: number;
  y: number;
  resourceType: ResourceType;
  rarity: Rarity;
  ready: boolean;         // true if harvestable
  className?: string;
}

export const HexResource = React.memo(function HexResource({
  x, y, resourceType, rarity, ready, className,
}: HexResourceProps) {
  const color = RESOURCE_COLORS[resourceType];
  const rarityColor = RARITY_COLORS[rarity];

  return (
    <g className={className} style={{ color }}>
      {/* Resource visual based on type */}
      {resourceType === 'tree' && <TreeIcon x={x} y={y} color={color} />}
      {resourceType === 'ore' && <OreIcon x={x} y={y} color={color} />}
      {resourceType === 'vent' && <VentIcon x={x} y={y} color={color} />}
      {resourceType === 'water' && <WaterIcon x={x} y={y} color={color} />}

      {/* Rarity indicator dot */}
      <circle cx={x + 18} cy={y - 18} r={4} fill={rarityColor} stroke="#020510" strokeWidth="1" />

      {/* Harvest glow when ready */}
      {ready && (
        <circle cx={x} cy={y} r={30} fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.3" className="hex-resource-glow" />
      )}
    </g>
  );
});

// Tree: stacked triangles
function TreeIcon({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <rect x={x - 2} y={y - 5} width={4} height={12} fill="#78350f" rx={1} />
      <polygon points={`${x},${y - 28} ${x + 14},${y - 8} ${x - 14},${y - 8}`} fill={color} />
      <polygon points={`${x},${y - 35} ${x + 10},${y - 18} ${x - 10},${y - 18}`} fill={color} opacity="0.85" />
    </g>
  );
}

// Ore: crystal chunks
function OreIcon({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <polygon points={`${x - 8},${y} ${x},${y - 16} ${x + 8},${y}`} fill="#475569" stroke="#10b981" strokeWidth="1" />
      <polygon points={`${x + 4},${y - 2} ${x + 12},${y - 14} ${x + 16},${y - 2}`} fill="#334155" stroke="#10b981" strokeWidth="0.8" />
      <circle cx={x + 2} cy={y - 8} r={2} fill="#10b981" opacity="0.7" />
    </g>
  );
}

// Vent: geyser wisps
function VentIcon({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={10} ry={5} fill="none" stroke={color} strokeWidth="1.5" opacity="0.6" />
      <circle cx={x} cy={y} r={4} fill={color} opacity="0.4" />
      <line x1={x} y1={y - 5} x2={x - 4} y2={y - 22} stroke={color} strokeWidth="2" opacity="0.5" strokeLinecap="round" className="hex-respawn-pulse" />
      <line x1={x + 3} y1={y - 6} x2={x + 7} y2={y - 18} stroke={color} strokeWidth="1.5" opacity="0.3" strokeLinecap="round" className="hex-respawn-pulse" />
    </g>
  );
}

// Water: waves
function WaterIcon({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <ellipse cx={x} cy={y - 4} rx={16} ry={8} fill={color} opacity="0.3" />
      <path d={`M${x - 12},${y - 6} Q${x - 6},${y - 12} ${x},${y - 6} Q${x + 6},${y} ${x + 12},${y - 6}`} fill="none" stroke={color} strokeWidth="2" opacity="0.6" />
      <path d={`M${x - 8},${y - 2} Q${x - 4},${y - 8} ${x},${y - 2} Q${x + 4},${y + 4} ${x + 8},${y - 2}`} fill="none" stroke={color} strokeWidth="1.5" opacity="0.4" />
    </g>
  );
}
