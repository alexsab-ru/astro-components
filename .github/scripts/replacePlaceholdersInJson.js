import fs from 'fs';
import path from 'path';
import { MONTH_NOMINATIVE, MONTH_GENITIVE, MONTH_PREPOSITIONAL, MONTH, LAST_DAY, YEAR } from '../../src/js/utils/date.js';
import { currencyFormat } from '../../src/js/utils/numbers.format.js';

// Указываем папки для обработки
const dataDirectory = path.join(process.cwd(), 'src', 'data');
const contentDirectory = path.join(process.cwd(), 'src', 'content');
const pagesDirectory = path.join(process.cwd(), 'src', 'pages');

// Массив для отслеживания измененных файлов
const modifiedFiles = [];

// Проверяем наличие файла allPrices.json
const carsFilePath = path.join(dataDirectory, 'allPrices.json');
let carsData = [];

if (fs.existsSync(carsFilePath)) {
  const carsFileContent = fs.readFileSync(carsFilePath, 'utf-8');
  try {
    carsData = JSON.parse(carsFileContent);
    if (!Array.isArray(carsData)) {
      carsData = [];
    }
  } catch (error) {
    console.error("Ошибка парсинга файла allPrices.json:", error);
  }
}

// Создаем объект для хранения плейсхолдеров
const carsPlaceholder = {};
if (carsData.length > 0) {
  carsData.forEach(car => {
    if (car.id) {
      // Список ключей для создания плейсхолдеров
      const numericKeys = ['price', 'benefit', 'priceFederal', 'benefitFederal', 'priceDealer', 'benefitDealer', 'priceOfficial'];
      
      numericKeys.forEach(key => {
        if (car[key] !== undefined) {
          // Обычный плейсхолдер
          carsPlaceholder[`{{${key}-${car.id}}}`] = car[key];
          // Плейсхолдер с форматированием
          carsPlaceholder[`{{${key}b-${car.id}}}`] = currencyFormat(car[key]);
        }
      });
    }
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
    ...carsPlaceholder,
  };

  let hasChanges = false;
  let updatedContent = content;

  for (let placeholder in placeholders) {
    const regex = new RegExp(placeholder, 'g');
    if (regex.test(updatedContent)) {
      updatedContent = updatedContent.replace(regex, placeholders[placeholder]);
      hasChanges = true;
    }
  }

  return { content: updatedContent, hasChanges };
}

// Функция для обработки файла
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { content: updatedContent, hasChanges } = replacePlaceholders(content);

    if (hasChanges) {
      fs.writeFileSync(filePath, updatedContent, 'utf-8');
      modifiedFiles.push(filePath);
      console.log(`Плейсхолдеры в файле ${path.basename(filePath)} успешно заменены!`);
    }
  } catch (error) {
    console.error(`Ошибка обработки файла ${filePath}:`, error);
  }
}

// Функция для рекурсивного обхода директории
function processDirectory(directory, fileExtensions) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processDirectory(filePath, fileExtensions);
    } else if (fileExtensions.includes(path.extname(filePath))) {
      // Пропускаем файлы с ценами
      if (!filePath.includes('allPrices.json') && 
          !filePath.includes('cars_dealer_price.json') && 
          !filePath.includes('cars.json') && 
          !filePath.includes('dealer_price.json') && 
          !filePath.includes('dealer-models_price.json') && 
          !filePath.includes('federal-models_price.json')) {
        processFile(filePath);
      }
    }
  });
}

// Обработка всех директорий
console.log('Начинаем обработку файлов...');

// Обработка JSON файлов
processDirectory(dataDirectory, ['.json']);

// Обработка MDX файлов
processDirectory(contentDirectory, ['.mdx']);

// Обработка Astro файлов
processDirectory(pagesDirectory, ['.astro']);

// Вывод результатов
console.log('\nОбработка завершена!');
if (modifiedFiles.length > 0) {
  console.log('\nИзмененные файлы:');
  modifiedFiles.forEach(file => console.log(`- ${file}`));
} else {
  console.log('\nФайлы не были изменены.');
}
