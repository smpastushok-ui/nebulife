import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { StarSystem, Planet } from '@nebulife/core';
import type { GameEngine } from '../../game/GameEngine.js';
import { playSfx, playLoop, stopLoop, setLoopVolume } from '../../audio/SfxPlayer.js';
// All tiers now share one onboarding path: subtitles + videos play with
// the Star Group (galaxy) view behind them, slides end on the galaxy.
// Previously only low/mid skipped the PlanetGlobeView exosphere; now it's
// universal per owner request ("у завантаженні гри і до початку туторіалу
// треба замінити на всіх тірах замість екзосфери планети — зоряну групу").

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
// WarpOverlay — lightweight CSS fade replacing the former particle canvas.
// The canvas-based warp hung mid/low-end tablets (heavy fill-rate + RAF +
// simultaneous Three.js universe render). We now just fade to deep-space
// black for the transition — same timing, zero GPU cost.
// ---------------------------------------------------------------------------
function WarpOverlay({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10002,
        pointerEvents: 'none',
        background: '#020510',
        opacity: 1,
        animation: 'cin-warp-fade 2200ms ease-in-out forwards',
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
//   - Downloads the WHOLE file as a blob before touching <video>. On slow
//     wifi `canplaythrough` was lying — the browser "estimated" it could
//     play through but kept stuttering. Blob guarantees 100 % of the bytes
//     are local before playback starts, so decoding never waits for the
//     network. This is the only reliable way to prevent stutter on Simple
//     tier tablets.
//   - Uses a module-level cache (VIDEO_BLOB_CACHE) so the warm-up fetch in
//     CinematicIntro populates the same entry the slide reads from. First
//     slide mount typically sees an already-resolved promise (cache hit).
//   - Fallback: if network fails entirely, after STALL_TIMEOUT_MS we fall
//     back to streaming the original URL. Better a stuttery playback than
//     a permanently-stuck "loading" overlay.
//   - On `ended`: 1-second brightness fade-to-black, video stays in DOM as
//     a dark background.
//   - Notifies parent via onPlayingChange so global ambient can mute.
// ---------------------------------------------------------------------------
const STALL_TIMEOUT_MS = 30_000;

/** Shared cache so warm-up fetch in CinematicIntro and the video slide
 *  read the same Blob. Values are Promises so concurrent requesters get
 *  the same in-flight fetch rather than starting duplicate downloads. */
const VIDEO_BLOB_CACHE: Record<string, Promise<Blob> | Blob> = {};

/** Kick off a full download of the video file. Safe to call multiple times
 *  — second call reuses the first's Promise. Exported for the warm-up hook
 *  in CinematicIntro's useEffect. */
function preloadVideoBlob(url: string): Promise<Blob> {
  const existing = VIDEO_BLOB_CACHE[url];
  if (existing) return existing instanceof Blob ? Promise.resolve(existing) : existing;
  const p = fetch(url, { credentials: 'same-origin' })
    .then((r) => {
      if (!r.ok) throw new Error(`fetch ${url}: ${r.status}`);
      return r.blob();
    })
    .then((blob) => {
      VIDEO_BLOB_CACHE[url] = blob;
      return blob;
    })
    .catch((err) => {
      // Don't cache failures — next access will retry
      delete VIDEO_BLOB_CACHE[url];
      throw err;
    });
  VIDEO_BLOB_CACHE[url] = p;
  return p;
}

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
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const onPlayingChangeRef = useRef(onPlayingChange);
  onPlayingChangeRef.current = onPlayingChange;

  // 1. Download the whole file as a blob, then expose it via objectURL.
  //    This effect runs once per `src`; blob → URL → <video src={url}>.
  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    let stallTimer: ReturnType<typeof setTimeout> | null = null;

    // Safety net: if the blob fetch stalls for STALL_TIMEOUT_MS (very slow
    // wifi, offline, etc.) fall back to streaming the original URL. A
    // stuttery playback is better UX than being stuck on "loading" forever.
    stallTimer = setTimeout(() => {
      if (cancelled) return;
      if (!resolvedSrc) {
        // eslint-disable-next-line no-console
        console.warn(`[CinematicVideo] blob download timed out, streaming ${src} directly`);
        setResolvedSrc(src);
      }
    }, STALL_TIMEOUT_MS);

    preloadVideoBlob(src)
      .then((blob) => {
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setResolvedSrc(createdUrl);
      })
      .catch(() => {
        if (cancelled) return;
        // Same fallback as the timeout — try the original URL.
        setResolvedSrc(src);
      });

    return () => {
      cancelled = true;
      if (stallTimer) clearTimeout(stallTimer);
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [src]);

  // 2. Once <video> has the blob-backed src, attach play/ended listeners.
  //    With a local blob, `canplaythrough` fires immediately — there's no
  //    more network waiting game. We still wait for it before fading the
  //    frame in, to avoid a visual flash of a half-decoded first frame.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !resolvedSrc) return;

    let unlocked = false;
    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      setLoaded(true);
      v.play().catch(() => { /* autoplay policy — user will click through */ });
    };

    const handleCanPlayThrough = () => unlock();
    const handleCanPlay = () => { if (v.readyState >= 4) unlock(); };
    const handlePlay = () => onPlayingChangeRef.current?.(true);
    const handleEnded = () => {
      onPlayingChangeRef.current?.(false);
      setEnded(true);
    };
    const handlePause = () => onPlayingChangeRef.current?.(false);

    v.addEventListener('canplaythrough', handleCanPlayThrough);
    v.addEventListener('canplay', handleCanPlay);
    v.addEventListener('play', handlePlay);
    v.addEventListener('ended', handleEnded);
    v.addEventListener('pause', handlePause);

    // Blob is already 100 % local — readyState will usually be >= 3 by now.
    // Call the handler once synchronously in case the event already fired.
    if (v.readyState >= 3) unlock();

    return () => {
      v.removeEventListener('canplaythrough', handleCanPlayThrough);
      v.removeEventListener('canplay', handleCanPlay);
      v.removeEventListener('play', handlePlay);
      v.removeEventListener('ended', handleEnded);
      v.removeEventListener('pause', handlePause);
      onPlayingChangeRef.current?.(false);
    };
  }, [resolvedSrc]);

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
        // resolvedSrc is the blob URL once download finishes; until then
        // the <video> stays src-less and the loading overlay covers the
        // area. After fallback timeout we fall back to streaming `src`.
        src={resolvedSrc ?? undefined}
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
  // Debounce flag — prevents ghost/double clicks during scene transitions on
  // low-end Androids where React event loop is blocked by video decode.
  const [busy, setBusy] = useState(false);

  // Start terminal loop on first mount — it will be audible only when slide >= 1
  // Starting on mount (in a click gesture context from "Start" button) ensures
  // autoplay is allowed. Volume is set to 0 initially and raised when slide changes.
  useEffect(() => {
    playLoop('terminal-loop', 0);
    return () => stopLoop('terminal-loop');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (slide === 0) {
      // App.tsx already plays 'before-trailers' as a loop during onboarding.
      // Do NOT call playSfx('before-trailers') here — it would create a duplicate.
      stopLoop('terminal-loop'); // ensure terminal-loop is silent on the video slide
      setLoopVolume('terminal-loop', 0); // mute during video
    } else {
      setLoopVolume('terminal-loop', 0.3); // unmute on slides 1, 2, 3
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
    if (busy) return;
    if (slide < 3) {
      setBusy(true);
      setSlide((s) => (s + 1) as OnboardingSlide);
      setTypewriterDone(false);
      // 600 ms lockout absorbs stray taps that queued up while the main
      // thread was blocked (video decode, scene swap, React re-render).
      setTimeout(() => setBusy(false), 600);
    }
  };

  const handleFinish = () => {
    if (busy) return;
    setBusy(true);
    setFadeOut(true);
    setTimeout(onComplete, 600);
  };

  if (!visible) return null;

  // Semi-transparent panel so the Star Group (galaxy) view behind the
  // slides stays faintly visible — adds depth to the subtitles without
  // distracting. Galaxy is rendered for all tiers now; no tier split.
  const slidesBg = 'rgba(2,5,16,0.75)';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10005,
      background: slidesBg,
      fontFamily: 'monospace',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '54px 0 116px',
      boxSizing: 'border-box',
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
        maxHeight: 'calc(100vh - 170px)',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        boxSizing: 'border-box',
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
            disabled={busy}
            style={{
              background: 'rgba(30,60,80,0.6)', border: '1px solid #446688', borderRadius: 3,
              color: '#aabbcc', fontFamily: 'monospace', fontSize: 12,
              padding: '10px 32px', minHeight: 44,
              cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.45 : 1,
              transition: 'background 0.2s, border-color 0.2s, opacity 0.2s',
            }}
            onMouseEnter={(e) => { if (busy) return; e.currentTarget.style.background = 'rgba(40,80,110,0.7)'; e.currentTarget.style.borderColor = '#558899'; }}
            onMouseLeave={(e) => { if (busy) return; e.currentTarget.style.background = 'rgba(30,60,80,0.6)'; e.currentTarget.style.borderColor = '#446688'; }}
          >
            {t('cinematic.next')}
          </button>
        )}
        {slide === 3 && (
          <button
            onClick={handleFinish}
            disabled={busy}
            style={{
              background: 'rgba(34,170,68,0.2)', border: '1px solid #44ff88', borderRadius: 3,
              color: '#44ff88', fontFamily: 'monospace', fontSize: 13,
              padding: '12px 40px', minHeight: 44,
              cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.45 : 1,
              transition: 'background 0.2s, opacity 0.2s',
            }}
            onMouseEnter={(e) => { if (busy) return; e.currentTarget.style.background = 'rgba(34,170,68,0.35)'; }}
            onMouseLeave={(e) => { if (busy) return; e.currentTarget.style.background = 'rgba(34,170,68,0.2)'; }}
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

  // ── Video blob warm-up ────────────────────────────────────────────────
  // Kick off a full download of both onboarding videos the moment the
  // intro mounts, while the user is still reading subtitles (≈4–6 s).
  // `preloadVideoBlob()` populates a module-level cache keyed by URL;
  // CinematicVideoSlide reads from the same cache so by the time slide 0
  // renders the blob is usually already there (cache hit, zero network).
  // No AbortController needed — the fetch is fire-and-forget and the
  // module-level cache survives CinematicIntro unmount anyway.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof fetch !== 'function') return;
    preloadVideoBlob('/videos/catastrophe.mp4').catch(() => { /* retry on demand */ });
    preloadVideoBlob('/videos/briefing.mp4').catch(() => { /* retry on demand */ });
  }, []);

  // ── Stage 0: Show Universe scene (Three.js) ──
  useEffect(() => {
    onRequestUniverseScene();
  }, []); // mount only

  // ── Stage 0 → 1 → 2: After player clicks "Почати гру" → fade → home → slides ──
  // Former 7s particle-warp replaced by 2.2s CSS fade (killed mid/low-tier tablets).
  useEffect(() => {
    if (!startClicked || stageRef.current !== 0) return;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Brief pause after button click
    timers.push(setTimeout(() => {
      if (!mountedRef.current) return;
      setStage(1);
      setWarpActive(true);
      setStatusVisible(false);

      // At ~1.1s (mid-fade): swap background to Star Group (galaxy).
      // Unified across all tiers per owner request:
      // "у завантаженні гри на початку і до початку туторіалу треба
      // замінити на всіх тірах замість екзосфери планети — зоряну групу".
      // Before tutorial, player sees the star-cluster they're about to
      // explore, not a dead home planet that will be destroyed anyway.
      // onLeaveUniverseToGalaxy already sets scene='galaxy'; no extra
      // onRequestHomeScene needed.
      timers.push(setTimeout(() => {
        if (!mountedRef.current) return;
        onLeaveUniverseToGalaxy();
      }, 1100));

      // At ~2.2s: fade complete, home planet visible
      timers.push(setTimeout(() => {
        if (!mountedRef.current) return;
        setWarpActive(false);
        setStage(2);

        // After brief pause show onboarding slides
        timers.push(setTimeout(() => {
          if (!mountedRef.current) return;
          setStage(3);
          setSlidesVisible(true);
        }, 800));
      }, 2200));
    }, 300));

    return () => timers.forEach(clearTimeout);
  }, [startClicked]);

  // ── Stage 3 → 4: Slides completed ──
  const handleSlidesComplete = useCallback(() => {
    setSlidesVisible(false);
    setStage(4);
    // Land ALL tiers on the Star Group (galaxy) view — exosphere home
    // planet is not rendered during intro on any tier now. The tutorial
    // starts from Galaxy anyway, so there's no point staging the player
    // on a lifeless home planet first.
    onRequestGalaxyScene();
    onComplete();
  }, [onComplete, onRequestGalaxyScene]);

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
        @keyframes cin-warp-fade {
          0%   { opacity: 0; }
          30%  { opacity: 1; }
          70%  { opacity: 1; }
          100% { opacity: 0; }
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
