import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

interface LivingOrreryHeroProps {
  isIgnited: boolean;
  onIgniteComplete: () => void;
  scrollProgress: number; // 0.0 to 1.0
}

const sunVertexShader = `
varying vec2 vUv;
varying vec3 vPosition;
void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const sunFragmentShader = `
uniform float time;
uniform float intensity;
varying vec2 vUv;
varying vec3 vPosition;

float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n = i.x + i.y * 157.0 + 113.0 * i.z;
    return mix(
        mix(mix(fract(sin(n)*43758.5453), fract(sin(n+1.0)*43758.5453), f.x),
            mix(fract(sin(n+157.0)*43758.5453), fract(sin(n+158.0)*43758.5453), f.x), f.y),
        mix(mix(fract(sin(n+113.0)*43758.5453), fract(sin(n+114.0)*43758.5453), f.x),
            mix(fract(sin(n+270.0)*43758.5453), fract(sin(n+271.0)*43758.5453), f.x), f.y), f.z);
}

float fbm(vec3 p) {
    float f = 0.0;
    f += 0.5000 * noise(p); p = p * 2.02;
    f += 0.2500 * noise(p); p = p * 2.03;
    f += 0.1250 * noise(p); p = p * 2.01;
    f += 0.0625 * noise(p);
    return f;
}

void main() {
    vec3 p = vPosition * 2.5;
    float q = fbm(p - time * 0.3);
    vec2 r = vec2(fbm(p + q + time * 0.2), fbm(p + q - time * 0.2));
    float f = fbm(p + r);
    
    vec3 col1 = vec3(0.1, 0.0, 0.0);
    vec3 col2 = vec3(0.8, 0.15, 0.0);
    vec3 col3 = vec3(1.0, 0.5, 0.05);
    vec3 col4 = vec3(1.0, 0.9, 0.4);
    
    vec3 color = mix(col1, col2, smoothstep(0.0, 0.4, f));
    color = mix(color, col3, smoothstep(0.4, 0.7, f));
    color = mix(color, col4, smoothstep(0.7, 1.0, f));
    
    gl_FragColor = vec4(color * intensity, 1.0);
}
`;

const PLANETS = [
  { id: 'worlds', radius: 0.8, orbit: 12, color: 0x4488aa, speed: 0.3, type: 'water' },
  { id: 'discoveries', radius: 1.4, orbit: 22, color: 0xc69a68, speed: 0.18, type: 'gas' },
  { id: 'colony', radius: 0.6, orbit: 32, color: 0xff8844, speed: 0.12, type: 'desert' },
  { id: 'academy', radius: 1.0, orbit: 45, color: 0x9aa8b6, speed: 0.08, type: 'ice' },
] as const;

export function LivingOrreryHero({ isIgnited, onIgniteComplete, scrollProgress }: LivingOrreryHeroProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sunUniformsRef = useRef({ time: { value: 0 }, intensity: { value: 0.3 } });
  
  // Proxy objects for GSAP to animate camera position and lookAt target independently
  const camPosProxy = useRef({ x: 0, y: 0, z: 6 });
  const camLookProxy = useRef({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // SCENE SETUP
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010206);
    scene.fog = new THREE.FogExp2(0x010206, 0.015);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    cameraRef.current = camera;
    camera.position.set(camPosProxy.current.x, camPosProxy.current.y, camPosProxy.current.z);
    camera.lookAt(camLookProxy.current.x, camLookProxy.current.y, camLookProxy.current.z);

    // LIGHTING
    const ambient = new THREE.AmbientLight(0x223344, 0.5);
    scene.add(ambient);
    const sunLight = new THREE.PointLight(0xffaa55, 3, 100);
    scene.add(sunLight);

    // SUN
    const sunGeo = new THREE.SphereGeometry(3, 64, 64);
    const sunMat = new THREE.ShaderMaterial({
      vertexShader: sunVertexShader,
      fragmentShader: sunFragmentShader,
      uniforms: sunUniformsRef.current,
    });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sun);
    
    // SUN CORONA
    const coronaGeo = new THREE.SphereGeometry(3.3, 64, 64);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const corona = new THREE.Mesh(coronaGeo, coronaMat);
    scene.add(corona);

    // PLANETS
    const planetsGroup = new THREE.Group();
    scene.add(planetsGroup);
    
    const planetData = PLANETS.map((p, i) => {
      // Orbit path
      const pathPts = [];
      for (let j = 0; j <= 128; j++) {
        const a = (j / 128) * Math.PI * 2;
        pathPts.push(new THREE.Vector3(Math.cos(a) * p.orbit, 0, Math.sin(a) * p.orbit));
      }
      const orbitLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pathPts),
        new THREE.LineBasicMaterial({ color: 0x334466, transparent: true, opacity: 0.3 })
      );
      orbitLine.rotation.x = Math.PI / 2;
      planetsGroup.add(orbitLine);

      // Planet mesh
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(p.radius, 32, 32),
        new THREE.MeshStandardMaterial({
          color: p.color,
          roughness: p.type === 'gas' ? 0.3 : 0.8,
          metalness: 0.1,
        })
      );
      
      // Rings for gas giant
      if (p.type === 'gas') {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(p.radius * 1.5, p.radius * 2.2, 64),
          new THREE.MeshStandardMaterial({
            color: 0xd6e8ff,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
            roughness: 0.9,
          })
        );
        ring.rotation.x = Math.PI / 2.2;
        mesh.add(ring);
      }
      
      planetsGroup.add(mesh);
      return { mesh, ...p, currentAngle: Math.PI * 0.25 * i }; // stagger initial positions
    });

    // STARS BACKGROUND
    const starsGeo = new THREE.BufferGeometry();
    const starsPos = new Float32Array(1500 * 3);
    for(let i=0; i<1500; i++) {
      const r = 80 + Math.random() * 40;
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      starsPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
      starsPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      starsPos[i*3+2] = r * Math.cos(phi);
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPos, 3));
    const starsMat = new THREE.PointsMaterial({ color: 0xaaccff, size: 0.2, transparent: true, opacity: 0.6 });
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    // RESIZE
    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', resize);
    resize();

    // GSAP TIMELINE SETUP (The Scroll Journey)
    // We build a timeline that represents the entire scroll journey (progress 0 to 1)
    const tl = gsap.timeline({ paused: true });
    timelineRef.current = tl;

    // 0.0 - 0.2: Pull back from Sun, see first orbits
    tl.to(camPosProxy.current, { z: 25, y: 10, ease: 'power1.inOut', duration: 2 }, 0);
    
    // 0.2 - 0.4: Fly to Planet 1
    tl.to(camPosProxy.current, { 
      x: () => Math.cos(planetData[0].currentAngle) * planetData[0].orbit + 2, 
      y: 2, 
      z: () => Math.sin(planetData[0].currentAngle) * planetData[0].orbit + 4, 
      ease: 'power2.inOut', duration: 2 
    }, 2);
    tl.to(camLookProxy.current, {
      x: () => Math.cos(planetData[0].currentAngle) * planetData[0].orbit,
      y: 0,
      z: () => Math.sin(planetData[0].currentAngle) * planetData[0].orbit,
      ease: 'power2.inOut', duration: 2
    }, 2);

    // 0.4 - 0.6: Fly to Planet 2 (Gas Giant)
    tl.to(camPosProxy.current, { 
      x: () => Math.cos(planetData[1].currentAngle) * planetData[1].orbit + 3, 
      y: 3, 
      z: () => Math.sin(planetData[1].currentAngle) * planetData[1].orbit + 5, 
      ease: 'power2.inOut', duration: 2 
    }, 4);
    tl.to(camLookProxy.current, {
      x: () => Math.cos(planetData[1].currentAngle) * planetData[1].orbit,
      y: 0,
      z: () => Math.sin(planetData[1].currentAngle) * planetData[1].orbit,
      ease: 'power2.inOut', duration: 2
    }, 4);

    // 0.6 - 0.8: Fly to Planet 3 (Colony)
    tl.to(camPosProxy.current, { 
      x: () => Math.cos(planetData[2].currentAngle) * planetData[2].orbit + 1.5, 
      y: 1.5, 
      z: () => Math.sin(planetData[2].currentAngle) * planetData[2].orbit + 3, 
      ease: 'power2.inOut', duration: 2 
    }, 6);
    tl.to(camLookProxy.current, {
      x: () => Math.cos(planetData[2].currentAngle) * planetData[2].orbit,
      y: 0,
      z: () => Math.sin(planetData[2].currentAngle) * planetData[2].orbit,
      ease: 'power2.inOut', duration: 2
    }, 6);

    // 0.8 - 1.0: Pull way back to reveal the whole system (Cluster view)
    tl.to(camPosProxy.current, { x: 0, y: 40, z: 60, ease: 'power2.inOut', duration: 2 }, 8);
    tl.to(camLookProxy.current, { x: 0, y: 0, z: 0, ease: 'power2.inOut', duration: 2 }, 8);


    // RENDER LOOP
    let raf = 0;
    const render = (time: number) => {
      const t = time * 0.001;
      
      // Update sun shader
      sunUniformsRef.current.time.value = t;
      sun.rotation.y = t * 0.05;
      corona.scale.setScalar(1 + Math.sin(t * 2) * 0.03);

      // Rotate planets
      planetData.forEach((p) => {
        // Only rotate if ignited, or slowly if not
        const speed = isIgnited ? p.speed : p.speed * 0.1;
        p.currentAngle -= speed * 0.01;
        p.mesh.position.set(
          Math.cos(p.currentAngle) * p.orbit,
          0,
          Math.sin(p.currentAngle) * p.orbit
        );
        p.mesh.rotation.y += 0.01;
      });
      
      stars.rotation.y = t * 0.01;

      // Update camera from proxies
      camera.position.set(camPosProxy.current.x, camPosProxy.current.y, camPosProxy.current.z);
      camera.lookAt(camLookProxy.current.x, camLookProxy.current.y, camLookProxy.current.z);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
      renderer.dispose();
      renderer.domElement.remove();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    };
  }, [isIgnited]);

  // Handle Ignition Animation
  useEffect(() => {
    if (isIgnited) {
      // Ignite animation: sun gets intensely bright, then calms down, and camera pulls slightly back to unlock the scroll journey
      gsap.to(sunUniformsRef.current.intensity, {
        value: 1.5,
        duration: 0.5,
        ease: 'power2.in',
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          gsap.to(sunUniformsRef.current.intensity, { value: 0.8, duration: 1 });
          onIgniteComplete();
        }
      });
      
      // Initial pull back
      gsap.to(camPosProxy.current, {
        z: 15,
        y: 5,
        duration: 2,
        ease: 'power3.out'
      });
    }
  }, [isIgnited, onIgniteComplete]);

  // Handle Scroll Sync
  useEffect(() => {
    if (timelineRef.current) {
      // Map scrollProgress (0 to 1) to timeline total duration
      const totalDuration = timelineRef.current.duration();
      gsap.to(timelineRef.current, {
        time: scrollProgress * totalDuration,
        duration: 0.5,
        ease: 'power2.out',
        overwrite: true
      });
    }
  }, [scrollProgress]);

  return (
    <div ref={mountRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
  );
}
