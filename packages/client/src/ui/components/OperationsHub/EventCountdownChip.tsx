import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CometSchedule } from '@nebulife/core';

// ---------------------------------------------------------------------------
// EventCountdownChip — fixed bottom pill counting down to the comet window.
// Visually a calmer sibling of the evacuation countdown (blue, no alarm red).
// Shown from 5 days before the window until it closes (hidden once claimed).
// ---------------------------------------------------------------------------

const SHOW_BEFORE_MS = 5 * 86_400_000;

interface EventCountdownChipProps {
  schedule: CometSchedule;
  claimed: boolean;
  onClick: () => void;
}

function pad(n: number): string { return String(n).padStart(2, '0'); }

function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function EventCountdownChip({ schedule, claimed, onClick }: EventCountdownChipProps) {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (claimed) return null;
  if (!schedule.active && schedule.msUntilWindow > SHOW_BEFORE_MS) return null;

  const active = schedule.active;
  const remaining = active ? schedule.windowEndMs - now : schedule.windowStartMs - now;

  return (
    <>
      <style>{`
        @keyframes cometChipGlow {
          0%, 100% { border-color: rgba(123,184,255,0.45); }
          50% { border-color: rgba(123,184,255,0.95); }
        }
      `}</style>
      <button
        onClick={onClick}
        style={{
          position: 'fixed',
          bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9450,
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(5,10,20,0.92)',
          border: '1px solid rgba(123,184,255,0.45)',
          borderRadius: 4,
          padding: '6px 12px',
          fontFamily: 'monospace',
          cursor: 'pointer',
          animation: active ? 'cometChipGlow 2s infinite' : undefined,
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* tiny comet glyph */}
        <svg width="14" height="14" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
          <polygon points="1,5 11,7.4 1,9" fill="rgba(123,184,255,0.35)" />
          <circle cx="11.5" cy="7.5" r="3" fill="#7bb8ff" />
          <circle cx="11.5" cy="7.5" r="1.2" fill="#eef8ff" />
        </svg>
        <span style={{ color: '#8899aa', fontSize: 9, letterSpacing: 1 }}>
          {active ? t('ops.chip_active') : t('ops.chip_upcoming')}
        </span>
        <span style={{ color: '#7bb8ff', fontSize: 11, letterSpacing: 1 }}>
          {fmt(remaining)}
        </span>
      </button>
    </>
  );
}
