import fs from 'fs';
import path from 'path';

const dataDirectory = path.join(process.cwd(), 'src', 'data');
const outputFileName = 'all-prices.json'
const outputPath = path.join(dataDirectory, outputFileName);
const federalFilePath = path.join(dataDirectory, 'federal-models_price.json');
const dealerFilePath = path.join(dataDirectory, 'dealer-models_price.json');
const dealerCarsFilePath = path.join(dataDirectory, 'dealer-models_cars_price.json');

const Message = {
  SUCCESS: 'Файл all-prices.json успешно создан',
  ERROR: 'Ошибка: Файл federal-models_price.json не найден'
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
    if (!Array.isArray(data)) {
      return normalizeData(data);
    } else {
      return data.length ? data : [];
    }
  }
  return [];
};

const getValue = (data, model, key) => {
  if (data.length) {
    const item = data.find(d => d?.model?.toLowerCase().replace(/\s/g, '') === model.toLowerCase().replace(/\s/g, ''));
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

