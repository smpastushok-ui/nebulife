import React from 'react';

// TerminalAnimatedIcon — inline icon for the CommandBar Terminal button:
// 4 corner cubes + centered "ТЕРМIНАЛ" text. When parent sets `converging`
// true the text fades and the 4 cubes slide toward the centre. Explicit
// 78×22 host box so no stretching/deformation — earlier SVG viewBox with
// preserveAspectRatio="none" produced squished squares on real buttons.

interface Props {
  label: string;
  converging: boolean;
}

export function TerminalAnimatedIcon({ label, converging }: Props) {
  const cubeBase: React.CSSProperties = {
    position: 'absolute',
    width: 6, height: 6,
    border: '1px solid currentColor',
    boxSizing: 'border-box',
    pointerEvents: 'none',
    transition: 'transform 0.55s cubic-bezier(0.55, 0, 0.35, 1)',
  };
  // dx/dy = distance each cube must travel to reach centre
  const dx = 30;
  const dy = 5;
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 78,
        height: 22,
        color: 'currentColor',
        pointerEvents: 'none',
      }}
    >
      <span style={{ ...cubeBase, top: 0,    left: 0,    transform: converging ? `translate(${dx}px,${dy}px) scale(0.6)` : 'none' }} />
      <span style={{ ...cubeBase, top: 0,    right: 0,   transform: converging ? `translate(${-dx}px,${dy}px) scale(0.6)` : 'none' }} />
      <span style={{ ...cubeBase, bottom: 0, left: 0,    transform: converging ? `translate(${dx}px,${-dy}px) scale(0.6)` : 'none' }} />
      <span style={{ ...cubeBase, bottom: 0, right: 0,   transform: converging ? `translate(${-dx}px,${-dy}px) scale(0.6)` : 'none' }} />
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 9.5,
          letterSpacing: 0.6,
          color: 'currentColor',
          opacity: converging ? 0 : 1,
          transition: 'opacity 0.18s ease-out',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </span>
  );
}
