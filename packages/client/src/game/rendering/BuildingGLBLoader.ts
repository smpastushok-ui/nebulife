// BuildingGLBLoader — Babylon.js GLB asset cache for surface buildings
// Loads .glb files from /public/buildings/{type}.glb, caches AssetContainers,
// and provides instantiation with proper scale normalization.

import { Scene, SceneLoader, AssetContainer, AbstractMesh, TransformNode, ShadowGenerator, Vector3 } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

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

export interface PlacedGLBInstance {
  id: string;
  type: string;
  rootMeshes: AbstractMesh[];
}

export class BuildingGLBLoader {
  private containers = new Map<string, AssetContainer>();

  // ── Pre-load all building types in parallel ─────────────────────────────

  async preloadAll(scene: Scene): Promise<void> {
    await Promise.allSettled(
      BUILDING_TYPES.map((t) => this.loadType(t, scene)),
    );
  }

  private async loadType(type: string, scene: Scene): Promise<void> {
    if (this.containers.has(type)) return;
    try {
      const container = await SceneLoader.LoadAssetContainerAsync(
        '/buildings/',
        `${type}.glb`,
        scene,
      );
      this.containers.set(type, container);
    } catch {
      // GLB not available yet — canvas fallback will be used
    }
  }

  has(type: string): boolean {
    return this.containers.has(type);
  }

  // ── Instantiate a building mesh in the scene ─────────────────────────────

  instantiate(
    type: string,
    instanceId: string,
    position: Vector3,
    cellSize: number,
    shadowGen: ShadowGenerator | null,
  ): PlacedGLBInstance | null {
    const container = this.containers.get(type);
    if (!container) return null;

    const entries = container.instantiateModelsToScene(
      (name) => `${instanceId}_${name}`,
      false,
    );

    if (entries.rootNodes.length === 0) return null;

    const root = entries.rootNodes[0] as TransformNode;

    // Normalize scale: fit largest dimension into cellSize * 1.2
    const allMeshes: AbstractMesh[] = [];
    root.getChildMeshes(false).forEach((m) => allMeshes.push(m));
    if (root instanceof AbstractMesh) allMeshes.push(root);

    if (allMeshes.length > 0) {
      const worldMinX = Math.min(...allMeshes.map((m) => m.getBoundingInfo().boundingBox.minimumWorld.x));
      const worldMaxX = Math.max(...allMeshes.map((m) => m.getBoundingInfo().boundingBox.maximumWorld.x));
      const worldMinY = Math.min(...allMeshes.map((m) => m.getBoundingInfo().boundingBox.minimumWorld.y));
      const worldMaxY = Math.max(...allMeshes.map((m) => m.getBoundingInfo().boundingBox.maximumWorld.y));
      const worldMinZ = Math.min(...allMeshes.map((m) => m.getBoundingInfo().boundingBox.minimumWorld.z));
      const worldMaxZ = Math.max(...allMeshes.map((m) => m.getBoundingInfo().boundingBox.maximumWorld.z));

      const sizeX = worldMaxX - worldMinX;
      const sizeY = worldMaxY - worldMinY;
      const sizeZ = worldMaxZ - worldMinZ;
      const maxDim = Math.max(sizeX, sizeY, sizeZ);

      if (maxDim > 0) {
        const targetSize = cellSize * 1.2;
        const scaleFactor = targetSize / maxDim;
        root.scaling.setAll(scaleFactor);
      }
    }

    // Position the root node
    root.position.copyFrom(position);

    // Collect all child meshes for shadow casting
    const rootMeshes: AbstractMesh[] = [];
    root.getChildMeshes(false).forEach((m) => {
      rootMeshes.push(m);
      m.receiveShadows = true;
      if (shadowGen) shadowGen.addShadowCaster(m, false);
    });
    if (root instanceof AbstractMesh) {
      root.receiveShadows = true;
      if (shadowGen) shadowGen.addShadowCaster(root, false);
      rootMeshes.push(root);
    }

    return { id: instanceId, type, rootMeshes };
  }

  // ── Remove an instantiated building ─────────────────────────────────────

  dispose(instance: PlacedGLBInstance, shadowGen: ShadowGenerator | null): void {
    for (const mesh of instance.rootMeshes) {
      if (shadowGen) shadowGen.removeShadowCaster(mesh);
      mesh.dispose();
    }
  }

  // ── Cleanup all containers ───────────────────────────────────────────────

  disposeAll(): void {
    this.containers.forEach((c) => c.dispose());
    this.containers.clear();
  }
}
