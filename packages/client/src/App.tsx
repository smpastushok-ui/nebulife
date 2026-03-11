import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine.js';
import { CommandBar } from './ui/components/CommandBar/index.js';
import type { BreadcrumbItem, ToolItem, ToolGroup, ExtendedScene } from './ui/components/CommandBar/index.js';
import { PlanetInfoPanel } from './ui/components/PlanetInfoPanel.js';
import { PlanetContextMenu } from './ui/components/PlanetContextMenu.js';
import { SystemInfoPanel } from './ui/components/SystemInfoPanel.js';
import { ResearchPanel } from './ui/components/ResearchPanel.js';
import { ResearchCompleteModal } from './ui/components/ResearchCompleteModal.js';
import { DiscoveryNotification } from './ui/components/DiscoveryNotification.js';
import { ObservatoryView } from './ui/components/ObservatoryView.js';
import ModelGenerationOverlay from './ui/components/ModelGenerationOverlay.js';
import Planet3DViewer from './ui/components/Planet3DViewer.js';
import { SurfaceView } from './ui/components/SurfaceView.js';
import type { SurfaceViewHandle, SurfacePhase } from './ui/components/SurfaceView.js';
import { QuarkTopUpModal } from './ui/components/QuarkTopUpModal.js';
import { WarpOverlay } from './ui/components/WarpOverlay.js';
import type {
  Planet, Star, StarSystem, ResearchState, SystemResearchState, Discovery,
} from '@nebulife/core';
import { getPlayerModels } from './api/tripo-api.js';
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

  // Intro button visibility (appears after 3 seconds)
  const [showExploreBtn, setShowExploreBtn] = useState(false);

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

  /** Active 3D viewer (when viewing a ready model) */
  const [planet3DViewer, setPlanet3DViewer] = useState<{
    glbUrl: string;
    planetName: string;
    starColor?: string;
  } | null>(null);

  /** Surface view target */
  const [surfaceTarget, setSurfaceTarget] = useState<{
    planet: Planet;
    star: Star;
  } | null>(null);

  /** Quarks (in-game currency) */
  const [quarks, setQuarks] = useState<number>(0);
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  // ── Warp animation state ──────────────────────────────────────────────
  const [warpTarget, setWarpTarget] = useState<StarSystem | null>(null);

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

    getPlayerModels(pid).then(setPlanetModels).catch(() => {});
    getPlayerAliases(pid).then(setAliases).catch(() => {});
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

  useEffect(() => {
    const timer = setTimeout(() => setShowExploreBtn(true), 3000);
    return () => clearTimeout(timer);
  }, []);

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
      onSystemSelect: (system) => {
        setState((prev) => ({ ...prev, selectedSystem: system, selectedPlanet: null }));
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
      engineRef.current?.showPlanetViewScene(state.selectedSystem, state.selectedPlanet);
      setState((prev) => ({
        ...prev,
        scene: 'planet-view' as const,
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

  const handleView3DModel = useCallback(() => {
    if (!state.selectedPlanet || !state.selectedSystem) return;
    const model = planetModels.find(
      (m) => m.planet_id === state.selectedPlanet!.id && m.system_id === state.selectedSystem!.id && m.status === 'ready',
    );
    if (model?.glb_url) {
      setPlanet3DViewer({
        glbUrl: model.glb_url,
        planetName: state.selectedPlanet.name,
      });
    }
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

  const handleClose3DViewer = useCallback(() => {
    setPlanet3DViewer(null);
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

  // Helper: get model for currently selected planet
  const selectedPlanetModel = state.selectedPlanet && state.selectedSystem
    ? planetModels.find(
        (m) => m.planet_id === state.selectedPlanet!.id && m.system_id === state.selectedSystem!.id,
      )
    : undefined;

  // Determine which panel to show for the selected system
  const selectedSystem = state.selectedSystem;
  const showResearchPanel = selectedSystem
    && state.scene === 'galaxy'
    && selectedSystem.ownerPlayerId === null
    && !isSystemFullyResearched(researchState, selectedSystem.id);

  const showSystemInfoPanel = selectedSystem
    && state.scene === 'galaxy'
    && (selectedSystem.ownerPlayerId !== null || isSystemFullyResearched(researchState, selectedSystem.id));

  // Timer text for the selected system's active slot
  const activeSlotTimer = selectedSystem
    ? (() => {
        const slot = researchState.slots.find((s) => s.systemId === selectedSystem.id);
        return slot ? slotTimers[slot.slotIndex] ?? null : null;
      })()
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
      if (showExploreBtn) {
        toolGroups.push({
          type: 'buttons',
          items: [{
            id: 'explore',
            label: 'Дослідити галактику',
            onClick: handleStartExploration,
            variant: 'primary',
          }],
        });
      }
      toolGroups.push({
        type: 'zoom',
        items: [
          { id: 'zoom-in', label: '+', onClick: () => engineRef.current?.homePlanetZoomIn() },
          { id: 'zoom-out', label: '\u2212', onClick: () => engineRef.current?.homePlanetZoomOut() },
        ],
      });
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
        { id: 'surface', label: 'Поверхня', onClick: handleOpenSurface },
        { id: 'info', label: 'Інфо', onClick: handleShowCharacteristics },
      ];
      if (selectedPlanetModel?.status === 'ready' && selectedPlanetModel?.glb_url) {
        tools.push({ id: '3d', label: '3D', onClick: handleView3DModel });
      } else {
        tools.push({ id: '3d', label: '3D', onClick: handleUpgradePlanet, variant: 'accent' });
      }
      toolGroups.push({ type: 'buttons', items: tools });
      toolGroups.push({
        type: 'zoom',
        items: [
          { id: 'zoom-in', label: '+', onClick: () => engineRef.current?.planetViewZoomIn() },
          { id: 'zoom-out', label: '\u2212', onClick: () => engineRef.current?.planetViewZoomOut() },
        ],
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
      {state.showPlanetMenu && state.selectedPlanet && state.planetClickPos && state.scene === 'system' && (
        <PlanetContextMenu
          planet={state.selectedPlanet}
          screenPosition={state.planetClickPos}
          onViewPlanet={handleViewPlanet}
          onShowCharacteristics={handleShowCharacteristics}
          onClose={handleClosePlanetMenu}
          onSurface={handleOpenSurface}
          onUpgrade={handleUpgradePlanet}
          onView3D={handleView3DModel}
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
          onView3D={handleView3DModel}
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
      {/* 3D Planet Viewer */}
      {planet3DViewer && (
        <Planet3DViewer
          glbUrl={planet3DViewer.glbUrl}
          planetName={planet3DViewer.planetName}
          starColor={planet3DViewer.starColor}
          onClose={handleClose3DViewer}
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
    </>
  );
}
