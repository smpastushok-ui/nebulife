// ----------------------------------------------------------------------------
// Short Cyrillic number formatting for the top resource HUD.
//   0-99        → exact integer           (e.g. 70   → "70")
//   100-99999   → к (thousands)           (e.g. 100  → "0.1к", 1500 → "1.5к",
//                                                99999 → "100к")
//   100000+     → кк (millions)           (e.g. 100000 → "0.1кк",
//                                                2500000 → "2.5кк", 1e6 → "1кк")
// Decimals: 1 digit when < 10 in the scaled units, 0 digits otherwise. The
// trailing ".0" is stripped so "1.0к" never appears — just "1к".
// ----------------------------------------------------------------------------

export function formatShort(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  if (abs < 100) {
    return sign + Math.floor(abs).toString();
  }

  let scaled: number;
  let suffix: string;
  if (abs >= 100_000) {
    scaled = abs / 1_000_000;
    suffix = 'кк';
  } else {
    scaled = abs / 1_000;
    suffix = 'к';
  }

  const text = scaled < 10
    ? (Math.round(scaled * 10) / 10).toFixed(1).replace(/\.0$/, '')
    : Math.round(scaled).toString();

  return sign + text + suffix;
}
