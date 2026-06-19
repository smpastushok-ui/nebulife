import { Application, Container } from 'pixi.js';
import {
  generatePlayerRings,
  assignPlayerPosition,
  assignPlayerToGroup,
  isSystemFullyResearched,
  deriveGroupSeed,
  PLAYERS_PER_GROUP,
  generateGalaxyGroupCore,
  generateCoreStarSystem,
  type StarSystem,
  type Planet,
  type GalaxyRing,
  type ResearchState,
} from '@nebulife/core';
import { GalaxyScene } from './scenes/GalaxyScene.js';
import { SystemScene } from './scenes/SystemScene.js';
import type { PlanetMissionVisual, PlanetStatusVisual } from './scenes/SystemScene.js';
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
  /** Called when a faraway lite-orb (background star) is tapped — shows preview info */
  onLiteOrbTap?: (lite: import('@nebulife/core').LiteSystem) => void;
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
  private pendingSystemSwitch: StarSystem | null = null;
  private systemSwitchTimer: number | null = null;
  private systemFadeOverlay: HTMLDivElement | null = null;
  private systemFadeTimer: number | null = null;

  // Last-known system overlay state, cached so it survives the deferred
  // system-switch transition. The React effects push these against the OLD
  // (collapsing) scene 1s before the NEW scene mounts, so without caching the
  // status badges / labels / favorite stars are lost on every system change.
  private lastStatusVisuals: PlanetStatusVisual[] = [];
  private lastStatusVisible = false;
  private lastLabelsVisible = false;
  private lastFavoritePlanetIds: string[] = [];

  private rings: GalaxyRing[] = [];
  private playerPos = { x: 0, y: 0 };
  private researchState: ResearchState = { slots: [], systems: {} };
  private _neighborSystems: Array<{ system: StarSystem; ownerIndex: number }> = [];
  private _coreSystems: Array<{ system: StarSystem; coreId: number; depth: number; coreNeighborIds: number[] }> = [];
  private pendingRingUnlocks: number[] = [];
  private pendingBranchUnlocks: string[] = [];

  /** Galaxy-wide cluster info for background visualization */
  private groupCount = 1;
  private playerGroupIndex = 0;

  /**
   * Effective max ring from tech tree (HOME_RESEARCH_MAX_RING + max_ring_add).
   * Used to compute progressive BFS depth for core systems.
   * Set from App.tsx via setEffectiveMaxRing().
   */
  private effectiveMaxRing = 2;

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
    this.ensureSystemFadeOverlay();

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
    this.galaxyScene?.setResearchState(state);
  }

  /**
   * Set the effective max ring (HOME_RESEARCH_MAX_RING + tech tree max_ring_add).
   * This controls BFS depth into the galactic core:
   *   bfsDepth = max(3, effectiveMaxRing + 1)
   * Base (maxRing=2) → depth 3, ast-probe (maxRing=3) → depth 4,
   * ast-grav-scan (maxRing=4) → depth 5, etc. Capped at 12 (full core).
   */
  setEffectiveMaxRing(maxRing: number) {
    this.effectiveMaxRing = maxRing;
    this.galaxyScene?.setEffectiveMaxRing(maxRing);
    // App.tsx owns the rising-edge trigger so arena/popup deferral stays in
    // one place. This setter only updates tier visibility.
  }

  /**
   * Set galaxy-wide cluster info for background visualization.
   * Called from App.tsx after /api/universe/info resolves.
   * globalPlayerIndex is the player's index across ALL clusters.
   */
  setGroupInfo(globalPlayerIndex: number, groupCount: number) {
    const assignment = assignPlayerToGroup(globalPlayerIndex);
    this.playerGroupIndex = assignment.groupIndex;
    this.groupCount = groupCount;
  }

  /** Update a single system's visual on the galaxy map without full re-render. */
  updateSystemResearchVisual(systemId: string, state: ResearchState) {
    this.researchState = state;
    this.galaxyScene?.updateSystemVisual(systemId, state);
  }

  showHomePlanetScene(_startHidden = false) {
    this.clearScenes();
    this.camera.detach();
    // Home intro — no PixiJS animation needed, throttle to 30 FPS
    this.app.ticker.maxFPS = 30;
    this.callbacks.onSceneChange('home-intro');
  }

  showGalaxyScene() {
    this.clearScenes();

    this._neighborSystems = this.computeNeighborSystems();
    this._coreSystems = this.computeCoreSystems();

    this.galaxyScene = new GalaxyScene(
      this.rings,
      this.galaxySeed,
      this.playerPos.x,
      this.playerPos.y,
      this.researchState,
      this._neighborSystems,
      this._coreSystems,
      true, // expandedVisible: neighbor/core always rendered; Tier system controls fade/hide
      this.groupCount,
      this.playerGroupIndex,
      this.playerIndex,
      // Lite-orb tap: forward as a system-select callback so existing UI handles it
      (lite) => {
        if (this.callbacks.onLiteOrbTap) this.callbacks.onLiteOrbTap(lite);
      },
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
      // Effective max ring for 3-tier visibility
      this.effectiveMaxRing,
    );

    this.app.stage.addChild(this.galaxyScene.container);
    this.activeScene = this.galaxyScene.container;

    // Force resize to fix stale viewport dimensions after overlay transitions.
    // PixiJS v8 removed Application.resize() — call renderer.resize() with the
    // current window size instead. Optional-chaining keeps tests safe.
    this.app.renderer?.resize?.(window.innerWidth, window.innerHeight);

    // Pass screen size to GalaxyScene so viewport culling for lite-orbs works
    this.galaxyScene.setScreenSize(this.app.screen.width, this.app.screen.height);

    // Enable camera zoom/pan for galaxy hex grid
    this.camera.attach(this.galaxyScene.container);
    // Коментар українською: мобільний CSS viewport часто ~390px, тому старий
    // minScale 0.045 не вміщував крайні зорі 50-player кластера.
    const galaxyClusterRadius = 8200;
    const galaxyMinScale = Math.min(0.045, (Math.min(this.app.screen.width, this.app.screen.height) * 0.82) / (galaxyClusterRadius * 2));
    this.camera.setMinScale(galaxyMinScale);
    // Pan bounds widened so player can pan across the entire cluster —
    // including far neighbors and core-entry stars.
    this.camera.setPanBounds(galaxyClusterRadius);
    // Position HOME inside the mobile safe area: below the resource HUD and
    // above the bottom CommandBar/chat controls so stars do not start under UI.
    const isPortraitMobile = window.innerWidth < 700 && window.innerHeight > window.innerWidth;
    const galaxySafeTop = isPortraitMobile ? 92 : 0;
    const galaxySafeBottom = isPortraitMobile ? 150 : 0;
    const safeCenterY = galaxySafeTop + (this.app.screen.height - galaxySafeTop - galaxySafeBottom) / 2;
    const initialFitRadius = isPortraitMobile ? 330 : 320;
    // Position HOME at center of screen
    this.galaxyScene.container.x = this.app.screen.width / 2;
    this.galaxyScene.container.y = isPortraitMobile ? safeCenterY : this.app.screen.height * 0.45;
    // Initial zoom: fit own 19 systems (Ring 2 radius = 10 LY × PX_PER_LY
    // ≈ 180 px + jitter + margin). Wide cluster view was disorienting at
    // entry; player will zoom-out progressively as rings are completed
    // (ring-completion animation in follow-up release).
    this.camera.resetToFit(initialFitRadius);
    // Force lite-orbs redraw with correct viewport now that camera is positioned
    this.galaxyScene.refreshLiteOrbs();
    if (this.pendingRingUnlocks.length > 0) {
      const pending = [...this.pendingRingUnlocks];
      this.pendingRingUnlocks = [];
      pending.forEach((ring, index) => {
        window.setTimeout(() => this.playRingUnlock(ring), index * 900);
      });
    }
    if (this.pendingBranchUnlocks.length > 0) {
      const pending = [...this.pendingBranchUnlocks];
      this.pendingBranchUnlocks = [];
      pending.forEach((systemId, index) => {
        window.setTimeout(() => this.playBranchUnlock(systemId), index * 450);
      });
    }
    // Galaxy idle — throttle to 30 FPS to save battery
    this.app.ticker.maxFPS = 30;
    this.callbacks.onSceneChange('galaxy');
  }

  showSystemScene(system: StarSystem) {
    if (this.systemScene) {
      this.pendingSystemSwitch = system;
      if (this.systemSwitchTimer !== null) return;
      this.showSystemFadeOverlay(1, 820);
      this.systemScene.startCollapse();
      this.systemSwitchTimer = window.setTimeout(() => {
        const next = this.pendingSystemSwitch;
        this.pendingSystemSwitch = null;
        this.systemSwitchTimer = null;
        if (next) this.mountSystemScene(next);
      }, 1000);
      return;
    }
    this.mountSystemScene(system);
  }

  private mountSystemScene(system: StarSystem) {
    this.showSystemFadeOverlay(1, 0);
    this.clearScenes();

    // Force resize to fix stale viewport dimensions after overlay transitions.
    // PixiJS v8 removed Application.resize() — call renderer.resize() with the
    // current window size instead. Optional-chaining keeps tests safe.
    this.app.renderer?.resize?.(window.innerWidth, window.innerHeight);

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
      this.container,
    );

    this.app.stage.addChild(this.systemScene.container);
    this.activeScene = this.systemScene.container;
    this.systemScene.container.alpha = 1;
    this.camera.attach(this.systemScene.container);

    // Re-apply cached overlays — the React effects already pushed the latest
    // status/label/favorite state against the previous scene during the fade.
    this.systemScene.setPlanetStatusVisuals(this.lastStatusVisuals, this.lastStatusVisible);
    this.systemScene.setPlanetLabelsVisible(this.lastLabelsVisible);
    this.systemScene.setFavoritePlanets(this.lastFavoritePlanetIds);

    // Set min zoom so background star field always covers the screen (no dark edges)
    const { fieldSize, maxExtent } = this.systemScene;
    const screenDim = Math.max(this.app.screen.width, this.app.screen.height);
    const dynamicMinScale = fieldSize > 0 ? screenDim / fieldSize : 0.1;
    this.camera.setMinScale(Math.max(0.05, dynamicMinScale));

    // Limit pan to system bounds (can't scroll into empty space beyond stars)
    this.camera.setPanBounds(maxExtent * 1.5);

    // Fit all planets on screen
    this.camera.resetToFit(maxExtent);
    // System view has planet orbits — run at full 60 FPS
    this.app.ticker.maxFPS = 0;
    this.callbacks.onSceneChange('system');
    this.hideSystemFadeOverlay(720);
  }

  showPlanetViewScene(_system: StarSystem, _planet: Planet, _startHidden = false) {
    this.showSystemFadeOverlay(1, 360);
    this.clearScenes();
    this.camera.detach();
    this.callbacks.onSceneChange('planet-view');
    window.setTimeout(() => this.hideSystemFadeOverlay(420), 380);
  }

  // Galaxy camera controls
  galaxyZoomIn() { this.camera.zoomBy(1.3); }
  galaxyZoomOut() { this.camera.zoomBy(0.77); }
  /** Center-button target: jump to home star + Ring 1 frame.
   *  Ring 1 sits at 5 LY × PX_PER_LY (18 px/LY) = 90 px world radius;
   *  fit ~110 px so Ring 1 entries are visible at the viewport edge with
   *  a little breathing room. Previously this only re-centered without
   *  zooming — tester reported it felt useless at mid-zoom. */
  galaxyCenterOnOrigin() { this.camera.focusOnOrigin(110); }

  /** Fire a capillary pulse from home to a system — used by App.tsx on
   *  research-complete so the player sees the web "reaching" the node. */
  pulseCapillaryTo(systemId: string, color: number = 0x7bb8ff): void {
    this.galaxyScene?.pulseFromHomeTo(systemId, color);
  }

  /** Start the map-native ring growth animation and frame its real nodes. */
  playRingUnlock(newRing: number): void {
    if (!this.galaxyScene) {
      this.pendingRingUnlocks.push(newRing);
      return;
    }
    this.galaxyScene.playRingUnlock(newRing);
    this.camera.focusOnOrigin(this.galaxyScene.getUnlockFrameRadius(newRing), 1800);
  }

  /** From core onward, grow local branches from the completed star to nearby newly revealed nodes. */
  playBranchUnlock(sourceSystemId: string): void {
    if (!this.galaxyScene) {
      this.pendingBranchUnlocks.push(sourceSystemId);
      return;
    }
    this.galaxyScene.playBranchUnlock(sourceSystemId);
  }

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

  /** Whether the system scene ship flight animation is running */
  isSystemShipFlightActive(): boolean {
    return this.systemScene?.isShipFlightActive() ?? false;
  }

  /** Stop system scene ship flight */
  stopSystemShipFlight() {
    this.systemScene?.stopShipFlight();
  }

  /** Sync planet mission progress markers into the active system scene. */
  setSystemPlanetMissionVisuals(missions: PlanetMissionVisual[]) {
    this.systemScene?.setPlanetMissionVisuals(missions);
  }

  /** Sync optional planet status icons into the active system scene. */
  setSystemPlanetStatusVisuals(statuses: PlanetStatusVisual[], visible: boolean) {
    this.lastStatusVisuals = statuses;
    this.lastStatusVisible = visible;
    this.systemScene?.setPlanetStatusVisuals(statuses, visible);
  }

  /** Toggle planet name labels inside the active system scene. */
  setSystemPlanetLabelsVisible(visible: boolean) {
    this.lastLabelsVisible = visible;
    this.systemScene?.setPlanetLabelsVisible(visible);
  }

  /** Mark favorite planets so a gold star renders above them in the system. */
  setSystemFavoritePlanets(planetIds: string[]) {
    this.lastFavoritePlanetIds = planetIds;
    this.systemScene?.setFavoritePlanets(planetIds);
  }

  /** Sync generated planet texture previews into the active system scene. */
  setPlanetSkinTextures(textures: Record<string, string | null | undefined>) {
    this.systemScene?.setPlanetSkinTextures(textures);
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

  /** Get all systems from all rings, plus neighbor and core systems. */
  getAllSystems(): StarSystem[] {
    return [
      ...this.rings.flatMap((r) => r.starSystems),
      ...this._neighborSystems.map(n => n.system),
      ...this._coreSystems.map(c => c.system),
    ];
  }

  /**
   * Resolve a system by id even when it falls outside the currently-loaded set.
   *
   * `getAllSystems()` is intentionally limited (core is capped by the player's
   * BFS depth, neighbors expose only ~5 of 19 systems). Observatory discoveries
   * and research can however reference systems beyond that visible subset, so
   * the chat "go to system" / "view report" buttons silently failed for science
   * entries while expedition entries (always on the player's own rings) worked.
   *
   * This falls back to generating the FULL core (all depths) and the FULL
   * neighbor rings (all 19 systems) to locate the target deterministically.
   */
  findSystemById(systemId: string): StarSystem | null {
    if (!systemId) return null;

    // 1) Fast path: already-loaded systems.
    const loaded = this.getAllSystems().find((s) => s.id === systemId);
    if (loaded) return loaded;

    // 2) Full core (uncapped BFS depth).
    if (systemId.startsWith('core-')) {
      try {
        const core = generateGalaxyGroupCore(deriveGroupSeed(this.galaxySeed, this.playerGroupIndex));
        const match = core.systems.find((cs) => `core-${cs.id}-${cs.seed}` === systemId);
        if (match) return generateCoreStarSystem(match);
      } catch { /* fall through */ }
    }

    // 3) Full neighbor rings (all 19 systems per cluster co-player).
    try {
      const base = this.playerGroupIndex * PLAYERS_PER_GROUP;
      for (let slot = 0; slot < PLAYERS_PER_GROUP; slot++) {
        const globalIdx = base + slot;
        if (globalIdx === this.playerIndex) continue;
        const pos = assignPlayerPosition(this.galaxySeed, globalIdx);
        const neighborRings = generatePlayerRings(this.galaxySeed, pos.x, pos.y, `player-${globalIdx}`);
        for (const ring of neighborRings) {
          const found = ring.starSystems.find((s) => s.id === systemId);
          if (found) return found;
        }
      }
    } catch { /* fall through */ }

    return null;
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

  private computeNeighborSystems(): Array<{ system: StarSystem; ownerIndex: number }> {
    const result: Array<{ system: StarSystem; ownerIndex: number }> = [];

    // CRITICAL: Delaunay must run over THIS cluster's players only. Previously
    // this loop used 0..49 as if they were global indices, so a player with
    // global_index >= 50 (anyone past first cluster) got zero neighbors —
    // `a === this.playerIndex` never matched because Delaunay edges only
    // contained slot indices 0..49. Use the cluster offset (groupIndex*50)
    // to generate positions for the 50 players that SHARE this cluster.
    const base = this.playerGroupIndex * PLAYERS_PER_GROUP;
    const positions: Array<{ x: number; y: number; idx: number }> = [];
    for (let slot = 0; slot < PLAYERS_PER_GROUP; slot++) {
      const globalIdx = base + slot;
      const pos = assignPlayerPosition(this.galaxySeed, globalIdx);
      positions.push({ x: pos.x, y: pos.y, idx: globalIdx });
    }

    // The third expansion layer is the entry layer to all 49 other players in
    // this cluster. Each neighbor contributes ONE gateway star at Ring 3, then
    // a small branch behind it. We intentionally do not import their full
    // 19-star hexagon because that made every neighbor look like 12 simultaneous
    // paths instead of a single frontier branch.
    for (let slot = 0; slot < PLAYERS_PER_GROUP; slot++) {
      if (slot === this.playerIndex - base) continue;
      const neighborPos = positions[slot];
      const ni = neighborPos.idx; // real global index for the ownerPlayerId tag
      const neighborRings = generatePlayerRings(
        this.galaxySeed, neighborPos.x, neighborPos.y, `player-${ni}`,
      );

      const alreadyPersonal = (sys: StarSystem) => this.rings.some(r => r.starSystems.some(s => s.id === sys.id));
      const ring0 = neighborRings.find(r => r.ringIndex === 0)?.starSystems[0];
      const ring1 = neighborRings.find(r => r.ringIndex === 1)?.starSystems ?? [];
      const ring2 = neighborRings.find(r => r.ringIndex === 2)?.starSystems ?? [];
      const inwardDir = Math.atan2(this.playerPos.y - neighborPos.y, this.playerPos.x - neighborPos.x);

      let gateway = ring2[0];
      let gatewayDiff = Infinity;
      for (const sys of ring2) {
        const dx = sys.position.x - neighborPos.x;
        const dy = sys.position.y - neighborPos.y;
        let diff = Math.abs(Math.atan2(dy, dx) - inwardDir);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < gatewayDiff) {
          gatewayDiff = diff;
          gateway = sys;
        }
      }

      const branchInner = [...ring1]
        .sort((a, b) => {
          if (!gateway) return 0;
          const da = Math.hypot(a.position.x - gateway.position.x, a.position.y - gateway.position.y);
          const db = Math.hypot(b.position.x - gateway.position.x, b.position.y - gateway.position.y);
          return da - db;
        })
        .slice(0, 3);

      const branchSystems = [
        gateway ? { system: gateway, ringIndex: 3 } : null,
        ...branchInner.map((system) => ({ system, ringIndex: 4 })),
        ring0 ? { system: ring0, ringIndex: 5 } : null,
      ].filter(Boolean) as Array<{ system: StarSystem; ringIndex: number }>;

      for (const { system, ringIndex } of branchSystems) {
        if (alreadyPersonal(system)) continue;
        system.ringIndex = ringIndex;
        system.ownerPlayerId = null;
        result.push({ system, ownerIndex: ni });
      }
    }

    return result;
  }

  private computeCoreSystems(): Array<{ system: StarSystem; coreId: number; depth: number; coreNeighborIds: number[] }> {
    // Use group-specific seed (not the master galaxy seed) so every cluster
    // has its own core topology. Previously this.galaxySeed meant cluster_0
    // and cluster_1 shared identical core systems in the 2D PixiJS view,
    // while the 3D UniverseEngine correctly used deriveGroupSeed().
    const core = generateGalaxyGroupCore(deriveGroupSeed(this.galaxySeed, this.playerGroupIndex));

    // Find this player's entry star
    const entryStar = core.systems.find(s => s.entryForPlayerIndex === this.playerIndex);
    if (!entryStar) return [];

    // Progressive BFS depth: base maxRing=2 → depth 3, each +1 max_ring_add → +1 depth.
    // ast-probe (maxRing=3) → depth 4, ast-grav-scan (maxRing=4) → depth 5, etc.
    // Capped at 12 (DEPTH_COUNTS.length in galaxy-group-generator = full core).
    const maxBfsDepth = Math.min(Math.max(3, this.effectiveMaxRing + 1), 12);

    const visited = new Set<number>();
    const queue: Array<{ id: number; bfsDepth: number }> = [{ id: entryStar.id, bfsDepth: 0 }];
    visited.add(entryStar.id);

    const result: Array<{ system: StarSystem; coreId: number; depth: number; coreNeighborIds: number[] }> = [];

    while (queue.length > 0) {
      const { id, bfsDepth } = queue.shift()!;
      const coreSys = core.systems[id];
      if (!coreSys) continue;

      result.push({
        system: generateCoreStarSystem(coreSys),
        coreId: id,
        depth: coreSys.depth,
        coreNeighborIds: coreSys.neighbors,
      });

      if (bfsDepth < maxBfsDepth) {
        for (const nid of coreSys.neighbors) {
          if (!visited.has(nid)) {
            visited.add(nid);
            queue.push({ id: nid, bfsDepth: bfsDepth + 1 });
          }
        }
      }
    }

    return result;
  }

  private clearScenes() {
    if (this.systemSwitchTimer !== null) {
      window.clearTimeout(this.systemSwitchTimer);
      this.systemSwitchTimer = null;
      this.pendingSystemSwitch = null;
    }
    // Reset camera constraints (overridden in system scene)
    this.camera?.setMinScale(0.1);
    this.camera?.setPanBounds(null);

    // HMR can tear the PixiJS app down while a scene reference still exists —
    // guard every access to `this.app?.stage` before removing children.
    if (this.galaxyScene) {
      try { this.app?.stage?.removeChild(this.galaxyScene.container); } catch { /* already removed */ }
      this.galaxyScene.destroy();
      this.galaxyScene = null;
    }
    if (this.systemScene) {
      try { this.app?.stage?.removeChild(this.systemScene.container); } catch { /* already removed */ }
      this.systemScene.destroy();
      this.systemScene = null;
    }
  }

  private ensureSystemFadeOverlay(): HTMLDivElement {
    if (this.systemFadeOverlay && this.systemFadeOverlay.isConnected) return this.systemFadeOverlay;
    const overlay = document.createElement('div');
    overlay.dataset.nebulifeSystemFade = 'true';
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.zIndex = '6';
    overlay.style.pointerEvents = 'none';
    overlay.style.background = '#020510';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0ms linear';
    overlay.style.willChange = 'opacity';
    this.container.appendChild(overlay);
    this.systemFadeOverlay = overlay;
    return overlay;
  }

  private showSystemFadeOverlay(opacity = 1, durationMs = 420): void {
    const overlay = this.ensureSystemFadeOverlay();
    if (this.systemFadeTimer !== null) {
      window.clearTimeout(this.systemFadeTimer);
      this.systemFadeTimer = null;
    }
    overlay.style.display = 'block';
    overlay.style.transition = `opacity ${Math.max(0, durationMs)}ms ease`;
    // Force the browser to commit display/transition before changing opacity.
    void overlay.offsetHeight;
    overlay.style.opacity = String(Math.max(0, Math.min(1, opacity)));
  }

  private hideSystemFadeOverlay(durationMs = 620): void {
    const overlay = this.ensureSystemFadeOverlay();
    if (this.systemFadeTimer !== null) {
      window.clearTimeout(this.systemFadeTimer);
      this.systemFadeTimer = null;
    }
    overlay.style.display = 'block';
    overlay.style.transition = `opacity ${Math.max(0, durationMs)}ms ease`;
    void overlay.offsetHeight;
    overlay.style.opacity = '0';
    this.systemFadeTimer = window.setTimeout(() => {
      if (this.systemFadeOverlay) this.systemFadeOverlay.style.display = 'none';
      this.systemFadeTimer = null;
    }, durationMs + 80);
  }

  pause() {
    if (!this.app?.ticker) return;
    this.app.ticker.stop();
  }

  resume() {
    // Guard against being called before init() finished or after destroy()
    if (!this.app?.ticker) return;
    this.app.ticker.start();

    // Pixi v8 event-system recovery after a long ticker.stop() (e.g. tab
    // backgrounded, page reload + restore). Sometimes the root event
    // boundary stays in an idle state and pointerdown / pointerup stop
    // firing on the canvas — the user can hear the hover SFX but planet
    // clicks no longer reach the React layer.
    // Re-arming the stage.eventMode and clearing the boundary cursor
    // forces Pixi to resubscribe at the next frame.
    try {
      const stage = this.app.stage;
      if (stage) {
        // 'static' is the default but reassigning kicks the EventSystem
        // to re-evaluate hit-tests on the next tick.
        stage.eventMode = 'static';
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = this.app.renderer as any;
      const rootBoundary = renderer?.events?.rootBoundary;
      if (rootBoundary) {
        rootBoundary.cursor = null;
      }
    } catch {
      /* never block resume on event-system poke */
    }
  }

  /** Cap frame rate (e.g. 30 for idle scenes, 0 = uncapped/60) */
  setMaxFPS(fps: number) {
    if (!this.app?.ticker) return;
    this.app.ticker.maxFPS = fps;
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

  /** Show or hide neighbor and core system nodes on the galaxy map */
  setNeighborCoreVisible(visible: boolean) {
    this.galaxyScene?.setNeighborCoreVisible(visible);
  }

  destroy() {
    this.clearScenes();
    this.camera.destroy();
    this.app.destroy(true);
  }
}
