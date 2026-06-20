import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CosmicBattleRewardBundle, ShotOutcome } from './cosmic-battle-engine';
import {
  allShipsSunk,
  chooseAiShot,
  createBattleRng,
  createInitialBoards,
  fireAt,
  pointKey,
  rollCosmicBattleReward,
  type BattleBoard,
  type CosmicBattlePhase,
} from './cosmic-battle-engine';

interface CosmicBattlePageProps {
  seed: string;
  onExit: () => void;
  onReward: (reward: CosmicBattleRewardBundle) => void;
}

type ShotVisual = { side: 'player' | 'enemy'; x: number; y: number; hit: boolean } | null;

const ASSET = {
  background: '/cosmic-battle/tactical-nebula.svg',
  ally: '/cosmic-battle/ally-fleet.svg',
  enemy: '/cosmic-battle/enemy-fleet.svg',
};

function boardSize(): number {
  if (typeof window === 'undefined') return 10;
  return window.innerWidth < 760 ? 8 : 10;
}

function fleetIntegrity(board: BattleBoard): number {
  const total = board.ships.reduce((sum, ship) => sum + ship.cells.length, 0);
  const hits = board.ships.reduce((sum, ship) => sum + ship.hits.length, 0);
  return Math.max(0, Math.round(((total - hits) / total) * 100));
}

export const CosmicBattlePage: React.FC<CosmicBattlePageProps> = ({ seed, onExit, onReward }) => {
  const { t } = useTranslation();
  const size = useMemo(boardSize, []);
  const initialBoards = useMemo(() => createInitialBoards(size, seed), [seed, size]);
  const [playerBoard, setPlayerBoard] = useState(initialBoards.player);
  const [enemyBoard, setEnemyBoard] = useState(initialBoards.enemy);
  const [phase, setPhase] = useState<CosmicBattlePhase>('player_turn');
  const [shotVisual, setShotVisual] = useState<ShotVisual>(null);
  const [lastOutcome, setLastOutcome] = useState<ShotOutcome | null>(null);
  const [rewardResult, setRewardResult] = useState<CosmicBattleRewardBundle | null>(null);
  const aiRngRef = useRef(createBattleRng(`${seed}:ai`));
  const playerBoardRef = useRef(playerBoard);
  const enemyBoardRef = useRef(enemyBoard);
  const rewardGrantedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => { playerBoardRef.current = playerBoard; }, [playerBoard]);
  useEffect(() => { enemyBoardRef.current = enemyBoard; }, [enemyBoard]);
  useEffect(() => () => timersRef.current.forEach((timer) => window.clearTimeout(timer)), []);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const timer = window.setTimeout(fn, delay);
    timersRef.current.push(timer);
  }, []);

  const grantVictory = useCallback(() => {
    if (rewardGrantedRef.current) return;
    rewardGrantedRef.current = true;
    const reward = rollCosmicBattleReward(seed, Date.now());
    setRewardResult(reward);
    onReward(reward);
  }, [onReward, seed]);

  const runAiTurn = useCallback(() => {
    const target = chooseAiShot(playerBoardRef.current, aiRngRef.current);
    setShotVisual({ side: 'enemy', x: target.x, y: target.y, hit: false });
    setPhase('animating');
    schedule(() => {
      const resolved = fireAt(playerBoardRef.current, target.x, target.y);
      setPlayerBoard(resolved.board);
      setLastOutcome(resolved.outcome);
      setShotVisual({ side: 'enemy', x: target.x, y: target.y, hit: resolved.outcome.hit });
      if (allShipsSunk(resolved.board)) {
        setPhase('lost');
      } else {
        schedule(() => {
          setShotVisual(null);
          setPhase('player_turn');
        }, 700);
      }
    }, 620);
  }, [schedule]);

  const handleEnemyCell = useCallback((x: number, y: number) => {
    if (phase !== 'player_turn' || enemyBoard.shots[pointKey(x, y)]) return;
    setShotVisual({ side: 'player', x, y, hit: false });
    setPhase('animating');
    schedule(() => {
      const resolved = fireAt(enemyBoardRef.current, x, y);
      setEnemyBoard(resolved.board);
      setLastOutcome(resolved.outcome);
      setShotVisual({ side: 'player', x, y, hit: resolved.outcome.hit });
      if (allShipsSunk(resolved.board)) {
        setPhase('won');
        grantVictory();
      } else {
        schedule(runAiTurn, 850);
      }
    }, 620);
  }, [enemyBoard.shots, grantVictory, phase, runAiTurn, schedule]);

  const restart = useCallback(() => {
    const nextSeed = `${seed}:retry:${Date.now()}`;
    const boards = createInitialBoards(size, nextSeed);
    aiRngRef.current = createBattleRng(`${nextSeed}:ai`);
    rewardGrantedRef.current = false;
    setPlayerBoard(boards.player);
    setEnemyBoard(boards.enemy);
    setPhase('player_turn');
    setShotVisual(null);
    setLastOutcome(null);
    setRewardResult(null);
  }, [seed, size]);

  const statusKey = phase === 'player_turn'
    ? 'cosmic_battle.status.player_turn'
    : phase === 'ai_turn' || (phase === 'animating' && shotVisual?.side === 'enemy')
      ? 'cosmic_battle.status.ai_turn'
      : phase === 'won'
        ? 'cosmic_battle.status.victory'
        : phase === 'lost'
          ? 'cosmic_battle.status.defeat'
          : 'cosmic_battle.status.animating';

  return (
    <div className="cosmicBattleRoot">
      <style>{`
        .cosmicBattleRoot {
          position: fixed; inset: 0; z-index: 1400; overflow: hidden;
          font-family: monospace; color: #aabbcc; background: #020510;
        }
        .cosmicBattleRoot::before {
          content: ''; position: absolute; inset: 0;
          background-image: linear-gradient(90deg, rgba(2,5,16,0.24), rgba(2,5,16,0.72)), url(${ASSET.background});
          background-size: cover; background-position: center; transform: scale(1.03);
          animation: cbDrift 20s ease-in-out infinite alternate;
        }
        .cosmicBattleRoot::after {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(circle at 50% 50%, transparent 0 45%, rgba(2,5,16,0.78) 100%);
          pointer-events: none;
        }
        .cbShell { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; padding: 18px; box-sizing: border-box; gap: 14px; }
        .cbHeader { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; padding: 14px; border: 1px solid #334455; background: rgba(5,10,20,0.86); backdrop-filter: blur(12px); border-radius: 6px; }
        .cbTitle { color: #d8ecff; font-size: 20px; letter-spacing: 0.16em; text-transform: uppercase; }
        .cbSub { color: #8899aa; font-size: 11px; margin-top: 6px; max-width: 760px; line-height: 1.5; }
        .cbStatus { color: #7bb8ff; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; border: 1px solid #446688; padding: 8px 10px; background: rgba(8,18,32,0.8); }
        .cbBack { color: #aabbcc; background: rgba(10,15,25,0.86); border: 1px solid #334455; border-radius: 4px; padding: 9px 12px; cursor: pointer; font-family: monospace; }
        .cbStage { flex: 1; display: grid; grid-template-columns: 1fr 1.15fr 1fr; gap: 14px; min-height: 0; }
        .cbIntel, .cbBoardPanel { border: 1px solid #334455; background: rgba(5,10,20,0.82); border-radius: 6px; overflow: hidden; box-shadow: 0 0 38px rgba(0,0,0,0.34); }
        .cbIntelArt { height: 42%; min-height: 150px; background-size: cover; background-position: center; border-bottom: 1px solid #334455; opacity: 0.86; }
        .cbIntelBody { padding: 14px; }
        .cbIntelTitle { color: #d8ecff; letter-spacing: 0.12em; text-transform: uppercase; font-size: 12px; }
        .cbMeter { height: 8px; background: rgba(51,68,85,0.5); border-radius: 10px; overflow: hidden; margin: 10px 0 14px; }
        .cbMeter > span { display: block; height: 100%; background: linear-gradient(90deg, #44ff88, #7bb8ff); box-shadow: 0 0 14px rgba(123,184,255,0.6); }
        .cbGridWrap { display: flex; flex-direction: column; height: 100%; padding: 14px; box-sizing: border-box; }
        .cbGridTitle { display: flex; justify-content: space-between; color: #8899aa; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px; }
        .cbGrid { display: grid; gap: 3px; flex: 1; min-height: 0; aspect-ratio: 1; margin: auto; width: min(100%, 68vh); }
        .cbCell { position: relative; border: 1px solid rgba(68,102,136,0.62); background: rgba(8,18,32,0.78); color: #aabbcc; font-family: monospace; cursor: crosshair; overflow: hidden; }
        .cbCell::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(123,184,255,0.12), transparent 45%); opacity: 0; transition: opacity 0.18s ease; }
        .cbCell:hover::before { opacity: 1; }
        .cbCell.ship { background: rgba(31,58,80,0.82); border-color: #446688; }
        .cbCell.miss { background: rgba(51,68,85,0.48); }
        .cbCell.hit { background: rgba(255,136,68,0.28); border-color: #ff8844; animation: cbImpact 0.8s ease both; }
        .cbCell.sunk { background: rgba(204,68,68,0.44); border-color: #cc4444; animation: cbSunk 1.1s ease both; }
        .cbCell.miss::after { content: ''; position: absolute; width: 26%; height: 26%; border: 1px solid #667788; border-radius: 50%; left: 37%; top: 37%; }
        .cbCell.hit::after, .cbCell.sunk::after { content: ''; position: absolute; inset: 23%; border-radius: 50%; background: #ff8844; box-shadow: 0 0 20px #ff8844; }
        .cbMissile { position: absolute; width: 120px; height: 2px; background: linear-gradient(90deg, transparent, #7bb8ff, #fff); z-index: 4; top: 50%; left: 50%; transform-origin: left center; animation: cbMissile 0.62s ease-out both; }
        .cbMissile.enemy { background: linear-gradient(90deg, transparent, #ff8844, #fff); transform: rotate(180deg); }
        .cbOutcome { color: #8899aa; font-size: 11px; min-height: 18px; margin-top: 10px; text-transform: uppercase; letter-spacing: 0.08em; }
        .cbModalShade { position: fixed; inset: 0; z-index: 6; background: rgba(2,5,16,0.72); display: flex; align-items: center; justify-content: center; padding: 18px; }
        .cbModal { width: min(520px, 100%); border: 1px solid #446688; border-radius: 8px; background: rgba(5,10,20,0.96); padding: 22px; box-shadow: 0 0 60px rgba(68,136,170,0.24); }
        .cbModalTitle { color: #d8ecff; font-size: 18px; letter-spacing: 0.14em; text-transform: uppercase; }
        .cbReward { margin-top: 14px; padding: 14px; border: 1px solid #334455; background: rgba(10,15,25,0.88); color: #44ff88; }
        .cbActions { display: flex; gap: 10px; margin-top: 18px; flex-wrap: wrap; }
        .cbPrimary { background: #17304a; border: 1px solid #7bb8ff; color: #d8ecff; border-radius: 4px; padding: 10px 14px; font-family: monospace; cursor: pointer; }
        @keyframes cbDrift { from { transform: scale(1.03) translate3d(-10px,-8px,0); } to { transform: scale(1.07) translate3d(12px,8px,0); } }
        @keyframes cbImpact { 0% { transform: scale(1); } 35% { transform: scale(1.08); box-shadow: 0 0 22px #ff8844; } 100% { transform: scale(1); } }
        @keyframes cbSunk { 0% { filter: brightness(1.8); } 100% { filter: brightness(0.72); } }
        @keyframes cbMissile { from { opacity: 0; transform: translateX(-260px) scaleX(0.2); } 20% { opacity: 1; } to { opacity: 0; transform: translateX(120px) scaleX(1); } }
        @media (max-width: 980px) {
          .cbStage { grid-template-columns: 1fr; overflow: auto; }
          .cbIntel { display: none; }
          .cbHeader { flex-direction: column; }
          .cbGrid { width: min(100%, 78vw); }
        }
      `}</style>
      <div className="cbShell">
        <div className="cbHeader">
          <div>
            <div className="cbTitle">{t('cosmic_battle.title')}</div>
            <div className="cbSub">{t('cosmic_battle.subtitle')}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <div className="cbStatus">{t(statusKey)}</div>
            <button className="cbBack" onClick={onExit}>{t('cosmic_battle.back')}</button>
          </div>
        </div>

        <div className="cbStage">
          <FleetIntel side="ally" board={playerBoard} />
          <BattleGrid
            title={t('cosmic_battle.enemy_grid')}
            board={enemyBoard}
            revealShips={false}
            interactive={phase === 'player_turn'}
            shotVisual={shotVisual?.side === 'player' ? shotVisual : null}
            onCell={handleEnemyCell}
            footer={lastOutcome && shotVisual?.side === 'player' ? t(lastOutcome.hit ? 'cosmic_battle.outcome.hit' : 'cosmic_battle.outcome.miss') : t('cosmic_battle.target_hint')}
          />
          <BattleGrid
            title={t('cosmic_battle.ally_grid')}
            board={playerBoard}
            revealShips
            interactive={false}
            shotVisual={shotVisual?.side === 'enemy' ? shotVisual : null}
            footer={lastOutcome && shotVisual?.side === 'enemy' ? t(lastOutcome.hit ? 'cosmic_battle.outcome.enemy_hit' : 'cosmic_battle.outcome.enemy_miss') : t('cosmic_battle.defense_hint')}
          />
        </div>
      </div>

      {(phase === 'won' || phase === 'lost') && (
        <div className="cbModalShade">
          <div className="cbModal">
            <div className="cbModalTitle">{t(phase === 'won' ? 'cosmic_battle.victory_title' : 'cosmic_battle.defeat_title')}</div>
            <p style={{ color: '#8899aa', lineHeight: 1.6 }}>
              {t(phase === 'won' ? 'cosmic_battle.victory_body' : 'cosmic_battle.defeat_body')}
            </p>
            {rewardResult && (
              <div className="cbReward">
                {t('cosmic_battle.reward_line', {
                  quarks: rewardResult.quarks,
                  reward: rewardLabel(t, rewardResult),
                })}
              </div>
            )}
            <div className="cbActions">
              <button className="cbPrimary" onClick={restart}>{t('cosmic_battle.play_again')}</button>
              <button className="cbBack" onClick={onExit}>{t('cosmic_battle.return_hangar')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function FleetIntel({ side, board }: { side: 'ally' | 'enemy'; board: BattleBoard }) {
  const { t } = useTranslation();
  const integrity = fleetIntegrity(board);
  return (
    <div className="cbIntel">
      <div className="cbIntelArt" style={{ backgroundImage: `url(${side === 'ally' ? ASSET.ally : ASSET.enemy})` }} />
      <div className="cbIntelBody">
        <div className="cbIntelTitle">{t(side === 'ally' ? 'cosmic_battle.ally_fleet' : 'cosmic_battle.enemy_fleet')}</div>
        <div className="cbMeter"><span style={{ width: `${integrity}%` }} /></div>
        <div style={{ color: '#8899aa', fontSize: 11, lineHeight: 1.6 }}>
          {t('cosmic_battle.integrity', { value: integrity })}
        </div>
      </div>
    </div>
  );
}

function BattleGrid({
  title,
  board,
  revealShips,
  interactive,
  shotVisual,
  footer,
  onCell,
}: {
  title: string;
  board: BattleBoard;
  revealShips: boolean;
  interactive: boolean;
  shotVisual: ShotVisual;
  footer: string;
  onCell?: (x: number, y: number) => void;
}) {
  const shipCells = new Set(board.ships.flatMap((ship) => ship.cells.map((cell) => pointKey(cell.x, cell.y))));
  const cells = [];
  for (let y = 0; y < board.size; y += 1) {
    for (let x = 0; x < board.size; x += 1) {
      const key = pointKey(x, y);
      const shot = board.shots[key];
      const hasShip = revealShips && shipCells.has(key);
      const visual = shotVisual?.x === x && shotVisual.y === y;
      cells.push(
        <button
          key={key}
          className={`cbCell ${hasShip ? 'ship' : ''} ${shot ?? ''}`}
          onClick={() => onCell?.(x, y)}
          disabled={!interactive || Boolean(shot)}
          aria-label={`${title} ${x + 1}:${y + 1}`}
        >
          {visual && <span className={`cbMissile ${shotVisual?.side === 'enemy' ? 'enemy' : ''}`} />}
        </button>,
      );
    }
  }
  return (
    <div className="cbBoardPanel">
      <div className="cbGridWrap">
        <div className="cbGridTitle"><span>{title}</span><span>{board.size}x{board.size}</span></div>
        <div className="cbGrid" style={{ gridTemplateColumns: `repeat(${board.size}, 1fr)` }}>
          {cells}
        </div>
        <div className="cbOutcome">{footer}</div>
      </div>
    </div>
  );
}

function rewardLabel(t: ReturnType<typeof useTranslation>['t'], bundle: CosmicBattleRewardBundle): string {
  const reward = bundle.reward;
  if (reward.kind === 'resource') {
    return t(`cosmic_battle.reward.${reward.resource}`, { amount: reward.amount });
  }
  if (reward.kind === 'payload') {
    return t('cosmic_battle.reward.payload', { amount: reward.amount, item: t(`planet_missions.payload.${reward.payload}`) });
  }
  if (reward.kind === 'ship') {
    return t('cosmic_battle.reward.ship', { amount: reward.amount, item: t(`planet_missions.payload.${reward.shipType}`) });
  }
  if (reward.kind === 'spark') {
    return t('cosmic_battle.reward.spark', { amount: reward.amount, item: t(`cosmic_battle.spark.${reward.spark}`) });
  }
  return t('cosmic_battle.reward.ingredient', { amount: reward.amount, item: t(`cosmic_battle.ingredient.${reward.ingredient}`) });
}
