import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { DiscoveryRarity } from '@nebulife/core';
import { RARITY_COLORS } from '@nebulife/core';

// ---------------------------------------------------------------------------
// ScientificReport — typewriter-styled scientific report for the president
// ---------------------------------------------------------------------------


const CHARS_PER_TICK = 2;
const TICK_INTERVAL = 30;

export function ScientificReport({
  reportText,
  objectName,
  rarity,
  onClose,
}: {
  reportText: string;
  objectName: string;
  rarity: DiscoveryRarity;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [displayedChars, setDisplayedChars] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const color = RARITY_COLORS[rarity];

  useEffect(() => {
    if (displayedChars >= reportText.length) {
      setIsComplete(true);
      return;
    }

    const timer = setInterval(() => {
      setDisplayedChars((prev) => {
        const next = Math.min(prev + CHARS_PER_TICK, reportText.length);
        if (next >= reportText.length) {
          clearInterval(timer);
          setIsComplete(true);
        }
        return next;
      });
    }, TICK_INTERVAL);

    return () => clearInterval(timer);
  }, [reportText, displayedChars]);

  // Auto-scroll as text appears
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedChars]);

  const handleSkip = () => {
    setDisplayedChars(reportText.length);
    setIsComplete(true);
  };

  const visibleText = reportText.slice(0, displayedChars);

  return (
    <div
      style={{
        background: 'rgba(8, 12, 20, 0.96)',
        border: `1px solid ${color}66`,
        borderRadius: 8,
        padding: 20,
        fontFamily: 'monospace',
        maxHeight: 400,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: `inset 0 0 40px rgba(0, 20, 10, 0.3)`,
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 3,
          color: '#44ff88',
          marginBottom: 4,
          borderBottom: '1px solid rgba(68, 255, 136, 0.2)',
          paddingBottom: 8,
        }}
      >
        {t('scientific_report.title')}
      </div>

      {/* Object name + rarity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 15, color: '#ddeeff', fontWeight: 'bold' }}>
          {objectName}
        </span>
        <span
          style={{
            fontSize: 9,
            padding: '2px 6px',
            borderRadius: 3,
            background: `${color}22`,
            border: `1px solid ${color}55`,
            color,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {t(`discovery_notification.rarity_${rarity}`)}
        </span>
      </div>

      {/* Report body with typewriter effect */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: 'auto',
          fontSize: 12,
          lineHeight: 1.7,
          color: '#99aabb',
          whiteSpace: 'pre-wrap',
          minHeight: 120,
          maxHeight: 260,
          paddingRight: 8,
        }}
      >
        {visibleText}
        {!isComplete && (
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 14,
              background: '#44ff88',
              marginLeft: 2,
              animation: 'blink 0.7s step-end infinite',
              verticalAlign: 'text-bottom',
            }}
          />
        )}
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 14,
          paddingTop: 10,
          borderTop: '1px solid rgba(60, 80, 100, 0.3)',
        }}
      >
        {!isComplete ? (
          <button
            onClick={handleSkip}
            style={{
              background: 'none',
              border: '1px solid #334455',
              color: '#667788',
              padding: '6px 14px',
              fontSize: 11,
              fontFamily: 'monospace',
              borderRadius: 3,
              cursor: 'pointer',
            }}
          >
            {t('common.skip')} &raquo;
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={onClose}
          style={{
            background: isComplete ? `${color}22` : 'rgba(30, 40, 50, 0.5)',
            border: `1px solid ${isComplete ? color + '66' : '#334455'}`,
            color: isComplete ? color : '#667788',
            padding: '6px 14px',
            fontSize: 11,
            fontFamily: 'monospace',
            borderRadius: 3,
            cursor: 'pointer',
            transition: 'all 0.3s',
          }}
        >
          {isComplete ? t('common.proceed') : t('common.close')}
        </button>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
