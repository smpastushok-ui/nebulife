import React from 'react';
import * as THREE from 'three';

interface LivingOrreryHeroProps {
  reduceMotion?: boolean;
}

const PLANETS = [
  { radius: 0.11, orbit: 1.15, color: 0x9aa8b6, speed: 0.42, yScale: 0.42 },
  { radius: 0.17, orbit: 1.82, color: 0xd0a66c, speed: 0.30, yScale: 0.48 },
  { radius: 0.19, orbit: 2.55, color: 0x4488aa, speed: 0.22, yScale: 0.54 },
  { radius: 0.13, orbit: 3.18, color: 0xff8844, speed: 0.17, yScale: 0.50 },
  { radius: 0.39, orbit: 4.25, color: 0xc69a68, speed: 0.11, yScale: 0.46 },
  { radius: 0.29, orbit: 5.38, color: 0x7bb8ff, speed: 0.08, yScale: 0.43 },
] as const;

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function makeStarField(count: number): THREE.Points {
  const random = seededRandom(424242);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [
    new THREE.Color(0xaabbcc),
    new THREE.Color(0x7bb8ff),
    new THREE.Color(0xffe2a0),
    new THREE.Color(0x8899aa),
  ];

  for (let i = 0; i < count; i++) {
    const radius = 12 + random() * 20;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    const color = palette[i % palette.length];
    const intensity = 0.35 + random() * 0.65;
    colors[i * 3] = color.r * intensity;
    colors[i * 3 + 1] = color.g * intensity;
    colors[i * 3 + 2] = color.b * intensity;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    }),
  );
}

function makeOrbit(radius: number, yScale: number, color: number): THREE.LineLoop {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius * yScale));
  }

  return new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
    }),
  );
}

export function LivingOrreryHero({ reduceMotion = false }: LivingOrreryHeroProps) {
  const mountRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const mount = mountRef.current;
    if (!mount || reduceMotion) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020510, 0.045);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x020510, 0);
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    camera.position.set(0, 4.8, 8.8);
    camera.lookAt(0, 0, 0);

    const system = new THREE.Group();
    system.rotation.x = -0.22;
    scene.add(system);

    const ambient = new THREE.AmbientLight(0x88aacc, 0.44);
    scene.add(ambient);

    const sunLight = new THREE.PointLight(0xfff0c8, 4.2, 32);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    const star = new THREE.Mesh(
      new THREE.SphereGeometry(0.58, 64, 32),
      new THREE.MeshBasicMaterial({ color: 0xfff2ca }),
    );
    system.add(star);

    const corona = new THREE.Mesh(
      new THREE.SphereGeometry(0.82, 64, 32),
      new THREE.MeshBasicMaterial({
        color: 0xff8844,
        transparent: true,
        opacity: 0.17,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    system.add(corona);

    const farGlow = new THREE.Mesh(
      new THREE.SphereGeometry(1.32, 64, 32),
      new THREE.MeshBasicMaterial({
        color: 0x7bb8ff,
        transparent: true,
        opacity: 0.06,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    system.add(farGlow);

    const starField = makeStarField(700);
    scene.add(starField);

    const planetMeshes = PLANETS.map((planet, index) => {
      const orbit = makeOrbit(planet.orbit, planet.yScale, index === 2 ? 0x44ff88 : 0x446688);
      system.add(orbit);

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(planet.radius, 32, 16),
        new THREE.MeshStandardMaterial({
          color: planet.color,
          roughness: 0.72,
          metalness: 0.02,
          emissive: planet.color,
          emissiveIntensity: index === 2 ? 0.08 : 0.02,
        }),
      );
      system.add(mesh);

      if (index === 4) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(planet.radius * 1.45, planet.radius * 2.35, 80),
          new THREE.MeshBasicMaterial({
            color: 0xd6e8ff,
            transparent: true,
            opacity: 0.28,
            side: THREE.DoubleSide,
          }),
        );
        ring.rotation.x = Math.PI / 2.5;
        mesh.add(ring);
      }

      return { mesh, ...planet, phase: index * 0.95 };
    });

    const asteroidPath = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-6.1, 0.1, -1.8),
        new THREE.Vector3(-3.2, 0.0, -0.8),
        new THREE.Vector3(-1.0, 0.0, -0.2),
        new THREE.Vector3(0.6, 0.0, 0.15),
      ]),
      new THREE.LineBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.42 }),
    );
    system.add(asteroidPath);

    const asteroid = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.08, 1),
      new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.9 }),
    );
    system.add(asteroid);

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const onScroll = () => {
      const rect = mount.getBoundingClientRect();
      const viewport = Math.max(1, window.innerHeight);
      const progress = THREE.MathUtils.clamp(1 - rect.top / viewport, 0, 2);
      camera.position.z = THREE.MathUtils.lerp(8.8, 6.2, Math.min(progress, 1));
      camera.position.y = THREE.MathUtils.lerp(4.8, 3.3, Math.min(progress, 1));
      camera.lookAt(0, 0, 0);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
      const y = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
      system.rotation.y = x * 0.08;
      system.rotation.x = -0.22 + y * 0.04;
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    let raf = 0;
    const start = performance.now();
    const render = (now: number) => {
      const t = (now - start) / 1000;
      const motionT = reduceMotion ? 2.4 : t;

      star.rotation.y = motionT * 0.08;
      corona.scale.setScalar(1 + Math.sin(motionT * 1.4) * 0.045);
      farGlow.scale.setScalar(1 + Math.sin(motionT * 0.8) * 0.035);
      starField.rotation.y = motionT * 0.006;

      for (const planet of planetMeshes) {
        const a = planet.phase + motionT * planet.speed;
        planet.mesh.position.set(Math.cos(a) * planet.orbit, 0, Math.sin(a) * planet.orbit * planet.yScale);
        planet.mesh.rotation.y = motionT * 0.38;
      }

      const asteroidPhase = (Math.sin(motionT * 0.33) + 1) / 2;
      asteroid.position.set(
        THREE.MathUtils.lerp(-5.8, 0.45, asteroidPhase),
        0.08,
        THREE.MathUtils.lerp(-1.7, 0.12, asteroidPhase),
      );
      asteroid.rotation.set(motionT * 0.7, motionT * 1.1, motionT * 0.4);

      renderer.render(scene, camera);
      if (!reduceMotion) raf = window.requestAnimationFrame(render);
    };

    resize();
    onScroll();
    raf = window.requestAnimationFrame(render);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointerMove);
      if (raf) window.cancelAnimationFrame(raf);
      renderer.dispose();
      renderer.domElement.remove();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
        }
      });
    };
  }, [reduceMotion]);

  return (
    <div className="landing-orrery" ref={mountRef}>
      <div className="landing-orrery-fallback" aria-hidden="true">
        <span className="landing-fallback-star" />
        <span className="landing-fallback-orbit landing-fallback-orbit-a" />
        <span className="landing-fallback-orbit landing-fallback-orbit-b" />
        <span className="landing-fallback-orbit landing-fallback-orbit-c" />
      </div>
      <div className="landing-orrery-hud" aria-hidden="true">
        <span>ALPHA LYRAE / LIVE ORRERY</span>
        <span>Telemetry stream active</span>
      </div>
    </div>
  );
}
