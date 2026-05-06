import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BuildingType, FleetState, ObservatorySearchDuration, ObservatorySearchProgram, ObservatoryState, PlacedBuilding, Planet, PlanetResourceStocks, ProducibleType } from '@nebulife/core';
import { BUILDING_DEFS, PRODUCIBLE_ASSET_PATHS, PRODUCIBLE_DEFS, getAvailableObservatoryPrograms, getCatalogEntry, getCatalogName, getObservatoryLevel, getObservatoryMaxActiveSearches, getObservatorySearchChance, getObservatoryXpProgress, isShipProducible } from '@nebulife/core';

import { ResourceIcon, RESOURCE_COLORS } from '../ResourceIcon.js';
import { watchAdsWithProgress } from '../../../services/ads-service.js';
import {
  deriveBuildingDetailStats,
  getBuildingEconomyProfile,
  primaryOutputResource,
  type BuildingEconomyProfile,
  type ColonyResourceKey,
  type RateRow,
} from './building-detail-model.js';

type ColonyResources = Record<ColonyResourceKey, number>;
type ActionReport = {
  id: string;
  title: string;
  body: string;
  impact: string;
  tone: 'info' | 'success' | 'warning';
};

export interface BuildingDetailPanelProps {
  planet: Planet;
  building?: PlacedBuilding;
  buildingType?: BuildingType;
  buildings: PlacedBuilding[];
  colonyResources: ColonyResources;
  researchData: number;
  planetStocks?: PlanetResourceStocks;
  explorationPayloads?: Partial<Record<ProducibleType, number>>;
  shipFleet?: FleetState;
  explorationProductionQueue?: Array<{ id: string; type: ProducibleType; planetId: string; startedAt: number; durationMs: number }>;
  observatoryState?: ObservatoryState;
  onClose: () => void;
  onOpenColonyCenter?: (tab?: 'overview' | 'production') => void;
  onStartPayloadProduction?: (type: ProducibleType) => void;
  onStartObservatorySearch?: (duration: ObservatorySearchDuration, program: ObservatorySearchProgram) => boolean | void;
  isPremium?: boolean;
  onResourceChange?: (delta: Partial<ColonyResources>) => void;
  onResearchDataChange?: (delta: number) => void;
  onDemolish?: (building: PlacedBuilding) => void;
}

const PANEL_BG = '#020510';
const CARD_BG = 'rgba(10,15,25,0.62)';
const BORDER = '#233344';
const ACTIVE_BORDER = '#446688';

function formatRate(row: RateRow): string {
  return formatPerHour(row.perHour);
}

function formatPerHour(perHour: number): string {
  const sign = perHour > 0 ? '+' : '';
  return `${sign}${perHour.toFixed(perHour % 1 === 0 ? 0 : 1)}/h`;
}

function ResourceLabel({ resource }: { resource: string }) {
  const { t } = useTranslation();
  const resourceKey = resource === 'researchData' ? 'researchData' : resource;
  if (resourceKey === 'energy') {
    return <span>{t('building_detail.resource.energy')}</span>;
  }
  if (resourceKey === 'minerals' || resourceKey === 'volatiles' || resourceKey === 'isotopes' || resourceKey === 'water') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <ResourceIcon type={resourceKey} size={11} />
        {t(`colony_center.resource.${resourceKey}`)}
      </span>
    );
  }
  return <span>{t(`building_detail.resource.${resourceKey}`, { defaultValue: resourceKey })}</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 10, color: '#667788', letterSpacing: 2, textTransform: 'uppercase' }}>{title}</div>
      {children}
    </section>
  );
}

function MetricCard({ label, value, accent, sub }: { label: string; value: string; accent?: string; sub?: string }) {
  return (
    <div style={{
      background: CARD_BG,
      border: `1px solid ${BORDER}`,
      borderRadius: 4,
      padding: '10px 12px',
      minWidth: 0,
    }}>
      <div style={{ fontSize: 9, color: '#667788', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, color: accent ?? '#aabbcc', fontWeight: 600 }}>{value}</div>
      {sub && <div style={{ marginTop: 3, fontSize: 9, color: '#556677' }}>{sub}</div>}
    </div>
  );
}

function RateList({ rows, empty }: { rows: RateRow[]; empty: string }) {
  if (rows.length === 0) {
    return <div style={{ color: '#556677', fontSize: 11 }}>{empty}</div>;
  }
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {rows.map((row) => (
        <div
          key={`${row.resource}-${row.perHour}`}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(5,10,20,0.5)',
            border: '1px solid rgba(51,68,85,0.55)',
            borderRadius: 4,
            padding: '7px 9px',
            fontSize: 11,
          }}
        >
          <span style={{ color: '#8899aa' }}><ResourceLabel resource={row.resource} /></span>
          <span style={{ color: row.perHour >= 0 ? '#88bb99' : '#cc7777' }}>{formatRate(row)}</span>
        </div>
      ))}
    </div>
  );
}

function BuildingFlowPanel({
  profile,
  production,
  consumption,
  accent,
}: {
  profile: BuildingEconomyProfile;
  production: RateRow[];
  consumption: RateRow[];
  accent: string;
}) {
  const { t } = useTranslation();
  const firstInput = consumption[0];
  const firstOutput = production[0];
  return (
    <Section title={t('building_detail.economy_chain')}>
      <div style={{
        background: `linear-gradient(135deg, rgba(10,15,25,0.72), ${accent}12)`,
        border: `1px solid ${accent}55`,
        borderRadius: 6,
        padding: 12,
        display: 'grid',
        gap: 10,
        boxShadow: `0 0 20px ${accent}12`,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
          <MetricCard
            label={t('building_detail.role_label')}
            value={t(`building_detail.role.${profile.role}`)}
            sub={t(`building_detail.flow.${profile.role}`)}
            accent={accent}
          />
          <MetricCard
            label={t('building_detail.input_label')}
            value={firstInput ? formatRate(firstInput) : t('building_detail.input_none')}
            sub={firstInput ? t('building_detail.input_source', { resource: t(`building_detail.resource.${firstInput.resource}`, { defaultValue: firstInput.resource }) }) : t('building_detail.input_none_desc')}
            accent={firstInput ? '#cc9966' : '#667788'}
          />
          <MetricCard
            label={t('building_detail.output_label')}
            value={firstOutput ? formatRate(firstOutput) : t('building_detail.output_passive')}
            sub={firstOutput ? t('building_detail.output_target') : t(`building_detail.passive.${profile.role}`)}
            accent={firstOutput ? '#88bb99' : '#778899'}
          />
        </div>
        <div style={{
          height: 4,
          borderRadius: 999,
          overflow: 'hidden',
          background: 'rgba(5,10,20,0.75)',
          border: '1px solid rgba(51,68,85,0.45)',
        }}>
          <div style={{
            height: '100%',
            width: '62%',
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            animation: 'chat-neon-pulse 2.4s ease-in-out infinite',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {profile.links.map((link) => (
            <span key={link} style={{
              border: '1px solid rgba(68,102,136,0.45)',
              borderRadius: 999,
              padding: '3px 8px',
              color: '#8899aa',
              fontSize: 10,
              background: 'rgba(5,10,20,0.45)',
            }}>
              {t(`building_detail.role.${link}`)}
            </span>
          ))}
        </div>
        {profile.future !== 'none' && (
          <div style={{
            color: '#667788',
            fontSize: 10,
            lineHeight: 1.45,
            borderTop: '1px solid rgba(51,68,85,0.45)',
            paddingTop: 8,
          }}>
            {t(`building_detail.future.${profile.future}`)}
          </div>
        )}
      </div>
    </Section>
  );
}

function ActionButton({
  title,
  desc,
  disabled,
  onClick,
}: {
  title: string;
  desc: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        background: disabled ? 'rgba(10,15,25,0.35)' : 'rgba(20,30,45,0.55)',
        border: `1px solid ${disabled ? '#223344' : ACTIVE_BORDER}`,
        borderRadius: 4,
        padding: '10px 12px',
        color: disabled ? '#556677' : '#aabbcc',
        fontFamily: 'monospace',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <div style={{ fontSize: 12, color: disabled ? '#667788' : '#7bb8ff', letterSpacing: 1, textTransform: 'uppercase' }}>
        {title}
      </div>
      <div style={{ marginTop: 4, fontSize: 10, color: disabled ? '#445566' : '#778899', lineHeight: 1.4 }}>
        {desc}
      </div>
    </button>
  );
}

function ActionReportCard({ report }: { report: ActionReport }) {
  const accent = report.tone === 'success'
    ? '#88bb99'
    : report.tone === 'warning'
      ? '#ff8844'
      : '#7bb8ff';
  return (
    <div style={{
      background: `linear-gradient(135deg, rgba(5,10,20,0.72), ${accent}16)`,
      border: `1px solid ${accent}66`,
      borderRadius: 5,
      padding: '10px 12px',
      display: 'grid',
      gap: 7,
      boxShadow: `0 0 16px ${accent}14`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
        <div style={{ color: accent, fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase' }}>
          {report.title}
        </div>
        <div style={{ color: '#556677', fontSize: 9, letterSpacing: 1 }}>
          REPORT
        </div>
      </div>
      <div style={{ color: '#aabbcc', fontSize: 11, lineHeight: 1.45 }}>
        {report.body}
      </div>
      <div style={{
        color: '#778899',
        fontSize: 10,
        lineHeight: 1.4,
        borderTop: '1px solid rgba(51,68,85,0.55)',
        paddingTop: 7,
      }}>
        {report.impact}
      </div>
    </div>
  );
}

const LANDING_PAD_PRODUCIBLES: ProducibleType[] = [
  'research_shuttle',
  'rover_dropcraft',
  'atmo_probe_carrier',
];

const LANDING_PAD_RESEARCH_UNITS: ProducibleType[] = [
  'survey_probe',
  'orbital_satellite',
  'surface_rover',
  'atmosphere_probe',
  'scout_drone',
];

const SPACEPORT_PRODUCIBLES: ProducibleType[] = [
  'lander',
  'research_station_kit',
  'transport_small',
  'transport_large',
  'terraform_freighter',
  'colony_ship',
];

const OBSERVATORY_DURATIONS: ObservatorySearchDuration[] = ['1h', '6h', '24h'];

const OBSERVATORY_PROGRAM_LABEL: Record<ObservatorySearchProgram, string> = {
  routine_sky_watch: 'observatory.program.routine_sky_watch',
  anomaly_sweep: 'observatory.program.anomaly_sweep',
  phenomenon_survey: 'observatory.program.phenomenon_survey',
  deep_space_watch: 'observatory.program.deep_space_watch',
  catalog_completion: 'observatory.program.catalog_completion',
};

const OBSERVATORY_PROGRAM_DESC: Record<ObservatorySearchProgram, string> = {
  routine_sky_watch: 'observatory.program_desc.routine_sky_watch',
  anomaly_sweep: 'observatory.program_desc.anomaly_sweep',
  phenomenon_survey: 'observatory.program_desc.phenomenon_survey',
  deep_space_watch: 'observatory.program_desc.deep_space_watch',
  catalog_completion: 'observatory.program_desc.catalog_completion',
};

const OBSERVATORY_DURATION_DESC: Record<ObservatorySearchDuration, string> = {
  '1h': 'observatory.duration_desc.1h',
  '6h': 'observatory.duration_desc.6h',
  '24h': 'observatory.duration_desc.24h',
};

const OBSERVATORY_DURATION_STYLE: Record<ObservatorySearchDuration, {
  code: string;
  titleKey: string;
  subtitleKey: string;
  accent: string;
  glow: string;
}> = {
  '1h': {
    code: 'STD',
    titleKey: 'observatory.scan_standard_title',
    subtitleKey: 'observatory.scan_standard_subtitle',
    accent: '#7bb8ff',
    glow: 'rgba(68,136,170,0.24)',
  },
  '6h': {
    code: 'RARE',
    titleKey: 'observatory.scan_rare_title',
    subtitleKey: 'observatory.scan_rare_subtitle',
    accent: '#b78cff',
    glow: 'rgba(183,140,255,0.22)',
  },
  '24h': {
    code: 'UNIQ',
    titleKey: 'observatory.scan_unique_title',
    subtitleKey: 'observatory.scan_unique_subtitle',
    accent: '#ddaa44',
    glow: 'rgba(221,170,68,0.24)',
  },
};

const RESOURCE_LABEL_KEY: Record<string, string> = {
  minerals: 'colony_center.resource.minerals',
  volatiles: 'colony_center.resource.volatiles',
  isotopes: 'colony_center.resource.isotopes',
  water: 'colony_center.resource.water',
};

function formatQueueTime(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes > 0 ? `${minutes}m ${seconds.toString().padStart(2, '0')}s` : `${seconds}s`;
}

function payloadCostSummary(type: ProducibleType, t: (key: string, options?: Record<string, unknown>) => string): string {
  const totals: Record<string, number> = {};
  for (const cost of PRODUCIBLE_DEFS[type]?.cost ?? []) {
    const key = cost.resource === 'volatiles' || cost.resource === 'isotopes' || cost.resource === 'water'
      ? cost.resource
      : 'minerals';
    totals[key] = (totals[key] ?? 0) + cost.amount;
  }
  return Object.entries(totals)
    .filter(([, amount]) => amount > 0)
    .map(([key, amount]) => `${t(RESOURCE_LABEL_KEY[key] ?? key)} ${amount}`)
    .join(' · ');
}

function ObservatorySignalVisual({ progress, accent }: { progress: number; accent: string }) {
  return (
    <div style={{
      position: 'relative',
      height: 74,
      borderRadius: 6,
      overflow: 'hidden',
      background: 'radial-gradient(circle at 50% 50%, rgba(68,136,170,0.20), rgba(2,5,16,0.92) 62%)',
      border: `1px solid ${accent}66`,
      boxShadow: `inset 0 0 28px rgba(0,0,0,0.68), 0 0 18px ${accent}22`,
    }}>
      {[0, 1, 2].map((ring) => (
        <div
          key={ring}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 26 + ring * 24,
            height: 26 + ring * 24,
            borderRadius: '50%',
            border: `1px solid ${accent}${ring === 0 ? 'dd' : ring === 1 ? '88' : '44'}`,
            transform: `translate(-50%, -50%) scale(${0.78 + progress * 0.34 + ring * 0.05})`,
            opacity: 0.75 - ring * 0.18,
          }}
        />
      ))}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 2,
        height: 74,
        background: `linear-gradient(180deg, transparent, ${accent}, transparent)`,
        transform: `translate(-50%, -50%) rotate(${progress * 360}deg)`,
        transformOrigin: '50% 50%',
        opacity: 0.72,
      }} />
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 8,
        height: 8,
        borderRadius: 3,
        background: accent,
        boxShadow: `0 0 18px ${accent}`,
        transform: 'translate(-50%, -50%)',
      }} />
    </div>
  );
}

function ObservatorySessionCard({
  session,
  now,
}: {
  session: ObservatoryState['sessions'][number];
  now: number;
}) {
  const { t } = useTranslation();
  const style = OBSERVATORY_DURATION_STYLE[session.duration];
  const durationMs = Math.max(1, session.completesAt - session.startedAt);
  const progress = Math.max(0, Math.min(1, (now - session.startedAt) / durationMs));
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '92px 1fr',
      gap: 10,
      alignItems: 'center',
      background: `linear-gradient(135deg, rgba(5,10,20,0.72), ${style.glow})`,
      border: `1px solid ${style.accent}66`,
      borderRadius: 6,
      padding: 10,
      boxShadow: `0 0 18px ${style.glow}`,
    }}>
      <ObservatorySignalVisual progress={progress} accent={style.accent} />
      <div style={{ minWidth: 0, display: 'grid', gap: 7 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ color: style.accent, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            {t(OBSERVATORY_PROGRAM_LABEL[session.program])}
          </span>
          <span style={{ color: '#d8e6f2', fontSize: 11 }}>{formatQueueTime(session.completesAt - now)}</span>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: 'rgba(2,5,16,0.84)', overflow: 'hidden', border: '1px solid rgba(51,68,85,0.42)' }}>
          <div style={{ width: `${Math.round(progress * 100)}%`, height: '100%', background: `linear-gradient(90deg, ${style.accent}, #d8e6f2)` }} />
        </div>
        <div style={{ color: '#778899', fontSize: 10, lineHeight: 1.35 }}>
          {t(style.subtitleKey)} · {Math.round(progress * 100)}%
        </div>
      </div>
    </div>
  );
}

function ObservatoryDurationButton({
  duration,
  chance,
  disabled,
  onClick,
}: {
  duration: ObservatorySearchDuration;
  chance: number;
  disabled?: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const style = OBSERVATORY_DURATION_STYLE[duration];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        textAlign: 'left',
        background: disabled ? 'rgba(10,15,25,0.32)' : `linear-gradient(145deg, rgba(8,14,24,0.9), ${style.glow})`,
        border: `1px solid ${disabled ? '#223344' : `${style.accent}88`}`,
        borderRadius: 6,
        padding: '12px 12px',
        color: disabled ? '#556677' : '#aabbcc',
        fontFamily: 'monospace',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? undefined : `0 0 18px ${style.glow}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ color: style.accent, fontSize: 10, letterSpacing: 1.8 }}>{style.code}</span>
        <span style={{ color: disabled ? '#556677' : '#d8e6f2', fontSize: 14 }}>{t(`observatory.duration.${duration}`)}</span>
      </div>
      <div style={{ marginTop: 8, color: disabled ? '#445566' : style.accent, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>
        {t(style.titleKey)}
      </div>
      <div style={{ marginTop: 5, color: disabled ? '#445566' : '#778899', fontSize: 10, lineHeight: 1.4 }}>
        {t(OBSERVATORY_DURATION_DESC[duration], { chance })}
      </div>
    </button>
  );
}

function ObservatoryReportCard({ report }: { report: NonNullable<ObservatoryState['reports']>[number] }) {
  const { t, i18n } = useTranslation();
  const style = OBSERVATORY_DURATION_STYLE[report.duration];
  const entry = report.discoveryType ? getCatalogEntry(report.discoveryType) : undefined;
  const name = entry ? getCatalogName(entry, i18n.language) : report.discoveryType;
  const date = new Date(report.completedAt);
  return (
    <div style={{
      background: 'rgba(5,10,20,0.58)',
      border: `1px solid ${report.discoveryType ? `${style.accent}66` : 'rgba(51,68,85,0.7)'}`,
      borderRadius: 5,
      padding: '9px 10px',
      display: 'grid',
      gap: 5,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
        <span style={{ color: report.discoveryType ? style.accent : '#667788', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
          {report.discoveryType ? (name ?? report.discoveryType) : t('observatory.report_no_signal')}
        </span>
        <span style={{ color: '#556677', fontSize: 9 }}>
          {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div style={{ color: '#778899', fontSize: 10, lineHeight: 1.35 }}>
        {t(OBSERVATORY_PROGRAM_LABEL[report.program])} · {report.duration}
        {report.rarity ? ` · ${report.rarity}` : ''}
        {report.xpGained > 0 ? ` · +${report.xpGained} XP` : ''}
        {report.duplicate ? ` · ${t('observatory.report_duplicate')}` : ''}
      </div>
    </div>
  );
}

function ProducibleFrameCard({
  type,
  count,
  activeQueue,
  canBuild,
  onBuild,
}: {
  type: ProducibleType;
  count: number;
  activeQueue: Array<{ id: string; type: ProducibleType; planetId: string; startedAt: number; durationMs: number }>;
  canBuild: boolean;
  onBuild?: (type: ProducibleType) => void;
}) {
  const { t } = useTranslation();
  const [imageFailed, setImageFailed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const nextDone = activeQueue.length > 0
    ? Math.min(...activeQueue.map((item) => item.startedAt + item.durationMs))
    : null;
  const assetPath = PRODUCIBLE_ASSET_PATHS[type];
  const title = t(`planet_missions.payload.${type}`);
  const help = t(`building_detail.transport_help.${type}`);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 9,
      background: CARD_BG,
      border: '1px solid rgba(68,102,136,0.55)',
      borderRadius: 6,
      padding: 10,
      minHeight: 254,
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1 / 1',
        borderRadius: 5,
        background: 'radial-gradient(circle at 50% 35%, rgba(68,136,170,0.20), rgba(5,10,20,0.88))',
        border: '1px solid rgba(123,184,255,0.32)',
        boxShadow: 'inset 0 0 18px rgba(0,0,0,0.65)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {!imageFailed && (
          <img
            src={assetPath}
            alt={title}
            onError={() => setImageFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        <button
          type="button"
          onClick={() => setZoomOpen(true)}
          title={t('building_detail.transport_zoom')}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 24,
            height: 24,
            borderRadius: 4,
            border: '1px solid rgba(123,184,255,0.58)',
            background: 'rgba(2,5,16,0.74)',
            color: '#9fd0ff',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            padding: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <circle cx="7" cy="7" r="4.4" />
            <path d="M10.4 10.4L14 14" />
          </svg>
        </button>
        {imageFailed && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            color: '#446688',
            fontSize: 8,
            letterSpacing: 1,
            pointerEvents: 'none',
          }}>
            <span>{t('building_detail.transport_art_slot')}</span>
            <span>512x512</span>
          </div>
        )}
      </div>
      <div style={{ minWidth: 0, display: 'grid', gap: 7 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' }}>
          <div style={{ color: '#d8e6f2', fontSize: 13, lineHeight: 1.25 }}>{title}</div>
          <div style={{
            color: '#44ff88',
            fontSize: 16,
            lineHeight: 1,
            fontWeight: 700,
            flexShrink: 0,
            padding: '3px 7px',
            border: '1px solid rgba(68,255,136,0.45)',
            borderRadius: 4,
            background: 'rgba(68,255,136,0.09)',
            boxShadow: '0 0 10px rgba(68,255,136,0.12)',
          }}>
            {t('building_detail.transport_count', { count })}
          </div>
        </div>
        <div style={{ color: '#667788', fontSize: 10, lineHeight: 1.35 }}>{payloadCostSummary(type, t)}</div>
        {activeQueue.length > 0 && (
          <div style={{ color: '#ddaa44', fontSize: 10 }}>
            +{activeQueue.length} / {formatQueueTime((nextDone ?? Date.now()) - Date.now())}
          </div>
        )}
        {helpOpen && (
          <div style={{
            background: 'rgba(68,136,170,0.10)',
            border: '1px solid rgba(68,136,170,0.26)',
            borderRadius: 4,
            padding: '7px 8px',
            color: '#8faabd',
            fontSize: 10,
            lineHeight: 1.45,
          }}>
            {help}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 2 }}>
          <button
            type="button"
            onClick={() => setHelpOpen((prev) => !prev)}
            title={t('building_detail.transport_help_title')}
            style={{
              width: 26,
              height: 26,
              borderRadius: 3,
              border: '1px solid #334455',
              background: helpOpen ? 'rgba(68,136,170,0.22)' : 'rgba(20,25,35,0.45)',
              color: helpOpen ? '#9fd0ff' : '#667788',
              fontFamily: 'monospace',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            ?
          </button>
        <button
          type="button"
          disabled={!canBuild || !onBuild}
          onClick={() => onBuild?.(type)}
          style={{
            background: canBuild ? 'rgba(30,60,80,0.65)' : 'rgba(20,25,35,0.45)',
            border: canBuild ? '1px solid #446688' : '1px solid #334455',
            borderRadius: 3,
            color: canBuild ? '#7bb8ff' : '#445566',
            fontFamily: 'monospace',
            fontSize: 11,
            padding: '7px 10px',
            cursor: canBuild ? 'pointer' : 'not-allowed',
          }}
        >
          {t('colony_center.production.build_payload')}
        </button>
        </div>
      </div>
      {zoomOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setZoomOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10050,
            background: 'rgba(0,0,0,0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(620px, 94vw)',
              background: '#020510',
              border: '1px solid rgba(123,184,255,0.42)',
              borderRadius: 8,
              padding: 12,
              boxShadow: '0 20px 60px rgba(0,0,0,0.72)',
            }}
          >
            <img
              src={assetPath}
              alt={title}
              style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'contain', display: 'block', borderRadius: 5, background: '#050a14' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <div style={{ color: '#d8e6f2', fontSize: 13 }}>{title}</div>
              <button
                type="button"
                onClick={() => setZoomOpen(false)}
                style={{
                  background: 'rgba(20,30,45,0.72)',
                  border: '1px solid #446688',
                  borderRadius: 4,
                  color: '#9fd0ff',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  padding: '7px 12px',
                  cursor: 'pointer',
                }}
              >
                {t('common.close', { defaultValue: 'Close' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function BuildingDetailPanel({
  planet,
  building,
  buildingType,
  buildings,
  colonyResources,
  researchData,
  planetStocks,
  explorationPayloads,
  shipFleet,
  explorationProductionQueue,
  observatoryState,
  onClose,
  onOpenColonyCenter,
  onStartPayloadProduction,
  onStartObservatorySearch,
  isPremium = false,
  onResourceChange,
  onResearchDataChange,
  onDemolish,
}: BuildingDetailPanelProps) {
  const { t } = useTranslation();
  const [actionReports, setActionReports] = useState<ActionReport[]>([]);
  const [confirmDemolish, setConfirmDemolish] = useState(false);
  const [observatoryProgram, setObservatoryProgram] = useState<ObservatorySearchProgram>('routine_sky_watch');
  const [observatoryNow, setObservatoryNow] = useState(() => Date.now());
  const [observatoryAdsRunning, setObservatoryAdsRunning] = useState(false);
  const type = building?.type ?? buildingType;
  const def = type ? BUILDING_DEFS[type] : null;

  const stats = useMemo(() => {
    if (!type) return null;
    return deriveBuildingDetailStats({ type, planet, buildings, building, planetStocks });
  }, [building, buildings, planet, planetStocks, type]);

  if (!type || !def || !stats) return null;

  const primary = primaryOutputResource(type);
  const accent =
    primary && primary in RESOURCE_COLORS
      ? RESOURCE_COLORS[primary as ColonyResourceKey]
      : primary === 'researchData'
        ? '#aa88ff'
        : '#7bb8ff';
  const aggregateMode = !building;
  const economyProfile = getBuildingEconomyProfile(type);
  const canScan = researchData >= 5;
  const canChemCycle = colonyResources.volatiles >= 10;
  const compact = typeof window !== 'undefined' && window.innerWidth < 700;
  const energyOutputPerHour = stats.energyOutput * 60;
  const energyConsumptionPerHour = -stats.energyConsumption * 60;
  const energyNetPerHour = energyOutputPerHour + energyConsumptionPerHour;
  const colonyEnergyProduced = buildings
    .filter((item) => !item.shutdown)
    .reduce((sum, item) => sum + (BUILDING_DEFS[item.type]?.energyOutput ?? 0), 0);
  const colonyEnergyConsumed = buildings
    .filter((item) => !item.shutdown)
    .reduce((sum, item) => sum + (BUILDING_DEFS[item.type]?.energyConsumption ?? 0), 0);
  const colonyPopulationCapacity = buildings
    .filter((item) => !item.shutdown)
    .reduce((sum, item) => sum + (BUILDING_DEFS[item.type]?.populationCapacityAdd ?? 0), 0);
  const producibleTypes = type === 'landing_pad'
    ? LANDING_PAD_PRODUCIBLES
    : type === 'spaceport'
      ? SPACEPORT_PRODUCIBLES
      : [];
  const productionSections = type === 'landing_pad'
    ? [
        { title: t('building_detail.transport_carriers'), items: LANDING_PAD_PRODUCIBLES },
        { title: t('building_detail.transport_research_units'), items: LANDING_PAD_RESEARCH_UNITS },
      ]
    : type === 'spaceport'
      ? [{ title: t('building_detail.transport_heavy_units'), items: SPACEPORT_PRODUCIBLES }]
      : [];
  const isotopeDepositDepleted =
    stats.stock?.resource === 'isotopes' &&
    stats.stock.remaining <= 0;
  const getProducedCount = (producibleType: ProducibleType): number => {
    if (!isShipProducible(producibleType)) return explorationPayloads?.[producibleType] ?? 0;
    return (shipFleet?.ships ?? []).filter((ship) => (
      ship.type === producibleType &&
      ship.currentPlanetId === planet.id &&
      ship.status !== 'in_transit'
    )).length;
  };
  const observatoryLevel = observatoryState ? getObservatoryLevel(observatoryState) : 1;
  const observatoryXp = observatoryState ? getObservatoryXpProgress(observatoryState) : { level: 1, current: 0, required: 100, pct: 0 };
  const observatoryPrograms = getAvailableObservatoryPrograms(observatoryLevel);
  const activeObservatorySessions = observatoryState?.sessions ?? [];
  const maxObservatorySessions = observatoryState ? getObservatoryMaxActiveSearches(observatoryState) : 1;
  const hasObservatorySlot = activeObservatorySessions.length < maxObservatorySessions;
  const observatoryReports = [...(observatoryState?.reports ?? [])].reverse().slice(0, 8);
  const selectedObservatoryProgram = observatoryPrograms.includes(observatoryProgram)
    ? observatoryProgram
    : observatoryPrograms[observatoryPrograms.length - 1] ?? 'routine_sky_watch';

  useEffect(() => {
    if (activeObservatorySessions.length === 0) return;
    const id = window.setInterval(() => setObservatoryNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activeObservatorySessions.length]);

  const pushActionReport = (report: ActionReport) => {
    setActionReports((reports) => [report, ...reports].slice(0, 4));
  };

  const runScan = () => {
    if (!canScan) return;
    onResearchDataChange?.(-5);
    const stock = stats.stock;
    const body = stats.stock
      ? t('building_detail.action_result_stock', { pct: stats.stock.pct })
      : t('building_detail.action_result_signal');
    pushActionReport({
      id: `scan-${Date.now()}`,
      title: t('building_detail.report_scan_title'),
      body,
      impact: stock
        ? t('building_detail.report_scan_impact_stock', {
            resource: t(`colony_center.resource.${stock.resource}`),
            remaining: Math.floor(stock.remaining),
            pct: stock.pct,
          })
        : t('building_detail.report_scan_impact_signal'),
      tone: stock && stock.pct < 15 ? 'warning' : 'info',
    });
  };

  const inspectDeposit = () => {
    const id = `deposit-${Date.now()}`;
    const stock = stats.stock;
    if (stock) {
      const resource = t(`colony_center.resource.${stock.resource}`);
      pushActionReport({
        id,
        title: t('building_detail.report_deposit_title'),
        body: t('building_detail.action_result_deposit', {
          resource,
          remaining: Math.floor(stock.remaining),
          pct: stock.pct,
        }),
        impact: t('building_detail.report_deposit_impact', { resource }),
        tone: stock.pct < 15 ? 'warning' : 'success',
      });
    } else {
      pushActionReport({
        id,
        title: t('building_detail.report_deposit_title'),
        body: t('building_detail.action_result_no_deposit'),
        impact: t('building_detail.report_no_persistent_effect'),
        tone: 'info',
      });
    }
  };

  const runChemCycle = () => {
    if (!canChemCycle) return;
    onResourceChange?.({ volatiles: -10, isotopes: 3, water: 2 });
    pushActionReport({
      id: `chem-${Date.now()}`,
      title: t('building_detail.report_chemistry_title'),
      body: t('building_detail.action_result_chemistry'),
      impact: t('building_detail.report_chemistry_impact'),
      tone: 'success',
    });
  };

  const addInfoReport = (title: string, body: string, impact = t('building_detail.report_no_persistent_effect')) => {
    pushActionReport({
      id: `info-${Date.now()}`,
      title,
      body,
      impact,
      tone: 'info',
    });
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9900,
      background: PANEL_BG,
      color: '#aabbcc',
      fontFamily: 'monospace',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: compact ? '12px 12px' : '14px 16px',
        paddingLeft: compact ? 'calc(12px + env(safe-area-inset-left, 0px))' : 'calc(76px + env(safe-area-inset-left, 0px))',
        paddingTop: compact ? 'calc(12px + env(safe-area-inset-top, 0px))' : 'calc(70px + env(safe-area-inset-top, 0px))',
        borderBottom: '1px solid #1a2a3a',
        flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'linear-gradient(180deg, rgba(22,42,64,0.92), rgba(8,16,28,0.94))',
            border: '1px solid #446688',
            borderRadius: 3,
            color: '#9fd0ff',
            fontFamily: 'monospace',
            fontSize: 10,
            padding: '7px 12px',
            cursor: 'pointer',
            letterSpacing: 1,
            textTransform: 'uppercase',
            boxShadow: '0 0 12px rgba(68,136,170,0.22)',
          }}
        >
          {t('colony_center.back')}
        </button>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
          <div style={{ fontSize: 15, color: '#aabbcc', letterSpacing: 3, textTransform: 'uppercase' }}>
            {t(`buildings.${type}.name`, { defaultValue: def.name })}
          </div>
          <div style={{ fontSize: 9, color: '#667788', letterSpacing: 1 }}>
            {aggregateMode
              ? t('building_detail.aggregate_subtitle', { count: stats.count })
              : t('building_detail.level_subtitle', { level: stats.level })}
          </div>
        </div>
        <div style={{
          width: 10,
          height: 10,
          borderRadius: 3,
          background: stats.isShutdown ? '#cc4444' : accent,
          boxShadow: `0 0 10px ${stats.isShutdown ? '#cc444466' : `${accent}66`}`,
        }} />
      </div>

      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: compact
          ? '12px 12px calc(110px + env(safe-area-inset-bottom, 0px))'
          : '14px 16px calc(120px + env(safe-area-inset-bottom, 0px))',
        paddingLeft: compact ? 'calc(12px + env(safe-area-inset-left, 0px))' : 'calc(76px + env(safe-area-inset-left, 0px))',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(20,30,45,0.72), rgba(5,10,20,0.74))',
          border: `1px solid ${ACTIVE_BORDER}`,
          borderRadius: 6,
          padding: 14,
          boxShadow: '0 12px 30px rgba(0,0,0,0.22)',
        }}>
          <div style={{ fontSize: 10, color: accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            {t(`colony_center.building_category.${def.category}`)}
          </div>
          <div style={{ fontSize: 12, color: '#8899aa', lineHeight: 1.5 }}>
            {t(`buildings.${type}.desc`, { defaultValue: def.description })}
          </div>
        </div>

        <BuildingFlowPanel
          profile={economyProfile}
          production={stats.production}
          consumption={stats.consumption}
          accent={accent}
        />

        {isotopeDepositDepleted && (
          <div style={{
            background: 'rgba(255,136,68,0.10)',
            border: '1px solid rgba(255,136,68,0.38)',
            borderRadius: 5,
            padding: '10px 12px',
            color: '#ffb080',
            fontSize: 11,
            lineHeight: 1.45,
          }}>
            {t('building_detail.isotope_depleted_warning')}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
          <MetricCard
            label={t('building_detail.status')}
            value={stats.isShutdown ? t('building_detail.status_shutdown') : t('building_detail.status_active')}
            accent={stats.isShutdown ? '#cc7777' : '#88bb99'}
          />
          <MetricCard
            label={t('building_detail.energy')}
            value={type === 'colony_hub' ? `${colonyEnergyProduced} / ${colonyEnergyConsumed}` : formatPerHour(energyNetPerHour)}
            sub={type === 'colony_hub'
              ? t('building_detail.colony_energy_desc')
              : `${t('building_detail.output')} ${formatPerHour(energyOutputPerHour)} / ${t('building_detail.consumes')} ${formatPerHour(energyConsumptionPerHour)}`}
            accent={type === 'colony_hub' && colonyEnergyProduced < colonyEnergyConsumed ? '#cc7777' : '#ffaa66'}
          />
          {type === 'colony_hub' && (
            <MetricCard
              label={t('building_detail.population')}
              value={`0 / ${colonyPopulationCapacity}`}
              sub={t('building_detail.population_desc')}
              accent="#88bb99"
            />
          )}
          <MetricCard
            label={t('building_detail.fit')}
            value={t(`building_detail.fit_${stats.planetFit}`)}
            accent={stats.planetFit === 'blocked' ? '#cc7777' : stats.planetFit === 'conditional' ? '#ffcc66' : '#88bb99'}
          />
        </div>

        <Section title={t('building_detail.rates')}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 4, padding: 10 }}>
              <div style={{ fontSize: 10, color: '#88bb99', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                {t('building_detail.production')}
              </div>
              <RateList rows={stats.production} empty={t('building_detail.no_production')} />
            </div>
            <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 4, padding: 10 }}>
              <div style={{ fontSize: 10, color: '#cc7777', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                {t('building_detail.consumption')}
              </div>
              <RateList rows={stats.consumption} empty={t('building_detail.no_consumption')} />
            </div>
          </div>
        </Section>

        {producibleTypes.length > 0 && (
          <Section title={type === 'landing_pad' ? t('building_detail.transport_landing_pad') : t('building_detail.transport_spaceport')}>
            <div style={{
              background: 'rgba(10,15,25,0.48)',
              border: '1px solid rgba(51,68,85,0.45)',
              borderRadius: 5,
              padding: compact ? 10 : 12,
              display: 'grid',
              gap: 14,
            }}>
              <div style={{ color: '#667788', fontSize: 10, lineHeight: 1.45 }}>
                {type === 'landing_pad'
                  ? t('building_detail.transport_landing_pad_desc')
                  : t('building_detail.transport_spaceport_desc')}
              </div>
              {productionSections.map((section) => (
                <div key={section.title} style={{ display: 'grid', gap: 8 }}>
                  <div style={{ color: '#8899aa', fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                    {section.title}
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: compact ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
                    gap: compact ? 8 : 10,
                    alignItems: 'stretch',
                  }}>
                    {section.items.map((producibleType) => (
                      <ProducibleFrameCard
                        key={producibleType}
                        type={producibleType}
                        count={getProducedCount(producibleType)}
                        activeQueue={(explorationProductionQueue ?? []).filter((item) => item.type === producibleType)}
                        canBuild={!stats.isShutdown && Boolean(onStartPayloadProduction)}
                        onBuild={onStartPayloadProduction}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title={t('building_detail.modifiers')}>
          <div style={{ display: 'grid', gap: 6, fontSize: 11 }}>
            {stats.energyStorageAdd > 0 && <div style={{ color: '#8899aa' }}>{t('building_detail.energy_storage', { amount: stats.energyStorageAdd })}</div>}
            {stats.storageCapacityAdd > 0 && <div style={{ color: '#8899aa' }}>{t('building_detail.storage_capacity', { amount: stats.storageCapacityAdd })}</div>}
            {stats.populationCapacityAdd > 0 && <div style={{ color: '#8899aa' }}>{t('building_detail.population_capacity', { amount: stats.populationCapacityAdd })}</div>}
            {stats.fogRevealRadius > 0 && <div style={{ color: '#8899aa' }}>{t('building_detail.reveal_radius', { radius: stats.fogRevealRadius })}</div>}
            {stats.stock && (
              <div style={{ color: stats.stock.pct < 10 ? '#cc7777' : '#8899aa' }}>
                {t('building_detail.stock_line', {
                  resource: t(`colony_center.resource.${stats.stock.resource}`),
                  remaining: Math.floor(stats.stock.remaining),
                  pct: stats.stock.pct,
                })}
              </div>
            )}
            {stats.activeBonusLabels.map((label) => (
              <div key={label} style={{ color: '#88bb99' }}>{t('building_detail.synergy', { label })}</div>
            ))}
            {stats.energyStorageAdd <= 0 && stats.storageCapacityAdd <= 0 && stats.populationCapacityAdd <= 0 && stats.fogRevealRadius <= 0 && !stats.stock && stats.activeBonusLabels.length === 0 && (
              <div style={{ color: '#556677' }}>{t('building_detail.no_modifiers')}</div>
            )}
          </div>
        </Section>

        {type === 'observatory' && (
          <Section title={t('observatory.search_section')}>
            <div style={{
              background: 'rgba(10,15,25,0.48)',
              border: '1px solid rgba(68,136,170,0.35)',
              borderRadius: 5,
              padding: compact ? 10 : 12,
              display: 'grid',
              gap: 12,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                <MetricCard
                  label={t('observatory.level')}
                  value={`${observatoryLevel} / 5`}
                  sub={observatoryXp.required > 0
                    ? t('observatory.xp_progress', { current: observatoryXp.current, required: observatoryXp.required })
                    : t('observatory.max_level')}
                  accent="#9fd0ff"
                />
                <MetricCard
                  label={t('observatory.active_searches')}
                  value={`${activeObservatorySessions.length}/${maxObservatorySessions}`}
                  sub={t('observatory.catalog_progress', {
                    found: Object.keys(observatoryState?.events ?? {}).length,
                  })}
                  accent="#88bb99"
                />
              </div>

              {observatoryXp.required > 0 && (
                <div style={{ height: 5, borderRadius: 999, background: 'rgba(51,68,85,0.45)', overflow: 'hidden' }}>
                  <div style={{ width: `${observatoryXp.pct}%`, height: '100%', background: 'linear-gradient(90deg, #446688, #9fd0ff)' }} />
                </div>
              )}

              <div style={{
                color: '#8899aa',
                fontSize: 10,
                lineHeight: 1.45,
                background: 'rgba(5,10,20,0.42)',
                border: '1px solid rgba(68,136,170,0.25)',
                borderRadius: 4,
                padding: '9px 10px',
              }}>
                {t('observatory.search_explainer', {
                  chance: Math.round(getObservatorySearchChance('1h', observatoryLevel) * 100),
                })}
              </div>

              <div style={{ display: 'grid', gap: 7 }}>
                <div style={{ fontSize: 10, color: '#667788', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  {t('observatory.program_label')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                  {observatoryPrograms.map((program) => (
                    <button
                      key={program}
                      type="button"
                      onClick={() => setObservatoryProgram(program)}
                      style={{
                        textAlign: 'left',
                        background: selectedObservatoryProgram === program ? 'rgba(68,136,170,0.18)' : 'rgba(5,10,20,0.42)',
                        border: `1px solid ${selectedObservatoryProgram === program ? ACTIVE_BORDER : BORDER}`,
                        borderRadius: 4,
                        color: '#aabbcc',
                        fontFamily: 'monospace',
                        padding: '9px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ color: '#9fd0ff', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
                        {t(OBSERVATORY_PROGRAM_LABEL[program])}
                      </div>
                      <div style={{ marginTop: 4, color: '#667788', fontSize: 9, lineHeight: 1.35 }}>
                        {t(OBSERVATORY_PROGRAM_DESC[program])}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {activeObservatorySessions.length > 0 && (
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 10, color: '#667788', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    {t('observatory.in_progress')}
                  </div>
                  {activeObservatorySessions.map((session) => (
                    <ObservatorySessionCard key={session.id} session={session} now={observatoryNow} />
                  ))}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                {OBSERVATORY_DURATIONS.map((duration) => {
                  const chance = Math.round(getObservatorySearchChance(duration, observatoryLevel) * 100);
                  return (
                    <ObservatoryDurationButton
                      key={duration}
                      duration={duration}
                      chance={chance}
                      disabled={stats.isShutdown || !hasObservatorySlot || !onStartObservatorySearch || observatoryAdsRunning}
                      onClick={async () => {
                        if (!hasObservatorySlot || observatoryAdsRunning) return;
                        if (!isPremium) {
                          setObservatoryAdsRunning(true);
                          const result = await watchAdsWithProgress('research_data', 3, () => {});
                          setObservatoryAdsRunning(false);
                          if (!result.rewarded) {
                            addInfoReport(t('observatory.ad_gate_title'), t('observatory.ad_gate_failed'));
                            return;
                          }
                        }
                        const started = onStartObservatorySearch?.(duration, selectedObservatoryProgram);
                        if (started === false) return;
                        addInfoReport(t('observatory.in_progress'), isPremium ? t('observatory.search_started') : t('observatory.search_started_after_ads'));
                      }}
                    />
                  );
                })}
              </div>

              <div style={{ display: 'grid', gap: 7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                  <div style={{ fontSize: 10, color: '#667788', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    {t('observatory.reports')}
                  </div>
                  <div style={{ fontSize: 9, color: '#556677' }}>
                    {t('observatory.reports_count', { count: observatoryReports.length })}
                  </div>
                </div>
                {observatoryReports.length > 0 ? (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {observatoryReports.map((report) => (
                      <ObservatoryReportCard key={report.id} report={report} />
                    ))}
                  </div>
                ) : (
                  <div style={{
                    background: 'rgba(5,10,20,0.42)',
                    border: '1px solid rgba(51,68,85,0.55)',
                    borderRadius: 5,
                    padding: '10px 12px',
                    color: '#667788',
                    fontSize: 10,
                    lineHeight: 1.45,
                  }}>
                    {t('observatory.no_reports')}
                  </div>
                )}
              </div>
            </div>
          </Section>
        )}

        <Section title={t('building_detail.actions')}>
          <div style={{ display: 'grid', gap: 8 }}>
            {type === 'colony_hub' && (
              <ActionButton
                title={t('building_detail.action_open_center')}
                desc={t('building_detail.action_open_center_desc')}
                onClick={() => onOpenColonyCenter?.()}
              />
            )}
            {type === 'landing_pad' && (
              <>
                <div style={{
                  background: 'rgba(68,136,170,0.10)',
                  border: '1px solid rgba(68,136,170,0.28)',
                  borderRadius: 4,
                  padding: '9px 10px',
                  fontSize: 11,
                  color: '#9fc4dd',
                  lineHeight: 1.45,
                }}>
                  {t('building_detail.landing_pad_dispatch_hint')}
                </div>
              </>
            )}
            {(type === 'research_lab' || type === 'deep_drill') && (
              <ActionButton
                title={t('building_detail.action_scan')}
                desc={t('building_detail.action_scan_desc')}
                disabled={!canScan}
                onClick={runScan}
              />
            )}
            {type === 'radar_tower' && (
              <>
                <ActionButton
                  title={t('building_detail.action_radar_deposit_scan')}
                  desc={t('building_detail.action_radar_deposit_scan_desc')}
                  disabled={!canScan}
                  onClick={runScan}
                />
                <ActionButton
                  title={t('building_detail.action_radar_weather')}
                  desc={t('building_detail.action_radar_weather_desc')}
                  onClick={() => addInfoReport(t('building_detail.action_radar_weather'), t('building_detail.action_result_radar_weather'))}
                />
                <ActionButton
                  title={t('building_detail.action_radar_mission_sync')}
                  desc={t('building_detail.action_radar_mission_sync_desc')}
                  onClick={() => addInfoReport(t('building_detail.action_radar_mission_sync'), t('building_detail.action_result_radar_mission_sync'))}
                />
              </>
            )}
            {(type === 'mine' || type === 'water_extractor' || type === 'atmo_extractor' || type === 'deep_drill') && (
              <ActionButton
                title={t('building_detail.action_inspect_deposit')}
                desc={t('building_detail.action_inspect_deposit_desc')}
                onClick={inspectDeposit}
              />
            )}
            {(type === 'solar_plant' || type === 'battery_station') && (
              <ActionButton
                title={t('building_detail.action_power_check')}
                desc={t('building_detail.action_power_check_desc', {
                  balance: formatPerHour(energyNetPerHour),
                  storage: stats.energyStorageAdd,
                })}
                onClick={() => addInfoReport(t('building_detail.action_power_check'), t('building_detail.action_result_power'))}
              />
            )}
            {(type === 'quantum_separator' || type === 'gas_fractionator') && (
              <ActionButton
                title={t('building_detail.action_chemistry')}
                desc={t('building_detail.action_chemistry_desc')}
                disabled={!canChemCycle}
                onClick={runChemCycle}
              />
            )}
            {actionReports.length > 0 && (
              <div style={{ display: 'grid', gap: 7 }}>
                {actionReports.map((report) => (
                  <ActionReportCard key={report.id} report={report} />
                ))}
              </div>
            )}
          </div>
        </Section>

        {building && type !== 'colony_hub' && onDemolish && (
          <Section title={t('building_detail.danger_zone')}>
            <div style={{ background: 'rgba(35,12,12,0.42)', border: '1px solid rgba(204,68,68,0.36)', borderRadius: 4, padding: 10 }}>
              <div style={{ fontSize: 11, color: '#aa8888', lineHeight: 1.45 }}>
                {t('building_detail.demolish_desc')}
              </div>
              {!confirmDemolish ? (
                <button
                  type="button"
                  onClick={() => setConfirmDemolish(true)}
                  style={{
                    marginTop: 10,
                    background: 'rgba(204,68,68,0.12)',
                    border: '1px solid rgba(204,68,68,0.45)',
                    borderRadius: 4,
                    color: '#ff9a9a',
                    fontFamily: 'monospace',
                    fontSize: 10,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    padding: '8px 12px',
                    cursor: 'pointer',
                  }}
                >
                  {t('building_detail.demolish')}
                </button>
              ) : (
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => onDemolish(building)}
                    style={{
                      background: 'rgba(204,68,68,0.20)',
                      border: '1px solid rgba(204,68,68,0.65)',
                      borderRadius: 4,
                      color: '#ffb0b0',
                      fontFamily: 'monospace',
                      fontSize: 10,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                      padding: '8px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    {t('building_detail.demolish_confirm')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDemolish(false)}
                    style={{
                      background: 'rgba(20,30,45,0.55)',
                      border: `1px solid ${BORDER}`,
                      borderRadius: 4,
                      color: '#8899aa',
                      fontFamily: 'monospace',
                      fontSize: 10,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                      padding: '8px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              )}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
