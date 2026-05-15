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

const planetVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const planetFragmentShader = `
uniform vec3 baseColor;
uniform vec3 altColor;
uniform int planetType; // 0 = water, 1 = gas, 2 = desert, 3 = ice
uniform vec3 sunPos;
uniform float time;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}

float fbm(vec3 p) {
    float f = 0.0;
    f += 0.5000 * snoise(p); p = p * 2.02;
    f += 0.2500 * snoise(p); p = p * 2.03;
    f += 0.1250 * snoise(p); p = p * 2.01;
    f += 0.0625 * snoise(p);
    return f;
}

void main() {
    vec3 n = normalize(vNormal);
    vec3 l = normalize(sunPos - vPosition);
    float diff = max(dot(n, l), 0.0);
    
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float rim = 1.0 - max(dot(viewDir, n), 0.0);
    rim = smoothstep(0.5, 1.0, rim);
    
    vec3 p = vPosition * 2.0;
    float noiseVal = 0.0;
    vec3 col = baseColor;
    
    if (planetType == 1) { // Gas
        noiseVal = fbm(vec3(p.x, p.y * 5.0, p.z) + time * 0.02);
        col = mix(baseColor, altColor, smoothstep(-0.2, 0.8, noiseVal));
        float band = sin(vPosition.y * 15.0 + fbm(p) * 2.0);
        col = mix(col, baseColor * 0.7, smoothstep(0.0, 1.0, band) * 0.4);
    } else {
        noiseVal = fbm(p * 2.0);
        float threshold = planetType == 0 ? 0.2 : (planetType == 2 ? 0.0 : 0.4);
        if (noiseVal < threshold) {
            col = baseColor;
        } else {
            col = altColor;
        }
        col *= (0.8 + 0.4 * fbm(p * 5.0));
    }
    
    vec3 ambient = vec3(0.02);
    vec3 finalColor = col * diff + col * ambient;
    
    // Atmosphere rim
    vec3 atmColor = mix(altColor, vec3(0.5, 0.8, 1.0), 0.5);
    if (planetType == 2) atmColor = mix(altColor, vec3(1.0, 0.6, 0.3), 0.5); // desert atmosphere
    finalColor += atmColor * rim * diff * 1.5;
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

const PLANETS = [
  { id: 'worlds', radius: 0.8, orbit: 12, color: 0x2244aa, altColor: 0x448844, speed: 0.3, type: 0 },
  { id: 'discoveries', radius: 1.4, orbit: 22, color: 0xc69a68, altColor: 0xffddaa, speed: 0.18, type: 1 },
  { id: 'colony', radius: 0.6, orbit: 32, color: 0xaa4422, altColor: 0xff8844, speed: 0.12, type: 2 },
  { id: 'academy', radius: 1.0, orbit: 45, color: 0x445566, altColor: 0x9aa8b6, speed: 0.08, type: 3 },
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
      const planetUniforms = {
        baseColor: { value: new THREE.Color(p.color) },
        altColor: { value: new THREE.Color(p.altColor) },
        planetType: { value: p.type },
        sunPos: { value: new THREE.Vector3(0, 0, 0) },
        time: { value: 0 }
      };
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(p.radius, 64, 64),
        new THREE.ShaderMaterial({
          vertexShader: planetVertexShader,
          fragmentShader: planetFragmentShader,
          uniforms: planetUniforms
        })
      );
      
      // Rings for gas giant
      if (p.type === 1) {
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
      return { mesh, uniforms: planetUniforms, ...p, currentAngle: Math.PI * 0.25 * i }; // stagger initial positions
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
        p.uniforms.time.value = t;
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
