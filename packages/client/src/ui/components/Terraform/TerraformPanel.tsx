// ---------------------------------------------------------------------------
// TerraformPanel — full-screen overlay showing per-param terraforming progress
// ---------------------------------------------------------------------------

import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Planet, Ship } from '@nebulife/core';
import {
  canStartParam,
  getOverallProgress,
} from '@nebulife/core';
import type {
  PlanetTerraformState,
  TerraformParamId,
  Mission,
  ShipTier,
} from '@nebulife/core';
import type { TechTreeState } from '@nebulife/core';
import { MissionDispatchModal } from './MissionDispatchModal.js';
import type { ColonyResources } from './MissionDispatchModal.js'; // kept for re-export compat

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TerraformPanelProps {
  planet: Planet;
  terraformState: PlanetTerraformState;
  hasGenesisVault: boolean;
  techState: TechTreeState;
  /** Colony planets that can act as resource donors */
  donorPlanets: Planet[];
  /** Map from donorPlanetId to LY distance to target planet */
  donorDistances: Map<string, number>;
  /** Per-planet resource lookup. Called with the selected donor's planet ID. */
  getResources: (planetId: string) => ColonyResources;
  shipTier: 0 | 1 | 2 | 3;
  availableShips: Ship[];
  /** Active (non-idle) missions keyed by paramId */
  activeMissionByParam: Partial<Record<TerraformParamId, Mission>>;
  onStartParam: (
    paramId: TerraformParamId,
    donorPlanetId: string,
    resource: 'minerals' | 'volatiles' | 'isotopes' | 'water',
    amount: number,
    tier: ShipTier,
    flightHours: number,
    repairCostMinerals: number,
    shipId?: string,
  ) => void;
  onCancelMission: (missionId: string) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PARAM_ORDER: TerraformParamId[] = [
  'magneticField',
  'atmosphere',
  'ozone',
  'temperature',
  'pressure',
  'water',
];

function primaryActionKey(paramId: TerraformParamId): string {
  switch (paramId) {
    case 'magneticField':
    case 'temperature':
    case 'pressure':
      return 'terraform.action_stabilize';
    case 'ozone':
      return 'terraform.action_activate';
    case 'atmosphere':
    case 'water':
    default:
      return 'terraform.action_deliver';
  }
}

function primaryResource(
  paramId: TerraformParamId,
): 'minerals' | 'volatiles' | 'isotopes' | 'water' {
  switch (paramId) {
    case 'magneticField': return 'isotopes';
    case 'atmosphere':    return 'volatiles';
    case 'ozone':         return 'volatiles';
    case 'temperature':   return 'minerals';
    case 'pressure':      return 'volatiles';
    case 'water':         return 'water';
  }
}

function fmtHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(1)}h`;
}

function overallBarColor(pct: number): string {
  if (pct >= 95) return '#44ff88';
  if (pct >= 50) return '#ddaa44';
  return '#4488aa';
}

function paramBarColor(pct: number): string {
  if (pct >= 95) return '#44ff88';
  if (pct >= 50) return '#7bb8ff';
  return '#446688';
}

// ---------------------------------------------------------------------------
// ParamRow sub-component
// ---------------------------------------------------------------------------

interface ParamRowProps {
  paramId: TerraformParamId;
  planet: Planet;
  terraformState: PlanetTerraformState;
  hasGenesisVault: boolean;
  techState: TechTreeState;
  donorPlanets: Planet[];
  activeMission: Mission | undefined;
  onDispatch: (paramId: TerraformParamId) => void;
  onCancelMission: (missionId: string) => void;
}

function ParamRow({
  paramId,
  planet,
  terraformState,
  hasGenesisVault,
  techState,
  donorPlanets,
  activeMission,
  onDispatch,
  onCancelMission,
}: ParamRowProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const paramState = terraformState.params[paramId];
  const pct = Math.round(paramState.progress);
  const gate = canStartParam(terraformState, paramId, hasGenesisVault, planet, techState);
  const hasDonors = donorPlanets.length > 0;
  const actionLabelKey = primaryActionKey(paramId);

  // Derive reason label from gate
  let reasonText = '';
  if (!gate.allowed && gate.reason) {
    const rawReason = gate.reason;
    if (rawReason.startsWith('tech_required:')) {
      const techId = rawReason.slice('tech_required:'.length);
      reasonText = t('terraform.reason.tech_required', { tech: techId });
    } else {
      reasonText = t(`terraform.reason.${rawReason}`, { defaultValue: rawReason });
    }
  } else if (!hasDonors) {
    reasonText = t('terraform.no_donors_msg');
  }

  const canDispatch = gate.allowed && hasDonors && !activeMission;

  const missionPhaseProgress = (() => {
    if (!activeMission) return null;
    const now = Date.now();
    const elapsed = now - activeMission.phaseStartedAt;
    const flightMs = activeMission.flightHours * 3_600_000;
    const FIVE_MIN = 5 * 60 * 1000;
    const durations: Record<string, number> = {
      dispatching: FIVE_MIN,
      outbound: flightMs,
      unloading: FIVE_MIN,
      returning: flightMs,
      repairing: Math.ceil(activeMission.repairCostMinerals / 100) * 60_000,
      idle: 1,
    };
    const total = durations[activeMission.phase] ?? 1;
    return Math.min(1, elapsed / total);
  })();

  const rowStyle: React.CSSProperties = {
    borderBottom: '1px solid rgba(50,65,85,0.4)',
    padding: '10px 0',
  };

  const titleRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: '#aabbcc',
    flex: 1,
    minWidth: 0,
  };

  const pctStyle: React.CSSProperties = {
    fontSize: 10,
    color: pct >= 95 ? '#44ff88' : pct >= 50 ? '#7bb8ff' : '#8899aa',
    flexShrink: 0,
    width: 36,
    textAlign: 'right',
  };

  const btnBase: React.CSSProperties = {
    fontFamily: 'monospace',
    fontSize: 9,
    borderRadius: 3,
    padding: '4px 8px',
    border: 'none',
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    flexShrink: 0,
  };

  const chevronStyle: React.CSSProperties = {
    fontSize: 9,
    color: '#556677',
    cursor: 'pointer',
    flexShrink: 0,
    background: 'none',
    border: 'none',
    fontFamily: 'monospace',
    padding: '0 2px',
    transform: expanded ? 'rotate(90deg)' : 'none',
    transition: 'transform 0.15s',
  };

  return (
    <div style={rowStyle}>
      {/* Title row */}
      <div style={titleRowStyle}>
        {/* Chevron */}
        <button style={chevronStyle} onClick={() => setExpanded((v) => !v)}>
          &#x25B6;
        </button>

        {/* Name */}
        <span style={labelStyle}>
          {t(`terraform.param_full.${paramId}`, { defaultValue: t(`terraform.param.${paramId}`) })}
        </span>

        {/* Pct */}
        <span style={pctStyle}>{pct}%</span>

        {/* Action button area */}
        {activeMission ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, color: '#7bb8ff', flexShrink: 0 }}>
              {t(`terraform.phase.${activeMission.phase}`)}
              {missionPhaseProgress !== null && (
                <span style={{ color: '#556677' }}>
                  {' '}({Math.round(missionPhaseProgress * 100)}%)
                </span>
              )}
            </span>
            <button
              style={{
                ...btnBase,
                background: 'rgba(80,30,30,0.6)',
                color: '#cc6666',
              }}
              onClick={() => onCancelMission(activeMission.id)}
            >
              {t('terraform.cancel_mission')}
            </button>
          </div>
        ) : canDispatch ? (
          <button
            style={{
              ...btnBase,
              background: 'rgba(40,70,100,0.7)',
              color: '#7bb8ff',
            }}
            onClick={() => onDispatch(paramId)}
          >
            {t(actionLabelKey)}
          </button>
        ) : (
          <button
            disabled
            title={reasonText}
            style={{
              ...btnBase,
              background: 'rgba(20,30,45,0.4)',
              color: '#445566',
              cursor: 'not-allowed',
            }}
          >
            {t(actionLabelKey)}
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 6, padding: '0 18px' }}>
        <div style={{
          height: 4,
          background: 'rgba(30,40,60,0.7)',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${pct}%`,
            height: '100%',
            background: paramBarColor(pct),
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{
          marginTop: 8,
          padding: '6px 18px',
          fontSize: 9,
          color: '#667788',
          lineHeight: 1.6,
        }}>
          {!gate.allowed && reasonText && (
            <div style={{ color: '#cc8844', marginBottom: 4 }}>{reasonText}</div>
          )}
          {!hasDonors && gate.allowed && (
            <div style={{ color: '#cc8844', marginBottom: 4 }}>{t('terraform.no_donors_msg')}</div>
          )}
          <div>
            {t('terraform.param_full.' + paramId, { defaultValue: t(`terraform.param.${paramId}`) })}
            {': '}{pct}% / 100%
          </div>
          {paramState.lastDeliveryAt && (
            <div style={{ color: '#556677' }}>
              {t('terraform.phase.idle')}: {new Date(paramState.lastDeliveryAt).toLocaleTimeString()}
            </div>
          )}
          {activeMission && (
            <div style={{ marginTop: 4, color: '#7bb8ff' }}>
              {t('terraform.mission_eta')}: {fmtHours(activeMission.flightHours)}
              {' — '}
              {activeMission.amount.toLocaleString()} {activeMission.resource}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main TerraformPanel component
// ---------------------------------------------------------------------------

export function TerraformPanel({
  planet,
  terraformState,
  hasGenesisVault,
  techState,
  donorPlanets,
  donorDistances,
  getResources,
  shipTier,
  availableShips,
  activeMissionByParam,
  onStartParam,
  onCancelMission,
  onClose,
}: TerraformPanelProps): React.ReactElement {
  const { t } = useTranslation();

  // Local state: which param is pending dispatch (opens MissionDispatchModal)
  const [dispatchTarget, setDispatchTarget] = useState<{
    paramId: TerraformParamId;
    resource: 'minerals' | 'volatiles' | 'isotopes' | 'water';
  } | null>(null);

  const overallPct = useMemo(
    () => Math.round(getOverallProgress(terraformState)),
    [terraformState],
  );

  // Safe tier: if 0 (no landing pad), clamp to 1 for dispatch
  const effectiveTier = (shipTier >= 1 ? shipTier : 1) as ShipTier;

  const handleDispatchRequest = useCallback((paramId: TerraformParamId) => {
    setDispatchTarget({ paramId, resource: primaryResource(paramId) });
  }, []);

  const handleModalDispatch = useCallback(
    (mission: Omit<Mission, 'id' | 'startedAt' | 'phaseStartedAt'>) => {
      onStartParam(
        mission.paramId,
        mission.donorPlanetId,
        mission.resource,
        mission.amount,
        mission.tier,
        mission.flightHours,
        mission.repairCostMinerals,
        mission.shipId,
      );
      setDispatchTarget(null);
    },
    [onStartParam],
  );

  // Build distanceLY callback for MissionDispatchModal
  const distanceLYForDonor = useCallback(
    (donorPlanetId: string): number => donorDistances.get(donorPlanetId) ?? 0,
    [donorDistances],
  );

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 11500,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.6)',
    fontFamily: 'monospace',
    paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)',
    paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
    overflowY: 'auto',
  };

  const panelStyle: React.CSSProperties = {
    width: 360,
    maxWidth: '96vw',
    background: 'linear-gradient(180deg, rgba(8,14,26,0.99) 0%, rgba(5,10,20,0.99) 100%)',
    border: '1px solid #334455',
    borderRadius: 6,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px 10px',
    borderBottom: '1px solid rgba(50,65,85,0.5)',
    background: 'rgba(10,18,32,0.8)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 11,
    color: '#aabbcc',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
  };

  const closeBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#667788',
    fontFamily: 'monospace',
    fontSize: 14,
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 2px',
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 8,
    color: '#445566',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    padding: '10px 16px 4px',
  };

  const bodyStyle: React.CSSProperties = {
    padding: '0 16px',
  };

  const overallBarBg = 'rgba(30,40,60,0.7)';
  const overallBarColor_ = overallBarColor(overallPct);

  return (
    <>
      {/* Backdrop */}
      <div style={overlayStyle} onClick={onClose}>
        <div style={panelStyle} onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div style={headerStyle}>
            <span style={titleStyle}>
              {t('terraform.panel_title', { planet: planet.name })}
            </span>
            <button style={closeBtnStyle} onClick={onClose}>X</button>
          </div>

          {/* Overall progress */}
          <div style={{ padding: '12px 16px 8px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}>
              <span style={{ fontSize: 9, color: '#8899aa', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                {t('terraform.overall_progress')}
              </span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: 'bold',
                  color: overallBarColor_,
                }}>
                  {overallPct}%
                </span>
                <span style={{ fontSize: 9, color: '#445566' }}>
                  {t('terraform.target_label')}
                </span>
              </div>
            </div>
            <div style={{
              height: 8,
              background: overallBarBg,
              borderRadius: 4,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${overallPct}%`,
                height: '100%',
                background: overallBarColor_,
                borderRadius: 4,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>

          {/* Param list */}
          <div style={sectionLabelStyle}>{/* spacer */}</div>
          <div style={bodyStyle}>
            {PARAM_ORDER.map((paramId) => (
              <ParamRow
                key={paramId}
                paramId={paramId}
                planet={planet}
                terraformState={terraformState}
                hasGenesisVault={hasGenesisVault}
                techState={techState}
                donorPlanets={donorPlanets}
                activeMission={activeMissionByParam[paramId]}
                onDispatch={handleDispatchRequest}
                onCancelMission={onCancelMission}
              />
            ))}
          </div>

          {/* Bottom padding */}
          <div style={{ height: 12 }} />
        </div>
      </div>

      {/* Dispatch modal */}
      {dispatchTarget && (
        <MissionDispatchModal
          targetPlanet={planet}
          paramId={dispatchTarget.paramId}
          donorPlanets={donorPlanets}
          getResources={getResources}
          tier={effectiveTier}
          availableShips={availableShips}
          distanceLY={distanceLYForDonor}
          currentProgress={terraformState.params[dispatchTarget.paramId].progress}
          onDispatch={handleModalDispatch}
          onClose={() => setDispatchTarget(null)}
        />
      )}
    </>
  );
}
