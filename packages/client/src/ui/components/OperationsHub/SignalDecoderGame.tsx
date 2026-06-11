import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cometHash } from '@nebulife/core';
import { SignalAudioEngine, rollSignalRarity } from '../../../audio/SignalAudioEngine.js';
import type { SignalRarity } from '../../../audio/SignalAudioEngine.js';

// ---------------------------------------------------------------------------
// SignalDecoderGame — terminal code-breaking minigame.
//
// A deep-space signal is encoded as 4 frequency bands (out of 6). The player
// has 6 attempts; after each attempt the terminal reports exact and shifted
// matches, and the live waveform on the oscilloscope becomes cleaner the
// closer the best attempt is to the true code (noise = distance from
// solution). Deterministic per (playerId, date, round) — no reroll scumming.
//
// Audio: the true signal is a real 5s loop (rarity roll per round) jammed by
// one interference layer per code slot — each symbol is its own noise type.
// An exact-guessed slot locks in: the symbol is written into its cell, that
// slot's noise fades out and the base signal gets 25% louder (see
// SignalAudioEngine). Listening IS a hint — players who learn to tell the
// noise types apart can read part of the code by ear.
// ---------------------------------------------------------------------------

export const SIGNAL_CODE_LENGTH = 4;
export const SIGNAL_SYMBOL_COUNT = 6;
export const SIGNAL_MAX_ATTEMPTS = 6;
export const SIGNAL_REWARD_XP = 25;
export const SIGNAL_REWARD_RESEARCH = 10;

const SYMBOLS = ['\u03b1', '\u03b2', '\u03b3', '\u03b4', '\u03b5', '\u03b6']; // α β γ δ ε ζ
const SYMBOL_COLORS = ['#7bb8ff', '#44ff88', '#ff8844', '#cc88ff', '#ffd700', '#66dddd'];
const SYMBOL_FREQS = [1.0, 1.6, 2.3, 3.1, 4.0, 5.2];

const BORDER = '#334455';

interface SignalDecoderGameProps {
  seed: string;
  onFinish: (won: boolean) => void;
  onExit: () => void;
}

type SlotMark = 'exact' | 'partial' | 'miss';

interface Attempt {
  guess: number[];
  exact: number;
  partial: number;
  slots: SlotMark[];
}

function makeCode(seed: string): number[] {
  const code: number[] = [];
  for (let i = 0; i < SIGNAL_CODE_LENGTH; i++) {
    code.push(cometHash(`${seed}:slot${i}`) % SIGNAL_SYMBOL_COUNT);
  }
  return code;
}

function scoreGuess(code: number[], guess: number[]): { exact: number; partial: number } {
  let exact = 0;
  const codeLeft: number[] = [];
  const guessLeft: number[] = [];
  for (let i = 0; i < code.length; i++) {
    if (guess[i] === code[i]) exact++;
    else { codeLeft.push(code[i]); guessLeft.push(guess[i]); }
  }
  let partial = 0;
  for (const g of guessLeft) {
    const idx = codeLeft.indexOf(g);
    if (idx >= 0) { partial++; codeLeft.splice(idx, 1); }
  }
  return { exact, partial };
}

/** Wordle-style per-slot marks: exact (right symbol, right slot), partial
 *  (symbol exists elsewhere in the code), miss. Duplicates handled the
 *  standard way — exacts consume code symbols first, then partials
 *  left-to-right. */
function scoreSlots(code: number[], guess: number[]): SlotMark[] {
  const marks: SlotMark[] = new Array(code.length).fill('miss');
  const remaining: number[] = [];
  for (let i = 0; i < code.length; i++) {
    if (guess[i] === code[i]) marks[i] = 'exact';
    else remaining.push(code[i]);
  }
  for (let i = 0; i < code.length; i++) {
    if (marks[i] === 'exact') continue;
    const idx = remaining.indexOf(guess[i]);
    if (idx >= 0) { marks[i] = 'partial'; remaining.splice(idx, 1); }
  }
  return marks;
}

const SLOT_MARK_STYLE: Record<SlotMark, { border: string; background: string }> = {
  exact: { border: '#44ff88', background: 'rgba(68,255,136,0.35)' },
  partial: { border: '#ff8844', background: 'rgba(255,136,68,0.22)' },
  miss: { border: '#33454f', background: 'transparent' },
};

const RARITY_COLORS: Record<SignalRarity, string> = {
  common: '#8899aa',
  uncommon: '#44ff88',
  rare: '#7bb8ff',
  epic: '#cc88ff',
  legendary: '#ffd700',
};

const SOUND_MUTE_KEY = 'nebulife_decoder_muted';

/** Oscilloscope: target waveform + noise scaled by how far the player is. */
function Waveform({ code, bestExact, won }: { code: number[]; bestExact: number; won: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef(0);
  const stateRef = useRef({ code, bestExact, won });
  stateRef.current = { code, bestExact, won };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let noiseSeed = 1;
    const rand = () => {
      noiseSeed = (noiseSeed * 1103515245 + 12345) & 0x7fffffff;
      return noiseSeed / 0x7fffffff - 0.5;
    };

    const draw = () => {
      const { code: c, bestExact: be, won: w } = stateRef.current;
      const width = canvas.width;
      const height = canvas.height;
      const mid = height / 2;
      phaseRef.current += 0.035;

      ctx.fillStyle = 'rgba(4,8,16,1)';
      ctx.fillRect(0, 0, width, height);

      // grid
      ctx.strokeStyle = 'rgba(51,68,85,0.35)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < width; gx += 24) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, height); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(width, mid); ctx.stroke();

      const noiseAmp = w ? 0 : (1 - be / SIGNAL_CODE_LENGTH) * 0.55;
      ctx.strokeStyle = w ? '#44ff88' : '#7bb8ff';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 2) {
        const tx = x / width * Math.PI * 2;
        let y = 0;
        for (const sym of c) {
          y += Math.sin(tx * SYMBOL_FREQS[sym] * 2 + phaseRef.current) / c.length;
        }
        y += rand() * noiseAmp * 2;
        const py = mid + y * (height * 0.36);
        if (x === 0) ctx.moveTo(x, py); else ctx.lineTo(x, py);
      }
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={560}
      height={110}
      style={{
        width: '100%', height: 86, display: 'block',
        border: `1px solid ${BORDER}`, borderRadius: 4,
        background: '#040810',
      }}
    />
  );
}

export function SignalDecoderGame({ seed, onFinish, onExit }: SignalDecoderGameProps) {
  const { t } = useTranslation();
  const code = useMemo(() => makeCode(seed), [seed]);
  const rarity = useMemo<SignalRarity>(() => rollSignalRarity(cometHash(`${seed}:rarity`)), [seed]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  // Symbols picked for the UNSOLVED slots only (in left-to-right slot order);
  // solved slots are locked and auto-filled from the code.
  const [picks, setPicks] = useState<number[]>([]);
  const [solved, setSolved] = useState<boolean[]>(() => new Array(SIGNAL_CODE_LENGTH).fill(false));
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem(SOUND_MUTE_KEY) === '1'; } catch { return false; }
  });
  const [result, setResult] = useState<'won' | 'lost' | null>(null);
  const finishedRef = useRef(false);
  const engineRef = useRef<SignalAudioEngine | null>(null);

  const bestExact = attempts.reduce((m, a) => Math.max(m, a.exact), 0);
  const unsolvedCount = solved.reduce((n, s) => n + (s ? 0 : 1), 0);

  // Live signal audio: base loop + one interference layer per code slot
  useEffect(() => {
    const engine = new SignalAudioEngine();
    engineRef.current = engine;
    engine.setMuted(muted);
    void engine.start(code, rarity, cometHash(`${seed}:audio`));
    return () => { engine.stop(); engineRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    engineRef.current?.setMuted(next);
    try { localStorage.setItem(SOUND_MUTE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
  };

  // Full guess = solved slots from code + player picks for the rest
  const buildGuess = (): number[] => {
    const guess: number[] = [];
    let p = 0;
    for (let i = 0; i < SIGNAL_CODE_LENGTH; i++) {
      guess.push(solved[i] ? code[i] : picks[p++]);
    }
    return guess;
  };

  const submit = () => {
    if (picks.length !== unsolvedCount || result) return;
    const guess = buildGuess();
    const { exact, partial } = scoreGuess(code, guess);
    const attempt: Attempt = { guess, exact, partial, slots: scoreSlots(code, guess) };
    const next = [...attempts, attempt];
    setAttempts(next);
    setPicks([]);
    // Lock newly decoded slots: symbol written into its cell, noise layer off,
    // base signal +25% louder per slot (user-facing "decoding" feedback)
    const nextSolved = solved.map((s, i) => s || guess[i] === code[i]);
    setSolved(nextSolved);
    engineRef.current?.setSolved(nextSolved);
    if (exact === SIGNAL_CODE_LENGTH) {
      setResult('won');
      engineRef.current?.win();
      if (!finishedRef.current) { finishedRef.current = true; onFinish(true); }
    } else if (next.length >= SIGNAL_MAX_ATTEMPTS) {
      setResult('lost');
      if (!finishedRef.current) { finishedRef.current = true; onFinish(false); }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Terminal header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#44ff88', fontSize: 10, letterSpacing: 1 }}>
          {'>'} {t('ops.decoder_header')}
        </span>
        <button onClick={onExit} style={{
          background: 'none', border: `1px solid ${BORDER}`, borderRadius: 3,
          color: '#8899aa', fontFamily: 'monospace', fontSize: 9, padding: '3px 8px', cursor: 'pointer',
        }}>
          {t('ops.decoder_back')}
        </button>
      </div>

      <Waveform code={code} bestExact={bestExact} won={result === 'won'} />

      {/* Signal classification + sound toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, letterSpacing: 1, color: '#667788' }}>
          {t('ops.decoder_signal_label')}:{' '}
          <span style={{ color: RARITY_COLORS[rarity] }}>{t(`ops.signal_${rarity}`)}</span>
        </span>
        <button onClick={toggleMute} style={{
          background: 'none', border: `1px solid ${muted ? BORDER : '#446688'}`, borderRadius: 3,
          color: muted ? '#667788' : '#7bb8ff', fontFamily: 'monospace', fontSize: 9,
          padding: '3px 8px', cursor: 'pointer', letterSpacing: 0.5,
        }}>
          {muted ? t('ops.decoder_sound_off') : t('ops.decoder_sound_on')}
        </button>
      </div>

      <div style={{ color: '#667788', fontSize: 9.5, lineHeight: 1.5 }}>
        {t('ops.decoder_hint', { length: SIGNAL_CODE_LENGTH, attempts: SIGNAL_MAX_ATTEMPTS })}
      </div>

      {/* Attempt log */}
      <div style={{
        border: `1px solid ${BORDER}`, borderRadius: 4, padding: '8px 10px',
        background: 'rgba(4,8,16,0.8)', minHeight: 120,
        display: 'flex', flexDirection: 'column', gap: 5,
      }}>
        {attempts.length === 0 && (
          <span style={{ color: '#445566', fontSize: 10 }}>{t('ops.decoder_awaiting')}</span>
        )}
        {attempts.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
            <span style={{ color: '#556677', fontSize: 9, minWidth: 28 }}>[{String(i + 1).padStart(2, '0')}]</span>
            <span style={{ display: 'flex', gap: 6 }}>
              {a.guess.map((g, j) => (
                <span key={j} style={{ color: SYMBOL_COLORS[g] }}>{SYMBOLS[g]}</span>
              ))}
            </span>
            {/* Per-slot frames: position j mirrors guess symbol j. Green =
                right symbol in the right slot, orange = symbol exists in
                another slot, dim = not in code. */}
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {a.slots.map((mark, j) => (
                <span key={j} style={{
                  width: 13, height: 13, borderRadius: 3, boxSizing: 'border-box',
                  border: `1px solid ${SLOT_MARK_STYLE[mark].border}`,
                  background: SLOT_MARK_STYLE[mark].background,
                  display: 'inline-block',
                }} />
              ))}
            </span>
          </div>
        ))}
      </div>

      {/* Result banner */}
      {result && (
        <div style={{
          border: `1px solid ${result === 'won' ? '#44ff88' : '#cc4444'}`,
          borderRadius: 4, padding: '10px 12px', textAlign: 'center',
          background: result === 'won' ? 'rgba(68,255,136,0.1)' : 'rgba(204,68,68,0.1)',
          color: result === 'won' ? '#44ff88' : '#cc4444', fontSize: 11, lineHeight: 1.6,
        }}>
          {result === 'won'
            ? t('ops.decoder_won', { xp: SIGNAL_REWARD_XP, rd: SIGNAL_REWARD_RESEARCH })
            : (
              <>
                {t('ops.decoder_lost')}{' '}
                <span style={{ display: 'inline-flex', gap: 5 }}>
                  {code.map((c2, i) => <span key={i} style={{ color: SYMBOL_COLORS[c2] }}>{SYMBOLS[c2]}</span>)}
                </span>
              </>
            )}
        </div>
      )}

      {/* Input row — decoded slots are locked: the symbol is written into its
          cell, only the remaining slots accept input */}
      {!result && (
        <>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {(() => {
              const values: Array<number | null> = [];
              let cursorSlot = -1;
              let p = 0;
              for (let i = 0; i < SIGNAL_CODE_LENGTH; i++) {
                if (solved[i]) { values.push(code[i]); continue; }
                values.push(p < picks.length ? picks[p] : null);
                if (p >= picks.length && cursorSlot === -1) cursorSlot = i;
                p++;
              }
              return values.map((value, i) => (
                <div key={i} style={{
                  width: 42, height: 42, borderRadius: 4,
                  border: `1px solid ${solved[i] ? '#44ff88' : (i === cursorSlot ? '#4488aa' : BORDER)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 19,
                  color: value != null ? SYMBOL_COLORS[value] : '#33454f',
                  background: solved[i] ? 'rgba(68,255,136,0.1)' : 'rgba(4,8,16,0.8)',
                }}>
                  {value != null ? SYMBOLS[value] : '\u00b7'}
                </div>
              ));
            })()}
          </div>

          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            {SYMBOLS.map((sym, idx) => (
              <button
                key={sym}
                onClick={() => {
                  if (picks.length < unsolvedCount) setPicks([...picks, idx]);
                }}
                style={{
                  width: 46, height: 40, borderRadius: 4,
                  border: `1px solid ${BORDER}`,
                  background: 'rgba(20,30,45,0.7)',
                  color: SYMBOL_COLORS[idx], fontFamily: 'monospace', fontSize: 17,
                  cursor: 'pointer',
                }}
              >
                {sym}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setPicks(picks.slice(0, -1))}
              disabled={picks.length === 0}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 4,
                border: `1px solid ${BORDER}`, background: 'rgba(20,30,45,0.7)',
                color: picks.length > 0 ? '#8899aa' : '#445566',
                fontFamily: 'monospace', fontSize: 11, cursor: picks.length > 0 ? 'pointer' : 'default',
              }}
            >
              {'\u232b'} {t('ops.decoder_erase')}
            </button>
            <button
              onClick={submit}
              disabled={picks.length !== unsolvedCount}
              style={{
                flex: 2, padding: '10px 0', borderRadius: 4,
                border: `1px solid ${picks.length === unsolvedCount ? '#44ff88' : BORDER}`,
                background: picks.length === unsolvedCount ? 'rgba(68,255,136,0.12)' : 'rgba(20,30,45,0.7)',
                color: picks.length === unsolvedCount ? '#44ff88' : '#445566',
                fontFamily: 'monospace', fontSize: 11, letterSpacing: 1,
                cursor: picks.length === unsolvedCount ? 'pointer' : 'default',
              }}
            >
              {t('ops.decoder_transmit')} [{attempts.length + 1}/{SIGNAL_MAX_ATTEMPTS}]
            </button>
          </div>
        </>
      )}
      {result && (
        <button onClick={onExit} style={{
          padding: '10px 0', borderRadius: 4,
          border: `1px solid ${BORDER}`, background: 'rgba(20,30,45,0.7)',
          color: '#8899aa', fontFamily: 'monospace', fontSize: 11, cursor: 'pointer',
        }}>
          {t('ops.decoder_back')}
        </button>
      )}
    </div>
  );
}
