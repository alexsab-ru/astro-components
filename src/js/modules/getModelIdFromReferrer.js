const STORAGE_KEY = 'test_drive_selected_model';

// Вспомогательная функция для чтения из localStorage
const getFromStorage = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Не удалось прочитать выбор модели из localStorage:', e);
    return null;
  }
};

// Вспомогательная функция для сохранения в localStorage
const saveToStorage = (modelId) => {
  try {
    localStorage.setItem(STORAGE_KEY, modelId);
  } catch (e) {
    console.warn('Не удалось сохранить выбор модели в localStorage:', e);
  }
};

/**
 * Функция getModelIdFromReferrer отслеживает откуда пришел пользователь
 * Извлекает ID модели из пути, если пользователь пришел со страницы модели
 * Также сохраняет выбор в localStorage и восстанавливает при перезагрузке
 * Возвращает ID модели или null
 */

export function getModelIdFromReferrer(slugToModelId) {
  // Если пользователь перезагружает текущую страницу, то берем данные из localStorage
  const navigationEntry = performance.getEntriesByType('navigation')[0];
  if (navigationEntry && navigationEntry.type === 'reload') {
    return getFromStorage();
  }

  const ref = document.referrer || '';
  
  // Если referrer отсутствует - пробуем взять из localStorage
  if (!ref) {
    return getFromStorage();
  }
  
  const { pathname } = new URL(ref, location.href);
  
  // Пробуем извлечь model_id из путей /models/ или /cars/
  let modelId = null;
  
  // Проверяем путь /models/model-name
  if (pathname.includes('/models/')) {
    // Извлекаем последний сегмент пути (название модели)
    const segments = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    modelId = segments[segments.length - 1] || null;
  }
  
  // Проверяем путь /cars/car-slug
  if (pathname.includes('/cars/')) {
    // Извлекаем slug машины из пути
    const segments = pathname.split('/').filter(Boolean);
    const slug = segments[segments.length - 1];
    
    // Проверяем что slug существует перед декодированием
    if (slug) {
      try {
        const decodedSlug = decodeURIComponent(slug);
        // Получаем model_id через маппинг slug -> model_id
        modelId = slugToModelId[decodedSlug] || null;
      } catch (e) {
        console.warn('Ошибка декодирования slug:', e);
      }
    }
  }
  
  // Если нашли model_id - сохраняем в localStorage и возвращаем
  if (modelId) {
    saveToStorage(modelId);
    return modelId;
  }
  
  // Если не нашли model_id из referrer - пробуем взять из localStorage
  return getFromStorage();
}

/**
 * Сохраняет выбранную модель в localStorage
 * Используется когда пользователь меняет модель вручную на странице
 */
export function saveSelectedModel(modelId) {
  try {
    if (modelId) {
      localStorage.setItem(STORAGE_KEY, modelId);
    }
  } catch (e) {
    console.warn('Не удалось сохранить выбор модели в localStorage:', e);
  }
}

