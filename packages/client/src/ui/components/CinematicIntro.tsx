import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { StarSystem, Planet } from '@nebulife/core';
import type { GameEngine } from '../../game/GameEngine.js';

// ---------------------------------------------------------------------------
// CinematicIntro — 5-stage cinematic zoom-in for new players
// Replaces OnboardingScreen with live PixiJS galaxy fly-through
// ---------------------------------------------------------------------------

export interface CinematicIntroProps {
  homeInfo: { system: StarSystem; planet: Planet };
  engineRef: React.RefObject<GameEngine | null>;
  onComplete: () => void;
  onRequestUniverseScene: () => Promise<void> | void;
  onLeaveUniverseToGalaxy: () => void;
  onRequestGalaxyScene: () => void;
  onRequestSystemScene: (system: StarSystem) => void;
  onRequestHomeScene: () => void;
}

type Stage = 0 | 1 | 2 | 3 | 4;
// 0 = macro-cosmos (subtitles over universe — Three.js)
// 1 = warp dive (universe → galaxy zoom-in)
// 2 = scene transitions (system → home)
// 3 = alert modal
// 4 = handoff (fade out → complete)

// ---------------------------------------------------------------------------
// Typewriter — cinematic subtitles with per-character animation
// ---------------------------------------------------------------------------
function CinematicTypewriter({
  lines,
  charDelay = 40,
  lineDelay = 1200,
  onDone,
}: {
  lines: string[];
  charDelay?: number;
  lineDelay?: number;
  onDone: () => void;
}) {
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState(false);
  const doneRef = useRef(false);
  // Keep stable ref for onDone to avoid clearing timeouts on parent re-renders
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (doneRef.current) return;

    if (lineIdx >= lines.length) {
      if (!doneRef.current) {
        doneRef.current = true;
        setDone(true);
        onDoneRef.current();
      }
      return;
    }

    const currentLine = lines[lineIdx];
    if (charIdx < currentLine.length) {
      const timer = setTimeout(() => setCharIdx((c) => c + 1), charDelay);
      return () => clearTimeout(timer);
    } else if (lineIdx >= lines.length - 1) {
      // Last line finished — complete immediately (no lineDelay)
      if (!doneRef.current) {
        doneRef.current = true;
        setDone(true);
        onDoneRef.current();
      }
    } else {
      const timer = setTimeout(() => {
        setLineIdx((l) => l + 1);
        setCharIdx(0);
      }, lineDelay);
      return () => clearTimeout(timer);
    }
  }, [lineIdx, charIdx, lines, charDelay, lineDelay]);

  return (
    <div style={{ textAlign: 'center' }}>
      {lines.map((line, i) => {
        if (i > lineIdx) return null;

        const displayedText = i < lineIdx ? line : line.slice(0, charIdx);
        const showCursor = !done && i === lineIdx;

        return (
          <div
            key={i}
            style={{
              color: '#8899aa',
              fontFamily: 'monospace',
              fontSize: 15,
              lineHeight: '2.2',
              whiteSpace: 'pre-wrap',
              opacity: i < lineIdx ? 0.5 : 1,
              transition: 'opacity 0.8s ease',
            }}
          >
            {displayedText}
            {showCursor && (
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 15,
                  background: '#4488aa',
                  marginLeft: 2,
                  verticalAlign: 'text-bottom',
                  animation: 'cin-blink 0.8s step-end infinite',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Warp star-trail effect (canvas overlay for Stage 1 → 2 transition)
// Soft, chaotic particles with varying sizes, drift angles, and fade-out
// ---------------------------------------------------------------------------
interface WarpParticle {
  x: number;
  y: number;
  angle: number;      // radial direction from center
  drift: number;      // angular drift for chaotic motion
  speed: number;
  size: number;        // particle width (1-3)
  alpha: number;       // max brightness
  life: number;        // 0-1 lifecycle (fades out near 1)
  lifeSpeed: number;   // how fast life progresses
}

function WarpOverlay({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy) * 1.2;

    function spawnParticle(nearCenter: boolean): WarpParticle {
      const angle = Math.random() * Math.PI * 2;
      const dist = nearCenter ? (5 + Math.random() * 60) : (20 + Math.random() * maxDist * 0.4);
      return {
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        angle,
        drift: (Math.random() - 0.5) * 0.04, // slight random curve
        speed: 1.5 + Math.random() * 4,
        size: 0.5 + Math.random() * 2,
        alpha: 0.15 + Math.random() * 0.35,
        life: nearCenter ? 0 : Math.random() * 0.3,
        lifeSpeed: 0.003 + Math.random() * 0.006,
      };
    }

    // Create particles — mix of near-center spawns and scattered
    const particles: WarpParticle[] = [];
    for (let i = 0; i < 160; i++) {
      particles.push(spawnParticle(i < 100));
    }

    let startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const accel = Math.min(1, elapsed / 2500); // gentle ramp up

      // Fade trail (semi-transparent fill for motion blur effect)
      ctx.fillStyle = 'rgba(2,5,16,0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        // Advance life
        p.life += p.lifeSpeed * accel;

        // Fade factor: fade-in at start, fade-out near end
        const fadeIn = Math.min(1, p.life * 5);
        const fadeOut = Math.max(0, 1 - (p.life - 0.6) / 0.4);
        const fade = fadeIn * (p.life > 0.6 ? fadeOut : 1);

        // Move along radial + drift
        p.angle += p.drift * 0.1;
        const moveSpeed = p.speed * accel * (0.5 + p.life * 1.5);
        p.x += Math.cos(p.angle) * moveSpeed;
        p.y += Math.sin(p.angle) * moveSpeed;

        // Trail length grows with speed and life
        const trailLen = (4 + p.life * 20) * accel;

        // Draw soft elongated dot (multiple overlapping circles for blur effect)
        const drawAlpha = p.alpha * fade * accel;
        if (drawAlpha < 0.01) continue;

        const nx = Math.cos(p.angle);
        const ny = Math.sin(p.angle);

        // Outer glow (wider, dimmer)
        ctx.strokeStyle = `rgba(140,170,220,${drawAlpha * 0.3})`;
        ctx.lineWidth = p.size + 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - nx * trailLen * 0.7, p.y - ny * trailLen * 0.7);
        ctx.stroke();

        // Core trail (thinner, brighter)
        ctx.strokeStyle = `rgba(200,215,255,${drawAlpha * 0.7})`;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - nx * trailLen, p.y - ny * trailLen);
        ctx.stroke();

        // Respawn when life exhausted or off screen
        if (p.life >= 1 || p.x < -100 || p.x > canvas.width + 100 || p.y < -100 || p.y > canvas.height + 100) {
          const newP = spawnParticle(true);
          p.x = newP.x;
          p.y = newP.y;
          p.angle = newP.angle;
          p.drift = newP.drift;
          p.speed = newP.speed;
          p.size = newP.size;
          p.alpha = newP.alpha;
          p.life = 0;
          p.lifeSpeed = newP.lifeSpeed;
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10002,
        pointerEvents: 'none',
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Alert modal (Stage 3) — catastrophe warning
// ---------------------------------------------------------------------------
function AlertModal({
  visible,
  planetName,
  onAccept,
}: {
  visible: boolean;
  planetName: string;
  onAccept: () => void;
}) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => setShowContent(true), 400);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10005,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(2,5,16,0.85)',
      fontFamily: 'monospace',
      animation: 'cin-flash 0.6s ease-out',
    }}>
      <div style={{
        maxWidth: 640,
        width: '90%',
        background: 'rgba(15,10,10,0.95)',
        border: '1px solid #cc4444',
        borderRadius: 6,
        padding: '32px 28px',
        opacity: showContent ? 1 : 0,
        transform: showContent ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}>
        {/* Warning header */}
        <div style={{
          color: '#cc4444',
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          textAlign: 'center',
          marginBottom: 20,
          animation: 'cin-blink 1.2s step-end infinite',
        }}>
          КРИТИЧНЕ ПОПЕРЕДЖЕННЯ
        </div>

        {/* Video placeholder */}
        <div style={{
          width: '100%',
          aspectRatio: '16/9',
          background: 'rgba(20,15,15,0.8)',
          border: '1px dashed #442222',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#442222',
          fontFamily: 'monospace',
          fontSize: 12,
          marginBottom: 20,
        }}>
          // CATASTROPHE_TRANSMISSION
        </div>

        {/* Alert text */}
        <div style={{
          color: '#aabbcc',
          fontSize: 13,
          lineHeight: '1.8',
          textAlign: 'center',
          marginBottom: 8,
        }}>
          Виявлено астероїд класу Omega.
        </div>
        <div style={{
          color: '#8899aa',
          fontSize: 12,
          lineHeight: '1.8',
          textAlign: 'center',
          marginBottom: 4,
        }}>
          Траєкторія: зіткнення з планетою {planetName}.
        </div>
        <div style={{
          color: '#cc4444',
          fontSize: 13,
          lineHeight: '1.8',
          textAlign: 'center',
          marginBottom: 24,
        }}>
          Час до удару: 1 доба. Протокол евакуації активовано.
        </div>

        {/* Mission */}
        <div style={{
          background: 'rgba(10,15,25,0.8)',
          border: '1px solid #334455',
          borderRadius: 4,
          padding: '16px 20px',
          marginBottom: 24,
        }}>
          <div style={{
            color: '#556677',
            fontSize: 10,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            marginBottom: 10,
          }}>
            ДИРЕКТИВА ЕВАКУАЦІЇ
          </div>
          <div style={{ color: '#44ff88', fontSize: 12, lineHeight: '1.8' }}>
            {'>'} Дослідити сусідні зоряні системи
          </div>
          <div style={{ color: '#44ff88', fontSize: 12, lineHeight: '1.8' }}>
            {'>'} Знайти придатну для колонізації планету
          </div>
          <div style={{ color: '#44ff88', fontSize: 12, lineHeight: '1.8' }}>
            {'>'} Запустити Корабель Порятунку
          </div>
        </div>

        {/* Accept button */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onAccept}
            style={{
              background: 'rgba(204,68,68,0.15)',
              border: '1px solid #cc4444',
              borderRadius: 3,
              color: '#cc4444',
              fontFamily: 'monospace',
              fontSize: 13,
              padding: '12px 40px',
              cursor: 'pointer',
              transition: 'background 0.2s',
              letterSpacing: 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(204,68,68,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(204,68,68,0.15)';
            }}
          >
            ЗРОЗУМIЛО
          </button>
        </div>
      </div>
    </div>
  );
}

// Stable reference — never recreated on re-render
const SUBTITLE_LINES = [
  'Мільйони командорів у єдиному просторі.',
  'Галактика Nebulife -- лише піщинка на мапі світобудови.',
  'Чи готовий ти до захоплення всесвіту?',
];

// ---------------------------------------------------------------------------
// Main component — 5-stage state machine
// ---------------------------------------------------------------------------
export function CinematicIntro({
  homeInfo,
  engineRef,
  onComplete,
  onRequestUniverseScene,
  onLeaveUniverseToGalaxy,
  onRequestGalaxyScene,
  onRequestSystemScene,
  onRequestHomeScene,
}: CinematicIntroProps) {
  const [stage, setStage] = useState<Stage>(0);
  const [subtitlesDone, setSubtitlesDone] = useState(false);
  const [statusVisible, setStatusVisible] = useState(true);
  const [warpActive, setWarpActive] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const stageRef = useRef<Stage>(0);
  const mountedRef = useRef(true);

  const { system, planet } = homeInfo;

  // Track stage in ref for async callbacks
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // ── Stage 0: Show Universe scene (Three.js) ──
  useEffect(() => {
    onRequestUniverseScene();
  }, []); // mount only

  // ── Stage 0 → 1: After subtitles done → warp from universe to galaxy ──
  useEffect(() => {
    if (!subtitlesDone || stage !== 0) return;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Brief pause after last subtitle
    timers.push(setTimeout(() => {
      if (!mountedRef.current) return;
      setStage(1);
      setWarpActive(true);
      setStatusVisible(false);

      // After warp covers the screen, switch from universe to galaxy
      timers.push(setTimeout(() => {
        if (!mountedRef.current) return;
        onLeaveUniverseToGalaxy();

        const engine = engineRef.current;
        if (engine) {
          engine.setCinematicMode(true);
          engine.addFakePlayerMarkers(8);
          engine.animateCameraTo(0, 0, 0.25, 100); // instant zoom-out
        }

        // Start galaxy zoom-in
        timers.push(setTimeout(() => {
          if (!mountedRef.current) return;
          engineRef.current?.animateCameraTo(0, 0, 4.5, 2500);

          // After zoom → Stage 2
          timers.push(setTimeout(() => {
            if (!mountedRef.current) return;
            setWarpActive(false);
            setStage(2);
          }, 2800));
        }, 300));
      }, 800));
    }, 500));

    return () => timers.forEach(clearTimeout);
  }, [subtitlesDone, stage]);

  // ── Stage 2: Scene transitions → system → home ──
  useEffect(() => {
    if (stage !== 2) return;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const engine = engineRef.current;
    if (engine) {
      engine.setCinematicMode(false);
      engine.removeFakePlayerMarkers();
    }

    // Show system scene briefly
    onRequestSystemScene(system);

    // After a pause → go to home + show alert
    timers.push(setTimeout(() => {
      if (!mountedRef.current) return;
      onRequestHomeScene();

      timers.push(setTimeout(() => {
        if (!mountedRef.current) return;
        setStage(3);
        setAlertVisible(true);
      }, 1200));
    }, 1800));

    return () => timers.forEach(clearTimeout);
  }, [stage]);

  // ── Stage 3 → 4: Alert accepted ──
  const handleAlertAccept = useCallback(() => {
    setAlertVisible(false);
    setStage(4);
    setFadeOut(true);

    setTimeout(() => {
      if (!mountedRef.current) return;
      onComplete();
    }, 600);
  }, [onComplete]);

  return (
    <>
      {/* CSS animations */}
      <style>{`
        @keyframes cin-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes cin-flash {
          0% { background: rgba(204,68,68,0.4); }
          30% { background: rgba(204,68,68,0.15); }
          100% { background: rgba(2,5,16,0.85); }
        }
        @keyframes cin-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Overlay — subtitles + status (Stages 0-1) */}
      {stage <= 1 && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10001,
            pointerEvents: stage === 0 ? 'auto' : 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingBottom: 80,
            fontFamily: 'monospace',
            opacity: fadeOut ? 0 : 1,
            transition: 'opacity 0.6s ease',
          }}
        >
          {/* Gradient at bottom for readability */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 200,
            background: 'linear-gradient(transparent, rgba(2,5,16,0.9))',
            pointerEvents: 'none',
          }} />

          {/* Subtitles */}
          <div style={{ position: 'relative', zIndex: 1, maxWidth: 600, padding: '0 20px' }}>
            <CinematicTypewriter
              lines={SUBTITLE_LINES}
              charDelay={35}
              lineDelay={800}
              onDone={() => setSubtitlesDone(true)}
            />
          </div>

          {/* Status line */}
          {statusVisible && (
            <div style={{
              position: 'relative',
              zIndex: 1,
              marginTop: 24,
              color: '#334455',
              fontSize: 10,
              letterSpacing: 2,
              textTransform: 'uppercase',
              animation: 'cin-pulse 2s ease-in-out infinite',
            }}>
              [ СИНХРОНІЗАЦІЯ З МАТРИЦЕЮ КООРДИНАТ... ]
            </div>
          )}
        </div>
      )}

      {/* Warp star-trail overlay */}
      <WarpOverlay active={warpActive} />

      {/* Alert modal (Stage 3) */}
      <AlertModal
        visible={alertVisible}
        planetName={planet.name}
        onAccept={handleAlertAccept}
      />
    </>
  );
}
