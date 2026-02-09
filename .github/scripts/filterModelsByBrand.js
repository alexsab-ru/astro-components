import fs from 'fs';
import path from 'path';

// Утилиты
const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    logError(`Ошибка чтения JSON файла: ${filePath}`);
    return null;
  }
};

const readOptionalJson = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    logError(`Ошибка чтения JSON файла: ${filePath}`);
    return null;
  }
};

const parseList = (value) => {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value
      .flatMap(item => (typeof item === 'string' ? item.split(',') : []))
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
  }

  return [];
};

const normalizeArray = (arr) =>
  Array.isArray(arr) ? arr.map(id => String(id).toLowerCase()) : [];

const pickFields = (obj, keys) =>
  keys.reduce((res, key) => {
    if (obj.hasOwnProperty(key)) {
      res[key] = obj[key];
    }
    return res;
  }, {});

// Логирование
const logSuccess = (msg) => console.log('\x1b[30;42m%s\x1b[0m', msg);
const logWarning = (msg) => console.log('\x1b[30;43m%s\x1b[0m', msg);
const logError   = (msg) => console.log('\x1b[30;41m%s\x1b[0m', msg);

// Пути
const dataDirectory = path.join(process.cwd(), 'src', 'data');
const settingsFilePath = path.join(dataDirectory, 'settings.json');
const allModelsFilePath = path.join(dataDirectory, 'all-models.json');
const federalDisclaimerFilePath = path.join(dataDirectory, 'federal-disclaimer.json');
const modelsFilePath = path.join(dataDirectory, 'models.json');

// Структура вывода
const data = {
  models: [],
  testDrive: [],
  services: []
};

try {
  const settings = readJson(settingsFilePath);
  if (!settings) throw new Error('Не удалось загрузить файл settings.json');
  const allModels = readJson(allModelsFilePath);
  if (!allModels) throw new Error('Не удалось загрузить файл all-models.json');
  const federalDisclaimer = readOptionalJson(federalDisclaimerFilePath);

  if (settings.brand == 'BRAND') {
    // random brand from unique brands
    settings.brand = [...new Set(allModels.map(m => m.mark_id))].sort(() => Math.random() - 0.5)[0];
    logWarning('Ни одна модель не прошла фильтрацию. models.json будет заполнен случайным брендом: ' + settings.brand);
  }
  let brands = parseList(settings.brand);
  const modelIDs = normalizeArray(settings.modelIDs);
  const testDriveIDs = normalizeArray(settings.testDriveIDs);
  const serviceIDs = normalizeArray(settings.serviceIDs);

  // Универсальная фильтрация по бренду и ID
  const filterBy = (targetIDs) => (m) => {
    const markMatch = m.mark_id && brands.includes(String(m.mark_id).toLowerCase());
    const idMatch = m.id && targetIDs.includes(String(m.id).toLowerCase());
    // Модель видна, если: (status существует и не 'disable' и не 'hide') ИЛИ show === true
    const isVisible = (m?.status && m.status !== 'disable' && m.status !== 'hide') || m?.show;
    return markMatch && (targetIDs.length === 0 || idMatch) && isVisible;
  };

  /**
   * Функция для добавления дисклеймеров к модели
   * Проверяет соответствие модели ключам из federal-disclaimer.json
   * Ключ формируется как mark_id-id в lowercase (например: "solaris-krs")
   * @param {Object} model - объект модели из all-models.json
   * @returns {Object} модель с добавленными дисклеймерами или без изменений
   */
  const addDisclaimersToModel = (model) => {
    // Если файл с дисклеймерами не загружен, возвращаем модель без изменений
    if (!federalDisclaimer) return model;
    
    // Создаем ключ для поиска в формате mark_id-id (в lowercase)
    // Например: "Solaris" + "krs" = "solaris-krs"
    const disclaimerKey = `${String(model.mark_id).toLowerCase()}-${String(model.id).toLowerCase()}`;
    
    // Ищем соответствующий дисклеймер в федеральном файле
    const disclaimer = federalDisclaimer[disclaimerKey];
    
    if (disclaimer) {
      // Логируем успешное добавление дисклеймера
      logSuccess(`Добавлен дисклеймер для модели ${model.mark_id} ${model.id}`);
      
      // Добавляем дисклеймеры к модели
      // priceDisclaimer - дисклеймер для цены
      // benefitDisclaimer - дисклеймер для выгод/акций
      return {
        ...model,
        priceDisclaimer: disclaimer.price || '',
        benefitDisclaimer: disclaimer.benefit || ''
      };
    }
    
    // Если дисклеймер не найден, возвращаем модель без изменений
    return model;
  };

  // Обработка основных моделей - фильтруем по бренду/ID и добавляем дисклеймеры
  data.models = allModels
    .filter(filterBy(modelIDs))
    .map(addDisclaimersToModel);

  // Обработка моделей для тест-драйва - фильтруем и добавляем дисклеймеры
  // Выбираем только нужные поля + дисклеймеры
  data.testDrive = allModels
    .filter(filterBy(testDriveIDs))
    .map(m => {
      const modelWithDisclaimers = addDisclaimersToModel(m);
      return pickFields(modelWithDisclaimers, ['mark_id', 'id', 'name', 'thumb', 'globalChars', 'show', 'status', 'priceDisclaimer', 'benefitDisclaimer']);
    });

  // Обработка моделей для сервисов - фильтруем и добавляем дисклеймеры
  // Выбираем только нужные поля + дисклеймеры
  data.services = allModels
    .filter(filterBy(serviceIDs))
    .map(m => {
      const modelWithDisclaimers = addDisclaimersToModel(m);
      return pickFields(modelWithDisclaimers, ['mark_id', 'id', 'name', 'show', 'status', 'priceDisclaimer', 'benefitDisclaimer']);
    });

  if (
    data.models.length === 0 &&
    data.testDrive.length === 0 &&
    data.services.length === 0
  ) {
    logWarning('Ни одна модель не прошла фильтрацию. models.json будет пустым.');
  } else {
    logSuccess('models.json успешно обновлён по брендам и ID из settings.json');
    
    // Подсчитываем количество моделей с дисклеймерами
    const modelsWithDisclaimers = data.models.filter(m => m.priceDisclaimer || m.benefitDisclaimer).length;
    const testDriveWithDisclaimers = data.testDrive.filter(m => m.priceDisclaimer || m.benefitDisclaimer).length;
    const servicesWithDisclaimers = data.services.filter(m => m.priceDisclaimer || m.benefitDisclaimer).length;
    
    if (modelsWithDisclaimers > 0 || testDriveWithDisclaimers > 0 || servicesWithDisclaimers > 0) {
      logSuccess(`Добавлены дисклеймеры: ${modelsWithDisclaimers} моделей, ${testDriveWithDisclaimers} тест-драйвов, ${servicesWithDisclaimers} сервисов`);
    } else {
      logWarning('Дисклеймеры не найдены для отфильтрованных моделей');
    }
  }
} catch (err) {
  logError('Ошибка при обработке моделей. models.json будет создан как пустой объект.');
}

// Сохраняем результат
fs.writeFileSync(modelsFilePath, JSON.stringify(data, null, 2));
