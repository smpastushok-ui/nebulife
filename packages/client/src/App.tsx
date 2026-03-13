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
import type {
  Planet, Star, StarSystem, ResearchState, SystemResearchState, Discovery,
} from '@nebulife/core';
import { getPlayerModels, proxyGlbUrl, pollModelUntilComplete } from './api/tripo-api.js';
import { startPaymentFlow } from './api/payment-api.js';
import { getPlayerAliases, setAlias } from './api/alias-api.js';
import type { PlanetModel } from './api/tripo-api.js';
import {
  createResearchState,
  startResearch,
  completeResearchSession,
  findFreeSlot,
  isSystemFullyResearched,
  getResearchProgress,
  HOME_OBSERVATORY_COUNT,
  RESEARCH_DURATION_MS,
} from '@nebulife/core';
import { SystemResearchOverlay } from './ui/components/SystemResearchOverlay.js';
import { GuestRegistrationReminder } from './ui/components/GuestRegistrationReminder.js';
import { getPlayer, createPlayer } from './api/player-api.js';
import { onAuthChange } from './auth/auth-service.js';
import { authFetch } from './auth/api-client.js';
import { isFirebaseConfigured } from './auth/firebase-config.js';
import { AuthScreen } from './ui/components/AuthScreen.js';
import { CallsignModal } from './ui/components/CallsignModal.js';
import { LinkAccountModal } from './ui/components/LinkAccountModal.js';
import { OnboardingScreen } from './ui/components/OnboardingScreen.js';
import { ChatWidget } from './ui/components/ChatWidget.js';
import type { SystemNotif } from './ui/components/ChatWidget.js';
import { CosmicArchive } from './ui/components/CosmicArchive/CosmicArchive.js';
import type { User } from 'firebase/auth';
import {
  generateSystemPhoto, pollSystemPhotoStatus,
  generateSystemMission, pollMissionStatus,
  getPlayerSystemPhotos as fetchPlayerSystemPhotos,
} from './api/system-photo-api.js';

export type SceneType = 'galaxy' | 'system' | 'home-intro' | 'planet-view';

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

  /** Surface view target */
  const [surfaceTarget, setSurfaceTarget] = useState<{
    planet: Planet;
    star: Star;
  } | null>(null);

  /** Quarks (in-game currency) */
  const [quarks, setQuarks] = useState<number>(0);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showCosmicArchive, setShowCosmicArchive] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [systemNotifs, setSystemNotifs] = useState<SystemNotif[]>([]);
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
    fetch(`/api/player/${playerId.current}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.quarks !== undefined) setQuarks(data.quarks); })
      .catch(() => {});
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

        // Register/sync player in DB
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
          }
        } catch (err) {
          console.warn('Failed to register player:', err);
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

        for (const slot of current.slots) {
          if (slot.systemId && slot.startedAt) {
            const elapsed = now - slot.startedAt;

            if (elapsed >= RESEARCH_DURATION_MS) {
              // Session complete — find the system object
              const system = engine.getAllSystems().find((s) => s.id === slot.systemId);
              if (system) {
                const result = completeResearchSession(current, slot.slotIndex, system, playerStats.totalCompletedSessions);
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
                }

                // Show modal if just completed
                if (result.isNowComplete) {
                  const research = current.systems[system.id];
                  if (research) {
                    setCompletedModal({ system, research });
                  }
                }
              }
            } else {
              // Update timer text
              const remaining = RESEARCH_DURATION_MS - elapsed;
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
    });

    engine.init().then(() => {
      // Sync restored research state before anything else
      engine.setResearchState(researchState);
      engineRef.current = engine;

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
  }, []);

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
    setResearchState((prev) => {
      const slotIndex = findFreeSlot(prev);
      if (slotIndex < 0) return prev;
      const next = startResearch(prev, slotIndex, systemId);
      engineRef.current?.updateSystemResearchVisual(systemId, next);
      return next;
    });
  }, []);

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
  const isFirstDiscovery = playerStats.totalDiscoveries === 0;
  const isLuckyFree = !isFirstDiscovery
    && playerStats.totalDiscoveries >= 3
    && (pendingDiscovery ? ((pendingDiscovery.discovery.timestamp % 50) === 0) : false);

  const handleTelemetry = useCallback(() => {
    if (pendingDiscovery) {
      setTelemetryTarget(pendingDiscovery);
      setPendingDiscovery(null);
    }
  }, [pendingDiscovery]);

  const handleQuantumFocus = useCallback(() => {
    if (pendingDiscovery) {
      const isFree = playerStats.totalDiscoveries === 0
        || (playerStats.totalDiscoveries >= 3 && (pendingDiscovery.discovery.timestamp % 50) === 0);
      if (!isFree && quarks < 3) {
        if (isGuest) setShowLinkModal(true); else setShowTopUpModal(true);
        return;
      }
      setObservatoryTarget({ ...pendingDiscovery, cost: isFree ? 0 : 3 });
      setPendingDiscovery(null);
    }
  }, [pendingDiscovery, playerStats, quarks, isGuest]);

  const handleSkipDiscovery = useCallback(() => {
    setPendingDiscovery(null);
  }, []);

  const handleCloseObservatory = useCallback(() => {
    setObservatoryTarget(null);
  }, []);

  const handleCloseTelemetry = useCallback(() => {
    setTelemetryTarget(null);
  }, []);

  const handleSaveToGallery = useCallback((discoveryId: string, imageUrl: string) => {
    console.log(`[Gallery] Saved discovery ${discoveryId} with image ${imageUrl}`);
  }, []);

  // Keep currentSceneRef in sync with state.scene for use in async callbacks
  useEffect(() => { currentSceneRef.current = state.scene; }, [state.scene]);

  // ── System notification helper ────────────────────────────────────────
  const addSystemNotif = useCallback((planetName: string, systemId: string, planetId: string) => {
    setSystemNotifs((prev) => [
      ...prev,
      {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: `3D-модель планети ${planetName} готова`,
        planetName,
        systemId,
        planetId,
        timestamp: Date.now(),
        read: false,
      },
    ]);
  }, []);

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

      // Small delay to let backgroundModelInfo update, then start materialization
      setTimeout(() => {
        setHome3DPhase('materializing');
      }, 100);
    } catch (err) {
      engineRef.current?.stopHomeScanning();
      setHome3DPhase('idle');
      console.error('Home 3D generation error:', err);
    }
  }, [homeInfo, refreshQuarks, handleModelReady]);

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
  }, [state.selectedPlanet, state.selectedSystem, refreshQuarks, handleModelReady, addSystemNotif]);

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
      const homeTools: ToolItem[] = [];
      if (homeInfo) {
        homeTools.push(
          { id: 'surface', label: 'Поверхня', onClick: handleGoToHomeSurface },
        );
        // 3D button — only if no model exists and not currently generating
        if (!backgroundModelInfo && home3DPhase === 'idle') {
          homeTools.push({
            id: '3d-home',
            label: '',
            icon: React.createElement('span', { style: { display: 'flex', alignItems: 'center', gap: 4 } },
              React.createElement('svg', { width: 12, height: 12, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: '1.4', strokeLinecap: 'round', strokeLinejoin: 'round' },
                React.createElement('path', { d: 'M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z' }),
                React.createElement('line', { x1: '8', y1: '15', x2: '8', y2: '8' }),
                React.createElement('line', { x1: '8', y1: '8', x2: '2', y2: '4.5' }),
                React.createElement('line', { x1: '8', y1: '8', x2: '14', y2: '4.5' }),
              ),
              React.createElement('span', null, '3D'),
              React.createElement('span', { style: { opacity: 0.75 } }, '49'),
              React.createElement('svg', { width: 11, height: 11, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: '1.4', strokeLinecap: 'round' },
                React.createElement('circle', { cx: '8', cy: '8', r: '2' }),
                React.createElement('ellipse', { cx: '8', cy: '8', rx: '7', ry: '3' }),
                React.createElement('ellipse', { cx: '8', cy: '8', rx: '3', ry: '7' }),
              ),
            ),
            onClick: handleHome3DGenerate,
            variant: 'accent',
          });
        }
      }
      if (showExploreBtn) {
        homeTools.push({
          id: 'explore',
          label: 'Дослідити галактику',
          onClick: handleStartExploration,
          variant: 'primary',
        });
      }
      if (homeTools.length > 0) {
        toolGroups.push({ type: 'buttons', items: homeTools });
      }
      if (!backgroundModelInfo && home3DPhase !== 'scanning') {
        toolGroups.push({
          type: 'zoom',
          items: [
            { id: 'zoom-in', label: '+', onClick: () => engineRef.current?.homePlanetZoomIn() },
            { id: 'zoom-out', label: '\u2212', onClick: () => engineRef.current?.homePlanetZoomOut() },
          ],
        });
      }
      break;
    }

    case 'galaxy': {
      const activeSlots = researchState.slots.filter((s) => s.systemId !== null).length;
      toolGroups.push({
        type: 'buttons',
        items: [{
          id: 'observatories',
          label: '',
          icon: React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: '1.2' },
            React.createElement('line', { x1: '2', y1: '11', x2: '10', y2: '5' }),
            React.createElement('circle', { cx: '12', cy: '3.5', r: '2.5' }),
            React.createElement('line', { x1: '2', y1: '11', x2: '0.5', y2: '15' }),
            React.createElement('line', { x1: '2', y1: '11', x2: '4', y2: '15' }),
          ),
          tooltip: 'Обсерваторії',
          onClick: () => {},
          badge: `${activeSlots}/${HOME_OBSERVATORY_COUNT}`,
        }],
      });
      toolGroups.push({
        type: 'zoom',
        items: [
          { id: 'zoom-in', label: '+', onClick: () => engineRef.current?.galaxyZoomIn() },
          { id: 'zoom-out', label: '\u2212', onClick: () => engineRef.current?.galaxyZoomOut() },
        ],
      });
      break;
    }

    case 'system': {
      if (state.selectedPlanet) {
        toolGroups.push({
          type: 'buttons',
          items: [
            { id: 'view-planet', label: 'Екзосфера', onClick: handleViewPlanet },
            { id: 'surface', label: 'Поверхня', onClick: handleOpenSurface },
            { id: 'info', label: 'Інфо', onClick: handleShowCharacteristics },
          ],
        });
      }
      break;
    }

    case 'planet-view': {
      // Left: back to system
      toolGroups.push({
        type: 'buttons',
        items: [{ id: 'back-system', label: 'Система', onClick: handleBackToSystem }],
      });
      // Center: zoom controls (only for PixiJS view, 3D viewer has orbit controls)
      if (!backgroundModelInfo) {
        toolGroups.push({
          type: 'zoom',
          items: [
            { id: 'zoom-in', label: '+', onClick: () => engineRef.current?.planetViewZoomIn() },
            { id: 'zoom-out', label: '\u2212', onClick: () => engineRef.current?.planetViewZoomOut() },
          ],
        });
      }
      // Right: surface
      toolGroups.push({
        type: 'buttons',
        items: [{ id: 'surface', label: 'Поверхня', onClick: handleOpenSurface }],
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

  // Global: Command center button on all scenes
  toolGroups.push({
    type: 'buttons',
    items: [{
      id: 'command-center',
      label: '',
      icon: React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: '1.3' },
        React.createElement('rect', { x: '2', y: '2', width: '12', height: '12', rx: '2' }),
        React.createElement('line', { x1: '2', y1: '6', x2: '14', y2: '6' }),
        React.createElement('line', { x1: '6', y1: '6', x2: '6', y2: '14' }),
      ),
      tooltip: 'Командний центр',
      onClick: () => setShowCosmicArchive(true),
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
      <div ref={canvasRef} id="game-canvas" />

      {/* CommandBar — always visible at bottom */}
      <CommandBar
        scene={effectiveScene}
        breadcrumbs={breadcrumbs}
        toolGroups={toolGroups}
        quarks={quarks}
        playerName={state.playerName}
        onNavigate={handleBreadcrumbNavigate}
        onTopUp={() => { if (isGuest) setShowLinkModal(true); else setShowTopUpModal(true); }}
      />

      {/* Center camera button — top-left, visible on galaxy level */}
      {state.scene === 'galaxy' && (
        <button
          onClick={() => engineRef.current?.galaxyCenterOnOrigin()}
          title="Центрувати"
          style={{
            position: 'fixed',
            top: 14,
            left: 14,
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(10,15,25,0.85)',
            border: '1px solid rgba(68,102,136,0.4)',
            borderRadius: 4,
            color: '#8899aa',
            cursor: 'pointer',
            zIndex: 9400,
            padding: 0,
            fontFamily: 'monospace',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(120,160,255,0.5)';
            e.currentTarget.style.color = '#aabbcc';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(68,102,136,0.4)';
            e.currentTarget.style.color = '#8899aa';
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
            <circle cx="8" cy="8" r="6" />
            <line x1="8" y1="2" x2="8" y2="5" />
            <line x1="8" y1="11" x2="8" y2="14" />
            <line x1="2" y1="8" x2="5" y2="8" />
            <line x1="11" y1="8" x2="14" y2="8" />
            <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </button>
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
          onStartResearch={handleStartResearch}
          onClose={() => { setState((prev) => ({ ...prev, selectedSystem: null })); engineRef.current?.unfocusSystem(); }}
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
            }
          }}
          onQuarksChanged={refreshQuarks}
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
          onPhaseChange={setSurfacePhase}
          onBuildPanelChange={setSurfaceBuildPanelOpen}
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
          playerId={playerId.current}
          allSystems={engineRef.current?.getAllSystems() ?? []}
          aliases={aliases}
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

      {/* Chat unread notification dot — visible above chat widget */}
      {chatUnreadCount > 0 && !showCosmicArchive && (
        <div
          style={{
            position: 'fixed',
            bottom: 90,
            right: 18,
            zIndex: 9450,
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
