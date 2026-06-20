import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { SPARK_DIFFICULTY, type LifeSparkType } from '@nebulife/core';
import { SPARK_COLOR } from './ElementResultCard.js';

const BASES = ['A', 'T', 'G', 'C'] as const;
const BASE_COLOR: Record<string, string> = {
  A: '#44ff88', T: '#4ac6e8', G: '#ffcf66', C: '#ff7d9b',
};
const COMPLEMENT: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G' };
/** Hydrogen bonds per pair — A=T is a double bond, G≡C a triple. */
const BOND_COUNT: Record<string, number> = { A: 2, T: 2, G: 3, C: 3 };

const SPARK_ORDER: LifeSparkType[] = ['primordial', 'adaptive', 'neural', 'stellar'];

const ROW = 40;
const AMP = 30;
const CENTER_X = 150;

// Scoped keyframes (injected once with the modal). Procedural, no assets.
const DNAC_CSS = `
@keyframes dnac-pulse { 0%,100%{box-shadow:0 0 0 0 transparent} 50%{box-shadow:0 0 13px 1px var(--dnac-accent)} }
@keyframes dnac-snap { 0%{transform:translate(-50%,-50%) scale(0.3);opacity:0} 55%{transform:translate(-50%,-50%) scale(1.22)} 100%{transform:translate(-50%,-50%) scale(1);opacity:1} }
@keyframes dnac-bond { from{opacity:0;transform:scaleX(0.15)} to{opacity:1;transform:scaleX(1)} }
@keyframes dnac-shake { 0%,100%{transform:translateX(0)} 18%{transform:translateX(-7px)} 38%{transform:translateX(7px)} 58%{transform:translateX(-5px)} 78%{transform:translateX(4px)} }
@keyframes dnac-flow { to { stroke-dashoffset: -42 } }
@keyframes dnac-ignite { 0%,100%{filter:drop-shadow(0 0 5px var(--dnac-accent))} 50%{filter:drop-shadow(0 0 20px var(--dnac-accent))} }
@keyframes dnac-weave { 0%,100%{opacity:0.5} 50%{opacity:1} }
`;

function randomTemplate(length: number, baseCount: number): string[] {
  const pool = BASES.slice(0, baseCount);
  const out: string[] = [];
  for (let i = 0; i < length; i++) out.push(pool[Math.floor(Math.random() * pool.length)]);
  return out;
}

/** Helix x-offset for rung i (the side-on double-helix weave). */
function weaveOffset(i: number): number {
  return AMP * Math.sin(i * 0.7);
}

/** Small decorative double-helix with energy flowing along the strands. */
function MiniHelix({ color }: { color: string }) {
  const h = 46;
  const w = 26;
  const cx = w / 2;
  const amp = 7;
  const left: string[] = [];
  const right: string[] = [];
  for (let y = 0; y <= h; y += 2) {
    const o = amp * Math.sin((y / h) * Math.PI * 3);
    left.push(`${cx + o},${y}`);
    right.push(`${cx - o},${y}`);
  }
  const rungs = [];
  for (let y = 4; y < h; y += 8) {
    const o = amp * Math.sin((y / h) * Math.PI * 3);
    rungs.push(<line key={y} x1={cx + o} y1={y} x2={cx - o} y2={y} stroke={`${color}88`} strokeWidth={1} />);
  }
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      {rungs}
      <polyline points={left.join(' ')} fill="none" stroke={color} strokeWidth={1.6}
        strokeDasharray="6 6" style={{ animation: 'dnac-flow 1.4s linear infinite' }} />
      <polyline points={right.join(' ')} fill="none" stroke={color} strokeWidth={1.6}
        strokeDasharray="6 6" style={{ animation: 'dnac-flow 1.4s linear infinite reverse' }} />
    </svg>
  );
}

function BaseTile({ base, dim, size = 28 }: { base: string; dim?: boolean; size?: number }) {
  const c = BASE_COLOR[base] ?? '#667788';
  return (
    <span style={{
      width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 5, border: `1px solid ${dim ? '#33414f' : c}`,
      background: dim ? 'rgba(5,10,20,0.6)' : `${c}26`,
      color: dim ? '#33414f' : c, fontWeight: 700, fontSize: size * 0.5,
    }}>{dim ? '?' : base}</span>
  );
}

/**
 * Spark-of-life DNA constructor minigame — a side-on double helix the player
 * splices rung by rung. For each base pair they must select the *complementary*
 * nucleotide (A↔T, G↔C). Difficulty scales with spark rarity: longer strands,
 * more base types, and a memorisation window after which the template hides and
 * the strand must be completed from memory. Mistakes erode genome stability;
 * a full correct strand ignites the spark. Procedural / monospace, no sprites.
 */
export function DnaConstructorGame({
  onSuccess,
  onClose,
}: {
  onSuccess: (spark: LifeSparkType) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [spark, setSpark] = useState<LifeSparkType | null>(null);
  const [template, setTemplate] = useState<string[]>([]);
  const [built, setBuilt] = useState<(string | null)[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [hideTemplate, setHideTemplate] = useState(false);
  const [status, setStatus] = useState<'play' | 'memorize' | 'won' | 'lost'>('play');
  const [mistakes, setMistakes] = useState(0);
  const [memLeft, setMemLeft] = useState(0);
  const [shake, setShake] = useState(false);

  const diff = spark ? SPARK_DIFFICULTY[spark] : null;
  const accent = spark ? SPARK_COLOR[spark] : '#7bb8ff';
  const target = useMemo(() => template.map((b) => COMPLEMENT[b]), [template]);
  const maxMistakes = diff ? Math.max(3, Math.ceil(diff.length / 3)) : 3;
  const stabilityPct = Math.max(0, Math.round((1 - mistakes / maxMistakes) * 100));
  const stabilityColor = stabilityPct > 60 ? '#44ff88' : stabilityPct > 30 ? '#ffb454' : '#ff6b6b';

  // Memorisation countdown — hide the template once it elapses.
  useEffect(() => {
    if (status !== 'memorize') return;
    if (memLeft <= 0) { setHideTemplate(true); setStatus('play'); return; }
    const id = window.setTimeout(() => setMemLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [status, memLeft]);

  function startSpark(s: LifeSparkType) {
    const d = SPARK_DIFFICULTY[s];
    setSpark(s);
    setTemplate(randomTemplate(d.length, d.bases));
    setBuilt(Array(d.length).fill(null));
    setActiveIdx(0);
    setMistakes(0);
    if (d.memorizeSeconds > 0) {
      setHideTemplate(false);
      setMemLeft(d.memorizeSeconds);
      setStatus('memorize');
    } else {
      setHideTemplate(false);
      setStatus('play');
    }
  }

  function triggerShake() {
    setShake(true);
    window.setTimeout(() => setShake(false), 440);
  }

  function placeBase(base: string) {
    if (status !== 'play' || !spark) return;
    const idx = activeIdx;
    if (idx >= target.length) return;
    if (base !== target[idx]) {
      const m = mistakes + 1;
      setMistakes(m);
      triggerShake();
      if (m >= maxMistakes) setStatus('lost');
      return;
    }
    const next = built.slice();
    next[idx] = base;
    setBuilt(next);
    const nextIdx = idx + 1;
    setActiveIdx(nextIdx);
    if (nextIdx >= target.length) {
      setStatus('won');
      onSuccess(spark);
    }
  }

  // Reveal the template base for a rung only when memorisation is over OR the
  // rung is already solved (positive feedback when recalling from memory).
  const showTemplateAt = (i: number) => !hideTemplate || i < activeIdx || status !== 'play';

  return createPortal((
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 12000,
        background: 'rgba(2,5,16,0.84)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, fontFamily: 'monospace',
      }}
    >
      <style>{DNAC_CSS}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(460px, 96vw)', maxHeight: '92vh', overflowY: 'auto',
          background: 'rgba(10,15,25,0.97)', border: `1px solid ${accent}`,
          borderRadius: 6, boxShadow: `0 0 32px ${accent}33`, padding: 18,
          // CSS var consumed by the keyframes.
          ['--dnac-accent' as string]: accent,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <MiniHelix color={accent} />
            <div>
              <div style={{ color: accent, fontSize: 14, fontWeight: 700, letterSpacing: 0.5 }}>{t('lab.dna_title')}</div>
              <div style={{ color: '#667788', fontSize: 9.5 }}>{t('lab.dna_subtitle')}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #334455', color: '#8899aa', borderRadius: 3, width: 24, height: 24, cursor: 'pointer', lineHeight: 1, alignSelf: 'flex-start' }}>×</button>
        </div>

        {/* Pairing legend */}
        <div style={{ display: 'flex', gap: 8, margin: '10px 0 14px' }}>
          {[['A', 'T'], ['G', 'C']].map(([a, b]) => (
            <span key={a} style={{
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#8899aa',
              border: '1px solid #2a3645', borderRadius: 4, padding: '3px 8px',
            }}>
              <span style={{ color: BASE_COLOR[a], fontWeight: 700 }}>{a}</span>
              <span style={{ color: '#556677', letterSpacing: -1 }}>{BOND_COUNT[a] === 3 ? '≡' : '='}</span>
              <span style={{ color: BASE_COLOR[b], fontWeight: 700 }}>{b}</span>
            </span>
          ))}
          <span style={{ flex: 1 }} />
        </div>

        {!spark ? (
          <>
            <div style={{ color: '#8899aa', fontSize: 11, marginBottom: 12, lineHeight: 1.5 }}>{t('lab.dna_choose')}</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {SPARK_ORDER.map((s) => {
                const c = SPARK_COLOR[s];
                const d = SPARK_DIFFICULTY[s];
                return (
                  <button
                    key={s}
                    onClick={() => startSpark(s)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                      background: `${c}12`, border: `1px solid ${c}66`, borderRadius: 6,
                      padding: '10px 12px', cursor: 'pointer', fontFamily: 'monospace',
                    }}
                  >
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: c, boxShadow: `0 0 10px ${c}`, flexShrink: 0 }} />
                    <span style={{ flex: 1, color: '#cfe3ff', fontSize: 12 }}>{t(`lab.spark.${s}` as 'lab.spark.primordial')}</span>
                    <span style={{ display: 'flex', gap: 6, color: '#8899aa', fontSize: 9 }}>
                      <span>{t('lab.dna_pairs', { count: d.length })}</span>
                      <span style={{ color: '#556677' }}>·</span>
                      <span>{t('lab.dna_bases', { count: d.bases })}</span>
                      {d.memorizeSeconds > 0 && <><span style={{ color: '#556677' }}>·</span><span style={{ color: '#ffb454' }}>{t('lab.dna_memory_tag')}</span></>}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* Progress + genome stability */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ color: '#8899aa', fontSize: 10 }}>{t('lab.dna_progress', { done: activeIdx, total: target.length })}</span>
              <span style={{ color: stabilityColor, fontSize: 9.5, letterSpacing: 0.5 }}>{t('lab.dna_stability')} {stabilityPct}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(5,10,20,0.7)', overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ width: `${stabilityPct}%`, height: '100%', background: stabilityColor, transition: 'width 0.3s, background 0.3s' }} />
            </div>

            {/* Phase banner */}
            {status === 'memorize' ? (
              <div style={{ color: '#ffcf66', fontSize: 11, marginBottom: 10, textAlign: 'center' }}>
                {t('lab.dna_memorize', { seconds: memLeft })}
              </div>
            ) : status === 'play' && hideTemplate ? (
              <div style={{ color: '#7d93ab', fontSize: 10.5, marginBottom: 10, textAlign: 'center' }}>{t('lab.dna_recall')}</div>
            ) : (
              <div style={{ color: '#7d93ab', fontSize: 10.5, marginBottom: 10, textAlign: 'center' }}>{t('lab.dna_select')}</div>
            )}

            {/* Helix ladder */}
            <div style={{
              position: 'relative', width: '100%', height: target.length * ROW + 8,
              margin: '0 auto 14px',
              animation: shake ? 'dnac-shake 0.44s' : status === 'won' ? 'dnac-ignite 1.6s ease-in-out infinite' : undefined,
            }}>
              {/* Backbone rails (decorative weave) */}
              <svg width="100%" height={target.length * ROW + 8} viewBox={`0 0 ${CENTER_X * 2} ${target.length * ROW + 8}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
                {(() => {
                  const ptsL: string[] = [];
                  const ptsR: string[] = [];
                  for (let i = 0; i <= target.length; i++) {
                    const y = i * ROW + 4;
                    const o = weaveOffset(i - 0.5);
                    ptsL.push(`${CENTER_X + o},${y}`);
                    ptsR.push(`${CENTER_X - o},${y}`);
                  }
                  return (
                    <>
                      <polyline points={ptsL.join(' ')} fill="none" stroke={`${accent}55`} strokeWidth={2} />
                      <polyline points={ptsR.join(' ')} fill="none" stroke={`${accent}55`} strokeWidth={2} />
                    </>
                  );
                })()}
              </svg>

              {target.map((_, i) => {
                const o = weaveOffset(i);
                const tplX = CENTER_X + o;
                const compX = CENTER_X - o;
                const y = i * ROW + ROW / 2 + 2;
                const filled = built[i];
                const isActive = status === 'play' && i === activeIdx;
                const bonds = BOND_COUNT[template[i]] ?? 2;
                const minX = Math.min(tplX, compX);
                const maxX = Math.max(tplX, compX);
                return (
                  <div key={i}>
                    {/* Bond connector */}
                    <div style={{
                      position: 'absolute', top: y, left: minX, width: maxX - minX, height: 0,
                      transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column',
                      justifyContent: 'center', gap: 2, pointerEvents: 'none',
                    }}>
                      {Array.from({ length: bonds }).map((_, b) => (
                        <div key={b} style={{
                          height: 1.5, borderRadius: 1,
                          background: filled ? `${BASE_COLOR[filled]}cc` : 'rgba(80,100,120,0.35)',
                          transformOrigin: 'center',
                          animation: filled ? 'dnac-bond 0.35s ease-out' : undefined,
                        }} />
                      ))}
                    </div>
                    {/* Template nucleotide */}
                    <div style={{ position: 'absolute', top: y, left: tplX, transform: 'translate(-50%,-50%)' }}>
                      <BaseTile base={template[i]} dim={!showTemplateAt(i)} />
                    </div>
                    {/* Complement slot */}
                    <div style={{
                      position: 'absolute', top: y, left: compX, transform: 'translate(-50%,-50%)',
                      borderRadius: 6,
                      animation: isActive ? 'dnac-pulse 1.1s ease-in-out infinite' : undefined,
                    }}>
                      {filled ? (
                        <span style={{
                          width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: 5, border: `1px solid ${BASE_COLOR[filled]}`, background: `${BASE_COLOR[filled]}26`,
                          color: BASE_COLOR[filled], fontWeight: 700, fontSize: 14,
                          position: 'absolute', top: '50%', left: '50%',
                          animation: 'dnac-snap 0.3s ease-out',
                        }}>{filled}</span>
                      ) : (
                        <span style={{
                          width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: 5, border: `1px dashed ${isActive ? accent : '#33414f'}`,
                          background: isActive ? `${accent}14` : 'rgba(5,10,20,0.5)',
                          color: isActive ? accent : '#33414f', fontWeight: 700, fontSize: 13,
                        }}>{isActive ? '+' : '·'}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Nucleotide tray */}
            {(status === 'play' || status === 'memorize') && (
              <div style={{ display: 'flex', gap: 8 }}>
                {BASES.slice(0, diff?.bases ?? 2).map((b) => (
                  <button
                    key={b}
                    disabled={status !== 'play'}
                    onClick={() => placeBase(b)}
                    style={{
                      flex: 1, padding: '13px 0', borderRadius: 6,
                      cursor: status === 'play' ? 'pointer' : 'default',
                      opacity: status === 'play' ? 1 : 0.4,
                      background: `${BASE_COLOR[b]}1f`, border: `1px solid ${BASE_COLOR[b]}`,
                      color: BASE_COLOR[b], fontFamily: 'monospace', fontSize: 17, fontWeight: 700,
                    }}
                  >{b}</button>
                ))}
              </div>
            )}

            {status === 'won' && (
              <div style={{ textAlign: 'center', padding: '6px 0' }}>
                <div style={{ color: accent, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{t('lab.dna_won')}</div>
                <button onClick={onClose} style={{ background: `${accent}22`, border: `1px solid ${accent}`, color: '#eafff2', borderRadius: 6, padding: '10px 18px', cursor: 'pointer', fontFamily: 'monospace', letterSpacing: 1 }}>{t('lab.dna_collect')}</button>
              </div>
            )}

            {status === 'lost' && (
              <div style={{ textAlign: 'center', padding: '6px 0' }}>
                <div style={{ color: '#cc7777', fontSize: 12, marginBottom: 10 }}>{t('lab.dna_lost')}</div>
                <button onClick={() => spark && startSpark(spark)} style={{ background: 'rgba(204,119,119,0.16)', border: '1px solid #cc7777', color: '#ffd0d0', borderRadius: 6, padding: '9px 16px', cursor: 'pointer', fontFamily: 'monospace', letterSpacing: 1 }}>{t('lab.dna_retry')}</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  ), document.body);
}
