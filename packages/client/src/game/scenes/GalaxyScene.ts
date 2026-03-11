import { Container, Graphics, Text } from 'pixi.js';
import type { GalaxyRing, StarSystem, ResearchState } from '@nebulife/core';
import { getResearchProgress, isSystemFullyResearched } from '@nebulife/core';
import { renderStarDot } from '../rendering/StarRenderer.js';
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

/* ── Layout constants ──────────────────────────────────────────── */

type Direction = 'up' | 'right' | 'down' | 'left';

const DIR_ANGLES: Record<Direction, number> = {
  up: -Math.PI / 2,
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
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
  planetLabel: Text | null;
  progressRing: Graphics | null;
  baseAlpha: number;
  phaseOffset: number;
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

  constructor(
    rings: GalaxyRing[],
    galaxySeed: number,
    playerCenterX: number,
    playerCenterY: number,
    researchState: ResearchState,
    private onSelect: (system: StarSystem) => void,
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

  private planetDots(parent: Container, planets: Array<{ isHomePlanet: boolean; isColonizable: boolean; habitability?: { overall: number } }>) {
    if (!planets.length) return;
    const g = new Graphics();
    const r = 18;
    for (let i = 0; i < planets.length; i++) {
      const a = (i / planets.length) * Math.PI * 2 - Math.PI / 2;
      const p = planets[i];
      const col = p.isHomePlanet ? 0x44ff88
        : (p.isColonizable && (p.habitability?.overall ?? 0) > 0.5) ? 0xddaa44
        : 0x556677;
      g.circle(Math.cos(a) * r, Math.sin(a) * r, 2);
      g.fill({ color: col, alpha: col === 0x556677 ? 0.3 : 0.7 });
    }
    parent.addChild(g);
  }

  /* ── HOME node ─────────────────────────────────────────────── */

  private buildHomeNode() {
    const sys = this.homeSystem;
    const dot = renderStarDot(sys.star, 14, false);

    // Rings
    const r1 = new Graphics();
    r1.circle(0, 0, 22);
    r1.stroke({ width: 2.5, color: 0x44ff88, alpha: 0.6 });
    dot.addChild(r1);

    const r2 = new Graphics();
    r2.circle(0, 0, 32);
    r2.stroke({ width: 1, color: 0x44ff88, alpha: 0.15 });
    dot.addChild(r2);

    this.planetDots(dot, sys.planets);

    const hl = new Text({
      text: 'HOME',
      style: { fontSize: 11, fill: 0x44ff88, fontFamily: 'monospace', fontWeight: 'bold' },
    });
    hl.anchor.set(0.5, 0);
    hl.y = 28;
    dot.addChild(hl);

    const nl = new Text({
      text: sys.name,
      style: { fontSize: 9, fill: 0x8899aa, fontFamily: 'monospace' },
    });
    nl.anchor.set(0.5, 0);
    nl.y = 42;
    dot.addChild(nl);

    dot.eventMode = 'static';
    dot.cursor = 'pointer';
    dot.hitArea = { contains: (px: number, py: number) => px * px + py * py < 900 };

    let cc = 0;
    let ct: ReturnType<typeof setTimeout> | null = null;
    dot.on('pointerdown', () => {
      cc++;
      if (cc === 1) {
        ct = setTimeout(() => { if (cc === 1) this.onSelect(sys); cc = 0; }, 300);
      } else if (cc === 2) {
        if (ct) clearTimeout(ct);
        cc = 0;
        this.onDoubleClick(sys);
      }
    });

    this.nodesLayer.addChild(dot);
  }

  /* ── Direction group ───────────────────────────────────────── */

  private buildDirGroup(dir: Direction, systems: StarSystem[]) {
    if (systems.length === 0) {
      // Still create a stub group with no button
      this.groups.set(dir, {
        direction: dir, angle: DIR_ANGLES[dir], systems: [], nodes: [],
        bg: new Graphics(), button: new Container(), expanded: false, progress: 0,
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

    // Directional arrow
    this.drawArrow(button, dir, false);

    // Count
    const cl = new Text({
      text: `${systems.length}`,
      style: { fontSize: 9, fill: 0x667788, fontFamily: 'monospace' },
    });
    cl.anchor.set(0.5, 0.5);
    // Offset count from arrow
    const cOff = 10;
    if (dir === 'up') { cl.x = 0; cl.y = 6; }
    else if (dir === 'down') { cl.x = 0; cl.y = -6; }
    else if (dir === 'right') { cl.x = -4; cl.y = 0; }
    else { cl.x = 4; cl.y = 0; }
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
      bg, button, expanded: false, progress: 0,
    });
  }

  private drawBtnBg(g: Graphics, active: boolean) {
    g.clear();
    g.circle(0, 0, 20);
    g.fill({ color: active ? 0x162840 : 0x0a1428, alpha: 0.92 });
    g.circle(0, 0, 20);
    g.stroke({ width: 1, color: active ? 0x446688 : 0x2a3a50, alpha: active ? 0.8 : 0.5 });
  }

  private drawArrow(parent: Container, dir: Direction, _active: boolean) {
    const g = new Graphics();
    const s = 5;
    switch (dir) {
      case 'up':    g.moveTo(-s, 3); g.lineTo(0, -s); g.lineTo(s, 3); break;
      case 'down':  g.moveTo(-s, -3); g.lineTo(0, s); g.lineTo(s, -3); break;
      case 'left':  g.moveTo(3, -s); g.lineTo(-s, 0); g.lineTo(3, s); break;
      case 'right': g.moveTo(-3, -s); g.lineTo(s, 0); g.lineTo(-3, s); break;
    }
    g.stroke({ width: 2, color: 0x8899aa, alpha: 0.8 });
    parent.addChild(g);
  }

  /* ── System node ───────────────────────────────────────────── */

  private buildSysNode(sys: StarSystem, tx: number, ty: number, index: number): SystemNode {
    const state = this.getState(sys);
    const progress = getResearchProgress(this.researchState, sys.id);
    const phase = this.hash(sys.id);

    const dotR = state === 'researched' ? 7 : state === 'researching' ? 5 : 4;
    const dot = renderStarDot(sys.star, dotR, false);
    dot.x = 0;
    dot.y = 0;
    dot.alpha = 0;
    dot.visible = false;

    let nameLabel: Text;
    let planetLabel: Text | null = null;
    let progressRing: Graphics | null = null;

    switch (state) {
      case 'researched': {
        const ring = new Graphics();
        ring.circle(0, 0, 14);
        ring.stroke({ width: 1, color: 0x44ff88, alpha: 0.35 });
        dot.addChild(ring);

        this.planetDots(dot, sys.planets);

        nameLabel = new Text({
          text: sys.name,
          style: { fontSize: 9, fill: 0x8899aa, fontFamily: 'monospace' },
        });
        nameLabel.anchor.set(0.5, 0);
        nameLabel.y = 20;
        dot.addChild(nameLabel);

        planetLabel = new Text({
          text: `${sys.planets.length}p`,
          style: { fontSize: 7, fill: 0x667788, fontFamily: 'monospace' },
        });
        planetLabel.anchor.set(0.5, 0);
        planetLabel.y = 31;
        dot.addChild(planetLabel);
        break;
      }

      case 'researching': {
        progressRing = new Graphics();
        this.drawArc(progressRing, progress, 10);
        dot.addChild(progressRing);

        nameLabel = new Text({
          text: sys.name,
          style: { fontSize: 8, fill: 0x556677, fontFamily: 'monospace' },
        });
        nameLabel.anchor.set(0.5, 0);
        nameLabel.y = 14;
        dot.addChild(nameLabel);

        planetLabel = new Text({
          text: `${progress}%`,
          style: { fontSize: 7, fill: 0x4488aa, fontFamily: 'monospace' },
        });
        planetLabel.anchor.set(0.5, 0);
        planetLabel.y = 24;
        dot.addChild(planetLabel);
        break;
      }

      default: {
        // Unexplored — question mark
        const qm = new Text({
          text: '?',
          style: { fontSize: 10, fill: 0x445566, fontFamily: 'monospace', fontWeight: 'bold' },
        });
        qm.anchor.set(0.5, 0);
        qm.y = 8;
        dot.addChild(qm);

        nameLabel = new Text({
          text: sys.name,
          style: { fontSize: 7, fill: 0x334455, fontFamily: 'monospace' },
        });
        nameLabel.anchor.set(0.5, 0);
        nameLabel.y = 20;
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
      om.x = dotR + 10;
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
          if (cc === 1) { this.selectSystem(sys.id); this.onSelect(sys); }
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

    return { container: dot, system: sys, nameLabel, planetLabel, progressRing, baseAlpha, phaseOffset: phase, tx, ty, index };
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
    for (const [d, grp] of this.groups) {
      if (d === dir) {
        grp.expanded = !grp.expanded;
      } else {
        grp.expanded = false;
      }
      this.drawBtnBg(grp.bg, grp.expanded);
    }
  }

  /* ── Public API ────────────────────────────────────────────── */

  selectSystem(systemId: string | null) {
    this.selectedSystemId = systemId;
    this.beamAlpha = 0;
  }

  updateSystemVisual(systemId: string, researchState: ResearchState) {
    this.researchState = researchState;
    const node = this.systemNodes.get(systemId);
    if (!node) return;

    const state = this.getState(node.system);
    const prog = getResearchProgress(researchState, systemId);

    if (state === 'researching' && node.progressRing) {
      node.baseAlpha = 0.35 + (prog / 100) * 0.55;
      this.drawArc(node.progressRing, prog, 10);
      if (node.planetLabel) node.planetLabel.text = `${prog}%`;
    }

    if (state === 'researched') {
      node.baseAlpha = 1;
      if (node.progressRing) node.progressRing.clear();
      node.nameLabel.text = node.system.name;
      node.nameLabel.style.fill = 0x8899aa;
      if (node.planetLabel) {
        node.planetLabel.text = `${node.system.planets.length}p`;
        node.planetLabel.style.fill = 0x667788;
      }
    }
  }

  /* ── Frame update ──────────────────────────────────────────── */

  update(deltaMs: number) {
    this.time += deltaMs;
    const dt = deltaMs / 1000;

    // Backdrop animations
    if (this.accretionDisk) this.accretionDisk.rotation += deltaMs * 0.0003;
    if (this.backdropContainer) this.backdropContainer.rotation += deltaMs * 0.000012;

    // Chaotic star twinkle: scale pulsing + alpha breathing + color shimmer
    const t = this.time;
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

    // Expand / collapse animation
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
          const twinkle = Math.sin(this.time * 0.0015 + node.phaseOffset) * 0.06;
          node.container.alpha = ease * (node.baseAlpha + twinkle);
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

  /* ── Cleanup ───────────────────────────────────────────────── */

  destroy() {
    this.container.destroy({ children: true });
    this.systemNodes.clear();
    this.groups.clear();
  }
}
