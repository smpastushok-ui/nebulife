import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// ---------------------------------------------------------------------------
// TelescopeOverlay — cinematic full-screen overlay for AI photo generation
// Phases: init (viewfinder) -> capture (waiting loop) -> reveal (photo + actions)
// Two modes: "planet" (crosshair viewfinder) and "system" (letterbox panorama)
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

// Status message i18n keys (computed inside the component using t())
const PLANET_STATUS_KEYS = [
  'telescope.planet_status_1',
  'telescope.planet_status_2',
  'telescope.planet_status_3',
  'telescope.planet_status_4',
  'telescope.planet_status_5',
];

const SYSTEM_STATUS_KEYS = [
  'telescope.system_status_1',
  'telescope.system_status_2',
  'telescope.system_status_3',
  'telescope.system_status_4',
  'telescope.system_status_5',
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
  const { t } = useTranslation();
  const isSystem = targetType === 'system';
  const statusKeys = isSystem ? SYSTEM_STATUS_KEYS : PLANET_STATUS_KEYS;

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

    const sweepDuration = isSystem ? 6000 : 3000; // System: slower 6s sweep

    const animate = () => {
      const elapsed = performance.now() - startTimeRef.current;
      setScanY(((elapsed % sweepDuration) / sweepDuration) * 100);
      setExposureTime(elapsed / 1000);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, isSystem]);

  // Status message rotation
  useEffect(() => {
    if (phase !== 'capture') return;
    const interval = setInterval(() => {
      setStatusIdx(prev => (prev + 1) % statusKeys.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [phase, statusKeys.length]);

  // Reveal phase: flash + grain fade
  useEffect(() => {
    if (phase === 'reveal' && prevPhaseRef.current !== 'reveal') {
      setShowFlash(true);
      setGrainOpacity(0.4);
      setShowActions(false);

      const flashTimer = setTimeout(() => setShowFlash(false), 300);
      const grainStart = performance.now();
      const fadeGrain = () => {
        const elapsed = performance.now() - grainStart;
        const t = Math.min(elapsed / 2000, 1);
        setGrainOpacity(0.4 * (1 - t));
        if (t < 1) requestAnimationFrame(fadeGrain);
      };
      setTimeout(() => requestAnimationFrame(fadeGrain), 400);
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

  const targetLabel = isSystem ? t('telescope.target_system') : t('telescope.target_planet');

  // Letterbox bar height for system mode (creates 16:9 cinematic frame)
  // If viewport is 16:9, bars are minimal; if taller, bars grow
  const letterboxH = isSystem ? 'max(0px, calc((100vh - 100vw * 9 / 16) / 2))' : '0px';

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
      {/* ── System letterbox bars ── */}
      {isSystem && (phase === 'init' || phase === 'capture') && (
        <>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: letterboxH,
            background: 'rgba(0, 0, 0, 0.7)',
            zIndex: 3,
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: letterboxH,
            background: 'rgba(0, 0, 0, 0.7)',
            zIndex: 3,
          }} />
          {/* Letterbox border lines */}
          <div style={{
            position: 'absolute', left: 0, right: 0,
            top: letterboxH,
            height: 1,
            background: '#4488aa',
            opacity: 0.3,
            zIndex: 4,
          }} />
          <div style={{
            position: 'absolute', left: 0, right: 0,
            bottom: letterboxH,
            height: 1,
            background: '#4488aa',
            opacity: 0.3,
            zIndex: 4,
          }} />
        </>
      )}

      {/* ── PHASE 1 & 2: Planet Viewfinder (crosshair + corners) ── */}
      {!isSystem && (phase === 'init' || phase === 'capture') && (
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
            <div style={{
              position: 'absolute', top: '50%', left: 0, right: 0, height: 1,
              background: '#44ff88', opacity: 0.5,
            }} />
            <div style={{
              position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1,
              background: '#44ff88', opacity: 0.5,
            }} />
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

      {/* ── PHASE 1 & 2: System Viewfinder (wide-angle panoramic frame) ── */}
      {isSystem && (phase === 'init' || phase === 'capture') && (
        <>
          {/* Wide-angle side brackets */}
          {[
            { top: '20%', left: '4%', borderTop: '1px solid #4488aa', borderLeft: '1px solid #4488aa' },
            { top: '20%', right: '4%', borderTop: '1px solid #4488aa', borderRight: '1px solid #4488aa' },
            { bottom: '20%', left: '4%', borderBottom: '1px solid #4488aa', borderLeft: '1px solid #4488aa' },
            { bottom: '20%', right: '4%', borderBottom: '1px solid #4488aa', borderRight: '1px solid #4488aa' },
          ].map((s, i) => (
            <div key={i} style={{
              position: 'absolute', width: 60, height: 24, ...s, opacity: 0.5,
            }} />
          ))}

          {/* Horizontal guide lines (orbit lanes) */}
          {[35, 50, 65].map((pct) => (
            <div key={pct} style={{
              position: 'absolute',
              left: '6%', right: '6%',
              top: `${pct}%`,
              height: 1,
              background: '#4488aa',
              opacity: 0.08,
            }} />
          ))}

          {/* Panorama label top-center */}
          <div style={{
            position: 'absolute',
            top: 'calc(20% - 20px)', left: 0, right: 0,
            textAlign: 'center', fontSize: 8, color: '#445566',
            letterSpacing: 3, textTransform: 'uppercase',
          }}>
            PANORAMIC CAPTURE / 16:9
          </div>

          {/* Target name center */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', color: '#667788', fontSize: 11,
            letterSpacing: 3, textTransform: 'uppercase',
          }}>
            {targetLabel}: {targetName}
          </div>
        </>
      )}

      {/* ── PHASE 2: Planet Capture loop ── */}
      {!isSystem && phase === 'capture' && (
        <>
          {/* Thin scan line */}
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
            [ {t(statusKeys[statusIdx])} ]
          </div>
        </>
      )}

      {/* ── PHASE 2: System Capture loop (wide orbit scan) ── */}
      {isSystem && phase === 'capture' && (
        <>
          {/* Wide scan band — heavier, slower */}
          <div style={{
            position: 'absolute',
            left: '4%', right: '4%',
            top: `${20 + scanY * 0.60}%`,
            height: 3,
            background: 'linear-gradient(90deg, transparent 0%, #4488aa 15%, #4488aa 85%, transparent 100%)',
            opacity: 0.35,
            boxShadow: '0 0 16px #4488aa55, 0 0 4px #4488aa33',
          }} />
          {/* Glow trail behind scan band */}
          <div style={{
            position: 'absolute',
            left: '4%', right: '4%',
            top: `${20 + scanY * 0.60 - 1.5}%`,
            height: 20,
            background: 'linear-gradient(180deg, transparent 0%, #4488aa08 40%, #4488aa12 70%, transparent 100%)',
            opacity: 0.5,
          }} />

          {/* Telemetry — top left (within letterbox) */}
          <div style={{
            position: 'absolute', top: 20, left: 20,
            fontSize: 10, color: '#556677', lineHeight: 1.8,
            zIndex: 5,
          }}>
            <div>RA: {tel.raH}h {tel.raM}m {raSec}s</div>
            <div>DEC: {tel.decDeg > 0 ? '+' : ''}{tel.decDeg} {tel.decMin}' {decSec}"</div>
            <div style={{ marginTop: 4, fontSize: 8, color: '#445566' }}>
              FOV: 180.0 x 101.3
            </div>
          </div>

          {/* Exposure timer — top right */}
          <div style={{
            position: 'absolute', top: 20, right: 20,
            fontSize: 10, color: '#556677', textAlign: 'right',
            zIndex: 5,
          }}>
            <div style={{ color: '#667788', fontSize: 8, letterSpacing: 1, marginBottom: 4 }}>
              PANORAMA EXPOSURE
            </div>
            <div style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatExposure(exposureTime)}
            </div>
          </div>

          {/* Orbit count indicator — bottom left */}
          <div style={{
            position: 'absolute', bottom: 20, left: 20,
            fontSize: 9, color: '#445566', lineHeight: 1.6,
            zIndex: 5,
          }}>
            <div>ORBITS: {Math.floor(exposureTime / 6) + 1}</div>
            <div>SECTORS: {Math.min(Math.floor(exposureTime * 2), 99)}/99</div>
          </div>

          {/* Status message — bottom center */}
          <div style={{
            position: 'absolute', bottom: '18%', left: 0, right: 0,
            textAlign: 'center', fontSize: 11, color: '#44ff88',
            letterSpacing: 3, textTransform: 'uppercase',
            opacity: 0.7,
            zIndex: 5,
          }}>
            [ {t(statusKeys[statusIdx])} ]
          </div>
        </>
      )}

      {/* ── PHASE 3: Reveal (same for both types) ── */}
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
                  {t('telescope.share_btn')}
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
                  {t('telescope.save_btn')}
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
