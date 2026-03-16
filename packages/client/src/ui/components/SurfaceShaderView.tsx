import React, {
  useEffect, useRef, useState, useCallback,
  forwardRef, useImperativeHandle,
} from 'react';
import * as THREE from 'three';
import type {
  Planet, Star, PlacedBuilding, BuildingType,
} from '@nebulife/core';
import { derivePlanetVisuals } from '../../game/rendering/PlanetVisuals.js';
import { BuildingPanel } from './BuildingPanel.js';
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
}

interface SurfaceShaderViewProps {
  planet: Planet;
  star: Star;
  playerId: string;
  onClose: () => void;
  onBuildingCountChange?: (count: number) => void;
  onBuildingPlaced?: () => void;
  onPhaseChange?: (phase: SurfacePhase) => void;
  onBuildPanelChange?: (open: boolean) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const GRID_W = 64;
const GRID_H = 36;

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

/** Determine if a grid cell is buildable based on elevation noise */
function isCellBuildable(
  x: number, y: number, seed: number, waterLevel: number,
): boolean {
  // Simplified deterministic check: hash grid coords + seed
  const h1 = Math.sin(x * 127.1 + y * 311.7 + seed * 0.1) * 43758.5453;
  const elevation = (h1 - Math.floor(h1));
  // Must be above water and below mountain threshold
  const waterThresh = waterLevel * 0.65 + 0.1;
  return elevation > waterThresh + 0.04 && elevation < waterThresh + 0.55;
}

/* ------------------------------------------------------------------ */
/*  Building sprites — PNG loading with procedural fallback            */
/* ------------------------------------------------------------------ */

const SPRITE_SIZE = { w: 256, h: 384 }; // Source sprite dimensions

type BuildingTypeKey =
  | 'colony_hub' | 'mine' | 'solar_plant' | 'research_lab'
  | 'water_extractor' | 'greenhouse' | 'observatory';

const spriteCache = new Map<string, HTMLImageElement>();
const spriteLoading = new Set<string>();

function getSpriteKey(type: string, tier: number): string {
  return `${type}_t${tier}`;
}

function loadSprite(type: string, tier: number): HTMLImageElement | null {
  const key = getSpriteKey(type, tier);
  const cached = spriteCache.get(key);
  if (cached) return cached;

  if (spriteLoading.has(key)) return null; // Still loading
  spriteLoading.add(key);

  const img = new Image();
  img.src = `/sprites/buildings/${key}.png`;
  img.onload = () => {
    spriteCache.set(key, img);
    spriteLoading.delete(key);
  };
  img.onerror = () => {
    spriteLoading.delete(key);
    // No sprite found — procedural fallback will be used
  };

  return null;
}

/** Procedural icon fallback (canvas primitives per building type) */
function drawProceduralIcon(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number,
  type: string, level: number,
) {
  const s = size * 0.4; // Icon size

  const colors: Record<string, string> = {
    colony_hub: '#44ff88',
    mine: '#ff8844',
    solar_plant: '#ffcc44',
    research_lab: '#4488ff',
    water_extractor: '#44ccff',
    greenhouse: '#88ff44',
    observatory: '#cc88ff',
  };
  const col = colors[type] ?? '#aabbcc';

  ctx.save();
  ctx.fillStyle = col;
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;

  switch (type) {
    case 'colony_hub': {
      // House shape
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.9);
      ctx.lineTo(cx + s * 0.7, cy - s * 0.2);
      ctx.lineTo(cx + s * 0.7, cy + s * 0.5);
      ctx.lineTo(cx - s * 0.7, cy + s * 0.5);
      ctx.lineTo(cx - s * 0.7, cy - s * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'mine': {
      // Pickaxe-like triangle
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.7);
      ctx.lineTo(cx + s * 0.6, cy + s * 0.5);
      ctx.lineTo(cx - s * 0.6, cy + s * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'solar_plant': {
      // Diamond shape
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.7);
      ctx.lineTo(cx + s * 0.6, cy);
      ctx.lineTo(cx, cy + s * 0.7);
      ctx.lineTo(cx - s * 0.6, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'research_lab': {
      // Rounded rect (flask-like)
      const rr = s * 0.55;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Inner dot
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(cx, cy, rr * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'water_extractor': {
      // Droplet shape
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.8);
      ctx.quadraticCurveTo(cx + s * 0.7, cy, cx, cy + s * 0.6);
      ctx.quadraticCurveTo(cx - s * 0.7, cy, cx, cy - s * 0.8);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'greenhouse': {
      // Half-dome
      ctx.beginPath();
      ctx.arc(cx, cy + s * 0.1, s * 0.6, Math.PI, 0);
      ctx.lineTo(cx + s * 0.6, cy + s * 0.5);
      ctx.lineTo(cx - s * 0.6, cy + s * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'observatory': {
      // Dome + cylinder
      ctx.beginPath();
      ctx.arc(cx, cy - s * 0.2, s * 0.45, Math.PI, 0);
      ctx.lineTo(cx + s * 0.35, cy + s * 0.5);
      ctx.lineTo(cx - s * 0.35, cy + s * 0.5);
      ctx.lineTo(cx - s * 0.45, cy - s * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    default: {
      ctx.fillRect(cx - s * 0.5, cy - s * 0.5, s, s);
      ctx.strokeRect(cx - s * 0.5, cy - s * 0.5, s, s);
    }
  }

  // Level indicator (small dots)
  if (level > 1) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const dotR = 2;
    const dotY = cy + s * 0.7;
    const totalW = (level - 1) * 6;
    for (let i = 0; i < level && i < 5; i++) {
      ctx.beginPath();
      ctx.arc(cx - totalW * 0.5 + i * 6, dotY, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/** Short building label for overlay */
const BUILDING_SHORT_NAMES: Record<string, string> = {
  colony_hub: 'Центр',
  mine: 'Шахта',
  solar_plant: 'Енергія',
  research_lab: 'Лаб.',
  water_extractor: 'Вода',
  greenhouse: 'Теплиця',
  observatory: 'Обс.',
};

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
    /* ---------- State ---------- */
    const [phase, setPhase] = useState<SurfacePhase>('ready');
    const [buildings, setBuildings] = useState<PlacedBuilding[]>([]);
    const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
    const [showBuildPanel, setShowBuildPanel] = useState(true);

    /* ---------- Refs ---------- */
    const mountRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const materialRef = useRef<THREE.ShaderMaterial | null>(null);
    const rafRef = useRef(0);

    // Pan/zoom state
    const panRef = useRef({ x: 0, y: 0 });
    const zoomRef = useRef(1);
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
        },
      });
      materialRef.current = material;

      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      // Animation loop
      const startTime = performance.now();
      const animate = () => {
        rafRef.current = requestAnimationFrame(animate);
        material.uniforms.uTime.value = (performance.now() - startTime) * 0.001;
        material.uniforms.uPan.value.set(panRef.current.x * 0.001, panRef.current.y * 0.001);
        material.uniforms.uZoom.value = zoomRef.current;
        renderer.render(scene, camera);
      };
      animate();

      // Resize handler
      const handleResize = () => {
        const rw = mount.clientWidth;
        const rh = mount.clientHeight;
        renderer.setSize(rw, rh);
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
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planet.seed]);

    /* ================================================================ */
    /*  Canvas 2D overlay — grid + buildings + zone highlights           */
    /* ================================================================ */

    const drawOverlay = useCallback(() => {
      const canvas = overlayRef.current;
      if (!canvas) return;

      const w = canvas.width;
      const h = canvas.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      const cellW = w / GRID_W;
      const cellH = h / GRID_H;

      // Draw buildable zone highlights in build mode
      if (selectedBuilding) {
        ctx.fillStyle = 'rgba(68, 255, 136, 0.06)';
        for (let gx = 0; gx < GRID_W; gx++) {
          for (let gy = 0; gy < GRID_H; gy++) {
            if (isCellBuildable(gx, gy, planet.seed, waterCoverage)) {
              const occupied = buildings.some((b) => b.x === gx && b.y === gy);
              if (!occupied) {
                ctx.fillRect(gx * cellW, gy * cellH, cellW, cellH);
              }
            }
          }
        }
      }

      // Subtle grid lines (only in build mode)
      if (selectedBuilding) {
        ctx.strokeStyle = 'rgba(68, 136, 170, 0.08)';
        ctx.lineWidth = 0.5;
        for (let gx = 0; gx <= GRID_W; gx++) {
          ctx.beginPath();
          ctx.moveTo(gx * cellW, 0);
          ctx.lineTo(gx * cellW, h);
          ctx.stroke();
        }
        for (let gy = 0; gy <= GRID_H; gy++) {
          ctx.beginPath();
          ctx.moveTo(0, gy * cellH);
          ctx.lineTo(w, gy * cellH);
          ctx.stroke();
        }
      }

      // Draw placed buildings (shadow -> sprite/icon -> label)
      const iconSize = Math.max(cellW, cellH) * 1.2;
      buildings.forEach((b) => {
        const cx = b.x * cellW + cellW * 0.5;
        const cy = b.y * cellH + cellH * 0.5;

        // Shadow ellipse (offset toward lower-right, simulating upper-left sun)
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(cx + 4, cy + 5, iconSize * 0.45, iconSize * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Try PNG sprite first, fall back to procedural icon
        const sprite = loadSprite(b.type, b.level);
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
          // Draw sprite anchored at bottom-center
          const drawH = iconSize * 1.5;
          const drawW = drawH * (SPRITE_SIZE.w / SPRITE_SIZE.h);
          ctx.drawImage(sprite, cx - drawW * 0.5, cy - drawH + iconSize * 0.3, drawW, drawH);
        } else {
          // Procedural icon fallback
          drawProceduralIcon(ctx, cx, cy - iconSize * 0.1, iconSize, b.type, b.level);
        }

        // Label: building short name + level
        const label = BUILDING_SHORT_NAMES[b.type] ?? b.type;
        const levelStr = b.level > 1 ? ` Lv.${b.level}` : '';
        ctx.save();
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        // Text shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillText(label + levelStr, cx + 1, cy + iconSize * 0.55 + 1);
        // Text
        ctx.fillStyle = '#aabbcc';
        ctx.fillText(label + levelStr, cx, cy + iconSize * 0.55);
        ctx.restore();
      });
    }, [selectedBuilding, buildings, planet.seed, waterCoverage]);

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

    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        zoomRef.current = Math.min(4, zoomRef.current * 1.2);
      },
      zoomOut: () => {
        zoomRef.current = Math.max(0.3, zoomRef.current * 0.8);
      },
      startAIGeneration: () => {
        // No-op: procedural terrain, no AI generation needed
      },
      toggleBuildPanel: () => {
        setShowBuildPanel((prev) => !prev);
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
      panRef.current.x += dx;
      panRef.current.y += dy;
      drawOverlay();
    }, [drawOverlay]);

    const handleMouseUp = useCallback(() => {
      dragRef.current.active = false;
    }, []);

    const handleClick = useCallback((e: React.MouseEvent) => {
      if (!selectedBuilding) return;

      const canvas = overlayRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      const gridX = Math.floor((cx / rect.width) * GRID_W);
      const gridY = Math.floor((cy / rect.height) * GRID_H);

      if (gridX < 0 || gridX >= GRID_W || gridY < 0 || gridY >= GRID_H) return;
      if (!isCellBuildable(gridX, gridY, planet.seed, waterCoverage)) return;

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
      onBuildingPlaced?.();

      placeBuilding(playerId, planet.id, newBuilding).catch((err) => {
        console.error('Failed to save building:', err);
      });
    }, [selectedBuilding, buildings, planet.seed, planet.id, waterCoverage, playerId, onBuildingPlaced]);

    // Native wheel listener (non-passive) to allow preventDefault without warnings
    useEffect(() => {
      const canvas = overlayRef.current;
      if (!canvas) return;
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        zoomRef.current = Math.max(0.3, Math.min(4, zoomRef.current * delta));
      };
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
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
        />

        {/* Building panel */}
        {showBuildPanel && (
          <BuildingPanel
            selectedBuilding={selectedBuilding}
            onSelectBuilding={setSelectedBuilding}
            onClose={() => setShowBuildPanel(false)}
          />
        )}
      </div>
    );
  },
);

export default SurfaceShaderView;
