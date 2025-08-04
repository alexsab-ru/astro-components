import fs from 'fs';
import path from 'path';
import { MONTH_NOMINATIVE, MONTH_GENITIVE, MONTH_PREPOSITIONAL, MONTH, FIRST_DAY, LAST_DAY, YEAR } from '../../src/js/utils/date.js';
import { currencyFormat } from '../../src/js/utils/numbers.format.js';
import dotenv from 'dotenv';

dotenv.config();

// Указываем папки для обработки
const dataDirectory = path.join(process.cwd(), 'src', 'data');
const contentDirectory = path.join(process.cwd(), 'src', 'content');
const pagesDirectory = path.join(process.cwd(), 'src', 'pages');

// Массив для отслеживания измененных файлов
const modifiedFiles = [];
// Массив для хранения файлов с приближающимися датами
const filesWithUpcomingDates = [];

// Проверяем наличие файла all-prices.json
const carsFilePath = path.join(dataDirectory, 'all-prices.json');
let carsData = [];

if (fs.existsSync(carsFilePath)) {
  const carsFileContent = fs.readFileSync(carsFilePath, 'utf-8');
  try {
    carsData = JSON.parse(carsFileContent);
    if (!Array.isArray(carsData)) {
      carsData = [];
    }
  } catch (error) {
    console.error("Ошибка парсинга файла all-prices.json:", error);
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

// Проверяем наличие файла settings.json
const settingsFilePath = path.join(dataDirectory, 'settings.json');
let settingsData = {};
let settingsPlaceholder = {};

if (fs.existsSync(settingsFilePath)) {
  try {
    const settingsFileContent = fs.readFileSync(settingsFilePath, 'utf-8');
    settingsData = JSON.parse(settingsFileContent) || {};
  } catch (error) {
    console.error("Ошибка парсинга файла settings.json:", error);
  }
}

if(Object.keys(settingsData).length > 0) {
  // Список ключей для создания плейсхолдеров
  const settingsKeys = ['brand', 'site_name', 'site_description', 'legal_city', 'legal_city_where', 'phone_common'];

  Object.keys(settingsData).forEach(sKey => {
    if (settingsKeys.includes(sKey)) {
      settingsPlaceholder[`{{${sKey}}}`] = settingsData[sKey];
    }
  });
}

// Функция для замены плейсхолдеров в содержимом файла
function replacePlaceholders(content) {
  const placeholders = {
    '{{firstDay}}': FIRST_DAY,
    '{{lastDay}}': LAST_DAY,
    '{{month}}': MONTH,
    '{{monthNominative}}': MONTH_NOMINATIVE,
    '{{monthGenitive}}': MONTH_GENITIVE,
    '{{monthPrepositional}}': MONTH_PREPOSITIONAL,
    '{{year}}': YEAR,
    ...settingsPlaceholder,
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

// Функция для конвертации даты в формат DD.MM.YYYY
const convertToDDMMYYYY = (dateStr) => {
  const parts = dateStr.split(/[^\d]/);
  if (parts[0].length === 4) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
};

// Функция для проверки, находится ли дата в пределах двух дней
const isDateWithinTwoDays = (dateStr) => {
  const [day, month, year] = dateStr.split('.').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  const diffTime = Math.abs(today - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays <= 2 || diffDays === 0;
};

// Функция для поиска дат в содержимом файла
const searchDates = (content, filePath) => {
  // Ищем даты в формате DD.MM.YYYY или DD-MM-YYYY или DD/MM/YYYY
  const format1 = content.match(/\b(\d{2}[.\-/]\d{2}[.\-/]\d{4})\b/g);
  // Ищем даты в формате YYYY.MM.DD или YYYY-MM-DD или YYYY/MM/DD
  const format2 = content.match(/\b(\d{4}[.\-/]\d{2}[.\-/]\d{2})\b/g);
  console.log(filePath, format1, format2);
  const allDates = [...(format1 || []), ...(format2 || [])];
  const convertedDates = allDates.map(date => convertToDDMMYYYY(date));
  const filteredDates = convertedDates.filter(isDateWithinTwoDays);

  if (filteredDates.length) {
    filesWithUpcomingDates.push({
      filePath: filePath,
      dates: filteredDates
    });
  }
};

// Функция для формирования URL в зависимости от расположения файла
function generateUrl(filePath, domain) {
  const relativePath = path.relative(process.cwd(), filePath);
  
  // Если файл находится в src/content/
  if (relativePath.startsWith('src/content/')) {
    const pathWithoutPrefix = relativePath.replace('src/content/', '');
    const fileNameWithoutExt = path.basename(pathWithoutPrefix, path.extname(pathWithoutPrefix));
    const directoryPath = path.dirname(pathWithoutPrefix);
    
    if (directoryPath === '.') {
      return `https://${domain}/${fileNameWithoutExt}/`;
    } else {
      return `https://${domain}/${directoryPath}/${fileNameWithoutExt}/`;
    }
  }
  
  // Если файл находится в src/pages/
  if (relativePath.startsWith('src/pages/')) {
    const pathWithoutPrefix = relativePath.replace('src/pages/', '');
    const fileNameWithoutExt = path.basename(pathWithoutPrefix, path.extname(pathWithoutPrefix));
    const directoryPath = path.dirname(pathWithoutPrefix);
    
    if (directoryPath === '.') {
      return `https://${domain}/${fileNameWithoutExt}/`;
    } else {
      return `https://${domain}/${directoryPath}/${fileNameWithoutExt}/`;
    }
  }
  
  // Если файл banners.json - ссылка на главную страницу
  if (relativePath.includes('banners.json')) {
    return `https://${domain}/`;
  }
  
  // Для остальных файлов - просто домен
  return `https://${domain}/`;
}

// Функция для обработки файла
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { content: updatedContent, hasChanges } = replacePlaceholders(content);

    // Проверяем даты в файле
    searchDates(content, filePath);

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
      if (!filePath.includes('all-prices.json') && 
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

// Вывод информации о приближающихся датах
if (filesWithUpcomingDates.length > 0) {
  console.log('\n❗️ ВНИМАНИЕ! Приближаются даты окончания:');
  const domain = process.env.DOMAIN;
  let htmlOutput = '<b>❗️ ВНИМАНИЕ! Приближаются даты окончания:</b>\n\n';
  
  filesWithUpcomingDates.forEach(({ filePath, dates }) => {
    const relativePath = path.relative(process.cwd(), filePath);
    const url = generateUrl(filePath, domain);
    
    // Формируем текст для вывода (одинаковый для консоли и HTML)
    const outputText = `\nФайл: \`${relativePath}\`
URL: ${url}
Даты окончания: ${dates.join(', ')}`;
    
    // Выводим в консоль
    console.log(outputText);
    
    // Добавляем в HTML для файла
    htmlOutput += `<strong>Файл:</strong> <code>${relativePath}</code>\n
<strong>URL:</strong> <a href="${url}">${url}</a>\n
<strong>Даты окончания:</strong> ${dates.join(', ')}\n
\n`;
  });
  
  // Сохраняем результаты в файл
  const outputPath = './special-offers-dates.txt';
  fs.writeFileSync(outputPath, htmlOutput, 'utf8');
  console.log(`\nРезультаты сохранены в файл: ${outputPath}`);
}
