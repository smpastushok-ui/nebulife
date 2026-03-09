export interface OrbitalParameters {
  semiMajorAxisAU: number;
  eccentricity: number;                    // 0 = circular, <1 = elliptical
  inclinationDeg: number;
  longitudeOfAscendingNodeDeg: number;
  argumentOfPeriapsisDeg: number;
  meanAnomalyDeg: number;                  // Position along orbit at epoch
  periodYears: number;
  periodDays: number;
}
