import React, { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// TelescopeOverlay — cinematic full-screen overlay for AI photo generation
// Phases: init (viewfinder) -> capture (waiting loop) -> reveal (photo + actions)
// ---------------------------------------------------------------------------

type TelescopePhase = 'init' | 'capture' | 'reveal';

interface TelescopeOverlayProps {
  targetName: string;
  targetType: 'system' | 'planet';
  phase: TelescopePhase;
  photoUrl: string | null;
  onSaveToCollection: () => void;
  onShare: () => void;
  onClose: () => void;
}

const STATUS_MESSAGES = [
  'КАЛІБРУВАННЯ ОПТИКИ...',
  'ЗБІР ФОТОНІВ...',
  'СТАБІЛІЗАЦІЯ МАТРИЦІ...',
  'КВАНТОВА ОБРОБКА ДАНИХ...',
  'АНАЛІЗ СПЕКТРАЛЬНИХ ЛІНІЙ...',
];

// Noise grain SVG for reveal phase
const NOISE_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;

export function TelescopeOverlay({
  targetName,
  targetType,
  phase,
  photoUrl,
  onSaveToCollection,
  onShare,
  onClose,
}: TelescopeOverlayProps) {
  // -- Animation state --
  const [scanY, setScanY] = useState(0);
  const [exposureTime, setExposureTime] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const [grainOpacity, setGrainOpacity] = useState(0.4);
  const [showActions, setShowActions] = useState(false);
  const [flyAway, setFlyAway] = useState(false);
  const [initFade, setInitFade] = useState(false);

  const rafRef = useRef(0);
  const startTimeRef = useRef(performance.now());
  const prevPhaseRef = useRef<TelescopePhase>(phase);
  const photoRef = useRef<HTMLImageElement>(null);

  // Random telemetry values (stable per session)
  const telemetryRef = useRef({
    raH: Math.floor(Math.random() * 24),
    raM: Math.floor(Math.random() * 60),
    decDeg: Math.floor(Math.random() * 90) * (Math.random() > 0.5 ? 1 : -1),
    decMin: Math.floor(Math.random() * 60),
  });

  // Init fade-in
  useEffect(() => {
    if (phase === 'init') {
      requestAnimationFrame(() => setInitFade(true));
    }
  }, []);

  // Capture phase animation loop
  useEffect(() => {
    if (phase !== 'capture') return;
    startTimeRef.current = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTimeRef.current;
      // Scan line: 3s per sweep
      setScanY(((elapsed % 3000) / 3000) * 100);
      // Exposure timer
      setExposureTime(elapsed / 1000);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  // Status message rotation
  useEffect(() => {
    if (phase !== 'capture') return;
    const interval = setInterval(() => {
      setStatusIdx(prev => (prev + 1) % STATUS_MESSAGES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [phase]);

  // Reveal phase: flash + grain fade
  useEffect(() => {
    if (phase === 'reveal' && prevPhaseRef.current !== 'reveal') {
      // Flash
      setShowFlash(true);
      setGrainOpacity(0.4);
      setShowActions(false);

      // Flash fades after 300ms
      const flashTimer = setTimeout(() => setShowFlash(false), 300);
      // Grain fades over 2s
      const grainStart = performance.now();
      const fadeGrain = () => {
        const elapsed = performance.now() - grainStart;
        const t = Math.min(elapsed / 2000, 1);
        setGrainOpacity(0.4 * (1 - t));
        if (t < 1) requestAnimationFrame(fadeGrain);
      };
      setTimeout(() => requestAnimationFrame(fadeGrain), 400);
      // Show action buttons after 0.8s
      const actionsTimer = setTimeout(() => setShowActions(true), 800);

      return () => {
        clearTimeout(flashTimer);
        clearTimeout(actionsTimer);
      };
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  // Format exposure time
  const formatExposure = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = t % 60;
    return `${String(mins).padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`;
  };

  // Telemetry strings (slowly drifting)
  const tel = telemetryRef.current;
  const raSec = ((exposureTime * 0.37) % 60).toFixed(1);
  const decSec = ((exposureTime * 0.23) % 60).toFixed(0);

  // Handle save with fly animation
  const handleSave = useCallback(() => {
    setFlyAway(true);
    setTimeout(() => {
      onSaveToCollection();
    }, 700);
  }, [onSaveToCollection]);

  // Handle close on backdrop click (only in reveal)
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (phase === 'reveal' && e.target === e.currentTarget) {
      onClose();
    }
  }, [phase, onClose]);

  const targetLabel = targetType === 'system' ? 'Зоряна система' : 'Планета';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9700,
        background: 'rgba(2, 5, 16, 0.92)',
        fontFamily: 'monospace',
        overflow: 'hidden',
        opacity: initFade ? 1 : 0,
        transform: initFade ? 'scale(1)' : 'scale(1.03)',
        transition: 'opacity 0.4s, transform 0.4s',
      }}
      onClick={handleBackdropClick}
    >
      {/* ── PHASE 1 & 2: Viewfinder ── */}
      {(phase === 'init' || phase === 'capture') && (
        <>
          {/* Corner brackets */}
          {[
            { top: '12%', left: '10%', borderTop: '2px solid #4488aa', borderLeft: '2px solid #4488aa' },
            { top: '12%', right: '10%', borderTop: '2px solid #4488aa', borderRight: '2px solid #4488aa' },
            { bottom: '12%', left: '10%', borderBottom: '2px solid #4488aa', borderLeft: '2px solid #4488aa' },
            { bottom: '12%', right: '10%', borderBottom: '2px solid #4488aa', borderRight: '2px solid #4488aa' },
          ].map((s, i) => (
            <div key={i} style={{
              position: 'absolute', width: 40, height: 40, ...s, opacity: 0.7,
            }} />
          ))}

          {/* Corner coordinate labels */}
          <div style={{
            position: 'absolute', top: 'calc(12% + 44px)', left: '10%',
            fontSize: 8, color: '#445566', letterSpacing: 1,
          }}>
            X: 0.{Math.floor(exposureTime * 17) % 1000}
          </div>
          <div style={{
            position: 'absolute', top: 'calc(12% + 44px)', right: '10%',
            fontSize: 8, color: '#445566', letterSpacing: 1, textAlign: 'right',
          }}>
            Y: 0.{Math.floor(exposureTime * 31) % 1000}
          </div>

          {/* Crosshair */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 80, height: 80,
          }}>
            {/* Horizontal line */}
            <div style={{
              position: 'absolute', top: '50%', left: 0, right: 0, height: 1,
              background: '#44ff88', opacity: 0.5,
            }} />
            {/* Vertical line */}
            <div style={{
              position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1,
              background: '#44ff88', opacity: 0.5,
            }} />
            {/* Center dot */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 6, height: 6, borderRadius: '50%',
              border: '1px solid #44ff88', opacity: 0.6,
            }} />
          </div>

          {/* Target name */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, 50px)',
            textAlign: 'center', color: '#667788', fontSize: 10,
            letterSpacing: 2, textTransform: 'uppercase',
          }}>
            {targetLabel}: {targetName}
          </div>
        </>
      )}

      {/* ── PHASE 2: Capture loop ── */}
      {phase === 'capture' && (
        <>
          {/* Scan line */}
          <div style={{
            position: 'absolute',
            left: '10%', right: '10%',
            top: `${12 + scanY * 0.76}%`,
            height: 1,
            background: 'linear-gradient(90deg, transparent 0%, #4488aa 30%, #4488aa 70%, transparent 100%)',
            opacity: 0.4,
            boxShadow: '0 0 8px #4488aa44',
          }} />

          {/* Telemetry — top left */}
          <div style={{
            position: 'absolute', top: 20, left: 20,
            fontSize: 10, color: '#556677', lineHeight: 1.8,
          }}>
            <div>RA: {tel.raH}h {tel.raM}m {raSec}s</div>
            <div>DEC: {tel.decDeg > 0 ? '+' : ''}{tel.decDeg} {tel.decMin}' {decSec}"</div>
          </div>

          {/* Exposure timer — top right */}
          <div style={{
            position: 'absolute', top: 20, right: 20,
            fontSize: 10, color: '#556677', textAlign: 'right',
          }}>
            <div style={{ color: '#667788', fontSize: 8, letterSpacing: 1, marginBottom: 4 }}>
              EXPOSURE
            </div>
            <div style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatExposure(exposureTime)}
            </div>
          </div>

          {/* Status message — bottom center */}
          <div style={{
            position: 'absolute', bottom: '14%', left: 0, right: 0,
            textAlign: 'center', fontSize: 11, color: '#44ff88',
            letterSpacing: 3, textTransform: 'uppercase',
            opacity: 0.7,
          }}>
            [ {STATUS_MESSAGES[statusIdx]} ]
          </div>
        </>
      )}

      {/* ── PHASE 3: Reveal ── */}
      {phase === 'reveal' && photoUrl && (
        <>
          {/* White flash */}
          {showFlash && (
            <div style={{
              position: 'absolute', inset: 0,
              background: '#ffffff',
              opacity: showFlash ? 0.85 : 0,
              transition: 'opacity 0.3s ease-out',
              zIndex: 2,
            }} />
          )}

          {/* Photo container */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            zIndex: 1,
            transform: flyAway ? 'scale(0.05) translate(0, 100vh)' : 'scale(1)',
            opacity: flyAway ? 0 : 1,
            transition: flyAway ? 'transform 0.7s ease-in, opacity 0.5s ease-in' : 'none',
          }}>
            {/* Photo */}
            <img
              ref={photoRef}
              src={photoUrl}
              alt={targetName}
              style={{
                maxWidth: '90vw',
                maxHeight: '65vh',
                objectFit: 'contain',
                borderRadius: 4,
                boxShadow: '0 4px 32px rgba(0,0,0,0.8)',
              }}
            />

            {/* Grain overlay on top of photo */}
            {grainOpacity > 0.01 && (
              <div style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '90vw', height: '65vh',
                backgroundImage: NOISE_SVG,
                backgroundRepeat: 'repeat',
                opacity: grainOpacity,
                pointerEvents: 'none',
                mixBlendMode: 'overlay',
                borderRadius: 4,
              }} />
            )}

            {/* Target label below photo */}
            <div style={{
              marginTop: 12,
              textAlign: 'center', color: '#667788', fontSize: 10,
              letterSpacing: 1, textTransform: 'uppercase',
            }}>
              {targetLabel} / {targetName}
            </div>

            {/* Action buttons */}
            {showActions && !flyAway && (
              <div style={{
                display: 'flex', gap: 12, marginTop: 20,
                opacity: showActions ? 1 : 0,
                transform: showActions ? 'translateY(0)' : 'translateY(10px)',
                transition: 'opacity 0.4s, transform 0.4s',
              }}>
                <button
                  onClick={onShare}
                  style={{
                    background: 'none',
                    border: '1px solid #4488aa',
                    borderRadius: 3,
                    color: '#4488aa',
                    fontFamily: 'monospace',
                    fontSize: 11,
                    padding: '8px 20px',
                    cursor: 'pointer',
                    letterSpacing: 1,
                  }}
                >
                  Поділитися
                </button>
                <button
                  onClick={handleSave}
                  style={{
                    background: 'rgba(68, 255, 136, 0.1)',
                    border: '1px solid #44ff88',
                    borderRadius: 3,
                    color: '#44ff88',
                    fontFamily: 'monospace',
                    fontSize: 11,
                    padding: '8px 20px',
                    cursor: 'pointer',
                    letterSpacing: 1,
                  }}
                >
                  Зберегти в Колекцію
                </button>
                <button
                  onClick={onClose}
                  style={{
                    background: 'none',
                    border: '1px solid #334455',
                    borderRadius: 3,
                    color: '#667788',
                    fontFamily: 'monospace',
                    fontSize: 11,
                    padding: '8px 12px',
                    cursor: 'pointer',
                  }}
                >
                  X
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
