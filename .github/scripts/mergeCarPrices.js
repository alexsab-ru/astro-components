import fs from 'fs';
import path from 'path';

// Пути к файлам
const dataDirectory = path.join(process.cwd(), 'src', 'data');
const federalFilePath = path.join(dataDirectory, 'federal-models_price.json');
const dealerFilePath = path.join(dataDirectory, 'dealer-models_price.json');
const dealerCarsFilePath = path.join(dataDirectory, 'dealer-models_cars_price.json');
const modelsFilePath = path.join(dataDirectory, 'models.json');

// Проверяем наличие федерального файла
if (!fs.existsSync(federalFilePath)) {
  console.error('Ошибка: Файл federal-models_price.json не найден');
  process.exit(1);
}

// Читаем федеральный файл
const federalData = JSON.parse(fs.readFileSync(federalFilePath, 'utf-8'));

// Читаем файл с моделями
const modelsData = JSON.parse(fs.readFileSync(modelsFilePath, 'utf-8'));

// Функция для получения ID модели из models.json
function getModelId(brand, modelName) {
  const model = modelsData.models.find(m => 
    m.mark_id.toLowerCase() === brand.toLowerCase() && 
    m.name.toLowerCase() === modelName.toLowerCase()
  );
  return model ? model.id : null;
}

// Функция для преобразования строки в число
function parseNumber(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

// Функция для преобразования дилерских данных
function transformDealerData(dealerData) {
  return Object.values(dealerData).map(item => {
    const brand = item['Бренд'] || item['brand'] || '';
    const modelName = item['Модель'] || item['model'] || '';
    const modelId = getModelId(brand, modelName);
    console.log(brand, modelName, modelId);
    
    // --- Новая логика: если у item уже есть id или ids, используем их ---
    let id = null;
    if (item.id) {
      // Если id уже есть, используем его
      id = item.id;
    } else if (item.ids && Array.isArray(item.ids) && item.ids.length > 0) {
      // Если есть массив ids, используем первый элемент
      id = item.ids[0];
    } else if (modelId) {
      // Стандартная логика формирования id
      const brandLower = brand.toLowerCase();
      const modelIdLower = modelId.toLowerCase();
      id = modelIdLower.includes(brandLower) ? modelId : `${brandLower}-${modelId}`;
    }
    // ---------------------------------------------------------------
    
    return {
      id: id,
      brand: brand,
      model: modelName,
      priceDealer: parseNumber(item['Конечная цена']) || parseNumber(item['salePrice']),
      benefitDealer: parseNumber(item['Скидка']) || parseNumber(item['maxDiscount']),
      priceOfficial: parseNumber(item['РРЦ'])
    };
  }).filter(item => item.id !== null);
}

// Читаем и преобразуем дилерские данные
let dealerData = [];
if (fs.existsSync(dealerFilePath)) {
  const dealerRawData = JSON.parse(fs.readFileSync(dealerFilePath, 'utf-8'));
  dealerData = transformDealerData(dealerRawData);
}

// Читаем и преобразуем данные по отдельным автомобилям дилеров (АВН)
let dealerCarsData = [];
if (fs.existsSync(dealerCarsFilePath)) {
  const dealerCarsRawData = JSON.parse(fs.readFileSync(dealerCarsFilePath, 'utf-8'));
  dealerCarsData = transformDealerData(dealerCarsRawData);
}

// Объединяем данные
const mergedData = federalData.map(federalItem => {
  const priceFederal = parseNumber(federalItem.price);
  const benefitFederal = parseNumber(federalItem.benefit || 0);
  const prices = [priceFederal];
  const benefits = [benefitFederal];
  let dealerItem = null;
  let dealerCarItem = null;
  
  if (dealerData.length) {
    dealerItem = dealerData.find(d => d.id === federalItem.id);
    if (!dealerItem) {
      dealerItem = dealerData.find(d => (d.brand.toLowerCase() === federalItem.brand.toLowerCase() && d.model.toLowerCase() === federalItem.model.toLowerCase()));
      if (!dealerItem) {
        console.log("dealerItem not found for federalItem:", federalItem.id);
      }
    }
  }

  if (dealerCarsData.length) {
    dealerCarItem = dealerCarsData.find(d => d.id === federalItem.id);

    if (!dealerCarItem) {
      dealerCarItem = dealerCarsData.find(d => (d.brand.toLowerCase() === federalItem.brand.toLowerCase() && d.model.toLowerCase() === federalItem.model.toLowerCase()));
    }
  }
  
  if (dealerItem) {
    prices.push(dealerItem?.priceDealer, dealerItem?.priceOfficial);
    benefits.push(dealerItem?.benefitDealer);
  }

  if (dealerCarItem) {
    prices.push(dealerCarItem?.priceDealer);
    benefits.push(dealerCarItem?.benefitDealer);
  }

  // Ищем минимальную цену среди всех возможных цен (исключая нулевые значения)
  const priceValues = prices.filter(price => price > 0); // Исключаем нулевые и отрицательные значения

  const price = priceValues.length > 0 ? Math.min(...priceValues) : priceFederal;

  // Ищем максимальную выгоду (исключая нулевые значения)
  const benefitValues = benefits.filter(benefit => benefit > 0); // Исключаем нулевые и отрицательные значения

  const benefit = benefitValues.length > 0 ? Math.max(...benefitValues) : benefitFederal;
  
  return {
    ...federalItem,
    priceFederal,
    benefitFederal,
    priceDealer: dealerItem ? dealerItem?.priceDealer : null,
    benefitDealer: dealerItem ? dealerItem?.benefitDealer : null,
    priceOfficial: dealerItem ? dealerItem?.priceOfficial : null,
    priceDealerAVN: dealerCarItem ? dealerCarItem?.priceDealer : null,
    benefitDealerAVN: dealerCarItem ? dealerCarItem?.benefitDealer : null,
    price,
    benefit,
  };
});

// Сохраняем результат
const outputPath = path.join(dataDirectory, 'all-prices.json');
fs.writeFileSync(outputPath, JSON.stringify(mergedData, null, 2), 'utf-8');
console.log('Файл all-prices.json успешно создан');

