import fs from 'fs';
import path from 'path';
import { MONTH_NOMINATIVE, MONTH_GENITIVE, MONTH_PREPOSITIONAL, MONTH, FIRST_DAY, LAST_DAY, YEAR } from '../../src/js/utils/date.js';
import { currencyFormat } from '../../src/js/utils/numbers.format.js';
import { quoteEscaper } from '../../src/js/utils/helpers.js';
import dotenv from 'dotenv';

dotenv.config();

// Указываем папки для обработки
const dataDirectory = path.join(process.cwd(), 'src', 'data');
const contentDirectory = path.join(process.cwd(), 'src', 'content');
const pagesDirectory = path.join(process.cwd(), 'src', 'pages');

// Иконка для дисклеймера
const infoIcon = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>';

// Массив для отслеживания измененных файлов
const modifiedFiles = [];
// Массив для хранения файлов с приближающимися датами
const filesWithUpcomingDates = [];

// Получаем данные с валидацией типов
const carsData = readAndValidateJSON('all-prices.json', 'array', []);
const disclaimerData = readAndValidateJSON('federal-disclaimer.json', 'object', {});

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

          // если объект не пустой и есть ключ для текущего car.id и одно из значений не пустое, то добавляем в плейсхолдер дисклеймер
          if( Object.keys(disclaimerData).length && (disclaimerData?.[car.id] && disclaimerData?.[car.id]?.[key] !== '') ) {
            carsPlaceholder[`{{${key}b-${car.id}}}`] += quoteEscaper(`<span>&nbsp;</span><span class="tooltip-icon" data-text="${disclaimerData[car.id][key]}">${infoIcon}</span>`);
          }

        }
      });
    }
  });
}

// Общая функция для чтения и валидации JSON-файла
function readAndValidateJSON(fileName, expectedType, defaultValue) {
  const filePath = path.join(dataDirectory, fileName);
  if (!fs.existsSync(filePath)) return defaultValue;
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    let data = JSON.parse(content);
    
    // Проверка соответствия ожидаемому типу
    if (expectedType === 'array' && !Array.isArray(data)) {
      return defaultValue;
    }
    
    if (expectedType === 'object' && Array.isArray(data)) {
      return defaultValue;
    }
    
    return data;
  } catch (error) {
    console.error(`Ошибка парсинга файла ${fileName}:`, error);
    return defaultValue;
  }
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

// Нормализуем любые DD.MM.YYYY / DD-MM-YYYY / YYYY.MM.DD / и т.п. в YYYY-MM-DD
function normalizeToISO(dateStr) {
  const p = dateStr.split(/[^\d]/).map(Number);
  // если первый элемент — это год (YYYY)
  if (p[0] > 1900) return `${p[0].toString().padStart(4,'0')}-${p[1].toString().padStart(2,'0')}-${p[2].toString().padStart(2,'0')}`;
  // иначе DD,MM,YYYY
  return `${p[2].toString().padStart(4,'0')}-${p[1].toString().padStart(2,'0')}-${p[0].toString().padStart(2,'0')}`;
}

// Проверяем «в пределах 2 дней» для ISO (YYYY-MM-DD)
function isDateWithinTwoDaysISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0,0,0,0);
  date.setHours(0,0,0,0);
  const diffDays = Math.ceil(Math.abs(today - date) / (1000 * 60 * 60 * 24));
  return diffDays <= 2;
}

// Функция для конвертации ISO даты (YYYY-MM-DD) в человеко-читаемый формат (DD.MM.YYYY)
// Используется только для вывода пользователю, внутри всё хранится в ISO
function isoToDDMMYYYY(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

// Функция для поиска дат в содержимом файла
const searchDates = (content, filePath) => {
  // Разбиваем текст на строки для более точной проверки
  const lines = content.split('\n');
  const allDates = [];

  for (const line of lines) {
     // Проверяем, содержит ли строка pubDate: в начале
     if (!line.trim().startsWith('pubDate:')) {
      // Ищем даты в формате DD.MM.YYYY или DD-MM-YYYY или DD/MM/YYYY
      const format1 = line.match(/\b(\d{2}[.\-/]\d{2}[.\-/]\d{4})\b/g);
      // Ищем даты в формате YYYY.MM.DD или YYYY-MM-DD или YYYY/MM/DD
      const format2 = line.match(/\b(\d{4}[.\-/]\d{2}[.\-/]\d{2})\b/g);

      // Добавляем найденные даты в общий массив
      if (format1) allDates.push(...format1);
      if (format2) allDates.push(...format2);
     }
  }

  if (allDates.length) {
    const converted = allDates.map(normalizeToISO);
    const filtered = converted.filter(isDateWithinTwoDaysISO);
    // Уникализируем и сортируем по времени "как строки"
    const uniqueSorted = Array.from(new Set(filtered)).sort();

    if (uniqueSorted.length) {
      filesWithUpcomingDates.push({
        filePath: filePath,
        dates: uniqueSorted
      });
    }
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
          !filePath.includes('dealer-models_price.json')) {
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
  let htmlOutputMarketing = '<b>❗️ ВНИМАНИЕ! Приближаются даты окончания:</b>\n\n';
  
  filesWithUpcomingDates.forEach(({ filePath, dates }) => {
    const relativePath = path.relative(process.cwd(), filePath);
    const url = generateUrl(filePath, domain);
    
    // Преобразуем даты в человеко-читаемый формат один раз
    const readableDates = dates.map(isoToDDMMYYYY).join(', ');
    
    // Формируем текст для вывода (одинаковый для консоли и HTML)
    const outputText = `\nФайл: \`${relativePath}\`\nURL: ${url}\nДаты окончания: ${readableDates}`;
    
    // Выводим в консоль
    console.log(outputText);
    
    // Добавляем в HTML для файла
    htmlOutput += `<strong>Файл:</strong> <code>${relativePath}</code>\n<strong>URL:</strong> <a href="${url}">${url}</a>\n<strong>Даты окончания:</strong> ${readableDates}\n\n`;

    htmlOutputMarketing += `<strong>URL:</strong> <a href="${url}">${url}</a>\n<strong>Даты окончания:</strong> ${readableDates}\n\n`;
  });
  
  // Сохраняем результаты в файл
  const outputPath = './special-offers-dates.txt';
  fs.writeFileSync(outputPath, htmlOutput, 'utf8');
  const outputPathMarketing = './special-offers-dates-marketing.txt';
  fs.writeFileSync(outputPathMarketing, htmlOutputMarketing, 'utf8');
  console.log(`\nРезультаты сохранены в файл: ${outputPath}, ${outputPathMarketing}`);
}
