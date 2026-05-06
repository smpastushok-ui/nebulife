import React from 'react';
import { useTranslation } from 'react-i18next';

const PARTICLES = Array.from({ length: 42 }, (_, i) => {
  const angle = (i / 42) * Math.PI * 2;
  const radius = 24 + (i % 7) * 8;
  return {
    id: i,
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius * 0.62,
    delay: (i % 11) * 0.11,
    size: 1 + (i % 5) * 0.45,
  };
});

const WEB_LINES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  rotate: i * 30,
  delay: i * 0.08,
  width: 70 + (i % 4) * 30,
}));

export function QuantumSeedLoader() {
  const { t } = useTranslation();
  const steps = [
    t('loading.quantum.step_singularity'),
    t('loading.quantum.step_inflation'),
    t('loading.quantum.step_web'),
    t('loading.quantum.step_cluster'),
  ];

  return (
    <div style={styles.overlay}>
      <style>{`
        @keyframes qslSeedPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(0.82); opacity: 0.82; filter: blur(0); }
          48% { transform: translate(-50%, -50%) scale(1.22); opacity: 1; filter: blur(0.4px); }
        }
        @keyframes qslInflationWave {
          0% { transform: translate(-50%, -50%) scale(0.06); opacity: 0; border-width: 10px; }
          18% { opacity: 0.82; }
          100% { transform: translate(-50%, -50%) scale(3.8); opacity: 0; border-width: 1px; }
        }
        @keyframes qslParticleDrift {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0; }
          26% { opacity: 0.95; }
          72% { opacity: 0.78; }
          100% { transform: translate(var(--x), var(--y)) scale(1); opacity: 0.28; }
        }
        @keyframes qslWebLine {
          0%, 22% { transform: translate(-50%, -50%) rotate(var(--r)) scaleX(0); opacity: 0; }
          46% { opacity: 0.36; }
          100% { transform: translate(-50%, -50%) rotate(var(--r)) scaleX(1); opacity: 0.12; }
        }
        @keyframes qslStarIgnite {
          0%, 58% { opacity: 0; transform: scale(0.4); }
          72% { opacity: 1; transform: scale(1.25); }
          100% { opacity: 0.7; transform: scale(1); }
        }
        @keyframes qslScan {
          0% { transform: translateY(-140px); opacity: 0; }
          18%, 72% { opacity: 0.45; }
          100% { transform: translateY(140px); opacity: 0; }
        }
        @keyframes qslTextCycle {
          0%, 6% { opacity: 0; transform: translateY(8px); }
          10%, 21% { opacity: 1; transform: translateY(0); }
          25%, 100% { opacity: 0; transform: translateY(-6px); }
        }
        @keyframes qslGridBreathe {
          0%, 100% { opacity: 0.08; transform: scale(0.98); }
          50% { opacity: 0.16; transform: scale(1.02); }
        }
      `}</style>

      <div style={styles.backdropGlow} />
      <div style={styles.grid} />

      <div style={styles.stage} aria-label={t('loading.quantum.title')}>
        <div style={styles.scanLine} />
        <div style={{ ...styles.wave, animationDelay: '0s' }} />
        <div style={{ ...styles.wave, animationDelay: '1.1s' }} />
        <div style={{ ...styles.wave, animationDelay: '2.2s' }} />

        {WEB_LINES.map((line) => (
          <div
            key={line.id}
            style={{
              ...styles.webLine,
              width: line.width,
              animationDelay: `${line.delay}s`,
              ['--r' as string]: `${line.rotate}deg`,
            }}
          />
        ))}

        {PARTICLES.map((p) => (
          <span
            key={p.id}
            style={{
              ...styles.particle,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
              ['--x' as string]: `${p.x}px`,
              ['--y' as string]: `${p.y}px`,
            }}
          />
        ))}

        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            style={{
              ...styles.ignition,
              left: `${34 + i * 8}%`,
              top: `${45 + ((i % 2) ? -10 : 9)}%`,
              animationDelay: `${1.8 + i * 0.16}s`,
            }}
          />
        ))}

        <div style={styles.seed} />
        <div style={styles.seedCore} />
      </div>

      <div style={styles.copy}>
        <div style={styles.eyebrow}>{t('loading.quantum.eyebrow')}</div>
        <div style={styles.title}>{t('loading.quantum.title')}</div>
        <div style={styles.statusStack}>
          {steps.map((step, i) => (
            <div
              key={step}
              style={{
                ...styles.status,
                animationDelay: `${i * 2}s`,
              }}
            >
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 10000,
    background: '#020510',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'monospace',
    color: '#aabbcc',
  },
  backdropGlow: {
    position: 'absolute',
    inset: '-20%',
    background: 'radial-gradient(circle at 50% 45%, rgba(68,136,170,0.18), rgba(7,14,28,0.28) 28%, rgba(2,5,16,1) 66%)',
  },
  grid: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: '50%',
    border: '1px solid rgba(68,136,170,0.08)',
    background: 'repeating-radial-gradient(circle, rgba(68,136,170,0.10) 0 1px, transparent 1px 38px)',
    animation: 'qslGridBreathe 4.2s ease-in-out infinite',
  },
  stage: {
    position: 'relative',
    width: 310,
    height: 310,
    borderRadius: '50%',
  },
  scanLine: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    top: '50%',
    height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(123,184,255,0.5), transparent)',
    animation: 'qslScan 2.6s ease-in-out infinite',
  },
  wave: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 92,
    height: 92,
    borderRadius: '50%',
    border: '2px solid rgba(123,184,255,0.36)',
    boxShadow: '0 0 36px rgba(68,136,170,0.24)',
    animation: 'qslInflationWave 3.3s cubic-bezier(0.12, 0.7, 0.22, 1) infinite',
  },
  webLine: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    height: 1,
    transformOrigin: '0 50%',
    background: 'linear-gradient(90deg, rgba(68,255,136,0), rgba(68,255,136,0.34), rgba(123,184,255,0))',
    animation: 'qslWebLine 3.8s ease-out infinite',
  },
  particle: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    borderRadius: '50%',
    background: '#dceeff',
    boxShadow: '0 0 10px rgba(123,184,255,0.65)',
    animation: 'qslParticleDrift 3.4s ease-out infinite',
  },
  ignition: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: '#ffffff',
    boxShadow: '0 0 18px rgba(123,184,255,0.9), 0 0 34px rgba(68,255,136,0.32)',
    animation: 'qslStarIgnite 3.4s ease-in-out infinite',
  },
  seed: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.96), rgba(123,184,255,0.68) 34%, rgba(68,136,170,0.08) 72%, transparent 100%)',
    boxShadow: '0 0 34px rgba(123,184,255,0.72), 0 0 72px rgba(68,136,170,0.26)',
    animation: 'qslSeedPulse 1.9s ease-in-out infinite',
  },
  seedCore: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#ffffff',
    boxShadow: '0 0 18px #ffffff',
    transform: 'translate(-50%, -50%)',
  },
  copy: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 'max(42px, env(safe-area-inset-bottom, 0px))',
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'column',
    textAlign: 'center',
    gap: 8,
    padding: '0 24px',
  },
  eyebrow: {
    color: '#446688',
    fontSize: 9,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  title: {
    color: '#c8d7e5',
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadow: '0 0 18px rgba(123,184,255,0.22)',
  },
  statusStack: {
    position: 'relative',
    height: 22,
    minWidth: 280,
    marginTop: 2,
  },
  status: {
    position: 'absolute',
    inset: 0,
    color: '#667788',
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    opacity: 0,
    animation: 'qslTextCycle 8s linear infinite',
  },
};
