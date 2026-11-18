import modelsData from '@/data/site/models.json';
import {
  getModelBrandId,
  getModelFeedBrandNames,
  getModelFeedModelNames,
} from './modelFields.js';

const AVAILABLE_VALUE = 'в наличии';

const isTruthyEnvValue = (value: unknown) => {
  return ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());
};

export function shouldShowOnlyAvailableCars() {
  return isTruthyEnvValue(import.meta.env.DEALER_CARS_SHOW_ONLY_AVAILABILITY);
}

export function isHiddenCarEntry(car: any) {
  return typeof car?.id === 'string' && car.id.startsWith('__');
}

export function isAvailableCarEntry(car: any) {
  return String(car?.data?.availability ?? '').trim().toLowerCase() === AVAILABLE_VALUE;
}

export function filterCarsForAvailability(cars: any[] = []) {
  if (!shouldShowOnlyAvailableCars()) return cars;
  return cars.filter(isAvailableCarEntry);
}

export function filterVisibleCars(cars: any[] = []) {
  return filterCarsForAvailability(cars.filter((car) => !isHiddenCarEntry(car)));
}

/**
 * Находит модель автомобиля по folder_id
 * @param carData - данные автомобиля
 * @returns найденная модель или null
 */
export function findModelByCarData(carData: any, models = modelsData.models) {
  if (!carData?.folder_id) return null;
  
  // Приводим folder_id один раз к нижнему регистру, чтобы не дергать toLowerCase в каждом сравнении.
  const normalizedFolderId = String(carData.folder_id).toLowerCase();

  const normalizedMarkId = carData?.mark_id ? String(carData.mark_id).toLowerCase() : null;

  return models.find(model => {
    const normalizedFeedNames = getModelFeedModelNames(model)
      .map((feedName: string) => String(feedName).toLowerCase());
    const normalizedBrandNames = getModelFeedBrandNames(model)
      .map((brandName: string) => String(brandName).toLowerCase());
    const brandMatch =
      !normalizedMarkId ||
      getModelBrandId(model) === normalizedMarkId ||
      normalizedBrandNames.includes(normalizedMarkId);

    return (
      brandMatch &&
      (model.id.toLowerCase() === normalizedFolderId ||
        normalizedFeedNames.includes(normalizedFolderId))
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

  if (carData.imageSets && carData.imageSets.length) {
    return carData.imageSets[0].medium;
  }
  
  if (carData.thumbs && carData.thumbs.length) {
    return carData.thumbs[0];
  }
  
  return carData.image || null;
}
