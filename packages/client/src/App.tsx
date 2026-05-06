import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { playSfx, playLoop, stopLoop, setLoopVolume } from './audio/SfxPlayer.js';
import i18n, { LanguageProvider, useT } from './i18n/index.js';
import type { Language } from '@nebulife/core';
import { GameEngine } from './game/GameEngine.js';
import { UniverseEngine } from './game/UniverseEngine.js';
import {
  getSystemSharedState,
  sendHeartbeat,
  recordDestruction,
  getDestroyedPlanetIds,
} from './multiplayer/cluster-state.js';
import { QuarkToastRenderer, enqueueQuarkToast } from './ui/components/QuarkToastQueue.js';
import { WarpTransition } from './ui/components/WarpTransition.js';
import { CommandBar } from './ui/components/CommandBar/index.js';
import type { NavigationMenuItem, ToolGroup, ExtendedScene } from './ui/components/CommandBar/index.js';
import { PlanetInfoPanel } from './ui/components/PlanetInfoPanel.js';
import { PlanetContextMenu } from './ui/components/PlanetContextMenu.js';
import { SystemContextMenu } from './ui/components/SystemContextMenu.js';
import type { SystemPhotoData, SystemMissionData } from './ui/components/SystemContextMenu.js';
import { RadialMenu } from './ui/components/RadialMenu.js';
import { GalaxyWarpOverlay } from './ui/components/GalaxyWarpOverlay.js';
import { SystemInfoPanel } from './ui/components/SystemInfoPanel.js';
import { ResearchPanel } from './ui/components/ResearchPanel.js';
import { ResearchCompleteModal } from './ui/components/ResearchCompleteModal.js';
import { DiscoveryChoicePanel } from './ui/components/DiscoveryChoicePanel.js';
import { ObservatoryView } from './ui/components/ObservatoryView.js';
import { TelemetryView } from './ui/components/TelemetryView.js';
import PlanetGlobeView from './ui/components/PlanetGlobeView.js';
import type { PlanetGlobeViewHandle } from './ui/components/PlanetGlobeView.js';
import { ExospherePremiumPanel } from './ui/components/ExospherePremiumPanel.js';
import { HexSurface as SurfaceShaderView } from './ui/components/hex-surface/HexSurface.js';
import type { SurfaceViewHandle, SurfacePhase } from './ui/components/hex-surface/HexSurface.js';
import { QuarkTopUpModal } from './ui/components/QuarkTopUpModal.js';
import { SystemNavHeader } from './ui/components/SystemNavHeader.js';
import { PlanetNavHeader } from './ui/components/PlanetNavHeader.js';
import { FloatingInfoButton } from './ui/components/FloatingInfoButton.js';
import { SystemObjectsPanel } from './ui/components/SystemObjectsPanel.js';
import { PlanetDetailWindow } from './ui/components/PlanetDetailWindow.js';
import { SceneControlsPanel } from './ui/components/SceneControlsPanel.js';
import { TelescopeOverlay } from './ui/components/TelescopeOverlay.js';
import type {
  Planet, Star, StarSystem, ResearchState, SystemResearchState, Discovery, CatalogEntry,
} from '@nebulife/core';
import { getCatalogEntry, getCatalogName, BUILDING_DEFS } from '@nebulife/core';
import { checkPremiumStatus, initIAP } from './api/iap-service.js';
import { getPlayerAliases, setAlias } from './api/alias-api.js';
import {
  createResearchState,
  startResearch,
  completeResearchSession,
  findFreeSlot,
  findBestSlotForSystem,
  canStartResearch,
  isSystemFullyResearched,
  isRingFullyResearched,
  getResearchProgress,
  findColonizablePlanet,
  findParadisePlanet,
  completeSystemResearchInstantly,
  HOME_OBSERVATORY_COUNT,
  HOME_RESEARCH_MAX_RING,
  RESEARCH_DURATION_MS,
  INITIAL_RESEARCH_DATA,
  RESEARCH_DATA_COST,
  calculateImpactTime,
  remainingTimeFormatted,
  remainingGameSeconds,
  gameSecondsElapsed,
  BASE_TIME_MULTIPLIER,
  GAME_TOTAL_SECONDS,
  levelFromXP,
  XP_REWARDS,
  getSystemResearchCompletionXP,
  SESSION_XP,
  HARVEST_YIELD,
  createTechTreeState,
  getTechNodeStatus,
  researchTech,
  getEffectValue,
  hasAvailableTech,
  ALL_NODES,
  runColonyTicks,
  createPlanetColonyState,
  COLONY_TICK_INTERVAL_MS,
  HOME_PLANET_STOCK_FLOOR,
  POST_EVACUATION_RESOURCE_RESERVE,
  PRODUCIBLE_DEFS,
  createFleetState,
  isShipProducible,
  canStartPlanetMission,
  createPlanetMission,
  completePlanetMission,
  getPlanetMissionProgress,
  isSolidPlanetForLanding,
  generateStarSystem,
  getRequiredMissionCarrier,
  COSMIC_CATALOG,
  createObservatoryState,
  normalizeObservatoryState,
  startObservatorySearch,
  completeReadyObservatorySearches,
  getObservatoryLevel,
} from '@nebulife/core';
import type { TechTreeState, TechNode, SurfaceObjectType, BuildingType, PlanetColonyState, PlacedBuilding, PlanetResourceStocks, ProducibleType, FleetState, Ship, CargoShipment, ObservatoryState, ObservatorySearchDuration, ObservatorySearchProgram } from '@nebulife/core';
import type { PlanetTerraformState, Mission, TerraformParamId, ShipTier as TfShipTier, PlanetOverride } from '@nebulife/core';
import type { PlanetMission, PlanetMissionType, PlanetReportSummary, PlanetRevealLevel } from '@nebulife/core';
import {
  getInitialTerraformState,
  applyDelivery,
  applyTerraformCompletionToPlanet,
  getOverallProgress,
  tickMission,
  tierForBuildings,
  systemDistanceLY,
  generatePlanetStocks,
  depleteStock,
  applyLevelDepletion,
} from '@nebulife/core';
import { MissionTracker } from './ui/components/Terraform/MissionTracker.js';
import { TerraformPanel } from './ui/components/Terraform/TerraformPanel.js';
import { SystemResearchOverlay } from './ui/components/SystemResearchOverlay.js';
import { ScientificReport } from './ui/components/ScientificReport.js';
import { MissionReportModal } from './ui/components/PlanetMission/MissionReportModal.js';
import { getMissionPhotoKey, renderMissionProbePhoto } from './ui/components/PlanetMission/MissionProbePhotoRenderer.js';
import { GuestRegistrationReminder } from './ui/components/GuestRegistrationReminder.js';
import { GalleryCompareModal } from './ui/components/GalleryCompareModal.js';
import { ResourceDisplay } from './ui/components/ResourceDisplay.js';
import { ResourceDescriptionModal, type ResourceType } from './ui/components/ResourceDescriptionModal.js';
import { ResourceWidget } from './ui/components/ResourceWidget.js';
import { BuildingQuest } from './ui/components/BuildingQuest.js';
import { ResourceFlyDot } from './ui/components/ResourceFlyDot.js';
import { LevelUpBanner } from './ui/components/LevelUpBanner.js';
import { ResearchToast } from './ui/components/ResearchToast.js';
import type { ResearchToastItem } from './ui/components/ResearchToast.js';
import { CutsceneVideo } from './ui/components/CutsceneVideo.js';
import { EvacuationPrompt } from './ui/components/EvacuationPrompt.js';
import { ColonyFoundingPrompt } from './ui/components/ColonyFoundingPrompt.js';
import { getPlayer, createPlayer, getDiscoveries, saveDiscoveryToServer, updatePlayer, updateFcmToken, fetchUniverseInfo, uploadPlayerAvatar, removePlayerAvatar } from './api/player-api.js';
import type { DiscoveryData } from './api/player-api.js';
import { requestPushPermissionDetailed, startForegroundListener } from './notifications/push-service.js';
import { getCurrentUser, onAuthChange, signOut } from './auth/auth-service.js';
import { authFetch, apiFetch } from './auth/api-client.js';
import { isFirebaseConfigured } from './auth/firebase-config.js';
import { AuthScreen } from './ui/components/AuthScreen.js';
import { CallsignModal } from './ui/components/CallsignModal.js';
import { LinkAccountModal } from './ui/components/LinkAccountModal.js';
import { CinematicIntro } from './ui/components/CinematicIntro.js';
import { QuantumSeedLoader } from './ui/components/QuantumSeedLoader.js';
import { PerfTierSelectScreen } from './ui/components/PerfTierSelectScreen.js';
import { getDeviceTier, setPerfTierChoice } from './utils/device-tier.js';
import { parseCompactNumber } from './utils/formatNumber.js';
import type { PerfTierChoice } from './utils/device-tier.js';
import { ChatWidget } from './ui/components/ChatWidget.js';
import type { SystemNotif } from './ui/components/ChatWidget.js';
import { DigestModal } from './ui/components/DigestModal.js';
import { CosmicArchive } from './ui/components/CosmicArchive/CosmicArchive.js';
import { AcademyDashboard } from './ui/components/Academy/AcademyDashboard.js';
import type { AcademyTab } from './ui/components/Academy/AcademyDashboard.js';
import { SurfaceAstraLessonPrompt } from './ui/components/Academy/SurfaceAstraLessonPrompt.js';
import { EncyclopediaScreen } from './ui/components/Encyclopedia/EncyclopediaScreen.js';
import { SpaceArena } from './ui/components/SpaceArena/SpaceArena.js';
import { HangarPage } from './ui/components/Hangar/HangarPage.js';
import { CarrierRaid } from './ui/components/Raid/CarrierRaid.js';
import { ColonyCenterPage, RESOURCE_BOOST_PRICES, TIME_BOOST_PRICES, BOOST_DURATION_MS } from './ui/components/ColonyCenter/ColonyCenterPage.js';
import type { ColonyCenterPlanet, ColonyCenterTabId } from './ui/components/ColonyCenter/ColonyCenterPage.js';
import { SpaceAmbient } from './audio/SpaceAmbient.js';
import type { SharedLessonInfo } from './ui/components/Academy/AcademyDashboard.js';
import { PlayerPage } from './ui/components/PlayerPage.js';
import type { CosmicArchiveHandle } from './ui/components/CosmicArchive/CosmicArchive.js';
import type { LogEntry, LogCategory } from './ui/components/CosmicArchive/SystemLog.js';
import { TutorialOverlay, FreeTaskHUD, TUTORIAL_STEPS } from './ui/components/Tutorial/index.js';
import type { User } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { canShowAd, isNativePlatform, watchAdsWithProgress } from './services/ads-service.js';
import { setAdsUnlockedAfterSettlement } from './services/ad-release-gate.js';
import { interstitialManager } from './services/interstitial-manager.js';
import {
  generateSystemPhoto, pollSystemPhotoStatus,
  generateSystemMission, pollMissionStatus,
  getPlayerSystemPhotos as fetchPlayerSystemPhotos,
} from './api/system-photo-api.js';
import type { PlanetPhotoKind } from './api/system-photo-api.js';
import {
  generatePlanetSkin,
  listPlanetSkinsForSystem,
  pollPlanetSkinStatus,
  type PlanetSkin,
  type PlanetSkinKind,
} from './api/planet-skin-api.js';
import { saveMissionPhoto } from './api/mission-photo-api.js';
import { trackPaidFeatureOrder } from './analytics/firebase-analytics.js';

export type SceneType = 'universe' | 'cluster' | 'galaxy' | 'system' | 'home-intro' | 'planet-view';

type ColonyResourceName = 'minerals' | 'volatiles' | 'isotopes' | 'water';
type ColonyResourceBundle = Record<ColonyResourceName, number>;

const BASE_RESOURCE_STORAGE_CAPACITY = 1000;
const KLING_PHOTO_COST = 25;
const GEMINI_PHOTO_COST = 50;
const MISSION_CARRIER_RETURN_MS = 60 * 60_000;
const MISSION_PHOTO_REVEAL_MS = 15_000;
const MIN_BOOT_LOADER_MS = 4200;

function getPlanetPhotoCost(photoKind: PlanetPhotoKind): number {
  return photoKind === 'exosphere' ? KLING_PHOTO_COST : GEMINI_PHOTO_COST;
}

function getMissionAlphaPhotoKind(report: PlanetReportSummary): PlanetPhotoKind {
  return report.missionType === 'surface_landing' ? 'biosphere' : 'aerial';
}

function getMissionAlphaPhotoKey(planetId: string, report: PlanetReportSummary): string {
  return `planet-${getMissionAlphaPhotoKind(report)}-${planetId}__${report.missionId}`;
}

function MissionPhotoReceiveOverlay({ imageDataUrl, planetName, startedAt }: { imageDataUrl: string; planetName: string; startedAt: number }) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 120);
    return () => window.clearInterval(id);
  }, []);

  const progress = Math.max(0, Math.min(1, (now - startedAt) / MISSION_PHOTO_REVEAL_MS));
  const clipInset = Math.round((1 - progress) * 100);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 12000,
      background: 'rgba(2,5,12,0.96)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      fontFamily: 'monospace',
      color: '#aabbcc',
    }}>
      <div style={{ width: 'min(920px, 92vw)', border: '1px solid #334455', background: 'rgba(5,10,18,0.96)', padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' }}>
          <span>{t('mission_report.receiving_photo')}</span>
          <span>{planetName} · {Math.round(progress * 100)}%</span>
        </div>
        <div style={{ position: 'relative', aspectRatio: '16 / 9', overflow: 'hidden', background: '#020510', border: '1px solid rgba(68,102,136,0.55)' }}>
          <img
            src={imageDataUrl}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              filter: 'contrast(1.12) brightness(0.92)',
              clipPath: `inset(0 0 ${clipInset}% 0)`,
            }}
          />
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${Math.round(progress * 100)}%`,
            height: 2,
            background: '#7bb8ff',
            boxShadow: '0 0 14px rgba(123,184,255,0.8)',
            opacity: progress < 1 ? 0.9 : 0,
          }} />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 5px)',
            mixBlendMode: 'screen',
            opacity: 0.55,
          }} />
        </div>
        <div style={{ marginTop: 10, height: 4, background: 'rgba(40,55,75,0.65)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, background: '#4488aa' }} />
        </div>
      </div>
    </div>
  );
}

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function computeResourceStorageCapacity(buildings: PlacedBuilding[]): number {
  return buildings
    .filter((building) => !building.shutdown)
    .reduce((capacity, building) => capacity + (BUILDING_DEFS[building.type]?.storageCapacityAdd ?? 0), BASE_RESOURCE_STORAGE_CAPACITY);
}

function clampResourceBundle(resources: ColonyResourceBundle, capacity: number): ColonyResourceBundle {
  return {
    minerals: Math.min(Math.max(0, resources.minerals), capacity),
    volatiles: Math.min(Math.max(0, resources.volatiles), capacity),
    isotopes: Math.min(Math.max(0, resources.isotopes), capacity),
    water: Math.min(Math.max(0, resources.water), capacity),
  };
}

function researchDataCostForRingDistance(ringDistance: number): number {
  const distance = Math.max(0, Math.round(ringDistance));
  if (distance <= 1) return 1;
  return 2 ** (distance - 1);
}

/** Full game state synced to server via game_state JSONB */
interface SyncedGameState {
  // Progression
  xp: number;
  level: number;
  // Research
  research_state: unknown;
  player_stats: { totalCompletedSessions: number; totalDiscoveries: number; lastDiscoverySession: number };
  research_data: number;
  // Colony
  colony_resources: { minerals: number; volatiles: number; isotopes: number; water: number };
  colony_resources_by_planet?: Record<string, { minerals: number; volatiles: number; isotopes: number; water: number }>;
  chemical_inventory: Record<string, number>;
  // Game phase
  exodus_phase: boolean;
  destroyed_planets: Array<{ planetId: string; systemId: string; orbitAU: number }>;
  onboarding_done: boolean;
  tutorial_step: number;
  // Timer
  game_started_at: number | null;
  time_multiplier: number;
  accel_at: number | null;
  game_time_at_accel: number;
  clock_revealed: boolean;
  // Navigation
  scene: string;
  nav_system: string;
  nav_planet: string;
  // Technology tree
  tech_tree: unknown;
  // Log & favorites (cross-device persistence)
  log_entries: unknown[];
  favorite_planets: string[];
  // Evacuation (cross-device persistence)
  evac_system_id: string | null;
  evac_planet_id: string | null;
  evac_forced: boolean;
  // Home planet (cross-device persistence — belt-and-suspenders backup of direct DB columns)
  home_system_id: string;
  home_planet_id: string;
  // Terraforming
  terraform_states?: Record<string, unknown>;
  fleet?: unknown[];
  fleet_state?: FleetState;
  // Planet overrides (type/habitability after successful terraform — Phase 7C)
  planet_overrides?: Record<string, unknown>;
  // Planet resource stocks — finite extraction budgets (v168)
  planet_resource_stocks?: Record<string, import('@nebulife/core').PlanetResourceStocks>;
  // Planet exploration missions
  planet_reveal_levels?: Record<string, PlanetRevealLevel>;
  planet_missions?: Record<string, PlanetMission>;
  planet_reports?: Record<string, PlanetReportSummary>;
  exploration_payloads?: Partial<Record<ProducibleType, number>>;
  exploration_production_queue?: ExplorationPayloadProductionItem[];
  arena_stats?: ArenaStats;
  hangar_ship?: string;
  custom_ship_id?: string | null;
  custom_ship_glb_url?: string | null;
  observatory_state?: ObservatoryState;
  astra_quiz_answers?: Record<string, number>;
  // Metadata
  synced_at: number;
  last_regen_time?: number;
}

interface ArenaStats {
  kills: number;
  asteroidKills: number;
  deaths: number;
  score: number;
  bestScore: number;
  sessions: number;
}

export interface ExplorationPayloadProductionItem {
  id: string;
  type: ProducibleType;
  planetId: string;
  startedAt: number;
  durationMs: number;
}

export interface GameState {
  scene: SceneType;
  selectedSystem: StarSystem | null;
  selectedPlanet: Planet | null;
  planetClickPos: { x: number; y: number } | null;
  showPlanetMenu: boolean;
  showPlanetInfo: boolean;
  playerName: string;
  error: string | null;
}

/**
 * One-shot starter wallet toast — fires the FIRST time a BRAND-NEW player
 * loads the app. Skipped entirely if the balance is above the starter amount
 * (STARTER_QUARKS=20), which means the player has already earned quarks
 * from ads / daily bonuses / gameplay and is NOT a fresh account.
 * `nebulife_starter_toast_shown` in localStorage prevents repeats after
 * the toast has fired once on this device.
 */
const STARTER_QUARKS_CLIENT = 30;
function maybeShowStarterToast(currentBalance: number): void {
  try {
    if (localStorage.getItem('nebulife_starter_toast_shown') === '1') return;
    if (currentBalance <= 0) return; // Server hasn't credited starter yet
    // Guard against reinstall on existing account: if the player already has
    // more than the starter amount, they're not a fresh account — skip toast.
    if (currentBalance > STARTER_QUARKS_CLIENT) {
      localStorage.setItem('nebulife_starter_toast_shown', '1');
      return;
    }
    enqueueQuarkToast({ amount: STARTER_QUARKS_CLIENT, reason: 'starter' });
    localStorage.setItem('nebulife_starter_toast_shown', '1');
  } catch { /* ignore */ }
}

/**
 * Daily login bonus — call once on app load. Server is idempotent per UTC day,
 * so multiple calls in the same day return credited=0 and we don't toast.
 * Updates the local quarks balance optimistically (server is source of truth).
 */
async function claimDailyLoginBonusOnce(): Promise<void> {
  try {
    const res = await authFetch('/api/player/login-bonus', { method: 'POST' });
    if (!res.ok) return;
    const data = await res.json() as { credited: number; newBalance: number; streak: number };
    if (data.credited > 0) {
      // Push the new balance into the global quarks state via the same event
      // bus other modules use, then toast it.
      window.dispatchEvent(new CustomEvent('nebulife:quark-balance', { detail: data.newBalance }));
      enqueueQuarkToast({ amount: data.credited, reason: 'daily-login' });
    }
  } catch { /* network error — silent */ }
}

/**
 * Combined destroyed-planet lookup: local (own destruction) + cluster-wide
 * (other players' destructions from server cache). When a neighbor visits
 * a system this player has touched, they see the same planets gone.
 */
function getDestroyedPlanetIdsForSystem(systemId: string): Set<string> | undefined {
  const ids = new Set<string>();
  // Local — instant feedback for own actions
  try {
    const raw = localStorage.getItem('nebulife_destroyed_planets');
    if (raw) {
      const arr = JSON.parse(raw) as Array<{ planetId: string; systemId: string }>;
      for (const d of arr) {
        if (d.systemId === systemId) ids.add(d.planetId);
      }
    }
  } catch { /* ignore */ }
  // Cluster-wide — from server cache (populated when scene was entered)
  for (const id of getDestroyedPlanetIds(systemId)) ids.add(id);
  return ids.size > 0 ? ids : undefined;
}

type CommandModeIconKind = 'surface' | 'terminal' | 'academy' | 'arena';

function CommandModeIcon({
  kind,
  active = false,
  disabled = false,
}: {
  kind: CommandModeIconKind;
  active?: boolean;
  disabled?: boolean;
}) {
  const iconStyle: React.CSSProperties = {
    width: 23,
    height: 21,
    opacity: disabled ? 0.45 : 0.78,
    transform: active ? 'translateY(-1px)' : 'none',
    transition: 'transform 0.22s ease, opacity 0.22s ease',
  };

  return (
    <span
      style={{
        width: '100%',
        minWidth: 0,
        height: 28,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      {kind === 'surface' && (
        <svg style={iconStyle} viewBox="0 0 28 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3 L25 8.8 L14 14.6 L3 8.8 Z" />
          <path d="M3 8.8 V14.2 L14 20 L25 14.2 V8.8" opacity="0.45" />
          <path d="M8.5 10.6 L12 8.4 L15.3 10.3 L19.7 7.9" opacity="0.65" />
          <path d="M14 14.6 V20" opacity="0.35" />
          <circle cx="19.5" cy="7.9" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      )}
      {kind === 'terminal' && (
        <svg style={iconStyle} viewBox="0 0 28 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="20" height="15" rx="2.2" />
          <path d="M8 9 L10.4 11 L8 13" />
          <path d="M13 13 H19" opacity={active ? 0.25 : 0.65} />
          <path d="M13 9 H20" opacity={active ? 0.25 : 0.45} />
          <rect x="18.8" y="12" width="2.8" height="1.8" fill="currentColor" stroke="none" opacity={active ? 1 : 0.75} />
        </svg>
      )}
      {kind === 'academy' && (
        <svg style={iconStyle} viewBox="0 0 28 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 5.5 C8.2 4.2 11.2 4.4 14 6.2 C16.8 4.4 19.8 4.2 23 5.5 V18.5 C19.8 17.2 16.8 17.4 14 19.2 C11.2 17.4 8.2 17.2 5 18.5 Z" />
          <path d="M14 6.2 V19.2" opacity="0.45" />
          <path d="M14 8.9 L15.1 11.1 L17.5 11.5 L15.75 13.1 L16.2 15.4 L14 14.25 L11.8 15.4 L12.25 13.1 L10.5 11.5 L12.9 11.1 Z" fill="currentColor" fillOpacity="0.22" />
        </svg>
      )}
      {kind === 'arena' && (
        <svg style={iconStyle} viewBox="0 0 28 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="14" cy="12" r="7.5" opacity="0.65" />
          <path d="M14 4 V7 M14 17 V20 M6 12 H9 M19 12 H22" opacity="0.55" />
          <path d="M14 8.2 L17.8 16 L14 14.2 L10.2 16 Z" fill="currentColor" fillOpacity="0.16" />
          <path d="M4.5 7.5 C7.2 3.8 12.4 2.7 16.5 4.7" opacity="0.35" />
          <path d="M23.5 16.5 C20.8 20.2 15.6 21.3 11.5 19.3" opacity="0.35" />
        </svg>
      )}
    </span>
  );
}

const LOCAL_ACCOUNT_PREF_KEYS = new Set([
  'nebulife_lang',
  'nebulife_lang_chosen',
  'nebulife_perf_tier',
  'nebulife_perf_tier_chosen',
  'nebulife_ambient_volume',
  'nebulife_ambient_enabled',
  'nebulife_terminal_muted',
]);

function isAccountScopedStorageKey(key: string): boolean {
  if (LOCAL_ACCOUNT_PREF_KEYS.has(key)) return false;
  return key.startsWith('nebulife_') || key.startsWith('harvest_');
}

function hasAccountScopedLocalProgress(): boolean {
  try {
    return Object.keys(localStorage).some(isAccountScopedStorageKey);
  } catch {
    return false;
  }
}

function clearAccountScopedLocalStorage(nextUid?: string): void {
  try {
    Object.keys(localStorage)
      .filter(isAccountScopedStorageKey)
      .forEach((key) => localStorage.removeItem(key));
    if (nextUid) localStorage.setItem('nebulife_last_uid', nextUid);
    else localStorage.removeItem('nebulife_last_uid');
  } catch {
    // localStorage can be unavailable in private/locked-down contexts.
  }
}

function AppInner() {
  const { t, lang, setLanguage } = useT();
  const canvasRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const universeCanvasRef = useRef<HTMLDivElement>(null);
  const universeEngineRef = useRef<UniverseEngine | null>(null);
  const ambientRef = useRef<SpaceAmbient | null>(null);
  const globalPlayerIndexRef = useRef<number>(0);
  const universeGroupCountRef = useRef<number>(1);
  const [universeVisible, setUniverseVisible] = useState(false);
  const [warpActive, setWarpActive] = useState(false);
  const warpTargetRef = useRef<'universe' | 'galaxy' | 'home-intro'>('universe');
  const telescopePhotoRef = useRef<(sys: StarSystem) => void>(() => {});

  // Capture saved navigation state before any useEffect can overwrite them.
  // Engine init() calls showHomePlanetScene() which triggers onSceneChange('home-intro')
  // → persistence useEffect overwrites localStorage with 'home-intro' before
  // the restoration code in init().then() can read it.
  const savedNavSceneRef = useRef(localStorage.getItem('nebulife_scene') || '');
  const savedNavSystemRef = useRef(localStorage.getItem('nebulife_nav_system') || '');
  const savedNavPlanetRef = useRef(localStorage.getItem('nebulife_nav_planet') || '');

  const [state, setState] = useState<GameState>(() => {
    // If onboarding isn't complete yet (new player OR post-signout state),
    // start in 'universe' so the old player's planet/UI doesn't flash through
    // the intro overlay during the first render. CinematicIntro takes over
    // scene control from its onRequestUniverseScene callback.
    const needsIntro = !localStorage.getItem('nebulife_onboarding_done');
    return {
      // Returning players always start from the Star Group. Restoring deep
      // views on boot is disorienting and can hide current progress signals.
      scene: needsIntro ? 'universe' : 'galaxy',
      selectedSystem: null,
      selectedPlanet: null,
      planetClickPos: null,
      showPlanetMenu: false,
      showPlanetInfo: false,
      playerName: 'Explorer',
      error: null,
    };
  });
  const stateRef = useRef<GameState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const [researchState, setResearchState] = useState<ResearchState>(() => {
    // Try to restore research state from localStorage
    try {
      const saved = localStorage.getItem('nebulife_research_state');
      if (saved) {
        const parsed = JSON.parse(saved) as ResearchState;
        // Validate structure minimally
        if (parsed && Array.isArray(parsed.slots) && typeof parsed.systems === 'object') {
          // Migrate: ensure sourcePlanetRing exists on all slots (old saves lack it)
          return {
            ...parsed,
            slots: parsed.slots.map((s) => ({
              ...s,
              sourcePlanetRing: (s.sourcePlanetRing as number | undefined) ?? 0,
            })),
          };
        }
      }
    } catch { /* ignore parse errors */ }
    return createResearchState(HOME_OBSERVATORY_COUNT);
  });

  // Persist research state to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem('nebulife_research_state', JSON.stringify(researchState));
    } catch { /* ignore quota errors */ }
  }, [researchState]);

  // --- Global SpaceAmbient (plays everywhere except surface + terminal) ---
  // User-controllable via PlayerPage settings toggle. Persisted in
  // localStorage. Default: 33% volume. Slider in PlayerPage writes here.
  const [ambientVolume, setAmbientVolumeRaw] = useState<number>(() => {
    try {
      // Prefer the new normalized key
      const raw = localStorage.getItem('nebulife_ambient_volume');
      if (raw !== null) {
        const n = parseFloat(raw);
        if (Number.isFinite(n)) return Math.max(0, Math.min(1, n));
      }
      // Migration: honour the old binary toggle for existing players
      const legacy = localStorage.getItem('nebulife_ambient_enabled');
      if (legacy === '0') return 0;
      return 0.30; // fresh default: 30%
    } catch {
      return 0.30;
    }
  });
  const setAmbientVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setAmbientVolumeRaw(clamped);
    try {
      localStorage.setItem('nebulife_ambient_volume', String(clamped));
    } catch { /* ignore */ }
  }, []);
  // Derived boolean used in scene-reactive / lifecycle effects below.
  const ambientEnabled = ambientVolume > 0;

  // Starts once on App mount. Because this runs before the user has
  // clicked anything, the AudioContext will be suspended; SpaceAmbient
  // attachInteractionFallback handles resume on the first pointer/key.
  useEffect(() => {
    const ambient = new SpaceAmbient();
    ambient.start();
    ambientRef.current = ambient;
    return () => {
      ambientRef.current?.stop();
      ambientRef.current = null;
    };
  }, []);

  // --- Tech Tree State ---
  const [techTreeState, setTechTreeState] = useState<TechTreeState>(() => {
    try {
      const saved = localStorage.getItem('nebulife_tech_tree');
      if (saved) {
        const parsed = JSON.parse(saved) as TechTreeState;
        if (parsed && typeof parsed.researched === 'object') return parsed;
      }
    } catch { /* ignore */ }
    return createTechTreeState();
  });

  useEffect(() => {
    try {
      localStorage.setItem('nebulife_tech_tree', JSON.stringify(techTreeState));
    } catch { /* ignore */ }
  }, [techTreeState]);

  // Persist scene + navigation context to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nebulife_scene', state.scene);
      // Only overwrite nav IDs when they carry real data — avoid erasing
      // saved IDs before engine restoration has a chance to read them.
      if (state.selectedSystem) {
        localStorage.setItem('nebulife_nav_system', state.selectedSystem.id);
      } else if (state.scene === 'home-intro' || state.scene === 'galaxy') {
        localStorage.setItem('nebulife_nav_system', '');
      }
      if (state.selectedPlanet) {
        localStorage.setItem('nebulife_nav_planet', state.selectedPlanet.id);
      } else if (state.scene !== 'planet-view') {
        localStorage.setItem('nebulife_nav_planet', '');
      }
    } catch { /* ignore */ }
  }, [state.scene, state.selectedSystem, state.selectedPlanet]);

  // Completed research modal queue (show one at a time)
  const [completedModalQueue, setCompletedModalQueue] = useState<{
    system: StarSystem;
    research: SystemResearchState;
  }[]>([]);

  // Research toast notifications — shown one at a time, delayed after level-up banner
  const [researchToasts, setResearchToasts] = useState<ResearchToastItem[]>([]);
  const [pendingResearchToasts, setPendingResearchToasts] = useState<ResearchToastItem[]>([]);

  // Harvest fly-to-HUD animation queue
  const [harvestFxQueue, setHarvestFxQueue] = useState<
    Array<{ id: string; type: SurfaceObjectType; sx: number; sy: number }>
  >([]);

  // DOMRects of resource HUD icons for precise fly-to targeting
  const [resourceRects, setResourceRects] = useState<{
    minerals: DOMRect; volatiles: DOMRect; isotopes: DOMRect; water: DOMRect;
  } | null>(null);

  // Timer text per slot
  const [slotTimers, setSlotTimers] = useState<Record<number, string>>({});

  // Intro button visibility (shown immediately)
  const [showExploreBtn, setShowExploreBtn] = useState(true);

  // ── Auth state ─────────────────────────────────────────────────────────
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [bootLoaderDone, setBootLoaderDone] = useState(() => {
    try {
      return localStorage.getItem('nebulife_quantum_seed_seen') === '1'
        || localStorage.getItem('nebulife_onboarding_done') === '1';
    } catch {
      return false;
    }
  });
  const [needsCallsign, setNeedsCallsign] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  // Initialize synchronously from localStorage so needsOnboarding=true is set
  // BEFORE homeInfo arrives, preventing a 0.5s planet flash after reset/first-load.
  // Server auth callbacks will override this if onboarding is already done.
  const [needsOnboarding, setNeedsOnboarding] = useState(
    () => !localStorage.getItem('nebulife_onboarding_done'),
  );
  const [cinematicActive, setCinematicActive] = useState(false);
  const [cinematicVideoPlaying, setCinematicVideoPlaying] = useState(false);
  const [showGuestReminder, setShowGuestReminder] = useState(false);

  useEffect(() => {
    if (bootLoaderDone) return;
    const timer = window.setTimeout(() => setBootLoaderDone(true), MIN_BOOT_LOADER_MS);
    return () => window.clearTimeout(timer);
  }, [bootLoaderDone]);

  useEffect(() => {
    if (!bootLoaderDone) return;
    try { localStorage.setItem('nebulife_quantum_seed_seen', '1'); } catch { /* ignore */ }
  }, [bootLoaderDone]);

  // ── Discovery system state ──────────────────────────────────────────────
  const playerId = useRef<string>('');

  /** Player stats for discovery hook & loyalty mechanics */
  const [playerStats, setPlayerStats] = useState<{ totalCompletedSessions: number; totalDiscoveries: number; lastDiscoverySession: number }>(() => {
    try {
      const saved = localStorage.getItem('nebulife_player_stats');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.totalCompletedSessions === 'number') return { lastDiscoverySession: 0, ...parsed };
      }
    } catch { /* ignore */ }
    return { totalCompletedSessions: 0, totalDiscoveries: 0, lastDiscoverySession: 0 };
  });

  // Persist player stats
  useEffect(() => {
    try { localStorage.setItem('nebulife_player_stats', JSON.stringify(playerStats)); }
    catch { /* ignore */ }
  }, [playerStats]);

  const [observatoryState, setObservatoryState] = useState<ObservatoryState>(() => {
    try {
      const saved = localStorage.getItem('nebulife_observatory_state');
      if (saved) return normalizeObservatoryState(JSON.parse(saved));
    } catch { /* ignore */ }
    return createObservatoryState();
  });
  const observatoryStateRef = useRef<ObservatoryState>(observatoryState);
  observatoryStateRef.current = observatoryState;

  useEffect(() => {
    try { localStorage.setItem('nebulife_observatory_state', JSON.stringify(observatoryState)); }
    catch { /* ignore */ }
  }, [observatoryState]);

  // ── Research Data (scan currency) ──────────────────────────────────────
  const [researchData, setResearchData] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nebulife_research_data');
      if (saved !== null) {
        const n = parseCompactNumber(saved);
        if (n !== null && Number.isFinite(n)) return n;
      }
    } catch { /* ignore */ }
    return INITIAL_RESEARCH_DATA;
  });

  useEffect(() => {
    try { localStorage.setItem('nebulife_research_data', String(researchData)); }
    catch { /* ignore */ }
  }, [researchData]);

  // ── Passive research data regen — 1/hour base rate for ALL players ──────
  useEffect(() => {
    const id = setInterval(() => {
      const techBonus = getEffectValue(techTreeStateRef.current, 'research_data_regen', 0);
      const ratePerMinute = (1 + techBonus) / 60; // base 1/hour + tech bonus
      setResearchData(prev => prev + ratePerMinute); // float directly into state
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Colony Tick State (passive building production) ────────────────────
  const [colonyState, setColonyState] = useState<PlanetColonyState | null>(() => {
    try {
      const saved = localStorage.getItem('nebulife_colony_state');
      if (saved) return JSON.parse(saved) as PlanetColonyState;
    } catch { /* ignore */ }
    return null;
  });
  const colonyStateRef = useRef<PlanetColonyState | null>(null);
  colonyStateRef.current = colonyState;
  // Forward-declared ref so setColonyResources compat wrapper (below) can access homeInfo
  // even though homeInfo useState is declared later in the component body.
  const homeInfoRef = useRef<{ system: StarSystem; planet: Planet } | null>(null);

  useEffect(() => {
    try {
      if (colonyState) localStorage.setItem('nebulife_colony_state', JSON.stringify(colonyState));
    } catch { /* ignore */ }
  }, [colonyState]);

  // ── Per-planet resource storage (Phase 7A+) ───────────────────────────
  // Canonical per-colony resource pool. Key = planet.id.
  // On first hydration: migrates old global `nebulife_colony_resources` onto
  // the home planet so existing players don't lose anything.
  const [colonyResourcesByPlanet, setColonyResourcesByPlanet] = useState<Record<string, { minerals: number; volatiles: number; isotopes: number; water: number }>>(() => {
    try {
      const saved = localStorage.getItem('nebulife_colony_resources_by_planet');
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, { minerals: number; volatiles: number; isotopes: number; water: number }>;
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return {};
  });

  const colonyResourcesByPlanetRef = useRef(colonyResourcesByPlanet);
  colonyResourcesByPlanetRef.current = colonyResourcesByPlanet;

  useEffect(() => {
    try { localStorage.setItem('nebulife_colony_resources_by_planet', JSON.stringify(colonyResourcesByPlanet)); }
    catch { /* ignore quota */ }
  }, [colonyResourcesByPlanet]);

  // ── Planet Resource Stocks (v168 — finite extraction deposits) ──────────
  const [planetResourceStocks, setPlanetResourceStocks] = useState<Record<string, PlanetResourceStocks>>(() => {
    try {
      const saved = localStorage.getItem('nebulife_planet_resource_stocks');
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, PlanetResourceStocks>;
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch { /* ignore */ }
    return {};
  });

  const planetResourceStocksRef = useRef(planetResourceStocks);
  planetResourceStocksRef.current = planetResourceStocks;

  useEffect(() => {
    try { localStorage.setItem('nebulife_planet_resource_stocks', JSON.stringify(planetResourceStocks)); }
    catch { /* ignore quota */ }
  }, [planetResourceStocks]);

  // ── Colony Resources (Phase 2+, after colonization) ───────────────────
  // Derived from colonyResourcesByPlanet (sum of all planets).
  // Kept for backward-compat with Phase 7B migration. Old `nebulife_colony_resources`
  // key is written for any code that reads it directly from localStorage.
  const colonyResources = useMemo((): { minerals: number; volatiles: number; isotopes: number; water: number } => {
    const sum = { minerals: 0, volatiles: 0, isotopes: 0, water: 0 };
    for (const r of Object.values(colonyResourcesByPlanet)) {
      sum.minerals  += r.minerals;
      sum.volatiles += r.volatiles;
      sum.isotopes  += r.isotopes;
      sum.water     += r.water;
    }
    // If per-planet map is empty, fall back to old global localStorage value so
    // players who haven't been migrated yet still see their resources.
    if (Object.keys(colonyResourcesByPlanet).length === 0) {
      try {
        const raw = localStorage.getItem('nebulife_colony_resources');
        if (raw) {
          const parsed = JSON.parse(raw) as { minerals?: number; volatiles?: number; isotopes?: number; water?: number };
          return {
            minerals:  parsed.minerals  ?? 0,
            volatiles: parsed.volatiles ?? 0,
            isotopes:  parsed.isotopes  ?? 150,
            water:     parsed.water     ?? 0,
          };
        }
      } catch { /* ignore */ }
      return { minerals: 0, volatiles: 0, isotopes: 150, water: 0 };
    }
    return sum;
  }, [colonyResourcesByPlanet]);

  useEffect(() => {
    try { localStorage.setItem('nebulife_colony_resources', JSON.stringify(colonyResources)); }
    catch { /* ignore */ }
  }, [colonyResources]);

  // ── Chemical Inventory (element-level tracking, Phase 3+) ──────────────
  const [chemicalInventory, setChemicalInventory] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('nebulife_chemical_inventory');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return {};
  });

  useEffect(() => {
    try { localStorage.setItem('nebulife_chemical_inventory', JSON.stringify(chemicalInventory)); }
    catch { /* ignore */ }
  }, [chemicalInventory]);

  // ── Terraforming state ───────────────────────────────────────────────────
  /** Terraform progress per planet, keyed by planetId. Persisted to localStorage. */
  const [terraformStates, setTerraformStates] = useState<Record<string, PlanetTerraformState>>(() => {
    try {
      const saved = localStorage.getItem('nebulife_terraform_states');
      if (saved) return JSON.parse(saved) as Record<string, PlanetTerraformState>;
    } catch { /* ignore */ }
    return {};
  });

  useEffect(() => {
    try { localStorage.setItem('nebulife_terraform_states', JSON.stringify(terraformStates)); }
    catch { /* ignore quota */ }
  }, [terraformStates]);

  /** Flat array of all terraform delivery missions across all colonies. */
  const [fleet, setFleet] = useState<Mission[]>(() => {
    try {
      const saved = localStorage.getItem('nebulife_fleet');
      if (saved) return JSON.parse(saved) as Mission[];
    } catch { /* ignore */ }
    return [];
  });

  useEffect(() => {
    try { localStorage.setItem('nebulife_fleet', JSON.stringify(fleet)); }
    catch { /* ignore quota */ }
  }, [fleet]);

  /** Canonical reusable ship fleet produced by landing pads and spaceports. */
  const [shipFleet, setShipFleet] = useState<FleetState>(() => {
    try {
      const saved = localStorage.getItem('nebulife_fleet_state');
      if (saved) return JSON.parse(saved) as FleetState;
    } catch { /* ignore */ }
    return createFleetState();
  });

  useEffect(() => {
    try { localStorage.setItem('nebulife_fleet_state', JSON.stringify(shipFleet)); }
    catch { /* ignore quota */ }
  }, [shipFleet]);

  // ── Planet exploration missions ───────────────────────────────────────────
  const [planetRevealLevels, setPlanetRevealLevels] = useState<Record<string, PlanetRevealLevel>>(() => {
    try {
      const saved = localStorage.getItem('nebulife_planet_reveal_levels');
      if (saved) return JSON.parse(saved) as Record<string, PlanetRevealLevel>;
    } catch { /* ignore */ }
    return {};
  });

  const [planetMissions, setPlanetMissions] = useState<Record<string, PlanetMission>>(() => {
    try {
      const saved = localStorage.getItem('nebulife_planet_missions');
      if (saved) return JSON.parse(saved) as Record<string, PlanetMission>;
    } catch { /* ignore */ }
    return {};
  });

  const [planetReports, setPlanetReports] = useState<Record<string, PlanetReportSummary>>(() => {
    try {
      const saved = localStorage.getItem('nebulife_planet_reports');
      if (saved) return JSON.parse(saved) as Record<string, PlanetReportSummary>;
    } catch { /* ignore */ }
    return {};
  });
  const [planetReportTarget, setPlanetReportTarget] = useState<{ planet: Planet; report: PlanetReportSummary } | null>(null);
  const [missionPhotoSaving, setMissionPhotoSaving] = useState(false);
  const [missionAlphaGenerating, setMissionAlphaGenerating] = useState(false);
  const [savedMissionPhotoKeys, setSavedMissionPhotoKeys] = useState<Record<string, boolean>>({});
  const [missionPhotoReveal, setMissionPhotoReveal] = useState<{ imageDataUrl: string; planetName: string; startedAt: number } | null>(null);
  const [missionPhotoViewer, setMissionPhotoViewer] = useState<{ planetName: string; photoUrl: string; photoKey: string; systemId?: string; planetId?: string } | null>(null);

  const [explorationPayloads, setExplorationPayloads] = useState<Partial<Record<ProducibleType, number>>>(() => {
    try {
      const saved = localStorage.getItem('nebulife_exploration_payloads');
      if (saved) return JSON.parse(saved) as Partial<Record<ProducibleType, number>>;
    } catch { /* ignore */ }
    return {};
  });

  const [explorationProductionQueue, setExplorationProductionQueue] = useState<ExplorationPayloadProductionItem[]>(() => {
    try {
      const saved = localStorage.getItem('nebulife_exploration_production_queue');
      if (saved) return JSON.parse(saved) as ExplorationPayloadProductionItem[];
    } catch { /* ignore */ }
    return [];
  });
  const explorationPayloadsRef = useRef(explorationPayloads);
  explorationPayloadsRef.current = explorationPayloads;
  const explorationProductionQueueRef = useRef(explorationProductionQueue);
  explorationProductionQueueRef.current = explorationProductionQueue;

  const [planetMissionClock, setPlanetMissionClock] = useState(() => Date.now());
  const [systemPlanetStatusIconsMode, setSystemPlanetStatusIconsMode] = useState(false);
  const [systemPlanetLabelsMode, setSystemPlanetLabelsMode] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('nebulife_planet_reveal_levels', JSON.stringify(planetRevealLevels)); }
    catch { /* ignore quota */ }
  }, [planetRevealLevels]);

  useEffect(() => {
    try { localStorage.setItem('nebulife_planet_missions', JSON.stringify(planetMissions)); }
    catch { /* ignore quota */ }
  }, [planetMissions]);

  useEffect(() => {
    try { localStorage.setItem('nebulife_planet_reports', JSON.stringify(planetReports)); }
    catch { /* ignore quota */ }
  }, [planetReports]);

  useEffect(() => {
    try { localStorage.setItem('nebulife_exploration_payloads', JSON.stringify(explorationPayloads)); }
    catch { /* ignore quota */ }
    explorationPayloadsRef.current = explorationPayloads;
  }, [explorationPayloads]);

  useEffect(() => {
    try { localStorage.setItem('nebulife_exploration_production_queue', JSON.stringify(explorationProductionQueue)); }
    catch { /* ignore quota */ }
    explorationProductionQueueRef.current = explorationProductionQueue;
  }, [explorationProductionQueue]);

  // ── Planet overrides — type/habitability mutations after terraform (Phase 7C) ──
  /** Keyed by planetId.  Persisted to localStorage and synced via game_state JSONB. */
  const [planetOverrides, setPlanetOverrides] = useState<Record<string, PlanetOverride>>(() => {
    try {
      const saved = localStorage.getItem('nebulife_planet_overrides');
      if (saved) return JSON.parse(saved) as Record<string, PlanetOverride>;
    } catch { /* ignore */ }
    return {};
  });

  useEffect(() => {
    try { localStorage.setItem('nebulife_planet_overrides', JSON.stringify(planetOverrides)); }
    catch { /* ignore quota */ }
  }, [planetOverrides]);

  /** Planet that just completed terraforming — Phase 7D will render the completion cutscene. */
  const [pendingTerraformCompletion, setPendingTerraformCompletion] = useState<Planet | null>(null);

  // ── Per-planet resource helpers (Phase 7A) ────────────────────────────

  /** Get resources for a specific planet. Returns empty defaults if not yet populated. */
  const getResources = useCallback((planetId: string): { minerals: number; volatiles: number; isotopes: number; water: number } => {
    return colonyResourcesByPlanetRef.current[planetId] ?? { minerals: 0, volatiles: 0, isotopes: 0, water: 0 };
  }, []);

  const getStorageCapacityForPlanet = useCallback((planetId: string): number => {
    const currentSurfacePlanetId = surfaceTargetRef.current?.planet.id;
    if (currentSurfacePlanetId === planetId) {
      try {
        const raw = localStorage.getItem('nebulife_hex_slots');
        if (raw) {
          const slots = JSON.parse(raw) as { id: string; ring: number; index: number; state: string; buildingType?: string; buildingLevel?: number }[];
          const liveBuildings: PlacedBuilding[] = slots
            .filter((slot) => slot.state === 'building' && slot.buildingType)
            .map((slot) => ({
              id: `${playerId.current}-${slot.id}-${slot.buildingType}`,
              type: slot.buildingType as BuildingType,
              x: slot.index,
              y: slot.ring,
              level: slot.buildingLevel ?? 1,
              builtAt: new Date().toISOString(),
              shutdown: colonyStateRef.current?.buildings.find((building) => building.type === slot.buildingType)?.shutdown,
            }));
          return computeResourceStorageCapacity(liveBuildings);
        }
      } catch { /* ignore malformed local surface cache */ }
    }

    const colony = colonyStateRef.current;
    if (colony?.planetId === planetId) {
      return computeResourceStorageCapacity(colony.buildings);
    }
    return BASE_RESOURCE_STORAGE_CAPACITY;
  }, []);

  /** Add (or subtract with negative values) resources for a specific planet. Clamps to 0. */
  const addResources = useCallback((planetId: string, delta: Partial<{ minerals: number; volatiles: number; isotopes: number; water: number }>) => {
    setColonyResourcesByPlanet(prev => {
      const cur = prev[planetId] ?? { minerals: 0, volatiles: 0, isotopes: 0, water: 0 };
      const capacity = getStorageCapacityForPlanet(planetId);
      return {
        ...prev,
        [planetId]: {
          minerals:  Math.min(capacity, Math.max(0, cur.minerals  + (delta.minerals  ?? 0))),
          volatiles: Math.min(capacity, Math.max(0, cur.volatiles + (delta.volatiles ?? 0))),
          isotopes:  Math.min(capacity, Math.max(0, cur.isotopes  + (delta.isotopes  ?? 0))),
          water:     Math.min(capacity, Math.max(0, cur.water     + (delta.water     ?? 0))),
        },
      };
    });
  }, [getStorageCapacityForPlanet]);

  /** Spend from the shared colony pool, preferring the active planet first. */
  const spendResourcesAcrossPlanets = useCallback((
    preferredPlanetId: string,
    delta: Partial<{ minerals: number; volatiles: number; isotopes: number; water: number }>,
  ) => {
    const keys = ['minerals', 'volatiles', 'isotopes', 'water'] as const;
    setColonyResourcesByPlanet(prev => {
      const next = { ...prev };
      for (const key of keys) {
        let remaining = Math.max(0, -(delta[key] ?? 0));
        if (remaining <= 0) continue;

        const spendFrom = (planetId: string) => {
          if (remaining <= 0) return;
          const cur = next[planetId] ?? { minerals: 0, volatiles: 0, isotopes: 0, water: 0 };
          const available = Math.max(0, cur[key] ?? 0);
          const spent = Math.min(available, remaining);
          if (spent <= 0) return;
          next[planetId] = { ...cur, [key]: available - spent };
          remaining -= spent;
        };

        spendFrom(preferredPlanetId);
        for (const planetId of Object.keys(next)) {
          if (planetId !== preferredPlanetId) spendFrom(planetId);
        }
      }
      return next;
    });
  }, []);

  /** Sum resources across all planet stores. */
  const totalResources = useCallback((): { minerals: number; volatiles: number; isotopes: number; water: number } => {
    const sum = { minerals: 0, volatiles: 0, isotopes: 0, water: 0 };
    for (const r of Object.values(colonyResourcesByPlanetRef.current)) {
      sum.minerals  += r.minerals;
      sum.volatiles += r.volatiles;
      sum.isotopes  += r.isotopes;
      sum.water     += r.water;
    }
    return sum;
  }, []);

  const ensureHomePlanetStockFloor = useCallback((planet: Planet): void => {
    setPlanetResourceStocks((prev) => {
      const current = prev[planet.id] ?? generatePlanetStocks(planet);
      const next: PlanetResourceStocks = {
        initial: {
          minerals: Math.max(current.initial.minerals, HOME_PLANET_STOCK_FLOOR.minerals),
          volatiles: Math.max(current.initial.volatiles, HOME_PLANET_STOCK_FLOOR.volatiles),
          isotopes: Math.max(current.initial.isotopes, HOME_PLANET_STOCK_FLOOR.isotopes),
          water: Math.max(current.initial.water, HOME_PLANET_STOCK_FLOOR.water),
        },
        remaining: {
          minerals: Math.max(current.remaining.minerals, HOME_PLANET_STOCK_FLOOR.minerals),
          volatiles: Math.max(current.remaining.volatiles, HOME_PLANET_STOCK_FLOOR.volatiles),
          isotopes: Math.max(current.remaining.isotopes, HOME_PLANET_STOCK_FLOOR.isotopes),
          water: Math.max(current.remaining.water, HOME_PLANET_STOCK_FLOOR.water),
        },
      };
      return { ...prev, [planet.id]: next };
    });
  }, []);

  /** Returns the existing terraform state for a planet, or initialises one from the planet's params. */
  const getTerraformState = useCallback((planet: Planet): PlanetTerraformState => {
    return terraformStates[planet.id] ?? getInitialTerraformState(planet);
  }, [terraformStates]);

  /** Returns the active (non-idle) mission for a given planet + param, or null. */
  const getActiveMissionForParam = useCallback(
    (targetPlanetId: string, paramId: TerraformParamId): Mission | null => {
      return fleet.find(
        (m) => m.targetPlanetId === targetPlanetId && m.paramId === paramId && m.phase !== 'idle',
      ) ?? null;
    },
    [fleet],
  );

  /** Handle element inventory changes (from hex harvest or chemistry buildings) */
  const handleElementChange = useCallback((delta: Record<string, number>) => {
    setChemicalInventory(prev => {
      const next = { ...prev };
      for (const [el, amount] of Object.entries(delta)) {
        next[el] = Math.max(0, (next[el] ?? 0) + amount);
      }
      return next;
    });
  }, []);

  // ── Exodus phase flag ──────────────────────────────────────────────────
  const [isExodusPhase, setIsExodusPhase] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('nebulife_exodus_phase');
      if (saved !== null) return saved === 'true';
    } catch { /* ignore */ }
    return true; // starts in exodus
  });

  useEffect(() => {
    try { localStorage.setItem('nebulife_exodus_phase', String(isExodusPhase)); }
    catch { /* ignore */ }
  }, [isExodusPhase]);

  // ── Player Level / XP ───────────────────────────────────────────────
  const [playerLevel, setPlayerLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nebulife_player_level');
      if (saved !== null) { const n = parseInt(saved, 10); if (n > 0) return n; }
    } catch { /* ignore */ }
    return 1;
  });
  const playerLevelRef = useRef(playerLevel);
  playerLevelRef.current = playerLevel;

  const [playerXP, setPlayerXP] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nebulife_player_xp');
      if (saved !== null) { const n = parseCompactNumber(saved); if (n !== null && n >= 0) return n; }
    } catch { /* ignore */ }
    return 0;
  });

  const [levelUpNotification, setLevelUpNotification] = useState<number | null>(null);
  // Queue of pending level-up levels (shown one at a time, no overlap with major modals)
  const [levelUpQueue, setLevelUpQueue] = useState<number[]>([]);
  // Exit confirmation dialog (Android back button at root level)
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const gameStateRef = useRef<Record<string, unknown>>({});
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncGameStateRef = useRef<() => void>(() => {});
  /** True after server game state has been hydrated — prevents premature local fallbacks */
  const [serverHydrated, setServerHydrated] = useState(false);
  const serverHydratedRef = useRef(false);
  /** Ref mirror for surfaceTarget — used in intervals with empty deps to pause during surface view */
  const surfaceTargetRef = useRef<{ planet: Planet; star: Star } | null>(null);
  /** Retains last known planet context so colony tick can run passively even when surface is closed */
  const colonyPlanetRef = useRef<{ planet: Planet; star: Star } | null>(null);
  const awardXPRef = useRef<(amount: number, reason: string) => void>(() => {});
  /** Stable reference to awardXP that can be used in callbacks defined before the actual implementation. */
  const awardXP = useCallback((amount: number, reason: string) => {
    awardXPRef.current(amount, reason);
  }, []);

  /**
   * Backward-compat setter for colonyResources (Phase 7A bridge).
   * Routes to the per-planet store keyed by the currently active surface planet
   * (surfaceTargetRef) or the home planet (homeInfoRef).
   * Phase 7B will migrate all call-sites to addResources(planetId, delta) directly.
   */
  const setColonyResources = useCallback(
    (updater: ((prev: { minerals: number; volatiles: number; isotopes: number; water: number }) => { minerals: number; volatiles: number; isotopes: number; water: number }) | { minerals: number; volatiles: number; isotopes: number; water: number }) => {
      const targetId = surfaceTargetRef.current?.planet.id ?? homeInfoRef.current?.planet.id;
      if (!targetId) return;
      const cur = colonyResourcesByPlanetRef.current[targetId] ?? { minerals: 0, volatiles: 0, isotopes: 0, water: 0 };
      const next = typeof updater === 'function' ? updater(cur) : updater;
      setColonyResourcesByPlanet(prev => ({ ...prev, [targetId]: clampResourceBundle(next, getStorageCapacityForPlanet(targetId)) }));
    },
    [getStorageCapacityForPlanet],
  );

  /**
   * Surface harvest FX + type-based XP callback (v169).
   *
   * Resource addition and planet stock depletion have been moved to
   * handleHarvestFull which receives the actual rarity-based yield amount.
   * This callback now only awards fixed type-based XP for differentiated
   * harvest bonuses (tree/ore/vent).
   *
   * Note: onHarvestAmount (wired inline) also awards XP = actual yield amount.
   */
  const handleHarvest = useCallback((objectType: SurfaceObjectType) => {
    const xpKey = objectType === 'tree' ? 'HARVEST_TREE'
                : objectType === 'ore' ? 'HARVEST_ORE'
                : 'HARVEST_VENT';
    awardXP(XP_REWARDS[xpKey], `harvest_${objectType}`);
  }, [awardXP]);

  /**
   * Authoritative hex-surface harvest handler (v169 single path).
   *
   * Receives the actual rarity-based yield amount from HexSurface (via the
   * onHarvestFull callback) instead of the fixed HARVEST_YIELD base value.
   *
   * This is the ONLY path that adds resources and depletes planet stocks
   * for hex harvests.  The old onResourceChange path in useHexState has been
   * removed to prevent double-counting.
   */
  const handleHarvestFull = useCallback((objectType: SurfaceObjectType, amount: number) => {
    const yield_ = HARVEST_YIELD[objectType];
    const key = yield_.group === 'mineral' ? 'minerals' as const
              : yield_.group === 'volatile' ? 'volatiles' as const
              : yield_.group === 'water' ? 'water' as const
              : 'isotopes' as const;
    const planetId = surfaceTargetRef.current?.planet.id ?? homeInfoRef.current?.planet.id;

    const stockKey: 'minerals' | 'volatiles' | 'isotopes' | 'water' =
      objectType === 'ore' ? 'minerals'
      : objectType === 'vent' ? 'volatiles'
      : objectType === 'tree' ? 'isotopes'
      : 'water';

    let actualAmount: number = amount;
    let depleted = false;
    if (planetId) {
      const capacity = getStorageCapacityForPlanet(planetId);
      const current = getResources(planetId)[key];
      const freeSpace = Math.max(0, capacity - current);
      if (freeSpace <= 0) {
        setToastMessage(t('hex.storage_full_warning'));
        setTimeout(() => setToastMessage(null), 2200);
        return { actualAmount: 0, depleted: false };
      }
      actualAmount = Math.min(actualAmount, freeSpace);
      const stocks = planetResourceStocksRef.current[planetId];
      if (stocks) {
        const { newStocks, actualExtracted } = depleteStock(stocks, stockKey, actualAmount);
        actualAmount = actualExtracted;
        depleted = newStocks.remaining[stockKey] <= 0.0001;
        setPlanetResourceStocks(prev => ({ ...prev, [planetId]: newStocks }));
      }
      addResources(planetId, { [key]: actualAmount });
    }
    return { actualAmount, depleted };
  }, [addResources, getResources, getStorageCapacityForPlanet, t]);

  /** Handle fly-to-HUD animation for harvested resource. */
  const handleHarvestFx = useCallback((type: SurfaceObjectType, sx: number, sy: number) => {
    const id = Math.random().toString(36).slice(2);
    setHarvestFxQueue((q) => [...q, { id, type, sx, sy }]);
    setTimeout(() => setHarvestFxQueue((q) => q.filter((x) => x.id !== id)), 900);
  }, []);

  /** Schedule a debounced game state sync to server (1.5s delay; was 5s).
   *  Critical events (research completion, evacuation) call syncNowToServer instead. */
  const scheduleSyncToServer = useCallback(() => {
    if (isFirebaseConfigured && !serverHydratedRef.current) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      syncGameStateRef.current();
    }, 1500);
  }, []);

  /** Immediate sync — bypasses debounce. Used after critical state changes
   *  so research progress / evacuations survive an immediate APK kill. */
  const syncNowToServer = useCallback(() => {
    if (isFirebaseConfigured && !serverHydratedRef.current) return;
    if (syncTimeoutRef.current) { clearTimeout(syncTimeoutRef.current); syncTimeoutRef.current = null; }
    syncGameStateRef.current();
  }, []);

  useEffect(() => {
    try { localStorage.setItem('nebulife_player_level', String(playerLevel)); }
    catch { /* ignore */ }
  }, [playerLevel]);

  useEffect(() => {
    try { localStorage.setItem('nebulife_player_xp', String(playerXP)); }
    catch { /* ignore */ }
  }, [playerXP]);

  // ── Doomsday Clock — game-time countdown ─────────────────────────────
  // Real 1 hour = Game 24 hours. 1 real second = 24 game seconds.
  // Seconds tick 24x faster, creating visual panic.
  // After finding habitable planet: multiplier doubles to 48x.
  const [gameStartedAt, setGameStartedAt] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('nebulife_game_started_at');
      if (saved) return parseInt(saved, 10);
    } catch { /* ignore */ }
    // Do NOT create timestamp here — wait until onboarding completes
    return null;
  });

  const impactTime = useMemo(() => gameStartedAt !== null ? calculateImpactTime(gameStartedAt) : null, [gameStartedAt]);

  // Time multiplier: BASE_TIME_MULTIPLIER (24) normally, doubled (48) after finding habitable
  const [timeMultiplier, setTimeMultiplier] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nebulife_time_multiplier');
      if (saved) return parseFloat(saved);
    } catch { /* ignore */ }
    return BASE_TIME_MULTIPLIER;
  });
  // Snapshot: real timestamp when multiplier changed
  const [accelAt, setAccelAt] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('nebulife_accel_at');
      if (saved) return parseInt(saved, 10);
    } catch { /* ignore */ }
    return null;
  });
  // Snapshot: game-seconds already consumed at moment of acceleration
  const [gameTimeAtAccel, setGameTimeAtAccel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nebulife_game_time_at_accel');
      if (saved) return parseFloat(saved);
    } catch { /* ignore */ }
    return 0;
  });

  // Countdown text + urgent flag are no longer React state — <LiveCountdown>
  // inside <ResourceDisplay> self-updates the DOM via ref.

  // Clock appearance state machine
  type ClockPhase = 'hidden' | 'syncing' | 'glitch' | 'visible';
  const [clockPhase, setClockPhase] = useState<ClockPhase>(() => {
    try {
      const done = localStorage.getItem('nebulife_clock_revealed');
      if (done === '1') return 'visible';
    } catch { /* ignore */ }
    return 'hidden';
  });

  // Evacuation phase (declared early so tick effect can reference it)
  type EvacuationPhase =
    | 'idle'
    | 'stage0-launch'          // CutsceneVideo: evac-launch.mp4
    | 'stage1-system-flight'   // SystemScene + ship Bezier flight to planet
    | 'stage2-explosion'       // CutsceneVideo: evac-explosion.mp4
    | 'stage3-planet-approach' // PlanetViewScene + ship from edge to orbit
    | 'stage4-orbit'           // Ship on orbit + colony founding button
    | 'cutscene-landing'       // CutsceneVideo: evac-landing.mp4
    | 'surface';               // Surface view on new planet
  const [evacuationPhase, setEvacuationPhase] = useState<EvacuationPhase>(() => {
    try {
      const saved = localStorage.getItem('nebulife_evac_phase');
      if (saved && saved !== 'idle') return saved as EvacuationPhase;
    } catch { /* ignore */ }
    return 'idle';
  });

  // Doomsday-clock ticking is now handled by <LiveCountdown> inside
  // ResourceDisplay — it self-updates via ref at 24Hz without re-rendering
  // any React component. App used to fire 24 setState calls/sec here,
  // cascading into a full ~6000-line App re-render; that was the single
  // biggest React-side hotspot on low-end Android.

  // Timer expired — force evacuation if no target found yet
  // (the actual useEffect is placed after homeInfo declaration below)

  // Speed-up twist modal state
  const [showSpeedUpTwist, setShowSpeedUpTwist] = useState(false);
  const speedUpAppliedRef = useRef(accelAt !== null);

  /** Activate the speed-up twist (called when finding habitable planet during research) */
  const activateSpeedUp = useCallback(() => {
    if (speedUpAppliedRef.current) return;
    speedUpAppliedRef.current = true;
    // Pause timer and show twist modal
    setShowSpeedUpTwist(true);
  }, []);

  /** Called when twist modal is dismissed — apply the 2x acceleration */
  const handleSpeedUpDismiss = useCallback(() => {
    if (gameStartedAt === null) return;
    setShowSpeedUpTwist(false);
    const now = Date.now();
    const consumed = gameSecondsElapsed(gameStartedAt, now, timeMultiplier);
    const newMultiplier = BASE_TIME_MULTIPLIER * 2; // 48x
    setAccelAt(now);
    setGameTimeAtAccel(consumed);
    setTimeMultiplier(newMultiplier);
    try {
      localStorage.setItem('nebulife_time_multiplier', String(newMultiplier));
      localStorage.setItem('nebulife_accel_at', String(now));
      localStorage.setItem('nebulife_game_time_at_accel', String(consumed));
    } catch { /* ignore */ }
  }, [gameStartedAt, timeMultiplier]);

  // ── Evacuation state ──────────────────────────────────────────────────
  // (EvacuationPhase type + evacuationPhase state declared above, before tick effect)
  const [evacuationTarget, setEvacuationTarget] = useState<{ system: StarSystem; planet: Planet } | null>(null);
  const [evacuationFadeBlack, setEvacuationFadeBlack] = useState(false);
  /** True when evacuation was triggered by timer expiration (not by finding a planet) */
  const [forcedEvacuation, setForcedEvacuation] = useState(false);
  /** True when user dismissed the evacuation prompt (can reopen from timer button) */
  const [evacuationPromptDismissed, setEvacuationPromptDismissed] = useState(false);

  // Refs for values needed inside research-timer interval (stale-closure prevention)
  const isExodusPhaseRef = useRef(isExodusPhase);
  isExodusPhaseRef.current = isExodusPhase;
  const evacuationTargetRef = useRef(evacuationTarget);
  evacuationTargetRef.current = evacuationTarget;

  // Pending evacuation data from server hydration (resolved once engine is ready)
  const pendingEvacRef = useRef<{ systemId: string; planetId: string; forced: boolean } | null>(null);

  // Pending home planet data from server hydration (resolved once engine is ready)
  const pendingHomeRef = useRef<{ systemId: string; planetId: string } | null>(null);

  // Persist evacuation target to localStorage
  useEffect(() => {
    try {
      if (evacuationTarget) {
        localStorage.setItem('nebulife_evac_system_id', evacuationTarget.system.id);
        localStorage.setItem('nebulife_evac_planet_id', evacuationTarget.planet.id);
        localStorage.setItem('nebulife_evac_forced', String(forcedEvacuation));
      } else {
        localStorage.removeItem('nebulife_evac_system_id');
        localStorage.removeItem('nebulife_evac_planet_id');
        localStorage.removeItem('nebulife_evac_forced');
      }
    } catch { /* ignore */ }
  }, [evacuationTarget, forcedEvacuation]);

  // Persist evacuationPhase to localStorage (for reload recovery)
  useEffect(() => {
    try { localStorage.setItem('nebulife_evac_phase', evacuationPhase); }
    catch { /* ignore */ }
  }, [evacuationPhase]);

  const techTreeStateRef = useRef(techTreeState);
  techTreeStateRef.current = techTreeState;

  /** Discovery choice panel queue (show one at a time) — persisted to localStorage */
  const [discoveryQueue, setDiscoveryQueue] = useState<{
    discovery: Discovery;
    system: StarSystem;
  }[]>(() => {
    try {
      const saved = localStorage.getItem('nebulife_discovery_queue');
      if (saved) {
        const parsed = JSON.parse(saved) as { discovery: Discovery; system: StarSystem }[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return [];
  });

  /** Persist discoveryQueue to localStorage so it survives page reloads */
  useEffect(() => {
    try {
      if (discoveryQueue.length > 0) {
        localStorage.setItem('nebulife_discovery_queue', JSON.stringify(discoveryQueue));
      } else {
        localStorage.removeItem('nebulife_discovery_queue');
      }
    } catch { /* ignore */ }
  }, [discoveryQueue]);

  /** Popup queue gate — true while telemetry/observatory is active; cleared with delay after close */
  const [popupQueueBlocked, setPopupQueueBlocked] = useState(false);
  const [arenaPopupGate, setArenaPopupGate] = useState(false);
  const popupBlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Schedule unblock: blocked immediately → unblocked after delayMs (5s for save, 2s for close) */
  const unblockPopupQueue = useCallback((delayMs: number) => {
    if (popupBlockTimerRef.current) clearTimeout(popupBlockTimerRef.current);
    setPopupQueueBlocked(true);
    popupBlockTimerRef.current = setTimeout(() => setPopupQueueBlocked(false), delayMs);
  }, []);

  /** Observatory view (when player clicks "Quantum Focus") */
  const [observatoryTarget, setObservatoryTarget] = useState<{
    discovery: Discovery;
    system: StarSystem;
    cost: number;
    adPhotoToken?: string;
  } | null>(null);

  /** Telemetry view (when player clicks "Basic Telemetry") */
  const [telemetryTarget, setTelemetryTarget] = useState<{
    discovery: Discovery;
    system: StarSystem;
  } | null>(null);

  /**
   * Derived: first pending discovery.
   * Blocked when: telemetry/observatory active, completedModal active, popup queue gated,
   * cinematic intro playing, or initial onboarding active.
   * pendingDiscovery has higher priority than completedModal (anomaly before evacuation blocks
   * research-complete modals until the player acknowledges the discovery).
   */
  const pendingDiscovery = discoveryQueue.length > 0
    && completedModalQueue.length === 0
    && !telemetryTarget
    && !observatoryTarget
    && !popupQueueBlocked
    && !arenaPopupGate
    && !needsOnboarding
    && !cinematicVideoPlaying
    ? discoveryQueue[0] : null;

  /**
   * Derived: first completed-research modal.
   * Blocked when: telemetry/observatory active, popup queue gated, or a discovery is pending.
   */
  const completedModal = completedModalQueue.length > 0
    && !telemetryTarget
    && !observatoryTarget
    && !pendingDiscovery
    && !popupQueueBlocked
    && !arenaPopupGate
    ? completedModalQueue[0] : null;

  /**
   * Dequeue level-up notifications one at a time.
   * Only show when no major modals are blocking (telemetry, observatory, discovery, completedModal).
   */
  useEffect(() => {
    if (levelUpNotification !== null) return; // Already showing one
    if (levelUpQueue.length === 0) return;
    if (telemetryTarget || observatoryTarget || pendingDiscovery || completedModal || popupQueueBlocked || arenaPopupGate) return;
    const [next, ...rest] = levelUpQueue;
    setLevelUpNotification(next);
    setLevelUpQueue(rest);
  }, [levelUpNotification, levelUpQueue, telemetryTarget, observatoryTarget, pendingDiscovery, completedModal, popupQueueBlocked, arenaPopupGate]);

  // Flush pending research toasts one at a time.
  // Wait until level-up banner is fully dismissed, then show first pending toast.
  // Subsequent toasts appear after the current one is dismissed.
  useEffect(() => {
    if (pendingResearchToasts.length === 0) return;
    if (researchToasts.length > 0) return; // current toast still visible — wait
    if (levelUpNotification !== null) return; // level-up banner still visible — wait
    if (levelUpQueue.length > 0) return; // level-up banner about to show — wait
    if (arenaPopupGate) return; // never slide game popups over the arena

    const timer = setTimeout(() => {
      setPendingResearchToasts((pending) => {
        if (pending.length === 0) return pending;
        const [first, ...rest] = pending;
        setResearchToasts((q) => [...q, first]);
        return rest;
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [pendingResearchToasts, researchToasts, levelUpNotification, levelUpQueue, arenaPopupGate]);

  /** Gallery: map object_type → existing DiscoveryData (with photo) for duplicate check */
  const [galleryMap, setGalleryMap] = useState<Map<string, DiscoveryData>>(new Map());

  /** Gallery compare modal state (when trying to save to an occupied cell) */
  const [galleryCompare, setGalleryCompare] = useState<{
    newDiscovery: Discovery;
    newImageUrl: string;
    existingData: DiscoveryData;
  } | null>(null);

  // ── Globe view ref ──────────────────────────────────────────────────────
  const globeRef = useRef<PlanetGlobeViewHandle>(null);

  // ── Home planet info (for navigation from home page) ──────────────
  const [homeInfo, setHomeInfo] = useState<{ system: StarSystem; planet: Planet } | null>(null);
  // homeInfoRef is forward-declared above (near colonyStateRef) so that setColonyResources
  // compat wrapper can reference it before this useState is declared.
  homeInfoRef.current = homeInfo;

  // ── Backwards-compat migration: seed colonyResourcesByPlanet from old global (Phase 7A) ──
  // Fires once when homeInfo first becomes available. If the per-planet map is empty
  // (new key not yet written) but the old global `nebulife_colony_resources` exists,
  // migrate it onto the home planet so existing players don't lose their resources.
  useEffect(() => {
    if (!homeInfo) return;
    if (Object.keys(colonyResourcesByPlanet).length > 0) return; // already migrated
    try {
      const raw = localStorage.getItem('nebulife_colony_resources');
      if (!raw) return;
      const parsed = JSON.parse(raw) as { minerals?: number; volatiles?: number; isotopes?: number; water?: number };
      if (!parsed || typeof parsed !== 'object') return;
      const migrated = {
        minerals:  parsed.minerals  ?? 0,
        volatiles: parsed.volatiles ?? 0,
        isotopes:  parsed.isotopes  ?? 0,
        water:     parsed.water     ?? 0,
      };
      // Only migrate if there's actually something to migrate
      if (migrated.minerals + migrated.volatiles + migrated.isotopes + migrated.water > 0) {
        setColonyResourcesByPlanet({ [homeInfo.planet.id]: migrated });
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeInfo?.planet.id]); // run only when home planet first becomes known

  useEffect(() => {
    if (!homeInfo || isExodusPhase) return;
    const flag = `nebulife_home_resource_floor_${homeInfo.planet.id}`;
    try {
      if (localStorage.getItem(flag) === '1') return;
    } catch { /* ignore */ }

    ensureHomePlanetStockFloor(homeInfo.planet);
    setColonyResourcesByPlanet((prev) => {
      const existing = prev[homeInfo.planet.id] ?? { minerals: 0, volatiles: 0, isotopes: 0, water: 0 };
      return {
        ...prev,
        [homeInfo.planet.id]: {
          minerals: Math.max(existing.minerals, POST_EVACUATION_RESOURCE_RESERVE.minerals),
          volatiles: Math.max(existing.volatiles, POST_EVACUATION_RESOURCE_RESERVE.volatiles),
          isotopes: Math.max(existing.isotopes, POST_EVACUATION_RESOURCE_RESERVE.isotopes),
          water: Math.max(existing.water, POST_EVACUATION_RESOURCE_RESERVE.water),
        },
      };
    });
    try { localStorage.setItem(flag, '1'); } catch { /* ignore */ }
  }, [ensureHomePlanetStockFloor, homeInfo, isExodusPhase]);

  // Home system is always researched by default (player's own star system).
  // This effect ensures it stays researched even after server hydration overwrites state.
  useEffect(() => {
    if (!homeInfo) return;
    const sysId = homeInfo.system.id;
    if (researchState.systems[sysId]?.isComplete) return;
    setResearchState((prev) => {
      if (prev.systems[sysId]?.isComplete) return prev;
      return completeSystemResearchInstantly(prev, homeInfo.system);
    });
  }, [homeInfo, researchState]);

  // Safety net: after colonization, ensure at least 1 observatory slot exists (colony hub built-in).
  // Handles race condition where server hydration may overwrite slots to [] or state corruption.
  useEffect(() => {
    if (!isExodusPhase && researchState.slots.length === 0) {
      // Recovery fallback when slots accidentally vanish (race between
      // sign-in clear + server hydration). Restore the FULL home observatory
      // count (3) instead of a single slot — single-slot was leaving players
      // with 0/1 displayed after re-login, instead of the expected 0/3.
      // Evacuation phase intentionally sets 1 slot elsewhere; that path is
      // gated by isExodusPhase above and is unaffected.
      setResearchState((prev) => {
        if (prev.slots.length > 0) return prev;
        return {
          ...prev,
          slots: Array.from({ length: HOME_OBSERVATORY_COUNT }, (_, i) => ({
            slotIndex: i,
            systemId: null,
            startedAt: null,
            sourcePlanetRing: 0,
          })),
        };
      });
    }
  }, [isExodusPhase, researchState.slots.length]);

  // Resolve pending evacuation target from server data once engine is ready.
  // Handles the race condition where engine init ran before hydration wrote evac IDs to localStorage.
  useEffect(() => {
    const pending = pendingEvacRef.current;
    if (!pending || evacuationTarget || !homeInfo) return;
    const engine = engineRef.current;
    if (!engine) return;
    const allSystems = engine.getAllSystems();
    const sys = allSystems.find(s => s.id === pending.systemId);
    const planet = sys?.planets.find(p => p.id === pending.planetId);
    if (sys && planet) {
      setEvacuationTarget({ system: sys, planet });
      setForcedEvacuation(pending.forced);
      pendingEvacRef.current = null;
    }
  }, [homeInfo, evacuationTarget, serverHydrated]);

  // Resolve pending home planet from server data once engine is ready.
  // Handles cross-device sync: server has updated home_system_id/home_planet_id after evacuation,
  // but engine may have initialized from stale localStorage before hydration ran.
  useEffect(() => {
    const pending = pendingHomeRef.current;
    if (!pending || !serverHydrated || !homeInfo) return;
    const engine = engineRef.current;
    if (!engine) return;
    const allSystems = engine.getAllSystems();
    const sys = allSystems.find(s => s.id === pending.systemId);
    const planet = sys?.planets.find(p => p.id === pending.planetId);
    if (sys && planet) {
      engine.updateHomeSystem(pending.systemId, pending.planetId);
      setHomeInfo({ system: sys, planet });
      // Keep colonyPlanetRef in sync when home planet changes (cross-device evacuation sync).
      // Only update if the player hasn't opened the surface yet (surfaceTarget takes priority).
      if (!surfaceTargetRef.current) {
        colonyPlanetRef.current = { planet, star: sys.star };
      }
      pendingHomeRef.current = null;
    }
  }, [serverHydrated, homeInfo]);

  // ── Apply planet overrides onto engine in-memory systems (Phase 7C) ─────────
  // Runs whenever planetOverrides or homeInfo changes (homeInfo signals engine ready).
  // Traverses all systems and patches planets whose id appears in planetOverrides.
  useEffect(() => {
    if (!homeInfo || !engineRef.current) return;
    if (Object.keys(planetOverrides).length === 0) return;
    const systems = engineRef.current.getAllSystems();
    for (const sys of systems) {
      for (let i = 0; i < sys.planets.length; i++) {
        const override = planetOverrides[sys.planets[i].id];
        if (override) {
          sys.planets[i] = {
            ...sys.planets[i],
            type: override.type,
            terraformDifficulty: override.terraformDifficulty,
            habitability: override.habitability,
            // Apply custom name if player renamed the planet
            ...(override.customName ? { name: override.customName } : {}),
          };
        }
      }
    }
  }, [planetOverrides, homeInfo]); // homeInfo signals engine has finished loading systems

  // Timer expired — force evacuation if no target found yet
  const timerExpiredHandledRef = useRef(false);
  useEffect(() => {
    if (!isExodusPhase || clockPhase !== 'visible' || timerExpiredHandledRef.current || gameStartedAt === null || evacuationPhase !== 'idle') return;
    const startedAt = gameStartedAt; // narrowed to number
    const checkExpired = () => {
      const gameSecs = remainingGameSeconds(
        startedAt, Date.now(), timeMultiplier, accelAt, gameTimeAtAccel,
      );
      if (gameSecs > 0) return; // Not expired yet
      if (evacuationTargetRef.current) return; // Already have a target
      if (timerExpiredHandledRef.current) return; // Already triggered

      // Time's up — ALWAYS evacuate to the paradise planet in Ring 1
      // Wait for engine to be ready (don't mark handled yet — retry next tick if needed)
      const engine = engineRef.current;
      if (!engine) return;
      const allSystems = engine.getAllSystems();

      // Find the paradise planet (isColonizable === true, the only one)
      const target = findParadisePlanet(allSystems);

      if (target) {
        // Mark handled ONLY after successful trigger (so we don't lock out retries on early engine check)
        timerExpiredHandledRef.current = true;
        setForcedEvacuation(true);
        setEvacuationTarget(target);
        // Auto-complete research for evacuation target system
        setResearchState((prev) => completeSystemResearchInstantly(prev, target.system));
      }
    };
    // Check every second
    const id = setInterval(checkExpired, 1000);
    checkExpired(); // Check immediately
    return () => clearInterval(id);
  }, [isExodusPhase, clockPhase, gameStartedAt, timeMultiplier, accelAt, gameTimeAtAccel, homeInfo, evacuationPhase]);

  /** Globally memoized destroyed planet IDs (parsed once from localStorage) */
  const destroyedPlanetIdsSet = useMemo(() => {
    try {
      const raw = localStorage.getItem('nebulife_destroyed_planets');
      if (!raw) return new Set<string>();
      const arr = JSON.parse(raw) as Array<{ planetId: string; systemId: string }>;
      return new Set(arr.map(d => d.planetId));
    } catch { return new Set<string>(); }
  // Re-derive after evacuation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evacuationPhase]);

  /** Surface view target */
  const [surfaceTarget, setSurfaceTarget] = useState<{
    planet: Planet;
    star: Star;
  } | null>(null);
  // Keep ref in sync with state
  surfaceTargetRef.current = surfaceTarget;

  // Pause PixiJS ticker while surface is open. Without this, Galaxy/System
  // scene keeps rendering at 30 FPS under the overlay — Mac heats up and
  // battery drains. The canvas is already fully covered so there's no
  // visual reason to keep it animating.
  useEffect(() => {
    if (surfaceTarget) engineRef.current?.pause();
    else engineRef.current?.resume();
  }, [surfaceTarget]);

  /** Quarks (in-game currency) */
  const [quarks, setQuarks] = useState<number>(0);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState<ResourceType | null>(null);
  const [showGetResearchData, setShowGetResearchData] = useState(false);
  const [researchDataNeeded, setResearchDataNeeded] = useState<number | null>(null);
  const [researchDataAdProgress, setResearchDataAdProgress] = useState(0);

  // Research data popup is shown only when player tries to use it
  // (research start or hex unlock) — not automatically on page load

  const [showPlayerPage, setShowPlayerPage] = useState(false);
  const [showChaosModal, setShowChaosModal] = useState(false);
  const [showCosmicArchive, setShowCosmicArchive] = useState(false);
  // Terraform panel — full-screen overlay for a specific planet
  const [showTerraformPlanet, setShowTerraformPlanet] = useState<Planet | null>(null);
  // Transient flag that animates the 4 corner-cube terminal button icon
  // toward the centre while the archive overlay is mounting.
  const [terminalConverging, setTerminalConverging] = useState(false);
  const [showAcademy, setShowAcademy] = useState(false);
  const [academyInitialTab, setAcademyInitialTab] = useState<AcademyTab | undefined>(undefined);
  const [academyMissionChapter, setAcademyMissionChapter] = useState<'surface' | undefined>(undefined);
  const [showSurfaceAstraLesson, setShowSurfaceAstraLesson] = useState(false);
  const [showEncyclopedia, setShowEncyclopedia] = useState(false);
  // Colony Center — opened by tapping the colony_hub building on the surface.
  // Renders ColonyCenterPage (6 tabs: overview / colonies / production /
  // buildings / events / premium). Closes via the page's own Back button.
  const [showColonyCenter, setShowColonyCenter] = useState(false);
  const [colonyCenterInitialTab, setColonyCenterInitialTab] = useState<ColonyCenterTabId>('overview');
  // Per-planet premium boosts (resource +10/20/25%, time -10/20/25%) purchased
  // with quarks. Map is keyed by planet.id so each colony has independent
  // boosts. Persisted into game_state.colony_boosts on sync.
  const [colonyBoosts, setColonyBoosts] = useState<Record<string, {
    resource?: { pct: number; expiresAt: number };
    time?:     { pct: number; expiresAt: number };
  }>>(() => {
    try {
      const saved = localStorage.getItem('nebulife_colony_boosts');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return {};
  });
  useEffect(() => {
    try { localStorage.setItem('nebulife_colony_boosts', JSON.stringify(colonyBoosts)); }
    catch { /* ignore */ }
  }, [colonyBoosts]);

  // Systems the player has unlocked via quarks (bypassing the ring-lock
  // gate). Each entry is a single StarSystem.id; once unlocked it can be
  // researched normally even if ast-probe tech isn't reached yet.
  const [quarkUnlockedSystems, setQuarkUnlockedSystems] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('nebulife_quark_unlocked_systems');
      if (saved) return new Set(JSON.parse(saved));
    } catch { /* ignore */ }
    return new Set();
  });
  useEffect(() => {
    try { localStorage.setItem('nebulife_quark_unlocked_systems', JSON.stringify(Array.from(quarkUnlockedSystems))); }
    catch { /* ignore */ }
  }, [quarkUnlockedSystems]);
  // On refresh: bot arena state is lost (GPU memory), redirect to hangar.
  // For future multiplayer: restore arena session from server instead.
  const wasInBotArena = localStorage.getItem('nebulife_arena_active') === '1';
  if (wasInBotArena) localStorage.removeItem('nebulife_arena_active'); // clear stale flag
  const [showArena, setShowArenaRaw] = useState(false); // never auto-restore bot arena
  const setShowArena = useCallback((val: boolean) => {
    setShowArenaRaw(val);
    setArenaPopupGate(val);
    if (val) localStorage.setItem('nebulife_arena_active', '1');
    else localStorage.removeItem('nebulife_arena_active');
  }, []);
  const [showRaid, setShowRaidRaw] = useState(false);
  const [lastRaidQuestDate, setLastRaidQuestDate] = useState<string>(() => {
    try { return localStorage.getItem('nebulife_daily_raid_date') ?? ''; } catch { return ''; }
  });
  const setShowRaid = useCallback((val: boolean) => {
    setShowRaidRaw(val);
    setArenaPopupGate(val);
  }, []);
  // Post-arena popup queue — popups that were deferred while arena was active
  // are flushed here 1.5 s apart once the arena closes.
  const [pendingPostArenaPopups, setPendingPostArenaPopups] = useState<Array<() => void>>([]);
  const [showHangar, setShowHangarRaw] = useState(() =>
    localStorage.getItem('nebulife_hangar_active') === '1' || wasInBotArena,
  );
  const setShowHangar = useCallback((val: boolean) => {
    if (val) setShowCosmicArchive(false);
    setShowHangarRaw(val);
    if (val) localStorage.setItem('nebulife_hangar_active', '1');
    else localStorage.removeItem('nebulife_hangar_active');
  }, []);
  const [arenaTeamMode, setArenaTeamMode] = useState(false);

  // Ref to showArena that stays current inside callbacks without re-creating them.
  const showArenaRef = useRef(false);
  useEffect(() => { showArenaRef.current = showArena || showRaid; }, [showArena, showRaid]);

  useEffect(() => {
    if (!showCosmicArchive) return;
    if (showArena || showRaid || showHangar || showAcademy || showEncyclopedia || showPlayerPage || showColonyCenter || showTerraformPlanet) {
      setShowCosmicArchive(false);
    }
  }, [showArena, showRaid, showHangar, showAcademy, showEncyclopedia, showPlayerPage, showColonyCenter, showTerraformPlanet, showCosmicArchive]);

  // Pause SpaceAmbient when player is on planet surface or inside the
  // Terminal (Cosmic Archive) overlay - those scenes will get their own
  // themed ambient later. Also respect the user's on/off preference from
  // PlayerPage settings.
  //
  // Only call pause() / resume() on actual state TRANSITIONS (tracked via
  // prevPausedRef) - not on every re-render. This prevents:
  //   a) resume() being called right after start() on initial mount
  //      (which would cancel the start's 2s fade-in and replace it with
  //      a 300ms ramp scheduled BEFORE AudioContext is actually running);
  //   b) multiple redundant pause/resume calls from unrelated state
  //      updates that happen to trigger this effect via identity changes.
  const prevAmbientPausedRef = useRef<boolean>(false);
  useEffect(() => {
    const ambient = ambientRef.current;
    if (!ambient) return;
    const shouldPause = !ambientEnabled || !!surfaceTarget || showCosmicArchive || cinematicVideoPlaying || showHangar || showRaid || needsOnboarding;
    const wasPaused = prevAmbientPausedRef.current;
    if (shouldPause && !wasPaused) {
      ambient.pause();
    } else if (!shouldPause && wasPaused) {
      ambient.resume();
    }
    prevAmbientPausedRef.current = shouldPause;
  }, [ambientEnabled, surfaceTarget, showCosmicArchive, cinematicVideoPlaying, showHangar, showRaid, needsOnboarding]);

  useEffect(() => {
    const shouldPause = !ambientEnabled || !!surfaceTarget || showCosmicArchive || cinematicVideoPlaying || showHangar || showRaid || needsOnboarding;
    if (shouldPause) return;
    const unlockSpaceAudio = () => {
      ambientRef.current?.resume(800);
    };
    document.addEventListener('pointerdown', unlockSpaceAudio, { capture: true });
    document.addEventListener('keydown', unlockSpaceAudio, { capture: true });
    document.addEventListener('touchstart', unlockSpaceAudio, { capture: true });
    return () => {
      document.removeEventListener('pointerdown', unlockSpaceAudio, true);
      document.removeEventListener('keydown', unlockSpaceAudio, true);
      document.removeEventListener('touchstart', unlockSpaceAudio, true);
    };
  }, [ambientEnabled, surfaceTarget, showCosmicArchive, cinematicVideoPlaying, showHangar, showRaid, needsOnboarding]);

  // Retain last planet context so colony tick can run passively when surface is closed.
  useEffect(() => {
    if (surfaceTarget) colonyPlanetRef.current = surfaceTarget;
  }, [surfaceTarget]);

  // Play planet ambient loop while surface view is active. Silent when the
  // hangar or arena is open — even if the player left surfaceTarget set,
  // the surface scene itself unmounts so audio must stop too.
  useEffect(() => {
    if (surfaceTarget && !showHangar && !showArena && !showRaid) {
      playLoop('planet-loop', 0.1);
    } else {
      stopLoop('planet-loop');
    }
    return () => stopLoop('planet-loop');
  }, [surfaceTarget, showHangar, showArena, showRaid]);

  // Terminal ambient loop — new user-supplied track (terminal-loop.mp3),
  // loops at 40% volume while the Cosmic Archive is open. Initial volume
  // respects the user's persisted mute toggle (nebulife_terminal_muted),
  // which CosmicArchive also mutates live via setLoopVolume on change.
  //
  // Surface music crossfade: when both the surface and the terminal are
  // active simultaneously, duck the planet-loop to avoid two competing
  // ambients. Fade out over 700 ms when terminal opens; fade back in
  // (over 700 ms) when terminal closes and surface is still active.
  useEffect(() => {
    if (showCosmicArchive) {
      let vol = 0.4;
      try { if (localStorage.getItem('nebulife_terminal_muted') === '1') vol = 0; } catch { /* ignore */ }
      playLoop('terminal-loop.mp3', vol);
      // Duck the surface planet-loop if it is currently running
      if (surfaceTarget && !showHangar && !showArena && !showRaid) {
        const FADE_STEPS = 14;
        const FADE_INTERVAL = 50; // ms → total ~700 ms
        const targetVol = 0;
        let step = 0;
        const startVol = 0.1;
        const timer = setInterval(() => {
          step++;
          const newVol = startVol * (1 - step / FADE_STEPS);
          setLoopVolume('planet-loop', Math.max(targetVol, newVol));
          if (step >= FADE_STEPS) clearInterval(timer);
        }, FADE_INTERVAL);
      }
    } else {
      stopLoop('terminal-loop.mp3');
      // Restore surface music volume if surface is still active
      if (surfaceTarget && !showHangar && !showArena && !showRaid) {
        const FADE_STEPS = 14;
        const FADE_INTERVAL = 50; // ms → total ~700 ms
        const targetVol = 0.1;
        let step = 0;
        const timer = setInterval(() => {
          step++;
          const newVol = targetVol * (step / FADE_STEPS);
          setLoopVolume('planet-loop', Math.min(targetVol, newVol));
          if (step >= FADE_STEPS) clearInterval(timer);
        }, FADE_INTERVAL);
      }
    }
    return () => stopLoop('terminal-loop.mp3');
  }, [showCosmicArchive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Intro melody — 25 s loop, plays through the entire onboarding. 50%
  // volume when no video is playing; smoothly ducked to 25% while a
  // cinematic video is running so the video's own audio sits on top,
  // then ramps back up between videos. Never hard-stopped until
  // onboarding finishes.
  useEffect(() => {
    if (!needsOnboarding) {
      stopLoop('before-trailers.mp3');
      return;
    }
    const LOUD = 0.5;
    const DUCKED = 0.25;
    const FADE_MS = 600;
    playLoop('before-trailers.mp3', cinematicVideoPlaying ? DUCKED : LOUD);
    const target = cinematicVideoPlaying ? DUCKED : LOUD;
    const startVol = cinematicVideoPlaying ? LOUD : DUCKED;
    const startT = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - startT) / FADE_MS);
      setLoopVolume('before-trailers.mp3', startVol + (target - startVol) * p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [needsOnboarding, cinematicVideoPlaying]);

  // Initialise colony tick state when entering surface for the first time
  useEffect(() => {
    if (!surfaceTarget) return;
    const planetId = surfaceTarget.planet.id;
    setColonyState((prev) => {
      if (prev && prev.planetId === planetId) return prev;
      // Build list from hex slots
      let buildings: PlacedBuilding[] = [];
      try {
    const raw = localStorage.getItem('nebulife_hex_slots');
        if (raw) {
          const slots = JSON.parse(raw) as { id: string; ring: number; index: number; state: string; buildingType?: string; buildingLevel?: number }[];
          buildings = slots
            .filter(s => s.state === 'building' && s.buildingType)
            .map(s => ({
              id: s.id,
              type: s.buildingType as BuildingType,
              x: s.index,
              y: s.ring,
              level: s.buildingLevel ?? 1,
              builtAt: new Date().toISOString(),
            }));
        }
      } catch { /* ignore */ }
      const fresh = createPlanetColonyState(planetId);
      fresh.buildings = buildings;
      return fresh;
    });
  }, [surfaceTarget?.planet.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Colony tick — runs every 60s, processes passive building production
  useEffect(() => {
    const id = setInterval(() => {
      const colony = colonyStateRef.current;
      const planetCtx = surfaceTargetRef.current ?? colonyPlanetRef.current;
      if (!colony || !planetCtx) return;
      const planetId = planetCtx.planet.id;
      const tileAt = () => undefined;
      const mutableColony: PlanetColonyState = JSON.parse(JSON.stringify(colony));
      const storageCapacity = getStorageCapacityForPlanet(planetId);
      mutableColony.resources = clampResourceBundle(getResources(planetId), storageCapacity);
      const beforeResources = { ...mutableColony.resources };

      // Backwards compat: if no stocks for this planet, generate fresh ones
      // then apply level-based depletion estimate for existing players.
      let stocks = planetResourceStocksRef.current[planetId];
      if (!stocks) {
        stocks = generatePlanetStocks(planetCtx.planet);
        stocks = applyLevelDepletion(stocks, playerLevelRef.current ?? 1);
        setPlanetResourceStocks(prev => ({ ...prev, [planetId]: stocks! }));
      }

      const result = runColonyTicks(
        mutableColony,
        planetCtx.planet,
        techTreeStateRef.current,
        tileAt,
        Date.now(),
        stocks,
        planetCtx.star.luminositySolar,
      );
      const before = beforeResources;
      const after  = result.colony.resources;
      const minD = Math.max(0, after.minerals  - before.minerals);
      const volD = Math.max(0, after.volatiles - before.volatiles);
      const isoD = Math.max(0, after.isotopes  - before.isotopes);
      const watD = Math.max(0, after.water     - before.water);
      const hadResourceDelta = minD + volD + isoD + watD > 0;
      if (result.researchDataProduced > 0 || result.shutdownIds.length > 0 || Object.keys(result.elementsProduced).length > 0 || hadResourceDelta) {
        if (result.researchDataProduced > 0) {
          setResearchData(prev => prev + result.researchDataProduced);
        }
        if (Object.keys(result.elementsProduced).length > 0) {
          setChemicalInventory(prev => {
            const next = { ...prev };
            for (const [el, amt] of Object.entries(result.elementsProduced)) {
              next[el] = (next[el] ?? 0) + amt;
            }
            return next;
          });
        }
        // Mirror the tick's net resource production into the per-planet store
        // so passive building output (mine, water_extractor, atmo_extractor,
        // etc.) actually reaches the hex-unlock cost UI. Route to the planet
        // that owns this surface context — surfaceTarget takes priority over
        // the retained colonyPlanetRef (Phase 7B: per-planet routing).
        if (hadResourceDelta) {
          const targetPlanetId = planetId;
          if (targetPlanetId) {
            addResources(targetPlanetId, { minerals: minD, volatiles: volD, isotopes: isoD, water: watD });
          }
        }
        setColonyState(result.colony);
        // Persist updated stocks after depletion
        if (result.updatedStocks) {
          setPlanetResourceStocks(prev => ({ ...prev, [planetId]: result.updatedStocks! }));
        }
      }
    }, COLONY_TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Volume slider -> setVolume on SpaceAmbient. Runs on every slider drag.
  // Safe when ambient is paused: setVolume schedules a new target and the
  // next resume() will ramp to it. HTML5 audio.volume is already 0..1 so
  // we pass the slider value through unchanged.
  useEffect(() => {
    ambientRef.current?.setVolume(ambientVolume);
  }, [ambientVolume]);

  // ── Terraform mission lifecycle tick (5-second cadence) ──────────────────
  // Refs let the interval read current state without stale closures.
  const terraformStatesRef = useRef(terraformStates);
  terraformStatesRef.current = terraformStates;
  const fleetRef = useRef(fleet);
  fleetRef.current = fleet;
  const shipFleetRef = useRef(shipFleet);
  shipFleetRef.current = shipFleet;

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const currentFleet = fleetRef.current;
      const nonIdle = currentFleet.filter((m) => m.phase !== 'idle');
      if (nonIdle.length === 0) return;

      let fleetChanged = false;
      let newTerraformStates = terraformStatesRef.current;
      // Collect at most one planet promotion per tick — queue for post-map state updates.
      // Use a wrapper array (not let+null) so TS control-flow analysis doesn't narrow to `never`
      // when the assignment only happens inside a map() callback.
      const pendingPromotions: Array<{ promotedPlanet: Planet; override: PlanetOverride }> = [];

      const nextFleet = currentFleet.map((mission) => {
        if (mission.phase === 'idle') return mission;

        const prevPhase = mission.phase;
        const ticked = tickMission(mission, now);

        if (ticked === mission) return mission; // no change — same ref

        fleetChanged = true;

        // Phase transition: outbound → unloading: apply delivery to terraform state
        if (prevPhase === 'outbound' && ticked.phase === 'unloading') {
          if (ticked.shipId) {
            setShipFleet((prev) => ({
              ...prev,
              ships: prev.ships.map((ship) => ship.id === ticked.shipId
                ? { ...ship, status: 'unloading', currentPlanetId: ticked.targetPlanetId, destinationPlanetId: null, departedAt: null, arrivalAt: null }
                : ship),
            }));
          }
          const tfState = newTerraformStates[ticked.targetPlanetId];
          if (tfState) {
            const updatedTf = applyDelivery(
              tfState,
              ticked.paramId,
              ticked.amount,
              ticked.resource,
            );

            // Phase 7C — check for terraform completion and promote planet
            const engine = engineRef.current;
            let completedState = updatedTf;
            if (
              engine &&
              getOverallProgress(updatedTf) >= 95 &&
              updatedTf.completedAt === null &&
              pendingPromotions.length === 0 // only one promotion per tick
            ) {
              const allSystems = engine.getAllSystems();
              for (const sys of allSystems) {
                const planet = sys.planets.find((p) => p.id === ticked.targetPlanetId);
                if (planet) {
                  const promotedPlanet = applyTerraformCompletionToPlanet(planet, updatedTf);
                  if (promotedPlanet) {
                    const completionTime = Date.now();
                    completedState = { ...updatedTf, completedAt: completionTime };

                    const override: PlanetOverride = {
                      planetId: promotedPlanet.id,
                      type: promotedPlanet.type,
                      habitability: promotedPlanet.habitability,
                      terraformDifficulty: promotedPlanet.terraformDifficulty,
                      promotedAt: completionTime,
                    };

                    // Mutate in-memory engine planet immediately
                    const planetIdx = sys.planets.findIndex((p) => p.id === promotedPlanet.id);
                    if (planetIdx >= 0) {
                      sys.planets[planetIdx] = promotedPlanet;
                    }

                    pendingPromotions.push({ promotedPlanet, override });
                  }
                  break;
                }
              }
            }

            newTerraformStates = {
              ...newTerraformStates,
              [ticked.targetPlanetId]: completedState,
            };
          }
        }

        // Phase transition: returning → repairing: charge minerals from donor colony
        if (prevPhase === 'returning' && ticked.phase === 'repairing') {
          if (ticked.shipId) {
            setShipFleet((prev) => ({
              ...prev,
              ships: prev.ships.map((ship) => ship.id === ticked.shipId
                ? { ...ship, status: 'docked', currentPlanetId: ticked.donorPlanetId, destinationPlanetId: null, departedAt: null, arrivalAt: null }
                : ship),
            }));
          }
          const cost = ticked.repairCostMinerals;
          if (cost > 0) {
            addResources(ticked.donorPlanetId, { minerals: -cost });
          }
        }

        if (prevPhase === 'dispatching' && ticked.phase === 'outbound' && ticked.shipId) {
          const arrivalAt = now + ticked.flightHours * 3_600_000;
          setShipFleet((prev) => ({
            ...prev,
            ships: prev.ships.map((ship) => ship.id === ticked.shipId
              ? { ...ship, status: 'in_transit', currentPlanetId: null, destinationPlanetId: ticked.targetPlanetId, departedAt: now, arrivalAt }
              : ship),
          }));
        }

        if (prevPhase === 'unloading' && ticked.phase === 'returning' && ticked.shipId) {
          const arrivalAt = now + ticked.flightHours * 3_600_000;
          setShipFleet((prev) => ({
            ...prev,
            ships: prev.ships.map((ship) => ship.id === ticked.shipId
              ? { ...ship, status: 'in_transit', currentPlanetId: null, destinationPlanetId: ticked.donorPlanetId, departedAt: now, arrivalAt }
              : ship),
          }));
        }

        if (prevPhase === 'repairing' && ticked.phase === 'idle' && ticked.shipId) {
          setShipFleet((prev) => ({
            ...prev,
            ships: prev.ships.map((ship) => ship.id === ticked.shipId
              ? { ...ship, status: 'docked', currentPlanetId: ticked.donorPlanetId, assignmentId: null }
              : ship),
          }));
        }

        return ticked;
      });

      // GC: drop missions that have been idle for more than 24 h
      const GC_MS = 24 * 60 * 60 * 1000;
      const gcFleet = nextFleet.filter((m) => {
        if (m.phase !== 'idle') return true;
        return (now - m.phaseStartedAt) < GC_MS;
      });

      if (fleetChanged) {
        setFleet(gcFleet);
      }

      if (newTerraformStates !== terraformStatesRef.current) {
        setTerraformStates(newTerraformStates);
      }

      // Apply planet promotion (React state updates must happen outside map())
      for (const promo of pendingPromotions) {
        const promotedPlanet = promo.promotedPlanet;
        const promotedOverride = promo.override;
        const promotedId = promotedPlanet.id;
        setPlanetOverrides((prev) => ({ ...prev, [promotedId]: promotedOverride }));
        setPendingTerraformCompletion(promotedPlanet);
        awardXP(XP_REWARDS.TERRAFORM_COMPLETED, 'terraform_completed');
      }
    }, 5000);

    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Terraform dispatch callbacks ────────────────────────────────────────

  /**
   * Create a new mission, debit resources from the donor colony immediately,
   * and add to fleet. For Phase 1 all colonies share the global colonyResources.
   */
  const onStartTerraformParam = useCallback((
    targetPlanetId: string,
    paramId: TerraformParamId,
    donorPlanetId: string,
    resource: 'minerals' | 'volatiles' | 'isotopes' | 'water',
    amount: number,
    tier: TfShipTier,
    flightHours: number,
    repairCostMinerals: number,
    shipId?: string,
  ): void => {
    // Debit resources immediately from the donor colony's per-planet store
    addResources(donorPlanetId, { [resource]: -amount });

    const now = Date.now();
    const mission: Mission = {
      id: `mission-${now}-${Math.random().toString(36).slice(2, 8)}`,
      donorPlanetId,
      targetPlanetId,
      shipId,
      paramId,
      resource,
      amount,
      tier,
      phase: 'dispatching',
      startedAt: now,
      phaseStartedAt: now,
      flightHours,
      repairCostMinerals,
    };

    if (shipId) {
      setShipFleet((prev) => ({
        ...prev,
        ships: prev.ships.map((ship) => ship.id === shipId
          ? { ...ship, status: 'loading', assignmentId: mission.id, currentPlanetId: donorPlanetId }
          : ship),
      }));
    }
    setFleet((prev) => [...prev, mission]);
    scheduleSyncToServer();
  }, [scheduleSyncToServer, addResources]);

  /**
   * Cancel a mission by ID. Refunds 50% of resource if still in `dispatching`,
   * otherwise no refund.
   */
  const onCancelMission = useCallback((missionId: string): void => {
    setFleet((prev) => {
      const mission = prev.find((m) => m.id === missionId);
      if (!mission) return prev;

      // Refund 50% to the donor colony if still loading
      if (mission.phase === 'dispatching') {
        const refund = Math.floor(mission.amount * 0.5);
        if (refund > 0) {
          addResources(mission.donorPlanetId, { [mission.resource]: refund });
        }
        if (mission.shipId) {
          setShipFleet((shipPrev) => ({
            ...shipPrev,
            ships: shipPrev.ships.map((ship) => ship.id === mission.shipId
              ? { ...ship, status: 'docked', assignmentId: null, currentPlanetId: mission.donorPlanetId }
              : ship),
          }));
        }
      }

      return prev.filter((m) => m.id !== missionId);
    });
    scheduleSyncToServer();
  }, [scheduleSyncToServer, addResources]);

  /**
   * Returns all planets that have a colony_hub building (potential donors).
   * Phase 1: reads hex_slots from localStorage for the current surface planet,
   * plus any planet stored in colonyPlanetRef.  Multi-colony full support is Phase 2+.
   */
  const getColonyPlanets = useCallback((): Planet[] => {
    const planets: Planet[] = [];
    const seen = new Set<string>();

    // Check the current surface planet for colony_hub
    const surfCtx = surfaceTargetRef.current ?? colonyPlanetRef.current;
    if (surfCtx?.planet) {
      try {
        const raw = localStorage.getItem('nebulife_hex_slots');
        if (raw) {
          const slots = JSON.parse(raw) as Array<{ state: string; buildingType?: string }>;
          const hasHub = slots.some(
            (s) => s.state === 'building' && s.buildingType === 'colony_hub',
          );
          if (hasHub && !seen.has(surfCtx.planet.id)) {
            planets.push(surfCtx.planet);
            seen.add(surfCtx.planet.id);
          }
        }
      } catch { /* ignore */ }
    }

    // Also include homeInfo planet if it's a colony (exodus phase complete)
    if (!isExodusPhase && homeInfo?.planet && !seen.has(homeInfo.planet.id)) {
      planets.push(homeInfo.planet);
      seen.add(homeInfo.planet.id);
    }

    return planets;
  }, [isExodusPhase, homeInfo]);

  const getColonySystems = useCallback((): StarSystem[] => {
    const allSystems = engineRef.current?.getAllSystems?.() ?? [];
    const systems: StarSystem[] = [];
    const seen = new Set<string>();

    const addPlanetSystem = (planetId?: string | null) => {
      if (!planetId) return;
      const system = allSystems.find((candidate) => candidate.planets.some((planet) => planet.id === planetId));
      if (system && !seen.has(system.id)) {
        systems.push(system);
        seen.add(system.id);
      }
    };

    if (homeInfo?.planet.id) addPlanetSystem(homeInfo.planet.id);
    if (colonyState?.buildings?.some((building) => building.type === 'colony_hub')) {
      addPlanetSystem(colonyState.planetId);
    }

    return systems;
  }, [colonyState?.buildings, colonyState?.planetId, homeInfo?.planet.id]);

  const getResearchDistanceFromNearestColony = useCallback((targetSystem: StarSystem): number => {
    const colonySystems = getColonySystems();
    if (colonySystems.length === 0) return targetSystem.ringIndex;

    let nearestRingDistance = Number.POSITIVE_INFINITY;
    for (const colonySystem of colonySystems) {
      if (colonySystem.id === targetSystem.id) return 0;
      // Research-data pricing is based on gameplay rings, not raw map units.
      // Core/cluster positions are in broad galaxy coordinates; using LY / 5
      // made nearby-looking systems cost 1024+ data. Ring difference keeps the
      // intended curve: own/adjacent = 1, second ring = 2, third = 4, etc.
      nearestRingDistance = Math.min(
        nearestRingDistance,
        Math.abs(targetSystem.ringIndex - colonySystem.ringIndex),
      );
    }

    return Number.isFinite(nearestRingDistance) ? nearestRingDistance : targetSystem.ringIndex;
  }, [getColonySystems]);

  const getSystemResearchDataCost = useCallback((targetSystem: StarSystem): number => (
    researchDataCostForRingDistance(getResearchDistanceFromNearestColony(targetSystem))
  ), [getResearchDistanceFromNearestColony]);

  const getPlanetMissionResearchDataCost = useCallback((system: StarSystem): number => (
    researchDataCostForRingDistance(getResearchDistanceFromNearestColony(system))
  ), [getResearchDistanceFromNearestColony]);

  /** Open TerraformPanel for a planet (called from PlanetContextMenu). */
  const onShowTerraform = useCallback((planet: Planet): void => {
    setState((prev) => ({ ...prev, showPlanetMenu: false }));
    setShowTerraformPlanet(planet);
  }, []);

  const getExplorationBuildings = useCallback((): PlacedBuilding[] => {
    const byId = new Map<string, PlacedBuilding>();
    for (const building of colonyState?.buildings ?? []) byId.set(building.id, building);

    try {
      const raw = localStorage.getItem('nebulife_hex_slots');
      if (raw) {
        const slots = JSON.parse(raw) as Array<{ id: string; state: string; buildingType?: string; buildingLevel?: number }>;
        for (const slot of slots) {
          if (slot.state !== 'building' || !slot.buildingType) continue;
          const id = `hex-${slot.id}`;
          byId.set(id, {
            id,
            type: slot.buildingType as BuildingType,
            x: 0,
            y: 0,
            level: slot.buildingLevel ?? 1,
            builtAt: new Date().toISOString(),
          });
        }
      }
    } catch { /* ignore */ }

    return [...byId.values()];
  }, [colonyState?.buildings]);

  const getEffectivePlanetRevealLevel = useCallback((planet: Planet, system?: StarSystem | null): PlanetRevealLevel => {
    if (planet.isHomePlanet || (homeInfo?.planet.id && planet.id === homeInfo.planet.id)) return 3;
    const stored = planetRevealLevels[planet.id] ?? 0;
    const systemResearched = system?.id ? isSystemFullyResearched(researchState, system.id) : false;
    return Math.max(stored, systemResearched ? 1 : 0) as PlanetRevealLevel;
  }, [homeInfo?.planet.id, planetRevealLevels, researchState]);

  const getActivePlanetMission = useCallback((planetId: string): PlanetMission | null => {
    return Object.values(planetMissions).find((mission) => (
      mission.planetId === planetId && mission.status !== 'completed' && mission.status !== 'report_ready'
    )) ?? null;
  }, [planetMissions]);

  const getAvailableMissionCarriers = useCallback((originPlanetId: string): Partial<Record<ProducibleType, number>> => {
    const carriers: Partial<Record<ProducibleType, number>> = {};
    for (const ship of shipFleetRef.current.ships) {
      if (ship.status !== 'docked' || ship.assignmentId || ship.currentPlanetId !== originPlanetId) continue;
      if (ship.type === 'research_shuttle' || ship.type === 'rover_dropcraft' || ship.type === 'atmo_probe_carrier') {
        carriers[ship.type] = (carriers[ship.type] ?? 0) + 1;
      }
    }
    return carriers;
  }, []);

  const handleStartPlanetMission = useCallback((planet: Planet, type: PlanetMissionType): void => {
    const system = state.selectedSystem;
    if (!system) return;

    const revealLevel = getEffectivePlanetRevealLevel(planet, system);
    const originPlanetId = surfaceTarget?.planet.id ?? homeInfo?.planet.id ?? colonyState?.planetId;
    if (!originPlanetId) return;
    const missionResearchDataCost = getPlanetMissionResearchDataCost(system);
    const resources = { researchData: Math.floor(researchData), ...totalResources() };
    const carrierInventory = getAvailableMissionCarriers(originPlanetId);
    const check = canStartPlanetMission({
      type,
      planet,
      revealLevel,
      activeMissions: Object.values(planetMissions),
      buildings: getExplorationBuildings(),
      resources,
      payloadInventory: explorationPayloads,
      carrierInventory,
      researchDataCost: missionResearchDataCost,
    });

    if (!check.canStart) {
      const reasonKey = {
        already_revealed: 'planet_missions.reason.already_revealed',
        active_mission: 'planet_missions.reason.active_mission',
        building_required: 'planet_missions.reason.building_required',
        surface_unavailable: 'planet_missions.reason.surface_unavailable',
        resources_required: 'planet_missions.reason.resources_required',
        payload_required: 'planet_missions.reason.payload_required',
        carrier_required: 'planet_missions.reason.carrier_required',
        unknown: 'planet_missions.reason.unknown',
      } as const;
      setState((prev) => ({ ...prev, error: t(reasonKey[check.reason ?? 'unknown']) }));
      return;
    }

    const now = Date.now();
    const carrierType = getRequiredMissionCarrier(type);
    const carrierShip = carrierType
      ? shipFleetRef.current.ships.find((ship) => (
          ship.type === carrierType
          && ship.status === 'docked'
          && ship.currentPlanetId === originPlanetId
          && !ship.assignmentId
        ))
      : null;
    const mission = createPlanetMission({
      id: `pm-${planet.id}-${now}`,
      type,
      systemId: system.id,
      planet,
      startedAt: now,
      originPlanetId,
      originSystemId: system.id,
      carrierShipId: carrierShip?.id,
      carrierType: carrierType ?? undefined,
      researchDataCost: missionResearchDataCost,
    });
    const queuedMission = carrierShip
      ? { ...mission, carrierReturnAt: now + MISSION_CARRIER_RETURN_MS }
      : mission;

    const cost = mission.costPaid;
    if (cost.payload) {
      setExplorationPayloads((prev) => ({
        ...prev,
        [cost.payload!]: Math.max(0, (prev[cost.payload!] ?? 0) - 1),
      }));
    }
    if (cost.researchData) setResearchData((prev) => Math.max(0, prev - cost.researchData!));
    spendResourcesAcrossPlanets(originPlanetId, {
      minerals: -(cost.minerals ?? 0),
      volatiles: -(cost.volatiles ?? 0),
      isotopes: -(cost.isotopes ?? 0),
      water: -(cost.water ?? 0),
    });

    if (carrierShip) {
      setShipFleet((prev) => ({
        ...prev,
        ships: prev.ships.map((ship) => ship.id === carrierShip.id
          ? {
              ...ship,
              status: 'in_transit',
              currentPlanetId: null,
              destinationPlanetId: planet.id,
              departedAt: now,
              arrivalAt: now + MISSION_CARRIER_RETURN_MS,
              assignmentId: queuedMission.id,
            }
          : ship),
      }));
    }

    setPlanetMissions((prev) => ({ ...prev, [queuedMission.id]: queuedMission }));
    setState((prev) => ({ ...prev, showPlanetMenu: false, error: null }));
    scheduleSyncToServer();
  }, [
    colonyState?.planetId,
    getEffectivePlanetRevealLevel,
    getAvailableMissionCarriers,
    getPlanetMissionResearchDataCost,
    getExplorationBuildings,
    explorationPayloads,
    homeInfo?.planet.id,
    planetMissions,
    researchData,
    scheduleSyncToServer,
    spendResourcesAcrossPlanets,
    state.selectedSystem,
    surfaceTarget?.planet.id,
    t,
    totalResources,
  ]);

  const getExplorationPayloadCost = useCallback((type: ProducibleType): { minerals: number; volatiles: number; isotopes: number; water: number } => {
    const cost = { minerals: 0, volatiles: 0, isotopes: 0, water: 0 };
    for (const item of PRODUCIBLE_DEFS[type]?.cost ?? []) {
      if (item.resource === 'minerals' || item.resource === 'volatiles' || item.resource === 'isotopes' || item.resource === 'water') {
        cost[item.resource] += item.amount;
      } else {
        cost.minerals += item.amount;
      }
    }
    return cost;
  }, []);

  const createDockedShipFromProduction = useCallback((type: ProducibleType, planetId: string, now: number): Ship => {
    const def = PRODUCIBLE_DEFS[type];
    return {
      id: `ship-${type}-${planetId}-${now}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      name: def.name,
      status: 'docked',
      currentPlanetId: planetId,
      destinationPlanetId: null,
      cargo: { minerals: 0, volatiles: 0, isotopes: 0, water: 0, elements: {}, units: [], colonists: 0 },
      fuelRemaining: def.fuelPerLY * 100,
      departedAt: null,
      arrivalAt: null,
      assignmentId: null,
    };
  }, []);

  const estimateShipFlightMs = useCallback((ship: Ship, fromPlanetId: string, toPlanetId: string): number => {
    const def = PRODUCIBLE_DEFS[ship.type];
    const systems = engineRef.current?.getAllSystems?.() ?? [];
    const fromSystem = systems.find((system) => system.planets.some((planet) => planet.id === fromPlanetId));
    const toSystem = systems.find((system) => system.planets.some((planet) => planet.id === toPlanetId));
    const distanceLY = fromSystem && toSystem ? Math.max(0.05, systemDistanceLY(fromSystem, toSystem)) : 0.25;
    return Math.max(60_000, Math.ceil((distanceLY / Math.max(0.001, def.baseSpeed)) * 60_000));
  }, []);

  const handleStartCargoShipment = useCallback((params: {
    shipId: string;
    fromPlanetId: string;
    toPlanetId: string;
    resource: 'minerals' | 'volatiles' | 'isotopes' | 'water';
    amount: number;
  }): void => {
    const ship = shipFleetRef.current.ships.find((candidate) => candidate.id === params.shipId);
    if (!ship || ship.status !== 'docked' || ship.currentPlanetId !== params.fromPlanetId || ship.assignmentId) {
      setState((prev) => ({ ...prev, error: t('planet_missions.reason.building_required') }));
      return;
    }

    const def = PRODUCIBLE_DEFS[ship.type];
    const amount = Math.max(0, Math.min(Math.floor(params.amount), def.cargoCapacity));
    const donorResources = getResources(params.fromPlanetId);
    if (amount <= 0 || donorResources[params.resource] < amount) {
      setState((prev) => ({ ...prev, error: t('planet_missions.reason.resources_required') }));
      return;
    }

    addResources(params.fromPlanetId, { [params.resource]: -amount });
    const now = Date.now();
    const shipment: CargoShipment = {
      id: `cargo-${now}-${Math.random().toString(36).slice(2, 8)}`,
      shipId: ship.id,
      fromPlanetId: params.fromPlanetId,
      toPlanetId: params.toPlanetId,
      resource: params.resource,
      amount,
      status: 'loading',
      startedAt: now,
      phaseStartedAt: now,
      flightMs: estimateShipFlightMs(ship, params.fromPlanetId, params.toPlanetId),
    };

    setShipFleet((prev) => ({
      ...prev,
      cargoShipments: [...(prev.cargoShipments ?? []), shipment],
      ships: prev.ships.map((candidate) => candidate.id === ship.id
        ? {
            ...candidate,
            status: 'loading',
            assignmentId: shipment.id,
            cargo: { ...candidate.cargo, [params.resource]: amount },
          }
        : candidate),
    }));
    setState((prev) => ({ ...prev, error: null }));
    scheduleSyncToServer();
  }, [addResources, estimateShipFlightMs, getResources, scheduleSyncToServer, t]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      let changed = false;
      const delivered: CargoShipment[] = [];

      setShipFleet((prev) => {
        const shipments = prev.cargoShipments ?? [];
        if (shipments.length === 0) return prev;

        const nextShipments = shipments.map((shipment) => {
          if (shipment.status === 'completed') return shipment;
          const elapsed = now - shipment.phaseStartedAt;

          if (shipment.status === 'loading' && elapsed >= 20_000) {
            changed = true;
            return { ...shipment, status: 'outbound' as const, phaseStartedAt: now };
          }
          if (shipment.status === 'outbound' && elapsed >= shipment.flightMs) {
            changed = true;
            delivered.push(shipment);
            return { ...shipment, status: 'unloading' as const, phaseStartedAt: now };
          }
          if (shipment.status === 'unloading' && elapsed >= 20_000) {
            changed = true;
            return { ...shipment, status: 'returning' as const, phaseStartedAt: now };
          }
          if (shipment.status === 'returning' && elapsed >= shipment.flightMs) {
            changed = true;
            return { ...shipment, status: 'completed' as const, phaseStartedAt: now };
          }
          return shipment;
        });

        if (!changed) return prev;
        const activeShipmentByShip = new Map(nextShipments
          .filter((shipment) => shipment.status !== 'completed')
          .map((shipment) => [shipment.shipId, shipment]));
        const nextShips = prev.ships.map((ship) => {
          const shipment = activeShipmentByShip.get(ship.id);
          if (!shipment) {
            const wasCargoShipment = (prev.cargoShipments ?? []).some((item) => item.shipId === ship.id && item.id === ship.assignmentId);
            if (!wasCargoShipment) return ship;
            return {
              ...ship,
              status: 'docked' as const,
              currentPlanetId: ship.currentPlanetId ?? null,
              destinationPlanetId: null,
              cargo: { ...ship.cargo, minerals: 0, volatiles: 0, isotopes: 0, water: 0 },
              departedAt: null,
              arrivalAt: null,
              assignmentId: null,
            };
          }
          if (shipment.status === 'loading') {
            return { ...ship, status: 'loading' as const, currentPlanetId: shipment.fromPlanetId, destinationPlanetId: shipment.toPlanetId };
          }
          if (shipment.status === 'outbound') {
            return {
              ...ship,
              status: 'in_transit' as const,
              currentPlanetId: null,
              destinationPlanetId: shipment.toPlanetId,
              departedAt: shipment.phaseStartedAt,
              arrivalAt: shipment.phaseStartedAt + shipment.flightMs,
            };
          }
          if (shipment.status === 'unloading') {
            return { ...ship, status: 'unloading' as const, currentPlanetId: shipment.toPlanetId, destinationPlanetId: null, departedAt: null, arrivalAt: null };
          }
          return {
            ...ship,
            status: 'in_transit' as const,
            currentPlanetId: null,
            destinationPlanetId: shipment.fromPlanetId,
            cargo: { ...ship.cargo, minerals: 0, volatiles: 0, isotopes: 0, water: 0 },
            departedAt: shipment.phaseStartedAt,
            arrivalAt: shipment.phaseStartedAt + shipment.flightMs,
          };
        });

        return {
          ...prev,
          cargoShipments: nextShipments.filter((shipment) => shipment.status !== 'completed' || now - shipment.phaseStartedAt < 60_000),
          ships: nextShips,
        };
      });

      for (const shipment of delivered) {
        addResources(shipment.toPlanetId, { [shipment.resource]: shipment.amount });
      }
      if (changed) scheduleSyncToServer();
    }, 1000);

    return () => window.clearInterval(id);
  }, [addResources, scheduleSyncToServer]);

  const handleStartPayloadProduction = useCallback((type: ProducibleType): void => {
    const def = PRODUCIBLE_DEFS[type];
    const originPlanetId = surfaceTargetRef.current?.planet.id ?? homeInfo?.planet.id;
    if (!def || !originPlanetId) return;

    if (!getExplorationBuildings().some((building) => building.type === def.requiresBuilding && !building.shutdown)) {
      setState((prev) => ({ ...prev, error: t('planet_missions.reason.building_required') }));
      return;
    }

    const queueForType = explorationProductionQueueRef.current.filter((item) => item.type === type).length;
    if (queueForType >= 3) {
      setState((prev) => ({ ...prev, error: t('planet_missions.reason.production_queue_full') }));
      return;
    }

    const cost = getExplorationPayloadCost(type);
    const resources = totalResources();
    const missing = (['minerals', 'volatiles', 'isotopes', 'water'] as const)
      .some((key) => resources[key] < cost[key]);
    if (missing) {
      setState((prev) => ({ ...prev, error: t('planet_missions.reason.resources_required') }));
      return;
    }

    spendResourcesAcrossPlanets(originPlanetId, {
      minerals: -cost.minerals,
      volatiles: -cost.volatiles,
      isotopes: -cost.isotopes,
      water: -cost.water,
    });

    const now = Date.now();
    const newItem: ExplorationPayloadProductionItem = {
      id: `payload-${type}-${originPlanetId}-${now}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      planetId: originPlanetId,
      startedAt: now,
      durationMs: def.productionTimeMs,
    };
    const nextQueue = [...explorationProductionQueueRef.current, newItem];
    explorationProductionQueueRef.current = nextQueue;
    try { localStorage.setItem('nebulife_exploration_production_queue', JSON.stringify(nextQueue)); } catch { /* ignore quota */ }
    setExplorationProductionQueue(nextQueue);
    setState((prev) => ({ ...prev, error: null }));
    scheduleSyncToServer();
  }, [
    getExplorationBuildings,
    getExplorationPayloadCost,
    homeInfo?.planet.id,
    scheduleSyncToServer,
    spendResourcesAcrossPlanets,
    t,
    totalResources,
  ]);

  const buildPlanetMissionReportText = useCallback((planet: Planet, report: PlanetReportSummary): string => {
    const isEn = lang === 'en';
    const typeLabel: Record<PlanetMissionType, string> = isEn
      ? {
          orbital_scan: 'Orbital scan',
          orbital_probe: 'Orbital probe',
          drone_recon: 'Drone reconnaissance',
          surface_landing: 'Surface expedition',
          deep_atmosphere_probe: 'Atmosphere probe',
        }
      : {
          orbital_scan: 'Орбітальне сканування',
          orbital_probe: 'Орбітальний зонд',
          drone_recon: 'Розвідка дроном',
          surface_landing: 'Поверхнева експедиція',
          deep_atmosphere_probe: 'Атмосферний зонд',
        };
    const pressure = planet.atmosphere?.surfacePressureAtm ?? 0;
    const waterPct = Math.round((planet.hydrosphere?.waterCoverageFraction ?? 0) * 100);
    const icePct = Math.round((planet.hydrosphere?.iceCapFraction ?? 0) * 100);
    const greenhouse = planet.atmosphere?.greenhouse ?? 0;
    const moonCount = planet.moons?.length ?? 0;
    const resourceMass = planet.resources.totalResources;
    const atmosphereLine = pressure > 5
      ? (isEn ? 'dense, high-pressure atmosphere with strong scattering/haze risk' : 'щільна атмосфера високого тиску з ризиком сильного розсіювання/серпанку')
      : pressure > 0.5
        ? (isEn ? 'stable measurable atmosphere with visible optical effects' : 'стабільна вимірювана атмосфера з видимими оптичними ефектами')
        : pressure > 0.01
          ? (isEn ? 'thin trace atmosphere, low surface shielding' : 'тонка розріджена атмосфера, слабкий захист поверхні')
          : (isEn ? 'no meaningful atmosphere detected' : 'суттєвої атмосфери не виявлено');
    const waterLine = waterPct > 60
      ? (isEn ? 'global-ocean class hydrosphere' : 'гідросфера класу глобального океану')
      : waterPct > 15
        ? (isEn ? 'fragmented seas or stable regional basins' : 'фрагментовані моря або стабільні регіональні басейни')
        : waterPct > 0
          ? (isEn ? 'limited water signatures' : 'обмежені водні сигнатури')
          : (isEn ? 'no stable surface water signature' : 'стабільної поверхневої води не виявлено');

    const lines = [
      isEn
        ? `${typeLabel[report.missionType]} for ${planet.name} is complete. Preliminary science brief for the Colony Council follows.`
        : `${typeLabel[report.missionType]} для ${planet.name} завершено. Нижче попередній науковий витяг для Ради Колонії.`,
      '',
      isEn ? `RESEARCH COMPLETION: 100%. Data tier revealed: Tier ${report.revealLevel}.` : `ЗАВЕРШЕННЯ ДОСЛІДЖЕННЯ: 100%. Відкрито рівень даних: Tier ${report.revealLevel}.`,
      isEn
        ? `Orbit: ${planet.orbit.semiMajorAxisAU.toFixed(3)} AU, ${planet.orbit.periodDays.toFixed(1)} day period.`
        : `Орбіта: ${planet.orbit.semiMajorAxisAU.toFixed(3)} AU, період ${planet.orbit.periodDays.toFixed(1)} діб.`,
      isEn
        ? `Climate: ${planet.surfaceTempK} K, ${planet.atmosphere ? planet.atmosphere.surfacePressureAtm.toFixed(2) : '0.00'} atm pressure.`
        : `Клімат: ${planet.surfaceTempK} K, тиск ${planet.atmosphere ? planet.atmosphere.surfacePressureAtm.toFixed(2) : '0.00'} atm.`,
      isEn
        ? `Gravity: ${planet.surfaceGravityG.toFixed(2)} g. Moons detected: ${moonCount}.`
        : `Гравітація: ${planet.surfaceGravityG.toFixed(2)} g. Супутників виявлено: ${moonCount}.`,
      '',
      isEn ? 'ATMOSPHERIC FINDINGS' : 'АТМОСФЕРНИЙ ВИСНОВОК',
      isEn
        ? `Pressure class: ${atmosphereLine}. Greenhouse factor: ${greenhouse.toFixed(2)}.`
        : `Клас тиску: ${atmosphereLine}. Парниковий фактор: ${greenhouse.toFixed(2)}.`,
      isEn
        ? `Hydrosphere: ${waterLine}. Water coverage ${waterPct}%, ice coverage ${icePct}%.`
        : `Гідросфера: ${waterLine}. Покриття водою ${waterPct}%, льодом ${icePct}%.`,
    ];

    if (report.revealLevel >= 2) {
      lines.push('', isEn ? 'RESOURCE AND HABITABILITY FINDINGS' : 'РЕСУРСНИЙ ТА ЖИТЛОВИЙ ВИСНОВОК');
      lines.push(isEn
        ? `Deposits: minerals ~${Math.round(resourceMass.minerals / 1e18)}E18, volatiles ~${Math.round(resourceMass.volatiles / 1e18)}E18, isotopes ~${Math.round(resourceMass.isotopes / 1e12)}E12.`
        : `Поклади: мінерали ~${Math.round(resourceMass.minerals / 1e18)}E18, леткі ~${Math.round(resourceMass.volatiles / 1e18)}E18, ізотопи ~${Math.round(resourceMass.isotopes / 1e12)}E12.`);
      lines.push(isEn
        ? `Habitability estimate: ${Math.round(planet.habitability.overall * 100)}%.`
        : `Оцінка придатності: ${Math.round(planet.habitability.overall * 100)}%.`);
    }

    if (report.revealLevel >= 3) {
      lines.push('', isEn ? 'SURFACE FINDINGS' : 'ВИСНОВОК ПОВЕРХНІ');
      lines.push(isEn
        ? `Surface: life — ${planet.hasLife ? planet.lifeComplexity : 'none'}, colonization — ${planet.isColonizable ? 'yes' : 'no'}.`
        : `Поверхня: життя — ${planet.hasLife ? planet.lifeComplexity : 'немає'}, колонізація — ${planet.isColonizable ? 'так' : 'ні'}.`);
      lines.push(isEn
        ? `Terrain interpretation: ${planet.hasLife ? 'biosignatures must be preserved during landing-site selection' : 'priority zones are stable terrain, accessible deposits, and low thermal stress'}.`
        : `Інтерпретація рельєфу: ${planet.hasLife ? 'біосигнатури треба зберегти під час вибору місця посадки' : 'пріоритетні зони — стабільний рельєф, доступні поклади та низький тепловий стрес'}.`);
    }

    lines.push('', isEn
      ? 'Recommendation: use this data for the next mission tier or colonization planning.'
      : 'Рекомендація: використати ці дані для наступного рівня місії або планування колонізації.');
    return lines.join('\n');
  }, [lang]);

  const completeReadyExplorationProduction = useCallback((now: number): void => {
    const queue = explorationProductionQueueRef.current;
    if (queue.length === 0) return;

    const completed: ExplorationPayloadProductionItem[] = [];
    const remaining: ExplorationPayloadProductionItem[] = [];
    for (const item of queue) {
      if (now - item.startedAt >= item.durationMs) completed.push(item);
      else remaining.push(item);
    }
    if (completed.length === 0) return;

    explorationProductionQueueRef.current = remaining;
    try { localStorage.setItem('nebulife_exploration_production_queue', JSON.stringify(remaining)); } catch { /* ignore quota */ }
    setExplorationProductionQueue(remaining);

    const completedPayloads = completed.filter((item) => !isShipProducible(item.type));
    const completedShips = completed.filter((item) => isShipProducible(item.type));
    if (completedPayloads.length > 0) {
      setExplorationPayloads((prev) => {
        const next = { ...prev };
        for (const item of completedPayloads) next[item.type] = (next[item.type] ?? 0) + 1;
        explorationPayloadsRef.current = next;
        try { localStorage.setItem('nebulife_exploration_payloads', JSON.stringify(next)); } catch { /* ignore quota */ }
        return next;
      });
    }
    if (completedShips.length > 0) {
      const producedShips = completedShips.map((item) => createDockedShipFromProduction(item.type, item.planetId, now));
      setShipFleet((prev) => {
        const next = {
          ...prev,
          ships: [...prev.ships, ...producedShips],
        };
        try { localStorage.setItem('nebulife_fleet_state', JSON.stringify(next)); } catch { /* ignore quota */ }
        return next;
      });
    }
    scheduleSyncToServer();
  }, [createDockedShipFromProduction, scheduleSyncToServer]);

  useEffect(() => {
    if (explorationProductionQueue.length === 0) return;
    completeReadyExplorationProduction(Date.now());
    const id = window.setInterval(() => completeReadyExplorationProduction(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [completeReadyExplorationProduction, explorationProductionQueue.length]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      setPlanetMissionClock(now);

      const reportsToAdd: PlanetReportSummary[] = [];
      const revealUpdates: Record<string, PlanetRevealLevel> = {};
      const carrierReturns: PlanetMission[] = [];
      let changed = false;
      const next: Record<string, PlanetMission> = { ...planetMissions };

      for (const [missionId, mission] of Object.entries(planetMissions)) {
        if (mission.status === 'completed' || mission.status === 'report_ready') continue;

        const progress = getPlanetMissionProgress(mission, now);
        if (progress.phase === 'report_ready') {
          const completed = completePlanetMission(mission, now);
          next[missionId] = completed.mission;
          reportsToAdd.push(completed.report);
          revealUpdates[mission.planetId] = Math.max(
            planetRevealLevels[mission.planetId] ?? 0,
            mission.targetRevealLevel,
          ) as PlanetRevealLevel;
          changed = true;
        } else if (progress.phase !== mission.status) {
          next[missionId] = { ...mission, status: progress.phase };
          changed = true;
        }

        const currentMission = next[missionId] ?? mission;
        if (
          currentMission.carrierShipId
          && currentMission.originPlanetId
          && currentMission.carrierReturnAt
          && !currentMission.carrierReturnedAt
          && now >= currentMission.carrierReturnAt
        ) {
          const returned = { ...currentMission, carrierReturnedAt: now };
          next[missionId] = returned;
          carrierReturns.push(returned);
          changed = true;
        }
      }

      if (changed) setPlanetMissions(next);

      if (reportsToAdd.length > 0) {
        setPlanetReports((prev) => {
          const next = { ...prev };
          for (const report of reportsToAdd) next[report.planetId] = report;
          return next;
        });
        setPlanetRevealLevels((prev) => ({ ...prev, ...revealUpdates }));
        const allSystems = engineRef.current?.getAllSystems() ?? [];
        const nowTs = Date.now();
        const missionNotifs = reportsToAdd.map((report) => {
          const system = allSystems.find((entry) => entry.id === report.systemId);
          const planet = system?.planets.find((entry) => entry.id === report.planetId);
          const planetName = planet?.name ?? report.planetId;
          return {
            id: `notif-${nowTs}-${report.planetId}-${Math.random().toString(36).slice(2, 6)}`,
            text: t('mission_report.system_notif')
              .replace('{planet}', planetName)
              .replace('{tier}', String(report.revealLevel)),
            planetName,
            systemId: report.systemId,
            planetId: report.planetId,
            timestamp: nowTs,
            read: false,
          };
        });
        setSystemNotifs((prev) => [...prev, ...missionNotifs]);
        setLogEntries((prev) => [
          ...prev,
          ...missionNotifs.map((notif, index) => ({
            id: `log-${nowTs}-${notif.planetId}-${index}`,
            category: 'expedition' as const,
            text: t('mission_report.system_log')
              .replace('{planet}', notif.planetName)
              .replace('{tier}', String(reportsToAdd[index]?.revealLevel ?? '?')),
            timestamp: nowTs + index,
            planetName: notif.planetName,
            systemId: notif.systemId,
            planetId: notif.planetId,
            objectType: 'planet_mission_report',
          })),
        ]);
        scheduleSyncToServer();
      }

      if (carrierReturns.length > 0) {
        setShipFleet((prev) => ({
          ...prev,
          ships: prev.ships.map((ship) => {
            const mission = carrierReturns.find((entry) => entry.carrierShipId === ship.id);
            if (!mission) return ship;
            return {
              ...ship,
              status: 'docked',
              currentPlanetId: mission.originPlanetId ?? ship.currentPlanetId,
              destinationPlanetId: null,
              departedAt: null,
              arrivalAt: null,
              assignmentId: null,
            };
          }),
        }));
        scheduleSyncToServer();
      }
    }, 1000);

    return () => window.clearInterval(id);
  }, [planetMissions, planetRevealLevels, scheduleSyncToServer, t]);

  useEffect(() => {
    if (state.scene !== 'system' || !state.selectedSystem) {
      engineRef.current?.setSystemPlanetMissionVisuals([]);
      return;
    }

    const systemId = state.selectedSystem.id;
    const visuals = Object.values(planetMissions)
      .filter((mission) => mission.systemId === systemId && mission.status !== 'completed')
      .map((mission) => {
        const progress = getPlanetMissionProgress(mission, planetMissionClock);
        return {
          planetId: mission.planetId,
          originPlanetId: mission.originPlanetId,
          type: mission.type,
          phase: progress.phase,
          overallProgress: progress.overallProgress,
          phaseProgress: progress.phaseProgress,
        };
      });
    engineRef.current?.setSystemPlanetMissionVisuals(visuals);
  }, [planetMissionClock, planetMissions, state.scene, state.selectedSystem]);

  useEffect(() => {
    if (state.scene !== 'system' || !state.selectedSystem) {
      engineRef.current?.setSystemPlanetStatusVisuals([], false);
      return;
    }

    const statuses = state.selectedSystem.planets.map((planet) => {
      const revealLevel = planetRevealLevels[planet.id] ?? 0;
      const report = planetReports[planet.id];
      const colonyStateForPlanet = colonyState?.planetId === planet.id ? colonyState : undefined;
      return {
        planetId: planet.id,
        orbit: revealLevel >= 2 || report?.missionType === 'orbital_probe' || report?.missionType === 'orbital_scan',
        atmosphere: report?.missionType === 'deep_atmosphere_probe' || (revealLevel >= 2 && Boolean(planet.atmosphere)),
        surface: revealLevel >= 3 || report?.missionType === 'surface_landing',
        terraformed: Boolean(terraformStates[planet.id]?.completedAt),
        colony: planet.id === homeInfo?.planet.id || colonyStateForPlanet?.buildings?.some((building) => building.type === 'colony_hub'),
        life: Boolean(planet.hasLife),
        settled: (colonyStateForPlanet?.population.current ?? 0) > 0,
      };
    });
    engineRef.current?.setSystemPlanetStatusVisuals(statuses, systemPlanetStatusIconsMode);
  }, [
    colonyState,
    homeInfo?.planet.id,
    planetReports,
    planetRevealLevels,
    state.scene,
    state.selectedSystem,
    systemPlanetStatusIconsMode,
    terraformStates,
  ]);

  useEffect(() => {
    engineRef.current?.setSystemPlanetLabelsVisible(systemPlanetLabelsMode);
  }, [state.scene, state.selectedSystem?.id, systemPlanetLabelsMode]);

  const [arenaStats, setArenaStats] = useState<ArenaStats | null>(() => {
    try {
      const raw = localStorage.getItem('nebulife_arena_stats');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const normalizeArenaStats = useCallback((value: unknown): ArenaStats | null => {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Partial<ArenaStats> & { missileKills?: number };
    return {
      kills: Math.max(0, Math.floor(raw.kills ?? 0)),
      asteroidKills: Math.max(0, Math.floor(raw.asteroidKills ?? raw.missileKills ?? 0)),
      deaths: Math.max(0, Math.floor(raw.deaths ?? 0)),
      score: Math.max(0, Math.floor(raw.score ?? 0)),
      bestScore: Math.max(0, Math.floor(raw.bestScore ?? 0)),
      sessions: Math.max(0, Math.floor(raw.sessions ?? 0)),
    };
  }, []);
  const mergeArenaStats = useCallback((local: ArenaStats | null, server: ArenaStats | null): ArenaStats | null => {
    if (!local && !server) return null;
    if (!local) return server;
    if (!server) return local;
    if (local.sessions !== server.sessions) {
      const newer = local.sessions > server.sessions ? local : server;
      return { ...newer, bestScore: Math.max(local.bestScore, server.bestScore) };
    }
    return {
      kills: Math.max(local.kills, server.kills),
      asteroidKills: Math.max(local.asteroidKills, server.asteroidKills),
      deaths: Math.max(local.deaths, server.deaths),
      score: Math.max(local.score, server.score),
      bestScore: Math.max(local.bestScore, server.bestScore),
      sessions: local.sessions,
    };
  }, []);
  const handleArenaStatsCommit = useCallback((sessionStats: Omit<ArenaStats, 'bestScore' | 'sessions'>) => {
    setArenaStats((prev) => {
      const base = prev ?? { kills: 0, asteroidKills: 0, deaths: 0, score: 0, bestScore: 0, sessions: 0 };
      const next: ArenaStats = {
        kills: base.kills + sessionStats.kills,
        asteroidKills: base.asteroidKills + sessionStats.asteroidKills,
        deaths: base.deaths + sessionStats.deaths,
        score: base.score + sessionStats.score,
        bestScore: Math.max(base.bestScore, sessionStats.score),
        sessions: base.sessions + 1,
      };
      try { localStorage.setItem('nebulife_arena_stats', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    scheduleSyncToServer();
  }, [scheduleSyncToServer]);
  const [sharedLessonInfo, setSharedLessonInfo] = useState<SharedLessonInfo | null>(() => {
    // Read share params from URL on first load
    try {
      const params = new URLSearchParams(window.location.search);
      const lesson = params.get('share_lesson');
      const from = params.get('from');
      const title = params.get('title');
      if (lesson && from) {
        // Clean params from URL without a page reload
        params.delete('share_lesson');
        params.delete('from');
        params.delete('title');
        const clean = params.toString() ? `?${params.toString()}` : window.location.pathname;
        window.history.replaceState({}, '', clean);
        return { fromPlayerName: from, title: title ?? lesson };
      }
    } catch { /* ignore */ }
    return null;
  });

  // Auto-open Academy when arriving via a shared lesson link
  useEffect(() => {
    if (sharedLessonInfo) setShowAcademy(true);
  }, [sharedLessonInfo]);
  const cosmicArchiveRef = useRef<CosmicArchiveHandle>(null);
  const [highlightedGalleryType, setHighlightedGalleryType] = useState<string | null>(null);

  // ── Tutorial state ──────────────────────────────────────────────────────
  const [tutorialStep, setTutorialStep] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nebulife_tutorial_step');
      if (saved !== null) return parseInt(saved, 10);
    } catch { /* ignore */ }
    return -1; // -1 = inactive, set to 0 after onboarding
  });
  const [tutorialFreeCount, setTutorialFreeCount] = useState(0);
  const [tutorialSubStep, setTutorialSubStep] = useState(0);
  const activeTutorialStep = tutorialStep >= 0 && tutorialStep < TUTORIAL_STEPS.length
    ? TUTORIAL_STEPS[tutorialStep]
    : null;
  const isTutorialActive = activeTutorialStep !== null;
  const tutorialCompleteStep = TUTORIAL_STEPS.length;

  useEffect(() => {
    if (!surfaceTarget || needsOnboarding || isTutorialActive || showAcademy || showCosmicArchive) return;
    try {
      if (localStorage.getItem('nebulife_surface_astra_lesson_seen') === '1') return;
    } catch {
      // If localStorage is unavailable, still show the prompt for this session.
    }
    const timer = window.setTimeout(() => setShowSurfaceAstraLesson(true), 900);
    return () => window.clearTimeout(timer);
  }, [surfaceTarget, needsOnboarding, isTutorialActive, showAcademy, showCosmicArchive]);

  // Reset clock state when entering onboarding (account reset scenario)
  useEffect(() => {
    if (!needsOnboarding) return;
    setClockPhase('hidden');
    setGameStartedAt(null);
    try {
      localStorage.removeItem('nebulife_clock_revealed');
      localStorage.removeItem('nebulife_game_started_at');
    } catch { /* ignore */ }
  }, [needsOnboarding]);

  // Epic clock reveal: triggered after onboarding completes
  useEffect(() => {
    if (!isExodusPhase || clockPhase !== 'hidden' || needsOnboarding) return;
    const t = setTimeout(() => setClockPhase('syncing'), 1500);
    return () => clearTimeout(t);
  }, [isExodusPhase, clockPhase, needsOnboarding]);

  useEffect(() => {
    if (clockPhase === 'syncing') {
      const t = setTimeout(() => setClockPhase('glitch'), 2500);
      return () => clearTimeout(t);
    }
    if (clockPhase === 'glitch') {
      const t = setTimeout(() => {
        setClockPhase('visible');
        try { localStorage.setItem('nebulife_clock_revealed', '1'); } catch { /* ignore */ }
      }, 800);
      return () => clearTimeout(t);
    }
  }, [clockPhase]);

  // Play alarm 3x when the countdown timer first becomes visible (after onboarding videos).
  // Pre-mark as played if clock was already visible on mount (returning player / page refresh)
  // so the alarm only fires during the actual first reveal animation, not on every page load.
  const alarmPlayedRef = useRef(
    (() => { try { return localStorage.getItem('nebulife_clock_revealed') === '1'; } catch { return false; } })()
  );
  useEffect(() => {
    if (clockPhase !== 'visible' || alarmPlayedRef.current) return;
    alarmPlayedRef.current = true;
    playSfx('alarm', 0.25);
    const t1 = setTimeout(() => playSfx('alarm', 0.25), 2000);
    const t2 = setTimeout(() => playSfx('alarm', 0.25), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [clockPhase]);

  // Start tutorial after clock reveal completes (so timer and tutorial don't overlap)
  // Only for fresh onboarding — onboardingJustCompleted ref prevents triggering for existing players
  const onboardingJustCompletedRef = useRef(false);
  useEffect(() => {
    if (clockPhase !== 'visible' || tutorialStep !== -1 || !onboardingJustCompletedRef.current) return;
    onboardingJustCompletedRef.current = false;
    // Clock just became visible — wait a moment, then start tutorial
    const t = setTimeout(() => setTutorialStep(0), 2000);
    return () => clearTimeout(t);
  }, [clockPhase, tutorialStep]);

  // When the tutorial becomes active, force-close every full-screen overlay so
  // the tutorial pointer lands on the galaxy view it expects. ChatWidget is
  // closed via its forceCollapsed prop (see JSX below).
  useEffect(() => {
    if (!isTutorialActive) return;
    setShowArena(false);
    setShowRaid(false);
    setShowHangar(false);
    setShowCosmicArchive(false);
    setShowAcademy(false);
    setShowPlayerPage(false);
    setShowChaosModal(false);
    setShowTopUpModal(false);
    setShowColonyCenter(false);
    setSurfaceTarget(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTutorialActive]);

  // Fallback: ensure gameStartedAt is set for existing players who completed onboarding
  // Try localStorage first (before server hydration), then create new timestamp after hydration
  useEffect(() => {
    if (!isExodusPhase || needsOnboarding || gameStartedAt !== null) return;
    // Restore from localStorage immediately (no need to wait for server)
    try {
      const saved = localStorage.getItem('nebulife_game_started_at');
      if (saved) { setGameStartedAt(parseInt(saved, 10)); return; }
    } catch { /* ignore */ }
    // Wait for server hydration before creating a new timestamp on a new device
    if (!serverHydrated) return;
    const now = Date.now();
    setGameStartedAt(now);
    try { localStorage.setItem('nebulife_game_started_at', String(now)); } catch { /* ignore */ }
  }, [isExodusPhase, needsOnboarding, gameStartedAt, serverHydrated]);

  const [systemNotifs, setSystemNotifs] = useState<SystemNotif[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('nebulife_log_entries');
      if (saved) {
        const parsed = JSON.parse(saved) as LogEntry[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* ignore */ }
    return [];
  });

  // Favorite planets (synced to server for cross-device)
  const [favoritePlanets, setFavoritePlanets] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('nebulife_favorite_planets');
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch { return new Set(); }
  });
  useEffect(() => {
    try { localStorage.setItem('nebulife_favorite_planets', JSON.stringify([...favoritePlanets])); }
    catch { /* ignore */ }
  }, [favoritePlanets]);

  // Persist log entries to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem('nebulife_log_entries', JSON.stringify(logEntries));
    } catch { /* ignore quota errors */ }
  }, [logEntries]);

  // Persist tutorial step to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nebulife_tutorial_step', String(tutorialStep));
    } catch { /* ignore */ }
  }, [tutorialStep]);

  // Ref that always holds the current scene (for use inside async callbacks)
  const currentSceneRef = useRef<string>('home-intro');

  // ── System context menu state (galaxy view) ────────────────────────────
  const [showSystemMenu, setShowSystemMenu] = useState(false);
  const [systemMenuPos, setSystemMenuPos] = useState<{ x: number; y: number } | null>(null);

  // Radial menu state (replaces SystemContextMenu in galaxy view)
  const [radialSystem, setRadialSystem] = useState<StarSystem | null>(null);
  const [radialGetScreenPos, setRadialGetScreenPos] = useState<(() => { x: number; y: number } | null) | null>(null);

  // Galaxy: hovered star progress counter
  const [hoveredStarInfo, setHoveredStarInfo] = useState<{ systemId: string; progress: number } | null>(null);
  const [hoverLabelPos, setHoverLabelPos] = useState<{ x: number; y: number } | null>(null);
  const [displayedProgress, setDisplayedProgress] = useState(0);
  const progressAnimRef = useRef<number | null>(null);
  const progressAnimStartRef = useRef<{ from: number; to: number; startTime: number } | null>(null);

  // Galaxy: research labels toggle (show % above each star)
  const [researchLabelsMode, setResearchLabelsMode] = useState(false);
  // Galaxy warp overlay state
  const [galaxyWarpPhase, setGalaxyWarpPhase] = useState<'idle' | 'hyperspace'>('idle');
  const [systemPhotos, setSystemPhotos] = useState<Map<string, SystemPhotoData>>(new Map());
  const [systemMissions, setSystemMissions] = useState<Map<string, SystemMissionData>>(new Map());
  const [planetSkins, setPlanetSkins] = useState<Map<string, PlanetSkin>>(new Map());
  const [planetSkinReveal, setPlanetSkinReveal] = useState<{
    planetId: string;
    planetName: string;
    status: 'generating' | 'succeed';
    startedAt: number;
  } | null>(null);

  // ── Telescope overlay state ───────────────────────────────────────────
  const [telescopeOverlay, setTelescopeOverlay] = useState<{
    phase: 'init' | 'capture' | 'reveal';
    targetName: string;
    targetType: 'system' | 'planet';
    photoUrl: string | null;
    photoKey: string;
    source?: 'system' | 'planet' | 'mission';
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── Digest modal state ──────────────────────────────────────────────
  const [digestModalImages, setDigestModalImages] = useState<string[] | null>(null);
  const [digestModalWeekDate, setDigestModalWeekDate] = useState('');
  const [lastDigestSeen, setLastDigestSeen] = useState<string | null>(null);
  const [latestDigestWeekDate, setLatestDigestWeekDate] = useState<string | null>(null);
  const [isPremiumActive, setIsPremiumActive] = useState(() => localStorage.getItem('nebulife_premium') === '1');
  const [astraQuizAnswers, setAstraQuizAnswers] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('nebulife_astra_quiz_answers');
      if (saved) return JSON.parse(saved) as Record<string, number>;
    } catch { /* ignore */ }
    return {};
  });

  // ── Player notification preferences (from DB) ─────────────────────────
  const [playerEmail, setPlayerEmail] = useState<string | null>(null);
  const [playerAvatarUrl, setPlayerAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  // ── System objects panel state ────────────────────────────────────────
  const [showObjectsPanel, setShowObjectsPanel] = useState(false);
  const [objectsPanelSystem, setObjectsPanelSystem] = useState<StarSystem | null>(null);

  // ── System-scene research panel ────────────────────────────────────
  const [showSystemResearch, setShowSystemResearch] = useState(false);

  // ── Planet detail window state ────────────────────────────────────────
  const [planetDetailTarget, setPlanetDetailTarget] = useState<{
    system: StarSystem;
    planetIndex: number;
    displayName?: string;
  } | null>(null);

  // ── Player aliases (custom names for systems/planets) ──────────────
  const [aliases, setAliases] = useState<Record<string, string>>({});

  // ── Surface integration state for CommandBar ────────────────────────────
  const surfaceViewRef = useRef<SurfaceViewHandle>(null);
  const [surfacePhase, setSurfacePhase] = useState<SurfacePhase>('ready');
  const [surfaceBuildPanelOpen, setSurfaceBuildPanelOpen] = useState(true);
  const [surfaceBuildingCount, setSurfaceBuildingCount] = useState(0);

  const refreshQuarks = useCallback(() => {
    authFetch(`/api/player/${playerId.current}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.quarks !== undefined) setQuarks(data.quarks); })
      .catch(() => {});
  }, []);

  /** Logout: sign out from Firebase and reload.
   *
   *  Do not clear account-scoped localStorage here. A normal logout/login of
   *  the same account must keep local read markers, onboarding flags, quiz
   *  answers and other client progress. Cross-account leakage is handled by
   *  the UID-change guard in onAuthChange.
   *
   *  Reload runs in `finally` so the user never gets stuck on a stale
   *  signed-in screen even if signOut throws or its native Promise hangs
   *  beyond the inner 1.5s timeout. */
  const handleLogout = useCallback(async () => {
    try {
      await signOut();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[logout] signOut failed, reloading anyway:', err);
    } finally {
      window.location.reload();
    }
  }, []);

  /** Delete account: permanently remove all data + Firebase account. Mirrors
   *  handleStartOver's defensive pattern — disables game-state sync first so
   *  beforeunload / debounced flushes can't re-write stale localStorage after
   *  we clear it. Reload happens in finally so the user is never stranded on
   *  a half-logged-out UI even if the network call or signOut throws. */
  const handleDeleteAccount = useCallback(async () => {
    // 0. Kill any pending sync so it can't rewrite localStorage after clear.
    syncGameStateRef.current = () => {};
    if (syncTimeoutRef.current) { clearTimeout(syncTimeoutRef.current); syncTimeoutRef.current = null; }

    try {
      const res = await authFetch('/api/player/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmDelete: true }),
      });
      if (!res.ok) {
        console.error('Delete failed:', await res.text());
        return;
      }
    } catch (err) {
      console.error('Delete account error:', err);
    } finally {
      // Clear every trace. signOut is best-effort — even if it hangs or
      // throws, we still reload so the next mount starts clean.
      try { localStorage.clear(); } catch { /* ignore */ }
      try { await signOut(); } catch (err) { console.warn('[delete] signOut failed:', err); }
      window.location.reload();
    }
  }, []);

  /** Start over: full server reset, clear localStorage, generate new systems, reload */
  const handleStartOver = useCallback(async () => {
    // 0. Disable game-state sync — prevent beforeunload from re-saving old state to server
    syncGameStateRef.current = () => {};
    if (syncTimeoutRef.current) { clearTimeout(syncTimeoutRef.current); syncTimeoutRef.current = null; }

    let newGenerationIndex = 0;

    // 1. Full server reset: deletes all player data, increments generation_index, keeps quarks
    if (playerId.current) {
      try {
        const res = await authFetch('/api/player/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: playerId.current }),
        });
        if (res.ok) {
          const data = await res.json();
          newGenerationIndex = data.generation_index ?? 0;
        }
      } catch { /* ignore */ }
    }

    // 2. Clear all localStorage keys (game progress)
    const keysToRemove = [
      'nebulife_player_xp', 'nebulife_player_level', 'nebulife_research_state',
      'nebulife_tech_tree', 'nebulife_player_stats', 'nebulife_research_data',
      'nebulife_colony_resources', 'nebulife_chemical_inventory', 'nebulife_colony_state', 'nebulife_exodus_phase', 'nebulife_tutorial_step',
      'nebulife_log_entries', 'nebulife_onboarding_done', 'nebulife_scene',
      'nebulife_nav_system', 'nebulife_nav_planet', 'nebulife_destroyed_planets',
      'nebulife_favorite_planets', 'nebulife_game_started_at', 'nebulife_time_multiplier',
      'nebulife_accel_at', 'nebulife_game_time_at_accel', 'nebulife_clock_revealed',
      'nebulife_home_system_id', 'nebulife_home_planet_id', 'nebulife_generation_index',
      'nebulife_evac_system_id', 'nebulife_evac_planet_id', 'nebulife_evac_forced',
      'nebulife_evac_phase',
      // Surface progress (was missing - hex buildings, resources, harvest timers)
      'nebulife_hex_slots',
      // System navigation state
      'nebulife_pinned_systems', 'nebulife_system_order',
      // Arena + Hangar session state
      'nebulife_arena_active', 'nebulife_arena_stats', 'nebulife_arena_tutorial_done',
      'nebulife_hangar_active', 'nebulife_hangar_ship', 'nebulife_custom_ship_id', 'nebulife_custom_ship_glb_url',
      // Language + chat - reset to fresh start
      'nebulife_lang_chosen',
      'nebulife_chat_last_read_global',
      'nebulife_chat_last_read_system',
      'nebulife_last_digest_seen',
      // Terraforming
      'nebulife_terraform_states',
      'nebulife_fleet',
      'nebulife_fleet_state',
      'nebulife_planet_reveal_levels',
      'nebulife_planet_missions',
      'nebulife_planet_reports',
      'nebulife_exploration_payloads',
      'nebulife_exploration_production_queue',
      'nebulife_observatory_state',
      'nebulife_astra_quiz_answers',
      // Per-planet resources (Phase 7A)
      'nebulife_colony_resources_by_planet',
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));
    // Also remove all quiz answer keys
    Object.keys(localStorage).filter(k => k.startsWith('nebulife_quiz_')).forEach(k => localStorage.removeItem(k));
    // Legacy per-planet harvest progress (from old surface system: harvest_<planetId>)
    Object.keys(localStorage).filter(k => k.startsWith('harvest_')).forEach(k => localStorage.removeItem(k));

    // 2b. Clear React state to prevent effects from re-persisting to localStorage
    // Every useState with a localStorage.setItem useEffect must be reset here,
    // otherwise React re-renders during the warp animation (~1.5s) will write
    // the old state back to localStorage before window.location.reload().
    setEvacuationPhase('idle');
    setEvacuationTarget(null);
    setForcedEvacuation(false);
    setEvacuationPromptDismissed(false);
    setGameStartedAt(null);
    // Countdown text is no longer React state (see LiveCountdown); when
    // gameStartedAt becomes null the LiveCountdown unmounts, clearing the DOM.
    timerExpiredHandledRef.current = false;
    // Colony + research + progression state (all auto-persisted)
    setColonyResourcesByPlanet({}); // Phase 7A: resets per-planet map; derived colonyResources follows
    setResearchData(INITIAL_RESEARCH_DATA);
    setPlayerXP(0);
    setPlayerLevel(1);
    setResearchState(createResearchState(HOME_OBSERVATORY_COUNT));
    setTechTreeState(createTechTreeState());
    setPlayerStats({ totalCompletedSessions: 0, totalDiscoveries: 0, lastDiscoverySession: 0 });
    setArenaStats(null);
    setObservatoryState(createObservatoryState());
    setLogEntries([]);
    setFavoritePlanets(new Set());
    setTutorialStep(0);
    setTerraformStates({});
    setFleet([]);
    setShipFleet(createFleetState());

    // 3. Save new generation_index AFTER clearing — GameEngine will use it on reload
    localStorage.setItem('nebulife_generation_index', String(newGenerationIndex));

    // 4. Warp animation then reload
    // Create a full-screen overlay with fade + warp streaks
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#020510;opacity:0;transition:opacity 0.8s;pointer-events:all;';
    document.body.appendChild(overlay);

    // Warp streaks canvas
    const cvs = document.createElement('canvas');
    cvs.width = window.innerWidth;
    cvs.height = window.innerHeight;
    cvs.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    overlay.appendChild(cvs);
    const ctx = cvs.getContext('2d');

    // Fade in
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });

    // Generate random stars for warp
    const stars: { x: number; y: number; z: number; speed: number }[] = [];
    const cx = cvs.width / 2;
    const cy = cvs.height / 2;
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: (Math.random() - 0.5) * cvs.width * 2,
        y: (Math.random() - 0.5) * cvs.height * 2,
        z: Math.random() * 1000 + 100,
        speed: Math.random() * 8 + 4,
      });
    }

    let frame = 0;
    const maxFrames = 90; // ~1.5s at 60fps
    const animate = () => {
      if (!ctx) { window.location.reload(); return; }
      ctx.fillStyle = 'rgba(2,5,16,0.3)';
      ctx.fillRect(0, 0, cvs.width, cvs.height);

      for (const star of stars) {
        const prevZ = star.z;
        star.z -= star.speed * (1 + frame * 0.1);
        if (star.z <= 0) star.z = 1000;

        const sx = cx + (star.x / star.z) * 200;
        const sy = cy + (star.y / star.z) * 200;
        const px = cx + (star.x / prevZ) * 200;
        const py = cy + (star.y / prevZ) * 200;

        const alpha = Math.min(1, (1000 - star.z) / 600) * Math.min(1, frame / 15);
        ctx.strokeStyle = `rgba(120,170,255,${alpha.toFixed(2)})`;
        ctx.lineWidth = Math.max(0.5, 2 - star.z / 500);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }

      frame++;
      if (frame < maxFrames) {
        requestAnimationFrame(animate);
      } else {
        // Second pass: nuke any state that React effects may have re-persisted
        // during the warp animation before we reload.
        keysToRemove.forEach(k => localStorage.removeItem(k));
        Object.keys(localStorage).filter(k => k.startsWith('nebulife_quiz_')).forEach(k => localStorage.removeItem(k));
        Object.keys(localStorage).filter(k => k.startsWith('harvest_')).forEach(k => localStorage.removeItem(k));
        // Preserve generation_index (set in step 3) - re-apply after clearing
        localStorage.setItem('nebulife_generation_index', String(newGenerationIndex));
        window.location.reload();
      }
    };

    // Start warp after fade-in
    setTimeout(() => animate(), 800);
  }, []);

  /** Hydrate full game state from server on login (cross-platform sync). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hydrateGameStateFromServer = useCallback((player: any) => {
    // Language sync rules:
    //   1. If the player made an explicit first-run picker choice
    //      (`nebulife_lang_chosen === '1'`) AND localStorage differs from
    //      the server value, push CLIENT → SERVER. Prevents the new-account
    //      reset loop where the server returns the default 'uk' and wipes
    //      the player's explicit EN choice on every sign-in (tester:
    //      "заходжу з 0ля з тим же імейлом обираючи англ —
    //      мені ставить укр інтерфейс").
    //   2. Otherwise trust the server — covers cross-device sync
    //      (pick UK on phone A, log in on phone B, see UK).
    try {
      const serverLang = player?.preferred_language;
      if (serverLang && (serverLang === 'uk' || serverLang === 'en')) {
        const current = localStorage.getItem('nebulife_lang');
        const clientExplicit = localStorage.getItem('nebulife_lang_chosen') === '1';
        // For a brand-new player (first sync after registration) the server
        // row only carries the migration default 'uk'. We always prefer the
        // client's locally-detected or picker-chosen language in that case
        // — otherwise an EN-speaking tester who re-registers after an
        // account wipe silently ends up on a UK interface.
        const isFreshPlayer = player?.game_phase === 'onboarding';
        if (current !== serverLang) {
          const clientLangOk = current === 'uk' || current === 'en';
          if ((clientExplicit || isFreshPlayer) && clientLangOk) {
            // Push client choice up to the server — don't overwrite local.
            void authFetch('/api/player/language', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ language: current }),
            }).catch(() => { /* non-critical */ });
          } else {
            // Trust server.
            localStorage.setItem('nebulife_lang', serverLang);
            setLanguage(serverLang as Language);
            void i18n.changeLanguage(serverLang);
          }
        }
      }
    } catch { /* ignore */ }

    const gs = player?.game_state as Partial<SyncedGameState> | undefined;
    if (!gs || typeof gs !== 'object') {
      serverHydratedRef.current = true;
      setServerHydrated(true);
      return;
    }

    // Safety net: if player just reset (game_phase === 'onboarding'), force defaults.
    // Do not apply this to returning players whose game_state already confirms
    // onboarding_done; older rows can retain a stale game_phase.
    if (player?.game_phase === 'onboarding' && !gs.onboarding_done) {
      setResearchState(createResearchState(HOME_OBSERVATORY_COUNT));
      setResearchData(INITIAL_RESEARCH_DATA);
      setObservatoryState(createObservatoryState());
      setIsExodusPhase(true);
      try { localStorage.setItem('nebulife_research_state', JSON.stringify(createResearchState(HOME_OBSERVATORY_COUNT))); } catch { /* ignore */ }
      try { localStorage.setItem('nebulife_research_data', String(INITIAL_RESEARCH_DATA)); } catch { /* ignore */ }
      try { localStorage.setItem('nebulife_observatory_state', JSON.stringify(createObservatoryState())); } catch { /* ignore */ }
      try { localStorage.setItem('nebulife_exodus_phase', 'true'); } catch { /* ignore */ }
      // Clear stale home/evacuation IDs so they don't corrupt the new generation
      try {
        localStorage.removeItem('nebulife_home_system_id');
        localStorage.removeItem('nebulife_home_planet_id');
        localStorage.removeItem('nebulife_evac_system_id');
        localStorage.removeItem('nebulife_evac_planet_id');
        localStorage.removeItem('nebulife_evac_forced');
        localStorage.removeItem('nebulife_evac_phase');
      } catch { /* ignore */ }
      gameStateRef.current = {};
      serverHydratedRef.current = true;
      setServerHydrated(true);
      return;
    }

    gameStateRef.current = { ...gs };

    // Progression
    if (typeof gs.xp === 'number' && gs.xp >= 0) {
      const localXP = parseCompactNumber(localStorage.getItem('nebulife_player_xp') ?? '0') ?? 0;
      const resolvedXP = Math.max(gs.xp, localXP);
      setPlayerXP(resolvedXP);
      setPlayerLevel(typeof gs.level === 'number' && gs.level > 0 ? Math.max(gs.level, levelFromXP(resolvedXP)) : levelFromXP(resolvedXP));
      try { localStorage.setItem('nebulife_player_xp', String(resolvedXP)); } catch { /* ignore */ }
      try { localStorage.setItem('nebulife_player_level', String(Math.max(gs.level ?? 0, levelFromXP(resolvedXP)))); } catch { /* ignore */ }
    }

    // Research — hydrate from server, but NEVER overwrite a local empty-slots state.
    // After evacuation, local slots=[] is the ground truth. The server may still have
    // stale 3-slot data if the sync didn't complete before page reload / beforeunload.
    if (gs.research_state && typeof gs.research_state === 'object') {
      const rs = gs.research_state as ResearchState;
      if (Array.isArray(rs.slots) && typeof rs.systems === 'object') {
        // If local has 0 slots (post-evacuation reset) but server has >0 — trust local.
        // An empty slots array is always an intentional action (evacuation) that must win.
        let localResearch: ResearchState | null = null;
        try {
          const raw = localStorage.getItem('nebulife_research_state');
          if (raw) localResearch = JSON.parse(raw);
        } catch { /* ignore */ }

        const localHasEmptySlots = localResearch
          && Array.isArray(localResearch.slots)
          && localResearch.slots.length === 0;
        const serverHasSlots = rs.slots.length > 0;

        if (localHasEmptySlots && serverHasSlots) {
          // Post-evacuation: local was explicitly emptied, server is stale — keep local
          const pid = playerId.current;
          if (pid) {
            updatePlayer(pid, {
              game_state: { ...gs, research_state: localResearch } as unknown as Record<string, unknown>,
            }).catch(() => {});
          }
        } else {
          // Compare progress scores: whoever has more discovered nodes wins
          const getProgressScore = (research: unknown): number => {
            const r = research as { systems?: Record<string, { discoveredNodes?: Record<string, unknown> }> } | null;
            if (!r || !r.systems) return 0;
            return Object.values(r.systems).reduce((total: number, sys) => {
              const nodesCount = sys.discoveredNodes ? Object.keys(sys.discoveredNodes).length : 0;
              return total + nodesCount + 1;
            }, 0);
          };
          const localScore = getProgressScore(localResearch);
          const serverScore = getProgressScore(rs);

          if (localScore >= serverScore && localResearch) {
            // Local has more or equal progress — keep local, push to server
            const pid = playerId.current;
            if (pid) {
              updatePlayer(pid, {
                game_state: { ...gs, research_state: localResearch } as unknown as Record<string, unknown>,
              }).catch(() => {});
            }
          } else {
            // Server has more progress — use server data
            setResearchState(rs);
            try { localStorage.setItem('nebulife_research_state', JSON.stringify(rs)); } catch { /* ignore */ }
          }
        }
      }
    }
    if (gs.player_stats && typeof gs.player_stats === 'object') {
      const localStats = (() => { try { return JSON.parse(localStorage.getItem('nebulife_player_stats') ?? 'null'); } catch { return null; } })();
      const resolved = {
        ...gs.player_stats,
        totalCompletedSessions: Math.max(gs.player_stats.totalCompletedSessions ?? 0, localStats?.totalCompletedSessions ?? 0),
        totalDiscoveries: Math.max(gs.player_stats.totalDiscoveries ?? 0, localStats?.totalDiscoveries ?? 0),
        lastDiscoverySession: Math.max(gs.player_stats.lastDiscoverySession ?? 0, localStats?.lastDiscoverySession ?? 0),
      };
      setPlayerStats(resolved);
      try { localStorage.setItem('nebulife_player_stats', JSON.stringify(resolved)); } catch { /* ignore */ }
    }
    const serverArenaStats = normalizeArenaStats(gs.arena_stats);
    const localArenaStats = (() => {
      try { return normalizeArenaStats(JSON.parse(localStorage.getItem('nebulife_arena_stats') ?? 'null')); }
      catch { return null; }
    })();
    const resolvedArenaStats = mergeArenaStats(localArenaStats, serverArenaStats);
    setArenaStats(resolvedArenaStats);
    try {
      if (resolvedArenaStats) localStorage.setItem('nebulife_arena_stats', JSON.stringify(resolvedArenaStats));
      else localStorage.removeItem('nebulife_arena_stats');
    } catch { /* ignore */ }
    try {
      if (gs.hangar_ship === 'blue' || gs.hangar_ship === 'red' || gs.hangar_ship === 'custom') {
        localStorage.setItem('nebulife_hangar_ship', gs.hangar_ship);
      }
      if (typeof gs.custom_ship_id === 'string' && gs.custom_ship_id) {
        localStorage.setItem('nebulife_custom_ship_id', gs.custom_ship_id);
      }
      if (typeof gs.custom_ship_glb_url === 'string' && gs.custom_ship_glb_url) {
        localStorage.setItem('nebulife_custom_ship_glb_url', gs.custom_ship_glb_url);
      }
    } catch { /* ignore */ }
    if (typeof gs.research_data === 'number') {
      const lastRegenTime = gs.last_regen_time ?? Date.now();
      const hoursOffline = (Date.now() - lastRegenTime) / 3_600_000;
      const techBonus = getEffectValue(techTreeStateRef.current, 'research_data_regen', 0);
      const offlineGain = Math.floor(hoursOffline * (1 + techBonus));
      const serverValue = gs.research_data + (offlineGain > 0 ? offlineGain : 0);
      // Keep the higher of localStorage float (has fractional progress) or server + offline
      const localSaved = parseCompactNumber(localStorage.getItem('nebulife_research_data') ?? '0') ?? 0;
      const loadedValue = Math.max(serverValue, localSaved);
      setResearchData(loadedValue);
      try { localStorage.setItem('nebulife_research_data', String(loadedValue)); } catch { /* ignore */ }
    }

    // Colony — Phase 7A: prefer per-planet map; fall back to legacy global object
    if (gs.colony_resources_by_planet && typeof gs.colony_resources_by_planet === 'object') {
      const serverMap = gs.colony_resources_by_planet as Record<string, { minerals: number; volatiles: number; isotopes: number; water: number }>;
      if (Object.keys(serverMap).length > 0) {
        // Max-merge per planet with local values
        const localMap = (() => { try { return JSON.parse(localStorage.getItem('nebulife_colony_resources_by_planet') ?? 'null') as Record<string, { minerals: number; volatiles: number; isotopes: number; water: number }> | null; } catch { return null; } })();
        const merged: Record<string, { minerals: number; volatiles: number; isotopes: number; water: number }> = { ...(localMap ?? {}) };
        for (const [pid, sr] of Object.entries(serverMap)) {
          const lr = merged[pid] ?? { minerals: 0, volatiles: 0, isotopes: 0, water: 0 };
          merged[pid] = {
            minerals:  Math.max(sr.minerals  ?? 0, lr.minerals),
            volatiles: Math.max(sr.volatiles ?? 0, lr.volatiles),
            isotopes:  Math.max(sr.isotopes  ?? 0, lr.isotopes),
            water:     Math.max(sr.water     ?? 0, lr.water),
          };
        }
        setColonyResourcesByPlanet(merged);
        try { localStorage.setItem('nebulife_colony_resources_by_planet', JSON.stringify(merged)); } catch { /* ignore */ }
      }
    } else if (gs.colony_resources && typeof gs.colony_resources === 'object') {
      // Legacy path: server only has the old global object.
      // Merge with local and persist to the old key so the per-planet migration
      // effect (triggered by homeInfo) can pick it up when the home planet is known.
      const raw = gs.colony_resources as Record<string, number>;
      const localCR = (() => { try { return JSON.parse(localStorage.getItem('nebulife_colony_resources') ?? 'null'); } catch { return null; } })();
      const cr = {
        minerals: Math.max(raw.minerals ?? 0, localCR?.minerals ?? 0),
        volatiles: Math.max(raw.volatiles ?? 0, localCR?.volatiles ?? 0),
        isotopes: Math.max(raw.isotopes ?? 0, localCR?.isotopes ?? 0),
        water: Math.max(raw.water ?? 0, localCR?.water ?? 0),
      };
      try { localStorage.setItem('nebulife_colony_resources', JSON.stringify(cr)); } catch { /* ignore */ }
      // If homeInfo already known, migrate immediately; otherwise migration effect handles it
      const hpid = homeInfoRef.current?.planet.id;
      if (hpid) {
        setColonyResourcesByPlanet(prev => {
          const existing = prev[hpid] ?? { minerals: 0, volatiles: 0, isotopes: 0, water: 0 };
          return {
            ...prev,
            [hpid]: {
              minerals:  Math.max(cr.minerals,  existing.minerals),
              volatiles: Math.max(cr.volatiles, existing.volatiles),
              isotopes:  Math.max(cr.isotopes,  existing.isotopes),
              water:     Math.max(cr.water,     existing.water),
            },
          };
        });
      }
    }
    if (gs.chemical_inventory && typeof gs.chemical_inventory === 'object') {
      const localCI = (() => { try { return JSON.parse(localStorage.getItem('nebulife_chemical_inventory') ?? 'null'); } catch { return null; } })();
      const merged: Record<string, number> = {};
      for (const key of new Set([...Object.keys(gs.chemical_inventory as Record<string, number>), ...Object.keys(localCI ?? {})])) {
        merged[key] = Math.max((gs.chemical_inventory as Record<string, number>)[key] ?? 0, localCI?.[key] ?? 0);
      }
      setChemicalInventory(merged);
      try { localStorage.setItem('nebulife_chemical_inventory', JSON.stringify(merged)); } catch { /* ignore */ }
    }

    // Game phase
    if (typeof gs.exodus_phase === 'boolean') {
      setIsExodusPhase(gs.exodus_phase);
      try { localStorage.setItem('nebulife_exodus_phase', String(gs.exodus_phase)); } catch { /* ignore */ }
    }
    if (Array.isArray(gs.destroyed_planets)) {
      try { localStorage.setItem('nebulife_destroyed_planets', JSON.stringify(gs.destroyed_planets)); } catch { /* ignore */ }
    }
    if (gs.onboarding_done) {
      try { localStorage.setItem('nebulife_onboarding_done', '1'); } catch { /* ignore */ }
      setNeedsOnboarding(false);
      // Clear cinematicActive that was set by legacy auth check (cache-clear scenario)
      setCinematicActive(false);
    }
    if (typeof gs.tutorial_step === 'number') {
      setTutorialStep(gs.tutorial_step);
      try { localStorage.setItem('nebulife_tutorial_step', String(gs.tutorial_step)); } catch { /* ignore */ }
    }
    // Tech tree
    if (gs.tech_tree && typeof gs.tech_tree === 'object') {
      const tt = gs.tech_tree as TechTreeState;
      if (tt.researched && typeof tt.researched === 'object') {
        const localTT = (() => { try { return JSON.parse(localStorage.getItem('nebulife_tech_tree') ?? 'null'); } catch { return null; } })();
        const merged = {
          ...tt,
          researched: { ...tt.researched, ...(localTT?.researched ?? {}) },
        };
        setTechTreeState(merged);
        try { localStorage.setItem('nebulife_tech_tree', JSON.stringify(merged)); } catch { /* ignore */ }
      }
    }

    // Timer
    if (typeof gs.game_started_at === 'number') {
      setGameStartedAt(gs.game_started_at);
      try { localStorage.setItem('nebulife_game_started_at', String(gs.game_started_at)); } catch { /* ignore */ }
    }
    if (typeof gs.time_multiplier === 'number') {
      setTimeMultiplier(gs.time_multiplier);
      try { localStorage.setItem('nebulife_time_multiplier', String(gs.time_multiplier)); } catch { /* ignore */ }
    }
    if (typeof gs.accel_at === 'number') {
      setAccelAt(gs.accel_at);
      try { localStorage.setItem('nebulife_accel_at', String(gs.accel_at)); } catch { /* ignore */ }
    }
    if (typeof gs.game_time_at_accel === 'number') {
      setGameTimeAtAccel(gs.game_time_at_accel);
      try { localStorage.setItem('nebulife_game_time_at_accel', String(gs.game_time_at_accel)); } catch { /* ignore */ }
    }
    if (gs.clock_revealed) {
      try { localStorage.setItem('nebulife_clock_revealed', '1'); } catch { /* ignore */ }
      // Directly set clockPhase for returning players (skip the 4.8s reveal animation)
      setClockPhase('visible');
    }

    // Navigation: returning players always land on the Star Group, even if the
    // last persisted scene was a system or planet view on another device.
    if (gs.onboarding_done) {
      setState(prev => ({ ...prev, scene: 'galaxy', selectedSystem: null, selectedPlanet: null }));
      try { localStorage.setItem('nebulife_scene', 'galaxy'); } catch { /* ignore */ }
    } else if (gs.scene && typeof gs.scene === 'string') {
      const validScenes: SceneType[] = ['home-intro', 'galaxy', 'system', 'planet-view'];
      if (validScenes.includes(gs.scene as SceneType)) {
        setState(prev => ({ ...prev, scene: gs.scene as SceneType }));
        try { localStorage.setItem('nebulife_scene', gs.scene); } catch { /* ignore */ }
      }
    }

    // Log entries (бортовий журнал)
    if (Array.isArray(gs.log_entries) && gs.log_entries.length > 0) {
      setLogEntries(gs.log_entries as LogEntry[]);
      try { localStorage.setItem('nebulife_log_entries', JSON.stringify(gs.log_entries)); } catch { /* ignore */ }
    }
    // Favorite planets
    if (Array.isArray(gs.favorite_planets)) {
      setFavoritePlanets(new Set(gs.favorite_planets));
      try { localStorage.setItem('nebulife_favorite_planets', JSON.stringify(gs.favorite_planets)); } catch { /* ignore */ }
    }
    // Evacuation target — restore or CLEAR based on server state
    // Skip if evac target matches current home (colonization already completed)
    const authHomeSystemId = (player.home_system_id && typeof player.home_system_id === 'string')
      ? player.home_system_id : (gs.home_system_id || null);
    const authHomePlanetId = (player.home_planet_id && typeof player.home_planet_id === 'string')
      ? player.home_planet_id : (gs.home_planet_id || null);
    const evacMatchesHome = gs.evac_system_id && gs.evac_planet_id
      && gs.evac_system_id === authHomeSystemId
      && gs.evac_planet_id === authHomePlanetId;
    if (gs.evac_system_id && gs.evac_planet_id && !evacMatchesHome) {
      // Active evacuation on server — restore locally
      try { localStorage.setItem('nebulife_evac_system_id', gs.evac_system_id); } catch { /* ignore */ }
      try { localStorage.setItem('nebulife_evac_planet_id', gs.evac_planet_id); } catch { /* ignore */ }
      try { localStorage.setItem('nebulife_evac_forced', String(gs.evac_forced === true)); } catch { /* ignore */ }
      pendingEvacRef.current = {
        systemId: gs.evac_system_id,
        planetId: gs.evac_planet_id,
        forced: gs.evac_forced === true,
      };
    } else {
      // No active evacuation on server — clear stale local state
      try { localStorage.removeItem('nebulife_evac_system_id'); } catch { /* ignore */ }
      try { localStorage.removeItem('nebulife_evac_planet_id'); } catch { /* ignore */ }
      try { localStorage.removeItem('nebulife_evac_forced'); } catch { /* ignore */ }
      try { localStorage.removeItem('nebulife_evac_phase'); } catch { /* ignore */ }
      pendingEvacRef.current = null;
      setEvacuationPhase('idle');
      setEvacuationTarget(null);
      setForcedEvacuation(false);
      setEvacuationPromptDismissed(false);
    }

    // Home planet — read from direct DB columns (most authoritative, updated on every evacuation landing)
    // player.home_system_id / player.home_planet_id are top-level PlayerRow columns, NOT inside game_state JSONB.
    // Belt-and-suspenders: fall back to game_state JSONB (gs.home_system_id) for older records.
    const dbHomeSystemId = (player.home_system_id && typeof player.home_system_id === 'string')
      ? player.home_system_id : null;
    const dbHomePlanetId = (player.home_planet_id && typeof player.home_planet_id === 'string')
      ? player.home_planet_id : null;
    const finalHomeSystemId = dbHomeSystemId ?? (gs.home_system_id || null);
    const finalHomePlanetId = dbHomePlanetId ?? (gs.home_planet_id || null);
    if (finalHomeSystemId && finalHomePlanetId) {
      try { localStorage.setItem('nebulife_home_system_id', finalHomeSystemId); } catch { /* ignore */ }
      try { localStorage.setItem('nebulife_home_planet_id', finalHomePlanetId); } catch { /* ignore */ }
      // If engine is already initialized (hydration ran after engine init), update it immediately
      engineRef.current?.updateHomeSystem(finalHomeSystemId, finalHomePlanetId);
      // Store for post-engine-init resolution (in case engine not ready yet)
      pendingHomeRef.current = { systemId: finalHomeSystemId, planetId: finalHomePlanetId };
    }

    // Terraform states — merge: take Math.max(local.progress, server.progress) per param
    if (gs.terraform_states && typeof gs.terraform_states === 'object') {
      const serverTf = gs.terraform_states as Record<string, PlanetTerraformState>;
      setTerraformStates((localTf) => {
        const merged: Record<string, PlanetTerraformState> = { ...localTf };
        for (const [planetId, serverState] of Object.entries(serverTf)) {
          const localState = localTf[planetId];
          if (!localState) {
            merged[planetId] = serverState;
          } else {
            // Per-param max merge
            const params = { ...localState.params };
            for (const key of Object.keys(serverState.params) as Array<keyof typeof serverState.params>) {
              params[key] = {
                progress: Math.max(localState.params[key]?.progress ?? 0, serverState.params[key]?.progress ?? 0),
                lastDeliveryAt: Math.max(
                  localState.params[key]?.lastDeliveryAt ?? 0,
                  serverState.params[key]?.lastDeliveryAt ?? 0,
                ) || null,
              };
            }
            merged[planetId] = {
              ...localState,
              params,
              completedAt: localState.completedAt ?? serverState.completedAt,
            };
          }
        }
        return merged;
      });
    }

    // Fleet — restore in-flight missions from server (do not overwrite local if local has more)
    if (Array.isArray(gs.fleet) && (gs.fleet as Mission[]).length > 0) {
      const serverFleet = gs.fleet as Mission[];
      setFleet((localFleet) => {
        if (localFleet.length >= serverFleet.length) return localFleet;
        return serverFleet;
      });
    }

    if (gs.fleet_state && typeof gs.fleet_state === 'object') {
      const serverFleetState = gs.fleet_state as FleetState;
      setShipFleet((localFleetState) => {
        if ((localFleetState.ships?.length ?? 0) >= (serverFleetState.ships?.length ?? 0)) return localFleetState;
        return {
          ships: serverFleetState.ships ?? [],
          cargoShipments: serverFleetState.cargoShipments ?? [],
          routes: serverFleetState.routes ?? [],
          productionQueues: serverFleetState.productionQueues ?? {},
        };
      });
    }

    // Planet exploration missions — merge by latest mission/report timestamps.
    if (gs.planet_reveal_levels && typeof gs.planet_reveal_levels === 'object') {
      const serverReveal = gs.planet_reveal_levels as Record<string, PlanetRevealLevel>;
      setPlanetRevealLevels((localReveal) => {
        const merged: Record<string, PlanetRevealLevel> = { ...localReveal };
        for (const [planetId, level] of Object.entries(serverReveal)) {
          merged[planetId] = Math.max(merged[planetId] ?? 0, level) as PlanetRevealLevel;
        }
        return merged;
      });
    }

    if (gs.planet_missions && typeof gs.planet_missions === 'object') {
      const serverMissions = gs.planet_missions as Record<string, PlanetMission>;
      setPlanetMissions((localMissions) => {
        const merged: Record<string, PlanetMission> = { ...localMissions };
        for (const [missionId, serverMission] of Object.entries(serverMissions)) {
          const localMission = localMissions[missionId];
          if (!localMission || (serverMission.completedAt ?? serverMission.startedAt) >= (localMission.completedAt ?? localMission.startedAt)) {
            merged[missionId] = serverMission;
          }
        }
        return merged;
      });
    }

    if (gs.planet_reports && typeof gs.planet_reports === 'object') {
      const serverReports = gs.planet_reports as Record<string, PlanetReportSummary>;
      setPlanetReports((localReports) => {
        const merged: Record<string, PlanetReportSummary> = { ...localReports };
        for (const [planetId, serverReport] of Object.entries(serverReports)) {
          const localReport = localReports[planetId];
          if (!localReport || serverReport.generatedAt >= localReport.generatedAt) {
            merged[planetId] = serverReport;
          }
        }
        return merged;
      });
    }

    if (gs.exploration_payloads && typeof gs.exploration_payloads === 'object') {
      const serverPayloads = gs.exploration_payloads as Partial<Record<ProducibleType, number>>;
      setExplorationPayloads((localPayloads) => {
        const merged: Partial<Record<ProducibleType, number>> = { ...localPayloads };
        for (const [type, count] of Object.entries(serverPayloads) as Array<[ProducibleType, number]>) {
          merged[type] = Math.max(merged[type] ?? 0, count ?? 0);
        }
        return merged;
      });
    }

    if (Array.isArray(gs.exploration_production_queue) && gs.exploration_production_queue.length > 0) {
      const serverQueue = gs.exploration_production_queue as ExplorationPayloadProductionItem[];
      setExplorationProductionQueue((localQueue) => {
        const byId = new Map(localQueue.map((item) => [item.id, item]));
        for (const item of serverQueue) byId.set(item.id, item);
        return [...byId.values()];
      });
    }

    if (gs.observatory_state && typeof gs.observatory_state === 'object') {
      const serverObservatory = normalizeObservatoryState(gs.observatory_state);
      setObservatoryState((localObservatory) => {
        const local = normalizeObservatoryState(localObservatory);
        const sessionsById = new Map(local.sessions.map((session) => [session.id, session]));
        for (const session of serverObservatory.sessions) sessionsById.set(session.id, session);
        const events = { ...local.events };
        for (const [type, record] of Object.entries(serverObservatory.events)) {
          const existing = events[type];
          events[type] = existing
            ? {
                ...record,
                count: Math.max(existing.count, record.count),
                firstDiscoveredAt: Math.min(existing.firstDiscoveredAt, record.firstDiscoveredAt),
                lastDiscoveredAt: Math.max(existing.lastDiscoveredAt, record.lastDiscoveredAt),
              }
            : record;
        }
        const reportsById = new Map((local.reports ?? []).map((report) => [report.id, report]));
        for (const report of serverObservatory.reports ?? []) reportsById.set(report.id, report);
        return {
          ...local,
          xp: Math.max(local.xp, serverObservatory.xp),
          searchesCompleted: Math.max(local.searchesCompleted, serverObservatory.searchesCompleted),
          successfulSignals: Math.max(local.successfulSignals, serverObservatory.successfulSignals),
          duplicateSignals: Math.max(local.duplicateSignals, serverObservatory.duplicateSignals),
          duplicateStreak: Math.max(local.duplicateStreak, serverObservatory.duplicateStreak),
          sessions: [...sessionsById.values()],
          events,
          reports: [...reportsById.values()]
            .sort((a, b) => a.completedAt - b.completedAt)
            .slice(-25),
        };
      });
    }

    if (gs.astra_quiz_answers && typeof gs.astra_quiz_answers === 'object') {
      setAstraQuizAnswers((localAnswers) => ({
        ...localAnswers,
        ...(gs.astra_quiz_answers as Record<string, number>),
      }));
    }

    // Planet overrides — merge: server wins on a per-planet basis (promotedAt tie-break)
    if (gs.planet_overrides && typeof gs.planet_overrides === 'object') {
      const serverOverrides = gs.planet_overrides as Record<string, PlanetOverride>;
      if (Object.keys(serverOverrides).length > 0) {
        setPlanetOverrides((localOverrides) => {
          const merged: Record<string, PlanetOverride> = { ...localOverrides };
          for (const [pid, serverOv] of Object.entries(serverOverrides)) {
            const localOv = localOverrides[pid];
            // Keep whichever override was applied most recently
            if (!localOv || (serverOv.promotedAt ?? 0) >= (localOv.promotedAt ?? 0)) {
              merged[pid] = serverOv;
            }
          }
          return merged;
        });
      }
    }

    // Planet resource stocks (v168) — take the minimum (more depleted) per resource
    // so that a player who plays on two devices doesn't regenerate stocks.
    if (gs.planet_resource_stocks && typeof gs.planet_resource_stocks === 'object') {
      const serverStocks = gs.planet_resource_stocks as Record<string, PlanetResourceStocks>;
      if (Object.keys(serverStocks).length > 0) {
        const localStocks = (() => {
          try {
            return JSON.parse(localStorage.getItem('nebulife_planet_resource_stocks') ?? 'null') as Record<string, PlanetResourceStocks> | null;
          } catch { return null; }
        })();
        const merged: Record<string, PlanetResourceStocks> = { ...(localStocks ?? {}) };
        for (const [pid, serverS] of Object.entries(serverStocks)) {
          const localS = merged[pid];
          if (!localS) {
            merged[pid] = serverS;
          } else {
            // Keep the more depleted remaining (minimum) per resource
            merged[pid] = {
              initial: serverS.initial,
              remaining: {
                minerals:  Math.min(localS.remaining.minerals,  serverS.remaining.minerals),
                volatiles: Math.min(localS.remaining.volatiles, serverS.remaining.volatiles),
                isotopes:  Math.min(localS.remaining.isotopes,  serverS.remaining.isotopes),
                water:     Math.min(localS.remaining.water,     serverS.remaining.water),
              },
            };
          }
        }
        setPlanetResourceStocks(merged);
        try { localStorage.setItem('nebulife_planet_resource_stocks', JSON.stringify(merged)); } catch { /* ignore */ }
      }
    }

    // Player meta (notification prefs, language, digest seen)
    if (player.email !== undefined) setPlayerEmail(player.email ?? null);
    if (player.avatar_url !== undefined) setPlayerAvatarUrl(player.avatar_url ?? null);
    if (typeof player.email_notifications === 'boolean') setEmailNotifications(player.email_notifications);
    if (typeof player.push_notifications === 'boolean') setPushNotifications(player.push_notifications);
    if (player.last_digest_seen !== undefined) setLastDigestSeen(player.last_digest_seen ?? null);
    setAdsUnlockedAfterSettlement(player.game_phase === 'colonizing');
    // Language: localStorage is always the source of truth.
    // Never override from server — player chose their language at first launch.

    serverHydratedRef.current = true;
    setServerHydrated(true);
  }, [mergeArenaStats, normalizeArenaStats]);

  // ── Firebase auth lifecycle ──────────────────────────────────────────
  useEffect(() => {
    // Fallback: Firebase not configured → use legacy localStorage player ID
    if (!isFirebaseConfigured) {
      const PLAYER_ID_KEY = 'nebulife_player_id';
      let id = localStorage.getItem(PLAYER_ID_KEY);
      if (!id) {
        id = `player-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem(PLAYER_ID_KEY, id);
      }
      playerId.current = id;
      // Legacy: check if onboarding done
      if (!localStorage.getItem('nebulife_onboarding_done')) {
        setNeedsOnboarding(true);
        setCinematicActive(true);
      }
      // Ensure legacy player exists in DB (create if missing)
      (async () => {
        try {
          const existing = await getPlayer(id!);
          if (!existing) {
            console.log('[Legacy] Player not in DB, creating:', id);
            const created = await createPlayer({
              id: id!,
              name: 'Explorer',
              homeSystemId: 'home',
              homePlanetId: 'home',
            });
            setQuarks(created.quarks ?? 0);
            if (created.global_index != null) globalPlayerIndexRef.current = created.global_index;
            try { localStorage.setItem('nebulife_generation_index', String(created.science_points ?? 0)); } catch { /* ignore */ }
            hydrateGameStateFromServer(created);
            setState((prev) => ({ ...prev, playerName: created.callsign || created.name || 'Explorer' }));
            // Starter toast moved to handleOnboardingComplete — firing it
            // here rendered it under the cinematic intro overlay (z-index
            // 10005 > 9750) so player couldn't see/click it.
          } else {
            setQuarks(existing.quarks ?? 0);
            if (existing.global_index != null) globalPlayerIndexRef.current = existing.global_index;
            try { localStorage.setItem('nebulife_generation_index', String(existing.science_points ?? 0)); } catch { /* ignore */ }
            hydrateGameStateFromServer(existing);
            setState((prev) => ({ ...prev, playerName: existing.callsign || existing.name || 'Explorer' }));
            // Initialize RevenueCat IAP (no-op on web)
            initIAP(id!).catch(() => { /* non-critical */ });
            checkPremiumStatus()
              .then((status) => {
                setIsPremiumActive(status.active);
                interstitialManager.setPremium(status.active);
              })
              .catch(() => { /* non-critical */ });
          }
          // Daily login bonus check — fires once per UTC day (server-side idempotent)
          claimDailyLoginBonusOnce().catch(() => { /* soft-fail */ });
          // Fetch universe info for group count
          fetchUniverseInfo().then(info => {
            universeGroupCountRef.current = info.groupCount;
            universeEngineRef.current?.updateGroupCount(info.groupCount);
            engineRef.current?.setGroupInfo(globalPlayerIndexRef.current, info.groupCount);
          }).catch(() => { /* use default */ });
        } catch (err) {
          console.warn('[Legacy] Failed to ensure player in DB:', err);
        }
      })();
      setAuthLoading(false);
      return;
    }

    // Guard against the "AuthScreen flashes between loader and game" flicker:
    // Firebase fires onAuthStateChanged(null) synchronously at startup with
    // the DEFAULT persistence (before our async setPersistence(indexedDB*)
    // finishes restoring the stored user). Then it fires again (user) a few
    // hundred ms later. Clearing `authLoading` on the first null event would
    // briefly render <AuthScreen> (with the "You have saved progress" banner
    // for legacy users) before the real user resolves.
    //
    // Strategy: debounce `authLoading=false` on null events by 800ms. Any
    // subsequent event (including a real user) cancels the pending timer
    // and resolves immediately. Genuinely logged-out users see an extra
    // ~0.5s of loading screen — unnoticeable and strictly better than the
    // flicker experience.
    let authNullResolveTimer: ReturnType<typeof setTimeout> | null = null;
    // Auth event version: Firebase can fire `user → null → user` quickly.
    // The async callback for event A (user) may still be awaiting its DB
    // register call when event B (null) fires, which spawns a parallel
    // invocation. If A's post-await writes (playerId.current = user.uid,
    // setQuarks, etc) run AFTER B's else-branch (playerId.current = ''),
    // we end up in an inconsistent state: firebaseUser=null but
    // playerId.current='abc' — the UI then shows AuthScreen AND the game
    // HUD simultaneously (observed in APK as a rapid flicker between
    // "saved progress" AuthScreen and the game body).
    //
    // Fix: stamp each invocation with a monotonic version. Any ref/state
    // mutation that happens AFTER an await verifies it's still the latest
    // event; if a newer event arrived, the stale invocation bails out.
    let authEventSeq = 0;
    let nativeAuthWatchdog: number | null = Capacitor.isNativePlatform()
      ? window.setTimeout(() => {
          if (!isFirebaseConfigured || !authLoading) return;
          const current = getCurrentUser();
          if (current) {
            setFirebaseUser(current);
            playerId.current = current.uid;
            setIsGuest(current.isAnonymous);
          }
          setAuthLoading(false);
          console.warn('[Auth] Native auth restore timed out; continuing startup.');
          nativeAuthWatchdog = null;
        }, 4500)
      : null;

    const unsubscribe = onAuthChange(async (user) => {
      if (nativeAuthWatchdog !== null) {
        window.clearTimeout(nativeAuthWatchdog);
        nativeAuthWatchdog = null;
      }

      const myVersion = ++authEventSeq;
      const isLatest = () => myVersion === authEventSeq;

      setFirebaseUser(user);

      if (authNullResolveTimer !== null) {
        clearTimeout(authNullResolveTimer);
        authNullResolveTimer = null;
      }

      if (user) {
        setAuthLoading(false);
      } else {
        authNullResolveTimer = setTimeout(() => {
          setAuthLoading(false);
          authNullResolveTimer = null;
        }, 800);
      }

      if (user) {
        serverHydratedRef.current = false;
        setServerHydrated(false);
        // CRITICAL: detect UID change. If a different user just signed in,
        // the previous user's progress keys are still in localStorage and
        // would otherwise leak into the new account (level, XP, home,
        // doomsday clock, evacuation state, etc.). hydrateGameStateFromServer
        // uses Math.max(local, server) which means the old local values win
        // and even get pushed back to server, corrupting the new DB row.
        // Clear all progress keys and reload so the app re-initializes
        // from a clean slate. UI prefs (lang, ambient volume) are preserved.
        try {
          const previousUid = localStorage.getItem('nebulife_last_uid');
          const legacyId = localStorage.getItem('nebulife_player_id');
          const hasForeignLocalProgress = !previousUid && !legacyId && hasAccountScopedLocalProgress();
          if ((previousUid && previousUid !== user.uid) || hasForeignLocalProgress) {
            clearAccountScopedLocalStorage(user.uid);
            window.location.reload();
            return;
          }
          localStorage.setItem('nebulife_last_uid', user.uid);
        } catch { /* localStorage disabled — skip guard */ }

        playerId.current = user.uid;
        setIsGuest(user.isAnonymous);
        // Show registration reminder for guests (once per session)
        if (user.isAnonymous && !sessionStorage.getItem('nebulife_reg_reminder_shown')) {
          setShowGuestReminder(true);
          sessionStorage.setItem('nebulife_reg_reminder_shown', '1');
        }

        // Register/sync player in DB (retry up to 3 times on failure)
        let registered = false;
        for (let attempt = 0; attempt < 3 && !registered; attempt++) {
          try {
            const legacyId = localStorage.getItem('nebulife_player_id');
            const res = await authFetch('/api/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ legacyPlayerId: legacyId || undefined }),
            });
            if (res.ok) {
              const player = await res.json();
              // Stale-invocation guard: between awaiting the fetch and now,
              // a newer auth event (null or different user) may have fired.
              // If so, bail out before stomping newer state with our data.
              if (!isLatest()) return;
              playerId.current = player.id; // Use DB id (may differ from UID for migrated)
              setQuarks(player.quarks ?? 0);
              if (player.global_index != null) globalPlayerIndexRef.current = player.global_index;
              try { localStorage.setItem('nebulife_generation_index', String(player.science_points ?? 0)); } catch { /* ignore */ }
              hydrateGameStateFromServer(player);
              setState((prev) => ({ ...prev, playerName: player.callsign || player.name || 'Explorer' }));
              setNeedsCallsign(!player.callsign);
              // Starter toast deferred to handleOnboardingComplete so it
              // renders after the cinematic intro overlay closes.
              claimDailyLoginBonusOnce().catch(() => { /* soft-fail */ });
              // Fetch universe info for group count
              fetchUniverseInfo().then(info => {
                universeGroupCountRef.current = info.groupCount;
                universeEngineRef.current?.updateGroupCount(info.groupCount);
                engineRef.current?.setGroupInfo(globalPlayerIndexRef.current, info.groupCount);
              }).catch(() => { /* use default */ });
              // Check if player needs onboarding. game_state is the stronger
              // signal for returning users: older rows can keep game_phase at
              // "onboarding" even after the intro completion was synced.
              const hydratedGameState = player.game_state as Partial<SyncedGameState> | undefined;
              if (player.game_phase === 'onboarding' && !hydratedGameState?.onboarding_done) {
                setNeedsOnboarding(true);
                setCinematicActive(true);
              }
              // Clear legacy ID after successful migration
              if (legacyId && player.firebase_uid) {
                localStorage.removeItem('nebulife_player_id');
              }
              registered = true;

              // Pro daily quarks: grant 5 quarks once per day for Pro subscribers
              try {
                const lastClaimDate = localStorage.getItem('nebulife_pro_daily_date');
                const todayDate = new Date().toISOString().slice(0, 10);
                if (lastClaimDate !== todayDate) {
                  const quarksRes = await authFetch('/api/player/daily-quarks', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
                  if (quarksRes.ok) {
                    const quarksData = await quarksRes.json();
                    localStorage.setItem('nebulife_pro_daily_date', todayDate);
                    if (quarksData.newBalance !== undefined) {
                      setQuarks(quarksData.newBalance);
                      const credited = typeof quarksData.credited === 'number' ? quarksData.credited : 5;
                      enqueueQuarkToast({ amount: credited, reason: 'gift' });
                    }
                  }
                }
              } catch {
                // Non-critical — daily quarks claim failure is silently ignored
              }
            } else {
              console.warn(`[Auth] Register attempt ${attempt + 1} failed: ${res.status}`);
              if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            }
          } catch (err) {
            console.warn(`[Auth] Register attempt ${attempt + 1} error:`, err);
            if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          }
        }
        if (!registered) {
          console.error('[Auth] Failed to register player after 3 attempts');
        }
      } else {
        // Same stale-invocation guard as in the user branch. If a newer
        // `user` event arrived after this `null` event started processing
        // (possible on rapid null→user Firebase emissions), skip the reset
        // so we don't blow away the newer event's playerId.current.
        if (!isLatest()) return;
        serverHydratedRef.current = false;
        setServerHydrated(false);
        playerId.current = '';
        setNeedsCallsign(false);
        setIsGuest(false);
      }
    });
    return () => {
      unsubscribe();
      if (nativeAuthWatchdog !== null) {
        window.clearTimeout(nativeAuthWatchdog);
      }
      if (authNullResolveTimer !== null) {
        clearTimeout(authNullResolveTimer);
        authNullResolveTimer = null;
      }
    };
  }, []);

  // Ensure player data loaded + load 3D models + quarks balance
  useEffect(() => {
    if (isFirebaseConfigured && !firebaseUser) return;
    const pid = playerId.current;
    if (!pid) return;

    refreshQuarks();

    getPlayerAliases(pid).then(setAliases).catch(() => {});
    // Load system photos for initial state
    fetchPlayerSystemPhotos(pid).then(photos => {
      const map = new Map<string, SystemPhotoData>();
      for (const p of photos) {
        map.set(p.system_id, {
          id: p.id,
          photoUrl: p.photo_url ?? '',
          status: p.status as 'generating' | 'succeed' | 'failed',
          createdAt: p.created_at,
        });
      }
      setSystemPhotos(map);
      setSavedMissionPhotoKeys(() => {
        const saved: Record<string, boolean> = {};
        for (const [key, photo] of map) {
          if ((key.startsWith('planet-probe-') || key.startsWith('planet-rover-') || key.startsWith('planet-drone-')) && photo.status === 'succeed' && photo.photoUrl) {
            saved[key] = true;
          }
        }
        return saved;
      });
    }).catch(() => {});
    // Load gallery discoveries for duplicate detection
    getDiscoveries(pid).then(discoveries => {
      const gmap = new Map<string, DiscoveryData>();
      for (const d of discoveries) {
        if (d.photo_url) {
          const existing = gmap.get(d.object_type);
          if (!existing || (d.discovered_at > existing.discovered_at)) {
            gmap.set(d.object_type, d);
          }
        }
      }
      setGalleryMap(gmap);
    }).catch(() => {});
  }, [firebaseUser, refreshQuarks]);

  useEffect(() => {
    if (!state.selectedSystem) return;
    let cancelled = false;
    listPlanetSkinsForSystem(state.selectedSystem.id)
      .then((skins) => {
        if (cancelled) return;
        setPlanetSkins((prev) => {
          const next = new Map(prev);
          for (const skin of skins) {
            next.set(`${skin.kind}-${skin.planet_id}`, skin);
          }
          return next;
        });
      })
      .catch((err) => console.warn('[PlanetSkin] list failed:', err));
    return () => { cancelled = true; };
  }, [state.selectedSystem?.id]);

  useEffect(() => {
    if (state.scene !== 'system' || !state.selectedSystem) return;
    const textures: Record<string, string> = {};
    for (const planet of state.selectedSystem.planets) {
      const skin = planetSkins.get(`system-${planet.id}`);
      if (skin?.status === 'succeed' && skin.texture_url) {
        textures[planet.id] = skin.texture_url;
      }
    }
    engineRef.current?.setPlanetSkinTextures(textures);
  }, [state.scene, state.selectedSystem, planetSkins]);

  // Handle payment redirect (e.g., ?payment=success&topup=true)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      // Refresh quarks after any payment success
      setTimeout(refreshQuarks, 1000);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refreshQuarks]);

  // (showExploreBtn initialized to true, no delay needed)

  // Research timer — check every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const engine = engineRef.current;
      if (!engine) return;

      setResearchState((prev) => {
        let current = prev;
        let changed = false;
        const newTimers: Record<number, string> = {};

        // Apply tech tree speed multiplier to research duration
        const speedMult = getEffectValue(techTreeStateRef.current, 'research_speed_mult', 1.0);
        const effectiveDuration = Math.round(RESEARCH_DURATION_MS * speedMult);

        // Self-heal: if a slot has been "researching" for more than 6 × effectiveDuration
        // (e.g. stuck due to stale startedAt from an old format or crashed session),
        // force-complete or reset it. Logs to console so it's visible during debugging.
        const MAX_STUCK_DURATION = effectiveDuration * 6;

        for (const slot of current.slots) {
          if (slot.systemId && slot.startedAt) {
            const liveSlot = current.slots.find((s) => s.slotIndex === slot.slotIndex);
            if (!liveSlot || liveSlot.systemId !== slot.systemId || liveSlot.startedAt !== slot.startedAt) {
              continue;
            }
            const elapsed = now - liveSlot.startedAt;

            // Self-heal: detect slots stuck far beyond expected duration
            if (elapsed > MAX_STUCK_DURATION) {
              const stuckSystem = engine.getAllSystems().find((s) => s.id === slot.systemId);
              if (stuckSystem) {
                console.warn(
                  `[research self-heal] slot ${slot.slotIndex} stuck for ${Math.round(elapsed / 1000)}s on system "${stuckSystem.name}" (ring ${stuckSystem.ringIndex ?? '?'}). Force-completing session.`,
                );
                const result = completeResearchSession(current, slot.slotIndex, stuckSystem, playerStats.totalCompletedSessions, playerStats.totalDiscoveries, playerStats.lastDiscoverySession);
                current = result.state;
                changed = true;

                // Keep self-healed completions behaviorally identical to normal
                // timer completions. Previously these only updated the galaxy
                // label ("researched") and skipped the completion popup.
                setPlayerStats((ps) => ({
                  totalCompletedSessions: ps.totalCompletedSessions + 1,
                  totalDiscoveries: ps.totalDiscoveries + (result.discovery ? 1 : 0),
                  lastDiscoverySession: result.discovery ? ps.totalCompletedSessions + 1 : ps.lastDiscoverySession,
                }));
                engine.updateSystemResearchVisual(slot.systemId, current);
                setHoveredStarInfo((prev) => {
                  if (!prev || prev.systemId !== slot.systemId) return prev;
                  const newProg = getResearchProgress(current, slot.systemId);
                  if (newProg >= 100) return null;
                  return { systemId: slot.systemId, progress: newProg };
                });
                if (result.discovery) {
                  const discEntry = getCatalogEntry(result.discovery.type) as CatalogEntry | undefined;
                  const discName = discEntry ? getCatalogName(discEntry, i18n.language) : result.discovery.type;
                  setDiscoveryQueue(q => [...q, { discovery: result.discovery!, system: stuckSystem }]);
                  addLogEntry('science',
                    t('app.log.observatory_signal').replace('{name}', discName).replace('{system}', stuckSystem.name),
                    { systemId: stuckSystem.id, objectType: result.discovery.type, discoveryRef: result.discovery },
                  );
                  const rarityBonus = XP_REWARDS.DISCOVERY_RARITY_BONUS[result.discovery.rarity] ?? 0;
                  awardXP(XP_REWARDS.DISCOVERY_BASE + rarityBonus, 'discovery');
                }
                awardXP(SESSION_XP, 'research_session');
                interstitialManager.tryShow();
                if (result.isNowComplete) {
                  const research = current.systems[stuckSystem.id];
                  if (research) {
                    setCompletedModalQueue(q => [...q, { system: stuckSystem, research }]);
                    addLogEntry('science',
                      t('app.log.system_researched').replace('{system}', stuckSystem.name),
                      { systemId: stuckSystem.id, objectType: 'system_research' },
                    );
                    const completionXP = getSystemResearchCompletionXP(stuckSystem) ?? XP_REWARDS.RESEARCH_COMPLETE;
                    awardXP(completionXP, 'research_complete');
                    engineRef.current?.pulseCapillaryTo(stuckSystem.id);
                  }
                }
              } else {
                // System not found in engine — likely stale/dangling reference; clear slot
                console.warn(
                  `[research self-heal] slot ${slot.slotIndex} references unknown system "${slot.systemId}". Clearing slot.`,
                );
                const slots = current.slots.map((s) =>
                  s.slotIndex === slot.slotIndex ? { ...s, systemId: null, startedAt: null } : s,
                );
                current = { ...current, slots };
                changed = true;
              }
              continue;
            }

            if (elapsed >= effectiveDuration) {
              // Session complete — find the system object
              const system = engine.getAllSystems().find((s) => s.id === slot.systemId);
              if (system) {
                const result = completeResearchSession(current, slot.slotIndex, system, playerStats.totalCompletedSessions, playerStats.totalDiscoveries, playerStats.lastDiscoverySession);
                current = result.state;
                changed = true;

                // Track player stats
                setPlayerStats((ps) => ({
                  totalCompletedSessions: ps.totalCompletedSessions + 1,
                  totalDiscoveries: ps.totalDiscoveries + (result.discovery ? 1 : 0),
                  lastDiscoverySession: result.discovery ? ps.totalCompletedSessions + 1 : ps.lastDiscoverySession,
                }));

                // Update galaxy visual
                engine.updateSystemResearchVisual(slot.systemId, current);

                // If the currently-hovered star is THIS one, refresh the gold %
                // label — pointerover only fires on hover-enter, so without
                // this the label stays stale until user unhovers and re-hovers.
                setHoveredStarInfo((prev) => {
                  if (!prev || prev.systemId !== slot.systemId) return prev;
                  const newProg = getResearchProgress(current, slot.systemId);
                  if (newProg >= 100) return null;
                  return { systemId: slot.systemId, progress: newProg };
                });

                // Show discovery choice panel if one was rolled
                if (result.discovery) {
                  const disc = result.discovery;
                  setDiscoveryQueue(q => [...q, { discovery: disc, system }]);
                  // Log the discovery event
                  const discEntry = getCatalogEntry(result.discovery.type) as CatalogEntry | undefined;
                  const discName = discEntry ? getCatalogName(discEntry, i18n.language) : result.discovery.type;
                  addLogEntry('science',
                    t('app.log.observatory_signal').replace('{name}', discName).replace('{system}', system.name),
                    { systemId: system.id, objectType: result.discovery.type, discoveryRef: result.discovery },
                  );
                  // Award XP for discovery (base + rarity bonus)
                  const rarityBonus = XP_REWARDS.DISCOVERY_RARITY_BONUS[result.discovery.rarity] ?? 0;
                  awardXP(XP_REWARDS.DISCOVERY_BASE + rarityBonus, 'discovery');
                }

                // Award SESSION_XP on every completed session
                awardXP(SESSION_XP, 'research_session');
                interstitialManager.tryShow();

                // Show modal if just completed — award ring-scaled XP
                if (result.isNowComplete) {
                  const research = current.systems[system.id];
                  if (research) {
                    setCompletedModalQueue(q => [...q, { system, research }]);
                    addLogEntry('science',
                      t('app.log.system_researched').replace('{system}', system.name),
                      { systemId: system.id, objectType: 'system_research' },
                    );
                    const completionXP = getSystemResearchCompletionXP(system) ?? XP_REWARDS.RESEARCH_COMPLETE;
                    awardXP(completionXP, 'research_complete');
                    // Capillary pulse: zip a bead along the home→system edge
                    // so the player sees the web "reaching" the newly unlocked
                    // star. spawnEdgePulse is a cheap RAF-sliced visual — the
                    // 3rd-party-visible side-effect is ~0.8 s of extra draw.
                    engineRef.current?.pulseCapillaryTo(system.id);
                  }
                }

                // Check if researching a system with the paradise planet — trigger evacuation
                const newProgress = current.systems[system.id]?.progress ?? 0;
                if (isExodusPhaseRef.current && !evacuationTargetRef.current && !speedUpAppliedRef.current && newProgress >= 30) {
                  // Only trigger if THIS system contains the paradise planet
                  const colonizable = findColonizablePlanet(system);
                  if (colonizable) {
                    setEvacuationTarget({ system, planet: colonizable });
                    // Auto-complete research for evacuation target system
                    setResearchState((prev) => completeSystemResearchInstantly(prev, system));
                    // Trigger the "Hope & Despair" speed-up twist
                    activateSpeedUp();
                  }
                }
              }
            } else {
              // Update timer text
              const remaining = effectiveDuration - elapsed;
              const secs = Math.ceil(remaining / 1000);
              const mins = Math.floor(secs / 60);
              const s = secs % 60;
              newTimers[slot.slotIndex] = mins > 0 ? `${mins}:${String(s).padStart(2, '0')}` : `${s}s`;
            }
          }
        }

        setSlotTimers(newTimers);

        if (changed) {
          engine.setResearchState(current);
          // Critical save: research session just completed → push to server
          // immediately (don't wait for debounce). This protects against APK
          // kill / uninstall right after a system finishes researching.
          syncNowToServer();
          return current;
        }
        return prev;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [syncNowToServer]);

  // Sync research state to engine when it changes
  useEffect(() => {
    engineRef.current?.setResearchState(researchState);
  }, [researchState]);

  // Arena defer queue — if arena is active when a popup fires, push the
  // callback here instead; drains 1.5 s apart after the arena closes.
  const enqueueIfArena = useCallback((cb: () => void): boolean => {
    if (!showArenaRef.current) return false;
    setPendingPostArenaPopups((prev) => [...prev, cb]);
    return true;
  }, []);

  // Drain the queue when arena becomes inactive.
  const pendingPopupsRef = useRef<Array<() => void>>([]);
  useEffect(() => { pendingPopupsRef.current = pendingPostArenaPopups; }, [pendingPostArenaPopups]);
  useEffect(() => {
    if (showArena || showRaid) return; // still in arena/raid
    if (pendingPostArenaPopups.length === 0) return;
    // Fire each deferred popup with a 1.5 s gap between them.
    const queue = [...pendingPostArenaPopups];
    setPendingPostArenaPopups([]);
    let delay = 1500;
    for (const cb of queue) {
      const t = setTimeout(() => cb(), delay);
      delay += 1500;
      // Capture t in closure to avoid lint issues (harmless — no cleanup needed
      // since the component lifetime exceeds these brief delays).
      void t;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArena, showRaid]);

  // Ring-unlock growth is map-native: the camera frames the galaxy map while
  // GalaxyScene grows real parent→system threads to newly available stars.
  const playedRingUnlocksRef = useRef<Set<number>>(new Set());

  const enqueueRingUnlocks = useCallback((rings: number[]) => {
    const uniqueRings = Array.from(new Set(rings)).filter(ring => ring > 0);
    if (uniqueRings.length === 0) return;

    const startOrQueue = () => {
      uniqueRings.forEach((ring, index) => {
        window.setTimeout(() => {
          engineRef.current?.playRingUnlock(ring);
        }, index * 900);
      });
    };

    if (enqueueIfArena(startOrQueue)) return;
    startOrQueue();
  }, [enqueueIfArena]);

  // Sync effective max ring to engine (controls BFS depth into galactic core).
  //
  // Auto-promotion: if the player has fully researched ALL their personal Ring 2
  // systems, bump effectiveMaxRing by +1 even without ast-probe tech. This makes
  // neighbor systems (ringIndex=3) jump from Tier 2 (faded) to Tier 1 (full
  // visibility + interactive) — visually rewarding the player for completing
  // their personal exploration. The actual research-start gate is independent
  // (ast-probe still required to scan neighbors), so no progression is broken.
  useEffect(() => {
    const maxRingAdd = getEffectValue(techTreeState, 'max_ring_add', 0);
    let effectiveMax = HOME_RESEARCH_MAX_RING + maxRingAdd;

    // Check if all personal Ring 2 systems are fully researched
    if (effectiveMax === HOME_RESEARCH_MAX_RING && researchState) {
      const ring2Systems = engineRef.current?.getAllSystems?.()
        .filter(s => s.ringIndex === HOME_RESEARCH_MAX_RING && s.ownerPlayerId === null);
      if (ring2Systems && ring2Systems.length > 0) {
        const allRing2Done = ring2Systems.every(s => isSystemFullyResearched(researchState, s.id));
        if (allRing2Done) effectiveMax += 1; // Light up the third ring
      }
    }
    engineRef.current?.setEffectiveMaxRing(effectiveMax);
  }, [techTreeState, researchState]);

  // Evacuation-prompt gate: when a new evacuation target is picked (trajectory
  // change message arrives), collapse every full-screen overlay so the prompt
  // never appears behind the hangar / terminal / academy / surface etc.
  useEffect(() => {
    if (!evacuationTarget || evacuationPhase !== 'idle' || evacuationPromptDismissed) return;
      setShowArena(false);
      setShowRaid(false);
    setShowHangar(false);
    setShowCosmicArchive(false);
    setShowAcademy(false);
    setShowPlayerPage(false);
    setShowChaosModal(false);
    setShowTopUpModal(false);
    setShowColonyCenter(false);
    setSurfaceTarget(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evacuationTarget, evacuationPhase, evacuationPromptDismissed]);

  // Animated counter: count up to hoveredStarInfo.progress over ~900ms
  useEffect(() => {
    if (progressAnimRef.current !== null) {
      cancelAnimationFrame(progressAnimRef.current);
      progressAnimRef.current = null;
    }
    if (!hoveredStarInfo) {
      setDisplayedProgress(0);
      progressAnimStartRef.current = null;
      return;
    }
    const target = hoveredStarInfo.progress;
    progressAnimStartRef.current = { from: 0, to: target, startTime: performance.now() };
    const DURATION = 900;
    const animate = (now: number) => {
      const s = progressAnimStartRef.current;
      if (!s) return;
      const elapsed = now - s.startTime;
      const t = Math.min(1, elapsed / DURATION);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayedProgress(Math.round(s.from + (s.to - s.from) * eased));
      if (t < 1) {
        progressAnimRef.current = requestAnimationFrame(animate);
      }
    };
    progressAnimRef.current = requestAnimationFrame(animate);
    return () => {
      if (progressAnimRef.current !== null) cancelAnimationFrame(progressAnimRef.current);
    };
  }, [hoveredStarInfo]);

  // Sync research labels mode to engine
  useEffect(() => {
    engineRef.current?.setGalaxyResearchLabels(researchLabelsMode);
  }, [researchLabelsMode, state.scene]);

  useEffect(() => {
    if (!canvasRef.current || engineRef.current) return;

    // playerIndex = server's global_index (deterministic cluster slot) — NOT the
    // local generation/reset counter. Using science_points here was a bug: after
    // a "Start Over" reset, the player's science_points incremented and they
    // suddenly saw a different cluster slot, breaking neighbor consistency for
    // multiplayer (other players still expected them at the old slot).
    // Fallback to legacy generation_index when global_index hasn't synced yet
    // (offline / first-frame race) so single-player still works.
    const fallbackGenIdx = parseInt(localStorage.getItem('nebulife_generation_index') || '0', 10);
    const playerIndex = globalPlayerIndexRef.current || fallbackGenIdx;
    const engine = new GameEngine(canvasRef.current, {
      onSystemSelect: (system, screenPos) => {
        setState((prev) => ({ ...prev, selectedSystem: system, selectedPlanet: null }));
        if (screenPos) {
          setSystemMenuPos(screenPos);
          // SystemContextMenu replaced by RadialMenu — do not open old menu
        }
      },
      onPlanetSelect: (planet, screenPos) => {
        setState((prev) => {
          // If context menu is already showing for this same planet, ignore the tap.
          // This prevents PixiJS's capture-phase events from re-firing when the user
          // taps on the context menu overlay (e.g. double-tap or tapping a menu item).
          if (prev.showPlanetMenu && prev.selectedPlanet?.id === planet.id) {
            return prev;
          }
          return {
            ...prev,
            selectedPlanet: planet,
            planetClickPos: screenPos,
            showPlanetMenu: true,
            showPlanetInfo: false,
          };
        });
      },
      onSceneChange: (scene) => {
        setState((prev) => ({
          ...prev, scene,
          // Preserve selectedPlanet when entering planet-view (set by onPlanetSelect just before).
          // Only clear it when leaving planet-view, so PlanetGlobeView shows the correct planet.
          ...(scene !== 'planet-view' && { selectedPlanet: null }),
          showPlanetMenu: false, showPlanetInfo: false, planetClickPos: null,
        }));
        // Reset system menu / radial state on scene change
        setShowSystemMenu(false);
        setSystemMenuPos(null);
        setRadialSystem(null);
        setRadialGetScreenPos(null);
      },
      onTelescopeClick: (system) => {
        telescopePhotoRef.current(system);
      },
      onRequestResearch: (system) => {
        // Double-click on non-fully-researched star — show research panel
        setShowSystemMenu(false);
        setSystemMenuPos(null);
        setRadialSystem(null);
        setRadialGetScreenPos(null);
      },
      onRadialOpen: (system, getScreenPos) => {
        setRadialSystem(system);
        setRadialGetScreenPos(() => getScreenPos);
        setState((prev) => ({ ...prev, selectedSystem: system }));
      },
      onRadialClose: () => {
        setRadialSystem(null);
        setRadialGetScreenPos(null);
        setState(prev => ({ ...prev, selectedSystem: null }));
      },
      onHoverSystem: (systemId, progress) => {
        if (!systemId || progress >= 100) {
          setHoveredStarInfo(null);
          setHoverLabelPos(null);
        } else {
          setHoveredStarInfo({ systemId, progress });
          const pos = engineRef.current?.getSystemScreenPosition(systemId) ?? null;
          setHoverLabelPos(pos);
        }
      },
      onLiteOrbTap: (lite) => {
        // Quick preview toast: tap a faraway star → see its color hint + ring info.
        // Player can't research it without traveling closer (different mechanic).
        const ownerLabel = lite.nodeType === 'core'
          ? ''
          : lite.ownerIndex === playerIndex
            ? (lang === 'uk' ? 'твоя система' : 'your system')
            : (lang === 'uk' ? `сусід (гравець #${lite.ownerIndex})` : `neighbor (player #${lite.ownerIndex})`);
        const starName = generateStarSystem(lite.seed, { x: 0, y: 0, z: 0 }, lite.ringIndex).star.name;
        setToastMessage(ownerLabel
          ? `✦  ${starName}  •  ${ownerLabel}  •  ${lite.starColor}`
          : `✦  ${starName}  •  ${lite.starColor}`);
        setTimeout(() => setToastMessage(null), 2500);
      },
    }, playerIndex);

    engine.init().then(() => {
      // Sync restored research state before anything else
      engine.setResearchState(researchState);
      // Sync effective max ring for progressive core BFS depth
      const maxRingAdd = getEffectValue(techTreeStateRef.current, 'max_ring_add', 0);
      engine.setEffectiveMaxRing(HOME_RESEARCH_MAX_RING + maxRingAdd);
      engineRef.current = engine;

      // If home was relocated via evacuation, update engine rings before navigation
      const savedHomeSysId = localStorage.getItem('nebulife_home_system_id');
      const savedHomePlanetId = localStorage.getItem('nebulife_home_planet_id');
      if (savedHomeSysId && savedHomePlanetId) {
        engine.updateHomeSystem(savedHomeSysId, savedHomePlanetId);
      }

      // Store home system/planet info for navigation
      const allSystems = engine.getAllSystems();
      const homeSystem = allSystems.find(s => s.ownerPlayerId !== null);
      if (homeSystem) {
        const homePlanet = homeSystem.planets.find(p => p.isHomePlanet) ?? homeSystem.planets[0];
        if (homePlanet) {
          setHomeInfo({ system: homeSystem, planet: homePlanet });
          // Initialize colonyPlanetRef so colony tick can produce resources immediately
          // without requiring the player to visit the surface first.
          if (!colonyPlanetRef.current) {
            colonyPlanetRef.current = { planet: homePlanet, star: homeSystem.star };
          }
        }
      }

      // Restore evacuation target if saved
      const evacSysId = localStorage.getItem('nebulife_evac_system_id');
      const evacPlanetId = localStorage.getItem('nebulife_evac_planet_id');
      const evacForced = localStorage.getItem('nebulife_evac_forced') === 'true';
      if (evacSysId && evacPlanetId) {
        const evacSys = allSystems.find(s => s.id === evacSysId);
        const evacPlanet = evacSys?.planets.find(p => p.id === evacPlanetId);
        if (evacSys && evacPlanet) {
          setEvacuationTarget({ system: evacSys, planet: evacPlanet });
          setForcedEvacuation(evacForced);
        }
      }

      // If evacuation was in progress (not idle) before reload, reset to prompt
      const savedEvacPhase = localStorage.getItem('nebulife_evac_phase');
      if (savedEvacPhase && savedEvacPhase !== 'idle') {
        // Can't resume mid-animation — show prompt so player can restart evacuation
        setEvacuationPhase('idle');
        setEvacuationPromptDismissed(false);
      }

      // Returning players always start from the Star Group after boot. Deep
      // scenes are entered intentionally from the galaxy/system UI.
      if (localStorage.getItem('nebulife_onboarding_done') === '1') {
        engine.showGalaxyScene();
        setState(prev => ({ ...prev, scene: 'galaxy', selectedSystem: null, selectedPlanet: null }));
        return;
      }

      // Restore saved scene for non-standard pre-onboarding/dev states.
      // Use refs captured at component mount — by this point localStorage is already
      // overwritten by the persistence useEffect (engine.init() → showHomePlanetScene()
      // → onSceneChange('home-intro') → setState → useEffect writes 'home-intro').
      const savedScene = savedNavSceneRef.current;
      const savedSystemId = savedNavSystemRef.current;
      const savedPlanetId = savedNavPlanetRef.current;

      if (savedScene === 'system' && savedSystemId) {
        const sys = allSystems.find(s => s.id === savedSystemId);
        if (sys) {
          engine.showSystemScene(sys);
          setState(prev => ({ ...prev, scene: 'system', selectedSystem: sys }));
        } else {
          engine.showGalaxyScene();
        }
      } else if (savedScene === 'planet-view') {
        // Returning players land on the galaxy map, not on a single planet's
        // exosphere. The exosphere view requires conscious nav from system-
        // scene; reopening on it is disorienting and hides progress signals
        // from the rest of the cluster.
        engine.showGalaxyScene();
      } else if (savedScene === 'galaxy') {
        engine.showGalaxyScene();
      }
    }).catch((err) => {
      console.error('GameEngine init error:', err);
      setState((prev) => ({ ...prev, error: String(err) }));
    });

    return () => {
      engine.destroy();
    };
  }, []);

  const handleOnboardingComplete = useCallback(async () => {
    setNeedsOnboarding(false);
    setCinematicActive(false);
    localStorage.setItem('nebulife_onboarding_done', '1');

    // Starter wallet toast now fires AFTER onboarding completes — previously
    // it was queued during the cinematic intro, but the CinematicIntro overlay
    // (z-index 10005) covered the toast (z-index 9750), so the player never
    // saw or could click the +20⚛ confirmation.
    maybeShowStarterToast(quarks);

    // Start timer immediately — don't wait for server hydration or useEffect
    if (gameStartedAt === null) {
      const now = Date.now();
      setGameStartedAt(now);
      try { localStorage.setItem('nebulife_game_started_at', String(now)); } catch { /* ignore */ }
    }

    // Update game_phase on server
    const pid = playerId.current;
    if (pid) {
      try {
        await authFetch(`/api/player/${pid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ game_phase: 'exploring' }),
        });
      } catch {
        // Non-critical — localStorage fallback already set
      }
    }
    // Immediate sync on critical event
    setTimeout(() => syncGameStateRef.current(), 500);

    // Tutorial will start AFTER clock reveal completes (see clockPhase === 'visible' effect)
    // Don't start tutorial here — clock reveal must play first
    onboardingJustCompletedRef.current = true;
  }, [gameStartedAt]);

  const handleStartExploration = () => {
    setShowCosmicArchive(false);
    engineRef.current?.showGalaxyScene();
    setState((prev) => ({ ...prev, scene: 'galaxy', selectedSystem: null, selectedPlanet: null }));
  };

  const handleBackToGalaxy = () => {
    engineRef.current?.showGalaxyScene();
    setState((prev) => ({ ...prev, scene: 'galaxy', selectedSystem: null, selectedPlanet: null }));
  };

  const handleGoToHomePlanet = () => {
    // During active evacuation cutscenes, don't navigate to (possibly destroyed) home
    if (evacuationPhase !== 'idle') return;
    // Close surface view if open
    setSurfaceTarget(null);
    engineRef.current?.showHomePlanetScene(true);
    setState((prev) => ({ ...prev, scene: 'home-intro', selectedSystem: null, selectedPlanet: null }));
    setShowExploreBtn(true);
  };

  // ── Universe (Three.js) transitions ──

  const initUniverseEngine = useCallback(async () => {
    if (universeEngineRef.current || !universeCanvasRef.current) return;
    const engine = new UniverseEngine(
      universeCanvasRef.current,
      {
        onEnterPlayerGalaxy: (_playerSeed: number, _groupIndex: number) => {
          // Player clicked their home star in cluster view → warp to PixiJS galaxy
          warpTargetRef.current = 'galaxy';
          setWarpActive(true);
        },
        onLodChange: (lod) => {
          if (lod === 'cluster') {
            setState(prev => ({ ...prev, scene: 'cluster' }));
          } else if (lod === 'galaxy') {
            setState(prev => ({ ...prev, scene: 'universe' }));
          }
        },
      },
      globalPlayerIndexRef.current,
      universeGroupCountRef.current,
    );
    await engine.init();
    universeEngineRef.current = engine;
  }, []);

  const switchToUniverse = useCallback(() => {
    warpTargetRef.current = 'universe';
    setWarpActive(true);
  }, []);

  const handleWarpMidpoint = useCallback(() => {
    const target = warpTargetRef.current;
    if (target === 'universe') {
      // Transitioning TO universe (from PixiJS)
      setSurfaceTarget(null);
      initUniverseEngine().then(() => {
        setUniverseVisible(true);
        universeEngineRef.current?.setVisible(true);
        engineRef.current?.pause();
        setState(prev => ({ ...prev, scene: 'universe' }));
      });
    } else {
      // Transitioning FROM universe (to PixiJS) — destroy Three.js renderer to free GPU
      setUniverseVisible(false);
      if (universeEngineRef.current) {
        universeEngineRef.current.destroy();
        universeEngineRef.current = null;
      }
      engineRef.current?.resume();
      if (target === 'home-intro') {
        engineRef.current?.showHomePlanetScene(true);
        setState(prev => ({ ...prev, scene: 'home-intro', selectedSystem: null, selectedPlanet: null }));
        setShowExploreBtn(true);
      } else {
        engineRef.current?.showGalaxyScene();
        setState(prev => ({ ...prev, scene: 'galaxy', selectedSystem: null, selectedPlanet: null }));
      }
    }
  }, [initUniverseEngine]);

  const handleWarpComplete = useCallback(() => {
    setWarpActive(false);
  }, []);

  const restoreStarGroupView = useCallback(() => {
    setSurfaceTarget(null);
    setUniverseVisible(false);
    if (universeEngineRef.current) {
      universeEngineRef.current.destroy();
      universeEngineRef.current = null;
    }

    const restore = () => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.resume();
      engine.showGalaxyScene();
      setState(prev => ({
        ...prev,
        scene: 'galaxy',
        selectedSystem: null,
        selectedPlanet: null,
        showPlanetMenu: false,
        showPlanetInfo: false,
        planetClickPos: null,
      }));
      setShowSystemMenu(false);
      setSystemMenuPos(null);
      setRadialSystem(null);
      setRadialGetScreenPos(null);
    };

    requestAnimationFrame(() => requestAnimationFrame(restore));
  }, []);

  const handleEnterSystem = useCallback((system: StarSystem) => {
    engineRef.current?.showSystemScene(system);
    setState((prev) => ({ ...prev, scene: 'system', selectedSystem: system }));
  }, []);

  const getEffectiveResearchMaxRing = useCallback((allSystems: StarSystem[], targetSystemId?: string): number => {
    const maxRingAdd = getEffectValue(techTreeStateRef.current, 'max_ring_add', 0);
    const targetRing = targetSystemId
      ? allSystems.find((s) => s.id === targetSystemId)?.ringIndex
      : undefined;
    let effectiveMax = HOME_RESEARCH_MAX_RING + maxRingAdd;
    const ring2Systems = allSystems.filter(
      (s) => s.ringIndex === HOME_RESEARCH_MAX_RING && s.ownerPlayerId === null,
    );
    const ring2Done = ring2Systems.length > 0
      && ring2Systems.every((s) => isSystemFullyResearched(researchState, s.id));

    if (effectiveMax === HOME_RESEARCH_MAX_RING) {
      if (ring2Done) {
        effectiveMax += 1;
      }
    }

    if (targetSystemId && quarkUnlockedSystems.has(targetSystemId) && targetRing !== undefined) {
      effectiveMax = Math.max(effectiveMax, targetRing);
    }
    // Core/deep systems are no longer unlocked as strict rings. GalaxyScene
    // controls their reachability through the branch graph; if a core target is
    // visible enough to be selected, do not block it on max-ring math.
    if (targetRing !== undefined && targetRing >= 4 && ring2Done) {
      effectiveMax = Math.max(effectiveMax, targetRing);
    }
    return effectiveMax;
  }, [quarkUnlockedSystems, researchState]);

  const handleStartResearch = useCallback((systemId: string) => {
    const targetSystem = engineRef.current?.getAllSystems()?.find((s) => s.id === systemId);
    const researchCost = targetSystem ? getSystemResearchDataCost(targetSystem) : RESEARCH_DATA_COST;
    if (Math.floor(researchData) < researchCost) {
      setResearchDataNeeded(researchCost);
      setShowGetResearchData(true);
      return;
    }
    // Block if no observatories or no free slots
    if (researchState.slots.length === 0) return;
    // Resolve the target system's ring to find the closest observatory slot
    const targetRing = targetSystem?.ringIndex ?? 1;
    // Personal/neighbor gates are true rings. Core/deep systems branch from
    // researched stars instead, so Ring 4+ must not wait for a whole previous ring.
    if (targetRing > 1 && targetRing <= 3) {
      const allSystems = engineRef.current?.getAllSystems() ?? [];
      if (!isRingFullyResearched(researchState, allSystems, targetRing - 1)) return;
    }
    const allSystems = engineRef.current?.getAllSystems() ?? [];
    const effectiveMax = getEffectiveResearchMaxRing(allSystems, systemId);
    if (!canStartResearch(researchState, systemId, targetRing, effectiveMax)) return;
    const slotIdx = findBestSlotForSystem(researchState, targetRing);
    if (slotIdx < 0) return;
    setResearchData((prev) => prev - researchCost);
    setResearchState((prev) => {
      const slotIndex = findBestSlotForSystem(prev, targetRing);
      if (slotIndex < 0) return prev;
      const next = startResearch(prev, slotIndex, systemId);
      engineRef.current?.updateSystemResearchVisual(systemId, next);
      return next;
    });

    // Tutorial: track research starts for first scan and free-task scans.
    if (isTutorialActive) {
      const currentTutorial = TUTORIAL_STEPS[tutorialStep];
      if (currentTutorial?.id === 'first-research') {
        const hudStep = TUTORIAL_STEPS.findIndex((step) => step.id === 'hud-info');
        setTutorialStep(hudStep >= 0 ? hudStep : tutorialStep + 1);
        setTutorialSubStep(0);
      } else if (currentTutorial?.id === 'free-task') {
        setTutorialFreeCount((prev) => {
          const n = prev + 1;
          if (n >= (currentTutorial.freeTaskTotal ?? 1)) {
            const anomalyStep = TUTORIAL_STEPS.findIndex((step) => step.id === 'anomaly');
            setTimeout(() => {
              setTutorialStep(anomalyStep >= 0 ? anomalyStep : tutorialStep + 1);
              setTutorialSubStep(0);
            }, 500);
          }
          return n;
        });
      }
    }
  }, [researchData, researchState, getSystemResearchDataCost, getEffectiveResearchMaxRing, isTutorialActive, tutorialStep, t]);

  // --- Tech Tree: research a technology ---
  const handleResearchTech = useCallback((techId: string) => {
    const node = ALL_NODES.find((n) => n.id === techId);
    if (!node) return;
    const status = getTechNodeStatus(node, playerLevel, techTreeState);
    if (status !== 'available') return;

    const newState = researchTech(techTreeState, techId);
    setTechTreeState(newState);
    addLogEntry('system', t('app.log.tech_researched').replace('{name}', node.name));

    // Queue toast notification (will appear after any active level-up banner)
    setPendingResearchToasts((q) => [
      ...q,
      {
        id:       Math.random().toString(36).slice(2),
        techId:   node.id,
        techName: node.name,
        branch:   ((node as { branch?: string }).branch ?? 'astronomy') as ResearchToastItem['branch'],
      },
    ]);

    // Expand research slots if observatory/concurrent effects changed
    const homeObservatorySlots = isExodusPhase
      ? getEffectValue(newState, 'observatory_count_add', 0)
      : 0;
    const extraSlots = homeObservatorySlots + getEffectValue(newState, 'concurrent_research_add', 0);
    // During exodus phase, base = HOME_OBSERVATORY_COUNT (built-in observatories on home planet).
    // After evacuation+colonization, base = current slot count (observatories built by player).
    setResearchState((prev) => {
      const baseCount = isExodusPhase ? HOME_OBSERVATORY_COUNT : prev.slots.length;
      const totalNeeded = baseCount + extraSlots;
      if (prev.slots.length >= totalNeeded) return prev;
      const extended = [...prev.slots];
      while (extended.length < totalNeeded) {
        extended.push({ slotIndex: extended.length, systemId: null, startedAt: null, sourcePlanetRing: 0 });
      }
      return { ...prev, slots: extended };
    });

    scheduleSyncToServer();
  }, [playerLevel, techTreeState, awardXP, isExodusPhase, scheduleSyncToServer]);

  const triggerRingUnlockAfterCompletion = useCallback((system: StarSystem) => {
    if (needsOnboarding || system.ringIndex < 1) return;

    if (system.ringIndex >= 3) {
      engineRef.current?.playBranchUnlock(system.id);
      return;
    }

    const allSystems = engineRef.current?.getAllSystems?.() ?? [];
    const completedRingSystems = allSystems.filter(
      s => s.ringIndex === system.ringIndex && s.ownerPlayerId === null,
    );
    const completedWholeRing = completedRingSystems.length > 0
      && completedRingSystems.every(s => isSystemFullyResearched(researchState, s.id));

    const nextRing = system.ringIndex + 1;
    if (!completedWholeRing || playedRingUnlocksRef.current.has(nextRing)) return;

    playedRingUnlocksRef.current.add(nextRing);
    enqueueRingUnlocks([nextRing]);
  }, [enqueueRingUnlocks, needsOnboarding, researchState]);

  const dismissCompletedModal = useCallback((system: StarSystem) => {
    triggerRingUnlockAfterCompletion(system);
    setCompletedModalQueue(q => q.slice(1));
  }, [triggerRingUnlockAfterCompletion]);

  const handleViewResearchedSystem = useCallback(() => {
    if (!completedModal) return;
    const system = completedModal.system;
    handleEnterSystem(completedModal.system);
    setState((prev) => ({ ...prev, selectedSystem: system }));
    dismissCompletedModal(system);
  }, [completedModal, dismissCompletedModal, handleEnterSystem]);

  // ── Planet access checks ────────────────────────────────────────────
  // Surface landing: blocked before first evacuation; after — home planet or level 50+
  const canLandOnPlanet = useCallback((planet: Planet): { allowed: boolean; reason?: string; chaos?: boolean; hidden?: boolean } => {
    const isHome = planet.isHomePlanet || (homeInfo != null && planet.id === homeInfo.planet.id);

    // Level 50+ can access any planet's surface
    if (playerLevel >= 50) {
      // But home planet during pre-evacuation chaos is still blocked
      if (isHome && isExodusPhase && evacuationPhase === 'idle') {
        return { allowed: false, chaos: true };
      }
      return { allowed: true };
    }

    // Before level 50: only home planet (or colonizable after evacuation) shows the surface button
    if (!isHome && !planet.isColonizable) {
      return { allowed: false, hidden: true };
    }

    // Home planet during exodus-phase chaos — blocked but show chaos modal
    if (isHome && isExodusPhase && evacuationPhase === 'idle') {
      return { allowed: false, chaos: true };
    }

    // Home planet in non-exodus phase — surface accessible
    if (isHome) return { allowed: true };

    // Colonizable planet — accessible only after evacuation is done
    if (planet.isColonizable && evacuationPhase !== 'idle') return { allowed: true };

    return { allowed: false, hidden: true };
  }, [homeInfo, playerLevel, isExodusPhase, evacuationPhase]);

  // Exosphere: always accessible if system is researched (menu only shows in researched systems)
  const handleViewPlanet = useCallback(() => {
    if (state.selectedPlanet && state.selectedSystem) {
      const planet = state.selectedPlanet; // capture before engine fires onSceneChange
      const system = state.selectedSystem;
      playSfx('go-to-exosphera', 1.0);
      engineRef.current?.showPlanetViewScene(system, planet, true);
      setState((prev) => ({
        ...prev,
        scene: 'planet-view' as const,
        selectedPlanet: planet, // always restore — onSceneChange may have cleared it
        showPlanetMenu: false,
        showPlanetInfo: false,
      }));
    }
  }, [state.selectedPlanet, state.selectedSystem]);

  const handleViewPlanetExosphere = useCallback((system: StarSystem, planetId: string) => {
    const planet = system.planets.find((entry) => entry.id === planetId);
    if (!planet) return;
    playSfx('go-to-exosphera', 1.0);
    setShowCosmicArchive(false);
    setMissionPhotoViewer(null);
    engineRef.current?.showPlanetViewScene(system, planet, true);
    setState((prev) => ({
      ...prev,
      scene: 'planet-view' as const,
      selectedSystem: system,
      selectedPlanet: planet,
      showPlanetMenu: false,
      showPlanetInfo: false,
      planetClickPos: null,
    }));
  }, []);

  const handleShowCharacteristics = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showPlanetMenu: false,
      showPlanetInfo: true,
    }));
  }, []);

  const handleClosePlanetMenu = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showPlanetMenu: false,
      selectedPlanet: null,
      planetClickPos: null,
    }));
  }, []);

  const handleCloseSystemMenu = useCallback(() => {
    setShowSystemMenu(false);
    setSystemMenuPos(null);
    setRadialSystem(null);
    setRadialGetScreenPos(null);
    setState((prev) => ({ ...prev, selectedSystem: null }));
    engineRef.current?.unfocusSystem();
  }, []);

  const handleSystemMenuEnter = useCallback(() => {
    if (!state.selectedSystem) return;
    setShowSystemMenu(false);
    setSystemMenuPos(null);
    setRadialSystem(null);
    setRadialGetScreenPos(null);
    // Same path as double-click on star — star-fold transition then switch scene
    engineRef.current?.enterSystemDirect(state.selectedSystem);
  }, [state.selectedSystem]);

  const [forceShowSystemInfo, setForceShowSystemInfo] = useState(false);
  // Reset forceShowSystemInfo when selected system changes
  useEffect(() => { setForceShowSystemInfo(false); }, [state.selectedSystem?.id]);
  const [charsSystem, setCharsSystem] = useState<StarSystem | null>(null);
  const handleSystemMenuCharacteristics = useCallback(() => {
    setShowSystemMenu(false);
    setRadialSystem(null);
    setRadialGetScreenPos(null);
    setCharsSystem(state.selectedSystem ?? null);
  }, [state.selectedSystem]);

  const handleSystemMenuResearch = useCallback(() => {
    const sys = state.selectedSystem;
    if (!sys || Math.floor(researchData) < getSystemResearchDataCost(sys)) {
      setShowGetResearchData(true);
      return;
    }
    playSfx('research-system-start', 0.25);
    setShowSystemMenu(false);
    setRadialSystem(null);
    setRadialGetScreenPos(null);
    if (sys) {
      handleStartResearch(sys.id);
      setState(prev => ({ ...prev, selectedSystem: null }));
      engineRef.current?.unfocusSystem();
    }
  }, [state.selectedSystem, researchData, getSystemResearchDataCost, handleStartResearch]);

  const handleSystemMenuRename = useCallback(() => {
    if (!state.selectedSystem) return;
    const newName = prompt(t('app.rename_prompt'), state.selectedSystem.name);
    if (newName && newName.trim()) {
      const sys = state.selectedSystem;
      setAlias({
        playerId: playerId.current,
        entityType: 'system',
        entityId: sys.id,
        customName: newName.trim(),
      }).then(() => {
        setAliases((prev) => ({ ...prev, [sys.id]: newName.trim() }));
      }).catch((err) => console.error('Rename failed:', err));
    }
  }, [state.selectedSystem]);

  const handleObjectsList = useCallback(() => {
    if (!state.selectedSystem) return;
    setObjectsPanelSystem(state.selectedSystem);
    setShowObjectsPanel(true);
    // Close the context menu / radial menu
    setShowSystemMenu(false);
    setSystemMenuPos(null);
    setRadialSystem(null);
    setRadialGetScreenPos(null);
    setState((prev) => ({ ...prev, selectedSystem: null }));
    engineRef.current?.unfocusSystem();
  }, [state.selectedSystem]);

  const handleTelescopePhoto = useCallback(() => {
    if (!state.selectedSystem) return;
    handleTelescopePhotoForSystem(state.selectedSystem);
  }, [state.selectedSystem]);

  /** Telescope photo generation — accepts system directly (for both menu and galaxy icon) */
  const handleTelescopePhotoForSystem = useCallback((sys: StarSystem, adPhotoToken?: string) => {
    const sysId = sys.id;

    // Check quark balance (skip if funded by ad token)
    if (!adPhotoToken && quarks < 100) {
      if (isGuest) setShowLinkModal(true); else setShowTopUpModal(true);
      return;
    }

    // Close menu/radial and clear selected system to prevent PixiJS from re-opening it
    setShowSystemMenu(false);
    setSystemMenuPos(null);
    setRadialSystem(null);
    setRadialGetScreenPos(null);
    setState((prev) => ({ ...prev, selectedSystem: null }));
    engineRef.current?.unfocusSystem();

    // Open cinematic telescope overlay
    setTelescopeOverlay({
      phase: 'init',
      targetName: aliases[sysId] || sys.star.name,
      targetType: 'system',
      photoUrl: null,
      photoKey: sysId,
      source: 'system',
    });

    // Transition to capture phase after init animation
    const initTimer = setTimeout(() => {
      setTelescopeOverlay(prev => prev ? { ...prev, phase: 'capture' } : null);
    }, 1500);

    // Mark as generating immediately
    setSystemPhotos(prev => {
      const next = new Map(prev);
      next.set(sysId, { id: `temp-${sysId}`, photoUrl: '', status: 'generating' });
      return next;
    });

    // Helper: reveal photo in overlay (waits for capture phase if needed)
    const revealPhoto = (url: string) => {
      setTelescopeOverlay(prev => {
        if (!prev) return null;
        // If still in init phase, wait a bit then reveal
        if (prev.phase === 'init') {
          clearTimeout(initTimer);
          setTimeout(() => {
            setTelescopeOverlay(p => p ? { ...p, phase: 'reveal', photoUrl: url } : null);
          }, 800);
          return { ...prev, phase: 'capture' };
        }
        return { ...prev, phase: 'reveal', photoUrl: url };
      });
    };

    // Call API
    if (!adPhotoToken) {
      trackPaidFeatureOrder('system_alpha_photo', 100, { system_id: sys.id });
    }
    generateSystemPhoto(playerId.current, sysId, sys, undefined, undefined, undefined, adPhotoToken)
      .then(({ photoId, quarksRemaining, photoUrl }) => {
        if (quarksRemaining !== null && quarksRemaining !== undefined) setQuarks(quarksRemaining);
        if (photoUrl) {
          // Synchronous result (Gemini)
          setSystemPhotos(prev => {
            const next = new Map(prev);
            next.set(sysId, { id: photoId, photoUrl, status: 'succeed', createdAt: new Date().toISOString() });
            return next;
          });
          revealPhoto(photoUrl);
        } else {
          setSystemPhotos(prev => {
            const next = new Map(prev);
            next.set(sysId, { id: photoId, photoUrl: '', status: 'generating' });
            return next;
          });
          // Poll for completion
          pollSystemPhotoStatus(photoId, (result) => {
            if (result.status === 'succeed' && result.photoUrl) {
              setSystemPhotos(prev => {
                const next = new Map(prev);
                next.set(sysId, { id: photoId, photoUrl: result.photoUrl!, status: 'succeed', createdAt: new Date().toISOString() });
                return next;
              });
              revealPhoto(result.photoUrl!);
            } else if (result.status === 'failed') {
              setSystemPhotos(prev => {
                const next = new Map(prev);
                next.set(sysId, { id: photoId, photoUrl: '', status: 'failed' });
                return next;
              });
              setTelescopeOverlay(null);
            }
          });
        }
      })
      .catch(err => {
        console.error('[TelescopePhoto] Error:', err);
        setSystemPhotos(prev => {
          const next = new Map(prev);
          next.delete(sysId);
          return next;
        });
        setTelescopeOverlay(null);
      });
  }, [quarks, aliases]);

  /** Planet photo generation for exosphere, biosphere, and aerial views. */
  const handlePlanetTelescopePhoto = useCallback((photoKind: PlanetPhotoKind = 'exosphere', adPhotoToken?: string) => {
    if (!state.selectedPlanet || !state.selectedSystem) return;
    const planet = state.selectedPlanet;
    const sys = state.selectedSystem;
    const photoKey = `planet-${photoKind}-${planet.id}`;
    const cost = getPlanetPhotoCost(photoKind);

    // Check quark balance (skip if funded by ad token)
    if (!adPhotoToken && quarks < cost) {
      if (isGuest) setShowLinkModal(true); else setShowTopUpModal(true);
      return;
    }

    // Close menu
    setState((prev) => ({ ...prev, showPlanetMenu: false }));

    // Open cinematic telescope overlay
    setTelescopeOverlay({
      phase: 'init',
      targetName: planet.name,
      targetType: 'planet',
      photoUrl: null,
      photoKey,
      source: 'planet',
    });

    // Transition to capture phase after init animation
    const initTimer = setTimeout(() => {
      setTelescopeOverlay(prev => prev ? { ...prev, phase: 'capture' } : null);
    }, 1500);

    // Mark as generating
    setSystemPhotos(prev => {
      const next = new Map(prev);
      next.set(photoKey, { id: `temp-${planet.id}`, photoUrl: '', status: 'generating' });
      return next;
    });

    // Helper: reveal photo in overlay
    const revealPhoto = (url: string) => {
      setTelescopeOverlay(prev => {
        if (!prev) return null;
        if (prev.phase === 'init') {
          clearTimeout(initTimer);
          setTimeout(() => {
            setTelescopeOverlay(p => p ? { ...p, phase: 'reveal', photoUrl: url } : null);
          }, 800);
          return { ...prev, phase: 'capture' };
        }
        return { ...prev, phase: 'reveal', photoUrl: url };
      });
    };

    // Call API with planetId. Planet photo generations use a synthetic key so
    // variants do not overwrite the system panorama row in system_photos.
    if (!adPhotoToken) {
      trackPaidFeatureOrder(`planet_${photoKind}_photo`, getPlanetPhotoCost(photoKind), {
        system_id: sys.id,
        planet_id: planet.id,
      });
    }
    generateSystemPhoto(playerId.current, photoKey, sys, undefined, undefined, planet.id, adPhotoToken, photoKind)
      .then(({ photoId, quarksRemaining, photoUrl }) => {
        if (quarksRemaining !== null && quarksRemaining !== undefined) setQuarks(quarksRemaining);
        if (photoUrl) {
          // Gemini — synchronous, photo already available
          setSystemPhotos(prev => {
            const next = new Map(prev);
            next.set(photoKey, { id: photoId, photoUrl, status: 'succeed', createdAt: new Date().toISOString() });
            return next;
          });
          revealPhoto(photoUrl);
        } else {
          // Async — poll for completion
          setSystemPhotos(prev => {
            const next = new Map(prev);
            next.set(photoKey, { id: photoId, photoUrl: '', status: 'generating' });
            return next;
          });
          pollSystemPhotoStatus(photoId, (result) => {
            if (result.status === 'succeed' && result.photoUrl) {
              setSystemPhotos(prev => {
                const next = new Map(prev);
                next.set(photoKey, { id: photoId, photoUrl: result.photoUrl!, status: 'succeed', createdAt: new Date().toISOString() });
                return next;
              });
              revealPhoto(result.photoUrl!);
            } else if (result.status === 'failed') {
              setSystemPhotos(prev => {
                const next = new Map(prev);
                next.set(photoKey, { id: photoId, photoUrl: '', status: 'failed' });
                return next;
              });
              setTelescopeOverlay(null);
            }
          });
        }
      })
      .catch(err => {
        console.error('[PlanetTelescopePhoto] Error:', err);
        setSystemPhotos(prev => {
          const next = new Map(prev);
          next.delete(photoKey);
          return next;
        });
        setTelescopeOverlay(null);
      });
  }, [state.selectedPlanet, state.selectedSystem, quarks, isGuest]);

  const handleViewPlanetTelescopePhoto = useCallback((planet: Planet, photoKind: PlanetPhotoKind = 'exosphere') => {
    const photoKey = `planet-${photoKind}-${planet.id}`;
    const photo = systemPhotos.get(photoKey);
    if (!photo?.photoUrl) return;

    setTelescopeOverlay({
      phase: 'reveal',
      targetName: planet.name,
      targetType: 'planet',
      photoUrl: photo.photoUrl,
      photoKey,
      source: 'planet',
    });
  }, [systemPhotos]);

  const handleGeneratePlanetSkin = useCallback((_kind: PlanetSkinKind, targetSystem?: StarSystem, targetPlanet?: Planet) => {
    const planet = targetPlanet ?? state.selectedPlanet;
    const sys = targetSystem ?? state.selectedSystem;
    if (!planet || !sys) return;
    const skinKind: PlanetSkinKind = 'exosphere';
    const key = `${skinKind}-${planet.id}`;
    const cost = 50;

    if (cost > 0 && quarks < cost) {
      if (isGuest) setShowLinkModal(true); else setShowTopUpModal(true);
      return;
    }

    handleViewPlanetExosphere(sys, planet.id);
    setPlanetSkinReveal({ planetId: planet.id, planetName: planet.name, status: 'generating', startedAt: Date.now() });
    setPlanetSkins((prev) => {
      const next = new Map(prev);
      next.set(key, {
        id: `temp-${key}`,
        planet_id: planet.id,
        system_id: sys.id,
        kind: skinKind,
        status: 'generating',
        texture_url: null,
        kling_task_id: null,
        prompt_used: null,
        generated_by: playerId.current,
        quarks_paid: cost,
        created_at: new Date().toISOString(),
        completed_at: null,
      });
      return next;
    });
    setToastMessage(t('planet.skin_generating'));
    setTimeout(() => setToastMessage(null), 3000);
    trackPaidFeatureOrder('planet_skin', cost, { system_id: sys.id, planet_id: planet.id, skin_kind: skinKind });

    generatePlanetSkin(playerId.current, sys.id, planet.id, sys, skinKind)
      .then(({ skinId, status, textureUrl, quarksRemaining }) => {
        if (quarksRemaining !== null && quarksRemaining !== undefined) setQuarks(quarksRemaining);
        setPlanetSkins((prev) => {
          const next = new Map(prev);
          next.set(key, {
            id: skinId,
            planet_id: planet.id,
            system_id: sys.id,
            kind: skinKind,
            status,
            texture_url: textureUrl ?? null,
            kling_task_id: null,
            prompt_used: null,
            generated_by: playerId.current,
            quarks_paid: cost,
            created_at: new Date().toISOString(),
            completed_at: status === 'succeed' ? new Date().toISOString() : null,
          });
          return next;
        });

        if (status === 'succeed' && textureUrl) {
          setPlanetSkinReveal({ planetId: planet.id, planetName: planet.name, status: 'succeed', startedAt: Date.now() });
          setToastMessage(t('planet.skin_exosphere_ready'));
          window.setTimeout(() => setPlanetSkinReveal(null), 2600);
          window.setTimeout(() => setToastMessage(null), 3000);
          return;
        }
        pollPlanetSkinStatus(skinId, (result) => {
          if (result.status === 'succeed' && result.textureUrl) {
            setPlanetSkins((prev) => {
              const next = new Map(prev);
              const existing = next.get(key);
              next.set(key, {
                ...(existing ?? {
                  id: skinId,
                  planet_id: planet.id,
                  system_id: sys.id,
                  kind: skinKind,
                  kling_task_id: null,
                  prompt_used: null,
                  generated_by: playerId.current,
                  quarks_paid: cost,
                  created_at: new Date().toISOString(),
                }),
                status: 'succeed',
                texture_url: result.textureUrl ?? null,
                completed_at: new Date().toISOString(),
              });
              return next;
            });
            setPlanetSkinReveal({ planetId: planet.id, planetName: planet.name, status: 'succeed', startedAt: Date.now() });
            setToastMessage(t('planet.skin_exosphere_ready'));
            window.setTimeout(() => setPlanetSkinReveal(null), 2600);
            window.setTimeout(() => setToastMessage(null), 3000);
          } else if (result.status === 'failed') {
            setPlanetSkins((prev) => {
              const next = new Map(prev);
              const existing = next.get(key);
              if (existing) next.set(key, { ...existing, status: 'failed' });
              return next;
            });
            setPlanetSkinReveal(null);
          }
        });
      })
      .catch((err) => {
        console.error('[PlanetSkin] generate failed:', err);
        setPlanetSkins((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
        setPlanetSkinReveal(null);
        const message = err instanceof Error ? err.message : 'Planet skin generation failed';
        setToastMessage(message.includes('planet_skins') || message.includes('does not exist')
          ? t('planet.skin_storage_missing')
          : message);
        setTimeout(() => setToastMessage(null), 3500);
      });
  }, [state.selectedPlanet, state.selectedSystem, quarks, isGuest, t, handleViewPlanetExosphere]);

  const findSystemForPlanetReport = useCallback((report: PlanetReportSummary): StarSystem | null => {
    if (state.selectedSystem?.id === report.systemId) return state.selectedSystem;
    return engineRef.current?.getAllSystems().find((system) => system.id === report.systemId) ?? null;
  }, [state.selectedSystem]);

  const openPlanetMissionReportByIds = useCallback((systemId: string, planetId: string): void => {
    const allSystems = engineRef.current?.getAllSystems() ?? [];
    const sys = allSystems.find((system) => system.id === systemId);
    const planet = sys?.planets.find((entry) => entry.id === planetId);
    const report = planetReports[planetId];
    if (!sys || !planet || !report) return;
    setState((prev) => ({
      ...prev,
      scene: 'system' as const,
      selectedSystem: sys,
      selectedPlanet: null,
      showPlanetMenu: false,
      showPlanetInfo: false,
    }));
    engineRef.current?.showSystemScene(sys);
    setPlanetReportTarget({ planet, report });
  }, [planetReports]);

  const handleSaveMissionProbePhoto = useCallback(async (planet: Planet, report: PlanetReportSummary): Promise<void> => {
    const sys = findSystemForPlanetReport(report);
    if (!sys) return;
    const photoKey = getMissionPhotoKey(planet.id, report);
    setMissionPhotoSaving(true);
    try {
      const imageDataUrl = renderMissionProbePhoto({ planet, star: sys.star, report });
      setMissionPhotoReveal({ imageDataUrl, planetName: planet.name, startedAt: Date.now() });
      const promptUsed = `Deterministic mission instrument render: ${report.missionType}, planet=${planet.name}, reveal=T${report.revealLevel}`;
      const saved = await saveMissionPhoto({
        playerId: playerId.current,
        photoKey,
        imageDataUrl,
        promptUsed,
      });
      setSystemPhotos((prev) => {
        const next = new Map(prev);
        next.set(photoKey, {
          id: saved.photoId,
          photoUrl: saved.photoUrl,
          status: 'succeed',
          createdAt: new Date().toISOString(),
        });
        return next;
      });
      setSavedMissionPhotoKeys((prev) => ({ ...prev, [photoKey]: true }));
      window.setTimeout(() => {
        setMissionPhotoReveal((current) => current?.imageDataUrl === imageDataUrl ? null : current);
        setToastMessage(t('mission_report.photo_saved_to_gallery'));
        setTimeout(() => setToastMessage(null), 3000);
      }, MISSION_PHOTO_REVEAL_MS);
    } catch (err) {
      console.error('[MissionProbePhoto] Error:', err);
      setMissionPhotoReveal(null);
      setToastMessage(t('mission_report.photo_save_failed'));
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setMissionPhotoSaving(false);
    }
  }, [findSystemForPlanetReport, t]);

  const handleMissionAlphaPhoto = useCallback((planet: Planet, report: PlanetReportSummary): void => {
    const sys = findSystemForPlanetReport(report);
    if (!sys) return;
    const photoKind = getMissionAlphaPhotoKind(report);
    const photoKey = getMissionAlphaPhotoKey(planet.id, report);
    const cost = getPlanetPhotoCost(photoKind);
    if (quarks < cost) {
      if (isGuest) setShowLinkModal(true); else setShowTopUpModal(true);
      return;
    }

    setMissionAlphaGenerating(true);
    setPlanetReportTarget(null);
    setTelescopeOverlay({
      phase: 'init',
      targetName: planet.name,
      targetType: 'planet',
      photoUrl: null,
      photoKey,
      source: 'mission',
    });
    const initTimer = window.setTimeout(() => {
      setTelescopeOverlay(prev => prev?.photoKey === photoKey ? { ...prev, phase: 'capture' } : prev);
    }, 1500);
    const revealPhoto = (url: string) => {
      setTelescopeOverlay(prev => {
        if (!prev || prev.photoKey !== photoKey) return prev;
        if (prev.phase === 'init') {
          window.clearTimeout(initTimer);
          window.setTimeout(() => {
            setTelescopeOverlay(current => current?.photoKey === photoKey ? { ...current, phase: 'reveal', photoUrl: url } : current);
          }, 800);
          return { ...prev, phase: 'capture' };
        }
        return { ...prev, phase: 'reveal', photoUrl: url };
      });
    };
    trackPaidFeatureOrder(`mission_${photoKind}_photo`, cost, {
      system_id: sys.id,
      planet_id: planet.id,
      mission_type: report.missionType,
    });

    setSystemPhotos((prev) => {
      const next = new Map(prev);
      next.set(photoKey, { id: `temp-${report.missionId}`, photoUrl: '', status: 'generating' });
      return next;
    });

    generateSystemPhoto(playerId.current, photoKey, sys, undefined, undefined, planet.id, undefined, photoKind, {
      missionType: report.missionType,
      reportSummary: report,
    })
      .then(({ photoId, quarksRemaining, photoUrl }) => {
        if (quarksRemaining !== null && quarksRemaining !== undefined) setQuarks(quarksRemaining);
        if (photoUrl) {
          setSystemPhotos(prev => {
            const next = new Map(prev);
            next.set(photoKey, { id: photoId, photoUrl, status: 'succeed', createdAt: new Date().toISOString() });
            return next;
          });
          revealPhoto(photoUrl);
        } else {
          setSystemPhotos(prev => {
            const next = new Map(prev);
            next.set(photoKey, { id: photoId, photoUrl: '', status: 'generating' });
            return next;
          });
          pollSystemPhotoStatus(photoId, (result) => {
            if (result.status === 'succeed' && result.photoUrl) {
              setSystemPhotos(prev => {
                const next = new Map(prev);
                next.set(photoKey, { id: photoId, photoUrl: result.photoUrl!, status: 'succeed', createdAt: new Date().toISOString() });
                return next;
              });
              revealPhoto(result.photoUrl!);
            } else if (result.status === 'failed') {
              setSystemPhotos(prev => {
                const next = new Map(prev);
                next.set(photoKey, { id: photoId, photoUrl: '', status: 'failed' });
                return next;
              });
              setTelescopeOverlay(prev => prev?.photoKey === photoKey ? null : prev);
            }
          });
        }
      })
      .catch((err) => {
        console.error('[MissionAlphaPhoto] Error:', err);
        setSystemPhotos(prev => {
          const next = new Map(prev);
          next.delete(photoKey);
          return next;
        });
        setTelescopeOverlay(prev => prev?.photoKey === photoKey ? null : prev);
      })
      .finally(() => {
        window.clearTimeout(initTimer);
        setMissionAlphaGenerating(false);
      });
  }, [findSystemForPlanetReport, isGuest, quarks]);

  // Keep ref updated for GameEngine callback (avoid stale closure)
  telescopePhotoRef.current = handleTelescopePhotoForSystem;

  const handleViewSystemPhoto = useCallback(() => {
    if (!state.selectedSystem) return;
    const sysId = state.selectedSystem.id;
    const photo = systemPhotos.get(sysId);
    if (photo?.photoUrl) {
      // Show in telescope overlay (reveal phase, skip init/capture)
      setTelescopeOverlay({
        phase: 'reveal',
        targetName: aliases[sysId] || state.selectedSystem.star.name,
        targetType: 'system',
        photoUrl: photo.photoUrl,
        photoKey: sysId,
        source: 'system',
      });
    }
  }, [state.selectedSystem, systemPhotos, aliases]);

  // ── Telescope overlay callbacks ───────────────────────────────────────
  const buildPhotoShareUrl = useCallback((photoKey: string, photoUrl?: string | null, targetName?: string, source?: string): string => {
    const encoded = encodeURIComponent(photoKey);
    const params = new URLSearchParams();
    if (photoUrl) params.set('image', photoUrl);
    if (targetName) params.set('name', targetName);
    if (source) params.set('type', source);
    const query = params.toString();
    return `https://nebulife.space/photo/${encoded}${query ? `?${query}` : ''}`;
  }, []);

  const buildTelescopeShareText = useCallback((): string => {
    if (!telescopeOverlay) return 'Nebulife';
    const shareUrl = buildPhotoShareUrl(telescopeOverlay.photoKey, telescopeOverlay.photoUrl, telescopeOverlay.targetName, telescopeOverlay.source);
    if (telescopeOverlay.source === 'mission') {
      const signature = i18n.language.startsWith('uk')
        ? `Отримано фото з місії на планету ${telescopeOverlay.targetName}. Небулайф - твій власний космос`
        : `Photo from mission to planet ${telescopeOverlay.targetName}. Nebulife - your own cosmos`;
      return `${signature}\n${shareUrl}`;
    }
    return `Nebulife Telescope: ${telescopeOverlay.targetName}\n${shareUrl}`;
  }, [buildPhotoShareUrl, i18n.language, telescopeOverlay]);

  const handleTelescopeShare = useCallback(async () => {
    if (!telescopeOverlay?.photoUrl) return;
    const text = buildTelescopeShareText();
    const url = buildPhotoShareUrl(telescopeOverlay.photoKey, telescopeOverlay.photoUrl, telescopeOverlay.targetName, telescopeOverlay.source);
    try {
      if (navigator.share) {
        // Try sharing with the photo file
        const response = await fetch(telescopeOverlay.photoUrl);
        const blob = await response.blob();
        const file = new File([blob], 'telescope-photo.jpg', { type: blob.type });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title: 'Nebulife', text, url, files: [file] });
        } else {
          await navigator.share({ title: 'Nebulife', text, url });
        }
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // User cancelled or share failed — silently ignore
    }
  }, [buildPhotoShareUrl, buildTelescopeShareText, telescopeOverlay]);

  const handleTelescopeDownload = useCallback(async () => {
    if (!telescopeOverlay?.photoUrl) return;
    const filename = `nebulife-${telescopeOverlay.photoKey.replace(/[^a-z0-9_-]+/gi, '-')}.jpg`;
    try {
      const response = await fetch(telescopeOverlay.photoUrl);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: filename, files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch {
      window.open(telescopeOverlay.photoUrl, '_blank');
    }
  }, [telescopeOverlay]);

  const handleTelescopeSaveToCollection = useCallback(() => {
    // Photo is already in systemPhotos map — just close overlay with animation
    // The fly-away animation is handled inside TelescopeOverlay
    setToastMessage(t('app.toast.archived'));
    setTimeout(() => setTelescopeOverlay(null), 800);
    // Auto-dismiss toast
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const handleSendMission = useCallback((dur: 'short' | 'long') => {
    if (!state.selectedSystem) return;
    const sys = state.selectedSystem;
    const sysId = sys.id;
    const photo = systemPhotos.get(sysId);
    if (!photo || photo.status !== 'succeed') return;

    setShowSystemMenu(false);
    setSystemMenuPos(null);
    engineRef.current?.unfocusSystem();

    // Mark as generating immediately
    setSystemMissions(prev => {
      const next = new Map(prev);
      next.set(sysId, { id: `temp-${sysId}`, status: 'generating', durationType: dur });
      return next;
    });

    // Call API
    generateSystemMission(playerId.current, sysId, photo.id, dur, sys)
      .then(({ missionId, quarksRemaining }) => {
        setQuarks(quarksRemaining);
        setSystemMissions(prev => {
          const next = new Map(prev);
          next.set(sysId, { id: missionId, status: 'generating', durationType: dur });
          return next;
        });
        // Poll for completion
        pollMissionStatus(missionId, (result) => {
          if (result.status === 'succeed' && result.videoUrl) {
            setSystemMissions(prev => {
              const next = new Map(prev);
              next.set(sysId, { id: missionId, status: 'succeed', videoUrl: result.videoUrl!, durationType: dur });
              return next;
            });
          } else if (result.status === 'failed') {
            setSystemMissions(prev => {
              const next = new Map(prev);
              next.set(sysId, { id: missionId, status: 'failed', durationType: dur });
              return next;
            });
          }
        });
      })
      .catch(err => {
        console.error('[Mission] Error:', err);
        setSystemMissions(prev => {
          const next = new Map(prev);
          next.delete(sysId);
          return next;
        });
      });
  }, [state.selectedSystem, systemPhotos]);

  const handleViewMissionVideo = useCallback(() => {
    if (!state.selectedSystem) return;
    const mission = systemMissions.get(state.selectedSystem.id);
    if (mission?.videoUrl) {
      // Open video in new tab for now
      window.open(mission.videoUrl, '_blank');
    }
  }, [state.selectedSystem, systemMissions]);

  const handleBackToSystem = useCallback(() => {
    if (state.selectedSystem) {
      engineRef.current?.showSystemScene(state.selectedSystem);
      setState((prev) => ({
        ...prev,
        scene: 'system' as const,
        selectedPlanet: null,
        showPlanetMenu: false,
        showPlanetInfo: false,
      }));
    }
  }, [state.selectedSystem]);

  // ── System-to-system navigation (arrows in SystemNavHeader) ─────────
  const handleNavToSystem = useCallback((system: StarSystem) => {
    engineRef.current?.showSystemScene(system);
    setState((prev) => ({
      ...prev,
      scene: 'system' as const,
      selectedSystem: system,
      selectedPlanet: null,
      showPlanetMenu: false,
      showPlanetInfo: false,
    }));
  }, []);

  // ── Discovery handlers ───────────────────────────────────────────────

  /** Loyalty: first discovery or 1/50 lucky from 3rd onward */
  // totalDiscoveries is already incremented by the time the panel renders,
  // so <= 1 means "this is the player's very first discovery"
  const isFirstDiscovery = playerStats.totalDiscoveries <= 1;
  const isLuckyFree = !isFirstDiscovery
    && playerStats.totalDiscoveries >= 3
    && (pendingDiscovery ? ((pendingDiscovery.discovery.timestamp % 50) === 0) : false);

  const handleTelemetry = useCallback(() => {
    if (pendingDiscovery) {
      setTelemetryTarget(pendingDiscovery);
      setDiscoveryQueue(q => q.slice(1));
      setShowCosmicArchive(false); // Close archive so telemetry is visible
      awardXP(XP_REWARDS.TELEMETRY_SCAN, 'telemetry');
    }
  }, [pendingDiscovery]);

  const handleQuantumFocus = useCallback(() => {
    if (pendingDiscovery) {
      const isFree = playerStats.totalDiscoveries <= 1
        || (playerStats.totalDiscoveries >= 3 && (pendingDiscovery.discovery.timestamp % 50) === 0);
      if (!isFree && quarks < 25) {
        if (isGuest) setShowLinkModal(true); else setShowTopUpModal(true);
        return;
      }
      setObservatoryTarget({ ...pendingDiscovery, cost: isFree ? 0 : 25 });
      setDiscoveryQueue(q => q.slice(1));
      setShowCosmicArchive(false); // Close archive so observatory view is visible
      awardXP(XP_REWARDS.OBSERVATORY_SCAN, 'observatory');
    }
  }, [pendingDiscovery, playerStats, quarks, isGuest]);

  /** Ad-funded quantum focus — called with photoToken from AdProgressButton */
  const handleAdQuantumFocus = useCallback((photoToken: string) => {
    if (!pendingDiscovery) return;
    setObservatoryTarget({ ...pendingDiscovery, cost: 0, adPhotoToken: photoToken });
    setDiscoveryQueue(q => q.slice(1));
    setShowCosmicArchive(false);
    awardXP(XP_REWARDS.OBSERVATORY_SCAN, 'observatory');
  }, [pendingDiscovery]);

  const handleSkipDiscovery = useCallback(() => {
    setDiscoveryQueue(q => q.slice(1));
  }, []);

  /** Re-open a discovery from the journal log (find system by id, set pendingDiscovery) */
  const handleOpenDiscoveryFromLog = useCallback((discovery: Discovery) => {
    const allSystems = engineRef.current?.getAllSystems() ?? [];
    const system = allSystems.find((s) => s.id === discovery.systemId);
    if (!system) return;
    setDiscoveryQueue(q => [{ discovery, system }, ...q]);
  }, []);

  const handleCloseObservatory = useCallback(() => {
    setObservatoryTarget(null);
    unblockPopupQueue(2000); // Show next popup 2s after closing observatory
  }, [unblockPopupQueue]);

  const handleCloseTelemetry = useCallback(() => {
    setTelemetryTarget(null);
    unblockPopupQueue(2000); // Show next popup 2s after closing telemetry
  }, [unblockPopupQueue]);

  // ── Tutorial advance handler ─────────────────────────────────────────
  const handleTutorialAdvance = useCallback(() => {
    if (!isTutorialActive) return;
    const step = TUTORIAL_STEPS[tutorialStep];
    if (!step) return;

    // For info steps with sub-steps — advance sub-step first
    if (step.subSteps && step.subSteps.length > 0) {
      if (tutorialSubStep < step.subSteps.length - 1) {
        setTutorialSubStep((prev) => prev + 1);
        return;
      }
    }

    // Execute onComplete actions
    if (step.onComplete) {
      for (const action of step.onComplete) {
        if (action === 'open-archive') {
          setShowCosmicArchive(true);
        } else if (action === 'trigger-discovery') {
          // Fire a tutorial discovery using existing flow
          const allSystems = engineRef.current?.getAllSystems() ?? [];
          const nonHomeSys = allSystems.find((s) => !s.planets.some((p) => p.isHomePlanet));
          if (nonHomeSys) {
            const fakeDiscovery: Discovery = {
              id: `tutorial-discovery-${Date.now()}`,
              type: 'neutron-star',
              category: 'stars',
              galleryCategory: 'cosmos',
              rarity: 'uncommon' as const,
              systemId: nonHomeSys.id,
              timestamp: Date.now(),
            };
            setDiscoveryQueue(q => [{ discovery: fakeDiscovery, system: nonHomeSys }, ...q]);
          }
        } else if (action === 'complete-tutorial') {
          setTutorialStep(tutorialCompleteStep);
          return;
        }
      }
    }

    // Move to next step
    const nextStep = tutorialStep + 1;
    setTutorialSubStep(0);

    if (nextStep >= TUTORIAL_STEPS.length) {
      // Tutorial complete
      setTutorialStep(tutorialCompleteStep);
      return;
    }

    const next = TUTORIAL_STEPS[nextStep];

    // Helper to activate next step (execute onActivate actions)
    const activateStep = (stepIdx: number) => {
      setTutorialStep(stepIdx);
      const s = TUTORIAL_STEPS[stepIdx];
      if (s?.onActivate) {
        for (const action of s.onActivate) {
          if (action === 'open-archive') {
            setShowCosmicArchive(true);
          } else if (action.startsWith('navigate-')) {
            const parts = action.replace('navigate-', '').split('-');
            if (parts.length >= 2) {
              const mainTab = parts[0];
              const subTab = parts.slice(1).join('-');
              setTimeout(() => {
                cosmicArchiveRef.current?.navigateTo(mainTab, subTab);
              }, 100);
            }
          } else if (action === 'close-archive') {
            setShowCosmicArchive(false);
          }
        }
      }
    };

    // Delay activation if step has activateDelay
    if (next?.activateDelay) {
      setTimeout(() => activateStep(nextStep), next.activateDelay);
    } else {
      activateStep(nextStep);
    }
  }, [isTutorialActive, tutorialStep, tutorialSubStep, tutorialCompleteStep]);

  const handleTutorialSkip = useCallback(() => {
    setTutorialStep(tutorialCompleteStep);
  }, [tutorialCompleteStep]);

  const handleSaveToGallery = useCallback((discoveryId: string, imageUrl: string) => {
    // Find the active discovery (from observatory or telemetry)
    const activeDiscovery = observatoryTarget?.discovery ?? telemetryTarget?.discovery;
    if (!activeDiscovery) {
      console.log(`[Gallery] Saved discovery ${discoveryId} with image ${imageUrl}`);
      return;
    }

    const objectType = activeDiscovery.type;
    const existing = galleryMap.get(objectType);

    // Helper: persist to server and update local map
    const persistDiscovery = (disc: Discovery, imgUrl: string) => {
      const entry: DiscoveryData = {
        id: disc.id,
        player_id: playerId.current,
        object_type: disc.type,
        rarity: disc.rarity,
        gallery_category: disc.galleryCategory,
        system_id: disc.systemId,
        planet_id: disc.planetId ?? null,
        photo_url: imgUrl,
        prompt_used: null,
        scientific_report: null,
        discovered_at: new Date().toISOString(),
      };
      setGalleryMap((prev) => {
        const next = new Map(prev);
        next.set(objectType, entry);
        return next;
      });
      // Persist to server (fire & forget)
      saveDiscoveryToServer({
        id: disc.id,
        playerId: playerId.current,
        objectType: disc.type,
        rarity: disc.rarity,
        galleryCategory: disc.galleryCategory,
        systemId: disc.systemId,
        planetId: disc.planetId ?? null,
        photoUrl: imgUrl,
      }).catch((err) => console.error('[Gallery] Save failed:', err));
    };

    if (existing && existing.photo_url) {
      // Cell is occupied — show comparison modal
      setGalleryCompare({
        newDiscovery: activeDiscovery,
        newImageUrl: imageUrl,
        existingData: existing,
      });
    } else {
      // Cell is free — save directly
      persistDiscovery(activeDiscovery, imageUrl);
      awardXP(XP_REWARDS.GALLERY_SAVE, 'gallery_save');
      // Close telemetry/observatory and show archive with highlight
      setTelemetryTarget(null);
      setObservatoryTarget(null);
      setHighlightedGalleryType(objectType);
      setShowCosmicArchive(true);
      // Show next queued popup 5s after "в колекцію"
      unblockPopupQueue(5000);
      // Clear highlight after animation
      setTimeout(() => setHighlightedGalleryType(null), 3000);
      if (TUTORIAL_STEPS[tutorialStep]?.id === 'save-gallery') {
        handleTutorialAdvance();
      }
    }
  }, [observatoryTarget, telemetryTarget, galleryMap, tutorialStep, handleTutorialAdvance, unblockPopupQueue]);

  /** Replace existing gallery entry with new one */
  const handleGalleryReplace = useCallback(() => {
    if (!galleryCompare) return;
    const { newDiscovery, newImageUrl } = galleryCompare;
    setGalleryMap((prev) => {
      const next = new Map(prev);
      next.set(newDiscovery.type, {
        id: newDiscovery.id,
        player_id: playerId.current,
        object_type: newDiscovery.type,
        rarity: newDiscovery.rarity,
        gallery_category: newDiscovery.galleryCategory,
        system_id: newDiscovery.systemId,
        planet_id: newDiscovery.planetId ?? null,
        photo_url: newImageUrl,
        prompt_used: null,
        scientific_report: null,
        discovered_at: new Date().toISOString(),
      });
      return next;
    });
    // Persist replacement to server
    saveDiscoveryToServer({
      id: newDiscovery.id,
      playerId: playerId.current,
      objectType: newDiscovery.type,
      rarity: newDiscovery.rarity,
      galleryCategory: newDiscovery.galleryCategory,
      systemId: newDiscovery.systemId,
      planetId: newDiscovery.planetId ?? null,
      photoUrl: newImageUrl,
    }).catch((err) => console.error('[Gallery] Replace save failed:', err));
    setGalleryCompare(null);
    if (TUTORIAL_STEPS[tutorialStep]?.id === 'save-gallery') {
      setTelemetryTarget(null);
      setObservatoryTarget(null);
      setHighlightedGalleryType(newDiscovery.type);
      setShowCosmicArchive(true);
      unblockPopupQueue(5000);
      setTimeout(() => setHighlightedGalleryType(null), 3000);
      handleTutorialAdvance();
    }
  }, [galleryCompare, tutorialStep, unblockPopupQueue, handleTutorialAdvance]);

  /** Keep old gallery entry */
  const handleGalleryKeepOld = useCallback(() => {
    if (galleryCompare && TUTORIAL_STEPS[tutorialStep]?.id === 'save-gallery') {
      setTelemetryTarget(null);
      setObservatoryTarget(null);
      setHighlightedGalleryType(galleryCompare.newDiscovery.type);
      setShowCosmicArchive(true);
      unblockPopupQueue(5000);
      setTimeout(() => setHighlightedGalleryType(null), 3000);
      handleTutorialAdvance();
    }
    setGalleryCompare(null);
  }, [galleryCompare, tutorialStep, unblockPopupQueue, handleTutorialAdvance]);

  // ── Evacuation handlers ──────────────────────────────────────────────
  const handleStartEvacuation = useCallback(() => {
    if (!evacuationTarget) {
      // eslint-disable-next-line no-console
      console.warn('[evac] handleStartEvacuation called with no target — noop');
      return;
    }
    // Diagnostic: lets testers + HANDOFF traces see what system the
    // evacuation is actually pointing at, so "sent to the same system
    // I was in before" reports can be verified against actual state.
    // eslint-disable-next-line no-console
    console.log('[evac] start → target', {
      systemId: evacuationTarget.system.id,
      systemName: evacuationTarget.system.star.name,
      planetId: evacuationTarget.planet.id,
      planetName: evacuationTarget.planet.name,
      currentHome: homeInfo ? { systemId: homeInfo.system.id, planetId: homeInfo.planet.id } : null,
    });
    playSfx('evac-alarm', 0.25);
    setEvacuationPhase('stage0-launch');
    awardXP(XP_REWARDS.EVACUATION_START, 'evacuation');
    // Immediate sync on critical event
    setTimeout(() => syncGameStateRef.current(), 100);
  }, [evacuationTarget, homeInfo]);

  // Forced evacuation: skip prompt, auto-start immediately
  useEffect(() => {
    if (!forcedEvacuation || !evacuationTarget || evacuationPhase !== 'idle') return;
    handleStartEvacuation();
  }, [forcedEvacuation, evacuationTarget, evacuationPhase, handleStartEvacuation]);

  // Stage 0 complete → switch to system scene, start ship flight
  const handleStage0Complete = useCallback(() => {
    if (!evacuationTarget) return;
    engineRef.current?.showSystemScene(evacuationTarget.system);
    setState((prev) => ({ ...prev, scene: 'system', selectedSystem: evacuationTarget.system }));
    // Start ship flight to target planet
    setTimeout(() => {
      engineRef.current?.startSystemShipFlight(evacuationTarget.planet.id);
    }, 300);
    setEvacuationPhase('stage1-system-flight');
  }, [evacuationTarget]);

  // Poll ship progress in stage1 — at 60% fade to black, then switch to explosion
  useEffect(() => {
    if (evacuationPhase !== 'stage1-system-flight') return;
    const pollId = setInterval(() => {
      const progress = engineRef.current?.getSystemShipProgress() ?? 0;
      if (progress >= 0.6 && !evacuationFadeBlack) {
        setEvacuationFadeBlack(true);
        // After fade (0.8s), switch to explosion cutscene
        setTimeout(() => {
          engineRef.current?.stopSystemShipFlight();
          setEvacuationFadeBlack(false);
          setEvacuationPhase('stage2-explosion');
        }, 800);
      }
    }, 100);
    return () => clearInterval(pollId);
  }, [evacuationPhase, evacuationFadeBlack]);

  // Stage 2 complete → switch to planet-view, start ship approach
  const handleStage2Complete = useCallback(() => {
    if (!evacuationTarget) return;
    engineRef.current?.showPlanetViewScene(evacuationTarget.system, evacuationTarget.planet);
    setState((prev) => ({
      ...prev,
      scene: 'planet-view',
      selectedSystem: evacuationTarget.system,
      selectedPlanet: evacuationTarget.planet,
    }));
    setTimeout(() => {
      globeRef.current?.startShipApproach();
    }, 300);
    setEvacuationPhase('stage3-planet-approach');
  }, [evacuationTarget]);

  // Poll ship approach in stage3 — when on orbit, switch to stage4
  useEffect(() => {
    if (evacuationPhase !== 'stage3-planet-approach') return;
    const pollId = setInterval(() => {
      if (globeRef.current?.isShipOnOrbit()) {
        setEvacuationPhase('stage4-orbit');
      }
    }, 100);
    return () => clearInterval(pollId);
  }, [evacuationPhase]);

  // Colony founding
  const handleFoundColony = useCallback(() => {
    globeRef.current?.stopShipFlight();
    setEvacuationPhase('cutscene-landing');
  }, []);

  const handleCutsceneLandingComplete = useCallback(() => {
    if (!evacuationTarget) return;
    awardXP(XP_REWARDS.COLONY_FOUNDED, 'colony_founded');

    // Save old home planet as destroyed (locally for instant UI + cluster-wide for neighbors)
    if (homeInfo) {
      try {
        const raw = localStorage.getItem('nebulife_destroyed_planets');
        const destroyed: Array<{ planetId: string; systemId: string; orbitAU: number }> = raw ? JSON.parse(raw) : [];
        destroyed.push({
          planetId: homeInfo.planet.id,
          systemId: homeInfo.system.id,
          orbitAU: homeInfo.planet.orbit.semiMajorAxisAU,
        });
        localStorage.setItem('nebulife_destroyed_planets', JSON.stringify(destroyed));
      } catch { /* ignore */ }

      // Cluster-wide: persist destruction so all neighbors see this planet gone
      void recordDestruction({
        systemId: homeInfo.system.id,
        planetId: homeInfo.planet.id,
        orbitAU: homeInfo.planet.orbit.semiMajorAxisAU,
        reason: 'doomsday',
      });
    }

    // Update home planet on server
    updatePlayer(playerId.current, {
      home_system_id: evacuationTarget.system.id,
      home_planet_id: evacuationTarget.planet.id,
      game_phase: 'colonizing',
    }).catch((err) => console.error('Home update failed:', err));

    // Persist new home IDs to localStorage (so engine init picks them up on reload)
    try {
      localStorage.setItem('nebulife_home_system_id', evacuationTarget.system.id);
      localStorage.setItem('nebulife_home_planet_id', evacuationTarget.planet.id);
    } catch { /* ignore */ }
    setAdsUnlockedAfterSettlement(true);

    // Clear evacuation localStorage IMMEDIATELY (don't rely on useEffect which runs after render)
    // This prevents beforeunload sync from sending stale evac data to server
    try {
      localStorage.removeItem('nebulife_evac_system_id');
      localStorage.removeItem('nebulife_evac_planet_id');
      localStorage.removeItem('nebulife_evac_forced');
      localStorage.setItem('nebulife_evac_phase', 'idle');
    } catch { /* ignore */ }

    // Update GameEngine rings: move ownerPlayerId + isHomePlanet to new system/planet
    engineRef.current?.updateHomeSystem(evacuationTarget.system.id, evacuationTarget.planet.id);

    // Update local home info
    setHomeInfo({ system: evacuationTarget.system, planet: evacuationTarget.planet });
    ensureHomePlanetStockFloor(evacuationTarget.planet);

    // Reset research state: observatories were on the destroyed planet
    // Start with 1 slot for colony hub's built-in observatory
    const emptyResearch: ResearchState = {
      slots: [{ slotIndex: 0, systemId: null, startedAt: null, sourcePlanetRing: 0 }],
      systems: researchState.systems,
    };
    setResearchState(emptyResearch);
    // Persist IMMEDIATELY to localStorage (don't wait for useEffect — sync might read stale data)
    try { localStorage.setItem('nebulife_research_state', JSON.stringify(emptyResearch)); } catch { /* ignore */ }

    // Transition to colonization
    setIsExodusPhase(false);
    setEvacuationPhase('idle');
    setEvacuationTarget(null);
    setForcedEvacuation(false);

    // Ensure tutorial is complete after colonization
    if (isTutorialActive) {
      setTutorialStep(tutorialCompleteStep);
    }

    // Transfer resources from the old home planet to the new colony planet.
    // The evacuation ship carries the stockpile — one-time handoff (Phase 7B).
    const newPlanetId = evacuationTarget.planet.id;
    const oldPlanetId = homeInfo?.planet.id;
    if (oldPlanetId && oldPlanetId !== newPlanetId) {
      setColonyResourcesByPlanet((prev) => {
        const carried = prev[oldPlanetId] ?? { minerals: 0, volatiles: 0, isotopes: 0, water: 0 };
        const existing = prev[newPlanetId] ?? { minerals: 0, volatiles: 0, isotopes: 0, water: 0 };
        const merged = { ...prev };
        // Move old planet's resources onto new planet, clear old entry
        merged[newPlanetId] = {
          minerals:  Math.max(existing.minerals  + carried.minerals,  POST_EVACUATION_RESOURCE_RESERVE.minerals),
          volatiles: Math.max(existing.volatiles + carried.volatiles, POST_EVACUATION_RESOURCE_RESERVE.volatiles),
          isotopes:  Math.max(existing.isotopes  + carried.isotopes,  POST_EVACUATION_RESOURCE_RESERVE.isotopes),
          water:     Math.max(existing.water     + carried.water,     POST_EVACUATION_RESOURCE_RESERVE.water),
        };
        delete merged[oldPlanetId];
        return merged;
      });
    } else {
      setColonyResourcesByPlanet((prev) => {
        const existing = prev[newPlanetId] ?? { minerals: 0, volatiles: 0, isotopes: 0, water: 0 };
        return {
          ...prev,
          [newPlanetId]: {
            minerals: Math.max(existing.minerals, POST_EVACUATION_RESOURCE_RESERVE.minerals),
            volatiles: Math.max(existing.volatiles, POST_EVACUATION_RESOURCE_RESERVE.volatiles),
            isotopes: Math.max(existing.isotopes, POST_EVACUATION_RESOURCE_RESERVE.isotopes),
            water: Math.max(existing.water, POST_EVACUATION_RESOURCE_RESERVE.water),
          },
        };
      });
    }

    // Open surface view for the colony planet
    setSurfaceTarget({
      planet: evacuationTarget.planet,
      star: evacuationTarget.system.star,
    });

    // Critical sync: directly send the empty research state to server.
    // Can't rely on setTimeout + syncGameStateRef because the React state update
    // (setResearchState) may not be reflected in buildGameStateSnapshot() yet.
    // Also update gameStateRef so beforeunload handler doesn't re-send stale 3-slot data.
    const pid = playerId.current;
    if (pid) {
      const directPatch = { research_state: emptyResearch, exodus_phase: false };
      const merged = { ...gameStateRef.current, ...directPatch };
      gameStateRef.current = merged as Record<string, unknown>;
      updatePlayer(pid, { game_state: merged as unknown as Record<string, unknown> })
        .catch((err) => console.error('Post-evacuation sync failed:', err));
    }
    // Also schedule normal sync for the rest of the state
    setTimeout(() => syncGameStateRef.current(), 500);
  }, [evacuationTarget, ensureHomePlanetStockFloor, homeInfo]);

  // Keep currentSceneRef in sync with state.scene for use in async callbacks
  useEffect(() => { currentSceneRef.current = state.scene; }, [state.scene]);

  // Listen for global quark balance updates (e.g. from daily login bonus)
  useEffect(() => {
    const handler = (e: Event) => {
      const newBalance = (e as CustomEvent<number>).detail;
      if (typeof newBalance === 'number') setQuarks(newBalance);
    };
    window.addEventListener('nebulife:quark-balance', handler);
    return () => window.removeEventListener('nebulife:quark-balance', handler);
  }, []);

  // ── Cluster shared state — load destroyed planets / colonies on system entry ──
  // The cluster-state module caches results for 30 s and degrades silently to
  // empty state if the server is unreachable, so this never blocks the UI.
  const [, setClusterStateBump] = useState(0);
  useEffect(() => {
    if (state.scene !== 'system' || !state.selectedSystem) return;
    const sysId = state.selectedSystem.id;
    void getSystemSharedState(sysId).then(() => {
      // Trigger re-render — destroyed planets need to disappear visually for
      // ALL viewers, not just the player who destroyed them.
      setClusterStateBump(b => b + 1);
    });
  }, [state.scene, state.selectedSystem?.id]);

  // ── Heartbeat — every 30 s while playing, plus on scene change ──
  // Sends current scene + system to server; receives online cluster members.
  useEffect(() => {
    if (!firebaseUser) return; // not logged in yet
    const tick = () => {
      const sysId = state.selectedSystem?.id ?? null;
      void sendHeartbeat({ currentScene: state.scene ?? null, currentSystemId: sysId });
    };
    tick(); // immediate on mount / scene change
    const interval = setInterval(tick, 30_000);
    return () => clearInterval(interval);
  }, [state.scene, state.selectedSystem?.id, firebaseUser]);

  // ── System notification helper ────────────────────────────────────────
  const addSystemNotif = useCallback((planetName: string, systemId: string, planetId: string) => {
    setSystemNotifs((prev) => [
      ...prev,
      {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: t('app.notif.quantum_synth').replace('{planet}', planetName),
        planetName,
        systemId,
        planetId,
        timestamp: Date.now(),
        read: false,
      },
    ]);
  }, []);

  // ── System Log helper ──────────────────────────────────────────────────
  const addLogEntry = useCallback((
    category: LogCategory,
    text: string,
    extra?: { planetName?: string; systemId?: string; planetId?: string; objectType?: string; discoveryRef?: Discovery },
  ) => {
    setLogEntries((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        category,
        text,
        timestamp: Date.now(),
        ...extra,
      },
    ]);
  }, []);

  const handleStartObservatorySearch = useCallback((duration: ObservatorySearchDuration, program: ObservatorySearchProgram): void => {
    const now = Date.now();
    setObservatoryState((prev) => startObservatorySearch(
      normalizeObservatoryState(prev),
      duration,
      program,
      now,
      `${playerId.current || 'local'}:${homeInfo?.system.id ?? 'home'}`,
    ));
    scheduleSyncToServer();
  }, [homeInfo?.system.id, scheduleSyncToServer]);

  useEffect(() => {
    if (!homeInfo) return;
    const completeReady = () => {
      const now = Date.now();
      const result = completeReadyObservatorySearches(observatoryStateRef.current, COSMIC_CATALOG, now);
      if (result.results.length === 0) return;

      setObservatoryState(result.state);
      const discoveryItems: Array<{ discovery: Discovery; system: StarSystem }> = [];
      for (const searchResult of result.results) {
        if (!searchResult.discovery) {
          addLogEntry('science', t('observatory.search_no_signal_log'));
          continue;
        }

        const discovery = { ...searchResult.discovery, systemId: homeInfo.system.id };
        discoveryItems.push({ discovery, system: homeInfo.system });
        const entry = getCatalogEntry(discovery.type) as CatalogEntry | undefined;
        const name = entry ? getCatalogName(entry, i18n.language) : discovery.type;
        addLogEntry('science',
          searchResult.duplicate
            ? t('observatory.search_duplicate_log').replace('{name}', name)
            : t('observatory.search_found_log').replace('{name}', name),
          { systemId: homeInfo.system.id, objectType: discovery.type, discoveryRef: discovery },
        );
        if (searchResult.leveledUp) {
          addLogEntry('science',
            t('observatory.level_up_log').replace('{level}', String(getObservatoryLevel(searchResult.state))),
            { systemId: homeInfo.system.id, objectType: 'observatory_level' },
          );
        }
      }

      if (discoveryItems.length > 0) {
        setDiscoveryQueue((queue) => [...queue, ...discoveryItems]);
        setPlayerStats((stats) => ({
          ...stats,
          totalDiscoveries: stats.totalDiscoveries + discoveryItems.length,
        }));
      }

      scheduleSyncToServer();
    };

    completeReady();
    const id = window.setInterval(completeReady, 30_000);
    return () => window.clearInterval(id);
  }, [addLogEntry, homeInfo, i18n.language, scheduleSyncToServer, t]);

  // ── Digest modal event listener ──
  useEffect(() => {
    const handleOpenDigest = async (_e: Event) => {
      try {
        const res = await apiFetch('/api/digest/latest', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('nebulife_firebase_token') ?? ''}` },
        });
        if (!res.ok) {
          console.warn('[digest] API response not ok:', res.status, res.statusText);
          setToastMessage(t('digest.load_error'));
          setTimeout(() => setToastMessage(null), 3500);
          return;
        }
        const data = await res.json();
        if (!data.digest) {
          console.warn('[digest] No digest in response:', data);
          setToastMessage(t('digest.not_available'));
          setTimeout(() => setToastMessage(null), 3500);
          return;
        }
        // Use player's preferred language, fallback to other
        const digestLang = lang === 'en' ? 'en' : 'uk';
        const images = data.digest.images?.[digestLang] ?? data.digest.images?.uk ?? data.digest.images?.en ?? [];
        if (images.length > 0) {
          setDigestModalImages(images);
          setDigestModalWeekDate(data.digest.weekDate);
          // Mark digest as seen
          const weekDate = data.digest.weekDate as string;
          setLastDigestSeen(weekDate);
          const pid = playerId.current;
          if (pid) updatePlayer(pid, { last_digest_seen: weekDate }).catch(() => {});
        } else {
          console.warn('[digest] No images found for lang:', digestLang, data.digest.images);
          setToastMessage(t('digest.not_available'));
          setTimeout(() => setToastMessage(null), 3500);
        }
      } catch (err) {
        console.warn('[digest] Network or parse error:', err);
        setToastMessage(t('digest.load_error'));
        setTimeout(() => setToastMessage(null), 3500);
      }
    };
    window.addEventListener('nebulife:open-digest', handleOpenDigest);
    return () => window.removeEventListener('nebulife:open-digest', handleOpenDigest);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // ── Pause/resume PixiJS when CosmicArchive (Terminal) is open ─────────
  useEffect(() => {
    if (showCosmicArchive) {
      engineRef.current?.pause();
      surfaceViewRef.current?.pause();
    } else {
      engineRef.current?.resume();
      surfaceViewRef.current?.resume();
    }
  }, [showCosmicArchive]);

  // ── Language change → sync to server ─────────────────────────────────
  useEffect(() => {
    const pid = playerId.current;
    if (!pid) return;
    updatePlayer(pid, { preferred_language: lang }).catch(() => {});
  }, [lang]);

  // ── URL param: ?action=open-digest (from push notification click) ─────
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('action') === 'open-digest') {
        window.dispatchEvent(new CustomEvent('nebulife:open-digest'));
        url.searchParams.delete('action');
        url.searchParams.delete('weekDate');
        window.history.replaceState({}, '', url.toString());
      }
    } catch { /* ignore */ }
  }, []);

  // ── SW message listener (foreground push click from background SW) ────
  useEffect(() => {
    const unsubForeground = startForegroundListener();
    const handlePushDigest = () => {
      window.dispatchEvent(new CustomEvent('nebulife:open-digest'));
    };
    window.addEventListener('nebulife:push-digest', handlePushDigest);
    if (!('serviceWorker' in navigator)) {
      return () => {
        unsubForeground?.();
        window.removeEventListener('nebulife:push-digest', handlePushDigest);
      };
    }
    const handleSwMessage = (e: MessageEvent) => {
      if (e.data?.type === 'open-digest') {
        window.dispatchEvent(new CustomEvent('nebulife:open-digest', {
          detail: { weekDate: e.data.weekDate },
        }));
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      unsubForeground?.();
      window.removeEventListener('nebulife:push-digest', handlePushDigest);
    };
  }, []);

  // ── Fetch latest digest (for new-digest indicator) ────────────────────
  useEffect(() => {
    const token = localStorage.getItem('nebulife_firebase_token') ?? '';
    apiFetch('/api/digest/latest', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.digest?.weekDate) setLatestDigestWeekDate(data.digest.weekDate as string);
      })
      .catch(() => {});
  }, []);

  // ── Award XP & level-up detection (assign to ref for stable callbacks) ──
  awardXPRef.current = (amount: number, _reason: string) => {
    setPlayerXP((prevXP) => {
      const newXP = prevXP + amount;
      const oldLevel = levelFromXP(prevXP);
      const newLevel = levelFromXP(newXP);

      if (newLevel > oldLevel) {
        setPlayerLevel(newLevel);
        setLevelUpQueue(q => [...q, newLevel]);
        addLogEntry('system', t('app.log.level_up').replace('{level}', String(newLevel)));

        // Auto-research all newly available technologies (cascade — new prereqs may unlock more)
        let currentTech = techTreeStateRef.current;
        const newlyResearched: TechNode[] = [];
        let changed = true;
        while (changed) {
          changed = false;
          for (const nd of ALL_NODES) {
            if (currentTech.researched[nd.id]) continue;
            const st = getTechNodeStatus(nd, newLevel, currentTech);
            if (st === 'available') {
              currentTech = researchTech(currentTech, nd.id);
              newlyResearched.push(nd);
              changed = true;
            }
          }
        }
        if (newlyResearched.length > 0) {
          setTechTreeState(currentTech);
          techTreeStateRef.current = currentTech;
          for (const nd of newlyResearched) {
            addLogEntry('system', t('app.log.tech_integrated').replace('{name}', nd.name));
          }
          // Queue a toast for every newly-unlocked tech — they'll be shown
          // one at a time (see the pendingResearchToasts useEffect, ~2-3s
          // apart). Previously only the LAST tech got a toast, so players
          // missed intermediate unlocks (e.g. on L7 you'd see Aero but miss
          // Capacitor, or vice versa depending on ALL_NODES iteration order).
          setPendingResearchToasts((q) => [
            ...q,
            ...newlyResearched.map((nd) => ({
              id:       Math.random().toString(36).slice(2),
              techId:   nd.id,
              techName: nd.name,
              branch:   nd.branch as ResearchToastItem['branch'],
            })),
          ]);
          // Expand research slots if observatory/concurrent effects gained
          const extraSlots =
            getEffectValue(currentTech, 'observatory_count_add', 0) +
            getEffectValue(currentTech, 'concurrent_research_add', 0);
          // During exodus phase, base = HOME_OBSERVATORY_COUNT (built-in observatories).
          // After evacuation+colonization, base = current slot count (player-built observatories).
          setResearchState((prev) => {
            const baseCount = isExodusPhaseRef.current ? HOME_OBSERVATORY_COUNT : prev.slots.length;
            const totalNeeded = baseCount + extraSlots;
            if (prev.slots.length >= totalNeeded) return prev;
            const extended = [...prev.slots];
            while (extended.length < totalNeeded) {
              extended.push({ slotIndex: extended.length, systemId: null, startedAt: null, sourcePlanetRing: 0 });
            }
            return { ...prev, slots: extended };
          });
        }
      }

      // Schedule debounced sync (instead of immediate fire-and-forget per XP award)
      scheduleSyncToServer();

      return newXP;
    });
  };

  // ── Keyboard navigation (galaxy arrows + Escape) ──────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Only handle in galaxy scene, when not warping
      if (state.scene !== 'galaxy') return;

      if (e.key === 'Escape') {
        // Close radial menu + return to overview
        setRadialSystem(null);
        setRadialGetScreenPos(null);
        setShowSystemMenu(false);
        setSystemMenuPos(null);
        setState((prev) => ({ ...prev, selectedSystem: null }));
        engineRef.current?.unfocusSystem();
        return;
      }

      const dirs: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0], ArrowRight: [1, 0],
        ArrowUp: [0, -1], ArrowDown: [0, 1],
      };
      const dir = dirs[e.key];
      if (!dir) return;
      e.preventDefault();

      engineRef.current?.galaxyNavigateDirection(dir[0], dir[1]);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.scene]);

  useEffect(() => {
    try { localStorage.setItem('nebulife_astra_quiz_answers', JSON.stringify(astraQuizAnswers)); }
    catch { /* ignore quota */ }
  }, [astraQuizAnswers]);

  const handleAstraDigestSeen = useCallback((weekDate: string): void => {
    setLastDigestSeen((prev) => (prev == null || weekDate > prev ? weekDate : prev));
    const pid = playerId.current;
    if (pid) updatePlayer(pid, { last_digest_seen: weekDate }).catch(() => {});
  }, []);

  const handleAstraQuizAnswer = useCallback((messageId: string, selectedIndex: number): void => {
    setAstraQuizAnswers((prev) => {
      if (prev[messageId] !== undefined) return prev;
      const next = { ...prev, [messageId]: selectedIndex };
      const pid = playerId.current;
      if (pid) {
        updatePlayer(pid, {
          game_state: { astra_quiz_answers: next },
        }).catch(() => {});
      }
      return next;
    });
  }, []);

  // ── Cross-platform game state sync ─────────────────────────────────────
  /** Build a full snapshot of current game state for server sync. */
  const buildGameStateSnapshot = (): SyncedGameState => {
    let destroyedPlanets: Array<{ planetId: string; systemId: string; orbitAU: number }> = [];
    try {
      const raw = localStorage.getItem('nebulife_destroyed_planets');
      if (raw) destroyedPlanets = JSON.parse(raw);
    } catch { /* ignore */ }

    return {
      xp: playerXP,
      level: playerLevel,
      research_state: researchState,
      player_stats: playerStats,
      research_data: Math.floor(researchData),
      last_regen_time: Date.now(),
      colony_resources: colonyResources,
      colony_resources_by_planet: colonyResourcesByPlanet,
      chemical_inventory: chemicalInventory,
      exodus_phase: isExodusPhase,
      destroyed_planets: destroyedPlanets,
      onboarding_done: localStorage.getItem('nebulife_onboarding_done') === '1',
      tutorial_step: tutorialStep,
      tech_tree: techTreeState,
      game_started_at: gameStartedAt,
      time_multiplier: timeMultiplier,
      accel_at: accelAt,
      game_time_at_accel: gameTimeAtAccel,
      clock_revealed: localStorage.getItem('nebulife_clock_revealed') === '1',
      scene: state.scene,
      nav_system: state.selectedSystem?.id ?? '',
      nav_planet: state.selectedPlanet?.id ?? '',
      // Log & favorites
      log_entries: logEntries,
      favorite_planets: [...favoritePlanets],
      // Evacuation
      evac_system_id: localStorage.getItem('nebulife_evac_system_id'),
      evac_planet_id: localStorage.getItem('nebulife_evac_planet_id'),
      evac_forced: localStorage.getItem('nebulife_evac_forced') === 'true',
      // Home planet (backup; direct DB columns home_system_id/home_planet_id are authoritative)
      home_system_id: localStorage.getItem('nebulife_home_system_id') ?? '',
      home_planet_id: localStorage.getItem('nebulife_home_planet_id') ?? '',
      // Terraforming — only persist planets with active progress to save space
      terraform_states: Object.fromEntries(
        Object.entries(terraformStates).filter(([, s]) => s.completedAt !== null || getOverallProgress(s) > 0),
      ),
      fleet: fleet.filter((m) => m.phase !== 'idle'),
      fleet_state: shipFleet,
      planet_reveal_levels: planetRevealLevels,
      planet_missions: planetMissions,
      planet_reports: planetReports,
      exploration_payloads: explorationPayloads,
      exploration_production_queue: explorationProductionQueue,
      arena_stats: arenaStats ?? undefined,
      hangar_ship: localStorage.getItem('nebulife_hangar_ship') ?? undefined,
      custom_ship_id: localStorage.getItem('nebulife_custom_ship_id'),
      custom_ship_glb_url: localStorage.getItem('nebulife_custom_ship_glb_url'),
      observatory_state: observatoryState,
      astra_quiz_answers: astraQuizAnswers,
      // Planet overrides — type/habitability mutations from terraform completion (Phase 7C)
      planet_overrides: planetOverrides,
      // Planet resource stocks (v168 — finite extraction deposits; stored in JSONB)
      planet_resource_stocks: planetResourceStocksRef.current,
      synced_at: Date.now(),
    };
  };

  // ── Notification preference toggles ─────────────────────────────────

  const handleToggleEmailNotif = useCallback((val: boolean) => {
    setEmailNotifications(val);
    const pid = playerId.current;
    if (pid) updatePlayer(pid, { email_notifications: val }).catch(() => {});
  }, []);

  const handleTogglePushNotif = useCallback(async (val: boolean) => {
    const pid = playerId.current;
    if (!pid) return;
    if (val) {
      const { token, issue } = await requestPushPermissionDetailed();
      if (!token) {
        setPushNotifications(false);
        console.warn('[push] permission/token failed:', issue);
        setToastMessage(`Push notifications unavailable: ${issue ?? 'unknown'}`);
        setTimeout(() => setToastMessage(null), 3500);
        return;
      }
      await updateFcmToken(pid, token);
      setPushNotifications(true);
      updatePlayer(pid, { push_notifications: true }).catch(() => {});
      setToastMessage('Push notifications enabled');
      setTimeout(() => setToastMessage(null), 2500);
    } else {
      setPushNotifications(false);
      updatePlayer(pid, { push_notifications: false }).catch(() => {});
      await updateFcmToken(pid, null);
    }
  }, []);

  const handleChangeAvatar = useCallback(async (file: File) => {
    setAvatarUploading(true);
    try {
      const url = await uploadPlayerAvatar(file);
      setPlayerAvatarUrl(url);
      setToastMessage(t('player.avatar_upload_success'));
      setTimeout(() => setToastMessage(null), 2500);
    } catch (err) {
      console.warn('[avatar] upload failed:', err);
      setToastMessage(t('player.avatar_upload_failed'));
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setAvatarUploading(false);
    }
  }, [t]);

  const handleRemoveAvatar = useCallback(async () => {
    setAvatarUploading(true);
    try {
      await removePlayerAvatar();
      setPlayerAvatarUrl(null);
      setToastMessage(t('player.avatar_remove_success'));
      setTimeout(() => setToastMessage(null), 2500);
    } catch (err) {
      console.warn('[avatar] remove failed:', err);
      setToastMessage(t('player.avatar_upload_failed'));
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setAvatarUploading(false);
    }
  }, [t]);

  /** Sync full game state to server (fire-and-forget). */
  syncGameStateRef.current = () => {
    const pid = playerId.current;
    if (!pid) return;
    if (isFirebaseConfigured && !serverHydratedRef.current) return;
    const snapshot = buildGameStateSnapshot();
    gameStateRef.current = snapshot as unknown as Record<string, unknown>;
    updatePlayer(pid, { game_state: snapshot as unknown as Record<string, unknown> }).catch(() => {});
  };

  // Debounced sync on critical state changes
  useEffect(() => {
    // Skip initial mount — only sync on actual changes
    const pid = playerId.current;
    if (!pid) return;
    if (isFirebaseConfigured && !serverHydrated) return;
    scheduleSyncToServer();
  }, [serverHydrated, playerXP, playerLevel, researchState, isExodusPhase, colonyResources, colonyResourcesByPlanet, playerStats, arenaStats, researchData, techTreeState, logEntries, favoritePlanets, tutorialStep, state.scene, gameStartedAt, timeMultiplier, accelAt, gameTimeAtAccel, forcedEvacuation, terraformStates, fleet, shipFleet, planetRevealLevels, planetMissions, planetReports, explorationPayloads, explorationProductionQueue, observatoryState, astraQuizAnswers, planetOverrides, planetResourceStocks]);

  // Sync on page hide / beforeunload (best-effort) + re-sync from server on foreground
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Cancel pending debounce and sync immediately
        if (syncTimeoutRef.current) { clearTimeout(syncTimeoutRef.current); syncTimeoutRef.current = null; }
        syncGameStateRef.current();
      } else if (document.visibilityState === 'visible') {
        // Re-sync from server when app comes back to foreground (cross-device sync)
        const pid = playerId.current;
        if (!pid) return;
        const restore = stateRef.current;
        getPlayer(pid).then((player) => {
          if (!player) return;
          hydrateGameStateFromServer(player);

          // Foreground sync updates data, but the player should return to the
          // exact screen they backgrounded. Otherwise React controls can show
          // galaxy/home state while Pixi still displays the old system scene.
          const allSystems = engineRef.current?.getAllSystems() ?? [];
          if (restore.scene === 'system' && restore.selectedSystem) {
            const system = allSystems.find((entry) => entry.id === restore.selectedSystem?.id) ?? restore.selectedSystem;
            engineRef.current?.showSystemScene(system);
            setState((prev) => ({ ...prev, scene: 'system', selectedSystem: system, selectedPlanet: null }));
          } else if (restore.scene === 'planet-view' && restore.selectedSystem && restore.selectedPlanet) {
            const system = allSystems.find((entry) => entry.id === restore.selectedSystem?.id) ?? restore.selectedSystem;
            const planet = system.planets.find((entry) => entry.id === restore.selectedPlanet?.id) ?? restore.selectedPlanet;
            engineRef.current?.showPlanetViewScene(system, planet, true);
            setState((prev) => ({ ...prev, scene: 'planet-view', selectedSystem: system, selectedPlanet: planet }));
          }
        }).catch(() => {});
      }
    };
    const handleBeforeUnload = () => {
      if (syncTimeoutRef.current) { clearTimeout(syncTimeoutRef.current); syncTimeoutRef.current = null; }
      syncGameStateRef.current();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hydrateGameStateFromServer]);

  // ── Pause/resume renderers on visibility change (save battery in background) ──
  useEffect(() => {
    const handleEngineVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // Pause PixiJS ticker
        engineRef.current?.pause();
        // Pause Three.js animation loop
        universeEngineRef.current?.setVisible(false);
      } else if (document.visibilityState === 'visible') {
        // Resume PixiJS ticker (only if universe is not active — universe pauses pixi)
        if (!universeEngineRef.current || !universeVisible) {
          engineRef.current?.resume();
        }
        // Resume Three.js animation loop (only if universe view is active)
        if (universeVisible) {
          universeEngineRef.current?.setVisible(true);
        }
      }
    };
    document.addEventListener('visibilitychange', handleEngineVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleEngineVisibility);
    };
  }, [universeVisible]);

  // Keep the display awake while the game is foregrounded. This prevents the
  // OS/browser idle dim from interrupting long reading, research, or tutorial
  // moments. Unsupported browsers simply ignore the request.
  useEffect(() => {
    type WakeLockSentinel = {
      release: () => Promise<void>;
      addEventListener: (type: 'release', listener: () => void) => void;
    };
    type WakeLockNavigator = Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> };
    };

    let wakeLock: WakeLockSentinel | null = null;
    let cancelled = false;

    const requestWakeLock = async () => {
      if (document.visibilityState !== 'visible') return;
      const api = (navigator as WakeLockNavigator).wakeLock;
      if (!api || wakeLock) return;
      try {
        wakeLock = await api.request('screen');
        wakeLock.addEventListener('release', () => {
          wakeLock = null;
        });
        if (cancelled) {
          void wakeLock.release().catch(() => {});
          wakeLock = null;
        }
      } catch {
        // Wake Lock is permission/browser dependent; gameplay must continue.
      }
    };

    const releaseWakeLock = () => {
      if (!wakeLock) return;
      void wakeLock.release().catch(() => {});
      wakeLock = null;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void requestWakeLock();
      } else {
        releaseWakeLock();
      }
    };

    void requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, []);

  // ── AdMob session start (SDK init is lazy — happens on first ad request) ─
  useEffect(() => {
    interstitialManager.sessionStartTime = Date.now();
  }, []);

  // ── Capacitor App lifecycle — flush sync IMMEDIATELY when app pauses ──
  // On Android Capacitor, beforeunload doesn't fire when user swipes the app
  // away or the OS kills the process. CapApp.appStateChange (active=false)
  // fires reliably right BEFORE the system pauses the WebView, giving us a
  // window to push pending research/quark progress to the server.
  // Critical for preventing "last 3 systems unsaved on uninstall" data loss.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handle = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        // App went to background — flush any pending debounced sync immediately
        syncNowToServer();
        ambientRef.current?.pauseForBackground();
        // Also pause every running ambient loop. Android WebView keeps
        // HTMLAudioElement loops playing through the speaker even after the
        // screen is locked unless we pause them ourselves. SfxPlayer's
        // visibilitychange listener handles the web flow, but the native
        // appStateChange callback is the only one that fires reliably when
        // the user locks the device.
        void import('./audio/SfxPlayer.js').then(({ pauseAllLoopsForBackground }) => {
          pauseAllLoopsForBackground?.();
        }).catch(() => { /* ignore */ });
      } else {
        ambientRef.current?.resumeAfterBackground();
        void import('./audio/SfxPlayer.js').then(({ resumeAllLoopsAfterBackground }) => {
          resumeAllLoopsAfterBackground?.();
        }).catch(() => { /* ignore */ });
      }
    });
    return () => { handle.then(h => h.remove()).catch(() => {}); };
  }, [syncNowToServer]);

  // ── Android hardware back button ────────────────────────────────────────
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handler = CapApp.addListener('backButton', () => {
      // 1. If surface view is open — close it
      if (surfaceTarget) {
        setSurfaceTarget(null);
        return;
      }

      // 2. Navigate back through scene hierarchy
      switch (state.scene) {
        case 'planet-view':
          if (state.selectedSystem) {
            engineRef.current?.showSystemScene(state.selectedSystem);
            setState(prev => ({
              ...prev,
              scene: 'system' as const,
              selectedPlanet: null,
              showPlanetMenu: false,
              showPlanetInfo: false,
            }));
          } else {
            engineRef.current?.showGalaxyScene();
            setState(prev => ({ ...prev, scene: 'galaxy', selectedSystem: null, selectedPlanet: null }));
          }
          break;
        case 'system':
          engineRef.current?.showGalaxyScene();
          setState(prev => ({ ...prev, scene: 'galaxy', selectedSystem: null, selectedPlanet: null }));
          break;
        case 'galaxy':
          engineRef.current?.showHomePlanetScene(true);
          setState(prev => ({ ...prev, scene: 'home-intro', selectedSystem: null, selectedPlanet: null }));
          break;
        case 'home-intro':
          // At root — show confirmation dialog before minimizing
          setShowExitConfirm(true);
          break;
      }
    });

    return () => { handler.then(h => h.remove()); };
  }, [state.scene, surfaceTarget, state.selectedSystem]);

  // ── Surface view handlers ─────────────────────────────────────────────
  const handleOpenSurface = useCallback(() => {
    if (!state.selectedPlanet || !state.selectedSystem) return;
    const check = canLandOnPlanet(state.selectedPlanet);
    if (!check.allowed) {
      if (check.chaos) {
        if (enqueueIfArena(() => setShowChaosModal(true))) return;
        setShowChaosModal(true);
      }
      return;
    }
    setShowCosmicArchive(false);
    playSfx('go-to-exosphera', 0.5);
    setSurfaceTarget({
      planet: state.selectedPlanet,
      star: state.selectedSystem.star,
    });
  }, [state.selectedPlanet, state.selectedSystem, canLandOnPlanet, enqueueIfArena]);

  const handleCloseSurface = useCallback(() => {
    setSurfaceTarget(null);
    // Zoom exosphere out to maximum distance after surface unmounts
    setTimeout(() => {
      for (let i = 0; i < 30; i++) globeRef.current?.zoomOut();
    }, 100);
  }, []);

  // ── Home planet navigation handlers ─────────────────────────────────
  const handleGoToExosphere = useCallback(() => {
    if (!homeInfo) return;
    setShowCosmicArchive(false);
    setState(prev => ({
      ...prev,
      selectedSystem: homeInfo.system,
      selectedPlanet: homeInfo.planet,
      scene: 'planet-view' as const,
      showPlanetMenu: false,
      showPlanetInfo: false,
    }));
    engineRef.current?.showPlanetViewScene(homeInfo.system, homeInfo.planet, true);
  }, [homeInfo]);

  const handleGoToHomeSurface = useCallback(() => {
    // Try homeInfo first, fallback to finding home system from engine
    let info = homeInfo;
    if (!info) {
      const allSys = engineRef.current?.getAllSystems() ?? [];
      const homeSys = allSys.find(s => s.ownerPlayerId !== null)
        ?? allSys.find(s => s.planets.some(p => p.isHomePlanet));
      if (homeSys) {
        const homePlanet = homeSys.planets.find(p => p.isHomePlanet) ?? homeSys.planets[0];
        if (homePlanet) {
          info = { system: homeSys, planet: homePlanet };
          setHomeInfo(info);
        }
      }
    }
    if (!info) return;
    setShowCosmicArchive(false);
    setState(prev => ({
      ...prev,
      selectedSystem: info!.system,
      selectedPlanet: info!.planet,
    }));
    playSfx('go-to-exosphera', 0.5);
    setSurfaceTarget({
      planet: info.planet,
      star: info.system.star,
    });
  }, [homeInfo]);

  // ── Globe double-click → spin + zoom → surface ────────────────────────
  const handleGlobeDoubleClick = useCallback(() => {
    const planet = state.scene === 'home-intro' ? homeInfo?.planet : state.selectedPlanet;
    if (!planet) return;
    const check = canLandOnPlanet(planet);
    if (!check.allowed) return;
    globeRef.current?.spinAndZoom(() => {
      if (state.scene === 'home-intro') {
        handleGoToHomeSurface();
      } else {
        handleOpenSurface();
      }
    });
  }, [state.scene, state.selectedPlanet, homeInfo, canLandOnPlanet, handleGoToHomeSurface, handleOpenSurface]);

  // ── Planet detail window handler ────────────────────────────────────────
  const handleViewPlanetDetail = useCallback((system: StarSystem, planetIndex: number, displayName?: string) => {
    setPlanetDetailTarget({ system, planetIndex, displayName });
  }, []);

  // ── Breadcrumb navigation handler ──────────────────────────────────────
  const handleBreadcrumbNavigate = useCallback((targetScene: string) => {
    // Close surface if open
    if (surfaceTarget) {
      setSurfaceTarget(null);
    }

    switch (targetScene) {
      case 'home-intro':
        if (universeVisible) {
          // From universe → warp back to home
          warpTargetRef.current = 'home-intro';
          setWarpActive(true);
        } else {
          handleGoToHomePlanet();
        }
        break;
      case 'universe':
        // Navigate to universe galaxy view
        if (universeVisible) {
          universeEngineRef.current?.collapseToGalaxy();
          setState(prev => ({ ...prev, scene: 'universe' }));
        } else {
          switchToUniverse();
        }
        break;
      case 'cluster':
        // Navigate to cluster view (fly to player's cluster)
        if (universeVisible) {
          universeEngineRef.current?.flyToMyCluster();
        } else {
          switchToUniverse();
          // After warp midpoint, fly to cluster
        }
        break;
      case 'galaxy':
        if (universeVisible) {
          // From universe → warp to PixiJS galaxy
          warpTargetRef.current = 'galaxy';
          setWarpActive(true);
        } else {
          handleBackToGalaxy();
        }
        break;
      case 'system':
        if (state.selectedSystem) {
          engineRef.current?.showSystemScene(state.selectedSystem);
          setState((prev) => ({
            ...prev,
            scene: 'system' as const,
            selectedPlanet: null,
            showPlanetMenu: false,
            showPlanetInfo: false,
          }));
        }
        break;
      case 'planet-view':
        if (state.scene !== 'planet-view') {
          // If navigating back to home planet, go to home-intro (shows 3D model)
          if (state.selectedPlanet?.isHomePlanet) {
            handleGoToHomePlanet();
          } else {
            handleViewPlanet();
          }
        }
        break;
      // 'surface' — already on surface, no action
    }
  }, [surfaceTarget, state.selectedSystem, state.scene, handleViewPlanet, universeVisible, switchToUniverse]);

  // Hide PixiJS procedural planet on home-intro / planet-view (PlanetGlobeView renders instead)
  useEffect(() => {
    const hidePixi = state.scene === 'home-intro' || state.scene === 'planet-view';
    engineRef.current?.setPlanetVisible(!hidePixi);
  }, [state.scene]);

  // Determine which panel to show for the selected system
  // (panels open via context menu actions, not directly from click)
  const selectedSystem = state.selectedSystem;
  // ResearchPanel no longer auto-opens on star click — research triggered directly via radial menu
  const showResearchPanel = false;

  const showSystemInfoPanel = selectedSystem
    && state.scene === 'galaxy'
    && !showSystemMenu
    && !radialSystem
    && (forceShowSystemInfo || selectedSystem.ownerPlayerId !== null || isSystemFullyResearched(researchState, selectedSystem.id));

  // Timer text for the selected system's active slot
  const activeSlotTimer = selectedSystem
    ? (() => {
        const slot = researchState.slots.find((s) => s.systemId === selectedSystem.id);
        return slot ? slotTimers[slot.slotIndex] ?? null : null;
      })()
    : null;

  // ── System nav header (prev/next navigable systems) ──────────────────
  // All systems navigable — unresearched ones shown blurred via overlay.
  // Wrapped in useMemo so we don't rebuild the (500–1500-element) array
  // on every unrelated App re-render. `state.scene` is stable across most
  // ticks; when scene changes the engine is already in a new state.
  const navigableSystems: StarSystem[] = useMemo(
    () =>
      state.scene === 'system' && engineRef.current
        ? engineRef.current.getAllSystems()
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- engineRef.current
    //   is a ref; we intentionally take it at render time. Scene transitions
    //   force this to recompute because state.scene is in the dep list.
    [state.scene],
  );

  const currentNavIndex = state.selectedSystem
    ? navigableSystems.findIndex((s) => s.id === state.selectedSystem!.id)
    : -1;

  // Circular navigation: wrap around at ends
  const prevNavSystem = navigableSystems.length > 1 && currentNavIndex >= 0
    ? navigableSystems[(currentNavIndex - 1 + navigableSystems.length) % navigableSystems.length]
    : null;
  const nextNavSystem = navigableSystems.length > 1 && currentNavIndex >= 0
    ? navigableSystems[(currentNavIndex + 1) % navigableSystems.length]
    : null;

  // Research progress for current system (home is always 100%)
  const currentSystemProgress = state.scene === 'system' && state.selectedSystem
    ? (state.selectedSystem.ownerPlayerId !== null
        ? 100
        : getResearchProgress(researchState, state.selectedSystem.id))
    : 100;
  const isCurrentSystemFullyAccessible = currentSystemProgress >= 100;

  // ── Planet nav header (prev/next planets within system) ────────────
  const sortedPlanets = useMemo(() => {
    if (state.scene !== 'planet-view' || !state.selectedSystem) return [];
    return [...state.selectedSystem.planets].sort(
      (a, b) => a.orbit.semiMajorAxisAU - b.orbit.semiMajorAxisAU,
    );
  }, [state.scene, state.selectedSystem]);

  const currentPlanetIndex = state.selectedPlanet
    ? sortedPlanets.findIndex((p) => p.id === state.selectedPlanet!.id)
    : -1;

  const prevNavPlanet = sortedPlanets.length > 1 && currentPlanetIndex >= 0
    ? sortedPlanets[(currentPlanetIndex - 1 + sortedPlanets.length) % sortedPlanets.length]
    : null;
  const nextNavPlanet = sortedPlanets.length > 1 && currentPlanetIndex >= 0
    ? sortedPlanets[(currentPlanetIndex + 1) % sortedPlanets.length]
    : null;

  const handleNavigatePlanet = useCallback((planet: Planet) => {
    if (!state.selectedSystem) return;
    engineRef.current?.showPlanetViewScene(state.selectedSystem, planet, true);
    setState((prev) => ({
      ...prev,
      selectedPlanet: planet,
      showPlanetMenu: false,
      showPlanetInfo: false,
    }));
  }, [state.selectedSystem]);

  // Memoized reason why research is blocked for the currently-open radial
  // menu system. Previously this was an inline IIFE in JSX that re-ran on
  // every App render (including every 500ms research tick) and called
  // engine.getAllSystems() + isRingFullyResearched over all 500+ systems.
  const radialResearchBlockReason = useMemo<string | null>(() => {
    if (!radialSystem) return null;
    if (researchState.slots.length === 0) return t('errors.noObservatories');
    if (findFreeSlot(researchState) < 0) return t('errors.allSlotsOccupied');
    if (radialSystem.ringIndex > 1 && radialSystem.ringIndex <= 3) {
      const allSys = engineRef.current?.getAllSystems() ?? [];
      if (!isRingFullyResearched(researchState, allSys, radialSystem.ringIndex - 1)) {
        return t('research.panel_ring_locked').replace('{ring}', String(radialSystem.ringIndex - 1));
      }
    }
    return null;
  }, [radialSystem, researchState, t]);

  // ── System nav in exosphere (only fully researched systems) ──────────
  const fullyResearchedSystems = useMemo(() => {
    if (state.scene !== 'planet-view' || !engineRef.current) return [];
    const all = engineRef.current.getAllSystems();
    return all.filter(s =>
      s.ownerPlayerId !== null || isSystemFullyResearched(researchState, s.id),
    );
  }, [state.scene, researchState]);

  const currentExoSystemIndex = state.selectedSystem
    ? fullyResearchedSystems.findIndex(s => s.id === state.selectedSystem!.id)
    : -1;

  const prevExoSystem = fullyResearchedSystems.length > 1 && currentExoSystemIndex >= 0
    ? fullyResearchedSystems[(currentExoSystemIndex - 1 + fullyResearchedSystems.length) % fullyResearchedSystems.length]
    : null;
  const nextExoSystem = fullyResearchedSystems.length > 1 && currentExoSystemIndex >= 0
    ? fullyResearchedSystems[(currentExoSystemIndex + 1) % fullyResearchedSystems.length]
    : null;

  const handleNavigateToSystemFromExo = useCallback((system: StarSystem) => {
    const firstPlanet = [...system.planets].sort(
      (a, b) => a.orbit.semiMajorAxisAU - b.orbit.semiMajorAxisAU,
    )[0];
    if (!firstPlanet) return;
    engineRef.current?.showPlanetViewScene(system, firstPlanet, true);
    setState((prev) => ({
      ...prev,
      selectedSystem: system,
      selectedPlanet: firstPlanet,
      showPlanetMenu: false,
      showPlanetInfo: false,
    }));
  }, []);

  const handlePlanetInfoFromButton = useCallback(() => {
    if (!state.selectedPlanet || !state.selectedSystem) return;
    const idx = sortedPlanets.findIndex((p) => p.id === state.selectedPlanet!.id);
    setPlanetDetailTarget({
      system: state.selectedSystem,
      planetIndex: idx >= 0 ? idx : 0,
    });
  }, [state.selectedPlanet, state.selectedSystem, sortedPlanets]);

  // ── CommandBar data ──────────────────────────────────────────────────
  const effectiveScene: ExtendedScene =
    surfaceTarget && (state.scene === 'planet-view' || state.scene === 'home-intro')
      ? 'surface'
      : state.scene;

  // SVG navigation icons
  const homeIcon = <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M3 8.5V14h4v-4h2v4h4V8.5" /><path d="M1 9l7-7 7 7" /></svg>;
  const galaxyIcon = <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="8" cy="8" r="2" /><ellipse cx="8" cy="8" rx="7" ry="3" /><ellipse cx="8" cy="8" rx="3" ry="7" /></svg>;
  const universeIcon = <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M8 1C5 1 2.5 4 2.5 8s2.5 7 5.5 7 5.5-3 5.5-7S11 1 8 1z" /><path d="M3.5 5.5C5 4 6.5 3.5 8 4s3 2 4.5 3.5" /><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" /></svg>;
  const clusterIcon = <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" /><circle cx="4" cy="5" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" /><circle cx="5" cy="11" r="1" fill="currentColor" stroke="none" /><circle cx="11" cy="11" r="1" fill="currentColor" stroke="none" /></svg>;
  const starIcon = <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="8" cy="8" r="3" /><line x1="8" y1="1" x2="8" y2="4" /><line x1="8" y1="12" x2="8" y2="15" /><line x1="1" y1="8" x2="4" y2="8" /><line x1="12" y1="8" x2="15" y2="8" /></svg>;
  const planetIcon = <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="8" cy="8" r="5" /><ellipse cx="8" cy="8" rx="7" ry="2" transform="rotate(-20 8 8)" /></svg>;
  const surfaceIcon = <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M1 12l3-4 3 2 4-5 4 4" /><line x1="1" y1="14" x2="15" y2="14" /></svg>;

  // Build unified navigation menu items
  const navigationItems: NavigationMenuItem[] = [
    {
      id: 'universe', label: t('nav.universe'), scene: 'universe',
      icon: universeIcon,
      active: effectiveScene === 'universe',
      disabled: false,
    },
    {
      id: 'cluster', label: t('nav.cluster'), scene: 'cluster',
      icon: clusterIcon,
      active: effectiveScene === 'cluster',
      disabled: false,
    },
    {
      id: 'galaxy', label: t('nav.galaxy'), scene: 'galaxy',
      icon: galaxyIcon,
      active: effectiveScene === 'galaxy',
      disabled: false,
      separator: true,
    },
    {
      id: 'system',
      label: state.selectedSystem
        ? (aliases[state.selectedSystem.id] || state.selectedSystem.star.name)
        : t('nav.system'),
      scene: 'system',
      icon: starIcon,
      active: effectiveScene === 'system',
      disabled: !state.selectedSystem,
    },
    {
      id: 'planet-view',
      label: state.selectedPlanet?.name ?? t('nav.exosphere'),
      scene: 'planet-view',
      icon: planetIcon,
      active: effectiveScene === 'planet-view' || effectiveScene === 'surface',
      disabled: !state.selectedPlanet,
    },
  ];

  // Build tool groups based on current scene
  // Hide left SceneControlsPanel when any overlay/modal blocks the view.
  // Also hide during cinematic intro / onboarding — otherwise the old
  // player's zoom/nav controls leak through the intro overlay (reported
  // as "UI залишилось після sign-out").
  //
  // Also hide while evacuation cutscenes / ship flights are in progress —
  // the back-button + zoom panel reads as a "blue square with a ship icon"
  // floating in the corner during the planet-approach phase, breaking the
  // cinematic. Stage 1 (system flight) intentionally hides it too so both
  // ship-flight stages have the same chrome-free background.
  const hideLeftPanel = !!(showArena || showRaid || showHangar || cinematicActive || needsOnboarding || evacuationPhase !== 'idle');

  const toolGroups: ToolGroup[] = [];

  switch (effectiveScene) {
    case 'universe':
    case 'cluster':
      // Buttons moved to SceneControlsPanel (left side)
      break;
    case 'home-intro': {
      // Zoom moved to SceneControlsPanel
      break;
    }

    case 'galaxy': {
      // Zoom moved to SceneControlsPanel (left side); research toggle also there
      break;
    }

    case 'system': {
      // Planet actions available via PlanetContextMenu popup.
      // Planet status icons toggle lives in the left SceneControlsPanel.
      break;
    }

    case 'planet-view': {
      // Surface button moved to SceneControlsPanel (left side)
      break;
    }

    case 'surface': {
      // Zoom moved to D-pad overlay
      break;
    }
  }

  // Surface button — opens the SURFACE of the home planet directly (preferred)
  // with fallback to planet-view (exosphere) if surface isn't landable yet.
  // Uses the shared bottom-bar tech-tile icon style.
  //
  // Hidden during exodus phase — the home planet is about to be destroyed
  // and has no colony on it, so linking to "surface of home" produced a
  // broken trip (tester: "ще до евакуації чомусь доступна поверхня на
  // рівні зоряної групи"). Re-appears once colonization completes.
  if (!isExodusPhase
      && state.scene !== 'home-intro'
      && !(state.scene === 'planet-view' && state.selectedPlanet?.isHomePlanet)
      && !(surfaceTarget && surfaceTarget.planet.isHomePlanet)) {
    toolGroups.push({
      type: 'buttons',
      items: [{
        id: 'go-home',
        label: t('cmd.surface_title'),
        variant: 'terminal' as const,
        icon: <CommandModeIcon kind="surface" />,
        tooltip: t('cmd.home_tooltip'),
        onClick: handleGoToHomeSurface,
      }],
    });
  }

  // Global: Terminal button on all scenes. Uses the same compact tech-tile
  // visual language as Surface and Arena.
  toolGroups.push({
    type: 'buttons',
    items: [{
      id: 'command-center',
      label: t('cmd.terminal'),
      variant: 'terminal' as const,
      tooltip: t('cmd.control_center'),
      tutorialId: 'terminal-btn',
      icon: <CommandModeIcon kind="terminal" active={terminalConverging} />,
      onClick: () => {
        if (terminalConverging) return;
        setTerminalConverging(true);
        window.setTimeout(() => {
          setShowCosmicArchive(true);
          setTerminalConverging(false);
        }, 350);
      },
    }],
  });

  // Cosmic Encyclopedia — wiki-style space-knowledge library, the long-awaited
  // Academy module. Sits to the right of Terminal in the bottom dock.
  toolGroups.push({
    type: 'buttons',
    items: [{
      id: 'academy',
      label: t('cmd.academy'),
      variant: 'terminal' as const,
      tooltip: t('cmd.academy_tooltip'),
      onClick: () => {
        playSfx('ui-click', 0.08);
        setShowEncyclopedia(true);
      },
      icon: <CommandModeIcon kind="academy" />,
    }],
  });

  // Arena button. Kept open during beta testing, but release gate starts at L10.
  const ARENA_MIN_LEVEL = 10;
  const arenaUnlocked = playerLevel >= ARENA_MIN_LEVEL;
  toolGroups.push({
    type: 'buttons',
    items: [{
      id: 'arena',
      label: t('cmd.arena'),
      variant: 'terminal' as const,
      tooltip: t('cmd.arena_tooltip'),
      onClick: () => {
        if (!arenaUnlocked) {
          const levelsLeft = ARENA_MIN_LEVEL - playerLevel;
          playSfx('ui-error', 0.25);
          setToastMessage(t('arena.locked').replace('{levels}', String(levelsLeft)));
          setTimeout(() => setToastMessage(null), 4000);
          return;
        }
        setShowHangar(true);
      },
      icon: <CommandModeIcon kind="arena" disabled={!arenaUnlocked} />,
    }],
  });

  // Surface already owns the "surface" state, so that button disappears there.
  // Keep the remaining trio composed around Terminal instead of leaving a
  // lopsided gap: Academy | Terminal | Arena.
  if (effectiveScene === 'surface') {
    const terminalIndex = toolGroups.findIndex(group => group.items[0]?.id === 'command-center');
    const academyIndex = toolGroups.findIndex(group => group.items[0]?.id === 'academy');
    if (terminalIndex >= 0 && academyIndex > terminalIndex) {
      const [academyGroup] = toolGroups.splice(academyIndex, 1);
      toolGroups.splice(terminalIndex, 0, academyGroup);
    }
  }



  if (state.error) {
    return (
      <div style={{ color: '#ff4444', padding: 20, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
        <h2>Error</h2>
        <p>{state.error}</p>
      </div>
    );
  }

  const surfaceStorageBlockedBuildingTypes = (() => {
    if (!surfaceTarget) return undefined;
    const buildings = colonyState?.planetId === surfaceTarget.planet.id ? colonyState.buildings : [];
    const capacity = computeResourceStorageCapacity(buildings);
    const resources = getResources(surfaceTarget.planet.id);
    const fullResources = new Set<ColonyResourceName>(
      (['minerals', 'volatiles', 'isotopes', 'water'] as const).filter((key) => resources[key] >= capacity),
    );
    if (fullResources.size === 0) return undefined;
    const blocked = new Set<string>();
    for (const building of buildings) {
      const def = BUILDING_DEFS[building.type];
      if (def?.production.some((prod) => (
        prod.resource === 'minerals' ||
        prod.resource === 'volatiles' ||
        prod.resource === 'isotopes' ||
        prod.resource === 'water'
      ) && fullResources.has(prod.resource))) {
        blocked.add(building.type);
      }
    }
    return blocked;
  })();

  const showBootLoader = authLoading || !bootLoaderDone;

  return (
    <>
      <style>{`@keyframes nebu-planet-spin { to { transform: rotate(360deg); } }`}</style>
      <div ref={universeCanvasRef} id="universe-canvas" style={{ position: 'fixed', inset: 0, zIndex: 1, display: universeVisible ? 'block' : 'none' }} />
      <div ref={canvasRef} id="game-canvas" style={{ display: universeVisible ? 'none' : undefined }} />

      {/* Resource HUD — top center (hidden in arena, hangar, and during intro) */}
      {!showArena && !showRaid && !showHangar && !cinematicActive && !needsOnboarding && (<ResourceDisplay
        researchData={Math.floor(researchData)}
        quarks={quarks}
        isExodusPhase={isExodusPhase}
        minerals={colonyResources.minerals}
        volatiles={colonyResources.volatiles}
        isotopes={colonyResources.isotopes}
        water={colonyResources.water}
        totalsResources={totalResources()}
        onClick={() => { if (isGuest) setShowLinkModal(true); else setShowTopUpModal(true); }}
        onObservatoriesClick={() => setShowResourceModal('observatories')}
        onResearchDataClick={() => setShowResourceModal('research_data')}
        onMineralsClick={() => setShowResourceModal('minerals')}
        onVolatilesClick={() => setShowResourceModal('volatiles')}
        onIsotopesClick={() => setShowResourceModal('isotopes')}
        onWaterClick={() => setShowResourceModal('water')}
        onQuarksClick={() => { if (isGuest) setShowLinkModal(true); else setShowTopUpModal(true); }}
        showCountdown={isExodusPhase && clockPhase === 'visible' && evacuationPhase === 'idle'}
        gameStartedAt={gameStartedAt}
        timeMultiplier={timeMultiplier}
        accelAt={accelAt}
        gameTimeAtAccel={gameTimeAtAccel}
        isCountdownPaused={() => surfaceTargetRef.current !== null}
        onTimerClick={evacuationTarget && evacuationPhase === 'idle' && evacuationPromptDismissed ? () => setEvacuationPromptDismissed(false) : undefined}
        observatoryUsed={researchState.slots.filter(s => s.systemId !== null).length}
        observatoryTotal={researchState.slots.length}
        highlightResearchData={showGetResearchData}
      />
      )}

      {/* Doomsday Clock — above command bar (Exodus phase only) */}
      {/* Phase 1: "СИНХРОНIЗАЦIЯ СИСТЕМ ЖИТТЄЗАБЕЗПЕЧЕННЯ..." — centered,
          two lines so the long label doesn't slide behind the chat button
          on narrow screens. maxWidth bounds the pill for wrapping. */}
      {isExodusPhase && clockPhase === 'syncing' && (
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9700,
            fontFamily: 'monospace',
            fontSize: 11,
            color: '#44ff88',
            letterSpacing: 1,
            padding: '6px 16px',
            background: 'rgba(5,10,20,0.85)',
            border: '1px solid rgba(68,255,136,0.3)',
            borderRadius: 4,
            animation: 'cmdbar-terminal-pulse 1s infinite',
            pointerEvents: 'none',
            whiteSpace: 'normal',
            textAlign: 'center',
            maxWidth: 'min(260px, 80vw)',
            lineHeight: 1.3,
          }}
        >
          {t('app.exodus.syncing')}
        </div>
      )}
      {/* Phase 2: Glitch effect */}
      {isExodusPhase && clockPhase === 'glitch' && (
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9700,
            fontFamily: 'monospace',
            fontSize: 18,
            fontWeight: 'bold',
            color: '#cc4444',
            letterSpacing: 3,
            padding: '4px 14px',
            background: 'rgba(5,10,20,0.85)',
            border: '1px solid rgba(204,68,68,0.5)',
            borderRadius: 4,
            pointerEvents: 'none',
            textShadow: '2px 0 #cc4444, -2px 0 #4488aa, 0 0 16px rgba(204,68,68,0.8)',
            filter: 'blur(0.5px)',
          }}
        >
          {'##:##:##'}
        </div>
      )}
      {/* Evacuation button — floating above timer when prompt is dismissed */}
      {isExodusPhase && clockPhase === 'visible' && evacuationTarget && evacuationPhase === 'idle' && evacuationPromptDismissed && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(90px + env(safe-area-inset-bottom, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9700,
          pointerEvents: 'auto',
        }}>
          <button
            onClick={() => setEvacuationPromptDismissed(false)}
            style={{
              padding: '5px 14px',
              background: 'rgba(68,255,136,0.1)',
              border: '1px solid rgba(68,255,136,0.5)',
              borderRadius: 3,
              color: '#44ff88',
              fontFamily: 'monospace',
              fontSize: 10,
              fontWeight: 'bold',
              letterSpacing: 1,
              cursor: 'pointer',
              transition: 'background 0.15s, border-color 0.15s',
              textTransform: 'uppercase',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(68,255,136,0.2)';
              e.currentTarget.style.borderColor = '#44ff88';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(68,255,136,0.1)';
              e.currentTarget.style.borderColor = 'rgba(68,255,136,0.5)';
            }}
          >
            {t('event.evacuation')}
          </button>
        </div>
      )}

      {/* Speed-up twist modal — "trajectory updated" */}
      {showSpeedUpTwist && !arenaPopupGate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9800,
            background: 'rgba(2,5,16,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'monospace',
          }}
          onClick={handleSpeedUpDismiss}
        >
          <div
            style={{
              maxWidth: 520,
              padding: '32px 40px',
              background: 'rgba(10,15,25,0.95)',
              border: '1px solid rgba(204,68,68,0.4)',
              borderRadius: 6,
              textAlign: 'center',
            }}
          >
            {/* Urgent-broadcast video placeholder removed per redesign —
                the message + CTA carry the urgency on their own. */}
            <div style={{ color: '#cc4444', fontSize: 13, fontWeight: 'bold', marginBottom: 12, letterSpacing: 1 }}>
              {t('event.trajectory_updated')}
            </div>
            <div style={{ color: '#aabbcc', fontSize: 12, lineHeight: 1.6, marginBottom: 24 }}>
              {t('event.trajectory_body')}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleSpeedUpDismiss(); }}
              style={{
                background: 'rgba(204,68,68,0.15)',
                border: '1px solid rgba(204,68,68,0.5)',
                borderRadius: 3,
                color: '#cc4444',
                fontFamily: 'monospace',
                fontSize: 12,
                padding: '8px 24px',
                cursor: 'pointer',
                letterSpacing: 1,
                fontWeight: 'bold',
              }}
            >
              {t('common.understood')}
            </button>
          </div>
        </div>
      )}

      {/* Warp transition overlay (Three.js ↔ PixiJS) */}
      <WarpTransition
        active={warpActive}
        onMidpoint={handleWarpMidpoint}
        onComplete={handleWarpComplete}
      />

      {/* CommandBar — visible at bottom (hidden during cinematic intro) */}
      {!cinematicActive && !showArena && !showRaid && !showHangar && (
        <CommandBar
          scene={effectiveScene}
          navigationItems={navigationItems}
          toolGroups={toolGroups}
          playerName={state.playerName}
          playerLevel={playerLevel}
          playerXP={playerXP}
          onNavigate={handleBreadcrumbNavigate}
          onOpenPlayerPage={() => setShowPlayerPage(true)}
          navigationDisabled={false}
        />
      )}

      {/* Level-up banner */}
      {!arenaPopupGate && (
        <LevelUpBanner
          level={levelUpNotification}
          onDone={() => setLevelUpNotification(null)}
        />
      )}

      {/* Left-side scene controls — home-intro */}
      {state.scene === 'home-intro' && !surfaceTarget && (
        <SceneControlsPanel
          onBack={handleStartExploration}
          onZoomIn={() => globeRef.current?.zoomIn()}
          onZoomOut={() => globeRef.current?.zoomOut()}
          backLabel={t('nav.galaxy')}
          showZoom
          hidden={hideLeftPanel}
          extraButtons={!isExodusPhase ? [
            {
              title: t('nav.surface'),
              icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M1 12 L4 8 L7 10 L11 5 L15 9 L15 14 L1 14Z" /><circle cx="12" cy="3" r="2" /></svg>,
              onClick: handleGoToHomeSurface,
              pulse: true,
            },
          ] : undefined}
        />
      )}

      {/* Left-side scene controls — galaxy. Hidden when surface is open
          (surface has its own left panel — two stacked panels would show
          otherwise, which user reported as "extra menu appeared"). */}
      {state.scene === 'galaxy' && !surfaceTarget && (
        <SceneControlsPanel
          onBack={handleGoToHomePlanet}
          onCenter={() => engineRef.current?.galaxyCenterOnOrigin()}
          onZoomIn={() => engineRef.current?.galaxyZoomIn()}
          onZoomOut={() => engineRef.current?.galaxyZoomOut()}
          backLabel={t('nav.home')}
          showCenter
          showZoom
          hidden={hideLeftPanel}
          researchPanel={{
            labelsEnabled: researchLabelsMode,
            onToggle: () => {
              const next = !researchLabelsMode;
              setResearchLabelsMode(next);
              engineRef.current?.setGalaxyResearchLabels(next);
            },
          }}
        />
      )}

      {/* Left-side scene controls — system (also hidden on surface) */}
      {state.scene === 'system' && !surfaceTarget && (
        <SceneControlsPanel
          onBack={handleBackToGalaxy}
          onCenter={() => engineRef.current?.systemCenterOnOrigin()}
          onZoomIn={() => engineRef.current?.systemZoomIn()}
          onZoomOut={() => engineRef.current?.systemZoomOut()}
          backLabel={t('nav.galaxy')}
          showCenter
          showZoom
          hidden={hideLeftPanel}
          extraButtons={[
            {
              title: systemPlanetLabelsMode ? t('cmd.planet_names_on') : t('cmd.planet_names_tooltip'),
              icon: (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 15,
                  height: 15,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  fontWeight: 700,
                  lineHeight: '15px',
                }}>
                  A
                </span>
              ),
              onClick: () => setSystemPlanetLabelsMode((prev) => !prev),
              active: systemPlanetLabelsMode,
            },
            {
              title: systemPlanetStatusIconsMode ? t('cmd.planet_statuses_on') : t('cmd.planet_statuses_tooltip'),
              icon: (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <circle cx="8" cy="8" r="4.2" />
                  <ellipse cx="8" cy="8" rx="7" ry="2.2" transform="rotate(-24 8 8)" />
                  <circle cx="4.2" cy="5.3" r="1" fill="currentColor" stroke="none" />
                  <circle cx="11.8" cy="10.7" r="1" fill="currentColor" stroke="none" />
                </svg>
              ),
              onClick: () => setSystemPlanetStatusIconsMode((prev) => !prev),
              active: systemPlanetStatusIconsMode,
            },
          ]}
        />
      )}

      {/* Left-side scene controls — planet-view */}
      {state.scene === 'planet-view' && !surfaceTarget && (
        <SceneControlsPanel
          onBack={handleBackToSystem}
          onCenter={() => {}}
          onZoomIn={() => globeRef.current?.zoomIn()}
          onZoomOut={() => globeRef.current?.zoomOut()}
          backLabel={t('nav.system')}
          showZoom
          hidden={hideLeftPanel}
          extraButtons={state.selectedPlanet && !isExodusPhase && (state.selectedPlanet.type === 'rocky' || state.selectedPlanet.type === 'terrestrial' || state.selectedPlanet.type === 'dwarf') ? (() => {
            const check = canLandOnPlanet(state.selectedPlanet!);
            if (check.hidden) return undefined;
            return [{
              title: check.allowed ? t('nav.surface_btn') : (check.reason || t('common.unavailable')),
              icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M1 12 L4 8 L7 10 L11 5 L15 9 L15 14 L1 14Z" /><circle cx="12" cy="3" r="2" /></svg>,
              onClick: handleOpenSurface,
              disabled: !check.allowed,
              pulse: check.allowed,
            }];
          })() : undefined}
        />
      )}

      {/* Left-side scene controls — surface */}
      {surfaceTarget && (
        <SceneControlsPanel
          onBack={handleCloseSurface}
          backLabel={t('common.back')}
          hidden={hideLeftPanel}
          extraButtons={[
            {
              title: t('nav.exosphere'),
              icon: (
                <svg
                  width="14" height="14" viewBox="0 0 16 16"
                  fill="none" stroke="currentColor" strokeWidth="1.2"
                  style={{ animation: 'nebu-planet-spin 5s linear infinite', transformOrigin: '50% 50%', display: 'block' }}
                >
                  <circle cx="8" cy="8" r="5.5" />
                  <ellipse cx="8" cy="8" rx="5.5" ry="2.2" />
                  <line x1="2.5" y1="8" x2="13.5" y2="8" strokeWidth="0.8" strokeOpacity="0.5" />
                </svg>
              ),
              onClick: handleCloseSurface,
            },
            {
              title: t('scene_controls.zoom_in'),
              icon: (
                <span style={{ fontSize: 18, lineHeight: 1, fontWeight: 600 }}>+</span>
              ),
              onClick: () => surfaceViewRef.current?.zoomIn(),
            },
            {
              title: t('scene_controls.zoom_out'),
              icon: (
                <span style={{ fontSize: 18, lineHeight: 1, fontWeight: 600 }}>{'\u2212'}</span>
              ),
              onClick: () => surfaceViewRef.current?.zoomOut(),
            },
          ]}
        />
      )}

      {/* Left-side scene controls — universe */}
      {state.scene === 'universe' && universeVisible && (
        <SceneControlsPanel
          onBack={handleGoToHomePlanet}
          onZoomIn={() => universeEngineRef.current?.zoomIn()}
          onZoomOut={() => universeEngineRef.current?.zoomOut()}
          backLabel={t('cmd.home_tooltip')}
          showZoom
          hidden={hideLeftPanel}
          extraButtons={[
            {
              title: t('cmd.fly_cluster'),
              icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="8" cy="8" r="3" /><path d="M8 1v3M8 12v3M1 8h3M12 8h3" /></svg>,
              onClick: () => universeEngineRef.current?.flyToMyCluster(),
            },
            {
              title: t('cmd.fly_center'),
              icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="8" cy="8" r="6" /><circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" /></svg>,
              onClick: () => universeEngineRef.current?.flyToCenter(),
            },
          ]}
        />
      )}

      {/* Left-side scene controls — cluster */}
      {state.scene === 'cluster' && universeVisible && (
        <SceneControlsPanel
          onBack={handleGoToHomePlanet}
          onZoomIn={() => universeEngineRef.current?.zoomIn()}
          onZoomOut={() => universeEngineRef.current?.zoomOut()}
          backLabel={t('cmd.home_tooltip')}
          showZoom
          hidden={hideLeftPanel}
          extraButtons={[
            {
              title: t('cmd.fly_star'),
              icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="8" cy="8" r="3" /><path d="M8 1v3M8 12v3M1 8h3M12 8h3" /></svg>,
              onClick: () => universeEngineRef.current?.flyToMyCluster(),
            },
          ]}
        />
      )}

      {/* Research blur overlay for unresearched systems */}
      {state.scene === 'system' && !isCurrentSystemFullyAccessible && state.selectedSystem && (
        <SystemResearchOverlay
          progress={currentSystemProgress}
          canResearch={Math.floor(researchData) >= getSystemResearchDataCost(state.selectedSystem) && findFreeSlot(researchState) >= 0}
          isResearching={researchState.slots.some((s) => s.systemId === state.selectedSystem!.id)}
          onStartResearch={() => handleStartResearch(state.selectedSystem!.id)}
          onDisabledClick={() => handleStartResearch(state.selectedSystem!.id)}
        />
      )}

      {/* System navigation header — fixed top-center, visible when inside a system */}
      {state.scene === 'system' && state.selectedSystem && (
        <SystemNavHeader
          currentSystem={state.selectedSystem}
          currentAlias={aliases[state.selectedSystem.id]}
          prevSystem={prevNavSystem}
          prevAlias={prevNavSystem ? aliases[prevNavSystem.id] : undefined}
          nextSystem={nextNavSystem}
          nextAlias={nextNavSystem ? aliases[nextNavSystem.id] : undefined}
          allSystems={navigableSystems}
          aliases={aliases}
          onPrev={() => prevNavSystem && handleNavToSystem(prevNavSystem)}
          onNext={() => nextNavSystem && handleNavToSystem(nextNavSystem)}
          onNavigate={handleNavToSystem}
          onTelescopePhoto={() => handleTelescopePhotoForSystem(state.selectedSystem!)}
          isPhotoGenerating={systemPhotos.get(state.selectedSystem!.id)?.status === 'generating'}
          getSystemProgress={(id) => {
            const sys = navigableSystems.find(s => s.id === id);
            if (sys?.ownerPlayerId) return 100;
            return getResearchProgress(researchState, id);
          }}
        />
      )}

      {/* Planet navigation header — fixed top-center, visible in planet-view */}
      {state.scene === 'planet-view' && state.selectedPlanet && (
        <PlanetNavHeader
          currentPlanet={state.selectedPlanet}
          prevPlanet={prevNavPlanet}
          nextPlanet={nextNavPlanet}
          onPrev={() => prevNavPlanet && handleNavigatePlanet(prevNavPlanet)}
          onNext={() => nextNavPlanet && handleNavigatePlanet(nextNavPlanet)}
          currentSystemName={state.selectedSystem ? (aliases[state.selectedSystem.id] || state.selectedSystem.star.name) : undefined}
          prevSystemName={prevExoSystem ? (aliases[prevExoSystem.id] || prevExoSystem.star.name) : null}
          nextSystemName={nextExoSystem ? (aliases[nextExoSystem.id] || nextExoSystem.star.name) : null}
          onPrevSystem={() => prevExoSystem && handleNavigateToSystemFromExo(prevExoSystem)}
          onNextSystem={() => nextExoSystem && handleNavigateToSystemFromExo(nextExoSystem)}
        />
      )}

      {/* Floating info button — right of planet in exosphere view */}
      {state.scene === 'planet-view' && state.selectedPlanet && !surfaceTarget && (
        <FloatingInfoButton onClick={handlePlanetInfoFromButton} />
      )}

      {/* ResearchPanel in galaxy view removed — research handled by radial menu */}
      {/* Research panel on system scene */}
      {showSystemResearch && state.scene === 'system' && state.selectedSystem && (
        <ResearchPanel
          system={state.selectedSystem}
          researchState={researchState}
          allSystems={engineRef.current?.getAllSystems() ?? []}
          activeSlotTimerText={activeSlotTimer}
          researchData={Math.floor(researchData)}
          researchDataCost={getSystemResearchDataCost(state.selectedSystem)}
          maxResearchRing={getEffectiveResearchMaxRing(engineRef.current?.getAllSystems() ?? [], state.selectedSystem.id)}
          onStartResearch={handleStartResearch}
          onClose={() => setShowSystemResearch(false)}
        />
      )}
      {charsSystem && (
        <ResearchCompleteModal
          system={charsSystem}
          skipSfx
          onViewSystem={() => setCharsSystem(null)}
          onClose={() => setCharsSystem(null)}
        />
      )}
      {/* Radial Menu (galaxy view — replaces old SystemContextMenu) */}
      {radialSystem && state.scene === 'galaxy' && radialGetScreenPos && (
        <RadialMenu
          system={radialSystem}
          getScreenPos={radialGetScreenPos}
          isHome={radialSystem.ownerPlayerId !== null}
          isResearched={isSystemFullyResearched(researchState, radialSystem.id)}
          systemPhoto={systemPhotos.get(radialSystem.id) ?? null}
          activeMission={systemMissions.get(radialSystem.id) ?? null}
          quarks={quarks}
          playerLevel={playerLevel}
          // Progress % is always shown above the star by GalaxyScene
          // (live-updated in the scene's update loop), so we intentionally
          // NEVER pass researchProgress to RadialMenu — the bottom gold chip
          // would only duplicate the same value.
          researchProgress={undefined}
          researchBlockReason={radialResearchBlockReason}
          onClose={handleCloseSystemMenu}
          onEnterSystem={handleSystemMenuEnter}
          onObjectsList={handleObjectsList}
          onRename={handleSystemMenuRename}
          onCharacteristics={handleSystemMenuCharacteristics}
          onResearch={handleSystemMenuResearch}
          onTelescopePhoto={handleTelescopePhoto}
          onViewPhoto={handleViewSystemPhoto}
          onSendMission={handleSendMission}
          onViewVideo={handleViewMissionVideo}
        />
      )}

      {/* Hover % label disabled — per-star research % is already shown
          as a small white/yellow dot above each star by the PixiJS scene
          (eye-toggle mode). A bright gold hover label was too loud. */}

      {/* Galaxy Warp Hyperspace Overlay */}
      {galaxyWarpPhase === 'hyperspace' && (
        <GalaxyWarpOverlay onComplete={() => setGalaxyWarpPhase('idle')} />
      )}

      {/* System Context Menu — kept as fallback (legacy, hidden when radial is active) */}
      {showSystemMenu && !radialSystem && state.selectedSystem && systemMenuPos && state.scene === 'galaxy' && (
        <SystemContextMenu
          system={state.selectedSystem}
          screenPosition={systemMenuPos}
          isHome={state.selectedSystem.ownerPlayerId !== null}
          isResearched={isSystemFullyResearched(researchState, state.selectedSystem.id)}
          systemPhoto={systemPhotos.get(state.selectedSystem.id) ?? null}
          activeMission={systemMissions.get(state.selectedSystem.id) ?? null}
          quarks={quarks}
          playerLevel={playerLevel}
          onClose={handleCloseSystemMenu}
          onEnterSystem={handleSystemMenuEnter}
          onObjectsList={handleObjectsList}
          onRename={handleSystemMenuRename}
          onCharacteristics={handleSystemMenuCharacteristics}
          onResearch={handleSystemMenuResearch}
          onTelescopePhoto={handleTelescopePhoto}
          onAdTelescopePhoto={(photoToken) => handleTelescopePhotoForSystem(state.selectedSystem!, photoToken)}
          onViewPhoto={handleViewSystemPhoto}
          onSendMission={handleSendMission}
          onViewVideo={handleViewMissionVideo}
          canShowAds={isNativePlatform() && canShowAd()}
        />
      )}
      {missionPhotoReveal && (
        <MissionPhotoReceiveOverlay
          imageDataUrl={missionPhotoReveal.imageDataUrl}
          planetName={missionPhotoReveal.planetName}
          startedAt={missionPhotoReveal.startedAt}
        />
      )}
      {missionPhotoViewer && (
        <TelescopeOverlay
          targetName={missionPhotoViewer.planetName}
          targetType="planet"
          phase="reveal"
          photoUrl={missionPhotoViewer.photoUrl}
          canDownload
          onSaveToCollection={() => {
            setToastMessage(t('app.toast.archived'));
            setTimeout(() => setToastMessage(null), 3000);
          }}
          onShare={async () => {
            const shareUrl = buildPhotoShareUrl(
              missionPhotoViewer.photoKey,
              missionPhotoViewer.photoUrl,
              missionPhotoViewer.planetName,
              'mission',
            );
            const text = i18n.language.startsWith('uk')
              ? `Отримано фото з місії на планету ${missionPhotoViewer.planetName}. Небулайф - твій власний космос\n${shareUrl}`
              : `Photo from mission to planet ${missionPhotoViewer.planetName}. Nebulife - your own cosmos\n${shareUrl}`;
            try {
              if (navigator.share) await navigator.share({ title: 'Nebulife', text, url: shareUrl });
              else await navigator.clipboard.writeText(text);
            } catch { /* ignore user cancel */ }
          }}
          onDownload={async () => {
            const filename = `nebulife-${missionPhotoViewer.photoKey.replace(/[^a-z0-9_-]+/gi, '-')}.jpg`;
            try {
              const response = await fetch(missionPhotoViewer.photoUrl);
              const blob = await response.blob();
              const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
              if (navigator.share && navigator.canShare?.({ files: [file] })) {
                await navigator.share({ title: filename, files: [file] });
              } else {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }
            } catch {
              window.open(missionPhotoViewer.photoUrl, '_blank');
            }
          }}
          onGoToExosphere={missionPhotoViewer.systemId && missionPhotoViewer.planetId
            ? () => {
                const system = engineRef.current?.getAllSystems().find((entry) => entry.id === missionPhotoViewer.systemId);
                if (system) handleViewPlanetExosphere(system, missionPhotoViewer.planetId!);
              }
            : undefined}
          onClose={() => setMissionPhotoViewer(null)}
        />
      )}
      {state.showPlanetMenu && state.selectedPlanet && state.planetClickPos && state.scene === 'system' && (
        <PlanetContextMenu
          planet={state.selectedPlanet}
          star={state.selectedSystem!.star}
          screenPosition={state.planetClickPos}
          quarks={quarks}
          playerLevel={playerLevel}
          onViewPlanet={handleViewPlanet}
          onClose={handleClosePlanetMenu}
          onSurface={isExodusPhase || canLandOnPlanet(state.selectedPlanet).hidden ? undefined : handleOpenSurface}
          isDestroyed={destroyedPlanetIdsSet.has(state.selectedPlanet.id)}
          surfaceDisabledReason={canLandOnPlanet(state.selectedPlanet).reason}
          onTelescopePhoto={(photoKind) => handlePlanetTelescopePhoto(photoKind)}
          onAdTelescopePhoto={(photoKind, photoToken) => handlePlanetTelescopePhoto(photoKind, photoToken)}
          onGeneratePlanetSkin={handleGeneratePlanetSkin}
          planetSkinStatus={{
            system: planetSkins.get(`system-${state.selectedPlanet.id}`)?.status as 'generating' | 'pending' | 'processing' | 'succeed' | 'failed' | undefined,
            exosphere: planetSkins.get(`exosphere-${state.selectedPlanet.id}`)?.status as 'generating' | 'pending' | 'processing' | 'succeed' | 'failed' | undefined,
          }}
          canGenerateSurfacePhotos={
            canLandOnPlanet(state.selectedPlanet).allowed && isSolidPlanetForLanding(state.selectedPlanet)
          }
          isPhotoGenerating={
            systemPhotos.get(`planet-exosphere-${state.selectedPlanet.id}`)?.status === 'generating'
              || systemPhotos.get(`planet-biosphere-${state.selectedPlanet.id}`)?.status === 'generating'
              || systemPhotos.get(`planet-aerial-${state.selectedPlanet.id}`)?.status === 'generating'
          }
          canShowAds={isNativePlatform() && canShowAd()}
          hasGenesisVault={colonyState?.buildings?.some((b) => b.type === 'genesis_vault') ?? false}
          onShowTerraform={onShowTerraform}
          revealLevel={getEffectivePlanetRevealLevel(state.selectedPlanet, state.selectedSystem)}
          activeMission={getActivePlanetMission(state.selectedPlanet.id)}
          planetMissionClock={planetMissionClock}
          missionResources={{ researchData: Math.floor(researchData), ...totalResources() }}
          missionResearchDataCost={state.selectedSystem ? getPlanetMissionResearchDataCost(state.selectedSystem) : 1}
          payloadInventory={explorationPayloads}
          carrierInventory={getAvailableMissionCarriers(surfaceTarget?.planet.id ?? homeInfo?.planet.id ?? colonyState?.planetId ?? '')}
          colonyBuildings={getExplorationBuildings()}
          onStartMission={handleStartPlanetMission}
          explorationMissionsDisabled={Boolean(
            state.selectedPlanet.isHomePlanet
              || state.selectedPlanet.id === homeInfo?.planet.id
              || state.selectedPlanet.id === colonyState?.planetId,
          )}
          reportSummary={planetReports[state.selectedPlanet.id]}
          missionPhotoSaved={(() => {
            const report = planetReports[state.selectedPlanet!.id];
            if (!report) return false;
            const key = getMissionPhotoKey(state.selectedPlanet!.id, report);
            const alphaKey = getMissionAlphaPhotoKey(state.selectedPlanet!.id, report);
            const photo = systemPhotos.get(key);
            const alphaPhoto = systemPhotos.get(alphaKey);
            return Boolean(
              savedMissionPhotoKeys[key]
                || (photo?.status === 'succeed' && photo.photoUrl)
                || (alphaPhoto?.status === 'succeed' && alphaPhoto.photoUrl),
            );
          })()}
          missionPhotoUrl={(() => {
            const report = planetReports[state.selectedPlanet!.id];
            if (!report) return null;
            const key = getMissionPhotoKey(state.selectedPlanet!.id, report);
            const alphaKey = getMissionAlphaPhotoKey(state.selectedPlanet!.id, report);
            const photo = systemPhotos.get(key);
            const alphaPhoto = systemPhotos.get(alphaKey);
            return alphaPhoto?.status === 'succeed' && alphaPhoto.photoUrl
              ? alphaPhoto.photoUrl
              : photo?.status === 'succeed'
                ? photo.photoUrl
                : null;
          })()}
          onViewReport={(planet, report) => {
            setPlanetReportTarget({ planet, report });
            setState((prev) => ({ ...prev, showPlanetMenu: false }));
          }}
          onViewMissionPhoto={(planet, _report, photoUrl) => {
            const proceduralKey = getMissionPhotoKey(planet.id, _report);
            const alphaKey = getMissionAlphaPhotoKey(planet.id, _report);
            const alphaPhoto = systemPhotos.get(alphaKey);
            const key = alphaPhoto?.status === 'succeed' && alphaPhoto.photoUrl ? alphaKey : proceduralKey;
            setMissionPhotoViewer({ planetName: planet.name, photoUrl, photoKey: key, systemId: _report.systemId, planetId: planet.id });
            setState((prev) => ({ ...prev, showPlanetMenu: false }));
          }}
          systemResearchProgress={currentSystemProgress}
          terraformState={terraformStates[state.selectedPlanet.id]}
          isColonized={Boolean(
            state.selectedPlanet.id === homeInfo?.planet.id
              || state.selectedPlanet.id === colonyState?.planetId
              || getColonyPlanets().some((planet) => planet.id === state.selectedPlanet!.id),
          )}
          cargoShips={shipFleet.ships.filter((ship) => {
            const def = PRODUCIBLE_DEFS[ship.type];
            return (ship.type === 'terraform_freighter' || def.requiresBuilding === 'spaceport') && def.cargoCapacity > 0;
          })}
          cargoShipments={shipFleet.cargoShipments ?? []}
          planetResourcesById={colonyResourcesByPlanet}
          onStartCargoShipment={handleStartCargoShipment}
        />
      )}
      {state.showPlanetInfo && state.selectedPlanet && state.scene === 'system' && isCurrentSystemFullyAccessible && (
        <PlanetInfoPanel
          planet={state.selectedPlanet}
          onClose={() => setState((prev) => ({ ...prev, showPlanetInfo: false, selectedPlanet: null }))}
          onSurface={isExodusPhase || canLandOnPlanet(state.selectedPlanet).hidden ? undefined : handleOpenSurface}
          surfaceDisabledReason={canLandOnPlanet(state.selectedPlanet).reason}
          terraformState={terraformStates[state.selectedPlanet.id]}
          revealLevel={getEffectivePlanetRevealLevel(state.selectedPlanet, state.selectedSystem)}
        />
      )}
      {planetReportTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            background: 'rgba(0,0,0,0.72)',
            fontFamily: 'monospace',
          }}
        >
          <MissionReportModal
            planet={planetReportTarget.planet}
            report={planetReportTarget.report}
            reportText={buildPlanetMissionReportText(planetReportTarget.planet, planetReportTarget.report)}
            alphaCost={GEMINI_PHOTO_COST}
            proceduralSaving={missionPhotoSaving}
            alphaGenerating={missionAlphaGenerating}
            alphaPhotoReady={(() => {
              const key = getMissionAlphaPhotoKey(planetReportTarget.planet.id, planetReportTarget.report);
              const photo = systemPhotos.get(key);
              return Boolean(photo?.status === 'succeed' && photo.photoUrl);
            })()}
            proceduralSaved={(() => {
              const key = getMissionPhotoKey(planetReportTarget.planet.id, planetReportTarget.report);
              const photo = systemPhotos.get(key);
              return Boolean(savedMissionPhotoKeys[key] || (photo?.status === 'succeed' && photo.photoUrl));
            })()}
            onProceduralPhoto={() => handleSaveMissionProbePhoto(planetReportTarget.planet, planetReportTarget.report)}
            onAlphaPhoto={() => handleMissionAlphaPhoto(planetReportTarget.planet, planetReportTarget.report)}
            onClose={() => {
              setPlanetMissions((prev) => ({
                ...prev,
                [planetReportTarget.report.missionId]: {
                  ...(prev[planetReportTarget.report.missionId] ?? {
                    id: planetReportTarget.report.missionId,
                    systemId: planetReportTarget.report.systemId,
                    planetId: planetReportTarget.report.planetId,
                    type: planetReportTarget.report.missionType,
                    targetRevealLevel: planetReportTarget.report.revealLevel,
                    startedAt: planetReportTarget.report.generatedAt,
                    durationMs: 0,
                    phaseDurations: { preparing: 0, outbound: 0, orbital_insertion: 0, scan_or_landing: 0, data_downlink: 0 },
                    costPaid: {},
                    status: 'completed' as const,
                  }),
                  status: 'completed' as const,
                },
              }));
              setPlanetReportTarget(null);
              scheduleSyncToServer();
            }}
          />
        </div>
      )}
      {/* ── TerraformPanel full-screen overlay ── */}
      {showTerraformPlanet && (() => {
        const tfPlanet = showTerraformPlanet;
        const tfState = terraformStates[tfPlanet.id] ?? getInitialTerraformState(tfPlanet);
        const hasGenVault = colonyState?.buildings?.some((b) => b.type === 'genesis_vault') ?? false;
        const donors = getColonyPlanets();
        // Compute donor distances: find the StarSystem for target and each donor,
        // then compute distance using systemDistanceLY.
        const allSystems = engineRef.current?.getAllSystems?.() ?? [];
        const targetSys = allSystems.find((s) => s.planets.some((p) => p.id === tfPlanet.id));
        const donorDistMap = new Map<string, number>();
        if (targetSys) {
          for (const donor of donors) {
            const donorSys = allSystems.find((s) => s.planets.some((p) => p.id === donor.id));
            if (donorSys) {
              donorDistMap.set(donor.id, systemDistanceLY(targetSys, donorSys));
            }
          }
        }
        const buildings = colonyState?.buildings ?? [];
        const tfTier = tierForBuildings(buildings, techTreeStateRef.current.researched);
        const activeMissionByParam: Partial<Record<TerraformParamId, Mission>> = {};
        for (const m of fleet) {
          if (m.targetPlanetId === tfPlanet.id && m.phase !== 'idle') {
            activeMissionByParam[m.paramId] = m;
          }
        }
        const availableTerraformShips = shipFleet.ships.filter((ship) => {
          const def = PRODUCIBLE_DEFS[ship.type];
          return (ship.type === 'terraform_freighter' || def.requiresBuilding === 'spaceport')
            && def.cargoCapacity > 0
            && ship.status === 'docked'
            && !ship.assignmentId;
        });
        return (
          <TerraformPanel
            planet={tfPlanet}
            terraformState={tfState}
            hasGenesisVault={hasGenVault}
            techState={techTreeStateRef.current}
            donorPlanets={donors}
            donorDistances={donorDistMap}
            getResources={getResources}
            shipTier={tfTier}
            availableShips={availableTerraformShips}
            activeMissionByParam={activeMissionByParam}
            onStartParam={(paramId, donorPlanetId, resource, amount, tier, flightHours, repairCostMinerals, shipId) => {
              onStartTerraformParam(tfPlanet.id, paramId, donorPlanetId, resource, amount, tier, flightHours, repairCostMinerals, shipId);
            }}
            onCancelMission={onCancelMission}
            onClose={() => setShowTerraformPlanet(null)}
          />
        );
      })()}
      {completedModal && (
        <ResearchCompleteModal
          system={completedModal.system}
          research={completedModal.research}
          onViewSystem={handleViewResearchedSystem}
          onClose={() => dismissCompletedModal(completedModal.system)}
        />
      )}
      {/* Research technology toast notifications (slide-in from right) */}
      <ResearchToast
        items={researchToasts}
        onDismiss={(id) => setResearchToasts((q) => q.filter((t) => t.id !== id))}
        onNavigate={() => { /* TODO: open research terminal */ }}
      />
      {/* Discovery choice panel (slide-in with 3 options) */}
      {pendingDiscovery && (
        <DiscoveryChoicePanel
          discovery={pendingDiscovery.discovery}
          system={pendingDiscovery.system}
          isFirstDiscovery={isFirstDiscovery}
          isLuckyFree={isLuckyFree}
          playerQuarks={quarks}
          canShowAds={isNativePlatform() && canShowAd()}
          onTelemetry={handleTelemetry}
          onQuantumFocus={handleQuantumFocus}
          onAdQuantumFocus={handleAdQuantumFocus}
          onSkip={handleSkipDiscovery}
        />
      )}
      {/* Telemetry view (free procedural scanner) */}
      {telemetryTarget && (
        <TelemetryView
          discovery={telemetryTarget.discovery}
          system={telemetryTarget.system}
          onClose={handleCloseTelemetry}
          onSaveToArchive={handleSaveToGallery}
        />
      )}
      {/* Observatory view — paid with quarks or ad token */}
      {observatoryTarget && (
        <ObservatoryView
          discovery={observatoryTarget.discovery}
          system={observatoryTarget.system}
          playerId={playerId.current}
          onClose={handleCloseObservatory}
          onSaveToGallery={handleSaveToGallery}
          cost={observatoryTarget.cost}
          adPhotoToken={observatoryTarget.adPhotoToken}
        />
      )}
      {/* Gallery compare modal (when cell is occupied) */}
      {galleryCompare && !arenaPopupGate && (
        <GalleryCompareModal
          newDiscovery={galleryCompare.newDiscovery}
          newImageUrl={galleryCompare.newImageUrl}
          existingImageUrl={galleryCompare.existingData.photo_url!}
          existingDate={galleryCompare.existingData.discovered_at}
          objectName={(() => { const e = getCatalogEntry(galleryCompare.newDiscovery.type) as CatalogEntry | undefined; return e ? getCatalogName(e, i18n.language) : galleryCompare.newDiscovery.type; })()}
          onReplace={handleGalleryReplace}
          onKeepOld={handleGalleryKeepOld}
        />
      )}
      {/* Evacuation Prompt — shown when habitable planet found (not forced) */}
      {evacuationTarget && evacuationPhase === 'idle' && !evacuationPromptDismissed && !forcedEvacuation && (
        <EvacuationPrompt
          system={evacuationTarget.system}
          planet={evacuationTarget.planet}
          onStartEvacuation={handleStartEvacuation}
          forced={forcedEvacuation}
          onDismiss={() => setEvacuationPromptDismissed(true)}
        />
      )}
      {/* Stage 0: Ship launch cutscene */}
      {evacuationPhase === 'stage0-launch' && (
        <CutsceneVideo
          src="/videos/evac-launch.mp4"
          onComplete={handleStage0Complete}
          onPlayingChange={setCinematicVideoPlaying}
        />
      )}
      {/* Stage 1: System flight — no overlay, ship flies in PixiJS scene */}
      {/* Stage 2: Planet explosion cutscene (6s) */}
      {evacuationPhase === 'stage2-explosion' && (
        <CutsceneVideo
          src="/videos/evac-explosion.mp4"
          onComplete={handleStage2Complete}
          onPlayingChange={setCinematicVideoPlaying}
        />
      )}
      {/* Stage 3: Planet approach — no overlay, ship flies in PlanetViewScene */}
      {/* Stage 4: Ship on orbit — colony founding prompt. The heavy exosphere
          PlanetGlobeView unmounts while this modal is up (see gate above);
          the modal carries its own lightweight SVG system-with-planets
          preview so the background stays visually meaningful without the
          GPU cost of the 3D scene. */}
      {evacuationPhase === 'stage4-orbit' && evacuationTarget && (
        <ColonyFoundingPrompt
          planet={evacuationTarget.planet}
          system={evacuationTarget.system}
          onFoundColony={handleFoundColony}
        />
      )}
      {/* Cutscene: Landing on new planet (5s) */}
      {evacuationPhase === 'cutscene-landing' && (
        <CutsceneVideo
          src="/videos/evac-landing.mp4"
          onComplete={handleCutsceneLandingComplete}
          onPlayingChange={setCinematicVideoPlaying}
        />
      )}
      {/* Fade-to-black overlay for stage1→stage2 transition */}
      {evacuationFadeBlack && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#020510',
            opacity: 1,
            transition: 'opacity 0.8s ease',
            pointerEvents: 'none',
          }}
        />
      )}
      {/* PlanetGlobeView — WebGL shader planet (home-intro & planet-view).
          Fully UNMOUNT whenever a full-screen overlay is on top — otherwise
          the Three.js scene + RAF loop + WebGL context keep burning GPU in
          the background, heating up mid/low-tier tablets and tanking perf
          of whatever view just opened on top. Reported by tester:
          "з екзосфери заходити в ангар, термінал чи в арену — нереально
          грати" + follow-up "щоб екзосфера зникала всюди окрім екзосфери".
          So: only render when NO full-screen overlay is active. */}
      {(state.scene === 'home-intro' || state.scene === 'planet-view') && homeInfo
        && !showArena && !showRaid && !showHangar && !surfaceTarget
        && !showPlayerPage && !showCosmicArchive && !showAcademy
        && !showChaosModal && !showTopUpModal
        && evacuationPhase !== 'stage4-orbit' && (
        <PlanetGlobeView
          key={(() => {
            const p = state.scene === 'planet-view' && state.selectedPlanet ? state.selectedPlanet : homeInfo.planet;
            return `${p.id}-${p.type}-${p.habitability.overall.toFixed(2)}`;
          })()}
          ref={globeRef}
          planet={state.scene === 'planet-view' && state.selectedPlanet ? state.selectedPlanet : homeInfo.planet}
          star={state.scene === 'planet-view' && state.selectedSystem ? state.selectedSystem.star : homeInfo.system.star}
          system={state.scene === 'planet-view' && state.selectedSystem ? state.selectedSystem : homeInfo.system}
          mode={state.scene === 'home-intro' ? 'home' : 'planet-view'}
          textureUrl={(() => {
            const p = state.scene === 'planet-view' && state.selectedPlanet ? state.selectedPlanet : homeInfo.planet;
            return planetSkins.get(`exosphere-${p.id}`)?.texture_url
              ?? planetSkins.get(`system-${p.id}`)?.texture_url
              ?? null;
          })()}
          onDoubleClick={handleGlobeDoubleClick}
        />
      )}

      {state.scene === 'planet-view' && state.selectedPlanet && state.selectedSystem
        && !showArena && !showRaid && !showHangar && !surfaceTarget
        && !showPlayerPage && !showCosmicArchive && !showAcademy
        && !showChaosModal && !showTopUpModal
        && evacuationPhase !== 'stage4-orbit' && (
        <ExospherePremiumPanel
          planet={state.selectedPlanet}
          quarks={quarks}
          alphaPhotoStatus={(() => {
            const status = systemPhotos.get(`planet-exosphere-${state.selectedPlanet!.id}`)?.status;
            if (status === 'succeed') return 'ready';
            if (status === 'generating') return 'generating';
            return quarks >= getPlanetPhotoCost('exosphere') ? 'idle' : 'disabled';
          })()}
          planetSkinStatus={(() => {
            const status = planetSkins.get(`exosphere-${state.selectedPlanet!.id}`)?.status;
            if (status === 'succeed') return 'ready';
            if (status === 'generating' || status === 'pending' || status === 'processing') return 'generating';
            return quarks >= 50 ? 'idle' : 'disabled';
          })()}
          hasGoldenImage={Boolean(systemPhotos.get(`planet-exosphere-${state.selectedPlanet.id}`)?.photoUrl)}
          onAlphaPhoto={() => handlePlanetTelescopePhoto('exosphere')}
          onPlanetSkin={() => handleGeneratePlanetSkin('exosphere')}
          onGoldenImage={() => handleViewPlanetTelescopePhoto(state.selectedPlanet!, 'exosphere')}
        />
      )}
      {/* Surface View (biosphere level) — unmount whenever hangar or arena is
          up so the surface's audio loop + render pipeline fully release.
          Without this the planet-loop plays over the hangar/arena ambience. */}
      {surfaceTarget && !showHangar && !showArena && !showRaid && (
        <SurfaceShaderView
          ref={surfaceViewRef}
          planet={surfaceTarget.planet}
          star={surfaceTarget.star}
          playerId={playerId.current}
          onClose={handleCloseSurface}
          onBuildingCountChange={setSurfaceBuildingCount}
          onBuildingPlaced={(type?: BuildingType) => {
            // After evacuation, each built science installation adds one real scan slot.
            // The building catalog maxPerPlanet remains the hard cap.
            if (!isExodusPhase && (type === 'colony_hub' || type === 'observatory' || type === 'orbital_telescope')) {
              setResearchState((prev) => {
                const sourcePlanetRing = engineRef.current?.getAllSystems()
                  .find((sys) => sys.planets.some((planet) => planet.id === surfaceTarget.planet.id))
                  ?.ringIndex ?? 0;
                const newSlot = { slotIndex: prev.slots.length, systemId: null, startedAt: null, sourcePlanetRing };
                const updated = { ...prev, slots: [...prev.slots, newSlot] };
                try { localStorage.setItem('nebulife_research_state', JSON.stringify(updated)); } catch { /* ignore */ }
                return updated;
              });
            }
            awardXP(XP_REWARDS.BUILDING_PLACED, 'building_placed');
            // Sync building to colony tick state
            if (type) {
              setColonyState(prev => {
                if (!prev) return prev;
                const b: PlacedBuilding = { id: `build-${Date.now()}`, type, x: 0, y: 0, level: 1, builtAt: new Date().toISOString() };
                return { ...prev, buildings: [...prev.buildings, b] };
              });
            }
          }}
          onHarvest={handleHarvest}
          onHarvestFull={handleHarvestFull}
          onHarvestFx={handleHarvestFx}
          onHexUnlocked={(ring) => {
            const xp = ring === 1 ? XP_REWARDS.HEX_UNLOCK_RING1 : ring === 2 ? XP_REWARDS.HEX_UNLOCK_RING2 : XP_REWARDS.HEX_UNLOCK_RING3;
            awardXP(xp, `hex_unlock_ring${ring}`);
          }}
          onHarvestAmount={(amount) => {
            awardXP(amount, 'hex_harvest');
          }}
          onPhaseChange={setSurfacePhase}
          onBuildPanelChange={setSurfaceBuildPanelOpen}
          playerLevel={playerLevel}
          techTreeState={techTreeState}
          minerals={colonyResources.minerals}
          volatiles={colonyResources.volatiles}
          isotopes={colonyResources.isotopes}
          water={colonyResources.water}
          chemicalInventory={chemicalInventory}
          onElementChange={handleElementChange}
          onConsumeIsotopes={(amount) => {
            const pid = surfaceTarget.planet.id;
            addResources(pid, { isotopes: -amount });
          }}
          onResourceDeducted={(delta) => {
            const pid = surfaceTarget.planet.id;
            spendResourcesAcrossPlanets(pid, {
              minerals:  delta.minerals  ?? 0,
              volatiles: delta.volatiles ?? 0,
              isotopes:  delta.isotopes  ?? 0,
              water:     delta.water     ?? 0,
            });
          }}
          researchData={Math.floor(researchData)}
          onConsumeResearchData={(amount) => {
            setResearchData((prev) => Math.max(0, prev - amount));
          }}
          quarks={quarks}
          onConsumeQuarks={(amount) => {
            setQuarks((prev) => Math.max(0, prev - amount));
          }}
          alphaHarvesterCount={0}
          onOpenColonyCenter={(tab) => {
            setColonyCenterInitialTab(tab ?? 'overview');
            setShowColonyCenter(true);
          }}
          planetStocks={planetResourceStocks[surfaceTarget.planet.id]}
          explorationPayloads={explorationPayloads}
          shipFleet={shipFleet}
          explorationProductionQueue={explorationProductionQueue}
          onStartPayloadProduction={handleStartPayloadProduction}
          observatoryState={observatoryState}
          onStartObservatorySearch={handleStartObservatorySearch}
          isPremium={isPremiumActive}
          shutdownBuildingTypes={colonyState
            ? new Set(colonyState.buildings.filter(b => b.shutdown).map(b => b.type))
            : undefined}
          storageBlockedBuildingTypes={surfaceStorageBlockedBuildingTypes}
        />
      )}
      {/* ── Surface resource HUD ──────────────────────────────────────────── */}
      {surfaceTarget && (
        <ResourceWidget
          minerals={getResources(surfaceTarget.planet.id).minerals}
          volatiles={getResources(surfaceTarget.planet.id).volatiles}
          isotopes={getResources(surfaceTarget.planet.id).isotopes}
          water={getResources(surfaceTarget.planet.id).water}
          onRefsReady={setResourceRects}
        />
      )}
      {/* ── Building quest tutorial (surface only) ───────────────────────── */}
      {surfaceTarget && (
        <BuildingQuest
          hubBuilt={surfaceBuildingCount > 0}
          solarBuilt={surfaceBuildingCount > 1}
        />
      )}
      {surfaceTarget && showSurfaceAstraLesson && !showAcademy && !showCosmicArchive && (
        <SurfaceAstraLessonPrompt
          onDismiss={() => {
            try { localStorage.setItem('nebulife_surface_astra_lesson_seen', '1'); } catch { /* ignore */ }
            setShowSurfaceAstraLesson(false);
          }}
          onOpenMission={() => {
            setAcademyInitialTab('mission');
            setAcademyMissionChapter('surface');
            setShowAcademy(true);
          }}
        />
      )}
      {/* ── Fly-to-HUD resource dots ──────────────────────────────────────── */}
      {harvestFxQueue.map((fx) => {
        const rKey = fx.type === 'ore' ? 'minerals' : fx.type === 'vent' ? 'volatiles' : fx.type === 'water' ? 'water' : 'isotopes';
        const rect = resourceRects?.[rKey];
        return (
          <ResourceFlyDot key={fx.id} type={fx.type} sx={fx.sx} sy={fx.sy}
            tx={rect ? rect.left + rect.width  / 2 : undefined}
            ty={rect ? rect.top  + rect.height / 2 : undefined}
          />
        );
      })}
      {/* Player Page (profile, quarks, logout, reset) */}
      {showPlayerPage && (
        <PlayerPage
          playerName={state.playerName}
          playerLevel={playerLevel}
          playerXP={playerXP}
          quarks={quarks}
          isGuest={isGuest}
          isNative={Capacitor.isNativePlatform()}
          isPremium={isPremiumActive}
          avatarUrl={playerAvatarUrl}
          avatarUploading={avatarUploading}
          onChangeAvatar={handleChangeAvatar}
          onRemoveAvatar={handleRemoveAvatar}
          onClose={() => setShowPlayerPage(false)}
          onLogout={handleLogout}
          onStartOver={handleStartOver}
          onDeleteAccount={handleDeleteAccount}
          onOpenTopUp={() => { setShowPlayerPage(false); setShowTopUpModal(true); }}
          onLinkAccount={() => { setShowPlayerPage(false); setShowLinkModal(true); }}
          hasEmail={!!playerEmail}
          emailNotifications={emailNotifications}
          pushNotifications={pushNotifications}
          onToggleEmailNotif={handleToggleEmailNotif}
          onTogglePushNotif={handleTogglePushNotif}
          ambientVolume={ambientVolume}
          onChangeAmbientVolume={setAmbientVolume}
        />
      )}

      {/* Surface Chaos Modal — blocks surface before evacuation */}
      {showChaosModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(2,5,16,0.88)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'rgba(10,15,25,0.97)',
            border: '1px solid #cc4444',
            borderRadius: 6,
            padding: '28px 32px',
            maxWidth: 340,
            textAlign: 'center',
            fontFamily: 'monospace',
            boxShadow: '0 0 40px rgba(180,40,40,0.25)',
          }}>
            <div style={{ fontSize: 13, color: '#ee6655', marginBottom: 12, letterSpacing: '0.08em' }}>
              {t('errors.surfaceChaosTitle')}
            </div>
            <div style={{ fontSize: 11, color: '#8899aa', lineHeight: 1.7, marginBottom: 22 }}>
              {t('errors.surfaceChaosBody')}
            </div>
            <button
              onClick={() => setShowChaosModal(false)}
              style={{
                background: 'rgba(30,12,12,0.9)',
                border: '1px solid #cc4444',
                color: '#ee6655',
                fontFamily: 'monospace',
                fontSize: 11,
                padding: '8px 28px',
                borderRadius: 3,
                cursor: 'pointer',
                letterSpacing: '0.08em',
              }}
            >
              {t('errors.surfaceChaosBtn')}
            </button>
          </div>
        </div>
      )}

      {/* Quark Top-Up Modal */}
      {showTopUpModal && (
        <QuarkTopUpModal
          playerId={playerId.current}
          currentBalance={quarks}
          onClose={() => setShowTopUpModal(false)}
          onQuarksGranted={(granted) => setQuarks(q => q + granted)}
        />
      )}

      {/* Resource description modal */}
      {showResourceModal && (
        <ResourceDescriptionModal
          resource={showResourceModal}
          onClose={() => setShowResourceModal(null)}
        />
      )}

      {/* Get Research Data popup */}
      {showGetResearchData && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10001,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)', fontFamily: 'monospace',
        }} onClick={() => { setShowGetResearchData(false); setResearchDataNeeded(null); }}>
          <div style={{
            background: 'rgba(10,15,25,0.97)', border: '1px solid #4488aa',
            borderRadius: 6, padding: '24px 28px', maxWidth: 340, width: '90%',
            display: 'flex', flexDirection: 'column', gap: 14,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, color: '#aabbcc', letterSpacing: 2, textTransform: 'uppercase' }}>
                Research Data
              </div>
              <button onClick={() => { setShowGetResearchData(false); setResearchDataNeeded(null); }} style={{
                background: 'transparent', border: 'none', color: '#667788',
                fontFamily: 'monospace', fontSize: 14, cursor: 'pointer',
              }}>X</button>
            </div>
            <div style={{ fontSize: 10, color: '#667788', lineHeight: 1.5 }}>
              {t('research.insufficient_data')}
            </div>
            <div style={{ fontSize: 9, color: '#556677', lineHeight: 1.4, borderTop: '1px solid #223344', paddingTop: 10 }}>
              {t('research.regen_hint')}
            </div>
            <div style={{ fontSize: 8, color: '#445566', lineHeight: 1.3, fontFamily: 'monospace' }}>
              {(() => {
                const techBonus = getEffectValue(techTreeStateRef.current, 'research_data_regen', 0);
                const basePerHour = 1 + techBonus;
                // Compute building research data contribution per hour.
                // Use colonyState when available (surface loaded), otherwise
                // fall back to hex_slots localStorage so the rate is correct
                // even when the player views this modal from the galaxy view.
                let bldgPerHour = 0;
                const bldgsForRate: Array<{type: string; shutdown?: boolean}> = colonyState?.buildings ?? (() => {
                  try {
                    const raw = localStorage.getItem('nebulife_hex_slots');
                    if (!raw) return [];
                    return (JSON.parse(raw) as Array<{state: string; buildingType?: string}>)
                      .filter((s) => s.state === 'building' && s.buildingType)
                      .map((s) => ({ type: s.buildingType! }));
                  } catch { return []; }
                })();
                for (const b of bldgsForRate) {
                  if (b.shutdown) continue;
                  const bDef = (BUILDING_DEFS as Record<string, {production?: Array<{resource: string; amount: number}>}>)[b.type];
                  if (!bDef?.production) continue;
                  for (const p of bDef.production) {
                    if (p.resource === 'researchData') bldgPerHour += p.amount * 60;
                  }
                }
                const totalPerHour = basePerHour + bldgPerHour;
                return `RD: ${Math.floor(researchData)}${researchDataNeeded !== null ? ` | need: ${researchDataNeeded}` : ''} | +${totalPerHour.toFixed(1)}/hr`;
              })()}
            </div>
            <button
              onClick={async () => {
                playSfx('ui-click', 0.07);
                const result = await watchAdsWithProgress(
                  'research_data',
                  2,
                  (completed, total) => setResearchDataAdProgress(completed),
                );
                if (result.rewarded) {
                  setResearchData(prev => prev + 10);
                  setResearchDataAdProgress(0);
                  setShowGetResearchData(false);
                  setResearchDataNeeded(null);
                }
              }}
              style={{
                padding: '10px 16px',
                background: 'linear-gradient(135deg, rgba(68,136,170,0.2), rgba(40,60,100,0.3))',
                border: '1px solid #4488aa', borderRadius: 4,
                color: '#7bb8ff', fontFamily: 'monospace', fontSize: 11,
                letterSpacing: 1, cursor: 'pointer', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z" /></svg>
              {researchDataAdProgress >= 2
                ? t('research.data_received')
                : `${t('research.watch_ad')} ${researchDataAdProgress}/2`}
            </button>
          </div>
        </div>
      )}

      {/* Cosmic Archive */}
      {showCosmicArchive && playerId.current && (
        <CosmicArchive
          ref={cosmicArchiveRef}
          playerId={playerId.current}
          allSystems={engineRef.current?.getAllSystems() ?? []}
          aliases={aliases}
          logEntries={logEntries}
          highlightedType={highlightedGalleryType}
          localEntries={galleryMap}
          galleryMap={galleryMap}
          onOpenDiscovery={handleOpenDiscoveryFromLog}
          getResearchProgress={(sysId: string) => {
            const sys = (engineRef.current?.getAllSystems() ?? []).find(s => s.id === sysId);
            if (sys?.ownerPlayerId !== null && sys?.ownerPlayerId !== undefined) return 100;
            return getResearchProgress(researchState, sysId);
          }}
          onClose={() => setShowCosmicArchive(false)}
          onNavigateToSystem={(system) => {
            setShowCosmicArchive(false);
            handleEnterSystem(system);
          }}
          onViewPlanetDetail={(system, planetId) => {
            setShowCosmicArchive(false);
            const pIdx = system.planets.findIndex((p) => p.id === planetId);
            if (pIdx >= 0) handleViewPlanetDetail(system, pIdx, aliases[system.id] ?? undefined);
          }}
          onViewPlanetExosphere={handleViewPlanetExosphere}
          onGoHome={() => {
            setShowCosmicArchive(false);
            // Terminal home button now lands on the SURFACE directly
            // (was exosphere). Matches bottom-bar Home behaviour.
            handleGoToHomeSurface();
          }}
          onStartResearch={handleStartResearch}
          canStartResearch={(sysId: string) => {
            const allSystems = engineRef.current?.getAllSystems() ?? [];
            const sys = allSystems.find(s => s.id === sysId);
            if (!sys) return false;
            if (Math.floor(researchData) < getSystemResearchDataCost(sys)) return false;
            const effectiveMax = getEffectiveResearchMaxRing(allSystems, sysId);
            return canStartResearch(researchState, sysId, sys.ringIndex, effectiveMax);
          }}
          onRenameSystem={(sysId: string, newName: string) => {
            setAlias({
              playerId: playerId.current,
              entityType: 'system',
              entityId: sysId,
              customName: newName,
            }).then(() => {
              setAliases((prev) => ({ ...prev, [sysId]: newName }));
            }).catch((err) => console.error('Rename failed:', err));
          }}
          onNavigateToGalaxy={() => {
            setShowCosmicArchive(false);
            handleStartExploration();
          }}
          isSystemResearching={(sysId: string) => researchState.slots.some((s) => s.systemId === sysId)}
          playerLevel={playerLevel}
          techTreeState={techTreeState}
          onResearchTech={handleResearchTech}
          researchData={Math.floor(researchData)}
          getResearchDataCost={getSystemResearchDataCost}
          favoritePlanets={favoritePlanets}
          onFavoritesChange={(newFavs) => { setFavoritePlanets(newFavs); scheduleSyncToServer(); }}
          systemPhotos={systemPhotos}
          colonyResources={totalResources()}
          chemicalInventory={chemicalInventory}
          resourcesByPlanet={colonyResourcesByPlanet}
          quarks={quarks}
          isQuarkUnlocked={(sysId) => quarkUnlockedSystems.has(sysId)}
          onUnlockViaQuarks={(sysId) => {
            const COST = 30;
            if (quarks < COST) return;
            setQuarks((q) => Math.max(0, q - COST));
            setQuarkUnlockedSystems((prev) => {
              const next = new Set(prev);
              next.add(sysId);
              return next;
            });
          }}
          instantResearchCost={30}
          onInstantResearch={(sysId) => {
            const COST = 30;
            if (quarks < COST) return;
            const sys = (engineRef.current?.getAllSystems() ?? []).find(s => s.id === sysId);
            if (!sys) return;
            setQuarks((q) => Math.max(0, q - COST));
            setResearchState((prev) => completeSystemResearchInstantly(prev, sys));
          }}
          onOpenTopUp={() => {
            setShowCosmicArchive(false);
            if (isGuest) setShowLinkModal(true); else setShowTopUpModal(true);
          }}
          colonyPlanetIds={(() => {
            // Colony planets: the player's current home/evacuation planet +
            // any active surface planet that actually has a colony_hub. Do
            // not trust p.isHomePlanet across all cluster systems: neighbor
            // home planets also carry that flag and looked like fake colonies.
            const ids = new Set<string>();
            if (homeInfo?.planet.id) ids.add(homeInfo.planet.id);
            if (colonyState?.buildings?.some((b) => b.type === 'colony_hub')) {
              ids.add(colonyState.planetId);
            }
            return ids;
          })()}
          colonySystemIds={(() => {
            const sysIds: string[] = [];
            const allSys = engineRef.current?.getAllSystems() ?? [];
            if (homeInfo?.system.id) {
              sysIds.push(homeInfo.system.id);
            }
            if (colonyState?.buildings?.some((b) => b.type === 'colony_hub')) {
              const colonySys = allSys.find((s) => s.planets.some((p) => p.id === colonyState.planetId));
              if (colonySys && !sysIds.includes(colonySys.id)) sysIds.push(colonySys.id);
            }
            return sysIds;
          })()}
          terraformStates={terraformStates}
          planetRevealLevels={planetRevealLevels}
          planetReports={planetReports}
          colonyStateByPlanet={colonyState ? { [colonyState.planetId]: colonyState } : undefined}
          getPlanetResources={getResources}
          planetResourceStocks={planetResourceStocks}
          donorPlanets={getColonyPlanets()}
          colonyBuildings={colonyState?.buildings ?? []}
          cargoShips={shipFleet.ships.filter((ship) => {
            const def = PRODUCIBLE_DEFS[ship.type];
            return (ship.type === 'terraform_freighter' || def.requiresBuilding === 'spaceport') && def.cargoCapacity > 0;
          })}
          cargoShipments={shipFleet.cargoShipments ?? []}
          planetSkinStatuses={(() => {
            const statuses: Record<string, { system?: 'generating' | 'pending' | 'processing' | 'succeed' | 'failed'; exosphere?: 'generating' | 'pending' | 'processing' | 'succeed' | 'failed' }> = {};
            for (const [key, skin] of planetSkins) {
              const [kind, ...idParts] = key.split('-');
              const planetId = idParts.join('-');
              if (kind !== 'system' && kind !== 'exosphere') continue;
              statuses[planetId] = {
                ...statuses[planetId],
                [kind]: skin.status as 'generating' | 'pending' | 'processing' | 'succeed' | 'failed',
              };
            }
            return statuses;
          })()}
          onGeneratePlanetSkin={(system, planet, kind) => {
            setShowCosmicArchive(false);
            setState((prev) => ({ ...prev, selectedSystem: system, selectedPlanet: planet }));
            handleGeneratePlanetSkin(kind, system, planet);
          }}
          onSendTerraformDelivery={(targetPlanet, paramId) => {
            // Open terraform panel for this planet, pre-targeting the given param.
            // For now, we open the full TerraformPanel which handles dispatch.
            setShowCosmicArchive(false);
            setShowTerraformPlanet(targetPlanet);
          }}
          onCompleteTerraform={(planet) => {
            // Manual completion trigger — apply if overall progress >= 95
            const tfState = terraformStates[planet.id];
            if (!tfState) return;
            if (getOverallProgress(tfState) < 95) return;
            const engine = engineRef.current;
            if (!engine) return;
            const allSys = engine.getAllSystems();
            const sys = allSys.find((s) => s.planets.some((p) => p.id === planet.id));
            if (!sys) return;
            const promotedPlanet = applyTerraformCompletionToPlanet(planet, tfState);
            if (promotedPlanet) {
              const completionTime = Date.now();
              setTerraformStates((prev) => ({
                ...prev,
                [planet.id]: { ...tfState, completedAt: completionTime },
              }));
              setPendingTerraformCompletion(promotedPlanet);
            }
          }}
          onOpenColonySurface={(planet) => {
            setShowCosmicArchive(false);
            // Find the star system that contains this planet
            const allSys = engineRef.current?.getAllSystems() ?? [];
            const sys = allSys.find((s) => s.planets.some((p) => p.id === planet.id));
            if (sys) {
              playSfx('go-to-exosphera', 0.5);
              setSurfaceTarget({ planet, star: sys.star });
            }
          }}
          onOpenColonyCenter={(planet) => {
            setShowCosmicArchive(false);
            // Ensure surfaceTarget is set so ColonyCenterPage knows which planet
            const allSys = engineRef.current?.getAllSystems() ?? [];
            const sys = allSys.find((s) => s.planets.some((p) => p.id === planet.id));
            if (sys) {
              setSurfaceTarget({ planet, star: sys.star });
            }
            setColonyCenterInitialTab('overview');
            setShowColonyCenter(true);
          }}
          onRenamePlanet={(planetId, newName) => {
            // Save custom planet name into planetOverrides (persisted to server via JSONB)
            setPlanetOverrides((prev) => {
              const existing = prev[planetId];
              // PlanetOverride requires all fields; if entry doesn't exist yet we only
              // update customName — the override struct needs the required fields.
              if (existing) {
                return { ...prev, [planetId]: { ...existing, customName: newName } };
              }
              // No existing override: we can't construct a full PlanetOverride without
              // knowing current planet state. Find the planet and build a minimal entry.
              const allSys = engineRef.current?.getAllSystems() ?? [];
              for (const sys of allSys) {
                const p = sys.planets.find((pl) => pl.id === planetId);
                if (p) {
                  return {
                    ...prev,
                    [planetId]: {
                      planetId,
                      type: p.type,
                      habitability: p.habitability,
                      terraformDifficulty: p.terraformDifficulty ?? 0,
                      promotedAt: 0,
                      customName: newName,
                    },
                  };
                }
              }
              return prev;
            });
            scheduleSyncToServer();
          }}
        />
      )}

      {/* Academy Dashboard */}
      {showAcademy && (
        <AcademyDashboard
          onClose={() => {
            setShowAcademy(false);
            setAcademyInitialTab(undefined);
            setAcademyMissionChapter(undefined);
          }}
          onNavigateToGalaxy={() => {
            setShowAcademy(false);
            setAcademyInitialTab(undefined);
            setAcademyMissionChapter(undefined);
            handleStartExploration();
          }}
          playerName={state.playerName}
          sharedLessonInfo={sharedLessonInfo}
          onAwardXP={awardXP}
          initialTab={academyInitialTab}
          initialMissionChapter={academyMissionChapter}
        />
      )}

      {/* Cosmic Encyclopedia — Academy v2 (wiki-style space-knowledge library) */}
      {showEncyclopedia && (
        <EncyclopediaScreen onClose={() => setShowEncyclopedia(false)} />
      )}

      {/* Hangar — intermediate page between main game and Space Arena */}
      {showHangar && !showArena && !showRaid && (
        <HangarPage
          playerLevel={playerLevel}
          currentQuarks={quarks}
          arenaStats={arenaStats}
          onQuarksChanged={(newBalance) => {
            setQuarks(newBalance);
            scheduleSyncToServer();
          }}
          onBack={() => {
            setShowHangar(false);
            restoreStarGroupView();
          }}
          onEnterArena={() => {
            syncGameStateRef.current(); // push latest state to server before arena
            setArenaTeamMode(false);
            setShowHangar(false);
            setShowArena(true);
          }}
          onEnterTeamBattle={() => {
            syncGameStateRef.current(); // push latest state to server before arena
            setArenaTeamMode(true);
            setShowHangar(false);
            setShowArena(true);
          }}
          onEnterRaid={() => {
            const today = localDateKey();
            const raidDateKey = `nebulife_daily_raid_date_${playerId.current || 'guest'}`;
            let savedRaidDate = lastRaidQuestDate;
            try { savedRaidDate = localStorage.getItem(raidDateKey) ?? savedRaidDate; } catch { /* ignore */ }
            if (savedRaidDate === today) {
              setToastMessage(t('hangar.event.raid_daily_done'));
              window.setTimeout(() => setToastMessage(null), 2800);
              return;
            }
            try { localStorage.setItem(raidDateKey, today); } catch { /* ignore */ }
            setLastRaidQuestDate(today);
            syncGameStateRef.current(); // push latest state to server before raid
            setArenaTeamMode(false);
            setShowHangar(false);
            setShowRaid(true);
          }}
        />
      )}

      {/* Space Arena */}
      {showArena && (
        <SpaceArena
          teamMode={arenaTeamMode}
          onAwardXP={awardXP}
          onStatsCommit={handleArenaStatsCommit}
          onExit={() => {
            setShowArena(false);
            setArenaTeamMode(false);
            // Return to Hangar after arena exit
            setShowHangar(true);
            restoreStarGroupView();
            interstitialManager.tryShow();
          }}
        />
      )}

      {/* Carrier Raid */}
      {showRaid && (
        <CarrierRaid
          onAwardXP={awardXP}
          onExit={() => {
            setShowRaid(false);
            setShowHangar(true);
            restoreStarGroupView();
            interstitialManager.tryShow();
          }}
        />
      )}

      {planetSkinReveal && state.scene === 'planet-view' && state.selectedPlanet?.id === planetSkinReveal.planetId && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 94,
            transform: 'translateX(-50%)',
            width: 'min(420px, calc(100vw - 32px))',
            padding: '14px 16px',
            borderRadius: 8,
            border: planetSkinReveal.status === 'succeed' ? '1px solid rgba(68,255,136,0.55)' : '1px solid rgba(123,184,255,0.45)',
            background: 'linear-gradient(135deg, rgba(5,10,20,0.94), rgba(16,24,38,0.90))',
            boxShadow: planetSkinReveal.status === 'succeed'
              ? '0 0 28px rgba(68,255,136,0.18)'
              : '0 0 28px rgba(68,136,170,0.18)',
            color: '#aabbcc',
            fontFamily: 'monospace',
            zIndex: 10045,
            pointerEvents: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                border: '1px solid rgba(123,184,255,0.55)',
                background: planetSkinReveal.status === 'succeed'
                  ? 'radial-gradient(circle at 35% 30%, #d7fff0 0%, #44ff88 26%, #114433 58%, #020510 100%)'
                  : 'conic-gradient(from 0deg, rgba(123,184,255,0.15), rgba(123,184,255,0.85), rgba(123,184,255,0.15))',
                filter: planetSkinReveal.status === 'succeed' ? 'drop-shadow(0 0 10px rgba(68,255,136,0.35))' : 'none',
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: planetSkinReveal.status === 'succeed' ? '#88ffbb' : '#7bb8ff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {planetSkinReveal.status === 'succeed' ? t('planet.skin_exosphere_ready') : t('planet.skin_reveal_title')}
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: '#8899aa' }}>
                {planetSkinReveal.status === 'succeed'
                  ? t('planet.skin_reveal_done')
                  : `${t('planet.skin_reveal_progress')} ${planetSkinReveal.planetName}`}
              </div>
              {planetSkinReveal.status === 'generating' && (
                <div style={{ marginTop: 10, height: 3, borderRadius: 2, overflow: 'hidden', background: 'rgba(51,68,85,0.55)' }}>
                  <div style={{ width: '72%', height: '100%', background: 'linear-gradient(90deg, transparent, #7bb8ff, transparent)' }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Telescope Overlay */}
      {telescopeOverlay && (
        <TelescopeOverlay
          targetName={telescopeOverlay.targetName}
          targetType={telescopeOverlay.targetType}
          phase={telescopeOverlay.phase}
          photoUrl={telescopeOverlay.photoUrl}
          canDownload={telescopeOverlay.source === 'mission'}
          onSaveToCollection={handleTelescopeSaveToCollection}
          onShare={handleTelescopeShare}
          onDownload={handleTelescopeDownload}
          onGoToExosphere={telescopeOverlay.targetType === 'planet'
            ? () => {
                const rawPlanetId = telescopeOverlay.photoKey
                  .replace(/^planet-exosphere-/, '')
                  .replace(/^planet-biosphere-/, '')
                  .replace(/^planet-aerial-/, '')
                  .replace(/^planet-probe-/, '')
                  .replace(/^planet-rover-/, '')
                  .replace(/^planet-drone-/, '')
                  .replace(/^planet-/, '')
                  .split('__')[0];
                const system = engineRef.current?.getAllSystems().find((entry) => entry.planets.some((planet) => planet.id === rawPlanetId));
                if (system) handleViewPlanetExosphere(system, rawPlanetId);
                setTelescopeOverlay(null);
              }
            : undefined}
          onClose={() => setTelescopeOverlay(null)}
        />
      )}

      {/* Digest modal */}
      {digestModalImages && (
        <DigestModal
          images={digestModalImages}
          weekDate={digestModalWeekDate}
          onClose={() => setDigestModalImages(null)}
        />
      )}

      {/* Quark accrual toast queue (singleton renderer; enqueueQuarkToast from anywhere) */}
      {!arenaPopupGate && <QuarkToastRenderer />}

      {/* Toast notification */}
      {toastMessage && !arenaPopupGate && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(10,15,25,0.95)',
          border: '1px solid #4488aa',
          borderRadius: 4,
          padding: '10px 24px',
          color: '#4488aa',
          fontFamily: 'monospace',
          fontSize: 12,
          letterSpacing: 1,
          zIndex: 9800,
          pointerEvents: 'none',
          animation: 'toastFadeIn 0.3s ease-out',
        }}>
          {toastMessage}
        </div>
      )}

      {/* System Objects Panel */}
      {showObjectsPanel && objectsPanelSystem && (
        <SystemObjectsPanel
          system={objectsPanelSystem}
          displayName={aliases[objectsPanelSystem.id] ?? undefined}
          onClose={() => {
            setShowObjectsPanel(false);
            setObjectsPanelSystem(null);
          }}
          onViewPlanet={(idx) => handleViewPlanetDetail(
            objectsPanelSystem,
            idx,
            aliases[objectsPanelSystem.id] ?? undefined,
          )}
          destroyedPlanetIds={getDestroyedPlanetIdsForSystem(objectsPanelSystem.id)}
        />
      )}

      {/* Planet Detail Window */}
      {planetDetailTarget && (
        <PlanetDetailWindow
          system={planetDetailTarget.system}
          systemDisplayName={planetDetailTarget.displayName}
          initialPlanetIndex={planetDetailTarget.planetIndex}
          onClose={() => setPlanetDetailTarget(null)}
          destroyedPlanetIds={getDestroyedPlanetIdsForSystem(planetDetailTarget.system.id)}
        />
      )}

      {/* Tutorial overlay */}
      {isTutorialActive && activeTutorialStep?.type !== 'free-task' && activeTutorialStep && (
        <TutorialOverlay
          step={activeTutorialStep}
          subStepIndex={tutorialSubStep}
          onAdvance={handleTutorialAdvance}
          onSkip={handleTutorialSkip}
        />
      )}
      {isTutorialActive && activeTutorialStep?.type === 'free-task' && (
        <FreeTaskHUD current={tutorialFreeCount} total={activeTutorialStep.freeTaskTotal ?? 1} />
      )}

      {/* Chat widget (visible when authenticated, not in onboarding/arena/hangar) */}
      {!authLoading && !needsOnboarding && !needsCallsign && !showArena && !showRaid && !showHangar && playerId.current && (
        <ChatWidget
          playerId={playerId.current}
          playerName={state.playerName}
          playerLevel={playerLevel}
          systemNotifs={systemNotifs}
          logEntries={logEntries}
          onSystemNotifRead={(id) =>
            setSystemNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
          }
          onAwardXP={awardXP}
          onNavigateToPlanet={(systemId, planetId) => {
            const allSystems = engineRef.current?.getAllSystems() ?? [];
            const sys = allSystems.find((s) => s.id === systemId);
            const planet = sys?.planets.find((p) => p.id === planetId);
            if (sys && planet) {
              engineRef.current?.showPlanetViewScene(sys, planet);
              setState((prev) => ({ ...prev, scene: 'planet-view' as const, selectedSystem: sys, selectedPlanet: planet }));
            }
          }}
          onNavigateToSystem={(systemId) => {
            const allSystems = engineRef.current?.getAllSystems() ?? [];
            const sys = allSystems.find((s) => s.id === systemId);
            if (sys) {
              engineRef.current?.showSystemScene(sys);
              setState((prev) => ({ ...prev, scene: 'system' as const, selectedSystem: sys, selectedPlanet: null }));
            }
          }}
          onOpenPlanetMissionReport={openPlanetMissionReportByIds}
          onOpenSystemReport={(systemId) => {
            const allSystems = engineRef.current?.getAllSystems() ?? [];
            const sys = allSystems.find((s) => s.id === systemId);
            const research = researchState.systems[systemId];
            if (sys && research) {
              setCompletedModalQueue(q => [{ system: sys, research }, ...q]);
            }
          }}
          onOpenLogDiscovery={(entry) => {
            if (entry.discoveryRef) handleOpenDiscoveryFromLog(entry.discoveryRef);
          }}
          lastDigestSeen={lastDigestSeen}
          latestDigestWeekDate={latestDigestWeekDate}
          preferredLanguage={lang}
          quizAnswers={astraQuizAnswers}
          onQuizAnswer={handleAstraQuizAnswer}
          onDigestSeen={handleAstraDigestSeen}
          forceCollapsed={isTutorialActive && activeTutorialStep?.id !== 'astra-handoff'}
          isPremium={isPremiumActive}
        />
      )}

      {/* Mission Tracker HUD chip — visible when there are terraform missions */}
      {!authLoading && !needsOnboarding && !needsCallsign && !showArena && !showRaid && !showHangar && fleet.length > 0 && (
        <MissionTracker
          missions={fleet}
          fleetCapacity={Math.max(1, fleet.length)}
          getPlanetName={(planetId) => {
            const engine = engineRef.current;
            if (!engine) return planetId;
            for (const sys of engine.getAllSystems()) {
              const p = sys.planets.find((pl) => pl.id === planetId);
              if (p) return p.name;
            }
            return planetId;
          }}
        />
      )}

      {/* Colony Center — management hub opened via colony_hub inspect. */}
      {showColonyCenter && surfaceTarget && (() => {
        // Read fresh hex_slots from localStorage so newly-placed structures
        // and resource hexes are reflected immediately. colonyState is
        // only rebuilt on planet change, so without this the Buildings tab
        // showed "0 / 1" for a colony_hub that was already on the surface.
        type RawSlot = {
          id: string;
          ring: number;
          index: number;
          state: string;
          buildingType?: string;
          buildingLevel?: number;
          resourceType?: 'ore' | 'tree' | 'vent' | 'water';
          yieldPerHour?: number;
        };
        let hexSlots: RawSlot[] = [];
        try {
          const raw = localStorage.getItem('nebulife_hex_slots');
          if (raw) hexSlots = JSON.parse(raw) as RawSlot[];
        } catch { /* ignore */ }

        const liveBuildings: PlacedBuilding[] = hexSlots
          .filter((s) => s.state === 'building' && s.buildingType)
          .map((s) => ({
            id: `${playerId.current}-${s.id}-${s.buildingType}`,
            type: s.buildingType as BuildingType,
            x: s.index,
            y: s.ring,
            level: s.buildingLevel ?? 1,
            builtAt: new Date().toISOString(),
          }));

        // Use the freshly-derived list when present; otherwise fall back to
        // whatever colonyState had (e.g. before any hex_slots were saved).
        const buildingsForUi = liveBuildings.length > 0 ? liveBuildings : (colonyState?.buildings ?? []);
        const storageCapacity = computeResourceStorageCapacity(buildingsForUi);
        const activeResources = getResources(surfaceTarget.planet.id);
        const storageFullResourceKeys = new Set<ColonyResourceName>(
          (['minerals', 'volatiles', 'isotopes', 'water'] as const).filter((key) => activeResources[key] >= storageCapacity),
        );

        const active: ColonyCenterPlanet = {
          planet: surfaceTarget.planet,
          star: surfaceTarget.star,
          system: state.selectedSystem ?? homeInfo?.system ?? ({} as Star) as any,
          buildings: buildingsForUi,
          colonyLevel: (colonyState as any)?.colonyLevel ?? 1,
          habitability: surfaceTarget.planet.habitability?.overall ?? 0,
          active: true,
        };
        // MVP: only 1 real colony (active surface). Multi-colony list pending
        // server-side second-home-colony merge (migration 014).
        const allColonies: ColonyCenterPlanet[] = [active];

        // Aggregate per-hour production from buildings. Tick amounts in
        // BUILDING_DEFS are per-minute → multiply by 60 for /h.
        const perHour = { minerals: 0, volatiles: 0, isotopes: 0, water: 0, researchData: 0, energy: 0 };
        let energyProduced = 0;
        let energyConsumed = 0;
        let populationCapacity = 0;
        let foodSupportCapacity = 0;
        let hasColonyHub = false;
        for (const b of active.buildings) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const def = (BUILDING_DEFS as Record<string, any>)[b.type];
          if (!def) continue;
          if (b.shutdown) continue;
          if (b.type === 'colony_hub') hasColonyHub = true;
          energyProduced += def.energyOutput ?? 0;
          energyConsumed += def.energyConsumption ?? 0;
          populationCapacity += def.populationCapacityAdd ?? 0;
          for (const p of (def.production ?? []) as Array<{ resource: string; amount: number }>) {
            if (p.resource in perHour) (perHour as any)[p.resource] += p.amount * 60;
            if (p.resource === 'food') foodSupportCapacity += p.amount * 60 * getEffectValue(techTreeState, 'food_output_mult', 1);
          }
        }
        const baseLifeSupport = hasColonyHub ? 5000 : 0;
        const supportedPopulationCapacity = Math.floor(Math.min(
          populationCapacity,
          baseLifeSupport + foodSupportCapacity,
        ));
        const savedPopulation = (colonyState as any)?.population as { current?: number; capacity?: number } | undefined;
        const currentPopulation = savedPopulation?.current && savedPopulation.current > 0
          ? savedPopulation.current
          : hasColonyHub
            ? Math.min(5000, supportedPopulationCapacity || populationCapacity)
            : 0;
        active.population = {
          current: Math.round(Math.min(currentPopulation, Math.max(populationCapacity, supportedPopulationCapacity))),
          capacity: Math.max(savedPopulation?.capacity ?? 0, supportedPopulationCapacity, populationCapacity),
        };

        // Resource hexes — passive extraction from natural deposits. Each
        // resource hex has a yieldPerHour (already /h, not /min) and maps
        // to one of the four colony resources. Without this the Production
        // tab understated mineral/volatile/water/isotope income because all
        // surface deposits were ignored.
        const HEX_RESOURCE_TO_COLONY: Record<'ore' | 'tree' | 'vent' | 'water', 'minerals' | 'volatiles' | 'isotopes' | 'water'> = {
          ore: 'minerals',
          vent: 'volatiles',
          tree: 'isotopes',
          water: 'water',
        };
        const hexExtractionPerHour = { minerals: 0, volatiles: 0, isotopes: 0, water: 0 };
        for (const s of hexSlots) {
          if (s.state !== 'resource' || !s.resourceType || !s.yieldPerHour) continue;
          const colKey = HEX_RESOURCE_TO_COLONY[s.resourceType];
          if (colKey) {
            hexExtractionPerHour[colKey] += s.yieldPerHour;
            perHour[colKey] += s.yieldPerHour;
          }
        }
        const displayedPerHour = { ...perHour };
        for (const key of storageFullResourceKeys) {
          displayedPerHour[key] = 0;
        }

        return (
          <ColonyCenterPage
            active={active}
            allColonies={allColonies}
            initialTab={colonyCenterInitialTab}
            colonyResources={activeResources}
            storageCapacity={storageCapacity}
            productionPerHour={displayedPerHour}
            extractionPerHour={hexExtractionPerHour}
            energyBalance={{ produced: Math.round(energyProduced), consumed: Math.round(energyConsumed) }}
            researchData={Math.floor(researchData)}
            quarks={quarks}
            boosts={colonyBoosts}
            onBuyBoost={(kind, pct) => {
              const priceTable = kind === 'resource' ? RESOURCE_BOOST_PRICES : TIME_BOOST_PRICES;
              const key = String(Math.round(pct * 100));
              const price = priceTable[key];
              if (!price || quarks < price) return;
              trackPaidFeatureOrder(`colony_${kind}_boost`, price, { planet_id: active.planet.id, pct: Math.round(pct * 100) });
              setQuarks((q) => Math.max(0, q - price));
              setColonyBoosts((prev) => ({
                ...prev,
                [active.planet.id]: {
                  ...(prev[active.planet.id] ?? {}),
                  [kind]: { pct, expiresAt: Date.now() + BOOST_DURATION_MS },
                },
              }));
            }}
            onTeleport={() => { /* TODO: multi-colony teleport */ }}
            onClose={() => setShowColonyCenter(false)}
            onOpenTopUp={() => {
              setShowColonyCenter(false);
              if (isGuest) setShowLinkModal(true); else setShowTopUpModal(true);
            }}
            planetStocks={planetResourceStocks[active.planet.id]}
            onResourceChange={(delta) => addResources(active.planet.id, delta)}
            onResearchDataChange={(delta) => setResearchData((prev) => Math.max(0, prev + delta))}
            explorationPayloads={explorationPayloads}
            shipFleet={shipFleet}
            explorationProductionQueue={explorationProductionQueue}
            onStartPayloadProduction={handleStartPayloadProduction}
          />
        );
      })()}

      {/* Auth: Loading screen */}
      {showBootLoader && (
        <QuantumSeedLoader />
      )}

      {/* Auth: Login screen (only when Firebase is configured) */}
      {isFirebaseConfigured && !showBootLoader && !firebaseUser && (
        <AuthScreen
          onAuthenticated={async (user, _isNew) => {
            setFirebaseUser(user);
            playerId.current = user.uid;
            setIsGuest(user.isAnonymous);
            // Registration handled by onAuthStateChanged listener
          }}
        />
      )}

      {/* Auth: Callsign selection */}
      {isFirebaseConfigured && !showBootLoader && firebaseUser && needsCallsign && (
        <CallsignModal
          onComplete={(callsign) => {
            setNeedsCallsign(false);
            setState((prev) => ({ ...prev, playerName: callsign }));
          }}
        />
      )}

      {/* Cinematic intro (new players) — only after auth is resolved */}
      {!showBootLoader && needsOnboarding && !needsCallsign && homeInfo && (!isFirebaseConfigured || !!firebaseUser) && (
        <CinematicIntro
          homeInfo={homeInfo}
          engineRef={engineRef}
          onVideoPlayingChange={setCinematicVideoPlaying}
          onComplete={handleOnboardingComplete}
          onRequestUniverseScene={async () => {
            // Skip heavy Three.js universe on low/mid-tier devices —
            // it hangs tablets/mid-range Androids during the intro. On
            // flagships (S22 Ultra, iPhone 14+) we still show the full
            // cinematic zoom.
            const tier = getDeviceTier();
            if (tier !== 'high') {
              // Keep PixiJS engine paused + render nothing behind subtitles
              // (the CinematicIntro gradient covers the black background).
              engineRef.current?.pause();
              setState(prev => ({ ...prev, scene: 'universe' }));
              return;
            }
            await initUniverseEngine();
            setUniverseVisible(true);
            universeEngineRef.current?.setVisible(true);
            engineRef.current?.pause();
            setState(prev => ({ ...prev, scene: 'universe' }));
            // Slow cinematic zoom toward player's home cluster during subtitles
            setTimeout(() => universeEngineRef.current?.flyToMyCluster(8000), 500);
          }}
          onLeaveUniverseToGalaxy={() => {
            setUniverseVisible(false);
            if (universeEngineRef.current) {
              universeEngineRef.current.destroy();
              universeEngineRef.current = null;
            }
            engineRef.current?.resume();
            engineRef.current?.showGalaxyScene();
            setState(prev => ({ ...prev, scene: 'galaxy', selectedSystem: null, selectedPlanet: null }));
          }}
          onRequestGalaxyScene={() => {
            engineRef.current?.showGalaxyScene();
            setState((prev) => ({ ...prev, scene: 'galaxy', selectedSystem: null, selectedPlanet: null }));
          }}
          onRequestSystemScene={(sys) => {
            engineRef.current?.showSystemScene(sys);
            setState((prev) => ({ ...prev, scene: 'system', selectedSystem: sys, selectedPlanet: null }));
          }}
          onRequestHomeScene={() => {
            engineRef.current?.showHomePlanetScene(true);
            setState((prev) => ({ ...prev, scene: 'home-intro', selectedSystem: null, selectedPlanet: null }));
          }}
        />
      )}

      {/* Auth: Link account modal (for guests) */}
      {showLinkModal && (
        <LinkAccountModal
          onLinked={() => {
            setShowLinkModal(false);
            setIsGuest(false);
            setShowGuestReminder(false);
          }}
          onClose={() => setShowLinkModal(false)}
        />
      )}

      {/* Guest registration reminder */}
      {showGuestReminder && isGuest && !showLinkModal && !needsCallsign && !needsOnboarding && tutorialStep >= tutorialCompleteStep && (
        <GuestRegistrationReminder
          onDismiss={() => setShowGuestReminder(false)}
          onLinked={() => {
            setShowGuestReminder(false);
            setIsGuest(false);
          }}
        />
      )}

      {/* Exit confirmation dialog (Android back button at root level) */}
      {showExitConfirm && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', fontFamily: 'monospace' }}
          onClick={() => setShowExitConfirm(false)}
        >
          <div
            style={{ background: 'rgba(10,15,25,0.97)', border: '1px solid #334455', borderRadius: 6, padding: '20px 24px', maxWidth: 280 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ color: '#aabbcc', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
              {t('app.exit_confirm')}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setShowExitConfirm(false)}
                style={{ padding: '8px 16px', background: 'rgba(10,15,25,0.8)', border: '1px solid #334455', borderRadius: 3, color: '#8899aa', fontFamily: 'monospace', fontSize: 11, cursor: 'pointer' }}
              >
                {t('app.cancel')}
              </button>
              <button
                onClick={async () => { const { App: CapApp } = await import('@capacitor/app'); CapApp.minimizeApp(); }}
                style={{ padding: '8px 16px', background: 'rgba(204,68,68,0.15)', border: '1px solid #cc4444', borderRadius: 3, color: '#cc4444', fontFamily: 'monospace', fontSize: 11, cursor: 'pointer' }}
              >
                {t('app.exit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Root export — wraps AppInner with LanguageProvider + language selection
// ---------------------------------------------------------------------------

/** Detect device language and map to supported app language ('uk' | 'en').
 *  Consults navigator.languages, navigator.language, and Intl locale.
 *  If any of them say Ukrainian → 'uk'. Only explicit 'en' → 'en'.
 *  Target audience is Ukrainian, so default on ambiguity is 'uk'. */
function detectDeviceLanguage(): Language {
  // English is the default per business decision (target audience is
  // global EN market; UK is a homage-not-target language). We still
  // detect an explicit Ukrainian locale so UA players don't have to
  // tap the UK pill themselves — but anything ambiguous or non-UA
  // falls through to EN.
  try {
    const candidates: string[] = [];
    if (typeof navigator !== 'undefined') {
      if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);
      if (navigator.language) candidates.push(navigator.language);
      const nav = navigator as Navigator & { userLanguage?: string };
      if (nav.userLanguage) candidates.push(nav.userLanguage);
    }
    try {
      const intlLoc = Intl.DateTimeFormat().resolvedOptions().locale;
      if (intlLoc) candidates.push(intlLoc);
    } catch { /* ignore */ }

    for (const raw of candidates) {
      const code = raw.toLowerCase().split(/[-_]/)[0];
      if (code === 'uk') return 'uk';
    }
  } catch { /* ignore */ }
  return 'en';
}

export function App() {
  const [savedLang, setSavedLang] = useState<Language>(() => {
    // Priority: explicit user choice → device locale → 'en' fallback.
    // Auto-detect runs first; the combined FirstRunSetupScreen below
    // lets the player override both language and graphics-tier choice.
    const stored = localStorage.getItem('nebulife_lang') as Language | null;
    const lang: Language = stored === 'uk' || stored === 'en' ? stored : detectDeviceLanguage();
    if (!stored) localStorage.setItem('nebulife_lang', lang);
    void i18n.changeLanguage(lang);
    return lang;
  });

  // GA4 — fire 'game_loaded' once when the App component mounts on web.
  // Lets us tell apart landing visits ('/' page_view) from real player
  // sessions ('/play' or ?play=1 → game_loaded). Skipped on native:
  // window.gtag is not injected there (see main.tsx).
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gtag = (window as any).gtag;
    if (typeof gtag === 'function') {
      gtag('event', 'game_loaded', {
        route: window.location.pathname,
      });
    }
  }, []);

  // First-launch combined picker (language + graphics tier). Gate is a
  // single localStorage flag — once set, the screen never appears again
  // until either the player opens Settings → Reset or localStorage gets
  // cleared. Existing users upgrading from a previous build (no flag
  // set yet) WILL see the picker once — considered acceptable because
  // the auto-detect was unreliable on midrange phones anyway.
  const [needsFirstRunSetup, setNeedsFirstRunSetup] = useState<boolean>(() => {
    try { return localStorage.getItem('nebulife_perf_tier_chosen') !== '1'; }
    catch { return false; }
  });

  const handleLanguageChange = useCallback((lang: Language) => {
    localStorage.setItem('nebulife_lang', lang);
    void i18n.changeLanguage(lang);
  }, []);

  const handleFirstRunSubmit = useCallback((lang: Language, tier: PerfTierChoice) => {
    // Persist both choices.
    localStorage.setItem('nebulife_lang', lang);
    localStorage.setItem('nebulife_lang_chosen', '1');
    setPerfTierChoice(tier);
    localStorage.setItem('nebulife_perf_tier_chosen', '1');
    // Full reload so device-tier.ts cache, <html data-perf-tier> and
    // the injected kill-switch CSS all pick up the new tier. Without
    // this the scene below would be half-configured from the old tier.
    window.location.reload();
  }, []);

  // Desktop web → auto-detect is always correct (`ultra`). Skip the
  // picker entirely; no override needed. Dev-only `?force_picker=1`
  // query-string escape hatch lets us preview the screen in a browser.
  const forcePicker = typeof window !== 'undefined'
    && /[?&]force_picker=1\b/.test(window.location.search);
  const skipPicker = !forcePicker && typeof window !== 'undefined'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    && !((window as any).Capacitor?.isNativePlatform?.());

  if (needsFirstRunSetup && !skipPicker) {
    // Picker always pre-selects English, even on a Ukrainian device —
    // per business decision EN is the primary market. One tap on the
    // UK pill is enough for Ukrainian players to override.
    return (
      <PerfTierSelectScreen
        initialLang="en"
        onSubmit={handleFirstRunSubmit}
      />
    );
  }

  // Reference setSavedLang so TS doesn't complain about the setter being
  // unused — kept around for future "reopen picker from Settings" flow.
  void setSavedLang;
  void needsFirstRunSetup;
  void setNeedsFirstRunSetup;

  return (
    <LanguageProvider initial={savedLang} onLanguageChange={handleLanguageChange}>
      <AppInner />
    </LanguageProvider>
  );
}
