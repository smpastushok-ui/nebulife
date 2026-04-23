import React, { useEffect, useState } from 'react';

/**
 * LoadingDots — animated trailing dots that cycle 1 → 2 → 3 → 1.
 *
 * Uses a self-updating ref pattern (like LiveCountdown) so it never forces
 * the parent to re-render. Intended for "Завантаження..." / "Loading..."
 * indicators where we want visible activity without an App-wide render tick.
 *
 * The base label is passed WITHOUT trailing dots; the component adds them.
 */
export function LoadingDots({
  label,
  intervalMs = 420,
  style,
}: {
  label: string;
  intervalMs?: number;
  style?: React.CSSProperties;
}) {
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const id = setInterval(() => {
      setDots((d) => (d % 3) + 1);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  // Strip any trailing dots the caller may have included in the label.
  const base = label.replace(/\.+$/, '');

  return (
    <span style={style}>
      {base}
      {'.'.repeat(dots)}
    </span>
  );
}
