import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { StarSystem, Planet, Star, Moon, ResourceGroup } from '@nebulife/core';
import { SeededRNG, ELEMENTS, RESOURCE_GROUPS, GROUP_NAMES, GROUP_COLORS, getGroupElements, formatMassKg } from '@nebulife/core';
import {
  derivePlanetVisuals,
  planetVisualsToUniforms,
  getAtmosphereParams,
  getCloudParams,
  getMoonColors,
  STAR_SPRITE_POSITION,
} from '../../game/rendering/PlanetVisuals.js';

// GLSL shader imports (Vite ?raw)
import planetVertSrc from '../../shaders/planet/planet.vert.glsl?raw';
import rockySurfaceFrag from '../../shaders/planet/rocky-surface.frag.glsl?raw';
import gasGiantFrag from '../../shaders/planet/gas-giant.frag.glsl?raw';
import atmosphereFrag from '../../shaders/planet/atmosphere.frag.glsl?raw';
import cloudLayerFrag from '../../shaders/planet/cloud-layer.frag.glsl?raw';
import ringVertSrc from '../../shaders/planet/ring.vert.glsl?raw';
import ringFrag from '../../shaders/planet/ring.frag.glsl?raw';
import moonSurfaceFrag from '../../shaders/planet/moon-surface.frag.glsl?raw';

// ---------------------------------------------------------------------------
// PlanetDetailWindow — full-screen planet detail viewer
// ---------------------------------------------------------------------------
// Top-left quarter: animated Three.js planet + moons with shader-based rendering
// Right side: planet characteristics panel
// Top bar: system name + prev/next planet navigation
// ---------------------------------------------------------------------------

// ─── Style injection ─────────────────────────────────────────────────────────

const STYLE_ID = 'planet-detail-styles';
const KEYFRAMES = `
  @keyframes pdwIn {
    from { opacity: 0; transform: scale(0.95) translateY(12px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes pdwSlide {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pdwPulse {
    0%, 100% { transform: scale(1); opacity: 0.4; }
    50%      { transform: scale(1.05); opacity: 0.7; }
  }
`;

function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = KEYFRAMES;
  document.head.appendChild(s);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPlanetDisplayRadius(
  planet: Planet,
  allPlanets: Planet[],
  maxDisplayR: number,
  minDisplayR: number,
): number {
  const radii = allPlanets.map((p) => p.radiusEarth);
  const minR = Math.min(...radii);
  const maxR = Math.max(...radii);
  if (maxR === minR) return (maxDisplayR + minDisplayR) / 2;
  const t = (planet.radiusEarth - minR) / (maxR - minR);
  // Log scale for more visually fair comparison
  const logT = Math.log(1 + t * (Math.E - 1));
  return minDisplayR + logT * (maxDisplayR - minDisplayR);
}

function planetTypeName(t: Planet['type']): string {
  switch (t) {
    case 'rocky':     return 'Скелясте';
    case 'gas-giant': return 'Газовий гігант';
    case 'ice-giant': return 'Крижаний гігант';
    case 'dwarf':     return 'Карликова';
    default:          return t;
  }
}

function formatTemp(k: number): string {
  const c = Math.round(k - 273.15);
  return `${Math.round(k)}K  (${c > 0 ? '+' : ''}${c}°C)`;
}

function habitabilityPercent(h: number): string {
  return `${Math.round(h * 100)}%`;
}

function habitabilityColor(score: number): string {
  if (score >= 0.70) return '#44ff88';
  if (score >= 0.45) return '#aacc44';
  if (score >= 0.25) return '#cc9944';
  return '#cc5544';
}

// ─── Characteristic row ───────────────────────────────────────────────────────

function CharRow({
  label, value, color, delay = 0,
}: {
  label: string; value: string; color?: string; delay?: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '5px 0',
        borderBottom: '1px solid rgba(40,55,75,0.35)',
        animation: `pdwSlide 0.3s ease-out ${delay}ms both`,
      }}
    >
      <span style={{ color: '#445566', fontSize: 11, fontFamily: 'monospace' }}>{label}</span>
      <span style={{ color: color ?? '#aabbcc', fontSize: 11, fontFamily: 'monospace', textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function Section({ label, delay = 0 }: { label: string; delay?: number }) {
  return (
    <div
      style={{
        color: '#33445599',
        fontSize: 8,
        letterSpacing: '0.12em',
        padding: '12px 0 4px',
        fontFamily: 'monospace',
        animation: `pdwSlide 0.3s ease-out ${delay}ms both`,
      }}
    >
      {label}
    </div>
  );
}

// ─── Three.js Planet Canvas ──────────────────────────────────────────────────

const DEEP_SPACE = 0x020510;

interface MoonOrbitData {
  mesh: THREE.Mesh;
  angle: number;
  orbitRadius: number;
  eccentricityY: number;
  angularSpeed: number;
  inclination: number;
  ascendingNode: number;
}

interface PlanetCanvasProps {
  planet: Planet;
  star: StarSystem['star'];
  displayRadius: number;
  canvasW: number;
  canvasH: number;
}

function PlanetCanvas({ planet, star, displayRadius, canvasW, canvasH }: PlanetCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const rafRef = useRef<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const container = containerRef.current;
    if (!container) return;
    let destroyed = false;

    // --- Scene ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(DEEP_SPACE);
    scene.fog = new THREE.FogExp2(0x030818, 0.008);

    // --- Camera ---
    const camera = new THREE.PerspectiveCamera(
      50,
      canvasW / canvasH,
      0.1,
      200,
    );
    camera.position.set(0, 0, 3);

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    renderer.setSize(canvasW, canvasH);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    setLoading(false);

    // --- Controls (gentle interaction) ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    controls.minDistance = 1.8;
    controls.maxDistance = 6;
    controls.enablePan = false;

    // --- Starfield ---
    const starCount = 1200;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 50 + Math.random() * 50;
      starPositions[i3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i3 + 2] = r * Math.cos(phi);
      starSizes[i] = 0.3 + Math.random() * 1.5;
      const roll = Math.random();
      if (roll < 0.12) {
        starColors[i3] = 1.0; starColors[i3 + 1] = 0.85 + Math.random() * 0.15; starColors[i3 + 2] = 0.7 + Math.random() * 0.2;
      } else if (roll < 0.45) {
        starColors[i3] = 0.6 + Math.random() * 0.2; starColors[i3 + 1] = 0.7 + Math.random() * 0.2; starColors[i3 + 2] = 1.0;
      } else {
        const w = 0.85 + Math.random() * 0.15;
        starColors[i3] = w * 0.85; starColors[i3 + 1] = w * 0.92; starColors[i3 + 2] = w;
      }
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
    const starMat = new THREE.PointsMaterial({
      size: 0.16,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
      vertexColors: true,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // Twinkle indices
    const twinkleIndices: number[] = [];
    const baseSizes = new Float32Array(starSizes);
    for (let i = 0; i < starCount && twinkleIndices.length < 120; i++) {
      if (Math.random() < 0.1) twinkleIndices.push(i);
    }

    // --- Planet sphere (shader-based) ---
    const visuals = derivePlanetVisuals(planet, star as Star);
    const planetUniforms = planetVisualsToUniforms(visuals, planet, star as Star);

    const isGas = planet.type === 'gas-giant' || planet.type === 'ice-giant';
    const fragShader = isGas ? gasGiantFrag : rockySurfaceFrag;

    const planetGeo = new THREE.SphereGeometry(1, 128, 128);
    const planetMat = new THREE.ShaderMaterial({
      vertexShader: planetVertSrc,
      fragmentShader: fragShader,
      uniforms: planetUniforms,
    });
    const planetMesh = new THREE.Mesh(planetGeo, planetMat);
    scene.add(planetMesh);

    // --- Cloud layer ---
    let cloudTimeUniform: THREE.IUniform | null = null;
    if (planet.atmosphere) {
      const cloudParams = getCloudParams(planet.atmosphere, planet.type);
      if (cloudParams) {
        const cloudGeo = new THREE.SphereGeometry(cloudParams.scale, 64, 64);
        const tUniform = { value: 0.0 };
        cloudTimeUniform = tUniform;
        const cloudMat = new THREE.ShaderMaterial({
          vertexShader: planetVertSrc,
          fragmentShader: cloudLayerFrag,
          uniforms: {
            uCloudColor: { value: cloudParams.color },
            uCoverage: { value: cloudParams.coverage },
            uTime: tUniform,
            uSeed: { value: planet.seed },
          },
          transparent: true,
          side: THREE.FrontSide,
          depthWrite: false,
        });
        const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
        scene.add(cloudMesh);
      }
    }

    // --- Atmosphere shell ---
    if (planet.atmosphere) {
      const atmoParams = getAtmosphereParams(planet.atmosphere, planet.type);
      if (atmoParams) {
        const atmoGeo = new THREE.SphereGeometry(atmoParams.scale, 32, 32);
        const atmoMat = new THREE.ShaderMaterial({
          vertexShader: planetVertSrc,
          fragmentShader: atmosphereFrag,
          uniforms: {
            uColor: { value: atmoParams.color },
            uIntensity: { value: atmoParams.intensity },
            uPower: { value: atmoParams.power },
          },
          transparent: true,
          side: THREE.FrontSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
        scene.add(atmoMesh);
      }
    }

    // --- Ring (gas/ice giants) ---
    if ((planet.type === 'gas-giant' || planet.type === 'ice-giant') && planet.massEarth >= 15) {
      const ringGeo = new THREE.RingGeometry(1.2, 2.2, 128, 4);
      const ringMat = new THREE.ShaderMaterial({
        vertexShader: ringVertSrc,
        fragmentShader: ringFrag,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2 + 0.47;
      scene.add(ringMesh);
    }

    // --- Moons ---
    const moonOrbits: MoonOrbitData[] = [];
    if (planet.moons.length > 0) {
      const planetRadiusKm = planet.radiusEarth * 6371;
      const maxOrbitalKm = Math.max(...planet.moons.map(m => m.orbitalRadiusKm));
      const starDir = STAR_SPRITE_POSITION.clone().normalize();

      for (let i = 0; i < planet.moons.length; i++) {
        const moon = planet.moons[i];

        const rawR = moon.radiusKm / planetRadiusKm;
        const moonR = Math.max(0.06, Math.min(0.35, rawR));

        const normDist = maxOrbitalKm > 0 ? moon.orbitalRadiusKm / maxOrbitalKm : 0.5;
        const minOrbit = 2.8;
        const maxOrbit = 6.0;
        const orbitRadius = minOrbit + normDist * (maxOrbit - minOrbit);

        const angularSpeed = (2 * Math.PI) / (moon.orbitalPeriodDays * 360000);

        const rng = new SeededRNG(moon.seed);
        const startAngle = rng.next() * Math.PI * 2;
        const eccentricityY = 0.05 + rng.next() * 0.15;
        const inclination = 0.1 + rng.next() * 0.4;
        const ascendingNode = rng.next() * Math.PI * 2;

        const { base, high } = getMoonColors(moon.compositionType, moon.surfaceTempK);

        const moonGeo = new THREE.SphereGeometry(moonR, 32, 32);
        const moonMat = new THREE.ShaderMaterial({
          vertexShader: planetVertSrc,
          fragmentShader: moonSurfaceFrag,
          uniforms: {
            uSeed: { value: moon.seed },
            uBaseColor: { value: base },
            uHighColor: { value: high },
            uHasCraters: { value: moon.compositionType !== 'icy' ? 1.0 : 0.5 },
            uStarDir: { value: starDir },
            uStarColor: { value: new THREE.Color((star as Star).colorHex) },
          },
        });

        const moonMesh = new THREE.Mesh(moonGeo, moonMat);
        scene.add(moonMesh);

        moonOrbits.push({
          mesh: moonMesh,
          angle: startAngle,
          orbitRadius,
          eccentricityY,
          angularSpeed,
          inclination,
          ascendingNode,
        });
      }
    }

    // --- Ambient light ---
    const ambient = new THREE.AmbientLight(0x112233, 0.15);
    scene.add(ambient);

    // --- Animation ---
    let lastTime = performance.now();
    const startTime = performance.now();

    const animate = () => {
      if (destroyed) return;
      rafRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      const deltaMs = now - lastTime;
      lastTime = now;
      const elapsed = (now - startTime) * 0.001;

      controls.update();

      // Update planet time uniform
      planetUniforms.uTime.value = elapsed;

      // Update cloud time
      if (cloudTimeUniform) {
        cloudTimeUniform.value = elapsed;
      }

      // Twinkle stars
      const sizeAttr = starPoints.geometry.getAttribute('size');
      for (const idx of twinkleIndices) {
        (sizeAttr.array as Float32Array)[idx] =
          baseSizes[idx] * (0.5 + 0.5 * Math.sin(elapsed * 3 + idx * 1.7));
      }
      sizeAttr.needsUpdate = true;

      // Moon orbits — 3D inclined elliptical
      for (const m of moonOrbits) {
        m.angle += m.angularSpeed * deltaMs;
        const localX = Math.cos(m.angle) * m.orbitRadius;
        const localY = Math.sin(m.angle) * m.orbitRadius * (1.0 - m.eccentricityY);
        const cosI = Math.cos(m.inclination);
        const sinI = Math.sin(m.inclination);
        const cosO = Math.cos(m.ascendingNode);
        const sinO = Math.sin(m.ascendingNode);
        const mx = cosO * localX - sinO * cosI * localY;
        const my = sinO * localX + cosO * cosI * localY;
        const mz = sinI * localY;
        m.mesh.position.set(mx, my, mz);
        const depth = mz / m.orbitRadius;
        m.mesh.scale.setScalar(0.85 + depth * 0.15);
        m.mesh.renderOrder = mz > 0 ? 2 : -1;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafRef.current);
      controls.dispose();
      // Dispose all scene objects
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
          obj.geometry?.dispose();
          if (obj.material instanceof THREE.Material) obj.material.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        }
      });
      if (rendererRef.current) {
        rendererRef.current.forceContextLoss();
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planet.id, canvasW, canvasH]);

  return (
    <div
      ref={containerRef}
      style={{
        width: canvasW,
        height: canvasH,
        overflow: 'hidden',
        borderRadius: 4,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {loading && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#020510',
        }}>
          <div style={{
            width: displayRadius * 0.5,
            height: displayRadius * 0.5,
            borderRadius: '50%',
            border: '1px solid rgba(68,136,170,0.25)',
            animation: 'pdwPulse 1.5s ease-in-out infinite',
          }} />
        </div>
      )}
    </div>
  );
}

// ─── Nav arrow button ─────────────────────────────────────────────────────────

function NavBtn({
  label, onClick, disabled,
}: {
  label: string; onClick: () => void; disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'none',
        border: '1px solid ' + (disabled ? '#223344' : hover ? '#446688' : '#334455'),
        color: disabled ? '#223344' : hover ? '#aabbcc' : '#667788',
        fontFamily: 'monospace',
        fontSize: 11,
        padding: '4px 10px',
        borderRadius: 3,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

// ─── Resources section for characteristics panel ─────────────────────────────

function ResourcesSection({ planet, baseDelay }: { planet: Planet; baseDelay: number }) {
  const [expanded, setExpanded] = useState<ResourceGroup | null>(null);
  const totalRes = planet.resources?.totalResources;
  if (!totalRes) return null;

  const hasAny = totalRes.minerals > 0 || totalRes.volatiles > 0 || totalRes.isotopes > 0;
  if (!hasAny) return null;

  const maxVal = Math.max(totalRes.minerals, totalRes.volatiles, totalRes.isotopes, 1);

  return (
    <>
      <Section label="РЕСУРСИ" delay={baseDelay} />
      {RESOURCE_GROUPS.map((group, gi) => {
        const value = group === 'mineral' ? totalRes.minerals
          : group === 'volatile' ? totalRes.volatiles
          : totalRes.isotopes;
        if (value <= 0) return null;

        const color = GROUP_COLORS[group];
        const isExpanded = expanded === group;
        const barPct = Math.max(3, (value / maxVal) * 100);

        return (
          <div
            key={group}
            style={{ animation: `pdwSlide 0.3s ease-out ${baseDelay + 20 + gi * 30}ms both` }}
          >
            <div
              onClick={() => setExpanded(isExpanded ? null : group)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '5px 0', cursor: 'pointer',
                borderBottom: '1px solid rgba(40,55,75,0.35)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: 'monospace' }}>
                <span style={{ color, fontSize: 9 }}>{isExpanded ? 'v' : '>'}</span>
                <span style={{ color }}>{GROUP_NAMES[group]}</span>
              </span>
              <span style={{ color: '#aabbcc', fontSize: 11, fontFamily: 'monospace' }}>
                {formatMassKg(value)}
              </span>
            </div>
            {/* Bar */}
            <div style={{ padding: '3px 0 2px 16px' }}>
              <div style={{
                height: 3, background: 'rgba(30,40,60,0.5)',
                borderRadius: 2, overflow: 'hidden',
              }}>
                <div style={{
                  width: `${barPct}%`, height: '100%',
                  background: color, borderRadius: 2, opacity: 0.6,
                }} />
              </div>
            </div>
            {/* Expanded elements */}
            {isExpanded && (
              <div style={{ padding: '2px 0 6px 16px' }}>
                {getGroupElements(totalRes.elements, group)
                  .slice(0, 10)
                  .map(([sym, mass]) => {
                    const elBarPct = Math.max(2, (mass / value) * 100);
                    return (
                      <div key={sym} style={{
                        display: 'flex', alignItems: 'center',
                        padding: '2px 0', fontSize: 10,
                      }}>
                        <span style={{ width: 24, color: '#667788', fontSize: 9, fontFamily: 'monospace' }}>{sym}</span>
                        <div style={{
                          flex: 1, height: 2, background: 'rgba(30,40,60,0.3)',
                          borderRadius: 1, marginRight: 8, overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${elBarPct}%`, height: '100%',
                            background: color, borderRadius: 1, opacity: 0.4,
                          }} />
                        </div>
                        <span style={{ fontSize: 9, color: '#556677', fontFamily: 'monospace' }}>
                          {formatMassKg(mass)}
                        </span>
                      </div>
                    );
                  })
                }
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface PlanetDetailWindowProps {
  system: StarSystem;
  systemDisplayName?: string;
  initialPlanetIndex: number; // index in sorted-by-orbit array
  onClose: () => void;
  /** IDs of planets that have been destroyed */
  destroyedPlanetIds?: Set<string>;
}

export function PlanetDetailWindow({
  system,
  systemDisplayName,
  initialPlanetIndex,
  onClose,
  destroyedPlanetIds,
}: PlanetDetailWindowProps) {
  ensureStyles();

  const sortedPlanets = [...system.planets].sort(
    (a, b) => a.orbit.semiMajorAxisAU - b.orbit.semiMajorAxisAU,
  );

  const [planetIdx, setPlanetIdx] = useState(
    Math.max(0, Math.min(initialPlanetIndex, sortedPlanets.length - 1)),
  );
  const planet = sortedPlanets[planetIdx];

  // Mobile detection
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Canvas dimensions: mobile = full width, 1/3 height; desktop = left quarter
  const canvasW = isMobile
    ? Math.floor(window.innerWidth)
    : Math.floor(window.innerWidth * 0.46);
  const canvasH = isMobile
    ? Math.floor(window.innerHeight * 0.30)
    : Math.floor(window.innerHeight * 0.55);

  // Planet display radius: log-scaled from min to max
  const maxR = Math.min(canvasW, canvasH) * 0.32;
  const minR = Math.min(canvasW, canvasH) * 0.09;
  const displayRadius = getPlanetDisplayRadius(planet, sortedPlanets, maxR, minR);

  const goPrev = useCallback(() => {
    setPlanetIdx((i) => (i - 1 + sortedPlanets.length) % sortedPlanets.length);
  }, [sortedPlanets.length]);

  const goNext = useCallback(() => {
    setPlanetIdx((i) => (i + 1) % sortedPlanets.length);
  }, [sortedPlanets.length]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext, onClose]);

  const p = planet;
  const h = p.habitability;
  const sysName = systemDisplayName ?? system.name;

  const hasAtmo = !!p.atmosphere;
  const hasWater = !!p.hydrosphere;

  // Life description
  const lifeDesc = p.hasLife
    ? p.lifeComplexity === 'intelligent' ? 'Розумне життя'
      : p.lifeComplexity === 'multicellular' ? 'Складне (багатоклітинне)'
      : 'Мікробне'
    : 'Немає';

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9800,
          background: 'rgba(1,3,10,0.75)',
          backdropFilter: 'blur(3px)',
        }}
        onClick={onClose}
      />

      {/* Main window */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9801,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'monospace',
          animation: 'pdwIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
          pointerEvents: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top bar ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isMobile ? '8px 12px' : '10px 20px',
            borderBottom: '1px solid #334455',
            background: 'rgba(3,7,18,0.95)',
            backdropFilter: 'blur(8px)',
            flexShrink: 0,
            pointerEvents: 'auto',
            gap: isMobile ? 6 : 12,
          }}
        >
          {/* System name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 12, minWidth: 0, flex: 1 }}>
            <span style={{ color: '#556677', fontSize: isMobile ? 8 : 10, letterSpacing: '0.1em', flexShrink: 0 }}>
              {isMobile ? sysName.substring(0, 10).toUpperCase() : sysName.toUpperCase()}
            </span>
            <span style={{ color: '#334455', fontSize: 10, flexShrink: 0 }}>›</span>
            <span style={{ color: '#aabbcc', fontSize: isMobile ? 11 : 13, letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.name}
            </span>
            {destroyedPlanetIds?.has(p.id) ? (
              <span style={{ color: '#884422', fontSize: 9, border: '1px solid #88442255', padding: '1px 5px', borderRadius: 2, flexShrink: 0 }}>
                ЗРУЙНОВАНО
              </span>
            ) : p.isHomePlanet && (
              <span style={{ color: '#44ff88', fontSize: 9, border: '1px solid #44ff8855', padding: '1px 5px', borderRadius: 2, flexShrink: 0 }}>
                HOME
              </span>
            )}
          </div>

          {/* Planet navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8, flexShrink: 0 }}>
            <NavBtn label="◀" onClick={goPrev} disabled={sortedPlanets.length <= 1} />
            <span style={{ color: '#4a6077', fontSize: 10, minWidth: isMobile ? 40 : 60, textAlign: 'center' }}>
              {planetIdx + 1} / {sortedPlanets.length}
            </span>
            <NavBtn label="▶" onClick={goNext} disabled={sortedPlanets.length <= 1} />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid #334455',
              color: '#667788',
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'monospace',
              padding: '3px 9px',
              borderRadius: 3,
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#aabbcc'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#667788'; }}
          >
            ×
          </button>
        </div>

        {/* ── Content area ── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            overflow: 'hidden',
            pointerEvents: 'auto',
          }}
        >
          {/* Planet canvas area */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(2,5,16,0.92)',
              borderRight: isMobile ? 'none' : '1px solid #1a2535',
              borderBottom: isMobile ? '1px solid #1a2535' : 'none',
              padding: isMobile ? '8px' : '20px',
              flexShrink: 0,
              width: isMobile ? '100%' : canvasW + 40,
            }}
          >
            {/* Planet type + orbit label above canvas */}
            <div
              style={{
                display: 'flex',
                gap: isMobile ? 10 : 16,
                marginBottom: isMobile ? 4 : 12,
                color: '#4a6077',
                fontSize: isMobile ? 9 : 10,
                letterSpacing: '0.06em',
                animation: 'pdwSlide 0.3s ease-out 100ms both',
              }}
            >
              <span>{planetTypeName(p.type).toUpperCase()}</span>
              <span style={{ color: '#334455' }}>|</span>
              <span>{p.orbit.semiMajorAxisAU.toFixed(3)} AU</span>
              <span style={{ color: '#334455' }}>|</span>
              <span>{p.radiusEarth.toFixed(2)} R⊕</span>
            </div>

            {/* Canvas */}
            <PlanetCanvas
              key={planet.id}
              planet={planet}
              star={system.star}
              displayRadius={displayRadius}
              canvasW={canvasW}
              canvasH={canvasH}
            />

            {/* Moon list below canvas */}
            {p.moons.length > 0 && !isMobile && (
              <div
                style={{
                  marginTop: 14,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  justifyContent: 'center',
                  animation: 'pdwSlide 0.3s ease-out 200ms both',
                }}
              >
                {p.moons.map((m) => (
                  <span
                    key={m.id}
                    style={{
                      color: '#4a6077',
                      fontSize: 9,
                      border: '1px solid #1e2d3e',
                      padding: '2px 6px',
                      borderRadius: 2,
                    }}
                  >
                    {m.name} · {m.compositionType} · {Math.round(m.radiusKm)}km
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Characteristics panel */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              background: 'rgba(3,7,18,0.97)',
              padding: isMobile ? '12px 16px 80px' : '20px 28px 80px',
            }}
          >
            {/* Planet name header */}
            <div
              style={{
                fontSize: 22,
                color: '#ccddee',
                letterSpacing: '0.08em',
                marginBottom: 4,
                animation: 'pdwSlide 0.3s ease-out 50ms both',
              }}
            >
              {p.name}
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#334455',
                marginBottom: 20,
                letterSpacing: '0.06em',
                animation: 'pdwSlide 0.3s ease-out 80ms both',
              }}
            >
              {planetTypeName(p.type).toUpperCase()} &nbsp;·&nbsp; {p.zone?.toUpperCase() ?? ''}
            </div>

            {/* Physical */}
            <Section label="ФІЗИЧНІ ПАРАМЕТРИ" delay={100} />
            <CharRow label="Радіус" value={`${p.radiusEarth.toFixed(3)} R⊕`} delay={120} />
            <CharRow label="Маса" value={`${p.massEarth.toFixed(4)} M⊕`} delay={140} />
            <CharRow label="Гравітація" value={`${p.surfaceGravityG.toFixed(2)} g`} delay={160} />
            <CharRow label="Щільність" value={`${p.densityGCm3.toFixed(2)} г/см³`} delay={180} />
            <CharRow label="V втечі" value={`${p.escapeVelocityKmS.toFixed(2)} км/с`} delay={200} />

            {/* Thermal */}
            <Section label="ТЕМПЕРАТУРА" delay={220} />
            <CharRow label="Поверхня" value={formatTemp(p.surfaceTempK)} delay={240} />
            <CharRow label="Рівноважна" value={formatTemp(p.equilibriumTempK)} delay={260} />
            <CharRow label="Альбедо" value={p.albedo.toFixed(3)} delay={280} />

            {/* Orbital */}
            <Section label="ОРБІТА" delay={300} />
            <CharRow label="Велика піввісь" value={`${p.orbit.semiMajorAxisAU.toFixed(4)} AU`} delay={320} />
            <CharRow label="Ексцентриситет" value={p.orbit.eccentricity.toFixed(4)} delay={340} />
            <CharRow label="Нахил" value={`${p.orbit.inclinationDeg.toFixed(1)}°`} delay={360} />
            <CharRow label="Період" value={`${p.orbit.periodDays.toFixed(1)} дн`} delay={380} />

            {/* Resources */}
            {p.resources?.totalResources && (
              <ResourcesSection planet={p} baseDelay={400} />
            )}

            {/* Atmosphere */}
            {hasAtmo && (
              <>
                <Section label="АТМОСФЕРА" delay={400} />
                <CharRow
                  label="Тиск"
                  value={`${p.atmosphere!.surfacePressureAtm.toFixed(3)} атм`}
                  delay={420}
                />
                {p.atmosphere!.hasOzone && (
                  <CharRow label="Озоновий шар" value="є" color="#44ff88" delay={440} />
                )}
                {p.atmosphere!.composition && Object.keys(p.atmosphere!.composition).length > 0 && (
                  <CharRow
                    label="Склад"
                    value={Object.entries(p.atmosphere!.composition).slice(0, 3).map(
                      ([mol, frac]) => `${mol} ${((frac as number) * 100).toFixed(1)}%`,
                    ).join(', ')}
                    delay={460}
                  />
                )}
              </>
            )}

            {/* Hydrosphere */}
            {hasWater && p.hydrosphere!.waterCoverageFraction > 0 && (
              <>
                <Section label="ГІДРОСФЕРА" delay={480} />
                <CharRow
                  label="Покриття водою"
                  value={`${(p.hydrosphere!.waterCoverageFraction * 100).toFixed(1)}%`}
                  color="#4488aa"
                  delay={500}
                />
              </>
            )}

            {/* Habitability */}
            <Section label="ПРИДАТНІСТЬ ДО ЖИТТЯ" delay={520} />
            <CharRow
              label="Загальна"
              value={habitabilityPercent(h.overall)}
              color={habitabilityColor(h.overall)}
              delay={540}
            />
            <CharRow label="Температура" value={habitabilityPercent(h.temperature)} delay={560} />
            <CharRow label="Атмосфера" value={habitabilityPercent(h.atmosphere)} delay={580} />
            <CharRow label="Вода" value={habitabilityPercent(h.water)} delay={600} />
            <CharRow label="Магн. поле" value={habitabilityPercent(h.magneticField)} delay={620} />

            {/* Life */}
            <Section label="БІОЛОГІЯ" delay={640} />
            <CharRow
              label="Життя"
              value={lifeDesc}
              color={p.hasLife ? '#44ff88' : '#445566'}
              delay={660}
            />

            {/* Moons */}
            {p.moons.length > 0 && (
              <>
                <Section label={`СУПУТНИКИ (${p.moons.length})`} delay={680} />
                {p.moons.map((m, mi) => (
                  <CharRow
                    key={m.id}
                    label={m.name}
                    value={`${m.compositionType} · ${Math.round(m.radiusKm)}km · ${m.orbitalPeriodDays.toFixed(1)} дн`}
                    delay={700 + mi * 30}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
