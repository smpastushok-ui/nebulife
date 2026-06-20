// ---------------------------------------------------------------------------
// MissionTracker — active terraform missions panel (opened from the CommandBar
// mission button). Controlled component: visibility is owned by the parent.
// ---------------------------------------------------------------------------

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CargoShipment, Mission, MissionPhase } from '@nebulife/core';
import { ResourceIcon, RESOURCE_COLORS, type ResourceType } from '../ResourceIcon.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MissionTrackerProps {
  missions: Mission[];
  cargoShipments?: CargoShipment[];
  colonyShipMissions?: ColonyShipMissionView[];
  getPlanetName: (planetId: string) => string;
  /** Whether the panel is open (owned by the parent / CommandBar button). */
  open: boolean;
  onClose: () => void;
}

export interface ColonyShipMissionView {
  id: string;
  shipName: string;
  targetPlanetId: string;
  targetPlanetName: string;
  departedAt: number | null;
  arrivalAt: number | null;
  arrived: boolean;
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

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  if (minutes > 0) return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  return `${seconds}s`;
}

function cargoShipmentProgress(shipment: CargoShipment, now: number): number {
  const elapsed = now - shipment.phaseStartedAt;
  const LOAD_MS = 20_000;
  const durations: Record<CargoShipment['status'], number> = {
    loading: LOAD_MS,
    outbound: shipment.flightMs,
    unloading: LOAD_MS,
    returning: shipment.flightMs,
    completed: 1,
  };
  const duration = Math.max(1, durations[shipment.status]);
  return Math.min(1, Math.max(0, elapsed / duration));
}

function cargoShipmentRemaining(shipment: CargoShipment, now: number): number {
  const elapsed = now - shipment.phaseStartedAt;
  if (shipment.status === 'loading' || shipment.status === 'unloading') return Math.max(0, 20_000 - elapsed);
  if (shipment.status === 'outbound' || shipment.status === 'returning') return Math.max(0, shipment.flightMs - elapsed);
  return 0;
}

function colonyShipProgress(mission: ColonyShipMissionView, now: number): number {
  if (mission.arrived) return 1;
  if (!mission.departedAt || !mission.arrivalAt || mission.arrivalAt <= mission.departedAt) return 0;
  return Math.min(1, Math.max(0, (now - mission.departedAt) / (mission.arrivalAt - mission.departedAt)));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MissionTracker({
  missions,
  cargoShipments = [],
  colonyShipMissions = [],
  getPlanetName,
  open,
  onClose,
}: MissionTrackerProps): React.ReactElement | null {
  const { t } = useTranslation();
  const activeCargoShipments = cargoShipments.filter((shipment) => shipment.status !== 'completed');

  if (!open || (missions.length === 0 && activeCargoShipments.length === 0 && colonyShipMissions.length === 0)) return null;

  const now = Date.now();
  const missionFeedItems = [
    ...missions.map((mission) => ({
      kind: 'terraform' as const,
      key: `terraform:${mission.id}`,
      timestamp: mission.phaseStartedAt,
      mission,
    })),
    ...activeCargoShipments.map((shipment) => ({
      kind: 'cargo' as const,
      key: `cargo:${shipment.id}`,
      timestamp: shipment.phaseStartedAt,
      shipment,
    })),
    ...colonyShipMissions.map((mission) => ({
      kind: 'colony' as const,
      key: `colony:${mission.id}`,
      timestamp: mission.departedAt ?? mission.arrivalAt ?? 0,
      mission,
    })),
  ].sort((a, b) => b.timestamp - a.timestamp);

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
    width: 'min(340px, calc(100vw - 24px))',
    maxHeight: 'min(620px, calc(100dvh - 96px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)))',
    overflow: 'hidden',
    boxSizing: 'border-box',
    fontFamily: 'monospace',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    boxShadow: '0 8px 28px rgba(0,0,0,0.6)',
  };
  const listStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 'min(456px, calc(100dvh - 158px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)))',
    overflowY: 'auto',
    paddingRight: 2,
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

        <div style={listStyle}>
          {missionFeedItems.map((item) => {
            if (item.kind === 'terraform') {
              const m = item.mission;
              const progress = phaseProgress(m, now);
              const phaseLabel = t(`terraform.phase.${m.phase}`);
              const targetName = getPlanetName(m.targetPlanetId);
              const isResource = RESOURCE_TYPES.has(m.resource);

              return (
                <div
                  key={item.key}
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
            }

            if (item.kind === 'cargo') {
              const shipment = item.shipment;
              const progress = cargoShipmentProgress(shipment, now);
              const remaining = cargoShipmentRemaining(shipment, now);
              const targetName = getPlanetName(shipment.toPlanetId);
              const originName = getPlanetName(shipment.fromPlanetId);
              return (
                <div
                  key={item.key}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 4,
                    borderBottom: '1px solid #1a2233', paddingBottom: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                    <span style={{ color: '#aabbcc' }}>{targetName}</span>
                    <span style={{ color: '#7bb8ff' }}>{t('terraform.cargo_title')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9, color: '#667788' }}>
                    <span>{originName} -&gt; {targetName}</span>
                    <span>{t(`terraform.cargo_phase.${shipment.status}`)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9, color: '#667788' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ color: RESOURCE_COLORS[shipment.resource as ResourceType] }}>
                        {shipment.amount.toLocaleString()}
                      </span>
                      <ResourceIcon type={shipment.resource as ResourceType} size={12} />
                    </span>
                    <span>{t('terraform.mission_eta')}: {formatRemaining(remaining)}</span>
                  </div>
                  <div style={{ height: 3, background: '#1a2233', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.round(progress * 100)}%`,
                      background: shipment.status === 'returning' ? '#8866aa' : '#4488aa',
                      transition: 'width 1s linear',
                    }} />
                  </div>
                </div>
              );
            }

            const mission = item.mission;
            const progress = colonyShipProgress(mission, now);
            const remaining = mission.arrived || !mission.arrivalAt ? 0 : Math.max(0, mission.arrivalAt - now);
            return (
              <div
                key={item.key}
                style={{
                  display: 'flex', flexDirection: 'column', gap: 4,
                  borderBottom: '1px solid #1a2233', paddingBottom: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                  <span style={{ color: '#aabbcc' }}>{mission.targetPlanetName}</span>
                  <span style={{ color: '#44ff88' }}>{t('terraform.colony_ship_title')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9, color: '#667788' }}>
                  <span>{mission.shipName}</span>
                  <span>{mission.arrived ? t('terraform.colony_ship_arrived') : `${t('terraform.mission_eta')}: ${formatRemaining(remaining)}`}</span>
                </div>
                <div style={{ height: 3, background: '#1a2233', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.round(progress * 100)}%`,
                    background: '#44ff88',
                    transition: 'width 1s linear',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
