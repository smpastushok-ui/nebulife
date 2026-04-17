import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  linkGoogleToAnonymous,
  linkEmailToAnonymous,
  isGoogleSignInAvailable,
} from '../../auth/auth-service.js';
import { authFetch } from '../../auth/api-client.js';

// ---------------------------------------------------------------------------
// LinkAccountModal — prompt for guest users to upgrade their account
// ---------------------------------------------------------------------------

interface LinkAccountModalProps {
  onLinked: () => void;
  onClose: () => void;
}

type Screen = 'choice' | 'email-form';

export function LinkAccountModal({ onLinked, onClose }: LinkAccountModalProps) {
  const { t } = useTranslation();
  const [screen, setScreen] = useState<Screen>('choice');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const notifyServer = async () => {
    try {
      await authFetch('/api/auth/link-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    } catch {
      // Non-critical — server will pick up the change on next auth check
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await linkGoogleToAnonymous();
      await notifyServer();
      onLinked();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      if (msg.includes('popup-closed')) setError(t('errors.authClosed'));
      else if (msg.includes('credential-already-in-use')) setError(t('link_account.error_google_in_use'));
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    if (!email || !password || !confirmPassword) { setError(t('errors.fillAllFields')); return; }
    if (password !== confirmPassword) { setError(t('errors.passwordMismatch')); return; }
    if (password.length < 6) { setError(t('link_account.min_6_chars')); return; }

    setError('');
    setLoading(true);
    try {
      await linkEmailToAnonymous(email, password);
      await notifyServer();
      onLinked();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      if (msg.includes('email-already-in-use')) setError(t('errors.emailRegistered'));
      else if (msg.includes('weak-password')) setError(t('errors.weakPassword'));
      else if (msg.includes('invalid-email')) setError(t('errors.invalidEmail'));
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={backdropStyle} onClick={onClose} />
      <div style={cardStyle}>
        <div style={titleStyle}>{t('link_account.title')}</div>
        <div style={hintStyle}>
          {t('link_account.hint')}
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        {screen === 'choice' && (
          <>
            {isGoogleSignInAvailable() && (
              <button style={googleBtnStyle} onClick={handleGoogle} disabled={loading}>
                {loading ? t('common.loading') : 'Google'}
              </button>
            )}
            <button
              style={btnStyle}
              onClick={() => { setScreen('email-form'); setError(''); }}
              disabled={loading}
            >
              {t('link_account.email_password_btn')}
            </button>
            <button style={closeBtnStyle} onClick={onClose}>
              {t('link_account.later_btn')}
            </button>
          </>
        )}

        {screen === 'email-form' && (
          <>
            <input
              style={inputStyle}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <input
              style={inputStyle}
              type="password"
              placeholder={t('auth.password_min_placeholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              style={inputStyle}
              type="password"
              placeholder={t('auth.confirm_password_placeholder')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEmail()}
            />
            <button style={btnStyle} onClick={handleEmail} disabled={loading}>
              {loading ? t('common.loading') : t('link_account.link_btn')}
            </button>
            <button style={closeBtnStyle} onClick={() => { setScreen('choice'); setError(''); }}>
              {t('common.back')}
            </button>
          </>
        )}
      </div>
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 10100,
  background: 'rgba(0, 4, 12, 0.6)',
};

const cardStyle: React.CSSProperties = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 10101,
  width: 320,
  padding: '28px 24px',
  background: 'rgba(10, 15, 25, 0.96)',
  border: '1px solid #334455',
  borderRadius: 6,
  fontFamily: 'monospace',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const titleStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#ccddee',
  textAlign: 'center',
  letterSpacing: '0.06em',
};

const hintStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#556677',
  textAlign: 'center',
  lineHeight: 1.5,
  marginBottom: 6,
};

const errorStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#cc4444',
  textAlign: 'center',
  padding: '6px 10px',
  background: 'rgba(204, 68, 68, 0.08)',
  border: '1px solid rgba(204, 68, 68, 0.2)',
  borderRadius: 4,
};

const btnStyle: React.CSSProperties = {
  padding: '10px 0',
  background: 'rgba(30, 60, 80, 0.6)',
  border: '1px solid #446688',
  color: '#aaccee',
  fontSize: 12,
  fontFamily: 'monospace',
  borderRadius: 3,
  cursor: 'pointer',
};

const googleBtnStyle: React.CSSProperties = {
  ...btnStyle,
  background: 'rgba(40, 70, 100, 0.7)',
  borderColor: '#4488aa',
  color: '#bbddff',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#556677',
  fontSize: 10,
  fontFamily: 'monospace',
  cursor: 'pointer',
  padding: '4px 0',
  textAlign: 'center',
};

const inputStyle: React.CSSProperties = {
  padding: '9px 12px',
  background: 'rgba(10, 20, 35, 0.8)',
  border: '1px solid #334455',
  color: '#aabbcc',
  fontSize: 12,
  fontFamily: 'monospace',
  borderRadius: 3,
  outline: 'none',
};
