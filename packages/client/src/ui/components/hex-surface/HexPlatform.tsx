import React from 'react';
import { hexPoints, HEX_RADIUS } from './hex-utils';

interface HexPlatformProps {
  x: number;
  y: number;
  fillColor?: string;    // platform top color
  strokeColor?: string;  // border color
  strokeOpacity?: number;
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

export const HexPlatform = React.memo(function HexPlatform({
  x, y,
  fillColor = 'rgba(30,40,60,0.8)',
  strokeColor = '#334455',
  strokeOpacity = 0.6,
  className,
  onClick,
  children,
}: HexPlatformProps) {
  const r = HEX_RADIUS;
  const pts = hexPoints(x, y, r);
  const shadowPts = hexPoints(x + 2, y + 6, r * 0.95);

  return (
    <g className={className} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {/* Shadow */}
      <polygon points={shadowPts} fill="rgba(0,0,0,0.25)" />
      {/* Platform */}
      <polygon
        points={pts}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeOpacity={strokeOpacity}
        strokeLinejoin="round"
      />
      {children}
    </g>
  );
});
