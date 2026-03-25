import { Application, Container } from 'pixi.js';
import {
  generatePlayerRings,
  assignPlayerPosition,
  isSystemFullyResearched,
  type StarSystem,
  type Planet,
  type GalaxyRing,
  type ResearchState,
} from '@nebulife/core';
import { GalaxyScene } from './scenes/GalaxyScene.js';
import { SystemScene } from './scenes/SystemScene.js';
import { CameraController } from './camera/CameraController.js';

export interface GameCallbacks {
  onSystemSelect: (system: StarSystem, screenPos?: { x: number; y: number }) => void;
  onPlanetSelect: (planet: Planet, screenPos: { x: number; y: number }) => void;
  onSceneChange: (scene: 'galaxy' | 'system' | 'home-intro' | 'planet-view') => void;
  /** Called when telescope icon is clicked on galaxy map. */
  onTelescopeClick?: (system: StarSystem) => void;
  /** Called on double-click of non-fully-researched star to open research panel */
  onRequestResearch?: (system: StarSystem) => void;
  /** Called when a star is expanded enough to show the radial menu */
  onRadialOpen?: (system: StarSystem, getScreenPos: () => { x: number; y: number } | null) => void;
  /** Called when radial menu should close (collapse, unfocus, transition) */
  onRadialClose?: () => void;
  /** Called when a star is hovered (systemId + researchProgress 0-100), null when unhovered */
  onHoverSystem?: (systemId: string | null, progress: number) => void;
}

export class GameEngine {
  private app: Application;
  private container: HTMLElement;
  private callbacks: GameCallbacks;
  private camera!: CameraController;
  private playerIndex: number;
  private galaxySeed: number;

  private galaxyScene: GalaxyScene | null = null;
  private systemScene: SystemScene | null = null;
  private activeScene: Container | null = null;

  private rings: GalaxyRing[] = [];
  private playerPos = { x: 0, y: 0 };
  private researchState: ResearchState = { slots: [], systems: {} };

  constructor(container: HTMLElement, callbacks: GameCallbacks, playerIndex = 0, galaxySeed = 42) {
    this.container = container;
    this.callbacks = callbacks;
    this.playerIndex = playerIndex;
    this.galaxySeed = galaxySeed;
    this.app = new Application();
  }

  async init() {
    await this.app.init({
      background: 0x020510,
      resizeTo: this.container,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 1.5),
      autoDensity: true,
    });

    this.container.appendChild(this.app.canvas);

    this.camera = new CameraController(this.app);

    // Generate player data — playerIndex determines position in galaxy
    this.playerPos = assignPlayerPosition(this.galaxySeed, this.playerIndex);
    this.rings = generatePlayerRings(this.galaxySeed, this.playerPos.x, this.playerPos.y, `player-${this.playerIndex}`);

    // Start with home planet intro (PlanetGlobeView handles rendering)
    this.showHomePlanetScene();

    // Animation loop
    this.app.ticker.add(() => {
      const dt = this.app.ticker.deltaMS;
      this.camera.update(dt);
      // Freeze orbit animations during zoom/pinch to prevent jitter
      if (this.systemScene) this.systemScene.freezeOrbits = this.camera.isZooming;
      this.galaxyScene?.update(dt);
      this.systemScene?.update(dt);
    });
  }

  setResearchState(state: ResearchState) {
    this.researchState = state;
  }

  /** Update a single system's visual on the galaxy map without full re-render. */
  updateSystemResearchVisual(systemId: string, state: ResearchState) {
    this.researchState = state;
    this.galaxyScene?.updateSystemVisual(systemId, state);
  }

  showHomePlanetScene(_startHidden = false) {
    this.clearScenes();
    this.camera.detach();
    this.callbacks.onSceneChange('home-intro');
  }

  showGalaxyScene() {
    this.clearScenes();

    this.galaxyScene = new GalaxyScene(
      this.rings,
      this.galaxySeed,
      this.playerPos.x,
      this.playerPos.y,
      this.researchState,
      (system, screenPos) => {
        // New directional layout — no camera animation needed
        this.callbacks.onSystemSelect(system, screenPos);
      },
      (system) => {
        // Double-click: unfocus first, then navigate
        this.galaxyScene?.unfocusSystem();
        // Only enter if home or fully researched
        const canEnter = system.ownerPlayerId !== null
          || isSystemFullyResearched(this.researchState, system.id);
        if (canEnter) {
          // Center camera on target star during transition (non-home stars)
          if (system.ownerPlayerId === null) {
            const worldPos = this.galaxyScene?.getSystemWorldPosition(system.id);
            if (worldPos) {
              this.camera.animateTo(worldPos.x, worldPos.y, this.camera.getCurrentScale(), 1500);
            }
          }
          // Start star-fold transition in GalaxyScene, then switch to system
          // Set selectedSystem INSIDE callback to avoid briefly showing SystemInfoPanel
          this.galaxyScene?.startTransition(system.id, () => {
            this.callbacks.onSystemSelect(system);
            this.showSystemScene(system);
          });
        } else {
          // Not fully researched — open research/observatory panel
          this.callbacks.onSystemSelect(system);
          this.callbacks.onRequestResearch?.(system);
        }
      },
      this.callbacks.onTelescopeClick ? (system) => {
        this.callbacks.onTelescopeClick!(system);
      } : undefined,
      () => this.camera.recentlyInteracted,
      // Expand callback: smoothly center camera on the expanded system
      (system) => {
        const worldPos = this.galaxyScene?.getSystemWorldPosition(system.id);
        if (worldPos) {
          this.camera.animateTo(worldPos.x, worldPos.y, this.camera.getCurrentScale(), 800);
        }
      },
      // Radial menu open callback
      this.callbacks.onRadialOpen ? (system, getScreenPos) => {
        this.callbacks.onRadialOpen!(system, getScreenPos);
      } : undefined,
      // Radial menu close callback
      this.callbacks.onRadialClose ? () => {
        this.callbacks.onRadialClose!();
      } : undefined,
      // Hover system callback (for animated progress counter in UI)
      this.callbacks.onHoverSystem ? (systemId: string | null, progress: number) => {
        this.callbacks.onHoverSystem!(systemId, progress);
      } : undefined,
    );

    this.app.stage.addChild(this.galaxyScene.container);
    this.activeScene = this.galaxyScene.container;

    // Force resize to fix stale viewport dimensions after overlay transitions
    this.app.resize();

    // Enable camera zoom/pan for galaxy hex grid
    this.camera.attach(this.galaxyScene.container);
    this.camera.setMinScale(0.4);
    // Pan bounds: limit movement to galaxy backdrop area
    this.camera.setPanBounds(250);
    // Position HOME at center of screen
    this.galaxyScene.container.x = this.app.screen.width / 2;
    this.galaxyScene.container.y = this.app.screen.height * 0.45;
    this.camera.resetToFit(200);
    this.callbacks.onSceneChange('galaxy');
  }

  showSystemScene(system: StarSystem) {
    this.clearScenes();

    // Force resize to fix stale viewport dimensions after overlay transitions
    this.app.resize();

    // Check localStorage for destroyed planets in this system
    let destroyedIds: Set<string> | undefined;
    try {
      const raw = localStorage.getItem('nebulife_destroyed_planets');
      if (raw) {
        const arr = JSON.parse(raw) as Array<{ planetId: string; systemId: string }>;
        const systemDestroyedIds = arr.filter(d => d.systemId === system.id).map(d => d.planetId);
        if (systemDestroyedIds.length > 0) destroyedIds = new Set(systemDestroyedIds);
      }
    } catch { /* ignore */ }

    this.systemScene = new SystemScene(
      system,
      (planet, screenPos) => {
        this.callbacks.onPlanetSelect(planet, screenPos);
      },
      () => this.camera.recentlyInteracted,
      destroyedIds,
    );

    this.app.stage.addChild(this.systemScene.container);
    this.activeScene = this.systemScene.container;
    this.camera.attach(this.systemScene.container);

    // Set min zoom so background star field always covers the screen (no dark edges)
    const { fieldSize, maxExtent } = this.systemScene;
    const screenDim = Math.max(this.app.screen.width, this.app.screen.height);
    const dynamicMinScale = fieldSize > 0 ? screenDim / fieldSize : 0.1;
    this.camera.setMinScale(Math.max(0.05, dynamicMinScale));

    // Limit pan to system bounds (can't scroll into empty space beyond stars)
    this.camera.setPanBounds(maxExtent * 1.5);

    // Fit all planets on screen
    this.camera.resetToFit(maxExtent);
    this.callbacks.onSceneChange('system');
  }

  showPlanetViewScene(_system: StarSystem, _planet: Planet, _startHidden = false) {
    this.clearScenes();
    this.camera.detach();
    this.callbacks.onSceneChange('planet-view');
  }

  // Galaxy camera controls
  galaxyZoomIn() { this.camera.zoomBy(1.3); }
  galaxyZoomOut() { this.camera.zoomBy(0.77); }
  galaxyCenterOnOrigin() { this.camera.centerOnOrigin(); }

  // System camera controls (system scene shares the camera)
  systemZoomIn() { this.camera.zoomBy(1.3); }
  systemZoomOut() { this.camera.zoomBy(0.77); }
  systemCenterOnOrigin() { this.camera.centerOnOrigin(); }

  /** Hide/show the PixiJS canvas (when PlanetGlobeView is active) */
  setPlanetVisible(_visible: boolean) {
    // No-op: PlanetGlobeView handles rendering independently via React overlay.
    // PixiJS canvas is hidden by CSS when scene is home-intro or planet-view.
  }

  /** Unfocus galaxy system (restores all stars to normal positions) */
  unfocusSystem() {
    this.galaxyScene?.unfocusSystem();
  }

  // ── Ship flight proxies ────────────────────────────────────────────

  /** Start ship flight in system scene toward target planet */
  startSystemShipFlight(targetPlanetId: string) {
    this.systemScene?.startShipFlight(targetPlanetId);
  }

  /** Get system scene ship progress (0→1) */
  getSystemShipProgress(): number {
    return this.systemScene?.getShipProgress() ?? 0;
  }

  /** Stop system scene ship flight */
  stopSystemShipFlight() {
    this.systemScene?.stopShipFlight();
  }

  /** Enter a system (called after warp animation completes) */
  enterSystem(system: StarSystem) {
    this.showSystemScene(system);
    // Note: showSystemScene already calls onSceneChange('system')
  }

  /** Get current screen position of a system (for React RadialMenu positioning) */
  getSystemScreenPosition(systemId: string): { x: number; y: number } | null {
    return this.galaxyScene?.getSystemScreenPosition(systemId) ?? null;
  }

  /** Navigate to nearest system in direction (for arrow key navigation) */
  galaxyNavigateDirection(dx: number, dy: number): boolean {
    return this.galaxyScene?.navigateDirection(dx, dy) ?? false;
  }

  /** Start the multi-phase warp transition in GalaxyScene (for radial menu "enter" action) */
  startGalaxyWarp(systemId: string, onComplete: () => void) {
    this.galaxyScene?.unfocusSystem();
    this.galaxyScene?.startTransition(systemId, onComplete);
  }

  /** Enter a system via radial menu — identical path to double-click on star */
  enterSystemDirect(system: StarSystem) {
    if (!this.galaxyScene) return;
    this.galaxyScene.unfocusSystem();
    if (system.ownerPlayerId === null) {
      const worldPos = this.galaxyScene.getSystemWorldPosition(system.id);
      if (worldPos) {
        this.camera.animateTo(worldPos.x, worldPos.y, this.camera.getCurrentScale(), 1500);
      }
    }
    this.galaxyScene.startTransition(system.id, () => {
      this.callbacks.onSystemSelect(system);
      this.showSystemScene(system);
    });
  }

  /** Get all systems from all rings. */
  getAllSystems(): StarSystem[] {
    return this.rings.flatMap((r) => r.starSystems);
  }

  /**
   * Relocate the "home" to a different system/planet after evacuation.
   * Clears ownerPlayerId + isHomePlanet on the old home, sets them on the new one.
   */
  updateHomeSystem(newSystemId: string, newPlanetId: string) {
    const allSystems = this.getAllSystems();
    // Validate new system exists before clearing old home
    const newSys = allSystems.find((s) => s.id === newSystemId);
    if (!newSys) return; // Stale ID — don't clear the existing home

    // Clear old home markers
    for (const sys of allSystems) {
      if (sys.ownerPlayerId !== null) {
        sys.ownerPlayerId = null;
        for (const p of sys.planets) {
          if (p.isHomePlanet) p.isHomePlanet = false;
        }
      }
    }
    // Set new home
    newSys.ownerPlayerId = 'player-0';
    const newPlanet = newSys.planets.find((p) => p.id === newPlanetId);
    if (newPlanet) newPlanet.isHomePlanet = true;
  }

  private clearScenes() {
    // Reset camera constraints (overridden in system scene)
    this.camera.setMinScale(0.1);
    this.camera.setPanBounds(null);

    if (this.galaxyScene) {
      this.app.stage.removeChild(this.galaxyScene.container);
      this.galaxyScene.destroy();
      this.galaxyScene = null;
    }
    if (this.systemScene) {
      this.app.stage.removeChild(this.systemScene.container);
      this.systemScene.destroy();
      this.systemScene = null;
    }
  }

  pause() {
    this.app.ticker.stop();
  }

  resume() {
    this.app.ticker.start();
  }

  /* ── Cinematic mode ──────────────────────────────────────── */

  /** Enable/disable cinematic mode (blocks user input + star clicks) */
  setCinematicMode(enabled: boolean) {
    this.camera.setInputEnabled(!enabled);
    this.galaxyScene?.setCinematicMode(enabled);
  }

  /** Programmatic camera animation (for cinematic intro) */
  animateCameraTo(worldX: number, worldY: number, scale: number, durationMs: number) {
    this.camera.animateTo(worldX, worldY, scale, durationMs);
  }

  /** Get current camera scale */
  getCameraScale(): number {
    return this.camera.getCurrentScale();
  }

  /** Add fake player markers to galaxy scene */
  addFakePlayerMarkers(count: number) {
    this.galaxyScene?.addFakePlayerMarkers(count);
  }

  /** Remove fake player markers */
  removeFakePlayerMarkers() {
    this.galaxyScene?.removeFakePlayerMarkers();
  }

  /** Toggle per-star research % labels on galaxy map */
  setGalaxyResearchLabels(enabled: boolean) {
    this.galaxyScene?.showResearchLabels(enabled);
  }

  destroy() {
    this.clearScenes();
    this.camera.destroy();
    this.app.destroy(true);
  }
}
