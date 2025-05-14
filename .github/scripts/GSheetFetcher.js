import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const https = require('https');
const csv = require('csv-parse');

class GSheetFetcher {
    constructor(config) {
        this.config = {
            csvUrl: process.env.CSV_URL || config.csvUrl,
            queryString: process.env.QUERY_STRING || config.queryString || '',
            keyColumn: process.env.KEY_COLUMN || config.keyColumn,
            outputPaths: process.env.OUTPUT_PATHS ? 
                process.env.OUTPUT_PATHS.split(',') : 
                config.outputPaths || ['./output/prices.json'],
            // Новый параметр для определения формата вывода
            outputFormat: config.outputFormat || 'simple' // 'simple' or 'detailed'
        };

        // Преобразование URL Google Sheets в формат для скачивания
        const regex = /.*?\/d\/(.*?)\/edit.*gid=(\d+)/;
        const matches = this.config.csvUrl.match(regex);
        if (matches) {
            this.config.csvUrl = `https://docs.google.com/spreadsheets/d/${matches[1]}/gviz/tq?gid=${matches[2]}&tqx=out:CSV&headers=1&tq=`;
        } else {
            throw new Error("URL does not match the expected format.");
        }
    }

    async downloadCsv() {
        const query = this.config.csvUrl + encodeURIComponent(this.config.queryString);
        return new Promise((resolve, reject) => {
            https.get(query, (response) => {
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

    cleanString(str, wordToRemove = '') {
        let cleanedStr = str;
        if (wordToRemove) {
            cleanedStr = cleanedStr.replace(new RegExp(wordToRemove, 'g'), '');
        }
        return cleanedStr.replace(/[^a-zA-Z0-9]/g, '');
    }

    convertToNumber(value) {
        if (typeof value === 'string' && value.trim() === '') {
            return null; // Пустые строки приводятся к null
        }
        
        if (/^-?\d+(\s\d+)*(\.\d+)?$/.test(value)) {
            return Number(value.replace(/\s+/g, '').replace(',', '.'));
        }
        
        return value; // Если не число, возвращаем оригинальное значение
    }

    async convertCsvToJson(csvData) {
        return new Promise((resolve, reject) => {
            csv.parse(csvData, { columns: true }, (err, records) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (!this.config.keyColumn) {
                    records.map(record => {
                        Object.keys(record).forEach(field => {
                            record[field] = record[field].trim();
                        });
                    });
                    const filteredRecords = records.filter(row => {
                        return Object.values(row).some(value => value !== "" && value !== null && value !== undefined);
                    });
                    resolve(filteredRecords);
                    return;
                }

                const result = {};
                const keyMapping = JSON.parse(process.env.KEY_MAPPING || '{}'); // Получаем карту переименования

                records.forEach(record => {
                    if (Object.values(record).some(value => value.trim() !== '')) {
                        const key = this.cleanString(record[this.config.keyColumn]);

                        if(key == "") {
                            return;
                        }

                        if (this.config.outputFormat === 'simple') {
                            // Простой формат: ключ -> значение
                            let value = record[Object.keys(record).find(field => 
                                field !== this.config.keyColumn)].trim();
                            value = this.convertToNumber(value);

                            if (result[key]) {
                                result[key] += value;
                            } else {
                                result[key] = value;
                            }
                        } else {
                            // Детальный формат: ключ -> объект с полями
                            const transformedRecord = {};
                            Object.keys(record).forEach(field => {
                                let value = record[field].trim();

                                // Переименовываем ключи согласно карте
                                const newKey = keyMapping[field] || field; // Если ключ не найден в карте, оставляем оригинальный
                                if(newKey == "") {
                                    return;
                                }

                                if (result[key] !== undefined) {
                                    if (newKey === 'Конечная цена' || newKey === 'РРЦ') {
                                        transformedRecord[newKey] = Math.min(result[key][newKey], value);
                                    } else if (newKey === 'Скидка') {
                                        transformedRecord[newKey] = Math.max(result[key][newKey], value);
                                    } else {
                                        transformedRecord[newKey] = this.convertToNumber(value);
                                    }
                                } else {
                                    transformedRecord[newKey] = this.convertToNumber(value);
                                }
                            });
                            result[key] = transformedRecord;
                        }
                    }
                });

                resolve(result);
            });
        });
    }

    async saveJson(data) {
        for (const filePath of this.config.outputPaths) {
            try {
                const directory = path.dirname(filePath);
                await fsPromises.mkdir(directory, { recursive: true });
                await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
                console.log(`Data successfully saved to file: ${filePath}`);
            } catch (error) {
                console.error(`Error saving file ${filePath}: ${error}`);
            }
        }
    }

    async process() {
        try {
            const csvData = await this.downloadCsv();
            const jsonData = await this.convertCsvToJson(csvData);
            await this.saveJson(jsonData);
            return jsonData;
        } catch (error) {
            console.error('An error occurred:', error);
            throw error;
        }
    }
}

// Поддержка как ESM, так и CommonJS
export default GSheetFetcher;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GSheetFetcher;
}

// import GSheetFetcher from './GSheetFetcher.js';

const config = {
    csvUrl: process.env.CSV_URL,
    queryString: process.env.QUERY_STRING,
    keyColumn: process.env.KEY_COLUMN,
    outputPaths: process.env.OUTPUT_PATHS ? process.env.OUTPUT_PATHS.split(',') : ['./output.json'],
    outputFormat: process.env.OUTPUT_FORMAT
};

const fetcher = new GSheetFetcher(config);
fetcher.process().catch(console.error);
