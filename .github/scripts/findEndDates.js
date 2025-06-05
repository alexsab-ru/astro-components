import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const folderNames = ['special-offers', 'specials', 'specials-offers'];
const folderName = folderNames.find(folderName => fs.existsSync(`./src/content/${folderName}`));
const outputPath = './.github/scripts/special-offers-dates.txt';

let results = [];

const convertToMarkdown = (results) => {
  const domain = process.env.DOMAIN;
  let str = '❗️ *ВНИМАНИЕ!*\n\nПриближаются даты окончания акций:\n\n';
  results.forEach(result => {
    const fileNameWithoutExt = result.fileName.replace(/\.[^/.]+$/, '');
    str += `https://${domain}/special-offers/${fileNameWithoutExt},\n*Даты окончания:*\n${result.dates.join(', ')}\n-----------\n`;
  })
  return str;
};

const convertToDDMMYYYY = (dateStr) => {
  
  // Разбиваем строку на части, используя любой нецифровой символ как разделитель
  const parts = dateStr.split(/[^\d]/);
  
  // Если первая часть имеет 4 цифры, значит это формат yyyy-mm-dd
  if (parts[0].length === 4) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  
  // Иначе это формат dd-mm-yyyy или dd.mm.yyyy
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
};

const isDateWithinTwoDays = (dateStr) => {
  const [day, month, year] = dateStr.split('.').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  
  // Устанавливаем время в начало дня для корректного сравнения
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  const diffTime = Math.abs(today - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays <= 2 || diffDays === 0;
};

const searchDates = (fileContent, fileName) => {
  const format1 = fileContent.match(/(\d{2}[^\d]\d{2}[^\d]\d{4})/g);
  const format2 = fileContent.match(/(\d{4}[^\d]\d{2}[^\d]\d{2})/g);
  const allDates = [...(format1 || []), ...(format2 || [])];
  const convertedDates = allDates.map(date => convertToDDMMYYYY(date));
  const filteredDates = convertedDates.filter(isDateWithinTwoDays); 

  if (filteredDates.length) {
    results.push({
      fileName: fileName,
      dates: filteredDates
    });
  } else {
    return;
  }
};

const readFiles = (files) => {
  files.forEach(file => {
    searchDates(fs.readFileSync(`./src/content/${folderName}/${file}`, 'utf8'), file);
  });
}

if (folderName) {
  const folderPath = `./src/content/${folderName}`;
  const files = fs.readdirSync(folderPath);
  const publishedFiles = files.length ? files.filter(file => !file.startsWith('__')) : [];
  readFiles(publishedFiles);
  
  // Сохраняем результаты в файл
  
  fs.writeFileSync(outputPath, convertToMarkdown(results), 'utf8');
  console.log(`Результаты сохранены в файл: ${outputPath}`);
} else {
  console.log('Folder not found.');
}

