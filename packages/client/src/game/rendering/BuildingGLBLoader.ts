// BuildingGLBLoader — Babylon.js GLB asset cache with 3-level LOD + Draco support
//
// LOD levels (based on orthoSize — isometric camera zoom):
//   Hi  (orthoSize < 0.25) : {type}.glb          — original 4K, full detail
//   Mid (0.25 – 0.55)      : {type}_mid.glb      — 1K + Draco
//   Lo  (> 0.55)           : {type}_lo.glb       — 512px + Draco
//
// Draco WASM decoder loaded from Babylon CDN on first preloadAll().

import {
  Scene,
  SceneLoader,
  AssetContainer,
  AbstractMesh,
  TransformNode,
  ShadowGenerator,
  Vector3,
} from '@babylonjs/core';
import { DracoCompression } from '@babylonjs/core/Meshes/Compression/dracoCompression';
import '@babylonjs/loaders/glTF';

// ── Constants ────────────────────────────────────────────────────────────────

export const BUILDING_TYPES = [
  'colony_hub',
  'mine',
  'solar_plant',
  'research_lab',
  'water_extractor',
  'greenhouse',
  'observatory',
] as const;

export type BuildingGLBType = (typeof BUILDING_TYPES)[number];

export type LODLevel = 'hi' | 'mid' | 'lo';

export const LOD_HI_MAX  = 0.25;
export const LOD_MID_MAX = 0.55;

export function getLODLevel(orthoSize: number): LODLevel {
  if (orthoSize < LOD_HI_MAX) return 'hi';
  if (orthoSize < LOD_MID_MAX) return 'mid';
  return 'lo';
}

export interface PlacedGLBInstance {
  id: string;
  type: string;
  lod: LODLevel;
  rootMeshes: AbstractMesh[];
}

// ── Loader class ─────────────────────────────────────────────────────────────

interface LODContainers {
  hi:  AssetContainer | null;
  mid: AssetContainer | null;
  lo:  AssetContainer | null;
}

export class BuildingGLBLoader {
  private containers = new Map<string, LODContainers>();
  private static dracoConfigured = false;

  // ── Draco decoder setup (local files, one-time) ──────────────────────────
  // Using local /draco/ paths instead of CDN — Babylon.js v8 Tools.js rewrites
  // any URL starting with "https://cdn.babylonjs.com" into a versioned form like
  // "https://cdn.babylonjs.com/v8.56.0/..." which does not exist on the CDN.
  // Files copied from node_modules/@babylonjs/core/assets/Draco/ into public/draco/.

  private static configureDraco(): void {
    if (BuildingGLBLoader.dracoConfigured) return;
    DracoCompression.Configuration = {
      decoder: {
        wasmUrl:       '/draco/draco_wasm_wrapper_gltf.js',
        wasmBinaryUrl: '/draco/draco_decoder_gltf.wasm',
        fallbackUrl:   '/draco/draco_decoder_gltf.js',
      },
    };
    BuildingGLBLoader.dracoConfigured = true;
  }

  // ── Pre-load all building types (all 3 LOD variants) ────────────────────

  async preloadAll(scene: Scene): Promise<void> {
    BuildingGLBLoader.configureDraco();
    await Promise.allSettled(
      BUILDING_TYPES.flatMap((t) => [
        this.loadVariant(t, 'hi',  `${t}.glb`,     scene),
        this.loadVariant(t, 'mid', `${t}_mid.glb`, scene),
        this.loadVariant(t, 'lo',  `${t}_lo.glb`,  scene),
      ]),
    );
  }

  private async loadVariant(
    type: string,
    lod: LODLevel,
    filename: string,
    scene: Scene,
  ): Promise<void> {
    try {
      const container = await SceneLoader.LoadAssetContainerAsync(
        '/buildings/',
        filename,
        scene,
      );
      const entry: LODContainers = this.containers.get(type) ?? { hi: null, mid: null, lo: null };
      entry[lod] = container;
      this.containers.set(type, entry);
      console.log(`[GLBLoader] Loaded: /buildings/${filename}`);
    } catch (err) {
      // GLB not available — graceful fallback (hi-res used instead)
      console.warn(`[GLBLoader] Failed to load /buildings/${filename}:`, (err as Error).message);
    }
  }

  has(type: string): boolean {
    const entry = this.containers.get(type);
    return !!(entry && (entry.hi || entry.mid || entry.lo));
  }

  // ── Instantiate a building mesh for the given orthoSize ──────────────────

  instantiate(
    type: string,
    instanceId: string,
    position: Vector3,
    cellSize: number,
    shadowGen: ShadowGenerator | null,
    orthoSize: number,
  ): PlacedGLBInstance | null {
    const entry = this.containers.get(type);
    if (!entry) {
      console.warn(`[GLBLoader] No container entry for type: ${type}`);
      return null;
    }

    const lod = getLODLevel(orthoSize);
    // Fallback chain: requested LOD → hi → mid → lo
    const container = entry[lod] ?? entry.hi ?? entry.mid ?? entry.lo;
    if (!container) {
      console.warn(`[GLBLoader] No container for type: ${type}, lod: ${lod}`);
      return null;
    }

    const instantiated = container.instantiateModelsToScene(
      (name) => `${instanceId}_${name}`,
      false,
    );

    if (instantiated.rootNodes.length === 0) {
      console.warn(`[GLBLoader] instantiateModelsToScene returned 0 rootNodes for type: ${type}`);
      return null;
    }

    const root = instantiated.rootNodes[0] as TransformNode;

    // Force all instantiated meshes visible — containers may carry isVisible=false
    root.getChildMeshes(true).forEach((m) => {
      m.isVisible = true;
      m.setEnabled(true);
    });
    if (root instanceof AbstractMesh) {
      root.isVisible = true;
      root.setEnabled(true);
    }

    // Normalize scale: fit largest dimension into cellSize * 1.2
    // Bounding boxes are in world space with root at origin, scale=1 at this point
    const allMeshes: AbstractMesh[] = [];
    root.getChildMeshes(false).forEach((m) => allMeshes.push(m));
    if (root instanceof AbstractMesh) allMeshes.push(root);

    let worldMinY = 0;

    if (allMeshes.length > 0) {
      const worldMinX = Math.min(...allMeshes.map((m) => m.getBoundingInfo().boundingBox.minimumWorld.x));
      const worldMaxX = Math.max(...allMeshes.map((m) => m.getBoundingInfo().boundingBox.maximumWorld.x));
      worldMinY       = Math.min(...allMeshes.map((m) => m.getBoundingInfo().boundingBox.minimumWorld.y));
      const worldMaxY = Math.max(...allMeshes.map((m) => m.getBoundingInfo().boundingBox.maximumWorld.y));
      const worldMinZ = Math.min(...allMeshes.map((m) => m.getBoundingInfo().boundingBox.minimumWorld.z));
      const worldMaxZ = Math.max(...allMeshes.map((m) => m.getBoundingInfo().boundingBox.maximumWorld.z));

      const sizeX = worldMaxX - worldMinX;
      const sizeY = worldMaxY - worldMinY;
      const sizeZ = worldMaxZ - worldMinZ;
      const maxDim = Math.max(sizeX, sizeY, sizeZ);

      if (maxDim > 0) {
        const scale = (cellSize * 1.2) / maxDim;
        root.scaling.setAll(scale);

        // Position the root so the model's bottom sits exactly on the terrain (position.y).
        // worldMinY is the pre-scale bottom relative to root at origin, so after scaling
        // the bottom is at worldMinY * scale — offset root upward to cancel this out.
        root.position.x = position.x;
        root.position.z = position.z;
        root.position.y = position.y - worldMinY * scale;
      } else {
        root.position.copyFrom(position);
      }
    } else {
      root.position.copyFrom(position);
    }

    // Collect meshes for shadow casting/receiving
    const rootMeshes: AbstractMesh[] = [];
    root.getChildMeshes(false).forEach((m) => {
      rootMeshes.push(m);
      m.isVisible = true;
      m.receiveShadows = true;
      if (shadowGen) shadowGen.addShadowCaster(m, false);
    });
    if (root instanceof AbstractMesh) {
      root.isVisible = true;
      root.receiveShadows = true;
      if (shadowGen) shadowGen.addShadowCaster(root, false);
      rootMeshes.push(root);
    }

    return { id: instanceId, type, lod, rootMeshes };
  }

  // ── Remove an instantiated building ─────────────────────────────────────

  dispose(instance: PlacedGLBInstance, shadowGen: ShadowGenerator | null): void {
    for (const mesh of instance.rootMeshes) {
      if (shadowGen) shadowGen.removeShadowCaster(mesh);
      mesh.dispose();
    }
  }

  // ── Cleanup all cached containers ────────────────────────────────────────

  disposeAll(): void {
    this.containers.forEach((entry) => {
      entry.hi?.dispose();
      entry.mid?.dispose();
      entry.lo?.dispose();
    });
    this.containers.clear();
  }
}
