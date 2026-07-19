import React from 'react';

// ---------------------------------------------------------------------------
// OrbitLoader — lightweight "establishing orbit" loading animation.
//
// Pure CSS (transform/opacity only) so it runs on the compositor thread and
// stays perfectly smooth even while the main thread is busy (WebGL init,
// shader compilation, texture decode). Replaces the heavier old scanner.
//
// Used by the boot intro (StarBirthIntro) and the planet exosphere loader so
// every loading state in the app shares one light, consistent animation.
// ---------------------------------------------------------------------------

interface OrbitLoaderProps {
  /** Primary line under the orbit (uppercased). */
  label?: string;
  /** Optional dimmer sub-line. */
  subLabel?: string;
  /** Diameter of the orbit graphic in px. Default 120. */
  size?: number;
}

const ORBIT_CSS = `
@keyframes nbOrbitSpin { to { transform: rotate(360deg); } }
@keyframes nbOrbitSpinRev { to { transform: rotate(-360deg); } }
@keyframes nbOrbitPulse { 0%,100% { transform: scale(1); opacity: 0.85; } 50% { transform: scale(1.5); opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  [data-nebulife-orbit-loader] * { animation: none !important; }
}
`;

export function OrbitLoader({ label, subLabel, size = 120 }: OrbitLoaderProps) {
  const dot = Math.max(5, Math.round(size * 0.058));
  const core = Math.max(10, Math.round(size * 0.117));
  return (
    <div data-nebulife-orbit-loader style={styles.wrap}>
      <style>{ORBIT_CSS}</style>
      <div style={{ position: 'relative', width: size, height: size }}>
        <div style={{ ...styles.ring, ...styles.ringOuter }} />
        <div style={{ ...styles.ring, ...styles.ringMid, inset: Math.round(size * 0.18) }} />
        <div style={styles.track}>
          <span
            style={{
              ...styles.dot,
              width: dot,
              height: dot,
              marginLeft: -dot / 2,
              top: -Math.round(dot / 2),
            }}
          />
        </div>
        <div
          style={{
            ...styles.core,
            width: core,
            height: core,
            marginTop: -core / 2,
            marginLeft: -core / 2,
          }}
        />
      </div>
      {label && <div style={styles.label}>{label}</div>}
      {subLabel && <div style={styles.subLabel}>{subLabel}</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    fontFamily: 'monospace',
    pointerEvents: 'none',
  },
  ring: { position: 'absolute', borderRadius: '50%', boxSizing: 'border-box' },
  ringOuter: {
    inset: 0,
    border: '1.5px solid rgba(123,184,255,0.18)',
    borderTopColor: 'rgba(123,184,255,0.9)',
    borderRightColor: 'rgba(123,184,255,0.45)',
    animation: 'nbOrbitSpin 2.4s linear infinite',
    // Promote each animated element to its own compositor layer so the spin
    // keeps running smoothly even while the main thread is blocked building
    // the WebGL scene (geometry + shader compile can stall it for seconds).
    willChange: 'transform',
  },
  ringMid: {
    border: '1.5px solid rgba(123,184,255,0.12)',
    borderBottomColor: 'rgba(170,210,255,0.8)',
    animation: 'nbOrbitSpinRev 1.7s linear infinite',
    willChange: 'transform',
  },
  track: { position: 'absolute', inset: 0, animation: 'nbOrbitSpin 1.7s linear infinite', willChange: 'transform' },
  dot: {
    position: 'absolute',
    left: '50%',
    borderRadius: '50%',
    background: '#cfe2ff',
    boxShadow: '0 0 10px 2px rgba(123,184,255,0.9)',
  },
  core: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    borderRadius: '50%',
    background: 'radial-gradient(circle, #eaf2fb 0%, #7bb8ff 55%, rgba(123,184,255,0) 100%)',
    animation: 'nbOrbitPulse 1.8s ease-in-out infinite',
    willChange: 'transform, opacity',
  },
  label: { color: '#8aa0b4', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' },
  subLabel: { color: '#667788', fontSize: 8, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: -8 },
};
