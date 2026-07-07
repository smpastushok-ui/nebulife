import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toRomanNumeral } from '@nebulife/core';
import { playSfx } from '../../../audio/SfxPlayer.js';
import type { SagaChapterView } from '../../../api/saga-api.js';

// ---------------------------------------------------------------------------
// SagaContent — "Сага Ткача": book-style reader for the personal AI-written
// illustrated chronicle. See GAME_MODULES.md (AI-контент).
// Embedded as the "Saga" tab of the Operations Hub (was previously a
// full-screen overlay opened from PlayerPage).
// ---------------------------------------------------------------------------

interface SagaContentProps {
  chapters: SagaChapterView[];
}

function formatChapterDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

export function SagaContent({ chapters }: SagaContentProps) {
  const { t, i18n } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const ordered = useMemo(
    () => [...chapters].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [chapters],
  );
  const selected = ordered.find((c) => c.id === selectedId) ?? null;
  const selectedIndex = selected ? ordered.indexOf(selected) : -1;

  return (
    <div style={{
      maxWidth: 460,
      width: '100%',
      boxSizing: 'border-box',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      fontFamily: 'monospace',
    }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 4, position: 'relative' }}>
        <div style={{
          fontSize: 15,
          color: '#ccddee',
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}>
          {t('saga.title')}
        </div>
        <div style={{ fontSize: 10, color: '#556677', marginTop: 4, letterSpacing: 0.5 }}>
          {t('saga.subtitle')}
        </div>
        {selected && (
          <button
            onClick={() => { playSfx('ui-click', 0.07); setSelectedId(null); }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              background: 'rgba(10, 18, 32, 0.44)',
              border: '1px solid rgba(68,102,136,0.42)',
              borderRadius: 3,
              color: '#8899aa',
              fontFamily: 'monospace',
              fontSize: 10,
              padding: '5px 10px',
              cursor: 'pointer',
            }}
          >
            {t('saga.back_to_list')}
          </button>
        )}
      </div>

      {selected ? (
        <SagaChapterDetail chapter={selected} index={selectedIndex} locale={i18n.language} />
      ) : ordered.length === 0 ? (
        <SagaEmptyState />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ordered.map((chapter, index) => (
            <button
              key={chapter.id}
              onClick={() => { playSfx('ui-click', 0.07); setSelectedId(chapter.id); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                textAlign: 'left',
                padding: '12px 14px',
                background: 'linear-gradient(180deg, rgba(10, 18, 32, 0.6), rgba(5, 10, 20, 0.5))',
                border: '1px solid rgba(68, 102, 136, 0.38)',
                borderRadius: 5,
                color: '#aabbcc',
                cursor: 'pointer',
              }}
            >
              <span style={{
                fontSize: 14,
                color: '#7bb8ff',
                minWidth: 28,
                textAlign: 'center',
                letterSpacing: 0.5,
              }}>
                {toRomanNumeral(index + 1)}
              </span>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 12, color: '#ccddee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {chapter.title}
                </span>
                <span style={{ fontSize: 9, color: '#556677' }}>
                  {formatChapterDate(chapter.createdAt, i18n.language)}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SagaChapterDetail({ chapter, index, locale }: { chapter: SagaChapterView; index: number; locale: string }) {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {chapter.imageUrl && (
        <div style={{
          width: '100%',
          aspectRatio: '3 / 4',
          borderRadius: 6,
          overflow: 'hidden',
          border: '1px solid rgba(68, 102, 136, 0.42)',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
        }}>
          <img
            src={chapter.imageUrl}
            alt={chapter.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: '#556677', letterSpacing: 1.5, marginBottom: 6 }}>
          {t('saga.chapter_label', { roman: toRomanNumeral(index + 1) })}
        </div>
        <div style={{ fontSize: 15, color: '#ccddee', letterSpacing: 0.6, lineHeight: 1.4 }}>
          {chapter.title}
        </div>
        <div style={{ fontSize: 9, color: '#556677', marginTop: 6 }}>
          {formatChapterDate(chapter.createdAt, locale)}
        </div>
      </div>
      <div style={{
        fontSize: 12,
        color: '#aabbcc',
        lineHeight: 2,
        letterSpacing: 0.35,
        whiteSpace: 'pre-wrap',
        padding: '4px 2px 20px',
      }}>
        {chapter.bodyText}
      </div>
    </div>
  );
}

function SagaEmptyState() {
  const { t } = useTranslation();
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      padding: '36px 20px',
      textAlign: 'center',
    }}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#4488aa" strokeWidth="1" opacity="0.6">
        <circle cx="20" cy="20" r="14" />
        <path d="M20 8 L20 32 M8 20 L32 20" strokeDasharray="2 3" />
      </svg>
      <div style={{ fontSize: 11, color: '#8899aa', lineHeight: 1.6, maxWidth: 280 }}>
        {t('saga.empty_state')}
      </div>
    </div>
  );
}

export default SagaContent;
