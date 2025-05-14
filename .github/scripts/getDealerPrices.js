// node .github/scripts/getDealerPrices.js
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import https from 'https';
import { parse } from 'csv-parse';

// Получение переменных среды
const csvUrl = process.env.CSV_URL;
const queryString = process.env.QUERY_STRING;
const query = csvUrl;// + encodeURIComponent(queryString);
const keyColumn = process.env.KEY_COLUMN;

console.log("query", query);
// Функция для скачивания CSV
function downloadCsv(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });
            response.on('end', () => {
                resolve(data);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// Функция для парсинга CSV и конвертации в JSON
function convertCsvToJson(csvData, keyColumn) {
    return new Promise((resolve, reject) => {
        parse(csvData, { columns: true }, (err, records) => {
            if (err) {
                reject(err);
                return;
            }

            const result = {};
            const keyMapping = JSON.parse(process.env.KEY_MAPPING || '{}'); // Получаем карту переименования

            records.forEach(record => {
                if (Object.values(record).some(value => value.trim() !== '')) {
                    const key = cleanString(record[keyColumn]).toLowerCase();
                    const transformedRecord = {};

                    if(key == "") {
                        return;
                    }

                    // Проходим по всем полям записи и приводим значения к числу, если возможно
                    Object.keys(record).forEach(field => {
                        if (field !== keyColumn) { // Исключаем поле с ключом
                            let value = record[field].trim(); // Убираем лишние пробелы
                            // Преобразуем строку в число, если это возможно
                            if (/^-?\d+(\s\d+)*(\.\d+)?$/.test(value)) {
                                // Убираем пробелы внутри числа и преобразуем в число
                                value = Number(value.replace(/\s+/g, ''));
                            }
                            // Переименовываем ключи согласно карте
                            const newKey = keyMapping[field] || field; // Если ключ не найден в карте, оставляем оригинальный
                            if(newKey == "") {
                                return;
                            }
                            if (result[key] !== undefined) {
                                console.log(key, newKey, value, result[key][newKey]);
                                if (newKey === 'Конечная цена') {
                                    transformedRecord[newKey] = Math.min(result[key][newKey], value);
                                } else if (newKey === 'Скидка') {
                                    transformedRecord[newKey] = Math.max(result[key][newKey], value);
                                } else {
                                    transformedRecord[newKey] = value;
                                }
                            } else {
                                transformedRecord[newKey] = value;
                            }
                        }
                    });
                    result[key] = transformedRecord;
                }
            });

            resolve(result);
        });
    });
}

function cleanString(str, wordToRemove) {
    // Шаг 1: Удаляем все вхождения определённого слова (регистрозависимое удаление)
    let cleanedStr = str.replace(new RegExp(wordToRemove, 'g'), '');

    // Шаг 2: Удаляем все символы, кроме букв и цифр (буквы и цифры из любой языковой группы)
    cleanedStr = cleanedStr.replace(/[^a-zA-Z0-9]/g, '');

    return cleanedStr;
}

async function saveJson(data, filePaths) {
    for (const filePath of filePaths) {
        try {
            const directory = path.dirname(filePath);
            await fsPromises.mkdir(directory, { recursive: true }); // Используем fsPromises
            await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8'); // Используем fsPromises
            console.log(`Данные успешно сохранены в файл: ${filePath}`);
        } catch (error) {
            console.error(`Ошибка сохранения файла ${filePath}: ${error}`);
        }
    }
}

// Основная функция
async function main() {
    console.log("main");
    try {
        const csvData = await downloadCsv(query);
        const jsonData = await convertCsvToJson(csvData, keyColumn);
        console.log("jsonData", jsonData);
        
        const outputFilePaths = process.env.OUTPUT_PATHS ? process.env.OUTPUT_PATHS.split(',') : ['./output/prices.json'];
        await saveJson(jsonData, outputFilePaths);
    } catch (error) {
        console.error('Произошла ошибка:', error);
    }
}

main();
