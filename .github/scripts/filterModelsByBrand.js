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

const parseList = (str) =>
  (str || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

const pickFields = (obj, keys) =>
  keys.reduce((res, key) => {
    if (obj.hasOwnProperty(key)) {
      res[key] = obj[key];
    }
    return res;
  }, {});

// Логирование с цветами
const logSuccess = (msg) => console.log('\x1b[30;42m%s\x1b[0m', msg);
const logWarning = (msg) => console.log('\x1b[30;43m%s\x1b[0m', msg);
const logError   = (msg) => console.log('\x1b[30;41m%s\x1b[0m', msg);

// Пути к файлам
const dataDirectory = path.join(process.cwd(), 'src', 'data');
const settingsFilePath = path.join(dataDirectory, 'settings.json');
const allModelsFilePath = path.join(dataDirectory, '_all_models.json');
const modelsFilePath = path.join(dataDirectory, 'models.json');

// Основные данные
const data = {
  models: [],
  'test-drive': [],
  services: []
};

try {
  const settings = readJson(settingsFilePath);
  const allModels = readJson(allModelsFilePath);

  if (!settings || !allModels) throw new Error('Не удалось загрузить файлы settings.json или _all_models.json');

  const brands = parseList(settings.brand);
  const modelIds = parseList(settings.model_ids);

  // Модели для test-drive и services
  const testDriveModels = allModels.filter(
    m => m.mark_id && brands.includes(String(m.mark_id).toLowerCase())
  );

  data['test-drive'] = testDriveModels.map(m =>
    pickFields(m, ['mark_id', 'id', 'name', 'thumb', 'globalChars'])
  );

  data['services'] = testDriveModels.map(m =>
    pickFields(m, ['mark_id', 'id', 'name'])
  );

  // Модели по фильтру брендов и model_ids
  data.models = allModels.filter(m => {
    const markMatch = m.mark_id && brands.includes(String(m.mark_id).toLowerCase());
    const idMatch = m.id && modelIds.includes(String(m.id).toLowerCase());
    return markMatch && (modelIds.length === 0 || idMatch);
  });

  if (testDriveModels.length === 0) {
    logWarning('Внимание: не найдено ни одной подходящей модели. models.json создан как пустой объект');
  } else {
    logSuccess('models.json успешно обновлён по брендам и ID из settings.json');
  }
} catch (err) {
  logError('Ошибка при обработке моделей. models.json будет создан как пустой объект');
}

// Сохраняем файл
fs.writeFileSync(modelsFilePath, JSON.stringify(data, null, 2));
