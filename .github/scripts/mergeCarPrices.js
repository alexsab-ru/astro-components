import fs from 'fs';
import path from 'path';

const dataDirectory = path.join(process.cwd(), 'src', 'data');
const outputFileName = 'all-prices.json'
const outputPath = path.join(dataDirectory, outputFileName);
const federalFilePath = path.join(dataDirectory, 'all-cars.json');
const dealerFilePath = path.join(dataDirectory, 'dealer-models_price.json');
const dealerCarsFilePath = path.join(dataDirectory, 'dealer-models_cars_price.json');

const Message = {
  SUCCESS: 'Файл all-prices.json успешно создан',
  ERROR: 'Ошибка: Файл all-cars.json не найден'
};

const Key = {
  PRICE: 'Конечная цена',
  BENEFIT: 'Скидка',
  PRICE_OFFICIAL: 'РРЦ'
};

const results = [];

const normalizeData = (data) => {
  return Object.keys(data).map((item) => {
    return {
      model: item,
      price: data[item][Key.PRICE],
      benefit: data[item][Key.BENEFIT],
      priceOfficial: data[item][Key.PRICE_OFFICIAL]
    }
  });
};

const checkFiles = (path) => {
  if (fs.existsSync(path)) {
    let data = JSON.parse(fs.readFileSync(path, 'utf-8'));
    // Если data не массив, то нормализуем через normalizeData
    if (!Array.isArray(data)) {
      return normalizeData(data);
    } else {
      // Если массив не пустой и первый элемент - объект с ключом "Скидка", тоже нормализуем
      if (
        data.length &&
        typeof data[0] === 'object' &&
        data[0] !== null &&
        Object.prototype.hasOwnProperty.call(data[0], 'Скидка')
      ) {
        // Документируем: иногда dealer-models_price.json - это массив объектов с ключами "Скидка", "Конечная цена" и т.д.
        // В этом случае тоже нужно привести к единому виду через normalizeData
        // Преобразуем массив объектов в объект, где ключ - название модели
        const dataObj = {};
        data.forEach(item => {
          if (item && item['Модель']) {
            dataObj[item['Модель']] = item;
          }
        });
        return normalizeData(dataObj);
      }
      // В остальных случаях возвращаем массив как есть (или пустой массив)
      return data.length ? data : [];
    }
  }
  return [];
};

const getValue = (data, model, key) => {
  if (data.length) {
    // Для сравнения убираем слова "новая", "новый", "new" из названия модели
    // Это позволит корректно сопоставлять модели с разными вариантами написания
    const normalizeModelName = (name) => {
      if (!name) return '';
      // Удаляем слова "новая", "новый", "new" (без учета регистра), а также пробелы
      return name
        .toLowerCase()
        .replace(/\b(новая|новый)\b/g, '') // убираем слова
        .replace(/\s/g, ''); // убираем пробелы
    };

    const item = data.find(d => normalizeModelName(d?.model) === normalizeModelName(model));
    return item ? item[key] : 0;
  }
  return 0;
};

const parseNumber = (value) => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

if (!fs.existsSync(federalFilePath)) {
  console.error(Message.ERROR);
  process.exit(1);
} else {
  const federalData = JSON.parse(fs.readFileSync(federalFilePath, 'utf-8'));
  const dealerData = checkFiles(dealerFilePath);
  const dealerCarsData = checkFiles(dealerCarsFilePath);

  federalData.forEach((federalItem) => {
    let priceFederal = parseNumber(federalItem.price);
    let benefitFederal = parseNumber(federalItem.benefit);
    let priceOfficial = parseNumber(getValue(dealerData, federalItem.model, 'priceOfficial'));
    let priceDealer = parseNumber(getValue(dealerData, federalItem.model, 'price'));
    let priceDealerAVN = parseNumber(getValue(dealerCarsData, federalItem.model, 'price'));
    let benefitDealer = parseNumber(getValue(dealerData, federalItem.model, 'benefit'));
    let benefitDealerAVN = parseNumber(getValue(dealerCarsData, federalItem.model, 'benefit'));
    let prices = [priceFederal, priceDealer, priceDealerAVN].filter(item => item > 0);
    let benefits = [benefitFederal, benefitDealer, benefitDealerAVN];
    results.push({
      id: federalItem.id,
      brand: federalItem.brand,
      model: federalItem.model,
      price: prices.length ? Math.min(...prices) : 0,
      benefit: Math.max(...benefits),
      priceOfficial,
      priceFederal,
      benefitFederal,
      priceDealer,
      benefitDealer,
      priceDealerAVN,
      benefitDealerAVN
    });
  })
  
}

fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
console.log(Message.SUCCESS);

