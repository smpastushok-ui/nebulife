import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Planet } from '@nebulife/core';

const panelStyle: React.CSSProperties = {
  position: 'absolute', right: 16, top: 48, width: 300,
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

export function PlanetInfoPanel({ planet, onClose, onSurface, surfaceDisabledReason }: {
  planet: Planet;
  onClose: () => void;
  onSurface?: () => void;
  surfaceDisabledReason?: string;
}) {
  const { t } = useTranslation();
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
        <div style={groupTitleStyle}>{t('planet_info.group_physical')}</div>
        <div style={rowStyle}><span>{t('planet_info.type')}</span><span style={{ textTransform: 'capitalize' }}>{typeLabel}</span></div>
        <div style={rowStyle}><span>{t('planet_info.mass')}</span><span>{planet.massEarth} M&#x2295;</span></div>
        <div style={rowStyle}><span>{t('planet_info.radius')}</span><span>{planet.radiusEarth} R&#x2295;</span></div>
        <div style={rowStyle}><span>{t('planet_info.density')}</span><span>{planet.densityGCm3} g/cm&sup3;</span></div>
        <div style={rowStyle}><span>{t('planet_info.gravity')}</span><span>{planet.surfaceGravityG}g</span></div>
        <div style={rowStyle}><span>{t('planet_info.escape_vel')}</span><span>{planet.escapeVelocityKmS} km/s</span></div>
      </div>

      {/* --- Group 2: Orbital --- */}
      <div style={groupStyle}>
        <div style={groupTitleStyle}>{t('planet_info.group_orbital')}</div>
        <div style={rowStyle}><span>{t('planet_info.distance')}</span><span>{planet.orbit.semiMajorAxisAU.toFixed(3)} AU</span></div>
        <div style={rowStyle}><span>{t('planet_info.period')}</span><span>{planet.orbit.periodDays.toFixed(1)} {t('planet_info.days')}</span></div>
        <div style={rowStyle}><span>{t('planet_info.eccentricity')}</span><span>{planet.orbit.eccentricity.toFixed(3)}</span></div>
        <div style={rowStyle}><span>{t('planet_info.zone')}</span><span style={{ color: planet.zone === 'habitable' ? '#44aa66' : '#889999' }}>{planet.zone}</span></div>
      </div>

      {/* --- Group 3: Climate --- */}
      <div style={groupStyle}>
        <div style={groupTitleStyle}>{t('planet_info.group_climate')}</div>

        <div style={subSectionStyle}>{t('planet_info.temperature')}</div>
        <div style={rowStyle}><span>{t('planet_info.equilibrium')}</span><span>{planet.equilibriumTempK} K</span></div>
        <div style={rowStyle}><span>{t('planet_info.surface_temp')}</span><span>{planet.surfaceTempK} K ({(planet.surfaceTempK - 273.15).toFixed(0)}&deg;C)</span></div>
        <div style={rowStyle}><span>{t('planet_info.albedo')}</span><span>{planet.albedo}</span></div>

        {planet.atmosphere && (
          <>
            <div style={subSectionStyle}>{t('planet_info.atmosphere')}</div>
            <div style={rowStyle}><span>{t('planet_info.pressure')}</span><span>{planet.atmosphere.surfacePressureAtm} atm</span></div>
            <div style={rowStyle}>
              <span>{t('planet_info.composition')}</span>
              <span style={{ fontSize: 9, textAlign: 'right' }}>
                {Object.entries(planet.atmosphere.composition)
                  .filter(([, v]) => v > 0.001)
                  .sort(([, a], [, b]) => b - a)
                  .map(([gas, frac]) => `${gas} ${(frac * 100).toFixed(1)}%`)
                  .join(', ')}
              </span>
            </div>
            {planet.atmosphere.hasOzone && (
              <div style={rowStyle}><span>{t('planet_info.ozone')}</span><span style={{ color: '#44aa66' }}>{t('planet_info.yes')}</span></div>
            )}
          </>
        )}

        {planet.hydrosphere && (
          <>
            <div style={subSectionStyle}>{t('planet_info.hydrosphere')}</div>
            <div style={rowStyle}><span>{t('planet_info.coverage')}</span><span>{(planet.hydrosphere.waterCoverageFraction * 100).toFixed(1)}%</span></div>
            <div style={rowStyle}><span>{t('planet_info.ocean_depth')}</span><span>{planet.hydrosphere.oceanDepthKm.toFixed(1)} km</span></div>
            <div style={rowStyle}><span>{t('planet_info.ice_caps')}</span><span>{(planet.hydrosphere.iceCapFraction * 100).toFixed(1)}%</span></div>
          </>
        )}
      </div>

      {/* --- Group 4: Biology --- */}
      <div style={groupStyle}>
        <div style={groupTitleStyle}>{t('planet_info.group_biology')}</div>
        <div style={rowStyle}>
          <span>{t('planet_info.life')}</span>
          <span style={{ color: planet.hasLife ? '#44ff88' : '#667788' }}>
            {planet.hasLife ? planet.lifeComplexity : t('planet_info.none')}
          </span>
        </div>

        <div style={subSectionStyle}>{t('planet_info.habitability')}</div>
        <div style={rowStyle}><span>{t('planet_info.hab_overall')}</span><Bar value={hab.overall} color={hab.overall > 0.7 ? '#44ff88' : hab.overall > 0.3 ? '#ccaa44' : '#cc4444'} /></div>
        <div style={rowStyle}><span>{t('planet_info.hab_temperature')}</span><Bar value={hab.temperature} /></div>
        <div style={rowStyle}><span>{t('planet_info.hab_atmosphere')}</span><Bar value={hab.atmosphere} /></div>
        <div style={rowStyle}><span>{t('planet_info.hab_water')}</span><Bar value={hab.water} /></div>
        <div style={rowStyle}><span>{t('planet_info.hab_magnetic')}</span><Bar value={hab.magneticField} /></div>
        <div style={rowStyle}><span>{t('planet_info.hab_gravity')}</span><Bar value={hab.gravity} /></div>
      </div>

      {/* --- Group 5: Moons --- */}
      {planet.moons.length > 0 && (
        <div style={groupStyle}>
          <div style={groupTitleStyle}>{t('planet_info.group_moons', { count: planet.moons.length })}</div>
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
        <div style={groupTitleStyle}>{t('planet_info.group_colonization')}</div>
        <div style={rowStyle}>
          <span>{t('planet_info.terraform_difficulty')}</span>
          <span>{(planet.terraformDifficulty * 100).toFixed(0)}%</span>
        </div>
        <div style={rowStyle}>
          <span>{t('planet_info.colonizable')}</span>
          <span style={{ color: planet.isColonizable ? '#44aa66' : '#cc4444' }}>
            {planet.isColonizable ? t('planet_info.yes') : t('planet_info.no')}
          </span>
        </div>
      </div>

      {/* --- Surface button (home planet / colonized) --- */}
      {onSurface && (planet.isHomePlanet || planet.isColonizable) && (
        <div style={{ marginTop: 8 }}>
          <button
            onClick={surfaceDisabledReason ? undefined : onSurface}
            disabled={!!surfaceDisabledReason}
            title={surfaceDisabledReason}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: surfaceDisabledReason ? 'rgba(20, 25, 35, 0.5)' : 'rgba(30, 60, 40, 0.5)',
              border: surfaceDisabledReason ? '1px solid rgba(50, 60, 70, 0.4)' : '1px solid rgba(80, 160, 100, 0.4)',
              borderRadius: 4,
              color: surfaceDisabledReason ? '#556677' : '#88ccaa',
              fontFamily: 'monospace',
              fontSize: 12,
              cursor: surfaceDisabledReason ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {surfaceDisabledReason
              ? t('planet_info.surface_disabled', { reason: surfaceDisabledReason })
              : t('planet_info.go_to_surface')}
          </button>
        </div>
      )}

    </div>
  );
}
