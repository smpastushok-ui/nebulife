import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { playSfx, playLoop, stopLoop } from './audio/SfxPlayer.js';
import i18n, { LanguageProvider, useT } from './i18n/index.js';
import type { Language } from '@nebulife/core';
import { LanguageSelectScreen } from './ui/components/LanguageSelectScreen.js';
import { GameEngine } from './game/GameEngine.js';
import { UniverseEngine } from './game/UniverseEngine.js';
import { WarpTransition } from './ui/components/WarpTransition.js';
import { CommandBar } from './ui/components/CommandBar/index.js';
import type { NavigationMenuItem, ToolItem, ToolGroup, ExtendedScene } from './ui/components/CommandBar/index.js';
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
import { getCatalogEntry, getCatalogName } from '@nebulife/core';
import { initIAP } from './api/iap-service.js';
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
  hasResearchData,
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
  formatGameTime,
  gameSecondsElapsed,
  BASE_TIME_MULTIPLIER,
  GAME_TOTAL_SECONDS,
  levelFromXP,
  XP_REWARDS,
  RING_XP_REWARD,
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
} from '@nebulife/core';
import type { TechTreeState, TechNode, SurfaceObjectType, BuildingType, PlanetColonyState, PlacedBuilding } from '@nebulife/core';
import { SystemResearchOverlay } from './ui/components/SystemResearchOverlay.js';
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
import { getPlayer, createPlayer, getDiscoveries, saveDiscoveryToServer, updatePlayer, updateFcmToken, fetchUniverseInfo } from './api/player-api.js';
import type { DiscoveryData } from './api/player-api.js';
import { requestPushPermission, startForegroundListener } from './notifications/push-service.js';
import { onAuthChange, signOut } from './auth/auth-service.js';
import { authFetch } from './auth/api-client.js';
import { isFirebaseConfigured } from './auth/firebase-config.js';
import { AuthScreen } from './ui/components/AuthScreen.js';
import { CallsignModal } from './ui/components/CallsignModal.js';
import { LinkAccountModal } from './ui/components/LinkAccountModal.js';
import { CinematicIntro } from './ui/components/CinematicIntro.js';
import { ChatWidget } from './ui/components/ChatWidget.js';
import type { SystemNotif } from './ui/components/ChatWidget.js';
import { DigestModal } from './ui/components/DigestModal.js';
import { CosmicArchive } from './ui/components/CosmicArchive/CosmicArchive.js';
import { AcademyDashboard } from './ui/components/Academy/AcademyDashboard.js';
import { SpaceArena } from './ui/components/SpaceArena/SpaceArena.js';
import { HangarPage } from './ui/components/Hangar/HangarPage.js';
import { SpaceAmbient } from './audio/SpaceAmbient.js';
import type { SharedLessonInfo } from './ui/components/Academy/AcademyDashboard.js';
import { PlayerPage } from './ui/components/PlayerPage.js';
import type { CosmicArchiveHandle } from './ui/components/CosmicArchive/CosmicArchive.js';
import type { LogEntry, LogCategory } from './ui/components/CosmicArchive/SystemLog.js';
import { TutorialOverlay, FreeTaskHUD, TUTORIAL_STEPS } from './ui/components/Tutorial/index.js';
import type { User } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { initAds, canShowAd, isNativePlatform } from './services/ads-service.js';
import { interstitialManager } from './services/interstitial-manager.js';
import {
  generateSystemPhoto, pollSystemPhotoStatus,
  generateSystemMission, pollMissionStatus,
  getPlayerSystemPhotos as fetchPlayerSystemPhotos,
} from './api/system-photo-api.js';

export type SceneType = 'universe' | 'cluster' | 'galaxy' | 'system' | 'home-intro' | 'planet-view';

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
  // Metadata
  synced_at: number;
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
    const savedScene = localStorage.getItem('nebulife_scene') as GameState['scene'] | null;
    const validScenes: GameState['scene'][] = ['home-intro', 'galaxy', 'system', 'planet-view'];
    return {
      scene: savedScene && validScenes.includes(savedScene) ? savedScene : 'home-intro',
      selectedSystem: null,
      selectedPlanet: null,
      planetClickPos: null,
      showPlanetMenu: false,
      showPlanetInfo: false,
      playerName: 'Explorer',
      error: null,
    };
  });

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

  // ── Research Data (scan currency) ──────────────────────────────────────
  const [researchData, setResearchData] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nebulife_research_data');
      if (saved !== null) {
        const n = parseFloat(saved);
        if (Number.isFinite(n)) return n;
      }
    } catch { /* ignore */ }
    return INITIAL_RESEARCH_DATA;
  });

  useEffect(() => {
    try { localStorage.setItem('nebulife_research_data', String(researchData)); }
    catch { /* ignore */ }
  }, [researchData]);

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

  useEffect(() => {
    try {
      if (colonyState) localStorage.setItem('nebulife_colony_state', JSON.stringify(colonyState));
    } catch { /* ignore */ }
  }, [colonyState]);

  // ── Colony Resources (Phase 2+, after colonization) ───────────────────
  const [colonyResources, setColonyResources] = useState<{ minerals: number; volatiles: number; isotopes: number; water: number }>(() => {
    try {
      const saved = localStorage.getItem('nebulife_colony_resources');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Backward compat: old saves without water field default to 0
        return { water: 0, ...parsed };
      }
    } catch { /* ignore */ }
    return { minerals: 0, volatiles: 0, isotopes: 150, water: 0 };
  });

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

  const [playerXP, setPlayerXP] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nebulife_player_xp');
      if (saved !== null) { const n = parseInt(saved, 10); if (n >= 0) return n; }
    } catch { /* ignore */ }
    return 0;
  });

  const [levelUpNotification, setLevelUpNotification] = useState<number | null>(null);
  // Queue of pending level-up levels (shown one at a time, no overlap with major modals)
  const [levelUpQueue, setLevelUpQueue] = useState<number[]>([]);
  const gameStateRef = useRef<Record<string, unknown>>({});
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncGameStateRef = useRef<() => void>(() => {});
  /** True after server game state has been hydrated — prevents premature local fallbacks */
  const [serverHydrated, setServerHydrated] = useState(false);
  /** Ref mirror for surfaceTarget — used in intervals with empty deps to pause during surface view */
  const surfaceTargetRef = useRef<{ planet: Planet; star: Star } | null>(null);
  /** Retains last known planet context so colony tick can run passively even when surface is closed */
  const colonyPlanetRef = useRef<{ planet: Planet; star: Star } | null>(null);
  const awardXPRef = useRef<(amount: number, reason: string) => void>(() => {});
  /** Stable reference to awardXP that can be used in callbacks defined before the actual implementation. */
  const awardXP = useCallback((amount: number, reason: string) => {
    awardXPRef.current(amount, reason);
  }, []);

  /** Handle surface resource harvest → update colonyResources + award XP. */
  const handleHarvest = useCallback((objectType: SurfaceObjectType) => {
    const yield_ = HARVEST_YIELD[objectType];
    const amount = yield_.base;
    const key = yield_.group === 'mineral' ? 'minerals' as const
              : yield_.group === 'volatile' ? 'volatiles' as const
              : yield_.group === 'water' ? 'water' as const
              : 'isotopes' as const;
    setColonyResources((prev) => ({ ...prev, [key]: prev[key] + amount }));
    const xpKey = objectType === 'tree' ? 'HARVEST_TREE'
                : objectType === 'ore' ? 'HARVEST_ORE'
                : 'HARVEST_VENT'; // water uses same XP as vent
    awardXP(XP_REWARDS[xpKey], `harvest_${objectType}`);
  }, [awardXP]);

  /** Handle fly-to-HUD animation for harvested resource. */
  const handleHarvestFx = useCallback((type: SurfaceObjectType, sx: number, sy: number) => {
    const id = Math.random().toString(36).slice(2);
    setHarvestFxQueue((q) => [...q, { id, type, sx, sy }]);
    setTimeout(() => setHarvestFxQueue((q) => q.filter((x) => x.id !== id)), 900);
  }, []);

  /** Schedule a debounced game state sync to server (5s delay). */
  const scheduleSyncToServer = useCallback(() => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      syncGameStateRef.current();
    }, 5000);
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

  const [countdownText, setCountdownText] = useState('');
  const [countdownUrgent, setCountdownUrgent] = useState(false);

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

  // Game-time tick — update every ~42ms for smooth game-second display
  // Paused during evacuation cutscenes (evacuationPhase !== 'idle')
  useEffect(() => {
    if (!isExodusPhase || clockPhase !== 'visible' || gameStartedAt === null || evacuationPhase !== 'idle') return;
    const startedAt = gameStartedAt; // narrowed to number
    const tick = () => {
      // PERF: Skip countdown when surface is open (saves 24 calls/sec)
      if (surfaceTargetRef.current) return;
      const gameSecs = remainingGameSeconds(
        startedAt, Date.now(), timeMultiplier, accelAt, gameTimeAtAccel,
      );
      const t = formatGameTime(gameSecs);
      setCountdownText(t.text);
      setCountdownUrgent(t.totalGameSeconds < 7200);
    };
    tick();
    // 42ms interval = ~24 ticks per real second, matching game-second frequency
    const id = setInterval(tick, 42);
    return () => clearInterval(id);
  }, [isExodusPhase, clockPhase, gameStartedAt, timeMultiplier, accelAt, gameTimeAtAccel, evacuationPhase]);

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

  /** Discovery choice panel queue (show one at a time) */
  const [discoveryQueue, setDiscoveryQueue] = useState<{
    discovery: Discovery;
    system: StarSystem;
  }[]>([]);

  /** Popup queue gate — true while telemetry/observatory is active; cleared with delay after close */
  const [popupQueueBlocked, setPopupQueueBlocked] = useState(false);
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
   * Blocked when: telemetry/observatory active, completedModal active, or popup queue gated.
   * pendingDiscovery has higher priority than completedModal (anomaly before evacuation blocks
   * research-complete modals until the player acknowledges the discovery).
   */
  const pendingDiscovery = discoveryQueue.length > 0
    && completedModalQueue.length === 0
    && !telemetryTarget
    && !observatoryTarget
    && !popupQueueBlocked
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
    ? completedModalQueue[0] : null;

  /**
   * Dequeue level-up notifications one at a time.
   * Only show when no major modals are blocking (telemetry, observatory, discovery, completedModal).
   */
  useEffect(() => {
    if (levelUpNotification !== null) return; // Already showing one
    if (levelUpQueue.length === 0) return;
    if (telemetryTarget || observatoryTarget || pendingDiscovery || completedModal || popupQueueBlocked) return;
    const [next, ...rest] = levelUpQueue;
    setLevelUpNotification(next);
    setLevelUpQueue(rest);
  }, [levelUpNotification, levelUpQueue, telemetryTarget, observatoryTarget, pendingDiscovery, completedModal, popupQueueBlocked]);

  // Flush pending research toasts one at a time.
  // Wait 3 s after level-up banner disappears, then show first pending toast.
  // Subsequent toasts appear after the current one is dismissed.
  useEffect(() => {
    if (pendingResearchToasts.length === 0) return;
    if (researchToasts.length > 0) return; // current toast still visible — wait
    if (levelUpNotification !== null) return; // level-up banner still visible — wait

    const timer = setTimeout(() => {
      setPendingResearchToasts((pending) => {
        if (pending.length === 0) return pending;
        const [first, ...rest] = pending;
        setResearchToasts((q) => [...q, first]);
        return rest;
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [pendingResearchToasts, researchToasts, levelUpNotification]);

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
      setResearchState((prev) => {
        if (prev.slots.length > 0) return prev;
        return {
          ...prev,
          slots: [{ slotIndex: 0, systemId: null, startedAt: null, sourcePlanetRing: 0 }],
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
      pendingHomeRef.current = null;
    }
  }, [serverHydrated, homeInfo]);

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

  /** Quarks (in-game currency) */
  const [quarks, setQuarks] = useState<number>(0);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState<ResourceType | null>(null);
  const [showGetResearchData, setShowGetResearchData] = useState(false);
  const [showPlayerPage, setShowPlayerPage] = useState(false);
  const [showChaosModal, setShowChaosModal] = useState(false);
  const [showCosmicArchive, setShowCosmicArchive] = useState(false);
  const [showAcademy, setShowAcademy] = useState(false);
  // On refresh: bot arena state is lost (GPU memory), redirect to hangar.
  // For future multiplayer: restore arena session from server instead.
  const wasInBotArena = localStorage.getItem('nebulife_arena_active') === '1';
  if (wasInBotArena) localStorage.removeItem('nebulife_arena_active'); // clear stale flag
  const [showArena, setShowArenaRaw] = useState(false); // never auto-restore bot arena
  const setShowArena = useCallback((val: boolean) => {
    setShowArenaRaw(val);
    if (val) localStorage.setItem('nebulife_arena_active', '1');
    else localStorage.removeItem('nebulife_arena_active');
  }, []);
  const [showHangar, setShowHangarRaw] = useState(() =>
    localStorage.getItem('nebulife_hangar_active') === '1' || wasInBotArena,
  );
  const setShowHangar = useCallback((val: boolean) => {
    setShowHangarRaw(val);
    if (val) localStorage.setItem('nebulife_hangar_active', '1');
    else localStorage.removeItem('nebulife_hangar_active');
  }, []);
  const [arenaTeamMode, setArenaTeamMode] = useState(false);

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
    const shouldPause = !ambientEnabled || !!surfaceTarget || showCosmicArchive || cinematicVideoPlaying || showHangar || needsOnboarding || !!telescopeOverlay;
    const wasPaused = prevAmbientPausedRef.current;
    if (shouldPause && !wasPaused) {
      ambient.pause();
    } else if (!shouldPause && wasPaused) {
      ambient.resume();
    }
    prevAmbientPausedRef.current = shouldPause;
  }, [ambientEnabled, surfaceTarget, showCosmicArchive, cinematicVideoPlaying, showHangar, needsOnboarding, telescopeOverlay]);

  // Retain last planet context so colony tick can run passively when surface is closed.
  useEffect(() => {
    if (surfaceTarget) colonyPlanetRef.current = surfaceTarget;
  }, [surfaceTarget]);

  // Play planet ambient loop while surface view is active.
  useEffect(() => {
    if (surfaceTarget) {
      playLoop('planet-loop', 0.1);
    } else {
      stopLoop('planet-loop');
    }
    return () => stopLoop('planet-loop');
  }, [surfaceTarget]);

  // Terminal ambient loop removed — no background music in Cosmic Archive.

  // Play quantum-focusing loop during telescope overlay init/capture phases (stops when photo arrives).
  useEffect(() => {
    const phase = telescopeOverlay?.phase;
    if (phase === 'init' || phase === 'capture') {
      playLoop('terminal-loop', 0.5);
    } else {
      stopLoop('terminal-loop');
    }
    return () => stopLoop('terminal-loop');
  }, [telescopeOverlay?.phase]);

  // Play before_trailers music during onboarding, before first cinematic video starts.
  useEffect(() => {
    if (needsOnboarding && !cinematicVideoPlaying) {
      playLoop('before-trailers', 0.5);
    } else {
      stopLoop('before-trailers');
    }
    return () => stopLoop('before-trailers');
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
      const tileAt = () => undefined;
      const mutableColony: PlanetColonyState = JSON.parse(JSON.stringify(colony));
      const result = runColonyTicks(mutableColony, planetCtx.planet, techTreeStateRef.current, tileAt, Date.now());
      if (result.researchDataProduced > 0 || result.shutdownIds.length > 0 || Object.keys(result.elementsProduced).length > 0) {
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
        setColonyState(result.colony);
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
  const [arenaStats, setArenaStats] = useState<{
    kills: number;
    asteroidKills: number;
    deaths: number;
    score: number;
    bestScore: number;
    sessions: number;
  } | null>(() => {
    try {
      const raw = localStorage.getItem('nebulife_arena_stats');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  // Refresh arenaStats from localStorage each time the Hangar opens
  // (ensures stats updated after an arena session completes)
  useEffect(() => {
    if (showHangar) {
      try {
        const raw = localStorage.getItem('nebulife_arena_stats');
        setArenaStats(raw ? JSON.parse(raw) : null);
      } catch {
        setArenaStats(null);
      }
    }
  }, [showHangar]);
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
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

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
  const isTutorialActive = tutorialStep >= 0 && tutorialStep <= 12;

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
  const alarmPlayedRef = useRef(false);
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

  // ── Telescope overlay state ───────────────────────────────────────────
  const [telescopeOverlay, setTelescopeOverlay] = useState<{
    phase: 'init' | 'capture' | 'reveal';
    targetName: string;
    targetType: 'system' | 'planet';
    photoUrl: string | null;
    photoKey: string;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── Digest modal state ──────────────────────────────────────────────
  const [digestModalImages, setDigestModalImages] = useState<string[] | null>(null);
  const [digestModalWeekDate, setDigestModalWeekDate] = useState('');
  const [lastDigestSeen, setLastDigestSeen] = useState<string | null>(null);
  const [latestDigestWeekDate, setLatestDigestWeekDate] = useState<string | null>(null);

  // ── Player notification preferences (from DB) ─────────────────────────
  const [playerEmail, setPlayerEmail] = useState<string | null>(null);
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

  /** Logout: sign out from Firebase and reload */
  const handleLogout = useCallback(async () => {
    await signOut();
    window.location.reload();
  }, []);

  /** Delete account: permanently remove all data + Firebase account */
  const handleDeleteAccount = useCallback(async () => {
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
      // Clear all local data
      localStorage.clear();
      await signOut();
      window.location.reload();
    } catch (err) {
      console.error('Delete account error:', err);
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
      'nebulife_hangar_active', 'nebulife_hangar_ship',
      // Language + chat - reset to fresh start
      'nebulife_lang_chosen',
      'nebulife_chat_last_read_global',
      'nebulife_chat_last_read_system',
      'nebulife_last_digest_seen',
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
    setCountdownText('');
    setCountdownUrgent(false);
    timerExpiredHandledRef.current = false;
    // Colony + research + progression state (all auto-persisted)
    setColonyResources({ minerals: 0, volatiles: 0, isotopes: 150, water: 0 });
    setResearchData(INITIAL_RESEARCH_DATA);
    setPlayerXP(0);
    setPlayerLevel(1);
    setResearchState(createResearchState(HOME_OBSERVATORY_COUNT));
    setTechTreeState(createTechTreeState());
    setPlayerStats({ totalCompletedSessions: 0, totalDiscoveries: 0, lastDiscoverySession: 0 });
    setLogEntries([]);
    setFavoritePlanets(new Set());
    setTutorialStep(0);

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
    const gs = player?.game_state as Partial<SyncedGameState> | undefined;
    if (!gs || typeof gs !== 'object') return;

    // Safety net: if player just reset (game_phase === 'onboarding'), force defaults
    // This handles the race condition where beforeunload sync may have re-saved old state
    if (player?.game_phase === 'onboarding') {
      setResearchState(createResearchState(HOME_OBSERVATORY_COUNT));
      setResearchData(INITIAL_RESEARCH_DATA);
      setIsExodusPhase(true);
      try { localStorage.setItem('nebulife_research_state', JSON.stringify(createResearchState(HOME_OBSERVATORY_COUNT))); } catch { /* ignore */ }
      try { localStorage.setItem('nebulife_research_data', String(INITIAL_RESEARCH_DATA)); } catch { /* ignore */ }
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
      return;
    }

    gameStateRef.current = { ...gs };

    // Progression
    if (typeof gs.xp === 'number' && gs.xp >= 0) {
      setPlayerXP(gs.xp);
      setPlayerLevel(typeof gs.level === 'number' && gs.level > 0 ? gs.level : levelFromXP(gs.xp));
      try { localStorage.setItem('nebulife_player_xp', String(gs.xp)); } catch { /* ignore */ }
      try { localStorage.setItem('nebulife_player_level', String(gs.level ?? levelFromXP(gs.xp))); } catch { /* ignore */ }
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
      setPlayerStats(gs.player_stats);
      try { localStorage.setItem('nebulife_player_stats', JSON.stringify(gs.player_stats)); } catch { /* ignore */ }
    }
    if (typeof gs.research_data === 'number') {
      setResearchData(gs.research_data);
      try { localStorage.setItem('nebulife_research_data', String(gs.research_data)); } catch { /* ignore */ }
    }

    // Colony
    if (gs.colony_resources && typeof gs.colony_resources === 'object') {
      // Backward compat: old saves without water field default to 0
      const raw = gs.colony_resources as Record<string, number>;
      const cr = { minerals: raw.minerals ?? 0, volatiles: raw.volatiles ?? 0, isotopes: raw.isotopes ?? 0, water: raw.water ?? 0 };
      setColonyResources(cr);
      try { localStorage.setItem('nebulife_colony_resources', JSON.stringify(cr)); } catch { /* ignore */ }
    }
    if (gs.chemical_inventory && typeof gs.chemical_inventory === 'object') {
      setChemicalInventory(gs.chemical_inventory as Record<string, number>);
      try { localStorage.setItem('nebulife_chemical_inventory', JSON.stringify(gs.chemical_inventory)); } catch { /* ignore */ }
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
        setTechTreeState(tt);
        try { localStorage.setItem('nebulife_tech_tree', JSON.stringify(tt)); } catch { /* ignore */ }
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

    // Navigation (restore scene)
    if (gs.scene && typeof gs.scene === 'string') {
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

    // Player meta (notification prefs, language, digest seen)
    if (player.email !== undefined) setPlayerEmail(player.email ?? null);
    if (typeof player.email_notifications === 'boolean') setEmailNotifications(player.email_notifications);
    if (typeof player.push_notifications === 'boolean') setPushNotifications(player.push_notifications);
    if (player.last_digest_seen !== undefined) setLastDigestSeen(player.last_digest_seen ?? null);
    // Language: localStorage is always the source of truth.
    // Never override from server — player chose their language at first launch.

    setServerHydrated(true);
  }, []);

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
          } else {
            setQuarks(existing.quarks ?? 0);
            if (existing.global_index != null) globalPlayerIndexRef.current = existing.global_index;
            try { localStorage.setItem('nebulife_generation_index', String(existing.science_points ?? 0)); } catch { /* ignore */ }
            hydrateGameStateFromServer(existing);
            setState((prev) => ({ ...prev, playerName: existing.callsign || existing.name || 'Explorer' }));
            // Initialize RevenueCat IAP (no-op on web)
            initIAP(id!).catch(() => { /* non-critical */ });
          }
          // Fetch universe info for group count
          fetchUniverseInfo().then(info => {
            universeGroupCountRef.current = info.groupCount;
            universeEngineRef.current?.updateGroupCount(info.groupCount);
          }).catch(() => { /* use default */ });
        } catch (err) {
          console.warn('[Legacy] Failed to ensure player in DB:', err);
        }
      })();
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthChange(async (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);
      if (user) {
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
              playerId.current = player.id; // Use DB id (may differ from UID for migrated)
              setQuarks(player.quarks ?? 0);
              if (player.global_index != null) globalPlayerIndexRef.current = player.global_index;
              try { localStorage.setItem('nebulife_generation_index', String(player.science_points ?? 0)); } catch { /* ignore */ }
              hydrateGameStateFromServer(player);
              setState((prev) => ({ ...prev, playerName: player.callsign || player.name || 'Explorer' }));
              setNeedsCallsign(!player.callsign);
              // Fetch universe info for group count
              fetchUniverseInfo().then(info => {
                universeGroupCountRef.current = info.groupCount;
                universeEngineRef.current?.updateGroupCount(info.groupCount);
              }).catch(() => { /* use default */ });
              // Check if player needs onboarding
              if (player.game_phase === 'onboarding') {
                setNeedsOnboarding(true);
                setCinematicActive(true);
              }
              // Clear legacy ID after successful migration
              if (legacyId && player.firebase_uid) {
                localStorage.removeItem('nebulife_player_id');
              }
              registered = true;
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
        playerId.current = '';
        setNeedsCallsign(false);
        setIsGuest(false);
      }
    });
    return unsubscribe;
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
      // PERF: Skip research processing when surface is open (saves 2 calls/sec)
      if (surfaceTargetRef.current) return;
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

        for (const slot of current.slots) {
          if (slot.systemId && slot.startedAt) {
            const elapsed = now - slot.startedAt;

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
                    // Determine zone key from system.ringIndex
                    const ri = system.ringIndex ?? 0;
                    const zoneKey =
                      ri <= 1 ? 'ring0-1' :
                      ri === 2 ? 'ring2' :
                      'neighbor';
                    const completionXP = RING_XP_REWARD[zoneKey] ?? XP_REWARDS.RESEARCH_COMPLETE;
                    awardXP(completionXP, 'research_complete');
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
          return current;
        }
        return prev;
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Sync research state to engine when it changes
  useEffect(() => {
    engineRef.current?.setResearchState(researchState);
  }, [researchState]);

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

    // Read generation index from localStorage (set by server on auth sync / reset)
    const genIdx = parseInt(localStorage.getItem('nebulife_generation_index') || '0', 10);
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
    }, genIdx);

    engine.init().then(() => {
      // Sync restored research state before anything else
      engine.setResearchState(researchState);
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

      // Restore saved scene (engine always starts at home-intro).
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
      } else if (savedScene === 'planet-view' && savedSystemId && savedPlanetId) {
        const sys = allSystems.find(s => s.id === savedSystemId);
        const planet = sys?.planets.find(p => p.id === savedPlanetId);
        if (sys && planet) {
          engine.showPlanetViewScene(sys, planet);
          setState(prev => ({ ...prev, scene: 'planet-view', selectedSystem: sys, selectedPlanet: planet }));
        } else {
          engine.showGalaxyScene();
        }
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
      // Transitioning FROM universe (to PixiJS)
      setUniverseVisible(false);
      universeEngineRef.current?.setVisible(false);
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

  const handleEnterSystem = useCallback((system: StarSystem) => {
    engineRef.current?.showSystemScene(system);
    setState((prev) => ({ ...prev, scene: 'system', selectedSystem: system }));
  }, []);

  const handleStartResearch = useCallback((systemId: string) => {
    if (!hasResearchData(Math.floor(researchData))) {
      setShowGetResearchData(true);
      return;
    }
    // Block if no observatories or no free slots
    if (researchState.slots.length === 0) return;
    // Resolve the target system's ring to find the closest observatory slot
    const targetSystem = engineRef.current?.getAllSystems()?.find((s) => s.id === systemId);
    const targetRing = targetSystem?.ringIndex ?? 1;
    // Block ring N if ring N-1 is not fully researched
    if (targetRing > 1) {
      const allSystems = engineRef.current?.getAllSystems() ?? [];
      if (!isRingFullyResearched(researchState, allSystems, targetRing - 1)) return;
    }
    const slotIdx = findBestSlotForSystem(researchState, targetRing);
    if (slotIdx < 0) return;
    setResearchData((prev) => prev - RESEARCH_DATA_COST);
    setResearchState((prev) => {
      const slotIndex = findBestSlotForSystem(prev, targetRing);
      if (slotIndex < 0) return prev;
      const next = startResearch(prev, slotIndex, systemId);
      engineRef.current?.updateSystemResearchVisual(systemId, next);
      return next;
    });

    // Tutorial: track research starts for steps 6 and 8
    if (isTutorialActive) {
      if (tutorialStep === 6) {
        // First research completed — advance to step 7 (HUD info)
        setTutorialStep(7);
        setTutorialSubStep(0);
      } else if (tutorialStep === 8) {
        // Free task — increment counter
        setTutorialFreeCount((prev) => {
          const n = prev + 1;
          if (n >= 2) {
            // Completed free task — advance to step 9 (anomaly)
            setTimeout(() => {
              setTutorialStep(9);
              setTutorialSubStep(0);
            }, 500);
          }
          return n;
        });
      }
    }
  }, [researchData, researchState, isTutorialActive, tutorialStep, t]);

  // --- Tech Tree: research a technology ---
  const handleResearchTech = useCallback((techId: string) => {
    const node = ALL_NODES.find((n) => n.id === techId);
    if (!node) return;
    const status = getTechNodeStatus(node, playerLevel, techTreeState);
    if (status !== 'available') return;

    const newState = researchTech(techTreeState, techId);
    setTechTreeState(newState);
    awardXP(node.xpReward, 'tech_researched');
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
    const extraSlots =
      getEffectValue(newState, 'observatory_count_add', 0) +
      getEffectValue(newState, 'concurrent_research_add', 0);
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

  const handleViewResearchedSystem = useCallback(() => {
    if (!completedModal) return;
    handleEnterSystem(completedModal.system);
    setState((prev) => ({ ...prev, selectedSystem: completedModal.system }));
    setCompletedModalQueue(q => q.slice(1));
  }, [completedModal, handleEnterSystem]);

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
    if (!hasResearchData(Math.floor(researchData))) {
      setShowGetResearchData(true);
      return;
    }
    playSfx('research-system-start', 0.25);
    const sys = state.selectedSystem;
    setShowSystemMenu(false);
    setRadialSystem(null);
    setRadialGetScreenPos(null);
    if (sys) {
      handleStartResearch(sys.id);
      setState(prev => ({ ...prev, selectedSystem: null }));
      engineRef.current?.unfocusSystem();
    }
  }, [state.selectedSystem, handleStartResearch]);

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

  /** Planet telescope photo — close-up shot of a planet via super telescope (25 quarks or ad token) */
  const handlePlanetTelescopePhoto = useCallback((adPhotoToken?: string) => {
    if (!state.selectedPlanet || !state.selectedSystem) return;
    const planet = state.selectedPlanet;
    const sys = state.selectedSystem;
    const sysId = sys.id;
    const photoKey = `planet-${planet.id}`;

    // Check quark balance (skip if funded by ad token)
    if (!adPhotoToken && quarks < 25) {
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

    // Call API with planetId
    generateSystemPhoto(playerId.current, sysId, sys, undefined, undefined, planet.id, adPhotoToken)
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
  }, [state.selectedPlanet, state.selectedSystem, quarks]);

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
      });
    }
  }, [state.selectedSystem, systemPhotos, aliases]);

  // ── Telescope overlay callbacks ───────────────────────────────────────
  const handleTelescopeShare = useCallback(async () => {
    if (!telescopeOverlay?.photoUrl) return;
    const text = `Nebulife Telescope: ${telescopeOverlay.targetName}\nhttps://nebulife.space`;
    try {
      if (navigator.share) {
        // Try sharing with the photo file
        const response = await fetch(telescopeOverlay.photoUrl);
        const blob = await response.blob();
        const file = new File([blob], 'telescope-photo.jpg', { type: blob.type });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title: 'Nebulife', text, files: [file] });
        } else {
          await navigator.share({ title: 'Nebulife', text });
        }
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // User cancelled or share failed — silently ignore
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
        }
      }
    }

    // Move to next step
    const nextStep = tutorialStep + 1;
    setTutorialSubStep(0);

    if (nextStep > 12) {
      // Tutorial complete
      setTutorialStep(13);
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
  }, [isTutorialActive, tutorialStep, tutorialSubStep]);

  const handleTutorialSkip = useCallback(() => {
    setTutorialStep(13);
  }, []);

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
      // Advance tutorial step 11 → 12 (save photo to gallery)
      if (tutorialStep === 11) {
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
  }, [galleryCompare]);

  /** Keep old gallery entry */
  const handleGalleryKeepOld = useCallback(() => {
    setGalleryCompare(null);
  }, []);

  // ── Evacuation handlers ──────────────────────────────────────────────
  const handleStartEvacuation = useCallback(() => {
    if (!evacuationTarget) return;
    playSfx('evac-alarm', 0.25);
    setEvacuationPhase('stage0-launch');
    awardXP(XP_REWARDS.EVACUATION_START, 'evacuation');
    // Immediate sync on critical event
    setTimeout(() => syncGameStateRef.current(), 100);
  }, [evacuationTarget]);

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

    // Save old home planet as destroyed
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
      setTutorialStep(13);
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
  }, [evacuationTarget, homeInfo]);

  // Keep currentSceneRef in sync with state.scene for use in async callbacks
  useEffect(() => { currentSceneRef.current = state.scene; }, [state.scene]);

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

  // ── Digest modal event listener ──
  useEffect(() => {
    const handleOpenDigest = async (_e: Event) => {
      try {
        const res = await fetch('/api/digest/latest', {
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
    if (!('serviceWorker' in navigator)) return;
    const handleSwMessage = (e: MessageEvent) => {
      if (e.data?.type === 'open-digest') {
        window.dispatchEvent(new CustomEvent('nebulife:open-digest', {
          detail: { weekDate: e.data.weekDate },
        }));
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    // Start foreground FCM message listener
    const unsubForeground = startForegroundListener();
    window.addEventListener('nebulife:push-digest', () => {
      window.dispatchEvent(new CustomEvent('nebulife:open-digest'));
    });
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      unsubForeground?.();
    };
  }, []);

  // ── Fetch latest digest (for new-digest indicator) ────────────────────
  useEffect(() => {
    const token = localStorage.getItem('nebulife_firebase_token') ?? '';
    fetch('/api/digest/latest', { headers: { Authorization: `Bearer ${token}` } })
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
          // Show a toast for every newly researched tech (queued, one at a time via ResearchToast)
          setPendingResearchToasts((q) => [
            ...q,
            ...newlyResearched.map(nd => ({
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
      research_data: researchData,
      colony_resources: colonyResources,
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
      const token = await requestPushPermission();
      if (!token) return; // Permission denied
      await updateFcmToken(pid, token);
      setPushNotifications(true);
      updatePlayer(pid, { push_notifications: true }).catch(() => {});
    } else {
      setPushNotifications(false);
      updatePlayer(pid, { push_notifications: false }).catch(() => {});
      await updateFcmToken(pid, null);
    }
  }, []);

  /** Sync full game state to server (fire-and-forget). */
  syncGameStateRef.current = () => {
    const pid = playerId.current;
    if (!pid) return;
    const snapshot = buildGameStateSnapshot();
    gameStateRef.current = snapshot as unknown as Record<string, unknown>;
    updatePlayer(pid, { game_state: snapshot as unknown as Record<string, unknown> }).catch(() => {});
  };

  // Debounced sync on critical state changes
  useEffect(() => {
    // Skip initial mount — only sync on actual changes
    const pid = playerId.current;
    if (!pid) return;
    scheduleSyncToServer();
  }, [playerXP, playerLevel, researchState, isExodusPhase, colonyResources, playerStats, researchData, techTreeState, logEntries, favoritePlanets, tutorialStep, state.scene, gameStartedAt, timeMultiplier, accelAt, gameTimeAtAccel, forcedEvacuation]);

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
        getPlayer(pid).then((player) => {
          if (player) hydrateGameStateFromServer(player);
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

  // ── Initialize AdMob on native platforms ────────────────────────────────
  useEffect(() => {
    interstitialManager.sessionStartTime = Date.now();
    initAds().catch(() => { /* AdMob init failed — non-critical */ });
  }, []);

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
          // At root — minimize app instead of exiting
          CapApp.minimizeApp();
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
      if (check.chaos) setShowChaosModal(true);
      return;
    }
    playSfx('go-to-exosphera', 0.5);
    setSurfaceTarget({
      planet: state.selectedPlanet,
      star: state.selectedSystem.star,
    });
  }, [state.selectedPlanet, state.selectedSystem, canLandOnPlanet]);

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
  const navigableSystems: StarSystem[] =
    state.scene === 'system' && engineRef.current
      ? engineRef.current.getAllSystems()
      : [];

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
  // Hide left SceneControlsPanel when any overlay/modal blocks the view
  // Hide left SceneControlsPanel only during arena (full-screen takeover)
  const hideLeftPanel = !!(showArena || showHangar);

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
      // Planet actions available via PlanetContextMenu popup
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

  // Home button on non-home scenes (also hide when viewing home planet in planet-view)
  if (state.scene !== 'home-intro'
      && !(state.scene === 'planet-view' && state.selectedPlanet?.isHomePlanet)
      && !(surfaceTarget && surfaceTarget.planet.isHomePlanet)) {
    toolGroups.push({
      type: 'buttons',
      items: [{
        id: 'go-home',
        label: '',
        icon: React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: '1.2', strokeLinecap: 'round', strokeLinejoin: 'round' },
          // Planet circle
          React.createElement('circle', { cx: '8', cy: '8', r: '7' }),
          // House roof inside planet
          React.createElement('path', { d: 'M5 9L8 6L11 9' }),
          // House body
          React.createElement('path', { d: 'M6 9V11.5H10V9' }),
        ),
        tooltip: t('cmd.home_tooltip'),
        onClick: handleGoToHomePlanet,
      }],
    });
  }

  // Global: Terminal button on all scenes
  toolGroups.push({
    type: 'buttons',
    items: [{
      id: 'command-center',
      label: t('cmd.terminal'),
      variant: 'terminal' as const,
      tooltip: t('cmd.control_center'),
      tutorialId: 'terminal-btn',
      onClick: () => setShowCosmicArchive(true),
    }],
  });

  // Academy button — visible only after colonization
  if (evacuationPhase === 'surface') {
    toolGroups.push({
      type: 'buttons',
      items: [{
        id: 'academy',
        label: t('cmd.academy'),
        variant: 'terminal' as const,
        tooltip: t('cmd.academy_tooltip'),
        onClick: () => setShowAcademy(true),
      }],
    });
  }

  // Arena button — golden spaceship icon, unlocks at level 50
  // Opens the Hangar intermediate page (not Arena directly)
  const ARENA_MIN_LEVEL = 50;
  // TODO: re-enable level gate: const arenaUnlocked = playerLevel >= ARENA_MIN_LEVEL;
  const arenaUnlocked = true; // temporarily open for testing
  toolGroups.push({
    type: 'buttons',
    items: [{
      id: 'arena',
      label: '',
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
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={arenaUnlocked ? '#ddaa44' : '#665533'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: arenaUnlocked ? 1 : 0.5 }}>
          <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8Z" />
          <path d="M12 6V14" />
          <path d="M8 10L12 8L16 10" />
        </svg>
      ),
    }],
  });



  if (state.error) {
    return (
      <div style={{ color: '#ff4444', padding: 20, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
        <h2>Error</h2>
        <p>{state.error}</p>
      </div>
    );
  }

  return (
    <>
      <style>{`@keyframes nebu-planet-spin { to { transform: rotate(360deg); } }`}</style>
      <div ref={universeCanvasRef} id="universe-canvas" style={{ position: 'fixed', inset: 0, zIndex: 1, display: universeVisible ? 'block' : 'none' }} />
      <div ref={canvasRef} id="game-canvas" style={{ display: universeVisible ? 'none' : undefined }} />

      {/* Resource HUD — top center (hidden in arena) */}
      {!showArena && !showHangar && (<ResourceDisplay
        researchData={Math.floor(researchData)}
        quarks={quarks}
        isExodusPhase={isExodusPhase}
        minerals={colonyResources.minerals}
        volatiles={colonyResources.volatiles}
        isotopes={colonyResources.isotopes}
        water={colonyResources.water}
        onClick={() => { if (isGuest) setShowLinkModal(true); else setShowTopUpModal(true); }}
        onObservatoriesClick={() => setShowResourceModal('observatories')}
        onResearchDataClick={() => setShowResourceModal('research_data')}
        onMineralsClick={() => setShowResourceModal('minerals')}
        onVolatilesClick={() => setShowResourceModal('volatiles')}
        onIsotopesClick={() => setShowResourceModal('isotopes')}
        onWaterClick={() => setShowResourceModal('water')}
        onQuarksClick={() => { if (isGuest) setShowLinkModal(true); else setShowTopUpModal(true); }}
        countdownText={isExodusPhase && clockPhase === 'visible' && countdownText && evacuationPhase === 'idle' ? countdownText : undefined}
        countdownUrgent={countdownUrgent}
        onTimerClick={evacuationTarget && evacuationPhase === 'idle' && evacuationPromptDismissed ? () => setEvacuationPromptDismissed(false) : undefined}
        observatoryUsed={researchState.slots.filter(s => s.systemId !== null).length}
        observatoryTotal={researchState.slots.length}
        highlightResearchData={showGetResearchData || researchData === 0}
      />
      )}

      {/* Doomsday Clock — above command bar (Exodus phase only) */}
      {/* Phase 1: "СИНХРОНIЗАЦIЯ СИСТЕМ ЖИТТЄЗАБЕЗПЕЧЕННЯ..." */}
      {isExodusPhase && clockPhase === 'syncing' && (
        <div
          style={{
            position: 'fixed',
            bottom: 56,
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
            whiteSpace: 'nowrap',
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
            bottom: 56,
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
          bottom: 90,
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
      {showSpeedUpTwist && (
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
            {/* Video placeholder */}
            <div
              style={{
                width: '100%',
                aspectRatio: '16/9',
                border: '1px dashed rgba(204,68,68,0.3)',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#667788',
                fontSize: 11,
                marginBottom: 20,
                background: 'rgba(5,10,20,0.5)',
              }}
            >
              {t('event.urgent_broadcast')}
            </div>
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
      {!cinematicActive && !showArena && !showHangar && (
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
      <LevelUpBanner
        level={levelUpNotification}
        onDone={() => setLevelUpNotification(null)}
      />

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

      {/* Left-side scene controls — galaxy */}
      {state.scene === 'galaxy' && (
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

      {/* Left-side scene controls — system */}
      {state.scene === 'system' && (
        <SceneControlsPanel
          onBack={handleBackToGalaxy}
          onCenter={() => engineRef.current?.systemCenterOnOrigin()}
          onZoomIn={() => engineRef.current?.systemZoomIn()}
          onZoomOut={() => engineRef.current?.systemZoomOut()}
          backLabel={t('nav.galaxy')}
          showCenter
          showZoom
          hidden={hideLeftPanel}
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
          extraButtons={[{
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
          }]}
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
          canResearch={hasResearchData(Math.floor(researchData)) && findFreeSlot(researchState) >= 0}
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
          researchProgress={(() => {
            const prog = getResearchProgress(researchState, radialSystem.id);
            return (prog > 0 && prog < 100) ? prog : undefined;
          })()}
          researchBlockReason={(() => {
            if (researchState.slots.length === 0) return t('errors.noObservatories');
            if (findFreeSlot(researchState) < 0) return t('errors.allSlotsOccupied');
            if (radialSystem.ringIndex > 1) {
              const allSys = engineRef.current?.getAllSystems() ?? [];
              if (!isRingFullyResearched(researchState, allSys, radialSystem.ringIndex - 1))
                return t('research.panel_ring_locked').replace('{ring}', String(radialSystem.ringIndex - 1));
            }
            return null;
          })()}
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

      {/* Hover star research % — floating label above hovered star (no radial menu open) */}
      {hoveredStarInfo && hoverLabelPos && !radialSystem && state.scene === 'galaxy' && (
        <div
          style={{
            position: 'fixed',
            left: hoverLabelPos.x,
            top: hoverLabelPos.y - 28,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: 24,
            fontFamily: 'monospace',
            fontSize: 10,
            color: '#ffdd66',
            textShadow: '0 0 8px rgba(255,210,60,0.5)',
            letterSpacing: '0.06em',
          }}
        >
          {displayedProgress}%
        </div>
      )}

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
      {state.showPlanetMenu && state.selectedPlanet && state.planetClickPos && state.scene === 'system' && isCurrentSystemFullyAccessible && (
        <PlanetContextMenu
          planet={state.selectedPlanet}
          star={state.selectedSystem!.star}
          screenPosition={state.planetClickPos}
          quarks={quarks}
          playerLevel={playerLevel}
          onViewPlanet={handleViewPlanet}
          onShowCharacteristics={handleShowCharacteristics}
          onClose={handleClosePlanetMenu}
          onSurface={isExodusPhase || canLandOnPlanet(state.selectedPlanet).hidden ? undefined : handleOpenSurface}
          isDestroyed={destroyedPlanetIdsSet.has(state.selectedPlanet.id)}
          surfaceDisabledReason={canLandOnPlanet(state.selectedPlanet).reason}
          onTelescopePhoto={() => handlePlanetTelescopePhoto()}
          onAdTelescopePhoto={(photoToken) => handlePlanetTelescopePhoto(photoToken)}
          isPhotoGenerating={systemPhotos.get(`planet-${state.selectedPlanet.id}`)?.status === 'generating'}
          planetHasPhoto={systemPhotos.get(`planet-${state.selectedPlanet.id}`)?.status === 'succeed'}
          onViewPlanetPhoto={() => {
            const photo = systemPhotos.get(`planet-${state.selectedPlanet!.id}`);
            if (photo?.photoUrl) {
              setState(prev => ({ ...prev, showPlanetMenu: false }));
              setTelescopeOverlay({ phase: 'reveal', targetName: state.selectedPlanet!.name, targetType: 'planet', photoUrl: photo.photoUrl, photoKey: `planet-${state.selectedPlanet!.id}` });
            }
          }}
          canShowAds={isNativePlatform() && canShowAd()}
        />
      )}
      {state.showPlanetInfo && state.selectedPlanet && state.scene === 'system' && isCurrentSystemFullyAccessible && (
        <PlanetInfoPanel
          planet={state.selectedPlanet}
          onClose={() => setState((prev) => ({ ...prev, showPlanetInfo: false, selectedPlanet: null }))}
          onSurface={isExodusPhase || canLandOnPlanet(state.selectedPlanet).hidden ? undefined : handleOpenSurface}
          surfaceDisabledReason={canLandOnPlanet(state.selectedPlanet).reason}
        />
      )}
      {completedModal && (
        <ResearchCompleteModal
          system={completedModal.system}
          research={completedModal.research}
          onViewSystem={handleViewResearchedSystem}
          onClose={() => setCompletedModalQueue(q => q.slice(1))}
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
      {/* Observatory view (AI Kling — paid with quarks or ad token) */}
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
      {galleryCompare && (
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
      {/* Stage 4: Ship on orbit — colony founding prompt */}
      {evacuationPhase === 'stage4-orbit' && evacuationTarget && (
        <ColonyFoundingPrompt
          planet={evacuationTarget.planet}
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
      {/* PlanetGlobeView — WebGL shader planet (home-intro & planet-view) */}
      {(state.scene === 'home-intro' || state.scene === 'planet-view') && homeInfo && (
        <PlanetGlobeView
          ref={globeRef}
          planet={state.scene === 'planet-view' && state.selectedPlanet ? state.selectedPlanet : homeInfo.planet}
          star={state.scene === 'planet-view' && state.selectedSystem ? state.selectedSystem.star : homeInfo.system.star}
          system={state.scene === 'planet-view' && state.selectedSystem ? state.selectedSystem : homeInfo.system}
          mode={state.scene === 'home-intro' ? 'home' : 'planet-view'}
          onDoubleClick={handleGlobeDoubleClick}
        />
      )}
      {/* Surface View (biosphere level) */}
      {surfaceTarget && (
        <SurfaceShaderView
          ref={surfaceViewRef}
          planet={surfaceTarget.planet}
          star={surfaceTarget.star}
          playerId={playerId.current}
          onClose={handleCloseSurface}
          onBuildingCountChange={setSurfaceBuildingCount}
          onBuildingPlaced={(type?: BuildingType) => {
            // After evacuation, each colony_hub or observatory adds 1 research slot
            if (!isExodusPhase && (type === 'colony_hub' || type === 'observatory')) {
              setResearchState((prev) => {
                const newSlot = { slotIndex: prev.slots.length, systemId: null, startedAt: null, sourcePlanetRing: 0 };
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
            setColonyResources((prev) => ({
              ...prev,
              isotopes: Math.max(0, prev.isotopes - amount),
            }));
          }}
          onResourceDeducted={(delta) => {
            setColonyResources((prev) => ({
              minerals:  Math.max(0, prev.minerals  + (delta.minerals ?? 0)),
              volatiles: Math.max(0, prev.volatiles + (delta.volatiles ?? 0)),
              isotopes:  Math.max(0, prev.isotopes  + (delta.isotopes ?? 0)),
              water:     Math.max(0, prev.water     + (delta.water ?? 0)),
            }));
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
        />
      )}
      {/* ── Surface resource HUD ──────────────────────────────────────────── */}
      {surfaceTarget && (
        <ResourceWidget
          minerals={colonyResources.minerals}
          volatiles={colonyResources.volatiles}
          isotopes={colonyResources.isotopes}
          water={colonyResources.water}
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
        }} onClick={() => setShowGetResearchData(false)}>
          <div style={{
            background: 'rgba(10,15,25,0.97)', border: '1px solid #4488aa',
            borderRadius: 6, padding: '24px 28px', maxWidth: 340, width: '90%',
            display: 'flex', flexDirection: 'column', gap: 14,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, color: '#aabbcc', letterSpacing: 2, textTransform: 'uppercase' }}>
                Research Data
              </div>
              <button onClick={() => setShowGetResearchData(false)} style={{
                background: 'transparent', border: 'none', color: '#667788',
                fontFamily: 'monospace', fontSize: 14, cursor: 'pointer',
              }}>X</button>
            </div>
            <div style={{ fontSize: 10, color: '#667788', lineHeight: 1.5 }}>
              {t('research.insufficient_data')}
            </div>
            <div style={{ fontSize: 9, color: '#556677', lineHeight: 1.4, borderTop: '1px solid #223344', paddingTop: 10 }}>
              {lang === 'uk'
                ? 'Дослідницькі дані генеруються будівлями на поверхні (colony hub, дослідна лабораторія, орбітальний телескоп).'
                : 'Research data is generated by surface buildings (colony hub, research lab, orbital telescope).'}
            </div>
            <button
              onClick={() => {
                setResearchData(prev => prev + 10);
                setShowGetResearchData(false);
                playSfx('ui-click', 0.07);
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
              {lang === 'uk' ? 'ПЕРЕГЛЯНУТИ РЕКЛАМУ = +10 DATA' : 'WATCH AD = +10 DATA'}
            </button>
            <div style={{ fontSize: 7, color: '#445566', textAlign: 'center' }}>
              {lang === 'uk' ? '(заглушка — реклама буде пізніше)' : '(stub — ads coming later)'}
            </div>
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
          onGoHome={() => {
            setShowCosmicArchive(false);
            handleGoToHomePlanet();
          }}
          onStartResearch={handleStartResearch}
          canStartResearch={(sysId: string) => {
            const sys = (engineRef.current?.getAllSystems() ?? []).find(s => s.id === sysId);
            if (!sys) return false;
            const maxRingAdd = getEffectValue(techTreeStateRef.current, 'max_ring_add', 0);
            return canStartResearch(researchState, sysId, sys.ringIndex, HOME_RESEARCH_MAX_RING + maxRingAdd);
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
          researchDataCost={RESEARCH_DATA_COST}
          favoritePlanets={favoritePlanets}
          onFavoritesChange={(newFavs) => { setFavoritePlanets(newFavs); scheduleSyncToServer(); }}
          systemPhotos={systemPhotos}
          colonyResources={colonyResources}
        />
      )}

      {/* Academy Dashboard */}
      {showAcademy && (
        <AcademyDashboard
          onClose={() => setShowAcademy(false)}
          onNavigateToGalaxy={() => {
            setShowAcademy(false);
            handleStartExploration();
          }}
          playerName={state.playerName}
          sharedLessonInfo={sharedLessonInfo}
          onAwardXP={awardXP}
        />
      )}

      {/* Hangar — intermediate page between main game and Space Arena */}
      {showHangar && !showArena && (
        <HangarPage
          playerLevel={playerLevel}
          arenaStats={arenaStats}
          onBack={() => setShowHangar(false)}
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
        />
      )}

      {/* Space Arena */}
      {showArena && (
        <SpaceArena
          teamMode={arenaTeamMode}
          onExit={() => {
            setShowArena(false);
            setArenaTeamMode(false);
            // Return to Hangar after arena exit
            setShowHangar(true);
            interstitialManager.tryShow();
          }}
        />
      )}

      {/* Telescope Overlay */}
      {telescopeOverlay && (
        <TelescopeOverlay
          targetName={telescopeOverlay.targetName}
          targetType={telescopeOverlay.targetType}
          phase={telescopeOverlay.phase}
          photoUrl={telescopeOverlay.photoUrl}
          onSaveToCollection={handleTelescopeSaveToCollection}
          onShare={handleTelescopeShare}
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

      {/* Toast notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: 80,
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
          destroyedPlanetIds={(() => {
            try {
              const raw = localStorage.getItem('nebulife_destroyed_planets');
              if (!raw) return undefined;
              const arr = JSON.parse(raw) as Array<{ planetId: string; systemId: string }>;
              const ids = arr.filter(d => d.systemId === objectsPanelSystem.id).map(d => d.planetId);
              return ids.length > 0 ? new Set(ids) : undefined;
            } catch { return undefined; }
          })()}
        />
      )}

      {/* Planet Detail Window */}
      {planetDetailTarget && (
        <PlanetDetailWindow
          system={planetDetailTarget.system}
          systemDisplayName={planetDetailTarget.displayName}
          initialPlanetIndex={planetDetailTarget.planetIndex}
          onClose={() => setPlanetDetailTarget(null)}
          destroyedPlanetIds={(() => {
            try {
              const raw = localStorage.getItem('nebulife_destroyed_planets');
              if (!raw) return undefined;
              const arr = JSON.parse(raw) as Array<{ planetId: string; systemId: string }>;
              const ids = arr.filter(d => d.systemId === planetDetailTarget.system.id).map(d => d.planetId);
              return ids.length > 0 ? new Set(ids) : undefined;
            } catch { return undefined; }
          })()}
        />
      )}

      {/* Tutorial overlay */}
      {isTutorialActive && tutorialStep !== 8 && TUTORIAL_STEPS[tutorialStep] && (
        <TutorialOverlay
          step={TUTORIAL_STEPS[tutorialStep]}
          subStepIndex={tutorialSubStep}
          onAdvance={handleTutorialAdvance}
          onSkip={handleTutorialSkip}
        />
      )}
      {isTutorialActive && tutorialStep === 8 && (
        <FreeTaskHUD current={tutorialFreeCount} total={2} />
      )}

      {/* Chat unread notification dot — visible above chat widget */}
      {chatUnreadCount > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 90,
            right: 18,
            zIndex: 9750,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(10,15,25,0.9)',
            border: '1px solid rgba(68,255,136,0.3)',
            borderRadius: 10,
            padding: '3px 8px',
            fontFamily: 'monospace',
            fontSize: 10,
            color: '#44ff88',
            pointerEvents: 'none',
          }}
        >
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#44ff88',
            display: 'inline-block',
          }} />
          {chatUnreadCount > 1 ? `${chatUnreadCount}` : ''}
        </div>
      )}

      {/* Chat widget (visible when authenticated, not in onboarding/arena/hangar) */}
      {!authLoading && !needsOnboarding && !needsCallsign && !showArena && !showHangar && playerId.current && (
        <ChatWidget
          playerId={playerId.current}
          playerName={state.playerName}
          playerLevel={playerLevel}
          onUnreadChange={setChatUnreadCount}
          systemNotifs={systemNotifs}
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
          lastDigestSeen={lastDigestSeen}
          latestDigestWeekDate={latestDigestWeekDate}
          preferredLanguage={lang}
        />
      )}

      {/* Auth: Loading screen */}
      {authLoading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: '#020510',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'monospace', color: '#556677', fontSize: 12,
        }}>
          {t('common.loading')}
        </div>
      )}

      {/* Auth: Login screen (only when Firebase is configured) */}
      {isFirebaseConfigured && !authLoading && !firebaseUser && (
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
      {isFirebaseConfigured && !authLoading && firebaseUser && needsCallsign && (
        <CallsignModal
          onComplete={(callsign) => {
            setNeedsCallsign(false);
            setState((prev) => ({ ...prev, playerName: callsign }));
          }}
        />
      )}

      {/* Cinematic intro (new players) — only after auth is resolved */}
      {needsOnboarding && !needsCallsign && homeInfo && (!isFirebaseConfigured || !!firebaseUser) && (
        <CinematicIntro
          homeInfo={homeInfo}
          engineRef={engineRef}
          onVideoPlayingChange={setCinematicVideoPlaying}
          onComplete={handleOnboardingComplete}
          onRequestUniverseScene={async () => {
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
            universeEngineRef.current?.setVisible(false);
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
      {showGuestReminder && isGuest && !showLinkModal && !needsCallsign && !needsOnboarding && (
        <GuestRegistrationReminder
          onDismiss={() => setShowGuestReminder(false)}
          onOpenEmailAuth={() => {
            setShowGuestReminder(false);
            setShowLinkModal(true);
          }}
          onLinked={() => {
            setShowGuestReminder(false);
            setIsGuest(false);
          }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Root export — wraps AppInner with LanguageProvider + language selection
// ---------------------------------------------------------------------------

export function App() {
  const [languageSelected, setLanguageSelected] = useState(
    () => localStorage.getItem('nebulife_lang_chosen') === '1',
  );
  const [savedLang] = useState<Language>(() => {
    const lang = (localStorage.getItem('nebulife_lang') as Language) || 'uk';
    // Sync react-i18next to match custom LanguageProvider on every app start.
    // Without this, react-i18next may fall back to browser locale (e.g. English)
    // while the custom provider correctly shows Ukrainian.
    void i18n.changeLanguage(lang);
    return lang;
  });

  const handleLanguageChange = useCallback((lang: Language) => {
    localStorage.setItem('nebulife_lang', lang);
    void i18n.changeLanguage(lang);
  }, []);

  if (!languageSelected) {
    return (
      <LanguageProvider initial="uk">
        <LanguageSelectScreen
          onSelect={(lang) => {
            localStorage.setItem('nebulife_lang', lang);
            localStorage.setItem('nebulife_lang_chosen', '1');
            i18n.changeLanguage(lang);
            setLanguageSelected(true);
          }}
        />
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider initial={savedLang} onLanguageChange={handleLanguageChange}>
      <AppInner />
    </LanguageProvider>
  );
}
