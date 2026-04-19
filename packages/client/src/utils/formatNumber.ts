// ----------------------------------------------------------------------------
// Short Cyrillic number formatting for the top resource HUD.
//   0-999        → exact integer      ("70", "999")
//   1000-999999  → к (thousands)      ("1к" through "999к", always integer —
//                                      1000 → "1к", 1999 → "1к", 2000 → "2к")
//   1000000+     → кк (millions)      ("1кк", "250кк" …)
// No decimals — floor to integer within the scaled unit. Keeps the HUD
// glyph width predictable so the value never overflows the pill.
// ----------------------------------------------------------------------------

export function formatShort(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  if (abs < 1000) {
    return sign + Math.floor(abs).toString();
  }
  if (abs < 1_000_000) {
    return sign + Math.floor(abs / 1000).toString() + 'к';
  }
  return sign + Math.floor(abs / 1_000_000).toString() + 'кк';
}
