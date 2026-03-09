import type { Star } from './star.js';
import type { Planet } from './planet.js';

export interface AsteroidBelt {
  innerRadiusAU: number;
  outerRadiusAU: number;
  density: number;                          // Relative density 0-1
  composition: Record<string, number>;      // element → fraction
}

export interface StarSystem {
  id: string;
  seed: number;
  name: string;
  position: { x: number; y: number; z: number };  // Light-years from galaxy center
  star: Star;
  planets: Planet[];
  asteroidBelts: AsteroidBelt[];
  ringIndex: number;
  isExplored: boolean;
  exploredByPlayerId: string | null;
  ownerPlayerId: string | null;
}

export interface GalaxyRing {
  ringIndex: number;
  starSystems: StarSystem[];
}

export interface Galaxy {
  id: string;
  seed: number;
  name: string;
  rings: GalaxyRing[];
}

export interface Universe {
  id: string;
  seed: number;
  galaxy: Galaxy;
}
