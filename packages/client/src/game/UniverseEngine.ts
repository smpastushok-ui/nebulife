/**
 * UniverseEngine — Three.js 3D galaxy universe viewer
 *
 * Handles two LOD levels:
 *   1. Galaxy level — 60 clusters on spiral arms around SMBH
 *   2. Cluster level — 50 players * 19 systems + 500 core systems
 *
 * Lower levels (player galaxy, system, planet) are handled by PixiJS GameEngine.
 * When the player clicks their home star in cluster view, control is
 * passed back to App.tsx via callbacks.onEnterPlayerGalaxy().
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SeededRNG } from '@nebulife/core';
import {
  GALAXY_MASTER_SEED,
  SPIRAL_ARM_COUNT,
  SPIRAL_A,
  SPIRAL_B,
  THETA_STEP,
  DISK_THIN_SIGMA,
  DISK_BULGE_SIGMA,
  DISK_BULGE_SCALE,
  GROUP_SCATTER,
  BRANCH_START,
  BRANCH_ANGLE_RATE,
  BRANCH_SCATTER_RATE,
} from '@nebulife/core';
import {
  computeGroupPosition,
  derivePlayerSeed,
  hexToPixel,
  hexNeighbor,
  hexRing,
  PLAYER_SPACING,
  EXPANSION_START_RADIUS,
  generateGalaxyGroupCore,
} from '@nebulife/core';
import type { GalaxyGroupMeta, CoreSystem } from '@nebulife/core';
import { delaunayEdges } from '@nebulife/core';

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

export type UniverseLodState = 'galaxy' | 'cluster';

export interface UniverseCallbacks {
  /** Player clicked their home star in cluster view — transition to PixiJS */
  onEnterPlayerGalaxy: (playerSeed: number, groupIndex: number) => void;
  /** LOD level changed */
  onLodChange: (lod: UniverseLodState) => void;
}

// ══════════════════════════════════════════════════════════════
// Detail cluster constants (match galaxy-group-generator.ts)
// ══════════════════════════════════════════════════════════════

const DETAIL_NUM_PLAYERS = 50;
const DETAIL_RING_DISTANCE_LY = 5;
const DETAIL_GOLDEN_ANGLE = 2.399963;

// Galaxy-level IMF stellar types
const STELLAR_IMF = [
  { r: 0.55, g: 0.65, b: 1.0, w: 0.003, sz: 1.8 }, // O
  { r: 0.62, g: 0.72, b: 1.0, w: 0.01, sz: 1.5 },  // B
  { r: 0.75, g: 0.82, b: 1.0, w: 0.02, sz: 1.2 },  // A
  { r: 0.88, g: 0.88, b: 0.85, w: 0.04, sz: 1.0 },  // F
  { r: 1.0, g: 0.92, b: 0.7, w: 0.08, sz: 0.9 },   // G
  { r: 1.0, g: 0.72, b: 0.42, w: 0.12, sz: 0.7 },   // K
  { r: 1.0, g: 0.45, b: 0.25, w: 0.71, sz: 0.5 },   // M
];

// Game-accurate stellar classes (full data)
const STELLAR_CLASSES_FULL = [
  { cl: 'O', sub: 5, tempK: 40000, massSolar: 40, radiusSolar: 17.8, lum: 501000, color: '#9bb0ff', lifetimeGyr: 0.001 },
  { cl: 'B', sub: 0, tempK: 28000, massSolar: 18, radiusSolar: 7.4, lum: 20000, color: '#aabfff', lifetimeGyr: 0.01 },
  { cl: 'B', sub: 5, tempK: 15000, massSolar: 6.4, radiusSolar: 3.8, lum: 790, color: '#cad7ff', lifetimeGyr: 0.1 },
  { cl: 'A', sub: 0, tempK: 9900, massSolar: 3.2, radiusSolar: 2.5, lum: 79, color: '#f8f7ff', lifetimeGyr: 0.4 },
  { cl: 'A', sub: 5, tempK: 8500, massSolar: 2.1, radiusSolar: 1.7, lum: 20, color: '#fff4ea', lifetimeGyr: 1.0 },
  { cl: 'F', sub: 0, tempK: 7400, massSolar: 1.7, radiusSolar: 1.4, lum: 6.3, color: '#fff2e0', lifetimeGyr: 2.0 },
  { cl: 'F', sub: 5, tempK: 6600, massSolar: 1.3, radiusSolar: 1.2, lum: 2.5, color: '#fff4e8', lifetimeGyr: 4.0 },
  { cl: 'G', sub: 0, tempK: 6000, massSolar: 1.1, radiusSolar: 1.05, lum: 1.3, color: '#fff9f0', lifetimeGyr: 8.0 },
  { cl: 'G', sub: 2, tempK: 5778, massSolar: 1.0, radiusSolar: 1.0, lum: 1.0, color: '#fff5e3', lifetimeGyr: 10.0 },
  { cl: 'G', sub: 5, tempK: 5500, massSolar: 0.93, radiusSolar: 0.92, lum: 0.79, color: '#fff1d8', lifetimeGyr: 12.0 },
  { cl: 'K', sub: 0, tempK: 4900, massSolar: 0.82, radiusSolar: 0.81, lum: 0.40, color: '#ffd2a1', lifetimeGyr: 17.0 },
  { cl: 'K', sub: 5, tempK: 4100, massSolar: 0.68, radiusSolar: 0.68, lum: 0.16, color: '#ffcc8f', lifetimeGyr: 25.0 },
  { cl: 'M', sub: 0, tempK: 3500, massSolar: 0.47, radiusSolar: 0.51, lum: 0.063, color: '#ffbd80', lifetimeGyr: 60.0 },
  { cl: 'M', sub: 2, tempK: 3200, massSolar: 0.35, radiusSolar: 0.37, lum: 0.025, color: '#ffb575', lifetimeGyr: 80.0 },
  { cl: 'M', sub: 5, tempK: 2800, massSolar: 0.20, radiusSolar: 0.25, lum: 0.008, color: '#ffb070', lifetimeGyr: 100.0 },
  { cl: 'M', sub: 8, tempK: 2400, massSolar: 0.10, radiusSolar: 0.12, lum: 0.001, color: '#ffa060', lifetimeGyr: 200.0 },
];
const SPEC_CLS_ORDERED = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];
const SPEC_WEIGHTS = [0.00003, 0.13, 0.6, 3.0, 7.6, 12.1, 76.45];

// Reusable temp vectors — avoid per-frame allocations in animate loop
const _tmpVec3A = new THREE.Vector3();
const _tmpVec3B = new THREE.Vector3();
const _tmpVec2 = new THREE.Vector2();

// Visualization (reduced from 260/160 to save GPU on mobile — visually similar density)
const STARS_PER_CLUSTER = 80;
const CORE_STARS_PER_CLUSTER = 50;
const CLUSTER_VIS_RADIUS = 40;
const SCALE = 1.0;

// LOD thresholds
const LOD_EXPAND_DIST = 250;
const LOD_COLLAPSE_DIST = 450;
const CLUSTER_DETAIL_SCALE = 0.08;

// Cluster name generation
const NAME_PARTS = {
  pre: ['Vel', 'Aur', 'Cir', 'Nor', 'Pyx', 'Eri', 'Lyn', 'Vol', 'Car', 'Ara',
    'Cor', 'Lep', 'Pav', 'Tri', 'Scl', 'Gru', 'Tuc', 'Pic', 'Mus', 'Col'],
  mid: ['an', 'or', 'ix', 'us', 'ae', 'is', 'on', 'ar', 'el', 'os',
    'um', 'ia', 'en', 'al', 'ur', 'ax', 'em', 'ir', 'ul', 'at'],
  suf: ['tis', 'rae', 'nis', 'rus', 'lis', 'rum', 'nus', 'des', 'tae', 'lum',
    'xis', 'cus', 'bis', 'pis', 'gis', 'vis', 'dis', 'fis', 'mis', 'ris'],
};

// Arm tints
const ARM_TINT = [
  { r: 1.0, g: 0.9, b: 0.75 },
  { r: 0.75, g: 0.85, b: 1.0 },
  { r: 0.85, g: 1.0, b: 0.85 },
  { r: 1.0, g: 0.8, b: 0.9 },
  { r: 0.9, g: 0.85, b: 1.0 },
];

// ══════════════════════════════════════════════════════════════
// Shaders
// ══════════════════════════════════════════════════════════════

const GLOW_VERT = `
  attribute float size;
  attribute float alpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = color;
    vAlpha = alpha;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (3500.0 / -mvPos.z);
    gl_PointSize = clamp(gl_PointSize, 1.2, 28.0);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const GLOW_FRAG = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float core = smoothstep(0.18, 0.0, d);
    float halo = smoothstep(0.5, 0.18, d) * 0.25;
    gl_FragColor = vec4(vColor, (core + halo) * vAlpha);
  }
`;

const DETAIL_STAR_VERT = `
  attribute float size;
  attribute float alpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = color;
    vAlpha = alpha;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (400.0 / -mvPos.z);
    gl_PointSize = clamp(gl_PointSize, 1.0, 24.0);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const DETAIL_STAR_FRAG = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float core = smoothstep(0.25, 0.0, d);
    float halo = smoothstep(0.5, 0.25, d) * 0.2;
    gl_FragColor = vec4(vColor, (core + halo) * vAlpha);
  }
`;

const DETAIL_EDGE_VERT = `
  attribute float alpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = color;
    vAlpha = alpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const DETAIL_EDGE_FRAG = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    if (vAlpha < 0.01) discard;
    gl_FragColor = vec4(vColor, vAlpha);
  }
`;

const JET_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const JET_FRAG = `
  uniform float time;
  uniform float direction;
  varying vec2 vUv;
  void main() {
    vec2 c = vUv - vec2(0.5, 0.0);
    float xDist = abs(c.x);
    float beamWidth = 0.03 + vUv.y * 0.08;
    float beam = smoothstep(beamWidth, beamWidth * 0.2, xDist);
    float lengthFade = smoothstep(1.0, 0.1, vUv.y) * smoothstep(0.0, 0.05, vUv.y);
    float flow = (sin(vUv.y * 20.0 - time * direction * 3.0) * 0.5 + 0.5) * 0.6
               + (sin(vUv.y * 12.0 - time * direction * 2.0 + 1.0) * 0.5 + 0.5) * 0.4;
    float pulse = 0.7 + 0.3 * sin(time * 1.8);
    float alpha = beam * lengthFade * (0.1 + flow * 0.08) * pulse;
    vec3 col = mix(vec3(0.3, 0.5, 0.9), vec3(0.7, 0.85, 1.0), beam);
    gl_FragColor = vec4(col, alpha);
  }
`;

// ══════════════════════════════════════════════════════════════
// Helper functions
// ══════════════════════════════════════════════════════════════

interface DetailStar {
  cl: string;
  sub: number;
  lum: number;
  color: string;
}

interface DetailPlayer {
  index: number;
  homeHex: { q: number; r: number };
  homePos: { x: number; y: number; z: number };
  spec: DetailStar;
  ring1: Array<{ x: number; y: number; z: number; color: string; lum: number; cl: string; sub: number; systemSeed: number }>;
  ring2: Array<{ x: number; y: number; z: number; color: string; lum: number; cl: string; sub: number; systemSeed: number }>;
  playerSeed: number;
  homeSystemSeed: number;
  neighbors: number[];
  entryStarId: number;
  coreExitRing2Idx: number;
}

interface DetailCoreSystem {
  id: number;
  x: number;
  y: number;
  z: number;
  depth: number;
  neighbors: number[];
  spec: DetailStar;
  entryForPlayer: number;
}

interface DetailPlayerEdge {
  ax: number; ay: number; az: number;
  bx: number; by: number; bz: number;
  type: string;
  ownerIdx: number;
}

interface ClusterDetail {
  players: DetailPlayer[];
  coreSystems: DetailCoreSystem[];
  edgePairs: [number, number][];
  playerEdges: DetailPlayerEdge[];
  getReachable: (entryId: number) => {
    visited: Set<number>;
    byLevel: number[][];
    nodeLevel: Map<number, number>;
  };
}

interface DetailSystemEntry {
  x: number; y: number; z: number;
  color: string; lum: number;
  type: 'home' | 'ring1' | 'ring2';
  playerIdx: number;
}

function pickStellarIMF(rng: SeededRNG) {
  let roll = rng.next(), cum = 0;
  for (const s of STELLAR_IMF) { cum += s.w; if (roll < cum) return s; }
  return STELLAR_IMF[STELLAR_IMF.length - 1];
}

function _lerpNum(a: number, b: number, t: number) { return a + (b - a) * t; }

function generateStarFromSeed(seed: number): DetailStar & { lum: number } {
  const rng = new SeededRNG(seed);
  const cl = rng.weightedChoice(SPEC_CLS_ORDERED, SPEC_WEIGHTS);
  const entries = STELLAR_CLASSES_FULL.filter(s => s.cl === cl);

  let data: { cl: string; sub: number; color: string; lum: number };
  if (entries.length === 1) {
    data = { cl: entries[0].cl, sub: entries[0].sub, color: entries[0].color, lum: entries[0].lum };
  } else {
    const t = rng.next();
    const idx = Math.floor(t * (entries.length - 1));
    const lt = (t * (entries.length - 1)) - idx;
    const a = entries[Math.min(idx, entries.length - 1)];
    const b = entries[Math.min(idx + 1, entries.length - 1)];
    data = {
      cl,
      sub: Math.round(_lerpNum(a.sub, b.sub, lt)),
      color: lt < 0.5 ? a.color : b.color,
      lum: _lerpNum(a.lum, b.lum, lt),
    };
  }
  return data;
}

function dist2d(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function getPlayerHome(i: number): { q: number; r: number } {
  const angle = i * DETAIL_GOLDEN_ANGLE;
  const mr = Math.ceil(EXPANSION_START_RADIUS / PLAYER_SPACING);
  const sr = mr + Math.sqrt(i) * 1.5;
  return {
    q: Math.round(sr * Math.cos(angle)) * PLAYER_SPACING,
    r: Math.round(sr * Math.sin(angle)) * PLAYER_SPACING,
  };
}

function clusterName(seed: number): string {
  const rng = new SeededRNG(seed * 7919);
  return rng.pick(NAME_PARTS.pre) + rng.pick(NAME_PARTS.mid) + rng.pick(NAME_PARTS.suf);
}

// ══════════════════════════════════════════════════════════════
// Cluster detail generator (mirrors galaxy-spiral.html)
// ══════════════════════════════════════════════════════════════

function generateClusterDetail(groupSeed: number): ClusterDetail {
  const rng = new SeededRNG(groupSeed);

  const players: DetailPlayer[] = [];
  for (let i = 0; i < DETAIL_NUM_PLAYERS; i++) {
    const hh = getPlayerHome(i);
    const hp = hexToPixel(hh.q, hh.r, DETAIL_RING_DISTANCE_LY);
    const playerSeed = derivePlayerSeed(groupSeed, i);
    const playerRng = new SeededRNG(playerSeed);

    const homeSystemSeed = playerRng.deriveSeed(0);
    const homeStar = generateStarFromSeed(new SeededRNG(homeSystemSeed).deriveSeed(0));
    const spec = { cl: homeStar.cl, sub: homeStar.sub, lum: homeStar.lum, color: homeStar.color };

    const r1hex = hexRing(hh, 1);
    const r1 = r1hex.map((h, ri) => {
      const p = hexToPixel(h.q, h.r, DETAIL_RING_DISTANCE_LY);
      const sysSeed = playerRng.deriveSeed(ri + 1);
      const star = generateStarFromSeed(new SeededRNG(sysSeed).deriveSeed(0));
      return { ...p, z: rng.nextGaussian(0, 1.5), color: star.color, lum: star.lum, cl: star.cl, sub: star.sub, systemSeed: sysSeed };
    });

    const r2hex = hexRing(hh, 2);
    const r2 = r2hex.map((h, ri) => {
      const p = hexToPixel(h.q, h.r, DETAIL_RING_DISTANCE_LY);
      const sysSeed = playerRng.deriveSeed(ri + 7);
      const star = generateStarFromSeed(new SeededRNG(sysSeed).deriveSeed(0));
      return { ...p, z: rng.nextGaussian(0, 2), color: star.color, lum: star.lum, cl: star.cl, sub: star.sub, systemSeed: sysSeed };
    });

    players.push({
      index: i, homeHex: hh, homePos: { ...hp, z: rng.nextGaussian(0, 1) },
      spec, ring1: r1, ring2: r2, playerSeed, homeSystemSeed,
      neighbors: [], entryStarId: -1, coreExitRing2Idx: 0,
    });
  }

  // Compute Delaunay triangulation for player positions
  const playerPoints = players.map(p => ({ x: p.homePos.x, y: p.homePos.y }));
  const dEdges = delaunayEdges(playerPoints);
  // Initialize empty neighbor arrays
  for (const p of players) p.neighbors = [];
  // Populate from Delaunay edges
  for (const [i, j] of dEdges) {
    players[i].neighbors.push(j);
    players[j].neighbors.push(i);
  }

  // Core systems (500) — use the shared generator from @nebulife/core
  // This ensures 2D (PixiJS GalaxyScene) and 3D (Three.js UniverseEngine)
  // show identical core topology for the same cluster seed.
  const coreData = generateGalaxyGroupCore(groupSeed);
  const coreSystems: DetailCoreSystem[] = coreData.systems.map((cs: CoreSystem) => ({
    id: cs.id,
    x: cs.position.x,
    y: cs.position.y,
    z: cs.position.z,
    depth: cs.depth,
    neighbors: [...cs.neighbors],
    spec: { cl: cs.spectralClass, sub: cs.subType, lum: cs.luminositySolar, color: cs.colorHex },
    entryForPlayer: cs.entryForPlayerIndex,
  }));

  // Link players to their entry stars
  for (let i = 0; i < DETAIL_NUM_PLAYERS; i++) {
    const entryId = coreData.entryIds[i];
    if (entryId !== undefined) players[i].entryStarId = entryId;
  }

  // Edge pairs
  const edgePairs: [number, number][] = [];
  const drawnEdges = new Set<string>();
  for (const sys of coreSystems) {
    for (const nid of sys.neighbors) {
      const key = Math.min(sys.id, nid) + ',' + Math.max(sys.id, nid);
      if (drawnEdges.has(key)) continue;
      drawnEdges.add(key);
      edgePairs.push([sys.id, nid]);
    }
  }

  // Player edges
  const playerEdges: DetailPlayerEdge[] = [];
  for (const p of players) {
    for (let ni = 0; ni < p.neighbors.length; ni++) {
      const neighborIdx = p.neighbors[ni];
      const r2idx = ni + 1;
      if (r2idx < p.ring2.length) {
        const from = p.ring2[r2idx];
        const nbrPlayer = players[neighborIdx];
        let bestDist = Infinity, bestR2 = nbrPlayer.ring2[0];
        for (const r2s of nbrPlayer.ring2) {
          const d = dist2d(from, r2s);
          if (d < bestDist) { bestDist = d; bestR2 = r2s; }
        }
        playerEdges.push({ ax: from.x, ay: from.y, az: from.z, bx: bestR2.x, by: bestR2.y, bz: bestR2.z, type: 'player', ownerIdx: p.index });
      }
    }
    const r2core = p.ring2[p.coreExitRing2Idx];
    const coreEntry = coreSystems[p.entryStarId];
    playerEdges.push({ ax: r2core.x, ay: r2core.y, az: r2core.z, bx: coreEntry.x, by: coreEntry.y, bz: coreEntry.z, type: 'core', ownerIdx: p.index });
  }

  // BFS
  function getReachable(entryId: number) {
    const visited = new Set<number>();
    const byLevel: number[][] = [];
    const nodeLevel = new Map<number, number>();
    let cur = [entryId]; visited.add(entryId); nodeLevel.set(entryId, 0); let lvl = 0;
    while (cur.length > 0) {
      byLevel.push([...cur]);
      const nxt: number[] = [];
      for (const id of cur) for (const nid of coreSystems[id].neighbors) {
        if (!visited.has(nid)) { visited.add(nid); nodeLevel.set(nid, lvl + 1); nxt.push(nid); }
      }
      cur = nxt; lvl++;
    }
    return { visited, byLevel, nodeLevel };
  }

  return { players, coreSystems, edgePairs, playerEdges, getReachable };
}

// ══════════════════════════════════════════════════════════════
// UniverseEngine class
// ══════════════════════════════════════════════════════════════

export class UniverseEngine {
  private container: HTMLElement;
  private callbacks: UniverseCallbacks;
  private globalPlayerIndex: number;
  private groupCount: number;

  // Derived
  private myGroupIndex: number;
  private myPlayerInCluster: number;

  // Three.js core
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private animFrameId = 0;
  private visible = false;
  /** Frame throttle: min interval between renders (ms). 33 = ~30 FPS */
  private frameInterval = 33;
  private lastFrameTime = 0;

  // Galaxy objects
  private groups: GalaxyGroupMeta[] = [];
  private clusterPoints: THREE.Points | null = null;
  private clusterGeo: THREE.BufferGeometry | null = null;
  private starGroupIndex: number[] = [];
  private origColors: Float32Array | null = null;
  private origAlphas: Float32Array | null = null;
  private origSizes: Float32Array | null = null;
  private spiralLines: THREE.Line[] = [];
  private smbhGroup!: THREE.Group;
  private jetUpRef: THREE.Mesh | null = null;
  private jetDownRef: THREE.Mesh | null = null;

  // Player marker
  private myRing!: THREE.Mesh;
  private autoRotateEnabled = true;

  // Hover
  private hoveredGroup = -1;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  // Fly animation
  private flyAnimation: {
    startTime: number; duration: number;
    from: { pos: THREE.Vector3; target: THREE.Vector3 };
    to: { pos: THREE.Vector3; target: THREE.Vector3 };
  } | null = null;
  private flyTarget: 'cluster' | 'center' | null = null;

  // LOD state
  private lodState: UniverseLodState = 'galaxy';
  private lodClusterIndex = -1;
  private lodDetail: ClusterDetail | null = null;
  private lodGroup: THREE.Group | null = null;
  private lodDetailPoints: THREE.Points | null = null;
  private lodDetailAllSystems: DetailSystemEntry[] = [];
  private lodCoreGeo: THREE.BufferGeometry | null = null;
  private lodCoreOrigCol: { r: number; g: number; b: number }[] = [];
  private lodEdgeGeo: THREE.BufferGeometry | null = null;
  private lodPlEdgeGeo: THREE.BufferGeometry | null = null;
  private lodHoveredPlayer = -1;

  // Zoom-to-cursor
  private zoomLockedTarget: THREE.Vector3 | null = null;
  private zoomIdleTimer: ReturnType<typeof setTimeout> | null = null;
  private touchZoomLockedTarget: THREE.Vector3 | null = null;

  // Click detection
  private clickStartPos: { x: number; y: number } | null = null;

  // Event handler references (for cleanup)
  private boundOnWheel: ((e: WheelEvent) => void) | null = null;
  private boundOnMouseMove: ((e: MouseEvent) => void) | null = null;
  private boundOnPointerDown: ((e: PointerEvent) => void) | null = null;
  private boundOnPointerUp: ((e: PointerEvent) => void) | null = null;
  private boundOnResize: (() => void) | null = null;
  private boundOnKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private boundOnTouchMove: ((e: TouchEvent) => void) | null = null;
  private boundOnTouchEnd: (() => void) | null = null;

  constructor(
    container: HTMLElement,
    callbacks: UniverseCallbacks,
    globalPlayerIndex = 950,
    groupCount = 60,
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.globalPlayerIndex = globalPlayerIndex;
    this.groupCount = groupCount;
    this.myGroupIndex = Math.floor(globalPlayerIndex / 50);
    this.myPlayerInCluster = globalPlayerIndex % 50;
  }

  // ── Public API ──────────────────────────────────────────────

  async init(): Promise<void> {
    this.setupScene();
    this.setupSMBH();
    this.setupPlayerRing();
    this.buildGalaxy();
    this.setupEventListeners();
    this.visible = true;
    this.animate();
  }

  destroy(): void {
    this.visible = false;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.removeEventListeners();

    if (this.lodState === 'cluster') this.collapseCluster();

    // Dispose all
    this.scene.traverse(obj => {
      const m = obj as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
        else m.material.dispose();
      }
    });

    this.renderer.forceContextLoss();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }

  setVisible(vis: boolean): void {
    this.visible = vis;
    if (vis) {
      this.onResize();
      this.animate();
    } else {
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = 0;
      }
    }
  }

  flyToMyCluster(durationMs: number = 2500): void {
    if (this.groups.length <= this.myGroupIndex) return;
    if (this.lodState === 'cluster') this.collapseCluster();

    const target = this.getGroupWorldPos(this.myGroupIndex);
    const dist = 350;
    const arrivalPos = target.clone().add(new THREE.Vector3(0, dist * 0.45, dist * 0.75));

    this.flyAnimation = {
      startTime: performance.now(),
      duration: durationMs,
      from: { pos: this.camera.position.clone(), target: this.controls.target.clone() },
      to: { pos: arrivalPos, target },
    };
    this.flyTarget = 'cluster';
    this.controls.autoRotate = false;
  }

  flyToCenter(): void {
    if (this.lodState === 'cluster') this.collapseCluster();

    const target = new THREE.Vector3(0, 0, 0);
    const arrivalPos = new THREE.Vector3(0, 3500, 5500);

    this.flyAnimation = {
      startTime: performance.now(),
      duration: 2500,
      from: { pos: this.camera.position.clone(), target: this.controls.target.clone() },
      to: { pos: arrivalPos, target },
    };
    this.flyTarget = 'center';
    this.controls.autoRotate = this.autoRotateEnabled;
    this.myRing.visible = false;
    this.resetHover();
    this.hoveredGroup = -1;
  }

  /** Programmatic zoom in (for UI buttons) */
  zoomIn(): void {
    const dir = new THREE.Vector3();
    dir.subVectors(this.controls.target, this.camera.position).normalize();
    const dist = this.camera.position.distanceTo(this.controls.target);
    const step = dist * 0.2;
    this.camera.position.addScaledVector(dir, step);
  }

  /** Programmatic zoom out (for UI buttons) */
  zoomOut(): void {
    const dir = new THREE.Vector3();
    dir.subVectors(this.controls.target, this.camera.position).normalize();
    const dist = this.camera.position.distanceTo(this.controls.target);
    const step = dist * 0.2;
    this.camera.position.addScaledVector(dir, -step);
  }

  collapseToGalaxy(): void {
    if (this.lodState === 'cluster') this.collapseCluster();
  }

  getLodState(): UniverseLodState {
    return this.lodState;
  }

  /**
   * Update the number of galaxy groups and rebuild the galaxy visualization.
   * Called after fetchUniverseInfo() resolves with the real cluster count,
   * fixing the race condition where the engine was constructed with groupCount=1.
   */
  updateGroupCount(newCount: number): void {
    if (newCount === this.groupCount) return;
    this.groupCount = newCount;

    // Dispose old geometry before rebuild to avoid GPU memory leak
    if (this.clusterGeo) {
      this.clusterGeo.dispose();
      this.clusterGeo = null;
    }
    if (this.clusterPoints) {
      const mat = this.clusterPoints.material;
      if (Array.isArray(mat)) mat.forEach(m => m.dispose());
      else mat.dispose();
    }

    // Clear hover caches — they reference the old geometry arrays
    this.origColors = null;
    this.origAlphas = null;
    this.origSizes = null;
    this.hoveredGroup = -1;

    this.buildGalaxy();
  }

  // ── Scene setup ────────────────────────────────────────────

  private setupScene(): void {
    const W = this.container.clientWidth || window.innerWidth;
    const H = this.container.clientHeight || window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020510);

    this.camera = new THREE.PerspectiveCamera(55, W / H, 1, 200000);
    this.camera.position.set(0, 3500, 5500);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(W, H);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 80000;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.05;
  }

  private setupSMBH(): void {
    this.smbhGroup = new THREE.Group();

    // Event horizon
    const ehGeo = new THREE.SphereGeometry(40, 32, 32);
    const ehMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.smbhGroup.add(new THREE.Mesh(ehGeo, ehMat));

    // Accretion disk rings
    for (let i = 0; i < 6; i++) {
      const inner = 55 + i * 30;
      const outer = inner + 25;
      const ringGeo = new THREE.RingGeometry(inner, outer, 128);
      const t = i / 5;
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(1.0 - t * 0.3, 0.5 - t * 0.2, 0.15 + t * 0.15),
        transparent: true, opacity: 0.3 - i * 0.04,
        side: THREE.DoubleSide, depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      this.smbhGroup.add(ring);
    }

    // Glow sphere
    const glowGeo = new THREE.SphereGeometry(90, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff6633, transparent: true, opacity: 0.04,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.smbhGroup.add(new THREE.Mesh(glowGeo, glowMat));

    // Jets (up + down)
    const jetUpMat = new THREE.ShaderMaterial({
      vertexShader: JET_VERT, fragmentShader: JET_FRAG,
      uniforms: { time: { value: 0 }, direction: { value: 1.0 } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const jetUpGeo = new THREE.PlaneGeometry(150, 1200);
    const jetUp = new THREE.Mesh(jetUpGeo, jetUpMat);
    jetUp.position.y = 600;
    this.smbhGroup.add(jetUp);
    this.jetUpRef = jetUp;

    const jetDownMat = new THREE.ShaderMaterial({
      vertexShader: JET_VERT, fragmentShader: JET_FRAG,
      uniforms: { time: { value: 0 }, direction: { value: -1.0 } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const jetDownGeo = new THREE.PlaneGeometry(150, 1200);
    const jetDown = new THREE.Mesh(jetDownGeo, jetDownMat);
    jetDown.position.y = -600;
    this.smbhGroup.add(jetDown);
    this.jetDownRef = jetDown;

    this.scene.add(this.smbhGroup);
  }

  private setupPlayerRing(): void {
    this.myRing = new THREE.Mesh(
      new THREE.RingGeometry(42, 46, 64),
      new THREE.MeshBasicMaterial({
        color: 0x44ff88, transparent: true, opacity: 0,
        side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
      }),
    );
    this.myRing.rotation.x = -Math.PI / 2;
    this.myRing.visible = false;
    this.scene.add(this.myRing);
  }

  // ── Galaxy building ────────────────────────────────────────

  private buildGalaxy(): void {
    if (this.lodState === 'cluster') this.collapseCluster();
    if (this.clusterPoints) this.scene.remove(this.clusterPoints);

    this.groups = [];
    for (let i = 0; i < this.groupCount; i++) {
      this.groups.push(computeGroupPosition(GALAXY_MASTER_SEED, i));
    }

    // Generate star clouds
    const allStars: Array<{ x: number; y: number; z: number; size: number; r: number; g: number; b: number; alpha: number }> = [];
    this.starGroupIndex = [];

    for (let gi = 0; gi < this.groupCount; gi++) {
      const stars = this.generateClusterStars(this.groups[gi]);
      for (const s of stars) {
        allStars.push(s);
        this.starGroupIndex.push(gi);
      }
    }

    const totalStars = allStars.length;
    const pos = new Float32Array(totalStars * 3);
    const col = new Float32Array(totalStars * 3);
    const sz = new Float32Array(totalStars);
    const al = new Float32Array(totalStars);

    for (let i = 0; i < totalStars; i++) {
      const s = allStars[i];
      pos[i * 3] = s.x; pos[i * 3 + 1] = s.y; pos[i * 3 + 2] = s.z;
      col[i * 3] = s.r; col[i * 3 + 1] = s.g; col[i * 3 + 2] = s.b;
      sz[i] = s.size;
      al[i] = s.alpha;
    }

    this.clusterGeo = new THREE.BufferGeometry();
    this.clusterGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.clusterGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.clusterGeo.setAttribute('size', new THREE.BufferAttribute(sz, 1));
    this.clusterGeo.setAttribute('alpha', new THREE.BufferAttribute(al, 1));

    const starMat = new THREE.ShaderMaterial({
      vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG,
      vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.clusterPoints = new THREE.Points(this.clusterGeo, starMat);
    this.scene.add(this.clusterPoints);

    // Spiral traces
    const maxArmPos = Math.floor((this.groupCount - 1) / SPIRAL_ARM_COUNT);
    const maxTheta = maxArmPos * THETA_STEP + 0.5;
    this.buildSpiralTraces(maxTheta);

    // Save originals for hover
    requestAnimationFrame(() => this.saveOriginals());
  }

  private generateClusterStars(group: GalaxyGroupMeta) {
    const rng = new SeededRNG(group.groupSeed * 31337);
    const stars: Array<{ x: number; y: number; z: number; size: number; r: number; g: number; b: number; alpha: number }> = [];
    const cx = group.position.x * SCALE;
    const cy = group.position.z * SCALE;
    const cz = group.position.y * SCALE;
    const tint = ARM_TINT[group.armIndex];
    const R = CLUSTER_VIS_RADIUS;

    for (let i = 0; i < STARS_PER_CLUSTER; i++) {
      const isCore = i < CORE_STARS_PER_CLUSTER;
      const sigma = isCore ? R * 0.22 : R * 0.50;
      const sigmaY = isCore ? R * 0.12 : R * 0.22;
      const dx = rng.nextGaussian(0, sigma);
      const dy = rng.nextGaussian(0, sigmaY);
      const dz = rng.nextGaussian(0, sigma);

      const spec = pickStellarIMF(rng);
      const mr = spec.r * 0.9 + tint.r * 0.1;
      const mg = spec.g * 0.9 + tint.g * 0.1;
      const mb = spec.b * 0.9 + tint.b * 0.1;

      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const centralFade = Math.max(0.12, 1.0 - dist / (R * 0.9));
      const baseSize = spec.sz * 2.2;

      stars.push({
        x: cx + dx, y: cy + dy, z: cz + dz,
        size: baseSize * (0.5 + rng.next() * 0.8),
        r: mr, g: mg, b: mb,
        alpha: centralFade * (isCore ? 0.55 : 0.28) + rng.next() * 0.12,
      });
    }
    return stars;
  }

  private buildSpiralTraces(maxTheta: number): void {
    for (const l of this.spiralLines) this.scene.remove(l);
    this.spiralLines = [];

    for (let arm = 0; arm < SPIRAL_ARM_COUNT; arm++) {
      const pts: THREE.Vector3[] = [];
      const steps = Math.max(100, Math.floor(maxTheta / 0.04));
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * maxTheta;
        const r = SPIRAL_A * Math.exp(SPIRAL_B * t);
        const angle = t + arm * (Math.PI * 2 / SPIRAL_ARM_COUNT);
        pts.push(new THREE.Vector3(
          r * Math.cos(angle) * SCALE, 0, r * Math.sin(angle) * SCALE,
        ));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const c = ARM_TINT[arm];
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color(c.r, c.g, c.b),
        transparent: true, opacity: 0.04, depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      this.scene.add(line);
      this.spiralLines.push(line);
    }
  }

  // ── Hover / Highlight ──────────────────────────────────────

  private saveOriginals(): void {
    if (!this.clusterGeo) return;
    this.origColors = new Float32Array(this.clusterGeo.getAttribute('color').array as Float32Array);
    this.origAlphas = new Float32Array(this.clusterGeo.getAttribute('alpha').array as Float32Array);
    this.origSizes = new Float32Array(this.clusterGeo.getAttribute('size').array as Float32Array);
  }

  private resetHover(): void {
    if (!this.clusterGeo || !this.origColors || !this.origAlphas || !this.origSizes) return;
    const colA = this.clusterGeo.getAttribute('color');
    const alA = this.clusterGeo.getAttribute('alpha');
    const szA = this.clusterGeo.getAttribute('size');
    (colA.array as Float32Array).set(this.origColors);
    (alA.array as Float32Array).set(this.origAlphas);
    (szA.array as Float32Array).set(this.origSizes);
    colA.needsUpdate = true;
    alA.needsUpdate = true;
    szA.needsUpdate = true;
  }

  private highlightGroup(idx: number): void {
    if (!this.clusterGeo || !this.origColors) return;
    const colA = this.clusterGeo.getAttribute('color');
    const alA = this.clusterGeo.getAttribute('alpha');
    const szA = this.clusterGeo.getAttribute('size');
    const total = this.starGroupIndex.length;

    for (let i = 0; i < total; i++) {
      if (this.starGroupIndex[i] === idx) {
        colA.setXYZ(i,
          Math.min(1.0, this.origColors![i * 3] * 1.5),
          Math.min(1.0, this.origColors![i * 3 + 1] * 1.5),
          Math.min(1.0, this.origColors![i * 3 + 2] * 1.5),
        );
        alA.setX(i, Math.min(1.0, this.origAlphas![i] * 1.6));
        szA.setX(i, this.origSizes![i] * 1.3);
      } else {
        colA.setXYZ(i,
          this.origColors![i * 3] * 0.25,
          this.origColors![i * 3 + 1] * 0.25,
          this.origColors![i * 3 + 2] * 0.25,
        );
        alA.setX(i, this.origAlphas![i] * 0.2);
        szA.setX(i, this.origSizes![i] * 0.7);
      }
    }
    colA.needsUpdate = true;
    alA.needsUpdate = true;
    szA.needsUpdate = true;
  }

  // ── Detail cluster highlight ───────────────────────────────

  private resetDetailHighlight(): void {
    if (!this.lodCoreGeo || !this.lodDetail) return;
    const colA = this.lodCoreGeo.getAttribute('color');
    const alphaA = this.lodCoreGeo.getAttribute('alpha');
    for (let i = 0; i < this.lodDetail.coreSystems.length; i++) {
      colA.setXYZ(i, this.lodCoreOrigCol[i].r, this.lodCoreOrigCol[i].g, this.lodCoreOrigCol[i].b);
      alphaA.setX(i, this.lodDetail.coreSystems[i].depth === 0 ? 1.0 : 0.6);
    }
    colA.needsUpdate = true; alphaA.needsUpdate = true;

    if (this.lodEdgeGeo) {
      const eA = this.lodEdgeGeo.getAttribute('alpha');
      for (let i = 0; i < eA.count; i++) eA.setX(i, 0.0);
      eA.needsUpdate = true;
    }
    if (this.lodPlEdgeGeo) {
      const pA = this.lodPlEdgeGeo.getAttribute('alpha');
      for (let i = 0; i < pA.count; i++) pA.setX(i, 0.0);
      pA.needsUpdate = true;
    }
  }

  private highlightDetailPlayer(pIdx: number): void {
    if (!this.lodDetail || !this.lodCoreGeo) return;
    const p = this.lodDetail.players[pIdx];
    const reach = this.lodDetail.getReachable(p.entryStarId);
    const maxLvl = reach.byLevel.length - 1;
    const cs = this.lodDetail.coreSystems;

    const colA = this.lodCoreGeo.getAttribute('color');
    const alphaA = this.lodCoreGeo.getAttribute('alpha');
    for (let i = 0; i < cs.length; i++) {
      if (reach.visited.has(i)) {
        const lvl = reach.nodeLevel.get(i) || 0;
        const t = lvl / Math.max(1, maxLvl);
        colA.setXYZ(i, 1 - t * 0.7, 0.7 - t * 0.3, 0.23 + t * 0.77);
        alphaA.setX(i, 0.9);
      } else {
        colA.setXYZ(i, 0.08, 0.08, 0.08);
        alphaA.setX(i, 0.1);
      }
    }
    colA.needsUpdate = true; alphaA.needsUpdate = true;

    if (this.lodEdgeGeo) {
      const eColA = this.lodEdgeGeo.getAttribute('color');
      const eAlphaA = this.lodEdgeGeo.getAttribute('alpha');
      const ep = this.lodDetail.edgePairs;
      for (let i = 0; i < ep.length; i++) {
        const [a, b] = ep[i];
        if (reach.visited.has(a) && reach.visited.has(b)) {
          const lvlA = reach.nodeLevel.get(a) || 0;
          const lvlB = reach.nodeLevel.get(b) || 0;
          const t = Math.max(lvlA, lvlB) / Math.max(1, maxLvl);
          const r = 1 - t * 0.7, g = 0.7 - t * 0.3, bl = 0.23 + t * 0.77;
          eColA.setXYZ(i * 2, r, g, bl); eColA.setXYZ(i * 2 + 1, r, g, bl);
          eAlphaA.setX(i * 2, 0.4); eAlphaA.setX(i * 2 + 1, 0.4);
        } else {
          eAlphaA.setX(i * 2, 0.0); eAlphaA.setX(i * 2 + 1, 0.0);
        }
      }
      eColA.needsUpdate = true; eAlphaA.needsUpdate = true;
    }

    if (this.lodPlEdgeGeo) {
      const pAlphaA = this.lodPlEdgeGeo.getAttribute('alpha');
      const pe = this.lodDetail.playerEdges;
      for (let i = 0; i < pe.length; i++) {
        const show = pe[i].ownerIdx === pIdx;
        const a = show ? (pe[i].type === 'core' ? 0.35 : 0.2) : 0.0;
        pAlphaA.setX(i * 2, a); pAlphaA.setX(i * 2 + 1, a);
      }
      pAlphaA.needsUpdate = true;
    }
  }

  // ── LOD: Expand / Collapse Cluster ─────────────────────────

  private expandCluster(groupIndex: number): void {
    if (this.lodState === 'cluster') return;
    const group = this.groups[groupIndex];
    if (!group) return;

    this.lodState = 'cluster';
    this.lodClusterIndex = groupIndex;
    this.lodDetail = generateClusterDetail(group.groupSeed);
    this.callbacks.onLodChange('cluster');

    const worldPos = this.getGroupWorldPos(groupIndex);
    this.lodGroup = new THREE.Group();
    this.lodGroup.position.copy(worldPos);
    const S = CLUSTER_DETAIL_SCALE;

    // Core systems (500)
    const cs = this.lodDetail.coreSystems;
    const corePos = new Float32Array(cs.length * 3);
    const coreCol = new Float32Array(cs.length * 3);
    const coreSz = new Float32Array(cs.length);
    const coreAl = new Float32Array(cs.length);
    this.lodCoreOrigCol = [];

    for (let i = 0; i < cs.length; i++) {
      const sys = cs[i];
      corePos[i * 3] = sys.x * S;
      corePos[i * 3 + 1] = sys.z * S;
      corePos[i * 3 + 2] = sys.y * S;
      const c = new THREE.Color(sys.spec.color);
      coreCol[i * 3] = c.r; coreCol[i * 3 + 1] = c.g; coreCol[i * 3 + 2] = c.b;
      this.lodCoreOrigCol.push({ r: c.r, g: c.g, b: c.b });
      coreSz[i] = Math.max(2.5, Math.min(12, 3 + Math.log2(1 + sys.spec.lum) * 1.2));
      coreAl[i] = sys.depth === 0 ? 1.0 : 0.6;
    }
    this.lodCoreGeo = new THREE.BufferGeometry();
    this.lodCoreGeo.setAttribute('position', new THREE.BufferAttribute(corePos, 3));
    this.lodCoreGeo.setAttribute('color', new THREE.BufferAttribute(coreCol, 3));
    this.lodCoreGeo.setAttribute('size', new THREE.BufferAttribute(coreSz, 1));
    this.lodCoreGeo.setAttribute('alpha', new THREE.BufferAttribute(coreAl, 1));
    const coreMat = new THREE.ShaderMaterial({
      vertexShader: DETAIL_STAR_VERT, fragmentShader: DETAIL_STAR_FRAG,
      vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.lodGroup.add(new THREE.Points(this.lodCoreGeo, coreMat));

    // Player systems (50 * 19 = 950)
    this.lodDetailAllSystems = [];
    const ps = this.lodDetail.players;
    for (const p of ps) {
      this.lodDetailAllSystems.push({ x: p.homePos.x, y: p.homePos.y, z: p.homePos.z, color: p.spec.color, lum: p.spec.lum, type: 'home', playerIdx: p.index });
      for (const r of p.ring1) this.lodDetailAllSystems.push({ x: r.x, y: r.y, z: r.z, color: r.color, lum: r.lum, type: 'ring1', playerIdx: p.index });
      for (const r of p.ring2) this.lodDetailAllSystems.push({ x: r.x, y: r.y, z: r.z, color: r.color, lum: r.lum, type: 'ring2', playerIdx: p.index });
    }
    const pPos = new Float32Array(this.lodDetailAllSystems.length * 3);
    const pCol = new Float32Array(this.lodDetailAllSystems.length * 3);
    const pSz = new Float32Array(this.lodDetailAllSystems.length);
    const pAl = new Float32Array(this.lodDetailAllSystems.length);
    for (let i = 0; i < this.lodDetailAllSystems.length; i++) {
      const sys = this.lodDetailAllSystems[i];
      pPos[i * 3] = sys.x * S;
      pPos[i * 3 + 1] = sys.z * S;
      pPos[i * 3 + 2] = sys.y * S;
      const c = new THREE.Color(sys.color);
      pCol[i * 3] = c.r; pCol[i * 3 + 1] = c.g; pCol[i * 3 + 2] = c.b;
      if (sys.type === 'home') { pSz[i] = Math.max(6, Math.min(20, 6 + Math.log2(1 + sys.lum) * 2.5)); pAl[i] = 1.0; }
      else if (sys.type === 'ring1') { pSz[i] = Math.max(3, Math.min(10, 3 + Math.log2(1 + sys.lum) * 1.2)); pAl[i] = 0.75; }
      else { pSz[i] = Math.max(2.5, Math.min(8, 2.5 + Math.log2(1 + sys.lum) * 0.9)); pAl[i] = 0.55; }
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    pGeo.setAttribute('size', new THREE.BufferAttribute(pSz, 1));
    pGeo.setAttribute('alpha', new THREE.BufferAttribute(pAl, 1));
    const pMat = new THREE.ShaderMaterial({
      vertexShader: DETAIL_STAR_VERT, fragmentShader: DETAIL_STAR_FRAG,
      vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.lodDetailPoints = new THREE.Points(pGeo, pMat);
    this.lodGroup.add(this.lodDetailPoints);

    // Core edges
    const ep = this.lodDetail.edgePairs;
    const edgePos = new Float32Array(ep.length * 6);
    const edgeCol = new Float32Array(ep.length * 6);
    const edgeAlpha = new Float32Array(ep.length * 2);
    for (let i = 0; i < ep.length; i++) {
      const [a, b] = ep[i];
      const sa = cs[a], sb = cs[b];
      edgePos[i * 6] = sa.x * S; edgePos[i * 6 + 1] = sa.z * S; edgePos[i * 6 + 2] = sa.y * S;
      edgePos[i * 6 + 3] = sb.x * S; edgePos[i * 6 + 4] = sb.z * S; edgePos[i * 6 + 5] = sb.y * S;
      for (let c = 0; c < 6; c++) edgeCol[i * 6 + c] = 0.15;
      edgeAlpha[i * 2] = 0.0; edgeAlpha[i * 2 + 1] = 0.0;
    }
    this.lodEdgeGeo = new THREE.BufferGeometry();
    this.lodEdgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePos, 3));
    this.lodEdgeGeo.setAttribute('color', new THREE.BufferAttribute(edgeCol, 3));
    this.lodEdgeGeo.setAttribute('alpha', new THREE.BufferAttribute(edgeAlpha, 1));
    const edgeMat = new THREE.ShaderMaterial({
      vertexShader: DETAIL_EDGE_VERT, fragmentShader: DETAIL_EDGE_FRAG,
      vertexColors: true, transparent: true, depthWrite: false,
    });
    this.lodGroup.add(new THREE.LineSegments(this.lodEdgeGeo, edgeMat));

    // Player edges
    const pe = this.lodDetail.playerEdges;
    const plEdgePos = new Float32Array(pe.length * 6);
    const plEdgeCol = new Float32Array(pe.length * 6);
    const plEdgeAlpha = new Float32Array(pe.length * 2);
    for (let i = 0; i < pe.length; i++) {
      const e = pe[i];
      plEdgePos[i * 6] = e.ax * S; plEdgePos[i * 6 + 1] = e.az * S; plEdgePos[i * 6 + 2] = e.ay * S;
      plEdgePos[i * 6 + 3] = e.bx * S; plEdgePos[i * 6 + 4] = e.bz * S; plEdgePos[i * 6 + 5] = e.by * S;
      if (e.type === 'core') {
        plEdgeCol[i * 6] = 0.8; plEdgeCol[i * 6 + 1] = 0.5; plEdgeCol[i * 6 + 2] = 0.2;
        plEdgeCol[i * 6 + 3] = 0.8; plEdgeCol[i * 6 + 4] = 0.5; plEdgeCol[i * 6 + 5] = 0.2;
      } else {
        plEdgeCol[i * 6] = 0.25; plEdgeCol[i * 6 + 1] = 0.45; plEdgeCol[i * 6 + 2] = 0.65;
        plEdgeCol[i * 6 + 3] = 0.25; plEdgeCol[i * 6 + 4] = 0.45; plEdgeCol[i * 6 + 5] = 0.65;
      }
      plEdgeAlpha[i * 2] = 0.0; plEdgeAlpha[i * 2 + 1] = 0.0;
    }
    this.lodPlEdgeGeo = new THREE.BufferGeometry();
    this.lodPlEdgeGeo.setAttribute('position', new THREE.BufferAttribute(plEdgePos, 3));
    this.lodPlEdgeGeo.setAttribute('color', new THREE.BufferAttribute(plEdgeCol, 3));
    this.lodPlEdgeGeo.setAttribute('alpha', new THREE.BufferAttribute(plEdgeAlpha, 1));
    const plEdgeMat = new THREE.ShaderMaterial({
      vertexShader: DETAIL_EDGE_VERT, fragmentShader: DETAIL_EDGE_FRAG,
      vertexColors: true, transparent: true, depthWrite: false,
    });
    this.lodGroup.add(new THREE.LineSegments(this.lodPlEdgeGeo, plEdgeMat));

    // Mini black hole at cluster center
    const miniEh = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000 }),
    );
    this.lodGroup.add(miniEh);
    const miniGlow = new THREE.Mesh(
      new THREE.SphereGeometry(3, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xff6633, transparent: true, opacity: 0.06,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    this.lodGroup.add(miniGlow);

    this.scene.add(this.lodGroup);

    // Clear galaxy-level hover
    this.resetHover();
    this.hoveredGroup = -1;

    // Fade out compact cloud stars for this cluster
    if (this.clusterGeo && this.origAlphas) {
      const alA = this.clusterGeo.getAttribute('alpha');
      const szA = this.clusterGeo.getAttribute('size');
      for (let i = 0; i < this.starGroupIndex.length; i++) {
        if (this.starGroupIndex[i] === groupIndex) {
          alA.setX(i, 0.0);
          szA.setX(i, 0.0);
        }
      }
      alA.needsUpdate = true;
      szA.needsUpdate = true;
    }
  }

  private collapseCluster(): void {
    if (this.lodState !== 'cluster') return;

    if (this.lodGroup) {
      this.scene.remove(this.lodGroup);
      this.lodGroup.traverse(obj => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
          else m.material.dispose();
        }
      });
    }

    // Restore compact cloud stars
    if (this.clusterGeo && this.origAlphas) {
      const alA = this.clusterGeo.getAttribute('alpha');
      const szA = this.clusterGeo.getAttribute('size');
      for (let i = 0; i < this.starGroupIndex.length; i++) {
        if (this.starGroupIndex[i] === this.lodClusterIndex) {
          alA.setX(i, this.origAlphas[i]);
          szA.setX(i, this.origSizes![i]);
        }
      }
      alA.needsUpdate = true;
      szA.needsUpdate = true;
    }

    this.lodState = 'galaxy';
    this.lodClusterIndex = -1;
    this.lodDetail = null;
    this.lodGroup = null;
    this.lodDetailPoints = null;
    this.lodDetailAllSystems = [];
    this.lodCoreGeo = null;
    this.lodCoreOrigCol = [];
    this.lodEdgeGeo = null;
    this.lodPlEdgeGeo = null;
    this.lodHoveredPlayer = -1;
    this.resetHover();
    this.callbacks.onLodChange('galaxy');
  }

  // ── Helpers ────────────────────────────────────────────────

  private getGroupWorldPos(idx: number): THREE.Vector3 {
    if (idx < 0 || idx >= this.groups.length) return new THREE.Vector3();
    const g = this.groups[idx];
    return new THREE.Vector3(g.position.x * SCALE, g.position.z * SCALE, g.position.y * SCALE);
  }

  /** Write group world position into existing vector (zero-alloc for hot loops) */
  private getGroupWorldPosInto(idx: number, out: THREE.Vector3): void {
    if (idx < 0 || idx >= this.groups.length) { out.set(0, 0, 0); return; }
    const g = this.groups[idx];
    out.set(g.position.x * SCALE, g.position.z * SCALE, g.position.y * SCALE);
  }

  // ── Event listeners ────────────────────────────────────────

  private setupEventListeners(): void {
    const el = this.renderer.domElement;

    // Wheel zoom
    this.boundOnWheel = (e: WheelEvent) => this.onWheel(e);
    el.addEventListener('wheel', this.boundOnWheel, { passive: true });

    // Mouse move (hover + raycasting)
    this.boundOnMouseMove = (e: MouseEvent) => this.onMouseMove(e);
    window.addEventListener('mousemove', this.boundOnMouseMove);

    // Click detection
    this.boundOnPointerDown = (e: PointerEvent) => { this.clickStartPos = { x: e.clientX, y: e.clientY }; };
    this.boundOnPointerUp = (e: PointerEvent) => this.onPointerUp(e);
    el.addEventListener('pointerdown', this.boundOnPointerDown);
    el.addEventListener('pointerup', this.boundOnPointerUp);

    // Resize
    this.boundOnResize = () => this.onResize();
    window.addEventListener('resize', this.boundOnResize);

    // Keyboard (ESC)
    this.boundOnKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);
    window.addEventListener('keydown', this.boundOnKeyDown);

    // Mobile touch zoom
    this.boundOnTouchMove = (e: TouchEvent) => this.onTouchMove(e);
    this.boundOnTouchEnd = () => { this.touchZoomLockedTarget = null; };
    el.addEventListener('touchmove', this.boundOnTouchMove, { passive: true });
    el.addEventListener('touchend', this.boundOnTouchEnd, { passive: true });
  }

  private removeEventListeners(): void {
    const el = this.renderer.domElement;
    if (this.boundOnWheel) el.removeEventListener('wheel', this.boundOnWheel);
    if (this.boundOnMouseMove) window.removeEventListener('mousemove', this.boundOnMouseMove);
    if (this.boundOnPointerDown) el.removeEventListener('pointerdown', this.boundOnPointerDown);
    if (this.boundOnPointerUp) el.removeEventListener('pointerup', this.boundOnPointerUp);
    if (this.boundOnResize) window.removeEventListener('resize', this.boundOnResize);
    if (this.boundOnKeyDown) window.removeEventListener('keydown', this.boundOnKeyDown);
    if (this.boundOnTouchMove) el.removeEventListener('touchmove', this.boundOnTouchMove);
    if (this.boundOnTouchEnd) el.removeEventListener('touchend', this.boundOnTouchEnd);
  }

  private onWheel(e: WheelEvent): void {
    // Cluster level: zoom only toward player's home star
    if (this.lodState === 'cluster' && this.lodDetail && e.deltaY < 0) {
      const p = this.lodDetail.players[this.myPlayerInCluster];
      if (p) {
        const worldPos = this.lodGroup ? this.lodGroup.position.clone() : new THREE.Vector3();
        const S = CLUSTER_DETAIL_SCALE;
        const homeWorldPos = new THREE.Vector3(
          p.homePos.x * S + worldPos.x,
          p.homePos.z * S + worldPos.y,
          p.homePos.y * S + worldPos.z,
        );
        this.controls.target.lerp(homeWorldPos, 0.08);
        if (this.zoomIdleTimer) clearTimeout(this.zoomIdleTimer);
        this.zoomIdleTimer = setTimeout(() => { this.zoomLockedTarget = null; }, 200);
        return;
      }
    }

    // Lock target on first wheel event of gesture
    if (!this.zoomLockedTarget) {
      const zoomMouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1,
      );
      const zoomRaycaster = new THREE.Raycaster();
      zoomRaycaster.setFromCamera(zoomMouse, this.camera);
      const zoomCamDir = new THREE.Vector3();
      this.camera.getWorldDirection(zoomCamDir);
      const zoomPlane = new THREE.Plane();
      zoomPlane.setFromNormalAndCoplanarPoint(zoomCamDir, this.controls.target);
      const zoomHitPoint = new THREE.Vector3();
      if (zoomRaycaster.ray.intersectPlane(zoomPlane, zoomHitPoint)) {
        if (this.lodState === 'galaxy' && this.groups.length > 0) {
          let bestIdx = -1, bestDist = Infinity;
          for (let gi = 0; gi < this.groups.length; gi++) {
            const wp = this.getGroupWorldPos(gi);
            const d = zoomHitPoint.distanceTo(wp);
            if (d < bestDist) { bestDist = d; bestIdx = gi; }
          }
          if (bestIdx >= 0) {
            this.zoomLockedTarget = this.getGroupWorldPos(bestIdx);
          } else {
            this.zoomLockedTarget = zoomHitPoint.clone();
          }
        } else {
          this.zoomLockedTarget = zoomHitPoint.clone();
        }
      }
    }

    if (this.zoomLockedTarget) {
      const zoomIn = e.deltaY < 0;
      const shift = zoomIn ? 0.08 : 0.03;
      this.controls.target.lerp(this.zoomLockedTarget, shift);
    }

    if (this.zoomIdleTimer) clearTimeout(this.zoomIdleTimer);
    this.zoomIdleTimer = setTimeout(() => { this.zoomLockedTarget = null; }, 200);
  }

  private onTouchMove(e: TouchEvent): void {
    if (e.touches.length !== 2) { this.touchZoomLockedTarget = null; return; }
    const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

    if (!this.touchZoomLockedTarget) {
      const zoomMouse = new THREE.Vector2(
        (midX / window.innerWidth) * 2 - 1,
        -(midY / window.innerHeight) * 2 + 1,
      );
      const zoomRaycaster = new THREE.Raycaster();
      zoomRaycaster.setFromCamera(zoomMouse, this.camera);
      const zoomCamDir = new THREE.Vector3();
      this.camera.getWorldDirection(zoomCamDir);
      const zoomPlane = new THREE.Plane();
      zoomPlane.setFromNormalAndCoplanarPoint(zoomCamDir, this.controls.target);
      const hit = new THREE.Vector3();
      if (zoomRaycaster.ray.intersectPlane(zoomPlane, hit)) {
        this.touchZoomLockedTarget = hit;
      }
    }
    if (this.touchZoomLockedTarget) {
      this.controls.target.lerp(this.touchZoomLockedTarget, 0.04);
    }
  }

  private onMouseMove(e: MouseEvent): void {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.lodState === 'cluster' && this.lodDetailPoints) {
      this.raycaster.params.Points.threshold = 3;
      const intersects = this.raycaster.intersectObject(this.lodDetailPoints);
      let newHovered = -1;
      if (intersects.length > 0 && intersects[0].index != null) {
        const sys = this.lodDetailAllSystems[intersects[0].index];
        if (sys && sys.type === 'home') newHovered = sys.playerIdx;
      }
      if (newHovered !== this.lodHoveredPlayer) {
        this.lodHoveredPlayer = newHovered;
        if (this.lodHoveredPlayer >= 0) {
          this.highlightDetailPlayer(this.lodHoveredPlayer);
          this.controls.autoRotate = false;
        } else {
          this.resetDetailHighlight();
          this.controls.autoRotate = this.autoRotateEnabled;
        }
      }
      this.raycaster.params.Points.threshold = 30;
      return;
    }

    // Galaxy mode
    if (!this.clusterPoints) return;
    this.raycaster.params.Points.threshold = 30;
    const intersects = this.raycaster.intersectObject(this.clusterPoints);
    let newHovered = -1;
    if (intersects.length > 0 && intersects[0].index != null) {
      const si = intersects[0].index;
      if (si < this.starGroupIndex.length) newHovered = this.starGroupIndex[si];
    }

    if (newHovered !== this.hoveredGroup) {
      this.hoveredGroup = newHovered;
      if (this.hoveredGroup >= 0) {
        this.highlightGroup(this.hoveredGroup);
        this.controls.autoRotate = false;
      } else {
        this.resetHover();
        this.controls.autoRotate = this.autoRotateEnabled;
      }
    }
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.clickStartPos) return;
    const dx = e.clientX - this.clickStartPos.x;
    const dy = e.clientY - this.clickStartPos.y;
    if (dx * dx + dy * dy > 25) { this.clickStartPos = null; return; }
    this.clickStartPos = null;

    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.lodState === 'cluster' && this.lodDetailPoints) {
      // Click on player home star → callback to enter game
      this.raycaster.params.Points.threshold = 3;
      const intersects = this.raycaster.intersectObject(this.lodDetailPoints);
      if (intersects.length > 0 && intersects[0].index != null) {
        const sys = this.lodDetailAllSystems[intersects[0].index];
        if (sys && sys.type === 'home' && this.lodDetail) {
          const player = this.lodDetail.players[sys.playerIdx];
          // Only allow entering own galaxy for now
          const isMine = this.lodClusterIndex === this.myGroupIndex && sys.playerIdx === this.myPlayerInCluster;
          if (isMine) {
            this.callbacks.onEnterPlayerGalaxy(player.playerSeed, this.lodClusterIndex);
          }
        }
      }
      this.raycaster.params.Points.threshold = 30;
      return;
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      if (this.lodState === 'cluster') {
        this.collapseCluster();
      }
    }
  }

  private onResize(): void {
    const W = this.container.clientWidth || window.innerWidth;
    const H = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = W / H;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(W, H);
  }

  // ── Animation loop ─────────────────────────────────────────

  private animate = (): void => {
    if (!this.visible) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    // Frame throttle — skip render if too soon (saves GPU on idle 3D view)
    const now = performance.now();
    if (now - this.lastFrameTime < this.frameInterval) return;
    this.lastFrameTime = now;

    const t = now * 0.001;

    // Fly-to animation
    if (this.flyAnimation) {
      const elapsed = performance.now() - this.flyAnimation.startTime;
      const p = Math.min(1, elapsed / this.flyAnimation.duration);
      const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      this.camera.position.lerpVectors(this.flyAnimation.from.pos, this.flyAnimation.to.pos, ease);
      this.controls.target.lerpVectors(this.flyAnimation.from.target, this.flyAnimation.to.target, ease);

      if (p >= 1) {
        this.flyAnimation = null;
        if (this.flyTarget === 'cluster' && this.groups.length > this.myGroupIndex) {
          const gp = this.getGroupWorldPos(this.myGroupIndex);
          this.myRing.position.set(gp.x, gp.y, gp.z);
          this.myRing.visible = true;
          this.highlightGroup(this.myGroupIndex);
        }
        this.flyTarget = null;
      }
    }

    // Player ring pulse
    if (this.myRing.visible) {
      (this.myRing.material as THREE.MeshBasicMaterial).opacity = 0.15 + 0.1 * Math.sin(t * 2.5);
      this.camera.getWorldPosition(_tmpVec3A);
      this.myRing.lookAt(_tmpVec3A);
    }

    // LOD distance check (skip during fly animation)
    // Uses _tmpVec3B to avoid per-frame Vector3 allocations in the hot loop
    if (!this.flyAnimation) {
      if (this.lodState === 'galaxy') {
        let closestIdx = -1, closestDist = Infinity;
        for (let gi = 0; gi < this.groups.length; gi++) {
          this.getGroupWorldPosInto(gi, _tmpVec3B);
          const d = this.controls.target.distanceTo(_tmpVec3B);
          if (d < closestDist) { closestDist = d; closestIdx = gi; }
        }
        if (closestIdx >= 0) {
          this.getGroupWorldPosInto(closestIdx, _tmpVec3B);
          const camDist = this.camera.position.distanceTo(_tmpVec3B);
          if (camDist < LOD_EXPAND_DIST) {
            this.expandCluster(closestIdx);
          }
        }
      } else if (this.lodState === 'cluster' && this.lodClusterIndex >= 0) {
        this.getGroupWorldPosInto(this.lodClusterIndex, _tmpVec3B);
        const d = this.camera.position.distanceTo(_tmpVec3B);
        if (d > LOD_COLLAPSE_DIST) {
          this.collapseCluster();
        }
      }
    }

    // Black hole accretion disk rotation
    for (let i = 1; i <= 6; i++) {
      if (this.smbhGroup.children[i]) {
        this.smbhGroup.children[i].rotation.z = t * (0.15 + i * 0.03);
      }
    }

    // Jets billboard — reuse single camera position lookup for both jets
    if (this.jetUpRef || this.jetDownRef) {
      this.camera.getWorldPosition(_tmpVec3A);
      const jetAngle = Math.atan2(_tmpVec3A.x, _tmpVec3A.z);
      if (this.jetUpRef) {
        (this.jetUpRef.material as THREE.ShaderMaterial).uniforms.time.value = t;
        this.jetUpRef.rotation.set(0, jetAngle, 0);
      }
      if (this.jetDownRef) {
        (this.jetDownRef.material as THREE.ShaderMaterial).uniforms.time.value = t;
        this.jetDownRef.rotation.set(0, jetAngle, 0);
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}
