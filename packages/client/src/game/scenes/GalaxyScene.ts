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

/** Size multiplier per spectral class */
const SPECTRAL_SIZE_MUL: Record<SpectralClass, number> = {
  O: 1.8, B: 1.5, A: 1.2, F: 1.1, G: 1.0, K: 0.95, M: 0.85,
};

/** Hot stars (O/B/A) get stronger burn animation */
const HOT_STARS: Set<SpectralClass> = new Set(['O', 'B', 'A']);

/* ── Layout constants ──────────────────────────────────────────── */

/** Pixels per light-year for hex->screen conversion (halved for tighter layout) */
const PX_PER_LY = 9;

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

    /* Galaxy backdrop (visual only) — centered on HOME (0,0) so black hole is behind HOME star */
    const bd = createGalaxyBackdrop({ seed: galaxySeed, centerX: 0, centerY: 0 });
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

    // glowOuter kept as empty Graphics for animation compatibility
    const glowOuter = new Graphics();
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
    const baseR = starBaseRadius(sys.star.luminositySolar) * 1.6 * spectralMul;
    const phase = this.hash(sys.id);

    const { container: dot, glowOuter, glowMid, corona, core } = this.createStarGfx(color, baseR);

    // HOME badge — centered inside the star
    const hl = new Text({
      text: 'HOME',
      style: {
        fontSize: 6, fill: 0x1a5c3a, fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: 1,
        dropShadow: { alpha: 0.6, blur: 4, color: 0x44ff88, distance: 0 },
      },
      resolution: 3,
    });
    hl.anchor.set(0.5, 0.5);
    hl.y = 0;
    dot.addChild(hl);

    // Name label — hidden by default, shown on hover
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

    // Show/hide name on hover
    dot.on('pointerover', () => { nl.visible = true; dot.scale.set(1.15); });
    dot.on('pointerout', () => { nl.visible = false; dot.scale.set(1.0); });

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
    const radiusMul = state === 'researched' ? 1.3 : state === 'researching' ? 1.0 : 0.65;
    const effectiveR = baseR * radiusMul * spectralMul;

    // Unexplored: use dim gray color, not star's actual color
    const displayColor = state === 'unexplored' ? 0x445566 : color;
    const { container: dot, glowOuter, glowMid, corona, core } = this.createStarGfx(displayColor, effectiveR);

    dot.x = tx;
    dot.y = ty;

    // Progress % inside star (only for 1-99%)
    let progressLabel: Text | null = null;
    if (state === 'researching' && progress > 0 && progress < 100) {
      progressLabel = new Text({
        text: `${progress}%`,
        style: { fontSize: Math.max(6, effectiveR * 0.5), fill: 0xddeeff, fontFamily: 'monospace' },
        resolution: 3,
      });
      progressLabel.anchor.set(0.5, 0.5);
      progressLabel.y = 0;
      dot.addChild(progressLabel);
    }

    // Name label — hidden by default, shown on hover/tap
    const nameLabel = new Text({
      text: state === 'unexplored' ? '' : sys.name,
      style: {
        fontSize: state === 'researched' ? 9 : 8,
        fill: state === 'researched' ? 0x8899aa : 0x556677,
        fontFamily: 'monospace',
      },
      resolution: 3,
    });
    nameLabel.anchor.set(0.5, 0);
    nameLabel.y = effectiveR + 8;
    nameLabel.visible = false;
    dot.addChild(nameLabel);

    // Interactivity
    dot.eventMode = 'static';
    dot.cursor = 'pointer';
    const hitR = effectiveR + 8;
    dot.hitArea = { contains: (px: number, py: number) => px * px + py * py < hitR * hitR };

    // Show/hide name on hover
    dot.on('pointerover', () => { nameLabel.visible = true; dot.scale.set(1.15); });
    dot.on('pointerout', () => { nameLabel.visible = false; dot.scale.set(1.0); });

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
      progressLabel, progressRing: null,
      glowOuter, glowMid, corona, core,
      phaseOffset: phase, speed, baseRadius: effectiveR,
      baseAlpha, tx, ty, ringIndex,
      spectralClass: sys.star.spectralClass,
    };
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

  get isTransitioning(): boolean {
    return this.transitionActive;
  }

  /**
   * Start the star-fold transition: all stars converge into the target,
   * galaxy backdrop spins up, twinkle stars scatter outward.
   * Duration: 2 seconds. Calls onComplete when done.
   */
  startTransition(targetSystemId: string, onComplete: () => void) {
    if (this.transitionActive) return;

    // Find target position
    const targetNode = this.systemNodes.get(targetSystemId);
    const isHome = this.homeNode?.system.id === targetSystemId;
    if (!targetNode && !isHome) return;

    this.transitionActive = true;
    this.transitionProgress = 0;
    this.transitionTargetId = targetSystemId;
    this.transitionTargetX = isHome ? 0 : targetNode!.tx;
    this.transitionTargetY = isHome ? 0 : targetNode!.ty;
    this.transitionOnComplete = onComplete;

    // Disable interactivity during transition
    if (this.homeNode) this.homeNode.container.eventMode = 'none';
    for (const [, n] of this.systemNodes) n.container.eventMode = 'none';

    // Hide UI elements
    this.connectionLines.visible = false;
    this.beamGfx.visible = false;

    // Assign random scatter velocities to twinkle stars (outward from center)
    this.twinkleScatterVx = [];
    this.twinkleScatterVy = [];
    for (const star of this.twinkleStars) {
      const angle = Math.atan2(star.gfx.y, star.gfx.x) + (Math.random() - 0.5) * 1.2;
      const speed = 200 + Math.random() * 600;
      this.twinkleScatterVx.push(Math.cos(angle) * speed);
      this.twinkleScatterVy.push(Math.sin(angle) * speed);
    }

    // Create fade overlay
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
      node.baseAlpha = 0.35 + (prog / 100) * 0.55;
      // Update % text inside star
      if (node.progressLabel) {
        if (prog > 0 && prog < 100) {
          node.progressLabel.text = `${prog}%`;
          node.progressLabel.visible = true;
        } else {
          node.progressLabel.visible = false;
        }
      }
    }

    if (state === 'researched') {
      node.baseAlpha = 1;
      // Hide progress %, set name ready for hover
      if (node.progressLabel) node.progressLabel.visible = false;
      node.nameLabel.text = node.system.name;
      node.nameLabel.style.fill = 0x8899aa;
      // Name stays hidden until hover
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

    // Backdrop animations
    if (this.accretionDisk) this.accretionDisk.rotation += deltaMs * 0.0003;
    if (this.backdropContainer) this.backdropContainer.rotation += deltaMs * 0.000012;

    // Chaotic backdrop twinkle stars
    this.updateTwinkleStars(t);

    // Animate HOME star
    if (this.homeNode) {
      const hn = this.homeNode;
      hn.container.alpha += (hn.baseAlpha - hn.container.alpha) * Math.min(1, ANIM_SPEED * dt);
      this.animateStarBurn(hn, t);
    }

    // Animate all system nodes
    for (const [, node] of this.systemNodes) {
      node.container.alpha += (node.baseAlpha - node.container.alpha) * Math.min(1, ANIM_SPEED * dt);
      this.animateStarBurn(node, t);
    }

    // Connection lines: HOME -> Ring 1 -> Ring 2
    this.connectionLines.clear();
    for (const [, node] of this.systemNodes) {
      if (node.ringIndex === 1) {
        this.connectionLines.moveTo(0, 0);
        this.connectionLines.lineTo(node.tx, node.ty);
        this.connectionLines.stroke({ width: 0.8, color: 0x2a3a4a, alpha: 0.3 });
      } else if (node.ringIndex === 2) {
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

  /** Transition animation: fold stars into target, spin galaxy, scatter twinkle stars */
  private updateTransition(deltaMs: number, dt: number, t: number) {
    const TRANSITION_DURATION = 2000; // 2 seconds
    this.transitionProgress = Math.min(1, this.transitionProgress + deltaMs / TRANSITION_DURATION);
    const p = this.transitionProgress;

    // Easing: ease-in-out cubic
    const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

    const tx = this.transitionTargetX;
    const ty = this.transitionTargetY;

    // ── Galaxy backdrop: spin up dramatically ──
    const spinSpeed = 0.000012 + ease * 0.008; // ramps from normal to very fast
    if (this.backdropContainer) this.backdropContainer.rotation += deltaMs * spinSpeed;
    if (this.accretionDisk) this.accretionDisk.rotation += deltaMs * (0.0003 + ease * 0.005);

    // ── Twinkle stars: scatter outward chaotically ──
    for (let i = 0; i < this.twinkleStars.length; i++) {
      const star = this.twinkleStars[i];
      const vx = this.twinkleScatterVx[i] ?? 0;
      const vy = this.twinkleScatterVy[i] ?? 0;
      // Accelerate outward with easing
      star.gfx.x += vx * dt * ease * 2;
      star.gfx.y += vy * dt * ease * 2;
      // Fade out
      star.gfx.alpha = Math.max(0, star.baseAlpha * (1 - ease));
    }

    // ── System stars: fold toward target ──
    const foldStar = (node: SystemNode, isTarget: boolean) => {
      if (isTarget) {
        // Target grows brighter and slightly larger
        node.container.alpha = Math.min(1, node.baseAlpha + ease * 0.5);
        node.container.scale.set(1 + ease * 0.6);
        // Hide labels
        node.nameLabel.visible = false;
        if (node.progressLabel) node.progressLabel.visible = false;
      } else {
        // Move toward target position
        const startX = node.tx;
        const startY = node.ty;
        node.container.x = startX + (tx - startX) * ease;
        node.container.y = startY + (ty - startY) * ease;
        // Scale down as approaching
        const scale = Math.max(0.05, 1 - ease * 0.9);
        node.container.scale.set(scale);
        // Brighten slightly during convergence, then fade
        node.container.alpha = node.baseAlpha * (p < 0.7 ? 1 + ease * 0.5 : Math.max(0, (1 - p) / 0.3));
        // Hide labels
        node.nameLabel.visible = false;
        if (node.progressLabel) node.progressLabel.visible = false;
      }
      this.animateStarBurn(node, t);
    };

    // HOME node
    if (this.homeNode) {
      const isTarget = this.homeNode.system.id === this.transitionTargetId;
      if (!isTarget) {
        // HOME also folds toward target (starts at 0,0)
        this.homeNode.container.x = tx * ease;
        this.homeNode.container.y = ty * ease;
        const scale = Math.max(0.05, 1 - ease * 0.9);
        this.homeNode.container.scale.set(scale);
        this.homeNode.container.alpha = this.homeNode.baseAlpha * (p < 0.7 ? 1 : Math.max(0, (1 - p) / 0.3));
        this.homeNode.nameLabel.visible = false;
      } else {
        this.homeNode.container.alpha = Math.min(1, this.homeNode.baseAlpha + ease * 0.5);
        this.homeNode.container.scale.set(1 + ease * 0.6);
        this.homeNode.nameLabel.visible = false;
      }
      this.animateStarBurn(this.homeNode, t);
    }

    // All system nodes
    for (const [id, node] of this.systemNodes) {
      foldStar(node, id === this.transitionTargetId);
    }

    // ── Fade to black in last 30% ──
    if (this.fadeOverlay && p > 0.7) {
      const fadeP = (p - 0.7) / 0.3; // 0→1
      this.fadeOverlay.clear();
      this.fadeOverlay.rect(-2000, -2000, 4000, 4000);
      this.fadeOverlay.fill({ color: 0x020510, alpha: fadeP });
    }

    // ── Complete ──
    if (p >= 1) {
      this.transitionActive = false;
      if (this.transitionOnComplete) {
        this.transitionOnComplete();
        this.transitionOnComplete = null;
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
