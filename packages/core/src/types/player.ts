export type Language = 'uk' | 'en';

export type GamePhase =
  | 'exploring'        // First 1 day, exploring surroundings
  | 'ship-launched'    // Doomsday ship sent
  | 'in-transit'       // Ship traveling
  | 'colonizing'       // Ship arrived, building colony
  | 'established';     // Colony stable, full game mode

export interface DoomsdayShip {
  launchedAt: number;           // Unix timestamp
  originSystemId: string;
  destinationSystemId: string;
  destinationPlanetId: string;
  arrivalAt: number;            // Unix timestamp
  passengers: number;
  resources: Record<string, number>;
  status: 'in-transit' | 'arrived' | 'colonizing';
}

export interface Player {
  id: string;
  name: string;
  registeredAt: number;          // Unix timestamp
  homeStarSystemId: string;
  homePlanetId: string;
  asteroidImpactAt: number;      // registeredAt + 1 hour
  doomsdayShip: DoomsdayShip | null;
  exploredSystemIds: string[];
  selectedDestinationId: string | null;
  gamePhase: GamePhase;
  // Discovery & engagement (persisted in Neon DB)
  sciencePoints: number;
  loginStreak: number;
  lastLoginDate: string | null;  // ISO date string
  // In-game currency (1 quark = 1 UAH)
  quarks: number;
}
