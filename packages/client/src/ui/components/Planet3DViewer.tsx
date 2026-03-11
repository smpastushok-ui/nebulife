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

interface AtmosphereInfo {
  surfacePressureAtm: number;
  composition: Record<string, number>; // e.g. { N2: 0.78, O2: 0.21, CO2: 0.01 }
  hasOzone: boolean;
}

interface Planet3DViewerProps {
  glbUrl: string;
  planetName: string;
  starColor?: string; // hex color for directional light (simulating star)
  atmosphere?: AtmosphereInfo | null;
  planetType?: string; // 'rocky' | 'gas-giant' | 'ice-giant' | 'dwarf'
  mode?: 'overlay' | 'background'; // overlay = fullscreen with header; background = behind CommandBar
  onClose: () => void;
}

const Planet3DViewer: React.FC<Planet3DViewerProps> = ({
  glbUrl,
  planetName,
  starColor = '#fff5e0',
  atmosphere,
  planetType,
  mode = 'overlay',
  onClose,
}) => {
  const isOverlay = mode === 'overlay';
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
    renderer.toneMappingExposure = 1.0;
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

    // Lighting — purely diffuse, even illumination, no specular hotspot
    const hemiLight = new THREE.HemisphereLight(0x8899bb, 0x223344, 1.4);
    scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0x445566, 0.5);
    scene.add(ambientLight);

    // Soft fill directional — just for subtle shading, not a bright point
    const starLight = new THREE.DirectionalLight(
      new THREE.Color(starColor),
      0.4,
    );
    starLight.position.set(5, 3, 4);
    scene.add(starLight);

    // Star background
    createStarfield(scene);

    // Load GLB model
    const loader = new GLTFLoader();
    loader.load(
      glbUrl,
      (gltf) => {
        const model = gltf.scene;

        // Force fully matte materials — no specular, no reflections
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const mat of materials) {
              if (mat instanceof THREE.MeshStandardMaterial) {
                mat.roughness = 1.0;          // Fully matte — zero specular
                mat.metalness = 0.0;          // Non-metallic
                mat.envMapIntensity = 0.0;    // No environment reflections
                mat.roughnessMap = null;      // Override model's roughness texture
                mat.metalnessMap = null;      // Override model's metalness texture
                mat.envMap = null;            // Remove environment map
                mat.needsUpdate = true;
              }
            }
          }
        });

        // Center and scale model to fit view
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim; // Fit in ~2 unit radius
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));

        scene.add(model);

        // Add cloud layer if planet has substantial atmosphere
        if (atmosphere && atmosphere.surfacePressureAtm > 0.1) {
          const cloudMesh = createCloudLayer(maxDim, scale, atmosphere, planetType);
          if (cloudMesh) {
            cloudMesh.position.copy(model.position);
            scene.add(cloudMesh);
          }
        }

        // Add atmosphere glow if planet has one
        if (atmosphere && atmosphere.surfacePressureAtm > 0.01) {
          const atmoMesh = createAtmosphere(maxDim, scale, atmosphere, planetType);
          if (atmoMesh) {
            atmoMesh.position.copy(model.position);
            scene.add(atmoMesh);
          }
        }

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
  }, [glbUrl, starColor, atmosphere, planetType, cleanup]);

  return (
    <div style={isOverlay ? styles.overlay : styles.background}>
      {/* Header — only in overlay mode */}
      {isOverlay && (
        <div style={styles.header}>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
          <div style={styles.planetNameContainer}>
            <div style={styles.planetName}>{planetName}</div>
            <div style={styles.label3D}>3D Модель</div>
          </div>
        </div>
      )}

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

      {/* Controls hint — only in overlay mode */}
      {isOverlay && !isLoading && !error && (
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
// Atmosphere — Fresnel-based glow shell
// ---------------------------------------------------------------------------

// Vertex shader: pass normal and view direction to fragment
const ATMO_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

// Fragment shader: Fresnel edge glow (transparent in center, bright at edges)
const ATMO_FRAGMENT = `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float fresnel = 1.0 - dot(vNormal, vViewDir);
    fresnel = pow(max(fresnel, 0.0), uPower);
    gl_FragColor = vec4(uColor, fresnel * uIntensity);
  }
`;

/**
 * Derive atmosphere color from composition:
 * - N2/O2 dominant (Earth-like) → blue
 * - CO2 dominant (Venus/Mars) → orange-amber
 * - H2/He dominant (gas giants) → pale blue-white
 * - CH4 dominant (ice giants) → cyan-teal
 * - Thin/no atmosphere → skip
 */
function getAtmosphereColor(
  atmo: { composition: Record<string, number>; surfacePressureAtm: number },
  planetType?: string,
): { color: THREE.Color; intensity: number; power: number; scale: number } {
  const comp = atmo.composition;
  const pressure = atmo.surfacePressureAtm;

  // Gas giants — thick hazy shell
  if (planetType === 'gas-giant') {
    return {
      color: new THREE.Color(0.85, 0.75, 0.55),  // warm amber haze
      intensity: 0.5,
      power: 2.5,
      scale: 1.08,
    };
  }

  // Ice giants — cyan-teal
  if (planetType === 'ice-giant') {
    return {
      color: new THREE.Color(0.4, 0.75, 0.9),
      intensity: 0.5,
      power: 2.5,
      scale: 1.07,
    };
  }

  // CO2 dominant (>40%) — orange haze (Venus-like)
  if ((comp['CO2'] ?? 0) > 0.4) {
    return {
      color: new THREE.Color(0.9, 0.6, 0.3),
      intensity: Math.min(0.7, 0.3 + pressure * 0.05),
      power: 2.0,
      scale: 1.04 + Math.min(pressure * 0.005, 0.06),
    };
  }

  // N2+O2 dominant — blue (Earth-like)
  if ((comp['N2'] ?? 0) > 0.5 || (comp['O2'] ?? 0) > 0.1) {
    return {
      color: new THREE.Color(0.4, 0.65, 1.0),
      intensity: Math.min(0.6, 0.25 + pressure * 0.15),
      power: 3.0,
      scale: 1.03 + Math.min(pressure * 0.01, 0.04),
    };
  }

  // H2/He dominant — pale white
  if ((comp['H2'] ?? 0) > 0.3 || (comp['He'] ?? 0) > 0.2) {
    return {
      color: new THREE.Color(0.8, 0.85, 1.0),
      intensity: 0.4,
      power: 2.5,
      scale: 1.06,
    };
  }

  // Default thin atmosphere — faint blue-grey
  return {
    color: new THREE.Color(0.5, 0.6, 0.8),
    intensity: Math.min(0.35, 0.15 + pressure * 0.1),
    power: 4.0,
    scale: 1.02,
  };
}

function createAtmosphere(
  modelMaxDim: number,
  modelScale: number,
  atmo: { surfacePressureAtm: number; composition: Record<string, number>; hasOzone: boolean },
  planetType?: string,
): THREE.Mesh | null {
  if (atmo.surfacePressureAtm < 0.01) return null;

  const { color, intensity, power, scale: atmoScale } = getAtmosphereColor(atmo, planetType);

  // Atmosphere sphere slightly larger than the planet
  const planetRadius = (modelMaxDim / 2) * modelScale;
  const atmoRadius = planetRadius * atmoScale;

  const geometry = new THREE.SphereGeometry(atmoRadius, 64, 64);
  const material = new THREE.ShaderMaterial({
    vertexShader: ATMO_VERTEX,
    fragmentShader: ATMO_FRAGMENT,
    uniforms: {
      uColor: { value: color },
      uIntensity: { value: intensity },
      uPower: { value: power },
    },
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Mesh(geometry, material);
}

// ---------------------------------------------------------------------------
// Cloud layer — procedural 3D noise on a sphere
// ---------------------------------------------------------------------------

const CLOUD_VERTEX = `
  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vPos = position;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const CLOUD_FRAGMENT = `
  uniform vec3 uCloudColor;
  uniform float uCoverage;
  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  float hash3(vec3 p) {
    p = fract(p * vec3(443.897, 397.297, 491.187));
    p += dot(p, p.yxz + 19.19);
    return fract((p.x + p.y) * p.z);
  }

  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x),
          mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
          mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise3(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 n = normalize(vPos);
    float clouds = fbm(n * 3.5);
    clouds = smoothstep(0.40, 0.62, clouds);

    // Fade at edges (Fresnel-like)
    float rim = max(dot(vNormal, vViewDir), 0.0);
    rim = smoothstep(0.0, 0.3, rim);

    float alpha = clouds * uCoverage * rim;
    gl_FragColor = vec4(uCloudColor, alpha);
  }
`;

/**
 * Derive cloud parameters from atmosphere:
 * - Gas giants: thick banded clouds
 * - Ice giants: dense pale clouds
 * - CO2 thick (Venus): yellowish dense cover
 * - N2/O2 (Earth): white scattered clouds
 * - Thin atmosphere (<0.1 atm): no clouds
 */
function getCloudParams(
  atmo: { surfacePressureAtm: number; composition: Record<string, number> },
  planetType?: string,
): { color: THREE.Color; coverage: number; scale: number } | null {
  if (planetType === 'gas-giant') {
    return { color: new THREE.Color(0.95, 0.9, 0.8), coverage: 0.7, scale: 1.02 };
  }
  if (planetType === 'ice-giant') {
    return { color: new THREE.Color(0.85, 0.9, 0.95), coverage: 0.6, scale: 1.02 };
  }

  const pressure = atmo.surfacePressureAtm;
  if (pressure < 0.1) return null;

  // CO2 thick (Venus-like) — yellowish dense cover
  if ((atmo.composition['CO2'] ?? 0) > 0.4 && pressure > 1) {
    return {
      color: new THREE.Color(0.95, 0.85, 0.65),
      coverage: Math.min(0.8, pressure * 0.1),
      scale: 1.015,
    };
  }

  // N2/O2 (Earth-like) — white scattered clouds
  if ((atmo.composition['N2'] ?? 0) > 0.5 || (atmo.composition['O2'] ?? 0) > 0.1) {
    return {
      color: new THREE.Color(1.0, 1.0, 1.0),
      coverage: Math.min(0.5, 0.2 + pressure * 0.15),
      scale: 1.01,
    };
  }

  // Default — faint thin clouds
  return {
    color: new THREE.Color(0.9, 0.9, 0.95),
    coverage: Math.min(0.3, pressure * 0.1),
    scale: 1.01,
  };
}

function createCloudLayer(
  modelMaxDim: number,
  modelScale: number,
  atmo: { surfacePressureAtm: number; composition: Record<string, number> },
  planetType?: string,
): THREE.Mesh | null {
  const params = getCloudParams(atmo, planetType);
  if (!params) return null;

  const planetRadius = (modelMaxDim / 2) * modelScale;
  const cloudRadius = planetRadius * params.scale;

  const geometry = new THREE.SphereGeometry(cloudRadius, 64, 64);
  const material = new THREE.ShaderMaterial({
    vertexShader: CLOUD_VERTEX,
    fragmentShader: CLOUD_FRAGMENT,
    uniforms: {
      uCloudColor: { value: params.color },
      uCoverage: { value: params.coverage },
    },
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
  });

  return new THREE.Mesh(geometry, material);
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
  background: {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
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
