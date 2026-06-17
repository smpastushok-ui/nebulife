// ---------------------------------------------------------------------------
// GenesisLabModal — Phase 2 lifeform synthesis (Ковчег Генезису, L48)
// ---------------------------------------------------------------------------
// Full-screen overlay launched from the Genesis Vault. Shows organic
// ingredient stock, a rarity (target complexity) selector with recipe + quark
// cost, and a synthesize button. On success it deducts ingredients locally,
// deducts quarks server-side, and hands the created lifeform to the reveal
// flow (same paid Alpha-photo/video pipeline as found lifeforms).
// ---------------------------------------------------------------------------

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RARITY_COLORS,
  getRarityLabel,
  LIFEFORM_CREATE_RECIPE,
  LIFEFORM_INGREDIENT_IDS,
  LIFE_SPARK_TYPES,
  GENESIS_COMPLEXITY_RECIPE,
  canCreateLifeform,
  synthesizeGenesisGenome,
} from '@nebulife/core';
import type { DiscoveryRarity, GenesisGenome, LifeComplexityTier, LifeformIngredientId, LifeSparkType } from '@nebulife/core';
import { createLifeform, type LifeformRecord } from '../../api/lifeform-api.js';

const COMPLEXITIES: LifeComplexityTier[] = ['microbial', 'flora', 'fauna', 'exotic'];
const DEFAULT_ELEMENTS = ['C', 'H', 'O', 'N', 'P', 'S', 'Si', 'Fe', 'Cu', 'Ti', 'He', 'Cl'];
const TEXT = '#aabbcc';
const TEXT_MUTED = '#667788';
const BORDER = '#334455';

interface GenesisLabModalProps {
  playerId: string;
  quarks: number;
  ingredients: Record<string, number>;
  elements: Record<string, number>;
  sparks: Record<string, number>;
  systemId?: string;
  planetId?: string;
  planetSeed: number;
  planetRevealLevel: number;
  onQuarksChange: (q: number) => void;
  onIngredientsChange: (next: Record<string, number>) => void;
  onElementsChange: (next: Record<string, number>) => void;
  onSparksChange: (next: Record<string, number>) => void;
  /** Created lifeform → open the reveal/paid-media flow. */
  onCreated: (lf: LifeformRecord) => void;
  onClose: () => void;
}

function hexA(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function GenesisLabModal({
  playerId,
  quarks,
  ingredients,
  elements,
  sparks,
  systemId,
  planetId,
  planetSeed,
  planetRevealLevel,
  onQuarksChange,
  onIngredientsChange,
  onElementsChange,
  onSparksChange,
  onCreated,
  onClose,
}: GenesisLabModalProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'uk';

  const [complexity, setComplexity] = useState<LifeComplexityTier>('microbial');
  const [selectedElements, setSelectedElements] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const symbol of DEFAULT_ELEMENTS) {
      if ((elements[symbol] ?? 0) > 0 && Object.keys(initial).length < 4) initial[symbol] = 1;
    }
    return initial;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<'idle' | 'charging' | 'sequencing' | 'birthing'>('idle');

  const genome = useMemo(() => synthesizeGenesisGenome({
    elements: selectedElements,
    sparks,
    complexity,
    planetSeed,
    labLevel: 1,
    vaultLevel: 1,
  }), [complexity, planetSeed, selectedElements, sparks]);
  const rarity = genome.rarity;
  const recipe = LIFEFORM_CREATE_RECIPE[rarity];
  const sparkRecipe = GENESIS_COMPLEXITY_RECIPE[complexity];
  const accent = RARITY_COLORS[rarity];

  const hasIngredients = useMemo(() => canCreateLifeform(ingredients, rarity), [ingredients, rarity]);
  const hasElements = useMemo(() => Object.entries(selectedElements).length >= 2 && Object.entries(selectedElements).every(([el, amount]) => (elements[el] ?? 0) >= amount), [elements, selectedElements]);
  const hasSparks = useMemo(() => Object.entries(sparkRecipe.sparks).every(([spark, amount]) => (sparks[spark] ?? 0) >= (amount ?? 0)), [sparkRecipe, sparks]);
  const planetGateOk = planetRevealLevel >= sparkRecipe.minPlanetRevealLevel;
  const hasQuarks = quarks >= recipe.quarks;
  const canCreate = hasIngredients && hasElements && hasSparks && planetGateOk && hasQuarks && !busy;
  const totalIngredients = useMemo(
    () => LIFEFORM_INGREDIENT_IDS.reduce((sum, id) => sum + (ingredients[id] ?? 0), 0),
    [ingredients],
  );
  const elementOptions = useMemo(() => {
    const owned = Object.entries(elements)
      .filter(([, amount]) => amount > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([symbol]) => symbol);
    return Array.from(new Set([...owned, ...DEFAULT_ELEMENTS])).slice(0, 16);
  }, [elements]);

  const adjustElement = (symbol: string, delta: number) => {
    setSelectedElements((prev) => {
      const nextAmount = Math.max(0, Math.min(elements[symbol] ?? 0, (prev[symbol] ?? 0) + delta));
      const next = { ...prev };
      if (nextAmount <= 0) delete next[symbol];
      else next[symbol] = nextAmount;
      return next;
    });
    setError(null);
  };

  const handleCreate = async () => {
    if (!hasIngredients) { setError(t('lifeform.genesis_insufficient_ingredients')); return; }
    if (!hasSparks) { setError(t('lifeform.genesis_insufficient_sparks')); return; }
    if (!hasElements) { setError(t('lifeform.genesis_insufficient_elements')); return; }
    if (!planetGateOk) { setError(t('lifeform.genesis_planet_gate')); return; }
    if (!hasQuarks) { setError(t('lifeform.genesis_insufficient_quarks')); return; }
    setError(null);
    setBusy(true);
    setStage('charging');
    try {
      window.setTimeout(() => setStage('sequencing'), 450);
      window.setTimeout(() => setStage('birthing'), 1100);
      const { lifeform, quarksRemaining, synthesisFailed } = await createLifeform(playerId, rarity, {
        systemId,
        planetId,
        planetSeed,
        complexity,
        elements: selectedElements,
        sparks: sparkRecipe.sparks,
        genome,
      });
      // Deduct ingredients locally on success.
      const nextInv = { ...ingredients };
      for (const [ing, need] of Object.entries(recipe.ingredients)) {
        nextInv[ing] = Math.max(0, (nextInv[ing] ?? 0) - (need ?? 0));
      }
      onIngredientsChange(nextInv);
      const nextElements = { ...elements };
      for (const [el, amount] of Object.entries(selectedElements)) {
        nextElements[el] = Math.max(0, (nextElements[el] ?? 0) - amount);
      }
      onElementsChange(nextElements);
      const nextSparks = { ...sparks };
      for (const [spark, amount] of Object.entries(sparkRecipe.sparks)) {
        nextSparks[spark] = Math.max(0, (nextSparks[spark] ?? 0) - (amount ?? 0));
      }
      onSparksChange(nextSparks);
      if (quarksRemaining !== null && quarksRemaining !== undefined) onQuarksChange(quarksRemaining);
      if (synthesisFailed || !lifeform) {
        setError(t('lifeform.genesis_failed_roll'));
        return;
      }
      onCreated(lifeform);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lifeform.err_failed'));
    } finally {
      setBusy(false);
      setStage('idle');
    }
  };

  return (
    <div style={styles.backdrop}>
      <style>{GENESIS_CSS}</style>
      <div style={{ ...styles.window, boxShadow: `0 0 40px rgba(0,0,0,0.6), 0 0 0 1px ${hexA(accent, 0.12)}` }}>
        <button onClick={onClose} style={styles.close}>x</button>
        <div style={styles.title}>{t('lifeform.genesis_title')}</div>
        <div style={styles.subtitle}>{t('lifeform.genesis_subtitle')}</div>

        <div style={styles.topAction}>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            style={{
              ...styles.createBtn,
              color: accent, borderColor: accent, background: hexA(accent, 0.12),
              opacity: canCreate ? 1 : 0.5, cursor: canCreate ? 'pointer' : 'not-allowed',
            }}
          >
            {busy ? t(`lifeform.genesis_stage_${stage}`) : t('lifeform.genesis_create')}
          </button>
          {error && <div style={styles.error}>{error}</div>}
        </div>

        <div style={styles.hero}>
          <GenesisPreview genome={genome} stage={stage} />
          <div style={styles.heroPanel}>
            <div style={{ ...styles.species, color: accent }}>{genome.speciesName}</div>
            <div style={styles.metricRow}>
              <span>{t('lifeform.genesis_predicted_rarity')}</span>
              <b style={{ color: accent }}>{getRarityLabel(rarity, lang)}</b>
            </div>
            <div style={styles.metricRow}>
              <span>{t('lifeform.genesis_success')}</span>
              <b style={{ color: genome.successChance >= 0.55 ? '#44ff88' : '#ff8844' }}>{Math.round(genome.successChance * 100)}%</b>
            </div>
            <div style={styles.metricRow}>
              <span>{t('lifeform.genesis_duration')}</span>
              <b>{formatDuration(genome.durationMinutes)}</b>
            </div>
            <div style={styles.traits}>
              {genome.traits.slice(0, 5).map((trait) => <span key={trait} style={styles.traitChip}>{trait}</span>)}
            </div>
          </div>
        </div>

        <div style={styles.sectionLabel}>{t('lifeform.genesis_complexity')}</div>
        <div style={styles.rarityRow}>
          {COMPLEXITIES.map((cplx) => {
            const active = cplx === complexity;
            return (
              <button
                key={cplx}
                onClick={() => { setComplexity(cplx); setError(null); }}
                style={{
                  ...styles.rarityChip,
                  color: active ? '#44ff88' : TEXT_MUTED,
                  borderColor: active ? '#44ff88' : BORDER,
                  background: active ? 'rgba(68,255,136,0.1)' : 'transparent',
                }}
              >
                {t(`lifeform.complexity_${cplx}`)}
              </button>
            );
          })}
        </div>

        <div style={styles.sectionLabel}>{t('lifeform.genesis_elements')}</div>
        <div style={styles.elementGrid}>
          {elementOptions.map((symbol) => {
            const have = elements[symbol] ?? 0;
            const selected = selectedElements[symbol] ?? 0;
            return (
              <div key={symbol} style={{ ...styles.elementChip, borderColor: selected > 0 ? accent : BORDER }}>
                <button disabled={selected <= 0 || busy} onClick={() => adjustElement(symbol, -1)} style={styles.smallBtn}>-</button>
                <div>
                  <div style={{ color: selected > 0 ? accent : TEXT }}>{symbol}</div>
                  <div style={styles.elementCount}>{selected} / {formatAmount(have)}</div>
                </div>
                <button disabled={have <= selected || busy} onClick={() => adjustElement(symbol, 1)} style={styles.smallBtn}>+</button>
              </div>
            );
          })}
        </div>

        <div style={styles.sectionLabel}>{t('lifeform.genesis_sparks')}</div>
        <div style={styles.ingredientGrid}>
          {LIFE_SPARK_TYPES.map((spark) => {
            const need = sparkRecipe.sparks[spark] ?? 0;
            const have = sparks[spark] ?? 0;
            return (
              <div key={spark} style={styles.ingredientCard}>
                <span style={styles.ingredientName}>{t(`lifeform.spark_${spark}`)}</span>
                <span style={{ ...styles.ingredientCount, color: have >= need ? '#9fd0ff' : '#cc4444' }}>{have} / {need}</span>
              </div>
            );
          })}
        </div>

        {/* Recipe */}
        <div style={styles.recipeBox}>
          <div style={styles.recipeHead}>{t('lifeform.genesis_recipe')}</div>
          {Object.entries(recipe.ingredients).map(([ing, need]) => {
            const have = ingredients[ing] ?? 0;
            const ok = have >= (need ?? 0);
            return (
              <div key={ing} style={styles.recipeRow}>
                <span style={{ color: TEXT_MUTED }}>{t(`lifeform.ingredient_${ing as LifeformIngredientId}`)}</span>
                <span style={{ color: ok ? '#44ff88' : '#cc4444' }}>{have} / {need}</span>
              </div>
            );
          })}
          <div style={styles.recipeRow}>
            <span style={{ color: TEXT_MUTED }}>{t('lifeform.genesis_cost_quarks')}</span>
            <span style={{ color: hasQuarks ? TEXT : '#cc4444' }}>{recipe.quarks}</span>
          </div>
          <div style={styles.recipeRow}>
            <span style={{ color: TEXT_MUTED }}>{t('lifeform.genesis_planet_research')}</span>
            <span style={{ color: planetGateOk ? '#44ff88' : '#cc4444' }}>{planetRevealLevel} / {sparkRecipe.minPlanetRevealLevel}</span>
          </div>
        </div>

      </div>
    </div>
  );
}

/** Compact resource amount — kills floating-point tails like 1163.5799999999992. */
function formatAmount(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function GenesisPreview({ genome, stage }: { genome: GenesisGenome; stage: 'idle' | 'charging' | 'sequencing' | 'birthing' }) {
  const v = genome.visual;
  const active = stage !== 'idle';
  const tendrils = Array.from({ length: Math.min(12, v.tendrils) });
  const nodes = Array.from({ length: Math.min(14, v.nodes) });
  return (
    <div className={`genesis-preview ${active ? 'is-active' : ''}`}>
      <div className="ark-ring" />
      <svg viewBox="0 0 220 220" width="100%" height="100%" role="img" aria-label={genome.speciesName}>
        <defs>
          <radialGradient id="genesisBody" cx="50%" cy="42%" r="58%">
            <stop offset="0%" stopColor={v.glowColor} stopOpacity="0.9" />
            <stop offset="42%" stopColor={v.accentColor} stopOpacity="0.55" />
            <stop offset="100%" stopColor={v.primaryColor} stopOpacity="0.92" />
          </radialGradient>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="110" cy="110" r="80" fill="none" stroke={v.glowColor} strokeOpacity="0.16" strokeWidth="1" />
        {tendrils.map((_, i) => {
          const a = (i / tendrils.length) * Math.PI * 2;
          const x1 = 110 + Math.cos(a) * 38;
          const y1 = 110 + Math.sin(a) * 28;
          const x2 = 110 + Math.cos(a) * (68 + (i % 3) * 8);
          const y2 = 110 + Math.sin(a) * (54 + (i % 2) * 10);
          return <path key={i} d={`M${x1} ${y1} Q${(x1 + x2) / 2} ${y1 - 16 + (i % 4) * 8}, ${x2} ${y2}`} stroke={v.accentColor} strokeOpacity="0.55" strokeWidth="2" fill="none" />;
        })}
        <ellipse cx="110" cy="112" rx={genome.complexity === 'microbial' ? 40 : 50} ry={genome.complexity === 'exotic' ? 58 : 38} fill="url(#genesisBody)" filter="url(#softGlow)" />
        {Array.from({ length: Math.min(10, v.plates) }).map((_, i) => (
          <path key={i} d={`M${82 + i * 6} ${78 + (i % 2) * 8} L${92 + i * 5} ${66 + (i % 3) * 7} L${102 + i * 4} ${86 + (i % 2) * 6} Z`} fill={v.primaryColor} stroke={v.glowColor} strokeOpacity="0.45" />
        ))}
        {nodes.map((_, i) => {
          const a = (i / nodes.length) * Math.PI * 2;
          return <circle key={i} cx={110 + Math.cos(a) * 26} cy={112 + Math.sin(a) * 20} r={2 + (i % 3)} fill={v.glowColor} opacity="0.82" />;
        })}
      </svg>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at center, rgba(4,10,22,0.85) 0%, rgba(2,5,16,0.96) 100%)',
    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', padding: 16, fontFamily: 'monospace',
  },
  window: {
    position: 'relative', width: 'min(96vw, 720px)', maxHeight: '92vh', overflowY: 'auto',
    background: 'rgba(10,15,25,0.97)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '26px 20px 22px',
  },
  close: {
    position: 'absolute', top: 8, right: 10, background: 'transparent', border: 'none',
    color: TEXT_MUTED, fontSize: 16, cursor: 'pointer',
  },
  title: { color: '#44ff88', fontSize: 16, fontWeight: 700, letterSpacing: 2, textAlign: 'center' },
  subtitle: { color: TEXT_MUTED, fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 14 },
  hero: { display: 'grid', gridTemplateColumns: 'minmax(180px, 260px) 1fr', gap: 14, alignItems: 'center' },
  heroPanel: { border: `1px solid ${BORDER}`, borderRadius: 6, background: 'rgba(0,0,0,0.28)', padding: 12 },
  species: { fontSize: 15, fontWeight: 700, letterSpacing: 1, marginBottom: 8 },
  metricRow: { display: 'flex', justifyContent: 'space-between', gap: 12, color: TEXT_MUTED, fontSize: 12, marginTop: 6 },
  traits: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  traitChip: { fontSize: 9, color: '#9fb3c8', border: `1px solid ${BORDER}`, borderRadius: 3, padding: '2px 6px', background: 'rgba(120,150,190,0.08)', letterSpacing: 0.5, textTransform: 'uppercase' },
  sectionLabel: { color: TEXT_MUTED, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginTop: 14, marginBottom: 8 },
  empty: {
    color: TEXT_MUTED, fontSize: 12, lineHeight: 1.5, textAlign: 'center',
    background: 'rgba(0,0,0,0.25)', border: `1px solid ${BORDER}`, borderRadius: 4, padding: 12,
  },
  ingredientGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  ingredientCard: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: 'rgba(0,0,0,0.3)', border: `1px solid ${BORDER}`, borderRadius: 4, padding: '8px 10px',
  },
  ingredientName: { color: TEXT, fontSize: 11 },
  ingredientCount: { color: '#9fd0ff', fontSize: 13, fontWeight: 700 },
  elementGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))', gap: 7 },
  elementChip: { display: 'grid', gridTemplateColumns: '24px 1fr 24px', alignItems: 'center', gap: 6, border: '1px solid', borderRadius: 4, background: 'rgba(0,0,0,0.28)', padding: 6, textAlign: 'center' },
  elementCount: { color: TEXT_MUTED, fontSize: 10, marginTop: 2 },
  smallBtn: { width: 22, height: 22, border: `1px solid ${BORDER}`, background: 'rgba(5,10,20,0.9)', color: TEXT, borderRadius: 3, fontFamily: 'monospace', cursor: 'pointer' },
  rarityRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  rarityChip: {
    fontFamily: 'monospace', fontSize: 11, letterSpacing: 1, border: '1px solid',
    borderRadius: 3, padding: '6px 10px', cursor: 'pointer',
  },
  recipeBox: {
    marginTop: 14, background: 'rgba(0,0,0,0.3)', border: `1px solid ${BORDER}`, borderRadius: 4, padding: '10px 12px',
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  recipeHead: { color: TEXT_MUTED, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 },
  recipeRow: { display: 'flex', justifyContent: 'space-between', fontSize: 12 },
  error: { color: '#ff8844', fontSize: 12, textAlign: 'center', marginTop: 0 },
  topAction: {
    position: 'sticky', top: 0, zIndex: 5,
    background: 'rgba(10,15,25,0.97)',
    paddingTop: 4, paddingBottom: 10, marginBottom: 6,
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  createBtn: {
    marginTop: 0, width: '100%', border: '1px solid', fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
    letterSpacing: 1, borderRadius: 3, padding: '12px 14px',
  },
};

const GENESIS_CSS = `
  .genesis-preview {
    position: relative;
    height: 230px;
    border: 1px solid #334455;
    border-radius: 8px;
    background:
      radial-gradient(circle at 50% 44%, rgba(68,255,136,0.16), transparent 33%),
      radial-gradient(circle at 20% 70%, rgba(68,136,170,0.14), transparent 28%),
      rgba(2,5,16,0.76);
    overflow: hidden;
  }
  .genesis-preview svg {
    position: relative;
    z-index: 2;
    animation: genesisFloat 5s ease-in-out infinite;
  }
  .genesis-preview.is-active svg {
    animation: genesisBirth 1.4s ease-in-out infinite;
  }
  .ark-ring {
    position: absolute;
    inset: 22px;
    border: 1px solid rgba(68,255,136,0.22);
    border-radius: 50%;
    animation: genesisRing 8s linear infinite;
  }
  .ark-ring::after {
    content: "";
    position: absolute;
    inset: 28px;
    border: 1px dashed rgba(123,184,255,0.28);
    border-radius: 50%;
  }
  .genesis-preview.is-active .ark-ring {
    animation-duration: 1.6s;
    box-shadow: 0 0 40px rgba(68,255,136,0.22);
  }
  @keyframes genesisFloat {
    0%, 100% { transform: translateY(2px) scale(0.98); opacity: 0.92; }
    50% { transform: translateY(-5px) scale(1.02); opacity: 1; }
  }
  @keyframes genesisBirth {
    0%, 100% { transform: scale(0.96) rotate(-1deg); filter: brightness(1); }
    50% { transform: scale(1.06) rotate(1deg); filter: brightness(1.5); }
  }
  @keyframes genesisRing {
    from { transform: rotate(0deg) scale(0.95); }
    to { transform: rotate(360deg) scale(1.02); }
  }
  @media (max-width: 640px) {
    .genesis-preview { height: 190px; }
  }
`;
