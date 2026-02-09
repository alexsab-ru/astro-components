import fs from 'fs';
import path from 'path';
import { MONTH_NOMINATIVE, MONTH_GENITIVE, MONTH_PREPOSITIONAL, MONTH, FIRST_DAY, LAST_DAY, YEAR } from '../../src/js/utils/date.js';
import { currencyFormat } from '../../src/js/utils/numbers.format.js';
import { quoteEscaper } from '../../src/js/utils/helpers.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const ReportFile = {
    SPECIAL_OFFERS: './special-offers-dates.txt',
    SPECIAL_OFFERS_MARKETING: './special-offers-dates-marketing.txt'
};

class PlaceholderProcessor {
    constructor() {
        // Пути к директориям
        this.dataDirectory = path.join(process.cwd(), 'src', 'data');
        this.contentDirectory = path.join(process.cwd(), 'src', 'content');
        this.pagesDirectory = path.join(process.cwd(), 'src', 'pages');
        
        // Иконка для дисклеймера
        this.infoIcon = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>';
        
        // Массивы для отслеживания
        this.modifiedFiles = [];
        this.filesWithUpcomingDates = [];
        
        // Данные
        this.carsData = [];
        this.modelsData = [];
        this.disclaimerData = {};
        this.settingsData = {};
        
        // Placeholders
        this.carsPlaceholder = {};
        this.carsPlaceholderWithoutDisclaimer = {}; // Плейсхолдеры без дисклеймера для seo.json
        this.settingsPlaceholder = {};
        this.minPriceMaxBenefitPlaceholders = {}; // Плейсхолдеры для минимальной цены и максимальной выгоды
        this.minPriceMaxBenefitPlaceholdersWithoutDisclaimer = {}; // Без дисклеймера для seo.json

        this.carsPlaceholderVariants = {
            price: {
                '': { prefixText: '' },
                '-!': { prefixText: '', addExclamation: true },
                '-space': { prefixText: '', addSpace: true },
                '-space-!': { prefixText: '', addSpace: true, addExclamation: true },
                '-from': { prefixText: 'от' },
                '-from-!': { prefixText: 'от', addExclamation: true },
                '-from-space': { prefixText: 'от', addSpace: true },
                '-from-space-!': { prefixText: 'от', addSpace: true, addExclamation: true },
            },
            benefit: {
                '': { prefixText: '' },
                '-!': { prefixText: '', addExclamation: true },
                '-space': { prefixText: '', addSpace: true },
                '-space-!': { prefixText: '', addSpace: true, addExclamation: true },
                '-to': { prefixText: 'до' },
                '-to-!': { prefixText: 'до', addExclamation: true },
                '-to-space': { prefixText: 'до', addSpace: true },
                '-to-space-!': { prefixText: 'до', addSpace: true, addExclamation: true },
            },
        };
    }

    // Общая функция для чтения и валидации JSON-файла
    readAndValidateJSON(fileName, expectedType, defaultValue) {
        const filePath = path.join(this.dataDirectory, fileName);
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

    // Загрузка всех данных
    loadData() {
        this.carsData = this.readAndValidateJSON('all-prices.json', 'array', []);
        this.disclaimerData = this.readAndValidateJSON('federal-disclaimer.json', 'object', {});
        this.settingsData = this.readAndValidateJSON('settings.json', 'object', {});
    }

    // Создание настроечных placeholders
    createSettingsPlaceholders() {
        if (Object.keys(this.settingsData).length === 0) return;
        
        const settingsKeys = ['brand', 'site_name', 'site_description', 'legal_city', 'legal_city_where', 'phone_common'];

        Object.keys(this.settingsData).forEach(sKey => {
            if (settingsKeys.includes(sKey)) {
                this.settingsPlaceholder[`{{${sKey}}}`] = this.settingsData[sKey];
            }
        });
    }

    // Предварительная обработка disclaimer файла
    preprocessDisclaimer() {
        const disclaimerFilePath = path.join(this.dataDirectory, 'federal-disclaimer.json');
        if (!fs.existsSync(disclaimerFilePath)) return;
        
        try {
            const disclaimerContent = fs.readFileSync(disclaimerFilePath, 'utf-8');
            const { content: updatedDisclaimerContent, hasChanges } = this.replacePlaceholders(disclaimerContent);
            
            if (hasChanges) {
                fs.writeFileSync(disclaimerFilePath, updatedDisclaimerContent, 'utf-8');
                console.log('Плейсхолдеры в файле federal-disclaimer.json предварительно заменены!');
                
                // Перечитываем обработанные данные
                this.disclaimerData = JSON.parse(updatedDisclaimerContent);
            }
        } catch (error) {
            console.error('Ошибка предварительной обработки federal-disclaimer.json:', error);
        }
    }

    // Предварительная обработка models.json для замены плейсхолдеров цен
    preprocessModelsJson() {
        const modelsFilePath = path.join(this.dataDirectory, 'models.json');
        if (!fs.existsSync(modelsFilePath)) return;
        
        try {
            const modelsContent = fs.readFileSync(modelsFilePath, 'utf-8');
            const { content: updatedModelsContent, hasChanges } = this.replacePlaceholders(modelsContent, modelsFilePath);
            
            if (hasChanges) {
                fs.writeFileSync(modelsFilePath, updatedModelsContent, 'utf-8');
                console.log('Плейсхолдеры в файле models.json предварительно заменены!');
            }
        } catch (error) {
            console.error('Ошибка предварительной обработки models.json:', error);
        }
    }

    // Проверка, является ли значение пустым или нулевым
    isEmptyOrZero(value) {
        return value === 0 || value === null || value === '';
    }

    // Получение дисклеймера для конкретного автомобиля и ключа
    getDisclaimer(carId, key) {
        if (
            Object.keys(this.disclaimerData).length &&
            this.disclaimerData?.[carId] &&
            this.disclaimerData[carId][key] !== ''
        ) {
            return quoteEscaper(
                `<span>&nbsp;</span><span class="tooltip-icon" data-text="${this.disclaimerData[carId][key]}">${this.infoIcon}</span>`
            );
        }
        return '';
    }

    // Создание всех плейсхолдеров для одного ключа и автомобиля
    createPlaceholdersForKey(car, key) {
        if (car[key] === undefined) return;
        
        const isEmpty = this.isEmptyOrZero(car[key]);
        const value = car[key];
        const carId = car.id;

        const variants = key.startsWith('benefit')
            ? this.carsPlaceholderVariants.benefit
            : this.carsPlaceholderVariants.price;
        const disclaimer = this.getDisclaimer(carId, key);

        const placeholderTargets = [
            {
                map: this.carsPlaceholder,
                keyPrefix: key,
                formatValue: v => v,
                disclaimer: '',
                // Для обычных плейсхолдеров (в контенте/HTML) сохраняем неразрывный пробел как HTML entity.
                // Это помогает избегать переноса "от/до" на отдельную строку.
                useHtmlNbspInPrefix: true,
            },
            {
                map: this.carsPlaceholder,
                keyPrefix: `${key}b`,
                formatValue: v => currencyFormat(v),
                disclaimer,
                // Здесь итоговая строка используется в HTML (с возможным дисклеймером), поэтому `&nbsp;` допустим и желателен.
                useHtmlNbspInPrefix: true,
            },
            {
                map: this.carsPlaceholderWithoutDisclaimer,
                keyPrefix: `${key}b`,
                formatValue: v => currencyFormat(v).replace(/\u00a0/g, ' '),
                disclaimer: '',
                // ВАЖНО (SEO): этот набор плейсхолдеров пишет значения в `seo.json`.
                // В SEO-строках нам нужен "чистый текст" без HTML entity (`&nbsp;`).
                // Поэтому префикс "от/до" должен отделяться обычным пробелом.
                useHtmlNbspInPrefix: false,
            },
        ];

        Object.entries(variants).forEach(([suffix, variant]) => {
            placeholderTargets.forEach(({ map, keyPrefix, formatValue, disclaimer: disclaimerText, useHtmlNbspInPrefix }) => {
                const placeholderKey = `{{${keyPrefix}-${carId}${suffix}}}`;

                if (map[placeholderKey] !== undefined) return;

                if (isEmpty) {
                    map[placeholderKey] = '';
                    return;
                }

                const spacePrefix = variant.addSpace ? ' ' : '';
                // Для SEO-нужно заменить HTML entity на обычный пробел, иначе получаем "от&nbsp;2 849 000 ₽".
                // Для HTML-контента оставляем `&nbsp;`, чтобы "от/до" не отрывались от числа при переносе строк.
                const prefixSeparator = useHtmlNbspInPrefix ? '&nbsp;' : ' ';
                const prefixPart = variant.prefixText ? `${variant.prefixText}${prefixSeparator}` : '';
                const exclamationSuffix = variant.addExclamation ? '!' : '';
                const formattedValue = formatValue(value);
                const valueWithPunctuation = `${formattedValue}${exclamationSuffix}`;
                const withDisclaimer = disclaimerText ? `${valueWithPunctuation}${disclaimerText}` : valueWithPunctuation;

                map[placeholderKey] = `${spacePrefix}${prefixPart}${withDisclaimer}`;
            });
        });
    }

    // Создание ценовых placeholders
    createCarsPricePlaceholders() {
        if (this.carsData.length === 0) return;
        
        const numericKeys = ['price', 'benefit', 'priceFederal', 'benefitFederal', 'priceDealer', 'benefitDealer', 'priceOfficial'];
        
        this.carsData.forEach(car => {
            if (!car.id) return;
            
            numericKeys.forEach(key => {
                this.createPlaceholdersForKey(car, key);
            });
        });
    }

    // Создание плейсхолдеров для минимальной цены и максимальной выгоды из models.json
    createMinPriceMaxBenefitPlaceholders() {
        if (this.modelsData.length === 0) return;

        // Находим модель с минимальной ценой и максимальной выгодой (исключаем нулевые)
        let minPriceModel = null;
        let minPrice = Infinity;

        let maxBenefitModel = null;
        let maxBenefit = 0;
        
        this.modelsData.forEach(model => {
            const price = typeof model.price === 'string' ? parseFloat(model.price) : (typeof model.price === 'number' ? model.price : 0);
            if (price > 0 && price < minPrice) {
                minPrice = price;
                minPriceModel = model;
            }
            const benefit = typeof model.benefit === 'string' ? parseFloat(model.benefit) : (typeof model.benefit === 'number' ? model.benefit : 0);
            if (benefit > 0 && benefit > maxBenefit) {
                maxBenefit = benefit;
                maxBenefitModel = model;
            }
        });

        if (minPrice === Infinity) minPrice = 0;

        // Вспомогательная функция для установки плейсхолдеров
        const setPlaceholders = (prefix, value, model, disclaimerKey, textPrefix, textSuffix) => {
            const keys = [
                `{{${prefix}}}`,
                `{{${prefix}${textSuffix}}}`,
                `{{${prefix}b}}`,
                `{{${prefix}b${textSuffix}}}`
            ];
            
            if (value > 0 && model) {
                // Форматируем значение с дисклеймером
                let formatted = currencyFormat(value);
                const carId = `${model.mark_id.toLowerCase()}-${model.id}`;
                
                if (this.disclaimerData[carId]?.[disclaimerKey] && this.disclaimerData[carId][disclaimerKey] !== '') {
                    formatted += quoteEscaper(
                        `<span>&nbsp;</span><span class="tooltip-icon" data-text="${this.disclaimerData[carId][disclaimerKey]}">${this.infoIcon}</span>`
                    );
                }
                
                // Форматируем без дисклеймера для seo.json
                const formattedWithoutDisclaimer = currencyFormat(value).replace(/\u00a0/g, ' ');
                
                // Устанавливаем значения
                this.minPriceMaxBenefitPlaceholders[keys[0]] = value;
                this.minPriceMaxBenefitPlaceholders[keys[1]] = `${textPrefix}&nbsp;${value}`;
                this.minPriceMaxBenefitPlaceholders[keys[2]] = formatted;
                this.minPriceMaxBenefitPlaceholders[keys[3]] = `${textPrefix}&nbsp;${formatted}`;
                
                this.minPriceMaxBenefitPlaceholdersWithoutDisclaimer[keys[0]] = value;
                this.minPriceMaxBenefitPlaceholdersWithoutDisclaimer[keys[1]] = `${textPrefix} ${value}`;
                this.minPriceMaxBenefitPlaceholdersWithoutDisclaimer[keys[2]] = formattedWithoutDisclaimer;
                this.minPriceMaxBenefitPlaceholdersWithoutDisclaimer[keys[3]] = `${textPrefix} ${formattedWithoutDisclaimer}`;
            } else {
                // Очищаем плейсхолдеры
                keys.forEach(key => {
                    this.minPriceMaxBenefitPlaceholders[key] = '';
                    this.minPriceMaxBenefitPlaceholdersWithoutDisclaimer[key] = '';
                });
            }
        };

        // Создаем плейсхолдеры для минимальной цены
        setPlaceholders('min-price', minPrice, minPriceModel, 'price', 'от', '-from');

        // Создаем плейсхолдеры для максимальной выгоды
        setPlaceholders('max-benefit', maxBenefit, maxBenefitModel, 'benefit', 'до', '-to');
    }

    // Функция для замены плейсхолдеров в содержимом файла
    replacePlaceholders(content, filePath = '') {
        // Определяем, является ли файл seo.json - для него используем плейсхолдеры без дисклеймера
        const isSeoFile = filePath && path.basename(filePath) === 'seo.json';
        
        // Выбираем набор ценовых плейсхолдеров в зависимости от файла
        const carsPlaceholdersToUse = isSeoFile 
            ? this.carsPlaceholderWithoutDisclaimer 
            : this.carsPlaceholder;
        
        // Выбираем набор плейсхолдеров для минимальной цены и максимальной выгоды
        const minMaxPlaceholdersToUse = isSeoFile
            ? this.minPriceMaxBenefitPlaceholdersWithoutDisclaimer
            : this.minPriceMaxBenefitPlaceholders;
        
        const placeholders = {
            '{{firstDay}}': FIRST_DAY,
            '{{lastDay}}': LAST_DAY,
            '{{month}}': MONTH,
            '{{monthNominative}}': MONTH_NOMINATIVE,
            '{{monthGenitive}}': MONTH_GENITIVE,
            '{{monthPrepositional}}': MONTH_PREPOSITIONAL,
            '{{year}}': YEAR,
            ...this.settingsPlaceholder,
            ...carsPlaceholdersToUse,
            ...minMaxPlaceholdersToUse,
        };

        let hasChanges = false;
        let updatedContent = content;

        // Заменяем все плейсхолдеры
        for (let placeholder in placeholders) {
            const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            if (regex.test(updatedContent)) {
                updatedContent = updatedContent.replace(regex, placeholders[placeholder]);
                hasChanges = true;
            }
        }

        return { content: updatedContent, hasChanges };
    }

    // Нормализуем любые DD.MM.YYYY / DD-MM-YYYY / YYYY.MM.DD в YYYY-MM-DD
    normalizeToISO(dateStr) {
        const p = dateStr.split(/[^\d]/).map(Number);
        // если первый элемент — это год (YYYY)
        if (p[0] > 1900) {
            return `${p[0].toString().padStart(4,'0')}-${p[1].toString().padStart(2,'0')}-${p[2].toString().padStart(2,'0')}`;
        }
        // иначе DD,MM,YYYY
        return `${p[2].toString().padStart(4,'0')}-${p[1].toString().padStart(2,'0')}-${p[0].toString().padStart(2,'0')}`;
    }

    // Проверяем «в пределах 2 дней» для ISO (YYYY-MM-DD)
    isDateWithinTwoDaysISO(iso) {
        const [y, m, d] = iso.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil(Math.abs(today - date) / (1000 * 60 * 60 * 24));
        return diffDays <= 2;
    }

    // Конвертация ISO даты (YYYY-MM-DD) в человеко-читаемый формат (DD.MM.YYYY)
    isoToDDMMYYYY(iso) {
        const [y, m, d] = iso.split('-');
        return `${d}.${m}.${y}`;
    }

    // Функция для поиска дат в содержимом файла
    searchDates(content, filePath) {
        const lines = content.split('\n');
        const allDates = [];

        for (const line of lines) {
            // Проверяем, содержит ли строка pubDate: в начале
            if (!line.trim().startsWith('pubDate:')) {
                // Ищем даты в формате DD.MM.YYYY или DD-MM-YYYY или DD/MM/YYYY
                const format1 = line.match(/\b(\d{2}[.\-/]\d{2}[.\-/]\d{4})\b/g);
                // Ищем даты в формате YYYY.MM.DD или YYYY-MM-DD или YYYY/MM/DD
                const format2 = line.match(/\b(\d{4}[.\-/]\d{2}[.\-/]\d{2})\b/g);

                // Функция для проверки, не стоит ли перед датой предлог "с", "со", "от"
                // Исключаем даты начала акций, которые обычно идут после этих предлогов
                const isNotStartDate = (dateMatch, line) => {
                    const dateIndex = line.indexOf(dateMatch);
                    if (dateIndex === -1) return true; // если дата не найдена, считаем что это не дата начала
                    
                    // Берем текст перед датой (до 4 символов назад)
                    const textBefore = line.substring(Math.max(0, dateIndex - 4), dateIndex);
                    
                    // Проверяем наличие предлогов "с", "со", "от" (с учетом регистра)
                    // Используем \b для границ слов и \s* для возможных пробелов
                    const hasStartPreposition = (str) => {
                    return str.includes(' с ') || str.includes(' со ') || str.includes(' от ');
                    };
                    
                    return !hasStartPreposition(textBefore); // возвращаем true если НЕТ предлога начала
                };

                // Добавляем найденные даты в общий массив, исключая даты начала
                if (format1) {
                    const filteredFormat1 = format1.filter(date => isNotStartDate(date, line));
                    allDates.push(...filteredFormat1);
                }
                if (format2) {
                    const filteredFormat2 = format2.filter(date => isNotStartDate(date, line));
                    allDates.push(...filteredFormat2);
                }
            }
        }

        if (allDates.length) {
            const converted = allDates.map(d => this.normalizeToISO(d));
            const filtered = converted.filter(iso => this.isDateWithinTwoDaysISO(iso));
            // Уникализируем и сортируем по времени "как строки"
            const uniqueSorted = Array.from(new Set(filtered)).sort();

            if (uniqueSorted.length) {
                this.filesWithUpcomingDates.push({
                    filePath: filePath,
                    dates: uniqueSorted
                });
            }
        }
    }

    // Функция для формирования URL в зависимости от расположения файла
    buildUrl(relativePath, domain) {
        const sanitizedPath = relativePath.replace(/^src\/(content|pages)\//, '');
        const pathChanged = sanitizedPath !== relativePath;

        if (pathChanged) {
            const fileNameWithoutExt = path.basename(sanitizedPath, path.extname(sanitizedPath));
            const directoryPath = path.dirname(sanitizedPath);
            const slug = directoryPath === '.' ? fileNameWithoutExt : `${directoryPath}/${fileNameWithoutExt}`;
            return `https://${domain}/${slug}/`;
        }

        if (relativePath.includes('banners.json')) {
            return `https://${domain}/`;
        }

        return `https://${domain}/`;
    }

    generateUrl(filePath, domain) {
        const relativePath = path.relative(process.cwd(), filePath);
        return this.buildUrl(relativePath, domain);
    }

    // Функция для обработки файла
    processFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            // Передаем путь файла для определения, нужно ли использовать плейсхолдеры без дисклеймера
            const { content: updatedContent, hasChanges } = this.replacePlaceholders(content, filePath);

            // Проверяем даты в файле
            this.searchDates(content, filePath);

            if (hasChanges) {
                fs.writeFileSync(filePath, updatedContent, 'utf-8');
                this.modifiedFiles.push(filePath);
                console.log(`Плейсхолдеры в файле ${path.basename(filePath)} успешно заменены!`);
            }
        } catch (error) {
            console.error(`Ошибка обработки файла ${filePath}:`, error);
        }
    }

    // Функция для рекурсивного обхода директории
    processDirectory(directory, fileExtensions) {
        const files = fs.readdirSync(directory);
        
        files.forEach(file => {
            const filePath = path.join(directory, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                this.processDirectory(filePath, fileExtensions);
            } else if (fileExtensions.includes(path.extname(filePath))) {
                // Пропускаем файлы с ценами и federal-disclaimer.json (уже обработан)
                if (!filePath.includes('all-prices.json') && 
                    !filePath.includes('dealer-models_price.json') &&
                    !filePath.includes('federal-disclaimer.json')) {
                    this.processFile(filePath);
                }
            }
        });
    }

    // Обработка всех директорий
    processAllDirectories() {
        console.log('Начинаем обработку файлов...');

        // Обработка JSON файлов
        this.processDirectory(this.dataDirectory, ['.json']);

        // Обработка MDX файлов
        this.processDirectory(this.contentDirectory, ['.mdx']);

        // Обработка Astro файлов
        this.processDirectory(this.pagesDirectory, ['.astro']);
    }

    // Вывод результатов обработки
    outputResults() {
        console.log('\nОбработка завершена!');
        
        if (this.modifiedFiles.length > 0) {
            console.log('\nИзмененные файлы:');
            this.modifiedFiles.forEach(file => console.log(`- ${file}`));
        } else {
            console.log('\nФайлы не были изменены.');
        }
    }

    // Очищаем старые отчеты по датам перед запуском
    clearSpecialOffersReports() {
        const reportFiles = [
            ReportFile.SPECIAL_OFFERS,
            ReportFile.SPECIAL_OFFERS_MARKETING
        ];

        reportFiles.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });
    }

    // Вывод информации о приближающихся датах
    outputUpcomingDates() {
        if (this.filesWithUpcomingDates.length === 0) return;

        console.log('\n❗️ ВНИМАНИЕ! Приближаются даты окончания:');
        const domain = process.env.DOMAIN;
        const htmlHeader = '<b>❗️ ВНИМАНИЕ! Приближаются даты окончания:</b>\n\n';
        const parsedDates = this.filesWithUpcomingDates.map(({ filePath, dates }) => {
            const relativePath = path.relative(process.cwd(), filePath);
            const url = this.generateUrl(filePath, domain);
            const readableDates = dates.map(iso => this.isoToDDMMYYYY(iso)).join(', ');
            return { relativePath, url, readableDates };
        });

        parsedDates.forEach(({ relativePath, url, readableDates }) => {
            console.log(`\nФайл: \`${relativePath}\`\nURL: ${url}\nДаты окончания: ${readableDates}`);
        });

        const htmlOutput = htmlHeader + parsedDates
            .map(({ relativePath, url, readableDates }) =>
                `<strong>Файл:</strong> <code>${relativePath}</code>\n<strong>URL:</strong> <a href="${url}">${url}</a>\n<strong>Даты окончания:</strong> ${readableDates}`
            )
            .join('\n\n');

        const htmlOutputMarketing = htmlHeader + parsedDates
            .map(({ url, readableDates }) =>
                `<strong>URL:</strong> <a href="${url}">${url}</a>\n<strong>Даты окончания:</strong> ${readableDates}`
            )
            .join('\n\n');

        const outputPath = ReportFile.SPECIAL_OFFERS;
        fs.writeFileSync(outputPath, htmlOutput, 'utf8');
        const outputPathMarketing = ReportFile.SPECIAL_OFFERS_MARKETING;
        fs.writeFileSync(outputPathMarketing, htmlOutputMarketing, 'utf8');
        console.log(`\nРезультаты сохранены в файл: ${outputPath}, ${outputPathMarketing}`);
    }

    // Главная функция запуска всей обработки
    run() {
        // 0. Удаляем старые отчеты о спецпредложениях
        this.clearSpecialOffersReports();

        // 1. Загружаем все данные
        this.loadData();
        
        // 2. Создаем настроечные placeholders
        this.createSettingsPlaceholders();
        
        // 3. Предварительно обрабатываем disclaimer файл
        this.preprocessDisclaimer();
        
        // 4. Создаем ценовые placeholders с уже обработанными disclaimer'ами
        this.createCarsPricePlaceholders();
        
        // 4.1. Предварительно обрабатываем models.json для замены плейсхолдеров цен
        // Это нужно, чтобы при вычислении минимальной цены и максимальной выгоды
        // в models.json уже были реальные значения вместо плейсхолдеров
        this.preprocessModelsJson();
        
        // 4.2. Перезагружаем models.json с уже замененными плейсхолдерами
        const modelsDataFile = this.readAndValidateJSON('models.json', 'object', {});
        this.modelsData = modelsDataFile.models || [];
        
        // 4.3. Создаем плейсхолдеры для минимальной цены и максимальной выгоды
        this.createMinPriceMaxBenefitPlaceholders();
        
        // 5. Обрабатываем все директории
        this.processAllDirectories();
        
        // 6. Выводим результаты
        this.outputResults();
        
        // 7. Выводим информацию о приближающихся датах
        this.outputUpcomingDates();
    }
}

// Точка входа для запуска из CLI: node .github/scripts/replacePlaceholdersAndSearchDates.js
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
    const processor = new PlaceholderProcessor();
    processor.run();
}
