import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cometHash } from '@nebulife/core';

// ---------------------------------------------------------------------------
// SignalDecoderGame — terminal code-breaking minigame.
//
// A deep-space signal is encoded as 4 frequency bands (out of 6). The player
// has 6 attempts; after each attempt the terminal reports exact and shifted
// matches, and the live waveform on the oscilloscope becomes cleaner the
// closer the best attempt is to the true code (noise = distance from
// solution). Deterministic per (playerId, date, round) — no reroll scumming.
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
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [current, setCurrent] = useState<number[]>([]);
  const [result, setResult] = useState<'won' | 'lost' | null>(null);
  const finishedRef = useRef(false);

  const bestExact = attempts.reduce((m, a) => Math.max(m, a.exact), 0);

  const submit = () => {
    if (current.length !== SIGNAL_CODE_LENGTH || result) return;
    const { exact, partial } = scoreGuess(code, current);
    const attempt: Attempt = { guess: current, exact, partial, slots: scoreSlots(code, current) };
    const next = [...attempts, attempt];
    setAttempts(next);
    setCurrent([]);
    if (exact === SIGNAL_CODE_LENGTH) {
      setResult('won');
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

      {/* Input row */}
      {!result && (
        <>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {Array.from({ length: SIGNAL_CODE_LENGTH }, (_, i) => (
              <div key={i} style={{
                width: 42, height: 42, borderRadius: 4,
                border: `1px solid ${i === current.length ? '#4488aa' : BORDER}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 19,
                color: current[i] != null ? SYMBOL_COLORS[current[i]] : '#33454f',
                background: 'rgba(4,8,16,0.8)',
              }}>
                {current[i] != null ? SYMBOLS[current[i]] : '\u00b7'}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            {SYMBOLS.map((sym, idx) => (
              <button
                key={sym}
                onClick={() => {
                  if (current.length < SIGNAL_CODE_LENGTH) setCurrent([...current, idx]);
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
              onClick={() => setCurrent(current.slice(0, -1))}
              disabled={current.length === 0}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 4,
                border: `1px solid ${BORDER}`, background: 'rgba(20,30,45,0.7)',
                color: current.length > 0 ? '#8899aa' : '#445566',
                fontFamily: 'monospace', fontSize: 11, cursor: current.length > 0 ? 'pointer' : 'default',
              }}
            >
              {'\u232b'} {t('ops.decoder_erase')}
            </button>
            <button
              onClick={submit}
              disabled={current.length !== SIGNAL_CODE_LENGTH}
              style={{
                flex: 2, padding: '10px 0', borderRadius: 4,
                border: `1px solid ${current.length === SIGNAL_CODE_LENGTH ? '#44ff88' : BORDER}`,
                background: current.length === SIGNAL_CODE_LENGTH ? 'rgba(68,255,136,0.12)' : 'rgba(20,30,45,0.7)',
                color: current.length === SIGNAL_CODE_LENGTH ? '#44ff88' : '#445566',
                fontFamily: 'monospace', fontSize: 11, letterSpacing: 1,
                cursor: current.length === SIGNAL_CODE_LENGTH ? 'pointer' : 'default',
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
