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
  Vector3, Vector2, Color3, Color4,
  MeshBuilder, ShaderMaterial, DynamicTexture, StandardMaterial,
  Viewport,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import type { Planet, Star, PlacedBuilding, BuildingType, TerrainType } from '@nebulife/core';
import { BUILDING_DEFS } from '@nebulife/core';
import { derivePlanetVisuals } from '../../game/rendering/PlanetVisuals.js';
import { BuildingGLBLoader, PlacedGLBInstance } from '../../game/rendering/BuildingGLBLoader.js';
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

/** Grid cell (gx, gz) → world XZ position (terrain is 1×1 in XZ, center at origin) */
function gridToWorld(gx: number, gz: number, gridW: number, gridH: number): Vector3 {
  return new Vector3(
    (gx + 0.5) / gridW - 0.5,
    0,
    (gz + 0.5) / gridH - 0.5,
  );
}

/** Minimum cell size for building scaling */
function cellSize(gridW: number, gridH: number): number {
  return Math.min(1 / gridW, 1 / gridH);
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

    // Navigation
    const orthoSizeRef = useRef(0.55);          // controls zoom level
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
        for (let gx = 0; gx < gridW; gx++) {
          for (let gy = 0; gy < gridH; gy++) {
            if (isCellBuildableFor(gx, gy, planet.seed, waterCoverage, selectedType)) {
              const occupied = buildings.some((b) => b.x === gx && b.y === gy);
              ctx.fillStyle = occupied ? 'rgba(255,80,80,0.4)' : 'rgba(68,255,136,0.28)';
              ctx.fillRect(gx, gy, 1, 1);
            }
          }
        }
      }
      tex.update();
    }, [planet.seed, waterCoverage, gridW, gridH, buildings]);

    useEffect(() => {
      updateZoneOverlay(selectedBuilding);
    }, [selectedBuilding, updateZoneOverlay]);

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
      hemi.intensity = 0.55;
      hemi.diffuse   = new Color3(0.75, 0.82, 1.0);
      hemi.groundColor = new Color3(0.3, 0.25, 0.2);

      const sun = new DirectionalLight('sun', new Vector3(-1, -2, -0.8), scene);
      sun.intensity = 1.1;
      sun.diffuse   = new Color3(1.0, 0.95, 0.85);
      sun.position  = new Vector3(1, 3, 1);

      const shadows = new ShadowGenerator(512, sun);
      shadows.useBlurExponentialShadowMap = true;
      shadows.blurKernel = 8;
      shadowGenRef.current = shadows;

      // ── Terrain ground plane ─────────────────────────────────────────────
      // Unit square in XZ, UV 0→1 both axes (used by shader for noise lookup)
      const ground = MeshBuilder.CreateGround('terrain', { width: 1, height: 1, subdivisions: 1 }, scene);
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
          ],
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

      terrainMat.backFaceCulling = false;
      ground.material = terrainMat;
      terrainMatRef.current = terrainMat;

      // ── Zone overlay (buildable cell highlights) ─────────────────────────
      const zonePlane = MeshBuilder.CreateGround(
        'zones', { width: 1, height: 1, subdivisions: 1 }, scene,
      );
      zonePlane.position.y = 0.002;
      zonePlane.isPickable = false;

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

      // Preload GLBs in background (non-blocking — buildings appear as GLBs become ready)
      glbLoader.preloadAll(scene).catch(() => { /* silent — canvas fallback */ });

      // ── Render loop ──────────────────────────────────────────────────────
      const startTime = performance.now();
      engine.runRenderLoop(() => {
        if (cancelled) return;
        animTimeRef.current = (performance.now() - startTime) * 0.001;
        terrainMat.setFloat('uTime', animTimeRef.current);
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
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planet.seed]);

    // ── Sync buildings → GLB instances ────────────────────────────────────

    useEffect(() => {
      const scene = sceneRef.current;
      const loader = glbLoaderRef.current;
      const shadowGen = shadowGenRef.current;
      if (!scene || !loader) return;

      const instances = glbInstancesRef.current;
      const currentIds = new Set(buildings.map((b) => b.id));

      // Remove stale instances
      for (const [id, inst] of instances) {
        if (!currentIds.has(id)) {
          loader.dispose(inst, shadowGen);
          instances.delete(id);
        }
      }

      // Add new buildings
      const cs = cellSize(gridW, gridH);
      for (const b of buildings) {
        if (instances.has(b.id)) continue;

        const pos = gridToWorld(b.x, b.y, gridW, gridH);
        if (loader.has(b.type)) {
          const inst = loader.instantiate(b.type, b.id, pos, cs, shadowGen);
          if (inst) instances.set(b.id, inst);
        }
        // If no GLB yet: loader will have it next time buildings state changes or on preload completion
      }
    }, [buildings, gridW, gridH]);

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

      // Pan in XZ: rotate screen delta by camera alpha angle
      const cosA = Math.cos(cam.alpha);
      const sinA = Math.sin(cam.alpha);
      panTargetRef.current.x -= cosA * worldDX - sinA * worldDY;
      panTargetRef.current.z -= sinA * worldDX + cosA * worldDY;
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
        orthoSizeRef.current = Math.max(0.12, Math.min(1.6, orthoSizeRef.current * factor));
        applyOrtho(orthoSizeRef.current, canvas);
      };
      canvas.addEventListener('wheel', onWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', onWheel);
    }, [applyOrtho]);

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
        panTargetRef.current.x -= cosA * worldDX - sinA * worldDY;
        panTargetRef.current.z -= sinA * worldDX + cosA * worldDY;
        clampTarget();
      } else if (e.touches.length === 2 && pinchRef.current.active) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newDist = Math.hypot(dx, dy);
        const factor = pinchRef.current.dist / newDist;
        orthoSizeRef.current = Math.max(0.12, Math.min(1.6, orthoSizeRef.current * factor));
        pinchRef.current.dist = newDist;
        const canvas = canvasRef.current;
        if (canvas) applyOrtho(orthoSizeRef.current, canvas);
      }
    }, [clampTarget, applyOrtho]);

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
      zoomIn: () => {
        orthoSizeRef.current = Math.max(0.12, orthoSizeRef.current * 0.82);
        const canvas = canvasRef.current;
        if (canvas) applyOrtho(orthoSizeRef.current, canvas);
      },
      zoomOut: () => {
        orthoSizeRef.current = Math.min(1.6, orthoSizeRef.current * 1.22);
        const canvas = canvasRef.current;
        if (canvas) applyOrtho(orthoSizeRef.current, canvas);
      },
      startAIGeneration: () => { /* no-op: procedural terrain */ },
      toggleBuildPanel: () => setShowBuildPanel((prev) => !prev),
      toggleMinimap: () => setShowMinimap((prev) => !prev),
    }), [applyOrtho]);

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
