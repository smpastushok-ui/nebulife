// BiosphereView — Babylon.js scene showing a player's settled creatures on a
// procedural terrain patch. See NEXT_GEN_PLAN.md Section C (phases 1-2 MVP).
//
// Scope: static/gently-animated creatures only (no rig/wander-AI — phase 3).
// Perf budget: terrain <=8k triangles, up to 3 creature GLBs (<=5k tris each,
// enforced server-side by the Tripo face_limit), 1 directional light, no real
// shadows (blob-shadow texture instead), 30fps render cap, full dispose on
// unmount.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Engine, Scene, ArcRotateCamera,
  HemisphericLight, DirectionalLight,
  Vector3, Color3, Color4,
  MeshBuilder, Mesh, AbstractMesh, TransformNode,
  StandardMaterial, DynamicTexture,
  VertexBuffer, SceneLoader,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import type { Planet, Star } from '@nebulife/core';
import { getBiosphereBiome, getBiospherePalette } from '../../../game/rendering/BiosphereBiome.js';
import {
  listPlanetCreatures,
  checkCreatureStatus,
  type BiosphereCreature,
} from '../../../api/creature-api.js';
import { CreatureGenerationPanel } from './CreatureGenerationPanel.js';
import { CreatureCareList } from './CreatureCareList.js';
import { LineagePanel } from './LineagePanel.js';
import { HybridizationPanel } from './HybridizationPanel.js';

export const MAX_BIOSPHERE_CREATURES = 3;

type ColonyResourceBundle = { minerals: number; volatiles: number; isotopes: number; water: number };

interface BiosphereViewProps {
  planet: Planet;
  star: Star;
  playerId: string;
  onClose: () => void;
  /** Live colony resource balances for this planet — used to gate which care
   *  types the player can afford (minerals/water/volatiles). */
  colonyResources?: ColonyResourceBundle;
  /** Deducts colony resources for the chosen care type (client-authoritative,
   *  same mechanism as every other colony spend — see App.tsx spendResourcesAcrossPlanets). */
  onSpendResources?: (delta: Partial<ColonyResourceBundle>) => void;
  /** Fires after a successful daily care action (bumps the daily directive). */
  onCareCompleted?: () => void;
}

// ── Deterministic small-patch terrain noise (JS-only, no shader) ───────────

function hash2(x: number, y: number, seed: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 0.0001) * 43758.5453;
  return s - Math.floor(s);
}

function noise2(x: number, y: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

function terrainHeight(x: number, z: number, seed: number): number {
  return (
    noise2(x * 0.35, z * 0.35, seed) * 0.7 +
    noise2(x * 0.9 + 40, z * 0.9 + 40, seed) * 0.3
  );
}

function numToColor3(c: number): Color3 {
  return new Color3(((c >> 16) & 0xff) / 255, ((c >> 8) & 0xff) / 255, (c & 0xff) / 255);
}

const PATCH_SIZE = 16;
const RENDER_FPS_CAP = 30;

interface CreatureAnim {
  root: TransformNode;
  meshes: AbstractMesh[];
  shadow: Mesh;
  baseX: number;
  baseZ: number;
  baseY: number;
  phase: number;
  bobAmplitude: number;
  bobSpeed: number;
  rotSpeed: number;
  slideFromX: number;
  slideFromZ: number;
  slideToX: number;
  slideToZ: number;
  slideStart: number;
  slideDuration: number;
  nextSlideAt: number;
}

export function BiosphereView({
  planet, star, playerId, onClose,
  colonyResources, onSpendResources, onCareCompleted,
}: BiosphereViewProps) {
  const { t } = useTranslation();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const shadowTexMatRef = useRef<StandardMaterial | null>(null);
  const creatureAnimsRef = useRef<Map<string, CreatureAnim>>(new Map());
  const loadingGlbIdsRef = useRef<Set<string>>(new Set());
  const startTimeRef = useRef(0);

  const [sceneMounted, setSceneMounted] = useState(false);
  // Fatal only: WebGL/Babylon engine could not start (old mobile WebViews).
  // Creature-list fetch failures are NOT fatal — the terrain still renders
  // and a retry banner is shown instead (see loadError below).
  const [fatalSceneError, setFatalSceneError] = useState(false);
  const [creatures, setCreatures] = useState<BiosphereCreature[]>([]);
  const [loadingCreatures, setLoadingCreatures] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showGeneratePanel, setShowGeneratePanel] = useState(false);
  const [pendingCreatureId, setPendingCreatureId] = useState<string | null>(null);
  const [showLineagePanel, setShowLineagePanel] = useState(false);
  const [showHybridPanel, setShowHybridPanel] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const palette = useMemo(() => getBiospherePalette(planet), [planet]);
  // NaN-safe terrain seed shared by the ground mesh and creature placement.
  const terrainSeed = useMemo(
    () => (Number.isFinite(planet.seed) ? planet.seed : hashString(planet.id)),
    [planet.seed, planet.id],
  );
  // Legacy-stage creatures (elders that spawned an offspring) are archived to
  // the lineage panel, and photo-tier hybrids ('photo_ready', migration 042)
  // are portraits only: neither is rendered in the 3D scene nor counted
  // against the 3-per-planet cap.
  const sceneCreatures = useMemo(
    () => creatures.filter((c) => (c.stage ?? 'juvenile') !== 'legacy' && c.status !== 'photo_ready'),
    [creatures],
  );
  const readyCreatures = useMemo(() => sceneCreatures.filter((c) => c.status === 'ready' && c.glb_url), [sceneCreatures]);
  const activeCreatureCount = useMemo(
    () => sceneCreatures.filter((c) => c.status !== 'failed').length,
    [sceneCreatures],
  );
  const legacyCreatures = useMemo(() => creatures.filter((c) => c.stage === 'legacy'), [creatures]);
  // Photo-tier hybrids — owned portraits awaiting the optional 3D upgrade.
  const photoHybrids = useMemo(() => creatures.filter((c) => c.status === 'photo_ready'), [creatures]);
  // Hybridization parents: any settled non-legacy creature with a portrait.
  const hybridEligible = useMemo(
    () => creatures.filter((c) => c.status === 'ready' && (c.stage ?? 'juvenile') !== 'legacy' && c.image_url),
    [creatures],
  );

  // ── Load creature list ────────────────────────────────────────────────

  const reloadCreatures = useCallback(() => {
    setLoadingCreatures(true);
    setLoadError(null);
    listPlanetCreatures(planet.id)
      .then((list) => setCreatures(list))
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoadingCreatures(false));
  }, [planet.id]);

  useEffect(() => { reloadCreatures(); }, [reloadCreatures]);

  // Live vitality-decay display: re-derive the effective (decayed) vitality
  // bar every 30s without needing a reload — the actual decay math itself is
  // continuous (computeEffectiveVitality), this just refreshes the paint.
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // ── Poll generation status for the pending creature ─────────────────────

  useEffect(() => {
    if (!pendingCreatureId) return;
    let cancelled = false;
    const poll = () => {
      checkCreatureStatus(pendingCreatureId)
        .then((res) => {
          if (cancelled) return;
          // 'photo_ready' is terminal too: a failed hybrid 3D upgrade reverts
          // to the owned photo (quarks refunded server-side) — stop polling.
          if (res.status === 'ready' || res.status === 'failed' || res.status === 'photo_ready') {
            setPendingCreatureId(null);
            reloadCreatures();
          } else {
            timer = window.setTimeout(poll, 4000);
          }
        })
        .catch(() => {
          if (!cancelled) timer = window.setTimeout(poll, 6000);
        });
    };
    let timer = window.setTimeout(poll, 3000);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [pendingCreatureId, reloadCreatures]);

  // ── Babylon.js scene init (once) ─────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    // Engine creation throws on WebViews without a usable WebGL context —
    // that is the only truly fatal case for this screen.
    let engine: Engine;
    try {
      engine = new Engine(canvas, true, { antialias: true, preserveDrawingBuffer: false });
    } catch (err) {
      console.error('[BiosphereView] Babylon engine init failed:', err);
      setFatalSceneError(true);
      return;
    }
    engineRef.current = engine;

    const scene = new Scene(engine);
    scene.clearColor = new Color4(
      ((palette.ambient >> 16) & 0xff) / 255,
      ((palette.ambient >> 8) & 0xff) / 255,
      (palette.ambient & 0xff) / 255,
      1,
    );
    sceneRef.current = scene;

    // ── Orbit camera — Babylon's built-in ArcRotateCamera controls ─────────
    const camera = new ArcRotateCamera('biosphereCam', -Math.PI / 3, Math.PI / 3, PATCH_SIZE * 0.85, Vector3.Zero(), scene);
    camera.lowerRadiusLimit = PATCH_SIZE * 0.35;
    camera.upperRadiusLimit = PATCH_SIZE * 1.6;
    camera.lowerBetaLimit = 0.15;
    camera.upperBetaLimit = Math.PI / 2.15;
    camera.wheelPrecision = 40;
    camera.pinchPrecision = 80;
    camera.panningSensibility = 0; // no panning — patch is small, orbit only
    camera.attachControl(canvas, true);

    // ── Lighting: 1 directional (sun) + minimal ambient fill ───────────────
    const sun = new DirectionalLight('bioSun', new Vector3(-0.6, -1.4, -0.5), scene);
    sun.intensity = 1.3;
    sun.diffuse = numToColor3(palette.lightTint);

    const ambient = new HemisphericLight('bioAmbient', new Vector3(0, 1, 0), scene);
    ambient.intensity = 0.35;
    ambient.diffuse = numToColor3(palette.highlight);
    ambient.groundColor = numToColor3(palette.base);

    // ── Terrain patch (<=8k triangles, flat-shaded low-poly) ──────────────
    // terrainSeed is NaN-guarded (see the memo above): a non-finite seed
    // would turn every height into NaN, corrupting the vertex buffer so the
    // mesh never draws and the screen degrades to a flat clear-color plane.
    const heightScale = 0.9;
    const subdivisions = 40; // 40*40*2 = 3200 triangles
    const ground = MeshBuilder.CreateGround('bioTerrain', { width: PATCH_SIZE, height: PATCH_SIZE, subdivisions }, scene);
    const positions = ground.getVerticesData(VertexBuffer.PositionKind);
    if (positions) {
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        positions[i + 1] = terrainHeight(x, z, terrainSeed) * heightScale;
      }
      ground.updateVerticesData(VertexBuffer.PositionKind, positions);
      ground.createNormals(false);
    }
    ground.convertToFlatShadedMesh();
    ground.isPickable = false;

    // Elevation tint: lerp base -> highlight per vertex (the BiomePalette
    // contract) so the patch reads as terrain instead of a flat single-color
    // plane. Applied after convertToFlatShadedMesh so each facet keeps a
    // uniform low-poly color.
    const shadedPositions = ground.getVerticesData(VertexBuffer.PositionKind);
    if (shadedPositions) {
      const baseC = numToColor3(palette.base);
      const highC = numToColor3(palette.highlight);
      const colors = new Float32Array((shadedPositions.length / 3) * 4);
      for (let i = 0, v = 0; i < shadedPositions.length; i += 3, v += 4) {
        const h = Math.min(1, Math.max(0, shadedPositions[i + 1] / heightScale));
        colors[v] = baseC.r + (highC.r - baseC.r) * h;
        colors[v + 1] = baseC.g + (highC.g - baseC.g) * h;
        colors[v + 2] = baseC.b + (highC.b - baseC.b) * h;
        colors[v + 3] = 1;
      }
      ground.setVerticesData(VertexBuffer.ColorKind, colors);
    }

    const groundMat = new StandardMaterial('bioTerrainMat', scene);
    groundMat.diffuseColor = new Color3(1, 1, 1); // tint comes from vertex colors
    groundMat.specularColor = new Color3(0.05, 0.05, 0.05);
    groundMat.emissiveColor = numToColor3(palette.highlight).scale(0.05);
    ground.material = groundMat;

    // ── Blob shadow texture (shared material, no real shadow generator) ───
    const shadowTex = new DynamicTexture('bioBlobShadow', { width: 128, height: 128 }, scene);
    const ctx = shadowTex.getContext();
    const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    gradient.addColorStop(0, 'rgba(0,0,0,0.45)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    shadowTex.update();
    shadowTex.hasAlpha = true;
    const shadowMat = new StandardMaterial('bioBlobShadowMat', scene);
    shadowMat.diffuseTexture = shadowTex;
    shadowMat.useAlphaFromDiffuseTexture = true;
    shadowMat.disableLighting = true;
    shadowMat.backFaceCulling = false;
    shadowTexMatRef.current = shadowMat;

    // ── Render loop — capped at 30fps (contemplative screen, not combat) ──
    startTimeRef.current = performance.now();
    let lastRenderAt = 0;
    const frameInterval = 1000 / RENDER_FPS_CAP;
    engine.runRenderLoop(() => {
      if (cancelled) return;
      const now = performance.now();
      if (now - lastRenderAt < frameInterval) return;
      lastRenderAt = now;
      const t = (now - startTimeRef.current) * 0.001;
      updateCreatureAnimations(creatureAnimsRef.current, t);
      scene.render();
    });

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    setSceneMounted(true);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', handleResize);
      camera.detachControl();
      for (const anim of creatureAnimsRef.current.values()) {
        anim.meshes.forEach((m) => m.dispose());
        anim.shadow.dispose();
      }
      creatureAnimsRef.current.clear();
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
      engineRef.current = null;
      sceneRef.current = null;
      shadowTexMatRef.current = null;
      setSceneMounted(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- palette/seed are stable for the mounted planet
  }, [planet.id]);

  // ── Sync ready creatures -> GLB instances ──────────────────────────────

  useEffect(() => {
    const scene = sceneRef.current;
    const shadowMat = shadowTexMatRef.current;
    if (!scene || !shadowMat || !sceneMounted) return;

    const anims = creatureAnimsRef.current;
    const currentIds = new Set(readyCreatures.map((c) => c.id));

    // Remove stale
    for (const [id, anim] of anims) {
      if (!currentIds.has(id)) {
        anim.meshes.forEach((m) => m.dispose());
        anim.shadow.dispose();
        anims.delete(id);
      }
    }

    // Add missing (spaced around the patch, deterministic by index)
    readyCreatures.forEach((creature, index) => {
      if (anims.has(creature.id) || loadingGlbIdsRef.current.has(creature.id)) return;
      if (!creature.glb_url) return;
      loadingGlbIdsRef.current.add(creature.id);

      const angle = (index / MAX_BIOSPHERE_CREATURES) * Math.PI * 2 + 0.4;
      const radius = PATCH_SIZE * 0.22;
      const baseX = Math.cos(angle) * radius;
      const baseZ = Math.sin(angle) * radius;
      const baseY = terrainHeight(baseX, baseZ, terrainSeed) * 0.9;

      SceneLoader.ImportMeshAsync('', '', creature.glb_url, scene)
        .then((result) => {
          loadingGlbIdsRef.current.delete(creature.id);
          if (!sceneRef.current || sceneRef.current !== scene) {
            result.meshes.forEach((m) => m.dispose());
            return;
          }
          const meshes = result.meshes;
          if (meshes.length === 0) return;
          const root = meshes[0];

          // Normalize scale to a readable creature height (~1.4 units)
          const descendants = root.getChildMeshes(false);
          const all = [root, ...descendants];
          const minY = Math.min(...all.map((m) => m.getBoundingInfo().boundingBox.minimumWorld.y));
          const maxY = Math.max(...all.map((m) => m.getBoundingInfo().boundingBox.maximumWorld.y));
          const height = Math.max(0.0001, maxY - minY);
          const targetHeight = 1.4;
          const scale = targetHeight / height;
          root.scaling.setAll(scale);
          root.position.set(baseX, baseY - minY * scale, baseZ);
          meshes.forEach((m) => { m.isPickable = false; m.receiveShadows = false; });

          const shadow = MeshBuilder.CreateDisc(`bioShadow_${creature.id}`, { radius: 0.7, tessellation: 24 }, scene);
          shadow.rotation.x = Math.PI / 2;
          shadow.position.set(baseX, baseY + 0.01, baseZ);
          shadow.material = shadowMat;
          shadow.isPickable = false;

          const rand = mulberry32(hashString(creature.id));
          anims.set(creature.id, {
            root,
            meshes,
            shadow,
            baseX, baseZ, baseY,
            phase: rand() * Math.PI * 2,
            bobAmplitude: 0.05 + rand() * 0.04,
            bobSpeed: 0.6 + rand() * 0.3,
            rotSpeed: (rand() - 0.5) * 0.15,
            slideFromX: baseX, slideFromZ: baseZ,
            slideToX: baseX, slideToZ: baseZ,
            slideStart: 0, slideDuration: 3,
            nextSlideAt: 6 + rand() * 8,
          });
        })
        .catch((err) => {
          loadingGlbIdsRef.current.delete(creature.id);
          console.error(`[BiosphereView] Failed to load creature GLB ${creature.id}:`, err);
        });
    });
  }, [readyCreatures, sceneMounted, terrainSeed]);

  // ── Keyboard: Escape closes ──────────────────────────────────────────────

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const canGenerateMore = activeCreatureCount < MAX_BIOSPHERE_CREATURES;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      // 12000 = same layer as the DNA-constructor minigame: must cover the
      // Colony Center (9700) / BuildingDetailPanel (9900) it is opened from.
      background: '#020510', zIndex: 12000, fontFamily: 'monospace',
    }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', touchAction: 'none', outline: 'none' }}
      />

      {/* Header bar — safe-area padding keeps the controls below the OS
          status bar / notch (same pattern as HangarPage). */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'calc(env(safe-area-inset-top, 0px) + 9px) 16px 9px',
        background: 'rgba(5,10,20,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(60,100,160,0.15)', zIndex: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#ccddee', fontSize: 13, letterSpacing: '0.5px' }}>
            {t('biosphere.title')}
          </span>
          <span style={{ color: '#667788', fontSize: 10 }}>
            {planet.name} · {activeCreatureCount}/{MAX_BIOSPHERE_CREATURES}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hybridEligible.length >= 2 && (
            <button
              onClick={() => { setShowHybridPanel((v) => !v); setShowGeneratePanel(false); setShowLineagePanel(false); }}
              style={{
                padding: '6px 12px', background: showHybridPanel ? 'rgba(40,80,120,0.5)' : 'rgba(30,60,80,0.6)',
                border: '1px solid #446688', color: '#aaccee', fontFamily: 'monospace', fontSize: 11,
                borderRadius: 3, cursor: 'pointer',
              }}
            >
              {t('biosphere.hybrid.button')}
            </button>
          )}
          {(legacyCreatures.length > 0 || creatures.some((c) => c.is_hybrid)) && (
            <button
              onClick={() => { setShowLineagePanel((v) => !v); setShowHybridPanel(false); }}
              style={{
                padding: '6px 12px', background: showLineagePanel ? 'rgba(40,80,120,0.5)' : 'rgba(30,60,80,0.6)',
                border: '1px solid #446688', color: '#aaccee', fontFamily: 'monospace', fontSize: 11,
                borderRadius: 3, cursor: 'pointer',
              }}
            >
              {t('biosphere.lineage.button')}
            </button>
          )}
          {canGenerateMore && (
            <button
              onClick={() => { setShowGeneratePanel((v) => !v); setShowHybridPanel(false); }}
              style={{
                padding: '6px 12px', background: showGeneratePanel ? 'rgba(40,80,120,0.5)' : 'rgba(30,60,80,0.6)',
                border: '1px solid #446688', color: '#aaccee', fontFamily: 'monospace', fontSize: 11,
                borderRadius: 3, cursor: 'pointer',
              }}
            >
              {t('biosphere.new_creature')}
            </button>
          )}
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#667788', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}
            aria-label={t('biosphere.close')}
          >
            ×
          </button>
        </div>
      </div>

      {/* Loading / error states */}
      {fatalSceneError && (
        <div style={centerOverlayStyle}>
          <span style={{ color: '#cc4444', fontSize: 12 }}>{t('biosphere.error_load')}</span>
        </div>
      )}
      {loadingCreatures && !fatalSceneError && (
        <div style={centerOverlayStyle}>
          <span style={{ color: '#8899aa', fontSize: 12 }}>{t('biosphere.loading')}</span>
        </div>
      )}
      {/* Creature-list fetch failure is non-fatal: the terrain keeps
          rendering, only a compact retry banner appears. */}
      {!loadingCreatures && loadError && (
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          top: 'calc(env(safe-area-inset-top, 0px) + 60px)', zIndex: 3,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', background: 'rgba(10,15,25,0.92)',
          border: '1px solid rgba(204,68,68,0.5)', borderRadius: 4,
          maxWidth: 'min(420px, calc(100vw - 32px))',
        }}>
          <span style={{ color: '#cc4444', fontSize: 11 }}>{t('biosphere.error_creatures')}</span>
          <button
            onClick={reloadCreatures}
            style={{
              padding: '5px 10px', background: 'rgba(30,60,80,0.6)', flexShrink: 0,
              border: '1px solid #446688', color: '#aaccee', fontFamily: 'monospace',
              fontSize: 10, borderRadius: 3, cursor: 'pointer',
            }}
          >
            {t('biosphere.retry')}
          </button>
        </div>
      )}
      {!loadingCreatures && !loadError && creatures.length === 0 && !showGeneratePanel && (
        <div style={centerOverlayStyle}>
          <span style={{ color: '#8899aa', fontSize: 12, textAlign: 'center', maxWidth: 280 }}>
            {t('biosphere.empty_hint')}
          </span>
        </div>
      )}

      {/* Generation panel */}
      {showGeneratePanel && (
        <CreatureGenerationPanel
          planetId={planet.id}
          biome={getBiosphereBiome(planet)}
          onClose={() => setShowGeneratePanel(false)}
          onGenerationStarted={(creatureId) => {
            setPendingCreatureId(creatureId);
            setShowGeneratePanel(false);
            reloadCreatures();
          }}
        />
      )}

      {/* Hybridization experiment — "дослід схрещування" (migration 042). */}
      {showHybridPanel && (
        <HybridizationPanel
          eligibleCreatures={hybridEligible}
          activeCreatureCount={activeCreatureCount}
          maxCreatures={MAX_BIOSPHERE_CREATURES}
          onClose={() => setShowHybridPanel(false)}
          onHybridGenerating={(creatureId) => { setPendingCreatureId(creatureId); }}
          onChanged={reloadCreatures}
        />
      )}

      {/* Daily care / evolution — status chips for active creatures with
          feed + "Нове покоління" controls (Еволюція біосфери), plus
          photo-tier hybrids with their 3D-upgrade action. */}
      {!showGeneratePanel && !showLineagePanel && !showHybridPanel && (sceneCreatures.length > 0 || photoHybrids.length > 0) && (
        <CreatureCareList
          creatures={sceneCreatures}
          photoHybrids={photoHybrids}
          nowMs={nowMs}
          colonyResources={colonyResources}
          onSpendResources={onSpendResources}
          onCareCompleted={() => { onCareCompleted?.(); reloadCreatures(); }}
          onEvolved={(offspringId) => { setPendingCreatureId(offspringId); reloadCreatures(); }}
          onHybridUpgradeStarted={(creatureId) => { setPendingCreatureId(creatureId); reloadCreatures(); }}
        />
      )}

      {/* Lineage panel — legacy elders archived after spawning an offspring,
          offspring generations and hybrids (with both parents). */}
      {showLineagePanel && (
        <LineagePanel creatures={creatures} onClose={() => setShowLineagePanel(false)} />
      )}
    </div>
  );
}

const centerOverlayStyle: React.CSSProperties = {
  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
  zIndex: 1, pointerEvents: 'none',
};

// ── Small deterministic RNG helpers (per-creature idle-motion variance) ────

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Idle motion: slow bob + slow turn + occasional short slide ─────────────

function updateCreatureAnimations(anims: Map<string, CreatureAnim>, t: number): void {
  for (const anim of anims.values()) {
    // Occasional slide: pick a new nearby target when due
    if (t >= anim.nextSlideAt) {
      anim.slideFromX = anim.root.position.x;
      anim.slideFromZ = anim.root.position.z;
      const angle = Math.random() * Math.PI * 2;
      const dist = 0.6 + Math.random() * 0.9;
      anim.slideToX = anim.baseX + Math.cos(angle) * dist;
      anim.slideToZ = anim.baseZ + Math.sin(angle) * dist;
      anim.slideStart = t;
      anim.nextSlideAt = t + anim.slideDuration + 6 + Math.random() * 8;
    }

    const slideT = Math.min(1, Math.max(0, (t - anim.slideStart) / anim.slideDuration));
    const eased = slideT * slideT * (3 - 2 * slideT); // smoothstep
    const x = anim.slideFromX + (anim.slideToX - anim.slideFromX) * eased;
    const z = anim.slideFromZ + (anim.slideToZ - anim.slideFromZ) * eased;
    const bob = Math.sin(t * anim.bobSpeed + anim.phase) * anim.bobAmplitude;

    anim.root.position.x = x;
    anim.root.position.z = z;
    anim.root.position.y = anim.baseY + bob + 0.001;
    anim.root.rotation.y += anim.rotSpeed * 0.033;

    anim.shadow.position.x = x;
    anim.shadow.position.z = z;
  }
}

export default BiosphereView;
