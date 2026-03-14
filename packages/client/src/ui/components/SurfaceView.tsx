import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import type {
  Planet, Star, PlacedBuilding, BuildingType,
} from '@nebulife/core';
import { SimplexNoise } from '@nebulife/core';
import { BuildingPanel } from './BuildingPanel.js';
import {
  getBuildings, placeBuilding,
  generateSurface, checkSurfaceStatus,
} from '../../api/surface-api.js';

/**
 * Phases:
 * - 'generating' — AI generation in progress
 * - 'ai-ready'   — AI photo ready, shows image + clouds overlay
 * - 'error'      — AI failed
 */
export type SurfacePhase = 'generating' | 'ai-ready' | 'error';

/** Methods exposed to parent via ref for CommandBar integration */
export interface SurfaceViewHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  startAIGeneration: () => void;
  toggleBuildPanel: () => void;
}

interface SurfaceViewProps {
  planet: Planet;
  star: Star;
  playerId: string;
  onClose: () => void;
  onBuildingCountChange?: (count: number) => void;
  onBuildingPlaced?: () => void;
  onPhaseChange?: (phase: SurfacePhase) => void;
  onBuildPanelChange?: (open: boolean) => void;
}

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

export const SurfaceView = forwardRef<SurfaceViewHandle, SurfaceViewProps>(function SurfaceView(
  {
    planet, star, playerId, onClose,
    onBuildingCountChange, onBuildingPlaced, onPhaseChange, onBuildPanelChange,
  },
  ref
) {
  /* ---------- State ---------- */
  const [phase, setPhase] = useState<SurfacePhase>('generating');
  const [surfaceMapId, setSurfaceMapId] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [zoneMap, setZoneMap] = useState<ZoneCell[] | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Building state
  const [buildings, setBuildings] = useState<PlacedBuilding[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
  const [showBuildPanel, setShowBuildPanel] = useState(true);

  /* ---------- Refs ---------- */
  const cloudCanvasRef = useRef<HTMLCanvasElement>(null);
  const zoneCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const rafRef = useRef<number>(0);
  const cloudNoiseRef = useRef<SimplexNoise | null>(null);
  const cloudOffsetRef = useRef(0);

  // Pan/zoom refs for AI mode
  const dragRef = useRef({ active: false, startX: 0, startY: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);

  // Grid dimensions for AI mode
  const GRID_WIDTH = 64;
  const GRID_HEIGHT = 36;

  // Track whether AI generation has been started
  const generationStarted = useRef(false);

  /* ================================================================ */
  /*  Callback effects — notify parent of state changes               */
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
  /*  AI generation — triggered on mount or via ref from CommandBar    */
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
  /*  Auto-start AI generation on mount                                */
  /* ================================================================ */

  // AI generation disabled — will be replaced with 2.5D fields
  // useEffect(() => {
  //   if (!generationStarted.current) {
  //     generationStarted.current = true;
  //     startAIGeneration();
  //   }
  // }, [startAIGeneration]);

  /* ================================================================ */
  /*  Imperative handle — expose methods to parent via ref            */
  /* ================================================================ */

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (phase === 'ai-ready') {
        zoomRef.current = Math.min(3, zoomRef.current * 1.2);
        const image = imageRef.current;
        if (image) {
          image.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoomRef.current})`;
        }
      }
    },
    zoomOut: () => {
      if (phase === 'ai-ready') {
        zoomRef.current = Math.max(0.5, zoomRef.current * 0.8);
        const image = imageRef.current;
        if (image) {
          image.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoomRef.current})`;
        }
      }
    },
    startAIGeneration: () => {
      startAIGeneration();
    },
    toggleBuildPanel: () => {
      setShowBuildPanel((prev) => !prev);
    },
  }), [phase, startAIGeneration]);

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

    // Only draw zone overlay when a building is selected (build mode)
    if (!selectedBuilding) {
      ctx.clearRect(0, 0, zoneCanvas.width, zoneCanvas.height);
      return;
    }

    const cellWidth = zoneCanvas.width / GRID_WIDTH;
    const cellHeight = zoneCanvas.height / GRID_HEIGHT;

    zoneMap.forEach((cell) => {
      if (cell.buildable) {
        ctx.fillStyle = 'rgba(100, 200, 100, 0.05)';
        ctx.fillRect(cell.x * cellWidth, cell.y * cellHeight, cellWidth, cellHeight);
      }
    });
  }, [phase, zoneMap, selectedBuilding]);

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
    onBuildingPlaced?.();

    placeBuilding(playerId, planet.id, newBuilding).catch((err) => {
      console.error('Failed to save building:', err);
    });
  }, [selectedBuilding, buildings, playerId, planet.id, zoneMap, onBuildingPlaced]);

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
          <div style={{ textAlign: 'center', fontFamily: 'monospace', color: '#667788', maxWidth: 400 }}>
            <div style={{ fontSize: 14, marginBottom: 16 }}>
              Поверхня в розробці
            </div>
            <div style={{ fontSize: 11, color: '#445566' }}>
              Скоро тут будуть 2.5D поля
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  RENDER: Error phase — show error + retry                         */
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
              Збій передачі даних з супутника
            </div>
            <div style={{ fontSize: 14, marginBottom: 24, color: '#ffaaaa' }}>{error}</div>
            <button
              onClick={() => startAIGeneration()}
              style={{
                padding: '8px 24px',
                background: 'rgba(100, 140, 200, 0.15)',
                border: '1px solid rgba(100, 140, 200, 0.3)',
                color: '#8899aa', borderRadius: 6,
                cursor: 'pointer', fontFamily: 'monospace', fontSize: 14,
              }}
            >
              Спробувати знову
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  RENDER: AI-ready phase — photo + clouds + zones                  */
  /* ================================================================ */

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
});

export default SurfaceView;
