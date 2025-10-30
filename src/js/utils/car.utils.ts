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
 * Собирает данные бейджа модели одним проходом.
 * Раньше мы возвращали только изображение, теперь сразу отдаем и картинку, и alt.
 * Это избавляет нас от повторных вызовов findModelByCarData в разных вспомогательных функциях.
 * @param carData - данные автомобиля
 * @returns объект с изображением бейджа и alt текстом
 */
export function getModelBadgeData(carData: any) {
  const model = findModelByCarData(carData);
  const badge = model?.badge;

  // Если бейджа нет, все равно возвращаем alt с названием модели, чтобы было что показать.
  if (!badge) {
    return {
      image: null,
      alt: model?.name || '',
    };
  }

  // Когда badge строка, это готовый URL. Alt берем из имени модели.
  if (typeof badge === 'string') {
    return {
      image: badge,
      alt: model?.name || '',
    };
  }

  // Для объектного badge отдаем vertical вариант и alt из данных, подстрахуемся именем.
  return {
    image: badge.vertical || null,
    alt: badge.alt || model?.name || '',
  };
}

/**
 * Обертка, чтобы старый код мог получать только изображение через новый общий расчёт.
 * @param carData - данные автомобиля
 * @returns URL изображения бейджа или null
 */
export function getModelBadgeImage(carData: any) {
  return getModelBadgeData(carData).image;
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
