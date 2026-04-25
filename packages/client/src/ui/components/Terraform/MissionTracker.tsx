// ---------------------------------------------------------------------------
// MissionTracker — floating HUD chip showing active terraform missions
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Mission, MissionPhase } from '@nebulife/core';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MissionTrackerProps {
  missions: Mission[];
  /** Fleet capacity: total ships across all colonies (stub for Phase 1) */
  fleetCapacity: number;
  getPlanetName: (planetId: string) => string;
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MissionTracker({
  missions,
  fleetCapacity,
  getPlanetName,
}: MissionTrackerProps): React.ReactElement | null {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const activeMissions = missions.filter((m) => m.phase !== 'idle');
  const activeCount = activeMissions.length;

  if (missions.length === 0) return null;

  const now = Date.now();

  // ── Styles ─────────────────────────────────────────────────────────────────

  const chipStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 'calc(90px + env(safe-area-inset-bottom, 0px))',
    left: 'calc(18px + env(safe-area-inset-left, 0px))',
    zIndex: 9700,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(10,15,25,0.92)',
    border: `1px solid ${activeCount > 0 ? '#446688' : '#334455'}`,
    borderRadius: 10,
    padding: '4px 10px',
    fontFamily: 'monospace',
    fontSize: 10,
    color: activeCount > 0 ? '#7bb8ff' : '#667788',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    userSelect: 'none',
  };

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 'calc(130px + env(safe-area-inset-bottom, 0px))',
    left: 'calc(18px + env(safe-area-inset-left, 0px))',
    zIndex: 9701,
    background: 'rgba(10,15,25,0.97)',
    border: '1px solid #446688',
    borderRadius: 6,
    padding: '12px 14px',
    width: 280,
    maxHeight: '55vh',
    overflowY: 'auto',
    fontFamily: 'monospace',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  };

  return (
    <>
      {/* Chip button */}
      <div style={chipStyle} onClick={() => setOpen((v) => !v)}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: activeCount > 0 ? '#7bb8ff' : '#334455',
          display: 'inline-block',
          flexShrink: 0,
        }} />
        {activeCount}/{fleetCapacity}
        <span style={{ color: '#8899aa', marginLeft: 2 }}>
          {open ? '' : t('terraform.tracker_chip')}
        </span>
      </div>

      {/* Expanded panel */}
      {open && (
        <>
          {/* Backdrop click to close */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9699 }}
            onClick={() => setOpen(false)}
          />
          <div style={panelStyle}>
            <div style={{
              fontSize: 9, color: '#8899aa',
              letterSpacing: 1, textTransform: 'uppercase',
              borderBottom: '1px solid #223344', paddingBottom: 6,
            }}>
              {t('terraform.tracker_title')}
            </div>

            {missions.length === 0 && (
              <div style={{ fontSize: 10, color: '#556677' }}>
                {t('terraform.no_missions')}
              </div>
            )}

            {missions.map((m) => {
              const progress = phaseProgress(m, now);
              const phaseLabel = t(`terraform.phase.${m.phase}`);
              const targetName = getPlanetName(m.targetPlanetId);

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
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#667788' }}>
                    <span>{phaseLabel}</span>
                    <span>{m.amount.toLocaleString()} {m.resource}</span>
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
      )}
    </>
  );
}
