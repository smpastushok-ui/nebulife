import { Container, Graphics, Text } from 'pixi.js';
import type { GalaxyRing, StarSystem, ResearchState, SpectralClass } from '@nebulife/core';
import { getResearchProgress, isSystemFullyResearched } from '@nebulife/core';
import { createGalaxyBackdrop, type TwinkleStarData } from '../rendering/GalaxyBackdrop.js';

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
const PX_PER_LY = 14;

/** Easing speed for alpha transitions */
const ANIM_SPEED = 5;

/** Orbit expand: 1500ms forward, 600ms reverse */
const EXPAND_DURATION = 1500;
const COLLAPSE_DURATION = 600;

/* ── Interfaces ────────────────────────────────────────────────── */

interface SystemNode {
  container: Container;
  system: StarSystem;
  nameLabel: Text;
  progressLabel: Text | null;
  progressRing: Graphics | null;
  scanArc: Graphics | null;
  glowOuter: Graphics;  // kept for transition compat (empty)
  glowMid: Graphics;    // kept for transition compat (empty)
  corona: Graphics;     // kept for transition compat (empty)
  core: Graphics;       // kept for transition compat (empty)
  /** Per-frame particle canvas — cleared+redrawn every update */
  particleGfx: Graphics;
  /** Visual state for rendering */
  starState: 'home' | 'researched' | 'researching' | 'unexplored';
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

  /** MST + extra edges (kept for reference, not rendered) */
  private connectionEdges: Array<{ x1: number; y1: number; x2: number; y2: number; seed: number }> = [];

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

  constructor(
    rings: GalaxyRing[],
    galaxySeed: number,
    playerCenterX: number,
    playerCenterY: number,
    researchState: ResearchState,
    private onSelect: (system: StarSystem, screenPos?: { x: number; y: number }) => void,
    private onDoubleClick: (system: StarSystem) => void,
    private onTelescopeClick?: (system: StarSystem) => void,
    private clickGuard?: () => boolean,
    private onExpandSystem?: (system: StarSystem) => void,
    private onRadialOpen?: (system: StarSystem, getScreenPos: () => { x: number; y: number } | null) => void,
    private onRadialClose?: () => void,
  ) {
    this.container = new Container();
    this.researchState = researchState;

    /* Galaxy backdrop — kept for twinkle stars scatter during transition, but NOT rendered */
    const bd = createGalaxyBackdrop({ seed: galaxySeed, centerX: 0, centerY: 0 });
    this.accretionDisk = null;
    this.backdropContainer = null;
    this.twinkleStars = bd.twinkleStars;

    /* Render layers */
    this.connectionLines = new Graphics();
    this.container.addChild(this.connectionLines);
    this.beamGfx = new Graphics();
    this.container.addChild(this.beamGfx);
    this.nodesLayer = new Container();
    this.container.addChild(this.nodesLayer);

    /* Collect all systems with ring info */
    const all = rings.flatMap(r => r.starSystems.map(s => ({ system: s, ringIndex: r.ringIndex })));
    this.homeSystem = all.find(a => a.system.ownerPlayerId !== null)?.system ?? all[0].system;

    /* Build all nodes */
    const homeX = this.homeSystem.position.x;
    const homeY = this.homeSystem.position.y;

    for (const { system, ringIndex } of all) {
      const tx = (system.position.x - homeX) * PX_PER_LY;
      const ty = (system.position.y - homeY) * PX_PER_LY;

      if (system.ownerPlayerId !== null) {
        this.buildHomeNode(system);
      } else {
        const node = this.buildSysNode(system, tx, ty, ringIndex);
        this.systemNodes.set(system.id, node);
      }
    }

    this.buildConnectionEdges();
  }

  /* ── Helpers ────────────────────────────────────────────────── */

  private getState(sys: StarSystem): 'home' | 'researched' | 'researching' | 'unexplored' {
    if (sys.ownerPlayerId !== null) return 'home';
    if (isSystemFullyResearched(this.researchState, sys.id)) return 'researched';
    if (getResearchProgress(this.researchState, sys.id) > 0) return 'researching';
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
    for (const [, n] of this.systemNodes) pts.push({ x: n.tx, y: n.ty, ring: n.ringIndex });

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
    const amp = Math.min(10, len * 0.045);
    const N = Math.ceil(len / 7);
    g.moveTo(x1, y1);
    for (let i = 1; i <= N; i++) {
      const s = i / N;
      const env = Math.sin(s * Math.PI);
      const w1 = amp * env * Math.sin(s * Math.PI * 2.8 + t * 0.00055 + seed);
      const w2 = amp * 0.42 * env * Math.sin(s * Math.PI * 5.5 - t * 0.00105 + seed * 2.1);
      const w3 = amp * 0.18 * env * Math.sin(s * Math.PI * 9 + t * 0.0008 + seed * 3.7);
      g.lineTo(x1 + dx * s + nx * (w1 + w2 + w3), y1 + dy * s + ny * (w1 + w2 + w3));
    }
    g.stroke({ width: 0.7, color: 0x2e4466, alpha });
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
    dot.hitArea = { contains: (px: number, py: number) => px * px + py * py < (baseR + 10) * (baseR + 10) };

    dot.on('pointerover', () => { nl.visible = true; dot.scale.set(1.12); });
    dot.on('pointerout', () => { nl.visible = false; dot.scale.set(1.0); });

    let cc = 0;
    let ct: ReturnType<typeof setTimeout> | null = null;
    dot.on('pointerdown', () => {
      if (this.cinematicMode) return;
      cc++;
      if (cc === 1) {
        ct = setTimeout(() => {
          if (cc === 1) {
            this.expandSystem(sys.id);
          }
          cc = 0;
        }, 300);
      } else if (cc === 2) {
        if (ct) clearTimeout(ct);
        cc = 0;
        this.onDoubleClick(sys);
      }
    });

    this.nodesLayer.addChild(dot);

    const nebulaColor = hexToNum(sys.star.colorHex);

    this.homeNode = {
      container: dot, system: sys, nameLabel: nl,
      progressLabel: null, progressRing: null, scanArc: null,
      glowOuter, glowMid, corona, core, particleGfx,
      starState: 'home', planetCount: sys.planets.length,
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

    // Progress pie arc (only for 1-99%)
    let progressRing: Graphics | null = null;
    if (state === 'researching' && progress > 0 && progress < 100) {
      progressRing = new Graphics();
      const coreRingR = Math.max(2.5, effectiveR * 0.42) * 1.8 + 5;
      this.drawProgressPie(progressRing, coreRingR, progress / 100);
      dot.addChild(progressRing);
    }

    // Scanning arc (spinning arc for actively researching systems)
    let scanArc: Graphics | null = null;
    if (state === 'researching') {
      scanArc = new Graphics();
      dot.addChild(scanArc);
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
    const hitR = effectiveR + 8;
    dot.hitArea = { contains: (px: number, py: number) => px * px + py * py < hitR * hitR };

    dot.on('pointerover', () => { nameLabel.visible = true; dot.scale.set(1.12); });
    dot.on('pointerout', () => { nameLabel.visible = false; dot.scale.set(1.0); });

    let cc = 0;
    let ct: ReturnType<typeof setTimeout> | null = null;
    dot.on('pointerdown', () => {
      if (this.cinematicMode) return;
      if (this.clickGuard?.()) return;
      cc++;
      if (cc === 1) {
        ct = setTimeout(() => {
          if (cc === 1) {
            if (!this.clickGuard?.()) {
              this.expandSystem(sys.id);
            }
          }
          cc = 0;
        }, 300);
      } else if (cc === 2) {
        if (ct) clearTimeout(ct);
        cc = 0;
        if (!this.clickGuard?.()) {
          this.onDoubleClick(sys);
        }
      }
    });

    this.nodesLayer.addChild(dot);

    let baseAlpha: number;
    if (state === 'researched' || state === 'home') {
      baseAlpha = 1;
    } else if (state === 'researching') {
      baseAlpha = 0.75 + (progress / 100) * 0.25;
    } else {
      baseAlpha = 0.75;
    }

    dot.alpha = baseAlpha;

    const speed = 0.5 + (phase / (Math.PI * 2)) * 1.0;
    const nebulaColor = hexToNum(sys.star.colorHex);
    const particleCount = starState === 'home' ? 72 : 25 + Math.min(sys.planets.length, 8) * 4;

    return {
      container: dot, system: sys, nameLabel,
      progressLabel: null, progressRing, scanArc,
      glowOuter, glowMid, corona, core, particleGfx,
      starState, planetCount: sys.planets.length,
      nebulaColor, particleCount,
      phaseOffset: phase, speed, baseRadius: effectiveR,
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

  /** Draw a progress arc: bright arc stroke only, no fill */
  private drawProgressPie(g: Graphics, radius: number, fraction: number) {
    if (fraction <= 0.005) return;
    const r = radius;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + fraction * Math.PI * 2;
    const segments = 28;
    g.moveTo(Math.cos(startAngle) * r, Math.sin(startAngle) * r);
    for (let i = 1; i <= segments; i++) {
      const a = startAngle + (endAngle - startAngle) * (i / segments);
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.stroke({ width: 1.5, color: 0x88ccff, alpha: 0.7 });
  }

  get isFocused(): boolean {
    return this.focusedSystemId !== null;
  }

  get isTransitioning(): boolean {
    return this.transitionActive;
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

    if (state === 'researching') {
      node.starState = 'researching';
      node.baseAlpha = 0.75 + (prog / 100) * 0.25;
      if (node.progressRing) {
        if (prog > 0 && prog < 100) {
          node.progressRing.clear();
          const coreRingR = Math.max(2.5, node.baseRadius * 0.42) * 1.8 + 5;
          this.drawProgressPie(node.progressRing, coreRingR, prog / 100);
          node.progressRing.visible = true;
        } else {
          node.progressRing.visible = false;
        }
      }
      if (!node.scanArc) {
        node.scanArc = new Graphics();
        node.container.addChild(node.scanArc);
      }
    }

    if (state === 'researched') {
      node.starState = 'researched';
      node.baseAlpha = 1;
      if (node.progressRing) node.progressRing.visible = false;
      if (node.scanArc) node.scanArc.visible = false;
      node.nameLabel.text = node.system.name;
      node.nameLabel.style.fill = 0x8899aa;
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

      // Animate scan arc (spinning ring during active research)
      if (node.scanArc) {
        const isActive = this.researchState.slots.some((s) => s.systemId === node.system.id);
        node.scanArc.visible = isActive;
        if (isActive) {
          node.scanArc.clear();
          const r = Math.max(2.5, node.baseRadius * 0.42) * 1.8 + 6;
          const angle = (t * 0.003) % (Math.PI * 2);
          const arcLen = Math.PI * 0.6;
          const segments = 16;
          for (let i = 0; i < segments; i++) {
            const a0 = angle + (arcLen * i) / segments;
            const a1 = angle + (arcLen * (i + 1)) / segments;
            const alpha = 0.7 * (1 - i / segments);
            node.scanArc.moveTo(Math.cos(a0) * r, Math.sin(a0) * r);
            node.scanArc.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
            node.scanArc.stroke({ width: 1.5, color: 0x4488ff, alpha });
          }
        }
      }
    }

    // Connection lines removed per design decision

    this.beamGfx.clear(); // keep clear — beam removed from design

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
        if (node.progressRing) node.progressRing.visible = false;
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
        if (node.progressRing) node.progressRing.visible = false;
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

    /* ── Unexplored: concentric halo (like prototype) ── */
    if (starState === 'unexplored') {
      const isR2 = node.ringIndex >= 2;
      const maxR = isR2 ? 10 : 16;
      const baseAlpha = isR2 ? 0.06 : 0.16;
      const decay = isR2 ? 3.8 : 5.5;
      const brt = 0.82 + 0.18 * Math.sin(t * 0.0006 + ph);
      const numCircles = 12;
      for (let c = 1; c < numCircles; c++) {
        const cf = c / (numCircles - 1);
        const cr = maxR * cf;
        const ca = baseAlpha * Math.pow(1 - cf, decay) * brt;
        if (ca > 0.005) {
          g.circle(0, 0, cr);
          g.stroke({ width: 0.7, color: nebulaColor, alpha: ca });
        }
      }
      // Small core dot
      g.circle(0, 0, Math.max(1, coreR * 0.6));
      g.fill({ color: nebulaColor, alpha: 0.3 * brt });
      // R1 only: 5 companion dots in slow orbit
      if (!isR2) {
        const tSec = t * 0.001;
        for (let d = 0; d < 5; d++) {
          const da = d * 1.2566 + tSec * 0.5;
          const dr = 8 + d * 3;
          g.circle(Math.cos(da) * dr, Math.sin(da) * dr, 0.7);
          g.fill({ color: nebulaColor, alpha: 0.18 * brt });
        }
      }
      return;
    }

    /* ── Visible star system ── */
    const pulse = 0.88 + 0.12 * Math.sin(t * 0.00095 + ph * 0.013);
    const br = starState === 'researching' ? 0.65 : 1.0;

    // Eased expansion factor (0=collapsed, 1=fully expanded)
    const ep = easeOutQuad(node.expandProgress);

    /* ── Single subtle ambient glow ── */
    g.circle(0, 0, coreR * 2.5);
    g.fill({ color: nebulaColor, alpha: 0.038 * br * pulse });

    /* ── Ambient particles ── */
    // Researching: always show 14 dim particles (no expand needed)
    // Researched/home: show full count when expanding
    const isResearching = starState === 'researching';
    const pCount = isResearching ? 14 : particleCount;
    const pEp = isResearching ? 1 : ep;  // researching doesn't need expand
    if ((isResearching || ep > 0.005) && pEp > 0) {
      const particleColor = SPECTRAL_PARTICLE_COLOR[spectralClass] ?? 0xfff8f0;
      const tSec = t * 0.001;
      for (let i = 0; i < pCount; i++) {
        const baseDist = 15 + ((i * 7 + 3) % 17) / 17 * 32;
        const dist = baseDist * (isResearching ? 0.82 : pEp);
        const angle = i * 2.399 + tSec * spinBoost * (i % 2 ? 0.28 : -0.21);
        const r = 0.65 + (i % 3) * 0.38;
        const alpha = (0.18 + (i % 5) * 0.08)
          * (0.5 + 0.5 * Math.sin(tSec * 2.2 + i * 1.37))
          * Math.min(1, isResearching ? 1 : ep * 2)
          * br;
        g.circle(Math.cos(angle) * dist, Math.sin(angle) * dist, r);
        g.fill({ color: particleColor, alpha });
      }
    }

    /* ── Star core ── */
    const starColor = isHome ? 0xffc864
      : starState === 'researching' ? 0x5599ee : 0xd2ebff;

    // Soft inner glow ring
    g.circle(0, 0, coreR * 1.7);
    g.fill({ color: starColor, alpha: 0.12 * pulse * br });

    // Bright core dot
    g.circle(0, 0, coreR);
    g.fill({ color: 0xffffff, alpha: 0.95 * pulse });

    /* ── HOME: warm glow accent ── */
    if (isHome) {
      g.circle(0, 0, coreR * 2.8);
      g.fill({ color: 0xffc864, alpha: 0.055 * pulse });
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

  /* ── Cleanup ───────────────────────────────────────────────── */

  destroy() {
    this.removeFakePlayerMarkers();
    this.container.destroy({ children: true });
    this.systemNodes.clear();
  }
}
