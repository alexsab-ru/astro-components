import modelsData from '@/data/models.json';

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
 * Получает изображение бейджа модели
 * @param carData - данные автомобиля
 * @returns URL изображения бейджа или null
 */
export function getModelBadgeImage(carData: any) {
  const model = findModelByCarData(carData);
  if (!model?.badge) return null;
  
  // Если badge - строка, возвращаем её
  if (typeof model.badge === 'string') {
    return model.badge;
  }
  
  // Если badge - объект, возвращаем vertical изображение
  return model.badge.vertical || null;
}

/**
 * Получает alt текст для бейджа модели
 * @param carData - данные автомобиля
 * @returns alt текст или название модели
 */
export function getModelBadgeAlt(carData: any) {
  const model = findModelByCarData(carData);
  if (!model?.badge) return model?.name || '';
  
  // Если badge - строка, возвращаем название модели
  if (typeof model.badge === 'string') {
    return model.name || '';
  }
  
  // Если badge - объект, возвращаем alt или название модели
  return model.badge.alt || model.name || '';
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
