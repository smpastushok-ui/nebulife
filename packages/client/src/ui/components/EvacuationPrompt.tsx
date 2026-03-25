import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StarSystem, Planet } from '@nebulife/core';

// ---------------------------------------------------------------------------
// EvacuationPrompt — shown when a habitable planet is discovered
// OR forced by timer expiration (desperate mode)
// ---------------------------------------------------------------------------

interface EvacuationPromptProps {
  system: StarSystem;
  planet: Planet;
  onStartEvacuation: () => void;
  /** If true, timer expired — desperate tone, no choice */
  forced?: boolean;
  /** Dismiss prompt (can be reopened from timer button) */
  onDismiss?: () => void;
}

export function EvacuationPrompt({ system, planet, onStartEvacuation, forced, onDismiss }: EvacuationPromptProps) {
  const { t } = useTranslation();
  const [hover, setHover] = useState<'evacuate' | null>(null);
  const habitabilityPct = Math.round(planet.habitability.overall * 100);

  // Colors: green for normal, orange/red for forced
  const accentColor = forced ? '#ff8844' : '#44ff88';
  const borderColor = forced ? '#cc4444' : '#44ff88';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        background: 'rgba(2,5,16,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          width: 440,
          maxWidth: '92vw',
          background: 'rgba(10,15,25,0.96)',
          border: `1px solid ${borderColor}`,
          borderRadius: 6,
          padding: 28,
        }}
      >
        {/* Signal header */}
        <div
          style={{
            fontSize: 10,
            color: forced ? '#cc4444' : '#44ff88',
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          {forced ? t('evacuation.header_critical') : t('evacuation.header_signal')}
        </div>
        <div
          style={{
            fontSize: 18,
            color: '#ccddee',
            fontWeight: 'bold',
            marginBottom: forced ? 12 : 16,
          }}
        >
          {forced ? t('evacuation.title_forced') : t('evacuation.title_found')}
        </div>

        {/* Forced: desperate message */}
        {forced && (
          <div
            style={{
              fontSize: 12,
              color: '#99aabb',
              lineHeight: 1.6,
              marginBottom: 16,
              padding: '10px 12px',
              background: 'rgba(204,68,68,0.08)',
              border: '1px solid rgba(204,68,68,0.2)',
              borderRadius: 4,
            }}
          >
            {t('evacuation.forced_message')}
          </div>
        )}

        {/* Planet info */}
        <div
          style={{
            background: forced ? 'rgba(40,30,20,0.3)' : 'rgba(20,40,30,0.3)',
            border: `1px solid ${forced ? 'rgba(255,136,68,0.2)' : 'rgba(68,255,136,0.2)'}`,
            borderRadius: 4,
            padding: 14,
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#667788', fontSize: 10 }}>{t('evacuation.label_system')}</span>
            <span style={{ color: '#aabbcc', fontSize: 11 }}>{system.name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#667788', fontSize: 10 }}>{t('evacuation.label_planet')}</span>
            <span style={{ color: '#aabbcc', fontSize: 11 }}>{planet.name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#667788', fontSize: 10 }}>{t('evacuation.label_habitability')}</span>
            <span style={{
              color: habitabilityPct >= 30 ? '#44ff88' : habitabilityPct >= 10 ? '#ff8844' : '#cc4444',
              fontSize: 11,
              fontWeight: 'bold',
            }}>
              {habitabilityPct}%
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#667788', fontSize: 10 }}>{t('evacuation.label_type')}</span>
            <span style={{ color: '#aabbcc', fontSize: 11 }}>{planet.type}</span>
          </div>
          {planet.atmosphere && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#667788', fontSize: 10 }}>{t('evacuation.label_atmosphere')}</span>
              <span style={{ color: '#aabbcc', fontSize: 11 }}>{t('evacuation.atmosphere_present')}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <button
          onClick={onStartEvacuation}
          onMouseEnter={() => setHover('evacuate')}
          onMouseLeave={() => setHover(null)}
          style={{
            width: '100%',
            padding: '14px 0',
            minHeight: 44,
            background: hover === 'evacuate'
              ? `${accentColor}26`
              : `${accentColor}14`,
            border: `2px solid ${accentColor}`,
            borderRadius: 4,
            color: accentColor,
            fontFamily: 'monospace',
            fontSize: 14,
            fontWeight: 'bold',
            cursor: 'pointer',
            letterSpacing: 1,
            transition: 'background 0.2s',
          }}
        >
          {forced ? t('evacuation.btn_emergency') : t('evacuation.btn_start')}
        </button>

        {/* Dismiss button — hide prompt, reopen via timer button */}
        {onDismiss && !forced && (
          <button
            onClick={onDismiss}
            style={{
              width: '100%',
              marginTop: 10,
              padding: '10px 0',
              minHeight: 44,
              background: 'none',
              border: 'none',
              color: '#556677',
              fontFamily: 'monospace',
              fontSize: 11,
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#8899aa'; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#556677'; }}
          >
            {t('evacuation.btn_later')}
          </button>
        )}
      </div>
    </div>
  );
}
