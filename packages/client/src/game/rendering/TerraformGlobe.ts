import type { Planet, Star } from '@nebulife/core';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  derivePlanetVisuals,
  planetVisualsToUniforms,
  STAR_SPRITE_POSITION,
} from './PlanetVisuals.js';

import planetVertSrc from '../../shaders/planet/planet.vert.glsl?raw';
import rockySurfaceFrag from '../../shaders/planet/rocky-surface.frag.glsl?raw';
import atmosphereFrag from '../../shaders/planet/atmosphere.frag.glsl?raw';
import cloudLayerFrag from '../../shaders/planet/cloud-layer.frag.glsl?raw';

export const TERRAFORM_CUTSCENE_DURATION_MS = 6500;

export interface TerraformGlobeInstance {
  dispose(): void;
}

interface TerraformGlobeOptions {
  container: HTMLElement;
  before: Planet;
  after: Planet;
  star: Star;
  onPhase?: (phase: TerraformPhaseId, progress: number) => void;
}

export type TerraformPhaseId = 'magnetosphere' | 'atmosphere' | 'oceans' | 'biosphere' | 'clouds' | 'complete';

const phaseWindows: Record<Exclude<TerraformPhaseId, 'complete'>, [number, number]> = {
  magnetosphere: [0.0, 1.5],
  atmosphere: [1.0, 3.0],
  oceans: [2.5, 4.5],
  biosphere: [3.5, 5.5],
  clouds: [5.5, 6.5],
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function smoothstep01(v: number): number {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
}

function phaseProgress(seconds: number, phase: Exclude<TerraformPhaseId, 'complete'>): number {
  const [start, end] = phaseWindows[phase];
  return smoothstep01((seconds - start) / (end - start));
}

function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColorValue(a: unknown, b: unknown, t: number): THREE.Color {
  const ca = a instanceof THREE.Color ? a : new THREE.Color(0x556677);
  const cb = b instanceof THREE.Color ? b : ca;
  return ca.clone().lerp(cb, t);
}

function numericUniform(uniforms: Record<string, THREE.IUniform>, key: string, fallback = 0): number {
  const value = uniforms[key]?.value;
  return typeof value === 'number' ? value : fallback;
}

function colorUniform(uniforms: Record<string, THREE.IUniform>, key: string, fallback = 0x556677): THREE.Color {
  const value = uniforms[key]?.value;
  return value instanceof THREE.Color ? value : new THREE.Color(fallback);
}

function planetVisualScale(planet: Planet): number {
  const r = planet.radiusEarth ?? 1;
  if (r < 0.5) return 0.55;
  if (r < 1.0) return 0.75;
  if (r < 1.5) return 0.95;
  return 1.15;
}

function disposeMaterial(material: THREE.Material): void {
  material.dispose();
}

export function mountTerraformGlobe({
  container,
  before,
  after,
  star,
  onPhase,
}: TerraformGlobeOptions): TerraformGlobeInstance {
  const beforeVisuals = derivePlanetVisuals(before, star);
  const afterVisuals = derivePlanetVisuals(after, star);
  const beforeUniforms = planetVisualsToUniforms(beforeVisuals, before, star);
  const afterUniforms = planetVisualsToUniforms(afterVisuals, after, star);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020510);
  scene.fog = new THREE.FogExp2(0x030818, 0.01);

  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);
  const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 80);
  camera.position.set(-2.9, 1.8, 5.2);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x020510, 0);
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 1.45;
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0x5577aa, 2.2);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(0x7799cc, 0x332211, 0.6);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xfff2dd, 2.6);
  dir.position.copy(STAR_SPRITE_POSITION);
  scene.add(dir);

  const starDir = STAR_SPRITE_POSITION.clone().normalize();
  const geometry = new THREE.SphereGeometry(1, 128, 128);
  const material = new THREE.ShaderMaterial({
    vertexShader: planetVertSrc,
    fragmentShader: rockySurfaceFrag,
    uniforms: {
      ...beforeUniforms,
      uHasOcean: { value: 0 },
      uHasBiomes: { value: 0 },
      uWaterCoverage: { value: 0 },
      uVegCoverage: { value: 0 },
      uMagneticStrength: { value: 0 },
      uTime: { value: 0 },
    },
  });
  const planetMesh = new THREE.Mesh(geometry, material);
  planetMesh.scale.setScalar(planetVisualScale(before));
  scene.add(planetMesh);

  const atmUniforms = {
    uColor: { value: colorUniform(afterUniforms, 'uStarColor', 0x4488ff).clone().lerp(new THREE.Color(0x4488ff), 0.55) },
    uIntensity: { value: 0 },
    uPower: { value: 2.4 },
    uStarDir: { value: starDir },
    uPressure: { value: 0.01 },
    uLayerStrength: { value: 0.55 },
  };
  const atmGeometry = new THREE.SphereGeometry(1.08, 128, 128);
  const atmMaterial = new THREE.ShaderMaterial({
    vertexShader: planetVertSrc,
    fragmentShader: atmosphereFrag,
    uniforms: atmUniforms,
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const atmosphere = new THREE.Mesh(atmGeometry, atmMaterial);
  atmosphere.scale.setScalar(planetVisualScale(before));
  scene.add(atmosphere);

  const cloudUniforms = {
    uCloudColor: { value: new THREE.Color(0xddeeff) },
    uCoverage: { value: 0 },
    uTime: { value: 0 },
    uSeed: { value: before.seed },
    uStarDir: { value: starDir },
  };
  const cloudGeometry = new THREE.SphereGeometry(1.018, 128, 128);
  const cloudMaterial = new THREE.ShaderMaterial({
    vertexShader: planetVertSrc,
    fragmentShader: cloudLayerFrag,
    uniforms: cloudUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
  clouds.scale.setScalar(planetVisualScale(before));
  scene.add(clouds);

  const pulseGroup = new THREE.Group();
  scene.add(pulseGroup);
  const pulseMaterials: THREE.LineBasicMaterial[] = [];
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.RingGeometry(1.28 + i * 0.18, 1.285 + i * 0.18, 96);
    const edges = new THREE.EdgesGeometry(ring);
    const pulseMaterial = new THREE.LineBasicMaterial({
      color: i === 0 ? 0x44ff88 : i === 1 ? 0x7bb8ff : 0xff8844,
      transparent: true,
      opacity: 0,
    });
    pulseMaterials.push(pulseMaterial);
    const line = new THREE.LineSegments(edges, pulseMaterial);
    line.rotation.x = Math.PI / 2;
    pulseGroup.add(line);
  }

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.35, 0.55, 0.5));
  composer.addPass(new OutputPass());

  let frame = 0;
  let disposed = false;
  const start = performance.now();

  const updateUniforms = (elapsedSeconds: number): void => {
    const magnetic = phaseProgress(elapsedSeconds, 'magnetosphere');
    const atmosphereT = phaseProgress(elapsedSeconds, 'atmosphere');
    const oceanT = phaseProgress(elapsedSeconds, 'oceans');
    const bioT = phaseProgress(elapsedSeconds, 'biosphere');
    const cloudT = phaseProgress(elapsedSeconds, 'clouds');
    const finalT = smoothstep01(elapsedSeconds / (TERRAFORM_CUTSCENE_DURATION_MS / 1000));
    const u = material.uniforms;

    const lerpNumeric = (key: string, t: number, fallbackBefore = 0, fallbackAfter = fallbackBefore) => {
      u[key].value = lerpNumber(
        numericUniform(beforeUniforms, key, fallbackBefore),
        numericUniform(afterUniforms, key, fallbackAfter),
        t,
      );
    };
    const lerpColorUniform = (key: string, t: number) => {
      u[key].value = lerpColorValue(beforeUniforms[key]?.value, afterUniforms[key]?.value, t);
    };

    lerpColorUniform('uSurfaceBase', finalT);
    lerpColorUniform('uSurfaceHigh', finalT);
    lerpColorUniform('uOceanShallow', oceanT);
    lerpColorUniform('uOceanDeep', oceanT);
    lerpColorUniform('uBiomeTropical', bioT);
    lerpColorUniform('uBiomeTemperate', bioT);
    lerpColorUniform('uBiomeBoreal', bioT);
    lerpColorUniform('uBiomeDesert', bioT);
    lerpColorUniform('uBiomeTundra', bioT);

    lerpNumeric('uWaterCoverage', oceanT);
    lerpNumeric('uIceCapFraction', oceanT);
    lerpNumeric('uVegCoverage', bioT);
    lerpNumeric('uClimateShift', finalT);
    lerpNumeric('uSurfaceTempK', finalT);
    u.uMagneticStrength.value = Math.max(
      lerpNumber(0, numericUniform(afterUniforms, 'uMagneticStrength', 1), magnetic),
      numericUniform(beforeUniforms, 'uMagneticStrength', 0) * (1 - finalT),
    );
    u.uHasOcean.value = oceanT > 0.08 ? numericUniform(afterUniforms, 'uHasOcean', 1) : 0;
    u.uHasBiomes.value = bioT > 0.12 ? numericUniform(afterUniforms, 'uHasBiomes', 1) : 0;
    u.uHasRivers.value = oceanT > 0.35 ? numericUniform(afterUniforms, 'uHasRivers', 0) : 0;
    u.uTime.value = elapsedSeconds;

    const afterAtmos = after.atmosphere?.surfacePressureAtm ?? Math.max(after.habitability.atmosphere, 0.1);
    atmUniforms.uColor.value = colorUniform(afterUniforms, 'uStarColor', 0x7bb8ff)
      .clone()
      .lerp(new THREE.Color(0x4488ff), 0.65);
    atmUniforms.uIntensity.value = lerpNumber(0.02, 1.25, atmosphereT) * (0.8 + 0.35 * magnetic);
    atmUniforms.uPower.value = lerpNumber(3.6, 2.1, atmosphereT);
    atmUniforms.uPressure.value = lerpNumber(0.01, Math.max(0.2, afterAtmos), atmosphereT);

    cloudUniforms.uCoverage.value = lerpNumber(0, Math.max(0.22, numericUniform(afterUniforms, 'uWind', 0.4) * 0.5), cloudT);
    cloudUniforms.uTime.value = elapsedSeconds;

    planetMesh.scale.setScalar(lerpNumber(planetVisualScale(before), planetVisualScale(after), finalT));
    atmosphere.scale.setScalar(planetMesh.scale.x);
    clouds.scale.setScalar(planetMesh.scale.x);

    pulseMaterials.forEach((pulseMaterial, idx) => {
      const phaseOffset = (elapsedSeconds * 0.45 + idx * 0.24) % 1;
      pulseMaterial.opacity = (1 - phaseOffset) * (0.08 + magnetic * 0.18 + atmosphereT * 0.08);
      const child = pulseGroup.children[idx];
      child.scale.setScalar(1 + phaseOffset * 1.8);
    });

    const activePhase: TerraformPhaseId =
      finalT >= 0.99 ? 'complete'
        : cloudT > 0.05 ? 'clouds'
          : bioT > 0.05 ? 'biosphere'
            : oceanT > 0.05 ? 'oceans'
              : atmosphereT > 0.05 ? 'atmosphere'
                : 'magnetosphere';
    onPhase?.(activePhase, finalT);
  };

  const animate = () => {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    const elapsed = (performance.now() - start) / 1000;
    updateUniforms(elapsed);
    planetMesh.rotation.y += 0.0018 * 16.67;
    clouds.rotation.y += 0.0023 * 16.67;
    pulseGroup.rotation.z += 0.002;
    composer.render();
  };

  animate();

  const onResize = () => {
    if (disposed) return;
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);

  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      composer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach(disposeMaterial);
          else if (obj.material) disposeMaterial(obj.material);
        }
      });
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
