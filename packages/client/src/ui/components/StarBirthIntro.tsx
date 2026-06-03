import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import * as THREE from 'three';
import { getDeviceTier, setBenchmarkTier, type DeviceTier } from '../../utils/device-tier.js';
import { OrbitLoader } from './OrbitLoader.js';

// ---------------------------------------------------------------------------
// StarBirthIntro — real-time 3D "system genesis" boot cinematic.
//
// Concept (mirrors the in-game system-exploration look: ONE star + the wavy
// navigation web, NOT a cluster of competing suns):
//   1. The home star Alpha Lyrae ignites — a single living blue-white plasma
//      sphere (the same domain-warped fbm surface + corona as the website hero).
//   2. Thin glowing filament-threads burn their way outward (the same style as
//      the galaxy navigation web), each reaching a small node — a neighbouring
//      system lighting up at the tip. Gentle pull-back frames the web, then the
//      reveal settles.
//
// Deliberately light: a previous build drew SEVEN full plasma spheres + coronas
// overlapping at frame 0, which stalled shader compilation (frozen star, then a
// jump) on flagship phones and risked crashing low/mid. Now there is exactly one
// plasma sphere; the tips are cheap additive glow billboards, the threads are
// thin tubes. Shaders are pre-compiled before the loop so the first frame never
// freezes, and the camera moves in one smooth, continuous pull-back (no jump).
//
// It still does three jobs:
//   • WOW intro (≤10s) over the existing cosmos backdrop, skippable.
//   • Silent FPS benchmark: the central plasma drives a tier estimate that only
//     ever CONFIRMS or DOWNGRADES the heuristic (never blind-upgrades).
//   • Funnel + crash signal via onComplete / the parent error boundary.
//
// Tier scaling: fbm octaves, sphere segments, dpr, thread count and the corona
// are all gated by tier/native so it stays smooth from low Android WebView up.
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
// More frames before we trust the median FPS → a steadier tier decision that
// now applies THIS session (App.handleIntroComplete reloads to apply it). The
// heavy phase (all 6 filaments igniting) lands well inside this window.
const MIN_SAMPLES = 36;
const SKIP_AFTER_MS = 1600;
const REVEAL_AT = 0.82;

// Neighbouring-system node tints (the small glow at each filament tip). These
// are NOT full plasma stars — just cheap additive billboards, one per thread —
// so the scene stays light. Colours hint at different spectral classes.
const TIP_TINTS: [number, number, number][] = [
  [0.61, 0.69, 1.0],  // blue
  [0.97, 0.97, 1.0],  // white
  [1.0, 0.95, 0.78],  // pale yellow
  [1.0, 0.82, 0.45],  // orange
  [1.0, 0.74, 0.50],  // orange-red
  [0.79, 0.84, 1.0],  // pale blue
];
const HOME_TINT: [number, number, number] = [0.67, 0.75, 1.0]; // Alpha Lyrae blue-white

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function downgrade(t: DeviceTier): DeviceTier {
  if (t === 'ultra' || t === 'high') return 'mid';
  return 'low';
}
function resolveTier(heuristic: DeviceTier, fps: number): DeviceTier {
  if (fps <= 0) return heuristic;
  if (fps < 30) return 'low';
  if (fps < 45) return downgrade(heuristic);
  return heuristic;
}

// Shared simplex noise (Ashima) — same family the website hero sun uses.
const SNOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const STAR_VERT = `
varying vec3 vPos; varying vec3 vNormal; varying vec3 vWorld;
void main(){
  vPos = position;
  vNormal = normalize(normalMatrix * normal);
  vWorld = (modelMatrix * vec4(position,1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}`;

// __OCT__ replaced per tier (3..6). uIgnite ramps 0→1 as the star "lights up".
const STAR_FRAG = `
precision highp float;
uniform float uTime; uniform vec3 uTint; uniform float uBright; uniform float uIgnite;
varying vec3 vPos; varying vec3 vNormal; varying vec3 vWorld;
${SNOISE}
float fbm(vec3 p){ float f=0.0; float a=0.5; for(int i=0;i<__OCT__;i++){ f+=a*snoise(p); p*=2.02; a*=0.5; } return f; }
void main(){
  vec3 n = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vWorld);
  float rim = 1.0 - max(dot(viewDir,n),0.0);
  float t = uTime*0.04;
  vec3 p = normalize(vPos)*3.5;
  float q = fbm(p - t*0.5);
  vec3 wp = p + vec3(q)*1.2;
  float gran = fbm(wp*4.0 + t*2.0);
  float cells = fbm(wp*1.2 - t);
  float nv = mix(cells, gran, 0.4);
  nv = smoothstep(-0.15, 0.7, nv);
  vec3 dark   = uTint*0.10;
  vec3 bright = uTint;
  vec3 core   = mix(uTint, vec3(1.0), 0.72);
  vec3 c = mix(dark, bright*0.7, smoothstep(0.0,0.45,nv));
  c = mix(c, bright, smoothstep(0.45,0.8,nv));
  c = mix(c, core, smoothstep(0.8,1.0,nv));
  c += core * pow(rim,3.0) * 0.7;
  // Ignition: surface glows up from a dim ember to full output.
  float ig = mix(0.04, 1.0, uIgnite);
  gl_FragColor = vec4(c * uBright * ig, 1.0);
}`;

// Corona: additive back-side flares. Cheap fixed 3-octave fbm.
const CORONA_FRAG = `
precision highp float;
uniform float uTime; uniform vec3 uTint; uniform float uIgnite;
varying vec3 vPos; varying vec3 vNormal; varying vec3 vWorld;
${SNOISE}
float fbmC(vec3 p){ float f=0.0; float a=0.5; for(int i=0;i<3;i++){ f+=a*snoise(p); p*=2.02; a*=0.5; } return f; }
void main(){
  vec3 viewDir = normalize(cameraPosition - vWorld);
  float rim = max(dot(viewDir, normalize(vNormal)),0.0);
  float dist = length(vPos);
  float falloff = 1.0 - smoothstep(0.97, 1.5, dist);
  float t = uTime*0.05;
  vec3 p = normalize(vPos)*4.0;
  float flares = fbmC(p - t);
  flares = pow(abs(flares),3.0) * 7.0;
  float alpha = (flares + pow(1.0-rim,3.0)) * falloff * 0.5 * uIgnite;
  gl_FragColor = vec4(uTint, clamp(alpha,0.0,1.0));
}`;

// Tip node: a cheap camera-facing radial glow billboard (one quad). uReveal
// fades the whole node in when the filament head arrives. No noise, no lighting.
const TIP_VERT = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const TIP_FRAG = `
precision mediump float;
uniform vec3 uColor; uniform float uReveal; uniform float uTime;
varying vec2 vUv;
void main(){
  float d = length(vUv - 0.5) * 2.0;          // 0 centre → 1 edge
  float core = smoothstep(0.22, 0.0, d);       // bright nucleus
  float halo = smoothstep(1.0, 0.18, d);       // soft falloff
  float twinkle = 0.85 + 0.15 * sin(uTime * 3.0);
  float a = (core + halo * 0.55) * uReveal * twinkle;
  vec3 col = mix(uColor, vec3(1.0), core * 0.7);
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
}`;

// Filament thread: reveals base→tip via uProgress, with a bright burning head.
const THREAD_VERT = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const THREAD_FRAG = `
precision highp float;
uniform float uProgress; uniform float uTime; uniform vec3 uColor;
varying vec2 vUv;
void main(){
  float len = vUv.x;                 // 0 = star, 1 = sibling
  float reveal = 1.0 - smoothstep(uProgress, uProgress + 0.03, len);
  float head = smoothstep(uProgress - 0.18, uProgress, len) * reveal;
  float cross = 1.0 - abs(vUv.y - 0.5) * 2.0;
  float coreC = pow(max(cross,0.0), 2.0);
  float pulse = 0.6 + 0.4 * sin(len*36.0 - uTime*6.0);
  vec3 col = uColor * (0.7 + 0.9*head) * (0.7 + 0.3*pulse);
  float alpha = reveal * coreC * 0.85 + head * coreC * 1.6;
  gl_FragColor = vec4(col, clamp(alpha,0.0,1.0));
}`;

export function StarBirthIntro({ onComplete, minDurationMs = 9500 }: Props) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const doneRef = useRef(false);
  const finishRef = useRef<(skipped: boolean) => void>(() => {});
  const [skipVisible, setSkipVisible] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState(0);
  const [reveal, setReveal] = useState(false);
  // false → the pure-CSS "establishing orbit" loader is on top, covering the
  // WebGL init + shader compile + first warmup frames so none of that jank is
  // ever visible. Flips true once the 3D loop is flowing smoothly, then the
  // star cinematic begins and the loader cross-fades out.
  const [established, setEstablished] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const start = performance.now();
    const samples: number[] = [];
    const native = Capacitor.isNativePlatform();
    const heuristic = getDeviceTier();
    const high = heuristic === 'high' || heuristic === 'ultra';
    // One plasma sphere only — we can afford a touch more octaves than the old
    // 7-star build, but keep low conservative.
    const oct = heuristic === 'low' ? 3 : heuristic === 'mid' ? 4 : heuristic === 'high' ? 5 : 6;
    const starSeg = heuristic === 'low' ? 36 : heuristic === 'mid' ? 48 : heuristic === 'high' ? 72 : 96;
    const tubular = heuristic === 'low' ? 14 : heuristic === 'mid' ? 20 : 36;
    // Navigation web density — fewer threads on weak devices.
    const threadCount = heuristic === 'low' ? 4 : heuristic === 'mid' ? 5 : 6;
    const useCorona = heuristic !== 'low';
    const dpr = native
      ? Math.min(window.devicePixelRatio || 1, high ? 1.5 : 1.25)
      : Math.min(window.devicePixelRatio || 1, high ? 2 : 1.5);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: !native && high, alpha: true, powerPreference: 'high-performance' });
    } catch {
      const tmo = window.setTimeout(() => {
        if (doneRef.current) return;
        doneRef.current = true;
        onComplete({ fps: 0, tier: null, skipped: false, durationMs: performance.now() - start });
      }, 1200);
      return () => window.clearTimeout(tmo);
    }

    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    // Start framed on the star (prominent but fully visible), then a single
    // smooth pull-back reveals the web. No close-up → jump like the old build.
    camera.position.set(0, 0, 4.0);

    const root = new THREE.Group();
    scene.add(root);

    const makeStarMat = (tint: [number, number, number], bright: number) =>
      new THREE.ShaderMaterial({
        vertexShader: STAR_VERT,
        fragmentShader: STAR_FRAG.replace('__OCT__', String(oct)),
        uniforms: {
          uTime: { value: 0 },
          uTint: { value: new THREE.Vector3(...tint) },
          uBright: { value: bright },
          uIgnite: { value: 0 },
        },
      });

    // ── Home star (Alpha Lyrae) — the ONLY plasma sphere in the scene ───────
    const homeMat = makeStarMat(HOME_TINT, 1.2);
    const home = new THREE.Mesh(new THREE.SphereGeometry(0.85, starSeg, starSeg), homeMat);
    root.add(home);

    let coronaMat: THREE.ShaderMaterial | null = null;
    if (useCorona) {
      coronaMat = new THREE.ShaderMaterial({
        vertexShader: STAR_VERT,
        fragmentShader: CORONA_FRAG,
        uniforms: { uTime: { value: 0 }, uTint: { value: new THREE.Vector3(...HOME_TINT) }, uIgnite: { value: 0 } },
        transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
      });
      // Lower-poly corona shell (it's a soft additive glow — segments barely
      // matter) and parented to the star so it scales with ignition.
      const corona = new THREE.Mesh(new THREE.SphereGeometry(1.5, 24, 24), coronaMat);
      home.add(corona);
    }

    // ── Navigation web: thin filament-threads to small neighbour nodes ──────
    // (the in-game system-exploration look). Tips are cheap billboards.
    interface Node {
      tip: THREE.Mesh;
      tipMat: THREE.ShaderMaterial;
      threadMat: THREE.ShaderMaterial;
      tStart: number;
    }
    const nodes: Node[] = [];
    const GROW = 0.18;

    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    const portrait = aspect < 1;
    const radius = 2.05;
    const fx = portrait ? 0.62 : 1.0;
    const fy = portrait ? 1.0 : 0.68;

    for (let i = 0; i < threadCount; i++) {
      const tint = TIP_TINTS[i % TIP_TINTS.length];
      const ang = -Math.PI / 2 + (i * Math.PI * 2) / threadCount;
      const z = (i % 2 === 0 ? 1 : -1) * 0.22;
      const pos = new THREE.Vector3(Math.cos(ang) * radius * fx, Math.sin(ang) * radius * fy, z);

      // Camera-facing glow billboard (one quad, no lighting/noise).
      const tipMat = new THREE.ShaderMaterial({
        vertexShader: TIP_VERT, fragmentShader: TIP_FRAG,
        uniforms: { uColor: { value: new THREE.Vector3(...tint) }, uReveal: { value: 0 }, uTime: { value: 0 } },
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const tip = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), tipMat);
      tip.position.copy(pos);
      root.add(tip);

      // Curved filament from the star surface to the node — same wavy-thread
      // aesthetic as the galaxy navigation web.
      const dir = pos.clone().normalize();
      const startP = dir.clone().multiplyScalar(0.8);
      const mid = startP.clone().lerp(pos, 0.5);
      const perp = new THREE.Vector3(-dir.y, dir.x, 0).normalize().multiplyScalar(0.3);
      mid.add(perp);
      const curve = new THREE.QuadraticBezierCurve3(startP, mid, pos.clone());
      const threadGeo = new THREE.TubeGeometry(curve, tubular, 0.022, 5, false);
      const threadMat = new THREE.ShaderMaterial({
        vertexShader: THREAD_VERT, fragmentShader: THREAD_FRAG,
        uniforms: { uProgress: { value: 0 }, uTime: { value: 0 }, uColor: { value: new THREE.Vector3(0.55, 0.78, 1.0) } },
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const thread = new THREE.Mesh(threadGeo, threadMat);
      root.add(thread);

      nodes.push({ tip, tipMat, threadMat, tStart: 0.2 + i * 0.09 });
    }

    // ── Starfield (cheap depth) ─────────────────────────────────────────────
    const starCount = heuristic === 'low' ? 350 : 700;
    const sfPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 14 + Math.random() * 22;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      sfPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      sfPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      sfPos[i * 3 + 2] = r * Math.cos(ph) - 6;
    }
    const sfGeo = new THREE.BufferGeometry();
    sfGeo.setAttribute('position', new THREE.BufferAttribute(sfPos, 3));
    const sfMat = new THREE.PointsMaterial({ color: 0x9fc4ff, size: 0.08, transparent: true, opacity: 0.55, sizeAttenuation: true });
    const starfield = new THREE.Points(sfGeo, sfMat);
    scene.add(starfield);

    const sizeTo = () => {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    sizeTo();
    window.addEventListener('resize', sizeTo);

    let raf = 0;
    let last = start;
    let currentPhase = -1;
    let revealed = false;

    // Loader → star handoff. The first frames after WebGL init are janky (GPU
    // program link + buffer upload), so we render them HIDDEN behind the CSS
    // orbital loader and only start the star cinematic once the loop is flowing.
    let frames = 0;
    let cinemaStart = 0;
    let handedOff = false;
    const MIN_LOADER_MS = 1300;  // hold the orbit loader a touch longer so WebGL
                                 // fully warms up (smoother hand-off) and the FPS
                                 // benchmark gets more steady-state frames
    const WARMUP_FRAMES = 8;     // proof the rAF loop is actually running

    const frame = (now: number) => {
      const dt = now - last;
      last = now;
      const sinceMount = now - start;
      if (sinceMount > WARMUP_MS && dt > 0 && dt < 200) samples.push(dt);
      frames++;

      // Hand off from loader to star once init is over and frames are flowing.
      if (!handedOff && frames >= WARMUP_FRAMES && sinceMount >= MIN_LOADER_MS) {
        handedOff = true;
        cinemaStart = now;
        setEstablished(true); // CSS cross-fades the orbital loader out
      }

      // Cinematic progress only advances after the handoff, so the star always
      // animates smoothly from its ember — the compile stall stays under the loader.
      const elapsed = handedOff ? now - cinemaStart : 0;
      const g = clamp01(elapsed / minDurationMs);
      const tSec = sinceMount / 1000; // plasma churns from mount so it's "alive" at reveal

      const labelIdx = g < 0.18 ? 0 : g < REVEAL_AT ? 1 : 2;
      if (labelIdx !== currentPhase) { currentPhase = labelIdx; setPhaseLabel(labelIdx); }
      if (g >= REVEAL_AT && !revealed) { revealed = true; setReveal(true); }

      // Home star ignition + slow spin (corona is parented → scales with it).
      const ignite = smooth(0.0, 0.16, g);
      homeMat.uniforms.uIgnite.value = ignite;
      homeMat.uniforms.uTime.value = tSec;
      if (coronaMat) { coronaMat.uniforms.uTime.value = tSec; coronaMat.uniforms.uIgnite.value = ignite; }
      home.scale.setScalar(lerp(0.06, 1.0, easeOut(smooth(0.0, 0.16, g))));

      // Filament threads grow outward, then the neighbour node lights up.
      nodes.forEach((nd) => {
        const prog = clamp01((g - nd.tStart) / GROW);
        nd.threadMat.uniforms.uProgress.value = prog;
        nd.threadMat.uniforms.uTime.value = tSec;
        // Node fades in once the burning head reaches the tip.
        const reveal = clamp01((g - (nd.tStart + GROW * 0.78)) / 0.12);
        nd.tipMat.uniforms.uReveal.value = easeOut(reveal);
        nd.tipMat.uniforms.uTime.value = tSec;
        // Billboard: face the camera so the glow reads as a point of light.
        nd.tip.quaternion.copy(camera.quaternion);
      });

      // Single continuous, eased pull-back — no close-up snap, no mid jump.
      camera.position.z = lerp(4.0, 6.4, easeInOut(g));

      root.rotation.y = g * 0.35;
      root.rotation.z = Math.sin(g * Math.PI) * 0.03;
      starfield.rotation.y = tSec * 0.01;

      renderer.render(scene, camera);

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
      sfGeo.dispose();
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

    // Pre-compile all shader programs + upload geometry now, while the screen
    // is still the static backdrop. Without this, the first animated frame
    // stalled for ~0.5s on flagship phones (the "frozen star then jump" the
    // user reported) because every plasma/corona/thread program compiled mid-
    // frame. compile() does it up-front; the loop then starts smooth.
    try { renderer.compile(scene, camera); } catch { /* non-fatal */ }

    const skipTimer = window.setTimeout(() => setSkipVisible(true), SKIP_AFTER_MS);
    raf = requestAnimationFrame(frame);

    return () => {
      window.clearTimeout(skipTimer);
      if (!doneRef.current) disposeAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const labels = [
    t('loading.starbirth.ignite'),
    t('loading.starbirth.filaments'),
    t('loading.starbirth.cluster'),
  ];

  return (
    <div style={styles.overlay}>
      <div style={styles.bg} />
      <canvas ref={canvasRef} style={styles.canvas} />

      {/* Establishing-orbit loader — shared OrbitLoader (pure CSS), stays smooth
          on the compositor thread even while shaders compile. Cross-fades out
          the moment the 3D loop is flowing. */}
      <div style={{ ...styles.loader, opacity: established ? 0 : 1, pointerEvents: 'none' }}>
        <OrbitLoader label={t('loading.starbirth.establishing')} />
      </div>

      <div style={{ ...styles.copy, opacity: established ? 1 : 0 }}>
        {reveal ? (
          <div style={styles.revealText}>{t('loading.starbirth.reveal')}</div>
        ) : (
          <>
            <div style={styles.eyebrow}>{t('loading.starbirth.eyebrow')}</div>
            <div style={styles.title}>{t('loading.starbirth.title')}</div>
            <div style={styles.status}>{labels[phaseLabel]}</div>
          </>
        )}
      </div>
      {skipVisible && (
        <button style={styles.skip} onClick={() => finishRef.current(true)}>
          {t('loading.starbirth.skip')}
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
    boxShadow: 'inset 0 0 400px 120px rgba(2,5,16,0.85)',
  },
  canvas: { position: 'absolute', inset: 0, display: 'block', width: '100%', height: '100%' },
  loader: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.6s ease',
  },
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
    transition: 'opacity 0.7s ease',
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
