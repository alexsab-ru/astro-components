import modelsData from '@/data/models.json';

/**
 * Находит модель автомобиля по folder_id
 * @param carData - данные автомобиля
 * @returns найденная модель или null
 */
export function findModelByCarData(carData: any) {
  if (!carData?.folder_id) return null;
  
  const { models } = modelsData;
  // Приводим folder_id один раз к нижнему регистру, чтобы не дергать toLowerCase в каждом сравнении.
  const normalizedFolderId = String(carData.folder_id).toLowerCase();

  return models.find(model => {
    // Нормализуем feed_names в нижний регистр, чтобы поиск не зависел от регистра значений в данных модели.
    const normalizedFeedNames = model?.feed_names?.map((feedName: string) => String(feedName).toLowerCase()) || [];

    return (
      model.id.toLowerCase() === normalizedFolderId ||
      normalizedFeedNames.includes(normalizedFolderId)
    );
  }) || null;
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
