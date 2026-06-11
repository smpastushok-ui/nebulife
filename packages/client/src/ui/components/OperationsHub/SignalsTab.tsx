import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { utcDayString } from '@nebulife/core';
import { SignalDecoderGame, SIGNAL_MAX_ATTEMPTS } from './SignalDecoderGame.js';

// ---------------------------------------------------------------------------
// SignalsTab — minigame hub. Holds the daily play limit for each game and a
// grid of game cards (one live game now, slots reserved for future ones).
// ---------------------------------------------------------------------------

interface SignalsTabProps {
  playerId: string;
  /** Called once per WON decoder round (XP + research data + directive). */
  onDecodeWin: () => void;
}

const BORDER = '#334455';
export const SIGNAL_PLAYS_PER_DAY = 3;

interface PlaysRecord {
  date: string;
  count: number;
}

function loadPlays(): PlaysRecord {
  try {
    const raw = localStorage.getItem('nebulife_signal_plays');
    if (raw) {
      const parsed = JSON.parse(raw) as PlaysRecord;
      if (parsed.date === utcDayString(Date.now())) return parsed;
    }
  } catch { /* ignore */ }
  return { date: utcDayString(Date.now()), count: 0 };
}

function savePlays(rec: PlaysRecord): void {
  try { localStorage.setItem('nebulife_signal_plays', JSON.stringify(rec)); } catch { /* ignore */ }
}

export function SignalsTab({ playerId, onDecodeWin }: SignalsTabProps) {
  const { t } = useTranslation();
  const [plays, setPlays] = useState<PlaysRecord>(loadPlays);
  const [activeRound, setActiveRound] = useState<number | null>(null);

  const playsLeft = Math.max(0, SIGNAL_PLAYS_PER_DAY - plays.count);

  const startGame = () => {
    if (playsLeft <= 0) return;
    const next = { date: utcDayString(Date.now()), count: plays.count + 1 };
    setPlays(next);
    savePlays(next);
    setActiveRound(next.count); // deterministic per (player, day, round)
  };

  if (activeRound != null) {
    return (
      <SignalDecoderGame
        seed={`${playerId}:${plays.date}:round${activeRound}`}
        onFinish={(won) => { if (won) onDecodeWin(); }}
        onExit={() => setActiveRound(null)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ color: '#667788', fontSize: 10, lineHeight: 1.5 }}>
        {t('ops.signals_intro')}
      </div>

      {/* Live game: Signal Decoder */}
      <div style={{
        border: `1px solid ${playsLeft > 0 ? '#446688' : BORDER}`, borderRadius: 4,
        background: 'rgba(20,30,45,0.5)', padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ color: '#aabbcc', fontSize: 12, letterSpacing: 1 }}>{t('ops.decoder_title')}</span>
          <span style={{ color: playsLeft > 0 ? '#44ff88' : '#667788', fontSize: 9.5 }}>
            {t('ops.plays_left', { left: playsLeft, max: SIGNAL_PLAYS_PER_DAY })}
          </span>
        </div>
        <div style={{ color: '#8899aa', fontSize: 10, lineHeight: 1.5 }}>
          {t('ops.decoder_desc', { attempts: SIGNAL_MAX_ATTEMPTS })}
        </div>
        <button
          onClick={startGame}
          disabled={playsLeft <= 0}
          style={{
            marginTop: 4, padding: '10px 0', borderRadius: 4,
            border: `1px solid ${playsLeft > 0 ? '#44ff88' : BORDER}`,
            background: playsLeft > 0 ? 'rgba(68,255,136,0.1)' : 'rgba(10,15,25,0.6)',
            color: playsLeft > 0 ? '#44ff88' : '#556677',
            fontFamily: 'monospace', fontSize: 11, letterSpacing: 1,
            cursor: playsLeft > 0 ? 'pointer' : 'default',
          }}
        >
          {playsLeft > 0 ? t('ops.decoder_start') : t('ops.plays_exhausted')}
        </button>
      </div>

      {/* Reserved slots for future minigames */}
      {[1, 2].map((i) => (
        <div key={i} style={{
          border: `1px dashed rgba(51,68,85,0.7)`, borderRadius: 4,
          padding: '14px', textAlign: 'center',
          color: '#445566', fontSize: 10, letterSpacing: 1,
        }}>
          {t('ops.game_soon')}
        </div>
      ))}
    </div>
  );
}
