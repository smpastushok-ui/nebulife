import React, { useState } from 'react';
import type { Planet } from '@nebulife/core';

// ---------------------------------------------------------------------------
// ColonyFoundingPrompt — shown when ship arrives at destination planet
// ---------------------------------------------------------------------------

interface ColonyFoundingPromptProps {
  planet: Planet;
  onFoundColony: () => void;
}

export function ColonyFoundingPrompt({ planet, onFoundColony }: ColonyFoundingPromptProps) {
  const [hover, setHover] = useState(false);

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
          width: 400,
          maxWidth: '92vw',
          background: 'rgba(10,15,25,0.96)',
          border: '1px solid #4488aa',
          borderRadius: 6,
          padding: 28,
          textAlign: 'center',
        }}
      >
        {/* Status header */}
        <div
          style={{
            fontSize: 10,
            color: '#4488aa',
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          НАВIГАЦIЙНА СИСТЕМА
        </div>
        <div
          style={{
            fontSize: 16,
            color: '#ccddee',
            fontWeight: 'bold',
            marginBottom: 8,
          }}
        >
          Орбітальна позиція досягнута
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#667788',
            marginBottom: 24,
            lineHeight: '1.5',
          }}
        >
          Корабель вийшов на стабільну орбіту навколо планети {planet.name}.
          Усі системи готові до посадки.
        </div>

        {/* Planet quick stats */}
        <div
          style={{
            background: 'rgba(20,30,50,0.4)',
            border: '1px solid rgba(68,136,170,0.2)',
            borderRadius: 4,
            padding: 12,
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-around',
          }}
        >
          <div>
            <div style={{ fontSize: 9, color: '#556677', marginBottom: 3 }}>ПРИДАТНIСТЬ</div>
            <div style={{ fontSize: 14, color: '#44ff88', fontWeight: 'bold' }}>
              {Math.round(planet.habitability.overall * 100)}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#556677', marginBottom: 3 }}>ТИП</div>
            <div style={{ fontSize: 12, color: '#aabbcc' }}>{planet.type}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#556677', marginBottom: 3 }}>ТЕМПЕРАТУРА</div>
            <div style={{ fontSize: 12, color: '#aabbcc' }}>{Math.round(planet.surfaceTempK)} K</div>
          </div>
        </div>

        {/* Found colony button */}
        <button
          onClick={onFoundColony}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            width: '100%',
            padding: '14px 0',
            background: hover ? 'rgba(68,255,136,0.15)' : 'rgba(68,255,136,0.08)',
            border: '2px solid #44ff88',
            borderRadius: 4,
            color: '#44ff88',
            fontFamily: 'monospace',
            fontSize: 14,
            fontWeight: 'bold',
            cursor: 'pointer',
            letterSpacing: 1,
            transition: 'background 0.2s',
          }}
        >
          ЗАСНУВАТИ КОЛОНIЮ
        </button>
      </div>
    </div>
  );
}
