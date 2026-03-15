import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { GameEngine } from './game/GameEngine.js';
import { CommandBar } from './ui/components/CommandBar/index.js';
import type { BreadcrumbItem, ToolItem, ToolGroup, ExtendedScene } from './ui/components/CommandBar/index.js';
import { PlanetInfoPanel } from './ui/components/PlanetInfoPanel.js';
import { PlanetContextMenu } from './ui/components/PlanetContextMenu.js';
import { SystemContextMenu } from './ui/components/SystemContextMenu.js';
import type { SystemPhotoData, SystemMissionData } from './ui/components/SystemContextMenu.js';
import { SystemInfoPanel } from './ui/components/SystemInfoPanel.js';
import { ResearchPanel } from './ui/components/ResearchPanel.js';
import { ResearchCompleteModal } from './ui/components/ResearchCompleteModal.js';
import { DiscoveryChoicePanel } from './ui/components/DiscoveryChoicePanel.js';
import { ObservatoryView } from './ui/components/ObservatoryView.js';
import { TelemetryView } from './ui/components/TelemetryView.js';
import ModelGenerationOverlay from './ui/components/ModelGenerationOverlay.js';
import Planet3DViewer from './ui/components/Planet3DViewer.js';
import QuantumScanTerminal from './ui/components/QuantumScanTerminal.js';
import HolographicTransition from './ui/components/HolographicTransition.js';
import { SurfaceView } from './ui/components/SurfaceView.js';
import type { SurfaceViewHandle, SurfacePhase } from './ui/components/SurfaceView.js';
import { QuarkTopUpModal } from './ui/components/QuarkTopUpModal.js';
import { ScanLineOverlay } from './ui/components/ScanLineOverlay.js';
import { SystemNavHeader } from './ui/components/SystemNavHeader.js';
import { PlanetNavHeader } from './ui/components/PlanetNavHeader.js';
import { FloatingInfoButton } from './ui/components/FloatingInfoButton.js';
import { SystemObjectsPanel } from './ui/components/SystemObjectsPanel.js';
import { PlanetDetailWindow } from './ui/components/PlanetDetailWindow.js';
import { SceneControlsPanel } from './ui/components/SceneControlsPanel.js';
import type {
  Planet, Star, StarSystem, ResearchState, SystemResearchState, Discovery, CatalogEntry,
} from '@nebulife/core';
import { getCatalogEntry } from '@nebulife/core';
import { getPlayerModels, proxyGlbUrl, pollModelUntilComplete } from './api/tripo-api.js';
import { startPaymentFlow } from './api/payment-api.js';
import { getPlayerAliases, setAlias } from './api/alias-api.js';
import type { PlanetModel } from './api/tripo-api.js';
import {
  createResearchState,
  startResearch,
  completeResearchSession,
  findFreeSlot,
  canStartResearch,
  isSystemFullyResearched,
  getResearchProgress,
  hasResearchData,
  findColonizablePlanet,
  HOME_OBSERVATORY_COUNT,
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
  createTechTreeState,
  getTechNodeStatus,
  researchTech,
  getEffectValue,
  hasAvailableTech,
  ASTRONOMY_NODES,
} from '@nebulife/core';
import type { TechTreeState } from '@nebulife/core';
import { SystemResearchOverlay } from './ui/components/SystemResearchOverlay.js';
import { GuestRegistrationReminder } from './ui/components/GuestRegistrationReminder.js';
import { GalleryCompareModal } from './ui/components/GalleryCompareModal.js';
import { ResourceDisplay } from './ui/components/ResourceDisplay.js';
import { CutscenePlaceholder } from './ui/components/CutscenePlaceholder.js';
import { EvacuationPrompt } from './ui/components/EvacuationPrompt.js';
import { ColonyFoundingPrompt } from './ui/components/ColonyFoundingPrompt.js';
import { getPlayer, createPlayer, getDiscoveries, saveDiscoveryToServer, updatePlayer } from './api/player-api.js';
import type { DiscoveryData } from './api/player-api.js';
import { onAuthChange, signOut } from './auth/auth-service.js';
import { authFetch } from './auth/api-client.js';
import { isFirebaseConfigured } from './auth/firebase-config.js';
import { AuthScreen } from './ui/components/AuthScreen.js';
import { CallsignModal } from './ui/components/CallsignModal.js';
import { LinkAccountModal } from './ui/components/LinkAccountModal.js';
import { OnboardingScreen } from './ui/components/OnboardingScreen.js';
import { ChatWidget } from './ui/components/ChatWidget.js';
import type { SystemNotif } from './ui/components/ChatWidget.js';
import { CosmicArchive } from './ui/components/CosmicArchive/CosmicArchive.js';
import { PlayerPage } from './ui/components/PlayerPage.js';
import type { CosmicArchiveHandle } from './ui/components/CosmicArchive/CosmicArchive.js';
import type { LogEntry, LogCategory } from './ui/components/CosmicArchive/SystemLog.js';
import { TutorialOverlay, FreeTaskHUD, TUTORIAL_STEPS } from './ui/components/Tutorial/index.js';
import type { User } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import {
  generateSystemPhoto, pollSystemPhotoStatus,
  generateSystemMission, pollMissionStatus,
  getPlayerSystemPhotos as fetchPlayerSystemPhotos,
} from './api/system-photo-api.js';

export type SceneType = 'galaxy' | 'system' | 'home-intro' | 'planet-view';

/** Full game state synced to server via game_state JSONB */
interface SyncedGameState {
  // Progression
  xp: number;
  level: number;
  // Research
  research_state: unknown;
  player_stats: { totalCompletedSessions: number; totalDiscoveries: number };
  research_data: number;
  // Colony
  colony_resources: { minerals: number; volatiles: number; isotopes: number };
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

export function App() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const telescopePhotoRef = useRef<(sys: StarSystem) => void>(() => {});

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
          return parsed;
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
      localStorage.setItem('nebulife_nav_system', state.selectedSystem?.id ?? '');
      localStorage.setItem('nebulife_nav_planet', state.selectedPlanet?.id ?? '');
    } catch { /* ignore */ }
  }, [state.scene, state.selectedSystem, state.selectedPlanet]);

  // Completed research modal
  const [completedModal, setCompletedModal] = useState<{
    system: StarSystem;
    research: SystemResearchState;
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
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [showGuestReminder, setShowGuestReminder] = useState(false);

  // ── Discovery system state ──────────────────────────────────────────────
  const playerId = useRef<string>('');

  /** Player stats for discovery hook & loyalty mechanics */
  const [playerStats, setPlayerStats] = useState<{ totalCompletedSessions: number; totalDiscoveries: number }>(() => {
    try {
      const saved = localStorage.getItem('nebulife_player_stats');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.totalCompletedSessions === 'number') return parsed;
      }
    } catch { /* ignore */ }
    return { totalCompletedSessions: 0, totalDiscoveries: 0 };
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
      if (saved !== null) return parseInt(saved, 10);
    } catch { /* ignore */ }
    return INITIAL_RESEARCH_DATA;
  });

  useEffect(() => {
    try { localStorage.setItem('nebulife_research_data', String(researchData)); }
    catch { /* ignore */ }
  }, [researchData]);

  // ── Colony Resources (Phase 2+, after colonization) ───────────────────
  const [colonyResources, setColonyResources] = useState<{ minerals: number; volatiles: number; isotopes: number }>(() => {
    try {
      const saved = localStorage.getItem('nebulife_colony_resources');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return { minerals: 0, volatiles: 0, isotopes: 0 };
  });

  useEffect(() => {
    try { localStorage.setItem('nebulife_colony_resources', JSON.stringify(colonyResources)); }
    catch { /* ignore */ }
  }, [colonyResources]);

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
  const gameStateRef = useRef<Record<string, unknown>>({});
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncGameStateRef = useRef<() => void>(() => {});
  const awardXPRef = useRef<(amount: number, reason: string) => void>(() => {});
  /** Stable reference to awardXP that can be used in callbacks defined before the actual implementation. */
  const awardXP = useCallback((amount: number, reason: string) => {
    awardXPRef.current(amount, reason);
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

  // Epic clock reveal: triggered after onboarding completes
  useEffect(() => {
    if (!isExodusPhase || clockPhase !== 'hidden' || needsOnboarding) return;
    // Wait a beat after onboarding closes, then start sync text
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

  // Fallback: ensure gameStartedAt is set for existing players who already completed onboarding
  useEffect(() => {
    if (!isExodusPhase || needsOnboarding || gameStartedAt !== null) return;
    const now = Date.now();
    setGameStartedAt(now);
    try { localStorage.setItem('nebulife_game_started_at', String(now)); } catch { /* ignore */ }
  }, [isExodusPhase, needsOnboarding, gameStartedAt]);

  // Game-time tick — update every ~42ms for smooth game-second display
  useEffect(() => {
    if (!isExodusPhase || clockPhase !== 'visible' || gameStartedAt === null) return;
    const startedAt = gameStartedAt; // narrowed to number
    const tick = () => {
      const gameSecs = remainingGameSeconds(
        startedAt, Date.now(), timeMultiplier, accelAt, gameTimeAtAccel,
      );
      const t = formatGameTime(gameSecs);
      setCountdownText(t.text);
      // Urgent when < 2 game hours remaining (7200 game seconds)
      setCountdownUrgent(t.totalGameSeconds < 7200);
    };
    tick();
    // 42ms interval = ~24 ticks per real second, matching game-second frequency
    const id = setInterval(tick, 42);
    return () => clearInterval(id);
  }, [isExodusPhase, clockPhase, gameStartedAt, timeMultiplier, accelAt, gameTimeAtAccel]);

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
  type EvacuationPhase =
    | 'idle'
    | 'stage0-launch'          // CutscenePlaceholder: ship launch (4s)
    | 'stage1-system-flight'   // SystemScene + ship Bezier flight to planet
    | 'stage2-explosion'       // CutscenePlaceholder: planet destruction (6s)
    | 'stage3-planet-approach' // PlanetViewScene + ship from edge to orbit
    | 'stage4-orbit'           // Ship on orbit + colony founding button
    | 'cutscene-landing'       // CutscenePlaceholder: landing (5s)
    | 'surface';               // Surface view on new planet
  const [evacuationPhase, setEvacuationPhase] = useState<EvacuationPhase>('idle');
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
  const techTreeStateRef = useRef(techTreeState);
  techTreeStateRef.current = techTreeState;

  /** Discovery choice panel (from research completion) */
  const [pendingDiscovery, setPendingDiscovery] = useState<{
    discovery: Discovery;
    system: StarSystem;
  } | null>(null);

  /** Observatory view (when player clicks "Quantum Focus") */
  const [observatoryTarget, setObservatoryTarget] = useState<{
    discovery: Discovery;
    system: StarSystem;
    cost: number;
  } | null>(null);

  /** Telemetry view (when player clicks "Basic Telemetry") */
  const [telemetryTarget, setTelemetryTarget] = useState<{
    discovery: Discovery;
    system: StarSystem;
  } | null>(null);

  /** Gallery: map object_type → existing DiscoveryData (with photo) for duplicate check */
  const [galleryMap, setGalleryMap] = useState<Map<string, DiscoveryData>>(new Map());

  /** Gallery compare modal state (when trying to save to an occupied cell) */
  const [galleryCompare, setGalleryCompare] = useState<{
    newDiscovery: Discovery;
    newImageUrl: string;
    existingData: DiscoveryData;
  } | null>(null);

  // ── 3D Planet Model system state ──────────────────────────────────────────
  /** Cached planet models for this player */
  const [planetModels, setPlanetModels] = useState<PlanetModel[]>([]);
  /** Whether planet models have been loaded from server (to avoid PixiJS flash) */
  const [modelsLoaded, setModelsLoaded] = useState(false);

  /** Active 3D generation overlay */
  const [modelGenerationTarget, setModelGenerationTarget] = useState<{
    planetId: string;
    systemId: string;
    planetName: string;
    starColor?: string;
    existingModelId?: string;
    planet?: Planet;
    star?: Star;
  } | null>(null);

  // ── Home planet info (for navigation from home page) ──────────────
  const [homeInfo, setHomeInfo] = useState<{ system: StarSystem; planet: Planet } | null>(null);

  // Timer expired — force evacuation if no target found yet
  const timerExpiredHandledRef = useRef(false);
  useEffect(() => {
    if (!isExodusPhase || clockPhase !== 'visible' || timerExpiredHandledRef.current || gameStartedAt === null) return;
    const startedAt = gameStartedAt; // narrowed to number
    const checkExpired = () => {
      const gameSecs = remainingGameSeconds(
        startedAt, Date.now(), timeMultiplier, accelAt, gameTimeAtAccel,
      );
      if (gameSecs > 0) return; // Not expired yet
      if (evacuationTargetRef.current) return; // Already have a target
      timerExpiredHandledRef.current = true;

      // Time's up — find ANY habitable planet across all systems
      const engine = engineRef.current;
      if (!engine) return;
      const allSystems = engine.getAllSystems();
      let target: { system: StarSystem; planet: Planet } | null = null;

      // First pass: look for planets with habitability > 30%
      for (const sys of allSystems) {
        const planet = findColonizablePlanet(sys, 0.3);
        if (planet) { target = { system: sys, planet }; break; }
      }
      // Second pass: lower threshold to 10%
      if (!target) {
        for (const sys of allSystems) {
          const planet = findColonizablePlanet(sys, 0.1);
          if (planet) { target = { system: sys, planet }; break; }
        }
      }
      // Last resort: pick ANY planet that isn't the home planet
      if (!target) {
        for (const sys of allSystems) {
          const p = sys.planets.find(pl => pl.id !== homeInfo?.planet?.id);
          if (p) { target = { system: sys, planet: p }; break; }
        }
      }

      if (target) {
        setForcedEvacuation(true);
        setEvacuationTarget(target);
      }
    };
    // Check every second
    const id = setInterval(checkExpired, 1000);
    checkExpired(); // Check immediately
    return () => clearInterval(id);
  }, [isExodusPhase, clockPhase, gameStartedAt, timeMultiplier, accelAt, gameTimeAtAccel, homeInfo]);

  /** Surface view target */
  const [surfaceTarget, setSurfaceTarget] = useState<{
    planet: Planet;
    star: Star;
  } | null>(null);

  /** Quarks (in-game currency) */
  const [quarks, setQuarks] = useState<number>(0);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showPlayerPage, setShowPlayerPage] = useState(false);
  const [showCosmicArchive, setShowCosmicArchive] = useState(false);
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
  const [systemPhotos, setSystemPhotos] = useState<Map<string, SystemPhotoData>>(new Map());
  const [systemMissions, setSystemMissions] = useState<Map<string, SystemMissionData>>(new Map());

  // ── Home 3D generation flow (scanning + materialization) ──────────────
  const [home3DPhase, setHome3DPhase] = useState<
    'idle' | 'paying' | 'scanning' | 'materializing' | 'complete'
  >('idle');
  const [home3DProgress, setHome3DProgress] = useState(0);
  const [home3DGenPhase, setHome3DGenPhase] = useState<'generating_photo' | 'generating_3d'>('generating_photo');

  // ── Planet-view 3D generation flow (scanning + materialization) ────────
  const [planetView3DPhase, setPlanetView3DPhase] = useState<
    'idle' | 'paying' | 'scanning' | 'materializing' | 'complete'
  >('idle');
  const [planetView3DProgress, setPlanetView3DProgress] = useState(0);
  const [planetView3DGenPhase, setPlanetView3DGenPhase] = useState<'generating_photo' | 'generating_3d'>('generating_photo');


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
  const [surfacePhase, setSurfacePhase] = useState<SurfacePhase>('generating');
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

  /** Start over: full server reset, clear localStorage, generate new systems, reload */
  const handleStartOver = useCallback(async () => {
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
      'nebulife_colony_resources', 'nebulife_exodus_phase', 'nebulife_tutorial_step',
      'nebulife_log_entries', 'nebulife_onboarding_done', 'nebulife_scene',
      'nebulife_nav_system', 'nebulife_nav_planet', 'nebulife_destroyed_planets',
      'nebulife_favorites', 'nebulife_game_started_at', 'nebulife_time_multiplier',
      'nebulife_accel_at', 'nebulife_game_time_at_accel', 'nebulife_clock_revealed',
      'nebulife_home_system_id', 'nebulife_home_planet_id', 'nebulife_generation_index',
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));

    // 3. Save new generation_index AFTER clearing — GameEngine will use it on reload
    localStorage.setItem('nebulife_generation_index', String(newGenerationIndex));

    // 4. Reload
    window.location.reload();
  }, []);

  /** Hydrate full game state from server on login (cross-platform sync). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hydrateGameStateFromServer = useCallback((player: any) => {
    const gs = player?.game_state as Partial<SyncedGameState> | undefined;
    if (!gs || typeof gs !== 'object') return;

    gameStateRef.current = { ...gs };

    // Progression
    if (typeof gs.xp === 'number' && gs.xp >= 0) {
      setPlayerXP(gs.xp);
      setPlayerLevel(typeof gs.level === 'number' && gs.level > 0 ? gs.level : levelFromXP(gs.xp));
      try { localStorage.setItem('nebulife_player_xp', String(gs.xp)); } catch { /* ignore */ }
      try { localStorage.setItem('nebulife_player_level', String(gs.level ?? levelFromXP(gs.xp))); } catch { /* ignore */ }
    }

    // Research
    if (gs.research_state && typeof gs.research_state === 'object') {
      const rs = gs.research_state as ResearchState;
      if (Array.isArray(rs.slots) && typeof rs.systems === 'object') {
        setResearchState(rs);
        try { localStorage.setItem('nebulife_research_state', JSON.stringify(rs)); } catch { /* ignore */ }
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
      setColonyResources(gs.colony_resources);
      try { localStorage.setItem('nebulife_colony_resources', JSON.stringify(gs.colony_resources)); } catch { /* ignore */ }
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
    }

    // Navigation (restore scene)
    if (gs.scene && typeof gs.scene === 'string') {
      const validScenes: SceneType[] = ['home-intro', 'galaxy', 'system', 'planet-view'];
      if (validScenes.includes(gs.scene as SceneType)) {
        setState(prev => ({ ...prev, scene: gs.scene as SceneType }));
        try { localStorage.setItem('nebulife_scene', gs.scene); } catch { /* ignore */ }
      }
    }
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
            try { localStorage.setItem('nebulife_generation_index', String(created.science_points ?? 0)); } catch { /* ignore */ }
            hydrateGameStateFromServer(created);
            setState((prev) => ({ ...prev, playerName: created.callsign || created.name || 'Explorer' }));
          } else {
            setQuarks(existing.quarks ?? 0);
            try { localStorage.setItem('nebulife_generation_index', String(existing.science_points ?? 0)); } catch { /* ignore */ }
            hydrateGameStateFromServer(existing);
            setState((prev) => ({ ...prev, playerName: existing.callsign || existing.name || 'Explorer' }));
          }
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
              try { localStorage.setItem('nebulife_generation_index', String(player.science_points ?? 0)); } catch { /* ignore */ }
              hydrateGameStateFromServer(player);
              setState((prev) => ({ ...prev, playerName: player.callsign || player.name || 'Explorer' }));
              setNeedsCallsign(!player.callsign);
              // Check if player needs onboarding
              if (player.game_phase === 'onboarding') {
                setNeedsOnboarding(true);
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

    getPlayerModels(pid).then(models => {
      setPlanetModels(models);
      setModelsLoaded(true);
    }).catch(() => { setModelsLoaded(true); });
    getPlayerAliases(pid).then(setAliases).catch(() => {});
    // Load system photos for initial state
    fetchPlayerSystemPhotos(pid).then(photos => {
      const map = new Map<string, SystemPhotoData>();
      for (const p of photos) {
        map.set(p.system_id, {
          id: p.id,
          photoUrl: p.photo_url ?? '',
          status: p.status as 'generating' | 'succeed' | 'failed',
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
                const result = completeResearchSession(current, slot.slotIndex, system, playerStats.totalCompletedSessions, playerStats.totalDiscoveries);
                current = result.state;
                changed = true;

                // Track player stats
                setPlayerStats((ps) => ({
                  totalCompletedSessions: ps.totalCompletedSessions + 1,
                  totalDiscoveries: ps.totalDiscoveries + (result.discovery ? 1 : 0),
                }));

                // Update galaxy visual
                engine.updateSystemResearchVisual(slot.systemId, current);

                // Show discovery choice panel if one was rolled
                if (result.discovery) {
                  setPendingDiscovery({ discovery: result.discovery, system });
                  // Log the discovery event
                  const discEntry = getCatalogEntry(result.discovery.type) as CatalogEntry | undefined;
                  const discName = discEntry?.nameUk ?? result.discovery.type;
                  addLogEntry('science',
                    `Обсерваторiя зафiксувала сигнал: ${discName} в системi ${system.name}. Очiкує рiшення оператора.`,
                    { systemId: system.id, objectType: result.discovery.type, discoveryRef: result.discovery },
                  );
                  // Award XP for discovery (base + rarity bonus)
                  const rarityBonus = XP_REWARDS.DISCOVERY_RARITY_BONUS[result.discovery.rarity] ?? 0;
                  awardXP(XP_REWARDS.DISCOVERY_BASE + rarityBonus, 'discovery');
                }

                // Show modal if just completed
                if (result.isNowComplete) {
                  const research = current.systems[system.id];
                  if (research) {
                    setCompletedModal({ system, research });
                    awardXP(XP_REWARDS.RESEARCH_COMPLETE, 'research_complete');
                  }
                }

                // Check for colonizable planet at 30%+ — trigger evacuation + speed-up twist
                const newProgress = current.systems[system.id]?.progress ?? 0;
                if (isExodusPhaseRef.current && !evacuationTargetRef.current && !speedUpAppliedRef.current && newProgress >= 30) {
                  const colonizable = findColonizablePlanet(system);
                  if (colonizable) {
                    setEvacuationTarget({ system, planet: colonizable });
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

  useEffect(() => {
    if (!canvasRef.current || engineRef.current) return;

    // Read generation index from localStorage (set by server on auth sync / reset)
    const genIdx = parseInt(localStorage.getItem('nebulife_generation_index') || '0', 10);
    const engine = new GameEngine(canvasRef.current, {
      onSystemSelect: (system, screenPos) => {
        setState((prev) => ({ ...prev, selectedSystem: system, selectedPlanet: null }));
        if (screenPos) {
          setSystemMenuPos(screenPos);
          setShowSystemMenu(true);
        }
      },
      onPlanetSelect: (planet, screenPos) => {
        setState((prev) => ({
          ...prev,
          selectedPlanet: planet,
          planetClickPos: screenPos,
          showPlanetMenu: true,
          showPlanetInfo: false,
        }));
      },
      onSceneChange: (scene) => {
        setState((prev) => ({
          ...prev, scene, selectedPlanet: null,
          showPlanetMenu: false, showPlanetInfo: false, planetClickPos: null,
        }));
        // Reset system menu state on scene change
        setShowSystemMenu(false);
        setSystemMenuPos(null);
      },
      onTelescopeClick: (system) => {
        telescopePhotoRef.current(system);
      },
      onRequestResearch: (system) => {
        // Double-click on non-fully-researched star — show research panel
        setShowSystemMenu(false);
        setSystemMenuPos(null);
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

      // Restore saved scene (engine always starts at home-intro)
      const savedScene = localStorage.getItem('nebulife_scene');
      const savedSystemId = localStorage.getItem('nebulife_nav_system');
      const savedPlanetId = localStorage.getItem('nebulife_nav_planet');

      if (savedScene === 'system' && savedSystemId) {
        const sys = allSystems.find(s => s.id === savedSystemId);
        if (sys) {
          engine.showSystemScene(sys);
          setState(prev => ({ ...prev, selectedSystem: sys }));
        } else {
          engine.showGalaxyScene();
        }
      } else if (savedScene === 'planet-view' && savedSystemId && savedPlanetId) {
        const sys = allSystems.find(s => s.id === savedSystemId);
        const planet = sys?.planets.find(p => p.id === savedPlanetId);
        if (sys && planet) {
          engine.showPlanetViewScene(sys, planet);
          setState(prev => ({ ...prev, selectedSystem: sys, selectedPlanet: planet }));
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
    localStorage.setItem('nebulife_onboarding_done', '1');

    // Start doomsday timer NOW (only if not already started)
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

    // Start tutorial after onboarding
    setTutorialStep(0);
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
    engineRef.current?.showHomePlanetScene(true);
    setState((prev) => ({ ...prev, scene: 'home-intro', selectedSystem: null, selectedPlanet: null }));
    setShowExploreBtn(true);
  };

  const handleEnterSystem = useCallback((system: StarSystem) => {
    engineRef.current?.showSystemScene(system);
    setState((prev) => ({ ...prev, scene: 'system', selectedSystem: system }));
  }, []);

  const handleStartResearch = useCallback((systemId: string) => {
    if (!hasResearchData(researchData)) return;
    setResearchData((prev) => prev - RESEARCH_DATA_COST);
    setResearchState((prev) => {
      const slotIndex = findFreeSlot(prev);
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
  }, [researchData, isTutorialActive, tutorialStep]);

  // --- Tech Tree: research a technology ---
  const handleResearchTech = useCallback((techId: string) => {
    const node = ASTRONOMY_NODES.find((n) => n.id === techId);
    if (!node) return;
    const status = getTechNodeStatus(node, playerLevel, techTreeState);
    if (status !== 'available') return;

    const newState = researchTech(techTreeState, techId);
    setTechTreeState(newState);
    awardXP(node.xpReward, 'tech_researched');
    addLogEntry('system', `Дослiджено технологiю: ${node.name}`);

    // Expand research slots if observatory/concurrent effects changed
    const extraSlots =
      getEffectValue(newState, 'observatory_count_add', 0) +
      getEffectValue(newState, 'concurrent_research_add', 0);
    const totalNeeded = HOME_OBSERVATORY_COUNT + extraSlots;
    setResearchState((prev) => {
      if (prev.slots.length >= totalNeeded) return prev;
      const extended = [...prev.slots];
      while (extended.length < totalNeeded) {
        extended.push({ slotIndex: extended.length, systemId: null, startedAt: null });
      }
      return { ...prev, slots: extended };
    });

    scheduleSyncToServer();
  }, [playerLevel, techTreeState, awardXP, scheduleSyncToServer]);

  const handleViewResearchedSystem = useCallback(() => {
    if (!completedModal) return;
    handleEnterSystem(completedModal.system);
    setState((prev) => ({ ...prev, selectedSystem: completedModal.system }));
    setCompletedModal(null);
  }, [completedModal, handleEnterSystem]);

  const handleViewPlanet = useCallback(() => {
    if (state.selectedPlanet && state.selectedSystem) {
      const engine = engineRef.current;
      engine?.showPlanetViewScene(state.selectedSystem, state.selectedPlanet, true);
      setState((prev) => ({
        ...prev,
        scene: 'planet-view' as const,
        showPlanetMenu: false,
        showPlanetInfo: false,
      }));
    }
  }, [state.selectedPlanet, state.selectedSystem, planetModels]);

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
    setState((prev) => ({ ...prev, selectedSystem: null }));
    engineRef.current?.unfocusSystem();
  }, []);

  const handleSystemMenuEnter = useCallback(() => {
    if (!state.selectedSystem) return;
    setShowSystemMenu(false);
    setSystemMenuPos(null);
    engineRef.current?.unfocusSystem();
    handleEnterSystem(state.selectedSystem);
  }, [state.selectedSystem, handleEnterSystem]);

  const handleSystemMenuCharacteristics = useCallback(() => {
    setShowSystemMenu(false);
    // Will show SystemInfoPanel (existing panel)
  }, []);

  const handleSystemMenuResearch = useCallback(() => {
    setShowSystemMenu(false);
    // Will show ResearchPanel (existing panel)
  }, []);

  const handleSystemMenuRename = useCallback(() => {
    if (!state.selectedSystem) return;
    const newName = prompt('Нова назва системи:', state.selectedSystem.name);
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
    // Close the context menu
    setShowSystemMenu(false);
    setSystemMenuPos(null);
    setState((prev) => ({ ...prev, selectedSystem: null }));
    engineRef.current?.unfocusSystem();
  }, [state.selectedSystem]);

  const handleTelescopePhoto = useCallback(() => {
    if (!state.selectedSystem) return;
    handleTelescopePhotoForSystem(state.selectedSystem);
  }, [state.selectedSystem]);

  /** Telescope photo generation — accepts system directly (for both menu and galaxy icon) */
  const handleTelescopePhotoForSystem = useCallback((sys: StarSystem) => {
    const sysId = sys.id;

    // Check quark balance
    if (quarks < 30) {
      if (isGuest) setShowLinkModal(true); else setShowTopUpModal(true);
      return;
    }

    // Close menu and clear selected system to prevent PixiJS from re-opening it
    setShowSystemMenu(false);
    setSystemMenuPos(null);
    setState((prev) => ({ ...prev, selectedSystem: null }));
    engineRef.current?.unfocusSystem();

    // Mark as generating immediately
    setSystemPhotos(prev => {
      const next = new Map(prev);
      next.set(sysId, { id: `temp-${sysId}`, photoUrl: '', status: 'generating' });
      return next;
    });

    // Call API
    generateSystemPhoto(playerId.current, sysId, sys)
      .then(({ photoId, quarksRemaining }) => {
        setQuarks(quarksRemaining);
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
              next.set(sysId, { id: photoId, photoUrl: result.photoUrl!, status: 'succeed' });
              return next;
            });
          } else if (result.status === 'failed') {
            setSystemPhotos(prev => {
              const next = new Map(prev);
              next.set(sysId, { id: photoId, photoUrl: '', status: 'failed' });
              return next;
            });
          }
        });
      })
      .catch(err => {
        console.error('[TelescopePhoto] Error:', err);
        setSystemPhotos(prev => {
          const next = new Map(prev);
          next.delete(sysId);
          return next;
        });
      });
  }, [quarks]);

  // Keep ref updated for GameEngine callback (avoid stale closure)
  telescopePhotoRef.current = handleTelescopePhotoForSystem;

  const handleViewSystemPhoto = useCallback(() => {
    if (!state.selectedSystem) return;
    const photo = systemPhotos.get(state.selectedSystem.id);
    if (photo?.photoUrl) {
      // Open photo in new tab for now (PhotoModal can be added later)
      window.open(photo.photoUrl, '_blank');
    }
  }, [state.selectedSystem, systemPhotos]);

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
      setPendingDiscovery(null);
      setShowCosmicArchive(false); // Close archive so telemetry is visible
      awardXP(XP_REWARDS.TELEMETRY_SCAN, 'telemetry');
    }
  }, [pendingDiscovery]);

  const handleQuantumFocus = useCallback(() => {
    if (pendingDiscovery) {
      const isFree = playerStats.totalDiscoveries <= 1
        || (playerStats.totalDiscoveries >= 3 && (pendingDiscovery.discovery.timestamp % 50) === 0);
      if (!isFree && quarks < 3) {
        if (isGuest) setShowLinkModal(true); else setShowTopUpModal(true);
        return;
      }
      setObservatoryTarget({ ...pendingDiscovery, cost: isFree ? 0 : 3 });
      setPendingDiscovery(null);
      setShowCosmicArchive(false); // Close archive so observatory view is visible
      awardXP(XP_REWARDS.OBSERVATORY_SCAN, 'observatory');
    }
  }, [pendingDiscovery, playerStats, quarks, isGuest]);

  const handleSkipDiscovery = useCallback(() => {
    setPendingDiscovery(null);
  }, []);

  /** Re-open a discovery from the journal log (find system by id, set pendingDiscovery) */
  const handleOpenDiscoveryFromLog = useCallback((discovery: Discovery) => {
    const allSystems = engineRef.current?.getAllSystems() ?? [];
    const system = allSystems.find((s) => s.id === discovery.systemId);
    if (!system) return;
    setPendingDiscovery({ discovery, system });
  }, []);

  const handleCloseObservatory = useCallback(() => {
    setObservatoryTarget(null);
  }, []);

  const handleCloseTelemetry = useCallback(() => {
    setTelemetryTarget(null);
  }, []);

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
            setPendingDiscovery({ discovery: fakeDiscovery, system: nonHomeSys });
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

    setTutorialStep(nextStep);

    // Execute onActivate for the next step
    const next = TUTORIAL_STEPS[nextStep];
    if (next?.onActivate) {
      for (const action of next.onActivate) {
        if (action === 'open-archive') {
          setShowCosmicArchive(true);
        } else if (action.startsWith('navigate-')) {
          // Format: navigate-{mainTab}-{subTab}
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
      // Clear highlight after animation
      setTimeout(() => setHighlightedGalleryType(null), 3000);
    }
  }, [observatoryTarget, telemetryTarget, galleryMap]);

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
    setEvacuationPhase('stage0-launch');
    awardXP(XP_REWARDS.EVACUATION_START, 'evacuation');
    // Immediate sync on critical event
    setTimeout(() => syncGameStateRef.current(), 100);
  }, [evacuationTarget]);

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
      engineRef.current?.startPlanetViewShipApproach();
    }, 300);
    setEvacuationPhase('stage3-planet-approach');
  }, [evacuationTarget]);

  // Poll ship approach in stage3 — when on orbit, switch to stage4
  useEffect(() => {
    if (evacuationPhase !== 'stage3-planet-approach') return;
    const pollId = setInterval(() => {
      if (engineRef.current?.isPlanetViewShipOnOrbit()) {
        setEvacuationPhase('stage4-orbit');
      }
    }, 100);
    return () => clearInterval(pollId);
  }, [evacuationPhase]);

  // Colony founding
  const handleFoundColony = useCallback(() => {
    engineRef.current?.stopPlanetViewShipFlight();
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

    // Update GameEngine rings: move ownerPlayerId + isHomePlanet to new system/planet
    engineRef.current?.updateHomeSystem(evacuationTarget.system.id, evacuationTarget.planet.id);

    // Update local home info
    setHomeInfo({ system: evacuationTarget.system, planet: evacuationTarget.planet });

    // Transition to colonization
    setIsExodusPhase(false);
    setEvacuationPhase('idle');
    setEvacuationTarget(null);
    setForcedEvacuation(false);

    // Open surface view for the colony planet
    setSurfaceTarget({
      planet: evacuationTarget.planet,
      star: evacuationTarget.system.star,
    });

    // Immediate sync on critical event (colony founded)
    setTimeout(() => syncGameStateRef.current(), 100);
  }, [evacuationTarget, homeInfo]);

  // Keep currentSceneRef in sync with state.scene for use in async callbacks
  useEffect(() => { currentSceneRef.current = state.scene; }, [state.scene]);

  // ── System notification helper ────────────────────────────────────────
  const addSystemNotif = useCallback((planetName: string, systemId: string, planetId: string) => {
    setSystemNotifs((prev) => [
      ...prev,
      {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: `Квантовий синтез ${planetName} завершено`,
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

  // ── Award XP & level-up detection (assign to ref for stable callbacks) ──
  awardXPRef.current = (amount: number, _reason: string) => {
    setPlayerXP((prevXP) => {
      const newXP = prevXP + amount;
      const oldLevel = levelFromXP(prevXP);
      const newLevel = levelFromXP(newXP);

      if (newLevel > oldLevel) {
        setPlayerLevel(newLevel);
        setLevelUpNotification(newLevel);
        setTimeout(() => setLevelUpNotification(null), 4000);
        addLogEntry('system', `Рiвень пiдвищено до ${newLevel}!`);
        // Check for newly available technologies
        if (hasAvailableTech(newLevel, techTreeStateRef.current)) {
          addLogEntry('system', 'Новi технологiї доступнi для дослiдження!');
        }
      }

      // Schedule debounced sync (instead of immediate fire-and-forget per XP award)
      scheduleSyncToServer();

      return newXP;
    });
  };

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
      synced_at: Date.now(),
    };
  };

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
  }, [playerXP, playerLevel, researchState, isExodusPhase, colonyResources, playerStats, researchData, techTreeState]);

  // Sync on page hide / beforeunload (best-effort)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Cancel pending debounce and sync immediately
        if (syncTimeoutRef.current) { clearTimeout(syncTimeoutRef.current); syncTimeoutRef.current = null; }
        syncGameStateRef.current();
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

  // ── 3D Model handlers ─────────────────────────────────────────────────
  const handleModelReady = useCallback((modelId: string, glbUrl: string) => {
    setPlanetModels((prev) => {
      const idx = prev.findIndex((m) => m.id === modelId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], status: 'ready', glb_url: glbUrl };
        return updated;
      }
      return prev;
    });
    getPlayerModels(playerId.current).then(setPlanetModels).catch(() => {});
  }, []);

  const handleCloseModelGeneration = useCallback(() => {
    setModelGenerationTarget(null);
  }, []);

  // ── Surface view handlers ─────────────────────────────────────────────
  const handleOpenSurface = useCallback(() => {
    if (!state.selectedPlanet || !state.selectedSystem) return;
    setSurfaceTarget({
      planet: state.selectedPlanet,
      star: state.selectedSystem.star,
    });
  }, [state.selectedPlanet, state.selectedSystem]);

  const handleCloseSurface = useCallback(() => {
    setSurfaceTarget(null);
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
    if (!homeInfo) return;
    setState(prev => ({
      ...prev,
      selectedSystem: homeInfo.system,
      selectedPlanet: homeInfo.planet,
    }));
    setSurfaceTarget({
      planet: homeInfo.planet,
      star: homeInfo.system.star,
    });
  }, [homeInfo]);

  // ── Home 3D generation handler (Quantum Scanning flow) ──────────────
  const handleHome3DGenerate = useCallback(async () => {
    if (!homeInfo) return;
    setHome3DPhase('paying');

    try {
      const result = await startPaymentFlow({
        playerId: playerId.current,
        planetId: homeInfo.planet.id,
        systemId: homeInfo.system.id,
        planetData: homeInfo.planet,
        starData: homeInfo.system.star,
      });

      if (result.paidWithQuarks) {
        refreshQuarks();
        // Log: economy entry
        addLogEntry('economy',
          `Списано 49 кваркiв. Авторизовано запит на квантовий синтез для об'єкта ${homeInfo.planet.name}.`,
          { planetName: homeInfo.planet.name, systemId: homeInfo.system.id, planetId: homeInfo.planet.id },
        );
      }

      // Activate scanning
      setHome3DPhase('scanning');
      setHome3DGenPhase('generating_photo');
      setHome3DProgress(0);
      engineRef.current?.startHomeScanning();

      // Poll for completion
      const completed = await pollModelUntilComplete(result.modelId, (status) => {
        if (status.status === 'generating_photo') {
          setHome3DGenPhase('generating_photo');
          setHome3DProgress(0);
        } else if (status.status === 'generating_3d' || status.status === 'running') {
          setHome3DGenPhase('generating_3d');
          setHome3DProgress(status.progress ?? 0);
          engineRef.current?.updateScanProgress(status.progress ?? 0);
        }
      });

      // Model ready — stop scanning, start materialization
      engineRef.current?.stopHomeScanning();

      // Update planet models list (triggers backgroundModelInfo)
      handleModelReady(result.modelId, completed.glbUrl);

      // Log: science entry on completion
      addLogEntry('science',
        `Квантовий синтез ${homeInfo.planet.name} успішно завершено. Топографічна 3D-модель інтегрована в базу.`,
        { planetName: homeInfo.planet.name, systemId: homeInfo.system.id, planetId: homeInfo.planet.id },
      );

      // Small delay to let backgroundModelInfo update, then start materialization
      setTimeout(() => {
        setHome3DPhase('materializing');
      }, 100);
    } catch (err) {
      engineRef.current?.stopHomeScanning();
      setHome3DPhase('idle');
      console.error('Home 3D generation error:', err);
    }
  }, [homeInfo, refreshQuarks, handleModelReady, addLogEntry]);

  // ── Planet-view 3D generation handler (Quantum Scanning flow) ─────────
  const handlePlanetView3DGenerate = useCallback(async () => {
    if (!state.selectedPlanet || !state.selectedSystem) return;
    const planet = state.selectedPlanet;
    const system = state.selectedSystem;
    setPlanetView3DPhase('paying');

    try {
      const result = await startPaymentFlow({
        playerId: playerId.current,
        planetId: planet.id,
        systemId: system.id,
        planetData: planet,
        starData: system.star,
      });

      if (result.paidWithQuarks) {
        refreshQuarks();
        // Log: economy entry
        addLogEntry('economy',
          `Списано 49 кваркiв. Авторизовано запит на квантовий синтез для об'єкта ${planet.name}.`,
          { planetName: planet.name, systemId: system.id, planetId: planet.id },
        );
      }

      // Activate scanning
      setPlanetView3DPhase('scanning');
      setPlanetView3DGenPhase('generating_photo');
      setPlanetView3DProgress(0);
      engineRef.current?.startPlanetViewScanning();

      // Poll for completion
      const completed = await pollModelUntilComplete(result.modelId, (status) => {
        if (status.status === 'generating_photo') {
          setPlanetView3DGenPhase('generating_photo');
          setPlanetView3DProgress(0);
        } else if (status.status === 'generating_3d' || status.status === 'running') {
          setPlanetView3DGenPhase('generating_3d');
          setPlanetView3DProgress(status.progress ?? 0);
          engineRef.current?.updatePlanetViewScanProgress(status.progress ?? 0);
        }
      });

      // Model ready — stop scanning
      engineRef.current?.stopPlanetViewScanning();

      // Update planet models list (triggers backgroundModelInfo)
      handleModelReady(result.modelId, completed.glbUrl);

      // Log: science entry on completion
      addLogEntry('science',
        `Квантовий синтез ${planet.name} успішно завершено. Топографічна 3D-модель інтегрована в базу.`,
        { planetName: planet.name, systemId: system.id, planetId: planet.id },
      );

      // Small delay to let backgroundModelInfo update, then start materialization
      // If user navigated away from planet-view, skip animation and go straight to complete
      setTimeout(() => {
        if (currentSceneRef.current === 'planet-view') {
          setPlanetView3DPhase('materializing');
        } else {
          setPlanetView3DPhase('complete');
          addSystemNotif(planet.name, system.id, planet.id);
        }
      }, 100);
    } catch (err) {
      engineRef.current?.stopPlanetViewScanning();
      setPlanetView3DPhase('idle');
      console.error('Planet-view 3D generation error:', err);
    }
  }, [state.selectedPlanet, state.selectedSystem, refreshQuarks, handleModelReady, addSystemNotif, addLogEntry]);

  const handleUpgradePlanet = useCallback(() => {
    if (!state.selectedPlanet || !state.selectedSystem) return;

    // On planet-view scene, use immersive scanning flow instead of overlay
    if (state.scene === 'planet-view') {
      handlePlanetView3DGenerate();
      return;
    }

    const existing = planetModels.find(
      (m) => m.planet_id === state.selectedPlanet!.id && m.system_id === state.selectedSystem!.id,
    );

    setModelGenerationTarget({
      planetId: state.selectedPlanet.id,
      systemId: state.selectedSystem.id,
      planetName: state.selectedPlanet.name,
      // Only resume in-progress models (paid + still generating) — skip failed/ready/awaiting
      existingModelId:
        existing?.payment_status === 'paid' &&
        existing.status !== 'failed' &&
        existing.status !== 'payment_failed' &&
        existing.status !== 'ready'
          ? existing.id
          : undefined,
      planet: state.selectedPlanet,
      star: state.selectedSystem.star,
    });
  }, [state.selectedPlanet, state.selectedSystem, state.scene, planetModels, handlePlanetView3DGenerate]);

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
        handleGoToHomePlanet();
        break;
      case 'galaxy':
        handleBackToGalaxy();
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
  }, [surfaceTarget, state.selectedSystem, state.scene, handleViewPlanet]);

  // Helper: get best model for currently selected planet (prefer ready > generating > failed)
  const selectedPlanetModel = state.selectedPlanet && state.selectedSystem
    ? (() => {
        const matches = planetModels.filter(
          (m) => m.planet_id === state.selectedPlanet!.id && m.system_id === state.selectedSystem!.id,
        );
        return matches.find((m) => m.status === 'ready')
          ?? matches.find((m) => m.status !== 'failed' && m.status !== 'payment_failed')
          ?? matches[0];
      })()
    : undefined;

  // Auto-show 3D model as background on home-intro and planet-view (if model exists)
  const backgroundModelInfo = useMemo(() => {
    let planet: Planet | null = null;
    let system: StarSystem | null = null;

    if (state.scene === 'home-intro' && homeInfo) {
      planet = homeInfo.planet;
      system = homeInfo.system;
    } else if (state.scene === 'planet-view' && state.selectedPlanet && state.selectedSystem) {
      planet = state.selectedPlanet;
      system = state.selectedSystem;
    }

    if (!planet || !system) return null;

    const model = planetModels.find(
      m => m.planet_id === planet!.id && m.system_id === system!.id && m.status === 'ready',
    );
    if (!model) return null;

    const proxied = proxyGlbUrl(model.id, model.glb_url);
    if (!proxied) return null;

    return {
      glbUrl: proxied,
      planetName: planet.name,
      atmosphere: planet.atmosphere ? {
        surfacePressureAtm: planet.atmosphere.surfacePressureAtm,
        composition: planet.atmosphere.composition,
        hasOzone: planet.atmosphere.hasOzone,
      } : null,
      planetType: planet.type,
      planetMassEarth: planet.massEarth,
      moons: planet.moons?.map(m => ({
        compositionType: m.compositionType,
        radiusKm: m.radiusKm,
      })),
    };
  }, [state.scene, state.selectedPlanet, state.selectedSystem, homeInfo, planetModels]);

  // Hide PixiJS procedural planet when 3D model is showing as background.
  // Also hide while models or homeInfo are still loading — prevents the flash where
  // PixiJS planet briefly appears before we know whether a 3D model exists.
  // state.scene in deps re-fires when switching scenes so new PixiJS scene is immediately hidden.
  useEffect(() => {
    const keepPixiVisible =
      home3DPhase === 'scanning' || home3DPhase === 'materializing' ||
      planetView3DPhase === 'scanning' || planetView3DPhase === 'materializing';

    // Not ready yet — keep planet hidden
    if (!modelsLoaded) {
      engineRef.current?.setPlanetVisible(false);
      return;
    }

    // On home-intro, also wait for homeInfo (set after engine init, slightly later)
    if (state.scene === 'home-intro' && !homeInfo) {
      engineRef.current?.setPlanetVisible(false);
      return;
    }

    engineRef.current?.setPlanetVisible(!backgroundModelInfo || keepPixiVisible);
  }, [backgroundModelInfo, home3DPhase, planetView3DPhase, modelsLoaded, state.scene, homeInfo]);

  // Determine which panel to show for the selected system
  // (panels open via context menu actions, not directly from click)
  const selectedSystem = state.selectedSystem;
  const showResearchPanel = selectedSystem
    && state.scene === 'galaxy'
    && !showSystemMenu
    && selectedSystem.ownerPlayerId === null
    && !isSystemFullyResearched(researchState, selectedSystem.id);

  const showSystemInfoPanel = selectedSystem
    && state.scene === 'galaxy'
    && !showSystemMenu
    && (selectedSystem.ownerPlayerId !== null || isSystemFullyResearched(researchState, selectedSystem.id));

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
    // Reset 3D phase when switching planets
    setPlanetView3DPhase('idle');
    setPlanetView3DProgress(0);
  }, [state.selectedSystem]);

  const handlePlanetInfoFromButton = useCallback(() => {
    if (!state.selectedPlanet || !state.selectedSystem) return;
    const idx = sortedPlanets.findIndex((p) => p.id === state.selectedPlanet!.id);
    setPlanetDetailTarget({
      system: state.selectedSystem,
      planetIndex: idx >= 0 ? idx : 0,
    });
  }, [state.selectedPlanet, state.selectedSystem, sortedPlanets]);

  // ── CommandBar data ──────────────────────────────────────────────────
  const effectiveScene: ExtendedScene = surfaceTarget ? 'surface' : state.scene;

  // SVG breadcrumb icons
  const homeIcon = <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M3 8.5V14h4v-4h2v4h4V8.5" /><path d="M1 9l7-7 7 7" /></svg>;
  const galaxyIcon = <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="8" cy="8" r="2" /><ellipse cx="8" cy="8" rx="7" ry="3" /><ellipse cx="8" cy="8" rx="3" ry="7" /></svg>;
  const starIcon = <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="8" cy="8" r="3" /><line x1="8" y1="1" x2="8" y2="4" /><line x1="8" y1="12" x2="8" y2="15" /><line x1="1" y1="8" x2="4" y2="8" /><line x1="12" y1="8" x2="15" y2="8" /></svg>;
  const planetIcon = <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="8" cy="8" r="5" /><ellipse cx="8" cy="8" rx="7" ry="2" transform="rotate(-20 8 8)" /></svg>;
  const surfaceIcon = <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M1 12l3-4 3 2 4-5 4 4" /><line x1="1" y1="14" x2="15" y2="14" /></svg>;

  const breadcrumbs: BreadcrumbItem[] = [
    { id: 'home', label: '', scene: 'home-intro', isActive: effectiveScene === 'home-intro', icon: homeIcon },
  ];

  if (effectiveScene !== 'home-intro') {
    breadcrumbs.push({
      id: 'galaxy', label: '', scene: 'galaxy',
      isActive: effectiveScene === 'galaxy',
      icon: galaxyIcon,
    });
  }

  if (['system', 'planet-view', 'surface'].includes(effectiveScene) && state.selectedSystem) {
    const sysName = aliases[state.selectedSystem.id] || state.selectedSystem.star.name;
    breadcrumbs.push({
      id: 'system', label: sysName, scene: 'system',
      isActive: effectiveScene === 'system',
      icon: starIcon,
    });
  }

  if (['planet-view', 'surface'].includes(effectiveScene) && state.selectedPlanet) {
    const isHomePlanet = state.selectedPlanet.isHomePlanet;
    breadcrumbs.push({
      id: 'planet', label: state.selectedPlanet.name, scene: 'planet-view',
      isActive: effectiveScene === 'planet-view',
      icon: isHomePlanet ? homeIcon : planetIcon,
    });
  }

  if (effectiveScene === 'surface') {
    breadcrumbs.push({
      id: 'surface', label: '', scene: 'surface', isActive: true,
      icon: surfaceIcon,
    });
  }

  // Build tool groups based on current scene
  const toolGroups: ToolGroup[] = [];

  switch (effectiveScene) {
    case 'home-intro': {
      // 3D button in center — only if no model exists and not generating
      if (homeInfo && !backgroundModelInfo && home3DPhase === 'idle') {
        toolGroups.push({
          type: 'buttons',
          items: [{
            id: '3d-home',
            label: '',
            icon: React.createElement('span', { style: { display: 'flex', alignItems: 'center', gap: 4 } },
              React.createElement('svg', { width: 12, height: 12, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: '1.4', strokeLinecap: 'round', strokeLinejoin: 'round' },
                React.createElement('path', { d: 'M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z' }),
                React.createElement('line', { x1: '8', y1: '15', x2: '8', y2: '8' }),
                React.createElement('line', { x1: '8', y1: '8', x2: '2', y2: '4.5' }),
                React.createElement('line', { x1: '8', y1: '8', x2: '14', y2: '4.5' }),
              ),
              React.createElement('span', { style: { opacity: 0.75 } }, '49'),
              React.createElement('svg', { width: 11, height: 11, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: '1.4', strokeLinecap: 'round' },
                React.createElement('circle', { cx: '8', cy: '8', r: '2' }),
                React.createElement('ellipse', { cx: '8', cy: '8', rx: '7', ry: '3' }),
                React.createElement('ellipse', { cx: '8', cy: '8', rx: '3', ry: '7' }),
              ),
            ),
            onClick: handleHome3DGenerate,
            variant: 'accent',
          }],
        });
      }
      // Zoom moved to SceneControlsPanel
      break;
    }

    case 'galaxy': {
      const activeSlots = researchState.slots.filter((s) => s.systemId !== null).length;
      toolGroups.push({
        type: 'buttons',
        items: [{
          id: 'observatories',
          label: `${activeSlots}/${HOME_OBSERVATORY_COUNT}`,
          icon: React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: '1.2' },
            React.createElement('circle', { cx: '8', cy: '5', r: '4' }),
            React.createElement('line', { x1: '4', y1: '9', x2: '12', y2: '9' }),
            React.createElement('line', { x1: '3', y1: '9', x2: '3', y2: '14' }),
            React.createElement('line', { x1: '13', y1: '9', x2: '13', y2: '14' }),
            React.createElement('line', { x1: '1', y1: '14', x2: '15', y2: '14' }),
          ),
          tooltip: 'Обсерваторії',
          onClick: () => {},
        }],
      });
      // Zoom moved to SceneControlsPanel (left side)
      break;
    }

    case 'system': {
      const sysActiveSlots = researchState.slots.filter((s) => s.systemId !== null).length;
      if (state.selectedPlanet) {
        toolGroups.push({
          type: 'buttons',
          items: [
            {
              id: 'view-planet',
              label: 'Екзосфера',
              icon: React.createElement('svg', { width: 13, height: 13, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: '1.2' },
                React.createElement('circle', { cx: '8', cy: '8', r: '5' }),
                React.createElement('ellipse', { cx: '8', cy: '8', rx: '7', ry: '3' }),
              ),
              onClick: handleViewPlanet,
            },
            {
              id: 'surface',
              label: 'Поверхня',
              icon: React.createElement('svg', { width: 13, height: 13, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: '1.2' },
                React.createElement('path', { d: 'M1 12 L4 8 L7 10 L11 5 L15 9 L15 14 L1 14Z' }),
                React.createElement('circle', { cx: '12', cy: '3', r: '2' }),
              ),
              onClick: handleOpenSurface,
            },
            { id: 'info', label: 'Інфо', onClick: handleShowCharacteristics },
          ],
        });
      }
      // Observatory research button (always visible on system scene)
      if (state.selectedSystem && state.selectedSystem.ownerPlayerId === null) {
        toolGroups.push({
          type: 'buttons',
          items: [{
            id: 'system-research',
            label: `${sysActiveSlots}/${HOME_OBSERVATORY_COUNT}`,
            icon: React.createElement('svg', { width: 13, height: 13, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: '1.2' },
              React.createElement('circle', { cx: '8', cy: '5', r: '4' }),
              React.createElement('line', { x1: '4', y1: '9', x2: '12', y2: '9' }),
              React.createElement('line', { x1: '3', y1: '9', x2: '3', y2: '14' }),
              React.createElement('line', { x1: '13', y1: '9', x2: '13', y2: '14' }),
              React.createElement('line', { x1: '1', y1: '14', x2: '15', y2: '14' }),
            ),
            tooltip: 'Дослідити систему',
            onClick: () => setShowSystemResearch((prev) => !prev),
            active: showSystemResearch,
          }],
        });
      }
      break;
    }

    case 'planet-view': {
      // Surface button with SVG icon (back + zoom moved to SceneControlsPanel)
      toolGroups.push({
        type: 'buttons',
        items: [{
          id: 'surface',
          label: 'Поверхня',
          icon: React.createElement('svg', { width: 13, height: 13, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: '1.2' },
            React.createElement('path', { d: 'M1 12 L4 8 L7 10 L11 5 L15 9 L15 14 L1 14Z' }),
            React.createElement('circle', { cx: '12', cy: '3', r: '2' }),
          ),
          onClick: handleOpenSurface,
        }],
      });
      break;
    }

    case 'surface': {
      const tools: ToolItem[] = [
        {
          id: 'buildings',
          label: 'Будівлі',
          onClick: () => surfaceViewRef.current?.toggleBuildPanel(),
          active: surfaceBuildPanelOpen,
        },
      ];
      toolGroups.push({ type: 'buttons', items: tools });
      if (surfacePhase === 'ai-ready') {
        toolGroups.push({
          type: 'zoom',
          items: [
            { id: 'zoom-in', label: '+', onClick: () => surfaceViewRef.current?.zoomIn() },
            { id: 'zoom-out', label: '\u2212', onClick: () => surfaceViewRef.current?.zoomOut() },
          ],
        });
      }
      break;
    }
  }

  // Global: Terminal button on all scenes
  const hasTechBadge = hasAvailableTech(playerLevel, techTreeState);
  toolGroups.push({
    type: 'buttons',
    items: [{
      id: 'command-center',
      label: 'ТЕРМІНАЛ',
      variant: 'terminal' as const,
      tooltip: 'Центр управлiння',
      tutorialId: 'terminal-btn',
      badge: hasTechBadge ? 'NEW' : undefined,
      onClick: () => setShowCosmicArchive(true),
    }],
  });

  // Left-side action buttons (home-intro: surface + explore icons)
  const leftActions: ToolItem[] = [];
  if (effectiveScene === 'home-intro') {
    if (homeInfo) {
      leftActions.push({
        id: 'surface',
        label: 'Поверхня',
        tooltip: 'На поверхню',
        icon: React.createElement('svg', { width: 13, height: 13, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: '1.3', strokeLinecap: 'round', strokeLinejoin: 'round' },
          React.createElement('path', { d: 'M1 12l3-4 3 2 4-5 4 4' }),
          React.createElement('line', { x1: '1', y1: '14', x2: '15', y2: '14' }),
        ),
        onClick: handleGoToHomeSurface,
      });
    }
    if (showExploreBtn) {
      leftActions.push({
        id: 'explore',
        label: 'Дослідити галактику',
        tooltip: 'Дослідити галактику',
        icon: React.createElement('svg', { width: 13, height: 13, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: '1.3' },
          React.createElement('circle', { cx: '8', cy: '8', r: '6' }),
          React.createElement('ellipse', { cx: '8', cy: '8', rx: '6', ry: '2.5' }),
          React.createElement('ellipse', { cx: '8', cy: '8', rx: '2.5', ry: '6' }),
          React.createElement('circle', { cx: '8', cy: '8', r: '1', fill: 'currentColor', stroke: 'none' }),
        ),
        onClick: handleStartExploration,
      });
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

  return (
    <>
      <div ref={canvasRef} id="game-canvas" />

      {/* Resource HUD — top right */}
      <ResourceDisplay
        researchData={researchData}
        quarks={quarks}
        isExodusPhase={isExodusPhase}
        minerals={colonyResources.minerals}
        volatiles={colonyResources.volatiles}
        isotopes={colonyResources.isotopes}
        activeObservatories={researchState.slots.filter((s) => s.systemId !== null).length}
        totalObservatories={researchState.slots.length}
        onClick={() => { if (isGuest) setShowLinkModal(true); else setShowTopUpModal(true); }}
      />

      {/* Doomsday Clock — center top (Exodus phase only) */}
      {/* Phase 1: "СИНХРОНIЗАЦIЯ СИСТЕМ ЖИТТЄЗАБЕЗПЕЧЕННЯ..." */}
      {isExodusPhase && clockPhase === 'syncing' && (
        <div
          style={{
            position: 'fixed',
            top: 10,
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
          {'> СИНХРОНIЗАЦIЯ СИСТЕМ ЖИТТЄЗАБЕЗПЕЧЕННЯ...'}
        </div>
      )}
      {/* Phase 2: Glitch effect */}
      {isExodusPhase && clockPhase === 'glitch' && (
        <div
          style={{
            position: 'fixed',
            top: 10,
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
      {/* Phase 3: Visible — active game-time countdown + evacuation button */}
      {isExodusPhase && clockPhase === 'visible' && countdownText && (
        <div
          style={{
            position: 'fixed',
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9700,
            fontFamily: 'monospace',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            pointerEvents: 'none',
          }}
        >
          {/* Timer */}
          <div
            style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: '#cc4444',
              textShadow: countdownUrgent
                ? '0 0 16px rgba(204,68,68,0.8), 0 0 32px rgba(204,68,68,0.4)'
                : '0 0 8px rgba(204,68,68,0.4)',
              letterSpacing: 3,
              padding: '4px 16px',
              background: 'rgba(5,10,20,0.8)',
              border: `1px solid ${countdownUrgent ? 'rgba(204,68,68,0.6)' : 'rgba(204,68,68,0.3)'}`,
              borderRadius: 4,
              animation: countdownUrgent ? 'cmdbar-terminal-pulse 0.8s infinite' : undefined,
            }}
          >
            {countdownText}
          </div>
          {/* Evacuation button — shown when prompt is dismissed */}
          {evacuationTarget && evacuationPhase === 'idle' && evacuationPromptDismissed && (
            <button
              onClick={() => setEvacuationPromptDismissed(false)}
              style={{
                pointerEvents: 'auto',
                padding: '5px 14px',
                minHeight: 32,
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
              Евакуація
            </button>
          )}
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
              {'[ ТЕРМIНОВЕ ВIДЕО-ПОВIДОМЛЕННЯ ]'}
            </div>
            <div style={{ color: '#cc4444', fontSize: 13, fontWeight: 'bold', marginBottom: 12, letterSpacing: 1 }}>
              УВАГА: ТРАЄКТОРIЯ ОНОВЛЕНА
            </div>
            <div style={{ color: '#aabbcc', fontSize: 12, lineHeight: 1.6, marginBottom: 24 }}>
              Командоре, розрахунки траєкторiї астероїда оновилися. Часу лишилося критично мало...
              Але є й гарна новина. Здається, в цiй системi є те, що ми так довго шукали.
              Потрiбно поспiшати!
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
              ЗРОЗУМIЛО
            </button>
          </div>
        </div>
      )}

      {/* CommandBar — always visible at bottom */}
      <CommandBar
        scene={effectiveScene}
        breadcrumbs={breadcrumbs}
        toolGroups={toolGroups}
        leftActions={leftActions.length > 0 ? leftActions : undefined}
        playerName={state.playerName}
        playerLevel={playerLevel}
        playerXP={playerXP}
        onNavigate={handleBreadcrumbNavigate}
        onOpenPlayerPage={() => setShowPlayerPage(true)}
      />

      {/* Level-up notification toast */}
      {levelUpNotification !== null && (
        <div style={{
          position: 'fixed',
          bottom: 60,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9600,
          background: 'rgba(10, 15, 25, 0.95)',
          border: '1px solid #44ff88',
          borderRadius: 4,
          padding: '10px 24px',
          fontFamily: 'monospace',
          fontSize: 13,
          color: '#44ff88',
          letterSpacing: 1,
          pointerEvents: 'none',
          animation: 'cmdbar-fade-in 0.3s ease',
          boxShadow: '0 0 20px rgba(68, 255, 136, 0.15)',
        }}>
          РIВЕНЬ {levelUpNotification}
        </div>
      )}

      {/* Left-side scene controls — home-intro */}
      {state.scene === 'home-intro' && !backgroundModelInfo && home3DPhase !== 'scanning' && (
        <SceneControlsPanel
          onBack={handleStartExploration}
          onZoomIn={() => engineRef.current?.homePlanetZoomIn()}
          onZoomOut={() => engineRef.current?.homePlanetZoomOut()}
          backLabel="Галактика"
          showZoom
        />
      )}

      {/* Left-side scene controls — galaxy */}
      {state.scene === 'galaxy' && (
        <SceneControlsPanel
          onBack={handleGoToHomePlanet}
          onCenter={() => engineRef.current?.galaxyCenterOnOrigin()}
          onZoomIn={() => engineRef.current?.galaxyZoomIn()}
          onZoomOut={() => engineRef.current?.galaxyZoomOut()}
          backLabel="Домівка"
          showCenter
          showZoom
        />
      )}

      {/* Left-side scene controls — system */}
      {state.scene === 'system' && (
        <SceneControlsPanel
          onBack={handleBackToGalaxy}
          onCenter={() => engineRef.current?.systemCenterOnOrigin()}
          onZoomIn={() => engineRef.current?.systemZoomIn()}
          onZoomOut={() => engineRef.current?.systemZoomOut()}
          backLabel="Галактика"
          showCenter
          showZoom
        />
      )}

      {/* Left-side scene controls — planet-view */}
      {state.scene === 'planet-view' && !backgroundModelInfo && (
        <SceneControlsPanel
          onBack={handleBackToSystem}
          onCenter={() => {}}
          onZoomIn={() => engineRef.current?.planetViewZoomIn()}
          onZoomOut={() => engineRef.current?.planetViewZoomOut()}
          backLabel="Система"
          showZoom
        />
      )}

      {/* Research blur overlay for unresearched systems */}
      {state.scene === 'system' && !isCurrentSystemFullyAccessible && (
        <SystemResearchOverlay progress={currentSystemProgress} />
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
          on3DGenerate={handlePlanetView3DGenerate}
          is3DGenerating={planetView3DPhase !== 'idle' && planetView3DPhase !== 'complete'}
          has3DModel={!!(selectedPlanetModel?.status === 'ready' && selectedPlanetModel?.glb_url)}
        />
      )}

      {/* Floating info button — right of planet in exosphere view */}
      {state.scene === 'planet-view' && state.selectedPlanet && !surfaceTarget && (
        <FloatingInfoButton onClick={handlePlanetInfoFromButton} />
      )}

      {showResearchPanel && (
        <ResearchPanel
          system={selectedSystem}
          researchState={researchState}
          allSystems={engineRef.current?.getAllSystems() ?? []}
          activeSlotTimerText={activeSlotTimer}
          researchData={researchData}
          onStartResearch={handleStartResearch}
          onClose={() => { setState((prev) => ({ ...prev, selectedSystem: null })); engineRef.current?.unfocusSystem(); }}
        />
      )}
      {/* Research panel on system scene */}
      {showSystemResearch && state.scene === 'system' && state.selectedSystem && (
        <ResearchPanel
          system={state.selectedSystem}
          researchState={researchState}
          allSystems={engineRef.current?.getAllSystems() ?? []}
          activeSlotTimerText={activeSlotTimer}
          researchData={researchData}
          onStartResearch={handleStartResearch}
          onClose={() => setShowSystemResearch(false)}
        />
      )}
      {showSystemInfoPanel && (
        <SystemInfoPanel
          system={selectedSystem!}
          displayName={aliases[selectedSystem!.id] ?? undefined}
          onEnterSystem={() => handleEnterSystem(selectedSystem!)}
          onClose={() => { setState((prev) => ({ ...prev, selectedSystem: null })); engineRef.current?.unfocusSystem(); }}
          onRename={(newName) => {
            const sys = selectedSystem!;
            setAlias({
              playerId: playerId.current,
              entityType: 'system',
              entityId: sys.id,
              customName: newName,
            }).then(() => {
              setAliases((prev) => ({ ...prev, [sys.id]: newName }));
            }).catch((err) => console.error('Rename failed:', err));
          }}
        />
      )}
      {/* System Context Menu (galaxy view) */}
      {showSystemMenu && state.selectedSystem && systemMenuPos && state.scene === 'galaxy' && (
        <SystemContextMenu
          system={state.selectedSystem}
          screenPosition={systemMenuPos}
          isHome={state.selectedSystem.ownerPlayerId !== null}
          isResearched={isSystemFullyResearched(researchState, state.selectedSystem.id)}
          systemPhoto={systemPhotos.get(state.selectedSystem.id) ?? null}
          activeMission={systemMissions.get(state.selectedSystem.id) ?? null}
          quarks={quarks}
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
      {state.showPlanetMenu && state.selectedPlanet && state.planetClickPos && state.scene === 'system' && isCurrentSystemFullyAccessible && (
        <PlanetContextMenu
          planet={state.selectedPlanet}
          screenPosition={state.planetClickPos}
          onViewPlanet={handleViewPlanet}
          onShowCharacteristics={handleShowCharacteristics}
          onClose={handleClosePlanetMenu}
          onSurface={handleOpenSurface}
          on3DGenerate={handleUpgradePlanet}
          has3DModel={!!(selectedPlanetModel?.status === 'ready' && selectedPlanetModel?.glb_url)}
          is3DGenerating={(planetView3DPhase !== 'idle' && planetView3DPhase !== 'complete') || !!modelGenerationTarget}
        />
      )}
      {state.showPlanetInfo && state.selectedPlanet && state.scene === 'system' && isCurrentSystemFullyAccessible && (
        <PlanetInfoPanel
          planet={state.selectedPlanet}
          onClose={() => setState((prev) => ({ ...prev, showPlanetInfo: false, selectedPlanet: null }))}
          onSurface={handleOpenSurface}
        />
      )}
      {completedModal && (
        <ResearchCompleteModal
          system={completedModal.system}
          research={completedModal.research}
          onViewSystem={handleViewResearchedSystem}
          onClose={() => setCompletedModal(null)}
        />
      )}
      {/* Discovery choice panel (slide-in with 3 options) */}
      {pendingDiscovery && (
        <DiscoveryChoicePanel
          discovery={pendingDiscovery.discovery}
          system={pendingDiscovery.system}
          isFirstDiscovery={isFirstDiscovery}
          isLuckyFree={isLuckyFree}
          playerQuarks={quarks}
          onTelemetry={handleTelemetry}
          onQuantumFocus={handleQuantumFocus}
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
      {/* Observatory view (AI Kling — paid with quarks) */}
      {observatoryTarget && (
        <ObservatoryView
          discovery={observatoryTarget.discovery}
          system={observatoryTarget.system}
          playerId={playerId.current}
          onClose={handleCloseObservatory}
          onSaveToGallery={handleSaveToGallery}
          cost={observatoryTarget.cost}
        />
      )}
      {/* Gallery compare modal (when cell is occupied) */}
      {galleryCompare && (
        <GalleryCompareModal
          newDiscovery={galleryCompare.newDiscovery}
          newImageUrl={galleryCompare.newImageUrl}
          existingImageUrl={galleryCompare.existingData.photo_url!}
          existingDate={galleryCompare.existingData.discovered_at}
          objectName={(getCatalogEntry(galleryCompare.newDiscovery.type) as CatalogEntry | undefined)?.nameUk ?? galleryCompare.newDiscovery.type}
          onReplace={handleGalleryReplace}
          onKeepOld={handleGalleryKeepOld}
        />
      )}
      {/* Evacuation Prompt — shown when habitable planet found or timer expired */}
      {evacuationTarget && evacuationPhase === 'idle' && !evacuationPromptDismissed && (
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
        <CutscenePlaceholder
          label={forcedEvacuation
            ? 'Термiнова евакуацiя. Вибору немає.'
            : 'Запуск евакуацiйного корабля'}
          duration={forcedEvacuation ? 5 : 4}
          onComplete={handleStage0Complete}
        />
      )}
      {/* Stage 1: System flight — no overlay, ship flies in PixiJS scene */}
      {/* Stage 2: Planet explosion cutscene (6s) */}
      {evacuationPhase === 'stage2-explosion' && (
        <CutscenePlaceholder
          label={forcedEvacuation
            ? 'Зiткнення. Рiдна планета знищена.'
            : 'Загибель рiдної планети'}
          duration={6}
          onComplete={handleStage2Complete}
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
        <CutscenePlaceholder
          label="Посадка на нову планету"
          duration={5}
          onComplete={handleCutsceneLandingComplete}
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
      {/* 3D Model Generation Overlay */}
      {modelGenerationTarget && (
        <ModelGenerationOverlay
          playerId={playerId.current}
          planetId={modelGenerationTarget.planetId}
          systemId={modelGenerationTarget.systemId}
          planetName={modelGenerationTarget.planetName}
          starColor={modelGenerationTarget.starColor}
          existingModelId={modelGenerationTarget.existingModelId}
          planet={modelGenerationTarget.planet}
          star={modelGenerationTarget.star}
          onClose={handleCloseModelGeneration}
          onModelReady={(modelId, glbUrl) => {
            handleModelReady(modelId, glbUrl);
            // Fire system notification so player knows 3D is ready
            if (modelGenerationTarget) {
              addSystemNotif(
                modelGenerationTarget.planetName,
                modelGenerationTarget.systemId,
                modelGenerationTarget.planetId,
              );
              // Log: science entry on completion
              addLogEntry('science',
                `Квантовий синтез ${modelGenerationTarget.planetName} успішно завершено. Топографічна 3D-модель інтегрована в базу.`,
                { planetName: modelGenerationTarget.planetName, systemId: modelGenerationTarget.systemId, planetId: modelGenerationTarget.planetId },
              );
              awardXP(XP_REWARDS.MODEL_3D_GENERATED, '3d_model');
            }
          }}
          onQuarksChanged={() => {
            refreshQuarks();
            // Log: economy entry on payment
            if (modelGenerationTarget) {
              addLogEntry('economy',
                `Списано 49 кваркiв. Авторизовано запит на квантовий синтез для об'єкта ${modelGenerationTarget.planetName}.`,
                { planetName: modelGenerationTarget.planetName, systemId: modelGenerationTarget.systemId, planetId: modelGenerationTarget.planetId },
              );
            }
          }}
        />
      )}
      {/* Scan line while checking for 3D models (planet-view only, skip home to avoid flash) */}
      {!modelsLoaded && state.scene === 'planet-view' && (
        <ScanLineOverlay />
      )}
      {/* Background 3D Model (auto-shown on home/planet-view if model exists) */}
      {backgroundModelInfo &&
        home3DPhase !== 'scanning' && home3DPhase !== 'materializing' &&
        planetView3DPhase !== 'scanning' && planetView3DPhase !== 'materializing' && (
        <Planet3DViewer
          glbUrl={backgroundModelInfo.glbUrl}
          planetName={backgroundModelInfo.planetName}
          atmosphere={backgroundModelInfo.atmosphere}
          planetType={backgroundModelInfo.planetType}
          planetMassEarth={backgroundModelInfo.planetMassEarth}
          moons={backgroundModelInfo.moons}
          mode="background"
          onClose={() => {}}
        />
      )}
      {/* Quantum Scan Terminal — home 3D generation */}
      {home3DPhase === 'scanning' && homeInfo && (
        <QuantumScanTerminal
          phase={home3DGenPhase}
          progress={home3DProgress}
          planetName={homeInfo.planet.name}
        />
      )}
      {/* Holographic Materialization — home 3D */}
      {home3DPhase === 'materializing' && backgroundModelInfo && (
        <HolographicTransition
          glbUrl={backgroundModelInfo.glbUrl}
          planetName={backgroundModelInfo.planetName}
          atmosphere={backgroundModelInfo.atmosphere}
          planetType={backgroundModelInfo.planetType}
          planetMassEarth={backgroundModelInfo.planetMassEarth}
          moons={backgroundModelInfo.moons}
          onComplete={() => setHome3DPhase('complete')}
        />
      )}
      {/* Quantum Scan Terminal — planet-view 3D generation */}
      {planetView3DPhase === 'scanning' && state.selectedPlanet && (
        <QuantumScanTerminal
          phase={planetView3DGenPhase}
          progress={planetView3DProgress}
          planetName={state.selectedPlanet.name}
        />
      )}
      {/* Holographic Materialization — planet-view 3D */}
      {planetView3DPhase === 'materializing' && backgroundModelInfo && (
        <HolographicTransition
          glbUrl={backgroundModelInfo.glbUrl}
          planetName={backgroundModelInfo.planetName}
          atmosphere={backgroundModelInfo.atmosphere}
          planetType={backgroundModelInfo.planetType}
          planetMassEarth={backgroundModelInfo.planetMassEarth}
          moons={backgroundModelInfo.moons}
          onComplete={() => setPlanetView3DPhase('complete')}
        />
      )}
      {/* Surface View (biosphere level) */}
      {surfaceTarget && (
        <SurfaceView
          ref={surfaceViewRef}
          planet={surfaceTarget.planet}
          star={surfaceTarget.star}
          playerId={playerId.current}
          onClose={handleCloseSurface}
          onBuildingCountChange={setSurfaceBuildingCount}
          onBuildingPlaced={() => awardXP(XP_REWARDS.BUILDING_PLACED, 'building_placed')}
          onPhaseChange={setSurfacePhase}
          onBuildPanelChange={setSurfaceBuildPanelOpen}
        />
      )}
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
          onOpenTopUp={() => { setShowPlayerPage(false); setShowTopUpModal(true); }}
          onLinkAccount={() => { setShowPlayerPage(false); setShowLinkModal(true); }}
        />
      )}

      {/* Quark Top-Up Modal */}
      {showTopUpModal && (
        <QuarkTopUpModal
          playerId={playerId.current}
          currentBalance={quarks}
          onClose={() => setShowTopUpModal(false)}
        />
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
            return canStartResearch(researchState, sysId, sys.ringIndex);
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
          researchData={researchData}
          researchDataCost={RESEARCH_DATA_COST}
        />
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
        />
      )}

      {/* Planet Detail Window */}
      {planetDetailTarget && (
        <PlanetDetailWindow
          system={planetDetailTarget.system}
          systemDisplayName={planetDetailTarget.displayName}
          initialPlanetIndex={planetDetailTarget.planetIndex}
          onClose={() => setPlanetDetailTarget(null)}
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

      {/* Chat widget (visible when authenticated, not in onboarding) */}
      {!authLoading && !needsOnboarding && !needsCallsign && playerId.current && (
        <ChatWidget
          playerId={playerId.current}
          playerName={state.playerName}
          onUnreadChange={setChatUnreadCount}
          systemNotifs={systemNotifs}
          onSystemNotifRead={(id) =>
            setSystemNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
          }
          onNavigateToPlanet={(systemId, planetId) => {
            const allSystems = engineRef.current?.getAllSystems() ?? [];
            const sys = allSystems.find((s) => s.id === systemId);
            const planet = sys?.planets.find((p) => p.id === planetId);
            if (sys && planet) {
              engineRef.current?.showPlanetViewScene(sys, planet);
              setState((prev) => ({ ...prev, scene: 'planet-view' as const, selectedSystem: sys, selectedPlanet: planet }));
            }
          }}
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
          Завантаження...
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

      {/* Story onboarding (new players) */}
      {needsOnboarding && !needsCallsign && homeInfo && (
        <OnboardingScreen
          homeInfo={homeInfo}
          onComplete={handleOnboardingComplete}
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
