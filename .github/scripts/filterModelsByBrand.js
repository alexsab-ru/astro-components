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
const modelsFilePath = path.join(dataDirectory, 'models.json');

// Структура вывода
const data = {
  models: [],
  testDrive: [],
  services: []
};

try {
  const settings = readJson(settingsFilePath);
  const allModels = readJson(allModelsFilePath);
  if (!settings || !allModels) throw new Error('Не удалось загрузить файлы settings.json или all-models.json');

  const brands = parseList(settings.brand);
  const modelIDs = normalizeArray(settings.modelIDs);
  const testDriveIDs = normalizeArray(settings.testDriveIDs);
  const serviceIDs = normalizeArray(settings.serviceIDs);

  // Универсальная фильтрация по бренду и ID
  const filterBy = (targetIDs) => (m) => {
    const markMatch = m.mark_id && brands.includes(String(m.mark_id).toLowerCase());
    const idMatch = m.id && targetIDs.includes(String(m.id).toLowerCase());
    return markMatch && (targetIDs.length === 0 || idMatch) &&  m.show;
  };

  // models
  data.models = allModels.filter(filterBy(modelIDs));

  // test-drive
  data.testDrive = allModels
    .filter(filterBy(testDriveIDs))
    .map(m => pickFields(m, ['mark_id', 'id', 'name', 'thumb', 'globalChars', 'show']));

  // services
  data.services = allModels
    .filter(filterBy(serviceIDs))
    .map(m => pickFields(m, ['mark_id', 'id', 'name', 'show']));

  if (
    data.models.length === 0 &&
    data.testDrive.length === 0 &&
    data.services.length === 0
  ) {
    logWarning('Ни одна модель не прошла фильтрацию. models.json будет пустым.');
  } else {
    logSuccess('models.json успешно обновлён по брендам и ID из settings.json');
  }
} catch (err) {
  logError('Ошибка при обработке моделей. models.json будет создан как пустой объект.');
}

// Сохраняем результат
fs.writeFileSync(modelsFilePath, JSON.stringify(data, null, 2));
