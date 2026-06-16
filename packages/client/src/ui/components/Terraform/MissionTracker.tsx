// ---------------------------------------------------------------------------
// MissionTracker — active terraform missions panel (opened from the CommandBar
// mission button). Controlled component: visibility is owned by the parent.
// ---------------------------------------------------------------------------

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Mission, MissionPhase } from '@nebulife/core';
import { ResourceIcon, RESOURCE_COLORS, type ResourceType } from '../ResourceIcon.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MissionTrackerProps {
  missions: Mission[];
  getPlanetName: (planetId: string) => string;
  /** Whether the panel is open (owned by the parent / CommandBar button). */
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Progress inside a phase (0..1)
// ---------------------------------------------------------------------------

function phaseProgress(mission: Mission, now: number): number {
  const elapsed = now - mission.phaseStartedAt;
  const flightMs = mission.flightHours * 3_600_000;
  const DISPATCHING_MS = 5 * 60 * 1000;
  const UNLOADING_MS   = 5 * 60 * 1000;
  const repairMs = Math.ceil(mission.repairCostMinerals / 100) * 60_000;

  const durations: Record<MissionPhase, number> = {
    dispatching: DISPATCHING_MS,
    outbound:    flightMs,
    unloading:   UNLOADING_MS,
    returning:   flightMs,
    repairing:   repairMs,
    idle:        1,
  };

  const total = durations[mission.phase];
  if (total <= 0) return 1;
  return Math.min(1, elapsed / total);
}

const RESOURCE_TYPES: ReadonlySet<string> = new Set(['minerals', 'volatiles', 'isotopes', 'water']);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MissionTracker({
  missions,
  getPlanetName,
  open,
  onClose,
}: MissionTrackerProps): React.ReactElement | null {
  const { t } = useTranslation();

  if (!open || missions.length === 0) return null;

  const now = Date.now();

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9701,
    background: 'rgba(10,15,25,0.97)',
    border: '1px solid #446688',
    borderRadius: 6,
    padding: '12px 14px',
    width: 'min(300px, 92vw)',
    maxHeight: '55vh',
    overflowY: 'auto',
    fontFamily: 'monospace',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    boxShadow: '0 8px 28px rgba(0,0,0,0.6)',
  };

  return (
    <>
      {/* Backdrop click to close */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9700 }}
        onClick={onClose}
      />
      <div style={panelStyle}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid #223344', paddingBottom: 6,
        }}>
          <span style={{
            fontSize: 9, color: '#8899aa',
            letterSpacing: 1, textTransform: 'uppercase',
          }}>
            {t('terraform.tracker_title')}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#667788',
              fontFamily: 'monospace', fontSize: 13, cursor: 'pointer', lineHeight: 1, padding: '0 2px',
            }}
          >
            X
          </button>
        </div>

        {missions.map((m) => {
          const progress = phaseProgress(m, now);
          const phaseLabel = t(`terraform.phase.${m.phase}`);
          const targetName = getPlanetName(m.targetPlanetId);
          const isResource = RESOURCE_TYPES.has(m.resource);

          return (
            <div
              key={m.id}
              style={{
                display: 'flex', flexDirection: 'column', gap: 4,
                borderBottom: '1px solid #1a2233', paddingBottom: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <span style={{ color: '#aabbcc' }}>{targetName}</span>
                <span style={{ color: '#7bb8ff' }}>
                  {t(`terraform.param.${m.paramId}`)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9, color: '#667788' }}>
                <span>{phaseLabel}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: isResource ? RESOURCE_COLORS[m.resource as ResourceType] : '#8899aa' }}>
                    {m.amount.toLocaleString()}
                  </span>
                  {isResource && <ResourceIcon type={m.resource as ResourceType} size={12} />}
                </span>
              </div>
              {/* Phase progress bar */}
              <div style={{
                height: 3,
                background: '#1a2233',
                borderRadius: 2,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.round(progress * 100)}%`,
                  background: m.phase === 'idle'
                    ? '#334455'
                    : m.phase === 'repairing'
                    ? '#ff8844'
                    : '#446688',
                  transition: 'width 1s linear',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
