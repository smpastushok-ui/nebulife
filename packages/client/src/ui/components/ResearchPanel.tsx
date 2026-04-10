import React from 'react';
import { useTranslation } from 'react-i18next';
import type { StarSystem, ResearchState, ResearchSlot, SystemResearchState, ObservedRange } from '@nebulife/core';
import { getResearchProgress, getSystemResearch, canStartResearch, isSystemFullyResearched, isRingFullyResearched, RESEARCH_DATA_COST } from '@nebulife/core';
import { playSfx } from '../../audio/SfxPlayer.js';

const panelStyle: React.CSSProperties = {
  position: 'absolute', right: 16, top: 48, width: 280,
  background: 'rgba(10,15,25,0.92)', border: '1px solid #334455',
  borderRadius: 4, padding: 16, fontFamily: 'monospace', color: '#aabbcc',
  fontSize: 11, pointerEvents: 'auto',
};

const headerStyle: React.CSSProperties = {
  fontSize: 14, color: '#ccddee', marginBottom: 12, display: 'flex',
  justifyContent: 'space-between', alignItems: 'center',
};

const rowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', padding: '3px 0',
  borderBottom: '1px solid rgba(50,60,70,0.3)',
};

const closeBtnStyle: React.CSSProperties = {
  cursor: 'pointer', background: 'none', border: 'none',
  color: '#667788', fontSize: 16, fontFamily: 'monospace',
  minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const btnStyle: React.CSSProperties = {
  width: '100%', marginTop: 12, padding: '8px 0', cursor: 'pointer',
  minHeight: 44,
  background: 'rgba(30,60,80,0.6)', border: '1px solid #446688',
  color: '#aaccee', fontFamily: 'monospace', fontSize: 12, borderRadius: 3,
};

const btnDisabledStyle: React.CSSProperties = {
  ...btnStyle,
  opacity: 0.4, cursor: 'not-allowed',
};

function formatRange(r: ObservedRange | null, suffix = '', decimals = 1): string {
  if (!r) return '—';
  if (r.exact !== undefined) return `${r.exact.toFixed(decimals)}${suffix}`;
  const min = r.min.toFixed(decimals);
  const max = r.max.toFixed(decimals);
  return min === max ? `${min}${suffix}` : `${min} – ${max}${suffix}`;
}

function formatPercent(r: ObservedRange | null): string {
  if (!r) return '—';
  if (r.exact !== undefined) return `${(r.exact * 100).toFixed(0)}%`;
  const min = (r.min * 100).toFixed(0);
  const max = (r.max * 100).toFixed(0);
  return min === max ? `${min}%` : `${min} – ${max}%`;
}

function formatInt(r: ObservedRange | null): string {
  if (!r) return '—';
  if (r.exact !== undefined) return `${r.exact}`;
  return r.min === r.max ? `${r.min}` : `${r.min} – ${r.max}`;
}

/** Research slots indicator */
function SlotsIndicator({ slots, allSystems }: { slots: ResearchSlot[]; allSystems: StarSystem[] }) {
  const { t } = useTranslation();
  const systemMap = new Map(allSystems.map((s) => [s.id, s]));

  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
      {slots.map((slot) => {
        const sys = slot.systemId ? systemMap.get(slot.systemId) : null;
        const active = slot.systemId !== null;
        return (
          <div
            key={slot.slotIndex}
            style={{
              flex: 1, padding: '4px 6px', fontSize: 9,
              background: active ? 'rgba(40,80,120,0.4)' : 'rgba(30,40,50,0.3)',
              border: `1px solid ${active ? '#446688' : '#2a3a4a'}`,
              borderRadius: 3, textAlign: 'center',
              color: active ? '#88bbdd' : '#445566',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {active ? (sys?.name ?? slot.systemId) : t('research.panel_slot_free')}
          </div>
        );
      })}
    </div>
  );
}

/** Progress bar */
function ProgressBar({ progress }: { progress: number }) {
  return (
    <div style={{ width: '100%', height: 6, background: 'rgba(30,40,50,0.6)', borderRadius: 3, marginBottom: 8 }}>
      <div
        style={{
          width: `${progress}%`, height: '100%', borderRadius: 3,
          background: progress >= 100
            ? 'linear-gradient(90deg, #22aa55, #44ff88)'
            : 'linear-gradient(90deg, #2266aa, #44aaff)',
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );
}

export function ResearchPanel({
  system,
  researchState,
  allSystems,
  activeSlotTimerText,
  researchData,
  onStartResearch,
  onClose,
}: {
  system: StarSystem;
  researchState: ResearchState;
  allSystems: StarSystem[];
  activeSlotTimerText: string | null;
  researchData: number;
  onStartResearch: (systemId: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const progress = getResearchProgress(researchState, system.id);
  const research = getSystemResearch(researchState, system.id);
  const obs = research?.observation;
  const isResearching = researchState.slots.some((s) => s.systemId === system.id);
  // Ring gating: Ring N requires all Ring N-1 systems to be 100% researched
  const ringLocked = system.ringIndex > 1
    && !isRingFullyResearched(researchState, allSystems, system.ringIndex - 1);
  const hasData = researchData >= RESEARCH_DATA_COST;
  const canStart = !ringLocked && hasData && canStartResearch(researchState, system.id, system.ringIndex);
  const isComplete = isSystemFullyResearched(researchState, system.id);

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span>{progress > 0 ? system.name : t('research.panel_unknown_system')}</span>
        <button style={closeBtnStyle} onClick={onClose}>&times;</button>
      </div>

      {/* Research slots */}
      <SlotsIndicator slots={researchState.slots} allSystems={allSystems} />

      {/* Progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 10 }}>
        <span style={{ color: '#778899' }}>{t('research.panel_research_label')}</span>
        <span style={{ color: progress >= 100 ? '#44ff88' : '#4488aa' }}>{progress}%</span>
      </div>
      <ProgressBar progress={progress} />

      {/* Timer */}
      {isResearching && activeSlotTimerText && (
        <div style={{ textAlign: 'center', color: '#4488aa', fontSize: 10, marginBottom: 8 }}>
          {activeSlotTimerText}
        </div>
      )}

      {/* Observed data */}
      {progress > 0 && obs && (
        <>
          <div style={{ marginBottom: 4, marginTop: 8, color: '#778899', fontSize: 10 }}>
            {t('research.panel_known_data')}
          </div>
          {obs.starClass && (
            <div style={rowStyle}><span>{t('research.star_type')}</span><span>{obs.starClass}</span></div>
          )}
          {obs.planetCount && (
            <div style={rowStyle}><span>{t('research.panel_planets')}</span><span>{formatInt(obs.planetCount)}</span></div>
          )}
          {obs.waterCoverage && (
            <div style={rowStyle}><span>{t('research.panel_water')}</span><span>{formatPercent(obs.waterCoverage)}</span></div>
          )}
          {obs.temperature && (
            <div style={rowStyle}><span>{t('research.panel_temperature')}</span><span>{formatRange(obs.temperature, ' K', 0)}</span></div>
          )}
          {obs.distanceAU && (
            <div style={rowStyle}><span>{t('research.panel_distance')}</span><span>{formatRange(obs.distanceAU, ' AU')}</span></div>
          )}
          {obs.habitability && (
            <div style={rowStyle}>
              <span>{t('research.panel_habitability')}</span>
              <span style={{ color: obs.habitability.exact !== undefined
                ? (obs.habitability.exact > 0.5 ? '#44ff88' : '#ff8844')
                : '#aabbcc'
              }}>
                {formatPercent(obs.habitability)}
              </span>
            </div>
          )}
        </>
      )}

      {/* Research data balance */}
      {!isComplete && !isResearching && (
        <div style={{ fontSize: 10, color: '#667788', marginTop: 8, textAlign: 'right' }}>
          {t('research.panel_research_data')}: <span style={{ color: hasData ? '#4488aa' : '#cc4444' }}>{researchData}</span>
        </div>
      )}

      {/* Action button */}
      {!isComplete && !isResearching && (
        <button
          style={{
            ...(canStart ? btnStyle : btnDisabledStyle),
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
          onClick={() => { if (canStart) { playSfx('research-system-start', 0.35); onStartResearch(system.id); } }}
          disabled={!canStart}
        >
          {canStart
            ? <>
                {t('research.panel_scan_btn')}
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ verticalAlign: 'middle' }}>
                  <circle cx="8" cy="8" r="6" />
                  <circle cx="8" cy="8" r="2" />
                  <line x1="8" y1="2" x2="8" y2="5" />
                  <line x1="8" y1="11" x2="8" y2="14" />
                  <line x1="2" y1="8" x2="5" y2="8" />
                  <line x1="11" y1="8" x2="14" y2="8" />
                </svg>
                {RESEARCH_DATA_COST}
              </>
            : !hasData
              ? t('research.panel_insufficient_data')
              : ringLocked
                ? t('research.panel_ring_locked', { ring: system.ringIndex - 1 })
                : t('research.panel_no_slots')}
        </button>
      )}

      {isResearching && (
        <button style={{ ...btnStyle, background: 'rgba(40,80,120,0.3)', cursor: 'default' }} disabled>
          {t('research.overlay_in_progress')}
        </button>
      )}
    </div>
  );
}
