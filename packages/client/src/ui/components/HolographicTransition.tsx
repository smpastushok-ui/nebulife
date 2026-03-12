import React, { useState, useEffect, useRef, useCallback } from 'react';
import Planet3DViewer from './Planet3DViewer';

// ---------------------------------------------------------------------------
// HolographicTransition — Clip-path wipe from 2D PixiJS to 3D Three.js
// ---------------------------------------------------------------------------
// Animates a horizontal laser line sweeping top-to-bottom, revealing the
// 3D model above the line while the 2D PixiJS planet remains below.
// Includes a flash effect on completion.
// ---------------------------------------------------------------------------

interface AtmosphereInfo {
  surfacePressureAtm: number;
  composition: Record<string, number>;
  hasOzone: boolean;
}

interface MoonInfo {
  compositionType: 'rocky' | 'icy' | 'metallic' | 'volcanic';
  radiusKm: number;
}

interface HolographicTransitionProps {
  glbUrl: string;
  planetName: string;
  atmosphere?: AtmosphereInfo | null;
  planetType?: string;
  planetMassEarth?: number;
  moons?: MoonInfo[];
  onComplete: () => void;
}

const ANIMATION_DELAY = 800;   // ms — wait for 3D viewer to load
const ANIMATION_DURATION = 2500; // ms — wipe animation duration
const FLASH_DURATION = 400;     // ms — flash effect duration

const HolographicTransition: React.FC<HolographicTransitionProps> = ({
  glbUrl,
  planetName,
  atmosphere,
  planetType,
  planetMassEarth,
  moons,
  onComplete,
}) => {
  const [clipPercent, setClipPercent] = useState(100); // 100 = fully hidden, 0 = fully revealed
  const [showFlash, setShowFlash] = useState(false);
  const [flashOpacity, setFlashOpacity] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const animFrameRef = useRef<number>(0);

  // Start animation once mounted
  useEffect(() => {
    // Small delay to ensure 3D viewer starts loading
    const startTimer = setTimeout(() => {
      setIsReady(true);
    }, ANIMATION_DELAY);

    return () => clearTimeout(startTimer);
  }, []);

  // Run wipe animation
  useEffect(() => {
    if (!isReady) return;

    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const t = Math.min(1, elapsed / ANIMATION_DURATION);

      // EaseInOutQuad
      const eased = t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2;

      setClipPercent(100 - eased * 100);

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Wipe complete — trigger flash
        setShowFlash(true);
        flashSequence();
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  const flashSequence = useCallback(() => {
    // Quick flash: opacity 0 → 0.6 → 0 over FLASH_DURATION
    let startTime: number | null = null;

    const animateFlash = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const t = Math.min(1, elapsed / FLASH_DURATION);

      // Triangle wave: rises to peak at 30%, then fades
      const opacity = t < 0.3
        ? (t / 0.3) * 0.5
        : 0.5 * (1 - (t - 0.3) / 0.7);

      setFlashOpacity(Math.max(0, opacity));

      if (t < 1) {
        requestAnimationFrame(animateFlash);
      } else {
        setShowFlash(false);
        onComplete();
      }
    };

    requestAnimationFrame(animateFlash);
  }, [onComplete]);

  // Laser line position: converts clipPercent to top offset
  const laserTop = `${100 - clipPercent}%`;

  return (
    <div style={styles.overlay}>
      {/* 3D viewer with clip-path — revealed from top */}
      <div
        style={{
          ...styles.clipContainer,
          clipPath: `inset(0 0 ${clipPercent}% 0)`,
        }}
      >
        <Planet3DViewer
          glbUrl={glbUrl}
          planetName={planetName}
          atmosphere={atmosphere}
          planetType={planetType}
          planetMassEarth={planetMassEarth}
          moons={moons}
          mode="background"
          onClose={() => {}}
        />
      </div>

      {/* Laser line at the clip edge */}
      {clipPercent > 0.5 && clipPercent < 99.5 && (
        <div
          style={{
            ...styles.laserLine,
            top: laserTop,
          }}
        >
          {/* Main laser beam */}
          <div style={styles.laserCore} />
          {/* Glow */}
          <div style={styles.laserGlow} />
        </div>
      )}

      {/* Flash overlay */}
      {showFlash && (
        <div
          style={{
            ...styles.flashOverlay,
            opacity: flashOpacity,
          }}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 55,
    pointerEvents: 'none',
  },
  clipContainer: {
    position: 'absolute',
    inset: 0,
    transition: 'none', // animated via requestAnimationFrame
  },
  laserLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    transform: 'translateY(-50%)',
    zIndex: 2,
    pointerEvents: 'none',
  },
  laserCore: {
    position: 'absolute',
    left: '5%',
    right: '5%',
    top: 0,
    height: 2,
    background: 'linear-gradient(90deg, transparent 0%, #44ff88 15%, #88ffcc 50%, #44ff88 85%, transparent 100%)',
    borderRadius: 1,
  },
  laserGlow: {
    position: 'absolute',
    left: '3%',
    right: '3%',
    top: -8,
    height: 18,
    background: 'linear-gradient(90deg, transparent 0%, rgba(68,255,136,0.15) 20%, rgba(136,255,204,0.25) 50%, rgba(68,255,136,0.15) 80%, transparent 100%)',
    filter: 'blur(4px)',
    borderRadius: 8,
  },
  flashOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at center, rgba(200,255,220,0.8) 0%, rgba(68,255,136,0.3) 40%, transparent 70%)',
    zIndex: 3,
    pointerEvents: 'none',
  },
};

export default HolographicTransition;
