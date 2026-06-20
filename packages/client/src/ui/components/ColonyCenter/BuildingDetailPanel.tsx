import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { BuildingType, Discovery, FleetState, ObservatorySearchDuration, ObservatorySearchProgram, ObservatoryState, PlacedBuilding, Planet, PlanetResourceStocks, ProducibleType, SeparationJob, SeparationGroup, ExtractionJob, CosmicEvent } from '@nebulife/core';
import { BUILDING_DEFS, ELEMENTS, PRODUCIBLE_ASSET_PATHS, PRODUCIBLE_DEFS, RARITY_COLORS, getAvailableObservatoryPrograms, getCatalogEntry, getCatalogName, getObservatoryLevel, getObservatoryMaxActiveSearches, getObservatorySearchChance, getObservatoryXpProgress, isShipProducible, SEPARATION_BATCH, SEPARATION_DURATION_MS, SEPARATION_RESEARCH_DATA_COST, getSeparationElements, EXTRACTION_BATCH, EXTRACTION_RESEARCH_DATA_COST, getExtractionElements } from '@nebulife/core';

import { ResourceIcon, RESOURCE_COLORS, type ResourceType } from '../ResourceIcon.js';
import { buildingName, buildingDesc } from '../../../i18n/building-labels.js';
import { formatSignedRatePerHour, formatHourlyAmount, tickRateToHourly } from '../../../i18n/format-rate.js';
import { watchAdsWithProgress, isNativePlatform } from '../../../services/ads-service.js';
import {
  deriveBuildingDetailStats,
  getBuildingPassiveEffects,
  getBuildingEconomyProfile,
  primaryOutputResource,
  type BuildingEconomyProfile,
  type BuildingPassiveEffect,
  type ColonyResourceKey,
  type RateRow,
} from './building-detail-model.js';
import { type ElementResult, resultAccent } from './ElementResultCard.js';

type ColonyResources = Record<ColonyResourceKey, number>;

// Visible build marker so we can tell at a glance whether a given client is
// actually running the latest deploy (shown in the building-detail subtitle).
// Bump on each deploy that touches this panel.
const PANEL_BUILD_STAMP = 'B36';

export interface BuildingDetailPanelProps {
  planet: Planet;
  building?: PlacedBuilding;
  buildingType?: BuildingType;
  buildings: PlacedBuilding[];
  colonyResources: ColonyResources;
  chemicalInventory?: Record<string, number>;
  researchData: number;
  planetStocks?: PlanetResourceStocks;
  explorationPayloads?: Partial<Record<ProducibleType, number>>;
  shipFleet?: FleetState;
  explorationProductionQueue?: Array<{ id: string; type: ProducibleType; planetId: string; startedAt: number; durationMs: number }>;
  observatoryState?: ObservatoryState;
  separationJobs?: SeparationJob[];
  onStartSeparation?: (buildingId: string, planetId: string, group?: SeparationGroup, sourceBuildingType?: string) => boolean | void;
  /** Last-5 separation/centrifuge yields (newest first) for the history strip. */
  elementYieldHistory?: ElementResult[];
  /** Last-5 lab experiments (newest first) for the research-lab history strip. */
  experimentHistory?: ElementResult[];
  /** Open the visual result card for a history entry / fresh job. */
  onViewResult?: (result: ElementResult) => void;
  /** Active research-lab particle-extraction jobs (for progress display). */
  extractionJobs?: ExtractionJob[];
  /** Start a particle-extraction batch on the given research_lab. */
  onStartExtraction?: (buildingId: string, planetId: string) => boolean | void;
  /** Open the DNA-constructor spark minigame (fired from the lab section). */
  onOpenDnaLab?: () => void;
  /** Backend-authored upcoming cosmic events (telescope / observatory / radar). */
  upcomingEvents?: CosmicEvent[];
  /** Open the Operations Hub signals tab (radar-tower decode shortcut). */
  onOpenSignals?: () => void;
  onClose: () => void;
  onOpenColonyCenter?: (tab?: 'overview' | 'production') => void;
  onStartPayloadProduction?: (type: ProducibleType) => void;
  onStartObservatorySearch?: (duration: ObservatorySearchDuration, program: ObservatorySearchProgram, observatoryCount?: number) => boolean | void;
  /** Re-open a completed report's discovery reveal (Quantum Focus / telemetry). */
  onViewReportDiscovery?: (discovery: Discovery) => void;
  isPremium?: boolean;
  onResourceChange?: (delta: Partial<ColonyResources>) => void;
  onResearchDataChange?: (delta: number) => void;
  onDemolish?: (building: PlacedBuilding) => void;
}

const PANEL_BG = '#020510';
const CARD_BG = 'rgba(10,15,25,0.62)';
const BORDER = '#233344';
const ACTIVE_BORDER = '#446688';
const EVENT_RESEARCH_WINDOW_MS = 24 * 60 * 60 * 1000;
const EVENT_RESEARCH_STORAGE_KEY = 'nebulife_cosmic_event_research';

/** Selectable bulk groups for the quantum separator, in display order. */
const SEPARATION_GROUP_LIST: { group: SeparationGroup; resource: ResourceType }[] = [
  { group: 'water',    resource: 'water' },
  { group: 'mineral',  resource: 'minerals' },
  { group: 'isotope',  resource: 'isotopes' },
  { group: 'volatile', resource: 'volatiles' },
];

const MANUAL_SEPARATION_BUILDINGS = new Set<BuildingType>([
  'quantum_separator',
  'gas_fractionator',
  'isotope_centrifuge',
]);

function separationGroupsForBuilding(type?: BuildingType): { group: SeparationGroup; resource: ResourceType }[] {
  if (type === 'gas_fractionator') return SEPARATION_GROUP_LIST.filter((item) => item.group === 'volatile');
  if (type === 'isotope_centrifuge') return SEPARATION_GROUP_LIST.filter((item) => item.group === 'isotope');
  if (type === 'quantum_separator') return SEPARATION_GROUP_LIST;
  return [];
}

/**
 * Reusable mission carriers are not cargo haulers — they deliver a specific
 * exploration module. Map each carrier to the payload module(s) it carries so
 * the card shows "carries: <module>" instead of a misleading cargo number.
 */
const CARRIER_PAYLOADS: Partial<Record<ProducibleType, ProducibleType[]>> = {
  research_shuttle: ['survey_probe', 'orbital_satellite'],
  rover_dropcraft: ['surface_rover', 'lander'],
  atmo_probe_carrier: ['atmosphere_probe'],
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 10, color: '#667788', letterSpacing: 2, textTransform: 'uppercase' }}>{title}</div>
      {children}
    </section>
  );
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function readResearchedEventIds(): Set<string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(EVENT_RESEARCH_STORAGE_KEY) ?? '{}') as Record<string, unknown>;
    return new Set(Object.entries(parsed).filter(([, value]) => typeof value === 'number').map(([id]) => id));
  } catch {
    return new Set();
  }
}

function writeResearchedEvent(id: string): void {
  try {
    const parsed = JSON.parse(localStorage.getItem(EVENT_RESEARCH_STORAGE_KEY) ?? '{}') as Record<string, unknown>;
    localStorage.setItem(EVENT_RESEARCH_STORAGE_KEY, JSON.stringify({ ...parsed, [id]: Date.now() }));
  } catch {
    // Local-only event dossier state must not break the building panel.
  }
}

/** Live cosmic-event countdown (re-ticks every second). */
function EventCountdown({ untilMs, color }: { untilMs: number; color: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span style={{ color, fontVariantNumeric: 'tabular-nums', fontSize: 12, letterSpacing: 0.5 }}>
      {formatCountdown(untilMs - now)}
    </span>
  );
}

function EventResearchButton({
  event,
  researched,
  onResearch,
  compact = false,
}: {
  event: CosmicEvent;
  researched: boolean;
  onResearch: (eventId: string) => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const opensIn = event.eventTime - now;
  const closesIn = event.eventTime + EVENT_RESEARCH_WINDOW_MS - now;
  const pending = opensIn > 0;
  const active = !pending && closesIn > 0;
  const expired = !pending && !active;
  const disabled = researched || pending || expired;
  const label = researched
    ? t('events.research_logged')
    : pending
      ? t('events.research_available_in', { time: formatCountdown(opensIn) })
      : expired
        ? t('events.research_inactive')
        : t('events.research_start');
  const subLabel = active && !researched
    ? t('events.research_window', { time: formatCountdown(closesIn) })
    : null;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled) onResearch(event.id);
      }}
      style={{
        width: compact ? 'auto' : '100%',
        minWidth: compact ? 152 : undefined,
        display: 'grid',
        gap: subLabel ? 2 : 0,
        justifyItems: 'center',
        padding: compact ? '7px 9px' : '10px 12px',
        borderRadius: 6,
        border: `1px solid ${active && !researched ? '#7bb8ff' : '#334455'}`,
        background: active && !researched
          ? 'linear-gradient(180deg, rgba(123,184,255,0.26), rgba(123,184,255,0.10))'
          : 'rgba(20,25,35,0.48)',
        color: active && !researched ? '#d7ecff' : researched ? '#88ccaa' : '#667788',
        fontFamily: 'monospace',
        fontSize: compact ? 9 : 10.5,
        letterSpacing: 1,
        textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: active && !researched ? '0 0 16px rgba(123,184,255,0.24)' : 'none',
      }}
    >
      <span>{label}</span>
      {subLabel && <span style={{ color: '#7d93ab', fontSize: compact ? 8 : 9, textTransform: 'none', letterSpacing: 0.3 }}>{subLabel}</span>}
    </button>
  );
}

function eventText(event: CosmicEvent, language: string): { title: string; desc: string } {
  const uk = language?.startsWith('uk');
  return {
    title: uk ? event.titleUk : event.titleEn,
    desc: (uk ? event.descriptionUk : event.descriptionEn) ?? '',
  };
}

function CosmicEventVisual({ event, imageless, accent }: { event: CosmicEvent; imageless?: boolean; accent: string }) {
  const { title } = eventText(event, 'uk');
  if (!imageless && event.videoUrl) {
    return (
      <video
        src={event.videoUrl}
        autoPlay
        loop
        muted
        playsInline
        style={{ width: '100%', aspectRatio: '16 / 7', objectFit: 'cover', borderRadius: 7, border: `1px solid ${accent}55` }}
      />
    );
  }
  if (!imageless && event.photoUrl) {
    return (
      <img
        src={event.photoUrl}
        alt={title}
        style={{ width: '100%', aspectRatio: '16 / 7', objectFit: 'cover', borderRadius: 7, border: `1px solid ${accent}55` }}
      />
    );
  }
  return (
    <div style={{
      position: 'relative',
      height: 88,
      borderRadius: 7,
      overflow: 'hidden',
      border: `1px solid ${accent}44`,
      background: `radial-gradient(circle at 72% 42%, ${accent}44 0 3px, transparent 4px),
        radial-gradient(circle at 25% 35%, rgba(255,255,255,0.42) 0 1px, transparent 2px),
        radial-gradient(circle at 46% 68%, rgba(255,255,255,0.26) 0 1px, transparent 2px),
        linear-gradient(135deg, rgba(7,18,35,0.96), rgba(2,5,16,0.98))`,
    }}>
      <svg viewBox="0 0 320 88" width="100%" height="100%" role="img" aria-label={title} style={{ position: 'absolute', inset: 0 }}>
        <circle cx="246" cy="38" r="20" fill="none" stroke={accent} strokeOpacity="0.36" strokeWidth="1.2" />
        <circle cx="246" cy="38" r="34" fill="none" stroke={accent} strokeOpacity="0.16" strokeWidth="1" />
        <path d="M22 70 C82 18, 140 104, 204 38 S286 20, 306 56" fill="none" stroke={accent} strokeOpacity="0.34" strokeWidth="1.5" strokeDasharray="5 6" />
        <path d="M38 20 H126 M74 12 V28 M240 38 H298" stroke={accent} strokeOpacity="0.22" strokeWidth="1" />
        <circle cx="90" cy="48" r="2.2" fill={accent} opacity="0.7" />
        <circle cx="178" cy="32" r="1.6" fill="#cfe3ff" opacity="0.72" />
      </svg>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(90deg, rgba(2,5,16,0.15), rgba(2,5,16,0.72))',
      }} />
    </div>
  );
}

function CosmicEventDetailModal({
  event,
  imageless,
  telescopeAvailable,
  researched,
  onResearch,
  onClose,
}: {
  event: CosmicEvent;
  imageless?: boolean;
  telescopeAvailable: boolean;
  researched: boolean;
  onResearch: (eventId: string) => void;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const accent = imageless ? '#8899aa' : '#7bb8ff';
  const { title, desc } = eventText(event, i18n.language);
  const eventDate = new Intl.DateTimeFormat(i18n.language?.startsWith('uk') ? 'uk-UA' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(event.eventTime));

  return createPortal((
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 12000,
        background: 'rgba(2,5,16,0.82)',
        backdropFilter: 'blur(7px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: 'monospace',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(560px, 96vw)',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'linear-gradient(180deg, rgba(13,22,36,0.98), rgba(5,10,20,0.98))',
          border: `1px solid ${accent}`,
          borderRadius: 8,
          boxShadow: `0 0 36px ${accent}33, 0 22px 60px rgba(0,0,0,0.5)`,
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'grid', gap: 5 }}>
            <div style={{ color: accent, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>{t('events.about_title')}</div>
            <div style={{ color: '#e6f0ff', fontSize: 16, letterSpacing: 0.5, lineHeight: 1.35 }}>{title}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 26,
              height: 26,
              flexShrink: 0,
              background: 'rgba(5,10,20,0.6)',
              border: '1px solid #334455',
              color: '#8899aa',
              borderRadius: 4,
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            x
          </button>
        </div>

        <CosmicEventVisual event={event} imageless={imageless} accent={accent} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', marginTop: 14, padding: 11, borderRadius: 7, background: 'rgba(5,10,20,0.48)', border: `1px solid ${accent}33` }}>
          <div style={{ display: 'grid', gap: 3 }}>
            <span style={{ color: '#667788', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>{t('events.event_time')}</span>
            <span style={{ color: '#cfe3ff', fontSize: 11 }}>{eventDate}</span>
          </div>
          <EventCountdown untilMs={event.eventTime} color={accent} />
        </div>

        <div style={{ marginTop: 14, color: '#aabbcc', fontSize: 12, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
          {desc || t('events.no_description')}
        </div>

        {telescopeAvailable ? (
          <div style={{ marginTop: 14 }}>
            <EventResearchButton event={event} researched={researched} onResearch={onResearch} />
          </div>
        ) : imageless && (
          <div style={{ marginTop: 14, color: '#ffb080', fontSize: 10.5, lineHeight: 1.5, padding: 10, borderRadius: 6, background: 'rgba(255,136,68,0.08)', border: '1px solid rgba(255,136,68,0.25)' }}>
            {t('events.need_telescope')}
          </div>
        )}
      </div>
    </div>
  ), document.body);
}

/**
 * Full cosmic-event card for the orbital telescope: bilingual title, optional
 * photo/video, live countdown. When `imageless` (observatory fallback) the
 * imagery is replaced by a "build telescope" notice and the event is inactive.
 */
function CosmicEventCard({
  event,
  imageless,
  telescopeAvailable = !imageless,
  compact = false,
  researched = false,
  onResearch = () => {},
}: {
  event: CosmicEvent;
  imageless?: boolean;
  telescopeAvailable?: boolean;
  compact?: boolean;
  researched?: boolean;
  onResearch?: (eventId: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { title, desc } = eventText(event, i18n.language);
  const accent = imageless ? '#8899aa' : '#7bb8ff';
  return (
    <>
      <div style={{
        position: 'relative',
        display: 'grid',
        gap: compact ? 8 : 10,
        padding: compact ? 9 : 11,
        borderRadius: 8,
        background: `radial-gradient(120% 160% at 100% 0%, ${accent}18, rgba(5,10,20,0.56) 54%)`,
        border: `1px solid ${accent}45`,
        opacity: imageless ? 0.86 : 1,
        boxShadow: `inset 0 0 30px ${accent}0f`,
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.035) 0 1px, transparent 1px)',
          backgroundSize: '42px 42px',
          opacity: 0.18,
        }} />

        {!compact && <CosmicEventVisual event={event} imageless={imageless} accent={accent} />}

        <div style={{ position: 'relative', display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
              <span style={{ color: accent, fontSize: 8.5, letterSpacing: 1.7, textTransform: 'uppercase' }}>{t('events.live_marker')}</span>
              <span style={{ color: '#e6f0ff', fontSize: compact ? 11 : 12.5, letterSpacing: 0.35, lineHeight: 1.35 }}>{title}</span>
            </div>
            <div style={{ display: 'grid', gap: 2, justifyItems: 'end', flexShrink: 0 }}>
              <span style={{ color: '#667788', fontSize: 8, letterSpacing: 1.4, textTransform: 'uppercase' }}>{t('events.countdown')}</span>
              <EventCountdown untilMs={event.eventTime} color={accent} />
            </div>
          </div>

          {!compact && desc && <div style={{ color: '#8c9cad', fontSize: 10, lineHeight: 1.52 }}>{desc.length > 150 ? `${desc.slice(0, 150).trim()}...` : desc}</div>}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
            <span style={{
              color: imageless ? '#ffb080' : '#9fd0ff',
              border: `1px solid ${imageless ? 'rgba(255,176,128,0.35)' : `${accent}55`}`,
              background: imageless ? 'rgba(255,136,68,0.08)' : `${accent}14`,
              borderRadius: 999,
              padding: '4px 9px',
              fontSize: 9,
              letterSpacing: 0.6,
            }}>
              {imageless ? t('events.timing_only') : event.videoUrl ? t('events.video_ready') : event.photoUrl ? t('events.image_ready') : t('events.telemetry_only')}
            </span>
            {telescopeAvailable && (
              <EventResearchButton event={event} researched={researched} onResearch={onResearch} compact={compact} />
            )}
            <span style={{ flex: 1 }} />
            <button
              type="button"
              onClick={() => setDetailsOpen(true)}
              style={{
                background: `linear-gradient(180deg, ${accent}26, ${accent}10)`,
                border: `1px solid ${accent}88`,
                color: '#e6f0ff',
                borderRadius: 5,
                fontFamily: 'monospace',
                fontSize: 9.5,
                letterSpacing: 1.1,
                textTransform: 'uppercase',
                padding: '7px 10px',
                cursor: 'pointer',
                boxShadow: `0 0 14px ${accent}22`,
              }}
            >
              {t('events.about_button')}
            </button>
          </div>
        </div>
      </div>
      {detailsOpen && (
        <CosmicEventDetailModal
          event={event}
          imageless={imageless}
          telescopeAvailable={telescopeAvailable}
          researched={researched}
          onResearch={onResearch}
          onClose={() => setDetailsOpen(false)}
        />
      )}
    </>
  );
}

/**
 * Last-5 history strip for manual jobs (separation batches, lab experiments).
 * Each entry is a clickable chip that re-opens the full {@link ElementResult}
 * card. Rendered above the chemistry/experiment controls inside the building.
 */
function ResultHistoryStrip({
  title,
  history,
  onView,
}: {
  title: string;
  history: ElementResult[];
  onView?: (result: ElementResult) => void;
}) {
  const { t } = useTranslation();
  if (!history || history.length === 0) return null;
  return (
    <div style={{ display: 'grid', gap: 6, flexShrink: 0 }}>
      <div style={{ fontSize: 9, color: '#667788', letterSpacing: 1.5, textTransform: 'uppercase' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {history.slice(0, 5).map((r) => {
          const accent = resultAccent(r);
          const label = r.kind === 'spark'
            ? t(`lab.spark.${r.sparkType}` as 'lab.spark.primordial')
            : Object.entries(r.elements ?? {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([el, amt]) => `${el} ${amt}`)
                .join(', ');
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onView?.(r)}
              disabled={!onView}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
                background: `${accent}12`,
                border: `1px solid ${accent}55`,
                borderRadius: 6,
                padding: '7px 9px',
                cursor: onView ? 'pointer' : 'default',
                fontFamily: 'monospace',
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: accent, boxShadow: `0 0 8px ${accent}`,
              }} />
              <span style={{ flex: 1, minWidth: 0, color: '#aabbcc', fontSize: 10.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {label || t('separation.result_empty')}
              </span>
              <span style={{ color: accent, fontSize: 9, letterSpacing: 0.5 }}>{t('observatory.view_report')}</span>
            </button>
          );
        })}
      </div>
    </div>
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

function RateList({ rows, empty }: { rows: RateRow[]; empty: string }) {
  const { t, i18n } = useTranslation();
  const formatRate = (row: RateRow) => formatSignedRatePerHour(row.perHour, t, i18n.language);
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
  const { t, i18n } = useTranslation();
  const formatRate = (row: RateRow) => formatSignedRatePerHour(row.perHour, t, i18n.language);
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

function PassiveEffectCard({ effect }: { effect: BuildingPassiveEffect }) {
  const { t } = useTranslation();
  const accent = effect.tone === 'resource'
    ? '#88bb99'
    : effect.tone === 'safety'
      ? '#ffcc66'
      : effect.tone === 'energy'
        ? '#ffaa66'
        : effect.tone === 'logistics'
          ? '#7bb8ff'
          : '#aa88ff';
  return (
    <div style={{
      background: `linear-gradient(135deg, rgba(5,10,20,0.64), ${accent}12)`,
      border: `1px solid ${accent}44`,
      borderRadius: 5,
      padding: '9px 10px',
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ color: '#aabbcc', fontSize: 11, letterSpacing: 0.6 }}>{t(effect.labelKey)}</div>
        <div style={{ color: accent, fontSize: 12, fontWeight: 700 }}>{effect.value}</div>
      </div>
      <div style={{ marginTop: 5, color: '#667788', fontSize: 9, lineHeight: 1.35 }}>{t(effect.descKey)}</div>
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
  'transport_small',
  'transport_large',
  'lander',
  'research_station_kit',
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

function ObservatoryReportCard({
  report,
  onView,
}: {
  report: NonNullable<ObservatoryState['reports']>[number];
  onView?: (discovery: Discovery) => void;
}) {
  const { t, i18n } = useTranslation();
  const style = OBSERVATORY_DURATION_STYLE[report.duration];
  const entry = report.discoveryType ? getCatalogEntry(report.discoveryType) : undefined;
  const name = entry ? getCatalogName(entry, i18n.language) : report.discoveryType;
  const date = new Date(report.completedAt);
  // Rarity drives the accent for hits; duration accent is the fallback.
  const accent = report.rarity ? RARITY_COLORS[report.rarity] : report.discoveryType ? style.accent : '#667788';
  const viewable = Boolean(report.discovery && onView);
  const handleView = () => { if (report.discovery && onView) onView(report.discovery); };
  return (
    <div
      onClick={viewable ? handleView : undefined}
      role={viewable ? 'button' : undefined}
      tabIndex={viewable ? 0 : undefined}
      onKeyDown={viewable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleView(); } } : undefined}
      style={{
        background: 'rgba(5,10,20,0.58)',
        border: `1px solid ${report.discoveryType ? `${accent}66` : 'rgba(51,68,85,0.7)'}`,
        borderRadius: 5,
        padding: '9px 10px',
        display: 'grid',
        gap: 5,
        cursor: viewable ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
        <span style={{ color: report.discoveryType ? accent : '#667788', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
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
      {viewable && (
        <button
          onClick={(e) => { e.stopPropagation(); handleView(); }}
          style={{
            justifySelf: 'start',
            marginTop: 2,
            background: `${accent}1c`,
            border: `1px solid ${accent}66`,
            borderRadius: 4,
            color: accent,
            fontFamily: 'monospace',
            fontSize: 10,
            letterSpacing: 1,
            textTransform: 'uppercase',
            padding: '4px 10px',
            cursor: 'pointer',
          }}
        >
          {t('observatory.view_report')}
        </button>
      )}
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
  const longTitle = title.length > 18;
  const cargoCapacity = PRODUCIBLE_DEFS[type]?.cargoCapacity ?? 0;
  const carriedPayloads = CARRIER_PAYLOADS[type];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 9,
      background: CARD_BG,
      border: '1px solid rgba(68,102,136,0.55)',
      borderRadius: 6,
      padding: 9,
      minHeight: 0,
      overflow: 'hidden',
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
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 6, alignItems: 'start' }}>
          <div style={{
            color: '#d8e6f2',
            fontSize: longTitle ? 11 : 12,
            lineHeight: 1.18,
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
            hyphens: 'auto',
            paddingTop: 1,
          }}>
            {title}
          </div>
          <div style={{
            color: '#44ff88',
            fontSize: 12,
            lineHeight: 1,
            fontWeight: 700,
            flexShrink: 0,
            padding: '3px 5px',
            border: '1px solid rgba(68,255,136,0.45)',
            borderRadius: 4,
            background: 'rgba(68,255,136,0.09)',
            boxShadow: '0 0 10px rgba(68,255,136,0.12)',
            whiteSpace: 'nowrap',
          }}>
            {t('building_detail.transport_count', { count })}
          </div>
        </div>
        {carriedPayloads ? (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
            color: '#9fd0ff', fontSize: 9.5, lineHeight: 1.25,
            padding: '3px 6px', borderRadius: 4,
            border: '1px solid rgba(123,184,255,0.34)', background: 'rgba(68,136,170,0.12)',
            overflowWrap: 'anywhere',
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="3.2" />
              <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1" opacity="0.7" />
            </svg>
            <span>{t('building_detail.transport_carries')}: {carriedPayloads.map((p) => t(`planet_missions.payload.${p}`)).join(', ')}</span>
          </div>
        ) : cargoCapacity > 0 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
            color: '#7bb8ff', fontSize: 9.5, lineHeight: 1,
            padding: '3px 6px', borderRadius: 4,
            border: '1px solid rgba(123,184,255,0.34)', background: 'rgba(68,136,170,0.12)',
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
              <path d="M3 8 L12 3 L21 8 L21 16 L12 21 L3 16 Z" />
              <path d="M3 8 L12 13 L21 8 M12 13 L12 21" opacity="0.6" />
            </svg>
            {t('building_detail.transport_capacity', { amount: cargoCapacity })}
          </div>
        )}
        <div style={{ color: '#667788', fontSize: 9, lineHeight: 1.32, overflowWrap: 'anywhere' }}>{payloadCostSummary(type, t)}</div>
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
        <div style={{ display: 'grid', gridTemplateColumns: '26px minmax(0, 1fr)', gap: 6, alignItems: 'center', marginTop: 2 }}>
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
            padding: '7px 8px',
            cursor: canBuild ? 'pointer' : 'not-allowed',
            minWidth: 0,
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
  chemicalInventory = {},
  researchData,
  planetStocks,
  explorationPayloads,
  shipFleet,
  explorationProductionQueue,
  observatoryState,
  separationJobs,
  onStartSeparation,
  onClose,
  onOpenColonyCenter,
  onStartPayloadProduction,
  onStartObservatorySearch,
  onViewReportDiscovery,
  elementYieldHistory,
  experimentHistory,
  onViewResult,
  extractionJobs,
  onStartExtraction,
  onOpenDnaLab,
  upcomingEvents,
  onOpenSignals,
  isPremium = false,
  onResourceChange,
  onResearchDataChange,
  onDemolish,
}: BuildingDetailPanelProps) {
  const { t, i18n } = useTranslation();
  const [confirmDemolish, setConfirmDemolish] = useState(false);
  const [observatoryProgram, setObservatoryProgram] = useState<ObservatorySearchProgram>('routine_sky_watch');
  const [observatoryNow, setObservatoryNow] = useState(() => Date.now());
  const [observatoryAdsRunning, setObservatoryAdsRunning] = useState(false);
  const [separationNow, setSeparationNow] = useState(() => Date.now());
  const [extractionNow, setExtractionNow] = useState(() => Date.now());
  const [separationGroup, setSeparationGroup] = useState<SeparationGroup>('mineral');
  const [researchedEventIds, setResearchedEventIds] = useState<Set<string>>(() => readResearchedEventIds());
  const type = building?.type ?? buildingType;
  const def = type ? BUILDING_DEFS[type] : null;
  const hasOrbitalTelescope = useMemo(
    () => buildings.some((b) => b.type === 'orbital_telescope' && !b.shutdown),
    [buildings],
  );

  const stats = useMemo(() => {
    if (!type) return null;
    return deriveBuildingDetailStats({ type, planet, buildings, building, planetStocks });
  }, [building, buildings, planet, planetStocks, type]);

  // Rules of hooks: every hook must run before any early return. The two
  // interval timers below previously sat AFTER `if (!stats) return null`,
  // so the hook count changed between renders (stats null vs. present) and
  // React threw error #310. Compute their minimal deps here and keep the
  // effects above the guard.
  const activeObservatorySessionCount = (observatoryState?.sessions ?? []).length;
  const activeSeparationJobId =
    (separationJobs ?? []).find((j) => j.buildingId === building?.id)?.id ?? null;
  const activeExtractionJobId =
    (extractionJobs ?? []).find((j) => j.buildingId === building?.id)?.id ?? null;
  const separationGroupOptions = useMemo(() => separationGroupsForBuilding(type), [type]);
  const selectedSeparationGroup = useMemo<SeparationGroup>(() => {
    return separationGroupOptions.some((item) => item.group === separationGroup)
      ? separationGroup
      : (separationGroupOptions[0]?.group ?? separationGroup);
  }, [separationGroup, separationGroupOptions]);

  const handleResearchEvent = useCallback((eventId: string) => {
    writeResearchedEvent(eventId);
    setResearchedEventIds((prev) => {
      if (prev.has(eventId)) return prev;
      const next = new Set(prev);
      next.add(eventId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (activeObservatorySessionCount === 0) return;
    const id = window.setInterval(() => setObservatoryNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activeObservatorySessionCount]);

  useEffect(() => {
    if (!activeSeparationJobId) return;
    const id = window.setInterval(() => setSeparationNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activeSeparationJobId]);

  useEffect(() => {
    if (!activeExtractionJobId) return;
    const id = window.setInterval(() => setExtractionNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activeExtractionJobId]);

  useEffect(() => {
    if (separationGroupOptions.length === 0) return;
    if (separationGroupOptions.some((item) => item.group === separationGroup)) return;
    setSeparationGroup(separationGroupOptions[0].group);
  }, [separationGroup, separationGroupOptions]);

  const localElements = useMemo(() => (
    Object.values(ELEMENTS)
      .map((element) => ({ ...element, amount: chemicalInventory[element.symbol] ?? 0 }))
      .filter((element) => element.amount > 0)
      .sort((a, b) => b.amount - a.amount || a.atomicNumber - b.atomicNumber)
      .slice(0, 8)
  ), [chemicalInventory]);

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
  const compact = typeof window !== 'undefined' && window.innerWidth < 700;
  const sideControlInset = 'calc(66px + env(safe-area-inset-left, 0px))';
  const energyOutputPerHour = tickRateToHourly(stats.energyOutput);
  const energyConsumptionPerHour = -tickRateToHourly(stats.energyConsumption);
  const energyNetPerHour = energyOutputPerHour + energyConsumptionPerHour;
  const colonyEnergyProducedPerHour = tickRateToHourly(
    buildings
      .filter((item) => !item.shutdown)
      .reduce((sum, item) => sum + (BUILDING_DEFS[item.type]?.energyOutput ?? 0), 0),
  );
  const colonyEnergyConsumedPerHour = tickRateToHourly(
    buildings
      .filter((item) => !item.shutdown)
      .reduce((sum, item) => sum + (BUILDING_DEFS[item.type]?.energyConsumption ?? 0), 0),
  );
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
  const passiveEffects = getBuildingPassiveEffects(type, buildings);
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
  // Each observatory building grants its own independent search launch, so two
  // observatories on the surface can run two searches concurrently.
  const observatoryCount = Math.max(1, buildings.filter((b) => b.type === 'observatory' && !b.shutdown).length);
  const maxObservatorySessions = observatoryState ? getObservatoryMaxActiveSearches(observatoryState, observatoryCount) : 1;
  const hasObservatorySlot = activeObservatorySessions.length < maxObservatorySessions;
  const observatoryReports = [...(observatoryState?.reports ?? [])].reverse().slice(0, 8);
  const selectedObservatoryProgram = observatoryPrograms.includes(observatoryProgram)
    ? observatoryProgram
    : observatoryPrograms[observatoryPrograms.length - 1] ?? 'routine_sky_watch';

  // ── Manual element separation batch state ──
  const activeSeparationJob = (separationJobs ?? []).find((j) => j.buildingId === building?.id) ?? null;
  const separationElapsed = activeSeparationJob ? separationNow - activeSeparationJob.startedAt : 0;
  const separationPct = activeSeparationJob
    ? Math.min(100, Math.round((separationElapsed / activeSeparationJob.durationMs) * 100))
    : 0;
  const separationSecondsLeft = activeSeparationJob
    ? Math.max(0, Math.ceil((activeSeparationJob.durationMs - separationElapsed) / 1000))
    : 0;
  // The group shown/used: an active job's locked group, otherwise the building's allowed selection.
  const effectiveSeparationGroup: SeparationGroup = activeSeparationJob?.group ?? selectedSeparationGroup;
  const SEPARATION_GROUP_RESOURCE: Record<SeparationGroup, ColonyResourceKey> = {
    mineral: 'minerals', volatile: 'volatiles', isotope: 'isotopes', water: 'water',
  };
  const separationResourceKey = SEPARATION_GROUP_RESOURCE[selectedSeparationGroup];
  const separationAvailable = colonyResources[separationResourceKey] ?? 0;
  const canAffordSeparation =
    separationAvailable >= SEPARATION_BATCH && researchData >= SEPARATION_RESEARCH_DATA_COST;

  // ── Research-lab particle-extraction state ──
  const activeExtractionJob = (extractionJobs ?? []).find((j) => j.buildingId === building?.id) ?? null;
  const extractionElapsed = activeExtractionJob ? extractionNow - activeExtractionJob.startedAt : 0;
  const extractionPct = activeExtractionJob
    ? Math.min(100, Math.round((extractionElapsed / activeExtractionJob.durationMs) * 100))
    : 0;
  const extractionSecondsLeft = activeExtractionJob
    ? Math.max(0, Math.ceil((activeExtractionJob.durationMs - extractionElapsed) / 1000))
    : 0;
  const canAffordExtraction =
    (colonyResources.minerals ?? 0) >= EXTRACTION_BATCH && researchData >= EXTRACTION_RESEARCH_DATA_COST;

  const addInfoReport = (title: string, body: string, impact = t('building_detail.report_no_persistent_effect')) => {
    void title;
    void body;
    void impact;
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
        padding: compact ? '10px 12px' : '14px 16px',
        paddingLeft: compact ? sideControlInset : 'calc(76px + env(safe-area-inset-left, 0px))',
        paddingTop: compact ? 'calc(86px + env(safe-area-inset-top, 0px))' : 'calc(70px + env(safe-area-inset-top, 0px))',
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
            {buildingName(type, t)}
          </div>
          <div style={{ fontSize: 9, color: '#667788', letterSpacing: 1 }}>
            {aggregateMode
              ? t('building_detail.aggregate_subtitle', { count: stats.count })
              : t('building_detail.level_subtitle', { level: stats.level })}
            <span style={{ color: '#33506a', marginLeft: 8 }}>· build {PANEL_BUILD_STAMP}</span>
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
          ? '10px 12px calc(120px + env(safe-area-inset-bottom, 0px))'
          : '14px 16px calc(120px + env(safe-area-inset-bottom, 0px))',
        paddingLeft: compact ? sideControlInset : 'calc(76px + env(safe-area-inset-left, 0px))',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 10 : 14,
      }}>
        {MANUAL_SEPARATION_BUILDINGS.has(type) && building && (() => {
          const groupColor = RESOURCE_COLORS[SEPARATION_GROUP_RESOURCE[effectiveSeparationGroup]];
          const blocked = stats.isShutdown || !canAffordSeparation || !onStartSeparation;
          return (
            <div style={{
              position: 'relative',
              // NOTE: flexShrink:0 is REQUIRED. This block is a flex item inside
              // the scrollable column body, and `overflow:hidden` drops its flex
              // auto-min-height to 0 — so when the body overflows, the flex
              // algorithm collapses this whole block to zero height, leaving only
              // the title visible. Pinning flex-shrink keeps the body rendered.
              flexShrink: 0,
              overflow: 'hidden',
              background: `radial-gradient(120% 140% at 0% 0%, ${groupColor}1f, rgba(8,14,26,0.92) 58%)`,
              border: `1px solid ${groupColor}66`,
              borderRadius: 8,
              padding: compact ? 12 : 16,
              display: 'grid',
              gap: 13,
              boxShadow: `0 16px 38px rgba(0,0,0,0.35), inset 0 0 40px ${groupColor}12`,
            }}>
              {/* Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 26, height: 26, borderRadius: 6,
                  background: `${groupColor}1c`, border: `1px solid ${groupColor}66`,
                  boxShadow: `0 0 14px ${groupColor}44`,
                }}>
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke={groupColor}
                    strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="8" r="1.5" fill={groupColor} stroke="none" />
                    <ellipse cx="8" cy="8" rx="6.5" ry="2.6" />
                    <ellipse cx="8" cy="8" rx="6.5" ry="2.6" transform="rotate(60 8 8)" />
                    <ellipse cx="8" cy="8" rx="6.5" ry="2.6" transform="rotate(120 8 8)" />
                  </svg>
                </span>
                <div style={{ display: 'grid', gap: 1 }}>
                  <div style={{ fontSize: 12, color: '#cfe3ff', letterSpacing: 2, textTransform: 'uppercase' }}>
                    {t('separation.section')}
                  </div>
                  <div style={{ fontSize: 9, color: '#7d93ab', letterSpacing: 0.5 }}>
                    {t('separation.tagline')}
                  </div>
                </div>
              </div>

              {/* Last-5 separation history (above the chemistry controls) */}
              <ResultHistoryStrip
                title={t('separation.history')}
                history={(elementYieldHistory ?? []).filter((r) => (r.source ?? 'quantum_separator') === (type ?? 'quantum_separator'))}
                onView={onViewResult}
              />

              {/* Group selector */}
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontSize: 9, color: '#667788', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  {t('separation.choose_group')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 7 }}>
                  {separationGroupOptions.map(({ group, resource }) => {
                    const selected = effectiveSeparationGroup === group;
                    const color = RESOURCE_COLORS[resource];
                    const avail = Math.floor(colonyResources[SEPARATION_GROUP_RESOURCE[group]] ?? 0);
                    const enough = avail >= SEPARATION_BATCH;
                    return (
                      <button
                        key={group}
                        type="button"
                        disabled={!!activeSeparationJob || separationGroupOptions.length === 1}
                        onClick={() => setSeparationGroup(group)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          textAlign: 'left',
                          background: selected ? `${color}22` : 'rgba(5,10,20,0.5)',
                          border: `1px solid ${selected ? color : 'rgba(51,68,85,0.6)'}`,
                          borderRadius: 6,
                          padding: '8px 10px',
                          cursor: activeSeparationJob || separationGroupOptions.length === 1 ? 'default' : 'pointer',
                          opacity: activeSeparationJob && !selected ? 0.4 : 1,
                          boxShadow: selected ? `0 0 14px ${color}3a` : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 22, height: 22, borderRadius: 5,
                          background: `${color}1a`, border: `1px solid ${color}55`,
                        }}>
                          <ResourceIcon type={resource} size={13} />
                        </span>
                        <div style={{ display: 'grid', gap: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 10.5, color: selected ? '#e6f0ff' : '#aabbcc', letterSpacing: 0.5 }}>
                            {t(`separation.group.${group}`)}
                          </span>
                          <span style={{ fontSize: 8.5, color: enough ? '#7d93ab' : '#cc7777', letterSpacing: 0.3 }}>
                            {avail} {t('separation.in_stock')}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cost chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'rgba(5,10,20,0.5)', border: `1px solid ${groupColor}55`,
                  borderRadius: 999, padding: '5px 10px', fontSize: 10, color: '#cfe3ff',
                }}>
                  <ResourceIcon type={SEPARATION_GROUP_RESOURCE[effectiveSeparationGroup]} size={11} />
                  −{SEPARATION_BATCH}
                </span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'rgba(5,10,20,0.5)', border: '1px solid rgba(68,136,170,0.4)',
                  borderRadius: 999, padding: '5px 10px', fontSize: 10, color: '#9fd0ff',
                }}>
                  ◇ −{SEPARATION_RESEARCH_DATA_COST} {t('separation.unit_research')}
                </span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'rgba(5,10,20,0.5)', border: '1px solid rgba(136,187,153,0.4)',
                  borderRadius: 999, padding: '5px 10px', fontSize: 10, color: '#88bb99',
                }}>
                  ⧗ 1h
                </span>
              </div>

              {/* Active job OR start */}
              {activeSeparationJob ? (
                <div style={{ display: 'grid', gap: 7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 10, color: '#9fd0ff' }}>
                    <span style={{ letterSpacing: 1, textTransform: 'uppercase' }}>{t('separation.in_progress')}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: '#cfe3ff' }}>
                      {`${Math.floor(separationSecondsLeft / 60)}:${String(separationSecondsLeft % 60).padStart(2, '0')}`}
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: 'rgba(5,10,20,0.7)', overflow: 'hidden', border: `1px solid ${groupColor}33` }}>
                    <div style={{
                      width: `${separationPct}%`, height: '100%',
                      background: `linear-gradient(90deg, ${groupColor}, #cfe3ff)`,
                      boxShadow: `0 0 12px ${groupColor}`,
                      transition: 'width 0.5s linear',
                    }} />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={blocked}
                  onClick={() => onStartSeparation?.(building.id, planet.id, selectedSeparationGroup, type)}
                  style={{
                    background: blocked ? 'rgba(20,30,45,0.45)' : `linear-gradient(180deg, ${groupColor}33, ${groupColor}18)`,
                    border: `1px solid ${blocked ? BORDER : groupColor}`,
                    borderRadius: 6,
                    color: blocked ? '#556677' : '#e6f0ff',
                    fontFamily: 'monospace',
                    fontSize: 11.5,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    padding: '11px 12px',
                    cursor: blocked ? 'not-allowed' : 'pointer',
                    boxShadow: blocked ? 'none' : `0 0 18px ${groupColor}3a`,
                  }}
                >
                  {stats.isShutdown
                    ? t('separation.no_power')
                    : !canAffordSeparation
                      ? t('separation.need_bulk', { amount: SEPARATION_BATCH })
                      : t('separation.start')}
                </button>
              )}

              {/* Possible elements */}
              <div style={{ display: 'grid', gap: 5 }}>
                <div style={{ fontSize: 9, color: '#667788', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  {t('separation.possible_elements')}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {getSeparationElements(effectiveSeparationGroup).map((el, i) => (
                    <span key={el} style={{
                      background: i < 3 ? `${groupColor}1c` : 'rgba(5,10,20,0.42)',
                      border: `1px solid ${i < 3 ? `${groupColor}55` : 'rgba(51,68,85,0.55)'}`,
                      borderRadius: 4,
                      color: i < 3 ? '#e6f0ff' : '#8c9cad',
                      fontSize: 10,
                      padding: '3px 7px',
                    }}>{el}</span>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {type === 'genesis_vault' && (
          <div style={{
            position: 'relative',
            // flexShrink:0: same flex/overflow:hidden collapse guard as the
            // separator block above — without it the body collapses to 0 height.
            flexShrink: 0,
            overflow: 'hidden',
            background: 'radial-gradient(120% 140% at 0% 0%, rgba(68,255,136,0.16), rgba(8,16,26,0.92) 58%)',
            border: '1px solid rgba(68,255,136,0.5)',
            borderRadius: 8,
            padding: compact ? 12 : 16,
            display: 'grid',
            gap: 12,
            boxShadow: '0 16px 38px rgba(0,0,0,0.35), inset 0 0 40px rgba(68,255,136,0.10)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 26, height: 26, borderRadius: 6,
                background: 'rgba(68,255,136,0.14)', border: '1px solid rgba(68,255,136,0.5)',
                boxShadow: '0 0 14px rgba(68,255,136,0.4)',
              }}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#44ff88"
                  strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 14c3-2 4.5-4.5 4.5-7A4.5 4.5 0 0 0 8 2.5 4.5 4.5 0 0 0 3.5 7c0 2.5 1.5 5 4.5 7Z" />
                  <path d="M8 13c0-3 0-5 1.6-7M8 13c0-2.4 0-4-1.4-5.6" opacity="0.6" />
                </svg>
              </span>
              <div style={{ display: 'grid', gap: 1 }}>
                <div style={{ fontSize: 12, color: '#bdffd6', letterSpacing: 2, textTransform: 'uppercase' }}>
                  {t('lifeform.genesis_create')}
                </div>
                <div style={{ fontSize: 9, color: '#7faf93', letterSpacing: 0.5 }}>
                  {t('lifeform.genesis_tagline')}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { try { window.dispatchEvent(new CustomEvent('nebulife:open-genesis-lab')); } catch { /* ignore */ } }}
              style={{
                background: 'linear-gradient(180deg, rgba(68,255,136,0.30), rgba(68,255,136,0.14))',
                border: '1px solid #44ff88',
                borderRadius: 6,
                color: '#eafff2',
                fontFamily: 'monospace',
                fontSize: 11.5,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                padding: '11px 12px',
                cursor: 'pointer',
                boxShadow: '0 0 18px rgba(68,255,136,0.32)',
              }}
            >
              {t('lifeform.genesis_open_lab')}
            </button>
          </div>
        )}

        {type === 'research_lab' && building && (() => {
          const labAccent = '#7bb8ff';
          const extractBlocked = stats.isShutdown || !canAffordExtraction || !onStartExtraction;
          return (
            <div style={{
              position: 'relative', flexShrink: 0, overflow: 'hidden',
              background: `radial-gradient(120% 140% at 0% 0%, ${labAccent}1f, rgba(8,14,26,0.92) 58%)`,
              border: `1px solid ${labAccent}66`, borderRadius: 8,
              padding: compact ? 12 : 16, display: 'grid', gap: 13,
              boxShadow: `0 16px 38px rgba(0,0,0,0.35), inset 0 0 40px ${labAccent}12`,
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 26, height: 26, borderRadius: 6,
                  background: `${labAccent}1c`, border: `1px solid ${labAccent}66`, boxShadow: `0 0 14px ${labAccent}44`,
                }}>
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke={labAccent} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2v4L3 13a1.5 1.5 0 0 0 1.4 2h7.2A1.5 1.5 0 0 0 13 13l-3-7V2" />
                    <path d="M5 2h6" />
                  </svg>
                </span>
                <div style={{ display: 'grid', gap: 1 }}>
                  <div style={{ fontSize: 12, color: '#cfe3ff', letterSpacing: 2, textTransform: 'uppercase' }}>{t('lab.experiments')}</div>
                  <div style={{ fontSize: 9, color: '#7d93ab', letterSpacing: 0.5 }}>{t('lab.experiments_tagline')}</div>
                </div>
              </div>

              {/* Last-5 experiment history */}
              <ResultHistoryStrip title={t('lab.history')} history={experimentHistory ?? []} onView={onViewResult} />

              {/* Experiment 1 — particle extraction */}
              <div style={{ display: 'grid', gap: 8, padding: 11, borderRadius: 7, background: 'rgba(5,10,20,0.45)', border: `1px solid ${labAccent}33` }}>
                <div style={{ fontSize: 11, color: '#cfe3ff', letterSpacing: 0.5 }}>{t('lab.extraction_title')}</div>
                <div style={{ fontSize: 9.5, color: '#8c9cad', lineHeight: 1.5 }}>{t('lab.extraction_desc')}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(5,10,20,0.5)', border: `1px solid ${labAccent}55`, borderRadius: 999, padding: '5px 10px', fontSize: 10, color: '#cfe3ff' }}>
                    <ResourceIcon type="minerals" size={11} /> −{EXTRACTION_BATCH}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(5,10,20,0.5)', border: '1px solid rgba(68,136,170,0.4)', borderRadius: 999, padding: '5px 10px', fontSize: 10, color: '#9fd0ff' }}>
                    ◇ −{EXTRACTION_RESEARCH_DATA_COST}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(5,10,20,0.5)', border: '1px solid rgba(136,187,153,0.4)', borderRadius: 999, padding: '5px 10px', fontSize: 10, color: '#88bb99' }}>⧗ 45m</span>
                </div>
                {activeExtractionJob ? (
                  <div style={{ display: 'grid', gap: 7 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 10, color: '#9fd0ff' }}>
                      <span style={{ letterSpacing: 1, textTransform: 'uppercase' }}>{t('lab.extracting')}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', color: '#cfe3ff' }}>
                        {`${Math.floor(extractionSecondsLeft / 60)}:${String(extractionSecondsLeft % 60).padStart(2, '0')}`}
                      </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: 'rgba(5,10,20,0.7)', overflow: 'hidden', border: `1px solid ${labAccent}33` }}>
                      <div style={{ width: `${extractionPct}%`, height: '100%', background: `linear-gradient(90deg, ${labAccent}, #cfe3ff)`, boxShadow: `0 0 12px ${labAccent}`, transition: 'width 0.5s linear' }} />
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={extractBlocked}
                    onClick={() => onStartExtraction?.(building.id, planet.id)}
                    style={{
                      background: extractBlocked ? 'rgba(20,30,45,0.45)' : `linear-gradient(180deg, ${labAccent}33, ${labAccent}18)`,
                      border: `1px solid ${extractBlocked ? BORDER : labAccent}`, borderRadius: 6,
                      color: extractBlocked ? '#556677' : '#e6f0ff', fontFamily: 'monospace', fontSize: 11.5,
                      letterSpacing: 1.5, textTransform: 'uppercase', padding: '11px 12px',
                      cursor: extractBlocked ? 'not-allowed' : 'pointer', boxShadow: extractBlocked ? 'none' : `0 0 18px ${labAccent}3a`,
                    }}
                  >
                    {stats.isShutdown ? t('separation.no_power') : !canAffordExtraction ? t('lab.need_bulk', { amount: EXTRACTION_BATCH }) : t('lab.extract_start')}
                  </button>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {getExtractionElements().slice(0, 8).map((el, i) => (
                    <span key={el} style={{
                      background: i < 4 ? `${labAccent}1c` : 'rgba(5,10,20,0.42)',
                      border: `1px solid ${i < 4 ? `${labAccent}55` : 'rgba(51,68,85,0.55)'}`,
                      borderRadius: 4, color: i < 4 ? '#e6f0ff' : '#8c9cad', fontSize: 10, padding: '3px 7px',
                    }}>{el}</span>
                  ))}
                </div>
              </div>

              {/* Experiment 2 — spark of life (DNA minigame) */}
              <div style={{ display: 'grid', gap: 8, padding: 11, borderRadius: 7, background: 'rgba(5,10,20,0.45)', border: '1px solid rgba(183,140,255,0.3)' }}>
                <div style={{ fontSize: 11, color: '#e3d2ff', letterSpacing: 0.5 }}>{t('lab.spark_title')}</div>
                <div style={{ fontSize: 9.5, color: '#9c8cad', lineHeight: 1.5 }}>{t('lab.spark_desc')}</div>
                <button
                  type="button"
                  disabled={stats.isShutdown || !onOpenDnaLab}
                  onClick={() => onOpenDnaLab?.()}
                  style={{
                    background: stats.isShutdown ? 'rgba(20,30,45,0.45)' : 'linear-gradient(180deg, rgba(183,140,255,0.30), rgba(183,140,255,0.14))',
                    border: `1px solid ${stats.isShutdown ? BORDER : '#b78cff'}`, borderRadius: 6,
                    color: stats.isShutdown ? '#556677' : '#f0e6ff', fontFamily: 'monospace', fontSize: 11.5,
                    letterSpacing: 1.5, textTransform: 'uppercase', padding: '11px 12px',
                    cursor: stats.isShutdown ? 'not-allowed' : 'pointer', boxShadow: stats.isShutdown ? 'none' : '0 0 18px rgba(183,140,255,0.32)',
                  }}
                >
                  {stats.isShutdown ? t('separation.no_power') : t('lab.spark_start')}
                </button>
              </div>
            </div>
          );
        })()}

        {type === 'orbital_telescope' && (() => {
          const events = upcomingEvents ?? [];
          return (
            <div style={{
              position: 'relative', flexShrink: 0, overflow: 'hidden',
              background: 'radial-gradient(120% 140% at 0% 0%, rgba(123,184,255,0.16), rgba(8,14,26,0.92) 58%)',
              border: '1px solid rgba(123,184,255,0.5)', borderRadius: 8,
              padding: compact ? 12 : 16, display: 'grid', gap: 12,
              boxShadow: '0 16px 38px rgba(0,0,0,0.35), inset 0 0 40px rgba(123,184,255,0.10)',
            }}>
              <div style={{ display: 'grid', gap: 1 }}>
                <div style={{ fontSize: 12, color: '#cfe3ff', letterSpacing: 2, textTransform: 'uppercase' }}>{t('events.telescope_section')}</div>
                <div style={{ fontSize: 9, color: '#7d93ab', letterSpacing: 0.5 }}>{t('events.telescope_tagline')}</div>
              </div>
              {events.length === 0 ? (
                <div style={{ color: '#667788', fontSize: 11, padding: '8px 0' }}>{t('events.none')}</div>
              ) : (
                events.slice(0, 5).map((ev) => (
                  <CosmicEventCard
                    key={ev.id}
                    event={ev}
                    compact
                    telescopeAvailable={hasOrbitalTelescope}
                    researched={researchedEventIds.has(ev.id)}
                    onResearch={handleResearchEvent}
                  />
                ))
              )}
            </div>
          );
        })()}

        {type === 'observatory' && (upcomingEvents?.length ?? 0) > 0 && (
          <div style={{
            position: 'relative', flexShrink: 0, overflow: 'hidden',
            background: 'radial-gradient(120% 140% at 0% 0%, rgba(136,153,170,0.14), rgba(8,14,26,0.92) 58%)',
            border: '1px solid rgba(136,153,170,0.4)', borderRadius: 8,
            padding: compact ? 12 : 16, display: 'grid', gap: 12,
          }}>
            <div style={{ display: 'grid', gap: 1 }}>
              <div style={{ fontSize: 12, color: '#cfe3ff', letterSpacing: 2, textTransform: 'uppercase' }}>{t('events.observatory_section')}</div>
              <div style={{ fontSize: 9, color: '#7d93ab', letterSpacing: 0.5 }}>{t('events.observatory_tagline')}</div>
            </div>
            <CosmicEventCard
              event={upcomingEvents![0]}
              imageless={!hasOrbitalTelescope}
              telescopeAvailable={hasOrbitalTelescope}
              researched={researchedEventIds.has(upcomingEvents![0].id)}
              onResearch={handleResearchEvent}
            />
          </div>
        )}

        {type === 'radar_tower' && (() => {
          const events = upcomingEvents ?? [];
          return (
            <div style={{
              position: 'relative', flexShrink: 0, overflow: 'hidden',
              background: 'radial-gradient(120% 140% at 0% 0%, rgba(255,207,102,0.14), rgba(8,14,26,0.92) 58%)',
              border: '1px solid rgba(255,207,102,0.4)', borderRadius: 8,
              padding: compact ? 12 : 16, display: 'grid', gap: 12,
            }}>
              <div style={{ display: 'grid', gap: 1 }}>
                <div style={{ fontSize: 12, color: '#ffe3a8', letterSpacing: 2, textTransform: 'uppercase' }}>{t('events.radar_section')}</div>
                <div style={{ fontSize: 9, color: '#bfa86a', letterSpacing: 0.5 }}>{t('events.radar_tagline')}</div>
              </div>
              {/* Cosmic events feed */}
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontSize: 9, color: '#667788', letterSpacing: 1.5, textTransform: 'uppercase' }}>{t('events.feed')}</div>
                {events.length === 0 ? (
                  <div style={{ color: '#667788', fontSize: 11 }}>{t('events.none')}</div>
                ) : (
                  events.slice(0, 5).map((ev) => {
                    const uk = i18n.language?.startsWith('uk');
                    return (
                      <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 6, background: 'rgba(5,10,20,0.45)', border: '1px solid rgba(255,207,102,0.25)' }}>
                        <span style={{ color: '#cfe3ff', fontSize: 10.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uk ? ev.titleUk : ev.titleEn}</span>
                        <EventCountdown untilMs={ev.eventTime} color="#ffcf66" />
                      </div>
                    );
                  })
                )}
              </div>
              {/* Signal decoding shortcut (also available in the Operations Hub) */}
              <button
                type="button"
                disabled={!onOpenSignals}
                onClick={() => onOpenSignals?.()}
                style={{
                  background: 'linear-gradient(180deg, rgba(255,207,102,0.26), rgba(255,207,102,0.12))',
                  border: '1px solid #ffcf66', borderRadius: 6, color: '#fff3d6',
                  fontFamily: 'monospace', fontSize: 11.5, letterSpacing: 1.5, textTransform: 'uppercase',
                  padding: '11px 12px', cursor: onOpenSignals ? 'pointer' : 'not-allowed',
                  boxShadow: '0 0 18px rgba(255,207,102,0.28)',
                }}
              >
                {t('events.decode_signal')}
              </button>
            </div>
          );
        })()}

        <div style={{
          background: 'linear-gradient(135deg, rgba(20,30,45,0.72), rgba(5,10,20,0.74))',
          border: `1px solid ${ACTIVE_BORDER}`,
          borderRadius: 6,
          padding: compact ? 11 : 14,
          boxShadow: '0 12px 30px rgba(0,0,0,0.22)',
        }}>
          <div style={{ fontSize: 10, color: accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            {t(`colony_center.building_category.${def.category}`)}
          </div>
          <div style={{ fontSize: 12, color: '#8899aa', lineHeight: 1.5 }}>
            {buildingDesc(type, t)}
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

        <div style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
          <MetricCard
            label={t('building_detail.status')}
            value={stats.isShutdown ? t('building_detail.status_shutdown') : t('building_detail.status_active')}
            accent={stats.isShutdown ? '#cc7777' : '#88bb99'}
          />
          <MetricCard
            label={t('building_detail.energy')}
            value={type === 'colony_hub'
              ? `${formatHourlyAmount(colonyEnergyProducedPerHour, t, i18n.language)} / ${formatHourlyAmount(colonyEnergyConsumedPerHour, t, i18n.language)}`
              : formatSignedRatePerHour(energyNetPerHour, t, i18n.language)}
            sub={type === 'colony_hub'
              ? t('building_detail.colony_energy_desc')
              : `${t('building_detail.output')} ${formatSignedRatePerHour(energyOutputPerHour, t, i18n.language)} / ${t('building_detail.consumes')} ${formatSignedRatePerHour(energyConsumptionPerHour, t, i18n.language)}`}
            accent={type === 'colony_hub' && colonyEnergyProducedPerHour < colonyEnergyConsumedPerHour ? '#cc7777' : '#ffaa66'}
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
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
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

        {type === 'resource_storage' && (
          <Section title={t('resource_widget.storage_title')}>
            <div style={{
              background: 'rgba(10,15,25,0.48)',
              border: '1px solid rgba(68,136,170,0.35)',
              borderRadius: 5,
              padding: compact ? 10 : 12,
              display: 'grid',
              gap: 12,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                {(['minerals', 'volatiles', 'isotopes', 'water'] as ColonyResourceKey[]).map((resource) => (
                  <div key={resource} style={{ border: '1px solid rgba(51,68,85,0.42)', borderRadius: 4, padding: 8, background: 'rgba(5,10,20,0.46)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: RESOURCE_COLORS[resource], fontSize: 10, marginBottom: 5 }}>
                      <ResourceIcon type={resource} size={12} />
                      <span>{t(`colony_center.resource.${resource}`)}</span>
                    </div>
                    <div style={{ color: '#cfe3ff', fontSize: 15, fontWeight: 700 }}>{Math.round(colonyResources[resource] ?? 0).toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid rgba(51,68,85,0.42)', paddingTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 7 }}>
                  <span style={{ color: '#8899aa', fontSize: 10, letterSpacing: 1.1, textTransform: 'uppercase' }}>
                    {t('resource_widget.elements_title')}
                  </span>
                  <span style={{ color: '#667788', fontSize: 9 }}>{t('resource_widget.elements_count', { count: localElements.length })}</span>
                </div>
                {localElements.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
                    {localElements.map((element) => (
                      <div key={element.symbol} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, border: '1px solid rgba(51,68,85,0.34)', borderRadius: 3, padding: '5px 7px', background: 'rgba(5,10,20,0.48)' }}>
                        <span style={{ color: '#7bb8ff', fontWeight: 700 }}>{element.symbol}</span>
                        <span style={{ color: '#8899aa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {i18n.language === 'uk' ? element.nameUk : element.name}
                        </span>
                        <span style={{ color: '#cfe3ff', marginLeft: 'auto' }}>{Math.round(element.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#556677', fontSize: 10 }}>{t('archive.no_elements_owned')}</div>
                )}
              </div>
            </div>
          </Section>
        )}

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
                    gridTemplateColumns: compact ? 'repeat(auto-fit, minmax(148px, 1fr))' : 'repeat(4, minmax(0, 1fr))',
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
                        // Ad gate only where rewarded ads can actually show
                        // (AdMob = native shells). On web showRewardedAd
                        // instantly returns rewarded:false, which silently
                        // blocked the search for every non-premium player.
                        if (!isPremium && isNativePlatform()) {
                          setObservatoryAdsRunning(true);
                          const result = await watchAdsWithProgress('research_data', 3, () => {});
                          setObservatoryAdsRunning(false);
                          if (!result.rewarded) {
                            addInfoReport(t('observatory.ad_gate_title'), t('observatory.ad_gate_failed'));
                            return;
                          }
                        }
                        const started = onStartObservatorySearch?.(duration, selectedObservatoryProgram, observatoryCount);
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
                      <ObservatoryReportCard
                        key={report.id}
                        report={report}
                        onView={onViewReportDiscovery ? (d) => { onViewReportDiscovery(d); onClose(); } : undefined}
                      />
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

        <Section title={t('building_detail.passive_effects')}>
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
            {passiveEffects.length > 0 ? passiveEffects.map((effect) => (
              <PassiveEffectCard key={effect.id} effect={effect} />
            )) : (
              <div style={{ color: '#556677', fontSize: 11 }}>{t('building_detail.no_passive_effects')}</div>
            )}
          </div>
          {type === 'colony_hub' && onOpenColonyCenter && (
            <button
              type="button"
              onClick={() => onOpenColonyCenter('overview')}
              style={{
                marginTop: 8,
                justifySelf: 'start',
                background: 'rgba(20,30,45,0.55)',
                border: `1px solid ${ACTIVE_BORDER}`,
                borderRadius: 4,
                color: '#9fd0ff',
                fontFamily: 'monospace',
                fontSize: 10,
                letterSpacing: 1,
                textTransform: 'uppercase',
                padding: '8px 12px',
                cursor: 'pointer',
              }}
            >
              {t('building_detail.action_open_center')}
            </button>
          )}
          {type === 'landing_pad' && (
              <div style={{
              marginTop: 8,
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
            )}
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
                    {t('common.exit')}
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
