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
  canCreateLifeform,
} from '@nebulife/core';
import type { DiscoveryRarity, LifeformIngredientId } from '@nebulife/core';
import { createLifeform, type LifeformRecord } from '../../api/lifeform-api.js';

const RARITIES: DiscoveryRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const TEXT = '#aabbcc';
const TEXT_MUTED = '#667788';
const BORDER = '#334455';

interface GenesisLabModalProps {
  playerId: string;
  quarks: number;
  ingredients: Record<string, number>;
  systemId?: string;
  planetId?: string;
  onQuarksChange: (q: number) => void;
  onIngredientsChange: (next: Record<string, number>) => void;
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
  systemId,
  planetId,
  onQuarksChange,
  onIngredientsChange,
  onCreated,
  onClose,
}: GenesisLabModalProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'uk';

  const [rarity, setRarity] = useState<DiscoveryRarity>('common');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recipe = LIFEFORM_CREATE_RECIPE[rarity];
  const accent = RARITY_COLORS[rarity];

  const hasIngredients = useMemo(() => canCreateLifeform(ingredients, rarity), [ingredients, rarity]);
  const hasQuarks = quarks >= recipe.quarks;
  const canCreate = hasIngredients && hasQuarks && !busy;
  const totalIngredients = useMemo(
    () => LIFEFORM_INGREDIENT_IDS.reduce((sum, id) => sum + (ingredients[id] ?? 0), 0),
    [ingredients],
  );

  const handleCreate = async () => {
    if (!hasIngredients) { setError(t('lifeform.genesis_insufficient_ingredients')); return; }
    if (!hasQuarks) { setError(t('lifeform.genesis_insufficient_quarks')); return; }
    setError(null);
    setBusy(true);
    try {
      const { lifeform, quarksRemaining } = await createLifeform(playerId, rarity, { systemId, planetId });
      // Deduct ingredients locally on success.
      const nextInv = { ...ingredients };
      for (const [ing, need] of Object.entries(recipe.ingredients)) {
        nextInv[ing] = Math.max(0, (nextInv[ing] ?? 0) - (need ?? 0));
      }
      onIngredientsChange(nextInv);
      if (quarksRemaining !== null && quarksRemaining !== undefined) onQuarksChange(quarksRemaining);
      onCreated(lifeform);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lifeform.err_failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.backdrop}>
      <div style={{ ...styles.window, boxShadow: `0 0 40px rgba(0,0,0,0.6), 0 0 0 1px ${hexA(accent, 0.12)}` }}>
        <button onClick={onClose} style={styles.close}>✕</button>
        <div style={styles.title}>{t('lifeform.genesis_title')}</div>
        <div style={styles.subtitle}>{t('lifeform.genesis_subtitle')}</div>

        {/* Ingredient stock */}
        <div style={styles.sectionLabel}>{t('lifeform.genesis_ingredients')}</div>
        {totalIngredients === 0 ? (
          <div style={styles.empty}>{t('lifeform.genesis_none')}</div>
        ) : (
          <div style={styles.ingredientGrid}>
            {LIFEFORM_INGREDIENT_IDS.map((id) => (
              <div key={id} style={styles.ingredientCard}>
                <span style={styles.ingredientName}>{t(`lifeform.ingredient_${id}`)}</span>
                <span style={styles.ingredientCount}>{ingredients[id] ?? 0}</span>
              </div>
            ))}
          </div>
        )}

        {/* Rarity selector */}
        <div style={styles.sectionLabel}>{t('lifeform.genesis_select_rarity')}</div>
        <div style={styles.rarityRow}>
          {RARITIES.map((r) => {
            const c = RARITY_COLORS[r];
            const active = r === rarity;
            return (
              <button
                key={r}
                onClick={() => { setRarity(r); setError(null); }}
                style={{
                  ...styles.rarityChip,
                  color: active ? c : TEXT_MUTED,
                  borderColor: active ? c : BORDER,
                  background: active ? hexA(c, 0.12) : 'transparent',
                }}
              >
                {getRarityLabel(r, lang)}
              </button>
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
            <span style={{ color: hasQuarks ? TEXT : '#cc4444' }}>{recipe.quarks} ◈</span>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button
          onClick={handleCreate}
          disabled={!canCreate}
          style={{
            ...styles.createBtn,
            color: accent, borderColor: accent, background: hexA(accent, 0.12),
            opacity: canCreate ? 1 : 0.5, cursor: canCreate ? 'pointer' : 'not-allowed',
          }}
        >
          {busy ? t('lifeform.genesis_creating') : t('lifeform.genesis_create')}
        </button>
      </div>
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
    position: 'relative', width: 'min(94vw, 460px)', maxHeight: '90vh', overflowY: 'auto',
    background: 'rgba(10,15,25,0.97)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '26px 20px 22px',
  },
  close: {
    position: 'absolute', top: 8, right: 10, background: 'transparent', border: 'none',
    color: TEXT_MUTED, fontSize: 16, cursor: 'pointer',
  },
  title: { color: '#44ff88', fontSize: 16, fontWeight: 700, letterSpacing: 2, textAlign: 'center' },
  subtitle: { color: TEXT_MUTED, fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 14 },
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
  error: { color: '#ff8844', fontSize: 12, textAlign: 'center', marginTop: 10 },
  createBtn: {
    marginTop: 16, width: '100%', border: '1px solid', fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
    letterSpacing: 1, borderRadius: 3, padding: '12px 14px',
  },
};
