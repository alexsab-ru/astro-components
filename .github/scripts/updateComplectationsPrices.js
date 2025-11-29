import fs from 'fs';
import path from 'path';

// Утилиты для логирования
const logSuccess = (msg) => console.log('\x1b[30;42m%s\x1b[0m', msg);
const logWarning = (msg) => console.log('\x1b[30;43m%s\x1b[0m', msg);
const logError = (msg) => console.log('\x1b[30;41m%s\x1b[0m', msg);
const logInfo = (msg) => console.log('\x1b[36m%s\x1b[0m', msg);

// Утилита для чтения JSON
const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    // Не выводим полный стек ошибки, только информацию о том, что файл не найден
    return null;
  }
};

// Утилита для записи JSON
const writeJson = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    logWarning(`⚠ Ошибка записи JSON файла: ${err.message}`);
    return false;
  }
};

// Функция для поиска модели по ID в complectations-prices.json
const findModelById = (modelId, complectationsPrices) => {
  // Перебираем все бренды
  for (const brandModels of Object.values(complectationsPrices)) {
    // Ищем модель внутри массива моделей бренда
    const model = brandModels.find(m => m.model_id === modelId);
    if (model) {
      return model;
    }
  }
  return null;
};

// Основная функция обновления цен
const updateComplectationsPrices = () => {
  logInfo('=== Начало обновления цен комплектаций ===');
  
  // Пути к файлам
  const dataDirectory = path.join(process.cwd(), 'src', 'data');
  const modelsFilePath = path.join(dataDirectory, 'models.json');
  const complectationsPricesFilePath = path.join(dataDirectory, 'complectations-prices.json');
  
  // Читаем файлы
  const modelsData = readJson(modelsFilePath);
  const complectationsPrices = readJson(complectationsPricesFilePath);
  
  // Если не удалось загрузить файл с ценами - это не критично
  if (!complectationsPrices) {
    logWarning('⚠ Файл complectations-prices.json не найден или пуст');
    logWarning('⚠ Обновление цен пропущено. Будут использованы текущие цены из models.json');
    logInfo('=== Обновление завершено (пропущено) ===');
    return;
  }
  
  // Если нет models.json - это более критично, но всё равно не падаем
  if (!modelsData) {
    logWarning('⚠ Файл models.json не найден');
    logWarning('⚠ Обновление цен невозможно');
    return;
  }
  
  let updatedCount = 0;
  let totalComplectations = 0;
  const { models } = modelsData;
  
  // Обновляем цены в models
  const updatedModels = models.map(model => {
    // Ищем модель в данных о ценах
    const priceModel = findModelById(model.id, complectationsPrices);
    
    // Если модель не найдена или нет комплектаций, возвращаем как есть
    if (!priceModel || !model.complectations || model.complectations.length === 0) {
      return model;
    }
    
    logInfo(`Обновление цен для модели: ${model.name || model.id}`);
    
    // Обновляем комплектации
    const updatedComplectations = model.complectations.map(complectation => {
      totalComplectations++;
      
      // Ищем совпадение по имени комплектации
      const priceComplectation = priceModel.complectations.find(
        pc => pc.name === complectation.name
      );
      
      // Если нашли совпадение и цена не пустая, обновляем price
      if (priceComplectation && priceComplectation.price) {
        const oldPrice = complectation.price;
        let newPrice = priceComplectation.price;
        
        // Если есть скидка (benefit), вычитаем её из цены
        if (priceComplectation.benefit) {
          const priceNum = parseInt(newPrice, 10);
          const benefitNum = parseInt(priceComplectation.benefit, 10);
          
          if (!isNaN(priceNum) && !isNaN(benefitNum) && benefitNum > 0) {
            const priceWithDiscount = priceNum - benefitNum;
            newPrice = String(priceWithDiscount);
            console.log(`  ✓ ${complectation.name}: ${oldPrice} → ${newPrice} (скидка: ${benefitNum})`);
          } else {
            console.log(`  ✓ ${complectation.name}: ${oldPrice} → ${newPrice}`);
          }
        } else {
          console.log(`  ✓ ${complectation.name}: ${oldPrice} → ${newPrice}`);
        }
        
        if (oldPrice !== newPrice) {
          updatedCount++;
        }
        
        return {
          ...complectation,
          price: newPrice
        };
      }
      
      // Если не нашли или цена пустая - возвращаем как есть
      return complectation;
    });
    
    return {
      ...model,
      complectations: updatedComplectations
    };
  });
  
  // Сохраняем обновленные данные
  const updatedModelsData = {
    ...modelsData,
    models: updatedModels
  };
  
  if (writeJson(modelsFilePath, updatedModelsData)) {
    logSuccess(`✓ Успешно обновлено цен: ${updatedCount} из ${totalComplectations} комплектаций`);
    logInfo('=== Обновление завершено ===');
  } else {
    logWarning('⚠ Не удалось сохранить обновленный файл models.json');
    logWarning('⚠ Будут использованы текущие цены');
  }
};

// Запуск скрипта
try {
  updateComplectationsPrices();
} catch (error) {
  logWarning('⚠ Ошибка при выполнении скрипта обновления цен');
  logWarning(`⚠ ${error.message}`);
  logWarning('⚠ Продолжаем работу со старыми ценами');
}

