import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { SPARK_DIFFICULTY, type LifeSparkType } from '@nebulife/core';
import { SPARK_COLOR } from './ElementResultCard.js';

const SPARK_ORDER: LifeSparkType[] = ['primordial', 'adaptive', 'neural', 'stellar'];
const DIRS = ['n', 'e', 's', 'w'] as const;
type Dir = typeof DIRS[number];
type TileKind = 'core' | 'helix' | 'catalyst' | 'neural' | 'stellar' | 'blocker';
type GameStatus = 'select' | 'play' | 'igniting' | 'won';

interface LatticeTile {
  id: string;
  x: number;
  y: number;
  kind: TileKind;
  ports: Dir[];
  rotation: number;
  solutionRotation: number;
  required: boolean;
  locked: boolean;
}

interface PuzzleConfig {
  width: number;
  height: number;
  core: { x: number; y: number };
  catalystCount: number;
  neuralCount: number;
  stellarCount: number;
  blockerCount: number;
}

interface LatticeAnalysis {
  powered: Set<string>;
  openEnds: Set<string>;
  complete: boolean;
}

// Scoped keyframes (injected once with the modal). Procedural, no assets.
const DNAC_CSS = `
@keyframes dnac-flow { to { stroke-dashoffset: -34 } }
@keyframes dnac-core { 0%,100%{filter:drop-shadow(0 0 8px var(--dnac-accent));opacity:.86} 50%{filter:drop-shadow(0 0 24px var(--dnac-accent));opacity:1} }
@keyframes dnac-rotate { 0%{filter:brightness(1.7)} 100%{filter:brightness(1)} }
@keyframes dnac-ignite { 0%{transform:scale(.94);opacity:.55} 55%{transform:scale(1.08);opacity:1} 100%{transform:scale(1);opacity:.92} }
@keyframes dnac-rise { 0%{transform:translateY(12px) scale(.9);opacity:0} 100%{transform:translateY(0) scale(1);opacity:1} }
`;

const OPPOSITE: Record<Dir, Dir> = { n: 's', e: 'w', s: 'n', w: 'e' };
const DIR_DELTA: Record<Dir, { dx: number; dy: number }> = {
  n: { dx: 0, dy: -1 },
  e: { dx: 1, dy: 0 },
  s: { dx: 0, dy: 1 },
  w: { dx: -1, dy: 0 },
};
const KIND_COLOR: Record<TileKind, string> = {
  core: '#44ff88',
  helix: '#7bb8ff',
  catalyst: '#ff8844',
  neural: '#b78cff',
  stellar: '#ffcf66',
  blocker: '#334455',
};

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function rotateDir(dir: Dir, rotation: number): Dir {
  return DIRS[(DIRS.indexOf(dir) + rotation + 4) % 4];
}

function rotatePorts(ports: Dir[], rotation: number): Dir[] {
  return ports.map((dir) => rotateDir(dir, rotation));
}

function tileKey(x: number, y: number): string {
  return `${x}:${y}`;
}

function configForSpark(spark: LifeSparkType): PuzzleConfig {
  if (spark === 'primordial') return { width: 3, height: 3, core: { x: 1, y: 1 }, catalystCount: 1, neuralCount: 0, stellarCount: 0, blockerCount: 0 };
  if (spark === 'adaptive') return { width: 4, height: 4, core: { x: 1, y: 1 }, catalystCount: 2, neuralCount: 1, stellarCount: 0, blockerCount: 1 };
  if (spark === 'neural') return { width: 5, height: 4, core: { x: 2, y: 1 }, catalystCount: 2, neuralCount: 3, stellarCount: 0, blockerCount: 2 };
  return { width: 5, height: 5, core: { x: 2, y: 2 }, catalystCount: 2, neuralCount: 3, stellarCount: 3, blockerCount: 3 };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function generateLatticePuzzle(spark: LifeSparkType, session: number): LatticeTile[] {
  const config = configForSpark(spark);
  const rng = createRng(hashString(`${spark}:${session}:genome-lattice`));
  const allCells = Array.from({ length: config.width * config.height }, (_, i) => ({
    x: i % config.width,
    y: Math.floor(i / config.width),
  }));
  const coreId = tileKey(config.core.x, config.core.y);
  const blockerIds = new Set(
    shuffle(allCells.filter((cell) => tileKey(cell.x, cell.y) !== coreId), rng)
      .slice(0, config.blockerCount)
      .map((cell) => tileKey(cell.x, cell.y)),
  );

  const activeCells = allCells.filter((cell) => !blockerIds.has(tileKey(cell.x, cell.y)));
  const activeIds = new Set(activeCells.map((cell) => tileKey(cell.x, cell.y)));
  const visited = new Set<string>([coreId]);
  const edges = new Map<string, Set<Dir>>();
  const frontier = [config.core];

  for (const cell of activeCells) edges.set(tileKey(cell.x, cell.y), new Set());

  while (frontier.length > 0) {
    const current = frontier.pop()!;
    const currentId = tileKey(current.x, current.y);
    const neighbors = shuffle(DIRS.map((dir) => {
      const delta = DIR_DELTA[dir];
      return { dir, x: current.x + delta.dx, y: current.y + delta.dy };
    }).filter((next) => activeIds.has(tileKey(next.x, next.y))), rng);

    for (const next of neighbors) {
      const nextId = tileKey(next.x, next.y);
      if (visited.has(nextId)) continue;
      visited.add(nextId);
      edges.get(currentId)!.add(next.dir);
      edges.get(nextId)!.add(OPPOSITE[next.dir]);
      frontier.push({ x: next.x, y: next.y });
    }
  }

  const nonCoreActive = activeCells.filter((cell) => tileKey(cell.x, cell.y) !== coreId);
  const specialCells = shuffle(nonCoreActive, rng);
  const catalystIds = new Set(specialCells.splice(0, config.catalystCount).map((cell) => tileKey(cell.x, cell.y)));
  const neuralIds = new Set(specialCells.splice(0, config.neuralCount).map((cell) => tileKey(cell.x, cell.y)));
  const stellarIds = new Set(specialCells.splice(0, config.stellarCount).map((cell) => tileKey(cell.x, cell.y)));

  return allCells.map((cell) => {
    const id = tileKey(cell.x, cell.y);
    if (blockerIds.has(id)) {
      return { id, x: cell.x, y: cell.y, kind: 'blocker', ports: [], rotation: 0, solutionRotation: 0, required: false, locked: true };
    }
    const solutionRotation = 0;
    let rotation = Math.floor(rng() * 4);
    if (id === coreId) rotation = solutionRotation;
    const ports = Array.from(edges.get(id) ?? []) as Dir[];
    const kind: TileKind = id === coreId
      ? 'core'
      : stellarIds.has(id)
        ? 'stellar'
        : neuralIds.has(id)
          ? 'neural'
          : catalystIds.has(id)
            ? 'catalyst'
            : 'helix';
    return {
      id,
      x: cell.x,
      y: cell.y,
      kind,
      ports,
      rotation,
      solutionRotation,
      required: true,
      locked: id === coreId,
    };
  });
}

function analyzeLattice(tiles: LatticeTile[]): LatticeAnalysis {
  const byId = new Map(tiles.map((tile) => [tile.id, tile]));
  const core = tiles.find((tile) => tile.kind === 'core');
  const powered = new Set<string>();
  const openEnds = new Set<string>();
  if (!core) return { powered, openEnds, complete: false };

  const queue = [core.id];
  powered.add(core.id);

  while (queue.length > 0) {
    const id = queue.shift()!;
    const tile = byId.get(id);
    if (!tile) continue;
    const ports = rotatePorts(tile.ports, tile.rotation);
    for (const port of ports) {
      const delta = DIR_DELTA[port];
      const neighbor = byId.get(tileKey(tile.x + delta.dx, tile.y + delta.dy));
      const neighborPorts = neighbor ? rotatePorts(neighbor.ports, neighbor.rotation) : [];
      const connectsBack = Boolean(neighbor && neighbor.kind !== 'blocker' && neighborPorts.includes(OPPOSITE[port]));
      if (!connectsBack) {
        openEnds.add(`${id}:${port}`);
        continue;
      }
      if (!powered.has(neighbor!.id)) {
        powered.add(neighbor!.id);
        queue.push(neighbor!.id);
      }
    }
  }

  for (const tile of tiles) {
    if (!tile.required || tile.kind === 'blocker') continue;
    const ports = rotatePorts(tile.ports, tile.rotation);
    for (const port of ports) {
      const delta = DIR_DELTA[port];
      const neighbor = byId.get(tileKey(tile.x + delta.dx, tile.y + delta.dy));
      const connectsBack = Boolean(neighbor && neighbor.kind !== 'blocker' && rotatePorts(neighbor.ports, neighbor.rotation).includes(OPPOSITE[port]));
      if (!connectsBack) openEnds.add(`${tile.id}:${port}`);
    }
  }

  const requiredTiles = tiles.filter((tile) => tile.required && tile.kind !== 'blocker');
  const complete = requiredTiles.every((tile) => powered.has(tile.id)) && openEnds.size === 0;
  return { powered, openEnds, complete };
}

/** Small decorative double-helix with energy flowing along the strands. */
function MiniHelix({ color }: { color: string }) {
  const h = 46;
  const w = 26;
  const cx = w / 2;
  const amp = 7;
  const left: string[] = [];
  const right: string[] = [];
  for (let y = 0; y <= h; y += 2) {
    const o = amp * Math.sin((y / h) * Math.PI * 3);
    left.push(`${cx + o},${y}`);
    right.push(`${cx - o},${y}`);
  }
  const rungs = [];
  for (let y = 4; y < h; y += 8) {
    const o = amp * Math.sin((y / h) * Math.PI * 3);
    rungs.push(<line key={y} x1={cx + o} y1={y} x2={cx - o} y2={y} stroke={`${color}88`} strokeWidth={1} />);
  }
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      {rungs}
      <polyline points={left.join(' ')} fill="none" stroke={color} strokeWidth={1.6}
        strokeDasharray="6 6" style={{ animation: 'dnac-flow 1.4s linear infinite' }} />
      <polyline points={right.join(' ')} fill="none" stroke={color} strokeWidth={1.6}
        strokeDasharray="6 6" style={{ animation: 'dnac-flow 1.4s linear infinite reverse' }} />
    </svg>
  );
}

function portPath(port: Dir, size: number): string {
  const c = size / 2;
  if (port === 'n') return `M ${c} ${c} L ${c} 6`;
  if (port === 'e') return `M ${c} ${c} L ${size - 6} ${c}`;
  if (port === 's') return `M ${c} ${c} L ${c} ${size - 6}`;
  return `M ${c} ${c} L 6 ${c}`;
}

function TileGlyph({
  tile,
  powered,
  open,
  accent,
  onRotate,
}: {
  tile: LatticeTile;
  powered: boolean;
  open: boolean;
  accent: string;
  onRotate: () => void;
}) {
  const size = 54;
  const color = tile.kind === 'core' ? accent : KIND_COLOR[tile.kind];
  const clickable = !tile.locked && tile.kind !== 'blocker';
  const ports = rotatePorts(tile.ports, tile.rotation);

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onRotate}
      aria-label={tile.kind}
      style={{
        width: size,
        height: size,
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: clickable ? 'pointer' : 'default',
        fontFamily: 'monospace',
        position: 'relative',
      }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ overflow: 'visible' }}>
        <rect
          x="5"
          y="5"
          width={size - 10}
          height={size - 10}
          rx="8"
          fill={tile.kind === 'blocker' ? 'rgba(20,30,45,0.55)' : powered ? `${color}20` : 'rgba(5,10,20,0.58)'}
          stroke={open ? '#cc4444' : powered ? color : '#334455'}
          strokeWidth={powered ? 1.7 : 1}
          strokeDasharray={tile.kind === 'blocker' ? '4 4' : undefined}
          style={{ transition: 'fill .18s, stroke .18s', animation: powered ? 'dnac-rotate .28s ease-out' : undefined }}
        />
        {tile.kind !== 'blocker' && ports.map((port) => (
          <path
            key={port}
            d={portPath(port, size)}
            fill="none"
            stroke={powered ? color : '#556677'}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={powered ? '8 7' : undefined}
            style={{ animation: powered ? 'dnac-flow 1.2s linear infinite' : undefined }}
          />
        ))}
        {tile.kind !== 'blocker' && (
          <>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={tile.kind === 'core' ? 10 : 7}
              fill={powered ? color : '#162333'}
              stroke={color}
              strokeWidth="1.2"
              style={{ animation: tile.kind === 'core' ? 'dnac-core 1.8s ease-in-out infinite' : undefined }}
            />
            {tile.kind !== 'helix' && tile.kind !== 'core' && (
              <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontFamily="monospace" fontSize="9" fill="#020510" fontWeight="700">
                {tile.kind === 'catalyst' ? 'CAT' : tile.kind === 'neural' ? 'NR' : 'ST'}
              </text>
            )}
          </>
        )}
      </svg>
    </button>
  );
}

/**
 * Spark-of-life Genome Lattice constructor — the player rotates molecular
 * segments until the spark core can power the full living circuit.
 */
export function DnaConstructorGame({
  onSuccess,
  onClose,
}: {
  onSuccess: (spark: LifeSparkType) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [spark, setSpark] = useState<LifeSparkType | null>(null);
  const [tiles, setTiles] = useState<LatticeTile[]>([]);
  const [status, setStatus] = useState<GameStatus>('select');
  const [moves, setMoves] = useState(0);
  const [session, setSession] = useState(1);
  const successRef = useRef(false);

  const accent = spark ? SPARK_COLOR[spark] : '#7bb8ff';
  const analysis = useMemo(() => analyzeLattice(tiles), [tiles]);
  const config = spark ? configForSpark(spark) : null;
  const activeCount = tiles.filter((tile) => tile.required && tile.kind !== 'blocker').length;
  const poweredCount = tiles.filter((tile) => tile.required && analysis.powered.has(tile.id)).length;
  const stabilityPct = activeCount > 0
    ? Math.round((poweredCount / activeCount) * 100 - Math.min(18, analysis.openEnds.size * 3))
    : 0;
  const stability = Math.max(0, Math.min(100, stabilityPct));
  const stabilityColor = stability > 80 ? '#44ff88' : stability > 45 ? '#ffcf66' : '#ff8844';

  useEffect(() => {
    if (!spark || status !== 'play' || !analysis.complete || successRef.current) return;
    successRef.current = true;
    setStatus('igniting');
    const id = window.setTimeout(() => {
      setStatus('won');
      onSuccess(spark);
    }, 900);
    return () => window.clearTimeout(id);
  }, [analysis.complete, onSuccess, spark, status]);

  function startSpark(s: LifeSparkType) {
    const nextSession = session + 1;
    setSession(nextSession);
    setSpark(s);
    setTiles(generateLatticePuzzle(s, nextSession));
    setMoves(0);
    successRef.current = false;
    setStatus('play');
  }

  function rotateTile(tileId: string) {
    if (status !== 'play') return;
    setTiles((prev) => prev.map((tile) => (
      tile.id === tileId && !tile.locked && tile.kind !== 'blocker'
        ? { ...tile, rotation: (tile.rotation + 1) % 4 }
        : tile
    )));
    setMoves((prev) => prev + 1);
  }

  return createPortal((
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 12000,
        background: 'rgba(2,5,16,0.84)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, fontFamily: 'monospace',
      }}
    >
      <style>{DNAC_CSS}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(620px, 96vw)', maxHeight: '92vh', overflowY: 'auto',
          background: 'rgba(10,15,25,0.97)', border: `1px solid ${accent}`,
          borderRadius: 6, boxShadow: `0 0 32px ${accent}33`, padding: 18,
          // CSS var consumed by the keyframes.
          ['--dnac-accent' as string]: accent,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <MiniHelix color={accent} />
            <div>
              <div style={{ color: accent, fontSize: 14, fontWeight: 700, letterSpacing: 0.5 }}>{t('lab.dna_title')}</div>
              <div style={{ color: '#667788', fontSize: 9.5 }}>{t('lab.dna_subtitle')}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #334455', color: '#8899aa', borderRadius: 3, width: 24, height: 24, cursor: 'pointer', lineHeight: 1, alignSelf: 'flex-start' }}>×</button>
        </div>

        {!spark ? (
          <>
            <div style={{ color: '#8899aa', fontSize: 11, marginBottom: 12, lineHeight: 1.5 }}>{t('lab.dna_choose')}</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {SPARK_ORDER.map((s) => {
                const c = SPARK_COLOR[s];
                const d = SPARK_DIFFICULTY[s];
                const puzzle = configForSpark(s);
                return (
                  <button
                    key={s}
                    onClick={() => startSpark(s)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                      background: `${c}12`, border: `1px solid ${c}66`, borderRadius: 6,
                      padding: '10px 12px', cursor: 'pointer', fontFamily: 'monospace',
                    }}
                  >
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: c, boxShadow: `0 0 10px ${c}`, flexShrink: 0 }} />
                    <span style={{ flex: 1, color: '#cfe3ff', fontSize: 12 }}>{t(`lab.spark.${s}` as 'lab.spark.primordial')}</span>
                    <span style={{ display: 'flex', gap: 6, color: '#8899aa', fontSize: 9 }}>
                      <span>{puzzle.width}x{puzzle.height}</span>
                      <span style={{ color: '#556677' }}>·</span>
                      <span>{t('lab.dna_nodes', { count: d.length })}</span>
                      {puzzle.blockerCount > 0 && <><span style={{ color: '#556677' }}>·</span><span style={{ color: '#ffb454' }}>{t('lab.dna_blockers', { count: puzzle.blockerCount })}</span></>}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* Signal integrity */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ color: '#8899aa', fontSize: 10 }}>{t('lab.dna_progress', { done: poweredCount, total: activeCount })}</span>
              <span style={{ color: stabilityColor, fontSize: 9.5, letterSpacing: 0.5 }}>{t('lab.dna_stability')} {stabilityPct}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(5,10,20,0.7)', overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ width: `${stability}%`, height: '100%', background: stabilityColor, transition: 'width 0.3s, background 0.3s' }} />
            </div>

            <div style={{ color: '#7d93ab', fontSize: 10.5, marginBottom: 10, textAlign: 'center' }}>
              {status === 'igniting' || status === 'won' ? t('lab.dna_igniting') : t('lab.dna_select')}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: config ? `repeat(${config.width}, 54px)` : undefined,
              justifyContent: 'center',
              gap: 9,
              padding: 14,
              borderRadius: 8,
              border: `1px solid ${accent}33`,
              background: `radial-gradient(80% 90% at 50% 40%, ${accent}10, rgba(5,10,20,0.74))`,
              boxShadow: `inset 0 0 34px ${accent}0f`,
            }}>
              {tiles.map((tile) => {
                const open = DIRS.some((dir) => analysis.openEnds.has(`${tile.id}:${dir}`));
                return (
                  <TileGlyph
                    key={tile.id}
                    tile={tile}
                    powered={analysis.powered.has(tile.id)}
                    open={open}
                    accent={accent}
                    onRotate={() => rotateTile(tile.id)}
                  />
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
              <div style={{ border: '1px solid #2a3a4a', borderRadius: 5, padding: 8, color: '#8899aa', fontSize: 9 }}>
                <div style={{ color: '#667788', textTransform: 'uppercase', letterSpacing: 1 }}>{t('lab.dna_moves')}</div>
                <div style={{ color: '#cfe3ff', fontSize: 14, marginTop: 4 }}>{moves}</div>
              </div>
              <div style={{ border: '1px solid #2a3a4a', borderRadius: 5, padding: 8, color: '#8899aa', fontSize: 9 }}>
                <div style={{ color: '#667788', textTransform: 'uppercase', letterSpacing: 1 }}>{t('lab.dna_open_ends')}</div>
                <div style={{ color: analysis.openEnds.size === 0 ? '#44ff88' : '#ff8844', fontSize: 14, marginTop: 4 }}>{analysis.openEnds.size}</div>
              </div>
              <div style={{ border: '1px solid #2a3a4a', borderRadius: 5, padding: 8, color: '#8899aa', fontSize: 9 }}>
                <div style={{ color: '#667788', textTransform: 'uppercase', letterSpacing: 1 }}>{t('lab.dna_powered')}</div>
                <div style={{ color: '#cfe3ff', fontSize: 14, marginTop: 4 }}>{poweredCount}/{activeCount}</div>
              </div>
            </div>

            {status === 'won' && (
              <div style={{ textAlign: 'center', padding: '6px 0' }}>
                <div style={{ color: accent, fontSize: 13, fontWeight: 700, margin: '12px 0 10px', animation: 'dnac-rise .55s ease-out' }}>{t('lab.dna_won')}</div>
                <button onClick={onClose} style={{ background: `${accent}22`, border: `1px solid ${accent}`, color: '#eafff2', borderRadius: 6, padding: '10px 18px', cursor: 'pointer', fontFamily: 'monospace', letterSpacing: 1 }}>{t('lab.dna_collect')}</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  ), document.body);
}
