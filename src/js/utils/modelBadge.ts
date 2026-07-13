import { getModelTitle } from './modelFields.js';

export type ModelBadgePlacement = 'menu' | 'modelList' | 'modelPage' | 'carList' | 'carPage';

export function getModelBadgeData(model: any, placement: ModelBadgePlacement, fallbackAlt = '') {
  const badge = model?.badge;
  const badgeData = badge && typeof badge === 'object' ? badge : null;
  const alt = badgeData?.alt || getModelTitle(model) || fallbackAlt;

  return {
    image: badgeData?.[placement] || null,
    alt,
  };
}
