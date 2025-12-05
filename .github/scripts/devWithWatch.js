#!/usr/bin/env node

/**
 * Скрипт для запуска dev сервера с автоматическим отслеживанием изменений в JSON/YML файлах
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Сначала запускаем setBrand скрипт
const setBrandScript = spawn('node', [path.join(projectRoot, '.github/scripts/setBrand.mjs')], {
	stdio: 'inherit',
	shell: false
});

// Обработка ошибок setBrand скрипта
setBrandScript.on('error', (error) => {
	console.error('Ошибка при запуске setBrand скрипта:', error);
	process.exit(1);
});

setBrandScript.on('close', (code) => {
	if (code !== 0) {
		process.exit(code);
	}
	
	// После setBrand запускаем watch скрипт в фоне
	const watchScript = spawn('node', [path.join(projectRoot, '.github/scripts/extractTailwindClasses.js'), '--watch'], {
		stdio: 'pipe', // Используем pipe, чтобы не мешать выводу astro dev
		shell: false
	});
	
	// Обработка ошибок watch скрипта
	watchScript.on('error', (error) => {
		console.error('Ошибка при запуске watch скрипта:', error);
		process.exit(1);
	});
	
	// Запускаем astro dev
	const astroDev = spawn('astro', ['dev', '--open', '--host', '--config', 'astro.local.config.mjs'], {
		stdio: 'inherit',
		shell: false,
		cwd: projectRoot
	});
	
	// Обработка ошибок astro dev
	astroDev.on('error', (error) => {
		console.error('Ошибка при запуске astro dev:', error);
		watchScript.kill();
		process.exit(1);
	});
	
	// При завершении astro dev, завершаем watch скрипт
	astroDev.on('close', (code) => {
		watchScript.kill();
		process.exit(code);
	});
	
	// При получении сигнала завершения, завершаем оба процесса
	process.on('SIGINT', () => {
		watchScript.kill();
		astroDev.kill();
		process.exit(0);
	});
	
	process.on('SIGTERM', () => {
		watchScript.kill();
		astroDev.kill();
		process.exit(0);
	});
});

