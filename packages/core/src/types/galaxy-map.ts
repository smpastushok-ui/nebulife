// ── Galaxy Map: spiral placement of galaxy groups ──────────────

/** Position in galaxy-wide coordinates (light-years from galactic center) */
export interface GalacticPosition {
  x: number;
  y: number;
  z: number;
}

/** Metadata for a single galaxy group in the spiral map */
export interface GalaxyGroupMeta {
  groupIndex: number;
  /** Spiral arm index (0 or 1) */
  armIndex: number;
  /** Position along the arm (0 = first in arm, 1 = second, ...) */
  armPosition: number;
  /** Deterministic seed for this group */
  groupSeed: number;
  /** Center position in galactic coordinates (LY) */
  position: GalacticPosition;
  /** Radius of this group's volume (LY) */
  radius: number;
  /** Distance from galactic center (LY) */
  distanceFromCenter: number;
}

/** Player's assignment to a galaxy group */
export interface PlayerGalaxyAssignment {
  groupIndex: number;
  /** Player index within the group (0..49) */
  playerIndexInGroup: number;
  /** Global registration order (groupIndex * 50 + playerIndexInGroup) */
  globalPlayerIndex: number;
}
