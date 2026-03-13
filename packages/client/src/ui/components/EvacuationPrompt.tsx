import React, { useState } from 'react';
import type { StarSystem, Planet } from '@nebulife/core';

// ---------------------------------------------------------------------------
// EvacuationPrompt — shown when a habitable planet is discovered
// ---------------------------------------------------------------------------

interface EvacuationPromptProps {
  system: StarSystem;
  planet: Planet;
  onStartEvacuation: () => void;
  onContinue: () => void;
}

export function EvacuationPrompt({ system, planet, onStartEvacuation, onContinue }: EvacuationPromptProps) {
  const [hover, setHover] = useState<'evacuate' | 'continue' | null>(null);
  const habitabilityPct = Math.round(planet.habitability.overall * 100);

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
          width: 420,
          maxWidth: '92vw',
          background: 'rgba(10,15,25,0.96)',
          border: '1px solid #44ff88',
          borderRadius: 6,
          padding: 28,
        }}
      >
        {/* Signal header */}
        <div
          style={{
            fontSize: 10,
            color: '#44ff88',
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          СИГНАЛ ВИЯВЛЕННЯ
        </div>
        <div
          style={{
            fontSize: 18,
            color: '#ccddee',
            fontWeight: 'bold',
            marginBottom: 16,
          }}
        >
          Виявлено придатну планету
        </div>

        {/* Planet info */}
        <div
          style={{
            background: 'rgba(20,40,30,0.3)',
            border: '1px solid rgba(68,255,136,0.2)',
            borderRadius: 4,
            padding: 14,
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#667788', fontSize: 10 }}>СИСТЕМА</span>
            <span style={{ color: '#aabbcc', fontSize: 11 }}>{system.name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#667788', fontSize: 10 }}>ПЛАНЕТА</span>
            <span style={{ color: '#aabbcc', fontSize: 11 }}>{planet.name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#667788', fontSize: 10 }}>ПРИДАТНIСТЬ</span>
            <span style={{ color: '#44ff88', fontSize: 11, fontWeight: 'bold' }}>{habitabilityPct}%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#667788', fontSize: 10 }}>ТИП</span>
            <span style={{ color: '#aabbcc', fontSize: 11 }}>{planet.type}</span>
          </div>
          {planet.atmosphere && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#667788', fontSize: 10 }}>АТМОСФЕРА</span>
              <span style={{ color: '#aabbcc', fontSize: 11 }}>Наявна</span>
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
            background: hover === 'evacuate' ? 'rgba(68,255,136,0.15)' : 'rgba(68,255,136,0.08)',
            border: '2px solid #44ff88',
            borderRadius: 4,
            color: '#44ff88',
            fontFamily: 'monospace',
            fontSize: 14,
            fontWeight: 'bold',
            cursor: 'pointer',
            letterSpacing: 1,
            transition: 'background 0.2s',
            marginBottom: 10,
          }}
        >
          ПОЧАТИ ЕВАКУАЦIЮ
        </button>
        <button
          onClick={onContinue}
          onMouseEnter={() => setHover('continue')}
          onMouseLeave={() => setHover(null)}
          style={{
            width: '100%',
            padding: '10px 0',
            background: hover === 'continue' ? 'rgba(40,50,60,0.6)' : 'rgba(30,40,50,0.4)',
            border: '1px solid #445566',
            borderRadius: 4,
            color: '#667788',
            fontFamily: 'monospace',
            fontSize: 11,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          Продовжити дослідження
        </button>
      </div>
    </div>
  );
}
