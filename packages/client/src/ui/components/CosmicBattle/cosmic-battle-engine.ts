import type { LifeSparkType, ProducibleType } from '@nebulife/core';

export type CosmicBattleSide = 'player' | 'enemy';
export type CosmicBattlePhase = 'player_turn' | 'ai_turn' | 'animating' | 'won' | 'lost';
export type CosmicBattleCellState = 'unknown' | 'miss' | 'hit' | 'sunk';
export type CosmicBattleResource = 'minerals' | 'volatiles' | 'isotopes' | 'water';

export interface BattlePoint {
  x: number;
  y: number;
}

export interface BattleShip {
  id: string;
  nameKey: string;
  size: number;
  cells: BattlePoint[];
  hits: BattlePoint[];
}

export interface BattleBoard {
  size: number;
  ships: BattleShip[];
  shots: Record<string, CosmicBattleCellState>;
}

export interface ShotOutcome {
  x: number;
  y: number;
  hit: boolean;
  sunk: boolean;
  shipId?: string;
  shipNameKey?: string;
}

export type CosmicBattleReward =
  | { kind: 'resource'; resource: CosmicBattleResource; amount: number }
  | { kind: 'payload'; payload: ProducibleType; amount: number }
  | { kind: 'ship'; shipType: ProducibleType; amount: number }
  | { kind: 'spark'; spark: LifeSparkType; amount: number }
  | { kind: 'ingredient'; ingredient: string; amount: number };

export interface CosmicBattleRewardBundle {
  quarks: number;
  reward: CosmicBattleReward;
}

const FLEET_SPEC = [
  { id: 'carrier', nameKey: 'cosmic_battle.ship.carrier', size: 5 },
  { id: 'cruiser', nameKey: 'cosmic_battle.ship.cruiser', size: 4 },
  { id: 'frigate', nameKey: 'cosmic_battle.ship.frigate', size: 3 },
  { id: 'corvette', nameKey: 'cosmic_battle.ship.corvette', size: 3 },
  { id: 'drone', nameKey: 'cosmic_battle.ship.drone', size: 2 },
] as const;

const PAYLOAD_REWARDS: ProducibleType[] = [
  'survey_probe',
  'orbital_satellite',
  'surface_rover',
  'atmosphere_probe',
  'scout_drone',
  'mining_drone',
  'orbital_telescope_unit',
];

const SHIP_REWARDS: ProducibleType[] = [
  'research_shuttle',
  'rover_dropcraft',
  'transport_small',
  'transport_large',
  'terraform_freighter',
];

const SPARK_REWARDS: LifeSparkType[] = ['primordial', 'adaptive', 'neural', 'stellar'];
const INGREDIENT_REWARDS = ['amino_seed', 'lipid_membrane', 'catalyst_core', 'neural_spore', 'stellar_enzyme'];

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createBattleRng(seedInput: string | number): () => number {
  let seed = typeof seedInput === 'number' ? seedInput >>> 0 : hashString(seedInput);
  return () => {
    seed = (seed + 0x6D2B79F5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pointKey(x: number, y: number): string {
  return `${x}:${y}`;
}

function samePoint(a: BattlePoint, b: BattlePoint): boolean {
  return a.x === b.x && a.y === b.y;
}

function collides(cells: BattlePoint[], ships: BattleShip[]): boolean {
  return ships.some((ship) => ship.cells.some((cell) => cells.some((next) => samePoint(cell, next))));
}

function buildCells(x: number, y: number, size: number, horizontal: boolean): BattlePoint[] {
  return Array.from({ length: size }, (_, i) => ({ x: x + (horizontal ? i : 0), y: y + (horizontal ? 0 : i) }));
}

export function createBattleBoard(size: number, seed: string): BattleBoard {
  const rng = createBattleRng(seed);
  const ships: BattleShip[] = [];

  for (const spec of FLEET_SPEC) {
    let placed: BattlePoint[] | null = null;
    for (let attempt = 0; attempt < 160 && !placed; attempt += 1) {
      const horizontal = rng() > 0.5;
      const maxX = horizontal ? size - spec.size : size - 1;
      const maxY = horizontal ? size - 1 : size - spec.size;
      const x = Math.floor(rng() * (maxX + 1));
      const y = Math.floor(rng() * (maxY + 1));
      const cells = buildCells(x, y, spec.size, horizontal);
      if (!collides(cells, ships)) placed = cells;
    }
    ships.push({
      id: `${spec.id}-${ships.length}`,
      nameKey: spec.nameKey,
      size: spec.size,
      cells: placed ?? buildCells(0, ships.length, spec.size, true),
      hits: [],
    });
  }

  return { size, ships, shots: {} };
}

export function createInitialBoards(size: number, seed: string): { player: BattleBoard; enemy: BattleBoard } {
  return {
    player: createBattleBoard(size, `${seed}:player`),
    enemy: createBattleBoard(size, `${seed}:enemy`),
  };
}

export function fireAt(board: BattleBoard, x: number, y: number): { board: BattleBoard; outcome: ShotOutcome } {
  const key = pointKey(x, y);
  if (board.shots[key]) {
    return { board, outcome: { x, y, hit: board.shots[key] !== 'miss', sunk: false } };
  }

  let hitShip: BattleShip | undefined;
  for (const ship of board.ships) {
    if (ship.cells.some((cell) => cell.x === x && cell.y === y)) {
      hitShip = ship;
      break;
    }
  }

  if (!hitShip) {
    return {
      board: { ...board, shots: { ...board.shots, [key]: 'miss' } },
      outcome: { x, y, hit: false, sunk: false },
    };
  }

  const updatedShips = board.ships.map((ship) => {
    if (ship.id !== hitShip?.id) return ship;
    const alreadyHit = ship.hits.some((cell) => cell.x === x && cell.y === y);
    return alreadyHit ? ship : { ...ship, hits: [...ship.hits, { x, y }] };
  });
  const updatedShip = updatedShips.find((ship) => ship.id === hitShip?.id)!;
  const sunk = updatedShip.hits.length >= updatedShip.cells.length;
  const shots = { ...board.shots, [key]: sunk ? 'sunk' : 'hit' as CosmicBattleCellState };
  if (sunk) {
    for (const cell of updatedShip.cells) shots[pointKey(cell.x, cell.y)] = 'sunk';
  }

  return {
    board: { ...board, ships: updatedShips, shots },
    outcome: { x, y, hit: true, sunk, shipId: updatedShip.id, shipNameKey: updatedShip.nameKey },
  };
}

export function allShipsSunk(board: BattleBoard): boolean {
  return board.ships.every((ship) => ship.hits.length >= ship.cells.length);
}

function neighbors(point: BattlePoint, size: number): BattlePoint[] {
  return [
    { x: point.x + 1, y: point.y },
    { x: point.x - 1, y: point.y },
    { x: point.x, y: point.y + 1 },
    { x: point.x, y: point.y - 1 },
  ].filter((p) => p.x >= 0 && p.y >= 0 && p.x < size && p.y < size);
}

export function chooseAiShot(board: BattleBoard, rng: () => number): BattlePoint {
  const knownHits = Object.entries(board.shots)
    .filter(([, state]) => state === 'hit')
    .map(([key]) => {
      const [x, y] = key.split(':').map(Number);
      return { x, y };
    });

  const targetCandidates = knownHits
    .flatMap((point) => neighbors(point, board.size))
    .filter((point) => !board.shots[pointKey(point.x, point.y)]);

  if (targetCandidates.length > 0) {
    return targetCandidates[Math.floor(rng() * targetCandidates.length)];
  }

  const unknown: BattlePoint[] = [];
  for (let y = 0; y < board.size; y += 1) {
    for (let x = 0; x < board.size; x += 1) {
      if (!board.shots[pointKey(x, y)] && (x + y) % 2 === 0) unknown.push({ x, y });
    }
  }
  if (unknown.length === 0) {
    for (let y = 0; y < board.size; y += 1) {
      for (let x = 0; x < board.size; x += 1) {
        if (!board.shots[pointKey(x, y)]) unknown.push({ x, y });
      }
    }
  }
  return unknown[Math.floor(rng() * unknown.length)] ?? { x: 0, y: 0 };
}

export function rollCosmicBattleReward(seed: string, wonAt: number): CosmicBattleRewardBundle {
  const rng = createBattleRng(`${seed}:reward:${Math.floor(wonAt / 1000)}`);
  const roll = rng();
  if (roll < 0.48) {
    const resources: CosmicBattleResource[] = ['minerals', 'volatiles', 'isotopes', 'water'];
    return {
      quarks: 1,
      reward: {
        kind: 'resource',
        resource: resources[Math.floor(rng() * resources.length)],
        amount: 120 + Math.floor(rng() * 181),
      },
    };
  }
  if (roll < 0.72) {
    return { quarks: 1, reward: { kind: 'payload', payload: PAYLOAD_REWARDS[Math.floor(rng() * PAYLOAD_REWARDS.length)], amount: 1 } };
  }
  if (roll < 0.84) {
    return { quarks: 1, reward: { kind: 'ship', shipType: SHIP_REWARDS[Math.floor(rng() * SHIP_REWARDS.length)], amount: 1 } };
  }
  if (roll < 0.94) {
    return { quarks: 1, reward: { kind: 'spark', spark: SPARK_REWARDS[Math.floor(rng() * SPARK_REWARDS.length)], amount: 1 } };
  }
  return { quarks: 1, reward: { kind: 'ingredient', ingredient: INGREDIENT_REWARDS[Math.floor(rng() * INGREDIENT_REWARDS.length)], amount: 1 } };
}
