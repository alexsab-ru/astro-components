import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Скрипт для локального тестирования проекта
 * Запускает dev сервер, проверяет ссылки и останавливает сервер
 */

const PORT = 4343;
const DOMAIN = `localhost:${PORT}`;
const MAX_WAIT_TIME = 30000; // 30 секунд максимум ожидания

/**
 * Ждет пока сервер станет доступным
 * @param {string} url - URL для проверки
 * @param {number} maxWaitTime - Максимальное время ожидания в мс
 * @returns {Promise<boolean>} - true если сервер доступен
 */
async function waitForServer(url, maxWaitTime = MAX_WAIT_TIME) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const response = await fetch(`http://${url}`);
      if (response.ok) {
        console.log(`✅ Сервер доступен на http://${url}`);
        return true;
      }
    } catch (error) {
      // Сервер еще не готов, продолжаем ждать
    }
    
    // Ждем 1 секунду перед следующей попыткой
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`❌ Сервер не стал доступен за ${maxWaitTime / 1000} секунд`);
  return false;
}

/**
 * Запускает команду и возвращает Promise
 * @param {string} command - Команда для выполнения
 * @param {Array} args - Аргументы команды
 * @param {Object} options - Опции для spawn
 * @returns {Promise<{code: number, stdout: string, stderr: string}>}
 */
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      stdio: 'pipe',
      shell: true,
      ...options
    });

    let stdout = '';
    let stderr = '';

    process.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    process.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Останавливает все процессы astro dev
 */
async function stopAstroDev() {
  try {
    console.log('🛑 Останавливаю dev сервер...');
    await runCommand('pkill', ['-f', 'astro dev']);
    console.log('✅ Dev сервер остановлен');
  } catch (error) {
    console.log('⚠️ Не удалось остановить dev сервер:', error.message);
  }
}

/**
 * Основная функция тестирования
 */
async function testLocal() {
  console.log('🚀 Начинаю локальное тестирование проекта...');
  
  let astroProcess = null;
  
  try {
    // Запускаем dev сервер
    console.log(`🌐 Запускаю dev сервер на порту ${PORT}...`);
    astroProcess = spawn('astro', ['dev', '--port', PORT.toString(), '--config', 'astro.local.config.mjs'], {
      stdio: 'pipe',
      detached: true
    });

    // Ждем пока сервер станет доступным
    const serverReady = await waitForServer(DOMAIN);
    if (!serverReady) {
      throw new Error('Сервер не запустился');
    }

    // Даем серверу дополнительное время для полной инициализации
    console.log('⏳ Дополнительное время для инициализации сервера...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Запускаем проверку ссылок
    console.log('🔍 Запускаю проверку ссылок...');
    const linkCheckResult = await runCommand('node', ['.github/scripts/checkLinks.js'], {
      env: { ...process.env, DOMAIN }
    });

    if (linkCheckResult.code === 0) {
      console.log('✅ Проверка ссылок завершена успешно');
      console.log(linkCheckResult.stdout);
    } else {
      console.log('❌ Ошибка при проверке ссылок:');
      console.log(linkCheckResult.stderr);
    }

    // Проверяем наличие файла с результатами
    const brokenLinksFile = './broken_links.txt';
    if (fs.existsSync(brokenLinksFile)) {
      const content = fs.readFileSync(brokenLinksFile, 'utf8');
      console.log('\n📄 Результаты проверки ссылок:');
      console.log(content);
    } else {
      console.log('\n✅ Битых ссылок не найдено!');
    }

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  } finally {
    // Останавливаем dev сервер
    await stopAstroDev();
    
    if (astroProcess) {
      try {
        process.kill(-astroProcess.pid);
      } catch (error) {
        // Процесс уже завершен
      }
    }
  }
  
  console.log('✨ Локальное тестирование завершено');
}

// Запускаем тестирование
testLocal().catch(console.error);
