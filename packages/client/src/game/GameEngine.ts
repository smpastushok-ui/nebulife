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
import { HomePlanetScene } from './scenes/HomePlanetScene.js';
import { PlanetViewScene } from './scenes/PlanetViewScene.js';
import { CameraController } from './camera/CameraController.js';

export interface GameCallbacks {
  onSystemSelect: (system: StarSystem, screenPos?: { x: number; y: number }) => void;
  onPlanetSelect: (planet: Planet, screenPos: { x: number; y: number }) => void;
  onSceneChange: (scene: 'galaxy' | 'system' | 'home-intro' | 'planet-view') => void;
  /** Called when telescope icon is clicked on galaxy map. */
  onTelescopeClick?: (system: StarSystem) => void;
  /** Called on double-click of non-fully-researched star to open research panel */
  onRequestResearch?: (system: StarSystem) => void;
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
  private homePlanetScene: HomePlanetScene | null = null;
  private planetViewScene: PlanetViewScene | null = null;
  private activeScene: Container | null = null;

  private rings: GalaxyRing[] = [];
  private playerPos = { x: 0, y: 0 };
  private researchState: ResearchState = { slots: [], systems: {} };

  // Home planet drag/pan state
  private hpDragging = false;
  private hpLastPointerX = 0;
  private hpOnPointerDown: ((e: PointerEvent) => void) | null = null;
  private hpOnPointerMove: ((e: PointerEvent) => void) | null = null;
  private hpOnPointerUp: ((e: PointerEvent) => void) | null = null;

  // Planet view drag/rotate + wheel zoom state
  private pvDragging = false;
  private pvLastPointerX = 0;
  private pvOnPointerDown: ((e: PointerEvent) => void) | null = null;
  private pvOnPointerMove: ((e: PointerEvent) => void) | null = null;
  private pvOnPointerUp: ((e: PointerEvent) => void) | null = null;
  private pvOnWheel: ((e: WheelEvent) => void) | null = null;

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
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    this.container.appendChild(this.app.canvas);

    this.camera = new CameraController(this.app);

    // Generate player data — playerIndex determines position in galaxy
    this.playerPos = assignPlayerPosition(this.galaxySeed, this.playerIndex);
    this.rings = generatePlayerRings(this.galaxySeed, this.playerPos.x, this.playerPos.y, `player-${this.playerIndex}`);

    // Start with home planet intro (hidden by default — App visibility effect decides)
    this.showHomePlanetScene(true);

    // Animation loop
    this.app.ticker.add(() => {
      const dt = this.app.ticker.deltaMS;
      this.camera.update(dt);
      // Freeze orbit animations during zoom/pinch to prevent jitter
      if (this.systemScene) this.systemScene.freezeOrbits = this.camera.isZooming;
      this.galaxyScene?.update(dt);
      this.systemScene?.update(dt);
      this.homePlanetScene?.update(dt);
      this.planetViewScene?.update(dt);
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

  showHomePlanetScene(startHidden = false) {
    this.clearScenes();

    // Find home system and its best planet
    const homeSystem = this.getAllSystems().find((s) => s.ownerPlayerId !== null);
    if (!homeSystem) {
      // Fallback to galaxy if no home system
      this.showGalaxyScene();
      return;
    }
    const homePlanet = homeSystem.planets.find((p) => p.isHomePlanet) ?? homeSystem.planets[0];

    const w = this.app.screen.width;
    const h = this.app.screen.height;

    // Force resize to fix stale viewport dimensions after overlay transitions
    this.app.resize();

    this.homePlanetScene = new HomePlanetScene(homeSystem, homePlanet, w, h);
    // Start planet hidden to prevent PixiJS flash; visibility useEffect will show if no 3D model
    if (startHidden) this.homePlanetScene.setPlanetVisible(false);
    this.app.stage.addChild(this.homePlanetScene.container);
    this.app.stage.addChild(this.homePlanetScene.vignetteOverlay);
    this.activeScene = this.homePlanetScene.container;
    // No camera controller — rotation disabled for now
    this.camera.detach();
    // this.setupHomePlanetInput();
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
          this.callbacks.onSystemSelect(system);
          // Center camera on target star during transition (non-home stars)
          if (system.ownerPlayerId === null) {
            const worldPos = this.galaxyScene?.getSystemWorldPosition(system.id);
            if (worldPos) {
              this.camera.animateTo(worldPos.x, worldPos.y, this.camera.getCurrentScale(), 1500);
            }
          }
          // Start star-fold transition in GalaxyScene, then switch to system
          this.galaxyScene?.startTransition(system.id, () => {
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

  showPlanetViewScene(system: StarSystem, planet: Planet, startHidden = false) {
    this.clearScenes();

    const w = this.app.screen.width;
    const h = this.app.screen.height;

    this.planetViewScene = new PlanetViewScene(system, planet, w, h);
    // Start planet hidden to prevent PixiJS flash; visibility useEffect will show it if no 3D model
    if (startHidden) this.planetViewScene.setPlanetVisible(false);
    this.app.stage.addChild(this.planetViewScene.container);
    this.app.stage.addChild(this.planetViewScene.vignetteOverlay);
    this.activeScene = this.planetViewScene.container;
    this.camera.detach();
    this.setupPlanetViewInput();
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

  // Home planet camera controls
  homePlanetZoomIn() { this.homePlanetScene?.zoomIn(); }
  homePlanetZoomOut() { this.homePlanetScene?.zoomOut(); }

  // Planet view camera controls
  planetViewZoomIn() { this.planetViewScene?.zoomIn(); }
  planetViewZoomOut() { this.planetViewScene?.zoomOut(); }

  /** Hide/show the PixiJS procedural planet (when 3D model is active) */
  setPlanetVisible(visible: boolean) {
    this.homePlanetScene?.setPlanetVisible(visible);
    this.planetViewScene?.setPlanetVisible(visible);
  }

  /** Unfocus galaxy system (restores all stars to normal positions) */
  unfocusSystem() {
    this.galaxyScene?.unfocusSystem();
  }

  /** Activate scanning effects on home planet */
  startHomeScanning() {
    this.homePlanetScene?.startScanning();
  }

  /** Deactivate scanning effects on home planet */
  stopHomeScanning() {
    this.homePlanetScene?.stopScanning();
  }

  /** Update scanning progress (0-100) */
  updateScanProgress(progress: number) {
    this.homePlanetScene?.updateScanProgress(progress);
  }

  /** Activate scanning effects on planet-view scene */
  startPlanetViewScanning() {
    this.planetViewScene?.startScanning();
  }

  /** Deactivate scanning effects on planet-view scene */
  stopPlanetViewScanning() {
    this.planetViewScene?.stopScanning();
  }

  /** Update scanning progress on planet-view scene (0-100) */
  updatePlanetViewScanProgress(progress: number) {
    this.planetViewScene?.updateScanProgress(progress);
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

  /** Start ship approach in planet-view scene */
  startPlanetViewShipApproach() {
    this.planetViewScene?.startShipApproach();
  }

  /** Is planet-view ship on orbit? */
  isPlanetViewShipOnOrbit(): boolean {
    return this.planetViewScene?.isShipOnOrbit() ?? false;
  }

  /** Stop planet-view ship flight */
  stopPlanetViewShipFlight() {
    this.planetViewScene?.stopShipFlight();
  }

  /** Enter a system (called after warp animation completes) */
  enterSystem(system: StarSystem) {
    this.showSystemScene(system);
    // Note: showSystemScene already calls onSceneChange('system')
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
    const newSys = allSystems.find((s) => s.id === newSystemId);
    if (newSys) {
      newSys.ownerPlayerId = 'player-0';
      const newPlanet = newSys.planets.find((p) => p.id === newPlanetId);
      if (newPlanet) newPlanet.isHomePlanet = true;
    }
  }

  /** Setup mouse/touch drag-to-rotate for home planet scene */
  private setupHomePlanetInput() {
    const canvas = this.app.canvas;
    canvas.style.touchAction = 'none'; // prevent browser scroll/zoom on touch

    this.hpOnPointerDown = (e: PointerEvent) => {
      // Ignore left mouse button — only allow touch and middle/right mouse
      if (e.pointerType === 'mouse' && e.button === 0) return;
      this.hpDragging = true;
      this.hpLastPointerX = e.clientX;
    };

    this.hpOnPointerMove = (e: PointerEvent) => {
      if (!this.hpDragging || !this.homePlanetScene) return;
      const dx = e.clientX - this.hpLastPointerX;
      this.hpLastPointerX = e.clientX;
      this.homePlanetScene.rotate(-dx * 0.003);
    };

    this.hpOnPointerUp = () => {
      this.hpDragging = false;
    };

    canvas.addEventListener('pointerdown', this.hpOnPointerDown);
    canvas.addEventListener('pointermove', this.hpOnPointerMove);
    canvas.addEventListener('pointerup', this.hpOnPointerUp);
    canvas.addEventListener('pointerleave', this.hpOnPointerUp);
    canvas.addEventListener('pointercancel', this.hpOnPointerUp);
  }

  /** Remove home planet drag listeners */
  private teardownHomePlanetInput() {
    const canvas = this.app.canvas;
    if (this.hpOnPointerDown) {
      canvas.removeEventListener('pointerdown', this.hpOnPointerDown);
      canvas.removeEventListener('pointermove', this.hpOnPointerMove!);
      canvas.removeEventListener('pointerup', this.hpOnPointerUp!);
      canvas.removeEventListener('pointerleave', this.hpOnPointerUp!);
      canvas.removeEventListener('pointercancel', this.hpOnPointerUp!);
      this.hpOnPointerDown = null;
      this.hpOnPointerMove = null;
      this.hpOnPointerUp = null;
    }
    this.hpDragging = false;
  }

  /** Setup mouse/touch wheel-zoom + drag-rotate for planet view scene */
  private setupPlanetViewInput() {
    const canvas = this.app.canvas;
    canvas.style.touchAction = 'none';

    this.pvOnPointerDown = (e: PointerEvent) => {
      this.pvDragging = true;
      this.pvLastPointerX = e.clientX;
    };

    this.pvOnPointerMove = (e: PointerEvent) => {
      if (!this.pvDragging || !this.planetViewScene) return;
      const dx = e.clientX - this.pvLastPointerX;
      this.pvLastPointerX = e.clientX;
      this.planetViewScene.rotate(-dx * 0.004);
    };

    this.pvOnPointerUp = () => {
      this.pvDragging = false;
    };

    this.pvOnWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 0) {
        this.planetViewScene?.zoomOut();
      } else {
        this.planetViewScene?.zoomIn();
      }
    };

    canvas.addEventListener('pointerdown', this.pvOnPointerDown);
    canvas.addEventListener('pointermove', this.pvOnPointerMove);
    canvas.addEventListener('pointerup', this.pvOnPointerUp);
    canvas.addEventListener('pointerleave', this.pvOnPointerUp);
    canvas.addEventListener('pointercancel', this.pvOnPointerUp);
    canvas.addEventListener('wheel', this.pvOnWheel, { passive: false });
  }

  /** Remove planet view drag/wheel listeners */
  private teardownPlanetViewInput() {
    const canvas = this.app.canvas;
    if (this.pvOnPointerDown) {
      canvas.removeEventListener('pointerdown', this.pvOnPointerDown);
      canvas.removeEventListener('pointermove', this.pvOnPointerMove!);
      canvas.removeEventListener('pointerup', this.pvOnPointerUp!);
      canvas.removeEventListener('pointerleave', this.pvOnPointerUp!);
      canvas.removeEventListener('pointercancel', this.pvOnPointerUp!);
      canvas.removeEventListener('wheel', this.pvOnWheel!);
      this.pvOnPointerDown = null;
      this.pvOnPointerMove = null;
      this.pvOnPointerUp = null;
      this.pvOnWheel = null;
    }
    this.pvDragging = false;
  }

  private clearScenes() {
    this.teardownHomePlanetInput();
    this.teardownPlanetViewInput();
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
    if (this.homePlanetScene) {
      this.app.stage.removeChild(this.homePlanetScene.container);
      this.app.stage.removeChild(this.homePlanetScene.vignetteOverlay);
      this.homePlanetScene.destroy();
      this.homePlanetScene = null;
    }
    if (this.planetViewScene) {
      this.app.stage.removeChild(this.planetViewScene.container);
      this.app.stage.removeChild(this.planetViewScene.vignetteOverlay);
      this.planetViewScene.destroy();
      this.planetViewScene = null;
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

  destroy() {
    this.clearScenes();
    this.camera.destroy();
    this.app.destroy(true);
  }
}
