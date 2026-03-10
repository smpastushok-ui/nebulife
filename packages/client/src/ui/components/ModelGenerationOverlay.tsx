import React, { useState, useEffect, useCallback } from 'react';
import { startPaymentFlow } from '../../api/payment-api';
import { checkModelStatus, pollModelUntilComplete } from '../../api/tripo-api';
import type { ModelStatusResponse } from '../../api/tripo-api';
import Planet3DViewer from './Planet3DViewer';

// ---------------------------------------------------------------------------
// ModelGenerationOverlay — Fullscreen pipeline: payment → photo → 3D → view
// ---------------------------------------------------------------------------

type Phase = 'payment' | 'processing_payment' | 'generating_photo' | 'generating_3d' | 'ready' | 'error';

interface ModelGenerationOverlayProps {
  playerId: string;
  planetId: string;
  systemId: string;
  planetName: string;
  starColor?: string;
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
      const result = await startPaymentFlow({ playerId, planetId, systemId });
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
      setErrorMsg(err instanceof Error ? err.message : 'Помилка генерації');
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
    <div style={styles.overlay}>
      <div style={styles.header}>
        <button style={styles.closeButton} onClick={onClose}>
          ✕
        </button>
        <div style={styles.headerTitle}>3D Модель — {planetName}</div>
      </div>

      <div style={styles.content}>
        {/* Payment phase */}
        {phase === 'payment' && (
          <div style={styles.phaseContainer}>
            <div style={styles.phaseIcon}>🪐</div>
            <div style={styles.phaseTitle}>Оживити планету в 3D</div>
            <div style={styles.phaseDesc}>
              Ваша планета буде перетворена в повноцінну 3D модель, яку можна обертати та розглядати з усіх боків.
            </div>

            <div style={styles.pipelineSteps}>
              <div style={styles.step}>
                <span style={styles.stepNum}>1</span>
                <span>AI генерує фотореалістичне зображення</span>
              </div>
              <div style={styles.step}>
                <span style={styles.stepNum}>2</span>
                <span>Tripo3D перетворює в 3D модель</span>
              </div>
              <div style={styles.step}>
                <span style={styles.stepNum}>3</span>
                <span>Three.js рендерить прямо в грі</span>
              </div>
            </div>

            <button style={styles.payButton} onClick={handleStartPayment}>
              <span>Купити за 49 ⚛</span>
            </button>
            <div style={styles.payNote}>Час генерації: ~3-5 хвилин</div>
          </div>
        )}

        {/* Processing payment */}
        {phase === 'processing_payment' && (
          <div style={styles.phaseContainer}>
            <div style={styles.spinnerLarge} />
            <div style={styles.phaseTitle}>
              {isMonobankPayment ? 'Очікування оплати' : 'Обробка платежу...'}
            </div>
            <div style={styles.phaseDesc}>
              {isMonobankPayment
                ? 'Завершіть оплату у відкритому вікні Monobank. Після підтвердження генерація почнеться автоматично.'
                : 'Списуємо з внутрішнього рахунку...'}
            </div>
          </div>
        )}

        {/* Generating photo */}
        {phase === 'generating_photo' && (
          <div style={styles.phaseContainer}>
            <div style={styles.phaseIcon}>📸</div>
            <div style={styles.phaseTitle}>Генерація зображення</div>
            <div style={styles.phaseDesc}>
              AI створює фотореалістичне зображення вашої планети...
            </div>
            <div style={styles.progressBarBg}>
              <div style={{ ...styles.progressBarFill, width: '30%' }} />
            </div>
            <div style={styles.phaseHint}>Це займає ~30-60 секунд</div>
          </div>
        )}

        {/* Generating 3D */}
        {phase === 'generating_3d' && (
          <div style={styles.phaseContainer}>
            <div style={styles.phaseIcon}>🔮</div>
            <div style={styles.phaseTitle}>Створення 3D моделі</div>
            <div style={styles.phaseDesc}>
              Tripo3D перетворює зображення в 3D модель...
            </div>
            <div style={styles.progressBarBg}>
              <div
                style={{
                  ...styles.progressBarFill,
                  width: `${Math.max(progress, 10)}%`,
                }}
              />
            </div>
            <div style={styles.progressText}>{progress > 0 ? `${progress}%` : 'Обробка...'}</div>
            <div style={styles.phaseHint}>Це займає ~2-4 хвилини</div>
          </div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <div style={styles.phaseContainer}>
            <div style={styles.phaseIcon}>⚠️</div>
            <div style={styles.phaseTitle}>Помилка</div>
            <div style={styles.errorText}>{errorMsg}</div>
            <button style={styles.retryButton} onClick={() => {
              if (modelId) {
                setPhase('processing_payment');
                setErrorMsg(null);
                pollForCompletion(modelId);
              } else {
                setPhase('payment');
                setErrorMsg(null);
              }
            }}>
              Спробувати знову
            </button>
          </div>
        )}
      </div>
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
    zIndex: 10000,
    background: 'radial-gradient(ellipse at center, #0d1b2a 0%, #000 100%)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    paddingTop: 'max(16px, env(safe-area-inset-top))',
    gap: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: 16,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: '0.3px',
  },
  content: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  phaseContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    maxWidth: 340,
    textAlign: 'center' as const,
  },
  phaseIcon: {
    fontSize: 56,
    marginBottom: 8,
  },
  phaseTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '0.3px',
  },
  phaseDesc: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: '1.5',
  },
  pipelineSteps: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    margin: '16px 0',
    width: '100%',
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textAlign: 'left' as const,
  },
  stepNum: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'rgba(123, 184, 255, 0.15)',
    color: '#7bb8ff',
    fontSize: 13,
    fontWeight: 600,
    flexShrink: 0,
  },
  payButton: {
    marginTop: 8,
    padding: '14px 40px',
    borderRadius: 14,
    border: 'none',
    background: 'linear-gradient(135deg, #4488ff, #7bb8ff)',
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.3px',
    boxShadow: '0 4px 20px rgba(68, 136, 255, 0.3)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  payNote: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 4,
  },
  spinnerLarge: {
    width: 48,
    height: 48,
    border: '3px solid rgba(255,255,255,0.1)',
    borderTopColor: '#7bb8ff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    background: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #4488ff, #7bb8ff)',
    borderRadius: 3,
    transition: 'width 0.5s ease',
  },
  progressText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  phaseHint: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    lineHeight: '1.4',
  },
  retryButton: {
    padding: '10px 28px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    fontSize: 14,
    cursor: 'pointer',
    marginTop: 8,
  },
};

export default ModelGenerationOverlay;
