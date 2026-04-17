import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  signInWithGoogle,
  linkGoogleToAnonymous,
  getCurrentUser,
  isGoogleSignInAvailable,
} from '../../auth/auth-service.js';

// ---------------------------------------------------------------------------
// GuestRegistrationReminder — one-time notification for guest players
// ---------------------------------------------------------------------------
// Shows a gentle reminder to register so their progress is truly preserved.
// Offers Google sign-in, email, or "Later" to dismiss.
// ---------------------------------------------------------------------------

interface GuestRegistrationReminderProps {
  onDismiss: () => void;
  onOpenEmailAuth: () => void;
  onLinked: () => void;
}

export function GuestRegistrationReminder({
  onDismiss,
  onOpenEmailAuth,
  onLinked,
}: GuestRegistrationReminderProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = getCurrentUser();
      if (user?.isAnonymous) {
        await linkGoogleToAnonymous();
      } else {
        await signInWithGoogle();
      }
      onLinked();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      if (code === 'auth/popup-closed-by-user') {
        setError(null);
      } else if (code === 'auth/credential-already-in-use') {
        setError(t('guest.error_google_in_use'));
      } else {
        setError(t('guest.error_auth'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9800,
          background: 'rgba(1, 3, 10, 0.6)',
          backdropFilter: 'blur(3px)',
        }}
        onClick={onDismiss}
      />

      {/* Card */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9801,
          width: 380,
          maxWidth: '90vw',
          background: 'rgba(10, 15, 25, 0.96)',
          border: '1px solid #334455',
          borderRadius: 6,
          padding: '28px 24px 22px',
          fontFamily: 'monospace',
          animation: 'guest-remind-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div
          style={{
            color: '#aabbcc',
            fontSize: 13,
            lineHeight: '1.6',
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          {t('guest.reminder_prefix')}
          <span style={{ color: '#7bb8ff' }}> {t('guest.reminder_register')}</span>.
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Google */}
          {isGoogleSignInAvailable() && (
            <AuthButton
              label={t('guest.btn_google')}
              color="#4488cc"
              borderColor="#336699"
              onClick={handleGoogle}
              disabled={loading}
            />
          )}

          {/* Email */}
          <AuthButton
            label={t('guest.btn_email')}
            color="#8899aa"
            borderColor="#445566"
            onClick={onOpenEmailAuth}
            disabled={loading}
          />

          {/* Divider */}
          <div
            style={{
              height: 1,
              background: 'rgba(51, 68, 85, 0.4)',
              margin: '4px 0',
            }}
          />

          {/* Later */}
          <button
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: '#556677',
              fontFamily: 'monospace',
              fontSize: 11,
              cursor: 'pointer',
              padding: '8px 0',
              minHeight: 44,
              textAlign: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#8899aa'; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#556677'; }}
          >
            {t('guest.btn_later')}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ color: '#cc4444', fontSize: 10, textAlign: 'center', marginTop: 10 }}>
            {error}
          </div>
        )}
      </div>

      <style>{`
        @keyframes guest-remind-in {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
}

function AuthButton({
  label,
  color,
  borderColor,
  onClick,
  disabled,
}: {
  label: string;
  color: string;
  borderColor: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        padding: '10px 0',
        minHeight: 44,
        background: hover ? 'rgba(30, 50, 80, 0.4)' : 'rgba(10, 20, 35, 0.5)',
        border: `1px solid ${hover ? color : borderColor}`,
        borderRadius: 4,
        color: hover ? '#ccddee' : color,
        fontFamily: 'monospace',
        fontSize: 12,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}
