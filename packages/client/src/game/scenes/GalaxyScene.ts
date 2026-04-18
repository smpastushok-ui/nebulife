import { Container, Graphics, Text, BlurFilter } from 'pixi.js';
import type { GalaxyRing, StarSystem, ResearchState, SpectralClass } from '@nebulife/core';
import { getResearchProgress, isSystemFullyResearched, SeededRNG, computeGroupPosition, generateLiteClusterSystems, hexColorToInt, type LiteSystem, delaunayEdges, generateGalaxyGroupCore, deriveGroupSeed, assignPlayerPosition } from '@nebulife/core';
import type { TwinkleStarData } from '../rendering/GalaxyBackdrop.js';
import { tStatic } from '../../i18n/index.js';
import { playSfx } from '../../audio/SfxPlayer.js';

/* ── Helpers ───────────────────────────────────────────────────── */

/** HSL -> 0xRRGGBB (h: 0-1, s: 0-1, l: 0-1) */
function hslToRgb(h: number, s: number, l: number): number {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return ((Math.round(f(0) * 255) << 16) | (Math.round(f(8) * 255) << 8) | Math.round(f(4) * 255));
}

/** RGB hex -> HSL (returns h: 0-1, s: 0-1, l: 0-1) */
function rgbToHsl(hex: number): [number, number, number] {
  const r = ((hex >> 16) & 0xff) / 255;
  const g = ((hex >> 8) & 0xff) / 255;
  const b = (hex & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h2 = 0;
  if (max === r) h2 = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h2 = ((b - r) / d + 2) / 6;
  else h2 = ((r - g) / d + 4) / 6;
  return [h2, s, l];
}

/** Boost saturation of a hex color by `boost` amount (0-1 scale) */
function saturateColor(hex: number, boost: number): number {
  const [h, s, l] = rgbToHsl(hex);
  return hslToRgb(h, Math.min(1, s + boost), l);
}

/** Convert hex color string (#rrggbb) to number */
function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/** Compute star display radius from luminosity (log-scale, clamped 10-32px) */
function starBaseRadius(luminositySolar: number): number {
  return Math.max(10, Math.min(32, Math.log2(1 + luminositySolar) * 11));
}

/** Ease-out quadratic: fast at start, decelerates to end */
function easeOutQuad(x: number): number {
  return x * (2 - x);
}

/** Size multiplier per spectral class */
const SPECTRAL_SIZE_MUL: Record<SpectralClass, number> = {
  O: 1.8, B: 1.5, A: 1.2, F: 1.1, G: 1.0, K: 0.95, M: 0.85,
};

/** Hot stars (O/B/A) get stronger burn animation */
const HOT_STARS: Set<SpectralClass> = new Set(['O', 'B', 'A']);

/** Particle color per spectral class (matches prototype) */
const SPECTRAL_PARTICLE_COLOR: Record<string, number> = {
  O: 0xbbddff, B: 0xbbddff, A: 0xddeeff,
  F: 0xfffce8, G: 0xfff8f0, K: 0xffc860, M: 0xff8844,
};

/* ── Layout constants ──────────────────────────────────────────── */

/** Pixels per light-year for hex->screen conversion */
const PX_PER_LY = 18;

/** Easing speed for alpha transitions */
const ANIM_SPEED = 5;

/** Orbit expand: 450ms forward, 400ms reverse (faster for mobile responsiveness) */
const EXPAND_DURATION = 450;
const COLLAPSE_DURATION = 400;

/* ── Interfaces ────────────────────────────────────────────────── */

/** Visibility tier for 3-tier star system rendering */
type VisibilityTier = 1 | 2 | 3;

interface SystemNode {
  container: Container;
  system: StarSystem;
  nameLabel: Text;
  scanArc: Graphics | null;
  /** Atom orbital animation — visible at 0% (no probe tail yet) */
  atomOrbit: Graphics | null;
  /** Research label shown in research-mode overlay (% progress or ◉ for 100%) */
  researchLabel: Text | null;
  /** Per-frame particle canvas — cleared+redrawn every update */
  particleGfx: Graphics;
  /** Visual state for rendering */
  starState: 'home' | 'researched' | 'researching' | 'unexplored';
  /** Node type: personal (own rings), neighbor (adjacent player Ring 2), core (galactic core) */
  nodeType: 'personal' | 'neighbor' | 'core';
  /** Number of planets */
  planetCount: number;
  /** Nebula tint color (from star.colorHex) */
  nebulaColor: number;
  /** Number of ambient particles orbiting the star */
  particleCount: number;
  phaseOffset: number;
  speed: number;
  baseRadius: number;
  baseAlpha: number;
  spectralClass: SpectralClass;
  /** Target screen position relative to HOME (0,0) */
  tx: number;
  ty: number;
  /** Ring index (0 = home, 1, 2) */
  ringIndex: number;
  /** Orbit expansion: 0=collapsed, 1=fully expanded */
  expandProgress: number;
  /** Target for expand animation (0 or 1) */
  expandTarget: number;
  /** Whether radial open callback has been fired for this expand cycle */
  radialOpenFired: boolean;
  /** Core mesh ID (only for core nodes) */
  coreId?: number;
  /** Current visibility tier (1=visible, 2=faded, 3=hidden). Computed per-frame from effectiveMaxRing. */
  visibilityTier: VisibilityTier;
}

/* ── Scene ─────────────────────────────────────────────────────── */

export class GalaxyScene {
  container: Container;

  private systemNodes = new Map<string, SystemNode>();
  private homeSystem: StarSystem;
  private homeNode: SystemNode | null = null;
  private time = 0;

  private accretionDisk: Container | null = null;
  private backdropContainer: Container | null = null;
  private researchState: ResearchState;

  private connectionLines: Graphics;
  private beamGfx: Graphics;
  private nodesLayer: Container;
  private territoryGfx: Graphics;

  /** MST + extra edges for wavy connection line rendering */
  private connectionEdges: Array<{ x1: number; y1: number; x2: number; y2: number; seed: number; key1: string; key2: string }> = [];

  private selectedSystemId: string | null = null;
  private beamAlpha = 0;

  /** Individually animated backdrop twinkle stars */
  private twinkleStars: TwinkleStarData[] = [];

  /** Focus state */
  private focusedSystemId: string | null = null;
  private preFocusAlphas = new Map<string, number>();

  /** Currently expanded system */
  private expandedSystemId: string | null = null;
  /** Queued expand: waits for previous collapse to finish before expanding */
  private pendingExpandId: string | null = null;
  private pendingExpandDelay = 0;

  /** Transition animation state */
  private transitionActive = false;
  private transitionProgress = 0;
  private transitionTargetId: string | null = null;
  private transitionTargetX = 0;
  private transitionTargetY = 0;
  private transitionOnComplete: (() => void) | null = null;
  /** Scatter velocities for twinkle stars during transition */
  private twinkleScatterVx: number[] = [];
  private twinkleScatterVy: number[] = [];
  /** Fade overlay drawn on top during transition */
  private fadeOverlay: Graphics | null = null;

  /** Cinematic mode — disable user clicks on stars */
  private cinematicMode = false;
  /** Fake player markers for cinematic intro */
  private fakePlayerMarkers: Container[] = [];

  /** Research gain floating labels (+N%) */
  private researchGainLayer: Container = new Container();
  private researchGainLabels: Array<{
    text: Text; worldX: number; worldY: number; startTime: number;
  }> = [];
  /** Track previous progress per system to detect increments */
  private prevProgress = new Map<string, number>();
  /** Whether research-mode labels (% / ◉) are visible above all stars */
  private researchLabelsEnabled = false;
  /** Systems that already received a completion "Досліджено!" label — no double-spawn */
  private completedSystems = new Set<string>();

  /**
   * Effective max ring (HOME_RESEARCH_MAX_RING + tech tree max_ring_add).
   * Systems with ringIndex <= effectiveMaxRing are Tier 1 (fully visible).
   * Systems with ringIndex === effectiveMaxRing + 1 are Tier 2 (faded).
   * Systems with ringIndex > effectiveMaxRing + 1 are Tier 3 (hidden).
   */
  private effectiveMaxRing = 2;

  /**
   * Core neighbor graph: maps core system ID (string, e.g. "core-5-12345") to
   * an array of neighbor core system IDs. Used for branching visibility in the core zone.
   */
  private coreNeighborGraph = new Map<string, string[]>();

  /**
   * Set of core system IDs that are entry stars (depth 0).
   * Entry stars are always visible (Tier 1/2 depending on effectiveMaxRing).
   */
  private coreEntryIds = new Set<string>();

  /**
   * Cached set of visible core system IDs (computed from BFS through explored core systems).
   * Recomputed when researchState or effectiveMaxRing changes.
   */
  private visibleCoreIds = new Set<string>();

  /** Whether neighbor/core systems should be shown at all (toggled by UI) */
  private neighborCoreEnabled = false;

  /** Lite orbs layer (1,450 fuzzy colored orbs for full cluster visualization) */
  private liteOrbsGfx: Graphics | null = null;
  private liteSystems: LiteSystem[] = [];
  /** IDs of lite orbs to skip (because a real SystemNode already covers them) */
  private liteSkipIds = new Set<string>();
  /** Animation time accumulator for orb pulse (seconds) */
  private liteAnimT = 0;
  /** Screen size for viewport culling (set by GameEngine, defaults to a generous box) */
  private screenW = 800;
  private screenH = 1200;
  /** Last camera position when redrawn — triggers redraw when it changes >50px */
  private lastCamX = 0;
  private lastCamY = 0;
  private lastCamScale = 1;
  /** Pulse animations along edges (research-complete signal) */
  private edgePulses: Array<{ ax: number; ay: number; bx: number; by: number; t: number; color: number }> = [];
  private pulseGfx: Graphics | null = null;

  constructor(
    rings: GalaxyRing[],
    galaxySeed: number,
    playerCenterX: number,
    playerCenterY: number,
    researchState: ResearchState,
    neighborSystems?: Array<{ system: StarSystem; ownerIndex: number }>,
    coreSystems?: Array<{ system: StarSystem; coreId: number; depth: number; coreNeighborIds: number[] }>,
    expandedVisible?: boolean,
    groupCount?: number,
    playerGroupIndex?: number,
    playerIndex?: number,
    private onLiteOrbTap?: (lite: LiteSystem) => void,
    private onSelect?: (system: StarSystem, screenPos?: { x: number; y: number }) => void,
    private onDoubleClick?: (system: StarSystem) => void,
    private onTelescopeClick?: (system: StarSystem) => void,
    private clickGuard?: () => boolean,
    private onExpandSystem?: (system: StarSystem) => void,
    private onRadialOpen?: (system: StarSystem, getScreenPos: () => { x: number; y: number } | null) => void,
    private onRadialClose?: () => void,
  /** Called when pointer enters/leaves a researching star — for animated progress HUD */
  private onHoverSystem?: (systemId: string | null, progress: number) => void,
    effectiveMaxRing?: number,
  ) {
    this.container = new Container();
    this.researchState = researchState;
    this.effectiveMaxRing = effectiveMaxRing ?? 2;

    /* Simple static background star field (no galaxy backdrop) */
    this.accretionDisk = null;
    this.backdropContainer = null;
    this.twinkleStars = [];
    const bgStars = new Graphics();
    for (let i = 0; i < 200; i++) {
      const x = ((i * 7919 + 1234) % 12000) / 10 - 600;
      const y = ((i * 6271 + 567) % 7200) / 10 - 360;
      bgStars.circle(x, y, 0.25 + (i % 3) * 0.18);
      bgStars.fill({ color: 0xb4c8dc, alpha: 0.04 + (i % 5) * 0.025 });
    }
    this.container.addChild(bgStars);

    /* Render layers */
    this.territoryGfx = new Graphics();
    this.container.addChild(this.territoryGfx);
    this.connectionLines = new Graphics();
    this.container.addChild(this.connectionLines);
    this.beamGfx = new Graphics();
    this.container.addChild(this.beamGfx);
    this.nodesLayer = new Container();
    this.container.addChild(this.nodesLayer);
    this.container.addChild(this.researchGainLayer);

    /* Collect all systems with ring info */
    const all = rings.flatMap(r => r.starSystems.map(s => ({ system: s, ringIndex: r.ringIndex })));
    this.homeSystem = all.find(a => a.system.ownerPlayerId !== null)?.system ?? all[0].system;

    /* Build all nodes */
    const homeX = this.homeSystem.position.x;
    const homeY = this.homeSystem.position.y;

    for (const { system, ringIndex } of all) {
      // Chaotic jitter: deterministic offset per system to break grid pattern
      let tx = (system.position.x - homeX) * PX_PER_LY;
      let ty = (system.position.y - homeY) * PX_PER_LY;
      if (system.ownerPlayerId === null) {
        const jrng = new SeededRNG(system.seed);
        tx += (jrng.next() - 0.5) * PX_PER_LY * 4.0;
        ty += (jrng.next() - 0.5) * PX_PER_LY * 4.0;
      }

      if (system.ownerPlayerId !== null) {
        this.buildHomeNode(system);
      } else {
        const node = this.buildSysNode(system, tx, ty, ringIndex);
        this.systemNodes.set(system.id, node);
      }
    }

    /* ── Neighbor systems (adjacent players' Ring 2) ── */
    if (neighborSystems) {
      for (const { system } of neighborSystems) {
        // Skip if already present (personal rings may overlap)
        if (this.systemNodes.has(system.id)) continue;

        let tx = (system.position.x - homeX) * PX_PER_LY;
        let ty = (system.position.y - homeY) * PX_PER_LY;
        const jrng = new SeededRNG(system.seed);
        tx += (jrng.next() - 0.5) * PX_PER_LY * 4.0;
        ty += (jrng.next() - 0.5) * PX_PER_LY * 4.0;

        const node = this.buildSysNode(system, tx, ty, 3);
        node.nodeType = 'neighbor';
        node.baseAlpha = expandedVisible ? 0.45 : 0;
        node.baseRadius *= 0.7;
        node.nameLabel.style.fill = 0x445566;
        node.container.alpha = node.baseAlpha;
        // Soft blur — neighbor systems read as "out of focus / further away"
        // even at full Tier 1 brightness. Player sees colour + size but knows
        // they're not as close/clear as personal systems.
        node.container.filters = [new BlurFilter({ strength: 2, quality: 2 })];
        this.systemNodes.set(system.id, node);
      }
    }

    /* ── Core systems (galactic core mesh, progressive BFS depth) ── */
    // Core SystemNodes are HIDDEN — far-away core stars are represented by
    // colored dots in the lite-orbs layer instead. We still process the
    // metadata (coreEntryIds, coreNeighborGraph) so BFS-based unlocking
    // logic keeps working when the player gets close enough.
    if (coreSystems) {
      // Build coreId->systemId mapping for neighbor graph construction
      const coreIdToSysId = new Map<number, string>();
      for (const { system, coreId, depth } of coreSystems) {
        coreIdToSysId.set(coreId, system.id);
        if (depth === 0) this.coreEntryIds.add(system.id);
      }

      for (const { system, coreId, coreNeighborIds } of coreSystems) {
        // Build core neighbor graph (systemId -> neighbor systemIds)
        const neighborSysIds: string[] = [];
        for (const nid of coreNeighborIds) {
          const nsid = coreIdToSysId.get(nid);
          if (nsid) neighborSysIds.push(nsid);
        }
        this.coreNeighborGraph.set(system.id, neighborSysIds);

        // Skip if already present
        if (this.systemNodes.has(system.id)) continue;

        let tx = (system.position.x - homeX) * PX_PER_LY;
        let ty = (system.position.y - homeY) * PX_PER_LY;
        const jrng = new SeededRNG(system.seed);
        tx += (jrng.next() - 0.5) * PX_PER_LY * 4.0;
        ty += (jrng.next() - 0.5) * PX_PER_LY * 4.0;

        const node = this.buildSysNode(system, tx, ty, system.ringIndex);
        node.nodeType = 'core';
        node.coreId = coreId;
        // Hidden by default — lite-orbs layer represents these visually.
        // Tier system can still promote them when BFS chain reaches them.
        node.baseAlpha = 0;
        node.baseRadius *= 0.6;
        node.nameLabel.style.fill = 0x554433;
        node.container.alpha = 0;
        node.container.visible = false; // skip rendering entirely
        this.systemNodes.set(system.id, node);
      }

      // Compute initial visible core IDs
      this.recomputeVisibleCoreIds();
    }

    this.neighborCoreEnabled = !!expandedVisible;

    // Apply initial visibility tiers to all neighbor/core nodes
    this.applyAllVisibilityTiers();

    // Populate research labels for partial-progress systems even when
    // the eye toggle is off (design: partial % always visible).
    this.showResearchLabels(this.researchLabelsEnabled);

    this.buildConnectionEdges();

    // Restore in-progress research animations on every scene rebuild —
    // when player navigates Galaxy → System → Galaxy the scanArc/atomOrbit
    // graphics are nullified by buildSysNode and never re-created without
    // an explicit updateSystemVisual call. Iterate active research slots and
    // trigger visual rebuild so the spinning ring shows up immediately.
    for (const slot of this.researchState.slots) {
      if (slot.systemId) {
        this.updateSystemVisual(slot.systemId, this.researchState);
      }
    }

    /* ── Background cluster visualization ── */
    // New: Lite orbs for all 1,450 cluster systems (fuzzy colored pulsing orbs).
    // Skips ids that already have a real SystemNode (no double-render).
    if (playerIndex !== undefined && playerGroupIndex !== undefined) {
      this.buildLiteOrbsLayer(galaxySeed, playerGroupIndex, playerIndex);
    }

    // Keep distant cluster background for far galaxy clusters (only if multi-group)
    if (groupCount && groupCount > 1) {
      this.buildClusterBackground(
        galaxySeed,
        groupCount,
        playerGroupIndex ?? 0,
        playerCenterX,
        playerCenterY,
      );
    }
  }

  /* ── Lite orbs layer (Phase 1: full 1,450 cluster systems) ────── */

  private buildLiteOrbsLayer(galaxySeed: number, groupIndex: number, playerIndex: number) {
    // Generate lite metadata for all 1,450 cluster systems
    this.liteSystems = generateLiteClusterSystems(galaxySeed, groupIndex, playerIndex, 50);

    // Mark IDs covered by real SystemNodes so we don't render orbs under them
    this.liteSkipIds.clear();
    for (const id of this.systemNodes.keys()) this.liteSkipIds.add(id);
    if (this.homeNode) this.liteSkipIds.add(this.homeNode.system.id);

    // Connections layer FIRST (drawn behind orbs) — Delaunay player edges +
    // K=4 core mesh + player→core links. Mirrors the 3D UniverseEngine
    // visualization. Gives the cluster a visible "civilization web".
    const connectionsGfx = this.buildClusterConnectionsLayer(galaxySeed, groupIndex, playerIndex);
    this.container.addChildAt(connectionsGfx, 1);

    // Static base layer — pulse handled in update() via alpha multiplier
    this.liteOrbsGfx = new Graphics();
    this.liteOrbsGfx.eventMode = 'static';
    this.liteOrbsGfx.cursor = 'pointer';
    this.liteOrbsGfx.on('pointertap', (e) => {
      const local = e.getLocalPosition(this.container);
      this.handleLiteOrbTap(local.x, local.y);
    });
    this.redrawLiteOrbs();
    // Insert behind everything but above connections
    this.container.addChildAt(this.liteOrbsGfx, 2);

    // Edge pulse overlay — drawn ABOVE connections so light wave is visible
    this.pulseGfx = new Graphics();
    this.container.addChildAt(this.pulseGfx, 3);
  }

  /**
   * Hit-test a tap on the lite-orbs layer: find the closest orb to (worldX, worldY)
   * within a 24-pixel radius, then notify via callback so App.tsx can show a
   * preview toast (spectral colour + estimate of planets).
   */
  private handleLiteOrbTap(worldX: number, worldY: number): void {
    let closest: LiteSystem | null = null;
    let closestDist2 = 24 * 24; // tap radius in world units (matches orb size)
    for (const lite of this.liteSystems) {
      if (this.liteSkipIds.has(lite.id)) continue;
      const x = lite.position.x * PX_PER_LY;
      const y = lite.position.y * PX_PER_LY;
      const dx = x - worldX;
      const dy = y - worldY;
      const d2 = dx * dx + dy * dy;
      if (d2 < closestDist2) {
        closestDist2 = d2;
        closest = lite;
      }
    }
    if (closest && this.onLiteOrbTap) {
      this.onLiteOrbTap(closest);
    }
  }

  /** Spawn a light pulse along an edge from (ax,ay) to (bx,by). Used on
   *  research-complete to give visible feedback through the cluster web. */
  spawnEdgePulse(ax: number, ay: number, bx: number, by: number, color: number = 0xffaa55): void {
    this.edgePulses.push({ ax, ay, bx, by, t: 0, color });
  }

  /**
   * Build the connection lines layer mirroring the 3D UniverseEngine cluster:
   *   - Delaunay edges between adjacent players (Ring 2 ↔ Ring 2)
   *   - K=4 core mesh edges (500 systems)
   *   - Player → core entry star edges
   * All drawn relative to my home star (origin), so positions match lite-orbs.
   */
  private buildClusterConnectionsLayer(galaxySeed: number, groupIndex: number, myPlayerIndex: number): Graphics {
    const gfx = new Graphics();
    const PX = PX_PER_LY;

    // My home position — used as origin for relative coords
    const myPos = assignPlayerPosition(galaxySeed, myPlayerIndex);

    // 50 player positions (used for Delaunay)
    const players: Array<{ x: number; y: number; idx: number }> = [];
    for (let i = 0; i < 50; i++) {
      const p = assignPlayerPosition(galaxySeed, i);
      players.push({ x: p.x - myPos.x, y: p.y - myPos.y, idx: i });
    }

    // Delaunay edges between players → faint blue links
    const edges = delaunayEdges(players.map(p => ({ x: p.x, y: p.y })));
    for (const [a, b] of edges) {
      const pa = players[a];
      const pb = players[b];
      gfx.moveTo(pa.x * PX, pa.y * PX);
      gfx.lineTo(pb.x * PX, pb.y * PX);
    }
    gfx.stroke({ width: 0.6, color: 0x4488aa, alpha: 0.25 });

    // K=4 core mesh — internal galactic-core links
    const groupSeed = deriveGroupSeed(galaxySeed, groupIndex);
    const core = generateGalaxyGroupCore(groupSeed);
    const coreById = new Map<number, { x: number; y: number; depth: number }>();
    for (const cs of core.systems) {
      coreById.set(cs.id, { x: cs.position.x - myPos.x, y: cs.position.y - myPos.y, depth: cs.depth });
    }
    const drawnCore = new Set<string>();
    for (const cs of core.systems) {
      const a = coreById.get(cs.id)!;
      for (const nid of cs.neighbors) {
        const key = Math.min(cs.id, nid) + ',' + Math.max(cs.id, nid);
        if (drawnCore.has(key)) continue;
        drawnCore.add(key);
        const b = coreById.get(nid);
        if (!b) continue;
        gfx.moveTo(a.x * PX, a.y * PX);
        gfx.lineTo(b.x * PX, b.y * PX);
      }
    }
    gfx.stroke({ width: 0.4, color: 0xaa6644, alpha: 0.18 });

    // Player → core entry edges (player home → entry star) — gold thin lines
    for (let i = 0; i < 50; i++) {
      const entryId = core.entryIds[i];
      if (entryId === undefined) continue;
      const entry = coreById.get(entryId);
      if (!entry) continue;
      const player = players[i];
      gfx.moveTo(player.x * PX, player.y * PX);
      gfx.lineTo(entry.x * PX, entry.y * PX);
    }
    gfx.stroke({ width: 0.4, color: 0xffaa55, alpha: 0.12 });

    return gfx;
  }

  /** Update screen dimensions used for viewport culling (called by GameEngine on resize). */
  setScreenSize(w: number, h: number): void {
    this.screenW = w;
    this.screenH = h;
  }

  /** Compute world-space viewport bounds from container transform + screen size. */
  private getViewportBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    const scale = this.container.scale.x || 1;
    const offsetX = this.container.x;
    const offsetY = this.container.y;
    // World coordinate of screen (0,0) is (-offsetX/scale, -offsetY/scale)
    const minX = -offsetX / scale;
    const minY = -offsetY / scale;
    const maxX = (this.screenW - offsetX) / scale;
    const maxY = (this.screenH - offsetY) / scale;
    return { minX, maxX, minY, maxY };
  }

  private redrawLiteOrbs(): void {
    if (!this.liteOrbsGfx) return;
    const g = this.liteOrbsGfx;
    g.clear();

    // Viewport culling — generous 200px margin so off-screen orbs near edges
    // remain rendered when player pans slightly (avoids visible pop-in)
    const vp = this.getViewportBounds();
    const margin = 200;
    const minX = vp.minX - margin, maxX = vp.maxX + margin;
    const minY = vp.minY - margin, maxY = vp.maxY + margin;

    const t = this.liteAnimT;
    for (const lite of this.liteSystems) {
      if (this.liteSkipIds.has(lite.id)) continue;

      const x = lite.position.x * PX_PER_LY;
      const y = lite.position.y * PX_PER_LY;
      // Skip orbs outside viewport (with margin)
      if (x < minX || x > maxX || y < minY || y > maxY) continue;

      // Pulse: slow desync per orb (0.65..1.05 alpha multiplier)
      const pulseA = 0.85 + 0.20 * Math.sin(t * 0.6 + lite.pulsePhase);
      const pulseR = 1 + 0.15 * Math.sin(t * 0.4 + lite.pulsePhase * 1.7);

      // Stronger base so orbs read as "stars" not noise. Core slightly dimmer.
      const baseAlpha = lite.nodeType === 'core' ? 0.45 : 0.70;
      const alpha = baseAlpha * pulseA;
      // 2× larger so orbs ≈ 3-7 px visible (was 1-4 px = invisible at 30 FPS)
      const radius = lite.starSize * 2.0 * pulseR;
      const color = hexColorToInt(lite.starColor);

      // Soft outer glow (blur effect via 3 concentric circles)
      g.circle(x, y, radius * 3.5);
      g.fill({ color, alpha: alpha * 0.10 });
      g.circle(x, y, radius * 2);
      g.fill({ color, alpha: alpha * 0.25 });
      g.circle(x, y, radius);
      g.fill({ color, alpha });
    }
  }

  /* ── Background cluster visualization ──────────────────────── */

  /**
   * Render a static background layer showing all galaxy clusters as dim star clouds.
   * Each cluster is represented by ~40 tiny dots scattered around its galactic position.
   * The player's own cluster is rendered slightly brighter with a faint ring.
   *
   * Coordinate mapping:
   *   - computeGroupPosition returns galaxy-wide coords in LY (scale ~400-2000 LY)
   *   - We subtract the player's cluster position to get relative offset
   *   - Multiply by CLUSTER_BG_SCALE to convert to screen pixels
   */
  private buildClusterBackground(
    galaxySeed: number,
    groupCount: number,
    playerGroupIndex: number,
    _playerCenterX: number,
    _playerCenterY: number,
  ) {
    /** Screen pixels per galaxy-wide LY for cluster position mapping */
    const CLUSTER_BG_SCALE = 0.5;
    /** Screen pixels radius of gaussian scatter for stars within a cluster */
    const CLUSTER_SCATTER_PX = 45;
    /** Number of dim dots per cluster */
    const DOTS_PER_CLUSTER = 40;

    // Get the player's cluster position as the reference origin
    const ownClusterMeta = computeGroupPosition(galaxySeed, playerGroupIndex);
    const ownGx = ownClusterMeta.position.x;
    const ownGy = ownClusterMeta.position.y;

    const clusterBg = new Graphics();

    for (let gi = 0; gi < groupCount; gi++) {
      const isOwnCluster = gi === playerGroupIndex;
      const meta = computeGroupPosition(galaxySeed, gi);

      // Screen position of this cluster's center relative to the player's cluster
      const cx = (meta.position.x - ownGx) * CLUSTER_BG_SCALE;
      const cy = (meta.position.y - ownGy) * CLUSTER_BG_SCALE;

      // Deterministic scatter RNG per cluster
      const rng = new SeededRNG(meta.groupSeed ^ 0xdeadbeef);

      // Draw cluster dots
      const dotAlpha = isOwnCluster ? 0.35 : 0.18;
      const dotColor = isOwnCluster ? 0x6688aa : 0x334466;

      for (let d = 0; d < DOTS_PER_CLUSTER; d++) {
        // Gaussian scatter via Box-Muller
        const u1 = Math.max(1e-10, rng.next());
        const u2 = rng.next();
        const mag = Math.sqrt(-2 * Math.log(u1));
        const sx = cx + mag * Math.cos(2 * Math.PI * u2) * CLUSTER_SCATTER_PX;
        const sy = cy + mag * Math.sin(2 * Math.PI * u2) * CLUSTER_SCATTER_PX;

        const radius = 0.8 + rng.next() * 0.8;
        const alpha = dotAlpha * (0.6 + rng.next() * 0.4);

        clusterBg.circle(sx, sy, radius);
        clusterBg.fill({ color: dotColor, alpha });
      }

      // Faint ring around the cluster center to mark its extent
      const ringAlpha = isOwnCluster ? 0.08 : 0.04;
      const ringColor = isOwnCluster ? 0x446688 : 0x223344;
      const ringRadius = CLUSTER_SCATTER_PX * 1.8;

      // Draw ring as a thin circle outline using arc
      clusterBg.circle(cx, cy, ringRadius);
      clusterBg.stroke({ width: 0.5, color: ringColor, alpha: ringAlpha });
    }

    // Insert cluster background BEHIND everything else (at index 1, after bgStars which is at 0)
    this.container.addChildAt(clusterBg, 1);
  }

  /* ── Helpers ────────────────────────────────────────────────── */

  private getState(sys: StarSystem): 'home' | 'researched' | 'researching' | 'unexplored' {
    if (sys.ownerPlayerId !== null) return 'home';
    if (isSystemFullyResearched(this.researchState, sys.id)) return 'researched';
    if (this.researchState.slots.some(s => s.systemId === sys.id)) return 'researching';
    return 'unexplored';
  }

  private hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return (Math.abs(h) % 10000) / 10000 * Math.PI * 2;
  }

  /* ── 3-Tier Visibility ──────────────────────────────────────── */

  /**
   * Recompute the set of visible core system IDs.
   * Uses branching expansion: entry stars are always visible, then each fully
   * researched core system reveals its direct neighbors in the core mesh.
   */
  private recomputeVisibleCoreIds(): void {
    this.visibleCoreIds.clear();

    // Start with all entry stars (depth 0)
    for (const entryId of this.coreEntryIds) {
      this.visibleCoreIds.add(entryId);
    }

    // BFS: for each fully researched core system, add its direct neighbors
    const queue: string[] = [];
    for (const entryId of this.coreEntryIds) {
      if (isSystemFullyResearched(this.researchState, entryId)) {
        queue.push(entryId);
      }
    }

    const processed = new Set<string>();
    while (queue.length > 0) {
      const sysId = queue.shift()!;
      if (processed.has(sysId)) continue;
      processed.add(sysId);

      const neighbors = this.coreNeighborGraph.get(sysId);
      if (neighbors) {
        for (const nid of neighbors) {
          this.visibleCoreIds.add(nid);
          // If this neighbor is also fully researched, continue BFS
          if (!processed.has(nid) && isSystemFullyResearched(this.researchState, nid)) {
            queue.push(nid);
          }
        }
      }
    }
  }

  /**
   * Determine visibility tier for a system node.
   *
   * Tier 1 (visible, full interaction): ringIndex <= effectiveMaxRing
   * Tier 2 (faded, no interaction): ringIndex === effectiveMaxRing + 1
   * Tier 3 (hidden): ringIndex > effectiveMaxRing + 1
   *
   * For core systems (nodeType === 'core'), additional branching logic applies:
   * the system must also be in visibleCoreIds to be Tier 1/2 (otherwise Tier 3).
   */
  private getVisibilityTier(node: SystemNode): VisibilityTier {
    const maxRing = this.effectiveMaxRing;
    const ri = node.ringIndex;

    // Home star is always Tier 1
    if (node.starState === 'home') return 1;

    // Personal systems: straightforward ring-based tiers
    if (node.nodeType === 'personal') {
      if (ri <= maxRing) return 1;
      if (ri === maxRing + 1) return 2;
      return 3;
    }

    // Neighbor systems: ringIndex is always 3 (set in computeNeighborSystems)
    if (node.nodeType === 'neighbor') {
      if (ri <= maxRing) return 1;
      if (ri === maxRing + 1) return 2;
      return 3;
    }

    // Core systems: must be in visibleCoreIds AND satisfy ring-based tier
    if (node.nodeType === 'core') {
      // Not in visible set (not reachable via explored chain) -> hidden
      if (!this.visibleCoreIds.has(node.system.id)) return 3;
      // In visible set: apply ring-based tier
      if (ri <= maxRing) return 1;
      if (ri === maxRing + 1) return 2;
      return 3;
    }

    return 3;
  }

  /**
   * Apply visibility tier to a system node: set alpha, interactivity, label visibility.
   * Called during setNeighborCoreVisible and when tiers change.
   */
  private applyVisibilityTier(node: SystemNode): void {
    const tier = this.getVisibilityTier(node);
    node.visibilityTier = tier;

    if (!this.neighborCoreEnabled && (node.nodeType === 'neighbor' || node.nodeType === 'core')) {
      // Neighbor/core not toggled on yet — keep hidden regardless of tier
      node.baseAlpha = 0;
      node.container.eventMode = 'none';
      return;
    }

    switch (tier) {
      case 1: {
        // Full visibility — restore normal alpha based on node type
        if (node.nodeType === 'neighbor') {
          node.baseAlpha = 0.45;
        } else if (node.nodeType === 'core') {
          node.baseAlpha = 0.35;
        }
        // Personal nodes keep their calculated baseAlpha
        node.container.eventMode = 'static';
        node.container.cursor = 'pointer';
        break;
      }
      case 2: {
        // Visible "next ring" — must clearly read as a third ring to the player.
        // Neighbors stay fully clickable (player can tap → "Need ast-probe tech"
        // hint). Core stays non-interactive until BFS chain reaches them.
        if (node.nodeType === 'neighbor') {
          node.baseAlpha = 0.85;          // bumped 0.55 → 0.85 (clearly visible)
          node.container.eventMode = 'static';
          node.container.cursor = 'pointer';
          // Show name label so the third ring reads as "real systems", not background
          node.nameLabel.visible = true;
        } else {
          node.baseAlpha = 0.45;          // bumped 0.30 → 0.45
          node.container.eventMode = 'none';
          node.nameLabel.visible = false;
        }
        if (node.researchLabel) node.researchLabel.visible = false;
        if (node.scanArc) node.scanArc.visible = false;
        if (node.atomOrbit) node.atomOrbit.visible = false;
        break;
      }
      case 3: {
        // Hidden — not rendered
        node.baseAlpha = 0;
        node.container.eventMode = 'none';
        break;
      }
    }
  }

  /**
   * Update effective max ring and recompute visibility tiers for all nodes.
   * Called from GameEngine when tech tree changes.
   */
  setEffectiveMaxRing(maxRing: number): void {
    if (this.effectiveMaxRing === maxRing) return;
    this.effectiveMaxRing = maxRing;
    this.recomputeVisibleCoreIds();
    this.applyAllVisibilityTiers();
  }

  /**
   * Recompute and apply visibility tiers for all neighbor and core nodes.
   */
  private applyAllVisibilityTiers(): void {
    for (const [, node] of this.systemNodes) {
      if (node.nodeType === 'neighbor' || node.nodeType === 'core') {
        this.applyVisibilityTier(node);
      }
    }
  }

  /**
   * Build organic connection edges (kept for potential future use).
   */
  private buildConnectionEdges() {
    const pts: Array<{ x: number; y: number; ring: number }> = [{ x: 0, y: 0, ring: 0 }];
    const nodeKeysList: string[] = ['home'];
    for (const [id, n] of this.systemNodes) {
      pts.push({ x: n.tx, y: n.ty, ring: n.ringIndex });
      nodeKeysList.push(id);
    }

    const N = pts.length;
    if (N < 2) return;

    const edgeSet = new Set<string>();
    const edges: typeof this.connectionEdges = [];

    const addEdge = (i: number, j: number) => {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({
          x1: pts[i].x, y1: pts[i].y,
          x2: pts[j].x, y2: pts[j].y,
          seed: pts[i].x * 0.022 + pts[i].y * 0.016,
          key1: nodeKeysList[i],
          key2: nodeKeysList[j],
        });
      }
    };

    for (let i = 0; i < N; i++) {
      const isHome = i === 0;
      const myRing = pts[i].ring;
      const cands: Array<{ j: number; d: number }> = [];
      for (let j = 0; j < N; j++) {
        if (j === i) continue;
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        cands.push({ j, d });
      }
      cands.sort((a, b) => a.d - b.d);

      if (isHome) {
        for (let k = 0; k < Math.min(4, cands.length); k++) addEdge(0, cands[k].j);
      } else {
        let added = 0;
        for (const { j } of cands) {
          if (added >= 2) break;
          if (pts[j].ring !== myRing) { addEdge(i, j); added++; }
        }
        if (added === 0) addEdge(i, cands[0].j);
      }
    }

    /* ── Edges from neighbor/core nodes to nearest personal Ring 2 node ── */
    // Collect personal Ring 2 node indices
    const ring2Indices: number[] = [];
    for (let i = 1; i < nodeKeysList.length; i++) {
      const id = nodeKeysList[i];
      const node = this.systemNodes.get(id);
      if (node && node.nodeType === 'personal' && node.ringIndex >= 2) {
        ring2Indices.push(i);
      }
    }

    // For each neighbor node, connect to nearest personal Ring 2 node
    for (let i = 1; i < nodeKeysList.length; i++) {
      const id = nodeKeysList[i];
      const node = this.systemNodes.get(id);
      if (!node || node.nodeType !== 'neighbor') continue;

      let bestJ = -1;
      let bestD = Infinity;
      for (const j of ring2Indices) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < bestD) { bestD = d; bestJ = j; }
      }
      if (bestJ >= 0) addEdge(i, bestJ);
    }

    // For each core node, connect to nearest personal Ring 2 node (or nearest core node)
    for (let i = 1; i < nodeKeysList.length; i++) {
      const id = nodeKeysList[i];
      const node = this.systemNodes.get(id);
      if (!node || node.nodeType !== 'core') continue;

      // Try nearest Ring 2 personal node first
      let bestJ = -1;
      let bestD = Infinity;
      for (const j of ring2Indices) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < bestD) { bestD = d; bestJ = j; }
      }
      // Also try nearest other core node
      for (let j = 1; j < nodeKeysList.length; j++) {
        if (j === i) continue;
        const jNode = this.systemNodes.get(nodeKeysList[j]);
        if (!jNode || jNode.nodeType !== 'core') continue;
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < bestD) { bestD = d; bestJ = j; }
      }
      if (bestJ >= 0) addEdge(i, bestJ);
    }

    this.connectionEdges = edges;
  }

  /**
   * Draw wavy "thread-in-water" connection line (kept for potential future use).
   */
  private drawWavyLine(
    g: Graphics, x1: number, y1: number, x2: number, y2: number,
    t: number, seed: number, alpha: number,
  ) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 5) return;
    const nx = -dy / len, ny = dx / len;
    const amp = Math.min(3.8, len * 0.022);
    const N = Math.ceil(len / 10);
    g.moveTo(x1, y1);
    for (let i = 1; i <= N; i++) {
      const s = i / N;
      const env = Math.sin(s * Math.PI);
      const w1 = amp * env * Math.sin(s * Math.PI * 3.5 + t * 0.00055 + seed);
      const w2 = amp * 0.38 * env * Math.sin(s * Math.PI * 7 - t * 0.00105 + seed * 2.1);
      g.lineTo(x1 + dx * s + nx * (w1 + w2), y1 + dy * s + ny * (w1 + w2));
    }
    g.stroke({ width: 0.65, color: 0x2e4466, alpha });
  }

  /**
   * Create the standard star container with live particleGfx.
   */
  private createStarGfx(): {
    container: Container; particleGfx: Graphics;
  } {
    const container = new Container();
    const particleGfx = new Graphics();
    container.addChild(particleGfx);
    return { container, particleGfx };
  }

  // Menu icon removed — replaced by RadialMenu (React overlay)

  /* ── HOME node ─────────────────────────────────────────────── */

  private buildHomeNode(sys: StarSystem) {
    const spectralMul = SPECTRAL_SIZE_MUL[sys.star.spectralClass] ?? 1.0;
    const baseR = starBaseRadius(sys.star.luminositySolar) * 1.6 * spectralMul;
    const phase = this.hash(sys.id);

    const { container: dot, particleGfx } = this.createStarGfx();

    const nl = new Text({
      text: sys.name,
      style: { fontSize: 8, fill: 0x667788, fontFamily: 'monospace' },
      resolution: 3,
    });
    nl.anchor.set(0.5, 0);
    nl.y = baseR + 10;
    nl.visible = false;
    dot.addChild(nl);

    dot.eventMode = 'static';
    dot.cursor = 'pointer';
    dot.hitArea = { contains: (px: number, py: number) => px * px + py * py < (baseR + 22) * (baseR + 22) };

    dot.on('pointerover', () => { nl.visible = true; dot.scale.set(1.12); });
    dot.on('pointerout', () => { nl.visible = false; dot.scale.set(1.0); });

    let cc = 0;
    let ct: ReturnType<typeof setTimeout> | null = null;
    dot.on('pointerdown', () => {
      if (this.cinematicMode) return;
      cc++;
      if (cc === 1) {
        const starRate = 1.3 - Math.min(0.6, (sys.star.radiusSolar || 1) * 0.1);
        playSfx('system-select', 0.2, starRate);
        this.expandSystem(sys.id);
        ct = setTimeout(() => { cc = 0; }, 260);
      } else if (cc === 2) {
        if (ct) clearTimeout(ct);
        cc = 0;
        this.onDoubleClick?.(sys);
      }
    });

    this.nodesLayer.addChild(dot);

    const nebulaColor = hexToNum(sys.star.colorHex);

    this.homeNode = {
      container: dot, system: sys, nameLabel: nl,
      scanArc: null, atomOrbit: null, researchLabel: null,
      particleGfx,
      starState: 'home', planetCount: sys.planets.length,
      nodeType: 'personal' as const,
      nebulaColor, particleCount: 72,
      phaseOffset: phase, speed: 0.8 + (phase / (Math.PI * 2)) * 0.7,
      baseRadius: baseR, baseAlpha: 1,
      spectralClass: sys.star.spectralClass,
      tx: 0, ty: 0, ringIndex: 0,
      expandProgress: 0, expandTarget: 0,
      radialOpenFired: false,
      visibilityTier: 1 as VisibilityTier,
    };
  }

  /* ── System node ───────────────────────────────────────────── */

  private buildSysNode(sys: StarSystem, tx: number, ty: number, ringIndex: number): SystemNode {
    const state = this.getState(sys);
    const progress = getResearchProgress(this.researchState, sys.id);
    const phase = this.hash(sys.id);
    const baseR = starBaseRadius(sys.star.luminositySolar);
    const spectralMul = SPECTRAL_SIZE_MUL[sys.star.spectralClass] ?? 1.0;
    const effectiveR = baseR * spectralMul;

    const { container: dot, particleGfx } = this.createStarGfx();
    const starState: SystemNode['starState'] = state === 'unexplored' ? 'unexplored'
      : state === 'researching' ? 'researching'
      : state === 'researched' ? 'researched'
      : 'home';

    dot.x = tx;
    dot.y = ty;

    // Scanning arc + atom orbit: lazy-created on demand when state='researching'
    // (see updateSystemVisual and update loop)
    const scanArc: Graphics | null = null;
    const atomOrbit: Graphics | null = null;

    // Name label
    const nameLabel = new Text({
      text: sys.name,
      style: {
        fontSize: state === 'researched' ? 9 : 8,
        fill: state === 'researched' ? 0x8899aa
          : state === 'unexplored' ? 0x2d3d4d
          : 0x556677,
        fontFamily: 'monospace',
      },
      resolution: 3,
    });
    nameLabel.anchor.set(0.5, 0);
    nameLabel.y = effectiveR + 8;
    nameLabel.visible = false;
    dot.addChild(nameLabel);

    const coreR = Math.max(2.5, effectiveR * 0.42);

    // Interactivity
    dot.eventMode = 'static';
    dot.cursor = 'pointer';
    const hitR = effectiveR + 22;  // +22 for finger-friendly mobile tap targets
    dot.hitArea = { contains: (px: number, py: number) => px * px + py * py < hitR * hitR };

    dot.on('pointerover', () => {
      nameLabel.visible = true; dot.scale.set(1.12);
      const hProg = getResearchProgress(this.researchState, sys.id);
      if (hProg > 0 && hProg < 100) this.onHoverSystem?.(sys.id, hProg);
    });
    dot.on('pointerout', () => {
      nameLabel.visible = false; dot.scale.set(1.0);
      this.onHoverSystem?.(null, 0);
    });

    let cc = 0;
    let ct: ReturnType<typeof setTimeout> | null = null;
    dot.on('pointerdown', () => {
      if (this.cinematicMode) return;
      if (this.clickGuard?.()) return;
      cc++;
      if (cc === 1) {
        if (!this.clickGuard?.()) {
          const starRate = 1.3 - Math.min(0.6, (sys.star.radiusSolar || 1) * 0.1);
          playSfx('system-select', 0.2, starRate);
          this.expandSystem(sys.id);
        }
        ct = setTimeout(() => { cc = 0; }, 260);
      } else if (cc === 2) {
        if (ct) clearTimeout(ct);
        cc = 0;
        if (!this.clickGuard?.()) this.onDoubleClick?.(sys);
      }
    });

    this.nodesLayer.addChild(dot);

    // Ring 2 stars appear dimmer and smaller — they should feel "further away"
    const isRing2 = ringIndex === 2;
    const ring2AlphaMul = isRing2 ? 0.6 : 1.0;
    const ring2RadiusMul = isRing2 ? 0.8 : 1.0;

    let baseAlpha: number;
    if (state === 'researched' || state === 'home') {
      baseAlpha = (isRing2 ? 0.75 : 1.0);
    } else if (state === 'researching') {
      baseAlpha = (0.75 + (progress / 100) * 0.25) * ring2AlphaMul;
    } else {
      baseAlpha = 0.75 * ring2AlphaMul;
    }

    dot.alpha = baseAlpha;

    const speed = 0.5 + (phase / (Math.PI * 2)) * 1.0;
    const nebulaColor = hexToNum(sys.star.colorHex);
    const particleCount = starState === 'home' ? 72 : 25 + Math.min(sys.planets.length, 8) * 4;
    const adjustedRadius = effectiveR * ring2RadiusMul;

    return {
      container: dot, system: sys, nameLabel,
      scanArc, atomOrbit, researchLabel: null,
      particleGfx,
      starState, planetCount: sys.planets.length,
      nodeType: 'personal' as const,
      nebulaColor, particleCount,
      phaseOffset: phase, speed, baseRadius: adjustedRadius,
      baseAlpha, tx, ty, ringIndex,
      spectralClass: sys.star.spectralClass,
      expandProgress: 0, expandTarget: 0,
      radialOpenFired: false,
      visibilityTier: 1 as VisibilityTier,
    };
  }

  /* ── Public API ────────────────────────────────────────────── */

  selectSystem(systemId: string | null) {
    this.selectedSystemId = systemId;
    this.beamAlpha = 0;
  }

  /** Get current screen position of a system (for React overlays like RadialMenu) */
  getSystemScreenPosition(systemId: string): { x: number; y: number } | null {
    const node = this.homeNode?.system.id === systemId
      ? this.homeNode
      : this.systemNodes.get(systemId);
    if (!node) return null;
    const gp = node.container.toGlobal({ x: 0, y: 0 });
    return { x: gp.x, y: gp.y };
  }

  /**
   * Navigate to the nearest system in the given direction from the currently expanded system.
   * dx/dy: unit direction vector (e.g. [1,0] = right, [0,-1] = up)
   * Returns true if navigation happened.
   */
  navigateDirection(dx: number, dy: number): boolean {
    if (this.transitionActive) return false;

    // Collect all system nodes (home + others)
    const allNodes: SystemNode[] = [];
    if (this.homeNode) allNodes.push(this.homeNode);
    for (const [, node] of this.systemNodes) allNodes.push(node);

    // Origin: currently expanded system, or home
    const originId = this.expandedSystemId ?? this.homeNode?.system.id;
    const originNode = allNodes.find((n) => n.system.id === originId);
    if (!originNode) return false;

    // Use world position (tx, ty) for non-home; home is at (0, 0)
    const ox = originNode === this.homeNode ? 0 : originNode.tx;
    const oy = originNode === this.homeNode ? 0 : originNode.ty;

    let best: SystemNode | null = null;
    let bestScore = Infinity;

    for (const node of allNodes) {
      if (node === originNode) continue;
      // Skip Tier 2/3 nodes (non-interactive)
      if (node.visibilityTier !== 1) continue;
      const nx = node === this.homeNode ? 0 : node.tx;
      const ny = node === this.homeNode ? 0 : node.ty;
      const vx = nx - ox;
      const vy = ny - oy;

      // Only consider systems in the correct half-plane
      const proj = vx * dx + vy * dy;
      if (proj <= 0) continue;

      // Perpendicular distance (how far off the direction axis)
      const perp = Math.abs(vx * (-dy) + vy * dx);
      const dist = Math.hypot(vx, vy);

      // Score: prefer closer + more aligned (perp weighted x2)
      const score = dist + perp * 2;
      if (score < bestScore) {
        bestScore = score;
        best = node;
      }
    }

    if (!best) return false;

    this.expandSystem(best.system.id);
    return true;
  }

  /**
   * Expand a system: show orbits animation + focus + dim others.
   * Collapses any previously expanded system first.
   */
  expandSystem(systemId: string) {
    // Already expanded → no-op
    if (this.expandedSystemId === systemId) return;

    const prevId = this.expandedSystemId;

    // Cancel any previously queued expand
    this.pendingExpandId = null;
    this.pendingExpandDelay = 0;

    if (prevId && prevId !== systemId) {
      // Collapse previous system immediately
      const prevNode = prevId === this.homeNode?.system.id
        ? this.homeNode
        : this.systemNodes.get(prevId);
      if (prevNode) {
        prevNode.expandTarget = 0;
        prevNode.radialOpenFired = false;
      }
      // Close radial menu when switching to a different star
      this.onRadialClose?.();
      // Clear expandedSystemId NOW so unfocusSystem (called inside focusOnSystem)
      // does NOT try to re-collapse it or the new system
      this.expandedSystemId = null;

      // Focus on new system right away (dims others to 50%)
      this.focusOnSystem(systemId);

      // Camera centers immediately
      const newNode = systemId === this.homeNode?.system.id
        ? this.homeNode
        : this.systemNodes.get(systemId);
      if (newNode) this.onExpandSystem?.(newNode.system);

      // Queue the actual orbit expansion — wait for previous to collapse
      this.pendingExpandId = systemId;
      this.pendingExpandDelay = COLLAPSE_DURATION;
    } else {
      // No previous expanded system — expand directly
      this._doExpand(systemId);
    }
  }

  /** Internal: actually set expandTarget=1 and record expanded state */
  private _doExpand(systemId: string) {
    this.focusOnSystem(systemId);
    this.expandedSystemId = systemId;

    const node = systemId === this.homeNode?.system.id
      ? this.homeNode
      : this.systemNodes.get(systemId);

    if (node) {
      node.expandTarget = 1;
      this.selectSystem(systemId);
      this.onExpandSystem?.(node.system);
      // Fire radial menu immediately (no animation delay)
      node.radialOpenFired = true;
      this.onRadialOpen?.(node.system, () => this.getSystemScreenPosition(systemId));
    }
  }

  /**
   * Focus on a system: dim all others to 50%.
   */
  focusOnSystem(systemId: string) {
    if (this.focusedSystemId === systemId) return;
    if (this.focusedSystemId) this.unfocusSystem();

    this.focusedSystemId = systemId;
    this.preFocusAlphas.clear();

    // Save current alphas
    if (this.homeNode) {
      this.preFocusAlphas.set(this.homeNode.system.id, this.homeNode.baseAlpha);
    }
    for (const [id, node] of this.systemNodes) {
      this.preFocusAlphas.set(id, node.baseAlpha);
    }

    // Dim all except focused to 50% (but don't override Tier 2/3 alpha)
    if (this.homeNode && this.homeNode.system.id !== systemId) {
      this.homeNode.baseAlpha = 0.5;
    }
    for (const [id, node] of this.systemNodes) {
      if (id === systemId) {
        node.baseAlpha = 1;
      } else if (node.visibilityTier === 2) {
        node.baseAlpha = 0.3; // Keep faded tier alpha
      } else if (node.visibilityTier === 3) {
        node.baseAlpha = 0; // Keep hidden
      } else {
        node.baseAlpha = 0.5;
      }
    }
  }

  /** Unfocus: restore all alphas and collapse expanded system */
  unfocusSystem() {
    if (!this.focusedSystemId) return;

    // Close radial menu
    this.onRadialClose?.();

    // Collapse the expanded system
    if (this.expandedSystemId) {
      const expNode = this.expandedSystemId === this.homeNode?.system.id
        ? this.homeNode
        : this.systemNodes.get(this.expandedSystemId);
      if (expNode) {
        expNode.expandTarget = 0;
        expNode.radialOpenFired = false;
      }
      this.expandedSystemId = null;
    }

    this.focusedSystemId = null;

    if (this.homeNode) {
      const saved = this.preFocusAlphas.get(this.homeNode.system.id);
      if (saved !== undefined) this.homeNode.baseAlpha = saved;
    }
    for (const [id, node] of this.systemNodes) {
      const saved = this.preFocusAlphas.get(id);
      if (saved !== undefined) node.baseAlpha = saved;
    }

    this.preFocusAlphas.clear();
    this.selectedSystemId = null;
    this.beamAlpha = 0;
  }

  /** Spawn a floating "+N%" label above a star node */
  private spawnResearchGainLabel(node: SystemNode, delta: number) {
    const label = new Text({
      text: `+${Math.round(delta)}%`,
      style: { fontSize: 10, fill: 0xffdd66, fontFamily: 'monospace' },
      resolution: 2,
    });
    label.anchor.set(0.5, 1);
    label.x = node.tx;
    label.y = node.ty - node.baseRadius - 10;
    label.alpha = 0;
    this.researchGainLayer.addChild(label);
    this.researchGainLabels.push({ text: label, worldX: label.x, worldY: label.y, startTime: this.time });
  }

  get isFocused(): boolean {
    return this.focusedSystemId !== null;
  }

  get isTransitioning(): boolean {
    return this.transitionActive;
  }

  /** Show or hide neighbor and core system nodes (for galaxy expansion UI) */
  setNeighborCoreVisible(visible: boolean): void {
    this.neighborCoreEnabled = visible;
    this.recomputeVisibleCoreIds();
    this.applyAllVisibilityTiers();
  }

  /** Get world position of a system relative to galaxy container origin (HOME = 0,0) */
  getSystemWorldPosition(systemId: string): { x: number; y: number } | null {
    if (this.homeNode?.system.id === systemId) return { x: 0, y: 0 };
    const node = this.systemNodes.get(systemId);
    if (!node) return null;
    return { x: node.tx, y: node.ty };
  }

  /**
   * Start the star-fold transition: all stars converge into the target,
   * galaxy backdrop spins up, twinkle stars scatter outward.
   */
  startTransition(targetSystemId: string, onComplete: () => void) {
    if (this.transitionActive) return;

    const targetNode = this.systemNodes.get(targetSystemId);
    const isHome = this.homeNode?.system.id === targetSystemId;
    if (!targetNode && !isHome) return;

    // Close radial menu before transition
    this.onRadialClose?.();

    this.transitionActive = true;
    playSfx('warp-jump', 0.28);
    this.transitionProgress = 0;
    this.transitionTargetId = targetSystemId;
    this.transitionTargetX = isHome ? 0 : targetNode!.tx;
    this.transitionTargetY = isHome ? 0 : targetNode!.ty;
    this.transitionOnComplete = onComplete;

    if (this.homeNode) this.homeNode.container.eventMode = 'none';
    for (const [, n] of this.systemNodes) n.container.eventMode = 'none';

    this.connectionLines.visible = false;
    this.beamGfx.visible = false;

    this.twinkleScatterVx = [];
    this.twinkleScatterVy = [];
    for (const star of this.twinkleStars) {
      const angle = Math.atan2(star.gfx.y, star.gfx.x) + (Math.random() - 0.5) * 1.2;
      const speed = 200 + Math.random() * 600;
      this.twinkleScatterVx.push(Math.cos(angle) * speed);
      this.twinkleScatterVy.push(Math.sin(angle) * speed);
    }

    this.fadeOverlay = new Graphics();
    this.container.addChild(this.fadeOverlay);
  }

  updateSystemVisual(systemId: string, researchState: ResearchState) {
    this.researchState = researchState;
    const node = this.systemNodes.get(systemId);
    if (!node) return;

    const state = this.getState(node.system);
    const prog = getResearchProgress(researchState, systemId);

    // Detect progress increment — must be outside 'researching' guard so the
    // gain label fires immediately when the session ends (slot is freed, state
    // transitions to 'unexplored'), not on the NEXT session start.
    const oldProg = this.prevProgress.get(systemId);
    if (oldProg !== undefined && prog > oldProg) {
      const delta = prog - oldProg;
      if (delta >= 0.5) this.spawnResearchGainLabel(node, delta);
    }
    this.prevProgress.set(systemId, prog);

    if (state === 'researching') {
      node.starState = 'researching';
      node.baseAlpha = 0.75 + (prog / 100) * 0.25;

      if (!node.scanArc) {
        node.scanArc = new Graphics();
        node.container.addChild(node.scanArc);
      }

      // Create atom orbit if missing (lazy — handles systems that were already researching on load)
      if (!node.atomOrbit) {
        node.atomOrbit = new Graphics();
        node.container.addChild(node.atomOrbit);
      }

      // Keep research label in sync with the new state.
      // Eye ON  → yellow dot while in progress (color set by showResearchLabels).
      // Eye OFF → numeric % above the star.
      if (node.researchLabel && prog > 0 && prog < 100) {
        if (this.researchLabelsEnabled) {
          node.researchLabel.text = '●';
          node.researchLabel.style.fill = 0xffcc44;
          node.researchLabel.style.fontSize = 8;
        } else {
          node.researchLabel.text = `${Math.round(prog)}%`;
          node.researchLabel.style.fill = 0xaabbcc;
          node.researchLabel.style.fontSize = 7;
        }
        node.researchLabel.visible = true;
      }
    }

    if (state === 'researched') {
      node.starState = 'researched';
      node.baseAlpha = 1;
      if (node.scanArc) node.scanArc.visible = false;
      if (node.atomOrbit) node.atomOrbit.visible = false;
      node.nameLabel.text = node.system.name;
      node.nameLabel.style.fill = 0x8899aa;
      // First-time completion: spawn achievement label
      if (!this.completedSystems.has(systemId)) {
        this.completedSystems.add(systemId);
        this.spawnCompletionLabel(node);
      }
      // Fully researched: eye ON keeps a green dot, eye OFF shows nothing
      // (clean star look with just the star's color and size).
      if (node.researchLabel) {
        if (this.researchLabelsEnabled) {
          node.researchLabel.text = '●';
          node.researchLabel.style.fill = 0x44ff88;
          node.researchLabel.style.fontSize = 8;
          node.researchLabel.visible = true;
        } else {
          node.researchLabel.visible = false;
        }
      }
      // When a core system is fully researched, recompute visible core IDs
      // to reveal its direct neighbors (branching expansion)
      if (node.nodeType === 'core') {
        this.recomputeVisibleCoreIds();
        this.applyAllVisibilityTiers();
      }
    }
  }

  /* ── Frame update ──────────────────────────────────────────── */

  update(deltaMs: number) {
    this.time += deltaMs;
    const dt = deltaMs / 1000;
    const t = this.time;

    // ── Transition animation ──────────────────────────────────
    if (this.transitionActive) {
      this.updateTransition(deltaMs, dt, t);
      return;
    }

    // ── Normal animation ──────────────────────────────────────

    // Process pending expand (delayed after previous collapses)
    if (this.pendingExpandId && this.pendingExpandDelay > 0) {
      this.pendingExpandDelay -= deltaMs;
      if (this.pendingExpandDelay <= 0) {
        const id = this.pendingExpandId;
        this.pendingExpandId = null;
        this.pendingExpandDelay = 0;
        this._doExpand(id);
      }
    }

    if (this.accretionDisk) this.accretionDisk.rotation += deltaMs * 0.0003;

    // Lite orbs pulse — redraw on pulse tick (10Hz) OR when camera panned >50px
    if (this.liteOrbsGfx) {
      this.liteAnimT += dt;
      const camMoved = Math.abs(this.container.x - this.lastCamX) > 50
        || Math.abs(this.container.y - this.lastCamY) > 50
        || Math.abs(this.container.scale.x - this.lastCamScale) > 0.05;
      const pulseTick = Math.floor(this.liteAnimT * 10) !== Math.floor((this.liteAnimT - dt) * 10);
      if (camMoved || pulseTick) {
        this.lastCamX = this.container.x;
        this.lastCamY = this.container.y;
        this.lastCamScale = this.container.scale.x;
        this.redrawLiteOrbs();
      }
    }

    // Edge pulses (light wave traveling along player→core edges)
    if (this.pulseGfx && this.edgePulses.length > 0) {
      const pg = this.pulseGfx;
      pg.clear();
      const PULSE_DURATION = 0.8; // seconds
      this.edgePulses = this.edgePulses.filter(p => {
        p.t += dt;
        if (p.t >= PULSE_DURATION) return false;
        const progress = p.t / PULSE_DURATION;
        // Bright dot traveling along the line
        const x = p.ax + (p.bx - p.ax) * progress;
        const y = p.ay + (p.by - p.ay) * progress;
        const fadeAlpha = 1 - Math.pow(progress, 2); // ease-out
        pg.circle(x, y, 4);
        pg.fill({ color: p.color, alpha: fadeAlpha * 0.9 });
        pg.circle(x, y, 8);
        pg.fill({ color: p.color, alpha: fadeAlpha * 0.3 });
        return true;
      });
    }
    if (this.backdropContainer) this.backdropContainer.rotation += deltaMs * 0.000012;

    this.updateTwinkleStars(t);

    // Helper: animate expand progress + fire radial callbacks
    const animateExpand = (node: SystemNode) => {
      const target = node.expandTarget;
      const cur = node.expandProgress;
      if (target > cur) {
        node.expandProgress = Math.min(target, cur + deltaMs / EXPAND_DURATION);
      } else if (target < cur) {
        node.expandProgress = Math.max(target, cur - deltaMs / COLLAPSE_DURATION);
      }

      const ep = node.expandProgress;

      // Fire radial open when expansion crosses 82% threshold
      if (ep > 0.82 && !node.radialOpenFired && node.system.id === this.expandedSystemId) {
        node.radialOpenFired = true;
        const sysId = node.system.id;
        this.onRadialOpen?.(node.system, () => this.getSystemScreenPosition(sysId));
      }

      // Fire radial close when collapsing below threshold
      if (ep <= 0.5 && node.radialOpenFired) {
        node.radialOpenFired = false;
        this.onRadialClose?.();
      }

      // Keep name label visible while expanded (no hover required)
      if (ep > 0.5) {
        node.nameLabel.visible = true;
      }
    };

    // Animate HOME star
    if (this.homeNode) {
      const hn = this.homeNode;
      hn.container.alpha += (hn.baseAlpha - hn.container.alpha) * Math.min(1, ANIM_SPEED * dt);
      animateExpand(hn);
      this.animateStarBurn(hn, t);
    }

    // Animate all system nodes
    for (const [, node] of this.systemNodes) {
      // Tier 3 (hidden): hide container from PixiJS render tree entirely.
      // Once alpha reaches ~0 we set visible=false — no draw calls, no transforms.
      if (node.visibilityTier === 3) {
        if (node.container.alpha > 0.01) {
          node.container.alpha += (0 - node.container.alpha) * Math.min(1, ANIM_SPEED * dt);
          if (node.container.alpha <= 0.01) {
            node.container.alpha = 0;
            node.container.visible = false;
          }
        }
        continue;
      }
      // Ensure previously hidden Tier 3 nodes become visible again when tier changes
      if (!node.container.visible) node.container.visible = true;

      node.container.alpha += (node.baseAlpha - node.container.alpha) * Math.min(1, ANIM_SPEED * dt);
      animateExpand(node);

      // Tier 2 (faded): simplified rendering — just a minimal dot, skip expensive animations
      if (node.visibilityTier === 2) {
        this.animateStarBurnSimple(node, t);
        if (node.scanArc) node.scanArc.visible = false;
        if (node.atomOrbit) node.atomOrbit.visible = false;
        continue;
      }

      this.animateStarBurn(node, t);

      // Live update research % over the star (only in eye-OFF mode where we
      // show a number). Eye-ON mode uses a colored dot that doesn't tick.
      if (
        node.researchLabel
        && node.researchLabel.visible
        && !this.researchLabelsEnabled
      ) {
        const isResearching = this.researchState.slots.some((s) => s.systemId === node.system.id);
        if (isResearching) {
          const prog = Math.round(getResearchProgress(this.researchState, node.system.id));
          if (prog > 0 && prog < 100) {
            const next = `${prog}%`;
            if (node.researchLabel.text !== next) node.researchLabel.text = next;
          }
        }
      }

      // Scan arc probe dot removed — only atom orbit animation shown
      if (node.scanArc) node.scanArc.visible = false;

      // Atom orbital animation — 4 colored electrons on different tilted orbits
      // Visible throughout the entire research process (not just at 0%)
      if (node.atomOrbit) {
        const isActive = this.researchState.slots.some((s) => s.systemId === node.system.id);
        node.atomOrbit.visible = isActive;
        if (isActive) {
          node.atomOrbit.clear();
          const baseR = Math.max(2.5, node.baseRadius * 0.42) * 1.6 + 4;
          const pulse = 0.75 + 0.25 * Math.sin(t * 0.0045);

          // 4 electrons: all cyan/blue tones — each on a distinct tilted orbit
          const ORBITS = [
            { rMult: 1.10, bMult: 0.32, speed: +0.0020, phase0: 0,               tilt: 0,               color: 0x88ddff, dot: 0.9 }, // cyan light
            { rMult: 1.45, bMult: 0.46, speed: -0.0015, phase0: Math.PI * 0.70,  tilt: Math.PI * 0.38,  color: 0x44aaff, dot: 0.8 }, // blue-cyan
            { rMult: 1.80, bMult: 0.33, speed: +0.0011, phase0: Math.PI * 1.35,  tilt: Math.PI * 0.14,  color: 0x2277cc, dot: 0.8 }, // deep blue
            { rMult: 2.15, bMult: 0.20, speed: -0.0008, phase0: Math.PI * 1.82,  tilt: Math.PI * 0.58,  color: 0x55bbee, dot: 0.7 }, // soft cyan
          ] as const;

          for (const orb of ORBITS) {
            const orbitR = baseR * orb.rMult;
            const orbitB = orbitR * orb.bMult;
            const cosT = Math.cos(orb.tilt);
            const sinT = Math.sin(orb.tilt);

            // ── Phantom orbit trail: full ghost ellipse (barely visible) ──────
            const STEPS = 32;
            for (let si = 0; si <= STEPS; si++) {
              const phi = (si / STEPS) * Math.PI * 2;
              const ox = Math.cos(phi) * orbitR;
              const oy = Math.sin(phi) * orbitB;
              const sx = ox * cosT - oy * sinT;
              const sy = ox * sinT + oy * cosT;
              if (si === 0) node.atomOrbit.moveTo(sx, sy);
              else node.atomOrbit.lineTo(sx, sy);
            }
            node.atomOrbit.closePath();
            node.atomOrbit.stroke({ color: orb.color, alpha: 0.055 * pulse, width: 0.5 });

            // Electron position on its orbit
            const angle = (t * orb.speed + orb.phase0) % (Math.PI * 2);
            const ex = Math.cos(angle) * orbitR;
            const ey = Math.sin(angle) * orbitB;
            const ex2 = ex * cosT - ey * sinT;
            const ey2 = ex * sinT + ey * cosT;

            // ── Trailing arc: gradient dots behind electron (~150° arc) ───────
            const TRAIL = 16;
            const TRAIL_ARC = Math.PI * 0.85;
            const dir = orb.speed > 0 ? -1 : 1;
            for (let ti = 0; ti < TRAIL; ti++) {
              const frac = ti / TRAIL; // 0 = tail end, 1 = near electron
              const tAngle = angle + dir * TRAIL_ARC * (1 - frac);
              const tx = Math.cos(tAngle) * orbitR;
              const ty = Math.sin(tAngle) * orbitB;
              node.atomOrbit.circle(tx * cosT - ty * sinT, tx * sinT + ty * cosT, orb.dot * 0.45);
              node.atomOrbit.fill({ color: orb.color, alpha: (0.015 + 0.145 * frac) * pulse });
            }

            // ── Electron: glow halo + core bead ───────────────────────────────
            node.atomOrbit.circle(ex2, ey2, orb.dot * 1.8);
            node.atomOrbit.fill({ color: orb.color, alpha: 0.10 * pulse });
            node.atomOrbit.circle(ex2, ey2, orb.dot * 1.2);
            node.atomOrbit.fill({ color: orb.color, alpha: 0.28 * pulse });
            node.atomOrbit.circle(ex2, ey2, orb.dot);
            node.atomOrbit.fill({ color: orb.color, alpha: 0.95 * pulse });
          }
        }
      }
    }

    // Territory glow — soft aura under explored systems (home + researched)
    this.territoryGfx.clear();
    const drawTerritoryAura = (x: number, y: number) => {
      const N = 6;
      const maxR = 52;
      // Shadow (offset down-right slightly)
      for (let ci = N; ci >= 1; ci--) {
        const f = ci / N;
        const a = 0.07 * Math.exp(-f * 3.5);
        if (a > 0.003) {
          this.territoryGfx.circle(x + 2, y + 3, maxR * f);
          this.territoryGfx.fill({ color: 0x000000, alpha: a });
        }
      }
      // Territory fill (warm teal tint, very low alpha)
      for (let ci = N; ci >= 1; ci--) {
        const f = ci / N;
        const a = 0.055 * Math.exp(-f * 2.8);
        if (a > 0.003) {
          this.territoryGfx.circle(x, y, maxR * f);
          this.territoryGfx.fill({ color: 0x1a4060, alpha: a });
        }
      }
    };
    if (this.homeNode) drawTerritoryAura(this.homeNode.tx ?? 0, this.homeNode.ty ?? 0);
    for (const [, node] of this.systemNodes) {
      if (node.starState === 'researched' && node.visibilityTier === 1) drawTerritoryAura(node.tx, node.ty);
    }

    // Wavy connection lines — blue threads between stars
    this.connectionLines.clear();
    for (const edge of this.connectionEdges) {
      // Get visibility tier for both endpoints
      const node1 = edge.key1 === 'home' ? this.homeNode : this.systemNodes.get(edge.key1);
      const node2 = edge.key2 === 'home' ? this.homeNode : this.systemNodes.get(edge.key2);
      const tier1 = node1?.visibilityTier ?? 1;
      const tier2 = node2?.visibilityTier ?? 1;

      // Skip edges where either endpoint is Tier 3 (hidden)
      if (tier1 === 3 || tier2 === 3) continue;

      const st1 = edge.key1 === 'home' ? 'home' : this.systemNodes.get(edge.key1)?.starState ?? 'unexplored';
      const st2 = edge.key2 === 'home' ? 'home' : this.systemNodes.get(edge.key2)?.starState ?? 'unexplored';
      const ri1 = edge.key1 === 'home' ? 0 : (this.systemNodes.get(edge.key1)?.ringIndex ?? 0);
      const ri2 = edge.key2 === 'home' ? 0 : (this.systemNodes.get(edge.key2)?.ringIndex ?? 0);
      // Skip edges between two deep-unexplored systems
      if (st1 === 'unexplored' && ri1 >= 2 && st2 === 'unexplored' && ri2 >= 2) continue;
      const vis = (st: string, ri: number) =>
        st === 'home' || st === 'researched' ? 1.0 :
        st === 'researching' ? 0.7 :
        ri >= 2 ? 0.22 : 0.46;
      let alpha = Math.min(vis(st1, ri1), vis(st2, ri2)) * 0.28;

      // If either endpoint is Tier 2 (faded), reduce edge alpha further
      if (tier1 === 2 || tier2 === 2) {
        const minTierAlpha = Math.min(
          tier1 === 2 ? 0.3 : 1.0,
          tier2 === 2 ? 0.3 : 1.0,
        );
        alpha = alpha * minTierAlpha * 0.5;
      }
      this.drawWavyLine(this.connectionLines, edge.x1, edge.y1, edge.x2, edge.y2, t, edge.seed, alpha);
    }

    this.beamGfx.clear(); // keep clear — beam removed from design

    // Animate research gain labels (+N% floaters, 3s lifetime)
    const GAIN_DURATION = 3000;
    this.researchGainLabels = this.researchGainLabels.filter(lbl => {
      const age = t - lbl.startTime;
      if (age > GAIN_DURATION) {
        this.researchGainLayer.removeChild(lbl.text);
        lbl.text.destroy();
        return false;
      }
      const t01 = age / GAIN_DURATION;
      // Flash in quickly, hold briefly, fade out slowly
      const alpha = t01 < 0.1
        ? t01 / 0.1
        : Math.pow(1 - t01, 1.4);
      lbl.text.alpha = alpha;
      // Drift upward
      lbl.text.y = lbl.worldY - t01 * 30;
      // Brief scale pop at start
      const scale = t01 < 0.15 ? (1.35 - t01 / 0.15 * 0.35) : 1;
      lbl.text.scale.set(scale);
      return true;
    });

    if (this.fakePlayerMarkers.length > 0) {
      this.updateFakePlayerMarkers(t, deltaMs);
    }
  }

  /** Normal twinkle star animation */
  private updateTwinkleStars(t: number) {
    for (const star of this.twinkleStars) {
      const sp = star.speed;
      const ph = star.phaseOffset;
      const cp = star.colorPhase;

      const s1 = Math.sin(t * sp * 0.0008 + ph) * 0.35;
      const s2 = Math.sin(t * sp * 0.0013 + ph * 2.1) * 0.15;
      const scale = star.baseScale + s1 + s2;
      star.gfx.scale.set(scale, scale);

      const a1 = Math.sin(t * sp * 0.0006 + ph * 1.4) * 0.15;
      const a2 = Math.sin(t * sp * 0.0019 + ph * 0.7) * 0.08;
      star.gfx.alpha = Math.max(0.02, star.baseAlpha + a1 + a2);

      const hue = (Math.sin(t * sp * 0.00025 + cp) * 0.5 + 0.5);
      star.gfx.tint = hslToRgb(hue, 0.35, 0.82);
    }
  }

  /**
   * Transition animation — multi-phase warp:
   *   frenzy    (0–900ms)  — cubic spin-up, particles accelerate
   *   collapse  (900–1300ms) — stars fold toward target, target grows
   *   blackout  (1300–1550ms) — dark overlay covers everything
   *   complete  (1550ms) — fire onComplete
   * Total ~1550ms (hyperspace overlay handled by React GalaxyWarpOverlay)
   */
  private updateTransition(deltaMs: number, dt: number, t: number) {
    const FRENZY_END   = 900;
    const COLLAPSE_END = 1300;
    const BLACKOUT_END = 1550;

    this.transitionProgress += deltaMs;
    const elapsed = this.transitionProgress;
    const total = BLACKOUT_END;
    const p = Math.min(1, elapsed / total);

    const tx = this.transitionTargetX;
    const ty = this.transitionTargetY;

    // Phase-dependent easing
    let frenzyP = 0;  // 0→1 during frenzy
    let collapseP = 0;  // 0→1 during collapse
    let blackoutP = 0;  // 0→1 during blackout

    if (elapsed < FRENZY_END) {
      frenzyP = elapsed / FRENZY_END;
    } else {
      frenzyP = 1;
      if (elapsed < COLLAPSE_END) {
        collapseP = (elapsed - FRENZY_END) / (COLLAPSE_END - FRENZY_END);
      } else {
        collapseP = 1;
        blackoutP = Math.min(1, (elapsed - COLLAPSE_END) / (BLACKOUT_END - COLLAPSE_END));
      }
    }

    // Cubic ease-in for frenzy (very gentle start, accelerates toward end)
    const spinBoost = 1 + 11 * (frenzyP * frenzyP * frenzyP);

    // Smooth ease for collapse
    const collapseEase = collapseP < 0.5
      ? 4 * collapseP * collapseP * collapseP
      : 1 - Math.pow(-2 * collapseP + 2, 3) / 2;

    // Galaxy backdrop spin
    const spinSpeed = 0.000012 + frenzyP * frenzyP * 0.004;
    if (this.backdropContainer) this.backdropContainer.rotation += deltaMs * spinSpeed;
    if (this.accretionDisk) this.accretionDisk.rotation += deltaMs * (0.0003 + frenzyP * frenzyP * 0.003);

    // Scatter twinkle stars (only during collapse+)
    for (let i = 0; i < this.twinkleStars.length; i++) {
      const star = this.twinkleStars[i];
      const vx = this.twinkleScatterVx[i] ?? 0;
      const vy = this.twinkleScatterVy[i] ?? 0;
      star.gfx.x += vx * dt * collapseEase * 2;
      star.gfx.y += vy * dt * collapseEase * 2;
      star.gfx.alpha = Math.max(0, star.baseAlpha * (1 - collapseEase));
    }

    const foldStar = (node: SystemNode, isTarget: boolean) => {
      if (isTarget) {
        // Target star: spin up during frenzy, grow during collapse
        const growP = collapseEase * 0.6;
        node.container.alpha = Math.min(1, node.baseAlpha + collapseEase * 0.5);
        node.container.scale.set(1 + growP);
        node.nameLabel.visible = false;
        // Force orbits visible + accelerating spin
        const savedEP = node.expandProgress;
        node.expandProgress = 1;
        this.animateStarBurn(node, t, spinBoost);
        node.expandProgress = savedEP;
      } else {
        // Non-target: converge during collapse
        const startX = node.tx;
        const startY = node.ty;
        node.container.x = startX + (tx - startX) * collapseEase;
        node.container.y = startY + (ty - startY) * collapseEase;
        const scale = Math.max(0.05, 1 - collapseEase * 0.9);
        node.container.scale.set(scale);
        node.container.alpha = node.baseAlpha * (collapseP < 0.7
          ? 1 + collapseEase * 0.5
          : Math.max(0, (1 - collapseP) / 0.3));
        node.nameLabel.visible = false;
        this.animateStarBurn(node, t, spinBoost);
      }
    };

    if (this.homeNode) {
      const isTarget = this.homeNode.system.id === this.transitionTargetId;
      if (!isTarget) {
        this.homeNode.container.x = tx * collapseEase;
        this.homeNode.container.y = ty * collapseEase;
        const scale = Math.max(0.05, 1 - collapseEase * 0.9);
        this.homeNode.container.scale.set(scale);
        this.homeNode.container.alpha = this.homeNode.baseAlpha * (collapseP < 0.7
          ? 1 : Math.max(0, (1 - collapseP) / 0.3));
        this.homeNode.nameLabel.visible = false;
        this.animateStarBurn(this.homeNode, t, spinBoost);
      } else {
        const growP = collapseEase * 0.6;
        this.homeNode.container.alpha = Math.min(1, this.homeNode.baseAlpha + collapseEase * 0.5);
        this.homeNode.container.scale.set(1 + growP);
        this.homeNode.nameLabel.visible = false;
        const savedEP = this.homeNode.expandProgress;
        this.homeNode.expandProgress = 1;
        this.animateStarBurn(this.homeNode, t, spinBoost);
        this.homeNode.expandProgress = savedEP;
      }
    }

    for (const [id, node] of this.systemNodes) {
      foldStar(node, id === this.transitionTargetId);
    }

    // Dark overlay during blackout phase
    if (this.fadeOverlay && blackoutP > 0) {
      this.fadeOverlay.clear();
      this.fadeOverlay.rect(-2000, -2000, 4000, 4000);
      this.fadeOverlay.fill({ color: 0x020510, alpha: blackoutP });
    }

    if (elapsed >= BLACKOUT_END) {
      this.transitionActive = false;
      if (this.transitionOnComplete) {
        playSfx('warp-arrive', 0.35);
        this.transitionOnComplete();
        this.transitionOnComplete = null;
      }
    }
  }

  /**
   * Simplified star rendering for Tier 2 (faded) nodes.
   * Only draws a minimal glow + core dot — no orbiting particles, no concentric gradient.
   * Saves ~30-40 Graphics draw calls per Tier 2 node per frame.
   */
  private animateStarBurnSimple(node: SystemNode, t: number) {
    const g = node.particleGfx;
    g.clear();

    const { baseRadius, phaseOffset: ph, nebulaColor } = node;
    const coreR = Math.max(2.5, baseRadius * 0.42);
    const pulse = 0.85 + 0.15 * Math.sin(t * 0.0006 + ph);

    // Outer glow — just 3 rings instead of 16-24
    g.circle(0, 0, coreR * 2.0);
    g.fill({ color: nebulaColor, alpha: 0.03 * pulse });
    g.circle(0, 0, coreR * 1.2);
    g.fill({ color: nebulaColor, alpha: 0.08 * pulse });
    // Core dot
    g.circle(0, 0, coreR * 0.6);
    g.fill({ color: nebulaColor, alpha: 0.35 * pulse });
  }

  /**
   * Draw star system visuals into node.particleGfx (cleared each frame).
   *
   * Unexplored   → sonar ripple rings (unchanged)
   * Researching  → blue ring + star core (no orbits by default)
   * Researched   → clean star core + faint glow (no orbits by default)
   * Home         → warm star core (no orbits by default)
   *
   * When expandProgress > 0: tilted chaotic orbits + orbiting planet dots emerge
   * from the star's center, scaled by ease-out factor.
   */
  private animateStarBurn(node: SystemNode, t: number, spinBoost = 1) {
    const g = node.particleGfx;
    g.clear();

    const { starState, baseRadius, phaseOffset: ph, nebulaColor, particleCount, spectralClass } = node;
    const isHome = starState === 'home';
    const coreR = Math.max(2.5, baseRadius * (isHome ? 0.55 : 0.42));

    /* ── Unexplored: radial glow + quantum shimmer (like prototype) ── */
    if (starState === 'unexplored') {
      const isR2 = node.ringIndex >= 2;
      const maxR = isR2 ? 14 : 22;
      const baseAlpha = isR2 ? 0.10 : 0.18;
      const decay = isR2 ? 4.5 : 5.0;
      const brt = 0.82 + 0.18 * Math.sin(t * 0.0006 + ph);
      // Radial gradient glow (12 concentric circles — reduced from 24, outer circles were invisible)
      const numCircles = 12;
      for (let c = numCircles; c >= 1; c--) {
        const cf = c / numCircles;
        const cr = maxR * cf;
        const ca = baseAlpha * Math.exp(-cf * decay) * brt;
        if (ca > 0.002) {
          g.circle(0, 0, cr);
          g.fill({ color: nebulaColor, alpha: ca });
        }
      }
      // Bright core dot
      g.circle(0, 0, Math.max(1, coreR * 0.6));
      g.fill({ color: nebulaColor, alpha: 0.4 * brt });
      // Electron orbital dots — 2 particles circling unexplored stars like electrons
      const eOrbitR = coreR + 5;
      const ePulse = 0.45 + 0.55 * Math.sin(t * 0.0007 + ph);
      for (let i = 0; i < 2; i++) {
        const dir = i === 0 ? 0.0009 : -0.0013;
        const angle = (t * dir + i * Math.PI + ph) % (Math.PI * 2);
        g.circle(Math.cos(angle) * eOrbitR, Math.sin(angle) * eOrbitR * 0.45, 0.85);
        g.fill({ color: nebulaColor, alpha: 0.32 * ePulse });
      }
      return;
    }

    /* ── Visible star system ── */
    const pulse = 0.88 + 0.12 * Math.sin(t * 0.00095 + ph * 0.013);
    const br = starState === 'researching' ? 0.65 : 1.0;
    // Ring 2 personal stars: reduce glow intensity to reinforce "further away" feel
    const glowMul = (node.nodeType === 'personal' && node.ringIndex >= 2) ? 0.55 : 1.0;

    // Eased expansion factor (0=collapsed, 1=fully expanded)
    const ep = easeOutQuad(node.expandProgress);

    /* ── Radial gradient glow (10 concentric circles — reduced from 16, outer rings invisible) ── */
    const glowMaxR = coreR * 3.5;
    const GN = 10;
    for (let ci = GN; ci >= 1; ci--) {
      const f = ci / GN;            // 1.0 = outer edge, 1/GN = inner
      const r = glowMaxR * f;
      const a = 0.06 * Math.exp(-f * 4.0) * pulse * br * glowMul;
      if (a > 0.002) {
        g.circle(0, 0, r);
        g.fill({ color: nebulaColor, alpha: a });
      }
    }

    /* ── Gradient core — no hard edge, smooth center-bright falloff (8 steps, reduced from 14) ── */
    const coreSteps = 8;
    for (let ci = coreSteps; ci >= 1; ci--) {
      const f = ci / coreSteps;              // 1.0 = outer edge, 1/8 = inner
      const r = coreR * f;
      const a = Math.pow(1 - f, 0.55) * 0.90 * pulse * br * glowMul;
      if (a > 0.003) {
        g.circle(0, 0, r);
        g.fill({ color: nebulaColor, alpha: a });
      }
    }
    // Bright white centre highlight
    g.circle(0, 0, coreR * 0.22);
    g.fill({ color: 0xffffff, alpha: 0.55 * pulse * glowMul });

    /* ── HOME: warm glow accent ── */
    if (isHome) {
      g.circle(0, 0, coreR * 2.8);
      g.fill({ color: nebulaColor, alpha: 0.055 * pulse });
    }

    /* ── Orbiting particles: always visible for explored stars, smaller+dimmer with distance ── */
    {
      const isResearching = starState === 'researching';
      // When collapsed (not expanded), halve particle count for performance.
      // Full count is only needed when the star is expanded and orbits are visible.
      const expandedOrHome = ep > 0.01 || isHome;
      const pCount = isResearching ? 10 : (expandedOrHome ? particleCount : Math.ceil(particleCount * 0.5));
      const particleColor = SPECTRAL_PARTICLE_COLOR[spectralClass] ?? 0xfff8f0;
      const tSec = t * 0.001;
      const maxDist = isResearching ? 36 : 48;   // orbit radius limit
      for (let i = 0; i < pCount; i++) {
        const distFrac = ((i * 7 + 3) % 17) / 17;    // 0..1
        const dist = coreR * 1.2 + distFrac * (maxDist - coreR * 1.2);
        // Slow rotation
        const angle = i * 2.399 + tSec * spinBoost * (i % 2 ? 0.196 : -0.147);
        // Smaller + dimmer further from core
        const r = (0.75 - distFrac * 0.45) * (0.6 + (i % 3) * 0.25);
        // Slow twinkle, fade with distance
        const alpha = (0.22 - distFrac * 0.14)
          * (0.5 + 0.5 * Math.sin(tSec * 1.4 + i * 1.37))
          * br * glowMul;
        g.circle(Math.cos(angle) * dist, Math.sin(angle) * dist, r);
        g.fill({ color: particleColor, alpha });
      }
    }
  }

  /* ── Cinematic mode ──────────────────────────────────────── */

  setCinematicMode(enabled: boolean) {
    this.cinematicMode = enabled;
  }

  addFakePlayerMarkers(count: number) {
    const callsigns = [
      'ORBITAL-7', 'DELTA-3K', 'NOVA-12', 'HELIX-9', 'QUASAR-5',
      'ZENITH-4', 'PULSAR-88', 'VORTEX-21', 'NEBULA-6', 'COMET-15',
      'ASTRO-33', 'FLUX-77', 'PHOTON-2', 'PLASMA-19', 'ECHO-44',
    ];
    const allNodes = [...this.systemNodes.values()];
    const n = Math.min(count, allNodes.length);
    for (let i = 0; i < n; i++) {
      const node = allNodes[i % allNodes.length];
      const c = new Container();

      const dot = new Graphics();
      dot.circle(0, 0, 3);
      dot.fill({ color: 0x44ff88, alpha: 0.8 });
      c.addChild(dot);

      const label = new Text({
        text: callsigns[i % callsigns.length],
        style: { fontSize: 7, fill: 0x44ff88, fontFamily: 'monospace' },
        resolution: 2,
      });
      label.alpha = 0.6;
      label.x = 6;
      label.y = -4;
      c.addChild(label);

      c.x = node.tx + (Math.random() - 0.5) * 40;
      c.y = node.ty + (Math.random() - 0.5) * 40;

      this.nodesLayer.addChild(c);
      this.fakePlayerMarkers.push(c);
    }
  }

  removeFakePlayerMarkers() {
    for (const m of this.fakePlayerMarkers) {
      m.parent?.removeChild(m);
      m.destroy();
    }
    this.fakePlayerMarkers = [];
  }

  private updateFakePlayerMarkers(t: number, dt: number) {
    for (let i = 0; i < this.fakePlayerMarkers.length; i++) {
      const m = this.fakePlayerMarkers[i];
      const dot = m.children[0] as Graphics;
      if (dot) dot.alpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 0.003 + i * 1.7));
      m.x += Math.sin(t * 0.001 + i * 2.3) * dt * 0.004;
      m.y += Math.cos(t * 0.0012 + i * 3.1) * dt * 0.003;
    }
  }

  /* ── Research labels mode ──────────────────────────────────── */

  /**
   * Toggle per-star research labels.
   * Eye ON  → show a colored dot over every Tier-1 star:
   *   🟢 green  = fully researched (100%)
   *   🟡 yellow = research in progress (0 < prog < 100)
   *   🔴 red    = untouched (prog === 0)
   * Eye OFF → show `${prog}%` only for partially-researched stars; nothing for
   *   0% or 100% (keeps the map clean).
   * Tier 2/3 (faded/hidden) → no labels in either mode.
   */
  showResearchLabels(enabled: boolean) {
    this.researchLabelsEnabled = enabled;
    const allNodes: SystemNode[] = [
      ...(this.homeNode ? [this.homeNode] : []),
      ...this.systemNodes.values(),
    ];
    for (const node of allNodes) {
      if (node.visibilityTier !== 1) {
        if (node.researchLabel) node.researchLabel.visible = false;
        continue;
      }

      const isHome = node.system.ownerPlayerId !== null;
      const isFull = isHome || isSystemFullyResearched(this.researchState, node.system.id);
      const prog = isFull ? 100 : Math.round(getResearchProgress(this.researchState, node.system.id));

      let text: string;
      let color: number;
      let fontSize: number;

      if (enabled) {
        // Colored status dot
        text = '●';
        fontSize = 8;
        if (isFull)       color = 0x44ff88; // green
        else if (prog > 0) color = 0xffcc44; // yellow
        else              color = 0xcc4444; // red
      } else {
        // No eye: only show partial progress as number, hide clean/100%
        if (isFull || prog === 0) {
          if (node.researchLabel) node.researchLabel.visible = false;
          continue;
        }
        text = `${prog}%`;
        color = 0xaabbcc;
        fontSize = 7;
      }

      if (!node.researchLabel) {
        node.researchLabel = new Text({
          text,
          style: { fontSize, fill: color, fontFamily: 'monospace' },
          resolution: 2,
        });
        node.researchLabel.anchor.set(0.5, 1);
        node.researchLabel.y = -node.baseRadius - 4;
        node.container.addChild(node.researchLabel);
      } else {
        node.researchLabel.text = text;
        node.researchLabel.style.fontSize = fontSize;
        node.researchLabel.style.fill = color;
        node.researchLabel.visible = true;
      }
    }
  }

  /** Spawn a "Досліджено!" achievement label floating above a star */
  private spawnCompletionLabel(node: SystemNode) {
    const label = new Text({
      text: tStatic('galaxy.researched'),
      style: { fontSize: 11, fill: 0x44ff88, fontFamily: 'monospace' },
      resolution: 2,
    });
    label.anchor.set(0.5, 1);
    label.x = node.tx;
    label.y = node.ty - node.baseRadius - 16;
    label.alpha = 0;
    this.researchGainLayer.addChild(label);
    this.researchGainLabels.push({ text: label, worldX: label.x, worldY: label.y, startTime: this.time });
  }

  /* ── Cleanup ───────────────────────────────────────────────── */

  destroy() {
    this.removeFakePlayerMarkers();
    this.container.destroy({ children: true });
    this.systemNodes.clear();
  }
}
