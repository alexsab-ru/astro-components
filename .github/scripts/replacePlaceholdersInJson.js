import fs from 'fs';
import path from 'path';
import { MONTH_NOMINATIVE, MONTH_GENITIVE, MONTH_PREPOSITIONAL, MONTH, LAST_DAY, YEAR } from '../src/js/utils/date';

// Указываем папку с JSON файлами
const dataDirectory = path.join(process.cwd(), 'src', 'data');

// Проверяем наличие файла cars.json
const carsFilePath = path.join(dataDirectory, 'allPrices.json');
let carsData = [];

if (fs.existsSync(carsFilePath)) {
  const carsFileContent = fs.readFileSync(carsFilePath, 'utf-8');
  try {
    carsData = JSON.parse(carsFileContent);
    if (!Array.isArray(carsData)) {
      carsData = []; // Если данные не являются массивом, обнуляем их
    }
  } catch (error) {
    console.error("Ошибка парсинга файла allPrices.json:", error);
  }
}

// Создаем объект для хранения цен по моделям
const carsPlaceholder = {};
if (carsData.length > 0) {
  carsData.forEach(car => {
    if (car.id !== undefined && car.price !== undefined) {
      carsPlaceholder[`{{price-${car.id}}}`] = car.price;
      carsPlaceholder[`{{priceb-${car.id}}}`] = currencyFormat(car.price);
    }
    if (car.id !== undefined && car.benefit !== undefined) {
      carsPlaceholder[`{{benefit-${car.id}}}`] = car.benefit;
      carsPlaceholder[`{{benefitb-${car.id}}}`] = currencyFormat(car.benefit);
    }
  });
}

function currencyFormat(number, locale = 'ru-RU') {
  // Проверка на null, undefined, или пустую строку
  if (number === null || number === undefined || number === '' || isNaN(number)) {
    return "";
  }

  // Если number является строкой, пытаемся преобразовать её в число
  if (typeof number === 'string') {
    number = parseFloat(number);
  }

  // Если после преобразования значение не является числом (например, если оно было невалидной строкой)
  if (isNaN(number)) {
    return "";
  }

  return number.toLocaleString(locale, { 
    style: "currency", 
    currency: "RUB", 
    minimumFractionDigits: 0,
  });
}

// Функция для замены плейсхолдеров в содержимом файла
function replacePlaceholders(content) {
  const placeholders = {
    '{{lastDay}}': LAST_DAY,
    '{{month}}': MONTH,
    '{{monthNominative}}': MONTH_NOMINATIVE,
    '{{monthGenitive}}': MONTH_GENITIVE,
    '{{monthPrepositional}}': MONTH_PREPOSITIONAL,
    '{{year}}': YEAR,
    ...carsPlaceholder, // Добавляем к остальным плейсхолдерам плейсхолдеры из json тачек, если они есть
  };

  for (let placeholder in placeholders) {
    content = content.replace(new RegExp(placeholder, 'g'), placeholders[placeholder]);
  }
  return content;
}

// Проходим по всем файлам в директории
fs.readdir(dataDirectory, (err, files) => {
  if (err) {
    console.error("Ошибка чтения директории:", err);
    return;
  }

  files.forEach(file => {
    const filePath = path.join(dataDirectory, file);

    // Пропускаем cars.json, так как он уже обработан
    if (filePath.includes('cars.json') || filePath.includes('allPrices.json') || filePath.includes('dealer_price.json')) {
      return;
    }

    // Проверяем, является ли файл JSON
    if (path.extname(filePath) === '.json') {
      fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) {
          console.error("Ошибка чтения файла:", err);
          return;
        }

        // Заменяем плейсхолдеры в содержимом
        const updatedContent = replacePlaceholders(data);

        // Записываем обновленное содержимое обратно в файл
        fs.writeFile(filePath, updatedContent, 'utf-8', (err) => {
          if (err) {
            console.error("Ошибка записи файла:", err);
            return;
          }
          console.log(`Плейсхолдеры в файле ${file} успешно заменены!`);
        });
      });
    }
  });
});
