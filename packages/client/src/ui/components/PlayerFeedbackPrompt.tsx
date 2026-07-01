import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { playSfx } from '../../audio/SfxPlayer.js';
import { submitPlayerFeedback } from '../../api/player-feedback-api.js';

type PromptMode = 'form' | 'thanks';

interface PlayerFeedbackPromptProps {
  playerLevel: number;
  onClose: () => void;
}

const MAX_FIELD_LENGTH = 2000;

export function PlayerFeedbackPrompt({ playerLevel, onClose }: PlayerFeedbackPromptProps) {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<PromptMode>('form');
  const [likes, setLikes] = useState('');
  const [dislikes, setDislikes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = (likes.trim().length > 0 || dislikes.trim().length > 0) && !submitting;

  const close = () => {
    playSfx('ui-click', 0.04);
    onClose();
  };

  const submit = async () => {
    if (!canSubmit) return;
    playSfx('ui-click', 0.05);
    setSubmitting(true);
    setError(null);
    try {
      await submitPlayerFeedback({
        likesText: likes.trim().slice(0, MAX_FIELD_LENGTH),
        dislikesText: dislikes.trim().slice(0, MAX_FIELD_LENGTH),
        level: playerLevel,
        language: i18n.language.startsWith('uk') ? 'uk' : 'en',
      });
      setMode('thanks');
    } catch {
      setError(t('feedback_prompt.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.backdrop}>
      <style>{`
        @keyframes feedbackPanelEnter {
          from { opacity: 0; transform: translateY(14px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes feedbackSignalPulse {
          0%, 100% { opacity: 0.45; transform: scaleX(0.72); }
          50% { opacity: 1; transform: scaleX(1); }
        }
        .fb-prompt-btn {
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          padding: 10px 14px;
          cursor: pointer;
          transition: all 0.16s ease;
          outline: none;
        }
        .fb-prompt-btn:hover { transform: translateY(-1px); }
        .fb-prompt-btn:active { transform: translateY(1px); }
        .fb-prompt-btn-primary {
          background: rgba(68, 255, 136, 0.11);
          border: 1px solid rgba(68, 255, 136, 0.45);
          color: #bbf9d4;
        }
        .fb-prompt-btn-primary:hover {
          background: rgba(68, 255, 136, 0.17);
          box-shadow: 0 0 16px rgba(68, 255, 136, 0.16);
        }
        .fb-prompt-btn-secondary {
          background: transparent;
          border: 1px solid rgba(102, 119, 136, 0.42);
          color: #9ab0c5;
        }
        .fb-prompt-btn-secondary:hover {
          background: rgba(102, 119, 136, 0.1);
          color: #c4d6e8;
        }
        .fb-prompt-btn:disabled {
          opacity: 0.48;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
      `}</style>

      <div style={styles.card} role="dialog" aria-modal="true" aria-labelledby="feedback-prompt-title">
        <div style={styles.closeRow}>
          <div style={styles.kicker}>{t('feedback_prompt.kicker')}</div>
          <button type="button" style={styles.closeButton} onClick={close} aria-label={t('common.close')}>
            x
          </button>
        </div>

        <div style={styles.signalWrap}>
          <div style={styles.signalLine} />
          <div style={styles.signalDot} />
          <div style={styles.signalLineRight} />
        </div>

        {mode === 'form' && (
          <>
            <h2 id="feedback-prompt-title" style={styles.title}>{t('feedback_prompt.title')}</h2>
            <p style={styles.body}>{t('feedback_prompt.body')}</p>

            <div style={styles.field}>
              <div style={styles.fieldLabel}>{t('feedback_prompt.likes_label')}</div>
              <textarea
                value={likes}
                onChange={(event) => setLikes(event.target.value)}
                placeholder={t('feedback_prompt.likes_placeholder')}
                style={styles.textarea}
                maxLength={MAX_FIELD_LENGTH}
              />
            </div>

            <div style={styles.field}>
              <div style={styles.fieldLabel}>{t('feedback_prompt.dislikes_label')}</div>
              <textarea
                value={dislikes}
                onChange={(event) => setDislikes(event.target.value)}
                placeholder={t('feedback_prompt.dislikes_placeholder')}
                style={styles.textarea}
                maxLength={MAX_FIELD_LENGTH}
              />
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.actions}>
              <button type="button" className="fb-prompt-btn fb-prompt-btn-secondary" onClick={close}>
                {t('feedback_prompt.skip')}
              </button>
              <button type="button" className="fb-prompt-btn fb-prompt-btn-primary" onClick={submit} disabled={!canSubmit}>
                {submitting ? t('feedback_prompt.sending') : t('feedback_prompt.submit')}
              </button>
            </div>
          </>
        )}

        {mode === 'thanks' && (
          <>
            <h2 id="feedback-prompt-title" style={styles.title}>{t('feedback_prompt.thanks_title')}</h2>
            <p style={styles.body}>{t('feedback_prompt.thanks_body')}</p>
            <button type="button" className="fb-prompt-btn fb-prompt-btn-primary" style={styles.doneButton} onClick={close}>
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
    width: 'min(460px, 94vw)',
    maxHeight: '90vh',
    overflowY: 'auto',
    borderRadius: 8,
    border: '1px solid rgba(123,184,255,0.28)',
    background: 'linear-gradient(145deg, rgba(5,10,20,0.98), rgba(12,20,34,0.96))',
    boxShadow: '0 24px 70px rgba(0,0,0,0.68), inset 0 0 34px rgba(123,184,255,0.05)',
    padding: 20,
    animation: 'feedbackPanelEnter 0.28s ease-out',
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
    animation: 'feedbackSignalPulse 2.8s ease-in-out infinite',
    transformOrigin: 'right',
  },
  signalLineRight: {
    height: 1,
    flex: 1,
    background: 'linear-gradient(90deg, rgba(68,255,136,0.45), transparent)',
    animation: 'feedbackSignalPulse 2.8s ease-in-out infinite',
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
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    color: '#8899aa',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  textarea: {
    width: '100%',
    minHeight: 80,
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
