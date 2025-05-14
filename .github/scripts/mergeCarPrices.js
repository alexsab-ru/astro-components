import fs from 'fs';
import path from 'path';

// Пути к файлам
const dataDirectory = path.join(process.cwd(), 'src', 'data');
const federalFilePath = path.join(dataDirectory, 'federal-models_price.json');
const dealerFilePath = path.join(dataDirectory, 'dealer-models_price.json');
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
  const model = modelsData.find(m => 
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
  return dealerData.map(item => {
    const brand = item['Бренд'];
    const modelName = item['Модель'];
    const modelId = getModelId(brand, modelName);
    
    return {
      id: modelId ? `${brand.toLowerCase()}-${modelId}` : null,
      brand: brand,
      model: modelName,
      priceDealer: parseNumber(item['Конечная цена']),
      benefitDealer: parseNumber(item['Скидка']),
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

// Объединяем данные
const mergedData = federalData.map(federalItem => {
  const dealerItem = dealerData.find(d => d.id === federalItem.id);
  
  if (dealerItem) {
    const priceMin = Math.min(
      parseNumber(federalItem.price),
      dealerItem.priceDealer
    );
    
    const benefitMax = Math.max(
      parseNumber(federalItem.benefit || 0),
      dealerItem.benefitDealer
    );
    
    return {
      ...federalItem,
      price: parseNumber(federalItem.price),
      benefit: parseNumber(federalItem.benefit || 0),
      priceDealer: dealerItem.priceDealer,
      benefitDealer: dealerItem.benefitDealer,
      priceOfficial: dealerItem.priceOfficial,
      priceMin,
      benefitMax
    };
  }
  
  return {
    ...federalItem,
    price: parseNumber(federalItem.price),
    benefit: parseNumber(federalItem.benefit || 0),
    priceMin: parseNumber(federalItem.price),
    benefitMax: parseNumber(federalItem.benefit || 0)
  };
});

// Сохраняем результат
const outputPath = path.join(dataDirectory, 'allPrices.json');
fs.writeFileSync(outputPath, JSON.stringify(mergedData, null, 2), 'utf-8');
console.log('Файл allPrices.json успешно создан');

