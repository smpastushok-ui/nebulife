import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine.js';
import { HUD } from './ui/components/HUD.js';
import { PlanetInfoPanel } from './ui/components/PlanetInfoPanel.js';
import { PlanetContextMenu } from './ui/components/PlanetContextMenu.js';
import { SystemInfoPanel } from './ui/components/SystemInfoPanel.js';
import { ResearchPanel } from './ui/components/ResearchPanel.js';
import { ResearchCompleteModal } from './ui/components/ResearchCompleteModal.js';
import { DiscoveryNotification } from './ui/components/DiscoveryNotification.js';
import { ObservatoryView } from './ui/components/ObservatoryView.js';
import type { Planet, StarSystem, ResearchState, SystemResearchState, Discovery } from '@nebulife/core';
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
import { getOrCreatePlayerId } from './api/player-api.js';

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
    // The server already persists the photo_url when Kling completes,
    // so this is mainly for any additional client-side bookkeeping.
    console.log(`[Gallery] Saved discovery ${discoveryId} with image ${imageUrl}`);
  }, []);

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
      {state.scene !== 'home-intro' && (
        <HUD
          scene={state.scene}
          playerName={state.playerName}
          onBackToGalaxy={state.scene === 'system' ? handleBackToGalaxy : undefined}
          onBackToSystem={state.scene === 'planet-view' ? handleBackToSystem : undefined}
          onGoToHomePlanet={handleGoToHomePlanet}
        />
      )}
      {state.scene === 'home-intro' && showExploreBtn && (
        <button
          onClick={handleStartExploration}
          style={{
            position: 'absolute',
            bottom: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '14px 36px',
            background: 'rgba(10,20,40,0.7)',
            border: '1px solid rgba(100,160,220,0.4)',
            borderRadius: 6,
            color: '#aaccee',
            fontFamily: 'monospace',
            fontSize: 16,
            cursor: 'pointer',
            zIndex: 10,
            pointerEvents: 'auto',
            animation: 'fadeIn 1.5s ease-in',
          }}
        >
          Дослідити галактику &rarr;
        </button>
      )}
      {state.scene === 'home-intro' && (
        <div style={{
          position: 'absolute', right: 16, bottom: 80,
          display: 'flex', flexDirection: 'column', gap: 6,
          pointerEvents: 'auto', zIndex: 10,
        }}>
          {[
            { label: '+', fn: () => engineRef.current?.homePlanetZoomIn() },
            { label: '\u2212', fn: () => engineRef.current?.homePlanetZoomOut() },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={btn.fn}
              style={{
                width: 36, height: 36,
                background: 'rgba(10,20,40,0.7)',
                border: '1px solid rgba(100,160,220,0.3)',
                borderRadius: 4,
                color: '#8899aa',
                fontFamily: 'monospace',
                fontSize: 18,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
      {state.scene === 'planet-view' && (
        <>
          <div style={{
            position: 'absolute', right: 16, bottom: 80,
            display: 'flex', flexDirection: 'column', gap: 6,
            pointerEvents: 'auto', zIndex: 10,
          }}>
            {[
              { label: '+', fn: () => engineRef.current?.planetViewZoomIn() },
              { label: '\u2212', fn: () => engineRef.current?.planetViewZoomOut() },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={btn.fn}
                style={{
                  width: 36, height: 36,
                  background: 'rgba(10,20,40,0.7)',
                  border: '1px solid rgba(100,160,220,0.3)',
                  borderRadius: 4,
                  color: '#8899aa',
                  fontFamily: 'monospace',
                  fontSize: 18,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
          {state.selectedPlanet && (
            <div style={{
              position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              fontFamily: 'monospace', color: '#aaccee', fontSize: 14,
              background: 'rgba(10,20,40,0.5)', padding: '6px 16px', borderRadius: 4,
              pointerEvents: 'none', zIndex: 10,
            }}>
              {state.selectedPlanet.name}
            </div>
          )}
        </>
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
          onEnterSystem={() => handleEnterSystem(selectedSystem!)}
          onClose={() => setState((prev) => ({ ...prev, selectedSystem: null }))}
        />
      )}
      {state.showPlanetMenu && state.selectedPlanet && state.planetClickPos && state.scene === 'system' && (
        <PlanetContextMenu
          planet={state.selectedPlanet}
          screenPosition={state.planetClickPos}
          onViewPlanet={handleViewPlanet}
          onShowCharacteristics={handleShowCharacteristics}
          onClose={handleClosePlanetMenu}
        />
      )}
      {state.showPlanetInfo && state.selectedPlanet && state.scene === 'system' && (
        <PlanetInfoPanel
          planet={state.selectedPlanet}
          onClose={() => setState((prev) => ({ ...prev, showPlanetInfo: false, selectedPlanet: null }))}
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
    </>
  );
}
