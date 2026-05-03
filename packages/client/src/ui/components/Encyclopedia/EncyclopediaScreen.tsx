import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SECTIONS,
  getLibraryToc,
  getLesson,
  getTotalLessonCount,
} from '../../../encyclopedia/index.js';
import type { Language, Lesson, SectionId } from '../../../encyclopedia/index.js';
import { LessonView } from './LessonView.js';
import { playSfx } from '../../../audio/SfxPlayer.js';

const STORAGE_KEY_OPENED = 'nebulife_encyclopedia_opened';
const STORAGE_KEY_LAST_LESSON = 'nebulife_encyclopedia_last_lesson';

interface EncyclopediaScreenProps {
  onClose: () => void;
}

/**
 * Космічна Енциклопедія — wiki-style space-knowledge library.
 *
 * Two main views:
 *   1. TOC — list of sections, each expandable, with lesson cards inside
 *   2. Reader — single lesson, full-page
 *
 * Routing is internal (no URL change) since the rest of the app doesn't use
 * react-router. Selected lesson is persisted in localStorage so a reload
 * doesn't drop the user back to the TOC.
 */
export function EncyclopediaScreen({ onClose }: EncyclopediaScreenProps) {
  const { i18n, t } = useTranslation();
  const lang: Language = i18n.language === 'en' ? 'en' : 'uk';

  const [openLesson, setOpenLesson] = useState<Lesson | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(
    () => new Set(SECTIONS.slice(0, 3).map((s) => s.id)),
  );
  const [searchQuery, setSearchQuery] = useState('');

  // ── Load last opened lesson on mount ─────────────────────────────────────
  useEffect(() => {
    const lastSlug = localStorage.getItem(STORAGE_KEY_LAST_LESSON);
    if (lastSlug) {
      const lesson = getLesson(lastSlug, lang);
      if (lesson) setOpenLesson(lesson);
    }
    localStorage.setItem(STORAGE_KEY_OPENED, '1');
  }, [lang]);

  // ── TOC data ─────────────────────────────────────────────────────────────
  const toc = useMemo(() => getLibraryToc(lang), [lang]);
  const totalLessons = useMemo(() => getTotalLessonCount(lang), [lang]);

  const filteredToc = useMemo(() => {
    if (!searchQuery.trim()) return toc;
    const q = searchQuery.toLowerCase();
    return toc
      .map((sec) => ({
        ...sec,
        lessons: sec.lessons.filter(
          (l) => l.title.toLowerCase().includes(q) || l.subtitle.toLowerCase().includes(q),
        ),
      }))
      .filter((sec) => sec.lessons.length > 0);
  }, [toc, searchQuery]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleOpenLesson = useCallback((lesson: Lesson) => {
    playSfx('ui-click', 0.1);
    setOpenLesson(lesson);
    localStorage.setItem(STORAGE_KEY_LAST_LESSON, lesson.slug);
    window.scrollTo({ top: 0 });
  }, []);

  const handleBackToToc = useCallback(() => {
    playSfx('ui-click', 0.07);
    setOpenLesson(null);
    localStorage.removeItem(STORAGE_KEY_LAST_LESSON);
  }, []);

  const handleToggleSection = useCallback((sectionId: SectionId) => {
    playSfx('ui-click', 0.05);
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }, []);

  const handleNavigateLesson = useCallback(
    (direction: 'next' | 'prev') => {
      if (!openLesson) return;
      const sectionLessons =
        toc.find((s) => s.sectionId === openLesson.section)?.lessons ?? [];
      const idx = sectionLessons.findIndex((l) => l.slug === openLesson.slug);
      if (idx < 0) return;
      const target = direction === 'next' ? sectionLessons[idx + 1] : sectionLessons[idx - 1];
      if (target) handleOpenLesson(target);
    },
    [openLesson, toc, handleOpenLesson],
  );

  // ── Render: lesson reader ────────────────────────────────────────────────
  if (openLesson) {
    const sectionLessons =
      toc.find((s) => s.sectionId === openLesson.section)?.lessons ?? [];
    const idx = sectionLessons.findIndex((l) => l.slug === openLesson.slug);
    const prev = idx > 0 ? sectionLessons[idx - 1] : null;
    const next = idx >= 0 && idx < sectionLessons.length - 1 ? sectionLessons[idx + 1] : null;

    return (
      <div style={overlayStyle}>
        <LessonView
          lesson={openLesson}
          lang={lang}
          prevLesson={prev}
          nextLesson={next}
          onBackToToc={handleBackToToc}
          onClose={onClose}
          onNavigate={handleNavigateLesson}
          onSwitchLesson={handleOpenLesson}
        />
      </div>
    );
  }

  // ── Render: TOC ──────────────────────────────────────────────────────────
  return (
    <div style={overlayStyle}>
      {/* Header bar */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <span style={titleStyle}>
            {lang === 'uk' ? 'Космічна енциклопедія' : 'Cosmic Encyclopedia'}
          </span>
          <span style={metaStyle}>
            {totalLessons} {lang === 'uk' ? 'уроків' : 'lessons'}
          </span>
        </div>
        <button onClick={onClose} style={closeBtnStyle} title={t('common.close', 'Close')}>
          ×
        </button>
      </div>

      {/* Search */}
      <div style={searchWrapStyle}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={lang === 'uk' ? 'Пошук уроку...' : 'Search lessons...'}
          style={searchInputStyle}
        />
      </div>

      {/* Content scrollable area */}
      <div style={scrollAreaStyle}>
        {filteredToc.length === 0 && (
          <div style={emptyStyle}>
            {lang === 'uk'
              ? 'Нічого не знайдено. Спробуй інший запит.'
              : 'Nothing found. Try a different query.'}
          </div>
        )}

        {filteredToc.map((sec) => {
          const meta = SECTIONS.find((s) => s.id === sec.sectionId);
          if (!meta) return null;
          const isOpen = expandedSections.has(sec.sectionId);
          const isEmpty = sec.lessons.length === 0;

          return (
            <div key={sec.sectionId} style={sectionStyle}>
              <button
                onClick={() => !isEmpty && handleToggleSection(sec.sectionId)}
                disabled={isEmpty}
                style={{
                  ...sectionHeaderStyle,
                  cursor: isEmpty ? 'default' : 'pointer',
                  opacity: isEmpty ? 0.5 : 1,
                }}
              >
                <span style={sectionChevronStyle}>{isOpen ? '▾' : '▸'}</span>
                <span style={sectionTitleStyle}>{meta.title[lang]}</span>
                <span style={sectionCountStyle}>
                  {sec.lessons.length} {lang === 'uk' ? 'ур.' : 'l.'}
                </span>
              </button>

              {isOpen && (
                <>
                  <div style={sectionDescStyle}>{meta.description[lang]}</div>
                  <div style={lessonGridStyle}>
                    {sec.lessons.map((lesson) => (
                      <LessonCard
                        key={lesson.slug}
                        lesson={lesson}
                        lang={lang}
                        onClick={() => handleOpenLesson(lesson)}
                      />
                    ))}
                    {sec.lessons.length === 0 && !isEmpty && (
                      <div style={emptyStyle}>
                        {lang === 'uk' ? 'Уроки в розробці' : 'Lessons in development'}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LessonCard — single lesson preview in TOC
// ─────────────────────────────────────────────────────────────────────────────

interface LessonCardProps {
  lesson: Lesson;
  lang: Language;
  onClick: () => void;
}

function LessonCard({ lesson, lang, onClick }: LessonCardProps) {
  const difficultyLabel = useMemo(() => {
    const labels: Record<string, { uk: string; en: string }> = {
      beginner: { uk: 'Початковий', en: 'Beginner' },
      intermediate: { uk: 'Середній', en: 'Intermediate' },
      advanced: { uk: 'Просунутий', en: 'Advanced' },
      current2026: { uk: '2026', en: '2026' },
    };
    return labels[lesson.difficulty]?.[lang] ?? lesson.difficulty;
  }, [lesson.difficulty, lang]);

  const difficultyColor: Record<string, string> = {
    beginner: '#44ff88',
    intermediate: '#7bb8ff',
    advanced: '#ff8844',
    current2026: '#88ccdd',
  };

  return (
    <button onClick={onClick} style={cardStyle} className="encyclopedia-card">
      <div style={cardMetaStyle}>
        <span style={{ ...cardBadgeStyle, color: difficultyColor[lesson.difficulty] ?? '#aabbcc', borderColor: difficultyColor[lesson.difficulty] ?? '#334455' }}>
          {difficultyLabel}
        </span>
        <span style={cardTimeStyle}>
          {lesson.readingTimeMin} {lang === 'uk' ? 'хв' : 'min'}
        </span>
      </div>
      <div style={cardTitleStyle}>{lesson.title}</div>
      <div style={cardSubtitleStyle}>{lesson.subtitle}</div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles — Game Bible palette + monospace
// ─────────────────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: '#020510',
  zIndex: 9500,
  display: 'flex',
  flexDirection: 'column',
  fontFamily: '"SF Mono", Monaco, Menlo, Consolas, "Roboto Mono", "Courier New", monospace',
  color: '#aabbcc',
  fontSize: 14,
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  background: 'rgba(10, 15, 25, 0.96)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderBottom: '1px solid #334455',
  padding: '12px 20px',
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  flexShrink: 0,
};

const titleStyle: React.CSSProperties = {
  fontSize: 16,
  color: '#cdd9e8',
  letterSpacing: '0.5px',
};

const metaStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#667788',
  textTransform: 'uppercase',
  letterSpacing: '1px',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #334455',
  color: '#aabbcc',
  width: 32,
  height: 32,
  borderRadius: 3,
  fontSize: 18,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const searchWrapStyle: React.CSSProperties = {
  padding: '12px 20px',
  borderBottom: '1px solid #1a2438',
  flexShrink: 0,
};

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(15, 22, 35, 0.85)',
  border: '1px solid #334455',
  color: '#aabbcc',
  padding: '8px 12px',
  fontSize: 13,
  fontFamily: 'inherit',
  borderRadius: 3,
  outline: 'none',
};

const scrollAreaStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: '16px 20px 80px',
  WebkitOverflowScrolling: 'touch',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 20,
  borderBottom: '1px dashed #1a2438',
  paddingBottom: 16,
};

const sectionHeaderStyle: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  color: '#aabbcc',
  padding: '8px 0',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontFamily: 'inherit',
  textAlign: 'left',
};

const sectionChevronStyle: React.CSSProperties = {
  color: '#7bb8ff',
  fontSize: 12,
  width: 12,
  display: 'inline-block',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 15,
  color: '#cdd9e8',
  flex: 1,
};

const sectionCountStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#667788',
  textTransform: 'uppercase',
};

const sectionDescStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#8899aa',
  margin: '4px 0 12px 22px',
  fontStyle: 'italic',
};

const lessonGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: 10,
  marginLeft: 22,
};

const cardStyle: React.CSSProperties = {
  background: 'rgba(15, 22, 35, 0.85)',
  border: '1px solid #334455',
  color: '#aabbcc',
  padding: '12px 14px',
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'inherit',
  borderRadius: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  transition: 'border-color 0.15s, background 0.15s',
};

const cardMetaStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
};

const cardBadgeStyle: React.CSSProperties = {
  fontSize: 10,
  padding: '2px 6px',
  border: '1px solid #334455',
  borderRadius: 2,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const cardTimeStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#667788',
  marginLeft: 'auto',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#cdd9e8',
  fontWeight: 600,
  lineHeight: 1.3,
};

const cardSubtitleStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#8899aa',
  lineHeight: 1.4,
};

const emptyStyle: React.CSSProperties = {
  padding: '20px',
  textAlign: 'center',
  color: '#667788',
  fontSize: 12,
  fontStyle: 'italic',
};

// Inject hover styles once
if (typeof document !== 'undefined') {
  const STYLE_ID = 'encyclopedia-hover-style';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .encyclopedia-card:hover {
        border-color: #446688 !important;
        background: rgba(20, 30, 45, 0.95) !important;
      }
    `;
    document.head.appendChild(style);
  }
}
