// node .github/scripts/replacePlaceholdersInJson.js
import fs from 'fs';
import path from 'path';

// Указываем папку с JSON файлами
const dataDirectory = path.join(process.cwd(), 'src', 'data');

// Текущая дата для подстановки
const today = new Date();
const placeholders = {
  '{{lastDay}}': new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(),
  '{{month}}': String(today.getMonth() + 1).padStart(2, '0'),
  '{{year}}': today.getFullYear()
};

// Функция для замены плейсхолдеров в содержимом файла
function replacePlaceholders(content) {
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
