// ── Galaxy-level constants ─────────────────────────────────────

/** Master seed for the entire galaxy */
export const GALAXY_MASTER_SEED = 42;

/** Maximum players per group */
export const PLAYERS_PER_GROUP = 50;

/** Radius of a single galaxy group (LY) */
export const GROUP_RADIUS = 150;

/** Number of primary spiral arms */
export const SPIRAL_ARM_COUNT = 5;

// ── Logarithmic spiral: r = SPIRAL_A * e^(SPIRAL_B * theta) ──

/** Starting radius of the spiral (LY) — first groups sit here */
export const SPIRAL_A = 400;

/** Growth factor (tightness) of the logarithmic spiral */
export const SPIRAL_B = 0.10;

/** Angular step between consecutive groups on the same arm (radians) */
export const THETA_STEP = 0.9;

// ── Galaxy disk thickness ──

/** Base disk thickness at large radii (LY, gaussian sigma) */
export const DISK_THIN_SIGMA = 15;

/** Additional thickness at galactic center — bulge (LY) */
export const DISK_BULGE_SIGMA = 80;

/** Scale radius for bulge falloff (LY) */
export const DISK_BULGE_SCALE = 2000;

/** Scatter fraction — groups deviate from perfect spiral by this fraction of r */
export const GROUP_SCATTER = 0.05;

// ── Branching ──

/** Arm position after which branching can start */
export const BRANCH_START = 4;

/** Rate of angular deviation growth per arm position beyond BRANCH_START (radians) */
export const BRANCH_ANGLE_RATE = 0.06;

/** Rate of scatter growth per arm position beyond BRANCH_START */
export const BRANCH_SCATTER_RATE = 0.15;
