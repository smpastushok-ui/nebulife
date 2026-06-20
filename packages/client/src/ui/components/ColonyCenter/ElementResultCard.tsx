import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ELEMENTS } from '@nebulife/core';

/**
 * Unified record for any "manual job" the player launches that yields a visual,
 * reviewable result: a quantum/centrifuge separation batch, a lab particle
 * extraction, or a life-spark synthesis. Persisted in localStorage histories
 * (last 5 per building) and attached to system-chat notifications so the result
 * can be re-opened later.
 */
export interface ElementResult {
  id: string;
  /** What kind of job produced this result (drives the card layout). */
  kind: 'separation' | 'extraction' | 'spark';
  /** Building type that produced it (e.g. 'quantum_separator', 'research_lab'). */
  source: string;
  /** Element symbol → units produced (separation / extraction). */
  elements?: Record<string, number>;
  /** Spark type granted (spark synthesis). */
  sparkType?: string;
  /** Optional rarity tag for the spark / extraction (drives accent colour). */
  rarity?: string;
  /** Free-form subtitle (e.g. separation group, resource consumed). */
  detail?: string;
  completedAt: number;
}

const CATEGORY_COLOR: Record<string, string> = {
  metal: '#c8a85e',
  nonmetal: '#5fbecf',
  metalloid: '#a98cd6',
  'noble-gas': '#7fce9e',
};

export const SPARK_COLOR: Record<string, string> = {
  primordial: '#44ff88',
  adaptive: '#4ac6e8',
  neural: '#b78cff',
  stellar: '#ffcf66',
};

function elementColor(symbol: string): string {
  const cat = ELEMENTS[symbol]?.category;
  return (cat && CATEGORY_COLOR[cat]) || '#8899aa';
}

/** Accent colour for a result (used by history chips + card header). */
export function resultAccent(r: ElementResult): string {
  if (r.kind === 'spark') return SPARK_COLOR[r.sparkType ?? ''] ?? '#b78cff';
  if (r.kind === 'extraction') return '#7bb8ff';
  return '#44ff88';
}

/**
 * Full-screen modal that visualises an {@link ElementResult}. Procedural only
 * (no sprites): element tiles styled like a periodic-table cell, spark shown as
 * a glowing core. Tap anywhere outside the card to dismiss.
 */
export function ElementResultCard({
  result,
  onClose,
}: {
  result: ElementResult;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const uk = i18n.language?.startsWith('uk');
  const accent = resultAccent(result);
  const entries = Object.entries(result.elements ?? {}).sort((a, b) => b[1] - a[1]);

  const title =
    result.kind === 'spark'
      ? t('lab.result_spark_title')
      : result.kind === 'extraction'
        ? t('lab.result_extraction_title')
        : t('separation.result_title');

  return createPortal((
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 12000,
        background: 'rgba(2,5,16,0.78)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: 'monospace',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(420px, 96vw)',
          maxHeight: '88vh',
          overflowY: 'auto',
          background: 'rgba(10,15,25,0.96)',
          border: `1px solid ${accent}`,
          borderRadius: 6,
          boxShadow: `0 0 32px ${accent}33`,
          padding: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ color: accent, fontSize: 14, fontWeight: 700, letterSpacing: 0.5 }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #334455',
              color: '#8899aa',
              borderRadius: 3,
              width: 24,
              height: 24,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {result.detail && (
          <div style={{ color: '#8899aa', fontSize: 11, marginBottom: 12 }}>{result.detail}</div>
        )}

        {result.kind === 'spark' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0 8px' }}>
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: '50%',
                background: `radial-gradient(circle at 50% 45%, ${accent} 0%, ${accent}55 38%, transparent 72%)`,
                boxShadow: `0 0 28px ${accent}88`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: accent,
                  boxShadow: `0 0 16px ${accent}`,
                }}
              />
            </div>
            <div style={{ color: '#aabbcc', fontSize: 13, marginTop: 16, textAlign: 'center' }}>
              {t(`lab.spark.${result.sparkType}` as 'lab.spark.primordial')}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
              gap: 8,
            }}
          >
            {entries.length === 0 && (
              <div style={{ color: '#667788', fontSize: 12, gridColumn: '1 / -1', textAlign: 'center', padding: 16 }}>
                {t('separation.result_empty')}
              </div>
            )}
            {entries.map(([sym, amt]) => {
              const c = elementColor(sym);
              const el = ELEMENTS[sym];
              return (
                <div
                  key={sym}
                  style={{
                    border: `1px solid ${c}66`,
                    background: `${c}14`,
                    borderRadius: 4,
                    padding: '6px 4px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ color: c, fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>{sym}</div>
                  <div style={{ color: '#8899aa', fontSize: 9, minHeight: 11, lineHeight: 1.1 }}>
                    {el ? (uk ? el.nameUk : el.name) : ''}
                  </div>
                  <div style={{ color: '#aabbcc', fontSize: 12, fontWeight: 700, marginTop: 2 }}>+{amt}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  ), document.body);
}
