import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SPARK_DIFFICULTY, type LifeSparkType } from '@nebulife/core';
import { SPARK_COLOR } from './ElementResultCard.js';

const BASES = ['A', 'T', 'G', 'C'] as const;
const BASE_COLOR: Record<string, string> = {
  A: '#44ff88', T: '#4ac6e8', G: '#ffcf66', C: '#ff7d9b',
};
const COMPLEMENT: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G' };

const SPARK_ORDER: LifeSparkType[] = ['primordial', 'adaptive', 'neural', 'stellar'];

function randomTemplate(length: number, baseCount: number): string[] {
  const pool = BASES.slice(0, baseCount);
  const out: string[] = [];
  for (let i = 0; i < length; i++) out.push(pool[Math.floor(Math.random() * pool.length)]);
  return out;
}

/**
 * Spark-of-life DNA constructor minigame. The player picks a target spark
 * (difficulty scales with rarity), studies a template strand, then rebuilds the
 * *complementary* strand base-by-base (A↔T, G↔C). A full correct strand grants
 * the spark via {@link onSuccess}. Procedural / monospace, no sprites.
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
  const [built, setBuilt] = useState<string[]>([]);
  const [hideTemplate, setHideTemplate] = useState(false);
  const [status, setStatus] = useState<'play' | 'won' | 'lost'>('play');

  const diff = spark ? SPARK_DIFFICULTY[spark] : null;
  const accent = spark ? SPARK_COLOR[spark] : '#7bb8ff';

  // Target = complement of the template (the strand the player must assemble).
  const target = useMemo(() => template.map((b) => COMPLEMENT[b]), [template]);

  // Hide the template after the memorisation window (harder sparks only).
  useEffect(() => {
    if (!diff || diff.memorizeSeconds <= 0 || status !== 'play') return;
    setHideTemplate(false);
    const id = window.setTimeout(() => setHideTemplate(true), diff.memorizeSeconds * 1000);
    return () => window.clearTimeout(id);
  }, [diff, template, status]);

  function startSpark(s: LifeSparkType) {
    const d = SPARK_DIFFICULTY[s];
    setSpark(s);
    setTemplate(randomTemplate(d.length, d.bases));
    setBuilt([]);
    setHideTemplate(false);
    setStatus('play');
  }

  function placeBase(base: string) {
    if (status !== 'play' || !spark) return;
    const idx = built.length;
    if (base !== target[idx]) {
      setStatus('lost');
      return;
    }
    const next = [...built, base];
    setBuilt(next);
    if (next.length === target.length) {
      setStatus('won');
      onSuccess(spark);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 4000,
        background: 'rgba(2,5,16,0.82)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, fontFamily: 'monospace',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(440px, 96vw)', maxHeight: '90vh', overflowY: 'auto',
          background: 'rgba(10,15,25,0.97)', border: `1px solid ${accent}`,
          borderRadius: 6, boxShadow: `0 0 32px ${accent}33`, padding: 18,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ color: accent, fontSize: 14, fontWeight: 700, letterSpacing: 0.5 }}>{t('lab.dna_title')}</div>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #334455', color: '#8899aa', borderRadius: 3, width: 24, height: 24, cursor: 'pointer', lineHeight: 1 }}>×</button>
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
                    <span style={{ color: '#8899aa', fontSize: 9.5 }}>{t('lab.dna_pairs', { count: d.length })}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* Template strand */}
            <div style={{ color: '#667788', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
              {t('lab.dna_template')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
              {template.map((b, i) => (
                <span key={i} style={{
                  width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 4, border: `1px solid ${BASE_COLOR[b]}66`,
                  background: hideTemplate ? 'rgba(5,10,20,0.6)' : `${BASE_COLOR[b]}1f`,
                  color: hideTemplate ? '#33414f' : BASE_COLOR[b], fontWeight: 700, fontSize: 14,
                }}>{hideTemplate ? '?' : b}</span>
              ))}
            </div>

            {/* Built (complementary) strand */}
            <div style={{ color: '#667788', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
              {t('lab.dna_build')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
              {target.map((_, i) => {
                const b = built[i];
                return (
                  <span key={i} style={{
                    width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 4, border: `1px solid ${b ? BASE_COLOR[b] : '#334455'}`,
                    background: b ? `${BASE_COLOR[b]}1f` : 'rgba(5,10,20,0.5)',
                    color: b ? BASE_COLOR[b] : '#334455', fontWeight: 700, fontSize: 14,
                  }}>{b ?? '·'}</span>
                );
              })}
            </div>

            {status === 'play' && (
              <div style={{ display: 'flex', gap: 8 }}>
                {BASES.slice(0, diff?.bases ?? 2).map((b) => (
                  <button
                    key={b}
                    onClick={() => placeBase(b)}
                    style={{
                      flex: 1, padding: '12px 0', borderRadius: 6, cursor: 'pointer',
                      background: `${BASE_COLOR[b]}1f`, border: `1px solid ${BASE_COLOR[b]}`,
                      color: BASE_COLOR[b], fontFamily: 'monospace', fontSize: 16, fontWeight: 700,
                    }}
                  >{b}</button>
                ))}
              </div>
            )}

            {status === 'won' && (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ color: accent, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{t('lab.dna_won')}</div>
                <button onClick={onClose} style={{ background: `${accent}22`, border: `1px solid ${accent}`, color: '#eafff2', borderRadius: 6, padding: '10px 18px', cursor: 'pointer', fontFamily: 'monospace', letterSpacing: 1 }}>{t('lab.dna_collect')}</button>
              </div>
            )}

            {status === 'lost' && (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ color: '#cc7777', fontSize: 12, marginBottom: 10 }}>{t('lab.dna_lost')}</div>
                <button onClick={() => spark && startSpark(spark)} style={{ background: 'rgba(204,119,119,0.16)', border: '1px solid #cc7777', color: '#ffd0d0', borderRadius: 6, padding: '9px 16px', cursor: 'pointer', fontFamily: 'monospace', letterSpacing: 1 }}>{t('lab.dna_retry')}</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
