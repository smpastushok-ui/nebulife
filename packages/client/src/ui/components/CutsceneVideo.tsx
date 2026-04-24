// ---------------------------------------------------------------------------
// CutsceneVideo - Full-screen cinematic video for evacuation cutscenes.
//
// Replaces CutscenePlaceholder with real video. Differences from the
// onboarding CinematicVideoSlide:
//   - Full-screen overlay (position fixed, z-index 10000)
//   - Auto-advance: on video ended -> 1s fade-to-black -> onComplete()
//   - Skip button to bypass the video
//   - onPlayingChange for SpaceAmbient muting
// ---------------------------------------------------------------------------
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface CutsceneVideoProps {
  src: string;
  onComplete: () => void;
  onPlayingChange?: (playing: boolean) => void;
}

export function CutsceneVideo({ src, onComplete, onPlayingChange }: CutsceneVideoProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [ended, setEnded] = useState(false);
  const onPlayingChangeRef = useRef(onPlayingChange);
  onPlayingChangeRef.current = onPlayingChange;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const completedRef = useRef(false);

  // Wire up video events.
  //
  // Evacuation phases rely on this component calling onComplete() to
  // advance. If the video fails to load/play (codec mismatch, network
  // error, missing asset), the phase would previously get stuck forever
  // and the whole evacuation sequence aborted silently (tester report:
  // "не послідувало ні анімації ні відео"). We now force-advance on:
  //   • `error` event — unrecoverable (missing file, decode error, etc.)
  //   • 25 s watchdog timeout — catches silent failures where no events fire
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const forceAdvance = (reason: string) => {
      if (completedRef.current) return;
      // eslint-disable-next-line no-console
      console.warn(`[CutsceneVideo] force-advance (${reason}) for ${src}`);
      completedRef.current = true;
      onPlayingChangeRef.current?.(false);
      onCompleteRef.current();
    };

    const handleCanPlay = () => setLoaded(true);
    const handlePlay = () => onPlayingChangeRef.current?.(true);
    const handleEnded = () => {
      onPlayingChangeRef.current?.(false);
      setEnded(true);
      // Wait for the 1s CSS fade-to-black, then auto-advance
      setTimeout(() => {
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current();
        }
      }, 1300);
    };
    const handlePause = () => onPlayingChangeRef.current?.(false);
    const handleError = () => forceAdvance('video error');

    v.addEventListener('canplay', handleCanPlay);
    v.addEventListener('loadeddata', handleCanPlay);
    v.addEventListener('play', handlePlay);
    v.addEventListener('ended', handleEnded);
    v.addEventListener('pause', handlePause);
    v.addEventListener('error', handleError);

    // Watchdog: if nothing else fires within 25 s, advance anyway. Covers
    // edge cases where the element goes silent (e.g. orientation flip on
    // Android WebView interrupting the video pipeline).
    const watchdog = setTimeout(() => forceAdvance('watchdog 25s'), 25_000);

    return () => {
      clearTimeout(watchdog);
      v.removeEventListener('canplay', handleCanPlay);
      v.removeEventListener('loadeddata', handleCanPlay);
      v.removeEventListener('play', handlePlay);
      v.removeEventListener('ended', handleEnded);
      v.removeEventListener('pause', handlePause);
      v.removeEventListener('error', handleError);
      // Ensure parent knows we are no longer playing on unmount
      onPlayingChangeRef.current?.(false);
    };
  }, [src]);

  const handleSkip = useCallback(() => {
    if (!completedRef.current) {
      completedRef.current = true;
      onPlayingChangeRef.current?.(false);
      onCompleteRef.current();
    }
  }, []);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      background: '#020510',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace',
      pointerEvents: 'auto',
    }}>
      {/* Video container - 16:9, max 720px */}
      <div style={{
        position: 'relative',
        width: '90%',
        maxWidth: 720,
        aspectRatio: '16/9',
        borderRadius: 4,
        overflow: 'hidden',
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

        {/* Loading overlay */}
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

      {/* Skip button */}
      <button
        onClick={handleSkip}
        style={{
          marginTop: 24,
          padding: '8px 24px',
          background: 'transparent',
          border: '1px solid #334455',
          borderRadius: 3,
          color: '#667788',
          fontFamily: 'monospace',
          fontSize: 11,
          cursor: 'pointer',
          letterSpacing: 1,
          transition: 'border-color 0.2s, color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#4488aa';
          e.currentTarget.style.color = '#aabbcc';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#334455';
          e.currentTarget.style.color = '#667788';
        }}
      >
        {t('common.skip')}
      </button>

      {/* Keyframe for loading dots - inject once */}
      <style>{`
        @keyframes cutsceneLoadPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

const dotStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: '#4488aa',
  animation: 'cutsceneLoadPulse 1.2s ease-in-out infinite',
};
