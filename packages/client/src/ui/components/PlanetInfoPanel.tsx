import React from 'react';
import type { Planet } from '@nebulife/core';

const panelStyle: React.CSSProperties = {
  position: 'absolute', right: 16, top: 12, width: 300,
  background: 'rgba(10,15,25,0.92)', border: '1px solid #334455',
  borderRadius: 4, padding: 16, fontFamily: 'monospace', color: '#aabbcc',
  fontSize: 11, pointerEvents: 'auto', maxHeight: 'calc(100vh - 100px)',
  overflowY: 'auto',
};

const headerStyle: React.CSSProperties = {
  fontSize: 14, color: '#ccddee', marginBottom: 12, display: 'flex',
  justifyContent: 'space-between', alignItems: 'center',
};

const groupStyle: React.CSSProperties = {
  marginBottom: 12, paddingBottom: 8,
  borderBottom: '1px solid rgba(50,60,80,0.3)',
};

const groupTitleStyle: React.CSSProperties = {
  marginBottom: 6, color: '#667788', fontSize: 10,
  textTransform: 'uppercase' as const, letterSpacing: 1.5,
};

const subSectionStyle: React.CSSProperties = {
  marginTop: 6, marginBottom: 3, color: '#556677', fontSize: 9,
  textTransform: 'uppercase' as const, letterSpacing: 0.5,
};

const rowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', padding: '2px 0',
  borderBottom: '1px solid rgba(50,60,70,0.2)',
};

const barBg: React.CSSProperties = {
  width: 60, height: 6, background: 'rgba(40,50,60,0.5)', borderRadius: 3, overflow: 'hidden',
};

function Bar({ value, color = '#4488cc' }: { value: number; color?: string }) {
  return (
    <div style={barBg}>
      <div style={{ width: `${Math.round(value * 100)}%`, height: '100%', background: color, borderRadius: 3 }} />
    </div>
  );
}

const closeBtnStyle: React.CSSProperties = {
  cursor: 'pointer', background: 'none', border: 'none',
  color: '#667788', fontSize: 16, fontFamily: 'monospace',
};

export function PlanetInfoPanel({ planet, onClose, onSurface }: {
  planet: Planet;
  onClose: () => void;
  onSurface?: () => void;
}) {
  const hab = planet.habitability;
  const typeLabel = planet.type.replace('-', ' ');

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span>
          {planet.name}
          {planet.isHomePlanet && <span style={{ color: '#44ff88', marginLeft: 8, fontSize: 10 }}>HOME</span>}
        </span>
        <button style={closeBtnStyle} onClick={onClose}>&times;</button>
      </div>

      {/* --- Group 1: Physical --- */}
      <div style={groupStyle}>
        <div style={groupTitleStyle}>Physical</div>
        <div style={rowStyle}><span>Type</span><span style={{ textTransform: 'capitalize' }}>{typeLabel}</span></div>
        <div style={rowStyle}><span>Mass</span><span>{planet.massEarth} M&#x2295;</span></div>
        <div style={rowStyle}><span>Radius</span><span>{planet.radiusEarth} R&#x2295;</span></div>
        <div style={rowStyle}><span>Density</span><span>{planet.densityGCm3} g/cm&sup3;</span></div>
        <div style={rowStyle}><span>Gravity</span><span>{planet.surfaceGravityG}g</span></div>
        <div style={rowStyle}><span>Escape vel.</span><span>{planet.escapeVelocityKmS} km/s</span></div>
      </div>

      {/* --- Group 2: Orbital --- */}
      <div style={groupStyle}>
        <div style={groupTitleStyle}>Orbital</div>
        <div style={rowStyle}><span>Distance</span><span>{planet.orbit.semiMajorAxisAU.toFixed(3)} AU</span></div>
        <div style={rowStyle}><span>Period</span><span>{planet.orbit.periodDays.toFixed(1)} days</span></div>
        <div style={rowStyle}><span>Eccentricity</span><span>{planet.orbit.eccentricity.toFixed(3)}</span></div>
        <div style={rowStyle}><span>Zone</span><span style={{ color: planet.zone === 'habitable' ? '#44aa66' : '#889999' }}>{planet.zone}</span></div>
      </div>

      {/* --- Group 3: Climate --- */}
      <div style={groupStyle}>
        <div style={groupTitleStyle}>Climate</div>

        <div style={subSectionStyle}>Temperature</div>
        <div style={rowStyle}><span>Equilibrium</span><span>{planet.equilibriumTempK} K</span></div>
        <div style={rowStyle}><span>Surface</span><span>{planet.surfaceTempK} K ({(planet.surfaceTempK - 273.15).toFixed(0)}&deg;C)</span></div>
        <div style={rowStyle}><span>Albedo</span><span>{planet.albedo}</span></div>

        {planet.atmosphere && (
          <>
            <div style={subSectionStyle}>Atmosphere</div>
            <div style={rowStyle}><span>Pressure</span><span>{planet.atmosphere.surfacePressureAtm} atm</span></div>
            <div style={rowStyle}>
              <span>Composition</span>
              <span style={{ fontSize: 9, textAlign: 'right' }}>
                {Object.entries(planet.atmosphere.composition)
                  .filter(([, v]) => v > 0.001)
                  .sort(([, a], [, b]) => b - a)
                  .map(([gas, frac]) => `${gas} ${(frac * 100).toFixed(1)}%`)
                  .join(', ')}
              </span>
            </div>
            {planet.atmosphere.hasOzone && (
              <div style={rowStyle}><span>Ozone layer</span><span style={{ color: '#44aa66' }}>Yes</span></div>
            )}
          </>
        )}

        {planet.hydrosphere && (
          <>
            <div style={subSectionStyle}>Hydrosphere</div>
            <div style={rowStyle}><span>Coverage</span><span>{(planet.hydrosphere.waterCoverageFraction * 100).toFixed(1)}%</span></div>
            <div style={rowStyle}><span>Ocean depth</span><span>{planet.hydrosphere.oceanDepthKm.toFixed(1)} km</span></div>
            <div style={rowStyle}><span>Ice caps</span><span>{(planet.hydrosphere.iceCapFraction * 100).toFixed(1)}%</span></div>
          </>
        )}
      </div>

      {/* --- Group 4: Biology --- */}
      <div style={groupStyle}>
        <div style={groupTitleStyle}>Biology</div>
        <div style={rowStyle}>
          <span>Life</span>
          <span style={{ color: planet.hasLife ? '#44ff88' : '#667788' }}>
            {planet.hasLife ? planet.lifeComplexity : 'None'}
          </span>
        </div>

        <div style={subSectionStyle}>Habitability</div>
        <div style={rowStyle}><span>Overall</span><Bar value={hab.overall} color={hab.overall > 0.7 ? '#44ff88' : hab.overall > 0.3 ? '#ccaa44' : '#cc4444'} /></div>
        <div style={rowStyle}><span>Temperature</span><Bar value={hab.temperature} /></div>
        <div style={rowStyle}><span>Atmosphere</span><Bar value={hab.atmosphere} /></div>
        <div style={rowStyle}><span>Water</span><Bar value={hab.water} /></div>
        <div style={rowStyle}><span>Magnetic field</span><Bar value={hab.magneticField} /></div>
        <div style={rowStyle}><span>Gravity</span><Bar value={hab.gravity} /></div>
      </div>

      {/* --- Group 5: Moons --- */}
      {planet.moons.length > 0 && (
        <div style={groupStyle}>
          <div style={groupTitleStyle}>Moons ({planet.moons.length})</div>
          {planet.moons.map(moon => (
            <div key={moon.id} style={rowStyle}>
              <span>{moon.name}</span>
              <span>{moon.radiusKm.toFixed(0)} km</span>
            </div>
          ))}
        </div>
      )}

      {/* --- Group 6: Colonization --- */}
      <div style={groupStyle}>
        <div style={groupTitleStyle}>Colonization</div>
        <div style={rowStyle}>
          <span>Terraform difficulty</span>
          <span>{(planet.terraformDifficulty * 100).toFixed(0)}%</span>
        </div>
        <div style={rowStyle}>
          <span>Colonizable</span>
          <span style={{ color: planet.isColonizable ? '#44aa66' : '#cc4444' }}>
            {planet.isColonizable ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      {/* --- Surface button (home planet / colonized) --- */}
      {onSurface && (planet.isHomePlanet || planet.isColonizable) && (
        <div style={{ marginTop: 8 }}>
          <button
            onClick={onSurface}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: 'rgba(30, 60, 40, 0.5)',
              border: '1px solid rgba(80, 160, 100, 0.4)',
              borderRadius: 4,
              color: '#88ccaa',
              fontFamily: 'monospace',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            &#x1F30D; Спуститися на поверхню
          </button>
        </div>
      )}

    </div>
  );
}
