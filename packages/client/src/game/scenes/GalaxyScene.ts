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

/** Compute star display radius from luminosity (log-scale, clamped 3-12px) */
function starBaseRadius(luminositySolar: number): number {
  return Math.max(3, Math.min(12, Math.log2(1 + luminositySolar) * 4));
}

/** Size multiplier per spectral class */
const SPECTRAL_SIZE_MUL: Record<SpectralClass, number> = {
  O: 1.8, B: 1.5, A: 1.2, F: 1.1, G: 1.0, K: 0.95, M: 0.85,
};

/** Hot stars (O/B/A) get stronger burn animation */
const HOT_STARS: Set<SpectralClass> = new Set(['O', 'B', 'A']);

/* ── Layout constants ──────────────────────────────────────────── */

/** Pixels per light-year for hex->screen conversion */
const PX_PER_LY = 18;

/** Easing speed for alpha transitions */
const ANIM_SPEED = 5;

/* ── Interfaces ────────────────────────────────────────────────── */

interface SystemNode {
  container: Container;
  system: StarSystem;
  nameLabel: Text;
  progressLabel: Text | null;
  progressRing: Graphics | null;
  glowOuter: Graphics;
  glowMid: Graphics;
  corona: Graphics;
  core: Graphics;
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

  private selectedSystemId: string | null = null;
  private beamAlpha = 0;

  /** Individually animated backdrop twinkle stars */
  private twinkleStars: TwinkleStarData[] = [];

  /** Focus state */
  private focusedSystemId: string | null = null;
  private preFocusAlphas = new Map<string, number>();

  constructor(
    rings: GalaxyRing[],
    galaxySeed: number,
    playerCenterX: number,
    playerCenterY: number,
    researchState: ResearchState,
    private onSelect: (system: StarSystem, screenPos?: { x: number; y: number }) => void,
    private onDoubleClick: (system: StarSystem) => void,
    private onTelescopeClick?: (system: StarSystem) => void,
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
      // Screen position relative to home
      const tx = (system.position.x - homeX) * PX_PER_LY;
      const ty = (system.position.y - homeY) * PX_PER_LY;

      if (system.ownerPlayerId !== null) {
        this.buildHomeNode(system);
      } else {
        const node = this.buildSysNode(system, tx, ty, ringIndex);
        this.systemNodes.set(system.id, node);
      }
    }
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
   * Create 4 animatable glow layers for a star.
   */
  private createStarGfx(color: number, radius: number): {
    container: Container; glowOuter: Graphics; glowMid: Graphics; corona: Graphics; core: Graphics;
  } {
    const container = new Container();
    const saturated = saturateColor(color, 0.4);

    const glowOuter = new Graphics();
    glowOuter.circle(0, 0, radius * 3.0);
    glowOuter.fill({ color, alpha: 0.12 });
    container.addChild(glowOuter);

    const glowMid = new Graphics();
    glowMid.circle(0, 0, radius * 1.8);
    glowMid.fill({ color: saturated, alpha: 0.30 });
    container.addChild(glowMid);

    const corona = new Graphics();
    corona.circle(0, 0, radius * 1.2);
    corona.fill({ color: saturated, alpha: 0.40 });
    container.addChild(corona);

    const core = new Graphics();
    core.circle(0, 0, radius);
    core.fill({ color: 0xffffff, alpha: 0.9 });
    core.circle(0, 0, radius * 0.7);
    core.fill({ color, alpha: 0.85 });
    container.addChild(core);

    return { container, glowOuter, glowMid, corona, core };
  }

  /* ── HOME node ─────────────────────────────────────────────── */

  private buildHomeNode(sys: StarSystem) {
    const color = hexToNum(sys.star.colorHex);
    const spectralMul = SPECTRAL_SIZE_MUL[sys.star.spectralClass] ?? 1.0;
    const baseR = starBaseRadius(sys.star.luminositySolar) * 1.4 * spectralMul;
    const phase = this.hash(sys.id);

    const { container: dot, glowOuter, glowMid, corona, core } = this.createStarGfx(color, baseR);

    // HOME label
    const hlBg = new Graphics();
    hlBg.circle(0, 0, 12);
    hlBg.fill({ color: 0x020510, alpha: 0.45 });
    dot.addChild(hlBg);

    const hl = new Text({
      text: 'HOME',
      style: { fontSize: 8, fill: 0x44ff88, fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: 1 },
    });
    hl.anchor.set(0.5, 0.5);
    hl.y = 0;
    dot.addChild(hl);

    // System name label
    const nl = new Text({
      text: sys.name,
      style: { fontSize: 8, fill: 0x667788, fontFamily: 'monospace' },
    });
    nl.anchor.set(0.5, 0);
    nl.y = baseR + 6;
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
      tx: 0, ty: 0, ringIndex: 0,
    };
  }

  /* ── System node ───────────────────────────────────────────── */

  private buildSysNode(sys: StarSystem, tx: number, ty: number, ringIndex: number): SystemNode {
    const state = this.getState(sys);
    const progress = getResearchProgress(this.researchState, sys.id);
    const phase = this.hash(sys.id);
    const color = hexToNum(sys.star.colorHex);
    const baseR = starBaseRadius(sys.star.luminositySolar);
    const spectralMul = SPECTRAL_SIZE_MUL[sys.star.spectralClass] ?? 1.0;

    // State-dependent size multiplier
    const radiusMul = state === 'researched' ? 1.2 : state === 'researching' ? 0.9 : 0.5;
    const effectiveR = baseR * radiusMul * spectralMul;

    // Unexplored: use dim gray color, not star's actual color
    const displayColor = state === 'unexplored' ? 0x445566 : color;
    const { container: dot, glowOuter, glowMid, corona, core } = this.createStarGfx(displayColor, effectiveR);

    dot.x = tx;
    dot.y = ty;

    let nameLabel: Text;
    let progressLabel: Text | null = null;
    let progressRing: Graphics | null = null;

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
        // Unexplored - question mark, no name
        const qm = new Text({
          text: '?',
          style: { fontSize: 10, fill: 0x445566, fontFamily: 'monospace', fontWeight: 'bold' },
        });
        qm.anchor.set(0.5, 0.5);
        qm.y = effectiveR + 8;
        dot.addChild(qm);

        // Hidden name label (for state tracking)
        nameLabel = new Text({
          text: '',
          style: { fontSize: 7, fill: 0x334455, fontFamily: 'monospace' },
        });
        nameLabel.anchor.set(0.5, 0);
        nameLabel.y = effectiveR + 16;
        nameLabel.visible = false;
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

    // Alpha by state and ring distance
    let baseAlpha: number;
    if (state === 'researched') {
      baseAlpha = 1;
    } else if (state === 'researching') {
      baseAlpha = 0.35 + (progress / 100) * 0.55;
    } else {
      // Unexplored: dimmer for further rings
      baseAlpha = ringIndex === 1 ? 0.35 : 0.2;
    }

    dot.alpha = baseAlpha;

    const speed = 0.5 + (phase / (Math.PI * 2)) * 1.0;

    return {
      container: dot, system: sys, nameLabel,
      progressLabel, progressRing,
      glowOuter, glowMid, corona, core,
      phaseOffset: phase, speed, baseRadius: effectiveR,
      baseAlpha, tx, ty, ringIndex,
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

  /* ── Public API ────────────────────────────────────────────── */

  selectSystem(systemId: string | null) {
    this.selectedSystemId = systemId;
    this.beamAlpha = 0;
  }

  /**
   * Focus on a system: highlight it, dim others.
   */
  focusOnSystem(systemId: string) {
    if (this.focusedSystemId === systemId) return;
    if (this.focusedSystemId) this.unfocusSystem();

    this.focusedSystemId = systemId;
    this.preFocusAlphas.clear();

    // Save alphas
    if (this.homeNode) {
      this.preFocusAlphas.set(this.homeNode.system.id, this.homeNode.baseAlpha);
    }
    for (const [id, node] of this.systemNodes) {
      this.preFocusAlphas.set(id, node.baseAlpha);
    }

    // Dim all except focused
    if (this.homeNode && this.homeNode.system.id !== systemId) {
      this.homeNode.baseAlpha = 0.15;
    }
    for (const [id, node] of this.systemNodes) {
      node.baseAlpha = id === systemId ? 1 : 0.15;
    }
  }

  /** Unfocus: restore all alphas */
  unfocusSystem() {
    if (!this.focusedSystemId) return;
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
      node.nameLabel.visible = true;
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

    // Chaotic backdrop twinkle stars
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

    // Animate HOME star
    if (this.homeNode) {
      const hn = this.homeNode;
      hn.container.alpha += (hn.baseAlpha - hn.container.alpha) * Math.min(1, ANIM_SPEED * dt);
      this.animateStarBurn(hn, t);
    }

    // Animate all system nodes
    for (const [, node] of this.systemNodes) {
      // Smooth alpha transition
      node.container.alpha += (node.baseAlpha - node.container.alpha) * Math.min(1, ANIM_SPEED * dt);
      this.animateStarBurn(node, t);
    }

    // Connection lines: HOME -> Ring 1 -> Ring 2
    this.connectionLines.clear();
    for (const [, node] of this.systemNodes) {
      if (node.ringIndex === 1) {
        // Line from HOME to Ring 1
        this.connectionLines.moveTo(0, 0);
        this.connectionLines.lineTo(node.tx, node.ty);
        this.connectionLines.stroke({ width: 0.8, color: 0x2a3a4a, alpha: 0.3 });
      } else if (node.ringIndex === 2) {
        // Line from nearest Ring 1 to this Ring 2 node
        // Find closest Ring 1 node
        let closest: SystemNode | null = null;
        let minDist = Infinity;
        for (const [, r1] of this.systemNodes) {
          if (r1.ringIndex !== 1) continue;
          const dx = r1.tx - node.tx;
          const dy = r1.ty - node.ty;
          const d = dx * dx + dy * dy;
          if (d < minDist) { minDist = d; closest = r1; }
        }
        if (closest) {
          this.connectionLines.moveTo(closest.tx, closest.ty);
          this.connectionLines.lineTo(node.tx, node.ty);
          this.connectionLines.stroke({ width: 0.5, color: 0x1a2a3a, alpha: 0.15 });
        }
      }
    }

    // Beam to selected system
    this.beamGfx.clear();
    if (this.selectedSystemId) {
      const node = this.systemNodes.get(this.selectedSystemId);
      if (node && node.container.alpha > 0.1) {
        this.beamAlpha = Math.min(0.6, this.beamAlpha + deltaMs * 0.002);
        this.beamGfx.moveTo(0, 0);
        this.beamGfx.lineTo(node.tx, node.ty);
        this.beamGfx.stroke({ width: 1.5, color: 0x4488aa, alpha: this.beamAlpha });
        this.beamGfx.moveTo(0, 0);
        this.beamGfx.lineTo(node.tx, node.ty);
        this.beamGfx.stroke({ width: 4, color: 0x4488aa, alpha: this.beamAlpha * 0.15 });
      }
    }
  }

  /** Animate individual star glow layers for chaotic burning effect */
  private animateStarBurn(node: SystemNode, t: number) {
    const sp = node.speed;
    const ph = node.phaseOffset;
    const amp = HOT_STARS.has(node.spectralClass) ? 1.5 : 1.0;

    const s1 = (Math.sin(t * sp * 0.0009 + ph) * 0.4
             + Math.sin(t * sp * 0.0017 + ph * 2.3) * 0.2) * amp;
    node.glowOuter.alpha = 0.12 + s1 * 0.05;
    node.glowOuter.scale.set(1.0 + s1 * 0.25, 1.0 + s1 * 0.25);

    const s2 = (Math.sin(t * sp * 0.0014 + ph * 1.7) * 0.3
             + Math.sin(t * sp * 0.0023 + ph * 0.9) * 0.15) * amp;
    node.glowMid.alpha = 0.30 + s2 * 0.12;
    node.glowMid.scale.set(1.0 + s2 * 0.15, 1.0 + s2 * 0.15);

    const s4 = (Math.sin(t * sp * 0.0011 + ph * 1.3) * 0.25
             + Math.sin(t * sp * 0.0020 + ph * 2.7) * 0.12) * amp;
    node.corona.alpha = 0.40 + s4 * 0.15;
    node.corona.scale.set(1.0 + s4 * 0.12, 1.0 + s4 * 0.12);

    const s3 = (Math.sin(t * sp * 0.003 + ph * 2.1) * 0.1
             + Math.sin(t * sp * 0.005 + ph * 3.7) * 0.05) * amp;
    node.core.alpha = 0.85 + s3;
  }

  /* ── Cleanup ───────────────────────────────────────────────── */

  destroy() {
    this.container.destroy({ children: true });
    this.systemNodes.clear();
  }
}
