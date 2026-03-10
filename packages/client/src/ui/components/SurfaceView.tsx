import React, { useEffect, useRef, useState, useCallback } from 'react';
import type {
  Planet, Star, SurfaceMap, SurfaceTile, SurfaceResourceDeposit,
  PlacedBuilding, BuildingType,
} from '@nebulife/core';
import {
  BUILDING_DEFS, canPlaceBuilding, SimplexNoise,
  generateSurfaceMap, generateResourceDeposits,
} from '@nebulife/core';
import { derivePlanetVisuals } from '../../game/rendering/PlanetVisuals.js';
import { SurfaceMapRenderer } from '../../game/rendering/SurfaceMapRenderer.js';
import { SurfaceHUD } from './SurfaceHUD.js';
import { BuildingPanel } from './BuildingPanel.js';
import {
  getBuildings, placeBuilding, removeBuilding,
  generateSurface, checkSurfaceStatus,
} from '../../api/surface-api.js';

interface SurfaceViewProps {
  planet: Planet;
  star: Star;
  playerId: string;
  onClose: () => void;
}

/**
 * Phases:
 * - 'procedural' — default, renders SurfaceMapRenderer canvas (works offline)
 * - 'generating' — AI generation in progress
 * - 'ai-ready'   — AI photo ready, shows image + clouds overlay
 * - 'error'      — AI failed, stays on procedural
 */
type SurfacePhase = 'procedural' | 'generating' | 'ai-ready' | 'error';

interface ZoneCell {
  x: number;
  y: number;
  terrain: string;
  buildable: boolean;
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: '#000510',
  zIndex: 9000,
  display: 'flex',
  flexDirection: 'column',
};

const imageContainerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0, left: 0,
  width: '100%', height: '100%',
  overflow: 'hidden',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SurfaceView({ planet, star, playerId, onClose }: SurfaceViewProps) {
  /* ---------- State ---------- */
  const [phase, setPhase] = useState<SurfacePhase>('procedural');
  const [surfaceMapId, setSurfaceMapId] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [zoneMap, setZoneMap] = useState<ZoneCell[] | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Building state
  const [buildings, setBuildings] = useState<PlacedBuilding[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
  const [showBuildPanel, setShowBuildPanel] = useState(true);

  // Procedural surface state
  const [hoveredTile, setHoveredTile] = useState<SurfaceTile | null>(null);
  const [hoveredResource, setHoveredResource] = useState<SurfaceResourceDeposit | null>(null);

  /* ---------- Refs ---------- */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cloudCanvasRef = useRef<HTMLCanvasElement>(null);
  const zoneCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const rafRef = useRef<number>(0);
  const rendererRef = useRef<SurfaceMapRenderer | null>(null);
  const surfaceMapRef = useRef<SurfaceMap | null>(null);
  const resourcesRef = useRef<SurfaceResourceDeposit[]>([]);
  const cloudNoiseRef = useRef<SimplexNoise | null>(null);
  const cloudOffsetRef = useRef(0);

  // Pan/zoom refs for AI mode
  const dragRef = useRef({ active: false, startX: 0, startY: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);

  // Grid dimensions for AI mode
  const GRID_WIDTH = 64;
  const GRID_HEIGHT = 36;

  /* ================================================================ */
  /*  PROCEDURAL MODE — init on mount                                  */
  /* ================================================================ */

  useEffect(() => {
    if (phase !== 'procedural') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Generate surface map + resources (deterministic, no API)
    const map = generateSurfaceMap(planet);
    const visuals = derivePlanetVisuals(planet, star);
    const resources = generateResourceDeposits(map, planet);

    surfaceMapRef.current = map;
    resourcesRef.current = resources;

    // Size canvas to window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create renderer
    const renderer = new SurfaceMapRenderer(canvas, map, visuals);
    renderer.setResources(resources);
    rendererRef.current = renderer;

    // Load buildings from server (non-blocking)
    loadBuildings().then((serverBuildings) => {
      renderer.setBuildings(serverBuildings);
      renderer.render();
    });

    // Initial render
    renderer.render();

    // Resize handler
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      renderer.render();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [phase, planet, star]);

  /* ================================================================ */
  /*  Load buildings from server                                       */
  /* ================================================================ */

  const loadBuildings = useCallback(async (): Promise<PlacedBuilding[]> => {
    try {
      const serverBuildings = await getBuildings(playerId, planet.id);
      setBuildings(serverBuildings);
      return serverBuildings;
    } catch (err) {
      console.error('Failed to load buildings:', err);
      return [];
    }
  }, [playerId, planet.id]);

  /* ================================================================ */
  /*  Procedural input handlers (pan, zoom, hover, click)              */
  /* ================================================================ */

  const handleProceduralMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY };
  }, []);

  const handleProceduralMouseMove = useCallback((e: React.MouseEvent) => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    if (dragRef.current.active) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      dragRef.current.startX = e.clientX;
      dragRef.current.startY = e.clientY;
      renderer.pan(dx, dy);
      renderer.render();
    }

    // Hover tile info
    const tile = renderer.screenToTile(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    if (tile) {
      const surfTile = renderer.getTile(tile.x, tile.y);
      setHoveredTile(surfTile);
      renderer.setHighlightedTile(tile);

      // Check for resource at this tile
      const resource = resourcesRef.current.find((r) => r.x === tile.x && r.y === tile.y);
      setHoveredResource(resource ?? null);
    } else {
      setHoveredTile(null);
      setHoveredResource(null);
      renderer.setHighlightedTile(null);
    }

    renderer.render();
  }, []);

  const handleProceduralMouseUp = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  const handleProceduralClick = useCallback((e: React.MouseEvent) => {
    if (!selectedBuilding) return;

    const renderer = rendererRef.current;
    const map = surfaceMapRef.current;
    if (!renderer || !map) return;

    const coord = renderer.screenToTile(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    if (!coord) return;

    const tile = renderer.getTile(coord.x, coord.y);
    if (!tile || !tile.buildable) return;

    // Check if occupied
    const occupied = buildings.find((b) => b.x === coord.x && b.y === coord.y);
    if (occupied) return;

    const newBuilding: PlacedBuilding = {
      id: `bld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: selectedBuilding,
      x: coord.x,
      y: coord.y,
      level: 1,
      builtAt: new Date().toISOString(),
    };

    setBuildings((prev) => {
      const updated = [...prev, newBuilding];
      renderer.setBuildings(updated);
      renderer.render();
      return updated;
    });
    setSelectedBuilding(null);

    // Persist to server
    placeBuilding(playerId, planet.id, newBuilding).catch((err) => {
      console.error('Failed to save building:', err);
    });
  }, [selectedBuilding, buildings, playerId, planet.id]);

  const handleProceduralWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const renderer = rendererRef.current;
    if (!renderer) return;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    renderer.setZoom(renderer.getZoom() * delta);
    renderer.render();
  }, []);

  /* ================================================================ */
  /*  AI generation — triggered by button click only                   */
  /* ================================================================ */

  const startAIGeneration = useCallback(async () => {
    try {
      setPhase('generating');
      setProgress(0);
      setError(null);

      const response = await generateSurface({
        playerId,
        planetId: planet.id,
        systemId: planet.id.split('_')[0],
        planetData: planet,
        starData: star,
      });

      setSurfaceMapId(response.surfaceMapId);
      pollSurfaceGeneration(response.surfaceMapId);
    } catch (err) {
      console.error('Surface generation error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPhase('error');
    }
  }, [playerId, planet, star]);

  const pollSurfaceGeneration = useCallback(async (mapId: string) => {
    let attempts = 0;
    const maxAttempts = 120;

    const poll = async () => {
      try {
        const status = await checkSurfaceStatus(mapId);

        if (status.status === 'ready') {
          setPhotoUrl(status.photoUrl || null);
          setZoneMap(status.zoneMap?.zones || null);
          setPhase('ai-ready');
          loadBuildings();
        } else if (status.status === 'generating' || status.status === 'analyzing') {
          setProgress(status.progress || 0);
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000);
          } else {
            setError('Timeout');
            setPhase('error');
          }
        } else if (status.status === 'failed') {
          setError(status.error || 'Failed');
          setPhase('error');
        }
      } catch (err) {
        console.error('Poll error:', err);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setError('Failed to poll status');
          setPhase('error');
        }
      }
    };

    poll();
  }, [loadBuildings]);

  /* ================================================================ */
  /*  AI-ready: Cloud animation                                        */
  /* ================================================================ */

  useEffect(() => {
    if (phase !== 'ai-ready') return;

    const cloudCanvas = cloudCanvasRef.current;
    if (!cloudCanvas) return;

    if (!cloudNoiseRef.current) {
      cloudNoiseRef.current = new SimplexNoise(planet.seed);
    }

    cloudCanvas.width = window.innerWidth;
    cloudCanvas.height = window.innerHeight;

    const renderClouds = () => {
      const ctx = cloudCanvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, cloudCanvas.width, cloudCanvas.height);

      const cloudNoise = cloudNoiseRef.current!;
      const scale = 0.003;
      const offset = cloudOffsetRef.current;

      const imageData = ctx.createImageData(cloudCanvas.width, cloudCanvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const pixelIndex = i / 4;
        const x = pixelIndex % cloudCanvas.width;
        const y = Math.floor(pixelIndex / cloudCanvas.width);

        const noise = Math.abs(cloudNoise.noise2D((x + offset) * scale, y * scale));
        const alpha = Math.max(0, (noise - 0.4) * 255);

        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = alpha;
      }

      ctx.putImageData(imageData, 0, 0);
      cloudOffsetRef.current += 5;
      rafRef.current = requestAnimationFrame(renderClouds);
    };

    renderClouds();

    const handleResize = () => {
      cloudCanvas.width = window.innerWidth;
      cloudCanvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [phase, planet.seed]);

  /* ================================================================ */
  /*  AI-ready: Zone overlay rendering                                 */
  /* ================================================================ */

  useEffect(() => {
    if (phase !== 'ai-ready' || !zoneMap) return;

    const zoneCanvas = zoneCanvasRef.current;
    if (!zoneCanvas) return;

    zoneCanvas.width = window.innerWidth;
    zoneCanvas.height = window.innerHeight;

    const ctx = zoneCanvas.getContext('2d');
    if (!ctx) return;

    const cellWidth = zoneCanvas.width / GRID_WIDTH;
    const cellHeight = zoneCanvas.height / GRID_HEIGHT;

    zoneMap.forEach((cell) => {
      if (cell.buildable) {
        ctx.fillStyle = 'rgba(100, 200, 100, 0.05)';
        ctx.fillRect(cell.x * cellWidth, cell.y * cellHeight, cellWidth, cellHeight);
      }
    });
  }, [phase, zoneMap]);

  /* ================================================================ */
  /*  AI-ready: Input handlers (pan, zoom, click on image)             */
  /* ================================================================ */

  const handleAIMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY };
  }, []);

  const handleAIMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragRef.current.active) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      dragRef.current.startX = e.clientX;
      dragRef.current.startY = e.clientY;

      panRef.current.x += dx;
      panRef.current.y += dy;

      const image = imageRef.current;
      if (image) {
        image.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoomRef.current})`;
      }
    }
  }, []);

  const handleAIMouseUp = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  const handleAIClick = useCallback((e: React.MouseEvent) => {
    if (!selectedBuilding || !zoneMap) return;

    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const imageX = e.clientX - rect.left;
    const imageY = e.clientY - rect.top;

    const gridX = Math.floor((imageX / rect.width) * GRID_WIDTH);
    const gridY = Math.floor((imageY / rect.height) * GRID_HEIGHT);

    if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) return;

    const zone = zoneMap.find((z) => z.x === gridX && z.y === gridY);
    if (!zone || !zone.buildable) return;

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

    placeBuilding(playerId, planet.id, newBuilding).catch((err) => {
      console.error('Failed to save building:', err);
    });
  }, [selectedBuilding, buildings, playerId, planet.id, zoneMap]);

  const handleAIWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    zoomRef.current *= delta;
    zoomRef.current = Math.max(0.5, Math.min(3, zoomRef.current));

    const image = imageRef.current;
    if (image) {
      image.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoomRef.current})`;
    }
  }, []);

  /* ================================================================ */
  /*  Keyboard: Escape to close                                        */
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
  /*  RENDER: Generating phase — loader                                */
  /* ================================================================ */

  if (phase === 'generating') {
    return (
      <div style={containerStyle}>
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(ellipse at center, #0d1b2a 0%, #000 100%)',
            zIndex: 200,
          }}
        >
          <div style={{ textAlign: 'center', fontFamily: 'monospace', color: '#7bb8ff', maxWidth: 400 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#128248;</div>
            <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 24 }}>
              AI-знімок поверхні
            </div>
            <div style={{ fontSize: 14, color: '#aaccff', marginBottom: 24 }}>
              Генеруємо супутниковий знімок планети...
            </div>
            <div style={{
              width: 200, height: 8,
              background: 'rgba(123, 184, 255, 0.1)',
              borderRadius: 4, overflow: 'hidden',
              margin: '0 auto 12px',
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, #4488ff, #7bb8ff)',
                width: `${Math.min(progress, 100)}%`,
                transition: 'width 0.3s',
              }} />
            </div>
            <div style={{ fontSize: 12, color: '#667788' }}>
              {progress > 0 ? `${progress}%` : 'Очікування...'}
            </div>
            <div style={{ fontSize: 11, color: '#445566', marginTop: 16 }}>
              Зазвичай ~3-5 хвилин
            </div>
            <button
              onClick={() => setPhase('procedural')}
              style={{
                marginTop: 24,
                padding: '6px 16px',
                background: 'rgba(100, 140, 200, 0.15)',
                border: '1px solid rgba(100, 140, 200, 0.3)',
                borderRadius: 4, color: '#8899aa',
                fontFamily: 'monospace', fontSize: 12,
                cursor: 'pointer',
              }}
            >
              &#8592; Повернутись до карти
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  RENDER: Error phase — show error + back to procedural            */
  /* ================================================================ */

  if (phase === 'error') {
    return (
      <div style={containerStyle}>
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(ellipse at center, #0d1b2a 0%, #000 100%)',
            zIndex: 200,
          }}
        >
          <div style={{ textAlign: 'center', fontFamily: 'monospace', color: '#ff6b6b', maxWidth: 400 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#9888;&#65039;</div>
            <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
              Помилка генерації AI-знімку
            </div>
            <div style={{ fontSize: 14, marginBottom: 24, color: '#ffaaaa' }}>{error}</div>
            <button
              onClick={() => setPhase('procedural')}
              style={{
                padding: '8px 24px',
                background: 'rgba(100, 140, 200, 0.15)',
                border: '1px solid rgba(100, 140, 200, 0.3)',
                color: '#8899aa', borderRadius: 6,
                cursor: 'pointer', fontFamily: 'monospace', fontSize: 14,
              }}
            >
              &#8592; Повернутись до карти
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  RENDER: AI-ready phase — photo + clouds + zones                  */
  /* ================================================================ */

  if (phase === 'ai-ready') {
    return (
      <div style={containerStyle}>
        {/* Background image */}
        <div style={imageContainerStyle}>
          {photoUrl && (
            <img
              ref={imageRef}
              src={photoUrl}
              alt="Planet surface"
              style={{
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: '100%',
                objectFit: 'cover',
                transformOrigin: '0 0',
                transform: `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoomRef.current})`,
                transition: 'transform 0.05s',
              }}
            />
          )}
        </div>

        {/* Cloud overlay */}
        <canvas
          ref={cloudCanvasRef}
          style={{
            position: 'absolute', top: 0, left: 0,
            opacity: 0.15, pointerEvents: 'none',
          }}
        />

        {/* Zone overlay */}
        <canvas
          ref={zoneCanvasRef}
          style={{
            position: 'absolute', top: 0, left: 0,
            cursor: selectedBuilding ? 'crosshair' : 'default',
          }}
          onMouseDown={handleAIMouseDown}
          onMouseMove={handleAIMouseMove}
          onMouseUp={handleAIMouseUp}
          onMouseLeave={handleAIMouseUp}
          onClick={handleAIClick}
          onWheel={handleAIWheel}
        />

        {/* HUD */}
        <SurfaceHUD
          planetName={planet.name}
          hoveredTile={null}
          hoveredResource={null}
          buildingCount={buildings.length}
          onClose={onClose}
        />

        {/* Building panel toggle */}
        {!showBuildPanel && (
          <button
            onClick={() => setShowBuildPanel(true)}
            style={{
              position: 'absolute', right: 12, top: 56,
              background: 'rgba(10, 20, 40, 0.8)',
              border: '1px solid rgba(60, 100, 160, 0.3)',
              borderRadius: 4, padding: '6px 12px',
              color: '#8899aa', fontFamily: 'monospace',
              fontSize: 12, cursor: 'pointer',
              zIndex: 100, pointerEvents: 'auto',
            }}
          >
            Будівлі &#9656;
          </button>
        )}

        {/* Building panel */}
        {showBuildPanel && (
          <BuildingPanel
            selectedBuilding={selectedBuilding}
            onSelectBuilding={setSelectedBuilding}
            onClose={() => setShowBuildPanel(false)}
          />
        )}

        {/* Back to procedural button */}
        <button
          onClick={() => setPhase('procedural')}
          style={{
            position: 'absolute', left: 16, bottom: 16,
            padding: '6px 14px',
            background: 'rgba(10, 20, 40, 0.8)',
            border: '1px solid rgba(60, 100, 160, 0.3)',
            borderRadius: 4, color: '#8899aa',
            fontFamily: 'monospace', fontSize: 12,
            cursor: 'pointer', zIndex: 100,
          }}
        >
          &#127758; Процедурна карта
        </button>
      </div>
    );
  }

  /* ================================================================ */
  /*  RENDER: Procedural phase (DEFAULT) — canvas + HUD                */
  /* ================================================================ */

  return (
    <div style={containerStyle}>
      {/* Procedural terrain canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute', top: 0, left: 0,
          cursor: selectedBuilding ? 'crosshair' : 'grab',
        }}
        onMouseDown={handleProceduralMouseDown}
        onMouseMove={handleProceduralMouseMove}
        onMouseUp={handleProceduralMouseUp}
        onMouseLeave={handleProceduralMouseUp}
        onClick={handleProceduralClick}
        onWheel={handleProceduralWheel}
      />

      {/* HUD */}
      <SurfaceHUD
        planetName={planet.name}
        hoveredTile={hoveredTile}
        hoveredResource={hoveredResource}
        buildingCount={buildings.length}
        onClose={onClose}
      />

      {/* AI snapshot button */}
      <button
        onClick={startAIGeneration}
        style={{
          position: 'absolute', left: 16, bottom: 16,
          padding: '8px 16px',
          background: 'linear-gradient(135deg, rgba(30, 60, 120, 0.8), rgba(60, 100, 180, 0.6))',
          border: '1px solid rgba(100, 160, 255, 0.4)',
          borderRadius: 6, color: '#aaccff',
          fontFamily: 'monospace', fontSize: 13,
          cursor: 'pointer', zIndex: 100,
          boxShadow: '0 2px 12px rgba(60, 120, 200, 0.2)',
          transition: 'all 0.2s',
        }}
        title="Згенерувати AI-знімок планети (10 кварків)"
      >
        &#128248; AI Знімок
      </button>

      {/* Building panel toggle */}
      {!showBuildPanel && (
        <button
          onClick={() => setShowBuildPanel(true)}
          style={{
            position: 'absolute', right: 12, top: 56,
            background: 'rgba(10, 20, 40, 0.8)',
            border: '1px solid rgba(60, 100, 160, 0.3)',
            borderRadius: 4, padding: '6px 12px',
            color: '#8899aa', fontFamily: 'monospace',
            fontSize: 12, cursor: 'pointer',
            zIndex: 100, pointerEvents: 'auto',
          }}
        >
          Будівлі &#9656;
        </button>
      )}

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
}

export default SurfaceView;
