// SurfaceBabylonView — Babylon.js 2.5D isometric surface scene
// Replaces Three.js SurfaceShaderView with:
//   • ArcRotateCamera (orthographic, isometric ~47° angle)
//   • Procedural terrain via ShaderMaterial (same GLSL fragment shader)
//   • Real 3D GLB buildings with PBR materials + shadows
//   • DynamicTexture zone overlay for buildable cell highlighting
//   • Zoom (scroll) + pan (drag) + touch pinch-zoom
//   • Babylon.js viewport minimap (top-down, same scene)

import React, {
  useEffect, useRef, useState, useCallback, useMemo,
  forwardRef, useImperativeHandle,
} from 'react';
import {
  Engine, Scene, ArcRotateCamera, Camera,
  HemisphericLight, DirectionalLight, ShadowGenerator,
  DefaultRenderingPipeline,
  Vector3, Vector2, Color3, Color4,
  MeshBuilder, Mesh, ShaderMaterial, DynamicTexture, StandardMaterial,
  Viewport,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import type { Planet, Star, PlacedBuilding, BuildingType, TerrainType } from '@nebulife/core';
import { BUILDING_DEFS } from '@nebulife/core';
import { derivePlanetVisuals } from '../../game/rendering/PlanetVisuals.js';
import { BuildingGLBLoader, PlacedGLBInstance, getLODLevel, type LODLevel } from '../../game/rendering/BuildingGLBLoader.js';
import { SurfacePanel } from './SurfacePanel.js';
import { getBuildings, placeBuilding } from '../../api/surface-api.js';

import babylonVertSrc from '../../shaders/surface/surface-babylon.vert.glsl?raw';
import surfaceFragSrc from '../../shaders/surface/surface-terrain.frag.glsl?raw';

// ─── Public API ────────────────────────────────────────────────────────────

export type SurfacePhase = 'ready' | 'error';

export interface SurfaceViewHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  startAIGeneration: () => void;
  toggleBuildPanel: () => void;
  toggleMinimap: () => void;
}

interface SurfaceBabylonViewProps {
  planet: Planet;
  star: Star;
  playerId: string;
  onClose: () => void;
  onBuildingCountChange?: (count: number) => void;
  onBuildingPlaced?: () => void;
  onPhaseChange?: (phase: SurfacePhase) => void;
  onBuildPanelChange?: (open: boolean) => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function computeMapDimensions(radiusEarth: number) {
  const scale = Math.max(0.5, Math.min(3.0, Math.log2(radiusEarth + 1) / Math.log2(2)));
  return {
    gridW: Math.round(64 * scale),
    gridH: Math.round(36 * scale),
  };
}

function getCellElevation(x: number, y: number, seed: number): number {
  const h1 = Math.sin(x * 127.1 + y * 311.7 + seed * 0.1) * 43758.5453;
  const h2 = Math.sin(x * 269.5 + y * 183.3 + seed * 0.2) * 21345.6789;
  return (h1 - Math.floor(h1)) * 0.7 + (h2 - Math.floor(h2)) * 0.3;
}

function classifyCellTerrain(
  x: number, y: number, seed: number, waterLevel: number,
): TerrainType {
  const elev = getCellElevation(x, y, seed);
  const waterThresh = waterLevel * 0.65 + 0.1;
  if (elev < waterThresh - 0.15) return 'deep_ocean';
  if (elev < waterThresh - 0.04) return 'ocean';
  if (elev < waterThresh) return 'coast';
  if (elev < waterThresh + 0.04) return 'beach';
  if (elev < waterThresh + 0.15) return 'lowland';
  if (elev < waterThresh + 0.30) return 'plains';
  if (elev < waterThresh + 0.45) return 'hills';
  if (elev < waterThresh + 0.55) return 'mountains';
  return 'peaks';
}

function isCellBuildableFor(
  x: number, y: number, seed: number, waterLevel: number,
  buildingType: BuildingType,
): boolean {
  const terrain = classifyCellTerrain(x, y, seed, waterLevel);
  return BUILDING_DEFS[buildingType].requiresTerrain.includes(terrain);
}

// ── Terrain elevation helpers (JS mirror of vertex shader FBM) ──────────────

const TERRAIN_HEIGHT_SCALE = 0.018; // must match terrainMat.setFloat('uHeightScale', ...)

function _hash2JS(x: number, y: number): number {
  let px = (x * 443.897) % 1;
  let py = (y * 397.297) % 1;
  if (px < 0) px += 1;
  if (py < 0) py += 1;
  const dot = px * py + px * 0.0001 + py * 0.0001; // approx dot(p, p.yx + 19.19)
  px += dot; py += dot;
  return Math.abs((px + py) * px) % 1;
}

function _noise2JS(px: number, py: number): number {
  const ix = Math.floor(px), iy = Math.floor(py);
  let fx = px - ix, fy = py - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = _hash2JS(ix,     iy);
  const b = _hash2JS(ix + 1, iy);
  const c = _hash2JS(ix,     iy + 1);
  const d = _hash2JS(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

function _fbm2JS(px: number, py: number): number {
  let v = 0, a = 0.5;
  for (let i = 0; i < 5; i++) {
    v += a * _noise2JS(px, py);
    px *= 2; py *= 2; a *= 0.5;
  }
  return v;
}

function getTerrainElevationJS(u: number, v: number, seed: number): number {
  const s1 = Math.abs(Math.sin(seed * 0.00001)         * 43758.5453) % 1;
  const s2 = Math.abs(Math.sin(seed * 0.000013 + 7.31) * 24681.1357) % 1;
  const sx = s1 * 50, sy = s2 * 50;
  const wx = (u - 0.5) + sx, wz = (v - 0.5) + sy;
  const elev      = _fbm2JS(wx * 3.0 + sx, wz * 3.0 + sy);
  const continents = _fbm2JS(wx * 0.8 + sx * 3, wz * 0.8 + sy * 3);
  return elev * 0.6 + continents * 0.4;
}

/** Grid cell (gx, gz) → world position with terrain height (terrain is 1×1 in XZ, center at origin) */
function gridToWorld(
  gx: number, gz: number,
  gridW: number, gridH: number,
  seed?: number,
): Vector3 {
  const u = (gx + 0.5) / gridW;
  const v = (gz + 0.5) / gridH;
  const y = seed !== undefined
    ? getTerrainElevationJS(u, v, seed) * TERRAIN_HEIGHT_SCALE
    : 0;
  return new Vector3(u - 0.5, y, v - 0.5);
}

/** Minimum cell size for building scaling */
function cellSize(gridW: number, gridH: number): number {
  return Math.min(1 / gridW, 1 / gridH);
}

/**
 * Monolith Rule: returns true if (gx, gz) is directly adjacent (4-dir) to any placed building.
 * Used to enforce that new buildings must connect to the existing colony.
 */
function isAdjacentToCity(gx: number, gz: number, buildings: PlacedBuilding[]): boolean {
  return buildings.some(
    (b) =>
      (Math.abs(b.x - gx) === 1 && b.y === gz) ||
      (b.x === gx && Math.abs(b.y - gz) === 1),
  );
}

/**
 * Canonical key for a corridor between two adjacent grid cells.
 * Sorted so (A→B) and (B→A) produce the same key → no duplicate corridors.
 */
function corridorKey(gx1: number, gz1: number, gx2: number, gz2: number): string {
  if (gx1 > gx2 || (gx1 === gx2 && gz1 > gz2))
    return `${gx2}_${gz2}_${gx1}_${gz1}`;
  return `${gx1}_${gz1}_${gx2}_${gz2}`;
}

/**
 * Smart Corridor: procedural flat-slab mesh connecting two adjacent buildings.
 * Horizontal span (gz1===gz2) → oriented along X; vertical span → along Z.
 */
function createCorridor(
  gx1: number, gz1: number,
  gx2: number, gz2: number,
  gridW: number, gridH: number,
  seed: number, cs: number, scene: Scene,
): Mesh {
  const p1 = gridToWorld(gx1, gz1, gridW, gridH, seed);
  const p2 = gridToWorld(gx2, gz2, gridW, gridH, seed);
  const mid = Vector3.Lerp(p1, p2, 0.5);
  const isHoriz = gz1 === gz2; // same row → corridor spans X axis

  const key = corridorKey(gx1, gz1, gx2, gz2);
  const box = MeshBuilder.CreateBox(`cor_${key}`, {
    width:  isHoriz ? cs * 0.9 : cs * 0.28,  // long dim spans the cell, short = 28%
    height: cs * 0.05,                         // thin flat slab
    depth:  isHoriz ? cs * 0.28 : cs * 0.9,
  }, scene);

  box.position.copyFrom(mid);
  box.position.y = Math.max(p1.y, p2.y) + cs * 0.04; // rest on terrain
  box.isPickable = false;

  const mat = new StandardMaterial(`corMat_${key}`, scene);
  mat.diffuseColor  = new Color3(0.22, 0.38, 0.50);  // steel-blue
  mat.specularColor = new Color3(0.25, 0.25, 0.25);
  box.material = mat;
  return box;
}

/**
 * Contact shadow disc — a soft dark oval placed below each building.
 * Visually "grounds" the GLB model by simulating ambient occlusion contact shadow.
 * Sun direction: DirectionalLight(-1,-2,-0.8) → XZ projection normalized ≈ (-0.78,-0.62)
 * Shadow falls in opposite direction → offset (+0.78, +0.62) * cs * 0.65
 */
function createContactShadowDisc(id: string, pos: Vector3, cs: number, scene: Scene): Mesh {
  const disc = MeshBuilder.CreateDisc(
    `csd_${id}`,
    { radius: cs * 1.05, tessellation: 32 },
    scene,
  );
  // Rotate flat onto the XZ plane (CreateDisc is in XY by default)
  disc.rotation.x = Math.PI / 2;
  disc.position.x  = pos.x + 0.78 * cs * 0.65;
  disc.position.y  = pos.y + 0.004; // slightly above terrain to avoid z-fighting
  disc.position.z  = pos.z + 0.62 * cs * 0.65;
  disc.isPickable  = false;
  disc.receiveShadows = false;

  const mat = new StandardMaterial(`csdMat_${id}`, scene);
  mat.diffuseColor   = new Color3(0, 0, 0);
  mat.alpha          = 0.38;
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  disc.material = mat;
  return disc;
}

function numToColor3(c: number): Color3 {
  return new Color3(
    ((c >> 16) & 0xff) / 255,
    ((c >> 8) & 0xff) / 255,
    (c & 0xff) / 255,
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

export const SurfaceBabylonView = forwardRef<SurfaceViewHandle, SurfaceBabylonViewProps>(
  function SurfaceBabylonView(
    {
      planet, star, playerId, onClose,
      onBuildingCountChange, onBuildingPlaced, onPhaseChange, onBuildPanelChange,
    },
    ref,
  ) {
    // ── State ──────────────────────────────────────────────────────────────

    const [phase] = useState<SurfacePhase>('ready');
    const [buildings, setBuildings] = useState<PlacedBuilding[]>([]);
    const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
    const [showBuildPanel, setShowBuildPanel] = useState(true);
    const [showMinimap, setShowMinimap] = useState(true);
    // Increments when GLB preload completes → triggers building sync effect to re-run
    const [glbVersion, setGlbVersion] = useState(0);

    // ── Refs ───────────────────────────────────────────────────────────────

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<Engine | null>(null);
    const sceneRef = useRef<Scene | null>(null);
    const cameraRef = useRef<ArcRotateCamera | null>(null);
    const terrainMatRef = useRef<ShaderMaterial | null>(null);
    const shadowGenRef = useRef<ShadowGenerator | null>(null);
    const glbLoaderRef = useRef<BuildingGLBLoader | null>(null);
    const zoneTexRef = useRef<DynamicTexture | null>(null);
    const glbInstancesRef = useRef<Map<string, PlacedGLBInstance>>(new Map());
    const placeholderMeshesRef = useRef<Map<string, Mesh>>(new Map());
    const shadowDiscsRef = useRef<Map<string, Mesh>>(new Map());
    const corridorMeshesRef = useRef<Map<string, Mesh>>(new Map()); // Smart Corridors

    // Navigation
    const orthoSizeRef = useRef(0.55);                                         // controls zoom level
    const currentLODRef = useRef<LODLevel>(getLODLevel(0.55));                 // last applied LOD level
    const panTargetRef = useRef({ x: 0, z: 0 }); // camera look-at point in XZ
    const dragRef = useRef({ active: false, startX: 0, startY: 0 });
    const pinchRef = useRef({ active: false, dist: 0 });
    const animTimeRef = useRef(0);

    // ── Grid dimensions ────────────────────────────────────────────────────

    const { gridW, gridH } = useMemo(
      () => computeMapDimensions(planet.radiusEarth),
      [planet.radiusEarth],
    );

    // ── Planet visuals → shader uniforms ──────────────────────────────────

    const visuals = derivePlanetVisuals(planet, star);

    const lifeLevel = (() => {
      if (!planet.hasLife) return 0;
      switch (planet.lifeComplexity) {
        case 'microbial': return 1;
        case 'multicellular': return 2;
        case 'intelligent': return 4;
        default: return 0;
      }
    })();

    const waterCoverage = planet.hydrosphere?.waterCoverageFraction ?? 0;
    const iceCap = planet.hydrosphere?.iceCapFraction ?? 0;
    const hasLava = visuals.hasLavaFlows ? 1.0 : 0.0;
    const crust = planet.resources?.crustComposition ?? {};
    const feAbund = Math.min((crust['Fe'] ?? 0) / 15, 1);
    const siAbund = Math.min((crust['Si'] ?? 0) / 30, 1);
    const cAbund  = Math.min((crust['C']  ?? 0) / 10, 1);
    const sAbund  = Math.min((crust['S']  ?? 0) / 5, 1);

    // ── Notify parent ──────────────────────────────────────────────────────

    useEffect(() => { onBuildingCountChange?.(buildings.length); }, [buildings.length, onBuildingCountChange]);
    useEffect(() => { onPhaseChange?.(phase); }, [phase, onPhaseChange]);
    useEffect(() => { onBuildPanelChange?.(showBuildPanel); }, [showBuildPanel, onBuildPanelChange]);

    // ── Load buildings from server ─────────────────────────────────────────

    useEffect(() => {
      getBuildings(playerId, planet.id)
        .then((b) => setBuildings(b))
        .catch((err) => console.error('Failed to load buildings:', err));
    }, [playerId, planet.id]);

    // ── Camera helpers ─────────────────────────────────────────────────────

    const applyOrtho = useCallback((size: number, canvas: HTMLCanvasElement) => {
      const cam = cameraRef.current;
      if (!cam) return;
      const aspect = canvas.width / canvas.height;
      cam.orthoTop    =  size;
      cam.orthoBottom = -size;
      cam.orthoLeft   = -size * aspect;
      cam.orthoRight  =  size * aspect;
    }, []);

    const clampTarget = useCallback(() => {
      const half = 0.5;
      panTargetRef.current.x = Math.max(-half, Math.min(half, panTargetRef.current.x));
      panTargetRef.current.z = Math.max(-half, Math.min(half, panTargetRef.current.z));
      const cam = cameraRef.current;
      if (cam) {
        cam.target.x = panTargetRef.current.x;
        cam.target.z = panTargetRef.current.z;
      }
    }, []);

    // ── Zone overlay ───────────────────────────────────────────────────────

    const updateZoneOverlay = useCallback((selectedType: BuildingType | null) => {
      const tex = zoneTexRef.current;
      if (!tex) return;
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, gridW, gridH);
      if (selectedType) {
        // Monolith Rule: when city exists, only highlight cells adjacent to existing buildings
        const hasCity = buildings.length > 0;
        for (let gx = 0; gx < gridW; gx++) {
          for (let gy = 0; gy < gridH; gy++) {
            if (!isCellBuildableFor(gx, gy, planet.seed, waterCoverage, selectedType)) continue;
            if (hasCity && !isAdjacentToCity(gx, gy, buildings)) continue;
            const occupied = buildings.some((b) => b.x === gx && b.y === gy);
            ctx.fillStyle = occupied ? 'rgba(255,80,80,0.4)' : 'rgba(68,255,136,0.28)';
            ctx.fillRect(gx, gy, 1, 1);
          }
        }
      }
      tex.update();
    }, [planet.seed, waterCoverage, gridW, gridH, buildings]);

    useEffect(() => {
      updateZoneOverlay(selectedBuilding);
    }, [selectedBuilding, updateZoneOverlay]);

    // ── Smart Corridors — sync procedural connection slabs between adjacent buildings ──

    const syncCorridors = useCallback(() => {
      const scene = sceneRef.current;
      if (!scene) return;
      const corridors = corridorMeshesRef.current;
      const cs = cellSize(gridW, gridH);

      // Build expected set: all adjacent (horizontal or vertical) building pairs
      const expectedKeys = new Set<string>();
      for (const b of buildings) {
        for (const [dx, dz] of [[1, 0], [0, 1]] as [number, number][]) {
          const nx = b.x + dx, nz = b.y + dz;
          if (buildings.some((n) => n.x === nx && n.y === nz)) {
            expectedKeys.add(corridorKey(b.x, b.y, nx, nz));
          }
        }
      }

      // Remove stale corridors
      for (const [key, mesh] of corridors) {
        if (!expectedKeys.has(key)) {
          mesh.dispose();
          corridors.delete(key);
        }
      }

      // Spawn missing corridors
      for (const key of expectedKeys) {
        if (!corridors.has(key)) {
          const [gx1, gz1, gx2, gz2] = key.split('_').map(Number);
          corridors.set(
            key,
            createCorridor(gx1, gz1, gx2, gz2, gridW, gridH, planet.seed, cs, scene),
          );
        }
      }
    }, [buildings, gridW, gridH, planet.seed]);

    useEffect(() => { syncCorridors(); }, [syncCorridors]);

    // ── Rebuild all GLB instances at a new LOD level ───────────────────────
    // Called only when orthoSize crosses a LOD threshold — not on every zoom tick.

    const rebuildBuildings = useCallback((newOrthoSize: number) => {
      const loader = glbLoaderRef.current;
      const shadowGen = shadowGenRef.current;
      const scene = sceneRef.current;
      if (!loader) return;

      const instances = glbInstancesRef.current;
      const shadowDiscs = shadowDiscsRef.current;
      const cs = cellSize(gridW, gridH);

      // Dispose all current instances and their contact shadow discs
      for (const [id, inst] of instances) {
        loader.dispose(inst, shadowGen);
        instances.delete(id);
      }
      for (const [id, disc] of shadowDiscs) {
        disc.dispose();
        shadowDiscs.delete(id);
      }

      // Re-instantiate with new LOD + recreate shadow discs
      for (const b of buildings) {
        const pos = gridToWorld(b.x, b.y, gridW, gridH, planet.seed);
        if (loader.has(b.type)) {
          const inst = loader.instantiate(b.type, b.id, pos, cs, shadowGen, newOrthoSize);
          if (inst) {
            instances.set(b.id, inst);
            if (scene) {
              shadowDiscs.set(b.id, createContactShadowDisc(b.id, pos, cs, scene));
            }
          }
        }
      }
    }, [buildings, gridW, gridH, planet.seed]);

    // ── Apply zoom + trigger LOD swap when threshold crossed ──────────────

    const applyZoom = useCallback((newOrthoSize: number) => {
      const canvas = canvasRef.current;
      const prevLOD = currentLODRef.current;

      orthoSizeRef.current = newOrthoSize;
      if (canvas) applyOrtho(newOrthoSize, canvas);

      const newLOD = getLODLevel(newOrthoSize);
      if (newLOD !== prevLOD) {
        currentLODRef.current = newLOD;
        rebuildBuildings(newOrthoSize);
      }
    }, [applyOrtho, rebuildBuildings]);

    // ── Babylon.js initialization ──────────────────────────────────────────

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      let cancelled = false;

      // ── Engine + Scene ──────────────────────────────────────────────────
      const engine = new Engine(canvas, true, { antialias: true, preserveDrawingBuffer: true });
      engineRef.current = engine;

      const scene = new Scene(engine);
      scene.clearColor = new Color4(0.008, 0.012, 0.02, 1);
      sceneRef.current = scene;

      // ── Isometric camera ────────────────────────────────────────────────
      // alpha=-PI/4: camera in (-X, +Z) quarter — classic isometric position
      // beta=PI/3.8: ~47° from vertical — shows terrain and building fronts
      const camera = new ArcRotateCamera(
        'isoCam',
        -Math.PI / 4,
        Math.PI / 3.8,
        5,
        Vector3.Zero(),
        scene,
      );
      camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
      camera.inputs.clear(); // custom pan/zoom controls
      // Prevent camera from going parallel to ground (would expose terrain edge)
      camera.lowerBetaLimit = Math.PI / 6;   // min 30° from vertical
      camera.upperBetaLimit = Math.PI / 2.2; // max ~82°
      cameraRef.current = camera;
      applyOrtho(orthoSizeRef.current, canvas);

      // ── Minimap camera (top-down, tiny viewport in bottom-left) ─────────
      const minimapCam = new ArcRotateCamera(
        'minimapCam',
        -Math.PI / 4,
        0.001,  // nearly straight down
        10,
        Vector3.Zero(),
        scene,
      );
      minimapCam.mode = Camera.ORTHOGRAPHIC_CAMERA;
      minimapCam.orthoTop    =  0.5;
      minimapCam.orthoBottom = -0.5;
      minimapCam.orthoLeft   = -0.65;
      minimapCam.orthoRight  =  0.65;
      minimapCam.inputs.clear();
      // Bottom-left viewport — normalized (x, y, width, height) — Babylon Y=0 is bottom
      minimapCam.viewport = new Viewport(0.01, 0.09, 0.14, 0.18);

      // ── Lighting ────────────────────────────────────────────────────────
      const hemi = new HemisphericLight('sky', new Vector3(0, 1, 0), scene);
      hemi.intensity   = 0.4; // reduced from 0.6 — lets directional sun create stronger contrast on buildings
      hemi.diffuse     = new Color3(0.75, 0.82, 1.0);
      hemi.groundColor = new Color3(0.10, 0.08, 0.06); // dark ground bounce

      const sun = new DirectionalLight('sun', new Vector3(-1, -2, -0.8), scene);
      sun.intensity = 1.4;
      sun.diffuse   = new Color3(1.0, 0.95, 0.85);
      sun.specular  = new Color3(0.5, 0.45, 0.35);
      sun.position  = new Vector3(1, 3, 1);

      // Standard ShadowGenerator — works correctly with orthographic cameras.
      // CascadedShadowGenerator relies on perspective frustum cascade splits and
      // does NOT render shadows on orthographic cameras (all meshes appear unlit).
      // usePoissonSampling: stores raw depth in red channel — compatible with
      // manual shadow map sampling in the ShaderMaterial fragment shader.
      const shadows = new ShadowGenerator(2048, sun);
      shadows.usePoissonSampling = true;
      shadows.bias          = 0.005;
      shadows.normalBias    = 0.01;
      shadowGenRef.current = shadows;

      // PBR environment — GLB models need an IBL texture for metallic reflections
      // createDefaultEnvironment with no ground/skybox just sets scene.environmentTexture
      scene.createDefaultEnvironment({ createGround: false, createSkybox: false });
      scene.environmentIntensity = 0.4; // subtle — directional light still dominates

      // Fog is disabled: orthographic camera keeps all objects at the same distance
      // (~5 units radius), so any EXP2 density thick enough to show at terrain edges
      // also makes buildings black. Edge vignette is handled by the fragment shader.
      scene.fogMode = Scene.FOGMODE_NONE;

      // DefaultRenderingPipeline — bloom + fxaa + image processing
      // Note: SSAO2RenderingPipeline conflicts with DefaultRenderingPipeline on the
      // same orthographic camera → black models. Use only one pipeline per camera.
      const pipeline = new DefaultRenderingPipeline('default', true, scene, [camera]);
      pipeline.bloomEnabled          = true;
      pipeline.bloomThreshold        = 0.82; // above snow-white (0.82-0.97) still blooms but less
      pipeline.bloomWeight           = 0.18; // reduced from 0.3 — prevents bright terrain from bleeding
      pipeline.bloomKernel           = 64;
      pipeline.bloomScale            = 0.5;
      pipeline.fxaaEnabled           = true;
      pipeline.imageProcessingEnabled = true;
      pipeline.imageProcessing.contrast = 1.1;
      pipeline.imageProcessing.exposure = 1.0; // neutral — was 1.05 (slight over-exposure)

      // ── Terrain ground plane ─────────────────────────────────────────────
      // Unit square in XZ, UV 0→1 both axes (used by shader for noise lookup)
      const ground = MeshBuilder.CreateGround('terrain', { width: 1, height: 1, subdivisions: 64 }, scene);
      ground.receiveShadows = true;
      ground.isPickable = true;

      const biome = visuals.biomeColors;
      const terrainMat = new ShaderMaterial(
        'terrainMat', scene,
        { vertexSource: babylonVertSrc, fragmentSource: surfaceFragSrc },
        {
          attributes: ['position', 'uv'],
          uniforms: [
            'worldViewProjection',
            'uSeed', 'uWaterLevel', 'uTempK', 'uIceCap', 'uLifeComplexity',
            'uSurfaceBase', 'uOceanColor',
            'uBiomeTropical', 'uBiomeTemperate', 'uBiomeBoreal', 'uBiomeDesert', 'uBiomeTundra',
            'uPan', 'uZoom', 'uTime',
            'uHasLava', 'uVolc', 'uWind', 'uType',
            'uFeAbundance', 'uSiAbundance', 'uCAbundance', 'uSAbundance', 'uAspect',
            'uHeightScale', // vertex shader height displacement
            'uLightVP',     // shadow generator light view-projection matrix
          ],
          samplers: ['uShadowMap'], // shadow depth texture
        },
      );

      terrainMat.setFloat('uSeed', planet.seed);
      terrainMat.setFloat('uWaterLevel', waterCoverage);
      terrainMat.setFloat('uTempK', planet.surfaceTempK);
      terrainMat.setFloat('uIceCap', iceCap);
      terrainMat.setFloat('uLifeComplexity', lifeLevel);
      terrainMat.setColor3('uSurfaceBase', numToColor3(visuals.surfaceBaseColor));
      terrainMat.setColor3('uOceanColor', numToColor3(visuals.oceanShallow ?? 0x1a3a5c));
      terrainMat.setColor3('uBiomeTropical', numToColor3(biome.tropical));
      terrainMat.setColor3('uBiomeTemperate', numToColor3(biome.temperate));
      terrainMat.setColor3('uBiomeBoreal', numToColor3(biome.boreal));
      terrainMat.setColor3('uBiomeDesert', numToColor3(biome.desert));
      terrainMat.setColor3('uBiomeTundra', numToColor3(biome.tundra));
      terrainMat.setVector2('uPan', new Vector2(0, 0));  // camera handles pan
      terrainMat.setFloat('uZoom', 1.0);                 // camera handles zoom
      terrainMat.setFloat('uTime', 0);
      terrainMat.setFloat('uHasLava', hasLava);
      terrainMat.setFloat('uVolc', visuals.volcanism);
      terrainMat.setFloat('uWind', visuals.windIntensity);
      terrainMat.setFloat('uType', visuals.surfaceType);
      terrainMat.setFloat('uFeAbundance', feAbund);
      terrainMat.setFloat('uSiAbundance', siAbund);
      terrainMat.setFloat('uCAbundance', cAbund);
      terrainMat.setFloat('uSAbundance', sAbund);
      terrainMat.setFloat('uAspect', 1.0); // UV tied to geometry, no aspect compensation
      terrainMat.setFloat('uHeightScale', TERRAIN_HEIGHT_SCALE);

      // Shadow map integration — ShaderMaterial must manually sample the depth texture.
      // uLightVP is updated every frame in the render loop (directional light frustum adapts).
      terrainMat.setMatrix('uLightVP', shadows.getTransformMatrix());
      const shadowMapTex = shadows.getShadowMap();
      if (shadowMapTex) terrainMat.setTexture('uShadowMap', shadowMapTex);

      terrainMat.backFaceCulling = false;
      ground.material = terrainMat;
      terrainMatRef.current = terrainMat;

      // ── Zone overlay (buildable cell highlights) ─────────────────────────
      const zonePlane = MeshBuilder.CreateGround(
        'zones', { width: 1, height: 1, subdivisions: 1 }, scene,
      );
      zonePlane.position.y = 0.005;    // higher than terrain to avoid z-fighting
      zonePlane.isPickable = false;
      zonePlane.renderingGroupId = 1;  // render AFTER all group-0 objects (terrain, buildings)

      // Group 1 should NOT clear the depth buffer — overlay renders on top, not occluded
      scene.setRenderingAutoClearDepthStencil(1, false);

      const zoneTex = new DynamicTexture('zoneTex', { width: gridW, height: gridH }, scene);
      zoneTex.hasAlpha = true;
      const zoneMat = new StandardMaterial('zoneMat', scene);
      zoneMat.diffuseTexture = zoneTex;
      zoneMat.useAlphaFromDiffuseTexture = true;
      zoneMat.disableLighting = true;
      zoneMat.backFaceCulling = false;
      zonePlane.material = zoneMat;
      zoneTexRef.current = zoneTex;

      // ── GLB building loader ──────────────────────────────────────────────
      const glbLoader = new BuildingGLBLoader();
      glbLoaderRef.current = glbLoader;

      // Preload GLBs in background — when done, increment glbVersion to trigger building sync
      glbLoader.preloadAll(scene)
        .then(() => { if (!cancelled) setGlbVersion((v) => v + 1); })
        .catch(() => { if (!cancelled) setGlbVersion((v) => v + 1); });

      // ── Render loop ──────────────────────────────────────────────────────
      const startTime = performance.now();
      engine.runRenderLoop(() => {
        if (cancelled) return;
        animTimeRef.current = (performance.now() - startTime) * 0.001;
        terrainMat.setFloat('uTime', animTimeRef.current);
        // Keep shadow light VP matrix in sync — directional light frustum adapts each frame
        terrainMat.setMatrix('uLightVP', shadows.getTransformMatrix());
        scene.render();
      });

      // ── Resize ──────────────────────────────────────────────────────────
      const handleResize = () => {
        engine.resize();
        applyOrtho(orthoSizeRef.current, canvas);
      };
      window.addEventListener('resize', handleResize);

      // ── Cleanup ──────────────────────────────────────────────────────────
      return () => {
        cancelled = true;
        window.removeEventListener('resize', handleResize);
        glbLoader.disposeAll();
        glbLoaderRef.current = null;
        engine.stopRenderLoop();
        scene.dispose();
        engine.dispose();
        engineRef.current = null;
        sceneRef.current = null;
        cameraRef.current = null;
        terrainMatRef.current = null;
        shadowGenRef.current = null;
        zoneTexRef.current = null;
        glbInstancesRef.current.clear();
        placeholderMeshesRef.current.clear();
        shadowDiscsRef.current.clear();
        corridorMeshesRef.current.forEach((m) => m.dispose());
        corridorMeshesRef.current.clear();
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planet.seed]);

    // ── Sync buildings → GLB instances ────────────────────────────────────
    // glbVersion is incremented when preloadAll completes — ensures re-sync after GLBs load

    useEffect(() => {
      const scene = sceneRef.current;
      const loader = glbLoaderRef.current;
      const shadowGen = shadowGenRef.current;
      if (!scene || !loader) return;

      const instances = glbInstancesRef.current;
      const placeholders = placeholderMeshesRef.current;
      const shadowDiscs = shadowDiscsRef.current;
      const currentIds = new Set(buildings.map((b) => b.id));
      const cs = cellSize(gridW, gridH);

      // Remove stale instances, shadow discs, and placeholders
      for (const [id, inst] of instances) {
        if (!currentIds.has(id)) {
          loader.dispose(inst, shadowGen);
          instances.delete(id);
          const disc = shadowDiscs.get(id);
          if (disc) { disc.dispose(); shadowDiscs.delete(id); }
        }
      }
      for (const [id, mesh] of placeholders) {
        if (!currentIds.has(id)) {
          mesh.dispose();
          placeholders.delete(id);
        }
      }

      // Add or upgrade buildings
      for (const b of buildings) {
        const pos = gridToWorld(b.x, b.y, gridW, gridH, planet.seed);

        if (loader.has(b.type)) {
          // GLB is ready — remove placeholder if any, instantiate real model
          const ph = placeholders.get(b.id);
          if (ph) { ph.dispose(); placeholders.delete(b.id); }

          if (!instances.has(b.id)) {
            const inst = loader.instantiate(b.type, b.id, pos, cs, shadowGen, orthoSizeRef.current);
            if (inst) {
              instances.set(b.id, inst);
              // Contact shadow disc — visually grounds the building on the terrain
              if (!shadowDiscs.has(b.id)) {
                shadowDiscs.set(b.id, createContactShadowDisc(b.id, pos, cs, scene));
              }
              // Nano-print animation: reveal building from bottom (scale Y: 0 → final) over 800ms
              const root = inst.rootNode;
              const finalY = root.scaling.y;
              root.scaling.y = 0;
              const t0 = performance.now();
              const animateBuild = () => {
                const t = Math.min(1, (performance.now() - t0) / 800);
                const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
                root.scaling.y = finalY * eased;
                if (t < 1) requestAnimationFrame(animateBuild);
              };
              requestAnimationFrame(animateBuild);
            }
          }
        } else if (!instances.has(b.id) && !placeholders.has(b.id)) {
          // GLB not loaded yet — show wireframe placeholder box so user sees something
          const ph = MeshBuilder.CreateBox(`ph_${b.id}`, { size: cs }, scene);
          ph.position.copyFrom(pos);
          ph.position.y = cs * 0.5;
          const pm = new StandardMaterial(`phMat_${b.id}`, scene);
          pm.diffuseColor = new Color3(0.27, 1.0, 0.53); // #44ff88
          pm.wireframe = true;
          pm.disableLighting = true;
          ph.material = pm;
          placeholders.set(b.id, ph);
        }
      }
    }, [buildings, gridW, gridH, glbVersion]);

    // ── Place building handler ─────────────────────────────────────────────

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
      dragRef.current = { active: true, startX: e.clientX, startY: e.clientY };
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
      if (!dragRef.current.active) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      dragRef.current.startX = e.clientX;
      dragRef.current.startY = e.clientY;

      const canvas = canvasRef.current;
      const cam = cameraRef.current;
      if (!canvas || !cam) return;

      const orthoW = (cam.orthoRight ?? 1) - (cam.orthoLeft ?? -1);
      const orthoH = (cam.orthoTop ?? 1) - (cam.orthoBottom ?? -1);
      const worldDX = (dx / canvas.clientWidth)  * orthoW;
      const worldDY = (dy / canvas.clientHeight) * orthoH;

      // Pan in XZ: project screen delta onto terrain plane via camera orientation.
      // cameraRight = (cosA, 0, -sinA); horizontal pan is exact.
      // Vertical: negate worldDY (screen Y vs world Y inversion in Babylon left-hand coords).
      const cosA = Math.cos(cam.alpha);
      const sinA = Math.sin(cam.alpha);
      const cosB = Math.cos(cam.beta); // ~0.678 at beta=PI/3.8; compensates foreshortening
      panTargetRef.current.x -= cosA * worldDX - (sinA / cosB) * worldDY;
      panTargetRef.current.z -= -sinA * worldDX - (cosA / cosB) * worldDY;
      clampTarget();
    }, [clampTarget]);

    const handlePointerUp = useCallback(() => {
      dragRef.current.active = false;
    }, []);

    const handleClick = useCallback((e: React.MouseEvent) => {
      if (!selectedBuilding) return;
      const scene = sceneRef.current;
      const canvas = canvasRef.current;
      if (!scene || !canvas) return;

      // Raycast onto terrain ground plane
      const rect = canvas.getBoundingClientRect();
      const pickInfo = scene.pick(
        e.clientX - rect.left,
        e.clientY - rect.top,
        (mesh) => mesh.name === 'terrain',
      );

      if (!pickInfo?.hit || !pickInfo.pickedPoint) return;

      const wp = pickInfo.pickedPoint;
      const gx = Math.floor((wp.x + 0.5) * gridW);
      const gz = Math.floor((wp.z + 0.5) * gridH);

      if (gx < 0 || gx >= gridW || gz < 0 || gz >= gridH) return;
      if (!isCellBuildableFor(gx, gz, planet.seed, waterCoverage, selectedBuilding)) return;
      if (buildings.some((b) => b.x === gx && b.y === gz)) return;
      // Monolith Rule: all buildings after the first must connect to the existing colony
      if (buildings.length > 0 && !isAdjacentToCity(gx, gz, buildings)) return;

      const newBuilding: PlacedBuilding = {
        id: `bld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: selectedBuilding,
        x: gx,
        y: gz,
        level: 1,
        builtAt: new Date().toISOString(),
      };

      setBuildings((prev) => [...prev, newBuilding]);
      setSelectedBuilding(null);
      onBuildingPlaced?.();

      placeBuilding(playerId, planet.id, newBuilding).catch((err) => {
        console.error('Failed to save building:', err);
      });
    }, [selectedBuilding, buildings, planet.seed, planet.id, waterCoverage, playerId, gridW, gridH, onBuildingPlaced]);

    // ── Scroll zoom ────────────────────────────────────────────────────────

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 1.12 : 0.88;
        const newSize = Math.max(0.06, Math.min(1.6, orthoSizeRef.current * factor));
        applyZoom(newSize);
      };
      canvas.addEventListener('wheel', onWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', onWheel);
    }, [applyZoom]);

    // ── Touch pinch-zoom ───────────────────────────────────────────────────

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        dragRef.current = { active: true, startX: e.touches[0].clientX, startY: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        dragRef.current.active = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchRef.current = { active: true, dist: Math.hypot(dx, dy) };
      }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && dragRef.current.active) {
        const dx = e.touches[0].clientX - dragRef.current.startX;
        const dy = e.touches[0].clientY - dragRef.current.startY;
        dragRef.current.startX = e.touches[0].clientX;
        dragRef.current.startY = e.touches[0].clientY;

        const canvas = canvasRef.current;
        const cam = cameraRef.current;
        if (!canvas || !cam) return;

        const orthoW = (cam.orthoRight ?? 1) - (cam.orthoLeft ?? -1);
        const orthoH = (cam.orthoTop ?? 1) - (cam.orthoBottom ?? -1);
        const worldDX = (dx / canvas.clientWidth)  * orthoW;
        const worldDY = (dy / canvas.clientHeight) * orthoH;
        const cosA = Math.cos(cam.alpha);
        const sinA = Math.sin(cam.alpha);
        const cosB = Math.cos(cam.beta);
        panTargetRef.current.x -= cosA * worldDX - (sinA / cosB) * worldDY;
        panTargetRef.current.z -= -sinA * worldDX - (cosA / cosB) * worldDY;
        clampTarget();
      } else if (e.touches.length === 2 && pinchRef.current.active) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newDist = Math.hypot(dx, dy);
        const factor = pinchRef.current.dist / newDist;
        const newSize = Math.max(0.12, Math.min(1.6, orthoSizeRef.current * factor));
        pinchRef.current.dist = newDist;
        applyZoom(newSize);
      }
    }, [clampTarget, applyZoom]);

    const handleTouchEnd = useCallback(() => {
      dragRef.current.active = false;
      pinchRef.current.active = false;
    }, []);

    // ── Keyboard: Escape ───────────────────────────────────────────────────

    useEffect(() => {
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (selectedBuilding) setSelectedBuilding(null);
          else onClose();
        }
      };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }, [onClose, selectedBuilding]);

    // ── Imperative handle (CommandBar zoom buttons) ────────────────────────

    useImperativeHandle(ref, () => ({
      zoomIn:  () => applyZoom(Math.max(0.12, orthoSizeRef.current * 0.82)),
      zoomOut: () => applyZoom(Math.min(1.6,  orthoSizeRef.current * 1.22)),
      startAIGeneration: () => { /* no-op: procedural terrain */ },
      toggleBuildPanel: () => setShowBuildPanel((prev) => !prev),
      toggleMinimap: () => setShowMinimap((prev) => !prev),
    }), [applyZoom]);

    // ── Render ─────────────────────────────────────────────────────────────

    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: '#020510', zIndex: 9000,
      }}>
        {/* Babylon.js canvas */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            touchAction: 'none',
            cursor: selectedBuilding ? 'crosshair' : 'grab',
            outline: 'none',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />

        {/* Minimap label */}
        {showMinimap && (
          <div style={{
            position: 'absolute',
            bottom: 140,
            left: 14,
            fontSize: 9,
            fontFamily: 'monospace',
            color: '#8899aa',
            letterSpacing: '0.05em',
            pointerEvents: 'none',
            zIndex: 10,
          }}>
            MINIMAP
          </div>
        )}

        {/* Minimap toggle button */}
        <button
          onClick={() => setShowMinimap((prev) => !prev)}
          title={showMinimap ? 'Сховати мапу' : 'Показати мапу'}
          style={{
            position: 'absolute',
            bottom: showMinimap ? 208 : 60,
            left: 14,
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: showMinimap ? 'rgba(10,15,25,0.92)' : 'rgba(10,15,25,0.85)',
            border: showMinimap ? '1px solid rgba(68,136,170,0.6)' : '1px solid rgba(68,102,136,0.4)',
            borderRadius: 4,
            color: showMinimap ? '#aabbcc' : '#8899aa',
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'monospace',
            fontSize: 14,
            zIndex: 10,
            transition: 'bottom 0.2s ease, border-color 0.15s, color 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
            <rect x="1" y="2" width="14" height="12" rx="1" />
            <rect x="3" y="4" width="5" height="4" strokeDasharray="2 1" />
            <line x1="1" y1="9" x2="15" y2="9" />
            <line x1="9" y1="2" x2="9" y2="14" />
          </svg>
        </button>

        {/* Surface management panel */}
        {showBuildPanel && (
          <SurfacePanel
            planet={planet}
            buildings={buildings}
            selectedBuilding={selectedBuilding}
            onSelectBuilding={setSelectedBuilding}
            onClose={() => setShowBuildPanel(false)}
          />
        )}
      </div>
    );
  },
);

export default SurfaceBabylonView;
