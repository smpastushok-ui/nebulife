/**
 * PremiumStubs — заглушки для майбутніх преміум-функцій радіального меню.
 * Визначені тут для документації; НЕ відображаються в грі.
 *
 * Активна преміум-функція: panorama (telescope photo) — у RadialMenu.tsx
 * Заглушки нижче — майбутні відеомісії.
 */

export interface PremiumFeatureDef {
  id: string;
  label: string;
  icon: string;
  cost: number;
  costCurrency: 'quarks';
  description: string;
  status: 'stub';
}

export const PREMIUM_STUBS: PremiumFeatureDef[] = [
  {
    id: 'missionShort',
    label: 'Місія 5с',
    icon: '\u25B8',
    cost: 30,
    costCurrency: 'quarks',
    description: 'Коротка AI-відеомісія до зоряної системи (5 секунд)',
    status: 'stub',
  },
  {
    id: 'missionLong',
    label: 'Місія 10с',
    icon: '\u25B8\u25B8',
    cost: 60,
    costCurrency: 'quarks',
    description: 'Довга AI-відеомісія до зоряної системи (10 секунд)',
    status: 'stub',
  },
];
