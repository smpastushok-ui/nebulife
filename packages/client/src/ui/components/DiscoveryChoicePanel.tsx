import React, { useState, useEffect } from 'react';
import type { Discovery, StarSystem, DiscoveryRarity } from '@nebulife/core';
import { RARITY_COLORS, RARITY_LABELS, getCatalogEntry } from '@nebulife/core';
import type { CatalogEntry } from '@nebulife/core';

// ---------------------------------------------------------------------------
// DiscoveryChoicePanel — Centered modal with 3 choices when a discovery is made
// ---------------------------------------------------------------------------
// Shows: object name, rarity badge, description, and 3 action buttons:
//   1. Базова телеметрія (free scanner image)
//   2. Квантове фокусування (3⚛ AI observatory)
//   3. Пропустити (dismiss)
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  cosmos: 'Космос',
  flora: 'Флора',
  fauna: 'Фауна',
  anomalies: 'Аномалії',
  landscapes: 'Ландшафти',
};

interface DiscoveryChoicePanelProps {
  discovery: Discovery;
  system: StarSystem;
  isFirstDiscovery: boolean;
  isLuckyFree: boolean;
  playerQuarks: number;
  onTelemetry: () => void;
  onQuantumFocus: () => void;
  onSkip: () => void;
}

export function DiscoveryChoicePanel({
  discovery,
  system,
  isFirstDiscovery,
  isLuckyFree,
  playerQuarks,
  onTelemetry,
  onQuantumFocus,
  onSkip,
}: DiscoveryChoicePanelProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  const catalog = getCatalogEntry(discovery.type) as CatalogEntry | undefined;
  const color = RARITY_COLORS[discovery.rarity];
  const rarityLabel = RARITY_LABELS[discovery.rarity];
  const categoryLabel = CATEGORY_LABELS[discovery.galleryCategory] ?? discovery.galleryCategory;
  const name = catalog?.nameUk ?? discovery.type;

  const isFreeQuantum = isFirstDiscovery || isLuckyFree;
  const quantumCost = isFreeQuantum ? 0 : 3;
  const canAffordQuantum = isFreeQuantum || playerQuarks >= 3;

  const isEpicOrAbove = discovery.rarity === 'epic' || discovery.rarity === 'legendary';

  // Entrance animation
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const exit = (cb: () => void) => {
    setExiting(true);
    setTimeout(cb, 350);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9700,
          background: 'rgba(1, 3, 10, 0.6)',
          backdropFilter: 'blur(4px)',
          opacity: visible && !exiting ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
        onClick={() => exit(onSkip)}
      />

      {/* Centered modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          zIndex: 9701,
          width: 400,
          maxWidth: '92vw',
          maxHeight: '90vh',
          background: 'rgba(6, 10, 18, 0.97)',
          border: `1px solid ${color}44`,
          borderRadius: 6,
          fontFamily: 'monospace',
          display: 'flex',
          flexDirection: 'column',
          transform: visible && !exiting
            ? 'translate(-50%, -50%) scale(1)'
            : 'translate(-50%, -50%) scale(0.92)',
          opacity: visible && !exiting ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease',
          boxShadow: `0 0 60px rgba(0,0,0,0.6), 0 0 20px ${color}15`,
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top glow line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            opacity: 0.5,
          }}
        />

        {/* Scrollable content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {/* Header — narrative message */}
          <div
            style={{
              fontSize: 11,
              lineHeight: 1.6,
              color: '#778899',
            }}
          >
            Командоре, глибоке сканування системи{' '}
            <span style={{ color: '#aabbcc' }}>{system.name}</span>{' '}
            виявило аномалію:{' '}
            <span style={{ color: '#ddeeff', fontWeight: 'bold' }}>{name}</span>.{' '}
            Сигнал слабкий, маємо запит на виділення додаткових ресурсів телескопа.
          </div>

          {/* Rarity + Category badges */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <span
              style={{
                fontSize: 10,
                padding: '3px 10px',
                borderRadius: 3,
                background: `${color}22`,
                border: `1px solid ${color}55`,
                color,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              {rarityLabel}
            </span>
            <span
              style={{
                fontSize: 10,
                padding: '3px 10px',
                borderRadius: 3,
                background: 'rgba(40, 60, 80, 0.4)',
                border: '1px solid rgba(60, 80, 100, 0.3)',
                color: '#8899aa',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              {categoryLabel}
            </span>
          </div>

          {/* Description */}
          {catalog?.descriptionUk && (
            <div
              style={{
                fontSize: 11,
                color: '#778899',
                lineHeight: 1.7,
                textAlign: 'center',
              }}
            >
              {catalog.descriptionUk}
            </div>
          )}

          {/* System context */}
          <div
            style={{
              fontSize: 10,
              color: '#445566',
              textAlign: 'center',
            }}
          >
            Система: {system.name}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(51, 68, 85, 0.3)' }} />

          {/* Choice header */}
          <div
            style={{
              fontSize: 11,
              color: '#8899aa',
              textAlign: 'center',
            }}
          >
            Оберіть метод дослідження:
          </div>

          {/* Choice 1: Telemetry (free) */}
          <ChoiceButton
            title="Базова телеметрія"
            subtitle="Безкоштовно"
            borderColor="#445566"
            hoverBorderColor="#667788"
            textColor="#8899aa"
            onClick={() => exit(onTelemetry)}
            icon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
                <rect x="2" y="3" width="12" height="10" rx="1" />
                <line x1="2" y1="7" x2="14" y2="7" />
                <circle cx="8" cy="10" r="1.5" />
              </svg>
            }
          />

          {/* Choice 2: Quantum Focus (3⚛ or free) */}
          <ChoiceButton
            title="Квантове фокусування"
            subtitle={
              isFreeQuantum
                ? isFirstDiscovery
                  ? 'Перше відкриття безкоштовно!'
                  : 'Отримано додаткові енергоквоти'
                : (
                  <span>
                    {'Разовий доступ до супертелескопа.\u00a0'}
                    <span style={{ color: canAffordQuantum ? '#4488ff' : '#995544' }}>3 &#9883;</span>
                    {!canAffordQuantum && <span style={{ color: '#885555' }}> — недостатньо</span>}
                  </span>
                )
            }
            borderColor={isFreeQuantum ? '#44ff88' : canAffordQuantum ? '#2255aa' : '#553333'}
            hoverBorderColor={isFreeQuantum ? '#66ffaa' : canAffordQuantum ? '#4477cc' : '#774444'}
            textColor={isFreeQuantum ? '#44ff88' : canAffordQuantum ? '#aaccff' : '#885555'}
            disabled={!canAffordQuantum}
            premium={canAffordQuantum}
            onClick={() => exit(onQuantumFocus)}
            icon={
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.2">
                <circle cx="9" cy="9" r="7" />
                <circle cx="9" cy="9" r="3" />
                <line x1="9" y1="2" x2="9" y2="5" />
                <line x1="9" y1="13" x2="9" y2="16" />
                <line x1="2" y1="9" x2="5" y2="9" />
                <line x1="13" y1="9" x2="16" y2="9" />
                <line x1="4.5" y1="4.5" x2="6.5" y2="6.5" />
                <line x1="11.5" y1="11.5" x2="13.5" y2="13.5" />
              </svg>
            }
          />

          {/* Choice 3: Skip */}
          <button
            onClick={() => exit(onSkip)}
            style={{
              background: 'none',
              border: 'none',
              color: '#445566',
              fontFamily: 'monospace',
              fontSize: 11,
              cursor: 'pointer',
              padding: '10px 0',
              minHeight: 44,
              textAlign: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#778899'; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#445566'; }}
          >
            Пропустити
          </button>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes premium-pulse {
          0%, 100% { box-shadow: 0 0 10px rgba(50, 90, 210, 0.12); }
          50% { box-shadow: 0 0 22px rgba(60, 110, 230, 0.28); }
        }
      `}</style>
      {isEpicOrAbove && (
        <style>{`
          @keyframes disc-panel-glow {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.8; }
          }
        `}</style>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Choice button sub-component
// ---------------------------------------------------------------------------

function ChoiceButton({
  title,
  subtitle,
  borderColor,
  hoverBorderColor,
  textColor,
  disabled,
  badge,
  premium,
  onClick,
  icon,
}: {
  title: string;
  subtitle: React.ReactNode;
  borderColor: string;
  hoverBorderColor: string;
  textColor: string;
  disabled?: boolean;
  badge?: string | null;
  premium?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const isPremiumActive = premium && !disabled;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        padding: isPremiumActive ? '16px 16px' : '14px 16px',
        background: isPremiumActive
          ? hover
            ? 'linear-gradient(135deg, rgba(18, 36, 90, 0.95) 0%, rgba(10, 22, 60, 0.98) 100%)'
            : 'linear-gradient(135deg, rgba(12, 24, 65, 0.92) 0%, rgba(7, 15, 42, 0.96) 100%)'
          : hover && !disabled
            ? 'rgba(20, 35, 55, 0.5)'
            : 'rgba(8, 14, 24, 0.6)',
        border: `1px solid ${hover && !disabled ? hoverBorderColor : borderColor}`,
        borderRadius: 4,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        fontFamily: 'monospace',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        transition: 'all 0.2s',
        color: textColor,
        position: 'relative',
        animation: isPremiumActive && !hover ? 'premium-pulse 3s ease-in-out infinite' : undefined,
        boxShadow: isPremiumActive && hover
          ? '0 0 24px rgba(60, 110, 230, 0.30), inset 0 0 30px rgba(40, 80, 200, 0.06)'
          : undefined,
      }}
    >
      {/* Premium shimmer line at top edge */}
      {isPremiumActive && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: 'linear-gradient(90deg, transparent 0%, rgba(100, 160, 255, 0.55) 50%, transparent 100%)',
            borderRadius: '4px 4px 0 0',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Icon */}
      <div style={{
        flexShrink: 0,
        opacity: isPremiumActive ? 0.8 : 0.7,
        color: isPremiumActive ? '#6699cc' : 'inherit',
      }}>
        {icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: isPremiumActive ? 13 : 12,
          fontWeight: 'bold',
          marginBottom: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          letterSpacing: isPremiumActive ? 0.3 : 0,
        }}>
          {title}
          {badge && (
            <span style={{ fontSize: 10, opacity: 0.7 }}>{badge}</span>
          )}
        </div>
        <div style={{ fontSize: 10, lineHeight: 1.4 }}>
          {typeof subtitle === 'string'
            ? <span style={{ opacity: 0.6 }}>{subtitle}</span>
            : subtitle
          }
        </div>
      </div>
    </button>
  );
}
