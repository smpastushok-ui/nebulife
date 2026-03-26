/**
 * BuildingShowcase.tsx
 * Dev-only page: colony_hub in 8 styles — 4 PixiJS (2D isometric) + 4 Babylon.js (3D procedural)
 * Access: ?dev=buildings
 */
import React, { useEffect, useRef } from 'react';
import { Application, Graphics } from 'pixi.js';
import {
  Engine, Scene, ArcRotateCamera, Camera,
  HemisphericLight, DirectionalLight,
  Vector3, Color3, Color4,
  MeshBuilder, StandardMaterial, Mesh,
} from '@babylonjs/core';

// ─── Isometric constants ───────────────────────────────────────────────────────

const TW2 = 64; // TILE_W / 2
const TH2 = 40; // TILE_H / 2

// ─── PixiJS isometric box primitive ──────────────────────────────────────────

/**
 * Draw a filled isometric box.
 * cx, cy = screen-space bottom vertex of the footprint diamond.
 * hw = half-width, hh = half-depth, bh = building height (all in px).
 */
function isoBox(
  g: Graphics,
  cx: number, cy: number,
  hw: number, hh: number, bh: number,
  topCol: number, rightCol: number, leftCol: number,
) {
  // top face
  g.poly([
    cx - hw, cy - hh - bh,
    cx,      cy - 2 * hh - bh,
    cx + hw, cy - hh - bh,
    cx,      cy - bh,
  ]).fill(topCol);
  // right face
  g.poly([
    cx,      cy - bh,
    cx + hw, cy - hh - bh,
    cx + hw, cy - hh,
    cx,      cy,
  ]).fill(rightCol);
  // left face
  g.poly([
    cx - hw, cy - hh - bh,
    cx,      cy - bh,
    cx,      cy,
    cx - hw, cy - hh,
  ]).fill(leftCol);
}

// ─── PixiJS building styles ───────────────────────────────────────────────────

/** A: minimal — simple 3-face iso box (current fallback approach) */
function styleA(g: Graphics, cx: number, cy: number) {
  isoBox(g, cx, cy, TW2 * 0.8, TH2 * 0.8, TH2 * 2.4,
    0x6699bb, 0x446688, 0x2a4455);
}

/** B: detailed — layered base + body + roof + windows + antenna */
function styleB(g: Graphics, cx: number, cy: number) {
  const hw = TW2 * 0.8, hh = TH2 * 0.8;

  // base slab
  isoBox(g, cx, cy, hw, hh, hh * 0.45, 0x334455, 0x223344, 0x152233);
  const by = cy - hh * 0.45;

  // body
  isoBox(g, cx, by, hw * 0.85, hh * 0.85, TH2 * 2.2, 0x5588aa, 0x336688, 0x1a3344);
  const ry = by - TH2 * 2.2;

  // roof slab
  isoBox(g, cx, ry, hw * 0.7, hh * 0.7, hh * 0.7, 0x7799bb, 0x4466aa, 0x223344);

  // windows on right face (approximate screen positions)
  for (let i = 0; i < 2; i++) {
    const wx = cx + hw * 0.28 + i * 13;
    const wy = by - TH2 * 0.85 - i * 20;
    g.rect(wx - 4, wy - 3, 7, 5).fill({ color: 0xaaccff, alpha: 0.55 });
  }

  // antenna
  const ax = cx + 5, aBase = ry - hh * 0.7;
  g.moveTo(ax, aBase).lineTo(ax, aBase - 28).stroke({ color: 0x88aacc, width: 1 });
  g.circle(ax, aBase - 30, 3).fill(0x44ff88);
}

/** C: organic — no sharp roof, dome ellipse on top + equatorial ring */
function styleC(g: Graphics, cx: number, cy: number) {
  const hw = TW2 * 0.75, hh = TH2 * 0.75, bh = TH2 * 2.0;

  // side walls only (no top — dome replaces it)
  g.poly([cx, cy - bh, cx + hw, cy - hh - bh, cx + hw, cy - hh, cx, cy]).fill(0x446688);
  g.poly([cx - hw, cy - hh - bh, cx, cy - bh, cx, cy, cx - hw, cy - hh]).fill(0x2a4455);

  // base ring (top face of body)
  g.poly([cx - hw, cy - hh - bh, cx, cy - 2 * hh - bh, cx + hw, cy - hh - bh, cx, cy - bh])
    .fill({ color: 0x3a5577, alpha: 0.8 })
    .stroke({ color: 0x88bbdd, width: 1, alpha: 0.5 });

  // dome
  const dX = cx, dY = cy - bh - hh;
  g.ellipse(dX, dY, hw * 1.05, hh * 1.8).fill(0x5588aa);
  g.ellipse(dX - 6, dY - 10, hw * 0.52, hh * 0.85).fill({ color: 0x7aaccf, alpha: 0.4 });

  // equatorial ring
  g.ellipse(dX, dY, hw * 1.05, hh * 0.32).stroke({ color: 0x88bbdd, width: 1, alpha: 0.55 });
}

/** D: industrial — main block + side modules + horizontal stripes + accent light */
function styleD(g: Graphics, cx: number, cy: number) {
  const hw = TW2 * 0.7, hh = TH2 * 0.7, bh = TH2 * 2.8;

  // main body
  isoBox(g, cx, cy, hw, hh, bh, 0x445566, 0x334455, 0x1a2a33);

  // side modules
  const mhw = TW2 * 0.22, mhh = TH2 * 0.22, mbh = bh * 0.55;
  isoBox(g, cx - hw - mhw + 3, cy, mhw, mhh, mbh, 0x334455, 0x223344, 0x112233);
  isoBox(g, cx + hw + mhw - 3, cy, mhw, mhh, mbh, 0x334455, 0x223344, 0x112233);

  // horizontal stripes (right face)
  for (const f of [0.25, 0.5, 0.72]) {
    const sy = cy - bh * f;
    g.moveTo(cx, sy).lineTo(cx + hw, sy - hh).stroke({ color: 0x445566, width: 1, alpha: 0.7 });
  }

  // accent light (green dot)
  const al = { x: cx + hw * 0.3, y: cy - bh * 0.12 };
  g.circle(al.x, al.y, 5).fill({ color: 0x44ff88, alpha: 0.18 });
  g.circle(al.x, al.y, 2.5).fill(0x44ff88);
}

// ─── PixiJS canvas init ───────────────────────────────────────────────────────

function initPixiCanvas(container: HTMLDivElement): Promise<() => void> {
  const app = new Application();
  let mounted = true;

  return app.init({
    background: 0x020510,
    resizeTo: container,
    antialias: true,
    preference: 'webgl',
  }).then(() => {
    if (!mounted) { app.destroy(true, { children: true }); return () => {}; }
    container.appendChild(app.canvas);

    const g = new Graphics();
    app.stage.addChild(g);

    const W = app.screen.width;
    const H = app.screen.height;
    const groundY = H * 0.65;

    // 4 buildings spread evenly across canvas width
    const xs = [W * 0.11, W * 0.36, W * 0.63, W * 0.88];
    styleA(g, xs[0], groundY);
    styleB(g, xs[1], groundY);
    styleC(g, xs[2], groundY);
    styleD(g, xs[3], groundY);

    return () => { mounted = false; app.destroy(true, { children: true }); };
  });
}

// ─── Babylon.js helpers ───────────────────────────────────────────────────────

function hexMat(name: string, hex: string, scene: Scene): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = Color3.FromHexString(hex);
  m.specularColor = new Color3(0.07, 0.07, 0.11);
  return m;
}

function at(mesh: Mesh, x: number, y: number, z: number): Mesh {
  mesh.position.set(x, y, z);
  return mesh;
}

// ─── Babylon.js building styles ───────────────────────────────────────────────

/** E: low-poly — base slab + box body + 4-sided pyramid roof */
function styleE(scene: Scene, ox: number) {
  at(MeshBuilder.CreateBox('e_base', { width: 2, height: 0.3, depth: 2 }, scene),
    ox, 0.15, 0).material = hexMat('me_base', '#2a4455', scene);
  at(MeshBuilder.CreateBox('e_body', { width: 1.6, height: 1.0, depth: 1.6 }, scene),
    ox, 0.8, 0).material = hexMat('me_body', '#446688', scene);
  at(MeshBuilder.CreateCylinder('e_roof',
    { height: 0.65, diameterTop: 0, diameterBottom: 1.8, tessellation: 4 }, scene),
    ox, 1.63, 0).material = hexMat('me_roof', '#5588aa', scene);
}

/** F: modular — slab + body + dome connector + sphere dome + antenna */
function styleF(scene: Scene, ox: number) {
  at(MeshBuilder.CreateBox('f_slab', { width: 2.2, height: 0.2, depth: 2.2 }, scene),
    ox, 0.1, 0).material = hexMat('mf_slab', '#1a3344', scene);
  at(MeshBuilder.CreateBox('f_body', { width: 1.4, height: 1.0, depth: 1.4 }, scene),
    ox, 0.7, 0).material = hexMat('mf_body', '#334466', scene);
  at(MeshBuilder.CreateCylinder('f_conn',
    { height: 0.25, diameter: 0.5, tessellation: 12 }, scene),
    ox, 1.33, 0).material = hexMat('mf_conn', '#2a4455', scene);
  at(MeshBuilder.CreateSphere('f_dome', { diameter: 1.2, segments: 12 }, scene),
    ox, 1.72, 0).material = hexMat('mf_dome', '#4488bb', scene);
  at(MeshBuilder.CreateCylinder('f_ant',
    { height: 0.55, diameter: 0.06, tessellation: 6 }, scene),
    ox, 2.6, 0).material = hexMat('mf_ant', '#aaccff', scene);
}

/** G: organic — cylinder base + cylinder body + sphere dome + torus ring */
function styleG(scene: Scene, ox: number) {
  at(MeshBuilder.CreateCylinder('g_base',
    { height: 0.3, diameter: 2.4, tessellation: 16 }, scene),
    ox, 0.15, 0).material = hexMat('mg_base', '#223344', scene);
  at(MeshBuilder.CreateCylinder('g_body',
    { height: 0.9, diameter: 1.6, tessellation: 12 }, scene),
    ox, 0.75, 0).material = hexMat('mg_body', '#3a5577', scene);
  at(MeshBuilder.CreateSphere('g_dome', { diameter: 1.8, segments: 16 }, scene),
    ox, 1.5, 0).material = hexMat('mg_dome', '#5588aa', scene);
  at(MeshBuilder.CreateTorus('g_ring',
    { diameter: 2.0, thickness: 0.09, tessellation: 24 }, scene),
    ox, 1.22, 0).material = hexMat('mg_ring', '#88bbdd', scene);
}

/** H: complex — foundation + body + angled wings + sphere dome + accent ring + antenna */
function styleH(scene: Scene, ox: number) {
  at(MeshBuilder.CreateBox('h_found', { width: 2.4, height: 0.15, depth: 2.4 }, scene),
    ox, 0.075, 0).material = hexMat('mh_found', '#1a2a33', scene);
  at(MeshBuilder.CreateBox('h_body', { width: 1.5, height: 0.9, depth: 1.5 }, scene),
    ox, 0.62, 0).material = hexMat('mh_body', '#3a5577', scene);

  const wL = MeshBuilder.CreateBox('h_wingL', { width: 0.45, height: 0.28, depth: 1.5 }, scene);
  wL.position.set(ox - 0.98, 0.53, 0);
  wL.rotation.z = 0.26; // ~15°
  wL.material = hexMat('mh_wL', '#2a4455', scene);

  const wR = MeshBuilder.CreateBox('h_wingR', { width: 0.45, height: 0.28, depth: 1.5 }, scene);
  wR.position.set(ox + 0.98, 0.53, 0);
  wR.rotation.z = -0.26;
  wR.material = hexMat('mh_wR', '#2a4455', scene);

  at(MeshBuilder.CreateSphere('h_dome', { diameter: 1.3, segments: 12 }, scene),
    ox, 1.47, 0).material = hexMat('mh_dome', '#6699bb', scene);
  at(MeshBuilder.CreateTorus('h_ring',
    { diameter: 1.4, thickness: 0.07, tessellation: 24 }, scene),
    ox, 1.7, 0).material = hexMat('mh_ring', '#44ff88', scene);
  at(MeshBuilder.CreateCylinder('h_ant',
    { height: 0.5, diameter: 0.055, tessellation: 6 }, scene),
    ox, 2.3, 0).material = hexMat('mh_ant', '#aaccff', scene);
}

// ─── Babylon.js scene init ────────────────────────────────────────────────────

function initBabylonScene(canvas: HTMLCanvasElement): () => void {
  const engine = new Engine(canvas, true, { antialias: true });
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.008, 0.012, 0.04, 1);

  // Camera — isometric orthographic (same angle as SurfaceBabylonView)
  const camera = new ArcRotateCamera(
    'cam',
    Math.PI / 4,
    Math.atan(1 / Math.sqrt(2)),
    20,
    new Vector3(0, 0.5, 0),
    scene,
  );
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  const updateOrtho = () => {
    const aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1);
    const orthoH = 7;
    camera.orthoLeft  = -orthoH * aspect;
    camera.orthoRight =  orthoH * aspect;
    camera.orthoBottom = -orthoH;
    camera.orthoTop   =  orthoH;
  };
  updateOrtho();
  camera.inputs.clear();

  // Lights
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.55;
  hemi.diffuse = new Color3(0.7, 0.82, 1.0);

  const dir = new DirectionalLight('dir', new Vector3(-1, -2, -0.8), scene);
  dir.intensity = 0.78;
  dir.diffuse = new Color3(0.9, 0.95, 1.0);

  // Ground
  const ground = MeshBuilder.CreateGround('ground', { width: 34, height: 18 }, scene);
  const gm = new StandardMaterial('gm', scene);
  gm.diffuseColor = new Color3(0.03, 0.05, 0.1);
  gm.specularColor = Color3.Black();
  ground.material = gm;

  // 4 buildings at X = [-6, -2, +2, +6], Z = 0
  styleE(scene, -6);
  styleF(scene, -2);
  styleG(scene,  2);
  styleH(scene,  6);

  // Resize handler
  const onResize = () => { engine.resize(); updateOrtho(); };
  window.addEventListener('resize', onResize);

  engine.runRenderLoop(() => { scene.render(); });

  return () => {
    window.removeEventListener('resize', onResize);
    engine.stopRenderLoop();
    scene.dispose();
    engine.dispose();
  };
}

// ─── BuildingShowcase component ───────────────────────────────────────────────

export function BuildingShowcase() {
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const babylonCanvasRef = useRef<HTMLCanvasElement>(null);

  // PixiJS init
  useEffect(() => {
    const container = pixiContainerRef.current;
    if (!container) return;

    let cleanup: (() => void) | null = null;
    let isMounted = true;

    initPixiCanvas(container).then(fn => {
      if (!isMounted) { fn(); }
      else { cleanup = fn; }
    });

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, []);

  // Babylon.js init (50ms delay → ensures container has CSS dimensions)
  useEffect(() => {
    const canvas = babylonCanvasRef.current;
    if (!canvas) return;

    let cleanup: (() => void) | null = null;
    const tid = setTimeout(() => {
      cleanup = initBabylonScene(canvas);
    }, 50);

    return () => {
      clearTimeout(tid);
      cleanup?.();
    };
  }, []);

  // ── Styles ──────────────────────────────────────────────────────────────────

  const panelHeader: React.CSSProperties = {
    height: 28, display: 'flex', alignItems: 'center',
    padding: '0 16px', borderBottom: '1px solid #1a2a33',
    color: '#4a6070', fontSize: 10, letterSpacing: '0.6px', flexShrink: 0,
  };

  const labelBar: React.CSSProperties = {
    height: 38, display: 'flex', alignItems: 'center',
    borderTop: '1px solid #1a2a33', padding: '0 4px', flexShrink: 0,
  };

  const labelCell: React.CSSProperties = {
    flex: 1, textAlign: 'center' as const,
    fontFamily: 'monospace', fontSize: 10,
    color: '#556677', letterSpacing: '0.3px',
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: '100vw', height: '100vh',
      background: '#020510', fontFamily: 'monospace', overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{
        height: 44, flexShrink: 0,
        display: 'flex', alignItems: 'center',
        padding: '0 20px', borderBottom: '1px solid #223344',
        color: '#aabbcc', fontSize: 12, letterSpacing: '0.8px', gap: 16,
      }}>
        <span style={{ color: '#334455', fontSize: 10 }}>DEV</span>
        <span>colony_hub</span>
        <span style={{ color: '#334455' }}>/</span>
        <span style={{ color: '#778899' }}>style comparison</span>
        <span style={{ marginLeft: 'auto', color: '#2a3a44', fontSize: 10 }}>
          ?dev=buildings
        </span>
      </div>

      {/* Main row */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* PixiJS panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={panelHeader}>PIXI.JS &mdash; 2D ISOMETRIC</div>
          <div ref={pixiContainerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }} />
          <div style={labelBar}>
            {['A: minimal', 'B: detailed', 'C: organic', 'D: industrial'].map(l => (
              <div key={l} style={labelCell}>{l}</div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: '#223344', flexShrink: 0 }} />

        {/* Babylon.js panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={panelHeader}>BABYLON.JS &mdash; 3D PROCEDURAL</div>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <canvas
              ref={babylonCanvasRef}
              style={{
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: '100%',
                outline: 'none', touchAction: 'none', display: 'block',
              }}
            />
          </div>
          <div style={labelBar}>
            {['E: low-poly', 'F: modular', 'G: organic', 'H: complex'].map(l => (
              <div key={l} style={labelCell}>{l}</div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
