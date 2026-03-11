import { Container, Graphics, Text } from 'pixi.js';
import type { GalaxyRing, StarSystem, ResearchState } from '@nebulife/core';
import { getResearchProgress, isSystemFullyResearched } from '@nebulife/core';
import { renderStarDot } from '../rendering/StarRenderer.js';
import { createGalaxyBackdrop } from '../rendering/GalaxyBackdrop.js';

const SCALE = 8; // pixels per light-year

interface SystemNode {
  container: Container;
  system: StarSystem;
  nameLabel: Text;
  planetLabel: Text | null;
  progressRing: Graphics | null;
  questionMark: Text | null;
  checkMark: Graphics | null;
  baseAlpha: number;
  phaseOffset: number;
}

export class GalaxyScene {
  container: Container;
  private systemNodes: Map<string, SystemNode> = new Map();
  private time = 0;
  private accretionDisk: Container | null = null;
  private backdropContainer: Container | null = null;
  private researchState: ResearchState;
  private beamGraphics: Graphics | null = null;
  private selectedSystemId: string | null = null;
  private homeSystemPos: { x: number; y: number } | null = null;
  private beamAlpha = 0;

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

    const galaxyCenterX = -playerCenterX * SCALE;
    const galaxyCenterY = -playerCenterY * SCALE;

    // Procedural galaxy backdrop
    const backdrop = createGalaxyBackdrop({
      seed: galaxySeed,
      centerX: galaxyCenterX,
      centerY: galaxyCenterY,
    });
    this.container.addChild(backdrop.container);
    this.accretionDisk = backdrop.accretionDisk;
    this.backdropContainer = backdrop.backdropContainer;

    // Find home system position for beam drawing
    const homeSystem = rings.flatMap(r => r.starSystems).find(s => s.ownerPlayerId !== null);
    if (homeSystem) {
      this.homeSystemPos = { x: homeSystem.position.x * SCALE, y: homeSystem.position.y * SCALE };
    }

    // Beam graphics layer (drawn between connections and system nodes)
    this.beamGraphics = new Graphics();
    this.container.addChild(this.beamGraphics);

    // Draw connections between nearby systems (only visible ones)
    this.drawConnections(rings);

    // Draw star systems (interactive, on top)
    for (const ring of rings) {
      for (const system of ring.starSystems) {
        this.addSystemNode(system);
      }
    }
  }

  private drawConnections(rings: GalaxyRing[]) {
    const allSystems = rings.flatMap((r) => r.starSystems);
    const lines = new Graphics();

    for (let i = 0; i < allSystems.length; i++) {
      for (let j = i + 1; j < allSystems.length; j++) {
        const a = allSystems[i];
        const b = allSystems[j];
        const dx = a.position.x - b.position.x;
        const dy = a.position.y - b.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 7) {
          // Only draw connection if at least one end is visible (home or researched)
          const aVisible = a.ownerPlayerId !== null || isSystemFullyResearched(this.researchState, a.id);
          const bVisible = b.ownerPlayerId !== null || isSystemFullyResearched(this.researchState, b.id);
          const aPartial = getResearchProgress(this.researchState, a.id) > 0;
          const bPartial = getResearchProgress(this.researchState, b.id) > 0;

          if (aVisible || bVisible || (aPartial && bPartial)) {
            const alpha = (aVisible && bVisible) ? 0.2 : 0.08;
            lines.moveTo(a.position.x * SCALE, a.position.y * SCALE);
            lines.lineTo(b.position.x * SCALE, b.position.y * SCALE);
            lines.stroke({ width: 0.4, color: 0x2a3a4a, alpha });
          }
        }
      }
    }
    this.container.addChild(lines);
  }

  private getSystemVisualState(system: StarSystem): 'home' | 'researched' | 'researching' | 'unexplored' {
    if (system.ownerPlayerId !== null) return 'home';
    if (isSystemFullyResearched(this.researchState, system.id)) return 'researched';
    if (getResearchProgress(this.researchState, system.id) > 0) return 'researching';
    return 'unexplored';
  }

  /** Simple hash from string to get a deterministic phase offset */
  private hashStringToFloat(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return (Math.abs(h) % 10000) / 10000 * Math.PI * 2;
  }

  /** Get color for planet habitability dot */
  private getHabitabilityColor(planet: { isHomePlanet: boolean; isColonizable: boolean; habitability?: { overall: number } }): number {
    if (planet.isHomePlanet) return 0x44ff88;                    // green — colonized
    if (planet.isColonizable && (planet.habitability?.overall ?? 0) > 0.5) return 0xddaa44; // yellow — habitable
    return 0x556677;                                              // dim — other
  }

  /** Draw small planet dots orbiting around a system node */
  private drawPlanetDots(parent: Container, planets: Array<{ isHomePlanet: boolean; isColonizable: boolean; habitability?: { overall: number } }>) {
    const count = planets.length;
    if (count === 0) return;
    const orbitRadius = 18;
    const g = new Graphics();
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(angle) * orbitRadius;
      const py = Math.sin(angle) * orbitRadius;
      const color = this.getHabitabilityColor(planets[i]);
      g.circle(px, py, 2);
      g.fill({ color, alpha: color === 0x556677 ? 0.3 : 0.7 });
    }
    parent.addChild(g);
  }

  private addSystemNode(system: StarSystem) {
    const x = system.position.x * SCALE;
    const y = system.position.y * SCALE;
    const state = this.getSystemVisualState(system);
    const progress = getResearchProgress(this.researchState, system.id);
    const phaseOffset = this.hashStringToFloat(system.id);

    const isHome = state === 'home';
    const dotRadius = isHome ? 10 : state === 'researched' ? 6 : 5;
    const starDot = renderStarDot(system.star, dotRadius, false);
    starDot.x = x;
    starDot.y = y;

    let nameLabel: Text;
    let planetLabel: Text | null = null;
    let progressRing: Graphics | null = null;
    let questionMark: Text | null = null;
    let checkMark: Graphics | null = null;

    // Visual state-specific rendering
    switch (state) {
      case 'home': {
        // Double green rings (larger HOME node)
        const homeRing = new Graphics();
        homeRing.circle(0, 0, 18);
        homeRing.stroke({ width: 2, color: 0x44ff88, alpha: 0.6 });
        starDot.addChild(homeRing);

        const glowRing = new Graphics();
        glowRing.circle(0, 0, 26);
        glowRing.stroke({ width: 1, color: 0x44ff88, alpha: 0.15 });
        starDot.addChild(glowRing);

        const outerGlow = new Graphics();
        outerGlow.circle(0, 0, 34);
        outerGlow.stroke({ width: 0.5, color: 0x44ff88, alpha: 0.06 });
        starDot.addChild(outerGlow);

        // Planet habitability dots
        this.drawPlanetDots(starDot, system.planets);

        const homeLabel = new Text({
          text: 'HOME',
          style: { fontSize: 10, fill: 0x44ff88, fontFamily: 'monospace', fontWeight: 'bold' },
        });
        homeLabel.anchor.set(0.5, 0);
        homeLabel.y = 22;
        starDot.addChild(homeLabel);

        nameLabel = new Text({
          text: system.name,
          style: { fontSize: 9, fill: 0x8899aa, fontFamily: 'monospace' },
        });
        nameLabel.anchor.set(0.5, 0);
        nameLabel.y = 34;
        starDot.addChild(nameLabel);

        planetLabel = new Text({
          text: `${system.planets.length}p`,
          style: { fontSize: 7, fill: 0x667788, fontFamily: 'monospace' },
        });
        planetLabel.anchor.set(0.5, 0);
        planetLabel.y = 45;
        starDot.addChild(planetLabel);
        break;
      }

      case 'researched': {
        // Fully visible with a subtle green outline
        checkMark = new Graphics();
        checkMark.circle(0, 0, 12);
        checkMark.stroke({ width: 1, color: 0x44ff88, alpha: 0.4 });
        starDot.addChild(checkMark);

        // Planet habitability dots
        this.drawPlanetDots(starDot, system.planets);

        nameLabel = new Text({
          text: system.name,
          style: { fontSize: 8, fill: 0x8899aa, fontFamily: 'monospace' },
        });
        nameLabel.anchor.set(0.5, 0);
        nameLabel.y = 22;
        starDot.addChild(nameLabel);

        planetLabel = new Text({
          text: `${system.planets.length}p`,
          style: { fontSize: 7, fill: 0x667788, fontFamily: 'monospace' },
        });
        planetLabel.anchor.set(0.5, 0);
        planetLabel.y = 32;
        starDot.addChild(planetLabel);
        break;
      }

      case 'researching': {
        // Semi-transparent based on progress
        const alpha = 0.35 + (progress / 100) * 0.55;
        starDot.alpha = alpha;

        // Circular progress ring
        progressRing = new Graphics();
        this.drawProgressArc(progressRing, progress, 12);
        starDot.addChild(progressRing);

        // Dim name
        nameLabel = new Text({
          text: system.name,
          style: { fontSize: 8, fill: 0x556677, fontFamily: 'monospace' },
        });
        nameLabel.anchor.set(0.5, 0);
        nameLabel.y = 10;
        starDot.addChild(nameLabel);

        // Progress percentage
        planetLabel = new Text({
          text: `${progress}%`,
          style: { fontSize: 7, fill: 0x4488aa, fontFamily: 'monospace' },
        });
        planetLabel.anchor.set(0.5, 0);
        planetLabel.y = 20;
        starDot.addChild(planetLabel);
        break;
      }

      case 'unexplored': {
        // Very dim
        starDot.alpha = 0.15;

        // Question mark instead of name
        questionMark = new Text({
          text: '?',
          style: { fontSize: 10, fill: 0x445566, fontFamily: 'monospace', fontWeight: 'bold' },
        });
        questionMark.anchor.set(0.5, 0);
        questionMark.y = 8;
        starDot.addChild(questionMark);

        nameLabel = new Text({
          text: '',
          style: { fontSize: 8, fill: 0x445566, fontFamily: 'monospace' },
        });
        nameLabel.anchor.set(0.5, 0);
        nameLabel.y = 20;
        starDot.addChild(nameLabel);
        break;
      }
    }

    // Observatory marker if this system has an active research slot
    const hasObservatory = this.researchState.slots.some(s => s.systemId === system.id);
    if (hasObservatory) {
      const obsMarker = new Text({
        text: '[O]',
        style: { fontSize: 7, fill: 0x4488aa, fontFamily: 'monospace' },
      });
      obsMarker.anchor.set(0.5, 0.5);
      obsMarker.x = dotRadius + 10;
      obsMarker.y = -6;
      starDot.addChild(obsMarker);
    }

    // Interactivity
    starDot.eventMode = 'static';
    starDot.cursor = 'pointer';
    starDot.hitArea = { contains: (px: number, py: number) => px * px + py * py < 400 };

    let clickCount = 0;
    let clickTimer: ReturnType<typeof setTimeout> | null = null;

    starDot.on('pointerdown', () => {
      clickCount++;
      if (clickCount === 1) {
        clickTimer = setTimeout(() => {
          if (clickCount === 1) {
            this.selectSystem(system.id);
            this.onSelect(system);
          }
          clickCount = 0;
        }, 300);
      } else if (clickCount === 2) {
        if (clickTimer) clearTimeout(clickTimer);
        clickCount = 0;
        this.onDoubleClick(system);
      }
    });

    // Hover effect
    const nodeBaseAlpha = starDot.alpha;
    starDot.on('pointerover', () => {
      starDot.scale.set(1.3);
      starDot.alpha = Math.min(1, nodeBaseAlpha + 0.3);
      nameLabel.style.fill = state === 'unexplored' ? 0x778899 : 0xffffff;
    });
    starDot.on('pointerout', () => {
      starDot.scale.set(1.0);
      starDot.alpha = nodeBaseAlpha;
      nameLabel.style.fill = state === 'home' || state === 'researched' ? 0x8899aa : state === 'researching' ? 0x556677 : 0x445566;
    });

    this.container.addChild(starDot);
    this.systemNodes.set(system.id, {
      container: starDot,
      system,
      nameLabel,
      planetLabel,
      progressRing,
      questionMark,
      checkMark,
      baseAlpha: starDot.alpha,
      phaseOffset,
    });
  }

  /** Select a system — draws beam from HOME to selected system */
  selectSystem(systemId: string | null) {
    this.selectedSystemId = systemId;
    this.beamAlpha = 0; // reset beam animation
  }

  private drawProgressArc(g: Graphics, progress: number, radius: number) {
    g.clear();
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (progress / 100) * Math.PI * 2;

    // Background ring (dim)
    g.circle(0, 0, radius);
    g.stroke({ width: 1, color: 0x334455, alpha: 0.3 });

    // Progress arc
    if (progress > 0) {
      g.arc(0, 0, radius, startAngle, endAngle);
      g.stroke({ width: 1.5, color: 0x44aaff, alpha: 0.7 });
    }
  }

  /** Update visual state of a system after research progress changes. */
  updateSystemVisual(systemId: string, researchState: ResearchState) {
    this.researchState = researchState;
    const node = this.systemNodes.get(systemId);
    if (!node) return;

    const state = this.getSystemVisualState(node.system);
    const progress = getResearchProgress(researchState, systemId);

    switch (state) {
      case 'researching': {
        const alpha = 0.35 + (progress / 100) * 0.55;
        node.container.alpha = alpha;
        if (node.progressRing) {
          this.drawProgressArc(node.progressRing, progress, 12);
        }
        if (node.planetLabel) {
          node.planetLabel.text = `${progress}%`;
        }
        // Remove question mark if it was there
        if (node.questionMark) {
          node.questionMark.text = '';
        }
        // Show name when researching
        if (node.nameLabel && !node.nameLabel.text) {
          node.nameLabel.text = node.system.name;
          node.nameLabel.style.fill = 0x556677;
        }
        break;
      }

      case 'researched': {
        node.container.alpha = 1;
        // Remove progress ring
        if (node.progressRing) {
          node.progressRing.clear();
        }
        // Remove question mark
        if (node.questionMark) {
          node.questionMark.text = '';
        }
        // Show full data
        node.nameLabel.text = node.system.name;
        node.nameLabel.style.fill = 0x8899aa;
        if (node.planetLabel) {
          node.planetLabel.text = `${node.system.planets.length}p`;
          node.planetLabel.style.fill = 0x667788;
        }
        // Add green outline if not already present
        if (!node.checkMark) {
          const cm = new Graphics();
          cm.circle(0, 0, 12);
          cm.stroke({ width: 1, color: 0x44ff88, alpha: 0.4 });
          node.container.addChild(cm);
          node.checkMark = cm;
        }
        break;
      }
    }
  }

  update(deltaMs: number) {
    this.time += deltaMs;

    // Animate black hole accretion disk rotation
    if (this.accretionDisk) {
      this.accretionDisk.rotation += deltaMs * 0.0003;
    }

    // Slow galaxy backdrop rotation (~1 revolution per 87 minutes)
    if (this.backdropContainer) {
      this.backdropContainer.rotation += deltaMs * 0.000012;
    }

    // Animate system nodes: home pulse + star twinkling
    for (const [, node] of this.systemNodes) {
      if (node.system.ownerPlayerId) {
        // Home system: gentle pulse
        node.container.alpha = 0.85 + Math.sin(this.time * 0.002) * 0.15;
      } else {
        // All other stars: subtle twinkling
        const twinkle = Math.sin(this.time * 0.0015 + node.phaseOffset) * 0.08;
        node.container.alpha = node.baseAlpha + twinkle;
      }
    }

    // Animate beam from HOME to selected system
    if (this.beamGraphics) {
      this.beamGraphics.clear();
      if (this.selectedSystemId && this.homeSystemPos) {
        const targetNode = this.systemNodes.get(this.selectedSystemId);
        if (targetNode && targetNode.system.ownerPlayerId === null) {
          // Fade in beam
          this.beamAlpha = Math.min(0.6, this.beamAlpha + deltaMs * 0.002);
          const tx = targetNode.system.position.x * SCALE;
          const ty = targetNode.system.position.y * SCALE;
          this.beamGraphics.moveTo(this.homeSystemPos.x, this.homeSystemPos.y);
          this.beamGraphics.lineTo(tx, ty);
          this.beamGraphics.stroke({ width: 1.5, color: 0x4488aa, alpha: this.beamAlpha });
          // Glow beam
          this.beamGraphics.moveTo(this.homeSystemPos.x, this.homeSystemPos.y);
          this.beamGraphics.lineTo(tx, ty);
          this.beamGraphics.stroke({ width: 4, color: 0x4488aa, alpha: this.beamAlpha * 0.15 });
        }
      }
    }
  }

  destroy() {
    this.container.destroy({ children: true });
    this.systemNodes.clear();
  }
}
