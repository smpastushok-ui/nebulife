import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { StarSystem } from '@nebulife/core';

// ---------------------------------------------------------------------------
// Tooltips for star parameters (hover desktop / tap mobile)
// Keys are i18n translation keys for the label
// ---------------------------------------------------------------------------

const STAR_TIP_KEYS: Record<string, string> = {
  'system_info.star_class':       'system_info.tip_class',
  'system_info.star_temperature': 'system_info.tip_temperature',
  'system_info.star_mass':        'system_info.tip_mass',
  'system_info.star_luminosity':  'system_info.tip_luminosity',
  'system_info.star_age':         'system_info.tip_age',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LabelWithTip({ labelKey }: { labelKey: string }) {
  const { t } = useTranslation();
  const tipKey = STAR_TIP_KEYS[labelKey];
  const label = t(labelKey);
  const tip = tipKey ? t(tipKey) : undefined;
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen(v => !v), []);
  const show   = useCallback(() => setOpen(true),   []);
  const hide   = useCallback(() => setOpen(false),  []);

  if (!tip) return <span>{label}</span>;

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span
        style={{ borderBottom: '1px dotted #334455', cursor: 'help' }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onClick={toggle}
      >
        {t(labelKey)}
      </span>
      {open && (
        <span style={{
          position: 'absolute',
          left: 0,
          bottom: 'calc(100% + 5px)',
          background: 'rgba(4,8,18,0.98)',
          border: '1px solid #1e3348',
          borderRadius: 3,
          padding: '5px 8px',
          fontSize: 9,
          color: '#7799aa',
          whiteSpace: 'normal',
          width: 180,
          lineHeight: 1.55,
          letterSpacing: '0.04em',
          zIndex: 60,
          pointerEvents: 'none',
        }}>
          {tip}
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Animated row (Variant 1 style — slides in from left)
// ---------------------------------------------------------------------------

function AnimRow({
  labelKey, value, delay, valueColor, plain,
}: {
  labelKey: string;
  value: React.ReactNode;
  delay: number;
  valueColor?: string;
  /** When true, renders label as plain translated text (no tooltip). Default: uses LabelWithTip */
  plain?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '4px 0',
      borderBottom: '1px solid rgba(30,50,70,0.5)',
      fontSize: 11,
      animation: `sip-slide-in 0.22s ${delay}ms both`,
    }}>
      <span style={{ color: '#778899' }}>
        {plain ? t(labelKey) : <LabelWithTip labelKey={labelKey} />}
      </span>
      <span style={{ color: valueColor ?? '#aabbcc' }}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const panelStyle: React.CSSProperties = {
  position: 'absolute', right: 16, top: 48, width: 280,
  background: 'rgba(8,13,24,0.97)',
  border: '1px solid #1e3348',
  borderRadius: 4,
  padding: '14px 16px',
  fontFamily: 'monospace',
  color: '#aabbcc',
  fontSize: 11,
  pointerEvents: 'auto',
  overflow: 'hidden',
};

const closeBtnStyle: React.CSSProperties = {
  cursor: 'pointer', background: 'none', border: 'none',
  color: '#445566', fontSize: 16, fontFamily: 'monospace',
};

const renameBtnStyle: React.CSSProperties = {
  cursor: 'pointer', background: 'none', border: 'none',
  color: '#4488aa', fontSize: 9, fontFamily: 'monospace', marginLeft: 6,
  padding: '0 4px',
};

const renameInputStyle: React.CSSProperties = {
  background: 'rgba(5,10,20,0.8)', border: '1px solid #446688',
  color: '#ccddee', fontFamily: 'monospace', fontSize: 13,
  padding: '3px 6px', borderRadius: 3, width: '100%', outline: 'none',
};

const sectionStyle = (delay: number): React.CSSProperties => ({
  fontSize: 9,
  color: '#4488aa',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  margin: '10px 0 6px',
  animation: `sip-fade-in 0.2s ${delay}ms both`,
});

const btnStyle: React.CSSProperties = {
  width: '100%', marginTop: 14, padding: '8px 0', cursor: 'pointer',
  background: 'rgba(20,50,70,0.5)', border: '1px solid #336688',
  color: '#88aacc', fontFamily: 'monospace', fontSize: 11, borderRadius: 3,
  letterSpacing: '0.08em',
  animation: 'sip-fade-in 0.25s 960ms both',
};

// Keyframes injected once
if (typeof document !== 'undefined' && !document.getElementById('sip-keyframes')) {
  const style = document.createElement('style');
  style.id = 'sip-keyframes';
  style.textContent = `
    @keyframes sip-slide-in {
      from { opacity: 0; transform: translateX(-7px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes sip-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

export function SystemInfoPanel({ system, onEnterSystem, onClose, displayName, onRename }: {
  system: StarSystem;
  onEnterSystem: () => void;
  onClose: () => void;
  displayName?: string;
  onRename?: (newName: string) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(displayName ?? system.name);

  const star = system.star;
  const habitablePlanets = system.planets.filter(p => p.zone === 'habitable');
  const lifeCount = system.planets.filter(p => p.hasLife).length;
  const name = displayName ?? system.name;

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== system.name && onRename) onRename(trimmed);
    setEditing(false);
  };

  const plural = (n: number) => n === 1 ? t('radial.planet_one') : n < 5 ? t('radial.planet_few') : t('radial.planet_many');

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, animation: 'sip-fade-in 0.2s 30ms both' }}>
        {editing ? (
          <input
            style={renameInputStyle}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
            onBlur={handleSave}
            maxLength={50}
            autoFocus
          />
        ) : (
          <span style={{ fontSize: 13, color: '#ccddee' }}>
            {name}
            {name !== system.name && (
              <span style={{ color: '#445566', fontSize: 9, marginLeft: 4 }}>({system.name})</span>
            )}
            {onRename && (
              <button style={renameBtnStyle} onClick={() => { setEditValue(name); setEditing(true); }}>
                [{t('common.rename')}]
              </button>
            )}
          </span>
        )}
        <button style={closeBtnStyle} onClick={onClose}>&times;</button>
      </div>

      {/* Star section */}
      <div style={sectionStyle(50)}>{t('system_info.section_star')}</div>
      <AnimRow labelKey="system_info.star_class"       value={<span style={{ color: star.colorHex }}>{star.spectralClass}{star.subType}V</span>} delay={100} />
      <AnimRow labelKey="system_info.star_temperature" value={`${star.temperatureK} K`}                       delay={170} />
      <AnimRow labelKey="system_info.star_mass"        value={<>{ star.massSolar } M&#x2609;</>}               delay={240} />
      <AnimRow labelKey="system_info.star_luminosity"  value={<>{star.luminositySolar} L&#x2609;</>}           delay={310} />
      <AnimRow labelKey="system_info.star_age"         value={`${star.ageGyr} Gyr`}                           delay={380} />

      {/* System section */}
      <div style={sectionStyle(460)}>{t('system_info.section_system')}</div>
      <AnimRow labelKey="system_info.planets"          value={system.planets.length}                                           delay={520} plain />
      <AnimRow labelKey="system_info.habitable_zone"   value={`${habitablePlanets.length} ${plural(habitablePlanets.length)}`} delay={590} plain />
      <AnimRow
        labelKey="system_info.life_detected"
        value={lifeCount > 0 ? `${lifeCount} ${plural(lifeCount)}` : t('system_info.no_life')}
        valueColor={lifeCount > 0 ? '#44ff88' : '#445566'}
        delay={660}
        plain
      />
      <AnimRow labelKey="system_info.distance_home"   value={t('system_info.ring_value', { ring: system.ringIndex })}        delay={730} plain />

      <button style={btnStyle} onClick={onEnterSystem}>
        {t('system_info.enter_system')} &rarr;
      </button>
    </div>
  );
}
