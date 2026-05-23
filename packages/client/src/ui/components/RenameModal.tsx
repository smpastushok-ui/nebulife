import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { playSfx } from '../../audio/SfxPlayer.js';

/* Коментар українською: Пропси для вікна перейменування */
interface RenameModalProps {
  isOpen: boolean;
  title: string;
  initialValue: string;
  onConfirm: (newValue: string) => void;
  onClose: () => void;
}

/* Коментар українською: Секція компонента RenameModal з космічним дизайном */
export const RenameModal: React.FC<RenameModalProps> = ({
  isOpen,
  title,
  initialValue,
  onConfirm,
  onClose,
}) => {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      setError(null);
      /* Коментар українською: Фокусуємо поле введення після рендеру */
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  /* Коментар українською: Валідація назви */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();

    if (!trimmed) {
      setError(t('rename_modal.error_empty', { defaultValue: 'Назва не може бути порожньою' }));
      playSfx('ui-click', 0.1);
      return;
    }

    if (trimmed.length > 24) {
      setError(t('rename_modal.error_too_long', { defaultValue: 'Максимальна довжина — 24 символи' }));
      playSfx('ui-click', 0.1);
      return;
    }

    /* Коментар українською: Допускаємо літери, цифри, пробіли, дефіси */
    const isValid = /^[a-zA-Z0-9а-яА-ЯёЁіІїЇєЄґҐ\s\-_'.]+$/.test(trimmed);
    if (!isValid) {
      setError(t('rename_modal.error_invalid_chars', { defaultValue: 'Використано недопустимі символи' }));
      playSfx('ui-click', 0.1);
      return;
    }

    playSfx('ui-click', 0.07);
    onConfirm(trimmed);
  };

  const handleCancel = () => {
    playSfx('ui-click', 0.07);
    onClose();
  };

  return (
    <div
      style={styles.backdrop}
      onClick={handleCancel}
    >
      <div
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Коментар українською: Заголовок вікна перейменування */}
        <div style={styles.header}>
          <div style={styles.kicker}>SECURE LINK // SUBSYSTEM</div>
          <div style={styles.title}>{title}</div>
        </div>

        {/* Коментар українською: Форма введення */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            placeholder="ENTER NEW NAME"
            style={{
              ...styles.input,
              border: error ? '1px solid #cc4444' : '1px solid #334455',
            }}
            maxLength={24}
          />

          {error && (
            <div style={styles.errorText}>
              {error}
            </div>
          )}

          {/* Коментар українською: Кнопки дій */}
          <div style={styles.actions}>
            <button
              type="submit"
              style={styles.confirmBtn}
            >
              {t('rename_modal.confirm', { defaultValue: 'ПІДТВЕРДИТИ' })}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              style={styles.cancelBtn}
            >
              {t('rename_modal.cancel', { defaultValue: 'СКАСУВАТИ' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* Коментар українською: Космічні стилі з приглушеними тонами та monospace шрифтом */
const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(2, 5, 16, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30000,
    fontFamily: 'monospace',
  },
  modal: {
    background: 'rgba(10, 15, 25, 0.95)',
    border: '1px solid rgba(123, 184, 255, 0.4)',
    boxShadow: '0 0 20px rgba(68, 136, 170, 0.25)',
    borderRadius: 4,
    padding: '24px',
    maxWidth: 400,
    width: '90%',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    borderBottom: '1px solid rgba(51, 68, 85, 0.4)',
    paddingBottom: 12,
  },
  kicker: {
    fontSize: 9,
    color: '#4488aa',
    letterSpacing: '0.15em',
  },
  title: {
    fontSize: 14,
    color: '#ccddee',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  input: {
    background: 'rgba(5, 10, 20, 0.9)',
    color: '#aabbcc',
    fontFamily: 'monospace',
    fontSize: 13,
    padding: '10px 12px',
    borderRadius: 3,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    letterSpacing: '0.05em',
    transition: 'border-color 0.2s',
  },
  errorText: {
    fontSize: 10,
    color: '#cc4444',
    letterSpacing: '0.02em',
  },
  actions: {
    display: 'flex',
    gap: 8,
    marginTop: 8,
  },
  confirmBtn: {
    flex: 1,
    background: 'rgba(30, 60, 40, 0.6)',
    border: '1px solid rgba(80, 160, 100, 0.5)',
    borderRadius: 3,
    color: '#44ff88',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    padding: '10px',
    cursor: 'pointer',
    letterSpacing: '0.08em',
    transition: 'all 0.2s',
  },
  cancelBtn: {
    flex: 1,
    background: 'rgba(25, 20, 20, 0.6)',
    border: '1px solid rgba(160, 80, 80, 0.4)',
    borderRadius: 3,
    color: '#ff8888',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '10px',
    cursor: 'pointer',
    letterSpacing: '0.08em',
    transition: 'all 0.2s',
  },
};
