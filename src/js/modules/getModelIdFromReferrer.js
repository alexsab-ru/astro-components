/**
 * Функция getModelIdFromReferrer отслеживает откуда пришел пользователь
 * Извлекает ID модели из пути, если пользователь пришел со страницы модели
 * Возвращает ID модели или null
 */
export function getModelIdFromReferrer(slugToModelId) {
  const ref = document.referrer || '';
  
  if (!ref) {
    return null;
  }
  
  const { pathname } = new URL(ref, location.href);
  const searchPaths = ['/models/', '/cars/'];
  let modelId;
  
  const foundPath = searchPaths.find(path => pathname.includes(path));
  
  if (!foundPath) {
    return null;
  }
  
  // Извлекаем model_id из пути /models/
  if (foundPath === searchPaths[0]) {
    modelId = pathname.replace(/\/+$/, '').split('/').filter(Boolean).pop() || '';
  }
  
  // Извлекаем model_id из пути /cars/ через mapping
  if (foundPath === searchPaths[1]) {
    const slug = pathname.split('/').filter(Boolean).pop();
    const decodedSlug = decodeURIComponent(slug);
    modelId = slugToModelId[decodedSlug];
  }
  
  return modelId;
};
