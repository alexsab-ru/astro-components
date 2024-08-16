// node .github/scripts/replacePlaceholdersInJson.js
import fs from 'fs';
import path from 'path';

// Указываем папку с JSON файлами
const dataDirectory = path.join(process.cwd(), 'src', 'data');

// Текущая дата для подстановки
const today = new Date();
const month = today.getMonth() + 1;

const months = {
  1: { nominative: 'Январь', genitive: 'Января', prepositional: 'Январе' },
  2: { nominative: 'Февраль', genitive: 'Февраля', prepositional: 'Феврале' },
  3: { nominative: 'Март', genitive: 'Марта', prepositional: 'Марте' },
  4: { nominative: 'Апрель', genitive: 'Апреля', prepositional: 'Апреле' },
  5: { nominative: 'Май', genitive: 'Мая', prepositional: 'Мае' },
  6: { nominative: 'Июнь', genitive: 'Июня', prepositional: 'Июне' },
  7: { nominative: 'Июль', genitive: 'Июля', prepositional: 'Июле' },
  8: { nominative: 'Август', genitive: 'Августа', prepositional: 'Августе' },
  9: { nominative: 'Сентябрь', genitive: 'Сентября', prepositional: 'Сентябре' },
  10: { nominative: 'Октябрь', genitive: 'Октября', prepositional: 'Октябре' },
  11: { nominative: 'Ноябрь', genitive: 'Ноября', prepositional: 'Ноябре' },
  12: { nominative: 'Декабрь', genitive: 'Декабря', prepositional: 'Декабре' }
};

// Проверяем наличие файла cars.json
const carsFilePath = path.join(dataDirectory, 'cars.json');
let carsData = [];

if (fs.existsSync(carsFilePath)) {
  const carsFileContent = fs.readFileSync(carsFilePath, 'utf-8');
  try {
    carsData = JSON.parse(carsFileContent);
    if (!Array.isArray(carsData)) {
      carsData = []; // Если данные не являются массивом, обнуляем их
    }
  } catch (error) {
    console.error("Ошибка парсинга файла cars.json:", error);
  }
}

// Создаем объект для хранения цен по моделям
const prices = {};
const pricesb = {};
if (carsData.length > 0) {
  carsData.forEach(car => {
    if (car.id && car.price) {
      prices[`{{price-${car.id}}}`] = car.price;
      pricesb[`{{priceb-${car.id}}}`] = currencyFormat(car.price);
    }
  });
}

function currencyFormat(number, locale = 'ru-RU') {
  // Проверка на null, undefined, или пустую строку
  if (number === null || number === undefined || number === '' || isNaN(number)) {
    return;
  }

  // Если number является строкой, пытаемся преобразовать её в число
  if (typeof number === 'string') {
    number = parseFloat(number);
  }

  // Если после преобразования значение не является числом (например, если оно было невалидной строкой)
  if (isNaN(number)) {
    return;
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
    '{{lastDay}}': new Date(today.getFullYear(), month, 0).getDate(),
    '{{month}}': String(today.getMonth() + 1).padStart(2, '0'),
    '{{monthNominative}}': months[month].nominative,
    '{{monthGenitive}}': months[month].genitive,
    '{{monthPrepositional}}': months[month].prepositional,
    '{{year}}': today.getFullYear(),
    ...prices, // Добавляем цены к плейсхолдерам, если они есть
    ...pricesb // Добавляем красивые цены к плейсхолдерам, если они есть
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
    if (filePath.includes('cars.json')) {
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
