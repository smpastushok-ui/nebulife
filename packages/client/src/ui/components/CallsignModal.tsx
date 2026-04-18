import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { authFetch, apiFetch } from '../../auth/api-client.js';
import { signOut } from '../../auth/auth-service.js';

// ---------------------------------------------------------------------------
// CallsignModal — required after first auth, sets unique player name
// ---------------------------------------------------------------------------

const CALLSIGN_RE = /^[a-zA-Z0-9_-]{3,20}$/;
const API_BASE = '/api';

interface CallsignModalProps {
  onComplete: (callsign: string) => void;
}

export function CallsignModal({ onComplete }: CallsignModalProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const checkAvailability = useCallback(async (callsign: string) => {
    if (!CALLSIGN_RE.test(callsign)) {
      setAvailable(null);
      setChecking(false);
      return;
    }

    setChecking(true);
    try {
      const res = await apiFetch(
        `${API_BASE}/auth/check-callsign?callsign=${encodeURIComponent(callsign)}`,
      );
      const data = await res.json();
      setAvailable(data.available);
      if (data.error) setError(data.error);
    } catch {
      setError(t('callsign.check_error'));
    } finally {
      setChecking(false);
    }
  }, [t]);

  const handleChange = (val: string) => {
    // Allow only valid characters
    const filtered = val.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);
    setValue(filtered);
    setAvailable(null);
    setError('');

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (filtered.length >= 3) {
      debounceRef.current = setTimeout(() => checkAvailability(filtered), 500);
    }
  };

  const handleSubmit = async () => {
    if (!CALLSIGN_RE.test(value)) {
      setError(t('callsign.invalid_format'));
      return;
    }
    // Only block if check confirmed taken; if check failed (network/server),
    // proceed and let the server-side set-callsign endpoint validate uniqueness.
    if (available === false) {
      setError(t('callsign.taken'));
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await authFetch(`${API_BASE}/auth/set-callsign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callsign: value }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: t('common.error') }));
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }

      onComplete(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  /** Escape hatch — sign out and return to AuthScreen. Critical when offline /
   *  server unreachable so player isn't trapped. */
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch { /* ignore — Firebase will fire onAuthChange null anyway */ }
    // Hard reload to reset all client state
    window.location.reload();
  };

  const isValid = CALLSIGN_RE.test(value);
  // Allow submit when check explicitly succeeded OR check is null (failed/skipped)
  // — server will reject duplicates with proper error.
  const canSubmit = isValid && available !== false && !submitting && !checking;

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={titleStyle}>{t('callsign.title')}</div>
        <div style={hintStyle}>
          {t('callsign.hint')}
        </div>

        <input
          ref={inputRef}
          style={inputStyle}
          type="text"
          placeholder="Commander_42"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
          maxLength={20}
        />

        {/* Validation feedback */}
        <div style={{ minHeight: 18 }}>
          {value.length > 0 && value.length < 3 && (
            <div style={feedbackStyle('#667788')}>{t('callsign.min_3_chars')}</div>
          )}
          {checking && (
            <div style={feedbackStyle('#4488aa')}>{t('callsign.checking')}</div>
          )}
          {!checking && available === true && (
            <div style={feedbackStyle('#44ff88')}>{t('callsign.available')}</div>
          )}
          {!checking && available === false && (
            <div style={feedbackStyle('#cc4444')}>{t('callsign.taken')}</div>
          )}
          {error && (
            <div style={feedbackStyle('#cc4444')}>{error}</div>
          )}
        </div>

        <button
          style={{
            ...btnStyle,
            opacity: canSubmit ? 1 : 0.4,
            cursor: canSubmit ? 'pointer' : 'default',
          }}
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? t('callsign.saving') : t('common.confirm')}
        </button>

        <div style={rulesStyle}>
          {t('callsign.rules')}
        </div>

        {/* Escape: sign out → back to AuthScreen. Always available so the user
            cannot get trapped if the network or check-callsign endpoint fails. */}
        <button
          style={signOutBtnStyle}
          onClick={handleSignOut}
          disabled={submitting}
        >
          {t('auth.sign_out', { defaultValue: 'Вийти' })}
        </button>
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 10001,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(2, 5, 16, 0.88)',
  fontFamily: 'monospace',
};

const cardStyle: React.CSSProperties = {
  width: 340,
  padding: '32px 28px',
  background: 'rgba(10, 15, 25, 0.96)',
  border: '1px solid #334455',
  borderRadius: 6,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const titleStyle: React.CSSProperties = {
  fontSize: 15,
  color: '#ccddee',
  textAlign: 'center',
  letterSpacing: '0.06em',
  marginBottom: 2,
};

const hintStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#556677',
  textAlign: 'center',
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  background: 'rgba(10, 20, 35, 0.8)',
  border: '1px solid #446688',
  color: '#ccddee',
  fontSize: 14,
  fontFamily: 'monospace',
  borderRadius: 3,
  outline: 'none',
  textAlign: 'center',
  letterSpacing: '0.05em',
};

const btnStyle: React.CSSProperties = {
  padding: '10px 0',
  background: 'rgba(30, 60, 80, 0.6)',
  border: '1px solid #446688',
  color: '#aaccee',
  fontSize: 12,
  fontFamily: 'monospace',
  borderRadius: 3,
  transition: 'opacity 0.15s',
};

const rulesStyle: React.CSSProperties = {
  fontSize: 9,
  color: '#445566',
  textAlign: 'center',
};

function feedbackStyle(color: string): React.CSSProperties {
  return {
    fontSize: 10,
    color,
    textAlign: 'center',
  };
}

const signOutBtnStyle: React.CSSProperties = {
  marginTop: 4,
  padding: '8px 0',
  background: 'transparent',
  border: '1px solid #443344',
  color: '#886677',
  fontSize: 10,
  fontFamily: 'monospace',
  borderRadius: 3,
  cursor: 'pointer',
  letterSpacing: '0.05em',
};
