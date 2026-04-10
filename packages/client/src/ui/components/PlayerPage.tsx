import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { levelProgress, MAX_PLAYER_LEVEL } from '@nebulife/core';
import { playSfx } from '../../audio/SfxPlayer.js';

// ---------------------------------------------------------------------------
// PlayerPage — Full-screen player profile overlay
// ---------------------------------------------------------------------------

interface PlayerPageProps {
  playerName: string;
  playerLevel: number;
  playerXP: number;
  quarks: number;
  isGuest: boolean;
  isNative: boolean;
  onClose: () => void;
  onLogout: () => void;
  onStartOver: () => void;
  onOpenTopUp: () => void;
  onLinkAccount: () => void;
  onDeleteAccount: () => void;
  // Notification preferences
  hasEmail?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  onToggleEmailNotif?: (val: boolean) => void;
  onTogglePushNotif?: (val: boolean) => void;
  // Audio preferences
  /** Ambient volume 0-1 (0 = muted, 1 = max). Replaces the old on/off toggle. */
  ambientVolume?: number;
  onChangeAmbientVolume?: (val: number) => void;
}

// ── Avatar SVG ────────────────────────────────────────────────────────────

function AvatarSVG({ color }: { color: string }) {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer ring */}
      <circle cx="32" cy="32" r="30" stroke={color} strokeWidth="1.5" opacity="0.4" />
      <circle cx="32" cy="32" r="26" stroke={color} strokeWidth="0.8" opacity="0.2" />
      {/* Head */}
      <circle cx="32" cy="24" r="9" stroke={color} strokeWidth="1.2" fill="none" opacity="0.6" />
      {/* Body arc */}
      <path
        d="M16 48C16 39 23 33 32 33C41 33 48 39 48 48"
        stroke={color}
        strokeWidth="1.2"
        fill="none"
        opacity="0.5"
      />
      {/* Star decoration */}
      <path
        d="M32 18L33 20.4L35.5 20.7L33.75 22.4L34.2 24.8L32 23.7L29.8 24.8L30.25 22.4L28.5 20.7L31 20.4L32 18Z"
        fill={color}
        opacity="0.5"
      />
    </svg>
  );
}

// ── Quark icon ────────────────────────────────────────────────────────────

function QuarkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="2" fill="#aaccff" opacity="0.8" />
      <ellipse cx="7" cy="7" rx="6" ry="3" stroke="#aaccff" strokeWidth="0.8" opacity="0.5" transform="rotate(0 7 7)" />
      <ellipse cx="7" cy="7" rx="6" ry="3" stroke="#aaccff" strokeWidth="0.8" opacity="0.5" transform="rotate(60 7 7)" />
      <ellipse cx="7" cy="7" rx="6" ry="3" stroke="#aaccff" strokeWidth="0.8" opacity="0.5" transform="rotate(120 7 7)" />
    </svg>
  );
}

export function PlayerPage({
  playerName,
  playerLevel,
  playerXP,
  quarks,
  isGuest,
  isNative,
  onClose,
  onLogout,
  onStartOver,
  onOpenTopUp,
  onLinkAccount,
  onDeleteAccount,
  hasEmail = false,
  emailNotifications = true,
  pushNotifications = true,
  onToggleEmailNotif,
  onTogglePushNotif,
  ambientVolume = 0.30,
  onChangeAmbientVolume,
}: PlayerPageProps) {
  const { t, i18n } = useTranslation();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [nativeTopUpMsg, setNativeTopUpMsg] = useState(false);

  const progress = levelProgress(playerXP);
  const isMaxLevel = playerLevel >= MAX_PLAYER_LEVEL;
  const accentColor = isMaxLevel ? '#44ff88' : '#4488aa';

  const handleTopUp = () => {
    playSfx('ui-click', 0.07);
    if (isGuest) {
      onLinkAccount();
      return;
    }
    if (isNative) {
      setNativeTopUpMsg(true);
      setTimeout(() => setNativeTopUpMsg(false), 3000);
      return;
    }
    onOpenTopUp();
  };

  const handleStartOver = () => {
    playSfx('ui-click', 0.07);
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    onStartOver();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9700,
        background: 'rgba(2, 5, 16, 0.98)',
        fontFamily: 'monospace',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflowY: 'auto',
      }}
    >
      {/* Close button */}
      <button
        onClick={() => { playSfx('ui-click', 0.07); onClose(); }}
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          background: 'none',
          border: '1px solid rgba(51,68,85,0.3)',
          borderRadius: 3,
          color: '#556677',
          fontFamily: 'monospace',
          fontSize: 11,
          padding: '4px 12px',
          cursor: 'pointer',
          transition: 'color 0.15s, border-color 0.15s',
          zIndex: 1,
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.color = '#aabbcc';
          (e.target as HTMLElement).style.borderColor = '#556677';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.color = '#556677';
          (e.target as HTMLElement).style.borderColor = 'rgba(51,68,85,0.3)';
        }}
      >
        {t('common.close')}
      </button>

      {/* Content card */}
      <div style={{
        maxWidth: 340,
        width: '100%',
        padding: '48px 24px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
      }}>
        {/* Avatar */}
        <AvatarSVG color={accentColor} />

        {/* Name */}
        <div style={{
          fontSize: 14,
          color: '#aabbcc',
          letterSpacing: 1,
        }}>
          {playerName}
        </div>

        {/* Level + XP */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          width: '100%',
        }}>
          <div style={{
            fontSize: 11,
            color: accentColor,
            letterSpacing: 0.5,
          }}>
            {t('player.level')} {playerLevel}
          </div>
          {/* XP bar */}
          <div style={{
            width: '60%',
            height: 3,
            background: 'rgba(51, 68, 85, 0.5)',
            borderRadius: 2,
            overflow: 'hidden',
          }}>
            <div style={{
              width: isMaxLevel ? '100%' : `${Math.round(progress * 100)}%`,
              height: '100%',
              background: accentColor,
              borderRadius: 2,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{
            fontSize: 9,
            color: '#556677',
          }}>
            {isMaxLevel ? 'MAX' : `${playerXP} XP`}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '100%', height: 1, background: 'rgba(51,68,85,0.3)' }} />

        {/* Quarks section */}
        <div style={{
          width: '100%',
          padding: '14px 16px',
          background: 'rgba(10,15,25,0.6)',
          border: '1px solid rgba(51,68,85,0.2)',
          borderRadius: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: '#aabbcc',
            }}>
              <QuarkIcon />
              <span>{t('player.quarks')}</span>
            </div>
            <span style={{
              fontSize: 14,
              color: '#aaccff',
              fontWeight: 600,
            }}>
              {quarks}
            </span>
          </div>

          <button
            onClick={handleTopUp}
            style={{
              width: '100%',
              padding: '8px 0',
              background: 'rgba(68,102,136,0.15)',
              border: '1px solid rgba(68,136,170,0.35)',
              borderRadius: 3,
              color: '#aaccee',
              fontFamily: 'monospace',
              fontSize: 11,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = 'rgba(68,102,136,0.3)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'rgba(68,102,136,0.15)';
            }}
          >
            {t('player.top_up_quarks')}
          </button>

          {nativeTopUpMsg && (
            <div style={{ fontSize: 10, color: '#cc8844', textAlign: 'center' }}>
              {t('player.web_only_topup')}
            </div>
          )}

          {isGuest && (
            <div style={{ fontSize: 10, color: '#556677', textAlign: 'center' }}>
              {t('player.guest_topup_note')}
            </div>
          )}
        </div>

        {/* Register / Link account — prominent for guests */}
        {isGuest && (
          <button
            onClick={() => { playSfx('ui-click', 0.07); onLinkAccount(); }}
            style={{
              width: '100%',
              padding: '12px 0',
              background: 'rgba(68,136,170,0.15)',
              border: '1px solid #4488aa',
              borderRadius: 3,
              color: '#7bb8ff',
              fontFamily: 'monospace',
              fontSize: 12,
              fontWeight: 'bold',
              letterSpacing: 1,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = 'rgba(68,136,170,0.25)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'rgba(68,136,170,0.15)';
            }}
          >
            {t('player.create_account', 'CREATE ACCOUNT')}
          </button>
        )}
        {isGuest && (
          <div style={{ fontSize: 9, color: '#556677', textAlign: 'center', lineHeight: 1.4 }}>
            {t('player.create_account_hint', 'Save your progress permanently. Sign in with Google or email.')}
          </div>
        )}

        {/* Divider */}
        <div style={{ width: '100%', height: 1, background: 'rgba(51,68,85,0.3)' }} />

        {/* Logout button */}
        <button
          onClick={() => { playSfx('ui-click', 0.07); onLogout(); }}
          style={{
            width: '100%',
            padding: '10px 0',
            background: 'rgba(20,30,50,0.5)',
            border: '1px solid rgba(51,68,85,0.3)',
            borderRadius: 3,
            color: '#8899aa',
            fontFamily: 'monospace',
            fontSize: 11,
            cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background = 'rgba(30,45,70,0.5)';
            (e.target as HTMLElement).style.color = '#aabbcc';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background = 'rgba(20,30,50,0.5)';
            (e.target as HTMLElement).style.color = '#8899aa';
          }}
        >
          {t('player.logout')}
        </button>

        {/* Notification preferences */}
        {(onToggleEmailNotif || onTogglePushNotif) && (
          <>
            <div style={{ width: '100%', height: 1, background: 'rgba(51,68,85,0.3)' }} />
            <div style={{
              width: '100%',
              padding: '14px 16px',
              background: 'rgba(10,15,25,0.6)',
              border: '1px solid rgba(51,68,85,0.2)',
              borderRadius: 4,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <div style={{ fontSize: 10, color: '#556677', letterSpacing: 0.5 }}>
                {i18n.language === 'en' ? 'NOTIFICATIONS' : 'СПОВІЩЕННЯ'}
              </div>

              {/* Email notifications toggle */}
              {hasEmail && onToggleEmailNotif && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: '#8899aa' }}>
                    {i18n.language === 'en' ? 'Email digest' : 'Email-дайджест'}
                  </span>
                  <button
                    onClick={() => { playSfx('ui-click', 0.07); onToggleEmailNotif(!emailNotifications); }}
                    style={{
                      width: 36,
                      height: 20,
                      borderRadius: 10,
                      border: 'none',
                      background: emailNotifications ? 'rgba(68,255,136,0.3)' : 'rgba(51,68,85,0.3)',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.2s',
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: 3,
                      left: emailNotifications ? 18 : 3,
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: emailNotifications ? '#44ff88' : '#667788',
                      transition: 'left 0.2s, background 0.2s',
                    }} />
                  </button>
                </div>
              )}

              {/* Push notifications toggle */}
              {onTogglePushNotif && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: '#8899aa' }}>
                    {i18n.language === 'en' ? 'Push notifications' : 'Push-сповіщення'}
                  </span>
                  <button
                    onClick={() => { playSfx('ui-click', 0.07); onTogglePushNotif(!pushNotifications); }}
                    style={{
                      width: 36,
                      height: 20,
                      borderRadius: 10,
                      border: 'none',
                      background: pushNotifications ? 'rgba(68,255,136,0.3)' : 'rgba(51,68,85,0.3)',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.2s',
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: 3,
                      left: pushNotifications ? 18 : 3,
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: pushNotifications ? '#44ff88' : '#667788',
                      transition: 'left 0.2s, background 0.2s',
                    }} />
                  </button>
                </div>
              )}
            </div>

            {/* Audio section */}
            {onChangeAmbientVolume && (
              <div style={{
                marginTop: 12,
                padding: '14px 16px',
                background: 'rgba(10,15,25,0.6)',
                border: '1px solid rgba(51,68,85,0.2)',
                borderRadius: 4,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}>
                <div style={{ fontSize: 10, color: '#556677', letterSpacing: 0.5 }}>
                  {i18n.language === 'en' ? 'AUDIO' : 'АУДІО'}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#8899aa' }}>
                      {i18n.language === 'en' ? 'Space sound' : 'Звук космосу'}
                    </span>
                    <span style={{
                      fontSize: 10,
                      color: ambientVolume === 0 ? '#667788' : '#44ff88',
                      fontFamily: 'monospace',
                      minWidth: 44,
                      textAlign: 'right',
                      letterSpacing: 1,
                    }}>
                      {ambientVolume === 0
                        ? (i18n.language === 'en' ? 'OFF' : 'ВИМК')
                        : `${Math.round(ambientVolume * 100)}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(ambientVolume * 100)}
                    onChange={(e) => onChangeAmbientVolume(Number(e.target.value) / 100)}
                    style={{
                      width: '100%',
                      accentColor: '#44ff88',
                      cursor: 'pointer',
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Start over — danger zone */}
        <div style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginTop: 16,
        }}>
          <button
            onClick={handleStartOver}
            style={{
              width: '100%',
              padding: '10px 0',
              background: confirmReset ? 'rgba(204,68,68,0.15)' : 'rgba(20,15,15,0.4)',
              border: `1px solid ${confirmReset ? 'rgba(204,68,68,0.4)' : 'rgba(68,51,51,0.3)'}`,
              borderRadius: 3,
              color: confirmReset ? '#cc4444' : '#554444',
              fontFamily: 'monospace',
              fontSize: 11,
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!confirmReset) {
                (e.target as HTMLElement).style.color = '#cc6666';
                (e.target as HTMLElement).style.borderColor = 'rgba(204,68,68,0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!confirmReset) {
                (e.target as HTMLElement).style.color = '#554444';
                (e.target as HTMLElement).style.borderColor = 'rgba(68,51,51,0.3)';
              }
            }}
          >
            {confirmReset ? t('player.confirm_reset') : t('player.start_over')}
          </button>

          {confirmReset && (
            <div style={{
              fontSize: 10,
              color: '#884444',
              textAlign: 'center',
              lineHeight: 1.5,
            }}>
              {t('player.reset_warning')}
              <br />
              <button
                onClick={() => { playSfx('ui-click', 0.07); setConfirmReset(false); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#556677',
                  fontFamily: 'monospace',
                  fontSize: 10,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  marginTop: 4,
                  padding: 0,
                }}
              >
                {t('common.cancel')}
              </button>
            </div>
          )}

          {/* Delete Account */}
          <div style={{ borderTop: '1px solid rgba(204,68,68,0.15)', paddingTop: 12, marginTop: 8 }}>
            <button
              onClick={() => {
                playSfx('ui-click', 0.07);
                if (confirmDelete) {
                  onDeleteAccount();
                } else {
                  setConfirmDelete(true);
                }
              }}
              style={{
                width: '100%',
                padding: '8px 16px',
                background: confirmDelete ? 'rgba(204,68,68,0.15)' : 'transparent',
                border: `1px solid ${confirmDelete ? 'rgba(204,68,68,0.5)' : 'rgba(68,51,51,0.2)'}`,
                borderRadius: 3,
                color: confirmDelete ? '#cc4444' : '#443333',
                fontFamily: 'monospace',
                fontSize: 10,
                cursor: 'pointer',
              }}
            >
              {confirmDelete ? t('player.confirm_delete') : t('player.delete_account')}
            </button>
            {confirmDelete && (
              <div style={{ fontSize: 9, color: '#884444', textAlign: 'center', lineHeight: 1.5, marginTop: 6 }}>
                {t('player.delete_warning')}
                <br />
                <button
                  onClick={() => { playSfx('ui-click', 0.07); setConfirmDelete(false); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#556677',
                    fontFamily: 'monospace',
                    fontSize: 9,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    marginTop: 3,
                    padding: 0,
                  }}
                >
                  {t('common.cancel')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
