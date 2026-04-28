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
      {resourceType === 'crystal' && <CrystalIcon x={x} y={y} color={color} />}
      {resourceType === 'bio_fossil' && <BioFossilIcon x={x} y={y} color={color} />}

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

// Crystal: geometric hexagonal prism — abiotic mineral crystals on cold/dead worlds
// Color palette: bluish-violet shimmer (#7bb8ff, #aa7bff per spec)
function CrystalIcon({ x, y, color }: { x: number; y: number; color: string }) {
  // Main crystal — tall narrow diamond
  const cx = x;
  const tip = y - 32;
  const mid = y - 14;
  const base = y;
  const hw = 7; // half-width at widest point
  // Secondary smaller crystal offset to the right
  const sx = x + 10;
  const sTip = y - 20;
  const sMid = y - 8;
  const sBase = y;
  const shw = 4;
  return (
    <g>
      {/* Secondary crystal */}
      <polygon
        points={`${sx},${sTip} ${sx + shw},${sMid} ${sx},${sBase} ${sx - shw},${sMid}`}
        fill={color}
        opacity="0.45"
        stroke={color}
        strokeWidth="0.5"
      />
      {/* Main crystal body */}
      <polygon
        points={`${cx},${tip} ${cx + hw},${mid} ${cx},${base} ${cx - hw},${mid}`}
        fill={color}
        opacity="0.55"
        stroke={color}
        strokeWidth="1"
      />
      {/* Facet highlight — left face slightly brighter */}
      <polygon
        points={`${cx},${tip} ${cx - hw},${mid} ${cx},${base}`}
        fill={color}
        opacity="0.25"
      />
      {/* Inner light glint at the peak */}
      <circle cx={cx} cy={tip + 4} r={2} fill="#ffffff" opacity="0.5" />
    </g>
  );
}

// Bio-fossil: stylised ammonite spiral — preserved organics on dead worlds
// Color palette: beigy-amber (#ccaa88, #aa8855 per spec)
function BioFossilIcon({ x, y, color }: { x: number; y: number; color: string }) {
  // Outer shell arc (large arc, ~270 deg)
  const r1 = 14;
  const cx = x;
  const cy = y - 14;
  // Spiral drawn as two concentric partial arcs + a small dot for the centre
  const arc1Start = { sx: cx + r1, sy: cy };
  const arc1End   = { ex: cx,      ey: cy - r1 };
  const r2 = 8;
  const arc2Start = { sx: cx + r2, sy: cy };
  const arc2End   = { ex: cx,      ey: cy - r2 };
  return (
    <g>
      {/* Ground shadow */}
      <ellipse cx={cx} cy={y - 2} rx={14} ry={4} fill={color} opacity="0.15" />
      {/* Outer shell arc: 3/4 circle clockwise */}
      <path
        d={`M ${arc1Start.sx} ${arc1Start.sy}
            A ${r1} ${r1} 0 1 0 ${arc1End.ex} ${arc1End.ey}`}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.75"
      />
      {/* Inner whorl */}
      <path
        d={`M ${arc2Start.sx} ${arc2Start.sy}
            A ${r2} ${r2} 0 1 0 ${arc2End.ex} ${arc2End.ey}`}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* Suture lines (radial ribs) — 3 short spokes from centre outward */}
      <line x1={cx} y1={cy} x2={cx + r1} y2={cy} stroke={color} strokeWidth="1" opacity="0.35" />
      <line x1={cx} y1={cy} x2={cx - r1 * 0.7} y2={cy + r1 * 0.7} stroke={color} strokeWidth="1" opacity="0.35" />
      <line x1={cx} y1={cy} x2={cx - r1 * 0.7} y2={cy - r1 * 0.7} stroke={color} strokeWidth="1" opacity="0.35" />
      {/* Centre dot */}
      <circle cx={cx} cy={cy} r={2.5} fill={color} opacity="0.7" />
    </g>
  );
}
