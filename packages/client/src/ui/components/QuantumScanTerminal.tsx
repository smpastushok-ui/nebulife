import React, { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// QuantumScanTerminal — Terminal log panel during 3D model scanning
// ---------------------------------------------------------------------------
// Displays fake system messages while AI generates the 3D model.
// Messages appear one by one with random intervals, auto-scrolling.
// ---------------------------------------------------------------------------

interface QuantumScanTerminalProps {
  phase: 'generating_photo' | 'generating_3d';
  progress: number; // 0-100
  planetName: string;
}

interface LogEntry {
  id: number;
  text: string;
  timestamp: string;
}

// Messages pool per phase
const PHOTO_MESSAGES = [
  '[SCAN] Iнiцiалiзацiя квантового сканера...',
  '[LIDAR] Калiбрування лазерного дальномiра...',
  '[ATMO] Аналiз атмосферного складу...',
  '[GEO] Сканування поверхневих структур...',
  '[SPCT] Спектральний аналiз свiтлового потоку...',
  '[THRM] Термальне картографування...',
  '[GRAV] Зчитування гравiтацiйного поля...',
  '[MAG] Магнiтометрiя завершена',
  '[TOPO] Побудова топографiчної карти...',
  '[HYDR] Iдентифiкацiя водних ресурсiв...',
  '[BIO] Пошук бiомаркерiв...',
  '[DATA] Компiляцiя даних сканування...',
];

const MODEL_MESSAGES = [
  '[MESH] Побудова полiгональної сiтки...',
  '[VERT] Генерацiя вершин: обробка...',
  '[TEX] Генерацiя текстур поверхнi...',
  '[NORM] Розрахунок нормалей...',
  '[UV] Розгортка UV-координат...',
  '[MAT] Призначення матерiалiв...',
  '[LOD] Оптимiзацiя рiвнiв деталiзацiї...',
  '[BAKE] Запiкання свiтлової карти...',
  '[PHYS] Розрахунок фiзичних параметрiв...',
  '[CLOUD] Генерацiя хмарного шару...',
  '[RING] Перевiрка кiлець i супутникiв...',
  '[PROC] Фiналiзацiя 3D моделi...',
  '[PACK] Пакування GLB...',
  '[VALID] Валiдацiя полiгонiв...',
];

const QuantumScanTerminal: React.FC<QuantumScanTerminalProps> = ({
  phase,
  progress,
  planetName,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const msgIndexRef = useRef(0);
  const idCounterRef = useRef(0);

  const getTimestamp = useCallback(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  }, []);

  // Add initial message
  useEffect(() => {
    const initMsg = phase === 'generating_photo'
      ? `[SYS] Початок сканування: ${planetName}`
      : `[SYS] Побудова 3D моделi: ${planetName}`;

    setLogs([{ id: 0, text: initMsg, timestamp: getTimestamp() }]);
    msgIndexRef.current = 0;
    idCounterRef.current = 1;
  }, [phase, planetName, getTimestamp]);

  // Add messages over time
  useEffect(() => {
    const messages = phase === 'generating_photo' ? PHOTO_MESSAGES : MODEL_MESSAGES;

    const addMessage = () => {
      const idx = msgIndexRef.current;
      if (idx >= messages.length) {
        // Loop back with variation
        msgIndexRef.current = 0;
        return;
      }

      const id = idCounterRef.current++;
      msgIndexRef.current++;

      setLogs(prev => {
        const next = [...prev, { id, text: messages[idx], timestamp: getTimestamp() }];
        // Keep max 12 visible lines
        return next.length > 12 ? next.slice(-12) : next;
      });
    };

    const scheduleNext = () => {
      const delay = 1500 + Math.random() * 2000; // 1.5-3.5s
      return setTimeout(() => {
        addMessage();
        timerRef = scheduleNext();
      }, delay);
    };

    let timerRef = scheduleNext();
    return () => clearTimeout(timerRef);
  }, [phase, getTimestamp]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerDot} />
        <span style={styles.headerTitle}>QUANTUM SCAN</span>
        {progress > 0 && (
          <span style={styles.headerProgress}>{Math.round(progress)}%</span>
        )}
      </div>
      <div ref={scrollRef} style={styles.logArea}>
        {logs.map((entry, i) => (
          <div
            key={entry.id}
            style={{
              ...styles.logLine,
              opacity: i === logs.length - 1 ? 1 : 0.7,
            }}
          >
            <span style={styles.timestamp}>{entry.timestamp}</span>
            <span style={styles.logText}>{entry.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: 80,
    left: 16,
    width: 300,
    maxHeight: 220,
    background: 'rgba(5, 10, 20, 0.88)',
    border: '1px solid #334455',
    borderRadius: 4,
    overflow: 'hidden',
    zIndex: 100,
    fontFamily: 'monospace',
    pointerEvents: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderBottom: '1px solid rgba(51, 68, 85, 0.5)',
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#44ff88',
    boxShadow: '0 0 6px #44ff88',
    display: 'inline-block',
  },
  headerTitle: {
    color: '#667788',
    fontSize: 10,
    letterSpacing: '1.5px',
    flex: 1,
  },
  headerProgress: {
    color: '#44ffaa',
    fontSize: 11,
    fontWeight: 600,
  },
  logArea: {
    padding: '4px 10px 8px',
    maxHeight: 180,
    overflowY: 'auto',
    scrollBehavior: 'smooth' as const,
  },
  logLine: {
    display: 'flex',
    gap: 8,
    padding: '2px 0',
    fontSize: 11,
    lineHeight: '1.5',
  },
  timestamp: {
    color: '#556677',
    flexShrink: 0,
    fontSize: 10,
  },
  logText: {
    color: '#44ffaa',
  },
};

export default QuantumScanTerminal;
