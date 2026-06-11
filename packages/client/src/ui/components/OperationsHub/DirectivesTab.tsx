import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  isDirectiveDone,
  areAllDirectivesDone,
  DIRECTIVE_STREAK_LENGTH,
  DIRECTIVE_REWARD_QUARKS,
  DIRECTIVE_STREAK_REWARD_QUARKS,
  type DailyDirectiveState,
  type DirectiveDef,
} from '@nebulife/core';

// ---------------------------------------------------------------------------
// DirectivesTab — today's 3 tasks, streak progress and the quark claim.
// ---------------------------------------------------------------------------

interface DirectivesTabProps {
  state: DailyDirectiveState;
  directives: DirectiveDef[];
  streak: number;
  claimedToday: boolean;
  claiming: boolean;
  onClaim: () => void;
}

const BORDER = '#334455';

function QuarkGlyph({ size = 12, color = '#ffd700' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke={color} strokeWidth="1.3" style={{ flexShrink: 0, verticalAlign: 'middle' }}>
      <circle cx="8" cy="8" r="2" fill={color} stroke="none" />
      <ellipse cx="8" cy="8" rx="6.5" ry="2.6" />
      <ellipse cx="8" cy="8" rx="6.5" ry="2.6" transform="rotate(60 8 8)" />
      <ellipse cx="8" cy="8" rx="6.5" ry="2.6" transform="rotate(120 8 8)" />
    </svg>
  );
}

export function DirectivesTab({ state, directives, streak, claimedToday, claiming, onClaim }: DirectivesTabProps) {
  const { t } = useTranslation();
  const allDone = areAllDirectivesDone(state, directives);

  // Streak position for TODAY's (potential) claim: if already claimed, the
  // current streak includes today; otherwise the claim would advance it by 1.
  const nextStreak = claimedToday ? streak : streak + 1;
  const isBonusDay = nextStreak % DIRECTIVE_STREAK_LENGTH === 0;
  const todayReward = isBonusDay ? DIRECTIVE_STREAK_REWARD_QUARKS : DIRECTIVE_REWARD_QUARKS;
  // Dots within the current 7-day cycle (1..7).
  const cyclePos = ((nextStreak - 1) % DIRECTIVE_STREAK_LENGTH + DIRECTIVE_STREAK_LENGTH) % DIRECTIVE_STREAK_LENGTH + 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Streak header */}
      <div style={{
        border: `1px solid ${BORDER}`, borderRadius: 4, padding: '10px 12px',
        display: 'flex', flexDirection: 'column', gap: 8,
        background: 'rgba(20,30,45,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ color: '#8899aa', fontSize: 10, letterSpacing: 1 }}>
            {t('ops.streak_label')}
          </span>
          <span style={{ color: '#aabbcc', fontSize: 12 }}>
            {t('ops.streak_days', { count: streak })}
          </span>
        </div>
        {/* 7-day cycle dots */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {Array.from({ length: DIRECTIVE_STREAK_LENGTH }, (_, i) => {
            const day = i + 1;
            const reached = claimedToday ? day <= cyclePos : day < cyclePos;
            const isToday = day === cyclePos && !claimedToday;
            const isBonus = day === DIRECTIVE_STREAK_LENGTH;
            return (
              <div key={day} style={{
                flex: 1, height: 18, borderRadius: 3,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8,
                border: `1px solid ${isBonus ? 'rgba(255,215,0,0.5)' : BORDER}`,
                background: reached
                  ? (isBonus ? 'rgba(255,215,0,0.25)' : 'rgba(68,255,136,0.18)')
                  : isToday ? 'rgba(68,136,170,0.25)' : 'rgba(10,15,25,0.6)',
                color: reached ? (isBonus ? '#ffd700' : '#44ff88') : isBonus ? '#ffd700' : '#556677',
              }}>
                {isBonus ? <><QuarkGlyph size={9} />{'\u00d7'}3</> : day}
              </div>
            );
          })}
        </div>
        {/* Advance notice about the 7-day bonus — explicit, as requested */}
        <div style={{ color: isBonusDay ? '#ffd700' : '#667788', fontSize: 9.5, lineHeight: 1.5 }}>
          {isBonusDay
            ? t('ops.streak_bonus_today', { bonus: DIRECTIVE_STREAK_REWARD_QUARKS })
            : t('ops.streak_promise', { bonus: DIRECTIVE_STREAK_REWARD_QUARKS })}
        </div>
      </div>

      {/* Task cards */}
      {directives.map((def) => {
        const cur = Math.min(state.progress[def.metric] ?? 0, def.target);
        const done = isDirectiveDone(state, def);
        const pct = Math.round((cur / def.target) * 100);
        return (
          <div key={def.id} style={{
            border: `1px solid ${done ? 'rgba(68,255,136,0.45)' : BORDER}`,
            borderRadius: 4, padding: '10px 12px',
            background: done ? 'rgba(68,255,136,0.07)' : 'rgba(20,30,45,0.5)',
            display: 'flex', flexDirection: 'column', gap: 7,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
              <span style={{ color: done ? '#44ff88' : '#aabbcc', fontSize: 11, lineHeight: 1.4 }}>
                {done ? '[OK] ' : '[..] '}
                {t(`ops.${def.labelKey}`, { target: def.target })}
              </span>
              <span style={{ color: '#7bb8ff', fontSize: 10, whiteSpace: 'nowrap' }}>+{def.xp} XP</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 5, background: 'rgba(51,68,85,0.5)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`, height: '100%',
                  background: done ? '#44ff88' : '#4488aa',
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <span style={{ color: '#667788', fontSize: 9.5, minWidth: 38, textAlign: 'right' }}>
                {cur}/{def.target}
              </span>
            </div>
          </div>
        );
      })}

      {/* Claim */}
      <button
        onClick={onClaim}
        disabled={!allDone || claimedToday || claiming}
        style={{
          border: `1px solid ${claimedToday ? BORDER : allDone ? (isBonusDay ? 'rgba(255,215,0,0.7)' : '#44ff88') : BORDER}`,
          borderRadius: 4,
          background: claimedToday
            ? 'rgba(20,30,45,0.5)'
            : allDone
              ? (isBonusDay ? 'rgba(255,215,0,0.14)' : 'rgba(68,255,136,0.12)')
              : 'rgba(20,30,45,0.5)',
          color: claimedToday ? '#667788' : allDone ? (isBonusDay ? '#ffd700' : '#44ff88') : '#556677',
          fontFamily: 'monospace', fontSize: 12, letterSpacing: 1,
          padding: '12px 10px', cursor: allDone && !claimedToday && !claiming ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {claimedToday
          ? t('ops.claimed_today')
          : claiming
            ? t('ops.claiming')
            : (
              <>
                {t('ops.claim_reward')}
                <QuarkGlyph size={13} color={isBonusDay ? '#ffd700' : '#44ff88'} />
                <span>+{todayReward}</span>
              </>
            )}
      </button>

      <div style={{ color: '#556677', fontSize: 9, textAlign: 'center' }}>
        {t('ops.reset_note')}
      </div>
    </div>
  );
}
