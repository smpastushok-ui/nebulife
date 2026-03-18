// ---------------------------------------------------------------------------
// Mass formatting utility — converts kg to human-readable Ukrainian units
// ---------------------------------------------------------------------------

const UNITS: [number, string][] = [
  [1e24, 'Зт'],  // zettatonnes
  [1e21, 'Ет'],  // exatonnes
  [1e18, 'Пт'],  // petatonnes
  [1e15, 'Тт'],  // teratonnes
  [1e12, 'Гт'],  // gigatonnes
  [1e9,  'Мт'],  // megatonnes
  [1e6,  'кт'],  // kilotonnes
  [1e3,  'т'],   // tonnes
  [1,    'кг'],  // kilograms
];

/** Format a mass in kg to a human-readable string with appropriate unit */
export function formatMassKg(kg: number): string {
  if (kg <= 0) return '0';

  for (const [threshold, unit] of UNITS) {
    if (kg >= threshold) {
      const value = kg / threshold;
      if (value >= 100) return `${Math.round(value)} ${unit}`;
      if (value >= 10) return `${value.toFixed(1)} ${unit}`;
      return `${value.toFixed(2)} ${unit}`;
    }
  }

  return `${kg.toFixed(1)} кг`;
}
