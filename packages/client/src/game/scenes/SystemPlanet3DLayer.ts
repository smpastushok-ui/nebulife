import * as THREE from 'three';
import type { Planet, Star } from '@nebulife/core';

export interface SystemPlanet3DNode {
  planet: Planet;
  textureUrl: string | null;
  x: number;
  y: number;
  radius: number;
  zIndex: number;
  lightX: number;
  lightY: number;
  spinRevolutionsPerMs: number;
  initialLongitude: number;
  visible: boolean;
}

export interface SystemStar3DNode {
  x: number;
  y: number;
  radius: number;
  colorHex: string;
  timeMs: number;
}

interface MeshRecord {
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  texture: THREE.Texture | null;
  textureUrl: string | null;
  texturePending: boolean;
  spin: number;
  longitude: number;
}

const SYSTEM_3D_SPIN_READABILITY = 6;

export class SystemPlanet3DLayer {
  private static activeLayers = new Set<SystemPlanet3DLayer>();

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(0, 1, 1, 0, -1000, 1000);
  private ambient = new THREE.AmbientLight(0x5a6f90, 0.64);
  private starLight = new THREE.PointLight(0xfff1d2, 30000, 3200, 1.05);
  private fillLight = new THREE.DirectionalLight(0x5b739d, 0.22);
  private starSprite: THREE.Sprite | null = null;
  private starTexture: THREE.CanvasTexture | null = null;
  private records = new Map<string, MeshRecord>();
  private textureCache = new Map<string, THREE.Texture>();
  private prevPosition: string;
  private prevOverflow: string;
  private width = 1;
  private height = 1;
  private destroyed = false;

  constructor(private host: HTMLElement) {
    for (const layer of SystemPlanet3DLayer.activeLayers) {
      if (layer.host === host) layer.destroy();
    }
    SystemPlanet3DLayer.activeLayers.add(this);

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
    this.renderer.domElement.dataset.systemPlanet3dLayer = 'true';
    for (const canvas of Array.from(host.querySelectorAll<HTMLCanvasElement>('canvas[data-system-planet3d-layer="true"]'))) {
      canvas.remove();
    }
    host.appendChild(this.renderer.domElement);

    this.fillLight.position.set(0, 0, 650);
    this.scene.add(this.ambient, this.starLight, this.fillLight);
    this.resize();
  }

  resize(): void {
    if (this.destroyed) return;
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

  sync(nodes: SystemPlanet3DNode[], star: SystemStar3DNode, deltaMs: number): void {
    if (this.destroyed) return;
    this.resize();
    this.syncStar(star);
    const live = new Set<string>();
    for (const node of nodes) {
      live.add(node.planet.id);
      const record = this.getOrCreateRecord(node);
      record.spin = node.spinRevolutionsPerMs;
      record.longitude = (record.longitude + record.spin * deltaMs * SYSTEM_3D_SPIN_READABILITY) % 1;
      if (record.texture) record.texture.offset.x = (node.initialLongitude + record.longitude) % 1;

      record.mesh.visible = node.visible && (!node.textureUrl || (!record.texturePending && !!record.texture));
      record.mesh.position.set(node.x, node.y, node.zIndex * 0.001);
      record.mesh.scale.setScalar(Math.max(1, node.radius));
      record.mesh.renderOrder = node.zIndex;

      const lightDir = new THREE.Vector3(node.lightX, node.lightY, 0.42).normalize();
      record.mesh.rotation.y = (node.initialLongitude + record.longitude) * Math.PI * 2;
      record.mesh.rotation.x = lightDir.y * 0.12;
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
    if (this.destroyed) return;
    const record = this.records.get(planetId);
    if (!record || record.textureUrl === textureUrl) return;
    record.textureUrl = textureUrl;
    this.applyTexture(record, textureUrl);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    SystemPlanet3DLayer.activeLayers.delete(this);

    for (const record of this.records.values()) {
      this.scene.remove(record.mesh);
      record.material.dispose();
      record.mesh.geometry.dispose();
    }
    this.records.clear();
    for (const texture of this.textureCache.values()) texture.dispose();
    this.textureCache.clear();
    if (this.starSprite) {
      this.scene.remove(this.starSprite);
      const material = this.starSprite.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material.dispose();
      this.starSprite = null;
    }
    this.starTexture?.dispose();
    this.starTexture = null;
    this.renderer.forceContextLoss();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.host.style.position = this.prevPosition;
    this.host.style.overflow = this.prevOverflow;
  }

  private syncStar(star: SystemStar3DNode): void {
    if (!this.starSprite) {
      this.starTexture = this.createStarTexture(star.colorHex);
      const material = new THREE.SpriteMaterial({
        map: this.starTexture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      this.starSprite = new THREE.Sprite(material);
      this.starSprite.renderOrder = 100000;
      this.scene.add(this.starSprite);
    }
    const pulse = 1 + Math.sin(star.timeMs * 0.002) * 0.035 + Math.sin(star.timeMs * 0.0051) * 0.012;
    this.starSprite.position.set(star.x, star.y, 800);
    this.starSprite.scale.set(star.radius * 7.2 * pulse, star.radius * 7.2 * pulse, 1);
    this.starLight.color.set(star.colorHex);
    this.starLight.position.set(star.x, star.y, 260);
  }

  private createStarTexture(colorHex: string): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const center = size / 2;
    const glow = ctx.createRadialGradient(center, center, 0, center, center, center);
    glow.addColorStop(0.00, 'rgba(255,255,255,1)');
    glow.addColorStop(0.16, `${colorHex}ee`);
    glow.addColorStop(0.34, `${colorHex}78`);
    glow.addColorStop(0.62, `${colorHex}22`);
    glow.addColorStop(1.00, `${colorHex}00`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = `${colorHex}44`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(center + Math.cos(a) * 18, center + Math.sin(a) * 18);
      ctx.lineTo(center + Math.cos(a) * 118, center + Math.sin(a) * 118);
      ctx.stroke();
    }
    return new THREE.CanvasTexture(canvas);
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
      emissiveIntensity: 0.015,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    this.scene.add(mesh);

    const record: MeshRecord = {
      mesh,
      material,
      texture: null,
      textureUrl: node.textureUrl,
      texturePending: false,
      spin: node.spinRevolutionsPerMs,
      longitude: node.initialLongitude,
    };
    this.records.set(node.planet.id, record);
    this.applyTexture(record, node.textureUrl);
    return record;
  }

  private applyTexture(record: MeshRecord, textureUrl: string | null): void {
    record.texture = null;
    record.texturePending = !!textureUrl;
    record.material.map = null;
    record.material.needsUpdate = true;
    if (!textureUrl) return;

    const cached = this.textureCache.get(textureUrl);
    if (cached) {
      record.texture = cached;
      record.texturePending = false;
      record.material.map = cached;
      record.material.needsUpdate = true;
      return;
    }

    new THREE.TextureLoader().load(textureUrl, (texture) => {
      if (this.destroyed || record.textureUrl !== textureUrl) {
        texture.dispose();
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
      this.textureCache.set(textureUrl, texture);
      record.texture = texture;
      record.texturePending = false;
      record.material.map = texture;
      record.material.needsUpdate = true;
    });
  }
}
