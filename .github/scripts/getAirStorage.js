import fs from 'fs';
import fsPromises from 'fs/promises'; // Используем промисы из fs
import path from 'path';
import https from 'https';
import * as csv from 'csv-parse';

// Получение переменных среды
let csvUrl = process.env.AIR_STORAGE_CSV_URL;
const regex = /.*?\/d\/(.*?)\/edit.*gid=(\d+)/;
const matches = csvUrl.match(regex);
if (matches) {
    csvUrl = `https://docs.google.com/spreadsheets/d/${matches[1]}/gviz/tq?gid=${matches[2]}&tqx=out:CSV&headers=1&tq=`;
} else {
    console.log("URL does not match the expected format.");
    exit;
}

const queryString = process.env.QUERY_STRING;
const query = csvUrl + encodeURIComponent(queryString);
const keyColumn = process.env.KEY_COLUMN;

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
        csv.parse(csvData, { columns: true }, (err, records) => {
            if (err) {
                reject(err);
                return;
            }

            const result = {};
            records.forEach(record => {
                if (Object.values(record).some(value => value.trim() !== '')) {
                    const key = cleanString(record[keyColumn]);
                    let value = record[Object.keys(record).find(field => field !== keyColumn)].trim();

                    // Преобразуем строку в число, если это возможно
                    if (/^-?\d+(\s\d+)*(\.\d+)?$/.test(value)) {
                        value = Number(value.replace(/\s+/g, ''));
                    }

                    result[key] = value;
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
    try {
        const csvData = await downloadCsv(query);
        const jsonData = await convertCsvToJson(csvData, keyColumn);
        
        const outputFilePaths = process.env.OUTPUT_PATHS ? process.env.OUTPUT_PATHS.split(',') : ['./output/prices.json'];
        await saveJson(jsonData, outputFilePaths);
    } catch (error) {
        console.error('Произошла ошибка:', error);
    }
}

main();
