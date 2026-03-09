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
  onSystemSelect: (system: StarSystem) => void;
  onPlanetSelect: (planet: Planet, screenPos: { x: number; y: number }) => void;
  onSceneChange: (scene: 'galaxy' | 'system' | 'home-intro' | 'planet-view') => void;
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
      this.galaxyScene?.update(this.app.ticker.deltaMS);
      this.systemScene?.update(this.app.ticker.deltaMS);
      this.homePlanetScene?.update(this.app.ticker.deltaMS);
      this.planetViewScene?.update(this.app.ticker.deltaMS);
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
      (system) => {
        this.callbacks.onSystemSelect(system);
      },
      (system) => {
        // Only enter if home or fully researched
        const canEnter = system.ownerPlayerId !== null
          || isSystemFullyResearched(this.researchState, system.id);
        if (canEnter) {
          this.callbacks.onSystemSelect(system);
          this.showSystemScene(system);
          this.callbacks.onSceneChange('system');
        } else {
          // Just select it (will show research panel)
          this.callbacks.onSystemSelect(system);
        }
      },
    );

    this.app.stage.addChild(this.galaxyScene.container);
    this.activeScene = this.galaxyScene.container;
    this.camera.attach(this.galaxyScene.container);
    this.camera.reset();
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
    // Fit all planets on screen
    this.camera.resetToFit(this.systemScene.maxExtent);
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
    this.callbacks.onSceneChange('planet-view');
  }

  // Home planet camera controls
  homePlanetZoomIn() { this.homePlanetScene?.zoomIn(); }
  homePlanetZoomOut() { this.homePlanetScene?.zoomOut(); }

  // Planet view camera controls
  planetViewZoomIn() { this.planetViewScene?.zoomIn(); }
  planetViewZoomOut() { this.planetViewScene?.zoomOut(); }

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

  private clearScenes() {
    this.teardownHomePlanetInput();

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
