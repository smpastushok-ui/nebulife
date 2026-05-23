import type { TFunction } from 'i18next';

/** Game economy ticks are per minute; UI rates are shown per hour. */
export const GAME_TICKS_PER_HOUR = 60;

function resolveLang(language: string): 'en' | 'uk' {
  return language.startsWith('uk') ? 'uk' : 'en';
}

function formatAmountPerHour(perHour: number): string {
  const abs = Math.abs(perHour);
  return abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(1);
}

export function tickRateToHourly(amountPerTick: number): number {
  return amountPerTick * GAME_TICKS_PER_HOUR;
}

/** Format an amount that is already expressed per hour (no tick conversion). */
export function formatHourlyAmount(
  perHour: number,
  t: TFunction,
  language: string,
): string {
  const amount = formatAmountPerHour(perHour);
  const lng = resolveLang(language);
  return String(t('building_detail.rate_per_hour', {
    amount,
    lng,
    defaultValue: lng === 'uk' ? `${amount}/год` : `${amount}/hr`,
  }));
}

/** Format game tick rate (amount per 60s tick) as a localized /hr string. */
export function formatRatePerHour(
  amountPerTick: number,
  t: TFunction,
  language: string,
): string {
  const perHour = tickRateToHourly(amountPerTick);
  const amount = formatAmountPerHour(perHour);
  const lng = resolveLang(language);
  return String(t('building_detail.rate_per_hour', {
    amount,
    lng,
    defaultValue: lng === 'uk' ? `${amount}/год` : `${amount}/hr`,
  }));
}

/** Format an already hourly rate with optional sign prefix. */
export function formatSignedRatePerHour(
  perHour: number,
  t: TFunction,
  language: string,
): string {
  const sign = perHour > 0 ? '+' : perHour < 0 ? '-' : '';
  const amount = formatAmountPerHour(perHour);
  const lng = resolveLang(language);
  const body = String(t('building_detail.rate_per_hour', {
    amount,
    lng,
    defaultValue: lng === 'uk' ? `${amount}/год` : `${amount}/hr`,
  }));
  return `${sign}${body}`;
}
