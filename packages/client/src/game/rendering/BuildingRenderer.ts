// ---------------------------------------------------------------------------
// BuildingRenderer — Three.js building meshes on the surface terrain
// ---------------------------------------------------------------------------
// Renders buildings as textured planes in the same Three.js scene as the
// terrain quad.  A THREE.Group is transformed each frame to match the
// terrain shader's pan/zoom, so buildings move with the terrain.
//
// Coordinate mapping:
//   Grid cell (gx, gy) → base scene position:
//     baseX = (gx + 0.5) / gridW - 0.5
//     baseY = 0.5 - (gy + 0.5) / gridH
//   With pan/zoom the group transform does:
//     group.scale  = (zoom, zoom, 1)
//     group.position = (-panX * zoom, -panY * zoom, 0)
//   So each building's final scene position =
//     ((baseX - panX) * zoom, (baseY - panY) * zoom, z)
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import type { PlacedBuilding } from '@nebulife/core';
import { getBuildingTexture, BUILDING_COLORS, disposeBuildingTextures } from './BuildingSprites.js';

import buildingVertSrc from '../../shaders/surface/building.vert.glsl?raw';
import buildingFragSrc from '../../shaders/surface/building.frag.glsl?raw';

/** Hex color string → THREE.Color */
function hexToColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

interface BuildingMeshData {
  id: string;
  mesh: THREE.Mesh;
  shadowMesh: THREE.Mesh;
  labelSprite: THREE.Sprite | null;
  type: string;
  level: number;
  gridX: number;
  gridY: number;
}

/** Short building label for overlay */
const BUILDING_SHORT_NAMES: Record<string, string> = {
  colony_hub: 'Центр',
  mine: 'Шахта',
  solar_plant: 'Енергія',
  research_lab: 'Лаб.',
  water_extractor: 'Вода',
  greenhouse: 'Теплиця',
  observatory: 'Обс.',
};

export class BuildingRenderer {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private shadowGroup: THREE.Group;
  private labelGroup: THREE.Group;
  private meshes: Map<string, BuildingMeshData> = new Map();
  private gridW: number;
  private gridH: number;

  // Shared geometry for all building planes
  private planeGeo: THREE.PlaneGeometry;
  private shadowGeo: THREE.PlaneGeometry;

  // Shadow material (shared)
  private shadowMat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene, gridW: number, gridH: number) {
    this.scene = scene;
    this.gridW = gridW;
    this.gridH = gridH;

    // Building group (z = 0.002 above terrain)
    this.group = new THREE.Group();
    this.group.renderOrder = 2;
    scene.add(this.group);

    // Shadow group (z = 0.001, between terrain and buildings)
    this.shadowGroup = new THREE.Group();
    this.shadowGroup.renderOrder = 1;
    scene.add(this.shadowGroup);

    // Label group (z = 0.003, above buildings)
    this.labelGroup = new THREE.Group();
    this.labelGroup.renderOrder = 3;
    scene.add(this.labelGroup);

    // Shared geometries
    const cellSize = this.getCellSize();
    this.planeGeo = new THREE.PlaneGeometry(cellSize * 1.4, cellSize * 1.4);
    this.shadowGeo = new THREE.PlaneGeometry(cellSize * 1.2, cellSize * 0.5);

    // Shadow material
    this.shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
  }

  private getCellSize(): number {
    return Math.max(1 / this.gridW, 1 / this.gridH);
  }

  /** Convert grid position to base scene coordinates */
  private gridToBase(gx: number, gy: number): { x: number; y: number } {
    return {
      x: (gx + 0.5) / this.gridW - 0.5,
      y: 0.5 - (gy + 0.5) / this.gridH,
    };
  }

  /** Create shader material for a building */
  private createBuildingMaterial(type: string, level: number): THREE.ShaderMaterial {
    const texture = getBuildingTexture(type, level);
    const accentHex = BUILDING_COLORS[type] ?? '#aabbcc';

    return new THREE.ShaderMaterial({
      vertexShader: buildingVertSrc,
      fragmentShader: buildingFragSrc,
      uniforms: {
        uBuildingTex: { value: texture },
        uTime: { value: 0 },
        uLevel: { value: level },
        uAccentColor: { value: hexToColor(accentHex) },
        uSelected: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
    });
  }

  /** Create a text label sprite */
  private createLabelSprite(type: string, level: number): THREE.Sprite {
    const label = BUILDING_SHORT_NAMES[type] ?? type;
    const levelStr = level > 1 ? ` ${level}` : '';
    const text = label + levelStr;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 128, 32);
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Text shadow
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillText(text, 65, 17);
    // Text
    ctx.fillStyle = '#aabbcc';
    ctx.fillText(text, 64, 16);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(material);
    const cellSize = this.getCellSize();
    sprite.scale.set(cellSize * 2.5, cellSize * 0.6, 1);

    return sprite;
  }

  /** Add a single building to the scene */
  private addBuilding(b: PlacedBuilding): void {
    const pos = this.gridToBase(b.x, b.y);

    // Building mesh
    const material = this.createBuildingMaterial(b.type, b.level);
    const mesh = new THREE.Mesh(this.planeGeo, material);
    mesh.position.set(pos.x, pos.y, 0.002);
    this.group.add(mesh);

    // Shadow mesh (offset lower-right to match terrain shader light: upper-left)
    const shadowMesh = new THREE.Mesh(this.shadowGeo, this.shadowMat);
    const cellSize = this.getCellSize();
    shadowMesh.position.set(
      pos.x + cellSize * 0.15,
      pos.y - cellSize * 0.12,
      0.001,
    );
    this.shadowGroup.add(shadowMesh);

    // Label sprite
    const labelSprite = this.createLabelSprite(b.type, b.level);
    labelSprite.position.set(pos.x, pos.y - cellSize * 0.8, 0.003);
    this.labelGroup.add(labelSprite);

    this.meshes.set(b.id, {
      id: b.id,
      mesh,
      shadowMesh,
      labelSprite,
      type: b.type,
      level: b.level,
      gridX: b.x,
      gridY: b.y,
    });
  }

  /** Remove a building from the scene */
  private removeBuilding(id: string): void {
    const data = this.meshes.get(id);
    if (!data) return;

    this.group.remove(data.mesh);
    (data.mesh.material as THREE.ShaderMaterial).dispose();

    this.shadowGroup.remove(data.shadowMesh);

    if (data.labelSprite) {
      this.labelGroup.remove(data.labelSprite);
      (data.labelSprite.material as THREE.SpriteMaterial).map?.dispose();
      (data.labelSprite.material as THREE.SpriteMaterial).dispose();
    }

    this.meshes.delete(id);
  }

  /** Sync buildings with current state — add new, remove deleted, update changed */
  updateBuildings(buildings: PlacedBuilding[]): void {
    const currentIds = new Set(buildings.map((b) => b.id));
    const existingIds = new Set(this.meshes.keys());

    // Remove buildings that no longer exist
    for (const id of existingIds) {
      if (!currentIds.has(id)) {
        this.removeBuilding(id);
      }
    }

    // Add new buildings, update existing
    for (const b of buildings) {
      const existing = this.meshes.get(b.id);
      if (!existing) {
        this.addBuilding(b);
      } else if (existing.level !== b.level) {
        // Level changed — recreate
        this.removeBuilding(b.id);
        this.addBuilding(b);
      }
    }
  }

  /** Update per-frame: sync group transform with terrain pan/zoom, update time */
  update(panX: number, panY: number, zoom: number, time: number): void {
    // Transform groups to match terrain shader pan/zoom
    // Shader: worldPos = (vUv - 0.5) / zoom + pan + seedOff
    // Building scenePos = (basePos - pan) * zoom
    // Group transform: child.pos * scale + group.pos = base * zoom + (-pan * zoom)
    this.group.scale.set(zoom, zoom, 1);
    this.group.position.set(-panX * zoom, -panY * zoom, 0);

    this.shadowGroup.scale.set(zoom, zoom, 1);
    this.shadowGroup.position.set(-panX * zoom, -panY * zoom, 0);

    this.labelGroup.scale.set(zoom, zoom, 1);
    this.labelGroup.position.set(-panX * zoom, -panY * zoom, 0);

    // Update time uniform in all building materials
    for (const data of this.meshes.values()) {
      const mat = data.mesh.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = time;
    }

    // LOD: hide labels when zoomed far out
    this.labelGroup.visible = zoom >= 0.8;
  }

  /** Clean up all GPU resources */
  dispose(): void {
    for (const id of [...this.meshes.keys()]) {
      this.removeBuilding(id);
    }

    this.scene.remove(this.group);
    this.scene.remove(this.shadowGroup);
    this.scene.remove(this.labelGroup);

    this.planeGeo.dispose();
    this.shadowGeo.dispose();
    this.shadowMat.dispose();

    disposeBuildingTextures();
  }
}
