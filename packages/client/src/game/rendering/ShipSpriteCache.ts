// ---------------------------------------------------------------------------
// ShipSpriteCache — render a GLB ship model into an HTMLCanvasElement once,
// reuse the bitmap as a PixiJS-compatible texture source.
//
// Used by SystemScene (PixiJS 2D) to show the evacuation ship instead of a
// hand-drawn Graphics rectangle. Three.js off-screen renders the model from
// a fixed side angle, then the resulting canvas is handed to PixiJS via
// Texture.from().
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const SHIP_GLB = '/arena_ships/blue_ship.glb';

// 128px is enough detail at the small screen size this sprite appears in,
// and stays cheap to rasterize once.
const SPRITE_SIZE = 128;

let _cachedCanvas: HTMLCanvasElement | null = null;
let _loading: Promise<HTMLCanvasElement | null> | null = null;

/**
 * Load the GLB and render it into a canvas. Cached across calls. Resolves
 * to `null` on failure (network / malformed file) — caller should fall
 * back to a procedural sprite.
 */
export function getShipSpriteCanvas(): Promise<HTMLCanvasElement | null> {
  if (_cachedCanvas) return Promise.resolve(_cachedCanvas);
  if (_loading) return _loading;

  _loading = new Promise<HTMLCanvasElement | null>((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = SPRITE_SIZE;
    canvas.height = SPRITE_SIZE;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true, // keep pixels accessible for PixiJS
      });
    } catch {
      resolve(null);
      return;
    }
    renderer.setSize(SPRITE_SIZE, SPRITE_SIZE, false);
    renderer.setClearColor(0x000000, 0); // transparent

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(25, 1, 0.1, 100);
    camera.position.set(0, 0, 4);
    camera.lookAt(0, 0, 0);

    // Lighting — side-rim + soft fill so the model reads as a silhouette.
    const rim = new THREE.DirectionalLight(0xccddff, 1.8);
    rim.position.set(2, 1.5, 1);
    scene.add(rim);
    const fill = new THREE.AmbientLight(0x334455, 1.0);
    scene.add(fill);

    const loader = new GLTFLoader();
    loader.load(
      SHIP_GLB,
      (gltf) => {
        const model = gltf.scene;
        // Normalize + center so longest axis ≈ 2.0 world units (fits FOV 25° @ 4u).
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        const longest = Math.max(size.x, size.y, size.z);
        const factor = longest > 0.0001 ? 2.0 / longest : 1;
        model.scale.setScalar(factor);
        model.position.set(-center.x * factor, -center.y * factor, -center.z * factor);
        // Orient the nose along +X (screen-right) so PixiJS can rotate the
        // sprite to match its Bezier direction vector.
        model.rotation.y = Math.PI / 2;
        scene.add(model);

        renderer.render(scene, camera);
        _cachedCanvas = canvas;

        // Dispose Three.js resources; canvas (with its 2D pixel buffer) stays.
        model.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry?.dispose?.();
            const m = o.material;
            if (Array.isArray(m)) m.forEach((mm) => mm.dispose?.());
            else m?.dispose?.();
          }
        });
        renderer.dispose();
        resolve(canvas);
      },
      undefined,
      () => {
        renderer.dispose();
        resolve(null);
      },
    );
  });
  return _loading;
}

/** Synchronous accessor — returns the cached canvas or null if not ready yet. */
export function peekShipSpriteCanvas(): HTMLCanvasElement | null {
  return _cachedCanvas;
}
