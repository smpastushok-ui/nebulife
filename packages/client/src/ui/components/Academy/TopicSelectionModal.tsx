import React, { useState } from 'react';
import { academyOnboard } from '../../../api/academy-api.js';

interface TopicSelectionModalProps {
  onComplete: () => void;
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'astro', name: 'Астрономія', count: 42 },
  { id: 'astrophys', name: 'Астрофізика', count: 35 },
  { id: 'plansci', name: 'Планетологія', count: 38 },
  { id: 'astrobio', name: 'Астробіологія', count: 22 },
  { id: 'spacetech', name: 'Космічні технології', count: 25 },
  { id: 'cosmo', name: 'Космологія', count: 20 },
  { id: 'physfund', name: 'Основи фізики', count: 18 },
];

export function TopicSelectionModal({ onComplete, onClose }: TopicSelectionModalProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<'explorer' | 'scientist'>('explorer');
  const [saving, setSaving] = useState(false);

  const allSelected = selected.length === 0;

  const toggleTopic = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleStart = async () => {
    setSaving(true);
    try {
      const ok = await academyOnboard(difficulty, selected);
      if (ok) onComplete();
    } catch (err) {
      console.error('Onboard error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Космічна Академія</h2>
        <p style={styles.subtitle}>
          Оберіть теми для щоденного навчання
        </p>

        {/* All topics toggle */}
        <button
          style={allSelected ? styles.allActive : styles.allButton}
          onClick={() => setSelected([])}
        >
          Усі теми (200 уроків)
        </button>

        {/* Category grid */}
        <div style={styles.grid}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              style={
                selected.includes(cat.id)
                  ? styles.catActive
                  : styles.catButton
              }
              onClick={() => toggleTopic(cat.id)}
            >
              <div style={styles.catName}>{cat.name}</div>
              <div style={styles.catCount}>{cat.count} уроків</div>
            </button>
          ))}
        </div>

        {/* Difficulty */}
        <div style={styles.diffSection}>
          <span style={styles.label}>Складність:</span>
          <div style={styles.diffRow}>
            <button
              style={difficulty === 'explorer' ? styles.diffActive : styles.diffButton}
              onClick={() => setDifficulty('explorer')}
            >
              <div style={styles.diffName}>Дослідник</div>
              <div style={styles.diffDesc}>Простіша мова, аналогії</div>
            </button>
            <button
              style={difficulty === 'scientist' ? styles.diffActive : styles.diffButton}
              onClick={() => setDifficulty('scientist')}
            >
              <div style={styles.diffName}>Науковець</div>
              <div style={styles.diffDesc}>Формули, технічні деталі</div>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button style={styles.startButton} onClick={handleStart} disabled={saving}>
            {saving ? 'Зберігаю...' : 'Почати навчання'}
          </button>
          <button style={styles.skipButton} onClick={onClose}>
            Пізніше
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(2,5,16,0.92)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9700,
    fontFamily: 'monospace',
  },
  modal: {
    background: 'rgba(10,15,25,0.95)',
    border: '1px solid #334455',
    borderRadius: 6,
    padding: '28px 32px',
    maxWidth: 480,
    width: '90%',
    maxHeight: '85vh',
    overflow: 'auto',
  },
  title: { color: '#aabbcc', fontSize: 18, fontFamily: 'monospace', fontWeight: 'normal', margin: '0 0 8px 0', textAlign: 'center' },
  subtitle: { color: '#667788', fontSize: 12, fontFamily: 'monospace', textAlign: 'center', marginBottom: 20 },
  allButton: {
    width: '100%',
    background: 'transparent',
    border: '1px solid #334455',
    color: '#8899aa',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: '10px',
    cursor: 'pointer',
    borderRadius: 4,
    marginBottom: 12,
  },
  allActive: {
    width: '100%',
    background: 'rgba(68,136,170,0.15)',
    border: '1px solid #446688',
    color: '#aabbcc',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: '10px',
    cursor: 'pointer',
    borderRadius: 4,
    marginBottom: 12,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    marginBottom: 20,
  },
  catButton: {
    background: 'transparent',
    border: '1px solid #334455',
    color: '#8899aa',
    fontFamily: 'monospace',
    padding: '12px 10px',
    cursor: 'pointer',
    borderRadius: 4,
    textAlign: 'left',
  },
  catActive: {
    background: 'rgba(68,136,170,0.15)',
    border: '1px solid #446688',
    color: '#aabbcc',
    fontFamily: 'monospace',
    padding: '12px 10px',
    cursor: 'pointer',
    borderRadius: 4,
    textAlign: 'left',
  },
  catName: { fontSize: 12, marginBottom: 2 },
  catCount: { fontSize: 10, color: '#667788' },
  diffSection: { marginBottom: 20 },
  label: { color: '#667788', fontSize: 12, fontFamily: 'monospace', display: 'block', marginBottom: 8 },
  diffRow: { display: 'flex', gap: 8 },
  diffButton: {
    flex: 1,
    background: 'transparent',
    border: '1px solid #334455',
    color: '#8899aa',
    fontFamily: 'monospace',
    padding: '10px',
    cursor: 'pointer',
    borderRadius: 4,
    textAlign: 'left',
  },
  diffActive: {
    flex: 1,
    background: 'rgba(68,136,170,0.15)',
    border: '1px solid #446688',
    color: '#aabbcc',
    fontFamily: 'monospace',
    padding: '10px',
    cursor: 'pointer',
    borderRadius: 4,
    textAlign: 'left',
  },
  diffName: { fontSize: 12, marginBottom: 2 },
  diffDesc: { fontSize: 10, color: '#667788' },
  actions: { display: 'flex', gap: 8, justifyContent: 'center' },
  startButton: {
    background: 'rgba(68,255,136,0.1)',
    border: '1px solid rgba(68,255,136,0.3)',
    color: '#44ff88',
    fontFamily: 'monospace',
    fontSize: 13,
    padding: '10px 24px',
    cursor: 'pointer',
    borderRadius: 4,
  },
  skipButton: {
    background: 'transparent',
    border: '1px solid #334455',
    color: '#667788',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: '10px 16px',
    cursor: 'pointer',
    borderRadius: 4,
  },
};
