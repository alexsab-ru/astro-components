import modelsData from '@/data/models.json';

export type ModelBadgePlacement = 'car_list' | 'car_page';

/**
 * Находит модель автомобиля по folder_id
 * @param carData - данные автомобиля
 * @returns найденная модель или null
 */
export function findModelByCarData(carData: any) {
  if (!carData?.folder_id) return null;
  
  const { models } = modelsData;
  return models.find(model => 
    model.id.toLowerCase() === carData.folder_id.toLowerCase() || 
    (model?.feed_names?.length && model.feed_names.includes(carData.folder_id))
  ) || null;
}

/**
 * Собирает данные бейджа модели одним проходом.
 * @param carData - данные автомобиля
 * @param placement - место вывода бейджа
 * @returns объект с изображением бейджа и alt текстом
 */
export function getModelBadgeData(carData: any, placement: ModelBadgePlacement = 'car_list') {
  const model = findModelByCarData(carData);
  const badge = model?.badge;
  const badgeData = badge && typeof badge === 'object' ? badge : null;
  const alt = badgeData?.alt || model?.caption || model?.name || '';

  if (!badgeData) {
    return {
      image: null,
      alt,
    };
  }

  return {
    image: badgeData?.[placement] || null,
    alt,
  };
}

/**
 * Обертка, чтобы старый код мог получать только изображение через новый общий расчёт.
 * @param carData - данные автомобиля
 * @param placement - место вывода бейджа
 * @returns URL изображения бейджа или null
 */
export function getModelBadgeImage(carData: any, placement: ModelBadgePlacement = 'car_list') {
  return getModelBadgeData(carData, placement).image;
}

/**
 * Обертка, чтобы старый код мог получать только alt через новый общий расчёт.
 * @param carData - данные автомобиля
 * @returns alt текст или название модели
 */
export function getModelBadgeAlt(carData: any) {
  return getModelBadgeData(carData).alt;
}

/**
 * Рассчитывает цену автомобиля с учетом скидки
 * @param carData - данные автомобиля
 * @returns рассчитанная цена
 */
export function calculateCarPrice(carData: any) {
  if (!carData) return 0;
  
  if (carData.priceWithDiscount) {
    return carData.priceWithDiscount;
  }
  
  if (carData.max_discount && carData.price) {
    return carData.price - carData.max_discount;
  }
  
  return carData.price || 0;
}

/**
 * Получает основное изображение автомобиля (первое из thumbs или основное изображение)
 * @param carData - данные автомобиля
 * @returns URL изображения или null
 */
export function getCarThumbnail(carData: any) {
  if (!carData) return null;
  
  if (carData.thumbs && carData.thumbs.length) {
    return carData.thumbs[0];
  }
  
  return carData.image || null;
}
