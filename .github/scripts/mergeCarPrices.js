import fs from 'fs';
import path from 'path';

const dataDirectory = path.join(process.cwd(), 'src', 'data');
const outputPath = path.join(dataDirectory, 'all-prices.json');
const federalFilePath = path.join(dataDirectory, 'all-cars.json');
const dealerFilePath = path.join(dataDirectory, 'dealer-models_price.json');
const dealerCarsFilePath = path.join(dataDirectory, 'dealer-models_cars_price.json');
const allModelsFilePath = path.join(dataDirectory, 'all-models.json');

const Message = {
  SUCCESS: 'Файл all-prices.json успешно создан',
  ERROR_NO_MODELS: 'Ошибка: Файл all-models.json не найден',
};

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

// Замена похожих кириллических символов на латинские (для сопоставления моделей вроде "Т1" vs "T1")
const CYRILLIC_TO_LATIN = { 'а':'a','в':'b','с':'c','е':'e','к':'k','м':'m','н':'h','о':'o','р':'p','т':'t','у':'y','х':'x' };
const cyrillicToLatin = (str) => str.replace(/[авсекмнорту]/g, ch => CYRILLIC_TO_LATIN[ch] || ch);

// Нормализация имени модели для сравнения
const normalize = (name) => {
  if (!name && name !== 0) return '';
  return cyrillicToLatin(
    String(name)
      .toLowerCase()
      .replace(/\b(новая|новый|new)\b/gi, '')
      .trim()
      .replace(/\s+/g, ' ')
  );
};

// Нормализация id для сравнения (убираем разницу между _ и -)
const normalizeId = (id) => {
  if (!id) return '';
  return id.toLowerCase().replace(/[-_]/g, '');
};

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

  // Формат объекта: { "Model": { "Конечная цена": ..., "Скидка": ..., "РРЦ": ... } }
  if (!Array.isArray(raw)) {
    return Object.entries(raw).map(([model, data]) => ({
      model,
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
  if (Array.isArray(model.feed_names)) {
    model.feed_names.forEach(fn => {
      if (fn && !names.some(n => normalize(n) === normalize(fn))) {
        names.push(fn);
      }
    });
  }
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

const findDealerMatches = (dealerData, brand, knownNames) => {
  if (!dealerData.length || !knownNames.length) return [];
  const brandLower = brand.toLowerCase();

  return dealerData.filter(d => {
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

if (!fs.existsSync(allModelsFilePath)) {
  console.error(Message.ERROR_NO_MODELS);
  process.exit(1);
}

const allModels = readJSON(allModelsFilePath) || [];
const federalData = readJSON(federalFilePath) || [];
const dealerData = loadDealerData(dealerFilePath);
const dealerCarsData = loadDealerData(dealerCarsFilePath);

const results = [];
const unmatchedFederal = new Set(federalData.map(f => f.id));

allModels.forEach(model => {
  if (!model.mark_id || !model.id) return;

  const brand = model.mark_id.toLowerCase();
  const ourId = constructId(model.mark_id, model.id);
  const knownNames = getKnownNames(model);

  // Поиск федеральных данных
  const federal = findFederalMatch(federalData, ourId, brand, knownNames);
  if (federal) unmatchedFederal.delete(federal.id);

  // Поиск дилерских данных
  const dealerMatches = findDealerMatches(dealerData, brand, knownNames);
  const dealerCarsMatches = findDealerMatches(dealerCarsData, brand, knownNames);

  const priceFederal = federal ? parseNumber(federal.price) : 0;
  const benefitFederal = federal ? parseNumber(federal.benefit) : 0;
  const priceOfficial = aggregateMin(dealerMatches, 'priceOfficial');
  const priceDealer = aggregateMin(dealerMatches, 'price');
  const benefitDealer = aggregateMax(dealerMatches, 'benefit');
  const priceDealerAVN = aggregateMin(dealerCarsMatches, 'price');
  const benefitDealerAVN = aggregateMax(dealerCarsMatches, 'benefit');

  const prices = [priceFederal, priceDealer, priceDealerAVN].filter(p => p > 0);
  const benefits = [benefitFederal, benefitDealer, benefitDealerAVN];

  results.push({
    id: ourId,
    brand,
    model: model.name,
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

// Предупреждения о несопоставленных федеральных моделях
if (unmatchedFederal.size > 0) {
  const header = `Не найдены в all-models.json (${unmatchedFederal.size}):`;
  const lines = [...unmatchedFederal].map(id => `  - ${id}`);
  const message = [header, ...lines].join('\n');

  console.warn(`\n${message}`);

  // Дописываем в output.txt для уведомления в workflow
  const outputTxtPath = path.join(process.cwd(), 'output.txt');
  const outputContent = `<b>mergeCarPrices:</b> ${header}\n${lines.map(l => `<code>${l.trim()}</code>`).join('\n')}\n\n`;
  fs.appendFileSync(outputTxtPath, outputContent, 'utf-8');
}

fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
console.log(Message.SUCCESS);
