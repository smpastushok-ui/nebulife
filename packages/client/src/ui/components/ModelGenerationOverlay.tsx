import React, { useState, useEffect, useCallback } from 'react';
import type { Planet, Star } from '@nebulife/core';
import { startPaymentFlow } from '../../api/payment-api';
import { checkModelStatus, pollModelUntilComplete } from '../../api/tripo-api';
import type { ModelStatusResponse } from '../../api/tripo-api';
import Planet3DViewer from './Planet3DViewer';

// ---------------------------------------------------------------------------
// ModelGenerationOverlay — Sci-Fi Terminal: payment → photo → 3D → view
// ---------------------------------------------------------------------------

type Phase = 'payment' | 'processing_payment' | 'generating_photo' | 'generating_3d' | 'ready' | 'error';

interface ModelGenerationOverlayProps {
  playerId: string;
  planetId: string;
  systemId: string;
  planetName: string;
  starColor?: string;
  planet?: Planet;
  star?: Star;
  existingModelId?: string; // Resume tracking existing generation
  onClose: () => void;
  onModelReady?: (modelId: string, glbUrl: string) => void;
  onQuarksChanged?: () => void; // Notify parent to refresh quarks balance
}

const ModelGenerationOverlay: React.FC<ModelGenerationOverlayProps> = ({
  playerId,
  planetId,
  systemId,
  planetName,
  starColor,
  planet,
  star,
  existingModelId,
  onClose,
  onModelReady,
  onQuarksChanged,
}) => {
  const [phase, setPhase] = useState<Phase>(existingModelId ? 'processing_payment' : 'payment');
  const [modelId, setModelId] = useState<string | null>(existingModelId ?? null);
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMonobankPayment, setIsMonobankPayment] = useState(false);
  const [btnHover, setBtnHover] = useState(false);

  // If we have an existing model, start polling immediately
  useEffect(() => {
    if (existingModelId) {
      pollForCompletion(existingModelId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingModelId]);

  const handleStartPayment = useCallback(async () => {
    try {
      setPhase('processing_payment');
      const result = await startPaymentFlow({
        playerId,
        planetId,
        systemId,
        planetData: planet,
        starData: star,
      });
      setModelId(result.modelId);

      if (result.paidWithQuarks) {
        // Paid instantly with quarks — skip payment wait, go to generation
        onQuarksChanged?.();
        setPhase('generating_photo');
      } else {
        // Monobank payment — show waiting screen with Monobank instructions
        setIsMonobankPayment(true);
      }

      // Start polling for generation completion
      pollForCompletion(result.modelId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Помилка оплати');
      setPhase('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, planetId, systemId, onQuarksChanged]);

  const pollForCompletion = useCallback(async (id: string) => {
    try {
      const result = await pollModelUntilComplete(id, (status: ModelStatusResponse) => {
        if (status.status === 'generating_photo') {
          setPhase('generating_photo');
          setProgress(0);
        } else if (status.status === 'generating_3d' || status.status === 'running') {
          setPhase('generating_3d');
          setProgress(status.progress ?? 0);
        } else if (status.status === 'awaiting_payment') {
          setPhase('processing_payment');
        }
      });

      setGlbUrl(result.glbUrl);
      setPhase('ready');
      onModelReady?.(id, result.glbUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Збій матеріалізації');
      setPhase('error');
    }
  }, [onModelReady]);

  // If ready and we have GLB URL — render 3D viewer directly
  if (phase === 'ready' && glbUrl) {
    return (
      <Planet3DViewer
        glbUrl={glbUrl}
        planetName={planetName}
        starColor={starColor}
        onClose={onClose}
      />
    );
  }

  return (
    <div style={s.backdrop}>
      <div style={s.modal}>
        {/* Close button */}
        <button
          style={s.closeBtn}
          onClick={onClose}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#aabbcc';
            e.currentTarget.style.borderColor = '#667788';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#556677';
            e.currentTarget.style.borderColor = 'rgba(51, 68, 85, 0.4)';
          }}
        >
          X
        </button>

        {/* Payment phase — Sci-Fi Terminal */}
        {phase === 'payment' && (
          <>
            {/* Planet wireframe hologram */}
            <div style={s.hologramContainer}>
              <WireframePlanet />
            </div>

            {/* Title */}
            <div style={s.title}>
              КВАНТОВИЙ СИНТЕЗ ПОВЕРХНI
            </div>

            {/* Planet name */}
            <div style={s.planetLabel}>
              {planetName}
            </div>

            {/* Description */}
            <div style={s.desc}>
              Запит на використання обчислювальних потужностей
              матрицi корабля для квантового синтезу топографiчної
              моделi планетарного об'єкту.
            </div>

            {/* Terminal operations log */}
            <div style={s.opsBlock}>
              <div style={s.opsHeader}>ЗАПЛАНОВАНІ ОПЕРАЦІЇ</div>
              <TerminalLine status="required" text="Глибинне сканування лiтосфери" />
              <TerminalLine status="required" text="Аналiз атмосферного складу" />
              <TerminalLine status="required" text="Голографiчна матерiалiзацiя 3D-структури" />
              <TerminalLine status="required" text="Iнтеграцiя моделi в навiгацiйну базу" />
            </div>

            {/* Estimated time */}
            <div style={s.estimate}>
              Орієнтовний час синтезу: ~3-5 хвилин
            </div>

            {/* Action button */}
            <button
              style={{
                ...s.actionBtn,
                borderColor: btnHover ? '#44ff88' : 'rgba(68, 255, 136, 0.35)',
                background: btnHover
                  ? 'rgba(68, 255, 136, 0.12)'
                  : 'rgba(68, 255, 136, 0.05)',
                color: btnHover ? '#66ffaa' : '#44ff88',
              }}
              onClick={handleStartPayment}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
            >
              IНIЦIЮВАТИ СИНТЕЗ — 49{' '}
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                strokeWidth="1.4" strokeLinecap="round" style={{ verticalAlign: 'middle' }}>
                <circle cx="8" cy="8" r="2" />
                <ellipse cx="8" cy="8" rx="7" ry="3" />
                <ellipse cx="8" cy="8" rx="3" ry="7" />
              </svg>
            </button>
          </>
        )}

        {/* Processing payment */}
        {phase === 'processing_payment' && (
          <div style={s.phaseBlock}>
            <div style={s.spinnerWrap}>
              <div style={s.spinner} />
            </div>
            <div style={s.phaseTitle}>
              {isMonobankPayment ? 'ОЧІКУВАННЯ ОПЛАТИ' : 'ОБРОБКА ПЛАТЕЖУ'}
            </div>
            <div style={s.phaseDesc}>
              {isMonobankPayment
                ? 'Завершiть оплату у вiдкритому вiкнi Monobank. Пiсля пiдтвердження синтез почнеться автоматично.'
                : 'Списуємо з внутрiшнього рахунку...'}
            </div>
          </div>
        )}

        {/* Generating photo */}
        {phase === 'generating_photo' && (
          <div style={s.phaseBlock}>
            <div style={s.hologramContainer}>
              <WireframePlanet />
            </div>
            <div style={s.phaseTitle}>КВАНТОВЕ СКАНУВАННЯ</div>
            <div style={s.phaseDesc}>
              Зонд аналiзує поверхню та атмосферу планети...
            </div>
            <div style={s.progressBg}>
              <div style={{ ...s.progressFill, width: '30%' }} />
            </div>
            <div style={s.phaseHint}>~30-60 секунд</div>
          </div>
        )}

        {/* Generating 3D */}
        {phase === 'generating_3d' && (
          <div style={s.phaseBlock}>
            <div style={s.hologramContainer}>
              <WireframePlanet />
            </div>
            <div style={s.phaseTitle}>ГОЛОГРАФIЧНА МАТЕРIАЛIЗАЦIЯ</div>
            <div style={s.phaseDesc}>
              Реконструкцiя тривимiрної структури планети...
            </div>
            <div style={s.progressBg}>
              <div
                style={{
                  ...s.progressFill,
                  width: `${Math.max(progress, 10)}%`,
                }}
              />
            </div>
            <div style={s.progressText}>{progress > 0 ? `${progress}%` : 'Обробка...'}</div>
            <div style={s.phaseHint}>~2-4 хвилини</div>
          </div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <div style={s.phaseBlock}>
            <div style={{ ...s.phaseTitle, color: '#cc4444' }}>ПОМИЛКА</div>
            <div style={s.errorText}>{errorMsg}</div>
            <button
              style={s.retryBtn}
              onClick={() => {
                if (modelId) {
                  setPhase('processing_payment');
                  setErrorMsg(null);
                  pollForCompletion(modelId);
                } else {
                  setPhase('payment');
                  setErrorMsg(null);
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#667788';
                e.currentTarget.style.color = '#aabbcc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(51, 68, 85, 0.4)';
                e.currentTarget.style.color = '#8899aa';
              }}
            >
              Спробувати знову
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Wireframe planet SVG — holographic globe
// ---------------------------------------------------------------------------

function WireframePlanet() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none"
      style={{ animation: 'mgo-rotate 12s linear infinite' }}>
      {/* Equator and latitude lines */}
      <ellipse cx="40" cy="40" rx="34" ry="34" stroke="#4488aa" strokeWidth="0.6" opacity="0.3" />
      <ellipse cx="40" cy="40" rx="34" ry="12" stroke="#4488aa" strokeWidth="0.5" opacity="0.5" />
      <ellipse cx="40" cy="30" rx="28" ry="8" stroke="#4488aa" strokeWidth="0.4" opacity="0.3" />
      <ellipse cx="40" cy="50" rx="28" ry="8" stroke="#4488aa" strokeWidth="0.4" opacity="0.3" />
      <ellipse cx="40" cy="22" rx="18" ry="4" stroke="#4488aa" strokeWidth="0.3" opacity="0.2" />
      <ellipse cx="40" cy="58" rx="18" ry="4" stroke="#4488aa" strokeWidth="0.3" opacity="0.2" />
      {/* Longitude lines */}
      <ellipse cx="40" cy="40" rx="12" ry="34" stroke="#4488aa" strokeWidth="0.5" opacity="0.4" />
      <ellipse cx="40" cy="40" rx="26" ry="34" stroke="#4488aa" strokeWidth="0.4" opacity="0.3" />
      <ellipse cx="40" cy="40" rx="34" ry="34" stroke="#4488aa" strokeWidth="0.5" opacity="0.2"
        transform="rotate(60 40 40)" />
      <ellipse cx="40" cy="40" rx="34" ry="34" stroke="#4488aa" strokeWidth="0.5" opacity="0.2"
        transform="rotate(-60 40 40)" />
      {/* Center glow dot */}
      <circle cx="40" cy="40" r="2" fill="#4488aa" opacity="0.6" />
      {/* Outer glow ring */}
      <circle cx="40" cy="40" r="36" stroke="#4488aa" strokeWidth="0.3" opacity="0.15" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Terminal operation line
// ---------------------------------------------------------------------------

function TerminalLine({ status, text }: { status: 'required' | 'done' | 'active'; text: string }) {
  const tagColor = status === 'done' ? '#44ff88' : status === 'active' ? '#4488aa' : '#556677';
  const tag = status === 'done' ? 'ГОТОВО' : status === 'active' ? 'В ПРОЦЕСI' : 'ПОТРIБНО';
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      padding: '3px 0',
      fontFamily: 'monospace',
      fontSize: 10,
    }}>
      <span style={{
        color: tagColor,
        flexShrink: 0,
        minWidth: 72,
      }}>
        [ {tag} ]
      </span>
      <span style={{ color: '#667788' }}>{text}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inject keyframes
// ---------------------------------------------------------------------------

const KEYFRAMES_ID = 'mgo-keyframes';

if (typeof document !== 'undefined' && !document.getElementById(KEYFRAMES_ID)) {
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
@keyframes mgo-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes mgo-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 10000,
    background: 'rgba(2, 5, 16, 0.85)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'monospace',
  },
  modal: {
    position: 'relative',
    width: '90%',
    maxWidth: 420,
    background: 'rgba(10, 15, 25, 0.95)',
    border: '1px solid rgba(51, 68, 85, 0.5)',
    borderRadius: 6,
    padding: '28px 24px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    boxShadow: '0 8px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(68, 136, 170, 0.1)',
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    background: 'none',
    border: '1px solid rgba(51, 68, 85, 0.4)',
    borderRadius: 3,
    color: '#556677',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: '3px 7px',
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s',
  },
  hologramContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 0',
  },
  title: {
    fontSize: 13,
    color: '#aabbcc',
    letterSpacing: 2,
    textAlign: 'center',
  },
  planetLabel: {
    fontSize: 15,
    color: '#ccddee',
    letterSpacing: 1,
    marginTop: -4,
  },
  desc: {
    fontSize: 10,
    color: '#556677',
    lineHeight: '1.5',
    textAlign: 'center',
    maxWidth: 340,
  },
  opsBlock: {
    width: '100%',
    background: 'rgba(2, 5, 12, 0.6)',
    border: '1px solid rgba(51, 68, 85, 0.2)',
    borderRadius: 4,
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  opsHeader: {
    fontSize: 9,
    color: '#445566',
    letterSpacing: 1.5,
    marginBottom: 4,
    borderBottom: '1px solid rgba(51, 68, 85, 0.15)',
    paddingBottom: 6,
  },
  estimate: {
    fontSize: 10,
    color: '#445566',
  },
  actionBtn: {
    padding: '10px 24px',
    border: '1px solid rgba(68, 255, 136, 0.35)',
    borderRadius: 3,
    background: 'rgba(68, 255, 136, 0.05)',
    color: '#44ff88',
    fontFamily: 'monospace',
    fontSize: 12,
    letterSpacing: 1,
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  phaseBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    textAlign: 'center',
  },
  phaseTitle: {
    fontSize: 13,
    color: '#aabbcc',
    letterSpacing: 1.5,
  },
  phaseDesc: {
    fontSize: 11,
    color: '#667788',
    lineHeight: '1.5',
    maxWidth: 320,
  },
  phaseHint: {
    fontSize: 10,
    color: '#445566',
  },
  spinnerWrap: {
    padding: '12px 0',
  },
  spinner: {
    width: 36,
    height: 36,
    border: '2px solid rgba(68, 136, 170, 0.15)',
    borderTopColor: '#4488aa',
    borderRadius: '50%',
    animation: 'mgo-spin 1s linear infinite',
  },
  progressBg: {
    width: '80%',
    height: 4,
    background: 'rgba(51, 68, 85, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #4488aa, #7bb8ff)',
    borderRadius: 2,
    transition: 'width 0.5s ease',
  },
  progressText: {
    fontSize: 11,
    color: '#667788',
  },
  errorText: {
    fontSize: 11,
    color: '#cc4444',
    lineHeight: '1.4',
    maxWidth: 300,
  },
  retryBtn: {
    padding: '7px 20px',
    border: '1px solid rgba(51, 68, 85, 0.4)',
    borderRadius: 3,
    background: 'none',
    color: '#8899aa',
    fontFamily: 'monospace',
    fontSize: 11,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
};

export default ModelGenerationOverlay;
