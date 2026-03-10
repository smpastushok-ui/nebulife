import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------------------------------------------------------------------------
// Planet3DViewer — Three.js GLB model viewer
// ---------------------------------------------------------------------------
// Fullscreen overlay that renders a 3D planet model with:
// - Touch/mouse orbit controls
// - Pinch-to-zoom (mobile)
// - Auto-rotation when idle
// - Loading progress bar
// - Star background
// ---------------------------------------------------------------------------

interface Planet3DViewerProps {
  glbUrl: string;
  planetName: string;
  starColor?: string; // hex color for directional light (simulating star)
  onClose: () => void;
}

const Planet3DViewer: React.FC<Planet3DViewerProps> = ({
  glbUrl,
  planetName,
  starColor = '#fff5e0',
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cleanup = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 0, 3);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.minDistance = 1.5;
    controls.maxDistance = 10;
    controls.enablePan = false;

    // Pause auto-rotate when user interacts
    let interactionTimeout: ReturnType<typeof setTimeout>;
    controls.addEventListener('start', () => {
      controls.autoRotate = false;
      clearTimeout(interactionTimeout);
    });
    controls.addEventListener('end', () => {
      interactionTimeout = setTimeout(() => {
        controls.autoRotate = true;
      }, 3000);
    });

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(
      new THREE.Color(starColor),
      1.5,
    );
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    const rimLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    rimLight.position.set(-3, -1, -3);
    scene.add(rimLight);

    // Star background
    createStarfield(scene);

    // Load GLB model
    const loader = new GLTFLoader();
    loader.load(
      glbUrl,
      (gltf) => {
        const model = gltf.scene;

        // Center and scale model to fit view
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim; // Fit in ~2 unit radius
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));

        scene.add(model);
        setIsLoading(false);
      },
      (progress) => {
        if (progress.total > 0) {
          setLoadProgress(Math.round((progress.loaded / progress.total) * 100));
        }
      },
      (err) => {
        console.error('GLB load error:', err);
        setError('Не вдалося завантажити 3D модель');
        setIsLoading(false);
      },
    );

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      clearTimeout(interactionTimeout);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [glbUrl, starColor, cleanup]);

  return (
    <div style={styles.overlay}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.closeButton} onClick={onClose}>
          ✕
        </button>
        <div style={styles.planetNameContainer}>
          <div style={styles.planetName}>{planetName}</div>
          <div style={styles.label3D}>3D Модель</div>
        </div>
      </div>

      {/* Three.js canvas container */}
      <div ref={containerRef} style={styles.canvasContainer} />

      {/* Loading overlay */}
      {isLoading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingContent}>
            <div style={styles.spinner} />
            <div style={styles.loadingText}>Завантаження 3D моделі...</div>
            <div style={styles.progressBarBg}>
              <div
                style={{
                  ...styles.progressBarFill,
                  width: `${loadProgress}%`,
                }}
              />
            </div>
            <div style={styles.progressText}>{loadProgress}%</div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingContent}>
            <div style={styles.errorText}>{error}</div>
            <button style={styles.retryButton} onClick={onClose}>
              Закрити
            </button>
          </div>
        </div>
      )}

      {/* Controls hint */}
      {!isLoading && !error && (
        <div style={styles.controlsHint}>
          Обертайте пальцем · Зум щипком
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Starfield
// ---------------------------------------------------------------------------

function createStarfield(scene: THREE.Scene) {
  const starCount = 2000;
  const positions = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);

  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    // Random position on a sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 50 + Math.random() * 50;

    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);

    sizes[i] = 0.5 + Math.random() * 1.5;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.15,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
  });

  const stars = new THREE.Points(geometry, material);
  scene.add(stars);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 10000,
    background: '#000',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    paddingTop: 'max(16px, env(safe-area-inset-top))',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(0,0,0,0.5)',
    color: '#fff',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(8px)',
  },
  planetNameContainer: {
    marginLeft: 12,
    display: 'flex',
    flexDirection: 'column',
  },
  planetName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: '0.5px',
  },
  label3D: {
    color: '#7bb8ff',
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    marginTop: 2,
  },
  canvasContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    touchAction: 'none',
  },
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.9)',
    zIndex: 5,
  },
  loadingContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid rgba(255,255,255,0.1)',
    borderTopColor: '#7bb8ff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  progressBarBg: {
    width: 200,
    height: 4,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #4488ff, #7bb8ff)',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  progressText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center' as const,
  },
  retryButton: {
    padding: '10px 24px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: 14,
    cursor: 'pointer',
  },
  controlsHint: {
    position: 'absolute',
    bottom: 'max(24px, env(safe-area-inset-bottom))',
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    letterSpacing: '0.5px',
    pointerEvents: 'none',
    zIndex: 10,
  },
};

export default Planet3DViewer;
