import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { getDeviceTier, setBenchmarkTier, type DeviceTier } from '../../utils/device-tier.js';
import planetVertSrc from '../../shaders/planet/planet.vert.glsl?raw';
import atmosphereFrag from '../../shaders/planet/atmosphere.frag.glsl?raw';

// ---------------------------------------------------------------------------
// PlanetFormationLoader — real-time 3D "world genesis" boot cinematic.
//
// Three jobs in one (per design):
//   1. WOW intro (≤10s) over the existing cosmos backdrop: a world forms
//      through accretion → molten/volcanic → cooling+atmosphere → a living
//      "paradise" planet, then a final REVEAL beat that frames it as the
//      player's home world ("This is your home planet"). The surface is a
//      compact procedural shader that morphs lava → oceans/continents/clouds
//      via one `uForm` 0..1 uniform; the atmosphere rim reuses the production
//      atmosphere.frag.glsl. high/ultra add a bloom pass for maximum punch;
//      low/mid get a lighter sphere + no bloom so they never stutter.
//   2. Silent FPS benchmark over the (tier-scaled) workload. The result only
//      ever CONFIRMS or DOWNGRADES the heuristic tier (never blindly upgrades
//      on a light workload) — protecting weak phones from over-rated settings.
//   3. Funnel + crash signal: the parent fires intro_completed / intro_skipped
//      from onComplete; a crash is caught by the parent's error boundary.
// ---------------------------------------------------------------------------

export interface FormationResult {
  fps: number;
  tier: DeviceTier | null;
  skipped: boolean;
  durationMs: number;
}

interface Props {
  onComplete: (result: FormationResult) => void;
  /** Total cinematic runtime before it auto-finishes. Default 9000ms (≤10s). */
  minDurationMs?: number;
}

const COSMOS_BG = '/arena/arena-backdrop.jpg';
const WARMUP_MS = 800;
const MIN_SAMPLES = 24;
const SKIP_AFTER_MS = 1600;
const REVEAL_AT = 0.82; // fraction of the timeline where the "home planet" beat begins

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function downgrade(t: DeviceTier): DeviceTier {
  if (t === 'ultra' || t === 'high') return 'mid';
  if (t === 'mid') return 'low';
  return 'low';
}

// The benchmark CONFIRMS or DOWNGRADES the heuristic; it never upgrades on a
// tier-scaled workload (a light low-tier scene at 60fps must not become 'high').
function resolveTier(heuristic: DeviceTier, fps: number): DeviceTier {
  if (fps <= 0) return heuristic;
  if (fps < 30) return 'low';
  if (fps < 45) return downgrade(heuristic);
  return heuristic;
}

const GENESIS_FRAG = `
precision highp float;
uniform float uTime;
uniform float uForm;
uniform vec3  uStarDir;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vViewDir;

float hash3(vec3 p){ p = fract(p * vec3(443.897, 397.297, 491.187)); p += dot(p, p.yxz + 19.19); return fract((p.x + p.y) * p.z); }
float noise3(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash3(i), hash3(i+vec3(1,0,0)), f.x), mix(hash3(i+vec3(0,1,0)), hash3(i+vec3(1,1,0)), f.x), f.y),
    mix(mix(hash3(i+vec3(0,0,1)), hash3(i+vec3(1,0,1)), f.x), mix(hash3(i+vec3(0,1,1)), hash3(i+vec3(1,1,1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p){ float s = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { s += a * noise3(p); p *= 2.03; a *= 0.5; } return s; }

void main(){
  vec3 N = normalize(vNormal);
  vec3 pos = normalize(vPosition);
  float L = max(dot(N, normalize(uStarDir)), 0.0);
  float light = 0.10 + L * 0.95;
  float lat = abs(pos.y);

  float h = fbm(pos * 2.3 + 4.0);
  float coast = smoothstep(0.46, 0.54, h);

  // cool (paradise) palette
  vec3 oceanDeep = vec3(0.02, 0.10, 0.26);
  vec3 oceanShallow = vec3(0.07, 0.34, 0.52);
  vec3 ocean = mix(oceanDeep, oceanShallow, smoothstep(0.40, 0.52, h));
  vec3 landLow = vec3(0.16, 0.40, 0.20);
  vec3 landMid = vec3(0.30, 0.42, 0.20);
  vec3 landHigh = vec3(0.42, 0.38, 0.27);
  vec3 land = mix(landLow, landMid, smoothstep(0.52, 0.64, h));
  land = mix(land, landHigh, smoothstep(0.66, 0.78, h));
  float snow = smoothstep(0.80, 0.92, lat);
  land = mix(land, vec3(0.92, 0.95, 0.99), snow);
  vec3 coolSurf = mix(ocean, land, coast);
  float cl = fbm(pos * 3.1 + vec3(uTime * 0.015, 0.0, uTime * 0.008));
  float clouds = smoothstep(0.56, 0.78, cl) * uForm;
  coolSurf = mix(coolSurf, vec3(0.95, 0.97, 1.0), clouds * 0.55);
  coolSurf *= light;
  coolSurf += (1.0 - coast) * pow(L, 6.0) * vec3(0.5, 0.6, 0.7) * 0.4;

  // molten palette
  float crack = fbm(pos * 4.2 + vec3(0.0, uTime * 0.04, 0.0));
  float glow = pow(smoothstep(0.46, 0.78, crack), 1.4);
  float flick = 0.72 + 0.28 * sin(uTime * 3.0 + h * 24.0);
  vec3 basalt = vec3(0.10, 0.05, 0.04);
  vec3 lava = mix(vec3(0.85, 0.20, 0.04), vec3(1.0, 0.78, 0.22), glow);
  vec3 moltenSurf = basalt * light + lava * glow * flick * 1.3;

  float cool = smoothstep(0.0, 0.85, uForm);
  vec3 col = mix(moltenSurf, coolSurf, cool);
  col += lava * glow * flick * (1.0 - cool) * 0.55;

  gl_FragColor = vec4(col, 1.0);
}
`;

export function PlanetFormationLoader({ onComplete, minDurationMs = 9000 }: Props) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const doneRef = useRef(false);
  const finishRef = useRef<(skipped: boolean) => void>(() => {});
  const [skipVisible, setSkipVisible] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState(0);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const start = performance.now();
    const samples: number[] = [];
    const heuristic = getDeviceTier();
    const high = heuristic === 'high' || heuristic === 'ultra';
    const segments = heuristic === 'low' ? 64 : heuristic === 'mid' ? 96 : 160;
    const debrisCount = heuristic === 'low' ? 70 : heuristic === 'mid' ? 110 : 150;
    const dpr = Math.min(window.devicePixelRatio || 1, high ? 2 : 1.5);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: high, alpha: true, powerPreference: 'high-performance' });
    } catch {
      // No WebGL → don't trap the player on a black screen.
      const tmo = window.setTimeout(() => {
        if (doneRef.current) return;
        doneRef.current = true;
        onComplete({ fps: 0, tier: null, skipped: false, durationMs: performance.now() - start });
      }, 1200);
      return () => window.clearTimeout(tmo);
    }

    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0); // transparent → cosmos CSS background shows through

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 4.4);

    const starDir = new THREE.Vector3(-0.6, 0.35, 0.7).normalize();

    // ── Planet (genesis surface) ────────────────────────────────────────────
    const planetGeo = new THREE.SphereGeometry(1, segments, segments);
    const planetMat = new THREE.ShaderMaterial({
      vertexShader: planetVertSrc,
      fragmentShader: GENESIS_FRAG,
      uniforms: { uTime: { value: 0 }, uForm: { value: 0 }, uStarDir: { value: starDir } },
    });
    const planet = new THREE.Mesh(planetGeo, planetMat);
    planet.scale.setScalar(0.001);
    scene.add(planet);

    // ── Atmosphere shells (production atmosphere shader) ────────────────────
    const atmColor = new THREE.Color(1.0, 0.5, 0.2);
    const atmUniforms = {
      uColor: { value: atmColor },
      uIntensity: { value: 0 },
      uPower: { value: 6.0 },
      uStarDir: { value: starDir },
      uPressure: { value: 1.0 },
      uLayerStrength: { value: 0.25 },
    };
    const atmFront = new THREE.Mesh(
      new THREE.SphereGeometry(1.025, Math.min(segments, 96), Math.min(segments, 96)),
      new THREE.ShaderMaterial({
        vertexShader: planetVertSrc, fragmentShader: atmosphereFrag, uniforms: atmUniforms,
        transparent: true, side: THREE.FrontSide, depthWrite: false,
      }),
    );
    const atmBack = new THREE.Mesh(
      new THREE.SphereGeometry(1.06, Math.min(segments, 96), Math.min(segments, 96)),
      new THREE.ShaderMaterial({
        vertexShader: planetVertSrc, fragmentShader: atmosphereFrag,
        uniforms: { ...atmUniforms, uIntensity: { value: 0 } },
        transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
      }),
    );
    const atmBackMat = atmBack.material as THREE.ShaderMaterial;
    scene.add(atmFront, atmBack);

    // ── Accretion debris ────────────────────────────────────────────────────
    const debrisPos = new Float32Array(debrisCount * 3);
    const seeds = new Float32Array(debrisCount * 3);
    for (let i = 0; i < debrisCount; i++) {
      seeds[i * 3] = Math.random() * Math.PI * 2;
      seeds[i * 3 + 1] = 2.0 + Math.random() * 2.6;
      seeds[i * 3 + 2] = (Math.random() - 0.5) * 1.6;
    }
    const debrisGeo = new THREE.BufferGeometry();
    debrisGeo.setAttribute('position', new THREE.BufferAttribute(debrisPos, 3));
    const debrisMat = new THREE.PointsMaterial({ color: 0xc8a070, size: 0.06, sizeAttenuation: true, transparent: true, opacity: 1 });
    const debris = new THREE.Points(debrisGeo, debrisMat);
    scene.add(debris);

    // ── Bloom (high/ultra only) ─────────────────────────────────────────────
    let composer: EffectComposer | null = null;
    if (high) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.45, 0.55, 0.7));
      composer.addPass(new OutputPass());
    }

    const sizeTo = () => {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      composer?.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    sizeTo();
    window.addEventListener('resize', sizeTo);

    let raf = 0;
    let last = start;
    let currentPhase = -1;
    let revealed = false;

    const frame = (now: number) => {
      const dt = now - last;
      last = now;
      const elapsed = now - start;
      if (elapsed > WARMUP_MS && dt > 0 && dt < 200) samples.push(dt);

      const g = clamp01(elapsed / minDurationMs);
      const tSec = elapsed / 1000;

      const labelIdx = g < 0.18 ? 0 : g < 0.42 ? 1 : g < 0.66 ? 2 : 3;
      if (labelIdx !== currentPhase) { currentPhase = labelIdx; setPhaseLabel(labelIdx); }
      if (g >= REVEAL_AT && !revealed) { revealed = true; setReveal(true); }

      planetMat.uniforms.uForm.value = smooth(0.20, 0.70, g);
      planetMat.uniforms.uTime.value = tSec;

      const grow = easeOut(clamp01(g / 0.18));
      planet.scale.setScalar(Math.max(0.001, grow));
      planet.rotation.y += dt * 0.00016;
      atmFront.rotation.copy(planet.rotation);
      atmBack.rotation.copy(planet.rotation);

      // Atmosphere fades in + shifts orange→blue while cooling.
      const form = planetMat.uniforms.uForm.value as number;
      atmColor.setRGB(1.0 + (0.10 - 1.0) * form, 0.5 + (0.45 - 0.5) * form, 0.2 + (1.0 - 0.2) * form);
      const atmI = smooth(0.40, 0.92, g) * 0.16;
      atmUniforms.uIntensity.value = atmI;
      atmBackMat.uniforms.uIntensity.value = atmI * 0.4;

      // Reveal beat: gentle dolly-in framing the finished world.
      camera.position.z = 4.4 - smooth(REVEAL_AT, 1.0, g) * 1.0;

      // Debris spiral inward during accretion then vanish into the crust.
      const accr = clamp01(g / 0.20);
      const dvis = 1 - smooth(0.16, 0.26, g);
      debrisMat.opacity = dvis;
      if (dvis > 0.01) {
        for (let i = 0; i < debrisCount; i++) {
          const ang = seeds[i * 3] + tSec * (0.8 + (i % 5) * 0.15) + accr * 3.0;
          const rad = THREE.MathUtils.lerp(seeds[i * 3 + 1], 1.02, easeOut(accr));
          debrisPos[i * 3] = Math.cos(ang) * rad;
          debrisPos[i * 3 + 1] = seeds[i * 3 + 2] * (1 - accr) + Math.sin(ang) * rad * 0.18;
          debrisPos[i * 3 + 2] = Math.sin(ang) * rad;
        }
        debrisGeo.attributes.position.needsUpdate = true;
      } else if (debris.visible) {
        debris.visible = false;
      }

      if (composer) composer.render();
      else renderer.render(scene, camera);

      if (elapsed >= minDurationMs) { finishRef.current(false); return; }
      raf = requestAnimationFrame(frame);
    };

    const disposeAll = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', sizeTo);
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else if (mat) mat.dispose();
      });
      debrisGeo.dispose();
      composer?.dispose();
      renderer.dispose();
    };

    finishRef.current = (skipped: boolean) => {
      if (doneRef.current) return;
      doneRef.current = true;
      const med = median(samples);
      const fps = med > 0 ? Math.round(1000 / med) : 0;
      let tier: DeviceTier | null = null;
      if (samples.length >= MIN_SAMPLES && fps > 0) {
        tier = resolveTier(heuristic, fps);
        setBenchmarkTier(tier);
      }
      disposeAll();
      onComplete({ fps, tier, skipped, durationMs: performance.now() - start });
    };

    const skipTimer = window.setTimeout(() => setSkipVisible(true), SKIP_AFTER_MS);
    raf = requestAnimationFrame(frame);

    return () => {
      window.clearTimeout(skipTimer);
      if (!doneRef.current) disposeAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const labels = [
    t('loading.formation.accretion'),
    t('loading.formation.molten'),
    t('loading.formation.cooling'),
    t('loading.formation.paradise'),
  ];

  return (
    <div style={styles.overlay}>
      <div style={styles.bg} />
      <canvas ref={canvasRef} style={styles.canvas} />
      <div style={styles.copy}>
        {reveal ? (
          <div style={styles.revealText}>{t('loading.formation.reveal')}</div>
        ) : (
          <>
            <div style={styles.eyebrow}>{t('loading.formation.eyebrow')}</div>
            <div style={styles.title}>{t('loading.formation.title')}</div>
            <div style={styles.status}>{labels[phaseLabel]}</div>
          </>
        )}
      </div>
      {skipVisible && (
        <button style={styles.skip} onClick={() => finishRef.current(true)}>
          {t('loading.formation.skip')}
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, zIndex: 10000, background: '#020510', overflow: 'hidden', fontFamily: 'monospace' },
  bg: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `url(${COSMOS_BG})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    // Slight darken so the planet + UI read clearly over the photo.
    boxShadow: 'inset 0 0 400px 120px rgba(2,5,16,0.85)',
  },
  canvas: { position: 'absolute', inset: 0, display: 'block', width: '100%', height: '100%' },
  copy: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 'max(64px, env(safe-area-inset-bottom, 0px))',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 8,
    padding: '0 24px',
    pointerEvents: 'none',
  },
  eyebrow: { color: '#88aacc', fontSize: 9, letterSpacing: 4, textTransform: 'uppercase' },
  title: { color: '#e2ecf5', fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', textShadow: '0 0 18px rgba(123,184,255,0.3)' },
  status: { color: '#8aa0b4', fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', minHeight: 14 },
  revealText: {
    color: '#eaf2fb',
    fontSize: 17,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    textShadow: '0 0 24px rgba(123,184,255,0.45)',
    animation: 'fadeIn 0.9s ease',
  },
  skip: {
    position: 'absolute',
    right: 'max(16px, env(safe-area-inset-right, 0px))',
    top: 'max(16px, env(safe-area-inset-top, 0px))',
    background: 'rgba(10,15,25,0.7)',
    border: '1px solid #334455',
    borderRadius: 3,
    color: '#8899aa',
    fontFamily: 'monospace',
    fontSize: 11,
    letterSpacing: 1,
    padding: '6px 12px',
    cursor: 'pointer',
    animation: 'fadeIn 0.4s ease',
  },
};
