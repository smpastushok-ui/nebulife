import React from 'react';

// TerminalAnimatedIcon — icon content for the CommandBar Terminal button.
// Layout: 4 corner squares around a centered "ТЕРМIНАЛ" label. When the
// parent sets `converging` true the 4 squares slide toward the centre and
// the label fades — played when the user taps the button, right before
// the archive overlay mounts. Purely visual; no internal button tag.

interface Props {
  label: string;
  converging: boolean;
}

export function TerminalAnimatedIcon({ label, converging }: Props) {
  const cubeSize = 5;
  const corners = [
    { x: 1,                  y: 0,                 dx: 10.5,  dy: 5.5 },
    { x: 30 - cubeSize - 1,  y: 0,                 dx: -10.5, dy: 5.5 },
    { x: 1,                  y: 16 - cubeSize,     dx: 10.5,  dy: -5.5 },
    { x: 30 - cubeSize - 1,  y: 16 - cubeSize,     dx: -10.5, dy: -5.5 },
  ];
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-block',
        width: 60,
        height: 18,
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          fontSize: 9,
          letterSpacing: 1.5,
          color: 'currentColor',
          opacity: converging ? 0 : 1,
          transition: 'opacity 0.18s ease-out',
          pointerEvents: 'none',
        }}
      >
        {label}
      </span>
      <svg
        width="100%" height="100%" viewBox="0 0 30 16"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {corners.map((c, i) => (
          <rect
            key={i}
            x={c.x} y={c.y}
            width={cubeSize} height={cubeSize}
            fill="none" stroke="currentColor" strokeWidth="1"
            style={{
              transform: converging
                ? `translate(${c.dx}px, ${c.dy}px) scale(0.5)`
                : 'translate(0,0) scale(1)',
              transformOrigin: `${c.x + cubeSize / 2}px ${c.y + cubeSize / 2}px`,
              transition: 'transform 0.55s cubic-bezier(0.55, 0, 0.35, 1)',
            }}
          />
        ))}
      </svg>
    </span>
  );
}
