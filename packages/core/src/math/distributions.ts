/**
 * Statistical distribution utilities
 */

/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Smoothstep interpolation (cubic Hermite) */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Clamp value to range */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Remap value from one range to another */
export function remap(value: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number {
  const t = (value - fromMin) / (fromMax - fromMin);
  return lerp(toMin, toMax, t);
}

/** Gaussian probability density function */
export function gaussianPDF(x: number, mean: number, stddev: number): number {
  const exponent = -0.5 * ((x - mean) / stddev) ** 2;
  return (1 / (stddev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
}

/** Inverse square falloff (for gravity, radiation, etc.) */
export function inverseSquare(distance: number, intensity: number = 1): number {
  if (distance <= 0) return Infinity;
  return intensity / (distance * distance);
}

/** Normalize array to sum to 1 */
export function normalize(values: number[]): number[] {
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum === 0) return values.map(() => 1 / values.length);
  return values.map(v => v / sum);
}
