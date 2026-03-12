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
  /** Called when player wants to enter a system (double-click). App shows warp overlay then calls enterSystem(). */
  onWarpToSystem?: (system: StarSystem) => void;
}

const GALAXY_SEED = 42;
const PLAYER_INDEX = 0;

export class GameEngine {
  private app: Application;
  private container: HTMLElement;
  private callbacks: GameCallbacks;
  private camera!: CameraController;

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

  constructor(container: HTMLElement, callbacks: GameCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
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

    // Generate player data
    this.playerPos = assignPlayerPosition(GALAXY_SEED, PLAYER_INDEX);
    this.rings = generatePlayerRings(GALAXY_SEED, this.playerPos.x, this.playerPos.y, 'player-0');

    // Start with home planet intro
    this.showHomePlanetScene();

    // Animation loop
    this.app.ticker.add(() => {
      const dt = this.app.ticker.deltaMS;
      this.camera.update(dt);
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

  showHomePlanetScene() {
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

    this.homePlanetScene = new HomePlanetScene(homeSystem, homePlanet, w, h);
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
      GALAXY_SEED,
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
          if (this.callbacks.onWarpToSystem) {
            // Use warp animation — App will call enterSystem() after animation
            this.callbacks.onWarpToSystem(system);
          } else {
            // Fallback: instant transition
            this.showSystemScene(system);
            this.callbacks.onSceneChange('system');
          }
        } else {
          // Just select it (will show research panel)
          this.callbacks.onSystemSelect(system);
        }
      },
    );

    this.app.stage.addChild(this.galaxyScene.container);
    this.activeScene = this.galaxyScene.container;
    // Directional navigation layout — no pan/zoom, position HOME slightly above center
    this.camera.detach();
    this.galaxyScene.container.x = this.app.screen.width / 2;
    this.galaxyScene.container.y = this.app.screen.height * 0.42;
    this.callbacks.onSceneChange('galaxy');
  }

  showSystemScene(system: StarSystem) {
    this.clearScenes();

    this.systemScene = new SystemScene(system, (planet, screenPos) => {
      this.callbacks.onPlanetSelect(planet, screenPos);
    });

    this.app.stage.addChild(this.systemScene.container);
    this.activeScene = this.systemScene.container;
    this.camera.attach(this.systemScene.container);

    // Set min zoom so background star field always covers the screen (no dark edges)
    const { fieldSize, maxExtent } = this.systemScene;
    const screenDim = Math.max(this.app.screen.width, this.app.screen.height);
    const dynamicMinScale = fieldSize > 0 ? screenDim / fieldSize : 0.1;
    this.camera.setMinScale(Math.max(0.05, dynamicMinScale));

    // Fit all planets on screen
    this.camera.resetToFit(maxExtent);
    this.callbacks.onSceneChange('system');
  }

  showPlanetViewScene(system: StarSystem, planet: Planet) {
    this.clearScenes();

    const w = this.app.screen.width;
    const h = this.app.screen.height;

    this.planetViewScene = new PlanetViewScene(system, planet, w, h);
    this.app.stage.addChild(this.planetViewScene.container);
    this.app.stage.addChild(this.planetViewScene.vignetteOverlay);
    this.activeScene = this.planetViewScene.container;
    this.camera.detach();
    this.setupPlanetViewInput();
    this.callbacks.onSceneChange('planet-view');
  }

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

  /** Enter a system (called after warp animation completes) */
  enterSystem(system: StarSystem) {
    this.showSystemScene(system);
    this.callbacks.onSceneChange('system');
  }

  /** Get all systems from all rings. */
  getAllSystems(): StarSystem[] {
    return this.rings.flatMap((r) => r.starSystems);
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
    // Reset camera min zoom (was overridden in system scene)
    this.camera.setMinScale(0.1);

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

  destroy() {
    this.clearScenes();
    this.camera.destroy();
    this.app.destroy(true);
  }
}
