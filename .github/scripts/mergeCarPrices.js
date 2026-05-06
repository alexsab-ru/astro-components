import fs from 'fs';
import path from 'path';

const siteDataDirectory = path.join(process.cwd(), 'src', 'data', 'site');
const commonDataDirectory = path.join(process.cwd(), 'src', 'data', 'common');
const outputPath = path.join(siteDataDirectory, 'all-prices.json');
const federalFilePath = path.join(commonDataDirectory, 'cars.json');
const dealerFilePath = path.join(siteDataDirectory, 'dealer-models_price.json');
const dealerCarsFilePath = path.join(siteDataDirectory, 'dealer-models_cars_price.json');

const Message = {
  SUCCESS: 'Файл all-prices.json успешно создан',
  ERROR_NO_MODELS: 'Ошибка: layered-каталог моделей пуст. Проверьте src/data/common/brands',
};

const DISABLE_FEED_PRICE    = process.env.DISABLE_FEED_PRICE === 'true';
const DISABLE_FEED_BENEFIT  = process.env.DISABLE_FEED_BENEFIT === 'true';
const DISABLE_GSHEET_PRICE  = process.env.DISABLE_GSHEET_PRICE === 'true';
const DISABLE_GSHEET_BENEFIT = process.env.DISABLE_GSHEET_BENEFIT === 'true';

const Key = {
  PRICE: 'Конечная цена',
  BENEFIT: 'Скидка',
  PRICE_OFFICIAL: 'РРЦ',
};

// --- Утилиты ---

const parseNumber = (value) => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

const readJSON = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    console.warn(`Не удалось прочитать ${path.basename(filePath)}: ${e.message}`);
    return null;
  }
};

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const deepMerge = (...layers) =>
  layers.reduce((result, layer) => {
    if (!isPlainObject(layer)) return result;

    for (const [key, value] of Object.entries(layer)) {
      if (value === undefined) continue;

      if (value === null) {
        result[key] = null;
      } else if (isPlainObject(value) && isPlainObject(result[key])) {
        result[key] = deepMerge(result[key], value);
      } else if (isPlainObject(value)) {
        result[key] = deepMerge({}, value);
      } else if (Array.isArray(value)) {
        result[key] = [...value];
      } else {
        result[key] = value;
      }
    }

    return result;
  }, {});

const readOptionalJSON = (filePath) => readJSON(filePath) || {};

const loadModelCatalog = () => {
  const commonBrandsDirectory = path.join(commonDataDirectory, 'brands');
  if (!fs.existsSync(commonBrandsDirectory)) return [];

  const commonModelDefaults = readOptionalJSON(path.join(commonDataDirectory, 'defaults', 'model.json'));
  const dealerDefaults = readOptionalJSON(path.join(siteDataDirectory, 'data', 'defaults.json'));
  const models = [];

  fs.readdirSync(commonBrandsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .forEach((brandEntry) => {
      const brand = brandEntry.name.toLowerCase();
      const brandDirectory = path.join(commonBrandsDirectory, brand);
      const modelsDirectory = path.join(brandDirectory, 'models');
      if (!fs.existsSync(modelsDirectory)) return;

      const commonBrandDefaults = readOptionalJSON(path.join(brandDirectory, 'defaults.json'));
      const dealerBrandDefaults = readOptionalJSON(path.join(siteDataDirectory, 'data', 'brands', brand, 'defaults.json'));

      fs.readdirSync(modelsDirectory, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .forEach((modelEntry) => {
          const modelId = path.basename(modelEntry.name, '.json').toLowerCase();
          const model = deepMerge(
            commonModelDefaults,
            commonBrandDefaults,
            readOptionalJSON(path.join(modelsDirectory, modelEntry.name)),
            dealerDefaults,
            dealerBrandDefaults,
            readOptionalJSON(path.join(siteDataDirectory, 'data', 'brands', brand, 'models', `${modelId}.json`)),
          );
          model.id = modelId;
          models.push(model);
        });
    });

  return models;
};

// Замена похожих кириллических символов на латинские (для сопоставления моделей вроде "Т1" vs "T1")
const CYRILLIC_TO_LATIN = { 'а':'a','в':'b','с':'c','е':'e','к':'k','м':'m','н':'h','о':'o','р':'p','т':'t','у':'y','х':'x' };
const cyrillicToLatin = (str) => str.replace(/[авсекмнорту]/g, ch => CYRILLIC_TO_LATIN[ch] || ch);

// Нормализация имени модели для сравнения
const normalize = (name) => {
  if (!name && name !== 0) return '';
  return cyrillicToLatin(
    String(name)
      .toLowerCase()
      .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
      // .replace(/\b(новая|новый|new)\b/gi, '')
      .trim()
      .replace(/\s+/g, ' ')
  );
};

// Нормализация id для сравнения (убираем разницу между _ и -)
const normalizeId = (id) => {
  if (!id) return '';
  return id.toLowerCase().replace(/[-_]/g, '');
};

const getModelBrandId = (model) =>
  model?.brand?.id || (model?.mark_id ? String(model.mark_id).toLowerCase() : '');

const getModelDisplayName = (model) =>
  model?.displayName || model?.caption || model?.name || '';

const getModelFeedModelNames = (model) => [
  ...(Array.isArray(model?.feed?.folderIds) ? model.feed.folderIds : []),
  ...(Array.isArray(model?.feed?.modelNames) ? model.feed.modelNames : []),
  ...(Array.isArray(model?.feed_names) ? model.feed_names : []),
].filter(Boolean);

// Конструирование id из mark_id и model id:
// - пробелы в id заменяем на дефис ("uni-k idd" → "uni-k-idd")
// - если id уже начинается с бренда, не дублируем ("wey-05" при mark_id=WEY → "wey-05", не "wey-wey-05")
const constructId = (markId, modelId) => {
  const brand = markId.toLowerCase();
  const id = modelId.toLowerCase().replace(/\s+/g, '-');
  if (id.startsWith(brand + '-')) return id;
  return `${brand}-${id}`;
};

// Проверка совпадения имён моделей:
// - точное совпадение (case-insensitive, с нормализацией)
// - дилерская модель начинается с известного имени + пробел (для вариантов типа "DASHING AWD")
const isNameMatch = (candidateModel, knownName) => {
  const c = normalize(candidateModel);
  const k = normalize(knownName);
  if (!c || !k) return false;
  return c === k || c.startsWith(k + ' ');
};

// --- Загрузка и нормализация дилерских данных ---

const loadDealerData = (filePath) => {
  const raw = readJSON(filePath);
  if (!raw) return [];

  // Формат объекта: { "Model": { "Конечная цена": ..., "Скидка": ..., "РРЦ": ..., "id": ... } }
  if (!Array.isArray(raw)) {
    return Object.entries(raw).map(([model, data]) => ({
      model,
      id: data.id || '',
      price: data[Key.PRICE],
      benefit: data[Key.BENEFIT],
      priceOfficial: data[Key.PRICE_OFFICIAL],
      brand: data.brand || data['Бренд'] || '',
    }));
  }

  // Массив с русскоязычными ключами
  if (raw.length && raw[0] && Object.prototype.hasOwnProperty.call(raw[0], 'Скидка')) {
    return raw.filter(item => item?.['Модель']).map(item => ({
      model: item['Модель'],
      id: item.id || '',
      price: item[Key.PRICE],
      benefit: item[Key.BENEFIT],
      priceOfficial: item[Key.PRICE_OFFICIAL],
      brand: item.brand || item['Бренд'] || '',
    }));
  }

  // Уже нормализованный формат массива
  return raw;
};

// --- Сбор известных имён для модели ---

const getKnownNames = (model) => {
  const names = [];
  if (model.name) names.push(model.name);
  if (getModelDisplayName(model)) names.push(getModelDisplayName(model));
  getModelFeedModelNames(model).forEach(fn => {
    if (fn && !names.some(n => normalize(n) === normalize(fn))) {
      names.push(fn);
    }
  });
  return names;
};

// --- Поиск федеральных данных ---

const findFederalMatch = (federalData, ourId, brand, knownNames) => {
  if (!federalData.length) return null;

  // 1. Точный id
  let match = federalData.find(f => f.id === ourId);
  if (match) return match;

  // 2. Нормализованный id (u5_plus vs u5-plus)
  const normalizedOurId = normalizeId(ourId);
  match = federalData.find(f => normalizeId(f.id) === normalizedOurId);
  if (match) return match;

  // 3. По brand + name/feed_names: ищем федеральную модель, чьё название совпадает с любым из knownNames
  const brandLower = brand.toLowerCase();
  match = federalData.find(f => {
    if ((f.brand || '').toLowerCase() !== brandLower) return false;
    return knownNames.some(name => isNameMatch(f.model, name));
  });

  return match || null;
};

// --- Поиск дилерских данных ---

const findDealerMatches = (dealerData, ourId, brand, knownNames) => {
  if (!dealerData.length) return [];
  const brandLower = brand.toLowerCase();
  const normalizedOurId = normalizeId(ourId);

  return dealerData.filter(d => {
    // Приоритет — сопоставление по id (устойчиво к разночтениям в названии модели)
    if (d.id) return normalizeId(d.id) === normalizedOurId;

    // Fallback — по brand + name, если id в строке не проставлен
    if (!knownNames.length) return false;
    const dealerBrand = (d.brand || '').toLowerCase();
    if (dealerBrand && dealerBrand !== brandLower) return false;
    return knownNames.some(name => isNameMatch(d.model, name));
  });
};

// --- Агрегация ---

const aggregateMin = (matches, key) => {
  const values = matches.map(m => parseNumber(m[key])).filter(v => v > 0);
  return values.length ? Math.min(...values) : 0;
};

const aggregateMax = (matches, key) => {
  const values = matches.map(m => parseNumber(m[key])).filter(v => v > 0);
  return values.length ? Math.max(...values) : 0;
};

// --- Основная логика ---

const allModels = loadModelCatalog();
if (!allModels.length) {
  console.error(Message.ERROR_NO_MODELS);
  process.exit(1);
}

const federalData = readJSON(federalFilePath) || [];
const dealerData = loadDealerData(dealerFilePath);
const dealerCarsData = loadDealerData(dealerCarsFilePath);

const results = [];

allModels.forEach(model => {
  const brand = getModelBrandId(model);
  if (!brand || !model.id) return;

  const ourId = constructId(brand, model.id);
  const knownNames = getKnownNames(model);

  // Поиск федеральных данных
  const federal = findFederalMatch(federalData, ourId, brand, knownNames);

  // Поиск дилерских данных
  const dealerMatches = findDealerMatches(dealerData, ourId, brand, knownNames);
  const dealerCarsMatches = findDealerMatches(dealerCarsData, ourId, brand, knownNames);

  const priceFederal = federal ? parseNumber(federal.price) : 0;
  const benefitFederal = federal ? parseNumber(federal.benefit) : 0;
  const priceOfficial = aggregateMin(dealerMatches, 'priceOfficial');
  const priceDealer = DISABLE_GSHEET_PRICE ? 0 : aggregateMin(dealerMatches, 'price');
  const benefitDealer = DISABLE_GSHEET_BENEFIT ? 0 : aggregateMax(dealerMatches, 'benefit');
  const priceDealerAVN = DISABLE_FEED_PRICE ? 0 : aggregateMin(dealerCarsMatches, 'price');
  const benefitDealerAVN = DISABLE_FEED_BENEFIT ? 0 : aggregateMax(dealerCarsMatches, 'benefit');

  const prices = [priceFederal, priceDealer, priceDealerAVN].filter(p => p > 0);
  const benefits = [benefitFederal, benefitDealer, benefitDealerAVN];

  results.push({
    id: ourId,
    brand,
    model: getModelDisplayName(model),
    price: prices.length ? Math.min(...prices) : 0,
    benefit: Math.max(0, ...benefits),
    priceOfficial,
    priceFederal,
    benefitFederal,
    priceDealer,
    benefitDealer,
    priceDealerAVN,
    benefitDealerAVN,
  });
});

fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
console.log(Message.SUCCESS);
