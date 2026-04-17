import { Container, Graphics, Text } from 'pixi.js';
import type { GalaxyRing, StarSystem, ResearchState, SpectralClass } from '@nebulife/core';
import { getResearchProgress, isSystemFullyResearched, SeededRNG, computeGroupPosition } from '@nebulife/core';
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

interface SystemNode {
  container: Container;
  system: StarSystem;
  nameLabel: Text;
  scanArc: Graphics | null;
  /** Atom orbital animation — visible at 0% (no probe tail yet) */
  atomOrbit: Graphics | null;
  /** Research label shown in research-mode overlay (% progress or ◉ for 100%) */
  researchLabel: Text | null;
  glowOuter: Graphics;  // kept for transition compat (empty)
  glowMid: Graphics;    // kept for transition compat (empty)
  corona: Graphics;     // kept for transition compat (empty)
  core: Graphics;       // kept for transition compat (empty)
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

  constructor(
    rings: GalaxyRing[],
    galaxySeed: number,
    playerCenterX: number,
    playerCenterY: number,
    researchState: ResearchState,
    neighborSystems?: Array<{ system: StarSystem; ownerIndex: number }>,
    coreSystems?: Array<{ system: StarSystem; coreId: number; depth: number }>,
    expandedVisible?: boolean,
    groupCount?: number,
    playerGroupIndex?: number,
    private onSelect?: (system: StarSystem, screenPos?: { x: number; y: number }) => void,
    private onDoubleClick?: (system: StarSystem) => void,
    private onTelescopeClick?: (system: StarSystem) => void,
    private clickGuard?: () => boolean,
    private onExpandSystem?: (system: StarSystem) => void,
    private onRadialOpen?: (system: StarSystem, getScreenPos: () => { x: number; y: number } | null) => void,
    private onRadialClose?: () => void,
  /** Called when pointer enters/leaves a researching star — for animated progress HUD */
  private onHoverSystem?: (systemId: string | null, progress: number) => void,
  ) {
    this.container = new Container();
    this.researchState = researchState;

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
        this.systemNodes.set(system.id, node);
      }
    }

    /* ── Core systems (galactic core mesh, progressive BFS depth) ── */
    if (coreSystems) {
      for (const { system } of coreSystems) {
        // Skip if already present
        if (this.systemNodes.has(system.id)) continue;

        let tx = (system.position.x - homeX) * PX_PER_LY;
        let ty = (system.position.y - homeY) * PX_PER_LY;
        const jrng = new SeededRNG(system.seed);
        tx += (jrng.next() - 0.5) * PX_PER_LY * 4.0;
        ty += (jrng.next() - 0.5) * PX_PER_LY * 4.0;

        const node = this.buildSysNode(system, tx, ty, 3);
        node.nodeType = 'core';
        node.baseAlpha = expandedVisible ? 0.35 : 0;
        node.baseRadius *= 0.6;
        node.nameLabel.style.fill = 0x554433;
        node.container.alpha = node.baseAlpha;
        this.systemNodes.set(system.id, node);
      }
    }

    this.buildConnectionEdges();

    /* ── Background cluster visualization ── */
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
   * Create the standard star container with empty compat Graphics + live particleGfx.
   */
  private createStarGfx(): {
    container: Container; glowOuter: Graphics; glowMid: Graphics; corona: Graphics; core: Graphics; particleGfx: Graphics;
  } {
    const container = new Container();
    const glowOuter = new Graphics();
    const glowMid = new Graphics();
    const corona = new Graphics();
    const core = new Graphics();
    container.addChild(glowOuter);
    container.addChild(glowMid);
    container.addChild(corona);
    container.addChild(core);
    const particleGfx = new Graphics();
    container.addChild(particleGfx);
    return { container, glowOuter, glowMid, corona, core, particleGfx };
  }

  // Menu icon removed — replaced by RadialMenu (React overlay)

  /* ── HOME node ─────────────────────────────────────────────── */

  private buildHomeNode(sys: StarSystem) {
    const spectralMul = SPECTRAL_SIZE_MUL[sys.star.spectralClass] ?? 1.0;
    const baseR = starBaseRadius(sys.star.luminositySolar) * 1.6 * spectralMul;
    const phase = this.hash(sys.id);

    const { container: dot, glowOuter, glowMid, corona, core, particleGfx } = this.createStarGfx();

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
      glowOuter, glowMid, corona, core, particleGfx,
      starState: 'home', planetCount: sys.planets.length,
      nodeType: 'personal' as const,
      nebulaColor, particleCount: 72,
      phaseOffset: phase, speed: 0.8 + (phase / (Math.PI * 2)) * 0.7,
      baseRadius: baseR, baseAlpha: 1,
      spectralClass: sys.star.spectralClass,
      tx: 0, ty: 0, ringIndex: 0,
      expandProgress: 0, expandTarget: 0,
      radialOpenFired: false,
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

    const { container: dot, glowOuter, glowMid, corona, core, particleGfx } = this.createStarGfx();
    const starState: SystemNode['starState'] = state === 'unexplored' ? 'unexplored'
      : state === 'researching' ? 'researching'
      : state === 'researched' ? 'researched'
      : 'home';

    dot.x = tx;
    dot.y = ty;

    // Scanning arc (spinning arc for actively researching systems)
    let scanArc: Graphics | null = null;
    if (state === 'researching') {
      scanArc = new Graphics();
      dot.addChild(scanArc);
    }

    // Atom orbital animation — 2 tilted electron rings, shown at 0% progress
    let atomOrbit: Graphics | null = null;
    if (state === 'researching') {
      atomOrbit = new Graphics();
      dot.addChild(atomOrbit);
    }

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
      glowOuter, glowMid, corona, core, particleGfx,
      starState, planetCount: sys.planets.length,
      nodeType: 'personal' as const,
      nebulaColor, particleCount,
      phaseOffset: phase, speed, baseRadius: adjustedRadius,
      baseAlpha, tx, ty, ringIndex,
      spectralClass: sys.star.spectralClass,
      expandProgress: 0, expandTarget: 0,
      radialOpenFired: false,
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

    // Dim all except focused to 50%
    if (this.homeNode && this.homeNode.system.id !== systemId) {
      this.homeNode.baseAlpha = 0.5;
    }
    for (const [id, node] of this.systemNodes) {
      node.baseAlpha = id === systemId ? 1 : 0.5;
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
    for (const [, node] of this.systemNodes) {
      if (node.nodeType === 'neighbor') {
        node.baseAlpha = visible ? 0.45 : 0;
      }
      if (node.nodeType === 'core') {
        node.baseAlpha = visible ? 0.35 : 0;
      }
    }
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

      // Keep research label in sync
      if (this.researchLabelsEnabled && node.researchLabel) {
        node.researchLabel.text = `${Math.round(prog)}%`;
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
      // Update research mode label to eye symbol
      if (this.researchLabelsEnabled && node.researchLabel) {
        node.researchLabel.text = '◉';
        node.researchLabel.style.fill = 0x44ff88;
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
      node.container.alpha += (node.baseAlpha - node.container.alpha) * Math.min(1, ANIM_SPEED * dt);
      animateExpand(node);
      this.animateStarBurn(node, t);

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
      const N = 10;
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
      if (node.starState === 'researched') drawTerritoryAura(node.tx, node.ty);
    }

    // Wavy connection lines — blue threads between stars
    this.connectionLines.clear();
    for (const edge of this.connectionEdges) {
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
      const alpha = Math.min(vis(st1, ri1), vis(st2, ri2)) * 0.28;
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
      // Radial gradient glow (24 concentric circles for smooth falloff from center)
      const numCircles = 24;
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

    /* ── Radial gradient glow (16 concentric circles simulating smooth radial gradient) ── */
    const glowMaxR = coreR * 3.5;
    const GN = 16;
    for (let ci = GN; ci >= 1; ci--) {
      const f = ci / GN;            // 1.0 = outer edge, 1/GN = inner
      const r = glowMaxR * f;
      const a = 0.06 * Math.exp(-f * 4.0) * pulse * br * glowMul;
      if (a > 0.002) {
        g.circle(0, 0, r);
        g.fill({ color: nebulaColor, alpha: a });
      }
    }

    /* ── Gradient core — no hard edge, smooth center-bright falloff ── */
    const coreSteps = 14;
    for (let ci = coreSteps; ci >= 1; ci--) {
      const f = ci / coreSteps;              // 1.0 = outer edge, 1/14 = inner
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
      const pCount = isResearching ? 10 : particleCount;
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

  /** Toggle per-star research labels (% text or ◉ for 100% researched) */
  showResearchLabels(enabled: boolean) {
    this.researchLabelsEnabled = enabled;
    const allNodes: SystemNode[] = [
      ...(this.homeNode ? [this.homeNode] : []),
      ...this.systemNodes.values(),
    ];
    for (const node of allNodes) {
      const isHome = node.system.ownerPlayerId !== null;
      const isFull = isHome || isSystemFullyResearched(this.researchState, node.system.id);
      const prog = isFull ? 100 : Math.round(getResearchProgress(this.researchState, node.system.id));

      if (enabled) {
        const text = isFull ? '◉' : prog > 0 ? `${prog}%` : '·';
        const color = isFull ? 0x44ff88 : prog > 0 ? 0x8899aa : 0x3a4d5a;

        if (!node.researchLabel) {
          node.researchLabel = new Text({
            text,
            style: { fontSize: isFull ? 9 : 7, fill: color, fontFamily: 'monospace' },
            resolution: 2,
          });
          node.researchLabel.anchor.set(0.5, 1);
          node.researchLabel.y = -node.baseRadius - 4;
          node.container.addChild(node.researchLabel);
        } else {
          node.researchLabel.text = text;
          node.researchLabel.style.fill = color;
          node.researchLabel.visible = true;
        }
      } else {
        if (node.researchLabel) node.researchLabel.visible = false;
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
