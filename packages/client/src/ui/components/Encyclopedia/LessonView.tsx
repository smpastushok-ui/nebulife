import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { Lesson, Language, LessonBlock, LessonImage } from '../../../encyclopedia/index.js';
import { getImageUrl, getAudioUrl } from '../../../encyclopedia/index.js';
import { playSfx } from '../../../audio/SfxPlayer.js';

interface LessonViewProps {
  lesson: Lesson;
  lang: Language;
  prevLesson: Lesson | null;
  nextLesson: Lesson | null;
  onBackToToc: () => void;
  onClose: () => void;
  onNavigate: (direction: 'next' | 'prev') => void;
  onSwitchLesson: (lesson: Lesson) => void;
}

/**
 * Reads-a-single-lesson view. Header (sticky) + scrollable content body.
 * Supports voice playback (female/male/speed), image lazy-load with placeholder
 * when assets manifest doesn't have a URL yet, glossary, quiz, sources.
 */
export function LessonView({
  lesson,
  lang,
  prevLesson,
  nextLesson,
  onBackToToc,
  onClose,
  onNavigate,
  onSwitchLesson,
}: LessonViewProps) {
  // ── Audio state ──────────────────────────────────────────────────────────
  const [voice, setVoice] = useState<'female' | 'male'>('female');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioInfo = useMemo(() => getAudioUrl(lesson.slug, lang, voice), [lesson.slug, lang, voice]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = playbackRate;
  }, [playbackRate, audioInfo?.url]);

  useEffect(() => {
    // Reset audio when lesson changes
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [lesson.slug]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !audioInfo) return;
    playSfx('ui-click', 0.07);
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [audioInfo]);

  // ── Reading progress (scroll percent) ────────────────────────────────────
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const handler = () => {
      const max = el.scrollHeight - el.clientHeight;
      setScrollProgress(max > 0 ? (el.scrollTop / max) * 100 : 0);
    };
    handler();
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, [lesson.slug]);

  // ── Reset scroll on lesson change ────────────────────────────────────────
  useEffect(() => {
    if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = 0;
  }, [lesson.slug]);

  // ── Localized labels ─────────────────────────────────────────────────────
  const L = lang === 'uk'
    ? {
        backToLib: '← До бібліотеки',
        listen: 'Послухати урок',
        female: 'Жіночий',
        male: 'Чоловічий',
        nextLesson: 'Наступний урок',
        prevLesson: 'Попередній урок',
        glossaryTitle: 'Терміни в цьому уроці',
        quizTitle: 'Швидка перевірка',
        sourcesTitle: 'Першоджерела і додаткове читання',
        verifiedAt: 'Дані актуальні станом на',
        author: 'Автор',
        verifiedBy: 'Технічна перевірка',
        readingTime: 'хв читання',
        audioTime: 'хв аудіо',
        audioPending: 'Аудіо ще генерується...',
        imagePending: 'Зображення генерується...',
      }
    : {
        backToLib: '← Library',
        listen: 'Listen to the lesson',
        female: 'Female',
        male: 'Male',
        nextLesson: 'Next lesson',
        prevLesson: 'Previous lesson',
        glossaryTitle: 'Terms in this lesson',
        quizTitle: 'Quick check',
        sourcesTitle: 'Primary sources and further reading',
        verifiedAt: 'Facts verified as of',
        author: 'Author',
        verifiedBy: 'Technical review',
        readingTime: 'min read',
        audioTime: 'min audio',
        audioPending: 'Audio is being generated...',
        imagePending: 'Image is being generated...',
      };

  return (
    <div style={containerStyle}>
      {/* Header (sticky) */}
      <div style={headerStyle}>
        <button onClick={onBackToToc} style={backBtnStyle}>{L.backToLib}</button>
        <button onClick={onClose} style={closeBtnStyle} title="×">×</button>
        <div style={{ ...progressBarStyle, width: `${scrollProgress}%` }} />
      </div>

      {/* Scrollable body */}
      <div ref={scrollAreaRef} style={scrollStyle}>
        <div style={containerInnerStyle}>
          {/* Meta row */}
          <div style={metaRowStyle}>
            <span style={{ ...badgeStyle, color: '#7bb8ff', borderColor: '#446688' }}>
              {lesson.section.replace(/-/g, ' ')}
            </span>
            <span style={{ ...badgeStyle, color: difficultyColors[lesson.difficulty], borderColor: difficultyColors[lesson.difficulty] }}>
              {difficultyLabels[lesson.difficulty][lang]}
            </span>
            <span style={badgeStyle}>
              {lesson.readingTimeMin} {L.readingTime}
              {audioInfo ? ` · ${Math.round(audioInfo.durationSec / 60)} ${L.audioTime}` : ''}
            </span>
            <span style={{ ...badgeStyle, color: '#88ccdd', borderColor: '#88ccdd' }}>
              ✓ {L.verifiedAt} {lesson.lastVerified}
            </span>
          </div>

          {/* Title */}
          <h1 style={titleStyle}>{lesson.title}</h1>
          <p style={subtitleStyle}>{lesson.subtitle}</p>

          {/* Audio player */}
          <div style={audioPanelStyle}>
            <button onClick={togglePlay} disabled={!audioInfo} style={playBtnStyle}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#cdd9e8', fontSize: 13 }}>{L.listen}</div>
              <div style={{ color: '#667788', fontSize: 11 }}>
                {audioInfo
                  ? `${Math.round(audioInfo.durationSec / 60)} ${L.audioTime} · ${voice === 'female' ? L.female : L.male}`
                  : L.audioPending}
              </div>
            </div>
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value as 'female' | 'male')}
              style={selectStyle}
            >
              <option value="female">{L.female}</option>
              <option value="male">{L.male}</option>
            </select>
            <select
              value={playbackRate}
              onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
              style={selectStyle}
            >
              <option value={0.75}>0.75×</option>
              <option value={1}>1.0×</option>
              <option value={1.25}>1.25×</option>
              <option value={1.5}>1.5×</option>
              <option value={2}>2.0×</option>
            </select>
            {audioInfo && (
              <audio
                ref={audioRef}
                src={audioInfo.url}
                onEnded={() => setIsPlaying(false)}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                preload="none"
              />
            )}
          </div>

          {/* Hero image */}
          <LessonImageView slug={lesson.slug} image={lesson.hero} placeholder={L.imagePending} />

          {/* Body blocks */}
          <article style={articleStyle}>
            {lesson.body.map((block, i) => (
              <BodyBlock
                key={i}
                block={block}
                slug={lesson.slug}
                imagePlaceholder={L.imagePending}
                isFirstParagraph={i === 0}
              />
            ))}
          </article>

          {/* Glossary */}
          {lesson.glossary.length > 0 && (
            <div style={glossaryStyle}>
              <div style={subPanelTitleStyle}>{L.glossaryTitle}</div>
              <dl style={glossaryListStyle}>
                {lesson.glossary.map((term) => (
                  <div key={term.term} style={glossaryItemStyle}>
                    <dt style={glossaryDtStyle}>{term.term}</dt>
                    <dd style={glossaryDdStyle}>{term.definition}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Quiz */}
          {lesson.quiz.length > 0 && (
            <div style={quizPanelStyle}>
              <div style={{ ...subPanelTitleStyle, color: '#7bb8ff' }}>{L.quizTitle}</div>
              {lesson.quiz.map((q, i) => (
                <QuizQuestionView key={i} question={q} index={i} lang={lang} />
              ))}
            </div>
          )}

          {/* Sources */}
          {lesson.sources.length > 0 && (
            <div style={sourcesStyle}>
              <div style={subPanelTitleStyle}>{L.sourcesTitle}</div>
              <ul style={sourcesListStyle}>
                {lesson.sources.map((src) => (
                  <li key={src.url} style={sourceItemStyle}>
                    <a href={src.url} target="_blank" rel="noopener noreferrer" style={sourceLinkStyle}>
                      {src.title}
                    </a>
                    {src.meta && <span style={sourceMetaStyle}> — {src.meta}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer nav */}
          <nav style={footerNavStyle}>
            {prevLesson ? (
              <button onClick={() => onNavigate('prev')} style={navBtnStyle}>
                <div style={navBtnLabelStyle}>← {L.prevLesson}</div>
                <div>{prevLesson.title}</div>
              </button>
            ) : <div style={{ flex: 1 }} />}

            {nextLesson ? (
              <button onClick={() => onNavigate('next')} style={{ ...navBtnStyle, textAlign: 'right' as const }}>
                <div style={navBtnLabelStyle}>{L.nextLesson} →</div>
                <div>{nextLesson.title}</div>
              </button>
            ) : <div style={{ flex: 1 }} />}
          </nav>

          {/* Trailing whitespace so footer scroll is comfortable */}
          <div style={{ height: 80 }} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Body block — paragraphs / heading / image / diagram
// ─────────────────────────────────────────────────────────────────────────────

interface BodyBlockProps {
  block: LessonBlock;
  slug: string;
  imagePlaceholder: string;
  isFirstParagraph: boolean;
}

function BodyBlock({ block, slug, imagePlaceholder, isFirstParagraph }: BodyBlockProps) {
  return (
    <>
      {block.heading && block.level === 3 && <h3 style={h3Style}>{block.heading}</h3>}
      {block.heading && (block.level === 2 || !block.level) && <h2 style={h2Style}>{block.heading}</h2>}

      {block.paragraphs?.map((p, i) => (
        <p
          key={i}
          style={{
            ...paragraphStyle,
            ...(isFirstParagraph && i === 0 ? dropCapStyle : {}),
          }}
          dangerouslySetInnerHTML={{ __html: renderInline(p) }}
        />
      ))}

      {block.image && <LessonImageView slug={slug} image={block.image} placeholder={imagePlaceholder} />}

      {block.diagram && (
        <div style={diagramPanelStyle}>
          <div style={diagramTitleStyle}>{block.diagram.title}</div>
          <div dangerouslySetInnerHTML={{ __html: block.diagram.svg }} style={{ display: 'block' }} />
          {block.diagram.caption && <p style={diagramCaptionStyle}>{block.diagram.caption}</p>}
        </div>
      )}
    </>
  );
}

/** Convert markdown-lite to safe HTML: **bold** → <strong>, _italic_ → <em>. */
function renderInline(text: string): string {
  // Escape HTML first
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>');
}

// ─────────────────────────────────────────────────────────────────────────────
// Lesson image — looks up cacheKey in manifest, shows placeholder if missing
// ─────────────────────────────────────────────────────────────────────────────

interface LessonImageViewProps {
  slug: string;
  image: LessonImage;
  placeholder: string;
}

function LessonImageView({ slug, image, placeholder }: LessonImageViewProps) {
  const url = getImageUrl(slug, image.cacheKey);

  if (!url) {
    return (
      <div style={imagePlaceholderStyle}>
        <div style={{ color: '#667788', fontSize: 12 }}>{placeholder}</div>
        <div style={{ color: '#446688', fontSize: 10, marginTop: 4, fontStyle: 'italic' }}>
          {image.alt}
        </div>
      </div>
    );
  }

  return (
    <figure style={figureStyle}>
      <img src={url} alt={image.alt} loading="lazy" style={imgStyle} />
      {image.caption && <figcaption style={captionStyle}>{image.caption}</figcaption>}
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Quiz question with reveal-on-click
// ─────────────────────────────────────────────────────────────────────────────

interface QuizQuestionViewProps {
  question: { question: string; options: string[]; correctIndex: number; explanation?: string };
  index: number;
  lang: Language;
}

function QuizQuestionView({ question, index, lang }: QuizQuestionViewProps) {
  const [picked, setPicked] = useState<number | null>(null);

  return (
    <div style={{ marginBottom: 18 }}>
      <p style={quizQuestionStyle}>
        {index + 1}. {question.question}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {question.options.map((opt, i) => {
          const isPicked = picked === i;
          const isCorrect = i === question.correctIndex;
          let borderColor = '#334455';
          let color = '#aabbcc';
          if (picked !== null) {
            if (isCorrect) { borderColor = '#44ff88'; color = '#44ff88'; }
            else if (isPicked) { borderColor = '#cc4444'; color = '#cc4444'; }
          }
          return (
            <button
              key={i}
              onClick={() => picked === null && setPicked(i)}
              disabled={picked !== null}
              style={{ ...quizOptionStyle, borderColor, color }}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {picked !== null && question.explanation && (
        <p style={quizExplanationStyle}>
          {lang === 'uk' ? 'Пояснення: ' : 'Explanation: '}
          {question.explanation}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Difficulty colors + labels
// ─────────────────────────────────────────────────────────────────────────────

const difficultyColors: Record<string, string> = {
  beginner: '#44ff88',
  intermediate: '#7bb8ff',
  advanced: '#ff8844',
  current2026: '#88ccdd',
};

const difficultyLabels: Record<string, { uk: string; en: string }> = {
  beginner: { uk: 'Початковий', en: 'Beginner' },
  intermediate: { uk: 'Середній', en: 'Intermediate' },
  advanced: { uk: 'Просунутий', en: 'Advanced' },
  current2026: { uk: 'Сучасні дослідження 2026', en: 'Current research 2026' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: '#020510',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: '"SF Mono", Monaco, Menlo, Consolas, "Roboto Mono", "Courier New", monospace',
  color: '#aabbcc',
  fontSize: 14,
  lineHeight: 1.6,
};

const headerStyle: React.CSSProperties = {
  top: 0,
  background: 'rgba(10, 15, 25, 0.96)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderBottom: '1px solid #334455',
  padding: '10px 16px',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexShrink: 0,
  position: 'relative' as const,
};

const backBtnStyle: React.CSSProperties = {
  background: 'transparent',
  color: '#7bb8ff',
  border: '1px solid #334455',
  padding: '6px 12px',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
  borderRadius: 3,
  flex: 1,
  textAlign: 'left',
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

const progressBarStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  height: 2,
  background: '#4488aa',
  transition: 'width 0.1s linear',
};

const scrollStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  WebkitOverflowScrolling: 'touch',
};

const containerInnerStyle: React.CSSProperties = {
  maxWidth: 760,
  margin: '0 auto',
  padding: '24px 20px 0',
};

const metaRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginBottom: 12,
};

const badgeStyle: React.CSSProperties = {
  fontSize: 11,
  padding: '3px 8px',
  borderRadius: 3,
  border: '1px solid #334455',
  color: '#8899aa',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const titleStyle: React.CSSProperties = {
  fontSize: 30,
  color: '#cdd9e8',
  lineHeight: 1.2,
  margin: '8px 0 8px',
  letterSpacing: '-0.5px',
  fontWeight: 600,
};

const subtitleStyle: React.CSSProperties = {
  color: '#8899aa',
  fontSize: 14,
  marginBottom: 24,
};

const audioPanelStyle: React.CSSProperties = {
  background: 'rgba(15, 22, 35, 0.85)',
  border: '1px solid #334455',
  borderRadius: 4,
  padding: '12px 14px',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginBottom: 24,
  flexWrap: 'wrap',
};

const playBtnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: '#4488aa',
  color: '#020510',
  border: 'none',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const selectStyle: React.CSSProperties = {
  background: 'transparent',
  color: '#aabbcc',
  border: '1px solid #334455',
  padding: '5px 8px',
  fontSize: 11,
  fontFamily: 'inherit',
  borderRadius: 3,
  cursor: 'pointer',
};

const articleStyle: React.CSSProperties = {
  marginBottom: 32,
};

const paragraphStyle: React.CSSProperties = {
  marginBottom: 16,
  color: '#aabbcc',
};

const dropCapStyle: React.CSSProperties = {
  // Drop cap on first letter via CSS — not supported in inline styles directly;
  // we rely on a global class injected on mount. Falling back to first-letter
  // pseudo via inline injection.
};

const h2Style: React.CSSProperties = {
  fontSize: 22,
  color: '#cdd9e8',
  margin: '36px 0 14px',
  borderBottom: '1px solid #334455',
  paddingBottom: 6,
  letterSpacing: '-0.3px',
  fontWeight: 600,
};

const h3Style: React.CSSProperties = {
  fontSize: 17,
  color: '#cdd9e8',
  margin: '24px 0 10px',
  fontWeight: 600,
};

const figureStyle: React.CSSProperties = {
  margin: '20px 0',
};

const imgStyle: React.CSSProperties = {
  width: '100%',
  height: 'auto',
  borderRadius: 4,
  border: '1px solid #334455',
  display: 'block',
};

const captionStyle: React.CSSProperties = {
  color: '#8899aa',
  fontSize: 12,
  marginTop: 8,
  textAlign: 'center',
  fontStyle: 'italic',
};

const imagePlaceholderStyle: React.CSSProperties = {
  background: 'rgba(15, 22, 35, 0.85)',
  border: '1px dashed #446688',
  borderRadius: 4,
  padding: '40px 20px',
  margin: '20px 0',
  textAlign: 'center',
};

const diagramPanelStyle: React.CSSProperties = {
  background: 'rgba(15, 22, 35, 0.85)',
  border: '1px solid #334455',
  borderRadius: 4,
  padding: 20,
  margin: '24px 0',
};

const diagramTitleStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#667788',
  marginBottom: 12,
  textTransform: 'uppercase',
  letterSpacing: '1px',
};

const diagramCaptionStyle: React.CSSProperties = {
  color: '#8899aa',
  fontSize: 12,
  marginTop: 12,
  textAlign: 'center',
};

const subPanelTitleStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#667788',
  marginBottom: 12,
  textTransform: 'uppercase',
  letterSpacing: '1px',
};

const glossaryStyle: React.CSSProperties = {
  background: 'rgba(15, 22, 35, 0.85)',
  border: '1px solid #334455',
  borderRadius: 4,
  padding: 16,
  margin: '24px 0',
};

const glossaryListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const glossaryItemStyle: React.CSSProperties = {
  marginBottom: 0,
};

const glossaryDtStyle: React.CSSProperties = {
  color: '#7bb8ff',
  fontSize: 13,
  marginBottom: 2,
  fontWeight: 600,
};

const glossaryDdStyle: React.CSSProperties = {
  color: '#8899aa',
  fontSize: 13,
  paddingLeft: 16,
  margin: 0,
};

const quizPanelStyle: React.CSSProperties = {
  background: 'rgba(15, 22, 35, 0.85)',
  border: '1px solid #4488aa',
  borderRadius: 4,
  padding: 20,
  margin: '32px 0',
};

const quizQuestionStyle: React.CSSProperties = {
  color: '#cdd9e8',
  marginBottom: 12,
  fontWeight: 500,
};

const quizOptionStyle: React.CSSProperties = {
  background: '#020510',
  border: '1px solid #334455',
  color: '#aabbcc',
  padding: '10px 14px',
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 13,
  borderRadius: 3,
  transition: 'all 0.15s',
};

const quizExplanationStyle: React.CSSProperties = {
  color: '#88ccdd',
  fontSize: 12,
  marginTop: 10,
  fontStyle: 'italic',
};

const sourcesStyle: React.CSSProperties = {
  margin: '32px 0',
  padding: 20,
  background: 'rgba(15, 22, 35, 0.85)',
  borderLeft: '3px solid #4488aa',
  borderRadius: '0 4px 4px 0',
};

const sourcesListStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
};

const sourceItemStyle: React.CSSProperties = {
  padding: '6px 0',
  borderBottom: '1px dashed #334455',
  fontSize: 13,
};

const sourceLinkStyle: React.CSSProperties = {
  color: '#7bb8ff',
  textDecoration: 'none',
};

const sourceMetaStyle: React.CSSProperties = {
  color: '#667788',
  fontSize: 11,
};

const footerNavStyle: React.CSSProperties = {
  marginTop: 48,
  paddingTop: 24,
  borderTop: '1px solid #334455',
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
};

const navBtnStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 200,
  background: 'rgba(15, 22, 35, 0.85)',
  border: '1px solid #334455',
  color: '#aabbcc',
  padding: '14px 18px',
  borderRadius: 4,
  fontSize: 13,
  fontFamily: 'inherit',
  cursor: 'pointer',
  textAlign: 'left',
};

const navBtnLabelStyle: React.CSSProperties = {
  color: '#667788',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  marginBottom: 4,
};

// Inject drop-cap CSS once
if (typeof document !== 'undefined') {
  const STYLE_ID = 'encyclopedia-lesson-style';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      article p strong { color: #cdd9e8; font-weight: 600; }
      article p em {
        color: #88ccdd;
        font-style: normal;
        border-bottom: 1px dotted #88ccdd;
      }
    `;
    document.head.appendChild(style);
  }
}
