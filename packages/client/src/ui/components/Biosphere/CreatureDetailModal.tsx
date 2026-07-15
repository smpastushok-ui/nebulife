// CreatureDetailModal — tap/click detail card for a Biosphere creature.
//
// This is the "Вимога #4" slice of BIOSPHERE_CREATURES_V2_PLAN.md §6:
// picking a settled creature opens a full-screen card with an isolated
// Babylon.js 360-degree GLB viewer (own Engine/Scene, fully disposed on
// close or creature change — never touches the main BiosphereView scene)
// plus a read-only parameters panel built strictly from the creature's own
// row (BiosphereCreature) — no invented stats. Deliberately scoped to just
// this requirement, not the wider V2 rebuild (movement/size/habitat/voice).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Engine, Scene, ArcRotateCamera,
  HemisphericLight, DirectionalLight,
  Vector3, Color3, Color4,
  SceneLoader,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { formatCreatureAgeBucket, type CreatureAgeUnit } from '@nebulife/core';
import { DEFAULT_CREATURE_GLB_URL, type BiosphereCreature, type CreatureStage } from '../../../api/creature-api.js';
import { getCreatureEffectiveVitality } from './creature-vitality.js';
import { getCreatureProfile, localizeCreatureField } from './creature-profile.js';

interface CreatureDetailModalProps {
  creature: BiosphereCreature;
  /** Full planet creature list — used only to label a hybrid's two parents. */
  allCreatures: BiosphereCreature[];
  nowMs: number;
  onClose: () => void;
}

function stageLabelKey(stage: CreatureStage | string): string {
  switch (stage) {
    case 'adult': return 'biosphere.stage.adult';
    case 'elder': return 'biosphere.stage.elder';
    case 'legacy': return 'biosphere.stage.legacy';
    default: return 'biosphere.stage.juvenile';
  }
}

function ageKeyFor(unit: CreatureAgeUnit): string {
  return `biosphere.detail.age_${unit}`;
}

export function CreatureDetailModal({ creature, allCreatures, nowMs, onClose }: CreatureDetailModalProps) {
  const { t, i18n } = useTranslation();

  // Escape closes the card (not the whole Biosphere — BiosphereView defers
  // to this modal while it is open, see its own Escape handler).
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const vitality = Math.round(getCreatureEffectiveVitality(creature, nowMs));
  const barColor = vitality >= 60 ? '#44ff88' : vitality >= 30 ? '#7bb8ff' : '#ff8844';
  const age = useMemo(
    () => formatCreatureAgeBucket(Date.parse(creature.created_at), nowMs),
    [creature.created_at, nowMs],
  );
  const stage = (creature.stage as CreatureStage | undefined) ?? 'juvenile';
  const isPhotoReady = creature.status === 'photo_ready';
  const portraitUrl = creature.hybrid_photo_url ?? creature.image_url ?? null;
  const profile = getCreatureProfile(creature);
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const localized = (field: { uk: string; en: string }) => localizeCreatureField(field, locale);
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale.startsWith('uk') ? 'uk-UA' : 'en-US', { maximumFractionDigits: 2 }),
    [locale],
  );
  const formatSize = (sizeCm: number): string => sizeCm >= 100
    ? t('biosphere.detail.unit_m', { value: numberFormatter.format(sizeCm / 100) })
    : t('biosphere.detail.unit_cm', { value: numberFormatter.format(sizeCm) });
  const formatWeight = (weightKg: number): string => weightKg < 1
    ? t('biosphere.detail.unit_g', { value: numberFormatter.format(weightKg * 1000) })
    : t('biosphere.detail.unit_kg', { value: numberFormatter.format(weightKg) });

  const byId = useMemo(() => new Map(allCreatures.map((c) => [c.id, c])), [allCreatures]);
  const parentLabel = (parentId: string | null): string | null => {
    if (!parentId) return null;
    const parent = byId.get(parentId);
    if (!parent) return t('biosphere.generation_short', { gen: '?' });
    return parent.is_hybrid
      ? `${t('biosphere.hybrid.badge')} ${t('biosphere.generation_short', { gen: parent.generation ?? 1 })}`
      : t('biosphere.generation_short', { gen: parent.generation ?? 1 });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={creature.name ?? t('biosphere.detail.unnamed')}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        // 12050: above BiosphereView (12000), the layer this card opens from.
        zIndex: 12050, background: 'rgba(2,5,16,0.82)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'calc(env(safe-area-inset-top,0px) + 12px) calc(env(safe-area-inset-right,0px) + 12px) calc(env(safe-area-inset-bottom,0px) + 12px) calc(env(safe-area-inset-left,0px) + 12px)',
        fontFamily: 'monospace', boxSizing: 'border-box',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(460px, 100%)', maxHeight: '100%',
          display: 'flex', flexDirection: 'column',
          background: 'rgba(10,15,25,0.96)', border: '1px solid #334455', borderRadius: 6,
          boxShadow: '0 8px 40px rgba(0,0,0,0.65)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '10px 12px', borderBottom: '1px solid rgba(60,100,160,0.2)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{
              color: '#ccddee', fontSize: 12, letterSpacing: '0.5px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {creature.name ?? t('biosphere.detail.unnamed')}
            </span>
            <span style={{ color: '#8899aa', fontSize: 9, textTransform: 'uppercase', flexShrink: 0 }}>
              {isPhotoReady
                ? t(creature.is_hybrid ? 'biosphere.hybrid.photo_badge' : 'biosphere.hybrid.photo_badge_plain')
                : t(stageLabelKey(stage))}
            </span>
            {creature.is_hybrid && (
              <span style={{
                padding: '1px 5px', background: 'rgba(60,50,110,0.4)',
                border: '1px solid #7766aa', color: '#bbaaee', fontSize: 8, borderRadius: 3,
                textTransform: 'uppercase', flexShrink: 0,
              }}>
                {t('biosphere.hybrid.badge')}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label={t('biosphere.detail.close')}
            style={{ background: 'none', border: 'none', color: '#667788', fontSize: 18, cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}
          >
            &times;
          </button>
        </div>

        {/* Isolated 360-degree viewer */}
        <div style={{
          height: 'min(38vh, 300px)', minHeight: 200, flexShrink: 0,
          position: 'relative', background: '#f4f5f2',
          borderBottom: '1px solid rgba(60,100,160,0.15)',
        }}>
          <CreatureGLBViewer
            glbUrl={creature.glb_url}
            fallbackImageUrl={portraitUrl}
            creatureLabel={creature.name ?? t('biosphere.detail.unnamed')}
          />
        </div>

        {/* Parameters — read-only, sourced only from this creature's row */}
        <div style={{ padding: 12, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ height: 5, borderRadius: 3, background: 'rgba(30,40,50,0.6)', overflow: 'hidden', marginBottom: 4 }}>
              <div style={{ height: '100%', width: `${vitality}%`, background: barColor, transition: 'width 0.3s' }} />
            </div>
            <span style={{ color: '#8899aa', fontSize: 9 }}>
              {t('biosphere.detail.vitality_label')}: {vitality}%
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
            <span style={{ color: '#8899aa', fontSize: 9 }}>
              {t('biosphere.generation_label', { gen: creature.generation ?? 1 })}
            </span>
            <span style={{ color: '#8899aa', fontSize: 9 }}>
              {t('biosphere.detail.age_label')}: {age.unit === 'just_hatched' ? t('biosphere.detail.age_just_hatched') : t(ageKeyFor(age.unit), { count: age.count })}
            </span>
            <span style={{ color: '#8899aa', fontSize: 9 }}>
              {t('biosphere.detail.cost_label')}: {creature.quarks_paid > 0 ? `${creature.quarks_paid}\u269B` : t('biosphere.detail.cost_free')}
            </span>
          </div>

          {creature.is_hybrid && creature.parent_id && creature.parent_b_id && (
            <p style={{ color: '#8899aa', fontSize: 9, margin: '0 0 10px' }}>
              {t('biosphere.hybrid.parents_label', {
                parentA: parentLabel(creature.parent_id),
                parentB: parentLabel(creature.parent_b_id),
              })}
            </p>
          )}

          {profile ? (
            <>
              <section aria-labelledby="creature-profile-summary" style={{ marginBottom: 10 }}>
                <p id="creature-profile-summary" style={{ color: '#667788', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>
                  {t('biosphere.detail.profile_label')}
                </p>
                <p style={{ color: '#aabbcc', fontSize: 10, lineHeight: 1.5, margin: 0 }}>
                  {localized(profile.summary)}
                </p>
              </section>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6, marginBottom: 10 }}>
                <ProfileField label={t('biosphere.detail.size_label')} value={formatSize(profile.sizeCm)} />
                <ProfileField label={t('biosphere.detail.weight_label')} value={formatWeight(profile.weightKg)} />
                <ProfileField
                  label={t('biosphere.detail.lifespan_label')}
                  value={t('biosphere.detail.unit_years', { count: profile.lifespanYears, value: numberFormatter.format(profile.lifespanYears) })}
                />
                <ProfileField label={t('biosphere.detail.temperament_label')} value={localized(profile.temperament)} />
                <ProfileField label={t('biosphere.detail.diet_label')} value={localized(profile.diet)} />
                <ProfileField label={t('biosphere.detail.habitat_behavior_label')} value={localized(profile.habitatBehavior)} />
              </div>

              <section aria-labelledby="creature-story" style={{ marginBottom: 10 }}>
                <p id="creature-story" style={{ color: '#667788', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>
                  {t('biosphere.detail.story_label')}
                </p>
                <p style={{ color: '#aabbcc', fontSize: 10, lineHeight: 1.55, margin: 0 }}>
                  {localized(profile.story)}
                </p>
              </section>
            </>
          ) : (
            <p style={{ color: '#8899aa', fontSize: 10, lineHeight: 1.5, margin: '0 0 10px' }}>
              {t('biosphere.detail.legacy_profile_unavailable')}
            </p>
          )}

          {Array.isArray(creature.traits) && creature.traits.length > 0 && (
            <div>
              <p style={{ color: '#667788', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>
                {t('biosphere.detail.traits_label')}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {creature.traits.map((tr) => (
                  <span key={`${tr.category}:${tr.trait}`} style={{
                    padding: '2px 6px', background: 'rgba(40,80,120,0.3)', border: '1px solid #446688',
                    color: '#aaccee', fontSize: 9, borderRadius: 3,
                  }}>
                    {t(`biosphere.trait.${tr.category}.${tr.trait}`)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: '6px 7px', background: 'rgba(20,30,40,0.55)',
      border: '1px solid rgba(50,70,90,0.65)', borderRadius: 3,
    }}>
      <span style={{ display: 'block', color: '#667788', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>
        {label}
      </span>
      <span style={{ display: 'block', color: '#aabbcc', fontSize: 9, lineHeight: 1.4 }}>
        {value}
      </span>
    </div>
  );
}

// ── Isolated 360-degree GLB viewer ──────────────────────────────────────────
// Its own Engine + Scene + ArcRotateCamera, entirely separate from the main
// BiosphereView scene. Rotate = drag, zoom = wheel/pinch (ArcRotateCamera's
// built-in orbit controls); gentle auto-rotation resumes after the player
// stops interacting (Babylon's autoRotationBehavior). Always fully disposed
// when the GLB url changes or the component unmounts (modal closes / a
// different creature is selected).

type ViewerStatus = 'idle' | 'loading' | 'ready' | 'failed';
const VIEWER_FPS_CAP = 30;

function CreatureGLBViewer({
  glbUrl, fallbackImageUrl, creatureLabel,
}: { glbUrl: string | null; fallbackImageUrl: string | null; creatureLabel: string }) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Fallback cascade (BIOSPHERE_CREATURES_V2_PLAN.md §6.2/§9.4): this
  // creature's own glb_url always wins. Only when it is missing AND there is
  // no portrait to show instead do we load the bundled default/starter model
  // — a generic placeholder, never a substitute for a successfully generated
  // personal asset. `isBundledFallback` drives the honest footer hint below.
  const effectiveGlbUrl = glbUrl ?? (fallbackImageUrl ? null : DEFAULT_CREATURE_GLB_URL);
  const isBundledFallback = !glbUrl && effectiveGlbUrl === DEFAULT_CREATURE_GLB_URL;
  const [status, setStatus] = useState<ViewerStatus>(effectiveGlbUrl ? 'loading' : 'idle');

  useEffect(() => {
    setStatus(effectiveGlbUrl ? 'loading' : 'idle');
    if (!effectiveGlbUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let engine: Engine;
    try {
      engine = new Engine(canvas, true, { antialias: true, preserveDrawingBuffer: false });
    } catch (err) {
      console.error('[CreatureDetailModal] Babylon engine init failed:', err);
      setStatus('failed');
      return;
    }

    const scene = new Scene(engine);
    // Requirement: only this isolated specimen viewer uses a very light
    // neutral studio field. The modal and the rest of Nebulife remain in the
    // Game Bible dark palette.
    scene.clearColor = new Color4(0.957, 0.961, 0.949, 1);
    scene.ambientColor = new Color3(0.35, 0.35, 0.35);

    const camera = new ArcRotateCamera('creatureViewerCam', -Math.PI / 2.6, Math.PI / 2.3, 3.2, Vector3.Zero(), scene);
    camera.lowerRadiusLimit = 1.4;
    camera.upperRadiusLimit = 9;
    camera.lowerBetaLimit = 0.1;
    camera.upperBetaLimit = Math.PI - 0.1;
    camera.wheelPrecision = 55;
    camera.pinchPrecision = 120;
    camera.panningSensibility = 0; // orbit + zoom only, no panning
    camera.useAutoRotationBehavior = true;
    if (camera.autoRotationBehavior) {
      camera.autoRotationBehavior.idleRotationSpeed = 0.4;
      camera.autoRotationBehavior.idleRotationWaitTime = 2000;
      camera.autoRotationBehavior.idleRotationSpinupTime = 1000;
    }
    camera.attachControl(canvas, true);

    const sun = new DirectionalLight('creatureSun', new Vector3(-0.5, -1.2, -0.6), scene);
    sun.intensity = 1.15;
    sun.diffuse = new Color3(1, 0.99, 0.96);

    const ambient = new HemisphericLight('creatureAmbient', new Vector3(0, 1, 0), scene);
    ambient.intensity = 0.9;
    ambient.diffuse = new Color3(0.88, 0.92, 1);
    ambient.groundColor = new Color3(0.6, 0.62, 0.65);

    let disposed = false;
    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    const disposeAll = () => {
      if (disposed) return;
      disposed = true;
      window.removeEventListener('resize', handleResize);
      camera.detachControl();
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    };

    SceneLoader.ImportMeshAsync('', '', effectiveGlbUrl, scene)
      .then((result) => {
        if (disposed) { result.meshes.forEach((m) => m.dispose()); return; }
        const meshes = result.meshes;
        if (meshes.length === 0) { disposeAll(); setStatus('failed'); return; }
        const root = meshes[0];
        const all = [root, ...root.getChildMeshes(false)];
        const minY = Math.min(...all.map((m) => m.getBoundingInfo().boundingBox.minimumWorld.y));
        const maxY = Math.max(...all.map((m) => m.getBoundingInfo().boundingBox.maximumWorld.y));
        const minX = Math.min(...all.map((m) => m.getBoundingInfo().boundingBox.minimumWorld.x));
        const maxX = Math.max(...all.map((m) => m.getBoundingInfo().boundingBox.maximumWorld.x));
        const minZ = Math.min(...all.map((m) => m.getBoundingInfo().boundingBox.minimumWorld.z));
        const maxZ = Math.max(...all.map((m) => m.getBoundingInfo().boundingBox.maximumWorld.z));
        const height = Math.max(0.0001, maxY - minY);
        const targetHeight = 1.6;
        const scale = Math.min(8, Math.max(0.05, targetHeight / height));
        root.scaling.setAll(scale);
        root.position.set(
          -((minX + maxX) / 2) * scale,
          -minY * scale,
          -((minZ + maxZ) / 2) * scale,
        );
        meshes.forEach((m) => { m.isPickable = false; });
        camera.setTarget(new Vector3(0, targetHeight * 0.5, 0));
        camera.radius = Math.max(camera.lowerRadiusLimit ?? 1.4, targetHeight * 2.1);
        setStatus('ready');
      })
      .catch((err) => {
        console.error('[CreatureDetailModal] GLB load failed:', err);
        disposeAll();
        setStatus('failed');
      });

    let lastRenderAt = 0;
    const frameInterval = 1000 / VIEWER_FPS_CAP;
    engine.runRenderLoop(() => {
      if (disposed) return;
      const now = performance.now();
      if (now - lastRenderAt < frameInterval) return;
      lastRenderAt = now;
      scene.render();
    });

    return disposeAll;
  }, [effectiveGlbUrl]);

  const showCanvas = status === 'loading' || status === 'ready';
  const showFallback = status === 'idle' || status === 'failed';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        role="application"
        aria-label={t('biosphere.detail.viewer_aria', { name: creatureLabel })}
        tabIndex={0}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          touchAction: 'none', outline: 'none', background: '#f4f5f2',
          visibility: showCanvas ? 'visible' : 'hidden',
        }}
      />
      {showFallback && (
        fallbackImageUrl ? (
          <img
            src={fallbackImageUrl}
            alt={creatureLabel}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', padding: 12, boxSizing: 'border-box' }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <span style={{ color: '#556677', fontSize: 10, textAlign: 'center' }}>
              {t('biosphere.detail.viewer_no_preview')}
            </span>
          </div>
        )
      )}
      {status === 'loading' && (
        <FooterHint text={t('biosphere.detail.viewer_loading')} color="#334455" />
      )}
      {status === 'failed' && fallbackImageUrl && (
        <FooterHint text={t('biosphere.detail.viewer_unavailable')} color="#8899aa" />
      )}
      {/* Only claim "portrait shown" when one actually is — otherwise the
          viewer_no_preview placeholder above already explains the empty state. */}
      {status === 'idle' && fallbackImageUrl && (
        <FooterHint text={t('biosphere.detail.viewer_no_asset')} color="#8899aa" />
      )}
      {status === 'ready' && (
        <FooterHint
          text={isBundledFallback ? t('biosphere.detail.viewer_default_model') : t('biosphere.detail.viewer_hint')}
          color="#334455"
        />
      )}
    </div>
  );
}

function FooterHint({ text, color }: { text: string; color: string }) {
  return (
    <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
      <span style={{ color, fontSize: 9 }}>{text}</span>
    </div>
  );
}

export default CreatureDetailModal;
