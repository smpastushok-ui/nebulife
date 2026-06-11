import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  COMET_REWARD_QUARKS,
  COMET_REWARD_XP,
  COMET_REWARD_RESOURCES,
  COMET_TRACKING_DURATION_MS,
  type CometSchedule,
} from '@nebulife/core';

// ---------------------------------------------------------------------------
// EventTab — "Comet Herald" live event: countdown to the 24h window, the
// tracking launch during the window, and the claimed state.
// ---------------------------------------------------------------------------

interface EventTabProps {
  schedule: CometSchedule;
  claimed: boolean;
  trackingStartedAt: number | null;
  claiming: boolean;
  onStartTracking: () => void;
}

const BORDER = '#334455';
const ACCENT = '#7bb8ff';

function pad(n: number): string { return String(n).padStart(2, '0'); }

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Procedural comet vignette (SVG, no textures). */
function CometArt() {
  return (
    <svg viewBox="0 0 320 110" style={{ width: '100%', height: 96, display: 'block' }}>
      <defs>
        <radialGradient id="cometCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#dff0ff" />
          <stop offset="45%" stopColor="#7bb8ff" />
          <stop offset="100%" stopColor="rgba(123,184,255,0)" />
        </radialGradient>
        <linearGradient id="cometTail" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(123,184,255,0)" />
          <stop offset="70%" stopColor="rgba(123,184,255,0.28)" />
          <stop offset="100%" stopColor="rgba(223,240,255,0.75)" />
        </linearGradient>
        <linearGradient id="cometTail2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,215,0,0)" />
          <stop offset="100%" stopColor="rgba(255,215,0,0.4)" />
        </linearGradient>
      </defs>
      {/* star field */}
      {Array.from({ length: 26 }, (_, i) => {
        const x = (i * 137.5) % 320;
        const y = (i * 71.3) % 110;
        const r = 0.5 + (i % 3) * 0.35;
        return <circle key={i} cx={x} cy={y} r={r} fill="#aabbcc" opacity={0.25 + (i % 4) * 0.12} />;
      })}
      {/* tails */}
      <polygon points="40,18 245,52 40,40" fill="url(#cometTail2)" opacity="0.7" transform="rotate(2 160 55)" />
      <polygon points="20,30 248,55 20,72" fill="url(#cometTail)" />
      {/* nucleus */}
      <circle cx="248" cy="55" r="22" fill="url(#cometCore)" />
      <circle cx="248" cy="55" r="5" fill="#eef8ff" />
    </svg>
  );
}

export function EventTab({ schedule, claimed, trackingStartedAt, claiming, onStartTracking }: EventTabProps) {
  const { t, i18n } = useTranslation();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const tracking = trackingStartedAt != null && now - trackingStartedAt < COMET_TRACKING_DURATION_MS;
  const trackingPct = trackingStartedAt != null
    ? Math.min(100, ((now - trackingStartedAt) / COMET_TRACKING_DURATION_MS) * 100)
    : 0;

  const windowDate = new Date(schedule.windowStartMs);
  const dateLabel = windowDate.toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'uk-UA', {
    day: 'numeric', month: 'long', timeZone: 'UTC',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Hero */}
      <div style={{
        border: `1px solid ${BORDER}`, borderRadius: 4, overflow: 'hidden',
        background: 'rgba(4,8,16,0.9)',
      }}>
        <CometArt />
        <div style={{ padding: '10px 12px', borderTop: `1px solid ${BORDER}` }}>
          <div style={{ color: ACCENT, fontSize: 13, letterSpacing: 2 }}>{t('ops.comet_name')}</div>
          <div style={{ color: '#ffd700', fontSize: 9, letterSpacing: 1, marginTop: 3 }}>{t('ops.comet_rarity')}</div>
        </div>
      </div>

      {/* State */}
      {claimed ? (
        <div style={{
          border: '1px solid rgba(68,255,136,0.5)', borderRadius: 4, padding: '14px 12px',
          background: 'rgba(68,255,136,0.07)', textAlign: 'center',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <span style={{ color: '#44ff88', fontSize: 12, letterSpacing: 1 }}>{t('ops.comet_claimed_title')}</span>
          <span style={{ color: '#8899aa', fontSize: 10, lineHeight: 1.5 }}>{t('ops.comet_claimed_desc')}</span>
          <span style={{ color: '#667788', fontSize: 9.5 }}>
            {t('ops.comet_next', { time: formatCountdown(schedule.active ? schedule.windowEndMs - now + 13 * 86_400_000 : schedule.msUntilWindow) })}
          </span>
        </div>
      ) : schedule.active ? (
        <div style={{
          border: `1px solid ${ACCENT}`, borderRadius: 4, padding: '14px 12px',
          background: 'rgba(123,184,255,0.07)',
          display: 'flex', flexDirection: 'column', gap: 10,
          animation: 'opsSoftPulse 2.4s infinite',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: ACCENT, fontSize: 12, letterSpacing: 1.5 }}>{t('ops.comet_window_open')}</div>
            <div style={{ color: '#aabbcc', fontSize: 18, marginTop: 6, letterSpacing: 2 }}>
              {formatCountdown(schedule.windowEndMs - now)}
            </div>
            <div style={{ color: '#667788', fontSize: 9, marginTop: 3 }}>{t('ops.comet_window_closes')}</div>
          </div>

          {tracking || claiming ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ color: '#8899aa', fontSize: 10, textAlign: 'center' }}>
                {claiming ? t('ops.comet_claiming') : t('ops.comet_tracking')}
              </div>
              <div style={{ height: 8, border: `1px solid ${BORDER}`, borderRadius: 4, overflow: 'hidden', background: 'rgba(4,8,16,0.8)' }}>
                <div style={{
                  width: `${claiming ? 100 : trackingPct}%`, height: '100%',
                  background: `linear-gradient(90deg, #4488aa, ${ACCENT})`,
                  transition: 'width 0.9s linear',
                }} />
              </div>
              <div style={{ color: '#556677', fontSize: 9, textAlign: 'center' }}>
                {t('ops.comet_tracking_note')}
              </div>
            </div>
          ) : (
            <button
              onClick={onStartTracking}
              style={{
                padding: '12px 0', borderRadius: 4,
                border: `1px solid ${ACCENT}`,
                background: 'rgba(123,184,255,0.14)',
                color: ACCENT, fontFamily: 'monospace', fontSize: 12, letterSpacing: 1.5,
                cursor: 'pointer',
              }}
            >
              {t('ops.comet_start_tracking')}
            </button>
          )}
        </div>
      ) : (
        <div style={{
          border: `1px solid ${BORDER}`, borderRadius: 4, padding: '14px 12px',
          background: 'rgba(20,30,45,0.5)', textAlign: 'center',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <span style={{ color: '#8899aa', fontSize: 10, letterSpacing: 1 }}>
            {t('ops.comet_approaching', { date: dateLabel })}
          </span>
          <span style={{ color: ACCENT, fontSize: 20, letterSpacing: 2 }}>
            {formatCountdown(schedule.msUntilWindow)}
          </span>
          <span style={{ color: '#667788', fontSize: 9.5, lineHeight: 1.6 }}>
            {t('ops.comet_explain')}
          </span>
        </div>
      )}

      {/* Rewards */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, background: 'rgba(20,30,45,0.5)', padding: '10px 12px' }}>
        <div style={{ color: '#aabbcc', fontSize: 10.5, letterSpacing: 1, marginBottom: 8 }}>{t('ops.comet_rewards')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 10 }}>
          <RewardChip color="#ffd700" label={t('ops.comet_reward_quarks', { n: COMET_REWARD_QUARKS })} />
          <RewardChip color="#7bb8ff" label={`+${COMET_REWARD_XP} XP`} />
          <RewardChip color="#9fd0c0" label={t('ops.comet_reward_resources', { n: COMET_REWARD_RESOURCES.minerals })} />
          <RewardChip color="#cc88ff" label={t('ops.comet_reward_archive')} />
        </div>
      </div>
    </div>
  );
}

function RewardChip({ color, label }: { color: string; label: string }) {
  return (
    <div style={{
      border: `1px solid ${color}44`, borderRadius: 3, padding: '7px 9px',
      color, background: `${color}0d`, lineHeight: 1.4,
    }}>
      {label}
    </div>
  );
}
