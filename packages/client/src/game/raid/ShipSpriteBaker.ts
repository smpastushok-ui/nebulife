// ---------------------------------------------------------------------------
// ShipSpriteBaker — GLB → PixiJS sprite atlas, baked once per raid session.
//
// NEXT_GEN_PLAN.md section A.1: render a ship GLB offscreen with Three.js
// (already a dependency for the Hangar/HexSurface GLB viewers) into a fixed
// stylized top-down camera, at RAID_SHIP_BAKE_ANGLES rotation steps and 2
// damage states (normal / damaged). The result is stitched into one canvas
// and sliced into PixiJS Texture frames — "looks like 3D, costs like 2D".
//
// Cached in-memory per session, keyed by GLB url + team tint, so multiple
// drones/wingmen reuse the same baked atlas (only the Sprite frame index and
// world transform differ per-entity — zero extra bake cost).
//
// Failure (missing/malformed GLB, WebGL context unavailable) resolves to
// `null` — callers fall back to the existing procedural polygon ship.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Rectangle, Texture } from 'pixi.js';
import { RAID_SHIP_BAKE_ANGLES } from './RaidConstants.js';

export interface ShipAtlas {
  /** RAID_SHIP_BAKE_ANGLES frames, index 0 = nose pointing up (matches Pixi rotation=0). */
  normal: Texture[];
  /** Same angles, darker/reddened for low-hp visual feedback. */
  damaged: Texture[];
  frameSize: number;
}

export interface BakeRequest {
  glbUrl: string;
  /** Team/accent tint lerped into the hull color, 0 = keep model's own materials untouched. */
  tint: number;
  /** How strongly to lerp the tint into material colors (0-1). */
  tintStrength: number;
  /** Baked cell size in px (tier-scaled — see RAID_SHIP_BAKE_SIZE_*). */
  frameSize: number;
  /** Cache key — usually glbUrl + tint + frameSize, or a custom-ship model id. */
  cacheKey: string;
  /** Model-specific yaw correction so the GLB's forward axis lines up with "nose up". */
  noseOffset?: number;
}

const NOSE_OFFSET_DEFAULT = Math.PI / 2;
const CAMERA_HALF_EXTENT = 42;
const MODEL_TARGET_SIZE = 64;

const atlasCache = new Map<string, ShipAtlas | null>();
const pendingBakes = new Map<string, Promise<ShipAtlas | null>>();

function isIosCapacitorRuntime(): boolean {
  const cap = (window as Window & { Capacitor?: { platform?: string } }).Capacitor;
  return cap?.platform === 'ios';
}

function releaseWebGLRenderer(renderer: THREE.WebGLRenderer): void {
  // Losing context explicitly speeds up GC on Android but crashes some iOS
  // WKWebView builds — same guard used by ShipSpriteCache.ts.
  if (!isIosCapacitorRuntime()) {
    try { renderer.forceContextLoss(); } catch { /* best-effort */ }
  }
  renderer.dispose();
}

let sharedRenderer: THREE.WebGLRenderer | null = null;
let sharedCanvas: HTMLCanvasElement | null = null;

function getSharedRenderer(size: number): THREE.WebGLRenderer | null {
  if (!sharedRenderer) {
    sharedCanvas = document.createElement('canvas');
    try {
      sharedRenderer = new THREE.WebGLRenderer({
        canvas: sharedCanvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
      });
    } catch {
      return null;
    }
    sharedRenderer.setClearColor(0x000000, 0);
  }
  sharedRenderer.setSize(size, size, false);
  return sharedRenderer;
}

function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material?.dispose();
  });
}

/** Scale+center the model so its longest axis = targetSize, wrap in a yaw-correction group. */
function normalizeModel(root: THREE.Object3D, targetSize: number, noseOffset: number): THREE.Group {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const longest = Math.max(size.x, size.y, size.z, 0.001);
  const scale = targetSize / longest;
  root.scale.setScalar(scale);
  root.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  const inner = new THREE.Group();
  inner.rotation.y = noseOffset;
  inner.add(root);
  const wrapper = new THREE.Group();
  wrapper.add(inner);
  return wrapper;
}

/** Clone materials and lerp their color/emissive toward `tint` by `amount`. */
function tintMaterials(root: THREE.Object3D, tint: number, amount: number, darken = 0): void {
  if (amount <= 0 && darken <= 0) return;
  const color = new THREE.Color(tint);
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const wasArray = Array.isArray(obj.material);
    const materials: THREE.Material[] = wasArray ? obj.material : [obj.material];
    const cloned = materials.map((material) => {
      const clone = material.clone();
      if ('color' in clone && clone.color instanceof THREE.Color) {
        if (amount > 0) clone.color.lerp(color, amount);
        if (darken > 0) clone.color.multiplyScalar(1 - darken);
      }
      if ('emissive' in clone && clone.emissive instanceof THREE.Color) {
        if (amount > 0) clone.emissive.lerp(color, amount * 0.4);
        if (darken > 0) clone.emissive.multiplyScalar(1 - darken * 0.6);
      }
      return clone;
    });
    obj.material = wasArray ? cloned : cloned[0];
  });
}

async function loadGlbScene(url: string): Promise<THREE.Object3D | null> {
  try {
    const gltf = await new GLTFLoader().loadAsync(url);
    return gltf.scene;
  } catch {
    return null;
  }
}

function buildAtlasFromCanvas(canvas: HTMLCanvasElement, angles: number, frameSize: number): ShipAtlas {
  const base = Texture.from(canvas);
  const normal: Texture[] = [];
  const damaged: Texture[] = [];
  for (let i = 0; i < angles; i++) {
    normal.push(new Texture({ source: base.source, frame: new Rectangle(i * frameSize, 0, frameSize, frameSize) }));
    damaged.push(new Texture({ source: base.source, frame: new Rectangle(i * frameSize, frameSize, frameSize, frameSize) }));
  }
  return { normal, damaged, frameSize };
}

function renderAtlas(scene0: THREE.Object3D, req: BakeRequest): ShipAtlas | null {
  const size = req.frameSize;
  const renderer = getSharedRenderer(size);
  if (!renderer) return null;

  const angles = RAID_SHIP_BAKE_ANGLES;
  const atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = size * angles;
  atlasCanvas.height = size * 2;
  const ctx = atlasCanvas.getContext('2d');
  if (!ctx) return null;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-CAMERA_HALF_EXTENT, CAMERA_HALF_EXTENT, CAMERA_HALF_EXTENT, -CAMERA_HALF_EXTENT, 1, 600);
  camera.position.set(0, 220, 0);
  camera.up.set(0, 0, -1);
  camera.lookAt(0, 0, 0);
  scene.add(camera);

  // Fixed stylized lighting — dark space palette, consistent across every
  // baked ship regardless of the source GLB's own materials/lights.
  scene.add(new THREE.AmbientLight(0x445566, 1.35));
  const key = new THREE.DirectionalLight(0xddeeff, 2.5);
  key.position.set(70, 160, 45);
  scene.add(key);
  const rimColor = req.tint || 0x7bb8ff;
  const rim = new THREE.DirectionalLight(rimColor, 1.9);
  rim.position.set(-80, 70, -90);
  scene.add(rim);

  const noseOffset = req.noseOffset ?? NOSE_OFFSET_DEFAULT;
  const normalGroup = normalizeModel(scene0, MODEL_TARGET_SIZE, noseOffset);
  tintMaterials(normalGroup, req.tint, req.tintStrength);

  const damagedGroup = normalGroup.clone(true);
  damagedGroup.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      const mat = obj.material;
      obj.material = Array.isArray(mat) ? mat.map((m) => m.clone()) : mat.clone();
    }
  });
  tintMaterials(damagedGroup, 0xff3322, 0.42, 0.32);

  const groups = [normalGroup, damagedGroup];
  for (let pass = 0; pass < groups.length; pass++) {
    const group = groups[pass];
    scene.add(group);
    for (let i = 0; i < angles; i++) {
      const angle = (i / angles) * Math.PI * 2;
      // Negative sign: Pixi rotation increases clockwise on screen (Y-down);
      // a Three.js top-down camera with up=(0,0,-1) sees positive rotation.y
      // as counter-clockwise, so we invert to keep the two conventions in sync.
      group.rotation.y = -angle;
      renderer.clear();
      renderer.render(scene, camera);
      ctx.drawImage(renderer.domElement, i * size, pass * size, size, size);
    }
    scene.remove(group);
    disposeObject3D(group);
  }

  return buildAtlasFromCanvas(atlasCanvas, angles, size);
}

/**
 * Bake (or fetch from cache) a rotation atlas for the given GLB. Resolves to
 * `null` on any failure — caller must fall back to the procedural ship.
 */
export async function bakeShipAtlas(req: BakeRequest): Promise<ShipAtlas | null> {
  const cached = atlasCache.get(req.cacheKey);
  if (cached !== undefined) return cached;
  const pending = pendingBakes.get(req.cacheKey);
  if (pending) return pending;

  const promise = (async () => {
    const scene = await loadGlbScene(req.glbUrl);
    if (!scene) return null;
    try {
      return renderAtlas(scene, req);
    } catch {
      return null;
    } finally {
      disposeObject3D(scene);
    }
  })().then((result) => {
    atlasCache.set(req.cacheKey, result);
    pendingBakes.delete(req.cacheKey);
    return result;
  });
  pendingBakes.set(req.cacheKey, promise);
  return promise;
}

/** Release the shared Three.js renderer (call on final raid teardown, not per-match). */
export function disposeSharedBakerRenderer(): void {
  if (sharedRenderer) {
    releaseWebGLRenderer(sharedRenderer);
    sharedRenderer = null;
    sharedCanvas = null;
  }
}

/** Clear the in-memory atlas cache (e.g. after a custom ship is re-generated). */
export function clearShipAtlasCache(cacheKey?: string): void {
  if (cacheKey) {
    atlasCache.delete(cacheKey);
  } else {
    atlasCache.clear();
  }
}
