import React, { useState } from 'react';
import { useT } from '../../../i18n/index.js';
import type { TranslationKey } from '../../../i18n/index.js';
import type { AcademyProgress } from '../../../api/academy-api.js';
import { updatePreferences } from '../../../api/academy-api.js';

interface ProfileViewProps {
  progress: AcademyProgress | null;
  onRefresh: () => void;
}

const CATEGORIES: { id: string; nameKey: TranslationKey; total: number }[] = [
  { id: 'astro',     nameKey: 'academy.cat.astro',     total: 42 },
  { id: 'astrophys', nameKey: 'academy.cat.astrophys',  total: 35 },
  { id: 'plansci',   nameKey: 'academy.cat.plansci',    total: 38 },
  { id: 'astrobio',  nameKey: 'academy.cat.astrobio',   total: 22 },
  { id: 'spacetech', nameKey: 'academy.cat.spacetech',  total: 25 },
  { id: 'cosmo',     nameKey: 'academy.cat.cosmo',      total: 20 },
  { id: 'physfund',  nameKey: 'academy.cat.physfund',   total: 18 },
];

export function ProfileView({ progress, onRefresh }: ProfileViewProps) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    progress?.selected_topics ?? [],
  );
  const [difficulty, setDifficulty] = useState<'explorer' | 'scientist'>(
    (progress?.difficulty as 'explorer' | 'scientist') ?? 'explorer',
  );
  const [saving, setSaving] = useState(false);

  if (!progress) {
    return <div style={styles.empty}>{t('profile.not_found')}</div>;
  }

  const completed = progress.completed_lessons ?? {};
  const totalCompleted = Object.keys(completed).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePreferences(difficulty, selectedTopics);
      setEditing(false);
      onRefresh();
    } catch (err) {
      console.error('Save preferences error:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleTopic = (id: string) => {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{t('profile.title')}</h2>

      {/* Stats */}
      <div style={styles.statsRow}>
        <div style={styles.stat}>
          <div style={styles.statValue}>{totalCompleted}</div>
          <div style={styles.statLabel}>{t('profile.stat.lessons')}</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statValue}>{progress.total_quests_completed}</div>
          <div style={styles.statLabel}>{t('profile.stat.quests')}</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statValue}>
            {progress.total_quizzes_correct}/{progress.total_quizzes_answered}
          </div>
          <div style={styles.statLabel}>{t('profile.stat.quizzes')}</div>
        </div>
        <div style={styles.stat}>
          <div style={{ ...styles.statValue, color: '#44ff88' }}>
            {progress.quest_streak}
          </div>
          <div style={styles.statLabel}>{t('profile.stat.streak')}</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statValue}>{progress.longest_streak}</div>
          <div style={styles.statLabel}>{t('profile.stat.max_streak')}</div>
        </div>
      </div>

      {/* Category progress */}
      <h3 style={styles.sectionTitle}>{t('profile.section.categories')}</h3>
      <div style={styles.categoryList}>
        {CATEGORIES.map((cat) => {
          const catCompleted = Object.keys(completed).filter((id) =>
            id.startsWith(cat.id + '.'),
          ).length;
          const percent = Math.round((catCompleted / cat.total) * 100);

          return (
            <div key={cat.id} style={styles.categoryRow}>
              <span style={styles.categoryName}>{t(cat.nameKey)}</span>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${percent}%`,
                  }}
                />
              </div>
              <span style={styles.progressText}>
                {catCompleted}/{cat.total}
              </span>
            </div>
          );
        })}
      </div>

      {/* Settings */}
      <h3 style={styles.sectionTitle}>
        {t('profile.section.settings')}
        {!editing && (
          <button style={styles.editButton} onClick={() => setEditing(true)}>
            {t('profile.edit')}
          </button>
        )}
      </h3>

      {editing ? (
        <div style={styles.settingsEdit}>
          <div style={styles.difficultyRow}>
            <span style={styles.label}>{t('profile.difficulty')}</span>
            <button
              style={difficulty === 'explorer' ? styles.diffActive : styles.diffButton}
              onClick={() => setDifficulty('explorer')}
            >
              {t('profile.explorer')}
            </button>
            <button
              style={difficulty === 'scientist' ? styles.diffActive : styles.diffButton}
              onClick={() => setDifficulty('scientist')}
            >
              {t('profile.scientist')}
            </button>
          </div>

          <div style={styles.topicGrid}>
            <button
              style={selectedTopics.length === 0 ? styles.topicActive : styles.topicButton}
              onClick={() => setSelectedTopics([])}
            >
              {t('profile.all_topics')}
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                style={
                  selectedTopics.includes(cat.id)
                    ? styles.topicActive
                    : styles.topicButton
                }
                onClick={() => toggleTopic(cat.id)}
              >
                {t(cat.nameKey)}
              </button>
            ))}
          </div>

          <div style={styles.editActions}>
            <button style={styles.saveButton} onClick={handleSave} disabled={saving}>
              {saving ? t('profile.saving') : t('profile.save')}
            </button>
            <button style={styles.cancelButton} onClick={() => setEditing(false)}>
              {t('profile.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.settingsDisplay}>
          <div>
            <span style={styles.label}>{t('profile.difficulty')} </span>
            <span style={styles.value}>
              {progress.difficulty === 'explorer' ? t('profile.explorer') : t('profile.scientist')}
            </span>
          </div>
          <div>
            <span style={styles.label}>{t('profile.topics')} </span>
            <span style={styles.value}>
              {progress.selected_topics.length === 0
                ? t('profile.all_topics')
                : progress.selected_topics.join(', ')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 600 },
  empty: { color: '#667788', fontSize: 14, fontFamily: 'monospace', paddingTop: 40, textAlign: 'center' },
  title: { color: '#aabbcc', fontSize: 16, fontFamily: 'monospace', fontWeight: 'normal', marginBottom: 20 },
  statsRow: { display: 'flex', gap: 20, marginBottom: 28, flexWrap: 'wrap' },
  stat: { textAlign: 'center', minWidth: 60 },
  statValue: { color: '#aabbcc', fontSize: 20, fontFamily: 'monospace' },
  statLabel: { color: '#667788', fontSize: 10, fontFamily: 'monospace', marginTop: 2 },
  sectionTitle: {
    color: '#8899aa',
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: 'normal',
    marginBottom: 12,
    marginTop: 24,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  categoryList: { display: 'flex', flexDirection: 'column', gap: 8 },
  categoryRow: { display: 'flex', alignItems: 'center', gap: 12 },
  categoryName: { color: '#8899aa', fontSize: 12, fontFamily: 'monospace', minWidth: 150 },
  progressBar: {
    flex: 1,
    height: 6,
    background: 'rgba(51,68,85,0.4)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#4488aa',
    borderRadius: 3,
    transition: 'width 0.3s',
  },
  progressText: { color: '#667788', fontSize: 11, fontFamily: 'monospace', minWidth: 40, textAlign: 'right' },
  editButton: {
    background: 'transparent',
    border: '1px solid #334455',
    color: '#4488aa',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '3px 10px',
    cursor: 'pointer',
    borderRadius: 3,
  },
  settingsEdit: {},
  settingsDisplay: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { color: '#667788', fontSize: 12, fontFamily: 'monospace' },
  value: { color: '#aabbcc', fontSize: 12, fontFamily: 'monospace' },
  difficultyRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  diffButton: {
    background: 'transparent',
    border: '1px solid #334455',
    color: '#8899aa',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '6px 12px',
    cursor: 'pointer',
    borderRadius: 3,
  },
  diffActive: {
    background: 'rgba(68,136,170,0.15)',
    border: '1px solid #446688',
    color: '#aabbcc',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '6px 12px',
    cursor: 'pointer',
    borderRadius: 3,
  },
  topicGrid: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  topicButton: {
    background: 'transparent',
    border: '1px solid #334455',
    color: '#8899aa',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '6px 10px',
    cursor: 'pointer',
    borderRadius: 3,
  },
  topicActive: {
    background: 'rgba(68,136,170,0.15)',
    border: '1px solid #446688',
    color: '#aabbcc',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '6px 10px',
    cursor: 'pointer',
    borderRadius: 3,
  },
  editActions: { display: 'flex', gap: 8 },
  saveButton: {
    background: 'rgba(68,255,136,0.1)',
    border: '1px solid rgba(68,255,136,0.3)',
    color: '#44ff88',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: '8px 16px',
    cursor: 'pointer',
    borderRadius: 3,
  },
  cancelButton: {
    background: 'transparent',
    border: '1px solid #334455',
    color: '#8899aa',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: '8px 16px',
    cursor: 'pointer',
    borderRadius: 3,
  },
};
