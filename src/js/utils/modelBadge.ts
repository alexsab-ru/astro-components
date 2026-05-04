import { getModelTitle } from '@/js/utils/modelFields';

export type ModelBadgePlacement = 'menu' | 'model_list' | 'model_page' | 'car_list' | 'car_page';

export function getModelBadgeData(model: any, placement: ModelBadgePlacement, fallbackAlt = '') {
  const badge = model?.badge;
  const badgeData = badge && typeof badge === 'object' ? badge : null;
  const alt = badgeData?.alt || getModelTitle(model) || fallbackAlt;

  return {
    image: badgeData?.[placement] || null,
    alt,
  };
}
