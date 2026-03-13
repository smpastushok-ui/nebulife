import React, { useState, useEffect } from 'react';
import type { Discovery, StarSystem, DiscoveryRarity } from '@nebulife/core';
import { RARITY_COLORS, RARITY_LABELS, getCatalogEntry } from '@nebulife/core';
import type { CatalogEntry } from '@nebulife/core';

// ---------------------------------------------------------------------------
// DiscoveryChoicePanel — Slide-in panel with 3 choices when a discovery is made
// ---------------------------------------------------------------------------
// Replaces the old DiscoveryNotification toast.
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
          background: 'rgba(1, 3, 10, 0.5)',
          backdropFilter: 'blur(3px)',
          opacity: visible && !exiting ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
        onClick={() => exit(onSkip)}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 380,
          maxWidth: '92vw',
          zIndex: 9701,
          background: 'rgba(6, 10, 18, 0.97)',
          borderLeft: `1px solid ${color}55`,
          fontFamily: 'monospace',
          display: 'flex',
          flexDirection: 'column',
          transform: visible && !exiting ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: `-8px 0 40px rgba(0,0,0,0.5)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow strip at left edge */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 2,
            background: `linear-gradient(180deg, transparent, ${color}, transparent)`,
            opacity: 0.6,
          }}
        />

        {/* Scrollable content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '32px 24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Header */}
          <div
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: 3,
              color: '#556677',
            }}
          >
            Нове відкриття
          </div>

          {/* Object name */}
          <div
            style={{
              fontSize: 18,
              color: '#ddeeff',
              fontWeight: 'bold',
              lineHeight: 1.3,
            }}
          >
            {name}
          </div>

          {/* Rarity + Category badges */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
              borderTop: '1px solid rgba(51, 68, 85, 0.3)',
              paddingTop: 12,
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
            subtitle="Сканер зробить знімок. Безкоштовно."
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
                  : 'Щасливий випадок — безкоштовно!'
                : canAffordQuantum
                  ? 'AI-обсерваторія. 3 кварки.'
                  : 'AI-обсерваторія. Потрібно 3 кварки.'
            }
            borderColor={isFreeQuantum ? '#44ff88' : canAffordQuantum ? color : '#553333'}
            hoverBorderColor={isFreeQuantum ? '#66ffaa' : canAffordQuantum ? color : '#774444'}
            textColor={isFreeQuantum ? '#44ff88' : canAffordQuantum ? color : '#885555'}
            disabled={!canAffordQuantum}
            badge={isFreeQuantum ? null : '3'}
            onClick={() => exit(onQuantumFocus)}
            icon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
                <circle cx="8" cy="8" r="6" />
                <circle cx="8" cy="8" r="2" />
                <line x1="8" y1="2" x2="8" y2="4" />
                <line x1="8" y1="12" x2="8" y2="14" />
                <line x1="2" y1="8" x2="4" y2="8" />
                <line x1="12" y1="8" x2="14" y2="8" />
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

      {/* Epic glow animation */}
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
  onClick,
  icon,
}: {
  title: string;
  subtitle: string;
  borderColor: string;
  hoverBorderColor: string;
  textColor: string;
  disabled?: boolean;
  badge?: string | null;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        padding: '14px 16px',
        background: hover && !disabled ? 'rgba(20, 35, 55, 0.5)' : 'rgba(8, 14, 24, 0.6)',
        border: `1px solid ${hover && !disabled ? hoverBorderColor : borderColor}`,
        borderRadius: 4,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        fontFamily: 'monospace',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        transition: 'all 0.15s',
        color: textColor,
      }}
    >
      {/* Icon */}
      <div style={{ flexShrink: 0, opacity: 0.7 }}>{icon}</div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
          {title}
          {badge && (
            <span style={{ fontSize: 10, opacity: 0.7 }}>{badge}</span>
          )}
        </div>
        <div style={{ fontSize: 10, opacity: 0.6, lineHeight: 1.4 }}>{subtitle}</div>
      </div>
    </button>
  );
}
