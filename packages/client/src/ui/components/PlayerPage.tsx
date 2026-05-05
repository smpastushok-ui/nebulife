import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { levelProgress, MAX_PLAYER_LEVEL } from '@nebulife/core';
import { playSfx } from '../../audio/SfxPlayer.js';
import { getPushPermissionStatus } from '../../notifications/push-service.js';

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
  /** Whether the player has an active Pro subscription */
  isPremium?: boolean;
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
  avatarUrl?: string | null;
  avatarUploading?: boolean;
  onChangeAvatar?: (file: File) => void;
  onRemoveAvatar?: () => void;
  // Audio preferences
  /** Ambient volume 0-1 (0 = muted, 1 = max). Replaces the old on/off toggle. */
  ambientVolume?: number;
  onChangeAmbientVolume?: (val: number) => void;
}

// ── Pro badge ─────────────────────────────────────────────────────────────

function ProBadge() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#7bb8ff"
      strokeWidth="1.5"
      style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 3 }}
    >
      <circle cx="12" cy="12" r="2.5" fill="#7bb8ff" />
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
    </svg>
  );
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
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#7bb8ff" strokeWidth="1.2" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 2 }}>
      <circle cx="8" cy="8" r="2" />
      <ellipse cx="8" cy="8" rx="7" ry="3" />
      <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(60 8 8)" />
      <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(-60 8 8)" />
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
  isPremium = false,
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
  avatarUrl = null,
  avatarUploading = false,
  onChangeAvatar,
  onRemoveAvatar,
  ambientVolume = 0.30,
  onChangeAmbientVolume,
}: PlayerPageProps) {
  const { t, i18n } = useTranslation();
  const [confirmReset, setConfirmReset] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTypeInput, setDeleteTypeInput] = useState('');
  const [nativeTopUpMsg, setNativeTopUpMsg] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const progress = levelProgress(playerXP);
  const isMaxLevel = playerLevel >= MAX_PLAYER_LEVEL;
  const accentColor = isMaxLevel ? '#44ff88' : '#4488aa';
  const panelStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '14px 16px',
    background: 'linear-gradient(180deg, rgba(10, 18, 32, 0.72), rgba(5, 10, 20, 0.66))',
    border: '1px solid rgba(68, 102, 136, 0.42)',
    borderRadius: 5,
    boxShadow: '0 8px 28px rgba(0, 0, 0, 0.22)',
  };
  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 10,
    color: '#667788',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  };
  const actionButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 0',
    background: 'rgba(20, 38, 58, 0.44)',
    border: '1px solid rgba(68, 136, 170, 0.42)',
    borderRadius: 3,
    color: '#aaccee',
    fontFamily: 'monospace',
    fontSize: 11,
    cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s, color 0.15s',
  };

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

  const validateAvatarDimensions = (file: File): Promise<boolean> => new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image.width >= 128 && image.height >= 128 && image.width <= 4096 && image.height <= 4096);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    image.src = url;
  });

  const openAvatarPicker = () => {
    playSfx('ui-click', 0.07);
    if (avatarUploading) return;
    if (isGuest) {
      onLinkAccount();
      return;
    }
    avatarInputRef.current?.click();
  };

  const handleAvatarFile = async (file: File | undefined) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setAvatarError(t('player.avatar_file_error'));
      return;
    }
    if (!(await validateAvatarDimensions(file))) {
      setAvatarError(t('player.avatar_file_error'));
      return;
    }
    setAvatarError(null);
    onChangeAvatar?.(file);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9700,
        background: 'radial-gradient(circle at 50% -10%, rgba(68, 136, 170, 0.13), transparent 36%), rgba(2, 5, 16, 0.97)',
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
          top: 'calc(14px + env(safe-area-inset-top, 0px))',
          right: 'calc(14px + env(safe-area-inset-right, 0px))',
          background: 'rgba(10, 18, 32, 0.44)',
          border: '1px solid rgba(68,102,136,0.42)',
          borderRadius: 3,
          color: '#8899aa',
          fontFamily: 'monospace',
          fontSize: 11,
          padding: '6px 12px',
          cursor: 'pointer',
          transition: 'color 0.15s, border-color 0.15s',
          zIndex: 1,
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.color = '#aabbcc';
          (e.target as HTMLElement).style.borderColor = '#556677';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.color = '#8899aa';
          (e.target as HTMLElement).style.borderColor = 'rgba(68,102,136,0.42)';
        }}
      >
        {t('common.close')}
      </button>

      {/* Content card */}
      <div style={{
        maxWidth: 420,
        width: '100%',
        boxSizing: 'border-box',
        marginTop: 'calc(44px + env(safe-area-inset-top, 0px))',
        marginBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        padding: '22px 20px',
        background: 'linear-gradient(180deg, rgba(5, 10, 20, 0.72), rgba(5, 10, 20, 0.48))',
        border: '1px solid rgba(51, 68, 85, 0.62)',
        borderRadius: 8,
        boxShadow: '0 18px 48px rgba(0, 0, 0, 0.34)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}>
        {/* Avatar */}
        <button
          type="button"
          disabled={avatarUploading}
          onClick={openAvatarPicker}
          title={t('player.avatar_upload')}
          style={{
            position: 'relative',
            width: 78,
            height: 78,
            padding: 0,
            border: 'none',
            borderRadius: '50%',
            background: 'transparent',
            cursor: avatarUploading ? 'wait' : 'pointer',
            opacity: avatarUploading ? 0.72 : 1,
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={t('player.avatar_section')}
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                objectFit: 'cover',
                border: `1px solid ${accentColor}`,
                boxShadow: `0 0 24px ${accentColor}33`,
              }}
            />
          ) : (
            <AvatarSVG color={accentColor} />
          )}
          <span
            style={{
              position: 'absolute',
              right: 2,
              bottom: 3,
              width: 24,
              height: 24,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(5,10,20,0.96)',
              border: `1px solid ${accentColor}`,
              color: accentColor,
              fontSize: 18,
              lineHeight: '20px',
              boxShadow: `0 0 12px ${accentColor}44`,
            }}
          >
            +
          </span>
        </button>

        {/* Name */}
        <div style={{
          fontSize: 14,
          color: '#aabbcc',
          letterSpacing: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          {playerName}
          {isPremium && <ProBadge />}
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

        {/* Avatar controls */}
        <div style={{
          ...panelStyle,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <div style={sectionLabelStyle}>{t('player.avatar_section')}</div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => {
              handleAvatarFile(e.target.files?.[0]);
              e.currentTarget.value = '';
            }}
          />
          {avatarUploading && (
            <div style={{ fontSize: 10, color: accentColor, lineHeight: 1.4 }}>
              {t('player.avatar_uploading')}
            </div>
          )}
          {avatarUrl && onRemoveAvatar && (
            <button
              disabled={avatarUploading}
              onClick={() => { playSfx('ui-click', 0.07); onRemoveAvatar(); }}
              style={{
                ...actionButtonStyle,
                color: '#8899aa',
                opacity: avatarUploading ? 0.65 : 1,
              }}
            >
              {t('player.avatar_remove')}
            </button>
          )}
          {isGuest && (
            <div style={{ fontSize: 10, color: '#667788', lineHeight: 1.4 }}>
              {t('player.avatar_guest_hint')}
            </div>
          )}
          {avatarError && (
            <div style={{ fontSize: 10, color: '#cc8844', lineHeight: 1.4 }}>
              {avatarError}
            </div>
          )}
        </div>

        {/* Quarks section */}
        <div style={{
          ...panelStyle,
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
              ...actionButtonStyle,
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = 'rgba(30, 60, 88, 0.58)';
              (e.target as HTMLElement).style.borderColor = 'rgba(120, 184, 255, 0.54)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = actionButtonStyle.background as string;
              (e.target as HTMLElement).style.borderColor = 'rgba(68, 136, 170, 0.42)';
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
              ...actionButtonStyle,
              padding: '12px 0',
              color: '#7bb8ff',
              fontSize: 12,
              fontWeight: 'bold',
              letterSpacing: 1,
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = 'rgba(68,136,170,0.25)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = actionButtonStyle.background as string;
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
            ...actionButtonStyle,
            color: '#8899aa',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background = 'rgba(30,45,70,0.5)';
            (e.target as HTMLElement).style.color = '#aabbcc';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background = actionButtonStyle.background as string;
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
              ...panelStyle,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <div style={sectionLabelStyle}>
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

              {/* Push notifications toggle — hidden when platform doesn't support Web Push */}
              {onTogglePushNotif && getPushPermissionStatus() !== 'unsupported' && (
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
                ...panelStyle,
                marginTop: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}>
                <div style={sectionLabelStyle}>
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
                setDeleteTypeInput('');
                setShowDeleteModal(true);
              }}
              style={{
                width: '100%',
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid rgba(68,51,51,0.2)',
                borderRadius: 3,
                color: '#443333',
                fontFamily: 'monospace',
                fontSize: 10,
                cursor: 'pointer',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.color = '#cc4444';
                (e.target as HTMLElement).style.borderColor = 'rgba(204,68,68,0.4)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.color = '#443333';
                (e.target as HTMLElement).style.borderColor = 'rgba(68,51,51,0.2)';
              }}
            >
              {t('settings.delete_account')}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account confirmation modal */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9800,
            background: 'rgba(2,5,16,0.96)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowDeleteModal(false); setDeleteTypeInput(''); } }}
        >
          <div style={{
            maxWidth: 320, width: '100%',
            background: 'rgba(10,15,25,0.98)',
            border: '1px solid rgba(204,68,68,0.3)',
            borderRadius: 6,
            padding: '28px 24px',
            display: 'flex', flexDirection: 'column', gap: 16,
            fontFamily: 'monospace',
          }}>
            {/* Title */}
            <div style={{ fontSize: 13, color: '#cc4444', letterSpacing: 1, textTransform: 'uppercase' }}>
              {t('settings.delete_confirm_title')}
            </div>

            {/* Description */}
            <div style={{ fontSize: 11, color: '#8899aa', lineHeight: 1.6 }}>
              {t('settings.delete_confirm_text')}
            </div>

            {/* Type DELETE input */}
            <input
              type="text"
              value={deleteTypeInput}
              onChange={(e) => setDeleteTypeInput(e.target.value)}
              placeholder={t('settings.delete_type_confirm')}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: 'rgba(20,15,15,0.6)',
                border: `1px solid ${deleteTypeInput === 'DELETE' ? 'rgba(204,68,68,0.6)' : 'rgba(51,68,85,0.4)'}`,
                borderRadius: 3,
                color: deleteTypeInput === 'DELETE' ? '#cc4444' : '#aabbcc',
                fontFamily: 'monospace',
                fontSize: 12,
                letterSpacing: 2,
                outline: 'none',
                transition: 'border-color 0.15s, color 0.15s',
                boxSizing: 'border-box',
              }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
            />

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { playSfx('ui-click', 0.07); setShowDeleteModal(false); setDeleteTypeInput(''); }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  background: 'rgba(20,30,50,0.5)',
                  border: '1px solid rgba(51,68,85,0.3)',
                  borderRadius: 3,
                  color: '#8899aa',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                disabled={deleteTypeInput !== 'DELETE'}
                onClick={() => {
                  if (deleteTypeInput !== 'DELETE') return;
                  playSfx('ui-click', 0.07);
                  setShowDeleteModal(false);
                  onDeleteAccount();
                }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  background: deleteTypeInput === 'DELETE' ? 'rgba(204,68,68,0.2)' : 'rgba(20,15,15,0.4)',
                  border: `1px solid ${deleteTypeInput === 'DELETE' ? 'rgba(204,68,68,0.5)' : 'rgba(68,51,51,0.2)'}`,
                  borderRadius: 3,
                  color: deleteTypeInput === 'DELETE' ? '#cc4444' : '#443333',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  cursor: deleteTypeInput === 'DELETE' ? 'pointer' : 'not-allowed',
                  opacity: deleteTypeInput === 'DELETE' ? 1 : 0.5,
                  transition: 'all 0.15s',
                }}
              >
                {t('player.confirm_delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
