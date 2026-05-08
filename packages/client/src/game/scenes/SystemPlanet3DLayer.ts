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
  spectralClass: Star['spectralClass'];
  temperatureK: number;
  radiusSolar: number;
  luminositySolar: number;
  timeMs: number;
}

interface MeshRecord {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  glow: THREE.Sprite;
  rings: THREE.Group | null;
  texture: THREE.Texture | null;
  textureUrl: string | null;
  texturePending: boolean;
  spin: number;
  longitude: number;
}

const SYSTEM_3D_SPIN_READABILITY = 6;

function seededUnit(seed: number, salt: number): number {
  let x = (seed ^ (salt * 0x9e3779b9)) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return ((x >>> 0) % 10000) / 10000;
}

function hasVisibleRingSystem(planet: Planet): boolean {
  if (planet.type === 'gas-giant') return seededUnit(planet.seed, 501) > 0.34;
  if (planet.type === 'ice-giant') return seededUnit(planet.seed, 501) > 0.76;
  return false;
}

function planetGlowColor(planet: Planet): THREE.Color {
  if (planet.type === 'gas-giant') return new THREE.Color(0xc8d6ff);
  if (planet.type === 'ice-giant') return new THREE.Color(0x9fd8ff);
  if (planet.hydrosphere && planet.hydrosphere.waterCoverageFraction > 0.2) return new THREE.Color(0x7bb8ff);
  if (planet.atmosphere) return new THREE.Color(0xa8c8ff);
  return new THREE.Color(0xd7c6a0);
}

function starRenderColor(star: SystemStar3DNode): THREE.Color {
  const byClass: Record<string, string> = {
    O: '#9bb8ff',
    B: '#aabfff',
    A: '#f8f7ff',
    F: '#fff2dd',
    G: '#fff0bf',
    K: '#ffbd78',
    M: '#ff6848',
  };
  const base = new THREE.Color(byClass[star.spectralClass] ?? star.colorHex);
  const physical = new THREE.Color(star.colorHex);
  return base.lerp(physical, 0.35);
}

function starVisualRadius(star: SystemStar3DNode): number {
  const classScale = star.spectralClass === 'O' || star.spectralClass === 'B'
    ? 1.18
    : star.spectralClass === 'A'
      ? 1.08
      : star.spectralClass === 'M'
        ? 0.92
        : 1;
  const luminosityScale = 1 + Math.min(0.24, Math.log10(Math.max(0.001, star.luminositySolar) + 1) * 0.045);
  return Math.max(10, star.radius * classScale * luminosityScale);
}

const PLANET_VERT = `
  varying vec2 vUv;
  varying vec3 vWorldNormal;

  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PLANET_FRAG = `
  uniform sampler2D uMap;
  uniform vec3 uLightDir;
  uniform vec3 uStarColor;
  uniform float uHasMap;
  uniform float uLongitude;
  uniform float uAlpha;

  varying vec2 vUv;
  varying vec3 vWorldNormal;

  void main() {
    vec2 uv = vec2(fract(vUv.x + uLongitude), vUv.y);
    vec3 base = uHasMap > 0.5 ? texture2D(uMap, uv).rgb : vec3(0.42, 0.48, 0.52);
    if (uHasMap > 0.5) {
      float seam = smoothstep(0.0, 0.035, uv.x) * (1.0 - smoothstep(0.965, 1.0, uv.x));
      vec3 wrapSample = texture2D(uMap, vec2(fract(uv.x + 0.5), uv.y)).rgb;
      base = mix(wrapSample, base, seam);
    }
    vec3 n = normalize(vWorldNormal);
    vec3 lightDir = normalize(uLightDir);
    float daylight = dot(n, lightDir);

    // System-view miniatures need readability more than strict half-phase.
    // This keeps roughly 2/3 of the visible disk lit and leaves the far 1/3
    // as a soft, still-readable shadow instead of a black crescent.
    float day = smoothstep(-0.68, 0.16, daylight);
    float softFill = smoothstep(-0.98, -0.18, daylight);
    float shade = mix(0.58, 1.08, day) + softFill * 0.12;

    vec3 starTint = mix(vec3(1.0), normalize(uStarColor + vec3(0.001)), 0.16);
    vec3 color = base * shade * mix(vec3(0.82, 0.88, 0.96), starTint, day * 0.24);

    float rim = pow(1.0 - max(n.z, 0.0), 2.0);
    color += vec3(0.10, 0.15, 0.22) * rim * 0.075 * (0.55 + day);

    gl_FragColor = vec4(max(color, vec3(0.0)), uAlpha);
  }
`;

export class SystemPlanet3DLayer {
  private static activeLayers = new Set<SystemPlanet3DLayer>();

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(0, 1, 1, 0, -1000, 1000);
  private ambient = new THREE.AmbientLight(0x5a6f90, 0.48);
  private starLight = new THREE.PointLight(0xfff1d2, 52000, 4200, 0.92);
  private fillLight = new THREE.DirectionalLight(0x5b739d, 0.16);
  private starSphere: THREE.Mesh | null = null;
  private starSprite: THREE.Sprite | null = null;
  private starFlare: THREE.Sprite | null = null;
  private starTexture: THREE.CanvasTexture | null = null;
  private planetGlowTexture: THREE.CanvasTexture | null = null;
  private records = new Map<string, MeshRecord>();
  private textureCache = new Map<string, THREE.Texture>();
  private prevPosition: string;
  private prevOverflow: string;
  private prevBackground: string;
  private transitionAlpha = 1;
  private transitionScale = 1;
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
    this.prevBackground = host.style.background;
    const computed = window.getComputedStyle(host);
    if (computed.position === 'static') host.style.position = 'relative';
    host.style.overflow = 'hidden';
    host.style.background = '#020510';

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.sortObjects = true;
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
      const tx = node.x;
      const ty = node.y;
      record.mesh.position.set(tx, ty, node.zIndex * 0.001);
      record.mesh.scale.setScalar(Math.max(1, node.radius * this.transitionScale));
      record.mesh.renderOrder = node.zIndex;
      record.glow.visible = node.visible;
      record.glow.position.set(tx, ty, node.zIndex * 0.001 + 0.04);
      record.glow.scale.set(node.radius * 3.45 * this.transitionScale, node.radius * 3.45 * this.transitionScale, 1);
      record.glow.renderOrder = node.zIndex + 20;
      const glowMaterial = record.glow.material as THREE.SpriteMaterial;
      const baseGlow = node.planet.type === 'gas-giant' || node.planet.type === 'ice-giant' ? 0.48 : 0.4;
      glowMaterial.opacity = baseGlow * (record.mesh.visible ? 1 : 0.35) * this.transitionAlpha;
      record.material.uniforms.uAlpha.value = this.transitionAlpha;
      if (record.rings) {
        record.rings.visible = node.visible && record.mesh.visible;
        record.rings.position.set(tx, ty, node.zIndex * 0.001 + 0.02);
        record.rings.scale.setScalar(Math.max(1, node.radius * this.transitionScale));
        record.rings.renderOrder = node.zIndex + 1;
        record.rings.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const material = child.material;
            if (!Array.isArray(material)) {
              const baseOpacity = typeof child.userData.baseOpacity === 'number' ? child.userData.baseOpacity : material.opacity;
              material.opacity = baseOpacity * this.transitionAlpha;
            }
          }
        });
      }

      const lightDir = new THREE.Vector3(star.x - node.x, star.y - node.y, 0.16).normalize();
      record.material.uniforms.uLightDir.value.copy(lightDir);
      record.material.uniforms.uStarColor.value.set(star.colorHex);
      record.material.uniforms.uLongitude.value = (node.initialLongitude + record.longitude) % 1;
      record.mesh.rotation.set(0, 0, 0);
    }

    for (const [planetId, record] of this.records) {
      if (live.has(planetId)) continue;
      this.scene.remove(record.mesh);
      this.scene.remove(record.glow);
      if (record.rings) this.scene.remove(record.rings);
      record.material.dispose();
      record.mesh.geometry.dispose();
      this.disposeObject(record.glow);
      if (record.rings) this.disposeObject(record.rings);
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

  setTransition(progress: number): void {
    const t = Math.max(0, Math.min(1, progress));
    this.transitionAlpha = t;
    this.transitionScale = 0.72 + t * 0.28;
    if (this.starSphere) {
      const material = this.starSphere.material as THREE.MeshStandardMaterial;
      material.opacity = t;
      material.transparent = t < 1;
    }
    for (const sprite of [this.starSprite, this.starFlare]) {
      if (!sprite) continue;
      const material = sprite.material as THREE.SpriteMaterial;
      material.opacity = (sprite === this.starSprite ? 0.88 : 0.22) * t;
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    SystemPlanet3DLayer.activeLayers.delete(this);

    for (const record of this.records.values()) {
      this.scene.remove(record.mesh);
      this.scene.remove(record.glow);
      if (record.rings) this.scene.remove(record.rings);
      record.material.dispose();
      record.mesh.geometry.dispose();
      this.disposeObject(record.glow);
      if (record.rings) this.disposeObject(record.rings);
    }
    this.records.clear();
    for (const texture of this.textureCache.values()) texture.dispose();
    this.textureCache.clear();
    this.planetGlowTexture?.dispose();
    this.planetGlowTexture = null;
    if (this.starSphere) {
      this.scene.remove(this.starSphere);
      const material = this.starSphere.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material.dispose();
      this.starSphere.geometry.dispose();
      this.starSphere = null;
    }
    if (this.starSprite) {
      this.scene.remove(this.starSprite);
      const material = this.starSprite.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material.dispose();
      this.starSprite = null;
    }
    if (this.starFlare) {
      this.scene.remove(this.starFlare);
      const material = this.starFlare.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material.dispose();
      this.starFlare = null;
    }
    this.starTexture?.dispose();
    this.starTexture = null;
    this.renderer.forceContextLoss();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.host.style.position = this.prevPosition;
    this.host.style.overflow = this.prevOverflow;
    this.host.style.background = this.prevBackground;
  }

  private syncStar(star: SystemStar3DNode): void {
    const color = starRenderColor(star);
    if (!this.starSphere) {
      const geometry = new THREE.SphereGeometry(1, 64, 32);
      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 2.6,
        roughness: 0.65,
        metalness: 0,
      });
      this.starSphere = new THREE.Mesh(geometry, material);
      this.starSphere.frustumCulled = false;
      this.starSphere.renderOrder = 100001;
      this.scene.add(this.starSphere);
    }
    if (!this.starSprite) {
      this.starTexture = this.createStarTexture(star.colorHex);
      const material = new THREE.SpriteMaterial({
        map: this.starTexture,
        color,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      });
      this.starSprite = new THREE.Sprite(material);
      this.starSprite.renderOrder = 100000;
      this.scene.add(this.starSprite);
    }
    if (!this.starFlare) {
      const material = new THREE.SpriteMaterial({
        map: this.starTexture ?? this.createStarTexture(star.colorHex),
        color,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      });
      this.starFlare = new THREE.Sprite(material);
      this.starFlare.renderOrder = 100000;
      this.scene.add(this.starFlare);
    }
    const visualRadius = starVisualRadius(star);
    this.starSphere.position.set(star.x, star.y, 520);
    this.starSphere.scale.setScalar(visualRadius * this.transitionScale);
    const sphereMaterial = this.starSphere.material as THREE.MeshStandardMaterial;
    sphereMaterial.color.copy(color);
    sphereMaterial.emissive.copy(color);

    this.starSprite.position.set(star.x, star.y, 510);
    this.starSprite.scale.set(visualRadius * 2.1 * this.transitionScale, visualRadius * 2.1 * this.transitionScale, 1);
    if (this.starFlare) {
      this.starFlare.position.set(star.x, star.y, 505);
      this.starFlare.scale.set(visualRadius * 3.2 * this.transitionScale, visualRadius * 0.2 * this.transitionScale, 1);
    }
    this.starLight.color.copy(color);
    this.starLight.intensity = 28000 + Math.min(42000, Math.sqrt(Math.max(0.001, star.luminositySolar)) * 9000);
    this.starLight.position.set(star.x, star.y, 520);
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

  private getPlanetGlowTexture(): THREE.CanvasTexture {
    if (this.planetGlowTexture) return this.planetGlowTexture;
    const size = 192;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const center = size / 2;
    const glow = ctx.createRadialGradient(center, center, 0, center, center, center);
    glow.addColorStop(0.00, 'rgba(255,255,255,0.16)');
    glow.addColorStop(0.30, 'rgba(255,255,255,0.12)');
    glow.addColorStop(0.48, 'rgba(255,255,255,0.36)');
    glow.addColorStop(0.64, 'rgba(255,255,255,0.22)');
    glow.addColorStop(1.00, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);
    this.planetGlowTexture = new THREE.CanvasTexture(canvas);
    return this.planetGlowTexture;
  }

  private createPlanetGlow(planet: Planet): THREE.Sprite {
    const material = new THREE.SpriteMaterial({
      map: this.getPlanetGlowTexture(),
      color: planetGlowColor(planet),
      transparent: true,
      opacity: planet.type === 'gas-giant' || planet.type === 'ice-giant' ? 0.34 : 0.26,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });
    const glow = new THREE.Sprite(material);
    glow.frustumCulled = false;
    return glow;
  }

  private createRingSystem(planet: Planet): THREE.Group | null {
    if (!hasVisibleRingSystem(planet)) return null;
    const group = new THREE.Group();
    group.frustumCulled = false;
    const tint = planet.type === 'ice-giant' ? 0xcceeff : 0xe8edf8;
    const innerBase = 1.28 + seededUnit(planet.seed, 521) * 0.12;
    const outerBase = 1.95 + seededUnit(planet.seed, 522) * 0.36;
    const bandCount = 4 + Math.floor(seededUnit(planet.seed, 523) * 4);

    for (let i = 0; i < bandCount; i++) {
      const t = i / Math.max(1, bandCount - 1);
      const inner = innerBase + (outerBase - innerBase) * t;
      const outer = inner + 0.018 + seededUnit(planet.seed, 540 + i) * 0.032;
      const geometry = new THREE.RingGeometry(inner, outer, 160);
      const material = new THREE.MeshBasicMaterial({
        color: tint,
        transparent: true,
        opacity: 0.16 + seededUnit(planet.seed, 560 + i) * 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(geometry, material);
      ring.userData.baseOpacity = material.opacity;
      ring.renderOrder = 0;
      group.add(ring);
    }

    const gapCount = 2 + Math.floor(seededUnit(planet.seed, 590) * 2);
    for (let i = 0; i < gapCount; i++) {
      const r = innerBase + (outerBase - innerBase) * seededUnit(planet.seed, 600 + i);
      const geometry = new THREE.RingGeometry(r, r + 0.01, 160);
      const material = new THREE.MeshBasicMaterial({
        color: 0x020510,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const gap = new THREE.Mesh(geometry, material);
      gap.userData.baseOpacity = material.opacity;
      group.add(gap);
    }

    group.rotation.x = Math.PI / 2 + 0.62;
    group.rotation.y = (seededUnit(planet.seed, 615) - 0.5) * 0.38;
    group.rotation.z = seededUnit(planet.seed, 616) * Math.PI;
    return group;
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
        const material = child.material;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material.dispose();
        if (child instanceof THREE.Mesh) child.geometry.dispose();
      }
    });
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
    const material = new THREE.ShaderMaterial({
      vertexShader: PLANET_VERT,
      fragmentShader: PLANET_FRAG,
      uniforms: {
        uMap: { value: null },
        uLightDir: { value: new THREE.Vector3(-node.x, -node.y, 0.16).normalize() },
        uStarColor: { value: new THREE.Color(0xfff1d2) },
        uHasMap: { value: 0 },
        uLongitude: { value: node.initialLongitude },
        uAlpha: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    const glow = this.createPlanetGlow(node.planet);
    this.scene.add(glow);
    const rings = this.createRingSystem(node.planet);
    if (rings) this.scene.add(rings);

    const record: MeshRecord = {
      mesh,
      material,
      glow,
      rings,
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
    record.material.uniforms.uMap.value = null;
    record.material.uniforms.uHasMap.value = 0;
    record.material.needsUpdate = true;
    if (!textureUrl) return;

    const cached = this.textureCache.get(textureUrl);
    if (cached) {
      record.texture = cached;
      record.texturePending = false;
      record.material.uniforms.uMap.value = cached;
      record.material.uniforms.uHasMap.value = 1;
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
      record.material.uniforms.uMap.value = texture;
      record.material.uniforms.uHasMap.value = 1;
      record.material.needsUpdate = true;
    });
  }
}
