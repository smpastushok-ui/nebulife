import { Container, Graphics, Text } from 'pixi.js';
import type { GalaxyRing, StarSystem, ResearchState, SpectralClass } from '@nebulife/core';
import { getResearchProgress, isSystemFullyResearched } from '@nebulife/core';
import { createGalaxyBackdrop, type TwinkleStarData } from '../rendering/GalaxyBackdrop.js';

/* ── Helpers ───────────────────────────────────────────────────── */

/** HSL → 0xRRGGBB (h: 0-1, s: 0-1, l: 0-1) */
function hslToRgb(h: number, s: number, l: number): number {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return ((Math.round(f(0) * 255) << 16) | (Math.round(f(8) * 255) << 8) | Math.round(f(4) * 255));
}

/** RGB hex → HSL (returns h: 0-1, s: 0-1, l: 0-1) */
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
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
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

/** Compute star display radius from luminosity (log-scale, clamped 3-12px) */
function starBaseRadius(luminositySolar: number): number {
  return Math.max(3, Math.min(12, Math.log2(1 + luminositySolar) * 4));
}

/** Size multiplier per spectral class — hot/massive stars appear bigger */
const SPECTRAL_SIZE_MUL: Record<SpectralClass, number> = {
  O: 1.8, B: 1.5, A: 1.2, F: 1.1, G: 1.0, K: 0.95, M: 0.85,
};

/** Hot stars (O/B/A) get stronger burn animation */
const HOT_STARS: Set<SpectralClass> = new Set(['O', 'B', 'A']);

/* ── Layout constants ──────────────────────────────────────────── */

type Direction = 'up' | 'right' | 'down' | 'left';

const DIR_ANGLES: Record<Direction, number> = {
  up: -Math.PI / 2,
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
};

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down', down: 'up', left: 'right', right: 'left',
};

const DIR_ORDER: Direction[] = ['up', 'right', 'down', 'left'];

const BTN_DIST   = 55;   // direction button distance from HOME
const SYS_START  = 90;   // first system distance from HOME
const SYS_GAP    = 58;   // gap between systems in arm
const ZIGZAG     = 22;   // perpendicular offset (alternate up/down)
const ANIM_SPEED = 5;    // expand/collapse speed (units/sec)

/* ── Interfaces ────────────────────────────────────────────────── */

interface SystemNode {
  container: Container;
  system: StarSystem;
  nameLabel: Text;
  progressLabel: Text | null;
  progressRing: Graphics | null;
  /** Animatable glow layers */
  glowOuter: Graphics;
  glowMid: Graphics;
  corona: Graphics;
  core: Graphics;
  /** Animation params */
  phaseOffset: number;
  speed: number;
  baseRadius: number;
  baseAlpha: number;
  spectralClass: SpectralClass;
  /** Expanded position relative to HOME (0,0) */
  tx: number;
  ty: number;
  /** Index in the arm for cascade delay */
  index: number;
}

interface DirGroup {
  direction: Direction;
  angle: number;
  systems: StarSystem[];
  nodes: SystemNode[];
  bg: Graphics;
  arrowGfx: Graphics;
  button: Container;
  expanded: boolean;
  /** 0 = collapsed, 1 = expanded */
  progress: number;
}

/* ── Scene ─────────────────────────────────────────────────────── */

export class GalaxyScene {
  container: Container;

  private groups = new Map<Direction, DirGroup>();
  private systemNodes = new Map<string, SystemNode>();
  private homeSystem: StarSystem;
  private homeNode: SystemNode | null = null;
  private time = 0;

  private accretionDisk: Container | null = null;
  private backdropContainer: Container | null = null;
  private researchState: ResearchState;

  private armLines: Graphics;
  private beamGfx: Graphics;
  private nodesLayer: Container;

  private selectedSystemId: string | null = null;
  private beamAlpha = 0;

  /** Individually animated backdrop twinkle stars */
  private twinkleStars: TwinkleStarData[] = [];

  /** Focus state: which system is focused (centered with menu) */
  private focusedSystemId: string | null = null;
  /** Saved positions before focus (for unfocus restore) */
  private preFocusPositions = new Map<string, { tx: number; ty: number; baseAlpha: number }>();
  /** Saved expanded state of direction groups before focus */
  private preFocusExpanded = new Map<Direction, boolean>();

  constructor(
    rings: GalaxyRing[],
    galaxySeed: number,
    playerCenterX: number,
    playerCenterY: number,
    researchState: ResearchState,
    private onSelect: (system: StarSystem, screenPos?: { x: number; y: number }) => void,
    private onDoubleClick: (system: StarSystem) => void,
  ) {
    this.container = new Container();
    this.researchState = researchState;

    /* Galaxy backdrop (visual only) */
    const gcx = -playerCenterX * 8;
    const gcy = -playerCenterY * 8;
    const bd = createGalaxyBackdrop({ seed: galaxySeed, centerX: gcx, centerY: gcy });
    this.container.addChild(bd.container);
    this.accretionDisk = bd.accretionDisk;
    this.backdropContainer = bd.backdropContainer;
    this.twinkleStars = bd.twinkleStars;

    /* Render layers */
    this.armLines = new Graphics();
    this.container.addChild(this.armLines);
    this.beamGfx = new Graphics();
    this.container.addChild(this.beamGfx);
    this.nodesLayer = new Container();
    this.container.addChild(this.nodesLayer);

    /* Separate home from others */
    const all = rings.flatMap(r => r.starSystems);
    this.homeSystem = all.find(s => s.ownerPlayerId !== null)!;
    const others = all.filter(s => s.ownerPlayerId === null);

    /* Group by direction */
    const grouped = this.groupByDir(others);

    /* HOME node at center */
    this.buildHomeNode();

    /* Direction arms */
    for (const dir of DIR_ORDER) {
      this.buildDirGroup(dir, grouped.get(dir) || []);
    }
  }

  /* ── Grouping ──────────────────────────────────────────────── */

  private groupByDir(systems: StarSystem[]): Map<Direction, StarSystem[]> {
    const hx = this.homeSystem.position.x;
    const hy = this.homeSystem.position.y;
    const map = new Map<Direction, StarSystem[]>(DIR_ORDER.map(d => [d, []]));

    for (const sys of systems) {
      const a = Math.atan2(sys.position.y - hy, sys.position.x - hx);
      let dir: Direction;
      if (a >= -Math.PI / 4 && a < Math.PI / 4)          dir = 'right';
      else if (a >= Math.PI / 4 && a < 3 * Math.PI / 4)  dir = 'down';
      else if (a >= -3 * Math.PI / 4 && a < -Math.PI / 4) dir = 'up';
      else                                                   dir = 'left';
      map.get(dir)!.push(sys);
    }

    // Sort by distance from home
    for (const [, arr] of map) {
      arr.sort((a, b) =>
        Math.hypot(a.position.x - hx, a.position.y - hy) -
        Math.hypot(b.position.x - hx, b.position.y - hy),
      );
    }
    return map;
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
   * Create the 4 animatable glow layers for a star.
   * Layers: outer glow, mid glow (saturated), corona (key visibility), bright core.
   */
  private createStarGfx(color: number, radius: number): {
    container: Container; glowOuter: Graphics; glowMid: Graphics; corona: Graphics; core: Graphics;
  } {
    const container = new Container();
    const saturated = saturateColor(color, 0.4);

    // Outer glow — soft, wide (boosted alpha)
    const glowOuter = new Graphics();
    glowOuter.circle(0, 0, radius * 3.0);
    glowOuter.fill({ color, alpha: 0.12 });
    container.addChild(glowOuter);

    // Mid glow — saturated color, brighter (boosted alpha)
    const glowMid = new Graphics();
    glowMid.circle(0, 0, radius * 1.8);
    glowMid.fill({ color: saturated, alpha: 0.30 });
    container.addChild(glowMid);

    // Corona — key visibility layer, strong saturated color
    const corona = new Graphics();
    corona.circle(0, 0, radius * 1.2);
    corona.fill({ color: saturated, alpha: 0.40 });
    container.addChild(corona);

    // Core — bright white center with vivid color overlay (boosted)
    const core = new Graphics();
    core.circle(0, 0, radius);
    core.fill({ color: 0xffffff, alpha: 0.9 });
    core.circle(0, 0, radius * 0.7);
    core.fill({ color, alpha: 0.85 });
    container.addChild(core);

    return { container, glowOuter, glowMid, corona, core };
  }

  /* ── HOME node ─────────────────────────────────────────────── */

  private buildHomeNode() {
    const sys = this.homeSystem;
    const color = hexToNum(sys.star.colorHex);
    const spectralMul = SPECTRAL_SIZE_MUL[sys.star.spectralClass] ?? 1.0;
    const baseR = starBaseRadius(sys.star.luminositySolar) * 1.4 * spectralMul;
    const phase = this.hash(sys.id);

    const { container: dot, glowOuter, glowMid, corona, core } = this.createStarGfx(color, baseR);

    // HOME label
    const hl = new Text({
      text: 'HOME',
      style: { fontSize: 11, fill: 0x44ff88, fontFamily: 'monospace', fontWeight: 'bold' },
    });
    hl.anchor.set(0.5, 0);
    hl.y = baseR + 6;
    dot.addChild(hl);

    // System name label (compact, right after HOME)
    const nl = new Text({
      text: sys.name,
      style: { fontSize: 8, fill: 0x667788, fontFamily: 'monospace' },
    });
    nl.anchor.set(0.5, 0);
    nl.y = baseR + 18;
    dot.addChild(nl);

    // Observatory marker
    const hasObs = this.researchState.slots.some(s => s.systemId === sys.id);
    if (hasObs) {
      const om = new Text({
        text: '[O]',
        style: { fontSize: 7, fill: 0x4488aa, fontFamily: 'monospace' },
      });
      om.anchor.set(0.5, 0.5);
      om.x = baseR + 10;
      om.y = -6;
      dot.addChild(om);
    }

    dot.eventMode = 'static';
    dot.cursor = 'pointer';
    dot.hitArea = { contains: (px: number, py: number) => px * px + py * py < 900 };

    let cc = 0;
    let ct: ReturnType<typeof setTimeout> | null = null;
    dot.on('pointerdown', () => {
      cc++;
      if (cc === 1) {
        ct = setTimeout(() => {
          if (cc === 1) {
            const gp = dot.getGlobalPosition();
            this.focusOnSystem(sys.id);
            this.onSelect(sys, { x: gp.x, y: gp.y });
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

    this.homeNode = {
      container: dot, system: sys, nameLabel: nl,
      progressLabel: null, progressRing: null,
      glowOuter, glowMid, corona, core,
      phaseOffset: phase, speed: 0.8 + (phase / (Math.PI * 2)) * 0.7,
      baseRadius: baseR, baseAlpha: 1,
      spectralClass: sys.star.spectralClass,
      tx: 0, ty: 0, index: 0,
    };
  }

  /* ── Direction group ───────────────────────────────────────── */

  private buildDirGroup(dir: Direction, systems: StarSystem[]) {
    if (systems.length === 0) {
      // Still create a stub group with no button
      this.groups.set(dir, {
        direction: dir, angle: DIR_ANGLES[dir], systems: [], nodes: [],
        bg: new Graphics(), arrowGfx: new Graphics(), button: new Container(),
        expanded: false, progress: 0,
      });
      return;
    }

    const angle = DIR_ANGLES[dir];
    const bx = Math.cos(angle) * BTN_DIST;
    const by = Math.sin(angle) * BTN_DIST;

    const button = new Container();
    button.x = bx;
    button.y = by;
    button.eventMode = 'static';
    button.cursor = 'pointer';

    // Background circle
    const bg = new Graphics();
    this.drawBtnBg(bg, false);
    button.addChild(bg);

    // Directional arrow (positioned near edge of button)
    const arrowGfx = new Graphics();
    this.drawArrowGfx(arrowGfx, dir, false);
    const arrowOffset = 7;
    switch (dir) {
      case 'up':    arrowGfx.y = -arrowOffset; break;
      case 'down':  arrowGfx.y = arrowOffset; break;
      case 'left':  arrowGfx.x = -arrowOffset; break;
      case 'right': arrowGfx.x = arrowOffset; break;
    }
    button.addChild(arrowGfx);

    // Count (larger, brighter, positioned opposite to arrow — near center)
    const cl = new Text({
      text: `${systems.length}`,
      style: { fontSize: 12, fill: 0x99aabb, fontFamily: 'monospace', fontWeight: 'bold' },
    });
    cl.anchor.set(0.5, 0.5);
    switch (dir) {
      case 'up':    cl.y = 7; break;
      case 'down':  cl.y = -7; break;
      case 'left':  cl.x = 7; break;
      case 'right': cl.x = -7; break;
    }
    button.addChild(cl);

    button.hitArea = { contains: (px: number, py: number) => px * px + py * py < 500 };
    button.on('pointerdown', () => this.toggleDir(dir));
    button.on('pointerover', () => this.drawBtnBg(bg, true));
    button.on('pointerout', () => {
      const grp = this.groups.get(dir);
      this.drawBtnBg(bg, grp?.expanded ?? false);
    });

    this.nodesLayer.addChild(button);

    // System nodes
    const nodes: SystemNode[] = [];
    const perp = angle + Math.PI / 2;

    for (let i = 0; i < systems.length; i++) {
      const dist = SYS_START + i * SYS_GAP;
      const zig = systems.length > 1 ? (i % 2 === 0 ? 1 : -1) * ZIGZAG : 0;
      const tx = Math.cos(angle) * dist + Math.cos(perp) * zig;
      const ty = Math.sin(angle) * dist + Math.sin(perp) * zig;

      const node = this.buildSysNode(systems[i], tx, ty, i);
      nodes.push(node);
      this.systemNodes.set(systems[i].id, node);
    }

    this.groups.set(dir, {
      direction: dir, angle, systems, nodes,
      bg, arrowGfx, button, expanded: false, progress: 0,
    });
  }

  private drawBtnBg(g: Graphics, active: boolean) {
    g.clear();
    g.circle(0, 0, 20);
    g.fill({ color: active ? 0x162840 : 0x0a1428, alpha: 0.92 });
    g.circle(0, 0, 20);
    g.stroke({ width: 1, color: active ? 0x446688 : 0x2a3a50, alpha: active ? 0.8 : 0.5 });
  }

  /** Draw arrow chevron — flipped inverts direction (for collapse indicator) */
  private drawArrowGfx(g: Graphics, dir: Direction, flipped: boolean) {
    g.clear();
    const s = 6;
    const d = flipped ? OPPOSITE[dir] : dir;
    switch (d) {
      case 'up':    g.moveTo(-s, 3); g.lineTo(0, -s); g.lineTo(s, 3); break;
      case 'down':  g.moveTo(-s, -3); g.lineTo(0, s); g.lineTo(s, -3); break;
      case 'left':  g.moveTo(3, -s); g.lineTo(-s, 0); g.lineTo(3, s); break;
      case 'right': g.moveTo(-3, -s); g.lineTo(s, 0); g.lineTo(-3, s); break;
    }
    g.stroke({ width: 2, color: 0xaabbcc, alpha: 0.9 });
  }

  /* ── System node ───────────────────────────────────────────── */

  private buildSysNode(sys: StarSystem, tx: number, ty: number, index: number): SystemNode {
    const state = this.getState(sys);
    const progress = getResearchProgress(this.researchState, sys.id);
    const phase = this.hash(sys.id);
    const color = hexToNum(sys.star.colorHex);
    const baseR = starBaseRadius(sys.star.luminositySolar);
    const spectralMul = SPECTRAL_SIZE_MUL[sys.star.spectralClass] ?? 1.0;

    // State-dependent size multiplier + spectral class multiplier
    const radiusMul = state === 'researched' ? 1.2 : state === 'researching' ? 0.9 : 0.7;
    const effectiveR = baseR * radiusMul * spectralMul;

    const { container: dot, glowOuter, glowMid, corona, core } = this.createStarGfx(color, effectiveR);
    dot.x = 0;
    dot.y = 0;
    dot.alpha = 0;
    dot.visible = false;

    let nameLabel: Text;
    let progressLabel: Text | null = null;
    let progressRing: Graphics | null = null;

    // Label position: below core area
    const labelY = effectiveR + 6;

    switch (state) {
      case 'researched': {
        nameLabel = new Text({
          text: sys.name,
          style: { fontSize: 9, fill: 0x8899aa, fontFamily: 'monospace' },
        });
        nameLabel.anchor.set(0.5, 0);
        nameLabel.y = labelY;
        dot.addChild(nameLabel);
        break;
      }

      case 'researching': {
        progressRing = new Graphics();
        this.drawArc(progressRing, progress, effectiveR + 4);
        dot.addChild(progressRing);

        nameLabel = new Text({
          text: sys.name,
          style: { fontSize: 8, fill: 0x556677, fontFamily: 'monospace' },
        });
        nameLabel.anchor.set(0.5, 0);
        nameLabel.y = labelY + 4;
        dot.addChild(nameLabel);

        progressLabel = new Text({
          text: `${progress}%`,
          style: { fontSize: 7, fill: 0x4488aa, fontFamily: 'monospace' },
        });
        progressLabel.anchor.set(0.5, 0);
        progressLabel.y = labelY + 16;
        dot.addChild(progressLabel);
        break;
      }

      default: {
        // Unexplored — question mark
        const qm = new Text({
          text: '?',
          style: { fontSize: 10, fill: 0x445566, fontFamily: 'monospace', fontWeight: 'bold' },
        });
        qm.anchor.set(0.5, 0.5);
        qm.y = effectiveR + 8;
        dot.addChild(qm);

        nameLabel = new Text({
          text: sys.name,
          style: { fontSize: 7, fill: 0x334455, fontFamily: 'monospace' },
        });
        nameLabel.anchor.set(0.5, 0);
        nameLabel.y = effectiveR + 16;
        dot.addChild(nameLabel);
        break;
      }
    }

    // Observatory marker
    const hasObs = this.researchState.slots.some(s => s.systemId === sys.id);
    if (hasObs) {
      const om = new Text({
        text: '[O]',
        style: { fontSize: 7, fill: 0x4488aa, fontFamily: 'monospace' },
      });
      om.anchor.set(0.5, 0.5);
      om.x = effectiveR + 10;
      om.y = -6;
      dot.addChild(om);
    }

    // Interactivity
    dot.eventMode = 'static';
    dot.cursor = 'pointer';
    dot.hitArea = { contains: (px: number, py: number) => px * px + py * py < 600 };

    let cc = 0;
    let ct: ReturnType<typeof setTimeout> | null = null;
    dot.on('pointerdown', () => {
      cc++;
      if (cc === 1) {
        ct = setTimeout(() => {
          if (cc === 1) {
            const gp = dot.getGlobalPosition();
            this.selectSystem(sys.id);
            this.focusOnSystem(sys.id);
            this.onSelect(sys, { x: gp.x, y: gp.y });
          }
          cc = 0;
        }, 300);
      } else if (cc === 2) {
        if (ct) clearTimeout(ct);
        cc = 0;
        this.onDoubleClick(sys);
      }
    });

    dot.on('pointerover', () => { dot.scale.set(1.2); });
    dot.on('pointerout', () => { dot.scale.set(1.0); });

    this.nodesLayer.addChild(dot);

    const baseAlpha = state === 'researching'
      ? 0.35 + (progress / 100) * 0.55
      : state === 'unexplored' ? 0.45 : 1;

    const speed = 0.5 + (phase / (Math.PI * 2)) * 1.0;

    return {
      container: dot, system: sys, nameLabel,
      progressLabel, progressRing,
      glowOuter, glowMid, corona, core,
      phaseOffset: phase, speed, baseRadius: effectiveR,
      baseAlpha, tx, ty, index,
      spectralClass: sys.star.spectralClass,
    };
  }

  private drawArc(g: Graphics, progress: number, radius: number) {
    g.clear();
    const s = -Math.PI / 2;
    const e = s + (progress / 100) * Math.PI * 2;
    g.circle(0, 0, radius);
    g.stroke({ width: 1, color: 0x334455, alpha: 0.3 });
    if (progress > 0) {
      g.arc(0, 0, radius, s, e);
      g.stroke({ width: 1.5, color: 0x44aaff, alpha: 0.7 });
    }
  }

  /* ── Direction toggle ──────────────────────────────────────── */

  private toggleDir(dir: Direction) {
    const grp = this.groups.get(dir);
    if (!grp) return;
    grp.expanded = !grp.expanded;
    this.drawBtnBg(grp.bg, grp.expanded);
    this.drawArrowGfx(grp.arrowGfx, dir, grp.expanded);
  }

  /* ── Public API ────────────────────────────────────────────── */

  selectSystem(systemId: string | null) {
    this.selectedSystemId = systemId;
    this.beamAlpha = 0;
  }

  /**
   * Focus on a system: highlight it, dim others (keep positions & buttons intact).
   * Expand its direction group if needed.
   */
  focusOnSystem(systemId: string) {
    if (this.focusedSystemId === systemId) return;

    // If already focused on something else, unfocus first
    if (this.focusedSystemId) this.unfocusSystem();

    this.focusedSystemId = systemId;
    this.preFocusPositions.clear();
    this.preFocusExpanded.clear();

    // Save expanded state + alpha of all nodes
    for (const [d, grp] of this.groups) {
      this.preFocusExpanded.set(d, grp.expanded);
    }
    if (this.homeNode) {
      this.preFocusPositions.set(this.homeNode.system.id, {
        tx: this.homeNode.tx, ty: this.homeNode.ty, baseAlpha: this.homeNode.baseAlpha,
      });
    }
    for (const [, grp] of this.groups) {
      for (const node of grp.nodes) {
        this.preFocusPositions.set(node.system.id, {
          tx: node.tx, ty: node.ty, baseAlpha: node.baseAlpha,
        });
      }
    }

    // Make sure the focused node's group is expanded
    for (const [, grp] of this.groups) {
      for (const node of grp.nodes) {
        if (node.system.id === systemId && !grp.expanded) {
          grp.expanded = true;
          this.drawBtnBg(grp.bg, true);
          this.drawArrowGfx(grp.arrowGfx, grp.direction, true);
        }
      }
    }

    // Dim all non-focused visible stars (keep their positions)
    if (this.homeNode && this.homeNode.system.id !== systemId) {
      this.homeNode.baseAlpha = 0.15;
    }
    for (const [, grp] of this.groups) {
      for (const node of grp.nodes) {
        if (node.system.id === systemId) {
          node.baseAlpha = 1;
        } else {
          node.baseAlpha = 0.15;
        }
      }
    }
  }

  /** Unfocus: restore all alphas and expanded states */
  unfocusSystem() {
    if (!this.focusedSystemId) return;
    this.focusedSystemId = null;

    // Restore alphas
    if (this.homeNode) {
      const saved = this.preFocusPositions.get(this.homeNode.system.id);
      if (saved) {
        this.homeNode.baseAlpha = saved.baseAlpha;
      }
    }
    for (const [, grp] of this.groups) {
      for (const node of grp.nodes) {
        const saved = this.preFocusPositions.get(node.system.id);
        if (saved) {
          node.baseAlpha = saved.baseAlpha;
        }
      }
    }

    // Restore expanded state of groups
    for (const [d, grp] of this.groups) {
      const wasExpanded = this.preFocusExpanded.get(d) ?? false;
      grp.expanded = wasExpanded;
      this.drawBtnBg(grp.bg, wasExpanded);
      this.drawArrowGfx(grp.arrowGfx, d, wasExpanded);
    }

    this.preFocusPositions.clear();
    this.preFocusExpanded.clear();
    this.selectedSystemId = null;
    this.beamAlpha = 0;
  }

  /** Whether a system is currently focused */
  get isFocused(): boolean {
    return this.focusedSystemId !== null;
  }

  updateSystemVisual(systemId: string, researchState: ResearchState) {
    this.researchState = researchState;
    const node = this.systemNodes.get(systemId);
    if (!node) return;

    const state = this.getState(node.system);
    const prog = getResearchProgress(researchState, systemId);

    if (state === 'researching' && node.progressRing) {
      node.baseAlpha = 0.35 + (prog / 100) * 0.55;
      this.drawArc(node.progressRing, prog, node.baseRadius + 4);
      if (node.progressLabel) node.progressLabel.text = `${prog}%`;
    }

    if (state === 'researched') {
      node.baseAlpha = 1;
      if (node.progressRing) node.progressRing.clear();
      node.nameLabel.text = node.system.name;
      node.nameLabel.style.fill = 0x8899aa;
      if (node.progressLabel) {
        node.progressLabel.visible = false;
      }
    }
  }

  /* ── Frame update ──────────────────────────────────────────── */

  update(deltaMs: number) {
    this.time += deltaMs;
    const dt = deltaMs / 1000;
    const t = this.time;

    // Backdrop animations
    if (this.accretionDisk) this.accretionDisk.rotation += deltaMs * 0.0003;
    if (this.backdropContainer) this.backdropContainer.rotation += deltaMs * 0.000012;

    // Chaotic backdrop twinkle stars: scale pulsing + alpha breathing + color shimmer
    for (const star of this.twinkleStars) {
      const sp = star.speed;
      const ph = star.phaseOffset;
      const cp = star.colorPhase;

      // Scale pulsing (slow, chaotic)
      const s1 = Math.sin(t * sp * 0.0008 + ph) * 0.35;
      const s2 = Math.sin(t * sp * 0.0013 + ph * 2.1) * 0.15;
      const scale = star.baseScale + s1 + s2;
      star.gfx.scale.set(scale, scale);

      // Alpha breathing (different frequency for chaos)
      const a1 = Math.sin(t * sp * 0.0006 + ph * 1.4) * 0.15;
      const a2 = Math.sin(t * sp * 0.0019 + ph * 0.7) * 0.08;
      star.gfx.alpha = Math.max(0.02, star.baseAlpha + a1 + a2);

      // Color shimmer — slowly cycle hue
      const hue = (Math.sin(t * sp * 0.00025 + cp) * 0.5 + 0.5);
      star.gfx.tint = hslToRgb(hue, 0.35, 0.82);
    }

    // Animate HOME star: alpha easing + burning
    if (this.homeNode) {
      const hn = this.homeNode;
      // Smooth alpha easing (for focus/unfocus dimming)
      hn.container.alpha += (hn.baseAlpha - hn.container.alpha) * Math.min(1, ANIM_SPEED * dt);
      this.animateStarBurn(hn, t);
    }

    // Expand / collapse animation + animate system star nodes
    for (const [, grp] of this.groups) {
      const target = grp.expanded ? 1 : 0;
      grp.progress += (target - grp.progress) * Math.min(1, ANIM_SPEED * dt);
      if (Math.abs(grp.progress - target) < 0.002) grp.progress = target;

      for (const node of grp.nodes) {
        // Cascade: each node has a slight delay based on its index
        const delay = node.index * 0.12;
        const raw = grp.expanded
          ? Math.max(0, (grp.progress - delay) / Math.max(0.01, 1 - delay))
          : grp.progress;
        const p = Math.max(0, Math.min(1, raw));
        // Ease-out quad
        const ease = 1 - (1 - p) * (1 - p);

        node.container.visible = grp.progress > 0.01;
        node.container.x = node.tx * ease;
        node.container.y = node.ty * ease;

        if (node.container.visible) {
          node.container.alpha = ease * node.baseAlpha;
          // Animate star burning
          this.animateStarBurn(node, t);
        } else {
          node.container.alpha = 0;
        }
      }
    }

    // Arm lines from HOME to expanded systems
    this.armLines.clear();
    for (const [, grp] of this.groups) {
      if (grp.progress < 0.05) continue;
      for (const node of grp.nodes) {
        if (!node.container.visible) continue;
        this.armLines.moveTo(0, 0);
        this.armLines.lineTo(node.container.x, node.container.y);
        this.armLines.stroke({ width: 0.6, color: 0x2a3a4a, alpha: grp.progress * 0.25 });
      }
    }

    // Beam to selected system
    this.beamGfx.clear();
    if (this.selectedSystemId) {
      const node = this.systemNodes.get(this.selectedSystemId);
      if (node && node.container.visible && node.container.alpha > 0.1) {
        this.beamAlpha = Math.min(0.6, this.beamAlpha + deltaMs * 0.002);
        this.beamGfx.moveTo(0, 0);
        this.beamGfx.lineTo(node.container.x, node.container.y);
        this.beamGfx.stroke({ width: 1.5, color: 0x4488aa, alpha: this.beamAlpha });
        this.beamGfx.moveTo(0, 0);
        this.beamGfx.lineTo(node.container.x, node.container.y);
        this.beamGfx.stroke({ width: 4, color: 0x4488aa, alpha: this.beamAlpha * 0.15 });
      }
    }
  }

  /** Animate individual star glow layers for chaotic burning effect */
  private animateStarBurn(node: SystemNode, t: number) {
    const sp = node.speed;
    const ph = node.phaseOffset;
    // Hot stars (O/B/A) burn more intensely
    const amp = HOT_STARS.has(node.spectralClass) ? 1.5 : 1.0;

    // Outer glow: slow chaotic breathing
    const s1 = (Math.sin(t * sp * 0.0009 + ph) * 0.4
             + Math.sin(t * sp * 0.0017 + ph * 2.3) * 0.2) * amp;
    node.glowOuter.alpha = 0.12 + s1 * 0.05;
    node.glowOuter.scale.set(1.0 + s1 * 0.25, 1.0 + s1 * 0.25);

    // Mid glow: medium frequency, independent phase
    const s2 = (Math.sin(t * sp * 0.0014 + ph * 1.7) * 0.3
             + Math.sin(t * sp * 0.0023 + ph * 0.9) * 0.15) * amp;
    node.glowMid.alpha = 0.30 + s2 * 0.12;
    node.glowMid.scale.set(1.0 + s2 * 0.15, 1.0 + s2 * 0.15);

    // Corona: key visibility pulsing
    const s4 = (Math.sin(t * sp * 0.0011 + ph * 1.3) * 0.25
             + Math.sin(t * sp * 0.0020 + ph * 2.7) * 0.12) * amp;
    node.corona.alpha = 0.40 + s4 * 0.15;
    node.corona.scale.set(1.0 + s4 * 0.12, 1.0 + s4 * 0.12);

    // Core: fast subtle flicker
    const s3 = (Math.sin(t * sp * 0.003 + ph * 2.1) * 0.1
             + Math.sin(t * sp * 0.005 + ph * 3.7) * 0.05) * amp;
    node.core.alpha = 0.85 + s3;
  }

  /* ── Cleanup ───────────────────────────────────────────────── */

  destroy() {
    this.container.destroy({ children: true });
    this.systemNodes.clear();
    this.groups.clear();
  }
}
