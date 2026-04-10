import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { StarSystem, Planet } from '@nebulife/core';
import type { GameEngine } from '../../game/GameEngine.js';
import { playSfx, playLoop, stopLoop, setLoopVolume } from '../../audio/SfxPlayer.js';

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
  /** Notifies parent (App) that a cinematic video is currently playing,
   *  so global ambient (SpaceAmbient / PlanetAmbient) can be muted. */
  onVideoPlayingChange?: (playing: boolean) => void;
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
// 5s total: ramp-up (0-1.5s) → cruise (1.5-3.5s) → fade-out (3.5-5s)
// During fade-out stars slow down, dim, and stop respawning → smooth exit
// ---------------------------------------------------------------------------
interface WarpParticle {
  x: number;
  y: number;
  angle: number;
  drift: number;
  speed: number;
  size: number;
  alpha: number;
  life: number;
  lifeSpeed: number;
  dead: boolean;       // marked during fade-out, never respawns
}

const WARP_DURATION = 7000;
const WARP_RAMP_END = 2000;     // ramp-up ends at 2s
const WARP_FADE_START = 5000;   // fade-out begins at 5s

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

    function spawnParticle(nearCenter: boolean): WarpParticle {
      const angle = Math.random() * Math.PI * 2;
      const dist = nearCenter ? (5 + Math.random() * 60) : (20 + Math.random() * 200);
      return {
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        angle,
        drift: (Math.random() - 0.5) * 0.04,
        speed: 1.5 + Math.random() * 4,
        size: 0.5 + Math.random() * 2,
        alpha: 0.15 + Math.random() * 0.35,
        life: nearCenter ? 0 : Math.random() * 0.3,
        lifeSpeed: 0.003 + Math.random() * 0.006,
        dead: false,
      };
    }

    const particles: WarpParticle[] = [];
    for (let i = 0; i < 150; i++) {
      particles.push(spawnParticle(i < 90));
    }

    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;

      // Global envelope: ramp-up → cruise → fade-out
      let envelope: number;
      if (elapsed < WARP_RAMP_END) {
        // Smooth ease-in
        const t = elapsed / WARP_RAMP_END;
        envelope = t * t; // quadratic ease-in
      } else if (elapsed < WARP_FADE_START) {
        envelope = 1;
      } else {
        // Smooth ease-out
        const t = (elapsed - WARP_FADE_START) / (WARP_DURATION - WARP_FADE_START);
        const clamped = Math.min(1, t);
        envelope = 1 - clamped * clamped; // quadratic ease-out
      }

      const isFading = elapsed >= WARP_FADE_START;

      // During fade-out: use CSS opacity to fade the entire canvas to transparent
      // This reveals the game background underneath smoothly
      if (isFading && canvas.style.opacity !== '0') {
        canvas.style.opacity = '0';
      }

      // Canvas clear — semi-transparent fill creates motion blur trails
      ctx.fillStyle = 'rgba(2,5,16,0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Stop animation after duration
      if (elapsed > WARP_DURATION + 500) return;

      let aliveCount = 0;

      for (const p of particles) {
        if (p.dead) continue;

        p.life += p.lifeSpeed * envelope;

        // Per-particle fade: fade-in at birth, fade-out at end of life
        const fadeIn = Math.min(1, p.life * 5);
        const fadeOutLife = Math.max(0, 1 - (p.life - 0.6) / 0.4);
        const particleFade = fadeIn * (p.life > 0.6 ? fadeOutLife : 1);

        // Move — speed scales with envelope
        p.angle += p.drift * 0.1;
        const moveSpeed = p.speed * envelope * (0.5 + p.life * 1.5);
        p.x += Math.cos(p.angle) * moveSpeed;
        p.y += Math.sin(p.angle) * moveSpeed;

        const trailLen = (4 + p.life * 20) * envelope;
        const drawAlpha = p.alpha * particleFade * envelope;
        if (drawAlpha < 0.01) continue;

        aliveCount++;
        const nx = Math.cos(p.angle);
        const ny = Math.sin(p.angle);

        // Outer glow
        ctx.strokeStyle = `rgba(140,170,220,${drawAlpha * 0.3})`;
        ctx.lineWidth = p.size + 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - nx * trailLen * 0.7, p.y - ny * trailLen * 0.7);
        ctx.stroke();

        // Core trail
        ctx.strokeStyle = `rgba(200,215,255,${drawAlpha * 0.7})`;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - nx * trailLen, p.y - ny * trailLen);
        ctx.stroke();

        // Respawn or die
        const offScreen = p.x < -100 || p.x > canvas.width + 100 || p.y < -100 || p.y > canvas.height + 100;
        if (p.life >= 1 || offScreen) {
          if (isFading) {
            // During fade-out: don't respawn, just mark dead
            p.dead = true;
          } else {
            const newP = spawnParticle(true);
            p.x = newP.x; p.y = newP.y;
            p.angle = newP.angle; p.drift = newP.drift;
            p.speed = newP.speed; p.size = newP.size;
            p.alpha = newP.alpha; p.life = 0;
            p.lifeSpeed = newP.lifeSpeed;
          }
        }
      }

      // Continue until all particles are gone or duration exceeded
      if (aliveCount > 0 || elapsed < WARP_DURATION) {
        rafRef.current = requestAnimationFrame(animate);
      }
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
        opacity: 1,
        transition: 'opacity 1.5s ease-out',
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Video placeholder (will be replaced with real <video> later)
// ---------------------------------------------------------------------------
function VideoPlaceholder({ label }: { label: string }) {
  return (
    <div style={{
      width: '100%',
      maxWidth: 720,
      aspectRatio: '16/9',
      background: 'rgba(15,20,35,0.8)',
      border: '1px dashed #334455',
      borderRadius: 4,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#334455',
      fontFamily: 'monospace',
      fontSize: 12,
      margin: '0 auto',
    }}>
      // {label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CinematicVideoSlide - real video element with loading + end fade states
// ---------------------------------------------------------------------------
//   - Shows a "loading" overlay (animated dots over starfield) while the
//     video buffers
//   - Plays full-quality video once `canplay` fires
//   - On `ended`: 1-second brightness fade-to-black, video stays in DOM as
//     a dark background
//   - Notifies parent via onPlayingChange so global ambient can mute
// ---------------------------------------------------------------------------
function CinematicVideoSlide({
  src,
  onPlayingChange,
}: {
  src: string;
  onPlayingChange?: (playing: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [ended, setEnded] = useState(false);
  const onPlayingChangeRef = useRef(onPlayingChange);
  onPlayingChangeRef.current = onPlayingChange;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const handleCanPlay = () => setLoaded(true);
    const handlePlay = () => onPlayingChangeRef.current?.(true);
    const handleEnded = () => {
      onPlayingChangeRef.current?.(false);
      setEnded(true);
    };
    const handlePause = () => onPlayingChangeRef.current?.(false);
    v.addEventListener('canplay', handleCanPlay);
    v.addEventListener('loadeddata', handleCanPlay);
    v.addEventListener('play', handlePlay);
    v.addEventListener('ended', handleEnded);
    v.addEventListener('pause', handlePause);
    return () => {
      v.removeEventListener('canplay', handleCanPlay);
      v.removeEventListener('loadeddata', handleCanPlay);
      v.removeEventListener('play', handlePlay);
      v.removeEventListener('ended', handleEnded);
      v.removeEventListener('pause', handlePause);
      // Ensure parent knows we are no longer playing on unmount
      onPlayingChangeRef.current?.(false);
    };
  }, [src]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: 720,
      aspectRatio: '16/9',
      borderRadius: 4,
      overflow: 'hidden',
      margin: '0 auto',
      background: '#000',
    }}>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        playsInline
        preload="auto"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: loaded ? 1 : 0,
          filter: ended ? 'brightness(0)' : 'brightness(1)',
          transition: 'opacity 0.4s ease-out, filter 1s ease-out',
        }}
      />
      {!loaded && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
          background: 'radial-gradient(ellipse at center, #0a1020 0%, #020510 80%)',
          color: '#4488aa',
          fontFamily: 'monospace',
          fontSize: 10,
          letterSpacing: 3,
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ ...dotStyle, animationDelay: '0s' }} />
            <span style={{ ...dotStyle, animationDelay: '0.2s' }} />
            <span style={{ ...dotStyle, animationDelay: '0.4s' }} />
          </div>
          <div>loading transmission</div>
        </div>
      )}
    </div>
  );
}

const dotStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: '#4488aa',
  animation: 'cinematicLoadPulse 1.2s ease-in-out infinite',
  display: 'inline-block',
};

// ---------------------------------------------------------------------------
// Terminal typewriter for slide 1 (green text, skip on click)
// ---------------------------------------------------------------------------
function TerminalTypewriter({
  lines,
  onDone,
}: {
  lines: string[];
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState(false);
  const skipRef = useRef(false);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const handleSkip = useCallback(() => {
    if (doneRef.current) return;
    skipRef.current = true;
    setLineIdx(lines.length);
    setCharIdx(0);
    setDone(true);
    doneRef.current = true;
    onDoneRef.current();
  }, [lines.length]);

  useEffect(() => {
    if (skipRef.current || doneRef.current) return;
    if (lineIdx >= lines.length) {
      doneRef.current = true;
      setDone(true);
      onDoneRef.current();
      return;
    }
    const currentLine = lines[lineIdx];
    if (charIdx < currentLine.length) {
      const t = setTimeout(() => { playSfx('text-massage', 0.15); setCharIdx((c) => c + 1); }, 35);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => { setLineIdx((l) => l + 1); setCharIdx(0); }, 400);
      return () => clearTimeout(t);
    }
  }, [lineIdx, charIdx, lines]);

  return (
    <div onClick={handleSkip} style={{ cursor: done ? 'default' : 'pointer', userSelect: 'none' }}>
      {lines.map((line, i) => {
        if (i > lineIdx && !skipRef.current) return null;
        const text = skipRef.current || i < lineIdx ? line : line.slice(0, charIdx);
        const showCursor = !done && i === lineIdx;
        return (
          <div key={i} style={{ color: '#44ff88', fontFamily: 'monospace', fontSize: 13, lineHeight: '1.8', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {text}
            {showCursor && (
              <span style={{ display: 'inline-block', width: 7, height: 14, background: '#44ff88', marginLeft: 1, verticalAlign: 'text-bottom', animation: 'cin-blink 0.8s step-end infinite' }} />
            )}
          </div>
        );
      })}
      {!done && <div style={{ color: '#445566', fontSize: 10, marginTop: 16, textAlign: 'center' }}>{t('cinematic.click_to_skip')}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onboarding slides (4 slides, shown over home planet)
// ---------------------------------------------------------------------------
type OnboardingSlide = 0 | 1 | 2 | 3;

function OnboardingSlides({
  visible,
  system,
  planet,
  onComplete,
  onVideoPlayingChange,
}: {
  visible: boolean;
  system: { star: { name: string; spectralClass: string; subType: number; temperatureK: number } };
  planet: { name: string };
  onComplete: () => void;
  onVideoPlayingChange?: (playing: boolean) => void;
}) {
  const { t } = useTranslation();
  const [slide, setSlide] = useState<OnboardingSlide>(0);
  const [typewriterDone, setTypewriterDone] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  // Start terminal loop on first mount — it will be audible only when slide >= 1
  // Starting on mount (in a click gesture context from "Start" button) ensures
  // autoplay is allowed. Volume is set to 0 initially and raised when slide changes.
  useEffect(() => {
    playLoop('terminal-loop', 0);
    return () => stopLoop('terminal-loop');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (slide === 0) {
      playSfx('before-trailers', 0.3);
      setLoopVolume('terminal-loop', 0); // mute during video
    } else {
      setLoopVolume('terminal-loop', 0.5); // unmute on slides 1, 2, 3
    }
  }, [slide]);

  const { star } = system;

  const terminalLines = useMemo(() => [
    `> ${t('cinematic.system_label')}: ${star.name}`,
    `> ${t('cinematic.star_class_label')}: ${star.spectralClass}${star.subType} | ${Math.round(star.temperatureK).toLocaleString()} K`,
    `> ${t('cinematic.planet_label')}: ${planet.name}`,
    `> ${t('cinematic.threat_detected')}`,
    `> ${t('cinematic.trajectory_label')}`,
    `> ${t('cinematic.time_to_impact')}`,
    `> ${t('cinematic.status_evac')}`,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, star.name, star.spectralClass, star.subType, star.temperatureK, planet.name]);

  const handleNext = () => {
    if (slide < 3) {
      setSlide((s) => (s + 1) as OnboardingSlide);
      setTypewriterDone(false);
    }
  };

  const handleFinish = () => {
    setFadeOut(true);
    setTimeout(onComplete, 600);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10005,
      background: 'rgba(2,5,16,0.75)',
      fontFamily: 'monospace',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: fadeOut ? 0 : 1,
      transition: 'opacity 0.6s ease',
    }}>
      {/* Slide indicator */}
      <div style={{ position: 'absolute', top: 24, display: 'flex', gap: 8 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: i === slide ? '#44ff88' : '#334455',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* Content area */}
      <div style={{
        maxWidth: 760, width: '90%', padding: '0 20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
      }}>
        {/* Slide 0: Catastrophe video */}
        {slide === 0 && (
          <>
            <CinematicVideoSlide src="/videos/catastrophe.mp4" onPlayingChange={onVideoPlayingChange} />
            <p style={{ color: '#8899aa', fontSize: 13, textAlign: 'center', lineHeight: '1.6', maxWidth: 500, margin: 0 }}>
              {t('cinematic.civilization_intro')}
            </p>
          </>
        )}

        {/* Slide 1: Terminal typewriter */}
        {slide === 1 && (
          <div style={{
            width: '100%', maxWidth: 560, boxSizing: 'border-box',
            background: 'rgba(10,15,25,0.96)', border: '1px solid #334455',
            borderRadius: 6, padding: '24px 20px', overflow: 'hidden',
          }}>
            <div style={{ color: '#556677', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>
              {t('cinematic.mission_control')}
            </div>
            <TerminalTypewriter lines={terminalLines} onDone={() => setTypewriterDone(true)} />
          </div>
        )}

        {/* Slide 2: Mission briefing + video */}
        {slide === 2 && (
          <>
            <CinematicVideoSlide src="/videos/briefing.mp4" onPlayingChange={onVideoPlayingChange} />
            <div style={{ color: '#aabbcc', fontSize: 13, lineHeight: '1.8', maxWidth: 500, textAlign: 'left' }}>
              <div style={{ color: '#556677', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
                {t('cinematic.evacuation_directive')}
              </div>
              <div>{t('cinematic.your_mission')}</div>
              <div style={{ paddingLeft: 16, marginTop: 4 }}>
                <div style={{ color: '#44ff88' }}>{t('cinematic.goal_research')}</div>
                <div style={{ color: '#44ff88' }}>{t('cinematic.goal_find')}</div>
                <div style={{ color: '#44ff88' }}>{t('cinematic.goal_launch')}</div>
              </div>
            </div>
          </>
        )}

        {/* Slide 3: Final */}
        {slide === 3 && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{ color: '#aabbcc', fontSize: 16, lineHeight: '1.6', maxWidth: 400 }}>
              {t('cinematic.fate_line')}
            </div>
            <div style={{ color: '#667788', fontSize: 12, lineHeight: '1.6', maxWidth: 400 }}>
              {t('cinematic.time_limit')}
            </div>
          </div>
        )}
      </div>

      {/* Navigation button */}
      <div style={{ position: 'absolute', bottom: 48, display: 'flex', gap: 16, alignItems: 'center' }}>
        {slide < 3 && (
          <button
            onClick={handleNext}
            style={{
              background: 'rgba(30,60,80,0.6)', border: '1px solid #446688', borderRadius: 3,
              color: '#aabbcc', fontFamily: 'monospace', fontSize: 12,
              padding: '10px 32px', minHeight: 44, cursor: 'pointer',
              transition: 'background 0.2s, border-color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(40,80,110,0.7)'; e.currentTarget.style.borderColor = '#558899'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(30,60,80,0.6)'; e.currentTarget.style.borderColor = '#446688'; }}
          >
            {t('cinematic.next')}
          </button>
        )}
        {slide === 3 && (
          <button
            onClick={handleFinish}
            style={{
              background: 'rgba(34,170,68,0.2)', border: '1px solid #44ff88', borderRadius: 3,
              color: '#44ff88', fontFamily: 'monospace', fontSize: 13,
              padding: '12px 40px', minHeight: 44, cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,170,68,0.35)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(34,170,68,0.2)'; }}
          >
            {t('cinematic.start_mission')}
          </button>
        )}
      </div>
    </div>
  );
}

// SUBTITLE_LINES are now computed inside the component using t() — see CinematicIntro body

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
  onVideoPlayingChange,
}: CinematicIntroProps) {
  const { t } = useTranslation();
  const subtitleLines = useMemo(() => [
    t('cinematic.subtitle_1'),
    t('cinematic.subtitle_2'),
    t('cinematic.subtitle_3'),
  ], [t]);
  const [stage, setStage] = useState<Stage>(0);
  const [subtitlesDone, setSubtitlesDone] = useState(false);
  const [startClicked, setStartClicked] = useState(false);
  const [statusVisible, setStatusVisible] = useState(true);
  const [warpActive, setWarpActive] = useState(false);
  const [slidesVisible, setSlidesVisible] = useState(false);
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

  // ── Stage 0 → 1 → 2: After player clicks "Почати гру" → warp → home → slides ──
  // Skips galaxy level — warp covers transition directly to home planet
  useEffect(() => {
    if (!startClicked || stageRef.current !== 0) return;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Brief pause after button click
    // Warp is 7s total: ramp 0-2s, cruise 2-5s, fade 5-7s
    timers.push(setTimeout(() => {
      if (!mountedRef.current) return;
      setStage(1);
      setWarpActive(true);
      setStatusVisible(false);

      // At ~2s: switch directly from universe to home planet (warp covers transition)
      timers.push(setTimeout(() => {
        if (!mountedRef.current) return;
        onLeaveUniverseToGalaxy();
        onRequestHomeScene();
      }, 2000));

      // At ~5.5s: warp fully faded, home planet visible
      timers.push(setTimeout(() => {
        if (!mountedRef.current) return;
        setWarpActive(false);
        setStage(2);

        // After brief pause show onboarding slides
        timers.push(setTimeout(() => {
          if (!mountedRef.current) return;
          setStage(3);
          setSlidesVisible(true);
        }, 1500));
      }, 5500));
    }, 300));

    return () => timers.forEach(clearTimeout);
  }, [startClicked]);

  // ── Stage 3 → 4: Slides completed ──
  const handleSlidesComplete = useCallback(() => {
    setSlidesVisible(false);
    setStage(4);
    onComplete();
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
        @keyframes cinematicLoadPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1); }
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
              lines={subtitleLines}
              charDelay={35}
              lineDelay={800}
              onDone={() => setSubtitlesDone(true)}
            />
          </div>

          {/* "Почати гру" button — appears after subtitles finish */}
          {subtitlesDone && !startClicked && (
            <div style={{
              position: 'relative',
              zIndex: 1,
              marginTop: 28,
              opacity: 1,
              animation: 'cin-pulse 2s ease-in-out 1',
            }}>
              <button
                onClick={() => setStartClicked(true)}
                style={{
                  background: 'rgba(68,136,170,0.12)',
                  border: '1px solid #4488aa',
                  borderRadius: 3,
                  color: '#4488aa',
                  fontFamily: 'monospace',
                  fontSize: 14,
                  padding: '12px 44px',
                  cursor: 'pointer',
                  transition: 'background 0.2s, border-color 0.2s',
                  letterSpacing: 2,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(68,136,170,0.25)';
                  e.currentTarget.style.borderColor = '#5599bb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(68,136,170,0.12)';
                  e.currentTarget.style.borderColor = '#4488aa';
                }}
              >
                {t('cinematic.start_game')}
              </button>
            </div>
          )}

          {/* Status line */}
          {statusVisible && !subtitlesDone && (
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
              {t('cinematic.syncing')}
            </div>
          )}
        </div>
      )}

      {/* Warp star-trail overlay */}
      <WarpOverlay active={warpActive} />

      {/* Onboarding slides (Stage 3) — over home planet */}
      <OnboardingSlides
        visible={slidesVisible}
        system={system}
        planet={planet}
        onComplete={handleSlidesComplete}
        onVideoPlayingChange={onVideoPlayingChange}
      />
    </>
  );
}
