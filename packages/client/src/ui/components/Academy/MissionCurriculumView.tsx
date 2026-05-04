import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { playSfx } from '../../../audio/SfxPlayer.js';
import { MISSION_CURRICULUM, type MissionCurriculumChapter } from './missionCurriculum.js';

const STORAGE_KEY = 'nebulife_mission_curriculum_done';

function readCompleted(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

function saveCompleted(ids: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Local progress is optional; the curriculum remains usable without it.
  }
}

interface MissionCurriculumViewProps {
  focusChapterId?: MissionCurriculumChapter['id'];
}

export function MissionCurriculumView({ focusChapterId }: MissionCurriculumViewProps) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<MissionCurriculumChapter['id']>(focusChapterId ?? MISSION_CURRICULUM[0]?.id ?? 'surface');
  const [completed, setCompleted] = useState<Set<string>>(() => readCompleted());

  const selected = useMemo(
    () => MISSION_CURRICULUM.find((chapter) => chapter.id === selectedId) ?? MISSION_CURRICULUM[0],
    [selectedId],
  );

  const completedCount = completed.size;
  const selectedIndex = MISSION_CURRICULUM.findIndex((chapter) => chapter.id === selected.id);
  const nextChapter = MISSION_CURRICULUM[selectedIndex + 1] ?? null;

  const handleSelect = (chapter: MissionCurriculumChapter) => {
    playSfx('ui-click', 0.07);
    setSelectedId(chapter.id);
  };

  const handleUnderstood = () => {
    playSfx('ui-click', 0.07);
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(selected.id);
      saveCompleted(next);
      return next;
    });
    if (nextChapter) setSelectedId(nextChapter.id);
  };

  return (
    <div style={styles.container}>
      <section style={styles.hero}>
        <div style={styles.eyebrow}>{t('academy.mission.eyebrow')}</div>
        <h2 style={styles.title}>{t('academy.mission.title')}</h2>
        <p style={styles.intro}>{t('academy.mission.intro')}</p>
        <div style={styles.progressLine}>
          {t('academy.mission.progress', { done: completedCount, total: MISSION_CURRICULUM.length })}
        </div>
      </section>

      <div style={styles.layout}>
        <nav style={styles.chapterList} aria-label={t('academy.mission.chapter_nav')}>
          {MISSION_CURRICULUM.map((chapter) => {
            const active = chapter.id === selected.id;
            const done = completed.has(chapter.id);
            return (
              <button
                key={chapter.id}
                type="button"
                onClick={() => handleSelect(chapter)}
                style={{
                  ...styles.chapterCard,
                  ...(active ? styles.chapterCardActive : {}),
                }}
              >
                <span style={styles.chapterNumber}>{String(chapter.index).padStart(2, '0')}</span>
                <span style={styles.chapterCopy}>
                  <span style={styles.chapterTitle}>{t(chapter.titleKey)}</span>
                  <span style={styles.chapterSummary}>{t(chapter.summaryKey)}</span>
                </span>
                <span style={{ ...styles.statusDot, ...(done ? styles.statusDone : {}) }}>
                  {done ? t('academy.mission.done_short') : ''}
                </span>
              </button>
            );
          })}
        </nav>

        <article style={styles.reader}>
          <div style={styles.readerHeader}>
            <span style={styles.readerIndex}>
              {t('academy.mission.chapter_label', { index: selected.index })}
            </span>
            {completed.has(selected.id) && (
              <span style={styles.completedBadge}>{t('academy.mission.completed')}</span>
            )}
          </div>

          <h3 style={styles.readerTitle}>{t(selected.titleKey)}</h3>
          <div style={styles.readerBody}>
            {selected.bodyKeys.map((key) => (
              <p key={key} style={styles.paragraph}>{t(key)}</p>
            ))}
          </div>

          <section style={styles.meaningPanel}>
            <div style={styles.panelTitle}>{t('academy.mission.meaning_title')}</div>
            {selected.meaningKeys.map((key) => (
              <div key={key} style={styles.meaningItem}>
                <span style={styles.meaningMark} />
                <span>{t(key)}</span>
              </div>
            ))}
          </section>

          <section style={styles.actionPanel}>
            <div style={styles.panelTitle}>{t('academy.mission.try_next')}</div>
            <div style={styles.actionText}>{t(selected.actionKey)}</div>
          </section>

          <div style={styles.actions}>
            <button
              type="button"
              style={styles.primaryButton}
              onClick={handleUnderstood}
            >
              {nextChapter ? t('academy.mission.understood_next') : t('academy.mission.understood_done')}
            </button>
            {nextChapter && (
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => handleSelect(nextChapter)}
              >
                {t('academy.mission.next_chapter')}
              </button>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 1040,
    margin: '0 auto',
    fontFamily: 'monospace',
  },
  hero: {
    border: '1px solid rgba(68, 102, 136, 0.45)',
    borderRadius: 6,
    padding: '18px 20px',
    marginBottom: 18,
    background: 'linear-gradient(135deg, rgba(10,18,32,0.82), rgba(5,10,20,0.68))',
  },
  eyebrow: {
    color: '#7bb8ff',
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: '#cdd9e8',
    fontSize: 'clamp(18px, 3.6vw, 26px)',
    fontWeight: 'normal',
    margin: '0 0 10px',
    letterSpacing: 0.4,
  },
  intro: {
    color: '#aabbcc',
    fontSize: 13,
    lineHeight: 1.7,
    margin: '0 0 12px',
    maxWidth: 760,
  },
  progressLine: {
    color: '#667788',
    fontSize: 11,
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
    gap: 16,
  },
  chapterList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minWidth: 0,
  },
  chapterCard: {
    width: '100%',
    display: 'grid',
    gridTemplateColumns: '34px minmax(0, 1fr) 28px',
    alignItems: 'center',
    gap: 10,
    padding: '12px 12px',
    background: 'rgba(10, 18, 32, 0.52)',
    border: '1px solid rgba(51, 68, 85, 0.62)',
    borderRadius: 5,
    color: '#8899aa',
    cursor: 'pointer',
    fontFamily: 'monospace',
    textAlign: 'left',
  },
  chapterCardActive: {
    background: 'rgba(68, 136, 170, 0.14)',
    borderColor: 'rgba(123, 184, 255, 0.48)',
    color: '#cdd9e8',
  },
  chapterNumber: {
    color: '#4488aa',
    fontSize: 11,
    letterSpacing: 1,
  },
  chapterCopy: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
  },
  chapterTitle: {
    color: 'inherit',
    fontSize: 12,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  chapterSummary: {
    color: '#667788',
    fontSize: 10,
    lineHeight: 1.35,
  },
  statusDot: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    border: '1px solid rgba(68, 102, 136, 0.45)',
    color: '#44ff88',
    fontSize: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDone: {
    borderColor: 'rgba(68, 255, 136, 0.42)',
    background: 'rgba(68, 255, 136, 0.08)',
  },
  reader: {
    minWidth: 0,
    border: '1px solid rgba(51, 68, 85, 0.62)',
    borderRadius: 6,
    padding: '18px 20px',
    background: 'rgba(5, 10, 20, 0.58)',
  },
  readerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  readerIndex: {
    color: '#667788',
    fontSize: 10,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  completedBadge: {
    color: '#44ff88',
    border: '1px solid rgba(68,255,136,0.34)',
    borderRadius: 3,
    padding: '3px 7px',
    fontSize: 10,
  },
  readerTitle: {
    color: '#cdd9e8',
    fontSize: 20,
    fontWeight: 'normal',
    margin: '0 0 14px',
  },
  readerBody: {
    marginBottom: 16,
  },
  paragraph: {
    color: '#aabbcc',
    fontSize: 13,
    lineHeight: 1.72,
    margin: '0 0 13px',
  },
  meaningPanel: {
    border: '1px solid rgba(68,136,170,0.28)',
    borderRadius: 5,
    padding: '12px 14px',
    background: 'rgba(68,136,170,0.07)',
    marginBottom: 12,
  },
  actionPanel: {
    border: '1px solid rgba(68,255,136,0.20)',
    borderRadius: 5,
    padding: '12px 14px',
    background: 'rgba(68,255,136,0.045)',
    marginBottom: 16,
  },
  panelTitle: {
    color: '#7bb8ff',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 9,
  },
  meaningItem: {
    display: 'flex',
    gap: 9,
    color: '#9fb1c4',
    fontSize: 12,
    lineHeight: 1.55,
    marginBottom: 7,
  },
  meaningMark: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: '#4488aa',
    boxShadow: '0 0 8px rgba(68,136,170,0.62)',
    marginTop: 7,
    flexShrink: 0,
  },
  actionText: {
    color: '#a7c8b4',
    fontSize: 12,
    lineHeight: 1.55,
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
  },
  primaryButton: {
    background: 'rgba(68,136,170,0.24)',
    border: '1px solid rgba(123,184,255,0.52)',
    borderRadius: 4,
    color: '#d6efff',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: '9px 14px',
    cursor: 'pointer',
  },
  secondaryButton: {
    background: 'transparent',
    border: '1px solid rgba(68,102,136,0.52)',
    borderRadius: 4,
    color: '#8899aa',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: '9px 14px',
    cursor: 'pointer',
  },
};
