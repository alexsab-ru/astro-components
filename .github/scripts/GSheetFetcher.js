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
        if (/^-?\d+(\s\d+)*(\.\d+)?$/.test(value)) {
            return Number(value.replace(/\s+/g, ''));
        }
        return value;
    }

    async convertCsvToJson(csvData) {
        return new Promise((resolve, reject) => {
            csv.parse(csvData, { columns: true }, (err, records) => {
                if (err) {
                    reject(err);
                    return;
                }

                const result = {};
                records.forEach(record => {
                    if (Object.values(record).some(value => value.trim() !== '')) {
                        const key = this.cleanString(record[this.config.keyColumn]);

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
                                if (field !== this.config.keyColumn) {
                                    let value = record[field].trim();
                                    transformedRecord[field] = this.convertToNumber(value);
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
