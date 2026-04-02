import React from 'react';

interface IsoBlockProps {
  x: number;       // screen X center of diamond
  y: number;       // screen Y center of diamond
  w?: number;      // half-width of diamond (default 22)
  h?: number;      // half-height of diamond (default 11)
  depth?: number;  // block height in px (0 = flat)
  topColor: string;
  leftColor: string;
  rightColor: string;
  opacity?: number;
  className?: string;
  style?: React.CSSProperties;
  glow?: string;        // optional glow stroke (for ore)
  windowColor?: string; // optional window dashes
}

export const IsoBlock = React.memo(function IsoBlock({
  x,
  y,
  w = 22,
  h = 11,
  depth = 0,
  topColor,
  leftColor,
  rightColor,
  opacity = 1,
  className,
  style,
  glow,
  windowColor,
}: IsoBlockProps) {
  // Top face: diamond at y - depth
  const topY = y - depth;
  const topPoints = `${x},${topY - h} ${x + w},${topY} ${x},${topY + h} ${x - w},${topY}`;

  // Left face: bottom-left of top down to base
  // top-left = (x - w, topY), top-right = (x, topY + h)
  // base: same X coords but shifted down by depth
  const leftPoints = `${x - w},${topY} ${x},${topY + h} ${x},${y + h} ${x - w},${y}`;

  // Right face: bottom-right of top down to base
  // top-left = (x, topY + h), top-right = (x + w, topY)
  const rightPoints = `${x},${topY + h} ${x + w},${topY} ${x + w},${y} ${x},${y + h}`;

  // Glow overlay on left face
  const glowPath = glow
    ? `M${x - w},${topY} L${x},${topY + h} L${x},${y + h} L${x - w},${y}`
    : null;

  // Window dashes: dynamically calculate rows of windows for BOTH faces
  const windowRows: number[] = [];
  if (windowColor && depth > 12) {
    for (let dy = 10; dy <= depth - 10; dy += 12) {
      windowRows.push(dy);
    }
  }

  return (
    <g opacity={opacity} className={className} style={style} strokeLinejoin="round">
      {/* Top face */}
      <polygon
        points={topPoints}
        fill={topColor}
        stroke="#ffffff"
        strokeWidth="0.6"
        strokeOpacity="0.7"
      />
      {/* Left face */}
      {depth > 0 && (
        <polygon
          points={leftPoints}
          fill={leftColor}
          stroke="#ffffff"
          strokeWidth="0.6"
          strokeOpacity="0.7"
        />
      )}
      {/* Right face */}
      {depth > 0 && (
        <polygon
          points={rightPoints}
          fill={rightColor}
          stroke="#ffffff"
          strokeWidth="0.6"
          strokeOpacity="0.7"
        />
      )}
      {/* Glow overlay on left face */}
      {glowPath && (
        <path
          d={glowPath}
          fill="none"
          stroke={glow}
          strokeWidth="1.2"
          strokeOpacity="0.6"
        />
      )}
      {/* Window dashes spanning both visible faces */}
      {windowRows.length > 0 && (
        <g stroke={windowColor} strokeWidth="1.5" strokeDasharray="2 3" fill="none">
          {windowRows.map((dy, i) => (
            <React.Fragment key={i}>
              <line x1={x - w + 3} y1={topY + dy + 1.5} x2={x - 3} y2={topY + h + dy - 1.5} />
              <line x1={x + 3} y1={topY + h + dy - 1.5} x2={x + w - 3} y2={topY + dy + 1.5} />
            </React.Fragment>
          ))}
        </g>
      )}
    </g>
  );
});
