import { createRequire } from 'module';
import { fileURLToPath } from 'url';

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
            queryMode: (process.env.QUERY_MODE || config.queryMode || 'export').toLowerCase(),
            fallbackToGviz: this.parseBoolean(process.env.FALLBACK_TO_GVIZ ?? config.fallbackToGviz, true),
            keyColumn: process.env.KEY_COLUMN || config.keyColumn,
            keyMapping: process.env.KEY_MAPPING || config.keyMapping,
            outputPaths: process.env.OUTPUT_PATHS ?
                process.env.OUTPUT_PATHS.split(',') :
                config.outputPaths || ['./output/prices.json'],
            outputFormat: process.env.OUTPUT_FORMAT || config.outputFormat || 'simple',
            outputType: process.env.OUTPUT_TYPE || config.outputType || 'json',
            outputTxtPath: config.outputTxtPath || path.join(process.cwd(), 'output.txt')
        };

        const { documentId, gid } = this.extractSheetInfo(this.config.csvUrl);
        this.sheetInfo = { documentId, gid };
        this.urls = {
            export: `https://docs.google.com/spreadsheets/d/${documentId}/export?format=csv&gid=${gid}`,
            gviz: `https://docs.google.com/spreadsheets/d/${documentId}/gviz/tq?gid=${gid}&tqx=out:CSV&headers=1&tq=`
        };
    }

    parseBoolean(value, defaultValue = false) {
        if (value === undefined || value === null || value === '') {
            return defaultValue;
        }

        if (typeof value === 'boolean') {
            return value;
        }

        return !['0', 'false', 'no', 'off'].includes(String(value).trim().toLowerCase());
    }

    extractSheetInfo(csvUrl) {
        if (!csvUrl) {
            throw new Error('CSV_URL is not set.');
        }

        const documentIdMatch = String(csvUrl).match(/\/d\/([^/]+)/);
        const gidMatch = String(csvUrl).match(/[?&#]gid=(\d+)/);

        if (!documentIdMatch || !gidMatch) {
            throw new Error('URL does not match the expected Google Sheets format.');
        }

        return {
            documentId: documentIdMatch[1],
            gid: gidMatch[1]
        };
    }

    async fetchUrl(url, redirectCount = 0) {
        return new Promise((resolve, reject) => {
            https.get(url, (response) => {
                const { statusCode, headers } = response;

                if (statusCode && statusCode >= 300 && statusCode < 400 && headers.location) {
                    if (redirectCount >= 5) {
                        reject(new Error(`Too many redirects while fetching "${url}".`));
                        return;
                    }

                    const redirectedUrl = new URL(headers.location, url).toString();
                    response.resume();
                    resolve(this.fetchUrl(redirectedUrl, redirectCount + 1));
                    return;
                }

                if (statusCode && statusCode >= 400) {
                    reject(new Error(`Request failed with status ${statusCode} for "${url}".`));
                    response.resume();
                    return;
                }

                response.setEncoding('utf8');
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

    async downloadExportCsv() {
        return this.fetchUrl(this.urls.export);
    }

    async downloadGvizCsv() {
        const query = this.urls.gviz + encodeURIComponent(this.config.queryString);
        return this.fetchUrl(query);
    }

    async downloadCsv() {
        if (this.config.queryMode === 'gviz') {
            return this.downloadGvizCsv();
        }

        if (this.config.queryMode !== 'export') {
            throw new Error(`Unsupported QUERY_MODE "${this.config.queryMode}". Use "export" or "gviz".`);
        }

        try {
            const csvData = await this.downloadExportCsv();
            return await this.applyQueryToCsvData(csvData);
        } catch (error) {
            if (!this.config.fallbackToGviz) {
                throw error;
            }

            await this.logFallbackToOutput(error);
            console.warn(`Export mode failed, falling back to gviz: ${error.message}`);
            return this.downloadGvizCsv();
        }
    }

    async parseCsvRows(csvData) {
        return new Promise((resolve, reject) => {
            csv.parse(csvData, { bom: true, relax_column_count: true }, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(rows);
            });
        });
    }

    normalizeCellValue(value) {
        if (value === undefined || value === null) {
            return '';
        }

        return String(value).trim();
    }

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    async logFallbackToOutput(error) {
        const message = [
            '<b>GSheetFetcher:</b> export mode failed, fallback to gviz',
            `<code>${this.escapeHtml(this.config.queryString || 'QUERY_STRING is empty')}</code>`,
            `<code>${this.escapeHtml(error.message)}</code>`,
            ''
        ].join('\n');

        try {
            await fsPromises.appendFile(this.config.outputTxtPath, message, 'utf8');
        } catch (writeError) {
            console.error(`Failed to write fallback log to output.txt: ${writeError.message}`);
        }
    }

    parseQueryString(queryString) {
        const normalizedQuery = (queryString || '').trim();
        if (!normalizedQuery) {
            return null;
        }

        const match = normalizedQuery.match(/^select\s+(.+?)(?:\s+where\s+(.+))?$/i);
        if (!match) {
            throw new Error(`Unsupported query syntax: "${normalizedQuery}".`);
        }

        const selectColumns = this.parseSelectClause(match[1].trim());
        const whereExpression = match[2] ? this.parseWhereClause(match[2].trim()) : null;

        return {
            selectColumns,
            whereExpression
        };
    }

    parseSelectClause(selectClause) {
        if (selectClause === '*') {
            return null;
        }

        const columns = selectClause
            .split(',')
            .map(column => column.trim())
            .filter(Boolean);

        if (!columns.length) {
            throw new Error('SELECT clause is empty.');
        }

        columns.forEach((column) => {
            if (!/^[A-Za-z]+$/.test(column)) {
                throw new Error(`Unsupported column reference "${column}" in SELECT clause.`);
            }
        });

        return columns.map(column => column.toUpperCase());
    }

    tokenizeWhereClause(whereClause) {
        const tokens = [];
        let index = 0;

        while (index < whereClause.length) {
            const char = whereClause[index];

            if (/\s/.test(char)) {
                index += 1;
                continue;
            }

            if (char === '(' || char === ')' || char === '=') {
                tokens.push({ type: char });
                index += 1;
                continue;
            }

            if (char === '\'') {
                let value = '';
                index += 1;

                while (index < whereClause.length) {
                    const currentChar = whereClause[index];

                    if (currentChar === '\'') {
                        if (whereClause[index + 1] === '\'') {
                            value += '\'';
                            index += 2;
                            continue;
                        }

                        index += 1;
                        break;
                    }

                    value += currentChar;
                    index += 1;
                }

                if (index > whereClause.length || whereClause[index - 1] !== '\'') {
                    throw new Error(`Unterminated string literal in WHERE clause: "${whereClause}".`);
                }

                tokens.push({ type: 'STRING', value });
                continue;
            }

            const tokenMatch = whereClause.slice(index).match(/^[A-Za-z0-9_.-]+/);
            if (!tokenMatch) {
                throw new Error(`Unexpected token "${char}" in WHERE clause.`);
            }

            const value = tokenMatch[0];
            const loweredValue = value.toLowerCase();
            if (loweredValue === 'and') {
                tokens.push({ type: 'AND' });
            } else if (loweredValue === 'or') {
                tokens.push({ type: 'OR' });
            } else if (/^\d+(?:[.,]\d+)?$/.test(value)) {
                tokens.push({ type: 'NUMBER', value });
            } else {
                tokens.push({ type: 'IDENT', value });
            }

            index += value.length;
        }

        return tokens;
    }

    parseWhereClause(whereClause) {
        const tokens = this.tokenizeWhereClause(whereClause);
        let position = 0;

        const peek = () => tokens[position];
        const consume = (expectedType) => {
            const token = tokens[position];
            if (!token || token.type !== expectedType) {
                const actualType = token ? token.type : 'EOF';
                throw new Error(`Expected token "${expectedType}" but received "${actualType}" in WHERE clause.`);
            }

            position += 1;
            return token;
        };

        const parsePrimary = () => {
            if (peek()?.type === '(') {
                consume('(');
                const expression = parseOrExpression();
                consume(')');
                return expression;
            }

            return parseComparison();
        };

        const parseComparison = () => {
            const columnToken = consume('IDENT');
            if (!/^[A-Za-z]+$/.test(columnToken.value)) {
                throw new Error(`Unsupported column reference "${columnToken.value}" in WHERE clause.`);
            }

            consume('=');

            const valueToken = peek();
            if (!valueToken || !['STRING', 'NUMBER', 'IDENT'].includes(valueToken.type)) {
                throw new Error('WHERE comparison must use a string, number or identifier literal.');
            }

            position += 1;

            return {
                type: 'comparison',
                column: columnToken.value.toUpperCase(),
                value: valueToken.value
            };
        };

        const parseAndExpression = () => {
            let expression = parsePrimary();

            while (peek()?.type === 'AND') {
                consume('AND');
                expression = {
                    type: 'and',
                    left: expression,
                    right: parsePrimary()
                };
            }

            return expression;
        };

        const parseOrExpression = () => {
            let expression = parseAndExpression();

            while (peek()?.type === 'OR') {
                consume('OR');
                expression = {
                    type: 'or',
                    left: expression,
                    right: parseAndExpression()
                };
            }

            return expression;
        };

        const expression = parseOrExpression();
        if (position < tokens.length) {
            throw new Error(`Unexpected token "${tokens[position].type}" at the end of WHERE clause.`);
        }

        return expression;
    }

    columnRefToIndex(columnRef) {
        let index = 0;

        for (const char of columnRef.toUpperCase()) {
            index = (index * 26) + (char.charCodeAt(0) - 64);
        }

        return index - 1;
    }

    evaluateWhereExpression(expression, row) {
        switch (expression.type) {
        case 'comparison': {
            const columnIndex = this.columnRefToIndex(expression.column);
            const cellValue = this.normalizeCellValue(row[columnIndex]);
            return cellValue === expression.value;
        }
        case 'and':
            return this.evaluateWhereExpression(expression.left, row) && this.evaluateWhereExpression(expression.right, row);
        case 'or':
            return this.evaluateWhereExpression(expression.left, row) || this.evaluateWhereExpression(expression.right, row);
        default:
            throw new Error(`Unsupported WHERE expression type "${expression.type}".`);
        }
    }

    validateSelectedColumns(selectedColumnIndexes, headerRowLength) {
        selectedColumnIndexes.forEach((columnIndex) => {
            if (columnIndex < 0 || columnIndex >= headerRowLength) {
                throw new Error(`Selected column index ${columnIndex} is outside of the available sheet columns.`);
            }
        });
    }

    stringifyCsvRows(rows) {
        return rows.map((row) => {
            return row.map((value) => {
                const normalizedValue = value === undefined || value === null ? '' : String(value);
                if (/[",\n\r]/.test(normalizedValue)) {
                    return `"${normalizedValue.replace(/"/g, '""')}"`;
                }

                return normalizedValue;
            }).join(',');
        }).join('\n');
    }

    async applyQueryToCsvData(csvData) {
        const query = this.parseQueryString(this.config.queryString);
        if (!query) {
            return csvData;
        }

        if (!query.whereExpression && query.selectColumns === null) {
            return csvData;
        }

        const rows = await this.parseCsvRows(csvData);
        if (!rows.length) {
            return csvData;
        }

        const headerRow = rows[0];
        const dataRows = rows.slice(1);
        const selectedColumnIndexes = query.selectColumns === null
            ? headerRow.map((_, index) => index)
            : query.selectColumns.map(column => this.columnRefToIndex(column));

        this.validateSelectedColumns(selectedColumnIndexes, headerRow.length);

        const filteredRows = query.whereExpression
            ? dataRows.filter(row => this.evaluateWhereExpression(query.whereExpression, row))
            : dataRows;

        const projectedRows = [
            selectedColumnIndexes.map(columnIndex => headerRow[columnIndex] ?? '')
        ];

        filteredRows.forEach((row) => {
            projectedRows.push(selectedColumnIndexes.map(columnIndex => row[columnIndex] ?? ''));
        });

        return this.stringifyCsvRows(projectedRows);
    }

    cleanString(str, wordToRemove = '') {
        let cleanedStr = this.normalizeCellValue(str);
        if (wordToRemove) {
            cleanedStr = cleanedStr.replace(new RegExp(wordToRemove, 'g'), '');
        }
        return cleanedStr.replace(/[^a-zA-Z0-9]/g, '');
    }

    convertToNumber(value) {
        if (typeof value === 'number') {
            return value;
        }

        if (typeof value !== 'string') {
            value = String(value);
        }

        if (value.trim() === '') {
            return null;
        }

        if (/^-?\d+(\s\d+)*([.,]\d+)?$/.test(value)) {
            return Number(value.replace(/\s+/g, '').replace(',', '.'));
        }

        return value;
    }

    async convertCsvToJson(csvData) {
        return new Promise((resolve, reject) => {
            csv.parse(csvData, { columns: true, bom: true, relax_column_count: true }, (err, records) => {
                if (err) {
                    reject(err);
                    return;
                }

                const result = {};
                const keyMapping = JSON.parse(this.config.keyMapping);

                if (!this.config.keyColumn) {
                    records.forEach(record => {
                        Object.keys(record).forEach(field => {
                            const rawValue = this.normalizeCellValue(record[field]);
                            const value = this.convertToNumber(rawValue);
                            const newKey = keyMapping[field] || field;

                            if (newKey === '') {
                                delete record[field];
                                return;
                            }

                            if (newKey !== field) {
                                delete record[field];
                            }

                            record[newKey] = value;
                        });
                    });

                    const filteredRecords = records.filter(row => {
                        return Object.values(row).some(value => value !== '' && value !== null && value !== undefined);
                    });

                    resolve(filteredRecords);
                    return;
                }

                records.forEach(record => {
                    if (Object.values(record).some(value => this.normalizeCellValue(value) !== '')) {
                        const key = this.cleanString(record[this.config.keyColumn]);

                        if (key === '') {
                            return;
                        }

                        if (this.config.outputFormat === 'simple') {
                            const valueField = Object.keys(record).find(field => field !== this.config.keyColumn);
                            const value = this.convertToNumber(this.normalizeCellValue(record[valueField]));

                            if (result[key]) {
                                result[key] += value;
                            } else {
                                result[key] = value;
                            }
                        } else {
                            const transformedRecord = {};
                            Object.keys(record).forEach(field => {
                                const rawValue = this.normalizeCellValue(record[field]);
                                const value = this.convertToNumber(rawValue);
                                const newKey = keyMapping[field] || field;

                                if (newKey === '') {
                                    return;
                                }

                                if (result[key] !== undefined) {
                                    if (newKey === 'Конечная цена' || newKey === 'РРЦ') {
                                        transformedRecord[newKey] = Math.min(result[key][newKey], value);
                                    } else if (newKey === 'Скидка') {
                                        transformedRecord[newKey] = Math.max(result[key][newKey], value);
                                    } else {
                                        transformedRecord[newKey] = value;
                                    }
                                } else {
                                    transformedRecord[newKey] = value;
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

    async saveCsv(csvData) {
        for (const filePath of this.config.outputPaths) {
            try {
                const directory = path.dirname(filePath);
                await fsPromises.mkdir(directory, { recursive: true });
                await fsPromises.writeFile(filePath, csvData, 'utf8');
                console.log(`CSV successfully saved to file: ${filePath}`);
            } catch (error) {
                console.error(`Error saving CSV file ${filePath}: ${error}`);
            }
        }
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
            if (this.config.outputType === 'csv') {
                await this.saveCsv(csvData);
                return csvData;
            }

            const jsonData = await this.convertCsvToJson(csvData);
            await this.saveJson(jsonData);
            return jsonData;
        } catch (error) {
            console.error('An error occurred:', error);
            throw error;
        }
    }
}

export default GSheetFetcher;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GSheetFetcher;
}

const config = {
    csvUrl: process.env.CSV_URL,
    queryString: process.env.QUERY_STRING || '',
    queryMode: process.env.QUERY_MODE || 'export',
    fallbackToGviz: process.env.FALLBACK_TO_GVIZ,
    keyColumn: process.env.KEY_COLUMN || '',
    keyMapping: process.env.KEY_MAPPING || '{}',
    outputPaths: process.env.OUTPUT_PATHS ? process.env.OUTPUT_PATHS.split(',') : ['./output.json'],
    outputFormat: process.env.OUTPUT_FORMAT || 'simple',
    outputType: process.env.OUTPUT_TYPE || 'json'
};

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
    const fetcher = new GSheetFetcher(config);
    fetcher.process().catch(console.error);
}
