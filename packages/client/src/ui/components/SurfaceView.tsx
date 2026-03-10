import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Planet, Star, PlacedBuilding, BuildingType } from '@nebulife/core';
import { BUILDING_DEFS, canPlaceBuilding, SimplexNoise } from '@nebulife/core';
import { SurfaceHUD } from './SurfaceHUD.js';
import { BuildingPanel } from './BuildingPanel.js';
import { getBuildings, placeBuilding, removeBuilding, generateSurface, checkSurfaceStatus } from '../../api/surface-api.js';

interface SurfaceViewProps {
  planet: Planet;
  star: Star;
  playerId: string;
  onClose: () => void;
}

type GenerationPhase = 'check' | 'prompt_generation' | 'generating' | 'ready' | 'error';

interface ZoneCell {
  x: number;
  y: number;
  terrain: string;
  buildable: boolean;
}

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: '#000510',
  zIndex: 9000,
  display: 'flex',
  flexDirection: 'column',
};

const imageContainerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  overflow: 'hidden',
};

export function SurfaceView({ planet, star, playerId, onClose }: SurfaceViewProps) {
  // Surface generation state
  const [phase, setPhase] = useState<GenerationPhase>('check');
  const [surfaceMapId, setSurfaceMapId] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [zoneMap, setZoneMap] = useState<ZoneCell[] | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Building state
  const [buildings, setBuildings] = useState<PlacedBuilding[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
  const [showBuildPanel, setShowBuildPanel] = useState(true);

  // Canvas references
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cloudCanvasRef = useRef<HTMLCanvasElement>(null);
  const zoneCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const rafRef = useRef<number>(0);
  const cloudNoiseRef = useRef<SimplexNoise | null>(null);
  const cloudOffsetRef = useRef(0);

  // Pan/zoom state
  const dragRef = useRef({ active: false, startX: 0, startY: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);

  // Grid dimensions
  const GRID_WIDTH = 64;
  const GRID_HEIGHT = 36;

  // Initialize and check for existing surface
  useEffect(() => {
    const initSurface = async () => {
      try {
        setPhase('check');

        // TODO: In a real implementation, we'd first check if surface already exists
        // For now, start generation immediately

        setPhase('generating');

        const response = await generateSurface({
          playerId,
          planetId: planet.id,
          systemId: planet.id.split('_')[0], // Extract system ID from planet ID
          planetData: planet,
          starData: star,
        });

        setSurfaceMapId(response.surfaceMapId);

        // Start polling for completion
        pollSurfaceGeneration(response.surfaceMapId);
      } catch (err) {
        console.error('Surface initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize surface');
        setPhase('error');
      }
    };

    initSurface();
  }, [planet, star, playerId]);

  // Poll for surface generation completion
  const pollSurfaceGeneration = useCallback(async (mapId: string) => {
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes at 5s intervals

    const poll = async () => {
      try {
        const status = await checkSurfaceStatus(mapId);

        if (status.status === 'ready') {
          setPhotoUrl(status.photoUrl || null);
          setZoneMap(status.zoneMap?.zones || null);
          setPhase('ready');

          // Load buildings once surface is ready
          loadBuildings();
        } else if (status.status === 'generating') {
          setProgress(status.progress || 0);
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000); // Poll every 5 seconds
          } else {
            setError('Surface generation timeout');
            setPhase('error');
          }
        } else if (status.status === 'failed') {
          setError(status.error || 'Surface generation failed');
          setPhase('error');
        }
      } catch (err) {
        console.error('Poll error:', err);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setError('Failed to poll surface status');
          setPhase('error');
        }
      }
    };

    poll();
  }, []);

  // Load buildings from server
  const loadBuildings = useCallback(async () => {
    try {
      const serverBuildings = await getBuildings(playerId, planet.id);
      setBuildings(serverBuildings);
    } catch (err) {
      console.error('Failed to load buildings:', err);
    }
  }, [playerId, planet.id]);

  // Draw cloud overlay on canvas
  useEffect(() => {
    if (phase !== 'ready') return;

    const cloudCanvas = cloudCanvasRef.current;
    if (!cloudCanvas) return;

    // Initialize simplex noise for clouds
    if (!cloudNoiseRef.current) {
      cloudNoiseRef.current = new SimplexNoise(planet.seed);
    }

    // Set up cloud canvas
    cloudCanvas.width = window.innerWidth;
    cloudCanvas.height = window.innerHeight;

    const renderClouds = () => {
      const ctx = cloudCanvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, cloudCanvas.width, cloudCanvas.height);
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#ffffff';

      const cloudNoise = cloudNoiseRef.current!;
      const scale = 0.003;
      const offset = cloudOffsetRef.current;

      // Draw cloud texture using simplex noise
      const imageData = ctx.createImageData(cloudCanvas.width, cloudCanvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const pixelIndex = i / 4;
        const x = pixelIndex % cloudCanvas.width;
        const y = Math.floor(pixelIndex / cloudCanvas.width);

        const noise = Math.abs(
          cloudNoise.noise2D((x + offset) * scale, y * scale)
        );

        const alpha = Math.max(0, (noise - 0.4) * 255);

        data[i] = 255; // R
        data[i + 1] = 255; // G
        data[i + 2] = 255; // B
        data[i + 3] = alpha; // A
      }

      ctx.putImageData(imageData, 0, 0);

      cloudOffsetRef.current += 5; // Slow drift
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
  }, [phase]);

  // Draw zone overlay (for zone visualization on hover/click)
  useEffect(() => {
    if (phase !== 'ready' || !zoneMap) return;

    const zoneCanvas = zoneCanvasRef.current;
    if (!zoneCanvas) return;

    zoneCanvas.width = window.innerWidth;
    zoneCanvas.height = window.innerHeight;

    const ctx = zoneCanvas.getContext('2d');
    if (!ctx) return;

    // Draw zones (visible on hover)
    const cellWidth = zoneCanvas.width / GRID_WIDTH;
    const cellHeight = zoneCanvas.height / GRID_HEIGHT;

    zoneMap.forEach((cell) => {
      const x = cell.x * cellWidth;
      const y = cell.y * cellHeight;

      // Draw only buildable zones with light highlight
      if (cell.buildable) {
        ctx.fillStyle = 'rgba(100, 200, 100, 0.05)';
        ctx.fillRect(x, y, cellWidth, cellHeight);
      }
    });
  }, [phase, zoneMap]);

  // Handle mouse/touch interactions for building placement
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragRef.current.active) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      dragRef.current.startX = e.clientX;
      dragRef.current.startY = e.clientY;

      panRef.current.x += dx;
      panRef.current.y += dy;

      // Update image position
      const image = imageRef.current;
      if (image) {
        image.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoomRef.current})`;
      }
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (phase !== 'ready' || !selectedBuilding || !zoneMap) return;

    // Get click position relative to image
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const imageX = e.clientX - rect.left;
    const imageY = e.clientY - rect.top;

    // Convert to grid coordinates
    const gridX = Math.floor((imageX / rect.width) * GRID_WIDTH);
    const gridY = Math.floor((imageY / rect.height) * GRID_HEIGHT);

    if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) return;

    // Find zone cell
    const zone = zoneMap.find((z) => z.x === gridX && z.y === gridY);
    if (!zone || !zone.buildable) return;

    // Check if tile already has building
    const existingBuilding = buildings.find((b) => b.x === gridX && b.y === gridY);
    if (existingBuilding) return;

    // Place building
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

    // Persist to server
    placeBuilding(playerId, planet.id, newBuilding).catch((err) => {
      console.error('Failed to save building:', err);
    });
  }, [phase, selectedBuilding, buildings, playerId, planet.id, zoneMap]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    zoomRef.current *= delta;
    zoomRef.current = Math.max(0.5, Math.min(3, zoomRef.current));

    const image = imageRef.current;
    if (image) {
      image.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoomRef.current})`;
    }
  }, []);

  // Keyboard: Escape to close
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

  // Rendering phases
  if (phase === 'check' || phase === 'prompt_generation') {
    return (
      <div style={containerStyle}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(ellipse at center, #0d1b2a 0%, #000 100%)',
            zIndex: 200,
          }}
        >
          <div style={{ textAlign: 'center', fontFamily: 'monospace', color: '#7bb8ff' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🪐</div>
            <div style={{ fontSize: 16 }}>Інітіалізація поверхні...</div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'generating') {
    return (
      <div style={containerStyle}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(ellipse at center, #0d1b2a 0%, #000 100%)',
            zIndex: 200,
          }}
        >
          <div style={{ textAlign: 'center', fontFamily: 'monospace', color: '#7bb8ff', maxWidth: 400 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📸</div>
            <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 24 }}>Генерація супутникового знімку</div>
            <div style={{ fontSize: 14, color: '#aaccff', marginBottom: 24 }}>
              AI створює фотореалістичний знімок вашої планети...
            </div>
            <div
              style={{
                width: 200,
                height: 8,
                background: 'rgba(123, 184, 255, 0.1)',
                borderRadius: 4,
                overflow: 'hidden',
                margin: '0 auto 12px',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #4488ff, #7bb8ff)',
                  width: `${Math.min(progress, 100)}%`,
                  transition: 'width 0.3s',
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: '#667788' }}>
              {progress > 0 ? `${progress}%` : 'Очікування...'}
            </div>
            <div style={{ fontSize: 11, color: '#445566', marginTop: 16 }}>
              Це займає ~3-5 хвилин
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div style={containerStyle}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(ellipse at center, #0d1b2a 0%, #000 100%)',
            zIndex: 200,
          }}
        >
          <div style={{ textAlign: 'center', fontFamily: 'monospace', color: '#ff6b6b', maxWidth: 400 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Помилка генерації</div>
            <div style={{ fontSize: 14, marginBottom: 24, color: '#ffaaaa' }}>{error}</div>
            <button
              onClick={onClose}
              style={{
                padding: '8px 24px',
                background: 'rgba(255, 107, 107, 0.2)',
                border: '1px solid rgba(255, 107, 107, 0.4)',
                color: '#ff6b6b',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: 14,
              }}
            >
              Закрити
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Ready phase — show image + clouds + buildings
  return (
    <div style={containerStyle}>
      {/* Background image container */}
      <div style={imageContainerStyle}>
        {photoUrl && (
          <img
            ref={imageRef}
            src={photoUrl}
            alt="Planet surface"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
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
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: 0.15,
          pointerEvents: 'none',
        }}
      />

      {/* Zone visualization overlay */}
      <canvas
        ref={zoneCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          cursor: selectedBuilding ? 'crosshair' : 'default',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
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
            position: 'absolute',
            right: 12,
            top: 56,
            background: 'rgba(10, 20, 40, 0.8)',
            border: '1px solid rgba(60, 100, 160, 0.3)',
            borderRadius: 4,
            padding: '6px 12px',
            color: '#8899aa',
            fontFamily: 'monospace',
            fontSize: 12,
            cursor: 'pointer',
            zIndex: 100,
            pointerEvents: 'auto',
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
