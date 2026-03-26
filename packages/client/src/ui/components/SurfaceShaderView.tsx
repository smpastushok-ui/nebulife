import React, {
  useEffect, useRef, useState, useCallback, useMemo,
  forwardRef, useImperativeHandle,
} from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import type {
  Planet, Star, PlacedBuilding, BuildingType, TerrainType,
} from '@nebulife/core';
import { BUILDING_DEFS } from '@nebulife/core';
import { derivePlanetVisuals } from '../../game/rendering/PlanetVisuals.js';
import { BuildingRenderer } from '../../game/rendering/BuildingRenderer.js';
import { SurfacePanel } from './SurfacePanel.js';
import { getBuildings, placeBuilding } from '../../api/surface-api.js';

import surfaceVertSrc from '../../shaders/surface/surface.vert.glsl?raw';
import surfaceFragSrc from '../../shaders/surface/surface-terrain.frag.glsl?raw';

// ---------------------------------------------------------------------------
// SurfaceShaderView — procedural WebGL terrain replacing AI-generated photos
// ---------------------------------------------------------------------------
// Two layers:
// 1. WebGL canvas (Three.js, orthographic camera, full-screen quad):
//    Procedural FBM noise -> elevation -> biome coloring
// 2. Canvas 2D overlay:
//    Grid lines, building sprites, buildable zone highlighting
// ---------------------------------------------------------------------------

export type SurfacePhase = 'ready' | 'error';

/** Methods exposed to parent via ref for CommandBar integration */
export interface SurfaceViewHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  startAIGeneration: () => void;
  toggleBuildPanel: () => void;
  toggleMinimap: () => void;
}

interface SurfaceShaderViewProps {
  planet: Planet;
  star: Star;
  playerId: string;
  onClose: () => void;
  onBuildingCountChange?: (count: number) => void;
  onBuildingPlaced?: (type: BuildingType) => void;
  onPhaseChange?: (phase: SurfacePhase) => void;
  onBuildPanelChange?: (open: boolean) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Derive grid dimensions from planet radius (log-scale) */
function computeMapDimensions(radiusEarth: number) {
  const scale = Math.max(0.5, Math.min(3.0, Math.log2(radiusEarth + 1) / Math.log2(2)));
  return {
    gridW: Math.round(64 * scale),
    gridH: Math.round(36 * scale),
  };
}

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: '#000510',
  zIndex: 9000,
  display: 'flex',
  flexDirection: 'column',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function numToColor(c: number): THREE.Color {
  return new THREE.Color(
    ((c >> 16) & 0xff) / 255,
    ((c >> 8) & 0xff) / 255,
    (c & 0xff) / 255,
  );
}

/** Get deterministic elevation for a grid cell */
function getCellElevation(x: number, y: number, seed: number): number {
  const h1 = Math.sin(x * 127.1 + y * 311.7 + seed * 0.1) * 43758.5453;
  const h2 = Math.sin(x * 269.5 + y * 183.3 + seed * 0.2) * 21345.6789;
  return (h1 - Math.floor(h1)) * 0.7 + (h2 - Math.floor(h2)) * 0.3;
}

/** Classify a grid cell into a terrain type based on elevation vs water level */
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

/** Check if a specific building type can be placed on a grid cell */
function isCellBuildableFor(
  x: number, y: number, seed: number, waterLevel: number,
  buildingType: BuildingType,
): boolean {
  const terrain = classifyCellTerrain(x, y, seed, waterLevel);
  return BUILDING_DEFS[buildingType].requiresTerrain.includes(terrain);
}


/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const SurfaceShaderView = forwardRef<SurfaceViewHandle, SurfaceShaderViewProps>(
  function SurfaceShaderView(
    {
      planet, star, playerId, onClose,
      onBuildingCountChange, onBuildingPlaced, onPhaseChange, onBuildPanelChange,
    },
    ref,
  ) {
    const { t } = useTranslation();
    /* ---------- State ---------- */
    const [phase, setPhase] = useState<SurfacePhase>('ready');
    const [buildings, setBuildings] = useState<PlacedBuilding[]>([]);
    const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
    const [showBuildPanel, setShowBuildPanel] = useState(false);
    const [showMinimap, setShowMinimap] = useState(true);

    /* ---------- Refs ---------- */
    const mountRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const materialRef = useRef<THREE.ShaderMaterial | null>(null);
    const rafRef = useRef(0);

    // Minimap refs
    const minimapMountRef = useRef<HTMLDivElement>(null);
    const minimapOverlayRef = useRef<HTMLCanvasElement>(null);
    const minimapRendererRef = useRef<THREE.WebGLRenderer | null>(null);

    // Building renderer ref
    const buildingRendererRef = useRef<BuildingRenderer | null>(null);

    // Pan state (zoom is fixed — scaling breaks building↔terrain alignment)
    const panRef = useRef({ x: 0, y: 0 });
    const zoomRef = useRef(1.0); // fixed zoom=1 → full planet overview on entry
    const dragRef = useRef({ active: false, startX: 0, startY: 0 });

    /* ================================================================ */
    /*  Notify parent of state changes                                   */
    /* ================================================================ */

    useEffect(() => {
      onBuildingCountChange?.(buildings.length);
    }, [buildings.length, onBuildingCountChange]);

    useEffect(() => {
      onPhaseChange?.(phase);
    }, [phase, onPhaseChange]);

    useEffect(() => {
      onBuildPanelChange?.(showBuildPanel);
    }, [showBuildPanel, onBuildPanelChange]);

    /* ================================================================ */
    /*  Load buildings from server                                       */
    /* ================================================================ */

    useEffect(() => {
      getBuildings(playerId, planet.id)
        .then((b) => setBuildings(b))
        .catch((err) => console.error('Failed to load buildings:', err));
    }, [playerId, planet.id]);

    /* ================================================================ */
    /*  Derive visuals -> shader uniforms                                */
    /* ================================================================ */

    const visuals = derivePlanetVisuals(planet, star);

    // Grid dimensions scaled by planet radius
    const { gridW, gridH } = useMemo(
      () => computeMapDimensions(planet.radiusEarth),
      [planet.radiusEarth],
    );

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

    // Resource abundances
    const crust = planet.resources?.crustComposition ?? {};
    const feAbund = Math.min((crust['Fe'] ?? 0) / 15, 1);
    const siAbund = Math.min((crust['Si'] ?? 0) / 30, 1);
    const cAbund = Math.min((crust['C'] ?? 0) / 10, 1);
    const sAbund = Math.min((crust['S'] ?? 0) / 5, 1);

    // New surface uniforms
    const volc = visuals.volcanism;
    const wind = visuals.windIntensity;
    const surfType = visuals.surfaceType;

    /* ================================================================ */
    /*  Three.js setup — procedural terrain on full-screen quad          */
    /* ================================================================ */

    useEffect(() => {
      const mount = mountRef.current;
      if (!mount) return;

      const w = mount.clientWidth;
      const h = mount.clientHeight;

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mount.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Orthographic camera
      const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
      camera.position.z = 1;

      // Scene + full-screen quad
      const scene = new THREE.Scene();
      const geometry = new THREE.PlaneGeometry(1, 1);

      const material = new THREE.ShaderMaterial({
        vertexShader: surfaceVertSrc,
        fragmentShader: surfaceFragSrc,
        uniforms: {
          uSeed: { value: planet.seed },
          uWaterLevel: { value: waterCoverage },
          uTempK: { value: planet.surfaceTempK },
          uIceCap: { value: iceCap },
          uLifeComplexity: { value: lifeLevel },
          uSurfaceBase: { value: numToColor(visuals.surfaceBaseColor) },
          uOceanColor: { value: numToColor(visuals.oceanShallow ?? 0x1a3a5c) },
          uBiomeTropical: { value: numToColor(visuals.biomeColors.tropical) },
          uBiomeTemperate: { value: numToColor(visuals.biomeColors.temperate) },
          uBiomeBoreal: { value: numToColor(visuals.biomeColors.boreal) },
          uBiomeDesert: { value: numToColor(visuals.biomeColors.desert) },
          uBiomeTundra: { value: numToColor(visuals.biomeColors.tundra) },
          uPan: { value: new THREE.Vector2(0, 0) },
          uZoom: { value: 1.0 },
          uTime: { value: 0 },
          uHasLava: { value: hasLava },
          uVolc: { value: volc },
          uWind: { value: wind },
          uType: { value: surfType },
          uFeAbundance: { value: feAbund },
          uSiAbundance: { value: siAbund },
          uCAbundance: { value: cAbund },
          uSAbundance: { value: sAbund },
          uAspect: { value: w / h },
        },
      });
      materialRef.current = material;

      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      // ── Building renderer (Three.js textured planes on terrain) ──
      const bRenderer = new BuildingRenderer(scene, gridW, gridH);
      buildingRendererRef.current = bRenderer;

      // ── Minimap renderer (same shader, zoom=1, pan=0) ──
      const MINIMAP_W = 200;
      const MINIMAP_H = 150;
      const minimapMount = minimapMountRef.current;
      let minimapRenderer: THREE.WebGLRenderer | null = null;
      let minimapScene: THREE.Scene | null = null;
      let minimapMaterial: THREE.ShaderMaterial | null = null;
      let minimapCamera: THREE.OrthographicCamera | null = null;

      if (minimapMount) {
        minimapRenderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
        minimapRenderer.setSize(MINIMAP_W, MINIMAP_H);
        minimapRenderer.setPixelRatio(1); // low-res for performance
        minimapMount.appendChild(minimapRenderer.domElement);
        minimapRendererRef.current = minimapRenderer;

        minimapCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
        minimapCamera.position.z = 1;

        minimapScene = new THREE.Scene();
        const minimapGeo = new THREE.PlaneGeometry(1, 1);
        minimapMaterial = new THREE.ShaderMaterial({
          vertexShader: surfaceVertSrc,
          fragmentShader: surfaceFragSrc,
          uniforms: {
            uSeed: { value: planet.seed },
            uWaterLevel: { value: waterCoverage },
            uTempK: { value: planet.surfaceTempK },
            uIceCap: { value: iceCap },
            uLifeComplexity: { value: lifeLevel },
            uSurfaceBase: { value: numToColor(visuals.surfaceBaseColor) },
            uOceanColor: { value: numToColor(visuals.oceanShallow ?? 0x1a3a5c) },
            uBiomeTropical: { value: numToColor(visuals.biomeColors.tropical) },
            uBiomeTemperate: { value: numToColor(visuals.biomeColors.temperate) },
            uBiomeBoreal: { value: numToColor(visuals.biomeColors.boreal) },
            uBiomeDesert: { value: numToColor(visuals.biomeColors.desert) },
            uBiomeTundra: { value: numToColor(visuals.biomeColors.tundra) },
            uPan: { value: new THREE.Vector2(0, 0) },
            uZoom: { value: 1.0 },
            uTime: { value: 0 },
            uHasLava: { value: hasLava },
            uVolc: { value: volc },
            uWind: { value: wind },
            uType: { value: surfType },
            uFeAbundance: { value: feAbund },
            uSiAbundance: { value: siAbund },
            uCAbundance: { value: cAbund },
            uSAbundance: { value: sAbund },
          },
        });
        const minimapMesh = new THREE.Mesh(minimapGeo, minimapMaterial);
        minimapScene.add(minimapMesh);
      }

      // Animation loop
      const startTime = performance.now();
      const animate = () => {
        rafRef.current = requestAnimationFrame(animate);
        const t = (performance.now() - startTime) * 0.001;

        // Main renderer
        const panX = panRef.current.x * 0.001;
        const panY = panRef.current.y * 0.001;
        const zoom = zoomRef.current;
        material.uniforms.uTime.value = t;
        material.uniforms.uPan.value.set(panX, panY);
        material.uniforms.uZoom.value = zoom;

        // Update building renderer (sync position with terrain pan/zoom)
        bRenderer.update(panX, panY, zoom, t);

        renderer.render(scene, camera);

        // Minimap renderer (full planet overview, fixed zoom=1, pan=0)
        if (minimapRenderer && minimapScene && minimapCamera && minimapMaterial) {
          minimapMaterial.uniforms.uTime.value = t;
          minimapRenderer.render(minimapScene, minimapCamera);
        }

        // Draw viewport rectangle on minimap overlay
        const mmOverlay = minimapOverlayRef.current;
        if (mmOverlay) {
          const mw = mmOverlay.width;
          const mh = mmOverlay.height;
          const ctx = mmOverlay.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, mw, mh);
            // Viewport rect: current pan/zoom mapped to minimap coords
            const panX = panRef.current.x * 0.001;
            const panY = panRef.current.y * 0.001;
            const zoom = zoomRef.current;
            // In shader: worldPos = (vUv - 0.5) / zoom + pan + seedOff
            // Visible area center in world = pan + seedOff (seedOff is constant)
            // Visible area size = 1/zoom (in world units mapped to [0,1] UV)
            const rectW = (1.0 / zoom) * mw;
            const rectH = (1.0 / zoom) * mh;
            const rectX = (0.5 - panX) * mw - rectW * 0.5;
            const rectY = (0.5 + panY) * mh - rectH * 0.5;
            ctx.strokeStyle = '#44ff88';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(rectX, rectY, rectW, rectH);
          }
        }
      };
      animate();

      // Resize handler
      const handleResize = () => {
        const rw = mount.clientWidth;
        const rh = mount.clientHeight;
        renderer.setSize(rw, rh);
        // Keep aspect ratio uniform in sync so terrain looks correct on resize
        if (rh > 0) material.uniforms.uAspect.value = rw / rh;
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(rafRef.current);
        renderer.forceContextLoss();
        renderer.dispose();
        geometry.dispose();
        material.dispose();
        if (mount.contains(renderer.domElement)) {
          mount.removeChild(renderer.domElement);
        }
        rendererRef.current = null;
        materialRef.current = null;
        // Cleanup building renderer
        bRenderer.dispose();
        buildingRendererRef.current = null;
        // Cleanup minimap
        if (minimapRenderer) {
          minimapRenderer.forceContextLoss();
          minimapRenderer.dispose();
          if (minimapMount && minimapMount.contains(minimapRenderer.domElement)) {
            minimapMount.removeChild(minimapRenderer.domElement);
          }
          minimapRendererRef.current = null;
        }
        if (minimapMaterial) minimapMaterial.dispose();
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planet.seed]);

    /* ================================================================ */
    /*  Sync buildings state → BuildingRenderer (Three.js)               */
    /* ================================================================ */

    useEffect(() => {
      buildingRendererRef.current?.updateBuildings(buildings);
    }, [buildings]);

    /* ================================================================ */
    /*  Canvas 2D overlay — grid lines + zone highlights (build mode)    */
    /* ================================================================ */

    /** Map grid cell edges to screen rect */
    const gridCellToScreen = useCallback((gx: number, gy: number, w: number, h: number) => {
      const panX = panRef.current.x * 0.001;
      const panY = panRef.current.y * 0.001;
      const zoom = zoomRef.current;
      const cellW = zoom * w / gridW;
      const cellH = zoom * h / gridH;
      // Top-left corner UV
      const uvX = (gx / gridW - 0.5 - panX) * zoom + 0.5;
      const uvY = (0.5 - gy / gridH - panY) * zoom + 0.5;
      return { x: uvX * w, y: (1 - uvY) * h - cellH, w: cellW, h: cellH };
    }, [gridW, gridH]);

    const drawOverlay = useCallback(() => {
      const canvas = overlayRef.current;
      if (!canvas) return;

      const w = canvas.width;
      const h = canvas.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      if (!selectedBuilding) return;

      // Draw buildable zone highlights (transformed for pan/zoom)
      ctx.fillStyle = 'rgba(68, 255, 136, 0.06)';
      for (let gx = 0; gx < gridW; gx++) {
        for (let gy = 0; gy < gridH; gy++) {
          if (isCellBuildableFor(gx, gy, planet.seed, waterCoverage, selectedBuilding)) {
            const occupied = buildings.some((b) => b.x === gx && b.y === gy);
            if (!occupied) {
              const cell = gridCellToScreen(gx, gy, w, h);
              // Skip cells fully outside viewport
              if (cell.x + cell.w < 0 || cell.x > w || cell.y + cell.h < 0 || cell.y > h) continue;
              ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
            }
          }
        }
      }

      // Subtle grid lines (transformed for pan/zoom)
      const zoom = zoomRef.current;
      const panX = panRef.current.x * 0.001;
      const panY = panRef.current.y * 0.001;
      ctx.strokeStyle = 'rgba(68, 136, 170, 0.08)';
      ctx.lineWidth = 0.5;
      for (let gx = 0; gx <= gridW; gx++) {
        const uvX = (gx / gridW - 0.5 - panX) * zoom + 0.5;
        const sx = uvX * w;
        if (sx < -1 || sx > w + 1) continue;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, h);
        ctx.stroke();
      }
      for (let gy = 0; gy <= gridH; gy++) {
        const uvY = (0.5 - gy / gridH - panY) * zoom + 0.5;
        const sy = (1 - uvY) * h;
        if (sy < -1 || sy > h + 1) continue;
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(w, sy);
        ctx.stroke();
      }
    }, [selectedBuilding, buildings, planet.seed, waterCoverage, gridW, gridH, gridCellToScreen]);

    // Redraw overlay when state changes
    useEffect(() => {
      const canvas = overlayRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        drawOverlay();
      }
    }, [drawOverlay]);

    // Resize overlay canvas
    useEffect(() => {
      const handleResize = () => {
        const canvas = overlayRef.current;
        if (canvas) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          drawOverlay();
        }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [drawOverlay]);

    /* ================================================================ */
    /*  Imperative handle                                                */
    /* ================================================================ */

    /* ================================================================ */
    /*  Pan clamping — keep viewport within map bounds                    */
    /* ================================================================ */

    const clampPan = useCallback(() => {
      // |uPan| <= 0.5 - 0.5/zoom (UV space)
      // panRef stores pixel units, uPan = panRef * 0.001
      const maxPanUV = Math.max(0, 0.5 - 0.5 / zoomRef.current);
      const maxPanPx = maxPanUV / 0.001;
      panRef.current.x = Math.max(-maxPanPx, Math.min(maxPanPx, panRef.current.x));
      panRef.current.y = Math.max(-maxPanPx, Math.min(maxPanPx, panRef.current.y));
    }, []);

    useImperativeHandle(ref, () => ({
      zoomIn: () => { /* zoom disabled — only pan is supported */ },
      zoomOut: () => { /* zoom disabled — only pan is supported */ },
      startAIGeneration: () => {
        // No-op: procedural terrain, no AI generation needed
      },
      toggleBuildPanel: () => {
        setShowBuildPanel((prev) => !prev);
      },
      toggleMinimap: () => {
        setShowMinimap((prev) => !prev);
      },
    }), []);

    /* ================================================================ */
    /*  Input handlers (pan, zoom, building placement)                   */
    /* ================================================================ */

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      dragRef.current = { active: true, startX: e.clientX, startY: e.clientY };
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
      if (!dragRef.current.active) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      dragRef.current.startX = e.clientX;
      dragRef.current.startY = e.clientY;
      panRef.current.x -= dx;
      panRef.current.y += dy; // +dy: drag down → terrain follows down (natural grab)
      clampPan();
      drawOverlay();
    }, [drawOverlay]);

    const handleMouseUp = useCallback(() => {
      dragRef.current.active = false;
    }, []);

    /* Touch pan */
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        dragRef.current = { active: true, startX: e.touches[0].clientX, startY: e.touches[0].clientY };
      }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
      if (!dragRef.current.active || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - dragRef.current.startX;
      const dy = e.touches[0].clientY - dragRef.current.startY;
      dragRef.current.startX = e.touches[0].clientX;
      dragRef.current.startY = e.touches[0].clientY;
      panRef.current.x -= dx;
      panRef.current.y += dy; // +dy: drag down → terrain follows down (natural grab)
      clampPan();
      drawOverlay();
    }, [clampPan, drawOverlay]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
      dragRef.current.active = false;
      // Single tap → building placement
      if (e.changedTouches.length === 1 && selectedBuilding) {
        const touch = e.changedTouches[0];
        const canvas = overlayRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const cx = touch.clientX - rect.left;
        const cy = touch.clientY - rect.top;
        const panX = panRef.current.x * 0.001;
        const panY = panRef.current.y * 0.001;
        const zoom = zoomRef.current;
        const fracX = (cx / rect.width - 0.5) / zoom + 0.5 + panX;
        const fracY = 0.5 - ((1 - cy / rect.height - 0.5) / zoom + 0.5 - panY);
        const gridX = Math.floor(fracX * gridW);
        const gridY = Math.floor(fracY * gridH);
        if (gridX >= 0 && gridX < gridW && gridY >= 0 && gridY < gridH) {
          // Reuse handleClick logic via synthetic trigger — just dispatch same logic
          const synth = new MouseEvent('click', { clientX: touch.clientX, clientY: touch.clientY });
          canvas.dispatchEvent(synth);
        }
      }
    }, [selectedBuilding, gridW, gridH]);

    const handleClick = useCallback((e: React.MouseEvent) => {
      if (!selectedBuilding) return;

      const canvas = overlayRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      // Convert screen position to grid cell accounting for pan/zoom
      const panX = panRef.current.x * 0.001;
      const panY = panRef.current.y * 0.001;
      const zoom = zoomRef.current;
      // Screen → UV: uvX = screenX / w, uvY = 1 - screenY / h
      const uvX = cx / rect.width;
      const uvY = 1 - cy / rect.height;
      // UV → grid: reverse the transform used in gridCellToScreen
      // uvX = (gx/gridW - 0.5 - panX) * zoom + 0.5
      // gx/gridW = (uvX - 0.5) / zoom + 0.5 + panX
      const fracX = (uvX - 0.5) / zoom + 0.5 + panX;
      const fracY = 0.5 - ((uvY - 0.5) / zoom + 0.5 - panY);
      const gridX = Math.floor(fracX * gridW);
      const gridY = Math.floor(fracY * gridH);

      if (gridX < 0 || gridX >= gridW || gridY < 0 || gridY >= gridH) return;
      if (!isCellBuildableFor(gridX, gridY, planet.seed, waterCoverage, selectedBuilding)) return;

      const occupied = buildings.find((b) => b.x === gridX && b.y === gridY);
      if (occupied) return;

      const newBuilding: PlacedBuilding = {
        id: `bld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: selectedBuilding,
        x: gridX,
        y: gridY,
        level: 1,
        builtAt: new Date().toISOString(),
      };

      setBuildings((prev) => [...prev, newBuilding]);
      setSelectedBuilding(null);
      onBuildingPlaced?.(newBuilding.type);

      placeBuilding(playerId, planet.id, newBuilding).catch((err) => {
        console.error('Failed to save building:', err);
      });
    }, [selectedBuilding, buildings, planet.seed, planet.id, waterCoverage, playerId, onBuildingPlaced]);

    // Prevent page scroll on the canvas overlay (zoom is disabled, only panning)
    useEffect(() => {
      const canvas = overlayRef.current;
      if (!canvas) return;
      const onWheel = (e: WheelEvent) => { e.preventDefault(); };
      canvas.addEventListener('wheel', onWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', onWheel);
    }, []);

    /* ================================================================ */
    /*  Keyboard: Escape to close or cancel build                        */
    /* ================================================================ */

    useEffect(() => {
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (selectedBuilding) {
            setSelectedBuilding(null);
          } else {
            onClose();
          }
        }
      };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }, [onClose, selectedBuilding]);

    /* ================================================================ */
    /*  RENDER                                                           */
    /* ================================================================ */

    return (
      <div style={containerStyle}>
        {/* WebGL terrain canvas */}
        <div
          ref={mountRef}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
          }}
        />

        {/* Canvas 2D overlay (grid + buildings + zones) */}
        <canvas
          ref={overlayRef}
          style={{
            position: 'absolute', top: 0, left: 0,
            cursor: selectedBuilding ? 'crosshair' : 'default',
            touchAction: 'none',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />

        {/* Minimap (bottom-left overview with viewport rect) — always mounted for stable ref */}
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: 14,
            width: 200,
            height: 150,
            border: '1px solid rgba(68,136,170,0.4)',
            borderRadius: 4,
            overflow: 'hidden',
            zIndex: 10,
            background: 'rgba(5,10,20,0.85)',
            display: showMinimap ? 'block' : 'none',
          }}
        >
          {/* Minimap WebGL canvas */}
          <div
            ref={minimapMountRef}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          />
          {/* Minimap viewport rect overlay */}
          <canvas
            ref={minimapOverlayRef}
            width={200}
            height={150}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          />
        </div>

        {/* Minimap toggle button (left side, below scene controls) */}
        <button
          onClick={() => setShowMinimap((prev) => !prev)}
          title={showMinimap ? t('surface.hide_minimap') : t('surface.show_minimap')}
          style={{
            position: 'absolute',
            bottom: showMinimap ? 218 : 60,
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
            harvestMode={false}
            onToggleHarvest={() => {}}
            playerLevel={1}
          />
        )}
      </div>
    );
  },
);

export default SurfaceShaderView;
