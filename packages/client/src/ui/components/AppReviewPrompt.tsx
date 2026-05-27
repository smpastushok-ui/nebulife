import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { playSfx } from '../../audio/SfxPlayer.js';
import { sendAppFeedback } from '../../api/app-feedback-api.js';

type ReviewMode = 'choice' | 'feedback' | 'thanks';

interface AppReviewPromptProps {
  onClose: () => void;
}

function getStoreReviewUrl(): string {
  if (Capacitor.getPlatform() === 'ios') {
    return import.meta.env.VITE_APP_STORE_REVIEW_URL || 'https://nebulife.space';
  }
  return 'market://details?id=app.nebulife.game';
}

function getStoreWebUrl(): string {
  if (Capacitor.getPlatform() === 'ios') {
    return import.meta.env.VITE_APP_STORE_REVIEW_URL || 'https://nebulife.space';
  }
  return 'https://play.google.com/store/apps/details?id=app.nebulife.game';
}

export function AppReviewPrompt({ onClose }: AppReviewPromptProps) {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<ReviewMode>('choice');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = feedback.trim().length >= 5 && !submitting;
  const platformLabel = useMemo(
    () => (Capacitor.getPlatform() === 'ios' ? t('review_prompt.app_store') : t('review_prompt.google_play')),
    [t],
  );

  const close = () => {
    playSfx('ui-click', 0.04);
    onClose();
  };

  const openStoreReview = () => {
    playSfx('ui-click', 0.05);
    try {
      window.open(getStoreReviewUrl(), '_blank', 'noopener,noreferrer');
    } catch {
      window.location.href = getStoreWebUrl();
    }
    onClose();
  };

  const submitFeedback = async () => {
    if (!canSubmit) return;
    playSfx('ui-click', 0.05);
    setSubmitting(true);
    setError(null);
    try {
      await sendAppFeedback({
        message: feedback.trim(),
        context: 'colony_surface_lesson',
        language: i18n.language.startsWith('uk') ? 'uk' : 'en',
      });
      setMode('thanks');
    } catch {
      setError(t('review_prompt.feedback_error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.backdrop}>
      <style>{`
        @keyframes reviewPanelEnter {
          from { opacity: 0; transform: translateY(14px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes reviewSignalPulse {
          0%, 100% { opacity: 0.45; transform: scaleX(0.72); }
          50% { opacity: 1; transform: scaleX(1); }
        }
        .review-btn {
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          padding: 10px 14px;
          cursor: pointer;
          transition: all 0.16s ease;
          outline: none;
        }
        .review-btn:hover { transform: translateY(-1px); }
        .review-btn:active { transform: translateY(1px); }
        .review-btn-primary {
          background: rgba(68, 255, 136, 0.11);
          border: 1px solid rgba(68, 255, 136, 0.45);
          color: #bbf9d4;
        }
        .review-btn-primary:hover {
          background: rgba(68, 255, 136, 0.17);
          box-shadow: 0 0 16px rgba(68, 255, 136, 0.16);
        }
        .review-btn-blue {
          background: rgba(123, 184, 255, 0.12);
          border: 1px solid rgba(123, 184, 255, 0.42);
          color: #d8ecff;
        }
        .review-btn-blue:hover {
          background: rgba(123, 184, 255, 0.18);
          box-shadow: 0 0 16px rgba(123, 184, 255, 0.16);
        }
        .review-btn-secondary {
          background: transparent;
          border: 1px solid rgba(102, 119, 136, 0.42);
          color: #9ab0c5;
        }
        .review-btn-secondary:hover {
          background: rgba(102, 119, 136, 0.1);
          color: #c4d6e8;
        }
        .review-btn:disabled {
          opacity: 0.48;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
      `}</style>

      <div style={styles.card} role="dialog" aria-modal="true" aria-labelledby="review-prompt-title">
        <div style={styles.closeRow}>
          <div style={styles.kicker}>{t('review_prompt.kicker')}</div>
          <button type="button" style={styles.closeButton} onClick={close} aria-label={t('common.close')}>
            x
          </button>
        </div>

        <div style={styles.signalWrap}>
          <div style={styles.signalLine} />
          <div style={styles.signalDot} />
          <div style={styles.signalLineRight} />
        </div>

        {mode === 'choice' && (
          <>
            <h2 id="review-prompt-title" style={styles.title}>{t('review_prompt.title')}</h2>
            <p style={styles.body}>{t('review_prompt.body')}</p>
            <div style={styles.choiceGrid}>
              <button type="button" className="review-btn review-btn-primary" onClick={openStoreReview}>
                {t('review_prompt.good', { store: platformLabel })}
              </button>
              <button type="button" className="review-btn review-btn-blue" onClick={() => setMode('feedback')}>
                {t('review_prompt.problem')}
              </button>
            </div>
            <button type="button" className="review-btn review-btn-secondary" style={styles.laterButton} onClick={close}>
              {t('review_prompt.later')}
            </button>
          </>
        )}

        {mode === 'feedback' && (
          <>
            <h2 id="review-prompt-title" style={styles.title}>{t('review_prompt.feedback_title')}</h2>
            <p style={styles.body}>{t('review_prompt.feedback_body')}</p>
            <textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder={t('review_prompt.feedback_placeholder')}
              style={styles.textarea}
              maxLength={4000}
            />
            {error && <div style={styles.error}>{error}</div>}
            <div style={styles.actions}>
              <button type="button" className="review-btn review-btn-secondary" onClick={() => setMode('choice')}>
                {t('common.back')}
              </button>
              <button type="button" className="review-btn review-btn-blue" onClick={submitFeedback} disabled={!canSubmit}>
                {submitting ? t('review_prompt.sending') : t('review_prompt.send_feedback')}
              </button>
            </div>
          </>
        )}

        {mode === 'thanks' && (
          <>
            <h2 id="review-prompt-title" style={styles.title}>{t('review_prompt.thanks_title')}</h2>
            <p style={styles.body}>{t('review_prompt.thanks_body')}</p>
            <button type="button" className="review-btn review-btn-primary" style={styles.doneButton} onClick={close}>
              {t('common.understood')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 9840,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'calc(18px + env(safe-area-inset-top, 0px)) 14px calc(78px + env(safe-area-inset-bottom, 0px))',
    boxSizing: 'border-box',
    background: 'rgba(2, 4, 12, 0.66)',
    backdropFilter: 'blur(5px)',
    fontFamily: 'monospace',
  },
  card: {
    width: 'min(440px, 94vw)',
    borderRadius: 8,
    border: '1px solid rgba(123,184,255,0.28)',
    background: 'linear-gradient(145deg, rgba(5,10,20,0.98), rgba(12,20,34,0.96))',
    boxShadow: '0 24px 70px rgba(0,0,0,0.68), inset 0 0 34px rgba(123,184,255,0.05)',
    padding: 20,
    animation: 'reviewPanelEnter 0.28s ease-out',
  },
  closeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  kicker: {
    color: '#7bb8ff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 4,
    border: '1px solid rgba(102,119,136,0.36)',
    background: 'rgba(2,5,16,0.55)',
    color: '#8899aa',
    cursor: 'pointer',
    fontFamily: 'monospace',
    lineHeight: '24px',
  },
  signalWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '0 0 16px',
  },
  signalLine: {
    height: 1,
    flex: 1,
    background: 'linear-gradient(90deg, transparent, rgba(68,255,136,0.45))',
    animation: 'reviewSignalPulse 2.8s ease-in-out infinite',
    transformOrigin: 'right',
  },
  signalLineRight: {
    height: 1,
    flex: 1,
    background: 'linear-gradient(90deg, rgba(68,255,136,0.45), transparent)',
    animation: 'reviewSignalPulse 2.8s ease-in-out infinite',
    transformOrigin: 'left',
  },
  signalDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#44ff88',
    boxShadow: '0 0 12px rgba(68,255,136,0.75)',
  },
  title: {
    color: '#cdd9e8',
    fontSize: 'clamp(18px, 5vw, 23px)',
    fontWeight: 'normal',
    lineHeight: 1.25,
    margin: '0 0 10px',
  },
  body: {
    color: '#aabbcc',
    fontSize: 13,
    lineHeight: 1.6,
    margin: '0 0 16px',
  },
  choiceGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 10,
    marginTop: 14,
  },
  laterButton: {
    width: '100%',
    marginTop: 10,
  },
  textarea: {
    width: '100%',
    minHeight: 120,
    resize: 'vertical',
    boxSizing: 'border-box',
    borderRadius: 4,
    border: '1px solid rgba(123,184,255,0.28)',
    background: 'rgba(2,5,16,0.72)',
    color: '#cdd9e8',
    padding: 12,
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 1.5,
    outline: 'none',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  error: {
    color: '#ff9988',
    fontSize: 11,
    marginTop: 8,
  },
  doneButton: {
    width: '100%',
  },
};
