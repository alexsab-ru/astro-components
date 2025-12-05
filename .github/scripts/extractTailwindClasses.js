#!/usr/bin/env node

/**
 * Скрипт для автоматического извлечения классов Tailwind из JSON и YML файлов
 * и записи их в src/js/customTailwindClasses.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const DATA_DIR = path.join(projectRoot, 'src/data');
const OUTPUT_FILE = path.join(projectRoot, 'src/js/customTailwindClasses.js');

/**
 * Извлекает классы Tailwind из содержимого файла
 */
function extractClasses(content) {
	const classes = new Set();
	
	// Ищем class='...' или class="..." или class=\"...\" в HTML-строках
	// Учитываем как обычные кавычки, так и экранированные в JSON (\")
	// Паттерн: class= затем кавычка (обычная или экранированная), затем содержимое до закрывающей кавычки
	const classRegex = /class\s*=\s*(?:"|'|\\")((?:[^"'\\]|\\.)*?)(?:"|'|\\")/g;
	let match;
	while ((match = classRegex.exec(content)) !== null) {
		// Убираем экранированные символы из результата
		const classString = match[1].replace(/\\(.)/g, '$1');
		const foundClasses = classString.split(/\s+/).filter(c => c.trim());
		foundClasses.forEach(cls => classes.add(cls));
	}
	
	// Ищем sectionClass: "..." в JSON (с двойными кавычками вокруг ключа)
	// Учитываем экранированные кавычки в значениях
	const sectionClassJsonRegex = /"sectionClass"\s*:\s*(?:"|'|\\")((?:[^"'\\]|\\.)*?)(?:"|'|\\")/g;
	while ((match = sectionClassJsonRegex.exec(content)) !== null) {
		const classString = match[1].replace(/\\(.)/g, '$1');
		const foundClasses = classString.split(/\s+/).filter(c => c.trim());
		foundClasses.forEach(cls => classes.add(cls));
	}
	
	// Для YML ищем sectionClass: "..." или class: "..." (без кавычек вокруг ключа)
	const ymlClassRegex = /(?:sectionClass|class)\s*:\s*["']([^"']+)["']/g;
	while ((match = ymlClassRegex.exec(content)) !== null) {
		const foundClasses = match[1].split(/\s+/).filter(c => c.trim());
		foundClasses.forEach(cls => classes.add(cls));
	}
	
	return Array.from(classes).sort();
}

/**
 * Обрабатывает JSON файл
 */
function processJsonFile(filePath) {
	try {
		const content = fs.readFileSync(filePath, 'utf-8');
		return extractClasses(content);
	} catch (error) {
		console.error(`Ошибка при чтении файла ${filePath}:`, error.message);
		return [];
	}
}

/**
 * Обрабатывает YML файл
 */
function processYmlFile(filePath) {
	try {
		const content = fs.readFileSync(filePath, 'utf-8');
		return extractClasses(content);
	} catch (error) {
		console.error(`Ошибка при чтении файла ${filePath}:`, error.message);
		return [];
	}
}

/**
 * Сканирует директорию и обрабатывает все JSON и YML файлы
 */
function scanDataFiles() {
	const allClasses = new Set();
	
	if (!fs.existsSync(DATA_DIR)) {
		console.error(`Директория ${DATA_DIR} не найдена`);
		return [];
	}
	
	const files = fs.readdirSync(DATA_DIR);
	
	for (const file of files) {
		const filePath = path.join(DATA_DIR, file);
		const stat = fs.statSync(filePath);
		
		if (stat.isFile()) {
			if (file.endsWith('.json')) {
				const classes = processJsonFile(filePath);
				classes.forEach(cls => allClasses.add(cls));
				if (classes.length > 0) {
					console.log(`Найдено ${classes.length} классов в ${file}`);
				}
			} else if (file.endsWith('.yml') || file.endsWith('.yaml')) {
				const classes = processYmlFile(filePath);
				classes.forEach(cls => allClasses.add(cls));
				if (classes.length > 0) {
					console.log(`Найдено ${classes.length} классов в ${file}`);
				}
			}
		}
	}
	
	return Array.from(allClasses).sort();
}

/**
 * Записывает классы в выходной файл
 */
function writeClassesFile(classes) {
	const outputDir = path.dirname(OUTPUT_FILE);
	
	// Создаем директорию, если её нет
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}
	
	const content = `// Автоматически сгенерировано скриптом extractTailwindClasses.js
// Не редактировать вручную!

export const customTailwindClasses = [
${classes.map(cls => `    '${cls}'`).join(',\n')}
];
`;
	
	fs.writeFileSync(OUTPUT_FILE, content, 'utf-8');
	console.log(`\n✅ Записано ${classes.length} уникальных классов в ${OUTPUT_FILE}`);
}

// Главная функция
function main() {
	console.log('🔍 Сканирование JSON и YML файлов для извлечения классов Tailwind...\n');
	
	const classes = scanDataFiles();
	
	if (classes.length === 0) {
		console.log('⚠️  Классы не найдены');
		return;
	}
	
	writeClassesFile(classes);
}

// Функция для watch режима
function watchFiles() {
	console.log('👀 Режим отслеживания изменений включен...\n');
	
	// Первый запуск
	main();
	
	// Отслеживаем изменения в директории
	if (!fs.existsSync(DATA_DIR)) {
		console.error(`Директория ${DATA_DIR} не найдена`);
		return;
	}
	
	// Отслеживаем изменения в директории
	const watcher = fs.watch(DATA_DIR, { recursive: true }, (eventType, filename) => {
		if (!filename) return;
		
		// Проверяем, что это JSON или YML файл
		if (filename.endsWith('.json') || filename.endsWith('.yml') || filename.endsWith('.yaml')) {
			console.log(`\n📝 Обнаружено изменение в ${filename}, обновление классов...\n`);
			main();
		}
	});
	
	// Обработка ошибок
	watcher.on('error', (error) => {
		console.error('Ошибка при отслеживании файлов:', error);
	});
	
	console.log('✅ Отслеживание изменений активно. Нажмите Ctrl+C для выхода.\n');
	
	// Обработка сигнала завершения
	process.on('SIGINT', () => {
		console.log('\n\n👋 Остановка отслеживания...');
		watcher.close();
		process.exit(0);
	});
}

// Проверяем аргументы командной строки
const args = process.argv.slice(2);
const isWatchMode = args.includes('--watch') || args.includes('-w');

if (isWatchMode) {
	watchFiles();
} else {
	main();
}

