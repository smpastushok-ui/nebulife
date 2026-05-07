import * as THREE from 'three';
import type { Planet, Star } from '@nebulife/core';

export interface SystemPlanet3DNode {
  planet: Planet;
  textureUrl: string | null;
  x: number;
  y: number;
  radius: number;
  zIndex: number;
  lightAngle: number;
  spinRevolutionsPerMs: number;
  initialLongitude: number;
  visible: boolean;
}

interface MeshRecord {
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  texture: THREE.Texture | null;
  textureUrl: string | null;
  spin: number;
  longitude: number;
}

export class SystemPlanet3DLayer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(0, 1, 1, 0, -1000, 1000);
  private ambient = new THREE.AmbientLight(0x6f86aa, 1.15);
  private keyLight = new THREE.DirectionalLight(0xfff1d2, 1.45);
  private fillLight = new THREE.DirectionalLight(0x6f88bb, 0.35);
  private records = new Map<string, MeshRecord>();
  private textureCache = new Map<string, THREE.Texture>();
  private prevPosition: string;
  private prevOverflow: string;
  private width = 1;
  private height = 1;

  constructor(private host: HTMLElement) {
    this.prevPosition = host.style.position;
    this.prevOverflow = host.style.overflow;
    const computed = window.getComputedStyle(host);
    if (computed.position === 'static') host.style.position = 'relative';
    host.style.overflow = 'hidden';

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.inset = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.pointerEvents = 'none';
    this.renderer.domElement.style.zIndex = '2';
    host.appendChild(this.renderer.domElement);

    this.scene.add(this.ambient, this.keyLight, this.fillLight);
    this.resize();
  }

  resize(): void {
    const rect = this.host.getBoundingClientRect();
    this.width = Math.max(1, Math.floor(rect.width));
    this.height = Math.max(1, Math.floor(rect.height));
    this.renderer.setSize(this.width, this.height, false);
    this.camera.left = 0;
    this.camera.right = this.width;
    this.camera.top = 0;
    this.camera.bottom = this.height;
    this.camera.near = 0;
    this.camera.far = 2000;
    this.camera.position.set(0, 0, 1000);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  sync(nodes: SystemPlanet3DNode[], deltaMs: number): void {
    this.resize();
    const live = new Set<string>();
    for (const node of nodes) {
      live.add(node.planet.id);
      const record = this.getOrCreateRecord(node);
      record.spin = node.spinRevolutionsPerMs;
      record.longitude = (record.longitude + record.spin * deltaMs) % 1;
      if (record.texture) record.texture.offset.x = (node.initialLongitude + record.longitude) % 1;

      record.mesh.visible = node.visible;
      record.mesh.position.set(node.x, node.y, node.zIndex * 0.001);
      record.mesh.scale.setScalar(Math.max(1, node.radius));
      record.mesh.renderOrder = node.zIndex;

      const lightDir = new THREE.Vector3(Math.cos(node.lightAngle), Math.sin(node.lightAngle), 0.72).normalize();
      this.keyLight.position.set(node.x + lightDir.x * 600, node.y + lightDir.y * 600, 500);
      this.fillLight.position.set(node.x - lightDir.x * 400, node.y - lightDir.y * 400, 350);
    }

    for (const [planetId, record] of this.records) {
      if (live.has(planetId)) continue;
      this.scene.remove(record.mesh);
      record.material.dispose();
      record.mesh.geometry.dispose();
      this.records.delete(planetId);
    }

    this.renderer.render(this.scene, this.camera);
  }

  setTexture(planetId: string, textureUrl: string | null): void {
    const record = this.records.get(planetId);
    if (!record || record.textureUrl === textureUrl) return;
    record.textureUrl = textureUrl;
    this.applyTexture(record, textureUrl);
  }

  destroy(): void {
    for (const record of this.records.values()) {
      this.scene.remove(record.mesh);
      record.material.dispose();
      record.mesh.geometry.dispose();
    }
    this.records.clear();
    for (const texture of this.textureCache.values()) texture.dispose();
    this.textureCache.clear();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.host.style.position = this.prevPosition;
    this.host.style.overflow = this.prevOverflow;
  }

  private getOrCreateRecord(node: SystemPlanet3DNode): MeshRecord {
    const existing = this.records.get(node.planet.id);
    if (existing) {
      if (existing.textureUrl !== node.textureUrl) {
        existing.textureUrl = node.textureUrl;
        this.applyTexture(existing, node.textureUrl);
      }
      return existing;
    }

    const geometry = new THREE.SphereGeometry(1, 48, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0,
      emissive: new THREE.Color(0x05070a),
      emissiveIntensity: 0.08,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    this.scene.add(mesh);

    const record: MeshRecord = {
      mesh,
      material,
      texture: null,
      textureUrl: node.textureUrl,
      spin: node.spinRevolutionsPerMs,
      longitude: node.initialLongitude,
    };
    this.records.set(node.planet.id, record);
    this.applyTexture(record, node.textureUrl);
    return record;
  }

  private applyTexture(record: MeshRecord, textureUrl: string | null): void {
    record.texture = null;
    record.material.map = null;
    record.material.needsUpdate = true;
    if (!textureUrl) return;

    const cached = this.textureCache.get(textureUrl);
    if (cached) {
      record.texture = cached;
      record.material.map = cached;
      record.material.needsUpdate = true;
      return;
    }

    new THREE.TextureLoader().load(textureUrl, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
      this.textureCache.set(textureUrl, texture);
      record.texture = texture;
      record.material.map = texture;
      record.material.needsUpdate = true;
    });
  }
}
