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
import { DiscoveryNotification } from './ui/components/DiscoveryNotification.js';
import { ObservatoryView } from './ui/components/ObservatoryView.js';
import ModelGenerationOverlay from './ui/components/ModelGenerationOverlay.js';
import Planet3DViewer from './ui/components/Planet3DViewer.js';
import QuantumScanTerminal from './ui/components/QuantumScanTerminal.js';
import HolographicTransition from './ui/components/HolographicTransition.js';
import { SurfaceView } from './ui/components/SurfaceView.js';
import type { SurfaceViewHandle, SurfacePhase } from './ui/components/SurfaceView.js';
import { QuarkTopUpModal } from './ui/components/QuarkTopUpModal.js';
import { WarpOverlay } from './ui/components/WarpOverlay.js';
import { SystemNavHeader } from './ui/components/SystemNavHeader.js';
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
  calculateObservation,
  findFreeSlot,
  isSystemFullyResearched,
  HOME_OBSERVATORY_COUNT,
  RESEARCH_DURATION_MS,
} from '@nebulife/core';
import { getOrCreatePlayerId, getPlayer, createPlayer } from './api/player-api.js';
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

  const [state, setState] = useState<GameState>({
    scene: 'home-intro',
    selectedSystem: null,
    selectedPlanet: null,
    planetClickPos: null,
    showPlanetMenu: false,
    showPlanetInfo: false,
    playerName: 'Explorer',
    error: null,
  });

  const [researchState, setResearchState] = useState<ResearchState>(() =>
    createResearchState(HOME_OBSERVATORY_COUNT),
  );

  // Completed research modal
  const [completedModal, setCompletedModal] = useState<{
    system: StarSystem;
    research: SystemResearchState;
  } | null>(null);

  // Timer text per slot
  const [slotTimers, setSlotTimers] = useState<Record<number, string>>({});

  // Intro button visibility (shown immediately)
  const [showExploreBtn, setShowExploreBtn] = useState(true);

  // ── Discovery system state ──────────────────────────────────────────────
  const playerId = useRef(getOrCreatePlayerId());

  /** Discovery toast notification (from research completion) */
  const [pendingDiscovery, setPendingDiscovery] = useState<{
    discovery: Discovery;
    system: StarSystem;
  } | null>(null);

  /** Observatory view (when player clicks "Investigate") */
  const [observatoryTarget, setObservatoryTarget] = useState<{
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

  // ── Warp animation state ──────────────────────────────────────────────
  const [warpTarget, setWarpTarget] = useState<StarSystem | null>(null);

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

  // Ensure player exists in DB + load 3D models + quarks balance
  useEffect(() => {
    const pid = playerId.current;

    // Auto-create player in DB if it doesn't exist
    (async () => {
      try {
        const existing = await getPlayer(pid);
        if (!existing) {
          await createPlayer({
            id: pid,
            name: 'Explorer',
            homeSystemId: 'home',
            homePlanetId: 'home',
          });
        }
      } catch (err) {
        console.warn('Failed to ensure player in DB:', err);
      }
      refreshQuarks();
    })();

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
  }, [refreshQuarks]);

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
                const result = completeResearchSession(current, slot.slotIndex, system);
                current = result.state;
                changed = true;

                // Update galaxy visual
                engine.updateSystemResearchVisual(slot.systemId, current);

                // Show discovery notification if one was rolled
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
      onWarpToSystem: (system) => {
        setWarpTarget(system);
      },
    });

    engine.init().then(() => {
      engineRef.current = engine;

      // DEBUG: unlock all systems for testing (remove after testing)
      const allSystems = engine.getAllSystems();
      const debugResearch: ResearchState = {
        slots: researchState.slots.map(s => ({ ...s, systemId: null, startedAt: null })),
        systems: Object.fromEntries(
          allSystems.map(sys => [sys.id, {
            systemId: sys.id,
            progress: 100,
            isComplete: true,
            observation: calculateObservation(sys, 100),
          }]),
        ),
      };
      setResearchState(debugResearch);
      engine.setResearchState(debugResearch);
      // Update galaxy visuals for all systems
      for (const sys of allSystems) {
        engine.updateSystemResearchVisual(sys.id, debugResearch);
      }
      console.log(`[DEBUG] Unlocked ${allSystems.length} systems for testing`);

      // Store home system/planet info for navigation
      const homeSystem = allSystems.find(s => s.ownerPlayerId !== null);
      if (homeSystem) {
        const homePlanet = homeSystem.planets.find(p => p.isHomePlanet) ?? homeSystem.planets[0];
        if (homePlanet) {
          setHomeInfo({ system: homeSystem, planet: homePlanet });
        }
      }
      // END DEBUG
    }).catch((err) => {
      console.error('GameEngine init error:', err);
      setState((prev) => ({ ...prev, error: String(err) }));
    });

    return () => {
      engine.destroy();
    };
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
    engineRef.current?.showHomePlanetScene();
    setState((prev) => ({ ...prev, scene: 'home-intro', selectedSystem: null, selectedPlanet: null }));
    setShowExploreBtn(true);
  };

  const handleEnterSystem = useCallback((system: StarSystem) => {
    const canEnter = system.ownerPlayerId !== null || isSystemFullyResearched(researchState, system.id);
    if (!canEnter) return;
    engineRef.current?.showSystemScene(system);
    setState((prev) => ({ ...prev, scene: 'system' }));
  }, [researchState]);

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
      engine?.showPlanetViewScene(state.selectedSystem, state.selectedPlanet);
      // Prevent PixiJS flash: immediately hide planet if 3D model exists for this planet
      const hasModel = planetModels.some(
        (m) => m.planet_id === state.selectedPlanet!.id
          && m.system_id === state.selectedSystem!.id
          && m.status === 'ready',
      );
      if (hasModel) engine?.setPlanetVisible(false);
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
    const sys = state.selectedSystem;
    const sysId = sys.id;
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
  }, [state.selectedSystem]);

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
  const handleInvestigateDiscovery = useCallback(() => {
    if (pendingDiscovery) {
      setObservatoryTarget(pendingDiscovery);
      setPendingDiscovery(null);
    }
  }, [pendingDiscovery]);

  const handleDismissDiscovery = useCallback(() => {
    setPendingDiscovery(null);
  }, []);

  const handleCloseObservatory = useCallback(() => {
    setObservatoryTarget(null);
  }, []);

  const handleSaveToGallery = useCallback((discoveryId: string, imageUrl: string) => {
    console.log(`[Gallery] Saved discovery ${discoveryId} with image ${imageUrl}`);
  }, []);

  // ── 3D Model handlers ─────────────────────────────────────────────────
  const handleUpgradePlanet = useCallback(() => {
    if (!state.selectedPlanet || !state.selectedSystem) return;
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
  }, [state.selectedPlanet, state.selectedSystem, planetModels]);

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
    engineRef.current?.showPlanetViewScene(homeInfo.system, homeInfo.planet);
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

      // Model ready — stop scanning, start materialization
      engineRef.current?.stopPlanetViewScanning();

      // Update planet models list (triggers backgroundModelInfo)
      handleModelReady(result.modelId, completed.glbUrl);

      // Small delay to let backgroundModelInfo update, then start materialization
      setTimeout(() => {
        setPlanetView3DPhase('materializing');
      }, 100);
    } catch (err) {
      engineRef.current?.stopPlanetViewScanning();
      setPlanetView3DPhase('idle');
      console.error('Planet-view 3D generation error:', err);
    }
  }, [state.selectedPlanet, state.selectedSystem, refreshQuarks, handleModelReady]);

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
          handleViewPlanet();
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
  // Computed inline (not useMemo) because engineRef isn't reactive but is
  // always initialised by the time state.scene === 'system'.
  const navigableSystems: StarSystem[] =
    state.scene === 'system' && engineRef.current
      ? engineRef.current.getAllSystems().filter(
          (s) => s.ownerPlayerId !== null || isSystemFullyResearched(researchState, s.id),
        )
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

  // ── CommandBar data ──────────────────────────────────────────────────
  const effectiveScene: ExtendedScene = surfaceTarget ? 'surface' : state.scene;

  const breadcrumbs: BreadcrumbItem[] = [
    { id: 'home', label: 'Домівка', scene: 'home-intro', isActive: effectiveScene === 'home-intro' },
  ];

  if (effectiveScene !== 'home-intro') {
    breadcrumbs.push({
      id: 'galaxy', label: 'Галактика', scene: 'galaxy',
      isActive: effectiveScene === 'galaxy',
    });
  }

  if (['system', 'planet-view', 'surface'].includes(effectiveScene) && state.selectedSystem) {
    breadcrumbs.push({
      id: 'system', label: state.selectedSystem.star.name, scene: 'system',
      isActive: effectiveScene === 'system',
    });
  }

  if (['planet-view', 'surface'].includes(effectiveScene) && state.selectedPlanet) {
    breadcrumbs.push({
      id: 'planet', label: state.selectedPlanet.name, scene: 'planet-view',
      isActive: effectiveScene === 'planet-view',
    });
  }

  if (effectiveScene === 'surface') {
    breadcrumbs.push({
      id: 'surface', label: 'Поверхня', scene: 'surface', isActive: true,
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
            label: '3D 49⚛',
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
          label: 'Обсерваторії',
          onClick: () => {},
          badge: `${activeSlots}/${HOME_OBSERVATORY_COUNT}`,
        }],
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
      const tools: ToolItem[] = [
        { id: 'back-system', label: 'Система', onClick: handleBackToSystem },
        { id: 'surface', label: 'Поверхня', onClick: handleOpenSurface },
        { id: 'info', label: 'Інфо', onClick: handleShowCharacteristics },
      ];
      if (selectedPlanetModel?.status === 'ready' && selectedPlanetModel?.glb_url) {
        // Model exists & auto-shown as background → offer regeneration
        tools.push({ id: '3d', label: 'Змінити вигляд 49⚛', onClick: handlePlanetView3DGenerate });
      } else if (planetView3DPhase === 'idle') {
        tools.push({ id: '3d', label: '3D 49⚛', onClick: handlePlanetView3DGenerate, variant: 'accent' });
      }
      toolGroups.push({ type: 'buttons', items: tools });
      if (!backgroundModelInfo) {
        // Only show zoom for PixiJS view (3D viewer has its own orbit controls)
        toolGroups.push({
          type: 'zoom',
          items: [
            { id: 'zoom-in', label: '+', onClick: () => engineRef.current?.planetViewZoomIn() },
            { id: 'zoom-out', label: '\u2212', onClick: () => engineRef.current?.planetViewZoomOut() },
          ],
        });
      }
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
        onTopUp={() => setShowTopUpModal(true)}
      />

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
        />
      )}

      {showResearchPanel && (
        <ResearchPanel
          system={selectedSystem}
          researchState={researchState}
          allSystems={engineRef.current?.getAllSystems() ?? []}
          activeSlotTimerText={activeSlotTimer}
          onStartResearch={handleStartResearch}
          onClose={() => setState((prev) => ({ ...prev, selectedSystem: null }))}
        />
      )}
      {showSystemInfoPanel && (
        <SystemInfoPanel
          system={selectedSystem!}
          displayName={aliases[selectedSystem!.id] ?? undefined}
          onEnterSystem={() => handleEnterSystem(selectedSystem!)}
          onClose={() => setState((prev) => ({ ...prev, selectedSystem: null }))}
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
      {state.showPlanetMenu && state.selectedPlanet && state.planetClickPos && state.scene === 'system' && (
        <PlanetContextMenu
          planet={state.selectedPlanet}
          screenPosition={state.planetClickPos}
          onViewPlanet={handleViewPlanet}
          onShowCharacteristics={handleShowCharacteristics}
          onClose={handleClosePlanetMenu}
          onSurface={handleOpenSurface}
          onUpgrade={handleUpgradePlanet}
          has3DModel={selectedPlanetModel?.status === 'ready' && !!selectedPlanetModel?.glb_url}
          modelStatus={selectedPlanetModel?.status}
        />
      )}
      {state.showPlanetInfo && state.selectedPlanet && state.scene === 'system' && (
        <PlanetInfoPanel
          planet={state.selectedPlanet}
          onClose={() => setState((prev) => ({ ...prev, showPlanetInfo: false, selectedPlanet: null }))}
          has3DModel={selectedPlanetModel?.status === 'ready' && !!selectedPlanetModel?.glb_url}
          modelStatus={selectedPlanetModel?.status}
          onUpgrade={handleUpgradePlanet}
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
      {/* Discovery notification toast */}
      {pendingDiscovery && (
        <DiscoveryNotification
          discovery={pendingDiscovery.discovery}
          onInvestigate={handleInvestigateDiscovery}
          onDismiss={handleDismissDiscovery}
        />
      )}
      {/* Observatory view (full-screen overlay) */}
      {observatoryTarget && (
        <ObservatoryView
          discovery={observatoryTarget.discovery}
          system={observatoryTarget.system}
          playerId={playerId.current}
          onClose={handleCloseObservatory}
          onSaveToGallery={handleSaveToGallery}
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
          onModelReady={handleModelReady}
          onQuarksChanged={refreshQuarks}
        />
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
      {/* Warp Animation Overlay */}
      {warpTarget && (
        <WarpOverlay
          systemName={warpTarget.name}
          onComplete={() => {
            const system = warpTarget;
            setWarpTarget(null);
            if (engineRef.current && system) {
              engineRef.current.enterSystem(system);
            }
          }}
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
    </>
  );
}
