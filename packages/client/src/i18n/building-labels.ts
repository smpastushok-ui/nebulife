import type { TFunction } from 'i18next';
import type { BuildingType } from '@nebulife/core';
import { BUILDING_DEFS } from '@nebulife/core';

export function buildingName(type: BuildingType | string, t: TFunction): string {
  const def = BUILDING_DEFS[type as BuildingType];
  return t(`building.${type}.name`, { defaultValue: def?.name ?? String(type) });
}

export function buildingDesc(type: BuildingType | string, t: TFunction): string {
  const def = BUILDING_DEFS[type as BuildingType];
  return t(`building.${type}.desc`, { defaultValue: def?.description ?? '' });
}

export function buildingCategoryLabel(category: string, t: TFunction): string {
  return t(`surface.category_${category}`, { defaultValue: category });
}
