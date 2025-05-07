import fs from 'fs';
import path from 'path';

// Указываем папку с JSON файлами
const dataDirectory = path.join(process.cwd(), 'src', 'data');
const carsFilePath = path.join(dataDirectory, 'cars.json');
const dealerPriceFilePath = path.join(dataDirectory, 'dealer_price.json');

let carsData = [];
let dealerPriceData = [];
let allPrices = [];

if (fs.existsSync(carsFilePath) && fs.existsSync(dealerPriceFilePath)) {
  const carsFileContent = fs.readFileSync(carsFilePath, 'utf-8');
  const dealerPriceFileContent = fs.readFileSync(dealerPriceFilePath, 'utf-8');
  try {
    carsData = JSON.parse(carsFileContent);
    let dealerPriceDataObj = JSON.parse(dealerPriceFileContent);
    dealerPriceData = Object.keys(dealerPriceDataObj).map(key => ({
      id: key,
      price: dealerPriceDataObj[key]['Конечная цена'],
      benefit: dealerPriceDataObj[key]['Скидка'],
    }));
    if (!Array.isArray(carsData) || !Array.isArray(dealerPriceData)) {
      carsData = []; // Если данные не являются массивом, обнуляем их
      dealerPriceData = [];
    }
  } catch (error) {
    console.error("Ошибка парсинга файла cars.json или dealer_price.json:", error);
  }
}

console.log(carsData);
console.log(dealerPriceData);

const getModel = (modelId) => {
  const regex = /-(.+)$/;
  const match = modelId.match(regex);
  return match ? match[1] : null;
};

const getBrand = (modelId) => {
  const regex = /^(.*?)-/;
  const match = modelId.match(regex);
  return match ? match[1] : null;
};

allPrices = carsData.map(item => {
  let itemId = getModel(item.id);
  if (itemId) {
    let dealer = dealerPriceData.find(item => item.id === itemId);
    return {
      id: item.id,
      brand: getBrand(item.id),
      model: item.model,
      price: currencyFormat(item.price),
      dealerPrice: dealer.price,
      benefit: currencyFormat(item.benefit),
      dealerBenefit: dealer.benefit,
      minPrice: Math.min(item.price, dealer.price),
      maxBenefit: Math.max(item.benefit, dealer.benefit)
    }
  } else {
    console.log(`Не удалось найти модель ${item.id} в файле dealer_price.json`);
  }
  
});

function currencyFormat(number) {
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

  return number;
}

// Функция для создания JSON файла
function createAllPricesFile() {
  const outputPath = path.join(dataDirectory, 'allPrices.json');
  
  try {
    // Преобразуем массив в JSON строку с отступами для читаемости
    const jsonData = JSON.stringify(allPrices, null, 2);
    
    // Записываем данные в файл
    fs.writeFileSync(outputPath, jsonData, 'utf-8');
    console.log('Файл allPrices.json успешно создан в папке src/data/');
  } catch (error) {
    console.error('Ошибка при создании файла:', error);
  }
};

if (allPrices.length) {
  createAllPricesFile();
} else {
  console.log('Не удалось создать файл allPrices.json');
}
